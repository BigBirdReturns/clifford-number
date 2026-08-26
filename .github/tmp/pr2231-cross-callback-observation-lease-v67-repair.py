from pathlib import Path
import traceback

receipt = Path("/tmp/pr2231-v67-receipt.txt")


def replace_once(source, anchor, replacement, label):
    count = source.count(anchor)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}, expected=1")
    return source.replace(anchor, replacement, 1)


try:
    library_path = Path("tools/lib/industrial-exhaust.mjs")
    library = library_path.read_text(encoding="utf-8")

    redact_subspans_anchor = '''function redactPhoneSubspans(
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
'''
    redact_subspans_replacement = '''function redactPhoneSubspans(
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
'''
    library = replace_once(
        library,
        redact_subspans_anchor,
        redact_subspans_replacement,
        "redactPhoneSubspans signature",
    )

    outer_signature_anchor = '''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false
) {
'''
    outer_signature_replacement = '''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
'''
    library = replace_once(
        library,
        outer_signature_anchor,
        outer_signature_replacement,
        "outer closer signature",
    )

    initial_ranges_anchor = '''  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext
  );
'''
    initial_ranges_replacement = '''  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  );
'''
    library = replace_once(
        library,
        initial_ranges_anchor,
        initial_ranges_replacement,
        "outer closer initial ranges",
    )

    boundary_ranges_anchor = '''    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false
      )
'''
    boundary_ranges_replacement = '''    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false,
        inheritedExplicitPhoneLabelContext
      )
'''
    library = replace_once(
        library,
        boundary_ranges_anchor,
        boundary_ranges_replacement,
        "outer closer boundary proof",
    )

    segment_ranges_anchor = '''      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext
      );
'''
    segment_ranges_replacement = '''      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext,
        segmentStart === 0 ? inheritedExplicitPhoneLabelContext : false
      );
'''
    library = replace_once(
        library,
        segment_ranges_anchor,
        segment_ranges_replacement,
        "outer closer segment ranges",
    )

    function_start = library.find("export function redactContactData(value) {")
    function_end = library.find(
        "\nexport async function readBoundedUtf8Body",
        function_start,
    )
    if function_start < 0 or function_end < 0:
        raise SystemExit(
            f"redactContactData bounds start={function_start} end={function_end}"
        )

    replacement = r'''function crossCallbackObservationMatch(source) {
  const normalizedSource = source.normalize('NFKC');
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(normalizedSource);
  const ordinaryMatch = numericObservationMatch(source);
  if (!unitMatch) return ordinaryMatch;
  if (!ordinaryMatch || unitMatch[0].length > ordinaryMatch[0].length) {
    return unitMatch;
  }
  return ordinaryMatch;
}

function rangeOverlapsAny(range, ranges) {
  return ranges.some(existing =>
    range.start < existing.end && range.end > existing.start
  );
}

function seedFallsInsideEarlierObservation(
  candidate,
  groups,
  seed,
  minimumStart
) {
  const seedEnd = seed.index + seed[0].length;
  for (const group of groups) {
    if (group.index < minimumStart || group.index >= seed.index) continue;
    const source = candidate.slice(group.index);
    const observation = numericObservationMatch(source);
    if (!observation) continue;
    const observationEnd = group.index + sourceEndForNormalizedPrefix(
      source,
      observation[0].length
    );
    if (observationEnd >= seedEnd) return true;
  }
  return false;
}

function hasFreshCrossCallbackNarrativeBoundary(value) {
  const normalized = value.normalize('NFKC');
  return /[\r\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\.\s*$/u.test(normalized);
}

function crossCallbackExplicitPhoneLabelBridge(
  lease,
  candidate,
  offset,
  input
) {
  if (!lease || offset < lease.end || offset - lease.end > 64) return null;
  if (/[\r\n]/u.test(input.slice(lease.end, offset))) return null;

  const lastRedactedEnd = Math.max(...lease.ranges.map(range => range.end));
  const groups = [...lease.candidate.matchAll(DIGIT_RUN_PATTERN)];
  const sourceLimit = Math.min(
    input.length,
    offset + candidate.length + 64
  );

  for (const seed of groups) {
    const seedRange = {
      start: seed.index,
      end: seed.index + seed[0].length
    };
    if (seedRange.start < lastRedactedEnd) continue;
    if (rangeOverlapsAny(seedRange, lease.ranges)) continue;
    if (seedFallsInsideEarlierObservation(
      lease.candidate,
      groups,
      seed,
      lastRedactedEnd
    )) continue;

    const betweenPhoneAndSeed = lease.candidate.slice(
      lastRedactedEnd,
      seed.index
    );
    if (hasFreshCrossCallbackNarrativeBoundary(betweenPhoneAndSeed)) {
      continue;
    }

    const absoluteSeedStart = lease.offset + seed.index;
    const source = input.slice(absoluteSeedStart, sourceLimit);
    const observation = crossCallbackObservationMatch(source);
    if (!observation || isWeakBareRangeObservation(source)) continue;

    const absoluteObservationEnd = absoluteSeedStart
      + sourceEndForNormalizedPrefix(source, observation[0].length);
    if (absoluteObservationEnd <= lease.end
        || absoluteObservationEnd > offset + candidate.length) {
      continue;
    }

    const observationSource = input.slice(
      absoluteSeedStart,
      absoluteObservationEnd
    );
    if (/[\r\n]/u.test(observationSource)) continue;

    let currentObservationEnd = absoluteObservationEnd - offset;
    if (currentObservationEnd < 0) {
      const trailingGap = input.slice(absoluteObservationEnd, offset);
      if (!/^\s*$/u.test(trailingGap) || /[\r\n]/u.test(trailingGap)) {
        continue;
      }
      currentObservationEnd = 0;
    }

    const remainder = candidate.slice(currentObservationEnd);
    const firstDigit = remainder.search(/[0-9０-９]/u);
    if (firstDigit < 0) continue;
    const absoluteFirstDigit = offset + currentObservationEnd + firstDigit;
    const transition = input.slice(
      absoluteObservationEnd,
      absoluteFirstDigit
    );
    if (/[\r\n]/u.test(transition)
        || !/^[\s+＋(（]*$/u.test(transition)) {
      continue;
    }

    return {
      currentObservationEnd,
      observationStart: absoluteSeedStart,
      observationEnd: absoluteObservationEnd
    };
  }

  return null;
}

function createCrossCallbackExplicitPhoneLabelLease(
  candidate,
  offset,
  ranges,
  explicitPhoneLabelContext
) {
  if (!explicitPhoneLabelContext || !ranges.length) return null;
  return {
    candidate,
    offset,
    end: offset + candidate.length,
    ranges: ranges.map(range => ({
      start: range.start,
      end: range.end
    }))
  };
}

function redactPhoneSpanCandidate(
  candidate,
  offset,
  input,
  inheritedExplicitPhoneLabelContext = false
) {
  const firstContactCharacter = candidate.search(/[+＋(（0-9０-９]/u);
  const contactOffset = offset + Math.max(0, firstContactCharacter);
  const prefixContext = redactionPrefixContext(input, contactOffset);
  const prefix = prefixContext.text;
  const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
  const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || hasPhoneLabelPrefix(prefix);
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
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
      prefixContext.indeterminate,
      inheritedExplicitPhoneLabelContext
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
      return {
        output: `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`,
        ranges: null,
        explicitPhoneLabelContext
      };
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
      inheritedExplicitPhoneLabelContext
    );
    if (outerCloserRedaction !== null) {
      return {
        output: outerCloserRedaction,
        ranges: null,
        explicitPhoneLabelContext
      };
    }
  }

  const ranges = phoneRedactionRanges(
    candidate,
    prefix,
    suffix,
    allowInitialGroup,
    prefixContext.indeterminate,
    inheritedExplicitPhoneLabelContext
  );
  return {
    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext
  };
}

export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[contact omitted]');
  let explicitPhoneLabelLease = null;

  const phoneRedacted = emailRedacted.replace(
    PHONE_SPAN_PATTERN,
    (candidate, offset, input) => {
      const priorLease = explicitPhoneLabelLease;
      explicitPhoneLabelLease = null;

      const bridge = crossCallbackExplicitPhoneLabelBridge(
        priorLease,
        candidate,
        offset,
        input
      );
      const currentObservationEnd = bridge?.currentObservationEnd ?? 0;
      const preservedObservation = candidate.slice(0, currentObservationEnd);
      const localCandidate = candidate.slice(currentObservationEnd);
      const localOffset = offset + currentObservationEnd;
      const result = redactPhoneSpanCandidate(
        localCandidate,
        localOffset,
        input,
        Boolean(bridge)
      );
      const mappedRanges = result.ranges?.map(range => ({
        start: range.start + currentObservationEnd,
        end: range.end + currentObservationEnd
      })) ?? null;

      if (mappedRanges) {
        explicitPhoneLabelLease = createCrossCallbackExplicitPhoneLabelLease(
          candidate,
          offset,
          mappedRanges,
          result.explicitPhoneLabelContext
        );
      }

      return `${preservedObservation}${result.output}`;
    }
  );

  return phoneRedacted.replace(
    PHONE_EXTENSION_PATTERN,
    (candidate, marker, offset, input) =>
      redactPhoneExtensionCandidate(candidate, marker, offset, input)
  );
}
'''
    library = library[:function_start] + replacement + library[function_end:]
    library_path.write_text(library, encoding="utf-8")

    test_path = Path("test/industrial-exhaust.test.js")
    tests = test_path.read_text(encoding="utf-8")
    test_anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
    test_block = r'''for (const [crossCallbackCase, input, expected] of [
  [
    'formatted time with seconds',
    'Phone: 09012345678 12:30:45 555-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'formatted time without seconds',
    'Phone: 09012345678 12:30 555-1212',
    'Phone: [contact omitted] 12:30 [contact omitted]'
  ],
  [
    'unit count after a date',
    'Mobile number: 09012345678 2026-08-17 90 people 666-1212',
    'Mobile number: [contact omitted] 2026-08-17 90 people [contact omitted]'
  ],
  [
    'long unit count after a date',
    'Phone: 09012345678 2026-08-17 12345678 people 555-1212',
    'Phone: [contact omitted] 2026-08-17 12345678 people [contact omitted]'
  ],
  [
    'unit-bearing range',
    'Phone: 09012345678 1234-5678 people 555-1212',
    'Phone: [contact omitted] 1234-5678 people [contact omitted]'
  ],
  [
    'unit-bearing decimal',
    'Phone: 09012345678 1234.5678 people 555-1212',
    'Phone: [contact omitted] 1234.5678 people [contact omitted]'
  ],
  [
    'two local phones after one bridged time',
    'Phone: 09012345678 12:30:45 555-1212 555-3434',
    'Phone: [contact omitted] 12:30:45 [contact omitted] [contact omitted]'
  ],
  [
    'parenthesized local phone after one bridged time',
    'Phone: 09012345678 12:30:45 (555-1212)',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth labelled time bridge',
    '電話：０９０１２３４５６７８ １２：３０：４５ ５５５－１２１２',
    '電話：[contact omitted] １２：３０：４５ [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `a source-proved ${crossCallbackCase} must carry the established phone label only to the next callback`
  );
}

for (const [crossCallbackRefusal, input, expected] of [
  [
    'unlabelled sequence',
    'Archive 09012345678 12:30:45 555-1212',
    'Archive [contact omitted] 12:30:45 555-1212'
  ],
  [
    'ordinary narrative conjunction',
    'Phone: 09012345678 and 555-1212',
    'Phone: [contact omitted] and 555-1212'
  ],
  [
    'redacted phone digits reused as a count',
    'Phone: 09012345678 people 555-1212',
    'Phone: [contact omitted] people 555-1212'
  ],
  [
    'date component reused as a count',
    'Phone: 09012345678 2026-08-17 people 555-1212',
    'Phone: [contact omitted] 2026-08-17 people 555-1212'
  ],
  [
    'newline inside a possible unit observation',
    'Phone: 09012345678 90\npeople 555-1212',
    'Phone: [contact omitted] 90\npeople 555-1212'
  ],
  [
    'sentence boundary after a complete unit observation',
    'Phone: 09012345678 90 people. 555-1212',
    'Phone: [contact omitted] 90 people. 555-1212'
  ],
  [
    'semicolon after a complete unit observation',
    'Phone: 09012345678 90 people; 555-1212',
    'Phone: [contact omitted] 90 people; 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `cross-callback phone-label authority must refuse ${crossCallbackRefusal}`
  );
}

'''
    tests = replace_once(
        tests,
        test_anchor,
        test_block + test_anchor,
        "cross-callback focused tests",
    )
    test_path.write_text(tests, encoding="utf-8")
except BaseException as error:
    with receipt.open("a", encoding="utf-8") as handle:
        handle.write(
            f"REPAIR_EXCEPTION type={type(error).__name__} message={error}\n"
        )
        traceback.print_exc(file=handle)
    raise
