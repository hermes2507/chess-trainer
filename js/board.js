// Interactive chessboard backed by a chess.js instance.
import { pieceSVG } from './pieces.js';
const FILES = 'abcdefgh';

export class Board {
  constructor(el, { orientation = 'w', onMove = null } = {}) {
    this.el = el;
    this.orientation = orientation;
    this.onMove = onMove;
    this.movable = null; // 'w' | 'b' | null
    this.game = null;
    this.lastMove = null;
    this.selected = null;
    this.marks = {};
    this.arrows = [];
    this.badge = null;
    el.classList.add('board');
    el.__board = this; // handy for debugging and automated tests
    el.innerHTML = `<div class="sq-layer"></div><div class="piece-layer"></div>
      <svg class="arrow-layer" viewBox="0 0 800 800" aria-hidden="true"></svg>
      <div class="badge-layer"></div><div class="promo-layer" hidden></div>`;
    this.sqLayer = el.querySelector('.sq-layer');
    this.pieceLayer = el.querySelector('.piece-layer');
    this.arrowLayer = el.querySelector('.arrow-layer');
    this.badgeLayer = el.querySelector('.badge-layer');
    this.promoLayer = el.querySelector('.promo-layer');
    el.addEventListener('pointerdown', (e) => this.down(e));
    this.moveH = (e) => this.dragMove(e);
    this.upH = (e) => this.up(e);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  destroy() {
    window.removeEventListener('pointermove', this.moveH);
    window.removeEventListener('pointerup', this.upH);
  }

  // ---------- geometry ----------
  xy(sq) {
    const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1;
    return this.orientation === 'w' ? [f, 7 - r] : [7 - f, r];
  }
  sqAt(col, row) {
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return this.orientation === 'w' ? FILES[col] + (8 - row) : FILES[7 - col] + (row + 1);
  }
  sqFromEvent(e) {
    const r = this.el.getBoundingClientRect();
    return this.sqAt(Math.floor((e.clientX - r.left) / (r.width / 8)), Math.floor((e.clientY - r.top) / (r.height / 8)));
  }

  // ---------- public API ----------
  setOrientation(o) { this.orientation = o; this.render(); }
  flip() { this.setOrientation(this.orientation === 'w' ? 'b' : 'w'); }
  setMovable(color) { this.movable = color; if (!color) this.selected = null; this.renderSquares(); }
  setMarks(marks = {}) { this.marks = marks; this.renderSquares(); }
  setArrows(arrows = []) { this.arrows = arrows; this.renderArrows(); }
  setBadge(badge = null) { this.badge = badge; this.renderBadge(); }

  set(game, { lastMove = null, animate = false } = {}) {
    this.game = game;
    this.lastMove = lastMove;
    this.selected = null;
    this.badge = null;
    this.hidePromo();
    this.render();
    if (animate && lastMove) this.animate(lastMove.from, lastMove.to);
  }

  render() {
    this.renderSquares();
    this.renderPieces();
    this.renderArrows();
    this.renderBadge();
  }

  renderSquares() {
    if (!this.game) return;
    const targets = new Map();
    if (this.selected) {
      for (const m of this.game.moves({ square: this.selected, verbose: true })) targets.set(m.to, !!m.captured);
    }
    let checkSq = null;
    if (this.game.inCheck()) {
      const turn = this.game.turn();
      for (const row of this.game.board()) for (const p of row) if (p && p.type === 'k' && p.color === turn) checkSq = p.square;
    }
    let html = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const sq = this.sqAt(col, row);
      const light = (sq.charCodeAt(0) - 97 + +sq[1]) % 2 === 0; // a1 is dark, h1 is light
      const cls = ['sq', light ? 'light' : 'dark'];
      if (this.lastMove && (sq === this.lastMove.from || sq === this.lastMove.to)) cls.push('last');
      if (sq === this.selected) cls.push('selected');
      if (sq === checkSq) cls.push('in-check');
      if (this.marks[sq]) cls.push('mark-' + this.marks[sq]);
      if (targets.has(sq)) cls.push(targets.get(sq) ? 'target-cap' : 'target');
      let coords = '';
      if (col === 0) coords += `<span class="coord rank">${sq[1]}</span>`;
      if (row === 7) coords += `<span class="coord file">${sq[0]}</span>`;
      html += `<div class="${cls.join(' ')}" style="left:${col * 12.5}%;top:${row * 12.5}%">${coords}</div>`;
    }
    this.sqLayer.innerHTML = html;
  }

  renderPieces() {
    if (!this.game) return;
    let html = '';
    for (const row of this.game.board()) for (const p of row) {
      if (!p) continue;
      const [c, r] = this.xy(p.square);
      html += `<div class="piece ${p.color}" data-sq="${p.square}" style="left:${c * 12.5}%;top:${r * 12.5}%">${pieceSVG(p.color, p.type)}</div>`;
    }
    this.pieceLayer.innerHTML = html;
  }

  renderArrows() {
    const center = (sq) => { const [c, r] = this.xy(sq); return [c * 100 + 50, r * 100 + 50]; };
    let defs = '', body = '';
    this.arrows.forEach((a, i) => {
      const [x1, y1] = center(a.from), [x2, y2] = center(a.to);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const ex = x2 - Math.cos(ang) * 28, ey = y2 - Math.sin(ang) * 28;
      const color = a.color || 'var(--arrow)';
      defs += `<marker id="ah${i}" markerWidth="4" markerHeight="4" refX="1.2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z" fill="${color}"/></marker>`;
      body += `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="16" stroke-linecap="round" marker-end="url(#ah${i})" opacity="0.85"/>`;
    });
    this.arrowLayer.innerHTML = `<defs>${defs}</defs>${body}`;
  }

  renderBadge() {
    if (!this.badge) { this.badgeLayer.innerHTML = ''; return; }
    const [c, r] = this.xy(this.badge.sq);
    this.badgeLayer.innerHTML = `<div class="sq-badge" style="left:calc(${(c + 1) * 12.5}% - 18px);top:calc(${r * 12.5}% - 10px);background:${this.badge.color}">${this.badge.text}</div>`;
  }

  animate(from, to) {
    const el = this.pieceLayer.querySelector(`[data-sq="${to}"]`);
    if (!el) return;
    const [c1, r1] = this.xy(from), [c2, r2] = this.xy(to);
    el.style.transition = 'none';
    el.style.transform = `translate(${(c1 - c2) * 100}%, ${(r1 - r2) * 100}%)`;
    void el.offsetWidth;
    el.style.transition = 'transform 160ms ease-out';
    el.style.transform = '';
  }

  // ---------- interaction ----------
  canMoveFrom(sq) {
    if (!this.game || !this.movable || this.game.turn() !== this.movable) return false;
    const p = this.game.get(sq);
    return !!p && p.color === this.movable;
  }

  down(e) {
    if (e.button !== 0 || !this.promoLayer.hidden) return;
    const sq = this.sqFromEvent(e);
    if (!sq) return;
    if (this.selected && this.selected !== sq && !this.canMoveFrom(sq)) {
      this.tryMove(this.selected, sq);
      return;
    }
    if (!this.canMoveFrom(sq)) { this.selected = null; this.renderSquares(); return; }
    e.preventDefault();
    this.selected = sq;
    this.renderSquares();
    const pieceEl = this.pieceLayer.querySelector(`[data-sq="${sq}"]`);
    if (!pieceEl) return;
    const ghost = pieceEl.cloneNode(true);
    ghost.classList.add('ghost');
    const rect = this.el.getBoundingClientRect();
    ghost.style.width = ghost.style.height = rect.width / 8 + 'px';
    this.el.appendChild(ghost);
    pieceEl.classList.add('dragging');
    this.drag = { from: sq, ghost, pieceEl, rect };
    this.positionGhost(e);
    window.addEventListener('pointermove', this.moveH);
    window.addEventListener('pointerup', this.upH);
  }

  positionGhost(e) {
    const { ghost, rect } = this.drag, s = rect.width / 8;
    ghost.style.left = e.clientX - rect.left - s / 2 + 'px';
    ghost.style.top = e.clientY - rect.top - s / 2 + 'px';
  }

  dragMove(e) { if (this.drag) this.positionGhost(e); }

  up(e) {
    window.removeEventListener('pointermove', this.moveH);
    window.removeEventListener('pointerup', this.upH);
    if (!this.drag) return;
    const { from, ghost, pieceEl } = this.drag;
    this.drag = null;
    ghost.remove();
    pieceEl.classList.remove('dragging');
    const to = this.sqFromEvent(e);
    if (to && to !== from) this.tryMove(from, to, true);
  }

  tryMove(from, to) {
    const moves = this.game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (!moves.length) {
      this.selected = this.canMoveFrom(to) ? to : null;
      this.renderSquares();
      return;
    }
    this.selected = null;
    if (moves.some((m) => m.promotion)) { this.showPromo(from, to); return; }
    this.onMove && this.onMove(from, to);
  }

  showPromo(from, to) {
    const color = this.game.turn();
    const [c] = this.xy(to);
    this.promoLayer.hidden = false;
    this.promoLayer.innerHTML = `<div class="promo-box" style="left:${c * 12.5}%">${['q', 'r', 'b', 'n']
      .map((t) => `<button class="piece ${color}" data-p="${t}">${pieceSVG(color, t)}</button>`).join('')}</div>`;
    this.promoLayer.onclick = (e) => {
      const b = e.target.closest('[data-p]');
      this.hidePromo();
      if (b) this.onMove && this.onMove(from, to, b.dataset.p);
      else this.renderSquares();
    };
  }

  hidePromo() { this.promoLayer.hidden = true; this.promoLayer.innerHTML = ''; }
}
