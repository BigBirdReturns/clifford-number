from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

wrapper_anchor = r"""  const redactedPhone = redactPhoneSubspans(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      prefixContext.indeterminate
    );
"""

wrapper_replacement = r"""  const phoneRanges = phoneRedactionRanges(
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
    const suppressAfterWrapperIndeterminatePhoneContext = phoneRanges.some(
      range => range.suppressRemainderIndeterminatePhoneContext === true
    );
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      suppressAfterWrapperIndeterminatePhoneContext
        ? false
        : prefixContext.indeterminate
    );
"""

if library.count(wrapper_anchor) != 1:
    raise SystemExit(
        f"owned-wrapper state handoff anchor count={library.count(wrapper_anchor)}"
    )
library = library.replace(wrapper_anchor, wrapper_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_replacement = r"""const ownedWrapperSuppressionInput =
  `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 12345678`;
const ownedWrapperSuppressionActual = redactContactData(
  ownedWrapperSuppressionInput
);
assert.equal(
  (ownedWrapperSuppressionActual.match(/\[contact omitted\]/gu) ?? []).length,
  2,
  'an owned-wrapper split must not restore overflow authority for a bare remainder'
);
assert.ok(
  ownedWrapperSuppressionActual.endsWith(' 12345678'),
  'the preservation-only remainder after an owned wrapper must remain intact'
);
assert.match(
  ownedWrapperSuppressionActual,
  /2026-08-17-/u,
  'the complete observation before the contaminated transition must remain intact'
);

const ownedWrapperFullwidthInput =
  `Archive ${overflowIdentifierLabelChain}（record id: ０９０１２３４５６７８ ２０２６－０８－１７－）０３－６２１６－８０４１） １２３４５６７８`;
const ownedWrapperFullwidthActual = redactContactData(
  ownedWrapperFullwidthInput
);
assert.equal(
  (ownedWrapperFullwidthActual.match(/\[contact omitted\]/gu) ?? []).length,
  2,
  'fullwidth wrapper splitting must preserve the same suppression state'
);
assert.ok(
  ownedWrapperFullwidthActual.endsWith(' １２３４５６７８'),
  'the fullwidth preservation-only remainder must remain intact'
);

const ownedWrapperObservationTail =
  `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 2027-09-18`;
const ownedWrapperObservationActual = redactContactData(
  ownedWrapperObservationTail
);
assert.equal(
  (ownedWrapperObservationActual.match(/\[contact omitted\]/gu) ?? []).length,
  2,
  'a strong observation after the wrapper must not be promoted as contact data'
);
assert.ok(
  ownedWrapperObservationActual.endsWith(' 2027-09-18'),
  'the post-wrapper date must remain byte-for-byte intact'
);

const ownedWrapperSecondPhone =
  `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 050-12345678`;
const ownedWrapperSecondPhoneActual = redactContactData(
  ownedWrapperSecondPhone
);
assert.equal(
  (ownedWrapperSecondPhoneActual.match(/\[contact omitted\]/gu) ?? []).length,
  3,
  'suppression of overflow authority must not veto an intrinsically complete second phone'
);
assert.ok(
  ownedWrapperSecondPhoneActual.endsWith(' [contact omitted]'),
  'the post-wrapper intrinsic phone must retain its complete interval'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"owned-wrapper regression-test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
