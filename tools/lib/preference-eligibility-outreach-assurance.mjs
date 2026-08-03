import { createHash } from 'node:crypto';

export const PREFERENCE_ELIGIBILITY_OUTREACH_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-eligibility-outreach-assurance-fixture@1';
export const PREFERENCE_ELIGIBILITY_OUTREACH_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-eligibility-outreach-assurance-build@1';

const WORLD_IDS = [
  'complete-source-population-rule-awareness-invitation-reachability-usability-assistance-and-current-lineage',
  'source-population-frame-omits-forty-operational-units',
  'proxy-rule-produces-false-inclusions-false-exclusions-and-unappealable-exclusions',
  'published-awareness-coverage-hides-forty-unaware-and-thirty-noncomprehending-units',
  'published-delivery-rate-hides-forty-failures-and-twenty-misdirected-invitations',
  'nominal-channel-coverage-hides-forty-geographically-or-temporally-unreachable-units',
  'nominal-reachability-hides-language-disability-digital-documentary-identity-burden-and-assistance-failures',
  'historical-eligibility-outreach-assurance-inherited-after-source-rule-outreach-channel-assistance-workflow-policy-and-release-succession'
];

const FLAG_KEYS = [
  'complete_eligibility_outreach_assurance',
  'source_population_undercoverage_present',
  'eligibility_rule_proxy_failure_present',
  'awareness_comprehension_failure_present',
  'invitation_delivery_failure_present',
  'reachability_failure_present',
  'usability_assistance_failure_present',
  'stale_eligibility_outreach_lineage_present',
  'source_population_complete',
  'eligibility_rule_complete',
  'awareness_comprehension_complete',
  'invitation_delivery_complete',
  'reachability_complete',
  'usability_assistance_complete',
  'current_eligibility_outreach_lineage_complete',
  'monitoring_correction_complete'
];

export const EXPECTED_ELIGIBILITY_OUTREACH_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_eligibility_outreach_governance_signatures: 8,
  complete_eligibility_outreach_assurance_worlds: 1,
  source_population_undercoverage_worlds: 1,
  eligibility_rule_proxy_failure_worlds: 1,
  awareness_comprehension_failure_worlds: 1,
  invitation_delivery_failure_worlds: 1,
  reachability_failure_worlds: 1,
  usability_assistance_failure_worlds: 1,
  stale_eligibility_outreach_lineage_worlds: 1,
  source_population_complete_worlds: 7,
  eligibility_rule_complete_worlds: 7,
  awareness_comprehension_complete_worlds: 7,
  invitation_delivery_complete_worlds: 7,
  reachability_complete_worlds: 7,
  usability_assistance_complete_worlds: 7,
  current_eligibility_outreach_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  same_public_eligibility_outreach_surface_worlds: 8,
  total_omitted_source_population_unit_count: 40,
  total_false_exclusion_count: 30,
  total_false_inclusion_count: 20,
  total_unappealable_exclusion_count: 20,
  total_unaware_unit_count: 40,
  total_noncomprehending_unit_count: 30,
  total_invitation_delivery_failure_count: 40,
  total_misdirected_invitation_count: 20,
  total_contact_failure_count: 40,
  total_unreachable_unit_count: 40,
  total_geographically_excluded_unit_count: 20,
  total_temporally_excluded_unit_count: 20,
  total_language_excluded_unit_count: 20,
  total_disability_excluded_unit_count: 15,
  total_digital_excluded_unit_count: 20,
  total_documentation_identity_excluded_unit_count: 20,
  total_authentication_failed_unit_count: 10,
  total_cost_time_administrative_burden_unit_count: 30,
  total_assistance_needed_unit_count: 40,
  total_assistance_unavailable_unit_count: 30,
  total_stale_eligibility_outreach_decision_count: 100,
  total_unsupported_eligibility_outreach_decisions: 700,
  binding_public_authority_worlds: 0
};

export const FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS = [
  'declared_eligible_units_identify_operational_source_population',
  'published_source_population_coverage_identifies_complete_population_frame_custody',
  'published_inclusion_coverage_identifies_valid_eligibility_rule_proxy_identity_exception_and_appeal_custody',
  'zero_published_exclusions_identifies_zero_true_exclusions',
  'notice_availability_or_publication_identifies_affected_person_awareness',
  'measured_exposure_identifies_comprehension',
  'sending_identifies_delivery_correct_destination_acknowledgment_or_understanding',
  'published_invitation_delivery_identifies_complete_bounce_misdirection_retry_and_terminal_state_custody',
  'channel_existence_identifies_geographic_or_temporal_reachability',
  'nominal_reachability_identifies_language_disability_digital_documentary_identity_authentication_cost_time_or_administrative_usability',
  'published_assistance_coverage_identifies_needed_offered_received_completed_and_effective_assistance',
  'historical_eligibility_outreach_assurance_identifies_current_assurance',
  'public_eligibility_outreach_verified_status_identifies_complete_current_source_rule_awareness_delivery_reachability_usability_assistance_correctable_authorized_evidence',
  'eligibility_outreach_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const REQUIRED_RULES = [
  'declared_eligible_units_are_not_the_operational_source_population',
  'published_source_population_coverage_is_not_complete_population_frame_custody',
  'published_inclusion_coverage_is_not_valid_eligibility_rule_proxy_identity_exception_and_appeal_custody',
  'zero_published_exclusions_is_not_zero_true_exclusion',
  'notice_availability_or_publication_is_not_affected_person_awareness',
  'measured_exposure_is_not_comprehension',
  'sending_is_not_delivery_correct_destination_acknowledgment_or_understanding',
  'published_invitation_delivery_is_not_complete_bounce_misdirection_retry_and_terminal_state_custody',
  'channel_existence_is_not_geographic_or_temporal_reachability',
  'nominal_reachability_is_not_language_disability_digital_documentary_identity_authentication_cost_time_or_administrative_usability',
  'published_assistance_coverage_is_not_assistance_needed_offered_received_completed_or_effective',
  'historical_eligibility_outreach_assurance_is_not_current_assurance_after_source_population_rule_outreach_invitation_channel_assistance_workflow_policy_or_release_succession',
  'public_eligibility_outreach_verified_status_is_not_complete_current_source_complete_rule_valid_awareness_complete_delivery_complete_reachable_usable_assisted_correctable_or_authorized_evidence',
  'eligibility_outreach_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'eligibility_outreach_claim_requires_source_population_rule_proxy_identity_exception_appeal_awareness_comprehension_invitation_delivery_reachability_usability_assistance_lineage_correction_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  declared_eligible_units: 100,
  public_eligibility_outreach_status: 'eligibility_outreach_verified',
  published_source_population_coverage: 1,
  published_inclusion_coverage: 1,
  published_exclusion_count: 0,
  published_awareness_coverage: 1,
  published_invitation_delivery_rate: 1,
  published_reachability_coverage: 1,
  published_assistance_coverage: 1,
  approved_use: 'systemwide_release_policy',
  reference_source_population_version: 'SOURCE-POPULATION-V1',
  reference_eligibility_rule_version: 'ELIGIBILITY-RULE-V1',
  reference_awareness_version: 'AWARENESS-V1',
  reference_invitation_version: 'INVITATION-V1',
  reference_reachability_version: 'REACHABILITY-V1',
  reference_assistance_version: 'ASSISTANCE-V1',
  binding_public_authority: false
};

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
const integerIn = (value, minimum, maximum, label, errors) => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) errors.push(`${label} must be an integer in [${minimum}, ${maximum}]`);
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

function expectedPublicClaim(baseline) {
  return Object.fromEntries([
    'operative_release_id','operative_release_version','declared_eligible_units',
    'public_eligibility_outreach_status','published_source_population_coverage',
    'published_inclusion_coverage','published_exclusion_count','published_awareness_coverage',
    'published_invitation_delivery_rate','published_reachability_coverage',
    'published_assistance_coverage','approved_use'
  ].map(key => [key, baseline[key]]));
}

function expandWorld(fixture, record) {
  return {
    world_id: record.world_id,
    mechanism: record.mechanism,
    ...deepMerge(fixture.world_defaults, record.overrides),
    expected_flags: record.expected_flags
  };
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const source = object(world.source_population);
  const awareness = object(world.awareness);
  const invitation = object(world.invitation_delivery);
  const reachability = object(world.reachability);
  const usability = object(world.usability_assistance);
  const lineage = object(world.lineage);
  const governance = object(world.governance);
  const flags = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) errors.push(`world ${id} must preserve the frozen eligibility-outreach public surface`);

  for (const key of ['declared_eligible_count','operational_source_population_count','included_record_count','excluded_record_count','omitted_source_population_count','false_inclusion_count','false_exclusion_count','exception_count','appeal_count','reversal_count','unappealable_exclusion_count']) integerIn(source[key], 0, 200, `world ${id} source_population.${key}`, errors);
  if (source.declared_eligible_count !== 100) errors.push(`world ${id} declared eligibility must remain one hundred`);
  if (source.operational_source_population_count < source.declared_eligible_count) errors.push(`world ${id} operational source population cannot be below the declared denominator`);
  if (source.omitted_source_population_count !== source.operational_source_population_count - source.declared_eligible_count) errors.push(`world ${id} omitted source-population count must reconcile`);
  if (source.false_inclusion_count > source.included_record_count) errors.push(`world ${id} false inclusions exceed included records`);
  if (source.false_exclusion_count > source.excluded_record_count) errors.push(`world ${id} false exclusions exceed excluded records`);
  if (source.reversal_count > source.appeal_count) errors.push(`world ${id} reversals exceed appeals`);
  if (source.unappealable_exclusion_count > source.false_exclusion_count) errors.push(`world ${id} unappealable exclusions exceed false exclusions`);
  for (const key of ['source_frame_complete','population_boundary_complete','eligibility_rule_complete','proxy_validation_complete','identity_resolution_complete','exception_complete','appeal_complete','refresh_complete']) if (typeof source[key] !== 'boolean') errors.push(`world ${id} source_population.${key} must be boolean`);
  if (!text(source.ledger_id) || !text(source.state)) errors.push(`world ${id} source-population identity and state are required`);

  for (const key of ['population_count','exposed_count','aware_count','unaware_count','comprehension_confirmed_count','noncomprehending_count']) integerIn(awareness[key], 0, 200, `world ${id} awareness.${key}`, errors);
  if (awareness.aware_count + awareness.unaware_count !== awareness.population_count) errors.push(`world ${id} awareness population must reconcile`);
  if (awareness.comprehension_confirmed_count + awareness.noncomprehending_count !== awareness.aware_count) errors.push(`world ${id} comprehension state must reconcile aware units`);
  if (awareness.exposed_count > awareness.population_count) errors.push(`world ${id} exposure exceeds awareness population`);
  for (const key of ['construct_complete','source_complete','exposure_complete','timing_complete','repetition_complete','comprehension_complete','subgroup_complete','measurement_complete']) if (typeof awareness[key] !== 'boolean') errors.push(`world ${id} awareness.${key} must be boolean`);
  if (!text(awareness.ledger_id)) errors.push(`world ${id} awareness ledger is required`);

  for (const key of ['population_count','invited_count','uninvited_count','delivery_attempted_count','delivered_count','contact_failed_count','bounced_count','misdirected_count','acknowledged_count','retry_count']) integerIn(invitation[key], 0, 200, `world ${id} invitation_delivery.${key}`, errors);
  if (invitation.invited_count + invitation.uninvited_count !== invitation.population_count) errors.push(`world ${id} invitation population must reconcile`);
  if (invitation.delivered_count + invitation.contact_failed_count !== invitation.delivery_attempted_count) errors.push(`world ${id} invitation delivery attempts must reconcile`);
  if (invitation.bounced_count > invitation.contact_failed_count || invitation.misdirected_count > invitation.contact_failed_count) errors.push(`world ${id} bounce or misdirection exceeds contact failures`);
  if (invitation.acknowledged_count > invitation.delivered_count) errors.push(`world ${id} acknowledgments exceed deliveries`);
  for (const key of ['notice_identity_complete','content_version_complete','destination_complete','delivery_receipt_complete','acknowledgment_complete','bounce_failure_complete','misdirection_complete','retry_terminal_state_complete']) if (typeof invitation[key] !== 'boolean') errors.push(`world ${id} invitation_delivery.${key} must be boolean`);
  if (!text(invitation.ledger_id)) errors.push(`world ${id} invitation-delivery ledger is required`);

  for (const key of ['population_count','reachable_count','unreachable_count','geographically_excluded_count','temporally_excluded_count','service_area_excluded_count','transport_excluded_count']) integerIn(reachability[key], 0, 200, `world ${id} reachability.${key}`, errors);
  if (reachability.reachable_count + reachability.unreachable_count !== reachability.population_count) errors.push(`world ${id} reachability population must reconcile`);
  for (const key of ['geographically_excluded_count','temporally_excluded_count','service_area_excluded_count','transport_excluded_count']) if (reachability[key] > reachability.unreachable_count) errors.push(`world ${id} ${key} exceeds unreachable population`);
  for (const key of ['geographic_complete','temporal_complete','service_area_complete','transport_complete','scheduling_complete','capacity_availability_complete']) if (typeof reachability[key] !== 'boolean') errors.push(`world ${id} reachability.${key} must be boolean`);
  if (!text(reachability.ledger_id)) errors.push(`world ${id} reachability ledger is required`);

  for (const key of ['population_count','usable_count','unusable_count','language_excluded_count','disability_excluded_count','digital_excluded_count','documentation_identity_excluded_count','authentication_failed_count','cost_time_administrative_burden_count','assistance_needed_count','assistance_offered_count','assistance_unavailable_count','assistance_received_count','assistance_completed_count']) integerIn(usability[key], 0, 200, `world ${id} usability_assistance.${key}`, errors);
  if (usability.usable_count + usability.unusable_count !== usability.population_count) errors.push(`world ${id} usability population must reconcile`);
  for (const key of ['language_excluded_count','disability_excluded_count','digital_excluded_count','documentation_identity_excluded_count','authentication_failed_count','cost_time_administrative_burden_count']) if (usability[key] > usability.unusable_count) errors.push(`world ${id} ${key} exceeds unusable population`);
  if (usability.assistance_offered_count + usability.assistance_unavailable_count !== usability.assistance_needed_count) errors.push(`world ${id} assistance offered and unavailable counts must reconcile need`);
  if (usability.assistance_received_count > usability.assistance_offered_count || usability.assistance_completed_count > usability.assistance_received_count) errors.push(`world ${id} assistance receipt or completion exceeds prior state`);
  for (const key of ['language_complete','disability_complete','digital_complete','documentation_identity_complete','authentication_complete','cost_time_complete','administrative_burden_complete','assistance_complete','assistance_effectiveness_complete']) if (typeof usability[key] !== 'boolean') errors.push(`world ${id} usability_assistance.${key} must be boolean`);
  if (!text(usability.ledger_id)) errors.push(`world ${id} usability-assistance ledger is required`);

  for (const key of ['approved_release_version','executed_release_version','approved_source_population_version','executed_source_population_version','approved_eligibility_rule_version','executed_eligibility_rule_version','approved_awareness_version','executed_awareness_version','approved_invitation_version','executed_invitation_version','approved_reachability_version','executed_reachability_version','approved_assistance_version','executed_assistance_version','approved_workflow_version','executed_workflow_version','approved_policy_version','executed_policy_version','approved_use','executed_use','revalidation_state']) if (!text(lineage[key])) errors.push(`world ${id} lineage.${key} is required`);
  if (typeof lineage.current_eligibility_outreach_lineage !== 'boolean') errors.push(`world ${id} lineage.current_eligibility_outreach_lineage must be boolean`);
  integerIn(lineage.stale_eligibility_outreach_decision_count, 0, 100, `world ${id} stale eligibility-outreach decisions`, errors);

  for (const key of ['monitoring_complete','refresh_complete','drift_trigger_complete','correction_complete','appeal_complete','rollback_complete','certificate_withdrawal_complete','durability_complete']) if (typeof governance[key] !== 'boolean') errors.push(`world ${id} governance.${key} must be boolean`);
  integerIn(governance.unsupported_eligibility_outreach_decision_count, 0, 100, `world ${id} unsupported eligibility-outreach decisions`, errors);
  requireFalse(governance.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(flags), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function versionPairsComplete(lineage) {
  return [
    ['approved_release_version','executed_release_version'],
    ['approved_source_population_version','executed_source_population_version'],
    ['approved_eligibility_rule_version','executed_eligibility_rule_version'],
    ['approved_awareness_version','executed_awareness_version'],
    ['approved_invitation_version','executed_invitation_version'],
    ['approved_reachability_version','executed_reachability_version'],
    ['approved_assistance_version','executed_assistance_version'],
    ['approved_workflow_version','executed_workflow_version'],
    ['approved_policy_version','executed_policy_version'],
    ['approved_use','executed_use']
  ].every(([approved, executed]) => text(lineage[approved]) === text(lineage[executed]));
}

export function derivePreferenceEligibilityOutreachFlags(world) {
  const source = object(world.source_population);
  const awareness = object(world.awareness);
  const invitation = object(world.invitation_delivery);
  const reachability = object(world.reachability);
  const usability = object(world.usability_assistance);
  const lineage = object(world.lineage);
  const governance = object(world.governance);

  const sourcePopulationComplete = source.source_frame_complete === true
    && source.population_boundary_complete === true
    && source.refresh_complete === true
    && source.operational_source_population_count === source.declared_eligible_count
    && source.omitted_source_population_count === 0;
  const eligibilityRuleComplete = source.eligibility_rule_complete === true
    && source.proxy_validation_complete === true
    && source.identity_resolution_complete === true
    && source.exception_complete === true
    && source.appeal_complete === true
    && source.false_inclusion_count === 0
    && source.false_exclusion_count === 0
    && source.unappealable_exclusion_count === 0;
  const awarenessComplete = awareness.construct_complete === true
    && awareness.source_complete === true
    && awareness.exposure_complete === true
    && awareness.timing_complete === true
    && awareness.repetition_complete === true
    && awareness.comprehension_complete === true
    && awareness.subgroup_complete === true
    && awareness.measurement_complete === true
    && awareness.aware_count === awareness.population_count
    && awareness.unaware_count === 0
    && awareness.comprehension_confirmed_count === awareness.aware_count
    && awareness.noncomprehending_count === 0;
  const invitationComplete = invitation.notice_identity_complete === true
    && invitation.content_version_complete === true
    && invitation.destination_complete === true
    && invitation.delivery_receipt_complete === true
    && invitation.acknowledgment_complete === true
    && invitation.bounce_failure_complete === true
    && invitation.misdirection_complete === true
    && invitation.retry_terminal_state_complete === true
    && invitation.delivered_count === invitation.population_count
    && invitation.contact_failed_count === 0
    && invitation.bounced_count === 0
    && invitation.misdirected_count === 0
    && invitation.acknowledged_count === invitation.delivered_count;
  const reachabilityComplete = reachability.geographic_complete === true
    && reachability.temporal_complete === true
    && reachability.service_area_complete === true
    && reachability.transport_complete === true
    && reachability.scheduling_complete === true
    && reachability.capacity_availability_complete === true
    && reachability.reachable_count === reachability.population_count
    && reachability.unreachable_count === 0
    && reachability.geographically_excluded_count === 0
    && reachability.temporally_excluded_count === 0
    && reachability.service_area_excluded_count === 0
    && reachability.transport_excluded_count === 0;
  const usabilityComplete = usability.language_complete === true
    && usability.disability_complete === true
    && usability.digital_complete === true
    && usability.documentation_identity_complete === true
    && usability.authentication_complete === true
    && usability.cost_time_complete === true
    && usability.administrative_burden_complete === true
    && usability.assistance_complete === true
    && usability.assistance_effectiveness_complete === true
    && usability.usable_count === usability.population_count
    && usability.unusable_count === 0
    && usability.language_excluded_count === 0
    && usability.disability_excluded_count === 0
    && usability.digital_excluded_count === 0
    && usability.documentation_identity_excluded_count === 0
    && usability.authentication_failed_count === 0
    && usability.cost_time_administrative_burden_count === 0
    && usability.assistance_unavailable_count === 0
    && usability.assistance_completed_count === usability.assistance_needed_count;
  const currentLineageComplete = lineage.current_eligibility_outreach_lineage === true
    && lineage.stale_eligibility_outreach_decision_count === 0
    && lineage.revalidation_state === 'current_and_complete'
    && versionPairsComplete(lineage);
  const monitoringCorrectionComplete = ['monitoring_complete','refresh_complete','drift_trigger_complete','correction_complete','appeal_complete','rollback_complete','certificate_withdrawal_complete','durability_complete'].every(key => governance[key] === true);
  const complete = sourcePopulationComplete && eligibilityRuleComplete && awarenessComplete && invitationComplete
    && reachabilityComplete && usabilityComplete && currentLineageComplete && monitoringCorrectionComplete
    && governance.unsupported_eligibility_outreach_decision_count === 0;

  return {
    complete_eligibility_outreach_assurance: complete,
    source_population_undercoverage_present: !sourcePopulationComplete,
    eligibility_rule_proxy_failure_present: !eligibilityRuleComplete,
    awareness_comprehension_failure_present: !awarenessComplete,
    invitation_delivery_failure_present: !invitationComplete,
    reachability_failure_present: !reachabilityComplete,
    usability_assistance_failure_present: !usabilityComplete,
    stale_eligibility_outreach_lineage_present: !currentLineageComplete,
    source_population_complete: sourcePopulationComplete,
    eligibility_rule_complete: eligibilityRuleComplete,
    awareness_comprehension_complete: awarenessComplete,
    invitation_delivery_complete: invitationComplete,
    reachability_complete: reachabilityComplete,
    usability_assistance_complete: usabilityComplete,
    current_eligibility_outreach_lineage_complete: currentLineageComplete,
    monitoring_correction_complete: monitoringCorrectionComplete
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildWorldChain(world) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = sealedEvent(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  const prefix = world.world_id;
  push({ event_id: `${prefix}:public`, event_type: 'public_eligibility_outreach_surface_observed', evidence_class: 'synthetic_public_surface', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [], payload: world.public_claim });
  push({ event_id: `${prefix}:source`, event_type: 'source_population_state_compiled', evidence_class: 'synthetic_population_frame', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:public`], payload: world.source_population });
  push({ event_id: `${prefix}:rule`, event_type: 'eligibility_rule_proxy_exception_and_appeal_state_compiled', evidence_class: 'synthetic_eligibility_rule', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:source`], payload: world.source_population });
  push({ event_id: `${prefix}:awareness`, event_type: 'awareness_and_comprehension_state_compiled', evidence_class: 'synthetic_awareness', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:rule`], payload: world.awareness });
  push({ event_id: `${prefix}:invitation`, event_type: 'invitation_delivery_state_compiled', evidence_class: 'synthetic_invitation_delivery', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:awareness`], payload: world.invitation_delivery });
  push({ event_id: `${prefix}:reachability`, event_type: 'geographic_and_temporal_reachability_state_compiled', evidence_class: 'synthetic_reachability', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:invitation`], payload: world.reachability });
  push({ event_id: `${prefix}:usability`, event_type: 'usability_and_assistance_state_compiled', evidence_class: 'synthetic_usability_assistance', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:reachability`], payload: world.usability_assistance });
  push({ event_id: `${prefix}:lineage`, event_type: 'eligibility_outreach_lineage_state_compiled', evidence_class: 'synthetic_lineage', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:usability`], payload: world.lineage });
  push({ event_id: `${prefix}:governance`, event_type: 'monitoring_correction_and_authority_state_compiled', evidence_class: 'synthetic_governance', authority: 'eligibility_outreach_assurance_compiler', source_event_ids: [`${prefix}:lineage`], payload: world.governance });
  push({ event_id: `${prefix}:interpretation`, event_type: 'world_interpretation_sealed', evidence_class: 'candidate_inference', authority: 'eligibility_outreach_assurance_analyst', source_event_ids: [`${prefix}:governance`], payload: { mechanism: world.mechanism, flags: world.flags, refused_real_world_promotion: true } });
  return events;
}

function chainErrors(chain, head, label) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  if (array(chain).length !== 10) errors.push(`${label} custody chain must contain ten events`);
  for (const event of array(chain)) {
    if (!text(event?.event_id)) errors.push(`${label} custody event requires event_id`);
    if (seen.has(event?.event_id)) errors.push(`${label} duplicate custody event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`${label} custody event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`${label} custody event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`${label} custody event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (previous !== head) errors.push(`${label} custody head mismatch`);
  return errors;
}

export function validatePreferenceEligibilityOutreachAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_ELIGIBILITY_OUTREACH_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('eligibility-outreach fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-eligibility-outreach-verified-status-different-operational-states-v1') errors.push('eligibility-outreach fixture identity mismatch');
  if (fixture?.issue !== 831 || fixture?.parent_program_issue !== 594) errors.push('eligibility-outreach fixture issue custody mismatch');
  if (fixture?.status !== 'synthetic_control') errors.push('eligibility-outreach fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('eligibility-outreach fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'eligibility-outreach fixture counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('eligibility-outreach baseline mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('eligibility-outreach refusal rules are incomplete');
  for (const key of FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `eligibility-outreach expected_classification.${key}`, errors);
  if (fixture?.expected_classification?.complete_eligibility_outreach_assurance_supported_in_at_least_one_world !== true) errors.push('eligibility-outreach fixture must preserve one complete path');
  if (unique(fixture?.prohibited_inferences).length < 13) errors.push('eligibility-outreach prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('eligibility-outreach interpretation contract is incomplete');
  const records = array(fixture?.worlds);
  if (!sameMembers(records.map(record => record.world_id), WORLD_IDS)) errors.push('eligibility-outreach world denominator is incomplete');
  for (const record of records) {
    const world = expandWorld(fixture, record);
    validateExpandedWorld(world, fixture.baseline, errors);
    const derived = derivePreferenceEligibilityOutreachFlags(world);
    if (JSON.stringify(canonical(derived)) !== JSON.stringify(canonical(record.expected_flags))) errors.push(`eligibility-outreach expected flags mismatch for ${record.world_id}`);
  }
  return errors;
}

export function compilePreferenceEligibilityOutreachAssuranceFixture(fixture) {
  const errors = validatePreferenceEligibilityOutreachAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid eligibility-outreach fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(record => {
    const expanded = expandWorld(fixture, record);
    const flags = derivePreferenceEligibilityOutreachFlags(expanded);
    const publicClaim = expectedPublicClaim(fixture.baseline);
    const governanceSnapshot = {
      source_population: expanded.source_population,
      awareness: expanded.awareness,
      invitation_delivery: expanded.invitation_delivery,
      reachability: expanded.reachability,
      usability_assistance: expanded.usability_assistance,
      lineage: expanded.lineage,
      governance: expanded.governance,
      flags
    };
    const world = {
      world_id: expanded.world_id,
      mechanism: expanded.mechanism,
      public_claim: publicClaim,
      source_population: expanded.source_population,
      awareness: expanded.awareness,
      invitation_delivery: expanded.invitation_delivery,
      reachability: expanded.reachability,
      usability_assistance: expanded.usability_assistance,
      lineage: expanded.lineage,
      governance: expanded.governance,
      flags,
      public_status_signature: sha256(publicClaim),
      governance_signature: sha256(governanceSnapshot)
    };
    const chain = buildWorldChain(world);
    return { ...world, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  });
  const countFlag = key => worlds.filter(world => world.flags[key]).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section]?.[key] ?? 0), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature)).length,
    distinct_eligibility_outreach_governance_signatures: unique(worlds.map(world => world.governance_signature)).length,
    complete_eligibility_outreach_assurance_worlds: countFlag('complete_eligibility_outreach_assurance'),
    source_population_undercoverage_worlds: countFlag('source_population_undercoverage_present'),
    eligibility_rule_proxy_failure_worlds: countFlag('eligibility_rule_proxy_failure_present'),
    awareness_comprehension_failure_worlds: countFlag('awareness_comprehension_failure_present'),
    invitation_delivery_failure_worlds: countFlag('invitation_delivery_failure_present'),
    reachability_failure_worlds: countFlag('reachability_failure_present'),
    usability_assistance_failure_worlds: countFlag('usability_assistance_failure_present'),
    stale_eligibility_outreach_lineage_worlds: countFlag('stale_eligibility_outreach_lineage_present'),
    source_population_complete_worlds: countFlag('source_population_complete'),
    eligibility_rule_complete_worlds: countFlag('eligibility_rule_complete'),
    awareness_comprehension_complete_worlds: countFlag('awareness_comprehension_complete'),
    invitation_delivery_complete_worlds: countFlag('invitation_delivery_complete'),
    reachability_complete_worlds: countFlag('reachability_complete'),
    usability_assistance_complete_worlds: countFlag('usability_assistance_complete'),
    current_eligibility_outreach_lineage_complete_worlds: countFlag('current_eligibility_outreach_lineage_complete'),
    monitoring_correction_complete_worlds: countFlag('monitoring_correction_complete'),
    same_public_eligibility_outreach_surface_worlds: worlds.filter(world => world.public_status_signature === worlds[0].public_status_signature).length,
    total_omitted_source_population_unit_count: sum('source_population','omitted_source_population_count'),
    total_false_exclusion_count: sum('source_population','false_exclusion_count'),
    total_false_inclusion_count: sum('source_population','false_inclusion_count'),
    total_unappealable_exclusion_count: sum('source_population','unappealable_exclusion_count'),
    total_unaware_unit_count: sum('awareness','unaware_count'),
    total_noncomprehending_unit_count: sum('awareness','noncomprehending_count'),
    total_invitation_delivery_failure_count: sum('invitation_delivery','contact_failed_count'),
    total_misdirected_invitation_count: sum('invitation_delivery','misdirected_count'),
    total_contact_failure_count: sum('invitation_delivery','contact_failed_count'),
    total_unreachable_unit_count: sum('reachability','unreachable_count'),
    total_geographically_excluded_unit_count: sum('reachability','geographically_excluded_count'),
    total_temporally_excluded_unit_count: sum('reachability','temporally_excluded_count'),
    total_language_excluded_unit_count: sum('usability_assistance','language_excluded_count'),
    total_disability_excluded_unit_count: sum('usability_assistance','disability_excluded_count'),
    total_digital_excluded_unit_count: sum('usability_assistance','digital_excluded_count'),
    total_documentation_identity_excluded_unit_count: sum('usability_assistance','documentation_identity_excluded_count'),
    total_authentication_failed_unit_count: sum('usability_assistance','authentication_failed_count'),
    total_cost_time_administrative_burden_unit_count: sum('usability_assistance','cost_time_administrative_burden_count'),
    total_assistance_needed_unit_count: sum('usability_assistance','assistance_needed_count'),
    total_assistance_unavailable_unit_count: sum('usability_assistance','assistance_unavailable_count'),
    total_stale_eligibility_outreach_decision_count: sum('lineage','stale_eligibility_outreach_decision_count'),
    total_unsupported_eligibility_outreach_decisions: sum('governance','unsupported_eligibility_outreach_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority).length
  };
  return {
    schema_version: PREFERENCE_ELIGIBILITY_OUTREACH_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    preference_change_present: false,
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceEligibilityOutreachAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_ELIGIBILITY_OUTREACH_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('eligibility-outreach build schema mismatch');
  if (compiled?.fixture_id !== 'same-eligibility-outreach-verified-status-different-operational-states-v1') errors.push('eligibility-outreach build identity mismatch');
  if (compiled?.issue !== 831 || compiled?.parent_program_issue !== 594) errors.push('eligibility-outreach build issue custody mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('eligibility-outreach build graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'eligibility-outreach build counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'eligibility-outreach build conclusion_generated', errors);
  requireFalse(compiled?.preference_change_present, 'eligibility-outreach build preference_change_present', errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('eligibility-outreach build baseline mismatch');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES)) errors.push('eligibility-outreach build refusal rules are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_ELIGIBILITY_OUTREACH_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`eligibility-outreach metric ${key} must remain ${value}`);
  for (const key of FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key], `eligibility-outreach classification.${key}`, errors);
  if (compiled?.classification?.complete_eligibility_outreach_assurance_supported_in_at_least_one_world !== true) errors.push('eligibility-outreach build must preserve one complete path');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('eligibility-outreach build world denominator is incomplete');
  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(object(world.flags)), FLAG_KEYS)) errors.push(`eligibility-outreach build flags incomplete for ${world.world_id}`);
    validateExpandedWorld({ ...world, expected_flags: world.flags }, compiled.baseline, errors);
    const derived = derivePreferenceEligibilityOutreachFlags(world);
    if (JSON.stringify(canonical(derived)) !== JSON.stringify(canonical(world.flags))) errors.push(`eligibility-outreach derived flags mismatch for ${world.world_id}`);
    if (world.public_status_signature !== sha256(world.public_claim)) errors.push(`eligibility-outreach public signature mismatch for ${world.world_id}`);
    const governanceSnapshot = {
      source_population: world.source_population,
      awareness: world.awareness,
      invitation_delivery: world.invitation_delivery,
      reachability: world.reachability,
      usability_assistance: world.usability_assistance,
      lineage: world.lineage,
      governance: world.governance,
      flags: world.flags
    };
    if (world.governance_signature !== sha256(governanceSnapshot)) errors.push(`eligibility-outreach governance signature mismatch for ${world.world_id}`);
    requireFalse(world.governance?.binding_public_authority, `eligibility-outreach world ${world.world_id} binding authority`, errors);
    errors.push(...chainErrors(world.custody_chain, world.custody_chain_head_sha256, `world ${world.world_id}`));
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('eligibility-outreach build caveat is required');
  return errors;
}

function percentage(value) { return `${(Number(value) * 100).toFixed(2)}%`; }

export function renderPreferenceEligibilityOutreachAssuranceMarkdown(compiled) {
  const lines = [
    '# Preference Custody PC-33: eligibility and outreach assurance','',
    `**Fixture:** ${compiled.fixture_id}`,'',
    `**Status:** ${compiled.status}`,'',
    `**Graph effect:** ${compiled.graph_effect}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen public surface','',
    `- Operative release: ${compiled.baseline.operative_release_id}@${compiled.baseline.operative_release_version}`,
    `- Declared eligible units: ${compiled.baseline.declared_eligible_units}`,
    `- Public status: ${compiled.baseline.public_eligibility_outreach_status}`,
    `- Published source-population coverage: ${percentage(compiled.baseline.published_source_population_coverage)}`,
    `- Published inclusion coverage: ${percentage(compiled.baseline.published_inclusion_coverage)}`,
    `- Published exclusions: ${compiled.baseline.published_exclusion_count}`,
    `- Published awareness coverage: ${percentage(compiled.baseline.published_awareness_coverage)}`,
    `- Published invitation-delivery rate: ${percentage(compiled.baseline.published_invitation_delivery_rate)}`,
    `- Published reachability coverage: ${percentage(compiled.baseline.published_reachability_coverage)}`,
    `- Published assistance coverage: ${percentage(compiled.baseline.published_assistance_coverage)}`,'',
    '## Worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',world.mechanism,'',
      `- Complete assurance: ${world.flags.complete_eligibility_outreach_assurance}`,
      `- Declared / operational source population: ${world.source_population.declared_eligible_count} / ${world.source_population.operational_source_population_count}`,
      `- False inclusion / false exclusion: ${world.source_population.false_inclusion_count} / ${world.source_population.false_exclusion_count}`,
      `- Aware / unaware / noncomprehending: ${world.awareness.aware_count} / ${world.awareness.unaware_count} / ${world.awareness.noncomprehending_count}`,
      `- Delivered / contact failed / misdirected: ${world.invitation_delivery.delivered_count} / ${world.invitation_delivery.contact_failed_count} / ${world.invitation_delivery.misdirected_count}`,
      `- Reachable / unreachable: ${world.reachability.reachable_count} / ${world.reachability.unreachable_count}`,
      `- Usable / unusable / assistance unavailable: ${world.usability_assistance.usable_count} / ${world.usability_assistance.unusable_count} / ${world.usability_assistance.assistance_unavailable_count}`,
      `- Unsupported decisions: ${world.governance.unsupported_eligibility_outreach_decision_count}`,
      `- Custody head: ${world.custody_chain_head_sha256}`,'');
  }
  lines.push('## Aggregate metrics','');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Refusal rules','');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
