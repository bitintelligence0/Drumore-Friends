#!/usr/bin/env python3
"""Build places-geo.json: proposed OpenStreetMap locations for the map tab.

content.json keeps places[].coordinates = None until a person reviews a location. This file
holds *proposed* geometry only, each entry tied to one OpenStreetMap object (osm_type + osm_id)
and marked "proposed, unverified". The map draws townships and counties as outlines, communities
as soft circles, a named road as a line, and never turns a region into a pin.

Places listed in UNMAPPED have no reliable OpenStreetMap match yet. They stay visible in the map's
"Not yet on the map" list until someone records a location by hand in MANUAL below.

Run:  python3 build_geo.py              (looks up each OSM object on Nominatim, about 1 request/second)
      python3 build_geo.py --cache F    (reuse a JSON cache {"R16241281": <nominatim result>, ...})
Then: python3 validate.py
"""
import json, pathlib, sys, time, urllib.parse, urllib.request, datetime

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'places-geo.json'
UA = 'DrumoreFriends-private-preview/0.1 (family history prototype)'

# place id -> (OSM object, how to draw it, note). shape: outline | circle:<metres> | line
MAPPED = {
    'drumore-area':        ('R16241281', 'outline',     'Drumore Township boundary (present-day).'),
    'little-britain-area': ('R16219032', 'outline',     'Little Britain Township boundary; the archive pairs it with Drumore.'),
    'fulton-township':     ('R16158584', 'outline',     'Fulton Township boundary (present-day).'),
    'millersville-area':   ('R188818',   'outline',     'Millersville borough boundary; the school is not pinned.'),
    'oxford-area':         ('R188715',   'outline',     'Oxford borough boundary; the archive says "area" only.'),
    'chester-county':      ('R417832',   'outline',     'Chester County boundary (present-day).'),
    'london-grove':        ('R3058387',  'outline',     'London Grove Township boundary; the meeting house is not pinned.'),
    'east-marlborough':    ('R3050126',  'outline',     'East Marlborough Township boundary.'),
    'gwynedd':             ('R3079690',  'outline',     'Lower Gwynedd Township, home of Gwynedd Meeting; historic Gwynedd also took in Upper Gwynedd.'),
    'brandywine-area':     ('N158566518','circle:3000', 'Chadds Ford village; circle shows the Brandywine area, not a site.'),
    'shoemaker-home':      ('N158314775','circle:1200', 'Goshen hamlet, Fulton Township; the house site is not mapped.'),
    'earnhart-farm':       ('W11930924', 'line',        'Silver Spring Road (OSM places it in Fernglen, Drumore Township); the farm is not mapped.'),
    'camp-william-penn':   ('N11189411347','circle:600','Camp William Penn gate and museum, La Mott; the camp grounds were larger.'),
    'germantown':          ('N157589804','circle:1500', 'Germantown neighbourhood centre; settlers\' lots are not mapped.'),
}
# Locations entered by hand after review: place id -> {"lat":..,"lon":..,"shape":"pin"|"circle:<m>","note":..,"source":..}
MANUAL = {}
UNMAPPED = {
    'meetinghouse':     'No OpenStreetMap entry for the Drumore Friends Meeting House. Needs an address or coordinates.',
    'friends-cemetery': 'No OSM entry by this name. OSM has a "Drumore Cemetery" (way 276663306, 39.8209, -76.2599); confirm whether it is the Friends burial ground.',
    'fernglen-store':   'Fernglen Road and Park Drive (P048). OSM knows the Fernglen locality but has no store site. Needs the corner or a pin.',
    'liberty-square':   'No Liberty Square found in Lancaster County on OSM (matches are in Philadelphia, Allentown and elsewhere). Needs a location.',
    'conowingo-school': 'One-room school in Fulton Township. OSM has Conowingo Creek but no school. Needs a site.',
    'overseas':         'England and Kresheim (Kriegsheim, now part of Monsheim, Germany): off this map. Decide whether to show an inset.',
}

def nominatim_lookup(ids):
    q = urllib.parse.urlencode({'osm_ids': ','.join(ids), 'format': 'jsonv2', 'polygon_geojson': 1, 'polygon_threshold': 0.0008})
    req = urllib.request.Request('https://nominatim.openstreetmap.org/lookup?' + q, headers={'User-Agent': UA})
    return json.load(urllib.request.urlopen(req, timeout=60))

def main():
    cache = {}
    if '--cache' in sys.argv:
        cache = json.loads(pathlib.Path(sys.argv[sys.argv.index('--cache') + 1]).read_text())
    want = [osm for osm, _, _ in MAPPED.values() if osm not in cache]
    for i in range(0, len(want), 10):
        for r in nominatim_lookup(want[i:i + 10]):
            cache[r['osm_type'][0].upper() + str(r['osm_id'])] = r
        time.sleep(1.2)
    places = {p['id']: p for p in json.loads((ROOT / 'content.json').read_text())['places']}
    feats = []
    for pid, (osm, shape, note) in MAPPED.items():
        r = cache[osm]
        g = r['geojson']
        if shape.startswith('circle') or shape == 'pin': g = {'type': 'Point', 'coordinates': [float(r['lon']), float(r['lat'])]}
        props = {'placeId': pid, 'label': places[pid]['label'], 'precision': places[pid]['locationPrecision'], 'shape': shape,
                 'status': 'proposed, unverified', 'note': note, 'source': 'OpenStreetMap via Nominatim',
                 'osm': osm, 'osmName': r['display_name'], 'center': [round(float(r['lat']), 6), round(float(r['lon']), 6)]}
        feats.append({'type': 'Feature', 'properties': props, 'geometry': g})
    for pid, m in MANUAL.items():
        feats.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [m['lon'], m['lat']]},
                      'properties': {'placeId': pid, 'label': places[pid]['label'], 'precision': places[pid]['locationPrecision'],
                                     'shape': m.get('shape', 'pin'), 'status': m.get('status', 'entered by hand, review'),
                                     'note': m.get('note', ''), 'source': m.get('source', 'manual'), 'center': [m['lat'], m['lon']]}})
    done = set(MAPPED) | set(MANUAL)
    out = {'type': 'FeatureCollection', 'generated': datetime.date.today().isoformat(),
           'attribution': '© OpenStreetMap contributors (ODbL)', 'features': feats,
           'unmapped': [{'placeId': pid, 'label': places[pid]['label'], 'reason': why} for pid, why in UNMAPPED.items() if pid not in done]}
    missing = set(places) - done - set(UNMAPPED)
    assert not missing, f'places with no map decision: {missing}'
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(f'places-geo.json: {len(feats)} mapped, {len(out["unmapped"])} still need a location')

if __name__ == '__main__':
    main()
