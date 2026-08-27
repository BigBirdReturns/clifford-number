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
    }
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }
''',
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
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }
''',
    "attached observation before invalid-closer exit",
)

marker = "// PR2231 attached-observation invalid-closer regressions"
text = test.read_text(encoding="utf-8")
if marker in text:
    raise SystemExit("attached-observation regressions already present")

test_block = r'''
// PR2231 attached-observation invalid-closer regressions
for (const [name, input, expected] of [
  [
    'ASCII decimal attached after an invalid closer',
    'Phone: 09012345678 2026-08-17)3.14 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)3.14 [contact omitted]'
  ],
  [
    'ASCII date attached after a mismatched closer',
    'Phone: 09012345678 2026-08-17]2027-09-18 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17]2027-09-18 [contact omitted]'
  ],
  [
    'fullwidth decimal attached after an invalid closer',
    '電話：０９０１２３４５６７８ ２０２６－０８－１７）３．１４ ０３－６２１６－８０４１',
    '電話：[contact omitted] ２０２６－０８－１７）３．１４ [contact omitted]'
  ],
  [
    'unlabelled attached observation cannot mint weak-phone authority',
    'Archive 09012345678 2026-08-17)3.14 555-1212',
    'Archive [contact omitted] 2026-08-17)3.14 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a complete attached observation must claim its source interval before any interior restart`
  );
}
'''
test.write_text(text.rstrip() + "\n\n" + test_block.strip() + "\n", encoding="utf-8")
