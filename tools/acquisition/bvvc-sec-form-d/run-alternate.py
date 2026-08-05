#!/usr/bin/env python3
"""Acquire the BVVC Form D denominator through alternate official EDGAR routes.

The quarterly flat-file host rejected both documented route families from the
GitHub Actions network. This runner therefore executes three independent public
SEC routes without laundering one failure into an absence claim:

1. EDGAR Full-Text Search for ``BVVC`` restricted to Forms D and D/A.
2. ``data.sec.gov/submissions`` histories for every discovered CIK plus the four
   already receipted BVVC anchor CIKs.
3. Quarterly EDGAR company indexes for issuer-name matches.

It preserves raw source bytes, every route result, filing metadata, explicit
coverage states, and best-effort filing-folder captures. The denominator is
terminal only when a complete search/index route and all anchor submission
histories succeed. No filing is mapped to a portfolio transaction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ANCHOR_CIKS = {
    "0001982744",
    "0001992728",
    "0002050061",
    "0002078836",
}
SEC_CAVEAT = (
    "SEC filing and API data is provided as filed. The SEC may not have reviewed "
    "Form D information for accuracy or completeness, and index or search output "
    "is not a substitute for the complete filing."
)
DEFAULT_USER_AGENT = (
    "CliffordNumber-BVVC-EDGAR/1.0 "
    "219768509+BigBirdReturns@users.noreply.github.com"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_cik(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if not digits:
        return None
    return digits.zfill(10)[-10:]


def normalize_accession(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) != 18:
        return None
    return f"{digits[:10]}-{digits[10:12]}-{digits[12:]}"


def listify(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def extract_total(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, dict) and isinstance(value.get("value"), int):
        return value["value"]
    return None


def date_in_window(value: str | None, start: str, end: str) -> bool:
    return bool(value and start <= value <= end)


class Fetcher:
    def __init__(self, user_agent: str, sleep_seconds: float, retries: int) -> None:
        self.user_agent = user_agent
        self.sleep_seconds = sleep_seconds
        self.retries = retries
        self.request_count = 0

    def get(self, url: str, timeout: int = 120) -> tuple[bytes, dict[str, str]]:
        error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "application/json,text/plain,text/html,*/*",
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


def record_bytes(path: Path, url: str, body: bytes, headers: dict[str, str]) -> dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return {
        "url": url,
        "path": path.as_posix(),
        "bytes": len(body),
        "sha256": sha256_bytes(body),
        "content_type": headers.get("content-type"),
        "state": "captured",
    }


def efts_search(
    output: Path,
    fetcher: Fetcher,
    start_date: str,
    end_date: str,
    page_size: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    route: dict[str, Any] = {
        "route_id": "sec-edgar-full-text-search",
        "authority": "U.S. Securities and Exchange Commission",
        "state": "not_attempted",
        "query": "BVVC",
        "forms": ["D", "D/A"],
        "start_date": start_date,
        "end_date": end_date,
        "pages": [],
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    hits_out: list[dict[str, Any]] = []
    offset = 0
    expected_total: int | None = None
    try:
        while True:
            params = {
                "q": "BVVC",
                "forms": "D,D/A",
                "dateRange": "custom",
                "startdt": start_date,
                "enddt": end_date,
                "from": str(offset),
                "size": str(page_size),
            }
            url = "https://efts.sec.gov/LATEST/search-index?" + urllib.parse.urlencode(params)
            body, headers = fetcher.get(url)
            page_path = output / "raw" / "efts" / f"page-{offset:06d}.json"
            page_receipt = record_bytes(page_path, url, body, headers)
            payload = json.loads(body.decode("utf-8"))
            hits_block = payload.get("hits") if isinstance(payload, dict) else None
            page_hits = hits_block.get("hits", []) if isinstance(hits_block, dict) else []
            total = extract_total(hits_block.get("total")) if isinstance(hits_block, dict) else None
            if expected_total is None:
                expected_total = total
            page_receipt["hit_count"] = len(page_hits)
            page_receipt["reported_total"] = total
            route["pages"].append(page_receipt)
            for hit in page_hits:
                source = hit.get("_source", {}) if isinstance(hit, dict) else {}
                accession = normalize_accession(
                    hit.get("_id") if isinstance(hit, dict) else None
                ) or normalize_accession(source.get("adsh")) or normalize_accession(source.get("accession_number"))
                ciks = sorted(
                    {
                        cik
                        for value in listify(source.get("ciks")) + listify(source.get("cik"))
                        if (cik := normalize_cik(value))
                    }
                )
                display_names = sorted(
                    {
                        normalize_space(value)
                        for value in listify(source.get("display_names"))
                        + listify(source.get("display_name"))
                        + listify(source.get("company_name"))
                        if normalize_space(value)
                    }
                )
                hits_out.append(
                    {
                        "accession_number": accession,
                        "ciks": ciks,
                        "display_names": display_names,
                        "form": normalize_space(source.get("form")),
                        "file_date": normalize_space(source.get("file_date") or source.get("filed_at")) or None,
                        "file_number": normalize_space(source.get("file_num")) or None,
                        "root_forms": listify(source.get("root_forms")),
                        "source_id": hit.get("_id") if isinstance(hit, dict) else None,
                        "raw_source": source,
                        "evidence_class": "official_search_result",
                        "graph_effect": "none",
                        "promotes_to": "candidate_only",
                    }
                )
            offset += len(page_hits)
            if not page_hits:
                break
            if expected_total is not None and offset >= expected_total:
                break
            if len(page_hits) < page_size:
                break
            if offset >= 10000:
                route["truncated_at"] = offset
                break
        route["state"] = "surface_complete" if expected_total is not None and len(hits_out) >= expected_total else "partial"
        route["reported_total"] = expected_total
        route["enumerated_total"] = len(hits_out)
    except Exception as exc:
        route["state"] = "source_unavailable_after_search"
        route["error"] = f"{type(exc).__name__}: {exc}"
    return route, hits_out


def parse_submission_filings(payload: dict[str, Any], source_url: str, start_date: str, end_date: str) -> list[dict[str, Any]]:
    recent = (((payload or {}).get("filings") or {}).get("recent") or {})
    if not isinstance(recent, dict):
        return []
    keys = [
        "accessionNumber", "filingDate", "reportDate", "acceptanceDateTime",
        "act", "form", "fileNumber", "filmNumber", "items", "core_type",
        "size", "isXBRL", "isInlineXBRL", "primaryDocument", "primaryDocDescription",
    ]
    count = max((len(recent.get(key, [])) for key in keys if isinstance(recent.get(key), list)), default=0)
    rows: list[dict[str, Any]] = []
    for index in range(count):
        row = {key: (recent.get(key, [None] * count)[index] if index < len(recent.get(key, [])) else None) for key in keys}
        form = normalize_space(row.get("form"))
        filing_date = normalize_space(row.get("filingDate")) or None
        if form not in {"D", "D/A"} or not date_in_window(filing_date, start_date, end_date):
            continue
        rows.append(
            {
                "accession_number": normalize_accession(row.get("accessionNumber")),
                "filing_date": filing_date,
                "report_date": normalize_space(row.get("reportDate")) or None,
                "acceptance_datetime": normalize_space(row.get("acceptanceDateTime")) or None,
                "form": form,
                "file_number": normalize_space(row.get("fileNumber")) or None,
                "primary_document": normalize_space(row.get("primaryDocument")) or None,
                "primary_document_description": normalize_space(row.get("primaryDocDescription")) or None,
                "size": row.get("size"),
                "source_url": source_url,
                "evidence_class": "official_submission_history",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return rows


def submissions_capture(
    output: Path,
    fetcher: Fetcher,
    ciks: set[str],
    start_date: str,
    end_date: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    routes: list[dict[str, Any]] = []
    filings: list[dict[str, Any]] = []
    for cik in sorted(ciks):
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        route: dict[str, Any] = {
            "route_id": f"sec-submissions-{cik}",
            "cik": cik,
            "url": url,
            "state": "not_attempted",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        try:
            body, headers = fetcher.get(url)
            capture = record_bytes(output / "raw" / "submissions" / f"CIK{cik}.json", url, body, headers)
            payload = json.loads(body.decode("utf-8"))
            route.update(capture)
            route["state"] = "captured"
            route["entity_name"] = normalize_space(payload.get("name")) or None
            route["former_names"] = payload.get("formerNames") or []
            entity_filings = parse_submission_filings(payload, url, start_date, end_date)
            for filing in entity_filings:
                filing["cik"] = cik
                filing["entity_name"] = route["entity_name"]
            filings.extend(entity_filings)
            extra_files = (((payload or {}).get("filings") or {}).get("files") or [])
            route["additional_submission_files"] = extra_files
            for extra in extra_files:
                name = normalize_space(extra.get("name")) if isinstance(extra, dict) else ""
                if not name:
                    continue
                extra_url = f"https://data.sec.gov/submissions/{name}"
                try:
                    extra_body, extra_headers = fetcher.get(extra_url)
                    extra_capture = record_bytes(output / "raw" / "submissions" / name, extra_url, extra_body, extra_headers)
                    extra_payload = json.loads(extra_body.decode("utf-8"))
                    extra_filings = parse_submission_filings({"filings": {"recent": extra_payload}}, extra_url, start_date, end_date)
                    for filing in extra_filings:
                        filing["cik"] = cik
                        filing["entity_name"] = route["entity_name"]
                    filings.extend(extra_filings)
                    route.setdefault("additional_captures", []).append(extra_capture)
                except Exception as exc:
                    route.setdefault("additional_capture_failures", []).append(
                        {"url": extra_url, "error": f"{type(exc).__name__}: {exc}"}
                    )
        except Exception as exc:
            route["state"] = "source_unavailable_after_search"
            route["error"] = f"{type(exc).__name__}: {exc}"
        routes.append(route)
    return routes, filings


def company_index_capture(
    output: Path,
    fetcher: Fetcher,
    start_year: int,
    start_quarter: int,
    end_year: int,
    end_quarter: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    routes: list[dict[str, Any]] = []
    matches: list[dict[str, Any]] = []
    year, quarter = start_year, start_quarter
    while (year, quarter) <= (end_year, end_quarter):
        key = f"{year}Q{quarter}"
        url = f"https://www.sec.gov/Archives/edgar/full-index/{year}/QTR{quarter}/company.idx"
        route: dict[str, Any] = {
            "route_id": f"sec-company-index-{key}",
            "quarter": key,
            "url": url,
            "state": "not_attempted",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        try:
            body, headers = fetcher.get(url)
            capture = record_bytes(output / "raw" / "company-index" / f"{key}.idx", url, body, headers)
            route.update(capture)
            text = body.decode("latin-1", errors="replace")
            quarter_matches = []
            for line_number, line in enumerate(text.splitlines(), start=1):
                if "BVVC" not in line.upper():
                    continue
                row = {
                    "quarter": key,
                    "line_number": line_number,
                    "raw_line": line.rstrip(),
                    "evidence_class": "official_quarterly_index",
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
                quarter_matches.append(row)
                matches.append(row)
            route["state"] = "captured"
            route["match_count"] = len(quarter_matches)
        except Exception as exc:
            route["state"] = "source_unavailable_after_search"
            route["error"] = f"{type(exc).__name__}: {exc}"
        routes.append(route)
        if quarter == 4:
            year, quarter = year + 1, 1
        else:
            quarter += 1
    return routes, matches


def capture_filing_sources(
    output: Path,
    fetcher: Fetcher,
    filings: list[dict[str, Any]],
    max_bytes: int,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for filing in filings:
        cik = normalize_cik(filing.get("cik"))
        accession = normalize_accession(filing.get("accession_number"))
        if not cik or not accession or (cik, accession) in seen:
            continue
        seen.add((cik, accession))
        cik_unpadded = str(int(cik))
        accession_compact = accession.replace("-", "")
        folder = f"https://www.sec.gov/Archives/edgar/data/{cik_unpadded}/{accession_compact}"
        result: dict[str, Any] = {
            "cik": cik,
            "accession_number": accession,
            "state": "not_attempted",
            "folder_url": folder + "/",
            "files": [],
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        destination = output / "raw" / "filings" / accession
        try:
            index_url = folder + "/index.json"
            body, headers = fetcher.get(index_url)
            capture = record_bytes(destination / "index.json", index_url, body, headers)
            result["files"].append(capture)
            payload = json.loads(body.decode("utf-8"))
            item_names = [
                normalize_space(item.get("name"))
                for item in ((((payload or {}).get("directory") or {}).get("item")) or [])
                if isinstance(item, dict) and normalize_space(item.get("name"))
            ]
            primary = normalize_space(filing.get("primary_document"))
            candidates = [name for name in item_names if name.lower().endswith(('.xml', '.txt', '.html', '.htm'))]
            if primary and primary in item_names:
                candidates = [primary] + [name for name in candidates if name != primary]
            for name in candidates[:8]:
                file_url = folder + "/" + name
                try:
                    file_body, file_headers = fetcher.get(file_url)
                    row = {
                        "url": file_url,
                        "name": name,
                        "bytes": len(file_body),
                        "sha256": sha256_bytes(file_body),
                        "content_type": file_headers.get("content-type"),
                    }
                    if len(file_body) <= max_bytes:
                        (destination / Path(name).name).write_bytes(file_body)
                        row["state"] = "captured"
                    else:
                        row["state"] = "hash_only_size_limit"
                    result["files"].append(row)
                except Exception as exc:
                    result["files"].append({"url": file_url, "name": name, "state": "capture_failed", "error": f"{type(exc).__name__}: {exc}"})
            result["state"] = "captured"
        except Exception as exc:
            result["state"] = "source_unavailable_after_search"
            result["error"] = f"{type(exc).__name__}: {exc}"
        results.append(result)
    return results


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
            "schema_version": "bvvc-sec-form-d-alternate-artifact-manifest@1",
            "generated_at": utc_now(),
            "files": rows,
            "file_count": len(rows),
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    checksum_rows = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            checksum_rows.append(f"{sha256_bytes(file.read_bytes())}  {file.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(checksum_rows) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--start-date", default="2019-01-01")
    parser.add_argument("--end-date", default="2026-06-30")
    parser.add_argument("--sleep-seconds", type=float, default=0.35)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--max-source-bytes", type=int, default=5 * 1024 * 1024)
    parser.add_argument("--user-agent", default=os.environ.get("SEC_USER_AGENT", DEFAULT_USER_AGENT))
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()
    fetcher = Fetcher(args.user_agent, args.sleep_seconds, args.retries)

    efts_route, efts_hits = efts_search(output, fetcher, args.start_date, args.end_date, args.page_size)
    discovered_ciks = set(ANCHOR_CIKS)
    for hit in efts_hits:
        discovered_ciks.update(hit.get("ciks") or [])

    submission_routes, submission_filings = submissions_capture(
        output, fetcher, discovered_ciks, args.start_date, args.end_date
    )
    index_routes, index_matches = company_index_capture(output, fetcher, 2019, 1, 2026, 2)

    filing_metadata_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for row in submission_filings:
        cik = normalize_cik(row.get("cik"))
        accession = normalize_accession(row.get("accession_number"))
        if cik and accession:
            filing_metadata_by_key[(cik, accession)] = row
    for hit in efts_hits:
        accession = normalize_accession(hit.get("accession_number"))
        for cik in hit.get("ciks") or []:
            if accession:
                filing_metadata_by_key.setdefault(
                    (cik, accession),
                    {
                        "cik": cik,
                        "accession_number": accession,
                        "filing_date": hit.get("file_date"),
                        "form": hit.get("form"),
                        "primary_document": None,
                        "entity_name": (hit.get("display_names") or [None])[0],
                        "evidence_class": "official_search_result",
                        "graph_effect": "none",
                        "promotes_to": "candidate_only",
                    },
                )

    filing_metadata = sorted(filing_metadata_by_key.values(), key=lambda row: (row.get("filing_date") or "", row.get("cik") or "", row.get("accession_number") or ""))
    filing_captures = capture_filing_sources(output, fetcher, filing_metadata, args.max_source_bytes)

    anchor_submission_success = {
        route["cik"] for route in submission_routes
        if route["cik"] in ANCHOR_CIKS and route["state"] == "captured"
    }
    all_anchor_submissions = anchor_submission_success == ANCHOR_CIKS
    index_success_count = sum(route["state"] == "captured" for route in index_routes)
    efts_complete = efts_route.get("state") == "surface_complete"
    index_complete = index_success_count == len(index_routes)
    denominator_terminal = all_anchor_submissions and (efts_complete or index_complete)

    routes = [efts_route, *submission_routes, *index_routes]
    summary = {
        "schema_version": "bvvc-sec-form-d-alternate-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "coverage_window": {"start": args.start_date, "end": args.end_date},
        "request_count": fetcher.request_count,
        "efts_state": efts_route.get("state"),
        "efts_reported_total": efts_route.get("reported_total"),
        "efts_enumerated_total": len(efts_hits),
        "submission_routes_total": len(submission_routes),
        "submission_routes_captured": sum(route["state"] == "captured" for route in submission_routes),
        "anchor_ciks_expected": sorted(ANCHOR_CIKS),
        "anchor_ciks_captured": sorted(anchor_submission_success),
        "all_anchor_submissions_captured": all_anchor_submissions,
        "company_index_routes_total": len(index_routes),
        "company_index_routes_captured": index_success_count,
        "company_index_match_rows": len(index_matches),
        "filing_metadata_rows": len(filing_metadata),
        "filing_capture_state_counts": dict(sorted(Counter(row["state"] for row in filing_captures).items())),
        "denominator_terminal": denominator_terminal,
        "portfolio_transaction_joins_created": 0,
        "ownership_findings": 0,
        "governance_right_findings": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "sec_caveat": SEC_CAVEAT,
    }
    receipt = {
        "schema_version": "bvvc-sec-form-d-alternate-acquisition-receipt@1",
        "started_at": started_at,
        "completed_at": summary["completed_at"],
        "selection_unit": "every BVVC full-text Form D/D-A result, every Form D/D-A in discovered filer histories, and every BVVC issuer-name row in the complete declared quarterly company-index window",
        "route_states": [{"route_id": row["route_id"], "state": row["state"], "error": row.get("error")} for row in routes],
        "denominator_terminal": denominator_terminal,
        "authority": {
            "portfolio_transaction_join_state": "not_established",
            "private_support_rows": 0,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
        "sec_caveat": SEC_CAVEAT,
    }

    write_jsonl(output / "efts-hits.jsonl", efts_hits)
    write_jsonl(output / "submission-routes.jsonl", submission_routes)
    write_jsonl(output / "submission-form-d-filings.jsonl", submission_filings)
    write_jsonl(output / "company-index-routes.jsonl", index_routes)
    write_jsonl(output / "company-index-bvvc-matches.jsonl", index_matches)
    write_jsonl(output / "filing-metadata.jsonl", filing_metadata)
    write_jsonl(output / "filing-captures.jsonl", filing_captures)
    write_json(output / "summary.json", summary)
    write_json(output / "acquisition-receipt.json", receipt)
    (output / "README.md").write_text(
        "# BVVC SEC Form D alternate-route capture\n\n"
        "This artifact preserves EDGAR full-text search, submissions API, quarterly company-index, and filing-folder route results separately. A failed route is not a no-match. A filing is not a portfolio transaction.\n",
        encoding="utf-8",
    )
    build_manifest(output)
    print(compact(summary))
    return 0 if denominator_terminal else 2


if __name__ == "__main__":
    raise SystemExit(main())
