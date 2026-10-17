// The Map tab: places on an OpenStreetMap base map (Leaflet, vendored in /vendor).
// Locations come from places-geo.json (build_geo.py). They are proposed and unverified: content.json keeps
// places[].coordinates = null until someone reviews them. Townships and counties are outlines, communities are
// soft circles, a named road is a line. Nothing is turned into an exact pin unless a person entered one by hand.
// Places with no location yet stay listed in "Not yet on the map".
import { S, select } from './store.js';
import { esc, reduceMotion, span } from './lib.js';

const L = window.L;
const STYLE = {
  outline: { color: '#2E6273', weight: 1.6, dashArray: '5 5', fillColor: '#2E6273', fillOpacity: .05 },
  circle: { color: '#17302B', weight: 1.4, dashArray: '4 4', fillColor: '#17302B', fillOpacity: .08 },
  line: { color: '#6E4229', weight: 5, opacity: .8, lineCap: 'round' },
  pin: { color: '#17302B', weight: 2, fillColor: '#17302B', fillOpacity: .9 },
};
const ON = { color: '#8A5A10', fillColor: '#E3A33B', fillOpacity: .22, opacity: 1 };
const SEL = { color: '#8A5A10', fillColor: '#E3A33B', fillOpacity: .34, opacity: 1, weight: 2.6 };
const SUB = { outline: 'area outline', circle: 'area, not a site', line: 'road named; site not mapped', pin: 'site entered by hand' };

let root, map, geo, layers = {}, unmapped = [], lastKey = '', pending = null, allBounds;

export function mountMap(container) {
  root = container;
  root.innerHTML = `
    <div class="lmap" role="region" aria-label="Map of places in the archive. Locations are proposed and not yet reviewed."></div>
    <div class="map-ui">
      <div class="map-title"><b>Where it happened</b><span>OpenStreetMap · locations proposed, not yet reviewed</span></div>
      <div class="map-tools"><span class="mchip" title="Matched to OpenStreetMap by name. Not checked against the archive yet.">Proposed · unverified</span><button type="button" class="mapbtn" id="mapReset">Whole map</button></div>
    </div>
    <div class="map-note" id="mapNote" hidden></div>
    <details class="map-unmapped" id="mapUnmapped"><summary></summary><ul></ul></details>`;
  root.querySelector('#mapReset').addEventListener('click', () => { lastKey = ''; select(null); });
  if (!L) { root.querySelector('.lmap').innerHTML = '<p class="ff-none" style="padding:16px">The map library did not load.</p>'; return; }
  map = L.map(root.querySelector('.lmap'), { zoomSnap: .25, zoomDelta: .5, scrollWheelZoom: false, attributionControl: true, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  map.setView([39.9, -75.8], 9);
  // ctrl/⌘ + wheel zooms, so a plain wheel keeps scrolling the page
  root.querySelector('.lmap').addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); map.setZoom(map.getZoom() + (e.deltaY < 0 ? .5 : -.5)); }, { passive: false });
  map.on('zoomend moveend', declutter);
  new ResizeObserver(() => { map.invalidateSize(); lastKey = ''; if (S.state) focus(S.state, true); }).observe(root);
  fetch('/places-geo.json').then(r => r.json()).then(g => { geo = g; draw(); if (pending) focus(pending, true); });
}

function draw() {
  for (const f of geo.features) {
    const p = f.properties, kind = p.shape.split(':')[0];
    let layer;
    if (kind === 'outline') layer = L.geoJSON(f, { style: () => ({ ...STYLE.outline }) });
    else if (kind === 'circle') layer = L.circle([p.center[0], p.center[1]], { radius: +p.shape.split(':')[1] || 1000, ...STYLE.circle });
    else if (kind === 'line') layer = L.geoJSON(f, { style: () => ({ ...STYLE.line }) });
    else layer = L.circleMarker([p.center[0], p.center[1]], { radius: 7, ...STYLE.pin });
    layer.addTo(map);
    const tip = `<b>${esc(p.label)}</b><span>${esc(SUB[kind] || '')}</span>`;
    layer.bindTooltip(tip, { permanent: true, direction: kind === 'outline' ? 'center' : 'right', className: 'mtip', offset: kind === 'outline' ? [0, 0] : [8, 0] });
    layer.bindPopup(`<b>${esc(p.label)}</b><p>${esc(p.note)}</p><p class="mp-src">${esc(p.status)} · ${esc(p.source)}${p.osm ? ` · <a href="https://www.openstreetmap.org/${({ R: 'relation', W: 'way', N: 'node' })[p.osm[0]]}/${p.osm.slice(1)}" target="_blank" rel="noopener">OSM ${esc(p.osm)}</a>` : ''}</p>`, { className: 'mpop', maxWidth: 280, autoPan: false });
    layer.on('click', () => select('place', p.placeId));
    layers[p.placeId] = { layer, kind, p };
  }
  // the whole map frames the families' world from Germantown to Millersville, not all of Chester County's edges
  allBounds = union(Object.values(layers).filter(m => m.p.placeId !== 'chester-county'));
  unmapped = geo.unmapped;
  const det = root.querySelector('#mapUnmapped');
  det.querySelector('summary').textContent = `Not yet on the map · ${unmapped.length}`;
  det.querySelector('ul').innerHTML = unmapped.map(u => `<li><button type="button" class="linkbtn" data-um="${u.placeId}">${esc(u.label)}</button><span>${esc(u.reason)}</span></li>`).join('');
  det.querySelectorAll('[data-um]').forEach(b => b.addEventListener('click', () => select('place', b.dataset.um)));
}

const bnd = m => m.layer.getBounds ? m.layer.getBounds() : L.latLngBounds([m.layer.getLatLng(), m.layer.getLatLng()]);
function union(ms) { const b = L.latLngBounds(bnd(ms[0]).getSouthWest(), bnd(ms[0]).getNorthEast()); for (const m of ms) b.extend(bnd(m)); return b; }
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
  if (!map) return;
  if (!geo) { pending = st; return; }
  const { on, sel, eraOnly } = placesFor(st);
  const hasSel = !!(st.place || st.event || st.person);
  for (const [id, m] of Object.entries(layers)) {
    const isOn = on.includes(id), isSel = id === sel, dim = (hasSel || (eraOnly && on.length)) && !isOn;
    const base = STYLE[m.kind] || STYLE.outline;
    const style = { ...base, ...(isSel ? SEL : isOn ? ON : {}), ...(dim ? { opacity: .35, fillOpacity: .02 } : {}) };
    if (m.kind === 'line' && (isOn || isSel)) style.color = '#E3A33B';
    m.layer.setStyle(style);
    const el = m.layer.getTooltip()?.getElement();
    if (el) { el.classList.toggle('on', isOn); el.classList.toggle('sel', isSel); el.classList.toggle('dim', !!dim); }
    m.rank = isSel ? 0 : isOn ? 1 : dim ? 4 : 2;
  }
  // a selected place with no location yet: say so instead of pretending
  const note = root.querySelector('#mapNote'), miss = on.filter(id => !layers[id]).map(id => unmapped.find(u => u.placeId === id)).filter(Boolean);
  note.hidden = !(hasSel && miss.length);
  if (!note.hidden) note.innerHTML = `<b>Not on the map yet:</b> ${miss.map(u => esc(u.label)).join(', ')}`;
  root.querySelectorAll('[data-um]').forEach(b => b.closest('li').classList.toggle('on', on.includes(b.dataset.um)));
  const key = [st.era, st.place, st.event, st.person, root.clientWidth, root.clientHeight].join('|');
  if (key === lastKey && !force) return declutter();
  lastKey = key;
  const pts = on.map(id => layers[id]).filter(Boolean).filter(m => m.p.placeId !== 'chester-county' || on.length === 1);
  const b = pts.length ? union(pts) : allBounds;
  const top = root.querySelector('.map-ui').getBoundingClientRect().height + 24;
  map.fitBounds(b, { paddingTopLeft: [40, top], paddingBottomRight: [40, 40], maxZoom: 13, animate: !reduceMotion(), duration: .42 });
  declutter();
}

// places with more events keep their label first
const weight = m => (m.n ??= S.data.events.filter(e => e.placeIds.includes(m.p.placeId)).length) - (m.p.placeId === 'chester-county' ? 9 : 0);
// Hide labels that would overlap: selected and related places keep theirs first; the popup and list still name every place.
function declutter() {
  const placed = [], hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const blocks = [...root.querySelectorAll('.map-ui > *, .map-unmapped, .leaflet-control-zoom, .leaflet-control-attribution')].map(e => e.getBoundingClientRect());
  const box = root.getBoundingClientRect();
  const list = Object.values(layers).sort((a, b) => (a.rank ?? 2) - (b.rank ?? 2) || weight(b) - weight(a));
  for (const m of list) {
    const el = m.layer.getTooltip()?.getElement(); if (!el) continue;
    el.classList.remove('hide');
    const r = el.getBoundingClientRect();
    const off = r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom;
    if (off || blocks.some(b => hit(r, b)) || placed.some(b => hit(r, b))) { el.classList.add('hide'); continue; }
    placed.push(r);
  }
}
export const mapEsc = esc;
