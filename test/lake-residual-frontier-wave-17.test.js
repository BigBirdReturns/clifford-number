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

run('tools/validate-lake-residual-frontier-wave-17.mjs');
const policy = readJson('data/project/lake-residual-frontier-wave-17-policy.json');
const paths = readJson(policy.paths.path_registry);
const projections = readJson(policy.paths.projection_registry);
const receipt = readJson(policy.paths.receipt);
const pathByPath = new Map(paths.decisions.map(row => [row.path, row]));

assert.equal(pathByPath.get('data/crawl/candidates.jsonl').owner_program, 'official-crawl-program');
assert.equal(pathByPath.get('data/crawl/README.md').semantic_role, 'official_source_crawl_state');
assert.equal(pathByPath.get('data/signatures/formation-signatures.json').owner_program, 'formation-signature-program');
assert.equal(pathByPath.get('data/update-watchlist.json').owner_program, 'update-watchlist-program');
assert.equal(paths.decisions.filter(row => row.disposition.startsWith('typed_refusal')).length, 0);

assert.deepEqual(projections.counts.classification_counts, {
  cross_key_entity_projection: 743,
  cross_key_estate_projection: 66,
  deterministic_control_or_work_item_projection: 1181,
  external_schema_locator_projection: 2,
  report_or_program_projection_identity: 8
});
assert.equal(projections.records.filter(row => row.review_required_to_decide).length, 0);
assert.equal(projections.records.filter(row => row.graph_effect !== 'none').length, 0);
assert.ok(projections.records.every(row => row.source_object?.[row.id_key] === row.id_value));

const frontier = projections.records.find(row => row.id_key === 'canonical_subject_id' && row.id_value === 'aisi');
assert.ok(frontier);
assert.equal(frontier.classification, 'cross_key_entity_projection');
const queue = projections.records.find(row => row.id_key === 'queue_id');
assert.ok(queue);
assert.equal(queue.classification, 'deterministic_control_or_work_item_projection');
const estate = projections.records.find(row => row.id_key === 'target_estate_id');
assert.ok(estate);
assert.equal(estate.classification, 'cross_key_estate_projection');

assert.equal(receipt.counts.after.evidence_paths_without_program_owner, 0);
assert.equal(receipt.counts.after.exact_orphan_evidence_files, 0);
assert.equal(receipt.counts.after.evidence_paths_not_index_reachable, 0);
assert.equal(receipt.counts.after.projection_ids_without_source, 0);
assert.equal(receipt.counts.decisions_requiring_human_permission, 0);
assert.equal(receipt.boundaries.graph_effect, 'none');

console.log('lake-residual-frontier-wave-17.test: OK (601 path decisions, 2000 lineage records, all four frozen residual counts zero, graph effect none)');
