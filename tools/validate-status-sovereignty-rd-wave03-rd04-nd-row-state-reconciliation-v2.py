#!/usr/bin/env python3
from __future__ import annotations
import copy, hashlib, json, os, pathlib, subprocess

ROOT = pathlib.Path.cwd()
VROOT = ROOT / os.environ["VALIDATION_ROOT"]
MATRIX = ROOT / os.environ["MATRIX_PATH"]

PARENT = "de81b27c48b0ffec0db37b55e1b6eb9b58290524"
PARENT_TREE = "919775a3acbc19ff5a70de98409c02e2960f91f9"
MATRIX_BYTES = 495400
MATRIX_SHA = "1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824"
MATRIX_BLOB = "c25a1ad8fdfe82f70f1ff71e61da6796be94c737"
CURRENT_ROW_SHA = "0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e"
CURRENT_CELL_SHA = "6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3"
PROPOSED_CELL_SHA = "f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c"
PROJECTED_ROW_SHA = "f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b"
PROJECTED_MATRIX_BYTES = 498068
PROJECTED_MATRIX_SHA = "00eccb409909c07bb66a6ef5dd20b35215ed4da047cd6a4f581576d1056d7037"
PROJECTED_MATRIX_BLOB = "0da5d8d7a730836da60c86c0fb2f55f18c8af26d"
UNCHANGED_ROWS_SHA = "e9507cce90ced2d303b6d464968c4eeed630f2f058ba4302980c34f32f3e1105"
AUTHORITY = {
    "source_requests": 0,
    "route_executions": 0,
    "source_admissions": 0,
    "field_terminalizations": 0,
    "matrix_updates": 0,
    "row_state_mutations": 0,
    "row_terminalizations": 0,
    "class_closed": False,
    "cumulative_ledger_effect": "none",
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none",
    "outside_human_dependency": False,
}
EXPECTED_PATHS = [
    ".github/workflows/status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-validation-v2.yml",
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2/current-row-custody.json",
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2/row-state-validation.json",
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2/validated-row-state-protocol.json",
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2/summary.json",
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2/product-manifest.json",
    "tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v2.py",
]

def load(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))

def canon(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()

def json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()

def sha(data: bytes):
    return hashlib.sha256(data).hexdigest()

def blob(data: bytes):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def authority(value, label):
    assert value == AUTHORITY, f"{label} authority boundary mismatch"
    assert sorted(value) == sorted(AUTHORITY), f"{label} authority key mismatch"

raw = MATRIX.read_bytes()
assert len(raw) == MATRIX_BYTES and sha(raw) == MATRIX_SHA and blob(raw) == MATRIX_BLOB
matrix = json.loads(raw)
assert matrix["counts"]["terminal_cells"] == 228
assert matrix["counts"]["still_open_cells"] == 222
assert matrix["counts"]["terminal_substantive_cells"] == 118
assert matrix["counts"]["still_open_substantive_cells"] == 182
assert matrix["counts"]["terminal_units"] == 10
assert matrix["current_result"]["terminal_cells"] == "228/450"
assert matrix["current_result"]["still_open_cells"] == "222/450"
assert matrix["current_result"]["terminal_units"] == 10

nd = next(row for row in matrix["rows"] if row["unit_id"] == "US-STATE-ND")
assert sha(canon(nd)) == CURRENT_ROW_SHA
assert (nd["row_state"], nd["terminal_fields"], nd["open_fields"]) == ("still_open", 8, 1)
current = next(cell for cell in nd["cells"] if cell["field_id"] == "field_and_row_terminal_state")
assert sha(canon(current)) == CURRENT_CELL_SHA
assert current["state"] == "still_open" and current["terminal"] is False
evidence = [cell for cell in nd["cells"] if cell["field_id"] != "field_and_row_terminal_state"]
assert len(evidence) == 8 and all(cell["terminal"] for cell in evidence)
assert [cell["state"] for cell in evidence].count("evidence_complete") == 7
assert [cell["state"] for cell in evidence].count("not_publicly_recovered") == 1

custody = load(VROOT / "current-row-custody.json")
validation = load(VROOT / "row-state-validation.json")
protocol = load(VROOT / "validated-row-state-protocol.json")
summary = load(VROOT / "summary.json")
manifest = load(VROOT / "product-manifest.json")
for label, obj in [
    ("custody", custody), ("validation", validation), ("protocol", protocol),
    ("summary", summary), ("manifest", manifest),
]:
    authority(obj["authority_boundary"], label)

assert custody["schema_version"].endswith("@3")
assert custody["canonical_parent"] == PARENT and custody["canonical_parent_tree"] == PARENT_TREE
assert custody["canonical_topology"]["validation_product"] == "fa956db549bc5b023b1885dea03d2f4ebc404f46"
assert custody["canonical_topology"]["validation_merge"] == PARENT
assert custody["repair_scope"] == {
    "defect": "projected_matrix_current_result_retained_predecessor_totals",
    "changed_validation_paths": 7,
    "matrix_effect": "none_validation_only",
    "promotion_executed_here": False,
}
assert custody["matrix"]["git_blob_sha"] == MATRIX_BLOB
assert custody["north_dakota"]["row_sha256"] == CURRENT_ROW_SHA
assert custody["north_dakota"]["row_state_cell_sha256"] == CURRENT_CELL_SHA

assert validation["schema_version"].endswith("@3") and validation["canonical_parent"] == PARENT
proposed = validation["proposed_row_state_cell"]
assert sha(canon(proposed)) == PROPOSED_CELL_SHA
assert validation["proposed_row_state_cell_sha256"] == PROPOSED_CELL_SHA
assert validation["projected_row"] == {
    "row_sha256": PROJECTED_ROW_SHA,
    "row_state": "terminal_fixed_public_record_obligation_complete",
    "terminal_fields": 9,
    "open_fields": 0,
}
assert validation["validation_result"]["projection_repair"] == "current_result_reconciled_to_projected_counts"
assert validation["validation_result"]["promotion_executed_here"] is False

projected = copy.deepcopy(matrix)
after = next(row for row in projected["rows"] if row["unit_id"] == "US-STATE-ND")
after["row_state"] = "terminal_fixed_public_record_obligation_complete"
after["terminal_fields"] = 9
after["open_fields"] = 0
after["cells"][8] = copy.deepcopy(proposed)
projected["counts"].update({
    "evidence_complete_cells": 198,
    "still_open_cells": 221,
    "terminal_cells": 229,
    "row_terminal_state_cells_terminal": 11,
    "row_terminal_state_cells_open": 39,
    "terminal_units": 11,
    "postpromotion_nd_current_public_record_gap_row_state_candidate_cells": 1,
    "newly_terminalized_postpromotion_nd_current_public_record_gap_row_state_cells": 1,
})
terminal_ids = [
    row["unit_id"]
    for row in projected["rows"]
    if row["row_state"] == "terminal_fixed_public_record_obligation_complete"
]
projected["current_result"].update({
    "terminal_cells": "229/450",
    "still_open_cells": "221/450",
    "terminal_substantive_cells": 118,
    "still_open_substantive_cells": 182,
    "row_terminal_state_cells_terminal": 11,
    "row_terminal_state_cells_open": 39,
    "terminal_units": 11,
    "terminal_unit_ids": terminal_ids,
    "field_matrix_terminal": False,
    "class_state": "still_open",
    "class_closed": False,
})
raw2 = json_bytes(projected)
assert len(raw2) == PROJECTED_MATRIX_BYTES
assert sha(raw2) == PROJECTED_MATRIX_SHA and blob(raw2) == PROJECTED_MATRIX_BLOB
assert sha(canon(after)) == PROJECTED_ROW_SHA
non_target = [row for row in matrix["rows"] if row["unit_id"] != "US-STATE-ND"]
assert sha(b"".join(canon(row) + b"\n" for row in non_target)) == UNCHANGED_ROWS_SHA

declared = validation["projected_matrix"]
assert declared["bytes"] == PROJECTED_MATRIX_BYTES
assert declared["sha256"] == PROJECTED_MATRIX_SHA
assert declared["git_blob_sha"] == PROJECTED_MATRIX_BLOB
assert declared["current_result"] == {
    "terminal_cells": "229/450",
    "still_open_cells": "221/450",
    "terminal_substantive_cells": 118,
    "still_open_substantive_cells": 182,
    "row_terminal_state_cells_terminal": 11,
    "row_terminal_state_cells_open": 39,
    "terminal_units": 11,
    "terminal_unit_ids": terminal_ids,
    "field_matrix_terminal": False,
    "class_state": "still_open",
    "class_closed": False,
}
assert protocol["schema_version"].endswith("@3") and protocol["canonical_parent"] == PARENT
assert protocol["target"]["projected_matrix_bytes"] == PROJECTED_MATRIX_BYTES
assert protocol["target"]["projected_matrix_sha256"] == PROJECTED_MATRIX_SHA
assert protocol["target"]["projected_matrix_git_blob"] == PROJECTED_MATRIX_BLOB
assert protocol["required_current_result_after"] == declared["current_result"]
assert protocol["promotion_executed_here"] is False
assert summary["schema_version"].endswith("@3") and summary["canonical_parent"] == PARENT
assert summary["projected"]["current_result_reconciled"] is True
assert summary["candidate"]["projected_matrix_sha256"] == PROJECTED_MATRIX_SHA
assert summary["repair"]["semantic_transition_changed"] is False

assert set(manifest) == {
    "schema_version", "permanent_path_count", "hashed_file_count",
    "self_describing_manifest_excluded_from_combined_payload",
    "permanent_paths", "hashed_files", "combined_sha256",
    "repair_effect", "authority_boundary",
}
assert manifest["schema_version"] == "ssc-rd04-nd-row-state-reconciliation-validation-product-manifest@3"
assert manifest["permanent_path_count"] == 7 and manifest["hashed_file_count"] == 6
assert manifest["permanent_paths"] == EXPECTED_PATHS
assert manifest["repair_effect"] == {
    "modified_paths": 7,
    "matrix_updates": 0,
    "row_state_mutations": 0,
    "row_terminalizations": 0,
    "semantic_transition_changed": False,
}
expected_hashed = [path for path in EXPECTED_PATHS if not path.endswith("/product-manifest.json")]
assert [record["path"] for record in manifest["hashed_files"]] == expected_hashed
rows = []
for record in manifest["hashed_files"]:
    assert set(record) == {"path", "bytes", "sha256", "git_blob"}
    data = (ROOT / record["path"]).read_bytes()
    assert record == {
        "path": record["path"], "bytes": len(data),
        "sha256": sha(data), "git_blob": blob(data),
    }
    rows.append(f'{record["path"]}\0{record["sha256"]}\0{record["bytes"]}\n')
assert sha("".join(sorted(rows)).encode()) == manifest["combined_sha256"]

receipt = {
    "schema_version": "ssc-rd04-nd-row-state-reconciliation-projection-repair-hosted-validation@1",
    "state": "repaired_validation_projection_requires_separate_promotion",
    "canonical_parent": PARENT,
    "head": os.environ.get("VALIDATION_HEAD") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
    "current_row_sha256": CURRENT_ROW_SHA,
    "current_row_state_cell_sha256": CURRENT_CELL_SHA,
    "proposed_row_state_cell_sha256": PROPOSED_CELL_SHA,
    "projected_row_sha256": PROJECTED_ROW_SHA,
    "projected_matrix_bytes": PROJECTED_MATRIX_BYTES,
    "projected_matrix_sha256": PROJECTED_MATRIX_SHA,
    "projected_matrix_git_blob": PROJECTED_MATRIX_BLOB,
    "projected_current_result_reconciled": True,
    "validated_candidates": 1,
    "rejected_candidates": 0,
    "promotion_executed_here": False,
    "field_terminalizations": 0,
    "matrix_updates": 0,
    "row_state_mutations": 0,
    "row_terminalizations": 0,
    "class_closed": False,
    "outside_human_dependency": False,
}
print(json.dumps(receipt, indent=2, sort_keys=True))
