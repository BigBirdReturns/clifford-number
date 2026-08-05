#!/usr/bin/env python3
"""Run the BVVC Form D denominator scan against SEC's year-partitioned paths.

SEC currently serves 2019-2025 Form D quarterly archives under the historical
``structureddata`` path and 2026 archives under ``datastandardsinnovation``.
The underlying acquisition runner deliberately remains unchanged; this wrapper
supplies a string-compatible route object so the captured coverage receipt
records the routing strategy while every request uses the exact official link.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

RUNNER = Path(__file__).with_name("run.py")
SPEC = importlib.util.spec_from_file_location("bvvc_sec_form_d_runner", RUNNER)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"unable to load runner: {RUNNER}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class YearPartitionedSecPattern(str):
    def format(self, *, year: int, quarter: int) -> str:
        directory = "structureddata" if year <= 2025 else "datastandardsinnovation"
        return (
            f"https://www.sec.gov/files/{directory}/data/"
            f"form-d-data-sets/{year}q{quarter}_d.zip"
        )


MODULE.SEC_ZIP_PATTERN = YearPartitionedSecPattern(
    "SEC official Form D route: structureddata for 2019-2025; "
    "datastandardsinnovation for 2026"
)

if __name__ == "__main__":
    raise SystemExit(MODULE.main())
