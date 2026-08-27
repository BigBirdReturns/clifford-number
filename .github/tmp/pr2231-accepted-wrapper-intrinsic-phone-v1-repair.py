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
'''  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: leadingObservationEnd
    };
  }
''',
'''  if (leadingObservationMatch && !leadingObservationIsIntrinsicPhone) {
    observation = {
      group: 0,
      end: leadingObservationEnd
    };
  }
''',
    'intrinsic leading phone observation precedence',
)

lib = replace_once(
    lib,
'''function hasFreshCrossCallbackNarrativeBoundary(value) {
  const normalized = value.normalize('NFKC');
  return /[\\r\\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\\.\\s/u.test(normalized);
}

function crossCallbackExplicitPhoneLabelBridge(
''',
'''function hasFreshCrossCallbackNarrativeBoundary(value) {
  const normalized = value.normalize('NFKC');
  return /[\\r\\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\\.\\s/u.test(normalized);
}

function hasOnlyAcceptedCrossCallbackOpeners(value) {
  for (const character of value.normalize('NFKC')) {
    if (/\\s/u.test(character)
        || character === '+'
        || Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, character)) continue;
    return false;
  }
  return true;
}

function crossCallbackExplicitPhoneLabelBridge(
''',
    'accepted cross-callback opener helper',
)

lib = replace_once(
    lib,
'''      if (!/^\\s*$/u.test(trailingGap) || /[\\r\\n]/u.test(trailingGap)) {
        continue;
      }
''',
'''      if (/[\\r\\n]/u.test(trailingGap)
          || !hasOnlyAcceptedCrossCallbackOpeners(trailingGap)) {
        continue;
      }
''',
    'external accepted opener bridge gap',
)

lib = replace_once(
    lib,
'''    if (/[\\r\\n]/u.test(transition)
        || !/^[\\s+＋(（]*$/u.test(transition)) {
      continue;
    }
''',
'''    if (/[\\r\\n]/u.test(transition)
        || !hasOnlyAcceptedCrossCallbackOpeners(transition)) {
      continue;
    }
''',
    'accepted opener bridge transition',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''for (const [name, input, expected] of [
  [
    'inherited label enters an ASCII square wrapper after time',
    'Phone: 09012345678 12:30:45[555-1212]',
    'Phone: [contact omitted] 12:30:45[[contact omitted]]'
  ],
  [
    'inherited label enters a fullwidth square wrapper after time',
    '電話：０９０１２３４５６７８ １２：３０：４５［５５５－１２１２］',
    '電話：[contact omitted] １２：３０：４５［[contact omitted]］'
  ],
  [
    'inherited label enters an ASCII brace wrapper after time',
    'Phone: 09012345678 12:30:45{555-1212}',
    'Phone: [contact omitted] 12:30:45{[contact omitted]}'
  ],
  [
    'inherited label enters a fullwidth brace wrapper after time',
    '電話：０９０１２３４５６７８ １２：３０：４５｛５５５－１２１２｝',
    '電話：[contact omitted] １２：３０：４５｛[contact omitted]｝'
  ],
  [
    'inherited label enters a corner wrapper after time',
    'Phone: 09012345678 12:30:45【555-1212】',
    'Phone: [contact omitted] 12:30:45【[contact omitted]】'
  ],
  [
    'inherited label traverses nested accepted openers',
    'Phone: 09012345678 12:30:45[{555-1212}]',
    'Phone: [contact omitted] 12:30:45[{[contact omitted]}]'
  ],
  [
    'accepted external wrapper retains a plus-prefixed phone',
    'Phone: 09012345678 12:30:45[+1 212 555 1234]',
    'Phone: [contact omitted] 12:30:45[[contact omitted]]'
  ],
  [
    'accepted external wrapper consumes but does not renew the one-use lease',
    'Phone: 09012345678 12:30:45[555-1212] 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45[[contact omitted]] 13:40:50 666-1212'
  ],
  [
    'strong date inside an accepted external wrapper retains observation custody',
    'Phone: 09012345678 12:30:45[2027-09-18]',
    'Phone: [contact omitted] 12:30:45[2027-09-18]'
  ],
  [
    'unit-bearing range inside an accepted external wrapper retains observation custody',
    'Phone: 09012345678 12:30:45[555-1212 people]',
    'Phone: [contact omitted] 12:30:45[555-1212 people]'
  ],
  [
    'fresh sentence refuses external-wrapper inheritance',
    'Phone: 09012345678. 12:30:45[555-1212]',
    'Phone: [contact omitted]. 12:30:45[555-1212]'
  ],
  [
    'unlabelled source refuses external-wrapper inheritance',
    'Archive 09012345678 12:30:45[555-1212]',
    'Archive [contact omitted] 12:30:45[555-1212]'
  ],
  [
    'intervening letter refuses external-wrapper inheritance',
    'Phone: 09012345678 12:30:45A[555-1212]',
    'Phone: [contact omitted] 12:30:45A[555-1212]'
  ],
  [
    'a closer without an accepted opener cannot enter the bridge',
    'Phone: 09012345678 12:30:45]555-1212[',
    'Phone: [contact omitted] 12:30:45]555-1212['
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a date',
    'Phone: 03.6216.8041 2026-08-17',
    'Phone: [contact omitted] 2026-08-17'
  ],
  [
    'fullwidth labelled dotted domestic phone remains intrinsic before a date',
    '電話：０３．６２１６．８０４１ ２０２６－０８－１７',
    '電話：[contact omitted] ２０２６－０８－１７'
  ],
  [
    'labelled dotted mobile phone remains intrinsic before a time',
    'Phone: 090.1234.5678 12:30:45',
    'Phone: [contact omitted] 12:30:45'
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a decimal',
    'Phone: 03.6216.8041 3.1415',
    'Phone: [contact omitted] 3.1415'
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a unit count',
    'Phone: 03.6216.8041 90 people',
    'Phone: [contact omitted] 90 people'
  ],
  [
    'unlabelled dotted domestic phone remains intrinsic before a date',
    '03.6216.8041 2026-08-17',
    '[contact omitted] 2026-08-17'
  ],
  [
    'identifier-labelled dotted value retains identifier custody',
    'ID: 03.6216.8041 2026-08-17',
    'ID: 03.6216.8041 2026-08-17'
  ],
  [
    'leading decimal and date remain observations',
    'Phone: 3.1415 2026-08-17',
    'Phone: 3.1415 2026-08-17'
  ],
  [
    'period-date remains an observation before an intrinsic dotted phone',
    'Phone: 2026.08.17 03.6216.8041',
    'Phone: 2026.08.17 [contact omitted]'
  ],
  [
    'dotted phone retains authority through a date to one later weak local phone',
    'Phone: 03.6216.8041 2026-08-17 555-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'dotted phone extension remains separately redacted',
    'Phone: 03.6216.8041 ext 55',
    'Phone: [contact omitted] ext [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: accepted-wrapper entry and intrinsic-phone precedence must retain separate proof obligations`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(
        f'test insertion anchor count={tests.count(anchor)}, expected=1'
    )
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
