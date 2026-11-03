// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Games against the engine: the calibration game and free play.
import { Chess } from '../../vendor/chess.js';
import { Board } from '../board.js';
import { engine } from '../engine/client.js';
import { store } from '../store.js';
import {
  cpOf, winPct, moveAccuracy, classify, CLASSES, estimateElo, tierOf, clamp,
} from '../rating.js';
import { addEvidence, gameEvidence, setManual, resetSkill } from '../skill.js';
import { esc, $, sleep, modal, announceRating } from '../ui.js';

const CAL_MAX_MOVES = 30, CAL_MIN_MOVES = 12;

/** Intro to the calibration game, or a manual rating entry. */
export function calibrateView(root) {
  const s = store.get();
  root.innerHTML = `
  <section class="page narrow">
    <h1>Find your level</h1>
    <p class="lead">Play one game against an adaptive computer. Every move you make is analysed and the opponent adjusts as the game goes on. At the end you get an approximate Elo rating and a training plan built around it.</p>
    <div class="card steps">
      <div class="step"><b>1</b><div><h3>Play naturally</h3><p>Up to ${CAL_MAX_MOVES} moves each. Take your time, there is no clock.</p></div></div>
      <div class="step"><b>2</b><div><h3>Every move is scored</h3><p>The engine measures how much each move gives away (centipawn loss and accuracy).</p></div></div>
      <div class="step"><b>3</b><div><h3>Get your rating and plan</h3><p>Puzzles, openings and books are then pitched at your level.</p></div></div>
    </div>
    ${s.profile.calibrated ? `<div class="note">Your current skill rating is <b>${s.profile.rating}</b>. Another calibration game adds strong evidence and <b>refines</b> it, the same as any other game.
      <label class="check"><input type="checkbox" id="fresh"> Start over: ignore my previous rating</label></div>` : ''}
    <div class="card">
      <h3>Play as</h3>
      <div class="seg" id="color">
        <button data-c="w" class="on">White</button><button data-c="r">Random</button><button data-c="b">Black</button>
      </div>
      <button class="btn primary big" id="start">Start calibration game</button>
    </div>
    <details class="card">
      <summary>Already know your rating?</summary>
      <p class="muted">Enter your online rapid or blitz rating to skip calibration.</p>
      <div class="row"><input type="number" id="manual" min="200" max="3000" placeholder="e.g. 1350" aria-label="Your rating"><button class="btn" id="setManual">Use this rating</button></div>
    </details>
  </section>`;
  let color = 'w';
  $('#color', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    color = b.dataset.c;
    root.querySelectorAll('#color button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#start', root).onclick = () => {
    const c = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    const fresh = $('#fresh', root)?.checked ? '&fresh=1' : '';
    location.hash = `#/game?mode=calibration&color=${c}${fresh}`;
  };
  $('#setManual', root).onclick = () => {
    const v = clamp(+$('#manual', root).value || 0, 200, 3000);
    if (!v || v < 200) return;
    store.update((st) => {
      setManual(st, v);
      st.profile.calibration = { method: 'manual', date: Date.now() };
      if (st.puzzle.count < 5) st.puzzle.rating = v;
    });
    location.hash = '#/home';
  };
}

/** Pick bot strength, colour and coach mode for a free game. */
export function playSetupView(root) {
  const s = store.get();
  const base = s.profile.rating || 1000;
  root.innerHTML = `
  <section class="page narrow">
    <h1>Play the computer</h1>
    <p class="lead">Practise against a bot at a chosen strength. Coach mode labels each of your moves as you play, and every game ends with a full review.</p>
    <div class="card">
      <label class="field"><span>Bot strength <b id="eloOut">${base}</b></span>
        <input type="range" id="elo" min="400" max="2400" step="50" value="${Math.round(base / 50) * 50}"></label>
      <div class="presets">${[600, 1000, 1400, 1800, 2200].map((e) => `<button class="chip" data-e="${e}">${e}</button>`).join('')}</div>
      <h3>Play as</h3>
      <div class="seg" id="color"><button data-c="w" class="on">White</button><button data-c="r">Random</button><button data-c="b">Black</button></div>
      <label class="check"><input type="checkbox" id="coach" checked> Coach mode (live move feedback)</label>
      <button class="btn primary big" id="start">Play</button>
    </div>
  </section>`;
  const elo = $('#elo', root), out = $('#eloOut', root);
  elo.oninput = () => { out.textContent = elo.value; };
  root.querySelector('.presets').onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) { elo.value = b.dataset.e; out.textContent = b.dataset.e; } };
  let color = 'w';
  $('#color', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    color = b.dataset.c;
    root.querySelectorAll('#color button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#start', root).onclick = () => {
    const c = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    location.hash = `#/game?mode=play&color=${c}&elo=${elo.value}&coach=${$('#coach', root).checked ? 1 : 0}`;
  };
}

/** A game against the engine (calibration or free play), with live analysis and review. Returns a cleanup function. */
export function gameView(root, params) {
  const mode = params.get('mode') === 'play' ? 'play' : 'calibration';
  const userColor = params.get('color') === 'b' ? 'b' : 'w';
  const coach = mode === 'play' && params.get('coach') !== '0';
  const known = params.get('fresh') === '1' ? null : store.get().profile.rating;
  const startElo = clamp(known || 1000, 400, 2400);
  let botElo = mode === 'play' ? clamp(+params.get('elo') || 1200, 400, 2400) : startElo;
  const eloSeen = [];
  const chess = new Chess();
  const fens = [chess.fen()];
  const records = []; // one per user move
  const pending = [];
  let over = false, alive = true, reviewing = false, viewPly = null;

  root.innerHTML = `
  <section class="game-layout">
    <div class="board-col">
      <div class="player-bar"><span class="avatar bot">🤖</span><div><b>${mode === 'calibration' ? 'Calibration bot' : 'Computer'}</b>
        <span class="muted" id="botElo">${mode === 'calibration' ? 'adaptive' : botElo}</span></div><span class="thinking" id="thinking" hidden>thinking…</span></div>
      <div class="board-wrap"><div id="board"></div></div>
      <div class="player-bar"><span class="avatar">🙂</span><div><b>You</b> <span class="muted">${userColor === 'w' ? 'White' : 'Black'}</span></div></div>
    </div>
    <aside class="panel">
      <div class="panel-head"><h2>${mode === 'calibration' ? 'Calibration game' : 'Game vs computer'}</h2>
        <button class="icon-btn" id="flip" title="Flip board" aria-label="Flip board">⇅</button></div>
      <div class="status" id="status"></div>
      ${mode === 'calibration' ? `<div class="progress-wrap"><div class="muted small" id="progLabel">Moves analysed: 0 / ${CAL_MAX_MOVES}</div><div class="progress"><div id="prog"></div></div></div>` : ''}
      <div class="feedback" id="feedback"></div>
      <ol class="movelist" id="moves"></ol>
      <div class="nav-btns" id="navBtns" hidden>
        <button class="btn" data-nav="start" aria-label="First move">⏮</button><button class="btn" data-nav="prev" aria-label="Previous move">◀</button>
        <button class="btn" data-nav="next" aria-label="Next move">▶</button><button class="btn" data-nav="end" aria-label="Last move">⏭</button>
      </div>
      <div class="actions" id="actions">
        ${mode === 'calibration' ? '<button class="btn" id="finish" disabled>Finish &amp; evaluate</button>' : '<button class="btn" id="hint">Hint</button>'}
        <button class="btn danger" id="resign">Resign</button>
      </div>
      <div id="summary"></div>
    </aside>
  </section>`;

  const board = new Board($('#board', root), { orientation: userColor, onMove: userMove });
  board.set(chess);
  const statusEl = $('#status', root), feedbackEl = $('#feedback', root);
  $('#flip', root).onclick = () => board.flip();
  $('#resign', root).onclick = () => { if (!over && confirm('Resign this game?')) finish(0, 'You resigned'); };
  const finishBtn = $('#finish', root);
  if (finishBtn) finishBtn.onclick = () => finish(null, 'Calibration finished early');
  const hintBtn = $('#hint', root);
  if (hintBtn) hintBtn.onclick = async () => {
    if (over || chess.turn() !== userColor) return;
    const r = await records.preAnalysis;
    if (r && r.best) board.setArrows([{ from: r.best.slice(0, 2), to: r.best.slice(2, 4), color: 'var(--arrow-hint)' }]);
  };

  function setStatus(t) { statusEl.innerHTML = t; }
  const userMovesCount = () => records.length;

  function renderMoves() {
    const hist = chess.history({ verbose: true });
    let html = '';
    for (let i = 0; i < hist.length; i += 2) {
      const cell = (j) => {
        const m = hist[j]; if (!m) return '<span></span>';
        const rec = records.find((r) => r.ply === j);
        const showCls = rec && rec.cls && (coach || over);
        const c = showCls ? CLASSES[rec.cls] : null;
        return `<button class="mv ${viewPly === j ? 'cur' : ''}" data-ply="${j}">${esc(m.san)}${c ? `<i class="cls" style="color:${c.color}" title="${c.label}">${c.icon}</i>` : ''}</button>`;
      };
      html += `<li><span class="num">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}</li>`;
    }
    const el = $('#moves', root);
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  function updateProgress() {
    if (mode !== 'calibration') return;
    const done = records.filter((r) => r.cls).length;
    $('#progLabel', root).textContent = `Moves analysed: ${done} / ${CAL_MAX_MOVES}`;
    $('#prog', root).style.width = `${(Math.min(userMovesCount(), CAL_MAX_MOVES) / CAL_MAX_MOVES) * 100}%`;
    if (finishBtn) finishBtn.disabled = userMovesCount() < CAL_MIN_MOVES || over;
  }

  function startUserTurn() {
    if (!alive || over) return;
    const fen = chess.fen();
    records.preAnalysis = engine.analyse(fen, { depth: 10, timeMs: 700, prevFens: fens.slice(-12) }).catch(() => null);
    records.preFen = fen;
    board.setMovable(userColor);
    setStatus(`<span class="dot you"></span> Your move`);
  }

  async function userMove(from, to, promotion) {
    if (over || chess.turn() !== userColor) return;
    let mv;
    try { mv = chess.move(promotion ? { from, to, promotion } : { from, to }); } catch { return; }
    board.setArrows([]);
    board.set(chess, { lastMove: mv });
    board.setMovable(null);
    fens.push(chess.fen());
    const rec = { ply: chess.history().length - 1, san: mv.san, uci: mv.from + mv.to + (mv.promotion || ''), fenBefore: mv.before };
    records.push(rec);
    renderMoves();
    updateProgress();
    const pre = records.preAnalysis;
    const ended = chess.isGameOver();
    const limit = mode === 'calibration' && userMovesCount() >= CAL_MAX_MOVES;
    // Queue the bot's reply first so it isn't delayed by the scoring search.
    const botPromise = !ended && !limit ? botTurn() : null;
    const scorePromise = scoreRecord(rec, pre);
    pending.push(scorePromise);
    if (ended) { checkEnd(); return; }
    if (limit) {
      await scorePromise;
      finish(null, 'Calibration complete');
      return;
    }
    if (botPromise) await botPromise;
  }

  async function scoreRecord(rec, prePromise) {
    try {
      const pre = await prePromise;
      const after = await engine.scoreMove(rec.fenBefore, rec.uci, { depth: 10, timeMs: 700 });
      if (!pre || !after || !alive) return;
      const isBest = pre.best === rec.uci;
      const before = cpOf(pre.score, pre.mate);
      const aft = isBest ? before : Math.min(before, cpOf(after.score, after.mate));
      const wpB = winPct(before), wpA = winPct(aft);
      Object.assign(rec, {
        best: pre.best, bestPv: pre.pv, cpBefore: before, cpAfter: aft,
        loss: Math.min(1000, Math.max(0, before - aft)), wpLoss: wpB - wpA, acc: moveAccuracy(wpB, wpA),
        cls: classify(wpB - wpA, isBest),
      });
      if (pre.best) {
        try {
          const tmp = new Chess(rec.fenBefore);
          rec.bestSan = tmp.move({ from: pre.best.slice(0, 2), to: pre.best.slice(2, 4), promotion: pre.best[4] }).san;
        } catch { /* ignore */ }
      }
      if (mode === 'calibration') adaptBot();
      if (coach && !over) showFeedback(rec);
      renderMoves();
      updateProgress();
    } catch { /* engine cancelled */ }
  }

  function showFeedback(rec) {
    const c = CLASSES[rec.cls];
    const better = rec.cls !== 'best' && rec.bestSan && ['inaccuracy', 'mistake', 'blunder'].includes(rec.cls)
      ? ` Best was <b>${esc(rec.bestSan)}</b>.` : '';
    feedbackEl.innerHTML = `<div class="fb" style="border-color:${c.color}"><span class="cls-badge" style="background:${c.color}">${c.icon}</span>
      <div><b>${esc(rec.san)}</b> is ${c.label.toLowerCase() === 'best' ? 'the best move' : c.label.toLowerCase()}.${better}</div></div>`;
  }

  // Moves made once the game is already decided say little about skill
  // (every move looks "accurate" in a hopeless position), so leave them out.
  function countedMoves() {
    const done = records.filter((r) => r.cls);
    const contested = done.filter((r) => Math.abs(r.cpBefore) < 700);
    return contested.length >= 6 ? contested : done;
  }

  function runningEstimate() {
    const done = countedMoves();
    if (!done.length) return null;
    const acpl = done.reduce((a, r) => a + r.loss, 0) / done.length;
    const acc = done.reduce((a, r) => a + r.acc, 0) / done.length;
    return { acpl, acc, n: done.length, blunders: done.filter((x) => x.cls === 'blunder').length, mistakes: done.filter((x) => x.cls === 'mistake').length };
  }

  function adaptBot() {
    const r = runningEstimate();
    if (!r) return;
    const counts = { blunder: r.blunders, mistake: r.mistakes };
    const est = estimateElo({ acpl: r.acpl, accuracy: r.acc, result: 0.5, oppElo: botElo, moves: r.n, counts }).elo;
    const w = r.n / (r.n + 4);
    botElo = Math.round(clamp(startElo * (1 - w) + est * w + 50, 400, 2400) / 25) * 25;
  }

  async function botTurn() {
    $('#thinking', root).hidden = false;
    setStatus('<span class="dot bot"></span> Computer is thinking…');
    const t0 = Date.now();
    eloSeen.push(botElo);
    let r;
    try {
      r = await engine.playMove(chess.fen(), { elo: botElo, ply: chess.history().length, prevFens: fens.slice(-12) });
    } catch { return; }
    if (!alive || over) return;
    const wait = 450 - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    if (!alive || over) return;
    $('#thinking', root).hidden = true;
    if (!r) return;
    const mv = chess.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] });
    fens.push(chess.fen());
    board.set(chess, { lastMove: mv, animate: true });
    renderMoves();
    if (!checkEnd()) startUserTurn();
  }

  function checkEnd() {
    if (!chess.isGameOver()) return false;
    let result, reason;
    if (chess.isCheckmate()) {
      const userWon = chess.turn() !== userColor;
      result = userWon ? 1 : 0; reason = userWon ? 'Checkmate, you win!' : 'Checkmate, the computer wins';
    } else {
      result = 0.5;
      reason = chess.isStalemate() ? 'Draw by stalemate' : chess.isThreefoldRepetition() ? 'Draw by repetition'
        : chess.isInsufficientMaterial() ? 'Draw: insufficient material' : 'Draw by the 50-move rule';
    }
    finish(result, reason);
    return true;
  }

  async function finish(result, reason) {
    if (over) return;
    over = true;
    board.setMovable(null);
    board.setArrows([]);
    $('#thinking', root).hidden = true;
    setStatus(`<b>${esc(reason)}</b> <span class="muted small">Analysing…</span>`);
    $('#actions', root).hidden = true;
    await Promise.all(pending);
    if (!alive) return;
    if (result === null) {
      // Game stopped early: judge by the evaluation of the last analysed move.
      const last = [...records].reverse().find((r) => r.cls);
      const cp = last ? last.cpAfter : 0;
      result = cp > 250 ? 1 : cp < -250 ? 0 : 0.5;
    }
    const done = countedMoves();
    const n = done.length;
    const acpl = n ? done.reduce((a, r) => a + r.loss, 0) / n : 300;
    const accuracy = n ? done.reduce((a, r) => a + r.acc, 0) / n : 30;
    const counts = {};
    for (const k of Object.keys(CLASSES)) counts[k] = done.filter((r) => r.cls === k).length;
    const avgOpp = eloSeen.length ? Math.round(eloSeen.reduce((a, b) => a + b, 0) / eloSeen.length) : botElo;
    const est = estimateElo({ acpl, accuracy, result, oppElo: avgOpp, moves: n, counts, mated: chess.isCheckmate() && chess.turn() === userColor });
    const fresh = mode === 'calibration' && params.get('fresh') === '1';
    const ev = store.update((st) => {
      if (fresh) resetSkill(st);
      if (mode === 'calibration') {
        st.profile.calibration = { method: 'game', date: Date.now(), acpl: Math.round(acpl), accuracy: Math.round(accuracy * 10) / 10, counts, result, moves: n, parts: est.parts };
      }
      st.games.push({ t: Date.now(), mode, result, opp: avgOpp, accuracy: Math.round(accuracy), moves: n, perf: est.elo });
      const e = addEvidence(st, {
        ...gameEvidence(est, n), src: mode === 'calibration' ? 'calibration' : 'game',
        label: `${result === 1 ? 'Win' : result === 0 ? 'Loss' : 'Draw'} vs ~${avgOpp}, ${Math.round(accuracy)}% accuracy`,
      });
      if (st.puzzle.count < 10) st.puzzle.rating = st.profile.rating;
      return e;
    });
    const rating = ev.after, rd = store.get().profile.rd;
    const tier = tierOf(rating);
    const delta = ev.before == null ? null : ev.after - ev.before;
    const change = delta == null ? '<span class="muted small">first rating</span>'
      : `<b class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</b>`;
    const html = `<div class="result-card">
        ${mode === 'calibration' ? '<div class="muted small">Skill rating</div>' : `<div class="big-result">${result === 1 ? 'You won' : result === 0 ? 'You lost' : 'Draw'}</div><div class="muted small">Skill rating</div>`}
        <div class="big-rating">${rating}<span>±${rd}</span></div>
        <div>${change} · <span class="tier" style="--tier:${tier.color}">${tier.name}</span></div>
        <div class="muted small">This game's performance: <b>~${est.elo}</b>${ev.before != null ? ` (counted at ${ev.weight}% weight)` : ''}</div>
        ${statsHtml(accuracy, acpl, counts)}
        <p class="muted small">Based on ${n} analysed moves against an opponent averaging ~${avgOpp}. Every game and every ${10} rated puzzles keep refining your rating.</p>
        <div class="row center">${mode === 'play' ? '<a class="btn primary" href="#/play">New game</a>' : ''}<a class="btn ${mode === 'play' ? '' : 'primary'}" href="#/home">${mode === 'play' ? 'Home' : 'See my training plan'}</a></div>
      </div>`;
    setStatus(`<b>${esc(reason)}</b>`);
    $('#summary', root).innerHTML = html + '<p class="muted small review-tip">Click any move to review it. The green arrow shows the engine\'s choice.</p>';
    enterReview();
    if (mode === 'calibration') {
      modal(`<h2>Calibration complete</h2><div class="big-rating">${rating}<span>±${rd}</span></div>
        <div class="tier" style="--tier:${tier.color}">${tier.name}</div>
        <p>Your accuracy was <b>${accuracy.toFixed(1)}%</b> with an average loss of <b>${Math.round(acpl)}</b> centipawns per move.
        Your rating will keep adjusting as you play games and solve rated puzzles.</p>
        <p class="muted small">Tip: use <b>Save</b> (top right) to keep your progress in a file.</p>
        <div class="row center"><button class="btn" data-close>Review game</button><a class="btn primary" href="#/home" data-close>See my training plan</a></div>`);
    } else announceRating(ev);
    renderMoves();
  }

  function statsHtml(accuracy, acpl, counts) {
    return `<div class="stat-row"><div><b>${accuracy.toFixed(1)}%</b><span>Accuracy</span></div><div><b>${Math.round(acpl)}</b><span>Avg. cp loss</span></div></div>
      <ul class="cls-list">${Object.entries(CLASSES).map(([k, c]) => `<li><span class="cls-badge" style="background:${c.color}">${c.icon}</span>${c.label}<b>${counts[k] || 0}</b></li>`).join('')}</ul>`;
  }

  // ---------- review ----------
  function enterReview() {
    reviewing = true;
    $('#navBtns', root).hidden = false;
    const hist = chess.history({ verbose: true });
    const show = (ply) => {
      viewPly = ply;
      const g = new Chess(ply < 0 ? fens[0] : hist[ply].after);
      const lm = ply >= 0 ? hist[ply] : null;
      board.set(g, { lastMove: lm });
      const rec = records.find((r) => r.ply === ply);
      if (rec && rec.cls) {
        const c = CLASSES[rec.cls];
        board.setBadge({ sq: lm.to, text: c.icon, color: c.color });
        if (rec.best && rec.best !== rec.uci) board.setArrows([{ from: rec.best.slice(0, 2), to: rec.best.slice(2, 4), color: 'var(--arrow-best)' }]);
        else board.setArrows([]);
        feedbackEl.innerHTML = `<div class="fb" style="border-color:${c.color}"><span class="cls-badge" style="background:${c.color}">${c.icon}</span>
          <div><b>${esc(rec.san)}</b>: ${c.label}${rec.bestSan && rec.best !== rec.uci ? `. Best was <b>${esc(rec.bestSan)}</b>` : ''}
          <div class="muted small">Eval after move: ${(rec.cpAfter / 100).toFixed(2)} (your view)</div></div></div>`;
      } else { board.setArrows([]); feedbackEl.innerHTML = ''; }
      renderMoves();
    };
    $('#moves', root).onclick = (e) => { const b = e.target.closest('[data-ply]'); if (b) show(+b.dataset.ply); };
    $('#navBtns', root).onclick = (e) => {
      const b = e.target.closest('[data-nav]'); if (!b) return;
      const last = hist.length - 1, cur = viewPly ?? last;
      const map = { start: -1, prev: Math.max(-1, cur - 1), next: Math.min(last, cur + 1), end: last };
      show(map[b.dataset.nav]);
    };
    keyNav = (e) => {
      if (!reviewing) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); $('[data-nav="prev"]', root).click(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); $('[data-nav="next"]', root).click(); }
    };
    window.addEventListener('keydown', keyNav);
  }
  let keyNav = null;

  // kick-off
  if (mode === 'play') $('#botElo', root).textContent = botElo;
  if (userColor === 'w') startUserTurn(); else botTurn();
  updateProgress();

  return () => {
    alive = false;
    board.destroy();
    if (keyNav) window.removeEventListener('keydown', keyNav);
  };
}
