// Wave 19 clean-head validation kick; removed in the next commit.
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

run('tools/validate-lake-generator-contracts-wave-19.mjs');
const policy = readJson('data/project/lake-generator-contracts-wave-19-policy.json');
const preflight = readJson(policy.paths.preflight);
const registry = readJson(policy.paths.registry);
const receipt = readJson(policy.paths.receipt);

assert.equal(preflight.counts.generator_action_rows, 411);
assert.equal(preflight.counts.distinct_generator_contracts, 18);
assert.equal(preflight.counts.generator_contract_links, 462);
assert.equal(preflight.counts.exact_path_contracts, 12);
assert.equal(preflight.counts.projection_family_contracts, 6);
assert.equal(registry.contracts.length, 18);
assert.equal(registry.action_closures.length, 411);
assert.equal(registry.counts.action_to_contract_links, 462);
assert.equal(registry.counts.open_generator_actions_before, 411);
assert.equal(registry.counts.open_generator_actions_after, 0);
assert.ok(registry.counts.registered_variants > 0);
const exactContracts = registry.contracts.filter(row => row.contract_kind === 'exact_path_uniqueness_or_version');
const familyContracts = registry.contracts.filter(row => row.contract_kind === 'family_schema_or_version');
assert.equal(exactContracts.length, 12);
assert.equal(familyContracts.length, 6);
assert.ok(exactContracts.every(row => row.serialization_contract.object_hash_enforced === true));
assert.ok(exactContracts.every(row => row.variants.every(variant => variant.object_hash_enforced === true && typeof variant.object_hash === 'string')));
assert.ok(familyContracts.every(row => row.serialization_contract.object_hash_enforced === false));
assert.ok(familyContracts.every(row => row.variants.every(variant => variant.object_hash_enforced === false && !Object.hasOwn(variant, 'object_hash'))));
assert.equal(registry.action_closures.filter(row => row.current_action_open).length, 0);
assert.equal(registry.action_closures.filter(row => row.review_required_to_decide).length, 0);
assert.equal(registry.action_closures.filter(row => row.graph_effect !== 'none').length, 0);
assert.equal(receipt.post_execution_reconciliation_complete, true);
assert.equal(receipt.counts.after.open_generator_actions, 0);
assert.equal(receipt.counts.contracts_observed, 18);
assert.equal(receipt.counts.action_closures_observed, 411);
assert.equal(receipt.counts.decisions_requiring_human_permission, 0);
assert.equal(receipt.boundaries.cross_family_hash_equality_required, false);
assert.equal(receipt.boundaries.graph_effect, 'none');

const scopes = new Set(registry.contracts.map(row => `${row.scope_type}:${row.scope_value}`));
assert.ok(scopes.has('projection_family:build/lake-actions'));
assert.ok(scopes.has('projection_family:build/core-thesis'));
assert.ok(scopes.has('exact_projection_path:build/unresolved-subject-adjudication-wave-15.json'));
assert.ok(scopes.has('exact_projection_path:build/lake-actions/unclassified-path-dispositions.jsonl'));

console.log(`lake-generator-contracts-wave-19.test: OK (18 contracts, 411 actions closed, ${registry.counts.registered_variants} variants, graph effect none)`);
