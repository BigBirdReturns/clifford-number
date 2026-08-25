from pathlib import Path

library_path = Path('tools/lib/industrial-exhaust.mjs')
library = library_path.read_text(encoding='utf-8')

old_function = r'''function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observation.end) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    if (!/[\s/／.．]/u.test(separator)) continue;
    const interval = validatedIndependentPhoneInterval(
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}
'''

new_function = r'''function completeObservationEndAtGroup(
  candidate,
  groups,
  first,
  externalSuffix
) {
  if (first < 0 || first >= groups.length) return null;
  const start = groups[first].index;
  const observationSource = candidate.slice(start);
  const observationMatch = numericObservationMatch(observationSource, externalSuffix);
  if (!observationMatch) return null;
  return start + sourceEndForNormalizedPrefix(
    observationSource,
    observationMatch[0].length
  );
}

function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  let protectedObservationEnd = observation.end;
  for (let first = observation.group; first < groups.length;) {
    if (groups[first].index < protectedObservationEnd) {
      first += 1;
      continue;
    }

    const nextObservationEnd = completeObservationEndAtGroup(
      candidate,
      groups,
      first,
      externalSuffix
    );
    if (nextObservationEnd !== null) {
      protectedObservationEnd = Math.max(
        protectedObservationEnd,
        nextObservationEnd
      );
      first += 1;
      continue;
    }

    const previousEnd = first === 0
      ? 0
      : groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    if (/[\s/／.．]/u.test(separator)) {
      const interval = validatedIndependentPhoneInterval(
        candidate,
        groups,
        first,
        externalPrefix,
        externalSuffix,
        indeterminatePhoneContext
      );
      if (interval) return interval;
    }
    first += 1;
  }
  return null;
}
'''

if library.count(old_function) != 1:
    raise SystemExit(f'independent-phone function anchor count={library.count(old_function)}')
library = library.replace(old_function, new_function)

old_leading = r'''  const leadingObservationMatch = numericObservationMatch(candidate, externalSuffix);
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: sourceEndForNormalizedPrefix(candidate, leadingObservationMatch[0].length)
    };
  }
'''
new_leading = r'''  const leadingObservationEnd = completeObservationEndAtGroup(
    candidate,
    groups,
    0,
    externalSuffix
  );
  if (leadingObservationEnd !== null) {
    observation = { group: 0, end: leadingObservationEnd };
  }
'''
if library.count(old_leading) != 1:
    raise SystemExit(f'leading-observation anchor count={library.count(old_leading)}')
library = library.replace(old_leading, new_leading)
library_path.write_text(library, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
sentinel = 'const consecutiveObservationTraversalCases = ['
if sentinel in tests:
    raise SystemExit('consecutive-observation regressions already present')

tests += r'''

const consecutiveObservationTraversalCases = [
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 2027-09-18 03-6216-8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 2027-09-18 [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 3.14 1 212 555 1234`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 3.14 [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 90 people 12:30 +81 3 6216 5111`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 90 people 12:30 [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: ０９０１２３４５６７８ ２０２６－０８－１７ ２０２７－０９－１８ ０３－６２１６－８０４１`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７ ２０２７－０９－１８ [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 90 dollars 25 percent +44 20 7123 4567`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 90 dollars 25 percent [contact omitted]`
  ]
];
for (const [input, expected] of consecutiveObservationTraversalCases) {
  assert.equal(
    redactContactData(input),
    expected,
    'every complete observation traversed before a later phone must remain outside redaction'
  );
}

for (const terminalConsecutiveObservations of [
  '2026-08-17 2027-09-18',
  '90 people 12:30',
  '3.14 25 percent',
  '２０２６－０８－１７ ２０２７－０９－１８'
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${terminalConsecutiveObservations}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${terminalConsecutiveObservations}`,
    'terminal consecutive observations must remain byte-for-byte intact'
  );
}

for (const [input, expected] of [
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 03-6216-8041 2027-09-18 1 212 555 1234`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: ０９０１２３４５６７８ ２０２６－０８－１７ ０３－６２１６－８０４１ ２０２７－０９－１８ ＋８１ ３ ６２１６ ５１１１`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７ [contact omitted] ２０２７－０９－１８ [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'sequential observation and phone transitions must retain each exact interval'
  );
}
'''

test_path.write_text(tests, encoding='utf-8')
