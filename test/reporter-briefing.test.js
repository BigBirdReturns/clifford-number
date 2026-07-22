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

const root = path.resolve(import.meta.dirname, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
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
assert.equal(manifest.counts.claims, 24);
assert.equal(manifest.counts.verified_claims, 15);
assert.equal(manifest.counts.review_required_claims, 9);
assert.equal(manifest.counts.receipts, 22);
assert.equal(manifest.counts.public_receipts, 21);
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

const unreviewedApproval = structuredClone(spec);
unreviewedApproval.publication.status = 'approved';
unreviewedApproval.publication.history.at(-1).status = 'approved';
unreviewedApproval.publication.reviewer = null;
unreviewedApproval.publication.reviewed_at = null;
const approvalErrors = validateReporterBriefing(unreviewedApproval, { ...caseItem, status: 'approved' });
assert.ok(approvalErrors.some(error => /requires publication.reviewer/.test(error)));
assert.ok(approvalErrors.some(error => /requires publication.reviewed_at/.test(error)));

const emitted = fs.readFileSync(path.join(root, spec.output_path), 'utf8');
assert.equal(emitted, html);
const emittedManifest = readJson('build/briefings/anduril-access-ownership.json');
assert.deepEqual(emittedManifest, manifest);
const reviewQueue = readJson('build/review/reporter-briefing-queue.json');
assert.equal(reviewQueue.totals.briefings, 1);
assert.equal(reviewQueue.totals.approved, 0);
assert.equal(reviewQueue.totals.review_required, 1);
assert.equal(reviewQueue.totals.eligible_for_approval, 0);
assert.ok(reviewQueue.queue[0].blocking_reasons.includes('9_claims_review_required'));

console.log('reporter-briefing: OK');
