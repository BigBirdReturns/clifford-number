#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import pathlib
import subprocess
import traceback
from typing import Any

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
OLD_BRANCH = "agent/ssc-rd04-nd-row-state-schema-contract-pin-controller-base-v1"
OLD_COMMIT = "1b09ab47325b59fe03233edf407812b817a362b7"
OLD_PATH = ".tmp/rd04-nd-row-state-schema-contract-pin/materialize.py"
SOURCE_TREE = "df289954c88d3bf12d0cc2695725926d67c454f5"
STAGED_WORKFLOW_OBJECT = ".tmp/rd04-nd-row-state-promoted-matrix-custody-repair/standing-workflow.yml"
STALE_PROMOTED_SHA = "d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6"
STALE_PROMOTED_BLOB = "66a9a6d7003a39b1dca569895e0bc3513f004ca6"
CURRENT_PROMOTED_SHA = "9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb"
CURRENT_PROMOTED_BLOB = "6ba11a6025021e9df8ac6535be8c42499654c233"
PATCH: dict[str, Any] = {}


def run(args: list[str], *, check: bool = True) -> str:
    proc = subprocess.run(
        args,
        cwd=REPO,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if check and proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def load_materializer():
    run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--force",
            "origin",
            f"+refs/heads/{OLD_BRANCH}:refs/remotes/origin/{OLD_BRANCH}",
        ]
    )
    assert run(["git", "rev-parse", f"origin/{OLD_BRANCH}"]) == OLD_COMMIT
    source = subprocess.run(
        ["git", "show", f"{OLD_COMMIT}:{OLD_PATH}"],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if source.returncode:
        raise RuntimeError(source.stderr.decode("utf-8", errors="replace"))
    materializer_path = OUT / "base-materializer.py"
    materializer_path.parent.mkdir(parents=True, exist_ok=True)
    materializer_path.write_bytes(source.stdout)
    spec = importlib.util.spec_from_file_location("base_materializer", materializer_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load base materializer")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


old = load_materializer()
old.SOURCE_PRODUCT_TREE = SOURCE_TREE
old.STAGED_WORKFLOW_OBJECT = STAGED_WORKFLOW_OBJECT
old.REPAIRED_PATHS = sorted(
    [
        old.INPUT_PATH,
        old.SCHEMA_PATH,
        old.BUILDER_PATH,
        old.VALIDATOR_PATH,
        old.TEST_PATH,
        old.MANIFEST_PATH,
    ]
)


def patch_product(validator_path: pathlib.Path) -> None:
    worktree = validator_path.parent.parent

    input_path = worktree / old.INPUT_PATH
    input_obj = json.loads(input_path.read_text(encoding="utf-8"))
    projection = input_obj["projection"]
    assert projection["promoted_matrix_bytes"] == 499923
    assert projection["promoted_matrix_sha256"] == STALE_PROMOTED_SHA
    assert projection["promoted_matrix_git_blob"] == STALE_PROMOTED_BLOB
    projection["promoted_matrix_sha256"] = CURRENT_PROMOTED_SHA
    projection["promoted_matrix_git_blob"] = CURRENT_PROMOTED_BLOB
    input_data = old.write_json(input_path, input_obj)

    schema_path = worktree / old.SCHEMA_PATH
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    projection_schema = schema["$defs"]["inputCustody"]["properties"]["projection"]
    assert projection_schema == {"type": "object"}
    schema["$defs"]["inputCustody"]["properties"]["projection"] = {
        "const": projection,
    }
    schema_data = old.write_json(schema_path, schema)

    builder_path = worktree / old.BUILDER_PATH
    builder = builder_path.read_text(encoding="utf-8")
    builder = old.replace_once(
        builder,
        "  INPUT_BYTES: 6188,",
        f"  INPUT_BYTES: {len(input_data)},",
        "builder input byte denominator",
    )
    builder = old.replace_once(
        builder,
        "  INPUT_SHA: '14ad4e2a3716c480ed882bb63209b1e1ada7ed77b1594b8e439e597de3788fd1',",
        f"  INPUT_SHA: '{old.sha256(input_data)}',",
        "builder input SHA-256",
    )
    builder = old.replace_once(
        builder,
        "  INPUT_BLOB: 'c14472c0d31a51879742c8ab98049e1ac8c47b27',",
        f"  INPUT_BLOB: '{old.git_blob(input_data)}',",
        "builder input Git blob",
    )
    predecessor_anchor = (
        "  assert(same(input.predecessor_matrix, {path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB}), 'predecessor matrix custody mismatch');\n"
    )
    projection_assertion = predecessor_anchor + (
        "  assert(input.projection.promoted_matrix_bytes===C.PROMOTED_MATRIX_BYTES&&input.projection.promoted_matrix_sha256===C.PROMOTED_MATRIX_SHA&&input.projection.promoted_matrix_git_blob===C.PROMOTED_MATRIX_BLOB,'promoted matrix projection custody mismatch');\n"
    )
    builder = old.replace_once(
        builder,
        predecessor_anchor,
        projection_assertion,
        "builder promoted-matrix projection binding",
    )
    builder_path.write_text(builder, encoding="utf-8")

    validator = validator_path.read_text(encoding="utf-8")
    validator = old.replace_once(
        validator,
        "const PINNED_SCHEMA_BYTES=14765;",
        f"const PINNED_SCHEMA_BYTES={len(schema_data)};",
        "validator schema byte denominator",
    )
    validator = old.replace_once(
        validator,
        "const PINNED_SCHEMA_SHA256='2db941cfac2608bad4efeaa010bd1c28c1f0b97b89ac8e93053350a356df8388';",
        f"const PINNED_SCHEMA_SHA256='{old.sha256(schema_data)}';",
        "validator schema SHA-256",
    )
    validator = old.replace_once(
        validator,
        "const PINNED_SCHEMA_GIT_BLOB='d41112bb621656bd41fcbfaa605e6cedbfeb04ca';",
        f"const PINNED_SCHEMA_GIT_BLOB='{old.git_blob(schema_data)}';",
        "validator schema Git blob",
    )
    validator_path.write_text(validator, encoding="utf-8")

    old.SCHEMA_BYTES = len(schema_data)
    old.SCHEMA_SHA256 = old.sha256(schema_data)
    old.SCHEMA_GIT_BLOB = old.git_blob(schema_data)
    PATCH.update(
        {
            "input_bytes": len(input_data),
            "input_sha256": old.sha256(input_data),
            "input_git_blob": old.git_blob(input_data),
            "schema_bytes": len(schema_data),
            "schema_sha256": old.sha256(schema_data),
            "schema_git_blob": old.git_blob(schema_data),
            "promoted_matrix_bytes": 499923,
            "promoted_matrix_sha256": CURRENT_PROMOTED_SHA,
            "promoted_matrix_git_blob": CURRENT_PROMOTED_BLOB,
        }
    )


def patch_test(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = old.replace_once(
        text,
        "test('closed product contract rejects 47 adversarial mutations',()=>{",
        "test('closed product contract rejects 48 adversarial mutations',()=>{",
        "test refusal title",
    )
    anchor = """    ['schema limitations cardinality weakened',mutateSchema(s=>{const limits=s.$defs.rowStateValue.properties.limitations;limits.minItems=0;limits.maxItems=999;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    replacement = """    ['schema limitations cardinality weakened',mutateSchema(s=>{const limits=s.$defs.rowStateValue.properties.limitations;limits.minItems=0;limits.maxItems=999;})],
    ['schema input promoted matrix identity regression',mutateSchema(s=>{const projection=structuredClone(s.$defs.inputCustody.properties.projection.const);projection.promoted_matrix_sha256='d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6';projection.promoted_matrix_git_blob='66a9a6d7003a39b1dca569895e0bc3513f004ca6';s.$defs.inputCustody.properties.projection.const=projection;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
"""
    text = old.replace_once(text, anchor, replacement, "test promoted-matrix custody regression")
    text = old.replace_once(
        text,
        "  assert.equal(mutations.length,47);",
        "  assert.equal(mutations.length,48);",
        "test refusal denominator",
    )
    path.write_text(text, encoding="utf-8")


old.patch_validator = patch_product
old.patch_test = patch_test
base_qualify = old.qualify


def qualify(product: dict[str, Any]) -> dict[str, Any]:
    result = base_qualify(product)
    result["adversarial_refusals"] = 48
    result["promoted_matrix_projection_custody"] = "bound_to_current_matrix_identity"
    result["schema_projection_contract"] = "exact_const_object"
    result["schema_bytes"] = old.SCHEMA_BYTES
    result["schema_sha256"] = old.SCHEMA_SHA256
    result["schema_git_blob"] = old.SCHEMA_GIT_BLOB
    return result


old.qualify = qualify


def update_receipt() -> dict[str, Any]:
    receipt_path = OUT / "materialization-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["schema_version"] = "ssc-rd04-nd-row-state-promoted-matrix-custody-repair-materialization@1"
    receipt["state"] = "qualified_promoted_matrix_custody_repair_objects_staged"
    receipt["review_feedback"] = {
        "source_pull_request": 1823,
        "review_id": 4894763062,
        "inline_comment_id": 3747676485,
        "classification": "P2_stale_promoted_matrix_identities_in_input_custody",
    }
    receipt["repaired_paths"] = old.REPAIRED_PATHS
    receipt["promoted_matrix_custody_repair"] = PATCH
    receipt["qualification"]["adversarial_refusals"] = 48
    old.write_json(receipt_path, receipt)
    old.write_checksums()
    return receipt


def main() -> None:
    old.main()
    receipt = update_receipt()
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        OUT.mkdir(parents=True, exist_ok=True)
        old.write_json(
            OUT / "promoted-matrix-custody-repair-failure.json",
            {
                "schema_version": "ssc-rd04-nd-row-state-promoted-matrix-custody-repair-failure@1",
                "state": "failed_closed",
                "source_head": os.environ.get("SOURCE_HEAD"),
                "target_branch": os.environ.get("TARGET_BRANCH"),
                "error_type": type(exc).__name__,
                "error": str(exc),
            },
        )
        (OUT / "repair-traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
        old.write_checksums()
        raise
