#!/usr/bin/env python3
"""Import a monolithic content.json into canonical split records."""
import json
from archive import DRIVE_FOLDER_ID, DRIVE_RELATIVE_PATH, DRIVE_URL
from content_records import BUNDLE_PATH, write_records

if __name__ == '__main__':
    data = json.loads(BUNDLE_PATH.read_text())
    snapshot = data.setdefault('archiveSnapshot', {})
    snapshot.pop('path', None)
    snapshot.update({
        'sourceKind': 'shared-google-drive-archive',
        'driveFolderId': DRIVE_FOLDER_ID,
        'driveUrl': DRIVE_URL,
        'relativePath': DRIVE_RELATIVE_PATH,
    })
    write_records(data)
    print('Exported canonical records under site/data and rebuilt content.json')

