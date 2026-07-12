import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileAllCases, compileCaseLedger, loadCaseLedger, validateCaseLedger } from '../tools/lib/case-ledger.mjs';

const source = loadCaseLedger('cases/field-autopsy-03');
assert.deepEqual(validateCaseLedger(source), []);
const compiled = compileCaseLedger(source);

assert.equal(compiled.tracking_id, 'FA-2026-0603-SFC2');
assert.equal(compiled.counts.events, 13);
assert.equal(compiled.counts.claims, 13);
assert.equal(compiled.claim_status_counts.verified, 0, 'prototype assertions must not silently become verified facts');
assert.equal(compiled.claim_status_counts.review_required, 13);
assert.equal(compiled.events.find(event => event.event_id === 'evt-dawg-fy27-request').claims[0].value.amount_kind, 'requested');
assert.equal(compiled.relations.find(relation => relation.relation_id === 'rel-crossings-selection').causal_status, 'temporal_association');
assert.equal(compiled.beacons[0].evidence_coverage.ratio, 0);
assert.match(compiled.beacons[0].prohibited_interpretation, /not a guilt/i);

const bad = structuredClone(source);
bad.claims[0].receipt_ids = [];
assert.ok(validateCaseLedger(bad).some(error => error.includes('has no receipts')));
const dishonest = structuredClone(source);
dishonest.claims[0].claim_status = 'verified';
assert.ok(validateCaseLedger(dishonest).some(error => error.includes('non-public receipt')));

compileAllCases();
const artifact = JSON.parse(fs.readFileSync('build/cases/field-autopsy-03.json', 'utf8'));
assert.deepEqual(artifact, compiled, 'compiled case must be deterministic');

console.log('case-ledger.test.js: OK');
