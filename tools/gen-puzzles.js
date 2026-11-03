// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Generates verified tactical puzzles from engine self-play.
// Usage: node tools/gen-puzzles.js <seconds> <outfile.jsonl>
import fs from 'node:fs';
import { Chess } from '../vendor/chess.js';
import {
  Position, Searcher, MATE, mateIn, mFrom, mTo, mFlags, mPromo, VALUE,
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
} from '../js/engine/core.js';
import { OPENINGS, parseLine } from '../js/data/openings.js';

const seconds = +process.argv[2] || 60;
const outFile = process.argv[3] || 'puzzles.jsonl';
const S = new Searcher();
const deadline = Date.now() + seconds * 1000;
const lines = OPENINGS.flatMap((o) => o.lines.map((l) => parseLine(l.moves).map((x) => x.san)));

function evalFen(fen, depth = 5, timeMs = 60) {
  const pos = new Position(fen);
  const r = S.think(pos, { maxDepth: depth, timeMs });
  return { score: r.score, mate: mateIn(r.score), move: r.move, pos };
}

function playGame() {
  const c = new Chess();
  if (Math.random() < 0.75) {
    const l = lines[Math.floor(Math.random() * lines.length)];
    const k = 2 + Math.floor(Math.random() * Math.min(l.length - 1, 12));
    for (const san of l.slice(0, k)) c.move(san);
  }
  const lo = +(process.env.ERR_MIN ?? 0.05), span = +(process.env.ERR_SPAN ?? 0.25);
  const err = [lo + Math.random() * span, lo + Math.random() * span];
  const fens = [c.fen()], moves = [null];
  for (let i = 0; i < 160 && !c.isGameOver(); i++) {
    const side = c.turn() === 'w' ? 0 : 1;
    const r = quickMove(c.fen(), err[side]);
    if (!r) break;
    c.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] });
    fens.push(c.fen()); moves.push(r.uci);
  }
  return { fens, moves };
}

// Fast self-play: mostly decent moves, with a per-side rate of sloppy ones.
function quickMove(fen, errRate) {
  const pos = new Position(fen);
  if (!pos.legalMoves().length) return null;
  if (Math.random() < errRate) {
    const sc = S.scoreAll(pos, 1, 500);
    const best = sc[0].score;
    const w = sc.map((x) => Math.exp(Math.max(-30, (x.score - best) / 120)));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < sc.length; i++) { r -= w[i]; if (r <= 0) return { uci: pos.toUci(sc[i].move) }; }
    return { uci: pos.toUci(sc[0].move) };
  }
  const r = S.think(pos, { maxDepth: 5, timeMs: 40 });
  return { uci: pos.toUci(r.move) };
}

function mateMoves(pos, n) {
  return S.scoreAll(pos, 2 * n - 1, 20000).filter((x) => x.score >= MATE - (2 * n - 1)).map((x) => x.move);
}

function buildMate(fen, n) {
  const pos = new Position(fen);
  if (n > 1 && mateMoves(pos, n - 1).length) return null;
  const line = [];
  for (let k = n; k >= 1; k--) {
    const mm = mateMoves(pos, k);
    if (k === 1) {
      if (mm.length < 1 || mm.length > 2) return null;
      line.push(pos.toUci(mm[0]));
      return line;
    }
    if (mm.length !== 1) return null;
    line.push(pos.toUci(mm[0])); pos.make(mm[0]);
    const def = S.scoreAll(pos, 2 * (k - 1), 20000);
    if (!def.length) return null;
    line.push(pos.toUci(def[0].move)); pos.make(def[0].move);
  }
  return null;
}

function buildTactic(fen) {
  const pos = new Position(fen);
  const line = [];
  for (let step = 0; step < 3; step++) {
    const sc = S.scoreAll(pos, 5, 15000);
    if (!sc.length) break;
    const best = sc[0], second = sc[1];
    if (best.score >= MATE - 100) {
      // turned into a mate; let the mate search handle it
      if (step === 0) return null;
    }
    let unique;
    if (step === 0) unique = best.score >= 250 && (!second || (second.score <= 100 && best.score - second.score >= 250));
    else unique = best.score >= 200 && (!second || best.score - second.score >= 220);
    if (!unique) {
      if (step === 0) return null;
      line.pop(); // drop the trailing opponent reply
      break;
    }
    line.push(pos.toUci(best.move)); pos.make(best.move);
    if (step === 2) break;
    const r = S.think(pos, { maxDepth: 7, timeMs: 300 });
    if (!r.move) break; // mate or stalemate ends the line
    line.push(pos.toUci(r.move)); pos.make(r.move);
  }
  if (line.length % 2 === 0) line.pop();
  return line.length ? line : null;
}

// ---------- themes & difficulty ----------
function attacksFrom(pos, sq) {
  const b = pos.b, p = b[sq], t = p & 7, out = [];
  const add = (s) => { if (!(s & 0x88)) out.push(s); };
  if (t === PAWN) { const d = p & 8 ? -16 : 16; add(sq + d - 1); add(sq + d + 1); }
  else if (t === KNIGHT || t === KING) {
    for (const o of t === KNIGHT ? [33, 31, 18, 14, -33, -31, -18, -14] : [1, -1, 16, -16, 15, 17, -15, -17]) add(sq + o);
  } else {
    const dirs = t === BISHOP ? [15, 17, -15, -17] : t === ROOK ? [1, -1, 16, -16] : [15, 17, -15, -17, 1, -1, 16, -16];
    for (const d of dirs) { let s = sq + d; while (!(s & 0x88)) { out.push(s); if (b[s]) break; s += d; } }
  }
  return out;
}

function detectThemes(fen, line, isMate, n) {
  const themes = new Set();
  const pos = new Position(fen);
  const us = pos.side, them = us ^ 8;
  let pieces = 0;
  for (let sq = 0; sq < 128; sq++) { if (sq & 0x88) { sq += 7; continue; } const t = pos.b[sq] & 7; if (t && t !== PAWN && t !== KING) pieces++; }
  if (pieces <= 4) themes.add('endgame'); else if (pos.full <= 14) themes.add('opening'); else themes.add('middlegame');

  const first = pos.fromUci(line[0]);
  const from = mFrom(first), to = mTo(first), flags = mFlags(first);
  const mover = pos.b[from] & 7;
  const captured = flags & 1 ? (flags & 2 ? PAWN : pos.b[to] & 7) : 0;
  const defended = pos.attacked(to, them);
  pos.make(first);
  const givesCheck = pos.inCheck();
  // sacrifice: lands on an attacked square giving up material
  if (pos.attacked(to, them) && VALUE[mover] - VALUE[captured] >= 200 && mover !== KING) themes.add('sacrifice');
  // fork
  if (!isMate || n > 1) {
    let targets = 0;
    for (const s of attacksFrom(pos, to)) {
      const q = pos.b[s];
      if (!q || (q & 8) !== them) continue;
      const qt = q & 7;
      if (qt === KING || (qt !== PAWN && (VALUE[qt] > VALUE[mover] || !pos.attacked(s, them)))) targets++;
    }
    if (targets >= 2 && !pos.attacked(to, them)) themes.add('fork');
  }
  pos.unmake();
  if (!isMate && line.length === 1 && captured && !defended) themes.add('hangingPiece');
  for (let i = 0; i < line.length; i += 2) if (line[i].length === 5) themes.add('promotion');

  // play the whole line for final-position themes
  const fp = new Position(fen);
  for (const u of line) fp.make(fp.fromUci(u));
  if (isMate) {
    themes.add('mate'); themes.add('mateIn' + n);
    const k = fp.king[fp.side >> 3], kr = k >> 4;
    const last = line[line.length - 1];
    const lastTo = (last.charCodeAt(3) - 49) * 16 + (last.charCodeAt(2) - 97);
    const lp = fp.b[lastTo] & 7;
    if ((kr === 0 || kr === 7) && (lp === ROOK || lp === QUEEN) && (lastTo >> 4) === kr) themes.add('backRankMate');
    if (lp === KNIGHT) {
      let boxed = true;
      for (const o of [1, -1, 16, -16, 15, 17, -15, -17]) { const s = k + o; if (!(s & 0x88) && (!fp.b[s] || (fp.b[s] & 8) !== fp.side)) boxed = false; }
      if (boxed) themes.add('smotheredMate');
    }
  } else if (!themes.has('fork') && !themes.has('hangingPiece')) themes.add('winMaterial');
  const userMoves = (line.length + 1) / 2;
  if (userMoves === 1) themes.add('oneMove'); else if (userMoves >= 3) themes.add('long');
  return { themes: [...themes], givesCheck, quiet: !captured && !givesCheck };
}

function minDepthToFind(fen, uci) {
  for (let d = 1; d <= 6; d++) {
    const pos = new Position(fen);
    const r = S.think(pos, { maxDepth: d, timeMs: 2000, minDepth: d });
    if (pos.toUci(r.move) === uci) return d;
  }
  return 7;
}

function rate(fen, line, isMate, n, info) {
  const userMoves = (line.length + 1) / 2;
  let r = isMate ? { 1: 700, 2: 1300, 3: 1750 }[n] : 1050 + 300 * (userMoves - 1);
  if (info.themes.includes('hangingPiece')) r = 720;
  if (info.quiet) r += 250;
  if (info.givesCheck && !(isMate && n === 1)) r -= 100;
  if (info.themes.includes('sacrifice')) r += 180;
  if (info.themes.includes('endgame')) r -= 40;
  const md = minDepthToFind(fen, line[0]);
  r += (md - (isMate ? 2 * n - 1 : 2)) * 110;
  r += Math.round((Math.random() - 0.5) * 160);
  return Math.max(400, Math.min(2600, Math.round(r / 5) * 5));
}

const out = fs.createWriteStream(outFile, { flags: 'a' });
const seen = new Set();
let games = 0, found = 0;
while (Date.now() < deadline) {
  const { fens, moves } = playGame();
  games++;
  let perGame = 0;
  for (let i = 8; i < fens.length - 1 && perGame < 3 && Date.now() < deadline; i++) {
    const before = fens[i], after = fens[i + 1];
    const key = after.split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) continue;
    const a = evalFen(after);
    let isMate = false, n = 0;
    if (a.mate > 0 && a.mate <= 3) { isMate = true; n = a.mate; }
    else if (!(a.score >= 280 && a.score < MATE - 1000)) continue;
    const b = evalFen(before);
    const userPrev = -b.score;
    if (b.mate < 0) continue; // opponent was already being mated
    if (isMate ? userPrev > 500 : userPrev > 120) continue;
    const line = isMate ? buildMate(after, n) : buildTactic(after);
    if (!line) continue;
    const info = detectThemes(after, line, isMate, n);
    const rating = rate(after, line, isMate, n, info);
    seen.add(key);
    out.write(JSON.stringify({ fen: before, moves: [moves[i + 1], ...line], rating, themes: info.themes }) + '\n');
    found++; perGame++;
    i += 3;
  }
}
out.end();
console.log(`games ${games}, puzzles ${found}`);
