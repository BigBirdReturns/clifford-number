#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import base64
import gzip
import hashlib
import os
import subprocess
import sys

LIB = Path('tools/lib/industrial-exhaust.mjs')
TEST = Path('test/industrial-exhaust.test.js')

EXPECTED_LIB_SHA = '54c390839fa06f39b83e3fd2cac9852082bc9a09'
EXPECTED_TEST_SHA = '6941d9bedc20b3a83a4f2ce96bfbf79457def077'

OLD = "const independentSeparatorBoundary = /[\\s/／.．]/u.test(separator);"
NEW = "const independentSeparatorBoundary = /[\\s/／.．\\-‐‑‒–—−－]/u.test(separator);"
MARKER = '// PR2231 V88: post-observation dash-boundary custody'

CONTROLLER_GZ_B64 = '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'


def run_controller() -> None:
    target = Path('/tmp/pr2231-v88-controller.sh')
    target.write_bytes(gzip.decompress(base64.b64decode(CONTROLLER_GZ_B64)))
    target.chmod(0o755)
    os.execve('/bin/bash', ['bash', str(target)], os.environ.copy())


TEST_BLOCK = r'''

// PR2231 V88: post-observation dash-boundary custody
for (const [name, input, expected] of [
  [
    'short-year observation admits an ASCII-dash-separated domestic phone',
    'Phone: 09012345678 3.12.03-03-6216-8041',
    'Phone: [contact omitted] 3.12.03-[contact omitted]'
  ],
  [
    'ISO observation admits an ASCII-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17-03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-[contact omitted]'
  ],
  [
    'ISO observation admits a U+2010-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17‐03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‐[contact omitted]'
  ],
  [
    'ISO observation admits a nonbreaking-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17‑03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‑[contact omitted]'
  ],
  [
    'ISO observation admits a figure-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17‒03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‒[contact omitted]'
  ],
  [
    'ISO observation admits an en-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17–03-6216-8041',
    'Phone: [contact omitted] 2026-08-17–[contact omitted]'
  ],
  [
    'ISO observation admits an em-dash-separated domestic phone',
    'Phone: 09012345678 2026-08-17—03-6216-8041',
    'Phone: [contact omitted] 2026-08-17—[contact omitted]'
  ],
  [
    'ISO observation admits a minus-sign-separated domestic phone',
    'Phone: 09012345678 2026-08-17−03-6216-8041',
    'Phone: [contact omitted] 2026-08-17−[contact omitted]'
  ],
  [
    'fullwidth observation admits a fullwidth-dash-separated domestic phone',
    '電話：０９０１２３４５６７８ ２０２６－０８－１７－０３－６２１６－８０４１',
    '電話：[contact omitted] ２０２６－０８－１７－[contact omitted]'
  ],
  [
    'dash boundary preserves a strong unit-bearing range',
    'Phone: 09012345678 2026-08-17-10-20 people',
    'Phone: [contact omitted] 2026-08-17-10-20 people'
  ],
  [
    'dash boundary preserves a second complete date',
    'Phone: 09012345678 2026-08-17-2027-09-18',
    'Phone: [contact omitted] 2026-08-17-2027-09-18'
  ],
  [
    'dash boundary preserves an attached decimal observation',
    'Phone: 09012345678 2026-08-17-3.14',
    'Phone: [contact omitted] 2026-08-17-3.14'
  ],
  [
    'unlabelled dash boundary does not promote a bare numeric tail',
    'Archive 09012345678 2026-08-17-12345678',
    'Archive [contact omitted] 2026-08-17-12345678'
  ],
  [
    'short-year attached complete date remains source-faithful',
    'Archive 3.12.03-20-08-17',
    'Archive 3.12.03-20-08-17'
  ],
  [
    'day-first dotted date retains custody before a dash-separated phone',
    'Phone: 03-6216-8041 17.08.2026-03-6216-8041',
    'Phone: [contact omitted] 17.08.2026-[contact omitted]'
  ],
  [
    'dash-separated compact domestic phone retains its complete interval',
    'Phone: 09012345678 2026-08-17-050-12345678',
    'Phone: [contact omitted] 2026-08-17-[contact omitted]'
  ],
  [
    'dash-separated pair-grouped phone retains its complete interval',
    'Phone: 09012345678 2026-08-17-01 42 68 53 00',
    'Phone: [contact omitted] 2026-08-17-[contact omitted]'
  ],
  [
    'dash-separated North American phone retains its country code',
    'Phone: 09012345678 2026-08-17-1 212 555 1234',
    'Phone: [contact omitted] 2026-08-17-[contact omitted]'
  ],
  [
    'dash-separated phone remains complete before its extension',
    'Phone: 09012345678 3.12.03-03-6216-8041 ext 55',
    'Phone: [contact omitted] 3.12.03-[contact omitted] ext [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: dash punctuation accepted by the scanner must reach the existing post-observation validators`
  );
}
'''


def git_blob(path: Path) -> str:
    return subprocess.check_output(['git', 'hash-object', str(path)], text=True).strip()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'REFUSE: {message}')


def main() -> None:
    require(LIB.is_file(), f'missing {LIB}')
    require(TEST.is_file(), f'missing {TEST}')
    require(git_blob(LIB) == EXPECTED_LIB_SHA, 'predecessor library blob mismatch')
    require(git_blob(TEST) == EXPECTED_TEST_SHA, 'predecessor focused-test blob mismatch')

    lib = LIB.read_text(encoding='utf-8')
    test = TEST.read_text(encoding='utf-8')
    require(lib.count(OLD) == 1, f'library anchor count={lib.count(OLD)}')
    require(NEW not in lib, 'repair already present in library')
    require(MARKER not in test, 'repair tests already present')

    LIB.write_text(lib.replace(OLD, NEW, 1), encoding='utf-8')
    TEST.write_text(test.rstrip() + TEST_BLOCK + '\n', encoding='utf-8')

    require(LIB.read_text(encoding='utf-8').count(NEW) == 1, 'repaired library anchor missing')
    require(TEST.read_text(encoding='utf-8').count(MARKER) == 1, 'focused-test marker count mismatch')

    print(f'predecessor-library={EXPECTED_LIB_SHA}')
    print(f'predecessor-focused-test={EXPECTED_TEST_SHA}')
    print(f'successor-library={git_blob(LIB)}')
    print(f'successor-focused-test={git_blob(TEST)}')
    print(f'patch-sha256={hashlib.sha256((OLD + "\n" + NEW + TEST_BLOCK).encode()).hexdigest()}')
    print('V88_REPAIR_APPLIED')


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--controller':
        run_controller()
    elif len(sys.argv) == 1:
        main()
    else:
        raise SystemExit('usage: repair.py [--controller]')
