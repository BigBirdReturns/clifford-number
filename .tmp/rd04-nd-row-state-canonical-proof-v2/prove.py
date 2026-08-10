#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import time
import traceback
import urllib.parse
import urllib.request
import zipfile
from typing import Any

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
CANONICAL_WORK = pathlib.Path(os.environ["CANONICAL_WORK"])
CANONICAL_PARENT = os.environ["CANONICAL_PARENT"]
PRODUCT_COMMIT = os.environ["PRODUCT_COMMIT"]
PRODUCT_TREE = os.environ["PRODUCT_TREE"]
CANONICAL_MERGE = os.environ["CANONICAL_MERGE"]
WORKFLOW_PATH = os.environ["WORKFLOW_PATH"]
SCRIPT_PATH = os.environ["SCRIPT_PATH"]
TRIGGER_PATH = os.environ["TRIGGER_PATH"]
EVENT_HEAD_SHA = os.environ["EVENT_HEAD_SHA"]
EVENT_BASE_SHA = os.environ["EVENT_BASE_SHA"]
PRODUCT_WORKFLOW_NAME = os.environ["PRODUCT_WORKFLOW_NAME"]
PRODUCT_ARTIFACT_NAME = os.environ["PRODUCT_ARTIFACT_NAME"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
GITHUB_REPOSITORY = os.environ["GITHUB_REPOSITORY"]

PRODUCT_ROOT = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation"
BUILDER_PATH = "tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
VALIDATOR_PATH = "tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
TEST_PATH = "test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js"
PRODUCT_PATHS = [
    ".github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml",
    f"{PRODUCT_ROOT}/input-custody.json",
    f"{PRODUCT_ROOT}/row-state-decision.json",
    f"{PRODUCT_ROOT}/row-state-ledger.json",
    f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json",
    f"{PRODUCT_ROOT}/remaining-open-field-census.json",
    f"{PRODUCT_ROOT}/row-state-summary.json",
    f"{PRODUCT_ROOT}/index.json",
    f"{PRODUCT_ROOT}/product-manifest.json",
    "docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md",
    "schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json",
    TEST_PATH,
    BUILDER_PATH,
    VALIDATOR_PATH,
]
EXPECTED_VALIDATOR = {
    "adversarial_contract": "closed",
    "class_closed": False,
    "matrix_sha256": "9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb",
    "north_dakota_open_fields": 0,
    "north_dakota_row_state": "terminal_fixed_public_record_obligation_complete",
    "north_dakota_terminal_fields": 9,
    "row_open_cells": 39,
    "row_terminal_cells": 11,
    "state": "qualified_exact_north_dakota_row_state_reconciliation",
    "still_open_cells": 221,
    "still_open_substantive_cells": 182,
    "terminal_cells": 229,
    "terminal_substantive_cells": 118,
    "terminal_units": 11,
}


def run(
    args: list[str],
    *,
    cwd: pathlib.Path = REPO,
    check: bool = True,
    env: dict[str, str] | None = None,
) -> str:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    proc = subprocess.run(
        args,
        cwd=cwd,
        env=merged,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if check and proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def exact_names(base: str, head: str) -> list[str]:
    return sorted(line for line in run(["git", "diff", "--name-only", base, head]).splitlines() if line)


def exact_status(base: str, head: str) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    for line in run(["git", "diff", "--name-status", base, head]).splitlines():
        if line:
            status, path = line.split("\t", 1)
            result.append((status, path))
    return sorted(result)


def api(url: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "rd04-canonical-proof-v2",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def bind_topology() -> dict[str, Any]:
    head = run(["git", "rev-parse", "HEAD"])
    base = run(["git", "rev-parse", "HEAD^"])
    assert head == EVENT_HEAD_SHA
    assert base == EVENT_BASE_SHA
    assert exact_names(base, head) == [TRIGGER_PATH]
    assert exact_status(base, head) == [("A", TRIGGER_PATH)]
    assert run(["git", "merge-base", CANONICAL_MERGE, base]) == CANONICAL_MERGE
    assert run(["git", "rev-list", "--count", f"{CANONICAL_MERGE}..{base}"]) == "2"
    assert exact_names(CANONICAL_MERGE, base) == sorted([WORKFLOW_PATH, SCRIPT_PATH])
    assert exact_status(CANONICAL_MERGE, base) == sorted([("A", WORKFLOW_PATH), ("A", SCRIPT_PATH)])
    run(["git", "diff", "--check", CANONICAL_MERGE, head])

    run(["git", "fetch", "--no-tags", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main"])
    assert run(["git", "rev-parse", "origin/main"]) == CANONICAL_MERGE
    parents = run(["git", "show", "-s", "--format=%P", CANONICAL_MERGE).split()
    assert parents == [CANONICAL_PARENT, PRODUCT_COMMIT]
    assert run(["git", "rev-parse", f"{PRODUCT_COMMIT}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{PRODUCT_COMMIT}^{{tree}}"]) == PRODUCT_TREE
    assert run(["git", "rev-parse", f"{CANONICAL_MERGE}^{{tree}}"]) == PRODUCT_TREE
    assert exact_names(PRODUCT_COMMIT, CANONICAL_MERGE) == []
    assert exact_names(CANONICAL_PARENT, PRODUCT_COMMIT) == sorted(PRODUCT_PATHS)
    assert exact_status(CANONICAL_PARENT, PRODUCT_COMMIT) == [("A", path) for path in sorted(PRODUCT_PATHS)]
    assert exact_names(CANONICAL_PARENT, CANONICAL_MERGE) == sorted(PRODUCT_PATHS)
    (OUT / "product-paths.txt").write_text("\n".join(sorted(PRODUCT_PATHS)) + "\n", encoding="utf-8")
    return {
        "observer_base": base,
        "observer_head": head,
        "canonical_merge": CANONICAL_MERGE,
        "canonical_parent": CANONICAL_PARENT,
        "product_commit": PRODUCT_COMMIT,
        "product_tree": PRODUCT_TREE,
        "merge_parents": parents,
        "permanent_paths": 14,
    }


def recover_native_push() -> dict[str, Any]:
    query = urllib.parse.urlencode({"head_sha": CANONICAL_MERGE, "event": "push", "per_page": 100})
    runs_url = f"https://api.github.com/repos/{GITHUB_REPOSITORY}/actions/runs?{query}"
    selected = None
    for _ in range(72):
        runs = api(runs_url)["workflow_runs"]
        matches = [
            item
            for item in runs
            if item.get("name") == PRODUCT_WORKFLOW_NAME and item.get("head_sha") == CANONICAL_MERGE
        ]
        if matches:
            matches.sort(key=lambda item: item.get("created_at", ""), reverse=True)
            candidate = matches[0]
            if candidate.get("status") == "completed":
                if candidate.get("conclusion") != "success":
                    raise AssertionError(f"native push workflow concluded {candidate.get('conclusion')}")
                selected = candidate
                break
        time.sleep(5)
    if selected is None:
        raise AssertionError("successful native canonical-push workflow not recovered")

    artifact_rows = api(
        f"https://api.github.com/repos/{GITHUB_REPOSITORY}/actions/runs/{selected['id']}/artifacts?per_page=100"
    )["artifacts"]
    matches = [
        artifact
        for artifact in artifact_rows
        if artifact.get("name") == PRODUCT_ARTIFACT_NAME and not artifact.get("expired")
    ]
    assert len(matches) == 1
    artifact = matches[0]
    zip_path = OUT / "native-product-artifact.zip"
    subprocess.run(
        [
            "curl",
            "-fsSL",
            "-H",
            f"Authorization: Bearer {GITHUB_TOKEN}",
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            "X-GitHub-Api-Version: 2022-11-28",
            artifact["archive_download_url"],
            "-o",
            str(zip_path),
        ],
        check=True,
    )
    archive_bytes = zip_path.read_bytes()
    archive_sha = sha256(archive_bytes)
    assert artifact.get("digest") == f"sha256:{archive_sha}"
    extract = OUT / "native-product-artifact"
    extract.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        assert archive.testzip() is None
        archive.extractall(extract)

    sums = extract / "SHA256SUMS"
    assert sums.is_file()
    verified = 0
    for line in sums.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        digest, relative = line.split(None, 1)
        relative = relative.strip()
        if relative.startswith("./"):
            relative = relative[2:]
        assert sha256((extract / relative).read_bytes()) == digest
        verified += 1
    before = (extract / "validator.json").read_bytes()
    after = (extract / "post-release-validator.json").read_bytes()
    assert before == after
    validator = json.loads(before)
    assert validator == EXPECTED_VALIDATOR
    assert (extract / "product-commit.txt").read_text(encoding="utf-8").strip() == PRODUCT_COMMIT
    proof = {
        "workflow_run_id": selected["id"],
        "workflow_run_number": selected["run_number"],
        "workflow_name": selected["name"],
        "workflow_event": selected["event"],
        "workflow_status": selected["status"],
        "workflow_conclusion": selected["conclusion"],
        "workflow_head_sha": selected["head_sha"],
        "artifact_id": artifact["id"],
        "artifact_name": artifact["name"],
        "artifact_bytes": artifact["size_in_bytes"],
        "artifact_digest": artifact["digest"],
        "artifact_internal_checksum_rows": verified,
        "validator": validator,
    }
    write_json(OUT / "native-push-proof.json", proof)
    (OUT / "native-validator.json").write_bytes(before)
    return proof


def canonical_replay() -> dict[str, Any]:
    if CANONICAL_WORK.exists():
        shutil.rmtree(CANONICAL_WORK)
    run(["git", "worktree", "add", "--detach", str(CANONICAL_WORK), CANONICAL_MERGE])
    builder = run(["node", BUILDER_PATH, "--check"], cwd=CANONICAL_WORK)
    validator_stdout = run(
        ["node", VALIDATOR_PATH, "--out", str(OUT / "canonical-validator.json")],
        cwd=CANONICAL_WORK,
    )
    adversarial = run(["node", "--test", TEST_PATH], cwd=CANONICAL_WORK)
    (OUT / "canonical-builder.json").write_text(builder + "\n", encoding="utf-8")
    (OUT / "canonical-validator-stdout.txt").write_text(validator_stdout + "\n", encoding="utf-8")
    (OUT / "canonical-adversarial.log").write_text(adversarial + "\n", encoding="utf-8")
    release_path = OUT / "canonical-release-check.log"
    with release_path.open("w", encoding="utf-8") as handle:
        proc = subprocess.run(
            ["npm", "run", "release:check"],
            cwd=CANONICAL_WORK,
            text=True,
            stdout=handle,
            stderr=subprocess.STDOUT,
            check=False,
        )
    if proc.returncode:
        raise RuntimeError(f"canonical release check failed ({proc.returncode})")
    run(["git", "reset", "--hard", "HEAD"], cwd=CANONICAL_WORK)
    run(["git", "clean", "-fdx"], cwd=CANONICAL_WORK)
    assert run(["git", "status", "--porcelain"], cwd=CANONICAL_WORK) == ""
    post_builder = run(["node", BUILDER_PATH, "--check"], cwd=CANONICAL_WORK)
    post_validator = run(["node", VALIDATOR_PATH], cwd=CANONICAL_WORK)
    post_adversarial = run(["node", "--test", TEST_PATH], cwd=CANONICAL_WORK)
    (OUT / "post-release-canonical-builder.json").write_text(post_builder + "\n", encoding="utf-8")
    (OUT / "post-release-canonical-validator.json").write_text(post_validator + "\n", encoding="utf-8")
    (OUT / "post-release-canonical-adversarial.log").write_text(post_adversarial + "\n", encoding="utf-8")
    validator = json.loads((OUT / "canonical-validator.json").read_text(encoding="utf-8"))
    assert validator == EXPECTED_VALIDATOR
    assert json.loads(post_validator) == EXPECTED_VALIDATOR
    return validator


def write_checksums() -> None:
    rows = []
    for path in sorted(OUT.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")
    run(["sha256sum", "-c", "SHA256SUMS"], cwd=OUT)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    topology = bind_topology()
    native = recover_native_push()
    replay = canonical_replay()
    assert native["validator"] == replay
    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-canonical-proof@2",
        "state": "canonical_north_dakota_row_state_reconciliation_proved",
        "topology": topology,
        "native_push": native,
        "canonical_replay": replay,
        "permanent_paths": 14,
        "matrix_updates": 1,
        "row_state_mutations": 1,
        "row_terminalizations": 1,
        "substantive_field_terminalizations": 0,
        "class_closed": False,
        "cumulative_ledger_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "outside_human_dependency": False,
    }
    write_json(OUT / "terminal-receipt.json", receipt)
    write_checksums()
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        OUT.mkdir(parents=True, exist_ok=True)
        write_json(
            OUT / "failure.json",
            {
                "schema_version": "ssc-rd04-nd-row-state-canonical-proof-failure@2",
                "state": "failed_closed",
                "canonical_merge": CANONICAL_MERGE,
                "product_commit": PRODUCT_COMMIT,
                "error_type": type(exc).__name__,
                "error": str(exc),
            },
        )
        (OUT / "traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
        write_checksums()
        raise
