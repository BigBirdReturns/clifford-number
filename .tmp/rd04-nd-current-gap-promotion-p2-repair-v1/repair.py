#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

CANONICAL_PARENT = "77aef3313e85e1fddc68805a9f22252ff147b4e8"
OLD_PRODUCT = "91ec5f11266b24cc935a33566db1c9d5db258e75"
OLD_PRODUCT_TREE = "5210b12a1158af5ac4333d5ef2bb9131bd9c2fb2"
PRODUCT_BRANCH = "agent/ssc-rd04-nd-current-public-record-gap-promotion-v1"
PRODUCT_ROOT = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion"
)
PATHS = [
    PRODUCT_ROOT / "cell-promotion-ledger.json",
    PRODUCT_ROOT / "product-manifest.json",
    PRODUCT_ROOT / "promoted-partial-field-matrix.json",
    PRODUCT_ROOT / "promotion-decision.json",
    PRODUCT_ROOT / "promotion-input-custody.json",
    PRODUCT_ROOT / "promotion-receipt.json",
    PRODUCT_ROOT / "remaining-open-field-census.json",
    PRODUCT_ROOT / "summary.json",
]
MATRIX_PATH = PRODUCT_ROOT / "promoted-partial-field-matrix.json"
RECEIPT_PATH = PRODUCT_ROOT / "promotion-receipt.json"
SUMMARY_PATH = PRODUCT_ROOT / "summary.json"
MANIFEST_PATH = PRODUCT_ROOT / "product-manifest.json"

OLD_MATRIX_BYTES = 493362
OLD_MATRIX_SHA256 = "54361c18446901945f36653f70dcc84002c87ede592163b9e5ef8ed7b25f0fdc"
OLD_RECEIPT_BYTES = 2225
OLD_RECEIPT_SHA256 = "3d642a21e09b1a0547b91c257b0e3948b02b95e4d093588587f6e793d609766e"
OLD_SUMMARY_BYTES = 1287
OLD_SUMMARY_SHA256 = "784791369317a1ac834318d43035a0561bac5c799df80093229865235f4c9985"
OLD_MANIFEST_BYTES = 3450
OLD_MANIFEST_SHA256 = "384e8c5a385e1b7f9d1512717874943933747235ad2210161c77f5fee72ccd74"
OLD_COMBINED_SHA256 = "26da08a72324af72d0df60e7d4ad47a1b7175cebe951e5d98931ef2707d136a1"
MATRIX_BEFORE_SHA256 = "663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63"
TARGET_CELL_SHA256 = "8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25"
ROW_STATE_CELL_SHA256 = "6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3"
WORK = pathlib.Path("/tmp/ssc-rd04-nd-current-gap-promotion-p2-repair-product")


def run(args: list[str], *, cwd: pathlib.Path | None = None, capture: bool = True) -> str:
    process = subprocess.run(
        args,
        cwd=str(cwd) if cwd is not None else None,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )
    if process.returncode != 0:
        output = ""
        if capture:
            output = (process.stdout or "") + (process.stderr or "")
        raise RuntimeError(f"{args!r} exited {process.returncode}: {output[-4000:]}")
    return (process.stdout or "").strip() if capture else ""


def file_sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_blob(path: pathlib.Path, *, cwd: pathlib.Path) -> str:
    return run(["git", "hash-object", str(path)], cwd=cwd)


def replace_exact(text: str, old: str, new: str, expected: int) -> str:
    actual = text.count(old)
    if actual != expected:
        raise AssertionError(f"replacement preimage count {actual} != {expected}: {old!r}")
    return text.replace(old, new)


def payload_digest(rows: list[dict[str, object]]) -> str:
    payload = b"".join(
        str(row["path"]).encode("utf-8")
        + b"\0"
        + str(row["sha256"]).encode("ascii")
        + b"\0"
        + str(row["bytes"]).encode("ascii")
        + b"\n"
        for row in rows
    )
    return hashlib.sha256(payload).hexdigest()


def canonical_bytes(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def canonical_sha256(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: repair.py RECEIPT_PATH")
    receipt_out = pathlib.Path(sys.argv[1])
    receipt_out.parent.mkdir(parents=True, exist_ok=True)

    run(["git", "fetch", "--no-tags", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main"])
    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--force",
            "origin",
            f"+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}",
        ]
    )
    assert run(["git", "rev-parse", "refs/remotes/origin/main"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"refs/remotes/origin/{PRODUCT_BRANCH}"]) == OLD_PRODUCT
    assert run(["git", "rev-parse", f"{OLD_PRODUCT}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{OLD_PRODUCT}^{{tree}}"]) == OLD_PRODUCT_TREE
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{OLD_PRODUCT}"]) == "1"

    expected_paths = sorted(path.as_posix() for path in PATHS)
    changed_paths = sorted(
        line
        for line in run(["git", "diff", "--name-only", CANONICAL_PARENT, OLD_PRODUCT]).splitlines()
        if line
    )
    added_paths = sorted(
        line
        for line in run(
            ["git", "diff", "--name-only", "--diff-filter=A", CANONICAL_PARENT, OLD_PRODUCT]
        ).splitlines()
        if line
    )
    assert changed_paths == expected_paths
    assert added_paths == expected_paths
    assert not run(
        ["git", "diff", "--name-only", "--diff-filter=MDTCRUXB", CANONICAL_PARENT, OLD_PRODUCT]
    )

    if WORK.exists():
        shutil.rmtree(WORK)
    run(["git", "worktree", "add", "--detach", str(WORK), CANONICAL_PARENT])
    run(
        ["git", "restore", f"--source={OLD_PRODUCT}", "--staged", "--worktree", "--"]
        + [path.as_posix() for path in PATHS],
        cwd=WORK,
    )

    matrix_path = WORK / MATRIX_PATH
    receipt_path = WORK / RECEIPT_PATH
    summary_path = WORK / SUMMARY_PATH
    manifest_path = WORK / MANIFEST_PATH

    assert matrix_path.stat().st_size == OLD_MATRIX_BYTES
    assert file_sha256(matrix_path) == OLD_MATRIX_SHA256
    assert receipt_path.stat().st_size == OLD_RECEIPT_BYTES
    assert file_sha256(receipt_path) == OLD_RECEIPT_SHA256
    assert summary_path.stat().st_size == OLD_SUMMARY_BYTES
    assert file_sha256(summary_path) == OLD_SUMMARY_SHA256
    assert manifest_path.stat().st_size == OLD_MANIFEST_BYTES
    assert file_sha256(manifest_path) == OLD_MANIFEST_SHA256

    matrix_text = matrix_path.read_text()
    matrix_text = replace_exact(
        matrix_text, '"terminal_cells": "227/450"', '"terminal_cells": "228/450"', 1
    )
    matrix_text = replace_exact(
        matrix_text, '"still_open_cells": "223/450"', '"still_open_cells": "222/450"', 1
    )
    matrix_text = replace_exact(
        matrix_text, '"terminal_substantive_cells": 117', '"terminal_substantive_cells": 118', 1
    )
    matrix_text = replace_exact(
        matrix_text,
        '"still_open_substantive_cells": 183',
        '"still_open_substantive_cells": 182',
        1,
    )
    matrix_path.write_text(matrix_text)
    assert matrix_path.stat().st_size == OLD_MATRIX_BYTES
    new_matrix_sha256 = file_sha256(matrix_path)
    assert new_matrix_sha256 != OLD_MATRIX_SHA256

    receipt_text = receipt_path.read_text()
    receipt_text = replace_exact(receipt_text, OLD_MATRIX_SHA256, new_matrix_sha256, 1)
    receipt_path.write_text(receipt_text)
    assert receipt_path.stat().st_size == OLD_RECEIPT_BYTES
    new_receipt_sha256 = file_sha256(receipt_path)

    summary_text = summary_path.read_text()
    summary_text = replace_exact(summary_text, OLD_MATRIX_SHA256, new_matrix_sha256, 1)
    summary_path.write_text(summary_text)
    assert summary_path.stat().st_size == OLD_SUMMARY_BYTES
    new_summary_sha256 = file_sha256(summary_path)

    payload_rows: list[dict[str, object]] = []
    for path in sorted(path for path in PATHS if path != MANIFEST_PATH):
        full = WORK / path
        payload_rows.append(
            {
                "path": path.as_posix(),
                "bytes": full.stat().st_size,
                "sha256": file_sha256(full),
            }
        )
    new_combined_sha256 = payload_digest(payload_rows)

    manifest_text = manifest_path.read_text()
    manifest_text = replace_exact(manifest_text, OLD_MATRIX_SHA256, new_matrix_sha256, 2)
    manifest_text = replace_exact(manifest_text, OLD_RECEIPT_SHA256, new_receipt_sha256, 1)
    manifest_text = replace_exact(manifest_text, OLD_SUMMARY_SHA256, new_summary_sha256, 1)
    manifest_text = replace_exact(manifest_text, OLD_COMBINED_SHA256, new_combined_sha256, 1)
    manifest_path.write_text(manifest_text)
    assert manifest_path.stat().st_size == OLD_MANIFEST_BYTES
    new_manifest_sha256 = file_sha256(manifest_path)

    manifest = json.loads(manifest_path.read_text())
    assert manifest["permanent_path_count"] == 8
    assert manifest["addition_only"] is True
    assert manifest["workflow_or_transport_paths"] == 0
    assert manifest["payload_files"] == payload_rows
    assert manifest["payload_combined_sha256"] == new_combined_sha256
    assert manifest["matrix_before"]["sha256"] == MATRIX_BEFORE_SHA256
    assert manifest["matrix_after"]["bytes"] == OLD_MATRIX_BYTES
    assert manifest["matrix_after"]["sha256"] == new_matrix_sha256
    assert manifest["semantic_counts"] == {
        "source_requests": 0,
        "route_executions": 0,
        "source_admissions": 0,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "cumulative_ledger_effect": "none",
        "outside_human_dependency": False,
    }

    matrix = json.loads(matrix_path.read_text())
    assert matrix["counts"]["materialized_cells"] == 450
    assert matrix["counts"]["terminal_cells"] == 228
    assert matrix["counts"]["still_open_cells"] == 222
    assert matrix["counts"]["terminal_substantive_cells"] == 118
    assert matrix["counts"]["still_open_substantive_cells"] == 182
    assert matrix["counts"]["terminal_units"] == 10
    assert matrix["counts"]["class_closed"] is False
    assert matrix["current_result"]["terminal_cells"] == "228/450"
    assert matrix["current_result"]["still_open_cells"] == "222/450"
    assert matrix["current_result"]["terminal_substantive_cells"] == 118
    assert matrix["current_result"]["still_open_substantive_cells"] == 182
    assert matrix["current_result"]["terminal_units"] == 10
    assert matrix["current_result"]["class_closed"] is False

    nd_rows = [row for row in matrix["rows"] if row["unit_id"] == "US-STATE-ND"]
    assert len(nd_rows) == 1
    nd = nd_rows[0]
    assert nd["terminal_fields"] == 8
    assert nd["open_fields"] == 1
    assert nd["row_state"] == "still_open"
    target = [
        cell
        for cell in nd["cells"]
        if cell["field_id"] == "abawd_or_work_requirement_waiver_state_and_governing_period"
    ]
    row_state = [cell for cell in nd["cells"] if cell["field_id"] == "field_and_row_terminal_state"]
    assert len(target) == len(row_state) == 1
    assert canonical_sha256(target[0]) == TARGET_CELL_SHA256
    assert target[0]["state"] == "not_publicly_recovered" and target[0]["terminal"] is True
    assert canonical_sha256(row_state[0]) == ROW_STATE_CELL_SHA256
    assert row_state[0]["state"] == "still_open" and row_state[0]["terminal"] is False

    receipt = json.loads(receipt_path.read_text())
    summary = json.loads(summary_path.read_text())
    assert receipt["matrix_after_sha256"] == new_matrix_sha256
    assert summary["matrix_after_sha256"] == new_matrix_sha256
    assert receipt["counts_after"] == {
        "materialized_cells": 450,
        "terminal_cells": 228,
        "still_open_cells": 222,
        "terminal_substantive_cells": 118,
        "still_open_substantive_cells": 182,
        "terminal_units": 10,
        "class_closed": False,
    }
    assert summary["cumulative_ledger_effect"] == "none"

    run(["git", "config", "user.name", "RD-04 fail-closed controller"], cwd=WORK)
    run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=WORK)
    run(["git", "add", "--"] + [path.as_posix() for path in PATHS], cwd=WORK)
    cached_paths = sorted(
        line
        for line in run(["git", "diff", "--cached", "--name-only", CANONICAL_PARENT], cwd=WORK).splitlines()
        if line
    )
    assert cached_paths == expected_paths
    assert not run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=MDTCRUXB", CANONICAL_PARENT],
        cwd=WORK,
    )
    run(
        [
            "git",
            "commit",
            "-m",
            "Repair North Dakota promoted matrix current-result counters",
        ],
        cwd=WORK,
    )
    new_product = run(["git", "rev-parse", "HEAD"], cwd=WORK)
    new_tree = run(["git", "rev-parse", "HEAD^{tree}"], cwd=WORK)
    assert run(["git", "rev-parse", "HEAD^"], cwd=WORK) == CANONICAL_PARENT
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..HEAD"], cwd=WORK) == "1"
    assert sorted(
        line
        for line in run(["git", "diff", "--name-only", CANONICAL_PARENT, "HEAD"], cwd=WORK).splitlines()
        if line
    ) == expected_paths
    assert not run(
        ["git", "diff", "--name-only", "--diff-filter=MDTCRUXB", CANONICAL_PARENT, "HEAD"],
        cwd=WORK,
    )

    release_log = receipt_out.parent / "release-check.log"
    with release_log.open("w") as handle:
        process = subprocess.run(
            ["npm", "run", "release:check"],
            cwd=WORK,
            text=True,
            stdout=handle,
            stderr=subprocess.STDOUT,
            check=False,
        )
    if process.returncode != 0:
        raise RuntimeError(f"release gate failed with {process.returncode}")
    run(["git", "reset", "--hard", "HEAD"], cwd=WORK)
    run(["git", "clean", "-fdx"], cwd=WORK)
    assert not run(["git", "status", "--porcelain"], cwd=WORK)

    run(["git", "fetch", "--no-tags", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main"])
    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--force",
            "origin",
            f"+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}",
        ]
    )
    assert run(["git", "rev-parse", "refs/remotes/origin/main"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"refs/remotes/origin/{PRODUCT_BRANCH}"]) == OLD_PRODUCT

    run(
        [
            "git",
            "push",
            "origin",
            f"--force-with-lease=refs/heads/{PRODUCT_BRANCH}:{OLD_PRODUCT}",
            f"HEAD:refs/heads/{PRODUCT_BRANCH}",
        ],
        cwd=WORK,
    )
    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--force",
            "origin",
            f"+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}",
        ]
    )
    assert run(["git", "rev-parse", f"refs/remotes/origin/{PRODUCT_BRANCH}"]) == new_product

    output = {
        "schema_version": "ssc-rd04-nd-current-gap-promotion-p2-repair@1",
        "state": "replacement_product_published",
        "canonical_parent": CANONICAL_PARENT,
        "old_product_commit": OLD_PRODUCT,
        "old_product_tree": OLD_PRODUCT_TREE,
        "new_product_commit": new_product,
        "new_product_tree": new_tree,
        "product_branch": PRODUCT_BRANCH,
        "permanent_paths": 8,
        "modified_product_files": [
            MATRIX_PATH.as_posix(),
            RECEIPT_PATH.as_posix(),
            SUMMARY_PATH.as_posix(),
            MANIFEST_PATH.as_posix(),
        ],
        "matrix_bytes": OLD_MATRIX_BYTES,
        "matrix_before_sha256": MATRIX_BEFORE_SHA256,
        "old_matrix_after_sha256": OLD_MATRIX_SHA256,
        "new_matrix_after_sha256": new_matrix_sha256,
        "new_matrix_blob": git_blob(matrix_path, cwd=WORK),
        "new_receipt_sha256": new_receipt_sha256,
        "new_receipt_blob": git_blob(receipt_path, cwd=WORK),
        "new_summary_sha256": new_summary_sha256,
        "new_summary_blob": git_blob(summary_path, cwd=WORK),
        "new_manifest_sha256": new_manifest_sha256,
        "new_manifest_blob": git_blob(manifest_path, cwd=WORK),
        "new_payload_combined_sha256": new_combined_sha256,
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "cumulative_ledger_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "source_requests": 0,
        "route_executions": 0,
        "source_admissions": 0,
        "outside_human_dependency": False,
        "next_authorized_operation": "fresh_exact_head_independent_validation_and_review",
    }
    receipt_out.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
