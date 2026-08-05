#!/usr/bin/env python3
"""Resolve the exact Florida corporate denominator from the official bulk file.

The current lake contains fifteen unique Florida owner charter numbers attached
to the complete School.House phrase census over the quarterly fictitious-name
file. A strict prior route also returned two Florida document numbers while
searching exact IRS candidate EIN 39-2669585. Interactive Sunbiz document
searches returned HTTP 403 from the hosted acquisition transport, so this
runner changes transport materially: it scans the official quarterly corporate
bulk archive under the published 1,440-character schema.

Only seventeen exact document numbers are selected. The runner retains legal
name, document number, status, filing type, filed date, FEI/EIN, principal city
and state, annual-report dates, officer count, and source-member custody. It
drops street and mailing addresses, registered-agent names, officer names,
contact details, postal codes, document images, private records, and private
messages.

A resolved corporate record is not an identity join to BVVC's public
School.House brand. Every such join remains explicitly unadmitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

RECORD_LENGTH = 1440
CHUNK_SIZE = 8 * 1024 * 1024
MAX_OVERLAP = RECORD_LENGTH + 32
MAGNOLIA_EIN = "392669585"
MAGNOLIA_DOCUMENTS = {"N25000006947", "L25000047895"}
KNOWN_FILING_TYPES = {
    "DOMP",
    "DOMNP",
    "FORP",
    "FORNP",
    "DOMLP",
    "FORLP",
    "FLAL",
    "FORL",
    "NPREG",
    "TRUST",
    "AGENT",
}


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: Any) -> str:
    text = normalize_space(value).upper().replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return normalize_space(text)


def normalize_document(value: Any) -> str | None:
    text = re.sub(r"[^A-Z0-9]", "", str(value or "").upper())
    return text or None


def normalize_ein(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 9 else None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(CHUNK_SIZE)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def compact(value: Any) -> str:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"{path}:{number}: {exc}") from exc
    return rows


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def decode_field(record: bytes, start: int, length: int) -> str:
    return record[start : start + length].decode("latin-1", errors="replace").strip()


def parse_date(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 8:
        return None
    # Florida bulk files encode dates as MMDDYYYY.
    month, day, year = digits[:2], digits[2:4], digits[4:]
    if not ("01" <= month <= "12" and "01" <= day <= "31"):
        return None
    return f"{year}-{month}-{day}"


def record_is_valid(record: bytes, expected_document: str) -> bool:
    if len(record) != RECORD_LENGTH:
        return False
    actual = normalize_document(decode_field(record, 0, 12))
    if actual != expected_document:
        return False
    status = decode_field(record, 204, 1)
    filing_type = decode_field(record, 205, 15)
    file_date = decode_field(record, 472, 8)
    if status not in {"A", "I", ""}:
        return False
    if filing_type and filing_type not in KNOWN_FILING_TYPES:
        return False
    if file_date and parse_date(file_date) is None:
        return False
    return True


def parse_record(
    record: bytes,
    *,
    source_member: str,
    source_offset: int,
    source_record_sha256: str,
) -> dict[str, Any]:
    document = normalize_document(decode_field(record, 0, 12))
    if not document:
        raise RuntimeError("corporate record lacks document number")
    officer_title_offsets = [668, 796, 924, 1052, 1180, 1308]
    officer_titles = [decode_field(record, offset, 4) for offset in officer_title_offsets]
    officer_count = sum(1 for title in officer_titles if title)
    report_years = [
        decode_field(record, 505, 4),
        decode_field(record, 518, 4),
        decode_field(record, 531, 4),
    ]
    report_dates = [
        parse_date(decode_field(record, 510, 8)),
        parse_date(decode_field(record, 523, 8)),
        parse_date(decode_field(record, 536, 8)),
    ]
    return {
        "record_id": f"fl-corporate:{document}",
        "document_number": document,
        "legal_name_as_recorded": decode_field(record, 12, 192) or None,
        "normalized_legal_name": normalize_name(decode_field(record, 12, 192)),
        "status": decode_field(record, 204, 1) or None,
        "filing_type": decode_field(record, 205, 15) or None,
        "principal_city": decode_field(record, 304, 28) or None,
        "principal_state": decode_field(record, 332, 2) or None,
        "file_date": parse_date(decode_field(record, 472, 8)),
        "fei_ein": normalize_ein(decode_field(record, 480, 14)),
        "more_than_six_officers": decode_field(record, 494, 1) == "Y",
        "last_transaction_date": parse_date(decode_field(record, 495, 8)),
        "state_country": decode_field(record, 503, 2) or None,
        "report_years": [year for year in report_years if year],
        "report_dates": [date for date in report_dates if date],
        "officer_count_in_bulk_record": officer_count,
        "source_member": source_member,
        "source_offset": source_offset,
        "source_record_bytes": RECORD_LENGTH,
        "source_record_sha256": source_record_sha256,
        "schema_receipt_id": "r-fl-sunbiz-corporate-definition-2026-08-05",
        "source_receipt_id": "r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05",
        "street_address_retained": False,
        "mailing_address_retained": False,
        "postal_code_retained": False,
        "registered_agent_name_retained": False,
        "registered_agent_address_retained": False,
        "officer_names_retained": False,
        "officer_addresses_retained": False,
        "contact_details_retained": False,
        "document_images_retained": False,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def build_input_denominator(
    fictitious_rows: list[dict[str, Any]],
    irs_rows: list[dict[str, Any]],
    exact_fei_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    contexts: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in fictitious_rows:
        for owner in candidate.get("owners", []):
            document = normalize_document(owner.get("owner_charter_number"))
            if not document:
                continue
            contexts[document].append(
                {
                    "context_type": "fictitious_name_owner_charter",
                    "fictitious_candidate_id": candidate.get("candidate_id"),
                    "fictitious_document_number": candidate.get("document_number"),
                    "fictitious_name_as_recorded": candidate.get(
                        "fictitious_name_as_recorded"
                    ),
                    "fictitious_city": candidate.get("city"),
                    "fictitious_state": candidate.get("state"),
                    "fictitious_filing_date": candidate.get("filing_date"),
                    "owner_name_as_recorded": owner.get("owner_name_as_recorded"),
                    "owner_charter_number": document,
                    "owner_fei": normalize_ein(owner.get("owner_fei")),
                    "public_tampa_bay_city_match": bool(
                        candidate.get("public_tampa_bay_city_match")
                    ),
                    "identity_admitted": False,
                    "public_schoolhouse_brand_join_state": "not_established",
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )

    irs_magnolia = [row for row in irs_rows if row.get("ein") == MAGNOLIA_EIN]
    if len(irs_magnolia) != 1:
        raise RuntimeError(
            f"expected one IRS EO BMF row for {MAGNOLIA_EIN}, got {len(irs_magnolia)}"
        )
    irs_row = irs_magnolia[0]
    exact = [
        row
        for row in exact_fei_rows
        if row.get("query_type") == "fei_ein"
        and normalize_ein(row.get("query")) == MAGNOLIA_EIN
    ]
    exact_documents = {
        normalize_document(row.get("document_number")) for row in exact
    }
    exact_documents.discard(None)
    if exact_documents != MAGNOLIA_DOCUMENTS:
        raise RuntimeError(
            f"exact-FEI document denominator drift: {sorted(exact_documents)}"
        )
    for document in sorted(exact_documents):
        search_names = sorted(
            {
                normalize_space(row.get("legal_name"))
                for row in exact
                if normalize_document(row.get("document_number")) == document
                and normalize_space(row.get("legal_name"))
            }
        )
        contexts[document].append(
            {
                "context_type": "irs_candidate_exact_fei_search_result",
                "irs_candidate_row_id": irs_row.get("candidate_row_id"),
                "irs_ein": MAGNOLIA_EIN,
                "irs_legal_name_as_recorded": irs_row.get("legal_name_as_recorded"),
                "irs_city": irs_row.get("city"),
                "irs_state": irs_row.get("state"),
                "irs_ruling_date": irs_row.get("ruling_date"),
                "exact_fei_search_names": search_names,
                "exact_fei_search_document_number": document,
                "identity_admitted": False,
                "public_schoolhouse_brand_join_state": "not_established",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    owner_documents = {
        document
        for document, rows in contexts.items()
        if any(row["context_type"] == "fictitious_name_owner_charter" for row in rows)
    }
    if len(owner_documents) != 15:
        raise RuntimeError(
            f"expected 15 unique owner charter numbers, got {len(owner_documents)}"
        )
    if len(contexts) != 17:
        raise RuntimeError(f"expected 17 exact corporate documents, got {len(contexts)}")

    denominator: list[dict[str, Any]] = []
    for document in sorted(contexts):
        rows = contexts[document]
        denominator.append(
            {
                "document_number": document,
                "partition_digit": document[-1],
                "context_count": len(rows),
                "context_types": sorted({row["context_type"] for row in rows}),
                "expected_owner_feis": sorted(
                    {row["owner_fei"] for row in rows if row.get("owner_fei")}
                ),
                "expected_owner_names": sorted(
                    {
                        row["owner_name_as_recorded"]
                        for row in rows
                        if row.get("owner_name_as_recorded")
                    }
                ),
                "expected_irs_eins": sorted(
                    {row["irs_ein"] for row in rows if row.get("irs_ein")}
                ),
                "public_schoolhouse_brand_join_state": "not_established",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return denominator, contexts


def scan_member(
    archive: zipfile.ZipFile,
    member: zipfile.ZipInfo,
    targets: set[str],
    hits: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    digest = hashlib.sha256()
    total_bytes = 0
    tail = b""
    seen_offsets: set[tuple[str, int]] = set()
    member_hits: list[str] = []
    with archive.open(member, "r") as handle:
        while True:
            chunk = handle.read(CHUNK_SIZE)
            if not chunk:
                break
            digest.update(chunk)
            data = tail + chunk
            data_start = total_bytes - len(tail)
            safe_limit = len(data) - RECORD_LENGTH + 1
            if safe_limit > 0:
                for target in targets:
                    needle = target.encode("ascii")
                    start = 0
                    while True:
                        position = data.find(needle, start, safe_limit)
                        if position < 0:
                            break
                        absolute = data_start + position
                        key = (target, absolute)
                        if key not in seen_offsets:
                            candidate = data[position : position + RECORD_LENGTH]
                            if record_is_valid(candidate, target):
                                record_hash = sha256_bytes(candidate)
                                parsed = parse_record(
                                    candidate,
                                    source_member=member.filename,
                                    source_offset=absolute,
                                    source_record_sha256=record_hash,
                                )
                                hits[target].append(parsed)
                                member_hits.append(target)
                                seen_offsets.add(key)
                        start = position + 1
            total_bytes += len(chunk)
            tail = data[-MAX_OVERLAP:]
    return {
        "member": member.filename,
        "compressed_bytes": member.compress_size,
        "uncompressed_bytes_declared": member.file_size,
        "uncompressed_bytes_scanned": total_bytes,
        "crc32": f"{member.CRC:08x}",
        "sha256": digest.hexdigest(),
        "target_hits": sorted(member_hits),
        "target_hit_count": len(member_hits),
        "state": "scanned",
    }


def classify_record(
    record: dict[str, Any], contexts: list[dict[str, Any]]
) -> dict[str, Any]:
    expected_owner_feis = sorted(
        {row["owner_fei"] for row in contexts if row.get("owner_fei")}
    )
    expected_owner_names = sorted(
        {
            row["owner_name_as_recorded"]
            for row in contexts
            if row.get("owner_name_as_recorded")
        }
    )
    expected_irs_eins = sorted(
        {row["irs_ein"] for row in contexts if row.get("irs_ein")}
    )
    actual_fei = normalize_ein(record.get("fei_ein"))
    actual_name = normalize_name(record.get("legal_name_as_recorded"))
    normalized_owner_names = {normalize_name(name) for name in expected_owner_names}
    if expected_owner_feis:
        owner_fei_alignment = (
            "exact"
            if actual_fei in expected_owner_feis
            else "bulk_reports_no_fei"
            if actual_fei is None
            else "conflict"
        )
    else:
        owner_fei_alignment = "not_applicable"
    if expected_owner_names:
        owner_name_alignment = (
            "exact_normalized"
            if actual_name in normalized_owner_names
            else "current_name_differs_from_fictitious_owner_name"
        )
    else:
        owner_name_alignment = "not_applicable"
    if expected_irs_eins:
        irs_ein_alignment = (
            "exact"
            if actual_fei in expected_irs_eins
            else "bulk_reports_no_fei"
            if actual_fei is None
            else "conflict"
        )
    else:
        irs_ein_alignment = "not_applicable"
    document = record["document_number"]
    if document == "N25000006947" and irs_ein_alignment == "exact":
        irs_candidate_resolution_state = "identifier_grade_irs_candidate_identity_resolved"
    elif document == "L25000047895" and irs_ein_alignment != "exact":
        irs_candidate_resolution_state = "exact_fei_search_result_not_confirmed_by_bulk_record"
    elif expected_irs_eins:
        irs_candidate_resolution_state = "irs_candidate_identity_not_resolved"
    else:
        irs_candidate_resolution_state = "not_applicable"
    result = dict(record)
    result.update(
        {
            "context_count": len(contexts),
            "context_types": sorted({row["context_type"] for row in contexts}),
            "expected_owner_feis": expected_owner_feis,
            "expected_owner_names": expected_owner_names,
            "expected_irs_eins": expected_irs_eins,
            "owner_fei_alignment": owner_fei_alignment,
            "owner_name_alignment": owner_name_alignment,
            "irs_ein_alignment": irs_ein_alignment,
            "irs_candidate_resolution_state": irs_candidate_resolution_state,
            "public_schoolhouse_brand_join_state": "not_established",
            "identity_state": "corporate_record_resolved_public_brand_not_admitted",
        }
    )
    return result


def build_manifest(output: Path) -> None:
    rows = []
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
            "schema_version": "schoolhouse-fl-corporate-bulk-artifact-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(rows),
            "files": rows,
            "raw_source_files_retained": 0,
            "street_address_rows_retained": 0,
            "mailing_address_rows_retained": 0,
            "postal_code_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "registered_agent_address_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "officer_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "document_image_rows_retained": 0,
            "private_support_rows": 0,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(
                f"{sha256_bytes(file.read_bytes())}  {file.relative_to(output).as_posix()}"
            )
    (output / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--lake-dir", required=True, type=Path)
    parser.add_argument("--exact-fei-artifact", required=True, type=Path)
    parser.add_argument(
        "--source-url",
        default="https://sftp.floridados.gov/Public/doc/quarterly/cor/cordata.zip",
    )
    args = parser.parse_args()

    archive_path = args.archive.resolve()
    output = args.output.resolve()
    lake = args.lake_dir.resolve()
    exact_artifact = args.exact_fei_artifact.resolve()
    if not archive_path.is_file():
        raise RuntimeError(f"archive missing: {archive_path}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    fictitious_path = lake / "schoolhouse-fl-fictitious-candidates.jsonl"
    irs_path = lake / "schoolhouse-irs-candidates-eo-bmf.jsonl"
    exact_path = exact_artifact / "registry-candidates.jsonl"
    for required in [fictitious_path, irs_path, exact_path]:
        if not required.exists():
            raise RuntimeError(f"required input missing: {required}")

    started_at = utc_now()
    fictitious_rows = read_jsonl(fictitious_path)
    irs_rows = read_jsonl(irs_path)
    exact_fei_rows = read_jsonl(exact_path)
    denominator, contexts = build_input_denominator(
        fictitious_rows, irs_rows, exact_fei_rows
    )
    targets = {row["document_number"] for row in denominator}
    hits: dict[str, list[dict[str, Any]]] = defaultdict(list)

    source_bytes = archive_path.stat().st_size
    print(f"hashing official archive: {source_bytes} bytes", flush=True)
    source_sha256 = sha256_file(archive_path)
    member_inventory: list[dict[str, Any]] = []
    with zipfile.ZipFile(archive_path) as archive:
        members = [member for member in archive.infolist() if not member.is_dir()]
        if not members:
            raise RuntimeError("corporate archive contains no file members")
        for index, member in enumerate(members, 1):
            print(
                f"scanning member {index}/{len(members)}: {member.filename} "
                f"({member.file_size} bytes)",
                flush=True,
            )
            member_inventory.append(
                scan_member(archive, member, targets, hits)
            )

    missing = sorted(target for target in targets if len(hits[target]) == 0)
    duplicate = {
        target: len(hits[target])
        for target in sorted(targets)
        if len(hits[target]) > 1
    }
    records: list[dict[str, Any]] = []
    for target in sorted(targets):
        if len(hits[target]) == 1:
            records.append(classify_record(hits[target][0], contexts[target]))

    by_document = {record["document_number"]: record for record in records}
    owner_documents = {
        row["document_number"]
        for row in denominator
        if "fictitious_name_owner_charter" in row["context_types"]
    }
    resolved_owner_documents = owner_documents & set(by_document)
    nonprofit = by_document.get("N25000006947")
    llc = by_document.get("L25000047895")
    nonprofit_confirmed = bool(
        nonprofit
        and nonprofit.get("fei_ein") == MAGNOLIA_EIN
        and normalize_name(nonprofit.get("legal_name_as_recorded"))
        == "THE MAGNOLIA SCHOOLHOUSE INC"
        and nonprofit.get("principal_city") == "VERO BEACH"
        and nonprofit.get("principal_state") == "FL"
    )
    llc_rejects_fei = bool(
        llc
        and llc.get("fei_ein") is None
        and normalize_name(llc.get("legal_name_as_recorded"))
        == "THE MAGNOLIA SCHOOLHOUSE LLC"
    )

    source_receipt = {
        "schema_version": "schoolhouse-fl-corporate-bulk-source-receipt@1",
        "retrieved_at": utc_now(),
        "source_url": args.source_url,
        "source_bytes": source_bytes,
        "source_sha256": source_sha256,
        "archive_member_count": len(member_inventory),
        "archive_compressed_bytes": sum(
            row["compressed_bytes"] for row in member_inventory
        ),
        "archive_uncompressed_bytes": sum(
            row["uncompressed_bytes_declared"] for row in member_inventory
        ),
        "archive_uncompressed_bytes_scanned": sum(
            row["uncompressed_bytes_scanned"] for row in member_inventory
        ),
        "schema_url": "https://dos.sunbiz.org/data-definitions/cor.html",
        "schema_receipt_id": "r-fl-sunbiz-corporate-definition-2026-08-05",
        "record_length": RECORD_LENGTH,
        "raw_source_retained": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    input_denominator = {
        "schema_version": "schoolhouse-fl-corporate-bulk-input@1",
        "generated_at": utc_now(),
        "fictitious_candidate_rows": len(fictitious_rows),
        "unique_owner_charter_numbers": len(owner_documents),
        "magnolia_exact_fei_document_numbers": sorted(MAGNOLIA_DOCUMENTS),
        "declared_document_numbers": len(denominator),
        "document_rows": denominator,
        "exact_fei_artifact": {
            "workflow_run_id": 30975237852,
            "artifact_id": 8918041117,
            "artifact_digest": "sha256:1066e00ddff9b55f0e976abaa1212429c726ac8507d31691e163bbaee73a4316",
            "state": "strict_terminal_candidate_census_detail_denominator_incomplete",
        },
        "interactive_route_failure": {
            "workflow_run_id": 30976307682,
            "artifact_id": 8918375589,
            "artifact_digest": "sha256:a5d94c531fd073562e949684186ead28a17980dd1febee4d12aee0ad242510f2",
            "declared_routes": 17,
            "http_403_routes": 17,
            "resolved_documents": 0,
            "absence_claim_created": False,
        },
        "public_schoolhouse_brand_join_state": "not_established",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    adjudication = {
        "schema_version": "schoolhouse-fl-corporate-bulk-adjudication@1",
        "as_of": utc_now(),
        "transport_transition": {
            "prior_transport": "interactive Sunbiz document search",
            "prior_result": "17_of_17_http_403_source_unavailable_after_search",
            "current_transport": "official_quarterly_corporate_bulk_archive",
            "blind_retry_performed": False,
        },
        "input_denominator": {
            "declared_document_numbers": len(denominator),
            "fictitious_owner_charter_numbers": len(owner_documents),
            "magnolia_exact_fei_document_numbers": len(MAGNOLIA_DOCUMENTS),
        },
        "source_denominator": {
            "source_url": args.source_url,
            "source_bytes": source_bytes,
            "source_sha256": source_sha256,
            "archive_member_count": len(member_inventory),
            "uncompressed_bytes_scanned": source_receipt[
                "archive_uncompressed_bytes_scanned"
            ],
            "record_length": RECORD_LENGTH,
        },
        "resolution": {
            "resolved_exact_documents": len(records),
            "missing_document_numbers": missing,
            "duplicate_document_numbers": duplicate,
            "resolved_owner_charter_numbers": len(resolved_owner_documents),
            "unresolved_owner_charter_numbers": sorted(
                owner_documents - resolved_owner_documents
            ),
        },
        "fictitious_owner_resolution": {
            "declared_owner_charter_numbers": len(owner_documents),
            "resolved_owner_charter_numbers": len(resolved_owner_documents),
            "public_schoolhouse_brand_join_state": "not_established",
            "boundary": "Resolving an owner charter identifies the corporate owner of a phrase-matched fictitious name. It does not identify BVVC's public School.House brand.",
        },
        "irs_candidate_resolution": {
            "irs_candidate_ein": MAGNOLIA_EIN,
            "irs_candidate_legal_name": "THE MAGNOLIA SCHOOLHOUSE INC",
            "irs_candidate_city": "VERO BEACH",
            "nonprofit_document_number": "N25000006947",
            "nonprofit_identifier_grade_resolution": nonprofit_confirmed,
            "nonprofit_record_id": nonprofit.get("record_id") if nonprofit else None,
            "llc_document_number": "L25000047895",
            "llc_bulk_record_rejects_exact_fei": llc_rejects_fei,
            "llc_record_id": llc.get("record_id") if llc else None,
            "public_schoolhouse_brand_join_state": "not_established",
            "boundary": "Resolving the IRS candidate to a Florida nonprofit does not identify that nonprofit as BVVC's public School.House. Public name, 2023 founding, and Tampa Bay or Fayetteville convergence remain absent.",
        },
        "public_schoolhouse_identity_decision": {
            "state": "unresolved_no_florida_corporate_identity_admitted",
            "admitted_document_number": None,
            "admitted_legal_name": None,
            "admitted_ein": None,
            "negative_existence_claim_created": False,
        },
        "privacy": {
            "street_address_rows_retained": 0,
            "mailing_address_rows_retained": 0,
            "postal_code_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "registered_agent_address_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "officer_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "document_image_rows_retained": 0,
            "private_support_rows": 0,
        },
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    summary = {
        "schema_version": "schoolhouse-fl-corporate-bulk-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "declared_document_numbers": len(denominator),
        "fictitious_owner_charter_numbers": len(owner_documents),
        "magnolia_exact_fei_document_numbers": len(MAGNOLIA_DOCUMENTS),
        "source_bytes": source_bytes,
        "source_sha256": source_sha256,
        "archive_member_count": len(member_inventory),
        "uncompressed_bytes_scanned": source_receipt[
            "archive_uncompressed_bytes_scanned"
        ],
        "resolved_exact_documents": len(records),
        "missing_document_numbers": len(missing),
        "duplicate_document_numbers": len(duplicate),
        "resolved_owner_charter_numbers": len(resolved_owner_documents),
        "unresolved_owner_charter_numbers": len(
            owner_documents - resolved_owner_documents
        ),
        "corporate_record_rows": len(records),
        "magnolia_nonprofit_identifier_grade_resolution": nonprofit_confirmed,
        "magnolia_llc_bulk_record_rejects_exact_fei": llc_rejects_fei,
        "public_schoolhouse_identity_admitted": False,
        "negative_existence_claim_created": False,
        "street_address_rows_retained": 0,
        "mailing_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "registered_agent_name_rows_retained": 0,
        "registered_agent_address_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "officer_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "document_image_rows_retained": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "raw_source_files_retained": 0,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    receipt = {
        "schema_version": "schoolhouse-fl-corporate-bulk-acquisition-receipt@1",
        "generated_at": utc_now(),
        "source_sha256": source_sha256,
        "declared_document_numbers": len(denominator),
        "resolved_exact_documents": len(records),
        "missing_document_numbers": missing,
        "duplicate_document_numbers": duplicate,
        "resolved_owner_charter_numbers": len(resolved_owner_documents),
        "magnolia_nonprofit_identifier_grade_resolution": nonprofit_confirmed,
        "magnolia_llc_bulk_record_rejects_exact_fei": llc_rejects_fei,
        "public_schoolhouse_identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_json(output / "source-receipt.json", source_receipt)
    write_json(output / "input-denominator.json", input_denominator)
    write_jsonl(output / "member-inventory.jsonl", member_inventory)
    write_jsonl(output / "corporate-records.jsonl", records)
    write_json(output / "cross-registry-adjudication.json", adjudication)
    write_json(output / "summary.json", summary)
    write_json(output / "acquisition-receipt.json", receipt)
    build_manifest(output)
    print(json.dumps(summary, sort_keys=True), flush=True)

    if len(denominator) != 17 or len(owner_documents) != 15:
        return 2
    if missing or duplicate or len(records) != 17:
        return 3
    if len(resolved_owner_documents) != 15:
        return 4
    if not nonprofit_confirmed or not llc_rejects_fei:
        return 5
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
