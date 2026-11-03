// Dashboard with personalised recommendations.
import { store } from '../store.js';
import { pieceSVG } from '../pieces.js';
import { tierOf, TIERS } from '../rating.js';
import { OPENINGS } from '../data/openings.js';
import { BOOKS } from '../data/library.js';
import { PUZZLES } from '../data/puzzles.js';
import { courseProgress, dueLines } from './openings.js';
import { esc, THEME_INFO, sparkline } from '../ui.js';
import { currentRd, isProvisional, PUZZLE_BATCH } from '../skill.js';

const TIER_PLAN = {
  beginner: {
    focus: 'Stop hanging pieces and learn basic mates.',
    themes: ['mateIn1', 'hangingPiece', 'backRankMate'],
    tips: ['Before every move, ask: what does my opponent threaten?', 'Develop knights and bishops before moving the queen.', 'Castle early to keep your king safe.'],
    plan: [['🧩', '15 rated puzzles'], ['📖', '1 opening line'], ['♟', '1 game vs a bot near your level']],
    bookLevel: 'beginner',
  },
  novice: {
    focus: 'Spot two-move tactics and keep your pieces protected.',
    themes: ['fork', 'mateIn2', 'hangingPiece'],
    tips: ['Check every capture and check, for both sides.', 'Trade when ahead in material.', 'Learn one opening for White and one for Black.'],
    plan: [['🧩', '20 rated puzzles'], ['⚡', '1 Puzzle Rush'], ['📖', '2 opening lines'], ['♟', '1 game with coach mode']],
    bookLevel: 'beginner',
  },
  intermediate: {
    focus: 'Combine tactics with planning, and learn the key endgames.',
    themes: ['fork', 'sacrifice', 'mateIn2'],
    tips: ['Make a plan based on pawn structure.', 'Improve your worst-placed piece.', 'Study rook endgames: Lucena and Philidor.'],
    plan: [['🧩', '20 rated puzzles'], ['📖', 'Review due opening lines'], ['♟', '1 long game, then review it']],
    bookLevel: 'intermediate',
  },
  advanced: {
    focus: 'Deep calculation and positional understanding.',
    themes: ['mateIn3', 'sacrifice', 'long'],
    tips: ['Calculate forcing lines to the end before playing a sacrifice.', 'Look for prophylactic moves.', 'Build a repertoire with ideas, not only moves.'],
    plan: [['🧩', '25 harder puzzles'], ['📖', 'A new sharp opening line'], ['♟', 'Play a stronger bot and review']],
    bookLevel: 'advanced',
  },
  expert: {
    focus: 'Precision: long calculation and refined repertoire.',
    themes: ['long', 'mateIn3', 'sacrifice'],
    tips: ['Solve without moving pieces, then verify.', 'Annotate your own games deeply.', 'Study classic games of world champions.'],
    plan: [['🧩', '30 puzzles at 2000+'], ['📖', 'Full course review'], ['♟', 'Play the 2200 bot']],
    bookLevel: 'expert',
  },
};

export function recommendations() {
  const s = store.get();
  const rating = s.profile.rating || 1000;
  const tier = tierOf(rating);
  const plan = TIER_PLAN[tier.id];

  // weakest themes from puzzle history, falling back to tier defaults
  const scored = Object.entries(s.themes)
    .filter(([t, v]) => THEME_INFO[t] && v.ok + v.fail >= 3 && !['opening', 'middlegame', 'endgame', 'oneMove'].includes(t))
    .map(([t, v]) => ({ t, rate: v.ok / (v.ok + v.fail), n: v.ok + v.fail }))
    .sort((a, b) => a.rate - b.rate);
  const available = new Set(PUZZLES.flatMap((p) => p.themes));
  const weak = scored.filter((x) => x.rate < 0.65).slice(0, 2).map((x) => ({ theme: x.t, why: `${Math.round(x.rate * 100)}% success over ${x.n} puzzles` }));
  for (const t of plan.themes) if (weak.length < 3 && available.has(t) && !weak.some((w) => w.theme === t)) weak.push({ theme: t, why: `Key pattern for ${tier.name.toLowerCase()} players` });

  const fits = (o) => rating >= o.level[0] - 100 && rating <= o.level[1];
  const pickOpening = (side) => OPENINGS.filter((o) => o.side === side && fits(o))
    .map((o) => ({ o, p: courseProgress(o) }))
    .sort((a, b) => (a.p.mastered / a.p.total) - (b.p.mastered / b.p.total) || a.o.level[0] - b.o.level[0])[0];
  const openings = [pickOpening('w'), pickOpening('b')].filter(Boolean);
  const books = BOOKS.filter((b) => b.level === plan.bookLevel).slice(0, 3);
  return { rating, tier, plan, weak, openings, books, due: dueLines().length };
}

export function homeView(root) {
  const s = store.get();
  if (s.profile.rating == null) {
    root.innerHTML = `<section class="page hero">
      <div class="hero-board" aria-hidden="true">${miniBoard()}</div>
      <div>
        <h1>Train smarter.<br>Start with your level.</h1>
        <p class="lead">Play a short calibration game first. Every move is scored, your approximate Elo is estimated, and your puzzles, openings and reading list are matched to it.</p>
        <div class="row"><a class="btn primary big" href="#/calibrate">Start calibration</a><a class="btn big" href="#/puzzles">Try puzzles first</a></div>
        <p class="returning">Coming back? <button class="linkish" id="loadSave">Load your save file</button> or drag it onto this page.</p>
        <ul class="feature-list">
          <li><b>${PUZZLES.length}</b> engine-verified puzzles with a rating that adjusts to you</li>
          <li><b>${OPENINGS.length}</b> opening courses with spaced-repetition drills</li>
          <li>Play bots from 400 to 2400 with move-by-move coaching</li>
          <li>A curated library of chess books and where to find them</li>
        </ul>
      </div></section>`;
    root.querySelector('#loadSave').onclick = () => window.dispatchEvent(new CustomEvent('app:load'));
    return;
  }
  const r = recommendations();
  const hist = s.puzzle.history.slice(-60).map((h) => h.r);
  const ratingHist = s.profile.ratingHistory.map((h) => h.r);
  const nextTier = TIERS.find((t) => t.min > r.rating);
  root.innerHTML = `<section class="page">
    <div class="welcome">
      <div>
        <h1>${s.settings.name ? `Welcome back, ${esc(s.settings.name)}` : 'Your training plan'}</h1>
        <p class="lead">Level <span class="tier" style="--tier:${r.tier.color}">${r.tier.name}</span> · Focus: ${esc(r.plan.focus)}</p>
      </div>
    </div>
    <div class="stat-cards">
      <a class="stat-card" href="#/profile"><span>Skill rating</span><b>${r.rating}</b><small>±${currentRd(s.profile)}${isProvisional(s.profile) ? ' provisional' : ''} · ${nextTier ? `${nextTier.min - r.rating} to ${nextTier.name}` : 'Top tier'}</small></a>
      <a class="stat-card" href="#/puzzles"><span>Puzzle rating</span><b>${s.puzzle.rating}</b><small>${s.puzzle.count} rated puzzles</small></a>
      <a class="stat-card" href="#/puzzles/rush"><span>Puzzle Rush best</span><b>${s.puzzle.rushBest}</b><small>3-minute mode</small></a>
      <a class="stat-card" href="#/openings"><span>Lines mastered</span><b>${OPENINGS.reduce((a, o) => a + courseProgress(o).mastered, 0)}</b><small>${r.due} due for review</small></a>
    </div>

    ${isProvisional(s.profile) ? `<div class="note">Your rating is still <b>provisional</b> (±${currentRd(s.profile)}). ${s.profile.calibration ? '' : 'A <a href="#/calibrate">calibration game</a> is the quickest way to pin it down. '}Every game against the computer and every ${PUZZLE_BATCH} rated puzzles narrow the range, and your recommendations adjust automatically.</div>` : ''}
    ${lastUpdate(s)}
    <h2>Today's plan</h2>
    <div class="plan">${r.plan.plan.map(([i, t]) => `<div class="plan-item"><span>${i}</span>${esc(t)}</div>`).join('')}</div>

    <h2>Recommended exercises</h2>
    <div class="rec-grid">
      <a class="rec-card accent" href="#/puzzles"><div class="rec-kind">Rated puzzles</div><h3>Puzzles around ${s.puzzle.rating}</h3><p>Matched to your puzzle rating, which updates after every attempt.</p></a>
      ${r.weak.map((w) => `<a class="rec-card" href="#/puzzles?theme=${w.theme}"><div class="rec-kind">Theme</div><h3>${THEME_INFO[w.theme].name}</h3><p>${esc(w.why)}</p></a>`).join('')}
      ${r.due ? `<a class="rec-card" href="#/openings/due/train"><div class="rec-kind">Spaced repetition</div><h3>${r.due} opening line${r.due > 1 ? 's' : ''} due</h3><p>Review now so you keep them.</p></a>` : ''}
      ${r.openings.map(({ o, p }) => `<a class="rec-card" href="#/openings/${o.id}"><div class="rec-kind">Opening as ${o.side === 'w' ? 'White' : 'Black'}</div><h3>${esc(o.name)}</h3><p>${p.mastered}/${p.total} lines mastered · suited to ${o.level[0]}–${o.level[1]}</p></a>`).join('')}
      <a class="rec-card" href="#/game?mode=play&color=${Math.random() < 0.5 ? 'w' : 'b'}&elo=${Math.round((r.rating + 100) / 50) * 50}&coach=1"><div class="rec-kind">Practice game</div><h3>Play a ${Math.round((r.rating + 100) / 50) * 50} bot</h3><p>Slightly stronger than you, with coach mode on.</p></a>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Tips for your level</h3>
        <ul class="ideas">${r.plan.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h3>Recommended reading</h3>
        <ul class="book-mini">${r.books.map((b) => `<li><b>${esc(b.title)}</b><span class="muted small">${esc(b.author)}</span></li>`).join('')}</ul>
        <a href="#/library?level=${r.plan.bookLevel}">Browse the library →</a>
      </div>
    </div>
    <div class="two-col">
      <div class="card"><h3>Puzzle rating trend</h3>${sparkline(hist)}</div>
      <div class="card"><h3>Skill rating trend</h3>${sparkline(ratingHist)}<p class="muted small">Calibration sets it, and games against the computer update it.</p></div>
    </div>
  </section>`;
}

function lastUpdate(s) {
  const e = s.profile.events[s.profile.events.length - 1];
  if (!e || e.before == null || Date.now() - e.t > 3 * 86400000) return '';
  const d = e.after - e.before;
  return `<p class="muted small">Last rating update: <b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</b> from ${e.src === 'puzzles' ? 'rated puzzles' : 'a game'} (${esc(e.label)}). <a href="#/profile">Details</a></p>`;
}

function miniBoard() {
  const pos = ['r', '', '', '', 'k', '', '', 'r', 'p', 'p', '', '', '', 'p', 'p', 'p', '', '', 'n', '', '', '', '', '', '', '', '', '', 'N', '', '', '', '', '', 'B', '', '', '', '', '', '', '', '', '', '', '', '', '', 'P', 'P', '', '', '', 'P', 'P', 'P', 'R', '', '', '', '', 'R', 'K', ''];
  return `<div class="mini">${pos.map((p, i) => {
    const light = (Math.floor(i / 8) + i) % 2 === 0;
    const w = p && p === p.toUpperCase();
    return `<div class="${light ? 'light' : 'dark'}">${p ? `<span class="piece">${pieceSVG(w ? 'w' : 'b', p.toLowerCase())}</span>` : ''}</div>`;
  }).join('')}</div>`;
}
