# Chess Trainer

A browser chess trainer inspired by Chess.com's puzzle and opening tools. It starts
with a **calibration game** that estimates your Elo, then recommends puzzles,
openings and books for your level.

## Run it

**As a static website (no server):** open `dist/index.html` by double-clicking it,
or upload that single file to any static host (GitHub Pages, Netlify, a USB stick…).
Everything is inside it: code, puzzles, openings, styles and the chess engine.

**For development:**

```bash
npm start          # serves the source files at http://localhost:5173
npm run build      # rebuilds dist/index.html after changes
npm test           # engine perft checks + opening and classic-game validation
```

## Saving your progress

Use **💾 Save** (top right, or Ctrl/Cmd+S) to write a `.json` save file such as
`chess-trainer-sam-2026-11-02.json`, and **📂 Load** to continue from one later. You can
also drag the file onto the page. The file holds everything: ratings and their
history, puzzle stats, opening progress, games and your settings (name, board colours).
An orange dot on Save means you have unsaved progress, and the browser warns you before
you close the tab with unsaved changes.

- In Chrome and Edge, the first save asks where to put the file. Later saves overwrite
  that same file, and **Save as…** on the Profile page picks a new one.
- Other browsers download a fresh copy each time.
- The app also keeps an automatic copy in the browser's local storage, so a page reload
  doesn't lose anything. The save file is the copy you control.

## How the skill rating keeps calibrating

The calibration game gives a first estimate. After that, **every game against the
computer and every batch of 10 rated puzzles** is treated as a new measurement of your
strength:

- **Games:** a performance rating from accuracy, average centipawn loss and the result.
  The result also caps it: a loss can't rate much above the opponent, and a win can't
  rate much below. The more moves analysed, the more the game counts.
- **Puzzles:** a performance rating over the batch (average puzzle rating ± 400 ×
  (wins − losses) / 10). Puzzles count as weaker evidence than games.

The rating carries an uncertainty (the "±" figure). Each measurement is blended in
according to how reliable it is compared with the current estimate (a Bayesian /
Glicko-style update). Early results move the rating a lot; once it is well established,
each result fine-tunes it. The ± range widens slowly after time away, so you re-adjust
quickly when you come back. Every update is listed on the Profile page with its weight.
Recommendations (puzzle themes, openings, bot strength, books) always follow the
current rating.

## Features

| Section | What it does |
|---|---|
| **Calibrate** | One game (up to 30 moves) against an adaptive bot. Each of your moves is scored for centipawn loss and accuracy (Lichess-style win-% formula), and the bot's strength follows your running estimate. The result is an Elo estimate with a ± margin, a tier (Beginner → Expert) and a move-by-move review. You can also enter a known rating instead. |
| **Home** | Your training plan: rating cards, today's plan, recommended exercises (weakest puzzle themes, opening courses suited to your rating, due reviews, a bot slightly above your level), tips and books. |
| **Puzzles** | *Rated* puzzles adapt to your puzzle rating (Elo with K = 40 while provisional, then 16). *Puzzle Rush* gives you 3 minutes and 3 strikes, with puzzles that get harder as you go. *Themes* covers mates in 1/2/3, back-rank and smothered mates, forks, hanging pieces, sacrifices, promotion and game phases. |
| **Openings** | 23 courses / 74 lines (Italian, London, Queen's Gambit, Ruy Lopez, Scotch, Vienna, Najdorf, Dragon, Accelerated Dragon, English, King's Gambit, Catalan, Nimzo-Indian, Grünfeld, Dutch, Pirc, Petroff, French, Caro-Kann, Scandinavian, KID, QGD, and a traps course). *Learn* mode shows arrows and notes; *Practice* mode tests you from memory. Spaced repetition uses Leitner boxes (1/3/7/14/30 days). |
| **Play** | Bots from 400 to 2400, coach mode with live move labels (Best … Blunder), hints, and a full post-game review. Games update your skill rating. |
| **Classics** | 13 famous games from Légal's Mate (1750) to Kasparov–Topalov (1999), filterable by era. *Replay* steps through each game with notes (← / → keys); *Guess the move* has you play the winner's moves (2 points first try, 1 on the second), can start from any 5th move, and saves your best score. |
| **Library** | 30 books grouped by level and topic, with links to Amazon, Open Library, WorldCat, and Project Gutenberg / Internet Archive for public-domain classics, plus free online resources. |
| **Profile** | Your name and board colours, the save file, how your rating was built (every update with its weight), rating history, per-theme success rates and recent games. |


## How it works

- **Engine** (`js/engine/core.js`): a 0x88 move generator, tapered PST evaluation with
  pawn-structure terms, and an alpha-beta search with quiescence, check extensions,
  killer/history ordering and a move-ordering hash table. It runs in a Web Worker and
  searches about 10M nodes/s in perft. `npm test` checks perft against the standard
  reference positions.
- **Bot strength** (`js/engine/api.js`): search depth, softmax move-selection temperature
  and an occasional random move are scaled to the target Elo. These are rough
  approximations, not FIDE-calibrated.
- **Puzzles** (`tools/gen-puzzles.js`): mined from engine self-play the way Lichess
  mines human games. A puzzle starts right after a blunder that leaves a single
  winning reply. Mates are verified exactly (unique first move at every step), and
  tactics need a ≥ 2.5-pawn gap to the second-best move. Difficulty comes from the
  solution length and type, whether the key move is quiet, sacrifices, and the search
  depth the engine needs to find it. `npm run puzzles` rebuilds `js/data/puzzles.js`
  from `tools/out/*.jsonl`.
- **Elo estimate** (`js/rating.js`): a blend of average centipawn loss
  (`2900·e^(−0.0095·ACPL)`), average accuracy and performance against the bot. A single
  game gives a rough estimate, which is why the margin is shown and why rated puzzles
  and later games keep adjusting your ratings.

## Project structure

```
index.html            App shell: top bar, <main id="view">, footer
css/style.css         All styles (theme tokens at the top, board, layouts, mobile rules)
js/
  main.js             Entry point: hash router, save/load buttons, shortcuts, drag & drop
  board.js            Board class: rendering, tap/drag input, arrows, badges, promotion
  pieces.js           SVG piece set
  store.js            App state, localStorage autosave, migrations
  savefile.js         .json save files (File System Access API with download fallback)
  skill.js            Bayesian skill rating (rating ± rd) fed by games and puzzle batches
  rating.js           Accuracy, move labels, Elo estimate, tiers
  ui.js               DOM helpers: toast, modal, sparkline, board themes
  engine/
    core.js           0x88 move generator, evaluation, alpha-beta search
    api.js            analyse / scoreMove(s) / playMove at a target Elo
    worker.js         Web Worker wrapper around api.js
    client.js         Promise-based client for the worker (used by the views)
  views/              One module per page; each renders into the root element and
                      may return a cleanup function the router calls on navigation
  data/               Puzzles (generated), openings, classic games, books
tools/                Dev server, static build, puzzle generator and validators
vendor/chess.js       chess.js (BSD-2-Clause), rules and SAN parsing for the UI
```

Every source file starts with an SPDX licence line, and the public functions and
classes carry JSDoc comments describing their parameters and return values.

### Mobile

The board sets `touch-action: none` and also cancels its `touchstart` / `touchmove` /
`touchend` events (non-passive listeners in `js/board.js`). That stops the page from
scrolling under your finger and stops iOS double-tap zoom when you tap a piece and then
its target square. Pointer events still drive the moves, so the promotion picker uses
`pointerdown`/`pointerup` instead of `click`. Elsewhere, `touch-action: manipulation`
on `<html>` removes double-tap zoom on buttons while keeping pinch zoom.

## License

[MIT](LICENSE) © 2026 Santiago Renteria.

Third-party parts keep their own licences: `vendor/chess.js` is BSD-2-Clause
(Copyright Jeff Hlywa), and the Inter and Noto Sans Symbols 2 fonts are SIL Open Font
License 1.1. See the in-app **About & credits** page for details.
