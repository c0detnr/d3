"""Statik derlemeyi Kül Vadisi ve Leopard esintili tankla paylaşır."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qsl, urlencode, urlsplit


class ShareHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path in ('/', '/index.html'):
            params = {'map': 'kul', 'tank': '02'}
            params.update(parse_qsl(url.query))
            self.send_response(302)
            self.send_header('Location', '/map-preview.html?' + urlencode(params))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', default='dist-map')
    parser.add_argument('--port', type=int, default=18743)
    args = parser.parse_args()
    handler = partial(ShareHandler, directory=args.directory)
    ThreadingHTTPServer(('127.0.0.1', args.port), handler).serve_forever()
