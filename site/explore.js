// Explore: the cover hero and Gable Line story, the era bar, the five modes and the docked panel, all on one selection.
import { S, go, select, href } from './store.js';
import { svg, esc, fmtDate, mid, oldStyle, faceHTML, cropCSS, media, provTab, eviChip, placeLabel, personName, sourcesHTML, lifeText, isPhone, precisionWord } from './lib.js';
import { mountMap, focus as mapFocus } from './map.js';
import { renderFamily } from './family.js';
import { heroHTML } from './hero.js';
import { mountTimeline, updateTimeline, yearsOf, windowOf, inRange, tapBuzz } from './timeline.js';

const MODES = [['timeline', 'Timeline'], ['family', 'Family'], ['map', 'Map'], ['imagery', 'Imagery'], ['list', 'List']];
let R = {}, built = {};

export function mountExplore(main) {
  main.innerHTML = `<div class="explore">
    ${heroHTML()}
    <section class="workbench gut" id="workbench"><div class="wide" style="display:grid;gap:12px">
      <div class="eras desk" id="eras" role="group" aria-label="Eras"></div>
      <div class="erachips" id="erachips" role="group" aria-label="Eras" hidden></div>
      <div class="wb-tools"><span id="wbStatus"></span><span class="modes" role="tablist" aria-label="View">${MODES.map(([m, l]) => `<button type="button" role="tab" data-mode="${m}">${l}</button>`).join('')}</span></div>
      <section class="mapstrip" id="mapstrip" aria-label="Map"></section>
      <div class="wb-grid"><div class="field" id="field"></div><aside class="dock" id="dock" aria-live="polite" aria-label="Selected"></aside></div>
    </div></section>
    <section class="below gut" aria-label="Stories and about"><div class="wide below-in" id="below"></div></section>
  </div>`;
  R = { strip: main.querySelector('#mapstrip'), eras: main.querySelector('#eras'), chips: main.querySelector('#erachips'), status: main.querySelector('#wbStatus'), field: main.querySelector('#field'), dock: main.querySelector('#dock'), below: main.querySelector('#below') };
  R.chips.hidden = false;
  mountMap(R.strip);
  const eraBtns = [['all', 'All eras', '1683–today', 0]].concat(S.data.eras.map(e => [e.id, e.label, `${e.start === 1600 ? 'to ' + e.end : e.start + '–' + (e.end === 2026 ? 'today' : e.end)}`, e.weight]));
  R.eras.innerHTML = eraBtns.map(([id, l, r, w]) => `<button type="button" data-era="${id}" class="${id === 'all' ? 'all' : ''}" style="--w:${w || 'auto'}"><b>${l}</b><span>${r}</span></button>`).join('');
  R.chips.innerHTML = eraBtns.map(([id, l]) => `<button type="button" data-era="${id}">${l}</button>`).join('');
  main.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => go({ era: b.dataset.era, span: null, year: null })));
  main.querySelectorAll('.modes [data-mode]').forEach(b => b.addEventListener('click', () => go({ mode: b.dataset.mode })));
  main.addEventListener('click', delegate);
  // Android: a short buzz when a tap selects something (iOS has no vibration; the pressed state carries it)
  main.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && e.target.closest('.ptl-card,.ptl-card [data-sel-person]')) tapBuzz(); });
  // the dock is never taller than the field beside it
  new ResizeObserver(() => R.dock.style.setProperty('--field-h', R.field.offsetHeight + 'px')).observe(R.field);
  R.below.innerHTML = belowHTML();
  built = {};
}

function delegate(e) {
  const t = e.target.closest('[data-post],[data-sel-person],[data-sel-event],[data-sel-place],[data-goto-mode],[data-clear]');
  if (!t || !R.field.closest('.explore').contains(t)) return;
  if (t.dataset.post) { e.preventDefault(); return go({ post: t.dataset.post, image: t.dataset.image || null }); }
  if (t.dataset.selPerson) { e.preventDefault(); e.stopPropagation(); return select('person', t.dataset.selPerson); }
  if (t.dataset.selEvent) { e.preventDefault(); return select('event', t.dataset.selEvent); }
  if (t.dataset.selPlace) { e.preventDefault(); return select('place', t.dataset.selPlace); }
  if (t.dataset.gotoMode) { e.preventDefault(); return go({ mode: t.dataset.gotoMode }); }
  if (t.dataset.clear != null) { e.preventDefault(); return select(null); }
}

export function updateExplore(st) {
  R.eras.querySelectorAll('[data-era]').forEach(b => b.setAttribute('aria-pressed', b.dataset.era === st.era));
  R.chips.querySelectorAll('[data-era]').forEach(b => b.setAttribute('aria-pressed', b.dataset.era === st.era));
  document.querySelectorAll('.modes [data-mode]').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === st.mode));
  R.strip.classList.toggle('tall', st.mode === 'map');
  // the desktop timeline stays mounted across eras so it can travel between them; the phone list is rebuilt per range
  const key = st.mode + '|' + (st.mode === 'timeline' ? '' : st.era + '|' + st.span) + '|' + (st.mode === 'family' ? st.fam : '') + '|' + (st.mode === 'list' ? st.list : '');
  const rangeKey = st.era + '|' + st.span;
  if (built.key !== key) { built = { key, rangeKey }; buildField(st); }
  else if (st.mode !== 'timeline') buildField(st);
  else if (built.rangeKey !== rangeKey) { built.rangeKey = rangeKey; buildPhone(st, R.field.querySelector('.ptl-list')); }
  if (st.mode === 'timeline') {
    updateTimeline(st);
    R.field.querySelectorAll('.ptl-card').forEach(c => c.classList.toggle('sel', c.dataset.selEvent === st.event));
    drawThreads(st);
  }
  renderDock(st);
  status(st);
  setTimeout(() => mapFocus(st), 0);
  const chip = R.chips.querySelector('[aria-pressed="true"]'); if (chip && isPhone()) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- the stretch of time in view ----------
// an era, or the timeline's window when it has been moved off the era edges (`span`)
const range = (st) => st.span ? yearsOf(windowOf(st)) : st.era === 'all' ? [1683, 2027] : [S.idx.eras[st.era].start, S.idx.eras[st.era].end + 1];

// ---------- field ----------
function buildField(st) {
  const f = R.field;
  if (st.mode === 'timeline') {
    f.innerHTML = `<div class="tl-desk"></div><div class="ptl"><ol class="ptl-list"></ol></div>`;
    mountTimeline(f.querySelector('.tl-desk'));
    buildPhone(st, f.querySelector('.ptl-list'));
    return;
  }
  if (st.mode === 'family') return renderFamily(f, st);
  if (st.mode === 'map') return buildPlaces(st, f);
  if (st.mode === 'imagery') return buildImagery(st, f);
  if (st.mode === 'list') return buildList(st, f);
}

// ---------- phone timeline: time runs down ----------
function buildPhone(st, list) {
  const rg = range(st);
  const evs = S.data.events.filter(e => inRange(e, rg)).sort((a, b) => mid(a.date) - mid(b.date));
  let html = '', era = null;
  for (const e of evs) {
    const eid = S.data.eras.find(x => e.date.sortYear >= x.start && e.date.sortYear <= x.end)?.id;
    if (st.era === 'all' && eid !== era) { era = eid; html += `<li class="ptl-era">${esc(S.idx.eras[eid].label)}</li>`; }
    html += `<li class="ptl-item" data-ev="${e.id}"><button type="button" class="ptl-card" data-sel-event="${e.id}"><span class="datel">${esc(fmtDate(e.date, e))}</span><b>${esc(e.title)}</b>${e.personSubjectIds.length ? `<span class="who">${e.personSubjectIds.map(p => `<span data-sel-person="${p}" title="${esc(personName(p))}">${faceHTML(p)}</span>`).join('')}</span>` : ''}</button></li>`;
  }
  list.innerHTML = html || '<li class="ptl-era">No dated events in this era yet. More context needed.</li>';
  list.insertAdjacentHTML('afterbegin', '<svg class="ptl-threads" aria-hidden="true"></svg>');
}
function drawThreads(st) {
  const list = document.querySelector('.ptl-list'); if (!list || !list.offsetParent) return;
  const svgEl = list.querySelector('.ptl-threads'); svgEl.innerHTML = ''; list.querySelectorAll('.ptl-dot').forEach(d => d.remove());
  const items = [...list.querySelectorAll('.ptl-item')], top0 = list.getBoundingClientRect().top;
  const pos = Object.fromEntries(items.map(li => [li.dataset.ev, li.getBoundingClientRect().top - top0 + li.offsetHeight / 2]));
  let ids = [...new Set(items.flatMap(li => S.idx.events[li.dataset.ev].personSubjectIds))];
  if (st.person && !ids.includes(st.person)) ids.unshift(st.person);
  ids = ids.slice(0, 6);
  list.style.setProperty('--ptl-pad', `${22 + ids.length * 9 + 10}px`);
  svgEl.setAttribute('viewBox', `0 0 64 ${list.offsetHeight}`); svgEl.style.height = list.offsetHeight + 'px';
  ids.forEach((pid, i) => {
    const x = 14 + i * 9, ys = S.idx.people[pid].eventIds.map(id => pos[id]).filter(v => v != null);
    if (!ys.length) return;
    svg('line', { x1: x, x2: x, y1: Math.min(...ys) - 16, y2: Math.max(...ys) + 16, class: pid === st.person ? 'sel' : '' }, svgEl);
    for (const yv of ys) { const d = document.createElement('span'); d.className = 'ptl-dot' + (pid === st.person ? ' sel' : ''); d.style.left = x + 'px'; d.style.top = yv + 'px'; list.appendChild(d); }
  });
}

// ---------- other modes ----------
function buildPlaces(st, f) {
  const rg = range(st);
  const counts = {}; for (const e of S.data.events) if (inRange(e, rg)) for (const p of e.placeIds) counts[p] = (counts[p] || 0) + 1;
  const list = S.data.places.filter(p => counts[p.id] || st.place === p.id || (st.person && (S.idx.people[st.person].placeIds || []).includes(p.id))).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  const on = new Set(st.person ? S.idx.people[st.person].placeIds : st.event ? S.idx.events[st.event].placeIds : st.place ? [st.place] : []);
  f.innerHTML = `<div class="places">${list.map(p => `<button type="button" class="placecard ${on.has(p.id) ? 'on' : ''}" data-sel-place="${p.id}"><b>${esc(p.label)}</b><span>${counts[p.id] || 0} event${counts[p.id] === 1 ? '' : 's'} in this era · ${esc(p.locationPrecision)}</span><span>${esc(p.status)}</span></button>`).join('') || '<p class="ff-none" style="padding:16px">No places for this era yet.</p>'}</div>`;
}
function buildImagery(st, f) {
  const sel = st.person, ev = st.event && S.idx.events[st.event], pl = st.place;
  const related = (im) => (sel && im.personIds.includes(sel)) || (ev && ev.sourcePostIds.includes(im.postId)) || (pl && S.data.events.some(e => e.placeIds.includes(pl) && e.sourcePostIds.includes(im.postId)));
  const any = !!(sel || ev || pl);
  const imgs = S.data.images.slice().sort((a, b) => (related(b) - related(a)) || (a.role === 'portrait' ? -1 : 1));
  f.innerHTML = `<div class="imgs">${imgs.map(im => { const on = related(im); const who = im.personIds.map(personName).join(', '); return `<button type="button" class="fig ${any && !on ? 'dim' : ''} ${on ? 'on' : ''}" data-post="${im.postId}" data-image="${im.id}"><div class="mat"><img src="${media(im.id)}" alt="${esc(im.alt || im.caption || 'Archive image')}" loading="lazy">${provTab(im)}</div><span class="fig" style="display:block;padding-top:12px;font-size:12.5px;color:var(--pewter)"><b style="color:var(--ink)">${esc(im.caption || 'Untitled image')}</b>${who ? ` · ${esc(who)}` : ''} · post ${im.postId}</span></button>`; }).join('')}</div>`;
}
function buildList(st, f) {
  const rg = range(st), tab = st.list || 'events';
  let body = '';
  if (tab === 'events') {
    const evs = S.data.events.filter(e => inRange(e, rg)).sort((a, b) => mid(a.date) - mid(b.date));
    body = `<table class="lv"><thead><tr><th>Date</th><th>What happened</th><th>People</th><th>Places</th><th>Sources</th></tr></thead><tbody>${evs.map(e => `<tr data-id="${e.id}" data-sel-event="${e.id}" tabindex="0" class="${st.event === e.id ? 'sel' : ''}"><td class="num" style="white-space:nowrap">${esc(fmtDate(e.date, e))}</td><td><b>${esc(e.title)}</b></td><td>${e.personSubjectIds.map(p => faceHTML(p)).join(' ')}</td><td>${e.placeIds.map(placeLabel).map(esc).join(', ') || '—'}</td><td class="num">${e.sourcePostIds.length}</td></tr>`).join('')}</tbody></table>`;
  } else if (tab === 'people') {
    body = `<table class="lv"><thead><tr><th></th><th>Name</th><th>To Wynona</th><th>Known dates</th><th>Events</th></tr></thead><tbody>${S.data.people.map(p => `<tr data-id="${p.id}" data-sel-person="${p.id}" tabindex="0" class="${st.person === p.id ? 'sel' : ''}"><td>${faceHTML(p.id)}</td><td><b>${esc(p.displayName)}</b></td><td>${esc(p.id === 'wynona-lamborn' ? '—' : p.relationToWynona || '')}</td><td>${esc(lifeText(p))}</td><td class="num">${p.eventIds.length}</td></tr>`).join('')}</tbody></table>`;
  } else {
    body = `<table class="lv"><thead><tr><th>Place</th><th>How exact</th><th>Status</th><th>Events</th></tr></thead><tbody>${S.data.places.map(p => `<tr data-id="${p.id}" data-sel-place="${p.id}" tabindex="0" class="${st.place === p.id ? 'sel' : ''}"><td><b>${esc(p.label)}</b></td><td>${esc(p.locationPrecision)}</td><td>${esc(p.status)}</td><td class="num">${S.data.events.filter(e => e.placeIds.includes(p.id)).length}</td></tr>`).join('')}</tbody></table>`;
  }
  f.innerHTML = `<div class="lvw"><div class="lv-tabs" role="group" aria-label="List">${[['events', 'Events'], ['people', 'People'], ['places', 'Places']].map(([k, l]) => `<button type="button" data-list="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>${body}</div>`;
  f.querySelectorAll('[data-list]').forEach(b => b.addEventListener('click', () => go({ list: b.dataset.list }, { replace: true })));
  f.querySelectorAll('tr[tabindex]').forEach(tr => tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.click(); } }));
}

// ---------- dock ----------
function renderDock(st) {
  const d = R.dock;
  const has = !!(st.event || st.person || st.place);
  const key = st.event || st.person || st.place || '';
  d.classList.toggle('empty', !has);
  if (d.dataset.key !== key) d.classList.remove('min');   // a new selection opens the phone sheet again
  d.dataset.key = key;
  d.innerHTML = grab + (st.event ? eventDock(S.idx.events[st.event], st) : st.person ? personDock(S.idx.people[st.person], st) : st.place ? placeDock(S.idx.places[st.place], st) : introDock());
  wireGrab(d);
}
const close = '<button type="button" class="close" data-clear>Close ✕</button>';
// phones: the bottom sheet's handle. Tap or drag down to tuck it away, up to bring it back; it never passes 44vh.
const grab = '<button type="button" class="grab" aria-label="Collapse or expand the panel"><i></i></button>';
function wireGrab(d) {
  const b = d.querySelector('.grab'); if (!b) return;
  let y0 = null, moved = false;
  b.addEventListener('pointerdown', (e) => { y0 = e.clientY; moved = false; b.setPointerCapture(e.pointerId); });
  b.addEventListener('pointermove', (e) => { if (y0 == null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 8) moved = true; d.style.transform = dy > 0 ? `translateY(${Math.min(dy, 200)}px)` : ''; });
  const up = (e) => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; d.style.transform = ''; if (moved && Math.abs(dy) > 40) d.classList.toggle('min', dy > 0); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  b.addEventListener('click', () => { if (!moved) d.classList.toggle('min'); moved = false; });
}
// a compact summary; the full lists live on the profile
function personDock(p, st) {
  const img = p.portraitImageId && S.idx.images[p.portraitImageId];
  const rg = range(st);
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(Boolean).sort((a, b) => mid(a.date) - mid(b.date));
  const shown = [...evs.filter(e => inRange(e, rg)), ...evs.filter(e => !inRange(e, rg))].slice(0, 3).sort((a, b) => mid(a.date) - mid(b.date));
  const bio = (p.about || '').split(/(?<=\.)\s+/)[0];
  const story = S.data.stories.find(s => s.personIds.includes(p.id));
  return `${close}<div class="dk-head">${img ? `<div class="ph face" style="${cropCSS(img)}" role="img" aria-label="${esc(img.caption || p.displayName)}"></div>` : `<div class="noph" title="No photograph identified yet">${esc(p.shortName.split(' ').map(w => w[0]).join('').slice(0, 2))}</div>`}
    <div><h2>${esc(p.displayName)}</h2>${p.relationToWynona && p.id !== 'wynona-lamborn' ? `<div class="rel">${esc(p.relationToWynona)}</div>` : ''}<div class="d">${esc(lifeText(p))}</div></div></div>
    ${bio ? `<p class="m bio">${esc(bio)}</p>` : ''}
    <div>${eviChip()} <span class="asw">${esc(p.identityStatus)}</span></div>
    ${shown.length ? `<div class="sec"><span class="eyebrow">Moments${evs.length > 3 ? ` · 3 of ${evs.length}` : ''}</span>${shown.map(e => `<button type="button" class="chip plain moment" data-sel-event="${e.id}"><span class="datel">${esc(fmtDate(e.date, e))}</span> ${esc(e.title)}</button>`).join('')}</div>` : ''}
    <div class="acts"><a href="${href({ view: 'person' })}">Open profile →</a><span class="more">${story ? `<a href="${href({ view: 'story', story: story.id, scene: null })}">Read ${p.id === 'wynona-lamborn' ? 'her' : 'the'} story</a> · ` : ''}<button type="button" class="linkbtn" data-goto-mode="family">Family</button> · <button type="button" class="linkbtn" data-goto-mode="map">Map</button></span></div>`;
}
function eventDock(e, st) {
  const sc = S.sceneByEvent[e.id], scene = sc && S.idx.scenes[sc.scene];
  const img = scene && scene.imageIds[0] && S.idx.images[scene.imageIds[0]];
  return `${close}${img ? `<button type="button" class="linkbtn" style="text-decoration:none" data-post="${img.postId}" data-image="${img.id}"><div class="mat"><img class="ph wide" src="${media(img.id)}" alt="${esc(img.alt || img.caption)}">${provTab(img)}</div></button>` : ''}
    <div><span class="datel">${esc(fmtDate(e.date, e))}</span> <span class="asw">· ${esc(precisionWord(e.date))}</span></div>
    <h2>${esc(e.title)}</h2>
    ${e.date.precision !== 'unknown' ? `<div class="asw">As written in the archive: “${esc(e.date.original)}”${oldStyle(e.date) ? ' · ⚑ before the 1752 calendar change; month numbering needs checking' : ''}</div>` : ''}
    <p class="m" style="color:var(--ink);font-size:14.5px">${esc(e.summary)}</p>
    <div>${eviChip(e)} <span class="asw">${esc(e.editorialStatus)}</span></div>
    ${e.conflict ? `<div class="conflict"><b>Sources disagree</b>${e.conflict.map(c => `<span>${esc(c.label)}: ${esc(c.basis)} (${c.postId})</span>`).join('')}</div>` : ''}
    ${e.personSubjectIds.length ? `<div class="sec"><span class="eyebrow">People</span><div class="chips">${e.personSubjectIds.map(id => `<button type="button" class="chip" data-sel-person="${id}">${faceHTML(id)}${esc(personName(id))}</button>`).join('')}</div></div>` : (e.nameMentions.length ? `<div class="sec"><span class="eyebrow">Names in the posts</span><p class="m">${esc(e.nameMentions.join(', '))}. Names in a post don’t prove who was present.</p></div>` : '')}
    ${e.placeIds.length ? `<div class="sec"><span class="eyebrow">Places</span><div class="chips">${e.placeIds.map(id => `<button type="button" class="chip plain" data-sel-place="${id}">${esc(placeLabel(id))}</button>`).join('')}</div></div>` : ''}
    <div class="sec"><span class="eyebrow">Sources · ${e.sourcePostIds.length}</span>${sourcesHTML(e.sourcePostIds.slice(0, 6))}${e.sourcePostIds.length > 6 ? `<span class="asw">and ${e.sourcePostIds.length - 6} more posts</span>` : ''}</div>
    <div class="acts">${sc ? `<a href="${href({ view: 'story', story: sc.story, scene: sc.scene })}">Read the scene →</a>` : '<span class="asw">This moment isn’t part of a written story yet. More context needed.</span>'}</div>`;
}
function placeDock(p, st) {
  const evs = S.data.events.filter(e => e.placeIds.includes(p.id)).sort((a, b) => mid(a.date) - mid(b.date));
  const ppl = S.data.people.filter(x => (x.placeIds || []).includes(p.id));
  return `${close}<span class="eyebrow">Place · ${esc(p.locationPrecision)}</span><h2>${esc(p.label)}</h2><p class="m">${esc(p.status)}</p>
    <p class="asw">Shown on a schematic drawing. No exact location is claimed.</p>
    ${ppl.length ? `<div class="sec"><span class="eyebrow">People connected here</span><div class="chips">${ppl.map(x => `<button type="button" class="chip" data-sel-person="${x.id}">${faceHTML(x.id)}${esc(x.shortName)}</button>`).join('')}</div></div>` : ''}
    ${evs.length ? `<div class="sec"><span class="eyebrow">Events here · ${evs.length}</span>${evs.map(e => `<button type="button" class="chip plain" data-sel-event="${e.id}"><span class="datel" style="font-size:12px">${esc(fmtDate(e.date, e))}</span> ${esc(e.title)}</button>`).join('')}</div>` : ''}
    ${p.sourcePostIds.length ? `<div class="sec"><span class="eyebrow">Sources</span>${sourcesHTML(p.sourcePostIds.slice(0, 5))}</div>` : ''}`;
}
function introDock() {
  const w = S.idx.images['P045-I01'];
  return `<span class="eyebrow">How to read this</span>
    <div class="legend-mini">
      <div><svg viewBox="0 0 26 20" width="26"><line x1="0" x2="26" y1="10" y2="10" stroke="#E3A33B" stroke-width="4" stroke-linecap="round"/></svg><span>A line is a life. Select one to follow it.</span></div>
      <div><svg viewBox="0 0 26 20" width="26"><circle cx="13" cy="10" r="6" fill="#FBFBF8" stroke="#17302B" stroke-width="2"/><circle cx="13" cy="10" r="2.2" fill="#17302B"/></svg><span>A ring with a dot is <b>reported</b>: from Beth’s posts, not yet checked against an original.</span></div>
      <div><svg viewBox="0 0 26 20" width="26"><line x1="0" x2="26" y1="10" y2="10" stroke="#C9D0CB" stroke-width="3" stroke-dasharray="3 3"/></svg><span>A fading or dotted line means the record runs out or sources disagree.</span></div>
      <div><svg viewBox="0 0 26 20" width="26"><path d="M2 10 C 8 2 18 2 24 10" fill="none" stroke="#8A5A10" stroke-width="1.6" stroke-dasharray="4 3"/></svg><span>A dashed amber link means <b>raised by</b>, not born to.</span></div>
    </div>
    <div class="sec"><span class="eyebrow">Start here</span>
      <a class="featured" href="${href({ view: 'story', story: 'wynona-diary', scene: null })}"><img src="${media('P045-I01')}" alt="${esc(w?.caption || 'Wynona Lamborn')}"><div><b>Wynona’s diary years</b><span>Five scenes, 1879–1891, with her own words and the original pages</span></div></a></div>
    <p class="asw">${S.data.events.length} dated events · ${S.data.people.length} people · ${S.data.images.length} archive images. Everything is reported from Beth’s posts and still being checked.</p>`;
}
function status(st) {
  const rg = range(st), evs = S.data.events.filter(e => inRange(e, rg)).length;
  const eraL = (e) => `${e.label}, ${e.start}–${e.end === 2026 ? 'today' : e.end}`;
  const spanEras = st.span ? S.data.eras.filter(e => e.end + 1 > rg[0] && e.start < rg[1]).map(e => e.label) : [];
  const label = st.span ? `${st.span.replace('-', '–').replace(/2026$/, 'today')} (${spanEras.join(' → ')})` : st.era === 'all' ? 'All eras, 1683–today' : eraL(S.idx.eras[st.era]);
  R.status.innerHTML = `Showing <b>${esc(label)}</b> · ${evs} events${st.year ? ` · year <b>${st.year}</b>` : ''}${st.era === 'before' ? ' · Before the record: no sources yet. More context needed.' : ''}`;
}
function belowHTML() {
  const st = S.data.stories[0];
  return `<div><h2>Stories</h2><a class="story-feature" href="${href({ view: 'story', story: st.id, scene: null })}"><img src="${media('P045-I01')}" alt="Jessie Wynona Lamborn"><div><span class="kind">Life story · 5 scenes</span><h3>${esc(st.title)}</h3><p>${esc(st.opening.split('. ').slice(0, 2).join('. '))}.</p></div></a></div>
    <div><h2>Research notes</h2><ul class="notes-list"><li><a href="${href({ view: 'stories' })}#phebe"><b>Two dates for Phebe</b><span>Research note · draft · what Will’s letter adds</span></a></li><li><a href="${href({ view: 'stories' })}#hand"><b>Reading Wynona’s hand</b><span>How transcriptions are made and checked</span></a></li></ul></div>
    <div><h2>About</h2><ul class="notes-list"><li><a href="${href({ view: 'about' })}#friends"><b>What a Friends meeting is</b><span>Quakers, meetings and plain dates</span></a></li><li><a href="${href({ view: 'about' })}#read"><b>How to read the evidence</b><span>Markers, dates, labels and the map</span></a></li></ul></div>`;
}
