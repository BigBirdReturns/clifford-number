#!/usr/bin/env python3
"""Bind history-dependent estate workflows to full-history checkouts."""

from __future__ import annotations

from pathlib import Path

WORKFLOWS = (
    Path('.github/workflows/estate-closure-aperture.yml'),
    Path('.github/workflows/estate-frontier-game-trails.yml'),
)
OLD = """      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
"""
NEW = """      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          show-progress: false
      - uses: actions/setup-node@v4
"""


def main() -> None:
    for path in WORKFLOWS:
        text = path.read_text(encoding='utf-8')
        count = text.count(OLD)
        if count != 1:
            raise SystemExit(f'{path}: expected one shallow checkout seam, observed {count}')
        path.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')

    release_workflow = Path('.github/workflows/ci.yml').read_text(encoding='utf-8')
    if 'fetch-depth: 0' not in release_workflow:
        raise SystemExit('canonical release workflow no longer carries the full-history contract')

    print('full-history estate checkout repair: 2 workflows')


if __name__ == '__main__':
    main()
