#!/usr/bin/env python3
"""Align the public cross-corpus receipt count with the receipt ledger."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ledger_path = ROOT / "data/ledger/receipts.jsonl"
map_path = ROOT / "data/research/clifford-cross-corpus-public-interest-map.json"

receipts = [
    json.loads(line)
    for line in ledger_path.read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.lstrip().startswith("#")
]
receipt_ids = [row["receipt_id"] for row in receipts]
if len(receipt_ids) != len(set(receipt_ids)):
    raise RuntimeError("receipt ledger contains duplicate receipt IDs")
if len(receipts) != 31:
    raise RuntimeError(f"expected 31 current ledger receipts after custody integration, got {len(receipts)}")

public_map = json.loads(map_path.read_text(encoding="utf-8"))
public_map["inventory"]["canonical"]["receipts"] = len(receipts)
public_map["inventory"]["interpretation"] = (
    "These counts describe different record types and universes. They are displayed "
    "side by side, never collapsed into one misleading total. The canonical receipt "
    "count includes eleven immutable structured extracts used only for the first two "
    "thesis case-intake custody packets; those extracts add no hop, finding, promoted "
    "thesis evidence, review clearance, or graph effect. Live crawl and fanout counts "
    "are monotonic lower bounds because official-record intake may advance independently."
)
map_path.write_text(json.dumps(public_map, indent=2) + "\n", encoding="utf-8")
print("update-receipt-custody-map: 31 ledger receipts; 11 thesis intake extracts remain graph-inert")
