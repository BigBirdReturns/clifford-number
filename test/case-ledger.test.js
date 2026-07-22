import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileAllCases, compileCaseLedger, loadCaseLedger, validateCaseLedger } from '../tools/lib/case-ledger.mjs';

const source = loadCaseLedger('cases/field-autopsy-03');
assert.deepEqual(validateCaseLedger(source), []);
const compiled = compileCaseLedger(source);

assert.equal(compiled.tracking_id, 'FA-2026-0603-SFC2');
assert.equal(compiled.counts.events, 13);
assert.equal(compiled.counts.claims, 13);
assert.equal(compiled.claims.length, 13);
assert.equal(compiled.counts.sequenced_claims, 13);
assert.equal(compiled.counts.unsequenced_claims, 0);
assert.deepEqual(compiled.unsequenced_claim_ids, []);
assert.equal(compiled.counts.trails, 0);
assert.deepEqual(compiled.trails, []);
assert.equal(compiled.claim_status_counts.verified, 0, 'prototype assertions must not silently become verified facts');
assert.equal(compiled.claim_status_counts.review_required, 13);
assert.equal(compiled.events.find(event => event.event_id === 'evt-dawg-fy27-request').claims[0].value.amount_kind, 'requested');
assert.equal(compiled.relations.find(relation => relation.relation_id === 'rel-crossings-selection').causal_status, 'temporal_association');
assert.equal(compiled.beacons[0].evidence_coverage.ratio, 0);
assert.match(compiled.beacons[0].prohibited_interpretation, /not a guilt/i);
assert.ok(compiled.claims.every(claim => claim.receipts.length === claim.receipt_ids.length));

const bad = structuredClone(source);
bad.claims[0].receipt_ids = [];
assert.ok(validateCaseLedger(bad).some(error => error.includes('has no receipts')));
const dishonest = structuredClone(source);
dishonest.claims[0].claim_status = 'verified';
assert.ok(validateCaseLedger(dishonest).some(error => error.includes('non-public receipt')));

const graphActiveTrail = structuredClone(source);
graphActiveTrail.trails = [{
  trail_id: 'trail-invalid',
  label: 'Invalid graph-active trail',
  status: 'open',
  graph_effect: 'context',
  promotes_to: 'finding'
}];
const graphActiveTrailErrors = validateCaseLedger(graphActiveTrail);
assert.ok(graphActiveTrailErrors.some(error => /must remain graph-inert/.test(error)));
assert.ok(graphActiveTrailErrors.some(error => /candidate_only/.test(error)));

compileAllCases();
const artifact = JSON.parse(fs.readFileSync('build/cases/field-autopsy-03.json', 'utf8'));
assert.deepEqual(artifact, compiled, 'compiled case must be deterministic');
const arcadiaArtifact = JSON.parse(fs.readFileSync('build/cases/arcadia-field-autopsy.json', 'utf8'));
assert.equal(arcadiaArtifact.presentation, 'reporter_briefing');
assert.equal(arcadiaArtifact.briefing.schema_version, 'reporter-briefing@2');
assert.equal(arcadiaArtifact.claims.length, arcadiaArtifact.counts.claims);
assert.equal(arcadiaArtifact.counts.sequenced_claims + arcadiaArtifact.counts.unsequenced_claims, arcadiaArtifact.counts.claims);
assert.equal(arcadiaArtifact.unsequenced_claim_ids.length, arcadiaArtifact.counts.unsequenced_claims);
assert.ok(arcadiaArtifact.counts.unsequenced_claims > 0);
assert.ok(arcadiaArtifact.unsequenced_claim_ids.includes('clm-growth-machine'));
assert.ok(arcadiaArtifact.claims.find(claim => claim.claim_id === 'clm-growth-machine').receipts.length > 0);
assert.equal(arcadiaArtifact.counts.trails, 10);
assert.equal(arcadiaArtifact.trails.length, 10);
assert.ok(arcadiaArtifact.trails.every(trail => trail.graph_effect === 'none' && trail.promotes_to === 'candidate_only'));

/* Reporter briefings are a case presentation contract, so the standard case test
 * regenerates and verifies them instead of relying only on a path-filtered workflow. */
await import('../tools/compile-reporter-briefings.mjs');
await import('./reporter-briefing.test.js');

console.log('case-ledger.test.js: OK');
