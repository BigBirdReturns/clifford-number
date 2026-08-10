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
FULL_WORK = pathlib.Path(os.environ["FULL_WORK"])
QUAL_WORK = pathlib.Path(os.environ["QUAL_WORK"])
STAGE_WORK = pathlib.Path(os.environ["STAGE_WORK"])

CANONICAL_PARENT = os.environ["CANONICAL_PARENT"]
SOURCE_HEAD = os.environ["SOURCE_HEAD"]
SOURCE_BRANCH = os.environ["SOURCE_BRANCH"]
TARGET_BRANCH = os.environ["TARGET_BRANCH"]
WORKFLOW_PATH = os.environ["WORKFLOW_PATH"]
SCRIPT_PATH = os.environ["SCRIPT_PATH"]
TRIGGER_PATH = os.environ["TRIGGER_PATH"]
EVENT_HEAD_SHA = os.environ["EVENT_HEAD_SHA"]
EVENT_BASE_SHA = os.environ["EVENT_BASE_SHA"]

CANONICAL_PARENT_TREE = "80a04c3d6a59816e9f7c99e585e077c92df42dbd"
SOURCE_PRODUCT_TREE = "184e1f97cb438d76341f7819d0d4f86913354b5f"
PROMOTED_SHA = "9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb"
PROMOTED_BLOB = "6ba11a6025021e9df8ac6535be8c42499654c233"
PREDECESSOR_BLOB = "c25a1ad8fdfe82f70f1ff71e61da6796be94c737"
SCHEMA_BYTES = 14765
SCHEMA_SHA256 = "2db941cfac2608bad4efeaa010bd1c28c1f0b97b89ac8e93053350a356df8388"
SCHEMA_GIT_BLOB = "d41112bb621656bd41fcbfaa605e6cedbfeb04ca"

PRODUCT_ROOT = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation"
PRODUCT_WORKFLOW = ".github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml"
INPUT_PATH = f"{PRODUCT_ROOT}/input-custody.json"
DECISION_PATH = f"{PRODUCT_ROOT}/row-state-decision.json"
LEDGER_PATH = f"{PRODUCT_ROOT}/row-state-ledger.json"
MATRIX_PATH = f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json"
CENSUS_PATH = f"{PRODUCT_ROOT}/remaining-open-field-census.json"
SUMMARY_PATH = f"{PRODUCT_ROOT}/row-state-summary.json"
INDEX_PATH = f"{PRODUCT_ROOT}/index.json"
MANIFEST_PATH = f"{PRODUCT_ROOT}/product-manifest.json"
DOC_PATH = "docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md"
SCHEMA_PATH = "schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json"
TEST_PATH = "test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js"
BUILDER_PATH = "tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
VALIDATOR_PATH = "tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
STAGED_WORKFLOW_OBJECT = ".tmp/rd04-nd-row-state-schema-contract-pin/standing-workflow.yml"

PRODUCT_PATHS = [
    PRODUCT_WORKFLOW,
    INPUT_PATH,
    DECISION_PATH,
    LEDGER_PATH,
    MATRIX_PATH,
    CENSUS_PATH,
    SUMMARY_PATH,
    INDEX_PATH,
    MANIFEST_PATH,
    DOC_PATH,
    SCHEMA_PATH,
    TEST_PATH,
    BUILDER_PATH,
    VALIDATOR_PATH,
]
NONWORKFLOW_PATHS = [path for path in PRODUCT_PATHS if path != PRODUCT_WORKFLOW]
REPAIRED_PATHS = sorted([VALIDATOR_PATH, TEST_PATH, MANIFEST_PATH])


def run(
    args: list[str],
    *,
    cwd: pathlib.Path = REPO,
    env: dict[str, str] | None = None,
    check: bool = True,
    input_text: str | None = None,
) -> str:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    proc = subprocess.run(
        args,
        cwd=cwd,
        env=merged,
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if check and proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def run_bytes(args: list[str], *, cwd: pathlib.Path = REPO) -> bytes:
    proc = subprocess.run(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode:
        raise RuntimeError(
            f"binary command failed ({proc.returncode}): {' '.join(args)}\n"
            + proc.stderr.decode("utf-8", errors="replace")
        )
    return proc.stdout


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def write_json(path: pathlib.Path, value: Any) -> bytes:
    data = json_bytes(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


def source_bytes(path: str) -> bytes:
    return run_bytes(["git", "show", f"{SOURCE_HEAD}:{path}"])


def exact_names(base: str, head: str, *, cwd: pathlib.Path = REPO, cached: bool = False) -> list[str]:
    args = ["git", "diff"]
    if cached:
        args.append("--cached")
    args.extend(["--name-only", base] if cached else ["--name-only", base, head])
    return sorted(line for line in run(args, cwd=cwd).splitlines() if line)


def exact_status(base: str, head: str, *, cwd: pathlib.Path = REPO, cached: bool = False) -> list[tuple[str, str]]:
    args = ["git", "diff"]
    if cached:
        args.append("--cached")
    args.extend(["--name-status", base] if cached else ["--name-status", base, head])
    result: list[tuple[str, str]] = []
    for line in run(args, cwd=cwd).splitlines():
        if line:
            status, path = line.split("\t", 1)
            result.append((status, path))
    return sorted(result)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected one replacement, observed {count}")
    return text.replace(old, new, 1)


def bind_carrier() -> dict[str, Any]:
    head = run(["git", "rev-parse", "HEAD"])
    base = run(["git", "rev-parse", "HEAD^"])
    assert head == EVENT_HEAD_SHA
    assert base == EVENT_BASE_SHA
    assert exact_names(base, head) == [TRIGGER_PATH]
    assert exact_status(base, head) == [("A", TRIGGER_PATH)]
    assert run(["git", "merge-base", CANONICAL_PARENT, base]) == CANONICAL_PARENT
    assert run(["git", "rev-list", "--count", f"{CANONICAL_PARENT}..{base}"]) == "2"
    assert exact_names(CANONICAL_PARENT, base) == sorted([WORKFLOW_PATH, SCRIPT_PATH])
    assert exact_status(CANONICAL_PARENT, base) == sorted([("A", WORKFLOW_PATH), ("A", SCRIPT_PATH)])
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
        ]
    )
    assert run(["git", "rev-parse", f"origin/{SOURCE_BRANCH}"]) == SOURCE_HEAD
    assert run(["git", "rev-parse", f"{SOURCE_HEAD}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{SOURCE_HEAD}^{{tree}}"]) == SOURCE_PRODUCT_TREE
    assert exact_names(CANONICAL_PARENT, SOURCE_HEAD) == sorted(PRODUCT_PATHS)
    assert exact_status(CANONICAL_PARENT, SOURCE_HEAD) == [("A", product_path) for product_path in sorted(PRODUCT_PATHS)]

    live_main = run(["git", "rev-parse", "origin/main"])
    run(["git", "merge-base", "--is-ancestor", CANONICAL_PARENT, live_main])
    intervening = set(exact_names(CANONICAL_PARENT, live_main))
    overlap = sorted(intervening.intersection(PRODUCT_PATHS))
    assert overlap == []
    assert run(["git", "rev-parse", f"{live_main}:data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json"]) == PREDECESSOR_BLOB
    assert run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"]) == ""
    return {
        "carrier_base": base,
        "carrier_head": head,
        "live_main": live_main,
        "intervening_path_count": len(intervening),
        "intervening_product_path_overlap": overlap,
    }


def patch_validator(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    constant_anchor = "const SCHEMA_PATH='schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json';\n"
    constants = constant_anchor + (
        f"const PINNED_SCHEMA_BYTES={SCHEMA_BYTES};\n"
        f"const PINNED_SCHEMA_SHA256='{SCHEMA_SHA256}';\n"
        f"const PINNED_SCHEMA_GIT_BLOB='{SCHEMA_GIT_BLOB}';\n"
    )
    text = replace_once(text, constant_anchor, constants, "validator pinned schema constants")
    load_anchor = "  const schema=readJson(m.repoRoot,SCHEMA_PATH,m.overrides);\n"
    load_replacement = (
        "  const schemaBytes=readBytes(m.repoRoot,SCHEMA_PATH,m.overrides);\n"
        "  assert(schemaBytes.length===PINNED_SCHEMA_BYTES,'published schema byte denominator mismatch');\n"
        "  assert(sha(schemaBytes)===PINNED_SCHEMA_SHA256,'published schema SHA-256 mismatch');\n"
        "  assert(gitBlob(schemaBytes)===PINNED_SCHEMA_GIT_BLOB,'published schema Git blob mismatch');\n"
        "  const schema=JSON.parse(schemaBytes);\n"
    )
    text = replace_once(text, load_anchor, load_replacement, "validator pinned schema load")
    path.write_text(text, encoding="utf-8")


def patch_test(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "test('closed product contract rejects 46 adversarial mutations',()=>{",
        "test('closed product contract rejects 47 adversarial mutations',()=>{",
        "test refusal title",
    )
    anchor = """    ['schema observed evidence-state omission',mutateSchema(s=>{const counts=s.$defs.rowStateValue.properties.terminal_evidence_state_counts;counts.required=counts.required.filter(key=>key!=='observed');delete counts.properties.observed;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    replacement = """    ['schema observed evidence-state omission',mutateSchema(s=>{const counts=s.$defs.rowStateValue.properties.terminal_evidence_state_counts;counts.required=counts.required.filter(key=>key!=='observed');delete counts.properties.observed;})],
    ['schema limitations cardinality weakened',mutateSchema(s=>{const limits=s.$defs.rowStateValue.properties.limitations;limits.minItems=0;limits.maxItems=999;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    text = replace_once(text, anchor, replacement, "test complete-schema pin regression")
    text = replace_once(text, "  assert.equal(mutations.length,46);", "  assert.equal(mutations.length,47);", "test refusal denominator")
    path.write_text(text, encoding="utf-8")


def parse_workflow(worktree: pathlib.Path) -> str:
    return run(["ruby", "-e", "require 'yaml'; YAML.load_file(ARGV.fetch(0)); puts 'yaml_ok'", PRODUCT_WORKFLOW], cwd=worktree)


def recompute_manifest(worktree: pathlib.Path) -> tuple[dict[str, Any], bytes]:
    manifest = json.loads((worktree / MANIFEST_PATH).read_text(encoding="utf-8"))
    assert manifest["schema_version"] == "ssc-rd04-nd-row-state-reconciliation-manifest@2"
    assert manifest["permanent_paths"] == PRODUCT_PATHS
    records: list[dict[str, Any]] = []
    for product_path in PRODUCT_PATHS:
        if product_path == MANIFEST_PATH:
            continue
        data = (worktree / product_path).read_bytes()
        records.append({"path": product_path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})
    manifest["permanent_path_count"] = 14
    manifest["hashed_file_count"] = 13
    manifest["hashed_files"] = records
    rows = sorted(f"{record['path']}\0{record['sha256']}\0{record['bytes']}\n" for record in records)
    manifest["combined_sha256"] = sha256("".join(rows).encode("utf-8"))
    return manifest, write_json(worktree / MANIFEST_PATH, manifest)


def construct_product() -> dict[str, Any]:
    for worktree in (FULL_WORK, QUAL_WORK, STAGE_WORK):
        if worktree.exists():
            shutil.rmtree(worktree)
    run(["git", "worktree", "add", "--detach", str(FULL_WORK), CANONICAL_PARENT])
    for product_path in PRODUCT_PATHS:
        target = FULL_WORK / product_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source_bytes(product_path))

    matrix_data = (FULL_WORK / MATRIX_PATH).read_bytes()
    schema_data = (FULL_WORK / SCHEMA_PATH).read_bytes()
    assert len(matrix_data) == 499923 and sha256(matrix_data) == PROMOTED_SHA and git_blob(matrix_data) == PROMOTED_BLOB
    assert len(schema_data) == SCHEMA_BYTES and sha256(schema_data) == SCHEMA_SHA256 and git_blob(schema_data) == SCHEMA_GIT_BLOB
    assert parse_workflow(FULL_WORK) == "yaml_ok"
    patch_validator(FULL_WORK / VALIDATOR_PATH)
    patch_test(FULL_WORK / TEST_PATH)
    manifest, manifest_data = recompute_manifest(FULL_WORK)

    for product_path in PRODUCT_PATHS:
        if product_path not in REPAIRED_PATHS:
            assert (FULL_WORK / product_path).read_bytes() == source_bytes(product_path), product_path

    run(["git", "add", "--", *PRODUCT_PATHS], cwd=FULL_WORK)
    expected = sorted(PRODUCT_PATHS)
    assert exact_names(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == expected
    assert exact_status(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == [("A", product_path) for product_path in expected]
    run(["git", "diff", "--cached", "--check", CANONICAL_PARENT], cwd=FULL_WORK)
    tree = run(["git", "write-tree"], cwd=FULL_WORK)
    message = (
        "Pin North Dakota row-state published schema contract\n\n"
        "Bind the exact schema byte denominator, SHA-256, and Git blob before recursive instance validation, add a manifest-consistent schema-weakening refusal, and preserve executable workflow parsing and the exact one-cell North Dakota row-state transition."
    )
    commit_env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    product_commit = run(["git", "commit-tree", tree, "-p", CANONICAL_PARENT], cwd=FULL_WORK, env=commit_env, input_text=message)
    assert run(["git", "rev-parse", f"{product_commit}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{product_commit}^{{tree}}"]) == tree
    assert exact_names(CANONICAL_PARENT, product_commit) == expected
    assert exact_status(CANONICAL_PARENT, product_commit) == [("A", product_path) for product_path in expected]

    records = []
    for product_path in PRODUCT_PATHS:
        data = (FULL_WORK / product_path).read_bytes()
        records.append({"path": product_path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})
    return {
        "product_commit": product_commit,
        "product_tree": tree,
        "manifest": manifest,
        "manifest_bytes": len(manifest_data),
        "manifest_sha256": sha256(manifest_data),
        "manifest_git_blob": git_blob(manifest_data),
        "validator_bytes": len((FULL_WORK / VALIDATOR_PATH).read_bytes()),
        "validator_sha256": sha256((FULL_WORK / VALIDATOR_PATH).read_bytes()),
        "validator_git_blob": git_blob((FULL_WORK / VALIDATOR_PATH).read_bytes()),
        "test_bytes": len((FULL_WORK / TEST_PATH).read_bytes()),
        "test_sha256": sha256((FULL_WORK / TEST_PATH).read_bytes()),
        "test_git_blob": git_blob((FULL_WORK / TEST_PATH).read_bytes()),
        "file_records": records,
    }


def qualify(product: dict[str, Any]) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(QUAL_WORK), product["product_commit"]])
    yaml_receipt = parse_workflow(QUAL_WORK)
    builder = run(["node", BUILDER_PATH, "--check"], cwd=QUAL_WORK)
    validator = run(["node", VALIDATOR_PATH, "--out", str(OUT / "validator.json")], cwd=QUAL_WORK)
    adversarial = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "workflow-yaml-parse.txt").write_text(yaml_receipt + "\n", encoding="utf-8")
    (OUT / "builder-check.txt").write_text(builder + "\n", encoding="utf-8")
    (OUT / "validator-stdout.txt").write_text(validator + "\n", encoding="utf-8")
    (OUT / "adversarial.log").write_text(adversarial + "\n", encoding="utf-8")

    release_path = OUT / "release-check.log"
    with release_path.open("w", encoding="utf-8") as handle:
        proc = subprocess.run(["npm", "run", "release:check"], cwd=QUAL_WORK, env=os.environ.copy(), text=True, stdout=handle, stderr=subprocess.STDOUT, check=False)
    if proc.returncode:
        raise RuntimeError(f"release check failed ({proc.returncode}); see {release_path}")

    run(["git", "reset", "--hard", "HEAD"], cwd=QUAL_WORK)
    run(["git", "clean", "-fdx"], cwd=QUAL_WORK)
    assert run(["git", "status", "--porcelain"], cwd=QUAL_WORK) == ""
    post_yaml = parse_workflow(QUAL_WORK)
    post_builder = run(["node", BUILDER_PATH, "--check"], cwd=QUAL_WORK)
    post_validator = run(["node", VALIDATOR_PATH], cwd=QUAL_WORK)
    post_adversarial = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "post-release-workflow-yaml-parse.txt").write_text(post_yaml + "\n", encoding="utf-8")
    (OUT / "post-release-builder-check.txt").write_text(post_builder + "\n", encoding="utf-8")
    (OUT / "post-release-validator.txt").write_text(post_validator + "\n", encoding="utf-8")
    (OUT / "post-release-adversarial.log").write_text(post_adversarial + "\n", encoding="utf-8")
    return {
        "workflow_yaml_parse": "passed",
        "schema_contract_pinned": True,
        "schema_bytes": SCHEMA_BYTES,
        "schema_sha256": SCHEMA_SHA256,
        "schema_git_blob": SCHEMA_GIT_BLOB,
        "builder": "passed",
        "validator": "passed",
        "schema_instance_documents": 3,
        "adversarial_refusals": 47,
        "release_check": "passed",
        "post_release_replay": "passed",
    }


def stage_objects(product: dict[str, Any]) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(STAGE_WORK), CANONICAL_PARENT])
    for product_path in NONWORKFLOW_PATHS:
        target = STAGE_WORK / product_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((FULL_WORK / product_path).read_bytes())
    workflow_object = STAGE_WORK / STAGED_WORKFLOW_OBJECT
    workflow_object.parent.mkdir(parents=True, exist_ok=True)
    workflow_object.write_bytes((FULL_WORK / PRODUCT_WORKFLOW).read_bytes())
    staging_paths = sorted(NONWORKFLOW_PATHS + [STAGED_WORKFLOW_OBJECT])
    run(["git", "add", "--", *staging_paths], cwd=STAGE_WORK)
    assert exact_names(CANONICAL_PARENT, "", cwd=STAGE_WORK, cached=True) == staging_paths
    assert exact_status(CANONICAL_PARENT, "", cwd=STAGE_WORK, cached=True) == [("A", product_path) for product_path in staging_paths]
    run(["git", "diff", "--cached", "--check", CANONICAL_PARENT], cwd=STAGE_WORK)
    stage_tree = run(["git", "write-tree"], cwd=STAGE_WORK)
    commit_env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    stage_commit = run(
        ["git", "commit-tree", stage_tree, "-p", CANONICAL_PARENT],
        cwd=STAGE_WORK,
        env=commit_env,
        input_text="Stage qualified North Dakota row-state schema-contract pin objects\n\nPublish thirteen non-workflow product paths and one byte-identical standing-workflow object for repository-authority reconstruction of the qualified fourteen-path tree.",
    )
    assert exact_names(CANONICAL_PARENT, stage_commit) == staging_paths
    assert exact_status(CANONICAL_PARENT, stage_commit) == [("A", product_path) for product_path in staging_paths]
    run(["git", "push", "origin", f"{stage_commit}:refs/heads/{TARGET_BRANCH}"])
    observed = run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"])
    observed_sha, observed_ref = observed.split("\t", 1)
    assert observed_sha == stage_commit and observed_ref == f"refs/heads/{TARGET_BRANCH}"
    workflow_data = (FULL_WORK / PRODUCT_WORKFLOW).read_bytes()
    return {
        "stage_commit": stage_commit,
        "stage_tree": stage_tree,
        "stage_paths": staging_paths,
        "workflow_object_path": STAGED_WORKFLOW_OBJECT,
        "workflow_bytes": len(workflow_data),
        "workflow_sha256": sha256(workflow_data),
        "workflow_git_blob": git_blob(workflow_data),
        "observed_ref": observed_ref,
    }


def write_checksums() -> None:
    rows = []
    for artifact_path in sorted(OUT.rglob("*")):
        if artifact_path.is_file() and artifact_path.name != "SHA256SUMS":
            rows.append(f"{sha256(artifact_path.read_bytes())}  {artifact_path.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    carrier = bind_carrier()
    product = construct_product()
    qualification = qualify(product)
    staging = stage_objects(product)
    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-schema-contract-pin-materialization@1",
        "state": "qualified_schema_contract_pin_objects_staged",
        "carrier": carrier,
        "canonical_parent": CANONICAL_PARENT,
        "canonical_parent_tree": CANONICAL_PARENT_TREE,
        "source_product_head": SOURCE_HEAD,
        "source_product_tree": SOURCE_PRODUCT_TREE,
        "product_commit_local": product["product_commit"],
        "product_tree": product["product_tree"],
        "permanent_paths": 14,
        "added_paths": 14,
        "modified_paths": 0,
        "deleted_paths": 0,
        "repaired_paths": REPAIRED_PATHS,
        "manifest_combined_sha256": product["manifest"]["combined_sha256"],
        "manifest_bytes": product["manifest_bytes"],
        "manifest_sha256": product["manifest_sha256"],
        "manifest_git_blob": product["manifest_git_blob"],
        "validator_bytes": product["validator_bytes"],
        "validator_sha256": product["validator_sha256"],
        "validator_git_blob": product["validator_git_blob"],
        "test_bytes": product["test_bytes"],
        "test_sha256": product["test_sha256"],
        "test_git_blob": product["test_git_blob"],
        "matrix_bytes": 499923,
        "matrix_sha256": PROMOTED_SHA,
        "matrix_git_blob": PROMOTED_BLOB,
        "qualification": qualification,
        "staging": staging,
        "file_records": product["file_records"],
        "transition": {
            "substantive_field_terminalizations": 0,
            "matrix_updates": 1,
            "row_state_mutations": 1,
            "row_terminalizations": 1,
            "terminal_cells": [228, 229],
            "still_open_cells": [222, 221],
            "terminal_units": [10, 11],
            "north_dakota_row_state": ["still_open", "terminal_fixed_public_record_obligation_complete"],
            "class_closed": False,
        },
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
        write_json(
            OUT / "failure.json",
            {
                "schema_version": "ssc-rd04-nd-row-state-schema-contract-pin-failure@1",
                "state": "failed_closed",
                "source_head": SOURCE_HEAD,
                "target_branch": TARGET_BRANCH,
                "error_type": type(exc).__name__,
                "error": str(exc),
            },
        )
        (OUT / "traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
        write_checksums()
        raise
