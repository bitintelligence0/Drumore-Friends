# Drumore Friends

A private website prototype for the history of the Drumore Friends Meeting House (Drumore Township, Lancaster County, PA) and the families connected to it, built from Beth’s Facebook posts and the documents behind them.

Planning lives in Linear: team **DRU**, project *Drumore Friends Meeting House — Interactive History Prototype*, milestones 6–10.

## What’s in this repo

| Folder | What it is |
|---|---|
| `site/` | The website: a dependency-free local server, browser app, canonical contributor records under `site/data/`, generated browser bundle `content.json`, and build and validation scripts. `site/README.md` has the full data and URL contract. |
| `brand-book/` | Brand book v0.2: the editable source (`drumore-brand-book-source.html`), its images (`assets/`), `build.py` to rebuild the one-file book, and the PDF. The website is built from this book’s components. |
| `docs/` | `IMPLEMENTATION_MAP.md` (which book component became which site file), `BRAND.md` (rules for developers), `BETH_QUESTIONS.md`, `STORY_EDITORIAL_TEMPLATE.md` (how a story scene is structured), and `QA_COMPARISON.html` with screenshots in `docs/qa/`. |
| `tools/` | `print-brand-book-pdf.mjs` (prints the book at desktop width through Chrome) and `capture-qa.mjs` (captures the book and the site side by side). |

## Run the site

```sh
cd site
python3 validate.py && python3 validate_story.py
PORT=8780 python3 server.py
```

Open <http://127.0.0.1:8780/>. The server reads post text and images on demand from the synchronized private Google Drive archive. Set `DRUMORE_ARCHIVE` to the local `01 Source Archive` folder if automatic discovery does not find it. Restart the server after rebuilding `content.json`.

After editing canonical records, run `python3 build_content.py`, then both validators. To intentionally refresh everything from the captured archive, run `python3 build_data.py` followed by `python3 build_extensions.py`; those scripts also refresh the split records and browser bundle.

Rebuild the brand book: `cd brand-book && python3 build.py`. Print the PDF: `node tools/print-brand-book-pdf.mjs file://$PWD/brand-book/Drumore-Friends-Brand-Book-v0.2.html brand-book/Drumore-Friends-Brand-Book-v0.2.pdf`.

## Where the history comes from

All source content comes from Beth’s posts. The shared source of truth is the private Google Drive folder **My Drive / Personal / Family / Drumore Friends**. The original Bevan OS capture remains a frozen backup. Nothing from the raw archive is committed here; the local preview reads selected source files from the synchronized Drive copy.

| What | Vault path | Link |
|---|---|---|
| Archive overview (140 posts, 513 images) | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/README.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2FREADME) |
| Curation notes: how the content map is organized | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/curation/README.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2Fcuration%2FREADME) |
| Questions for Beth (curation) | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/curation/questions-for-beth.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2Fcuration%2Fquestions-for-beth) |
| Map source candidates (1864 Bridgens map, GIS) | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/curation/map-source-candidates.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2Fcuration%2Fmap-source-candidates) |
| Monthly post files, e.g. October 2025 (Wynona’s diary begins) | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/2025-10.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2F2025-10) |
| Monthly post files, e.g. December 2025 (family relationships, P067) | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House Facebook Archive/2025-12.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20Facebook%20Archive%2F2025-12) |
| 10 most recent posts | `12 Personal/Parents/Beth/Genealogy Project/Drumore Friends Meeting House - 10 recent Facebook posts - 2026-10-14.md` | [Open in Obsidian](obsidian://open?vault=Bevan%20OS&file=12%20Personal%2FParents%2FBeth%2FGenealogy%20Project%2FDrumore%20Friends%20Meeting%20House%20-%2010%20recent%20Facebook%20posts%20-%202026-10-14) |

The archive and its images are private and not cleared for publication. This repository must stay private.

## Working rules

- One branch and pull request per Linear issue (`dru-6-…`). Never push straight to `main` after this initial commit.
- The brand book is the blueprint. Don’t invent a parallel design system; extract from `brand-book/drumore-brand-book-source.html`.
- Never invent history, relationships, portraits or exact locations. Show uncertainty and conflicting sources.
- Before calling UI work done, test in a browser at 1440×1000 and 390×844 and update `docs/QA_COMPARISON.html`.
