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
'''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {''',
'''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  returnMetadata = false
) {''',
    'outer helper signature',
)

lib = replace_once(
    lib,
'''  const handledBySegmentation = segmentationBoundaries.length > 0;
  if (!ranges.length) return handledBySegmentation ? candidate : null;
''',
'''  const handledBySegmentation = segmentationBoundaries.length > 0;
  if (!ranges.length) {
    if (!handledBySegmentation) return null;
    return returnMetadata ? { output: candidate, ranges: [] } : candidate;
  }
''',
    'outer helper empty ranges',
)

lib = replace_once(
    lib,
'''  output += candidate.slice(cursor);
  return output === candidate && !handledBySegmentation ? null : output;
}
''',
'''  output += candidate.slice(cursor);
  if (output === candidate && !handledBySegmentation) return null;
  return returnMetadata ? { output, ranges: mappedRanges } : output;
}
''',
    'outer helper structured return',
)

lib = replace_once(
    lib,
'''      return {
        output: `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`,
        ranges: null,
        explicitPhoneLabelContext
      };
''',
'''      return {
        output: `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`,
        // The first-phone geometry is complete only when the wrapper suffix
        // rendered byte-for-byte. If that suffix redacted another phone, keep
        // the existing fail-closed null rather than publish partial custody.
        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext
      };
''',
    'owned wrapper range custody',
)

lib = replace_once(
    lib,
'''      currentNarrativeParenthesisContext(input.slice(0, contactOffset)),
      prefixContext.indeterminate,
      inheritedExplicitPhoneLabelContext
    );
    if (outerCloserRedaction !== null) {
      return {
        output: outerCloserRedaction,
        ranges: null,
        explicitPhoneLabelContext
      };
''',
'''      currentNarrativeParenthesisContext(input.slice(0, contactOffset)),
      prefixContext.indeterminate,
      inheritedExplicitPhoneLabelContext,
      true
    );
    if (outerCloserRedaction !== null) {
      return {
        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext
      };
''',
    'outer wrapper structured call',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [wrappedBridgeCase, input, expected] of [
  [
    'ASCII narrative wrapper before formatted time',
    '(Phone: 09012345678) 12:30:45 555-1212',
    '(Phone: [contact omitted]) 12:30:45 [contact omitted]'
  ],
  [
    'plus-prefixed narrative wrapper before formatted time',
    '(Phone: +81 90 1234 5678) 12:30:45 555-1212',
    '(Phone: [contact omitted]) 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth narrative wrapper before formatted time',
    '（電話：０９０１２３４５６７８） １２：３０：４５ ５５５－１２１２',
    '（電話：[contact omitted]） １２：３０：４５ [contact omitted]'
  ],
  [
    'ASCII narrative wrapper before unit observation',
    '(Phone: 09012345678) 90 people 555-1212',
    '(Phone: [contact omitted]) 90 people [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `a ${wrappedBridgeCase} must retain exact first-phone range custody for the next callback`
  );
}

for (const [wrappedBridgeRefusal, input, expected] of [
  [
    'fresh sentence',
    '(Phone: 09012345678). 12:30:45 555-1212',
    '(Phone: [contact omitted]). 12:30:45 555-1212'
  ],
  [
    'unlabelled wrapper',
    '(Archive 09012345678) 12:30:45 555-1212',
    '(Archive [contact omitted]) 12:30:45 555-1212'
  ],
  [
    'narrative conjunction',
    '(Phone: 09012345678) and 555-1212',
    '(Phone: [contact omitted]) and 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `wrapped cross-callback label custody must refuse ${wrappedBridgeRefusal}`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(f'test insertion anchor count={tests.count(anchor)}, expected=1')
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
