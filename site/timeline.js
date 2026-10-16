// Explore → Timeline on desktop: lifelines on the era-weighted scale, seen through a window you can move.
// The window is a stretch of the global scale. Earlier/Later step by era; drag, swipe, wheel, pinch, keys and
// the chevrons move or zoom it. It is kept in the URL as `era` (and `span` when it isn't exactly one era).
import { S, go, select, relOf } from './store.js';
import { svg, esc, fmtDate, span, mid, svgFace, faceHTML, lifeText, personName, reduceMotion } from './lib.js';

const PERSON_ORDER = ['smedley-lamborn', 'margaret-bolton-lamborn', 'george-lamborn', 'sarah-coates-lamborn', 'will-lamborn', 'phebe-barnard-lamborn', 'wynona-lamborn', 'lib-hambleton', 'thomas-hambleton', 'alice-shoemaker', 'william-shoemaker', 'winona-shoemaker', 'lulu-shoemaker', 'isaac-bolton-shoemaker', 'early-earnhart'];
const FAMILIES = ['Lamborn', 'Hambleton', 'Shoemaker', 'Earnhart'];
const EAST = new Set(['germantown', 'overseas', 'chester-county', 'london-grove', 'east-marlborough', 'brandywine-area', 'gwynedd']);

// Sizes in CSS pixels; the SVG is drawn 1:1 so these hold at every width.
export const ROW = 60;            // row pitch: more people make the timeline taller, never tighter
const LANE_W = 140;               // lane header column
const BUB = 18, FACE = 16.5;      // portrait bubble and face radius
const CHEV = 12, CHEV_GAP = 10;   // chevron depth, and the clear space between it and the bubble
const L_PLOT = LANE_W + 4 + 2 * BUB + CHEV_GAP + CHEV + 6;   // where the plot starts (bubble for a life that began earlier sits left of it)
const PAD_R = 30;
const EV_LANE_H = 108;
const AXIS_H = 52;

// ---------- the global era-weighted scale ----------
let GS = null;
export function scale() {
  if (GS) return GS;
  let acc = 0;
  const eras = S.data.eras.slice().sort((a, b) => a.start - b.start).map(e => { const o = { ...e, y0: e.start, y1: e.end + 1, g0: acc, g1: acc + e.weight }; acc += e.weight; return o; });
  const last = eras[eras.length - 1];
  const g = (y) => { if (y <= eras[0].y0) return 0; if (y >= last.y1) return acc; const e = eras.find(e => y < e.y1); return e.g0 + (y - e.y0) / (e.y1 - e.y0) * (e.g1 - e.g0); };
  const yr = (v) => { if (v <= 0) return eras[0].y0; if (v >= acc) return last.y1; const e = eras.find(e => v < e.g1); return e.y0 + (v - e.g0) / (e.g1 - e.g0) * (e.y1 - e.y0); };
  const first = eras.find(e => e.id !== 'before') || eras[0];
  const all = [first.g0, acc];
  GS = { eras, W: acc, g, yr, all, min: Math.min(...eras.map(e => e.weight)), max: all[1] - all[0] };
  return GS;
}
const near = (a, b) => Math.abs(a - b) < 1e-6;
export function windowOf(st) {
  const { eras, g, all } = scale();
  if (st.span) { const [a, b] = st.span.split('-').map(Number); return fit([g(a), g(b + 1)]); }   // span years are inclusive
  if (st.era === 'all') return all.slice();
  const e = eras.find(e => e.id === st.era) || eras.find(e => e.id === 'diaries');
  return [e.g0, e.g1];
}
export const yearsOf = ([a, b]) => { const { yr } = scale(); return [yr(a), yr(b)]; };
function spanStr(win) { const [a, b] = yearsOf(win).map(Math.round); return `${a}-${Math.max(a, b - 1)}`; }
// what the URL should say for a window: an era if it is exactly one, otherwise the era at its center plus `span`
function stateOf([a, b]) {
  const { eras, all, yr } = scale();
  if (near(a, all[0]) && near(b, all[1])) return { era: 'all', span: null };
  const ex = eras.find(e => near(a, e.g0) && near(b, e.g1)); if (ex) return { era: ex.id, span: null };
  const c = yr((a + b) / 2), ce = eras.find(e => c < e.y1) || eras[eras.length - 1];
  return { era: ce.id, span: spanStr([a, b]) };
}
function fit([a, b]) {
  const { W, min, max } = scale();
  const s = Math.min(Math.max(b - a, min), max);
  if (!near(s, b - a)) { const c = (a + b) / 2; a = c - s / 2; b = c + s / 2; }
  if (a < 0) { b -= a; a = 0; }
  if (b > W) { a -= b - W; b = W; }
  return [Math.max(0, a), Math.min(W, b)];
}
// Earlier/Later: the era before or after the one in view (the era at the window's center when it isn't exactly one).
// All eras starts at the first recorded era, so Earlier from there is Before the record and there is nothing later.
export function stepEra(win, dir) {
  const { eras } = scale(), st = stateOf(win);
  if (st.era === 'all') return dir < 0 ? [...eras].reverse().find(e => e.g0 < win[0] - 1e-6) || null : null;
  const i = eras.findIndex(e => e.id === st.era);
  return eras[i + dir] || null;
}

// ---------- lives ----------
export function extent(p) {
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(Boolean);
  const anchors = evs.flatMap(e => span(e.date) || []);
  const l = p.lifeline; if (!l) return null;
  if (l.start.kind === 'known' || l.start.kind === 'about') anchors.push(l.start.year + .5);
  if (l.end.kind === 'known' || l.end.kind === 'about') anchors.push(l.end.year + .5);
  if (l.end.kind === 'conflict') l.end.readings.forEach(r => anchors.push(r.year + .5));
  if (!anchors.length) return null;
  const lo = Math.min(...anchors), hi = Math.max(...anchors);
  const start = l.start.kind === 'known' ? { y: l.start.year + .5 } : l.start.kind === 'about' ? { y: l.start.year + .5, about: true } : { y: lo - 8, fade: true, first: lo };
  let end;
  if (l.end.kind === 'known') end = { y: l.end.year + .5, known: true };
  else if (l.end.kind === 'about') end = { y: l.end.year + .5, about: true };
  else if (l.end.kind === 'conflict') { const ys = l.end.readings.map(r => r.year + .5); end = { y: Math.max(...ys), conflict: [Math.min(...ys), Math.max(...ys)] }; }
  else end = { y: hi + 10, fade: true, last: hi };
  return { start, end };
}
const evLane = (e) => !e.personSubjectIds.length ? ((e.date.sortYear < 1795 || e.placeIds.some(p => EAST.has(p))) ? 'ancestors' : 'community') : null;
export const inRange = (e, [a, b]) => { const s = span(e.date); return s && s[1] >= a && s[0] <= b; };
function orderedPeople() {
  const rank = (p) => { const i = PERSON_ORDER.indexOf(p.id); return i < 0 ? PERSON_ORDER.length : i; };
  return S.data.people.map(p => ({ p, x: extent(p) })).filter(o => o.x).sort((a, b) => rank(a.p) - rank(b.p) || a.x.start.y - b.x.start.y);
}
// the dated moment nearest each end of a life, for the honest-ending labels
function boundMoment(p, which) {
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(e => e && span(e.date)).sort((a, b) => mid(a.date) - mid(b.date));
  const e = which === 'end' ? evs[evs.length - 1] : evs[0];
  return e ? fmtDate(e.date, e) : null;
}
function datesLine(p) {
  const l = p.lifeline || {}, s = l.start || {}, e = l.end || {};
  const a = s.kind === 'known' ? `born ${s.year}` : s.kind === 'about' ? `born about ${s.year}` : 'no birth date in the archive yet';
  const b = e.kind === 'known' ? `died ${e.year}` : e.kind === 'about' ? `died about ${e.year}` : e.kind === 'conflict' ? `died ${e.readings.map(r => r.label).join(' or ')}` : 'no death date in the archive yet';
  return `${a} · ${b}`;
}

// ---------- text measuring ----------
const ctx2d = document.createElement('canvas').getContext('2d');
function textW(text, font) { ctx2d.font = font; return ctx2d.measureText(text).width; }
const F_ERA = '600 11px "Public Sans", sans-serif', F_NAME = '500 13.5px "Public Sans", sans-serif', F_EVL = '400 12px "Public Sans", sans-serif', F_LANE = '400 16px Gelasio, Georgia, serif';
function wrap(text, font, max) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && textW(t, font) > max) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- module state ----------
let H = null;        // DOM: root, wrap, svg, card, nav buttons
let VIEW = null;     // current window [g0, g1] on the global scale
let LAY = null;      // lanes and rows for the settled window
let T = null;        // the drawn frame: rows, knots, labels, X
let anim = 0, frame = 0, commitT = 0, swallowUntil = 0;
const faces = new Map();
let edge = false; try { edge = localStorage.getItem('df-tl-edge') === '1'; } catch {}

export function mountTimeline(host) {
  host.innerHTML = `<div class="tl-head"><span class="tl-hint">Drag or use ← → to move through time · ${/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl'} + scroll, pinch or + − to zoom</span>
      <label class="tl-edge"><input type="checkbox" ${edge ? 'checked' : ''}> Show lives to the edge of the window</label></div>
    <div class="tl-wrap" tabindex="0" role="group" aria-label="Timeline. Left and right arrow keys move through time, plus and minus zoom, Home and End jump to the first or last era. Tab to a line or marker and press Enter to select it."><svg class="tl"></svg><div class="tl-card" hidden></div></div>
    <div class="tl-nav">
      <button type="button" class="tl-step" data-step="-1"><span aria-hidden="true">←</span><span>Earlier<small></small></span></button>
      <div class="tl-zoom" role="group" aria-label="Zoom"><button type="button" data-zoom="1.6" aria-label="Zoom out">−</button><span class="tl-range num" aria-live="polite"></span><button type="button" data-zoom="0.625" aria-label="Zoom in">+</button></div>
      <button type="button" class="tl-step" data-step="1"><span>Later<small></small></span><span aria-hidden="true">→</span></button>
    </div>`;
  H = { root: host, wrap: host.querySelector('.tl-wrap'), svg: host.querySelector('svg.tl'), card: host.querySelector('.tl-card'), steps: [...host.querySelectorAll('[data-step]')], range: host.querySelector('.tl-range'), zooms: [...host.querySelectorAll('[data-zoom]')] };
  VIEW = null; LAY = null; T = null;
  H.root.querySelector('.tl-edge input').addEventListener('change', (e) => { edge = e.target.checked; try { localStorage.setItem('df-tl-edge', edge ? '1' : '0'); } catch {} draw(); });
  H.steps.forEach(b => b.addEventListener('click', () => { const e = stepEra(VIEW, +b.dataset.step); if (e) go({ era: e.id, span: null }); }));
  H.zooms.forEach(b => b.addEventListener('click', () => zoomTo(+b.dataset.zoom)));
  wire();
  new ResizeObserver(() => { if (VIEW) { relayout(); draw(); } }).observe(H.wrap);
  if (document.fonts) document.fonts.ready.then(() => VIEW && draw());
}

// called on every state change while Explore shows the timeline
export function updateTimeline(st) {
  if (!H) return;
  const target = windowOf(st);
  const same = VIEW && (st.span ? st.span === spanStr(VIEW) : near(VIEW[0], target[0]) && near(VIEW[1], target[1]));
  if (!VIEW) { VIEW = target; relayout(); draw(); return; }
  if (same) { if (relayout()) draw(); else apply(); return; }
  travel(target, +getVar('--t-travel') || 420);
}

// ---------- moving the window ----------
const getVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().replace('ms', '');
let easeFn = null;
function ease(x) {
  if (!easeFn) { const m = (getVar('--ease').match(/[-\d.]+/g) || [.2, .7, .2, 1]).map(Number); easeFn = bezier(...m); }
  return easeFn(x);
}
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return sy(Math.min(1, Math.max(0, t))); };
}
// Travel: at most 420ms with --ease; under reduced motion, cut with a 120ms crossfade.
let travelEnd = 0;
const stopTravel = () => { cancelAnimationFrame(anim); clearTimeout(travelEnd); };
function travel(to, ms, after) {
  cancelAnimationFrame(anim); clearTimeout(travelEnd);
  const from = VIEW.slice();
  if (reduceMotion() || !ms || document.hidden) { VIEW = to; relayout(); draw(); if (!document.hidden) H.svg.animate?.([{ opacity: .35 }, { opacity: 1 }], { duration: 120 }); after?.(); return; }
  LAY = { ...layout(to), w: H.wrap.clientWidth };
  const t0 = performance.now();
  // a background tab may starve requestAnimationFrame; the timer lands the window regardless
  const finish = () => { cancelAnimationFrame(anim); clearTimeout(travelEnd); VIEW = to; draw(); after?.(); };
  const step = (now) => {
    const k = ease(Math.min(1, (now - t0) / ms));
    VIEW = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    draw();
    if (k < 1 && now - t0 < ms) anim = requestAnimationFrame(step); else finish();
  };
  anim = requestAnimationFrame(step);
  travelEnd = setTimeout(finish, ms + 120);
}
function commit(push, delay = 0) {
  clearTimeout(commitT);
  const run = () => { const s = stateOf(VIEW); if (s.era === S.state.era && s.span === S.state.span) { if (relayout()) draw(); return; } go(s, { replace: !push }); };
  if (delay) commitT = setTimeout(run, delay); else run();
}
const plotW = () => Math.max(1, H.wrap.clientWidth - L_PLOT - PAD_R);
function panBy(dg) { const s = VIEW[1] - VIEW[0]; VIEW = fit([VIEW[0] + dg, VIEW[0] + dg + s]); }
function gAtClient(clientX) { const r = H.svg.getBoundingClientRect(); return VIEW[0] + (clientX - r.left - L_PLOT) / plotW() * (VIEW[1] - VIEW[0]); }
function zoomAround(f, anchor) {
  const { min, max } = scale(), s = VIEW[1] - VIEW[0], ns = Math.min(Math.max(s * f, min), max);
  const a = anchor - (anchor - VIEW[0]) * ns / s;
  return fit([a, a + ns]);
}
function zoomTo(f) { travel(zoomAround(f, (VIEW[0] + VIEW[1]) / 2), +getVar('--t-move') || 240, () => commit(false)); }
function panStep(dir, frac = .5) { const s = VIEW[1] - VIEW[0]; travel(fit([VIEW[0] + dir * s * frac, VIEW[1] + dir * s * frac]), +getVar('--t-move') || 240, () => commit(false)); }
const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); };

function wire() {
  const { wrap, svg: s } = H;
  // drag (mouse) and swipe (touch) pan; two pointers pinch to zoom
  const pts = new Map(); let drag = null, pinch = null;
  s.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const t = e.target.closest('.ln,.kn'); if (t) t.classList.add('pressed');
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, win: VIEW.slice(), anchor: gAtClient((a.x + b.x) / 2) };
      drag = null; stopTravel(); hideCard();
      for (const id of pts.keys()) try { s.setPointerCapture(id); } catch {}
      return;
    }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, win: VIEW.slice(), moved: false };
  });
  s.addEventListener('pointermove', (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      VIEW = pinch.win; VIEW = zoomAround(pinch.d / d, pinch.anchor); schedule(); return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      drag.moved = true; stopTravel(); hideCard(); wrap.classList.add('panning');
      s.querySelectorAll('.pressed').forEach(n => n.classList.remove('pressed'));
      try { s.setPointerCapture(e.pointerId); } catch {}
    }
    const span = drag.win[1] - drag.win[0], dg = -dx / plotW() * span;
    VIEW = fit([drag.win[0] + dg, drag.win[1] + dg]); schedule();
  });
  const end = (e) => {
    pts.delete(e.pointerId);
    s.querySelectorAll('.pressed').forEach(n => n.classList.remove('pressed'));
    if (pinch) { if (pts.size < 2) { pinch = null; swallowUntil = performance.now() + 400; commit(false); } return; }
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) { swallowUntil = performance.now() + 80; wrap.classList.remove('panning'); commit(false); }
    else if (e.type === 'pointerup' && e.pointerType === 'touch' && e.target.closest('.ln,.kn,[data-chev]')) tapBuzz();
    drag = null;
  };
  s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end);
  // a drag ends with a click on whatever is under the pointer; swallow it
  wrap.addEventListener('click', (e) => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
  // wheel: with a modifier (or a trackpad pinch, which arrives as ctrl+wheel) zoom at the pointer; sideways scroll pans
  wrap.addEventListener('wheel', (e) => {
    const zoom = e.ctrlKey || e.metaKey, side = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2 || e.shiftKey;
    if (!zoom && !side) return;
    e.preventDefault(); stopTravel(); hideCard();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (zoom) VIEW = zoomAround(Math.exp(e.deltaY * unit * .01), gAtClient(e.clientX));
    else panBy(((e.shiftKey && !e.deltaX) ? e.deltaY : e.deltaX) * unit / plotW() * (VIEW[1] - VIEW[0]));
    schedule(); commit(false, 260);
  }, { passive: false });
  // keyboard: ←/→ pan, +/− zoom, Home/End first and last era
  H.root.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.matches('input')) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); panStep(k === 'ArrowLeft' ? -1 : 1, .25); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomTo(.625); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomTo(1.6); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); const eras = scale().eras, t = k === 'Home' ? eras[0] : eras[eras.length - 1]; go({ era: t.id, span: null }); }
    else if ((k === 'Enter' || k === ' ') && e.target.closest('.ln,.kn')) { e.preventDefault(); e.target.closest('.kn,.ln').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  // one click handler for everything drawn
  s.addEventListener('click', (e) => {
    const t = e.target.closest('[data-chev],.kn,.ln,.bgclick');
    if (!t) return;
    if (t.dataset.chev) { e.stopPropagation(); return panStep(+t.dataset.chev, .5); }
    if (t.classList.contains('kn')) return select('event', t.dataset.ev);
    if (t.classList.contains('ln')) return select('person', t.dataset.person);
    if (t.classList.contains('bgclick')) go({ year: Math.round(scale().yr(gAtClient(e.clientX)) - .5) }, { replace: true });
  });
  // hover and focus feedback: a preview card
  s.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch' || drag?.moved || pinch) return; const t = cardTarget(e.target); if (t) showCard(t, e.clientX, e.clientY); else hideCard(); });
  s.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && !H.card.hidden && !drag?.moved) placeCard(e.clientX, e.clientY); });
  s.addEventListener('pointerleave', hideCard);
  s.addEventListener('focusin', (e) => { const t = cardTarget(e.target); if (!t) return; const r = (t.querySelector('.bub,.o') || t).getBoundingClientRect(); showCard(t, r.right, r.bottom); });
  s.addEventListener('focusout', hideCard);
}
const tapBuzz = () => { if ('vibrate' in navigator) try { navigator.vibrate(10); } catch {} };
export { tapBuzz };

// ---------- preview card ----------
const cardTarget = (n) => n.closest('[data-tip],[data-chev],.kn,.ln');
function cardHTML(t) {
  if (t.dataset.chev) {
    const dir = +t.dataset.chev, e = stepEra(VIEW, dir), p = S.idx.people[t.closest('.ln')?.dataset.person];
    return `<b>${dir < 0 ? '← Earlier' : 'Later →'}</b><span>${p ? `${esc(p.shortName)}’s line continues ${dir < 0 ? 'before' : 'after'} this window.` : ''}</span><em>Click to move ${dir < 0 ? 'back' : 'on'} in time${e ? `, toward ${esc(e.label)}` : ''}</em>`;
  }
  if (t.dataset.tip) {
    const p = S.idx.people[t.closest('.ln').dataset.person], endTip = t.dataset.tip === 'end', m = boundMoment(p, endTip ? 'end' : 'start');
    return `<b>${endTip ? 'No death date in the archive yet' : 'No birth date in the archive yet'}</b><span>${esc(p.shortName)}’s line ${endTip ? 'fades out after' : 'fades in before'} the ${endTip ? 'last' : 'first'} dated moment${m ? `, ${esc(m)}` : ''}.${edge ? ' Dotted to the edge of the window by your choice.' : ''}</span>`;
  }
  if (t.classList.contains('kn')) {
    const e = S.idx.events[t.dataset.ev];
    return `<span class="datel">${esc(fmtDate(e.date, e))}</span><b>${esc(e.title)}</b><span><i class="ring"></i>Reported${e.conflict ? ' · sources disagree' : ''}</span><em>Click to open</em>`;
  }
  const p = S.idx.people[t.dataset.person];
  return `<div class="tc-p">${faceHTML(p.id)}<div><b>${esc(p.displayName)}</b>${p.relationToWynona && p.id !== 'wynona-lamborn' ? `<span class="rel">${esc(p.relationToWynona)}</span>` : ''}<span>${esc(datesLine(p))}</span></div></div><em>${S.state.person === p.id ? 'Selected · shown in the panel' : 'Click to follow'}</em>`;
}
let cardFor = null;
function showCard(t, x, y) { if (cardFor !== t) { cardFor = t; H.card.innerHTML = cardHTML(t); } H.card.hidden = false; placeCard(x, y); }
function placeCard(x, y) {
  const r = H.wrap.getBoundingClientRect(), c = H.card;
  let left = x - r.left + 16, top = y - r.top + 18;
  if (left + c.offsetWidth > r.width - 8) left = Math.max(8, x - r.left - c.offsetWidth - 16);
  if (top + c.offsetHeight > r.height - 8) top = Math.max(8, y - r.top - c.offsetHeight - 14);
  c.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
function hideCard() { if (H) { H.card.hidden = true; cardFor = null; } }

// ---------- layout: which lanes and rows a window shows ----------
function layout(win) {
  const rg = yearsOf(win);
  const people = orderedPeople().filter(o => Math.min(o.x.end.y, rg[1]) - Math.max(o.x.start.y, rg[0]) >= Math.min(2, (rg[1] - rg[0]) / 20));
  const lanes = [];
  for (const [id, label, sub] of [['ancestors', 'Ancestors and migration', 'before Drumore'], ['community', 'Meeting and community', 'no single person']]) {
    const list = S.data.events.filter(e => evLane(e) === id);
    if (list.some(e => inRange(e, rg))) lanes.push({ type: 'events', id, label, sub, list });
  }
  const fams = [...FAMILIES, ...new Set(people.map(o => o.p.family).filter(f => f && !FAMILIES.includes(f)))];
  for (const fam of fams) { const list = people.filter(o => o.p.family === fam); if (list.length) lanes.push({ type: 'people', id: fam, label: fam, list }); }
  return { lanes, key: lanes.map(l => l.id + ':' + (l.type === 'people' ? l.list.map(o => o.p.id).join(',') : '')).join('|') };
}
// recompute the layout for the settled window; true if it changed
function relayout() {
  const next = layout(VIEW);
  if (LAY && LAY.key === next.key && LAY.w === H.wrap.clientWidth) return false;
  LAY = { ...next, w: H.wrap.clientWidth };
  return true;
}

// ---------- drawing ----------
function draw() {
  if (!H || !VIEW || !LAY) return;
  const w = H.wrap.clientWidth; if (!w) return;
  // a redraw replaces every element: carry focus and the preview card over to their redrawn twins
  const keep = document.activeElement && H.svg.contains(document.activeElement) ? selectorOf(document.activeElement) : null;
  const cardSel = cardFor && !H.card.hidden ? selectorOf(cardFor) : null;
  build(w);
  apply(S.state);
  navState();
  if (keep) { const n = H.svg.querySelector(keep); (n || H.wrap).focus({ preventScroll: true }); }
  if (cardFor) { const n = cardSel && H.svg.querySelector(cardSel); if (n) cardFor = n; else hideCard(); }
}
function selectorOf(n) {
  const row = n.closest('.ln'), rs = row ? `.ln[data-person="${row.dataset.person}"]` : '';
  if (n.dataset.ev) return `${rs} .kn[data-ev="${n.dataset.ev}"]`.trim();
  if (n.dataset.tip) return `${rs} [data-tip="${n.dataset.tip}"]`;
  if (n.dataset.chev) return `${rs} [data-chev="${n.dataset.chev}"]`;
  return rs || null;
}

function build(w) {
  const s = H.svg; s.textContent = '';
  const { g, yr, eras } = scale(), [g0, g1] = VIEW;
  const L = L_PLOT, Rx = w - PAD_R, rg = [yr(g0), yr(g1)];
  const X = (y) => L + (g(y) - g0) / (g1 - g0) * (Rx - L);
  const bandG = svg('g', {}, s);
  const bgRect = svg('rect', { x: L, y: 0, width: Rx - L, height: 10, class: 'bgclick' }, s);
  // lines before labels: link lines, rows, event leaders and knots, then every label on top
  const bg = svg('g', {}, s), lg = svg('g', {}, s), pg = svg('g', {}, s), leadG = svg('g', {}, s), eg = svg('g', {}, s), labG = svg('g', {}, s), ltG = svg('g', {}, s), yg = svg('g', {}, s);
  const rows = {}, knots = [], labels = [];
  let y = 8;
  LAY.lanes.forEach((lane, i) => {
    const top = y;
    const head = wrap(lane.label, F_LANE, LANE_W - 22);
    const headH = 24 + head.length * 20 + (lane.sub ? 14 : 0);
    if (lane.type === 'events') {
      const base = top + 30, rowsY = [base + 30, base + 48, base + 66], lastEnd = [-1e9, -1e9, -1e9];
      const items = lane.list.filter(e => inRange(e, rg)).sort((a, b) => mid(a.date) - mid(b.date));
      for (const e of items) {
        const k = knot(eg, e, base, X, rg); knots.push(k);
        const x = Math.min(Math.max(k.x, L), Rx);
        const txt = e.title.length > 40 ? e.title.slice(0, 38) + '…' : e.title, tw = textW(txt, F_EVL);
        // labels hang below their knot, left-aligned, or right-aligned near the right edge; never over a knot
        const right = x - 4 + tw > Rx + 8, lx = right ? x + 4 - tw : x - 4;
        const r = lastEnd.findIndex(end => lx > end + 10);
        if (r < 0 || lx < L - 8) continue;
        lastEnd[r] = lx + tw;
        svg('line', { x1: x, x2: x, y1: base + 8, y2: rowsY[r] - 12, class: 'leader' }, leadG);
        const t = svg('text', { x: right ? x + 4 : x - 4, y: rowsY[r], class: 'evl s', 'text-anchor': right ? 'end' : 'start' }, labG, txt);
        labels.push([t, e.id]);
      }
      y = top + Math.max(EV_LANE_H, headH);
    } else {
      let ry = top + 14 + ROW / 2;
      for (const o of lane.list) { rows[o.p.id] = { y: ry, ...personRow(pg, o, ry, X, rg, L, Rx, w, knots) }; ry += ROW; }
      y = Math.max(ry - ROW / 2 + 8, top + headH);
    }
    if (i % 2 === 0) svg('rect', { x: 0, y: top, width: w, height: y - top, class: 'eraband' }, bandG);
    head.forEach((ln, j) => svg('text', { x: 16, y: top + 26 + j * 20, class: 'lane' }, bg, ln));
    if (lane.sub) svg('text', { x: 16, y: top + 26 + head.length * 20 - 2, class: 'lane-s' }, bg, lane.sub);
  });
  if (!LAY.lanes.length) { svg('text', { x: L, y: y + 40, class: 'lane-s empty' }, bg, 'No dated people or events in this stretch yet. More context needed.'); y += 72; }
  // axis: ticks per visible era segment, folds where the scale changes, era names underneath
  const axisY = y + 8;
  const segs = eras.filter(e => e.g1 > g0 + 1e-9 && e.g0 < g1 - 1e-9).map(e => { const a = Math.max(e.y0, rg[0]), b = Math.min(e.y1, rg[1]); return { e, a, b, x: X(a), w: X(b) - X(a) }; });
  // ticks keep clear of each other and of the folds; an era name shows only where it fits
  const folds = segs.slice(1).map(sg => sg.x);
  let lastTick = -1e9;
  for (const sg of segs) {
    const yrs = sg.b - sg.a, steps = [1, 2, 5, 10, 25, 50, 100], step = steps.find(k => sg.w / (yrs / k) >= 56) || 100;
    for (let t = Math.ceil(sg.a / step) * step; t < sg.b; t += step) {
      if (t === sg.e.y0 && sg !== segs[0]) continue;
      const x = X(t); if (x < L - 1 || x > Rx + 1) continue;
      svg('line', { x1: x, x2: x, y1: 4, y2: axisY - 4, class: 'grid' }, bg);
      if (x - lastTick < 44 || folds.some(f => Math.abs(f - x) < 22)) continue;
      svg('text', { x, y: axisY + 14, 'text-anchor': 'middle', class: 'tick' }, bg, t); lastTick = x;
    }
    if (sg !== segs[0]) svg('path', { d: `M${sg.x - 3} ${axisY - 2} l3 6 l-3 6 M${sg.x + 1} ${axisY - 2} l3 6 l-3 6`, class: 'fold' }, bg);
    if (textW(sg.e.label.toUpperCase(), F_ERA) + sg.e.label.length * .9 + 14 < sg.w) svg('text', { x: sg.x + 4, y: axisY + 34, class: 'era-l' }, bg, sg.e.label);
  }
  svg('line', { x1: L, x2: Rx, y1: axisY, y2: axisY, class: 'axis' }, bg);
  const Ht = axisY + AXIS_H;
  s.setAttribute('viewBox', `0 0 ${w} ${Ht}`); s.setAttribute('width', w); s.setAttribute('height', Ht);
  bgRect.setAttribute('height', Ht);
  T = { rows, knots, labels, lg, ltG, yg, X, rg, L, Rx, H: Ht, axisY };
  H.root.style.setProperty('--tl-l', L + 'px');
}

function knot(parent, e, y, X, rg) {
  const s = span(e.date), g = svg('g', { class: 'kn', tabindex: 0, role: 'button', 'data-ev': e.id, 'aria-label': `${fmtDate(e.date, e)}: ${e.title}. Reported${e.conflict ? ', sources disagree' : ''}.` }, parent);
  const a = Math.max(s[0], rg[0]), b = Math.min(s[1], rg[1]), x = X((a + b) / 2);
  svg('circle', { cx: x, cy: y, r: 12, class: 'h' }, g);
  if (X(b) - X(a) > 6) svg('rect', { x: X(a), y: y - 3, width: X(b) - X(a), height: 6, rx: 3, class: 'bar' }, g);
  const core = svg('g', { class: 'core' }, g);
  if (e.conflict) {
    const xs = e.conflict.map(c => X(parseInt(c.label.replace(/\D/g, ''), 10) + .5));
    xs.forEach(cx => svg('circle', { cx, cy: y, r: 4.5, class: 'd' }, core));
    svg('path', { d: `M${xs[0]} ${y + 6} Q${(xs[0] + xs[1]) / 2} ${y + 17} ${xs[1]} ${y + 6}`, class: 'arc' }, core);
  } else { svg('circle', { cx: x, cy: y, r: 5.5, class: 'o' }, core); svg('circle', { cx: x, cy: y, r: 2, class: 'd' }, core); }
  svg('circle', { cx: x, cy: y, r: 12, class: 'hit' }, g);
  return { g, id: e.id, x };
}

function faceNode(pid) {
  let n = faces.get(pid);
  if (!n) { n = svg('g', { class: 'face-g' }); svgFace(n, 0, 0, FACE, pid); faces.set(pid, n); }
  return n;
}

function personRow(pg, { p, x: ext }, y, X, rg, L, Rx, w, knots) {
  const g = svg('g', { class: 'ln', tabindex: 0, role: 'button', 'data-person': p.id, 'aria-label': `${p.displayName}. ${datesLine(p)}.` }, pg);
  const sIn = ext.start.y >= rg[0], eIn = ext.end.y <= rg[1];
  const clip = (a, b) => [Math.max(a, rg[0]), Math.min(b, rg[1])];
  const pieces = [];   // [fromYear, toYear, class, opacity]
  const fadeS = ext.start.fade || ext.start.about ? (ext.start.fade ? 6 : 2) : 0;
  const fadeE = ext.end.fade || ext.end.about ? (ext.end.fade ? 8 : 2) : 0;
  let solidA = ext.start.y + fadeS, solidB = ext.end.y - fadeE;
  for (let i = 0; i < 4 && fadeS; i++) pieces.push([ext.start.y + i * fadeS / 4, ext.start.y + (i + 1) * fadeS / 4, 's', .18 + i * .22]);
  if (ext.end.conflict) { solidB = ext.end.conflict[0]; pieces.push([ext.end.conflict[0], ext.end.conflict[1], 's dis', 1]); }
  for (let i = 0; i < 4 && fadeE; i++) pieces.push([ext.end.y - fadeE + i * fadeE / 4, ext.end.y - fadeE + (i + 1) * fadeE / 4, 's', .9 - i * .22]);
  pieces.push([solidA, Math.max(solidA, solidB), 's', 1]);
  // optional: unknown ends drawn dotted out to the edge of the window, as in the brand book's mock
  const toEdgeE = edge && ext.end.fade && eIn, toEdgeS = edge && ext.start.fade && sIn;
  if (toEdgeE) pieces.push([ext.end.y, rg[1], 's cont', .9]);
  if (toEdgeS) pieces.push([rg[0], ext.start.y, 's cont', .9]);
  for (const [a0, b0, cls, op] of pieces) { const [a, b] = clip(a0, b0); if (b > a) svg('line', { x1: X(a), x2: X(b), y1: y, y2: y, class: cls, opacity: op < 1 ? op : null }, g); }
  const leftOpen = !sIn || toEdgeS, rightOpen = !eIn || toEdgeE;
  const x0 = X(Math.max(toEdgeS ? rg[0] : ext.start.y, rg[0])), x1 = X(Math.min(toEdgeE ? rg[1] : ext.end.y, rg[1]));
  // honest endings: a fade explains itself on hover
  if (ext.end.fade && ext.end.y - fadeE < rg[1] && ext.end.y > rg[0]) { const [a, b] = clip(ext.end.y - fadeE, toEdgeE ? rg[1] : ext.end.y); if (b > a) svg('line', { x1: X(a), x2: X(b), y1: y, y2: y, class: 'tiphit', 'data-tip': 'end' }, g); }
  if (ext.start.fade && ext.start.y + fadeS > rg[0] && ext.start.y < rg[1]) { const [a, b] = clip(toEdgeS ? rg[0] : ext.start.y, ext.start.y + fadeS); if (b > a) svg('line', { x1: X(a), x2: X(b), y1: y, y2: y, class: 'tiphit', 'data-tip': 'start' }, g); }
  // a known end gets a small terminal tick
  if (ext.end.known && eIn) svg('line', { x1: X(ext.end.y), x2: X(ext.end.y), y1: y - 6, y2: y + 6, class: 'tick-end' }, g);
  if (ext.end.conflict && eIn) {
    const [c0, c1] = ext.end.conflict.map(X);
    [c0, c1].forEach(cx => svg('circle', { cx, cy: y, r: 4, class: 'cdot' }, g));
    svg('path', { d: `M${c0} ${y + 6} Q${(c0 + c1) / 2} ${y + 17} ${c1} ${y + 6}`, class: 'arc' }, g);
    svg('text', { x: c1 + 9, y: y + 4.5, class: 'note' }, g, (p.lifeline.end.readings || []).map(r => String(r.year)).join(' or '));
  }
  // chevrons where the line runs past the window; clicking one moves the window that way
  const chev = (dir) => {
    const cx = dir < 0 ? L - 6 : Rx + 6, c = svg('g', { class: 'chev-g', 'data-chev': dir }, g);
    svg('rect', { x: dir < 0 ? cx - CHEV - 4 : cx - 4, y: y - 12, width: CHEV + 8, height: 24, class: 'chev-hit' }, c);
    svg('path', { d: `M${cx} ${y - 6} l${dir * 6} 6 l${-dir * 6} 6`, class: 'chev' }, c);
  };
  if (leftOpen) chev(-1);
  if (rightOpen) chev(1);
  for (const id of p.eventIds) { const e = S.idx.events[id]; if (e && inRange(e, rg)) knots.push(knot(g, e, y, X, rg)); }
  // the portrait bubble: just before the line, or clear of the chevron when the life began earlier
  const bx = leftOpen ? L - 6 - CHEV - CHEV_GAP - BUB : x0 - BUB - 6;
  svg('circle', { cx: bx, cy: y, r: BUB, class: 'bub' }, g);
  const f = faceNode(p.id); f.setAttribute('transform', `translate(${bx} ${y})`); g.appendChild(f);
  const nm = p.shortName || p.displayName, nw = textW(nm, F_NAME);
  let nx = bx + BUB + 8; if (nx + nw > w - 6) nx = w - 6 - nw;
  svg('text', { x: nx, y: y - 15, class: 'nm' }, g, nm);
  // the row's own hit area: the face, the name and the line, not the empty rest of the row
  const hx0 = bx - BUB - 4, hx1 = Math.max(x1 + (rightOpen ? CHEV + 12 : 10), nx + nw + 6);
  g.insertBefore(svg('rect', { x: hx0, y: y - 28, width: hx1 - hx0, height: 44, class: 'rowhit' }), g.firstChild);
  return { g, x0, x1, bx };
}

// selection, links and the year marker: cheap, so they follow every state change
function apply(st) {
  if (!T) return;
  const { rows, knots, labels, lg, ltG, yg, X, rg, H: Ht, axisY } = T;
  const sel = st.person, r = sel ? relOf(sel) : null;
  const related = new Set(r ? [...r.parents, ...r.children, ...r.spouses, ...r.raisedBy, ...r.raised] : []);
  for (const [id, row] of Object.entries(rows)) { row.g.classList.toggle('sel', id === sel); row.g.classList.toggle('rel', related.has(id)); row.g.setAttribute('aria-pressed', id === sel); }
  for (const k of knots) {
    const e = S.idx.events[k.id];
    const hit = (sel && e.personSubjectIds.includes(sel)) || (st.place && e.placeIds.includes(st.place));
    k.g.classList.toggle('sel', k.id === st.event); k.g.classList.toggle('hit', !!hit && k.id !== st.event); k.g.classList.toggle('dim', !!st.place && !hit);
  }
  for (const [t, id] of labels) t.classList.toggle('on', id === st.event || !!(st.place && S.idx.events[id].placeIds.includes(st.place)));
  // parent, raised-by and marriage links, only for the selected person; their labels sit under a line, clear of knots and names
  lg.textContent = ''; ltG.textContent = '';
  if (sel && rows[sel]) {
    const placed = [];
    const label = (x, rowY, text, cls) => {
      for (const ty of [rowY + 26, rowY + 40]) {
        const tw = textW(text, '500 12px "Public Sans", sans-serif'), box = [x + 8, ty - 11, x + 8 + tw, ty + 3];
        if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
        placed.push(box); return svg('text', { x: x + 8, y: ty, class: 'lk-t ' + cls }, ltG, text);
      }
    };
    const line = (x, y1, y2, cls, text, ly) => { svg('path', { d: `M${x} ${Math.min(y1, y2)} V${Math.max(y1, y2)}`, class: 'lk ' + cls }, lg); if (text) label(x, ly, text, cls); };
    const birthX = (id) => { const e = extentOf(id); return e && !e.start.fade && e.start.y > rg[0] && e.start.y < rg[1] ? X(e.start.y) : null; };
    for (const p of r.parents) if (rows[p]) { const x = birthX(sel); if (x) line(x, rows[p].y, rows[sel].y, 'par'); }
    for (const c of r.children) if (rows[c]) { const x = birthX(c); if (x) line(x, rows[sel].y, rows[c].y, 'par'); }
    const raise = (child, guardians) => {
      const since = 1876.5; if (since < rg[0] || since > rg[1] || !rows[child]) return;
      const gy = guardians.filter(gd => rows[gd]).map(gd => rows[gd].y); if (!gy.length) return;
      const far = gy.reduce((a, b) => Math.abs(b - rows[child].y) > Math.abs(a - rows[child].y) ? b : a);
      line(X(since), far, rows[child].y, 'raise', `raised by ${guardians.map(personName).map(n => n.split(' ')[0]).join(' and ')}, from 1876`, rows[child].y);
    };
    if (r.raisedBy.length) raise(sel, r.raisedBy);
    for (const c of r.raised) raise(c, relOf(c).raisedBy);
    for (const sp of r.spouses) if (rows[sp]) {
      const ev = S.data.events.find(e => e.personSubjectIds.includes(sel) && e.personSubjectIds.includes(sp) && /marr/i.test(e.title));
      if (ev && inRange(ev, rg)) line(X(mid(ev.date)), rows[sel].y, rows[sp].y, 'mar', `married ${fmtDate(ev.date)}`, Math.max(rows[sel].y, rows[sp].y));
    }
  }
  yg.textContent = '';
  if (st.year && st.year + .5 >= rg[0] && st.year + .5 <= rg[1]) { const x = X(st.year + .5); svg('line', { x1: x, x2: x, y1: 18, y2: axisY, class: 'yr' }, yg); svg('text', { x: x + 5, y: 14, class: 'yrl' }, yg, st.year); }
}
const extCache = new Map();
const extentOf = (id) => { if (!extCache.has(id)) extCache.set(id, extent(S.idx.people[id])); return extCache.get(id); };

function navState() {
  const [a, b] = yearsOf(VIEW).map(Math.round);
  H.range.textContent = `${a}–${b - 1 >= 2026 ? 'today' : b - 1}`;
  H.steps.forEach(btn => {
    const e = stepEra(VIEW, +btn.dataset.step);
    btn.disabled = !e;
    btn.querySelector('small').textContent = e ? e.label : '';
    btn.setAttribute('aria-label', e ? `${+btn.dataset.step < 0 ? 'Earlier' : 'Later'}: ${e.label}, ${e.start}–${e.end >= 2026 ? 'today' : e.end}` : `${+btn.dataset.step < 0 ? 'Earlier' : 'Later'}: no ${+btn.dataset.step < 0 ? 'earlier' : 'later'} era`);
  });
  const { min, max } = scale(), s = VIEW[1] - VIEW[0];
  H.zooms[0].disabled = s >= max - 1e-6; H.zooms[1].disabled = s <= min + 1e-6;
}
