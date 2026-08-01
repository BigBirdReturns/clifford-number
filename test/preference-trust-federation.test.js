import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceTrustFederationFixture,
  renderPreferenceTrustFederationMarkdown,
  simulatePreferenceTrustFederationWorld,
  validatePreferenceTrustFederationBuild,
  validatePreferenceTrustFederationChain,
  validatePreferenceTrustFederationFixture
} from '../tools/lib/preference-trust-federation.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/trust-federation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceTrustFederationFixture(fixture), []);

const compiled = compilePreferenceTrustFederationFixture(fixture);
assert.deepEqual(validatePreferenceTrustFederationBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-recovered-claim-different-federation-states-v1');
assert.equal(compiled.issue, 682);
assert.equal(compiled.status, 'cross_organizational_trust_federation_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');

const expectedMetrics = {
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
  maximum_world_residual_exposure_count: 200,
  binding_public_authority_worlds: 0,
  public_A_share: 0.8
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(compiled.metrics[key], value);

for (const [key, value] of Object.entries({
  vendor_revocation_proves_federation_wide_revocation: false,
  message_delivery_proves_acknowledgement_or_enforcement: false,
  trust_list_update_proves_cache_purge: false,
  customer_rollback_proves_cloud_or_downstream_rollback: false,
  cloud_quarantine_proves_customer_implementation_stop: false,
  technical_capability_confers_contractual_authority: false,
  successful_replay_at_one_organization_proves_federation_recovery: false,
  reference_correct_final_result_proves_synchronized_clean_path: false,
  public_recovered_status_proves_notification_remedy_and_residual_closure: false,
  primary_tenant_recovery_proves_secondary_tenant_recovery: false,
  source_restriction_proves_successful_recovery_or_misconduct: false,
  complete_federated_recovery_supported: true,
  safe_partial_abstention_supported: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false,
  preference_change_present: false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const complete = worlds['complete-federated-recovery'];
assert.equal(complete.complete_federated_recovery, true);
assert.equal(complete.full_revocation_delivery, true);
assert.equal(complete.full_revocation_acknowledgement, true);
assert.equal(complete.full_revocation_enforcement, true);
assert.equal(complete.technical_recovery_complete, true);
assert.equal(complete.public_rights_complete, true);
assert.equal(complete.residual_exposure_total, 0);
assert.equal(complete.public_recovered_claim_contradicted, false);

const cache = worlds['vendor-revokes-customer-cache-stale'];
assert.equal(cache.stale_cache_present, true);
assert.equal(cache.continued_serving_present, true);
assert.equal(cache.full_revocation_delivery, true);
assert.equal(cache.full_revocation_acknowledgement, false);
assert.equal(cache.residual_exposure_total, 200);
assert.equal(cache.reference_correct_customer, false);

const cloud = worlds['customer-quarantines-cloud-route-continues'];
assert.equal(cloud.continued_serving_present, true);
assert.equal(cloud.full_revocation_delivery, false);
assert.equal(cloud.reference_correct_customer, true);
assert.equal(cloud.residual_exposure_total, 150);
assert.equal(cloud.organization_states.find(state => state.org_id === 'ORG-CLOUD').implementation_state, 'compromised_active');

const lag = worlds['auditor-trust-list-propagation-lag'];
assert.equal(lag.trust_list_lag_present, true);
assert.equal(lag.continued_serving_present, false);
assert.equal(lag.residual_exposure_total, 100);
assert.equal(lag.organization_states.find(state => state.org_id === 'ORG-AUDITOR').validation_state, 'pass_stale');

const authority = worlds['technical-revocation-without-contractual-authority'];
assert.equal(authority.contractual_authority_gap_present, true);
assert.equal(authority.full_revocation_acknowledgement, true);
assert.equal(authority.full_revocation_enforcement, false);
assert.equal(authority.continued_serving_present, true);
assert.equal(authority.residual_exposure_total, 200);

const rights = worlds['technical-recovery-notification-remedy-gap'];
assert.equal(rights.technical_recovery_complete, true);
assert.equal(rights.public_rights_complete, false);
assert.equal(rights.notification_remedy_gap_present, true);
assert.equal(rights.residual_exposure_total, 0);
assert.equal(rights.complete_federated_recovery, false);

const restricted = worlds['source-restricted-downstream-safe-abstention'];
assert.equal(restricted.source_restricted_abstention_present, true);
assert.equal(restricted.full_revocation_delivery, true);
assert.equal(restricted.full_revocation_acknowledgement, true);
assert.equal(restricted.full_revocation_enforcement, true);
assert.equal(restricted.technical_recovery_complete, false);
assert.equal(restricted.residual_exposure_total, 0);
assert.equal(restricted.organization_states.find(state => state.org_id === 'ORG-DOWNSTREAM').implementation_state, 'blocked');

const tenant = worlds['primary-tenant-recovers-secondary-tenant-exposed'];
assert.equal(tenant.reference_correct_customer, true);
assert.equal(tenant.secondary_tenant_exposure_present, true);
assert.equal(tenant.notification_remedy_gap_present, true);
assert.equal(tenant.residual_exposure_total, 100);
assert.equal(tenant.organization_states.find(state => state.org_id === 'ORG-PUBLIC').notification_scope, 'primary_only');

assert.equal(new Set(compiled.worlds.map(world => world.public_headline_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.federation_state_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.deepEqual(world.public_claim.family_counts, {A: 800, B: 200});
  assert.equal(world.public_claim.incident_status, 'recovered');
  assert.equal(world.organization_states.length, 6);
  assert.deepEqual(validatePreferenceTrustFederationChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceTrustFederationWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'technical-recovery-notification-remedy-gap')
);
assert.equal(direct.technical_recovery_complete, true);
assert.equal(direct.public_rights_complete, false);
assert.equal(direct.complete_federated_recovery, false);

const markdown = renderPreferenceTrustFederationMarkdown(compiled);
assert.match(markdown, /Cross-organizational trust federation, revocation, and recovery custody/);
assert.match(markdown, /Public A share: 80\.00%/);
assert.match(markdown, /Public incident status: recovered/);
assert.match(markdown, /complete-federated-recovery/);
assert.match(markdown, /Complete federated recovery: true/);
assert.match(markdown, /vendor-revokes-customer-cache-stale/);
assert.match(markdown, /Stale cache: true/);
assert.match(markdown, /technical-recovery-notification-remedy-gap/);
assert.match(markdown, /Public rights complete: false/);
assert.match(markdown, /source-restricted-downstream-safe-abstention/);
assert.match(markdown, /Source-restricted abstention: true/);
assert.match(markdown, /primary-tenant-recovers-secondary-tenant-exposed/);
assert.match(markdown, /Secondary-tenant exposure: true/);
assert.doesNotMatch(markdown, /named vendor failed|contract breach confirmed|security defect confirmed|manipulated the public|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceTrustFederationFixture(graphLeak).some(error => /graph_effect/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceTrustFederationFixture(missingWorld).some(error => /exactly the eight required trust-federation worlds/.test(error)));

const missingOrg = structuredClone(fixture);
missingOrg.worlds[0].organization_states.pop();
assert.ok(validatePreferenceTrustFederationFixture(missingOrg).some(error => /exactly six organization states/.test(error)));

const deliveryTimestampLeak = structuredClone(fixture);
deliveryTimestampLeak.worlds[0].organization_states.find(state => state.org_id === 'ORG-CLOUD').revocation_delivered_at = null;
assert.ok(validatePreferenceTrustFederationFixture(deliveryTimestampLeak).some(error => /requires a revocation delivery timestamp/.test(error)));

const acknowledgmentLeak = structuredClone(fixture);
const acknowledgmentState = acknowledgmentLeak.worlds.find(world => world.world_id === 'vendor-revokes-customer-cache-stale').organization_states.find(state => state.org_id === 'ORG-CUSTOMER');
acknowledgmentState.revocation_acknowledged = true;
assert.ok(validatePreferenceTrustFederationFixture(acknowledgmentLeak).some(error => /acknowledged revocation lacks delivery or timestamp custody/.test(error)));

const enforcementLeak = structuredClone(fixture);
const enforcementState = enforcementLeak.worlds.find(world => world.world_id === 'vendor-revokes-customer-cache-stale').organization_states.find(state => state.org_id === 'ORG-CUSTOMER');
enforcementState.revocation_enforced = true;
assert.ok(validatePreferenceTrustFederationFixture(enforcementLeak).some(error => /cannot enforce an unacknowledged revocation/.test(error)));

const currentArtifactStaleTrust = structuredClone(fixture);
currentArtifactStaleTrust.worlds[0].organization_states.find(state => state.org_id === 'ORG-CLOUD').trust_epoch = 'FED-EPOCH-2';
assert.ok(validatePreferenceTrustFederationFixture(currentArtifactStaleTrust).some(error => /cannot carry a current clean artifact under a stale trust epoch/.test(error)));

const publicArtifactLeak = structuredClone(fixture);
publicArtifactLeak.worlds[0].organization_states.find(state => state.org_id === 'ORG-PUBLIC').artifact_state = 'clean_current';
assert.ok(validatePreferenceTrustFederationFixture(publicArtifactLeak).some(error => /must remain a non-artifact rights interface/.test(error)));

const zeroResidualCompromise = structuredClone(fixture);
zeroResidualCompromise.worlds.find(world => world.world_id === 'vendor-revokes-customer-cache-stale').organization_states.find(state => state.org_id === 'ORG-CUSTOMER').residual_exposure_count = 0;
assert.ok(validatePreferenceTrustFederationFixture(zeroResidualCompromise).some(error => /compromised_active requires a retained compromised artifact and positive residual exposure/.test(error)));

const restrictedReplayInflation = structuredClone(fixture);
restrictedReplayInflation.worlds.find(world => world.world_id === 'source-restricted-downstream-safe-abstention').organization_states.find(state => state.org_id === 'ORG-DOWNSTREAM').replay_state = 'success';
assert.ok(validatePreferenceTrustFederationFixture(restrictedReplayInflation).some(error => /successful replay requires full clean-input access/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds.find(world => world.world_id === 'vendor-revokes-customer-cache-stale').expected_complete_federated_recovery = true;
assert.throws(() => compilePreferenceTrustFederationFixture(expectedFlagLeak), /complete_federated_recovery mismatch/);

const authorityLaundering = structuredClone(fixture);
const authorityState = authorityLaundering.worlds.find(world => world.world_id === 'technical-revocation-without-contractual-authority').organization_states.find(state => state.org_id === 'ORG-CUSTOMER');
authorityState.contractual_authority = true;
assert.throws(() => compilePreferenceTrustFederationFixture(authorityLaundering), /contractual_authority_gap_present mismatch/);

const publicRightsInflation = structuredClone(fixture);
const publicState = publicRightsInflation.worlds.find(world => world.world_id === 'technical-recovery-notification-remedy-gap').organization_states.find(state => state.org_id === 'ORG-PUBLIC');
publicState.notification_state = 'issued';
publicState.notification_scope = 'all_affected';
publicState.remedy_state = 'available';
publicState.remedy_scope = 'all_affected';
assert.throws(() => compilePreferenceTrustFederationFixture(publicRightsInflation), /notification_remedy_gap_present mismatch|public_rights_complete mismatch/);

const authorityConclusionLeak = structuredClone(fixture);
authorityConclusionLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceTrustFederationFixture(authorityConclusionLeak).some(error => /binding_public_authority_supported/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[4].payload.full_revocation_delivery = false;
assert.ok(validatePreferenceTrustFederationBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_federated_recovery_worlds = 2;
assert.ok(validatePreferenceTrustFederationBuild(metricInflation).some(error => /complete_federated_recovery_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceTrustFederationFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-trust-federation.test.js: OK');
