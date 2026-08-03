import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceIdentityBoundaryAssuranceFixture,
  validatePreferenceIdentityBoundaryAssuranceFixture,
  validatePreferenceIdentityBoundaryAssuranceBuild
} from '../tools/lib/preference-identity-boundary-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-identity-boundary-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/identity-boundary-assurance.fixture.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-identity-boundary-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-identity-boundary-assurance.md', 'utf8');

assert.deepEqual(validatePreferenceIdentityBoundaryAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceIdentityBoundaryAssuranceBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-identity-verified-status-different-provenance-v1');
assert.equal(compiled.schema_version, 'preference-identity-boundary-assurance-build@1');
assert.equal(compiled.status, 'identity_entity_boundary_frame_membership_and_denominator_assurance_qualified');
assert.equal(compiled.issue, 780);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.identity_boundary_provenance_signature_sha256)).size, 8);

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
assert.deepEqual(compiled.metrics, expectedMetrics);

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
]) assert.equal(compiled.classification[key], false);
assert.equal(compiled.classification.complete_identity_boundary_assurance_supported_in_at_least_one_world, true);

const byId = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
assert.equal(byId['complete-one-to-one-identity-boundary-frame-and-membership'].flags.complete_identity_boundary_assurance, true);
assert.equal(byId['alias-collision-and-false-entity-merge'].flags.false_merge_present, true);
assert.equal(byId['alias-collision-and-false-entity-merge'].identity.false_merged_entity_count, 20);
assert.equal(byId['record-fragmentation-and-false-entity-split'].flags.false_split_present, true);
assert.equal(byId['record-fragmentation-and-false-entity-split'].identity.false_split_entity_count, 20);
assert.equal(byId['identifier-recycling-succession-and-temporal-collision'].flags.recycled_identifier_present, true);
assert.equal(byId['identifier-recycling-succession-and-temporal-collision'].identity.recycled_identifier_count, 15);
assert.equal(byId['boundary-truncation-with-omitted-external-bridges'].flags.boundary_truncation_present, true);
assert.equal(byId['boundary-truncation-with-omitted-external-bridges'].boundary.omitted_external_entity_count, 30);
assert.equal(byId['ineligible-proxy-service-household-or-institutional-nodes'].flags.ineligible_inclusion_present, true);
assert.equal(byId['ineligible-proxy-service-household-or-institutional-nodes'].boundary.included_ineligible_entity_count, 25);
assert.equal(byId['administrative-frame-misaligned-with-operative-exposure-system'].flags.frame_mismatch_present, true);
assert.equal(byId['administrative-frame-misaligned-with-operative-exposure-system'].boundary.frame_misclassified_entity_count, 40);
assert.equal(byId['dynamic-membership-churn-and-denominator-drift'].flags.membership_drift_present, true);
assert.equal(byId['dynamic-membership-churn-and-denominator-drift'].membership.churned_entity_count, 35);

for (const world of compiled.worlds) {
  assert.equal(world.custody_chain.length, 9);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.identity_boundary_provenance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(compiled.worlds[0].custody_chain[0].event_type, 'identity_boundary_publication_surface_frozen');
assert.equal(compiled.worlds[0].custody_chain[2].event_type, 'entity_resolution_merge_split_and_confidence_state');
assert.equal(compiled.worlds[0].custody_chain[5].event_type, 'population_eligibility_membership_and_denominator_state');
assert.equal(compiled.worlds[0].custody_chain[8].event_type, 'identity_boundary_provenance_mechanism_classified');

assert.match(markdown, /Identity resolution, entity-boundary, and network-frame custody/);
assert.match(markdown, /Worlds:\*\* 8/);
assert.match(markdown, /total_false_merged_entities: 20/);
assert.match(markdown, /total_denominator_drift: 35/);
assert.match(markdown, /dynamic-membership-churn-and-denominator-drift/);
assert.doesNotMatch(markdown, /named network caused|actual manipulation|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(graphLeak).some(error => /status or graph effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 769;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(issueLeak).some(error => /issue lineage/.test(error)));

const baselineDrift = structuredClone(fixture);
baselineDrift.baseline.resolved_identities = 99;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(baselineDrift).some(error => /baseline contract/.test(error)));

const publicSurfaceDrift = structuredClone(fixture);
publicSurfaceDrift.worlds[1].overrides.public_claim = { published_duplicates: 20 };
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(publicSurfaceDrift).some(error => /frozen identity-and-boundary publication surface/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(missingWorld).some(error => /eight required/.test(error)));

const duplicateWorld = structuredClone(fixture);
duplicateWorld.worlds[7].world_id = duplicateWorld.worlds[0].world_id;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(duplicateWorld).some(error => /eight required|unique/.test(error)));

const mergeReconciliationLeak = structuredClone(fixture);
mergeReconciliationLeak.worlds[1].overrides.identity.true_entity_count = 119;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(mergeReconciliationLeak).some(error => /must reconcile/.test(error)));

const churnReconciliationLeak = structuredClone(fixture);
churnReconciliationLeak.worlds[7].overrides.membership.churned_entity_count = 34;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(churnReconciliationLeak).some(error => /entry, exit, and churn/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].overrides.governance = { binding_public_authority: true };
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(authorityLeak).some(error => /binding public authority/.test(error)));

const omittedRule = structuredClone(fixture);
omittedRule.required_refusal_rules.pop();
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(omittedRule).some(error => /required refusal rule missing/.test(error)));

const falseClassificationLeak = structuredClone(fixture);
falseClassificationLeak.expected_classification.frozen_denominator_identifies_current_population_under_entry_exit_churn_or_role_change = true;
assert.ok(validatePreferenceIdentityBoundaryAssuranceFixture(falseClassificationLeak).some(error => /must remain false/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds[1].expected_flags.one_to_one_identity_complete = true;
assert.throws(() => compilePreferenceIdentityBoundaryAssuranceFixture(expectedFlagLeak), /flag one_to_one_identity_complete mismatch/);

const metricLeak = structuredClone(compiled);
metricLeak.metrics.total_false_merged_entities = 19;
assert.ok(validatePreferenceIdentityBoundaryAssuranceBuild(metricLeak).some(error => /total_false_merged_entities/.test(error)));

const buildAuthorityLeak = structuredClone(compiled);
buildAuthorityLeak.classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceIdentityBoundaryAssuranceBuild(buildAuthorityLeak).some(error => /must remain false/.test(error)));

const chainLeak = structuredClone(compiled);
chainLeak.worlds[0].custody_chain[4].payload.boundary.boundary_state = 'tampered';
assert.ok(validatePreferenceIdentityBoundaryAssuranceBuild(chainLeak).some(error => /hash mismatch/.test(error)));

const custodyHeadLeak = structuredClone(compiled);
custodyHeadLeak.worlds[0].custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceIdentityBoundaryAssuranceBuild(custodyHeadLeak).some(error => /custody head mismatch/.test(error)));

const signatureLeak = structuredClone(compiled);
signatureLeak.worlds[0].identity_boundary_provenance_signature_sha256 = 'invalid';
assert.ok(validatePreferenceIdentityBoundaryAssuranceBuild(signatureLeak).some(error => /signature is invalid/.test(error)));

console.log('Preference identity-boundary assurance adversarial tests: PASS');
