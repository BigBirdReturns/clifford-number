from pathlib import Path

PATH = Path("test/industrial-exhaust.test.js")
text = PATH.read_text()

anchor = "console.log('industrial-exhaust tests passed');\n"
addition = r'''
for (const [input, expected, message] of [
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14) 03-6216-8041 ext 55`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14) [contact omitted] ext [contact omitted]`,
    'extension suffixes must not suppress complete wrapped observations before later-phone validation'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ２０２６－０８－１７（３．１４） ０３－６２１６－８０４１ 内線 ５５`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７（３．１４） [contact omitted] 内線 [contact omitted]`,
    'fullwidth extension suffixes must retain the same observation boundary contract'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-)12345678`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-)12345678`,
    'an unmatched closing wrapper must not create telephone authority after an observation'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ２０２６－０８－１７－）１２３４５６７８`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ２０２６－０８－１７－）１２３４５６７８`,
    'a fullwidth unmatched closer must not create telephone authority after an observation'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14)03-6216-8041`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14)[contact omitted]`,
    'an owned closer must continue to admit the genuine later telephone interval'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 (2026-08-17 3.14)03-6216-8041`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] (2026-08-17 3.14)[contact omitted]`,
    'wrapper ownership must persist across every complete observation inside one outer wrapper'
  ],
  [
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-()12345678`,
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-()12345678`,
    'an empty wrapper introduced after the observation must not impersonate owned closing custody'
  ]
]) {
  assert.equal(redactContactData(input), expected, message);
}

'''

if text.count(anchor) != 1:
    raise SystemExit(f"test insertion anchor count={text.count(anchor)}")
PATH.write_text(text.replace(anchor, addition + anchor))
