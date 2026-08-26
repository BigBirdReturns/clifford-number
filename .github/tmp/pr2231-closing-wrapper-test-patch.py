from pathlib import Path

PATH = Path("test/industrial-exhaust.test.js")
text = PATH.read_text()

anchor = """const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""
replacement = """for (const [observations, laterPhone] of [
  ['2026-08-17(3.14)', '03-6216-8041'],
  ['2026-08-17(12:30)', '03-6216-8041'],
  ['3.14((2027-09-18))', '1 212 555 1234'],
  ['２０２６－０８－１７（３．１４）', '０３－６２１６－８０４１'],
  ['2026-08-17(12:30)', '+81 3 6216 5111']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations}${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations}[contact omitted]`,
    'closing wrappers after complete observations must reach the later phone interval'
  );
}

const closingWrapperObservationTail = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14)90 people`;
assert.equal(
  redactContactData(closingWrapperObservationTail),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14)90 people`,
  'closing-wrapper admission must defer to a complete later numeric observation'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
"""

if text.count(anchor) != 1:
    raise SystemExit(f"closing-wrapper test anchor count={text.count(anchor)}")
PATH.write_text(text.replace(anchor, replacement))
