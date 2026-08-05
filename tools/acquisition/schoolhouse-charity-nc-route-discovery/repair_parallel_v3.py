#!/usr/bin/env python3
"""Rewrite both bounded route-discovery loops in one deterministic splice."""

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

OLD_ROOT_NETWORK_LOOP = (
    "        for route in ROOT_ROUTES:\n"
    "            print(f\"root probe {route['route_id']} {route['url']}\", flush=True)\n"
)
OLD_FOLLOW_NETWORK_LOOP = (
    "        for link in selected:\n"
    "            url = link[\"href\"]\n"
)
NEW_ROOT_RESULT_LOOP = (
    "        for route in ROOT_ROUTES:\n"
    "            row, page, forms, links = root_results[route[\"route_id\"]]\n"
)
NEW_FOLLOW_RESULT_LOOP = (
    "        for link in selected:\n"
    "            followed, page, forms = follow_results[link[\"href\"]]\n"
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")

    if source.count(MODULE.IMPORT_ANCHOR) != 1:
        raise RuntimeError("concurrent-futures import anchor drift")
    if source.count(MODULE.ROOT_START) != 1 or source.count(MODULE.ROOT_END) != 1:
        raise RuntimeError(
            "root-loop boundary drift: "
            f"{source.count(MODULE.ROOT_START)}/{source.count(MODULE.ROOT_END)}"
        )
    if source.count(MODULE.FOLLOW_START) != 1 or source.count(MODULE.FOLLOW_END) != 1:
        raise RuntimeError(
            "follow-loop boundary drift: "
            f"{source.count(MODULE.FOLLOW_START)}/{source.count(MODULE.FOLLOW_END)}"
        )

    root_start = source.index(MODULE.ROOT_START)
    root_end = source.index(MODULE.ROOT_END, root_start)
    follow_start = source.index(MODULE.FOLLOW_START, root_end + len(MODULE.ROOT_END))
    follow_end = source.index(MODULE.FOLLOW_END, follow_start)
    if not (root_start < root_end < follow_start < follow_end):
        raise RuntimeError("route-discovery loop boundaries are not strictly ordered")

    middle = source[root_end + len(MODULE.ROOT_END) : follow_start]
    source = (
        source[:root_start]
        + MODULE.ROOT_REPLACEMENT
        + middle
        + MODULE.FOLLOW_REPLACEMENT
        + source[follow_end + len(MODULE.FOLLOW_END) :]
    )

    source = source.replace(MODULE.IMPORT_ANCHOR, MODULE.IMPORT_REPLACEMENT)
    replacements = {
        "MAX_DISCOVERED_FOLLOWS = 40": "MAX_DISCOVERED_FOLLOWS = 24",
        '"--max-time",\n        "60",': '"--max-time",\n        "30",',
        '"--retry",\n        "2",': '"--retry",\n        "1",',
        "timeout=75,": "timeout=45,",
    }
    for before, after in replacements.items():
        if source.count(before) != 1:
            raise RuntimeError(f"transport-bound fixture drift for {before!r}: {source.count(before)}")
        source = source.replace(before, after)

    if OLD_ROOT_NETWORK_LOOP in source:
        raise RuntimeError("stale sequential root network loop survived")
    if OLD_FOLLOW_NETWORK_LOOP in source:
        raise RuntimeError("stale sequential follow network loop survived")
    if source.count(NEW_ROOT_RESULT_LOOP) != 1:
        raise RuntimeError("parallel root result loop missing or duplicated")
    if source.count(NEW_FOLLOW_RESULT_LOOP) != 1:
        raise RuntimeError("parallel follow result loop missing or duplicated")
    if source.count("ThreadPoolExecutor") < 3:
        raise RuntimeError("parallel executor import and both executor blocks were not installed")
    for stale in replacements:
        if stale in source:
            raise RuntimeError(f"stale long-wait fixture survived: {stale!r}")

    target.write_text(source, encoding="utf-8")
    print(
        f"parallelized both bounded discovery stages in {target}; "
        "root and followed network requests now execute concurrently"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
