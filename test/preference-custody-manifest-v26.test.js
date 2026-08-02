import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV26,
  validatePreferenceCustodyManifestV26Build
} from '../tools/lib/preference-custody-manifest-v26.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v26.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v26.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v26.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v26.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV26(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV26Build(compiled), []);
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v26-build@1');
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v26');
assert.equal(compiled.status, 'laboratory_floor_v26_qualified');
assert.equal(compiled.control_issue, 769);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_count, 28);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), [
  "PC-01",
  "PC-02",
  "PC-03",
  "PC-04",
  "PC-05",
  "PC-06",
  "PC-07",
  "PC-08",
  "PC-09",
  "PC-10",
  "PC-11",
  "PC-12",
  "PC-13",
  "PC-14",
  "PC-15",
  "PC-16",
  "PC-17",
  "PC-18",
  "PC-19",
  "PC-20",
  "PC-21",
  "PC-22",
  "PC-23",
  "PC-24",
  "PC-25",
  "PC-26",
  "PC-27",
  "PC-28"
].sort());

assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v25');
assert.equal(compiled.composition.base_schema_version, 'preference-custody-control-manifest-v25-build@1');
assert.equal(compiled.composition.base_control_count, 27);
assert.equal(compiled.composition.extension_control_id, 'PC-28');
assert.equal(compiled.composition.added_promotion_requirement_count, 60);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 60);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);

for (const [key, value] of Object.entries(compiled.control_integrity)) {
  assert.equal(value, true, `control integrity ${key} must remain true`);
}
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.ok(compiled.promotion_boundary.real_case_requires.includes('topology_assurance_observed_node_record_identity_rule_version_and_denominator'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('topology_assurance_identity_boundary_edge_temporal_reconstruction_path_lineage_consequence_and_interpretation_chain_history'));
assert.equal(new Set(compiled.promotion_boundary.real_case_requires).size, compiled.promotion_boundary.real_case_requires.length);

assert.ok(!compiled.open_frontiers.includes('network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance'));
assert.ok(compiled.open_frontiers.includes('identity_resolution_entity_boundary_and_network_frame_assurance'));
assert.ok(compiled.open_frontiers.includes('edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'));
assert.ok(compiled.open_frontiers.includes('saturation_general_equilibrium_and_interference_robust_policy_governance'));

const pc28 = compiled.controls.find(control => control.control_id === 'PC-28');
assert.ok(pc28);
assert.equal(pc28.fixture_id, 'same-topology-verified-status-different-provenance-v1');
assert.equal(pc28.failure_class, 'network_topology_measurement_error_hidden_edge_dynamic_exposure_and_path_validity_equifinality');
assert.equal(pc28.graph_effect, 'none');
assert.equal(pc28.counts_toward_thesis_evidence, false);
assert.equal(pc28.conclusion_generated, false);
assert.equal(pc28.real_world_effect_claimed, false);
assert.equal(pc28.preference_change_present, false);
assert.equal(pc28.manipulative_intent_inferable, false);
assert.deepEqual(
  Object.fromEntries(Object.keys({
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
}).map(key => [key, pc28.proof_summary[key]])),
  {
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
}
);
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
]) assert.equal(pc28.proof_summary[key], false);
assert.equal(pc28.proof_summary.complete_topology_assurance_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v25_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc28_identity_boundary_edge_temporal_reconstruction_path_and_dynamic_exposure_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'topology_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'topology_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain[4].event_type, 'interpretation_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v26/);
assert.match(markdown, /Controls:\*\* 28/);
assert.match(markdown, /PC-28: topology measurement error, hidden-edge, and dynamic exposure/);
assert.match(markdown, /total_missing_true_edges: 1000/);
assert.match(markdown, /total_misclassified_exposure_paths: 340/);
assert.doesNotMatch(markdown, /named network caused|actual manipulation|publicly authorized/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV26(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(manifest);
issueLeak.control_issue = 768;
assert.ok(validatePreferenceCustodyManifestV26(issueLeak).some(error => /control issue/.test(error)));

const baseLeak = structuredClone(manifest);
baseLeak.base_floor.expected_control_count = 26;
assert.ok(validatePreferenceCustodyManifestV26(baseLeak).some(error => /base floor contract/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.resolved_base_frontier = 'wrong_frontier';
assert.ok(validatePreferenceCustodyManifestV26(frontierLeak).some(error => /resolved frontier/.test(error)));

const successorLeak = structuredClone(manifest);
successorLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV26(successorLeak).some(error => /successor frontiers/.test(error)));

const requirementLeak = structuredClone(manifest);
requirementLeak.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV26(requirementLeak).some(error => /real-case requirements/.test(error)));

const requirementFormatLeak = structuredClone(manifest);
requirementFormatLeak.real_case_requirements_added[0] = 'Not-Machine-Addressable';
assert.ok(validatePreferenceCustodyManifestV26(requirementFormatLeak).some(error => /lowercase underscore/.test(error)));

const buildCountLeak = structuredClone(compiled);
buildCountLeak.control_count = 27;
assert.ok(validatePreferenceCustodyManifestV26Build(buildCountLeak).some(error => /twenty-eight controls/.test(error)));

const proofLeak = structuredClone(compiled);
proofLeak.controls.find(control => control.control_id === 'PC-28').proof_summary.total_missing_true_edges = 999;
assert.ok(validatePreferenceCustodyManifestV26Build(proofLeak).some(error => /PC-28 total_missing_true_edges/.test(error)));

const integrityLeak = structuredClone(compiled);
integrityLeak.control_integrity.base_integrity_preserved = false;
assert.ok(validatePreferenceCustodyManifestV26Build(integrityLeak).some(error => /base_integrity_preserved/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance');
assert.ok(validatePreferenceCustodyManifestV26Build(resolvedFrontierLeak).some(error => /resolved broad topology frontier/.test(error)));

const saturationLeak = structuredClone(compiled);
saturationLeak.open_frontiers = saturationLeak.open_frontiers.filter(frontier => frontier !== 'saturation_general_equilibrium_and_interference_robust_policy_governance');
assert.ok(validatePreferenceCustodyManifestV26Build(saturationLeak).some(error => /independent saturation frontier/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV26Build(authorityLeak).some(error => /must remain false/.test(error)));

const chainLeak = structuredClone(compiled);
chainLeak.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV26Build(chainLeak).some(error => /hash mismatch/.test(error)));

const headLeak = structuredClone(compiled);
headLeak.custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceCustodyManifestV26Build(headLeak).some(error => /custody head mismatch/.test(error)));

console.log('Preference custody laboratory floor v26 integration tests: PASS');
