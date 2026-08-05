#!/usr/bin/env python3
"""Acquire a bounded IRS legal-identity candidate set for BVVC's School.House.

The public School.House materials describe the platform as a 501(c)(3) nonprofit
founded in 2023, but do not supply a registry-grade legal name or EIN. This
runner executes the same name battery over official IRS public datasets:

* EO Business Master File extracts for Florida, Illinois, and North Carolina,
  the three public location states declared by School.House/BVVC surfaces;
* Publication 78;
* Form 990-N e-Postcard data; and
* the automatic-revocation list.

It preserves only sanitized identity and status fields. Street addresses,
contact details, officer names, private records, and private messages are not
retained. A match is a legal-identity candidate, never an automatic join.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SOURCES = [
    {
        "source_id": "irs-eo-bmf-florida",
        "dataset": "eo_bmf",
        "jurisdiction": "Florida",
        "url": "https://www.irs.gov/pub/irs-soi/eo_fl.csv",
        "format": "csv",
    },
    {
        "source_id": "irs-eo-bmf-illinois",
        "dataset": "eo_bmf",
        "jurisdiction": "Illinois",
        "url": "https://www.irs.gov/pub/irs-soi/eo_il.csv",
        "format": "csv",
    },
    {
        "source_id": "irs-eo-bmf-north-carolina",
        "dataset": "eo_bmf",
        "jurisdiction": "North Carolina",
        "url": "https://www.irs.gov/pub/irs-soi/eo_nc.csv",
        "format": "csv",
    },
    {
        "source_id": "irs-publication-78",
        "dataset": "publication_78",
        "jurisdiction": "United States",
        "url": "https://apps.irs.gov/pub/epostcard/data-download-pub78.zip",
        "format": "zip_delimited",
    },
    {
        "source_id": "irs-form-990n",
        "dataset": "form_990n",
        "jurisdiction": "United States",
        "url": "https://apps.irs.gov/pub/epostcard/data-download-epostcard.zip",
        "format": "zip_delimited",
    },
    {
        "source_id": "irs-auto-revocation",
        "dataset": "auto_revocation",
        "jurisdiction": "United States",
        "url": "https://apps.irs.gov/pub/epostcard/data-download-revocation.zip",
        "format": "zip_delimited",
    },
]

PUBLIC_LOCATION_STATES = {"FL", "IL", "NC"}
NAME_PATTERNS = [
    re.compile(r"\bSCHOOL\s*HOUSE\b", re.IGNORECASE),
    re.compile(r"\bSCHOOLHOUSE\b", re.IGNORECASE),
    re.compile(r"\bSCHOOL\s*HOUSE\s*1776\b", re.IGNORECASE),
    re.compile(r"\bSCHOOLHOUSE\s*1776\b", re.IGNORECASE),
]
DEFAULT_USER_AGENT = (
    "CliffordNumber-SchoolHouse-IRS/1.0 "
    "219768509+BigBirdReturns@users.noreply.github.com"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: Any) -> str:
    text = normalize_space(value).upper().replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return normalize_space(text)


def normalize_ein(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 9 else None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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


def candidate_name(value: Any) -> bool:
    name = normalize_space(value)
    return any(pattern.search(name) for pattern in NAME_PATTERNS)


def find_value(row: dict[str, Any], *keys: str) -> str | None:
    normalized = {re.sub(r"[^a-z0-9]", "", str(key).lower()): value for key, value in row.items()}
    for key in keys:
        value = normalized.get(re.sub(r"[^a-z0-9]", "", key.lower()))
        text = normalize_space(value)
        if text:
            return text
    return None


def sanitized_candidate(source: dict[str, str], row: dict[str, Any], row_number: int) -> dict[str, Any] | None:
    name = find_value(
        row,
        "NAME",
        "ORGANIZATION NAME",
        "TAXPAYER_NAME",
        "TAXPAYER NAME",
        "LEGAL_NAME",
        "BUSINESS_NAME",
    )
    if not name or not candidate_name(name):
        return None
    state = find_value(row, "STATE", "STATE_ABBREVIATION", "US_STATE")
    city = find_value(row, "CITY")
    country = find_value(row, "COUNTRY")
    ein = normalize_ein(find_value(row, "EIN", "EMPLOYER_IDENTIFICATION_NUMBER"))
    return {
        "candidate_id": f"{source['source_id']}:{ein or row_number}",
        "source_id": source["source_id"],
        "dataset": source["dataset"],
        "source_row_number": row_number,
        "ein": ein,
        "legal_name_as_recorded": name,
        "normalized_name": normalize_name(name),
        "city": city,
        "state": state,
        "country": country,
        "public_location_state_match": bool(state and state.upper() in PUBLIC_LOCATION_STATES),
        "subsection": find_value(row, "SUBSECTION", "SUBSECTION_CODE"),
        "ruling_date": find_value(row, "RULING", "RULING_DATE"),
        "organization_status": find_value(row, "STATUS", "ORGANIZATION_STATUS"),
        "deductibility_status": find_value(row, "DEDUCTIBILITY", "DEDUCTIBILITY_STATUS"),
        "tax_period": find_value(row, "TAX_PERIOD", "TAXPERIOD"),
        "filing_type": find_value(row, "FILING_TYPE", "RETURN_TYPE"),
        "filing_date": find_value(row, "FILING_DATE", "SUBMISSION_DATE"),
        "revocation_date": find_value(row, "REVOCATION_DATE", "REVOCATIONDATE"),
        "reinstatement_date": find_value(row, "REINSTATEMENT_DATE", "REINSTATEMENTDATE"),
        "identity_state": "registry_candidate_not_admitted",
        "street_address_retained": False,
        "contact_details_retained": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def sniff_delimiter(sample: str) -> str:
    lines = [line for line in sample.splitlines() if line.strip()][:5]
    joined = "\n".join(lines)
    counts = {delimiter: joined.count(delimiter) for delimiter in ("|", ",", "\t")}
    return max(counts, key=counts.get)


def parse_tabular_bytes(source: dict[str, str], data: bytes) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    members: list[tuple[str, bytes]] = []
    if source["format"] == "csv":
        members.append((Path(urllib.parse.urlparse(source["url"]).path).name, data))
    else:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for name in sorted(archive.namelist()):
                if name.endswith("/"):
                    continue
                body = archive.read(name)
                members.append((name, body))
    candidates: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    for member_name, member_data in members:
        text = decode_text(member_data)
        delimiter = sniff_delimiter(text[:100000])
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        if not reader.fieldnames:
            member_receipts.append(
                {
                    "member": member_name,
                    "bytes": len(member_data),
                    "sha256": sha256_bytes(member_data),
                    "state": "header_unresolved",
                }
            )
            continue
        row_count = 0
        match_count = 0
        for row_number, row in enumerate(reader, start=2):
            row_count += 1
            candidate = sanitized_candidate(source, row, row_number)
            if candidate:
                candidate["source_member"] = member_name
                candidates.append(candidate)
                match_count += 1
        member_receipts.append(
            {
                "member": member_name,
                "bytes": len(member_data),
                "sha256": sha256_bytes(member_data),
                "delimiter": delimiter,
                "fields": reader.fieldnames,
                "row_count": row_count,
                "match_count": match_count,
                "state": "scanned",
            }
        )
    return candidates, {"members": member_receipts}


class Fetcher:
    def __init__(self, user_agent: str, retries: int, sleep_seconds: float) -> None:
        self.user_agent = user_agent
        self.retries = retries
        self.sleep_seconds = sleep_seconds
        self.request_count = 0

    def get(self, url: str, timeout: int = 180) -> tuple[bytes, dict[str, str]]:
        error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "text/csv,application/zip,text/plain,*/*",
                    "Accept-Encoding": "identity",
                    "Connection": "close",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    body = response.read()
                    status = getattr(response, "status", 200)
                    if status != 200:
                        raise RuntimeError(f"HTTP {status}")
                    self.request_count += 1
                    time.sleep(self.sleep_seconds)
                    return body, {key.lower(): value for key, value in response.headers.items()}
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
                error = exc
                delay = min(20.0, 1.5 * (2 ** (attempt - 1)))
                print(
                    f"attempt {attempt}/{self.retries} failed for {url}: {exc}; "
                    f"sleep {delay:.1f}s",
                    file=sys.stderr,
                    flush=True,
                )
                time.sleep(delay)
        raise RuntimeError(f"failed after {self.retries} attempts: {url}: {error}")


def build_manifest(output: Path) -> None:
    rows = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {"artifact-manifest.json", "SHA256SUMS"}:
            continue
        body = file.read_bytes()
        rows.append({"path": file.relative_to(output).as_posix(), "bytes": len(body), "sha256": sha256_bytes(body)})
    write_json(
        output / "artifact-manifest.json",
        {
            "schema_version": "schoolhouse-irs-identity-artifact-manifest@1",
            "generated_at": utc_now(),
            "files": rows,
            "file_count": len(rows),
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(f"{sha256_bytes(file.read_bytes())}  {file.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--sleep-seconds", type=float, default=0.25)
    parser.add_argument("--user-agent", default=os.environ.get("IRS_USER_AGENT", DEFAULT_USER_AGENT))
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()
    fetcher = Fetcher(args.user_agent, args.retries, args.sleep_seconds)
    routes: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    for source in SOURCES:
        route: dict[str, Any] = {
            **source,
            "state": "not_attempted",
            "retrieved_at": utc_now(),
            "raw_source_retained": False,
            "street_address_retained": False,
            "contact_details_retained": False,
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        print(f"acquiring {source['source_id']} {source['url']}", flush=True)
        try:
            body, headers = fetcher.get(source["url"])
            route.update(
                {
                    "state": "captured_and_scanned",
                    "bytes": len(body),
                    "sha256": sha256_bytes(body),
                    "content_type": headers.get("content-type"),
                }
            )
            source_candidates, scan = parse_tabular_bytes(source, body)
            route.update(scan)
            route["candidate_rows"] = len(source_candidates)
            candidates.extend(source_candidates)
        except Exception as exc:
            route["state"] = "source_unavailable_after_search"
            route["error"] = f"{type(exc).__name__}: {exc}"
        routes.append(route)

    exact_key_counts = Counter((row.get("ein"), row.get("normalized_name")) for row in candidates)
    for row in candidates:
        row["cross_dataset_occurrence_count"] = exact_key_counts[(row.get("ein"), row.get("normalized_name"))]

    route_state_counts = Counter(route["state"] for route in routes)
    all_routes_terminal = all(route["state"] == "captured_and_scanned" for route in routes)
    unique_eins = sorted({row["ein"] for row in candidates if row.get("ein")})
    plausible_state_candidates = [row for row in candidates if row.get("public_location_state_match")]
    summary = {
        "schema_version": "schoolhouse-irs-legal-identity-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "request_count": fetcher.request_count,
        "route_count": len(routes),
        "route_state_counts": dict(sorted(route_state_counts.items())),
        "all_routes_terminal": all_routes_terminal,
        "candidate_rows": len(candidates),
        "unique_candidate_eins": len(unique_eins),
        "plausible_public_location_candidate_rows": len(plausible_state_candidates),
        "identity_resolution_state": "candidate_set_requires_cross_source_adjudication" if candidates else "no_candidate_on_declared_surfaces",
        "registry_identity_admitted": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    receipt = {
        "schema_version": "schoolhouse-irs-legal-identity-acquisition-receipt@1",
        "started_at": started_at,
        "completed_at": summary["completed_at"],
        "selection_unit": "every legal-name row matching the frozen School.House phrase battery on the three declared-location EO BMF files and three nationwide IRS status or filing datasets",
        "source_routes": [{"source_id": route["source_id"], "url": route["url"], "state": route["state"], "error": route.get("error")} for route in routes],
        "all_routes_terminal": all_routes_terminal,
        "identity_resolution_state": summary["identity_resolution_state"],
        "registry_identity_admitted": False,
        "authority": {
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "private_support_rows": 0,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    }

    write_jsonl(output / "source-routes.jsonl", routes)
    write_jsonl(output / "identity-candidates.jsonl", candidates)
    write_json(output / "summary.json", summary)
    write_json(output / "acquisition-receipt.json", receipt)
    (output / "README.md").write_text(
        "# School.House IRS legal-identity candidate capture\n\n"
        "This artifact scans official IRS public datasets for registry-name candidates. It retains EIN, legal name, status, city, and state fields but excludes street addresses, contact details, officers, private records, and private messages. A candidate is not an admitted identity.\n",
        encoding="utf-8",
    )
    build_manifest(output)
    print(compact(summary))
    return 0 if all_routes_terminal else 2


if __name__ == "__main__":
    raise SystemExit(main())
