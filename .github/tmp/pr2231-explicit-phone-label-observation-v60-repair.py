from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

helper_anchor = r"""function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
"""

helper_replacement = r"""function validatedLabelledRangePhoneInterval(
  candidate,
  groups,
  first,
  nextObservation,
  externalPrefix
) {
  if (!nextObservation || first + 1 >= groups.length) return null;
  const normalizedObservation = nextObservation[0]
    .normalize('NFKC')
    .trim();
  if (!/^\d{1,9}\s*[-–—]\s*\d{1,9}$/u.test(
    normalizedObservation
  )) return null;

  const observationSource = candidate.slice(groups[first].index);
  const observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
    observationSource,
    nextObservation[0].length
  );
  const secondEnd = groups[first + 1].index
    + groups[first + 1][0].length;
  if (secondEnd > observationEnd) return null;
  if (first + 2 < groups.length
      && groups[first + 2].index < observationEnd) return null;

  const bounds = phoneWindowBounds(candidate, groups, first, first + 1);
  if (!phoneCandidateScore(
    candidate.slice(bounds.start, bounds.end),
    `${externalPrefix}${candidate.slice(0, bounds.start)}`,
    true
  )) return null;
  return bounds;
}

function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext,
  establishedPhoneLabelContext = false
) {
"""

if library.count(helper_anchor) != 1:
    raise SystemExit(
        f"post-observation helper anchor count={library.count(helper_anchor)}"
    )
library = library.replace(helper_anchor, helper_replacement)

observation_anchor = r"""    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
"""

observation_replacement = r"""    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    const labelledRangeInterval = establishedPhoneLabelContext
      ? validatedLabelledRangePhoneInterval(
          candidate,
          groups,
          first,
          nextObservation,
          externalPrefix
        )
      : null;
    if (labelledRangeInterval) {
      return {
        ...labelledRangeInterval,
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }
    if (nextObservation) {
"""

if library.count(observation_anchor) != 1:
    raise SystemExit(
        f"observation precedence anchor count={library.count(observation_anchor)}"
    )
library = library.replace(observation_anchor, observation_replacement)

label_anchor = r"""  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const phoneLabelContext = indeterminatePhoneContext
    || hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);
"""

label_replacement = r"""  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const explicitPhoneLabelContext = hasPhoneLabelPrefixNormalized(
    normalizedExternalPrefix
  );
  const phoneLabelContext = indeterminatePhoneContext
    || explicitPhoneLabelContext;
"""

if library.count(label_anchor) != 1:
    raise SystemExit(
        f"explicit phone-label anchor count={library.count(label_anchor)}"
    )
library = library.replace(label_anchor, label_replacement)

call_anchor = r"""          externalPrefix,
          externalSuffix,
          indeterminatePhoneContext
        );
"""

call_replacement = r"""          externalPrefix,
          externalSuffix,
          indeterminatePhoneContext,
          explicitPhoneLabelContext
        );
"""

call_count = library.count(call_anchor)
if call_count != 3:
    raise SystemExit(
        f"post-observation call-site anchor count={call_count}"
    )
library = library.replace(call_anchor, call_replacement)

test_anchor = r"""const numericMetricRss = value => `<?xml version="1.0"?><rss version="2.0"><channel><title>Metric revisions</title>
"""

test_replacement = r"""for (const [input, expected, message] of [
  [
    'Phone: 555-1212',
    'Phone: [contact omitted]',
    'the standalone labelled local telephone control must remain affirmative'
  ],
  [
    'Phone: 09012345678 2026-08-17 555-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]',
    'explicit phone-label authority must survive a complete date observation'
  ],
  [
    'Phone: 09012345678 2026-08-17 (555-1212)',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]',
    'explicit phone-label authority must survive an opening-wrapper local form'
  ],
  [
    'Phone: ０９０１２３４５６７８ ２０２６－０８－１７ ５５５－１２１２',
    'Phone: [contact omitted] ２０２６－０８－１７ [contact omitted]',
    'fullwidth explicit phone-label authority must survive observation custody'
  ],
  [
    'Phone: 09012345678 2026-08-17 10-20 people',
    'Phone: [contact omitted] 2026-08-17 10-20 people',
    'a unit-labelled range must retain complete observation priority'
  ],
  [
    'Phone: 09012345678 2026-08-17 3.14',
    'Phone: [contact omitted] 2026-08-17 3.14',
    'a decimal must retain complete observation priority'
  ],
  [
    'Phone: 09012345678 2026-08-17 12:30',
    'Phone: [contact omitted] 2026-08-17 12:30',
    'a time must retain complete observation priority'
  ],
  [
    'Archive 09012345678 2026-08-17 555-1212',
    'Archive [contact omitted] 2026-08-17 555-1212',
    'an unlabelled one-hyphen range must not acquire telephone authority'
  ],
  [
    'Phone: 09012345678 2026-08-17 050-12345678',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]',
    'an intrinsically complete range-shaped domestic phone must remain redacted'
  ],
  [
    'Phone: 09012345678 2026-08-17 03-62165111',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]',
    'intrinsic telephone precedence must remain independent of label carry'
  ]
]) {
  assert.equal(redactContactData(input), expected, message);
}

const numericMetricRss = value => `<?xml version="1.0"?><rss version="2.0"><channel><title>Metric revisions</title>
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"phone-label observation test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
