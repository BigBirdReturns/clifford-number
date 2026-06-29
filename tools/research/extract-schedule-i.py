#!/usr/bin/env python3
"""Extract Schedule I grant rows for priority nonprofits from IRS TEOS XML ZIPs.

Usage:
  python3 tools/research/extract-schedule-i.py path/to/*_TEOS_XML_*.zip \
    --output schedule_i_grants.csv

The script is intentionally read-only against the graph: it emits reviewable CSV rows
that can be promoted through the import gate after source review.
"""
from __future__ import annotations

import argparse
import csv
import glob
import os
import sys
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from typing import BinaryIO, Iterable

NS = {"irs": "http://www.irs.gov/efile"}

TARGET_EINS = {
    "480918408": "Charles Koch Foundation",
    "465602320": "Berggruen Institute",
    "522096845": "New America Foundation",
    "131818723": "Anti-Defamation League",
    "541436224": "Mercatus Center",
    "363235550": "Federalist Society",
}

RECIPIENT_PATHS = [
    ".//irs:RecipientTable",
    ".//irs:RecipientBusinessName",
    ".//irs:GrantOrContributionPdDurYrGrp",
]


@dataclass
class GrantRow:
    filer_ein: str
    filer_name: str
    recipient_name: str
    amount: str
    purpose: str
    source_zip: str
    source_xml: str


def text_at(node: ET.Element, *paths: str) -> str:
    for path in paths:
        found = node.find(path, NS)
        if found is not None and found.text:
            return " ".join(found.text.split())
    return ""


def recipient_name(node: ET.Element) -> str:
    return text_at(
        node,
        "irs:RecipientNameBusiness/irs:BusinessNameLine1Txt",
        "irs:RecipientNameBusiness/irs:BusinessNameLine1",
        "irs:BusinessNameLine1Txt",
        "irs:BusinessNameLine1",
        "irs:RecipientPersonNm",
        "irs:RecipientName",
    )


def iter_recipient_nodes(root: ET.Element) -> Iterable[ET.Element]:
    seen = set()
    for path in RECIPIENT_PATHS:
        for node in root.findall(path, NS):
            marker = id(node)
            if marker not in seen:
                seen.add(marker)
                yield node


def parse_xml(handle: BinaryIO, source_zip: str, source_xml: str) -> list[GrantRow]:
    root = ET.parse(handle).getroot()
    ein = text_at(root, ".//irs:EIN")
    if ein not in TARGET_EINS:
        return []

    rows: list[GrantRow] = []
    for node in iter_recipient_nodes(root):
        amount = text_at(node, "irs:AmountOfCashGrant", "irs:CashGrantAmt", "irs:Amt")
        purpose = text_at(node, "irs:PurposeOfGrant", "irs:PurposeOfGrantTxt", "irs:GrantPurposeTxt")
        name = recipient_name(node)
        if name or amount or purpose:
            rows.append(GrantRow(ein, TARGET_EINS[ein], name, amount, purpose, source_zip, source_xml))
    return rows


def expand_inputs(patterns: list[str]) -> list[str]:
    paths: list[str] = []
    for pattern in patterns:
        matches = glob.glob(pattern)
        paths.extend(matches if matches else [pattern])
    return sorted(dict.fromkeys(paths))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zipfiles", nargs="+", help="IRS TEOS XML ZIP files or glob patterns")
    parser.add_argument("--output", default="schedule_i_grants.csv", help="CSV output path")
    args = parser.parse_args()

    rows: list[GrantRow] = []
    for zip_path in expand_inputs(args.zipfiles):
        if not os.path.exists(zip_path):
            print(f"warning: missing input {zip_path}", file=sys.stderr)
            continue
        with zipfile.ZipFile(zip_path) as archive:
            for xml_name in archive.namelist():
                if not xml_name.endswith(".xml"):
                    continue
                with archive.open(xml_name) as handle:
                    rows.extend(parse_xml(handle, os.path.basename(zip_path), xml_name))

    fieldnames = [field for field in GrantRow.__dataclass_fields__]
    with open(args.output, "w", newline="", encoding="utf-8") as out:
        writer = csv.DictWriter(out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(row.__dict__ for row in rows)

    print(f"Extracted {len(rows)} Schedule I rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
