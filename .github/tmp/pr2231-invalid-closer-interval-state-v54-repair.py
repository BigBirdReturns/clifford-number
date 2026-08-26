from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

transition_anchor = r"""function independentPhoneStartAfterObservation(
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
    const suppressAfterBoundary = suppressIndeterminatePhoneContext
      || invalidClosingBoundary;
    suppressIndeterminatePhoneContext = suppressAfterBoundary;
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
    const nextOpeners = trailingObservationOpeners(separator);
    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

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

transition_replacement = r"""function independentPhoneStartAfterObservation(
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
    const suppressAfterBoundary = suppressIndeterminatePhoneContext
      || invalidClosingBoundary;
    suppressIndeterminatePhoneContext = suppressAfterBoundary;
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
    const nextOpeners = trailingObservationOpeners(separator);
    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    const eligibleBoundary = independentSeparatorBoundary
      || nextOpeners.length > 0
      || ownedClosingBoundary;
    if (!eligibleBoundary && !invalidClosingBoundary) continue;

    // Intrinsic telephone structure may cross invalid punctuation without
    // borrowing authority from it. A failed neutral probe still leaves an
    // invalid-only transition ineligible for observation or context scoring.
    const intrinsicInterval = validatedIntrinsicPhoneInterval(
      candidate,
      groups,
      first,
      externalSuffix
    );
    if (intrinsicInterval) {
      return {
        ...intrinsicInterval,
        remainderIndeterminatePhoneContext:
          suppressIndeterminatePhoneContext
            ? false
            : indeterminatePhoneContext
      };
    }

    if (!eligibleBoundary) continue;

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
      suppressIndeterminatePhoneContext
        ? false
        : indeterminatePhoneContext
    );
    if (interval) {
      return {
        ...interval,
        remainderIndeterminatePhoneContext:
          suppressIndeterminatePhoneContext
            ? false
            : indeterminatePhoneContext
      };
    }
  }
  return null;
}
"""

if library.count(transition_anchor) != 1:
    raise SystemExit(
        f"later-phone transition anchor count={library.count(transition_anchor)}"
    )
library = library.replace(transition_anchor, transition_replacement)

identifier_remainder_anchor = r"""        if (laterPhone) {
          const remainder = laterPhone.end < candidate.length
            ? phoneRedactionRanges(
                candidate.slice(laterPhone.end),
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
                externalSuffix,
                true,
                indeterminatePhoneContext
              ).map(range => ({
                start: range.start + laterPhone.end,
                end: range.end + laterPhone.end
              }))
            : [];
          return [laterPhone, ...remainder];
        }
"""

identifier_remainder_replacement = r"""        if (laterPhone) {
          const laterPhoneRange = {
            start: laterPhone.start,
            end: laterPhone.end
          };
          const remainder = laterPhone.end < candidate.length
            ? phoneRedactionRanges(
                candidate.slice(laterPhone.end),
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
                externalSuffix,
                true,
                laterPhone.remainderIndeterminatePhoneContext
              ).map(range => ({
                start: range.start + laterPhone.end,
                end: range.end + laterPhone.end
              }))
            : [];
          return [laterPhoneRange, ...remainder];
        }
"""

if library.count(identifier_remainder_anchor) != 1:
    raise SystemExit(
        f"identifier remainder anchor count={library.count(identifier_remainder_anchor)}"
    )
library = library.replace(
    identifier_remainder_anchor,
    identifier_remainder_replacement
)

leading_remainder_anchor = r"""    if (laterPhone) {
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [laterPhone, ...remainderRanges];
    }
"""

leading_remainder_replacement = r"""    if (laterPhone) {
      const laterPhoneRange = {
        start: laterPhone.start,
        end: laterPhone.end
      };
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
            externalSuffix,
            true,
            laterPhone.remainderIndeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [laterPhoneRange, ...remainderRanges];
    }
"""

if library.count(leading_remainder_anchor) != 1:
    raise SystemExit(
        f"leading remainder anchor count={library.count(leading_remainder_anchor)}"
    )
library = library.replace(
    leading_remainder_anchor,
    leading_remainder_replacement
)

affirmative_remainder_anchor = r"""      const preservedObservation = candidate.slice(end, laterPhone.start);
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [{ start, end }, laterPhone, ...remainderRanges];
"""

affirmative_remainder_replacement = r"""      const preservedObservation = candidate.slice(end, laterPhone.start);
      const laterPhoneRange = {
        start: laterPhone.start,
        end: laterPhone.end
      };
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
            externalSuffix,
            true,
            laterPhone.remainderIndeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [{ start, end }, laterPhoneRange, ...remainderRanges];
"""

if library.count(affirmative_remainder_anchor) != 1:
    raise SystemExit(
        f"affirmative remainder anchor count={library.count(affirmative_remainder_anchor)}"
    )
library = library.replace(
    affirmative_remainder_anchor,
    affirmative_remainder_replacement
)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_increment = r"""for (const [closer, laterPhone] of [
  [')', '03-6216-8041'],
  [']', '050-12345678'],
  [')', '01 42 68 53 00'],
  [')', '0011 81 3 6216 5111'],
  [')', '1 212 555 1234'],
  [')', '(03) 6216 8041'],
  [')', '09012345678'],
  ['）', '０３－６２１６－８０４１'],
  ['］', '０５０－１２３４５６７８']
]) {
  const input = `Phone: 09012345678 2026-08-17${closer}${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone: [contact omitted] 2026-08-17${closer}[contact omitted]`,
    'invalid closer evidence may be crossed only by one intrinsically complete telephone interval'
  );
}

for (const tail of [
  '12345678',
  '03.6216.12345678',
  '2027-09-18',
  '12:30',
  '3.14',
  '10-20 people'
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17)${tail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17)${tail}`,
    'an invalid-only transition must not lend observation or context authority to a weak suffix'
  );
}

for (const [laterTail, expectedTail] of [
  ['12345678', '12345678'],
  ['03.6216.12345678', '03.6216.12345678'],
  ['2027-09-18', '2027-09-18'],
  ['12:30', '12:30'],
  ['3.14', '3.14'],
  ['10-20 people', '10-20 people'],
  ['050-12345678', '[contact omitted]'],
  ['03-62165111', '[contact omitted]'],
  ['1 212 555 1234', '[contact omitted]'],
  ['0011 81 3 6216 5111', '[contact omitted]']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041 ${laterTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted] ${expectedTail}`,
    'the suppression state that admitted a later phone must govern every remainder interval'
  );
}

assert.equal(
  redactContactData(
    `Archive ${overflowIdentifierLabelChain}record id: ０９０１２３４５６７８ ２０２６－０８－１７－） ０３－６２１６－８０４１ １２３４５６７８`
  ),
  `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７－） [contact omitted] １２３４５６７８`,
  'fullwidth remainder recursion must retain invalid-closer suppression'
);

assert.equal(
  redactContactData('Phone: 09012345678 (2026-08-17)03-6216-8041'),
  'Phone: [contact omitted] (2026-08-17)[contact omitted]',
  'a matching observation-owned closer must retain its existing phone-boundary contribution'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"invalid-closer interval-state test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_increment)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
