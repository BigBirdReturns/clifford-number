#!/usr/bin/env python3
"""Deterministically preserve complete nonleading date intervals in PR #2231.

This controller-only repair mutates exactly:
  * tools/lib/industrial-exhaust.mjs
  * test/industrial-exhaust.test.js

It refuses any predecessor or successor blob outside the frozen contract.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

LIB_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

PREDECESSOR_LIB_BLOB = "e47033a5178bf1960d55c7653898857662032d38"
PREDECESSOR_TEST_BLOB = "c7f0b3eb9c0d790a06c0affeaced5cc49c38a390"
SUCCESSOR_LIB_BLOB = "2b9b2903dfd7bf6eec05f2d1d607e0f60239267d"
SUCCESSOR_TEST_BLOB = "8312a83bf6afe7bfe9ebf05210196ea19793d7b2"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return source.replace(old, new, 1)


def mutate_library(source: str) -> str:
    source = replace_once(
        source,
        "const DATE_OBSERVATION_PATTERN = /^(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})(?=$|[^0-9])/u;\n",
        "const DATE_OBSERVATION_PATTERN = /^(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})(?=$|[^0-9])/u;\n"
        "const DATE_OBSERVATION_SCAN_PATTERN = /(?<![0-9])(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})(?=$|[^0-9])/gu;\n",
        "date scan grammar",
    )

    source = replace_once(
        source,
        "function isWeakBareRangeObservation(source, externalSuffix = '') {\n",
        "function normalizedSourceBoundaryMap(source, normalizedLength) {\n"
        "  const boundaries = new Uint32Array(normalizedLength + 1);\n"
        "  let sourceEnd = 0;\n"
        "  let normalizedEnd = 0;\n\n"
        "  for (const character of source) {\n"
        "    sourceEnd += character.length;\n"
        "    const characterNormalizedLength = character.normalize('NFKC').length;\n"
        "    for (let index = 1; index <= characterNormalizedLength; index += 1) {\n"
        "      boundaries[normalizedEnd + index] = sourceEnd;\n"
        "    }\n"
        "    normalizedEnd += characterNormalizedLength;\n"
        "  }\n"
        "  return boundaries;\n"
        "}\n\n"
        "function completeDateObservationRanges(source) {\n"
        "  const normalized = source.normalize('NFKC');\n"
        "  const sourceBoundaries = normalizedSourceBoundaryMap(\n"
        "    source,\n"
        "    normalized.length\n"
        "  );\n"
        "  return [...normalized.matchAll(DATE_OBSERVATION_SCAN_PATTERN)]\n"
        "    .map(match => ({\n"
        "      start: sourceBoundaries[match.index],\n"
        "      end: sourceBoundaries[match.index + match[0].length]\n"
        "    }))\n"
        "    .filter(range => range.end > range.start);\n"
        "}\n\n"
        "function isWeakBareRangeObservation(source, externalSuffix = '') {\n",
        "complete date range helper",
    )

    source = replace_once(
        source,
        "  const observationGroup = observation.group;\n"
        "  const normalizedCandidate = candidate.trim().normalize('NFKC');\n",
        "  const observationGroup = observation.group;\n"
        "  const completeDateRanges = completeDateObservationRanges(candidate);\n"
        "  const normalizedCandidate = candidate.trim().normalize('NFKC');\n",
        "candidate date-range census",
    )

    source = replace_once(
        source,
        "      const { start, end } = phoneWindowBounds(candidate, groups, first, last);\n"
        "      const slice = candidate.slice(start, end);\n"
        "      // Inherited explicit-label authority governs candidate entry and bounded\n",
        "      const { start, end } = phoneWindowBounds(candidate, groups, first, last);\n"
        "      const slice = candidate.slice(start, end);\n"
        "      if (completeDateRanges.some(range =>\n"
        "        start < range.end && end > range.start\n"
        "      )) continue;\n"
        "      // Inherited explicit-label authority governs candidate entry and bounded\n",
        "interior telephone optimizer date exclusion",
    )
    return source


def mutate_test(source: str) -> str:
    test_block = """for (const [name, input, expected] of [
  [
    'colon-fragment before ISO date and weak local',
    'Archive 12:30:45 2026-08-17 555-1212',
    'Archive 12:30:45 2026-08-17 555-1212'
  ],
  [
    'phone label cannot turn an interior ISO date into a phone',
    'Phone: 12:30:45 2026-08-17 555-1212',
    'Phone: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'colon-fragment before day-first date and weak local',
    'Archive 12:30:45 17-08-2026 555-1212',
    'Archive 12:30:45 17-08-2026 555-1212'
  ],
  [
    'colon-fragment before slash date and weak local',
    'Archive 12:30:45 2026/08/17 555-1212',
    'Archive 12:30:45 2026/08/17 555-1212'
  ],
  [
    'colon-fragment before period date and weak local',
    'Archive 12:30:45 2026.08.17 555-1212',
    'Archive 12:30:45 2026.08.17 555-1212'
  ],
  [
    'identifier context before date and weak local',
    'ID: 12:30:45 2026-08-17 555-1212',
    'ID: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'fullwidth colon-fragment before date and weak local',
    '記録：１２：３０：４５ ２０２６－０８－１７ ５５５－１２１２',
    '記録：１２：３０：４５ ２０２６－０８－１７ ５５５－１２１２'
  ],
  [
    'intrinsic domestic phone after a protected date',
    'Archive 12:30:45 2026-08-17 03-6216-8041',
    'Archive 12:30:45 2026-08-17 [contact omitted]'
  ],
  [
    'intrinsic dotted phone after a protected slash date',
    'Archive 12:30:45 2026/08/17 03.6216.8041',
    'Archive 12:30:45 2026/08/17 [contact omitted]'
  ],
  [
    'direct phone label still governs a weak local after a leading date',
    'Phone: 2026-08-17 555-1212',
    'Phone: 2026-08-17 [contact omitted]'
  ],
  [
    'dotted phone still outranks a following date observation',
    'Phone: 03.6216.8041 2026-08-17',
    'Phone: [contact omitted] 2026-08-17'
  ],
  [
    'invalid-closer attached observation repair remains intact',
    'Phone: 09012345678 2026-08-17)3.14 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)3.14 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: every complete date must own its exact interval before interior telephone restarts are scored`
  );
}

"""
    return replace_once(
        source,
        "const crawlerRuntimeSource = fs.readFileSync(\n",
        test_block + "const crawlerRuntimeSource = fs.readFileSync(\n",
        "focused date-custody tests",
    )


def main() -> None:
    lib_bytes = LIB_PATH.read_bytes()
    test_bytes = TEST_PATH.read_bytes()
    lib_blob = git_blob_sha(lib_bytes)
    test_blob = git_blob_sha(test_bytes)

    if (lib_blob, test_blob) == (SUCCESSOR_LIB_BLOB, SUCCESSOR_TEST_BLOB):
        print("repair already applied; successor blobs verified")
        return

    if lib_blob != PREDECESSOR_LIB_BLOB:
        raise SystemExit(
            f"library predecessor mismatch: actual={lib_blob} expected={PREDECESSOR_LIB_BLOB}"
        )
    if test_blob != PREDECESSOR_TEST_BLOB:
        raise SystemExit(
            f"test predecessor mismatch: actual={test_blob} expected={PREDECESSOR_TEST_BLOB}"
        )

    successor_lib = mutate_library(lib_bytes.decode("utf-8")).encode("utf-8")
    successor_test = mutate_test(test_bytes.decode("utf-8")).encode("utf-8")

    actual_lib = git_blob_sha(successor_lib)
    actual_test = git_blob_sha(successor_test)
    if actual_lib != SUCCESSOR_LIB_BLOB:
        raise SystemExit(
            f"library successor mismatch: actual={actual_lib} expected={SUCCESSOR_LIB_BLOB}"
        )
    if actual_test != SUCCESSOR_TEST_BLOB:
        raise SystemExit(
            f"test successor mismatch: actual={actual_test} expected={SUCCESSOR_TEST_BLOB}"
        )

    LIB_PATH.write_bytes(successor_lib)
    TEST_PATH.write_bytes(successor_test)
    print(f"repaired {LIB_PATH} -> {actual_lib}")
    print(f"repaired {TEST_PATH} -> {actual_test}")


if __name__ == "__main__":
    main()
