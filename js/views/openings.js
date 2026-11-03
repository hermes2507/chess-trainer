// Opening courses with Learn / Practice modes and spaced repetition.
import { Chess } from '../../vendor/chess.js';
import { Board } from '../board.js';
import { OPENINGS, parseLine } from '../data/openings.js';
import { store } from '../store.js';
import { esc, $, sleep } from '../ui.js';

const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 14, 30]; // days per Leitner box
export const MASTERED_BOX = 4;

export const lineKey = (courseId, i) => `${courseId}:${i}`;
const lineSide = (course, line) => line.side || course.side;

export function lineState(key) { return store.get().openings[key] || null; }

export function courseProgress(course) {
  let mastered = 0, started = 0, due = 0;
  const now = Date.now();
  course.lines.forEach((_, i) => {
    const st = lineState(lineKey(course.id, i));
    if (!st) return;
    started++;
    if (st.box >= MASTERED_BOX) mastered++;
    if (st.due <= now) due++;
  });
  return { mastered, started, due, total: course.lines.length };
}

export function dueLines() {
  const now = Date.now(), out = [];
  for (const c of OPENINGS) c.lines.forEach((l, i) => {
    const st = lineState(lineKey(c.id, i));
    if (st && st.due <= now) out.push({ course: c, index: i });
  });
  return out;
}

const sideLabel = (s) => (s === 'w' ? 'White' : s === 'b' ? 'Black' : 'Both sides');

function statusOf(st) {
  if (!st) return { label: 'New', cls: 'new' };
  if (st.box >= MASTERED_BOX) return { label: 'Mastered', cls: 'mastered' };
  return { label: `Learning · box ${st.box}`, cls: 'learning' };
}

export function openingsView(root, params) {
  const filter = params.get('side') || 'all';
  const rating = store.get().profile.rating || 1000;
  const list = OPENINGS.filter((o) => filter === 'all' || o.side === filter);
  const due = dueLines().length;
  root.innerHTML = `<section class="page">
    <h1>Openings</h1>
    <p class="lead">Learn a line move by move, then drill it from memory. Lines you play perfectly come back at growing intervals of 1, 3, 7, 14 and 30 days.</p>
    <div class="row between">
      <nav class="tabs inline">${['all', 'w', 'b', 'mixed'].map((s) => `<a href="#/openings?side=${s}" class="${filter === s ? 'on' : ''}">${s === 'all' ? 'All' : sideLabel(s)}</a>`).join('')}</nav>
      ${due ? `<a class="btn primary" href="#/openings/due/train">Review ${due} due line${due > 1 ? 's' : ''}</a>` : ''}
    </div>
    <div class="course-grid">${list.map((o) => {
      const p = courseProgress(o);
      const rec = rating >= o.level[0] - 100 && rating <= o.level[1];
      return `<a class="course-card" href="#/openings/${o.id}">
        <div class="cc-top"><span class="side-badge ${o.side}">${sideLabel(o.side)}</span>${rec ? '<span class="rec">Recommended</span>' : ''}</div>
        <h3>${esc(o.name)}</h3><p>${esc(o.summary)}</p>
        <div class="cc-foot"><span class="muted small">${o.eco} · ${o.level[0]}–${o.level[1]}</span>
        <span class="small">${p.mastered}/${p.total} mastered${p.due ? ` · <b class="due">${p.due} due</b>` : ''}</span></div>
        <div class="progress thin"><div style="width:${(p.mastered / p.total) * 100}%"></div></div></a>`;
    }).join('')}</div></section>`;
}

export function courseView(root, id) {
  const c = OPENINGS.find((o) => o.id === id);
  if (!c) { root.innerHTML = '<section class="page"><h1>Course not found</h1><a href="#/openings">Back</a></section>'; return; }
  const p = courseProgress(c);
  root.innerHTML = `<section class="page narrow">
    <a class="back" href="#/openings">← All openings</a>
    <div class="row between"><h1>${esc(c.name)}</h1><span class="side-badge ${c.side}">${sideLabel(c.side)}</span></div>
    <p class="lead">${esc(c.summary)}</p>
    <div class="card"><h3>Key ideas</h3><ul class="ideas">${c.ideas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="row between"><h2>Lines</h2><span class="muted">${p.mastered}/${p.total} mastered</span></div>
    <div class="line-list">${c.lines.map((l, i) => {
      const st = lineState(lineKey(c.id, i));
      const s = statusOf(st);
      const isDue = st && st.due <= Date.now();
      const moves = parseLine(l.moves);
      return `<div class="line-item">
        <div><h3>${esc(l.name)} ${l.side ? `<span class="side-badge ${l.side}">${sideLabel(l.side)}</span>` : ''}</h3>
        <div class="muted small mono">${esc(moves.slice(0, 8).map((m, k) => (k % 2 === 0 ? `${k / 2 + 1}.` : '') + m.san).join(' '))}${moves.length > 8 ? ' …' : ''}</div>
        <div class="small"><span class="pill ${s.cls}">${s.label}</span>${isDue ? ' <b class="due">due now</b>' : st ? ` <span class="muted">next review ${new Date(st.due).toLocaleDateString()}</span>` : ''}</div></div>
        <div class="line-actions"><a class="btn" href="#/openings/${c.id}/train?line=${i}&mode=learn">Learn</a>
        <a class="btn primary" href="#/openings/${c.id}/train?line=${i}&mode=practice">Practice</a></div></div>`;
    }).join('')}</div></section>`;
}

export function trainerView(root, id, params) {
  // queue of {course, index}
  let queue;
  let mode = params.get('mode') === 'learn' ? 'learn' : 'practice';
  if (id === 'due') { queue = dueLines(); mode = 'practice'; }
  else {
    const c = OPENINGS.find((o) => o.id === id);
    if (!c) { root.innerHTML = '<section class="page"><h1>Course not found</h1></section>'; return; }
    const start = clampIdx(+params.get('line') || 0, c.lines.length);
    queue = c.lines.map((_, i) => ({ course: c, index: i })).slice(start).concat(c.lines.map((_, i) => ({ course: c, index: i })).slice(0, start));
  }
  if (!queue.length) {
    root.innerHTML = '<section class="page narrow"><h1>Nothing due</h1><p class="lead">All your lines are up to date.</p><a class="btn primary" href="#/openings">Back to openings</a></section>';
    return;
  }

  root.innerHTML = `
  <section class="game-layout">
    <div class="board-col"><div class="board-wrap"><div id="board"></div></div></div>
    <aside class="panel">
      <a class="back" id="backLink" href="#/openings">← Course</a>
      <div class="panel-head"><h2 id="title"></h2><div class="seg small" id="modeSeg"><button data-m="learn">Learn</button><button data-m="practice">Practice</button></div></div>
      <div class="muted small" id="sub"></div>
      <div class="note-box" id="note"></div>
      <ol class="movelist compact" id="moves"></ol>
      <div class="status" id="status"></div>
      <div class="actions">
        <button class="btn" id="hint">Hint</button>
        <button class="btn" id="restart">Restart</button>
        <button class="btn primary" id="nextLine">Next line</button>
      </div>
    </aside>
  </section>`;
  const board = new Board($('#board', root), { onMove: userMove });
  let q = 0, chess, moves, idx, mistakes, hintsUsed, side, course, line, alive = true, finished, gen = 0;

  function setMode(m) {
    mode = m;
    root.querySelectorAll('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  }
  $('#modeSeg', root).onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { setMode(b.dataset.m); startLine(); } };

  function startLine() {
    ({ course } = queue[q]);
    line = course.lines[queue[q].index];
    side = lineSide(course, line);
    moves = parseLine(line.moves);
    chess = new Chess();
    idx = 0; mistakes = 0; hintsUsed = 0; finished = false; gen++;
    $('#title', root).textContent = line.name;
    $('#sub', root).textContent = `${course.name} · you play ${side === 'w' ? 'White' : 'Black'}${queue.length > 1 ? ` · line ${q + 1} of ${queue.length}` : ''}`;
    $('#backLink', root).href = `#/openings/${course.id}`;
    $('#note', root).innerHTML = mode === 'learn' ? '<b>Learn mode:</b> follow the arrows and read the notes.' : '<b>Practice:</b> play the line from memory.';
    $('#status', root).innerHTML = '';
    setMode(mode);
    board.setOrientation(side);
    board.set(chess);
    board.setArrows([]);
    renderMoves();
    step();
  }

  function renderMoves() {
    let html = '';
    for (let i = 0; i < moves.length; i += 2) {
      const cell = (j) => {
        if (j >= moves.length) return '<span></span>';
        const shown = j < idx;
        return `<span class="mv ${shown ? '' : 'hidden-mv'} ${j === idx - 1 ? 'cur' : ''}">${shown ? esc(moves[j].san) : '…'}</span>`;
      };
      html += `<li><span class="num">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}</li>`;
    }
    $('#moves', root).innerHTML = html;
  }

  function expectedLan() {
    const t = new Chess(chess.fen());
    return t.move(moves[idx].san).lan;
  }

  async function step() {
    const g = gen;
    if (!alive) return;
    if (idx >= moves.length) return complete();
    if (chess.turn() !== side) {
      board.setMovable(null);
      await sleep(idx === 0 ? 400 : 450);
      if (!alive || g !== gen) return;
      const mv = chess.move(moves[idx].san);
      idx++;
      board.set(chess, { lastMove: mv, animate: true });
      showNote(moves[idx - 1]);
      renderMoves();
      return step();
    }
    board.setMovable(side);
    if (mode === 'learn') {
      const lan = expectedLan();
      board.setArrows([{ from: lan.slice(0, 2), to: lan.slice(2, 4), color: 'var(--arrow-hint)' }]);
      $('#status', root).innerHTML = `Play <b>${esc(moves[idx].san)}</b>`;
    } else $('#status', root).innerHTML = '<span class="dot you"></span> Your move';
  }

  function showNote(m) {
    if (m.note) $('#note', root).innerHTML = `<b>${esc(m.san)}</b>: ${esc(m.note)}`;
  }

  async function userMove(from, to, promotion) {
    if (finished || chess.turn() !== side || idx >= moves.length) return;
    const lan = from + to + (promotion || '');
    const exp = expectedLan(), g = gen;
    if (lan !== exp && !(exp.length === 5 && !promotion && exp.startsWith(lan))) {
      mistakes++;
      board.setMovable(null);
      const t = new Chess(chess.fen());
      let wrong;
      try { wrong = t.move(promotion ? { from, to, promotion } : { from, to }); } catch { board.setMovable(side); return; }
      board.set(t, { lastMove: wrong });
      board.setBadge({ sq: to, text: '✗', color: 'var(--c-blunder)' });
      $('#status', root).innerHTML = '<span class="bad">That\'s not the move in this line.</span> Try again.';
      await sleep(650);
      if (!alive || g !== gen) return;
      board.set(chess, { lastMove: lastMoveOf(chess) });
      if (mistakes >= 2 || mode === 'learn') board.setArrows([{ from: exp.slice(0, 2), to: exp.slice(2, 4), color: 'var(--arrow-hint)' }]);
      board.setMovable(side);
      return;
    }
    const mv = chess.move(moves[idx].san);
    idx++;
    board.set(chess, { lastMove: mv });
    board.setArrows([]);
    showNote(moves[idx - 1]);
    renderMoves();
    step();
  }

  function complete() {
    finished = true;
    board.setMovable(null);
    const key = lineKey(course.id, queue[q].index);
    let msg;
    store.update((s) => {
      const st = s.openings[key] || { box: 0, due: 0, attempts: 0, perfect: 0 };
      st.attempts++;
      if (mode === 'learn') {
        st.box = Math.max(st.box, 1);
        st.due = Date.now();
        msg = 'Line learned. Now try it in <b>Practice</b> mode.';
      } else if (mistakes === 0 && hintsUsed === 0) {
        st.perfect++;
        st.box = Math.min(5, st.box + 1);
        st.due = Date.now() + INTERVALS[st.box] * DAY;
        msg = st.box >= MASTERED_BOX ? '🏆 Perfect! This line is mastered.' : `✓ Perfect! Next review in ${INTERVALS[st.box]} day${INTERVALS[st.box] > 1 ? 's' : ''}.`;
      } else {
        st.box = 1;
        st.due = Date.now() + 10 * 60000;
        msg = `Completed with ${mistakes} mistake${mistakes === 1 ? '' : 's'}${hintsUsed ? ' and hints' : ''}. It will come back soon.`;
      }
      s.openings[key] = st;
    });
    $('#status', root).innerHTML = `<div class="done-box">${msg}</div>`;
  }

  function lastMoveOf(g) { const h = g.history({ verbose: true }); return h[h.length - 1] || null; }

  $('#hint', root).onclick = () => {
    if (finished || chess.turn() !== side) return;
    hintsUsed++;
    const exp = expectedLan();
    board.setArrows([{ from: exp.slice(0, 2), to: exp.slice(2, 4), color: 'var(--arrow-hint)' }]);
  };
  $('#restart', root).onclick = () => startLine();
  $('#nextLine', root).onclick = () => {
    if (q + 1 >= queue.length && id === 'due') { location.hash = '#/openings'; return; }
    q = (q + 1) % queue.length; startLine();
  };
  startLine();
  return () => { alive = false; board.destroy(); };
}

function clampIdx(i, n) { return Math.max(0, Math.min(n - 1, i)); }
