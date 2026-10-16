#!/usr/bin/env python3
"""Focused checks for the editorial story layer; run after validate.py."""
from server import DATA
by_id={kind:{item['id']:item for item in DATA[kind]} for kind in ('stories','scenes','events','posts','images','people','places')}
for story in DATA['stories']:
 assert story.get('opening') and story.get('ending'),story['id']
 assert len(story['sceneIds'])==len(set(story['sceneIds'])),story['id']
 for scene_id in story['sceneIds']:
  scene=by_id['scenes'][scene_id];event=by_id['events'][scene['eventId']]
  assert scene.get('narrative') and all(scene['narrative']),scene_id
  assert scene.get('evidenceNote') and scene['sourcePostIds'],scene_id
  assert set(scene['sourcePostIds']).issubset(event['sourcePostIds']),scene_id
  assert not scene.get('quote') or scene.get('quoteSourcePostId') in scene['sourcePostIds'],scene_id
  for image_id in scene['imageIds']:
   image=by_id['images'][image_id]
   assert image['postId'] in scene['sourcePostIds'],(scene_id,image_id)
   assert image['originalUrl'] and image['rightsStatus']=='unreviewed',image_id
  for person_id in scene.get('relatedPersonIds',[]):assert person_id in by_id['people'],(scene_id,person_id)
  assert event['date']['precision'] in ('day','month','year','approximate_year','range','unknown'),scene_id
print('Validated story prose, ordered scenes, source/image joins, and quote provenance.')
