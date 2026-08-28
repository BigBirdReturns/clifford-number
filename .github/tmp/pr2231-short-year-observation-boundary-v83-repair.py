#!/usr/bin/env python3
"""Deterministically bound short-year telephone continuation at observations.

This controller-only program mutates exactly:
  * tools/lib/industrial-exhaust.mjs
  * test/industrial-exhaust.test.js

It refuses every predecessor and successor outside the frozen blob contract.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

LIB_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

PREDECESSOR_LIB_BLOB = "daadf5c66839e6e2c74792a02706704eee98e698"
PREDECESSOR_TEST_BLOB = "c43624859ba307792a12b1b0986300540a66399e"
SUCCESSOR_LIB_BLOB = "df1c93e21e451f7444fa01c57f8c80473fdc7a5b"
SUCCESSOR_TEST_BLOB = "6ca162940c7058b7ce5eba4de6bbc3af85b7db15"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return source.replace(old, new, 1)


OLD_CONTINUATION = r'''function completeIntrinsicPhoneContinuation(candidate, groups, first) {
  let validatedLast = -1;
  let validatedEnd = -1;
  const lastLimit = Math.min(
    groups.length - 1,
    first + MAX_PHONE_DIGIT_GROUPS - 1
  );

  for (let last = first; last <= lastLimit; last += 1) {
    const { start, end } = phoneWindowBounds(candidate, groups, first, last);
    if (!phoneCandidateScore(candidate.slice(start, end), '', false)) continue;
    validatedLast = last;
    validatedEnd = end;
  }

  if (validatedLast < 0) return false;
  if (validatedLast === groups.length - 1) return true;

  const next = validatedLast + 1;
  const tail = candidate.slice(groups[next].index).normalize('NFKC');
  if (DATE_OBSERVATION_PATTERN.test(tail)
      || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(tail)
      || NUMERIC_OBSERVATION_PATTERN.test(tail)) return true;

  const separator = candidate.slice(validatedEnd, groups[next].index);
  return /[\s/／.．]/u.test(separator)
    && canStartIndependentPhone(candidate, groups, next, '');
}
'''

NEW_CONTINUATION = r'''function intrinsicContinuationObservation(source) {
  const normalized = source.normalize('NFKC');
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(normalized);
  if (unitMatch) {
    return {
      kind: 'unit',
      end: sourceEndForNormalizedPrefix(source, unitMatch[0].length)
    };
  }

  const dateMatch = DATE_OBSERVATION_PATTERN.exec(normalized);
  if (dateMatch) {
    return {
      kind: 'date',
      end: sourceEndForNormalizedPrefix(source, dateMatch[0].length)
    };
  }

  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(normalized);
  if (!formattedMatch) return null;
  const weakBareRange = /^\d{1,9}\s*[-–—]\s*\d{1,9}(?=$|[^0-9])/u.test(
    formattedMatch[0]
  );
  if (weakBareRange) return null;
  return {
    kind: 'formatted',
    end: sourceEndForNormalizedPrefix(source, formattedMatch[0].length)
  };
}

function completeIntrinsicPhoneContinuation(candidate, groups, first) {
  let initialObservation = null;
  let boundaryGroup = groups.length;

  // The short-year disambiguator may prove a telephone only inside one source
  // value. Stop before a later complete date, decimal, time, unit-bearing value,
  // or wrapper-owned value rather than borrowing its digit groups to manufacture
  // a pair-grouped telephone. A bare period may remain internal to a dotted
  // telephone, whose complete context-free interval still has to score below.
  const continuationLimit = Math.min(
    groups.length,
    first + MAX_PHONE_DIGIT_GROUPS
  );
  for (let index = first; index < continuationLimit; index += 1) {
    const source = candidate.slice(
      groups[index].index,
      groups[index].index + 128
    );
    const observation = intrinsicContinuationObservation(source);
    if (index === first) {
      initialObservation = observation;
      continue;
    }

    const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[index].index);
    const normalizedSeparator = separator.normalize('NFKC');
    const wrapperBoundary = /[()\[\]{}【】]/u.test(normalizedSeparator);
    const dottedPhoneInterior = observation?.kind === 'formatted'
      && /^\s*\.\s*$/u.test(normalizedSeparator);
    if (wrapperBoundary || (observation && !dottedPhoneInterior)) {
      boundaryGroup = index;
      break;
    }
  }

  let validatedLast = -1;
  let validatedEnd = -1;
  const lastLimit = Math.min(
    boundaryGroup - 1,
    groups.length - 1,
    first + MAX_PHONE_DIGIT_GROUPS - 1
  );

  for (let last = first; last <= lastLimit; last += 1) {
    const { start, end } = phoneWindowBounds(candidate, groups, first, last);
    if (!phoneCandidateScore(candidate.slice(start, end), '', false)) continue;
    validatedLast = last;
    validatedEnd = end;
  }

  if (validatedLast < 0) return false;
  if (initialObservation) {
    if (initialObservation.kind !== 'formatted') return false;
    const observationEnd = groups[first].index + initialObservation.end;
    if (validatedEnd < observationEnd) return false;
  }
  if (boundaryGroup < groups.length) return true;
  if (validatedLast === groups.length - 1) return true;

  const next = validatedLast + 1;
  const tail = candidate.slice(groups[next].index).normalize('NFKC');
  if (DATE_OBSERVATION_PATTERN.test(tail)
      || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(tail)
      || NUMERIC_OBSERVATION_PATTERN.test(tail)) return true;

  const separator = candidate.slice(validatedEnd, groups[next].index);
  return /[\s/／.．]/u.test(separator)
    && canStartIndependentPhone(candidate, groups, next, '');
}
'''

TEST_INCREMENT = r'''

// PR2231 short-year continuation observation-boundary regressions
for (const [name, input, expected] of [
  [
    'unit observation train cannot manufacture a pair-grouped phone',
    'Archive 3.12.03 62-16 20 people',
    'Archive 3.12.03 62-16 20 people'
  ],
  [
    'explicit label cannot lend authority across the observation train',
    'Phone: 03-6216-8041 3.12.03 62-16 20 people',
    'Phone: [contact omitted] 3.12.03 62-16 20 people'
  ],
  [
    'fullwidth unit observation train remains source-faithful',
    '電話：３．１２．０３ ６２－１６ ２０ 人',
    '電話：３．１２．０３ ６２－１６ ２０ 人'
  ],
  [
    'complete short-year date stops the continuation scan',
    'Archive 3.12.03 62 16 17.08.26',
    'Archive 3.12.03 62 16 17.08.26'
  ],
  [
    'separate decimal stops the continuation scan',
    'Archive 3.12.03 6216.8041',
    'Archive 3.12.03 6216.8041'
  ],
  [
    'unit-bearing value beginning at the proposed phone start retains custody',
    'Archive 3.12.03-62165111 people',
    'Archive 3.12.03-62165111 people'
  ],
  [
    'pair-grouped phone remains an intrinsic continuation',
    'Archive 3.12.03 62-16 80-41',
    'Archive 3.12.[contact omitted]'
  ],
  [
    'dotted phone remains an intrinsic continuation',
    'Archive 3.12.03.6216.8041',
    'Archive 3.12.[contact omitted]'
  ],
  [
    'compact domestic phone remains an intrinsic continuation',
    'Phone: 03-6216-8041 3.12.050-12345678',
    'Phone: [contact omitted] 3.12.[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic short-year continuation proof must stop at complete observations without suppressing independently complete phones`
  );
}
'''


def mutate_library(source: str) -> str:
    return replace_once(
        source,
        OLD_CONTINUATION,
        NEW_CONTINUATION,
        "short-year continuation observation boundary",
    )


def mutate_test(source: str) -> str:
    marker = "// PR2231 short-year continuation observation-boundary regressions"
    if marker in source:
        raise SystemExit("test increment already present on predecessor")
    return source + TEST_INCREMENT


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
