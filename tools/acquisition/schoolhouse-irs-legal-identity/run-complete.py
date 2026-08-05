#!/usr/bin/env python3
"""Run the School.House IRS scan with official headerless-file schemas.

The nationwide Pub. 78, Form 990-N, and automatic-revocation bulk files are
pipe-delimited records without a header row. The first acquisition preserved
those three source hashes but correctly produced no rows because their schemas
were unresolved. This wrapper supplies the field order published in the IRS
TEOS data dictionaries, then delegates the rest of the privacy-minimized
acquisition and receipt logic to ``run.py``.
"""

from __future__ import annotations

import csv
import importlib.util
import io
import zipfile
from pathlib import Path
from typing import Any

RUNNER = Path(__file__).with_name("run.py")
SPEC = importlib.util.spec_from_file_location("schoolhouse_irs_runner", RUNNER)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"unable to load runner: {RUNNER}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

HEADERLESS_FIELDS = {
    "publication_78": [
        "TIN",
        "ORGANIZATION NAME",
        "CITY",
        "STATE",
        "FOREIGN COUNTRY",
        "DEDUCTIBILITY CODE",
    ],
    "form_990n": [
        "EIN",
        "TAX YEAR",
        "ORGANIZATION NAME",
        "GROSS RECEIPTS NOT GREATER THAN",
        "ORGANIZATION HAS TERMINATED",
        "TAX PERIOD BEGIN DATE",
        "TAX PERIOD END DATE",
        "WEBSITE URL",
        "PRINCIPAL OFFICER NAME",
        "PRINCIPAL OFFICER ADDRESS LINE 1",
        "PRINCIPAL OFFICER ADDRESS LINE 2",
        "PRINCIPAL OFFICER ADDRESS CITY",
        "PRINCIPAL OFFICER ADDRESS PROVINCE",
        "PRINCIPAL OFFICER ADDRESS STATE",
        "PRINCIPAL OFFICER ADDRESS ZIP CODE",
        "PRINCIPAL OFFICER ADDRESS COUNTRY",
        "ORGANIZATION MAILING ADDRESS LINE 1",
        "ORGANIZATION MAILING ADDRESS LINE 2",
        "ORGANIZATION MAILING ADDRESS CITY",
        "ORGANIZATION MAILING ADDRESS PROVINCE",
        "ORGANIZATION MAILING ADDRESS STATE",
        "ORGANIZATION MAILING ADDRESS ZIP CODE",
        "ORGANIZATION MAILING ADDRESS COUNTRY",
        "ORGANIZATION DOING BUSINESS AS NAME 1",
        "ORGANIZATION DOING BUSINESS AS NAME 2",
        "ORGANIZATION DOING BUSINESS AS NAME 3",
    ],
    "auto_revocation": [
        "TIN",
        "ORGANIZATION NAME",
        "SORT NAME",
        "ADDRESS",
        "CITY",
        "STATE",
        "ZIP CODE",
        "COUNTRY",
        "SUB SECTION CODE",
        "REVOCATION DATE",
        "REVOCATION POSTING DATE",
        "EXEMPTION REINSTATEMENT DATE",
    ],
}


def _members(source: dict[str, str], data: bytes) -> list[tuple[str, bytes]]:
    if source["format"] == "csv":
        return [(Path(source["url"]).name, data)]
    rows: list[tuple[str, bytes]] = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith("/"):
                rows.append((name, archive.read(name)))
    return rows


def parse_tabular_bytes(source: dict[str, str], data: bytes) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    for member_name, member_data in _members(source, data):
        text = MODULE.decode_text(member_data)
        delimiter = MODULE.sniff_delimiter(text[:100000])
        expected_fields = HEADERLESS_FIELDS.get(source["dataset"])
        if expected_fields:
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter, fieldnames=expected_fields)
            first_row_number = 1
            schema_source = "official_irs_teos_data_dictionary"
        else:
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            first_row_number = 2
            schema_source = "embedded_header"
        if not reader.fieldnames:
            raise RuntimeError(f"unable to resolve schema for {source['source_id']} member {member_name}")
        row_count = 0
        match_count = 0
        width_counts: dict[str, int] = {}
        for row_number, row in enumerate(reader, start=first_row_number):
            row_count += 1
            overflow = row.pop(None, None)
            width = len(reader.fieldnames) + (len(overflow) if overflow else 0)
            width_counts[str(width)] = width_counts.get(str(width), 0) + 1
            candidate = MODULE.sanitized_candidate(source, row, row_number)
            if candidate:
                candidate["source_member"] = member_name
                candidate["schema_source"] = schema_source
                candidates.append(candidate)
                match_count += 1
        member_receipts.append(
            {
                "member": member_name,
                "bytes": len(member_data),
                "sha256": MODULE.sha256_bytes(member_data),
                "delimiter": delimiter,
                "fields": reader.fieldnames,
                "schema_source": schema_source,
                "row_width_counts": width_counts,
                "row_count": row_count,
                "match_count": match_count,
                "state": "scanned",
            }
        )
    return candidates, {"members": member_receipts}


MODULE.parse_tabular_bytes = parse_tabular_bytes

if __name__ == "__main__":
    raise SystemExit(MODULE.main())
