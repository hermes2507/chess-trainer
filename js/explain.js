// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Plain-language explanations of puzzle solutions.
//
// The puzzles come from engine self-play, so they carry no author's comment.
// This module looks at each move of the solution and says what it does, from
// facts it can check on the board: what it captures, whether it gives check
// and how many replies are left, which pieces it attacks (forks, discovered
// attacks), mate threats, sacrifices and promotions. It also explains the
// opponent's mistake that set up the puzzle and sums up what the line wins.
// The engine comparison ("why not another move?") is added by the view, since
// that needs the engine worker.
import { Chess } from '../vendor/chess.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const SIDE = { w: 'White', b: 'Black' };
const other = (c) => (c === 'w' ? 'b' : 'w');

const pieceAt = (c, sq) => { const p = c.get(sq); return p ? { ...p, square: sq } : null; };
const piecesOf = (c, color) => c.board().flat().filter((p) => p && p.color === color);
const material = (c, color) => piecesOf(c, color).reduce((s, p) => s + VAL[p.type], 0);
const kingSq = (c, color) => piecesOf(c, color).find((p) => p.type === 'k').square;
const minVal = (c, squares) => Math.min(...squares.map((s) => VAL[pieceAt(c, s).type] || 100));
/** "the knight on f6" */
const the = (p) => `the ${NAME[p.type]} on ${p.square}`;
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * Is the piece on `sq` in danger? True when the enemy attacks it and it has no
 * defender, or a cheaper enemy piece attacks it. Kings are never "hanging".
 */
function hanging(c, sq) {
  const p = pieceAt(c, sq);
  if (!p || p.type === 'k') return false;
  const att = c.attackers(sq, other(p.color));
  if (!att.length) return false;
  return !c.attackers(sq, p.color).length || minVal(c, att) < VAL[p.type];
}

/** Enemy pieces attacked from `from`, keeping only real targets (king, undefended, or worth more than the attacker). */
function targetsFrom(c, from) {
  const me = pieceAt(c, from);
  if (!me) return [];
  return piecesOf(c, other(me.color)).filter((q) => q.type !== 'p' && c.attackers(q.square, me.color).includes(from)
    && (q.type === 'k' || !c.attackers(q.square, q.color).length || VAL[q.type] > VAL[me.type]));
}

/**
 * FEN of the same position with the other side to move, or null if the side to
 * move is in check. Used to ask "what does this move threaten?".
 */
export function passTurnFen(fen) {
  const f = fen.split(' ');
  if (new Chess(fen).inCheck()) return null;
  f[1] = other(f[1]); f[3] = '-';
  return f.join(' ');
}

/** The same position with the other side to move (null if that would be illegal). */
function passTurn(c) {
  if (c.inCheck()) return null;
  const f = c.fen().split(' ');
  f[1] = other(f[1]); f[3] = '-';
  try { return new Chess(f.join(' '), { skipValidation: true }); } catch { return null; }
}

/** A checkmating move `color` would have if it could move again now, or null. */
function mateThreat(c, color) {
  const t = c.turn() === color ? new Chess(c.fen()) : passTurn(c);
  if (!t) return null;
  for (const m of t.moves({ verbose: true })) {
    t.move(m);
    const mate = t.isCheckmate();
    t.undo();
    if (mate) return m.san;
  }
  return null;
}

/** Name the mate pattern, if it is a well-known one. */
function matePattern(c, mv) {
  const loser = c.turn(), k = kingSq(c, loser);
  const backRank = loser === 'w' ? '1' : '8';
  if ((mv.piece === 'r' || mv.piece === 'q') && k[1] === backRank && mv.to[1] === backRank) {
    return 'a back-rank mate: the king is shut in by its own pieces on the last rank';
  }
  if (mv.piece === 'n') {
    const f = k.charCodeAt(0), r = +k[1];
    let boxed = true;
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const s = String.fromCharCode(f + df) + (r + dr);
      if (f + df < 97 || f + df > 104 || r + dr < 1 || r + dr > 8) continue;
      const q = pieceAt(c, s);
      if (!q || q.color !== loser) boxed = false;
    }
    if (boxed) return 'a smothered mate: the king is boxed in by its own pieces and only a knight can reach it';
  }
  return null;
}

/** Describe a material amount ("a pawn", "a rook (5 points)", "6 points of material"). */
function amount(n) {
  const words = { 1: 'a pawn', 2: 'two pawns', 3: 'a piece (about 3 points)', 5: 'a rook (5 points)', 9: 'a queen (9 points)' };
  return words[n] || `about ${n} points of material`;
}

const DIRS = { r: [[1, 0], [-1, 0], [0, 1], [0, -1]], b: [[1, 1], [1, -1], [-1, 1], [-1, -1]] };
DIRS.q = [...DIRS.r, ...DIRS.b];

/**
 * Pins and skewers by the slider on `from`: looking along each line, the first
 * enemy piece hit and the one right behind it.
 * Skewer: the front piece is the king or worth more, so it moves and exposes the back one.
 * Pin: the back piece is the king or worth more, so the front one cannot (or should not) move.
 */
function lines(c, from) {
  const me = pieceAt(c, from);
  if (!me || !DIRS[me.type]) return [];
  const out = [];
  for (const [df, dr] of DIRS[me.type]) {
    let f = from.charCodeAt(0) - 97, r = +from[1] - 1;
    const hit = [];
    while (hit.length < 2) {
      f += df; r += dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const p = pieceAt(c, String.fromCharCode(97 + f) + (r + 1));
      if (!p) continue;
      if (p.color === me.color) break;
      hit.push(p);
    }
    if (hit.length < 2) continue;
    const [front, back] = hit, v = (p) => (p.type === 'k' ? 100 : VAL[p.type]);
    if (back.type === 'p') continue;
    if (v(front) > v(back) && (back.type !== 'p') && (!c.attackers(back.square, back.color).length || v(back) > VAL[me.type])) out.push({ kind: 'skewer', front, back });
    else if (v(back) > v(front) && v(back) > VAL[me.type] && front.type !== 'k') out.push({ kind: 'pin', front, back });
  }
  return out;
}
const who = (p) => (p.type === 'k' ? 'the king' : the(p));

/** What the solver's move does. `before`/`after` are positions around `mv`. */
function describeOwn(before, after, mv, nextOpp) {
  const us = mv.color, them = other(us), out = [];
  const piece = NAME[mv.piece];
  const tags = [];

  if (after.isCheckmate()) {
    const pat = matePattern(after, mv);
    out.push(`Checkmate${pat ? `, ${pat}` : ''}.`);
    if (!pat) out.push(`${SIDE[them]}'s king is in check and has no safe square, no block and no capture of the checking piece.`);
    return { text: out, tags: ['mate'] };
  }

  if (before.inCheck()) {
    out.push(mv.piece === 'k' ? `${SIDE[us]} was in check; the king steps out of it.`
      : mv.captured && before.attackers(kingSq(before, us), them).includes(mv.to) ? `${SIDE[us]} was in check; this captures the checking piece.`
        : `${SIDE[us]} was in check; the ${piece} blocks it.`);
  }

  if (mv.captured) {
    const capt = { type: mv.captured, square: mv.flags.includes('e') ? mv.to[0] + mv.from[1] : mv.to };
    const defended = before.attackers(capt.square, them).length > 0;
    let s = `The ${piece} takes ${the(capt)}${mv.flags.includes('e') ? ' en passant' : ''}`;
    if (!defended) { s += ', which nobody was defending: free material.'; tags.push('free'); }
    else if (VAL[mv.captured] > VAL[mv.piece]) s += `. Even if ${SIDE[them]} takes back, a ${NAME[mv.captured]} is worth more than a ${piece}.`;
    else s += '.';
    out.push(s);
  }

  if (mv.promotion) {
    out.push(mv.promotion === 'q'
      ? 'The pawn reaches the last rank and becomes a queen.'
      : `The pawn promotes to a ${NAME[mv.promotion]} instead of a queen${after.inCheck() && mv.promotion === 'n' ? ': a knight gives check here, which a queen would not' : ''}.`);
  }

  const k = kingSq(after, them);
  const checkers = after.inCheck() ? after.attackers(k, us) : [];
  if (checkers.length) {
    const replies = after.moves().length;
    let s;
    if (checkers.length > 1) s = 'Double check: two pieces give check at once, so the king has to move.';
    else if (checkers[0] !== mv.to) s = `Discovered check: moving the ${piece} opens the line for ${the(pieceAt(after, checkers[0]))}.`;
    else s = 'Check.';
    s += replies === 1 ? ` ${SIDE[them]} has only one legal reply.` : ` ${SIDE[them]} has ${replies} legal replies, and has to deal with the check before anything else.`;
    out.push(s);
    tags.push('check');
  }

  // Sacrifice: the moved piece can be taken and it gives up material.
  const lost = VAL[mv.promotion || mv.piece] - VAL[mv.captured || 'k'];
  if (mv.piece !== 'k' && hanging(after, mv.to) && lost >= 2) {
    const taken = nextOpp && nextOpp.to === mv.to && nextOpp.captured;
    out.push(`This is a sacrifice: the ${NAME[mv.promotion || mv.piece]} on ${mv.to} can be taken${taken ? ', and it is' : ''}. What comes next is worth more than the piece.`);
    tags.push('sacrifice');
  }

  // Attacks made by the moved piece (forks) and by pieces it uncovered.
  const tg = targetsFrom(after, mv.to);
  const named = tg.map((q) => (q.type === 'k' ? 'the king' : the(q)));
  if (tg.length >= 2) {
    out.push(`Fork: the ${NAME[mv.promotion || mv.piece]} attacks ${list(named)} at the same time. ${SIDE[them]} cannot save everything.`);
    tags.push('fork');
  } else if (tg.length === 1 && tg[0].type !== 'k') {
    out.push(`It attacks ${named[0]}${after.attackers(tg[0].square, them).length ? '' : ', which is undefended'}.`);
  }
  const ln = lines(after, mv.to);
  for (const l of ln.slice(0, 1)) {
    out.push(l.kind === 'skewer'
      ? `Skewer: ${who(l.front)} is attacked along the line and has to move, leaving ${the(l.back)} behind it exposed.`
      : `Pin: ${the(l.front)} cannot move away without exposing ${who(l.back)} behind it${l.back.type === 'k' ? ' (that would be illegal)' : ''}.`);
    tags.push(l.kind);
  }
  const uncovered = [];
  for (const p of piecesOf(after, us)) {
    if (p.square === mv.to) continue;
    for (const q of targetsFrom(after, p.square)) {
      if (q.type === 'k') continue;
      if (!before.attackers(q.square, us).includes(p.square)) uncovered.push({ from: p.square, q });
    }
  }
  if (uncovered.length) {
    const u = uncovered[0];
    out.push(`It also opens a line: ${the(pieceAt(after, u.from))} now attacks ${the(u.q)}${uncovered.length > 1 ? ' (and more)' : ''}.`);
  }

  if (!checkers.length) {
    const threat = mateThreat(after, us);
    if (threat) { out.push(`It threatens ${threat}, checkmate, so ${SIDE[them]} has to spend the next move stopping it.`); tags.push('threat'); }
  }

  if (!out.length) out.push(`A quiet move: no capture and no check. It sets up the rest of the line, and the engine comparison below shows how much better it is than the alternatives.`);
  const arrows = [...tg.map((q) => ({ from: mv.to, to: q.square })), ...ln.slice(0, 1).map((l) => ({ from: mv.to, to: l.back.square })), ...uncovered.slice(0, 2).map((u) => ({ from: u.from, to: u.q.square }))];
  return { text: out, tags, arrows };
}

/** What the defender's reply inside the solution does. */
function describeReply(before, after, mv, prevOwn) {
  const out = [], side = SIDE[mv.color];
  const n = before.moves().length;
  if (n === 1) out.push(`Forced: it is ${side}'s only legal move.`);
  else if (before.inCheck()) {
    const how = mv.piece === 'k' ? 'moving the king' : mv.captured && prevOwn && mv.to === prevOwn.to ? 'capturing the checking piece' : 'blocking the check';
    out.push(`${side} gets out of check by ${how}.`);
  }
  if (mv.captured) {
    const accepted = prevOwn && mv.to === prevOwn.to;
    out.push(accepted ? `${side} takes the ${NAME[mv.captured]}${prevOwn.captured ? ' back' : ''}.` : `${side} takes ${the({ type: mv.captured, square: mv.to })}.`);
  } else if (before.attackers(mv.from, other(mv.color)).length && mv.piece !== 'k' && !before.inCheck()) {
    out.push(`${side} moves the attacked ${NAME[mv.piece]} away.`);
  }
  if (n > 1) out.push(`This is the engine's choice of defence for ${side}; it rates the other moves as worse.`);
  return { text: out, tags: [] };
}

/** Why the opponent's last move (the first move of the puzzle) was a mistake. */
function describeSetup(before, after, mv, solver, isMate, firstOwn) {
  const out = [], side = SIDE[mv.color];
  out.push(isMate
    ? `Before ${side}'s last move there was no forced mate. ${mv.san} was a mistake that allows one.`
    : `Before ${side}'s last move the game was roughly balanced (within about a pawn). ${mv.san} was a mistake that gives ${SIDE[solver]} a winning shot.`);
  const facts = [];
  if (hanging(after, mv.to)) facts.push(`${the(pieceAt(after, mv.to))} can now be taken`);
  for (const q of piecesOf(after, mv.color)) {
    if (q.square === mv.to || q.type === 'k') continue;
    if (before.attackers(q.square, mv.color).includes(mv.from) && !after.attackers(q.square, mv.color).length
      && after.attackers(q.square, solver).length) facts.push(`${the(q)} lost its defender`);
    else if (hanging(after, q.square) && !hanging(before, q.square)) facts.push(`${the(q)} is left hanging`);
  }
  const threat = mateThreat(after, solver);
  if (threat) facts.push(`${SIDE[solver]} now has ${threat}, checkmate`);
  if (facts.length) out.push(`After it, ${list(facts.slice(0, 3))}.`);
  else out.push(`It allows ${firstOwn}, explained in the next step.`);
  return { text: out, tags: [] };
}

/**
 * Explain a puzzle's solution.
 * @param {{fen: string, moves: string[], themes: string[]}} puzzle  `moves[0]` is the opponent's setup move.
 * @returns {{solver: 'w'|'b', summary: string, steps: Array<{
 *   kind: 'setup'|'own'|'reply', san: string, moveNo: string, fenBefore: string, fen: string,
 *   from: string, to: string, uci: string, text: string[], tags: string[], arrows: {from:string,to:string}[]}>}}
 */
export function explainPuzzle(puzzle) {
  const c = new Chess(puzzle.fen);
  const solver = other(c.turn());
  const played = [];
  for (const uci of puzzle.moves) {
    const fenBefore = c.fen();
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    played.push({ mv, uci, fenBefore, fen: c.fen() });
  }
  const isMate = new Chess(played[played.length - 1].fen).isCheckmate();
  const steps = played.map(({ mv, uci, fenBefore, fen }, i) => {
    const before = new Chess(fenBefore), after = new Chess(fen);
    const kind = i === 0 ? 'setup' : mv.color === solver ? 'own' : 'reply';
    const d = kind === 'setup' ? describeSetup(before, after, mv, solver, isMate, played[1]?.mv.san)
      : kind === 'own' ? describeOwn(before, after, mv, played[i + 1]?.mv)
        : describeReply(before, after, mv, played[i - 1].mv);
    const no = fenBefore.split(' ')[5];
    return {
      kind, san: mv.san, moveNo: mv.color === 'w' ? `${no}.` : `${no}...`, fenBefore, fen,
      from: mv.from, to: mv.to, uci, text: d.text, tags: d.tags, arrows: d.arrows || [],
    };
  });

  // Summary: mate, or the material the line wins once the dust settles.
  const start = new Chess(played[0].fen), end = new Chess(played[played.length - 1].fen);
  let summary;
  const ownMoves = steps.filter((s) => s.kind === 'own').length;
  if (isMate) {
    summary = `${SIDE[solver]} forces checkmate in ${ownMoves} move${ownMoves > 1 ? 's' : ''}. The engine found no defence that escapes.`;
  } else {
    const bal = (x) => material(x, solver) - material(x, other(solver));
    // The defender may be able to grab something back at once; subtract the best such capture.
    let back = 0;
    for (const m of end.moves({ verbose: true })) {
      if (!m.captured) continue;
      const defended = end.attackers(m.to, solver).length > 0;
      back = Math.max(back, VAL[m.captured] - (defended ? VAL[m.piece] : 0));
    }
    const net = bal(end) - bal(start) - back;
    const promo = steps.some((s) => s.kind === 'own' && /=/.test(s.san));
    summary = net > 0
      ? `The line wins ${amount(net)}${back ? `, counting what ${SIDE[other(solver)]} can take back at the end` : ''}.`
      : promo ? 'The line makes a new queen, which decides the game.'
        : `The gain here is not material yet: ${SIDE[solver]} ends up with a decisive position, according to the engine score below.`;
    if (net > 0 && steps.filter((s) => s.kind === 'own').at(-1).tags.includes('fork')) summary += ' The fork then wins more on the next move.';
  }
  return { solver, summary, steps };
}

/** Format an engine score ({score, mate} from the side to move) from `pov`'s view, e.g. "+3.2" or "mate in 2". */
export function fmtScore({ score, mate }, flip = false) {
  const m = flip ? -mate : mate, s = flip ? -score : score;
  if (m > 0) return `mate in ${m}`;
  if (m < 0) return `gets mated in ${-m}`;
  return `${s >= 0 ? '+' : '−'}${(Math.abs(s) / 100).toFixed(1)}`;
}

/** Convert a UCI line from `fen` to SAN with move numbers, e.g. "23...Qxe5 24.Rd8+". */
export function sanLine(fen, ucis, max = 4) {
  const c = new Chess(fen), out = [];
  for (const u of ucis.slice(0, max)) {
    const no = c.fen().split(' ')[5], turn = c.turn();
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    out.push(turn === 'w' ? `${no}.${mv.san}` : out.length ? mv.san : `${no}...${mv.san}`);
  }
  return out.join(' ');
}
