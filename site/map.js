// The long, shallow schematic map. Positions are relative and approximate (places[].schematic), never coordinates.
import { S, select } from './store.js';
import { svg, esc, reduceMotion, span } from './lib.js';

const BASE = [0, 0, 1600, 360];
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
  svg('text', { x: 66, y: 250, transform: 'rotate(-84 66 250)', class: 'water' }, msv, 'Susquehanna River');
  svg('path', { d: 'M1500 -700 C1490 0 1530 120 1500 220 C1480 320 1520 420 1510 1100 L2500 1100 L2500 -700 Z', fill: '#BCD1D5' }, msv);
  svg('text', { x: 1530, y: 300, transform: 'rotate(-86 1530 300)', class: 'water' }, msv, 'Delaware River');
  // county lines and labels
  const cl = svg('g', { fill: 'none', stroke: '#9AA59D', 'stroke-width': 1.2, 'stroke-dasharray': '9 6' }, msv);
  svg('path', { d: 'M598 -700 C610 60 586 200 604 1100' }, cl);
  svg('path', { d: 'M1186 -700 C1170 80 1200 220 1180 1100' }, cl);
  svg('path', { d: 'M110 270 C220 256 320 282 470 266', 'stroke-dasharray': '3 5' }, cl);
  for (const [x, t] of [[350, 'LANCASTER COUNTY'], [890, 'CHESTER COUNTY'], [1330, 'PHILADELPHIA AREA']]) svg('text', { x, y: 30, 'text-anchor': 'middle', class: 'county' }, msv, t);
  svg('text', { x: 160, y: 262, class: 'county', style: 'font-size:9.5px' }, msv, 'DRUMORE');
  svg('text', { x: 160, y: 286, class: 'county', style: 'font-size:9.5px' }, msv, 'FULTON');
  // the families' route west, drawn as a journey line
  svg('path', { d: 'M1560 150 C1500 150 1460 160 1412 162 C1200 170 1060 200 880 210 C700 216 480 220 270 214', fill: 'none', stroke: '#2E6273', 'stroke-width': 2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .55 }, msv);
  svg('text', { x: 1020, y: 196, class: 'ps', style: 'font-style:italic' }, msv, 'the families’ route west, 1683–1801');
  // places
  const pg = svg('g', {}, msv);
  for (const p of S.data.places) {
    if (!p.schematic) continue;
    const { x, y, kind } = p.schematic;
    const g = svg('g', { class: 'pl', tabindex: 0, role: 'button', 'aria-label': `${p.label}. ${p.status}` }, pg);
    const inner = svg('g', {}, g);
    svg('circle', { cx: 0, cy: 0, r: 22, class: 'halo' }, inner);
    if (kind === 'building') { svg('path', { d: 'M0 -26c-9 0-15 6-15 15 0 11 15 25 15 25s15-14 15-25c0-9-6-15-15-15z', class: 'pin', transform: 'translate(0 6)' }, inner); svg('circle', { cx: 0, cy: -5, r: 4.5, class: 'pin-dot' }, inner); }
    else if (kind === 'region') svg('ellipse', { cx: 0, cy: 0, rx: 34, ry: 20, class: 'region' }, inner);
    else if (kind === 'unresolved') svg('circle', { cx: 0, cy: 0, r: 8, class: 'unres' }, inner);
    else if (kind === 'offmap') svg('path', { d: 'M-10 -12 L4 0 L-10 12 M2 -12 L16 0 L2 12', class: 'off' }, inner);
    else svg('circle', { cx: 0, cy: 0, r: 14, class: 'area' }, inner);
    const side = LABEL[p.id] || (kind === 'region' ? 'b' : kind === 'offmap' ? 'l' : 'r');
    const lx = side === 'r' ? 22 : side === 'l' ? -22 : 0, anchor = side === 'r' ? 'start' : side === 'l' ? 'end' : 'middle', ly = side === 'b' ? (kind === 'region' ? 34 : 30) : side === 't' ? (kind === 'building' ? -36 : -26) : -1;
    svg('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'pn' }, inner, p.label);
    svg('text', { x: lx, y: ly + 14, 'text-anchor': anchor, class: 'ps' }, inner, ({ building: 'building · site not mapped', community: 'community · area only', region: 'area', unresolved: 'location to confirm', offmap: 'off this drawing' })[kind]);
    markers[p.id] = { g, inner, x, y, kind };
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
    box = [Math.min(...xs) - 120, Math.min(...ys) - 70, Math.max(...xs) - Math.min(...xs) + 380, Math.max(...ys) - Math.min(...ys) + 150];
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
  const unit = (root.clientWidth || 1600) / t[2];
  const showAll = unit > 1.7;
  for (const m of Object.values(markers)) {
    m.inner.setAttribute('transform', `translate(${m.x} ${m.y}) scale(${(1 / unit).toFixed(4)})`);
    const show = showAll || m.kind === 'region' || m.kind === 'offmap' || m.g.classList.contains('sel') || (!eraOnlyNow && m.g.classList.contains('on'));
    m.g.classList.toggle('lbl-hide', !show);
  }
}
function zoomTo(t) {
  clearTimeout(anim);
  const from = vb.slice(), t0 = performance.now(), D = reduceMotion() ? 0 : 420;
  const step = now => { const u = D ? Math.min(1, (now - t0) / D) : 1, e = 1 - Math.pow(1 - u, 3); setVB(from.map((v, i) => v + (t[i] - v) * e)); if (u < 1) anim = setTimeout(() => step(performance.now()), 16); };
  step(t0);
}
export const mapEsc = esc;
