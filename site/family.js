// Family mode: the brand book's whole tree (chapter 11) and the person-centered view (phone default).
import { S, select, relOf, go } from './store.js';
import { svg, svgFace, esc, faceHTML, isPhone } from './lib.js';

// Positions from the brand book's tree. Relationships come from content.json.relationships.
const POS = {
  'smedley-lamborn': [500, 80], 'margaret-bolton-lamborn': [600, 80],
  'george-lamborn': [100, 255], 'sarah-coates-lamborn': [190, 255], 'will-lamborn': [320, 255], 'phebe-barnard-lamborn': [410, 255],
  'lib-hambleton': [545, 255], 'thomas-hambleton': [635, 255], 'alice-shoemaker': [775, 255], 'william-shoemaker': [865, 255],
  'linneaus-lamborn': [70, 440], 'lucretia-lamborn': [170, 440], 'wynona-lamborn': [320, 440], 'early-earnhart': [410, 440],
  'winona-shoemaker': [700, 440], 'harry-drennan': [790, 440], 'lulu-shoemaker': [890, 440],
  'harold-earnhart': [320, 610], 'raymond-earnhart': [420, 610],
};
const R = 30;

export function renderFamily(host, st) {
  const mode = st.fam || (isPhone() ? 'center' : 'whole');
  const sel = st.person;
  const inTree = !sel || POS[sel];
  host.innerHTML = `<div class="famwrap">
    <div class="fam-tools"><span>${sel ? `Showing ${esc(S.idx.people[sel].shortName)}’s family. ` : 'Select anyone to see how they connect. '}Every relationship comes from Beth’s posts and is provisional.</span>
      <span class="modes" role="group" aria-label="Family layout"><button type="button" data-fam="whole" aria-selected="${mode === 'whole'}">Whole family</button><button type="button" data-fam="center" aria-selected="${mode === 'center'}">Centered</button></span></div>
    <div class="famview"></div></div>`;
  host.querySelectorAll('[data-fam]').forEach(b => b.addEventListener('click', () => go({ fam: b.dataset.fam }, { replace: true })));
  const view = host.querySelector('.famview');
  if (mode === 'center' || !inTree) return centered(view, sel || 'wynona-lamborn', !inTree);
  whole(view, sel);
}

function whole(view, sel) {
  const s = svg('svg', { class: 'tree', viewBox: '0 0 1100 690', role: 'group', 'aria-label': 'Family tree. Select a person to highlight their relationships.' }, view);
  const lg = svg('g', {}, s), ng = svg('g', {}, s), lines = [];
  const P = POS, done = new Set();
  for (const r of S.data.relationships.filter(r => r.type === 'spouse')) {
    const a = P[r.from], b = P[r.to]; if (!a || !b) continue;
    const [l, rr] = a[0] < b[0] ? [a, b] : [b, a];
    lines.push([svg('path', { d: `M${l[0] + R} ${l[1]} H${rr[0] - R}`, class: 'lnk' }, lg), [r.from, r.to]]);
  }
  // families: children grouped by their parent pair
  const fams = {};
  for (const r of S.data.relationships.filter(r => r.type === 'parent')) { const ps = relOf(r.to).parents.slice().sort().join('+'); (fams[ps] = fams[ps] || { parents: relOf(r.to).parents, kids: new Set() }).kids.add(r.to); }
  const groups = S.data.familyGroups || [];
  for (const f of Object.values(fams)) {
    const pp = f.parents.map(p => P[p]).filter(Boolean); if (!pp.length) continue;
    const kids = [...f.kids].filter(k => P[k]);
    const extra = groups.find(g => g.parents.slice().sort().join('+') === f.parents.slice().sort().join('+'));
    const mx = pp.reduce((a, p) => a + p[0], 0) / pp.length, py = pp[0][1];
    const xs = kids.map(k => P[k][0]);
    const extraX = extra ? (extra.unshownChildren > 1 ? 1010 : 985) : null; if (extraX) xs.push(extraX);
    const ky = kids.length ? P[kids[0]][1] : py + 185, bar = py + (ky - py) * .6;
    let d = `M${mx} ${py} V${bar} M${Math.min(...xs, mx)} ${bar} H${Math.max(...xs, mx)}`;
    kids.forEach(k => d += ` M${P[k][0]} ${bar} V${P[k][1] - R}`);
    if (extraX) d += ` M${extraX} ${bar} V${extra.unshownChildren > 1 ? ky - 22 : ky - 2}`;
    lines.push([svg('path', { d, class: 'lnk' }, lg), [...f.parents, ...kids]]);
    if (extra) {
      const g = svg('g', { class: 'nd more' }, ng);
      if (extra.unshownChildren > 1) { svg('rect', { x: extraX - 36, y: ky - 22, width: 72, height: 44, rx: 22, fill: '#F1F2EE', stroke: '#D6DBD6', 'stroke-width': 1.5 }, g); svg('text', { x: extraX, y: ky - 2, 'text-anchor': 'middle', class: 'nm' }, g, `${extra.unshownChildren} more`); svg('text', { x: extraX, y: ky + 13, 'text-anchor': 'middle', class: 'dd' }, g, 'children'); }
      else { svg('circle', { cx: extraX, cy: ky + 12, r: 14, fill: '#FBFBF8', stroke: '#59645F', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, g); svg('text', { x: extraX, y: ky + 44, 'text-anchor': 'middle', class: 'nm' }, g, 'A child'); svg('text', { x: extraX, y: ky + 58, 'text-anchor': 'middle', class: 'dd' }, g, 'died as an infant'); }
      svg('title', {}, g, extra.note);
    }
  }
  for (const r of S.data.relationships.filter(r => r.type === 'raisedBy')) {
    const key = 'raise:' + r.to; if (done.has(key)) continue; done.add(key);
    const gs = S.rel.raisedBy[r.to].map(id => P[id]).filter(Boolean), c = P[r.to]; if (!gs.length || !c) continue;
    const mx = gs.reduce((a, p) => a + p[0], 0) / gs.length, gy = gs[0][1];
    lines.push([svg('path', { d: `M${mx} ${gy + 4} C ${mx} ${gy + 105}, ${c[0] + 100} ${gy + 105}, ${c[0] + R - 4} ${c[1] - 14}`, class: 'lnk raise' }, lg), [...S.rel.raisedBy[r.to], r.to]]);
    const t = svg('text', { x: mx - 78, y: gy + 122, class: 'rl' }, lg, `raised ${S.idx.people[r.to].shortName.split(' ')[0]} from ${r.since}`);
    lines.push([t, [...S.rel.raisedBy[r.to], r.to]]);
  }
  const nodes = {};
  for (const [id, [x, y]] of Object.entries(P)) {
    const p = S.idx.people[id]; if (!p) continue;
    const g = svg('g', { class: 'nd', tabindex: 0, role: 'button', 'aria-label': `${p.displayName}, ${p.relationToWynona || 'Wynona'}` }, ng);
    svgFace(g, x, y, R, id);
    svg('circle', { cx: x, cy: y, r: R, class: 'ring' }, g);
    const words = p.shortName.split(' '), last = words.pop();
    svg('text', { x, y: y + R + 16, 'text-anchor': 'middle', class: 'nm' }, g, words.join(' ') || last);
    if (words.length) svg('text', { x, y: y + R + 30, 'text-anchor': 'middle', class: 'nm' }, g, last);
    const lt = p.lifeline; const dd = lt?.end?.kind === 'conflict' ? 'died 1872 or 1874' : lt?.end?.kind === 'known' ? `died ${lt.end.year}` : lt?.start?.kind === 'known' ? `born ${lt.start.year}` : lt?.start?.kind === 'about' ? `about ${lt.start.year}` : '';
    if (dd) svg('text', { x, y: y + R + 44, 'text-anchor': 'middle', class: 'dd' }, g, dd);
    nodes[id] = g;
    const pick = () => select('person', id);
    g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  }
  if (sel) {
    const rel = new Set();
    lines.forEach(([l, m]) => { const on = m.includes(sel); l.classList.toggle('on', on); if (on) m.forEach(x => rel.add(x)); });
    for (const [id, g] of Object.entries(nodes)) { g.classList.toggle('sel', id === sel); g.classList.toggle('rel', id !== sel && rel.has(id)); g.setAttribute('aria-pressed', id === sel); }
  }
}

function centered(view, k, notInTree) {
  const r = relOf(k), p = S.idx.people[k];
  const tok = (id, size, cls = '') => `<button type="button" class="ff-p ${cls}" data-k="${id}" style="--s:${size}px">${faceHTML(id)}<b>${esc(S.idx.people[id].shortName)}</b><span>${esc(dates(id))}</span></button>`;
  const row = (label, ids, size, cls = '') => ids.length ? `<div class="ff-row ${cls}"><span class="ff-l">${label}</span><div class="ff-g">${ids.map(x => tok(x, size)).join('')}</div></div>` : '';
  const group = (S.data.familyGroups || []).find(g => g.parents.includes(k));
  view.innerHTML = `<div class="ff">
    ${notInTree ? '<p class="ff-none" style="margin-bottom:10px">No family relationships for this person are in the archive yet. More context needed.</p>' : ''}
    ${r.parents.length ? row('Parents', r.parents, 64) : '<div class="ff-row"><span class="ff-l">Parents</span><div class="ff-g"><span class="ff-none">Not yet in the archive</span></div></div>'}
    ${row('Raised by, from 1876', r.raisedBy, 64, 'r')}
    <div class="ff-row"><div class="ff-g">${tok(k, 104, 'sel')}${r.spouses.map(s => '<span class="ff-m">married</span>' + tok(s, 72)).join('')}</div></div>
    ${row('Raised', r.raised, 64, 'r')}
    ${row('Children', r.children, 64)}${group ? `<p class="ff-none" style="max-width:52ch;text-align:center">${esc(group.note)}</p>` : ''}
    ${row('Brothers and sisters', r.siblings, 52)}
  </div>`;
  view.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => select('person', b.dataset.k)));
}
function dates(id) {
  const l = S.idx.people[id].lifeline; if (!l) return '';
  if (l.end.kind === 'conflict') return 'died 1872 or 1874';
  if (l.start.kind === 'known' && l.end.kind === 'known') return `${l.start.year}–${l.end.year}`;
  if (l.start.kind === 'known') return `born ${l.start.year}`;
  if (l.start.kind === 'about') return `born about ${l.start.year}`;
  if (l.end.kind === 'known') return `died ${l.end.year}`;
  return '';
}
