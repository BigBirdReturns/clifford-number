#!/usr/bin/env python3
"""Repair predecessor JSON dictionary access in the temporary acquisition runner."""

from __future__ import annotations

import argparse
from pathlib import Path

OLD = 'route_custody.florida["accessible_bulk_routes"][0]["content_length"]'
NEW = 'route_custody["florida"]["accessible_bulk_routes"][0]["content_length"]'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")
    count = source.count(OLD)
    if count != 1:
        raise RuntimeError(f"expected one stale predecessor-access expression, found {count}")
    repaired = source.replace(OLD, NEW)
    if OLD in repaired or repaired.count(NEW) != 1:
        raise RuntimeError("predecessor-access repair failed")
    target.write_text(repaired, encoding="utf-8")
    print(f"repaired predecessor dictionary access in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
