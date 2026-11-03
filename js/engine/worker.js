// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// Web Worker entry: runs the engine off the UI thread. Messages are
// { id, cmd, args }, where cmd is an export of api.js; replies are { id, result } or { id, error }.
import * as api from './api.js';

self.onmessage = (e) => {
  const { id, cmd, args } = e.data;
  try {
    postMessage({ id, result: api[cmd](...args) });
  } catch (err) {
    postMessage({ id, error: String(err && err.message || err) });
  }
};
