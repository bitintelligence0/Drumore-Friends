// Shared data, indexes and the one selection state. The URL is the state.
export const S = { data: null, idx: {}, state: {}, subs: [] };

const DEFAULTS = { view: 'explore', mode: 'timeline', era: 'diaries', year: null, event: null, person: null, place: null, story: null, scene: null, post: null, image: null, fam: null, list: 'events' };
const KEYS = Object.keys(DEFAULTS);
const LEGACY_FOCUS = { all: 'all', early: 'settling', meeting: 'settling', wynona: 'diaries', diary: 'diaries' };

export async function load() {
  const data = await fetch('/content.json').then(r => r.json());
  S.data = data;
  const by = k => Object.fromEntries(data[k].map(x => [x.id, x]));
  S.idx = { events: by('events'), people: by('people'), places: by('places'), images: by('images'), posts: by('posts'), scenes: by('scenes'), stories: by('stories'), eras: by('eras') };
  const rel = { parents: {}, children: {}, spouses: {}, raisedBy: {}, raised: {} };
  const push = (m, k, v) => (m[k] = m[k] || []).includes(v) || m[k].push(v);
  for (const r of data.relationships || []) {
    if (r.type === 'parent') { push(rel.parents, r.to, r.from); push(rel.children, r.from, r.to); }
    if (r.type === 'spouse') { push(rel.spouses, r.from, r.to); push(rel.spouses, r.to, r.from); }
    if (r.type === 'raisedBy') { push(rel.raisedBy, r.to, r.from); push(rel.raised, r.from, r.to); }
  }
  S.rel = rel;
  S.transcriptions = Object.fromEntries((data.transcriptions || []).map(t => [t.imageId, t]));
  S.sceneByEvent = {};
  for (const st of data.stories) for (const sid of st.sceneIds) { const sc = S.idx.scenes[sid]; if (sc) S.sceneByEvent[sc.eventId] = { story: st.id, scene: sid }; }
}

export const relOf = (id) => ({
  parents: S.rel.parents[id] || [], children: S.rel.children[id] || [], spouses: S.rel.spouses[id] || [],
  raisedBy: S.rel.raisedBy[id] || [], raised: S.rel.raised[id] || [],
  siblings: [...new Set((S.rel.parents[id] || []).flatMap(p => S.rel.children[p] || []))].filter(x => x !== id),
});

export function parse(search = location.search) {
  const q = new URLSearchParams(search);
  const st = { ...DEFAULTS };
  for (const k of KEYS) if (q.has(k)) st[k] = q.get(k) || null;
  // older links from the BED-280–283 prototype
  const v = q.get('view');
  if (v === 'timeline') { st.view = 'explore'; st.mode = 'timeline'; }
  if (v === 'map') { st.view = 'explore'; st.mode = 'map'; }
  if (v === 'event') { st.view = 'explore'; }
  if (v === 'people' || v === 'family') { st.view = 'explore'; st.mode = 'family'; }
  if (q.has('focus') && !q.has('era')) st.era = LEGACY_FOCUS[q.get('focus')] || 'all';
  if (!['explore', 'person', 'story', 'stories', 'about'].includes(st.view)) st.view = 'explore';
  if (!['timeline', 'family', 'map', 'imagery', 'list'].includes(st.mode)) st.mode = 'timeline';
  if (st.era !== 'all' && !S.idx.eras[st.era]) st.era = DEFAULTS.era;
  if (st.person && !S.idx.people[st.person]) st.person = null;
  if (st.event && !S.idx.events[st.event]) st.event = null;
  if (st.place && !S.idx.places[st.place]) st.place = null;
  if (st.post && !S.idx.posts[st.post]) st.post = null;
  if (st.year) st.year = Math.max(1600, Math.min(2026, parseInt(st.year, 10) || 0)) || null;
  if (st.view === 'story') {
    const story = S.idx.stories[st.story] || S.data.stories[0];
    st.story = story.id;
    if (!story.sceneIds.includes(st.scene)) st.scene = story.sceneIds[0];
  }
  return st;
}

export function query(st) {
  const q = new URLSearchParams();
  for (const k of KEYS) { const v = st[k]; if (v != null && v !== '' && v !== DEFAULTS[k]) q.set(k, v); }
  const s = q.toString();
  return s ? '?' + s : '/';
}
export const href = (patch) => query({ ...S.state, ...patch });

export function go(patch, { replace = false } = {}) {
  const next = { ...S.state, ...patch };
  const url = query(next);
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  const prev = S.state;
  S.state = parse(location.search);
  S.subs.forEach(f => f(S.state, prev));
}
export const onChange = (f) => S.subs.push(f);

// Selecting one kind of thing clears the others, except an event can keep the person it concerns.
export function select(kind, id) {
  if (kind === 'person') return go({ person: id, event: null, place: null });
  if (kind === 'place') return go({ place: id, event: null, person: null });
  if (kind === 'event') {
    const ev = S.idx.events[id];
    const keep = ev && S.state.person && ev.personSubjectIds.includes(S.state.person) ? S.state.person : null;
    return go({ event: id, person: keep, place: null, year: ev ? ev.date.sortYear : S.state.year });
  }
  return go({ event: null, person: null, place: null });
}
