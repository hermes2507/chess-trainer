// Profile: personal settings, how the skill rating evolved, stats and save files.
import { store } from '../store.js';
import { tierOf, CLASSES } from '../rating.js';
import { SOURCES, currentRd, isProvisional, MAX_RD, MIN_RD, PUZZLE_BATCH, resetSkill } from '../skill.js';
import { esc, $, THEME_INFO, sparkline, BOARD_THEMES, applySettings, toast } from '../ui.js';

const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

let unsubscribe = null;

export function profileView(root) {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  const s = store.get();
  const p = s.profile;
  const cal = p.calibration;
  const rd = currentRd(p);
  const confidence = Math.round(((MAX_RD - rd) / (MAX_RD - MIN_RD)) * 100);
  const themes = Object.entries(s.themes).filter(([t]) => THEME_INFO[t])
    .map(([t, v]) => ({ t, ...v, n: v.ok + v.fail, pct: Math.round((v.ok / Math.max(1, v.ok + v.fail)) * 100) }))
    .sort((a, b) => b.n - a.n);
  const games = s.games.slice(-10).reverse();
  const events = p.events.slice(-12).reverse();
  const tier = p.rating ? tierOf(p.rating) : null;
  const inBatch = p.puzzleBatch.length;

  root.innerHTML = `<section class="page">
    <h1>${s.settings.name ? `${esc(s.settings.name)}'s profile` : 'Profile'}</h1>

    <div class="card">
      <h3>Personalise</h3>
      <div class="settings-grid">
        <label class="field"><span>Your name (shown in greetings and save file names)</span>
          <input type="text" id="name" maxlength="40" value="${esc(s.settings.name)}" placeholder="e.g. Sam"></label>
        <div class="field"><span>Board colours</span><div class="swatches" id="swatches">
          ${Object.entries(BOARD_THEMES).map(([k, t]) => `<button class="swatch ${s.settings.boardTheme === k ? 'on' : ''}" data-theme="${k}" title="${t.name}" aria-label="${t.name} board">
            <i style="background:${t.light}"></i><i style="background:${t.dark}"></i><i style="background:${t.dark}"></i><i style="background:${t.light}"></i></button>`).join('')}
        </div></div>
      </div>
    </div>

    <div class="card save-card" id="saveCard"></div>

    <div class="stat-cards">
      <div class="stat-card"><span>Skill rating</span><b>${p.rating ?? '—'}</b><small>${tier ? `${tier.name} · ±${rd}${isProvisional(p) ? ' · provisional' : ''}` : 'not rated yet'}</small></div>
      <div class="stat-card"><span>Puzzle rating</span><b>${s.puzzle.rating}</b><small>${s.puzzle.count} rated · best streak ${s.puzzle.bestStreak}</small></div>
      <div class="stat-card"><span>Games played</span><b>${s.games.length}</b><small>vs computer</small></div>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>How your rating is calculated</h3>
        <p class="small">Your skill rating is a running estimate. Each <b>game</b> (calibration or casual) produces a performance rating from your move accuracy, centipawn loss and the result. Every <b>${PUZZLE_BATCH} rated puzzles</b> produce a performance rating from the puzzles you solved or failed. Each new result shifts your rating in proportion to how reliable it is and how sure the current estimate already is, so early results count a lot and later ones fine-tune.</p>
        ${p.rating != null ? `<div class="small">Confidence <b>${confidence}%</b> (±${rd})</div><div class="confidence"><div style="width:${confidence}%"></div></div>
        <p class="muted small">The ± range narrows as you play, and widens a little after a break.</p>` : ''}
        <p class="muted small">Next puzzle update: ${inBatch}/${PUZZLE_BATCH} rated puzzles collected.</p>
      </div>
      <div class="card"><h3>Skill rating history</h3>${sparkline(p.ratingHistory.map((h) => h.r))}
        <h3 style="margin-top:14px">Puzzle rating history</h3>${sparkline(s.puzzle.history.map((h) => h.r))}</div>
    </div>

    <div class="card"><h3>Rating updates</h3>${events.length ? `<table class="table"><thead><tr><th>Date</th><th>Source</th><th>Performance</th><th>Weight</th><th>Rating</th></tr></thead><tbody>
      ${events.map((e) => {
        const d = e.before == null ? null : e.after - e.before;
        return `<tr><td>${fmtDate(e.t)}</td><td class="ev-src">${SOURCES[e.src]?.icon || ''} ${SOURCES[e.src]?.label || e.src}<div class="muted small">${esc(e.label)}</div></td>
          <td>~${e.obs} <span class="muted small">±${e.sd}</span></td><td>${e.before == null ? 'first' : `${e.weight}%`}</td>
          <td><b>${e.after}</b> ${d == null ? '' : `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span>`}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="muted">No rating updates yet. Play the calibration game, any game against the computer, or rated puzzles.</p>'}</div>

    <div class="two-col">
      <div class="card"><h3>Calibration game</h3>${cal ? (cal.method === 'manual' ? `<p>Rating entered manually on ${fmtDate(cal.date)}.</p>` : `
        <p>Played on ${fmtDate(cal.date)}, with ${cal.moves} analysed moves.</p>
        <div class="stat-row"><div><b>${cal.accuracy}%</b><span>Accuracy</span></div><div><b>${cal.acpl}</b><span>Avg. cp loss</span></div></div>
        <ul class="cls-list">${Object.entries(CLASSES).map(([k, c]) => `<li><span class="cls-badge" style="background:${c.color}">${c.icon}</span>${c.label}<b>${cal.counts[k] || 0}</b></li>`).join('')}</ul>`) : '<p class="muted">Not calibrated yet.</p>'}
        <a class="btn" href="#/calibrate">${cal ? 'Play another calibration game' : 'Calibrate now'}</a></div>
      <div class="card"><h3>Recent games</h3>${games.length ? `<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Result</th><th>Acc.</th><th>Perf.</th></tr></thead><tbody>
        ${games.map((g) => `<tr><td>${fmtDate(g.t)}</td><td>${g.mode === 'calibration' ? 'Calibration' : `vs ${g.opp}`}</td><td>${g.result === 1 ? 'Win' : g.result === 0 ? 'Loss' : 'Draw'}</td><td>${g.accuracy}%</td><td>${g.perf ? `~${g.perf}` : '—'}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">No games yet.</p>'}</div>
    </div>

    <div class="card"><h3>Themes</h3>${themes.length ? `<table class="table"><thead><tr><th>Theme</th><th>Solved</th><th>Failed</th><th>Success</th><th></th></tr></thead><tbody>
      ${themes.map((x) => `<tr><td>${THEME_INFO[x.t].name}</td><td>${x.ok}</td><td>${x.fail}</td><td><div class="bar"><div style="width:${x.pct}%" class="${x.pct < 50 ? 'low' : ''}"></div></div> ${x.pct}%</td><td><a href="#/puzzles?theme=${x.t}">Practise</a></td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Solve some puzzles to see your strengths and weaknesses.</p>'}</div>

    <div class="card danger-zone"><h3>Reset</h3>
      <div class="row"><button class="btn" id="resetRating">Reset skill rating only</button><button class="btn danger" id="reset">Reset all progress</button></div>
      <p class="muted small">Tip: save to a file first if you might want this progress back.</p></div>
  </section>`;

  const nameEl = $('#name', root);
  nameEl.onchange = () => {
    store.update((st) => { st.settings.name = nameEl.value.trim().slice(0, 40); });
    profileView(root);
  };
  $('#swatches', root).onclick = (e) => {
    const b = e.target.closest('[data-theme]'); if (!b) return;
    store.update((st) => { st.settings.boardTheme = b.dataset.theme; });
    applySettings(store.get().settings);
    root.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
  };
  const refreshAfter = (fn) => () => { fn(); setTimeout(() => profileView(root), 50); };
  const renderSave = () => {
    const m = store.get().meta;
    const card = $('#saveCard', root);
    if (!card) return;
    card.innerHTML = `<div><h3>Save file</h3>
      <p class="muted small">${m.savedAt ? `Last saved ${fmtDate(m.savedAt)}${m.saveName ? ` to <b>${esc(m.saveName)}</b>` : ''}.` : 'Not saved to a file yet.'}
      ${store.isDirty() ? '<b class="due">You have unsaved progress.</b>' : ''}
      Your progress lives in this browser until you save it. Keep the file to continue later or on another device. You can load it with the Load button or by dragging it onto the page.</p></div>
      <div class="row"><button class="btn primary" data-act="save">💾 Save</button><button class="btn" data-act="saveAs">Save as…</button><button class="btn" data-act="load">📂 Load</button></div>`;
  };
  renderSave();
  $('#saveCard', root).onclick = (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'load') window.dispatchEvent(new CustomEvent('app:load'));
    else window.dispatchEvent(new CustomEvent('app:save', { detail: { saveAs: b.dataset.act === 'saveAs' } }));
  };
  unsubscribe = store.subscribe(renderSave);
  $('#resetRating', root).onclick = refreshAfter(() => {
    if (!confirm('Reset your skill rating? Puzzle stats, openings and games are kept.')) return;
    store.update((st) => resetSkill(st));
    toast('Skill rating reset. Play a calibration game to set it again.');
  });
  $('#reset', root).onclick = () => {
    if (!confirm('Delete all ratings and progress in this browser?')) return;
    store.reset();
    applySettings(store.get().settings);
    location.hash = '#/home';
  };
  return () => { if (unsubscribe) { unsubscribe(); unsubscribe = null; } };
}
