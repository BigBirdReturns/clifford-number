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
'''function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const windowStart = Math.max(0, boundedEnd - 48);
  const window = normalizedPrefix.slice(windowStart, boundedEnd);
  const match = window.match(PHONE_LABEL_PATTERN);
''',
'''function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const labelEnd = terminalIdentifierLabelEnd(normalizedPrefix, boundedEnd);
  const windowStart = Math.max(0, labelEnd - 48);
  const window = normalizedPrefix.slice(windowStart, labelEnd);
  const match = window.match(PHONE_LABEL_PATTERN);
''',
    'phone-label trailing-wrapper peel',
)

lib_path.write_text(lib, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
anchor = 'const crawlerRuntimeSource = fs.readFileSync(\n'
block = r'''assert.equal(
  redactContactData('Phone: ((09012345678)) 12:30:45 555-1212'),
  'Phone: ([contact omitted]) 12:30:45 [contact omitted]',
  'a nested value wrapper must not terminate phone-label authority before a cross-callback time bridge'
);

for (const [nestedLabelWrapperCase, input, observation, firstDigits, laterDigits] of [
  [
    'plus-prefixed phone',
    'Phone: (+81 90 1234 5678) 12:30:45 555-1212',
    '12:30:45',
    '819012345678',
    '5551212'
  ],
  [
    'fullwidth plus-prefixed phone',
    '電話：（＋８１ ９０ １２３４ ５６７８） １２：３０：４５ ５５５－１２１２',
    '12:30:45',
    '819012345678',
    '5551212'
  ],
  [
    'unit observation',
    'Phone: ((09012345678)) 90 people 555-1212',
    '90 people',
    '09012345678',
    '5551212'
  ]
]) {
  const actual = redactContactData(input);
  const normalizedActual = actual.normalize('NFKC');
  assert.ok(
    normalizedActual.includes(observation),
    `${nestedLabelWrapperCase}: the complete observation must remain source-faithful`
  );
  assert.ok(
    !normalizedActual.replace(/\D/gu, '').includes(firstDigits),
    `${nestedLabelWrapperCase}: the first labelled phone must not survive`
  );
  assert.ok(
    !normalizedActual.replace(/\D/gu, '').includes(laterDigits),
    `${nestedLabelWrapperCase}: the later phone must inherit only the proved label lease`
  );
  assert.ok(
    (actual.match(/\[contact omitted\]/gu) ?? []).length >= 2,
    `${nestedLabelWrapperCase}: both governed phones must redact`
  );
}

for (const [nestedLabelWrapperRefusal, input, observation, laterDigits] of [
  [
    'closed square wrapper boundary',
    'Phone: [((09012345678))] 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'URL-embedded phone word',
    'https://example.test/phone: ((09012345678)) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'unlabelled nested wrapper',
    'Archive ((09012345678)) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'fresh sentence after nested wrapper',
    'Phone: ((09012345678)). 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ]
]) {
  const actual = redactContactData(input);
  const normalizedActual = actual.normalize('NFKC');
  assert.ok(
    normalizedActual.includes(observation),
    `${nestedLabelWrapperRefusal}: the observation must remain intact`
  );
  assert.ok(
    normalizedActual.replace(/\D/gu, '').includes(laterDigits),
    `${nestedLabelWrapperRefusal}: refused authority must leave the later local number unchanged`
  );
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    1,
    `${nestedLabelWrapperRefusal}: refusal must redact only the intrinsically valid first phone`
  );
}

'''
if tests.count(anchor) != 1:
    raise SystemExit(f'test insertion anchor count={tests.count(anchor)}, expected=1')
test_path.write_text(tests.replace(anchor, block + anchor, 1), encoding='utf-8')
