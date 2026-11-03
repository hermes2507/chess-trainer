// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Continuous skill rating. Every game and every batch of rated puzzles is a
// noisy measurement of your strength (`obs` ± `sd`). The rating is a running
// estimate with its own uncertainty (`rd`), combined by a Bayesian update:
// solid evidence moves an uncertain rating a lot, weak evidence moves a
// well-established rating a little. Uncertainty grows slowly while you are away.
import { clamp, tierOf } from './rating.js';

export const MAX_RD = 350;     // uncertainty of a brand-new rating
export const MIN_RD = 75;      // never fully certain, so the rating keeps adapting
const RD_GROWTH_PER_DAY = 6;   // inactivity widens the range a little
/** Rated puzzles per skill-rating measurement. */
export const PUZZLE_BATCH = 10;
const PUZZLE_SD = 300;         // a 10-puzzle batch is weak evidence of playing strength

/** Where a measurement came from, with its display label. */
export const SOURCES = {
  calibration: { label: 'Calibration game', icon: '◎' },
  game: { label: 'Game vs computer', icon: '♟' },
  puzzles: { label: 'Rated puzzles', icon: '🧩' },
  manual: { label: 'Entered manually', icon: '✎' },
};

function age(p, now) {
  if (!p.rdAt) { p.rdAt = now; return; }
  const days = (now - p.rdAt) / 86400000;
  if (days > 0) p.rd = Math.min(MAX_RD, Math.round(Math.sqrt(p.rd ** 2 + RD_GROWTH_PER_DAY ** 2 * days)));
  p.rdAt = now;
}

// Current uncertainty, including growth since the last update (read-only).
export function currentRd(p, now = Date.now()) {
  if (p.rating == null) return MAX_RD;
  const days = Math.max(0, (now - (p.rdAt || now)) / 86400000);
  return Math.min(MAX_RD, Math.round(Math.sqrt(p.rd ** 2 + RD_GROWTH_PER_DAY ** 2 * days)));
}

/** True until the rating exists and its uncertainty has narrowed below 150. */
export const isProvisional = (p) => p.rating == null || currentRd(p) > 150;

// Fold one measurement into the rating. Mutates state `s`; call inside store.update.
export function addEvidence(s, { obs, sd, src, label = '' }) {
  const p = s.profile, now = Date.now();
  obs = clamp(obs, 100, 3000);
  let before = p.rating, k = 1;
  if (p.rating == null) {
    // The first measurement defines the rating.
    p.rating = Math.round(obs);
    p.rd = Math.round(clamp(sd, MIN_RD, MAX_RD));
    p.rdAt = now;
  } else {
    age(p, now);
    const v = p.rd ** 2, w = sd ** 2;
    k = v / (v + w);
    p.rating = Math.round(clamp(p.rating + k * (obs - p.rating), 100, 3000));
    p.rd = Math.max(MIN_RD, Math.round(Math.sqrt((v * w) / (v + w))));
  }
  p.calibrated = true;
  const ev = { t: now, src, label, obs: Math.round(obs), sd: Math.round(sd), before, after: p.rating, rd: p.rd, weight: Math.round(k * 100) };
  p.events.push(ev);
  if (p.events.length > 300) p.events.shift();
  p.ratingHistory.push({ t: now, r: p.rating });
  ev.tierUp = before != null && tierOf(p.rating).min > tierOf(before).min;
  ev.tierDown = before != null && tierOf(p.rating).min < tierOf(before).min;
  return ev;
}

// Start over with a rating that you know (e.g. from an online site).
export function setManual(s, rating) {
  const p = s.profile;
  p.rating = null;
  return addEvidence(s, { obs: rating, sd: 150, src: 'manual', label: `Set to ${rating}` });
}

/** Forget the skill rating and its history (back to uncalibrated). */
export function resetSkill(s) {
  Object.assign(s.profile, { rating: null, rd: MAX_RD, rdAt: null, calibrated: false, puzzleBatch: [] });
}

// Collect rated puzzles; every PUZZLE_BATCH results become one measurement
// (a performance rating over the batch).
export function addPuzzleResult(s, puzzleRating, ok) {
  const p = s.profile;
  p.puzzleBatch.push({ r: puzzleRating, ok });
  if (p.puzzleBatch.length < PUZZLE_BATCH) return null;
  const b = p.puzzleBatch, n = b.length;
  const avg = b.reduce((a, x) => a + x.r, 0) / n;
  const wins = b.filter((x) => x.ok).length;
  const perf = avg + (400 * (2 * wins - n)) / n;
  p.puzzleBatch = [];
  return addEvidence(s, { obs: perf, sd: PUZZLE_SD, src: 'puzzles', label: `${wins}/${n} solved, avg. puzzle ${Math.round(avg)}` });
}

// Measurement from one game (calibration or casual): performance estimate from
// move quality and the result, with uncertainty shrinking as more moves are analysed.
export function gameEvidence(est, analysedMoves) {
  const sd = analysedMoves < 5 ? 450 : Math.max(150, est.margin);
  return { obs: est.elo, sd };
}
