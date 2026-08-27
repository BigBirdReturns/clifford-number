#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

LIB_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


lib = LIB_PATH.read_text(encoding="utf-8")

helpers_start = lib.index("function rangeOverlapsAny(")
helpers_end = lib.index("function crossCallbackExplicitPhoneLabelBridge(", helpers_start)

new_helpers = r'''function rangeOverlapsAny(range, ranges) {
  return ranges.some(existing =>
    range.start < existing.end && range.end > existing.start
  );
}

const MAX_CROSS_CALLBACK_OBSERVATIONS = 4096;
const MAX_CROSS_CALLBACK_OBSERVATION_CHARS = 256;

function crossCallbackObservationSpans(
  lease,
  groups,
  minimumStart,
  sourceLimit,
  input
) {
  const spans = [];
  let groupIndex = 0;
  while (groupIndex < groups.length
      && groups[groupIndex].index < minimumStart) {
    groupIndex += 1;
  }

  while (groupIndex < groups.length) {
    const group = groups[groupIndex];
    const absoluteStart = lease.offset + group.index;
    const source = input.slice(
      absoluteStart,
      Math.min(
        sourceLimit,
        absoluteStart + MAX_CROSS_CALLBACK_OBSERVATION_CHARS
      )
    );
    const observation = crossCallbackObservationMatch(source);
    if (!observation || isWeakBareRangeObservation(source)) {
      groupIndex += 1;
      continue;
    }

    const absoluteEnd = absoluteStart + sourceEndForNormalizedPrefix(
      source,
      observation[0].length
    );
    if (absoluteEnd <= absoluteStart) {
      groupIndex += 1;
      continue;
    }

    spans.push({
      start: group.index,
      end: absoluteEnd - lease.offset,
      absoluteStart,
      absoluteEnd
    });
    if (spans.length > MAX_CROSS_CALLBACK_OBSERVATIONS) return null;

    while (groupIndex < groups.length
        && lease.offset + groups[groupIndex].index < absoluteEnd) {
      groupIndex += 1;
    }
  }

  return spans;
}

function firstCrossCallbackNarrativeBoundary(
  input,
  start,
  end,
  observationSpans
) {
  let spanIndex = 0;
  for (let index = start; index < end; index += 1) {
    while (spanIndex < observationSpans.length
        && observationSpans[spanIndex].absoluteEnd <= index) {
      spanIndex += 1;
    }
    const activeObservation = observationSpans[spanIndex] ?? null;
    const insideObservation = activeObservation
      && activeObservation.absoluteStart <= index
      && index < activeObservation.absoluteEnd;
    const normalized = input[index].normalize('NFKC');

    if (/[\r\n!?。！？]/u.test(normalized)) return index;
    if (normalized !== '.' || insideObservation) continue;

    let cursor = index + 1;
    while (cursor < end
        && /["'”’»›」』〟＂]/u.test(input[cursor].normalize('NFKC'))) {
      cursor += 1;
    }
    if (cursor >= end || /\s/u.test(input[cursor])) return index;
  }

  return null;
}
'''

lib = lib[:helpers_start] + new_helpers + "\n\n" + lib[helpers_end:]

bridge_start = lib.index("function crossCallbackExplicitPhoneLabelBridge(")
bridge_end = lib.index("function createCrossCallbackExplicitPhoneLabelLease(", bridge_start)

new_bridge = r'''function crossCallbackExplicitPhoneLabelBridge(
  lease,
  candidate,
  offset,
  input
) {
  if (!lease || offset < lease.end || offset - lease.end > 64) return null;
  if (/[\r\n]/u.test(input.slice(lease.end, offset))) return null;

  const lastRedactedEnd = Math.max(...lease.ranges.map(range => range.end));
  const groups = [...lease.candidate.matchAll(DIGIT_RUN_PATTERN)];
  const sourceLimit = Math.min(
    input.length,
    offset + candidate.length + 64
  );
  const observationSpans = crossCallbackObservationSpans(
    lease,
    groups,
    lastRedactedEnd,
    sourceLimit,
    input
  );
  if (!observationSpans?.length) return null;

  const firstNarrativeBoundary = firstCrossCallbackNarrativeBoundary(
    input,
    lease.offset + lastRedactedEnd,
    sourceLimit,
    observationSpans
  );

  for (const observationSpan of observationSpans) {
    if (firstNarrativeBoundary != null
        && firstNarrativeBoundary < observationSpan.absoluteStart) {
      break;
    }

    const localObservationEnd = Math.min(
      lease.candidate.length,
      observationSpan.end
    );
    if (rangeOverlapsAny({
      start: observationSpan.start,
      end: Math.max(observationSpan.start + 1, localObservationEnd)
    }, lease.ranges)) continue;

    const absoluteObservationEnd = observationSpan.absoluteEnd;
    if (absoluteObservationEnd <= lease.end
        || absoluteObservationEnd > offset + candidate.length) {
      continue;
    }

    const observationSource = input.slice(
      observationSpan.absoluteStart,
      absoluteObservationEnd
    );
    if (/[\r\n]/u.test(observationSource)) continue;

    let currentObservationEnd = absoluteObservationEnd - offset;
    if (currentObservationEnd < 0) {
      const trailingGap = input.slice(absoluteObservationEnd, offset);
      if (!/^\s*$/u.test(trailingGap) || /[\r\n]/u.test(trailingGap)) {
        continue;
      }
      currentObservationEnd = 0;
    }

    const remainder = candidate.slice(currentObservationEnd);
    const firstDigit = remainder.search(/[0-9０-９]/u);
    if (firstDigit < 0) continue;
    const absoluteFirstDigit = offset + currentObservationEnd + firstDigit;
    const transition = input.slice(
      absoluteObservationEnd,
      absoluteFirstDigit
    );
    if (/[\r\n]/u.test(transition)
        || !/^[\s+＋(（]*$/u.test(transition)) {
      continue;
    }

    return {
      currentObservationEnd,
      observationStart: observationSpan.absoluteStart,
      observationEnd: absoluteObservationEnd
    };
  }

  return null;
}
'''

lib = lib[:bridge_start] + new_bridge + "\n\n" + lib[bridge_end:]

old_phone_ranges_signature = r'''function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {'''
new_phone_ranges_signature = r'''function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  suppressExternalPhoneLabelContext = false
) {'''
lib = replace_once(
    lib,
    old_phone_ranges_signature,
    new_phone_ranges_signature,
    "phoneRedactionRanges signature",
)

old_explicit_context = r'''  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefixNormalized(
      normalizedExternalPrefix
    );'''
new_explicit_context = r'''  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || (!suppressExternalPhoneLabelContext
      && hasPhoneLabelPrefixNormalized(
        normalizedExternalPrefix
      ));'''
lib = replace_once(
    lib,
    old_explicit_context,
    new_explicit_context,
    "explicit phone-label context",
)

outer_start = lib.index("function redactPhoneCandidateAcrossOwnedOuterClosers(")
outer_end = lib.index("function stripUnownedLeadingPhoneClosers(", outer_start)
outer = lib[outer_start:outer_end]

old_outer_signature = r'''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  returnMetadata = false
) {'''
new_outer_signature = r'''function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  suppressExternalPhoneLabelContext = false,
  returnMetadata = false
) {'''
outer = replace_once(
    outer,
    old_outer_signature,
    new_outer_signature,
    "outer-closer signature",
)

outer = replace_once(
    outer,
    r'''    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  );''',
    r'''    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext,
    suppressExternalPhoneLabelContext
  );''',
    "outer initial ranges",
)
outer = replace_once(
    outer,
    r'''        false,
        inheritedExplicitPhoneLabelContext
      )''',
    r'''        false,
        inheritedExplicitPhoneLabelContext,
        suppressExternalPhoneLabelContext
      )''',
    "outer boundary proof ranges",
)
outer = replace_once(
    outer,
    r'''        segmentIndeterminatePhoneContext,
        segmentStart === 0 ? inheritedExplicitPhoneLabelContext : false
      );''',
    r'''        segmentIndeterminatePhoneContext,
        segmentStart === 0 ? inheritedExplicitPhoneLabelContext : false,
        segmentStart === 0 ? suppressExternalPhoneLabelContext : false
      );''',
    "outer segmented ranges",
)

lib = lib[:outer_start] + outer + lib[outer_end:]

span_start = lib.index("function redactPhoneSpanCandidate(")

candidate_helper = r'''function candidateEntryObservationOwnsPhoneLabel(
  candidate,
  externalSuffix
) {
  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return false;

  const source = candidate.slice(groups[0].index);
  const observation = numericObservationMatch(source, externalSuffix);
  if (!observation || isWeakBareRangeObservation(source, externalSuffix)) {
    return false;
  }

  return !validatedIntrinsicPhoneInterval(
    candidate,
    groups,
    0,
    externalSuffix
  );
}

'''

lib = lib[:span_start] + candidate_helper + lib[span_start:]
span_start = lib.index("function redactPhoneSpanCandidate(")
span_end = lib.index("export function redactContactData(", span_start)
span = lib[span_start:span_end]

old_context_block = r'''  const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || hasPhoneLabelPrefix(prefix);
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);'''
new_context_block = r'''  const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
  const entryObservationOwnsPhoneLabel = candidateEntryObservationOwnsPhoneLabel(
    candidate,
    suffix
  );
  const locallyEstablishedExplicitPhoneLabelContext = hasPhoneLabelPrefix(prefix)
    && !entryObservationOwnsPhoneLabel;
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || locallyEstablishedExplicitPhoneLabelContext;
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || locallyEstablishedExplicitPhoneLabelContext;'''
span = replace_once(
    span,
    old_context_block,
    new_context_block,
    "candidate entry label context",
)

span = replace_once(
    span,
    r'''      prefixContext.indeterminate,
      inheritedExplicitPhoneLabelContext,
      true
    );''',
    r'''      prefixContext.indeterminate,
      inheritedExplicitPhoneLabelContext,
      entryObservationOwnsPhoneLabel,
      true
    );''',
    "outer-closer invocation",
)

span = replace_once(
    span,
    r'''    prefixContext.indeterminate,
    inheritedExplicitPhoneLabelContext
  );''',
    r'''    prefixContext.indeterminate,
    inheritedExplicitPhoneLabelContext,
    entryObservationOwnsPhoneLabel
  );''',
    "terminal range invocation",
)

span = replace_once(
    span,
    r'''        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext
      };''',
    r'''        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext,
        locallyEstablishedExplicitPhoneLabelContext
      };''',
    "owned-wrapper metadata",
)
span = replace_once(
    span,
    r'''        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext
      };''',
    r'''        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext,
        locallyEstablishedExplicitPhoneLabelContext
      };''',
    "outer-closer metadata",
)
span = replace_once(
    span,
    r'''    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext
  };''',
    r'''    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext,
    locallyEstablishedExplicitPhoneLabelContext
  };''',
    "ordinary metadata",
)

lib = lib[:span_start] + span + lib[span_end:]

lib = replace_once(
    lib,
    r'''          result.explicitPhoneLabelContext
        );''',
    r'''          result.locallyEstablishedExplicitPhoneLabelContext
        );''',
    "one-use lease creation",
)

LIB_PATH.write_text(lib, encoding="utf-8")

test = TEST_PATH.read_text(encoding="utf-8")
test_anchor = "const crawlerRuntimeSource = fs.readFileSync(\n"
if test.count(test_anchor) != 1:
    raise SystemExit(
        f"focused test insertion: expected one anchor, found {test.count(test_anchor)}"
    )

new_tests = r'''const repeatedCrossCallbackObservations = '1.1 '.repeat(1200);
const repeatedCrossCallbackInput = `Phone: 09012345678 ${repeatedCrossCallbackObservations}12:30 555-1212`;
const repeatedCrossCallbackExpected = `Phone: [contact omitted] ${repeatedCrossCallbackObservations}12:30 [contact omitted]`;
const repeatedCrossCallbackStarted = process.hrtime.bigint();
const repeatedCrossCallbackActual = redactContactData(
  repeatedCrossCallbackInput
);
const repeatedCrossCallbackElapsedMs = Number(
  process.hrtime.bigint() - repeatedCrossCallbackStarted
) / 1e6;
assert.equal(
  repeatedCrossCallbackActual,
  repeatedCrossCallbackExpected,
  'a bounded observation pass must retain every repeated decimal and redact only the governed phones'
);
assert.ok(
  repeatedCrossCallbackElapsedMs < 2000,
  `cross-callback observation indexing must remain bounded (${repeatedCrossCallbackElapsedMs.toFixed(1)}ms)`
);

assert.equal(
  redactContactData(
    'Phone: 09012345678. 2026-08-17 12:30:45 555-1212'
  ),
  'Phone: [contact omitted]. 2026-08-17 12:30:45 555-1212',
  'a sentence period after the proved phone must terminate cross-callback label authority'
);

assert.equal(
  redactContactData(
    'Phone: 09012345678 12:30:45 555-1212 13:40:50 666-1212'
  ),
  'Phone: [contact omitted] 12:30:45 [contact omitted] 13:40:50 666-1212',
  'an inherited cross-callback label lease must be consumed rather than renewed'
);

for (const [nestedObservationCase, input, expected] of [
  [
    'ASCII nested date',
    'Phone: ((2026-08-17)) 12:30:45 555-1212',
    'Phone: ((2026-08-17)) 12:30:45 555-1212'
  ],
  [
    'fullwidth nested date',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'nested long decimal',
    'Phone: ((1234.5678)) 12:30:45 555-1212',
    'Phone: ((1234.5678)) 12:30:45 555-1212'
  ],
  [
    'nested unit-bearing count',
    'Phone: ((12345678 people)) 12:30:45 555-1212',
    'Phone: ((12345678 people)) 12:30:45 555-1212'
  ],
  [
    'nested unit-bearing range',
    'Phone: ((1234-5678 people)) 12:30:45 555-1212',
    'Phone: ((1234-5678 people)) 12:30:45 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${nestedObservationCase}: a complete observation must own the nested value and mint no phone-label lease`
  );
}

assert.equal(
  redactContactData('Phone: ((2026-08-17)) 03-6216-8041'),
  'Phone: ((2026-08-17)) [contact omitted]',
  'suppressing a nested observation label must not hide an independently structured later telephone'
);

assert.equal(
  redactContactData('Phone: ((2026-08-17)) 555-1212'),
  'Phone: ((2026-08-17)) 555-1212',
  'a nested observation must not lend phone-label authority to a weak later range'
);

'''

test = test.replace(test_anchor, new_tests + test_anchor, 1)
TEST_PATH.write_text(test, encoding="utf-8")
