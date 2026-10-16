#!/usr/bin/env python3
"""Validate selected archive joins, source text, media, and date precision."""
import datetime, json, pathlib, re
from server import ARCHIVE, DATA
ids={kind:{x['id'] for x in DATA[kind]} for kind in ['events','posts','people','places','stories','scenes','images']}
assert all(len(ids[k])==len(DATA[k]) for k in ids)
def refs(collection,field,target):
 for row in DATA[collection]:
  for value in row.get(field,[]): assert value in ids[target], (collection,row['id'],field,value)
for c,f,t in [('events','sourcePostIds','posts'),('events','personSubjectIds','people'),('events','placeIds','places'),('people','sourcePostIds','posts'),('people','eventIds','events'),('people','storyIds','stories'),('places','sourcePostIds','posts'),('stories','personIds','people'),('stories','sceneIds','scenes'),('scenes','sourcePostIds','posts'),('scenes','imageIds','images'),('scenes','placeIds','places')]: refs(c,f,t)
for e in DATA['events']:
 d=e['date'];raw=d['original'];p=d['precision'];assert e['sourcePostIds'] and len(e['sourcePostIds'])==len(e['sourceUrls'])
 if p=='day': datetime.date.fromisoformat(raw);assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',raw)
 elif p=='month': assert re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])',raw)
 elif p in ('year','approximate_year'): assert re.fullmatch(r'\d{4}',raw)
 elif p=='range':
  a,b=raw.split('/');assert a<=b
  for x in (a,b):
   if len(x)==10: datetime.date.fromisoformat(x)
   elif len(x)==7: assert re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])',x)
   else: assert re.fullmatch(r'\d{4}',x)
 else: assert p=='unknown' and raw==''
 assert d['sortYear']==(None if p=='unknown' else int(raw[:4]))
 assert e['evidenceLevel']=='archive_account' and 'review' in e['publicationStatus']
 for pid,source in zip(e['sourcePostIds'],e['sourceUrls']): assert next(x for x in DATA['posts'] if x['id']==pid)['facebookUrl']==source
for post in DATA['posts']:
 assert datetime.date.fromisoformat(post['publishedDate'])
 f=ARCHIVE/post['archiveFile'];assert f.is_file(),f
 sections=re.split(r'(?=^## )',f.read_text(),flags=re.M); entries=[s for s in sections if s.startswith('## ')];part=entries[post['ordinal']-1]
 assert post['facebookUrl'] in part,(post['id'],'source text mismatch')
 for im in post['allImages']:
  assert (ARCHIVE/im['archivePath']).is_file(),im['archivePath']
for image in DATA['images']:
 assert image['postId'] in ids['posts'];assert (ARCHIVE/image['archivePath']).is_file()
 assert image['rightsStatus']=='unreviewed' and image['originalUrl'].startswith('https://')
for scene in DATA['scenes']:
 assert scene['eventId'] in ids['events']
 assert set(scene['sourcePostIds']).issubset(set(next(e for e in DATA['events'] if e['id']==scene['eventId'])['sourcePostIds']))
for place in DATA['places']:
 assert place['coordinates'] is None and place['locationPrecision'] in ['region','community','unresolved','building']
 assert 'schematic' not in place or {'x','y','kind'} <= set(place['schematic'])
# brand-book extension layer: relationships, portraits, transcriptions, eras
people={p['id']:p for p in DATA['people']}; images={i['id']:i for i in DATA['images']}
for r in DATA.get('relationships',[]):
 assert r['type'] in ('parent','spouse','raisedBy') and r['from'] in people and r['to'] in people and r['sourcePostIds'],r['id']
 for pid in r['sourcePostIds']: assert pid in ids['posts'],(r['id'],pid)
for p in DATA['people']:
 assert p.get('portraitImageId') in (None,*images),p['id']
 for pl in p.get('placeIds',[]): assert pl in ids['places'],(p['id'],pl)
 life=p.get('lifeline')
 if life: assert life['start']['kind'] in ('known','about','unknown','conflict') and life['end']['kind'] in ('known','about','unknown','conflict'),p['id']
for im in DATA['images']:
 for pid in im.get('personIds',[]): assert pid in people,(im['id'],pid)
 assert im.get('provenance','original') in ('original','today','undated','drawn'),im['id']
for t in DATA.get('transcriptions',[]):
 assert t['imageId'] in images and t['sourcePostId'] in ids['posts'] and 'draft' in t['status'],t['id']
eras=DATA.get('eras',[])
assert all(a['end']+1==b['start'] for a,b in zip(eras,eras[1:])),'eras must be contiguous'
for e in DATA['events']:
 if e.get('conflict'): assert all(c['postId'] in e['sourcePostIds'] for c in e['conflict']),e['id']
print(f"Validated {len(DATA['events'])} events, {len(DATA['posts'])} post text links, {len(DATA['images'])} served images, all archive image paths and references.")
