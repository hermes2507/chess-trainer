import * as api from './api.js';

self.onmessage = (e) => {
  const { id, cmd, args } = e.data;
  try {
    postMessage({ id, result: api[cmd](...args) });
  } catch (err) {
    postMessage({ id, error: String(err && err.message || err) });
  }
};
