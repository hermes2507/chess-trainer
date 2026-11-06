// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Checks that every puzzle gets an explanation: one step per move, each with text,
// and a summary. With an argument (a puzzle id or "sample"), prints explanations.
import { PUZZLES } from '../js/data/puzzles.js';
import { explainPuzzle } from '../js/explain.js';

let bad = 0;
const tagCount = {};
const t0 = performance.now();
for (const p of PUZZLES) {
  let e;
  try { e = explainPuzzle(p); } catch (err) { console.log('THROWS', p.id, err.message); bad++; continue; }
  if (e.steps.length !== p.moves.length) { console.log('STEP COUNT', p.id); bad++; }
  if (!e.summary) { console.log('NO SUMMARY', p.id); bad++; }
  for (const s of e.steps) {
    if (!s.text.length || s.text.some((t) => !t || /undefined|NaN/.test(t))) { console.log('BAD TEXT', p.id, s.san, s.text); bad++; }
    for (const t of s.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  }
  if (/undefined|NaN/.test(e.summary)) { console.log('BAD SUMMARY', p.id, e.summary); bad++; }
  // Puzzle themes the explainer should normally pick up on.
  if (p.themes.includes('mate') && !e.steps.at(-1).tags.includes('mate')) { console.log('MATE NOT SEEN', p.id); bad++; }
}
console.log(`explained ${PUZZLES.length} puzzles in ${Math.round(performance.now() - t0)} ms; tags`, tagCount);

const arg = process.argv[2];
if (arg) {
  const pick = arg === 'sample' ? PUZZLES.filter((_, i) => i % 71 === 3) : PUZZLES.filter((p) => p.id === arg);
  for (const p of pick) {
    const e = explainPuzzle(p);
    console.log(`\n== ${p.id} (${p.rating}) ${p.themes.join(', ')}\n${e.summary}`);
    for (const s of e.steps) console.log(`  ${s.kind.padEnd(5)} ${s.moveNo}${s.san}\n        ${s.text.join('\n        ')}`);
  }
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('explanations OK');
