#!/usr/bin/env python3
"""Apply the bounded parallel route-discovery rewrite from the later loop first."""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

HELPER = Path(__file__).with_name("repair_parallel.py")
SPEC = importlib.util.spec_from_file_location("route_discovery_parallel_helper", HELPER)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"unable to load helper: {HELPER}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")

    if source.count(MODULE.IMPORT_ANCHOR) != 1:
        raise RuntimeError("concurrent-futures import anchor drift")
    source = source.replace(MODULE.IMPORT_ANCHOR, MODULE.IMPORT_REPLACEMENT)
    source = source.replace("MAX_DISCOVERED_FOLLOWS = 40", "MAX_DISCOVERED_FOLLOWS = 24")
    source = source.replace('"--max-time",\n        "60",', '"--max-time",\n        "30",')
    source = source.replace('"--retry",\n        "2",', '"--retry",\n        "1",')
    source = source.replace("timeout=75,", "timeout=45,")

    # Replace the later loop first so the earlier root-loop splice cannot alter
    # its search boundary, then replace the root loop.
    source = MODULE.replace_region(
        source,
        MODULE.FOLLOW_START,
        MODULE.FOLLOW_END,
        MODULE.FOLLOW_REPLACEMENT,
        "follow probe loop",
    )
    source = MODULE.replace_region(
        source,
        MODULE.ROOT_START,
        MODULE.ROOT_END,
        MODULE.ROOT_REPLACEMENT,
        "root probe loop",
    )

    for stale in (
        MODULE.ROOT_START,
        MODULE.FOLLOW_START,
        "MAX_DISCOVERED_FOLLOWS = 40",
        '"--max-time",\n        "60",',
        '"--retry",\n        "2",',
        "timeout=75,",
    ):
        if stale in source:
            raise RuntimeError(f"stale sequential or long-wait fixture survived: {stale!r}")
    target.write_text(source, encoding="utf-8")
    print(f"parallelized bounded route discovery in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
