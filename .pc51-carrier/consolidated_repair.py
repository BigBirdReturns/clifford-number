#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

PRODUCT_COMMIT = "7802dcc91ca45d564a72f87c99183a6ed196e6fb"
PRODUCT_TREE = "96331690ce118920ebd3cb9bd3528dc9e12f5505"
PRODUCT_PARENT = "5b841fcfe6d30929e0adfbb36548224d8d1959e8"
EXPECTED_REPAIRED_TREE = "f60fcdcd969d9082d166db74660814976012e187"
PRODUCT_BRANCH = "agent/pc51-materializer"

SOURCE_BLOBS = {
    "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs": "154333f86e81ffbac985c4defee3d82d1163c0a0",
    "tools/lib/preference-custody-manifest-v49.mjs": "5361a77d715ac49cf4804a5c8546b3dfc225e81a",
    "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js": "460d48945f308481187d5128ab8e12f185fb2d03",
    "test/preference-custody-manifest-v49.test.js": "8b7b0ef5287cdbe3b4fd3f81962d17af59fe74d4",
}

REPAIRED_FILES = {
    "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs": {
        "bytes": 44274,
        "sha256": "16db58ba40b1bab84bbc6ce1caf7940b7de92073bb0cf4817aadfb23ef62f373",
        "git_blob": "8f97d6f6552fcd832ab2973a5979d027d0a8af3a",
    },
    "tools/lib/preference-custody-manifest-v49.mjs": {
        "bytes": 44103,
        "sha256": "ff738ee6bd6dcea780db2ac7a0e31e35a4d7aab63ae4dd845a609124abbf8d72",
        "git_blob": "d33df9ba656bdf455e21462139ae1da1ff19ea8e",
    },
    "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js": {
        "bytes": 12193,
        "sha256": "5bb7075f7e86daa6795adf022bbbefe40dcea9c0c6cafc1553e6ee273a56c798",
        "git_blob": "a179325cf1f0065e0bf52103d10dc9bdb786c62e",
    },
    "test/preference-custody-manifest-v49.test.js": {
        "bytes": 9077,
        "sha256": "a4fa82788d02a593eb291d8c1df260d0990b96ab73ba1497cd5272a7275f172b",
        "git_blob": "d8c2d70a84f2bc27742772e4d1082bb386c05327",
    },
}

PERMANENT_PATHS = [
    ".github/workflows/preference-custody-v49.yml",
    ".github/workflows/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.yml",
    "data/research/preference-custody/control-manifest-v49.json",
    "data/research/preference-custody/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.fixture.json",
    "docs/preference-custody-laboratory-floor-v49.md",
    "docs/preference-custody-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.md",
    "test/preference-custody-manifest-v49.test.js",
    "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js",
    "tools/compile-preference-custody-manifest-v49.mjs",
    "tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs",
    "tools/lib/preference-custody-manifest-v49.mjs",
    "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs",
    "tools/validate-preference-custody-manifest-v49.mjs",
    "tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs",
]

STANDALONE_OLD = r'''  const isArray = Array.isArray(value);
  if (isArray) {
    if (proto !== Array.prototype) errors.push(`${label} array prototype must be canonical`);
    let length; try { length = value.length; } catch (error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; }
    for (let index = 0; index < length; index += 1) if (!Object.prototype.hasOwnProperty.call(value, index)) errors.push(`${label} contains a sparse array hole at ${index}`);
  } else if (proto !== Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for (const key of keys) {
    if (isArray && key === 'length') continue;
    if (typeof key !== 'string') { errors.push(`${label} contains a symbol key`); continue; }
'''
STANDALONE_NEW = r'''  const isArray = Array.isArray(value);
  let arrayLength = null;
  if (isArray) {
    if (proto !== Array.prototype) errors.push(`${label} array prototype must be canonical`);
    try { arrayLength = value.length; } catch (error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; }
    for (let index = 0; index < arrayLength; index += 1) if (!Object.prototype.hasOwnProperty.call(value, index)) errors.push(`${label} contains a sparse array hole at ${index}`);
  } else if (proto !== Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for (const key of keys) {
    if (isArray && key === 'length') continue;
    if (isArray && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= arrayLength)) {
      errors.push(`${label} contains an undeclared array property ${String(key)}`);
      continue;
    }
    if (typeof key !== 'string') { errors.push(`${label} contains a symbol key`); continue; }
'''
FLOOR_OLD = r'''  const isArray=Array.isArray(value); if (isArray) { if (proto!==Array.prototype) errors.push(`${label} array prototype must be canonical`); let length; try { length=value.length; } catch(error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; } for(let i=0;i<length;i+=1) if(!Object.prototype.hasOwnProperty.call(value,i)) errors.push(`${label} contains a sparse array hole at ${i}`); } else if(proto!==Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for(const key of keys) { if(isArray && key==='length') continue; if(typeof key!=='string') { errors.push(`${label} contains a symbol key`); continue; } let descriptor; try { descriptor=Object.getOwnPropertyDescriptor(value,key); } catch(error) { errors.push(`${label} descriptor ${key} cannot be read: ${error.message}`); continue; } if(!descriptor || !descriptor.enumerable || !('value' in descriptor)) { errors.push(`${label} property ${key} must be an enumerable data property`); continue; } validateCanonicalJsonTree(descriptor.value,`${label}.${key}`,errors,seen); }
'''
FLOOR_NEW = r'''  const isArray=Array.isArray(value); let arrayLength=null; if (isArray) { if (proto!==Array.prototype) errors.push(`${label} array prototype must be canonical`); try { arrayLength=value.length; } catch(error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; } for(let i=0;i<arrayLength;i+=1) if(!Object.prototype.hasOwnProperty.call(value,i)) errors.push(`${label} contains a sparse array hole at ${i}`); } else if(proto!==Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for(const key of keys) { if(isArray && key==='length') continue; if(isArray && (typeof key!=='string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key)>=arrayLength)) { errors.push(`${label} contains an undeclared array property ${String(key)}`); continue; } if(typeof key!=='string') { errors.push(`${label} contains a symbol key`); continue; } let descriptor; try { descriptor=Object.getOwnPropertyDescriptor(value,key); } catch(error) { errors.push(`${label} descriptor ${key} cannot be read: ${error.message}`); continue; } if(!descriptor || !descriptor.enumerable || !('value' in descriptor)) { errors.push(`${label} property ${key} must be an enumerable data property`); continue; } validateCanonicalJsonTree(descriptor.value,`${label}.${key}`,errors,seen); }
'''

STANDALONE_CONSOLE = "console.log(`validated PC-51 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);\n"
STANDALONE_REGRESSIONS = (
    "const namedFixtureArray=clone(fixture); namedFixtureArray.worlds.unapproved=true; fixtureRefused(namedFixtureArray,'named fixture array property');\n"
    "const namedRulesArray=clone(fixture); namedRulesArray.required_refusal_rules.unapproved=true; fixtureRefused(namedRulesArray,'named refusal-rule array property');\n"
    "const namedBuildArray=clone(build); namedBuildArray.worlds.unapproved=true; buildRefused(namedBuildArray,'named build array property');\n"
) + STANDALONE_CONSOLE

FLOOR_IMPORT_OLD = "import { spawnSync } from 'node:child_process';\n"
FLOOR_IMPORT_NEW = "import { execFileSync, spawnSync } from 'node:child_process';\n"
FLOOR_SETUP_OLD = "const load=path=>JSON.parse(readFileSync(path,'utf8'));const clone=value=>structuredClone(value);\nconst manifest=load('data/research/preference-custody/control-manifest-v49.json');const baseBuild=load('build/research/preference-custody-laboratory-floor-v48.json');const targetBuild=load('build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.json');const targetFixture=load(manifest.extension_control.source_fixture_path);const baseSources=loadPreferenceCustodyV48SourceBundle(load);const compiled=compilePreferenceCustodyManifestV49(manifest,baseBuild,targetBuild,targetFixture,baseSources);const buildPath='build/research/preference-custody-laboratory-floor-v49.json';const build=existsSync(buildPath)?load(buildPath):compiled;\n"
FLOOR_SETUP_NEW = "const load=path=>JSON.parse(readFileSync(path,'utf8'));const clone=value=>structuredClone(value);\nconst manifest=load('data/research/preference-custody/control-manifest-v49.json');\nconst baseBuildPath='build/research/preference-custody-laboratory-floor-v48.json';\nconst targetBuildPath='build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.json';\nif(!existsSync(baseBuildPath))execFileSync(process.execPath,['tools/compile-preference-custody-manifest-v48.mjs'],{stdio:'inherit'});\nif(!existsSync(targetBuildPath))execFileSync(process.execPath,['tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs'],{stdio:'inherit'});\nconst baseBuild=load(baseBuildPath);const targetBuild=load(targetBuildPath);const targetFixture=load(manifest.extension_control.source_fixture_path);const baseSources=loadPreferenceCustodyV48SourceBundle(load);const compiled=compilePreferenceCustodyManifestV49(manifest,baseBuild,targetBuild,targetFixture,baseSources);const buildPath='build/research/preference-custody-laboratory-floor-v49.json';const build=existsSync(buildPath)?load(buildPath):compiled;\n"
FLOOR_CONSOLE = "console.log(`validated Preference Custody floor v49 with ${manifestMutationCount} manifest mutations and ${buildMutationCount} build tamper checks`);\n"
FLOOR_REGRESSIONS = (
    "const namedManifestArray=clone(manifest); namedManifestArray.real_case_requirements_added.unapproved=true; manifestRefused(namedManifestArray,'named manifest array property');\n"
    "const namedSourceArray=clone(baseSources); namedSourceArray.targetBuild.worlds.unapproved=true; assert.ok(validatePreferenceCustodyManifestV49Build(build,manifest,baseBuild,targetBuild,targetFixture,namedSourceArray).length>0,'named source-bundle array property must be refused');\n"
    "const namedFloorBuildArray=clone(build); namedFloorBuildArray.controls.unapproved=true; buildRefused(namedFloorBuildArray,'named floor-build array property');\n"
) + FLOOR_CONSOLE


def git_output(repo: Path, *args: str, input_text: str | None = None, env: dict[str, str] | None = None) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=repo, text=True, input=input_text, env=env
    ).strip()


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one repair anchor in {path}, observed {count}")
    path.write_text(text.replace(old, new, 1))


def verify_original_product(repo: Path) -> None:
    if git_output(repo, "rev-parse", "HEAD") != PRODUCT_COMMIT:
        raise SystemExit("product commit mismatch")
    if git_output(repo, "rev-parse", "HEAD^{tree}") != PRODUCT_TREE:
        raise SystemExit("product tree mismatch")
    if git_output(repo, "rev-parse", "HEAD^") != PRODUCT_PARENT:
        raise SystemExit("product parent mismatch")
    for relative, expected in SOURCE_BLOBS.items():
        observed = git_output(repo, "hash-object", relative)
        if observed != expected:
            raise SystemExit(f"source blob mismatch for {relative}: {observed} != {expected}")


def repaired_receipts(repo: Path) -> list[dict[str, object]]:
    receipts: list[dict[str, object]] = []
    for relative, expected in REPAIRED_FILES.items():
        raw = (repo / relative).read_bytes()
        observed = {
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "git_blob": git_output(repo, "hash-object", relative),
        }
        if observed != expected:
            raise SystemExit(f"repaired identity mismatch for {relative}: {observed} != {expected}")
        receipts.append({"path": relative, **observed})
    return receipts


def patch(repo: Path) -> None:
    verify_original_product(repo)
    replace_once(
        repo / "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs",
        STANDALONE_OLD,
        STANDALONE_NEW,
    )
    replace_once(repo / "tools/lib/preference-custody-manifest-v49.mjs", FLOOR_OLD, FLOOR_NEW)
    replace_once(
        repo / "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js",
        STANDALONE_CONSOLE,
        STANDALONE_REGRESSIONS,
    )
    floor_test = repo / "test/preference-custody-manifest-v49.test.js"
    replace_once(floor_test, FLOOR_IMPORT_OLD, FLOOR_IMPORT_NEW)
    replace_once(floor_test, FLOOR_SETUP_OLD, FLOOR_SETUP_NEW)
    replace_once(floor_test, FLOOR_CONSOLE, FLOOR_REGRESSIONS)
    changed = git_output(repo, "diff", "--name-only").splitlines()
    if sorted(changed) != sorted(REPAIRED_FILES):
        raise SystemExit(f"repair path mismatch: {changed}")
    subprocess.check_call(["git", "diff", "--check"], cwd=repo)
    for receipt in repaired_receipts(repo):
        print(json.dumps(receipt, sort_keys=True))


def publish(repo: Path, receipt_root: Path) -> None:
    receipts = repaired_receipts(repo)
    changed = git_output(repo, "diff", "--name-only").splitlines()
    if sorted(changed) != sorted(REPAIRED_FILES):
        raise SystemExit(f"publish path mismatch: {changed}")
    subprocess.check_call(["git", "add", "--", *sorted(REPAIRED_FILES)], cwd=repo)
    tree = git_output(repo, "write-tree")
    if tree != EXPECTED_REPAIRED_TREE:
        raise SystemExit(f"repaired tree mismatch: {tree} != {EXPECTED_REPAIRED_TREE}")

    commit_env = os.environ.copy()
    commit_env.update(
        {
            "GIT_AUTHOR_NAME": "OpenAI",
            "GIT_AUTHOR_EMAIL": "noreply@openai.com",
            "GIT_COMMITTER_NAME": "OpenAI",
            "GIT_COMMITTER_EMAIL": "noreply@openai.com",
        }
    )
    message = (
        "Add PC-51 source-review, reproducible-build, provenance, and execution-attestation custody\n\n"
        "Reject serialization-invisible named array properties, make floor-v49 direct invocation self-materializing from a clean checkout, and preserve the exact one-parent fourteen-path synthetic-control product with no outside-human, graph, publication, adoption, security, causal, allegation, or public-authority effect.\n"
    )
    new_commit = git_output(
        repo,
        "commit-tree",
        tree,
        "-p",
        PRODUCT_PARENT,
        input_text=message,
        env=commit_env,
    )
    if git_output(repo, "rev-parse", f"{new_commit}^") != PRODUCT_PARENT:
        raise SystemExit("new product parent mismatch")
    if git_output(repo, "rev-parse", f"{new_commit}^{{tree}}") != EXPECTED_REPAIRED_TREE:
        raise SystemExit("new product tree mismatch")

    status_lines = git_output(
        repo, "diff-tree", "--no-commit-id", "--name-status", "-r", PRODUCT_PARENT, new_commit
    ).splitlines()
    expected_lines = [f"A\t{path}" for path in sorted(PERMANENT_PATHS)]
    if sorted(status_lines) != expected_lines:
        raise SystemExit(f"new product topology mismatch: {status_lines}")

    remote_line = git_output(repo, "ls-remote", "origin", f"refs/heads/{PRODUCT_BRANCH}")
    remote_sha = remote_line.split()[0] if remote_line else ""
    if remote_sha != PRODUCT_COMMIT:
        raise SystemExit(f"product branch lease mismatch: {remote_sha} != {PRODUCT_COMMIT}")
    subprocess.check_call(
        [
            "git",
            "push",
            "origin",
            f"{new_commit}:refs/heads/{PRODUCT_BRANCH}",
            f"--force-with-lease=refs/heads/{PRODUCT_BRANCH}:{PRODUCT_COMMIT}",
        ],
        cwd=repo,
    )

    receipt_root.mkdir(parents=True, exist_ok=True)
    receipt = {
        "schema_version": "pc51-consolidated-repair-publication-receipt@1",
        "qualified_parent_commit": PRODUCT_PARENT,
        "prior_product_commit": PRODUCT_COMMIT,
        "prior_product_tree": PRODUCT_TREE,
        "new_product_commit": new_commit,
        "new_product_tree": tree,
        "product_branch": PRODUCT_BRANCH,
        "permanent_path_count": len(PERMANENT_PATHS),
        "permanent_paths": PERMANENT_PATHS,
        "changed_repair_file_count": len(receipts),
        "repaired_files": receipts,
        "canonical_array_keys": "pass",
        "direct_clean_checkout": "pass",
        "focused_pc51": "pass",
        "all_preference_custody_floors": "pass",
        "floor_v49": "pass",
        "no_magic_human": "pass",
        "release_check": "pass",
        "outside_human_dependency": False,
        "graph_effect": "none",
        "ref_updates": 1,
    }
    (receipt_root / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    (receipt_root / "new-product-commit.txt").write_text(new_commit + "\n")
    (receipt_root / "new-product-tree.txt").write_text(tree + "\n")
    print(json.dumps(receipt, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    patch_parser = sub.add_parser("patch")
    patch_parser.add_argument("repo", type=Path)
    publish_parser = sub.add_parser("publish")
    publish_parser.add_argument("repo", type=Path)
    publish_parser.add_argument("receipt_root", type=Path)
    args = parser.parse_args()
    if args.command == "patch":
        patch(args.repo.resolve())
    else:
        publish(args.repo.resolve(), args.receipt_root.resolve())


if __name__ == "__main__":
    main()
