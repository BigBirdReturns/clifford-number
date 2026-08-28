from pathlib import Path

LIB = Path('tools/lib/industrial-exhaust.mjs')
TEST = Path('test/industrial-exhaust.test.js')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return source.replace(old, new, 1)


lib = LIB.read_text(encoding='utf-8')
helper_anchor = 'function completeIntrinsicPhoneContinuation(candidate, groups, first) {'
helper = r'''function intrinsicPhoneContinuationLimit(candidate, groups, first, lastLimit) {
  for (let index = first + 1; index <= lastLimit; index += 1) {
    const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[index].index);
    const normalizedSeparator = separator.normalize('NFKC');
    const tail = candidate.slice(groups[index].index).normalize('NFKC');

    // A unit-bearing observation is self-bounding even when it is attached
    // with punctuation. Dates, times, and decimals need an actual source
    // boundary so a dotted phone's own internal groups are not reclassified.
    if (NUMERIC_OBSERVATION_PATTERN.test(tail)) return index - 1;

    const sourceBoundary = /\s/u.test(separator)
      || /[()\[\]{}:【】]/u.test(normalizedSeparator);
    if (!sourceBoundary) {
      if (/^\d{1,2}:\d{2}(?::\d{2})?(?=$|[^0-9])/u.test(tail)) {
        return index - 1;
      }
      continue;
    }

    if (DATE_OBSERVATION_PATTERN.test(tail)) return index - 1;
    const formatted = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(tail);
    if (formatted && !isWeakBareRangeObservation(tail)) return index - 1;
  }
  return lastLimit;
}

function completeIntrinsicPhoneContinuation(candidate, groups, first) {'''
lib = replace_once(lib, helper_anchor, helper, 'library-helper')

limit_anchor = r'''  const lastLimit = Math.min(
    groups.length - 1,
    first + MAX_PHONE_DIGIT_GROUPS - 1
  );'''
limit_replacement = r'''  const lastLimit = intrinsicPhoneContinuationLimit(
    candidate,
    groups,
    first,
    Math.min(groups.length - 1, first + MAX_PHONE_DIGIT_GROUPS - 1)
  );'''
lib = replace_once(lib, limit_anchor, limit_replacement, 'library-limit')
LIB.write_text(lib, encoding='utf-8')

test = TEST.read_text(encoding='utf-8')
test_anchor = '''  [
    'fullwidth decimal does not absorb the following phone prefix as a short year',
    '電話：０３－６２１６－８０４１ ３．１２．０９０－１２３４－５６７８',
    '電話：[contact omitted] ３．１２．[contact omitted]'
  ],
'''
test_replacement = test_anchor + '''  [
    'short-year continuation stops before a later unit observation',
    'Archive 3.12.03 62-16 20 people',
    'Archive 3.12.03 62-16 20 people'
  ],
  [
    'fullwidth short-year continuation stops before a later unit observation',
    '資料 ３．１２．０３ ６２－１６ ２０人',
    '資料 ３．１２．０３ ６２－１６ ２０人'
  ],
  [
    'short-year continuation stops before a later formatted time',
    'Archive 3.12.03 62-16 12:30:45',
    'Archive 3.12.03 62-16 12:30:45'
  ],
  [
    'short-year continuation stops before a later decimal',
    'Archive 3.12.03 62-16 3.14',
    'Archive 3.12.03 62-16 3.14'
  ],
  [
    'short-year continuation stops before a later date',
    'Archive 3.12.03 62-16 2026-08-17',
    'Archive 3.12.03 62-16 2026-08-17'
  ],
  [
    'short-year continuation stops before a wrapped unit observation',
    'Archive 3.12.03 62-16 (20 people)',
    'Archive 3.12.03 62-16 (20 people)'
  ],
  [
    'dotted phone continuation remains intrinsic across period separators',
    'Archive 3.12.03.6216.8041',
    'Archive 3.12.[contact omitted]'
  ],
'''
test = replace_once(test, test_anchor, test_replacement, 'test-regressions')
TEST.write_text(test, encoding='utf-8')
