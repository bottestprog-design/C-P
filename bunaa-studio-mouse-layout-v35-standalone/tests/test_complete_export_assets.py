#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import json
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('complete_export_assets', ROOT / 'tools' / 'complete_export_assets.py')
assert SPEC and SPEC.loader
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)

class FakeResponse:
    status = 200
    def __init__(self, body: bytes, url: str):
        self.body = body
        self.headers = {'Content-Type': 'image/png', 'Content-Length': str(len(body))}
        self.url = url
        self.offset = 0
    def __enter__(self): return self
    def __exit__(self, *_): return False
    def geturl(self): return self.url
    def read(self, size=-1):
        if size < 0: size = len(self.body) - self.offset
        chunk = self.body[self.offset:self.offset+size]
        self.offset += len(chunk)
        return chunk


def main():
    # Verify the downloader refuses private/loopback destinations even before network I/O.
    for unsafe in ('http://127.0.0.1/private.png', 'http://localhost/secret.png'):
        try:
            helper.assert_public_url(unsafe)
        except ValueError:
            pass
        else:
            raise AssertionError(f'Private destination was not rejected: {unsafe}')
    handler = helper.SafeRedirectHandler()
    try:
        handler.redirect_request(__import__('urllib.request', fromlist=['Request']).Request('https://cdn.example.com/a.png'), None, 302, 'Found', {}, 'http://127.0.0.1/internal')
    except ValueError:
        pass
    else:
        raise AssertionError('Redirect to loopback was not rejected')
    url = 'https://cdn.example.com/picture.png'
    image_data = b'\x89PNG\r\n\x1a\nBUNAA-QA-IMAGE'
    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        src = base / 'input-site.zip'
        out = base / 'completed-site.zip'
        project = {'assets': [{'id':'photo','kind':'image','url':url,'filename':'photo.png'}], 'pages':[{'id':'home','nodes':[{'id':'image','type':'image','props':{'src':url},'style':{}}]}]}
        report = f'# External resources\n\n- {url}\n  - السبب: CORS\n'.encode()
        html_data = (f'<!doctype html><html><body><img src="{url}" alt="photo">'
                     f'<a href="{url}">Keep normal link</a>'
                     f'<a href="{url}" download="photo.png">Download media</a></body></html>').encode()
        css_data = f'.hero{{background-image:url("{url}")}}'.encode()
        js_data = f'const assets=[{{"id":"photo","kind":"image","url":"{url}"}}];const pages=[];'.encode()
        with zipfile.ZipFile(src, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('index.html', html_data)
            z.writestr('styles.css', css_data)
            z.writestr('script.js', js_data)
            z.writestr('project.json', json.dumps(project))
            z.writestr('EXTERNAL_RESOURCES.md', report)
        helper.assert_public_url = lambda candidate: None
        helper.urllib.request.urlopen = lambda request, timeout=0: FakeResponse(image_data, url)
        class FakeOpener:
            def open(self, request, timeout=0): return FakeResponse(image_data, url)
        helper.urllib.request.build_opener = lambda *handlers: FakeOpener()
        result = helper.complete_zip(src, out)
        assert result['downloaded'] == 1 and result['failed'] == 0, result
        with zipfile.ZipFile(out, 'r') as z:
            assert z.testzip() is None
            names = z.namelist()
            asset = next(name for name in names if name.startswith('assets/external-') and name.endswith('.png'))
            assert z.read(asset) == image_data
            rewritten_html = z.read('index.html').decode()
            assert f'src="{asset}"' in rewritten_html
            assert f'<a href="{url}">Keep normal link</a>' in rewritten_html
            assert f'<a href="{asset}" download="photo.png">Download media</a>' in rewritten_html
            assert f'url("{asset}")' in z.read('styles.css').decode()
            payload = json.loads(z.read('project.json'))
            assert payload['pages'][0]['nodes'][0]['props']['src'] == asset
            script = z.read('script.js').decode()
            assert f'"url":"{asset}"' in script
            assert 'ASSET_COMPLETION_REPORT.md' in names
        print('PASS helper download, ZIP CRC, media URL rewriting, navigation preservation, and private/loopback/redirect guards')

if __name__ == '__main__':
    main()
