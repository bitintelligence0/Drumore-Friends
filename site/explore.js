// Explore: the long shallow map, the era bar, the five modes and the docked panel, all on one selection.
import { S, go, select, href, relOf } from './store.js';
import { svg, el, esc, fmtDate, span, mid, oldStyle, faceHTML, svgFace, cropCSS, media, provTab, eviChip, placeLabel, personName, sourcesHTML, lifeText, isPhone, precisionWord } from './lib.js';
import { mountMap, focus as mapFocus } from './map.js';
import { renderFamily } from './family.js';

const PERSON_ORDER = ['smedley-lamborn', 'margaret-bolton-lamborn', 'george-lamborn', 'sarah-coates-lamborn', 'will-lamborn', 'phebe-barnard-lamborn', 'wynona-lamborn', 'lib-hambleton', 'thomas-hambleton', 'alice-shoemaker', 'william-shoemaker', 'winona-shoemaker', 'lulu-shoemaker', 'isaac-bolton-shoemaker', 'early-earnhart'];
const FAMILIES = ['Lamborn', 'Hambleton', 'Shoemaker', 'Earnhart'];
const EAST = new Set(['germantown', 'overseas', 'chester-county', 'london-grove', 'east-marlborough', 'brandywine-area', 'gwynedd']);
const MODES = [['timeline', 'Timeline'], ['family', 'Family'], ['map', 'Map'], ['imagery', 'Imagery'], ['list', 'List']];
let R = {}, built = {};

export function mountExplore(main) {
  main.innerHTML = `<div class="explore">
    <section class="mapstrip" id="mapstrip" aria-label="Map"></section>
    <section class="workbench gut"><div class="wide" style="display:grid;gap:12px">
      <div class="eras desk" id="eras" role="group" aria-label="Eras"></div>
      <div class="erachips" id="erachips" role="group" aria-label="Eras" hidden></div>
      <div class="wb-tools"><span id="wbStatus"></span><span class="modes" role="tablist" aria-label="View">${MODES.map(([m, l]) => `<button type="button" role="tab" data-mode="${m}">${l}</button>`).join('')}</span></div>
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
  main.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => go({ era: b.dataset.era, year: null })));
  main.querySelectorAll('.modes [data-mode]').forEach(b => b.addEventListener('click', () => go({ mode: b.dataset.mode })));
  main.addEventListener('click', delegate);
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
  const key = st.mode + '|' + st.era + '|' + (st.mode === 'family' ? st.fam : '') + '|' + (st.mode === 'list' ? st.list : '');
  if (built.key !== key) { built = { key }; buildField(st); }
  else if (st.mode !== 'timeline') buildField(st);
  if (st.mode === 'timeline') applyTimeline(st);
  renderDock(st);
  status(st);
  setTimeout(() => mapFocus(st), 0);
  const chip = R.chips.querySelector('[aria-pressed="true"]'); if (chip && isPhone()) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- scale and lifelines ----------
const range = (st) => st.era === 'all' ? [1683, 2027] : [S.idx.eras[st.era].start, S.idx.eras[st.era].end + 1];
function scale(st) {
  const L = 172, Rx = 986;
  const src = st.era === 'all' ? S.data.eras.filter(e => e.id !== 'before') : [S.idx.eras[st.era]];
  const tot = src.reduce((a, e) => a + (st.era === 'all' ? e.weight : 1), 0);
  let acc = L; const segs = src.map(e => { const w = (st.era === 'all' ? e.weight : 1) / tot * (Rx - L); const s = { ...e, x: acc, w }; acc += w; return s; });
  const a = segs[0].start, b = segs[segs.length - 1].end + 1;
  const X = y => { if (y <= a) return L; if (y >= b) return Rx; const s = segs.find(s => y >= s.start && y < s.end + 1) || segs[segs.length - 1]; return s.x + (y - s.start) / (s.end + 1 - s.start) * s.w; };
  const inv = x => { const s = segs.find(s => x >= s.x && x <= s.x + s.w) || (x < L ? segs[0] : segs[segs.length - 1]); return s.start + (Math.min(Math.max(x, s.x), s.x + s.w) - s.x) / s.w * (s.end + 1 - s.start); };
  return { segs, X, inv, a, b, L, Rx };
}
export function extent(p) {
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(Boolean);
  const anchors = evs.flatMap(e => span(e.date) || []);
  const l = p.lifeline; if (!l) return null;
  if (l.start.kind === 'known' || l.start.kind === 'about') anchors.push(l.start.year + .5);
  if (l.end.kind === 'known' || l.end.kind === 'about') anchors.push(l.end.year + .5);
  if (l.end.kind === 'conflict') l.end.readings.forEach(r => anchors.push(r.year + .5));
  if (!anchors.length) return null;
  const lo = Math.min(...anchors), hi = Math.max(...anchors);
  const start = l.start.kind === 'known' ? { y: l.start.year + .5 } : l.start.kind === 'about' ? { y: l.start.year + .5, about: true } : { y: lo - 8, fade: true };
  let end;
  if (l.end.kind === 'known') end = { y: l.end.year + .5 };
  else if (l.end.kind === 'about') end = { y: l.end.year + .5, about: true };
  else if (l.end.kind === 'conflict') { const ys = l.end.readings.map(r => r.year + .5); end = { y: Math.max(...ys), conflict: [Math.min(...ys), Math.max(...ys)] }; }
  else end = { y: hi + 10, fade: true };
  return { start, end };
}
const evLane = (e) => !e.personSubjectIds.length ? ((e.date.sortYear < 1795 || e.placeIds.some(p => EAST.has(p))) ? 'ancestors' : 'community') : null;
const inRange = (e, [a, b]) => { const s = span(e.date); return s && s[1] >= a && s[0] <= b; };

// ---------- field ----------
function buildField(st) {
  const f = R.field;
  if (st.mode === 'timeline') {
    f.innerHTML = `<div class="tl-desk"></div><div class="ptl"><ol class="ptl-list"></ol></div>`;
    buildTimeline(st, f.querySelector('.tl-desk'));
    buildPhone(st, f.querySelector('.ptl-list'));
    return;
  }
  if (st.mode === 'family') return renderFamily(f, st);
  if (st.mode === 'map') return buildPlaces(st, f);
  if (st.mode === 'imagery') return buildImagery(st, f);
  if (st.mode === 'list') return buildList(st, f);
}

let T = null;
function buildTimeline(st, host) {
  const sc = scale(st), { X, L, Rx, segs } = sc, rg = [sc.a, sc.b];
  const s = svg('svg', { class: 'tl', role: 'group', 'aria-label': 'Timeline. Lifelines for people and markers for events. Select any line or marker.' }, host);
  const bandG = svg('g', {}, s);
  const plot = svg('rect', { x: L, y: 0, width: Rx - L, height: 10, class: 'bgclick' }, s);
  const bg = svg('g', {}, s);
  plot.addEventListener('click', ev => { const pt = s.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const p = pt.matrixTransform(s.getScreenCTM().inverse()); go({ year: Math.round(sc.inv(p.x) - .5) }, { replace: true }); });
  const lg = svg('g', {}, s), pg = svg('g', {}, s), eg = svg('g', {}, s), yg = svg('g', {}, s);
  let y = 22;
  const rows = {}, knots = [], labels = [];
  const people = PERSON_ORDER.map(id => S.idx.people[id]).filter(Boolean).map(p => ({ p, x: extent(p) })).filter(o => o.x && Math.min(o.x.end.y, rg[1]) - Math.max(o.x.start.y, rg[0]) >= 2);
  const lanes = [];
  const evs = S.data.events.filter(e => inRange(e, rg));
  for (const [id, label] of [['ancestors', 'Ancestors and migration'], ['community', 'Meeting and community']]) { const list = evs.filter(e => evLane(e) === id); if (list.length) lanes.push({ type: 'events', id, label, list }); }
  for (const fam of FAMILIES) { const list = people.filter(o => o.p.family === fam); if (list.length) lanes.push({ type: 'people', id: fam, label: fam, list }); }
  lanes.forEach((lane, i) => {
    const top = y;
    if (lane.type === 'events') {
      const rowsY = [top + 34, top + 54, top + 74], lastEnd = [-1e9, -1e9, -1e9];
      const items = lane.list.slice().sort((a, b) => mid(a.date) - mid(b.date));
      const base = top + 22;
      for (const e of items) {
        const k = knot(eg, e, base, X, rg);
        knots.push(k);
        const x = X(mid(e.date)), txt = e.title.length > 36 ? e.title.slice(0, 34) + '…' : e.title, w = txt.length * 6.1 + 14;
        let r = lastEnd.findIndex(end => x - 4 > end);
        if (r >= 0 && x + w < Rx + 30) { lastEnd[r] = x + w; const t = svg('text', { x: x - 4, y: rowsY[r], class: 'evl s' }, eg, txt); svg('line', { x1: x, x2: x, y1: base + 6, y2: rowsY[r] - 11, stroke: '#D6DBD6' }, eg); labels.push([t, e.id]); }
      }
      y = top + 92;
    } else {
      y = top + 16;
      for (const o of lane.list) { y += 30; rows[o.p.id] = { y, ...personRow(pg, o, y, X, rg, L, Rx, knots) }; y += 16; }
      y += 18;
    }
    if (i % 2 === 0) svg('rect', { x: 0, y: top, width: 1000, height: y - top, class: 'eraband' }, bandG);
    svg('text', { x: 16, y: top + 22, class: 'lane' }, bg, lane.label);
    if (lane.type === 'events') svg('text', { x: 16, y: top + 37, class: 'lane-s' }, bg, lane.id === 'ancestors' ? 'before Drumore' : 'no single person');
  });
  // axis
  const axisY = y + 6;
  for (const sg of segs) {
    const yrs = sg.end + 1 - sg.start, steps = [1, 2, 5, 10, 25, 50, 100], step = steps.find(k => sg.w / (yrs / k) >= 44) || 100;
    for (let t = Math.ceil(sg.start / step) * step; t <= sg.end; t += step) { if (t === sg.start && sg !== segs[0]) continue; const x = X(t); svg('line', { x1: x, x2: x, y1: 14, y2: axisY - 6, class: 'grid' }, bg); svg('text', { x, y: axisY + 12, 'text-anchor': 'middle', class: 'tick' }, bg, t); }
    if (segs.length > 1 && sg !== segs[0]) svg('path', { d: `M${sg.x - 3} ${axisY - 2} l3 6 l-3 6 M${sg.x + 1} ${axisY - 2} l3 6 l-3 6`, class: 'fold' }, bg);
  }
  if (segs.length > 1) for (const sg of segs) svg('text', { x: sg.x + 4, y: axisY + 28, class: 'lane-s' }, bg, sg.w > 70 ? sg.label : '');
  const H = axisY + (segs.length > 1 ? 36 : 22);
  s.setAttribute('viewBox', `0 0 1000 ${H}`);
  plot.setAttribute('y', 0); plot.setAttribute('height', H);
  T = { s, sc, rows, knots, labels, lg, yg, H, rg };
}

function knot(parent, e, y, X, rg) {
  const s = span(e.date), g = svg('g', { class: 'kn', tabindex: 0, role: 'button', 'data-ev': e.id, 'aria-label': `${fmtDate(e.date, e)}: ${e.title}. Reported.` }, parent);
  const a = Math.max(s[0], rg[0]), b = Math.min(s[1], rg[1]), x = X((a + b) / 2);
  svg('circle', { cx: x, cy: y, r: 13, class: 'h' }, g);
  if (X(b) - X(a) > 6) svg('rect', { x: X(a), y: y - 3, width: X(b) - X(a), height: 6, rx: 3, class: 'bar' }, g);
  if (e.conflict) { const xs = e.conflict.map(c => X(parseInt(c.label.replace(/\D/g, ''), 10) + .5)); xs.forEach(cx => { svg('circle', { cx, cy: y, r: 4.5, class: 'd' }, g); }); svg('path', { d: `M${xs[0]} ${y + 6} Q${(xs[0] + xs[1]) / 2} ${y + 17} ${xs[1]} ${y + 6}`, fill: 'none', stroke: '#17302B', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, g); }
  else { svg('circle', { cx: x, cy: y, r: 5.5, class: 'o' }, g); svg('circle', { cx: x, cy: y, r: 2, class: 'd' }, g); }
  svg('title', {}, g, `${fmtDate(e.date, e)} · ${e.title}`);
  const pick = (ev) => { ev.stopPropagation(); select('event', e.id); };
  g.addEventListener('click', pick); g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(ev); } });
  return { g, id: e.id };
}

function personRow(pg, { p, x: ext }, y, X, rg, L, Rx, knots) {
  const g = svg('g', { class: 'ln', tabindex: 0, role: 'button', 'aria-label': `${p.displayName}. ${lifeText(p)}.` }, pg);
  svg('rect', { x: L - 44, y: y - 20, width: Rx - L + 56, height: 40, fill: 'transparent' }, g);
  const sy = Math.max(ext.start.y, rg[0]), ey = Math.min(ext.end.y, rg[1]);
  let x0 = X(sy), x1 = X(ey);
  const seg = (a, b, op = 1, dash) => svg('line', { x1: X(a), x2: X(b), y1: y, y2: y, class: 's', opacity: op, 'stroke-dasharray': dash }, g);
  let solidA = sy, solidB = ey;
  if (ext.start.y >= rg[0] && (ext.start.fade || ext.start.about)) { const len = ext.start.fade ? 6 : 2; for (let i = 0; i < 4; i++) seg(ext.start.y + i * len / 4, ext.start.y + (i + 1) * len / 4, .18 + i * .22); solidA = ext.start.y + len; }
  if (ext.end.y <= rg[1] && ext.end.conflict) { seg(sy, ext.end.conflict[0]); seg(ext.end.conflict[0], ext.end.conflict[1], 1, '2 5'); solidB = ext.end.conflict[0];
    ext.end.conflict.forEach(t => svg('circle', { cx: X(t), cy: y, r: 4, fill: '#17302B' }, g));
    svg('path', { d: `M${X(ext.end.conflict[0])} ${y + 6} Q${(X(ext.end.conflict[0]) + X(ext.end.conflict[1])) / 2} ${y + 17} ${X(ext.end.conflict[1])} ${y + 6}`, fill: 'none', stroke: '#17302B', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, g);
    svg('text', { x: X(ext.end.conflict[1]) + 8, y: y + 4, class: 'lane-s' }, g, '1872 or 1874');
  } else if (ext.end.y <= rg[1] && (ext.end.fade || ext.end.about)) { const len = ext.end.fade ? 8 : 2; for (let i = 0; i < 4; i++) seg(ext.end.y - len + i * len / 4, ext.end.y - len + (i + 1) * len / 4, .9 - i * .22); solidB = ext.end.y - len; }
  if (!(ext.end.conflict && ext.end.y <= rg[1])) seg(solidA, Math.max(solidA, solidB));
  if (ext.start.y < rg[0]) svg('path', { d: `M${L - 4} ${y - 5} l-5 5 l5 5`, class: 'chev' }, g);
  if (ext.end.y > rg[1]) svg('path', { d: `M${Rx + 4} ${y - 5} l5 5 l-5 5`, class: 'chev' }, g);
  for (const id of p.eventIds) { const e = S.idx.events[id]; if (e && inRange(e, rg)) knots.push(knot(g, e, y, X, rg)); }
  const bx = x0 - 24;
  svg('circle', { cx: bx, cy: y, r: 16, class: 'bub' }, g); svgFace(g, bx, y, 14.5, p.id);
  svg('text', { x: bx + 22, y: y - 11, class: 'nm' }, g, p.shortName);
  const pick = () => select('person', p.id);
  g.addEventListener('click', pick); g.addEventListener('keydown', ev => { if (ev.target === g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); pick(); } });
  return { g, x0, x1 };
}

function applyTimeline(st) {
  if (!T) return;
  const { rows, knots, labels, lg, yg, sc, H, rg } = T, { X } = sc;
  const sel = st.person, r = sel ? relOf(sel) : null;
  const related = new Set(r ? [...r.parents, ...r.children, ...r.spouses, ...r.raisedBy, ...r.raised] : []);
  for (const [id, row] of Object.entries(rows)) { row.g.classList.toggle('sel', id === sel); row.g.classList.toggle('rel', related.has(id)); row.g.setAttribute('aria-pressed', id === sel); }
  for (const k of knots) {
    const e = S.idx.events[k.id];
    const hit = (sel && e.personSubjectIds.includes(sel)) || (st.place && e.placeIds.includes(st.place));
    k.g.classList.toggle('sel', k.id === st.event); k.g.classList.toggle('hit', !!hit && k.id !== st.event); k.g.classList.toggle('dim', !!st.place && !hit);
  }
  for (const [t, id] of labels) t.classList.toggle('on', id === st.event || (st.place && S.idx.events[id].placeIds.includes(st.place)));
  // relationship links for the selected person
  lg.innerHTML = '';
  if (sel && rows[sel]) {
    const me = S.idx.people[sel], mine = extent(me);
    const line = (x, y1, y2, cls, text, ty) => { const g = svg('g', { class: 'lk on' }, lg); svg('path', { d: `M${x} ${y1} V${y2}`, fill: 'none', stroke: cls === 'raise' ? '#8A5A10' : '#17302B', 'stroke-width': 1.6, 'stroke-dasharray': cls === 'par' ? '2 3' : cls === 'raise' ? '6 4' : null }, g); if (text) svg('text', { x: x + 8, y: ty, fill: cls === 'raise' ? '#8A5A10' : '#1C2321' }, g, text); };
    const birthX = (id) => { const e = extent(S.idx.people[id]); return e && !e.start.fade && e.start.y > rg[0] && e.start.y < rg[1] ? X(e.start.y) : null; };
    for (const p of r.parents) if (rows[p]) { const x = birthX(sel); if (x) line(x, rows[p].y, rows[sel].y, 'par'); }
    for (const c of r.children) if (rows[c]) { const x = birthX(c); if (x) line(x, rows[sel].y, rows[c].y, 'par'); }
    const raise = (child, guardians) => { const since = 1876.5, x = X(since); if (since < rg[0] || since > rg[1]) return; const gy = guardians.filter(g => rows[g]).map(g => rows[g].y); if (!gy.length || !rows[child]) return; const far = gy.reduce((a, b) => Math.abs(b - rows[child].y) > Math.abs(a - rows[child].y) ? b : a); line(x, far, rows[child].y, 'raise', `raised by ${guardians.map(personName).map(n => n.split(' ')[0]).join(' and ')}, from 1876`, (far + rows[child].y) / 2 + 4); };
    if (r.raisedBy.length) raise(sel, r.raisedBy);
    for (const c of r.raised) raise(c, relOf(c).raisedBy);
    for (const sp of r.spouses) if (rows[sp]) { const ev = S.data.events.find(e => e.personSubjectIds.includes(sel) && e.personSubjectIds.includes(sp) && /marr/i.test(e.title)); if (ev && inRange(ev, rg)) { const x = X(mid(ev.date)); line(x, rows[sel].y, rows[sp].y, 'mar', `married ${fmtDate(ev.date)}`, (rows[sel].y + rows[sp].y) / 2 + 4); } }
  }
  yg.innerHTML = '';
  if (st.year && st.year + .5 >= rg[0] && st.year + .5 <= rg[1]) { const x = X(st.year + .5); svg('line', { x1: x, x2: x, y1: 6, y2: H - 30, class: 'yr' }, yg); svg('text', { x: x + 5, y: 14, class: 'yrl' }, yg, st.year); }
  // phone list
  document.querySelectorAll('.ptl-card').forEach(c => c.classList.toggle('sel', c.dataset.selEvent === st.event));
  drawThreads(st);
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
  d.classList.toggle('empty', !has);
  d.innerHTML = st.event ? eventDock(S.idx.events[st.event], st) : st.person ? personDock(S.idx.people[st.person]) : st.place ? placeDock(S.idx.places[st.place], st) : introDock();
}
const close = '<button type="button" class="close" data-clear>Close ✕</button>';
function personDock(p) {
  const img = p.portraitImageId && S.idx.images[p.portraitImageId];
  const r = relOf(p.id);
  const chipsOf = (ids) => ids.map(id => `<button type="button" class="chip" data-sel-person="${id}">${faceHTML(id)}${esc(personName(id))}</button>`).join('');
  const rels = [['Parents', r.parents], ['Raised by', r.raisedBy], ['Married', r.spouses], ['Raised', r.raised], ['Children', r.children]].filter(([, ids]) => ids.length);
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(Boolean).sort((a, b) => mid(a.date) - mid(b.date));
  const story = S.data.stories.find(s => s.personIds.includes(p.id));
  return `${close}${img ? `<div class="ph face" style="${cropCSS(img)}" role="img" aria-label="${esc(img.caption || p.displayName)}"></div>` : `<div class="noph">${esc(p.shortName.split(' ').map(w => w[0]).join('').slice(0, 2))}<small>No photograph identified yet</small></div>`}
    <h2>${esc(p.displayName)}</h2>${p.relationToWynona ? `<div class="rel">${esc(p.relationToWynona)}</div>` : ''}
    <div class="d">${esc(lifeText(p))}</div><p class="m">${esc(p.about || '')}</p>
    <div>${eviChip()} <span class="asw">${esc(p.identityStatus)}</span></div>
    ${rels.length ? `<div class="sec"><span class="eyebrow">Family</span>${rels.map(([l, ids]) => `<div class="m"><b>${l}:</b></div><div class="chips">${chipsOf(ids)}</div>`).join('')}</div>` : ''}
    ${evs.length ? `<div class="sec"><span class="eyebrow">Dated moments</span>${evs.map(e => `<button type="button" class="chip plain" data-sel-event="${e.id}"><span class="datel" style="font-size:12px">${esc(fmtDate(e.date, e))}</span> ${esc(e.title)}</button>`).join('')}</div>` : ''}
    ${(p.placeIds || []).length ? `<div class="sec"><span class="eyebrow">Places</span><div class="chips">${p.placeIds.map(id => `<button type="button" class="chip plain" data-sel-place="${id}">${esc(placeLabel(id))}</button>`).join('')}</div></div>` : ''}
    <div class="sec"><span class="eyebrow">Sources</span>${sourcesHTML(p.sourcePostIds)}</div>
    <div class="acts">${story ? `<a href="${href({ view: 'story', story: story.id, scene: null })}">Follow ${p.id === 'wynona-lamborn' ? 'her' : 'this'} life →</a>` : `<a href="${href({ view: 'person' })}">Open profile →</a>`}<button type="button" class="linkbtn" data-goto-mode="family">See the family →</button><button type="button" class="linkbtn" data-goto-mode="map">Show on the map →</button></div>`;
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
  const label = st.era === 'all' ? 'All eras, 1683–today' : `${S.idx.eras[st.era].label}, ${S.idx.eras[st.era].start}–${S.idx.eras[st.era].end === 2026 ? 'today' : S.idx.eras[st.era].end}`;
  R.status.innerHTML = `Showing <b>${esc(label)}</b> · ${evs} events${st.year ? ` · year <b>${st.year}</b>` : ''}${st.era === 'before' ? ' · Before the record: no sources yet. More context needed.' : ''}`;
}
function belowHTML() {
  const st = S.data.stories[0];
  return `<div><h2>Stories</h2><a class="story-feature" href="${href({ view: 'story', story: st.id, scene: null })}"><img src="${media('P045-I01')}" alt="Jessie Wynona Lamborn"><div><span class="kind">Life story · 5 scenes</span><h3>${esc(st.title)}</h3><p>${esc(st.opening.split('. ').slice(0, 2).join('. '))}.</p></div></a></div>
    <div><h2>Research notes</h2><ul class="notes-list"><li><a href="${href({ view: 'stories' })}#phebe"><b>Two dates for Phebe</b><span>Research note · draft · what Will’s letter adds</span></a></li><li><a href="${href({ view: 'stories' })}#hand"><b>Reading Wynona’s hand</b><span>How transcriptions are made and checked</span></a></li></ul></div>
    <div><h2>About</h2><ul class="notes-list"><li><a href="${href({ view: 'about' })}#friends"><b>What a Friends meeting is</b><span>Quakers, meetings and plain dates</span></a></li><li><a href="${href({ view: 'about' })}#read"><b>How to read the evidence</b><span>Markers, dates, labels and the map</span></a></li></ul></div>`;
}
