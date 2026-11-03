// Promise wrapper around the engine Web Worker.
let worker = null, nextId = 1;
const pending = new Map();

/* global __WORKER_SOURCE__ */
let blobUrl = null;

function spawn() {
  if (typeof __WORKER_SOURCE__ === 'string') {
    // Static single-file build: the worker's code is inlined, so no server is needed.
    blobUrl = blobUrl || URL.createObjectURL(new Blob([__WORKER_SOURCE__], { type: 'text/javascript' }));
    worker = new Worker(blobUrl);
  } else {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  }
  worker.onmessage = (e) => {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    error ? p.reject(new Error(error)) : p.resolve(result);
  };
}

function call(cmd, ...args) {
  if (!worker) spawn();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, cmd, args });
  });
}

// Abort any running search (e.g. when leaving a page); pending calls reject.
export function resetEngine() {
  if (worker) worker.terminate();
  worker = null;
  for (const p of pending.values()) p.reject(new Error('cancelled'));
  pending.clear();
}

export const engine = {
  analyse: (fen, opts) => call('analyse', fen, opts),
  scoreMove: (fen, uci, opts) => call('scoreMove', fen, uci, opts),
  scoreMoves: (fen, opts) => call('scoreMoves', fen, opts),
  playMove: (fen, opts) => call('playMove', fen, opts),
};
