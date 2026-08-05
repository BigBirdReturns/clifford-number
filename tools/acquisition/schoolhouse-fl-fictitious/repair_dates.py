#!/usr/bin/env python3
"""Correct Florida MMDDYYYY filing-date classification in the temp runner."""

from __future__ import annotations

import argparse
from pathlib import Path

OLD = '''"filed_2023_or_later": bool(filing_date and filing_date[:4].isdigit() and int(filing_date[:4]) >= 2023),'''
NEW = '''"filed_2023_or_later": bool(
            filing_date
            and re.fullmatch(r"\\d{8}", filing_date)
            and int(filing_date[4:]) >= 2023
        ),'''


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")
    count = source.count(OLD)
    if count != 1:
        raise RuntimeError(f"expected one stale MMDDYYYY classifier, found {count}")
    repaired = source.replace(OLD, NEW)
    if OLD in repaired or NEW not in repaired:
        raise RuntimeError("filing-date classifier repair failed")
    target.write_text(repaired, encoding="utf-8")
    print(f"repaired MMDDYYYY filing-date classification in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
