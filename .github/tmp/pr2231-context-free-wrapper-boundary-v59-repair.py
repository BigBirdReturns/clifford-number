from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

closer_event_anchor = r"""        closerEvents.push({
          index,
          glyph: character,
          owned: openerSurvives === true
        });
"""

closer_event_replacement = r"""        closerEvents.push({
          index,
          sanitizedIndex: sanitizedCharacters.length,
          glyph: character,
          owned: openerSurvives === true
        });
"""

if library.count(closer_event_anchor) != 1:
    raise SystemExit(
        f"closer-event index anchor count={library.count(closer_event_anchor)}"
    )
library = library.replace(closer_event_anchor, closer_event_replacement)

boundary_anchor = r"""  if (!initialRanges.length) return null;

  const boundaries = closerEvents.map(event => ({
    event,
    sanitizedIndex: originalIndexes.indexOf(event.index)
  })).filter(boundary => boundary.sanitizedIndex >= 0)
    .sort((left, right) => left.sanitizedIndex - right.sanitizedIndex);
  const segmentationBoundaries = boundaries.filter(boundary =>
    !initialRanges.some(range =>
      range.start < boundary.sanitizedIndex
        && range.end > boundary.sanitizedIndex
    )
  );
"""

boundary_replacement = r"""  // A preliminary range may use inherited bounded-context authority. Such a
  // range cannot prove that a removed narrative closer is internal to one
  // telephone, because the closer itself terminates only that inherited
  // authority. Re-prove crossing intervals without the overflow flag while
  // retaining explicit labels and intrinsic telephone structure.
  const boundaryProofRanges = indeterminatePhoneContext
    ? phoneRedactionRanges(
        sanitizedCandidate,
        externalPrefix,
        externalSuffix,
        allowInitialGroup,
        false
      )
    : initialRanges;

  const boundaries = closerEvents.map(event => ({
    event,
    sanitizedIndex: event.sanitizedIndex
  })).filter(boundary => boundary.sanitizedIndex >= 0)
    .sort((left, right) => left.sanitizedIndex - right.sanitizedIndex);
  const segmentationBoundaries = boundaries.filter(boundary =>
    !boundaryProofRanges.some(range =>
      range.start < boundary.sanitizedIndex
        && range.end > boundary.sanitizedIndex
    )
  );
"""

if library.count(boundary_anchor) != 1:
    raise SystemExit(
        f"context-free boundary proof anchor count={library.count(boundary_anchor)}"
    )
library = library.replace(boundary_anchor, boundary_replacement)

empty_ranges_anchor = r"""  if (!ranges.length) return null;

  const mappedRanges = ranges.map(range => ({
"""

empty_ranges_replacement = r"""  const handledBySegmentation = segmentationBoundaries.length > 0;
  if (!ranges.length) return handledBySegmentation ? candidate : null;

  const mappedRanges = ranges.map(range => ({
"""

if library.count(empty_ranges_anchor) != 1:
    raise SystemExit(
        f"segmented-empty-result anchor count={library.count(empty_ranges_anchor)}"
    )
library = library.replace(empty_ranges_anchor, empty_ranges_replacement)

final_return_anchor = "  return output === candidate ? null : output;"
final_return_replacement = (
    "  return output === candidate && !handledBySegmentation ? null : output;"
)

if library.count(final_return_anchor) != 1:
    raise SystemExit(
        f"segmented-final-return anchor count={library.count(final_return_anchor)}"
    )
library = library.replace(final_return_anchor, final_return_replacement)

test_anchor = r"""for (const [name, input, expectedRedactions, expectedTail] of [
"""

test_replacement = r"""for (const [name, input, expected] of [
  [
    'split-four-four',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 5678`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 5678`
  ],
  [
    'split-six-two',
    `Archive ${overflowIdentifierLabelChain}(record id: 123456) 78`,
    `Archive ${overflowIdentifierLabelChain}(record id: 123456) 78`
  ],
  [
    'first-seven-tail-one',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234567) 8`,
    `Archive ${overflowIdentifierLabelChain}(record id: [contact omitted]) 8`
  ],
  [
    'fullwidth-split-four-four',
    `Archive ${overflowIdentifierLabelChain}（record id: １２３４） ５６７８`,
    `Archive ${overflowIdentifierLabelChain}（record id: １２３４） ５６７８`
  ],
  [
    'intrinsic-after-short-prefix',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 050-12345678`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) [contact omitted]`
  ],
  [
    'observation-after-short-prefix',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 2027-09-18`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 2027-09-18`
  ],
  [
    'two-intrinsic-segments',
    `Archive ${overflowIdentifierLabelChain}(record id: 050-12345678) 03-6216-8041`,
    `Archive ${overflowIdentifierLabelChain}(record id: [contact omitted]) [contact omitted]`
  ],
  [
    'explicit-phone-label-crossing',
    'Phone: (1234) 5678',
    'Phone: [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a removed closer may be suppressed only by context-free interval evidence`
  );
}

for (const [name, input, expectedRedactions, expectedTail] of [
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"preliminary-range regression-test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
