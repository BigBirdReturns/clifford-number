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
'''  const leadingObservationSource = candidate.slice(leadingObservationOffset);
  const leadingObservationMatch = crossCallbackObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    leadingObservationOffset > leadingObservationTrimOffset
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
'''  const leadingObservationSource = candidate.slice(leadingObservationOffset);
  const leadingObservationMatch = crossCallbackObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
  const normalizedExternalPrefixWithoutWhitespace =
    normalizedExternalPrefix.trimEnd();
  const externalObservationOpener =
    normalizedExternalPrefixWithoutWhitespace.at(-1) ?? '';
  const externalObservationCloser =
    OBSERVATION_WRAPPER_PAIRS[externalObservationOpener] ?? null;
  const contextualLeadingObservationSource =
    `${leadingObservationSource}${externalSuffix}`;
  const contextualLeadingObservationEnd = leadingObservationMatch
    ? sourceEndForNormalizedPrefix(
        contextualLeadingObservationSource,
        leadingObservationMatch[0].length
      )
    : 0;
  const externalObservationRemainder =
    contextualLeadingObservationSource
      .slice(contextualLeadingObservationEnd)
      .normalize('NFKC');
  const externalObservationGap =
    externalObservationRemainder.match(/^\\s*/u)?.[0] ?? '';
  const externalWrapperOwnsLeadingObservation = Boolean(
    externalObservationCloser
      && !/[\\r\\n]/u.test(externalObservationGap)
      && externalObservationRemainder
        .slice(externalObservationGap.length)
        .startsWith(externalObservationCloser)
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperOwnsLeadingObservation)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
    'external-wrapper leading observation custody',
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
'''  let initialWeakObservationPhone = null;
  if (explicitPhoneLabelContext && observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    if (isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      if (observation.group === 0) {
        let initialWeakCandidateEnd = observation.end;
        let closerCursor = observation.end;
        while (closerCursor < candidate.length) {
          let nextCursor = closerCursor;
          while (nextCursor < candidate.length
              && /\\s/u.test(candidate[nextCursor])) {
            nextCursor += 1;
          }
          const normalizedCloser =
            candidate[nextCursor]?.normalize('NFKC') ?? '';
          if (!OBSERVATION_WRAPPER_CLOSERS.has(normalizedCloser)) break;
          closerCursor = nextCursor + candidate[nextCursor].length;
          initialWeakCandidateEnd = closerCursor;
        }
        const initialWeakCandidate = candidate.slice(0, initialWeakCandidateEnd);
        const initialWeakGroups = [
          ...initialWeakCandidate.matchAll(DIGIT_RUN_PATTERN)
        ];
        const proposedInitialPhone = initialWeakGroups.length
          ? validatedIndependentPhoneInterval(
              initialWeakCandidate,
              initialWeakGroups,
              0,
              externalPrefix,
              '',
              true
            )
          : null;
        if (proposedInitialPhone
            && intervalHasContextFreeCloserProof(
              initialWeakCandidate,
              proposedInitialPhone
            )) {
          initialWeakObservationPhone = proposedInitialPhone;
        }
      }
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
  const observationGroup = observation.group;
''',
    'retain initial weak-range telephone proof',
)

lib = replace_once(
    lib,
'''      return [laterPhone, ...remainderRanges];
    }
  }
  if (wholeSpanIsAffirmative && allowInitialGroup && observationGroup > 0) {
''',
'''      const initialRanges = initialWeakObservationPhone
          && initialWeakObservationPhone.end <= laterPhone.start
        ? [initialWeakObservationPhone]
        : [];
      return [...initialRanges, laterPhone, ...remainderRanges];
    }
  }
  if (wholeSpanIsAffirmative && allowInitialGroup && observationGroup > 0) {
''',
    'return initial and later telephone ranges',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'initial wrapped local phone before later intrinsic domestic phone',
    'Phone: (555-1212) 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'initial unwrapped local phone before later intrinsic domestic phone',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'fullwidth initial wrapped local phone before later intrinsic domestic phone',
    '電話：（５５５－１２１２） ０３－６２１６－８０４１',
    '電話：[contact omitted] [contact omitted]'
  ],
  [
    'square-wrapped phone-shaped unit observation',
    'Phone: [03-62165111 people] 12:30:45 555-1212',
    'Phone: [03-62165111 people] 12:30:45 555-1212'
  ],
  [
    'curly-wrapped phone-shaped unit observation',
    'Phone: {03-62165111 people} 12:30:45 555-1212',
    'Phone: {03-62165111 people} 12:30:45 555-1212'
  ],
  [
    'Japanese-bracket-wrapped phone-shaped unit observation',
    'Phone: 【03-62165111 people】 12:30:45 555-1212',
    'Phone: 【03-62165111 people】 12:30:45 555-1212'
  ],
  [
    'fullwidth square-wrapped phone-shaped unit observation',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the initial phone and externally wrapped observation must retain their independent custody`
  );
}

for (const [name, input, observation] of [
  [
    'square-wrapped intrinsic phone',
    'Phone: [03-62165111] 12:30:45 555-1212',
    '12:30:45'
  ],
  [
    'curly-wrapped intrinsic phone',
    'Phone: {03-62165111} 12:30:45 555-1212',
    '12:30:45'
  ],
  [
    'Japanese-bracket-wrapped intrinsic phone',
    'Phone: 【03-62165111】 12:30:45 555-1212',
    '12:30:45'
  ]
]) {
  const actual = redactContactData(input);
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    2,
    `${name}: both independently proved phones must redact`
  );
  assert.ok(
    actual.normalize('NFKC').includes(observation),
    `${name}: the complete observation must survive`
  );
  assert.doesNotMatch(
    actual.normalize('NFKC'),
    /555-1212/u,
    `${name}: the later labelled local phone must redact`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
