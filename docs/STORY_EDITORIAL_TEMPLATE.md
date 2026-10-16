# Person story scene template · BED-282

This is an editorial handoff for Beth, not a production editor. The Wynona story in `content.json` is the working example. Its five ordered `sceneIds` render in one continuous reading view; a sixth scene can be added to that array and to `scenes[]` without changing page code.

## What Beth supplies or confirms

1. **Person and identity:** preferred display name, aliases, relationships, and which primary record ties each name to this person. A name in a Facebook post alone does not establish identity or participation.
2. **Story arc:** a one-paragraph opening, why these moments belong together, and a short ending that does not imply the selected moments are a complete life.
3. **Each scene:** a concise title; historical date at its actual precision (day, month, year, approximate year, range, or unknown); two or three short narrative paragraphs; relevant person, event, and place IDs; and what remains uncertain.
4. **Evidence:** at least one source post or original item for each scene. Supply an image or document when it materially supports the scene, with its original caption, owner or repository, creator if known, original URL, rights status, and useful alt description. A contextual postcard or later photograph should be described as contextual, not as an image of the event. A new illustration, if ever added, must be labeled **Interpretation** and paired with the accessible original evidence.
5. **Review:** compare quoted diary text against the original manuscript, confirm names and dates, identify image ownership and reuse permission, and approve captions and credit lines before publication.

## How we draft together

Beth can choose the moments, identify people, supply documents, and mark questions. A collaborator can shape prose, shorten it for reading, transcribe an image provisionally, and draft captions or alt text. The draft must keep the source post ID and distinguish direct quotation, archive-account interpretation, and our inference. Unresolved claims stay in `evidenceNote` or an editorial question; they are not silently resolved by fluent prose.

## Record shape

```json
{
  "id": "stable-scene-slug",
  "title": "A moment a reader can recognize",
  "eventId": "E000",
  "sourcePostIds": ["P000"],
  "imageIds": ["P000-I01"],
  "placeIds": ["broad-or-verified-place-id"],
  "relatedPersonIds": ["verified-or-provisional-person-id"],
  "narrative": ["First short paragraph.", "Second short paragraph."],
  "quote": "Optional short, checked quotation",
  "quoteSourcePostId": "P000",
  "evidenceNote": "What the sources support, what is contextual, and what needs review."
}
```

The linked `event.date` supplies the scene date. `event.date.original` and `precision` must describe the historical moment; `posts[].publishedDate` is only when the archive account posted. New `images[]` records point to selected files in the private archive and preserve `postId`, `archivePath`, `originalUrl`, `caption`, `alt`, `kind`, and `rightsStatus`. Do not copy source image bytes into the site folder. If a scene needs a date different from an existing event, add a sourced event record with the right precision and stable ID rather than inventing a sort day.

## Adding a scene

1. Pick one coherent moment and record why it advances this person's story.
2. Add or link the sourced event, posts, person and broad/verified place records; keep all ID joins valid.
3. Add a scene record as above and append its ID in reading order to `stories[].sceneIds`.
4. Run `python3 validate.py` and `python3 validate_story.py` from this folder, then open the localhost preview at desktop and phone widths. Check source text, original images, captions, direct scene URL, and return to the same timeline `year`, `event`, and `focus`.
5. Keep the scene in editorial prototype status until Beth confirms historical claims and image rights.

## Wynona questions for Beth

- Can we compare the autograph spread and October 12, 1890 diary opening with the complete originals? Who owns the books, and what credit should appear?
- Is the 1879 autograph-book start date independently documented, and are the people named on the selected spread identified correctly?
- Which parts of Wynona's school and household context are documented outside the archive posts? Does the November institute location need to distinguish Lancaster sessions from Millersville training more clearly?
- Are the winter transcriptions and dates accurate across the twelve linked posts? Which two or three entries best represent this period?
- Can a death record or cemetery record confirm Isaac Bolton Shoemaker's date, identity, relationship to Wynona, and grave location? The current image does not establish a precise map pin.
- What are the usage rights, original captions, photographers or repositories, and preferred credit lines for the autograph pages, diary photographs, postcard and grave image?
