# Canonical website records

This directory is the editable source for the website's structured content. `../content.json` is a generated browser bundle.

Each record has its own JSON file so contributors and agents can work on different people, events, places, stories, scenes, posts, images, relationships, transcriptions, eras, or family groups without editing one large document.

## Edit and validate

1. Edit the relevant record file.
2. If adding or removing a record, update `manifest.json` and preserve the intended order.
3. From `site/`, run:

```sh
python3 build_content.py
python3 validate.py
python3 validate_story.py
```

4. Commit the record, `manifest.json` when changed, and the regenerated `content.json` together.

Do not hand edit `content.json`. Do not infer historical event dates from Facebook publication dates. Preserve IDs, precision, uncertainty, evidence status, source links, and image rights status.

