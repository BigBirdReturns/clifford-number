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
    '''function numericObservationMatch(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  if (/^\\d{1,9}\\.\\d{1,6}\\./u.test(contextual)
      && !/^\\d{4}\\./u.test(contextual)) {
    return FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  }
  const dateMatch = DATE_OBSERVATION_PATTERN.exec(contextual);
  if (dateMatch) return dateMatch;
  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  if (formattedMatch
      && !/^[./-]\\d/u.test(contextual.slice(formattedMatch[0].length))) {
    return formattedMatch;
  }
  return NUMERIC_OBSERVATION_PATTERN.exec(contextual);
}
''',
    '''function completeDayFirstPeriodDateMatch(contextual) {
  const match = /^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})(?=$|[^0-9])/u.exec(
    contextual
  );
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return match;
}

function numericObservationMatch(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;

  // A complete calendar-shaped day-first dotted date owns all three groups
  // before the multi-dot decimal shortcut may claim only its first two. The
  // bounded day/month check preserves decimal-plus-phone spellings such as
  // `3.14.03-6216-8041`, whose second component cannot be a calendar month.
  const completePeriodDate = completeDayFirstPeriodDateMatch(contextual);
  if (completePeriodDate) return completePeriodDate;

  if (/^\\d{1,9}\\.\\d{1,6}\\./u.test(contextual)
      && !/^\\d{4}\\./u.test(contextual)) {
    return FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  }
  const dateMatch = DATE_OBSERVATION_PATTERN.exec(contextual);
  if (dateMatch) return dateMatch;
  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  if (formattedMatch
      && !/^[./-]\\d/u.test(contextual.slice(formattedMatch[0].length))) {
    return formattedMatch;
  }
  return NUMERIC_OBSERVATION_PATTERN.exec(contextual);
}
''',
    "day-first period-date precedence",
)

marker = "// PR2231 period-date precedence regressions"
text = test.read_text(encoding="utf-8")
if marker in text:
    raise SystemExit("period-date precedence regressions already present")

test_block = r'''
// PR2231 period-date precedence regressions
for (const [name, input, expected] of [
  [
    'day-first dotted date after a labelled phone retains all three groups',
    'Phone: 03-6216-8041 17.08.2026 03-6216-8041',
    'Phone: [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'fullwidth day-first dotted date retains all three groups',
    '電話：０３－６２１６－８０４１ １７．０８．２０２６ ０３－６２１６－８０４１',
    '電話：[contact omitted] １７．０８．２０２６ [contact omitted]'
  ],
  [
    'unlabelled day-first dotted date retains all three groups',
    'Archive 03-6216-8041 17.08.2026 03-6216-8041',
    'Archive [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'identifier custody ends before a later dotted date and independent phone',
    'ID: 03-6216-8041 17.08.2026 03-6216-8041',
    'ID: 03-6216-8041 17.08.2026 [contact omitted]'
  ],
  [
    'short-year day-first dotted date remains complete',
    'Phone: 03-6216-8041 17.08.26 03-6216-8041',
    'Phone: [contact omitted] 17.08.26 [contact omitted]'
  ],
  [
    'attached period after a complete dotted date reaches the next phone',
    'Phone: 03-6216-8041 17.08.2026.03-6216-8041',
    'Phone: [contact omitted] 17.08.2026.[contact omitted]'
  ],
  [
    'year-first dotted date retains established custody',
    'Phone: 03-6216-8041 2026.08.17 03-6216-8041',
    'Phone: [contact omitted] 2026.08.17 [contact omitted]'
  ],
  [
    'decimal followed by a dotted phone remains a decimal then a phone',
    'Phone: 03-6216-8041 3.14.03-6216-8041',
    'Phone: [contact omitted] 3.14.[contact omitted]'
  ],
  [
    'intrinsic dotted phone still outranks an overlapping decimal prefix',
    'Phone: 03.6216.8041 17.08.2026 03.6216.8041',
    'Phone: [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'consecutive day-first dotted dates remain complete before a later phone',
    'Phone: 03-6216-8041 17.08.2026 18.09.2027 03-6216-8041',
    'Phone: [contact omitted] 17.08.2026 18.09.2027 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete dotted dates must precede decimal-prefix classification`
  );
}
'''

test.write_text(text.rstrip() + "\n\n" + test_block.strip() + "\n", encoding="utf-8")
