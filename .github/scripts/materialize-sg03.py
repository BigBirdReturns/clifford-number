#!/usr/bin/env python3
"""Integrate SG-03 into the global release gate and exact release scope."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

EXPECTED = {
    "package.json": "8e33d1dd3c510f34395b98eb9a9974a290888b66",
    "tools/build-project-stable-ground-sg03.mjs": "225046cb788ad88bc55b1e5f9d4b841d2811a8d0",
    "data/project/project-stable-ground-sg03.json": "321a6aed71b52fb319e05808f9d9a1442ccd3701",
    "tools/validate-project-stable-ground-sg03.mjs": "096c926e4f2695252de5496e24d41622081242dd",
    "test/project-stable-ground-sg03.test.js": "5714331cfe7633a327391f9acaac4ff620ac9a91",
}

TRIGGER_POOF_RELEASE = "26ebcd554cdc4a0c7a9b21946decf098aba8e2720c0a11121459f9fddb126248"


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def require_blob(path: Path, expected: str) -> None:
    observed = git_blob_sha(path.read_bytes())
    if observed != expected:
        raise RuntimeError(f"{path}: expected Git blob {expected}, observed {observed}")


def patch_package(root: Path) -> None:
    path = root / "package.json"
    require_blob(path, EXPECTED["package.json"])
    package = json.loads(path.read_text())
    scripts = package["scripts"]
    for key in ("build:stable-ground", "validate:stable-ground", "ci:stable-ground"):
        if key in scripts:
            raise RuntimeError(f"package script already exists: {key}")

    scripts["build:stable-ground"] = "node tools/build-project-stable-ground-sg03.mjs"
    scripts["validate:stable-ground"] = (
        "node tools/validate-project-stable-ground-alignment.mjs && "
        "node test/project-stable-ground-alignment.test.js && "
        "node tools/validate-project-stable-ground-sg02.mjs && "
        "node test/project-stable-ground-sg02.test.js && "
        "node tools/validate-project-stable-ground-sg03.mjs && "
        "node test/project-stable-ground-sg03.test.js"
    )
    scripts["ci:stable-ground"] = "npm run build:stable-ground && npm run validate:stable-ground"

    old = "npm run build:poof-ecology && npm run validate:poof-ecology && npm test"
    new = "npm run build:poof-ecology && npm run validate:poof-ecology && npm run ci:stable-ground && npm test"
    if scripts["check"].count(old) != 1:
        raise RuntimeError("global check insertion point drifted")
    scripts["check"] = scripts["check"].replace(old, new, 1)
    path.write_text(json.dumps(package, indent=2) + "\n")


def patch_builder(root: Path) -> None:
    path = root / "tools/build-project-stable-ground-sg03.mjs"
    require_blob(path, EXPECTED["tools/build-project-stable-ground-sg03.mjs"])
    text = path.read_text()
    old = """export const releaseScope = [
  '.github/workflows/project-stable-ground-sg03.yml',
  '.github/workflows/project-stable-ground-sg02.yml',
"""
    new = """export const releaseScope = [
  'package.json',
  '.github/workflows/project-stable-ground-sg03.yml',
  '.github/workflows/project-stable-ground-sg02.yml',
  '.github/workflows/project-stable-ground-alignment.yml',
"""
    if text.count(old) != 1:
        raise RuntimeError("SG-03 release-scope workflow anchor drifted")
    text = text.replace(old, new, 1)
    old_middle = """  'data/project/project-stable-ground-current.json',
  'docs/milestones/project-stable-ground-sg03.md',
"""
    new_middle = """  'data/project/project-stable-ground-current.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'docs/milestones/project-stable-ground-sg03.md',
"""
    if text.count(old_middle) != 1:
        raise RuntimeError("SG-03 release-scope POOF anchor drifted")
    text = text.replace(old_middle, new_middle, 1)
    old_tail = """  'tools/validate-project-stable-ground-sg02.mjs',
  'test/project-stable-ground-sg03.test.js',
  'test/project-stable-ground-sg02.test.js'
"""
    new_tail = """  'tools/validate-project-stable-ground-sg02.mjs',
  'tools/validate-project-stable-ground-alignment.mjs',
  'test/project-stable-ground-sg03.test.js',
  'test/project-stable-ground-sg02.test.js',
  'test/project-stable-ground-alignment.test.js'
"""
    if text.count(old_tail) != 1:
        raise RuntimeError("SG-03 release-scope validator anchor drifted")
    path.write_text(text.replace(old_tail, new_tail, 1))


def patch_checkpoint(root: Path) -> None:
    path = root / "data/project/project-stable-ground-sg03.json"
    require_blob(path, EXPECTED["data/project/project-stable-ground-sg03.json"])
    checkpoint = json.loads(path.read_text())
    poof = checkpoint["canonical_snapshot"]["poof"]
    poof["trigger_release_sha256"] = TRIGGER_POOF_RELEASE
    poof["current_release_manifest"] = "data/project/poof-clifford-ecology-release-manifest.json"
    poof["current_release_digest_bound_in_report"] = True
    path.write_text(json.dumps(checkpoint, indent=2) + "\n")


def patch_validator(root: Path) -> None:
    path = root / "tools/validate-project-stable-ground-sg03.mjs"
    require_blob(path, EXPECTED["tools/validate-project-stable-ground-sg03.mjs"])
    text = path.read_text()
    old_snapshot = """  equal(snapshot.poof.constitutional_change_receipts, 5, 'frozen POOF change-receipt count');
  equal(snapshot.poof.staged, true, 'frozen POOF staged state');
"""
    new_snapshot = f"""  equal(snapshot.poof.constitutional_change_receipts, 5, 'frozen POOF change-receipt count');
  equal(snapshot.poof.trigger_release_sha256, '{TRIGGER_POOF_RELEASE}', 'frozen trigger POOF release digest');
  equal(snapshot.poof.current_release_manifest, 'data/project/poof-clifford-ecology-release-manifest.json', 'current POOF release-manifest path');
  equal(snapshot.poof.current_release_digest_bound_in_report, true, 'current POOF report-binding law');
  equal(snapshot.poof.staged, true, 'frozen POOF staged state');
"""
    if text.count(old_snapshot) != 1:
        raise RuntimeError("SG-03 validator POOF snapshot anchor drifted")
    text = text.replace(old_snapshot, new_snapshot, 1)
    old_release = "  equal(poofRelease.combined_sha256, checkpoint.trigger.release_sha256, 'POOF exact release digest');"
    new_release = "  check(/^[0-9a-f]{64}$/.test(poofRelease.combined_sha256), 'current POOF release digest format');"
    if text.count(old_release) != 1:
        raise RuntimeError("SG-03 validator POOF release anchor drifted")
    path.write_text(text.replace(old_release, new_release, 1))


def patch_test(root: Path) -> None:
    path = root / "test/project-stable-ground-sg03.test.js"
    require_blob(path, EXPECTED["test/project-stable-ground-sg03.test.js"])
    text = path.read_text()
    old = "    expected: 'POOF exact release digest'"
    new = "    expected: 'SG-03 report POOF digest'"
    if text.count(old) != 1:
        raise RuntimeError("SG-03 POOF digest mutation anchor drifted")
    path.write_text(text.replace(old, new, 1))


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    patch_package(root)
    patch_builder(root)
    patch_checkpoint(root)
    patch_validator(root)
    patch_test(root)
    print("materialize-sg03.py: release-gate and derived POOF release integration applied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
