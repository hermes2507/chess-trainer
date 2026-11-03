// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// High-level engine functions. All scores are centipawns from the side to move
// unless noted; `mate` is moves-to-mate (+ = side to move mates).
import { Position, Searcher, MATE, mateIn } from './core.js';

const searcher = new Searcher();

// Position from `fen`, seeded with earlier positions so the search can detect repetitions.
function loadWithHistory(fen, prevFens) {
  const pos = new Position(fen);
  if (prevFens && prevFens.length) {
    const tmp = new Position();
    pos.hist = prevFens.map((f) => { tmp.load(f); return tmp.hlo; });
  }
  return pos;
}

/**
 * Best move and evaluation of a position.
 * @param {string} fen
 * @param {{depth?: number, timeMs?: number, prevFens?: string[]}} [opts]
 * @returns {{best: string|null, score: number, mate: number, depth: number, pv: string[], nodes: number}}
 *   `best` and `pv` are UCI moves (e.g. 'e2e4').
 */
export function analyse(fen, { depth = 8, timeMs = 1000, prevFens } = {}) {
  const pos = loadWithHistory(fen, prevFens);
  const r = searcher.think(pos, { maxDepth: depth, timeMs });
  const pvUci = [];
  const walk = new Position(fen);
  for (const m of r.pv) {
    const legal = walk.legalMoves();
    if (!legal.includes(m)) break;
    pvUci.push(walk.toUci(m));
    walk.make(m);
  }
  return {
    best: r.move ? pos.toUci(r.move) : null,
    score: r.score,
    mate: mateIn(r.score),
    depth: r.depth,
    pv: pvUci,
    nodes: r.nodes,
  };
}

/** Score every legal move at a fixed depth: [{ uci, score, mate }], best first. */
export function scoreMoves(fen, { depth = 4, timeMs = 4000 } = {}) {
  const pos = new Position(fen);
  return searcher.scoreAll(pos, depth, timeMs).map((x) => ({
    uci: pos.toUci(x.move), score: x.score, mate: mateIn(x.score),
  }));
}

// Score of the position after `uci` is played, from the mover's perspective.
export function scoreMove(fen, uci, { depth = 6, timeMs = 600 } = {}) {
  const pos = new Position(fen);
  const m = pos.fromUci(uci);
  if (!m) return null;
  pos.make(m);
  const child = pos.fen();
  const legal = pos.legalMoves().length;
  if (!legal) return { score: pos.inCheck() ? MATE - 1 : 0, mate: pos.inCheck() ? 1 : 0 };
  const r = analyse(child, { depth: Math.max(1, depth - 1), timeMs });
  return { score: -r.score, mate: -r.mate };
}

// Strength settings for a target Elo (approximate, tuned by feel).
export function levelParams(elo) {
  const depth = elo < 650 ? 1 : elo < 900 ? 2 : elo < 1150 ? 3 : elo < 1450 ? 4 : elo < 1750 ? 5 : elo < 2050 ? 7 : 10;
  const temp = Math.max(0, 240 * Math.exp(-(elo - 400) / 300));
  const blunder = Math.max(0, 0.1 - (elo - 400) / 7000);
  return { depth, temp, blunder };
}

function softmaxPick(scored, temp) {
  if (temp < 1) return scored[0];
  const best = scored[0].score;
  const w = scored.map((s) => Math.exp(Math.max(-30, (s.score - best) / temp)));
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < scored.length; i++) { r -= w[i]; if (r <= 0) return scored[i]; }
  return scored[0];
}

// Pick a move that plays roughly at the requested Elo.
export function playMove(fen, { elo = 1200, ply = 0, prevFens } = {}) {
  const pos = loadWithHistory(fen, prevFens);
  const legal = pos.legalMoves();
  if (!legal.length) return null;
  const { depth, temp, blunder } = levelParams(elo);

  if (Math.random() < blunder) {
    const m = legal[Math.floor(Math.random() * legal.length)];
    return { uci: pos.toUci(m), kind: 'random' };
  }
  if (elo < 1450 || ply < 8) {
    const scored = searcher.scoreAll(pos, Math.min(depth, 4), 2500)
      .map((x) => ({ move: x.move, score: x.score }));
    // Opening variety for strong levels: choose among near-equal moves.
    const t = elo >= 1450 ? 12 : temp;
    const pick = softmaxPick(scored, t);
    return { uci: pos.toUci(pick.move), kind: 'soft' };
  }
  const r = searcher.think(pos, { maxDepth: depth, timeMs: elo < 2050 ? 900 : 1800 });
  return { uci: pos.toUci(r.move), kind: 'search', score: r.score };
}
