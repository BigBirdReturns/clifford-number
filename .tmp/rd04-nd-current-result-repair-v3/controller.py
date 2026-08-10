#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import runpy
import subprocess
import traceback

REPO = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ["OUT"])
V2_SOURCE_BRANCH = os.environ["V2_SOURCE_BRANCH"]
V2_SOURCE_COMMIT = os.environ["V2_SOURCE_COMMIT"]
V2_SOURCE_PATH = os.environ["V2_SOURCE_PATH"]
V2_SOURCE_BLOB = os.environ["V2_SOURCE_BLOB"]


def run(args: list[str]) -> str:
    proc = subprocess.run(
        args,
        cwd=REPO,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if proc.returncode:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"source patch {label} expected one match, observed {count}")
    return source.replace(old, new, 1)


def write_wrapper_failure(exc: BaseException) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    failure = {
        "schema_version": "ssc-rd04-nd-current-result-repair-wrapper-failure@1",
        "state": "failed_closed_before_or_during_generated_controller",
        "exception_type": type(exc).__name__,
        "exception": str(exc),
        "traceback": traceback.format_exc(),
        "canonical_parent": os.environ.get("CANONICAL_PARENT"),
        "expected_product_head": os.environ.get("EXPECTED_PRODUCT_HEAD"),
        "v2_source_commit": V2_SOURCE_COMMIT,
        "v2_source_blob": V2_SOURCE_BLOB,
    }
    (OUT / "wrapper-failure.json").write_text(
        json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    rows = []
    for path in sorted(OUT.glob("*")):
        if path.name == "SHA256SUMS" or not path.is_file():
            continue
        rows.append(f"{sha256(path.read_bytes())}  {path.name}")
    (OUT / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def build_generated_controller() -> pathlib.Path:
    remote_ref = f"refs/remotes/origin/{V2_SOURCE_BRANCH}"
    run([
        "git", "fetch", "--no-tags", "--force", "origin",
        f"+refs/heads/{V2_SOURCE_BRANCH}:{remote_ref}",
    ])
    if run(["git", "rev-parse", remote_ref]) != V2_SOURCE_COMMIT:
        raise RuntimeError("V2 source branch moved")
    observed_blob = run(["git", "rev-parse", f"{V2_SOURCE_COMMIT}:{V2_SOURCE_PATH}"])
    if observed_blob != V2_SOURCE_BLOB:
        raise RuntimeError(f"V2 source blob mismatch: {observed_blob}")
    source_bytes = subprocess.check_output(
        ["git", "cat-file", "blob", V2_SOURCE_BLOB], cwd=REPO
    )
    source = source_bytes.decode("utf-8")

    source = replace_once(
        source,
        'PRODUCT_WORK = pathlib.Path(os.environ["PRODUCT_WORK"])\n',
        'PRODUCT_WORK = pathlib.Path(os.environ["PRODUCT_WORK"])\nQUAL_WORK = pathlib.Path(os.environ["QUAL_WORK"])\n',
        "qualification-worktree-constant",
    )
    source = replace_once(
        source,
        '''def repair_product() -> dict[str, Any]:
    if PRODUCT_WORK.exists():
        shutil.rmtree(PRODUCT_WORK)
    run(["git", "worktree", "add", "--detach", str(PRODUCT_WORK), EXPECTED_PRODUCT_HEAD])
''',
        '''def repair_product() -> dict[str, Any]:
    if PRODUCT_WORK.exists():
        shutil.rmtree(PRODUCT_WORK)
    if QUAL_WORK.exists():
        shutil.rmtree(QUAL_WORK)
    run(["git", "worktree", "add", "--detach", str(PRODUCT_WORK), EXPECTED_PRODUCT_HEAD])
''',
        "qualification-worktree-initialization",
    )
    source = replace_once(
        source,
        '''    release_log = run(["npm", "run", "release:check"], cwd=PRODUCT_WORK)
    (OUT / "release-check.log").write_text(release_log + "\\n", encoding="utf-8")
    assert working_names(cwd=PRODUCT_WORK) == expected_changed
    assert working_status(cwd=PRODUCT_WORK) == [("M", path) for path in expected_changed]
''',
        '''    run(["git", "worktree", "add", "--detach", str(QUAL_WORK), EXPECTED_PRODUCT_HEAD])
    for rel in expected_changed:
        target = QUAL_WORK / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PRODUCT_WORK / rel, target)
    assert working_names(cwd=QUAL_WORK) == expected_changed
    assert working_status(cwd=QUAL_WORK) == [("M", path) for path in expected_changed]
    run(["git", "diff", "--check"], cwd=QUAL_WORK)
    before_release_status = run(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=QUAL_WORK)
    (OUT / "qualification-status-before-release.txt").write_text(before_release_status + "\\n", encoding="utf-8")

    release_log = run(["npm", "run", "release:check"], cwd=QUAL_WORK)
    (OUT / "release-check.log").write_text(release_log + "\\n", encoding="utf-8")
    after_release_names = working_names(cwd=QUAL_WORK)
    after_release_status = run(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=QUAL_WORK)
    (OUT / "qualification-tracked-paths-after-release.json").write_text(
        json.dumps(after_release_names, indent=2) + "\\n", encoding="utf-8"
    )
    (OUT / "qualification-status-after-release.txt").write_text(after_release_status + "\\n", encoding="utf-8")
    for rel in EXPECTED_PATHS:
        assert (QUAL_WORK / rel).read_bytes() == (PRODUCT_WORK / rel).read_bytes(), rel
    assert working_names(cwd=PRODUCT_WORK) == expected_changed
    assert working_status(cwd=PRODUCT_WORK) == [("M", path) for path in expected_changed]
''',
        "separate-qualification-worktree",
    )
    source = replace_once(
        source,
        '"schema_version": "ssc-rd04-nd-current-result-counter-repair@2",',
        '"schema_version": "ssc-rd04-nd-current-result-counter-repair@3",',
        "receipt-schema-version",
    )
    source = replace_once(
        source,
        '"outside_human_dependency": False,\n    }',
        '"outside_human_dependency": False,\n        "qualification_worktree": "separate_disposable_exact_product_clone",\n        "qualification_product_files_byte_identical_after_release": True,\n        "construction_worktree_release_side_effects": 0,\n    }',
        "qualification-receipt-fields",
    )

    generated = source.encode("utf-8")
    generated_path = OUT / "generated-controller-v3.py"
    generated_path.write_bytes(generated)
    custody = {
        "schema_version": "ssc-rd04-nd-current-result-repair-controller-custody@3",
        "source_branch": V2_SOURCE_BRANCH,
        "source_commit": V2_SOURCE_COMMIT,
        "source_path": V2_SOURCE_PATH,
        "source_git_blob": V2_SOURCE_BLOB,
        "source_bytes": len(source_bytes),
        "source_sha256": sha256(source_bytes),
        "generated_path": generated_path.name,
        "generated_bytes": len(generated),
        "generated_sha256": sha256(generated),
        "patches": [
            "add separate qualification worktree",
            "run release check only in qualification worktree",
            "record release side effects",
            "require all eight product files byte-identical after qualification",
            "commit only from untouched construction worktree",
        ],
    }
    (OUT / "controller-custody.json").write_text(
        json.dumps(custody, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    compile(generated, str(generated_path), "exec")
    return generated_path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    generated_path = build_generated_controller()
    runpy.run_path(str(generated_path), run_name="__main__")


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        write_wrapper_failure(exc)
        raise
