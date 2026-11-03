// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// App state. It autosaves to localStorage as a convenience, but the save file
// (see savefile.js) is the durable copy you can keep and load anywhere.
const KEY = 'chesstrainer.v1';

/** A brand-new, empty app state. This object is also the save-file schema. */
export const fresh = () => ({
  settings: { name: '', boardTheme: 'harbor' },
  meta: { createdAt: Date.now(), updatedAt: 0, savedAt: 0, saveName: '' },
  profile: {
    calibrated: false, rating: null, rd: 350, rdAt: null, margin: null,
    calibration: null, ratingHistory: [], events: [], puzzleBatch: [],
  },
  puzzle: { rating: 1000, count: 0, history: [], seen: {}, rushBest: 0, streak: 0, bestStreak: 0 },
  themes: {},
  openings: {},
  classics: {},
  games: [],
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* storage unavailable or corrupt */ }
  return fresh();
}

function deepMerge(base, extra) {
  for (const k of Object.keys(extra)) {
    const a = base[k], b = extra[k];
    if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) deepMerge(a, b);
    else base[k] = b;
  }
  return base;
}

// Bring data from older versions (or older save files) up to date.
export function migrate(data) {
  const s = deepMerge(fresh(), data || {});
  const p = s.profile;
  if (p.rating != null && (data.profile?.rd == null)) {
    p.rd = p.margin || 200;
    p.rdAt = Date.now();
  }
  if (p.rating == null) p.calibrated = false;
  return s;
}

const emit = () => listeners.forEach((fn) => fn(state));

/**
 * Global app store. Views read with `store.get()`, change state only inside
 * `store.update(fn)` (which autosaves and notifies), and listen with `subscribe`.
 */
export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  },
  // Every progress change goes through here, so it is tracked as unsaved.
  update(fn) {
    const out = fn(state);
    state.meta.updatedAt = Date.now();
    this.persist();
    emit();
    return out;
  },
  // Changes that should not count as unsaved progress (e.g. recording a save).
  updateMeta(fn) { fn(state.meta); this.persist(); emit(); },
  replace(data) { state = migrate(data); this.persist(); emit(); },
  reset() { state = fresh(); this.persist(); emit(); },
  hasProgress: () => state.profile.rating != null || state.puzzle.count > 0 || state.games.length > 0 ||
    Object.keys(state.openings).length > 0 || state.puzzle.rushBest > 0,
  isDirty: () => store.hasProgress() && state.meta.updatedAt > state.meta.savedAt,
};
