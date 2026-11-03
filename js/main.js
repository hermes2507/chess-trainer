// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// App entry point: hash router, top bar (save/load, rating chip), keyboard
// shortcuts and drag-and-drop loading. Each route renders a view into <main id="view">
// and may return a cleanup function that runs when the user navigates away.
import { homeView } from './views/home.js';
import { calibrateView, playSetupView, gameView } from './views/game.js';
import { puzzlesView, rushView, themesView } from './views/puzzles.js';
import { openingsView, courseView, trainerView } from './views/openings.js';
import { libraryView } from './views/library.js';
import { profileView } from './views/profile.js';
import { aboutView } from './views/about.js';
import { classicsView, classicGameView } from './views/classics.js';
import { resetEngine } from './engine/client.js';
import { store } from './store.js';
import { tierOf } from './rating.js';
import { currentRd } from './skill.js';
import { save, pickAndLoad, loadFile } from './savefile.js';
import { toast, applySettings } from './ui.js';

const root = document.getElementById('view');
let cleanup = null;

const routes = [
  [/^\/?(home)?$/, () => homeView(root), 'home'],
  [/^\/calibrate$/, () => calibrateView(root), 'calibrate'],
  [/^\/play$/, () => playSetupView(root), 'play'],
  [/^\/game$/, (m, q) => gameView(root, q), (q) => (q.get('mode') === 'play' ? 'play' : 'calibrate')],
  [/^\/puzzles$/, (m, q) => puzzlesView(root, q), 'puzzles'],
  [/^\/puzzles\/rush$/, () => rushView(root), 'puzzles'],
  [/^\/puzzles\/themes$/, () => themesView(root), 'puzzles'],
  [/^\/openings$/, (m, q) => openingsView(root, q), 'openings'],
  [/^\/openings\/([\w-]+)\/train$/, (m, q) => trainerView(root, m[1], q), 'openings'],
  [/^\/openings\/([\w-]+)$/, (m) => courseView(root, m[1]), 'openings'],
  [/^\/classics$/, (m, q) => classicsView(root, q), 'classics'],
  [/^\/classics\/([\w-]+)$/, (m, q) => classicGameView(root, m[1], q), 'classics'],
  [/^\/library$/, (m, q) => libraryView(root, q), 'library'],
  [/^\/profile$/, () => profileView(root), 'profile'],
  [/^\/about$/, () => aboutView(root), 'about'],
];

function route() {
  const raw = location.hash.replace(/^#/, '') || '/home';
  const [path, qs = ''] = raw.split('?');
  const q = new URLSearchParams(qs);
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  resetEngine();
  document.querySelectorAll('.modal-wrap').forEach((m) => m.remove());
  window.scrollTo(0, 0);
  for (const [re, fn, nav] of routes) {
    const m = path.match(re);
    if (!m) continue;
    const navId = typeof nav === 'function' ? nav(q) : nav;
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === navId));
    cleanup = fn(m, q) || null;
    updateBadge();
    return;
  }
  location.hash = '#/home';
}

function updateBadge() {
  const s = store.get();
  const el = document.getElementById('navRating');
  if (s.profile.rating) {
    const t = tierOf(s.profile.rating);
    el.innerHTML = `<span class="tier-dot" style="background:${t.color}"></span>${s.profile.rating}`;
    el.title = `${t.name} · skill rating ±${currentRd(s.profile)}`;
  } else el.innerHTML = '<span class="muted">Unrated</span>';
  const dirty = store.isDirty();
  const btn = document.getElementById('saveBtn');
  btn.querySelector('.unsaved-dot').hidden = !dirty;
  btn.title = dirty ? 'You have unsaved progress. Save it to a file.'
    : s.meta.saveName ? `Saved to ${s.meta.saveName}` : 'Save progress to a file';
}

async function doSave(opts) {
  try {
    const name = await save(opts);
    if (name) toast(`Progress saved to ${name}`, 'good');
  } catch (e) { toast(`Could not save: ${e.message}`, 'bad'); }
}

function confirmReplace() {
  return !store.hasProgress() || !store.isDirty() ||
    confirm('Loading a save file replaces your current progress, which has unsaved changes. Continue?');
}

function loaded(info) {
  if (!info) return;
  applySettings(store.get().settings);
  toast(`Loaded ${info.player ? `${info.player}'s ` : ''}progress from ${info.name}`, 'good');
  route();
}

async function doLoad() {
  if (!confirmReplace()) return;
  try { loaded(await pickAndLoad()); } catch (e) { toast(e.message, 'bad'); }
}

// Other modules can trigger these (e.g. buttons on the home and profile pages).
window.addEventListener('app:save', (e) => doSave(e.detail));
window.addEventListener('app:load', doLoad);
document.getElementById('saveBtn').onclick = () => doSave();
document.getElementById('loadBtn').onclick = doLoad;
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave({ saveAs: e.shiftKey }); }
});

// Drag a save file anywhere onto the page to load it.
const dropHint = document.getElementById('dropHint');
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; dropHint.hidden = false; } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; dropHint.hidden = true; } });
window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('drop', async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0; dropHint.hidden = true;
  const f = e.dataTransfer.files[0];
  if (!f || !confirmReplace()) return;
  try { loaded(await loadFile(f)); } catch (err) { toast(err.message, 'bad'); }
});

window.addEventListener('beforeunload', (e) => {
  if (store.isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

store.subscribe(updateBadge);
applySettings(store.get().settings);
window.addEventListener('hashchange', route);
route();
