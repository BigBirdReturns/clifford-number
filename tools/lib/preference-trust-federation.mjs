import { createHash } from 'node:crypto';

export const PREFERENCE_TRUST_FEDERATION_FIXTURE_SCHEMA_VERSION = 'preference-trust-federation-fixture@1';
export const PREFERENCE_TRUST_FEDERATION_BUILD_SCHEMA_VERSION = 'preference-trust-federation-build@1';

const OPTIONS = ['A', 'B'];
const EXPECTED_ORG_IDS = ['ORG-AUDITOR', 'ORG-CLOUD', 'ORG-CUSTOMER', 'ORG-DOWNSTREAM', 'ORG-PUBLIC', 'ORG-VENDOR'];
const EXPECTED_WORLD_IDS = [
  'auditor-trust-list-propagation-lag',
  'complete-federated-recovery',
  'customer-quarantines-cloud-route-continues',
  'primary-tenant-recovers-secondary-tenant-exposed',
  'source-restricted-downstream-safe-abstention',
  'technical-recovery-notification-remedy-gap',
  'technical-revocation-without-contractual-authority',
  'vendor-revokes-customer-cache-stale'
];
const REVOCATION_STATES = new Set(['issuer', 'delivered', 'delayed', 'not_delivered']);
const ARTIFACT_STATES = new Set(['clean_current', 'compromised_retained', 'none']);
const CACHE_STATES = new Set(['clean', 'purged_then_clean', 'compromised_retained', 'purged', 'none']);
const ACCESS_STATES = new Set(['full', 'restricted', 'not_applicable']);
const QUARANTINE_STATES = new Set(['complete', 'partial', 'not_triggered', 'not_required']);
const ROLLBACK_STATES = new Set(['complete', 'blocked', 'not_triggered', 'not_required']);
const REPLAY_STATES = new Set(['success', 'blocked', 'not_attempted', 'not_required']);
const VALIDATION_STATES = new Set(['pass', 'fail', 'pass_stale', 'unavailable', 'not_required']);
const IMPLEMENTATION_STATES = new Set(['origin_clean', 'clean_active', 'compromised_active', 'monitor_only', 'rights_interface', 'blocked']);
const NOTIFICATION_STATES = new Set(['issued', 'omitted', 'not_required']);
const REMEDY_STATES = new Set(['available', 'unavailable', 'not_required']);
const RIGHT_SCOPES = new Set(['all_affected', 'primary_only', 'none', 'not_applicable']);
const EPSILON = 1e-12;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex');
}

function validTimestamp(value) {
  return text(value) && Number.isFinite(Date.parse(value));
}

function validateCounts(counts, label, expectedTotal, errors) {
  const value = object(counts);
  if (!sameMembers(Object.keys(value), OPTIONS)) {
    errors.push(`${label} must contain exactly A and B`);
    return;
  }
  for (const option of OPTIONS) {
    if (!Number.isInteger(value[option]) || value[option] < 0) errors.push(`${label}.${option} must be a non-negative integer`);
  }
  if (sum(Object.values(value)) !== expectedTotal) errors.push(`${label} must sum to ${expectedTotal}`);
}

function expectedClassification() {
  return {
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
    real_world_effect_claimed: false
  };
}

function validateOrganizationState(state, worldId, baseline, orgById, errors) {
  const orgId = text(state?.org_id);
  if (!orgById[orgId]) errors.push(`world ${worldId} references unknown organization ${orgId}`);
  if (!REVOCATION_STATES.has(state?.revocation_delivery_state)) errors.push(`world ${worldId} organization ${orgId} has invalid revocation_delivery_state`);
  if (['issuer', 'delivered', 'delayed'].includes(state?.revocation_delivery_state)) {
    if (!validTimestamp(state?.revocation_delivered_at)) errors.push(`world ${worldId} organization ${orgId} requires a revocation delivery timestamp`);
  } else if (state?.revocation_delivered_at !== null) {
    errors.push(`world ${worldId} organization ${orgId} not_delivered state requires a null delivery timestamp`);
  }
  if (typeof state?.revocation_acknowledged !== 'boolean' || typeof state?.revocation_enforced !== 'boolean') errors.push(`world ${worldId} organization ${orgId} acknowledgement and enforcement must be boolean`);
  if (state?.revocation_acknowledged) {
    if (!validTimestamp(state?.revocation_acknowledged_at) || state?.revocation_delivery_state === 'not_delivered') errors.push(`world ${worldId} organization ${orgId} acknowledged revocation lacks delivery or timestamp custody`);
  } else if (state?.revocation_acknowledged_at !== null) {
    errors.push(`world ${worldId} organization ${orgId} unacknowledged revocation requires a null acknowledgement timestamp`);
  }
  if (state?.revocation_enforced && !state?.revocation_acknowledged) errors.push(`world ${worldId} organization ${orgId} cannot enforce an unacknowledged revocation`);
  if (!text(state?.trust_epoch)) errors.push(`world ${worldId} organization ${orgId} trust_epoch is required`);
  if (!ARTIFACT_STATES.has(state?.artifact_state)) errors.push(`world ${worldId} organization ${orgId} has invalid artifact_state`);
  if (!CACHE_STATES.has(state?.cache_state)) errors.push(`world ${worldId} organization ${orgId} has invalid cache_state`);
  if (!ACCESS_STATES.has(state?.clean_input_access)) errors.push(`world ${worldId} organization ${orgId} has invalid clean_input_access`);
  if (!QUARANTINE_STATES.has(state?.quarantine_state)) errors.push(`world ${worldId} organization ${orgId} has invalid quarantine_state`);
  if (!ROLLBACK_STATES.has(state?.rollback_state)) errors.push(`world ${worldId} organization ${orgId} has invalid rollback_state`);
  if (!REPLAY_STATES.has(state?.replay_state)) errors.push(`world ${worldId} organization ${orgId} has invalid replay_state`);
  if (!VALIDATION_STATES.has(state?.validation_state)) errors.push(`world ${worldId} organization ${orgId} has invalid validation_state`);
  if (!IMPLEMENTATION_STATES.has(state?.implementation_state)) errors.push(`world ${worldId} organization ${orgId} has invalid implementation_state`);
  if (typeof state?.technical_authority !== 'boolean' || typeof state?.contractual_authority !== 'boolean') errors.push(`world ${worldId} organization ${orgId} authority states must be boolean`);
  if (!NOTIFICATION_STATES.has(state?.notification_state) || !RIGHT_SCOPES.has(state?.notification_scope)) errors.push(`world ${worldId} organization ${orgId} notification state is invalid`);
  if (!REMEDY_STATES.has(state?.remedy_state) || !RIGHT_SCOPES.has(state?.remedy_scope)) errors.push(`world ${worldId} organization ${orgId} remedy state is invalid`);
  if (!Number.isInteger(state?.residual_exposure_count) || state.residual_exposure_count < 0) errors.push(`world ${worldId} organization ${orgId} residual_exposure_count must be a non-negative integer`);
  if (!Number.isFinite(Number(state?.residual_exposure_hours)) || state.residual_exposure_hours < 0) errors.push(`world ${worldId} organization ${orgId} residual_exposure_hours must be non-negative`);
  if (orgId === 'ORG-VENDOR' && state?.revocation_delivery_state !== 'issuer') errors.push(`world ${worldId} ORG-VENDOR must remain the revocation issuer`);
  if (orgId !== 'ORG-VENDOR' && state?.revocation_delivery_state === 'issuer') errors.push(`world ${worldId} only ORG-VENDOR may be the revocation issuer`);
  if (orgId === 'ORG-PUBLIC') {
    if (state?.implementation_state !== 'rights_interface' || state?.artifact_state !== 'none' || state?.cache_state !== 'none') errors.push(`world ${worldId} ORG-PUBLIC must remain a non-artifact rights interface`);
    if (state?.revocation_enforced !== false) errors.push(`world ${worldId} ORG-PUBLIC must not be counted as a technical enforcer`);
  } else if (state?.notification_state !== 'not_required' || state?.remedy_state !== 'not_required') {
    errors.push(`world ${worldId} non-public organization ${orgId} must keep notification and remedy not_required`);
  }
  if (state?.implementation_state === 'compromised_active' && (state?.artifact_state !== 'compromised_retained' || state?.residual_exposure_count <= 0)) errors.push(`world ${worldId} organization ${orgId} compromised_active requires a retained compromised artifact and positive residual exposure`);
  if (state?.replay_state === 'success' && state?.clean_input_access !== 'full') errors.push(`world ${worldId} organization ${orgId} successful replay requires full clean-input access`);
  if (state?.replay_state === 'blocked' && state?.contractual_authority !== false && state?.implementation_state !== 'blocked') errors.push(`world ${worldId} organization ${orgId} blocked replay under retained contractual authority must preserve blocked implementation`);
  if (state?.trust_epoch !== baseline.federation_epoch && state?.artifact_state === 'clean_current') errors.push(`world ${worldId} organization ${orgId} cannot carry a current clean artifact under a stale trust epoch`);
}

export function validatePreferenceTrustFederationFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const organizations = array(baseline.organizations);
  const edges = array(baseline.topology_edges);
  const proposals = array(baseline.proposal_registry);
  const roots = array(baseline.trust_roots);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_TRUST_FEDERATION_FIXTURE_SCHEMA_VERSION) errors.push('preference trust-federation fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  validateCounts(baseline.public_family_counts, 'baseline public_family_counts', baseline.population_total, errors);
  for (const key of ['public_incident_status', 'reference_proposal_id', 'clean_artifact_id', 'compromised_artifact_id', 'federation_epoch', 'incident_id', 'revocation_id']) if (!text(baseline[key])) errors.push(`baseline ${key} is required`);
  if (!validTimestamp(baseline.revocation_issued_at)) errors.push('baseline revocation_issued_at is invalid');

  if (!sameMembers(organizations.map(org => org?.org_id), EXPECTED_ORG_IDS)) errors.push('baseline organizations must contain the six required federation actors');
  if (unique(organizations.map(org => text(org?.org_id))).length !== organizations.length) errors.push('baseline organization IDs must be unique');
  const orgById = Object.fromEntries(organizations.map(org => [org.org_id, org]));
  for (const org of organizations) {
    if (!text(org?.role) || !text(org?.jurisdiction) || !text(org?.authority_class) || !text(org?.tenant_scope)) errors.push(`organization ${org?.org_id} is incomplete`);
  }

  if (edges.length < 7 || unique(edges.map(edge => text(edge?.edge_id))).length !== edges.length) errors.push('baseline topology must preserve at least seven unique edges');
  for (const edge of edges) {
    if (!orgById[edge?.from_org_id] || !orgById[edge?.to_org_id] || !text(edge?.edge_class) || edge.from_org_id === edge.to_org_id) errors.push(`topology edge ${edge?.edge_id} is invalid`);
  }
  if (!sameMembers(baseline.revocation_required_org_ids, ['ORG-CLOUD', 'ORG-CUSTOMER', 'ORG-AUDITOR', 'ORG-DOWNSTREAM', 'ORG-PUBLIC'])) errors.push('baseline revocation-required organizations are incomplete');
  if (!sameMembers(baseline.enforcement_required_org_ids, ['ORG-CLOUD', 'ORG-CUSTOMER', 'ORG-AUDITOR', 'ORG-DOWNSTREAM'])) errors.push('baseline enforcement-required organizations are incomplete');
  if (!sameMembers(baseline.technical_recovery_org_ids, ['ORG-VENDOR', 'ORG-CLOUD', 'ORG-CUSTOMER', 'ORG-AUDITOR', 'ORG-DOWNSTREAM'])) errors.push('baseline technical-recovery organizations are incomplete');

  if (!sameMembers(proposals.map(proposal => proposal?.proposal_id), ['A0', 'A1', 'B0'])) errors.push('baseline proposal registry must contain A0, A1, and B0');
  const proposalById = Object.fromEntries(proposals.map(proposal => [proposal.proposal_id, proposal]));
  if (!proposalById[baseline.reference_proposal_id]?.reference_correct) errors.push('baseline reference proposal must be reference-correct');
  for (const proposal of proposals) {
    if (!OPTIONS.includes(proposal?.family) || !Number.isInteger(proposal?.version) || proposal.version < 0 || typeof proposal?.reference_correct !== 'boolean') errors.push(`proposal ${proposal?.proposal_id} is incomplete`);
  }

  if (!sameMembers(roots.map(root => root?.org_id), EXPECTED_ORG_IDS)) errors.push('baseline trust roots must cover all organizations');
  if (unique(roots.map(root => text(root?.current_trust_root_id))).length !== roots.length) errors.push('baseline current trust roots must be organization-specific');
  for (const root of roots) if (!orgById[root?.org_id] || !text(root?.current_trust_root_id)) errors.push(`trust-root record for ${root?.org_id} is incomplete`);

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required trust-federation worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const claim = object(world?.public_claim);
    const receipt = object(world?.federation_receipt);
    const states = array(world?.organization_states);

    validateCounts(claim.family_counts, `world ${worldId} public claim family_counts`, baseline.population_total, errors);
    if (JSON.stringify(claim.family_counts) !== JSON.stringify(baseline.public_family_counts) || claim.incident_status !== baseline.public_incident_status || claim.claimed_exact_proposal_id !== baseline.reference_proposal_id) errors.push(`world ${worldId} must preserve the frozen public claim`);
    if (receipt.revocation_id !== baseline.revocation_id || receipt.issuer_org_id !== 'ORG-VENDOR' || !validTimestamp(receipt.issued_at) || !validTimestamp(receipt.public_claim_issued_at)) errors.push(`world ${worldId} federation receipt identity or timestamps are invalid`);
    if (!Array.isArray(receipt.scope_org_ids) || !receipt.scope_org_ids.length || receipt.scope_org_ids.some(orgId => !orgById[orgId])) errors.push(`world ${worldId} revocation scope is invalid`);
    if (!Array.isArray(receipt.restart_receipt_ids) || unique(receipt.restart_receipt_ids).length !== receipt.restart_receipt_ids.length) errors.push(`world ${worldId} restart receipt IDs must be a unique array`);

    if (!sameMembers(states.map(state => state?.org_id), EXPECTED_ORG_IDS) || unique(states.map(state => text(state?.org_id))).length !== states.length) errors.push(`world ${worldId} must preserve exactly six organization states`);
    for (const state of states) validateOrganizationState(state, worldId, baseline, orgById, errors);

    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of [
      'expected_complete_federated_recovery',
      'expected_stale_cache_present',
      'expected_continued_serving_present',
      'expected_trust_list_lag_present',
      'expected_contractual_authority_gap_present',
      'expected_notification_remedy_gap_present',
      'expected_source_restricted_abstention_present',
      'expected_secondary_tenant_exposure_present',
      'expected_full_revocation_delivery',
      'expected_full_revocation_acknowledgement',
      'expected_full_revocation_enforcement',
      'expected_technical_recovery_complete',
      'expected_public_rights_complete'
    ]) if (typeof world?.[key] !== 'boolean') errors.push(`world ${worldId} ${key} must be boolean`);
    if (!Number.isInteger(world?.expected_residual_exposure_total) || world.expected_residual_exposure_total < 0) errors.push(`world ${worldId} expected_residual_exposure_total must be a non-negative integer`);
  }

  const requiredMetrics = {
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
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const mandatoryRules = [
    'vendor_revocation_is_not_federation_wide_revocation',
    'message_delivery_is_not_acknowledgement_or_enforcement',
    'trust_list_update_is_not_cache_purge',
    'customer_rollback_is_not_cloud_or_downstream_rollback',
    'cloud_quarantine_is_not_customer_implementation_stop',
    'technical_capability_is_not_contractual_authority',
    'successful_replay_at_one_organization_is_not_federation_wide_recovery',
    'reference_correct_final_result_is_not_synchronized_clean_path',
    'public_recovered_status_is_not_complete_notification_remedy_or_residual_closure',
    'primary_tenant_recovery_is_not_secondary_tenant_recovery',
    'source_restriction_is_not_successful_recovery_or_misconduct',
    'federation_recovery_claim_requires_organization_topology_trust_revocation_cache_quarantine_rollback_replay_validation_contract_notification_remedy_tenant_exposure_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceTrustFederationWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const states = array(world.organization_states);
  const byId = Object.fromEntries(states.map(state => [state.org_id, state]));
  const requiredDelivery = array(baseline.revocation_required_org_ids);
  const requiredEnforcement = array(baseline.enforcement_required_org_ids);
  const technicalOrgs = array(baseline.technical_recovery_org_ids);
  const fullRevocationDelivery = requiredDelivery.every(orgId => byId[orgId]?.revocation_delivery_state === 'delivered');
  const fullRevocationAcknowledgement = requiredDelivery.every(orgId => byId[orgId]?.revocation_acknowledged === true);
  const fullRevocationEnforcement = requiredEnforcement.every(orgId => byId[orgId]?.revocation_enforced === true);
  const staleCachePresent = states.some(state => state.trust_epoch !== baseline.federation_epoch && state.cache_state === 'compromised_retained');
  const continuedServingPresent = states.some(state => state.implementation_state === 'compromised_active');
  const trustListLagPresent = byId['ORG-AUDITOR']?.trust_epoch !== baseline.federation_epoch
    && ['delayed', 'not_delivered'].includes(byId['ORG-AUDITOR']?.revocation_delivery_state)
    && byId['ORG-AUDITOR']?.cache_state === 'compromised_retained';
  const contractualAuthorityGapPresent = states.some(state => state.technical_authority === true && state.contractual_authority === false && state.revocation_enforced === false);
  const publicState = byId['ORG-PUBLIC'];
  const publicRightsComplete = publicState?.notification_state === 'issued'
    && publicState?.notification_scope === 'all_affected'
    && publicState?.remedy_state === 'available'
    && publicState?.remedy_scope === 'all_affected';
  const notificationRemedyGapPresent = !publicRightsComplete;
  const downstream = byId['ORG-DOWNSTREAM'];
  const sourceRestrictedAbstentionPresent = downstream?.clean_input_access === 'restricted'
    && downstream?.replay_state === 'blocked'
    && downstream?.implementation_state === 'blocked'
    && downstream?.residual_exposure_count === 0;
  const secondaryTenantExposurePresent = downstream?.implementation_state === 'compromised_active'
    && downstream?.residual_exposure_count > 0;
  const technicalRecoveryComplete = technicalOrgs.every(orgId => {
    const state = byId[orgId];
    return state?.trust_epoch === baseline.federation_epoch
      && state?.artifact_state === 'clean_current'
      && state?.replay_state === 'success'
      && state?.validation_state === 'pass'
      && !['compromised_active', 'blocked'].includes(state?.implementation_state);
  });
  const residualExposureTotal = sum(states.map(state => state.residual_exposure_count));
  const completeFederatedRecovery = fullRevocationDelivery
    && fullRevocationAcknowledgement
    && fullRevocationEnforcement
    && technicalRecoveryComplete
    && publicRightsComplete
    && residualExposureTotal === 0;
  const referenceCorrectCustomer = byId['ORG-CUSTOMER']?.trust_epoch === baseline.federation_epoch
    && byId['ORG-CUSTOMER']?.artifact_state === 'clean_current'
    && byId['ORG-CUSTOMER']?.replay_state === 'success'
    && byId['ORG-CUSTOMER']?.validation_state === 'pass'
    && byId['ORG-CUSTOMER']?.implementation_state === 'clean_active';
  const publicRecoveredClaimContradicted = world.public_claim.incident_status === 'recovered' && !completeFederatedRecovery;
  const federationState = {
    federation_receipt: world.federation_receipt,
    organization_states: world.organization_states,
    complete_federated_recovery: completeFederatedRecovery,
    residual_exposure_total: residualExposureTotal
  };

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    public_claim: world.public_claim,
    federation_receipt: world.federation_receipt,
    organization_states: world.organization_states,
    full_revocation_delivery: fullRevocationDelivery,
    full_revocation_acknowledgement: fullRevocationAcknowledgement,
    full_revocation_enforcement: fullRevocationEnforcement,
    stale_cache_present: staleCachePresent,
    continued_serving_present: continuedServingPresent,
    trust_list_lag_present: trustListLagPresent,
    contractual_authority_gap_present: contractualAuthorityGapPresent,
    notification_remedy_gap_present: notificationRemedyGapPresent,
    source_restricted_abstention_present: sourceRestrictedAbstentionPresent,
    secondary_tenant_exposure_present: secondaryTenantExposurePresent,
    technical_recovery_complete: technicalRecoveryComplete,
    public_rights_complete: publicRightsComplete,
    complete_federated_recovery: completeFederatedRecovery,
    public_recovered_claim_contradicted: publicRecoveredClaimContradicted,
    reference_correct_customer: referenceCorrectCustomer,
    residual_exposure_total: residualExposureTotal,
    maximum_organization_residual_exposure: Math.max(...states.map(state => state.residual_exposure_count)),
    public_headline_signature_sha256: sha256(world.public_claim.family_counts),
    public_status_signature_sha256: sha256({incident_status: world.public_claim.incident_status}),
    federation_state_signature_sha256: sha256(federationState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildFederationChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'federation_topology_roles_trust_and_reference_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:claim`,
    event_type: 'public_recovered_claim_recorded',
    evidence_class: 'synthetic_control_public_claim',
    authority: 'fixture_institution',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: result.public_claim
  });
  push({
    event_id: `${result.world_id}:revocation`,
    event_type: 'federation_revocation_scope_and_restart_receipts_recorded',
    evidence_class: 'synthetic_control_revocation',
    authority: 'fixture_vendor',
    source_event_ids: [`${result.world_id}:claim`],
    payload: result.federation_receipt
  });
  push({
    event_id: `${result.world_id}:organizations`,
    event_type: 'organization_trust_cache_authority_recovery_and_rights_states_recorded',
    evidence_class: 'synthetic_control_federation_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:revocation`],
    payload: result.organization_states
  });
  push({
    event_id: `${result.world_id}:propagation`,
    event_type: 'revocation_delivery_acknowledgement_and_enforcement_resolved',
    evidence_class: 'deterministic_control_classification',
    authority: 'trust_federation_compiler',
    source_event_ids: [`${result.world_id}:organizations`],
    payload: {
      full_revocation_delivery: result.full_revocation_delivery,
      full_revocation_acknowledgement: result.full_revocation_acknowledgement,
      full_revocation_enforcement: result.full_revocation_enforcement,
      stale_cache_present: result.stale_cache_present,
      trust_list_lag_present: result.trust_list_lag_present
    }
  });
  push({
    event_id: `${result.world_id}:recovery`,
    event_type: 'technical_replay_contract_notification_remedy_and_tenant_state_resolved',
    evidence_class: 'deterministic_control_classification',
    authority: 'trust_federation_compiler',
    source_event_ids: [`${result.world_id}:propagation`],
    payload: {
      technical_recovery_complete: result.technical_recovery_complete,
      public_rights_complete: result.public_rights_complete,
      contractual_authority_gap_present: result.contractual_authority_gap_present,
      source_restricted_abstention_present: result.source_restricted_abstention_present,
      secondary_tenant_exposure_present: result.secondary_tenant_exposure_present,
      residual_exposure_total: result.residual_exposure_total
    }
  });
  push({
    event_id: `${result.world_id}:consequence`,
    event_type: 'federation_recovery_and_public_claim_consequence_resolved',
    evidence_class: 'synthetic_control_consequence',
    authority: 'trust_federation_compiler',
    source_event_ids: [`${result.world_id}:recovery`],
    payload: {
      complete_federated_recovery: result.complete_federated_recovery,
      public_recovered_claim_contradicted: result.public_recovered_claim_contradicted,
      continued_serving_present: result.continued_serving_present,
      notification_remedy_gap_present: result.notification_remedy_gap_present,
      reference_correct_customer: result.reference_correct_customer
    }
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'cross_organizational_trust_federation_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'trust_federation_compiler',
    source_event_ids: [`${result.world_id}:consequence`],
    payload: {
      mechanism: result.mechanism,
      complete_federated_recovery: result.complete_federated_recovery,
      residual_exposure_total: result.residual_exposure_total
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'trust_federation_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic cross-organizational revocation, trust, recovery, rights, and residual-exposure state behind one public recovered claim',
      refused_promotions: [
        'vendor_revocation_as_federation_revocation',
        'delivery_as_acknowledgement_or_enforcement',
        'trust_list_update_as_cache_purge',
        'local_rollback_as_remote_rollback',
        'technical_capability_as_contractual_authority',
        'single_org_replay_as_federation_recovery',
        'reference_correct_result_as_synchronized_clean_path',
        'public_recovered_status_as_rights_and_exposure_closure',
        'primary_recovery_as_secondary_recovery',
        'source_restriction_as_recovery_or_misconduct'
      ]
    }
  });
  return events;
}

export function validatePreferenceTrustFederationChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('trust-federation event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate trust-federation event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`trust-federation event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`trust-federation event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`trust-federation event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceTrustFederationFixture(fixture) {
  const errors = validatePreferenceTrustFederationFixture(fixture);
  if (errors.length) throw new Error(`invalid preference trust-federation fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceTrustFederationWorld(fixture, world);
    const expectations = {
      complete_federated_recovery: 'expected_complete_federated_recovery',
      stale_cache_present: 'expected_stale_cache_present',
      continued_serving_present: 'expected_continued_serving_present',
      trust_list_lag_present: 'expected_trust_list_lag_present',
      contractual_authority_gap_present: 'expected_contractual_authority_gap_present',
      notification_remedy_gap_present: 'expected_notification_remedy_gap_present',
      source_restricted_abstention_present: 'expected_source_restricted_abstention_present',
      secondary_tenant_exposure_present: 'expected_secondary_tenant_exposure_present',
      full_revocation_delivery: 'expected_full_revocation_delivery',
      full_revocation_acknowledgement: 'expected_full_revocation_acknowledgement',
      full_revocation_enforcement: 'expected_full_revocation_enforcement',
      technical_recovery_complete: 'expected_technical_recovery_complete',
      public_rights_complete: 'expected_public_rights_complete',
      residual_exposure_total: 'expected_residual_exposure_total'
    };
    for (const [observed, expected] of Object.entries(expectations)) if (result[observed] !== world[expected]) throw new Error(`world ${world.world_id} ${observed} mismatch`);
    const chain = buildFederationChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_public_headline_signatures: unique(worlds.map(world => world.public_headline_signature_sha256)).length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_federation_state_signatures: unique(worlds.map(world => world.federation_state_signature_sha256)).length,
    complete_federated_recovery_worlds: worlds.filter(world => world.complete_federated_recovery).length,
    incomplete_federated_recovery_worlds: worlds.filter(world => !world.complete_federated_recovery).length,
    public_recovered_claim_contradicted_worlds: worlds.filter(world => world.public_recovered_claim_contradicted).length,
    stale_cache_worlds: worlds.filter(world => world.stale_cache_present).length,
    continued_serving_worlds: worlds.filter(world => world.continued_serving_present).length,
    trust_list_lag_worlds: worlds.filter(world => world.trust_list_lag_present).length,
    contractual_authority_gap_worlds: worlds.filter(world => world.contractual_authority_gap_present).length,
    notification_remedy_gap_worlds: worlds.filter(world => world.notification_remedy_gap_present).length,
    source_restricted_abstention_worlds: worlds.filter(world => world.source_restricted_abstention_present).length,
    secondary_tenant_exposure_worlds: worlds.filter(world => world.secondary_tenant_exposure_present).length,
    full_revocation_delivery_worlds: worlds.filter(world => world.full_revocation_delivery).length,
    full_revocation_acknowledgement_worlds: worlds.filter(world => world.full_revocation_acknowledgement).length,
    full_revocation_enforcement_worlds: worlds.filter(world => world.full_revocation_enforcement).length,
    technical_recovery_complete_worlds: worlds.filter(world => world.technical_recovery_complete).length,
    public_rights_complete_worlds: worlds.filter(world => world.public_rights_complete).length,
    residual_exposure_worlds: worlds.filter(world => world.residual_exposure_total > 0).length,
    zero_residual_but_incomplete_worlds: worlds.filter(world => world.residual_exposure_total === 0 && !world.complete_federated_recovery).length,
    reference_correct_customer_worlds: worlds.filter(world => world.reference_correct_customer).length,
    total_residual_exposure_count: sum(worlds.map(world => world.residual_exposure_total)),
    maximum_world_residual_exposure_count: Math.max(...worlds.map(world => world.residual_exposure_total)),
    binding_public_authority_worlds: 0,
    public_A_share: Number(fixture.baseline.public_family_counts.A) / Number(fixture.baseline.population_total)
  };
  for (const [key, value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_TRUST_FEDERATION_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'cross_organizational_trust_federation_equifinality_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: { ...fixture.expected_classification, preference_change_present: false },
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceTrustFederationBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_TRUST_FEDERATION_BUILD_SCHEMA_VERSION) errors.push('preference trust-federation build schema mismatch');
  if (compiled?.status !== 'cross_organizational_trust_federation_equifinality_qualified') errors.push('compiled trust-federation status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled trust-federation graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled trust-federation must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled trust-federation must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled trust-federation real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled trust-federation worlds are incomplete');

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
  for (const [key, value] of Object.entries(expectedMetrics)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  for (const world of array(compiled?.worlds)) {
    if (!close(Number(world?.public_claim?.family_counts?.A) / 1000, 0.8) || world?.public_claim?.incident_status !== 'recovered') errors.push(`world ${world?.world_id} must preserve the frozen public headline and recovered status`);
    for (const field of ['public_headline_signature_sha256', 'public_status_signature_sha256', 'federation_state_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceTrustFederationChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['complete-federated-recovery']?.complete_federated_recovery !== true) errors.push('complete world must preserve one complete federated recovery');
  if (byId['vendor-revokes-customer-cache-stale']?.stale_cache_present !== true || byId['vendor-revokes-customer-cache-stale']?.continued_serving_present !== true) errors.push('customer-cache world must preserve stale cache and continued serving');
  if (byId['customer-quarantines-cloud-route-continues']?.continued_serving_present !== true) errors.push('cloud-route world must preserve continued remote serving after local recovery');
  if (byId['auditor-trust-list-propagation-lag']?.trust_list_lag_present !== true) errors.push('auditor world must preserve trust-list lag');
  if (byId['technical-revocation-without-contractual-authority']?.contractual_authority_gap_present !== true) errors.push('authority world must preserve technical capability without contractual authority');
  if (byId['technical-recovery-notification-remedy-gap']?.technical_recovery_complete !== true || byId['technical-recovery-notification-remedy-gap']?.public_rights_complete !== false) errors.push('rights-gap world must preserve complete technical recovery and incomplete public rights');
  if (byId['source-restricted-downstream-safe-abstention']?.source_restricted_abstention_present !== true) errors.push('source-restricted world must preserve safe downstream abstention');
  if (byId['primary-tenant-recovers-secondary-tenant-exposed']?.secondary_tenant_exposure_present !== true) errors.push('tenant world must preserve secondary-tenant exposure');
  if (unique(compiled?.refusal_rules).length < 12) errors.push('compiled trust-federation refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled trust-federation caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceTrustFederationMarkdown(compiled) {
  const lines = [
    '# Cross-organizational trust federation, revocation, and recovery custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Public recovered-status signatures:** ${compiled.metrics.distinct_public_status_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen federation',
    '',
    `- Public A share: ${percentage(compiled.metrics.public_A_share)}`,
    `- Public incident status: ${compiled.baseline.public_incident_status}`,
    `- Reference proposal: ${compiled.baseline.reference_proposal_id}`,
    `- Federation epoch: ${compiled.baseline.federation_epoch}`,
    `- Organizations: ${compiled.baseline.organizations.length}`,
    `- Topology edges: ${compiled.baseline.topology_edges.length}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Complete federated recovery: ${world.complete_federated_recovery}`);
    lines.push(`- Full revocation delivery: ${world.full_revocation_delivery}`);
    lines.push(`- Full acknowledgement: ${world.full_revocation_acknowledgement}`);
    lines.push(`- Full enforcement: ${world.full_revocation_enforcement}`);
    lines.push(`- Technical recovery complete: ${world.technical_recovery_complete}`);
    lines.push(`- Public rights complete: ${world.public_rights_complete}`);
    lines.push(`- Stale cache: ${world.stale_cache_present}`);
    lines.push(`- Continued serving: ${world.continued_serving_present}`);
    lines.push(`- Trust-list lag: ${world.trust_list_lag_present}`);
    lines.push(`- Contractual-authority gap: ${world.contractual_authority_gap_present}`);
    lines.push(`- Notification-remedy gap: ${world.notification_remedy_gap_present}`);
    lines.push(`- Source-restricted abstention: ${world.source_restricted_abstention_present}`);
    lines.push(`- Secondary-tenant exposure: ${world.secondary_tenant_exposure_present}`);
    lines.push(`- Residual exposure: ${world.residual_exposure_total}`);
    lines.push(`- Public recovered claim contradicted: ${world.public_recovered_claim_contradicted}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) {
    const rendered = typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value;
    lines.push(`- ${key}: ${rendered}`);
  }
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
