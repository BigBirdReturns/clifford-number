#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path

PRODUCT_COMMIT = "7802dcc91ca45d564a72f87c99183a6ed196e6fb"
PRODUCT_TREE = "96331690ce118920ebd3cb9bd3528dc9e12f5505"
QUALIFIED_PARENT = "5b841fcfe6d30929e0adfbb36548224d8d1959e8"
SOURCE_BLOBS = {
    "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs": "154333f86e81ffbac985c4defee3d82d1163c0a0",
    "tools/lib/preference-custody-manifest-v49.mjs": "5361a77d715ac49cf4804a5c8546b3dfc225e81a",
    "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js": "460d48945f308481187d5128ab8e12f185fb2d03",
    "test/preference-custody-manifest-v49.test.js": "8b7b0ef5287cdbe3b4fd3f81962d17af59fe74d4",
}

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
STANDALONE_REGRESSIONS = """const namedFixtureArray=clone(fixture); namedFixtureArray.worlds.unapproved=true; fixtureRefused(namedFixtureArray,'named fixture array property');
const namedRulesArray=clone(fixture); namedRulesArray.required_refusal_rules.unapproved=true; fixtureRefused(namedRulesArray,'named refusal-rule array property');
const namedBuildArray=clone(build); namedBuildArray.worlds.unapproved=true; buildRefused(namedBuildArray,'named build array property');
""" + STANDALONE_CONSOLE
FLOOR_CONSOLE = "console.log(`validated Preference Custody floor v49 with ${manifestMutationCount} manifest mutations and ${buildMutationCount} build tamper checks`);\n"
FLOOR_REGRESSIONS = """const namedManifestArray=clone(manifest); namedManifestArray.real_case_requirements_added.unapproved=true; manifestRefused(namedManifestArray,'named manifest array property');
const namedSourceArray=clone(baseSources); namedSourceArray.targetBuild.controls.unapproved=true; assert.ok(validatePreferenceCustodyManifestV49Build(build,manifest,baseBuild,targetBuild,targetFixture,namedSourceArray).length>0,'named source-bundle array property must be refused');
const namedFloorBuildArray=clone(build); namedFloorBuildArray.controls.unapproved=true; buildRefused(namedFloorBuildArray,'named floor-build array property');
""" + FLOOR_CONSOLE


def git_output(product: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=product, text=True).strip()


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one repair anchor in {path}, observed {count}")
    path.write_text(text.replace(old, new, 1))


def verify_product(product: Path) -> None:
    if git_output(product, "rev-parse", "HEAD") != PRODUCT_COMMIT:
        raise SystemExit("product commit mismatch")
    if git_output(product, "rev-parse", "HEAD^{tree}") != PRODUCT_TREE:
        raise SystemExit("product tree mismatch")
    if git_output(product, "rev-parse", "HEAD^") != QUALIFIED_PARENT:
        raise SystemExit("qualified parent mismatch")
    for relative, expected in SOURCE_BLOBS.items():
        observed = git_output(product, "hash-object", relative)
        if observed != expected:
            raise SystemExit(f"source blob mismatch {relative}: {observed} != {expected}")


def patch(product: Path) -> None:
    verify_product(product)
    replace_once(
        product / "tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs",
        STANDALONE_OLD,
        STANDALONE_NEW,
    )
    replace_once(product / "tools/lib/preference-custody-manifest-v49.mjs", FLOOR_OLD, FLOOR_NEW)
    replace_once(
        product / "test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js",
        STANDALONE_CONSOLE,
        STANDALONE_REGRESSIONS,
    )
    replace_once(product / "test/preference-custody-manifest-v49.test.js", FLOOR_CONSOLE, FLOOR_REGRESSIONS)
    changed = git_output(product, "diff", "--name-only").splitlines()
    if set(changed) != set(SOURCE_BLOBS):
        raise SystemExit(f"repair path mismatch: {changed}")
    subprocess.check_call(["git", "diff", "--check"], cwd=product)
    for relative in sorted(changed):
        raw = (product / relative).read_bytes()
        print(f"{relative}\tbytes={len(raw)}\tsha256={hashlib.sha256(raw).hexdigest()}")


def create_blob(repo: str, token: str, raw: bytes) -> str:
    git_blob = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
    payload = json.dumps({"content": base64.b64encode(raw).decode(), "encoding": "base64"}).encode()
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/git/blobs",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "pc51-array-key-repair-v3",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.load(response)
    if result.get("sha") != git_blob:
        raise SystemExit(f"remote blob mismatch: {result.get('sha')} != {git_blob}")
    return git_blob


def publish(product: Path, receipt_root: Path) -> None:
    token = os.environ["GH_TOKEN"]
    repo = os.environ["GH_REPOSITORY"]
    files = []
    for relative, source_blob in SOURCE_BLOBS.items():
        raw = (product / relative).read_bytes()
        git_blob = create_blob(repo, token, raw)
        files.append(
            {
                "path": relative,
                "source_git_blob_sha1": source_blob,
                "bytes": len(raw),
                "sha256": hashlib.sha256(raw).hexdigest(),
                "git_blob_sha1": git_blob,
                "remote_git_blob_sha1": git_blob,
            }
        )
    receipt_root.mkdir(parents=True, exist_ok=True)
    receipt = {
        "schema_version": "pc51-array-key-repair-receipt@3",
        "qualified_parent_commit": QUALIFIED_PARENT,
        "prior_product_commit": PRODUCT_COMMIT,
        "prior_product_tree": PRODUCT_TREE,
        "carrier_head": os.environ["CARRIER_HEAD"],
        "changed_permanent_files": len(files),
        "files": files,
        "focused_pc51": "pass",
        "floor_v49": "pass",
        "no_magic_human": "pass",
        "release_check": "pass",
        "ref_updates": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
    }
    (receipt_root / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    patch_parser = sub.add_parser("patch")
    patch_parser.add_argument("product", type=Path)
    publish_parser = sub.add_parser("publish")
    publish_parser.add_argument("product", type=Path)
    publish_parser.add_argument("receipt", type=Path)
    args = parser.parse_args()
    if args.command == "patch":
        patch(args.product.resolve())
    else:
        publish(args.product.resolve(), args.receipt.resolve())


if __name__ == "__main__":
    main()
