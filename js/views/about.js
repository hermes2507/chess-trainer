// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Santiago Renteria
// About & credits: who made the app and the third-party work it relies on.
const SITE = 'https://www.renterialab.com';
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

/** Render the About & credits page. */
export function aboutView(root) {
  root.innerHTML = `<section class="page narrow">
    <h1>About &amp; credits</h1>
    <div class="card">
      <h3>Made by</h3>
      <p>Chess Trainer was created by <b>Santiago Renteria</b> using
        ${ext('https://claude.com/claude-code', 'Claude Code')}.
        See more of my work at ${ext(SITE, 'renterialab.com')}.</p>
    </div>

    <div class="card credits">
      <h3>Open-source software</h3>
      <ul>
        <li>${ext('https://github.com/jhlywa/chess.js', 'chess.js')} by Jeff Hlywa: move generation and rules.
          BSD 2-Clause licence (full notice below).</li>
        <li>${ext('https://esbuild.github.io/', 'esbuild')} by Evan Wallace: bundles the app into one file. MIT licence.</li>
      </ul>

      <h3>Fonts</h3>
      <ul>
        <li>${ext('https://rsms.me/inter/', 'Inter')} by Rasmus Andersson, served by Google Fonts. SIL Open Font License 1.1.</li>
        <li>${ext('https://fonts.google.com/noto/specimen/Noto+Sans+Symbols+2', 'Noto Sans Symbols 2')} by Google. SIL Open Font License 1.1.</li>
      </ul>

      <h3>Methods and content</h3>
      <ul>
        <li>Move accuracy uses the win-probability and accuracy formulas published by
          ${ext('https://lichess.org/page/accuracy', 'Lichess')} (AGPL-licensed open-source chess server).</li>
        <li>Puzzles are mined from the app's own engine self-play and verified by it. The chess engine,
          piece set, opening courses and interface are original to this project.</li>
        <li>Book titles and covers in the Library belong to their authors and publishers. Links to outside
          sites are for reference only; this project is not affiliated with or endorsed by any of them.</li>
      </ul>
    </div>

    <details class="card">
      <summary>chess.js licence</summary>
      <pre class="licence">Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.</pre>
    </details>
  </section>`;
}
