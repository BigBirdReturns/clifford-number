from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}, expected=1")
    return text.replace(old, new, 1)


lib_path = Path("tools/lib/industrial-exhaust.mjs")
lib = lib_path.read_text(encoding="utf-8")

lib = replace_once(
    lib,
'''  const externalWrapperPhoneLabelContext = hasPhoneLabelBeforeOpeningWrappers(
    normalizedExternalPrefix
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
'''  const leadingObservationIsWeakBareRange = Boolean(
    leadingObservationMatch
      && isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    leadingObservationMatch && !leadingObservationIsWeakBareRange
  );
''',
    "strong unwrapped observation custody",
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
    if (isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      let weakObservationLastGroup = observation.group;
      while (weakObservationLastGroup + 1 < groups.length
          && groups[weakObservationLastGroup + 1].index
            + groups[weakObservationLastGroup + 1][0].length
            <= observation.end) {
        weakObservationLastGroup += 1;
      }
      const weakObservationInterval = phoneWindowBounds(
        candidate,
        groups,
        observation.group,
        weakObservationLastGroup
      );
      const weakObservationPhoneSource = candidate.slice(
        weakObservationInterval.start,
        weakObservationInterval.end
      );
      const weakObservationIsIntrinsicPhone = Boolean(
        phoneCandidateScore(weakObservationPhoneSource, "", false)
          && intervalHasContextFreeCloserProof(
            candidate,
            weakObservationInterval
          )
      );
      if (explicitPhoneLabelContext || weakObservationIsIntrinsicPhone) {
        demotedWeakObservation = observation;
        observation = {
          group: observation.group,
          end: groups[observation.group].index
        };
      }
    }
  }
''',
    "intrinsic weak-observation demotion custody",
)

lib_path.write_text(lib, encoding="utf-8")

test_path = Path("test/industrial-exhaust.test.js")
tests = test_path.read_text(encoding="utf-8")
anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
block = r'''for (const [name, input, expected] of [
  [
    'unlabelled intrinsic mobile before grouped domestic phone',
    '050-12345678 03-6216-8041',
    '[contact omitted] [contact omitted]'
  ],
  [
    'unlabelled intrinsic two-group domestic before compact mobile',
    '03-62165111 09012345678',
    '[contact omitted] [contact omitted]'
  ],
  [
    'fullwidth intrinsic mobile before grouped domestic phone',
    '０５０－１２３４５６７８ ０３－６２１６－８０４１',
    '[contact omitted] [contact omitted]'
  ],
  [
    'fullwidth two-group domestic before compact mobile',
    '０３－６２１６５１１１ ０９０１２３４５６７８',
    '[contact omitted] [contact omitted]'
  ],
  [
    'strong unwrapped hyphen-date pair under phone label',
    'Phone: 2026-08-17 2027-09-18',
    'Phone: 2026-08-17 2027-09-18'
  ],
  [
    'strong unwrapped slash-date pair under phone label',
    'Phone: 2026/08/17 2027/09/18',
    'Phone: 2026/08/17 2027/09/18'
  ],
  [
    'strong unwrapped period-date pair under phone label',
    'Phone: 2026.08.17 2027.09.18',
    'Phone: 2026.08.17 2027.09.18'
  ],
  [
    'fullwidth strong unwrapped date pair under phone label',
    '電話：２０２６－０８－１７ ２０２７－０９－１８',
    '電話：２０２６－０８－１７ ２０２７－０９－１８'
  ],
  [
    'two strong dates before an intrinsic grouped phone',
    'Phone: 2026-08-17 2027-09-18 03-6216-8041',
    'Phone: 2026-08-17 2027-09-18 [contact omitted]'
  ],
  [
    'two strong decimals before an intrinsic grouped phone',
    'Phone: 3.141592 2.718281 03-6216-8041',
    'Phone: 3.141592 2.718281 [contact omitted]'
  ],
  [
    'strong unit observation before an intrinsic grouped phone',
    'Phone: 10-20 people 03-6216-8041',
    'Phone: 10-20 people [contact omitted]'
  ],
  [
    'existing labelled weak local before intrinsic grouped phone',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'external square wrapper remains observation-owned',
    'Phone: [03-62165111 people] 12:30:45 555-1212',
    'Phone: [03-62165111 people] 12:30:45 555-1212'
  ],
  [
    'bridged callback remains one-use',
    'Phone: 09012345678 12:30:45 555-1212 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 13:40:50 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic telephone authority and strong observation custody must remain disjoint`
  );
}

for (const [name, input, preserved] of [
  [
    'weak non-phone bare range',
    '10-20 03-6216-8041',
    '10-20'
  ],
  [
    'identifier-labelled weak range',
    'ID: 10-20 03-6216-8041',
    'ID: 10-20'
  ]
]) {
  const actual = redactContactData(input);
  assert.ok(
    actual.includes(preserved),
    `${name}: an unproved weak range must remain source-faithful`
  );
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    1,
    `${name}: only the independently proved later phone may redact`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f"test insertion anchor count={tests.count(anchor)}, expected=1"
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding="utf-8")
