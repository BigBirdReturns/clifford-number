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
SOURCE_PRODUCT_TREE = "961aadbc46d8e7460a443df478aedf59d432180f"
VALIDATION_REPAIR_MERGE = "789c800d00a6d4924cb69d2ce33d336ab315972f"
PROMOTED_SHA = "9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb"
PROMOTED_BLOB = "6ba11a6025021e9df8ac6535be8c42499654c233"
PREDECESSOR_BLOB = "c25a1ad8fdfe82f70f1ff71e61da6796be94c737"

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
STAGED_WORKFLOW_OBJECT = ".tmp/rd04-nd-row-state-schema-instance-conformance/standing-workflow.yml"

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
    assert exact_status(CANONICAL_PARENT, SOURCE_HEAD) == [("A", path) for path in sorted(PRODUCT_PATHS)]

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


def patch_schema(path: pathlib.Path) -> dict[str, Any]:
    schema = json.loads(path.read_text(encoding="utf-8"))
    counts = schema["$defs"]["rowStateValue"]["properties"]["terminal_evidence_state_counts"]
    assert counts["additionalProperties"] is False
    assert counts["required"] == ["evidence_complete", "not_publicly_recovered"]
    assert list(counts["properties"]) == ["evidence_complete", "not_publicly_recovered"]
    assert counts["properties"]["evidence_complete"]["const"] == 7
    assert counts["properties"]["not_publicly_recovered"]["const"] == 1
    counts["required"] = ["evidence_complete", "observed", "not_publicly_recovered"]
    counts["properties"] = {
        "evidence_complete": {"const": 7},
        "observed": {"const": 0},
        "not_publicly_recovered": {"const": 1},
    }
    return schema | {"_written_bytes": len(write_json(path, schema))}


def patch_validator(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    helper_anchor = "function validateAuthority(value,label){assertExactKeys(value,AUTHORITY_KEYS,`${label}.authority_boundary`);assert(same(value,authorityBoundary()),`${label} authority boundary mismatch`);}\n"
    helpers = helper_anchor + """
function schemaTypeMatches(value,type){
  if(type==='null')return value===null;
  if(type==='array')return Array.isArray(value);
  if(type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(type==='integer')return Number.isInteger(value);
  return typeof value===type;
}
function validateSchemaInstance(root,schema,value,label){
  assert(schema&&typeof schema==='object',`${label} schema missing`);
  if(schema.$ref){
    const prefix='#/$defs/';assert(schema.$ref.startsWith(prefix),`${label} unsupported schema reference ${schema.$ref}`);
    const name=schema.$ref.slice(prefix.length);assert(root.$defs?.[name],`${label} missing schema definition ${name}`);
    return validateSchemaInstance(root,root.$defs[name],value,label);
  }
  if(Object.hasOwn(schema,'const'))assert(same(value,schema.const),`${label} const mismatch`);
  if(Array.isArray(schema.enum))assert(schema.enum.some(item=>same(value,item)),`${label} enum mismatch`);
  if(schema.type){const types=Array.isArray(schema.type)?schema.type:[schema.type];assert(types.some(type=>schemaTypeMatches(value,type)),`${label} type mismatch`);}
  if(typeof value==='string'){
    if(schema.pattern)assert(new RegExp(schema.pattern).test(value),`${label} pattern mismatch`);
    if(Number.isInteger(schema.minLength))assert(value.length>=schema.minLength,`${label} minLength mismatch`);
    if(Number.isInteger(schema.maxLength))assert(value.length<=schema.maxLength,`${label} maxLength mismatch`);
  }
  if(typeof value==='number'){
    if(typeof schema.minimum==='number')assert(value>=schema.minimum,`${label} minimum mismatch`);
    if(typeof schema.maximum==='number')assert(value<=schema.maximum,`${label} maximum mismatch`);
  }
  if(Array.isArray(value)){
    if(Number.isInteger(schema.minItems))assert(value.length>=schema.minItems,`${label} minItems mismatch`);
    if(Number.isInteger(schema.maxItems))assert(value.length<=schema.maxItems,`${label} maxItems mismatch`);
    if(schema.uniqueItems)assert(new Set(value.map(item=>JSON.stringify(item))).size===value.length,`${label} uniqueItems mismatch`);
    const prefix=Array.isArray(schema.prefixItems)?schema.prefixItems:[];
    for(let index=0;index<Math.min(prefix.length,value.length);index++)validateSchemaInstance(root,prefix[index],value[index],`${label}[${index}]`);
    if(schema.items===false)assert(value.length<=prefix.length,`${label} additional array items forbidden`);
    else if(schema.items&&schema.items!==true)for(let index=prefix.length;index<value.length;index++)validateSchemaInstance(root,schema.items,value[index],`${label}[${index}]`);
  }else if(value!==null&&typeof value==='object'){
    const properties=schema.properties??{};
    for(const key of schema.required??[])assert(Object.hasOwn(value,key),`${label} missing required property ${key}`);
    for(const [key,subschema] of Object.entries(properties))if(Object.hasOwn(value,key))validateSchemaInstance(root,subschema,value[key],`${label}.${key}`);
    if(schema.additionalProperties===false){const allowed=new Set(Object.keys(properties));for(const key of Object.keys(value))assert(allowed.has(key),`${label} additional property forbidden ${key}`);}
  }
}
"""
    text = replace_once(text, helper_anchor, helpers, "validator schema-instance helpers")

    identity_anchor = """  assert(schemaManifestVersion==='ssc-rd04-nd-row-state-reconciliation-manifest@2','row-state manifest schema version mismatch');
  assert(m.input.canonical_parent===schemaProduct.canonical_parent.const&&m.input.canonical_parent===schemaInput.canonical_parent.const,'input custody does not conform to current product parent schema');
"""
    identity_insert = """  assert(schemaManifestVersion==='ssc-rd04-nd-row-state-reconciliation-manifest@2','row-state manifest schema version mismatch');
  const schemaEvidenceCounts=schema?.$defs?.rowStateValue?.properties?.terminal_evidence_state_counts;
  assert(same(schemaEvidenceCounts?.required,['evidence_complete','observed','not_publicly_recovered']),'row-state evidence-count schema key set mismatch');
  assert(schemaEvidenceCounts?.additionalProperties===false,'row-state evidence-count schema must remain closed');
  assert(schemaEvidenceCounts?.properties?.evidence_complete?.const===7&&schemaEvidenceCounts?.properties?.observed?.const===0&&schemaEvidenceCounts?.properties?.not_publicly_recovered?.const===1,'row-state evidence-count schema values mismatch');
  assert(m.input.canonical_parent===schemaProduct.canonical_parent.const&&m.input.canonical_parent===schemaInput.canonical_parent.const,'input custody does not conform to current product parent schema');
"""
    text = replace_once(text, identity_anchor, identity_insert, "validator evidence-count identity binding")

    conformance_anchor = """  assert(m.manifest.schema_version===schemaManifestVersion,'product manifest does not conform to manifest schema version');
  for(const name of DERIVED_NAMES){const rel=`${C.ROOT}/${name}`;const actual=readBytes(m.repoRoot,rel,m.overrides);assert(actual.equals(built[name]),`committed ${name} differs from deterministic build`);}
"""
    conformance_insert = """  assert(m.manifest.schema_version===schemaManifestVersion,'product manifest does not conform to manifest schema version');
  validateSchemaInstance(schema,schema.$defs.inputCustody,m.input,'input custody');
  validateSchemaInstance(schema,schema.$defs.rowStateDecision,m.decision,'row-state decision');
  validateSchemaInstance(schema,schema.$defs.productManifest,m.manifest,'product manifest');
  for(const name of DERIVED_NAMES){const rel=`${C.ROOT}/${name}`;const actual=readBytes(m.repoRoot,rel,m.overrides);assert(actual.equals(built[name]),`committed ${name} differs from deterministic build`);}
"""
    text = replace_once(text, conformance_anchor, conformance_insert, "validator complete schema-instance conformance")
    path.write_text(text, encoding="utf-8")


def patch_test(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "test('closed product contract rejects 45 adversarial mutations',()=>{",
        "test('closed product contract rejects 46 adversarial mutations',()=>{",
        "test refusal title",
    )
    anchor = """    ['schema manifest version regression',mutateSchema(s=>{s.$defs.productManifest.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-manifest@1';})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    replacement = """    ['schema manifest version regression',mutateSchema(s=>{s.$defs.productManifest.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-manifest@1';})],
    ['schema observed evidence-state omission',mutateSchema(s=>{const counts=s.$defs.rowStateValue.properties.terminal_evidence_state_counts;counts.required=counts.required.filter(key=>key!=='observed');delete counts.properties.observed;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    text = replace_once(text, anchor, replacement, "test observed-state schema regression")
    text = replace_once(text, "  assert.equal(mutations.length,45);", "  assert.equal(mutations.length,46);", "test refusal denominator")
    path.write_text(text, encoding="utf-8")


def recompute_manifest(worktree: pathlib.Path) -> tuple[dict[str, Any], bytes]:
    manifest = json.loads((worktree / MANIFEST_PATH).read_text(encoding="utf-8"))
    assert manifest["schema_version"] == "ssc-rd04-nd-row-state-reconciliation-manifest@2"
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
    decision_obj = json.loads((FULL_WORK / DECISION_PATH).read_text(encoding="utf-8"))
    matrix_data = (FULL_WORK / MATRIX_PATH).read_bytes()
    assert input_obj["canonical_parent"] == CANONICAL_PARENT
    assert input_obj["canonical_parent_tree"] == CANONICAL_PARENT_TREE
    assert input_obj["prior_candidate_validation"]["merge_commit"] == VALIDATION_REPAIR_MERGE
    assert decision_obj["proposed_row_state_cell"]["value"]["terminal_evidence_state_counts"] == {
        "evidence_complete": 7,
        "observed": 0,
        "not_publicly_recovered": 1,
    }
    assert len(matrix_data) == 499923 and sha256(matrix_data) == PROMOTED_SHA and git_blob(matrix_data) == PROMOTED_BLOB

    schema = patch_schema(FULL_WORK / SCHEMA_PATH)
    patch_validator(FULL_WORK / VALIDATOR_PATH)
    patch_test(FULL_WORK / TEST_PATH)
    manifest, manifest_data = recompute_manifest(FULL_WORK)

    run(["git", "add", "--", *PRODUCT_PATHS], cwd=FULL_WORK)
    expected = sorted(PRODUCT_PATHS)
    assert exact_names(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == expected
    assert exact_status(CANONICAL_PARENT, "", cwd=FULL_WORK, cached=True) == [("A", path) for path in expected]
    run(["git", "diff", "--cached", "--check", CANONICAL_PARENT], cwd=FULL_WORK)
    tree = run(["git", "write-tree"], cwd=FULL_WORK)
    message = (
        "Close North Dakota row-state schema instance conformance\n\n"
        "Admit observed: 0 in the closed terminal evidence-state count schema, validate input custody, decision, and manifest recursively against their published definitions, and require forty-six adversarial refusals while preserving the exact one-cell row-state transition."
    )
    env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    product_commit = run(["git", "commit-tree", tree, "-p", CANONICAL_PARENT], cwd=FULL_WORK, env=env, input_text=message)
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
        proc = subprocess.run(["npm", "run", "release:check"], cwd=QUAL_WORK, env=os.environ.copy(), text=True, stdout=handle, stderr=subprocess.STDOUT, check=False)
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
    return {"builder": "passed", "validator": "passed", "schema_instance_documents": 3, "adversarial_refusals": 46, "release_check": "passed", "post_release_replay": "passed"}


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
    env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    stage_commit = run(
        ["git", "commit-tree", stage_tree, "-p", CANONICAL_PARENT],
        cwd=STAGE_WORK,
        env=env,
        input_text="Stage qualified North Dakota row-state schema-instance conformance objects\n\nPublish thirteen non-workflow product paths and one byte-identical standing-workflow object for repository-authority reconstruction of the qualified fourteen-path tree.",
    )
    assert exact_names(CANONICAL_PARENT, stage_commit) == staging_paths
    assert exact_status(CANONICAL_PARENT, stage_commit) == [("A", path) for path in staging_paths]
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
        "schema_version": "ssc-rd04-nd-row-state-schema-instance-conformance-materialization@1",
        "state": "qualified_schema_instance_conformance_objects_staged",
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
        "schema_instance_contract": {
            "terminal_evidence_state_counts": {"evidence_complete": 7, "observed": 0, "not_publicly_recovered": 1},
            "additional_properties": False,
            "validated_documents": ["input-custody.json", "row-state-decision.json", "product-manifest.json"],
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
                "schema_version": "ssc-rd04-nd-row-state-schema-instance-conformance-failure@1",
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
