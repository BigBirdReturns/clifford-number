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
'''  const leadingObservationOwnsInitialGroup = Boolean(
    leadingObservationOffset > leadingObservationTrimOffset
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
'''  const externalWrapperPhoneLabelContext = hasPhoneLabelBeforeOpeningWrappers(
    normalizedExternalPrefix
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
    'external-wrapper observation custody',
)

lib = replace_once(
    lib,
'''  if (explicitPhoneLabelContext && observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    if (isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
  const observationGroup = observation.group;
''',
'''  let demotedWeakObservation = null;
  if (explicitPhoneLabelContext && observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    if (isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      demotedWeakObservation = observation;
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
  const observationGroup = observation.group;
''',
    'weak-observation demotion custody',
)

lib = replace_once(
    lib,
'''  if (observationGroup === 0 && observation.end < candidate.length) {
''',
'''  if (observationGroup === 0 && demotedWeakObservation) {
    let initialPhoneLastGroup = demotedWeakObservation.group;
    while (initialPhoneLastGroup + 1 < groups.length
        && groups[initialPhoneLastGroup + 1].index
          + groups[initialPhoneLastGroup + 1][0].length
          <= demotedWeakObservation.end) {
      initialPhoneLastGroup += 1;
    }
    const initialPhone = phoneWindowBounds(
      candidate,
      groups,
      demotedWeakObservation.group,
      initialPhoneLastGroup
    );
    const initialPhoneSource = candidate.slice(initialPhone.start, initialPhone.end);
    const initialPhoneIsValid = phoneCandidateScore(
      initialPhoneSource,
      `${externalPrefix}${candidate.slice(0, initialPhone.start)}`,
      effectivePhoneScoringContext
    ) && (!effectivePhoneScoringContext
      || intervalHasContextFreeCloserProof(candidate, initialPhone));
    if (initialPhoneIsValid) {
      const laterPhone = independentPhoneStartAfterObservation(
        candidate,
        groups,
        demotedWeakObservation,
        externalPrefix,
        externalSuffix,
        indeterminatePhoneContext,
        explicitPhoneLabelContext
      );
      if (laterPhone) {
        const prefixBeforeLaterPhone = `${externalPrefix}${candidate.slice(
          0,
          initialPhone.start
        )}[contact omitted]${candidate.slice(initialPhone.end, laterPhone.start)}`;
        const remainderRanges = laterPhone.end < candidate.length
          ? phoneRedactionRanges(
              candidate.slice(laterPhone.end),
              `${prefixBeforeLaterPhone}[contact omitted]`,
              externalSuffix,
              true,
              laterPhone.suppressRemainderIndeterminatePhoneContext
                ? false
                : indeterminatePhoneContext,
              explicitPhoneLabelContext
            ).map(range => ({
              start: range.start + laterPhone.end,
              end: range.end + laterPhone.end
            }))
          : [];
        return [initialPhone, laterPhone, ...remainderRanges];
      }

      const initialProbe = independentPhoneStartAfterObservation(
        candidate,
        groups,
        observation,
        externalPrefix,
        externalSuffix,
        indeterminatePhoneContext,
        explicitPhoneLabelContext
      );
      if (initialProbe
          && initialProbe.start === initialPhone.start
          && initialProbe.end === initialPhone.end) {
        const remainderRanges = initialPhone.end < candidate.length
          ? phoneRedactionRanges(
              candidate.slice(initialPhone.end),
              `${externalPrefix}${candidate.slice(
                0,
                initialPhone.start
              )}[contact omitted]`,
              externalSuffix,
              true,
              initialProbe.suppressRemainderIndeterminatePhoneContext
                ? false
                : indeterminatePhoneContext,
              explicitPhoneLabelContext
            ).map(range => ({
              start: range.start + initialPhone.end,
              end: range.end + initialPhone.end
            }))
          : [];
        return [initialPhone, ...remainderRanges];
      }
      return [initialPhone];
    }
  }
  if (observationGroup === 0 && observation.end < candidate.length) {
''',
    'demoted weak phone publication',
)

lib = replace_once(
    lib,
r'''  return /[\r\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\.\s*$/u.test(normalized);
''',
r'''  return /[\r\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\.\s/u.test(normalized);
''',
    'cross-callback sentence boundary',
)

lib = replace_once(
    lib,
'''      if (mappedRanges) {
        explicitPhoneLabelLease = createCrossCallbackExplicitPhoneLabelLease(
''',
'''      if (mappedRanges && !bridge) {
        explicitPhoneLabelLease = createCrossCallbackExplicitPhoneLabelLease(
''',
    'one-use cross-callback lease',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'labelled weak local before intrinsic grouped phone',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'wrapped labelled weak local before intrinsic grouped phone',
    'Phone: (555-1212) 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'fullwidth wrapped labelled weak local before intrinsic grouped phone',
    '電話：（５５５－１２１２） ０３－６２１６－８０４１',
    '電話：[contact omitted] [contact omitted]'
  ],
  [
    'square-wrapped phone-shaped unit observation',
    'Phone: [03-62165111 people] 12:30:45 555-1212',
    'Phone: [03-62165111 people] 12:30:45 555-1212'
  ],
  [
    'brace-wrapped phone-shaped unit observation',
    'Phone: {03-62165111 people} 12:30:45 555-1212',
    'Phone: {03-62165111 people} 12:30:45 555-1212'
  ],
  [
    'Japanese-wrapped phone-shaped unit observation',
    'Phone: 【03-62165111 people】 12:30:45 555-1212',
    'Phone: 【03-62165111 people】 12:30:45 555-1212'
  ],
  [
    'fullwidth square-wrapped phone-shaped unit observation',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２'
  ],
  [
    'sentence boundary expires a possible later callback bridge',
    'Phone: 09012345678. 2026-08-17 12:30:45 555-1212',
    'Phone: [contact omitted]. 2026-08-17 12:30:45 555-1212'
  ],
  [
    'a bridged phone cannot renew the explicit-label lease',
    'Phone: 09012345678 12:30:45 555-1212 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 13:40:50 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: phone authority, observation custody, and callback leases must remain disjoint`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
