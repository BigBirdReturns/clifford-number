from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

extension_constant = r"""const PHONE_EXTENSION_SUFFIX_PATTERN = /^\s*[,;:()（）.．。\-–—]*(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?|内線(?:番号)?\s*[:：#＃]?|[#＃])\s*(?:[（(]\s*)?[0-9０-９]/iu;
"""
extension_shortcut = r"""      if (PHONE_EXTENSION_SUFFIX_PATTERN.test(normalizedSuffix)) return groups.length;
"""
if library.count(extension_constant) != 1:
    raise SystemExit(
        f"extension suffix constant anchor count={library.count(extension_constant)}"
    )
if library.count(extension_shortcut) != 1:
    raise SystemExit(
        f"extension suffix shortcut anchor count={library.count(extension_shortcut)}"
    )
library = library.replace(extension_constant, "")
library = library.replace(extension_shortcut, "")

wrapper_constants = r"""const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\(\[\{（［【]/u;
const CLOSING_OBSERVATION_WRAPPER_PATTERN = /[)）]/u;
"""
wrapper_replacement = r"""const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\(\[\{（［【]/u;
const OBSERVATION_WRAPPER_PAIRS = Object.freeze({
  '(': ')',
  '[': ']',
  '{': '}',
  '【': '】'
});
const OBSERVATION_WRAPPER_CLOSERS = new Map(
  Object.entries(OBSERVATION_WRAPPER_PAIRS).map(
    ([opener, closer]) => [closer, opener]
  )
);
"""
if library.count(wrapper_constants) != 1:
    raise SystemExit(
        f"observation wrapper constant anchor count={library.count(wrapper_constants)}"
    )
library = library.replace(wrapper_constants, wrapper_replacement)

function_anchor = r"""function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  let observationEnd = observation.end;
  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const normalizedSeparator = separator.normalize('NFKC');
    if (!/[\s/／.．]/u.test(separator)
        && !OPENING_IDENTIFIER_WRAPPER_PATTERN.test(normalizedSeparator)
        && !CLOSING_OBSERVATION_WRAPPER_PATTERN.test(normalizedSeparator)) {
      continue;
    }

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
      observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      continue;
    }

    const interval = validatedIndependentPhoneInterval(
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}
"""
function_replacement = r"""function trailingObservationOpeners(value) {
  const normalized = value.normalize('NFKC');
  const reversed = [];
  let cursor = normalized.length;

  while (cursor > 0) {
    while (cursor > 0 && /\s/u.test(normalized[cursor - 1])) cursor -= 1;
    if (cursor <= 0) break;
    const opener = normalized[cursor - 1];
    if (!Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, opener)) break;
    reversed.push(opener);
    cursor -= 1;
  }

  return reversed.reverse();
}

function consumeOwnedObservationClosers(separator, openers) {
  const remaining = [...openers];
  let sawClosing = false;

  for (const character of separator.normalize('NFKC')) {
    const expectedOpener = OBSERVATION_WRAPPER_CLOSERS.get(character);
    if (expectedOpener === undefined) continue;
    sawClosing = true;
    if (remaining.at(-1) !== expectedOpener) {
      return { valid: false, sawClosing: true, openers };
    }
    remaining.pop();
  }

  return { valid: true, sawClosing, openers: remaining };
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

  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const closingState = consumeOwnedObservationClosers(
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
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}
"""
if library.count(function_anchor) != 1:
    raise SystemExit(
        f"post-observation function anchor count={library.count(function_anchor)}"
    )
library = library.replace(function_anchor, function_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
test_addition = r"""for (const [observations, laterPhone, extension, expectedExtension] of [
  ['2026-08-17(3.14)', '03-6216-8041', ' ext 55', ' ext [contact omitted]'],
  ['2026-08-17(12:30)', '+81 3 6216 5111', ' #1234', ' #[contact omitted]'],
  ['3.14((2027-09-18))', '(03) 6216 8041', '内線1234', '内線[contact omitted]'],
  ['２０２６－０８－１７（３．１４）', '０３－６２１６－８０４１', '内線１２３４', '内線[contact omitted]']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations} ${laterPhone}${extension}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations} [contact omitted]${expectedExtension}`,
    'extension authority must follow complete observation custody and exact later-phone validation'
  );
}

const extensionYearEndingPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14) +882 13 123 456 2026 #1234`;
assert.equal(
  redactContactData(extensionYearEndingPhone),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14) [contact omitted] #[contact omitted]`,
  'observation custody must not truncate a structurally valid year-ending phone before its extension'
);

for (const [unmatchedTail, expectedTail] of [
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
if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"focused regression insertion anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_addition)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
