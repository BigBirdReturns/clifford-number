#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import stat
import sys
from typing import Any

EXPECTED_PARENT = '2aaadb3b87c83a8cf79ded7046a3856101bf943b'
EXPECTED_PARENT_TREE = '1a6690047ea1919fe4b63b1a4eb287b78459241b'
SOURCE_CANONICAL = '46036c01eaba31bdb18045307fe3ebcb67d576a6'
SOURCE_TREE = '0ffec7018bcfc038a73cd280970f783d12a5c222'
DATA_ROOT = Path('data/intake/schoolhouse-legal-identity-current-frontier-v1')
FRONTIER_PATH = Path('data/intake/bvvc-defense-capital/acquisition-frontier.json')
MANIFEST_PATH = Path('data/intake/bvvc-defense-capital/manifest.json')
SCHOOLHOUSE_PATH = Path('data/intake/bvvc-defense-capital/schoolhouse.json')
EXPECTED_PATHS = ['data/intake/bvvc-defense-capital/acquisition-frontier.json', 'data/intake/bvvc-defense-capital/manifest.json', 'data/intake/bvvc-defense-capital/schoolhouse.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/canonical-slice-manifest.jsonl', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/frontier-reconciliation.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/next-source-gate.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/product-manifest.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/source-custody.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/source-lanes.json', 'docs/milestones/schoolhouse-legal-identity-current-frontier-v1.md', 'tools/validate-schoolhouse-legal-identity-current-frontier.py']
EXPECTED_MODIFIED = ['data/intake/bvvc-defense-capital/acquisition-frontier.json', 'data/intake/bvvc-defense-capital/manifest.json', 'data/intake/bvvc-defense-capital/schoolhouse.json']
EXPECTED_ADDED = ['data/intake/schoolhouse-legal-identity-current-frontier-v1/canonical-slice-manifest.jsonl', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/frontier-reconciliation.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/next-source-gate.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/product-manifest.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/source-custody.json', 'data/intake/schoolhouse-legal-identity-current-frontier-v1/source-lanes.json', 'docs/milestones/schoolhouse-legal-identity-current-frontier-v1.md', 'tools/validate-schoolhouse-legal-identity-current-frontier.py']
AUTHORITY_KEYS = ['identity_admissions', 'relationship_admissions', 'negative_existence_claims', 'outside_human_dependency', 'publication_effect', 'adoption_effect', 'graph_effect', 'public_schoolhouse_legal_identity']


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def read_json(root: Path, relative: Path | str) -> dict[str, Any]:
    value = json.loads((root / relative).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise TypeError(relative)
    return value


def get_nested(value: Any, path: list[str]) -> Any:
    for key in path:
        value = value[key]
    return value


def validate_documents(docs: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    check = lambda condition, message: errors.append(message) if not condition else None
    pm = docs["product_manifest"]
    lanes = docs["source_lanes"]
    custody = docs["source_custody"]
    reconciliation = docs["reconciliation"]
    gate = docs["gate"]
    frontier = docs["frontier"]
    central_manifest = docs["central_manifest"]
    schoolhouse = docs["schoolhouse"]
    slice_rows = docs["slice_rows"]

    check(pm.get("canonical_parent") == EXPECTED_PARENT, "product parent drift")
    check(pm.get("canonical_parent_tree") == EXPECTED_PARENT_TREE, "product parent tree drift")
    check(pm.get("source_canonical_main") == SOURCE_CANONICAL, "source canonical drift")
    check(pm.get("source_canonical_tree") == SOURCE_TREE, "source tree drift")
    check(pm.get("permanent_paths") == EXPECTED_PATHS, "permanent path denominator drift")
    check(pm.get("modified_paths") == EXPECTED_MODIFIED, "modified path denominator drift")
    check(pm.get("added_paths") == EXPECTED_ADDED, "added path denominator drift")
    check(pm.get("permanent_path_count") == 11, "permanent path count drift")
    check(pm.get("workflow_path_count") == 0, "workflow path count must remain zero")
    check(pm.get("source_slice_files") == 233, "source slice denominator drift")
    check(pm.get("source_lanes") == 23, "source lane denominator drift")
    check(pm.get("central_projection_lanes") == 15, "central lane denominator drift")
    check(pm.get("post_cutoff_lanes") == 8, "post-cutoff lane denominator drift")
    check(pm.get("active_source_leases") == 0, "active source leases must remain zero")
    check(pm.get("candidate_successors") == 0, "candidate successors must remain zero")

    check(lanes.get("state") == "terminal_twenty_three_lane_reconciliation_public_schoolhouse_identity_unresolved", "lane state drift")
    lane_rows = lanes.get("lanes", [])
    check(len(lane_rows) == 23, "lane row count drift")
    check(len({row.get('lane_id') for row in lane_rows}) == 23, "lane IDs must be unique")
    check(sum(row.get("lane_class") == "central_projection" for row in lane_rows) == 15, "central lane rows drift")
    check(sum(row.get("lane_class") == "post_cutoff_permanent" for row in lane_rows) == 8, "post-cutoff lane rows drift")
    check(all(row.get("replay_authorized") is False for row in lane_rows), "identical replay must remain unauthorized")
    check(all(row.get("successor_candidates") == 0 for row in lane_rows), "lane successors must remain zero")

    check(custody.get("source_canonical_main") == SOURCE_CANONICAL, "custody source canonical drift")
    check(custody.get("source_canonical_tree") == SOURCE_TREE, "custody source tree drift")
    check(custody.get("exported_files") == 233, "custody exported file denominator drift")
    check(custody.get("source_lanes") == 23, "custody source lane denominator drift")
    check(custody.get("source_requests") == 0 and custody.get("registry_queries") == 0 and custody.get("form_submissions") == 0, "custody must remain request-free")

    check(reconciliation.get("state") == "terminal_twenty_three_lane_reconciliation_public_schoolhouse_identity_unresolved", "reconciliation state drift")
    check(reconciliation.get("decision", {}).get("public_schoolhouse_legal_identity") == "unresolved", "identity decision drift")
    check(reconciliation.get("active_source_leases") == 0, "reconciliation active leases drift")
    check(reconciliation.get("candidate_successors") == [], "reconciliation successor queue must remain empty")

    check(gate.get("state") == "armed_changed_input_gate_no_active_source_leases_no_candidate_successors", "changed-input gate state drift")
    check(gate.get("active_source_leases") == 0, "gate active leases drift")
    check(gate.get("candidate_successors") == [], "gate successor queue drift")
    check(len(gate.get("frozen_lane_ids", [])) == 23, "gate frozen lane denominator drift")
    check(gate.get("identical_replay_authorized") is False, "identical replay must remain refused")

    task = next((row for row in frontier.get("tasks", []) if row.get("task_id") == "bvvc-frontier-schoolhouse-legal-governance"), None)
    check(task is not None, "School.House frontier task missing")
    if task is not None:
        current = task.get("current_frontier_reconciliation", {})
        check(current.get("source_lanes") == 23, "central frontier source lanes drift")
        check(current.get("source_slice_files") == 233, "central frontier source slice drift")
        check(current.get("active_source_leases") == 0, "central frontier active leases drift")
        check(current.get("candidate_successors") == 0, "central frontier successors drift")
        check(current.get("public_schoolhouse_legal_identity") == "unresolved", "central frontier identity drift")

    projection = schoolhouse.get("legal_identity_current_frontier", {})
    check(projection.get("source_lanes") == 23, "School.House projection lane count drift")
    check(projection.get("source_slice_files") == 233, "School.House projection source slice drift")
    check(projection.get("active_source_leases") == 0, "School.House projection active leases drift")
    check(projection.get("candidate_successors") == 0, "School.House projection successors drift")
    check(projection.get("public_schoolhouse_legal_identity") == "unresolved", "School.House projection identity drift")

    check(central_manifest.get("counts", {}).get("schoolhouse_legal_identity_source_lanes") == 23, "central manifest source lane count drift")
    check(central_manifest.get("counts", {}).get("schoolhouse_legal_identity_source_slice_files") == 233, "central manifest source slice count drift")
    check(central_manifest.get("counts", {}).get("schoolhouse_legal_identity_active_source_leases") == 0, "central manifest active leases drift")
    check(central_manifest.get("counts", {}).get("schoolhouse_legal_identity_candidate_successors") == 0, "central manifest successors drift")

    check(len(slice_rows) == 233, "canonical slice row count drift")
    check(len({row.get('path') for row in slice_rows}) == 233, "canonical slice paths must be unique")
    check(sum(row.get("product_disposition") == "modified_projection" for row in slice_rows) == 3, "modified source projection denominator drift")
    check(sum(row.get("product_disposition") == "unchanged_source" for row in slice_rows) == 230, "unchanged source denominator drift")

    authority_values = [pm, lanes, custody, reconciliation, gate, projection]
    authority_values.extend(row.get("authority", {}) for row in lane_rows)
    for index, value in enumerate(authority_values):
        auth = value.get("authority", value)
        check(auth.get("identity_admissions") == 0, f"authority {index} identity admission drift")
        check(auth.get("relationship_admissions") == 0, f"authority {index} relationship admission drift")
        check(auth.get("negative_existence_claims") == 0, f"authority {index} negative-existence drift")
        check(auth.get("outside_human_dependency") is False, f"authority {index} outside-human drift")
        check(auth.get("publication_effect") == "none", f"authority {index} publication drift")
        check(auth.get("adoption_effect") == "none", f"authority {index} adoption drift")
        check(auth.get("graph_effect") == "none", f"authority {index} graph drift")

    return errors


def load_documents(root: Path) -> dict[str, Any]:
    slice_rows = [json.loads(line) for line in (root / DATA_ROOT / "canonical-slice-manifest.jsonl").read_text(encoding="utf-8").splitlines() if line]
    return {
        "product_manifest": read_json(root, DATA_ROOT / "product-manifest.json"),
        "source_lanes": read_json(root, DATA_ROOT / "source-lanes.json"),
        "source_custody": read_json(root, DATA_ROOT / "source-custody.json"),
        "reconciliation": read_json(root, DATA_ROOT / "frontier-reconciliation.json"),
        "gate": read_json(root, DATA_ROOT / "next-source-gate.json"),
        "frontier": read_json(root, FRONTIER_PATH),
        "central_manifest": read_json(root, MANIFEST_PATH),
        "schoolhouse": read_json(root, SCHOOLHOUSE_PATH),
        "slice_rows": slice_rows,
    }


def validate_files(root: Path, docs: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    pm = docs["product_manifest"]
    for relative, expected in pm.get("file_digests", {}).items():
        path = root / relative
        if not path.is_file():
            errors.append(f"manifest-bound file missing: {relative}")
            continue
        data = path.read_bytes()
        if len(data) != expected.get("bytes"):
            errors.append(f"{relative} byte-count drift")
        if sha256(data) != expected.get("sha256"):
            errors.append(f"{relative} SHA-256 drift")

    modified = set(EXPECTED_MODIFIED)
    for row in docs["slice_rows"]:
        path = root / row["path"]
        if not path.is_file():
            errors.append(f"source slice file missing: {row['path']}")
            continue
        data = path.read_bytes()
        if row["path"] in modified:
            if sha256(data) == row["sha256"]:
                errors.append(f"modified projection did not change: {row['path']}")
        else:
            if len(data) != row["bytes"] or sha256(data) != row["sha256"] or git_blob(data) != row["git_blob"]:
                errors.append(f"unchanged source blob drift: {row['path']}")
            executable = bool(path.stat().st_mode & stat.S_IXUSR)
            if executable != (row["mode"] == "100755"):
                errors.append(f"unchanged source mode drift: {row['path']}")

    central_manifest = docs["central_manifest"]
    for relative in ["acquisition-frontier.json", "schoolhouse.json"]:
        path = root / "data/intake/bvvc-defense-capital" / relative
        expected = central_manifest["files"][relative]
        data = path.read_bytes()
        if len(data) != expected["bytes"] or sha256(data) != expected["sha256"]:
            errors.append(f"central manifest binding drift: {relative}")
    return errors


def validate_lane_sources(root: Path, docs: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    task = next(row for row in docs["frontier"]["tasks"] if row["task_id"] == "bvvc-frontier-schoolhouse-legal-governance")
    for row in docs["source_lanes"]["lanes"]:
        if row["lane_class"] == "central_projection":
            observed = task[row["projection_key"]]["state"]
        else:
            source = read_json(root, row["source_file"])
            observed = get_nested(source, row["state_path"])
        if observed != row["terminal_state"]:
            errors.append(f"terminal state drift: {row['lane_id']}")
    return errors


def run_self_test(root: Path, docs: dict[str, Any]) -> list[str]:
    mutations = [
        ("source_lane_count", lambda d: d["product_manifest"].__setitem__("source_lanes", 22)),
        ("central_lane_count", lambda d: d["product_manifest"].__setitem__("central_projection_lanes", 14)),
        ("post_cutoff_lane_count", lambda d: d["product_manifest"].__setitem__("post_cutoff_lanes", 7)),
        ("source_slice_count", lambda d: d["product_manifest"].__setitem__("source_slice_files", 232)),
        ("active_lease", lambda d: d["gate"].__setitem__("active_source_leases", 1)),
        ("successor_queue", lambda d: d["gate"].__setitem__("candidate_successors", [{"lane_id": "invented"}])),
        ("identity_admission", lambda d: d["reconciliation"]["authority"].__setitem__("identity_admissions", 1)),
        ("relationship_admission", lambda d: d["reconciliation"]["authority"].__setitem__("relationship_admissions", 1)),
        ("negative_existence", lambda d: d["reconciliation"]["authority"].__setitem__("negative_existence_claims", 1)),
        ("outside_human", lambda d: d["reconciliation"]["authority"].__setitem__("outside_human_dependency", True)),
        ("publication_effect", lambda d: d["reconciliation"]["authority"].__setitem__("publication_effect", "publish")),
        ("graph_effect", lambda d: d["reconciliation"]["authority"].__setitem__("graph_effect", "write")),
        ("duplicate_lane", lambda d: d["source_lanes"]["lanes"].__setitem__(1, copy.deepcopy(d["source_lanes"]["lanes"][0]))),
        ("duplicate_slice", lambda d: d["slice_rows"].__setitem__(1, copy.deepcopy(d["slice_rows"][0]))),
        ("central_projection_state", lambda d: next(row for row in d["frontier"]["tasks"] if row["task_id"] == "bvvc-frontier-schoolhouse-legal-governance")["current_frontier_reconciliation"].__setitem__("candidate_successors", 1)),
    ]
    failures: list[str] = []
    for name, mutate in mutations:
        candidate = copy.deepcopy(docs)
        mutate(candidate)
        if not validate_documents(candidate):
            failures.append(name)
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    docs = load_documents(root)
    errors = validate_documents(docs) + validate_files(root, docs) + validate_lane_sources(root, docs)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if args.self_test:
        failures = run_self_test(root, docs)
        if failures:
            print("ERROR: adversarial mutations escaped: " + ", ".join(failures), file=sys.stderr)
            return 1
        print("School.House current-frontier reconciliation: PASS (15 adversarial refusals)")
    else:
        print("School.House current-frontier reconciliation: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
