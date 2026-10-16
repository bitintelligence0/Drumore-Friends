# Drumore Friends — private website prototype

BED-280 foundation. This standalone family-history prototype sits beside the source archive in the personal Genealogy Project, outside Bedrok business and product folders. It has no package install, build service, Git remote, or deployment configuration. Keep it local while Beth reviews history and image rights.

## Run

```sh
cd site   # from the repo root
python3 validate.py
python3 server.py
```

Open <http://127.0.0.1:8765/> (or `PORT=8780 python3 server.py` for another port). Restart the server after changing `content.json`, because it loads the image list at startup. Python 3.9+ is sufficient. The private archive must remain at the path below, or set `DRUMORE_ARCHIVE` to its parent directory before running `validate.py` and `server.py`. `PORT` can change the localhost port. The server binds **127.0.0.1** only. Stop with Ctrl-C. Run `python3 build_data.py` only when intentionally refreshing the selected metadata from curation, then run validation again.

## Brand-book rebuild — October 16, 2026

The front end was rebuilt from the working components in `../brand-book/drumore-brand-book-source.html`. `../docs/IMPLEMENTATION_MAP.md` lists each book component and the site file it became. The earlier front end (`style.css`, `story.js`, `mock-site.js` and their CSS) is in the local Git baseline commit and was removed from the working tree.

- **Explore is the landing page.** It opens on the brand book’s cover as a hero and the Gable Line story (DRU-6), then an era bar, mode tabs (Timeline, Family, Map, Imagery, List) and a docked panel. The map appears only in the Map tab. One selection of person, event, place, era or year is shared by every mode and kept in the URL; Back restores it. Landing opens on *Diaries and reunions*; *All eras* shows the planned-width axis from 1683 to today.
- **Timeline:** portrait lifelines by family lane, Reported knots, date spans and fades where the record runs out, “1872 or 1874” for Phebe, and parent, marriage and “raised by” links that appear only for the selected person.
- **Family:** the brand book’s whole tree, plus a Centered layout (the phone default). **Map:** a Drawn schematic with no coordinates that zooms to the selection. **Imagery:** every served archive image with its provenance tab. **List:** events, people and places.
- **Reading pages:** Wynona’s five reviewed scenes in the book’s “one person’s story” layout, with other dated moments, the return pill, a source viewer with Beth’s local post text, and draft transcriptions with the A/B handwriting switch. Stories and About carry “More context needed” wherever Beth’s words are missing. The newsletter and phone desktop prompt are mock-ups that say they don’t send or keep email.
- **Files:** `index.html`, `app.js` (shell, routing, search, phone prompt), `store.js` (data, URL state), `lib.js` (dates, portraits, marks), `hero.js` (cover hero and Gable Line story), `explore.js`, `map.js`, `family.js`, `reading.js`, `site.css`.

### Data layer

Run `python3 build_extensions.py` after `build_data.py`. It adds the brand-book layer to `content.json`: all 37 curated events, ten dated facts taken from post text (each with its post), 20 provisional people, 31 relationships, schematic place positions (`places[].schematic`, never coordinates), portrait face crops, two draft transcriptions and the draft eras. Everything it adds is marked `"origin": "brand-book-extension"` and it never edits the reviewed story fields. `validate.py` now also checks relationships, portraits, transcriptions and eras. Both validators pass.

### QA, 16 October 2026

Checked in a browser at 1440×1000 and 390×844: landing, era switching, person, event and place selection across all five modes, the family tree’s whole and centered layouts, map zoom, list tabs, the story scenes, the source viewer and transcription switch, Stories, About, the delayed phone prompt and the bottom bar. There is no horizontal overflow on phones. Browser Back from a story returns to the same person and year. `../docs/QA_COMPARISON.html` puts the book and the site side by side.

### First impression (DRU-6), 16 October 2026

- **Hero:** the book’s cover rebuilt as Explore’s first screen (`hero.js`). Sized to its content, never `100vh`; no animation. The lifeline strip’s “Into the timeline” link scrolls to the workbench without a history entry.
- **Gable Line story:** chapter 6 in one band: P014 with the amber trace and the three reasons.
- **Header:** the full mark with windows, 56px in a 76px Shutter bar (40px in 60px on phones), wordmark at 24px. The descriptor hides below 1180px and, on phones, the header’s Explore link (the brand and bottom bar already lead there) so nothing wraps or overflows.
- **Landing order:** hero → Gable Line story → era bar and workbench → stories and about. At 1440×900 the era bar starts 529px below the hero.
- **Deep links:** a URL that carries a selection, mode, era or year (and Back from a reading page) lands on the workbench rather than the top of the hero; the phone bottom bar does the same.
- **Map:** only in the Map tab. Labels are placed on a free side of each marker inside the map and clear of the overlays; one with no room drops its second line, then hides (the marker keeps its accessible name, and the place cards list every place). Background county, river and route names give way to place labels. Markers shrink to 55% when the map is zoomed far out. No overlaps, clipped labels or page overflow at 1440, 1024, 768 and 390px.

Not yet done: full keyboard and screen-reader passes (markers and lifelines are focusable and respond to Enter, but the List view is the accessible equivalent for now); image thumbnails (full scans load in Imagery); self-hosted fonts (Google Fonts for now); the real traced maps. Questions for Beth are in `../docs/BETH_QUESTIONS.md`.

## Source snapshot and selection

Source: `/Users/bevanwaite/Documents/Bevan OS/12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/curation/` as captured October 15, 2026. SHA-256 hashes for the three input JSON files are in `content.json.archiveSnapshot`. `content.json` is a bounded metadata snapshot: **10 event candidates, 23 linked posts, 9 selected image records, 2 provisional people, 4 broad/unresolved places, 1 story outline, and 5 scenes**. It does not contain full post text or image bytes. The local server reads those files from the source archive on demand and exposes only the selected `/source/:postId` and `/media/:imageId` paths. The source archive is never written.

Events: `E013`, `E016`, `E017`, `E018` (settlement, meeting request, trial worship, building); `E025`, `E028`, `E029`, `E030`, `E031`, `E033` (Wynona's birth, autograph book, diary, Institute, winter diary, Isaac's death). This set covers approximate year, year, month, day, and range dates; early institutional and person-centered material; single and multiple source posts; Drumore and Millersville geography. `E031` deliberately retains its 12-post source set. These are candidate claims, not verified history. The other 27 event candidates and 117 posts remain outside this prototype's data layer. Only 9 image records are locally served from the 513-path archive; the broader paths and captions remain in selected post metadata for research.

## Shared data contract for BED-281–283

`content.json` is the sole browser data layer. IDs remain archive IDs for posts (`P...`) and events (`E...`). Other IDs are stable prototype slugs. Resolve cross-references by ID; do not derive event facts from post publication dates or first-pass entity tags.

- `events[]`: `id`, `date`, `title`, `summary`, `sourcePostIds[]`, aligned `sourceUrls[]`, `personSubjectIds[]`, `nameMentions[]`, `placeIds[]`, `placeMentions[]`, `evidenceLevel`, `publicationStatus`, `editorialStatus`. Multiple posts can support one event. `personSubjectIds` are editorial links under review; `nameMentions` only repeat curation tags and do **not** prove presence or unique identity.
- `date`: `original` and `precision` (`day`, `month`, `year`, `approximate_year`, `range`, `unknown`), plus `start`, `end`, and `sortYear`. Use `sortYear` only for ordering or focus. Render `original` with its precision; never present a synthetic day. Range boundaries may have month, year, or day granularity. No selected event has an unknown date, but the schema and renderer support it.
- `posts[]`: archive file and one-based ordinal resolve original text; `publishedDate` is **Facebook publication date**, distinct from `events[].date`; `facebookUrl`, excerpt, full image metadata, curation status, and selected image IDs preserve provenance.
- `people[]`: provisional identity, aliases, source post IDs, linked events and stories. Add explicit relationship types and identity review as the story grows; do not promote text tags to participation edges.
- `places[]`: label, `locationPrecision`, optional coordinates, source post IDs, status. Coordinates are null in this snapshot. No exact pin is supported yet.
- `stories[]` list ordered scene IDs; `scenes[]` link an event, posts, images, and places. Their date comes from the linked event. BED-282 may add prose, scene-level citations, and reviewed dates without changing the joins.
- `images[]`: selected archive path, post ID, caption, alt, original image URL, kind, and rights status. Image rights are `unreviewed`. Original images remain distinct from any future interpretive art.

The URL is the navigation state. Supported query parameters: `view=timeline|story|map`, `year` (timeline focus), `event` (selected/return event), `story`, `scene`, and `place`. Examples: `/?view=timeline&year=1890&event=E029`, `/?view=story&story=wynona-diary&scene=first-diary-page&year=1890&event=E029`, `/?view=map&place=drumore-area&year=1890&event=E029`. Carry `year` and `event` through story and map links; use History API entries for selections so Back restores the prior view. Direct entry falls back to a valid record. BED-281 owns richer timeline focus/scale, BED-282 owns completed story reading, and BED-283 owns map rendering and location review. Keep these parameters compatible.

## Decisions and open review

1. Use a dependency-free local Python server and vanilla browser modules for a runnable foundation. No public repository, copied media library, or deployment setup.
2. Keep the selected metadata snapshot checked only in this local project; read original post text and image bytes from the archive on demand. Rebuild explicitly if curation changes.
3. Preserve curation's `archive_account` evidence level and candidate status verbatim. Do not imply independently confirmed records. Use approximate/broad place records and no coordinates.
4. Temporary colors, typography, spacing, and motion live in `style.css :root` and await the brand book.

Questions for Beth: confirm the 1811 and 1812 Little Britain minutes, 1816 building date and precise meetinghouse location; inspect the original Wynona diary/transcription and verify her birth date, Institute entries, winter chronology, and Isaac Bolton Shoemaker's death; disambiguate people named in family stories; establish photo/diary ownership, reuse permission, captions, and credits; confirm any historic map reuse terms and household locations before pins. The curation's `questions-for-beth.md` has the broader editorial checklist.

`validate.py` checks IDs and references, selected full post text at each archive ordinal, all selected-post image paths, selected served images, date syntax and calendar values, source URL alignment, and unresolved geolocation. The browser preview was inspected for timeline, story, place, image, and browser Back routes. This is a foundation view, not the finished journey or publication review.

## BED-281 timeline implementation — October 16, 2026

The timeline is in `app.js` and the temporary visual treatment is in `style.css`, with palette, typography, spacing, and motion values in `:root`. The selected 10 events in `content.json` are the only timeline records. Browse all, focus on the early meeting records (1795–1816), or focus on Wynona's records (1868–1891). A break explicitly labels 1817–1867 as a span without **selected** events; it does not imply a historical void. Records in 1890 stack under one year heading so all remain selectable. Date labels preserve approximate, month, day, and range precision.

Each timeline card opens a concise preview. `view=event` is the new event detail route, carrying `year`, `event`, and `focus` through the URL. The detail retains the claim status, original post links and local source-text access, and links to the provisional story/place views. Back and Return to timeline restore the selected event and period; direct links also work. BED-282 and BED-283 should preserve `focus` in links back to the timeline. Keyboard users can Tab to controls, use Left/Right arrows among event cards, and press Enter to select. The rail supports native horizontal touch scrolling. Reduced-motion preference removes card motion and smooth scrolling.

Image cues are **explicitly mapped by event ID** in `eventImage()` rather than taking any image from the first linked post. In particular, the shared P006 portrait is not displayed as an image of the 1795, 1811, or 1812 events. Chosen images still carry unreviewed rights and source captions, and a post image is not proof that it depicts the historical instant. Before publication, Beth should review every image-event association and caption.

Design choice: a horizontally browsed year rail with larger archival cards and a separate preview. A fully proportional 1795–1891 axis made the 1890 records collide and gave the unselected middle decades excessive empty space; uniform cards without a gap hid the coverage change. The current condensed gap and stacked shared-year cards retain orientation and selectability while saying exactly where the selected material is thin. No user feedback has been collected yet.

Browser review on desktop (1280×720) and phone (390×844) exercised period focus, 1890 selection, date-range selection, source-text disclosure, event detail, return context, keyboard arrow/Enter, and phone overflow. `python3 validate.py` passed on the shared content after BED-282's additions. Open questions: whether the year rail should retain exact horizontal offset across detail navigation (it currently restores the selected card and period), how much preview text Beth wants, and whether the final brand book calls for a different cue for uncertain dates.

## BED-282 person story

Wynona's story is a continuous five-scene reading view built from the selected archive material: the 1879 autograph book; her diary opening on October 12, 1890; the November 1890 teachers' institute; the December 1890–February 1891 winter entries; and Isaac Bolton Shoemaker's death on April 16, 1891. Each scene shows the historical date at its recorded precision, narrative and short checked excerpts, related event/place context, original evidence, a source note, local archive text, and the original Facebook/image links. Original photographs and documents are labeled by kind and remain rights-unreviewed. The undated modern sleigh photograph is deliberately omitted from the winter scene so it cannot be mistaken for historical evidence.

The story view lives in `story.js` and `story.css`, leaving the timeline implementation isolated. It preserves the shared `year`, `event`, and BED-281 `focus` URL parameters through scene and place links, so both the explicit return link and browser Back restore the visitor's timeline context. Direct story URLs fall back to the first valid story and scene. `content.json` holds the opening, ending, ordered scene prose, quote provenance, evidence notes, and two additional selected diary-document images; it now serves nine selected images in total.

Future story structure and Beth's editorial questions are in `../docs/STORY_EDITORIAL_TEMPLATE.md`. Add a sourced scene record and append its stable ID to `stories[].sceneIds`; the page requires no structural code change. Run `python3 validate.py` and `python3 validate_story.py` after story edits. Because `build_data.py` regenerates the BED-280 foundation snapshot, update it before intentionally rebuilding or reapply reviewed story fields afterward; do not run it casually over editorial work.

BED-282 browser review covered the full five-scene read, scene progress links, local source disclosure, direct entry, timeline return context, and a 390×844 phone viewport. The phone page has no horizontal overflow. JavaScript syntax checks and both validation scripts pass. Historical claims, person relationships, captions, credits, cemetery/location details, and image/diary permissions still require Beth's review before publication.

## Integrated brand-book site mock — October 16, 2026

The local preview now applies the v0.2 Plain Light system across a visitor-facing home page, explainer, archive navigation, family study, interpretive regional map, accessible browse list, people directory, person records, story and field-note index, editorial article placeholders, and newsletter surfaces. `BRAND.md`, `tokens.css`, `mark.svg`, `mark-small.svg`, and `favicon.svg` are the reusable developer handoff extracted from the visual brand book. `mock-site.js` and `mock-site.css` hold the new views so the established timeline and BED-282 story remain isolated.

All archive routes continue to use the shared query contract: `view`, `year`, `event`, `focus`, `story`, `scene`, `place`, `person`, and `post`. The family view clearly labels the brand-book relationship study as provisional. The map uses a schematic broad-area drawing and does not assert coordinates. Medium-form article pages say “More context needed” and provide prompts for Beth instead of fabricated history.

Newsletter and phone-to-desktop forms are presentation-only. They do not transmit or retain an email. On database views under 760px, a session-scoped prompt appears after 4.2 seconds and explains that the eventual desktop-link email would also subscribe the visitor to the newsletter. The persistent mobile navigation provides Timeline, Family, Places, and Stories.
