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
'''  const externalWrapperPhoneLabelContext = hasPhoneLabelBeforeOpeningWrappers(
    normalizedExternalPrefix
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: leadingObservationOffset + sourceEndForNormalizedPrefix(
        leadingObservationSource,
        leadingObservationMatch[0].length
      )
    };
  }
''',
'''  const externalWrapperPhoneLabelContext = hasPhoneLabelBeforeOpeningWrappers(
    normalizedExternalPrefix
  );
  const leadingObservationEnd = leadingObservationMatch
    ? leadingObservationOffset + sourceEndForNormalizedPrefix(
        leadingObservationSource,
        leadingObservationMatch[0].length
      )
    : 0;
  const leadingObservationUsesExternalSuffix = Boolean(
    leadingObservationMatch
      && leadingObservationMatch[0].length
        > leadingObservationSource.normalize('NFKC').length
  );
  const leadingIntrinsicPhoneInterval = leadingObservationMatch
      && !leadingObservationUsesExternalSuffix
    ? validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        0,
        externalSuffix
      )
    : null;
  const leadingObservationIsIntrinsicPhone = Boolean(
    leadingIntrinsicPhoneInterval
      && leadingIntrinsicPhoneInterval.start <= groups[0].index
      && leadingIntrinsicPhoneInterval.end >= leadingObservationEnd
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !leadingObservationIsIntrinsicPhone
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: leadingObservationEnd
    };
  }
''',
    'intrinsic dotted phone precedence',
)

lib = replace_once(
    lib,
'''  const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\\p{L}\\p{N}]/u.test(adjacentCharacter)
    || hasPhoneLabelPrefix(prefix);
  const directExplicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);
''',
'''  const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
  const directExplicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);
  const allowInitialGroup = prefixContext.indeterminate
    || directExplicitPhoneLabelContext
    || !/[\\p{L}\\p{N}]/u.test(adjacentCharacter);
''',
    'inherited label initial-group eligibility',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'labelled dotted domestic phone outranks decimal-prefix observation',
    'Phone: 03.6216.8041',
    'Phone: [contact omitted]'
  ],
  [
    'labelled dotted mobile phone outranks decimal-prefix observation',
    'Phone: 090.1234.5678',
    'Phone: [contact omitted]'
  ],
  [
    'fullwidth labelled dotted domestic phone',
    '電話：０３．６２１６．８０４１',
    '電話：[contact omitted]'
  ],
  [
    'fullwidth labelled dotted mobile phone',
    '電話：０９０．１２３４．５６７８',
    '電話：[contact omitted]'
  ],
  [
    'unlabelled dotted domestic phone remains intrinsically eligible',
    '03.6216.8041',
    '[contact omitted]'
  ],
  [
    'labelled decimal observation retains custody',
    'Phone: 3.1415',
    'Phone: 3.1415'
  ],
  [
    'labelled period-date observation retains custody',
    'Phone: 2026.08.17',
    'Phone: 2026.08.17'
  ],
  [
    'labelled unit-bearing phone-shaped observation retains custody',
    'Phone: 03-62165111 people',
    'Phone: 03-62165111 people'
  ],
  [
    'inherited label admits an attached wrapped grouped phone after time',
    'Phone: 09012345678 12:30:45(03-6216-8041)',
    'Phone: [contact omitted] 12:30:45[contact omitted]'
  ],
  [
    'fullwidth inherited label admits attached wrapped grouped phone',
    '電話：０９０１２３４５６７８ １２：３０：４５（０３－６２１６－８０４１）',
    '電話：[contact omitted] １２：３０：４５[contact omitted]'
  ],
  [
    'inherited label admits an attached wrapped weak local phone',
    'Phone: 09012345678 12:30:45(555-1212)',
    'Phone: [contact omitted] 12:30:45[contact omitted]'
  ],
  [
    'bridged attached-wrapper use does not renew the one-use label lease',
    'Phone: 09012345678 12:30:45(03-6216-8041) 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45[contact omitted] 13:40:50 666-1212'
  ],
  [
    'unproved alphanumeric adjacency cannot inherit phone-label authority',
    'A(03-6216-8041)',
    'A(03-6216-8041)'
  ],
  [
    'intervening letter blocks the cross-callback label bridge',
    'Phone: 09012345678 12:30:45A(03-6216-8041)',
    'Phone: [contact omitted] 12:30:45A(03-6216-8041)'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic full-source telephone proof and inherited callback authority must remain separately bounded`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
