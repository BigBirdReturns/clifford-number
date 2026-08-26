from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

guard_anchor = r"""    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

    // Intrinsic telephone structure outranks an overlapping numeric-range
"""

guard_replacement = r"""    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (invalidClosingBoundary) {
      const attachedIntrinsicInterval = validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        first,
        externalSuffix
      );
      if (attachedIntrinsicInterval) {
        return {
          ...attachedIntrinsicInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }
    }
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

    // Intrinsic telephone structure outranks an overlapping numeric-range
"""

if library.count(guard_anchor) != 1:
    raise SystemExit(
        f"intrinsic-before-guard anchor count={library.count(guard_anchor)}"
    )
library = library.replace(guard_anchor, guard_replacement)

intrinsic_return_anchor = r"""    const intrinsicInterval = validatedIntrinsicPhoneInterval(
      candidate,
      groups,
      first,
      externalSuffix
    );
    if (intrinsicInterval) return intrinsicInterval;
"""

intrinsic_return_replacement = r"""    const intrinsicInterval = validatedIntrinsicPhoneInterval(
      candidate,
      groups,
      first,
      externalSuffix
    );
    if (intrinsicInterval) {
      return {
        ...intrinsicInterval,
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }
"""

if library.count(intrinsic_return_anchor) != 1:
    raise SystemExit(
        f"intrinsic-return anchor count={library.count(intrinsic_return_anchor)}"
    )
library = library.replace(intrinsic_return_anchor, intrinsic_return_replacement)

context_return_anchor = r"""    const interval = validatedIndependentPhoneInterval(
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
"""

context_return_replacement = r"""    const interval = validatedIndependentPhoneInterval(
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
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }
"""

if library.count(context_return_anchor) != 1:
    raise SystemExit(
        f"context-return anchor count={library.count(context_return_anchor)}"
    )
library = library.replace(context_return_anchor, context_return_replacement)

identifier_remainder_anchor = r"""          const remainder = laterPhone.end < candidate.length
            ? phoneRedactionRanges(
                candidate.slice(laterPhone.end),
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
                externalSuffix,
                true,
                indeterminatePhoneContext
              ).map(range => ({
"""

identifier_remainder_replacement = r"""          const remainder = laterPhone.end < candidate.length
            ? phoneRedactionRanges(
                candidate.slice(laterPhone.end),
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
                externalSuffix,
                true,
                laterPhone.suppressRemainderIndeterminatePhoneContext
                  ? false
                  : indeterminatePhoneContext
              ).map(range => ({
"""

if library.count(identifier_remainder_anchor) != 1:
    raise SystemExit(
        f"identifier-remainder anchor count={library.count(identifier_remainder_anchor)}"
    )
library = library.replace(
    identifier_remainder_anchor,
    identifier_remainder_replacement
)

leading_remainder_anchor = r"""      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
"""

leading_remainder_replacement = r"""      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
            externalSuffix,
            true,
            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext
          ).map(range => ({
"""

if library.count(leading_remainder_anchor) != 1:
    raise SystemExit(
        f"leading-remainder anchor count={library.count(leading_remainder_anchor)}"
    )
library = library.replace(
    leading_remainder_anchor,
    leading_remainder_replacement
)

affirmative_remainder_anchor = r"""      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
"""

affirmative_remainder_replacement = r"""      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
            externalSuffix,
            true,
            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext
          ).map(range => ({
"""

if library.count(affirmative_remainder_anchor) != 1:
    raise SystemExit(
        f"affirmative-remainder anchor count={library.count(affirmative_remainder_anchor)}"
    )
library = library.replace(
    affirmative_remainder_anchor,
    affirmative_remainder_replacement
)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_replacement = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17)03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)[contact omitted]'
  ],
  [
    'Phone: ０９０１２３４５６７８ ２０２６－０８－１７）０３－６２１６－８０４１',
    'Phone: [contact omitted] ２０２６－０８－１７）[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an attached invalid closer must still admit an intrinsically complete phone'
  );
}

for (const [tail, expectedTail] of [
  ['12345678', '12345678'],
  ['03.6216.12345678', '03.6216.12345678'],
  ['０３．６２１６．１２３４５６７８', '０３．６２１６．１２３４５６７８']
]) {
  const input =
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041 ${tail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted] ${expectedTail}`,
    'invalid-closer suppression must persist through every recursive suffix scan'
  );
}

assert.equal(
  redactContactData(
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17)12345678`
  ),
  `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17)12345678`,
  'an attached invalid closer must not grant phone authority to a bare numeric tail'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"invalid-closer regression-test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
