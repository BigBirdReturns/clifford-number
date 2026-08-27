#!/usr/bin/env python3
from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    path.write_text(text.replace(old, new), encoding="utf-8")


lib = Path("tools/lib/industrial-exhaust.mjs")
test = Path("test/industrial-exhaust.test.js")

replace_once(
    lib,
    '''function isWeakBareRangeObservation(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  if (DATE_OBSERVATION_PATTERN.test(contextual)) return false;
  if (NUMERIC_OBSERVATION_PATTERN.test(contextual)) return false;

  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  return Boolean(
    formattedMatch
      && /^\\d{1,9}\\s*[-–—]\\s*\\d{1,9}(?=$|[^0-9])/u.test(formattedMatch[0])
  );
}

function trailingObservationGroup(
''',
    '''function isWeakBareRangeObservation(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  if (DATE_OBSERVATION_PATTERN.test(contextual)) return false;
  if (NUMERIC_OBSERVATION_PATTERN.test(contextual)) return false;

  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  return Boolean(
    formattedMatch
      && /^\\d{1,9}\\s*[-–—]\\s*\\d{1,9}(?=$|[^0-9])/u.test(formattedMatch[0])
  );
}

function completeDateObservationRanges(candidate, groups) {
  const ranges = [];
  for (const group of groups) {
    // Date spellings are bounded to three short digit groups. Inspect one
    // constant-size source window per existing group instead of reparsing every
    // candidate suffix, then retain exact source coordinates for overlap tests.
    const source = candidate.slice(group.index, group.index + 32);
    const match = DATE_OBSERVATION_PATTERN.exec(source.normalize('NFKC'));
    if (!match) continue;
    const range = {
      start: group.index,
      end: group.index + sourceEndForNormalizedPrefix(source, match[0].length)
    };
    if (!rangeOverlapsAny(range, ranges)) ranges.push(range);
  }
  return ranges;
}

function trailingObservationGroup(
''',
    "bounded complete-date census",
)

replace_once(
    lib,
    '''    if (invalidClosingBoundary) {
      const attachedIntrinsicInterval = validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        first,
        externalSuffix
      );
      if (attachedIntrinsicInterval) {
        return {
          ...attachedIntrinsicInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }

      // An invalid closer is not boundary authority, but it must not make the
      // scanner skip the first group of a complete attached observation. Claim
      // that exact source interval before any interior period, slash, or space
      // can become a new telephone start.
      const attachedObservationSource = candidate.slice(groups[first].index);
      const attachedObservation = numericObservationMatch(
        attachedObservationSource,
        externalSuffix
      );
      if (attachedObservation
          && !isWeakBareRangeObservation(
            attachedObservationSource,
            externalSuffix
          )) {
        observationOpeners = [
          ...closingState.openers,
          ...nextOpeners
        ];
        observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
          attachedObservationSource,
          attachedObservation[0].length
        );
        continue;
      }
    }
''',
    '''    if (invalidClosingBoundary) {
      const attachedObservationSource = candidate.slice(groups[first].index);
      const attachedObservation = crossCallbackObservationMatch(
        attachedObservationSource,
        externalSuffix
      );
      const attachedObservationIsStrong = Boolean(
        attachedObservation
          && !isWeakBareRangeObservation(
            attachedObservationSource,
            externalSuffix
          )
      );
      const attachedObservationEnd = attachedObservation
        ? groups[first].index + sourceEndForNormalizedPrefix(
            attachedObservationSource,
            attachedObservation[0].length
          )
        : groups[first].index;
      const attachedObservationUsesExternalSuffix = Boolean(
        attachedObservation
          && attachedObservation[0].length
            > attachedObservationSource.normalize('NFKC').length
      );
      const attachedIntrinsicInterval = validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        first,
        externalSuffix
      );
      const intrinsicCoversAttachedObservation = Boolean(
        attachedIntrinsicInterval
          && !attachedObservationUsesExternalSuffix
          && attachedIntrinsicInterval.end >= attachedObservationEnd
      );

      // Context-free telephone evidence wins only when it covers the complete
      // source claimed by the competing observation. A phone-shaped numeric
      // prefix cannot preempt a unit supplied by the external suffix.
      if (attachedIntrinsicInterval
          && (!attachedObservationIsStrong
            || intrinsicCoversAttachedObservation)) {
        return {
          ...attachedIntrinsicInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }

      // An invalid closer is not boundary authority, but it must not make the
      // scanner skip the first group of a complete attached observation. Claim
      // that exact source interval before any interior period, slash, or space
      // can become a new telephone start.
      if (attachedObservationIsStrong) {
        observationOpeners = [
          ...closingState.openers,
          ...nextOpeners
        ];
        observationEnd = attachedObservationEnd;
        continue;
      }
    }
''',
    "complete attached-observation precedence",
)

replace_once(
    lib,
    '''  const leadingObservationOwnsInitialGroup = Boolean(
    (explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !leadingObservationIsIntrinsicPhone
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
    '''  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationUsesExternalSuffix
      || explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !leadingObservationIsIntrinsicPhone
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
''',
    "external-suffix strong-observation ownership",
)

replace_once(
    lib,
    '''  const intervals = Array.from({ length: groups.length }, () => []);
  for (let first = 0; first < groups.length; first += 1) {
''',
    '''  const completeDateRanges = completeDateObservationRanges(candidate, groups);
  const intervals = Array.from({ length: groups.length }, () => []);
  for (let first = 0; first < groups.length; first += 1) {
''',
    "date census before interval optimization",
)

replace_once(
    lib,
    '''      if (!score) continue;

      const interval = { start, end };
''',
    '''      if (!score) continue;
      if (rangeOverlapsAny({ start, end }, completeDateRanges)) continue;

      const interval = { start, end };
''',
    "exclude date-overlapping telephone proposals",
)

marker = "// PR2231 complete observation interval custody regressions"
text = test.read_text(encoding="utf-8")
if marker in text:
    raise SystemExit("complete observation regressions already present")

test_block = r'''
// PR2231 complete observation interval custody regressions
for (const [name, input, expected] of [
  [
    'unit observation outranks an intrinsic numeric prefix after an invalid closer',
    'Phone: 09012345678 2026-08-17)03-62165111 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)03-62165111 people [contact omitted]'
  ],
  [
    'fullwidth unit observation outranks an intrinsic prefix after an invalid closer',
    '電話：０９０１２３４５６７８ ２０２６－０８－１７）０３－６２１６５１１１ 人 ０３－６２１６－８０４１',
    '電話：[contact omitted] ２０２６－０８－１７）０３－６２１６５１１１ 人 [contact omitted]'
  ],
  [
    'decimal unit observation owns its first group across a mismatched callback boundary',
    'Phone: 09012345678 2026-08-17]03.621651 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17]03.621651 people [contact omitted]'
  ],
  [
    'nonleading ISO date is excluded from interior phone optimization',
    'Phone: 12:30:45 2026-08-17 555-1212',
    'Phone: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'unlabelled nonleading date is excluded from interior phone optimization',
    'Archive 12:30:45 2026-08-17 555-1212',
    'Archive 12:30:45 2026-08-17 555-1212'
  ],
  [
    'identifier context cannot donate a nonleading date group to a phone',
    'ID: 12:30:45 2026-08-17 555-1212',
    'ID: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'leading labelled date remains intact before a weak local phone',
    'Phone: 2026-08-17 555-1212',
    'Phone: 2026-08-17 [contact omitted]'
  ],
  [
    'day-first date remains intact before a disjoint domestic phone',
    'Archive 12:30:45 17/08/2026 03-6216-8041',
    'Archive 12:30:45 17/08/2026 [contact omitted]'
  ],
  [
    'period date remains intact before a disjoint dotted phone',
    'Archive 12:30:45 17.08.2026 03.6216.8041',
    'Archive 12:30:45 17.08.2026 [contact omitted]'
  ],
  [
    'fullwidth period date remains intact before a disjoint dotted phone',
    '電話：１２：３０：４５ ２０２６．０８．１７ ０３．６２１６．８０４１',
    '電話：１２：３０：４５ ２０２６．０８．１７ [contact omitted]'
  ],
  [
    'intrinsic dotted phone before a date retains precedence',
    'Phone: 03.6216.8041 2026-08-17',
    'Phone: [contact omitted] 2026-08-17'
  ],
  [
    'consecutive complete dates remain intact before a disjoint phone',
    'Archive 12:30:45 2026-08-17 2027-09-18 03-6216-8041',
    'Archive 12:30:45 2026-08-17 2027-09-18 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete observations and disjoint telephone intervals must retain exact source custody`
  );
}
'''
test.write_text(text.rstrip() + "\n\n" + test_block.strip() + "\n", encoding="utf-8")
