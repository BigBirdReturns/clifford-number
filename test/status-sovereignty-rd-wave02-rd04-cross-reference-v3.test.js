#!/usr/bin/env node
import assert from 'node:assert/strict';
import { scanPage } from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/repair-three-digit-acl-cross-references.mjs';

const page = 'ACL No. 21-101; ACL NO. 21-101E; ACL 20-99; ALL COUNTY LETTER (ACL) NO. 23-107';
const rows = scanPage(page, 'FIXTURE', 1);
assert.deepEqual(
  rows.map((row) => row.reference_id),
  ['CA-ACL-21-101', 'CA-ACL-21-101E', 'CA-ACL-23-107']
);
assert.equal(scanPage('ACL NO. 21-\f101', 'FIXTURE', 1).length, 0);
assert.deepEqual(
  scanPage('ACL NO.\n21-101', 'FIXTURE', 1).map((row) => row.reference_id),
  ['CA-ACL-21-101']
);
assert.equal(rows.every((row) => row.supplemental_grammar === 'three_digit_acl_sequence'), true);
console.log('status-sovereignty-rd-wave02-rd04-cross-reference-v3.test: three-digit ACL admission, two-digit exclusion and cross-page refusal passed');
