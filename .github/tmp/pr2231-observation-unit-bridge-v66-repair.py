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
    r"""function redactPhoneSubspans(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false
) {
  return renderPhoneRedactionRanges(
    candidate,
    phoneRedactionRanges(
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext
    )
  );
}
""",
    r"""function redactPhoneSubspans(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  return renderPhoneRedactionRanges(
    candidate,
    phoneRedactionRanges(
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext
    )
  );
}
""",
    "phone-subspan-explicit-state-contract",
)

library = replace_once(
    library,
    r"""function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false
) {
""",
    r"""function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
""",
    "outer-closer-explicit-state-contract",
)

library = replace_once(
    library,
    r"""  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext
  );
""",
    r"""  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  );
""",
    "outer-closer-initial-explicit-state",
)

library = replace_once(
    library,
    r"""    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false
      )
""",
    r"""    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false,
        inheritedExplicitPhoneLabelContext
      )
""",
    "outer-closer-proof-explicit-state",
)

library = replace_once(
    library,
    r"""      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext
      );
""",
    r"""      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext,
        inheritedExplicitPhoneLabelContext
      );
""",
    "outer-closer-segment-explicit-state",
)

library = replace_once(
    library,
    "\nexport function redactContactData(value) {\n",
    r"""
function labelledObservationBridgeAcrossCandidates(
  previousCandidate,
  separator,
  followingCandidate
) {
  const groups = [...previousCandidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return false;

  const finalGroup = groups.at(-1);
  const observationSource = previousCandidate.slice(finalGroup.index);
  const normalizedSource = observationSource.normalize('NFKC');
  const normalizedSeparator = separator.normalize('NFKC');
  const observationMatch = numericObservationMatch(
    observationSource,
    `${separator}${followingCandidate.slice(0, 64)}`
  );
  if (!observationMatch) return false;

  // Cross-candidate telephone-label authority is available only when the
  // observation grammar consumes a substantive unit from the inter-candidate
  // separator. A date, range, decimal, or count completed inside the prior
  // regex candidate therefore cannot carry authority by itself.
  const consumedSeparatorLength = observationMatch[0].length
    - normalizedSource.length;
  if (consumedSeparatorLength <= 0
      || consumedSeparatorLength > normalizedSeparator.length) return false;

  const separatorEnd = sourceEndForNormalizedPrefix(
    separator,
    consumedSeparatorLength
  );
  const remainder = separator.slice(separatorEnd);
  const observationOpeners = trailingObservationOpeners(
    previousCandidate.slice(0, finalGroup.index)
  );
  const closingState = consumeOwnedObservationClosers(
    remainder,
    observationOpeners
  );

  // The consumed unit may be followed only by whitespace or closers owned by
  // the observation. Narrative words, sentence punctuation, and unowned
  // closers terminate the explicit label before the next scanner candidate.
  return closingState.valid
    && !/[^\s)\]】}]/u.test(remainder.normalize('NFKC'));
}

export function redactContactData(value) {
""",
    "cross-candidate-unit-bridge-helper",
)

library = replace_once(
    library,
    r"""export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[contact omitted]');
  const phoneRedacted = emailRedacted.replace(PHONE_SPAN_PATTERN, (candidate, offset, input) => {
    const firstContactCharacter = candidate.search(/[+＋(（0-9０-９]/u);
    const contactOffset = offset + Math.max(0, firstContactCharacter);
    const prefixContext = redactionPrefixContext(input, contactOffset);
    const prefix = prefixContext.text;
    const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
    const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
    const allowInitialGroup = prefixContext.indeterminate
      || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
      || hasPhoneLabelPrefix(prefix);
    const ownedWrapper = findOwnedNarrativePhoneWrapper(
      candidate,
      input,
      offset,
      contactOffset
    );

if (ownedWrapper) {
  const phoneCandidate = candidate.slice(0, ownedWrapper.closeIndex);
  const afterWrapper = stripUnownedLeadingPhoneClosers(
    candidate.slice(ownedWrapper.closeEnd),
    ownedWrapper.availableOuterOpeners
  );
  const phoneRanges = phoneRedactionRanges(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate
  );
  const redactedPhone = renderPhoneRedactionRanges(
    phoneCandidate,
    phoneRanges
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      false
    );
    return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;
  }
}
    if (!/[+＋]/u.test(input[contactOffset] ?? '')) {
      const outerCloserRedaction = redactPhoneCandidateAcrossOwnedOuterClosers(
        candidate,
        prefix,
        suffix,
        allowInitialGroup,
        currentNarrativeParenthesisContext(input.slice(0, contactOffset)),
        prefixContext.indeterminate
      );
      if (outerCloserRedaction !== null) return outerCloserRedaction;
    }
    return redactPhoneSubspans(
      candidate,
      prefix,
      suffix,
      allowInitialGroup,
      prefixContext.indeterminate
    );
  });
  return phoneRedacted.replace(PHONE_EXTENSION_PATTERN, (candidate, marker, offset, input) =>
    redactPhoneExtensionCandidate(candidate, marker, offset, input));
}
""",
    r"""export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[contact omitted]');
  let previousPhoneCandidate = null;
  let previousPhoneCandidateEnd = 0;
  let previousExplicitPhoneLabelContext = false;
  const phoneRedacted = emailRedacted.replace(PHONE_SPAN_PATTERN, (candidate, offset, input) => {
    const inheritedExplicitPhoneLabelContext = previousPhoneCandidate !== null
      && previousExplicitPhoneLabelContext
      && labelledObservationBridgeAcrossCandidates(
        previousPhoneCandidate,
        input.slice(previousPhoneCandidateEnd, offset),
        candidate
      );
    const firstContactCharacter = candidate.search(/[+＋(（0-9０-９]/u);
    const contactOffset = offset + Math.max(0, firstContactCharacter);
    const prefixContext = redactionPrefixContext(input, contactOffset);
    const prefix = prefixContext.text;
    const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
    const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
      || hasPhoneLabelPrefix(prefix);
    const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
    const allowInitialGroup = prefixContext.indeterminate
      || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
      || explicitPhoneLabelContext;
    previousPhoneCandidate = candidate;
    previousPhoneCandidateEnd = offset + candidate.length;
    previousExplicitPhoneLabelContext = explicitPhoneLabelContext;
    const ownedWrapper = findOwnedNarrativePhoneWrapper(
      candidate,
      input,
      offset,
      contactOffset
    );

if (ownedWrapper) {
  const phoneCandidate = candidate.slice(0, ownedWrapper.closeIndex);
  const afterWrapper = stripUnownedLeadingPhoneClosers(
    candidate.slice(ownedWrapper.closeEnd),
    ownedWrapper.availableOuterOpeners
  );
  const phoneRanges = phoneRedactionRanges(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate,
    explicitPhoneLabelContext
  );
  const redactedPhone = renderPhoneRedactionRanges(
    phoneCandidate,
    phoneRanges
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      false,
      explicitPhoneLabelContext
    );
    return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;
  }
}
    if (!/[+＋]/u.test(input[contactOffset] ?? '')) {
      const outerCloserRedaction = redactPhoneCandidateAcrossOwnedOuterClosers(
        candidate,
        prefix,
        suffix,
        allowInitialGroup,
        currentNarrativeParenthesisContext(input.slice(0, contactOffset)),
        prefixContext.indeterminate,
        explicitPhoneLabelContext
      );
      if (outerCloserRedaction !== null) return outerCloserRedaction;
    }
    return redactPhoneSubspans(
      candidate,
      prefix,
      suffix,
      allowInitialGroup,
      prefixContext.indeterminate,
      explicitPhoneLabelContext
    );
  });
  return phoneRedacted.replace(PHONE_EXTENSION_PATTERN, (candidate, marker, offset, input) =>
    redactPhoneExtensionCandidate(candidate, marker, offset, input));
}
""",
    "redaction-callback-explicit-state-custody",
)

library_path.write_text(library)

test_path = Path("test/industrial-exhaust.test.js")
tests = test_path.read_text()
test_anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
test_block = r"""for (const [input, expected] of [
  [
    'Mobile number: 2125551234 2026-08-17 555-1212 90 people 666-1212',
    'Mobile number: [contact omitted] 2026-08-17 [contact omitted] 90 people [contact omitted]'
  ],
  [
    'Phone: 09012345678 90 people 666-1212 12 days 777-1212',
    'Phone: [contact omitted] 90 people [contact omitted] 12 days [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ ９０人 ６６６－１２１２',
    '電話番号：[contact omitted] ９０人 [contact omitted]'
  ],
  [
    'Phone: 09012345678 (90 people) 666-1212',
    'Phone: [contact omitted] (90 people) [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'explicit telephone-label authority may cross only a complete unit observation bridge between scanner candidates'
  );
}

for (const [input, expected] of [
  [
    'Archive 09012345678 90 people 666-1212',
    'Archive [contact omitted] 90 people 666-1212'
  ],
  [
    'Phone: 09012345678 90 people. Archive 666-1212',
    'Phone: [contact omitted] 90 people. Archive 666-1212'
  ],
  [
    'Phone: 09012345678 90 people called 666-1212',
    'Phone: [contact omitted] 90 people called 666-1212'
  ],
  [
    'Phone: 09012345678 90 people) 666-1212',
    'Phone: [contact omitted] 90 people) 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unit observation bridging must not manufacture labels across narrative text or unowned closers'
  );
}


"""
tests = replace_once(
    tests,
    test_anchor,
    test_block + test_anchor,
    "cross-candidate-unit-bridge-regression-tests",
)
test_path.write_text(tests)
