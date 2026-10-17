#!/usr/bin/env python3
"""Resolve the shared Drumore source archive without hardcoding one contributor."""
import glob
import os
import pathlib

DRIVE_FOLDER_ID = '1SzyWjGO0M7-qMsQh1l2XE6I3Va_5MRqy'
DRIVE_URL = f'https://drive.google.com/drive/folders/{DRIVE_FOLDER_ID}'
DRIVE_RELATIVE_PATH = 'Personal/Family/Drumore Friends/01 Source Archive'


def resolve_archive(snapshot=None):
    configured = os.environ.get('DRUMORE_ARCHIVE')
    candidates = []
    if configured:
        candidates.append(pathlib.Path(configured).expanduser())
    candidates.extend(
        pathlib.Path(path)
        for path in glob.glob(
            str(pathlib.Path.home() / 'Library/CloudStorage/GoogleDrive-*/My Drive' / DRIVE_RELATIVE_PATH)
        )
    )
    if snapshot and snapshot.get('path'):
        candidates.append(pathlib.Path(snapshot['path']).expanduser())

    for candidate in candidates:
        resolved = candidate.resolve()
        if (resolved / 'curation' / 'timeline-events.json').is_file():
            return resolved

    expected = pathlib.Path('~/Library/CloudStorage/GoogleDrive-ACCOUNT/My Drive').expanduser() / DRIVE_RELATIVE_PATH
    raise FileNotFoundError(
        'Drumore source archive not found. Sync the shared Google Drive folder or set '
        f'DRUMORE_ARCHIVE to 01 Source Archive. Expected a path like: {expected}'
    )

