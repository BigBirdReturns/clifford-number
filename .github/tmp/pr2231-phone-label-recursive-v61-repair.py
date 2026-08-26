from pathlib import Path
import re

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

signature_anchor = r"""function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false
) {
"""
signature_replacement = r"""function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
"""
if library.count(signature_anchor) != 1:
    raise SystemExit(
        f"phoneRedactionRanges signature anchor count={library.count(signature_anchor)}"
    )
library = library.replace(signature_anchor, signature_replacement)

context_anchor = r"""  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const explicitPhoneLabelContext = hasPhoneLabelPrefixNormalized(
    normalizedExternalPrefix
  );
"""
context_replacement = r"""  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  // Explicit telephone-label authority is candidate state, not reconstructed
  // text. Preserve it only through recursive suffixes that remain inside the
  // same scanner candidate; top-level and segmented calls still prove their
  // own label authority from their retained prefixes.
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);
"""
if library.count(context_anchor) != 1:
    raise SystemExit(
        f"explicit phone-label context anchor count={library.count(context_anchor)}"
    )
library = library.replace(context_anchor, context_replacement)

recursive_pattern = re.compile(
    r"(?P<argument_indent>[ \t]+)"
    r"laterPhone\.suppressRemainderIndeterminatePhoneContext\n"
    r"(?P<conditional_indent>[ \t]+)\? false\n"
    r"(?P=conditional_indent): indeterminatePhoneContext"
)

def carry_explicit_label(match):
    return (
        match.group(0)
        + ",\n"
        + match.group("argument_indent")
        + "explicitPhoneLabelContext"
    )

library, recursive_count = recursive_pattern.subn(carry_explicit_label, library)
if recursive_count != 3:
    raise SystemExit(
        f"same-candidate explicit-label recursion count={recursive_count}"
    )

test_anchor = "const literalTruncationSentinel = '\\\\u0000phone-label-context-truncated\\\\u0000 GUID: 09012345678';"
test_increment = r"""for (const [name, recursiveLabelledPhones, expected] of [
  [
    'two-later-local-phones',
    'Phone: 09012345678 2026-08-17 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'three-later-local-phones',
    'Phone: 09012345678 2026-08-17 555-1212 555-3434 555-5656',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted] [contact omitted]'
  ],
  [
    'wrapped-initial-phone',
    'Phone: (09012345678) 2026-08-17 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'repeated-identifier-label-chain',
    'Phone / GUID / record id: 09012345678 2026-08-17 555-1212 555-3434',
    'Phone / GUID / record id: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'fullwidth-recursive-locals',
    '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ５５５－１２１２ ５５５－３４３４',
    '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted] [contact omitted]'
  ],
  [
    'second-observation-before-second-local',
    'Phone: 09012345678 2026-08-17 555-1212 2027-09-18 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]'
  ],
  [
    'invalid-closer-suppression-and-label-state',
    'Phone: 09012345678 2026-08-17-) 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted] [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(recursiveLabelledPhones),
    expected,
    `${name}: explicit phone-label authority must survive every same-candidate suffix recursion`
  );
}

const unlabelledRecursiveLocals =
  'Archive 09012345678 2026-08-17 555-1212 2027-09-18 555-3434';
assert.equal(
  redactContactData(unlabelledRecursiveLocals),
  'Archive [contact omitted] 2026-08-17 555-1212 2027-09-18 555-3434',
  'recursive suffixes must not invent explicit phone-label authority'
);

"""
if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"recursive phone-label test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, f"{test_increment}{test_anchor}")

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
