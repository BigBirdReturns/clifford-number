#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildRegistry, extractPageReferences } from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/derive-version-cross-references.mjs';

const page = `
ALL COUNTY LETTER (ACL)
NO. 15-08

7 CFR 273.24(b)
(2)

TITLE 45 CFR 164.502(A)(5)
25 U.S.C. 1603(13)

WIC Section 11403(b)(4)
HEALTH AND SAFETY CODE SECTION 123110(d)(1)
HEALTH AND SAFTEY CODE (HSC) SECTION 1231110(d)(1)

MANUAL OF POLICIES AND PROCEDURES (MPP) SECTION 63-
407
MPP Sections 42-701.2(d)(3)—(5)

ASSEMBLY BILL (AB) 12
SENATE BILL (SB) 1050

SECTIONS 311—312 OF THE FISCAL RESPONSIBILITY ACT OF 2023
Section 6(o) of the Food and Nutrition Act of 2008
Section 236 of the Trade Act of 1974
The Secretary's Authority on Able-Bodied Adults Without Dependents (ABAWD) Waivers
`;

const occurrences = extractPageReferences(page, 'SYNTHETIC', 1);
const registry = buildRegistry(occurrences);
const ids = new Set(registry.map((row) => row.reference_id));

for (const expected of [
  'CA-ACL-15-08',
  '7-CFR-273.24(b)(2)',
  '45-CFR-164.502(a)(5)',
  '25-USC-1603(13)',
  'CA-WIC-11403(b)(4)',
  'CA-HSC-123110(d)(1)',
  'CA-HSC-1231110(d)(1)',
  'CA-MPP-63-407',
  'CA-MPP-42-701.2(d)(3)-(5)',
  'CA-AB-12',
  'CA-SB-1050',
  'US-FRA-2023',
  'US-FRA-2023-SEC-311-312',
  'US-FNA-2008',
  'US-FNA-2008-SEC-6(o)',
  'US-TRADE-ACT-1974',
  'US-TRADE-ACT-1974-SEC-236',
  'USDA-FNS-MEMO-SECRETARY-ABAWD-WAIVERS'
]) {
  assert(ids.has(expected), `missing repaired reference ${expected}`);
}

assert(!ids.has('7-CFR-273.24(b)'), 'wrapped CFR subsection was truncated to its parent');
assert(!ids.has('CA-WIC-11403'), 'WIC subsection identity was discarded');

const duplicated = extractPageReferences('ACL No. 15-08; ACL No. 15-08', 'DUPLICATE', 1);
const duplicateRegistry = buildRegistry(duplicated);
assert.equal(duplicateRegistry.length, 1);
assert.equal(duplicateRegistry[0].occurrence_count, 2);
assert.deepEqual(duplicateRegistry[0].source_ids, ['DUPLICATE']);

for (const row of registry) {
  assert.equal(row.disposition === 'seed_alias' || row.disposition === 'new_cross_reference_candidate', true);
  for (const occurrence of row.occurrences) {
    assert.equal(occurrence.source_id, 'SYNTHETIC');
    assert.equal(occurrence.page, 1);
    assert.equal(Number.isInteger(occurrence.line), true);
    assert.equal(occurrence.context_sha256.length, 64);
  }
}

console.log(`status-sovereignty-rd-wave02-rd04-cross-reference.test: ${registry.length} synthetic IDs; page-wrap, title, subsection, manual, bill, act, and memo controls passed`);
