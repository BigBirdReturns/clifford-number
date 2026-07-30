import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function run(file) {
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  assert.equal(result.status, 0, `${file} failed`);
}

run('tools/validate-lake-identifier-topology-wave-18.mjs');
const policy = readJson('data/project/lake-identifier-topology-wave-18-policy.json');
const preflight = readJson(policy.paths.preflight);
const registry = readJson(policy.paths.registry);
const receipt = readJson(policy.paths.receipt);
const triggerPath = '.github/tmp/lake-identifier-topology-wave-18-trigger.json';
const preliminaryReceiptAuthorized = receipt.post_execution_reconciliation_complete !== true
  && process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_WORKFLOW === 'Evidence lake identifier topology Wave 18'
  && process.env.GITHUB_EVENT_NAME === 'push'
  && fs.existsSync(triggerPath)
  && receipt.after_counts === null;
const byKey = new Map();
for (const row of registry.records) {
  const list = byKey.get(row.id_key) ?? [];
  list.push(row);
  byKey.set(row.id_key, list);
}

const frozenRows = preflight.counts.frozen_union;
const postFreezeRows = registry.counts.post_freeze_records ?? 0;
assert.equal(frozenRows, 10371);
assert.ok(registry.records.length >= frozenRows);
assert.equal(registry.records.length - frozenRows, postFreezeRows);
assert.equal(registry.counts.records, registry.records.length);
assert.equal(registry.counts.baseline_unindexed, 6661);
assert.equal(registry.counts.baseline_source_without_projection, 5612);
assert.equal(registry.counts.baseline_divergent_projections, 3129);
assert.equal(registry.counts.unclassified_source_only_rows, 0);
assert.equal(registry.counts.unadjudicated_divergence_rows, 0);
assert.equal(registry.records.filter(row => row.review_required_to_decide).length, 0);
assert.equal(registry.records.filter(row => row.graph_effect !== 'none').length, 0);
assert.equal(registry.records.filter(row => row.cross_key_join_authorized).length, 0);

assert.ok(byKey.get('metric_id')?.some(row => row.source_only?.final_classification === 'research_analysis_or_control_identifier_source_only'));
assert.ok(byKey.get('committee_id')?.some(row => row.source_only?.final_classification === 'external_or_domain_identifier_source_only'));
assert.ok(byKey.get('source_record_id')?.some(row => row.source_only?.final_classification === 'lineage_record_or_vocabulary_identifier_source_only'));
assert.ok(byKey.get('local_subject_id')?.some(row => row.divergence?.final_classification === 'same_path_contextual_projection_repetition'));
assert.ok(registry.records.some(row => row.divergence?.final_classification === 'typed_cross_family_projection_views'));
assert.ok(registry.records.some(row => row.divergence?.generator_contract_action_open === true));

if (preliminaryReceiptAuthorized) {
  assert.equal(registry.records.length, frozenRows);
  assert.equal(postFreezeRows, 0);
  assert.equal(receipt.counts.records, frozenRows);
  assert.equal(receipt.counts.unclassified_source_only_rows, 0);
  assert.equal(receipt.counts.unadjudicated_divergence_rows, 0);
  assert.equal(receipt.counts.decisions_requiring_human_permission, 0);
  assert.equal(receipt.boundaries.graph_effect, 'none');
  console.log(`lake-identifier-topology-wave-18.test: OK (${frozenRows} frozen decisions, preliminary receipt authorized only inside the push materializer, graph effect none)`);
} else {
  assert.equal(receipt.post_execution_reconciliation_complete, true);
  assert.equal(receipt.counts.after.unindexed_machine_ids, 0);
  assert.equal(receipt.counts.after.unindexed_machine_ids_unadjudicated, 0);
  assert.equal(receipt.counts.after.source_ids_without_projection_unadjudicated, 0);
  assert.equal(receipt.counts.after.divergent_identifier_projections_unadjudicated, 0);
  assert.equal(receipt.counts.after.projection_ids_without_source, 0);
  assert.equal(receipt.counts.decisions_requiring_human_permission, 0);
  assert.equal(receipt.boundaries.graph_effect, 'none');
  console.log(`lake-identifier-topology-wave-18.test: OK (${frozenRows} frozen + ${postFreezeRows} post-freeze topology decisions, unindexed 0, source-only/divergence unadjudicated 0/0, graph effect none)`);
}
