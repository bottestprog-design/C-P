#!/usr/bin/env python3
"""Build Bunaa's standalone JavaScript bundle and embed it into the direct-open HTML files."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "source"
MODULE_ROOT = SOURCE / "src"
BUNDLE_PATH = SOURCE / "bunaa.bundle.js"
VERSION = "V31"


def build_bundle() -> str:
    files = sorted(MODULE_ROOT.rglob("*.js"))
    if not files:
        raise SystemExit("No source modules found.")
    parts = [
        "(()=>{'use strict';",
        "const __modules=new Map();const __cache=new Map();",
        'const __require=(id)=>{if(__cache.has(id))return __cache.get(id);const factory=__modules.get(id);if(!factory)throw new Error("Bunaa module not found: "+id);const exports={};__cache.set(id,exports);factory(exports,__require);return exports};',
    ]
    seen = set()
    for file in files:
        module_id = "src/" + file.relative_to(MODULE_ROOT).as_posix()
        if module_id in seen:
            raise SystemExit(f"Duplicate module: {module_id}")
        seen.add(module_id)
        body = file.read_text(encoding="utf-8").strip()
        if not body:
            raise SystemExit(f"Empty module: {module_id}")
        parts.append(f'__modules.set("{module_id}",(exports,__require)=>{{\n{body}\n}});')
    if "src/main.js" not in seen:
        raise SystemExit("src/main.js is missing")
    parts.append('const __app=__require("src/main.js");if(typeof window!==\'undefined\'&&__app?.app)window.__BUNAA_APP=__app.app;})();')
    bundle = "\n".join(parts) + "\n"
    if re.search(r"</script", bundle, re.I):
        raise SystemExit("Raw </script tag found in bundle; refusing to corrupt HTML.")
    BUNDLE_PATH.write_text(bundle, encoding="utf-8")
    return bundle


CSS = r'''
/* V30 — media library and content blocks */
.asset-library{display:grid;gap:14px;min-width:0}.asset-dropzone{display:grid;justify-items:center;gap:7px;text-align:center;padding:22px 16px;border:2px dashed #cfd3e4;border-radius:16px;background:linear-gradient(135deg,#f7f8ff,#f7fffb);cursor:pointer;transition:border-color .18s,background .18s}.asset-dropzone.drag-active,.asset-dropzone:focus{outline:none;border-color:#5b5ce2;background:#f0f0ff}.asset-drop-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#e9eaff;color:#4c4ec7;font-size:26px}.asset-dropzone b{font-size:16px}.asset-dropzone small{max-width:540px;color:#697287;line-height:1.7}.asset-upload-status{font-size:12px;color:#4e5870;overflow-wrap:anywhere}.asset-toolbar{display:grid;grid-template-columns:minmax(180px,1.5fr) repeat(2,minmax(120px,.7fr));gap:10px}.asset-library-summary{font-size:12px;color:#737b8e}.asset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px;max-height:min(48vh,560px);overflow:auto;padding:2px}.asset-card{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px;border:1px solid #e4e7f0;border-radius:13px;background:#fff}.asset-card-preview{position:relative;display:grid;place-items:center;height:115px;overflow:hidden;border-radius:9px;background:#f4f5fa}.asset-card-preview>img{width:100%;height:100%;object-fit:cover}.asset-audio-thumb,.asset-doc-thumb{display:grid;place-items:center;gap:5px;width:100%;height:100%;font-size:28px;color:#5759c9;background:linear-gradient(135deg,#f0efff,#f4faf7)}.asset-audio-thumb small,.asset-doc-thumb small{font-size:11px;color:#6b7280}.asset-doc-thumb strong{font-size:19px}.asset-type-stamp{position:absolute;bottom:7px;right:7px;padding:3px 7px;background:#171b2adc;color:#fff;border-radius:5px;font-size:10px}.asset-card-meta{display:grid;gap:3px;min-width:0}.asset-card-meta b,.asset-card-meta small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-card-meta b{font-size:13px}.asset-card-meta small{font-size:10px;color:#70788a}.asset-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:auto}.asset-card-actions button{min-width:0;padding:7px 6px;font-size:11px;border:1px solid #e2e5ee;border-radius:8px;background:#fff;color:#30384b;cursor:pointer}.asset-card-actions button.primary-btn{background:#5759d8;border-color:#5759d8;color:white}.asset-card-actions button:disabled{opacity:.42;cursor:not-allowed}.asset-more-actions{grid-column:1/-1;display:flex;gap:5px}.asset-more-actions button{flex:1}.asset-more-actions .danger-btn{color:#be3c4d}.asset-preview-pane,.asset-editor-pane{border:1px solid #e1e4ee;border-radius:13px;padding:12px;background:#fafbff;min-width:0}.asset-preview-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.asset-preview-content{display:grid;place-items:center;min-height:100px;max-height:440px;overflow:auto}.asset-preview-content img,.asset-preview-content video{max-width:100%;max-height:420px}.asset-preview-content audio{width:min(100%,520px)}.asset-preview-content iframe{width:100%;height:420px;border:0}.asset-preview-generic{padding:20px;text-align:center}.asset-editor-pane h3{margin:0 0 12px}.asset-empty{grid-column:1/-1}.asset-current-preview img{max-width:58px;max-height:42px;object-fit:cover}.asset-choice-grid{display:grid;gap:6px;max-height:230px;overflow:auto;padding:2px}.asset-choice{display:flex;align-items:flex-start;gap:9px;padding:9px;border:1px solid #e2e5ef;border-radius:10px;background:#fff;cursor:pointer;min-width:0}.asset-choice:has(input:checked){border-color:#5b5ce2;background:#f4f4ff}.asset-choice input{margin-top:3px;accent-color:#5b5ce2}.asset-choice span{display:grid;gap:3px;min-width:0}.asset-choice b,.asset-choice small{overflow-wrap:anywhere}.asset-choice b{font-size:12px}.asset-choice small,.asset-choice-empty{font-size:11px;color:#71798b}.asset-choice-empty{padding:12px;border:1px dashed #d5d9e6;border-radius:10px;line-height:1.6}.page-embed-settings{display:grid;gap:9px}.built-media-grid,.built-video-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.built-audio-playlist{display:grid;gap:12px}.built-media-tile{min-width:0;padding:10px;border:1px solid #e4e7ef;border-radius:12px;background:#fff}.built-media-tile img,.built-media-tile video{display:block;width:100%;max-height:420px;object-fit:contain;border-radius:8px}.built-media-tile audio{display:block;width:100%}.built-media-caption{display:block;margin-top:7px;overflow-wrap:anywhere;color:#71798b}.built-video-card video{display:block;width:100%;max-width:100%;max-height:480px;border-radius:10px}.built-video-card iframe{display:block;width:100%;min-height:260px;border:0;border-radius:10px}.built-file-card,.built-document-viewer{min-width:0;overflow:hidden;padding:16px;border:1px solid #e4e7ef;border-radius:14px;background:#fff}.built-file-link{display:inline-flex;gap:8px;align-items:center;padding:8px 12px;border-radius:9px;background:#f3f4fb;color:#5b5ce2;text-decoration:none;overflow-wrap:anywhere}.built-page-embed{width:100%;min-width:0;overflow:hidden}.built-html-snippet img{max-width:100%;height:auto}.built-html-snippet table{border-collapse:collapse;max-width:100%}.built-html-snippet td,.built-html-snippet th{border:1px solid #e4e7ef;padding:7px}@media(max-width:680px){.asset-toolbar{grid-template-columns:1fr}.asset-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:44vh}.asset-card-actions button{font-size:10px}.built-media-grid,.built-video-gallery{grid-template-columns:1fr}}
'''.strip()


def embed_bundle(bundle: str) -> None:
    marker = re.compile(r"<script>\s*/\* Bunaa Studio V\d+[^*]*\*/", re.I)
    for name in ("index.html", "Bunaa.html"):
        path = ROOT / name
        html = path.read_text(encoding="utf-8")
        match = marker.search(html)
        if not match:
            raise SystemExit(f"Can't find bundle injection marker in {name}")
        end = html.find("</script>", match.start())
        if end < 0:
            raise SystemExit(f"Inline bundle is not closed in {name}")
        script = f'<script>\n/* Bunaa Studio {VERSION} — generated from source/src by build_bundle.py */\n{bundle}</script>'
        html = html[:match.start()] + script + html[end + len("</script>"):]
        # Replace the generated CSS block on every build so source CSS updates
        # cannot be silently skipped after the first V30 build.
        css_marker = "/* V30 — media library and content blocks */"
        marker_pos = html.find(css_marker)
        if marker_pos >= 0:
            style_end = html.lower().find("</style>", marker_pos)
            if style_end < 0:
                raise SystemExit(f"No closing style tag after CSS marker in {name}")
            html = html[:marker_pos] + CSS + "\n" + html[style_end:]
        else:
            style_end = html.lower().find("</style>")
            if style_end < 0:
                raise SystemExit(f"No inline style block in {name}")
            html = html[:style_end] + "\n" + CSS + "\n" + html[style_end:]
        html = re.sub(r"Bunaa Studio V\\d+", "Bunaa Studio V31", html)
        html = re.sub(r'data-bunaa-version="\\d+"', 'data-bunaa-version="31"', html)
        path.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    result = build_bundle()
    embed_bundle(result)
    print(f"Built {len(list(MODULE_ROOT.rglob('*.js')))} modules, {len(result):,} JavaScript characters; embedded into index.html and Bunaa.html.")
