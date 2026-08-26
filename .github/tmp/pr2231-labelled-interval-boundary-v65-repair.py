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
    "\nfunction independentPhoneStartAfterObservation(\n",
    r"""
function validatedLabelledPhoneInterval(
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

function independentPhoneStartAfterObservation(
""",
    "labelled-local-interval-helper",
)

library = replace_once(
    library,
    r"""    if (explicitPhoneLabelContext) {
      const labelledInterval = validatedIndependentPhoneInterval(
        candidate,
        groups,
        first,
        externalPrefix,
        externalSuffix,
        true
      );
      if (labelledInterval) {
""",
    r"""    if (explicitPhoneLabelContext) {
      const labelledInterval = validatedLabelledPhoneInterval(
        candidate,
        groups,
        first,
        externalSuffix
      );
      if (labelledInterval) {
""",
    "labelled-local-interval-call",
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
    'Phone: 09012345678 12:30:45 555-1212 3.14 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 3.14 [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 (555) 1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 555.1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'Phone / GUID / record id: 09012345678 12:30:45 555-1212',
    'Phone / GUID / record id: [contact omitted] 12:30:45 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'explicit telephone-label authority may validate a post-observation phone but must not acquire the observation interval'
  );
}


"""
tests = replace_once(
    tests,
    test_anchor,
    test_block + test_anchor,
    "labelled-interval-boundary-regression-tests",
)
test_path.write_text(tests)
