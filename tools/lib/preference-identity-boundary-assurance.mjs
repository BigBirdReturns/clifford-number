import { createHash } from 'node:crypto';

export const PREFERENCE_IDENTITY_BOUNDARY_ASSURANCE_FIXTURE_SCHEMA_VERSION =
  'preference-identity-boundary-assurance-fixture@1';
export const PREFERENCE_IDENTITY_BOUNDARY_ASSURANCE_BUILD_SCHEMA_VERSION =
  'preference-identity-boundary-assurance-build@1';

const WORLD_IDS = [
  'complete-one-to-one-identity-boundary-frame-and-membership',
  'alias-collision-and-false-entity-merge',
  'record-fragmentation-and-false-entity-split',
  'identifier-recycling-succession-and-temporal-collision',
  'boundary-truncation-with-omitted-external-bridges',
  'ineligible-proxy-service-household-or-institutional-nodes',
  'administrative-frame-misaligned-with-operative-exposure-system',
  'dynamic-membership-churn-and-denominator-drift'
];

const FLAG_KEYS = [
  'complete_identity_boundary_assurance',
  'false_merge_present',
  'false_split_present',
  'recycled_identifier_present',
  'boundary_truncation_present',
  'ineligible_inclusion_present',
  'frame_mismatch_present',
  'membership_drift_present',
  'one_to_one_identity_complete',
  'temporal_identity_complete',
  'boundary_coverage_complete',
  'frame_alignment_complete',
  'eligibility_complete',
  'membership_current',
  'denominator_valid',
  'current_identity_boundary_lineage_complete'
];

const EXPECTED_METRICS = {
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

const FALSE_CLASSIFICATIONS = [
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
];

const REQUIRED_RULES = [
  'one_hundred_resolved_records_is_not_one_hundred_true_entities',
  'one_hundred_percent_identity_coverage_is_not_one_to_one_entity_resolution',
  'stable_node_count_is_not_stable_entity_identity_or_membership',
  'zero_published_duplicates_is_not_zero_false_merges',
  'zero_published_unresolved_identities_is_not_zero_false_splits_or_recycled_identifiers',
  'declared_operational_boundary_is_not_observed_operative_system_boundary',
  'administrative_roster_is_not_communication_exposure_market_household_or_institutional_population',
  'included_node_is_not_eligible_target_entity',
  'omitted_external_node_is_not_irrelevant_entity',
  'current_identifier_is_not_persistent_entity_across_succession',
  'frozen_denominator_is_not_current_population_under_entry_exit_churn_or_role_change',
  'public_identity_verified_status_is_not_complete_one_to_one_boundary_valid_frame_valid_current_correctable_authorized_evidence',
  'identity_or_boundary_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'identity_boundary_claim_requires_record_namespace_alias_entity_temporal_succession_boundary_frame_eligibility_membership_denominator_correction_durability_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  observed_nodes: 100,
  resolved_identities: 100,
  published_identity_coverage: 1,
  published_duplicates: 0,
  published_unresolved_identities: 0,
  published_external_nodes: 0,
  public_identity_status: 'identity_verified',
  declared_operational_boundary: 'complete',
  published_node_count_stability: 'stable',
  approved_use: 'topology_exposure_estimation',
  reference_identity_version: 'IDENTITY-V2',
  reference_boundary_version: 'BOUNDARY-V2',
  reference_membership_version: 'MEMBERSHIP-V1',
  binding_public_authority: false
};

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const sameMembers = (left, right) =>
  JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const falseRequired = (value, label, errors) => {
  if (value !== false) errors.push(`${label} must remain false`);
};

function deepMerge(base, override) {
  if (Array.isArray(override)) return override.map(canonical);
  if (!override || typeof override !== 'object') return override;
  const result = { ...object(base) };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : canonical(value);
  }
  return result;
}

function expandWorld(fixture, record) {
  return {
    world_id: record.world_id,
    mechanism: record.mechanism,
    ...deepMerge(fixture.world_defaults, record.overrides),
    expected_flags: record.expected_flags
  };
}

function expectedPublicClaim(baseline) {
  return Object.fromEntries([
    'operative_release_id',
    'operative_release_version',
    'observed_nodes',
    'resolved_identities',
    'published_identity_coverage',
    'published_duplicates',
    'published_unresolved_identities',
    'published_external_nodes',
    'public_identity_status',
    'declared_operational_boundary',
    'published_node_count_stability',
    'approved_use'
  ].map(key => [key, baseline[key]]));
}

function requireInteger(record, key, min, max, label, errors) {
  const value = record[key];
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${label}.${key} is invalid`);
  }
}

function requireText(record, keys, label, errors) {
  for (const key of keys) if (!text(record[key])) errors.push(`${label}.${key} is required`);
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const i = object(world.identity);
  const b = object(world.boundary);
  const m = object(world.membership);
  const l = object(world.lineage);
  const g = object(world.governance);
  const f = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen identity-and-boundary publication surface`);
  }

  for (const key of [
    'observed_record_count', 'resolved_record_count', 'true_entity_count',
    'false_merged_entity_count', 'false_split_entity_count',
    'recycled_identifier_count', 'alias_collision_count', 'fragmentation_count'
  ]) requireInteger(i, key, 0, 500, `world ${id} identity`, errors);

  if (i.observed_record_count !== 100 || i.resolved_record_count !== 100) {
    errors.push(`world ${id} must preserve the one-hundred-record publication denominator`);
  }
  if (i.true_entity_count !== i.resolved_record_count + i.false_merged_entity_count - i.false_split_entity_count) {
    errors.push(`world ${id} true-entity, merge, split, and resolved counts must reconcile`);
  }
  if (typeof i.one_to_one_resolution !== 'boolean') {
    errors.push(`world ${id} identity.one_to_one_resolution must be boolean`);
  }
  requireText(i, [
    'record_map_id', 'approved_version', 'executed_version',
    'alias_crosswalk_state', 'namespace_crosswalk_state',
    'temporal_identity_state', 'succession_state', 'confidence_state'
  ], `world ${id} identity`, errors);

  for (const key of [
    'internal_entity_count', 'external_entity_count', 'omitted_external_entity_count',
    'included_ineligible_entity_count', 'bridge_entity_count', 'omitted_bridge_entity_count',
    'frame_misclassified_entity_count'
  ]) requireInteger(b, key, 0, 5000, `world ${id} boundary`, errors);
  if (b.internal_entity_count !== 100) {
    errors.push(`world ${id} internal entity denominator must remain one hundred`);
  }
  if (b.omitted_external_entity_count > b.external_entity_count) {
    errors.push(`world ${id} omitted external entities exceed external entities`);
  }
  if (b.omitted_bridge_entity_count > b.bridge_entity_count) {
    errors.push(`world ${id} omitted bridge entities exceed bridge entities`);
  }
  if (b.included_ineligible_entity_count > b.internal_entity_count) {
    errors.push(`world ${id} included ineligible entities exceed internal entities`);
  }
  requireText(b, [
    'boundary_id', 'approved_version', 'executed_version',
    'declared_frame', 'observed_frame', 'administrative_operational_crosswalk_state',
    'alternate_boundary_test_state', 'eligibility_state', 'boundary_state'
  ], `world ${id} boundary`, errors);

  for (const key of [
    'population_universe_count', 'roster_count', 'eligible_count', 'active_count',
    'entered_count', 'exited_count', 'churned_entity_count',
    'stale_membership_count', 'denominator_drift_count',
    'snapshot_time', 'validity_start', 'validity_end', 'assignment_time'
  ]) requireInteger(m, key, 0, 10000, `world ${id} membership`, errors);
  if (m.roster_count !== 100) errors.push(`world ${id} roster denominator must remain one hundred`);
  if (m.churned_entity_count !== m.entered_count + m.exited_count) {
    errors.push(`world ${id} membership entry, exit, and churn counts must reconcile`);
  }
  if (m.validity_start > m.snapshot_time || m.snapshot_time > m.validity_end) {
    errors.push(`world ${id} membership snapshot must be inside its validity interval`);
  }
  requireText(m, [
    'membership_version', 'approved_version', 'executed_version',
    'refresh_state', 'denominator_state', 'cutoff_state', 'membership_audit_state'
  ], `world ${id} membership`, errors);
  if (m.succession_receipt !== null && !text(m.succession_receipt)) {
    errors.push(`world ${id} membership succession receipt is invalid`);
  }

  requireText(l, [
    'approved_identity_version', 'executed_identity_version',
    'approved_boundary_version', 'executed_boundary_version',
    'approved_membership_version', 'executed_membership_version',
    'revalidation_state'
  ], `world ${id} lineage`, errors);
  if (l.succession_receipt !== null && !text(l.succession_receipt)) {
    errors.push(`world ${id} lineage succession receipt is invalid`);
  }

  requireInteger(g, 'unsupported_identity_boundary_decision_count', 0, 1000, `world ${id} governance`, errors);
  falseRequired(g.binding_public_authority, `world ${id} binding public authority`, errors);
  requireText(g, [
    'monitoring_state', 'correction_state', 'appeal_state', 'certificate_state', 'audit_state'
  ], `world ${id} governance`, errors);

  if (!sameMembers(Object.keys(f), FLAG_KEYS)) {
    errors.push(`world ${id} expected flags are incomplete`);
  }
  for (const key of FLAG_KEYS) {
    if (typeof f[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
  }
}

function deriveFlags(world) {
  const i = world.identity;
  const b = world.boundary;
  const m = world.membership;
  const l = world.lineage;
  const g = world.governance;

  const falseMerge = i.false_merged_entity_count > 0 || i.alias_collision_count > 0;
  const falseSplit = i.false_split_entity_count > 0 || i.fragmentation_count > 0;
  const recycled = i.recycled_identifier_count > 0 || i.temporal_identity_state !== 'current';
  const truncation =
    b.omitted_external_entity_count > 0 ||
    b.omitted_bridge_entity_count > 0 ||
    b.boundary_state !== 'operational_complete';
  const ineligible = b.included_ineligible_entity_count > 0 || b.eligibility_state !== 'complete';
  const frameMismatch =
    b.frame_misclassified_entity_count > 0 ||
    b.declared_frame !== b.observed_frame ||
    b.administrative_operational_crosswalk_state !== 'independent_complete';
  const membershipDrift =
    m.churned_entity_count > 0 ||
    m.stale_membership_count > 0 ||
    m.denominator_drift_count > 0 ||
    m.refresh_state !== 'current' ||
    m.denominator_state !== 'current';

  const oneToOne =
    !falseMerge &&
    !falseSplit &&
    i.one_to_one_resolution &&
    i.alias_crosswalk_state === 'complete' &&
    i.namespace_crosswalk_state === 'complete' &&
    i.approved_version === i.executed_version &&
    i.confidence_state === 'independent_complete';

  const temporal =
    !recycled &&
    i.temporal_identity_state === 'current' &&
    i.succession_state === 'current';

  const boundary =
    !truncation &&
    b.approved_version === b.executed_version &&
    b.alternate_boundary_test_state === 'independent_complete';

  const frame =
    !frameMismatch &&
    b.administrative_operational_crosswalk_state === 'independent_complete';

  const eligibility =
    !ineligible &&
    b.eligibility_state === 'complete' &&
    m.eligible_count === 100;

  const membershipCurrent =
    !membershipDrift &&
    m.active_count === m.roster_count &&
    m.snapshot_time < m.assignment_time &&
    m.cutoff_state === 'pre_assignment_current' &&
    m.membership_audit_state === 'independent_complete';

  const denominatorValid =
    boundary &&
    eligibility &&
    membershipCurrent &&
    m.population_universe_count === m.eligible_count &&
    m.denominator_state === 'current';

  const lineageCurrent =
    l.approved_identity_version === l.executed_identity_version &&
    l.approved_boundary_version === l.executed_boundary_version &&
    l.approved_membership_version === l.executed_membership_version &&
    l.revalidation_state === 'current' &&
    Boolean(text(l.succession_receipt));

  const complete =
    oneToOne &&
    temporal &&
    boundary &&
    frame &&
    eligibility &&
    membershipCurrent &&
    denominatorValid &&
    lineageCurrent &&
    g.unsupported_identity_boundary_decision_count === 0 &&
    g.audit_state === 'independent_complete' &&
    g.correction_state === 'recompute_revoke_and_reissue_operational';

  return {
    complete_identity_boundary_assurance: complete,
    false_merge_present: falseMerge,
    false_split_present: falseSplit,
    recycled_identifier_present: recycled,
    boundary_truncation_present: truncation,
    ineligible_inclusion_present: ineligible,
    frame_mismatch_present: frameMismatch,
    membership_drift_present: membershipDrift,
    one_to_one_identity_complete: oneToOne,
    temporal_identity_complete: temporal,
    boundary_coverage_complete: boundary,
    frame_alignment_complete: frame,
    eligibility_complete: eligibility,
    membership_current: membershipCurrent,
    denominator_valid: denominatorValid,
    current_identity_boundary_lineage_complete: lineageCurrent
  };
}

export function validatePreferenceIdentityBoundaryAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_IDENTITY_BOUNDARY_ASSURANCE_FIXTURE_SCHEMA_VERSION) {
    errors.push('identity-boundary fixture schema mismatch');
  }
  if (fixture?.fixture_id !== 'same-identity-verified-status-different-provenance-v1') {
    errors.push('identity-boundary fixture identity mismatch');
  }
  if (fixture?.issue !== 780 || fixture?.parent_program_issue !== 594) {
    errors.push('identity-boundary issue lineage mismatch');
  }
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') {
    errors.push('identity-boundary fixture status or graph effect mismatch');
  }
  falseRequired(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) {
    errors.push('identity-boundary baseline contract mismatch');
  }
  if (!object(fixture?.world_defaults).public_claim) {
    errors.push('identity-boundary world defaults are incomplete');
  }

  const records = array(fixture?.worlds);
  if (!sameMembers(records.map(record => record?.world_id), WORLD_IDS)) {
    errors.push('fixture must contain exactly the eight required identity-boundary worlds');
  }
  if (unique(records.map(record => record?.world_id)).length !== records.length) {
    errors.push('identity-boundary world IDs must be unique');
  }
  for (const record of records) {
    if (!text(record?.world_id) || !text(record?.mechanism) ||
        typeof record?.overrides !== 'object' || !record?.expected_flags) {
      errors.push('identity-boundary world record is incomplete');
      continue;
    }
    validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  }

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (fixture?.expected_metrics?.[key] !== value) {
      errors.push(`expected_metrics.${key} must equal ${value}`);
    }
  }
  for (const key of FALSE_CLASSIFICATIONS) {
    if (fixture?.expected_classification?.[key] !== false) {
      errors.push(`expected_classification.${key} must remain false`);
    }
  }
  if (fixture?.expected_classification?.complete_identity_boundary_assurance_supported_in_at_least_one_world !== true) {
    errors.push('expected classification must preserve one complete identity-boundary assurance path');
  }
  for (const rule of REQUIRED_RULES) {
    if (!unique(fixture?.required_refusal_rules).includes(rule)) {
      errors.push(`required refusal rule missing: ${rule}`);
    }
  }
  if (unique(fixture?.prohibited_inferences).length < 14) {
    errors.push('identity-boundary prohibited-inference ledger is incomplete');
  }
  const contract = object(fixture?.interpretation_contract);
  if (!text(contract.contract_id) || !text(contract.what_this_is) ||
      !text(contract.what_this_is_not) || !text(contract.copy_ready_caveat)) {
    errors.push('identity-boundary interpretation contract is incomplete');
  }
  return errors;
}

function seal(event, previous) {
  const unsigned = { ...canonical(event), previous_event_sha256: previous };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCustodyChain(world) {
  const events = [
    {
      event_type: 'identity_boundary_publication_surface_frozen',
      payload: { public_claim: world.public_claim }
    },
    {
      event_type: 'record_namespace_alias_and_crosswalk_state',
      payload: {
        observed_record_count: world.identity.observed_record_count,
        resolved_record_count: world.identity.resolved_record_count,
        record_map_id: world.identity.record_map_id,
        alias_crosswalk_state: world.identity.alias_crosswalk_state,
        namespace_crosswalk_state: world.identity.namespace_crosswalk_state
      }
    },
    {
      event_type: 'entity_resolution_merge_split_and_confidence_state',
      payload: {
        true_entity_count: world.identity.true_entity_count,
        false_merged_entity_count: world.identity.false_merged_entity_count,
        false_split_entity_count: world.identity.false_split_entity_count,
        alias_collision_count: world.identity.alias_collision_count,
        fragmentation_count: world.identity.fragmentation_count,
        one_to_one_resolution: world.identity.one_to_one_resolution,
        confidence_state: world.identity.confidence_state
      }
    },
    {
      event_type: 'temporal_identity_identifier_recycling_and_succession_state',
      payload: {
        recycled_identifier_count: world.identity.recycled_identifier_count,
        temporal_identity_state: world.identity.temporal_identity_state,
        succession_state: world.identity.succession_state
      }
    },
    {
      event_type: 'entity_boundary_operational_frame_and_bridge_state',
      payload: { boundary: world.boundary }
    },
    {
      event_type: 'population_eligibility_membership_and_denominator_state',
      payload: { membership: world.membership }
    },
    {
      event_type: 'identity_boundary_membership_lineage_state',
      payload: { lineage: world.lineage }
    },
    {
      event_type: 'correction_appeal_certificate_and_authority_state',
      payload: { governance: world.governance }
    },
    {
      event_type: 'identity_boundary_provenance_mechanism_classified',
      payload: {
        mechanism: world.mechanism,
        flags: world.flags
      }
    }
  ];

  let previous = null;
  return events.map(event => {
    const sealed = seal(event, previous);
    previous = sealed.event_sha256;
    return sealed;
  });
}

function deriveMetrics(worlds) {
  const sum = getter => worlds.reduce((total, world) => total + Number(getter(world) ?? 0), 0);
  const count = key => worlds.filter(world => world.flags[key]).length;
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature_sha256)).size,
    distinct_identity_boundary_provenance_signatures: new Set(worlds.map(world => world.identity_boundary_provenance_signature_sha256)).size,
    complete_identity_boundary_assurance_worlds: count('complete_identity_boundary_assurance'),
    false_merge_worlds: count('false_merge_present'),
    false_split_worlds: count('false_split_present'),
    recycled_identifier_worlds: count('recycled_identifier_present'),
    boundary_truncation_worlds: count('boundary_truncation_present'),
    ineligible_inclusion_worlds: count('ineligible_inclusion_present'),
    frame_mismatch_worlds: count('frame_mismatch_present'),
    membership_drift_worlds: count('membership_drift_present'),
    one_to_one_identity_complete_worlds: count('one_to_one_identity_complete'),
    temporal_identity_complete_worlds: count('temporal_identity_complete'),
    boundary_coverage_complete_worlds: count('boundary_coverage_complete'),
    frame_alignment_complete_worlds: count('frame_alignment_complete'),
    eligibility_complete_worlds: count('eligibility_complete'),
    membership_current_worlds: count('membership_current'),
    denominator_valid_worlds: count('denominator_valid'),
    current_identity_boundary_lineage_complete_worlds: count('current_identity_boundary_lineage_complete'),
    total_false_merged_entities: sum(world => world.identity.false_merged_entity_count),
    total_false_split_entities: sum(world => world.identity.false_split_entity_count),
    total_recycled_identifiers: sum(world => world.identity.recycled_identifier_count),
    total_omitted_external_entities: sum(world => world.boundary.omitted_external_entity_count),
    total_omitted_bridge_entities: sum(world => world.boundary.omitted_bridge_entity_count),
    total_ineligible_included_entities: sum(world => world.boundary.included_ineligible_entity_count),
    total_frame_misclassified_entities: sum(world => world.boundary.frame_misclassified_entity_count),
    total_entered_entities: sum(world => world.membership.entered_count),
    total_exited_entities: sum(world => world.membership.exited_count),
    total_churned_entities: sum(world => world.membership.churned_entity_count),
    total_stale_memberships: sum(world => world.membership.stale_membership_count),
    total_denominator_drift: sum(world => world.membership.denominator_drift_count),
    total_unsupported_identity_boundary_decisions: sum(world => world.governance.unsupported_identity_boundary_decision_count),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority).length
  };
}

export function compilePreferenceIdentityBoundaryAssuranceFixture(fixture) {
  const errors = validatePreferenceIdentityBoundaryAssuranceFixture(fixture);
  if (errors.length) throw new Error(`identity-boundary fixture invalid:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(record => {
    const expanded = expandWorld(fixture, record);
    const flags = deriveFlags(expanded);
    for (const key of FLAG_KEYS) {
      if (flags[key] !== record.expected_flags[key]) {
        throw new Error(`world ${record.world_id} flag ${key} mismatch`);
      }
    }

    const publicStatusSignature = sha256(expanded.public_claim);
    const provenanceSignature = sha256({
      identity: expanded.identity,
      boundary: expanded.boundary,
      membership: expanded.membership,
      lineage: expanded.lineage,
      governance: expanded.governance,
      flags
    });

    const world = {
      world_id: expanded.world_id,
      mechanism: expanded.mechanism,
      public_claim: canonical(expanded.public_claim),
      identity: canonical(expanded.identity),
      boundary: canonical(expanded.boundary),
      membership: canonical(expanded.membership),
      lineage: canonical(expanded.lineage),
      governance: canonical(expanded.governance),
      flags,
      public_status_signature_sha256: publicStatusSignature,
      identity_boundary_provenance_signature_sha256: provenanceSignature
    };
    world.custody_chain = buildCustodyChain(world);
    world.custody_chain_head_sha256 = world.custody_chain.at(-1).event_sha256;
    return world;
  });

  const metrics = deriveMetrics(worlds);
  for (const [key, expected] of Object.entries(EXPECTED_METRICS)) {
    if (metrics[key] !== expected) {
      throw new Error(`derived metric ${key} expected ${expected}, observed ${metrics[key]}`);
    }
  }

  const classification = {
    ...Object.fromEntries(FALSE_CLASSIFICATIONS.map(key => [key, false])),
    complete_identity_boundary_assurance_supported_in_at_least_one_world:
      metrics.complete_identity_boundary_assurance_worlds > 0
  };

  return {
    schema_version: PREFERENCE_IDENTITY_BOUNDARY_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'identity_entity_boundary_frame_membership_and_denominator_assurance_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: canonical(fixture.baseline),
    worlds,
    metrics,
    classification,
    required_refusal_rules: [...fixture.required_refusal_rules],
    prohibited_inferences: [...fixture.prohibited_inferences],
    interpretation_contract: canonical(fixture.interpretation_contract)
  };
}

function validateChain(world, errors) {
  let previous = null;
  for (const [index, event] of array(world.custody_chain).entries()) {
    if (event.previous_event_sha256 !== previous) {
      errors.push(`world ${world.world_id} custody previous hash mismatch at ${index}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (sha256(unsigned) !== event.event_sha256) {
      errors.push(`world ${world.world_id} custody event hash mismatch at ${index}`);
    }
    previous = event.event_sha256;
  }
  if (previous !== world.custody_chain_head_sha256) {
    errors.push(`world ${world.world_id} custody head mismatch`);
  }
}

export function validatePreferenceIdentityBoundaryAssuranceBuild(build) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_IDENTITY_BOUNDARY_ASSURANCE_BUILD_SCHEMA_VERSION) {
    errors.push('identity-boundary build schema mismatch');
  }
  if (build?.fixture_id !== 'same-identity-verified-status-different-provenance-v1') {
    errors.push('identity-boundary build identity mismatch');
  }
  if (build?.issue !== 780 || build?.parent_program_issue !== 594) {
    errors.push('identity-boundary build issue lineage mismatch');
  }
  if (build?.status !== 'identity_entity_boundary_frame_membership_and_denominator_assurance_qualified') {
    errors.push('identity-boundary build status mismatch');
  }
  if (build?.graph_effect !== 'none') errors.push('identity-boundary graph effect must remain none');
  falseRequired(build?.counts_toward_thesis_evidence, 'build counts_toward_thesis_evidence', errors);
  falseRequired(build?.conclusion_generated, 'build conclusion_generated', errors);
  if (build?.real_world_evidence_state !== 'none') errors.push('identity-boundary real-world evidence state must remain none');
  if (JSON.stringify(canonical(build?.baseline)) !== JSON.stringify(canonical(BASELINE))) {
    errors.push('identity-boundary build baseline mismatch');
  }

  const worlds = array(build?.worlds);
  if (!sameMembers(worlds.map(world => world?.world_id), WORLD_IDS)) {
    errors.push('identity-boundary build must contain exactly eight required worlds');
  }
  if (unique(worlds.map(world => world?.world_id)).length !== worlds.length) {
    errors.push('identity-boundary build world IDs must be unique');
  }

  for (const world of worlds) {
    const id = text(world?.world_id) || '(missing)';
    if (!text(world?.public_status_signature_sha256).match(/^[0-9a-f]{64}$/)) {
      errors.push(`world ${id} public status signature is invalid`);
    }
    if (!text(world?.identity_boundary_provenance_signature_sha256).match(/^[0-9a-f]{64}$/)) {
      errors.push(`world ${id} identity-boundary provenance signature is invalid`);
    }
    if (!text(world?.custody_chain_head_sha256).match(/^[0-9a-f]{64}$/)) {
      errors.push(`world ${id} custody head is invalid`);
    }
    if (array(world?.custody_chain).length !== 9) {
      errors.push(`world ${id} custody chain must contain nine events`);
    }
    validateChain(world, errors);
    const derived = deriveFlags(world);
    for (const key of FLAG_KEYS) {
      if (derived[key] !== world?.flags?.[key]) {
        errors.push(`world ${id} derived flag ${key} mismatch`);
      }
    }
    if (sha256(world.public_claim) !== world.public_status_signature_sha256) {
      errors.push(`world ${id} public status signature mismatch`);
    }
    const expectedProvenance = sha256({
      identity: world.identity,
      boundary: world.boundary,
      membership: world.membership,
      lineage: world.lineage,
      governance: world.governance,
      flags: world.flags
    });
    if (expectedProvenance !== world.identity_boundary_provenance_signature_sha256) {
      errors.push(`world ${id} identity-boundary provenance signature mismatch`);
    }
  }

  const metrics = deriveMetrics(worlds);
  for (const [key, expected] of Object.entries(EXPECTED_METRICS)) {
    if (build?.metrics?.[key] !== expected) errors.push(`metrics.${key} must equal ${expected}`);
    if (metrics[key] !== expected) errors.push(`derived metrics.${key} must equal ${expected}`);
  }
  for (const key of FALSE_CLASSIFICATIONS) {
    if (build?.classification?.[key] !== false) errors.push(`classification.${key} must remain false`);
  }
  if (build?.classification?.complete_identity_boundary_assurance_supported_in_at_least_one_world !== true) {
    errors.push('build must preserve one complete identity-boundary assurance path');
  }
  for (const rule of REQUIRED_RULES) {
    if (!unique(build?.required_refusal_rules).includes(rule)) {
      errors.push(`required refusal rule missing: ${rule}`);
    }
  }
  if (unique(build?.prohibited_inferences).length < 14) {
    errors.push('identity-boundary build prohibited-inference ledger is incomplete');
  }
  return errors;
}

export function renderPreferenceIdentityBoundaryAssuranceMarkdown(build) {
  const rows = build.worlds.map(world =>
    `| ${world.world_id} | ${world.flags.complete_identity_boundary_assurance ? 'yes' : 'no'} | ` +
    `${world.identity.false_merged_entity_count} | ${world.identity.false_split_entity_count} | ` +
    `${world.identity.recycled_identifier_count} | ${world.boundary.omitted_external_entity_count} | ` +
    `${world.boundary.included_ineligible_entity_count} | ${world.boundary.frame_misclassified_entity_count} | ` +
    `${world.membership.churned_entity_count} | ${world.governance.unsupported_identity_boundary_decision_count} |`
  );

  return [
    '# Identity resolution, entity-boundary, and network-frame custody',
    '',
    `**Fixture:** ${build.fixture_id}`,
    `**Status:** ${build.status}`,
    `**Worlds:** ${build.metrics.world_count}`,
    `**Public-status signatures:** ${build.metrics.distinct_public_status_signatures}`,
    `**Identity-boundary provenance signatures:** ${build.metrics.distinct_identity_boundary_provenance_signatures}`,
    `**Complete identity-boundary assurance worlds:** ${build.metrics.complete_identity_boundary_assurance_worlds}`,
    '',
    '## Frozen public surface',
    '',
    '```json',
    JSON.stringify(build.baseline, null, 2),
    '```',
    '',
    '## Worlds',
    '',
    '| World | Complete | False merges | False splits | Recycled IDs | Omitted external | Ineligible included | Frame-misclassified | Churned | Unsupported decisions |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    '## Aggregate metrics',
    '',
    ...Object.entries(build.metrics).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Interpretation',
    '',
    build.interpretation_contract.copy_ready_caveat,
    ''
  ].join('\n');
}
