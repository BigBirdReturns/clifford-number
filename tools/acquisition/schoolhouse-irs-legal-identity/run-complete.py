#!/usr/bin/env python3
"""Run the School.House IRS scan with complete official dataset schemas.

The nationwide Pub. 78, Form 990-N, and automatic-revocation bulk files are
pipe-delimited records without a header row. This wrapper supplies the field
order published in the IRS TEOS data dictionaries, searches legal and declared
DBA/sort-name fields, maps only the non-sensitive status fields used by the
candidate model, and delegates the remaining privacy-minimized receipt logic to
``run.py``.
"""

from __future__ import annotations

import csv
import importlib.util
import io
import zipfile
from pathlib import Path
from typing import Any

csv.field_size_limit(32 * 1024 * 1024)

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

SEARCH_NAME_FIELDS = {
    "eo_bmf": ["NAME", "SORT_NAME"],
    "publication_78": ["ORGANIZATION NAME"],
    "form_990n": [
        "ORGANIZATION NAME",
        "ORGANIZATION DOING BUSINESS AS NAME 1",
        "ORGANIZATION DOING BUSINESS AS NAME 2",
        "ORGANIZATION DOING BUSINESS AS NAME 3",
    ],
    "auto_revocation": ["ORGANIZATION NAME", "SORT NAME"],
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


def _prepare_row(source: dict[str, str], row: dict[str, Any]) -> tuple[dict[str, Any], str | None, str | None]:
    prepared = dict(row)
    if prepared.get("TIN") and not prepared.get("EIN"):
        prepared["EIN"] = prepared["TIN"]
    if source["dataset"] == "form_990n":
        prepared["CITY"] = prepared.get("ORGANIZATION MAILING ADDRESS CITY")
        prepared["STATE"] = prepared.get("ORGANIZATION MAILING ADDRESS STATE")
        prepared["COUNTRY"] = prepared.get("ORGANIZATION MAILING ADDRESS COUNTRY")
        prepared["TAX_PERIOD"] = prepared.get("TAX PERIOD END DATE")
        prepared["FILING_TYPE"] = "Form 990-N"
    elif source["dataset"] == "auto_revocation":
        prepared["SUBSECTION"] = prepared.get("SUB SECTION CODE")
        prepared["REINSTATEMENT_DATE"] = prepared.get("EXEMPTION REINSTATEMENT DATE")
    elif source["dataset"] == "publication_78":
        prepared["COUNTRY"] = prepared.get("FOREIGN COUNTRY")
        prepared["DEDUCTIBILITY"] = prepared.get("DEDUCTIBILITY CODE")

    fields = SEARCH_NAME_FIELDS[source["dataset"]]
    matches = [
        (field, MODULE.normalize_space(prepared.get(field)))
        for field in fields
        if MODULE.normalize_space(prepared.get(field))
        and MODULE.candidate_name(prepared.get(field))
    ]
    if not matches:
        return prepared, None, None
    match_field, match_name = matches[0]
    prepared["NAME"] = match_name
    return prepared, match_field, match_name


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
            prepared, match_field, match_name = _prepare_row(source, row)
            if not match_name:
                continue
            candidate = MODULE.sanitized_candidate(source, prepared, row_number)
            if candidate:
                legal_name = MODULE.normalize_space(row.get("ORGANIZATION NAME") or row.get("NAME"))
                candidate["legal_name_as_recorded"] = legal_name or candidate["legal_name_as_recorded"]
                candidate["normalized_name"] = MODULE.normalize_name(candidate["legal_name_as_recorded"])
                candidate["matched_name_as_recorded"] = match_name
                candidate["matched_name_field"] = match_field
                candidate["match_basis"] = "legal_name" if match_field in {"NAME", "ORGANIZATION NAME"} else "declared_sort_or_dba_name"
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
