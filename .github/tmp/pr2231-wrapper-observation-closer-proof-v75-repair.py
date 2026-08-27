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
'''function crossCallbackObservationMatch(source) {
  const normalizedSource = source.normalize('NFKC');
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(normalizedSource);
  const ordinaryMatch = numericObservationMatch(source);
''',
'''function crossCallbackObservationMatch(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  const ordinaryMatch = numericObservationMatch(source, externalSuffix);
''',
    'suffix-aware cross-callback observation match',
)

lib = replace_once(
    lib,
'''  const leadingObservationSource = candidate.trimStart();
  const leadingObservationOffset = candidate.length - leadingObservationSource.length;
  const leadingObservationMatch = numericObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
''',
'''  const leadingObservationTrimOffset = candidate.length - candidate.trimStart().length;
  let leadingObservationOffset = leadingObservationTrimOffset;
  while (leadingObservationOffset < candidate.length) {
    const character = candidate[leadingObservationOffset];
    if (!Object.hasOwn(
      OBSERVATION_WRAPPER_PAIRS,
      character.normalize('NFKC')
    )) break;
    leadingObservationOffset += character.length;
    while (leadingObservationOffset < candidate.length
        && /\\s/u.test(candidate[leadingObservationOffset])) {
      leadingObservationOffset += 1;
    }
  }
  const leadingObservationSource = candidate.slice(leadingObservationOffset);
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
    'wrapper-aware leading observation classification',
)

lib = replace_once(
    lib,
'''      if (observationGroup < groups.length
          && first > observationGroup
          && groups[first].index < observation.end) continue;
''',
'''      if (observationGroup < groups.length
          && ((first === observationGroup && leadingObservationOwnsInitialGroup)
            || (first > observationGroup
              && groups[first].index < observation.end))) continue;
''',
    'wrapped observation initial-group custody',
)

lib = replace_once(
    lib,
'''function independentPhoneStartAfterObservation(
''',
'''function intervalSpansClosingWrapper(candidate, interval) {
  const source = candidate.slice(interval.start, interval.end).normalize('NFKC');
  return /\\)(?=[^0-9]*[0-9])/u.test(source);
}

function intervalHasContextFreeCloserProof(candidate, interval) {
  return !intervalSpansClosingWrapper(candidate, interval)
    || Boolean(phoneCandidateScore(
      candidate.slice(interval.start, interval.end),
      '',
      false
    ));
}

function independentPhoneStartAfterObservation(
''',
    'closer-spanning context-free proof helpers',
)

lib = replace_once(
    lib,
'''  let suppressIndeterminatePhoneContext = false;

  for (let first = observation.group; first < groups.length; first += 1) {
''',
'''  let suppressIndeterminatePhoneContext = false;
  let explicitPhoneLabelAvailable = explicitPhoneLabelContext;

  for (let first = observation.group; first < groups.length; first += 1) {
''',
    'bounded explicit label availability',
)

lib = replace_once(
    lib,
'''    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (invalidClosingBoundary) {
''',
'''    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (ownedClosingBoundary) explicitPhoneLabelAvailable = false;
    if (invalidClosingBoundary) {
''',
    'owned closer label expiry',
)

lib = replace_once(
    lib,
'''    if (explicitPhoneLabelContext) {
      const labelledInterval = validatedIndependentPhoneInterval(
        candidate,
        groups,
        first,
        externalPrefix,
        externalSuffix,
        true
      );
      if (labelledInterval) {
        return {
          ...labelledInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }
    }
''',
'''    if (explicitPhoneLabelAvailable) {
      const labelledInterval = validatedIndependentPhoneInterval(
        candidate,
        groups,
        first,
        externalPrefix,
        externalSuffix,
        true
      );
      if (labelledInterval
          && intervalHasContextFreeCloserProof(candidate, labelledInterval)) {
        return {
          ...labelledInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }
    }
''',
    'labelled closer-spanning interval proof',
)

lib = replace_once(
    lib,
'''    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      externalPrefix,
      externalSuffix,
      explicitPhoneLabelContext
        || (!suppressIndeterminatePhoneContext && indeterminatePhoneContext)
    );
    if (interval) {
''',
'''    const contextualPhoneAuthority = explicitPhoneLabelAvailable
      || (!suppressIndeterminatePhoneContext && indeterminatePhoneContext);
    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      externalPrefix,
      externalSuffix,
      contextualPhoneAuthority
    );
    if (interval
        && (!contextualPhoneAuthority
          || intervalHasContextFreeCloserProof(candidate, interval))) {
''',
    'ordinary closer-spanning interval proof',
)

lib = replace_once(
    lib,
'''    if (phoneCandidateScore(
      completePhoneSpan,
      `${externalPrefix}${candidate.slice(0, start)}`,
      effectivePhoneScoringContext
    )) {
''',
'''    if (phoneCandidateScore(
      completePhoneSpan,
      `${externalPrefix}${candidate.slice(0, start)}`,
      effectivePhoneScoringContext
    ) && (!effectivePhoneScoringContext
      || intervalHasContextFreeCloserProof(candidate, { start, end }))) {
''',
    'whole-span closer proof',
)

lib = replace_once(
    lib,
'''      if (!score) continue;

      // A proved observation owns only its interior restart points here. The
''',
'''      if (!score) continue;

      const interval = { start, end };
      const contextualInterval = indeterminatePhoneContext
        || hasPhoneLabelPrefix(
          `${externalPrefix}${candidate.slice(0, start)}`
        );
      if (contextualInterval
          && !intervalHasContextFreeCloserProof(candidate, interval)) {
        continue;
      }

      // A proved observation owns only its interior restart points here. The
''',
    'optimizer closer-spanning interval proof',
)

lib = replace_once(
    lib,
'''  const boundaryProofRanges = indeterminatePhoneContext
    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false,
        inheritedExplicitPhoneLabelContext
      )
    : initialRanges;
''',
'''  const boundaryProofRanges = phoneRedactionRanges(
    sanitizedCandidate,
    '',
    externalSuffix,
    allowInitialGroup,
    false,
    false
  );
''',
    'outer closer context-free boundary proof',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'nested phone-shaped unit observation',
    'Phone: ((03-62165111 people)) 12:30:45 555-1212',
    'Phone: ((03-62165111 people)) 12:30:45 555-1212'
  ],
  [
    'fullwidth nested phone-shaped unit observation',
    '電話：（（０３－６２１６５１１１ 人）） １２：３０：４５ ５５５－１２１２',
    '電話：（（０３－６２１６５１１１ 人）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'label-dependent closer-spanning range with bare tail',
    'Phone: (555-1212)12345678',
    'Phone: [contact omitted]12345678'
  ],
  [
    'fullwidth label-dependent closer-spanning range with bare tail',
    '電話：（５５５－１２１２）１２３４５６７８',
    '電話：[contact omitted]１２３４５６７８'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: wrapper or closer geometry must not lend telephone authority to an independently classified numeric tail`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
