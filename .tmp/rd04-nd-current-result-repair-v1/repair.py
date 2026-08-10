#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
from typing import Any

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
PRODUCT_WORK = pathlib.Path(os.environ["PRODUCT_WORK"])
PRODUCT_ROOT = pathlib.PurePosixPath(os.environ["PRODUCT_ROOT"])

CANONICAL_PARENT = os.environ["CANONICAL_PARENT"]
EXPECTED_PRODUCT_HEAD = os.environ["EXPECTED_PRODUCT_HEAD"]
EXPECTED_PRODUCT_TREE = os.environ["EXPECTED_PRODUCT_TREE"]
PRODUCT_BRANCH = os.environ["PRODUCT_BRANCH"]
WORKFLOW_PATH = os.environ["WORKFLOW_PATH"]
SCRIPT_PATH = os.environ["SCRIPT_PATH"]
TRIGGER_PATH = os.environ["TRIGGER_PATH"]

EXPECTED_PATHS = sorted([
    f"{PRODUCT_ROOT}/cell-promotion-ledger.json",
    f"{PRODUCT_ROOT}/product-manifest.json",
    f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json",
    f"{PRODUCT_ROOT}/promotion-decision.json",
    f"{PRODUCT_ROOT}/promotion-input-custody.json",
    f"{PRODUCT_ROOT}/promotion-receipt.json",
    f"{PRODUCT_ROOT}/remaining-open-field-census.json",
    f"{PRODUCT_ROOT}/summary.json",
])
MATRIX_REL = f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json"
MANIFEST_REL = f"{PRODUCT_ROOT}/product-manifest.json"
RECEIPT_REL = f"{PRODUCT_ROOT}/promotion-receipt.json"
SUMMARY_REL = f"{PRODUCT_ROOT}/summary.json"

EXPECTED_BLOBS = {
    f"{PRODUCT_ROOT}/cell-promotion-ledger.json": "e942efde485dbf59e79139d1ccc39b1106250148",
    f"{PRODUCT_ROOT}/product-manifest.json": "150c239488fb3715336ed30144a516f2313ec220",
    f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json": "026ab0f0d8b7bb21480014a127a373bf776d7470",
    f"{PRODUCT_ROOT}/promotion-decision.json": "53303c606567152d0443732fc6c6e5779e58f8c1",
    f"{PRODUCT_ROOT}/promotion-input-custody.json": "2298d49dd33bb05eadcdd4465ba8cb81e8ac1baf",
    f"{PRODUCT_ROOT}/promotion-receipt.json": "cc379fbd3f6cc43e3038479050ff642f37ed89d6",
    f"{PRODUCT_ROOT}/remaining-open-field-census.json": "bb75a0b053ea7b64cffa23aaae9637f3854f4b24",
    f"{PRODUCT_ROOT}/summary.json": "34d9b3db7a075343dad02fafeb3a4d6c73dde9cb",
}
EXPECTED_MATRIX_BYTES = 493_362
EXPECTED_MATRIX_SHA256 = "54361c18446901945f36653f70dcc84002c87ede592163b9e5ef8ed7b25f0fdc"
EXPECTED_PAYLOAD_SHA256 = "26da08a72324af72d0df60e7d4ad47a1b7175cebe951e5d98931ef2707d136a1"
EXPECTED_ROW_STATE_SHA256 = "6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3"
EXPECTED_TARGET_SHA256 = "8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25"


def run(args: list[str], *, cwd: pathlib.Path = REPO, check: bool = True) -> str:
    proc = subprocess.run(
        args,
        cwd=cwd,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if check and proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: pathlib.Path, value: Any) -> bytes:
    data = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    path.write_bytes(data)
    return data


def exact_names(base: str, head: str, *, cwd: pathlib.Path = REPO) -> list[str]:
    text = run(["git", "diff", "--name-only", base, head], cwd=cwd)
    return sorted(line for line in text.splitlines() if line)


def exact_status(base: str, head: str, *, cwd: pathlib.Path = REPO) -> list[tuple[str, str]]:
    text = run(["git", "diff", "--name-status", base, head], cwd=cwd)
    rows: list[tuple[str, str]] = []
    for line in text.splitlines():
        if not line:
            continue
        status, path = line.split("\t", 1)
        rows.append((status, path))
    return sorted(rows)


def working_names(*, cwd: pathlib.Path) -> list[str]:
    text = run(["git", "diff", "--name-only"], cwd=cwd)
    return sorted(line for line in text.splitlines() if line)


def working_status(*, cwd: pathlib.Path) -> list[tuple[str, str]]:
    text = run(["git", "diff", "--name-status"], cwd=cwd)
    rows: list[tuple[str, str]] = []
    for line in text.splitlines():
        if not line:
            continue
        status, path = line.split("\t", 1)
        rows.append((status, path))
    return sorted(rows)


def bind_carrier() -> tuple[str, str]:
    OUT.mkdir(parents=True, exist_ok=True)
    head = run(["git", "rev-parse", "HEAD"])
    base = run(["git", "rev-parse", "HEAD^"])
    event_head = os.environ["EVENT_HEAD_SHA"]
    event_base = os.environ["EVENT_BASE_SHA"]
    assert head == event_head
    assert base == event_base
    assert run(["git", "rev-parse", f"{base}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{base}"]) == "1"
    assert run(["git", "rev-list", "--count", f"{base}..{head}"]) == "1"
    assert exact_names(CANONICAL_PARENT, base) == sorted([WORKFLOW_PATH, SCRIPT_PATH])
    assert exact_status(CANONICAL_PARENT, base) == sorted([("A", WORKFLOW_PATH), ("A", SCRIPT_PATH)])
    assert exact_names(base, head) == [TRIGGER_PATH]
    assert exact_status(base, head) == [("A", TRIGGER_PATH)]
    run(["git", "diff", "--check", CANONICAL_PARENT, head])
    return base, head


def bind_product() -> None:
    run([
        "git", "fetch", "--no-tags", "--force", "origin",
        "+refs/heads/main:refs/remotes/origin/main",
        f"+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}",
    ])
    assert run(["git", "rev-parse", "origin/main"]) == CANONICAL_PARENT
    product_ref = f"refs/remotes/origin/{PRODUCT_BRANCH}"
    assert run(["git", "rev-parse", product_ref]) == EXPECTED_PRODUCT_HEAD
    assert run(["git", "rev-parse", f"{EXPECTED_PRODUCT_HEAD}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{EXPECTED_PRODUCT_HEAD}"]) == "1"
    assert run(["git", "rev-parse", f"{EXPECTED_PRODUCT_HEAD}^{{tree}}"]) == EXPECTED_PRODUCT_TREE
    statuses = exact_status(CANONICAL_PARENT, EXPECTED_PRODUCT_HEAD)
    assert statuses == [("A", path) for path in EXPECTED_PATHS]
    for path, blob in EXPECTED_BLOBS.items():
        assert run(["git", "rev-parse", f"{EXPECTED_PRODUCT_HEAD}:{path}"]) == blob


def repair_product() -> dict[str, Any]:
    if PRODUCT_WORK.exists():
        shutil.rmtree(PRODUCT_WORK)
    run(["git", "worktree", "add", "--detach", str(PRODUCT_WORK), EXPECTED_PRODUCT_HEAD])

    matrix_path = PRODUCT_WORK / MATRIX_REL
    old_matrix_bytes = matrix_path.read_bytes()
    assert len(old_matrix_bytes) == EXPECTED_MATRIX_BYTES
    assert sha256(old_matrix_bytes) == EXPECTED_MATRIX_SHA256
    old_matrix = json.loads(old_matrix_bytes)
    assert old_matrix["counts"]["terminal_cells"] == 228
    assert old_matrix["counts"]["still_open_cells"] == 222
    assert old_matrix["counts"]["terminal_substantive_cells"] == 118
    assert old_matrix["counts"]["still_open_substantive_cells"] == 182
    assert old_matrix["current_result"]["terminal_cells"] == "227/450"
    assert old_matrix["current_result"]["still_open_cells"] == "223/450"
    assert old_matrix["current_result"]["terminal_substantive_cells"] == 117
    assert old_matrix["current_result"]["still_open_substantive_cells"] == 183

    text = old_matrix_bytes.decode("utf-8")
    replacements = [
        ('"terminal_cells": "227/450"', '"terminal_cells": "228/450"'),
        ('"still_open_cells": "223/450"', '"still_open_cells": "222/450"'),
        ('"terminal_substantive_cells": 117', '"terminal_substantive_cells": 118'),
        ('"still_open_substantive_cells": 183', '"still_open_substantive_cells": 182'),
    ]
    for before, after in replacements:
        assert text.count(before) == 1, before
        text = text.replace(before, after, 1)
    new_matrix_bytes = text.encode("utf-8")
    assert len(new_matrix_bytes) == EXPECTED_MATRIX_BYTES
    new_matrix = json.loads(new_matrix_bytes)

    expected_matrix = copy.deepcopy(old_matrix)
    expected_matrix["current_result"]["terminal_cells"] = "228/450"
    expected_matrix["current_result"]["still_open_cells"] = "222/450"
    expected_matrix["current_result"]["terminal_substantive_cells"] = 118
    expected_matrix["current_result"]["still_open_substantive_cells"] = 182
    assert new_matrix == expected_matrix
    matrix_path.write_bytes(new_matrix_bytes)
    new_matrix_sha = sha256(new_matrix_bytes)

    nd_rows = [row for row in new_matrix["rows"] if row["unit_id"] == "US-STATE-ND"]
    assert len(nd_rows) == 1
    nd = nd_rows[0]
    assert nd["terminal_fields"] == 8 and nd["open_fields"] == 1 and nd["row_state"] == "still_open"
    target = [cell for cell in nd["cells"] if cell["field_id"] == "abawd_or_work_requirement_waiver_state_and_governing_period"]
    row_state = [cell for cell in nd["cells"] if cell["field_id"] == "field_and_row_terminal_state"]
    assert len(target) == len(row_state) == 1
    assert sha256(canonical(target[0])) == EXPECTED_TARGET_SHA256
    assert sha256(canonical(row_state[0])) == EXPECTED_ROW_STATE_SHA256

    receipt_path = PRODUCT_WORK / RECEIPT_REL
    receipt = load_json(receipt_path)
    assert receipt["matrix_after_sha256"] == EXPECTED_MATRIX_SHA256
    receipt["matrix_after_sha256"] = new_matrix_sha
    receipt_bytes = write_json(receipt_path, receipt)

    summary_path = PRODUCT_WORK / SUMMARY_REL
    summary = load_json(summary_path)
    assert summary["matrix_after_sha256"] == EXPECTED_MATRIX_SHA256
    assert summary["cumulative_ledger_effect"] == "none"
    summary["matrix_after_sha256"] = new_matrix_sha
    summary_bytes = write_json(summary_path, summary)

    manifest_path = PRODUCT_WORK / MANIFEST_REL
    manifest = load_json(manifest_path)
    assert manifest["payload_combined_sha256"] == EXPECTED_PAYLOAD_SHA256
    assert manifest["semantic_counts"]["cumulative_ledger_effect"] == "none"

    records: list[dict[str, Any]] = []
    for old in manifest["payload_files"]:
        rel = old["path"]
        data = (PRODUCT_WORK / rel).read_bytes()
        records.append({"path": rel, "bytes": len(data), "sha256": sha256(data)})
    records.sort(key=lambda row: row["path"])
    assert [row["path"] for row in records] == sorted(path for path in EXPECTED_PATHS if path != MANIFEST_REL)
    preimage = b"".join(
        row["path"].encode("utf-8") + b"\0"
        + row["sha256"].encode("ascii") + b"\0"
        + str(row["bytes"]).encode("ascii") + b"\n"
        for row in records
    )
    payload_sha = sha256(preimage)
    manifest["payload_files"] = records
    manifest["payload_combined_sha256"] = payload_sha
    manifest["matrix_after"]["bytes"] = len(new_matrix_bytes)
    manifest["matrix_after"]["sha256"] = new_matrix_sha
    manifest_bytes = write_json(manifest_path, manifest)

    expected_changed = sorted([MANIFEST_REL, MATRIX_REL, RECEIPT_REL, SUMMARY_REL])
    assert working_names(cwd=PRODUCT_WORK) == expected_changed
    assert working_status(cwd=PRODUCT_WORK) == [("M", path) for path in expected_changed]
    run(["git", "diff", "--check"], cwd=PRODUCT_WORK)

    verified = load_json(manifest_path)
    actual_rows = []
    for row in sorted(verified["payload_files"], key=lambda item: item["path"]):
        data = (PRODUCT_WORK / row["path"]).read_bytes()
        actual = {"path": row["path"], "bytes": len(data), "sha256": sha256(data)}
        assert actual == row
        actual_rows.append(actual)
    verify_preimage = b"".join(
        row["path"].encode("utf-8") + b"\0"
        + row["sha256"].encode("ascii") + b"\0"
        + str(row["bytes"]).encode("ascii") + b"\n"
        for row in actual_rows
    )
    assert sha256(verify_preimage) == verified["payload_combined_sha256"] == payload_sha
    assert verified["matrix_after"] == {"path": MATRIX_REL, "bytes": len(new_matrix_bytes), "sha256": new_matrix_sha}
    assert load_json(receipt_path)["matrix_after_sha256"] == new_matrix_sha
    assert load_json(summary_path)["matrix_after_sha256"] == new_matrix_sha

    run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=PRODUCT_WORK)
    release_log = run(["npm", "run", "release:check"], cwd=PRODUCT_WORK)
    (OUT / "release-check.log").write_text(release_log + "\n", encoding="utf-8")
    assert working_names(cwd=PRODUCT_WORK) == expected_changed
    assert working_status(cwd=PRODUCT_WORK) == [("M", path) for path in expected_changed]

    run(["git", "config", "user.name", "BigBirdReturns"], cwd=PRODUCT_WORK)
    run(["git", "config", "user.email", "219768509+BigBirdReturns@users.noreply.github.com"], cwd=PRODUCT_WORK)
    run(["git", "add", "--", *expected_changed], cwd=PRODUCT_WORK)
    tree = run(["git", "write-tree"], cwd=PRODUCT_WORK)
    message = (
        "Repair RD-04 North Dakota promoted matrix current-result counters\n\n"
        "Synchronize the matrix current_result summary with its authoritative post-promotion counts, "
        "regenerate the matrix-dependent receipt, summary, manifest rows, and combined payload digest, "
        "and preserve the one-cell promotion, row-state byte, class boundary, and zero cumulative-ledger effect."
    )
    env = os.environ.copy()
    env.update({
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "219768509+BigBirdReturns@users.noreply.github.com",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "219768509+BigBirdReturns@users.noreply.github.com",
    })
    proc = subprocess.run(
        ["git", "commit-tree", tree, "-p", CANONICAL_PARENT],
        cwd=PRODUCT_WORK,
        env=env,
        input=message + "\n",
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if proc.returncode:
        raise RuntimeError(proc.stdout)
    new_commit = proc.stdout.strip()
    assert run(["git", "rev-parse", f"{new_commit}^"], cwd=PRODUCT_WORK) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{new_commit}^{{tree}}"], cwd=PRODUCT_WORK) == tree
    assert exact_status(CANONICAL_PARENT, new_commit, cwd=PRODUCT_WORK) == [("A", path) for path in EXPECTED_PATHS]

    run([
        "git", "push", "origin",
        f"{new_commit}:refs/heads/{PRODUCT_BRANCH}",
        f"--force-with-lease=refs/heads/{PRODUCT_BRANCH}:{EXPECTED_PRODUCT_HEAD}",
    ], cwd=PRODUCT_WORK)
    remote_line = run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{PRODUCT_BRANCH}"], cwd=PRODUCT_WORK)
    remote_head = remote_line.split()[0] if remote_line else ""
    assert remote_head == new_commit

    result = {
        "schema_version": "ssc-rd04-nd-current-result-counter-repair@1",
        "state": "published_exact_replacement_product",
        "canonical_parent": CANONICAL_PARENT,
        "replaced_product_head": EXPECTED_PRODUCT_HEAD,
        "replacement_product_head": new_commit,
        "replacement_product_tree": tree,
        "product_branch": PRODUCT_BRANCH,
        "permanent_paths": 8,
        "changed_payload_paths": expected_changed,
        "matrix_bytes": len(new_matrix_bytes),
        "matrix_before_sha256": EXPECTED_MATRIX_SHA256,
        "matrix_after_sha256": new_matrix_sha,
        "receipt_bytes": len(receipt_bytes),
        "summary_bytes": len(summary_bytes),
        "manifest_bytes": len(manifest_bytes),
        "payload_combined_sha256": payload_sha,
        "current_result": {
            "terminal_cells": "228/450",
            "still_open_cells": "222/450",
            "terminal_substantive_cells": 118,
            "still_open_substantive_cells": 182,
        },
        "field_terminalizations": 1,
        "matrix_updates": 1,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "cumulative_ledger_effect": "none",
        "outside_human_dependency": False,
    }
    return result


def main() -> None:
    base, head = bind_carrier()
    bind_product()
    result = repair_product()
    result["carrier_base"] = base
    result["carrier_head"] = head
    (OUT / "repair-receipt.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sums = []
    for path in sorted(OUT.glob("*")):
        if path.name == "SHA256SUMS" or not path.is_file():
            continue
        sums.append(f"{sha256(path.read_bytes())}  {path.name}")
    (OUT / "SHA256SUMS").write_text("\n".join(sums) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
