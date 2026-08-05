#!/usr/bin/env python3
"""Acquire and scan Florida's quarterly fictitious-name denominator.

The official Florida Department of State bulk file is downloaded through the
published public HTTPS route, checksum-bound, scanned in full, and discarded.
Only records whose fictitious-name field contains the frozen School.House name
battery are retained. Street addresses, ZIP codes, phone numbers, email
addresses, and other contact details are never copied into the artifact.
Owner names, owner entity identifiers, and charter numbers are retained only
for selected candidate records because they are the lawful bridge to a later
corporate-registry lookup. A candidate is never an identity admission.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
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
from typing import Any, BinaryIO

SOURCE_URL = "https://sftp.floridados.gov/Public/doc/quarterly/fic/ficdata.zip"
EXPECTED_SOURCE_BYTES = 74_947_584
RECORD_LENGTH = 2_098
OWNER_BLOCK_START = 388
OWNER_BLOCK_LENGTH = 171
OWNER_BLOCK_COUNT = 10
USER_AGENT = "CliffordNumber-SchoolHouse-Florida-Fictitious/1.0"
ROUTE_PROBE = {
    "workflow_run_id": 30973871220,
    "artifact_id": 8917541589,
    "artifact_digest": "sha256:02f718c9250be32fac6a6259919bbd3490c1d649f7fb545073756d93436c77ee",
    "route_id": "fl-fic-https-public-path",
    "state": "accessible",
    "content_length": EXPECTED_SOURCE_BYTES,
}
PUBLIC_LOCATION_CITIES = {
    "TAMPA",
    "CLEARWATER",
    "ST PETERSBURG",
    "ST. PETERSBURG",
}
EXACT_PUBLIC_NAMES = {
    "SCHOOL HOUSE",
    "SCHOOLHOUSE",
    "SCHOOL HOUSE 1776",
    "SCHOOLHOUSE 1776",
    "THE SCHOOL HOUSE",
    "THE SCHOOLHOUSE",
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


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: Any) -> str:
    text = normalize_space(value).upper().replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return normalize_space(text)


def normalize_digits(value: Any, lengths: set[int]) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) in lengths else None


def decode_field(record: bytes, start: int, length: int) -> str | None:
    value = record[start : start + length].decode("latin-1", errors="replace")
    value = normalize_space(value.replace("\x00", " "))
    return value or None


def candidate_name(value: str | None) -> bool:
    normalized = normalize_name(value)
    return "SCHOOL HOUSE" in normalized or "SCHOOLHOUSE" in normalized


def read_exact(handle: BinaryIO, size: int) -> bytes:
    chunks: list[bytes] = []
    remaining = size
    while remaining:
        chunk = handle.read(remaining)
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def detect_record_span(archive: zipfile.ZipFile, info: zipfile.ZipInfo) -> tuple[int, str]:
    with archive.open(info, "r") as handle:
        sample = handle.read(RECORD_LENGTH + 4)
    if len(sample) < RECORD_LENGTH:
        raise RuntimeError(f"member shorter than one record: {info.filename}")
    if sample[RECORD_LENGTH : RECORD_LENGTH + 2] == b"\r\n":
        return RECORD_LENGTH + 2, "fixed_width_crlf"
    if sample[RECORD_LENGTH : RECORD_LENGTH + 1] == b"\n":
        return RECORD_LENGTH + 1, "fixed_width_lf"
    return RECORD_LENGTH, "fixed_width_no_separator"


def parse_owner(record: bytes, index: int) -> dict[str, Any] | None:
    base = OWNER_BLOCK_START + index * OWNER_BLOCK_LENGTH
    owner_document_number = decode_field(record, base, 12)
    owner_name = decode_field(record, base + 12, 55)
    owner_type = decode_field(record, base + 67, 1)
    owner_fei = normalize_digits(decode_field(record, base + 150, 9), {9})
    owner_charter_number = decode_field(record, base + 159, 12)
    if not any((owner_document_number, owner_name, owner_fei, owner_charter_number)):
        return None
    return {
        "owner_index": index + 1,
        "owner_document_number": owner_document_number,
        "owner_name_as_recorded": owner_name,
        "owner_name_format": owner_type,
        "owner_fei": owner_fei,
        "owner_charter_number": owner_charter_number,
        "street_address_retained": False,
        "contact_details_retained": False,
    }


def parse_candidate(record: bytes, member: str, row_number: int) -> dict[str, Any] | None:
    if len(record) != RECORD_LENGTH:
        return None
    fictitious_name = decode_field(record, 12, 192)
    if not candidate_name(fictitious_name):
        return None

    document_number = decode_field(record, 0, 12)
    city = decode_field(record, 296, 28)
    state = decode_field(record, 324, 2)
    normalized = normalize_name(fictitious_name)
    owners = [owner for index in range(OWNER_BLOCK_COUNT) if (owner := parse_owner(record, index))]
    filing_date = decode_field(record, 338, 8)
    fei = normalize_digits(decode_field(record, 373, 14), {9})
    return {
        "candidate_id": f"fl-fic:{document_number or member + ':' + str(row_number)}",
        "source_member": member,
        "source_row_number": row_number,
        "document_number": document_number,
        "fictitious_name_as_recorded": fictitious_name,
        "normalized_fictitious_name": normalized,
        "match_basis": "exact_public_name" if normalized in EXACT_PUBLIC_NAMES else "schoolhouse_phrase_candidate",
        "county": decode_field(record, 204, 12),
        "city": city,
        "state": state,
        "filing_date": filing_date,
        "status": decode_field(record, 351, 1),
        "cancellation_date": decode_field(record, 352, 8),
        "expiration_date": decode_field(record, 360, 8),
        "declared_owner_count": decode_field(record, 368, 5),
        "fictitious_name_fei": fei,
        "more_than_ten_owners": decode_field(record, 387, 1) == "Y",
        "owners": owners,
        "public_tampa_bay_city_match": bool(city and normalize_name(city) in {normalize_name(x) for x in PUBLIC_LOCATION_CITIES}),
        "filed_2023_or_later": bool(filing_date and filing_date[:4].isdigit() and int(filing_date[:4]) >= 2023),
        "identity_state": "fictitious_name_candidate_not_admitted",
        "street_address_retained": False,
        "postal_code_retained": False,
        "contact_details_retained": False,
        "private_support_rows": 0,
        "identity_admitted": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def download_source(
    destination: Path,
    username: str,
    password: str,
    retries: int,
) -> dict[str, Any]:
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            SOURCE_URL,
            headers={
                "User-Agent": USER_AGENT,
                "Authorization": f"Basic {token}",
                "Accept": "application/zip,application/octet-stream,*/*",
                "Accept-Encoding": "identity",
                "Connection": "close",
            },
        )
        started = time.monotonic()
        digest = hashlib.sha256()
        byte_count = 0
        try:
            with urllib.request.urlopen(request, timeout=180) as response, destination.open("wb") as output:
                status = int(getattr(response, "status", 200))
                if status != 200:
                    raise RuntimeError(f"HTTP {status}")
                headers = {key.lower(): value for key, value in response.headers.items()}
                declared_length = int(headers["content-length"]) if headers.get("content-length", "").isdigit() else None
                if declared_length != EXPECTED_SOURCE_BYTES:
                    raise RuntimeError(
                        f"source Content-Length drift: expected {EXPECTED_SOURCE_BYTES}, got {declared_length}"
                    )
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    digest.update(chunk)
                    byte_count += len(chunk)
                    if byte_count > EXPECTED_SOURCE_BYTES:
                        raise RuntimeError("source exceeded route-probe Content-Length")
                if byte_count != EXPECTED_SOURCE_BYTES:
                    raise RuntimeError(
                        f"source byte-count drift: expected {EXPECTED_SOURCE_BYTES}, got {byte_count}"
                    )
                return {
                    "status": status,
                    "attempt": attempt,
                    "retrieved_at": utc_now(),
                    "elapsed_seconds": round(time.monotonic() - started, 3),
                    "bytes": byte_count,
                    "sha256": digest.hexdigest(),
                    "content_type": headers.get("content-type"),
                    "content_length": declared_length,
                    "etag": headers.get("etag"),
                    "last_modified": headers.get("last-modified"),
                    "content_disposition": headers.get("content-disposition"),
                }
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
            last_error = exc
            destination.unlink(missing_ok=True)
            if attempt < retries:
                delay = min(20.0, 2.0 * (2 ** (attempt - 1)))
                print(f"download attempt {attempt}/{retries} failed: {exc}; retry in {delay:.1f}s", file=sys.stderr)
                time.sleep(delay)
    raise RuntimeError(f"source download failed after {retries} attempts: {last_error}")


def scan_archive(source: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    with zipfile.ZipFile(source, "r") as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise RuntimeError(f"ZIP integrity failure: {bad_member}")
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if not infos:
            raise RuntimeError("quarterly fictitious-name archive has no file members")
        for info in infos:
            if Path(info.filename).is_absolute() or ".." in Path(info.filename).parts:
                raise RuntimeError(f"unsafe ZIP member path: {info.filename}")
            span, framing = detect_record_span(archive, info)
            width_counts: Counter[int] = Counter()
            row_count = 0
            match_count = 0
            trailing_bytes = 0
            member_digest = hashlib.sha256()
            with archive.open(info, "r") as handle:
                while True:
                    block = read_exact(handle, span)
                    if not block:
                        break
                    if len(block) != span:
                        trailing_bytes += len(block)
                        member_digest.update(block)
                        break
                    member_digest.update(block)
                    record = block[:RECORD_LENGTH]
                    separator = block[RECORD_LENGTH:]
                    if framing == "fixed_width_crlf" and separator != b"\r\n":
                        raise RuntimeError(f"record framing drift in {info.filename} at row {row_count + 1}")
                    if framing == "fixed_width_lf" and separator != b"\n":
                        raise RuntimeError(f"record framing drift in {info.filename} at row {row_count + 1}")
                    width_counts[len(record)] += 1
                    row_count += 1
                    candidate = parse_candidate(record, info.filename, row_count)
                    if candidate is not None:
                        candidates.append(candidate)
                        match_count += 1
            member_receipts.append(
                {
                    "member": info.filename,
                    "compressed_bytes": info.compress_size,
                    "uncompressed_bytes": info.file_size,
                    "zip_crc32": f"{info.CRC:08x}",
                    "record_span": span,
                    "record_framing": framing,
                    "row_count": row_count,
                    "match_count": match_count,
                    "record_width_counts": {str(key): value for key, value in sorted(width_counts.items())},
                    "trailing_bytes": trailing_bytes,
                    "uncompressed_stream_sha256": member_digest.hexdigest(),
                    "state": "scanned",
                }
            )
    return candidates, member_receipts


def build_manifest(output: Path) -> None:
    files: list[dict[str, Any]] = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {"artifact-manifest.json", "SHA256SUMS"}:
            continue
        body = file.read_bytes()
        files.append({
            "path": file.relative_to(output).as_posix(),
            "bytes": len(body),
            "sha256": sha256_bytes(body),
        })
    write_json(
        output / "artifact-manifest.json",
        {
            "schema_version": "schoolhouse-fl-fictitious-artifact-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(files),
            "files": files,
            "raw_source_retained": False,
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
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
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--username", default=os.environ.get("FL_SFTP_USERNAME", "Public"))
    parser.add_argument("--password", default=os.environ.get("FL_SFTP_PASSWORD", ""))
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("FL_SFTP_PASSWORD is required for the official public bulk route")

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()

    source_path = Path("/tmp/florida-fictitious-quarterly.zip")
    source_path.unlink(missing_ok=True)
    print(f"acquiring {SOURCE_URL}", flush=True)
    source = download_source(source_path, args.username, args.password, args.retries)
    print(f"scanning {source['bytes']} source bytes", flush=True)
    candidates, members = scan_archive(source_path)
    source_path.unlink(missing_ok=True)

    candidates.sort(
        key=lambda row: (
            row.get("normalized_fictitious_name") or "",
            row.get("filing_date") or "",
            row.get("document_number") or "",
        )
    )
    candidate_ids = [row["candidate_id"] for row in candidates]
    if len(candidate_ids) != len(set(candidate_ids)):
        raise RuntimeError("candidate IDs are not unique")

    owner_charters = sorted({
        owner["owner_charter_number"]
        for row in candidates
        for owner in row["owners"]
        if owner.get("owner_charter_number")
    })
    owner_feis = sorted({
        owner["owner_fei"]
        for row in candidates
        for owner in row["owners"]
        if owner.get("owner_fei")
    })
    exact_public = [row for row in candidates if row["match_basis"] == "exact_public_name"]
    location_candidates = [row for row in candidates if row["public_tampa_bay_city_match"]]
    recent_candidates = [row for row in candidates if row["filed_2023_or_later"]]
    row_count = sum(member["row_count"] for member in members)

    source_receipt = {
        "schema_version": "schoolhouse-fl-fictitious-source-receipt@1",
        "source_url": SOURCE_URL,
        "publisher": "Florida Department of State, Division of Corporations",
        "dataset": "quarterly_fictitious_name_filings",
        "route_probe": ROUTE_PROBE,
        **source,
        "archive_member_count": len(members),
        "source_rows_scanned": row_count,
        "raw_source_retained": False,
        "public_credential_username": args.username,
        "public_credential_password_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    exact_tests = {
        "schema_version": "schoolhouse-fl-fictitious-exact-tests@1",
        "public_name_battery": sorted(EXACT_PUBLIC_NAMES),
        "exact_public_name_candidate_count": len(exact_public),
        "exact_public_name_candidates": exact_public,
        "tampa_bay_city_candidate_count": len(location_candidates),
        "tampa_bay_city_candidates": location_candidates,
        "filed_2023_or_later_candidate_count": len(recent_candidates),
        "filed_2023_or_later_candidates": recent_candidates,
        "unique_owner_charter_numbers": owner_charters,
        "unique_owner_feis": owner_feis,
        "identity_decision": "candidate_census_only_no_identity_admitted",
        "forbidden_inference": "A fictitious-name phrase match, owner name, FEI, or charter number is not automatically the School.House legal entity.",
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "identity_admitted": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    summary = {
        "schema_version": "schoolhouse-fl-fictitious-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "source_bytes": source["bytes"],
        "source_sha256": source["sha256"],
        "archive_members": len(members),
        "source_rows_scanned": row_count,
        "candidate_rows": len(candidates),
        "exact_public_name_candidates": len(exact_public),
        "tampa_bay_city_candidates": len(location_candidates),
        "filed_2023_or_later_candidates": len(recent_candidates),
        "unique_owner_charter_numbers": len(owner_charters),
        "unique_owner_feis": len(owner_feis),
        "all_members_scanned": all(member["state"] == "scanned" and member["trailing_bytes"] == 0 for member in members),
        "raw_source_retained": False,
        "street_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_json(output / "source-receipt.json", source_receipt)
    write_jsonl(output / "member-inventory.jsonl", members)
    write_jsonl(output / "fictitious-name-candidates.jsonl", candidates)
    write_json(output / "exact-tests.json", exact_tests)
    write_json(output / "summary.json", summary)
    build_manifest(output)
    print(compact(summary), flush=True)
    return 0 if summary["all_members_scanned"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
