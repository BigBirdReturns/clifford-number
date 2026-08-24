import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.DIAGNOSTIC_LIBRARY;
if (!modulePath) throw new Error('DIAGNOSTIC_LIBRARY is required');
const { redactContactData } = await import(pathToFileURL(modulePath).href);

const cases = [
  {
    name: 'reviewed-start-boundary',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  },
  {
    name: 'reviewed-period-pair-boundary',
    input: 'Phone: 09012345678 2026.08.17.03 62 16 80 41',
    expected: 'Phone: [contact omitted] 2026.08.17.[contact omitted]'
  },
  {
    name: 'reviewed-country-code-extent',
    input: 'ID: 09012345678 2026-08-17.1 212 555 1234',
    expected: 'ID: 09012345678 2026-08-17.[contact omitted]'
  },
  {
    name: 'later-international-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 +81 3 6216 5111 2026 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 2026 people'
  },
  {
    name: 'later-international-followed-by-decimal',
    input: 'Phone: 09012345678 2026-08-17 +44 20 7123 4567 3.14',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 3.14'
  },
  {
    name: 'later-pair-phone-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 01 42 68 53 00 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 [contact omitted] 90 people'
  },
  {
    name: 'two-digit-year-date',
    input: 'Phone: 09012345678 17-08-26 03-6216-8041',
    expected: 'Phone: [contact omitted] 17-08-26 [contact omitted]'
  },
  {
    name: 'wrapped-later-phone-followed-by-count',
    input: 'Phone: 09012345678 2026-08-17 (+81 3 6216 5111) 90 people',
    expected: 'Phone: [contact omitted] 2026-08-17 ([contact omitted]) 90 people'
  },
  {
    name: 'fullwidth-international-followed-by-count',
    input: '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ＋８１ ３ ６２１６ ５１１１ ９０ 人',
    expected: '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted] ９０ 人'
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
    actual: result.actual
  }));
}

if (process.env.RECEIPT_FILE) {
  fs.writeFileSync(process.env.RECEIPT_FILE, `${JSON.stringify({
    receipt_version: 'observation-recovery-adversarial@37',
    source_head: process.env.SOURCE_HEAD,
    patch_sha256: process.env.PATCH_SHA256,
    patch_tree: process.env.EXPECTED_PATCH_TREE,
    cases: results.map(result => ({
      name: result.name,
      expected: result.expected,
      actual: result.actual
    }))
  }, null, 2)}\n`);
}

for (const result of results) {
  assert.equal(result.actual, result.expected, result.name);
}
