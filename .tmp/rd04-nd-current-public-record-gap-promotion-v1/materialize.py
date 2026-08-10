#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import os
import pathlib
import sys
from typing import Any


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: pathlib.Path, value: Any) -> dict[str, Any]:
    data = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    path.write_bytes(data)
    return {"path": path.as_posix(), "bytes": len(data), "sha256": digest(data)}


def construct(work: pathlib.Path, receipt_path: pathlib.Path) -> None:
    root = work / os.environ["PRODUCT_ROOT"]
    assert not root.exists()
    root.mkdir(parents=True)

    def load_rel(name: str) -> Any:
        return load(work / name)

    matrix_path = work / os.environ["MATRIX_PATH"]
    matrix_bytes = matrix_path.read_bytes()
    assert len(matrix_bytes) == int(os.environ["MATRIX_BYTES"])
    assert digest(matrix_bytes) == os.environ["MATRIX_SHA256"]
    before = json.loads(matrix_bytes)
    candidate = load_rel(os.environ["CANDIDATE_PATH"])
    source = load_rel(os.environ["SOURCE_PATH"])
    decision = load_rel(os.environ["DECISION_PATH"])
    candidate_manifest = load_rel(os.environ["CANDIDATE_MANIFEST_PATH"])
    protocol = load_rel(os.environ["VALIDATION_PROTOCOL_PATH"])
    validation = load_rel(os.environ["CANDIDATE_VALIDATION_PATH"])

    assert candidate_manifest["payload_combined_sha256"] == os.environ["CANDIDATE_PAYLOAD_SHA256"]
    assert candidate["candidate_id"] == "RD04-ND-CURRENT-WAIVER-PUBLIC-RECORD-GAP-CANDIDATE"
    assert candidate["decision_id"] == "RD04-ND-CURRENT-WAIVER-PUBLIC-RECORD-GAP-DECISION"
    assert candidate["current_cell_sha256"] == os.environ["CURRENT_TARGET_SHA256"]
    assert candidate["proposed_cell_sha256"] == os.environ["PROPOSED_CELL_SHA256"]
    assert digest(canonical(candidate["proposed_cell"])) == os.environ["PROPOSED_CELL_SHA256"]
    assert candidate["validation_state"] == "unvalidated_exact_current_cell"
    assert candidate["promotion_authorized"] is False
    assert candidate["row_state_transition_in_candidate"] is False
    required = candidate["proposed_cell"]["evidence_source_ids"]
    defined = [row["source_id"] for row in source["source_records"]]
    assert len(required) == len(set(required)) == 7
    assert set(required) == set(defined)
    assert candidate["evidence_source_resolution"]["all_required_source_ids_defined"] is True
    assert decision["value"] == candidate["proposed_cell"]["value"]
    assert decision["typed_gap"] == candidate["proposed_cell"]["typed_gap"]

    assert protocol["candidate_id"] == candidate["candidate_id"]
    assert protocol["decision_id"] == candidate["decision_id"]
    assert protocol["current_cell_sha256"] == os.environ["CURRENT_TARGET_SHA256"]
    assert protocol["proposed_cell_sha256"] == os.environ["PROPOSED_CELL_SHA256"]
    assert protocol["evidence_source_ids_resolved"] is True
    assert protocol["validated_candidates"] == 1 and protocol["rejected_candidates"] == 0
    assert protocol["separate_promotion_product_authorized"] is True
    assert protocol["canonical_validation_merge_required_before_promotion"] is True
    assert protocol["promotion_executed_here"] is False
    assert protocol["maximum_field_terminalizations"] == 1
    assert protocol["maximum_matrix_updates"] == 1
    assert protocol["row_state_transition_authorized"] is False
    assert protocol["maximum_row_state_mutations"] == 0
    assert protocol["maximum_row_terminalizations"] == 0
    projected_counts = {
        "materialized_cells": 450,
        "terminal_cells": 228,
        "still_open_cells": 222,
        "terminal_substantive_cells": 118,
        "still_open_substantive_cells": 182,
        "terminal_units": 10,
        "class_closed": False,
    }
    projected_nd = {"terminal_fields": 8, "open_fields": 1, "row_state": "still_open"}
    assert protocol["projected_counts"] == projected_counts
    assert protocol["projected_north_dakota"] == projected_nd
    assert validation["validation_result"]["state"] == "validated_exact_current_cell"
    assert validation["validation_result"]["candidate_source_provenance_closed"] is True
    assert validation["validation_result"]["separate_promotion_product_authorized"] is True
    assert validation["projected_separate_promotion"]["counts"] == projected_counts
    assert validation["projected_separate_promotion"]["north_dakota"] == projected_nd
    assert validation["projected_separate_promotion"]["field_terminalizations"] == 1
    assert validation["projected_separate_promotion"]["matrix_updates"] == 1
    assert validation["projected_separate_promotion"]["row_state_mutations"] == 0
    assert validation["projected_separate_promotion"]["row_terminalizations"] == 0

    counts_before = {
        "materialized_cells": 450,
        "terminal_cells": 227,
        "still_open_cells": 223,
        "terminal_substantive_cells": 117,
        "still_open_substantive_cells": 183,
        "terminal_units": 10,
        "class_closed": False,
    }
    for key, value in counts_before.items():
        assert before["counts"][key] == value
    assert before["counts"]["evidence_complete_cells"] == 197
    assert before["counts"]["observed_cells"] == 17
    assert before["counts"]["not_publicly_recovered_cells"] == 13

    nd_rows = [row for row in before["rows"] if row["unit_id"] == "US-STATE-ND"]
    assert len(nd_rows) == 1
    nd_before = nd_rows[0]
    assert digest(canonical(nd_before)) == os.environ["CURRENT_ROW_SHA256"]
    assert nd_before["row_state"] == "still_open"
    assert nd_before["terminal_fields"] == 7 and nd_before["open_fields"] == 2
    targets = [cell for cell in nd_before["cells"] if cell["field_id"] == candidate["field_id"]]
    row_states = [cell for cell in nd_before["cells"] if cell["field_id"] == "field_and_row_terminal_state"]
    assert len(targets) == len(row_states) == 1
    target_before = targets[0]
    row_state_before = row_states[0]
    assert digest(canonical(target_before)) == os.environ["CURRENT_TARGET_SHA256"]
    assert digest(canonical(row_state_before)) == os.environ["CURRENT_ROW_STATE_SHA256"]
    assert target_before["state"] == "still_open" and target_before["terminal"] is False

    promoted = copy.deepcopy(before)
    nd_after = [row for row in promoted["rows"] if row["unit_id"] == "US-STATE-ND"][0]
    target_index = next(index for index, cell in enumerate(nd_after["cells"]) if cell["field_id"] == candidate["field_id"])
    row_state_index = next(index for index, cell in enumerate(nd_after["cells"]) if cell["field_id"] == "field_and_row_terminal_state")
    nd_after["cells"][target_index] = copy.deepcopy(candidate["proposed_cell"])
    nd_after["terminal_fields"] = 8
    nd_after["open_fields"] = 1
    promoted["counts"]["not_publicly_recovered_cells"] = 14
    promoted["counts"]["terminal_cells"] = 228
    promoted["counts"]["still_open_cells"] = 222
    promoted["counts"]["terminal_substantive_cells"] = 118
    promoted["counts"]["still_open_substantive_cells"] = 182

    assert nd_after["row_state"] == "still_open"
    assert nd_after["cells"][row_state_index] == row_state_before
    assert digest(canonical(nd_after["cells"][row_state_index])) == os.environ["CURRENT_ROW_STATE_SHA256"]
    assert digest(canonical(nd_after["cells"][target_index])) == os.environ["PROPOSED_CELL_SHA256"]
    assert nd_after["cells"][target_index]["state"] == "not_publicly_recovered"
    assert nd_after["cells"][target_index]["terminal"] is True

    for old_row, new_row in zip(before["rows"], promoted["rows"], strict=True):
        if old_row["unit_id"] != "US-STATE-ND":
            assert old_row == new_row
            continue
        assert old_row.keys() == new_row.keys()
        for key in old_row:
            if key not in {"terminal_fields", "open_fields", "cells"}:
                assert old_row[key] == new_row[key]
        for index, (old_cell, new_cell) in enumerate(zip(old_row["cells"], new_row["cells"], strict=True)):
            if index != target_index:
                assert old_cell == new_cell

    all_cells = [cell for row in promoted["rows"] for cell in row["cells"]]
    substantive = [cell for cell in all_cells if cell["field_id"] != "field_and_row_terminal_state"]
    assert len(all_cells) == promoted["counts"]["materialized_cells"] == 450
    assert sum(bool(cell["terminal"]) for cell in all_cells) == promoted["counts"]["terminal_cells"] == 228
    assert sum(not bool(cell["terminal"]) for cell in all_cells) == promoted["counts"]["still_open_cells"] == 222
    assert sum(cell["state"] == "not_publicly_recovered" for cell in all_cells) == promoted["counts"]["not_publicly_recovered_cells"] == 14
    assert sum(bool(cell["terminal"]) for cell in substantive) == promoted["counts"]["terminal_substantive_cells"] == 118
    assert sum(not bool(cell["terminal"]) for cell in substantive) == promoted["counts"]["still_open_substantive_cells"] == 182
    assert sum(row["row_state"] != "still_open" for row in promoted["rows"]) == promoted["counts"]["terminal_units"] == 10
    assert promoted["counts"]["class_closed"] is False

    promoted_matrix_data = (json.dumps(promoted, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    promoted_matrix_sha = digest(promoted_matrix_data)
    promoted_row_sha = digest(canonical(nd_after))
    promoted_target_sha = digest(canonical(nd_after["cells"][target_index]))
    promoted_row_state_sha = digest(canonical(nd_after["cells"][row_state_index]))

    input_custody = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-input-custody@1",
        "issue": 1017,
        "lane_id": "RD-04",
        "class_id": "RD-04-C02",
        "canonical_parent": os.environ["CANONICAL_PARENT"],
        "promotion_id": os.environ["PROMOTION_ID"],
        "candidate_product": {
            "merge_commit": os.environ["CANDIDATE_MERGE"],
            "product_commit": os.environ["CANDIDATE_PRODUCT_COMMIT"],
            "product_tree": os.environ["CANDIDATE_PRODUCT_TREE"],
            "payload_sha256": os.environ["CANDIDATE_PAYLOAD_SHA256"],
            "candidate_path": os.environ["CANDIDATE_PATH"],
            "candidate_blob": os.environ["CANDIDATE_BLOB"],
            "source_blob": os.environ["SOURCE_BLOB"],
            "decision_blob": os.environ["DECISION_BLOB"],
            "manifest_blob": os.environ["CANDIDATE_MANIFEST_BLOB"],
        },
        "validation_product": {
            "merge_commit": os.environ["CANONICAL_PARENT"],
            "product_commit": os.environ["VALIDATION_PRODUCT_COMMIT"],
            "product_tree": os.environ["VALIDATION_PRODUCT_TREE"],
            "protocol_path": os.environ["VALIDATION_PROTOCOL_PATH"],
            "protocol_blob": os.environ["VALIDATION_PROTOCOL_BLOB"],
            "candidate_validation_path": os.environ["CANDIDATE_VALIDATION_PATH"],
            "candidate_validation_blob": os.environ["CANDIDATE_VALIDATION_BLOB"],
            "hosted_artifact_id": int(os.environ["VALIDATION_ARTIFACT_ID"]),
            "hosted_artifact_sha256": os.environ["VALIDATION_ARTIFACT_SHA256"],
        },
        "matrix_before": {
            "path": os.environ["MATRIX_PATH"],
            "git_blob_sha": os.environ["MATRIX_BLOB"],
            "bytes": len(matrix_bytes),
            "sha256": os.environ["MATRIX_SHA256"],
            "counts": copy.deepcopy(before["counts"]),
        },
        "north_dakota_before": {
            "row_sha256": os.environ["CURRENT_ROW_SHA256"],
            "target_cell_sha256": os.environ["CURRENT_TARGET_SHA256"],
            "row_state_cell_sha256": os.environ["CURRENT_ROW_STATE_SHA256"],
            "terminal_fields": 7,
            "open_fields": 2,
            "row_state": "still_open",
        },
        "proposed_cell_sha256": os.environ["PROPOSED_CELL_SHA256"],
        "source_requests": 0,
        "route_executions": 0,
        "source_admissions": 0,
        "outside_human_dependency": False,
    }

    promotion_decision = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-decision@1",
        "issue": 1017,
        "lane_id": "RD-04",
        "class_id": "RD-04-C02",
        "promotion_id": os.environ["PROMOTION_ID"],
        "candidate_id": candidate["candidate_id"],
        "decision_id": candidate["decision_id"],
        "promotion_authorized": True,
        "promotion_executed_here": True,
        "operation": "replace_exact_live_north_dakota_waiver_cell_with_validated_candidate_proposed_cell",
        "field_id": candidate["field_id"],
        "unit_id": "US-STATE-ND",
        "state_before": "still_open",
        "state_after": "not_publicly_recovered",
        "terminal_before": False,
        "terminal_after": True,
        "typed_gap_after": candidate["proposed_cell"]["typed_gap"],
        "current_cell_sha256": os.environ["CURRENT_TARGET_SHA256"],
        "promoted_cell_sha256": promoted_target_sha,
        "row_state_before": "still_open",
        "row_state_after": "still_open",
        "row_state_cell_sha256_before": os.environ["CURRENT_ROW_STATE_SHA256"],
        "row_state_cell_sha256_after": promoted_row_state_sha,
        "row_state_cell_byte_preserved": True,
        "authorized_delta": {
            "field_terminalizations": 1,
            "matrix_updates": 1,
            "row_state_mutations": 0,
            "row_terminalizations": 0,
            "class_closed": False,
        },
        "separate_row_state_reconciliation_required": True,
        "promotion_boundary": "candidate_cell_only_no_row_state_or_class_effect",
    }

    ledger = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-cell-promotion-ledger@1",
        "issue": 1017,
        "promotion_id": os.environ["PROMOTION_ID"],
        "entries": [{
            "unit_id": "US-STATE-ND",
            "field_id": candidate["field_id"],
            "field_ordinal": 4,
            "current_cell_sha256": os.environ["CURRENT_TARGET_SHA256"],
            "promoted_cell_sha256": promoted_target_sha,
            "state_transition": "still_open_to_not_publicly_recovered",
            "terminal_transition": "false_to_true",
            "evidence_source_ids": required,
            "authority_effect": candidate["proposed_cell"]["authority_effect"],
        }],
        "entry_count": 1,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
    }

    remaining = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-remaining-open-field-census@1",
        "issue": 1017,
        "lane_id": "RD-04",
        "class_id": "RD-04-C02",
        "unit_id": "US-STATE-ND",
        "terminal_fields_after": 8,
        "open_fields_after": 1,
        "substantive_open_fields_after": 0,
        "row_state_after": "still_open",
        "class_closed": False,
        "remaining_open_fields": [{
            "field_id": "field_and_row_terminal_state",
            "field_ordinal": 9,
            "cell_sha256": promoted_row_state_sha,
            "state": "still_open",
            "terminal": False,
            "typed_gap": row_state_before["typed_gap"],
            "custody": "byte_preserved_under_zero_row_state_mutation_authority",
        }],
        "separate_row_state_reconciliation_required": True,
        "automatic_row_terminalization_authorized": False,
        "automatic_class_closure_authorized": False,
    }

    receipt = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-receipt@1",
        "state": "complete",
        "issue": 1017,
        "promotion_id": os.environ["PROMOTION_ID"],
        "canonical_parent": os.environ["CANONICAL_PARENT"],
        "candidate_id": candidate["candidate_id"],
        "candidate_proposed_cell_sha256": os.environ["PROPOSED_CELL_SHA256"],
        "matrix_before_sha256": os.environ["MATRIX_SHA256"],
        "matrix_after_sha256": promoted_matrix_sha,
        "north_dakota_row_before_sha256": os.environ["CURRENT_ROW_SHA256"],
        "north_dakota_row_after_sha256": promoted_row_sha,
        "target_cell_before_sha256": os.environ["CURRENT_TARGET_SHA256"],
        "target_cell_after_sha256": promoted_target_sha,
        "row_state_cell_before_sha256": os.environ["CURRENT_ROW_STATE_SHA256"],
        "row_state_cell_after_sha256": promoted_row_state_sha,
        "row_state_cell_byte_preserved": True,
        "counts_before": counts_before,
        "counts_after": projected_counts,
        "north_dakota_before": {"terminal_fields": 7, "open_fields": 2, "row_state": "still_open"},
        "north_dakota_after": projected_nd,
        "source_requests": 0,
        "route_executions": 0,
        "source_admissions": 0,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "outside_human_dependency": False,
    }

    summary = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-summary@1",
        "issue": 1017,
        "promotion_id": os.environ["PROMOTION_ID"],
        "result": "validated_not_publicly_recovered_candidate_promoted_into_exact_north_dakota_waiver_cell",
        "candidate_id": candidate["candidate_id"],
        "decision_id": candidate["decision_id"],
        "matrix_before_sha256": os.environ["MATRIX_SHA256"],
        "matrix_after_sha256": promoted_matrix_sha,
        "target_cell_before_sha256": os.environ["CURRENT_TARGET_SHA256"],
        "target_cell_after_sha256": promoted_target_sha,
        "north_dakota_terminal_open_before": "7/2",
        "north_dakota_terminal_open_after": "8/1",
        "north_dakota_row_state": "still_open",
        "remaining_open_field": "field_and_row_terminal_state",
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "outside_human_dependency": False,
    }

    records: list[dict[str, Any]] = []
    for name, value in (
        ("promotion-input-custody.json", input_custody),
        ("promotion-decision.json", promotion_decision),
        ("cell-promotion-ledger.json", ledger),
    ):
        record = write_json(root / name, value)
        record["path"] = f"{os.environ['PRODUCT_ROOT']}/{name}"
        records.append(record)
    matrix_path_after = root / "promoted-partial-field-matrix.json"
    matrix_path_after.write_bytes(promoted_matrix_data)
    records.append({
        "path": f"{os.environ['PRODUCT_ROOT']}/promoted-partial-field-matrix.json",
        "bytes": len(promoted_matrix_data),
        "sha256": promoted_matrix_sha,
    })
    for name, value in (
        ("remaining-open-field-census.json", remaining),
        ("promotion-receipt.json", receipt),
        ("summary.json", summary),
    ):
        record = write_json(root / name, value)
        record["path"] = f"{os.environ['PRODUCT_ROOT']}/{name}"
        records.append(record)

    records = sorted(records, key=lambda row: row["path"])
    preimage = b"".join(
        row["path"].encode() + b"\0" + row["sha256"].encode() + b"\0" + str(row["bytes"]).encode() + b"\n"
        for row in records
    )
    payload_sha = digest(preimage)
    manifest = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-product-manifest@1",
        "issue": 1017,
        "lane_id": "RD-04",
        "class_id": "RD-04-C02",
        "canonical_parent": os.environ["CANONICAL_PARENT"],
        "promotion_id": os.environ["PROMOTION_ID"],
        "product_root": os.environ["PRODUCT_ROOT"],
        "permanent_path_count": 8,
        "addition_only": True,
        "workflow_or_transport_paths": 0,
        "self_describing_manifest_excluded_from_combined_payload": True,
        "payload_files": records,
        "payload_combined_sha256": payload_sha,
        "matrix_before": {
            "path": os.environ["MATRIX_PATH"],
            "git_blob_sha": os.environ["MATRIX_BLOB"],
            "bytes": len(matrix_bytes),
            "sha256": os.environ["MATRIX_SHA256"],
        },
        "matrix_after": {
            "path": f"{os.environ['PRODUCT_ROOT']}/promoted-partial-field-matrix.json",
            "bytes": len(promoted_matrix_data),
            "sha256": promoted_matrix_sha,
        },
        "semantic_counts": {
            "source_requests": 0,
            "route_executions": 0,
            "source_admissions": 0,
            "field_terminalizations": 1,
            "matrix_updates": 1,
            "row_state_mutations": 0,
            "row_terminalizations": 0,
            "class_closed": False,
            "outside_human_dependency": False,
        },
    }
    manifest_record = write_json(root / "product-manifest.json", manifest)

    construction = {
        "schema_version": "ssc-rd04-nd-current-public-record-gap-promotion-construction@1",
        "state": "constructed_and_semantically_verified",
        "promotion_id": os.environ["PROMOTION_ID"],
        "permanent_paths": 8,
        "payload_combined_sha256": payload_sha,
        "manifest_sha256": manifest_record["sha256"],
        "matrix_after_sha256": promoted_matrix_sha,
        "north_dakota_row_after_sha256": promoted_row_sha,
        "target_cell_after_sha256": promoted_target_sha,
        "row_state_cell_after_sha256": promoted_row_state_sha,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
    }
    receipt_path.write_text(json.dumps(construction, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def verify(root: pathlib.Path, out: pathlib.Path) -> None:
    manifest = load(root / "product-manifest.json")
    assert manifest["canonical_parent"] == os.environ["CANONICAL_PARENT"]
    assert manifest["promotion_id"] == os.environ["PROMOTION_ID"]
    assert manifest["permanent_path_count"] == 8 and manifest["addition_only"] is True
    assert manifest["workflow_or_transport_paths"] == 0
    rows = []
    for row in sorted(manifest["payload_files"], key=lambda item: item["path"]):
        data = (root / pathlib.PurePosixPath(row["path"]).name).read_bytes()
        actual = {"path": row["path"], "bytes": len(data), "sha256": digest(data)}
        assert actual == row, (actual, row)
        rows.append(actual)
    preimage = b"".join(
        row["path"].encode() + b"\0" + row["sha256"].encode() + b"\0" + str(row["bytes"]).encode() + b"\n"
        for row in rows
    )
    assert digest(preimage) == manifest["payload_combined_sha256"]
    matrix = load(root / "promoted-partial-field-matrix.json")
    expected = {
        "materialized_cells": 450,
        "terminal_cells": 228,
        "still_open_cells": 222,
        "not_publicly_recovered_cells": 14,
        "terminal_substantive_cells": 118,
        "still_open_substantive_cells": 182,
        "terminal_units": 10,
        "class_closed": False,
    }
    for key, value in expected.items():
        assert matrix["counts"][key] == value
    nd_rows = [row for row in matrix["rows"] if row["unit_id"] == "US-STATE-ND"]
    assert len(nd_rows) == 1
    nd = nd_rows[0]
    assert nd["terminal_fields"] == 8 and nd["open_fields"] == 1 and nd["row_state"] == "still_open"
    target = [cell for cell in nd["cells"] if cell["field_id"] == "abawd_or_work_requirement_waiver_state_and_governing_period"]
    row_state = [cell for cell in nd["cells"] if cell["field_id"] == "field_and_row_terminal_state"]
    assert len(target) == len(row_state) == 1
    assert digest(canonical(target[0])) == os.environ["PROPOSED_CELL_SHA256"]
    assert digest(canonical(row_state[0])) == os.environ["CURRENT_ROW_STATE_SHA256"]
    assert target[0]["state"] == "not_publicly_recovered" and target[0]["terminal"] is True
    receipt = load(root / "promotion-receipt.json")
    assert receipt["state"] == "complete"
    assert receipt["matrix_after_sha256"] == digest((root / "promoted-partial-field-matrix.json").read_bytes())
    assert receipt["field_terminalizations"] == receipt["matrix_updates"] == 1
    assert receipt["row_state_mutations"] == receipt["row_terminalizations"] == 0
    assert receipt["class_closed"] is False and receipt["outside_human_dependency"] is False
    result = {
        "state": "verified",
        "payload_combined_sha256": manifest["payload_combined_sha256"],
        "matrix_after_sha256": receipt["matrix_after_sha256"],
        "target_cell_after_sha256": receipt["target_cell_after_sha256"],
        "row_state_cell_after_sha256": receipt["row_state_cell_after_sha256"],
        "permanent_paths": 8,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
    }
    out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in {"construct", "verify"}:
        raise SystemExit("usage: materialize.py {construct WORK RECEIPT|verify ROOT RECEIPT}")
    mode = sys.argv[1]
    first = pathlib.Path(sys.argv[2])
    second = pathlib.Path(sys.argv[3])
    if mode == "construct":
        construct(first, second)
    else:
        verify(first, second)


if __name__ == "__main__":
    main()
