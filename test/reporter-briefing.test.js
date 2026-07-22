import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPILED_REPORTER_BRIEFING_SCHEMA_VERSION,
  REPORTER_BRIEFING_SCHEMA_VERSION,
  compileReporterBriefing,
  reporterBriefingQueueEntry,
  validateReporterBriefing
} from '../tools/lib/reporter-briefing.mjs';
import { readJson, root } from '../tools/lib/ledger.mjs';

const spec = readJson('cases/anduril-access-ownership/briefing.json');
const caseItem = readJson('build/cases/anduril-access-ownership.json');
const errors = validateReporterBriefing(spec, caseItem);
assert.deepEqual(errors, []);
assert.equal(spec.schema_version, REPORTER_BRIEFING_SCHEMA_VERSION);

const { html, manifest } = compileReporterBriefing(spec, caseItem);
assert.equal(manifest.schema_version, COMPILED_REPORTER_BRIEFING_SCHEMA_VERSION);
assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.equal(manifest.counts.threads, 6);
assert.equal(manifest.counts.matrix_cells, 30);
assert.equal(manifest.counts.sequence_events, 18);
assert.equal(manifest.counts.controls, 3);
assert.equal(manifest.counts.workplan_items, 7);
assert.equal(manifest.counts.source_trails, 0);
assert.equal(manifest.counts.inherited_qualifications, 0);
assert.equal(manifest.counts.claims, 24);
assert.equal(manifest.counts.verified_claims, 15);
assert.equal(manifest.counts.review_required_claims, 9);
assert.equal(manifest.counts.receipts, 22);
assert.equal(manifest.counts.public_receipts, 21);
assert.equal(manifest.records_target.source, 'claim');
assert.ok(manifest.review_required_claim_ids.includes('clm-axis-working-proposition'));
assert.ok(manifest.verified_claim_ids.includes('clm-army-enterprise-vehicle'));
assert.ok(manifest.receipt_ids.includes('anduril-bundle-r3'));
assert.ok(!manifest.public_receipt_ids.includes('anduril-bundle-r3'));
assert.match(html, /Decision sequence/);
assert.match(html, /What is established, and where the paper gap remains/);
assert.match(html, /Reconstruct the formal gate before chasing access/);
assert.match(html, /The March 2026 Army enterprise contract is a single-award/);
assert.match(html, /The \$20 billion figure is a maximum ceiling/);
assert.match(html, /Open evidence case/);
assert.match(html, /data-briefing-schema="reporter-briefing@2"/);
assert.match(html, /data-graph-effect="none"/);
assert.doesNotMatch(html, /style="left:/);
assert.doesNotMatch(html, /anduril-bundle-r3/);
assert.doesNotMatch(html, /href="undefined"/);

const queue = reporterBriefingQueueEntry(manifest);
assert.equal(queue.eligible_for_approval, false);
assert.ok(queue.blocking_reasons.includes('publication_status_review_required'));
assert.ok(queue.blocking_reasons.includes('9_claims_review_required'));
assert.ok(queue.blocking_reasons.includes('independent_reviewer_missing'));
assert.ok(queue.blocking_reasons.includes('review_date_missing'));
assert.ok(!queue.blocking_reasons.some(reason => /qualifications_inherited/.test(reason)));

const missingClaim = structuredClone(spec);
missingClaim.threads[0].cells[0].claim_ids.push('missing-claim');
assert.ok(validateReporterBriefing(missingClaim, caseItem).some(error => /missing claim missing-claim/.test(error)));

const missingEvent = structuredClone(spec);
missingEvent.sequence.items[0].event_id = 'missing-event';
assert.ok(validateReporterBriefing(missingEvent, caseItem).some(error => /missing event missing-event/.test(error)));

const pseudoPrecision = structuredClone(spec);
pseudoPrecision.threads[0].placement.x_level = '92';
assert.ok(validateReporterBriefing(pseudoPrecision, caseItem).some(error => /placement.x_level/.test(error)));

const missingMatrixColumn = structuredClone(spec);
missingMatrixColumn.threads[0].cells.pop();
assert.ok(validateReporterBriefing(missingMatrixColumn, caseItem).some(error => /missing matrix column/.test(error)));

const unsafePath = structuredClone(spec);
unsafePath.output_path = '../brief.html';
assert.ok(validateReporterBriefing(unsafePath, caseItem).some(error => /safe briefs/.test(error)));

const mismatchedAsOf = structuredClone(spec);
mismatchedAsOf.as_of = '2026-07-16';
assert.ok(validateReporterBriefing(mismatchedAsOf, caseItem).some(error => /as_of must match compiled case as_of/.test(error)));
assert.throws(() => compileReporterBriefing(mismatchedAsOf, caseItem), /as_of must match compiled case as_of/);

const receiptlessCase = structuredClone(caseItem);
const receiptlessClaim = receiptlessCase.events
  .flatMap(event => event.claims ?? [])
  .find(claim => claim.claim_id === 'clm-army-enterprise-vehicle');
receiptlessClaim.receipt_ids = [];
assert.ok(validateReporterBriefing(spec, receiptlessCase).some(error => /briefing claim .* has no receipts/.test(error)));
assert.throws(() => compileReporterBriefing(spec, receiptlessCase), /briefing claim .* has no receipts/);

const inheritedBoundaryCase = structuredClone(caseItem);
const inheritedClaim = inheritedBoundaryCase.events
  .flatMap(event => event.claims ?? [])
  .find(claim => claim.claim_id === 'clm-army-enterprise-vehicle');
delete inheritedClaim.qualification;
assert.deepEqual(validateReporterBriefing(spec, inheritedBoundaryCase), []);
const inheritedCompilation = compileReporterBriefing(spec, inheritedBoundaryCase);
assert.equal(inheritedCompilation.manifest.counts.inherited_qualifications, 1);
assert.deepEqual(inheritedCompilation.manifest.inherited_qualification_claim_ids, ['clm-army-enterprise-vehicle']);
assert.match(inheritedCompilation.html, /Case-wide boundary/);
assert.ok(reporterBriefingQueueEntry(inheritedCompilation.manifest).blocking_reasons.includes('1_qualifications_inherited_from_case_boundary'));

const unboundedCase = structuredClone(inheritedBoundaryCase);
unboundedCase.boundary = '';
unboundedCase.disclaimer = '';
assert.ok(validateReporterBriefing(spec, unboundedCase).some(error => /lacks a claim qualification or case-wide boundary/.test(error)));
assert.throws(() => compileReporterBriefing(spec, unboundedCase), /lacks a claim qualification or case-wide boundary/);

const editorialTarget = structuredClone(spec);
editorialTarget.records_target = {
  text: 'Acquire the signed decision file and the complete alternatives analysis.',
  qualification: 'This is a records target, not a factual finding.'
};
assert.deepEqual(validateReporterBriefing(editorialTarget, caseItem), []);
const editorialCompilation = compileReporterBriefing(editorialTarget, caseItem);
assert.equal(editorialCompilation.manifest.records_target.source, 'editorial');
assert.match(editorialCompilation.html, /This is a records target, not a factual finding/);
assert.ok(!editorialCompilation.manifest.claim_ids.includes('clm-decisive-records'));

const trailCase = structuredClone(caseItem);
trailCase.trails = [{
  trail_id: 'trail-test-records',
  label: 'Test records trail',
  status: 'open',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}];
const trailSpec = structuredClone(spec);
trailSpec.workplan[0].trail_ids = ['trail-test-records'];
assert.deepEqual(validateReporterBriefing(trailSpec, trailCase), []);
const trailCompilation = compileReporterBriefing(trailSpec, trailCase);
assert.equal(trailCompilation.manifest.counts.source_trails, 1);
assert.deepEqual(trailCompilation.manifest.source_trail_ids, ['trail-test-records']);
assert.match(trailCompilation.html, /data-trail-id="trail-test-records"/);
const graphActiveTrailCase = structuredClone(trailCase);
graphActiveTrailCase.trails[0].graph_effect = 'context';
assert.ok(validateReporterBriefing(trailSpec, graphActiveTrailCase).some(error => /graph-active trail/.test(error)));

const unreviewedApproval = structuredClone(spec);
unreviewedApproval.publication.status = 'approved';
unreviewedApproval.publication.history.at(-1).status = 'approved';
unreviewedApproval.publication.reviewer = null;
unreviewedApproval.publication.reviewed_at = null;
const approvalErrors = validateReporterBriefing(unreviewedApproval, { ...caseItem, status: 'approved' });
assert.ok(approvalErrors.some(error => /requires publication.reviewer/.test(error)));
assert.ok(approvalErrors.some(error => /requires publication.reviewed_at/.test(error)));

const arcadiaSpec = readJson('cases/arcadia-field-autopsy/briefing.json');
const arcadiaCase = readJson('build/cases/arcadia-field-autopsy.json');
assert.deepEqual(validateReporterBriefing(arcadiaSpec, arcadiaCase), []);
const arcadiaCompilation = compileReporterBriefing(arcadiaSpec, arcadiaCase);
assert.equal(arcadiaCompilation.manifest.counts.threads, 6);
assert.equal(arcadiaCompilation.manifest.counts.matrix_cells, 30);
assert.equal(arcadiaCompilation.manifest.counts.sequence_events, 19);
assert.equal(arcadiaCompilation.manifest.counts.controls, 3);
assert.equal(arcadiaCompilation.manifest.counts.workplan_items, 8);
assert.equal(arcadiaCompilation.manifest.counts.source_trails, 9);
assert.ok(arcadiaCompilation.manifest.counts.inherited_qualifications > 0);
assert.equal(arcadiaCompilation.manifest.records_target.source, 'editorial');
assert.match(arcadiaCompilation.html, /The Arcadia Formation/);
assert.match(arcadiaCompilation.html, /Recover the deed chain before interpreting ownership concentration/);
assert.match(arcadiaCompilation.html, /data-trail-id="trail-deed-chronology"/);
assert.match(arcadiaCompilation.html, /Case-wide boundary/);
const arcadiaQueue = reporterBriefingQueueEntry(arcadiaCompilation.manifest);
assert.ok(arcadiaQueue.blocking_reasons.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.equal(arcadiaQueue.eligible_for_approval, false);

for (const [sourceSpec, compiled] of [[spec, { html, manifest }], [arcadiaSpec, arcadiaCompilation]]) {
  const emitted = fs.readFileSync(path.join(root, sourceSpec.output_path), 'utf8');
  assert.equal(emitted, compiled.html);
  const emittedManifest = readJson(`build/briefings/${sourceSpec.briefing_id}.json`);
  assert.deepEqual(emittedManifest, compiled.manifest);
}

const reviewQueue = readJson('build/review/reporter-briefing-queue.json');
assert.equal(reviewQueue.totals.briefings, 2);
assert.equal(reviewQueue.totals.approved, 0);
assert.equal(reviewQueue.totals.review_required, 2);
assert.equal(reviewQueue.totals.eligible_for_approval, 0);
assert.ok(reviewQueue.queue.find(item => item.briefing_id === 'anduril-access-ownership').blocking_reasons.includes('9_claims_review_required'));
assert.ok(reviewQueue.queue.find(item => item.briefing_id === 'arcadia-field-autopsy').blocking_reasons.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));

console.log('reporter-briefing: OK');
