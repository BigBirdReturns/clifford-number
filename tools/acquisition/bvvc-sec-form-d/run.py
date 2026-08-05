#!/usr/bin/env python3
"""Acquire the complete bounded SEC Form D denominator for BVVC-branded filings.

This program scans every official quarterly Form D data set in a declared date
range. It searches every field in all six SEC tables for a case-insensitive
``BVVC`` token, preserves every matching accession and all rows attached to it,
classifies exact BVVC-branded issuers separately from name collisions, captures
the corresponding EDGAR filing-folder index and XML bytes, and emits explicit
no-match rows for a frozen exact-name battery.

The acquisition is discovery-only. It creates no graph edge, portfolio-company
join, ownership conclusion, or finding. Form D data remains as filed and carries
the SEC's accuracy and completeness caveat.
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
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SEC_DATA_PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets"
SEC_DOCS = "https://www.sec.gov/files/Form_D.pdf"
SEC_ZIP_PATTERN = (
    "https://www.sec.gov/files/datastandardsinnovation/data/"
    "form-d-data-sets/{year}q{quarter}_d.zip"
)
SEC_ARCHIVES = "https://www.sec.gov/Archives/edgar/data"
TABLES = (
    "FORMDSUBMISSION",
    "ISSUERS",
    "OFFERING",
    "RECIPIENTS",
    "RELATEDPERSONS",
    "SIGNATURES",
)
SEC_CAVEAT = (
    "The SEC states that Form D data is derived from as-filed registrant "
    "submissions, may contain inaccuracies or extraction errors, does not "
    "reflect all available filing information, and is not a substitute for "
    "the complete filing."
)
DEFAULT_USER_AGENT = (
    "CliffordNumber-BVVC-FormD/1.0 "
    "(public-interest research; contact https://github.com/BigBirdReturns/clifford-number)"
)
EXPECTED_ANCHOR_CIKS = {
    "0001982744",  # BVVC Fund I, LP
    "0001992728",  # BVVC SPV I, LLC
    "0002050061",  # BVVC SPV IX, LLC
    "0002078836",  # BVVC SPV X, LLC
}

csv.field_size_limit(32 * 1024 * 1024)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact_json(row) + "\n")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: Any) -> str:
    text = normalize_space(value).upper()
    text = text.replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return normalize_space(text)


def clean_row(row: dict[str, Any]) -> dict[str, str]:
    return {str(key).strip(): normalize_space(value) for key, value in row.items() if key is not None}


def row_contains_token(row: dict[str, str], token: str) -> bool:
    needle = token.upper()
    return any(needle in value.upper() for value in row.values())


def quarter_key(year: int, quarter: int) -> str:
    return f"{year}Q{quarter}"


def parse_quarter(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(20\d{2})Q([1-4])", value.upper())
    if not match:
        raise argparse.ArgumentTypeError(f"invalid quarter {value!r}; expected YYYYQ1..YYYYQ4")
    return int(match.group(1)), int(match.group(2))


def iter_quarters(start: str, end: str) -> list[tuple[int, int]]:
    start_y, start_q = parse_quarter(start)
    end_y, end_q = parse_quarter(end)
    if (start_y, start_q) > (end_y, end_q):
        raise ValueError("start quarter is after end quarter")
    result: list[tuple[int, int]] = []
    year, quarter = start_y, start_q
    while (year, quarter) <= (end_y, end_q):
        result.append((year, quarter))
        if quarter == 4:
            year, quarter = year + 1, 1
        else:
            quarter += 1
    return result


def roman(number: int) -> str:
    values = (
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
    )
    out: list[str] = []
    remaining = number
    for value, symbol in values:
        while remaining >= value:
            out.append(symbol)
            remaining -= value
    return "".join(out)


def exact_name_battery() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    def add(family: str, label: str) -> None:
        rows.append({"family": family, "query_label": label})

    for index in range(1, 6):
        numeral = roman(index)
        add("fund", f"BVVC Fund {numeral}, LP")
        add("fund_gp", f"BVVC Fund {numeral} GP, LLC")
        add("sidecar", f"BVVC Sidecar {numeral}, LP")
        add("parallel", f"BVVC Parallel {numeral}, LP")
    for index in range(1, 21):
        add("spv", f"BVVC SPV {roman(index)}, LLC")
    for index in range(1, 4):
        add("opportunity_fund", f"BVVC Opportunity Fund {roman(index)}, LP")
        add("continuation_fund", f"BVVC Continuation Fund {roman(index)}, LP")
    for label in (
        "BVVC Management, LLC",
        "BVVC SPV Management, LLC",
        "BVVC GP, LLC",
        "BVVC Capital, LLC",
        "BVVC Advisors, LLC",
        "BVVC Co-Invest, LLC",
        "BVVC Feeder, LP",
    ):
        add("management_or_other_vehicle", label)
    return rows


class Fetcher:
    def __init__(self, user_agent: str, sleep_seconds: float, retries: int) -> None:
        self.user_agent = user_agent
        self.sleep_seconds = sleep_seconds
        self.retries = retries
        self.request_count = 0

    def get(self, url: str, timeout: int = 180) -> tuple[bytes, dict[str, str]]:
        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "*/*",
                    "Accept-Encoding": "identity",
                    "Connection": "close",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    data = response.read()
                    headers = {key.lower(): value for key, value in response.headers.items()}
                    status = getattr(response, "status", 200)
                    if status != 200:
                        raise RuntimeError(f"HTTP {status} for {url}")
                    self.request_count += 1
                    time.sleep(self.sleep_seconds)
                    return data, headers
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = exc
                retry_after = 0.0
                if isinstance(exc, urllib.error.HTTPError):
                    raw = exc.headers.get("Retry-After") if exc.headers else None
                    if raw and raw.isdigit():
                        retry_after = float(raw)
                delay = max(retry_after, min(30.0, 1.5 * (2 ** (attempt - 1))))
                print(
                    f"fetch attempt {attempt}/{self.retries} failed for {url}: {exc}; "
                    f"sleeping {delay:.1f}s",
                    file=sys.stderr,
                    flush=True,
                )
                time.sleep(delay)
        raise RuntimeError(f"failed after {self.retries} attempts: {url}: {last_error}")


def find_table_member(names: list[str], table: str) -> str | None:
    candidates = []
    for name in names:
        base = Path(name).name.upper()
        if base in {f"{table}.TSV", f"{table}.TXT"}:
            candidates.append(name)
    return sorted(candidates)[0] if candidates else None


def iter_table_rows(archive: zipfile.ZipFile, member: str) -> Iterable[dict[str, str]]:
    with archive.open(member, "r") as raw:
        with io.TextIOWrapper(raw, encoding="utf-8-sig", errors="replace", newline="") as text:
            reader = csv.DictReader(text, delimiter="\t")
            if not reader.fieldnames:
                raise RuntimeError(f"table {member} has no header")
            for row in reader:
                yield clean_row(row)


def direct_bvvc_values(table_rows: Iterable[dict[str, str]], token: str) -> list[str]:
    needle = token.upper()
    values: set[str] = set()
    for row in table_rows:
        for value in row.values():
            value = normalize_space(value)
            if needle in value.upper():
                values.add(value)
    return sorted(values, key=lambda item: (normalize_name(item), item))


def accession_sort_key(value: str) -> tuple[int, ...]:
    digits = re.sub(r"\D", "", value)
    return tuple(int(digits[index:index + 2]) for index in range(0, len(digits), 2))


def classify_accession(issuer_names: list[str], token: str) -> str:
    normalized = [normalize_name(name) for name in issuer_names]
    token_norm = normalize_name(token)
    if any(name == token_norm or name.startswith(token_norm + " ") for name in normalized):
        return "bvvc_branded_issuer_candidate"
    if any(token_norm in name for name in normalized):
        return "name_collision_or_embedded_token"
    return "token_match_outside_issuer_name"


def capture_filing_sources(
    output_dir: Path,
    fetcher: Fetcher,
    submission: dict[str, Any],
    max_source_bytes: int,
) -> dict[str, Any]:
    accession = submission["accession_number"]
    ciks = submission["ciks"]
    result: dict[str, Any] = {
        "accession_number": accession,
        "ciks": ciks,
        "capture_state": "not_attempted",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "files": [],
    }
    if not ciks:
        result["capture_state"] = "unavailable_missing_cik"
        return result

    cik = str(int(ciks[0]))
    accession_compact = accession.replace("-", "")
    folder_url = f"{SEC_ARCHIVES}/{cik}/{accession_compact}"
    index_url = f"{folder_url}/index.json"
    result["folder_url"] = folder_url + "/"
    result["index_url"] = index_url
    destination = output_dir / "filing-sources" / accession
    destination.mkdir(parents=True, exist_ok=True)

    try:
        index_bytes, index_headers = fetcher.get(index_url)
        index_path = destination / "index.json"
        index_path.write_bytes(index_bytes)
        index_json = json.loads(index_bytes.decode("utf-8"))
        result["files"].append(
            {
                "name": "index.json",
                "url": index_url,
                "bytes": len(index_bytes),
                "sha256": sha256_bytes(index_bytes),
                "content_type": index_headers.get("content-type"),
                "capture_state": "captured",
            }
        )
    except Exception as exc:  # acquisition result, retained as a terminal state
        result["capture_state"] = "index_capture_failed"
        result["error"] = f"{type(exc).__name__}: {exc}"
        return result

    items = (((index_json or {}).get("directory") or {}).get("item") or [])
    xml_names = sorted(
        {
            normalize_space(item.get("name"))
            for item in items
            if isinstance(item, dict) and normalize_space(item.get("name")).lower().endswith(".xml")
        }
    )
    result["index_xml_candidates"] = xml_names
    for name in xml_names:
        safe_name = Path(name).name
        file_url = f"{folder_url}/{name}"
        try:
            body, headers = fetcher.get(file_url)
            row = {
                "name": name,
                "url": file_url,
                "bytes": len(body),
                "sha256": sha256_bytes(body),
                "content_type": headers.get("content-type"),
            }
            if len(body) <= max_source_bytes:
                (destination / safe_name).write_bytes(body)
                row["capture_state"] = "captured"
            else:
                row["capture_state"] = "hash_only_size_limit"
            result["files"].append(row)
        except Exception as exc:
            result["files"].append(
                {
                    "name": name,
                    "url": file_url,
                    "capture_state": "capture_failed",
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )
    captured_xml = [row for row in result["files"] if row["name"].lower().endswith(".xml") and row.get("capture_state") == "captured"]
    result["capture_state"] = "captured" if captured_xml else "index_only_no_xml_captured"
    return result


def build_artifact_manifest(output_dir: Path) -> None:
    entries = []
    for path in sorted(output_dir.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(output_dir).as_posix()
        if relative in {"artifact-manifest.json", "SHA256SUMS"}:
            continue
        data = path.read_bytes()
        entries.append({"path": relative, "bytes": len(data), "sha256": sha256_bytes(data)})
    write_json(
        output_dir / "artifact-manifest.json",
        {
            "schema_version": "bvvc-sec-form-d-artifact-manifest@1",
            "generated_at": utc_now(),
            "files": entries,
            "file_count": len(entries),
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines = []
    for path in sorted(output_dir.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            relative = path.relative_to(output_dir).as_posix()
            lines.append(f"{sha256_bytes(path.read_bytes())}  {relative}")
    (output_dir / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--start", default="2019Q1")
    parser.add_argument("--end", default="2026Q2")
    parser.add_argument("--token", default="BVVC")
    parser.add_argument("--sleep-seconds", type=float, default=0.35)
    parser.add_argument("--retries", type=int, default=6)
    parser.add_argument("--max-source-bytes", type=int, default=5 * 1024 * 1024)
    parser.add_argument("--user-agent", default=os.environ.get("SEC_USER_AGENT", DEFAULT_USER_AGENT))
    parser.add_argument("--keep-zips", action="store_true")
    args = parser.parse_args()

    quarters = iter_quarters(args.start, args.end)
    output_dir: Path = args.output.resolve()
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)
    zip_dir = output_dir / "quarterly-zips"
    if args.keep_zips:
        zip_dir.mkdir(parents=True)

    started_at = utc_now()
    fetcher = Fetcher(args.user_agent, args.sleep_seconds, args.retries)
    quarter_results: list[dict[str, Any]] = []
    direct_matches: list[dict[str, Any]] = []
    matched_rows: list[dict[str, Any]] = []
    accession_quarters: dict[str, set[str]] = defaultdict(set)
    accession_direct_tables: dict[str, set[str]] = defaultdict(set)
    failures: list[dict[str, str]] = []

    for year, quarter in quarters:
        key = quarter_key(year, quarter)
        url = SEC_ZIP_PATTERN.format(year=year, quarter=quarter)
        print(f"[{key}] acquiring {url}", flush=True)
        quarter_record: dict[str, Any] = {
            "quarter": key,
            "url": url,
            "state": "not_attempted",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        try:
            zip_bytes, headers = fetcher.get(url)
            quarter_record.update(
                {
                    "state": "acquired",
                    "bytes": len(zip_bytes),
                    "sha256": sha256_bytes(zip_bytes),
                    "content_type": headers.get("content-type"),
                }
            )
            if args.keep_zips:
                (zip_dir / f"{year}q{quarter}_d.zip").write_bytes(zip_bytes)
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
                names = archive.namelist()
                members = {table: find_table_member(names, table) for table in TABLES}
                missing = [table for table, member in members.items() if member is None]
                if missing:
                    raise RuntimeError(f"quarter {key} missing required tables: {missing}")
                quarter_record["members"] = [
                    {
                        "table": table,
                        "member": members[table],
                        "uncompressed_bytes": archive.getinfo(members[table]).file_size,
                    }
                    for table in TABLES
                ]

                quarter_accessions: set[str] = set()
                for table in TABLES:
                    member = members[table]
                    assert member is not None
                    for row_number, row in enumerate(iter_table_rows(archive, member), start=2):
                        if not row_contains_token(row, args.token):
                            continue
                        accession = normalize_space(row.get("ACCESSIONNUMBER"))
                        direct_matches.append(
                            {
                                "quarter": key,
                                "table": table,
                                "row_number": row_number,
                                "accession_number": accession or None,
                                "matched_values": [
                                    value for value in sorted(set(row.values()))
                                    if args.token.upper() in value.upper()
                                ],
                                "row": row,
                                "graph_effect": "none",
                                "promotes_to": "candidate_only",
                            }
                        )
                        if accession:
                            quarter_accessions.add(accession)
                            accession_quarters[accession].add(key)
                            accession_direct_tables[accession].add(table)

                for table in TABLES:
                    member = members[table]
                    assert member is not None
                    for row_number, row in enumerate(iter_table_rows(archive, member), start=2):
                        accession = normalize_space(row.get("ACCESSIONNUMBER"))
                        if accession not in quarter_accessions:
                            continue
                        matched_rows.append(
                            {
                                "quarter": key,
                                "table": table,
                                "row_number": row_number,
                                "accession_number": accession,
                                "row": row,
                                "graph_effect": "none",
                                "promotes_to": "candidate_only",
                            }
                        )
                quarter_record["direct_match_rows"] = sum(1 for row in direct_matches if row["quarter"] == key)
                quarter_record["matched_accessions"] = sorted(quarter_accessions, key=accession_sort_key)
        except Exception as exc:
            quarter_record["state"] = "acquisition_failed"
            quarter_record["error"] = f"{type(exc).__name__}: {exc}"
            failures.append({"quarter": key, "url": url, "error": quarter_record["error"]})
            print(f"[{key}] FAILED: {quarter_record['error']}", file=sys.stderr, flush=True)
        quarter_results.append(quarter_record)

    rows_by_accession: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in matched_rows:
        rows_by_accession[record["accession_number"]].append(record)

    submissions: list[dict[str, Any]] = []
    for accession in sorted(rows_by_accession, key=accession_sort_key):
        records = rows_by_accession[accession]
        issuers = [record["row"] for record in records if record["table"] == "ISSUERS"]
        submissions_table = [record["row"] for record in records if record["table"] == "FORMDSUBMISSION"]
        offerings = [record["row"] for record in records if record["table"] == "OFFERING"]
        issuer_names = sorted({normalize_space(row.get("ENTITYNAME")) for row in issuers if normalize_space(row.get("ENTITYNAME"))})
        ciks = sorted({normalize_space(row.get("CIK")).zfill(10) for row in issuers if normalize_space(row.get("CIK"))})
        filing_dates = sorted({normalize_space(row.get("FILING_DATE")) for row in submissions_table if normalize_space(row.get("FILING_DATE"))})
        previous_accessions = sorted({normalize_space(row.get("PREVIOUSACCESSIONNUMBER")) for row in offerings if normalize_space(row.get("PREVIOUSACCESSIONNUMBER"))})
        counts = Counter(record["table"] for record in records)
        submissions.append(
            {
                "accession_number": accession,
                "quarters": sorted(accession_quarters[accession]),
                "direct_match_tables": sorted(accession_direct_tables[accession]),
                "classification": classify_accession(issuer_names, args.token),
                "issuer_names": issuer_names,
                "ciks": ciks,
                "filing_dates": filing_dates,
                "previous_accession_numbers": previous_accessions,
                "row_counts_by_table": {table: counts.get(table, 0) for table in TABLES},
                "sec_caveat": SEC_CAVEAT,
                "portfolio_transaction_join_state": "not_established",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    all_direct_values = direct_bvvc_values((record["row"] for record in direct_matches), args.token)
    issuer_accessions_by_name: dict[str, set[str]] = defaultdict(set)
    direct_accessions_by_value: dict[str, set[str]] = defaultdict(set)
    for submission in submissions:
        for name in submission["issuer_names"]:
            issuer_accessions_by_name[normalize_name(name)].add(submission["accession_number"])
    for record in direct_matches:
        accession = record.get("accession_number")
        for value in record["matched_values"]:
            if accession:
                direct_accessions_by_value[normalize_name(value)].add(accession)

    query_matrix: list[dict[str, Any]] = []
    battery_normalized: set[str] = set()
    for query in exact_name_battery():
        label = query["query_label"]
        normalized = normalize_name(label)
        battery_normalized.add(normalized)
        issuer_hits = sorted(issuer_accessions_by_name.get(normalized, set()), key=accession_sort_key)
        filed_value_hits = sorted(direct_accessions_by_value.get(normalized, set()), key=accession_sort_key)
        if issuer_hits:
            state = "exact_issuer_match_observed"
        elif filed_value_hits:
            state = "exact_filed_value_match_observed"
        else:
            state = "no_exact_match_in_complete_declared_form_d_quarterly_dataset"
        query_matrix.append(
            {
                **query,
                "normalized_query": normalized,
                "state": state,
                "issuer_accessions": issuer_hits,
                "filed_value_accessions": filed_value_hits,
                "coverage_window": f"{args.start}/{args.end}",
                "scope_caveat": "This disposition is limited to the official quarterly Form D data sets in the declared window; it is not proof that no legal entity or private vehicle exists elsewhere.",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    for name, accessions in sorted(issuer_accessions_by_name.items()):
        if name in battery_normalized:
            continue
        display_names = sorted(
            {
                issuer_name
                for submission in submissions
                if submission["accession_number"] in accessions
                for issuer_name in submission["issuer_names"]
                if normalize_name(issuer_name) == name
            }
        )
        query_matrix.append(
            {
                "family": "observed_unplanned_issuer_name",
                "query_label": display_names[0] if display_names else name,
                "normalized_query": name,
                "state": "exact_issuer_match_observed_outside_frozen_variant_battery",
                "issuer_accessions": sorted(accessions, key=accession_sort_key),
                "filed_value_accessions": [],
                "coverage_window": f"{args.start}/{args.end}",
                "scope_caveat": "Observed directly in the official Form D quarterly data; legal and transaction interpretation remains filing-specific.",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    filing_captures = []
    for submission in submissions:
        print(f"capturing filing folder {submission['accession_number']}", flush=True)
        filing_captures.append(
            capture_filing_sources(output_dir, fetcher, submission, args.max_source_bytes)
        )

    acquired_quarters = [row for row in quarter_results if row["state"] == "acquired"]
    observed_ciks = {
        cik for submission in submissions
        for cik in submission["ciks"]
        if submission["classification"] == "bvvc_branded_issuer_candidate"
    }
    missing_anchor_ciks = sorted(EXPECTED_ANCHOR_CIKS - observed_ciks)
    classification_counts = Counter(row["classification"] for row in submissions)
    query_state_counts = Counter(row["state"] for row in query_matrix)
    capture_state_counts = Counter(row["capture_state"] for row in filing_captures)

    dataset_coverage = {
        "schema_version": "bvvc-sec-form-d-dataset-coverage@1",
        "generated_at": utc_now(),
        "source_page": SEC_DATA_PAGE,
        "documentation": SEC_DOCS,
        "zip_url_pattern": SEC_ZIP_PATTERN,
        "coverage_window": {"start": args.start, "end": args.end},
        "quarters_expected": len(quarters),
        "quarters_acquired": len(acquired_quarters),
        "quarters_failed": len(failures),
        "quarter_rows": quarter_results,
        "failures": failures,
        "sec_caveat": SEC_CAVEAT,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    summary = {
        "schema_version": "bvvc-sec-form-d-acquisition-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "token": args.token,
        "coverage_window": f"{args.start}/{args.end}",
        "request_count": fetcher.request_count,
        "quarters_expected": len(quarters),
        "quarters_acquired": len(acquired_quarters),
        "quarters_failed": len(failures),
        "direct_match_rows": len(direct_matches),
        "matched_table_rows": len(matched_rows),
        "matched_accessions": len(submissions),
        "classification_counts": dict(sorted(classification_counts.items())),
        "direct_bvvc_values": all_direct_values,
        "query_matrix_rows": len(query_matrix),
        "query_state_counts": dict(sorted(query_state_counts.items())),
        "filing_capture_state_counts": dict(sorted(capture_state_counts.items())),
        "expected_anchor_ciks": sorted(EXPECTED_ANCHOR_CIKS),
        "observed_bvvc_branded_ciks": sorted(observed_ciks),
        "missing_expected_anchor_ciks": missing_anchor_ciks,
        "private_support_rows": 0,
        "portfolio_transaction_joins_created": 0,
        "public_graph_rows_created": 0,
        "outside_human_dependency": False,
        "promotes_to": "candidate_only",
        "graph_effect": "none",
        "sec_caveat": SEC_CAVEAT,
    }
    receipt = {
        "schema_version": "bvvc-sec-form-d-acquisition-receipt@1",
        "started_at": started_at,
        "completed_at": summary["completed_at"],
        "command": {
            "start": args.start,
            "end": args.end,
            "token": args.token,
            "sleep_seconds": args.sleep_seconds,
            "retries": args.retries,
            "max_source_bytes": args.max_source_bytes,
        },
        "user_agent": args.user_agent,
        "official_sources": [SEC_DATA_PAGE, SEC_DOCS],
        "terminal": len(failures) == 0 and not missing_anchor_ciks,
        "failure_reasons": [
            *(f"quarter_acquisition_failed:{row['quarter']}" for row in failures),
            *(f"expected_anchor_cik_missing:{cik}" for cik in missing_anchor_ciks),
        ],
        "authority": {
            "selection_unit": "every row containing BVVC in every field of all six official Form D tables for every quarter in the declared window",
            "portfolio_transaction_join_state": "not_established",
            "outside_human_dependency": False,
            "private_support_rows": 0,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
        "sec_caveat": SEC_CAVEAT,
    }

    write_json(output_dir / "dataset-coverage.json", dataset_coverage)
    write_jsonl(output_dir / "direct-matches.jsonl", sorted(direct_matches, key=lambda row: (row["quarter"], row["table"], row["row_number"])))
    write_jsonl(output_dir / "matched-table-rows.jsonl", sorted(matched_rows, key=lambda row: (accession_sort_key(row["accession_number"]), row["table"], row["row_number"])))
    write_jsonl(output_dir / "matched-submissions.jsonl", submissions)
    write_jsonl(output_dir / "exact-name-query-matrix.jsonl", query_matrix)
    write_jsonl(output_dir / "filing-captures.jsonl", filing_captures)
    write_json(output_dir / "summary.json", summary)
    write_json(output_dir / "acquisition-receipt.json", receipt)
    (output_dir / "README.md").write_text(
        "# BVVC SEC Form D denominator capture\n\n"
        f"Coverage: `{args.start}` through `{args.end}` across all six official quarterly Form D tables.\n\n"
        f"Matched accessions: **{len(submissions)}**. BVVC-branded issuer candidates: "
        f"**{classification_counts.get('bvvc_branded_issuer_candidate', 0)}**. "
        f"Name collisions or embedded-token issuer names: "
        f"**{classification_counts.get('name_collision_or_embedded_token', 0)}**.\n\n"
        "Every output is candidate-only and graph-inert. A Form D filing does not establish a portfolio-company transaction, current ownership, governance rights, operating control, or technical performance.\n",
        encoding="utf-8",
    )
    build_artifact_manifest(output_dir)

    print(compact_json(summary), flush=True)
    if failures or missing_anchor_ciks:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
