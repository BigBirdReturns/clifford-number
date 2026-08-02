from __future__ import annotations

import json
import re
import subprocess
import time
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from .ssc_rd04_a04_common import clean_text, is_official_host, normalize_host, path_rel, sha256_bytes

USER_AGENT = "Mozilla/5.0 (compatible; CliffordNumberResearch/1.0; +https://github.com/BigBirdReturns/clifford-number)"
CONNECT_TIMEOUT_SECONDS = 10
TOTAL_TIMEOUT_SECONDS = 45
MAX_BODY_BYTES = 5_000_000


class BlockTextParser(HTMLParser):
    BLOCK_TAGS = {
        "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
        "figcaption", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header",
        "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "tbody", "td",
        "tfoot", "th", "thead", "tr", "ul",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0
        self.title_parts: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"}:
            self.hidden += 1
        if tag == "title":
            self.in_title = True
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"} and self.hidden:
            self.hidden -= 1
        if tag == "title":
            self.in_title = False
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.hidden:
            return
        if self.in_title:
            self.title_parts.append(data)
        self.parts.append(data)

    def text(self) -> str:
        return clean_text(unescape("".join(self.parts)))

    def title(self) -> str:
        return clean_text(unescape(" ".join(self.title_parts)))


def parse_header_blocks(raw: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in raw.replace("\r\n", "\n").split("\n"):
        if line.startswith("HTTP/"):
            if current:
                blocks.append(current)
            parts = line.split(" ", 2)
            current = {"status_line": line, "status": int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None, "headers": {}}
        elif current is not None and ":" in line:
            key, value = line.split(":", 1)
            current["headers"].setdefault(key.strip().lower(), []).append(value.strip())
    if current:
        blocks.append(current)
    return blocks


def decode_body(body: bytes, content_type: str) -> tuple[str | None, str | None, str | None]:
    lowered = (content_type or "").lower()
    if not body:
        return None, None, None
    textual = any(token in lowered for token in ("text/", "json", "xml", "html", "javascript"))
    if not textual and body[:5] == b"%PDF-":
        return None, None, "pdf"
    if not textual and b"\x00" in body[:4096]:
        return None, None, "binary"
    charset = "utf-8"
    match = re.search(r"charset=([^;\s]+)", lowered)
    if match:
        charset = match.group(1).strip('"\'')
    try:
        decoded = body.decode(charset, errors="replace")
    except LookupError:
        decoded = body.decode("utf-8", errors="replace")
    if "html" in lowered or b"<html" in body[:2048].lower():
        parser = BlockTextParser()
        try:
            parser.feed(decoded)
            return parser.text(), parser.title(), None
        except Exception:
            return clean_text(re.sub(r"<[^>]+>", " ", decoded)), None, "html_parse_fallback"
    return clean_text(decoded), None, None


def _run_curl(url: str, body_path: Path, header_path: Path) -> tuple[subprocess.CompletedProcess[str], dict[str, str]]:
    body_path.parent.mkdir(parents=True, exist_ok=True)
    header_path.parent.mkdir(parents=True, exist_ok=True)
    fmt = json.dumps({
        "http_code": "%{http_code}",
        "url_effective": "%{url_effective}",
        "content_type": "%{content_type}",
        "num_redirects": "%{num_redirects}",
        "size_download": "%{size_download}",
        "remote_ip": "%{remote_ip}",
    })
    cmd = [
        "curl", "--silent", "--show-error", "--location", "--max-redirs", "10",
        "--connect-timeout", str(CONNECT_TIMEOUT_SECONDS), "--max-time", str(TOTAL_TIMEOUT_SECONDS),
        "--max-filesize", str(MAX_BODY_BYTES), "--user-agent", USER_AGENT,
        "--dump-header", str(header_path), "--output", str(body_path), "--write-out", fmt, url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    meta: dict[str, str] = {}
    if proc.stdout.strip():
        try:
            meta = json.loads(proc.stdout)
        except json.JSONDecodeError:
            meta = {"write_out_parse_error": proc.stdout.strip()}
    return proc, meta


def fetch_url(url: str, custody_dir: Path, *, retry_once: bool = True) -> dict[str, Any]:
    attempts: list[dict[str, Any]] = []
    terminal_reason = ""
    for attempt in range(1, 3 if retry_once else 2):
        body_path = custody_dir / f"attempt-{attempt}.body"
        header_path = custody_dir / f"attempt-{attempt}.headers"
        started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        proc, meta = _run_curl(url, body_path, header_path)
        ended = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        body = body_path.read_bytes() if body_path.exists() else b""
        headers = header_path.read_bytes() if header_path.exists() else b""
        header_text = headers.decode("latin-1", errors="replace")
        blocks = parse_header_blocks(header_text)
        status = int(meta.get("http_code") or 0)
        final_url = meta.get("url_effective") or url
        content_type = meta.get("content_type") or ""
        parsed_text, title, parse_state = decode_body(body, content_type)
        attempt_row = {
            "attempt": attempt,
            "started_at": started,
            "ended_at": ended,
            "request_url": url,
            "curl_exit": proc.returncode,
            "curl_stderr": proc.stderr.strip(),
            "http_status": status,
            "final_url": final_url,
            "final_host": normalize_host(final_url),
            "content_type": content_type,
            "redirect_count": int(meta.get("num_redirects") or 0),
            "redirect_chain": blocks,
            "body_path": path_rel(body_path),
            "body_bytes": len(body),
            "body_sha256": sha256_bytes(body),
            "headers_path": path_rel(header_path),
            "headers_bytes": len(headers),
            "headers_sha256": sha256_bytes(headers),
            "parse_state": parse_state,
            "page_title": title,
            "text_characters": len(parsed_text or ""),
        }
        attempts.append(attempt_row)

        transport_failure = proc.returncode != 0
        retryable_http = status == 0 or status == 408 or status == 429 or 500 <= status <= 599
        empty_success = 200 <= status < 400 and len(body) == 0
        if attempt == 1 and retry_once and (transport_failure or retryable_http or empty_success):
            terminal_reason = "bounded_retry_after_transport_http_or_empty_response"
            time.sleep(2)
            continue
        break

    final = attempts[-1]
    body_path = custody_dir / f"attempt-{final['attempt']}.body"
    body = body_path.read_bytes() if body_path.exists() else b""
    text, title, parse_state = decode_body(body, final.get("content_type") or "")
    status = int(final.get("http_status") or 0)
    accessible = final["curl_exit"] == 0 and 200 <= status < 400 and bool(body)
    return {
        "requested_url": url,
        "attempt_count": len(attempts),
        "retry_reason": terminal_reason or None,
        "attempts": attempts,
        "accessible": accessible,
        "final_url": final.get("final_url") or url,
        "final_host": final.get("final_host") or normalize_host(url),
        "final_http_status": status,
        "final_content_type": final.get("content_type") or "",
        "official_after_redirects": is_official_host(final.get("final_host") or ""),
        "page_title": title,
        "parse_state": parse_state,
        "text": text,
        "text_sha256": sha256_bytes((text or "").encode("utf-8")),
    }


def fetch_for_storage(fetch: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in fetch.items() if key != "text"}


def rehydrate_fetch(stored: dict[str, Any], root: Path) -> dict[str, Any]:
    value = dict(stored)
    attempts = value.get("attempts", [])
    if attempts:
        final = attempts[-1]
        body_path = root / final["body_path"]
        body = body_path.read_bytes() if body_path.exists() else b""
        text, title, parse_state = decode_body(body, value.get("final_content_type") or final.get("content_type") or "")
        value["text"] = text
        value["page_title"] = title or value.get("page_title")
        value["parse_state"] = parse_state or value.get("parse_state")
        value["text_sha256"] = sha256_bytes((text or "").encode("utf-8"))
    else:
        value["text"] = None
    return value
