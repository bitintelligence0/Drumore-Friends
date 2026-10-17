// Reading pages: one person's story, profiles, Stories, About, and the source viewer.
import { S, go, href, relOf, select } from './store.js';
import { esc, fmtDate, mid, faceHTML, cropCSS, media, provTab, eviChip, placeLabel, personName, sourcesHTML, lifeText, oldStyle, postTitle, fetchPost, postBodyHTML, postRestText } from './lib.js';

const backHTML = (st) => {
  const y = st.year || (st.event && S.idx.events[st.event]?.date.sortYear) || null;
  return `<a class="back" href="${href({ view: 'explore', story: null, scene: null })}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>Back to ${y ? `<span class="num">${y}</span>` : 'Explore'} <small>· timeline</small></a>`;
};

// ---------- person and story ----------
export function renderPerson(main, st) {
  const pid = st.view === 'story' ? S.idx.stories[st.story].personIds[0] : st.person || 'wynona-lamborn';
  const p = S.idx.people[pid];
  const story = st.view === 'story' ? S.idx.stories[st.story] : S.data.stories.find(s => s.personIds.includes(pid));
  if (st.view === 'person' && story) return go({ view: 'story', story: story.id, scene: null, person: pid }, { replace: true });
  const img = p.portraitImageId && S.idx.images[p.portraitImageId];
  const evs = p.eventIds.map(id => S.idx.events[id]).filter(Boolean).sort((a, b) => mid(a.date) - mid(b.date));
  const sceneEvents = new Set(story ? story.sceneIds.map(id => S.idx.scenes[id].eventId) : []);
  const others = evs.filter(e => !sceneEvents.has(e.id));
  const sceneList = story ? story.sceneIds.map(id => { const sc = S.idx.scenes[id], e = S.idx.events[sc.eventId]; return `<li><a href="${href({ view: 'story', story: story.id, scene: id })}" ${id === st.scene ? 'aria-current="step"' : ''}><span>${esc(fmtDate(e.date, e))}</span><b>${esc(sc.title)}</b></a></li>`; }).join('') : '';
  const otherList = others.map(e => `<li><a href="${href({ view: 'explore', event: e.id, person: pid, year: e.date.sortYear, story: null, scene: null })}"><span>${esc(fmtDate(e.date, e))}</span><b>${esc(e.title)}</b></a></li>`).join('');
  main.innerHTML = `<div class="page gut"><div class="wide"><div class="pp">
    <aside class="pp-side">
      <div class="who">${img ? `<span class="face" style="${cropCSS(img)}" role="img" aria-label="${esc(img.caption || p.displayName)}"></span>` : faceHTML(pid)}<div><h1>${esc(p.shortName)}</h1><div class="d">${esc(lifeText(p))}</div></div></div>
      <p class="bio">${esc(p.displayName)}. ${esc(p.about || '')}</p>
      ${story ? `<div class="scenes-h">Scenes in “${esc(story.title)}”</div><ol class="scenes">${sceneList}</ol>` : ''}
      ${others.length ? `<div class="scenes-h">${story ? 'Other dated moments' : 'Dated moments'}</div><ol class="scenes gray">${otherList}</ol>` : ''}
      <div style="padding-inline:6px">${backHTML(st)}</div>
    </aside>
    <article class="pp-main">${story ? sceneHTML(story, st) : profileHTML(p)}</article>
  </div></div></div>`;
  wire(main);
}

function sceneHTML(story, st) {
  const ids = story.sceneIds, i = ids.indexOf(st.scene), sc = S.idx.scenes[st.scene], e = S.idx.events[sc.eventId];
  const prev = ids[i - 1] && S.idx.scenes[ids[i - 1]], next = ids[i + 1] && S.idx.scenes[ids[i + 1]];
  const imgs = sc.imageIds.map(id => S.idx.images[id]).filter(Boolean);
  const people = [...new Set([...story.personIds, ...(sc.relatedPersonIds || [])])];
  return `${i === 0 ? `<p class="story-open">${esc(story.opening)}</p>` : ''}
    <div class="when"><b>${esc(fmtDate(e.date, e))}</b>${eviChip(e)}<span>Scene ${i + 1} of ${ids.length} · ${sc.placeIds.map(placeLabel).map(esc).join(', ')}</span></div>
    <h2>${esc(sc.title)}</h2>
    <div class="prose">${sc.narrative.map(t => `<p>${esc(t)}</p>`).join('')}</div>
    ${sc.quote ? `<blockquote class="quote">“${esc(sc.quote)}”<cite>Wynona’s diary, as transcribed in Beth’s post ${sc.quoteSourcePostId} · <button type="button" class="linkbtn" data-post="${sc.quoteSourcePostId}">Read the source</button></cite></blockquote>` : ''}
    ${imgs.length ? `<div class="figs">${imgs.map(im => `<figure class="fig"><button type="button" class="linkbtn" style="text-decoration:none;display:block" data-post="${im.postId}" data-image="${im.id}"><div class="mat"><img src="${media(im.id)}" alt="${esc(im.alt || im.caption)}" loading="lazy">${provTab(im)}</div></button><figcaption><b>${esc(im.caption || 'Archive image')}</b> · post ${im.postId} · rights unreviewed. ${S.transcriptions[im.id] ? '<b>Transcription available.</b>' : ''}</figcaption></figure>`).join('')}</div>` : '<p class="asw">No image is shown for this scene. Contextual photographs are left out so they can’t be mistaken for this moment.</p>'}
    ${S.data.transcriptions.filter(t => sc.sourcePostIds.includes(t.sourcePostId)).map(t => `<div class="wider"><span class="eyebrow">Read it in her hand</span><p class="asw">A page from these sources has a draft transcription beside the original.</p><div><button type="button" class="btn ghost" data-post="${t.sourcePostId}" data-image="${t.imageId}">Open the page and transcription</button></div></div>`).join('')}
    <div class="evnote"><span class="eyebrow">What the sources support</span><p>${esc(sc.evidenceNote)}</p>${sourcesHTML(sc.sourcePostIds.slice(0, 5))}${sc.sourcePostIds.length > 5 ? `<span class="asw">and ${sc.sourcePostIds.length - 5} more posts</span>` : ''}</div>
    <div class="wider"><span class="eyebrow">Where this fits</span><p class="asw">Date as written in the archive: “${esc(e.date.original)}” (${esc(e.date.precision.replace('_', ' '))})${oldStyle(e.date) ? ' · before the 1752 calendar change' : ''}.</p><div class="chips">${people.map(id => `<a class="chip" href="${href({ view: 'explore', person: id, event: null, story: null, scene: null })}">${faceHTML(id)}${esc(personName(id))}</a>`).join('')}<a class="chip plain" href="${href({ view: 'explore', event: e.id, year: e.date.sortYear, era: eraOf(e.date.sortYear), story: null, scene: null })}">See ${esc(fmtDate(e.date, e))} on the timeline →</a></div></div>
    ${i === ids.length - 1 ? `<p class="story-open">${esc(story.ending)}</p>` : ''}
    <div class="nextprev">${prev ? `<a class="prev" href="${href({ scene: prev.id })}">← ${esc(fmtDate(S.idx.events[prev.eventId].date))} · ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="${href({ scene: next.id })}">${esc(fmtDate(S.idx.events[next.eventId].date, S.idx.events[next.eventId]))} · ${esc(next.title)} →</a>` : `<a href="${href({ view: 'stories', story: null, scene: null })}">More stories →</a>`}</div>`;
}
const eraOf = (y) => S.data.eras.find(e => y >= e.start && y <= e.end)?.id || 'all';

function profileHTML(p) {
  const r = relOf(p.id);
  const chips = (ids) => ids.map(id => `<a class="chip" href="${href({ view: 'person', person: id })}">${faceHTML(id)}${esc(personName(id))}</a>`).join('');
  return `<span class="eyebrow">Profile</span><h2>${esc(p.displayName)}</h2>
    <div class="when">${eviChip()}<span>${esc(p.identityStatus)}</span></div>
    <div class="prose"><p>${esc(p.about || '')}</p></div>
    <p><span class="more-context">More context needed</span> <span class="asw">Beth hasn’t written ${esc(p.shortName.split(' ')[0])}’s story yet. These are the dated moments and relationships her posts mention.</span></p>
    ${[['Parents', r.parents], ['Raised by', r.raisedBy], ['Married', r.spouses], ['Children', r.children], ['Brothers and sisters', r.siblings]].filter(([, x]) => x.length).map(([l, ids]) => `<div class="wider"><span class="eyebrow">${l}</span><div class="chips">${chips(ids)}</div></div>`).join('')}
    <div class="evnote"><span class="eyebrow">Sources</span>${sourcesHTML(p.sourcePostIds)}</div>`;
}

// ---------- Stories ----------
export function renderStories(main, st) {
  const story = S.data.stories[0], imgs = ['P045-I01', 'P045-I04'].map(id => S.idx.images[id]).filter(Boolean);
  const threads = [
    ['Thread', 'The Germantown ancestors and the 1688 protest', 'Krefeld families arrive in 1683; five years later Germantown Friends endorse a protest against slavery. Beth traces Drumore families back to this group.', { era: 'ancestors', event: 'E003' }],
    ['Thread', 'How the Drumore meeting began, 1795–1816', 'Friends settle around 1795, ask Little Britain Monthly Meeting for a meeting of their own in 1811, and build the meeting house in 1816.', { era: 'settling', event: 'E016' }],
    ['Thread', 'Civil War lives', 'Drumore Friends who served despite the peace testimony, and William H. Presberry of the 25th U.S. Colored Troops, buried at Drumore.', { era: 'war', event: 'E024' }],
    ['Thread', 'The Lamborn and Shoemaker families', 'Eleven Lamborn children orphaned by 1855, the Cutlers who took them in, and the next generation in Wynona’s diary.', { era: 'meeting', mode: 'family', person: 'smedley-lamborn' }],
    ['Thread', 'Teachers and schools', 'Millersville, the one-room Conowingo School and the institutes Wynona attended.', { era: 'diaries', event: 'E022' }],
  ];
  main.innerHTML = `<div class="gut"><div class="wide">
    <header class="mast"><span class="eyebrow">Stories</span><h1>Stories from the archive</h1><p>Life stories, research notes and discoveries written from Beth’s posts and the original documents behind them. Each one links back to the timeline and to its sources.</p></header>
    <article class="lead-story"><div style="display:grid;gap:14px;align-content:start"><span class="kind">Life story · ${story.sceneIds.length} scenes · 1879–1891</span><h2>${esc(story.title)}</h2><div class="prose"><p>${esc(story.opening)}</p></div><div><a class="btn" href="${href({ view: 'story', story: story.id, scene: null })}">Read the story →</a></div><p class="asw">${esc(story.status)}</p></div>
      <div class="imgs2">${imgs.map(im => `<figure class="fig"><div class="mat"><img src="${media(im.id)}" alt="${esc(im.alt || im.caption)}">${provTab(im)}</div><figcaption>${esc(im.caption || '')} · post ${im.postId}</figcaption></figure>`).join('')}</div></article>
    <h2 style="font-family:var(--f-serif);font-size:26px;color:var(--shutter);margin-top:40px">In progress</h2>
    <p class="asw" style="margin-top:6px">Threads from Beth’s posts that will become stories. Outlines only: the writing needs Beth.</p>
    <div class="shelf">${threads.map(([k, t, d, link]) => `<article><span class="kind">${k} · outline</span><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="more-context">More context needed</span><a href="${href({ view: 'explore', story: null, scene: null, person: null, place: null, ...link })}">Explore the records →</a></article>`).join('')}</div>
    <h2 style="font-family:var(--f-serif);font-size:26px;color:var(--shutter);margin-top:40px">Research notes</h2>
    <div class="shelf">
      <article id="phebe"><span class="kind">Research note · draft</span><h3>Two dates for Phebe</h3><p>Beth’s posts give two dates for the death of Wynona’s mother, Phebe Barnard Lamborn: “when she was 3” (about 1872, P035) and 1874 (P057). Will’s letter to his daughter, which P035 dates to 1873, speaks of both parents’ lives as “just wearing out.” If that date is right, Phebe was still living in 1873, which fits 1874. A death or burial record would settle it.</p><div class="chips"><button type="button" class="chip plain" data-post="P035" data-image="P035-I01">Read the letter and transcription</button><a class="chip plain" href="${href({ view: 'explore', event: 'X-phebe-death', era: 'diaries', person: null, story: null, scene: null })}">See it on the timeline</a></div></article>
      <article id="hand"><span class="kind">Research note · method</span><h3>Reading Wynona’s hand</h3><p>Every handwritten page appears beside a transcription. Claude drafts it from the scan and marks any word it isn’t sure of; Beth checks it against the page. On the 12 Oct 1890 diary page the draft matched Beth’s own transcription word for word except one word her post dropped.</p><div class="chips"><button type="button" class="chip plain" data-post="P045" data-image="P045-I06">Open the diary page</button></div></article>
      <article><span class="kind">Recent writing</span><h3>Medium and long posts</h3><p>Beth’s longer pieces will live here once they move from Facebook to the site, with their sources attached.</p><span class="more-context">More context needed</span></article>
    </div>
    ${newsletter()}
  </div></div>`;
  wire(main);
}

// ---------- About ----------
export function renderAbout(main) {
  const sec = (id, title, body) => `<section class="about-grid" id="${id}"><h2>${title}</h2><div style="display:grid;gap:14px">${body}</div></section>`;
  main.innerHTML = `<div class="gut"><div class="wide" style="max-width:1100px">
    <header class="mast"><span class="eyebrow">About</span><h1>About Drumore Friends</h1><p>A working archive of the people of the Drumore Friends Meeting House in Drumore Township, Lancaster County, Pennsylvania, and the families connected to it.</p></header>
    ${sec('what', 'What this is', `<div class="prose"><p>Since June 2025 Beth has been sharing the meeting’s history on Facebook: diaries, letters, portraits, minutes and the stories that connect them. This site gives those stories a lasting home, arranged on a timeline you can walk through and linked to the original posts and documents.</p></div><p><span class="more-context">More context needed</span> <span class="asw">Beth’s own description of the project and its purpose.</span></p>`)}
    ${sec('friends', 'What a Friends meeting is', `<div class="prose"><p>Friends are members of the Religious Society of Friends, often called Quakers. A meeting for worship gathers in expectant silence, and anyone may speak when moved to. A monthly meeting handles the community’s business and records it in minutes, which are among the most important sources in this archive.</p><p>Friends long avoided the names of days and months that honored other gods, so they wrote “First Day” for Sunday and “11th month” for November. Before 1752 the year began in March, so “9th month” then meant November. The site keeps every date as it was written beside its modern reading. Beth explains this in her “Quaker Question of the Day” posts.</p></div><p><span class="more-context">More context needed</span> <span class="asw">The Drumore meeting’s own practice and its relationship to Little Britain Monthly Meeting, in Beth’s words.</span></p>`)}
    ${sec('scope', 'History and scope', `<div class="prose"><p>The dated record runs from 1683, when the first Germantown families arrived, to the meeting house centennial in 1916, with today’s open houses at the end. The families’ route ran west from Germantown through Chester County to Drumore around 1795–1801.</p></div><p class="asw">This prototype draws on ${S.data.events.length} dated event candidates and ${S.data.posts.length} of Beth’s posts captured on 14–15 October 2026.</p><p><span class="more-context">More context needed</span> <span class="asw">Before the record: whose land this was before European settlement, from sources Beth trusts.</span></p>`)}
    ${sec('read', 'How to read the evidence', `<div class="legend">
      <div class="box"><span class="eyebrow">How sure</span>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><circle cx="15" cy="10" r="7" fill="#17302B"/></svg><span><b>Recorded</b>: an original we have seen.</span></div>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><circle cx="15" cy="10" r="7" fill="#FBFBF8" stroke="#17302B" stroke-width="2.2"/><circle cx="15" cy="10" r="2.6" fill="#17302B"/></svg><span><b>Reported</b>: from an account such as Beth’s posts. Everything here is reported for now.</span></div>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><circle cx="15" cy="10" r="7" fill="#FBFBF8" stroke="#17302B" stroke-width="2" stroke-dasharray="3 2.6"/></svg><span><b>Family story</b>: remembered, with no record found yet.</span></div></div>
      <div class="box"><span class="eyebrow">How precise</span>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><circle cx="15" cy="10" r="4" fill="#17302B"/></svg><span>12 Oct 1890: the day is known.</span></div>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><rect x="3" y="7.5" width="24" height="5" rx="2.5" fill="#17302B" opacity=".55"/></svg><span>1861–1865 or Nov 1890: a span, month or year.</span></div>
        <div class="row"><svg viewBox="0 0 30 20" width="30"><circle cx="8" cy="10" r="4" fill="#17302B"/><circle cx="22" cy="10" r="4" fill="#17302B"/><path d="M8 14 Q15 20 22 14" fill="none" stroke="#17302B" stroke-dasharray="2 2"/></svg><span>1872 or 1874: sources disagree; both are shown.</span></div></div>
      <div class="box"><span class="eyebrow">What you are looking at</span>
        <div class="row"><span class="tab" style="position:static;transform:none"><i></i>Original</span><span>From the time, shown as found.</span></div>
        <div class="row"><span class="tab d" style="position:static;transform:none"><i></i>Drawn</span><span>Made now: transcriptions, maps, drawings.</span></div>
        <div class="row"><span class="tab t" style="position:static;transform:none"><i></i>Today</span><span>Recent photographs, always dated.</span></div></div>
      <div class="box"><span class="eyebrow">The map</span><p>The map is a schematic drawing. It keeps direction and order, west to east, but no exact locations. Places known only as a community or a township appear as soft areas, never as pins. Real maps will be traced from the 1864, 1875 and 1899 Drumore maps.</p></div>
    </div>`)}
    ${sec('beth', 'About Beth', `<p><span class="more-context">More context needed</span></p><p class="asw">Beth’s research background, her connection to the meeting and the families, and how she would like to be credited.</p>`)}
    ${sec('corrections', 'Corrections and contributions', `<div class="prose"><p>Every claim on this site shows its sources and how sure it is. If you know a date, a name or a family connection better, the record should change.</p></div><p><span class="more-context">More context needed</span> <span class="asw">How Beth wants to receive corrections and new material, and how living people’s privacy will be handled.</span></p>`)}
    ${sec('prototype', 'This prototype', `<p class="asw">A private working preview. Nothing here is published, verified or cleared for image rights. Newsletter and email forms are mock-ups: they don’t send or keep anything.</p>`)}
  </div></div>`;
}

function newsletter() {
  return `<section class="band-bench" id="newsletter"><span class="eyebrow" style="color:#B9A898">Newsletter</span><h2>New stories, in your inbox</h2><p>When Beth publishes a new story or research note, subscribers would get a short email with the link.</p>
    <form class="form-mock" onsubmit="event.preventDefault();this.querySelector('output').textContent='This prototype doesn’t send or keep email. Nothing was saved.'"><label class="sr" for="nl-email">Email address</label><input id="nl-email" type="email" placeholder="you@example.com" autocomplete="off"><button class="btn" type="submit">Subscribe</button><output class="disclose" aria-live="polite"></output></form>
    <p class="disclose">Mock-up only. This prototype does not send or retain email.</p></section>`;
}

// ---------- source viewer ----------
export async function renderViewer(host, st) {
  if (!st.post) { host.innerHTML = ''; document.body.style.overflow = ''; return; }
  const post = S.idx.posts[st.post];
  const imgs = S.data.images.filter(i => i.postId === post.id);
  const cur = imgs.find(i => i.id === st.image) || imgs[0];
  const tr = cur && S.transcriptions[cur.id];
  document.body.style.overflow = 'hidden';
  host.innerHTML = `<div class="viewer-bg" role="dialog" aria-modal="true" aria-label="Source viewer"><div class="viewer">
    <div class="viewer-top"><span class="vtab"><i></i>${cur ? (cur.provenance === 'today' ? 'Today' : 'Original') + ' · ' + esc(cur.role || 'image') : 'Beth’s post'}</span><span>Post ${post.id} · shared on Facebook ${esc(post.publishedDate)} (publication date, not the historical date)</span><button type="button" id="vClose">Close ✕</button></div>
    <div class="viewer-body">
      <div class="viewer-doc">${cur ? `<img src="${media(cur.id)}" alt="${esc(cur.alt || cur.caption || 'Archive image')}"><span style="font-size:13px;color:#A9B5AF">${esc(cur.caption || 'No caption in the post')} · rights unreviewed</span>` : '<p style="color:#A9B5AF">No image from this post is in the selected set.</p>'}
        ${imgs.length > 1 ? `<div class="viewer-thumbs">${imgs.map(i => `<button type="button" data-img="${i.id}" aria-pressed="${i === cur}" aria-label="${esc(i.caption || i.id)}"><img src="${media(i.id)}" alt=""></button>`).join('')}</div>` : ''}</div>
      <div class="viewer-side">
        ${tr ? `<div><div class="k">Transcription · ${esc(tr.status)}</div></div>
          <div class="handpick" role="group" aria-label="Handwriting style"><button type="button" data-hand="a" aria-pressed="true">A · Everyday hand</button><button type="button" data-hand="b" aria-pressed="false">B · Chancery hand</button></div>
          <div class="ruled" id="vRuled"><div class="hand">${tr.entries.map(en => `<span class="dt">${esc(en.label)}</span>${fmtTr(en.text)}`).join(' ')}</div><div class="tab d"><i></i>Drawn <span>· transcription, 2026</span></div></div>
          <p style="font-size:13px;color:#A9B5AF;margin-top:10px">${esc(tr.note)}</p>` : ''}
        <div><div class="k">Beth’s post, from the local archive</div><h3 class="post-title">${esc(postTitle(post))}</h3><div class="posttext post-body open" id="vText"><p>Loading…</p></div></div>
        <dl><dt>Post</dt><dd>${post.id}</dd>${post.summaryTitleStatus ? `<dt>Title</dt><dd>${esc(post.summaryTitleStatus)}</dd>` : ''}<dt>Shared</dt><dd>${esc(post.publishedDate)}</dd><dt>Original</dt><dd><a href="${esc(post.facebookUrl)}" target="_blank" rel="noopener">Facebook ↗</a></dd>${cur ? `<dt>Image</dt><dd><a href="${esc(cur.originalUrl)}" target="_blank" rel="noopener">Original photo ↗</a></dd>` : ''}<dt>Status</dt><dd>${esc(post.curationStatus)}</dd></dl>
      </div></div></div></div>`;
  const closeV = () => go({ post: null, image: null });
  host.querySelector('#vClose').addEventListener('click', closeV);
  host.querySelector('.viewer-bg').addEventListener('click', e => { if (e.target.classList.contains('viewer-bg')) closeV(); });
  host.querySelectorAll('[data-img]').forEach(b => b.addEventListener('click', () => go({ image: b.dataset.img }, { replace: true })));
  host.querySelectorAll('[data-hand]').forEach(b => b.addEventListener('click', () => { host.querySelectorAll('[data-hand]').forEach(x => x.setAttribute('aria-pressed', x === b)); host.querySelector('#vRuled').classList.toggle('chancery', b.dataset.hand === 'b'); }));
  host.querySelector('#vClose').focus();
  const t = await fetchPost(post.id);
  const target = host.querySelector('#vText');
  if (!target) return;
  if (t == null) { target.innerHTML = '<p>The local archive text is not available.</p>'; return; }
  const rest = postRestText(t);
  target.innerHTML = postBodyHTML(t) + (rest ? `<details class="post-rest"><summary>Photo captions and comments, as captured</summary><div>${esc(rest)}</div></details>` : '');
}
function fmtTr(s) {
  return esc(s).replace(/\[([^\]]+)\]/g, '<span class="ed">$1</span>').replace(/\{([^}]+)\}/g, '<span class="unc" title="Uncertain reading">$1</span>').replace(/~([^~]+)~/g, '<s>$1</s>').replace(/\n\n/g, '<br><br>');
}

function wire(main) {
  main.querySelectorAll('[data-post]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); go({ post: b.dataset.post, image: b.dataset.image || null }); }));
}
export { select };
