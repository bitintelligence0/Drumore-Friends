// The long, shallow schematic map. Positions are relative and approximate (places[].schematic), never coordinates.
import { S, select } from './store.js';
import { svg, esc, reduceMotion, span } from './lib.js';

const BASE = [0, 0, 1600, 360];
// marker half-sizes in screen px at full size, and each place's preferred label side
const HALF = { building: [16, 21], region: [34, 20], community: [14, 14], unresolved: [9, 9], offmap: [17, 13] };
const LABEL = { 'fernglen-store': 'l', 'meetinghouse': 't', 'friends-cemetery': 'r', 'conowingo-school': 'l', 'drumore-area': 'b', 'fulton-township': 'b', 'little-britain-area': 'b' };
let root, msv, markers = {}, vb = BASE.slice(), anim, lastKey = '', eraOnlyNow = false;

export function mountMap(container) {
  root = container;
  root.innerHTML = `
    <svg class="mapv" role="group" aria-label="Schematic map of places in the archive. Positions are approximate." preserveAspectRatio="xMidYMid meet"></svg>
    <div class="map-ui">
      <div class="map-title"><b>Where it happened</b><span>From Germantown to Drumore · positions approximate, not to scale</span></div>
      <div class="map-tools"><span class="mchip" title="A drawing made for the site, not a historical map">Drawn · schematic</span><button type="button" class="mapbtn" id="mapReset">Whole map</button></div>
    </div>`;
  msv = root.querySelector('svg');
  draw();
  setVB(fit(BASE.slice()));
  document.fonts?.ready.then(() => setVB(vb));
  root.querySelector('#mapReset').addEventListener('click', () => { lastKey = ''; select(null); });
  new ResizeObserver(() => { lastKey = ''; focus(S.state, true); }).observe(root);
}

function draw() {
  let s = 31; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  svg('rect', { x: -900, y: -700, width: 3400, height: 1800, fill: '#E4E7DC' }, msv);
  const OX = -900, OY = -700, cw = 64, ch = 58, cols = 54, rws = 31, P = [];
  for (let j = 0; j <= rws; j++) { P[j] = []; for (let i = 0; i <= cols; i++) P[j][i] = [OX + i * cw + (r() - .5) * cw * .55, OY + j * ch + (r() - .5) * ch * .55]; }
  const tones = ['#E4E7DC', '#DCE1D2', '#E8EADF', '#DFE4D6'], fg = svg('g', { stroke: '#CBD3C3', 'stroke-width': 1 }, msv);
  for (let j = 0; j < rws; j++) for (let i = 0; i < cols; i++) { const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i]; svg('path', { d: `M${a}L${b}L${c}L${d}Z`, fill: tones[Math.floor(r() * 4)] }, fg); }
  // woods
  for (const [x, y, rx, ry] of [[520, 120, 60, 26], [700, 80, 70, 30], [980, 300, 80, 28], [1180, 250, 60, 24], [150, 90, 50, 22], [420, 330, 50, 18]]) {
    let d = ''; for (let a = 0; a <= 12; a++) { const t = a / 12 * Math.PI * 2, k = .78 + r() * .35; d += (a ? 'L' : 'M') + (x + Math.cos(t) * rx * k).toFixed(1) + ' ' + (y + Math.sin(t) * ry * k).toFixed(1); }
    svg('path', { d: d + 'Z', fill: '#CDD7C4', stroke: '#BCC8B2', 'stroke-width': 1 }, msv);
  }
  // rivers: the Susquehanna to the west, the Delaware to the east
  svg('path', { d: 'M-900 -700 H40 C70 -300 92 -60 104 40 C128 140 70 240 112 330 C138 420 96 600 120 1100 H-900 Z', fill: '#BCD1D5' }, msv);
  svg('text', { x: 66, y: 250, transform: 'rotate(-84 66 250)', class: 'water bgt' }, msv, 'Susquehanna River');
  svg('path', { d: 'M1500 -700 C1490 0 1530 120 1500 220 C1480 320 1520 420 1510 1100 L2500 1100 L2500 -700 Z', fill: '#BCD1D5' }, msv);
  svg('text', { x: 1530, y: 300, transform: 'rotate(-86 1530 300)', class: 'water bgt' }, msv, 'Delaware River');
  // county lines and labels
  const cl = svg('g', { fill: 'none', stroke: '#9AA59D', 'stroke-width': 1.2, 'stroke-dasharray': '9 6' }, msv);
  svg('path', { d: 'M598 -700 C610 60 586 200 604 1100' }, cl);
  svg('path', { d: 'M1186 -700 C1170 80 1200 220 1180 1100' }, cl);
  svg('path', { d: 'M110 270 C220 256 320 282 470 266', 'stroke-dasharray': '3 5' }, cl);
  for (const [x, t] of [[350, 'LANCASTER COUNTY'], [890, 'CHESTER COUNTY'], [1330, 'PHILADELPHIA AREA']]) svg('text', { x, y: 30, 'text-anchor': 'middle', class: 'county bgt' }, msv, t);
  svg('text', { x: 160, y: 262, class: 'county bgt', style: 'font-size:9.5px' }, msv, 'DRUMORE');
  svg('text', { x: 160, y: 286, class: 'county bgt', style: 'font-size:9.5px' }, msv, 'FULTON');
  // the families' route west, drawn as a journey line
  svg('path', { d: 'M1560 150 C1500 150 1460 160 1412 162 C1200 170 1060 200 880 210 C700 216 480 220 270 214', fill: 'none', stroke: '#2E6273', 'stroke-width': 2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .55 }, msv);
  svg('text', { x: 1020, y: 196, class: 'ps bgt', style: 'font-style:italic' }, msv, 'the families’ route west, 1683–1801');
  // places
  const pg = svg('g', {}, msv);
  for (const p of S.data.places) {
    if (!p.schematic) continue;
    const { x, y, kind } = p.schematic;
    const g = svg('g', { class: 'pl', tabindex: 0, role: 'button', 'aria-label': `${p.label}. ${p.status}` }, pg);
    // inner is in screen pixels; shape scales down a little when the map is zoomed far out, labels never do
    const inner = svg('g', {}, g), shape = svg('g', {}, inner);
    svg('circle', { cx: 0, cy: 0, r: 22, class: 'halo' }, shape);
    if (kind === 'building') { svg('path', { d: 'M0 -26c-9 0-15 6-15 15 0 11 15 25 15 25s15-14 15-25c0-9-6-15-15-15z', class: 'pin', transform: 'translate(0 6)' }, shape); svg('circle', { cx: 0, cy: -5, r: 4.5, class: 'pin-dot' }, shape); }
    else if (kind === 'region') svg('ellipse', { cx: 0, cy: 0, rx: 34, ry: 20, class: 'region' }, shape);
    else if (kind === 'unresolved') svg('circle', { cx: 0, cy: 0, r: 8, class: 'unres' }, shape);
    else if (kind === 'offmap') svg('path', { d: 'M-10 -12 L4 0 L-10 12 M2 -12 L16 0 L2 12', class: 'off' }, shape);
    else svg('circle', { cx: 0, cy: 0, r: 14, class: 'area' }, shape);
    const sub = ({ building: 'building · site not mapped', community: 'community · area only', region: 'area', unresolved: 'location to confirm', offmap: 'off this drawing' })[kind];
    const pn = svg('text', { class: 'pn' }, inner, p.label), ps = svg('text', { class: 'ps' }, inner, sub);
    markers[p.id] = { g, inner, shape, pn, ps, x, y, kind, label: p.label, sub, half: HALF[kind] || HALF.community, pref: LABEL[p.id] || (kind === 'region' ? 'b' : kind === 'offmap' ? 'l' : 'r') };
    const go = () => select('place', p.id);
    g.addEventListener('click', go); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
}

const eraRange = (st) => st.era === 'all' ? [1600, 2027] : [S.idx.eras[st.era].start, S.idx.eras[st.era].end + 1];
function inRange(ev, [a, b]) { const s = span(ev.date); return s && s[1] >= a && s[0] <= b; }
export function placesFor(st) {
  const E = S.idx.events;
  if (st.place) return { on: [st.place], sel: st.place };
  if (st.event) return { on: E[st.event].placeIds, sel: null };
  if (st.person) { const p = S.idx.people[st.person]; return { on: [...new Set([...(p.placeIds || []), ...p.eventIds.flatMap(id => E[id]?.placeIds || [])])], sel: null }; }
  const r = eraRange(st);
  return { on: st.era === 'all' ? [] : [...new Set(S.data.events.filter(e => inRange(e, r)).flatMap(e => e.placeIds))], sel: null, eraOnly: true };
}

export function focus(st, force) {
  if (!msv) return;
  const { on, sel, eraOnly } = placesFor(st);
  const hasSel = !!(st.place || st.event || st.person);
  eraOnlyNow = !!eraOnly;
  for (const [id, m] of Object.entries(markers)) {
    m.g.classList.toggle('on', on.includes(id));
    m.g.classList.toggle('sel', id === sel);
    m.g.classList.toggle('dim', (hasSel || (eraOnly && on.length)) && !on.includes(id));
  }
  const key = [st.era, st.place, st.event, st.person, root.clientWidth, root.clientHeight].join('|');
  if (key === lastKey && !force) { setVB(vb); return; }
  lastKey = key;
  const pts = on.map(id => markers[id]).filter(Boolean).filter(m => m.kind !== 'offmap' || on.length === 1);
  let box;
  if (!pts.length) box = BASE.slice();
  else {
    const xs = pts.map(m => m.x), ys = pts.map(m => m.y);
    box = [Math.min(...xs) - 190, Math.min(...ys) - 90, Math.max(...xs) - Math.min(...xs) + 380, Math.max(...ys) - Math.min(...ys) + 180];
  }
  zoomTo(fit(box));
}

function fit([x, y, w, h]) {
  const A = (root.clientWidth || 1600) / (root.clientHeight || 360);
  w = Math.max(w, 420); h = Math.max(h, 180);
  if (w / h > A) { const nh = w / A; y -= (nh - h) / 2; h = nh; } else { const nw = h * A; x -= (nw - w) / 2; w = nw; }
  return [x, y, w, h];
}
function setVB(t) {
  vb = t; msv.setAttribute('viewBox', t.map(v => v.toFixed(1)).join(' '));
  const unit = (root.clientWidth || 1600) / t[2], ms = Math.min(1, Math.max(.55, unit));
  for (const m of Object.values(markers)) {
    m.inner.setAttribute('transform', `translate(${m.x} ${m.y}) scale(${(1 / unit).toFixed(4)})`);
    m.shape.setAttribute('transform', `scale(${ms.toFixed(3)})`);
  }
  layoutLabels(unit, ms);
}

// Place every label on a free side of its marker, inside the map and clear of the overlays and other markers.
// Selected and related places go first; a label that fits nowhere drops its second line, then hides
// (the marker keeps its accessible name, and the place cards below the map list every place).
const ctx = document.createElement('canvas').getContext('2d');
const textW = (t, font) => { ctx.font = font; return ctx.measureText(t).width; };
const FONT_UI = getComputedStyle(document.documentElement).getPropertyValue('--f-ui') || 'sans-serif';
function layoutLabels(unit, ms) {
  const W = root.clientWidth, H = root.clientHeight;
  if (!W || !H) return;
  const rr = root.getBoundingClientRect(), pad = 6;
  const blocks = [...root.querySelectorAll('.map-title, .map-tools')].map(el => { const b = el.getBoundingClientRect(); return [b.left - rr.left - pad, b.top - rr.top - pad, b.right - rr.left + pad, b.bottom - rr.top + pad]; });
  const list = Object.values(markers).map(m => {
    const sx = (m.x - vb[0]) * unit, sy = (m.y - vb[1]) * unit, hw = m.half[0] * ms, hh = m.half[1] * ms;
    return { m, sx, sy, hw, hh, box: [sx - hw, sy - hh, sx + hw, sy + hh], vis: sx > -hw && sx < W + hw && sy > -hh && sy < H + hh };
  });
  const solid = list.filter(o => o.vis && o.m.kind !== 'region');  // region outlines are areas, labels may cross them
  const has = (o, c) => o.m.g.classList.contains(c);
  const rank = o => has(o, 'sel') ? 0 : has(o, 'on') && !eraOnlyNow ? 1 : has(o, 'on') ? 2 : has(o, 'dim') ? 5 : o.m.kind === 'region' ? 3 : 4;
  const kindRank = { building: 0, region: 1 };
  list.sort((a, b) => rank(a) - rank(b) || (kindRank[a.m.kind] ?? 2) - (kindRank[b.m.kind] ?? 2) || a.sx - b.sx);
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const placed = [];
  const free = (r, self) => r[0] >= 4 && r[1] >= 4 && r[2] <= W - 4 && r[3] <= H - 4 && !blocks.some(b => hit(r, b)) && !placed.some(b => hit(r, b)) && !solid.some(o => o !== self && hit(r, o.box));
  for (const o of list) {
    const { m } = o; let got = null;
    if (o.vis) {
      const wn = textW(m.label, `600 13px ${FONT_UI}`), ws = textW(m.sub, `400 11px ${FONT_UI}`);
      const sides = [m.pref, ...['r', 'l', 'b', 't'].filter(x => x !== m.pref)];
      for (const two of [true, false]) {
        const w = Math.max(wn, two ? ws : 0), h = two ? 30 : 17;
        for (const side of sides) {
          const gx = o.hw + 6, gy = o.hh + 4;
          const c = side === 'r' ? { x: gx, y: 0, a: 'start', r: [o.sx + gx, o.sy - 12, o.sx + gx + w, o.sy - 12 + h] }
            : side === 'l' ? { x: -gx, y: 0, a: 'end', r: [o.sx - gx - w, o.sy - 12, o.sx - gx, o.sy - 12 + h] }
            : side === 'b' ? { x: 0, y: gy + 12, a: 'middle', r: [o.sx - w / 2, o.sy + gy, o.sx + w / 2, o.sy + gy + h] }
            : { x: 0, y: -gy - h + 12, a: 'middle', r: [o.sx - w / 2, o.sy - gy - h, o.sx + w / 2, o.sy - gy] };
          if (free(c.r, o)) { got = { ...c, two }; break; }
        }
        if (got) break;
      }
    }
    m.g.classList.toggle('lbl-hide', !got);
    m.g.classList.toggle('lbl-one', !!got && !got.two);
    if (!got) continue;
    placed.push(got.r);
    for (const [t, dy] of [[m.pn, 0], [m.ps, 14]]) { t.setAttribute('x', got.x); t.setAttribute('y', got.y + dy); t.setAttribute('text-anchor', got.a); }
  }
  // the drawing's own county, river and route names give way to place labels and markers
  const taken = [...placed, ...solid.map(o => o.box)];
  for (const t of msv.querySelectorAll('.bgt')) {
    t.classList.remove('bg-hide');
    const b = t.getBoundingClientRect(), r = [b.left - rr.left, b.top - rr.top, b.right - rr.left, b.bottom - rr.top];
    t.classList.toggle('bg-hide', taken.some(x => hit(r, x)));
  }
}
function zoomTo(t) {
  clearTimeout(anim);
  const from = vb.slice(), t0 = performance.now(), D = reduceMotion() ? 0 : 420;
  const step = now => { const u = D ? Math.min(1, (now - t0) / D) : 1, e = 1 - Math.pow(1 - u, 3); setVB(from.map((v, i) => v + (t[i] - v) * e)); if (u < 1) anim = setTimeout(() => step(performance.now()), 16); };
  step(t0);
}
export const mapEsc = esc;
