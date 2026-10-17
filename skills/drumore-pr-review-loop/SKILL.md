---
name: drumore-pr-review-loop
description: Review, repair, and prepare Drumore Friends website pull requests for an authorized merge, using local checks and the project's historical and privacy rules. Use for PR completion, not Trello planning or publication.
---

# Drumore Friends PR review loop

Carry one bounded website or record change from an open pull request to a reviewable merge decision. Follow the repository's `AGENTS.md`, `README.md`, `docs/BRAND.md`, and the closest area README. Trello holds the task plan; GitHub holds code and review history. Link the relevant Trello card and GitHub issue in the PR when they exist.

## Review the actual change

1. Confirm the PR's base and exact head commit. Read its description, full diff, changed files, reviews, inline threads, comments, and available checks. Identify the record IDs or interface area it owns and any overlapping open work. Compare against current `main`; do not overwrite another contributor's unresolved edits.
2. Check the behavior and historical claims against the changed canonical records and their cited sources. Distinguish code defects from questions Beth must decide. Preserve date precision, uncertainty, source links, rights status, and private archive boundaries. Never infer publication rights or settle a historical dispute during code review.
3. Run checks locally that fit the change. For edits under `site/data/`, rebuild `site/content.json` with `python3 site/build_content.py`, then run `python3 site/validate.py` and `python3 site/validate_story.py`; confirm the generated file is in the same commit. For relevant code changes, run the validators and focused syntax or behavior checks. For meaningful visitor-facing changes, exercise the affected flows in the local site at desktop and phone widths, including keyboard, URL and Back behavior where relevant, and update QA evidence. Record commands, results, and any unverified paths in the PR.
4. Fix actionable findings on the task branch, then recheck the changed behavior and inspect the full replacement diff. After each push, re-read PR feedback and checks for the new head. A review or passing result for an older head does not establish readiness for the new one.

## Keep the merge free

The normal gate is local validation plus human review. Do not add GitHub Actions workflows, paid runners, hosted review jobs, or required checks merely to use this skill. Inspect any checks already configured and report their status honestly. If repository rules require a check, satisfy it without bypassing protection; discuss a cost-free alternative with Bevan if it would incur charges. Merging a PR does not require this skill to run GitHub-hosted CI.

## Decide and hand off

Call a PR **ready to merge** only when its current head and base have been reviewed, relevant local checks pass, actionable feedback is resolved, the PR is mergeable, and any required human approval is present. State unresolved historical questions, rights implications, skipped checks, and browser views checked. Keep technical readiness separate from authorization to merge.

Merge only when Bevan has authorized that PR or the specific batch containing it. Immediately before merging, verify the head, base, review state, and mergeability again; do not use admin bypass or change branch protection. After an authorized merge, verify the resulting `main` contains the reviewed change and update the linked Trello card only when its acceptance criteria are actually met. A merge does not authorize publication or deployment: keep the website local until Bevan explicitly authorizes a release.
