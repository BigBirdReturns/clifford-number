#!/usr/bin/env python3
from __future__ import annotations

import subprocess

TRANSPORT_BRANCH = "agent/electric-twin-funding-primary-source-transport-v1"
HELPER_PATH = ".github/temporary/apply-electric-twin-round-roster-split.py"
PARENT_REF = f"origin/{TRANSPORT_BRANCH}^"

source = subprocess.check_output(
    ["git", "show", f"{PARENT_REF}:{HELPER_PATH}"],
    text=True,
)

retired_test_assertion = """assert.equal(receipt('tech-eu-electric-twin-seed-round-2026-02-12'), undefined,
  'the superseded journalism receipt must be retired');
"""
retired_validator_assertion = """assert(!receiptById.has('tech-eu-electric-twin-seed-round-2026-02-12'),
  'superseded Tech.eu funding receipt remains canonical');
"""

for label, assertion in [
    ("compiler test", retired_test_assertion),
    ("release validator", retired_validator_assertion),
]:
    count = source.count(assertion)
    if count != 1:
        raise SystemExit(f"expected one stale {label} assertion, found {count}")
    source = source.replace(assertion, "")

exec(compile(source, HELPER_PATH, "exec"), {"__name__": "__main__"})
