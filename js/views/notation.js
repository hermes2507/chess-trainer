// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Notation trainer: learn to write moves (board → notation) and read them
// (notation → board), plus square names. Practice mode is untimed, with
// hints and explanations; Sprint mode is against the clock with a saved best.
// Positions come from the app's puzzles, classic games and opening lines (see
// js/notation.js), so every case appears in realistic settings.
import { Chess } from '../../vendor/chess.js';
import { Board } from '../board.js';
import { store } from '../store.js';
import { esc, $, $$ } from '../ui.js';
import {
  CASES, casesFor, pool, itemMove, check, describe, anatomy, numbered, moveNo,
  randomSquare, classify, primaryCase,
} from '../notation.js';

const TASKS = {
  write: { name: 'Write', desc: 'A move is shown on the board with an arrow. Type it in notation.' },
  read: { name: 'Read', desc: 'You see a move in notation. Play it on the board.' },
  squares: { name: 'Squares', desc: 'Click the square that is named, or name the highlighted one.' },
  mixed: { name: 'Mixed', desc: 'Writing, reading and squares, shuffled.' },
};
const SPRINT_SECS = [60, 180];
const ORIENTS = { auto: 'Side to move', white: 'White', black: 'Black', random: 'Random' };
// What the board shows for square drills: no pieces.
const EMPTY = { board: () => Array.from({ length: 8 }, () => Array(8).fill(null)), inCheck: () => false, turn: () => 'w', moves: () => [], get: () => null };
const KEYS = [
  ['K', 'Q', 'R', 'B', 'N', 'x', '+', '#', '='],
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '⌫'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '↵'],
  ['O-O', 'O-O-O'],
];

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const nt = () => store.get().notation;
const prefs = () => nt().prefs;
// Preferences are conveniences, not progress: persist without marking unsaved.
const setPref = (k, v) => { nt().prefs[k] = v; store.persist(); };
const pct = (r) => (r && r.n ? Math.round((r.ok / r.n) * 100) : null);
const fmtTime = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Which direction a task trains: naming a square is writing, finding one is reading.
const dirOf = (task) => (task === 'write' || task === 'name' ? 'write' : 'read');

function record(task, cas, ok) {
  store.update((s) => {
    const n = s.notation;
    const t = n.stats[dirOf(task)] || (n.stats[dirOf(task)] = {});
    const r = t[cas] || (t[cas] = { ok: 0, n: 0 });
    r.n++; if (ok) r.ok++;
    n.total++;
  });
}

/** Overall accuracy and sprint best for the home page. */
export function notationStats() {
  const n = nt();
  let ok = 0, all = 0;
  for (const dir of Object.values(n.stats)) for (const r of Object.values(dir)) { ok += r.ok; all += r.n; }
  const best = Math.max(0, ...Object.values(n.best));
  return { answered: all, accuracy: all ? Math.round((ok / all) * 100) : null, best };
}

// The weakest case with enough answers, for the "suggested focus" line.
function weakest() {
  const rows = [];
  for (const [dir, t] of Object.entries(nt().stats)) for (const [cas, r] of Object.entries(t)) {
    if (CASES[cas] && r.n >= 5) rows.push({ dir, cas, p: r.ok / r.n, n: r.n });
  }
  rows.sort((a, b) => a.p - b.p);
  return rows[0] && rows[0].p < 0.85 ? rows[0] : null;
}

const anatomyHTML = (m) => `<div class="anat">${anatomy(m).map(([t, d]) => `<span><b>${esc(t)}</b><small>${esc(d)}</small></span>`).join('')}</div>`;

/**
 * Notation trainer page. `?task=` (write | read | squares | mixed) and
 * `?mode=` (practice | sprint) preselect the exercise, e.g. from a link on
 * the calibration result. Returns a cleanup function.
 */
export function notationView(root, params = new URLSearchParams()) {
  if (TASKS[params.get('task')]) setPref('task', params.get('task'));
  if (['practice', 'sprint'].includes(params.get('mode'))) setPref('mode', params.get('mode'));
  else if (params.get('task')) setPref('mode', 'practice');
  root.innerHTML = `
  <section class="game-layout notation">
    <div class="board-col"><div class="board-wrap" id="bw"><div id="board"></div></div></div>
    <aside class="panel" id="panel"></aside>
  </section>`;
  const panel = $('#panel', root), bw = $('#bw', root);
  const board = new Board($('#board', root));
  let session = null, item = null, timer = null, busy = false;
  const recent = [];
  panel.__nt = { get item() { return item; }, get session() { return session; } }; // for automated tests

  const applyCoords = () => bw.classList.toggle('hide-coords', !prefs().coords);
  applyCoords();
  board.set(new Chess());

  // Clicks for "find the square" (the board itself only reports piece moves).
  const clickH = (e) => {
    if (!item || item.task !== 'find' || item.done || busy) return;
    const sq = board.sqFromEvent(e);
    if (sq) answerSquare(sq);
  };
  board.el.addEventListener('pointerdown', clickH);

  // ---------- setup ----------
  function setup() {
    stopTimer();
    session = null; item = null;
    const p = prefs();
    const mode = p.mode, task = p.task;
    const shown = task === 'mixed' ? Object.keys(CASES) : task === 'squares' ? [] : casesFor(task);
    const sel = new Set(p.cases.filter((c) => shown.includes(c)));
    if (!sel.size) shown.forEach((c) => sel.add(c));
    const bestKey = `${task}-${p.secs}`;
    const w = weakest();
    panel.innerHTML = `
      <div class="panel-head"><h2>Notation trainer</h2>
        ${mode === 'sprint' ? `<div class="rating-pill" title="Best sprint score">Best <b>${nt().best[bestKey] || 0}</b></div>` : ''}</div>
      <p class="muted small">Learn to write the moves you see and to read the moves you are given, the way books, scoresheets and PGN files record them.</p>
      <div class="seg" id="mode">
        <button data-v="practice" class="${mode === 'practice' ? 'on' : ''}">Practice</button>
        <button data-v="sprint" class="${mode === 'sprint' ? 'on' : ''}">Sprint ⏱</button></div>
      <div class="field"><span>Exercise</span><div class="seg small" id="task">${Object.entries(TASKS).map(([k, t]) => `<button data-v="${k}" class="${task === k ? 'on' : ''}">${t.name}</button>`).join('')}</div>
        <p class="muted small nt-desc">${TASKS[task].desc}</p></div>
      ${mode === 'practice' && shown.length ? `<div class="field"><span>Cases <button class="linkish small" id="allCases">${sel.size === shown.length ? 'none' : 'all'}</button></span>
        <div class="chips" id="cases">${shown.map((c) => `<button class="chip nt-case ${sel.has(c) ? 'on' : ''}" data-c="${c}" title="${esc(CASES[c].rule)}">${CASES[c].name} <code>${esc(CASES[c].eg)}</code></button>`).join('')}</div></div>` : ''}
      ${mode === 'sprint' ? `<div class="field"><span>Length</span><div class="seg small" id="secs">${SPRINT_SECS.map((s) => `<button data-v="${s}" class="${p.secs === s ? 'on' : ''}">${s / 60} min</button>`).join('')}</div>
        <p class="muted small">Answer as many as you can. Every case comes up. Mistakes don't end the run, but they don't score either, and you can review them at the end.</p></div>` : ''}
      <details class="nt-opts"><summary>Options</summary>
        <label class="field inline"><span>Board view</span><select id="orient">${Object.entries(ORIENTS).map(([k, v]) => `<option value="${k}" ${p.orient === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" id="coords" ${p.coords ? 'checked' : ''}> Show coordinates on the board</label>
        <label class="check"><input type="checkbox" id="strict" ${p.strict ? 'checked' : ''}> Book notation: require x, + and #
          <span class="muted small">(off: FIDE scoresheet rules, where they are optional)</span></label>
      </details>
      <button class="btn primary big" id="start">${mode === 'sprint' ? 'Start sprint' : 'Start practice'}</button>
      ${w ? `<p class="small">Suggested focus: <b>${CASES[w.cas].name}</b> (${w.dir === 'write' ? 'writing' : 'reading'}, ${Math.round(w.p * 100)}% of ${w.n}). <button class="linkish" id="focus">Practise it</button></p>` : ''}
      ${statsHTML()}`;

    const seg = (id, fn) => $$(`#${id} button`, panel).forEach((b) => { b.onclick = () => { fn(b.dataset.v); setup(); }; });
    seg('mode', (v) => setPref('mode', v));
    seg('task', (v) => setPref('task', v));
    seg('secs', (v) => setPref('secs', +v));
    $$('.nt-case', panel).forEach((b) => {
      b.onclick = () => {
        b.classList.toggle('on');
        setPref('cases', [...new Set([...prefs().cases.filter((c) => !shown.includes(c)), ...$$('.nt-case.on', panel).map((x) => x.dataset.c)])]);
        const all = $('#allCases', panel);
        if (all) all.textContent = $$('.nt-case.on', panel).length === shown.length ? 'none' : 'all';
      };
    });
    const allBtn = $('#allCases', panel);
    if (allBtn) allBtn.onclick = () => {
      const on = allBtn.textContent === 'all';
      setPref('cases', on ? [...new Set([...prefs().cases, ...shown])] : prefs().cases.filter((c) => !shown.includes(c)));
      setup();
    };
    $('#orient', panel).onchange = (e) => setPref('orient', e.target.value);
    $('#coords', panel).onchange = (e) => { setPref('coords', e.target.checked); applyCoords(); };
    $('#strict', panel).onchange = (e) => setPref('strict', e.target.checked);
    const focus = $('#focus', panel);
    if (focus) focus.onclick = () => {
      setPref('mode', 'practice');
      setPref('task', w.cas === 'squares' ? 'squares' : w.dir);
      setPref('cases', [w.cas]);
      setup();
    };
    $('#start', panel).onclick = () => {
      const chosen = mode === 'practice' ? $$('.nt-case.on', panel).map((x) => x.dataset.c) : [];
      if (mode === 'practice' && shown.length && !chosen.length) { $('#cases', panel).classList.add('shake'); return; }
      start(mode, task, task === 'squares' ? ['squares'] : mode === 'practice' ? chosen : null);
    };
  }

  function statsHTML() {
    const st = nt().stats;
    const rows = Object.keys(CASES).map((c) => {
      const w = st.write?.[c], r = st.read?.[c];
      if (!w && !r) return '';
      const cell = (x) => (x ? `<span class="${pct(x) >= 80 ? 'up' : pct(x) < 50 ? 'down' : ''}">${pct(x)}%</span> <span class="muted small">${x.n}</span>` : '<span class="muted">—</span>');
      return `<tr><td>${CASES[c].name}</td><td>${cell(w)}</td><td>${cell(r)}</td></tr>`;
    }).join('');
    const best = Object.entries(nt().best);
    return `<details class="nt-stats" ${rows ? 'open' : ''}><summary>Your accuracy</summary>
      ${rows ? `<table class="table"><thead><tr><th>Case</th><th>Writing</th><th>Reading</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted small">No answers yet.</p>'}
      ${best.length ? `<p class="small">Sprint bests: ${best.map(([k, v]) => { const [t, s] = k.split('-'); return `${TASKS[t]?.name || t} ${s / 60} min <b>${v}</b>`; }).join(' · ')}</p>` : ''}
    </details>`;
  }

  // ---------- session ----------
  function start(mode, task, cases) {
    panel.innerHTML = '<p class="muted">Preparing positions…</p>';
    // Let the message paint before the one-off pool build.
    setTimeout(() => {
      pool();
      session = { mode, task, cases, ok: 0, n: 0, log: [], secs: prefs().secs, strict: prefs().strict };
      renderSession();
      if (mode === 'sprint') {
        session.endAt = performance.now() + session.secs * 1000;
        timer = setInterval(tick, 200);
        tick();
      }
      next();
    }, 30);
  }

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function tick() {
    if (!session) return;
    const left = Math.max(0, session.endAt - performance.now());
    const el = $('#timer', panel);
    if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left <= 10000); }
    if (left <= 0) finish();
  }

  function renderSession() {
    const s = session;
    panel.innerHTML = `
      ${s.mode === 'sprint'
        ? `<div class="rush-top"><div class="timer" id="timer">${fmtTime(s.secs * 1000)}</div><div class="score-big" id="score">0</div><div class="strikes muted small" id="acc"></div></div>`
        : `<div class="panel-head"><h2>Practice · ${TASKS[s.task].name}</h2><div class="rating-pill" id="score">0 / 0</div></div>`}
      <div class="nt-case-tag" id="caseTag"></div>
      <div class="nt-prompt" id="prompt"></div>
      <div id="inputArea"></div>
      <div class="nt-fb-wrap" id="fb"></div>
      <div class="actions" id="acts">
        ${s.mode === 'practice' ? '<button class="btn" id="hint">Hint</button><button class="btn" id="reveal">Show answer</button><button class="btn primary" id="next">Skip</button>' : ''}
      </div>
      <div class="rush-trail" id="trail"></div>
      <button class="btn" id="end">${s.mode === 'sprint' ? 'Stop' : 'End practice'}</button>`;
    if (s.mode === 'practice') {
      $('#hint', panel).onclick = hint;
      $('#reveal', panel).onclick = reveal;
      $('#next', panel).onclick = next;
    }
    $('#end', panel).onclick = finish;
  }

  function updateScore() {
    const s = session;
    $('#score', panel).textContent = s.mode === 'sprint' ? s.ok : `${s.ok} / ${s.n}`;
    const acc = $('#acc', panel);
    if (acc) acc.textContent = s.n ? `${Math.round((s.ok / s.n) * 100)}% right` : '';
    $('#trail', panel).innerHTML = s.log.slice(-40).map((l) => `<span class="${l.ok ? 'ok' : 'bad'}" title="${esc(l.label)}">${l.ok ? '✓' : '✗'}</span>`).join('');
  }

  function orientFor(it) {
    const o = prefs().orient;
    if (o === 'white') return 'w';
    if (o === 'black') return 'b';
    if (o === 'random' || !it.fen) return Math.random() < 0.5 ? 'w' : 'b';
    return it.fen.split(' ')[1];
  }

  function makeItem() {
    const s = session, P = pool();
    let task = s.task;
    const cases = s.cases || Object.keys(CASES);
    if (task === 'mixed') task = rand(['write', 'write', 'read', 'read', 'squares'].filter((t) => cases.some((c) => CASES[c].tasks.includes(t))));
    if (task === 'squares') return { task: Math.random() < 0.5 ? 'find' : 'name', case: 'squares', square: randomSquare() };
    const avail = cases.filter((c) => CASES[c].tasks.includes(task));
    const cas = rand(avail.length ? avail : casesFor(task));
    if (cas === 'line') {
      const l = rand(P.lines);
      const c = new Chess(l.fen);
      const moves = l.sans.map((san) => c.move(san));
      return { task: 'line', case: 'line', fen: l.fen, moves, step: 0 };
    }
    let it;
    for (let i = 0; i < 10; i++) { it = rand(P.moves[cas]); if (!recent.includes(it.fen)) break; }
    recent.push(it.fen); if (recent.length > 30) recent.shift();
    return { task, case: cas, fen: it.fen, move: itemMove(it) };
  }

  function next() {
    if (!session) return;
    busy = false;
    item = makeItem();
    item.tries = 0; item.hinted = 0; item.done = false;
    board.setArrows([]); board.setMarks({}); board.setBadge(null); board.setMovable(null);
    board.setOrientation(orientFor(item));
    $('#fb', panel).innerHTML = '';
    setDone(false);
    // Stats and the case tag follow the case being practised; hints also give
    // the rule of the move's most specific case (e.g. a capture that checks).
    item.ruleCase = item.case;
    item.extraCase = item.move ? primaryCase(classify(item.move)) : null;
    $('#caseTag', panel).innerHTML = session.mode === 'practice' ? `<span class="chip">${CASES[item.case].name}</span>` : '';
    const prompt = $('#prompt', panel), input = $('#inputArea', panel);
    input.innerHTML = '';

    if (item.task === 'write') {
      const m = item.move;
      const c = new Chess(item.fen);
      board.set(c, { lastMove: { from: m.from, to: m.to } });
      board.setArrows([{ from: m.from, to: m.to }]);
      if (m.promotion) board.setBadge({ sq: m.to, text: m.promotion.toUpperCase(), color: 'var(--accent)', center: true });
      prompt.innerHTML = `<div class="nt-q">Write the move shown by the arrow${m.promotion ? `. The pawn promotes to a <b>${m.promotion === 'q' ? 'queen' : m.promotion === 'r' ? 'rook' : m.promotion === 'b' ? 'bishop' : 'knight'}</b>` : ''}.</div>`;
      inputBox(moveNo(item.fen), 'e.g. Nf3');
    } else if (item.task === 'read') {
      const c = new Chess(item.fen);
      board.set(c);
      board.setMovable(c.turn());
      board.onMove = (f, t, pr) => answerRead(f, t, pr);
      prompt.innerHTML = `<div class="nt-q">Play this move on the board:</div><div class="nt-big"><span class="muted">${moveNo(item.fen)}</span>${esc(item.move.san)}</div>`;
    } else if (item.task === 'line') {
      const c = new Chess(item.fen);
      board.set(c);
      board.setMovable(c.turn());
      board.onMove = (f, t, pr) => answerRead(f, t, pr);
      renderLine();
    } else if (item.task === 'find') {
      board.set(EMPTY);
      prompt.innerHTML = `<div class="nt-q">Click the square</div><div class="nt-big">${item.square}</div>`;
    } else {
      board.set(EMPTY);
      board.setMarks({ [item.square]: 'ask' });
      prompt.innerHTML = '<div class="nt-q">Name the highlighted square.</div>';
      inputBox('', 'e.g. e4', true);
    }
  }

  function renderLine() {
    const parts = numbered(item.fen, item.moves.map((m) => m.san));
    $('#prompt', panel).innerHTML = `<div class="nt-q">Play these moves on the board, both sides in turn:</div>
      <div class="nt-big nt-line">${parts.map((p, i) => `${p.no ? `<span class="muted">${p.no}</span>` : ''}<span class="${i < item.step ? 'done' : i === item.step ? 'cur' : ''}">${esc(p.san)}</span>`).join(' ')}</div>`;
  }

  // Text box with a notation keypad (the phone keyboard stays hidden on touch screens).
  function inputBox(prefix, ph, squareOnly = false) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const keys = squareOnly ? [KEYS[1], KEYS[2]] : KEYS;
    $('#inputArea', panel).innerHTML = `
      <form class="nt-input" id="form" autocomplete="off">
        ${prefix ? `<span class="nt-no">${prefix}</span>` : ''}
        <input id="ans" type="text" placeholder="${ph}" spellcheck="false" autocapitalize="off" autocorrect="off" ${coarse ? 'inputmode="none"' : ''} aria-label="Your answer">
        <button class="btn primary" type="submit">Check</button>
      </form>
      <div class="keypad">${keys.map((row) => `<div class="krow">${row.map((k) => `<button type="button" class="key ${k.length > 2 ? 'wide' : ''}" data-k="${k}">${k}</button>`).join('')}</div>`).join('')}</div>`;
    const ans = $('#ans', panel);
    $('#form', panel).onsubmit = (e) => { e.preventDefault(); submitText(); };
    $$('.key', panel).forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.k;
        if (k === '⌫') ans.value = ans.value.slice(0, -1);
        else if (k === '↵') { submitText(); return; }
        else ans.value += k;
        if (!coarse) ans.focus();
      };
    });
    if (!coarse) ans.focus();
  }

  // ---------- answering ----------
  function submitText() {
    if (!item || busy) return;
    const ans = $('#ans', panel);
    if (item.done) { next(); return; }
    const text = ans.value.trim();
    if (!text) return;
    if (item.task === 'name') {
      const ok = text.toLowerCase() === item.square;
      const valid = /^[a-h][1-8]$/i.test(text);
      settle(ok, ok ? `${item.square}: the ${item.square[0]}-file, rank ${item.square[1]}.`
        : valid ? `That's ${text.toLowerCase()}. ${board.orientation === 'b' ? 'Remember, from Black\'s side the a-file is on the right and rank 1 at the top.' : 'Files go a→h left to right, ranks 1→8 bottom to top.'}`
          : 'A square is a file letter (a–h) and a rank number (1–8), like e4.', { given: text, correct: item.square });
      if (!ok) board.setMarks({ [item.square]: 'ask', ...(valid && text.toLowerCase() !== item.square ? { [text.toLowerCase()]: 'bad' } : {}) });
      return;
    }
    const r = check(item.fen, item.move.lan, text, { strict: session.strict });
    if (!r.ok && r.played && r.played.lan !== item.move.lan) {
      // Show the move they described next to the real one.
      board.setArrows([{ from: item.move.from, to: item.move.to }, { from: r.played.from, to: r.played.to, color: 'var(--c-blunder)' }]);
    }
    settle(r.ok, r.msg, { given: text, correct: item.move.san, tips: r.tips, verdict: r.verdict });
    if (r.ok) playOut();
  }

  // Animate the written move once it has been answered correctly or revealed.
  function playOut() {
    const c = new Chess(item.fen);
    const m = c.move(item.move.lan);
    board.setArrows([]); board.setBadge(null);
    board.set(c, { lastMove: m, animate: true });
  }

  function answerSquare(sq) {
    const ok = sq === item.square;
    board.setMarks({ [sq]: ok ? 'good' : 'bad', ...(ok ? {} : session.mode === 'practice' ? {} : { [item.square]: 'good' }) });
    settle(ok, ok ? `${sq}: the ${sq[0]}-file, rank ${sq[1]}.` : `That was ${sq}. ${board.orientation === 'b' ? 'From Black\'s side the a-file is on the right and rank 1 at the top.' : 'Files go a→h left to right, ranks 1→8 bottom to top.'}`,
      { given: sq, correct: item.square });
  }

  async function answerRead(from, to, promo) {
    if (!item || item.done || busy) return;
    const expected = item.task === 'line' ? item.moves[item.step] : item.move;
    const fen = item.task === 'line' ? (item.step ? item.moves[item.step - 1].after : item.fen) : item.fen;
    const c = new Chess(fen);
    let mv;
    try { mv = c.move({ from, to, promotion: promo }); } catch { return; }
    if (mv.lan === expected.lan) {
      board.set(c, { lastMove: mv });
      board.setBadge({ sq: mv.to, text: '✓', color: 'var(--c-best)' });
      if (item.task === 'line' && item.step < item.moves.length - 1) {
        item.step++;
        renderLine();
        board.setMovable(c.turn());
        return;
      }
      if (item.task === 'line') { item.step++; renderLine(); }
      settle(true, item.task === 'line' ? 'All three moves read correctly.' : describe(expected), { given: mv.san, correct: expected.san });
      return;
    }
    // Wrong: show it briefly, then put the position back.
    board.setMovable(null);
    board.set(c, { lastMove: mv });
    board.setBadge({ sq: mv.to, text: '✗', color: 'var(--c-blunder)' });
    const why = readMistake(mv, expected);
    settle(false, `You played ${mv.san}. ${why}`, { given: mv.san, correct: expected.san });
    if (session && session.mode === 'practice' && !item.done) {
      busy = true;
      await new Promise((r) => setTimeout(r, 900));
      busy = false;
      if (!item || item.done) return;
      const back = new Chess(fen);
      board.set(back, { lastMove: item.task === 'line' && item.step ? item.moves[item.step - 1] : null });
      board.setMovable(back.turn());
    }
  }

  // Explain a misread move by comparing it with the notation, part by part.
  function readMistake(mv, exp) {
    const P = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
    if (exp.san.startsWith('O-O')) return `${exp.san} is ${exp.san.startsWith('O-O-O') ? 'queenside castling: the king goes two squares toward the a-file rook' : 'kingside castling: the king goes two squares toward the h-file rook'}. Move the king to ${exp.to}.`;
    if (mv.piece !== exp.piece) return `${exp.san.match(/^[KQRBN]/) ? `"${exp.san[0]}" means ${P[exp.piece]}` : 'No capital letter means a pawn move'}, but you moved a ${P[mv.piece]}.`;
    if (mv.to !== exp.to) return `The destination in ${exp.san} is ${exp.to}${board.orientation === 'b' ? ' (from Black\'s side, files run h→a left to right)' : ''}.`;
    if (mv.from !== exp.from) return `Right square, but another ${P[exp.piece]}: in ${exp.san} the "${exp.piece === 'p' ? exp.from[0] : exp.san.match(/^[KQRBN]([a-h]?[1-8]?)/)[1]}" says which one.`;
    if (mv.promotion !== exp.promotion) return `${exp.san} promotes to a ${P[exp.promotion]}.`;
    return '';
  }

  /** Grade the current answer. In practice a wrong answer can be retried; only the first try counts. */
  function settle(ok, msg, { given, correct, tips = [], verdict } = {}) {
    const s = session;
    const first = item.tries === 0;
    item.tries++;
    const label = labelFor(item);
    if (first) {
      const clean = ok && !item.hinted;
      record(item.task, item.ruleCase, clean);
      s.n++; if (clean) s.ok++;
      s.log.push({ ok: clean, label, given, correct, case: item.ruleCase, msg });
    }
    updateScore();
    const fb = $('#fb', panel);
    const m = item.move && (item.task === 'write' || item.task === 'read') ? item.move : null;
    if (s.mode === 'sprint') {
      fb.innerHTML = ok ? '' : `<div class="nt-fb fb-bad small"><b>✗</b> ${esc(label)}: <b>${esc(correct)}</b>${given ? ` <span class="muted">(you: ${esc(given)})</span>` : ''}</div>`;
      item.done = true;
      busy = true;
      setTimeout(() => { if (session === s) next(); }, ok ? 250 : 500);
      return;
    }
    if (ok) {
      item.done = true;
      board.setMovable(null);
      fb.innerHTML = `<div class="nt-fb fb-ok"><b>✓ ${item.hinted ? 'Correct (with a hint)' : first ? 'Correct!' : 'Correct this time'}</b><p>${esc(msg)}</p>
        ${tips.length ? `<ul class="nt-tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${m ? anatomyHTML(m) : ''}</div>`;
      setDone(true);
    } else {
      fb.innerHTML = `<div class="nt-fb ${verdict === 'notation' ? 'fb-warn' : 'fb-bad'}"><b>${verdict === 'notation' ? '≈ Almost' : '✗ Not quite'}</b><p>${esc(msg)}</p>
        ${tips.length ? `<ul class="nt-tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <p class="muted small">Try again, or use Hint / Show answer.</p></div>`;
      const a = $('#ans', panel);
      if (a && !matchMedia('(pointer: coarse)').matches) a.select();
    }
  }

  const labelFor = (it) => it.task === 'find' ? `Find ${it.square}` : it.task === 'name' ? 'Name the square'
    : it.task === 'line' ? `Read ${numbered(it.fen, it.moves.map((m) => m.san)).map((p) => p.no + p.san).join(' ')}`
      : it.task === 'read' ? `Read ${moveNo(it.fen)}${it.move.san}` : `Write ${it.move.from}→${it.move.to}`;

  function hint() {
    if (!item || item.done) return;
    item.hinted++;
    const fb = $('#fb', panel);
    const ruleOf = (c) => `<p><b>${CASES[c].name}.</b> ${esc(CASES[c].rule)}</p>`;
    const rule = ruleOf(item.ruleCase) + (item.extraCase && item.extraCase !== item.ruleCase ? ruleOf(item.extraCase) : '');
    if (item.task === 'write') {
      fb.innerHTML = `<div class="nt-fb fb-hint">${rule}${item.hinted > 1 ? `<p>It starts with <b>${esc(item.move.san.startsWith('O') ? 'O' : item.move.san[0])}</b> and has ${item.move.san.length} characters.</p>` : ''}</div>`;
    } else if (item.task === 'read' || item.task === 'line') {
      const exp = item.task === 'line' ? item.moves[item.step] : item.move;
      fb.innerHTML = `<div class="nt-fb fb-hint">${item.task === 'line' ? `<p><b>Move numbers.</b> ${esc(CASES.line.rule)}</p>` : ''}${anatomyHTML(exp)}${item.hinted > 1 ? '<p class="small">The piece to move is highlighted.</p>' : ''}</div>`;
      if (item.hinted > 1) board.setMarks({ [exp.from]: 'hint' });
    } else {
      fb.innerHTML = `<div class="nt-fb fb-hint">${esc(CASES.squares.rule)}${item.hinted > 1 ? `<p>The file is <b>${item.task === 'name' ? item.square[0] : '…'}</b>${item.task === 'find' ? `: look along the ${item.square[0]}-file.` : '.'}</p>` : ''}</div>`;
      if (item.task === 'find' && item.hinted > 1) {
        const marks = {};
        for (let r = 1; r <= 8; r++) marks[item.square[0] + r] = 'hint';
        board.setMarks(marks);
      }
    }
  }

  function reveal() {
    if (!item || item.done) return;
    const s = session;
    if (item.tries === 0) {
      record(item.task, item.ruleCase, false);
      s.n++;
      s.log.push({ ok: false, label: labelFor(item), given: '', correct: item.square || (item.move ? item.move.san : item.moves.map((m) => m.san).join(' ')), case: item.ruleCase });
      updateScore();
    }
    item.tries++;
    item.done = true;
    board.setMovable(null);
    const fb = $('#fb', panel);
    if (item.task === 'write' || item.task === 'read') {
      const m = item.move;
      fb.innerHTML = `<div class="nt-fb fb-hint"><b>Answer: ${esc(m.san)}</b><p>${esc(describe(m))}</p>${anatomyHTML(m)}</div>`;
      if (item.task === 'write') { const a = $('#ans', panel); if (a) a.value = m.san; }
      const c = new Chess(item.fen);
      board.set(c);
      board.setArrows([{ from: m.from, to: m.to, color: 'var(--arrow-best)' }]);
      setTimeout(() => { if (item && item.done && item.move === m) playOut(); }, 700);
    } else if (item.task === 'line') {
      fb.innerHTML = `<div class="nt-fb fb-hint"><b>Answer</b>${item.moves.slice(item.step).map((m) => `<p><b>${esc(m.san)}</b>: ${esc(describe(m))}</p>`).join('')}</div>`;
      const c = new Chess(item.step ? item.moves[item.step - 1].after : item.fen);
      for (const m of item.moves.slice(item.step)) c.move(m.lan);
      board.set(c, { lastMove: item.moves[item.moves.length - 1], animate: true });
    } else {
      fb.innerHTML = `<div class="nt-fb fb-hint"><b>${item.square}</b>: the ${item.square[0]}-file, rank ${item.square[1]}.</div>`;
      board.setMarks({ [item.square]: 'good' });
    }
    setDone(true);
  }

  // Practice buttons: Skip becomes Next once the item is answered or revealed.
  function setDone(done) {
    const nextBtn = $('#next', panel);
    if (!nextBtn) return;
    nextBtn.textContent = done ? 'Next' : 'Skip';
    $('#hint', panel).disabled = done;
    $('#reveal', panel).disabled = done;
  }

  // ---------- results ----------
  function finish() {
    if (!session) return;
    stopTimer();
    const s = session;
    session = null;
    board.setMovable(null);
    if (!s.n) { setup(); return; }
    let newBest = false;
    const key = `${s.task}-${s.secs}`;
    if (s.mode === 'sprint') {
      const prev = nt().best[key] || 0;
      newBest = s.ok > prev;
      store.update((st) => { st.notation.sprints++; if (newBest) st.notation.best[key] = s.ok; });
    }
    const misses = s.log.filter((l) => !l.ok);
    const byCase = {};
    for (const l of s.log) { const b = byCase[l.case] || (byCase[l.case] = { ok: 0, n: 0 }); b.n++; if (l.ok) b.ok++; }
    panel.innerHTML = `
      <div class="result-card">
        <div class="muted">${s.mode === 'sprint' ? `${TASKS[s.task].name} sprint · ${s.secs / 60} min` : `Practice · ${TASKS[s.task].name}`}</div>
        <div class="big-rating">${s.ok}<span>/ ${s.n}</span></div>
        <div>${Math.round((s.ok / s.n) * 100)}% right${newBest ? ' · <span class="ok">New personal best!</span>' : s.mode === 'sprint' ? ` · best ${nt().best[key] || 0}` : ''}</div>
        <div class="chips">${Object.entries(byCase).map(([c, b]) => `<span class="chip">${CASES[c]?.name || c} ${b.ok}/${b.n}</span>`).join('')}</div>
      </div>
      ${misses.length ? `<h3>Review your mistakes</h3><ul class="nt-review">${misses.slice(0, 30).map((l) => `<li><span class="muted small">${esc(l.label)}</span><div><b>${esc(l.correct)}</b>${l.given ? ` <span class="muted">you: ${esc(l.given)}</span>` : ''}</div>${l.msg ? `<div class="small muted">${esc(l.msg)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="ok">No mistakes. 🎉</p>'}
      <div class="actions"><button class="btn primary" id="again">${s.mode === 'sprint' ? 'Sprint again' : 'Keep practising'}</button><button class="btn" id="back">Change exercise</button></div>`;
    $('#again', panel).onclick = () => start(s.mode, s.task, s.cases);
    $('#back', panel).onclick = setup;
  }

  // Enter moves on after an answer even when the text box isn't focused.
  const keyH = (e) => {
    if (e.key !== 'Enter' || !item || !session || session.mode !== 'practice' || !item.done) return;
    if (e.target.closest && e.target.closest('button, a, select, summary')) return;
    if (e.target.id === 'ans') return; // the form handles it
    e.preventDefault();
    next();
  };
  window.addEventListener('keydown', keyH);

  setup();
  return () => {
    stopTimer();
    session = null;
    window.removeEventListener('keydown', keyH);
    board.el.removeEventListener('pointerdown', clickH);
    board.destroy();
  };
}
