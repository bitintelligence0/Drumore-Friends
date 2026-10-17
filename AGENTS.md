# Drumore Friends agent instructions

These instructions apply to the entire repository. They are written for Codex, Perplexity Computer, and any later coding or research agent.

## Purpose and boundaries

- This is a private family history project. It is separate from Bedrok and must not use Bedrok branding, infrastructure, shared drives, or publishing accounts.
- Keep the website local and unpublished until Bevan explicitly authorizes a release.
- The Google Drive folder **My Drive / Personal / Family / Drumore Friends** is the shared source of truth for source material and working research.
- GitHub is the source of truth for website code, structured historical records, the brand book, and review history.
- The local Bevan OS archive is a frozen backup. Do not edit, reorganize, or delete it.

## Before working

1. Read this file, `README.md`, `docs/BRAND.md`, and the closest README for the area being changed.
2. Read `CONTRIBUTING.md`. Confirm that the upstream repository is `bitintelligence0/Drumore-Friends`, pull the latest `main`, inspect open work, and use one issue and one branch for one bounded change. Do not have two agents edit the same record or view concurrently.
3. Configure `DRUMORE_ARCHIVE` to the synchronized Google Drive `01 Source Archive` folder. Never hardcode a contributor's home directory.
4. State which records or interface area the agent owns in the issue or pull request before making broad edits.

## Historical data rules

- Edit canonical records under `site/data/`. `site/content.json` is generated browser data; do not hand edit it.
- Run `python3 site/build_content.py` after editing records and commit the resulting `site/content.json` in the same change.
- Preserve archive post IDs (`P...`), event IDs (`E...`), image IDs, source URLs, and record IDs. Never recycle an ID for a different subject.
- Keep `events[].date` separate from `posts[].publishedDate`. A Facebook publication date is not evidence for the historical event date.
- Preserve the source's date precision and wording. Do not manufacture a day or month for sorting or display.
- Keep uncertainty, conflicting readings, evidence level, editorial status, and source links visible in the data and interface.
- Name claims as reported, provisional, disputed, or verified according to the record. Do not turn a mention into a relationship, attendance claim, identity match, or exact location.
- Use `More context needed` for missing explanatory prose. Do not invent historical narrative or use lorem ipsum where visitors could mistake it for history.
- Run `python3 site/validate.py` and `python3 site/validate_story.py` before committing data changes.

## Archive and media rules

- Never commit the raw Facebook archive, full resolution source scans, Facebook credentials, cookies, or exports containing unnecessary personal data.
- Treat `01 Source Archive` as preserved evidence. Put additions in `02 Contributor Inbox`; put research notes in `03 Working Research`.
- Possession does not establish publication rights. Keep `rightsStatus` accurate and do not change it to cleared without a recorded human decision.
- Do not publish private family material or expose the shared Drive folder through public links.
- Web derivatives may enter the repository only when intentionally selected, reasonably sized, documented in the media record, and allowed for the intended preview or publication state.

## Design and implementation

- The current design source is `brand-book/Drumore-Friends-Brand-Book-v0.2.html` plus `docs/BRAND.md`. Preserve the cover hero with the Drumore Meeting House; the schematic map belongs in the Map view.
- Reuse the central design tokens. Do not create a parallel palette, typography system, mark, date notation, evidence marker, or motion language.
- Keep one shared record and URL contract across timeline, family, map, imagery, list, people, and stories.
- Preserve keyboard operation, visible focus, reduced motion behavior, honest alt text, browser Back behavior, and phone layouts.
- Mock newsletter and desktop reminder forms must not transmit or retain email addresses unless a later task explicitly adds an approved service and privacy flow.
- Inspect meaningful UI changes at desktop and phone widths in a browser. Update QA evidence when the change affects a visitor facing view.

## Collaboration and handoff

- Prefer small pull requests with a clear record or interface owner. Do not push directly to `main` unless Bevan explicitly requests it for that change.
- Open a draft pull request early. Work is not submitted until GitHub returns a pull-request URL whose base is `bitintelligence0/Drumore-Friends:main`; a pushed branch, local commit, email, or verbal report is not a pull request.
- Put the GitHub URL in every handoff. Before stopping, use `gh pr view --json url,state,isDraft,headRefName,baseRefName,statusCheckRollup` or the GitHub UI to verify the PR is visible and its checks have run.
- An agent may prepare commits, push its branch, open or update a draft PR, and respond to review. It must not approve its own work. It may merge only after a human explicitly authorizes that merge and all required review and checks pass.
- Use the author/reviewer roles in `CONTRIBUTING.md`. Beth owns historical meaning and image-rights decisions; Jim or Bevan may review implementation; Bevan owns publishing and repository administration.
- A pull request must list changed record IDs, source files or post IDs consulted, historical questions left open, rights implications, validation commands, and browser views checked.
- Generated files belong in the same commit as their canonical inputs. Do not leave another agent to guess whether generated data is stale.
- Do not overwrite another contributor's unresolved work. Rebase or coordinate record ownership when changes overlap.
- Stop and ask Bevan before deleting source material, changing external sharing, publishing, deploying, clearing rights, or resolving a historical dispute by judgment alone.

