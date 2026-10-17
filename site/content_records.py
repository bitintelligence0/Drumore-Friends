#!/usr/bin/env python3
"""Read and write contributor-friendly records and the browser content bundle."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
DATA_ROOT = ROOT / 'data'
MANIFEST_PATH = DATA_ROOT / 'manifest.json'
BUNDLE_PATH = ROOT / 'content.json'
COLLECTIONS = (
    'events', 'posts', 'people', 'places', 'stories', 'scenes', 'images',
    'relationships', 'transcriptions', 'eras', 'familyGroups',
)


def _write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def _safe_name(record_id):
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', record_id).strip('._')
    if not name:
        raise ValueError(f'Record ID cannot form a filename: {record_id!r}')
    return name + '.json'


def write_records(data):
    """Replace the managed record files with an ordered split of *data*."""
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    meta = {key: value for key, value in data.items() if key not in COLLECTIONS}
    _write_json(DATA_ROOT / 'meta.json', meta)
    manifest = {'meta': 'meta.json', 'collections': {}}

    for collection in COLLECTIONS:
        folder = DATA_ROOT / collection
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob('*.json'):
            old.unlink()
        seen_names = set()
        entries = []
        for record in data.get(collection, []):
            record_id = record.get('id')
            if not record_id:
                raise ValueError(f'{collection} record is missing id')
            filename = _safe_name(record_id)
            if filename in seen_names:
                raise ValueError(f'Filename collision in {collection}: {record_id}')
            seen_names.add(filename)
            relative = f'{collection}/{filename}'
            _write_json(DATA_ROOT / relative, record)
            entries.append({'id': record_id, 'file': relative})
        manifest['collections'][collection] = entries

    _write_json(MANIFEST_PATH, manifest)
    return build_bundle()


def build_bundle():
    manifest = json.loads(MANIFEST_PATH.read_text())
    data = json.loads((DATA_ROOT / manifest['meta']).read_text())
    expected_files = {manifest['meta'], 'manifest.json'}

    for collection in COLLECTIONS:
        records = []
        seen_ids = set()
        for entry in manifest['collections'].get(collection, []):
            path = DATA_ROOT / entry['file']
            record = json.loads(path.read_text())
            if record.get('id') != entry['id']:
                raise ValueError(f'ID mismatch in {entry["file"]}')
            if entry['id'] in seen_ids:
                raise ValueError(f'Duplicate {collection} ID: {entry["id"]}')
            seen_ids.add(entry['id'])
            expected_files.add(entry['file'])
            records.append(record)
        data[collection] = records

    actual_files = {
        str(path.relative_to(DATA_ROOT))
        for path in DATA_ROOT.rglob('*.json')
    }
    extras = sorted(actual_files - expected_files)
    if extras:
        raise ValueError(f'Unlisted JSON record files: {extras}')

    _write_json(BUNDLE_PATH, data)
    return data

