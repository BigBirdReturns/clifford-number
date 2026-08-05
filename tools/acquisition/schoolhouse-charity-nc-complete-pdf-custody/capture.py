#!/usr/bin/env python3
"""Capture complete-hash custody and privacy-minimized content fields for 15 fixed NC PDFs.

This execution-only runner reads the exact fifteen PDF routes frozen in the merged
School.House final-static-residual custody product. It issues at most one GET per
route, follows only HTTPS redirects within the North Carolina Secretary of State
host family, hashes each complete response when it fits the declared ceiling,
extracts only aggregate term counts and PDF mechanics, and discards all response
bytes and extracted text before the artifact is written.

It never submits an organization name, license number, interactive search, form,
account, payment, upload, contact request, or private material.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = "schoolhouse-charity-nc-complete-pdf-custody@1"
USER_AGENT = "CliffordNumber-SchoolHouse-CompletePdfCustody/1.0"
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_WORKERS = 3
ALLOWED_HOSTS = {"sosnc.gov", "www.sosnc.gov"}
SUBJECT_TERMS = {
    "school_dot_house": r"\bschool\s*\.\s*house\b",
    "schoolhouse": r"\bschoolhouse\b",
    "bravo_victor": r"\bbravo\s+victor\b",
    "bvvc": r"\bbvvc\b",
}
FIELD_TERMS = {
    "employer_identification_number": r"\bemployer\s+identification\s+number\b",
    "ein": r"\bein\b",
    "501c3": r"\b501\s*\(\s*c\s*\)\s*\(\s*3\s*\)\b",
    "tax_exempt": r"\btax[-\s]+exempt\b",
    "fiscal_sponsor": r"\bfiscal\s+sponsor(?:ship)?\b",
    "officer": r"\bofficers?\b",
    "director": r"\bdirectors?\b",
    "board": r"\bboard\b",
    "governance": r"\bgovernance\b",
    "grant": r"\bgrants?\b",
    "funding": r"\bfunding\b",
    "related_party": r"\brelated[-\s]+part(?:y|ies)\b",
    "annual_report": r"\bannual\s+reports?\b",
    "charitable_solicitation": r"\bcharitable\s+solicitation\b",
    "registration": r"\bregistration\b",
    "license": r"\blicen[cs](?:e|ing|ed|es)\b",
    "campaign_notice": r"\bcampaign\s+notice\b",
}
ALL_PATTERNS = {
    **{f"subject:{key}": re.compile(value, re.IGNORECASE) for key, value in SUBJECT_TERMS.items()},
    **{f"field:{key}": re.compile(value, re.IGNORECASE) for key, value in FIELD_TERMS.items()},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"{path}:{index}: {exc}") from exc
        if not isinstance(row, dict):
            raise RuntimeError(f"{path}:{index}: expected object")
        rows.append(row)
    return rows


def allowed_url(url: str) -> bool:
    parsed = urllib.parse.urlsplit(url)
    return parsed.scheme.lower() == "https" and (parsed.hostname or "").lower() in ALLOWED_HOSTS


class StrictRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        absolute = urllib.parse.urljoin(req.full_url, newurl)
        if not allowed_url(absolute):
            raise urllib.error.URLError(f"redirect outside allowed HTTPS host family: {absolute}")
        return super().redirect_request(req, fp, code, msg, headers, absolute)


def expected_total(row: dict[str, Any]) -> int | None:
    content_range = str(row.get("content_range_header") or "")
    match = re.search(r"/(\d+)\s*$", content_range)
    if match:
        return int(match.group(1))
    value = str(row.get("content_length_header") or "")
    return int(value) if value.isdigit() else None


def classify_document(url: str) -> str:
    lower = urllib.parse.unquote(urllib.parse.urlsplit(url).path).lower()
    name = Path(lower).name
    if "layout" in name:
        return "registry_data_layout_reference"
    if "/manual/" in lower or name in {"business_registration.pdf", "charities.pdf", "data_subscriptions.pdf"}:
        return "official_program_manual"
    if "donor_checklist" in name:
        return "donor_guidance"
    if "solicitation_campaign_notice" in name:
        return "charitable_solicitation_filing_form"
    if name in {"bondri_1.pdf", "cslsolnotary.pdf", "cslnotaryfrc_2.pdf"}:
        return "charity_registration_or_bond_form"
    if "ncsos_nass_campaign" in name:
        return "charity_campaign_guidance"
    return "official_public_pdf"


def parse_pdfinfo(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        ["pdfinfo", str(path)],
        check=False,
        capture_output=True,
        text=True,
        timeout=120,
    )
    info: dict[str, Any] = {
        "pdfinfo_state": "success" if completed.returncode == 0 else "error",
        "pdfinfo_returncode": completed.returncode,
        "page_count": None,
        "encrypted": None,
    }
    if completed.returncode != 0:
        info["pdfinfo_error_sha256"] = hashlib.sha256(completed.stderr.encode("utf-8", errors="replace")).hexdigest()
        return info
    for line in completed.stdout.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip().lower()
        value = value.strip()
        if key == "pages" and value.isdigit():
            info["page_count"] = int(value)
        elif key == "encrypted":
            info["encrypted"] = value.lower().startswith("yes")
    return info


def extract_term_counts(pdf_path: Path, workdir: Path) -> dict[str, Any]:
    text_path = workdir / "extracted.txt"
    completed = subprocess.run(
        ["pdftotext", "-q", "-layout", "-nopgbrk", str(pdf_path), str(text_path)],
        check=False,
        capture_output=True,
        timeout=300,
    )
    result: dict[str, Any] = {
        "text_extraction_state": "success" if completed.returncode == 0 and text_path.exists() else "error",
        "text_extraction_returncode": completed.returncode,
        "extracted_text_chars": 0,
        "term_counts": {key: 0 for key in ALL_PATTERNS},
        "subject_term_hits": 0,
        "field_term_hits": 0,
        "subject_term_hit": False,
    }
    if result["text_extraction_state"] != "success":
        result["text_extraction_error_sha256"] = hashlib.sha256(completed.stderr).hexdigest()
        return result
    text = text_path.read_text(encoding="utf-8", errors="replace")
    normalized = unicodedata.normalize("NFKC", text)
    result["extracted_text_chars"] = len(normalized)
    counts: dict[str, int] = {}
    for key, pattern in ALL_PATTERNS.items():
        counts[key] = sum(1 for _ in pattern.finditer(normalized))
    result["term_counts"] = counts
    result["subject_term_hits"] = sum(value for key, value in counts.items() if key.startswith("subject:"))
    result["field_term_hits"] = sum(value for key, value in counts.items() if key.startswith("field:"))
    result["subject_term_hit"] = result["subject_term_hits"] > 0
    text_path.unlink(missing_ok=True)
    return result


def capture_one(row: dict[str, Any], scratch_root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    route_id = str(row.get("route_id") or "")
    receipt_id = str(row.get("receipt_id") or "")
    url = str(row.get("url") or "")
    expected_bytes = expected_total(row)
    started_at = utc_now()
    base = {
        "route_id": route_id,
        "receipt_id": receipt_id,
        "url": url,
        "expected_total_bytes": expected_bytes,
        "request_method": "GET",
        "request_count": 1,
        "range_requested": False,
        "query_submitted": False,
        "organization_name_submitted": False,
        "license_number_submitted": False,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "complete_remote_file_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "started_at": started_at,
    }
    classification = {
        "route_id": route_id,
        "receipt_id": receipt_id,
        "url": url,
        "document_class": classify_document(url),
        "identity_admission_state": "not_admitted",
        "public_schoolhouse_identity_admitted": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    if not route_id or not receipt_id or not allowed_url(url):
        result = {
            **base,
            "state": "input_refused",
            "error_class": "invalid_fixed_input",
            "status": None,
            "completed_at": utc_now(),
        }
        classification.update(
            {
                "content_classification_state": "not_attempted_input_refused",
                "subject_term_hit": False,
                "subject_term_hits": 0,
                "field_term_hits": 0,
                "term_counts": {key: 0 for key in ALL_PATTERNS},
                "page_count": None,
                "encrypted": None,
                "extracted_text_chars": 0,
            }
        )
        return result, classification

    route_dir = scratch_root / route_id
    route_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = route_dir / "source.pdf"
    opener = urllib.request.build_opener(StrictRedirectHandler())
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/pdf,application/octet-stream;q=0.8,*/*;q=0.1",
            "Accept-Encoding": "identity",
            "Cache-Control": "no-cache",
        },
    )
    try:
        with opener.open(request, timeout=180) as response:
            status = int(getattr(response, "status", response.getcode()))
            final_url = response.geturl()
            if not allowed_url(final_url):
                raise urllib.error.URLError(f"final URL outside allowed host family: {final_url}")
            digest = hashlib.sha256()
            byte_count = 0
            with pdf_path.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    byte_count += len(chunk)
                    if byte_count > MAX_FILE_BYTES:
                        raise RuntimeError(f"response exceeds {MAX_FILE_BYTES} byte ceiling")
                    digest.update(chunk)
                    handle.write(chunk)
            content_type = str(response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
            content_length = str(response.headers.get("Content-Length") or "")
            length_matches = expected_bytes is None or byte_count == expected_bytes
            complete = status == 200 and length_matches
            state = "complete_file_hashed" if complete else "captured_response_not_complete_file"
            result = {
                **base,
                "state": state,
                "status": status,
                "final_url": final_url,
                "content_type": content_type or None,
                "content_length_header": content_length or None,
                "captured_bytes": byte_count,
                "captured_sha256": digest.hexdigest(),
                "complete_file_hash_claimed": complete,
                "full_file_sha256": digest.hexdigest() if complete else None,
                "full_file_bytes": byte_count if complete else None,
                "expected_length_matches": length_matches,
                "completed_at": utc_now(),
            }
            info = parse_pdfinfo(pdf_path) if complete else {
                "pdfinfo_state": "not_attempted_incomplete_response",
                "pdfinfo_returncode": None,
                "page_count": None,
                "encrypted": None,
            }
            terms = extract_term_counts(pdf_path, route_dir) if complete else {
                "text_extraction_state": "not_attempted_incomplete_response",
                "text_extraction_returncode": None,
                "extracted_text_chars": 0,
                "term_counts": {key: 0 for key in ALL_PATTERNS},
                "subject_term_hits": 0,
                "field_term_hits": 0,
                "subject_term_hit": False,
            }
            classification.update(info)
            classification.update(terms)
            classification["content_classification_state"] = (
                "aggregate_term_counts_complete_file"
                if complete and terms["text_extraction_state"] == "success"
                else "mechanics_only"
            )
            classification["identity_admission_state"] = (
                "subject_term_occurrence_requires_context_adjudication"
                if classification.get("subject_term_hit")
                else "no_subject_term_observed_in_extracted_text"
            )
            return result, classification
    except urllib.error.HTTPError as exc:
        result = {
            **base,
            "state": "terminal_http_error_not_absence_evidence",
            "status": exc.code,
            "final_url": exc.geturl(),
            "error_class": type(exc).__name__,
            "error_reason_sha256": hashlib.sha256(str(exc.reason).encode("utf-8", errors="replace")).hexdigest(),
            "completed_at": utc_now(),
        }
    except Exception as exc:
        result = {
            **base,
            "state": "terminal_transport_or_processing_error_not_absence_evidence",
            "status": None,
            "error_class": type(exc).__name__,
            "error_message_sha256": hashlib.sha256(str(exc).encode("utf-8", errors="replace")).hexdigest(),
            "completed_at": utc_now(),
        }
    finally:
        pdf_path.unlink(missing_ok=True)
        shutil.rmtree(route_dir, ignore_errors=True)

    classification.update(
        {
            "content_classification_state": "not_available_terminal_error",
            "subject_term_hit": False,
            "subject_term_hits": 0,
            "field_term_hits": 0,
            "term_counts": {key: 0 for key in ALL_PATTERNS},
            "page_count": None,
            "encrypted": None,
            "extracted_text_chars": 0,
        }
    )
    return result, classification


def build_artifact(input_path: Path, out_dir: Path) -> dict[str, Any]:
    source_rows = read_jsonl(input_path)
    if len(source_rows) != 15:
        raise RuntimeError(f"expected 15 frozen PDF routes, found {len(source_rows)}")
    if len({row.get("route_id") for row in source_rows}) != 15:
        raise RuntimeError("route IDs are not unique")
    if len({row.get("url") for row in source_rows}) != 15:
        raise RuntimeError("route URLs are not unique")
    for row in source_rows:
        if row.get("status") != 206 or row.get("media_type") != "application/pdf":
            raise RuntimeError(f"{row.get('route_id')}: predecessor row is not an HTTP 206 PDF sample")
        if row.get("complete_remote_file_retained") is not False:
            raise RuntimeError(f"{row.get('route_id')}: predecessor custody boundary drift")

    out_dir.mkdir(parents=True, exist_ok=True)
    started_at = utc_now()
    with tempfile.TemporaryDirectory(prefix="schoolhouse-complete-pdf-") as scratch:
        scratch_root = Path(scratch)
        results: list[dict[str, Any]] = []
        classifications: list[dict[str, Any]] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_map = {
                executor.submit(capture_one, row, scratch_root): row["route_id"]
                for row in source_rows
            }
            for future in concurrent.futures.as_completed(future_map):
                result, classification = future.result()
                results.append(result)
                classifications.append(classification)

    results.sort(key=lambda row: row["route_id"])
    classifications.sort(key=lambda row: row["route_id"])
    terminal_states = Counter(row["state"] for row in results)
    statuses = Counter(str(row["status"]) if row["status"] is not None else "none" for row in results)
    complete_rows = [row for row in results if row["state"] == "complete_file_hashed"]
    subject_rows = [row for row in classifications if row.get("subject_term_hit")]
    extraction_success = [row for row in classifications if row.get("text_extraction_state") == "success"]

    input_rows = []
    for row in source_rows:
        input_rows.append(
            {
                "route_id": row["route_id"],
                "receipt_id": row["receipt_id"],
                "url": row["url"],
                "predecessor_sample_sha256": row["sample_sha256"],
                "predecessor_sample_bytes": row["sample_bytes"],
                "expected_total_bytes": expected_total(row),
                "complete_remote_file_retained": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    input_rows.sort(key=lambda row: row["route_id"])

    write_jsonl(out_dir / "input-pdf-routes.jsonl", input_rows)
    write_jsonl(out_dir / "full-file-custody.jsonl", results)
    write_jsonl(out_dir / "content-field-classification.jsonl", classifications)

    summary = {
        "schema_version": SCHEMA_VERSION,
        "as_of": "2026-08-05",
        "started_at": started_at,
        "completed_at": utc_now(),
        "input_pdf_routes": len(input_rows),
        "terminal_route_rows": len(results),
        "all_routes_terminal": len(results) == len(input_rows),
        "complete_file_hash_rows": len(complete_rows),
        "length_match_rows": sum(1 for row in complete_rows if row.get("expected_length_matches")),
        "text_extraction_success_rows": len(extraction_success),
        "text_extraction_non_success_rows": len(classifications) - len(extraction_success),
        "total_pdf_pages": sum(int(row.get("page_count") or 0) for row in classifications),
        "total_extracted_text_chars": sum(int(row.get("extracted_text_chars") or 0) for row in classifications),
        "subject_term_hit_rows": len(subject_rows),
        "subject_term_total_hits": sum(int(row.get("subject_term_hits") or 0) for row in classifications),
        "field_term_total_hits": sum(int(row.get("field_term_hits") or 0) for row in classifications),
        "terminal_states": dict(sorted(terminal_states.items())),
        "http_statuses": dict(sorted(statuses.items())),
        "maximum_file_bytes": MAX_FILE_BYTES,
        "maximum_workers": MAX_WORKERS,
        "requests_per_route": 1,
        "result_spawned_requests": 0,
        "search_submissions": 0,
        "organization_name_submissions": 0,
        "license_number_submissions": 0,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "complete_remote_files_retained": False,
        "extracted_text_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    write_json(out_dir / "summary.json", summary)

    route_policy = {
        "schema_version": "schoolhouse-charity-nc-complete-pdf-policy@1",
        "input_denominator": "exact fifteen HTTP 206 PDF routes frozen in merged final-static-residual custody",
        "allowed_method": "GET",
        "maximum_attempts_per_route": 1,
        "maximum_parallel_workers": MAX_WORKERS,
        "allowed_hosts": sorted(ALLOWED_HOSTS),
        "maximum_file_bytes": MAX_FILE_BYTES,
        "raw_bytes_discarded": True,
        "extracted_text_discarded": True,
        "retained_content": [
            "complete-file SHA-256 only when exact full response length is captured",
            "public response metadata",
            "PDF page and encryption mechanics",
            "aggregate fixed-term counts without snippets",
            "terminal error custody",
        ],
        "forbidden_actions": [
            "interactive search",
            "organization-name or license-number submission",
            "form submission",
            "account, payment, upload, or contact action",
            "result-spawned acquisition",
            "identity admission by document mechanics or term occurrence",
        ],
        "publisher_automation_policy_controlling": True,
        "search_submissions": 0,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "complete_remote_files_retained": False,
        "extracted_text_retained": False,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    write_json(out_dir / "route-policy.json", route_policy)

    manifest_files = [
        "input-pdf-routes.jsonl",
        "full-file-custody.jsonl",
        "content-field-classification.jsonl",
        "summary.json",
        "route-policy.json",
    ]
    manifest = {
        "schema_version": "schoolhouse-charity-nc-complete-pdf-artifact-manifest@1",
        "created_at": utc_now(),
        "files": {
            name: {
                "bytes": (out_dir / name).stat().st_size,
                "sha256": sha256_file(out_dir / name),
            }
            for name in manifest_files
        },
        "input_pdf_routes": 15,
        "terminal_route_rows": len(results),
        "outside_human_dependency": False,
        "graph_effect": "none",
    }
    write_json(out_dir / "artifact-manifest.json", manifest)
    checksum_files = manifest_files + ["artifact-manifest.json"]
    with (out_dir / "SHA256SUMS").open("w", encoding="utf-8", newline="\n") as handle:
        for name in checksum_files:
            handle.write(f"{sha256_file(out_dir / name)}  {name}\n")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    summary = build_artifact(args.input, args.out)
    print(json.dumps(summary, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
