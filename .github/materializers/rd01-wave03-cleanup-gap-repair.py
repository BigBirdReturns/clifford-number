#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import subprocess
import sys


root = pathlib.Path(sys.argv[1]).resolve()
map_path = root / "data/research/clifford-cross-corpus-public-interest-map.json"
sources_path = root / "data/crawl/sources.json"
state_path = root / "data/crawl/state.json"

expected_blobs = {
    "data/research/clifford-cross-corpus-public-interest-map.json": "b8ac45bb2eaf0375cf57afcddc97ad6a44c81830",
    "data/crawl/sources.json": "8c7cde54c9193a4181ab748fbd0490301c4ba19e",
    "data/crawl/state.json": "4c5e5fcccfbc890edc4e849d7b5be06170341194",
}
for relative_path, expected_blob in expected_blobs.items():
    observed_blob = subprocess.check_output(
        ["git", "-C", str(root), "hash-object", relative_path],
        text=True,
    ).strip()
    if observed_blob != expected_blob:
        raise SystemExit(
            f"input blob moved for {relative_path}: expected {expected_blob}, observed {observed_blob}"
        )

public_map = json.loads(map_path.read_text(encoding="utf-8"))
sources = json.loads(sources_path.read_text(encoding="utf-8"))
state = json.loads(state_path.read_text(encoding="utf-8"))

lanes = {
    lane.get("lane_id"): lane
    for lane in public_map.get("lanes", [])
    if isinstance(lane, dict)
}
lane = lanes.get("official-research-fanout")
if not isinstance(lane, dict):
    raise SystemExit("official-research-fanout lane is missing")

current_gaps: list[tuple[str, str]] = []
for source in sources.get("sources", []):
    if not isinstance(source, dict) or source.get("enabled") is not True:
        continue
    source_id = source.get("id")
    if not isinstance(source_id, str) or not source_id:
        raise SystemExit("enabled crawl source lacks an id")
    source_state = state.get("sources", {}).get(source_id, {})
    status = source_state.get("status", "not_run")
    if status != "ok":
        current_gaps.append((source_id, status))

current_gaps.sort()
expected_current_gaps = [("sam-opportunities", "skipped_missing_credential")]
if current_gaps != expected_current_gaps:
    raise SystemExit(
        f"current crawl-gap lease moved: expected {expected_current_gaps!r}, observed {current_gaps!r}"
    )

if public_map.get("generated_at") != "2026-09-01":
    raise SystemExit("stale map generated_at no longer matches the reproduced defect")

counts = lane.get("counts")
if not isinstance(counts, dict) or counts.get("crawl_source_gaps") != 2:
    raise SystemExit("stale fanout lane no longer declares exactly two crawl-source gaps")

expected_stale_states = [
    {
        "source_id": "sam-opportunities",
        "status": "skipped_missing_credential",
        "interpretation": "Acquisition did not run; this is not a zero result.",
    },
    {
        "source_id": "sec-form-d",
        "status": "partial",
        "records_seen": 10,
        "failed_queries": 1,
        "failure_class": "upstream_503",
        "interpretation": "Coverage is incomplete; failed queries are not negative results.",
    },
]
if lane.get("crawl_source_gap_states") != expected_stale_states:
    raise SystemExit("stale fanout gap-state ledger does not match the reproduced two-gap defect")

old_narrative = (
    "The repository generated at least 316 inspectable research tasks; the live target branch may contain more as official-record intake advances. "
    "Batch count varies with the configured batch size and is presentation geometry, not a research-data count. "
    "Rejections, failed routes, source gaps, and inferred scout findings remain part of the discovery map rather than disappearing from it. "
    "The current committed crawl exposes two source gaps: SAM.gov did not execute because its credential is unavailable, and the SEC Form D run is partial because one configured query returned an upstream 503 while ten records were still observed. "
    "Neither state supports a zero-result interpretation or evidence of absence."
)
if lane.get("what_the_data_shows") != old_narrative:
    raise SystemExit("fanout gap narrative drifted from the reproduced defect")

counts["crawl_source_gaps"] = 1
lane["crawl_source_gap_states"] = [expected_stale_states[0]]
lane["what_the_data_shows"] = (
    "The repository generated at least 316 inspectable research tasks; the live target branch may contain more as official-record intake advances. "
    "Batch count varies with the configured batch size and is presentation geometry, not a research-data count. "
    "Rejections, failed routes, source gaps, and inferred scout findings remain part of the discovery map rather than disappearing from it. "
    "The current committed crawl exposes one source gap: SAM.gov did not execute because its credential is unavailable. "
    "The SEC Form D source completed successfully in the current crawl and is no longer represented as an active coverage gap. "
    "The remaining SAM state supports neither a zero-result interpretation nor evidence of absence."
)
public_map["generated_at"] = "2026-09-03"

map_path.write_text(
    json.dumps(public_map, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
