#!/usr/bin/env python3
"""Integrate SG-03 into the global release gate and exact release scope."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

EXPECTED = {
    "package.json": "8e33d1dd3c510f34395b98eb9a9974a290888b66",
    "tools/build-project-stable-ground-sg03.mjs": "225046cb788ad88bc55b1e5f9d4b841d2811a8d0",
}


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


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    patch_package(root)
    patch_builder(root)
    print("materialize-sg03.py: release-gate integration applied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
