#!/usr/bin/env python3
"""Merge the brand-book data layer into content.json.

build_data.py creates the bounded BED-280 snapshot. This script adds, on top of it:
all 37 curated event candidates, a few dated facts taken directly from Beth's posts,
the provisional people and relationships from the brand-book family study, schematic
place records, portrait/document image records with face crops, and draft
transcriptions. Everything it adds carries "origin": "brand-book-extension" so it can
be re-run safely (previous additions are removed first) and never overwrites the
reviewed story fields written for BED-282.

Run after build_data.py, then run validate.py and validate_story.py.
"""
import hashlib, json, os, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parent
DATA_PATH = ROOT / 'content.json'
DATA = json.loads(DATA_PATH.read_text())
ARCHIVE = pathlib.Path(os.environ.get('DRUMORE_ARCHIVE', DATA['archiveSnapshot']['path']))
CURATION = ARCHIVE / 'curation'
ORIGIN = 'brand-book-extension'

def read(name): return json.loads((CURATION / name).read_text())
events_src = {e['id']: e for e in read('timeline-events.json')['events']}
posts_src = {p['id']: p for p in read('post-content-map.json')['posts']}

# ---------- remove previous extension output ----------
for kind in ('events', 'posts', 'people', 'places', 'images'):
    DATA[kind] = [x for x in DATA[kind] if x.get('origin') != ORIGIN]
for kind in ('relationships', 'transcriptions', 'eras'):
    DATA[kind] = []
ids = lambda kind: {x['id'] for x in DATA[kind]}

def date(raw, precision):
    if precision == 'range':
        a, b = raw.split('/')
        return {'original': raw, 'precision': precision, 'start': a, 'end': b, 'sortYear': int(a[:4])}
    return {'original': raw, 'precision': precision, 'start': None if precision == 'unknown' else raw, 'end': None, 'sortYear': None if precision == 'unknown' else int(raw[:4])}

def add_post(pid):
    if pid in ids('posts'): return
    p = posts_src[pid]
    assert (ARCHIVE / p['archive_file']).is_file()
    DATA['posts'].append({'id': pid, 'archiveFile': p['archive_file'], 'ordinal': p['post_ordinal_in_file'], 'publishedDate': p['published_date'], 'title': p['working_title'], 'excerpt': p['summary_excerpt'], 'facebookUrl': p['facebook_url'], 'allImages': [{'archivePath': im['path'], 'caption': im['caption'], 'alt': im['alt'], 'originalUrl': im['original_url']} for im in p['images']], 'selectedImageIds': [], 'curationStatus': p['curation_status'], 'origin': ORIGIN})

# ---------- eras (draft names for Beth) ----------
DATA['eras'] = [
    {'id': 'before', 'label': 'Before the record', 'start': 1600, 'end': 1682, 'weight': 0.45, 'note': 'The land before European settlement. More context needed from Beth’s sources.'},
    {'id': 'ancestors', 'label': 'Ancestors', 'start': 1683, 'end': 1794, 'weight': 1.15},
    {'id': 'settling', 'label': 'Settling Drumore', 'start': 1795, 'end': 1816, 'weight': 0.9},
    {'id': 'meeting', 'label': 'The meeting grows', 'start': 1817, 'end': 1860, 'weight': 0.9},
    {'id': 'war', 'label': 'War years', 'start': 1861, 'end': 1865, 'weight': 0.55},
    {'id': 'diaries', 'label': 'Diaries and reunions', 'start': 1866, 'end': 1916, 'weight': 1.7},
    {'id': 'remembering', 'label': 'Remembering', 'start': 1917, 'end': 2026, 'weight': 0.6},
]

# ---------- places: schematic positions, never coordinates ----------
# x/y are positions on the site's schematic regional drawing (0–1600 wide, west to east),
# chosen to keep relative direction only. They are not geographic coordinates.
existing_places = {p['id']: p for p in DATA['places']}
schematic = {
    'drumore-area': (262, 232, 'region'), 'little-britain-area': (520, 292, 'region'),
    'meetinghouse': (300, 182, 'building'), 'millersville-area': (560, 66, 'community'),
}
for pid, (x, y, kind) in schematic.items():
    existing_places[pid]['schematic'] = {'x': x, 'y': y, 'kind': kind}
new_places = [
    ('fernglen-store', 'Fernglen Store', 'building', (172, 168), ['P034', 'P048'], 'Store and Hambleton home at Fernglen Road and Park Drive (P048); exact site not mapped'),
    ('liberty-square', 'Liberty Square', 'community', (468, 140), ['P045', 'P048'], 'Wynona’s postal address before Fernglen; community only'),
    ('earnhart-farm', 'Earnhart farm, Silver Spring Road', 'community', (440, 222), ['P064', 'P082'], 'Road named in P064; farm site not mapped'),
    ('shoemaker-home', 'Shoemaker home near Goshen P.O.', 'community', (340, 304), ['P034', 'P045'], 'Fulton Township, near the Goshen post office; house site not mapped'),
    ('conowingo-school', 'Conowingo School', 'community', (196, 322), ['P045'], 'One-room school in Fulton Township; site not mapped'),
    ('fulton-township', 'Fulton Township', 'region', (262, 316), ['P034', 'P045'], 'Township-level area'),
    ('friends-cemetery', 'Drumore Friends Cemetery', 'unresolved', (318, 206), [], 'Burial ground named in the archive; plot map and location need review'),
    ('oxford-area', 'Oxford area', 'community', (690, 300), [], 'Area only'),
    ('chester-county', 'Chester County', 'region', (880, 210), [], 'County-level area'),
    ('london-grove', 'London Grove', 'community', (786, 246), [], 'Meeting and township area'),
    ('east-marlborough', 'East Marlborough Township', 'community', (898, 176), [], 'Township area'),
    ('brandywine-area', 'Brandywine and Chadds Ford area', 'community', (1006, 232), [], 'Area only'),
    ('gwynedd', 'Gwynedd', 'community', (1300, 66), [], 'Meeting and township area'),
    ('camp-william-penn', 'Camp William Penn', 'community', (1356, 104), [], 'Civil War training camp; area only'),
    ('germantown', 'Germantown, Philadelphia', 'community', (1412, 162), [], 'Settlement area only; individual lots not mapped'),
    ('overseas', 'Across the Atlantic', 'offmap', (1568, 150), [], 'England and Kresheim, Germany: places of origin beyond this drawing'),
]
for pid, label, kind, (x, y), posts, status in new_places:
    posts = [p for p in posts if p in posts_src]
    for p in posts: add_post(p)
    DATA['places'].append({'id': pid, 'label': label, 'locationPrecision': kind if kind in ('region', 'community', 'unresolved', 'building') else 'region', 'coordinates': None, 'sourcePostIds': posts, 'status': status, 'schematic': {'x': x, 'y': y, 'kind': kind}, 'origin': ORIGIN})

place_map = {
    'Germantown, Philadelphia': ['germantown'], 'Kresheim, Germany': ['overseas'], 'England': ['overseas'], 'Pennsylvania': [],
    'Chester County, Pennsylvania': ['chester-county'], 'Chester County': ['chester-county'], 'East Marlborough Township, Chester County': ['east-marlborough'],
    'London Grove, Chester County': ['london-grove'], 'Gwynedd, Pennsylvania': ['gwynedd'], 'Gwynedd': ['gwynedd'], 'Chadds Ford area, Chester County': ['brandywine-area'],
    'Brandywine area, Chester County': ['brandywine-area'], 'Drumore Township, Lancaster County': ['drumore-area'], 'Drumore Township': ['drumore-area'],
    'Little Britain and Drumore, Lancaster County': ['little-britain-area', 'drumore-area'], 'Drumore Friends Meetinghouse': ['meetinghouse'],
    'Millersville, Lancaster County': ['millersville-area'], 'Civil War service locations': [], 'Camp William Penn': ['camp-william-penn'],
    'Drumore Friends Cemetery': ['friends-cemetery'], 'Drumore area, Lancaster County': ['drumore-area'], 'Fulton Township area, Lancaster County': ['fulton-township'],
    'Fulton Township, Lancaster County': ['fulton-township'], 'Drumore and nearby communities': ['drumore-area'], 'Lancaster County': [],
    'Oxford area, Pennsylvania': ['oxford-area'],
}

# ---------- people (provisional identities from Beth's posts) ----------
# lifeline: start/end = {'year': int|None, 'kind': 'known'|'about'|'unknown'|'conflict', 'note': str}
P = [
    # id, display, short, family, aliases, start, end, relation-to-Wynona, about, posts
    ('smedley-lamborn', 'Smedley Lamborn', 'Smedley Lamborn', 'Lamborn', [], None, (1851, 'known'), 'Grandfather', 'Died 1851, long before Wynona was born.', ['P057', 'P067']),
    ('margaret-bolton-lamborn', 'Margaret Bolton Lamborn', 'Margaret Bolton Lamborn', 'Lamborn', [], None, (1855, 'known'), 'Grandmother', 'Died 1855. Her ten surviving children were 4 to 24 years old.', ['P057', 'P067']),
    ('george-lamborn', 'George Smedley Lamborn', 'George S. Lamborn', 'Lamborn', ['Uncle George'], None, None, 'Uncle (“Uncle George”)', 'Eldest of the eleven children. Married Sarah Walker Coates in May 1856.', ['P067', 'P085']),
    ('sarah-coates-lamborn', 'Sarah Walker Coates Lamborn', 'Sarah W. Coates Lamborn', 'Lamborn', ['Aunt Sallie'], None, None, 'Aunt by marriage', 'One of several women Wynona calls “Aunt Sallie.”', ['P085']),
    ('will-lamborn', 'William Lewis “Will” Lamborn', 'Will Lamborn', 'Lamborn', ['Will'], None, (1876, 'known'), 'Father', 'Fifth of eleven children. Discharged from the Union Army with tuberculosis; died 5 July 1876. No photograph identified yet.', ['P034', 'P035', 'P057']),
    ('phebe-barnard-lamborn', 'Phebe Barnard Lamborn', 'Phebe Barnard Lamborn', 'Lamborn', [], None, (1874, 'conflict'), 'Mother', 'Died 1874 (P057), or when Wynona was 3, about 1872 (P035). The sources disagree.', ['P035', 'P057']),
    ('lib-hambleton', 'Mary Elizabeth “Lib” Lamborn Hambleton', 'Lib Lamborn Hambleton', 'Hambleton', ['Lib', 'Lizzie', 'Aunt Lib'], None, None, 'Aunt who raised her', 'Took Wynona in after Will’s death and raised her at the Fernglen Store.', ['P034', 'P045']),
    ('thomas-hambleton', 'Thomas Benton Hambleton', 'Thomas B. Hambleton', 'Hambleton', ['Uncle Thomas'], None, None, 'Uncle who raised her', 'Teacher, Civil War veteran (79th Pennsylvania) and keeper of the Fernglen Store and post office.', ['P034', 'P048', 'P072']),
    ('alice-shoemaker', 'Alice Lamborn Shoemaker', 'Alice Lamborn Shoemaker', 'Shoemaker', ['Aunt Alice'], (1847, 'about'), None, 'Aunt', 'Orphaned at eight in 1855. Married William Lukens Shoemaker 20 Jan 1870. Wynona boarded with her family while teaching.', ['P045', 'P067']),
    ('william-shoemaker', 'William Lukens Shoemaker', 'William L. Shoemaker', 'Shoemaker', ['Uncle Will'], (1843, 'known'), None, 'Uncle by marriage (“Uncle Will”)', 'Born 1843. Will Lamborn died at his home in 1876.', ['P034', 'P045', 'P067']),
    ('winona-shoemaker', 'Winona “Nonie” Shoemaker Drennan', 'Winona Shoemaker', 'Shoemaker', ['Nonie'], (1870, 'about'), None, 'Cousin, two years younger', 'Also called Nonie. Married Harry Drennan.', ['P045', 'P058', 'P067', 'P071']),
    ('lulu-shoemaker', 'Lula May “Lulu” Shoemaker Ulrich', 'Lula May Shoemaker', 'Shoemaker', ['Lulu'], (1888, 'about'), None, 'Cousin', 'The toddler in Wynona’s diary.', ['P045', 'P058', 'P085']),
    ('harry-drennan', 'Harry Drennan', 'Harry Drennan', 'Shoemaker', [], None, None, 'Cousin’s husband', 'Married Winona Shoemaker.', ['P071']),
    ('linneaus-lamborn', 'Linneaus Lamborn', 'Linneaus Lamborn', 'Lamborn', [], None, None, 'Cousin', 'Planned a surprise for his sister Lucretia in spring 1891.', ['P099']),
    ('lucretia-lamborn', 'Lucretia Mott Lamborn', 'Lucretia Mott Lamborn', 'Lamborn', [], None, None, 'Cousin', 'Linneaus’s sister.', ['P051', 'P099']),
    ('early-earnhart', 'Early Earnhart', 'Early Earnhart', 'Earnhart', [], None, None, 'Husband', 'Married Wynona 8 Dec 1892. Named Early “because he arrived early.”', ['P064']),
    ('harold-earnhart', 'Harold Earnhart', 'Harold Earnhart', 'Earnhart', [], None, None, 'Son', 'Played in the Earnhart Family Orchestra.', ['P064', 'P112']),
    ('raymond-earnhart', 'Raymond Earnhart', 'Raymond Earnhart', 'Earnhart', [], None, None, 'Son', 'Played in the Earnhart Family Orchestra.', ['P064']),
]
existing_people = {p['id']: p for p in DATA['people']}
w = existing_people['wynona-lamborn']
w.update({'shortName': 'Wynona Lamborn', 'family': 'Lamborn', 'relationToWynona': '', 'about': 'Teacher, diarist and musician. Raised at the Fernglen Store by her aunt and uncle after her parents died.', 'lifeline': {'start': {'year': 1868, 'kind': 'known'}, 'end': {'year': None, 'kind': 'unknown'}}, 'portraitImageId': 'P045-I01'})
i = existing_people['isaac-bolton-shoemaker']
i.update({'shortName': 'Isaac Bolton Shoemaker', 'family': 'Shoemaker', 'relationToWynona': 'In her extended circle; relationship needs review', 'about': 'Born 24 Sept 1832; died 16 Apr 1891 after a long illness (P092). Wynona’s diary records his death.', 'lifeline': {'start': {'year': 1832, 'kind': 'known'}, 'end': {'year': 1891, 'kind': 'known'}}, 'portraitImageId': None})
for pid, display, short, fam, aliases, start, end, rel, about, posts in P:
    for p in posts: add_post(p)
    life = {'start': {'year': start[0], 'kind': start[1]} if start else {'year': None, 'kind': 'unknown'}, 'end': {'year': end[0], 'kind': end[1]} if end else {'year': None, 'kind': 'unknown'}}
    if pid == 'phebe-barnard-lamborn': life['end']['readings'] = [{'year': 1872, 'label': 'about 1872', 'postId': 'P035', 'basis': 'died “when she was 3”'}, {'year': 1874, 'label': '1874', 'postId': 'P057'}]
    DATA['people'].append({'id': pid, 'displayName': display, 'shortName': short, 'family': fam, 'aliases': aliases, 'identityStatus': 'provisional archive identity from Beth’s posts; verify', 'relationToWynona': rel, 'about': about, 'sourcePostIds': posts, 'eventIds': [], 'storyIds': [], 'lifeline': life, 'portraitImageId': None, 'origin': ORIGIN})

# ---------- relationships ----------
R = [
    ('parent', 'smedley-lamborn', ['george-lamborn', 'will-lamborn', 'lib-hambleton', 'alice-shoemaker'], ['P057', 'P067']),
    ('parent', 'margaret-bolton-lamborn', ['george-lamborn', 'will-lamborn', 'lib-hambleton', 'alice-shoemaker'], ['P057', 'P067']),
    ('parent', 'will-lamborn', ['wynona-lamborn'], ['P034', 'P035']),
    ('parent', 'phebe-barnard-lamborn', ['wynona-lamborn'], ['P035']),
    ('parent', 'george-lamborn', ['linneaus-lamborn', 'lucretia-lamborn'], ['P085', 'P099']),
    ('parent', 'sarah-coates-lamborn', ['linneaus-lamborn', 'lucretia-lamborn'], ['P085']),
    ('parent', 'alice-shoemaker', ['winona-shoemaker', 'lulu-shoemaker'], ['P045', 'P067']),
    ('parent', 'william-shoemaker', ['winona-shoemaker', 'lulu-shoemaker'], ['P045', 'P067']),
    ('parent', 'wynona-lamborn', ['harold-earnhart', 'raymond-earnhart'], ['P064']),
    ('parent', 'early-earnhart', ['harold-earnhart', 'raymond-earnhart'], ['P064']),
    ('spouse', 'smedley-lamborn', ['margaret-bolton-lamborn'], ['P057']),
    ('spouse', 'george-lamborn', ['sarah-coates-lamborn'], ['P067']),
    ('spouse', 'will-lamborn', ['phebe-barnard-lamborn'], ['P035']),
    ('spouse', 'lib-hambleton', ['thomas-hambleton'], ['P034']),
    ('spouse', 'alice-shoemaker', ['william-shoemaker'], ['P067']),
    ('spouse', 'wynona-lamborn', ['early-earnhart'], ['P064']),
    ('spouse', 'winona-shoemaker', ['harry-drennan'], ['P071']),
    ('raisedBy', 'lib-hambleton', ['wynona-lamborn'], ['P034']),
    ('raisedBy', 'thomas-hambleton', ['wynona-lamborn'], ['P034']),
]
for typ, a, bs, posts in R:
    for b in bs:
        DATA['relationships'].append({'id': f'{typ}:{a}:{b}', 'type': typ, 'from': a, 'to': b, 'sourcePostIds': posts, 'since': 1876 if typ == 'raisedBy' else None, 'status': 'provisional; from Beth’s posts'})
DATA['familyGroups'] = [
    {'id': 'lamborn-siblings', 'parents': ['smedley-lamborn', 'margaret-bolton-lamborn'], 'unshownChildren': 7, 'note': 'Eleven children in all, one died young: also Emeline, Elwood, Sarah Ellen, Lydia and Lucinda (P057, P067).'},
    {'id': 'shoemaker-children', 'parents': ['alice-shoemaker', 'william-shoemaker'], 'unshownChildren': 1, 'note': 'A third child died as an infant; name not yet in the archive (P067).'},
]

# ---------- curated events not yet in the snapshot ----------
person_by_event = {'E026': ['alice-shoemaker', 'william-shoemaker'], 'E027': ['will-lamborn']}
have = ids('events')
for eid, e in events_src.items():
    if eid in have: continue
    for p in e['related_post_ids']: add_post(p)
    DATA['events'].append({'id': eid, 'date': date(e['historical_date'], e['date_precision']), 'title': e['title'], 'summary': e['description_draft'], 'sourcePostIds': e['related_post_ids'], 'sourceUrls': e['source_urls'], 'personSubjectIds': person_by_event.get(eid, []), 'nameMentions': e['people'], 'placeIds': list(dict.fromkeys(x for pl in e['places'] for x in place_map.get(pl, []))), 'placeMentions': e['places'], 'evidenceLevel': e['evidence_level'], 'publicationStatus': e['publication_status'], 'editorialStatus': 'unverified candidate', 'origin': ORIGIN})
for e in DATA['events']:
    if e['id'] == 'E027': e['placeIds'] = ['shoemaker-home', 'fulton-township']

# ---------- dated facts taken directly from post text (not in the curated event list) ----------
X = [
    ('X-fernglen-lease', '1871', 'year', 'Lib and Thomas begin leasing the Fernglen Store', 'The Hambletons lease the store, established in 1849 by John Patton.', ['P048'], ['lib-hambleton', 'thomas-hambleton'], ['fernglen-store']),
    ('X-will-letter', '1873', 'year', 'Will writes a letter to his daughter', 'A three-page letter of love and advice: “Let thy religion be simple, plain, and full of love for thy fellow mortals …”', ['P035'], ['will-lamborn', 'wynona-lamborn'], []),
    ('X-phebe-death', '1871/1874', 'range', 'Phebe Barnard Lamborn dies', 'One post says Wynona’s mother died when Wynona was 3 (about 1872); another gives 1874. Both readings are shown until a record settles it.', ['P035', 'P057'], ['phebe-barnard-lamborn'], []),
    ('X-to-fernglen', '1876', 'year', 'Wynona goes to live with Aunt Lib and Uncle Thomas', 'Will asked his sister Lib and her husband Thomas to raise his daughter. She was eight.', ['P034'], ['wynona-lamborn', 'lib-hambleton', 'thomas-hambleton'], ['fernglen-store']),
    ('X-fernglen-bought', '1885', 'year', 'The Hambletons buy the Fernglen Store', 'After leasing since 1871, Thomas and Lib purchase the store.', ['P048'], ['lib-hambleton', 'thomas-hambleton'], ['fernglen-store']),
    ('X-post-office', '1890', 'year', 'A post office opens at Fernglen', 'Thomas obtains authorization for a post office, which Wynona notes in her diary.', ['P048'], ['thomas-hambleton'], ['fernglen-store']),
    ('X-wynona-marries', '1892-12-08', 'day', 'Wynona marries Early Earnhart', 'Two years after the Christmas evening recorded in her diary. They have two sons, Harold and Raymond.', ['P064'], ['wynona-lamborn', 'early-earnhart'], []),
    ('X-smedley-dies', '1851', 'year', 'Smedley Lamborn dies', 'Wynona’s grandfather; her grandmother Margaret dies four years later.', ['P067'], ['smedley-lamborn'], []),
    ('X-margaret-dies', '1855', 'year', 'Margaret Bolton Lamborn dies', 'Her ten surviving children, aged 4 to 24, are taken in by relatives and Drumore Friends.', ['P067'], ['margaret-bolton-lamborn'], []),
    ('X-george-marries', '1856-05', 'month', 'George S. Lamborn marries Sarah Walker Coates', 'Married at the Cutler home, where Alban and Mary Cutler had become guardians of the Lamborn children.', ['P067'], ['george-lamborn', 'sarah-coates-lamborn'], []),
]
for eid, raw, prec, title, summary, posts, people, places in X:
    for p in posts: add_post(p)
    urls = [next(x for x in DATA['posts'] if x['id'] == p)['facebookUrl'] for p in posts]
    ev = {'id': eid, 'date': date(raw, prec), 'title': title, 'summary': summary, 'sourcePostIds': posts, 'sourceUrls': urls, 'personSubjectIds': people, 'nameMentions': [], 'placeIds': places, 'placeMentions': [], 'evidenceLevel': 'archive_account', 'publicationStatus': 'candidate from post text; review historical claim and source', 'editorialStatus': 'unverified; added from post text, not in the curated event list', 'origin': ORIGIN}
    if eid == 'X-phebe-death': ev['conflict'] = [{'label': 'about 1872', 'postId': 'P035', 'basis': 'died “when she was 3”'}, {'label': '1874', 'postId': 'P057', 'basis': 'stated year'}]
    DATA['events'].append(ev)

# place source posts: add the posts of every event placed there
for pl in DATA['places']:
    if pl.get('origin') != ORIGIN: continue
    extra = [pid for e in DATA['events'] if pl['id'] in e['placeIds'] for pid in e['sourcePostIds']]
    pl['sourcePostIds'] = list(dict.fromkeys(pl['sourcePostIds'] + extra))

# person ↔ event links
by_person = {}
for e in DATA['events']:
    for pid in e['personSubjectIds']: by_person.setdefault(pid, []).append(e['id'])
for p in DATA['people']:
    if p.get('origin') == ORIGIN: p['eventIds'] = by_person.get(p['id'], [])
w['eventIds'] = list(dict.fromkeys(w['eventIds'] + by_person.get('wynona-lamborn', [])))
places_of = {
    'wynona-lamborn': ['fernglen-store', 'liberty-square', 'millersville-area', 'conowingo-school', 'shoemaker-home', 'meetinghouse'],
    'will-lamborn': ['shoemaker-home'], 'lib-hambleton': ['fernglen-store'], 'thomas-hambleton': ['fernglen-store'],
    'alice-shoemaker': ['shoemaker-home'], 'william-shoemaker': ['shoemaker-home'], 'winona-shoemaker': ['shoemaker-home'], 'lulu-shoemaker': ['shoemaker-home'],
    'early-earnhart': ['earnhart-farm'], 'isaac-bolton-shoemaker': ['friends-cemetery'],
}
for p in DATA['people']: p['placeIds'] = places_of.get(p['id'], [])

# ---------- images: portraits, documents, today photographs ----------
def dims(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(path)], capture_output=True, text=True).stdout.split()
    return (int(out[-3]), int(out[-1])) if len(out) >= 4 else (None, None)
IMG = [
    # post, position, role, provenance, persons, crop (cx, cy, side as fraction of width) or None, caption override
    ('P034', 1, 'portrait', 'original', ['lib-hambleton'], (.45, .10, .36), None),
    ('P034', 4, 'photograph', 'original', ['lib-hambleton', 'thomas-hambleton'], None, None),
    ('P035', 1, 'document', 'original', ['will-lamborn', 'wynona-lamborn'], None, 'Will Lamborn’s letter to his daughter, page 1'),
    ('P035', 2, 'document', 'original', ['will-lamborn', 'wynona-lamborn'], None, 'Will Lamborn’s letter to his daughter, page 2'),
    ('P035', 3, 'document', 'original', ['will-lamborn', 'wynona-lamborn'], None, 'Will Lamborn’s letter to his daughter, page 3'),
    ('P045', 6, 'document', 'original', ['wynona-lamborn'], None, 'Wynona’s diary, 12–15 Oct 1890'),
    ('P048', 1, 'portrait', 'original', ['wynona-lamborn'], None, None),
    ('P051', 5, 'portrait', 'original', ['lucretia-lamborn'], (.47, .29, .80), None),
    ('P058', 1, 'portrait', 'original', ['winona-shoemaker'], (.47, .29, .76), None),
    ('P064', 1, 'portrait', 'original', ['wynona-lamborn', 'early-earnhart'], (.76, .28, .26), None),
    ('P067', 1, 'portrait', 'original', ['margaret-bolton-lamborn'], (.49, .36, .46), None),
    ('P067', 3, 'portrait', 'original', ['alice-shoemaker'], (.50, .38, .80), None),
    ('P067', 6, 'portrait', 'original', ['william-shoemaker', 'alice-shoemaker'], (.22, .36, .30), None),
    ('P071', 2, 'portrait', 'original', ['winona-shoemaker', 'harry-drennan'], (.70, .33, .32), None),
    ('P072', 1, 'portrait', 'original', ['thomas-hambleton'], (.52, .33, .72), None),
    ('P085', 1, 'portrait', 'original', ['lulu-shoemaker'], (.42, .19, .46), None),
    ('P085', 2, 'portrait', 'original', ['george-lamborn'], (.54, .33, .76), None),
    ('P085', 3, 'portrait', 'original', ['sarah-coates-lamborn'], (.53, .32, .72), None),
    ('P140', 4, 'map', 'original', [], None, None),
    ('P080', 2, 'photograph', 'original', [], None, None),
    ('P016', 1, 'photograph', 'today', [], None, 'The meeting house in spring, 2025'),
    ('P014', 1, 'photograph', 'today', [], None, 'Gable end of the meeting house and its sign'),
    ('P107', 1, 'photograph', 'today', [], None, 'Open house: portraits along the benches, 2026'),
]
portrait_for = {'lib-hambleton': 'P034-I01', 'lucretia-lamborn': 'P051-I05', 'winona-shoemaker': 'P058-I01', 'early-earnhart': 'P064-I01', 'margaret-bolton-lamborn': 'P067-I01', 'alice-shoemaker': 'P067-I03', 'william-shoemaker': 'P067-I06', 'harry-drennan': 'P071-I02', 'thomas-hambleton': 'P072-I01', 'lulu-shoemaker': 'P085-I01', 'george-lamborn': 'P085-I02', 'sarah-coates-lamborn': 'P085-I03'}
crop_owner = {'P064-I01': 'early-earnhart', 'P067-I06': 'william-shoemaker', 'P071-I02': 'harry-drennan'}
have_img = ids('images')
for post, pos, role, prov, persons, crop, cap in IMG:
    add_post(post)
    p = posts_src[post]; im = p['images'][pos - 1]; iid = f'{post}-I{pos:02d}'
    W, H = dims(ARCHIVE / im['path'])
    rec = {'id': iid, 'postId': post, 'archivePath': im['path'], 'caption': cap or im['caption'], 'alt': cap or im['caption'] or im['alt'], 'originalUrl': im['original_url'], 'rightsStatus': 'unreviewed', 'kind': 'archive_image', 'role': role, 'provenance': prov, 'personIds': persons, 'width': W, 'height': H, 'origin': ORIGIN}
    if crop: rec['faceCrop'] = {'cx': crop[0], 'cy': crop[1], 'side': crop[2], 'personId': crop_owner.get(iid, persons[0])}
    if iid in have_img:
        for x in DATA['images']:
            if x['id'] == iid: x.update({k: v for k, v in rec.items() if k not in ('id', 'origin', 'caption', 'alt')})
    else:
        DATA['images'].append(rec)
for x in DATA['images']:
    x.setdefault('role', 'photograph'); x.setdefault('provenance', 'original'); x.setdefault('personIds', [])
    if x['id'] == 'P045-I01': x.update({'role': 'portrait', 'personIds': ['wynona-lamborn'], 'faceCrop': {'cx': .49, 'cy': .27, 'side': .80, 'personId': 'wynona-lamborn'}})
    if x['id'] in ('P045-I03', 'P045-I04', 'P047-I01'): x['role'] = 'document'; x['personIds'] = ['wynona-lamborn']
    if x['id'] == 'P092-I01': x['personIds'] = ['isaac-bolton-shoemaker']
    if x['id'] == 'P063-I01': x['provenance'] = 'undated'
for x in DATA['images']:
    if not x.get('width'):
        x['width'], x['height'] = dims(ARCHIVE / x['archivePath'])
for p in DATA['people']:
    if p['id'] in portrait_for: p['portraitImageId'] = portrait_for[p['id']]
for post in DATA['posts']:
    post['selectedImageIds'] = [x['id'] for x in DATA['images'] if x['postId'] == post['id']]

# ---------- draft transcriptions (Claude, unchecked by Beth) ----------
DATA['transcriptions'] = [
    {'id': 'T-diary-1890-10', 'imageId': 'P045-I06', 'sourcePostId': 'P045', 'personIds': ['wynona-lamborn'], 'status': 'draft by Claude; Beth to check against the page',
     'note': 'Matches Beth’s posted transcription of 12 Oct (P045) word for word except “moved in on Oct. 11,” where her post drops “on.” Bracketed tags are editorial, not Wynona’s.',
     'entries': [
        {'date': '1890-10-12', 'label': '12 Oct 1890, continued', 'text': '… to keep. To-day has been dull and rainy, the leaves falling, covering the ground, as a reminder that winter is approaching. All hail! To Autumn, in which there is something so expressive to me. Uncle, Aunt [Thomas and Lib Hambleton] and I, home all day, till evening I came down to Uncle Will’s [William L. Shoemaker]. Had a dark and rainy drive, but not a lonesome one. This evening the first I spent in their new house. They moved in on Oct. 11. As far as a nice home goes, they have every advantage.'},
        {'date': '1890-10-13', 'label': 'Oct. 13.', 'text': 'Nothing particular happened to-day. Had my regular school duties to attend to. Learned this wk. of {Groff’s} Mill being burned on Oct. 8, about 8 P.M. Much damage done. To-day is still dull, and very cold and raw air.'},
        {'date': '1890-10-14', 'label': 'Oct. 14.', 'text': 'Just came home from school. Cleared about noon to-day, with wind in West, having a clear, bracing feeling in the air. The new book-case arrived at the school-house. Cost $6.00. To-day finished my second month of school. Last eve Neal & Sallie Hambleton made a call.'},
        {'date': '1890-10-15', 'label': 'Oct. 15.', 'text': 'After I came home from school went up to Uncle Jacob’s, and spent about 1 hr. talking with Aunt Sallie and Mamie. Had a pleasant day at school. First load of coal hauled for winter. Weather is very clear and cool, drying up mud very fast.'},
     ]},
    {'id': 'T-letter-1873-p1', 'imageId': 'P035-I01', 'sourcePostId': 'P035', 'personIds': ['will-lamborn', 'wynona-lamborn'], 'status': 'draft by Claude; Beth to check against the page',
     'note': 'Page 1 of 3. Original spelling kept (“greatful,” “layed”). A repeated “and” is struck through in the original. If the letter dates from 1873, as P035 says, it speaks of both parents as living, which fits the 1874 death date for Phebe (P057).',
     'entries': [
        {'date': '1873', 'label': 'Page 1', 'text': 'My Dearly beloved daughter thy fathers and Mothers lives are just wearing out, and ere many months pass away, the Sun of their lives will have set; and thee will behold them no more on Earth in their material forms; and dear Child, knowing that I am poor in what is called worldly possessions & the probabilities are that I cannot bequeath to thee any property of that nature, I feel greatful that there is a wealth which I can and will cheerfully give to thee, that thee may use it daily during thy natural life and ~and~ be abundantly rewarded; and when thy sojourn on earth is ended, thee will receive thy great reward in the Summerland.\n\nI enjoin it upon thee, Dear Child, to follow well the advice herein layed down, and thee cannot go much astray from the path of duty to thyself and to others.'},
     ]},
]
DATA['schemaVersion'] = 2
DATA_PATH.write_text(json.dumps(DATA, ensure_ascii=False, indent=2) + '\n')
print(f"content.json: {len(DATA['events'])} events, {len(DATA['people'])} people, {len(DATA['relationships'])} relationships, {len(DATA['places'])} places, {len(DATA['posts'])} posts, {len(DATA['images'])} images, {len(DATA['transcriptions'])} transcriptions")
