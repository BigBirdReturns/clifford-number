#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadState,
  validateArtifacts
} from '../tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs';

function cloneState(state) {
  const clone = structuredClone({ ...state, snapshotRawByPath: undefined });
  clone.snapshotRawByPath = Object.fromEntries(Object.entries(state.snapshotRawByPath).map(([key, value]) => [key, Buffer.from(value)]));
  return clone;
}

const baseline = loadState();
const baselineErrors = validateArtifacts(baseline);
assert.deepEqual(baselineErrors, [], 'sealed Wave 32 baseline must validate');

const mutations = [];
const add = (name, mutate) => mutations.push({ name, mutate });
const firstPublicSpec = state => state.snapshotPlan.snapshot_specs.find(row => row.capture_mode === 'public_http');
const firstCredentialSpec = state => state.snapshotPlan.snapshot_specs.find(row => row.capture_mode === 'credential_boundary');
const firstPublicRow = state => state.snapshotRows.find(row => row.capture_mode === 'public_http');
const firstCredentialRow = state => state.snapshotRows.find(row => row.capture_mode === 'credential_boundary');
const firstResult = state => Object.values(state.resultRowsByPath).flat().find(row => row.row_type === 'bounded_source_snapshot_task_result' && row.source_refs.length > 0);
const firstSummary = state => Object.values(state.resultRowsByPath).flat().find(row => row.row_type === 'bounded_source_snapshot_route_summary');

add('policy schema', state => { state.policy.schema_version = 'broken'; });
add('policy wave', state => { state.policy.wave_ref = 'LAW-W99'; });
add('policy expected source count', state => { state.policy.expected_counts.source_receipts += 1; });
add('policy state mapping', state => { state.policy.state_mapping.partial_public_recovery = 'promoted'; });
add('policy evidence boundary', state => { state.policy.boundaries.snapshot_result_is_evidence_row = true; });
add('policy graph boundary', state => { state.policy.boundaries.graph_effect = 'added'; });
add('allowed capture state', state => { state.policy.allowed_capture_states = state.policy.allowed_capture_states.filter(value => value !== firstPublicRow(state).capture_state); });
add('snapshot plan schema', state => { state.snapshotPlan.schema_version = 'broken'; });
add('snapshot plan denominator', state => { state.snapshotPlan.snapshot_specs.pop(); });
add('duplicate snapshot ref', state => { state.snapshotPlan.snapshot_specs[1].snapshot_ref = state.snapshotPlan.snapshot_specs[0].snapshot_ref; });
add('duplicate source ref', state => { state.snapshotPlan.snapshot_specs[1].source_ref = state.snapshotPlan.snapshot_specs[0].source_ref; });
add('snapshot source title', state => { firstPublicSpec(state).source_title = 'wrong'; });
add('snapshot request method', state => { firstPublicSpec(state).request.method = 'DELETE'; });
add('snapshot insecure URL', state => { firstPublicSpec(state).request.url = 'http://example.invalid'; });
add('snapshot secret header', state => { firstPublicSpec(state).request.headers.authorization = 'secret'; });
add('credential request added', state => { firstCredentialSpec(state).request = { method: 'GET', url: 'https://example.invalid' }; });
add('credential requirement removed', state => { delete firstCredentialSpec(state).credential_requirement; });
add('required control removed', state => { state.snapshotPlan.required_success_snapshot_refs.pop(); });
add('source plan schema', state => { state.sourcePlan.schema_version = 'broken'; });
add('source projection schema', state => { state.sourceProjection.schema_version = 'broken'; });
add('source task denominator', state => { state.sourceProjection.counts.source_tasks += 1; });
add('snapshot row denominator', state => { state.snapshotRows.pop(); });
add('snapshot row schema', state => { firstPublicRow(state).schema_version = 'broken'; });
add('snapshot row source ref', state => { firstPublicRow(state).source_ref = 'LAW31-S999'; });
add('snapshot row capture state', state => { firstPublicRow(state).capture_state = 'invented'; });
add('snapshot row timestamp', state => { firstPublicRow(state).observed_at = 'not-a-date'; });
add('snapshot row authority', state => { firstPublicRow(state).evidence_adjudicated = true; });
add('snapshot request URL custody', state => { firstPublicRow(state).request.url += '?drift=1'; });
add('snapshot request body hash', state => { firstPublicRow(state).request.body_sha256 = '0'.repeat(64); });
add('snapshot request fingerprint', state => { firstPublicRow(state).request.fingerprint_sha256 = '1'.repeat(64); });
add('snapshot attempts', state => { firstPublicRow(state).attempts = 0; });
add('snapshot response path', state => { firstPublicRow(state).response_body_path = 'data/acquisition/wrong.json'; });
add('snapshot response hash', state => { firstPublicRow(state).response_body_sha256 = '2'.repeat(64); });
add('snapshot response bytes', state => { firstPublicRow(state).response_body_bytes += 1; });
add('required success demoted', state => {
  const ref = state.snapshotPlan.required_success_snapshot_refs[0];
  state.snapshotRows.find(row => row.snapshot_ref === ref).capture_state = 'captured_unparsed_response';
});
add('credential executes request', state => { firstCredentialRow(state).attempts = 1; });
add('credential manufactures body', state => { firstCredentialRow(state).response_body_path = 'data/acquisition/fake.json'; });
add('raw snapshot bytes changed', state => {
  const row = firstPublicRow(state);
  state.snapshotRawByPath[row.response_body_path] = Buffer.concat([state.snapshotRawByPath[row.response_body_path], Buffer.from('x')]);
});
add('projection schema', state => { state.projection.schema_version = 'broken'; });
add('projection source count', state => { state.projection.counts.source_receipts += 1; });
add('projection task states', state => { state.projection.counts.task_result_states = {}; });
add('projection graph digest', state => { state.projection.graph_digests.hop_edges_sha256 = '3'.repeat(64); });
add('projection per-task dispatch', state => { state.projection.execution_contract.manual_per_task_network_dispatch_required = true; });
add('projection network refetch', state => { state.projection.execution_contract.release_validation_refetches_network = true; });
add('task result state', state => { firstResult(state).result_state = 'promoted'; });
add('task evidence authority', state => { firstResult(state).evidence_adjudicated = true; });
add('task source refs', state => { firstResult(state).source_refs = []; });
add('task snapshot refs', state => { firstResult(state).snapshot_refs = []; });
add('route summary authority', state => { firstSummary(state).finding_promotions = 1; });
add('Wave 21 snapshot boundary', state => { state.wave21Policy.boundaries.wave_32_snapshot_result_is_evidence_row = true; });
add('Wave 21 credential boundary', state => { state.wave21Policy.boundaries.wave_32_credential_boundary_is_no_records = true; });
add('Wave 21 basin prefix', state => {
  const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
  basin.path_prefixes = basin.path_prefixes.filter(value => value !== state.policy.paths.snapshot_ledger);
});
add('Wave 21 basin entrypoint', state => {
  const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
  basin.authoritative_entrypoints = basin.authoritative_entrypoints.filter(value => value !== state.policy.paths.snapshot_ledger);
});
add('Wave 21 generated path', state => {
  state.wave21Policy.projection_contract.allowed_generated_paths = state.wave21Policy.projection_contract.allowed_generated_paths.filter(value => value !== state.policy.paths.projection);
});
add('lake authoritative root', state => { state.lakeIndexPolicy.authoritative_roots = state.lakeIndexPolicy.authoritative_roots.filter(value => value !== state.policy.paths.projection); });
add('installer registration', state => { state.installerText = state.installerText.replace(state.policy.paths.projection, 'missing-wave32-projection'); });
add('package acquisition script', state => { state.pkg.scripts['acquire:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'false'; });
add('package validator script', state => { state.pkg.scripts['validate:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'false'; });
add('release gate', state => { state.pkg.scripts.check = state.pkg.scripts.check.replace(' && npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32', ''); });
add('temporary transport survives', state => { state.repositoryFiles.push('.github/tmp/wave32-carrier.json'); });

for (const { name, mutate } of mutations) {
  const state = cloneState(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, `${name}: mutation was not rejected`);
}

console.log(`allocator-war bounded source snapshots Wave 32 adversarial mutations passed: ${mutations.length}`);
