#!/usr/bin/env python3
"""Private local preview. Reads selected media and post text from the archive, never writes it."""
import http.server, json, os, pathlib, re, socketserver, urllib.parse
from archive import resolve_archive
ROOT=pathlib.Path(__file__).resolve().parent
DATA=json.loads((ROOT/'content.json').read_text())
ARCHIVE=resolve_archive(DATA.get('archiveSnapshot'))
POSTS={p['id']:p for p in DATA['posts']}
IMAGES={i['id']:i for i in DATA['images']}
STATIC={'/':'index.html','/app.js':'app.js','/store.js':'store.js','/lib.js':'lib.js','/explore.js':'explore.js','/timeline.js':'timeline.js','/map.js':'map.js','/hero.js':'hero.js','/family.js':'family.js','/reading.js':'reading.js','/site.css':'site.css','/content.json':'content.json','/mark.svg':'mark.svg','/mark-small.svg':'mark-small.svg','/favicon.svg':'favicon.svg','/places-geo.json':'places-geo.json','/vendor/leaflet.js':'vendor/leaflet.js','/vendor/leaflet.css':'vendor/leaflet.css'}
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path=urllib.parse.urlsplit(self.path).path
        if path in STATIC:
            file=ROOT/STATIC[path]
            mime='text/html' if path=='/' else 'application/javascript' if path.endswith('.js') else 'text/css' if path.endswith('.css') else 'image/svg+xml' if path.endswith('.svg') else 'application/json'
            return self.send_file(file,mime)
        if path.startswith('/media/'):
            image=IMAGES.get(path.removeprefix('/media/'))
            if image:
                file=(ARCHIVE/image['archivePath']).resolve()
                if file.is_relative_to(ARCHIVE) and file.is_file(): return self.send_file(file,'image/jpeg')
        if path.startswith('/source/'):
            post=POSTS.get(path.removeprefix('/source/'))
            if post:
                file=(ARCHIVE/post['archiveFile']).resolve()
                if file.is_relative_to(ARCHIVE) and file.is_file():
                    sections=re.split(r'(?=^## )',file.read_text(),flags=re.M)
                    entries=[s for s in sections if s.startswith('## ')]
                    n=post['ordinal']-1
                    if 0<=n<len(entries) and post['facebookUrl'] in entries[n]:
                        body=entries[n].encode()
                        self.send_response(200); self.send_header('Content-Type','text/plain; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.send_header('Cache-Control','no-store'); self.end_headers(); return self.wfile.write(body)
        self.send_error(404,'Not in selected private snapshot')
    def send_file(self,file,mime):
        body=file.read_bytes(); self.send_response(200); self.send_header('Content-Type',mime+'; charset=utf-8' if mime.startswith('text/') or mime in ('application/javascript','application/json') else mime); self.send_header('Content-Length',str(len(body))); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(body)
    def log_message(self,*args): pass
class Server(socketserver.ThreadingTCPServer): allow_reuse_address=True
if __name__=='__main__':
    host='127.0.0.1'; port=int(os.environ.get('PORT','8765'))
    with Server((host,port),Handler) as server:
        print(f'Private preview: http://{host}:{port}/',flush=True)
        server.serve_forever()
