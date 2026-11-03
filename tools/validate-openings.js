// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Plays through every opening line and fails if any move is illegal.
import { Chess } from '../vendor/chess.js';
import { OPENINGS, parseLine } from '../js/data/openings.js';
let bad = 0, n = 0;
for (const o of OPENINGS) for (const l of o.lines) {
  n++;
  const c = new Chess();
  for (const mv of parseLine(l.moves)) {
    try { c.move(mv.san); } catch (e) { console.log('ILLEGAL', o.id, l.name, mv.san, 'after', c.history().join(' ')); bad++; break; }
  }
  const side = l.side || o.side;
  if (/#$/.test(l.moves.replace(/\{[^}]*\}/g,'').trim()) && !c.isCheckmate()) { console.log('NOT MATE', l.name); bad++; }
}
console.log(n, 'lines,', bad, 'problems');
