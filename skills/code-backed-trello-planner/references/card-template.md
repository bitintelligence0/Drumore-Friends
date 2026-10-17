# Development card template

Keep the first screen readable to a family contributor. Omit irrelevant sections; do not fill gaps with guesses.

```markdown
## Outcome

One or two plain-language sentences describing what should work when this card is done.

## Why this came up

- Observed during review: the page, action, and visible result.
- Preserve: existing behavior that should keep working.
- Why it matters: the affected visitor or contributor and practical impact.

## Evidence and open questions

- Confirmed in code: `site/path.ext` and the behavior it establishes.
- Source or review reference: stable record/post ID, restricted Drive reference, screenshot, or review note when appropriate.
- Hypothesis or unresolved question: what still needs checking. Name who decides a historical or rights question rather than deciding it in the card.

## Scope and completion

- Include the bounded change and any necessary data, accessibility, or privacy constraints.
- Exclude adjacent work that could otherwise be mistaken for part of this card.
- Acceptance criteria: observable behavior at relevant desktop and phone widths, plus meaningful empty, error, keyboard, or Back-navigation states.
- Verification: relevant commands, browser views, and review evidence required by the repository.

## Links

- Prerequisite card: URL, only when work truly cannot proceed first.
- Related card: URL, when coordination helps but does not block.
- GitHub issue or pull request: URL when it exists.
- Planning reference and audited commit: review item ID; `origin/main@<sha>` or actual inspected revision.
```

For a historical or media card, add the exact record IDs, source IDs, date precision, uncertainty, rights status, and Beth's unresolved questions. For a code-only card, say that no historical record or image-rights decision is being made. Do not paste private source files or family personal data into a card.
