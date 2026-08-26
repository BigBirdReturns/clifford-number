from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

library_anchor = r"""function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  let observationEnd = observation.end;
  let observationOpeners = trailingObservationOpeners(
    candidate.slice(0, groups[observation.group].index)
  );

  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
    const nextOpeners = trailingObservationOpeners(separator);
    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
      observationOpeners = [
        ...closingState.openers,
        ...nextOpeners
      ];
      observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      continue;
    }

    observationOpeners = closingState.openers;
    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      externalPrefix,
      externalSuffix,
      closingState.sawClosing && !closingState.valid
        ? false
        : indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}
"""

library_replacement = r"""function validatedIntrinsicPhoneInterval(
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

  const localInterval = validatedIndependentPhoneInterval(
    localCandidate,
    localGroups,
    0,
    '',
    externalSuffix,
    false
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
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  let observationEnd = observation.end;
  let observationOpeners = trailingObservationOpeners(
    candidate.slice(0, groups[observation.group].index)
  );
  let suppressIndeterminatePhoneContext = false;

  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    const invalidClosingBoundary = closingState.sawClosing
      && !closingState.valid;
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
    const nextOpeners = trailingObservationOpeners(separator);
    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

    const suppressAfterBoundary = suppressIndeterminatePhoneContext
      || invalidClosingBoundary;

    // Intrinsic telephone structure outranks an overlapping numeric-range
    // spelling. Validation begins at the proposed value, retaining only a
    // leading plus, so wrappers or markers owned by later values cannot lend
    // authority backward across a complete observation.
    const intrinsicInterval = validatedIntrinsicPhoneInterval(
      candidate,
      groups,
      first,
      externalSuffix
    );
    if (intrinsicInterval) return intrinsicInterval;

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
      suppressIndeterminatePhoneContext = suppressAfterBoundary;
      observationOpeners = [
        ...closingState.openers,
        ...nextOpeners
      ];
      observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      continue;
    }

    suppressIndeterminatePhoneContext = suppressAfterBoundary;
    observationOpeners = closingState.openers;
    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      externalPrefix,
      externalSuffix,
      suppressIndeterminatePhoneContext
        ? false
        : indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}
"""

if library.count(library_anchor) != 1:
    raise SystemExit(
        f"observation-phone precedence anchor count={library.count(library_anchor)}"
    )
library = library.replace(library_anchor, library_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_replacement = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17-) 050-12345678',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 03-62165111',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 ２０２６－０８－１７－） ０５０－１２３４５６７８',
    'Phone: [contact omitted] ２０２６－０８－１７－） [contact omitted]'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 050-12345678`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an intrinsically complete range-shaped phone must outrank an overlapping observation spelling'
  );
}

for (const observationTail of [
  '10-20 people',
  '2027-09-18',
  '3.14'
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) ${observationTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) ${observationTail}`,
    'intrinsic-phone precedence must preserve genuine numeric observations'
  );
}

for (const contaminatedTail of [
  '03.6216.12345678',
  '０３．６２１６．１２３４５６７８'
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) ${contaminatedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) ${contaminatedTail}`,
    'invalid-closer suppression must survive every observation restart'
  );
}

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"observation-phone focused test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
