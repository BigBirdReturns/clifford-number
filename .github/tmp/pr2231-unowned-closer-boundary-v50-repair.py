from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

closing_gate_anchor = r"""    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    if (closingState.sawClosing && !closingState.valid) continue;

    const nextOpeners = trailingObservationOpeners(separator);
    if (!/[\s/／.．]/u.test(separator)
        && !nextOpeners.length
        && !closingState.sawClosing) {
      continue;
    }
"""
closing_gate_replacement = r"""    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    const invalidClosing = closingState.sawClosing && !closingState.valid;
    const ownedClosingBoundary = closingState.sawClosing && closingState.valid;

    const nextOpeners = trailingObservationOpeners(separator);
    if (!/[\s/／.．]/u.test(separator)
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }
"""
if library.count(closing_gate_anchor) != 1:
    raise SystemExit(
        f"closing evidence gate anchor count={library.count(closing_gate_anchor)}"
    )
library = library.replace(closing_gate_anchor, closing_gate_replacement)

interval_anchor = r"""    observationOpeners = closingState.openers;
    const interval = validatedIndependentPhoneInterval(
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
"""
interval_replacement = r"""    observationOpeners = closingState.openers;
    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      invalidClosing ? '' : externalPrefix,
      externalSuffix,
      invalidClosing ? false : indeterminatePhoneContext
    );
"""
if library.count(interval_anchor) != 1:
    raise SystemExit(
        f"later-phone interval anchor count={library.count(interval_anchor)}"
    )
library = library.replace(interval_anchor, interval_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
test_addition = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17-) 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ２０２６－０８－１７－） ０３－６２１６－８０４１`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７－） [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) (03) 6216 8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-)/+81 3 6216 5111`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-)/[contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14] 1 212 555 1234`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14] [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an unowned closer must not veto independent separator evidence for a complete later phone'
  );
}

for (const invalidCloserBareNumeric of [
  `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 12345678`,
  `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14] 12345678`,
  `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ２０２６－０８－１７－） １２３４５６７８`
]) {
  assert.equal(
    redactContactData(invalidCloserBareNumeric),
    invalidCloserBareNumeric.replace('09012345678', '[contact omitted]'),
    'an invalid closer must not lend bounded-context phone authority to a bare numeric tail'
  );
}

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"focused regression insertion anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_addition)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
