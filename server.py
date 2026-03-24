from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
OPS = Path('/Volumes/SSD/Projects/Operations/Ops/state')
OPERATIONS_ROOT = Path('/Volumes/SSD/Projects/Operations')
REGISTRY = OPS / 'approval_registry.json'
QUEUE = OPS / 'daily_channel_queue.json'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == '/api/data':
            data = {
                'approval_registry': json.loads(REGISTRY.read_text()),
                'daily_channel_queue': json.loads(QUEUE.read_text()),
            }
            body = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path.startswith('/api/source?path='):
            from urllib.parse import urlparse, parse_qs, unquote
            query = parse_qs(urlparse(self.path).query)
            rel = unquote(query.get('path', [''])[0]).strip()
            if not rel:
                self.send_error(400, 'missing path')
                return
            target = (OPERATIONS_ROOT / rel).resolve()
            if not str(target).startswith(str(OPERATIONS_ROOT.resolve())) or not target.exists() or not target.is_file():
                self.send_error(404, 'source not found')
                return
            text = target.read_text(errors='replace')
            body = json.dumps({'path': rel, 'text': text}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

if __name__ == '__main__':
    host, port = '127.0.0.1', 8787
    print(f'ReviewHub serving at http://{host}:{port}')
    HTTPServer((host, port), Handler).serve_forever()
