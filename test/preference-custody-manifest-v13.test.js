import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePerformativeFixture } from '../tools/lib/performative-synthetic-constituency.mjs';
import { compilePreferenceCustodyFixture } from '../tools/lib/preference-custody.mjs';
import { compilePreferenceEquifinalityFixture } from '../tools/lib/preference-equifinality.mjs';
import { compilePreferenceAttritionFixture } from '../tools/lib/preference-attrition.mjs';
import { compilePreferenceSubgroupFixture } from '../tools/lib/preference-subgroup.mjs';
import { compilePreferenceStandingFixture } from '../tools/lib/preference-standing.mjs';
import { compilePreferenceAgendaFixture } from '../tools/lib/preference-agenda.mjs';
import { compilePreferencePackageFixture } from '../tools/lib/preference-package.mjs';
import { compilePreferenceSuccessionFixture } from '../tools/lib/preference-succession.mjs';
import { compilePreferenceDynamicChangeFixture } from '../tools/lib/preference-dynamic-change.mjs';
import { compilePreferenceNetworkFormationFixture } from '../tools/lib/preference-network-formation.mjs';
import { compilePreferenceDeliberativeFormationFixture } from '../tools/lib/preference-deliberative-formation.mjs';
import { compilePreferenceEpistemicQualityFixture } from '../tools/lib/preference-epistemic-quality.mjs';
import { compilePreferenceProvenanceRecoveryFixture } from '../tools/lib/preference-provenance-recovery.mjs';
import { compilePreferenceTrustFederationFixture } from '../tools/lib/preference-trust-federation.mjs';
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from '../tools/lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from '../tools/lib/preference-custody-manifest-v11.mjs';
import { compilePreferenceCustodyManifestV12 } from '../tools/lib/preference-custody-manifest-v12.mjs';
import {
  compilePreferenceCustodyManifestV13,
  renderPreferenceCustodyManifestV13Markdown,
  validatePreferenceCustodyManifestV13,
  validatePreferenceCustodyManifestV13Build
} from '../tools/lib/preference-custody-manifest-v13.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const baseV8 = compilePreferenceCustodyManifest(readJson('data/research/preference-custody/control-manifest.json'), {
  'build/research/performative-synthetic-constituency-fixture.json': compilePerformativeFixture(readJson('data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json')),
  'build/research/preference-custody-option-set-fixture.json': compilePreferenceCustodyFixture(readJson('data/research/preference-custody/option-set-starvation.fixture.json')),
  'build/research/preference-observational-equivalence.json': compilePreferenceEquifinalityFixture(readJson('data/research/preference-custody/observational-equivalence.fixture.json')),
  'build/research/preference-attrition-refusal.json': compilePreferenceAttritionFixture(readJson('data/research/preference-custody/refusal-exit.fixture.json')),
  'build/research/preference-subgroup-capacity.json': compilePreferenceSubgroupFixture(readJson('data/research/preference-custody/subgroup-capacity.fixture.json')),
  'build/research/preference-standing-authority.json': compilePreferenceStandingFixture(readJson('data/research/preference-custody/standing-authority.fixture.json')),
  'build/research/preference-agenda-formation.json': compilePreferenceAgendaFixture(readJson('data/research/preference-custody/agenda-formation.fixture.json')),
  'build/research/preference-package-bargaining.json': compilePreferencePackageFixture(readJson('data/research/preference-custody/package-bargaining.fixture.json')),
  'build/research/preference-succession-validation.json': compilePreferenceSuccessionFixture(readJson('data/research/preference-custody/succession-validation.fixture.json')),
  'build/research/preference-dynamic-change.json': compilePreferenceDynamicChangeFixture(readJson('data/research/preference-custody/dynamic-change.fixture.json'))
});
const baseV9 = compilePreferenceCustodyManifestV9(
  readJson('data/research/preference-custody/control-manifest-v9.json'),
  baseV8,
  compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json'))
);
const baseV10 = compilePreferenceCustodyManifestV10(
  readJson('data/research/preference-custody/control-manifest-v10.json'),
  baseV9,
  compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json'))
);
const baseV11 = compilePreferenceCustodyManifestV11(
  readJson('data/research/preference-custody/control-manifest-v11.json'),
  baseV10,
  compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json'))
);
const baseV12 = compilePreferenceCustodyManifestV12(
  readJson('data/research/preference-custody/control-manifest-v12.json'),
  baseV11,
  compilePreferenceProvenanceRecoveryFixture(readJson('data/research/preference-custody/provenance-recovery.fixture.json'))
);
const federationBuild = compilePreferenceTrustFederationFixture(readJson('data/research/preference-custody/trust-federation.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v13.json');

assert.deepEqual(validatePreferenceCustodyManifestV13(manifest), []);
const compiled = compilePreferenceCustodyManifestV13(manifest, baseV12, federationBuild);
assert.deepEqual(validatePreferenceCustodyManifestV13Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v13');
assert.equal(compiled.status, 'laboratory_floor_v13_qualified');
assert.equal(compiled.control_count, 15);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v12');
assert.equal(compiled.composition.base_control_count, 14);
assert.equal(compiled.composition.extension_control_id, 'PC-15');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08',
  'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13', 'PC-14', 'PC-15'
]);

const pc15 = compiled.controls.find(control => control.control_id === 'PC-15');
assert.equal(pc15.failure_class, 'cross_organizational_provenance_trust_federation_and_recovery_equifinality');
const expectedProofCounts = {
  world_count: 8,
  distinct_public_headline_signatures: 1,
  distinct_public_status_signatures: 1,
  distinct_federation_state_signatures: 8,
  complete_federated_recovery_worlds: 1,
  incomplete_federated_recovery_worlds: 7,
  public_recovered_claim_contradicted_worlds: 7,
  stale_cache_worlds: 4,
  continued_serving_worlds: 4,
  trust_list_lag_worlds: 1,
  contractual_authority_gap_worlds: 1,
  notification_remedy_gap_worlds: 2,
  source_restricted_abstention_worlds: 1,
  secondary_tenant_exposure_worlds: 1,
  full_revocation_delivery_worlds: 4,
  full_revocation_acknowledgement_worlds: 3,
  full_revocation_enforcement_worlds: 3,
  technical_recovery_complete_worlds: 2,
  public_rights_complete_worlds: 6,
  residual_exposure_worlds: 5,
  zero_residual_but_incomplete_worlds: 2,
  reference_correct_customer_worlds: 6,
  total_residual_exposure_count: 750,
  maximum_world_residual_exposure_count: 200
};
for (const [key, value] of Object.entries(expectedProofCounts)) assert.equal(pc15.proof_summary[key], value);
assert.equal(pc15.proof_summary.public_A_share, 0.8);
for (const key of [
  'vendor_revocation_proves_federation_wide_revocation',
  'message_delivery_proves_acknowledgement_or_enforcement',
  'trust_list_update_proves_cache_purge',
  'customer_rollback_proves_cloud_or_downstream_rollback',
  'cloud_quarantine_proves_customer_implementation_stop',
  'technical_capability_confers_contractual_authority',
  'successful_replay_at_one_organization_proves_federation_recovery',
  'reference_correct_final_result_proves_synchronized_clean_path',
  'public_recovered_status_proves_notification_remedy_and_residual_closure',
  'primary_tenant_recovery_proves_secondary_tenant_recovery',
  'source_restriction_proves_successful_recovery_or_misconduct',
  'binding_public_authority_supported'
]) assert.equal(pc15.proof_summary[key], false);
assert.equal(pc15.proof_summary.complete_federated_recovery_supported, true);
assert.equal(pc15.proof_summary.safe_partial_abstention_supported, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'cross_organizational_trust_federation_and_recovery'));
assert.ok(!compiled.open_frontiers.includes('cross_organizational_provenance_trust_federation_and_recovery'));
assert.ok(compiled.open_frontiers.includes('federated_trust_governance_liability_and_public_remedy'));
assert.ok(compiled.open_frontiers.includes('multi_party_recovery_succession_and_service_substitution'));
for (const requirement of [
  'organization_legal_identity_role_jurisdiction_and_service_owner',
  'federation_topology_artifact_distribution_and_notification_edges',
  'revocation_delivery_receipt_by_required_organization',
  'artifact_inventory_cache_location_and_purge_receipt_by_holder',
  'technical_capability_and_contractual_authority_crosswalk',
  'primary_secondary_multi_tenant_and_reseller_coverage',
  'public_notification_scope_delivery_acknowledgement_and_language',
  'residual_exposure_population_duration_route_and_burden',
  'service_substitution_exit_and_alternate_provider_route'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV13Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v13/);
assert.match(markdown, /\*\*Controls:\*\* 15/);
assert.match(markdown, /preference-custody-laboratory-floor-v12 \+ PC-15/);
assert.match(markdown, /complete_federated_recovery_worlds: 1/);
assert.match(markdown, /public_recovered_claim_contradicted_worlds: 7/);
assert.match(markdown, /continued_serving_worlds: 4/);
assert.match(markdown, /secondary_tenant_exposure_worlds: 1/);
assert.match(markdown, /complete_federated_recovery_supported: true/);
assert.doesNotMatch(markdown, /named vendor failed|contract breach confirmed|security certified|manipulated the public|publicly authorized/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v12';
assert.ok(validatePreferenceCustodyManifestV13(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v13/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-16';
assert.ok(validatePreferenceCustodyManifestV13(wrongControl).some(error => /must remain PC-15/.test(error)));

const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV13(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));

const invalidBase = structuredClone(baseV12);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV13(manifest, invalidBase, federationBuild), /invalid v12 base build/);

const invalidFederation = structuredClone(federationBuild);
invalidFederation.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV13(manifest, baseV12, invalidFederation), /invalid PC-15 build/);

const missingRules = structuredClone(federationBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV13(manifest, baseV12, missingRules), /invalid PC-15 build/);

const recoveryInflation = structuredClone(compiled);
recoveryInflation.controls.find(control => control.control_id === 'PC-15').proof_summary.complete_federated_recovery_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV13Build(recoveryInflation).some(error => /complete_federated_recovery_worlds must equal 1/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-15').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV13Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const federationInferenceLeak = structuredClone(compiled);
federationInferenceLeak.controls.find(control => control.control_id === 'PC-15').proof_summary.vendor_revocation_proves_federation_wide_revocation = true;
assert.ok(validatePreferenceCustodyManifestV13Build(federationInferenceLeak).some(error => /vendor_revocation_proves_federation_wide_revocation must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('cross_organizational_provenance_trust_federation_and_recovery');
assert.ok(validatePreferenceCustodyManifestV13Build(frontierLeak).some(error => /remove the resolved broad trust-federation frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 9;
assert.ok(validatePreferenceCustodyManifestV13Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v13.test.js: OK');
