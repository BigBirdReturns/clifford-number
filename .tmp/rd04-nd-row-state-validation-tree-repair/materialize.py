#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import traceback
from typing import Any

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
PRODUCT_WORK = pathlib.Path(os.environ["PRODUCT_WORK"])
QUAL_WORK = pathlib.Path(os.environ["QUAL_WORK"])

CANONICAL_PARENT = os.environ["CANONICAL_PARENT"]
SOURCE_HEAD = os.environ["SOURCE_HEAD"]
SOURCE_BRANCH = os.environ["SOURCE_BRANCH"]
TARGET_BRANCH = os.environ["TARGET_BRANCH"]
EXPECTED_TARGET_HEAD = os.environ["EXPECTED_TARGET_HEAD"]
WORKFLOW_PATH = os.environ["WORKFLOW_PATH"]
SCRIPT_PATH = os.environ["SCRIPT_PATH"]
TRIGGER_PATH = os.environ["TRIGGER_PATH"]
EVENT_HEAD_SHA = os.environ["EVENT_HEAD_SHA"]
EVENT_BASE_SHA = os.environ["EVENT_BASE_SHA"]

INVALID_PARENT_TREE = "cca6b16db286f00125b9375c3a3cc505e58b3525"
PRODUCT_WORKFLOW_PATH = ".github/workflows/status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-validation-v2.yml"
PRODUCT_ROOT = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation-validation-v2"
MATRIX_PATH = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json"
VALIDATOR_PATH = "tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v2.py"
MANIFEST_PATH = f"{PRODUCT_ROOT}/product-manifest.json"

PRODUCT_PATHS = [
    PRODUCT_WORKFLOW_PATH,
    f"{PRODUCT_ROOT}/current-row-custody.json",
    f"{PRODUCT_ROOT}/row-state-validation.json",
    f"{PRODUCT_ROOT}/validated-row-state-protocol.json",
    f"{PRODUCT_ROOT}/summary.json",
    MANIFEST_PATH,
    VALIDATOR_PATH,
]


def run(
    args: list[str],
    *,
    cwd: pathlib.Path = REPO,
    env: dict[str, str] | None = None,
    check: bool = True,
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
        raise RuntimeError(
            f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}"
        )
    return proc.stdout.strip()


def run_bytes(args: list[str], *, cwd: pathlib.Path = REPO) -> bytes:
    proc = subprocess.run(
        args,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode:
        raise RuntimeError(
            f"binary command failed ({proc.returncode}): {' '.join(args)}\n"
            + proc.stderr.decode("utf-8", errors="replace")
        )
    return proc.stdout


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(data)).encode("ascii") + b"\0" + data
    ).hexdigest()


def write_json(path: pathlib.Path, value: Any) -> bytes:
    data = (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode(
        "utf-8"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


def source_bytes(path: str) -> bytes:
    return run_bytes(["git", "show", f"{SOURCE_HEAD}:{path}"])


def exact_names(base: str, head: str, *, cwd: pathlib.Path = REPO) -> list[str]:
    text = run(["git", "diff", "--name-only", base, head], cwd=cwd)
    return sorted(line for line in text.splitlines() if line)


def exact_status(base: str, head: str, *, cwd: pathlib.Path = REPO) -> list[tuple[str, str]]:
    text = run(["git", "diff", "--name-status", base, head], cwd=cwd)
    result: list[tuple[str, str]] = []
    for line in text.splitlines():
        if not line:
            continue
        status, path = line.split("\t", 1)
        result.append((status, path))
    return sorted(result)


def bind_carrier() -> dict[str, str]:
    head = run(["git", "rev-parse", "HEAD"])
    base = run(["git", "rev-parse", "HEAD^"])
    assert head == EVENT_HEAD_SHA
    assert base == EVENT_BASE_SHA
    assert run(["git", "rev-list", "--count", f"{base}..{head}"]) == "1"
    assert exact_names(base, head) == [TRIGGER_PATH]
    assert exact_status(base, head) == [("A", TRIGGER_PATH)]
    assert run(["git", "merge-base", CANONICAL_PARENT, base]) == CANONICAL_PARENT
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{base}"]) == "2"
    assert exact_names(CANONICAL_PARENT, base) == sorted([WORKFLOW_PATH, SCRIPT_PATH])
    assert exact_status(CANONICAL_PARENT, base) == sorted(
        [("A", WORKFLOW_PATH), ("A", SCRIPT_PATH)]
    )
    run(["git", "diff", "--check", CANONICAL_PARENT, head])

    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--force",
            "origin",
            "+refs/heads/main:refs/remotes/origin/main",
            f"+refs/heads/{SOURCE_BRANCH}:refs/remotes/origin/{SOURCE_BRANCH}",
            f"+refs/heads/{TARGET_BRANCH}:refs/remotes/origin/{TARGET_BRANCH}",
        ]
    )
    assert run(["git", "rev-parse", "origin/main"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"origin/{SOURCE_BRANCH}"]) == SOURCE_HEAD
    assert run(["git", "rev-parse", f"origin/{TARGET_BRANCH}"]) == EXPECTED_TARGET_HEAD
    return {"carrier_base": base, "carrier_head": head}


def repair_workflow(text: str, actual_parent_tree: str) -> str:
    assert text.count(INVALID_PARENT_TREE) == 1
    text = text.replace(INVALID_PARENT_TREE, actual_parent_tree)
    text = text.replace(
        "name: Validate RD-04 North Dakota row-state reconciliation V2",
        "name: Validate RD-04 North Dakota row-state reconciliation V2 repaired",
        1,
    )
    start = '          rm -rf "$OUT" && mkdir -p "$OUT"\n'
    assert text.count(start) == 1
    text = text.replace(
        start,
        start
        + '          printf \'%s\\n\' "bind_started" > "$OUT/bind-start.txt"\n',
        1,
    )
    old = (
        '          test "$(git rev-parse "$PRODUCT_COMMIT:$MATRIX_PATH")" = '
        "'c25a1ad8fdfe82f70f1ff71e61da6796be94c737'\n"
    )
    new = (
        '          MATRIX_BLOB="$(git ls-tree "$PRODUCT_COMMIT" -- "$MATRIX_PATH" '
        '| awk \'NR==1 {print $3}\')"\n'
        '          test "$MATRIX_BLOB" = '
        "'c25a1ad8fdfe82f70f1ff71e61da6796be94c737'\n"
    )
    assert text.count(old) == 1
    text = text.replace(old, new, 1)
    assert INVALID_PARENT_TREE not in text
    return text


def build_manifest(worktree: pathlib.Path) -> tuple[dict[str, Any], bytes]:
    source_manifest = json.loads(source_bytes(MANIFEST_PATH))
    assert source_manifest["permanent_paths"] == PRODUCT_PATHS
    assert source_manifest["permanent_path_count"] == 7
    assert source_manifest["hashed_file_count"] == 6
    assert source_manifest["self_describing_manifest_excluded_from_combined_payload"] is True

    records: list[dict[str, Any]] = []
    for path in PRODUCT_PATHS:
        if path == MANIFEST_PATH:
            continue
        data = (worktree / path).read_bytes()
        records.append(
            {
                "path": path,
                "bytes": len(data),
                "sha256": sha256(data),
                "git_blob": git_blob(data),
            }
        )

    assert [record["path"] for record in records] == [
        path for path in PRODUCT_PATHS if path != MANIFEST_PATH
    ]
    preimage = "".join(
        f"{record['path']}\0{record['sha256']}\0{record['bytes']}\n"
        for record in sorted(records, key=lambda item: item["path"])
    ).encode("utf-8")

    manifest = {
        "schema_version": source_manifest["schema_version"],
        "permanent_path_count": 7,
        "hashed_file_count": 6,
        "self_describing_manifest_excluded_from_combined_payload": True,
        "permanent_paths": PRODUCT_PATHS,
        "hashed_files": records,
        "combined_sha256": sha256(preimage),
        "authority_boundary": source_manifest["authority_boundary"],
    }
    return manifest, write_json(worktree / MANIFEST_PATH, manifest)


def create_product(actual_parent_tree: str) -> dict[str, Any]:
    for path in (PRODUCT_WORK, QUAL_WORK):
        if path.exists():
            shutil.rmtree(path)

    run(["git", "worktree", "add", "--detach", str(PRODUCT_WORK), CANONICAL_PARENT])

    replacement_count = 0
    for path in PRODUCT_PATHS:
        if path == MANIFEST_PATH:
            continue
        text = source_bytes(path).decode("utf-8")
        if path == PRODUCT_WORKFLOW_PATH:
            text = repair_workflow(text, actual_parent_tree)
            replacement_count += 1
        else:
            count = text.count(INVALID_PARENT_TREE)
            if count:
                text = text.replace(INVALID_PARENT_TREE, actual_parent_tree)
                replacement_count += count
        target = PRODUCT_WORK / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    assert replacement_count >= 3
    for path in PRODUCT_PATHS:
        if path == MANIFEST_PATH:
            continue
        assert INVALID_PARENT_TREE.encode("ascii") not in (PRODUCT_WORK / path).read_bytes()

    custody = json.loads((PRODUCT_WORK / f"{PRODUCT_ROOT}/current-row-custody.json").read_text())
    assert custody["canonical_parent"] == CANONICAL_PARENT
    assert custody["canonical_parent_tree"] == actual_parent_tree

    validator_text = (PRODUCT_WORK / VALIDATOR_PATH).read_text(encoding="utf-8")
    assert actual_parent_tree in validator_text
    assert INVALID_PARENT_TREE not in validator_text

    manifest, manifest_bytes = build_manifest(PRODUCT_WORK)

    expected_paths = sorted(PRODUCT_PATHS)
    assert exact_names(CANONICAL_PARENT, "HEAD", cwd=PRODUCT_WORK) == expected_paths
    assert exact_status(CANONICAL_PARENT, "HEAD", cwd=PRODUCT_WORK) == [
        ("A", path) for path in expected_paths
    ]
    run(["git", "diff", "--check", CANONICAL_PARENT, "HEAD"], cwd=PRODUCT_WORK)

    run(["git", "add", "--", *PRODUCT_PATHS], cwd=PRODUCT_WORK)
    tree = run(["git", "write-tree"], cwd=PRODUCT_WORK)

    commit_message = (
        "Validate North Dakota row-state reconciliation against exact repaired main tree\n\n"
        "Replace the invalid copied parent-tree identity with the actual Git tree of "
        f"{CANONICAL_PARENT}, preserve the exact current North Dakota row and row-state "
        "candidate, retain the seven-addition denominator and zero validation-side effect, "
        "and preserve failure custody before the hosted bind."
    )
    commit_env = os.environ.copy()
    commit_env.update(
        {
            "GIT_AUTHOR_NAME": "BigBirdReturns",
            "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
            "GIT_COMMITTER_NAME": "BigBirdReturns",
            "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
        }
    )
    proc = subprocess.run(
        ["git", "commit-tree", tree, "-p", CANONICAL_PARENT],
        cwd=PRODUCT_WORK,
        env=commit_env,
        input=commit_message,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode:
        raise RuntimeError(proc.stderr)
    product_commit = proc.stdout.strip()

    assert run(["git", "rev-parse", f"{product_commit}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{product_commit}^{{tree}}"]) == tree
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{product_commit}"]) == "1"
    assert exact_names(CANONICAL_PARENT, product_commit) == expected_paths
    assert exact_status(CANONICAL_PARENT, product_commit) == [
        ("A", path) for path in expected_paths
    ]

    file_records = []
    for path in PRODUCT_PATHS:
        data = (PRODUCT_WORK / path).read_bytes()
        file_records.append(
            {
                "path": path,
                "bytes": len(data),
                "sha256": sha256(data),
                "git_blob": git_blob(data),
            }
        )

    return {
        "actual_parent_tree": actual_parent_tree,
        "product_commit": product_commit,
        "product_tree": tree,
        "manifest": manifest,
        "manifest_bytes": len(manifest_bytes),
        "manifest_sha256": sha256(manifest_bytes),
        "manifest_git_blob": git_blob(manifest_bytes),
        "file_records": file_records,
        "replacement_count": replacement_count,
    }


def qualify_product(product: dict[str, Any]) -> dict[str, Any]:
    product_commit = product["product_commit"]
    run(["git", "worktree", "add", "--detach", str(QUAL_WORK), product_commit])

    validation_env = {
        "VALIDATION_ROOT": PRODUCT_ROOT,
        "MATRIX_PATH": MATRIX_PATH,
        "VALIDATION_HEAD": product_commit,
    }

    run(["python", "-m", "py_compile", VALIDATOR_PATH], cwd=QUAL_WORK, env=validation_env)
    first = run(["python", VALIDATOR_PATH], cwd=QUAL_WORK, env=validation_env)
    (OUT / "validation-receipt.json").write_text(first + "\n", encoding="utf-8")

    release_log_path = OUT / "release-check.log"
    release_env = os.environ.copy()
    release_env.update(validation_env)
    with release_log_path.open("w", encoding="utf-8") as log:
        proc = subprocess.run(
            ["npm", "run", "release:check"],
            cwd=QUAL_WORK,
            env=release_env,
            text=True,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
        )
    if proc.returncode:
        raise RuntimeError(
            f"release check failed ({proc.returncode}); see {release_log_path}"
        )

    run(["git", "reset", "--hard", "HEAD"], cwd=QUAL_WORK)
    run(["git", "clean", "-fdx"], cwd=QUAL_WORK)
    assert run(["git", "status", "--porcelain"], cwd=QUAL_WORK) == ""

    second = run(["python", VALIDATOR_PATH], cwd=QUAL_WORK, env=validation_env)
    (OUT / "post-release-validation-receipt.json").write_text(
        second + "\n", encoding="utf-8"
    )
    assert first == second

    parsed = json.loads(first)
    assert parsed["state"] == "validated_exact_current_row_state_requires_separate_promotion"
    assert parsed["canonical_parent"] == CANONICAL_PARENT
    assert parsed["head"] == product_commit
    assert parsed["promotion_executed_here"] is False
    assert parsed["projected_matrix_updates"] == 1
    assert parsed["projected_row_state_mutations"] == 1
    assert parsed["projected_row_terminalizations"] == 1
    assert parsed["class_closed"] is False

    return {
        "validation_state": parsed["state"],
        "release_check": "passed",
        "pre_post_receipts_identical": True,
    }


def publish(product: dict[str, Any]) -> dict[str, str]:
    product_commit = product["product_commit"]
    run(
        [
            "git",
            "push",
            "origin",
            f"{product_commit}:refs/heads/{TARGET_BRANCH}",
            f"--force-with-lease=refs/heads/{TARGET_BRANCH}:{EXPECTED_TARGET_HEAD}",
        ]
    )
    observed = run(
        ["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"]
    )
    observed_sha, observed_ref = observed.split("\t", 1)
    assert observed_sha == product_commit
    assert observed_ref == f"refs/heads/{TARGET_BRANCH}"
    return {"observed_sha": observed_sha, "observed_ref": observed_ref}


def write_checksums() -> None:
    rows = []
    for path in sorted(OUT.rglob("*")):
        if not path.is_file() or path.name == "SHA256SUMS":
            continue
        rel = path.relative_to(OUT).as_posix()
        rows.append(f"{sha256(path.read_bytes())}  {rel}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    carrier = bind_carrier()
    actual_parent_tree = run(["git", "rev-parse", f"{CANONICAL_PARENT}^{{tree}}"])
    assert run(["git", "cat-file", "-t", actual_parent_tree]) == "tree"
    assert actual_parent_tree != INVALID_PARENT_TREE

    product = create_product(actual_parent_tree)
    qualification = qualify_product(product)
    publication = publish(product)

    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-validation-tree-repair-materialization@1",
        "state": "corrected_validation_product_published",
        "canonical_parent": CANONICAL_PARENT,
        "actual_canonical_parent_tree": actual_parent_tree,
        "invalid_copied_parent_tree": INVALID_PARENT_TREE,
        "source_head": SOURCE_HEAD,
        "source_branch": SOURCE_BRANCH,
        "target_branch": TARGET_BRANCH,
        "expected_target_head": EXPECTED_TARGET_HEAD,
        "carrier": carrier,
        "product_commit": product["product_commit"],
        "product_tree": product["product_tree"],
        "permanent_paths": 7,
        "added_paths": 7,
        "modified_paths": 0,
        "deleted_paths": 0,
        "false_tree_replacements": product["replacement_count"],
        "manifest_combined_sha256": product["manifest"]["combined_sha256"],
        "manifest_bytes": product["manifest_bytes"],
        "manifest_sha256": product["manifest_sha256"],
        "manifest_git_blob": product["manifest_git_blob"],
        "file_records": product["file_records"],
        "qualification": qualification,
        "publication": publication,
        "promotion_executed_here": False,
        "field_terminalizations": 0,
        "matrix_updates": 0,
        "row_state_mutations": 0,
        "row_terminalizations": 0,
        "class_closed": False,
        "outside_human_dependency": False,
    }
    write_json(OUT / "materialization-receipt.json", receipt)
    write_checksums()
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        OUT.mkdir(parents=True, exist_ok=True)
        failure = {
            "schema_version": "ssc-rd04-nd-row-state-validation-tree-repair-failure@1",
            "state": "failed_closed",
            "canonical_parent": CANONICAL_PARENT,
            "source_head": SOURCE_HEAD,
            "target_branch": TARGET_BRANCH,
            "expected_target_head": EXPECTED_TARGET_HEAD,
            "error_type": type(exc).__name__,
            "error": str(exc),
        }
        write_json(OUT / "failure.json", failure)
        (OUT / "traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
        write_checksums()
        raise
