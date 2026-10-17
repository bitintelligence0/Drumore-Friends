---
name: code-backed-trello-planner
description: Turn dictated website reviews, walkthroughs, bug reports, and product ideas into code-backed development specs and, when authorized, Trello cards. Use when a team tracks implementation work in Trello and needs each card grounded in the current repository.
---

# Code-Backed Trello Planner

Turn informal narration into a reviewable record and implementation-ready Trello cards. Preserve what the speaker observed and intended; ground technical claims in the current code. Follow the repository's `AGENTS.md`, contribution rules, and privacy boundaries before using this skill. A Trello card plans work; the repository's branch, pull-request, validation, and review rules still govern implementation.

## Choose the mode

- **Capture:** While narration is arriving, maintain a living Markdown review. Do not create cards unless the user has authorized Trello writes for this batch.
- **Consolidate:** Audit the current code and relevant Trello board, resolve likely duplicates, and propose the smallest independently verifiable set of cards. Preserve the proposed plan for review when publication has not been authorized.
- **Publish:** Create or update the approved cards, read them back, and map each narration item to its card URL. Do not treat permission to review a website as permission to publish cards or invite collaborators.

Modes may overlap when a new review arrives during an already authorized batch.

## Preserve the review

For each observation, record the page or workflow, what works, the observed problem, the desired outcome, a concrete example, stated urgency, and open questions. Separate an immediate fix from a longer-term idea. Normalize obvious dictation errors while marking ambiguous names, dates, or terms as uncertain. Do not turn praise into a task without an action, and do not turn a suggestion into a settled product decision.

For historical or family content, preserve reported, provisional, disputed, and verified claims exactly as supported by the record. Do not infer identities, relationships, dates, rights, or publication clearance from narration. Link stable source IDs or restricted evidence locations; do not copy private scans, raw transcripts, credentials, or unnecessary personal details into Trello. Check board visibility before publishing project details.

## Audit before drafting

1. Identify the repository, target Trello workspace and board, relevant surface, and batch boundary. Check the working tree and the exact commit or source snapshot being inspected.
2. Search open and archived cards for the outcome using title variants and dictation synonyms. Read likely matches, including comments and checklists. Classify each proposal as new, duplicate, overlapping, related, or already done. Update the existing card when it already owns the outcome.
3. Inspect the smallest relevant set of UI, data, service, configuration, and test files. For every proposed card, distinguish **Observed** behavior, **Confirmed** code facts with repository-relative file anchors, and **Hypotheses or open verification**. Do not claim a root cause from narration alone. If the running site and checked-out code disagree, record that mismatch and require a version or configuration check before prescribing a fix.
4. Identify decisions and genuine dependencies. Split work when parts have different outcomes, owners, safety boundaries, or review gates; do not split merely by file or layer. Keep the narration-to-card mapping even when one idea becomes several cards.

## Write useful Trello cards

Read [references/card-template.md](references/card-template.md) when drafting or publishing cards. Lead with a plain-language outcome that Beth, Jim, and Bevan can understand. Put the technical evidence and acceptance criteria below it. Use one card per independently verifiable change and a concise, verb-led title.

Use Trello's ordinary lists, assignees, labels, due dates, and checklists only when they add meaning. Use the board's existing list and label vocabulary. Do not invent an assignee, deadline, priority, or label. On a Free board, do not require Custom Fields, advanced checklists, paid views, or an automation to make the card usable. Put a true prerequisite card URL in the description; a related card is only a cross-reference, not a blocker.

For Drumore Friends, distinguish historical review from implementation review. A card can request Beth's historical or image-rights decision without resolving it. Keep source archive material in the shared private Drive and implementation changes in GitHub. Link the eventual branch or pull request back to the Trello card, and put the card URL in the pull request. Do not equate a completed card with an approved or merged pull request.

## Publish and verify

Use an available Trello connector or the board UI according to the current environment. Before a batch write, state the card count, grouping, and any updates to existing cards. Create prerequisite cards before dependent cards. Do not create or alter cards outside the authorized board or batch. Do not upload files, change board sharing, invite people, send messages, or migrate a Linear backlog unless separately requested.

Read each created or updated card back. Verify its title, list, description, members and labels if set, prerequisite links, and board visibility. Repair mismatches. Update the living review with card URLs and note any duplicate, deferred, or unresolved items. When implementation follows, preserve the repository's issue, branch, draft PR, checks, and human review requirements.

## Completion check

Another contributor should be able to understand the observed problem, locate the relevant code and source evidence, tell confirmed facts from open questions, implement the bounded outcome, and verify it without replaying the entire dictation. Report the cards created or updated, the critical open decisions, and any side effects. Do not claim work was published until the returned Trello card URLs are readable.
