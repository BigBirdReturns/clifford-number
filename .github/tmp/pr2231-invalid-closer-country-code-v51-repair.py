from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

interval_anchor = r"""    observationOpeners = closingState.openers;
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
"""
interval_replacement = r"""    observationOpeners = closingState.openers;
    const invalidClosing = closingState.sawClosing && !closingState.valid;
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
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 1 212 555 1234`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14] 1 212 555 1234`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14] [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ２０２６－０８－１７－） １ ２１２ ５５５ １２３４`,
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
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an invalid closer must not cause a validated later phone to lose its exact left edge'
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
    'an invalid closer must not lend bounded-context telephone authority to a bare numeric tail'
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
