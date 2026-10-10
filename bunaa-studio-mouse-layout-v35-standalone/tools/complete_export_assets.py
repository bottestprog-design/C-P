#!/usr/bin/env python3
"""Complete media assets in a Bunaa Studio static-site ZIP using Python's standard library.

This optional post-export helper can fetch media URLs that a browser could not fetch due to
CORS. It deliberately does not mirror arbitrary linked websites or download HTML documents.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import ipaddress
import json
import mimetypes
import re
import socket
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_TOTAL_BYTES = 80 * 1024 * 1024
TIMEOUT_SECONDS = 15
MAX_URLS = 100
USER_AGENT = "BunaaStudio-StaticAssetPackager/1.0"
MIME_EXT = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
    "image/webp": ".webp", "image/avif": ".avif", "image/svg+xml": ".svg",
    "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv",
    "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
    "audio/ogg": ".ogg", "audio/webm": ".weba", "font/woff": ".woff",
    "font/woff2": ".woff2", "application/font-woff": ".woff",
    "application/pdf": ".pdf", "application/zip": ".zip", "text/plain": ".txt",
    "text/csv": ".csv", "application/octet-stream": "",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
}
ALLOWED_EXT = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".ico",
    ".mp4", ".webm", ".ogv", ".mov", ".m4v", ".mp3", ".m4a", ".wav",
    ".ogg", ".weba", ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip",
    ".txt", ".csv", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}
MEDIA_KEYS = {
    "src", "image", "images", "poster", "cover", "thumbnail", "favicon", "logo",
    "audio", "video", "font", "mediaurl", "downloadurl", "backgroundimage",
    "backgroundsrc", "previewimage", "ogimage", "socialimage",
}
MEDIA_KIND = {"image", "video", "audio", "font", "document", "file", "media", "asset"}


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def http_url(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        p = urllib.parse.urlsplit(value.strip())
        return p.scheme.lower() in ("http", "https") and bool(p.hostname) and not p.username and not p.password
    except ValueError:
        return False


def assert_public_url(url: str) -> None:
    """Reject loopback, private, link-local and other non-public destinations."""
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise ValueError("العنوان ليس HTTP/HTTPS صالحًا")
    host = p.hostname.rstrip(".").lower()
    if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local", ".internal", ".test", ".invalid")):
        raise ValueError("تم رفض عنوان محلي أو تجريبي لأسباب أمنية")
    try:
        direct = ipaddress.ip_address(host)
        addresses = [direct]
    except ValueError:
        try:
            port = p.port or (443 if p.scheme == "https" else 80)
            infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            addresses = list({ipaddress.ip_address(info[4][0].split("%", 1)[0]) for info in infos})
        except Exception as exc:
            raise ValueError(f"تعذر التحقق من عنوان الخادم: {exc}") from exc
    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError("تم رفض وجهة غير عامة لأسباب أمنية")


def ext_for(url: str, mime: str) -> str:
    path_ext = PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()
    mime = (mime or "").split(";", 1)[0].strip().lower()
    ext = MIME_EXT.get(mime, "") or path_ext or mimetypes.guess_extension(mime) or ""
    if ext == ".jpe":
        ext = ".jpg"
    if ext not in ALLOWED_EXT:
        raise ValueError(f"نوع الوسيط غير مدعوم للتضمين ({mime or path_ext or 'غير معروف'})")
    if mime in ("text/html", "application/xhtml+xml"):
        raise ValueError("لن يتم تنزيل صفحات HTML خارجية كأنها ملفات وسائط")
    return ext


def extract_external_report(data: bytes) -> list[str]:
    text = data.decode("utf-8", errors="replace")
    found = []
    for line in text.splitlines():
        match = re.match(r"\s*-\s+(https?://\S+)\s*$", line.strip())
        if match and http_url(match.group(1)) and match.group(1) not in found:
            found.append(match.group(1))
    return found


def collect_project_media(value: Any, key: str = "", context: dict[str, Any] | None = None, out: set[str] | None = None) -> set[str]:
    if out is None:
        out = set()
    context = context or {}
    if isinstance(value, dict):
        merged = dict(context)
        for name in ("type", "kind", "mime", "mediaType"):
            if name in value and isinstance(value[name], str):
                merged[name] = value[name].lower()
        for child_key, child in value.items():
            nk = normalize_key(child_key)
            is_media_field = nk in MEDIA_KEYS
            if nk == "url":
                explicit_kind = any(normalize_key(merged.get(name, "")) in MEDIA_KIND or str(merged.get(name, "")).lower().startswith(("image/", "video/", "audio/", "font/")) for name in ("kind", "mime", "mediaType"))
                node_type = normalize_key(merged.get("type", ""))
                path_ext = PurePosixPath(urllib.parse.urlsplit(child if isinstance(child, str) else "").path).suffix.lower() if isinstance(child, str) else ""
                typed_media_url = node_type == "image" or (node_type in {"video", "audio", "download", "file"} and path_ext in ALLOWED_EXT)
                if explicit_kind or typed_media_url:
                    is_media_field = True
            if isinstance(child, str) and is_media_field and http_url(child):
                out.add(child.strip())
            collect_project_media(child, child_key, merged, out)
    elif isinstance(value, list):
        for item in value:
            collect_project_media(item, key, context, out)
    return out


def read_limit(response, limit: int) -> bytes:
    body = bytearray()
    while True:
        chunk = response.read(min(64 * 1024, limit + 1 - len(body)))
        if not chunk:
            break
        body.extend(chunk)
        if len(body) > limit:
            raise ValueError(f"الملف أكبر من الحد المسموح ({limit // (1024*1024)} MB)")
    return bytes(body)


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        assert_public_url(urllib.parse.urljoin(req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_media(url: str) -> tuple[bytes, str, str]:
    assert_public_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*,video/*,audio/*,font/*,application/pdf,application/zip,text/plain,text/csv,application/octet-stream;q=0.8,*/*;q=0.1"})
    opener = urllib.request.build_opener(SafeRedirectHandler())
    with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
        final_url = response.geturl()
        assert_public_url(final_url)
        status = getattr(response, "status", 200)
        if not (200 <= int(status) < 300):
            raise ValueError(f"HTTP {status}")
        mime = response.headers.get("Content-Type", "application/octet-stream")
        data = read_limit(response, MAX_FILE_BYTES)
        if not data:
            raise ValueError("الملف الذي أعاده الخادم فارغ")
        ext = ext_for(final_url, mime)
        return data, mime.split(";", 1)[0].strip().lower(), ext


def rewrite_css(text: str, mapping: dict[str, str]) -> str:
    for url, path in mapping.items():
        escaped = re.escape(url)
        text = re.sub(r"(url\(\s*[\"']?)" + escaped + r"([\"']?\s*\))", lambda m: m.group(1) + path + m.group(2), text, flags=re.I)
    return text


def rewrite_html(text: str, mapping: dict[str, str]) -> str:
    # Only alter media attributes and explicit downloadable links, never regular navigation hrefs.
    for url, path in mapping.items():
        escaped = re.escape(url)
        text = re.sub(r"(\b(?:src|poster|data-src|data-poster)\s*=\s*)([\"'])" + escaped + r"\2", lambda m: m.group(1) + m.group(2) + path + m.group(2), text, flags=re.I)
        text = re.sub(r"(\bstyle\s*=\s*)([\"'])(.*?)(\2)", lambda m: m.group(1) + m.group(2) + rewrite_css(m.group(3), {url:path}) + m.group(4), text, flags=re.I | re.S)
        def patch_download(tag_match: re.Match[str]) -> str:
            tag = tag_match.group(0)
            if not re.search(r"\sdownload(?:\s|=|/?>)", tag, flags=re.I):
                return tag
            return re.sub(r"(\bhref\s*=\s*)([\"'])" + escaped + r"\2", lambda m: m.group(1) + m.group(2) + path + m.group(2), tag, flags=re.I)
        text = re.sub(r"<a\b[^>]*>", patch_download, text, flags=re.I)
    return text


def rewrite_project_media(value: Any, mapping: dict[str, str], context: dict[str, Any] | None = None) -> Any:
    context = context or {}
    if isinstance(value, dict):
        merged = dict(context)
        for name in ("type", "kind", "mime", "mediaType"):
            if isinstance(value.get(name), str):
                merged[name] = value[name].lower()
        result = {}
        for key, child in value.items():
            nk = normalize_key(key)
            media_key = nk in MEDIA_KEYS
            if nk == "url" and any(normalize_key(v) in MEDIA_KIND or str(v).lower().startswith(("image/", "video/", "audio/", "font/")) for v in merged.values()):
                media_key = True
            if media_key and isinstance(child, str) and child in mapping:
                result[key] = mapping[child]
            else:
                result[key] = rewrite_project_media(child, mapping, merged)
        return result
    if isinstance(value, list):
        return [rewrite_project_media(item, mapping, context) for item in value]
    return value


def rewrite_runtime_asset_table(text: str, mapping: dict[str, str]) -> str:
    pattern = re.compile(r"(const\s+assets\s*=\s*)(\[.*?\])(\s*;\s*const\s+pages\s*=)", re.S)
    match = pattern.search(text)
    if not match:
        return text
    try:
        assets = json.loads(match.group(2))
    except json.JSONDecodeError:
        return text
    changed = False
    for asset in assets if isinstance(assets, list) else []:
        if isinstance(asset, dict):
            for key in ("url", "data", "src"):
                if asset.get(key) in mapping:
                    asset[key] = mapping[asset[key]]
                    changed = True
    if not changed:
        return text
    return text[:match.start(2)] + json.dumps(assets, ensure_ascii=False, separators=(",", ":")) + text[match.end(2):]


def complete_zip(input_path: Path, output_path: Path) -> dict[str, Any]:
    if input_path.resolve() == output_path.resolve():
        raise ValueError("يجب أن يكون ملف الناتج مختلفًا عن ZIP الأصلي للحفاظ عليه")
    with zipfile.ZipFile(input_path, "r") as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError(f"الأرشيف الأصلي غير سليم: {bad}")
        file_data: dict[str, bytes] = {}
        for info in archive.infolist():
            if info.is_dir():
                continue
            path = PurePosixPath(info.filename)
            if path.is_absolute() or ".." in path.parts:
                raise ValueError(f"مسار غير آمن داخل ZIP: {info.filename}")
            file_data[info.filename] = archive.read(info.filename)
    urls: set[str] = set()
    if "EXTERNAL_RESOURCES.md" in file_data:
        urls.update(extract_external_report(file_data["EXTERNAL_RESOURCES.md"]))
    try:
        project = json.loads(file_data.get("project.json", b"{}").decode("utf-8"))
        urls.update(collect_project_media(project))
    except (json.JSONDecodeError, UnicodeDecodeError):
        project = None
    urls = {url for url in urls if http_url(url)}
    ordered = sorted(urls)
    if len(ordered) > MAX_URLS:
        raise ValueError(f"عدد ملفات الوسائط الخارجية {len(ordered)} يتجاوز الحد الآمن {MAX_URLS}")
    downloaded: dict[str, tuple[bytes, str, str]] = {}
    failures: list[tuple[str, str]] = []
    total = 0
    for url in ordered:
        try:
            data, mime, ext = fetch_media(url)
            if total + len(data) > MAX_TOTAL_BYTES:
                raise ValueError(f"تجاوز إجمالي الوسائط حد {MAX_TOTAL_BYTES // (1024*1024)} MB")
            total += len(data)
            downloaded[url] = (data, mime, ext)
        except Exception as exc:
            failures.append((url, str(exc) or type(exc).__name__))
    mapping: dict[str, str] = {}
    used_names = {name.lower() for name in file_data}
    for url, (data, mime, ext) in downloaded.items():
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
        path = f"assets/external-{digest}{ext}"
        suffix = 2
        while path.lower() in used_names:
            path = f"assets/external-{digest}-{suffix}{ext}"
            suffix += 1
        used_names.add(path.lower())
        file_data[path] = data
        mapping[url] = path
    for name, raw in list(file_data.items()):
        lower = name.lower()
        if lower == "external_resources.md":
            continue
        if lower.endswith(".html"):
            text = raw.decode("utf-8", errors="replace")
            file_data[name] = rewrite_html(text, mapping).encode("utf-8")
        elif lower.endswith(".css"):
            text = raw.decode("utf-8", errors="replace")
            file_data[name] = rewrite_css(text, mapping).encode("utf-8")
        elif lower.endswith(".js"):
            text = raw.decode("utf-8", errors="replace")
            file_data[name] = rewrite_runtime_asset_table(text, mapping).encode("utf-8")
        elif lower.endswith(".json") or lower.endswith(".webmanifest"):
            try:
                payload = json.loads(raw.decode("utf-8"))
                # project.json and metadata get key-aware rewrites, preserving ordinary navigation links.
                payload = rewrite_project_media(payload, mapping)
                file_data[name] = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
    unresolved = [(url, reason) for url, reason in failures]
    file_data["EXTERNAL_RESOURCES.md"] = ("# وسائط خارجية لم يمكن تضمينها\n\n" + ("هذه الوسائط ما زالت تعتمد على الإنترنت:\n\n" + "\n".join(f"- {url}\n  - السبب: {reason}" for url, reason in unresolved) if unresolved else "لم تتبقّ وسائط خارجية معروفة غير مضمّنة.") + "\n").encode("utf-8")
    report_lines = ["# تقرير استكمال أصول الموقع", "", f"- الأصل: `{input_path.name}`", f"- الناتج: `{output_path.name}`", f"- روابط وسائط مرشحة: {len(ordered)}", f"- نُزّلت بنجاح: {len(downloaded)}", f"- الحجم الذي أُضيف: {total} بايت", f"- تعذّر تنزيلها: {len(unresolved)}", "", "## الوسائط المحلية الجديدة"]
    report_lines += [f"- `{mapping[url]}` ← {url} ({len(downloaded[url][0])} بايت, {downloaded[url][1]})" for url in sorted(mapping)] or ["- لا يوجد"]
    report_lines += ["", "## المتعذر تنزيله"]
    report_lines += [f"- {url}: {reason}" for url, reason in unresolved] or ["- لا يوجد"]
    report_lines += ["", "## ملاحظات", "", "روابط التنقل إلى مواقع خارجية باقية كما هي؛ لا يقوم هذا البرنامج بنسخ مواقع الطرف الثالث كاملة. التنزيل يشمل الوسائط والملفات التي ظهرت في تقرير التصدير أو حقول الوسائط المعروفة في بيانات المشروع. لا يتم تضمين ملفات HTML الخارجية كوسائط.", ""]
    file_data["ASSET_COMPLETION_REPORT.md"] = "\n".join(report_lines).encode("utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, data in sorted(file_data.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(output_path, "r") as verified:
        bad = verified.testzip()
        if bad:
            raise ValueError(f"فشل تحقق ZIP النهائي: {bad}")
    return {"candidates": len(ordered), "downloaded": len(downloaded), "failed": len(unresolved), "added_bytes": total, "mapping": mapping, "failures": unresolved, "output": str(output_path)}


def main() -> int:
    parser = argparse.ArgumentParser(description="إكمال وسائط موقع Bunaa داخل ZIP عند تعذر تضمينها من المتصفح بسبب CORS")
    parser.add_argument("zip", type=Path, help="ZIP الموقع الناتج من زر تنزيل ZIP كامل")
    parser.add_argument("-o", "--output", type=Path, help="مسار ZIP الناتج (الافتراضي: <name>-with-assets.zip بجانب الملف الأصلي)")
    args = parser.parse_args()
    source = args.zip.expanduser().resolve()
    if not source.is_file():
        parser.error(f"ملف ZIP غير موجود: {source}")
    output = args.output.expanduser().resolve() if args.output else source.with_name(source.stem + "-with-assets.zip")
    start = time.time()
    try:
        result = complete_zip(source, output)
    except Exception as exc:
        print(f"خطأ: {exc}", file=sys.stderr)
        return 1
    print(f"تم إنشاء: {result['output']}")
    print(f"مرشّح: {result['candidates']} | تم تنزيله: {result['downloaded']} | فشل: {result['failed']} | الحجم المضاف: {result['added_bytes']} بايت")
    print(f"الوقت: {time.time()-start:.1f} ثانية")
    if result['failed']:
        print("راجع EXTERNAL_RESOURCES.md وASSET_COMPLETION_REPORT.md للوسائط التي لم يمكن تنزيلها.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
