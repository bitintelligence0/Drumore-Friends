// Small helpers: DOM and SVG builders, dates at their recorded precision, portraits, evidence marks.
import { S } from './store.js';

export const NS = 'http://www.w3.org/2000/svg';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function svg(tag, attrs = {}, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const isPhone = () => window.matchMedia('(max-width: 760px)').matches;

// ---------- dates ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
function part(s) {
  const [y, m, d] = s.split('-').map(Number);
  if (d) return `${d} ${MONTHS[m - 1]} ${y}`;
  if (m) return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}
export function fmtDate(date, ev) {
  if (ev && ev.conflict) return ev.conflict.map(c => c.label).join(' or ');
  if (!date || date.precision === 'unknown') return 'Date unknown';
  const p = date.precision;
  if (p === 'range') {
    const [a, b] = date.original.split('/');
    if (a.length === 4 && b.length === 4) return `${a}–${b}`;
    if (a.slice(0, 4) === b.slice(0, 4) && a.length === 7 && b.length === 7) return `${MONTHS[+a.slice(5) - 1]}–${MONTHS[+b.slice(5) - 1]} ${a.slice(0, 4)}`;
    return `${part(a)} – ${part(b)}`;
  }
  if (p === 'approximate_year') return `about ${date.original}`;
  return part(date.original);
}
export const precisionWord = (d) => ({ day: 'the day', month: 'the month', year: 'the year', approximate_year: 'approximate', range: 'a span', unknown: 'unknown' }[d?.precision] || '');
export const oldStyle = (d) => d && d.sortYear != null && d.sortYear < 1752 && ['day', 'month'].includes(d.precision);
export function frac(s) {
  const [y, m, d] = s.split('-').map(Number);
  if (d) return y + (m - 1) / 12 + (d - .5) / 365;
  if (m) return y + (m - .5) / 12;
  return y + .5;
}
export function span(date) {
  if (!date || date.precision === 'unknown') return null;
  if (date.precision === 'range') { const [a, b] = date.original.split('/'); return [frac(a) - (a.length === 4 ? .5 : a.length === 7 ? .04 : 0), frac(b) + (b.length === 4 ? .5 : b.length === 7 ? .04 : 0)]; }
  if (date.precision === 'approximate_year') return [+date.original - 1, +date.original + 2];
  const x = frac(date.original); return [x, x];
}
export const mid = (date) => { const s = span(date); return s ? (s[0] + s[1]) / 2 : null; };

export function lifeText(p) {
  const l = p.lifeline; if (!l) return '';
  const f = (e, verb) => e.kind === 'known' ? `${verb} ${e.year}` : e.kind === 'about' ? `${verb} about ${e.year}` : e.kind === 'conflict' ? `${verb} ${(e.readings || []).map(r => r.label).join(' or ')}` : '';
  const a = f(l.start, 'born'), b = f(l.end, 'died');
  return [a, b].filter(Boolean).join(' · ') || 'Dates not yet in the archive';
}

// ---------- images and portraits ----------
export const media = (id) => `/media/${encodeURIComponent(id)}`;
export function cropCSS(img) {
  const c = img?.faceCrop; if (!c || !img.width) return `background-image:url('${media(img.id)}');background-size:cover;background-position:center`;
  const sideH = c.side * img.width / img.height;
  const px = Math.max(0, Math.min(100, (c.cx - c.side / 2) / (1 - c.side) * 100));
  const py = Math.max(0, Math.min(100, (c.cy - sideH / 2) / Math.max(.0001, 1 - sideH) * 100));
  return `background-image:url('${media(img.id)}');background-size:${(100 / c.side).toFixed(2)}% auto;background-position:${px.toFixed(2)}% ${py.toFixed(2)}%`;
}
export const initials = (name) => name.replace(/[“”"]/g, '').split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');
export function faceHTML(personId, extra = '') {
  const p = S.idx.people[personId]; if (!p) return '';
  const img = p.portraitImageId && S.idx.images[p.portraitImageId];
  return img ? `<span class="face ${extra}" style="${cropCSS(img)}" role="img" aria-label="${esc(p.displayName)}"></span>` : `<span class="face ${extra}" aria-hidden="true">${esc(initials(p.shortName || p.displayName))}</span>`;
}
let clipN = 0;
export function svgFace(parent, cx, cy, r, personId) {
  const p = S.idx.people[personId]; const img = p?.portraitImageId && S.idx.images[p.portraitImageId];
  const g = svg('g', {}, parent);
  svg('circle', { cx, cy, r, fill: '#F1F2EE' }, g);
  if (img && img.faceCrop && img.width) {
    const c = img.faceCrop, dw = 2 * r / c.side, dh = dw * img.height / img.width;
    const id = 'fc' + (clipN++); const cp = svg('clipPath', { id }, g); svg('circle', { cx, cy, r }, cp);
    svg('image', { href: media(img.id), x: cx - c.cx * dw, y: cy - c.cy * dh, width: dw, height: dh, 'clip-path': `url(#${id})`, preserveAspectRatio: 'none' }, g);
  } else {
    svg('text', { x: cx, y: cy + r * .3, 'text-anchor': 'middle', class: 'ini', style: `font-size:${(r * .78).toFixed(1)}px` }, g, initials(p?.shortName || p?.displayName || '?'));
  }
  return g;
}
export function provTab(img) {
  const prov = img.provenance || 'original';
  const cls = prov === 'today' ? 't' : prov === 'drawn' ? 'd' : prov === 'undated' ? 'u' : '';
  const word = { original: 'Original', today: 'Today', drawn: 'Drawn', undated: 'Undated' }[prov];
  const role = { portrait: 'portrait', document: 'document', photograph: 'photograph', map: 'map' }[img.role] || 'image';
  return `<div class="tab ${cls}"><i></i>${word} <span>· ${role}</span></div>`;
}
export const eviChip = (ev) => ev?.conflict ? '<span class="evi"><i></i>Reported · sources disagree</span>' : '<span class="evi" title="From an account: Beth’s posts. Not yet checked against an original record."><i></i>Reported</span>';
export const placeLabel = (id) => S.idx.places[id]?.label || id;
export const personName = (id) => S.idx.people[id]?.shortName || S.idx.people[id]?.displayName || id;
export function sourcesHTML(postIds) {
  return `<div class="srcl">${postIds.map(pid => { const p = S.idx.posts[pid]; if (!p) return ''; return `<div><button type="button" class="linkbtn" data-post="${pid}">Read Beth’s post ${pid}</button><a class="ext" href="${esc(p.facebookUrl)}" target="_blank" rel="noopener">Facebook original ↗</a></div>`; }).join('')}</div>`;
}

// ---------- Beth's post text ----------
// The archive keeps each post as Markdown: a "## date — title" heading, a source link, the post's lines,
// then "**Photos**" captions and sometimes "**Meetinghouse comments…**". One line is one paragraph.
const postText = {};
export const postTitle = (p) => p.summaryTitle || p.title;
export function fetchPost(id) {
  return postText[id] ??= fetch(`/source/${encodeURIComponent(id)}`).then(r => r.ok ? r.text() : null).catch(() => null);
}
// a diary date at the start of a line: "Nov. 16.", "Dec. 15", "Feb.15.", "Jan. 1, 1891." alone,
// or followed by a wide gap and the entry ("Nov. 9.      Aunt Lib and I went to Meeting")
const DIARY_DATE = /^((?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)\.?\s?\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\.?)(?:\s*$|\s{2,}(\S.*)$)/;
// inside a diary, a short heading with the same wide gap ("All Week.      Enjoyed myself")
const DIARY_LABEL = /^([A-Z][A-Za-z ]{1,14}\.)\s{3,}(\S.*)$/;
const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
export function splitPost(raw) {
  const t = String(raw || '').replace(/^## .*\n?/, '').replace(/\[Facebook source\]\([^)]*\)/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[Original photo\]\([^)]*\)/g, '');
  const cut = t.search(/^\*\*(Photos|Meetinghouse comments)/m);
  const body = cut < 0 ? t : t.slice(0, cut), rest = cut < 0 ? '' : t.slice(cut);
  const lines = [];
  for (const l of body.split('\n')) {
    const s = l.trim(); if (!s || s === '---') continue;
    // a line the capture broke mid-sentence carries on in lower case; rejoin it
    if (/^[a-z]/.test(s) && lines.length && !lines[lines.length - 1].date) { lines[lines.length - 1].text += ' ' + s; continue; }
    lines.push({ text: s });
  }
  for (const ln of lines) {
    const m = ln.text.match(DIARY_DATE);
    if (m) { ln.date = m[1]; ln.text = m[2] || ''; }
  }
  if (lines.some(l => l.date)) for (const ln of lines) {
    const m = !ln.date && ln.text.match(DIARY_LABEL);
    if (m) { ln.date = m[1]; ln.text = m[2]; }
  }
  return { lines, rest: rest.replace(/\n{3,}/g, '\n\n').replace(/\n?---\s*$/, '').trim() };
}
// paragraphs; each diary date starts a block whose text sits one tab stop in
export function postBodyHTML(raw) {
  const { lines } = splitPost(raw);
  if (!lines.length) return '<p class="asw">This post has no text, only a photo.</p>';
  let html = '', day = null;
  const close = () => { if (day) { html += `<div class="pd-day"><b class="pd-date">${esc(day.date)}</b><div class="pd-entry">${day.ps.join('')}</div></div>`; day = null; } };
  for (const ln of lines) {
    if (ln.date) { close(); day = { date: ln.date, ps: ln.text ? [`<p>${inline(ln.text)}</p>`] : [] }; continue; }
    if (day) day.ps.push(`<p>${inline(ln.text)}</p>`);
    else html += `<p>${inline(ln.text)}</p>`;
  }
  close();
  return html;
}
export const postRestText = (raw) => splitPost(raw).rest.replace(/\*\*([^*]+)\*\*/g, '$1');
