from pathlib import Path


def replace_once(text, anchor, replacement, label):
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(anchor, replacement)


library_path = Path("tools/lib/industrial-exhaust.mjs")
library = library_path.read_text()

library = replace_once(
    library,
    r"""function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false
) {
  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const explicitPhoneLabelContext = hasPhoneLabelPrefixNormalized(
    normalizedExternalPrefix
  );
""",
    r"""function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);
""",
    "phone-redaction-state-contract",
)

library = replace_once(
    library,
    r"""function redactAttachedInternationalSuffixRanges(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext = false
) {
""",
    r"""function redactAttachedInternationalSuffixRanges(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext = false,
  explicitPhoneLabelContext = false
) {
""",
    "attached-international-state-contract",
)

library = replace_once(
    library,
    r"""    const suffixRanges = phoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    );
""",
    r"""    const suffixRanges = phoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true,
      indeterminatePhoneContext,
      explicitPhoneLabelContext
    );
""",
    "attached-international-recursive-state",
)

library = replace_once(
    library,
    r"""    return redactAttachedInternationalSuffixRanges(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext
    );
""",
    r"""    return redactAttachedInternationalSuffixRanges(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext,
      explicitPhoneLabelContext
    );
""",
    "attached-international-call-state",
)

library = replace_once(
    library,
    r"""    return phoneRedactionRanges(
      candidate.slice(protectedEnd),
      `${externalPrefix}${candidate.slice(0, protectedEnd)}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    ).map(range => ({
""",
    r"""    return phoneRedactionRanges(
      candidate.slice(protectedEnd),
      `${externalPrefix}${candidate.slice(0, protectedEnd)}`,
      externalSuffix,
      true,
      indeterminatePhoneContext,
      explicitPhoneLabelContext
    ).map(range => ({
""",
    "identifier-recursive-state",
)

identifier_remainder_anchor = r"""                laterPhone.suppressRemainderIndeterminatePhoneContext
                  ? false
                  : indeterminatePhoneContext
              ).map(range => ({
"""
if library.count(identifier_remainder_anchor) != 1:
    raise SystemExit(
        "identifier remainder-state anchor count="
        f"{library.count(identifier_remainder_anchor)}"
    )
library = library.replace(
    identifier_remainder_anchor,
    r"""                laterPhone.suppressRemainderIndeterminatePhoneContext
                  ? false
                  : indeterminatePhoneContext,
                explicitPhoneLabelContext
              ).map(range => ({
""",
)

ordinary_remainder_anchor = r"""            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext
          ).map(range => ({
"""
if library.count(ordinary_remainder_anchor) != 2:
    raise SystemExit(
        "ordinary remainder-state anchor count="
        f"{library.count(ordinary_remainder_anchor)}"
    )
library = library.replace(
    ordinary_remainder_anchor,
    r"""            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext,
            explicitPhoneLabelContext
          ).map(range => ({
""",
)

library = replace_once(
    library,
    "\nfunction trailingObservationGroup(\n",
    r"""
function leadingObservationSourceEndAcrossExternalPrefix(
  normalizedExternalPrefix,
  source,
  externalSuffix = ''
) {
  // PHONE_SPAN_PATTERN intentionally excludes colon and comma. A formatted
  // observation may therefore begin in the prior scanner candidate and finish
  // at this candidate's first digit run. Recover only the bounded numeric tail
  // ending at one of those excluded delimiters; telephone-label authority is
  // still recomputed independently at the new scanner boundary.
  const prefixMatch = normalizedExternalPrefix.match(
    /(?:^|[^\d])((?:\d{1,2}(?::\d{2})?:|\d{1,3}(?:,\d{3})*,))$/u
  );
  const prefixFragment = prefixMatch?.[1];
  if (!prefixFragment) return 0;

  const observationMatch = numericObservationMatch(
    `${prefixFragment}${source.normalize('NFKC')}`,
    externalSuffix
  );
  if (!observationMatch
      || observationMatch[0].length <= prefixFragment.length) return 0;

  return sourceEndForNormalizedPrefix(
    source,
    observationMatch[0].length - prefixFragment.length
  );
}

function trailingObservationGroup(
""",
    "cross-candidate-observation-helper",
)

library = replace_once(
    library,
    r"""  const leadingObservationMatch = numericObservationMatch(candidate, externalSuffix);
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: sourceEndForNormalizedPrefix(candidate, leadingObservationMatch[0].length)
    };
  }
""",
    r"""  // Recursive suffixes retain source-faithful separator whitespace. Classify
  // a local leading observation after that whitespace. If the scanner split a
  // formatted observation at an excluded colon or comma, recover only the
  // source bytes completed by this candidate and keep the scanner boundary's
  // telephone-label reset intact.
  const leadingObservationOffset = Math.max(0, candidate.search(/\S/u));
  const leadingObservationSource = candidate.slice(leadingObservationOffset);
  const leadingObservationMatch = numericObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
  const leadingObservationSourceEnd = leadingObservationMatch
    ? sourceEndForNormalizedPrefix(
        leadingObservationSource,
        leadingObservationMatch[0].length
      )
    : leadingObservationSourceEndAcrossExternalPrefix(
        normalizedExternalPrefix,
        leadingObservationSource,
        externalSuffix
      );
  if (leadingObservationSourceEnd > 0) {
    observation = {
      group: 0,
      end: leadingObservationOffset + leadingObservationSourceEnd
    };
  }
""",
    "leading-observation-source-custody",
)

library_path.write_text(library)

test_path = Path("test/industrial-exhaust.test.js")
tests = test_path.read_text()
test_anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
test_block = r"""for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17 555-1212 2027-09-18 666-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ５５５－１２１２ ２０２７－０９－１８ ６６６－１２１２',
    '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted] ２０２７－０９－１８ [contact omitted]'
  ],
  [
    'Mobile number: 2125551234 2026-08-17 555-1212 90 people 666-1212',
    'Mobile number: [contact omitted] 2026-08-17 [contact omitted] 90 people [contact omitted]'
  ],
  [
    'Phone / GUID / record id: 09012345678 2026-08-17 555-1212 2027-09-18 666-1212',
    'Phone / GUID / record id: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17 555-1212 12:30 666-1212 3.14 777-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] 12:30 [contact omitted] 3.14 [contact omitted]'
  ],
  [
    'Phone: 09012345678 12:30:45 555-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ １２：３０ ５５５－１２１２ ３．１４ ６６６－１２１２',
    '電話番号：[contact omitted] １２：３０ [contact omitted] ３．１４ [contact omitted]'
  ],
  [
    'Phone: 09012345678 1,234 555-1212',
    'Phone: [contact omitted] 1,234 [contact omitted]'
  ],
  [
    'Phone: 09012345678 1,23 555-1212',
    'Phone: [contact omitted] 1,23 [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 555-1212 2027-09-18 666-1212',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted] 2027-09-18 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'candidate-local telephone authority and cross-candidate observation custody must remain independent'
  );
}

for (const [input, expected] of [
  [
    'Archive 09012345678 2026-08-17 555-1212 2027-09-18 666-1212',
    'Archive [contact omitted] 2026-08-17 555-1212 2027-09-18 666-1212'
  ],
  [
    'Archive 12:30 555-1212 3.14 666-1212',
    'Archive 12:30 [contact omitted] 3.14 [contact omitted]'
  ],
  [
    'Archive 1,234 555-1212',
    'Archive 1,234 [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17 555-1212. Archive 2027-09-18 666-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]. Archive 2027-09-18 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'observation recovery must not manufacture telephone-label authority across a scanner or narrative boundary'
  );
}


"""
tests = replace_once(
    tests,
    test_anchor,
    test_block + test_anchor,
    "recursive-and-split-observation-regression-tests",
)
test_path.write_text(tests)
