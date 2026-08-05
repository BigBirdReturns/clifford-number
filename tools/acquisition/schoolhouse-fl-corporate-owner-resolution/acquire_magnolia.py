#!/usr/bin/env python3
"""Resolve the two exact Florida Magnolia corporate candidates.

This runner reuses the qualified remote-ZIP range transport from the completed
fifteen-owner corporate acquisition. It selects only partitions 5 and 7 from
the official quarterly corporate archive and scans them completely for the two
Florida documents returned by the strict exact-FEI search for IRS candidate
EIN 39-2669585.

The output retains legal name, document number, status, filing type, filed date,
FEI/EIN, principal city and state, annual-report dates, officer count, and
source-member custody. Registered-agent names, officer names, addresses,
postal codes, contact details, document images, private records, and private
messages are removed. Resolving an IRS candidate to a Florida corporation does
not identify that corporation as BVVC's public School.House brand.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

BASE_RUNNER = Path(__file__).with_name("acquire.py")
SPEC = importlib.util.spec_from_file_location("schoolhouse_fl_owner_acquire", BASE_RUNNER)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"unable to load qualified owner runner: {BASE_RUNNER}")
OWNER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = OWNER
SPEC.loader.exec_module(OWNER)

MAGNOLIA_EIN = "392669585"
TARGET_DOCUMENTS = {"L25000047895", "N25000006947"}
TARGET_DIGITS = {"5", "7"}
IRS_CANDIDATE_SOURCE = Path(
    "data/intake/bvvc-defense-capital/schoolhouse-irs-candidates-eo-bmf.jsonl"
)


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


def normalize_ein(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 9 else None


def compact(value: Any) -> str:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def load_targets(
    exact_artifact: Path,
) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]], dict[str, Any]]:
    exact_path = exact_artifact / "registry-candidates.jsonl"
    summary_path = exact_artifact / "summary.json"
    if not exact_path.exists() or not summary_path.exists():
        raise RuntimeError("strict exact-FEI artifact is incomplete")
    exact_summary = json.loads(summary_path.read_text(encoding="utf-8"))
    exact_rows = [
        row
        for row in read_jsonl(exact_path)
        if row.get("query_type") == "fei_ein"
        and normalize_ein(row.get("query")) == MAGNOLIA_EIN
    ]
    exact_documents = {row.get("document_number") for row in exact_rows}
    if exact_documents != TARGET_DOCUMENTS:
        raise RuntimeError(
            f"strict exact-FEI document denominator drift: {sorted(exact_documents)}"
        )
    if len(exact_rows) != 3:
        raise RuntimeError(f"expected three exact-FEI candidate rows, got {len(exact_rows)}")

    irs_rows = [
        row
        for row in read_jsonl(IRS_CANDIDATE_SOURCE)
        if normalize_ein(row.get("ein")) == MAGNOLIA_EIN
    ]
    if len(irs_rows) != 1:
        raise RuntimeError(
            f"expected one permanent IRS candidate row for {MAGNOLIA_EIN}, got {len(irs_rows)}"
        )
    irs = irs_rows[0]

    links: dict[str, list[dict[str, Any]]] = {}
    targets: list[dict[str, Any]] = []
    for document in sorted(TARGET_DOCUMENTS):
        search_names = sorted(
            {
                normalize_space(row.get("legal_name"))
                for row in exact_rows
                if row.get("document_number") == document
                and normalize_space(row.get("legal_name"))
            }
        )
        context = {
            "context_type": "irs_candidate_exact_fei_search_result",
            "irs_candidate_row_id": irs.get("candidate_row_id"),
            "irs_ein": MAGNOLIA_EIN,
            "irs_legal_name_as_recorded": irs.get("legal_name_as_recorded"),
            "irs_city": irs.get("city"),
            "irs_state": irs.get("state"),
            "irs_ruling_date": irs.get("ruling_date"),
            "exact_fei_search_names": search_names,
            "exact_fei_search_document_number": document,
            "identity_admitted": False,
            "public_schoolhouse_brand_join_state": "not_established",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        }
        links[document] = [context]
        targets.append(
            {
                "target_document_number": document,
                "partition_digit": document[-1],
                "selection_state": "frozen_from_strict_exact_fei_candidate_artifact",
                "irs_candidate_context": context,
                "street_address_retained": False,
                "mailing_address_retained": False,
                "postal_code_retained": False,
                "registered_agent_name_retained": False,
                "officer_names_retained": False,
                "contact_details_retained": False,
                "private_support_rows": 0,
                "public_schoolhouse_identity_admitted": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return links, targets, exact_summary


def sanitize_record(row: dict[str, Any]) -> dict[str, Any]:
    record = dict(row)
    contexts = record.pop("fictitious_candidate_links", [])
    officers = record.pop("officers", [])
    record.pop("registered_agent_name_as_recorded", None)
    record.pop("registered_agent_type", None)
    record["irs_candidate_links"] = contexts
    record["officer_count_in_bulk_record"] = len(officers)
    record["officer_titles_as_recorded"] = sorted(
        {
            normalize_space(officer.get("title_as_recorded"))
            for officer in officers
            if normalize_space(officer.get("title_as_recorded"))
        }
    )
    record["registered_agent_name_retained"] = False
    record["registered_agent_type_retained"] = False
    record["officer_names_retained"] = False
    record["officer_addresses_retained"] = False
    record["resolution_state"] = "exact_irs_candidate_document_resolved"
    record["schoolhouse_identity_state"] = (
        "irs_candidate_entity_resolved_public_schoolhouse_brand_not_admitted"
    )
    record["public_schoolhouse_brand_join_state"] = "not_established"
    record["public_schoolhouse_identity_admitted"] = False
    record["negative_existence_claim_created"] = False
    record["outside_human_dependency"] = False
    return record


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
            "schema_version": "schoolhouse-fl-magnolia-corporate-resolution-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(files),
            "files": files,
            "raw_source_retained": False,
            "raw_compressed_members_retained": False,
            "raw_uncompressed_members_retained": False,
            "street_address_rows_retained": 0,
            "mailing_address_rows_retained": 0,
            "postal_code_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "officer_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "private_support_rows": 0,
            "public_schoolhouse_identity_admitted": False,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
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
    parser.add_argument("--exact-fei-artifact", required=True, type=Path)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--username", default=os.environ.get("FL_SFTP_USERNAME", "Public"))
    parser.add_argument("--password", default=os.environ.get("FL_SFTP_PASSWORD", ""))
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("FL_SFTP_PASSWORD is required for the official public corporate route")
    if not IRS_CANDIDATE_SOURCE.exists():
        raise SystemExit("permanent IRS candidate predecessor is missing")

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()
    target_links, target_rows, exact_summary = load_targets(
        args.exact_fei_artifact.resolve()
    )

    client = OWNER.RemoteZipClient(
        OWNER.SOURCE_URL, args.username, args.password, args.retries
    )
    tail_start = max(0, client.total_bytes - OWNER.TAIL_WINDOW)
    tail = client.fetch_range(tail_start, client.total_bytes - 1, "zip-tail")
    eocd = OWNER.parse_eocd(tail, tail_start, client.total_bytes)
    central = client.fetch_range(
        eocd["central_offset"],
        eocd["central_offset"] + eocd["central_size"] - 1,
        "zip-central-directory",
    )
    entries = OWNER.parse_central_directory(central, eocd["entries_total"])
    selected_entries = [
        OWNER.resolve_member_data_offset(client, entry)
        for entry in entries
        if entry["partition_digit"] in TARGET_DIGITS
    ]
    if {entry["partition_digit"] for entry in selected_entries} != TARGET_DIGITS:
        raise RuntimeError("Magnolia target partition denominator drift")

    records: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(
        prefix="schoolhouse-fl-magnolia-resolution-"
    ) as directory:
        temp_root = Path(directory)
        for entry in selected_entries:
            digit = entry["partition_digit"]
            print(
                f"acquiring Magnolia partition {digit}: {entry['filename']} "
                f"compressed={entry['compressed_size']} "
                f"uncompressed={entry['uncompressed_size']}",
                flush=True,
            )
            compressed_path = temp_root / f"partition-{digit}.compressed"
            uncompressed_path = temp_root / f"partition-{digit}.txt"
            range_receipt = client.stream_range_to_file(
                entry["data_offset"],
                entry["data_end"],
                compressed_path,
                f"magnolia-member-compressed-{digit}",
            )
            decompression = OWNER.decompress_member(
                compressed_path, uncompressed_path, entry
            )
            compressed_path.unlink(missing_ok=True)
            matches, scan = OWNER.scan_member(
                uncompressed_path, entry, target_links
            )
            uncompressed_path.unlink(missing_ok=True)
            records.extend(sanitize_record(row) for row in matches)
            member_receipts.append(
                {
                    **entry,
                    "selected_for_magnolia_scan": True,
                    "compressed_range_receipt": range_receipt,
                    **decompression,
                    **scan,
                    "raw_compressed_member_retained": False,
                    "raw_uncompressed_member_retained": False,
                    "street_address_rows_retained": 0,
                    "mailing_address_rows_retained": 0,
                    "postal_code_rows_retained": 0,
                    "registered_agent_name_rows_retained": 0,
                    "officer_name_rows_retained": 0,
                    "officer_address_rows_retained": 0,
                    "contact_detail_rows_retained": 0,
                    "private_support_rows": 0,
                    "public_schoolhouse_identity_admitted": False,
                    "outside_human_dependency": False,
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )

    records.sort(key=lambda row: row["document_number"])
    record_counts = Counter(row["document_number"] for row in records)
    if set(record_counts) != TARGET_DOCUMENTS:
        raise RuntimeError(
            f"Magnolia corporate record set drift: {dict(record_counts)}"
        )
    if any(count != 1 for count in record_counts.values()):
        raise RuntimeError(f"Magnolia corporate record multiplicity drift: {dict(record_counts)}")
    by_document = {row["document_number"]: row for row in records}
    nonprofit = by_document["N25000006947"]
    llc = by_document["L25000047895"]

    nonprofit_identifier_grade = bool(
        normalize_name(nonprofit.get("corporation_name_as_recorded"))
        == "THE MAGNOLIA SCHOOLHOUSE INC"
        and normalize_ein(nonprofit.get("fei")) == MAGNOLIA_EIN
        and nonprofit.get("filing_type") == "DOMNP"
        and nonprofit.get("file_date") == "2025-06-11"
        and nonprofit.get("principal_city") == "VERO BEACH"
        and nonprofit.get("principal_state") == "FL"
    )
    llc_fei = normalize_ein(llc.get("fei"))
    if llc_fei is None:
        llc_fei_state = "bulk_reports_no_fei_exact_search_association_not_confirmed"
    elif llc_fei == MAGNOLIA_EIN:
        llc_fei_state = "bulk_reports_same_fei_requires_cross_surface_conflict_adjudication"
    else:
        llc_fei_state = "bulk_reports_distinct_fei_exact_search_association_rejected"
    llc["exact_fei_search_association_state"] = llc_fei_state
    nonprofit["exact_fei_search_association_state"] = (
        "bulk_confirms_exact_irs_candidate_ein"
    )
    nonprofit["irs_candidate_resolution_state"] = (
        "identifier_grade_irs_candidate_identity_resolved"
        if nonprofit_identifier_grade
        else "irs_candidate_identity_not_resolved"
    )
    llc["irs_candidate_resolution_state"] = (
        "exact_fei_search_association_not_identifier_grade"
    )

    resolution_rows = []
    for target in target_rows:
        document = target["target_document_number"]
        record = by_document[document]
        resolution_rows.append(
            {
                **target,
                "matched_corporate_record_count": 1,
                "corporate_record_id": record["corporate_record_id"],
                "corporation_name_as_recorded": record[
                    "corporation_name_as_recorded"
                ],
                "bulk_fei": record.get("fei"),
                "resolution_state": "exact_corporate_record_resolved",
                "irs_candidate_resolution_state": record[
                    "irs_candidate_resolution_state"
                ],
                "public_schoolhouse_brand_join_state": "not_established",
                "public_schoolhouse_identity_admitted": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    selected_digits = [entry["partition_digit"] for entry in selected_entries]
    zip_index = {
        "schema_version": "schoolhouse-fl-magnolia-remote-zip-index@1",
        "source_url": OWNER.SOURCE_URL,
        "source_bytes": client.total_bytes,
        "source_last_modified": client.source_headers.get("last-modified"),
        "eocd": eocd,
        "central_directory_sha256": sha256_bytes(central),
        "members": [
            {
                **entry,
                "selected_for_magnolia_scan": (
                    entry["partition_digit"] in TARGET_DIGITS
                ),
            }
            for entry in entries
        ],
        "declared_partitions": 10,
        "selected_partitions": selected_digits,
        "selected_partition_count": len(selected_digits),
        "target_document_count": len(target_rows),
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    source_receipt = {
        "schema_version": "schoolhouse-fl-magnolia-source-receipt@1",
        "source_url": OWNER.SOURCE_URL,
        "publisher": "Florida Department of State, Division of Corporations",
        "dataset": "quarterly_corporate_filings",
        "source_bytes": client.total_bytes,
        "source_last_modified": client.source_headers.get("last-modified"),
        "remote_zip_members": 10,
        "selected_partitions": selected_digits,
        "selected_partition_count": len(selected_digits),
        "selected_compressed_bytes": sum(
            entry["compressed_size"] for entry in selected_entries
        ),
        "selected_uncompressed_bytes": sum(
            entry["uncompressed_size"] for entry in selected_entries
        ),
        "selected_partition_rows": sum(
            row["row_count"] for row in member_receipts
        ),
        "target_documents": len(target_rows),
        "resolved_target_documents": len(records),
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "raw_compressed_members_retained": False,
        "raw_uncompressed_members_retained": False,
        "public_credential_username": args.username,
        "public_credential_password_retained": False,
        "street_address_rows_retained": 0,
        "mailing_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "registered_agent_name_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "officer_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "public_schoolhouse_identity_admitted": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    adjudication = {
        "schema_version": "schoolhouse-fl-magnolia-adjudication@1",
        "as_of": utc_now(),
        "strict_exact_fei_predecessor": {
            "workflow_run_id": 30975237852,
            "artifact_id": 8918041117,
            "artifact_digest": "sha256:1066e00ddff9b55f0e976abaa1212429c726ac8507d31691e163bbaee73a4316",
            "candidate_rows": exact_summary.get("candidate_rows"),
            "exact_fei_candidate_rows": 3,
            "document_numbers": sorted(TARGET_DOCUMENTS),
        },
        "corporate_bulk_resolution": {
            "selected_partitions": selected_digits,
            "target_documents": len(target_rows),
            "resolved_documents": len(records),
            "nonprofit_document_number": "N25000006947",
            "nonprofit_identifier_grade_irs_resolution": nonprofit_identifier_grade,
            "llc_document_number": "L25000047895",
            "llc_bulk_fei": llc_fei,
            "llc_exact_fei_search_association_state": llc_fei_state,
        },
        "public_schoolhouse_identity_decision": {
            "state": "unresolved_no_florida_corporate_identity_admitted",
            "admitted_document_number": None,
            "admitted_legal_name": None,
            "admitted_ein": None,
            "negative_existence_claim_created": False,
            "boundary": "The Magnolia nonprofit is an identifier-grade resolution of one IRS candidate. It is not admitted as BVVC's public School.House because its Vero Beach location and 2025 Florida formation do not converge with the public 2023 founding and Tampa Bay or Fayetteville surfaces.",
        },
        "privacy": {
            "street_address_rows_retained": 0,
            "mailing_address_rows_retained": 0,
            "postal_code_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "officer_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "private_support_rows": 0,
        },
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    summary = {
        "schema_version": "schoolhouse-fl-magnolia-resolution-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "source_bytes": client.total_bytes,
        "remote_zip_members": 10,
        "target_partitions": len(selected_entries),
        "target_partition_digits": selected_digits,
        "target_documents": len(target_rows),
        "resolved_target_documents": len(records),
        "corporate_records_retained": len(records),
        "selected_partition_rows_scanned": sum(
            row["row_count"] for row in member_receipts
        ),
        "selected_compressed_bytes": sum(
            entry["compressed_size"] for entry in selected_entries
        ),
        "selected_uncompressed_bytes": sum(
            entry["uncompressed_size"] for entry in selected_entries
        ),
        "range_requests": len(client.request_receipts),
        "all_target_partitions_complete": (
            len(member_receipts) == 2
            and all(
                row["state"] == "complete_partition_scanned"
                for row in member_receipts
            )
        ),
        "all_target_documents_terminal": (
            len(resolution_rows) == 2
            and all(
                row["resolution_state"] == "exact_corporate_record_resolved"
                for row in resolution_rows
            )
        ),
        "magnolia_nonprofit_identifier_grade_irs_resolution": (
            nonprofit_identifier_grade
        ),
        "magnolia_llc_bulk_fei": llc_fei,
        "magnolia_llc_exact_fei_search_association_state": llc_fei_state,
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "street_address_rows_retained": 0,
        "mailing_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "registered_agent_name_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "officer_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "public_schoolhouse_identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_json(output / "source-receipt.json", source_receipt)
    write_json(output / "remote-zip-index.json", zip_index)
    write_jsonl(output / "range-request-receipts.jsonl", client.request_receipts)
    write_jsonl(output / "member-receipts.jsonl", member_receipts)
    write_jsonl(output / "target-documents.jsonl", target_rows)
    write_jsonl(output / "corporate-records.jsonl", records)
    write_jsonl(output / "resolution-matrix.jsonl", resolution_rows)
    write_json(output / "cross-registry-adjudication.json", adjudication)
    write_json(output / "summary.json", summary)
    build_manifest(output)
    print(json.dumps(summary, sort_keys=True), flush=True)

    if len(records) != 2 or not summary["all_target_documents_terminal"]:
        return 2
    if not summary["all_target_partitions_complete"]:
        return 3
    if not nonprofit_identifier_grade:
        return 4
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
