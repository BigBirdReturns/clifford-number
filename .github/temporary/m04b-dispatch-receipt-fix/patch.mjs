#!/usr/bin/env node
import fs from 'node:fs';

const dispatcherPath = 'tools/dispatch-security-state-organism.mjs';
const testPath = 'test/security-state-organism.test.js';
const before = 'receipt.estate_comments_updated.push(handoff.isssue_number);';
const after = 'receipt.estate_comments_updated.push(handoff.issue_number);';
let dispatcher = fs.readFileSync(dispatcherPath, 'utf8');
const occurrences = dispatcher.split(before).length - 1;
if (occurrences !== 1) throw new Error(`expected one misspelled receipt field, found ${occurrences}`);
dispatcher = dispatcher.replace(before, after);
if (dispatcher.includes('isssue_number')) throw new Error('misspelled receipt field remains');
fs.writeFileSync(dispatcherPath, dispatcher);

let test = fs.readFileSync(testPath, 'utf8');
const marker = "console.log('security-state-organism.test: ok');";
const assertions = "assert.ok(dispatcher.includes('receipt.estate_comments_updated.push(handoff.issue_number);'));\nassert.equal(dispatcher.includes('isssue_number'), false);\n";
if (!test.includes(assertions.trim())) {
  if (!test.includes(marker)) throw new Error('test insertion marker missing');
  test = test.replace(marker, `${assertions}${marker}`);
}
fs.writeFileSync(testPath, test);
console.log(JSON.stringify({ ok: true, dispatcher_receipt_field: 'handoff.issue_number', regression_added: true }, null, 2));
