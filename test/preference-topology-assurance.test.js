import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceTopologyAssuranceFixture,
  validatePreferenceTopologyAssuranceFixture,
  validatePreferenceTopologyAssuranceBuild
} from '../tools/lib/preference-topology-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-topology-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/topology-assurance.fixture.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-topology-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-topology-assurance.md', 'utf8');

assert.deepEqual(validatePreferenceTopologyAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceTopologyAssuranceBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-topology-verified-status-different-provenance-v1');
assert.equal(compiled.schema_version, 'preference-topology-assurance-build@1');
assert.equal(compiled.status, 'network_topology_identity_boundary_edge_temporal_reconstruction_and_path_assurance_qualified');
assert.equal(compiled.issue, 769);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.topology_provenance_signature_sha256)).size, 8);

const expectedMetrics = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_topology_provenance_signatures": 8,
  "complete_topology_assurance_worlds": 1,
  "identity_collision_fragmentation_worlds": 1,
  "boundary_truncation_worlds": 1,
  "differential_edge_censoring_worlds": 1,
  "structural_collapse_worlds": 1,
  "stale_nonconcurrent_topology_worlds": 1,
  "endogenous_rewiring_worlds": 1,
  "unvalidated_reconstruction_worlds": 1,
  "identity_resolution_complete_worlds": 7,
  "boundary_coverage_complete_worlds": 7,
  "edge_ascertainment_complete_worlds": 4,
  "layer_fidelity_complete_worlds": 7,
  "temporal_alignment_complete_worlds": 6,
  "pre_treatment_topology_complete_worlds": 6,
  "reconstruction_validation_complete_worlds": 7,
  "dynamic_exposure_complete_worlds": 1,
  "hidden_edge_audit_complete_worlds": 1,
  "path_validity_complete_worlds": 1,
  "current_topology_lineage_complete_worlds": 7,
  "total_false_merged_nodes": 20,
  "total_false_split_nodes": 20,
  "total_external_nodes_omitted": 30,
  "total_missing_true_edges": 1000,
  "total_censored_edges": 300,
  "total_direction_lost_edges": 400,
  "total_weight_lost_edges": 400,
  "total_layer_collapsed_edges": 400,
  "total_stale_edges": 600,
  "total_nonconcurrent_paths": 80,
  "total_rewired_edges": 200,
  "total_imputed_edges": 500,
  "total_false_positive_edges": 400,
  "total_false_negative_edges": 1000,
  "total_misclassified_exposure_paths": 340,
  "total_unsupported_topology_decisions": 700,
  "binding_public_authority_worlds": 0
};
assert.deepEqual(compiled.metrics, expectedMetrics);

for (const key of [
  "one_hundred_percent_node_coverage_identifies_complete_network_coverage",
  "stable_node_count_identifies_stable_identity",
  "declared_analytic_boundary_identifies_operational_system_boundary",
  "binary_adjacency_identifies_direction_sign_weight_layer_hyperedge_and_context_fidelity",
  "three_snapshots_identify_temporally_feasible_paths",
  "current_topology_identifies_pre_treatment_topology",
  "high_stability_coefficient_identifies_stable_edge_identity_and_path_validity",
  "observed_edge_identifies_true_edge_when_ascertainment_or_censoring_unresolved",
  "reconstructed_edge_identifies_observed_or_independently_validated_edge",
  "model_fit_identifies_path_validity",
  "post_assignment_topology_identifies_exogenous_exposure_map",
  "zero_published_missing_edges_identifies_zero_true_missing_edges",
  "public_topology_verified_status_identifies_complete_current_dynamic_correctable_authorized_evidence",
  "topology_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed"
].concat(['preference_change_present'])) {
  assert.equal(compiled.classification[key], false, `${key} must remain false`);
}
assert.equal(compiled.classification.complete_topology_assurance_supported_in_at_least_one_world, true);

const byId = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
assert.equal(byId['complete-identity-boundary-multiplex-temporal-dynamic-topology'].flags.complete_topology_assurance, true);
assert.equal(byId['identity-collision-and-fragmentation'].flags.identity_collision_fragmentation_present, true);
assert.equal(byId['identity-collision-and-fragmentation'].identity.false_merged_node_count, 20);
assert.equal(byId['identity-collision-and-fragmentation'].identity.false_split_node_count, 20);
assert.equal(byId['boundary-truncation-and-omitted-bridging-ties'].flags.boundary_truncation_present, true);
assert.equal(byId['boundary-truncation-and-omitted-bridging-ties'].boundary.omitted_external_node_count, 30);
assert.equal(byId['differential-edge-censoring-and-reporting'].flags.differential_edge_censoring_present, true);
assert.equal(byId['differential-edge-censoring-and-reporting'].edges.censored_edge_count, 300);
assert.equal(byId['direction-sign-weight-layer-and-hyperedge-collapse'].flags.structural_collapse_present, true);
assert.equal(byId['direction-sign-weight-layer-and-hyperedge-collapse'].edges.layer_collapsed_edge_count, 400);
assert.equal(byId['stale-snapshots-and-nonconcurrent-temporal-paths'].flags.stale_nonconcurrent_topology_present, true);
assert.equal(byId['stale-snapshots-and-nonconcurrent-temporal-paths'].temporal.stale_edge_count, 600);
assert.equal(byId['stale-snapshots-and-nonconcurrent-temporal-paths'].temporal.nonconcurrent_path_count, 80);
assert.equal(byId['post-assignment-endogenous-rewiring'].flags.endogenous_rewiring_present, true);
assert.equal(byId['post-assignment-endogenous-rewiring'].rewiring.post_assignment_rewired_edge_count, 200);
assert.equal(byId['unvalidated-model-reconstructed-edges-and-paths'].flags.unvalidated_reconstruction_present, true);
assert.equal(byId['unvalidated-model-reconstructed-edges-and-paths'].edges.imputed_edge_count, 500);
assert.equal(byId['unvalidated-model-reconstructed-edges-and-paths'].edges.false_positive_edge_count, 400);

for (const world of compiled.worlds) {
  assert.equal(world.custody_chain.length, 10);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.topology_provenance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(compiled.worlds[0].custody_chain[0].event_type, 'topology_publication_surface_frozen');
assert.equal(compiled.worlds[0].custody_chain[3].event_type, 'edge_ascertainment_structure_and_missingness_state');
assert.equal(compiled.worlds[0].custody_chain[6].event_type, 'path_feasibility_hidden_edge_and_dynamic_exposure_state');
assert.equal(compiled.worlds[0].custody_chain[9].event_type, 'topology_provenance_mechanism_classified');

assert.match(markdown, /Topology measurement error, hidden-edge, and dynamic-exposure custody/);
assert.match(markdown, /Worlds:\*\* 8/);
assert.match(markdown, /total_missing_true_edges: 1000/);
assert.match(markdown, /total_misclassified_exposure_paths: 340/);
assert.match(markdown, /unvalidated-model-reconstructed-edges-and-paths/);
assert.doesNotMatch(markdown, /named network caused|actual manipulation|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceTopologyAssuranceFixture(graphLeak).some(error => /status or graph effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 768;
assert.ok(validatePreferenceTopologyAssuranceFixture(issueLeak).some(error => /issue lineage/.test(error)));

const baselineDrift = structuredClone(fixture);
baselineDrift.baseline.published_edges = 999;
assert.ok(validatePreferenceTopologyAssuranceFixture(baselineDrift).some(error => /baseline contract/.test(error)));

const publicSurfaceDrift = structuredClone(fixture);
publicSurfaceDrift.worlds[1].overrides.public_claim = { published_missing_edges: 20 };
assert.ok(validatePreferenceTopologyAssuranceFixture(publicSurfaceDrift).some(error => /frozen topology-publication surface/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceTopologyAssuranceFixture(missingWorld).some(error => /eight required/.test(error)));

const duplicateWorld = structuredClone(fixture);
duplicateWorld.worlds[7].world_id = duplicateWorld.worlds[0].world_id;
assert.ok(validatePreferenceTopologyAssuranceFixture(duplicateWorld).some(error => /eight required|unique/.test(error)));

const edgeReconciliationLeak = structuredClone(fixture);
edgeReconciliationLeak.worlds[2].overrides.edges.false_negative_edge_count = 399;
assert.ok(validatePreferenceTopologyAssuranceFixture(edgeReconciliationLeak).some(error => /must reconcile/.test(error)));

const rewiringReconciliationLeak = structuredClone(fixture);
rewiringReconciliationLeak.worlds[6].overrides.rewiring.created_edge_count = 119;
assert.ok(validatePreferenceTopologyAssuranceFixture(rewiringReconciliationLeak).some(error => /rewiring counts must reconcile/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].overrides.governance = { binding_public_authority: true };
assert.ok(validatePreferenceTopologyAssuranceFixture(authorityLeak).some(error => /binding public authority/.test(error)));

const omittedRule = structuredClone(fixture);
omittedRule.required_refusal_rules.pop();
assert.ok(validatePreferenceTopologyAssuranceFixture(omittedRule).some(error => /required refusal rule missing/.test(error)));

const falseClassificationLeak = structuredClone(fixture);
falseClassificationLeak.expected_classification.model_fit_identifies_path_validity = true;
assert.ok(validatePreferenceTopologyAssuranceFixture(falseClassificationLeak).some(error => /must remain false/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds[1].expected_flags.identity_resolution_complete = true;
assert.throws(() => compilePreferenceTopologyAssuranceFixture(expectedFlagLeak), /flag identity_resolution_complete mismatch/);

const metricLeak = structuredClone(compiled);
metricLeak.metrics.total_missing_true_edges = 999;
assert.ok(validatePreferenceTopologyAssuranceBuild(metricLeak).some(error => /total_missing_true_edges/.test(error)));

const buildAuthorityLeak = structuredClone(compiled);
buildAuthorityLeak.classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceTopologyAssuranceBuild(buildAuthorityLeak).some(error => /must remain false/.test(error)));

const chainLeak = structuredClone(compiled);
chainLeak.worlds[0].custody_chain[4].payload.temporal.stale_edge_count = 1;
assert.ok(validatePreferenceTopologyAssuranceBuild(chainLeak).some(error => /hash mismatch/.test(error)));

const custodyHeadLeak = structuredClone(compiled);
custodyHeadLeak.worlds[0].custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceTopologyAssuranceBuild(custodyHeadLeak).some(error => /custody head mismatch/.test(error)));

const signatureLeak = structuredClone(compiled);
signatureLeak.worlds[0].topology_provenance_signature_sha256 = 'invalid';
assert.ok(validatePreferenceTopologyAssuranceBuild(signatureLeak).some(error => /signature is invalid/.test(error)));

console.log('Preference topology assurance adversarial tests: PASS');
