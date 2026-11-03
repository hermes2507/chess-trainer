// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Rating, accuracy and move-classification helpers.
/** Limit `x` to the range [a, b]. */
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Engine score (side-to-move cp, or mate distance) -> clamped centipawns.
export function cpOf(score, mate) {
  if (mate) return mate > 0 ? 2000 : -2000;
  return clamp(score, -2000, 2000);
}

// Lichess-style win probability (0..100) and accuracy formula.
export const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
/** Accuracy (0..100) of one move from the mover's win % before and after it. */
export function moveAccuracy(wpBefore, wpAfter) {
  const d = Math.max(0, wpBefore - wpAfter);
  return clamp(103.1668 * Math.exp(-0.04354 * d) - 3.1669, 0, 100);
}

/** Move-quality labels (Best … Blunder) with their colours and badge symbols. */
export const CLASSES = {
  best: { label: 'Best', icon: '★', color: 'var(--c-best)' },
  excellent: { label: 'Excellent', icon: '!', color: 'var(--c-excellent)' },
  good: { label: 'Good', icon: '✓', color: 'var(--c-good)' },
  inaccuracy: { label: 'Inaccuracy', icon: '?!', color: 'var(--c-inacc)' },
  mistake: { label: 'Mistake', icon: '?', color: 'var(--c-mistake)' },
  blunder: { label: 'Blunder', icon: '??', color: 'var(--c-blunder)' },
};

/** Label a move from the win % it lost; `isBest` marks the engine's top choice. */
export function classify(wpLoss, isBest) {
  if (isBest) return 'best';
  if (wpLoss <= 2) return 'excellent';
  if (wpLoss <= 5) return 'good';
  if (wpLoss <= 10) return 'inaccuracy';
  if (wpLoss <= 20) return 'mistake';
  return 'blunder';
}

const interp = (x, pts) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};

// Combine move quality and the game result into an approximate Elo.
// counts: move classifications; mated: the player was checkmated.
export function estimateElo({ acpl, accuracy, result, oppElo, moves, counts = {}, mated = false }) {
  const fromAcpl = 2900 * Math.exp(-0.0095 * acpl);
  const fromAcc = interp(accuracy, [[40, 300], [55, 450], [65, 650], [75, 950], [82, 1250], [88, 1600], [92, 1900], [95, 2200], [98, 2500]]);
  let perf = oppElo + (result === 1 ? 350 : result === 0 ? -350 : 0);
  // Losing a short game by checkmate says a lot about the current level.
  if (mated && moves < 25) perf -= (25 - moves) * 15;
  let est = 0.45 * fromAcpl + 0.3 * fromAcc + 0.25 * perf;
  const n = Math.max(moves, 1);
  est -= 700 * ((counts.blunder || 0) / n) + 250 * ((counts.mistake || 0) / n);
  // The result bounds the estimate: you can't perform far above an opponent you
  // lost to, or far below one you beat.
  if (result === 0) est = Math.min(est, oppElo + 100);
  if (result === 1) est = Math.max(est, oppElo - 100);
  est = Math.round(clamp(est, 250, 2600) / 10) * 10;
  const margin = Math.round(clamp(600 / Math.sqrt(n), 100, 350) / 10) * 10;
  return { elo: est, margin, parts: { fromAcpl: Math.round(fromAcpl), fromAcc: Math.round(fromAcc), perf: Math.round(perf) } };
}

/** Elo expected score of rating `r` against `opp` (0..1). */
export const expected = (r, opp) => 1 / (1 + 10 ** ((opp - r) / 400));
/** Classic Elo update: new rating after scoring `score` (1/0.5/0) with factor `k`. */
export const eloUpdate = (r, opp, score, k) => Math.round(r + k * (score - expected(r, opp)));

/** Rating bands used for labels and recommendations; `max` is exclusive. */
export const TIERS = [
  { id: 'beginner', name: 'Beginner', min: 0, max: 800, color: '#a7a6a2' },
  { id: 'novice', name: 'Novice', min: 800, max: 1200, color: '#7fa650' },
  { id: 'intermediate', name: 'Intermediate', min: 1200, max: 1600, color: '#5d9bd5' },
  { id: 'advanced', name: 'Advanced', min: 1600, max: 2000, color: '#b07fd6' },
  { id: 'expert', name: 'Expert', min: 2000, max: 9999, color: '#e2a03f' },
];
/** The tier a rating falls in. */
export const tierOf = (r) => TIERS.find((t) => r < t.max) || TIERS[TIERS.length - 1];
