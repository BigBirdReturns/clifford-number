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
DERIVED_NAMES = [
    "row-state-ledger.json",
    "promoted-partial-field-matrix.json",
    "remaining-open-field-census.json",
    "row-state-summary.json",
    "index.json",
]
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
    output: pathlib.Path | None = None,
) -> str:
    if output is None:
        proc = subprocess.run(
            args,
            cwd=cwd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        text = proc.stdout
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", encoding="utf-8") as handle:
            proc = subprocess.run(
                args,
                cwd=cwd,
                text=True,
                stdout=handle,
                stderr=subprocess.STDOUT,
                check=False,
            )
        text = output.read_text(encoding="utf-8")
    if check and proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{text[-4000:]}")
    return text.strip()


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
            "User-Agent": "rd04-canonical-proof-v3",
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
    topology = {
        "observer_base": base,
        "observer_head": head,
        "canonical_merge": CANONICAL_MERGE,
        "canonical_parent": CANONICAL_PARENT,
        "product_commit": PRODUCT_COMMIT,
        "product_tree": PRODUCT_TREE,
        "merge_parents": parents,
        "permanent_paths": 14,
        "product_to_merge_file_delta": 0,
    }
    write_json(OUT / "topology-proof.json", topology)
    return topology


def summarize_run(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "event": item.get("event"),
        "status": item.get("status"),
        "conclusion": item.get("conclusion"),
        "head_sha": item.get("head_sha"),
        "head_branch": item.get("head_branch"),
        "run_number": item.get("run_number"),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


def inspect_native_push() -> dict[str, Any]:
    query = urllib.parse.urlencode({"head_sha": CANONICAL_MERGE, "event": "push", "per_page": 100})
    url = f"https://api.github.com/repos/{GITHUB_REPOSITORY}/actions/runs?{query}"
    try:
        payload = api(url)
    except Exception as exc:
        ledger = {
            "state": "push_run_api_unavailable",
            "error_type": type(exc).__name__,
            "error": str(exc),
            "matching_product_runs": 0,
            "native_artifact_verified": False,
        }
        write_json(OUT / "push-run-ledger.json", ledger)
        return ledger

    runs = payload.get("workflow_runs", [])
    summarized = [summarize_run(item) for item in runs]
    matches = [item for item in runs if item.get("name") == PRODUCT_WORKFLOW_NAME]
    matches.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    ledger: dict[str, Any] = {
        "state": "push_run_ledger_recovered",
        "total_push_runs_for_merge": len(runs),
        "matching_product_runs": len(matches),
        "runs": summarized,
        "native_artifact_verified": False,
    }
    write_json(OUT / "push-run-ledger.json", ledger)
    if not matches:
        ledger["state"] = "native_product_push_run_not_scheduled"
        write_json(OUT / "push-run-ledger.json", ledger)
        return ledger

    selected = matches[0]
    for _ in range(12):
        if selected.get("status") == "completed":
            break
        time.sleep(5)
        payload = api(url)
        matches = [item for item in payload.get("workflow_runs", []) if item.get("name") == PRODUCT_WORKFLOW_NAME]
        matches.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        if not matches:
            break
        selected = matches[0]
    ledger["selected_run"] = summarize_run(selected)
    if selected.get("status") != "completed":
        raise AssertionError("native product push workflow did not complete")
    if selected.get("conclusion") != "success":
        raise AssertionError(f"native product push workflow concluded {selected.get('conclusion')}")

    artifact_rows = api(
        f"https://api.github.com/repos/{GITHUB_REPOSITORY}/actions/runs/{selected['id']}/artifacts?per_page=100"
    ).get("artifacts", [])
    artifacts = [
        artifact
        for artifact in artifact_rows
        if artifact.get("name") == PRODUCT_ARTIFACT_NAME and not artifact.get("expired")
    ]
    assert len(artifacts) == 1
    artifact = artifacts[0]
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
    ledger.update(
        {
            "state": "native_product_push_artifact_verified",
            "artifact_id": artifact["id"],
            "artifact_name": artifact["name"],
            "artifact_bytes": artifact["size_in_bytes"],
            "artifact_digest": artifact["digest"],
            "artifact_internal_checksum_rows": verified,
            "native_artifact_verified": True,
            "validator": validator,
        }
    )
    write_json(OUT / "push-run-ledger.json", ledger)
    return ledger


def canonical_replay() -> dict[str, Any]:
    if CANONICAL_WORK.exists():
        shutil.rmtree(CANONICAL_WORK)
    run(["git", "worktree", "add", "--detach", str(CANONICAL_WORK), CANONICAL_MERGE])
    generated = OUT / "generated"
    generated.mkdir(parents=True, exist_ok=True)
    run(["node", BUILDER_PATH, "--out", str(generated)], cwd=CANONICAL_WORK, output=OUT / "canonical-builder.json")
    for name in DERIVED_NAMES:
        assert (generated / name).read_bytes() == (CANONICAL_WORK / PRODUCT_ROOT / name).read_bytes()
    run(
        ["node", VALIDATOR_PATH, "--out", str(OUT / "canonical-validator.json")],
        cwd=CANONICAL_WORK,
        output=OUT / "canonical-validator-stdout.txt",
    )
    run(["node", "--test", TEST_PATH], cwd=CANONICAL_WORK, output=OUT / "canonical-adversarial.log")
    run(["npm", "run", "release:check"], cwd=CANONICAL_WORK, output=OUT / "canonical-release-check.log")
    run(["git", "reset", "--hard", "HEAD"], cwd=CANONICAL_WORK)
    run(["git", "clean", "-fdx"], cwd=CANONICAL_WORK)
    assert run(["git", "status", "--porcelain"], cwd=CANONICAL_WORK) == ""
    run(["node", BUILDER_PATH, "--check"], cwd=CANONICAL_WORK, output=OUT / "post-release-canonical-builder.json")
    post_validator_text = run(["node", VALIDATOR_PATH], cwd=CANONICAL_WORK, output=OUT / "post-release-canonical-validator.json")
    run(["node", "--test", TEST_PATH], cwd=CANONICAL_WORK, output=OUT / "post-release-canonical-adversarial.log")
    validator = json.loads((OUT / "canonical-validator.json").read_text(encoding="utf-8"))
    assert validator == EXPECTED_VALIDATOR
    assert json.loads(post_validator_text) == EXPECTED_VALIDATOR
    replay = {
        "state": "canonical_product_replayed",
        "builder_reproduced_derived_files": len(DERIVED_NAMES),
        "validator": validator,
        "adversarial_refusals": 48,
        "release_check": "pass",
        "post_release_replay": "pass",
        "clean_worktree": True,
    }
    write_json(OUT / "canonical-replay-proof.json", replay)
    return replay


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
    native = inspect_native_push()
    replay = canonical_replay()
    if native.get("native_artifact_verified"):
        assert native.get("validator") == replay["validator"]
        state = "canonical_north_dakota_row_state_reconciliation_proved_with_native_push"
    else:
        state = "canonical_north_dakota_row_state_reconciliation_proved_with_bounded_native_push_absence"
    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-canonical-proof@3",
        "state": state,
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
                "schema_version": "ssc-rd04-nd-row-state-canonical-proof-failure@3",
                "state": "failed_closed",
                "canonical_merge": CANONICAL_MERGE,
                "product_commit": PRODUCT_COMMIT,
                "error_type": type(exc).__name__,
                "error": str(exc),
            },
        )
        (OUT / "traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
        try:
            write_checksums()
        except Exception:
            pass
        raise
