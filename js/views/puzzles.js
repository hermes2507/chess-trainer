// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Puzzles: rated training, Puzzle Rush and themed practice.
import { Chess } from '../../vendor/chess.js';
import { Board } from '../board.js';
import { PUZZLES } from '../data/puzzles.js';
import { store } from '../store.js';
import { eloUpdate, clamp } from '../rating.js';
import { addPuzzleResult, PUZZLE_BATCH } from '../skill.js';
import { esc, $, sleep, THEME_INFO, announceRating } from '../ui.js';

const RUSH_SECONDS = 180, RUSH_STRIKES = 3;

function applyUci(chess, uci) {
  const o = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci[4]) o.promotion = uci[4];
  return chess.move(o);
}

/**
 * Choose a puzzle near `target` rating, preferring unseen ones and widening
 * the rating window until enough candidates exist.
 * @returns {object|null} a puzzle from data/puzzles.js
 */
export function pickPuzzle(target, { theme = null, exclude = new Set() } = {}) {
  const seen = store.get().puzzle.seen;
  let pool = PUZZLES.filter((p) => !exclude.has(p.id) && (!theme || p.themes.includes(theme)));
  if (!pool.length) return null;
  const unseen = pool.filter((p) => !seen[p.id]);
  if (unseen.length) pool = unseen;
  for (const w of [75, 150, 250, 400, 700, 5000]) {
    const near = pool.filter((p) => Math.abs(p.rating - target) <= w);
    if (near.length >= 3 || w === 5000) {
      const list = near.length ? near : pool;
      return list[Math.floor(Math.random() * list.length)];
    }
  }
  return pool[0];
}

// Drives one puzzle on a board. The first move in `moves` is the opponent's.
class PuzzleRunner {
  constructor(board, puzzle, { onSolved, onFail, onProgress }) {
    this.board = board; this.p = puzzle;
    this.chess = new Chess(puzzle.fen);
    this.userColor = this.chess.turn() === 'w' ? 'b' : 'w';
    this.idx = 0; this.failed = false; this.hinted = 0; this.done = false;
    this.cb = { onSolved, onFail, onProgress };
    board.onMove = (f, t, pr) => this.userMove(f + t + (pr || ''));
    board.setOrientation(this.userColor);
    board.set(this.chess);
    board.setArrows([]); board.setMarks({});
  }

  async start() {
    await sleep(550);
    if (this.dead) return;
    this.playOpponent();
  }

  playOpponent() {
    const mv = applyUci(this.chess, this.p.moves[this.idx++]);
    this.board.set(this.chess, { lastMove: mv, animate: true });
    this.board.setMovable(this.userColor);
  }

  async userMove(uci) {
    if (this.done) return;
    const expected = this.p.moves[this.idx];
    const test = new Chess(this.chess.fen());
    let mv;
    try { mv = applyUci(test, uci); } catch { return; }
    const correct = mv.lan === expected || test.isCheckmate();
    if (!correct) {
      this.board.setMovable(null);
      const wrong = new Chess(this.chess.fen()); applyUci(wrong, mv.lan);
      this.board.set(wrong, { lastMove: mv });
      this.board.setBadge({ sq: mv.to, text: '✗', color: 'var(--c-blunder)' });
      if (!this.failed) { this.failed = true; this.cb.onFail && this.cb.onFail(); }
      await sleep(700);
      if (this.dead || this.done) return;
      this.board.set(this.chess, { lastMove: this.lastOpp() });
      this.board.setMovable(this.userColor);
      return;
    }
    applyUci(this.chess, mv.lan);
    this.idx++;
    this.board.set(this.chess, { lastMove: mv });
    this.board.setArrows([]); this.board.setMarks({});
    if (this.idx >= this.p.moves.length || this.chess.isCheckmate()) {
      this.done = true;
      this.board.setMovable(null);
      this.board.setBadge({ sq: mv.to, text: '✓', color: 'var(--c-best)' });
      this.cb.onSolved && this.cb.onSolved(!this.failed && !this.hinted);
      return;
    }
    this.board.setBadge({ sq: mv.to, text: '✓', color: 'var(--c-best)' });
    this.board.setMovable(null);
    this.cb.onProgress && this.cb.onProgress();
    await sleep(420);
    if (this.dead) return;
    this.playOpponent();
  }

  lastOpp() {
    const h = this.chess.history({ verbose: true });
    return h[h.length - 1] || null;
  }

  hint() {
    if (this.done) return;
    const exp = this.p.moves[this.idx];
    this.hinted++;
    if (this.hinted === 1) this.board.setMarks({ [exp.slice(0, 2)]: 'hint' });
    else this.board.setArrows([{ from: exp.slice(0, 2), to: exp.slice(2, 4), color: 'var(--arrow-hint)' }]);
  }

  async showSolution() {
    if (this.done) return;
    this.done = true;
    this.board.setMovable(null);
    this.board.setMarks({});
    while (this.idx < this.p.moves.length && !this.dead) {
      const uci = this.p.moves[this.idx++];
      const mv = applyUci(this.chess, uci);
      this.board.set(this.chess, { lastMove: mv, animate: true });
      this.board.setArrows([{ from: mv.from, to: mv.to, color: 'var(--arrow-best)' }]);
      await sleep(800);
    }
  }

  destroy() { this.dead = true; }
}

function recordResult(p, ok, rated) {
  let delta = 0, ev = null;
  store.update((s) => {
    s.puzzle.seen[p.id] = Date.now();
    for (const t of p.themes) {
      const st = s.themes[t] || (s.themes[t] = { ok: 0, fail: 0 });
      ok ? st.ok++ : st.fail++;
    }
    if (rated) {
      const k = s.puzzle.count < 20 ? 40 : 16;
      const before = s.puzzle.rating;
      s.puzzle.rating = clamp(eloUpdate(before, p.rating, ok ? 1 : 0, k), 100, 3200);
      delta = s.puzzle.rating - before;
      s.puzzle.count++;
      s.puzzle.streak = ok ? s.puzzle.streak + 1 : 0;
      s.puzzle.bestStreak = Math.max(s.puzzle.bestStreak, s.puzzle.streak);
      s.puzzle.history.push({ id: p.id, ok, r: s.puzzle.rating, t: Date.now() });
      if (s.puzzle.history.length > 1000) s.puzzle.history.shift();
      ev = addPuzzleResult(s, p.rating, ok);
    }
  });
  announceRating(ev);
  return delta;
}

function tabs(active) {
  return `<nav class="tabs">
    <a href="#/puzzles" class="${active === 'rated' ? 'on' : ''}">Rated</a>
    <a href="#/puzzles/rush" class="${active === 'rush' ? 'on' : ''}">Puzzle Rush</a>
    <a href="#/puzzles/themes" class="${active === 'themes' ? 'on' : ''}">Themes</a></nav>`;
}

const themeChips = (p) => p.themes.filter((t) => THEME_INFO[t]).map((t) => `<a class="chip" href="#/puzzles?theme=${t}">${THEME_INFO[t].name}</a>`).join('');

// ---------- Rated / themed ----------
/** Rated puzzles (or one theme with ?theme=). Returns a cleanup function. */
export function puzzlesView(root, params) {
  const theme = params.get('theme');
  const rated = !theme;
  root.innerHTML = `
  <section class="game-layout">
    <div class="board-col"><div class="board-wrap"><div id="board"></div></div></div>
    <aside class="panel">
      ${tabs(rated ? 'rated' : 'themes')}
      <div class="panel-head"><h2>${rated ? 'Rated puzzles' : esc(THEME_INFO[theme]?.name || theme)}</h2>
        <div class="rating-pill" title="Puzzle rating">🧩 <b id="pr">${store.get().puzzle.rating}</b> <span id="pd"></span></div></div>
      ${!rated ? `<p class="muted small">${esc(THEME_INFO[theme]?.desc || '')} Themed practice is unrated.</p>` : ''}
      <div class="status big" id="status"></div>
      <div id="info"></div>
      <div class="actions">
        <button class="btn" id="hint">Hint</button>
        <button class="btn" id="solution">Solution</button>
        <button class="btn" id="retry" hidden>Retry</button>
        <button class="btn primary" id="next">Skip</button>
      </div>
      <div class="muted small" id="streak"></div>
    </aside>
  </section>`;
  const board = new Board($('#board', root));
  let runner = null, cur = null;
  const statusEl = $('#status', root), infoEl = $('#info', root), nextBtn = $('#next', root);
  const exclude = new Set();

  function updateStreak() {
    const s = store.get().puzzle;
    const left = PUZZLE_BATCH - store.get().profile.puzzleBatch.length;
    $('#streak', root).textContent = rated ? `Streak ${s.streak} · best ${s.bestStreak} · ${s.count} rated · skill rating updates in ${left} puzzle${left === 1 ? '' : 's'}` : '';
  }

  function load(puzzle = null) {
    runner && runner.destroy();
    cur = puzzle || pickPuzzle(store.get().puzzle.rating, { theme, exclude });
    if (!cur) { statusEl.textContent = 'No puzzles found for this theme.'; return; }
    exclude.add(cur.id);
    let finished = false;
    infoEl.innerHTML = '';
    nextBtn.textContent = 'Skip';
    $('#retry', root).hidden = true;
    $('#pd', root).textContent = '';
    const side = new Chess(cur.fen).turn() === 'w' ? 'Black' : 'White';
    statusEl.innerHTML = `<span class="dot ${side === 'White' ? 'w' : 'b'}"></span> ${side} to move. Find the best move.`;
    const end = (ok) => {
      if (finished) return;
      finished = true;
      const delta = recordResult(cur, ok, rated);
      if (rated) {
        $('#pr', root).textContent = store.get().puzzle.rating;
        $('#pd', root).innerHTML = `<b class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</b>`;
      }
      infoEl.innerHTML = `<div class="puzzle-meta"><div>Puzzle rating <b>${cur.rating}</b></div><div class="chips">${themeChips(cur)}</div></div>`;
      nextBtn.textContent = 'Next puzzle';
      updateStreak();
    };
    runner = new PuzzleRunner(board, cur, {
      onSolved: (clean) => {
        statusEl.innerHTML = clean ? '<span class="ok">✓ Solved!</span>' : '<span class="ok">✓ Solved</span> <span class="muted small">(not counted as clean)</span>';
        end(clean);
      },
      onFail: () => {
        statusEl.innerHTML = '<span class="bad">✗ That is not the move.</span> <span class="muted small">Try again or see the solution.</span>';
        end(false);
        $('#retry', root).hidden = false;
      },
      onProgress: () => { statusEl.innerHTML = '<span class="ok">Best move! Keep going…</span>'; },
    });
    runner.start();
  }

  $('#hint', root).onclick = () => runner && runner.hint();
  $('#solution', root).onclick = () => {
    if (!runner || runner.done) return;
    if (!runner.failed) { runner.failed = true; runner.cb.onFail(); }
    $('#retry', root).hidden = false;
    runner.showSolution();
  };
  $('#retry', root).onclick = () => cur && load(cur);
  nextBtn.onclick = () => load();
  updateStreak();
  load();
  return () => { runner && runner.destroy(); board.destroy(); };
}

// ---------- Themes overview ----------
/** Theme overview with per-theme success rates. */
export function themesView(root) {
  const s = store.get();
  const counts = {};
  for (const p of PUZZLES) for (const t of p.themes) counts[t] = (counts[t] || 0) + 1;
  const cards = Object.entries(THEME_INFO).filter(([k]) => counts[k]).map(([k, info]) => {
    const st = s.themes[k];
    const n = st ? st.ok + st.fail : 0;
    const pct = n ? Math.round((st.ok / n) * 100) : null;
    return `<a class="theme-card" href="#/puzzles?theme=${k}">
      <h3>${info.name}</h3><p>${info.desc}</p>
      <div class="theme-foot"><span class="muted small">${counts[k]} puzzles</span>
      ${pct === null ? '<span class="muted small">not tried</span>' : `<span class="pct ${pct >= 70 ? 'up' : pct < 50 ? 'down' : ''}">${pct}% of ${n}</span>`}</div></a>`;
  }).join('');
  root.innerHTML = `<section class="page">${tabs('themes')}<h1>Puzzle themes</h1>
    <p class="lead">Practise one pattern at a time. Your success rate per theme drives the recommendations on the home page.</p>
    <div class="theme-grid">${cards}</div></section>`;
}

// ---------- Puzzle Rush ----------
/** Puzzle Rush: 3 minutes, 3 strikes, rising difficulty. Returns a cleanup function. */
export function rushView(root) {
  const best = store.get().puzzle.rushBest;
  root.innerHTML = `
  <section class="game-layout">
    <div class="board-col"><div class="board-wrap"><div id="board"></div></div></div>
    <aside class="panel">
      ${tabs('rush')}
      <div class="panel-head"><h2>Puzzle Rush</h2><div class="rating-pill">Best <b id="best">${best}</b></div></div>
      <div id="intro">
        <p>Solve as many puzzles as you can in <b>3 minutes</b>. They start easy and get harder. Three mistakes and you're out.</p>
        <button class="btn primary big" id="go">Start</button>
      </div>
      <div id="live" hidden>
        <div class="rush-top"><div class="timer" id="timer">3:00</div><div class="score-big" id="score">0</div><div class="strikes" id="strikes"></div></div>
        <div class="status" id="status"></div>
        <div class="rush-trail" id="trail"></div>
      </div>
    </aside>
  </section>`;
  const board = new Board($('#board', root));
  let runner = null, timer = null, score = 0, strikes = 0, i = 0, endAt = 0, running = false;
  const used = new Set();
  const trail = [];

  function render() {
    $('#score', root).textContent = score;
    $('#strikes', root).innerHTML = Array.from({ length: RUSH_STRIKES }, (_, k) => `<span class="${k < strikes ? 'x on' : 'x'}">✗</span>`).join('');
    $('#trail', root).innerHTML = trail.map((t) => `<span class="${t.ok ? 'ok' : 'bad'}" title="${t.r}">${t.ok ? '✓' : '✗'}</span>`).join('');
  }

  function next() {
    runner && runner.destroy();
    const target = 450 + i * 55;
    const p = pickPuzzle(target, { exclude: used });
    if (!p) return stop();
    used.add(p.id); i++;
    const side = new Chess(p.fen).turn() === 'w' ? 'Black' : 'White';
    $('#status', root).innerHTML = `<span class="dot ${side === 'White' ? 'w' : 'b'}"></span> ${side} to move`;
    runner = new PuzzleRunner(board, p, {
      onSolved: () => { if (!running) return; score++; trail.push({ ok: true, r: p.rating }); store.update((s) => { s.puzzle.seen[p.id] = Date.now(); }); render(); setTimeout(() => running && next(), 300); },
      onFail: () => {
        if (!running) return;
        strikes++; trail.push({ ok: false, r: p.rating }); render();
        if (strikes >= RUSH_STRIKES) return stop();
        setTimeout(() => running && next(), 600);
      },
    });
    runner.start();
  }

  function tick() {
    const left = Math.max(0, endAt - Date.now());
    const sec = Math.ceil(left / 1000);
    $('#timer', root).textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    $('#timer', root).classList.toggle('low', sec <= 20);
    if (left <= 0) stop();
  }

  function stop() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    runner && runner.destroy();
    board.setMovable(null);
    const prevBest = store.get().puzzle.rushBest;
    store.update((s) => { s.puzzle.rushBest = Math.max(s.puzzle.rushBest, score); });
    $('#best', root).textContent = store.get().puzzle.rushBest;
    $('#status', root).innerHTML = `<b>Run over. Score ${score}</b>${score > prevBest ? ' <span class="ok">New personal best!</span>' : ''}
      <div><button class="btn primary" id="again">Play again</button></div>`;
    $('#again', root).onclick = () => { score = 0; strikes = 0; i = 0; trail.length = 0; used.clear(); begin(); };
  }

  function begin() {
    $('#intro', root).hidden = true;
    $('#live', root).hidden = false;
    running = true;
    endAt = Date.now() + RUSH_SECONDS * 1000;
    timer = setInterval(tick, 250);
    render(); tick(); next();
  }
  $('#go', root).onclick = begin;
  return () => { running = false; clearInterval(timer); runner && runner.destroy(); board.destroy(); };
}
