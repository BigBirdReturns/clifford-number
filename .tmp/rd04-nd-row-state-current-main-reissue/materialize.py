#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import traceback
from typing import Any

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
FULL_WORK = pathlib.Path(os.environ["FULL_WORK"])
QUAL_WORK = pathlib.Path(os.environ["QUAL_WORK"])
STAGE_WORK = pathlib.Path(os.environ["STAGE_WORK"])

CARRIER_PARENT = os.environ["CARRIER_PARENT"]
SOURCE_HEAD = os.environ["SOURCE_HEAD"]
SOURCE_BRANCH = os.environ["SOURCE_BRANCH"]
TARGET_BRANCH = os.environ["TARGET_BRANCH"]
WORKFLOW_PATH = os.environ["WORKFLOW_PATH"]
SCRIPT_PATH = os.environ["SCRIPT_PATH"]
TRIGGER_PATH = os.environ["TRIGGER_PATH"]
EVENT_HEAD_SHA = os.environ["EVENT_HEAD_SHA"]
EVENT_BASE_SHA = os.environ["EVENT_BASE_SHA"]

OLD_PARENT = "789c800d00a6d4924cb69d2ce33d336ab315972f"
OLD_PARENT_TREE = "fef73cc4267070c8cc7fb7c1dc15481477391d62"
SOURCE_PRODUCT_HEAD = "4e180c0593cd2446faf2dc1286b07096d1d8b905"
PREDECESSOR_MATRIX_PATH = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json"
PREDECESSOR_MATRIX_BLOB = "c25a1ad8fdfe82f70f1ff71e61da6796be94c737"
PRODUCT_ROOT = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation"
PRODUCT_WORKFLOW = ".github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml"
INPUT_PATH = f"{PRODUCT_ROOT}/input-custody.json"
DECISION_PATH = f"{PRODUCT_ROOT}/row-state-decision.json"
MATRIX_PATH = f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json"
MANIFEST_PATH = f"{PRODUCT_ROOT}/product-manifest.json"
SCHEMA_PATH = "schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json"
TEST_PATH = "test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js"
BUILDER_PATH = "tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
VALIDATOR_PATH = "tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs"
STAGED_WORKFLOW_OBJECT = ".tmp/rd04-nd-row-state-reconciliation-reissue/standing-workflow.yml"

PRODUCT_PATHS = [
    PRODUCT_WORKFLOW,
    f"{PRODUCT_ROOT}/input-custody.json",
    f"{PRODUCT_ROOT}/row-state-decision.json",
    f"{PRODUCT_ROOT}/row-state-ledger.json",
    f"{PRODUCT_ROOT}/promoted-partial-field-matrix.json",
    f"{PRODUCT_ROOT}/remaining-open-field-census.json",
    f"{PRODUCT_ROOT}/row-state-summary.json",
    f"{PRODUCT_ROOT}/index.json",
    MANIFEST_PATH,
    "docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md",
    SCHEMA_PATH,
    TEST_PATH,
    BUILDER_PATH,
    VALIDATOR_PATH,
]
NONWORKFLOW_PATHS = [path for path in PRODUCT_PATHS if path != PRODUCT_WORKFLOW]
DERIVED_NAMES = [
    "row-state-ledger.json",
    "promoted-partial-field-matrix.json",
    "remaining-open-field-census.json",
    "row-state-summary.json",
    "index.json",
]


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
    assert run(["git", "merge-base", CARRIER_PARENT, base]) == CARRIER_PARENT
    assert exact_names(CARRIER_PARENT, base) == sorted([WORKFLOW_PATH, SCRIPT_PATH])
    assert exact_status(CARRIER_PARENT, base) == sorted([("A", WORKFLOW_PATH), ("A", SCRIPT_PATH)])
    run(["git", "diff", "--check", CARRIER_PARENT, head])

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
    assert SOURCE_HEAD == SOURCE_PRODUCT_HEAD
    target = run(["git", "ls-remote", "--heads", "origin", f"refs/heads/{TARGET_BRANCH}"])
    assert target == ""
    return {"carrier_base": base, "carrier_head": head}


def patch_workflow(text: str, live_main: str) -> str:
    text = replace_once(
        text,
        f"  CANONICAL_PARENT: {OLD_PARENT}",
        f"  CANONICAL_PARENT: {live_main}",
        "workflow canonical parent",
    )
    pattern = re.compile(
        r'''          if \[ "\$EVENT" = pull_request \]; then\n.*?          fi\n''',
        re.DOTALL,
    )
    replacement = '''          if [ "$EVENT" = pull_request ]; then
            PRODUCT_COMMIT='${{ github.event.pull_request.head.sha }}'
            BASE_SHA='${{ github.event.pull_request.base.sha }}'
            test "$CHECKOUT_HEAD" = "$PRODUCT_COMMIT"
            git fetch --no-tags --force origin '+refs/heads/main:refs/remotes/origin/main'
            test "$(git rev-parse origin/main)" = "$BASE_SHA"
          else
            read -r P1 P2 EXTRA <<< "$(git show -s --format='%P' HEAD)"
            test -n "$P1" && test -n "$P2" && test -z "${EXTRA:-}"
            BASE_SHA="$P1"
            PRODUCT_COMMIT="$P2"
          fi
          test "$(git rev-parse "$PRODUCT_COMMIT^")" = "$CANONICAL_PARENT"
          git merge-base --is-ancestor "$CANONICAL_PARENT" "$BASE_SHA"
'''
    text, count = pattern.subn(replacement, text, count=1)
    assert count == 1
    needle = '          git diff --check "$CANONICAL_PARENT" "$PRODUCT_COMMIT"\n'
    addition = '''          git diff --check "$CANONICAL_PARENT" "$PRODUCT_COMMIT"
          printf '%s\n' "$EXPECTED" > "$OUT/product-paths.txt"
          git diff --name-only "$CANONICAL_PARENT" "$BASE_SHA" | LC_ALL=C sort > "$OUT/intervening-paths.txt"
          test -z "$(comm -12 "$OUT/product-paths.txt" "$OUT/intervening-paths.txt")"
          if [ "$EVENT" = push ]; then
            test "$(git diff --name-only "$BASE_SHA" HEAD | LC_ALL=C sort)" = "$EXPECTED"
            test "$(git diff --name-only --diff-filter=A "$BASE_SHA" HEAD | LC_ALL=C sort)" = "$EXPECTED"
            test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$BASE_SHA" HEAD)"
            while IFS= read -r PRODUCT_PATH; do
              test "$(git rev-parse "HEAD:$PRODUCT_PATH")" = "$(git rev-parse "$PRODUCT_COMMIT:$PRODUCT_PATH")"
            done <<< "$EXPECTED"
          fi
'''
    text = replace_once(text, needle, addition, "workflow compatibility gate")
    return text


def patch_test(text: str) -> str:
    helper_needle = "const recomputeCombined=m=>{const rows=m.hashed_files.map(r=>`${r.path}\\0${r.sha256}\\0${r.bytes}\\n`).sort();m.combined_sha256=crypto.createHash('sha256').update(rows.join('')).digest('hex');};\n"
    helper_add = helper_needle + "const digest=data=>crypto.createHash('sha256').update(data).digest('hex');\nconst blob=data=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\\0`),data])).digest('hex');\nconst mutateSchema=fn=>{const schema=json(rel.schema);fn(schema);const schemaBytes=encode(schema);const manifest=json(rel.manifest);const rec=manifest.hashed_files.find(r=>r.path===rel.schema);rec.bytes=schemaBytes.length;rec.sha256=digest(schemaBytes);rec.git_blob=blob(schemaBytes);recomputeCombined(manifest);return new Map([[rel.schema,schemaBytes],[rel.manifest,encode(manifest)]]);};\n"
    text = replace_once(text, helper_needle, helper_add, "test schema helper")
    text = replace_once(
        text,
        "test('closed product contract rejects 38 adversarial mutations',()=>{",
        "test('closed product contract rejects 39 adversarial mutations',()=>{",
        "test refusal title",
    )
    mutation_needle = "    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],\n"
    mutation_add = "    ['schema candidate V1 regression',mutateSchema(s=>{s.$defs.rowStateDecision.properties.candidate_id.const='RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1';})],\n" + mutation_needle
    text = replace_once(text, mutation_needle, mutation_add, "test schema mutation")
    text = replace_once(text, "  assert.equal(mutations.length,38);", "  assert.equal(mutations.length,39);", "test refusal count")
    return text


def patch_validator(text: str) -> str:
    text = replace_once(
        text,
        "const MANIFEST_PATH=`${C.ROOT}/product-manifest.json`;\n",
        "const MANIFEST_PATH=`${C.ROOT}/product-manifest.json`;\nconst SCHEMA_PATH='schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json';\n",
        "validator schema path",
    )
    needle = "  const built=buildProduct(m.repoRoot,m.overrides); const model=buildModel(m.repoRoot,m.overrides);\n"
    addition = needle + "  const schema=readJson(m.repoRoot,SCHEMA_PATH,m.overrides);\n  const schemaCandidate=schema?.$defs?.rowStateDecision?.properties?.candidate_id?.const;\n  assert(schemaCandidate===C.PRIOR_ROW_CANDIDATE_ID,'row-state decision schema candidate id mismatch');\n  assert(m.decision.candidate_id===schemaCandidate,'row-state decision does not conform to candidate schema');\n"
    return replace_once(text, needle, addition, "validator schema enforcement")


def patch_builder(text: str, live_main: str, live_tree: str, input_data: bytes, matrix_data: bytes) -> str:
    text = replace_once(text, "  INPUT_BYTES: 6188,", f"  INPUT_BYTES: {len(input_data)},", "builder input bytes")
    text = replace_once(text, "  INPUT_SHA: '3233bb5ac506a9c2eb03fb3244673e79a948f695d2a4ae0b70771cf6f99b1efd',", f"  INPUT_SHA: '{sha256(input_data)}',", "builder input sha")
    text = replace_once(text, "  INPUT_BLOB: '1003c3bcba44554c51163f2f92ba21f28dbf597d',", f"  INPUT_BLOB: '{git_blob(input_data)}',", "builder input blob")
    text = replace_once(text, f"  CANONICAL_PARENT: '{OLD_PARENT}',", f"  CANONICAL_PARENT: '{live_main}',", "builder canonical parent")
    text = replace_once(text, f"  CANONICAL_PARENT_TREE: '{OLD_PARENT_TREE}',", f"  CANONICAL_PARENT_TREE: '{live_tree}',", "builder canonical tree")
    text = replace_once(text, "  PROMOTED_MATRIX_BYTES: 499923,", f"  PROMOTED_MATRIX_BYTES: {len(matrix_data)},", "builder matrix bytes")
    text = replace_once(text, "  PROMOTED_MATRIX_SHA: 'd2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6',", f"  PROMOTED_MATRIX_SHA: '{sha256(matrix_data)}',", "builder matrix sha")
    text = replace_once(text, "  PROMOTED_MATRIX_BLOB: '66a9a6d7003a39b1dca569895e0bc3513f004ca6',", f"  PROMOTED_MATRIX_BLOB: '{git_blob(matrix_data)}',", "builder matrix blob")
    text = replace_once(
        text,
        "prior.merge_commit === C.CANONICAL_PARENT",
        f"prior.merge_commit === '{OLD_PARENT}'",
        "builder prior merge custody",
    )
    text = replace_once(
        text,
        "validation_repair_merge_commit:C.CANONICAL_PARENT,",
        f"validation_repair_merge_commit:'{OLD_PARENT}',",
        "builder prior product metadata",
    )
    return text


def recompute_manifest(worktree: pathlib.Path) -> tuple[dict[str, Any], bytes]:
    manifest = json.loads((worktree / MANIFEST_PATH).read_text(encoding="utf-8"))
    assert manifest["permanent_paths"] == PRODUCT_PATHS
    records = []
    for path in PRODUCT_PATHS:
        if path == MANIFEST_PATH:
            continue
        data = (worktree / path).read_bytes()
        records.append({"path": path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})
    manifest["hashed_files"] = records
    manifest["permanent_path_count"] = 14
    manifest["hashed_file_count"] = 13
    rows = sorted(f"{r['path']}\0{r['sha256']}\0{r['bytes']}\n" for r in records)
    manifest["combined_sha256"] = sha256("".join(rows).encode("utf-8"))
    return manifest, write_json(worktree / MANIFEST_PATH, manifest)


def construct_product(live_main: str, live_tree: str) -> dict[str, Any]:
    for path in (FULL_WORK, QUAL_WORK, STAGE_WORK):
        if path.exists():
            shutil.rmtree(path)
    run(["git", "worktree", "add", "--detach", str(FULL_WORK), live_main])

    for path in PRODUCT_PATHS:
        target = FULL_WORK / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source_bytes(path))

    input_obj = json.loads((FULL_WORK / INPUT_PATH).read_text(encoding="utf-8"))
    assert input_obj["canonical_parent"] == OLD_PARENT
    assert input_obj["canonical_parent_tree"] == OLD_PARENT_TREE
    input_obj["canonical_parent"] = live_main
    input_obj["canonical_parent_tree"] = live_tree
    input_data = write_json(FULL_WORK / INPUT_PATH, input_obj)

    schema_text = (FULL_WORK / SCHEMA_PATH).read_text(encoding="utf-8")
    schema_text = replace_once(
        schema_text,
        '"const": "RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1"',
        '"const": "RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V3"',
        "schema candidate version",
    )
    (FULL_WORK / SCHEMA_PATH).write_text(schema_text, encoding="utf-8")

    matrix_obj = json.loads((FULL_WORK / MATRIX_PATH).read_text(encoding="utf-8"))
    product_meta = matrix_obj["postpromotion_nd_current_public_record_gap_row_state_reconciliation_product"]
    assert product_meta["canonical_parent"] == OLD_PARENT
    assert product_meta["canonical_parent_tree"] == OLD_PARENT_TREE
    product_meta["canonical_parent"] = live_main
    product_meta["canonical_parent_tree"] = live_tree
    product_meta["validation_repair_merge_commit"] = OLD_PARENT
    matrix_data = write_json(FULL_WORK / MATRIX_PATH, matrix_obj)

    builder_text = (FULL_WORK / BUILDER_PATH).read_text(encoding="utf-8")
    builder_text = patch_builder(builder_text, live_main, live_tree, input_data, matrix_data)
    (FULL_WORK / BUILDER_PATH).write_text(builder_text, encoding="utf-8")

    workflow_text = (FULL_WORK / PRODUCT_WORKFLOW).read_text(encoding="utf-8")
    (FULL_WORK / PRODUCT_WORKFLOW).write_text(patch_workflow(workflow_text, live_main), encoding="utf-8")

    validator_text = (FULL_WORK / VALIDATOR_PATH).read_text(encoding="utf-8")
    (FULL_WORK / VALIDATOR_PATH).write_text(patch_validator(validator_text), encoding="utf-8")

    test_text = (FULL_WORK / TEST_PATH).read_text(encoding="utf-8")
    (FULL_WORK / TEST_PATH).write_text(patch_test(test_text), encoding="utf-8")

    generated = OUT / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    run(["node", BUILDER_PATH, "--out", str(generated)], cwd=FULL_WORK)
    for name in DERIVED_NAMES:
        shutil.copyfile(generated / name, FULL_WORK / PRODUCT_ROOT / name)

    manifest, manifest_data = recompute_manifest(FULL_WORK)

    expected = sorted(PRODUCT_PATHS)
    assert exact_names(live_main, "HEAD", cwd=FULL_WORK) == expected
    assert exact_status(live_main, "HEAD", cwd=FULL_WORK) == [("A", p) for p in expected]
    run(["git", "diff", "--check", live_main, "HEAD"], cwd=FULL_WORK)

    run(["git", "add", "--", *PRODUCT_PATHS], cwd=FULL_WORK)
    tree = run(["git", "write-tree"], cwd=FULL_WORK)
    commit_message = (
        "Reissue North Dakota derivative row-state reconciliation on current main\n\n"
        "Rebind the exact fourteen-path product to the current disjoint main parent, align the decision schema with the V3 validated candidate, make the validator enforce that schema contract, and preserve the one-cell row-state transition with zero substantive, class, ledger, publication, adoption, graph, or outside-human widening."
    )
    commit_env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    product_commit = run(
        ["git", "commit-tree", tree, "-p", live_main],
        cwd=FULL_WORK,
        env=commit_env,
        input_text=commit_message,
    )
    assert run(["git", "rev-parse", f"{product_commit}^"]) == live_main
    assert run(["git", "rev-parse", f"{product_commit}^{{tree}}"]) == tree
    assert exact_names(live_main, product_commit) == expected
    assert exact_status(live_main, product_commit) == [("A", p) for p in expected]

    return {
        "product_commit": product_commit,
        "product_tree": tree,
        "manifest": manifest,
        "manifest_bytes": len(manifest_data),
        "manifest_sha256": sha256(manifest_data),
        "manifest_git_blob": git_blob(manifest_data),
        "matrix_bytes": len((FULL_WORK / MATRIX_PATH).read_bytes()),
        "matrix_sha256": sha256((FULL_WORK / MATRIX_PATH).read_bytes()),
        "matrix_git_blob": git_blob((FULL_WORK / MATRIX_PATH).read_bytes()),
    }


def qualify(product: dict[str, Any]) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(QUAL_WORK), product["product_commit"]])
    builder_receipt = run(["node", BUILDER_PATH, "--check"], cwd=QUAL_WORK)
    validator_receipt = run(["node", VALIDATOR_PATH, "--out", str(OUT / "validator.json")], cwd=QUAL_WORK)
    test_receipt = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "builder-check.txt").write_text(builder_receipt + "\n", encoding="utf-8")
    (OUT / "validator-stdout.txt").write_text(validator_receipt + "\n", encoding="utf-8")
    (OUT / "adversarial.log").write_text(test_receipt + "\n", encoding="utf-8")

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
    post_test = run(["node", "--test", TEST_PATH], cwd=QUAL_WORK)
    (OUT / "post-release-builder-check.txt").write_text(post_builder + "\n", encoding="utf-8")
    (OUT / "post-release-validator.txt").write_text(post_validator + "\n", encoding="utf-8")
    (OUT / "post-release-adversarial.log").write_text(post_test + "\n", encoding="utf-8")
    return {
        "builder": "passed",
        "validator": "passed",
        "adversarial_refusals": 39,
        "release_check": "passed",
        "post_release_replay": "passed",
    }


def stage_nonworkflow(product: dict[str, Any], live_main: str) -> dict[str, Any]:
    run(["git", "worktree", "add", "--detach", str(STAGE_WORK), live_main])
    for path in NONWORKFLOW_PATHS:
        target = STAGE_WORK / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((FULL_WORK / path).read_bytes())
    workflow_object = STAGE_WORK / STAGED_WORKFLOW_OBJECT
    workflow_object.parent.mkdir(parents=True, exist_ok=True)
    workflow_object.write_bytes((FULL_WORK / PRODUCT_WORKFLOW).read_bytes())

    staging_paths = sorted(NONWORKFLOW_PATHS + [STAGED_WORKFLOW_OBJECT])
    run(["git", "add", "--", *staging_paths], cwd=STAGE_WORK)
    stage_tree = run(["git", "write-tree"], cwd=STAGE_WORK)
    stage_message = (
        "Stage qualified North Dakota row-state reconciliation objects\n\n"
        "Publish the thirteen non-workflow product paths and one byte-identical standing-workflow object for repository-authority reconstruction of the qualified fourteen-path tree."
    )
    commit_env = {
        "GIT_AUTHOR_NAME": "BigBirdReturns",
        "GIT_AUTHOR_EMAIL": "bigbirdreturns@proton.me",
        "GIT_COMMITTER_NAME": "BigBirdReturns",
        "GIT_COMMITTER_EMAIL": "bigbirdreturns@proton.me",
    }
    stage_commit = run(
        ["git", "commit-tree", stage_tree, "-p", live_main],
        cwd=STAGE_WORK,
        env=commit_env,
        input_text=stage_message,
    )
    assert exact_names(live_main, stage_commit) == staging_paths
    assert exact_status(live_main, stage_commit) == [("A", p) for p in staging_paths]
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
        if not path.is_file() or path.name == "SHA256SUMS":
            continue
        rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    carrier = bind_carrier()
    live_main = run(["git", "rev-parse", "origin/main"])
    live_tree = run(["git", "rev-parse", f"{live_main}^{{tree}}"])
    assert run(["git", "merge-base", OLD_PARENT, live_main]) == OLD_PARENT
    intervening = set(exact_names(OLD_PARENT, live_main))
    overlap = sorted(intervening.intersection(PRODUCT_PATHS))
    assert overlap == []
    assert run(["git", "rev-parse", f"{live_main}:{PREDECESSOR_MATRIX_PATH}"]) == PREDECESSOR_MATRIX_BLOB

    product = construct_product(live_main, live_tree)
    qualification = qualify(product)
    staging = stage_nonworkflow(product, live_main)

    records = []
    for path in PRODUCT_PATHS:
        data = (FULL_WORK / path).read_bytes()
        records.append({"path": path, "bytes": len(data), "sha256": sha256(data), "git_blob": git_blob(data)})

    receipt = {
        "schema_version": "ssc-rd04-nd-row-state-reconciliation-current-main-reissue-materialization@1",
        "state": "qualified_objects_staged_for_repository_authority_reconstruction",
        "carrier": carrier,
        "source_product_head": SOURCE_HEAD,
        "source_product_branch": SOURCE_BRANCH,
        "old_product_parent": OLD_PARENT,
        "live_product_parent": live_main,
        "live_product_parent_tree": live_tree,
        "intervening_path_count": len(intervening),
        "intervening_product_path_overlap": overlap,
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
        "matrix_bytes": product["matrix_bytes"],
        "matrix_sha256": product["matrix_sha256"],
        "matrix_git_blob": product["matrix_git_blob"],
        "schema_candidate_id": "RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V3",
        "qualification": qualification,
        "staging": staging,
        "file_records": records,
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
                "schema_version": "ssc-rd04-nd-row-state-reconciliation-current-main-reissue-failure@1",
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
