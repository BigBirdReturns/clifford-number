from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}, expected=1")
    return text.replace(old, new, 1)


lib_path = Path('tools/lib/industrial-exhaust.mjs')
lib = lib_path.read_text(encoding='utf-8')

lib = replace_once(
    lib,
'''  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
'''  const leadingObservationOwnsInitialGroup = Boolean(
    (explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
    'strong unwrapped observation custody',
)

lib = replace_once(
    lib,
'''  let demotedWeakObservation = null;
  if (explicitPhoneLabelContext && observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    if (isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      demotedWeakObservation = observation;
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
''',
'''  let demotedWeakObservation = null;
  if (observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    const weakObservationIsIntrinsicPhone = Boolean(phoneCandidateScore(
      candidate.slice(groups[observation.group].index, observation.end),
      '',
      false
    ));
    if ((explicitPhoneLabelContext || weakObservationIsIntrinsicPhone)
        && isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      demotedWeakObservation = observation;
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
''',
    'intrinsic weak-range telephone demotion',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'intrinsic weak-range domestic phone before a later phone',
    '050-12345678 03-6216-8041',
    '[contact omitted] [contact omitted]'
  ],
  [
    'intrinsic compact range-shaped phone before a later phone',
    '03-62165111 09012345678',
    '[contact omitted] [contact omitted]'
  ],
  [
    'fullwidth intrinsic weak-range phone before a later phone',
    '０５０－１２３４５６７８ ０３－６２１６－８０４１',
    '[contact omitted] [contact omitted]'
  ],
  [
    'labelled strong unwrapped hyphen-date observations',
    'Phone: 2026-08-17 2027-09-18',
    'Phone: 2026-08-17 2027-09-18'
  ],
  [
    'labelled strong unwrapped slash-date observations',
    'Phone: 2026/08/17 2027/09/18',
    'Phone: 2026/08/17 2027/09/18'
  ],
  [
    'labelled strong unwrapped period-date observations',
    'Phone: 2026.08.17 2027.09.18',
    'Phone: 2026.08.17 2027.09.18'
  ],
  [
    'fullwidth labelled strong unwrapped observations',
    '電話：２０２６－０８－１７ ２０２７－０９－１８',
    '電話：２０２６－０８－１７ ２０２７－０９－１８'
  ],
  [
    'identifier-period suffix remains independently classifiable',
    'ID: 12345678.03.6216.8041',
    'ID: 12345678.[contact omitted]'
  ],
  [
    'unlabelled ambiguous weak range remains an observation',
    '10-20 03-6216-8041',
    '10-20 [contact omitted]'
  ],
  [
    'unlabelled local weak range remains unclassified',
    '555-1212 03-6216-8041',
    '555-1212 [contact omitted]'
  ],
  [
    'labelled weak local remains telephone-eligible',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'unwrapped unit-bearing observation retains custody under a label',
    'Phone: 03-62165111 people 03-6216-8041',
    'Phone: 03-62165111 people [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic telephone proof must demote only a weak range while explicit label authority must not consume a complete strong observation`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
