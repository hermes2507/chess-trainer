// Save progress to a .json file and load it back later (on any device or browser).
import { store } from './store.js';

const FORMAT = 'chess-trainer-save';
const VERSION = 2;
let handle = null; // remembered file (File System Access API) for one-click re-saves

const canPick = () => typeof window.showSaveFilePicker === 'function';

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

export function suggestedName() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `chess-trainer-${slug(store.get().settings.name) || 'progress'}-${date}.json`;
}

export function serialize() {
  return JSON.stringify({ format: FORMAT, version: VERSION, savedAt: new Date().toISOString(), data: store.get() }, null, 1);
}

export function parse(text) {
  let o;
  try { o = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  // Accept the current format and bare state objects from the old export button.
  const data = o && o.format === FORMAT ? o.data : o;
  if (!data || typeof data !== 'object' || !data.profile || !data.puzzle) throw new Error('This is not a Chess Trainer save file.');
  if (o.version > VERSION) throw new Error('This save was made by a newer version of the app.');
  return { data, savedAt: o.savedAt || null };
}

function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function markSaved(name) {
  store.updateMeta((m) => { m.savedAt = Date.now(); m.saveName = name; });
}

// Returns the file name written, or null if the user cancelled.
export async function save({ saveAs = false } = {}) {
  const text = serialize();
  if (canPick()) {
    try {
      if (!handle || saveAs) {
        handle = await window.showSaveFilePicker({
          suggestedName: store.get().meta.saveName || suggestedName(),
          types: [{ description: 'Chess Trainer save', accept: { 'application/json': ['.json'] } }],
        });
      }
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      markSaved(handle.name);
      return handle.name;
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      handle = null; // permission lost or API blocked: fall back to a download
    }
  }
  const name = suggestedName();
  download(text, name);
  markSaved(name);
  return name;
}

// Read a File object (from an <input>, drag & drop or the open picker).
export async function loadFile(file) {
  const { data, savedAt } = parse(await file.text());
  store.replace(data);
  store.updateMeta((m) => { m.savedAt = Date.now(); m.updatedAt = Date.now() - 1; m.saveName = file.name; });
  return { name: file.name, savedAt, player: data.settings?.name || '' };
}

// Ask for a file. Uses the open picker when available, so later saves go back to the same file.
export async function pickAndLoad() {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [h] = await window.showOpenFilePicker({ types: [{ description: 'Chess Trainer save', accept: { 'application/json': ['.json'] } }] });
      const info = await loadFile(await h.getFile());
      handle = h;
      return info;
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      if (!(e instanceof DOMException)) throw e; // a bad file, not a picker problem
      // picker blocked (e.g. file:// in some browsers): fall back to a plain file input
    }
  }
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return resolve(null);
      try { handle = null; resolve(await loadFile(f)); } catch (err) { reject(err); }
    };
    input.click();
  });
}

export const forgetHandle = () => { handle = null; };
