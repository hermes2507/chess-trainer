// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Checks the notation trainer: the position pool covers every case, and the
// grader accepts correct notation and explains common mistakes.
import { Chess } from '../vendor/chess.js';
import { pool, check, classify, casesFor, numbered, normalize, itemMove } from '../js/notation.js';

let bad = 0;
const t0 = performance.now();
const P = pool();
const ms = Math.round(performance.now() - t0);
for (const k of casesFor('write')) {
  const n = P.moves[k].length;
  console.log(`  ${k.padEnd(9)} ${n}`);
  if (n < 20) { console.log('TOO FEW', k); bad++; }
  for (const it of P.moves[k].slice(0, 40)) {
    const m = itemMove(it);
    if (!m || !classify(m).includes(k)) { console.log('BAD ITEM', k, it); bad++; }
  }
}
console.log(`  lines     ${P.lines.length}`);
if (P.lines.length < 20) { console.log('TOO FEW lines'); bad++; }
console.log(`pool built in ${ms} ms`);

// Every item's own SAN must be graded correct.
for (const k of casesFor('write')) for (const it of P.moves[k].slice(0, 60)) {
  const m = itemMove(it);
  const r = check(it.fen, m.lan, m.san);
  if (!r.ok) { console.log('SAN NOT ACCEPTED', it, m.san, r.msg); bad++; break; }
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const cases = [
  // [fen, lan, input, expected ok, expected verdict, strict?]
  [START, 'g1f3', 'Nf3', true, 'correct'],
  [START, 'g1f3', 'nf3', false, 'notation'],
  [START, 'g1f3', 'Ng1f3', false, 'notation'],
  [START, 'g1f3', 'Ngf3', false, 'notation'],
  [START, 'g1f3', 'Nc3', false, 'different'],
  [START, 'g1f3', 'Nf4', false, 'illegal'],
  [START, 'e2e4', 'e4', true, 'correct'],
  [START, 'e2e4', 'Pe4', false, 'notation'],
  [START, 'e2e4', 'e2e4', false, 'notation'],
  [START, 'e2e4', '1. e4', true, 'correct'],
  [START, 'e2e4', 'e4!?', true, 'correct'],
  [START, 'e2e4', 'xyz', false, 'unreadable'],
  // captures: 1.e4 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'e4d5', 'exd5', true, 'correct'],
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'e4d5', 'ed5', false, 'notation'],
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'e4d5', 'ed5', true, 'correct', false],
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'e4d5', 'xd5', false, 'notation'],
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'e4e5', 'exe5', false, 'notation'],
  // b-pawn capture written lowercase: 1.b4 c5? position with b4 pawn able to take c5
  ['rnbqkbnr/pp1ppppp/8/2p5/1P6/8/P1PPPPPP/RNBQKBNR w KQkq c6 0 2', 'b4c5', 'bxc5', true, 'correct'],
  // castling
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', 'O-O', true, 'correct'],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', '0-0', true, 'correct'],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1c1', 'O-O-O', true, 'correct'],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1c1', 'O-O', false, 'different'],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', 'Kg1', false, 'notation'],
  // disambiguation: rooks a1,h1 → Rad1 / Rhd1? use knights b1,f3 → Nbd2 vs Nfd2
  ['4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1', 'b1d2', 'Nbd2', true, 'correct'],
  ['4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1', 'b1d2', 'Nd2', false, 'ambiguous'],
  ['4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1', 'b1d2', 'N1d2', false, 'notation'],
  ['4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1', 'b1d2', 'Nfd2', false, 'different'],
  ['4k3/8/8/8/8/R7/8/R3K3 w - - 0 1', 'a1a2', 'R1a2', true, 'correct'],
  // check & mate: scholar's mate position
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 'Qxf7#', true, 'correct'],
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 'Qxf7+', false, 'notation'],
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 'Qxf7', false, 'notation'],
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 'Qf7', true, 'correct', false],
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 'Qxf7++', true, 'correct'],
  // promotion
  ['8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8q', 'e8=Q', true, 'correct'],
  ['8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8q', 'e8Q', true, 'correct'],
  ['8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8q', 'e8', false, 'notation'],
  ['8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8n', 'e8=Q', false, 'different'],
  // en passant
  ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', 'e5d6', 'exd6', true, 'correct'],
  ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', 'e5d6', 'exd6 e.p.', true, 'correct'],
  ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', 'e5d6', 'exd5', false, 'illegal'],
];
for (const [fen, lan, input, ok, verdict, strict = true] of cases) {
  const r = check(fen, lan, input, { strict });
  const pass = r.ok === ok && r.verdict === verdict;
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${input.padEnd(10)} → ${r.verdict}${r.ok ? '' : ''}: ${r.msg}${r.tips.length ? ' | tips: ' + r.tips.join(' ') : ''}`);
}

const nb = numbered('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', ['Bb5', 'a6', 'Ba4']).map((x) => x.no + x.san).join(' ');
if (nb !== '3.Bb5 a6 4.Ba4') { console.log('NUMBERED', nb); bad++; }
const nb2 = numbered('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', ['a6', 'Ba4']).map((x) => x.no + x.san).join(' ');
if (nb2 !== '3...a6 4.Ba4') { console.log('NUMBERED', nb2); bad++; }
if (normalize('♘f3').s !== 'Nf3') { console.log('FIGURINE'); bad++; }

console.log(bad ? `${bad} problems` : 'notation trainer OK');
if (bad) process.exit(1);
