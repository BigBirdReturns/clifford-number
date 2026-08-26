from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

library_anchor = r"""    const closingState = consumeOwnedObservationClosers(
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
library_replacement = r"""    const closingState = consumeOwnedObservationClosers(
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
"""
if library.count(library_anchor) != 1:
    raise SystemExit(
        f"unowned closer boundary anchor count={library.count(library_anchor)}"
    )
library = library.replace(library_anchor, library_replacement)

test_anchor = r"""for (const [unmatchedTail, expectedTail] of [
  ['2026-08-17-)12345678', '2026-08-17-)12345678'],
  ['2026-08-17-) 12345678', '2026-08-17-) 12345678'],
  ['２０２６－０８－１７－）１２３４５６７８', '２０２６－０８－１７－）１２３４５６７８']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ${unmatchedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ${expectedTail}`,
    'an unmatched closing wrapper may not invent a later telephone boundary'
  );
}

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
test_replacement = r"""for (const [unmatchedTail, expectedTail] of [
  ['2026-08-17-)12345678', '2026-08-17-)12345678'],
  ['2026-08-17-) 12345678', '2026-08-17-) 12345678'],
  ['２０２６－０８－１７－）１２３４５６７８', '２０２６－０８－１７－）１２３４５６７８']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ${unmatchedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ${expectedTail}`,
    'an unmatched closing wrapper may not invent a later telephone boundary'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17-) 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 ２０２６－０８－１７－） ０３－６２１６－８０４１',
    'Phone: [contact omitted] ２０２６－０８－１７－） [contact omitted]'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14] +81 3 6216 5111`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14] [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an unowned closer may not veto independent separator evidence for a complete later phone'
  );
}

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"unowned closer focused test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
