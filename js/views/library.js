// Library: chess books by level and topic, with places to buy, borrow or read them.
import { BOOKS, RESOURCES, where } from '../data/library.js';
import { store } from '../store.js';
import { tierOf } from '../rating.js';
import { esc, $ } from '../ui.js';

const LEVELS = [['all', 'All levels'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced'], ['expert', 'Expert']];
const TOPICS = ['all', 'fundamentals', 'tactics', 'strategy', 'endgames', 'openings', 'calculation', 'games'];
const TIER_TO_LEVEL = { beginner: 'beginner', novice: 'beginner', intermediate: 'intermediate', advanced: 'advanced', expert: 'expert' };

export function libraryView(root, params) {
  const rating = store.get().profile.rating;
  const myLevel = rating ? TIER_TO_LEVEL[tierOf(rating).id] : null;
  let level = params.get('level') || 'all', topic = 'all', freeOnly = false, query = '';

  root.innerHTML = `<section class="page">
    <h1>Library</h1>
    <p class="lead">Classic and modern chess books sorted by level, with links to buy, borrow from a library, or read free when the book is in the public domain.${myLevel ? ` Books for your level (<b>${myLevel}</b>) are marked.` : ''}</p>
    <div class="filters card">
      <input type="search" id="q" placeholder="Search title or author" aria-label="Search books">
      <select id="level" aria-label="Level">${LEVELS.map(([v, l]) => `<option value="${v}" ${v === level ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="topic" aria-label="Topic">${TOPICS.map((t) => `<option value="${t}">${t === 'all' ? 'All topics' : t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="free"> Free / public domain</label>
    </div>
    <div class="book-grid" id="books"></div>
    <h2>Free and online resources</h2>
    <div class="res-grid">${RESOURCES.map((r) => `<a class="res-card" href="${r.url}" target="_blank" rel="noopener noreferrer">
      <span class="pill">${esc(r.kind)}</span><h3>${esc(r.name)} ↗</h3><p>${esc(r.desc)}</p></a>`).join('')}</div>
    <p class="muted small">Store and library links open a search on that site, so you can pick the edition and format you prefer.</p>
  </section>`;

  function render() {
    const ql = query.toLowerCase();
    const list = BOOKS.filter((b) => (level === 'all' || b.level === level) && (topic === 'all' || b.topic === topic) &&
      (!freeOnly || b.free) && (!ql || (b.title + ' ' + b.author).toLowerCase().includes(ql)));
    list.sort((a, b) => (b.level === myLevel) - (a.level === myLevel));
    $('#books', root).innerHTML = list.length ? list.map((b) => {
      const term = `${b.title} ${b.author.split(/[,&]/)[0]}`;
      const links = [
        ['Amazon', where.amazon(term)],
        ['Open Library', where.openLibrary(b.title)],
        ['WorldCat (libraries)', where.worldcat(b.title)],
      ];
      if (b.free) links.unshift(['Read free: Gutenberg', where.gutenberg(b.title)], ['Internet Archive', where.archive(b.title)]);
      return `<article class="book ${b.level === myLevel ? 'mine' : ''}">
        <div class="spine" data-topic="${b.topic}"><span>${esc(b.title)}</span></div>
        <div class="book-body">
          <div class="book-tags"><span class="pill lvl-${b.level}">${b.level}</span><span class="pill">${b.topic}</span>${b.free ? '<span class="pill free">free</span>' : ''}${b.level === myLevel ? '<span class="rec">For you</span>' : ''}</div>
          <h3>${esc(b.title)}</h3>
          <div class="muted small">${esc(b.author)} · ${b.year}</div>
          <p>${esc(b.blurb)}</p>
          <div class="links">${links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${l} ↗</a>`).join('')}</div>
        </div></article>`;
    }).join('') : '<p class="muted">No books match these filters.</p>';
  }
  $('#q', root).oninput = (e) => { query = e.target.value; render(); };
  $('#level', root).onchange = (e) => { level = e.target.value; render(); };
  $('#topic', root).onchange = (e) => { topic = e.target.value; render(); };
  $('#free', root).onchange = (e) => { freeOnly = e.target.checked; render(); };
  render();
}
