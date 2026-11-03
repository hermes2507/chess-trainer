// Classic games: replay famous games with notes, or practise "guess the move"
// from the winner's side. Best scores are kept in store.classics.
import { Chess } from '../../vendor/chess.js';
import { Board } from '../board.js';
import { CLASSICS } from '../data/classics.js';
import { parseLine, OPENINGS } from '../data/openings.js';
import { store } from '../store.js';
import { esc, $, sleep } from '../ui.js';

const ERAS = ['all', 'Romantic', 'Classical', 'Modern', 'Contemporary'];
const sideName = (s) => (s === 'w' ? 'White' : 'Black');
const record = (id) => store.get().classics[id] || null;
const courseName = (cid) => OPENINGS.find((o) => o.id === cid)?.name || cid;

// Games practised and the average of their best scores (for the home page).
export function classicStats() {
  const recs = CLASSICS.map((g) => record(g.id)).filter(Boolean);
  return { practised: recs.length, total: CLASSICS.length, avg: recs.length ? Math.round(recs.reduce((a, r) => a + r.best, 0) / recs.length) : null };
}

// Classic games that illustrate an opening course.
export const classicsFor = (courseId) => CLASSICS.filter((g) => g.openings.includes(courseId));

// The next classic game to study: near the player's level, not yet learned
// (untried or best score under 60%), preferring games that use an opening the
// player is being recommended. Falls back to the weakest-scored game in range.
export function recommendClassic(rating, preferOpenings = []) {
  const inRange = CLASSICS.filter((g) => g.level >= rating - 500 && g.level <= rating + 300);
  const pool = inRange.length ? inRange : CLASSICS;
  const score = (g) => {
    const r = record(g.id);
    let v = Math.abs(g.level - rating) / 100;          // closer to your level is better
    if (g.openings.some((o) => preferOpenings.includes(o))) v -= 3;
    if (!r) v -= 2;                                     // untried first
    else if (r.best >= 60) v += 10;                     // already learned: last resort
    else v += r.best / 30;                              // weak scores come back
    return v;
  };
  const g = [...pool].sort((a, b) => score(a) - score(b))[0];
  const r = record(g.id);
  const why = r
    ? (r.best >= 60 ? `Best ${r.best}%. Try to beat it without hints.` : `Best so far ${r.best}%. Replay it, then guess again.`)
    : g.openings.some((o) => preferOpenings.includes(o))
      ? `Shows the ${courseName(g.openings.find((o) => preferOpenings.includes(o)))} you are learning, in a real game.`
      : 'Replay it with the notes, then guess the winner\'s moves.';
  return { game: g, why, mode: r ? 'guess' : 'replay' };
}

export function classicsView(root, params) {
  const era = ERAS.includes(params.get('era')) ? params.get('era') : 'all';
  const rating = store.get().profile.rating; // null when unrated: no level badges
  const list = CLASSICS.filter((g) => era === 'all' || g.era === era).sort((a, b) => a.level - b.level);
  const played = CLASSICS.filter((g) => record(g.id)).length;
  root.innerHTML = `<section class="page">
    <h1>Classic games</h1>
    <p class="lead">Learn from the most famous games ever played. <b>Replay</b> them with notes, or play <b>Guess the move</b>
      from the winner's side and score yourself against the masters.</p>
    <div class="row between">
      <nav class="tabs inline">${ERAS.map((e) => `<a href="#/classics?era=${e}" class="${era === e ? 'on' : ''}">${e === 'all' ? 'All' : e}</a>`).join('')}</nav>
      <span class="muted small">${played}/${CLASSICS.length} practised</span>
    </div>
    <div class="course-grid">${list.map((g) => {
      const r = record(g.id);
      const rec = rating != null && Math.abs(g.level - rating) <= 300;
      return `<a class="course-card" href="#/classics/${g.id}">
        <div class="cc-top"><span class="side-badge ${g.side}">Guess as ${sideName(g.side)}</span>${rec ? '<span class="rec">Your level</span>' : ''}</div>
        <h3>${esc(g.title)}</h3>
        <div class="small"><b>${esc(g.white)}</b> – <b>${esc(g.black)}</b></div>
        <p>${esc(g.summary)}</p>
        <div class="cc-foot"><span class="muted small">${esc(g.event)}, ${g.year} · ${g.result}</span>
        <span class="small">${r ? `Best <b>${r.best}%</b>` : '<span class="muted">Not tried</span>'}</span></div>
        <div class="progress thin"><div style="width:${r ? r.best : 0}%"></div></div></a>`;
    }).join('')}</div></section>`;
}

export function classicGameView(root, id, params) {
  const g = CLASSICS.find((x) => x.id === id);
  if (!g) { root.innerHTML = '<section class="page"><h1>Game not found</h1><a href="#/classics">Back to classic games</a></section>'; return; }
  const moves = parseLine(g.moves);
  const total = moves.length;
  let mode = params.get('mode') === 'guess' ? 'guess' : 'replay';

  root.innerHTML = `
  <section class="game-layout">
    <div class="board-col"><div class="board-wrap"><div id="board"></div></div></div>
    <aside class="panel">
      <a class="back" href="#/classics">← Classic games</a>
      <div class="panel-head"><h2>${esc(g.title)}</h2><div class="seg small" id="modeSeg"><button data-m="replay">Replay</button><button data-m="guess">Guess</button></div></div>
      <div class="muted small"><b>${esc(g.white)}</b> – <b>${esc(g.black)}</b> · ${esc(g.event)}, ${g.year} · ${g.result}</div>
      ${g.openings.length ? `<div class="small">Opening course: ${g.openings.map((o) => `<a href="#/openings/${o}">${esc(courseName(o))}</a>`).join(', ')}</div>` : ''}
      <div class="note-box" id="note"></div>
      <div id="modeBar"></div>
      <ol class="movelist" id="moves"></ol>
      <div class="status" id="status"></div>
      <div class="actions" id="actions"></div>
      <details class="card lessons"><summary>What to learn from this game</summary><ul class="ideas">${g.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>
    </aside>
  </section>`;

  const board = new Board($('#board', root), { onMove: userMove });
  let chess, ply, alive = true, gen = 0;
  // guess-mode state
  let tries, points, asked, finished, startPly;

  // Position after the first n plies, plus the last move played.
  function positionAt(n) {
    const c = new Chess();
    let last = null;
    for (let i = 0; i < n; i++) last = c.move(moves[i].san);
    return { c, last };
  }

  function setMode(m) {
    mode = m;
    root.querySelectorAll('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  }
  $('#modeSeg', root).onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { setMode(b.dataset.m); start(); } };

  function renderMoves() {
    let html = '';
    for (let i = 0; i < total; i += 2) {
      const cell = (j) => {
        if (j >= total) return '<span></span>';
        const shown = mode === 'replay' || j < ply;
        return shown
          ? `<button class="mv ${j === ply - 1 ? 'cur' : ''}" data-ply="${j + 1}" ${mode === 'guess' ? 'disabled' : ''}>${esc(moves[j].san)}</button>`
          : '<span class="mv hidden-mv">…</span>';
      };
      html += `<li><span class="num">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}</li>`;
    }
    const el = $('#moves', root);
    el.innerHTML = html;
    const cur = el.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function showNote() {
    const m = ply > 0 ? moves[ply - 1] : null;
    const num = ply > 0 ? `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '...'}` : '';
    $('#note', root).innerHTML = m && m.note
      ? `<b>${num}${esc(m.san)}</b>: ${esc(m.note)}`
      : ply === 0 ? esc(g.summary) : `<span class="muted">${num}${esc(m.san)}</span>`;
  }

  // ---------- replay ----------
  function show(n) {
    ply = Math.max(0, Math.min(total, n));
    const { c, last } = positionAt(ply);
    chess = c;
    board.set(chess, { lastMove: last });
    board.setArrows([]);
    showNote();
    renderMoves();
    $('#status', root).innerHTML = `<span class="muted small">Move ${Math.ceil(ply / 2)} of ${Math.ceil(total / 2)}</span>`;
  }

  function startReplay() {
    board.setMovable(null);
    board.setOrientation(g.side);
    $('#modeBar', root).innerHTML = '';
    $('#actions', root).innerHTML = `
      <button class="btn" data-nav="first" title="Start">⏮</button>
      <button class="btn" data-nav="prev" title="Previous (←)">◀</button>
      <button class="btn" data-nav="next" title="Next (→)">▶</button>
      <button class="btn" data-nav="last" title="End">⏭</button>
      <button class="btn" data-nav="flip" title="Flip board">⇅</button>`;
    show(0);
  }

  // ---------- guess the move ----------
  function startGuess() {
    gen++;
    board.setOrientation(g.side);
    const opts = [];
    for (let mv = 1; mv * 2 - 1 <= total; mv += 5) opts.push(mv);
    $('#modeBar', root).innerHTML = `<label class="field inline small"><span>Start from move</span>
      <select id="startAt">${opts.map((m) => `<option value="${m}" ${m === (startPly ? Math.floor(startPly / 2) + 1 : 1) ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`;
    $('#startAt', root).onchange = (e) => { startPly = (+e.target.value - 1) * 2; startGuess(); };
    $('#actions', root).innerHTML = `
      <button class="btn" id="hint">Show move</button>
      <button class="btn" id="restart">Restart</button>`;
    $('#hint', root).onclick = () => { if (!finished && chess.turn() === g.side) reveal(); };
    $('#restart', root).onclick = () => startGuess();
    ply = startPly || 0;
    const { c, last } = positionAt(ply);
    chess = c;
    tries = 0; points = 0; asked = 0; finished = false;
    board.set(chess, { lastMove: last });
    board.setArrows([]);
    showNote();
    renderMoves();
    step();
  }

  const expectedLan = () => new Chess(chess.fen()).move(moves[ply].san).lan;

  async function step() {
    const my = gen;
    if (!alive || my !== gen) return;
    if (ply >= total) return finishGuess();
    if (chess.turn() !== g.side) {
      board.setMovable(null);
      $('#status', root).innerHTML = '<span class="muted">Opponent is moving…</span>';
      await sleep(550);
      if (!alive || my !== gen) return;
      play();
      return step();
    }
    tries = 0;
    board.setMovable(g.side);
    $('#status', root).innerHTML = `<span class="dot you"></span> What did <b>${esc(g.side === 'w' ? g.white : g.black)}</b> play? ${scoreText()}`;
  }

  function play(animate = true) {
    const mv = chess.move(moves[ply].san);
    ply++;
    board.set(chess, { lastMove: mv, animate });
    board.setArrows([]);
    showNote();
    renderMoves();
  }

  const scoreText = () => (asked ? `<span class="muted small">· score ${Math.round((points / (asked * 2)) * 100)}%</span>` : '');

  async function userMove(from, to, promotion) {
    if (finished || mode !== 'guess' || chess.turn() !== g.side || ply >= total) return;
    const lan = from + to + (promotion || '');
    const exp = expectedLan(), my = gen;
    if (lan === exp || (exp.length === 5 && !promotion && exp.startsWith(lan))) {
      asked++; points += tries === 0 ? 2 : 1;
      play(false);
      board.setBadge({ sq: exp.slice(2, 4), text: '✓', color: 'var(--c-best)' });
      return step();
    }
    tries++;
    board.setMovable(null);
    const t = new Chess(chess.fen());
    let wrong;
    try { wrong = t.move(promotion ? { from, to, promotion } : { from, to }); } catch { board.setMovable(g.side); return; }
    board.set(t, { lastMove: wrong });
    board.setBadge({ sq: to, text: '✗', color: 'var(--c-blunder)' });
    await sleep(650);
    if (!alive || my !== gen) return;
    board.set(chess, { lastMove: positionAt(ply).last });
    if (tries >= 2) return reveal();
    $('#status', root).innerHTML = `<span class="bad">Not the game move.</span> One more try. ${scoreText()}`;
    board.setMovable(g.side);
  }

  async function reveal() {
    const my = gen;
    asked++;
    board.setMovable(null);
    const exp = expectedLan();
    board.setArrows([{ from: exp.slice(0, 2), to: exp.slice(2, 4), color: 'var(--arrow-hint)' }]);
    $('#status', root).innerHTML = `The game move was <b>${esc(moves[ply].san)}</b>. ${scoreText()}`;
    await sleep(1300);
    if (!alive || my !== gen) return;
    play();
    step();
  }

  function finishGuess() {
    finished = true;
    board.setMovable(null);
    const pct = asked ? Math.round((points / (asked * 2)) * 100) : 0;
    let best = pct;
    store.update((s) => {
      const r = s.classics[g.id] || { best: 0, attempts: 0 };
      r.attempts++;
      r.best = Math.max(r.best, pct);
      r.last = pct;
      r.at = Date.now();
      best = r.best;
      s.classics[g.id] = r;
    });
    const verdict = pct >= 85 ? '🏆 Master-level!' : pct >= 60 ? '👏 Well played.' : 'Replay it and try again.';
    $('#status', root).innerHTML = `<div class="done-box">You scored <b>${pct}%</b> on ${asked} move${asked === 1 ? '' : 's'} (best ${best}%). ${verdict}</div>`;
  }

  function start() {
    gen++;
    board.setBadge(null);
    if (mode === 'guess') startGuess(); else startReplay();
  }

  // Replay controls and move-list clicks.
  $('#actions', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (!b || mode !== 'replay') return;
    const n = b.dataset.nav;
    if (n === 'flip') { board.flip(); return; }
    show(n === 'first' ? 0 : n === 'prev' ? ply - 1 : n === 'next' ? ply + 1 : total);
  });
  $('#moves', root).onclick = (e) => {
    const b = e.target.closest('[data-ply]');
    if (b && mode === 'replay') show(+b.dataset.ply);
  };
  const onKey = (e) => {
    if (mode !== 'replay' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(ply - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(ply + 1); }
  };
  document.addEventListener('keydown', onKey);

  setMode(mode);
  start();
  return () => { alive = false; gen++; document.removeEventListener('keydown', onKey); board.destroy(); };
}
