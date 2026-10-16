# Drumore Friends web handoff

This is the implementation shorthand for **Drumore Friends Brand Book v0.2**. The full visual reference remains beside the source archive and is not copied into the app.

## Character

Daylight, not age. Use quiet natural colors, clean paper, and generous space. Do not use sepia, fake parchment, distressed type, or costume-history decoration. The archive record is the ornament.

Use **Gelasio** for reading and **Public Sans** for controls. **Kalam** is reserved for a clearly labeled Drawn transcription. The Gable Line is the mark; do not add a cross, steeple, dove, or quill.

## Provenance and uncertainty

- **Original** — solid Walnut square. Use for photographs and documents from the archive.
- **Drawn** — dashed River diamond. Name the maker and the source used.
- **Today** — Shutter circle. Use for current photography or present-day context.
- **Selected** — one Lamp halo per screen.

Evidence must use a word and a shape: recorded is a solid circle, reported is a ring with a dot, and family story is a dashed ring. Unknowns stay visible. Use “about” for approximate dates; do not silently turn a region into an exact map pin.

Dates display as `12 Oct 1890`, `Oct 1890`, `about 1795`, or an en-dash span. When a Quaker date survives, show the normalized date and the as-written form in the source viewer. Conflicting dates show both.

## Shared navigation contract

All views use query parameters so a visitor can enter from anywhere and return to the same context:

`view`, `mode`, `era`, `year`, `event`, `person`, `place`, `story`, `scene`, `post`, `image` (older `focus` links still work)

Main navigation is Explore · Stories · About. Explore holds Timeline, Family, Map, Imagery and List on one shared selection. Mobile uses a persistent bottom bar for Timeline, Family, Places, Stories.

The tokens live in `site.css :root`, copied unchanged from the book. `IMPLEMENTATION_MAP.md` lists which book component became which site file.

## Accessibility and motion

Meet WCAG 2.2 AA and aim for AAA body contrast. Controls are at least 44px. Every color signal also has a label or shape. Timeline and tree have a Browse-as-list equivalent. Support keyboard focus, Enter, arrow keys where relevant, Escape for dialogs, 200% text enlargement, and reduced motion.

Motion tokens: quick 140ms, move 240ms, travel at most 420ms, with `cubic-bezier(.2,.7,.2,1)`. Reduced motion becomes instant or a simple crossfade.

## Editorial rules

Spell **Drumore**. Use **Meeting House** until Beth decides otherwise. Keep original images whole and in color. Generated historical portraits, scenes, and geography are out of scope. Living people require consent. Every record offers a path to its sources and eventually a correction route.

The current family links, historical claims, captions, rights, location precision, and “Established 1816” wording remain review items for Beth.
