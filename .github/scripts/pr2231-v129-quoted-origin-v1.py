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

text = replace_once(text, r'''const LEGACY_DIRECT_URL_ORIGIN_PATTERN = /(?:^|[<([{=:;,|])((?:https?:\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*|\/\/[^\s]*)/iu;
''', r'''const LEGACY_DIRECT_URL_ORIGIN_PATTERN = /(?:^|[<([{=:;,|])(?:["'“”‘’]+)?((?:https?:\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*|\/\/[^\s]*)/iu;
''', 'quoted legacy URL-origin capture')

text = replace_once(text, r'''const LEGACY_URL_ORIGIN_DELIMITER_PATTERN = /[<([{=:;,|]/u;
const URL_TOKEN_LEADING_WRAPPER_PATTERN = /[\p{P}\p{S}]/u;

function malformedSchemeLikeUrlOrigin(value) {
''', r'''const LEGACY_URL_ORIGIN_DELIMITER_PATTERN = /[<([{=:;,|]/u;
const LEGACY_URL_ORIGIN_QUOTE_WRAPPER_PATTERN = /["'“”‘’]/u;
const URL_TOKEN_LEADING_WRAPPER_PATTERN = /[\p{P}\p{S}]/u;

function approvedLegacySchemeBoundary(value, start) {
  let cursor = start;
  while (cursor > 0) {
    const prior = previousCodePoint(value, cursor);
    if (!LEGACY_URL_ORIGIN_QUOTE_WRAPPER_PATTERN.test(prior)) break;
    cursor -= prior.length;
  }
  return cursor === 0 || LEGACY_URL_ORIGIN_DELIMITER_PATTERN.test(
    previousCodePoint(value, cursor)
  );
}

function malformedSchemeLikeUrlOrigin(value) {
''', 'quoted approved-scheme boundary helper')

text = replace_once(text, '''    const prior = previousCodePoint(value, start);
    const approvedLegacyScheme = /^https?$/iu.test(origin)
      && (start === 0 || LEGACY_URL_ORIGIN_DELIMITER_PATTERN.test(prior));
''', '''    const approvedLegacyScheme = /^https?$/iu.test(origin)
      && approvedLegacySchemeBoundary(value, start);
''', 'quoted approved-scheme boundary use')

library.write_text(text)

tests = test.read_text()
marker = 'PR2231 V129 quoted legacy URL-origin boundary'
if marker in tests:
    raise SystemExit('quoted-origin regression block already present')
tests += r'''

// PR2231 V129 quoted legacy URL-origin boundary
for (const [name, input, expected] of [
  [
    'curly-quoted HTTPS origin after a source delimiter retains suffix custody',
    'Phone: 03-6216-8041=“https://example.test/03-6216-8041',
    'Phone: [contact omitted]=“https://example.test/03-6216-8041'
  ],
  [
    'single-quoted HTTPS origin after a source delimiter retains suffix custody',
    "Phone: 03-6216-8041='https://example.test/03-6216-8041",
    "Phone: [contact omitted]='https://example.test/03-6216-8041"
  ],
  [
    'quoted unsupported scheme grants no numeric-path custody',
    'Phone: 03-6216-8041="mailto://example.test/03-6216-8041',
    'Phone: [contact omitted]="mailto://example.test/[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: quote wrappers may carry an approved HTTP origin only from an established source delimiter`
  );
}
'''
test.write_text(tests)
