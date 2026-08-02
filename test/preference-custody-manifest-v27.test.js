import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV27,
  validatePreferenceCustodyManifestV27Build
} from '../tools/lib/preference-custody-manifest-v27.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v27.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(
  readFileSync('data/research/preference-custody/control-manifest-v27.json', 'utf8')
);
const compiled = JSON.parse(
  readFileSync('build/research/preference-custody-laboratory-floor-v27.json', 'utf8')
);
const markdown = readFileSync(
  'build/research/preference-custody-laboratory-floor-v27.md',
  'utf8'
);

assert.deepEqual(validatePreferenceCustodyManifestV27(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV27Build(compiled), []);
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v27-build@1');
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v27');
assert.equal(compiled.status, 'laboratory_floor_v27_qualified');
assert.equal(compiled.control_issue, 780);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_count, 29);
assert.deepEqual(
  compiled.controls.map(control => control.control_id).sort(),
  Array.from({ length: 29 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`).sort()
);

assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v26');
assert.equal(compiled.composition.base_schema_version, 'preference-custody-control-manifest-v26-build@1');
assert.equal(compiled.composition.base_control_count, 28);
assert.equal(compiled.composition.extension_control_id, 'PC-29');
assert.equal(compiled.composition.added_promotion_requirement_count, 48);
assert.equal(
  compiled.composition.final_promotion_requirement_count,
  compiled.composition.base_promotion_requirement_count + 48
);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);

for (const [key, value] of Object.entries(compiled.control_integrity)) {
  assert.equal(value, true, `control integrity ${key} must remain true`);
}
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.ok(
  compiled.promotion_boundary.real_case_requires.includes(
    'identity_boundary_v27_observed_record_source_system_namespace_and_denominator'
  )
);
assert.ok(
  compiled.promotion_boundary.real_case_requires.includes(
    'identity_boundary_v27_record_identity_boundary_frame_membership_lineage_consequence_correction_and_interpretation_chain'
  )
);
assert.equal(
  new Set(compiled.promotion_boundary.real_case_requires).size,
  compiled.promotion_boundary.real_case_requires.length
);

assert.ok(
  !compiled.open_frontiers.includes(
    'identity_resolution_entity_boundary_and_network_frame_assurance'
  )
);
assert.ok(
  compiled.open_frontiers.includes(
    'record_linkage_namespace_temporal_identity_and_succession_assurance'
  )
);
assert.ok(
  compiled.open_frontiers.includes(
    'population_eligibility_membership_denominator_and_operational_frame_governance'
  )
);
assert.ok(
  compiled.open_frontiers.includes(
    'edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'
  )
);
assert.ok(
  compiled.open_frontiers.includes(
    'saturation_general_equilibrium_and_interference_robust_policy_governance'
  )
);

const pc29 = compiled.controls.find(control => control.control_id === 'PC-29');
assert.ok(pc29);
assert.equal(pc29.fixture_id, 'same-identity-verified-status-different-provenance-v1');
assert.equal(
  pc29.failure_class,
  'identity_resolution_entity_boundary_network_frame_population_denominator_and_membership_succession_equifinality'
);
assert.equal(pc29.graph_effect, 'none');
assert.equal(pc29.counts_toward_thesis_evidence, false);
assert.equal(pc29.conclusion_generated, false);
assert.equal(pc29.real_world_effect_claimed, false);
assert.equal(pc29.preference_change_present, false);
assert.equal(pc29.manipulative_intent_inferable, false);

const expectedMetrics = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_identity_boundary_provenance_signatures: 8,
  complete_identity_boundary_assurance_worlds: 1,
  false_merge_worlds: 1,
  false_split_worlds: 1,
  recycled_identifier_worlds: 1,
  boundary_truncation_worlds: 1,
  ineligible_inclusion_worlds: 1,
  frame_mismatch_worlds: 1,
  membership_drift_worlds: 1,
  one_to_one_identity_complete_worlds: 6,
  temporal_identity_complete_worlds: 7,
  boundary_coverage_complete_worlds: 7,
  frame_alignment_complete_worlds: 7,
  eligibility_complete_worlds: 7,
  membership_current_worlds: 7,
  denominator_valid_worlds: 5,
  current_identity_boundary_lineage_complete_worlds: 6,
  total_false_merged_entities: 20,
  total_false_split_entities: 20,
  total_recycled_identifiers: 15,
  total_omitted_external_entities: 30,
  total_omitted_bridge_entities: 15,
  total_ineligible_included_entities: 25,
  total_frame_misclassified_entities: 40,
  total_entered_entities: 20,
  total_exited_entities: 15,
  total_churned_entities: 35,
  total_stale_memberships: 35,
  total_denominator_drift: 35,
  total_unsupported_identity_boundary_decisions: 700,
  binding_public_authority_worlds: 0
};
for (const [key, value] of Object.entries(expectedMetrics)) {
  assert.equal(pc29.proof_summary[key], value, `PC-29 ${key}`);
}
for (const key of [
  'one_hundred_resolved_records_identifies_one_hundred_true_entities',
  'one_hundred_percent_identity_coverage_identifies_one_to_one_entity_resolution',
  'stable_node_count_identifies_stable_entity_identity_or_membership',
  'zero_published_duplicates_identifies_zero_false_merges',
  'zero_published_unresolved_identities_identifies_zero_false_splits_or_recycled_identifiers',
  'declared_operational_boundary_identifies_observed_operative_system_boundary',
  'administrative_roster_identifies_communication_exposure_market_household_or_institutional_population',
  'included_node_identifies_eligible_target_entity',
  'omitted_external_node_identifies_irrelevant_entity',
  'current_identifier_identifies_persistent_entity_across_succession',
  'frozen_denominator_identifies_current_population_under_entry_exit_churn_or_role_change',
  'public_identity_verified_status_identifies_complete_one_to_one_boundary_valid_frame_valid_current_correctable_authorized_evidence',
  'identity_or_boundary_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed',
  'preference_change_present'
]) assert.equal(pc29.proof_summary[key], false);
assert.equal(
  pc29.proof_summary.complete_identity_boundary_assurance_supported_in_at_least_one_world,
  true
);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v26_floor_snapshot');
assert.equal(
  compiled.custody_chain[1].event_type,
  'pc29_record_identity_entity_boundary_frame_membership_and_denominator_control_admitted'
);
assert.equal(compiled.custody_chain[2].event_type, 'identity_boundary_frontier_transition_sealed');
assert.equal(
  compiled.custody_chain[3].event_type,
  'identity_boundary_real_case_promotion_boundary_sealed'
);
assert.equal(compiled.custody_chain[4].event_type, 'interpretation_sealed');
assert.equal(
  compiled.custody_chain.at(-1).event_sha256,
  compiled.custody_chain_head_sha256
);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v27/);
assert.match(markdown, /Controls:\*\* 29/);
assert.match(markdown, /PC-29: identity resolution, entity-boundary, and network frame/);
assert.match(markdown, /total_false_merged_entities: 20/);
assert.match(markdown, /total_denominator_drift: 35/);
assert.doesNotMatch(markdown, /named network caused|actual manipulation|publicly authorized/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV27(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(manifest);
issueLeak.control_issue = 769;
assert.ok(validatePreferenceCustodyManifestV27(issueLeak).some(error => /control issue/.test(error)));

const baseLeak = structuredClone(manifest);
baseLeak.base_floor.expected_control_count = 27;
assert.ok(validatePreferenceCustodyManifestV27(baseLeak).some(error => /base floor contract/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.resolved_base_frontier = 'wrong_frontier';
assert.ok(validatePreferenceCustodyManifestV27(frontierLeak).some(error => /resolved frontier/.test(error)));

const successorLeak = structuredClone(manifest);
successorLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV27(successorLeak).some(error => /successor frontiers/.test(error)));

const requirementLeak = structuredClone(manifest);
requirementLeak.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV27(requirementLeak).some(error => /real-case requirements/.test(error)));

const requirementFormatLeak = structuredClone(manifest);
requirementFormatLeak.real_case_requirements_added[0] = 'Not-Machine-Addressable';
assert.ok(validatePreferenceCustodyManifestV27(requirementFormatLeak).some(error => /lowercase underscore/.test(error)));

const buildCountLeak = structuredClone(compiled);
buildCountLeak.control_count = 28;
assert.ok(validatePreferenceCustodyManifestV27Build(buildCountLeak).some(error => /twenty-nine controls/.test(error)));

const proofLeak = structuredClone(compiled);
proofLeak.controls.find(control => control.control_id === 'PC-29')
  .proof_summary.total_false_merged_entities = 19;
assert.ok(validatePreferenceCustodyManifestV27Build(proofLeak).some(error => /PC-29 total_false_merged_entities/.test(error)));

const integrityLeak = structuredClone(compiled);
integrityLeak.control_integrity.base_integrity_preserved = false;
assert.ok(validatePreferenceCustodyManifestV27Build(integrityLeak).some(error => /base_integrity_preserved/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push(
  'identity_resolution_entity_boundary_and_network_frame_assurance'
);
assert.ok(validatePreferenceCustodyManifestV27Build(resolvedFrontierLeak).some(error => /resolved identity-boundary frontier/.test(error)));

const edgeFrontierLeak = structuredClone(compiled);
edgeFrontierLeak.open_frontiers = edgeFrontierLeak.open_frontiers.filter(
  frontier =>
    frontier !==
    'edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'
);
assert.ok(validatePreferenceCustodyManifestV27Build(edgeFrontierLeak).some(error => /independent edge-path frontier/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV27Build(authorityLeak).some(error => /must remain false/.test(error)));

const chainLeak = structuredClone(compiled);
chainLeak.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV27Build(chainLeak).some(error => /hash mismatch/.test(error)));

const headLeak = structuredClone(compiled);
headLeak.custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceCustodyManifestV27Build(headLeak).some(error => /custody head mismatch/.test(error)));

console.log('Preference custody laboratory floor v27 integration tests: PASS');
