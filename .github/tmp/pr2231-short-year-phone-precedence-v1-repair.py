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
    '''function completeDayFirstPeriodDateMatch(contextual) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?=$|[^0-9])/u.exec(
    contextual
  );
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return match;
}
''',
    '''function completeIntrinsicPhoneContinuation(candidate, groups, first) {
  let validatedLast = -1;
  let validatedEnd = -1;
  const lastLimit = Math.min(
    groups.length - 1,
    first + MAX_PHONE_DIGIT_GROUPS - 1
  );

  for (let last = first; last <= lastLimit; last += 1) {
    const { start, end } = phoneWindowBounds(candidate, groups, first, last);
    if (!phoneCandidateScore(candidate.slice(start, end), '', false)) continue;
    validatedLast = last;
    validatedEnd = end;
  }

  if (validatedLast < 0) return false;
  if (validatedLast === groups.length - 1) return true;

  const next = validatedLast + 1;
  const tail = candidate.slice(groups[next].index).normalize('NFKC');
  if (DATE_OBSERVATION_PATTERN.test(tail)
      || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(tail)
      || NUMERIC_OBSERVATION_PATTERN.test(tail)) return true;

  const separator = candidate.slice(validatedEnd, groups[next].index);
  return /[\s/／.．]/u.test(separator)
    && canStartIndependentPhone(candidate, groups, next, '');
}

function completeDayFirstPeriodDateMatch(contextual) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?=$|[^0-9])/u.exec(
    contextual
  );
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  // A two- or three-digit final group can also be the true left edge of an
  // attached domestic or mobile telephone after a decimal. Preserve the date
  // interpretation only when that group does not independently begin one
  // complete telephone interval. Four-digit years remain unambiguous.
  if (match[3].length < 4) {
    const groups = [...contextual.matchAll(/\d+/gu)];
    if (groups.length > 3
        && completeIntrinsicPhoneContinuation(contextual, groups, 2)) {
      return null;
    }
  }
  return match;
}
''',
    "short-year telephone continuation precedence",
)

replace_once(
    test,
    '''  [
    'decimal followed by a dotted phone remains a decimal then a phone',
    'Phone: 03-6216-8041 3.14.03-6216-8041',
    'Phone: [contact omitted] 3.14.[contact omitted]'
  ],
''',
    '''  [
    'decimal followed by a dotted phone remains a decimal then a phone',
    'Phone: 03-6216-8041 3.14.03-6216-8041',
    'Phone: [contact omitted] 3.14.[contact omitted]'
  ],
  [
    'decimal with a calendar-valid fractional group retains a domestic phone',
    'Phone: 03-6216-8041 3.12.03-6216-8041',
    'Phone: [contact omitted] 3.12.[contact omitted]'
  ],
  [
    'decimal with a calendar-valid fractional group retains a mobile phone',
    'Phone: 03-6216-8041 3.12.090-1234-5678',
    'Phone: [contact omitted] 3.12.[contact omitted]'
  ],
  [
    'fullwidth decimal does not absorb the following phone prefix as a short year',
    '電話：０３－６２１６－８０４１ ３．１２．０９０－１２３４－５６７８',
    '電話：[contact omitted] ３．１２．[contact omitted]'
  ],
''',
    "short-year telephone continuation regressions",
)
