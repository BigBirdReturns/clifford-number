from pathlib import Path


def replace_once(text, anchor, replacement, label):
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(anchor, replacement)


library_path = Path("tools/lib/industrial-exhaust.mjs")
library = library_path.read_text()

library = replace_once(
    library,
    r"""function validatedLabelledPhoneInterval(
  candidate,
  groups,
  first,
  externalSuffix
) {
  const firstBounds = phoneWindowBounds(candidate, groups, first, first);
  const markerPrefix = candidate
    .slice(firstBounds.start, groups[first].index)
    .normalize('NFKC');
  const localStart = /^\+\s*$/u.test(markerPrefix)
    ? firstBounds.start
    : groups[first].index;
  const localCandidate = candidate.slice(localStart);
  const localGroups = [...localCandidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!localGroups.length) return null;

  // Explicit label authority was already proved for the enclosing scanner
  // candidate. Revalidate only the proposed phone suffix with affirmative
  // context, excluding observation bytes that precede `first` from both the
  // scoring prefix and the returned interval. An immediately attached leading
  // plus or wrapper remains owned by the proposed phone.
  const localInterval = validatedIndependentPhoneInterval(
    localCandidate,
    localGroups,
    0,
    '',
    externalSuffix,
    true
  );
  if (!localInterval) return null;

  return {
    start: firstBounds.start < groups[first].index
      ? firstBounds.start
      : localStart + localInterval.start,
    end: localStart + localInterval.end
  };
}
""",
    r"""function validatedLabelledPhoneInterval(
  candidate,
  groups,
  first,
  externalSuffix
) {
  const firstBounds = phoneWindowBounds(candidate, groups, first, first);
  const markerPrefix = candidate
    .slice(firstBounds.start, groups[first].index)
    .normalize('NFKC');
  const localStart = /^\+\s*$/u.test(markerPrefix)
    ? firstBounds.start
    : groups[first].index;
  const localCandidate = candidate.slice(localStart);
  const localGroups = [...localCandidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!localGroups.length) return null;

  const firstLocalBounds = phoneWindowBounds(
    localCandidate,
    localGroups,
    0,
    0
  );
  const hasExplicitMarker = firstLocalBounds.start < localGroups[0].index;
  let lastLimit = Math.min(
    localGroups.length - 1,
    MAX_PHONE_DIGIT_GROUPS - 1
  );
  if (!hasExplicitMarker) {
    for (let index = 1; index <= lastLimit; index += 1) {
      if (phoneWindowBounds(
        localCandidate,
        localGroups,
        index,
        index
      ).start < localGroups[index].index) {
        lastLimit = index - 1;
        break;
      }
    }
  }

  // Explicit telephone-label authority was proved before the enclosing
  // candidate entered observation recovery. Score the proposed local value
  // directly under that authority instead of sending it back through
  // trailingObservationGroup, which necessarily sees a range-shaped local
  // phone such as 555-1212 as a numeric observation at group zero. After a
  // valid local phone exists, stop before the next independently delimited
  // date, time, decimal, count, or range observation. The ordinary recursive
  // scanner remains responsible for any phone after that preserved value.
  let validated = null;
  for (let last = 0; last <= lastLimit; last += 1) {
    const bounds = phoneWindowBounds(
      localCandidate,
      localGroups,
      0,
      last
    );
    if (phoneCandidateScore(
      localCandidate.slice(bounds.start, bounds.end),
      '',
      true
    )) validated = bounds;

    if (!validated || last >= lastLimit) continue;
    const next = last + 1;
    const previousEnd = localGroups[last].index
      + localGroups[last][0].length;
    const separator = localCandidate.slice(
      previousEnd,
      localGroups[next].index
    );
    if (!/[\s/／.．]/u.test(separator)) continue;
    if (numericObservationMatch(
      localCandidate.slice(localGroups[next].index),
      externalSuffix
    )) break;
  }
  if (!validated) return null;

  return {
    start: firstBounds.start < groups[first].index
      ? firstBounds.start
      : localStart + validated.start,
    end: localStart + validated.end
  };
}
""",
    "labelled-local-window-validation",
)

library_path.write_text(library)

test_path = Path("test/industrial-exhaust.test.js")
tests = test_path.read_text()
test_anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
test_block = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 12:30:45 555-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ １２：３０：４５ ５５５－１２１２',
    '電話番号：[contact omitted] １２：３０：４５ [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 555-1212 2026-08-17 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 555-1212 3.14 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 3.14 [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 555-1212 90 people 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 90 people [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 (555) 1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'explicit telephone-label authority must score the local phone window before later observations are preserved'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 12:30:45 2026-08-17 2027-09-18',
    'Phone: [contact omitted] 12:30:45 2026-08-17 2027-09-18'
  ],
  [
    'Phone: 09012345678 12:30:45 555-1212. Archive 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]. Archive 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'local labelled-window validation must stop at observations and fresh narrative boundaries'
  );
}


"""
tests = replace_once(
    tests,
    test_anchor,
    test_block + test_anchor,
    "labelled-local-window-regression-tests",
)
test_path.write_text(tests)
