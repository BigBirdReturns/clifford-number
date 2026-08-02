import { createHash } from 'node:crypto';

export const PREFERENCE_CAUSAL_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-causal-assurance-fixture@1';
export const PREFERENCE_CAUSAL_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-causal-assurance-build@1';

const EXPECTED_WORLD_IDS = [
  'adaptive-policy-selective-label-feedback',
  'collider-selected-outcome-population',
  'control-spillover-and-network-interference',
  'high-risk-selection-regression-to-mean',
  'historical-control-with-time-policy-population-drift',
  'pooled-estimate-across-system-version-succession',
  'post-treatment-mediator-used-as-criterion',
  'randomized-predecision-complete-interference-free-current'
];

const FLAG_KEYS = [
  'complete_causal_identification_path',
  'post_treatment_bias_present',
  'collider_selection_present',
  'interference_spillover_present',
  'historical_control_drift_present',
  'regression_to_mean_present',
  'adaptive_feedback_selective_labels_present',
  'version_pooling_drift_present',
  'randomized_assignment_complete',
  'temporal_order_complete',
  'complete_followup_observed',
  'no_selection_bias_complete',
  'no_interference_complete',
  'concurrent_comparator_complete',
  'baseline_regression_control_complete',
  'adaptive_logging_complete',
  'current_experiment_lineage_complete',
  'independent_replication_complete',
  'published_effect_matches_independent_reference'
];

const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_causal_governance_signatures: 8,
  complete_causal_identification_worlds: 1,
  post_treatment_bias_worlds: 1,
  collider_selection_worlds: 1,
  interference_spillover_worlds: 1,
  historical_control_drift_worlds: 1,
  regression_to_mean_worlds: 1,
  adaptive_feedback_selective_label_worlds: 1,
  version_pooling_drift_worlds: 1,
  randomized_assignment_complete_worlds: 5,
  temporal_order_complete_worlds: 7,
  complete_followup_observed_worlds: 6,
  no_selection_bias_complete_worlds: 6,
  no_interference_complete_worlds: 7,
  concurrent_comparator_complete_worlds: 7,
  baseline_regression_control_complete_worlds: 7,
  adaptive_logging_complete_worlds: 7,
  current_experiment_lineage_complete_worlds: 7,
  independent_replication_complete_worlds: 8,
  published_effect_matches_reference_worlds: 1,
  same_public_causal_surface_worlds: 8,
  total_post_treatment_conditioned_count: 100,
  total_collider_conditioned_count: 40,
  total_control_exposed_count: 30,
  total_historical_calendar_offset_days: 365,
  total_regression_to_mean_count: 50,
  total_selective_label_count: 40,
  total_policy_feedback_count: 200,
  total_pooled_successor_decision_count: 60,
  total_imputed_outcome_count: 80,
  total_unsupported_causal_decisions: 700,
  binding_public_authority_worlds: 0
};

const EXPECTED_FALSE_CLASSIFICATIONS = [
  'score_outcome_association_identifies_causal_effect',
  'post_treatment_criterion_identifies_pre_treatment_outcome',
  'published_denominator_identifies_complete_observed_followup',
  'conditioned_observed_set_identifies_unselected_outcome_population',
  'nominal_control_group_identifies_unexposed_control_under_interference',
  'historical_control_identifies_concurrent_counterfactual',
  'extreme_baseline_improvement_identifies_treatment_effect',
  'adaptive_policy_agreement_identifies_unbiased_effect_without_exploration_logging',
  'observed_labels_identify_representative_outcomes_under_feedback',
  'pooled_estimate_identifies_current_validation_after_system_succession',
  'narrow_interval_low_p_value_identifies_valid_causal_identification',
  'replication_count_identifies_independent_replication_of_same_estimand_design',
  'public_causally_validated_status_identifies_temporally_ordered_unselected_interference_aware_current_correctable_authorized_evidence',
  'causal_design_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
];

const EPSILON = 1e-12;

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function requireFalse(value, label, errors) { if (value !== false) errors.push(`${label} must remain false`); }
function numberInRange(value, minimum, maximum) { return Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum; }
function integerInRange(value, minimum, maximum) { return Number.isInteger(value) && value >= minimum && value <= maximum; }

function publicClaimFromBaseline(baseline) {
  return {
    operative_release_id: baseline.operative_release_id,
    operative_release_version: baseline.operative_release_version,
    scored_decisions: baseline.scored_decisions,
    published_outcome_records: baseline.published_outcome_records,
    public_causal_status: baseline.public_causal_status,
    reported_average_effect: baseline.reported_average_effect,
    published_ci_low: baseline.published_ci_low,
    published_ci_high: baseline.published_ci_high,
    published_p_value: baseline.published_p_value,
    published_replication_count: baseline.published_replication_count,
    approved_score_use: baseline.approved_score_use
  };
}

function validatePublicClaim(publicClaim, baseline, worldId, errors) {
  if (JSON.stringify(canonicalValue(publicClaim)) !== JSON.stringify(canonicalValue(publicClaimFromBaseline(baseline)))) {
    errors.push(`world ${worldId} must preserve the frozen causal-publication surface`);
  }
}

function validateReferenceSystem(system, errors) {
  for (const key of ['model_version','score_version','policy_version','workflow_version','population_version','experiment_version','use_case']) if (!text(system?.[key])) errors.push(`baseline reference_system.${key} is required`);
  if (!numberInRange(system?.threshold, 0, 1)) errors.push('baseline reference_system.threshold must be between zero and one');
}

function validateAssignment(assignment, baseline, worldId, errors) {
  for (const key of ['design','unit']) if (!text(assignment?.[key])) errors.push(`world ${worldId} assignment.${key} is required`);
  for (const key of ['randomized','predeclared','concealed']) if (typeof assignment?.[key] !== 'boolean') errors.push(`world ${worldId} assignment.${key} must be boolean`);
  for (const key of ['eligible_count','assigned_count','treated_count','control_count','compliance_count','crossover_count','protocol_deviation_count']) if (!integerInRange(assignment?.[key], 0, baseline.scored_decisions)) errors.push(`world ${worldId} assignment.${key} must be within the scored population`);
  if (assignment?.eligible_count !== baseline.scored_decisions || assignment?.assigned_count !== baseline.scored_decisions) errors.push(`world ${worldId} must preserve the complete eligible and assigned population`);
  if (assignment?.treated_count + assignment?.control_count !== assignment?.assigned_count) errors.push(`world ${worldId} treated and control counts must reconcile to assignment`);
  if (assignment?.compliance_count > assignment?.assigned_count) errors.push(`world ${worldId} compliance count exceeds assignment`);
}

function validateTemporal(temporal, baseline, worldId, errors) {
  const keys = ['score_time','assignment_time','treatment_time','decision_time','implementation_time','criterion_time','followup_time'];
  for (const key of keys) if (!Number.isInteger(temporal?.[key]) || temporal[key] < 0) errors.push(`world ${worldId} temporal.${key} must be a non-negative integer`);
  if (!(temporal?.score_time < temporal?.assignment_time && temporal?.assignment_time < temporal?.treatment_time && temporal?.treatment_time <= temporal?.decision_time && temporal?.decision_time <= temporal?.implementation_time && temporal?.implementation_time <= temporal?.criterion_time && temporal?.criterion_time <= temporal?.followup_time)) errors.push(`world ${worldId} temporal sequence must preserve score, assignment, treatment, decision, implementation, criterion, and follow-up order`);
  if (typeof temporal?.criterion_pre_treatment !== 'boolean') errors.push(`world ${worldId} temporal.criterion_pre_treatment must be boolean`);
  for (const key of ['post_treatment_conditioned_count','decision_feedback_count','reverse_causality_count']) if (!integerInRange(temporal?.[key], 0, baseline.scored_decisions)) errors.push(`world ${worldId} temporal.${key} must be within the scored population`);
}

function validateObservation(observation, baseline, worldId, errors) {
  for (const key of ['followed_count','observed_count','missing_count','imputed_count','selected_count','collider_conditioned_count','survival_conditioned_count','appeal_conditioned_count','selective_label_count']) if (!integerInRange(observation?.[key], 0, baseline.published_outcome_records)) errors.push(`world ${worldId} observation.${key} must be within the published outcome population`);
  if (!text(observation?.selection_mechanism)) errors.push(`world ${worldId} observation.selection_mechanism is required`);
  if (observation?.observed_count + observation?.imputed_count !== baseline.published_outcome_records) errors.push(`world ${worldId} observed and imputed records must reconcile to the published outcome denominator`);
  if (observation?.observed_count + observation?.missing_count !== baseline.published_outcome_records) errors.push(`world ${worldId} observed and missing records must reconcile to the eligible outcome denominator`);
  if (observation?.followed_count !== observation?.observed_count) errors.push(`world ${worldId} followed and observed counts must reconcile`);
  if (observation?.selected_count !== observation?.observed_count) errors.push(`world ${worldId} selected and observed counts must reconcile`);
}

function validateInterference(interference, baseline, worldId, errors) {
  for (const key of ['unit','exposure_mapping_state']) if (!text(interference?.[key])) errors.push(`world ${worldId} interference.${key} is required`);
  for (const key of ['stable_unit_assumption','cluster_randomized']) if (typeof interference?.[key] !== 'boolean') errors.push(`world ${worldId} interference.${key} must be boolean`);
  for (const key of ['spillover_count','control_exposed_count']) if (!integerInRange(interference?.[key], 0, baseline.scored_decisions)) errors.push(`world ${worldId} interference.${key} must be within the scored population`);
}

function validateComparator(comparator, worldId, errors) {
  if (!text(comparator?.type)) errors.push(`world ${worldId} comparator.type is required`);
  if (typeof comparator?.concurrent !== 'boolean') errors.push(`world ${worldId} comparator.concurrent must be boolean`);
  if (!Number.isInteger(comparator?.calendar_offset_days) || comparator.calendar_offset_days < 0) errors.push(`world ${worldId} comparator.calendar_offset_days must be non-negative`);
  for (const key of ['policy_match','population_match','geography_match','channel_match','pretrend_complete']) if (typeof comparator?.[key] !== 'boolean') errors.push(`world ${worldId} comparator.${key} must be boolean`);
}

function validateBaselineSelection(selection, baseline, worldId, errors) {
  for (const key of ['selection_rule','baseline_noise_state']) if (!text(selection?.[key])) errors.push(`world ${worldId} baseline_selection.${key} is required`);
  for (const key of ['repeated_measurement','untreated_trajectory_observed']) if (typeof selection?.[key] !== 'boolean') errors.push(`world ${worldId} baseline_selection.${key} must be boolean`);
  for (const key of ['selected_high_risk_count','regression_to_mean_count']) if (!integerInRange(selection?.[key], 0, baseline.scored_decisions)) errors.push(`world ${worldId} baseline_selection.${key} must be within the scored population`);
}

function validateAdaptive(adaptive, baseline, worldId, errors) {
  for (const key of ['adaptive_assignment','propensity_logged','off_policy_evaluation']) if (typeof adaptive?.[key] !== 'boolean') errors.push(`world ${worldId} adaptive.${key} must be boolean`);
  for (const key of ['exploration_probability','label_observation_probability']) if (!numberInRange(adaptive?.[key], 0, 1)) errors.push(`world ${worldId} adaptive.${key} must be between zero and one`);
  for (const key of ['selective_label_count','policy_feedback_count']) if (!integerInRange(adaptive?.[key], 0, baseline.scored_decisions)) errors.push(`world ${worldId} adaptive.${key} must be within the scored population`);
}

function validateEstimation(estimation, baseline, worldId, errors) {
  for (const key of ['estimand','estimator']) if (!text(estimation?.[key])) errors.push(`world ${worldId} estimation.${key} is required`);
  for (const key of ['predeclared','sensitivity_complete','falsification_complete','multiplicity_corrected']) if (typeof estimation?.[key] !== 'boolean') errors.push(`world ${worldId} estimation.${key} must be boolean`);
  for (const key of ['reported_effect','ci_low','ci_high','independent_reference_effect']) if (!numberInRange(estimation?.[key], -1, 1)) errors.push(`world ${worldId} estimation.${key} must be between negative one and one`);
  if (!numberInRange(estimation?.p_value, 0, 1)) errors.push(`world ${worldId} estimation.p_value must be between zero and one`);
  if (estimation?.ci_low > estimation?.reported_effect || estimation?.reported_effect > estimation?.ci_high) errors.push(`world ${worldId} reported effect must fall inside its interval`);
  if (!close(estimation?.reported_effect, baseline.reported_average_effect) || !close(estimation?.ci_low, baseline.published_ci_low) || !close(estimation?.ci_high, baseline.published_ci_high) || !close(estimation?.p_value, baseline.published_p_value)) errors.push(`world ${worldId} estimation must preserve the frozen published effect surface`);
}

function validateReplications(replications, baseline, worldId, errors) {
  if (replications.length !== baseline.published_replication_count) errors.push(`world ${worldId} must preserve exactly ${baseline.published_replication_count} replication records`);
  if (unique(replications.map(replication => replication?.replication_id)).length !== replications.length) errors.push(`world ${worldId} replication IDs must be unique`);
  for (const replication of replications) {
    for (const key of ['replication_id','legal_entity']) if (!text(replication?.[key])) errors.push(`world ${worldId} replication.${key} is required`);
    for (const key of ['independent','same_estimand','same_design','representative','blind_outcome_adjudication']) if (typeof replication?.[key] !== 'boolean') errors.push(`world ${worldId} replication ${replication?.replication_id} ${key} must be boolean`);
    if (!numberInRange(replication?.effect, -1, 1)) errors.push(`world ${worldId} replication ${replication?.replication_id} effect must be between negative one and one`);
  }
}

function validateLineage(lineage, baseline, worldId, errors) {
  for (const key of ['approved_model_version','executed_model_version','approved_score_version','executed_score_version','approved_policy_version','executed_policy_version','approved_workflow_version','executed_workflow_version','approved_population_version','executed_population_version','approved_experiment_version','executed_experiment_version','approved_use_case','executed_use_case','revalidation_state']) if (!text(lineage?.[key])) errors.push(`world ${worldId} lineage.${key} is required`);
  for (const key of ['approved_threshold','executed_threshold']) if (!numberInRange(lineage?.[key], 0, 1)) errors.push(`world ${worldId} lineage.${key} must be between zero and one`);
  if (lineage?.succession_receipt !== null && !text(lineage?.succession_receipt)) errors.push(`world ${worldId} lineage succession receipt must be null or non-empty`);
  if (!integerInRange(lineage?.pooled_successor_decision_count, 0, baseline.scored_decisions)) errors.push(`world ${worldId} lineage.pooled_successor_decision_count must be within the scored population`);
}

function validateGovernance(governance, worldId, errors) {
  for (const key of ['independent_validation_state','audit_state','monitoring_state','drift_state','rollback_state','correction_state','appeal_state','certificate_withdrawal_state','publication_authority']) if (!text(governance?.[key])) errors.push(`world ${worldId} governance.${key} is required`);
  if (governance?.binding_public_authority !== false) errors.push(`world ${worldId} binding public authority must remain false`);
}

function expectedClassification() {
  return {
    score_outcome_association_identifies_causal_effect: false,
    post_treatment_criterion_identifies_pre_treatment_outcome: false,
    published_denominator_identifies_complete_observed_followup: false,
    conditioned_observed_set_identifies_unselected_outcome_population: false,
    nominal_control_group_identifies_unexposed_control_under_interference: false,
    historical_control_identifies_concurrent_counterfactual: false,
    extreme_baseline_improvement_identifies_treatment_effect: false,
    adaptive_policy_agreement_identifies_unbiased_effect_without_exploration_logging: false,
    observed_labels_identify_representative_outcomes_under_feedback: false,
    pooled_estimate_identifies_current_validation_after_system_succession: false,
    narrow_interval_low_p_value_identifies_valid_causal_identification: false,
    replication_count_identifies_independent_replication_of_same_estimand_design: false,
    public_causally_validated_status_identifies_temporally_ordered_unselected_interference_aware_current_correctable_authorized_evidence: false,
    causal_design_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent: false,
    complete_causal_identification_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceCausalAssuranceFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_CAUSAL_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('preference causal-assurance fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.issue !== 740) errors.push('fixture issue must remain 740');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  if (!text(baseline.operative_release_id) || !Number.isInteger(baseline.operative_release_version) || baseline.operative_release_version <= 0) errors.push('baseline operative release identity is incomplete');
  if (baseline.scored_decisions !== 100 || baseline.published_outcome_records !== 100) errors.push('baseline must preserve one hundred scored decisions and outcome records');
  if (baseline.public_causal_status !== 'causally_validated') errors.push('baseline public causal status must remain causally_validated');
  if (!close(baseline.reported_average_effect, 0.2) || !close(baseline.published_ci_low, 0.12) || !close(baseline.published_ci_high, 0.28) || !close(baseline.published_p_value, 0.01) || baseline.published_replication_count !== 2 || baseline.approved_score_use !== 'consequential_release_choice') errors.push('baseline causal-publication surface mismatch');
  if (!text(baseline.reference_estimand)) errors.push('baseline reference estimand is required');
  validateReferenceSystem(baseline.reference_system, errors);

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required causal-assurance worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    validatePublicClaim(object(world?.public_claim), baseline, worldId, errors);
    validateAssignment(object(world?.assignment), baseline, worldId, errors);
    validateTemporal(object(world?.temporal), baseline, worldId, errors);
    validateObservation(object(world?.observation), baseline, worldId, errors);
    validateInterference(object(world?.interference), baseline, worldId, errors);
    if (world?.interference?.control_exposed_count > world?.assignment?.control_count) errors.push(`world ${worldId} control exposure exceeds the control population`);
    validateComparator(object(world?.comparator), worldId, errors);
    validateBaselineSelection(object(world?.baseline_selection), baseline, worldId, errors);
    validateAdaptive(object(world?.adaptive), baseline, worldId, errors);
    if (world?.adaptive?.selective_label_count !== world?.observation?.selective_label_count) errors.push(`world ${worldId} selective-label counts must reconcile across observation and adaptive ledgers`);
    validateEstimation(object(world?.estimation), baseline, worldId, errors);
    validateReplications(array(world?.replications), baseline, worldId, errors);
    validateLineage(object(world?.lineage), baseline, worldId, errors);
    validateGovernance(object(world?.governance), worldId, errors);
    const flags = object(world?.expected_flags);
    for (const key of FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected flag ${key} must be boolean`);
  }

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  if (unique(fixture?.required_refusal_rules).length < 15) errors.push('required refusal-rule ledger is incomplete');
  if (unique(fixture?.prohibited_inferences).length < 12) errors.push('prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function exactLineage(lineage) {
  return lineage.approved_model_version === lineage.executed_model_version
    && lineage.approved_score_version === lineage.executed_score_version
    && close(lineage.approved_threshold, lineage.executed_threshold)
    && lineage.approved_policy_version === lineage.executed_policy_version
    && lineage.approved_workflow_version === lineage.executed_workflow_version
    && lineage.approved_population_version === lineage.executed_population_version
    && lineage.approved_experiment_version === lineage.executed_experiment_version
    && lineage.approved_use_case === lineage.executed_use_case;
}

function currentLineage(lineage) {
  return exactLineage(lineage)
    || (Boolean(text(lineage.succession_receipt)) && lineage.revalidation_state === 'current');
}

function independentReplication(replications) {
  return replications.length === 2
    && unique(replications.map(replication => replication.legal_entity)).length === 2
    && replications.every(replication => replication.independent === true
      && replication.same_estimand === true
      && replication.same_design === true
      && replication.representative === true
      && replication.blind_outcome_adjudication === true);
}

export function simulatePreferenceCausalAssuranceWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const assignment = object(world.assignment);
  const temporal = object(world.temporal);
  const observation = object(world.observation);
  const interference = object(world.interference);
  const comparator = object(world.comparator);
  const baselineSelection = object(world.baseline_selection);
  const adaptive = object(world.adaptive);
  const estimation = object(world.estimation);
  const replications = array(world.replications);
  const lineage = object(world.lineage);
  const governance = object(world.governance);

  const postTreatmentBias = temporal.post_treatment_conditioned_count > 0 || estimation.estimand.includes('post_treatment') || estimation.estimand.includes('conditioned');
  const colliderSelection = observation.collider_conditioned_count > 0 || observation.appeal_conditioned_count > 0 || observation.survival_conditioned_count > 0;
  const interferenceSpillover = interference.stable_unit_assumption !== true || interference.spillover_count > 0 || interference.control_exposed_count > 0;
  const historicalControlDrift = comparator.type === 'historical_control'
    || comparator.concurrent !== true
    || comparator.calendar_offset_days > 0;
  const regressionToMean = baselineSelection.regression_to_mean_count > 0 || (baselineSelection.selected_high_risk_count > 0 && (baselineSelection.repeated_measurement !== true || baselineSelection.untreated_trajectory_observed !== true));
  const adaptiveFeedback = adaptive.adaptive_assignment === true && (adaptive.exploration_probability <= 0 || adaptive.propensity_logged !== true || adaptive.off_policy_evaluation !== true || adaptive.selective_label_count > 0 || adaptive.policy_feedback_count > 0);
  const lineageCurrent = currentLineage(lineage);
  const versionPooling = !lineageCurrent || lineage.pooled_successor_decision_count > 0;
  const randomizedAssignment = assignment.randomized === true
    && assignment.predeclared === true
    && assignment.concealed === true
    && assignment.assigned_count === baseline.scored_decisions
    && assignment.treated_count + assignment.control_count === baseline.scored_decisions
    && assignment.crossover_count === 0
    && assignment.protocol_deviation_count === 0;
  const temporalOrder = temporal.score_time < temporal.assignment_time
    && temporal.assignment_time < temporal.treatment_time
    && temporal.treatment_time <= temporal.criterion_time
    && temporal.criterion_time <= temporal.followup_time
    && temporal.post_treatment_conditioned_count === 0
    && temporal.reverse_causality_count === 0;
  const completeFollowup = observation.followed_count === baseline.published_outcome_records
    && observation.observed_count === baseline.published_outcome_records
    && observation.missing_count === 0
    && observation.imputed_count === 0;
  const noSelectionBias = observation.selected_count === baseline.published_outcome_records
    && observation.collider_conditioned_count === 0
    && observation.survival_conditioned_count === 0
    && observation.appeal_conditioned_count === 0
    && observation.selective_label_count === 0;
  const noInterference = interference.stable_unit_assumption === true
    && interference.spillover_count === 0
    && interference.control_exposed_count === 0;
  const concurrentComparator = comparator.concurrent === true
    && comparator.calendar_offset_days === 0
    && comparator.geography_match === true
    && comparator.channel_match === true;
  const baselineRegressionControl = baselineSelection.regression_to_mean_count === 0
    && (baselineSelection.selected_high_risk_count === 0
      || (baselineSelection.repeated_measurement === true && baselineSelection.untreated_trajectory_observed === true));
  const adaptiveLogging = adaptive.adaptive_assignment !== true
    || (adaptive.exploration_probability > 0 && adaptive.propensity_logged === true && adaptive.off_policy_evaluation === true && adaptive.selective_label_count === 0);
  const replicationComplete = independentReplication(replications);
  const effectMatchesReference = close(estimation.reported_effect, estimation.independent_reference_effect)
    && close(estimation.reported_effect, baseline.reported_average_effect);
  const completePath = randomizedAssignment
    && temporalOrder
    && completeFollowup
    && noSelectionBias
    && noInterference
    && concurrentComparator
    && baselineRegressionControl
    && adaptiveLogging
    && lineageCurrent
    && replicationComplete
    && effectMatchesReference
    && estimation.estimand === baseline.reference_estimand
    && estimation.predeclared === true
    && estimation.sensitivity_complete === true
    && estimation.falsification_complete === true
    && estimation.multiplicity_corrected === true
    && governance.independent_validation_state === 'complete'
    && governance.audit_state === 'complete'
    && governance.correction_state === 'operational_and_receipted'
    && governance.publication_authority === 'independent_validator';

  const flags = {
    complete_causal_identification_path: completePath,
    post_treatment_bias_present: postTreatmentBias,
    collider_selection_present: colliderSelection,
    interference_spillover_present: interferenceSpillover,
    historical_control_drift_present: historicalControlDrift,
    regression_to_mean_present: regressionToMean,
    adaptive_feedback_selective_labels_present: adaptiveFeedback,
    version_pooling_drift_present: versionPooling,
    randomized_assignment_complete: randomizedAssignment,
    temporal_order_complete: temporalOrder,
    complete_followup_observed: completeFollowup,
    no_selection_bias_complete: noSelectionBias,
    no_interference_complete: noInterference,
    concurrent_comparator_complete: concurrentComparator,
    baseline_regression_control_complete: baselineRegressionControl,
    adaptive_logging_complete: adaptiveLogging,
    current_experiment_lineage_complete: lineageCurrent,
    independent_replication_complete: replicationComplete,
    published_effect_matches_independent_reference: effectMatchesReference
  };

  return {
    world_id: world.world_id,
    public_claim: world.public_claim,
    assignment: world.assignment,
    temporal: world.temporal,
    observation: world.observation,
    interference: world.interference,
    comparator: world.comparator,
    baseline_selection: world.baseline_selection,
    adaptive: world.adaptive,
    estimation: world.estimation,
    replications: world.replications,
    lineage: world.lineage,
    governance: world.governance,
    flags,
    unsupported_causal_decision_count: completePath ? 0 : baseline.scored_decisions,
    public_status_signature_sha256: sha256(world.public_claim),
    causal_governance_signature_sha256: sha256({assignment:world.assignment,temporal:world.temporal,observation:world.observation,interference:world.interference,comparator:world.comparator,baseline_selection:world.baseline_selection,adaptive:world.adaptive,estimation:world.estimation,replications:world.replications,lineage:world.lineage,governance:world.governance})
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCausalChain(result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({event_id:`${result.world_id}:public`,event_type:'public_causal_effect_precision_replication_and_use_surface',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:result.public_claim});
  push({event_id:`${result.world_id}:assignment`,event_type:'assignment_baseline_and_protocol_ledger',evidence_class:'synthetic_control_design',authority:'fixture_world',source_event_ids:[`${result.world_id}:public`],payload:{assignment:result.assignment,baseline_selection:result.baseline_selection}});
  push({event_id:`${result.world_id}:temporal`,event_type:'score_assignment_treatment_decision_criterion_and_followup_timing',evidence_class:'synthetic_control_temporal',authority:'fixture_world',source_event_ids:[`${result.world_id}:assignment`],payload:result.temporal});
  push({event_id:`${result.world_id}:observation`,event_type:'followup_selection_missingness_imputation_and_label_ledger',evidence_class:'synthetic_control_observation',authority:'fixture_world',source_event_ids:[`${result.world_id}:temporal`],payload:result.observation});
  push({event_id:`${result.world_id}:counterfactual`,event_type:'interference_comparator_and_historical_control_ledger',evidence_class:'synthetic_control_counterfactual',authority:'fixture_world',source_event_ids:[`${result.world_id}:observation`],payload:{interference:result.interference,comparator:result.comparator}});
  push({event_id:`${result.world_id}:adaptive`,event_type:'adaptive_assignment_propensity_selective_label_and_feedback_ledger',evidence_class:'synthetic_control_feedback',authority:'fixture_world',source_event_ids:[`${result.world_id}:counterfactual`],payload:result.adaptive});
  push({event_id:`${result.world_id}:estimate`,event_type:'estimand_estimator_precision_sensitivity_and_replication_ledger',evidence_class:'synthetic_control_estimation',authority:'fixture_world',source_event_ids:[`${result.world_id}:adaptive`],payload:{estimation:result.estimation,replications:result.replications}});
  push({event_id:`${result.world_id}:lineage`,event_type:'model_score_threshold_policy_workflow_population_experiment_and_use_lineage',evidence_class:'synthetic_control_succession',authority:'fixture_world',source_event_ids:[`${result.world_id}:estimate`],payload:{lineage:result.lineage,governance:result.governance}});
  push({event_id:`${result.world_id}:classification`,event_type:'causal_identification_failure_mechanism_classified',evidence_class:'deterministic_control_classification',authority:'causal_assurance_compiler',source_event_ids:[`${result.world_id}:lineage`],payload:result.flags});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'causal_assurance_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic causal-identification mechanism behind the frozen public effect surface',refused_promotions:['association_as_causality','post_treatment_outcome_as_pre_treatment_criterion','published_denominator_as_complete_followup','selected_labels_as_population_outcomes','nominal_control_as_unexposed_control','historical_control_as_concurrent_counterfactual','regression_to_mean_as_effect','adaptive_agreement_as_unbiased_validation','pooled_versions_as_current_validation','precision_as_identification','laboratory_control_as_named_real_world_finding']}});
  return events;
}

export function validatePreferenceCausalAssuranceChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('causal-assurance event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate causal-assurance event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`causal-assurance event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`causal-assurance event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`causal-assurance event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceCausalAssuranceFixture(fixture) {
  const errors = validatePreferenceCausalAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid preference causal-assurance fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceCausalAssuranceWorld(fixture, world);
    for (const key of FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} flag ${key} mismatch: expected ${world.expected_flags[key]}, observed ${result.flags[key]}`);
    const chain = buildCausalChain(result);
    return {...result,custody_chain:chain,custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null};
  }).sort((left,right)=>left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count:worlds.length,
    distinct_public_status_signatures:unique(worlds.map(world=>world.public_status_signature_sha256)).length,
    distinct_causal_governance_signatures:unique(worlds.map(world=>world.causal_governance_signature_sha256)).length,
    complete_causal_identification_worlds:worlds.filter(world=>world.flags.complete_causal_identification_path).length,
    post_treatment_bias_worlds:worlds.filter(world=>world.flags.post_treatment_bias_present).length,
    collider_selection_worlds:worlds.filter(world=>world.flags.collider_selection_present).length,
    interference_spillover_worlds:worlds.filter(world=>world.flags.interference_spillover_present).length,
    historical_control_drift_worlds:worlds.filter(world=>world.flags.historical_control_drift_present).length,
    regression_to_mean_worlds:worlds.filter(world=>world.flags.regression_to_mean_present).length,
    adaptive_feedback_selective_label_worlds:worlds.filter(world=>world.flags.adaptive_feedback_selective_labels_present).length,
    version_pooling_drift_worlds:worlds.filter(world=>world.flags.version_pooling_drift_present).length,
    randomized_assignment_complete_worlds:worlds.filter(world=>world.flags.randomized_assignment_complete).length,
    temporal_order_complete_worlds:worlds.filter(world=>world.flags.temporal_order_complete).length,
    complete_followup_observed_worlds:worlds.filter(world=>world.flags.complete_followup_observed).length,
    no_selection_bias_complete_worlds:worlds.filter(world=>world.flags.no_selection_bias_complete).length,
    no_interference_complete_worlds:worlds.filter(world=>world.flags.no_interference_complete).length,
    concurrent_comparator_complete_worlds:worlds.filter(world=>world.flags.concurrent_comparator_complete).length,
    baseline_regression_control_complete_worlds:worlds.filter(world=>world.flags.baseline_regression_control_complete).length,
    adaptive_logging_complete_worlds:worlds.filter(world=>world.flags.adaptive_logging_complete).length,
    current_experiment_lineage_complete_worlds:worlds.filter(world=>world.flags.current_experiment_lineage_complete).length,
    independent_replication_complete_worlds:worlds.filter(world=>world.flags.independent_replication_complete).length,
    published_effect_matches_reference_worlds:worlds.filter(world=>world.flags.published_effect_matches_independent_reference).length,
    same_public_causal_surface_worlds:worlds.filter(world=>world.public_status_signature_sha256===worlds[0].public_status_signature_sha256).length,
    total_post_treatment_conditioned_count:worlds.reduce((total,world)=>total+world.temporal.post_treatment_conditioned_count,0),
    total_collider_conditioned_count:worlds.reduce((total,world)=>total+world.observation.collider_conditioned_count,0),
    total_control_exposed_count:worlds.reduce((total,world)=>total+world.interference.control_exposed_count,0),
    total_historical_calendar_offset_days:worlds.reduce((total,world)=>total+world.comparator.calendar_offset_days,0),
    total_regression_to_mean_count:worlds.reduce((total,world)=>total+world.baseline_selection.regression_to_mean_count,0),
    total_selective_label_count:worlds.reduce((total,world)=>total+world.adaptive.selective_label_count,0),
    total_policy_feedback_count:worlds.reduce((total,world)=>total+Math.max(world.temporal.decision_feedback_count,world.adaptive.policy_feedback_count),0),
    total_pooled_successor_decision_count:worlds.reduce((total,world)=>total+world.lineage.pooled_successor_decision_count,0),
    total_imputed_outcome_count:worlds.reduce((total,world)=>total+world.observation.imputed_count,0),
    total_unsupported_causal_decisions:worlds.reduce((total,world)=>total+world.unsupported_causal_decision_count,0),
    binding_public_authority_worlds:worlds.filter(world=>world.governance.binding_public_authority===true).length
  };
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version:PREFERENCE_CAUSAL_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'criterion_temporal_causality_feedback_and_post_treatment_bias_qualified',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    baseline:fixture.baseline,
    worlds,
    metrics,
    classification:{...fixture.expected_classification,preference_change_present:false},
    refusal_rules:fixture.required_refusal_rules,
    prohibited_inferences:fixture.prohibited_inferences,
    interpretation_contract:fixture.interpretation_contract
  };
}

export function validatePreferenceCausalAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CAUSAL_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('preference causal-assurance build schema mismatch');
  if (compiled?.status !== 'criterion_temporal_causality_feedback_and_post_treatment_bias_qualified') errors.push('compiled causal-assurance status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled causal-assurance graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence,'compiled causal-assurance counts_toward_thesis_evidence',errors);
  requireFalse(compiled?.conclusion_generated,'compiled causal-assurance conclusion_generated',errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled causal-assurance real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world=>world.world_id),EXPECTED_WORLD_IDS)) errors.push('compiled causal-assurance worlds are incomplete');
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const key of EXPECTED_FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`compiled classification.${key} must remain false`);
  if (compiled?.classification?.complete_causal_identification_supported_in_at_least_one_world !== true) errors.push('compiled fixture must preserve one complete causal-identification path');
  if (compiled?.classification?.manipulative_intent_inferable !== false || compiled?.classification?.real_world_effect_claimed !== false || compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must preserve zero intent, real-world effect, and preference-change claims');
  for (const world of array(compiled?.worlds)) {
    if (world?.public_claim?.public_causal_status !== 'causally_validated' || !close(world?.public_claim?.reported_average_effect,0.2) || !close(world?.public_claim?.published_ci_low,0.12) || !close(world?.public_claim?.published_ci_high,0.28) || !close(world?.public_claim?.published_p_value,0.01) || world?.public_claim?.published_replication_count !== 2 || world?.public_claim?.scored_decisions !== 100 || world?.public_claim?.published_outcome_records !== 100) errors.push(`world ${world?.world_id} must preserve the frozen causal-publication surface`);
    for (const field of ['public_status_signature_sha256','causal_governance_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceCausalAssuranceChain(world?.custody_chain));
    if (world?.custody_chain_head_sha256 !== array(world?.custody_chain).at(-1)?.event_sha256) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world=>[world.world_id,world]));
  if (byId['randomized-predecision-complete-interference-free-current']?.flags.complete_causal_identification_path !== true) errors.push('positive world must preserve the complete causal-identification path');
  if (byId['post-treatment-mediator-used-as-criterion']?.temporal.post_treatment_conditioned_count !== 100) errors.push('post-treatment world must preserve one hundred conditioned records');
  if (byId['collider-selected-outcome-population']?.observation.collider_conditioned_count !== 40) errors.push('collider world must preserve forty selected records');
  if (byId['control-spillover-and-network-interference']?.interference.control_exposed_count !== 30) errors.push('interference world must preserve thirty exposed controls');
  if (byId['historical-control-with-time-policy-population-drift']?.comparator.calendar_offset_days !== 365) errors.push('historical world must preserve a 365-day offset');
  if (byId['high-risk-selection-regression-to-mean']?.baseline_selection.regression_to_mean_count !== 50) errors.push('regression world must preserve fifty regression-to-mean cases');
  if (byId['adaptive-policy-selective-label-feedback']?.adaptive.selective_label_count !== 40) errors.push('adaptive world must preserve forty selectively missing labels');
  if (byId['pooled-estimate-across-system-version-succession']?.lineage.pooled_successor_decision_count !== 60) errors.push('version world must preserve sixty successor decisions');
  if (unique(compiled?.refusal_rules).length < 15) errors.push('compiled causal-assurance refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled causal-assurance caveat is required');
  return errors;
}

function percentage(value) { return `${(Number(value)*100).toFixed(2)}%`; }

export function renderPreferenceCausalAssuranceMarkdown(compiled) {
  const lines = [
    '# Criterion temporal causality, feedback, and post-treatment-bias custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public causal signatures:** ${compiled.metrics.distinct_public_status_signatures}`,'',
    '> '+compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen public surface','',
    `- Public causal status: ${compiled.baseline.public_causal_status}`,
    `- Reported effect: ${percentage(compiled.baseline.reported_average_effect)}`,
    `- Published interval: ${percentage(compiled.baseline.published_ci_low)} to ${percentage(compiled.baseline.published_ci_high)}`,
    `- Published p-value: ${compiled.baseline.published_p_value}`,
    `- Published replications: ${compiled.baseline.published_replication_count}`,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'');
    lines.push(`- Assignment design: ${world.assignment.design}`);
    lines.push(`- Randomized assignment complete: ${world.flags.randomized_assignment_complete}`);
    lines.push(`- Temporal order complete: ${world.flags.temporal_order_complete}`);
    lines.push(`- Observed outcomes: ${world.observation.observed_count}`);
    lines.push(`- Imputed outcomes: ${world.observation.imputed_count}`);
    lines.push(`- Collider-conditioned records: ${world.observation.collider_conditioned_count}`);
    lines.push(`- Control spillover exposure: ${world.interference.control_exposed_count}`);
    lines.push(`- Historical offset days: ${world.comparator.calendar_offset_days}`);
    lines.push(`- Regression-to-mean cases: ${world.baseline_selection.regression_to_mean_count}`);
    lines.push(`- Selective labels: ${world.adaptive.selective_label_count}`);
    lines.push(`- Policy feedback count: ${world.temporal.decision_feedback_count + world.adaptive.policy_feedback_count}`);
    lines.push(`- Pooled successor decisions: ${world.lineage.pooled_successor_decision_count}`);
    lines.push(`- Independent reference effect: ${percentage(world.estimation.independent_reference_effect)}`);
    lines.push(`- Complete causal-identification path: ${world.flags.complete_causal_identification_path}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`,'');
  }
  lines.push('## Aggregate separations','');
  for (const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Classification','');
  for (const [key,value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Refusal rules','');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
