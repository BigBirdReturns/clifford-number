#!/usr/bin/env python3
"""Discover lawful Florida-charity and North Carolina bulk/report routes.

This execution-only runner performs GET, HEAD, and bounded byte-range probes on
official public pages. It never submits an organization name, license number,
interactive search, registration, order, or contact request. HTML bodies are
parsed in temporary storage and discarded. The artifact retains route status,
source hashes, form and control names, same-government links, publisher policy,
and exact no-submission custody.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

USER_AGENT = "CliffordNumber-SchoolHouse-CharityRouteDiscovery/1.0"
MAX_HTML_BYTES = 2 * 1024 * 1024
MAX_FILE_SAMPLE_BYTES = 8192
MAX_DISCOVERED_FOLLOWS = 40
OFFICIAL_SUFFIXES = (".fdacs.gov", ".sosnc.gov")
OFFICIAL_EXACT_HOSTS = {
    "fdacs.gov",
    "www.fdacs.gov",
    "csapp.fdacs.gov",
    "forms.fdacs.gov",
    "ccmedia.fdacs.gov",
    "sosnc.gov",
    "www.sosnc.gov",
    "b2b.sosnc.gov",
}
ROOT_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "fl-check-a-charity",
        "jurisdiction": "Florida",
        "surface": "interactive_charity_search_mechanics",
        "url": "https://csapp.fdacs.gov/CSPublicApp/CheckACharity/CheckACharity.aspx",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "fl-solicitation-program",
        "jurisdiction": "Florida",
        "surface": "charity_program_reference",
        "url": "https://www.fdacs.gov/Business-Services/Solicitation-of-Contributions",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "fl-charity-check-faq",
        "jurisdiction": "Florida",
        "surface": "charity_program_reference",
        "url": "https://www.fdacs.gov/Consumer-Resources/Charities/Charities-FAQ/How-do-I-check-on-a-charitable-organization",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "nc-reports-listings",
        "jurisdiction": "North Carolina",
        "surface": "business_reports_and_downloads",
        "url": "https://www.sosnc.gov/divisions/business_registration/reports_and_listings",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "nc-online-business-services",
        "jurisdiction": "North Carolina",
        "surface": "business_reports_and_downloads",
        "url": "https://www.sosnc.gov/divisions/business_registration/online_business_services",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "nc-charities",
        "jurisdiction": "North Carolina",
        "surface": "charity_registry_reference",
        "url": "https://www.sosnc.gov/divisions/charities",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "nc-charity-search-policy",
        "jurisdiction": "North Carolina",
        "surface": "interactive_charity_search_policy",
        "url": "https://www.sosnc.gov/online_services/search/by_title/search_charities",
        "method": "GET",
        "query_submission_permitted": False,
    },
    {
        "route_id": "nc-b2b-charities-mirror",
        "jurisdiction": "North Carolina",
        "surface": "charity_registry_reference_mirror",
        "url": "https://b2b.sosnc.gov/divisions/charities",
        "method": "GET",
        "query_submission_permitted": False,
    },
]
RELEVANT_TERMS = {
    "annual report",
    "annual reports",
    "charit",
    "checkachar",
    "check-a-charity",
    "data subscription",
    "download",
    "listing",
    "non profit",
    "non-profit",
    "nonprofit",
    "report",
    "solicitation",
    "subscription",
    "unincorporated",
}
SKIP_TERMS = {
    "complaint",
    "contact",
    "create account",
    "employment",
    "facebook",
    "forgot password",
    "instagram",
    "linkedin",
    "login",
    "online filing",
    "pay invoice",
    "privacy",
    "register online",
    "renew online",
    "shopping cart",
    "twitter",
    "youtube",
}
POLICY_PATTERNS = {
    "nc_interactive_real_time": re.compile(
        r"online search tools are designed for interactive,? real[- ]time use",
        re.IGNORECASE,
    ),
    "nc_automated_not_permitted": re.compile(
        r"automated or scripted searches.*?not permitted",
        re.IGNORECASE | re.DOTALL,
    ),
    "nc_bulk_subscription_direction": re.compile(
        r"bulk access to public data.*?data subscription services",
        re.IGNORECASE | re.DOTALL,
    ),
    "fl_public_service": re.compile(
        r"information in check-a-charity is provided as a public service",
        re.IGNORECASE,
    ),
    "fl_partial_name_instruction": re.compile(
        r"complete or partial name.*?search",
        re.IGNORECASE | re.DOTALL,
    ),
}
FILE_SUFFIXES = {
    ".csv",
    ".json",
    ".pdf",
    ".txt",
    ".xls",
    ".xlsx",
    ".xml",
    ".zip",
}
TERMINAL_STATES = {
    "accessible_html",
    "accessible_file_sample",
    "accessible_non_html",
    "auth_required",
    "provider_blocked",
    "not_found",
    "server_error",
    "range_guard_refused_full_body",
    "oversized_html_guarded",
    "timeout",
    "transport_error",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def official_host(url: str) -> bool:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    return host in OFFICIAL_EXACT_HOSTS or any(host.endswith(suffix) for suffix in OFFICIAL_SUFFIXES)


def normalize_url(base_url: str, href: str) -> str | None:
    href = normalize_space(href)
    if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
        return None
    absolute = urllib.parse.urljoin(base_url, href)
    parsed = urllib.parse.urlsplit(absolute)
    if parsed.scheme.lower() not in {"http", "https"}:
        return None
    normalized = urllib.parse.urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or "/",
            parsed.query,
            "",
        )
    )
    return normalized if official_host(normalized) else None


def header_value_hash(value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    encoded = value.encode("utf-8", errors="replace")
    return {"bytes": len(encoded), "sha256": sha256_bytes(encoded)}


class SurfaceParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.title_depth = 0
        self.title_parts: list[str] = []
        self.forms: list[dict[str, Any]] = []
        self.current_form: dict[str, Any] | None = None
        self.anchors: list[dict[str, Any]] = []
        self.current_anchor: dict[str, Any] | None = None
        self.scripts: list[str] = []
        self.stylesheets: list[str] = []
        self.inline_script_depth = 0
        self.inline_script_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        values = {key.lower(): value for key, value in attrs}
        if tag == "title":
            self.title_depth += 1
        elif tag == "form":
            action = normalize_url(self.base_url, values.get("action") or self.base_url) or self.base_url
            self.current_form = {
                "form_index": len(self.forms) + 1,
                "id": normalize_space(values.get("id")) or None,
                "name": normalize_space(values.get("name")) or None,
                "method": normalize_space(values.get("method") or "GET").upper(),
                "action": action,
                "enctype": normalize_space(values.get("enctype")) or None,
                "controls": [],
            }
            self.forms.append(self.current_form)
        elif tag in {"input", "select", "textarea", "button"}:
            control_type = normalize_space(values.get("type") or tag).lower()
            value = values.get("value")
            control: dict[str, Any] = {
                "tag": tag,
                "type": control_type,
                "name": normalize_space(values.get("name")) or None,
                "id": normalize_space(values.get("id")) or None,
                "autocomplete": normalize_space(values.get("autocomplete")) or None,
                "required": "required" in values,
            }
            if control_type == "hidden":
                control["hidden_value_receipt"] = header_value_hash(value)
            elif control_type in {"submit", "button", "reset"} and value is not None:
                control["button_value"] = normalize_space(value)[:200]
            if self.current_form is not None:
                self.current_form["controls"].append(control)
        elif tag == "a":
            href = normalize_url(self.base_url, values.get("href") or "")
            if href:
                self.current_anchor = {
                    "href": href,
                    "id": normalize_space(values.get("id")) or None,
                    "class": normalize_space(values.get("class")) or None,
                    "text_parts": [],
                }
        elif tag == "script":
            src = normalize_url(self.base_url, values.get("src") or "")
            if src:
                self.scripts.append(src)
            else:
                self.inline_script_depth += 1
        elif tag == "link":
            rel = normalize_space(values.get("rel")).lower()
            href = normalize_url(self.base_url, values.get("href") or "")
            if href and "stylesheet" in rel:
                self.stylesheets.append(href)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title" and self.title_depth:
            self.title_depth -= 1
        elif tag == "form":
            self.current_form = None
        elif tag == "a" and self.current_anchor is not None:
            anchor = dict(self.current_anchor)
            anchor["text"] = normalize_space(" ".join(anchor.pop("text_parts")))[:500]
            self.anchors.append(anchor)
            self.current_anchor = None
        elif tag == "script" and self.inline_script_depth:
            self.inline_script_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title_parts.append(data)
        if self.current_anchor is not None:
            self.current_anchor["text_parts"].append(data)
        if self.inline_script_depth:
            self.inline_script_parts.append(data)

    def result(self) -> dict[str, Any]:
        deduped_anchors: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()
        for anchor in self.anchors:
            key = (anchor["href"], anchor.get("text") or "")
            if key not in seen:
                seen.add(key)
                deduped_anchors.append(anchor)
        return {
            "title": normalize_space(" ".join(self.title_parts)) or None,
            "forms": self.forms,
            "anchors": deduped_anchors,
            "scripts": sorted(set(self.scripts)),
            "stylesheets": sorted(set(self.stylesheets)),
            "inline_script": "\n".join(self.inline_script_parts),
        }


def parse_header_blocks(path: Path) -> tuple[int | None, dict[str, str], list[str]]:
    if not path.exists():
        return None, {}, []
    text = path.read_text(encoding="latin-1", errors="replace")
    blocks = re.split(r"\r?\n\r?\n", text)
    status: int | None = None
    headers: dict[str, str] = {}
    cookie_names: list[str] = []
    for block in blocks:
        lines = [line for line in block.splitlines() if line.strip()]
        if not lines or not lines[0].startswith("HTTP/"):
            continue
        match = re.match(r"HTTP/\S+\s+(\d{3})", lines[0])
        if match:
            status = int(match.group(1))
        current: dict[str, str] = {}
        for line in lines[1:]:
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key == "set-cookie":
                name = value.split("=", 1)[0].strip()
                if name and name not in cookie_names:
                    cookie_names.append(name)
            elif key in current:
                current[key] = f"{current[key]}, {value}"
            else:
                current[key] = value
        headers = current
    return status, headers, cookie_names


def curl_version() -> dict[str, Any]:
    try:
        completed = subprocess.run(
            ["curl", "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return {"available": False, "error": f"{type(exc).__name__}: {exc}"}
    protocols: list[str] = []
    features: list[str] = []
    for line in completed.stdout.splitlines():
        if line.startswith("Protocols:"):
            protocols = line.split(":", 1)[1].strip().split()
        elif line.startswith("Features:"):
            features = line.split(":", 1)[1].strip().split()
    return {
        "available": completed.returncode == 0,
        "version_line": completed.stdout.splitlines()[0] if completed.stdout else None,
        "protocols": protocols,
        "features": features,
        "stderr": normalize_space(completed.stderr) or None,
    }


def classify_state(
    status: int | None,
    content_type: str,
    returncode: int,
    method: str,
    body_bytes: int,
    body_limit: int,
) -> str:
    if returncode == 28:
        return "timeout"
    if status == 401:
        return "auth_required"
    if status == 403:
        return "provider_blocked"
    if status == 404:
        return "not_found"
    if status is not None and status >= 500:
        return "server_error"
    if returncode == 63:
        return "oversized_html_guarded" if method == "GET_HTML" else "range_guard_refused_full_body"
    if status is None:
        return "transport_error"
    if status < 200 or status >= 400:
        return "transport_error"
    if method == "GET_RANGE":
        return "accessible_file_sample"
    if "text/html" in content_type.lower() or "application/xhtml" in content_type.lower():
        return "accessible_html"
    return "accessible_non_html" if body_bytes <= body_limit else "transport_error"


def run_curl(url: str, method: str, request_id: str, workdir: Path) -> tuple[dict[str, Any], bytes]:
    headers_path = workdir / f"{request_id}.headers"
    body_path = workdir / f"{request_id}.body"
    metadata_path = workdir / f"{request_id}.metadata"
    body_limit = MAX_HTML_BYTES if method == "GET_HTML" else MAX_FILE_SAMPLE_BYTES
    command = [
        "curl",
        "--silent",
        "--show-error",
        "--location",
        "--max-redirs",
        "5",
        "--connect-timeout",
        "15",
        "--max-time",
        "60",
        "--retry",
        "2",
        "--retry-delay",
        "2",
        "--retry-all-errors",
        "--http1.1",
        "--user-agent",
        USER_AGENT,
        "--header",
        "Accept-Encoding: identity",
        "--header",
        "Cache-Control: no-cache",
        "--dump-header",
        str(headers_path),
        "--output",
        str(body_path),
        "--max-filesize",
        str(body_limit),
        "--write-out",
        "%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{time_total}\n%{num_redirects}\n",
    ]
    if method == "HEAD":
        command.append("--head")
    elif method == "GET_RANGE":
        command.extend(["--range", f"0-{MAX_FILE_SAMPLE_BYTES - 1}"])
    command.append(url)
    started = time.monotonic()
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=75,
    )
    metadata_path.write_text(completed.stdout, encoding="utf-8")
    metadata_lines = completed.stdout.splitlines()
    status_from_writeout = int(metadata_lines[0]) if metadata_lines and metadata_lines[0].isdigit() else None
    effective_url = metadata_lines[1] if len(metadata_lines) > 1 else url
    writeout_content_type = metadata_lines[2] if len(metadata_lines) > 2 else ""
    status_from_headers, headers, cookie_names = parse_header_blocks(headers_path)
    status = status_from_headers or status_from_writeout
    body = body_path.read_bytes() if body_path.exists() else b""
    content_type = headers.get("content-type") or writeout_content_type or ""
    receipt = {
        "request_id": request_id,
        "requested_url": url,
        "effective_url": effective_url,
        "method": method,
        "status": status,
        "returncode": completed.returncode,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "content_type": content_type or None,
        "content_length": int(headers["content-length"]) if headers.get("content-length", "").isdigit() else None,
        "content_range": headers.get("content-range"),
        "content_disposition": headers.get("content-disposition"),
        "etag": headers.get("etag"),
        "last_modified": headers.get("last-modified"),
        "cache_control": headers.get("cache-control"),
        "server": headers.get("server"),
        "cookie_names": sorted(cookie_names),
        "body_bytes": len(body),
        "body_sha256": sha256_bytes(body) if body else None,
        "stderr": normalize_space(completed.stderr)[:2000] or None,
        "state": classify_state(status, content_type, completed.returncode, method, len(body), body_limit),
    }
    for path in (headers_path, body_path, metadata_path):
        path.unlink(missing_ok=True)
    return receipt, body


def extract_endpoint_hints(base_url: str, text: str) -> list[str]:
    hints: set[str] = set()
    patterns = [
        r"https?://[^\s\"'<>]+",
        r"[\"']([^\"']*(?:\.asmx|\.ashx|\.svc|/api/)[^\"']*)[\"']",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            candidate = match.group(1) if match.lastindex else match.group(0)
            candidate = candidate.rstrip("),.;")
            normalized = normalize_url(base_url, candidate)
            if normalized:
                hints.add(normalized)
    return sorted(hints)


def sanitize_surface_metadata(route_id: str, effective_url: str, body: bytes) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    text = body.decode("utf-8", errors="replace")
    parser = SurfaceParser(effective_url)
    parser.feed(text)
    parsed = parser.result()
    inline_script = parsed.pop("inline_script")
    forms = []
    for form in parsed["forms"]:
        forms.append(
            {
                "route_id": route_id,
                "effective_url": effective_url,
                **form,
                "query_submitted": False,
                "hidden_values_retained": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    policy_hits = {
        policy_id: bool(pattern.search(text))
        for policy_id, pattern in POLICY_PATTERNS.items()
    }
    page = {
        "route_id": route_id,
        "effective_url": effective_url,
        "title": parsed["title"],
        "anchor_count": len(parsed["anchors"]),
        "form_count": len(parsed["forms"]),
        "script_count": len(parsed["scripts"]),
        "stylesheet_count": len(parsed["stylesheets"]),
        "anchors": parsed["anchors"],
        "scripts": parsed["scripts"],
        "stylesheets": parsed["stylesheets"],
        "endpoint_hints": extract_endpoint_hints(effective_url, inline_script),
        "page_method_markers": {
            "page_methods": bool(re.search(r"\bPageMethods\b", inline_script)),
            "web_method": bool(re.search(r"\bWebMethod\b", inline_script)),
            "do_postback": bool(re.search(r"__doPostBack", text)),
            "viewstate": "__VIEWSTATE" in text,
            "event_validation": "__EVENTVALIDATION" in text,
        },
        "policy_hits": policy_hits,
        "raw_body_retained": False,
        "query_submitted": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    return page, forms


def relevant_link(anchor: dict[str, Any]) -> bool:
    href = anchor["href"].lower()
    text = (anchor.get("text") or "").lower()
    combined = f"{text} {href}"
    if any(term in combined for term in SKIP_TERMS):
        return False
    if "/online_services/search/" in href and "report" not in combined and "listing" not in combined:
        return False
    return any(term in combined for term in RELEVANT_TERMS)


def route_id_for_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    stem = re.sub(r"[^a-z0-9]+", "-", f"{parsed.hostname}{parsed.path}".lower()).strip("-")
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:10]
    return f"discovered-{stem[:80]}-{digest}"


def build_manifest(output: Path) -> None:
    rows: list[dict[str, Any]] = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {"artifact-manifest.json", "SHA256SUMS"}:
            continue
        body = file.read_bytes()
        rows.append(
            {
                "path": file.relative_to(output).as_posix(),
                "bytes": len(body),
                "sha256": sha256_bytes(body),
            }
        )
    write_json(
        output / "artifact-manifest.json",
        {
            "schema_version": "schoolhouse-charity-nc-route-discovery-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(rows),
            "files": rows,
            "raw_source_retained": False,
            "hidden_form_values_retained": False,
            "search_submissions": 0,
            "source_rows_acquired": 0,
            "identity_admitted": False,
            "outside_human_dependency": False,
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines: list[str] = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(f"{sha256_file(file)}  {file.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()
    curl = curl_version()
    if not curl.get("available"):
        raise SystemExit("curl is required for bounded route discovery")

    root_receipts: list[dict[str, Any]] = []
    page_rows: list[dict[str, Any]] = []
    form_rows: list[dict[str, Any]] = []
    discovered_link_rows: list[dict[str, Any]] = []
    followed_receipts: list[dict[str, Any]] = []
    known_urls = {row["url"] for row in ROOT_ROUTES}

    with tempfile.TemporaryDirectory(prefix="schoolhouse-charity-route-discovery-") as directory:
        temp_root = Path(directory)
        for route in ROOT_ROUTES:
            print(f"root probe {route['route_id']} {route['url']}", flush=True)
            receipt, body = run_curl(route["url"], "GET_HTML", route["route_id"], temp_root)
            row = {
                "schema_version": "schoolhouse-charity-route-receipt@1",
                **route,
                **receipt,
                "query_submitted": False,
                "source_rows_acquired": 0,
                "raw_source_retained": False,
                "hidden_form_values_retained": False,
                "street_address_rows_retained": 0,
                "contact_detail_rows_retained": 0,
                "private_support_rows": 0,
                "identity_admitted": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
                "probed_at": utc_now(),
            }
            root_receipts.append(row)
            if receipt["state"] == "accessible_html" and body:
                page, forms = sanitize_surface_metadata(route["route_id"], receipt["effective_url"], body)
                page_rows.append(page)
                form_rows.extend(forms)
                for anchor in page["anchors"]:
                    if not relevant_link(anchor):
                        continue
                    discovered_link_rows.append(
                        {
                            "source_route_id": route["route_id"],
                            "source_url": receipt["effective_url"],
                            "href": anchor["href"],
                            "anchor_text": anchor.get("text") or None,
                            "official_host": True,
                            "relevant": True,
                            "query_submission_required": False,
                            "follow_state": "queued",
                            "graph_effect": "none",
                            "promotes_to": "candidate_only",
                        }
                    )

        unique_discovered: dict[str, dict[str, Any]] = {}
        for row in discovered_link_rows:
            if row["href"] in known_urls:
                row["follow_state"] = "root_already_probed"
                continue
            unique_discovered.setdefault(row["href"], row)
        selected = sorted(
            unique_discovered.values(),
            key=lambda row: (row["source_route_id"], row["anchor_text"] or "", row["href"]),
        )[:MAX_DISCOVERED_FOLLOWS]
        selected_urls = {row["href"] for row in selected}
        for row in discovered_link_rows:
            if row["href"] in selected_urls:
                row["follow_state"] = "selected"
            elif row["follow_state"] == "queued":
                row["follow_state"] = "not_selected_within_bound"

        for link in selected:
            url = link["href"]
            suffix = Path(urllib.parse.urlsplit(url).path).suffix.lower()
            method = "GET_RANGE" if suffix in FILE_SUFFIXES else "GET_HTML"
            request_id = route_id_for_url(url)
            print(f"follow probe {request_id} {url}", flush=True)
            receipt, body = run_curl(url, method, request_id, temp_root)
            followed = {
                "schema_version": "schoolhouse-charity-route-receipt@1",
                "route_id": request_id,
                "parent_route_id": link["source_route_id"],
                "jurisdiction": "Florida" if ".fdacs.gov" in urllib.parse.urlsplit(url).hostname.lower() else "North Carolina",
                "surface": "discovered_official_file" if method == "GET_RANGE" else "discovered_official_page",
                **receipt,
                "query_submitted": False,
                "source_rows_acquired": 0,
                "raw_source_retained": False,
                "hidden_form_values_retained": False,
                "street_address_rows_retained": 0,
                "contact_detail_rows_retained": 0,
                "private_support_rows": 0,
                "identity_admitted": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
                "probed_at": utc_now(),
            }
            followed_receipts.append(followed)
            if receipt["state"] == "accessible_html" and body:
                page, forms = sanitize_surface_metadata(request_id, receipt["effective_url"], body)
                page_rows.append(page)
                form_rows.extend(forms)

    root_by_id = {row["route_id"]: row for row in root_receipts}
    pages_by_id = {row["route_id"]: row for row in page_rows}
    fl_page = pages_by_id.get("fl-check-a-charity")
    fl_forms = [row for row in form_rows if row["route_id"] == "fl-check-a-charity"]
    fl_named_controls = sorted(
        {
            control["name"]
            for form in fl_forms
            for control in form["controls"]
            if control.get("name")
        }
    )
    nc_policy_hits = {
        policy_id: any(page["policy_hits"].get(policy_id) for page in page_rows)
        for policy_id in (
            "nc_interactive_real_time",
            "nc_automated_not_permitted",
            "nc_bulk_subscription_direction",
        )
    }
    florida_policy_hits = {
        policy_id: any(page["policy_hits"].get(policy_id) for page in page_rows)
        for policy_id in ("fl_public_service", "fl_partial_name_instruction")
    }
    policy = {
        "schema_version": "schoolhouse-charity-nc-route-policy@1",
        "as_of": utc_now(),
        "florida": {
            "check_a_charity_route_state": root_by_id["fl-check-a-charity"]["state"],
            "form_count": len(fl_forms),
            "post_form_count": sum(form["method"] == "POST" for form in fl_forms),
            "named_control_count": len(fl_named_controls),
            "named_controls": fl_named_controls,
            "public_service_instruction_captured": florida_policy_hits["fl_public_service"],
            "partial_name_search_instruction_captured": florida_policy_hits["fl_partial_name_instruction"],
            "search_submissions": 0,
            "hidden_form_values_retained": False,
            "automation_permission_inferred": False,
            "boundary": "Form mechanics and official links are custody only. No organization name or registration number was submitted, and the absence of an explicit prohibition is not treated as permission for unbounded automation.",
        },
        "north_carolina": {
            "interactive_real_time_instruction_captured": nc_policy_hits["nc_interactive_real_time"],
            "automated_or_scripted_searches_not_permitted": nc_policy_hits["nc_automated_not_permitted"],
            "bulk_data_subscription_direction_captured": nc_policy_hits["nc_bulk_subscription_direction"],
            "search_submissions": 0,
            "allowed_next_surfaces": [
                "official downloadable reports and listings",
                "official data subscription descriptions or files",
                "distinct official static documents",
            ],
            "forbidden_next_surface": "scripted interactive business or charity search",
        },
        "search_submissions": 0,
        "source_rows_acquired": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    all_receipts = root_receipts + followed_receipts
    state_counts = Counter(row["state"] for row in all_receipts)
    direct_file_rows = [row for row in followed_receipts if row["method"] == "GET_RANGE"]
    summary = {
        "schema_version": "schoolhouse-charity-nc-route-discovery-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "curl": curl,
        "declared_root_routes": len(ROOT_ROUTES),
        "root_route_receipts": len(root_receipts),
        "discovered_link_rows": len(discovered_link_rows),
        "unique_discovered_links": len({row["href"] for row in discovered_link_rows}),
        "followed_routes": len(followed_receipts),
        "direct_file_sample_routes": len(direct_file_rows),
        "html_surface_rows": len(page_rows),
        "form_rows": len(form_rows),
        "state_counts": dict(sorted(state_counts.items())),
        "all_route_receipts_terminal": all(row["state"] in TERMINAL_STATES for row in all_receipts),
        "fl_check_a_charity_state": root_by_id["fl-check-a-charity"]["state"],
        "fl_check_a_charity_form_count": len(fl_forms),
        "fl_check_a_charity_post_form_count": sum(form["method"] == "POST" for form in fl_forms),
        "fl_check_a_charity_named_control_count": len(fl_named_controls),
        "nc_automated_search_prohibition_captured": nc_policy_hits["nc_automated_not_permitted"],
        "nc_bulk_subscription_direction_captured": nc_policy_hits["nc_bulk_subscription_direction"],
        "search_submissions": 0,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_jsonl(output / "root-route-receipts.jsonl", root_receipts)
    write_jsonl(output / "discovered-links.jsonl", discovered_link_rows)
    write_jsonl(output / "followed-route-receipts.jsonl", followed_receipts)
    write_jsonl(output / "html-surfaces.jsonl", page_rows)
    write_jsonl(output / "surface-forms.jsonl", form_rows)
    write_json(output / "route-policy.json", policy)
    write_json(output / "summary.json", summary)
    build_manifest(output)
    print(compact(summary), flush=True)
    return 0 if summary["all_route_receipts_terminal"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
