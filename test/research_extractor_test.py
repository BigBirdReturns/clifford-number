#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import csv
import importlib.util
import io
import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "research" / "extract-schedule-i.py"
spec = importlib.util.spec_from_file_location("extract_schedule_i", MODULE_PATH)
extractor = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = extractor
spec.loader.exec_module(extractor)


def write_graph(payload: dict) -> str:
    handle = tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
    with handle:
        json.dump(payload, handle)
    return handle.name


def test_load_target_eins_skips_missing_and_malformed() -> None:
    graph_path = write_graph({
        "nodes": [
            {"id": "good-org", "label": "Good Org", "identifiers": {"ein": "12-3456789"}},
            {"id": "missing-org", "label": "Missing Org"},
            {"id": "bad-org", "label": "Bad Org", "identifiers": {"ein": "123"}}
        ]
    })
    stderr = io.StringIO()
    with contextlib.redirect_stderr(stderr):
        targets = extractor.load_target_eins(graph_path, ["good-org", "missing-org", "bad-org", "absent-org"])

    assert targets == {"123456789": extractor.TargetOrg("good-org", "Good Org")}
    warnings = stderr.getvalue()
    assert "missing identifiers.ein" in warnings
    assert "malformed EIN" in warnings
    assert "node not found" in warnings


def test_parse_xml_emits_graph_node_id_and_label() -> None:
    xml = b'''<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="http://www.irs.gov/efile">
  <ReturnHeader><Filer><EIN>123456789</EIN></Filer></ReturnHeader>
  <ReturnData><IRS990ScheduleI>
    <RecipientTable>
      <RecipientNameBusiness><BusinessNameLine1Txt>Recipient A</BusinessNameLine1Txt></RecipientNameBusiness>
      <AmountOfCashGrant>2500</AmountOfCashGrant>
      <PurposeOfGrantTxt>Research</PurposeOfGrantTxt>
    </RecipientTable>
  </IRS990ScheduleI></ReturnData>
</Return>'''
    rows = extractor.parse_xml(
        io.BytesIO(xml),
        "fixture.zip",
        "fixture.xml",
        {"123456789": extractor.TargetOrg("good-org", "Good Org")}
    )

    assert len(rows) == 1
    row = rows[0]
    assert row.graph_node_id == "good-org"
    assert row.node_label == "Good Org"
    assert row.normalized_ein == "123456789"
    assert row.recipient_name == "Recipient A"
    assert row.amount == "2500"
    assert row.purpose == "Research"


def test_valid_ein_without_schedule_i_rows_writes_header_only_csv() -> None:
    graph_path = write_graph({
        "nodes": [
            {"id": "good-org", "label": "Good Org", "identifiers": {"ein": "12-3456789"}}
        ]
    })
    xml = b'''<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="http://www.irs.gov/efile">
  <ReturnHeader><Filer><EIN>123456789</EIN></Filer></ReturnHeader>
  <ReturnData><IRS990ScheduleI></IRS990ScheduleI></ReturnData>
</Return>'''
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = Path(tmpdir) / "fixture.zip"
        output_path = Path(tmpdir) / "schedule_i.csv"
        with zipfile.ZipFile(zip_path, "w") as archive:
            archive.writestr("fixture.xml", xml)

        original_argv = sys.argv
        try:
            sys.argv = [
                "extract-schedule-i.py",
                str(zip_path),
                "--graph",
                graph_path,
                "--target-node-id",
                "good-org",
                "--output",
                str(output_path)
            ]
            assert extractor.main() == 0
        finally:
            sys.argv = original_argv

        with output_path.open(newline="", encoding="utf-8") as output_file:
            rows = list(csv.reader(output_file))

    assert rows == [[
        "graph_node_id",
        "node_label",
        "normalized_ein",
        "recipient_name",
        "amount",
        "purpose",
        "source_zip",
        "source_xml"
    ]]


if __name__ == "__main__":
    test_load_target_eins_skips_missing_and_malformed()
    test_parse_xml_emits_graph_node_id_and_label()
    test_valid_ein_without_schedule_i_rows_writes_header_only_csv()
    print("Research extractor tests OK.")
