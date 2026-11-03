// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Original flat SVG piece set. Every piece is drawn in a 100×100 box centred on
// x = 50, so it sits in the middle of its square in any font or browser
// (the old Unicode glyphs inherited each font's baseline and side bearings).
const BASE = '<rect class="pf" x="24" y="80" width="52" height="10" rx="3"/>';

const SHAPES = {
  p: `${BASE}<path class="pf" d="M37 80c1-12 6-22 9-30h8c3 8 8 18 9 30z"/>
      <rect class="pf" x="38" y="44" width="24" height="7" rx="3.5"/>
      <circle class="pf" cx="50" cy="31" r="12"/>`,
  r: `${BASE}<path class="pf" d="M34 80l2-34h28l2 34z"/>
      <rect class="pf" x="30" y="40" width="40" height="8" rx="2"/>
      <path class="pf" d="M28 18h10v8h7v-8h10v8h7v-8h10v22H28z"/>`,
  b: `${BASE}<path class="pf" d="M38 80c2-6 4-12 4-18h16c0 6 2 12 4 18z"/>
      <path class="pf" d="M50 18c15 12 18 30 10 44H40c-8-14-5-32 10-44z"/>
      <path class="pd" d="M53 30l-8 12"/>
      <circle class="pf" cx="50" cy="14" r="5"/>`,
  n: `${BASE}<path class="pf" d="M33 80c0-14 6-22 15-28-7 0-13 3-18 6-5-3-7-9-3-14l17-18c2-6 6-10 11-10l2 6c12 4 18 20 16 38-1 9-3 15-6 20z"/>
      <circle class="pe" cx="47" cy="32" r="2.6"/>
      <path class="pd" d="M60 32c4 8 5 18 2 30"/>`,
  q: `${BASE}<path class="pf" d="M30 78l-8-44 12 20 3-28 8 26 5-30 5 30 8-26 3 28 12-20-8 44z"/>
      <circle class="pf" cx="22" cy="32" r="5"/><circle class="pf" cx="37" cy="24" r="5"/>
      <circle class="pf" cx="50" cy="19" r="5"/><circle class="pf" cx="63" cy="24" r="5"/>
      <circle class="pf" cx="78" cy="32" r="5"/>
      <path class="pd" d="M32 68h36"/>`,
  k: `${BASE}<path class="pf" d="M30 78c-4-16-4-26 2-33 6-5 14-2 18 5 4-7 12-10 18-5 6 7 6 17 2 33z"/>
      <path class="pf" d="M47 10h6v7h7v6h-7v14h-6V23h-7v-6h7z"/>
      <path class="pd" d="M33 66h34"/>`,
};

/**
 * Inline SVG for one piece.
 * @param {'w'|'b'} color
 * @param {'p'|'n'|'b'|'r'|'q'|'k'} type
 * @returns {string} SVG markup
 */
export function pieceSVG(color, type) {
  return `<svg class="pc ${color}" viewBox="0 0 100 100" aria-hidden="true">${SHAPES[type]}</svg>`;
}
