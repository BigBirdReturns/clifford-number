import { createHash } from 'node:crypto';

export const PREFERENCE_PRE_INTAKE_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-pre-intake-assurance-fixture@1';
export const PREFERENCE_PRE_INTAKE_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-pre-intake-assurance-build@1';

const WORLD_IDS = [
  'complete-eligibility-awareness-invitation-reachability-need-request-intake-and-current-lineage',
  'operational-eligibility-universe-omits-forty-units',
  'published-awareness-coverage-hides-forty-unaware-units',
  'outreach-publication-hides-forty-contact-delivery-failures',
  'nominal-channels-hide-forty-unreachable-or-unusable-access-paths',
  'observed-requests-hide-forty-latent-never-attempted-unmet-need-units',
  'request-and-attempt-capture-loses-thirty-units-through-intake-identity-authentication-duplicate-documentation-or-logging-failure',
  'historical-pre-intake-assurance-inherited-after-eligibility-awareness-outreach-channel-intake-workflow-population-policy-and-release-succession'
];

const FLAG_KEYS = [
  'complete_pre_intake_assurance',
  'eligibility_undercoverage_present',
  'awareness_undercoverage_present',
  'invitation_delivery_failure_present',
  'reachability_access_failure_present',
  'latent_never_attempted_need_failure_present',
  'request_intake_capture_failure_present',
  'stale_pre_intake_lineage_present',
  'eligibility_complete',
  'awareness_complete',
  'invitation_delivery_complete',
  'reachability_access_complete',
  'need_population_complete',
  'request_intake_complete',
  'current_pre_intake_lineage_complete',
  'monitoring_correction_complete'
];

export const EXPECTED_PRE_INTAKE_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_pre_intake_governance_signatures: 8,
  complete_pre_intake_assurance_worlds: 1,
  eligibility_undercoverage_worlds: 1,
  awareness_undercoverage_worlds: 1,
  invitation_delivery_failure_worlds: 1,
  reachability_access_failure_worlds: 1,
  latent_never_attempted_need_failure_worlds: 1,
  request_intake_capture_failure_worlds: 1,
  stale_pre_intake_lineage_worlds: 1,
  eligibility_complete_worlds: 7,
  awareness_complete_worlds: 7,
  invitation_delivery_complete_worlds: 7,
  reachability_access_complete_worlds: 7,
  need_population_complete_worlds: 7,
  request_intake_complete_worlds: 7,
  current_pre_intake_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  same_public_pre_intake_surface_worlds: 8,
  total_omitted_eligible_unit_count: 40,
  total_unaware_unit_count: 40,
  total_contact_delivery_failure_count: 40,
  total_unreachable_unit_count: 40,
  total_language_excluded_unit_count: 20,
  total_disability_excluded_unit_count: 10,
  total_digital_excluded_unit_count: 20,
  total_administrative_burden_excluded_unit_count: 20,
  total_latent_need_unit_count: 40,
  total_never_attempted_need_unit_count: 40,
  total_unmet_need_unit_count: 40,
  total_lost_request_count: 30,
  total_lost_attempt_count: 30,
  total_intake_failed_count: 30,
  total_duplicate_suppressed_count: 10,
  total_documentation_burdened_count: 20,
  total_authentication_failed_count: 20,
  total_stale_pre_intake_decision_count: 100,
  total_unsupported_pre_intake_decisions: 700,
  binding_public_authority_worlds: 0
};

export const FALSE_PRE_INTAKE_CLASSIFICATIONS = [
  'declared_eligibility_identifies_operational_eligibility_universe',
  'published_eligibility_coverage_identifies_complete_inclusion_and_exclusion_custody',
  'notice_availability_identifies_affected_person_awareness',
  'publication_or_sending_identifies_invitation_delivery_or_receipt',
  'channel_existence_identifies_reachable_or_usable_access',
  'nominal_reachability_identifies_language_disability_digital_documentary_identity_authentication_cost_time_or_administrative_usability',
  'absence_of_request_identifies_absence_of_need',
  'observed_requesters_identify_complete_need_population',
  'never_attempting_identifies_absence_of_unmet_need',
  'recorded_requests_identify_complete_requests_when_intake_or_logging_can_fail',
  'published_request_capture_identifies_complete_request_and_attempt_custody',
  'published_intake_success_identifies_absence_of_intake_failure_or_suppressed_attempts',
  'zero_published_unmet_need_identifies_complete_latent_and_never_attempted_need_coverage',
  'historical_pre_intake_assurance_identifies_current_pre_intake_assurance',
  'public_pre_intake_coverage_verified_status_identifies_complete_current_eligibility_awareness_delivery_reachability_need_request_intake_correctable_authorized_evidence',
  'pre_intake_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const REQUIRED_RULES = [
  'declared_eligibility_is_not_the_operational_eligibility_universe',
  'published_eligibility_coverage_is_not_complete_inclusion_and_exclusion_custody',
  'notice_availability_is_not_affected_person_awareness',
  'publication_or_sending_is_not_invitation_delivery_or_receipt',
  'channel_existence_is_not_reachable_or_usable_access',
  'nominal_reachability_is_not_language_disability_digital_documentary_identity_authentication_cost_time_or_administrative_usability',
  'absence_of_request_is_not_absence_of_need',
  'observed_requesters_are_not_the_complete_need_population',
  'never_attempting_is_not_absence_of_unmet_need',
  'recorded_requests_are_not_complete_requests_when_channel_intake_identity_duplicate_authentication_documentation_or_logging_failure_is_possible',
  'published_request_capture_is_not_complete_request_and_attempt_custody',
  'published_intake_success_is_not_absence_of_intake_failure_or_suppressed_attempts',
  'zero_published_unmet_need_is_not_complete_latent_need_and_never_attempted_coverage',
  'historical_pre_intake_assurance_is_not_current_assurance_after_eligibility_outreach_channel_intake_workflow_population_policy_or_release_succession',
  'public_pre_intake_coverage_verified_status_is_not_complete_current_eligibility_complete_awareness_complete_delivery_complete_reachable_need_complete_request_intake_complete_correctable_or_authorized_evidence',
  'pre_intake_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'pre_intake_claim_requires_eligibility_awareness_invitation_delivery_reachability_assistance_need_never_attempted_request_intake_lineage_correction_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  declared_eligible_units: 100,
  public_pre_intake_status: 'pre_intake_coverage_verified',
  published_awareness_coverage: 1,
  published_reachability_coverage: 1,
  published_request_capture_rate: 1,
  published_intake_success_rate: 1,
  published_unmet_need_count: 0,
  approved_use: 'systemwide_release_policy',
  reference_eligibility_version: 'ELIGIBILITY-V1',
  reference_outreach_version: 'OUTREACH-V1',
  reference_intake_version: 'INTAKE-V1',
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
    'operative_release_id','operative_release_version','declared_eligible_units','public_pre_intake_status',
    'published_awareness_coverage','published_reachability_coverage','published_request_capture_rate',
    'published_intake_success_rate','published_unmet_need_count','approved_use'
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
  const eligibility = object(world.eligibility);
  const awareness = object(world.awareness);
  const invitation = object(world.invitation_delivery);
  const reachability = object(world.reachability_access);
  const need = object(world.need_population);
  const request = object(world.request_intake);
  const lineage = object(world.lineage);
  const governance = object(world.governance);
  const flags = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) errors.push(`world ${id} must preserve the frozen pre-intake public surface`);

  for (const key of ['declared_eligible_count','operational_eligible_count','included_count','excluded_count','appealed_exclusion_count','omitted_eligible_count']) integerIn(eligibility[key], 0, 200, `world ${id} eligibility.${key}`, errors);
  if (eligibility.declared_eligible_count !== 100) errors.push(`world ${id} declared eligibility must remain one hundred`);
  if (eligibility.operational_eligible_count < eligibility.declared_eligible_count) errors.push(`world ${id} operational eligibility cannot be below declared eligibility`);
  if (eligibility.omitted_eligible_count !== eligibility.operational_eligible_count - eligibility.declared_eligible_count) errors.push(`world ${id} omitted eligibility must reconcile`);
  if (eligibility.included_count + eligibility.excluded_count !== eligibility.operational_eligible_count) errors.push(`world ${id} inclusion and exclusion must reconcile operational eligibility`);
  for (const key of ['eligibility_rule_complete','source_population_complete','inclusion_exclusion_complete','exception_complete','appeal_complete','refresh_complete']) if (typeof eligibility[key] !== 'boolean') errors.push(`world ${id} eligibility.${key} must be boolean`);
  if (!text(eligibility.ledger_id) || !text(eligibility.state)) errors.push(`world ${id} eligibility identity and state are required`);

  for (const key of ['population_count','aware_count','unaware_count','comprehension_confirmed_count']) integerIn(awareness[key], 0, 200, `world ${id} awareness.${key}`, errors);
  if (awareness.aware_count + awareness.unaware_count !== awareness.population_count) errors.push(`world ${id} awareness population must reconcile`);
  if (awareness.comprehension_confirmed_count > awareness.aware_count) errors.push(`world ${id} comprehension-confirmed awareness exceeds aware count`);
  for (const key of ['construct_complete','source_complete','channel_coverage_complete','timing_complete','repetition_complete','subgroup_complete','measurement_complete']) if (typeof awareness[key] !== 'boolean') errors.push(`world ${id} awareness.${key} must be boolean`);
  if (!text(awareness.ledger_id)) errors.push(`world ${id} awareness ledger is required`);

  for (const key of ['invitation_population_count','invited_count','uninvited_count','delivery_attempted_count','delivered_count','contact_failed_count','retry_count']) integerIn(invitation[key], 0, 200, `world ${id} invitation_delivery.${key}`, errors);
  if (invitation.invited_count + invitation.uninvited_count !== invitation.invitation_population_count) errors.push(`world ${id} invitations must reconcile`);
  if (invitation.delivered_count + invitation.contact_failed_count !== invitation.delivery_attempted_count) errors.push(`world ${id} invitation deliveries must reconcile`);
  for (const key of ['notice_identity_complete','destination_complete','delivery_receipt_complete','bounce_failure_complete','retry_complete','assistance_complete']) if (typeof invitation[key] !== 'boolean') errors.push(`world ${id} invitation_delivery.${key} must be boolean`);
  if (!text(invitation.ledger_id)) errors.push(`world ${id} invitation ledger is required`);

  for (const key of ['population_count','reachable_count','unreachable_count','assistance_needed_count','assistance_received_count','language_excluded_count','disability_excluded_count','digital_excluded_count','documentation_excluded_count','administrative_burden_excluded_count']) integerIn(reachability[key], 0, 200, `world ${id} reachability_access.${key}`, errors);
  if (reachability.reachable_count + reachability.unreachable_count !== reachability.population_count) errors.push(`world ${id} reachability population must reconcile`);
  if (reachability.assistance_received_count > reachability.assistance_needed_count) errors.push(`world ${id} assistance receipts exceed need`);
  for (const key of ['geographic_complete','temporal_complete','language_complete','disability_complete','digital_complete','identity_authentication_complete','documentation_complete','cost_time_complete','administrative_burden_complete','assistance_complete']) if (typeof reachability[key] !== 'boolean') errors.push(`world ${id} reachability_access.${key} must be boolean`);
  if (!text(reachability.ledger_id)) errors.push(`world ${id} reachability ledger is required`);

  for (const key of ['need_population_count','observed_need_count','latent_need_count','never_attempted_need_count','unmet_need_count']) integerIn(need[key], 0, 200, `world ${id} need_population.${key}`, errors);
  if (need.observed_need_count + need.latent_need_count !== need.need_population_count) errors.push(`world ${id} need population must reconcile observed and latent need`);
  if (need.never_attempted_need_count > need.need_population_count || need.unmet_need_count > need.need_population_count) errors.push(`world ${id} never-attempted or unmet need exceeds need population`);
  for (const key of ['construct_complete','independent_need_census_complete','nonrequester_need_complete','latent_need_complete','never_attempted_need_complete','duration_consequence_complete','uncertainty_complete']) if (typeof need[key] !== 'boolean') errors.push(`world ${id} need_population.${key} must be boolean`);
  if (!text(need.ledger_id)) errors.push(`world ${id} need ledger is required`);

  for (const key of ['requesting_count','recorded_request_count','lost_request_count','attempted_count','recorded_attempt_count','lost_attempt_count','intake_failed_count','duplicate_suppressed_count','documentation_burdened_count','authentication_failed_count']) integerIn(request[key], 0, 200, `world ${id} request_intake.${key}`, errors);
  if (request.recorded_request_count + request.lost_request_count !== request.requesting_count) errors.push(`world ${id} request capture must reconcile`);
  if (request.recorded_attempt_count + request.lost_attempt_count !== request.attempted_count) errors.push(`world ${id} attempt capture must reconcile`);
  for (const key of ['channel_complete','timestamp_complete','identity_resolution_complete','authentication_complete','duplicate_rule_validated','documentation_complete','intake_logging_complete','retry_failure_complete','appeal_correction_complete']) if (typeof request[key] !== 'boolean') errors.push(`world ${id} request_intake.${key} must be boolean`);
  if (!text(request.ledger_id)) errors.push(`world ${id} request-intake ledger is required`);

  for (const key of ['approved_release_version','executed_release_version','approved_eligibility_version','executed_eligibility_version','approved_awareness_version','executed_awareness_version','approved_outreach_version','executed_outreach_version','approved_invitation_version','executed_invitation_version','approved_access_version','executed_access_version','approved_intake_version','executed_intake_version','approved_workflow_version','executed_workflow_version','approved_population_version','executed_population_version','approved_policy_version','executed_policy_version','approved_use','executed_use','revalidation_state']) if (!text(lineage[key])) errors.push(`world ${id} lineage.${key} is required`);
  if (typeof lineage.current_pre_intake_lineage !== 'boolean') errors.push(`world ${id} lineage.current_pre_intake_lineage must be boolean`);
  integerIn(lineage.stale_pre_intake_decision_count, 0, 100, `world ${id} stale pre-intake decisions`, errors);

  for (const key of ['monitoring_complete','refresh_complete','drift_trigger_complete','correction_complete','appeal_complete','rollback_complete','certificate_withdrawal_complete','durability_complete']) if (typeof governance[key] !== 'boolean') errors.push(`world ${id} governance.${key} must be boolean`);
  integerIn(governance.unsupported_pre_intake_decision_count, 0, 100, `world ${id} unsupported pre-intake decisions`, errors);
  requireFalse(governance.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(flags), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function versionPairsComplete(lineage) {
  return [
    ['approved_release_version','executed_release_version'],
    ['approved_eligibility_version','executed_eligibility_version'],
    ['approved_awareness_version','executed_awareness_version'],
    ['approved_outreach_version','executed_outreach_version'],
    ['approved_invitation_version','executed_invitation_version'],
    ['approved_access_version','executed_access_version'],
    ['approved_intake_version','executed_intake_version'],
    ['approved_workflow_version','executed_workflow_version'],
    ['approved_population_version','executed_population_version'],
    ['approved_policy_version','executed_policy_version'],
    ['approved_use','executed_use']
  ].every(([approved, executed]) => lineage[approved] === lineage[executed]);
}

export function derivePreferencePreIntakeFlags(world) {
  const e = world.eligibility;
  const a = world.awareness;
  const i = world.invitation_delivery;
  const r = world.reachability_access;
  const n = world.need_population;
  const q = world.request_intake;
  const l = world.lineage;
  const g = world.governance;

  const eligibilityComplete = e.operational_eligible_count === e.declared_eligible_count
    && e.omitted_eligible_count === 0 && e.eligibility_rule_complete && e.source_population_complete
    && e.inclusion_exclusion_complete && e.exception_complete && e.appeal_complete && e.refresh_complete;
  const awarenessComplete = a.aware_count === a.population_count && a.unaware_count === 0
    && a.comprehension_confirmed_count === a.population_count && a.construct_complete && a.source_complete
    && a.channel_coverage_complete && a.timing_complete && a.repetition_complete
    && a.subgroup_complete && a.measurement_complete;
  const invitationComplete = i.invited_count === i.invitation_population_count && i.uninvited_count === 0
    && i.delivery_attempted_count === i.invitation_population_count && i.delivered_count === i.invitation_population_count
    && i.contact_failed_count === 0 && i.notice_identity_complete && i.destination_complete
    && i.delivery_receipt_complete && i.bounce_failure_complete && i.retry_complete && i.assistance_complete;
  const reachabilityComplete = r.reachable_count === r.population_count && r.unreachable_count === 0
    && r.assistance_received_count === r.assistance_needed_count
    && r.language_excluded_count === 0 && r.disability_excluded_count === 0
    && r.digital_excluded_count === 0 && r.documentation_excluded_count === 0
    && r.administrative_burden_excluded_count === 0 && r.geographic_complete && r.temporal_complete
    && r.language_complete && r.disability_complete && r.digital_complete
    && r.identity_authentication_complete && r.documentation_complete && r.cost_time_complete
    && r.administrative_burden_complete && r.assistance_complete;
  const needComplete = n.observed_need_count === n.need_population_count && n.latent_need_count === 0
    && n.never_attempted_need_count === 0 && n.unmet_need_count === world.public_claim.published_unmet_need_count
    && n.construct_complete && n.independent_need_census_complete && n.nonrequester_need_complete
    && n.latent_need_complete && n.never_attempted_need_complete
    && n.duration_consequence_complete && n.uncertainty_complete;
  const requestComplete = q.recorded_request_count === q.requesting_count && q.lost_request_count === 0
    && q.recorded_attempt_count === q.attempted_count && q.lost_attempt_count === 0
    && q.intake_failed_count === 0 && q.duplicate_suppressed_count === 0
    && q.documentation_burdened_count === 0 && q.authentication_failed_count === 0
    && q.channel_complete && q.timestamp_complete && q.identity_resolution_complete
    && q.authentication_complete && q.duplicate_rule_validated && q.documentation_complete
    && q.intake_logging_complete && q.retry_failure_complete && q.appeal_correction_complete;
  const lineageComplete = versionPairsComplete(l) && l.current_pre_intake_lineage
    && l.stale_pre_intake_decision_count === 0 && l.revalidation_state === 'current_complete';
  const monitoringComplete = g.monitoring_complete && g.refresh_complete && g.drift_trigger_complete
    && g.correction_complete && g.appeal_complete && g.rollback_complete
    && g.certificate_withdrawal_complete && g.durability_complete;
  const complete = eligibilityComplete && awarenessComplete && invitationComplete && reachabilityComplete
    && needComplete && requestComplete && lineageComplete && monitoringComplete;

  return {
    complete_pre_intake_assurance: complete,
    eligibility_undercoverage_present: !eligibilityComplete,
    awareness_undercoverage_present: !awarenessComplete,
    invitation_delivery_failure_present: !invitationComplete,
    reachability_access_failure_present: !reachabilityComplete,
    latent_never_attempted_need_failure_present: !needComplete,
    request_intake_capture_failure_present: !requestComplete,
    stale_pre_intake_lineage_present: !lineageComplete,
    eligibility_complete: eligibilityComplete,
    awareness_complete: awarenessComplete,
    invitation_delivery_complete: invitationComplete,
    reachability_access_complete: reachabilityComplete,
    need_population_complete: needComplete,
    request_intake_complete: requestComplete,
    current_pre_intake_lineage_complete: lineageComplete,
    monitoring_correction_complete: monitoringComplete
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildWorldChain(world, flags) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  const prefix = world.world_id;
  push({ event_id: `${prefix}:public`, event_type: 'public_pre_intake_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'pre_intake_assurance_compiler', source_event_ids: [], payload: world.public_claim });
  push({ event_id: `${prefix}:eligibility`, event_type: 'operational_eligibility_universe_sealed', evidence_class: 'synthetic_control_state', authority: 'eligibility_ledger', source_event_ids: [`${prefix}:public`], payload: world.eligibility });
  push({ event_id: `${prefix}:awareness`, event_type: 'affected_person_awareness_state_sealed', evidence_class: 'synthetic_control_state', authority: 'awareness_ledger', source_event_ids: [`${prefix}:eligibility`], payload: world.awareness });
  push({ event_id: `${prefix}:invitation`, event_type: 'invitation_notice_delivery_and_receipt_state_sealed', evidence_class: 'synthetic_control_state', authority: 'invitation_delivery_ledger', source_event_ids: [`${prefix}:awareness`], payload: world.invitation_delivery });
  push({ event_id: `${prefix}:reachability`, event_type: 'reachability_usability_and_assistance_state_sealed', evidence_class: 'synthetic_control_state', authority: 'reachability_access_ledger', source_event_ids: [`${prefix}:invitation`], payload: world.reachability_access });
  push({ event_id: `${prefix}:need`, event_type: 'latent_never_attempted_and_unmet_need_state_sealed', evidence_class: 'synthetic_control_state', authority: 'need_population_ledger', source_event_ids: [`${prefix}:reachability`], payload: world.need_population });
  push({ event_id: `${prefix}:request`, event_type: 'request_attempt_intake_identity_authentication_documentation_and_logging_state_sealed', evidence_class: 'synthetic_control_state', authority: 'request_intake_ledger', source_event_ids: [`${prefix}:need`], payload: world.request_intake });
  push({ event_id: `${prefix}:lineage`, event_type: 'pre_intake_lineage_monitoring_correction_and_authority_sealed', evidence_class: 'synthetic_control_state', authority: 'pre_intake_governance_ledger', source_event_ids: [`${prefix}:request`], payload: { lineage: world.lineage, governance: world.governance } });
  push({ event_id: `${prefix}:mechanism`, event_type: 'pre_intake_failure_mechanism_classified', evidence_class: 'synthetic_control_classification', authority: 'pre_intake_assurance_compiler', source_event_ids: [`${prefix}:lineage`], payload: { mechanism: world.mechanism, flags } });
  push({ event_id: `${prefix}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'pre_intake_assurance_analyst', source_event_ids: [`${prefix}:mechanism`], payload: { allowed: 'synthetic pre-intake governance equifinality only', refused: ['named_service_finding','real_world_access_finding','discrimination_finding','intent_inference','public_authorization'] } });
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
    if (event?.previous_event_sha256 !== previous) errors.push(`${label} event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`${label} event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`${label} event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (previous !== head) errors.push(`${label} custody head mismatch`);
  return errors;
}

export function validatePreferencePreIntakeAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_PRE_INTAKE_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('pre-intake fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-pre-intake-coverage-verified-status-different-operational-states-v1') errors.push('pre-intake fixture identity mismatch');
  if (fixture?.issue !== 822 || fixture?.parent_program_issue !== 594) errors.push('pre-intake issue custody mismatch');
  if (fixture?.status !== 'synthetic_control') errors.push('pre-intake fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('pre-intake fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'pre-intake fixture counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('pre-intake fixture baseline mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('pre-intake refusal rules are incomplete');
  for (const key of FALSE_PRE_INTAKE_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `pre-intake expected_classification.${key}`, errors);
  if (fixture?.expected_classification?.complete_pre_intake_assurance_supported_in_at_least_one_world !== true) errors.push('pre-intake fixture must preserve one complete path');
  if (!sameMembers(array(fixture?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('pre-intake world denominator is incomplete');
  for (const record of array(fixture?.worlds)) {
    const world = expandWorld(fixture, record);
    validateExpandedWorld(world, fixture.baseline, errors);
    const derived = derivePreferencePreIntakeFlags(world);
    if (JSON.stringify(canonical(derived)) !== JSON.stringify(canonical(record.expected_flags))) errors.push(`pre-intake expected flags mismatch for ${record.world_id}`);
  }
  if (unique(fixture?.prohibited_inferences).length < 15) errors.push('pre-intake prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('pre-intake interpretation contract is incomplete');
  return errors;
}

export function compilePreferencePreIntakeAssuranceFixture(fixture) {
  const errors = validatePreferencePreIntakeAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid pre-intake assurance fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(record => {
    const expanded = expandWorld(fixture, record);
    const flags = derivePreferencePreIntakeFlags(expanded);
    const custodyChain = buildWorldChain(expanded, flags);
    const governanceState = {
      mechanism: expanded.mechanism,
      eligibility: expanded.eligibility,
      awareness: expanded.awareness,
      invitation_delivery: expanded.invitation_delivery,
      reachability_access: expanded.reachability_access,
      need_population: expanded.need_population,
      request_intake: expanded.request_intake,
      lineage: expanded.lineage,
      governance: expanded.governance,
      flags
    };
    return {
      ...expanded,
      flags,
      public_status_signature: sha256(expanded.public_claim),
      governance_signature: sha256(governanceState),
      custody_chain: custodyChain,
      custody_chain_head_sha256: custodyChain.at(-1).event_sha256
    };
  });
  const countFlag = key => worlds.filter(world => world.flags[key]).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section][key]), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature)).length,
    distinct_pre_intake_governance_signatures: unique(worlds.map(world => world.governance_signature)).length,
    complete_pre_intake_assurance_worlds: countFlag('complete_pre_intake_assurance'),
    eligibility_undercoverage_worlds: countFlag('eligibility_undercoverage_present'),
    awareness_undercoverage_worlds: countFlag('awareness_undercoverage_present'),
    invitation_delivery_failure_worlds: countFlag('invitation_delivery_failure_present'),
    reachability_access_failure_worlds: countFlag('reachability_access_failure_present'),
    latent_never_attempted_need_failure_worlds: countFlag('latent_never_attempted_need_failure_present'),
    request_intake_capture_failure_worlds: countFlag('request_intake_capture_failure_present'),
    stale_pre_intake_lineage_worlds: countFlag('stale_pre_intake_lineage_present'),
    eligibility_complete_worlds: countFlag('eligibility_complete'),
    awareness_complete_worlds: countFlag('awareness_complete'),
    invitation_delivery_complete_worlds: countFlag('invitation_delivery_complete'),
    reachability_access_complete_worlds: countFlag('reachability_access_complete'),
    need_population_complete_worlds: countFlag('need_population_complete'),
    request_intake_complete_worlds: countFlag('request_intake_complete'),
    current_pre_intake_lineage_complete_worlds: countFlag('current_pre_intake_lineage_complete'),
    monitoring_correction_complete_worlds: countFlag('monitoring_correction_complete'),
    same_public_pre_intake_surface_worlds: worlds.filter(world => world.public_status_signature === worlds[0].public_status_signature).length,
    total_omitted_eligible_unit_count: sum('eligibility','omitted_eligible_count'),
    total_unaware_unit_count: sum('awareness','unaware_count'),
    total_contact_delivery_failure_count: sum('invitation_delivery','contact_failed_count'),
    total_unreachable_unit_count: sum('reachability_access','unreachable_count'),
    total_language_excluded_unit_count: sum('reachability_access','language_excluded_count'),
    total_disability_excluded_unit_count: sum('reachability_access','disability_excluded_count'),
    total_digital_excluded_unit_count: sum('reachability_access','digital_excluded_count'),
    total_administrative_burden_excluded_unit_count: sum('reachability_access','administrative_burden_excluded_count'),
    total_latent_need_unit_count: sum('need_population','latent_need_count'),
    total_never_attempted_need_unit_count: sum('need_population','never_attempted_need_count'),
    total_unmet_need_unit_count: sum('need_population','unmet_need_count'),
    total_lost_request_count: sum('request_intake','lost_request_count'),
    total_lost_attempt_count: sum('request_intake','lost_attempt_count'),
    total_intake_failed_count: sum('request_intake','intake_failed_count'),
    total_duplicate_suppressed_count: sum('request_intake','duplicate_suppressed_count'),
    total_documentation_burdened_count: sum('request_intake','documentation_burdened_count'),
    total_authentication_failed_count: sum('request_intake','authentication_failed_count'),
    total_stale_pre_intake_decision_count: sum('lineage','stale_pre_intake_decision_count'),
    total_unsupported_pre_intake_decisions: sum('governance','unsupported_pre_intake_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority).length
  };
  return {
    schema_version: PREFERENCE_PRE_INTAKE_ASSURANCE_BUILD_SCHEMA_VERSION,
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

export function validatePreferencePreIntakeAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_PRE_INTAKE_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('pre-intake build schema mismatch');
  if (compiled?.fixture_id !== 'same-pre-intake-coverage-verified-status-different-operational-states-v1') errors.push('pre-intake build identity mismatch');
  if (compiled?.issue !== 822 || compiled?.parent_program_issue !== 594) errors.push('pre-intake build issue custody mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('pre-intake build graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'pre-intake build counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'pre-intake build conclusion_generated', errors);
  requireFalse(compiled?.preference_change_present, 'pre-intake build preference_change_present', errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('pre-intake build baseline mismatch');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES)) errors.push('pre-intake build refusal rules are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_PRE_INTAKE_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`pre-intake metric ${key} must remain ${value}`);
  for (const key of FALSE_PRE_INTAKE_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key], `pre-intake classification.${key}`, errors);
  if (compiled?.classification?.complete_pre_intake_assurance_supported_in_at_least_one_world !== true) errors.push('pre-intake build must preserve one complete path');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('pre-intake build world denominator is incomplete');
  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(object(world.flags)), FLAG_KEYS)) errors.push(`pre-intake build flags incomplete for ${world.world_id}`);
    validateExpandedWorld({ ...world, expected_flags: world.flags }, compiled.baseline, errors);
    const derived = derivePreferencePreIntakeFlags(world);
    if (JSON.stringify(canonical(derived)) !== JSON.stringify(canonical(world.flags))) errors.push(`pre-intake derived flags mismatch for ${world.world_id}`);
    if (world.public_status_signature !== sha256(world.public_claim)) errors.push(`pre-intake public signature mismatch for ${world.world_id}`);
    if (!/^[0-9a-f]{64}$/.test(text(world.governance_signature))) errors.push(`pre-intake governance signature invalid for ${world.world_id}`);
    requireFalse(world.governance?.binding_public_authority, `pre-intake world ${world.world_id} binding authority`, errors);
    errors.push(...chainErrors(world.custody_chain, world.custody_chain_head_sha256, `world ${world.world_id}`));
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('pre-intake build caveat is required');
  return errors;
}

function percentage(value) { return `${(Number(value) * 100).toFixed(2)}%`; }

export function renderPreferencePreIntakeAssuranceMarkdown(compiled) {
  const lines = [
    '# Preference Custody PC-32: pre-intake assurance','',
    `**Fixture:** ${compiled.fixture_id}`,'',
    `**Status:** ${compiled.status}`,'',
    `**Graph effect:** ${compiled.graph_effect}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen public surface','',
    `- Operative release: ${compiled.baseline.operative_release_id}@${compiled.baseline.operative_release_version}`,
    `- Declared eligible units: ${compiled.baseline.declared_eligible_units}`,
    `- Public status: ${compiled.baseline.public_pre_intake_status}`,
    `- Published awareness coverage: ${percentage(compiled.baseline.published_awareness_coverage)}`,
    `- Published reachability coverage: ${percentage(compiled.baseline.published_reachability_coverage)}`,
    `- Published request capture rate: ${percentage(compiled.baseline.published_request_capture_rate)}`,
    `- Published intake success rate: ${percentage(compiled.baseline.published_intake_success_rate)}`,
    `- Published unmet need: ${compiled.baseline.published_unmet_need_count}`,'',
    '## Worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',world.mechanism,'',
      `- Complete assurance: ${world.flags.complete_pre_intake_assurance}`,
      `- Declared / operational eligible: ${world.eligibility.declared_eligible_count} / ${world.eligibility.operational_eligible_count}`,
      `- Aware / unaware: ${world.awareness.aware_count} / ${world.awareness.unaware_count}`,
      `- Delivered / contact failed: ${world.invitation_delivery.delivered_count} / ${world.invitation_delivery.contact_failed_count}`,
      `- Reachable / unreachable: ${world.reachability_access.reachable_count} / ${world.reachability_access.unreachable_count}`,
      `- Observed / latent / never-attempted need: ${world.need_population.observed_need_count} / ${world.need_population.latent_need_count} / ${world.need_population.never_attempted_need_count}`,
      `- Lost requests / attempts: ${world.request_intake.lost_request_count} / ${world.request_intake.lost_attempt_count}`,
      `- Unsupported decisions: ${world.governance.unsupported_pre_intake_decision_count}`,
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
