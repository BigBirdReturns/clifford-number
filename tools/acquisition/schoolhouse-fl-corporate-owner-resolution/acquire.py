#!/usr/bin/env python3
"""Resolve Florida corporate records for owner charter numbers in School.House phrase candidates.

The runner reads the fifteen public owner charter numbers already preserved in
the permanent Florida fictitious-name candidate census. Florida publishes its
quarterly corporate denominator as ten ZIP members partitioned by the final
digit of the corporate document number. This runner reads the remote ZIP
central directory through bounded authenticated HTTP range requests, downloads
only the seven complete partitions needed for the frozen charter set, scans
those partitions in full, and retains only exact corporate-document matches.

Principal, mailing, registered-agent, and officer addresses, ZIP codes, phone
numbers, email addresses, private records, and private messages are excluded.
Public registered-agent names and officer names or titles are retained only for
exact matched corporate records. A resolved owner corporation is a typed
follow-up record, never an automatic School.House legal-identity join.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import os
import re
import shutil
import struct
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zlib
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO, Iterable

SOURCE_URL = "https://sftp.floridados.gov/Public/doc/quarterly/cor/cordata.zip"
EXPECTED_SOURCE_BYTES = 1_819_049_954
RECORD_LENGTH = 1_440
TAIL_WINDOW = 131_072
MAX_CENTRAL_DIRECTORY_BYTES = 4 * 1024 * 1024
MAX_LOCAL_HEADER_BYTES = 65_536
USER_AGENT = "CliffordNumber-SchoolHouse-Florida-CorporateOwnerResolution/1.0"
CANDIDATE_SOURCE = Path("data/intake/bvvc-defense-capital/schoolhouse-fl-fictitious-candidates.jsonl")
ROUTE_CUSTODY_SOURCE = Path("data/intake/bvvc-defense-capital/state-registry-route-custody.json")
FICTITIOUS_ADJUDICATION_SOURCE = Path("data/intake/bvvc-defense-capital/schoolhouse-fl-fictitious-adjudication.json")
EXPECTED_TARGET_CHARTERS = {
    "L16000000673",
    "L17000090349",
    "L20000357931",
    "L22000000212",
    "L22000358309",
    "L23000133581",
    "L23000411942",
    "L28059",
    "N12000000884",
    "N22000010097",
    "N96000004081",
    "P02000130432",
    "P07000017144",
    "P12000066520",
    "P17000074851",
}
EXPECTED_TARGET_DIGITS = {"0", "1", "2", "3", "4", "7", "9"}


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


def normalize_identifier(value: Any) -> str | None:
    text = re.sub(r"[^A-Za-z0-9]", "", str(value or "")).upper()
    return text if len(text) in {6, 12} and text[-1:].isdigit() else None


def normalize_fei(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 9 else None


def decode_field(record: bytes, start: int, length: int) -> str | None:
    value = record[start : start + length].decode("latin-1", errors="replace")
    value = normalize_space(value.replace("\x00", " "))
    return value or None


def parse_mmddyyyy(value: str | None) -> str | None:
    if not value or not re.fullmatch(r"\d{8}", value):
        return None
    month, day, year = value[:2], value[2:4], value[4:]
    if not ("01" <= month <= "12" and "01" <= day <= "31"):
        return None
    return f"{year}-{month}-{day}"


def public_auth_headers(username: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    return {
        "User-Agent": USER_AGENT,
        "Authorization": f"Basic {token}",
        "Accept": "application/zip,application/octet-stream,*/*",
        "Accept-Encoding": "identity",
        "Connection": "close",
    }


def redact_error(value: Any, username: str, password: str) -> str:
    text = str(value or "")
    for secret in (password, f"{username}:{password}"):
        if secret:
            text = text.replace(secret, "[REDACTED_PUBLIC_CREDENTIAL]")
    return normalize_space(text)[:2000]


class RemoteZipClient:
    def __init__(self, url: str, username: str, password: str, retries: int) -> None:
        self.url = url
        self.username = username
        self.password = password
        self.headers = public_auth_headers(username, password)
        self.retries = retries
        self.request_receipts: list[dict[str, Any]] = []
        self.source_headers: dict[str, str] = {}
        self.total_bytes = self._head()

    def _head(self) -> int:
        request = urllib.request.Request(self.url, headers=self.headers, method="HEAD")
        error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            started = time.monotonic()
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    status = int(getattr(response, "status", 200))
                    headers = {key.lower(): value for key, value in response.headers.items()}
                    if status != 200:
                        raise RuntimeError(f"HEAD returned HTTP {status}")
                    length = int(headers.get("content-length", "0"))
                    if length != EXPECTED_SOURCE_BYTES:
                        raise RuntimeError(
                            f"corporate source Content-Length drift: expected {EXPECTED_SOURCE_BYTES}, got {length}"
                        )
                    self.source_headers = headers
                    self.request_receipts.append(
                        {
                            "request_id": "head-source",
                            "method": "HEAD",
                            "requested_url": self.url,
                            "status": status,
                            "content_length": length,
                            "content_type": headers.get("content-type"),
                            "last_modified": headers.get("last-modified"),
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                            "attempt": attempt,
                            "state": "captured",
                        }
                    )
                    return length
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
                error = exc
                if attempt < self.retries:
                    time.sleep(min(15.0, 1.5 * (2 ** (attempt - 1))))
        raise RuntimeError(f"corporate source HEAD failed after {self.retries} attempts: {error}")

    def fetch_range(self, start: int, end: int, request_id: str) -> bytes:
        if start < 0 or end < start or end >= self.total_bytes:
            raise ValueError(f"invalid range {start}-{end} for {self.total_bytes}-byte source")
        expected = end - start + 1
        error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            headers = dict(self.headers)
            headers["Range"] = f"bytes={start}-{end}"
            request = urllib.request.Request(self.url, headers=headers, method="GET")
            started = time.monotonic()
            try:
                with urllib.request.urlopen(request, timeout=180) as response:
                    status = int(getattr(response, "status", 200))
                    response_headers = {key.lower(): value for key, value in response.headers.items()}
                    if status != 206:
                        raise RuntimeError(
                            f"range request {request_id} returned HTTP {status}; full-source fallback is forbidden"
                        )
                    content_range = response_headers.get("content-range")
                    expected_content_range = f"bytes {start}-{end}/{self.total_bytes}"
                    if content_range != expected_content_range:
                        raise RuntimeError(
                            f"range request {request_id} Content-Range drift: {content_range!r}"
                        )
                    body = response.read(expected + 1)
                    if len(body) != expected:
                        raise RuntimeError(
                            f"range request {request_id} byte-count drift: expected {expected}, got {len(body)}"
                        )
                    self.request_receipts.append(
                        {
                            "request_id": request_id,
                            "method": "GET_RANGE",
                            "range_start": start,
                            "range_end": end,
                            "bytes": len(body),
                            "sha256": sha256_bytes(body),
                            "status": status,
                            "content_range": content_range,
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                            "attempt": attempt,
                            "state": "captured",
                        }
                    )
                    return body
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
                error = exc
                if attempt < self.retries:
                    time.sleep(min(20.0, 2.0 * (2 ** (attempt - 1))))
        raise RuntimeError(
            f"range request {request_id} failed after {self.retries} attempts: "
            f"{redact_error(error, self.username, self.password)}"
        )

    def stream_range_to_file(self, start: int, end: int, destination: Path, request_id: str) -> dict[str, Any]:
        if start < 0 or end < start or end >= self.total_bytes:
            raise ValueError(f"invalid range {start}-{end} for {self.total_bytes}-byte source")
        expected = end - start + 1
        error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            headers = dict(self.headers)
            headers["Range"] = f"bytes={start}-{end}"
            request = urllib.request.Request(self.url, headers=headers, method="GET")
            destination.unlink(missing_ok=True)
            started = time.monotonic()
            digest = hashlib.sha256()
            byte_count = 0
            try:
                with urllib.request.urlopen(request, timeout=300) as response, destination.open("wb") as output:
                    status = int(getattr(response, "status", 200))
                    response_headers = {key.lower(): value for key, value in response.headers.items()}
                    if status != 206:
                        raise RuntimeError(
                            f"range stream {request_id} returned HTTP {status}; full-source fallback is forbidden"
                        )
                    content_range = response_headers.get("content-range")
                    expected_content_range = f"bytes {start}-{end}/{self.total_bytes}"
                    if content_range != expected_content_range:
                        raise RuntimeError(
                            f"range stream {request_id} Content-Range drift: {content_range!r}"
                        )
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        output.write(chunk)
                        digest.update(chunk)
                        byte_count += len(chunk)
                        if byte_count > expected:
                            raise RuntimeError(f"range stream {request_id} exceeded declared range")
                    if byte_count != expected:
                        raise RuntimeError(
                            f"range stream {request_id} byte-count drift: expected {expected}, got {byte_count}"
                        )
                    receipt = {
                        "request_id": request_id,
                        "method": "GET_RANGE_STREAM",
                        "range_start": start,
                        "range_end": end,
                        "bytes": byte_count,
                        "sha256": digest.hexdigest(),
                        "status": status,
                        "content_range": content_range,
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                        "attempt": attempt,
                        "state": "captured",
                    }
                    self.request_receipts.append(receipt)
                    return receipt
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
                error = exc
                destination.unlink(missing_ok=True)
                if attempt < self.retries:
                    time.sleep(min(30.0, 3.0 * (2 ** (attempt - 1))))
        raise RuntimeError(
            f"range stream {request_id} failed after {self.retries} attempts: "
            f"{redact_error(error, self.username, self.password)}"
        )


def parse_eocd(tail: bytes, tail_start: int, total_bytes: int) -> dict[str, int]:
    signature = b"PK\x05\x06"
    position = tail.rfind(signature)
    if position < 0:
        raise RuntimeError("ZIP end-of-central-directory record not found in bounded tail")
    if position + 22 > len(tail):
        raise RuntimeError("truncated ZIP end-of-central-directory record")
    (
        _signature,
        disk_number,
        central_disk,
        entries_on_disk,
        entries_total,
        central_size,
        central_offset,
        comment_length,
    ) = struct.unpack_from("<4s4H2IH", tail, position)
    if position + 22 + comment_length > len(tail):
        raise RuntimeError("ZIP comment extends beyond captured tail")
    if any(value in {0xFFFF, 0xFFFFFFFF} for value in (entries_on_disk, entries_total, central_size, central_offset)):
        raise RuntimeError("ZIP64 central directory is outside the bounded standard-ZIP contract")
    if disk_number != 0 or central_disk != 0 or entries_on_disk != entries_total:
        raise RuntimeError("multi-disk ZIP archives are outside the acquisition contract")
    if entries_total != 10:
        raise RuntimeError(f"expected 10 corporate partition members, found {entries_total}")
    if central_size <= 0 or central_size > MAX_CENTRAL_DIRECTORY_BYTES:
        raise RuntimeError(f"central-directory size outside bound: {central_size}")
    if central_offset + central_size > total_bytes:
        raise RuntimeError("central directory exceeds source byte boundary")
    return {
        "eocd_absolute_offset": tail_start + position,
        "entries_total": entries_total,
        "central_size": central_size,
        "central_offset": central_offset,
        "comment_length": comment_length,
    }


def parse_central_directory(data: bytes, expected_entries: int) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    position = 0
    while position < len(data):
        if position + 46 > len(data):
            raise RuntimeError("truncated central-directory entry")
        values = struct.unpack_from("<4s6H3I5H2I", data, position)
        if values[0] != b"PK\x01\x02":
            raise RuntimeError(f"unexpected central-directory signature at byte {position}")
        flags = values[3]
        compression_method = values[4]
        crc32 = values[7]
        compressed_size = values[8]
        uncompressed_size = values[9]
        filename_length = values[10]
        extra_length = values[11]
        comment_length = values[12]
        disk_start = values[13]
        local_header_offset = values[16]
        end = position + 46 + filename_length + extra_length + comment_length
        if end > len(data):
            raise RuntimeError("central-directory variable fields exceed captured bytes")
        filename_bytes = data[position + 46 : position + 46 + filename_length]
        encoding = "utf-8" if flags & 0x800 else "cp437"
        filename = filename_bytes.decode(encoding, errors="strict")
        if disk_start != 0:
            raise RuntimeError(f"member {filename} begins on unsupported disk {disk_start}")
        if flags & 0x1:
            raise RuntimeError(f"member {filename} is encrypted")
        if compression_method not in {0, 8}:
            raise RuntimeError(f"member {filename} uses unsupported compression method {compression_method}")
        match = re.search(r"([0-9])(?=\.[^.]+$)", Path(filename).name)
        if not match:
            raise RuntimeError(f"unable to derive final-digit partition from member name {filename}")
        entries.append(
            {
                "filename": filename,
                "partition_digit": match.group(1),
                "flags": flags,
                "compression_method": compression_method,
                "crc32": f"{crc32:08x}",
                "compressed_size": compressed_size,
                "uncompressed_size": uncompressed_size,
                "local_header_offset": local_header_offset,
            }
        )
        position = end
    if position != len(data) or len(entries) != expected_entries:
        raise RuntimeError(
            f"central-directory denominator drift: parsed {len(entries)} entries from {position}/{len(data)} bytes"
        )
    digits = {entry["partition_digit"] for entry in entries}
    if digits != set("0123456789"):
        raise RuntimeError(f"corporate partition digit set drift: {sorted(digits)}")
    return sorted(entries, key=lambda row: row["partition_digit"])


def resolve_member_data_offset(client: RemoteZipClient, entry: dict[str, Any]) -> dict[str, Any]:
    offset = entry["local_header_offset"]
    header = client.fetch_range(offset, offset + 29, f"local-header-{entry['partition_digit']}")
    values = struct.unpack("<4s5H3I2H", header)
    if values[0] != b"PK\x03\x04":
        raise RuntimeError(f"member {entry['filename']} local-header signature drift")
    flags = values[2]
    compression_method = values[3]
    filename_length = values[9]
    extra_length = values[10]
    if flags != entry["flags"] or compression_method != entry["compression_method"]:
        raise RuntimeError(f"member {entry['filename']} local/central metadata disagreement")
    if filename_length + extra_length > MAX_LOCAL_HEADER_BYTES:
        raise RuntimeError(f"member {entry['filename']} local variable header exceeds bound")
    variable = client.fetch_range(
        offset + 30,
        offset + 30 + filename_length + extra_length - 1,
        f"local-variable-header-{entry['partition_digit']}",
    ) if filename_length + extra_length else b""
    filename_bytes = variable[:filename_length]
    encoding = "utf-8" if flags & 0x800 else "cp437"
    local_filename = filename_bytes.decode(encoding, errors="strict")
    if local_filename != entry["filename"]:
        raise RuntimeError(f"member {entry['filename']} local filename disagreement: {local_filename}")
    data_offset = offset + 30 + filename_length + extra_length
    data_end = data_offset + entry["compressed_size"] - 1
    if data_end >= client.total_bytes:
        raise RuntimeError(f"member {entry['filename']} compressed data exceeds source boundary")
    return {**entry, "data_offset": data_offset, "data_end": data_end}


def decompress_member(
    compressed_path: Path,
    uncompressed_path: Path,
    entry: dict[str, Any],
) -> dict[str, Any]:
    digest = hashlib.sha256()
    crc32 = 0
    byte_count = 0
    started = time.monotonic()
    with compressed_path.open("rb") as source, uncompressed_path.open("wb") as output:
        if entry["compression_method"] == 0:
            while True:
                chunk = source.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                digest.update(chunk)
                crc32 = binascii.crc32(chunk, crc32)
                byte_count += len(chunk)
        else:
            decompressor = zlib.decompressobj(-15)
            while True:
                chunk = source.read(1024 * 1024)
                if not chunk:
                    break
                decoded = decompressor.decompress(chunk)
                if decoded:
                    output.write(decoded)
                    digest.update(decoded)
                    crc32 = binascii.crc32(decoded, crc32)
                    byte_count += len(decoded)
            decoded = decompressor.flush()
            if decoded:
                output.write(decoded)
                digest.update(decoded)
                crc32 = binascii.crc32(decoded, crc32)
                byte_count += len(decoded)
            if not decompressor.eof or decompressor.unused_data:
                raise RuntimeError(f"member {entry['filename']} deflate stream did not terminate exactly")
    crc_hex = f"{crc32 & 0xFFFFFFFF:08x}"
    if byte_count != entry["uncompressed_size"]:
        raise RuntimeError(
            f"member {entry['filename']} uncompressed-size drift: expected {entry['uncompressed_size']}, got {byte_count}"
        )
    if crc_hex != entry["crc32"]:
        raise RuntimeError(
            f"member {entry['filename']} CRC drift: expected {entry['crc32']}, got {crc_hex}"
        )
    return {
        "uncompressed_bytes": byte_count,
        "uncompressed_sha256": digest.hexdigest(),
        "crc32": crc_hex,
        "decompression_seconds": round(time.monotonic() - started, 3),
    }


def parse_officers(record: bytes) -> list[dict[str, Any]]:
    officers: list[dict[str, Any]] = []
    for index in range(6):
        base = 668 + index * 128
        title = decode_field(record, base, 4)
        actor_type = decode_field(record, base + 4, 1)
        name = decode_field(record, base + 5, 42)
        if not any((title, actor_type, name)):
            continue
        officers.append(
            {
                "officer_index": index + 1,
                "title_as_recorded": title,
                "actor_type": actor_type,
                "name_as_recorded": name,
                "street_address_retained": False,
                "postal_code_retained": False,
                "contact_details_retained": False,
            }
        )
    return officers


def parse_corporate_record(
    record: bytes,
    source_member: str,
    source_row_number: int,
    target_links: list[dict[str, Any]],
) -> dict[str, Any]:
    if len(record) != RECORD_LENGTH:
        raise ValueError(f"corporate record width must be {RECORD_LENGTH}, got {len(record)}")
    document_number = normalize_identifier(decode_field(record, 0, 12))
    if document_number is None:
        raise RuntimeError(f"target corporate record has invalid document number at {source_member}:{source_row_number}")
    file_date_raw = decode_field(record, 472, 8)
    last_transaction_raw = decode_field(record, 495, 8)
    report_rows = []
    for index, (year_start, date_start) in enumerate(((505, 510), (518, 523), (531, 536)), start=1):
        year = decode_field(record, year_start, 4)
        date_raw = decode_field(record, date_start, 8)
        if year or date_raw:
            report_rows.append(
                {
                    "report_index": index,
                    "year": year,
                    "filed_date_as_recorded": date_raw,
                    "filed_date": parse_mmddyyyy(date_raw),
                }
            )
    return {
        "corporate_record_id": f"fl-cor:{document_number}",
        "document_number": document_number,
        "source_member": source_member,
        "source_row_number": source_row_number,
        "corporation_name_as_recorded": decode_field(record, 12, 192),
        "status": decode_field(record, 204, 1),
        "filing_type": decode_field(record, 205, 15),
        "principal_city": decode_field(record, 304, 28),
        "principal_state": decode_field(record, 332, 2),
        "principal_country": decode_field(record, 344, 2),
        "file_date_as_recorded": file_date_raw,
        "file_date": parse_mmddyyyy(file_date_raw),
        "fei": normalize_fei(decode_field(record, 480, 14)),
        "more_than_six_officers": decode_field(record, 494, 1) == "Y",
        "last_transaction_date_as_recorded": last_transaction_raw,
        "last_transaction_date": parse_mmddyyyy(last_transaction_raw),
        "state_country": decode_field(record, 503, 2),
        "annual_reports": report_rows,
        "registered_agent_name_as_recorded": decode_field(record, 544, 42),
        "registered_agent_type": decode_field(record, 586, 1),
        "officers": parse_officers(record),
        "fictitious_candidate_links": target_links,
        "resolution_state": "exact_owner_charter_resolved",
        "schoolhouse_identity_state": "resolved_owner_entity_not_admitted_as_schoolhouse",
        "schoolhouse_identity_admitted": False,
        "street_address_retained": False,
        "mailing_address_retained": False,
        "postal_code_retained": False,
        "contact_details_retained": False,
        "private_support_rows": 0,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def split_line(line: bytes) -> tuple[bytes, str]:
    if line.endswith(b"\r\n"):
        return line[:-2], "crlf"
    if line.endswith(b"\n"):
        return line[:-1], "lf"
    if line.endswith(b"\r"):
        return line[:-1], "cr"
    return line, "none"


def scan_member(
    file: Path,
    entry: dict[str, Any],
    target_links: dict[str, list[dict[str, Any]]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    partition_digit = entry["partition_digit"]
    targets = {charter for charter in target_links if charter.endswith(partition_digit)}
    if not targets:
        raise RuntimeError(f"member {entry['filename']} has no frozen targets")
    target_counts: Counter[str] = Counter()
    matches: list[dict[str, Any]] = []
    physical_width_counts: Counter[int] = Counter()
    physical_separator_counts: Counter[str] = Counter()
    reassembly_mode_counts: Counter[str] = Counter()
    reassembly_groups: list[dict[str, Any]] = []
    physical_line_count = 0
    row_count = 0
    direct_record_count = 0
    reassembled_record_count = 0
    fragment_line_count = 0
    pending_payloads: list[bytes] = []
    pending_separators: list[str] = []
    pending_start_line: int | None = None
    started = time.monotonic()

    def accept(record: bytes, fragment_count: int, reassembly_mode: str, external_separator: str) -> None:
        nonlocal row_count
        if len(record) != RECORD_LENGTH:
            raise RuntimeError(f"logical corporate record width drift in {entry['filename']}: {len(record)}")
        row_count += 1
        document_number = normalize_identifier(decode_field(record, 0, 12))
        if document_number and not document_number.endswith(partition_digit):
            raise RuntimeError(
                f"member {entry['filename']} contains document {document_number} outside partition {partition_digit}"
            )
        if document_number in targets:
            target_counts[document_number] += 1
            parsed = parse_corporate_record(
                record,
                entry["filename"],
                row_count,
                target_links[document_number],
            )
            parsed["physical_fragment_count"] = fragment_count
            parsed["reassembly_mode"] = reassembly_mode
            parsed["external_separator"] = external_separator
            matches.append(parsed)

    def resolve_pending() -> tuple[bytes, str] | None:
        choices = [
            (b"".join(pending_payloads), "concatenate_fragments"),
            (b"\n".join(pending_payloads), "join_fragments_with_lf"),
            (b"\r\n".join(pending_payloads), "join_fragments_with_crlf"),
            (b"\r".join(pending_payloads), "join_fragments_with_cr"),
        ]
        for record, mode in choices:
            if len(record) == RECORD_LENGTH:
                return record, mode
        if pending_payloads and len(choices[0][0]) > RECORD_LENGTH:
            raise RuntimeError(
                f"fragment payloads exceeded corporate record width in {entry['filename']} "
                f"at lines {pending_start_line}-{physical_line_count}: "
                f"{[len(payload) for payload in pending_payloads]}"
            )
        return None

    with file.open("rb") as handle:
        while True:
            line = handle.readline(256 * 1024 + 1)
            if not line:
                break
            if len(line) > 256 * 1024 and not line.endswith((b"\n", b"\r")):
                raise RuntimeError(f"physical corporate line exceeds safety bound in {entry['filename']}")
            physical_line_count += 1
            payload, separator = split_line(line)
            physical_width_counts[len(payload)] += 1
            physical_separator_counts[separator] += 1
            if not pending_payloads and len(payload) == RECORD_LENGTH:
                direct_record_count += 1
                reassembly_mode_counts["direct_fixed_width_line"] += 1
                accept(payload, 1, "direct_fixed_width_line", separator)
                continue
            if len(payload) > RECORD_LENGTH and not pending_payloads:
                raise RuntimeError(
                    f"physical corporate line exceeds record width in {entry['filename']} "
                    f"at line {physical_line_count}: {len(payload)}"
                )
            if not pending_payloads:
                pending_start_line = physical_line_count
            pending_payloads.append(payload)
            pending_separators.append(separator)
            fragment_line_count += 1
            resolved = resolve_pending()
            if resolved is not None:
                record, mode = resolved
                reassembled_record_count += 1
                reassembly_mode_counts[mode] += 1
                accept(record, len(pending_payloads), mode, pending_separators[-1])
                reassembly_groups.append(
                    {
                        "logical_row_number": row_count,
                        "physical_line_start": pending_start_line,
                        "physical_line_end": physical_line_count,
                        "fragment_payload_widths": [len(payload) for payload in pending_payloads],
                        "physical_separator_states": pending_separators,
                        "reassembly_mode": mode,
                    }
                )
                pending_payloads = []
                pending_separators = []
                pending_start_line = None
    if pending_payloads:
        raise RuntimeError(
            f"unterminated corporate fragment group in {entry['filename']}: "
            f"{[len(payload) for payload in pending_payloads]}"
        )
    duplicates = {key: count for key, count in target_counts.items() if count > 1}
    if duplicates:
        raise RuntimeError(f"duplicate corporate document numbers in {entry['filename']}: {duplicates}")
    return matches, {
        "member": entry["filename"],
        "partition_digit": partition_digit,
        "target_charters": sorted(targets),
        "target_charter_count": len(targets),
        "target_match_counts": {charter: target_counts[charter] for charter in sorted(targets)},
        "row_count": row_count,
        "physical_line_count": physical_line_count,
        "direct_record_count": direct_record_count,
        "reassembled_record_count": reassembled_record_count,
        "fragment_line_count": fragment_line_count,
        "physical_record_width_counts": {str(key): value for key, value in sorted(physical_width_counts.items())},
        "physical_separator_counts": dict(sorted(physical_separator_counts.items())),
        "reassembly_mode_counts": dict(sorted(reassembly_mode_counts.items())),
        "reassembly_groups": reassembly_groups,
        "scan_seconds": round(time.monotonic() - started, 3),
        "state": "complete_partition_scanned",
    }


def load_targets() -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    candidates = [json.loads(line) for line in CANDIDATE_SOURCE.read_text(encoding="utf-8").splitlines() if line]
    links: dict[str, list[dict[str, Any]]] = defaultdict(list)
    target_rows: list[dict[str, Any]] = []
    for candidate in candidates:
        for owner in candidate.get("owners", []):
            charter = normalize_identifier(owner.get("owner_charter_number"))
            if not charter:
                continue
            link = {
                "fictitious_candidate_id": candidate["candidate_id"],
                "fictitious_name_as_recorded": candidate["fictitious_name_as_recorded"],
                "owner_name_as_recorded": owner.get("owner_name_as_recorded"),
                "owner_index": owner.get("owner_index"),
            }
            links[charter].append(link)
    if set(links) != EXPECTED_TARGET_CHARTERS:
        raise RuntimeError(
            f"frozen owner charter set drift: expected {sorted(EXPECTED_TARGET_CHARTERS)}, got {sorted(links)}"
        )
    for charter in sorted(links):
        target_rows.append(
            {
                "target_charter_number": charter,
                "partition_digit": charter[-1],
                "fictitious_candidate_links": links[charter],
                "selection_state": "frozen_from_permanent_fictitious_candidate_census",
                "street_address_retained": False,
                "postal_code_retained": False,
                "contact_details_retained": False,
                "private_support_rows": 0,
                "schoolhouse_identity_admitted": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    if {row["partition_digit"] for row in target_rows} != EXPECTED_TARGET_DIGITS:
        raise RuntimeError("frozen target partition-digit set drift")
    return dict(links), target_rows


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
            "schema_version": "schoolhouse-fl-corporate-owner-resolution-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(files),
            "files": files,
            "raw_source_retained": False,
            "street_address_rows_retained": 0,
            "postal_code_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "private_support_rows": 0,
            "schoolhouse_identity_admitted": False,
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
        raise SystemExit("FL_SFTP_PASSWORD is required for the official public corporate route")
    if not CANDIDATE_SOURCE.exists() or not ROUTE_CUSTODY_SOURCE.exists() or not FICTITIOUS_ADJUDICATION_SOURCE.exists():
        raise SystemExit("permanent state-registry predecessor custody is missing")

    route_custody = json.loads(ROUTE_CUSTODY_SOURCE.read_text(encoding="utf-8"))
    fictitious_adjudication = json.loads(FICTITIOUS_ADJUDICATION_SOURCE.read_text(encoding="utf-8"))
    if route_custody.florida["accessible_bulk_routes"][0]["content_length"] != EXPECTED_SOURCE_BYTES:
        raise RuntimeError("corporate route-custody byte count drift")
    if fictitious_adjudication["exact_tests"]["unique_owner_charter_numbers"] != sorted(EXPECTED_TARGET_CHARTERS):
        raise RuntimeError("fictitious adjudication owner-charter list drift")

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    started_at = utc_now()
    target_links, target_rows = load_targets()

    client = RemoteZipClient(SOURCE_URL, args.username, args.password, args.retries)
    tail_start = max(0, client.total_bytes - TAIL_WINDOW)
    tail = client.fetch_range(tail_start, client.total_bytes - 1, "zip-tail")
    eocd = parse_eocd(tail, tail_start, client.total_bytes)
    central = client.fetch_range(
        eocd["central_offset"],
        eocd["central_offset"] + eocd["central_size"] - 1,
        "zip-central-directory",
    )
    entries = parse_central_directory(central, eocd["entries_total"])
    selected_entries = [resolve_member_data_offset(client, entry) for entry in entries if entry["partition_digit"] in EXPECTED_TARGET_DIGITS]
    if len(selected_entries) != 7:
        raise RuntimeError(f"expected seven target partitions, found {len(selected_entries)}")

    corporate_records: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="schoolhouse-fl-corporate-owner-resolution-") as directory:
        temp_root = Path(directory)
        for entry in selected_entries:
            digit = entry["partition_digit"]
            print(
                f"acquiring corporate partition {digit}: {entry['filename']} "
                f"compressed={entry['compressed_size']} uncompressed={entry['uncompressed_size']}",
                flush=True,
            )
            compressed_path = temp_root / f"partition-{digit}.compressed"
            uncompressed_path = temp_root / f"partition-{digit}.txt"
            range_receipt = client.stream_range_to_file(
                entry["data_offset"],
                entry["data_end"],
                compressed_path,
                f"member-compressed-{digit}",
            )
            decompression = decompress_member(compressed_path, uncompressed_path, entry)
            compressed_path.unlink(missing_ok=True)
            matches, scan = scan_member(uncompressed_path, entry, target_links)
            uncompressed_path.unlink(missing_ok=True)
            corporate_records.extend(matches)
            member_receipts.append(
                {
                    **entry,
                    "selected_for_target_scan": True,
                    "compressed_range_receipt": range_receipt,
                    **decompression,
                    **scan,
                    "raw_compressed_member_retained": False,
                    "raw_uncompressed_member_retained": False,
                    "street_address_rows_retained": 0,
                    "postal_code_rows_retained": 0,
                    "contact_detail_rows_retained": 0,
                    "private_support_rows": 0,
                    "schoolhouse_identity_admitted": False,
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )

    corporate_records.sort(key=lambda row: row["document_number"])
    record_counts = Counter(row["document_number"] for row in corporate_records)
    resolution_rows: list[dict[str, Any]] = []
    for target in target_rows:
        charter = target["target_charter_number"]
        count = record_counts[charter]
        if count > 1:
            raise RuntimeError(f"target charter {charter} resolved to {count} corporate records")
        resolution_rows.append(
            {
                **target,
                "matched_corporate_record_count": count,
                "resolution_state": "exact_corporate_record_resolved" if count == 1 else "no_match_in_complete_final_digit_partition",
                "corporate_record_id": f"fl-cor:{charter}" if count == 1 else None,
                "schoolhouse_identity_state": "owner_entity_resolved_not_admitted_as_schoolhouse" if count == 1 else "owner_charter_unresolved_not_admitted_as_schoolhouse",
                "schoolhouse_identity_admitted": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    if len(resolution_rows) != 15 or any(row["matched_corporate_record_count"] not in {0, 1} for row in resolution_rows):
        raise RuntimeError("target resolution matrix is not terminal")

    selected_digits = [entry["partition_digit"] for entry in selected_entries]
    zip_index = {
        "schema_version": "schoolhouse-fl-corporate-remote-zip-index@1",
        "source_url": SOURCE_URL,
        "source_bytes": client.total_bytes,
        "source_last_modified": client.source_headers.get("last-modified"),
        "eocd": eocd,
        "central_directory_sha256": sha256_bytes(central),
        "members": [
            {
                **entry,
                "selected_for_target_scan": entry["partition_digit"] in EXPECTED_TARGET_DIGITS,
            }
            for entry in entries
        ],
        "declared_partitions": 10,
        "selected_partitions": selected_digits,
        "selected_partition_count": len(selected_digits),
        "target_charter_count": len(target_rows),
        "target_partition_rule": "official quarterly corporate partitions contain records whose document numbers end in the member digit",
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    source_receipt = {
        "schema_version": "schoolhouse-fl-corporate-owner-resolution-source-receipt@1",
        "source_url": SOURCE_URL,
        "publisher": "Florida Department of State, Division of Corporations",
        "dataset": "quarterly_corporate_filings",
        "route_custody_file": str(ROUTE_CUSTODY_SOURCE),
        "fictitious_adjudication_file": str(FICTITIOUS_ADJUDICATION_SOURCE),
        "source_bytes": client.total_bytes,
        "source_last_modified": client.source_headers.get("last-modified"),
        "remote_zip_members": 10,
        "selected_partitions": selected_digits,
        "selected_partition_count": len(selected_digits),
        "selected_compressed_bytes": sum(entry["compressed_size"] for entry in selected_entries),
        "selected_uncompressed_bytes": sum(entry["uncompressed_size"] for entry in selected_entries),
        "selected_partition_rows": sum(row["row_count"] for row in member_receipts),
        "target_charters": len(target_rows),
        "resolved_target_charters": sum(row["matched_corporate_record_count"] for row in resolution_rows),
        "unresolved_target_charters": sum(row["matched_corporate_record_count"] == 0 for row in resolution_rows),
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "raw_compressed_members_retained": False,
        "raw_uncompressed_members_retained": False,
        "public_credential_username": args.username,
        "public_credential_password_retained": False,
        "street_address_rows_retained": 0,
        "mailing_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "schoolhouse_identity_admitted": False,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    summary = {
        "schema_version": "schoolhouse-fl-corporate-owner-resolution-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "source_bytes": client.total_bytes,
        "remote_zip_members": 10,
        "target_partitions": len(selected_entries),
        "target_partition_digits": selected_digits,
        "target_charters": len(target_rows),
        "resolved_target_charters": sum(row["matched_corporate_record_count"] for row in resolution_rows),
        "unresolved_target_charters": sum(row["matched_corporate_record_count"] == 0 for row in resolution_rows),
        "corporate_records_retained": len(corporate_records),
        "selected_partition_rows_scanned": sum(row["row_count"] for row in member_receipts),
        "selected_compressed_bytes": sum(entry["compressed_size"] for entry in selected_entries),
        "selected_uncompressed_bytes": sum(entry["uncompressed_size"] for entry in selected_entries),
        "range_requests": len(client.request_receipts),
        "all_target_partitions_complete": len(member_receipts) == 7 and all(row["state"] == "complete_partition_scanned" for row in member_receipts),
        "all_target_charters_terminal": len(resolution_rows) == 15 and all(row["resolution_state"] in {"exact_corporate_record_resolved", "no_match_in_complete_final_digit_partition"} for row in resolution_rows),
        "full_source_downloaded": False,
        "raw_source_retained": False,
        "street_address_rows_retained": 0,
        "mailing_address_rows_retained": 0,
        "postal_code_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "schoolhouse_identity_admitted": False,
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
    write_jsonl(output / "owner-charter-targets.jsonl", target_rows)
    write_jsonl(output / "corporate-records.jsonl", corporate_records)
    write_jsonl(output / "resolution-matrix.jsonl", resolution_rows)
    write_json(output / "summary.json", summary)
    build_manifest(output)
    print(compact(summary), flush=True)
    return 0 if summary["all_target_partitions_complete"] and summary["all_target_charters_terminal"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
