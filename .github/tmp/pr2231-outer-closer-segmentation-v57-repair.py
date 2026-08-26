from pathlib import Path

LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

library = LIBRARY_PATH.read_text()
tests = TEST_PATH.read_text()

outer_anchor = r"""  if (!closerEvents.some(event => event.owned)) return null;
  const sanitizedCandidate = sanitizedCharacters.join('');
  const ranges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext
  );
  if (!ranges.length) return null;

  const mappedRanges = ranges.map(range => ({
    start: range.start < originalIndexes.length
      ? originalIndexes[range.start]
      : candidate.length,
    end: range.end > range.start
      ? originalIndexes[range.end - 1] + 1
      : (range.start < originalIndexes.length ? originalIndexes[range.start] : candidate.length)
  }));
"""

outer_replacement = r"""  if (!closerEvents.some(event => event.owned)) return null;
  const sanitizedCandidate = sanitizedCharacters.join('');
  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext
  );
  if (!initialRanges.length) return null;

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
  let ranges = initialRanges;

  if (segmentationBoundaries.length) {
    ranges = [];
    let segmentStart = 0;
    let renderedPrefix = '';
    let segmentIndeterminatePhoneContext = indeterminatePhoneContext;

    for (let index = 0; index <= segmentationBoundaries.length; index += 1) {
      const boundary = segmentationBoundaries[index] ?? null;
      const segmentEnd = boundary?.sanitizedIndex ?? sanitizedCandidate.length;
      const segment = sanitizedCandidate.slice(segmentStart, segmentEnd);
      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext
      );
      ranges.push(...localRanges.map(range => ({
        ...range,
        start: range.start + segmentStart,
        end: range.end + segmentStart
      })));
      renderedPrefix += renderPhoneRedactionRanges(segment, localRanges);
      if (!boundary) break;

      // A removed closer that is not internal to a proved telephone interval
      // terminates only overflow-derived authority. Crossed closers remain in
      // the current segment so established domestic grouping is unchanged.
      renderedPrefix += boundary.event.glyph;
      segmentStart = segmentEnd + 1;
      segmentIndeterminatePhoneContext = false;
    }
  }
  if (!ranges.length) return null;

  const mappedRanges = ranges.map(range => ({
    ...range,
    start: range.start < originalIndexes.length
      ? originalIndexes[range.start]
      : candidate.length,
    end: range.end > range.start
      ? originalIndexes[range.end - 1] + 1
      : (range.start < originalIndexes.length ? originalIndexes[range.start] : candidate.length)
  }));
"""

if library.count(outer_anchor) != 1:
    raise SystemExit(
        f"outer-closer segmentation anchor count={library.count(outer_anchor)}"
    )
library = library.replace(outer_anchor, outer_replacement)

plus_anchor = r"""  const redactedPhone = redactPhoneSubspans(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      prefixContext.indeterminate
    );
"""

plus_replacement = r"""  const phoneRanges = phoneRedactionRanges(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate
  );
  const redactedPhone = renderPhoneRedactionRanges(
    phoneCandidate,
    phoneRanges
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      false
    );
"""

if library.count(plus_anchor) != 1:
    raise SystemExit(
        f"plus-wrapper state handoff anchor count={library.count(plus_anchor)}"
    )
library = library.replace(plus_anchor, plus_replacement)

test_anchor = r"""const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

test_replacement = r"""for (const [name, input, expectedRedactions, expectedTail] of [
  [
    'ascii-bare-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 12345678`,
    2,
    ' 12345678'
  ],
  [
    'ascii-dotted-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 03.6216.12345678`,
    2,
    ' 03.6216.12345678'
  ],
  [
    'fullwidth-bare-tail',
    `Archive ${overflowIdentifierLabelChain}（record id: ０９０１２３４５６７８ ２０２６－０８－１７－）０３－６２１６－８０４１） １２３４５６７８`,
    2,
    ' １２３４５６７８'
  ],
  [
    'post-wrapper-intrinsic-phone',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 050-12345678`,
    3,
    ' [contact omitted]'
  ],
  [
    'plus-wrapper-bare-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: +81 3 6216 5111 2026-08-17-)03-6216-8041) 12345678`,
    2,
    ' 12345678'
  ]
]) {
  const actual = redactContactData(input);
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    expectedRedactions,
    `${name}: an outer-wrapper boundary must not restore overflow authority`
  );
  assert.ok(
    actual.endsWith(expectedTail),
    `${name}: the post-wrapper suffix must retain only independently proved telephone ranges`
  );
  assert.match(
    actual,
    /2026-08-17-|２０２６－０８－１７－/u,
    `${name}: the complete pre-boundary observation must remain intact`
  );
}

const ownedWrapperObservationTail =
  `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 2027-09-18`;
const ownedWrapperObservationActual = redactContactData(
  ownedWrapperObservationTail
);
assert.equal(
  (ownedWrapperObservationActual.match(/\[contact omitted\]/gu) ?? []).length,
  2,
  'a strong observation after an outer wrapper must not be promoted as contact data'
);
assert.ok(
  ownedWrapperObservationActual.endsWith(' 2027-09-18'),
  'the post-wrapper date must remain byte-for-byte intact'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if tests.count(test_anchor) != 1:
    raise SystemExit(
        f"outer-wrapper regression-test anchor count={tests.count(test_anchor)}"
    )
tests = tests.replace(test_anchor, test_replacement)

LIBRARY_PATH.write_text(library)
TEST_PATH.write_text(tests)
