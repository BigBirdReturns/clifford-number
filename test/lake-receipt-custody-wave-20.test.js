import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function run(file) {
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  assert.equal(result.status, 0, `${file} failed`);
}

run('tools/validate-lake-receipt-custody-wave-20.mjs');

const policy = readJson('data/project/lake-receipt-custody-wave-20-policy.json');
const decisions = readJsonl(policy.paths.registry);
const receipt = readJson(policy.paths.receipt);
const reconciliation = readJson(policy.paths.reconciliation);

assert.equal(decisions.length, 49);
assert.equal(new Set(decisions.map(row => row.receipt_custody_decision_id)).size, 49);
assert.equal(new Set(decisions.map(row => row.target_receipt_token)).size, 49);
assert.ok(decisions.some(row => row.custody_classification === 'compound_reference_encoding_defect'));
assert.ok(decisions.some(row => row.custody_classification === 'explicit_unresolved_custody'));
assert.ok(decisions.some(row => row.observed_content_hashes.length > 0));
assert.ok(decisions.some(row => row.locator_urls.length > 0));
assert.ok(decisions.filter(row => row.compound_reference).every(row => row.constituent_receipt_tokens.length >= 2));
assert.ok(decisions.filter(row => row.compound_reference).every(row => row.constituent_definitions.every(definition => definition.defined)));
assert.ok(decisions.every(row => row.current_custody_action_open === false));
assert.ok(decisions.every(row => row.consumer_attachment_created === false));
assert.ok(decisions.every(row => row.source_claim_or_receipt_mutated === false));
assert.ok(decisions.every(row => row.review_required_to_decide === false));
assert.ok(decisions.every(row => row.graph_effect === 'none'));

assert.equal(receipt.counts.raw_unused_receipt_definitions, 49);
assert.equal(receipt.counts.custody_decisions, 49);
assert.equal(receipt.counts.raw_unused_receipt_definitions_after, 49);
assert.equal(receipt.counts.unadjudicated_receipt_definitions_after, 0);
assert.equal(receipt.counts.decision_ids_source_observed, 49);
assert.equal(receipt.counts.decision_ids_projection_observed, 49);
assert.equal(receipt.counts.decision_ids_index_observed, 49);
assert.equal(receipt.counts.consumer_attachments_created, 0);
assert.equal(receipt.counts.source_claim_or_receipt_mutations, 0);
assert.equal(receipt.counts.decisions_requiring_human_permission, 0);
assert.equal(receipt.counts.relationship_delta, 0);
assert.equal(receipt.counts.participation_delta, 0);
assert.equal(receipt.counts.active_claim_delta, 0);
assert.equal(receipt.counts.graph_edge_delta, 0);
assert.equal(receipt.post_execution_reconciliation_complete, true);
assert.equal(receipt.source_projection_index_complete, true);
assert.equal(receipt.raw_unused_definition_count_forced_to_zero, false);
assert.equal(receipt.boundaries.graph_effect, 'none');

assert.equal(reconciliation.observations.length, 49);
assert.equal(reconciliation.completion.all_raw_unused_definitions_adjudicated, true);
assert.equal(reconciliation.completion.all_decisions_source_projected_indexed, true);
assert.equal(reconciliation.completion.raw_unused_definition_count_forced_to_zero, false);
assert.equal(reconciliation.completion.source_claim_or_receipt_mutations, 0);
assert.equal(reconciliation.completion.review_required_to_decide, false);
assert.equal(reconciliation.completion.graph_effect, 'none');

console.log(`lake-receipt-custody-wave-20.test: OK (49 decisions, ${receipt.counts.compound_reference_encoding_defects} compound encoding defects, raw denominator preserved, graph effect none)`);
