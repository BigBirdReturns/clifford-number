from pathlib import Path

LIB_PATH = Path('tools/lib/industrial-exhaust.mjs')
TEST_PATH = Path('test/industrial-exhaust.test.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def replace_block(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker missing')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker missing')
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]


lib = LIB_PATH.read_text(encoding='utf-8')
original_lib = lib

lib = replace_once(
    lib,
    'const MAX_PHONE_DIGIT_GROUPS = 17;\n',
    'const MAX_PHONE_DIGIT_GROUPS = 17;\n'
    'const MAX_CROSS_CALLBACK_OBSERVATION_CHARS = 128;\n',
    'cross-callback observation bound'
)

leading_observation_helper = r'''function leadingNumericObservation(candidate, externalSuffix = '') {
  let sourceStart = 0;
  while (sourceStart < candidate.length && /\s/u.test(candidate[sourceStart])) {
    sourceStart += 1;
  }

  while (sourceStart < candidate.length) {
    const character = candidate[sourceStart];
    const normalized = character.normalize('NFKC');
    if (!Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, normalized)) break;
    sourceStart += character.length;
    while (sourceStart < candidate.length && /\s/u.test(candidate[sourceStart])) {
      sourceStart += 1;
    }
  }

  const source = candidate.slice(sourceStart);
  const observation = numericObservationMatch(source, externalSuffix);
  if (!observation) return null;
  return {
    group: 0,
    end: sourceStart + sourceEndForNormalizedPrefix(
      source,
      observation[0].length
    )
  };
}'''
lib = replace_once(
    lib,
    'function trailingObservationGroup(\n',
    f'{leading_observation_helper}\n\nfunction trailingObservationGroup(\n',
    'leading wrapped observation helper'
)

lib = replace_block(
    lib,
    'function seedFallsInsideEarlierObservation(\n',
    'function hasFreshCrossCallbackNarrativeBoundary(',
    '',
    'remove quadratic earlier-observation scan'
)

bridge_function = r'''function crossCallbackExplicitPhoneLabelBridge(
  lease,
  candidate,
  offset,
  input
) {
  if (!lease || offset < lease.end || offset - lease.end > 64) return null;
  if (/[\r\n]/u.test(input.slice(lease.end, offset))) return null;

  const lastRedactedEnd = Math.max(...lease.ranges.map(range => range.end));
  const absoluteLastRedactedEnd = lease.offset + lastRedactedEnd;
  const groups = [...lease.candidate.matchAll(DIGIT_RUN_PATTERN)];
  const sourceLimit = Math.min(
    input.length,
    offset + candidate.length + 64
  );
  let coveredObservationEnd = lastRedactedEnd;

  for (const seed of groups) {
    const seedRange = {
      start: seed.index,
      end: seed.index + seed[0].length
    };
    if (seedRange.start < lastRedactedEnd) continue;
    if (rangeOverlapsAny(seedRange, lease.ranges)) continue;
    if (seedRange.start < coveredObservationEnd) continue;

    const absoluteSeedStart = lease.offset + seed.index;
    const boundedSourceEnd = Math.min(
      sourceLimit,
      absoluteSeedStart + MAX_CROSS_CALLBACK_OBSERVATION_CHARS
    );
    const source = input.slice(absoluteSeedStart, boundedSourceEnd);
    const observation = crossCallbackObservationMatch(source);
    let absoluteObservationEnd = null;
    if (observation) {
      absoluteObservationEnd = absoluteSeedStart
        + sourceEndForNormalizedPrefix(source, observation[0].length);
      coveredObservationEnd = Math.max(
        coveredObservationEnd,
        absoluteObservationEnd - lease.offset
      );
    }

    const betweenPhoneAndSeed = input.slice(
      absoluteLastRedactedEnd,
      absoluteSeedStart
    );
    if (hasFreshCrossCallbackNarrativeBoundary(betweenPhoneAndSeed)) {
      continue;
    }
    if (!observation || isWeakBareRangeObservation(source)) continue;
    if (absoluteObservationEnd <= lease.end
        || absoluteObservationEnd > offset + candidate.length) {
      continue;
    }

    const observationSource = input.slice(
      absoluteSeedStart,
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
      observationStart: absoluteSeedStart,
      observationEnd: absoluteObservationEnd
    };
  }

  return null;
}'''
lib = replace_block(
    lib,
    'function crossCallbackExplicitPhoneLabelBridge(\n',
    'function createCrossCallbackExplicitPhoneLabelLease(',
    bridge_function,
    'replace cross-callback bridge'
)

old_context = r'''  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || hasPhoneLabelPrefix(prefix);
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);'''
new_context = r'''  const localExplicitPhoneLabelContext = hasPhoneLabelPrefix(prefix);
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || localExplicitPhoneLabelContext;
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || localExplicitPhoneLabelContext;'''
lib = replace_once(
    lib,
    old_context,
    new_context,
    'local versus inherited label provenance'
)

span_start = lib.index('function redactPhoneSpanCandidate(\n')
span_end = lib.index('\nexport function redactContactData(value)', span_start)
span = lib[span_start:span_end]
old_branch_return = r'''        explicitPhoneLabelContext
      };'''
if span.count(old_branch_return) != 2:
    raise SystemExit(
        f'label provenance branch returns: expected 2, found {span.count(old_branch_return)}'
    )
span = span.replace(
    old_branch_return,
    r'''        explicitPhoneLabelContext,
        localExplicitPhoneLabelContext
      };'''
)
old_final_return = r'''    explicitPhoneLabelContext
  };'''
if span.count(old_final_return) != 1:
    raise SystemExit(
        f'label provenance final return: expected 1, found {span.count(old_final_return)}'
    )
span = span.replace(
    old_final_return,
    r'''    explicitPhoneLabelContext,
    localExplicitPhoneLabelContext
  };'''
)
lib = lib[:span_start] + span + lib[span_end:]

lib = replace_once(
    lib,
    '          result.explicitPhoneLabelContext\n',
    '          result.localExplicitPhoneLabelContext\n',
    'one-use cross-callback lease renewal'
)

old_leading_observation = r'''  const leadingObservationSource = candidate.trimStart();
  const leadingObservationOffset = candidate.length - leadingObservationSource.length;
  const leadingObservationMatch = numericObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: leadingObservationOffset + sourceEndForNormalizedPrefix(
        leadingObservationSource,
        leadingObservationMatch[0].length
      )
    };
  }'''
new_leading_observation = r'''  const leadingObservation = leadingNumericObservation(
    candidate,
    externalSuffix
  );
  if (leadingObservation) observation = leadingObservation;'''
lib = replace_once(
    lib,
    old_leading_observation,
    new_leading_observation,
    'leading nested observation custody'
)

if lib == original_lib:
    raise SystemExit('library was not modified')
LIB_PATH.write_text(lib, encoding='utf-8')


test = TEST_PATH.read_text(encoding='utf-8')
original_test = test
regressions = r'''

const repeatedCrossCallbackObservations = '1.1 '.repeat(1200);
const repeatedCrossCallbackInput =
  `Phone: 09012345678 ${repeatedCrossCallbackObservations}12:30 555-1212`;
const repeatedCrossCallbackStartedAt = performance.now();
const repeatedCrossCallbackActual = redactContactData(
  repeatedCrossCallbackInput
);
const repeatedCrossCallbackElapsed = performance.now()
  - repeatedCrossCallbackStartedAt;
assert.equal(
  repeatedCrossCallbackActual,
  `Phone: [contact omitted] ${repeatedCrossCallbackObservations}12:30 [contact omitted]`,
  'one bounded observation pass must retain the final cross-callback label bridge'
);
assert.ok(
  repeatedCrossCallbackElapsed < 3000,
  `cross-callback observation discovery must remain bounded, took ${repeatedCrossCallbackElapsed.toFixed(1)}ms`
);

assert.equal(
  redactContactData(
    'Phone: 09012345678. 2026-08-17 12:30:45 555-1212'
  ),
  'Phone: [contact omitted]. 2026-08-17 12:30:45 555-1212',
  'a sentence boundary must terminate cross-callback phone-label authority'
);

assert.equal(
  redactContactData(
    'Phone: 09012345678 12:30:45 555-1212 13:40:50 666-1212'
  ),
  'Phone: [contact omitted] 12:30:45 [contact omitted] 13:40:50 666-1212',
  'an inherited cross-callback label lease must be consumed exactly once'
);

for (const [nestedObservation, expected] of [
  [
    'Phone: ((2026-08-17)) 12:30:45 555-1212',
    'Phone: ((2026-08-17)) 12:30:45 555-1212'
  ],
  [
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'Phone: ((1234.5678)) 555-1212',
    'Phone: ((1234.5678)) 555-1212'
  ],
  [
    'Phone: ((12345678 people)) 555-1212',
    'Phone: ((12345678 people)) 555-1212'
  ],
  [
    '電話：（（１２３４－５６７８人）） ５５５－１２１２',
    '電話：（（１２３４－５６７８人）） ５５５－１２１２'
  ]
]) {
  assert.equal(
    redactContactData(nestedObservation),
    expected,
    'nested strong observations must retain custody before telephone-label scoring'
  );
}
'''
anchor = "\nconst crawlerRuntimeSource = fs.readFileSync(\n"
test = replace_once(
    test,
    anchor,
    f'{regressions}{anchor}',
    'append final lease regressions'
)
if test == original_test:
    raise SystemExit('test file was not modified')
TEST_PATH.write_text(test, encoding='utf-8')
