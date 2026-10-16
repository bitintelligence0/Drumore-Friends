# Brand book → website implementation map

The site is built from the working components in the brand book source
(`../brand-book/drumore-brand-book-source.html`). Search the source for the marker in the
second column to see the original.

| Brand-book component | Marker in the book source | Site component | File |
|---|---|---|---|
| Color, type and motion tokens | `:root {` | Same tokens, unchanged values | `site.css` |
| Cover | `COVER`, `.cover {` | Explore’s opening hero: full mark, display wordmark, descriptor, intro, P016 on a Today mat, lifeline strip leading into the timeline | `hero.js`, `site.css` |
| The mark, chapter 6 | `6 WORDMARK`, `.trace` | Gable Line story under the hero: P014 with the amber trace, the three reasons | `hero.js`, `site.css` |
| Gable Line mark | `<symbol id="mark">` | Full mark with windows in the hero, header (56px in a 76px bar, 40px in 60px on phones) and footer; windowless `mark-small.svg` only for the favicon | `hero.js` (`MARK_FULL`), `app.js`, `mark*.svg` |
| Shutter navigation band | `.nav` | Header with Explore · Stories · About | `app.js` |
| Era selector with planned widths | `.eras`, `axisFig` | Explore era bar; era-weighted time scale | `explore.js` |
| Lifelines, portrait bubbles, evidence knots, “raised by” links | `Main timeline mock` (`#tlSvg`) | Explore → Timeline | `explore.js` |
| Docked side panel | `#tlDock` | Selection dock for person, event or place | `explore.js` |
| Map style study + schematic place view | `Map style study`, `#mapView` | Map mode only (Places on phones), tall, with collision-free labels | `map.js` |
| Family focus view | `#famView` | Explore → Family, “centered” layout (phone default) | `family.js` |
| Full family tree | `Family tree, chapter 11` (`#treeSvg`) | Explore → Family, “whole family” layout | `family.js` |
| List view | `#listView` | Explore → List (events, people, places) | `explore.js` |
| Provenance tab and mats | `.mat`, `.tab` | Explore → Imagery; story figures; source viewer | `explore.js`, `reading.js` |
| Source viewer (Night) | `.viewer` | Source overlay with post text and images | `reading.js` |
| Transcription card + handwriting switch | `.ruled`, `Handwriting switch` | Transcription panel in the source viewer | `reading.js` |
| One person’s story | `.pp`, `.scenes` | Person and story page (Wynona first) | `reading.js` |
| Return pill | `.back` | “Back to 1890 · timeline” on every reading page | `reading.js` |
| Phone flows | `.phone` | Phone layout: vertical time, chip era row, bottom bar, desktop prompt | `explore.js`, `app.js`, `site.css` |
| Selection bus | `Shared people, relationships and one selection` | One state object, kept in the URL | `app.js` |

## Data

`content.json` stays the only browser data layer. `build_extensions.py` adds the brand-book layer on top of
the BED-280 snapshot: all 37 curated events, ten dated facts taken from post text, 20 provisional people,
31 relationships, schematic place positions (never coordinates), portrait crops and two draft transcriptions.
Everything it adds is marked `"origin": "brand-book-extension"` and every claim keeps its source posts.

## URL contract

`view` (`explore` · `person` · `story` · `stories` · `about`), `mode` (`timeline` · `family` · `map` · `imagery` ·
`list`), `era`, `year`, `event`, `person`, `place`, `story`, `scene`, `post` (source viewer), plus the older
`focus` (read as an era) and `view=timeline|map|event` (read as Explore modes) so earlier links still work.
