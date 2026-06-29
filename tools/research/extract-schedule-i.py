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
import json
import os
import sys
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from typing import BinaryIO, Iterable, NamedTuple

NS = {"irs": "http://www.irs.gov/efile"}

DEFAULT_TARGET_NODE_IDS = (
    "charles-koch-foundation",
    "berggruen-institute",
    "new-america",
    "adl",
    "mercatus-center",
    "federalist-society",
)

RECIPIENT_PATHS = [
    ".//irs:RecipientTable",
    ".//irs:RecipientBusinessName",
    ".//irs:GrantOrContributionPdDurYrGrp",
]


class TargetOrg(NamedTuple):
    graph_node_id: str
    node_label: str


@dataclass
class GrantRow:
    graph_node_id: str
    node_label: str
    normalized_ein: str
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


def normalise_ein(ein: str) -> str:
    return "".join(character for character in ein if character.isdigit())


def load_target_eins(graph_path: str, node_ids: Iterable[str]) -> dict[str, TargetOrg]:
    with open(graph_path, encoding="utf-8") as graph_file:
        graph = json.load(graph_file)

    wanted = set(node_ids)
    seen: set[str] = set()
    targets: dict[str, TargetOrg] = {}
    for node in graph.get("nodes", []):
        node_id = node.get("id")
        if node_id not in wanted:
            continue
        seen.add(node_id)
        ein = normalise_ein(node.get("identifiers", {}).get("ein", ""))
        if not ein:
            print(f"warning: skipping {node_id}; missing identifiers.ein", file=sys.stderr)
            continue
        if len(ein) != 9:
            print(f"warning: skipping {node_id}; malformed EIN {node.get('identifiers', {}).get('ein')!r}", file=sys.stderr)
            continue
        targets[ein] = TargetOrg(node_id, node.get("label", node_id))

    for node_id in sorted(wanted - seen):
        print(f"warning: skipping {node_id}; node not found in {graph_path}", file=sys.stderr)
    if not targets:
        print(f"warning: no valid target EINs loaded from {graph_path}", file=sys.stderr)
    return targets


def parse_xml(handle: BinaryIO, source_zip: str, source_xml: str, target_eins: dict[str, TargetOrg]) -> list[GrantRow]:
    root = ET.parse(handle).getroot()
    ein = normalise_ein(text_at(root, ".//irs:EIN"))
    if ein not in target_eins:
        return []

    rows: list[GrantRow] = []
    for node in iter_recipient_nodes(root):
        amount = text_at(node, "irs:AmountOfCashGrant", "irs:CashGrantAmt", "irs:Amt")
        purpose = text_at(node, "irs:PurposeOfGrant", "irs:PurposeOfGrantTxt", "irs:GrantPurposeTxt")
        name = recipient_name(node)
        if name or amount or purpose:
            target = target_eins[ein]
            rows.append(GrantRow(target.graph_node_id, target.node_label, ein, name, amount, purpose, source_zip, source_xml))
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
    parser.add_argument("--graph", default="graph.json", help="Graph JSON path used as the EIN source of truth")
    parser.add_argument(
        "--target-node-id",
        action="append",
        dest="target_node_ids",
        help="Graph node id to include; repeat to override the default priority nonprofit set"
    )
    args = parser.parse_args()

    target_eins = load_target_eins(args.graph, args.target_node_ids or DEFAULT_TARGET_NODE_IDS)
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
                    rows.extend(parse_xml(handle, os.path.basename(zip_path), xml_name, target_eins))

    fieldnames = [field for field in GrantRow.__dataclass_fields__]
    with open(args.output, "w", newline="", encoding="utf-8") as out:
        writer = csv.DictWriter(out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(row.__dict__ for row in rows)

    print(f"Extracted {len(rows)} Schedule I rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
