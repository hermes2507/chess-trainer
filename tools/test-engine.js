// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Engine self-test: perft node counts against standard reference positions, plus mate-search checks.
import { Position, Searcher, perft, mateIn } from '../js/engine/core.js';
const cases = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 4, 4085603],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 4, 2103487],
];
let ok = true;
for (const [fen, d, exp] of cases) {
  const p = new Position(fen); const t = Date.now();
  const n = perft(p, d); const ms = Date.now() - t;
  console.log(n === exp ? 'OK  ' : 'FAIL', n, exp, ms + 'ms', Math.round(n / ms) + 'k nps');
  if (n !== exp) ok = false;
  if (p.fen().split(' ').slice(0,4).join(' ') !== fen.split(' ').slice(0,4).join(' ')) { console.log('fen mismatch', p.fen()); ok=false; }
}
// hash consistency
const p = new Position(cases[1][0]);
function walk(d){ if(!d) return; for(const m of p.gen()){ if(!p.make(m)) continue; const lo=p.hlo,hi=p.hhi; p.computeHash(); if(lo!==p.hlo||hi!==p.hhi){console.log('HASH FAIL'); ok=false; process.exit(1);} walk(d-1); p.unmake(); } }
walk(3); console.log('hash ok');
const s = new Searcher();
for (const [fen, name] of [['r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4','Scholar mate (Qxf7#)'], ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1','back rank Rd8#'], [cases[0][0],'start']]) {
  const pos = new Position(fen); const t = Date.now();
  const r = s.think(pos, { maxDepth: 6, timeMs: 3000 });
  console.log(name, pos.toUci(r.move), r.score, 'mate', mateIn(r.score), 'd', r.depth, r.nodes, Date.now()-t+'ms', r.pv.map(m=>pos.toUci(m)).join(' '));
}
console.log(ok ? 'ALL OK' : 'FAILURES');
