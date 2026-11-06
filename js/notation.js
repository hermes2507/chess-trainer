// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Notation trainer logic (no DOM): the cases taught, a pool of real positions
// grouped by case, a checker that grades written moves and explains mistakes,
// and plain-English descriptions of moves. The view lives in views/notation.js.
import { Chess } from '../vendor/chess.js';
import { PUZZLES } from './data/puzzles.js';
import { CLASSICS } from './data/classics.js';
import { OPENINGS, parseLine } from './data/openings.js';

export const FILES = 'abcdefgh';
export const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const COLOR_NAME = { w: 'White', b: 'Black' };

/**
 * The cases the trainer exercises. `tasks` says where a case appears:
 * 'write' (board → notation), 'read' (notation → board), 'squares'.
 */
export const CASES = {
  squares: {
    name: 'Squares', tasks: ['squares'], eg: 'e4',
    rule: 'Every square is its file (a–h) then its rank (1–8). Files run a→h from White\'s left; ranks count up from White\'s side. From Black\'s side the board is turned round: a1 is top-right.',
  },
  pawn: {
    name: 'Pawn moves', tasks: ['write', 'read'], eg: 'e4',
    rule: 'A pawn move is just the destination square, with no letter: e4, d5, h3.',
  },
  piece: {
    name: 'Piece moves', tasks: ['write', 'read'], eg: 'Nf3',
    rule: 'A piece move is the piece\'s capital letter plus the destination: K king, Q queen, R rook, B bishop, N knight (K is taken). Nf3, Bc4, Qd2.',
  },
  capture: {
    name: 'Captures', tasks: ['write', 'read'], eg: 'Bxf7',
    rule: 'A capture puts x before the destination: Bxf7, Qxd8. A pawn capture starts with the file the pawn leaves from: exd5, gxf6.',
  },
  check: {
    name: 'Check & mate', tasks: ['write', 'read'], eg: 'Qh5+',
    rule: 'Add + when the move gives check and # when it is checkmate: Bb5+, Qxf7#. They go at the very end.',
  },
  castle: {
    name: 'Castling', tasks: ['write', 'read'], eg: 'O-O',
    rule: 'O-O is kingside (short) castling, O-O-O queenside (long). Scoresheets often use zeros, 0-0 and 0-0-0; both mean the same.',
  },
  promo: {
    name: 'Promotion', tasks: ['write', 'read'], eg: 'e8=Q',
    rule: 'Write the pawn move, then = and the new piece: e8=Q, bxa1=N+. FIDE scoresheets may leave out the =, e8Q.',
  },
  ep: {
    name: 'En passant', tasks: ['write', 'read'], eg: 'exd6',
    rule: 'En passant is written like any pawn capture, to the square where the capturing pawn lands (not where the captured pawn stood): exd6. You may add "e.p.".',
  },
  disambig: {
    name: 'Which piece?', tasks: ['write', 'read'], eg: 'Nbd2',
    rule: 'When two pieces of the same kind can reach the square, add the file they leave from: Nbd2, Rfe1. If they share a file, use the rank: R1e3. Only if neither is enough, give the full square: Qh4e1.',
  },
  line: {
    name: 'Move numbers', tasks: ['read'], eg: '12...Nc6',
    rule: '"12." starts White\'s 12th move; "12..." means the next move is Black\'s. In 12. Nf3 Nc6 13. Bb5 each side moves in turn: White, Black, White.',
  },
};

export const casesFor = (task) => Object.keys(CASES).filter((k) => CASES[k].tasks.includes(task));

/** The cases a legal move (chess.js verbose move) illustrates. */
export const classify = (m) => classifySan(m.san, m.flags.includes('e') ? m.to : null);

/**
 * The cases a SAN move illustrates, from the text alone (fast: no move objects).
 * @param {string} san
 * @param {string|null} epSquare  the position's en passant square, if any
 */
export function classifySan(san, epSquare = null) {
  const cats = [];
  const pawn = /^[a-h]/.test(san), cap = san.includes('x'), promo = san.includes('=');
  const ep = pawn && cap && !!epSquare && san.slice(2, 4) === epSquare;
  if (san.startsWith('O-O')) cats.push('castle');
  else if (!cap) cats.push(pawn ? 'pawn' : 'piece');
  if (cap && !ep && !promo) cats.push('capture');
  if (/[+#]$/.test(san)) cats.push('check');
  if (promo) cats.push('promo');
  if (ep) cats.push('ep');
  if (disambiguator(san)) cats.push('disambig');
  return cats;
}

// The most specific case of a move: the one whose rule best explains its notation.
const PRIORITY = ['ep', 'promo', 'castle', 'disambig', 'check', 'capture', 'piece', 'pawn'];
export const primaryCase = (cats) => PRIORITY.find((c) => cats.includes(c)) || cats[0];

/** The "which piece" part of a SAN piece move: 'b' in Nbd2, '1' in R1e3, '' if none. */
export function disambiguator(san) {
  const m = san.match(/^[KQRBN]([a-h]?[1-8]?)x?[a-h][1-8]/);
  return m ? m[1] : '';
}

// ---------- position pool ----------
let POOL = null;
const CAP = 350; // items kept per case (reservoir sampled)

/**
 * Real positions from the puzzles, classic games and opening lines, with every
 * legal move grouped by case. Rare cases get extra positions: en passant is
 * found by trying pawn double-steps, promotions by advancing pawns already on
 * the seventh rank. Built once, on first use (a few hundred ms).
 * @returns {{ moves: Record<string, {fen: string, lan: string}[]>, lines: {fen: string, sans: string[]}[] }}
 */
export function pool() {
  if (POOL) return POOL;
  const moves = {}, seen = {};
  for (const k of casesFor('write')) { moves[k] = []; seen[k] = 0; }
  const lines = [];
  const fens = new Set();

  const add = (cat, item) => {
    const n = ++seen[cat], list = moves[cat];
    if (list.length < CAP) list.push(item);
    else { const j = Math.floor(Math.random() * n); if (j < CAP) list[j] = item; }
  };
  // Add every legal move of `fen` to its cases (`only`: just these cases).
  const scan = (c, only = null) => {
    const fen = c.fen();
    if (fens.has(fen)) return;
    fens.add(fen);
    const epSq = fen.split(' ')[3];
    const sans = c.moves();
    for (const san of sans) {
      for (const cat of classifySan(san, epSq !== '-' ? epSq : null)) if (!only || only.includes(cat)) add(cat, { fen, san });
    }
    if (only) return;
    // En passant is rare in real games: also look one ply ahead after each
    // pawn double-step that lands next to an enemy pawn.
    const turn = c.turn(), dir = turn === 'w' ? 1 : -1;
    for (const san of sans) {
      if (!/^[a-h][45]$/.test(san)) continue;
      const to = san, from = to[0] + (+to[1] - 2 * dir);
      const p = c.get(from);
      if (!p || p.type !== 'p' || c.get(to[0] + (+to[1] - dir))) continue;
      const fi = FILES.indexOf(to[0]);
      const adj = [fi - 1, fi + 1].filter((f) => f >= 0 && f < 8).some((f) => {
        const q = c.get(FILES[f] + to[1]);
        return q && q.type === 'p' && q.color !== turn;
      });
      if (!adj) continue;
      c.move(san);
      scan(c, ['ep']);
      c.undo();
    }
  };

  for (const p of PUZZLES) {
    const c = new Chess(p.fen);
    scan(c);
    for (const uci of p.moves) {
      try { c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { break; }
      scan(c);
    }
  }
  const games = [
    ...CLASSICS.map((g) => g.moves),
    ...OPENINGS.flatMap((o) => o.lines.map((l) => l.moves)),
  ];
  for (const text of games) {
    const sans = parseLine(text).map((x) => x.san);
    const c = new Chess();
    for (let i = 0; i < sans.length; i++) {
      scan(c);
      // A real three-move stretch for "move numbers" reading practice.
      if (i >= 4 && i + 3 <= sans.length && i % 3 === 1) lines.push({ fen: c.fen(), sans: sans.slice(i, i + 3) });
      try { c.move(sans[i]); } catch { break; }
    }
  }
  // Promotions are rare in real positions too: walk a pawn that's one step
  // short up to the seventh rank, let the other side make a quiet move, and
  // keep the promotions from there (the rest of the position stays real).
  for (const fen of fens) {
    if (moves.promo.length >= 150) break;
    const c = new Chess(fen);
    const push = c.moves().find((san) => /^[a-h][27]$/.test(san));
    if (!push) continue;
    c.move(push);
    const reply = c.moves().find((san) => /^[KQRBN][a-h1-8]*[1-8]$/.test(san) && !san.startsWith('K'));
    if (!reply) continue;
    c.move(reply);
    scan(c, ['promo']);
  }
  POOL = { moves, lines };
  return POOL;
}

/** The full chess.js move for a pool item ({fen, san}). */
export function itemMove(it) {
  return new Chess(it.fen).moves({ verbose: true }).find((m) => m.san === it.san);
}

// ---------- move numbers ----------
/** "12." or "12..." for the side to move in `fen`. */
export function moveNo(fen) {
  const [, turn, , , , full] = fen.split(' ');
  return turn === 'w' ? `${full}.` : `${full}...`;
}

/** A sequence of SAN moves from `fen` with move numbers: "12... Nc6 13. Bb5 a6". */
export function numbered(fen, sans) {
  const [, turn, , , , full] = fen.split(' ');
  let n = +full, white = turn === 'w', out = [];
  sans.forEach((s, i) => {
    if (white) out.push({ no: `${n}.`, san: s });
    else out.push({ no: i === 0 ? `${n}...` : '', san: s });
    if (!white) n++;
    white = !white;
  });
  return out;
}

// ---------- describing moves ----------
/** Plain-English description of a verbose move, explaining each part of its notation. */
export function describe(m) {
  const who = COLOR_NAME[m.color];
  const end = m.san.endsWith('#') ? ' It is checkmate (#).' : m.san.endsWith('+') ? ' It gives check (+).' : '';
  if (m.flags.includes('k') || m.flags.includes('q')) {
    const long = m.flags.includes('q');
    const r = m.color === 'w' ? '1' : '8';
    return `${who} castles ${long ? 'queenside (long)' : 'kingside (short)'}: king e${r}→${m.to}, rook ${long ? 'a' : 'h'}${r}→${long ? 'd' : 'f'}${r}.${end}`;
  }
  let s = `${who}'s ${PIECE_NAME[m.piece]} on ${m.from} `;
  if (m.flags.includes('e')) s += `captures en passant, landing on ${m.to}; the pawn on ${m.to[0]}${m.from[1]} is removed.`;
  else if (m.captured) s += `captures the ${PIECE_NAME[m.captured]} on ${m.to}.`;
  else s += `goes to ${m.to}.`;
  if (m.promotion) s += ` It promotes to a ${PIECE_NAME[m.promotion]} (=${m.promotion.toUpperCase()}).`;
  const d = disambiguator(m.san);
  if (d) s += ` Another ${PIECE_NAME[m.piece]} could also reach ${m.to}, so "${d}" (${d.length === 2 ? 'its square' : /\d/.test(d) ? 'its rank' : 'its file'}) says which one.`;
  else if (m.piece === 'p' && m.captured) s += ` A pawn capture starts with the pawn's file, "${m.from[0]}".`;
  return s + end;
}

// ---------- checking written notation ----------
const FIG = { '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N', '♚': 'K', '♛': 'Q', '♜': 'R', '♝': 'B', '♞': 'N', '♙': '', '♟': '' };

/** Tidy what the player typed: spaces, figurines, move numbers, "!?" marks, "e.p.", dashes. */
export function normalize(input) {
  let s = String(input || '').trim()
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, (c) => FIG[c])
    .replace(/[×]/g, 'x').replace(/[–—−]/g, '-')
    .replace(/^\d+\s*\.+\s*/, '')          // leading "12." or "12..."
    .replace(/\s+/g, '');
  const ep = /e\.?p\.?$/i.test(s) && /^[a-h]x?[a-h][36]/i.test(s);
  if (ep) s = s.replace(/e\.?p\.?$/i, '');
  s = s.replace(/[!?]+$/, '');
  return { s, ep };
}

const CASTLE_RE = /^([0O])-?\1(-?\1)?([+#]|\+\+)?$/i;
const MOVE_RE = /^([KQRBNPkqrnp])?([a-h])?([1-8])?(-|x|:)?([a-h][1-8])(=?([QRBNqrbn]))?([+#]|\+\+)?$/;

/**
 * Parse SAN-like text (permissive: long algebraic, lowercase letters, zeros…).
 * @returns {null | {castle: 'k'|'q', suffix: string, zeros: boolean} |
 *   {piece: string, upper: boolean, letterP: boolean, file: string, rank: string, sep: string, to: string, promo: string, eq: boolean, suffix: string}}
 */
export function parse(s) {
  const c = s.match(CASTLE_RE);
  if (c) return { castle: c[2] ? 'q' : 'k', suffix: c[3] || '', zeros: c[1] === '0' };
  const m = s.match(MOVE_RE);
  if (!m) return null;
  const [, letter = '', file = '', rank = '', sep = '', to, , promo = '', suffix = ''] = m;
  return {
    piece: letter ? letter.toLowerCase() : 'p', upper: !letter || letter === letter.toUpperCase(),
    letterP: letter.toLowerCase() === 'p', file, rank, sep, to, promo: promo.toLowerCase(), eq: !!m[6] && m[6][0] === '=', suffix,
  };
}

/**
 * Grade a written move against the correct one.
 * @param {string} fen      position before the move
 * @param {string} lan      the correct move, e.g. 'g1f3' (chess.js `lan`)
 * @param {string} input    what the player typed
 * @param {{strict?: boolean}} [opts]  strict = book notation: x, + and # are required.
 *   Without it, the FIDE scoresheet minimum is accepted (they are optional there).
 * @returns {{ok: boolean, verdict: 'correct'|'notation'|'different'|'ambiguous'|'illegal'|'unreadable',
 *   msg: string, tips: string[], move: object, played?: object}}
 *   `move` is the correct verbose move; `played` the move the input describes, if any.
 */
export function check(fen, lan, input, { strict = true } = {}) {
  const c = new Chess(fen);
  const legal = c.moves({ verbose: true });
  const move = legal.find((m) => m.lan === lan);
  const { s, ep } = normalize(input);
  const tips = [];
  const res = (ok, verdict, msg, played) => ({ ok, verdict, msg, tips, move, played });
  if (!s) return res(false, 'unreadable', 'Type the move in notation.');
  const p = parse(s);
  if (!p) return res(false, 'unreadable', `"${s}" isn't valid notation. Expected something like ${move.san}.`);

  // Which legal move does the text describe?
  let cands, q = p;
  const matchQ = (x) => {
    const list = legal.filter((m) => m.piece === x.piece && m.to === x.to &&
      (!x.file || m.from[0] === x.file) && (!x.rank || m.from[1] === x.rank) &&
      (!m.promotion || !x.promo || m.promotion === x.promo));
    // A bare "d5" is a pawn push; only read it as a capture if no push fits.
    if (x.piece === 'p' && !x.file && x.sep !== 'x' && list.some((m) => !m.captured)) return list.filter((m) => !m.captured);
    return list;
  };
  if (p.castle) cands = legal.filter((m) => m.flags.includes(p.castle));
  else {
    // A lowercase "b" is a file ("bxc3" = b-pawn takes) before it is a bishop.
    if (!p.upper && p.piece === 'b' && !p.file) {
      const asPawn = { ...p, piece: 'p', upper: true, file: 'b' };
      const pc = matchQ(asPawn);
      if (pc.length) q = asPawn;
    }
    cands = matchQ(q);
    // A king move to the castling square ("Kg1") describes castling.
    if (!cands.length && q.piece === 'k') cands = legal.filter((m) => (m.flags.includes('k') || m.flags.includes('q')) && m.to === q.to);
  }
  if (!cands.length) {
    if (p.castle) return res(false, 'illegal', `${p.castle === 'k' ? 'Kingside' : 'Queenside'} castling isn't legal here.`);
    const pc = PIECE_NAME[q.piece];
    const any = legal.some((m) => m.piece === q.piece && m.to === q.to);
    if (any && (p.file || p.rank)) return res(false, 'illegal', `No ${pc} on ${p.file || 'the'}${p.rank ? (p.file ? p.rank : `rank ${p.rank}`) : p.file ? '-file' : ''} can reach ${p.to}.`);
    if (!p.upper && p.piece !== 'p') return res(false, 'illegal', `Piece letters are capitals (${p.piece.toUpperCase()}); lowercase letters name files. No ${pc} can reach ${p.to} anyway.`);
    return res(false, 'illegal', `No ${pc} can move to ${p.to} in this position.`);
  }
  // Promotion piece missing.
  if (cands.every((m) => m.promotion) && !q.promo) {
    return res(false, 'notation', `The pawn promotes, so say to what: ${move.promotion ? move.san : `${cands[0].san.replace(/=.*/, '')}=Q`}.`, cands.find((m) => m.promotion === 'q'));
  }
  if (cands.length > 1) {
    const kind = PIECE_NAME[cands[0].piece];
    return res(false, 'ambiguous', cands[0].piece === 'p'
      ? `Two pawns can capture on ${p.to}. A pawn capture must start with the file the pawn leaves from.`
      : `Ambiguous: ${cands.length} ${kind}s can reach ${p.to} (${cands.map((m) => m.from).join(', ')}). Add the file (or rank) the ${kind} leaves from.`);
  }
  const played = cands[0];
  if (played.lan !== move.lan) {
    return res(false, 'different', `That's a different move: ${played.san}. ${describe(played)}`, played);
  }

  // Same move. Now check the form of the notation.
  const problems = [];
  const isCastle = move.flags.includes('k') || move.flags.includes('q');
  if (isCastle) {
    if (!p.castle) problems.push(`Castling is written ${move.san.replace(/[+#]$/, '')}, not as a king move.`);
    else if (p.zeros) tips.push('0-0 with zeros is fine on a scoresheet; books and PGN files use the letter O.');
  } else {
    const p = q;
    if (!p.upper && p.piece !== 'p') problems.push(`Piece letters are capitals: ${p.piece.toUpperCase()}, not ${p.piece}. Lowercase letters are files.`);
    if (p.letterP) problems.push('Pawns are written without a letter: no P.');
    const long = p.file && p.rank && !disambiguator(move.san).match(/^[a-h][1-8]$/);
    const want = move.piece === 'p' ? (move.captured ? move.from[0] : '') : disambiguator(move.san);
    const got = p.file + p.rank;
    if (long) problems.push(`That's long notation (from-square and to-square). Short notation names only the destination${want ? ` plus "${want}"` : ''}: ${move.san}.`);
    else if (got !== want) {
      if (move.piece === 'p' && move.captured && !got) problems.push(`A pawn capture starts with the file the pawn leaves from: ${move.san}.`);
      else if (move.piece === 'p') problems.push(`A pawn move that isn't a capture is just the destination square: ${move.san}.`);
      else if (!want) problems.push(`Only one ${PIECE_NAME[move.piece]} can reach ${move.to}, so don't add "${got}": ${move.san}.`);
      else problems.push(`Say which ${PIECE_NAME[move.piece]} with "${want}" (${want.length === 2 ? 'square' : /\d/.test(want) ? 'rank' : 'file'})${/\d/.test(got) && !/\d/.test(want) ? '; use the file whenever it is enough' : ''}: ${move.san}.`);
    }
    if (p.sep === '-') problems.push('No dash in short notation.');
    if (p.sep === ':') tips.push('":" for captures is old-fashioned; today it is "x".');
    if (p.sep === 'x' && !move.captured && move.piece !== 'p') problems.push(`It isn't a capture: no x. ${move.san}.`);
    const missingX = move.captured && p.sep !== 'x' && p.sep !== ':' && !long;
    if (missingX) {
      if (strict) problems.push(`It's a capture, so it needs an x: ${move.san}.`);
      else tips.push(`Books write the capture with x: ${move.san}.`);
    }
    if (move.promotion && !p.eq) tips.push(`FIDE scoresheets allow ${move.san.replace('=', '')}; books and PGN write ${move.san}.`);
    if (ep) tips.push('"e.p." is optional; most books leave it out.');
  }
  const wantSuf = (move.san.match(/[+#]$/) || [''])[0];
  const gotSuf = p.suffix === '++' ? '#' : p.suffix;
  if (p.suffix === '++' && wantSuf === '#') tips.push('"++" is an old way to write mate; today it is #.');
  if (gotSuf !== wantSuf) {
    if (!wantSuf) problems.push(`The move doesn't give check: no ${gotSuf}.`);
    else if (!gotSuf) {
      if (strict) problems.push(`The move gives ${wantSuf === '#' ? 'checkmate: end with #' : 'check: end with +'}. ${move.san}.`);
      else tips.push(`Books mark ${wantSuf === '#' ? 'mate with #' : 'check with +'}: ${move.san}.`);
    } else if (wantSuf === '#') problems.push(`It's checkmate, not just check: ${move.san}.`);
    else problems.push(`It's check, not mate: ${move.san}.`);
  }
  if (problems.length) return res(false, 'notation', `Right move, but ${problems[0][0].toLowerCase()}${problems[0].slice(1)}${problems.length > 1 ? ' ' + problems.slice(1).join(' ') : ''}`, played);
  return res(true, 'correct', `${move.san}. ${describe(move)}`, played);
}

/** Random square name. */
export const randomSquare = () => FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));

/**
 * The parts of a move's notation with what each one means, e.g. Nbxd2+ →
 * [['N','knight'], ['b','the one on the b-file'], ['x','captures'], ['d2','on d2'], ['+','check']].
 */
export function anatomy(m) {
  const parts = [], san = m.san;
  if (san.startsWith('O-O')) parts.push([san.replace(/[+#]$/, ''), san.startsWith('O-O-O') ? 'castles queenside' : 'castles kingside']);
  else {
    if (m.piece !== 'p') parts.push([m.piece.toUpperCase(), PIECE_NAME[m.piece]]);
    const d = m.piece === 'p' ? (m.captured ? m.from[0] : '') : disambiguator(san);
    if (d) parts.push([d, m.piece === 'p' ? `pawn from the ${d}-file` : d.length === 2 ? `the one on ${d}` : /\d/.test(d) ? `the one on rank ${d}` : `the one on the ${d}-file`]);
    if (m.captured) parts.push(['x', m.flags.includes('e') ? 'captures en passant' : 'captures']);
    parts.push([m.to, m.captured ? `on ${m.to}` : m.piece === 'p' ? `pawn to ${m.to}` : `to ${m.to}`]);
    if (m.promotion) parts.push([`=${m.promotion.toUpperCase()}`, `becomes a ${PIECE_NAME[m.promotion]}`]);
  }
  if (san.endsWith('#')) parts.push(['#', 'checkmate']);
  else if (san.endsWith('+')) parts.push(['+', 'check']);
  return parts;
}
