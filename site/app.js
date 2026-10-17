// Drumore Friends · app shell. Explore first; Stories and About support it. The URL holds all state.
import { S, load, parse, go, onChange, select } from './store.js';
import { esc, faceHTML, fmtDate, isPhone, reduceMotion } from './lib.js';
import { mountExplore, updateExplore } from './explore.js';
import { renderPerson, renderStories, renderAbout, renderViewer } from './reading.js';

import { MARK_FULL } from './hero.js';
const MARK = `<svg viewBox="0 0 64 48" aria-hidden="true">${MARK_FULL}</svg>`;
const HEADER_MARK = `<svg viewBox="0 16 64 33" aria-hidden="true">${MARK_FULL}</svg>`;
let mounted = null;

await load();
document.getElementById('app').innerHTML = `
  <header class="top gut"><div class="wide top-in">
    <a class="brand" href="/" aria-label="Drumore Friends, Explore">${HEADER_MARK}Drumore Friends<small>Meeting House · Drumore Township, PA</small></a>
    <nav class="mainnav" aria-label="Main"><a data-nav="explore" href="/">Explore</a><a data-nav="stories" href="?view=stories">Stories</a><a data-nav="about" href="?view=about">About</a></nav>
    <label class="search"><span class="sr">Search</span><input id="q" type="search" placeholder="Search names, places, years" autocomplete="off"></label>
    <div class="search-results" id="qr" hidden></div>
  </div></header>
  <main id="main" tabindex="-1"></main>
  <footer class="foot gut"><div class="wide foot-in"><span class="brand" style="color:#DCE3DF">${MARK}Drumore Friends</span><span>Drumore Friends Meeting House · Drumore Township · Lancaster County, PA</span><span><a href="?view=stories">Stories</a> · <a href="?view=about">About</a> · <a href="?view=about#corrections">Suggest a correction</a></span><p class="proto-note">Private prototype. Every claim is reported from Beth’s posts and still being checked. Images are shown for review only; rights are unreviewed.</p></div></footer>
  <nav class="mbar" aria-label="Sections">
    <a data-m="timeline" href="?mode=timeline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v18M14 7h7M14 12h5M14 17h7"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="8" cy="15" r="2" fill="currentColor"/></svg>Timeline</a>
    <a data-m="family" href="?mode=family"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M12 8v4M6 15v-3h12v3"/></svg>Family</a>
    <a data-m="map" href="?mode=map"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Places</a>
    <a data-m="stories" href="?view=stories"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-4a2 2 0 0 0-2 2"/></svg>Stories</a>
  </nav>
  <div id="viewer"></div><div id="prompt"></div>`;

// internal links become history entries instead of reloads
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== '/') return;
  e.preventDefault();
  // an in-page anchor (the cover's "Into the timeline") scrolls without a history entry
  if (url.hash && url.search === location.search) return document.querySelector(url.hash)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' });
  if (a.dataset.nav === 'explore' || a.classList.contains('brand')) return go({ view: 'explore', story: null, scene: null, post: null });
  if (a.dataset.m) { const m = a.dataset.m; if (m === 'stories') return go({ view: 'stories', post: null }); go({ view: 'explore', mode: m, post: null, fam: m === 'family' ? 'center' : S.state.fam }); return toWorkbench(); }
  history.pushState(null, '', (url.search || '/') + url.hash);
  const prev = S.state; S.state = parse(location.search); render(S.state, prev);
  if (url.hash) requestAnimationFrame(() => document.querySelector(url.hash)?.scrollIntoView());
});
window.addEventListener('popstate', () => { const prev = S.state; S.state = parse(location.search); render(S.state, prev); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.state.post) go({ post: null, image: null }); });
onChange(render);

// search across people, events and places
const q = document.getElementById('q'), qr = document.getElementById('qr');
q.addEventListener('input', () => {
  const t = q.value.trim().toLowerCase();
  if (t.length < 2) { qr.hidden = true; return; }
  const hits = [
    ...S.data.people.filter(p => (p.displayName + ' ' + p.aliases.join(' ')).toLowerCase().includes(t)).map(p => ['person', p.id, faceHTML(p.id), p.displayName, p.relationToWynona || 'Person']),
    ...S.data.events.filter(e => (e.title + ' ' + e.date.original).toLowerCase().includes(t)).map(e => ['event', e.id, '<span class="face">·</span>', e.title, fmtDate(e.date, e)]),
    ...S.data.places.filter(p => p.label.toLowerCase().includes(t)).map(p => ['place', p.id, '<span class="face">◦</span>', p.label, 'Place']),
  ].slice(0, 12);
  qr.innerHTML = hits.length ? hits.map(([k, id, f, a, b]) => `<button type="button" data-k="${k}" data-id="${id}">${f}<span><b>${esc(a)}</b><span>${esc(b)}</span></span></button>`).join('') : '<p class="asw" style="padding:10px">Nothing found yet.</p>';
  qr.hidden = false;
  qr.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', (ev) => {
    ev.preventDefault(); qr.hidden = true; q.value = '';
    const k = b.dataset.k, id = b.dataset.id;
    if (k === 'person') go({ view: 'explore', person: id, event: null, place: null, story: null, scene: null });
    else if (k === 'event') go({ view: 'explore', event: id, person: null, place: null, year: S.idx.events[id].date.sortYear, story: null, scene: null });
    else go({ view: 'explore', place: id, person: null, event: null, story: null, scene: null });
  }));
});
q.addEventListener('blur', () => setTimeout(() => qr.hidden = true, 150));

function render(st, prev = {}) {
  document.querySelectorAll('[data-nav]').forEach(a => a.removeAttribute('aria-current'));
  const navKey = st.view === 'stories' || st.view === 'story' || st.view === 'person' ? (st.view === 'stories' || st.view === 'story' ? 'stories' : 'explore') : st.view === 'about' ? 'about' : 'explore';
  document.querySelector(`[data-nav="${navKey}"]`).setAttribute('aria-current', 'page');
  document.querySelectorAll('.mbar a').forEach(a => {
    const on = st.view === 'explore' ? (a.dataset.m === st.mode || (a.dataset.m === 'timeline' && !['family', 'map'].includes(st.mode))) : (a.dataset.m === 'stories' && navKey === 'stories');
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const main = document.getElementById('main');
  const pageKey = st.view === 'explore' ? 'explore' : [st.view, st.story, st.scene, st.person].join('|');
  const viewChanged = pageKey !== mounted;
  if (st.view === 'explore') {
    const fresh = mounted !== 'explore';
    if (fresh) { mountExplore(main); mounted = 'explore'; }
    updateExplore(st);
    if (fresh && deepLink(st)) toWorkbench();
    document.title = 'Drumore Friends · Explore';
    schedulePrompt();
  } else if (viewChanged) {
    mounted = pageKey;
    if (st.view === 'stories') { renderStories(main, st); document.title = 'Drumore Friends · Stories'; }
    else if (st.view === 'about') { renderAbout(main); document.title = 'Drumore Friends · About'; }
    else { renderPerson(main, st); document.title = `Drumore Friends · ${S.idx.stories[st.story]?.title || S.idx.people[st.person]?.shortName || 'Person'}`; }
    if (prev.view) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }
  renderViewer(document.getElementById('viewer'), st);
}

// Explore opens on the cover hero. A link that carries a selection (or Back from a reading page) lands on the workbench instead.
const deepLink = (st) => !!(st.person || st.event || st.place || st.year || st.mode !== 'timeline' || st.era !== 'diaries');
function toWorkbench() { document.getElementById('workbench')?.scrollIntoView({ block: 'start' }); }

// phone: a quiet, delayed prompt to continue on a bigger screen (mock only)
let promptTimer = null;
function schedulePrompt() {
  if (promptTimer || !isPhone()) return;
  let seen = false; try { seen = sessionStorage.getItem('df-desktop-prompt') === '1'; } catch {}
  if (seen) return;
  promptTimer = setTimeout(() => {
    if (S.state.view !== 'explore' || !isPhone()) return;
    try { sessionStorage.setItem('df-desktop-prompt', '1'); } catch {}
    const host = document.getElementById('prompt');
    host.innerHTML = `<aside class="prompt" role="dialog" aria-label="Continue on a computer"><button type="button" class="x">Not now ✕</button><b>The archive is easier to explore on a computer</b>
      <p>Enter your email and we’d send you a link to open on a bigger screen. Entering it would also subscribe you to the Drumore Friends newsletter.</p>
      <form class="form-mock"><label class="sr" for="dp-email">Email address</label><input id="dp-email" type="email" placeholder="you@example.com" autocomplete="off"><button class="btn" type="submit">Send link</button></form>
      <p class="disclose">Prototype: this doesn’t send or keep email.</p></aside>`;
    host.querySelector('.x').addEventListener('click', () => host.innerHTML = '');
    host.querySelector('form').addEventListener('submit', e => { e.preventDefault(); host.querySelector('.disclose').textContent = 'Nothing was sent or saved. This prototype doesn’t send or keep email.'; });
  }, 4200);
}

S.state = parse(location.search);
render(S.state);
