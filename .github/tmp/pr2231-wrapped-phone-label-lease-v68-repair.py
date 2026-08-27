from pathlib import Path

LIBRARY = Path("tools/lib/industrial-exhaust.mjs")
TEST = Path("test/industrial-exhaust.test.js")

library = LIBRARY.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")

library_old = """function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const windowStart = Math.max(0, boundedEnd - 48);
  const window = normalizedPrefix.slice(windowStart, boundedEnd);
"""
library_new = """function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const labelEnd = terminalIdentifierLabelEnd(normalizedPrefix, boundedEnd);
  const windowStart = Math.max(0, labelEnd - 48);
  const window = normalizedPrefix.slice(windowStart, labelEnd);
"""

if library.count(library_old) != 1:
    raise SystemExit(
        f"library anchor count mismatch: expected 1, found {library.count(library_old)}"
    )
library = library.replace(library_old, library_new, 1)

test_anchor = """assert.equal(
  redactContactData('Archive 09012345678 2026-08-17 555-1212 555-3434'),
  'Archive [contact omitted] 2026-08-17 555-1212 555-3434',
  'same-candidate recursive label state must not be invented for an unlabelled suffix'
);
"""

test_addition = r"""for (const [wrappedPhoneLabelCase, input, observation, laterDigits] of [
  [
    'nested ascii value wrappers',
    'Phone: ((09012345678)) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'international value wrapper',
    'Phone: (+81 90 1234 5678) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'fullwidth international value wrapper',
    '電話番号：（＋８１ ９０ １２３４ ５６７８） １２：３０：４５ ５５５－１２１２',
    '１２：３０：４５',
    '5551212'
  ],
  [
    'identifier label inside accepted wrappers',
    'Phone: ID: [(+81 90 1234 5678)] 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ]
]) {
  const redacted = redactContactData(input);
  assert.equal(
    (redacted.match(/\[contact omitted\]/gu) ?? []).length,
    2,
    `${wrappedPhoneLabelCase}: the initial and later phone must both redact`
  );
  assert.ok(
    redacted.includes(observation),
    `${wrappedPhoneLabelCase}: the complete intervening observation must remain intact`
  );
  assert.ok(
    !redacted.normalize('NFKC').replace(/\D/gu, '').includes(laterDigits),
    `${wrappedPhoneLabelCase}: the later local phone must not survive redaction`
  );
}

for (const [wrapperRefusalCase, input, laterDigits] of [
  [
    'narrative text between the label and value',
    'Phone: narrative ((09012345678)) 12:30:45 555-1212',
    '5551212'
  ],
  [
    'unlabelled nested wrapper',
    'Archive ((09012345678)) 12:30:45 555-1212',
    '5551212'
  ],
  [
    'URL-embedded phone token',
    'https://example.test/phone: (+81 90 1234 5678) 12:30:45 555-1212',
    '5551212'
  ],
  [
    'fresh narrative conjunction',
    'Phone: ((09012345678)) and 555-1212',
    '5551212'
  ]
]) {
  const redacted = redactContactData(input);
  assert.equal(
    (redacted.match(/\[contact omitted\]/gu) ?? []).length,
    1,
    `${wrapperRefusalCase}: wrapper peeling must not invent a second phone-label lease`
  );
  assert.ok(
    redacted.normalize('NFKC').replace(/\D/gu, '').includes(laterDigits),
    `${wrapperRefusalCase}: the weak later range must remain outside label authority`
  );
}

"""

if test.count(test_anchor) != 1:
    raise SystemExit(
        f"test anchor count mismatch: expected 1, found {test.count(test_anchor)}"
    )
test = test.replace(test_anchor, test_addition + test_anchor, 1)

LIBRARY.write_text(library, encoding="utf-8")
TEST.write_text(test, encoding="utf-8")
