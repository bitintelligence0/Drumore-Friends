#!/usr/bin/env python3
"""Rebuild the self-contained brand book from drumore-brand-book-source.html.
Each {{key}} placeholder in the source is replaced with the matching image in
assets/portraits/ or assets/photos/, embedded as a data URI."""
import base64, pathlib, re, sys
HERE = pathlib.Path(__file__).resolve().parent
src = (HERE / 'drumore-brand-book-source.html').read_text()
def embed(m):
    key = m.group(1)
    for folder in ('portraits', 'photos'):
        p = HERE / 'assets' / folder / f'{key}.jpg'
        if p.exists():
            return 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()
    sys.exit(f'missing image for {{{{{key}}}}}')
body = re.sub(r'\{\{([A-Za-z0-9-]+)\}\}', embed, src)
out = HERE / 'Drumore-Friends-Brand-Book-v0.2.html'
out.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + body + '</body></html>')
print(f'Wrote {out.name} ({out.stat().st_size // 1024} KB)')
