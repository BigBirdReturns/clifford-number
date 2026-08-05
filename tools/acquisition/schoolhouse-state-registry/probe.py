#!/usr/bin/env python3
"""Probe lawful public state-registry routes for School.House identity work.

This execution-only runner does not submit an organization-name search, retain
source rows, or admit a legal identity. It tests official Florida bulk-data
routes, records the Florida charity-search surface without submitting it, and
records North Carolina's published automation boundary before any search is
attempted. Large-file probes are guarded to a one-byte range and a 4 KiB hard
maximum.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

MAX_HTTP_BODY = 512 * 1024
MAX_SFTP_SAMPLE = 4096
USER_AGENT = "CliffordNumber-SchoolHouse-StateRegistryProbe/1.0"
NC_AUTOMATION_MARKERS = (
    "automated or scripted searches",
    "are not permitted",
    "data subscription services",
)
ALLOWED_LINK_HOSTS = {
    "dos.fl.gov",
    "dos.sunbiz.org",
    "sftp.floridados.gov",
    "csapp.fdacs.gov",
    "www.sosnc.gov",
    "sosnc.gov",
}

HTTP_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "fl-sunbiz-quarterly-reference",
        "jurisdiction": "Florida",
        "surface": "official_bulk_reference",
        "url": "https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/",
        "method": "GET",
    },
    {
        "route_id": "fl-sunbiz-corporate-definition",
        "jurisdiction": "Florida",
        "surface": "official_schema_reference",
        "url": "https://dos.sunbiz.org/data-definitions/cor.html",
        "method": "GET",
    },
    {
        "route_id": "fl-sunbiz-fictitious-definition",
        "jurisdiction": "Florida",
        "surface": "official_schema_reference",
        "url": "https://dos.sunbiz.org/data-definitions/fic.html",
        "method": "GET",
    },
    {
        "route_id": "fl-fdacs-check-a-charity",
        "jurisdiction": "Florida",
        "surface": "interactive_charity_search",
        "url": "https://csapp.fdacs.gov/CSPublicApp/CheckACharity/CheckACharity.aspx",
        "method": "GET",
        "no_submission": True,
    },
    {
        "route_id": "nc-sos-business-search-policy",
        "jurisdiction": "North Carolina",
        "surface": "interactive_business_search_policy",
        "url": "https://www.sosnc.gov/online_services/search/Business_Registration_Results",
        "method": "GET",
        "policy_target": "north_carolina_automated_search",
        "no_submission": True,
    },
    {
        "route_id": "nc-sos-charity-search-policy",
        "jurisdiction": "North Carolina",
        "surface": "interactive_charity_search_policy",
        "url": "https://www.sosnc.gov/online_services/search/Charities_Results",
        "method": "GET",
        "policy_target": "north_carolina_automated_search",
        "no_submission": True,
    },
    {
        "route_id": "nc-sos-reports-and-listings",
        "jurisdiction": "North Carolina",
        "surface": "official_bulk_and_report_routes",
        "url": "https://www.sosnc.gov/divisions/business_registration/reports_and_listings",
        "method": "GET",
        "no_submission": True,
    },
    {
        "route_id": "fl-sftp-portal-root",
        "jurisdiction": "Florida",
        "surface": "official_data_access_portal",
        "url": "https://sftp.floridados.gov/",
        "method": "GET",
        "no_submission": True,
    },
    {
        "route_id": "fl-cor-https-home-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_corporate_bulk_file",
        "url": "https://sftp.floridados.gov/doc/quarterly/cor/cordata.zip",
        "method": "HEAD",
        "public_auth": True,
        "large_file_guard": True,
    },
    {
        "route_id": "fl-cor-https-public-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_corporate_bulk_file",
        "url": "https://sftp.floridados.gov/Public/doc/quarterly/cor/cordata.zip",
        "method": "HEAD",
        "public_auth": True,
        "large_file_guard": True,
    },
    {
        "route_id": "fl-fic-https-home-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_fictitious_name_bulk_file",
        "url": "https://sftp.floridados.gov/doc/quarterly/fic/ficdata.zip",
        "method": "HEAD",
        "public_auth": True,
        "large_file_guard": True,
    },
    {
        "route_id": "fl-fic-https-public-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_fictitious_name_bulk_file",
        "url": "https://sftp.floridados.gov/Public/doc/quarterly/fic/ficdata.zip",
        "method": "HEAD",
        "public_auth": True,
        "large_file_guard": True,
    },
]

SFTP_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "fl-cor-sftp-home-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_corporate_bulk_file",
        "url": "sftp://sftp.floridados.gov/doc/quarterly/cor/cordata.zip",
    },
    {
        "route_id": "fl-cor-sftp-public-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_corporate_bulk_file",
        "url": "sftp://sftp.floridados.gov/Public/doc/quarterly/cor/cordata.zip",
    },
    {
        "route_id": "fl-fic-sftp-home-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_fictitious_name_bulk_file",
        "url": "sftp://sftp.floridados.gov/doc/quarterly/fic/ficdata.zip",
    },
    {
        "route_id": "fl-fic-sftp-public-path",
        "jurisdiction": "Florida",
        "surface": "quarterly_fictitious_name_bulk_file",
        "url": "sftp://sftp.floridados.gov/Public/doc/quarterly/fic/ficdata.zip",
    },
]

TERMINAL_STATES = {
    "accessible",
    "accessible_login_surface",
    "accessible_large_file_guarded",
    "auth_required",
    "not_found",
    "provider_blocked",
    "provider_unavailable",
    "publisher_policy_blocked",
    "client_protocol_unavailable",
    "http_error",
    "transport_error",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


class SurfaceParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.in_title = False
        self.title_parts: list[str] = []
        self.forms: list[dict[str, Any]] = []
        self.current_form: dict[str, Any] | None = None
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value for key, value in attrs}
        if tag.lower() == "title":
            self.in_title = True
        elif tag.lower() == "form":
            self.current_form = {
                "method": str(values.get("method") or "GET").upper(),
                "action": urllib.parse.urljoin(self.base_url, values.get("action") or ""),
                "input_names": [],
            }
            self.forms.append(self.current_form)
        elif tag.lower() in {"input", "select", "textarea", "button"} and self.current_form is not None:
            name = normalize_space(values.get("name"))
            if name and name not in self.current_form["input_names"]:
                self.current_form["input_names"].append(name)
        elif tag.lower() == "a":
            href = normalize_space(values.get("href"))
            if href:
                absolute = urllib.parse.urljoin(self.base_url, href)
                host = (urllib.parse.urlparse(absolute).hostname or "").lower()
                if host in ALLOWED_LINK_HOSTS and absolute not in self.links:
                    self.links.append(absolute)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False
        elif tag.lower() == "form":
            self.current_form = None

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    def result(self) -> dict[str, Any]:
        return {
            "title": normalize_space(" ".join(self.title_parts)) or None,
            "forms": self.forms,
            "official_links": self.links[:100],
        }


def redact_error(value: str, username: str, password: str) -> str:
    text = str(value or "")
    for secret in (password, f"{username}:{password}"):
        if secret:
            text = text.replace(secret, "[REDACTED_PUBLIC_CREDENTIAL]")
    return normalize_space(text)[:2000]


def classify_http(status: int | None, body: bytes, content_type: str, route: dict[str, Any]) -> str:
    if status == 401:
        return "auth_required"
    if status == 403:
        return "provider_blocked"
    if status == 404:
        return "not_found"
    if status is None:
        return "transport_error"
    if status < 200 or status >= 400:
        return "http_error"

    text = body.decode("utf-8", errors="ignore").lower()
    if route.get("policy_target") and all(marker in text for marker in NC_AUTOMATION_MARKERS):
        return "publisher_policy_blocked"
    if "text/html" in content_type.lower() and (
        "login" in text and ("username" in text or "password" in text)
    ):
        return "accessible_login_surface"
    return "accessible"


def http_once(
    route: dict[str, Any],
    method: str,
    username: str,
    password: str,
    range_get: bool = False,
) -> dict[str, Any]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/zip,text/plain,*/*",
        "Accept-Encoding": "identity",
        "Connection": "close",
    }
    if route.get("public_auth"):
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    if range_get:
        headers["Range"] = "bytes=0-0"

    request = urllib.request.Request(route["url"], headers=headers, method=method)
    status: int | None = None
    final_url = route["url"]
    response_headers: dict[str, str] = {}
    body = b""
    error: str | None = None
    truncated = False
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            status = int(getattr(response, "status", 200))
            final_url = response.geturl()
            response_headers = {key.lower(): value for key, value in response.headers.items()}
            if method != "HEAD":
                body = response.read(MAX_HTTP_BODY + 1)
                truncated = len(body) > MAX_HTTP_BODY
                body = body[:MAX_HTTP_BODY]
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        final_url = exc.geturl()
        response_headers = {key.lower(): value for key, value in exc.headers.items()}
        error = f"HTTPError: {exc.code} {exc.reason}"
        try:
            body = exc.read(MAX_HTTP_BODY + 1)
            truncated = len(body) > MAX_HTTP_BODY
            body = body[:MAX_HTTP_BODY]
        except Exception:
            body = b""
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        error = f"{type(exc).__name__}: {exc}"

    content_type = response_headers.get("content-type", "")
    result: dict[str, Any] = {
        "method_executed": method + ("_RANGE_0_0" if range_get else ""),
        "status": status,
        "final_url": final_url,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "content_type": content_type or None,
        "content_length_header": response_headers.get("content-length"),
        "content_range": response_headers.get("content-range"),
        "etag": response_headers.get("etag"),
        "last_modified": response_headers.get("last-modified"),
        "content_disposition": response_headers.get("content-disposition"),
        "sample_bytes": len(body),
        "sample_sha256": sha256_bytes(body) if body else None,
        "sample_truncated": truncated,
        "error": redact_error(error or "", username, password) or None,
    }
    if body and "text/html" in content_type.lower():
        parser = SurfaceParser(final_url)
        try:
            parser.feed(body.decode("utf-8", errors="replace"))
            result["surface_metadata"] = parser.result()
        except Exception as exc:
            result["surface_parse_error"] = f"{type(exc).__name__}: {exc}"
    result["state"] = classify_http(status, body, content_type, route)
    return result


def probe_http(route: dict[str, Any], username: str, password: str) -> dict[str, Any]:
    method = route.get("method", "GET").upper()
    result = http_once(route, method, username, password)
    if method == "HEAD" and result.get("status") in {405, 501}:
        result = http_once(route, "GET", username, password, range_get=True)
    return {
        "schema_version": "schoolhouse-state-registry-route-receipt@1",
        **{key: value for key, value in route.items() if key not in {"public_auth"}},
        **result,
        "public_credentials_used": bool(route.get("public_auth")),
        "query_submitted": False,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "probed_at": utc_now(),
    }


def curl_protocols() -> tuple[list[str], str | None]:
    try:
        completed = subprocess.run(
            ["curl", "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return [], f"{type(exc).__name__}: {exc}"
    protocols: list[str] = []
    for line in completed.stdout.splitlines():
        if line.startswith("Protocols:"):
            protocols = line.split(":", 1)[1].strip().lower().split()
            break
    return protocols, normalize_space(completed.stderr) or None


def classify_curl(returncode: int, stderr: str, sample_bytes: int) -> str:
    lowered = stderr.lower()
    if returncode == 0:
        return "accessible"
    if "protocol" in lowered and "not supported" in lowered:
        return "client_protocol_unavailable"
    if "maximum file size exceeded" in lowered or returncode == 63:
        return "accessible_large_file_guarded"
    if "authentication" in lowered or "permission denied" in lowered or returncode == 67:
        return "auth_required"
    if "no such file" in lowered or "not found" in lowered or returncode == 78:
        return "not_found"
    if "could not resolve host" in lowered or "failed to connect" in lowered or "timed out" in lowered:
        return "provider_unavailable"
    if returncode in {7, 28}:
        return "provider_unavailable"
    if sample_bytes > 0:
        return "accessible_large_file_guarded"
    return "transport_error"


def probe_sftp(
    route: dict[str, Any],
    username: str,
    password: str,
    protocols: list[str],
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "schema_version": "schoolhouse-state-registry-route-receipt@1",
        **route,
        "method": "SFTP_RANGE_0_0",
        "public_credentials_used": True,
        "curl_protocols": protocols,
        "query_submitted": False,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "probed_at": utc_now(),
    }
    if "sftp" not in protocols:
        return {
            **base,
            "state": "client_protocol_unavailable",
            "returncode": None,
            "sample_bytes": 0,
            "sample_sha256": None,
            "error": "runner curl build does not advertise SFTP support",
        }

    with tempfile.TemporaryDirectory(prefix="schoolhouse-state-registry-") as directory:
        sample_path = Path(directory) / "sample.bin"
        command = [
            "curl",
            "--silent",
            "--show-error",
            "--connect-timeout",
            "12",
            "--max-time",
            "40",
            "--max-filesize",
            str(MAX_SFTP_SAMPLE),
            "--range",
            "0-0",
            "--user",
            f"{username}:{password}",
            "--output",
            str(sample_path),
            route["url"],
        ]
        started = time.monotonic()
        try:
            completed = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=50,
            )
            returncode = completed.returncode
            stderr = redact_error(completed.stderr, username, password)
        except subprocess.TimeoutExpired as exc:
            returncode = 28
            stderr = redact_error(f"TimeoutExpired: {exc}", username, password)
        except OSError as exc:
            returncode = 1
            stderr = redact_error(f"{type(exc).__name__}: {exc}", username, password)
        sample = sample_path.read_bytes() if sample_path.exists() else b""
        if len(sample) > MAX_SFTP_SAMPLE:
            sample = sample[:MAX_SFTP_SAMPLE]
        return {
            **base,
            "state": classify_curl(returncode, stderr, len(sample)),
            "returncode": returncode,
            "elapsed_seconds": round(time.monotonic() - started, 3),
            "sample_bytes": len(sample),
            "sample_sha256": sha256_bytes(sample) if sample else None,
            "error": stderr or None,
        }


def build_manifest(output: Path) -> None:
    files: list[dict[str, Any]] = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {"artifact-manifest.json", "SHA256SUMS"}:
            continue
        body = file.read_bytes()
        files.append(
            {
                "path": file.relative_to(output).as_posix(),
                "bytes": len(body),
                "sha256": sha256_bytes(body),
            }
        )
    write_json(
        output / "artifact-manifest.json",
        {
            "schema_version": "schoolhouse-state-registry-route-probe-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(files),
            "files": files,
            "raw_source_retained": False,
            "identity_admitted": False,
            "outside_human_dependency": False,
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines: list[str] = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(f"{sha256_bytes(file.read_bytes())}  {file.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--florida-username", default=os.environ.get("FL_SFTP_USERNAME", "Public"))
    parser.add_argument("--florida-password", default=os.environ.get("FL_SFTP_PASSWORD", ""))
    args = parser.parse_args()

    if not args.florida_password:
        raise SystemExit("FL_SFTP_PASSWORD is required for the official public route probe")

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()

    receipts: list[dict[str, Any]] = []
    for route in HTTP_ROUTES:
        print(f"probe {route['route_id']}", flush=True)
        receipts.append(probe_http(route, args.florida_username, args.florida_password))

    protocols, curl_error = curl_protocols()
    for route in SFTP_ROUTES:
        print(f"probe {route['route_id']}", flush=True)
        receipts.append(probe_sftp(route, args.florida_username, args.florida_password, protocols))

    state_counts = Counter(row["state"] for row in receipts)
    jurisdiction_counts = Counter(row["jurisdiction"] for row in receipts)
    policy_blocked = [row["route_id"] for row in receipts if row["state"] == "publisher_policy_blocked"]
    florida_bulk_accessible = [
        row["route_id"]
        for row in receipts
        if row["jurisdiction"] == "Florida"
        and "bulk_file" in row["surface"]
        and row["state"] in {"accessible", "accessible_large_file_guarded"}
    ]
    all_terminal = all(row["state"] in TERMINAL_STATES for row in receipts)

    policy = {
        "schema_version": "schoolhouse-state-registry-route-policy@1",
        "as_of": utc_now(),
        "florida": {
            "bulk_access_authority": "official_public_credentials_published_by_florida_department_of_state",
            "declared_bulk_surfaces": ["quarterly_corporate_filings", "quarterly_fictitious_name_filings"],
            "public_credential_username": args.florida_username,
            "public_credential_password_retained": False,
            "interactive_charity_search_submissions": 0,
            "raw_bulk_bytes_retained": False,
        },
        "north_carolina": {
            "interactive_search_automation_permitted": False,
            "policy_basis": "official pages state that automated or scripted searches are not permitted and direct bulk users to Data Subscription Services",
            "business_search_submissions": 0,
            "charity_search_submissions": 0,
            "allowed_next_surfaces": ["free_reports_and_listings", "data_subscription_services", "distinct_official_downloads"],
        },
        "policy_blocked_routes": policy_blocked,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    summary = {
        "schema_version": "schoolhouse-state-registry-route-probe-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "declared_routes": len(HTTP_ROUTES) + len(SFTP_ROUTES),
        "route_receipts": len(receipts),
        "jurisdiction_route_counts": dict(sorted(jurisdiction_counts.items())),
        "state_counts": dict(sorted(state_counts.items())),
        "all_routes_terminal": all_terminal,
        "curl_protocols": protocols,
        "curl_probe_error": curl_error,
        "north_carolina_search_submissions": 0,
        "florida_charity_search_submissions": 0,
        "florida_bulk_accessible_routes": florida_bulk_accessible,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
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

    write_jsonl(output / "route-receipts.jsonl", receipts)
    write_json(output / "route-policy.json", policy)
    write_json(output / "summary.json", summary)
    build_manifest(output)
    print(compact(summary), flush=True)
    return 0 if all_terminal else 2


if __name__ == "__main__":
    raise SystemExit(main())
