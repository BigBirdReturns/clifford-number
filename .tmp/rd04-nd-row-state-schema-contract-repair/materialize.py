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
SOURCE_PRODUCT_TREE = "43df21bfd1371154969379ff2f86a214175d3517"
VALIDATION_REPAIR_MERGE = "789c800d00a6d4924cb69d2ce33d336ab315972f"
VALIDATION_REPAIR_TREE = "fef73cc4267070c8cc7fb7c1dc15481477391d62"
OLD_PROMOTED_SHA = "d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6"
PROMOTED_SHA = "9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb"
PROMOTED_BLOB = "6ba11a6025021e9df8ac6535be8c42499654c233"
PREDECESSOR_SHA = "1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824"
PREDECESSOR_BLOB = "c25a1ad8fdfe82f70f1ff71e61da6796be94c737"
CANDIDATE_ID = "RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V3"
SCHEMA_VERSION = "ssc-rd04-nd-row-state-reconciliation-schema@2"
MANIFEST_VERSION = "ssc-rd04-nd-row-state-reconciliation-manifest@2"

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
STAGED_WORKFLOW_OBJECT = ".tmp/rd04-nd-row-state-schema-contract-repair/standing-workflow.yml"

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
    args.extend(["--name-only", base, head] if not cached else ["--name-only", base])
    text = run(args, cwd=cwd)
    return sorted(line for line in text.splitlines() if line)


def exact_status(base: str, head: str, *, cwd: pathlib.Path = REPO, cached: bool = False) -> list[tuple[str, str]]:
    args = ["git", "diff"]
    if cached:
        args.append("--cached")
    args.extend(["--name-status", base, head] if not cached else ["--name-status", base])
    text = run(args, cwd=cwd)
    result: list[tuple[str, str]] = []
    for line in text.splitlines():
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
    assert exact_status(CANONICAL_PARENT, SOURCE_HEAD) == [("A", path) for path in sorted(PRODUCT_PATHS)]

    live_main = run(["git", "rev-parse", "origin/main"])
    run(["git", "merge-base", "--is-ancestor", CANONICAL_PARENT, live_main])
    intervening = set(exact_names(CANONICAL_PARENT, live_main))
    overlap = sorted(intervening.intersection(PRODUCT_PATHS))
    assert overlap == []
    assert run(["git", "rev-parse", f"{live_main}^{{tree}}"]) != ""
    assert run(["git", "rev-parse", f"{live_main}:data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json"]) == PREDECESSOR_BLOB
    target = run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"])
    assert target == ""
    return {
        "carrier_base": base,
        "carrier_head": head,
        "live_main": live_main,
        "intervening_path_count": len(intervening),
        "intervening_product_path_overlap": overlap,
    }


def patch_schema(path: pathlib.Path) -> dict[str, Any]:
    schema = json.loads(path.read_text(encoding="utf-8"))
    assert schema["properties"]["schema_version"]["const"] == "ssc-rd04-nd-row-state-reconciliation-schema@1"
    assert schema["properties"]["product_contract"]["properties"]["canonical_parent"]["const"] == VALIDATION_REPAIR_MERGE
    assert schema["properties"]["product_contract"]["properties"]["matrix_transition"]["properties"]["predecessor_sha256"]["const"] == PREDECESSOR_SHA
    assert schema["properties"]["product_contract"]["properties"]["matrix_transition"]["properties"]["promoted_sha256"]["const"] == OLD_PROMOTED_SHA
    assert schema["$defs"]["inputCustody"]["properties"]["canonical_parent"]["const"] == VALIDATION_REPAIR_MERGE
    assert schema["$defs"]["inputCustody"]["properties"]["canonical_parent_tree"]["const"] == VALIDATION_REPAIR_TREE
    assert schema["$defs"]["rowStateDecision"]["properties"]["candidate_id"]["const"] == CANDIDATE_ID
    assert schema["$defs"]["productManifest"]["properties"]["schema_version"]["const"] == "ssc-rd04-nd-row-state-reconciliation-manifest@1"

    schema["description"] = (
        "Closed schemas for the request-free one-cell North Dakota row-state reconciliation product "
        f"over current product parent {CANONICAL_PARENT}, with validation-repair custody retained at {VALIDATION_REPAIR_MERGE}."
    )
    schema["properties"]["schema_version"]["const"] = SCHEMA_VERSION
    schema["properties"]["product_contract"]["properties"]["canonical_parent"]["const"] = CANONICAL_PARENT
    schema["properties"]["product_contract"]["properties"]["matrix_transition"]["properties"]["promoted_sha256"]["const"] = PROMOTED_SHA
    schema["$defs"]["inputCustody"]["properties"]["canonical_parent"]["const"] = CANONICAL_PARENT
    schema["$defs"]["inputCustody"]["properties"]["canonical_parent_tree"]["const"] = CANONICAL_PARENT_TREE
    schema["$defs"]["productManifest"]["properties"]["schema_version"]["const"] = MANIFEST_VERSION
    write_json(path, schema)
    return schema


def patch_docs(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        f"This product performs one request-free, exact-current-cell reconciliation after the substantive North Dakota waiver-state field became canonical through merge `{VALIDATION_REPAIR_MERGE}`.",
        f"This product performs one request-free, exact-current-cell reconciliation over current product parent `{CANONICAL_PARENT}` after the North Dakota substantive evidence set became terminal. Its V3 semantic projection remains qualified by validation-repair merge `{VALIDATION_REPAIR_MERGE}`.",
        "milestone current-parent sentence",
    )
    text = replace_once(
        text,
        f"The canonical projection-integrity repair is merge `{VALIDATION_REPAIR_MERGE}`. The final matrix normalizes to semantic projection `6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c` after deleting its sole product metadata object.",
        f"The current product parent is `{CANONICAL_PARENT}`. The historical projection-integrity repair remains merge `{VALIDATION_REPAIR_MERGE}`. The final matrix normalizes to semantic projection `6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c` after deleting its sole product metadata object.",
        "milestone custody sentence",
    )
    path.write_text(text, encoding="utf-8")


def patch_validator(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    old = """  const schema=readJson(m.repoRoot,SCHEMA_PATH,m.overrides);
  const schemaCandidate=schema?.$defs?.rowStateDecision?.properties?.candidate_id?.const;
  assert(schemaCandidate===C.PRIOR_ROW_CANDIDATE_ID,'row-state decision schema candidate id mismatch');
  assert(m.decision.candidate_id===schemaCandidate,'row-state decision does not conform to candidate schema');
"""
    new = """  const schema=readJson(m.repoRoot,SCHEMA_PATH,m.overrides);
  const schemaRootVersion=schema?.properties?.schema_version?.const;
  const schemaProduct=schema?.properties?.product_contract?.properties;
  const schemaTransition=schemaProduct?.matrix_transition?.properties;
  const schemaInput=schema?.$defs?.inputCustody?.properties;
  const schemaCandidate=schema?.$defs?.rowStateDecision?.properties?.candidate_id?.const;
  const schemaManifestVersion=schema?.$defs?.productManifest?.properties?.schema_version?.const;
  assert(schemaRootVersion==='ssc-rd04-nd-row-state-reconciliation-schema@2','row-state product schema version mismatch');
  assert(schemaProduct?.canonical_parent?.const===C.CANONICAL_PARENT,'row-state product schema canonical parent mismatch');
  assert(schemaTransition?.predecessor_sha256?.const===C.PREDECESSOR_MATRIX_SHA,'row-state product schema predecessor matrix mismatch');
  assert(schemaTransition?.promoted_sha256?.const===C.PROMOTED_MATRIX_SHA,'row-state product schema promoted matrix mismatch');
  assert(schemaInput?.canonical_parent?.const===C.CANONICAL_PARENT,'input-custody schema canonical parent mismatch');
  assert(schemaInput?.canonical_parent_tree?.const===C.CANONICAL_PARENT_TREE,'input-custody schema canonical parent tree mismatch');
  assert(schemaCandidate===C.PRIOR_ROW_CANDIDATE_ID,'row-state decision schema candidate id mismatch');
  assert(schemaManifestVersion==='ssc-rd04-nd-row-state-reconciliation-manifest@2','row-state manifest schema version mismatch');
  assert(m.input.canonical_parent===schemaProduct.canonical_parent.const&&m.input.canonical_parent===schemaInput.canonical_parent.const,'input custody does not conform to current product parent schema');
  assert(m.input.canonical_parent_tree===schemaInput.canonical_parent_tree.const,'input custody does not conform to current product parent tree schema');
  assert(m.decision.candidate_id===schemaCandidate,'row-state decision does not conform to candidate schema');
  assert(m.manifest.schema_version===schemaManifestVersion,'product manifest does not conform to manifest schema version');
"""
    text = replace_once(text, old, new, "validator complete schema identity contract")
    path.write_text(text, encoding="utf-8")


def patch_test(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "test('closed product contract rejects 39 adversarial mutations',()=>{",
        "test('closed product contract rejects 45 adversarial mutations',()=>{",
        "test refusal title",
    )
    old = """    ['schema candidate V1 regression',mutateSchema(s=>{s.$defs.rowStateDecision.properties.candidate_id.const='RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1';})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    new = """    ['schema candidate V1 regression',mutateSchema(s=>{s.$defs.rowStateDecision.properties.candidate_id.const='RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1';})],
    ['schema root version regression',mutateSchema(s=>{s.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-schema@1';})],
    ['schema product parent regression',mutateSchema(s=>{s.properties.product_contract.properties.canonical_parent.const='789c800d00a6d4924cb69d2ce33d336ab315972f';})],
    ['schema input parent regression',mutateSchema(s=>{s.$defs.inputCustody.properties.canonical_parent.const='789c800d00a6d4924cb69d2ce33d336ab315972f';})],
    ['schema input parent tree regression',mutateSchema(s=>{s.$defs.inputCustody.properties.canonical_parent_tree.const='fef73cc4267070c8cc7fb7c1dc15481477391d62';})],
    ['schema promoted matrix regression',mutateSchema(s=>{s.properties.product_contract.properties.matrix_transition.properties.promoted_sha256.const='d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6';})],
    ['schema manifest version regression',mutateSchema(s=>{s.$defs.productManifest.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-manifest@1';})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    text = replace_once(text, old, new, "test complete schema regressions")
    text = replace_once(text, "  assert.equal(mutations.length,39);", "  assert.equal(mutations.length,45);", "test refusal denominator")
    path.write_text(text, encoding="utf-8")


def recompute_manifest(worktree: pathlib.Path) -> tuple[dict[str, Any], bytes]:
    manifest = json.loads((worktree / MANIFEST_PATH).read_text(encoding="utf-8"))
    assert manifest["schema_version"] == MANIFEST_VERSION
    assert manifest["permanent_paths"] == PRODUCT_PATHS
    records: list[dict[str, Any]] = []
    for path in PRODUCT_PATHS:
        if path == MANIFEST_PATH:
            continue
        data = (worktree / path).read_bytes()
        records.append({"path": path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})
    manifest["permanent_path_count"] = 14
    manifest["hashed_file_count"] = 13
    manifest["hashed_files"] = records
    rows = sorted(f"{record['path']}\0{record['sha256']}\0{record['bytes']}\n" for record in records)
    manifest["combined_sha256"] = sha256("".join(rows).encode("utf-8"))
    return manifest, write_json(worktree / MANIFEST_PATH, manifest)


def construct_product() -> dict[str, Any]:
    for path in (FULL_WORK, QUAL_WORK, STAGE_WORK):
        if path.exists():
            shutil.rmtree(path)
    run(["git", "worktree", "add", "--detach", str(FULL_WORK), CANONICAL_PARENT])
    for path in PRODUCT_PATHS:
        target = FULL_WORK / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source_bytes(path))

    input_obj = json.loads((FULL_WORK / INPUT_PATH).read_text(encoding="utf-8"))
    matrix_data = (FULL_WORK / MATRIX_PATH).read_bytes()
    assert input_obj["canonical_parent"] == CANONICAL_PARENT
    assert input_obj["canonical_parent_tree"] == CANONICAL_PARENT_TREE
    assert input_obj["prior_candidate_validation"]["merge_commit"] == VALIDATION_REPAIR_MERGE
    assert len(matrix_data) == 499923 and sha256(matrix_data) == PROMOTED_SHA and git_blob(matrix_data) == PROMOTED_BLOB

    schema = patch_schema(FULL_WORK / SCHEMA_PATH)
    patch_docs(FULL_WORK / DOC_PATH)
    patch_validator(FULL_WORK / VALIDATOR_PATH)
    patch_test(FULL_WORK / TEST_PATH)
    manifest, manifest_data = recompute_manifest(FULL_WORK)

    run(["git", "add", "--", *PRODUCT_PATHS], cwd=FULL_WORK)
    expected = sorted(PRODUCT_PATHS)
    assert exact_names(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == expected
    assert exact_status(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == [("A", path) for path in expected]
    run(["git", "diff", "--cached", "--check", CANONICAL_PARENT], cwd=FULL_WORK)
    tree = run(["git", "write-tree"], cwd=FULL_WORK)
    commit_message = (
        "Close North Dakota row-state current-product schema identities\n\n"
        "Align the closed schema with the current product parent, parent tree, promoted matrix, root schema version, manifest version, and V3 decision candidate; make the validator enforce every identity and add six manifest-consistent schema regressions while preserving the exact one-cell row-state transition."
    )
    commit_env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    product_commit = run(
        ["git", "commit-tree", tree, "-p", CANONICAL_PARENT],
        cwd=FULL_WORK,
        env=commit_env,
        input_text=commit_message,
    )
    assert run(["git", "rev-parse", f"{product_commit}^"]) == CANONICAL_PARENT
    assert run(["git", "rev-parse", f"{product_commit}^{{tree}}"]) == tree
    assert exact_names(CANONICAL_PARENT, product_commit) == expected
    assert exact_status(CANONICAL_PARENT, product_commit) == [("A", path) for path in expected]

    records = []
    for path in PRODUCT_PATHS:
        data = (FULL_WORK / path).read_bytes()
        records.append({"path": path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})
    return {
        "product_commit": product_commit,
        "product_tree": tree,
        "manifest": manifest,
        "manifest_bytes": len(manifest_data),
        "manifest_sha256": sha256(manifest_data),
        "manifest_git_blob": git_blob(manifest_data),
        "schema": schema,
        "file_records": records,
    }


def qualify(product: dict[str, Any]) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(QUAL_WORK), product["product_commit"]])
    builder = run(["node", BUILDER_PATH, "--check"], cwd=QUAL_WORK)
    validator = run(["node", VALIDATOR_PATH, "--out", str(OUT / "validator.json")], cwd=QUAL_WORK)
    adversarial = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "builder-check.txt").write_text(builder + "\n", encoding="utf-8")
    (OUT / "validator-stdout.txt").write_text(validator + "\n", encoding="utf-8")
    (OUT / "adversarial.log").write_text(adversarial + "\n", encoding="utf-8")

    release_path = OUT / "release-check.log"
    with release_path.open("w", encoding="utf-8") as handle:
        proc = subprocess.run(
            ["npm", "run", "release:check"],
            cwd=QUAL_WORK,
            env=os.environ.copy(),
            text=True,
            stdout=handle,
            stderr=subprocess.STDOUT,
            check=False,
        )
    if proc.returncode:
        raise RuntimeError(f"release check failed ({proc.returncode}); see {release_path}")

    run(["git", "reset", "--hard", "HEAD"], cwd=QUAL_WORK)
    run(["git", "clean", "-fdx"], cwd=QUAL_WORK)
    assert run(["git", "status", "--porcelain"], cwd=QUAL_WORK) == ""
    post_builder = run(["node", BUILDER_PATH, "--check"], cwd=QUAL_WORK)
    post_validator = run(["node", VALIDATOR_PATH], cwd=QUAL_WORK)
    post_adversarial = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "post-release-builder-check.txt").write_text(post_builder + "\n", encoding="utf-8")
    (OUT / "post-release-validator.txt").write_text(post_validator + "\n", encoding="utf-8")
    (OUT / "post-release-adversarial.log").write_text(post_adversarial + "\n", encoding="utf-8")
    return {
        "builder": "passed",
        "validator": "passed",
        "adversarial_refusals": 45,
        "release_check": "passed",
        "post_release_replay": "passed",
    }


def stage_objects(product: dict[str, Any]) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(STAGE_WORK), CANONICAL_PARENT])
    for path in NONWORKFLOW_PATHS:
        target = STAGE_WORK / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((FULL_WORK / path).read_bytes())
    workflow_object = STAGE_WORK / STAGED_WORKFLOW_OBJECT
    workflow_object.parent.mkdir(parents=True, exist_ok=True)
    workflow_object.write_bytes((FULL_WORK / PRODUCT_WORKFLOW).read_bytes())

    staging_paths = sorted(NONWORKFLOW_PATHS + [STAGED_WORKFLOW_OBJECT])
    run(["git", "add", "--", *staging_paths], cwd=STAGE_WORK)
    assert exact_names(CANONICAL_PARENT, "", cwd=STAGE_WORK, cached=True) == staging_paths
    assert exact_status(CANONICAL_PARENT, "", cwd=STAGE_WORK, cached=True) == [("A", path) for path in staging_paths]
    run(["git", "diff", "--cached", "--check", CANONICAL_PARENT], cwd=STAGE_WORK)
    stage_tree = run(["git", "write-tree"], cwd=STAGE_WORK)
    stage_message = (
        "Stage qualified North Dakota row-state schema-contract repair objects\n\n"
        "Publish thirteen non-workflow product paths and one byte-identical standing-workflow object for repository-authority reconstruction of the qualified fourteen-path tree."
    )
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
        input_text=stage_message,
    )
    assert exact_names(CANONICAL_PARENT, stage_commit) == staging_paths
    assert exact_status(CANONICAL_PARENT, stage_commit) == [("A", path) for path in staging_paths]
    run(["git", "push", "origin", f"{stage_commit}:refs/heads/{TARGET_BRANCH}"])
    observed = run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"])
    observed_sha, observed_ref = observed.split("\t", 1)
    assert observed_sha == stage_commit
    assert observed_ref == f"refs/heads/{TARGET_BRANCH}"
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
    for path in sorted(OUT.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    carrier = bind_carrier()
    product = construct_product()
    qualification = qualify(product)
    staging = stage_objects(product)
    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-schema-contract-repair-materialization@1",
        "state": "qualified_schema_repair_objects_staged",
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
        "manifest_combined_sha256": product["manifest"]["combined_sha256"],
        "manifest_bytes": product["manifest_bytes"],
        "manifest_sha256": product["manifest_sha256"],
        "manifest_git_blob": product["manifest_git_blob"],
        "matrix_bytes": 499923,
        "matrix_sha256": PROMOTED_SHA,
        "matrix_git_blob": PROMOTED_BLOB,
        "schema_contract": {
            "schema_version": SCHEMA_VERSION,
            "canonical_parent": CANONICAL_PARENT,
            "canonical_parent_tree": CANONICAL_PARENT_TREE,
            "predecessor_matrix_sha256": PREDECESSOR_SHA,
            "promoted_matrix_sha256": PROMOTED_SHA,
            "candidate_id": CANDIDATE_ID,
            "manifest_schema_version": MANIFEST_VERSION,
            "historical_validation_repair_merge": VALIDATION_REPAIR_MERGE,
        },
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
                "schema_version": "ssc-rd04-nd-row-state-schema-contract-repair-failure@1",
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
