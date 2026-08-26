from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

library_anchor = r"""    const invalidClosingBoundary = closingState.sawClosing
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
"""

library_replacement = r"""    const invalidClosingBoundary = closingState.sawClosing
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
"""

if library.count(library_anchor) != 1:
    raise SystemExit(
        f"attached-closer suppression anchor count={library.count(library_anchor)}"
    )
library = library.replace(library_anchor, library_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_replacement = r"""for (const [attachedCloser, attachedTail] of [
  [')', '03.6216.12345678'],
  [']', '03.6216.12345678'],
  ['）', '０３．６２１６．１２３４５６７８'],
  ['］', '０３．６２１６．１２３４５６７８']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17${attachedCloser}${attachedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17${attachedCloser}${attachedTail}`,
    'invalid-closer suppression must be acquired before an ineligible transition exits'
  );
}

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"attached-closer test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
