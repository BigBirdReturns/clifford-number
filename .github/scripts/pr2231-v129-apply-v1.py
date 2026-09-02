from pathlib import Path
import sys

library = Path(sys.argv[1])
test = Path(sys.argv[2])
text = library.read_text()

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return source.replace(old, new, 1)

text = replace_once(text, r'''const LEGACY_UNSUPPORTED_URL_SCHEME_PATTERN = /(?:^|[<([{=:;,|])([\p{L}][\p{L}\p{N}+.-]*):\/\//iu;
const URL_TOKEN_LEADING_WRAPPER_PATTERN = /[\p{P}\p{S}]/u;
''', r'''const LEGACY_UNSUPPORTED_URL_SCHEME_PATTERN = /(?:^|[<([{=:;,|])([\p{L}][\p{L}\p{N}+.-]*):\/\//iu;
const LEGACY_URL_ORIGIN_DELIMITER_PATTERN = /[<([{=:;,|]/u;
const URL_TOKEN_LEADING_WRAPPER_PATTERN = /[\p{P}\p{S}]/u;

function malformedSchemeLikeUrlOrigin(value) {
  for (const match of value.matchAll(
    /([\p{L}][\p{L}\p{N}+.-]*|(?:\d{1,3}\.){3}\d{1,3}):\/\//giu
  )) {
    const origin = match[1];
    const start = match.index;
    const prior = previousCodePoint(value, start);
    const approvedLegacyScheme = /^https?$/iu.test(origin)
      && (start === 0 || LEGACY_URL_ORIGIN_DELIMITER_PATTERN.test(prior));
    if (approvedLegacyScheme) continue;
    return start;
  }
  return -1;
}
''', 'malformed scheme-like origin classifier')

text = replace_once(text, '''  if (leadingScheme) {
    const approved = /^https?$/iu.test(leadingScheme[1]);
    return {
      normalized,
      originStart: leadingOriginStart,
      approved,
      unsupported: !approved
    };
  }
  if (DIRECT_URL_ABSOLUTE_OR_HOST_PATTERN.test(leadingOrigin)
''', '''  if (leadingScheme) {
    const approved = /^https?$/iu.test(leadingScheme[1]);
    return {
      normalized,
      originStart: leadingOriginStart,
      approved,
      unsupported: !approved
    };
  }
  const malformedSchemeLikeOrigin = malformedSchemeLikeUrlOrigin(normalized);
  if (malformedSchemeLikeOrigin >= 0) {
    return {
      normalized,
      originStart: malformedSchemeLikeOrigin,
      approved: false,
      unsupported: true
    };
  }
  if (DIRECT_URL_ABSOLUTE_OR_HOST_PATTERN.test(leadingOrigin)
''', 'malformed scheme-like origin precedence')

text = replace_once(text, '''function sourceEndForNormalizedPrefix(source, normalizedLength) {
  let sourceEnd = 0;
  let normalizedEnd = 0;
  for (const character of source) {
    if (normalizedEnd >= normalizedLength) break;
    sourceEnd += character.length;
    normalizedEnd += character.normalize('NFKC').length;
  }
  return sourceEnd;
}
''', '''const NFKC_SOURCE_SEGMENTER = new Intl.Segmenter(
  'und',
  { granularity: 'grapheme' }
);

function sourceEndForNormalizedPrefix(source, normalizedLength) {
  let sourceEnd = 0;
  let normalizedEnd = 0;
  for (const { segment } of NFKC_SOURCE_SEGMENTER.segment(source)) {
    if (normalizedEnd >= normalizedLength) break;
    sourceEnd += segment.length;
    normalizedEnd += segment.normalize('NFKC').length;
  }
  return sourceEnd;
}
''', 'grapheme-segment NFKC source map')

library.write_text(text)

tests = test.read_text()
append = r'''

// PR2231 V129 malformed-scheme and whole-segment NFKC origin custody
for (const [name, input, expected] of [
  [
    'approved-looking interior scheme cannot be parsed as a bare-host TLD',
    'Phone: 03-6216-8041.https://example.test/03-6216-8041',
    'Phone: [contact omitted].https://example.test/[contact omitted]'
  ],
  [
    'unsupported interior scheme cannot be parsed as a bare-host TLD',
    'Phone: 03-6216-8041.mailto://example.test/03-6216-8041',
    'Phone: [contact omitted].mailto://example.test/[contact omitted]'
  ],
  [
    'bare-domain port custody remains approved',
    'example.test:443/03-6216-8041',
    'example.test:443/03-6216-8041'
  ],
  [
    'IPv4 port custody remains approved',
    '192.0.2.1:443/03-6216-8041',
    '192.0.2.1:443/03-6216-8041'
  ],
  [
    'bare-domain pseudo-scheme cannot retain a numeric path',
    'example.test://03-6216-8041',
    'example.test://[contact omitted]'
  ],
  [
    'IPv4 pseudo-scheme cannot retain a numeric path',
    '192.0.2.1://03-6216-8041',
    '192.0.2.1://[contact omitted]'
  ],
  [
    'candidate-relative HTTPS origin remains approved after an equals boundary',
    'Phone: 03-6216-8041=https://example.test/03-6216-8041',
    'Phone: [contact omitted]=https://example.test/03-6216-8041'
  ],
  [
    'candidate-relative scheme-relative origin remains approved after a semicolon boundary',
    'Phone: 03-6216-8041;//03-6216-8041',
    'Phone: [contact omitted];//03-6216-8041'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: only an approved URL origin or numeric host port may acquire URL custody`
  );
}

for (const [name, contraction] of [
  ['halfwidth katakana voiced pair', 'ｶﾞ'],
  ['Kannada vowel-sign pair', '\u0CC6\u0CD5']
]) {
  const prefix = contraction.repeat(15);
  const input = `${prefix}:03-6216-8041=https://example.test/03-6216-8041`;
  assert.equal(
    redactContactData(input),
    `${prefix}:[contact omitted]=https://example.test/03-6216-8041`,
    `${name}: grapheme-segment NFKC mapping must not move a later URL origin backward across a phone`
  );
}
'''
if 'PR2231 V129 malformed-scheme and whole-segment NFKC origin custody' in tests:
    raise SystemExit('V129 tests already present')
test.write_text(tests + append)
