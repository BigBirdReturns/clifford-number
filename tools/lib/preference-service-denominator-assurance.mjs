import { createHash } from 'node:crypto';

export const PREFERENCE_SERVICE_DENOMINATOR_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-service-denominator-assurance-fixture@1';
export const PREFERENCE_SERVICE_DENOMINATOR_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-service-denominator-assurance-build@1';

const WORLD_IDS = [
  'complete-eligibility-request-queue-rationing-denial-unserved-completion-and-current-lineage',
  'operationally-eligible-population-omitted-before-intake',
  'request-and-attempt-loss-through-channel-intake-identity-duplicate-and-logging-failure',
  'queue-snapshot-reset-abandonment-and-wait-censoring',
  'rationing-priority-overrides-and-displacement-omitted',
  'true-denials-relabeled-as-referral-deferral-ineligibility-no-response-withdrawal-or-pending',
  'completion-records-contain-partials-duplicates-rework-recurrence-and-survivor-selection',
  'historical-denominator-assurance-inherited-after-eligibility-intake-queue-rationing-denial-service-workflow-population-and-policy-succession'
];

const FLAG_KEYS = [
  'complete_service_denominator_assurance',
  'eligible_population_undercoverage_present',
  'request_attempt_capture_failure_present',
  'queue_wait_censoring_present',
  'rationing_priority_opacity_present',
  'denial_reclassification_present',
  'completion_reconciliation_failure_present',
  'stale_service_denominator_lineage_present',
  'eligible_population_complete',
  'request_attempt_complete',
  'queue_wait_complete',
  'rationing_priority_complete',
  'denial_disposition_complete',
  'unserved_population_complete',
  'completion_reconciliation_complete',
  'current_service_denominator_lineage_complete',
  'monitoring_correction_complete'
];

export const EXPECTED_SERVICE_DENOMINATOR_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_service_denominator_governance_signatures: 8,
  complete_service_denominator_assurance_worlds: 1,
  eligible_population_undercoverage_worlds: 1,
  request_attempt_capture_failure_worlds: 1,
  queue_wait_censoring_worlds: 1,
  rationing_priority_opacity_worlds: 1,
  denial_reclassification_worlds: 1,
  completion_reconciliation_failure_worlds: 1,
  stale_service_denominator_lineage_worlds: 1,
  eligible_population_complete_worlds: 7,
  request_attempt_complete_worlds: 7,
  queue_wait_complete_worlds: 7,
  rationing_priority_complete_worlds: 7,
  denial_disposition_complete_worlds: 7,
  unserved_population_complete_worlds: 6,
  completion_reconciliation_complete_worlds: 7,
  current_service_denominator_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  same_public_service_surface_worlds: 8,
  total_omitted_eligible_unit_count: 40,
  total_unserved_no_attempt_count: 40,
  total_lost_request_count: 30,
  total_lost_attempt_count: 30,
  total_queued_unit_count: 40,
  total_queue_abandoned_unit_count: 20,
  total_censored_wait_unit_count: 40,
  total_rationed_unit_count: 30,
  total_priority_overridden_unit_count: 20,
  total_displaced_unit_count: 20,
  total_true_denied_unit_count: 30,
  total_relabeled_denial_count: 30,
  total_referred_unit_count: 20,
  total_deferred_unit_count: 20,
  total_partial_completion_count: 40,
  total_duplicate_completion_count: 20,
  total_rework_record_count: 20,
  total_recurrent_service_record_count: 30,
  total_survivor_selected_unit_count: 40,
  total_stale_denominator_decision_count: 100,
  total_unsupported_service_denominator_decisions: 700,
  binding_public_authority_worlds: 0
};

export const FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS = [
  'declared_eligible_units_identify_operationally_eligible_population',
  'no_recorded_request_identifies_no_service_need',
  'no_recorded_attempt_identifies_no_attempt_when_intake_or_logging_can_fail',
  'single_queue_snapshot_identifies_complete_queue_and_wait_custody',
  'zero_published_queue_count_identifies_zero_true_queue',
  'zero_published_rationing_count_identifies_absence_of_rationing_priority_override_or_displacement',
  'non_denial_labels_identify_true_non_denial_dispositions',
  'zero_published_denial_rate_identifies_zero_true_denial',
  'zero_published_unserved_count_identifies_complete_unserved_population',
  'published_completion_records_identify_unique_substantive_durable_completions',
  'service_start_partial_duplicate_rework_recurrence_or_survivor_observation_identifies_durable_completion',
  'published_median_wait_identifies_complete_wait_distribution',
  'historical_denominator_assurance_identifies_current_service_denominator_assurance',
  'public_service_denominator_verified_status_identifies_complete_current_request_queue_rationing_denial_unserved_completion_correctable_authorized_evidence',
  'service_denominator_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const REQUIRED_RULES = [
  'declared_eligible_units_are_not_the_operationally_eligible_population',
  'no_recorded_request_is_not_no_service_need',
  'no_recorded_attempt_is_not_no_attempt_when_intake_or_channel_logging_can_fail',
  'one_queue_snapshot_is_not_complete_queue_entry_exit_abandonment_reset_transfer_or_wait_time_custody',
  'zero_published_queue_count_is_not_zero_true_queue',
  'zero_published_rationing_count_is_not_absence_of_rationing_prioritization_override_or_displacement',
  'referral_deferral_ineligibility_no_response_withdrawal_or_pending_labels_are_not_necessarily_non_denial_dispositions',
  'zero_published_denial_rate_is_not_zero_true_denial',
  'zero_published_unserved_count_is_not_complete_unserved_population_coverage',
  'published_completion_records_are_not_unique_substantive_durable_completions',
  'service_start_partial_duplicate_rework_recurrence_or_survivor_observation_is_not_durable_completion',
  'published_median_wait_is_not_complete_wait_distribution_when_censoring_or_abandonment_is_unresolved',
  'historical_denominator_assurance_is_not_current_assurance_after_eligibility_intake_queue_rationing_denial_service_workflow_population_or_policy_succession',
  'public_service_denominator_verified_status_is_not_complete_current_request_complete_queue_complete_rationing_complete_denial_complete_unserved_complete_completion_reconciled_correctable_or_authorized_evidence',
  'service_denominator_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'service_denominator_claim_requires_eligibility_request_attempt_queue_wait_rationing_priority_denial_unserved_completion_durability_lineage_correction_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  declared_eligible_units: 100,
  published_service_records: 100,
  public_service_status: 'service_denominator_verified',
  published_completion_rate: 1,
  published_queue_count: 0,
  published_rationing_count: 0,
  published_denial_rate: 0,
  published_unserved_count: 0,
  published_median_wait_days: 5,
  approved_use: 'systemwide_release_policy',
  reference_eligibility_version: 'ELIGIBILITY-V1',
  reference_service_version: 'SERVICE-V1',
  binding_public_authority: false
};

const EPSILON = 1e-12;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const close = (left, right, tolerance = EPSILON) => Math.abs(Number(left) - Number(right)) <= tolerance;
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
    'operative_release_id','operative_release_version','declared_eligible_units','published_service_records',
    'public_service_status','published_completion_rate','published_queue_count','published_rationing_count',
    'published_denial_rate','published_unserved_count','published_median_wait_days','approved_use'
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
  const request = object(world.request_attempt);
  const queue = object(world.queue);
  const rationing = object(world.rationing);
  const denial = object(world.denial);
  const completion = object(world.completion);
  const lineage = object(world.lineage);
  const analysis = object(world.analysis);
  const governance = object(world.governance);
  const flags = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen service-denominator publication surface`);
  }

  for (const key of ['declared_eligible_count','operational_eligible_count','aware_count','invited_count','reachable_count','omitted_eligible_count','unserved_no_attempt_count']) {
    integerIn(eligibility[key], 0, 200, `world ${id} eligibility.${key}`, errors);
  }
  if (eligibility.declared_eligible_count !== 100) errors.push(`world ${id} declared eligible count must remain one hundred`);
  if (eligibility.operational_eligible_count < eligibility.declared_eligible_count) errors.push(`world ${id} operational eligible count cannot be below declared count`);
  if (eligibility.omitted_eligible_count !== eligibility.operational_eligible_count - eligibility.declared_eligible_count) errors.push(`world ${id} omitted eligible count must reconcile declared and operational eligibility`);
  if (eligibility.unserved_no_attempt_count > eligibility.omitted_eligible_count) errors.push(`world ${id} unserved-no-attempt count cannot exceed omitted eligible count`);
  for (const key of ['aware_count','invited_count','reachable_count']) if (eligibility[key] > eligibility.operational_eligible_count) errors.push(`world ${id} eligibility.${key} exceeds operational eligibility`);
  for (const key of ['eligibility_rule_complete','source_population_complete','exclusion_ledger_complete','awareness_complete','invitation_complete','reachability_complete','never_attempted_need_complete']) {
    if (typeof eligibility[key] !== 'boolean') errors.push(`world ${id} eligibility.${key} must be boolean`);
  }
  if (!text(eligibility.eligibility_ledger_id) || !text(eligibility.eligibility_state)) errors.push(`world ${id} eligibility identity and state are required`);

  for (const key of ['requesting_count','recorded_request_count','attempted_count','recorded_attempt_count','intake_failed_count','duplicate_suppressed_count','lost_request_count','lost_attempt_count']) {
    integerIn(request[key], 0, 200, `world ${id} request_attempt.${key}`, errors);
  }
  if (request.recorded_request_count > request.requesting_count || request.recorded_attempt_count > request.attempted_count) errors.push(`world ${id} recorded requests or attempts exceed true counts`);
  if (request.lost_request_count !== request.requesting_count - request.recorded_request_count) errors.push(`world ${id} lost request count does not reconcile`);
  if (request.lost_attempt_count !== request.attempted_count - request.recorded_attempt_count) errors.push(`world ${id} lost attempt count does not reconcile`);
  if (request.intake_failed_count + request.duplicate_suppressed_count > request.lost_attempt_count) errors.push(`world ${id} intake and duplicate losses exceed lost attempts`);
  for (const key of ['channel_coverage_complete','identity_resolution_complete','intake_logging_complete','duplicate_rule_validated','retry_failure_complete','request_attempt_reconciled']) {
    if (typeof request[key] !== 'boolean') errors.push(`world ${id} request_attempt.${key} must be boolean`);
  }
  if (!text(request.request_ledger_id)) errors.push(`world ${id} request ledger identity is required`);

  for (const key of ['queued_count','queue_exit_count','queue_abandoned_count','queue_reset_count','queue_transfer_count','censored_wait_count','published_queue_count','median_wait_days','published_median_wait_days','max_wait_days']) {
    integerIn(queue[key], 0, 200, `world ${id} queue.${key}`, errors);
  }
  if (queue.queue_exit_count + queue.queue_abandoned_count > queue.queued_count) errors.push(`world ${id} queue exit and abandonment counts exceed queued units`);
  if (queue.queue_reset_count > queue.queued_count || queue.queue_transfer_count > queue.queued_count || queue.censored_wait_count > queue.queued_count) errors.push(`world ${id} queue reset, transfer, or censoring exceeds queued units`);
  if (queue.published_queue_count !== 0 || queue.published_median_wait_days !== 5) errors.push(`world ${id} must preserve public queue and wait values`);
  for (const key of ['entry_complete','exit_complete','abandonment_complete','reset_transfer_complete','wait_distribution_complete','snapshot_history_complete']) {
    if (typeof queue[key] !== 'boolean') errors.push(`world ${id} queue.${key} must be boolean`);
  }
  if (!text(queue.queue_ledger_id)) errors.push(`world ${id} queue ledger identity is required`);

  for (const key of ['rationed_count','priority_overridden_count','displaced_count','capacity_denied_count','published_rationing_count']) {
    integerIn(rationing[key], 0, 200, `world ${id} rationing.${key}`, errors);
    if (rationing[key] > eligibility.operational_eligible_count) errors.push(`world ${id} rationing.${key} exceeds operational eligibility`);
  }
  if (rationing.published_rationing_count !== 0) errors.push(`world ${id} must preserve zero published rationing`);
  for (const key of ['rule_predeclared','priority_classes_complete','threshold_complete','exception_complete','override_complete','displacement_complete','rationing_population_complete']) {
    if (typeof rationing[key] !== 'boolean') errors.push(`world ${id} rationing.${key} must be boolean`);
  }
  if (!text(rationing.rationing_ledger_id) || !text(rationing.scarce_resource_id)) errors.push(`world ${id} rationing identities are required`);

  for (const key of ['true_denied_count','published_denied_count','relabeled_denial_count','referred_count','deferred_count','ineligible_count','no_response_count','withdrawal_count','pending_count','appealed_count','reversed_count']) {
    integerIn(denial[key], 0, 200, `world ${id} denial.${key}`, errors);
    if (denial[key] > eligibility.operational_eligible_count) errors.push(`world ${id} denial.${key} exceeds operational eligibility`);
  }
  if (denial.published_denied_count !== 0 || denial.relabeled_denial_count > denial.true_denied_count) errors.push(`world ${id} denial publication or relabel count is invalid`);
  for (const key of ['denial_reason_complete','label_crosswalk_complete','final_disposition_complete','appeal_reversal_complete']) {
    if (typeof denial[key] !== 'boolean') errors.push(`world ${id} denial.${key} must be boolean`);
  }
  if (!text(denial.denial_ledger_id)) errors.push(`world ${id} denial ledger identity is required`);

  for (const key of ['service_record_count','unique_person_count','started_count','substantive_completed_count','durable_completed_count','partial_completion_count','duplicate_completion_count','rework_record_count','recurrent_service_record_count','survivor_selected_count','published_completion_count']) {
    integerIn(completion[key], 0, 200, `world ${id} completion.${key}`, errors);
    if (completion[key] > completion.service_record_count && key !== 'service_record_count') errors.push(`world ${id} completion.${key} exceeds service records`);
  }
  if (completion.service_record_count !== 100 || completion.published_completion_count !== 100) errors.push(`world ${id} must preserve one hundred service and published completion records`);
  if (completion.durable_completed_count > completion.substantive_completed_count || completion.substantive_completed_count > completion.started_count) errors.push(`world ${id} durable, substantive, and started completion counts are inconsistent`);
  for (const key of ['unique_person_reconciled','completion_definition_complete','dose_complete','duplicate_reconciled','rework_recurrence_complete','durability_complete','survivor_independent']) {
    if (typeof completion[key] !== 'boolean') errors.push(`world ${id} completion.${key} must be boolean`);
  }
  if (!text(completion.completion_ledger_id)) errors.push(`world ${id} completion ledger identity is required`);

  for (const key of [
    'approved_release_version','executed_release_version','approved_eligibility_version','executed_eligibility_version',
    'approved_intake_version','executed_intake_version','approved_queue_version','executed_queue_version',
    'approved_rationing_version','executed_rationing_version','approved_denial_version','executed_denial_version',
    'approved_service_version','executed_service_version','approved_workflow_version','executed_workflow_version',
    'approved_population_version','executed_population_version','approved_policy_version','executed_policy_version',
    'approved_use','executed_use','revalidation_state'
  ]) if (!text(lineage[key])) errors.push(`world ${id} lineage.${key} is required`);
  integerIn(lineage.stale_denominator_decision_count, 0, 100, `world ${id} stale denominator decisions`, errors);
  if (typeof lineage.current_service_denominator_lineage !== 'boolean') errors.push(`world ${id} current service-denominator lineage must be boolean`);
  if (lineage.succession_receipt !== null && !text(lineage.succession_receipt)) errors.push(`world ${id} succession receipt is invalid`);

  for (const key of ['published_completion_rate','independent_completion_rate','published_denial_rate','independent_denial_rate']) {
    const value = Number(analysis[key]);
    if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(`world ${id} analysis.${key} must be a rate in [0, 1]`);
  }
  for (const key of ['published_queue_count','independent_queue_count','published_unserved_count','independent_unserved_count','published_median_wait_days','independent_median_wait_days']) {
    if (!Number.isFinite(Number(analysis[key])) || Number(analysis[key]) < 0) errors.push(`world ${id} analysis.${key} is invalid`);
  }
  if (!close(analysis.published_completion_rate, 1) || !close(analysis.published_denial_rate, 0) || analysis.published_queue_count !== 0 || analysis.published_unserved_count !== 0 || analysis.published_median_wait_days !== 5) {
    errors.push(`world ${id} must preserve the public analysis surface`);
  }
  for (const key of ['uncertainty_complete','sensitivity_complete']) if (typeof analysis[key] !== 'boolean') errors.push(`world ${id} analysis.${key} must be boolean`);

  for (const key of ['monitoring_complete','correction_complete','appeal_complete','rollback_complete','certificate_withdrawal_complete','durability_complete']) {
    if (typeof governance[key] !== 'boolean') errors.push(`world ${id} governance.${key} must be boolean`);
  }
  integerIn(governance.unsupported_service_denominator_decision_count, 0, 100, `world ${id} unsupported service-denominator decisions`, errors);
  requireFalse(governance.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(flags), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function versionPairsComplete(lineage) {
  return [
    ['approved_release_version','executed_release_version'],
    ['approved_eligibility_version','executed_eligibility_version'],
    ['approved_intake_version','executed_intake_version'],
    ['approved_queue_version','executed_queue_version'],
    ['approved_rationing_version','executed_rationing_version'],
    ['approved_denial_version','executed_denial_version'],
    ['approved_service_version','executed_service_version'],
    ['approved_workflow_version','executed_workflow_version'],
    ['approved_population_version','executed_population_version'],
    ['approved_policy_version','executed_policy_version'],
    ['approved_use','executed_use']
  ].every(([approved, executed]) => lineage[approved] === lineage[executed]);
}

export function derivePreferenceServiceDenominatorFlags(world) {
  const eligibility = world.eligibility;
  const request = world.request_attempt;
  const queue = world.queue;
  const rationing = world.rationing;
  const denial = world.denial;
  const completion = world.completion;
  const lineage = world.lineage;
  const governance = world.governance;

  const eligiblePopulationComplete = eligibility.operational_eligible_count === eligibility.declared_eligible_count
    && eligibility.omitted_eligible_count === 0
    && eligibility.unserved_no_attempt_count === 0
    && eligibility.eligibility_rule_complete && eligibility.source_population_complete
    && eligibility.exclusion_ledger_complete && eligibility.awareness_complete
    && eligibility.invitation_complete && eligibility.reachability_complete
    && eligibility.never_attempted_need_complete;

  const requestAttemptComplete = request.recorded_request_count === request.requesting_count
    && request.recorded_attempt_count === request.attempted_count
    && request.lost_request_count === 0 && request.lost_attempt_count === 0
    && request.intake_failed_count === 0 && request.duplicate_suppressed_count === 0
    && request.channel_coverage_complete && request.identity_resolution_complete
    && request.intake_logging_complete && request.duplicate_rule_validated
    && request.retry_failure_complete && request.request_attempt_reconciled;

  const queueWaitComplete = queue.queued_count === queue.published_queue_count
    && queue.queue_abandoned_count === 0 && queue.queue_reset_count === 0
    && queue.queue_transfer_count === 0 && queue.censored_wait_count === 0
    && queue.median_wait_days === queue.published_median_wait_days
    && queue.entry_complete && queue.exit_complete && queue.abandonment_complete
    && queue.reset_transfer_complete && queue.wait_distribution_complete && queue.snapshot_history_complete;

  const rationingPriorityComplete = rationing.rationed_count === rationing.published_rationing_count
    && rationing.priority_overridden_count === 0 && rationing.displaced_count === 0
    && rationing.capacity_denied_count === 0 && rationing.rule_predeclared
    && rationing.priority_classes_complete && rationing.threshold_complete
    && rationing.exception_complete && rationing.override_complete
    && rationing.displacement_complete && rationing.rationing_population_complete;

  const denialDispositionComplete = denial.true_denied_count === denial.published_denied_count
    && denial.relabeled_denial_count === 0 && denial.denial_reason_complete
    && denial.label_crosswalk_complete && denial.final_disposition_complete
    && denial.appeal_reversal_complete;

  const trueUnservedCount = eligibility.unserved_no_attempt_count + denial.true_denied_count + rationing.capacity_denied_count;
  const unservedPopulationComplete = trueUnservedCount === world.public_claim.published_unserved_count
    && eligibility.never_attempted_need_complete && denial.final_disposition_complete
    && rationing.rationing_population_complete;

  const completionReconciliationComplete = completion.service_record_count === world.public_claim.published_service_records
    && completion.published_completion_count === world.public_claim.published_service_records
    && completion.unique_person_count === world.public_claim.published_service_records
    && completion.substantive_completed_count === world.public_claim.published_service_records
    && completion.durable_completed_count === world.public_claim.published_service_records
    && completion.partial_completion_count === 0 && completion.duplicate_completion_count === 0
    && completion.rework_record_count === 0 && completion.recurrent_service_record_count === 0
    && completion.survivor_selected_count === 0 && completion.unique_person_reconciled
    && completion.completion_definition_complete && completion.dose_complete
    && completion.duplicate_reconciled && completion.rework_recurrence_complete
    && completion.durability_complete && completion.survivor_independent;

  const currentServiceDenominatorLineageComplete = versionPairsComplete(lineage)
    && lineage.current_service_denominator_lineage
    && lineage.stale_denominator_decision_count === 0
    && lineage.revalidation_state === 'current_complete';

  const monitoringCorrectionComplete = governance.monitoring_complete && governance.correction_complete
    && governance.appeal_complete && governance.rollback_complete
    && governance.certificate_withdrawal_complete && governance.durability_complete;

  const complete = eligiblePopulationComplete && requestAttemptComplete && queueWaitComplete
    && rationingPriorityComplete && denialDispositionComplete && unservedPopulationComplete
    && completionReconciliationComplete && currentServiceDenominatorLineageComplete
    && monitoringCorrectionComplete;

  return {
    complete_service_denominator_assurance: complete,
    eligible_population_undercoverage_present: !eligiblePopulationComplete,
    request_attempt_capture_failure_present: !requestAttemptComplete,
    queue_wait_censoring_present: !queueWaitComplete,
    rationing_priority_opacity_present: !rationingPriorityComplete,
    denial_reclassification_present: !denialDispositionComplete,
    completion_reconciliation_failure_present: !completionReconciliationComplete,
    stale_service_denominator_lineage_present: !currentServiceDenominatorLineageComplete,
    eligible_population_complete: eligiblePopulationComplete,
    request_attempt_complete: requestAttemptComplete,
    queue_wait_complete: queueWaitComplete,
    rationing_priority_complete: rationingPriorityComplete,
    denial_disposition_complete: denialDispositionComplete,
    unserved_population_complete: unservedPopulationComplete,
    completion_reconciliation_complete: completionReconciliationComplete,
    current_service_denominator_lineage_complete: currentServiceDenominatorLineageComplete,
    monitoring_correction_complete: monitoringCorrectionComplete
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
  push({ event_id: `${prefix}:public`, event_type: 'public_service_denominator_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'service_denominator_assurance_compiler', source_event_ids: [], payload: world.public_claim });
  push({ event_id: `${prefix}:eligibility`, event_type: 'operational_eligibility_and_never_attempted_need_sealed', evidence_class: 'synthetic_control_state', authority: 'eligibility_ledger', source_event_ids: [`${prefix}:public`], payload: world.eligibility });
  push({ event_id: `${prefix}:request`, event_type: 'request_attempt_intake_and_logging_state_sealed', evidence_class: 'synthetic_control_state', authority: 'request_attempt_ledger', source_event_ids: [`${prefix}:eligibility`], payload: world.request_attempt });
  push({ event_id: `${prefix}:queue`, event_type: 'queue_wait_abandonment_reset_transfer_and_censoring_state_sealed', evidence_class: 'synthetic_control_state', authority: 'queue_ledger', source_event_ids: [`${prefix}:request`], payload: world.queue });
  push({ event_id: `${prefix}:rationing`, event_type: 'rationing_priority_override_and_displacement_state_sealed', evidence_class: 'synthetic_control_state', authority: 'rationing_ledger', source_event_ids: [`${prefix}:queue`], payload: world.rationing });
  push({ event_id: `${prefix}:denial`, event_type: 'denial_label_crosswalk_and_unserved_population_state_sealed', evidence_class: 'synthetic_control_state', authority: 'denial_ledger', source_event_ids: [`${prefix}:rationing`], payload: { denial: world.denial, true_unserved_count: world.eligibility.unserved_no_attempt_count + world.denial.true_denied_count + world.rationing.capacity_denied_count } });
  push({ event_id: `${prefix}:completion`, event_type: 'unique_substantive_durable_completion_reconciliation_sealed', evidence_class: 'synthetic_control_state', authority: 'completion_ledger', source_event_ids: [`${prefix}:denial`], payload: world.completion });
  push({ event_id: `${prefix}:lineage`, event_type: 'service_denominator_lineage_monitoring_correction_and_authority_sealed', evidence_class: 'synthetic_control_state', authority: 'service_denominator_governance', source_event_ids: [`${prefix}:completion`], payload: { lineage: world.lineage, analysis: world.analysis, governance: world.governance } });
  push({ event_id: `${prefix}:classification`, event_type: 'service_denominator_mechanism_classified', evidence_class: 'synthetic_control_classification', authority: 'service_denominator_assurance_compiler', source_event_ids: [`${prefix}:lineage`], payload: { mechanism: world.mechanism, flags } });
  push({ event_id: `${prefix}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'service_denominator_assurance_analyst', source_event_ids: [`${prefix}:classification`], payload: { allowed_interpretation: 'one synthetic service-denominator governance world', refused_promotions: ['synthetic_world_as_named_service_finding','published_record_as_unique_durable_completion','zero_public_queue_denial_or_unserved_as_zero_true_burden','service_denominator_status_as_public_authorization'] } });
  return events;
}

function chainErrors(events, head, label) {
  const errors = [];
  let previous = null;
  for (const event of array(events)) {
    const expected = sealedEvent(Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'event_sha256' && key !== 'previous_event_sha256')), previous);
    if (event.previous_event_sha256 !== previous) errors.push(`${label} previous-event hash mismatch at ${event.event_id}`);
    if (event.event_sha256 !== expected.event_sha256) errors.push(`${label} event hash mismatch at ${event.event_id}`);
    previous = event.event_sha256;
  }
  if (head !== previous) errors.push(`${label} custody head mismatch`);
  return errors;
}

export function validatePreferenceServiceDenominatorAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_SERVICE_DENOMINATOR_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('service-denominator fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-service-denominator-verified-status-different-operational-states-v1') errors.push('service-denominator fixture identity mismatch');
  if (fixture?.issue !== 815 || fixture?.parent_program_issue !== 594) errors.push('service-denominator issue custody mismatch');
  if (fixture?.status !== 'synthetic_control') errors.push('service-denominator status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('service-denominator graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'service-denominator counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('service-denominator baseline mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('service-denominator refusal-rule contract is incomplete');
  if (unique(fixture?.prohibited_inferences).length < 16) errors.push('service-denominator prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('service-denominator interpretation contract is incomplete');
  const expected = object(fixture?.expected_classification);
  for (const key of FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS) requireFalse(expected[key], `expected_classification.${key}`, errors);
  if (expected.complete_service_denominator_assurance_supported_in_at_least_one_world !== true) errors.push('fixture must preserve one complete service-denominator assurance world');
  if (!sameMembers(array(fixture?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('service-denominator world denominator is incomplete');
  if (array(fixture?.worlds).length !== 8) errors.push('service-denominator fixture must contain exactly eight worlds');
  if (!Object.keys(object(fixture?.world_defaults)).length) errors.push('service-denominator world defaults are required');
  for (const record of array(fixture?.worlds)) validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  return errors;
}

export function compilePreferenceServiceDenominatorAssuranceFixture(fixture) {
  const errors = validatePreferenceServiceDenominatorAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid service-denominator assurance fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(record => {
    const world = expandWorld(fixture, record);
    const flags = derivePreferenceServiceDenominatorFlags(world);
    if (JSON.stringify(canonical(flags)) !== JSON.stringify(canonical(world.expected_flags))) {
      throw new Error(`service-denominator expected flags mismatch for ${world.world_id}`);
    }
    const custodyChain = buildWorldChain(world, flags);
    return {
      world_id: world.world_id,
      mechanism: world.mechanism,
      public_claim: world.public_claim,
      eligibility: world.eligibility,
      request_attempt: world.request_attempt,
      queue: world.queue,
      rationing: world.rationing,
      denial: world.denial,
      completion: world.completion,
      lineage: world.lineage,
      analysis: world.analysis,
      governance: world.governance,
      flags,
      public_status_signature: sha256(world.public_claim),
      governance_signature: sha256({ flags, eligibility: world.eligibility.eligibility_state, request_reconciled: world.request_attempt.request_attempt_reconciled, queue_complete: flags.queue_wait_complete, rationing_complete: flags.rationing_priority_complete, denial_complete: flags.denial_disposition_complete, completion_complete: flags.completion_reconciliation_complete, lineage: world.lineage.revalidation_state }),
      custody_chain: custodyChain,
      custody_chain_head_sha256: custodyChain.at(-1).event_sha256
    };
  });

  const countFlag = key => worlds.filter(world => world.flags[key]).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section][key] ?? 0), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature)).size,
    distinct_service_denominator_governance_signatures: new Set(worlds.map(world => world.governance_signature)).size,
    complete_service_denominator_assurance_worlds: countFlag('complete_service_denominator_assurance'),
    eligible_population_undercoverage_worlds: countFlag('eligible_population_undercoverage_present'),
    request_attempt_capture_failure_worlds: countFlag('request_attempt_capture_failure_present'),
    queue_wait_censoring_worlds: countFlag('queue_wait_censoring_present'),
    rationing_priority_opacity_worlds: countFlag('rationing_priority_opacity_present'),
    denial_reclassification_worlds: countFlag('denial_reclassification_present'),
    completion_reconciliation_failure_worlds: countFlag('completion_reconciliation_failure_present'),
    stale_service_denominator_lineage_worlds: countFlag('stale_service_denominator_lineage_present'),
    eligible_population_complete_worlds: countFlag('eligible_population_complete'),
    request_attempt_complete_worlds: countFlag('request_attempt_complete'),
    queue_wait_complete_worlds: countFlag('queue_wait_complete'),
    rationing_priority_complete_worlds: countFlag('rationing_priority_complete'),
    denial_disposition_complete_worlds: countFlag('denial_disposition_complete'),
    unserved_population_complete_worlds: countFlag('unserved_population_complete'),
    completion_reconciliation_complete_worlds: countFlag('completion_reconciliation_complete'),
    current_service_denominator_lineage_complete_worlds: countFlag('current_service_denominator_lineage_complete'),
    monitoring_correction_complete_worlds: countFlag('monitoring_correction_complete'),
    same_public_service_surface_worlds: worlds.filter(world => world.public_status_signature === worlds[0].public_status_signature).length,
    total_omitted_eligible_unit_count: sum('eligibility','omitted_eligible_count'),
    total_unserved_no_attempt_count: sum('eligibility','unserved_no_attempt_count'),
    total_lost_request_count: sum('request_attempt','lost_request_count'),
    total_lost_attempt_count: sum('request_attempt','lost_attempt_count'),
    total_queued_unit_count: sum('queue','queued_count'),
    total_queue_abandoned_unit_count: sum('queue','queue_abandoned_count'),
    total_censored_wait_unit_count: sum('queue','censored_wait_count'),
    total_rationed_unit_count: sum('rationing','rationed_count'),
    total_priority_overridden_unit_count: sum('rationing','priority_overridden_count'),
    total_displaced_unit_count: sum('rationing','displaced_count'),
    total_true_denied_unit_count: sum('denial','true_denied_count'),
    total_relabeled_denial_count: sum('denial','relabeled_denial_count'),
    total_referred_unit_count: sum('denial','referred_count'),
    total_deferred_unit_count: sum('denial','deferred_count'),
    total_partial_completion_count: sum('completion','partial_completion_count'),
    total_duplicate_completion_count: sum('completion','duplicate_completion_count'),
    total_rework_record_count: sum('completion','rework_record_count'),
    total_recurrent_service_record_count: sum('completion','recurrent_service_record_count'),
    total_survivor_selected_unit_count: sum('completion','survivor_selected_count'),
    total_stale_denominator_decision_count: sum('lineage','stale_denominator_decision_count'),
    total_unsupported_service_denominator_decisions: sum('governance','unsupported_service_denominator_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority).length
  };

  return {
    schema_version: PREFERENCE_SERVICE_DENOMINATOR_ASSURANCE_BUILD_SCHEMA_VERSION,
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

export function validatePreferenceServiceDenominatorAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_SERVICE_DENOMINATOR_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('service-denominator build schema mismatch');
  if (compiled?.fixture_id !== 'same-service-denominator-verified-status-different-operational-states-v1') errors.push('service-denominator build identity mismatch');
  if (compiled?.issue !== 815 || compiled?.parent_program_issue !== 594) errors.push('service-denominator build issue custody mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('service-denominator build graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'service-denominator build counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'service-denominator conclusion_generated', errors);
  requireFalse(compiled?.preference_change_present, 'service-denominator preference_change_present', errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('service-denominator build baseline mismatch');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES)) errors.push('service-denominator build refusal rules are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_SERVICE_DENOMINATOR_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`service-denominator metric ${key} must remain ${value}`);
  for (const key of FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key], `service-denominator classification.${key}`, errors);
  if (compiled?.classification?.complete_service_denominator_assurance_supported_in_at_least_one_world !== true) errors.push('service-denominator build must preserve one complete assurance world');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('service-denominator build world denominator is incomplete');
  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(object(world.flags)), FLAG_KEYS)) errors.push(`service-denominator build flags incomplete for ${world.world_id}`);
    if (world.public_status_signature !== sha256(world.public_claim)) errors.push(`service-denominator public signature mismatch for ${world.world_id}`);
    if (!/^[0-9a-f]{64}$/.test(text(world.governance_signature))) errors.push(`service-denominator governance signature invalid for ${world.world_id}`);
    errors.push(...chainErrors(world.custody_chain, world.custody_chain_head_sha256, `world ${world.world_id}`));
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('service-denominator build caveat is required');
  return errors;
}

function percentage(value) { return `${(Number(value) * 100).toFixed(2)}%`; }

export function renderPreferenceServiceDenominatorAssuranceMarkdown(compiled) {
  const lines = [
    '# Preference Custody PC-31: service-denominator assurance', '',
    `**Fixture:** ${compiled.fixture_id}`, '',
    `**Status:** ${compiled.status}`, '',
    `**Graph effect:** ${compiled.graph_effect}`, '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat, '',
    '## Frozen public surface', '',
    `- Operative release: ${compiled.baseline.operative_release_id}@${compiled.baseline.operative_release_version}`,
    `- Declared eligible units: ${compiled.baseline.declared_eligible_units}`,
    `- Published service records: ${compiled.baseline.published_service_records}`,
    `- Public status: ${compiled.baseline.public_service_status}`,
    `- Published completion rate: ${percentage(compiled.baseline.published_completion_rate)}`,
    `- Published queue count: ${compiled.baseline.published_queue_count}`,
    `- Published rationing count: ${compiled.baseline.published_rationing_count}`,
    `- Published denial rate: ${percentage(compiled.baseline.published_denial_rate)}`,
    `- Published unserved count: ${compiled.baseline.published_unserved_count}`,
    `- Published median wait: ${compiled.baseline.published_median_wait_days} days`, '',
    '## Worlds', ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '', world.mechanism, '',
      `- Complete assurance: ${world.flags.complete_service_denominator_assurance}`,
      `- Operational eligible: ${world.eligibility.operational_eligible_count}`,
      `- Lost requests / attempts: ${world.request_attempt.lost_request_count} / ${world.request_attempt.lost_attempt_count}`,
      `- Queued / abandoned / censored waits: ${world.queue.queued_count} / ${world.queue.queue_abandoned_count} / ${world.queue.censored_wait_count}`,
      `- Rationed / priority overridden: ${world.rationing.rationed_count} / ${world.rationing.priority_overridden_count}`,
      `- True / relabeled denials: ${world.denial.true_denied_count} / ${world.denial.relabeled_denial_count}`,
      `- Durable / published completions: ${world.completion.durable_completed_count} / ${world.completion.published_completion_count}`,
      `- Unsupported decisions: ${world.governance.unsupported_service_denominator_decision_count}`,
      `- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate metrics', '');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
