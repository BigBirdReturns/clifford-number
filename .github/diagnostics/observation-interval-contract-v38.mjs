import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.DIAGNOSTIC_LIBRARY;
if (!modulePath) throw new Error('DIAGNOSTIC_LIBRARY is required');
const { redactContactData } = await import(pathToFileURL(modulePath).href);

const cases = [
  {
    name: 'reviewed-start-boundary-hyphen-date-pair-phone',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  },
  {
    name: 'reviewed-start-boundary-period-date-pair-phone',
    input: 'Phone: 09012345678 2026.08.17.03 62 16 80 41',
    expected: 'Phone: [contact omitted] 2026.08.17.[contact omitted]'
  },
  {
    name: 'reviewed-country-code-extent',
    input: 'ID: 09012345678 2026-08-17.1 212 555 1234',
    expected: 'ID: 09012345678 2026-08-17.[contact omitted]'
  },
  {
    name: 'international-phone-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 +81 3 6216 5111 2026 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 2026 people'
  },
  {
    name: 'international-phone-followed-by-decimal',
    input: 'Phone: 09012345678 2026-08-17 +44 20 7123 4567 3.14',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 3.14'
  },
  {
    name: 'pair-phone-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 90 people'
  },
  {
    name: 'pair-phone-followed-by-decimal',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 3.14',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 3.14'
  },
  {
    name: 'pair-phone-followed-by-time',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 12:30',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 12:30'
  },
  {
    name: 'pair-phone-followed-by-range',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 10-20 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 10-20 people'
  },
  {
    name: 'pair-phone-followed-by-date',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 2027-09-18',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18'
  },
  {
    name: 'bare-north-american-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 1 212 555 1234 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 90 people'
  },
  {
    name: 'plus-north-american-followed-by-decimal',
    input: 'Phone: 09012345678 2026-08-17 +1 212 555 1234 3.14',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 3.14'
  },
  {
    name: 'wrapped-later-phone-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 (+81 3 6216 5111) 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 ([contact omitted]) 90 people'
  },
  {
    name: 'two-digit-year-date',
    input: 'Phone: 09012345678 17-08-26 03-6216-8041',
    expected: 'Phone: [contact omitted] 17-08-26 [contact omitted]'
  },
  {
    name: 'fullwidth-international-followed-by-count',
    input: '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ＋８１ ３ ６２１６ ５１１１ ９０ 人',
    expected: '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted] ９０ 人'
  },
  {
    name: 'two-observations-two-later-phones',
    input: 'Phone: 09012345678 2026-08-17 03-6216-8041 12:30 +81 3 6216 5111',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 12:30 [contact omitted]'
  },
  {
    name: 'period-chain-two-observations-two-later-phones',
    input: 'Phone: 09012345678 2026-08-17.1 212 555 1234 3.14.03-6216-8041',
    expected: 'Phone: [contact omitted] 2026-08-17.[contact omitted] 3.14.[contact omitted]'
  },
  {
    name: 'fullwidth-two-observations-two-later-phones',
    input: '電話番号：０９０１２３４５６７８ ２０２６－０８－１７．０３－６２１６－８０４１ １２：３０ ＋８１ ３ ６２１６ ５１１１',
    expected: '電話番号：[contact omitted] ２０２６－０８－１７．[contact omitted] １２：３０ [contact omitted]'
  },
  {
    name: 'observation-without-later-phone',
    input: 'Phone: 09012345678 2026-08-17 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 90 people'
  },
  {
    name: 'ambiguous-bare-numeric-remains-conservative',
    input: 'Phone: 09012345678 2026',
    expected: 'Phone: [contact omitted]'
  },
  {
    name: 'complete-country-code-identifier-remains-intact',
    input: 'ID: 1 212 555 1234',
    expected: 'ID: 1 212 555 1234'
  },
  {
    name: 'complete-international-identifier-remains-intact',
    input: 'record id: +81 3 6216 5111',
    expected: 'record id: +81 3 6216 5111'
  }
];

const results = cases.map(testCase => ({
  ...testCase,
  actual: redactContactData(testCase.input)
}));
for (const result of results) {
  console.log(JSON.stringify({
    name: result.name,
    expected: result.expected,
    actual: result.actual,
    pass: result.actual === result.expected
  }));
}

const receipt = {
  receipt_version: 'observation-interval-contract@38',
  source_head: process.env.SOURCE_HEAD,
  patch_sha256: process.env.PATCH_SHA256,
  patch_tree: process.env.EXPECTED_PATCH_TREE,
  passed: results.filter(result => result.actual === result.expected).length,
  failed: results.filter(result => result.actual !== result.expected).length,
  cases: results.map(result => ({
    name: result.name,
    expected: result.expected,
    actual: result.actual,
    pass: result.actual === result.expected
  }))
};
if (process.env.RECEIPT_FILE) {
  fs.writeFileSync(process.env.RECEIPT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
}
for (const result of results) assert.equal(result.actual, result.expected, result.name);
