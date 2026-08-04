#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import zipfile

OUT = Path("/tmp/rd03-authored-recovery")
CARRIER_HEAD = os.environ["EXPECTED_CARRIER_HEAD"]
OVERWRITE_COMMIT = os.environ["OVERWRITE_COMMIT"]
EXPECTED_PATHS = sorted([
    ".github/workflows/status-sovereignty-rd-wave02-rd03-negotiated-terms.yml",
    "docs/milestones/ssc-rd-wave02-rd03-negotiated-terms.md",
    "schemas/status-sovereignty-rd-wave02-rd03-negotiated-terms.schema.json",
    "test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js",
    "tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs",
    "tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs",
])


def run(*args: str, check: bool = True) -> bytes:
    result = subprocess.run(args, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.stdout


def text(*args: str, check: bool = True) -> str:
    return run(*args, check=check).decode("utf-8", errors="replace").strip()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_object(spec: str) -> bytes:
    return run("git", "show", spec)


def refs_containing(commit: str) -> list[str]:
    output = text(
        "git", "for-each-ref", "--format=%(refname)", "--contains", commit,
        "refs/remotes/origin", "refs/tags", check=False,
    )
    return sorted(line for line in output.splitlines() if line)


def inspect_zip(encoded_raw: bytes, export_path: Path | None = None) -> dict:
    compact = b"".join(encoded_raw.split())
    record: dict = {
        "base64_bytes_raw": len(encoded_raw),
        "base64_bytes_compact": len(compact),
        "base64_sha256_raw": sha256(encoded_raw),
        "base64_sha256_compact": sha256(compact),
        "base64_decode_ok": False,
        "decoded_bytes": None,
        "decoded_sha256": None,
        "zip_eocd_present": False,
        "zip_exact_eof": False,
        "zip_open_ok": False,
        "zip_test_ok": False,
        "file_names": [],
        "expected_file_set": False,
        "file_sha256": {},
        "error": None,
    }
    try:
        decoded = base64.b64decode(compact, validate=True)
        record["base64_decode_ok"] = True
        record["decoded_bytes"] = len(decoded)
        record["decoded_sha256"] = sha256(decoded)
        eocd = decoded.rfind(b"PK\x05\x06")
        if eocd >= 0 and eocd + 22 <= len(decoded):
            record["zip_eocd_present"] = True
            comment_len = struct.unpack_from("<H", decoded, eocd + 20)[0]
            record["zip_exact_eof"] = eocd + 22 + comment_len == len(decoded)
        with zipfile.ZipFile(io.BytesIO(decoded), "r") as archive:
            record["zip_open_ok"] = True
            record["zip_test_ok"] = archive.testzip() is None
            names = sorted(name for name in archive.namelist() if not name.endswith("/"))
            record["file_names"] = names
            record["expected_file_set"] = names == EXPECTED_PATHS
            record["file_sha256"] = {
                name: sha256(archive.read(name)) for name in names
            }
        if export_path is not None and record["zip_test_ok"]:
            export_path.parent.mkdir(parents=True, exist_ok=True)
            export_path.write_bytes(decoded)
    except Exception as exc:  # diagnostic must retain typed failure
        record["error"] = f"{type(exc).__name__}: {exc}"
    return record


def deterministic_package(root: Path, destination: Path) -> dict:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in EXPECTED_PATHS:
            payload = (root / path).read_bytes()
            info = zipfile.ZipInfo(path, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            archive.writestr(info, payload)
    zip_bytes = buffer.getvalue()
    b64 = base64.b64encode(zip_bytes)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(zip_bytes)
    destination.with_suffix(".b64").write_bytes(b64)
    return {
        "zip_bytes": len(zip_bytes),
        "zip_sha256": sha256(zip_bytes),
        "base64_bytes": len(b64),
        "base64_sha256": sha256(b64),
        "file_sha256": {
            path: sha256((root / path).read_bytes()) for path in EXPECTED_PATHS
        },
    }


shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True)
assert text("git", "rev-parse", "HEAD") == CARRIER_HEAD
run(
    "git", "fetch", "--prune", "origin",
    "+refs/heads/*:refs/remotes/origin/*",
    "+refs/tags/*:refs/tags/*",
)

path_commits: dict[str, list[str]] = {}
path_candidates: dict[str, list[dict]] = {}
for path in EXPECTED_PATHS:
    commits = []
    for commit in text("git", "log", "--all", "--format=%H", "--", path).splitlines():
        if commit and commit not in commits:
            commits.append(commit)
    path_commits[path] = commits
    by_blob: dict[str, dict] = {}
    for commit in commits:
        blob = text("git", "rev-parse", f"{commit}:{path}", check=False)
        if not blob or "fatal:" in blob:
            continue
        payload = git_object(f"{commit}:{path}")
        item = by_blob.setdefault(blob, {
            "blob": blob,
            "bytes": len(payload),
            "sha256": sha256(payload),
            "commits": [],
        })
        item["commits"].append(commit)
    path_candidates[path] = sorted(by_blob.values(), key=lambda item: item["blob"])

commit_sets = [set(path_commits[path]) for path in EXPECTED_PATHS]
complete_commits = set.intersection(*commit_sets) if commit_sets else set()
complete_records = []
for commit in sorted(complete_commits, key=lambda value: int(text("git", "show", "-s", "--format=%ct", value)), reverse=True):
    short = commit[:12]
    root = OUT / "complete" / short / "files"
    for path in EXPECTED_PATHS:
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(git_object(f"{commit}:{path}"))
    package = deterministic_package(root, OUT / "complete" / short / "authored.zip")
    complete_records.append({
        "commit": commit,
        "timestamp": int(text("git", "show", "-s", "--format=%ct", commit)),
        "subject": text("git", "show", "-s", "--format=%s", commit),
        "refs": refs_containing(commit),
        "package": package,
    })

packages = {}
for label, commit in {
    "historical_pre_overwrite": text("git", "rev-parse", f"{OVERWRITE_COMMIT}^"),
    "current_carrier": CARRIER_HEAD,
}.items():
    parts = []
    for index in range(9):
        spec = f"{commit}:.rd03-terminal/authored/part-{index:02d}.b64"
        payload = git_object(spec)
        parts.append(payload)
    encoded = b"".join(parts)
    (OUT / "shards" / label).mkdir(parents=True, exist_ok=True)
    (OUT / "shards" / label / "authored.b64").write_bytes(encoded)
    packages[label] = {
        "commit": commit,
        "inspection": inspect_zip(encoded, OUT / "shards" / label / "authored.zip"),
    }

report = {
    "schema_version": "ssc-rd03-authored-package-recovery@1",
    "carrier_head": CARRIER_HEAD,
    "overwrite_commit": OVERWRITE_COMMIT,
    "expected_paths": EXPECTED_PATHS,
    "path_candidates": path_candidates,
    "complete_commits": complete_records,
    "retained_shard_packages": packages,
    "authority": {
        "outside_human_dependency": False,
        "external_contacts": 0,
        "external_reviews": 0,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    },
}
report_bytes = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
(OUT / "report.json").write_bytes(report_bytes)
(OUT / "report.sha256").write_text(f"{sha256(report_bytes)}  report.json\n")
print(json.dumps({
    "complete_commits": [item["commit"] for item in complete_records],
    "historical_package": packages["historical_pre_overwrite"]["inspection"],
    "current_package": packages["current_carrier"]["inspection"],
}, indent=2))
