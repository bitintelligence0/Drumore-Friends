#!/usr/bin/env python3
"""Create a bounded metadata snapshot from the read-only Drumore curation."""
import hashlib, json, os, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
ARCHIVE = pathlib.Path(os.environ.get('DRUMORE_ARCHIVE', '/Users/bevanwaite/Documents/Bevan OS/12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive'))
CURATION = ARCHIVE / 'curation'
EVENT_IDS = ['E013','E016','E017','E018','E025','E028','E029','E030','E031','E033']
IMAGE_POST_IDS = ['P006','P080','P045','P047','P054','P063','P092']

def read(name): return json.loads((CURATION / name).read_text())
def date(raw, precision):
    if precision == 'day': pattern = r'\d{4}-\d{2}-\d{2}'
    elif precision == 'month': pattern = r'\d{4}-\d{2}'
    elif precision in ('year','approximate_year'): pattern = r'\d{4}'
    elif precision == 'range': pattern = r'\d{4}(?:-\d{2})?(?:-\d{2})?/\d{4}(?:-\d{2})?(?:-\d{2})?'
    elif precision == 'unknown': pattern = r''
    else: raise ValueError(f'unknown date precision {precision}')
    assert re.fullmatch(pattern, raw), (raw, precision)
    if precision == 'range':
        a,b=raw.split('/')
        assert a <= b, raw
        return {'original':raw,'precision':precision,'start':a,'end':b,'sortYear':int(a[:4])}
    return {'original':raw,'precision':precision,'start':None if precision=='unknown' else raw,'end':None,'sortYear':None if precision=='unknown' else int(raw[:4])}

events_source={x['id']:x for x in read('timeline-events.json')['events']}
posts_source={x['id']:x for x in read('post-content-map.json')['posts']}
assert len(EVENT_IDS)==len(set(EVENT_IDS))
selected=[events_source[i] for i in EVENT_IDS]
post_ids=list(dict.fromkeys(pid for e in selected for pid in e['related_post_ids']))
assert all(pid in posts_source for pid in post_ids)
images=[]
for pid in IMAGE_POST_IDS:
    p=posts_source[pid]
    im=p['images'][0]
    assert (ARCHIVE / im['path']).is_file(), im['path']
    images.append({'id':f'{pid}-I01','postId':pid,'archivePath':im['path'],'caption':im['caption'],'alt':im['alt'],'originalUrl':im['original_url'],'rightsStatus':'unreviewed','kind':'archive_image'})
image_ids={i['id'] for i in images}
posts=[]
for pid in post_ids:
    p=posts_source[pid]
    assert (ARCHIVE/p['archive_file']).is_file()
    posts.append({'id':pid,'archiveFile':p['archive_file'],'ordinal':p['post_ordinal_in_file'],'publishedDate':p['published_date'],'title':p['working_title'],'excerpt':p['summary_excerpt'],'facebookUrl':p['facebook_url'],'allImages':[{'archivePath':im['path'],'caption':im['caption'],'alt':im['alt'],'originalUrl':im['original_url']} for im in p['images']],'selectedImageIds':[i['id'] for i in images if i['postId']==pid],'curationStatus':p['curation_status']})
places=[
 {'id':'drumore-area','label':'Drumore Township, Lancaster County','locationPrecision':'region','coordinates':None,'sourcePostIds':['P006','P045'],'status':'broad area; no household pin'},
 {'id':'meetinghouse','label':'Drumore Friends Meetinghouse','locationPrecision':'unresolved','coordinates':None,'sourcePostIds':['P006','P080'],'status':'building identity in archive; address and historical footprint await review'},
 {'id':'little-britain-area','label':'Little Britain and Drumore','locationPrecision':'region','coordinates':None,'sourcePostIds':['P006'],'status':'meeting jurisdiction and broad area, not a point'},
 {'id':'millersville-area','label':'Millersville, Lancaster County','locationPrecision':'community','coordinates':None,'sourcePostIds':['P054'],'status':'community only; school image caption is not a geolocation'},
]
place_by_event={'E013':['drumore-area'],'E016':['little-britain-area','drumore-area'],'E017':['drumore-area'],'E018':['meetinghouse'],'E025':['drumore-area'],'E028':['drumore-area'],'E029':['drumore-area'],'E030':['millersville-area'],'E031':['drumore-area'],'E033':['drumore-area']}
people=[
 {'id':'wynona-lamborn','displayName':'Jessie Wynona Lamborn Earnhart','aliases':['Wynona','Nonie'],'identityStatus':'provisional archive identity; verify with Beth and primary records','sourcePostIds':['P045','P047','P054','P092'],'eventIds':['E025','E028','E029','E030','E031','E033'],'storyIds':['wynona-diary']},
 {'id':'isaac-bolton-shoemaker','displayName':'Isaac Bolton Shoemaker','aliases':[],'identityStatus':'provisional archive identity; verify records','sourcePostIds':['P092','P093'],'eventIds':['E033'],'storyIds':[]}
]
subject_by_event={'E025':['wynona-lamborn'],'E028':['wynona-lamborn'],'E029':['wynona-lamborn'],'E030':['wynona-lamborn'],'E031':['wynona-lamborn'],'E033':['wynona-lamborn','isaac-bolton-shoemaker']}
events=[]
for e in selected:
    assert e['evidence_level']=='archive_account'
    events.append({'id':e['id'],'date':date(e['historical_date'],e['date_precision']),'title':e['title'],'summary':e['description_draft'],'sourcePostIds':e['related_post_ids'],'sourceUrls':e['source_urls'],'personSubjectIds':subject_by_event.get(e['id'],[]),'nameMentions':e['people'],'placeIds':place_by_event[e['id']],'placeMentions':e['places'],'evidenceLevel':e['evidence_level'],'publicationStatus':e['publication_status'],'editorialStatus':'unverified candidate'})
scenes=[
 {'id':'autograph-book','title':'An autograph book','eventId':'E028','sourcePostIds':['P047'],'imageIds':['P047-I01'],'placeIds':['drumore-area']},
 {'id':'first-diary-page','title':'Beginning the diary','eventId':'E029','sourcePostIds':['P045','P042','P099'],'imageIds':['P045-I01'],'placeIds':['drumore-area']},
 {'id':'millersville-institute','title':'A week at Institute','eventId':'E030','sourcePostIds':['P051','P054'],'imageIds':['P054-I01'],'placeIds':['millersville-area']},
 {'id':'winter-entries','title':'Winter entries','eventId':'E031','sourcePostIds':events_source['E031']['related_post_ids'],'imageIds':['P063-I01'],'placeIds':['drumore-area']},
 {'id':'isaac-news','title':'News of Isaac','eventId':'E033','sourcePostIds':['P092','P093'],'imageIds':['P092-I01'],'placeIds':['drumore-area']},
]
stories=[{'id':'wynona-diary','title':'Wynona’s diary years','personIds':['wynona-lamborn'],'sceneIds':[s['id'] for s in scenes],'status':'outline only; BED-282 will write and verify the narrative'}]
files=['timeline-events.json','post-content-map.json','entity-index.json']
data={'schemaVersion':1,'archiveSnapshot':{'path':str(ARCHIVE),'curationFiles':{f:hashlib.sha256((CURATION/f).read_bytes()).hexdigest() for f in files},'captured':'2026-10-15','publicationStatus':'private prototype; no public clearance'},'events':events,'posts':posts,'people':people,'places':places,'stories':stories,'scenes':scenes,'images':images}
(ROOT/'content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f"Wrote {len(events)} events, {len(posts)} posts, {len(images)} selected images, {len(scenes)} scenes")
