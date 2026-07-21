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
assert.equal(manifest.counts.claims, 15);
assert.equal(manifest.counts.verified_claims, 9);
assert.equal(manifest.counts.review_required_claims, 6);
assert.ok(manifest.counts.public_receipts >= 13);
assert.ok(manifest.review_required_claim_ids.includes('clm-axis-working-proposition'));
assert.ok(manifest.verified_claim_ids.includes('clm-army-enterprise-vehicle'));
assert.ok(!manifest.public_receipt_ids.includes('anduril-bundle-r3'));
assert.match(html, /Anduril: Access, Ownership, and the Government Gate/);
assert.match(html, /The March 2026 Army enterprise contract is a single-award/);
assert.match(html, /The \$20 billion figure is a maximum ceiling/);
assert.match(html, /Open evidence case/);
assert.match(html, /data-graph-effect="none"/);
assert.doesNotMatch(html, /href="undefined"/);

const queue = reporterBriefingQueueEntry(manifest);
assert.equal(queue.eligible_for_approval, false);
assert.ok(queue.blocking_reasons.includes('publication_status_review_required'));
assert.ok(queue.blocking_reasons.includes('independent_reviewer_missing'));

const missingClaim = structuredClone(spec);
missingClaim.threads[0].claim_ids.push('missing-claim');
assert.ok(validateReporterBriefing(missingClaim, caseItem).some(error => /missing claim missing-claim/.test(error)));

const unsafePath = structuredClone(spec);
unsafePath.output_path = '../brief.html';
assert.ok(validateReporterBriefing(unsafePath, caseItem).some(error => /safe briefs/.test(error)));

const unreviewedApproval = structuredClone(spec);
unreviewedApproval.publication.status = 'approved';
unreviewedApproval.publication.history[0].status = 'approved';
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

console.log('reporter-briefing: OK');
