#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
import lzma
import os
import pathlib
import runpy
import traceback

OUT = pathlib.Path(os.environ["OUT"])
TRIGGER_PATH = pathlib.Path(os.environ["TRIGGER_PATH"])
CONTROLLER_PAYLOAD_PATH = pathlib.Path(os.environ["CONTROLLER_PAYLOAD_PATH"])

EXPECTED_B64_BYTES = 8_952
EXPECTED_B64_SHA256 = "175b29fdf0b01eb86b84831a58471e072801f1dec9986bf847bca8635b705f3e"
EXPECTED_B64_GIT_BLOB = "200488d19ae10f6c312fb7145e9355d7c011d919"
EXPECTED_XZ_BYTES = 6_712
EXPECTED_XZ_SHA256 = "220f30456ba40066b6237794b7cba01353562350eea95cf117aedd14d4e28cb2"
EXPECTED_SOURCE_BYTES = 29_448
EXPECTED_SOURCE_SHA256 = "25b7fc9adff392ed044c4a8913dd586d12466488073a629c30a7cf81b481be8c"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def write_failure(exc: BaseException) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    failure = {
        "schema_version": "ssc-rd04-nd-row-state-reconciliation-materializer-wrapper-failure@1",
        "state": "failed_closed_before_or_during_controller",
        "exception_type": type(exc).__name__,
        "exception": str(exc),
        "traceback": traceback.format_exc(),
        "canonical_parent": os.environ.get("CANONICAL_PARENT"),
        "event_head": os.environ.get("EVENT_HEAD_SHA"),
        "event_base": os.environ.get("EVENT_BASE_SHA"),
    }
    (OUT / "wrapper-failure.json").write_text(json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    trigger = json.loads(TRIGGER_PATH.read_text(encoding="utf-8"))
    payload = CONTROLLER_PAYLOAD_PATH.read_bytes()
    if len(payload) != EXPECTED_B64_BYTES or sha256(payload) != EXPECTED_B64_SHA256 or git_blob(payload) != EXPECTED_B64_GIT_BLOB:
        raise RuntimeError("controller payload identity mismatch")
    if trigger["controller_payload_bytes"] != len(payload) or trigger["controller_payload_sha256"] != sha256(payload):
        raise RuntimeError("trigger controller payload identity mismatch")
    compressed = base64.b64decode(payload, validate=True)
    if len(compressed) != EXPECTED_XZ_BYTES or sha256(compressed) != EXPECTED_XZ_SHA256:
        raise RuntimeError("controller XZ identity mismatch")
    source = lzma.decompress(compressed)
    if len(source) != EXPECTED_SOURCE_BYTES or sha256(source) != EXPECTED_SOURCE_SHA256:
        raise RuntimeError("controller source identity mismatch")
    if trigger["controller_source_bytes"] != len(source) or trigger["controller_source_sha256"] != sha256(source):
        raise RuntimeError("trigger controller source identity mismatch")
    generated = OUT / "generated-controller.py"
    generated.write_bytes(source)
    compile(source, str(generated), "exec")
    custody = {
        "schema_version": "ssc-rd04-nd-row-state-reconciliation-controller-custody@1",
        "payload_path": CONTROLLER_PAYLOAD_PATH.as_posix(),
        "payload_bytes": len(payload),
        "payload_sha256": sha256(payload),
        "payload_git_blob": git_blob(payload),
        "xz_bytes": len(compressed),
        "xz_sha256": sha256(compressed),
        "source_bytes": len(source),
        "source_sha256": sha256(source),
    }
    (OUT / "controller-custody.json").write_text(json.dumps(custody, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    runpy.run_path(str(generated), run_name="__main__")


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        write_failure(exc)
        raise
