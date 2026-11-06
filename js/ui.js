// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Small DOM helpers shared by the views.
/** Escape text for safe insertion into HTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** querySelector shorthand. */
export const $ = (sel, root = document) => root.querySelector(sel);
/** querySelectorAll as an array. */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/** Promise that resolves after `ms` milliseconds. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** How long a wrong move stays on the board before it is taken back. */
export const WRONG_MOVE_MS = 1600;

/**
 * Wait `ms` so the player can see what happened on the board, or less if
 * they tap the board (`el`) to carry on sooner.
 */
export function holdBoard(el, ms = WRONG_MOVE_MS) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); el.removeEventListener('pointerdown', done); resolve(); };
    const t = setTimeout(done, ms);
    el.addEventListener('pointerdown', done);
  });
}

/** Red arrow for a move that was not the answer. */
export const wrongArrow = (from, to) => ({ from, to, color: 'var(--c-blunder)' });

/** Show a short message at the bottom of the screen. `kind`: '' | 'good' | 'bad'. */
export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3600);
}

/** Open a dialog with the given HTML. Elements with [data-close] or a backdrop click close it. Returns { el, close }. */
export function modal(html, { onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { wrap.remove(); onClose && onClose(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  document.body.appendChild(wrap);
  return { el: wrap.firstElementChild, close };
}

/** Display names and descriptions for puzzle themes. */
export const THEME_INFO = {
  mateIn1: { name: 'Mate in 1', desc: 'Find the checkmate in one move.' },
  mateIn2: { name: 'Mate in 2', desc: 'Deliver checkmate in two moves.' },
  mateIn3: { name: 'Mate in 3', desc: 'A forced mate in three moves.' },
  backRankMate: { name: 'Back-rank mate', desc: 'Checkmate a king trapped behind its own pawns.' },
  smotheredMate: { name: 'Smothered mate', desc: 'A knight mates a king boxed in by its own pieces.' },
  fork: { name: 'Fork', desc: 'One piece attacks two targets at once.' },
  hangingPiece: { name: 'Hanging piece', desc: 'Capture a piece left undefended.' },
  sacrifice: { name: 'Sacrifice', desc: 'Give up material for a bigger gain.' },
  promotion: { name: 'Promotion', desc: 'Push a pawn through to promote.' },
  winMaterial: { name: 'Win material', desc: 'Combinations that win material.' },
  opening: { name: 'Opening', desc: 'Tactics from the first moves.' },
  middlegame: { name: 'Middlegame', desc: 'Tactics with many pieces on the board.' },
  endgame: { name: 'Endgame', desc: 'Tactics with few pieces left.' },
  oneMove: { name: 'One-move', desc: 'Puzzles solved in a single move.' },
  long: { name: 'Long puzzles', desc: 'Three or more moves of calculation.' },
  mate: { name: 'Checkmate', desc: 'Any forced mating pattern.' },
};

/** Small SVG line chart of `values` (rating history). */
export function sparkline(values, { w = 320, h = 80 } = {}) {
  if (values.length < 2) return '<div class="muted small">Not enough data yet.</div>';
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(1, max - min);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 8) + 4},${h - 6 - ((v - min) / span) * (h - 12)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Rating trend from ${values[0]} to ${values[values.length - 1]}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="4" y="12" class="spark-l">${max}</text><text x="4" y="${h - 2}" class="spark-l">${min}</text></svg>`;
}

// Tell the player how a new measurement moved their skill rating.
export function announceRating(ev) {
  if (!ev) return;
  if (ev.before == null) { toast(`Skill rating set: ${ev.after}`, 'good'); return; }
  const d = ev.after - ev.before;
  let msg = `Skill rating ${ev.after} (${d >= 0 ? '+' : ''}${d}) from ${ev.src === 'puzzles' ? 'your last 10 rated puzzles' : 'this game'}`;
  if (ev.tierUp) msg = `🎉 Level up! ${msg}`;
  toast(msg, ev.tierUp || d > 0 ? 'good' : '');
}

/** Board colour schemes selectable on the Profile page. */
export const BOARD_THEMES = {
  harbor: { name: 'Harbor', light: '#e4e9f0', dark: '#6b84a3' },
  green: { name: 'Sage', light: '#e3e8d9', dark: '#7f9a78' },
  brown: { name: 'Wood', light: '#f0d9b5', dark: '#b58863' },
  blue: { name: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  purple: { name: 'Purple', light: '#e9e4f2', dark: '#8877b7' },
  gray: { name: 'Slate', light: '#e3e3e3', dark: '#8b8f94' },
};

/** Apply user settings (board colours) to the page via CSS variables. */
export function applySettings(settings) {
  const t = BOARD_THEMES[settings.boardTheme] || BOARD_THEMES.harbor;
  document.documentElement.style.setProperty('--sq-light', t.light);
  document.documentElement.style.setProperty('--sq-dark', t.dark);
}
