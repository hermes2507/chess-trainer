// Compact 0x88 chess engine: move generation, evaluation and alpha-beta search.
// Shared by the browser Web Worker and the Node puzzle-generation tools.

export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
export const WHITE = 0, BLACK = 8;
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const MATE = 100000;
const INF = 1000000;

const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8, F_PROMO = 16;

const N_OFF = [33, 31, 18, 14, -33, -31, -18, -14];
const K_OFF = [1, -1, 16, -16, 15, 17, -15, -17];
const B_DIR = [15, 17, -15, -17];
const R_DIR = [1, -1, 16, -16];
const Q_DIR = [...B_DIR, ...R_DIR];

export const VALUE = [0, 100, 320, 330, 500, 900, 20000];

export const sqName = (sq) => 'abcdefgh'[sq & 7] + ((sq >> 4) + 1);
export const sqFrom = (s) => (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97);

export const mFrom = (m) => m & 0xff;
export const mTo = (m) => (m >> 8) & 0xff;
export const mPromo = (m) => (m >> 16) & 0xf;
export const mFlags = (m) => (m >> 20) & 0xff;
const mk = (from, to, promo, flags) => from | (to << 8) | (promo << 16) | (flags << 20);

// ---------- Zobrist keys (two 32-bit halves) ----------
let seed = 0x2545f491;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed | 0;
}
const ZP_LO = new Int32Array(16 * 128), ZP_HI = new Int32Array(16 * 128);
for (let i = 0; i < ZP_LO.length; i++) { ZP_LO[i] = rnd(); ZP_HI[i] = rnd(); }
const ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
for (let i = 0; i < 16; i++) { ZC_LO[i] = rnd(); ZC_HI[i] = rnd(); }
const ZE_LO = new Int32Array(8), ZE_HI = new Int32Array(8);
for (let i = 0; i < 8; i++) { ZE_LO[i] = rnd(); ZE_HI[i] = rnd(); }
const ZS_LO = rnd(), ZS_HI = rnd();

const CMASK = new Int8Array(128).fill(15);
CMASK[0] = 13; CMASK[4] = 12; CMASK[7] = 14;
CMASK[112] = 7; CMASK[116] = 3; CMASK[119] = 11;

// ---------- Piece-square tables (printed from rank 8 down to rank 1) ----------
const PST_SRC = {
  [PAWN]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0],
  [KNIGHT]: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50],
  [BISHOP]: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20],
  [ROOK]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0],
  [QUEEN]: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20],
  [KING]: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20],
};
const KING_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50];

// PST[piece][sq] in 0x88 indexing, from that piece's own perspective, material included
const PST_MG = [], PST_EG = [];
for (let p = 0; p < 16; p++) { PST_MG.push(new Int16Array(128)); PST_EG.push(new Int16Array(128)); }
for (let t = PAWN; t <= KING; t++) {
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const wIdx = (7 - r) * 8 + f, bIdx = r * 8 + f, sq = r * 16 + f;
    const mgW = PST_SRC[t][wIdx], mgB = PST_SRC[t][bIdx];
    const egW = t === KING ? KING_EG[wIdx] : mgW, egB = t === KING ? KING_EG[bIdx] : mgB;
    const v = t === KING ? 0 : VALUE[t];
    const egV = t === PAWN ? 120 : v;
    PST_MG[WHITE | t][sq] = v + mgW; PST_EG[WHITE | t][sq] = egV + egW;
    PST_MG[BLACK | t][sq] = v + mgB; PST_EG[BLACK | t][sq] = egV + egB;
  }
}
const PHASE_W = [0, 0, 1, 1, 2, 4, 0];
const PASSED = [0, 10, 15, 25, 45, 75, 120, 0];

export class Position {
  constructor(fen = START_FEN) {
    this.b = new Int8Array(128);
    this.king = [0, 0];
    this.stack = [];
    this.hist = [];
    this.load(fen);
  }

  load(fen) {
    const parts = fen.trim().split(/\s+/);
    const [pl, side = 'w', cast = '-', ep = '-', hm = '0', fm = '1'] = parts;
    this.b.fill(0);
    let r = 7, f = 0;
    for (const ch of pl) {
      if (ch === '/') { r--; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const lower = ch.toLowerCase();
      const t = 'pnbrqk'.indexOf(lower) + 1;
      const c = ch === lower ? BLACK : WHITE;
      const sq = r * 16 + f;
      this.b[sq] = c | t;
      if (t === KING) this.king[c >> 3] = sq;
      f++;
    }
    this.side = side === 'b' ? BLACK : WHITE;
    this.castle = (cast.includes('K') ? 1 : 0) | (cast.includes('Q') ? 2 : 0) |
      (cast.includes('k') ? 4 : 0) | (cast.includes('q') ? 8 : 0);
    this.ep = ep !== '-' ? sqFrom(ep) : -1;
    this.half = +hm || 0;
    this.full = +fm || 1;
    this.stack = [];
    this.hist = [];
    this.computeHash();
  }

  computeHash() {
    let lo = 0, hi = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.b[sq];
      if (p) { lo ^= ZP_LO[p * 128 + sq]; hi ^= ZP_HI[p * 128 + sq]; }
    }
    lo ^= ZC_LO[this.castle]; hi ^= ZC_HI[this.castle];
    if (this.ep !== -1) { lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7]; }
    if (this.side === BLACK) { lo ^= ZS_LO; hi ^= ZS_HI; }
    this.hlo = lo; this.hhi = hi;
  }

  fen() {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.b[r * 16 + f];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        const ch = ' pnbrqk'[p & 7];
        s += p & 8 ? ch : ch.toUpperCase();
      }
      if (empty) s += empty;
      if (r) s += '/';
    }
    let c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') +
      (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return `${s} ${this.side ? 'b' : 'w'} ${c || '-'} ${this.ep === -1 ? '-' : sqName(this.ep)} ${this.half} ${this.full}`;
  }

  attacked(sq, by) {
    const b = this.b;
    if (by === WHITE) {
      let s = sq - 15; if (!(s & 0x88) && b[s] === (WHITE | PAWN)) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === (WHITE | PAWN)) return true;
    } else {
      let s = sq + 15; if (!(s & 0x88) && b[s] === (BLACK | PAWN)) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === (BLACK | PAWN)) return true;
    }
    const kn = by | KNIGHT, kg = by | KING;
    for (let i = 0; i < 8; i++) {
      let s = sq + N_OFF[i]; if (!(s & 0x88) && b[s] === kn) return true;
      s = sq + K_OFF[i]; if (!(s & 0x88) && b[s] === kg) return true;
    }
    const bq = by | QUEEN, bb = by | BISHOP, br = by | ROOK;
    for (let i = 0; i < 4; i++) {
      let d = B_DIR[i], s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === bb || p === bq) return true; break; }
        s += d;
      }
      d = R_DIR[i]; s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === br || p === bq) return true; break; }
        s += d;
      }
    }
    return false;
  }

  inCheck(side = this.side) { return this.attacked(this.king[side >> 3], side ^ 8); }

  gen(capsOnly = false) {
    const moves = [];
    const b = this.b, us = this.side, them = us ^ 8;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p || (p & 8) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us === WHITE ? 16 : -16;
        const r = sq >> 4;
        const startRank = us === WHITE ? 1 : 6, promoRank = us === WHITE ? 6 : 1;
        const to = sq + dir;
        if (!b[to] && (!capsOnly || r === promoRank)) {
          if (r === promoRank) {
            moves.push(mk(sq, to, QUEEN, F_PROMO));
            if (!capsOnly) {
              moves.push(mk(sq, to, ROOK, F_PROMO), mk(sq, to, BISHOP, F_PROMO), mk(sq, to, KNIGHT, F_PROMO));
            }
          } else {
            moves.push(mk(sq, to, 0, 0));
            if (r === startRank && !b[to + dir]) moves.push(mk(sq, to + dir, 0, F_DOUBLE));
          }
        }
        for (let k = -1; k <= 1; k += 2) {
          const c = to + k;
          if (c & 0x88) continue;
          const q = b[c];
          if (q && (q & 8) === them) {
            if (r === promoRank) {
              moves.push(mk(sq, c, QUEEN, F_PROMO | F_CAP));
              if (!capsOnly) {
                moves.push(mk(sq, c, ROOK, F_PROMO | F_CAP), mk(sq, c, BISHOP, F_PROMO | F_CAP), mk(sq, c, KNIGHT, F_PROMO | F_CAP));
              }
            } else moves.push(mk(sq, c, 0, F_CAP));
          } else if (c === this.ep && !q) {
            moves.push(mk(sq, c, 0, F_CAP | F_EP));
          }
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? N_OFF : K_OFF;
        for (let i = 0; i < 8; i++) {
          const to = sq + offs[i];
          if (to & 0x88) continue;
          const q = b[to];
          if (!q) { if (!capsOnly) moves.push(mk(sq, to, 0, 0)); }
          else if ((q & 8) === them) moves.push(mk(sq, to, 0, F_CAP));
        }
        if (t === KING && !capsOnly && this.castle) {
          if (us === WHITE && sq === 4) {
            if ((this.castle & 1) && !b[5] && !b[6] && b[7] === (WHITE | ROOK) &&
              !this.attacked(4, them) && !this.attacked(5, them) && !this.attacked(6, them)) moves.push(mk(4, 6, 0, F_CASTLE));
            if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === (WHITE | ROOK) &&
              !this.attacked(4, them) && !this.attacked(3, them) && !this.attacked(2, them)) moves.push(mk(4, 2, 0, F_CASTLE));
          } else if (us === BLACK && sq === 116) {
            if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (BLACK | ROOK) &&
              !this.attacked(116, them) && !this.attacked(117, them) && !this.attacked(118, them)) moves.push(mk(116, 118, 0, F_CASTLE));
            if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (BLACK | ROOK) &&
              !this.attacked(116, them) && !this.attacked(115, them) && !this.attacked(114, them)) moves.push(mk(116, 114, 0, F_CASTLE));
          }
        }
      } else {
        const dirs = t === BISHOP ? B_DIR : t === ROOK ? R_DIR : Q_DIR;
        for (let i = 0; i < dirs.length; i++) {
          const d = dirs[i];
          let to = sq + d;
          while (!(to & 0x88)) {
            const q = b[to];
            if (!q) { if (!capsOnly) moves.push(mk(sq, to, 0, 0)); }
            else { if ((q & 8) === them) moves.push(mk(sq, to, 0, F_CAP)); break; }
            to += d;
          }
        }
      }
    }
    return moves;
  }

  make(m) {
    const b = this.b;
    const from = m & 0xff, to = (m >> 8) & 0xff, promo = (m >> 16) & 0xf, flags = (m >> 20) & 0xff;
    const us = this.side, them = us ^ 8, p = b[from];
    let capSq = to;
    if (flags & F_EP) capSq = us === WHITE ? to - 16 : to + 16;
    const cap = b[capSq];
    this.stack.push(m, cap, this.castle, this.ep, this.half, this.hlo, this.hhi);
    this.hist.push(this.hlo);
    let lo = this.hlo, hi = this.hhi;
    lo ^= ZP_LO[p * 128 + from]; hi ^= ZP_HI[p * 128 + from];
    if (cap) { lo ^= ZP_LO[cap * 128 + capSq]; hi ^= ZP_HI[cap * 128 + capSq]; b[capSq] = 0; }
    b[from] = 0;
    const np = promo ? (us | promo) : p;
    b[to] = np;
    lo ^= ZP_LO[np * 128 + to]; hi ^= ZP_HI[np * 128 + to];
    if (flags & F_CASTLE) {
      let rf, rt;
      if (to === 6) { rf = 7; rt = 5; } else if (to === 2) { rf = 0; rt = 3; }
      else if (to === 118) { rf = 119; rt = 117; } else { rf = 112; rt = 115; }
      const rook = b[rf];
      b[rt] = rook; b[rf] = 0;
      lo ^= ZP_LO[rook * 128 + rf] ^ ZP_LO[rook * 128 + rt];
      hi ^= ZP_HI[rook * 128 + rf] ^ ZP_HI[rook * 128 + rt];
    }
    if ((p & 7) === KING) this.king[us >> 3] = to;
    lo ^= ZC_LO[this.castle]; hi ^= ZC_HI[this.castle];
    this.castle &= CMASK[from] & CMASK[to];
    lo ^= ZC_LO[this.castle]; hi ^= ZC_HI[this.castle];
    if (this.ep !== -1) { lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7]; }
    this.ep = (flags & F_DOUBLE) ? (from + to) >> 1 : -1;
    if (this.ep !== -1) { lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7]; }
    this.half = ((p & 7) === PAWN || cap) ? 0 : this.half + 1;
    if (us === BLACK) this.full++;
    this.side = them;
    lo ^= ZS_LO; hi ^= ZS_HI;
    this.hlo = lo; this.hhi = hi;
    if (this.attacked(this.king[us >> 3], them)) { this.unmake(); return false; }
    return true;
  }

  unmake() {
    const st = this.stack, n = st.length, b = this.b;
    const m = st[n - 7], cap = st[n - 6];
    this.castle = st[n - 5]; this.ep = st[n - 4]; this.half = st[n - 3];
    this.hlo = st[n - 2]; this.hhi = st[n - 1];
    st.length = n - 7;
    this.hist.pop();
    const from = m & 0xff, to = (m >> 8) & 0xff, promo = (m >> 16) & 0xf, flags = (m >> 20) & 0xff;
    this.side ^= 8;
    const us = this.side;
    if (us === BLACK) this.full--;
    const p = promo ? (us | PAWN) : b[to];
    b[from] = p;
    b[to] = 0;
    if (flags & F_EP) b[us === WHITE ? to - 16 : to + 16] = cap;
    else if (cap) b[to] = cap;
    if (flags & F_CASTLE) {
      let rf, rt;
      if (to === 6) { rf = 7; rt = 5; } else if (to === 2) { rf = 0; rt = 3; }
      else if (to === 118) { rf = 119; rt = 117; } else { rf = 112; rt = 115; }
      b[rf] = b[rt]; b[rt] = 0;
    }
    if ((p & 7) === KING) this.king[us >> 3] = from;
  }

  legalMoves() {
    const out = [];
    for (const m of this.gen(false)) if (this.make(m)) { this.unmake(); out.push(m); }
    return out;
  }

  isRepetition() {
    const h = this.hist, n = h.length;
    const lim = Math.max(0, n - this.half);
    for (let i = n - 4; i >= lim; i -= 2) if (h[i] === this.hlo) return true;
    return false;
  }

  insufficientMaterial() {
    let minors = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const t = this.b[sq] & 7;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (t === KNIGHT || t === BISHOP) minors++;
    }
    return minors <= 1;
  }

  toUci(m) {
    const promo = mPromo(m);
    return sqName(mFrom(m)) + sqName(mTo(m)) + (promo ? ' pnbrqk'[promo] : '');
  }

  fromUci(uci) {
    const from = sqFrom(uci.slice(0, 2)), to = sqFrom(uci.slice(2, 4));
    const promo = uci[4] ? 'pnbrqk'.indexOf(uci[4]) + 1 : 0;
    for (const m of this.legalMoves()) {
      if (mFrom(m) === from && mTo(m) === to && mPromo(m) === promo) return m;
    }
    return 0;
  }

  // ---------- evaluation (side-to-move perspective) ----------
  evaluate() {
    const b = this.b;
    let mg = 0, eg = 0, phase = 0;
    let wB = 0, bB = 0;
    const wMin = [9, 9, 9, 9, 9, 9, 9, 9, 9, 9], bMax = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    const wCnt = new Int8Array(10), bCnt = new Int8Array(10);
    const wMax = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1], bMin = [9, 9, 9, 9, 9, 9, 9, 9, 9, 9];
    const rooks = [];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p) continue;
      const t = p & 7;
      phase += PHASE_W[t];
      if (p & 8) {
        mg -= PST_MG[p][sq]; eg -= PST_EG[p][sq];
        if (t === PAWN) {
          const f = (sq & 7) + 1, r = sq >> 4;
          bCnt[f]++; if (r > bMax[f]) bMax[f] = r; if (r < bMin[f]) bMin[f] = r;
        } else if (t === BISHOP) bB++;
        else if (t === ROOK) rooks.push(sq);
      } else {
        mg += PST_MG[p][sq]; eg += PST_EG[p][sq];
        if (t === PAWN) {
          const f = (sq & 7) + 1, r = sq >> 4;
          wCnt[f]++; if (r < wMin[f]) wMin[f] = r; if (r > wMax[f]) wMax[f] = r;
        } else if (t === BISHOP) wB++;
        else if (t === ROOK) rooks.push(sq);
      }
    }
    let ps = 0, pe = 0;
    for (let f = 1; f <= 8; f++) {
      if (wCnt[f]) {
        if (wCnt[f] > 1) { ps -= 10 * (wCnt[f] - 1); pe -= 20 * (wCnt[f] - 1); }
        if (!wCnt[f - 1] && !wCnt[f + 1]) { ps -= 12; pe -= 15; }
        const r = wMax[f];
        if (bMax[f - 1] <= r && bMax[f] <= r && bMax[f + 1] <= r) { ps += PASSED[r] >> 1; pe += PASSED[r]; }
      }
      if (bCnt[f]) {
        if (bCnt[f] > 1) { ps += 10 * (bCnt[f] - 1); pe += 20 * (bCnt[f] - 1); }
        if (!bCnt[f - 1] && !bCnt[f + 1]) { ps += 12; pe += 15; }
        const r = bMin[f];
        if (wMin[f - 1] >= r && wMin[f] >= r && wMin[f + 1] >= r) { ps -= PASSED[7 - r] >> 1; pe -= PASSED[7 - r]; }
      }
    }
    for (const sq of rooks) {
      const f = (sq & 7) + 1, sign = b[sq] & 8 ? -1 : 1;
      const own = sign > 0 ? wCnt[f] : bCnt[f], opp = sign > 0 ? bCnt[f] : wCnt[f];
      if (!own) ps += sign * (opp ? 10 : 20);
    }
    mg += ps; eg += pe;
    if (wB >= 2) { mg += 30; eg += 45; }
    if (bB >= 2) { mg -= 30; eg -= 45; }
    if (phase > 24) phase = 24;
    let score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
    score = this.side === WHITE ? score : -score;
    return score + 10;
  }
}

// ---------- Search ----------
const TT_SIZE = 1 << 18, TT_MASK = TT_SIZE - 1;

export class Searcher {
  constructor() {
    this.ttKey = new Int32Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE);
    this.history = new Int32Array(128 * 128);
    this.killers = [];
    for (let i = 0; i < 128; i++) this.killers.push([0, 0]);
    this.pv = [];
    for (let i = 0; i < 128; i++) this.pv.push(new Int32Array(128));
    this.pvLen = new Int32Array(128);
  }

  orderScores(pos, moves, ply, ttm) {
    const b = pos.b, scores = new Int32Array(moves.length);
    const k = this.killers[ply];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (m === ttm) { scores[i] = 10000000; continue; }
      const flags = mFlags(m);
      let s = 0;
      if (flags & F_CAP) {
        const victim = flags & F_EP ? PAWN : (b[mTo(m)] & 7);
        s = 1000000 + VALUE[victim] * 10 - VALUE[b[mFrom(m)] & 7] / 10;
      } else if (m === k[0]) s = 900000;
      else if (m === k[1]) s = 800000;
      else s = this.history[mFrom(m) * 128 + mTo(m)];
      if (flags & F_PROMO) s += mPromo(m) === QUEEN ? 950000 : -500000;
      scores[i] = s;
    }
    return scores;
  }

  static pick(moves, scores, i) {
    let best = i;
    for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) {
      const tm = moves[i]; moves[i] = moves[best]; moves[best] = tm;
      const ts = scores[i]; scores[i] = scores[best]; scores[best] = ts;
    }
    return moves[i];
  }

  checkTime() {
    if ((++this.nodes & 1023) === 0) {
      if (Date.now() > this.deadline || this.nodes > this.maxNodes) this.stop = true;
    }
  }

  qsearch(pos, alpha, beta, ply) {
    this.checkTime();
    if (this.stop) return 0;
    this.pvLen[ply] = ply;
    const stand = pos.evaluate();
    if (ply >= 100) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const moves = pos.gen(true);
    const scores = this.orderScores(pos, moves, ply, 0);
    for (let i = 0; i < moves.length; i++) {
      const m = Searcher.pick(moves, scores, i);
      const flags = mFlags(m);
      if (!(flags & F_PROMO)) {
        const victim = flags & F_EP ? PAWN : (pos.b[mTo(m)] & 7);
        if (stand + VALUE[victim] + 200 < alpha) continue; // delta pruning
      }
      if (!pos.make(m)) continue;
      const score = -this.qsearch(pos, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(pos, depth, alpha, beta, ply) {
    this.checkTime();
    if (this.stop) return 0;
    this.pvLen[ply] = ply;
    if (ply > 0 && (pos.half >= 100 || pos.isRepetition() || pos.insufficientMaterial())) return 0;
    const inCheck = pos.inCheck();
    if (inCheck && ply < 60) depth++;
    if (depth <= 0) return this.qsearch(pos, alpha, beta, ply);
    // mate distance pruning
    const mateA = -MATE + ply, mateB = MATE - ply - 1;
    if (alpha < mateA) alpha = mateA;
    if (beta > mateB) beta = mateB;
    if (alpha >= beta) return alpha;

    const idx = pos.hlo & TT_MASK;
    const ttm = this.ttKey[idx] === pos.hhi ? this.ttMove[idx] : 0;
    const moves = pos.gen(false);
    const scores = this.orderScores(pos, moves, ply, ttm);
    let legal = 0, best = -INF, bestMove = 0;
    for (let i = 0; i < moves.length; i++) {
      const m = Searcher.pick(moves, scores, i);
      if (!pos.make(m)) continue;
      legal++;
      const score = -this.negamax(pos, depth - 1, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (score > best) {
        best = score; bestMove = m;
        if (score > alpha) {
          alpha = score;
          const pv = this.pv[ply], child = this.pv[ply + 1];
          pv[ply] = m;
          for (let j = ply + 1; j < this.pvLen[ply + 1]; j++) pv[j] = child[j];
          this.pvLen[ply] = Math.max(this.pvLen[ply + 1], ply + 1);
          if (alpha >= beta) {
            if (!(mFlags(m) & F_CAP)) {
              const k = this.killers[ply];
              if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
              this.history[mFrom(m) * 128 + mTo(m)] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    this.ttKey[idx] = pos.hhi; this.ttMove[idx] = bestMove;
    return best;
  }

  reset(timeMs, maxNodes) {
    this.nodes = 0; this.stop = false;
    this.deadline = Date.now() + timeMs;
    this.maxNodes = maxNodes;
    for (const k of this.killers) { k[0] = 0; k[1] = 0; }
    this.history.fill(0);
  }

  // Iterative deepening. Returns { move, score, depth, pv, nodes }.
  think(pos, { maxDepth = 6, timeMs = 1500, maxNodes = Infinity, minDepth = 1 } = {}) {
    this.reset(timeMs, maxNodes);
    let rootMoves = pos.legalMoves();
    if (!rootMoves.length) return { move: 0, score: pos.inCheck() ? -MATE : 0, depth: 0, pv: [], nodes: 0 };
    let result = { move: rootMoves[0], score: 0, depth: 0, pv: [rootMoves[0]] };
    const rootScores = new Map();
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -INF, best = -INF, bestMove = 0, bestPv = [];
      const iterScores = new Map();
      for (const m of rootMoves) {
        pos.make(m);
        const score = -this.negamax(pos, d - 1, -INF, -alpha, 1);
        pos.unmake();
        if (this.stop) break;
        iterScores.set(m, score);
        if (score > best) {
          best = score; bestMove = m;
          bestPv = [m];
          for (let j = 1; j < this.pvLen[1]; j++) bestPv.push(this.pv[1][j]);
          if (score > alpha) alpha = score;
        }
      }
      if (this.stop && d > minDepth) {
        // keep the partial result only if it already found a better move
        if (bestMove && best > result.score && bestMove !== result.move && iterScores.size > 1) {
          result = { move: bestMove, score: best, depth: d - 1, pv: bestPv };
        }
        break;
      }
      if (!bestMove) break;
      result = { move: bestMove, score: best, depth: d, pv: bestPv };
      for (const [m, s] of iterScores) rootScores.set(m, s);
      rootMoves = rootMoves.slice().sort((a, b) => (iterScores.get(b) ?? -INF) - (iterScores.get(a) ?? -INF));
      if (best >= MATE - d) break;
      if (this.stop) break;
    }
    result.nodes = this.nodes;
    return result;
  }

  // Exact score for every legal root move at a fixed depth (multi-PV style).
  scoreAll(pos, depth, timeMs = 5000) {
    this.reset(timeMs, Infinity);
    const out = [];
    for (const m of pos.legalMoves()) {
      pos.make(m);
      const score = -this.negamax(pos, depth - 1, -INF, INF, 1);
      pos.unmake();
      out.push({ move: m, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }
}

export function mateIn(score) {
  if (score >= MATE - 500) return Math.ceil((MATE - score) / 2);
  if (score <= -MATE + 500) return -Math.ceil((MATE + score) / 2);
  return 0;
}

export function perft(pos, depth) {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of pos.gen(false)) {
    if (!pos.make(m)) continue;
    n += perft(pos, depth - 1);
    pos.unmake();
  }
  return n;
}
