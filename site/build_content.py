#!/usr/bin/env python3
"""Build site/content.json from the canonical records under site/data."""
from content_records import build_bundle

if __name__ == '__main__':
    data = build_bundle()
    counts = ', '.join(
        f'{len(value)} {key}' for key, value in data.items() if isinstance(value, list)
    )
    print(f'Built content.json: {counts}')

