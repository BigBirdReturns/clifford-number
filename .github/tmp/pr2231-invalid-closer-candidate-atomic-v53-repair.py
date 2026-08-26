from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

mismatch_anchor = r"""      return { valid: false, sawClosing: true, openers };
"""
mismatch_replacement = r"""      return { valid: false, sawClosing: true, openers: [] };
"""
if library.count(mismatch_anchor) != 1:
    raise SystemExit(
        f"mismatched closer state anchor count={library.count(mismatch_anchor)}"
    )
library = library.replace(mismatch_anchor, mismatch_replacement)

sticky_anchor = r"""  let observationOpeners = trailingObservationOpeners(
    candidate.slice(0, groups[observation.group].index)
  );

  for (let first = observation.group; first < groups.length; first += 1) {
"""
sticky_replacement = r"""  let observationOpeners = trailingObservationOpeners(
    candidate.slice(0, groups[observation.group].index)
  );
  let invalidClosingCandidate = false;

  for (let first = observation.group; first < groups.length; first += 1) {
"""
if library.count(sticky_anchor) != 1:
    raise SystemExit(
        f"candidate contamination state anchor count={library.count(sticky_anchor)}"
    )
library = library.replace(sticky_anchor, sticky_replacement)

closing_anchor = r"""    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
"""
closing_replacement = r"""    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    if (closingState.sawClosing && !closingState.valid) {
      invalidClosingCandidate = true;
      observationOpeners = [];
    }
    const independentSeparatorBoundary = /[\s/／.．]/u.test(separator);
"""
if library.count(closing_anchor) != 1:
    raise SystemExit(
        f"invalid closer transition anchor count={library.count(closing_anchor)}"
    )
library = library.replace(closing_anchor, closing_replacement)

precedence_anchor = r"""    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
"""
precedence_replacement = r"""    // Resolve independently structured telephone evidence before a competing
    // range-like observation grammar can advance the protected endpoint.
    // The neutral prefix deliberately excludes both narrative label authority
    // and bounded-context uncertainty, so only intrinsic phone structure wins.
    const intrinsicInterval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      '',
      externalSuffix,
      false
    );
    if (intrinsicInterval) return intrinsicInterval;

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
"""
if library.count(precedence_anchor) != 1:
    raise SystemExit(
        f"phone observation precedence anchor count={library.count(precedence_anchor)}"
    )
library = library.replace(precedence_anchor, precedence_replacement)

validator_anchor = r"""      closingState.sawClosing && !closingState.valid
        ? false
        : indeterminatePhoneContext
"""
validator_replacement = r"""      invalidClosingCandidate ? false : indeterminatePhoneContext
"""
if library.count(validator_anchor) != 1:
    raise SystemExit(
        f"candidate-atomic validator anchor count={library.count(validator_anchor)}"
    )
library = library.replace(validator_anchor, validator_replacement)

test_anchor = r"""const crawlerRuntimeSource = fs.readFileSync(
"""
test_increment = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17 050-12345678',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 050-12345678',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 03-62165111',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: ０９０１２３４５６７８ ２０２６－０８－１７－） ０５０－１２３４５６７８',
    'Phone: [contact omitted] ２０２６－０８－１７－） [contact omitted]'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 050-12345678`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 01 42 68 53 00`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an independently structured phone must outrank a competing range-like observation'
  );
}

for (const tail of [
  '2026-08-17-) 12 34567890',
  '2026-08-17-) 03.6216.12345678',
  '２０２６－０８－１７－） ０３．６２１６．１２３４５６７８',
  '(2026-08-17] 2027-09-18) 12345678',
  '（２０２６－０８－１７］ ２０２７－０９－１８） １２３４５６７８'
]) {
  assert.equal(
    redactContactData(
      `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ${tail}`
    ),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ${tail}`,
    'invalid closing evidence must remain candidate-atomic and may not launder stale wrapper ownership'
  );
}

for (const [input, expected] of [
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03.6216 050-12345678`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) 03.6216 [contact omitted]`
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 (2026-08-17] 2027-09-18) 03-62165111`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] (2026-08-17] 2027-09-18) [contact omitted]`
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 2027-09-18 12345678`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) 2027-09-18 12345678`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'candidate contamination must preserve later observations while admitting only intrinsic telephone structure'
  );
}

const crawlerRuntimeSource = fs.readFileSync(
"""
if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"candidate-atomic focused test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_increment)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
