from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}, expected=1")
    return text.replace(old, new, 1)


lib_path = Path('tools/lib/industrial-exhaust.mjs')
lib = lib_path.read_text(encoding='utf-8')

lib = replace_once(
    lib,
'''function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const labelEnd = terminalIdentifierLabelEnd(normalizedPrefix, boundedEnd);
  const windowStart = Math.max(0, labelEnd - 48);
  const window = normalizedPrefix.slice(windowStart, labelEnd);
  const match = window.match(PHONE_LABEL_PATTERN);
''',
'''function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const windowStart = Math.max(0, boundedEnd - 48);
  const window = normalizedPrefix.slice(windowStart, boundedEnd);
  const match = window.match(PHONE_LABEL_PATTERN);
''',
    'restore observation-first phone-label matching',
)

lib = replace_once(
    lib,
'''function hasPhoneLabelPrefix(prefix) {
  return hasPhoneLabelPrefixNormalized(prefix.normalize('NFKC'));
}

function phoneCandidateScore(candidate, prefix, indeterminatePhoneContext = false) {
''',
'''function hasPhoneLabelPrefix(prefix) {
  return hasPhoneLabelPrefixNormalized(prefix.normalize('NFKC'));
}

function hasPhoneLabelBeforeOpeningWrappers(normalizedPrefix) {
  const labelEnd = terminalIdentifierLabelEnd(
    normalizedPrefix,
    normalizedPrefix.length
  );
  return labelEnd < normalizedPrefix.length
    && hasPhoneLabelPrefixNormalized(normalizedPrefix.slice(0, labelEnd));
}

function stripMatchedObservationWrappers(value) {
  let normalized = value.normalize('NFKC').trim();
  while (normalized.length >= 2) {
    const closer = OBSERVATION_WRAPPER_PAIRS[normalized[0]];
    if (!closer || normalized.at(-1) !== closer) break;
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

function initialRangeProvesIntrinsicPhone(candidate, ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return false;
  const firstDigit = candidate.search(/[0-9０-９]/u);
  if (firstDigit < 0) return false;
  const initialRange = ranges.find(range =>
    range.start <= firstDigit && range.end > firstDigit
  );
  if (!initialRange) return false;

  const source = candidate.slice(initialRange.start, initialRange.end);
  if (!phoneCandidateScore(source, '', false)) return false;

  const unwrapped = stripMatchedObservationWrappers(source);
  const observation = crossCallbackObservationMatch(unwrapped);
  if (observation
      && observation[0].length === unwrapped.length
      && !isWeakBareRangeObservation(unwrapped)) return false;
  return true;
}

function provedWrappedPhoneLabelContext(prefix, candidate, ranges) {
  const normalizedPrefix = prefix.normalize('NFKC');
  return hasPhoneLabelBeforeOpeningWrappers(normalizedPrefix)
    && initialRangeProvesIntrinsicPhone(candidate, ranges);
}

function phoneCandidateScore(candidate, prefix, indeterminatePhoneContext = false) {
''',
    'post-classification wrapper label proof helpers',
)

lib = replace_once(
    lib,
'''  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);
''',
'''  const directExplicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);
''',
    'direct phone-label state',
)

lib = replace_once(
    lib,
'''        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext
''',
'''        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext: directExplicitPhoneLabelContext
          || provedWrappedPhoneLabelContext(
            prefix,
            phoneCandidate,
            phoneRanges
          )
''',
    'owned-wrapper label handoff',
)

lib = replace_once(
    lib,
'''        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext
''',
'''        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext: directExplicitPhoneLabelContext
          || provedWrappedPhoneLabelContext(
            prefix,
            candidate,
            outerCloserRedaction.ranges
          )
''',
    'outer-closer label handoff',
)

lib = replace_once(
    lib,
'''    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext
''',
'''    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext: directExplicitPhoneLabelContext
      || provedWrappedPhoneLabelContext(prefix, candidate, ranges)
''',
    'ordinary label handoff',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [wrappedObservationName, input] of [
  [
    'nested ISO date',
    'Phone: ((2026-08-17)) 12:30:45 555-1212'
  ],
  [
    'fullwidth nested ISO date',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'nested long decimal',
    'Phone: ((1234567.890123)) 12:30:45 555-1212'
  ],
  [
    'nested unit observation',
    'Phone: ((90 people)) 12:30:45 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    input,
    `${wrappedObservationName}: a wrapped strong observation must keep exclusive custody and mint no phone-label lease`
  );
}

assert.equal(
  redactContactData('Phone: ((03-62165111)) 12:30:45 555-1212'),
  'Phone: ([contact omitted]) 12:30:45 [contact omitted]',
  'a weak range-shaped domestic phone must retain its intrinsic telephone route before wrapped label authority is minted'
);

'''
if tests.count(anchor) != 1:
    raise SystemExit(f'test insertion anchor count={tests.count(anchor)}, expected=1')
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
