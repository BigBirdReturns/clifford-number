import { createHash } from 'node:crypto';

export const PREFERENCE_ALLOCATION_FORMULA_FIXTURE_SCHEMA_VERSION = 'preference-allocation-formula-fixture@1';
export const PREFERENCE_ALLOCATION_FORMULA_BUILD_SCHEMA_VERSION = 'preference-allocation-formula-build@1';

const EXPECTED_GROUP_IDS = ['HIGH-HARM', 'HIGH-HARM-ACCESS-BARRIER', 'LOW-HARM', 'MEDIUM-HARM'];
const EXPECTED_WORLD_IDS = [
  'approved-formula-replaced-by-drifted-version-and-undisclosed-overrides',
  'convenience-proxy-suppresses-access-barrier-group',
  'gameable-self-reported-score-without-integrity-controls',
  'opaque-model-score-hidden-training-checkpoint-lineage',
  'predeclared-harm-responsive-audited-correctable-formula',
  'prior-engagement-feedback-penalizes-lower-access-population',
  'threshold-cliff-severe-within-population-discontinuity',
  'uniform-per-capita-equality-harm-undercompensation'
];
const EXPECTED_FLAG_KEYS = [
  'complete_reference_allocation',
  'harm_undercompensation_present',
  'per_capita_equality_present',
  'access_barrier_shortfall_present',
  'proxy_failure_present',
  'opaque_lineage_present',
  'threshold_cliff_present',
  'feedback_loop_present',
  'gaming_risk_present',
  'version_drift_present',
  'manual_override_present',
  'aggregate_audit_without_subgroup_validation_present',
  'subgroup_reference_match',
  'explanation_and_correction_complete'
];
const EPSILON = 1e-12;

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function sum(values) { return values.reduce((total, value) => total + Number(value), 0); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function nonnegativeNumber(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }
function positiveInteger(value) { return Number.isInteger(value) && value > 0; }

function expectedClassification() {
  return {
    full_fund_exhaustion_identifies_reference_correct_allocation: false,
    payment_to_every_person_identifies_subgroup_adequacy: false,
    per_capita_equality_identifies_harm_responsive_fairness: false,
    feature_omission_identifies_absence_of_proxy_effects: false,
    approved_formula_identifies_executed_formula: false,
    model_transparency_label_identifies_model_data_checkpoint_lineage: false,
    aggregate_audit_identifies_subgroup_validation: false,
    stable_total_payout_identifies_stable_person_or_subgroup_outcomes: false,
    manual_override_identifies_correction: false,
    appeal_route_identifies_effective_explanation_or_correction: false,
    formula_disparity_identifies_unlawful_discrimination_or_misconduct: false,
    public_fairly_allocated_status_identifies_complete_valid_auditable_challengeable_authorized_allocation: false,
    complete_reference_allocation_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

function requiredMetrics() {
  return {
    world_count: 8,
    distinct_public_status_signatures: 1,
    distinct_formula_governance_signatures: 8,
    complete_reference_allocation_worlds: 1,
    harm_undercompensation_worlds: 7,
    per_capita_equality_worlds: 1,
    access_barrier_shortfall_worlds: 6,
    proxy_failure_worlds: 1,
    opaque_lineage_worlds: 1,
    threshold_cliff_worlds: 1,
    feedback_loop_worlds: 1,
    gaming_risk_worlds: 1,
    version_drift_worlds: 1,
    manual_override_worlds: 1,
    aggregate_audit_without_subgroup_validation_worlds: 1,
    subgroup_reference_match_worlds: 1,
    full_population_paid_worlds: 8,
    full_net_exhaustion_worlds: 8,
    explanation_and_correction_complete_worlds: 1,
    total_absolute_subgroup_allocation_error: 3500,
    total_access_barrier_shortfall: 1000,
    maximum_single_subgroup_shortfall: 330,
    binding_public_authority_worlds: 0
  };
}

function validatePublicClaim(claim, baseline, worldId, errors) {
  const expected = {
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    public_allocation_status: baseline.public_allocation_status,
    affected_population: baseline.affected_population,
    gross_remedy_fund: baseline.gross_remedy_fund,
    administration_cost: baseline.administration_cost,
    net_distributable_fund: baseline.net_distributable_fund,
    people_paid: baseline.people_paid,
    amount_paid: baseline.amount_paid
  };
  if (JSON.stringify(claim) !== JSON.stringify(expected)) errors.push(`world ${worldId} must preserve the frozen public allocation claim`);
}

function validateFormula(formula, worldId, errors) {
  for (const key of ['formula_id','objective','approved_formula_id','executed_formula_id','code_identity']) if (!text(formula?.[key])) errors.push(`world ${worldId} formula ${key} is required`);
  for (const key of ['approved_version','executed_version']) if (!positiveInteger(formula?.[key])) errors.push(`world ${worldId} formula ${key} must be a positive integer`);
  for (const key of ['formula_published','lineage_complete','change_disclosed','deterministic']) if (typeof formula?.[key] !== 'boolean') errors.push(`world ${worldId} formula ${key} must be boolean`);
}

function validateFeatures(features, worldId, errors) {
  if (!features.length) errors.push(`world ${worldId} requires at least one feature record`);
  if (unique(features.map(feature => feature?.feature_id)).length !== features.length) errors.push(`world ${worldId} feature IDs must be unique`);
  for (const feature of features) {
    const featureId = text(feature?.feature_id) || '(missing feature)';
    for (const key of ['source','validity_state','missingness_state','transformation']) if (!text(feature?.[key])) errors.push(`world ${worldId} feature ${featureId} ${key} is required`);
    if (!(typeof feature?.permissible_use === 'boolean' || text(feature?.permissible_use))) errors.push(`world ${worldId} feature ${featureId} permissible_use is required`);
  }
}

function validateModel(model, worldId, errors) {
  for (const key of ['system_type','calibration_state','evaluation_state','explanation_state']) if (!text(model?.[key])) errors.push(`world ${worldId} model ${key} is required`);
  if (typeof model?.lineage_complete !== 'boolean') errors.push(`world ${worldId} model lineage_complete must be boolean`);
  if (model?.system_type === 'learned_score') {
    for (const key of ['model_id','checkpoint_id','training_data_version']) if (!text(model?.[key])) errors.push(`world ${worldId} learned model ${key} is required`);
  }
}

function validateThresholds(thresholds, worldId, errors) {
  for (const key of ['rule','rounding_state','tie_breaking_state']) if (!text(thresholds?.[key])) errors.push(`world ${worldId} thresholds ${key} is required`);
  if (typeof thresholds?.cliff_present !== 'boolean') errors.push(`world ${worldId} thresholds cliff_present must be boolean`);
  if (!nonnegativeNumber(thresholds?.minimum_payment) || !nonnegativeNumber(thresholds?.maximum_payment) || Number(thresholds.minimum_payment) > Number(thresholds.maximum_payment)) errors.push(`world ${worldId} threshold payment bounds are invalid`);
}

function validateAllocations(allocations, baseline, worldId, errors) {
  const groups = array(baseline.affected_groups);
  const groupById = Object.fromEntries(groups.map(group => [group.group_id, group]));
  if (!sameMembers(allocations.map(item => item?.group_id), EXPECTED_GROUP_IDS) || unique(allocations.map(item => item?.group_id)).length !== allocations.length) errors.push(`world ${worldId} must preserve exactly four subgroup allocations`);
  for (const item of allocations) {
    const group = groupById[item?.group_id];
    const groupId = text(item?.group_id) || '(missing group)';
    if (!group) continue;
    if (item.count !== group.count || item.reference_amount !== group.reference_amount) errors.push(`world ${worldId} subgroup ${groupId} must preserve baseline count and reference amount`);
    if (item.people_paid !== group.count) errors.push(`world ${worldId} subgroup ${groupId} must preserve payment to every person`);
    for (const key of ['actual_amount','minimum_payment','maximum_payment']) if (!nonnegativeNumber(item?.[key])) errors.push(`world ${worldId} subgroup ${groupId} ${key} must be non-negative`);
    if (Number(item?.minimum_payment) > Number(item?.maximum_payment)) errors.push(`world ${worldId} subgroup ${groupId} payment bounds are invalid`);
  }
  if (sum(allocations.map(item => item.actual_amount)) !== baseline.net_distributable_fund) errors.push(`world ${worldId} subgroup allocations must exhaust the net distributable fund`);
  if (sum(allocations.map(item => item.people_paid)) !== baseline.affected_population) errors.push(`world ${worldId} subgroup payment counts must cover the full affected population`);
}

function validateOverrides(overrides, baseline, worldId, errors) {
  if (unique(overrides.map(event => event?.override_id)).length !== overrides.length) errors.push(`world ${worldId} override IDs must be unique`);
  const groupIds = new Set(array(baseline.affected_groups).map(group => group.group_id));
  for (const event of overrides) {
    const overrideId = text(event?.override_id) || '(missing override)';
    if (!groupIds.has(event?.from_group_id) || !groupIds.has(event?.to_group_id) || event?.from_group_id === event?.to_group_id) errors.push(`world ${worldId} override ${overrideId} has invalid group custody`);
    if (!Number.isFinite(Number(event?.amount)) || Number(event.amount) <= 0) errors.push(`world ${worldId} override ${overrideId} amount must be positive`);
    if (!text(event?.reason) || !text(event?.authority) || typeof event?.disclosed !== 'boolean') errors.push(`world ${worldId} override ${overrideId} reason, authority, and disclosure are required`);
  }
}

function validateGovernance(world, worldId, errors) {
  const integrity = object(world?.integrity);
  const governance = object(world?.governance);
  for (const key of ['proxy_effect_state','feedback_loop_state','gaming_risk_state','adversarial_test_state','missingness_treatment_state']) if (!text(integrity[key])) errors.push(`world ${worldId} integrity ${key} is required`);
  for (const key of ['predeployment_subgroup_test','postdeployment_subgroup_test','aggregate_audit_state','subgroup_audit_state','independent_replication_state','public_formula_disclosure','explanation_route','objection_route','appeal_route','correction_state']) if (!text(governance[key])) errors.push(`world ${worldId} governance ${key} is required`);
  if (governance.binding_public_authority !== false) errors.push(`world ${worldId} binding_public_authority must remain false`);
  const expectedFlags = object(world?.expected_flags);
  if (!sameMembers(Object.keys(expectedFlags), EXPECTED_FLAG_KEYS)) errors.push(`world ${worldId} expected_flags must contain exactly the required allocation flags`);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof expectedFlags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceAllocationFormulaFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const groups = array(baseline.affected_groups);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_ALLOCATION_FORMULA_FIXTURE_SCHEMA_VERSION) errors.push('preference allocation-formula fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  const baselineExpected = {
    technical_correction_state: 'complete',
    final_proposal_id: 'A1',
    public_allocation_status: 'fairly_allocated',
    affected_population: 100,
    gross_remedy_fund: 2000,
    administration_cost: 200,
    net_distributable_fund: 1800,
    people_paid: 100,
    amount_paid: 1800,
    currency: 'synthetic_units',
    reference_formula_id: 'FORMULA-HARM-V1',
    reference_formula_version: 1
  };
  for (const [key, value] of Object.entries(baselineExpected)) if (baseline[key] !== value) errors.push(`baseline ${key} must remain ${JSON.stringify(value)}`);
  if (baseline.gross_remedy_fund - baseline.administration_cost !== baseline.net_distributable_fund) errors.push('baseline fund ledger does not reconcile');
  if (!sameMembers(groups.map(group => group?.group_id), EXPECTED_GROUP_IDS) || unique(groups.map(group => group?.group_id)).length !== groups.length) errors.push('baseline affected groups must contain exactly the four required groups');
  if (sum(groups.map(group => group.count)) !== baseline.affected_population) errors.push('baseline group counts must sum to the affected population');
  if (sum(groups.map(group => group.reference_amount)) !== baseline.net_distributable_fund) errors.push('baseline reference amounts must sum to the net distributable fund');
  for (const group of groups) {
    if (!positiveInteger(group?.count) || !text(group?.reference_harm_class) || !nonnegativeNumber(group?.reference_amount) || !nonnegativeNumber(group?.reference_per_capita)) errors.push(`baseline group ${group?.group_id} is incomplete`);
    if (!close(Number(group.reference_amount) / Number(group.count), group.reference_per_capita)) errors.push(`baseline group ${group?.group_id} reference per-capita amount does not reconcile`);
  }
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required allocation-formula worlds');
  if (unique(worlds.map(world => world?.world_id)).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    validatePublicClaim(object(world?.public_claim), baseline, worldId, errors);
    validateFormula(object(world?.formula), worldId, errors);
    validateFeatures(array(world?.features), worldId, errors);
    validateModel(object(world?.model), worldId, errors);
    validateThresholds(object(world?.thresholds), worldId, errors);
    validateAllocations(array(world?.subgroup_allocations), baseline, worldId, errors);
    validateOverrides(array(world?.override_events), baseline, worldId, errors);
    validateGovernance(world, worldId, errors);
  }
  for (const [key, value] of Object.entries(requiredMetrics())) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  const mandatoryRules = [
    'full_fund_exhaustion_is_not_reference_correct_allocation',
    'payment_to_every_person_is_not_subgroup_adequacy',
    'per_capita_equality_is_not_harm_responsive_fairness',
    'feature_omission_is_not_absence_of_proxy_effects',
    'approved_formula_is_not_executed_formula',
    'model_transparency_label_is_not_model_data_checkpoint_lineage',
    'aggregate_audit_is_not_subgroup_validation',
    'stable_total_payout_is_not_stable_person_or_subgroup_outcome',
    'manual_override_is_not_correction_without_reason_authority_scope_and_effect',
    'appeal_route_is_not_effective_explanation_or_correction',
    'formula_disparity_is_not_proof_of_unlawful_discrimination_breach_misconduct_or_intent',
    'public_fairly_allocated_status_is_not_complete_valid_auditable_challengeable_authorized_allocation',
    'algorithmic_allocation_claim_requires_population_subgroup_harm_formula_feature_model_data_threshold_override_audit_explanation_challenge_correction_payment_residual_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function perCapitaEquality(allocations) {
  const values = allocations.map(item => Number(item.actual_amount) / Number(item.count));
  return values.every(value => close(value, values[0]));
}

export function simulatePreferenceAllocationFormulaWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const allocations = array(world.subgroup_allocations);
  const allocationById = Object.fromEntries(allocations.map(item => [item.group_id, item]));
  const subgroupReferenceMatch = allocations.every(item => close(item.actual_amount, item.reference_amount));
  const harmUndercompensationPresent = allocations.some(item => Number(item.actual_amount) < Number(item.reference_amount));
  const accessBarrier = allocationById['HIGH-HARM-ACCESS-BARRIER'];
  const accessBarrierShortfall = Math.max(0, Number(accessBarrier.reference_amount) - Number(accessBarrier.actual_amount));
  const proxyFailurePresent = world.integrity.proxy_effect_state === 'material_unmitigated' && world.integrity.feedback_loop_state !== 'material_unmitigated';
  const opaqueLineagePresent = world.formula.lineage_complete !== true || world.model.lineage_complete !== true;
  const thresholdCliffPresent = world.thresholds.cliff_present === true;
  const feedbackLoopPresent = world.integrity.feedback_loop_state === 'material_unmitigated';
  const gamingRiskPresent = world.integrity.gaming_risk_state === 'material_unmitigated';
  const versionDriftPresent = world.formula.approved_formula_id !== world.formula.executed_formula_id || world.formula.approved_version !== world.formula.executed_version;
  const manualOverridePresent = array(world.override_events).length > 0;
  const aggregateAuditWithoutSubgroupValidation = world.governance.aggregate_audit_state === 'pass' && world.governance.subgroup_audit_state === 'absent';
  const explanationAndCorrectionComplete = world.governance.explanation_route === 'person_and_group_complete'
    && world.governance.correction_state === 'operational_and_receipted'
    && world.governance.predeployment_subgroup_test === 'pass'
    && world.governance.postdeployment_subgroup_test === 'pass'
    && world.governance.aggregate_audit_state === 'pass'
    && world.governance.subgroup_audit_state === 'pass'
    && world.governance.independent_replication_state === 'pass';
  const perCapitaEqualityPresent = perCapitaEquality(allocations);
  const fullPopulationPaid = sum(allocations.map(item => item.people_paid)) === baseline.affected_population;
  const fullNetExhaustion = sum(allocations.map(item => item.actual_amount)) === baseline.net_distributable_fund;
  const absoluteSubgroupAllocationError = sum(allocations.map(item => Math.abs(Number(item.actual_amount) - Number(item.reference_amount))));
  const maximumSubgroupShortfall = Math.max(...allocations.map(item => Math.max(0, Number(item.reference_amount) - Number(item.actual_amount))));
  const completeReferenceAllocation = subgroupReferenceMatch
    && world.formula.approved_formula_id === baseline.reference_formula_id
    && world.formula.executed_formula_id === baseline.reference_formula_id
    && world.formula.approved_version === baseline.reference_formula_version
    && world.formula.executed_version === baseline.reference_formula_version
    && world.formula.lineage_complete === true
    && world.model.lineage_complete === true
    && !proxyFailurePresent
    && !opaqueLineagePresent
    && !thresholdCliffPresent
    && !feedbackLoopPresent
    && !gamingRiskPresent
    && !versionDriftPresent
    && !manualOverridePresent
    && explanationAndCorrectionComplete;
  const flags = {
    complete_reference_allocation: completeReferenceAllocation,
    harm_undercompensation_present: harmUndercompensationPresent,
    per_capita_equality_present: perCapitaEqualityPresent,
    access_barrier_shortfall_present: accessBarrierShortfall > 0,
    proxy_failure_present: proxyFailurePresent,
    opaque_lineage_present: opaqueLineagePresent,
    threshold_cliff_present: thresholdCliffPresent,
    feedback_loop_present: feedbackLoopPresent,
    gaming_risk_present: gamingRiskPresent,
    version_drift_present: versionDriftPresent,
    manual_override_present: manualOverridePresent,
    aggregate_audit_without_subgroup_validation_present: aggregateAuditWithoutSubgroupValidation,
    subgroup_reference_match: subgroupReferenceMatch,
    explanation_and_correction_complete: explanationAndCorrectionComplete
  };
  const governanceState = {
    formula: world.formula,
    features: world.features,
    model: world.model,
    thresholds: world.thresholds,
    subgroup_allocations: world.subgroup_allocations,
    override_events: world.override_events,
    integrity: world.integrity,
    governance: world.governance,
    flags
  };
  return {
    world_id: world.world_id,
    public_claim: world.public_claim,
    formula: world.formula,
    features: world.features,
    model: world.model,
    thresholds: world.thresholds,
    subgroup_allocations: world.subgroup_allocations,
    override_events: world.override_events,
    integrity: world.integrity,
    governance: world.governance,
    flags,
    full_population_paid: fullPopulationPaid,
    full_net_exhaustion: fullNetExhaustion,
    absolute_subgroup_allocation_error: absoluteSubgroupAllocationError,
    access_barrier_shortfall: accessBarrierShortfall,
    maximum_subgroup_shortfall: maximumSubgroupShortfall,
    public_status_signature_sha256: sha256(world.public_claim),
    formula_governance_signature_sha256: sha256(governanceState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildAllocationChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'population_reference_harm_fund_and_public_status_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:formula`,
    event_type: 'approved_and_executed_formula_version_recorded',
    evidence_class: 'synthetic_control_formula',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: result.formula
  });
  push({
    event_id: `${result.world_id}:inputs`,
    event_type: 'feature_model_data_threshold_and_lineage_state_recorded',
    evidence_class: 'synthetic_control_input_lineage',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:formula`],
    payload: { features: result.features, model: result.model, thresholds: result.thresholds }
  });
  push({
    event_id: `${result.world_id}:allocation`,
    event_type: 'subgroup_allocation_payment_and_override_ledger_recorded',
    evidence_class: 'synthetic_control_allocation',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:inputs`],
    payload: { subgroup_allocations: result.subgroup_allocations, override_events: result.override_events }
  });
  push({
    event_id: `${result.world_id}:governance`,
    event_type: 'proxy_feedback_gaming_audit_explanation_challenge_and_correction_state_recorded',
    evidence_class: 'synthetic_control_governance',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:allocation`],
    payload: { integrity: result.integrity, governance: result.governance }
  });
  push({
    event_id: `${result.world_id}:consequence`,
    event_type: 'subgroup_shortfall_and_reference_error_resolved',
    evidence_class: 'deterministic_control_consequence',
    authority: 'allocation_formula_compiler',
    source_event_ids: [`${result.world_id}:governance`],
    payload: {
      full_population_paid: result.full_population_paid,
      full_net_exhaustion: result.full_net_exhaustion,
      absolute_subgroup_allocation_error: result.absolute_subgroup_allocation_error,
      access_barrier_shortfall: result.access_barrier_shortfall,
      maximum_subgroup_shortfall: result.maximum_subgroup_shortfall
    }
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'algorithmic_allocation_governance_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'allocation_formula_compiler',
    source_event_ids: [`${result.world_id}:consequence`],
    payload: result.flags
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'allocation_formula_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic formula, subgroup, lineage, integrity, audit, explanation, correction, and authority state behind one public fairly-allocated status',
      refused_promotions: [
        'fund_exhaustion_as_reference_correctness',
        'population_payment_as_subgroup_adequacy',
        'per_capita_equality_as_harm_responsive_fairness',
        'feature_omission_as_no_proxy_effect',
        'approved_formula_as_executed_formula',
        'transparency_label_as_model_data_checkpoint_lineage',
        'aggregate_audit_as_subgroup_validation',
        'manual_override_as_correction',
        'appeal_route_as_effective_explanation_or_correction',
        'formula_disparity_as_illegality_misconduct_or_intent',
        'public_fairly_allocated_status_as_authorized_allocation'
      ]
    }
  });
  return events;
}

export function validatePreferenceAllocationFormulaChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('allocation-formula event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate allocation-formula event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`allocation-formula event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`allocation-formula event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`allocation-formula event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceAllocationFormulaFixture(fixture) {
  const errors = validatePreferenceAllocationFormulaFixture(fixture);
  if (errors.length) throw new Error(`invalid preference allocation-formula fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceAllocationFormulaWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildAllocationChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_formula_governance_signatures: unique(worlds.map(world => world.formula_governance_signature_sha256)).length,
    complete_reference_allocation_worlds: worlds.filter(world => world.flags.complete_reference_allocation).length,
    harm_undercompensation_worlds: worlds.filter(world => world.flags.harm_undercompensation_present).length,
    per_capita_equality_worlds: worlds.filter(world => world.flags.per_capita_equality_present).length,
    access_barrier_shortfall_worlds: worlds.filter(world => world.flags.access_barrier_shortfall_present).length,
    proxy_failure_worlds: worlds.filter(world => world.flags.proxy_failure_present).length,
    opaque_lineage_worlds: worlds.filter(world => world.flags.opaque_lineage_present).length,
    threshold_cliff_worlds: worlds.filter(world => world.flags.threshold_cliff_present).length,
    feedback_loop_worlds: worlds.filter(world => world.flags.feedback_loop_present).length,
    gaming_risk_worlds: worlds.filter(world => world.flags.gaming_risk_present).length,
    version_drift_worlds: worlds.filter(world => world.flags.version_drift_present).length,
    manual_override_worlds: worlds.filter(world => world.flags.manual_override_present).length,
    aggregate_audit_without_subgroup_validation_worlds: worlds.filter(world => world.flags.aggregate_audit_without_subgroup_validation_present).length,
    subgroup_reference_match_worlds: worlds.filter(world => world.flags.subgroup_reference_match).length,
    full_population_paid_worlds: worlds.filter(world => world.full_population_paid).length,
    full_net_exhaustion_worlds: worlds.filter(world => world.full_net_exhaustion).length,
    explanation_and_correction_complete_worlds: worlds.filter(world => world.flags.explanation_and_correction_complete).length,
    total_absolute_subgroup_allocation_error: sum(worlds.map(world => world.absolute_subgroup_allocation_error)),
    total_access_barrier_shortfall: sum(worlds.map(world => world.access_barrier_shortfall)),
    maximum_single_subgroup_shortfall: Math.max(...worlds.map(world => world.maximum_subgroup_shortfall)),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
  for (const [key, value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version: PREFERENCE_ALLOCATION_FORMULA_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'allocation_formula_governance_equifinality_qualified',
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

export function validatePreferenceAllocationFormulaBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_ALLOCATION_FORMULA_BUILD_SCHEMA_VERSION) errors.push('preference allocation-formula build schema mismatch');
  if (compiled?.status !== 'allocation_formula_governance_equifinality_qualified') errors.push('compiled allocation-formula status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled allocation-formula graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled allocation-formula must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled allocation-formula must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled allocation-formula real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled allocation-formula worlds are incomplete');
  for (const [key, value] of Object.entries(requiredMetrics())) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled allocation-formula must not claim preference change');
  for (const world of array(compiled?.worlds)) {
    if (world?.public_claim?.public_allocation_status !== 'fairly_allocated' || world?.public_claim?.affected_population !== 100 || world?.public_claim?.amount_paid !== 1800 || world?.public_claim?.people_paid !== 100) errors.push(`world ${world?.world_id} must preserve the frozen public allocation claim`);
    if (world?.full_population_paid !== true || world?.full_net_exhaustion !== true) errors.push(`world ${world?.world_id} must preserve full population payment and net fund exhaustion`);
    for (const field of ['public_status_signature_sha256','formula_governance_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceAllocationFormulaChain(world?.custody_chain));
    if (array(world?.custody_chain).at(-1)?.event_sha256 !== world?.custody_chain_head_sha256) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['predeclared-harm-responsive-audited-correctable-formula']?.flags?.complete_reference_allocation !== true) errors.push('positive allocation world must preserve one complete reference-correct path');
  if (byId['uniform-per-capita-equality-harm-undercompensation']?.flags?.per_capita_equality_present !== true || byId['uniform-per-capita-equality-harm-undercompensation']?.flags?.harm_undercompensation_present !== true) errors.push('uniform world must preserve equality with harm undercompensation');
  if (byId['convenience-proxy-suppresses-access-barrier-group']?.flags?.proxy_failure_present !== true) errors.push('proxy world must preserve a direct proxy failure');
  if (byId['opaque-model-score-hidden-training-checkpoint-lineage']?.flags?.opaque_lineage_present !== true) errors.push('opaque world must preserve incomplete model and formula lineage');
  if (byId['threshold-cliff-severe-within-population-discontinuity']?.flags?.threshold_cliff_present !== true) errors.push('threshold world must preserve a payment cliff');
  if (byId['prior-engagement-feedback-penalizes-lower-access-population']?.flags?.feedback_loop_present !== true) errors.push('feedback world must preserve a prior-engagement feedback loop');
  if (byId['gameable-self-reported-score-without-integrity-controls']?.flags?.gaming_risk_present !== true) errors.push('gaming world must preserve material unmitigated gaming risk');
  const drift = byId['approved-formula-replaced-by-drifted-version-and-undisclosed-overrides'];
  if (drift?.flags?.version_drift_present !== true || drift?.flags?.manual_override_present !== true) errors.push('drift world must preserve executed-version drift and manual overrides');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled allocation-formula refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled allocation-formula caveat is required');
  return errors;
}

export function renderPreferenceAllocationFormulaMarkdown(compiled) {
  const lines = [
    '# Distribution formula, subgroup harm, and algorithmic allocation-governance custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public allocation-status signatures:** ${compiled.metrics.distinct_public_status_signatures}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen allocation ledger','',
    `- Technical correction: ${compiled.baseline.technical_correction_state}`,
    `- Final proposal: ${compiled.baseline.final_proposal_id}`,
    `- Public allocation status: ${compiled.baseline.public_allocation_status}`,
    `- Affected population: ${compiled.baseline.affected_population}`,
    `- Net distributable fund: ${compiled.baseline.net_distributable_fund}`,
    `- People paid: ${compiled.baseline.people_paid}`,
    `- Amount paid: ${compiled.baseline.amount_paid}`,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Approved formula: ${world.formula.approved_formula_id}@${world.formula.approved_version}`);
    lines.push(`- Executed formula: ${world.formula.executed_formula_id}@${world.formula.executed_version}`);
    lines.push(`- Complete reference allocation: ${world.flags.complete_reference_allocation}`);
    lines.push(`- Harm undercompensation: ${world.flags.harm_undercompensation_present}`);
    lines.push(`- Per-capita equality: ${world.flags.per_capita_equality_present}`);
    lines.push(`- Access-barrier shortfall: ${world.access_barrier_shortfall}`);
    lines.push(`- Proxy failure: ${world.flags.proxy_failure_present}`);
    lines.push(`- Opaque lineage: ${world.flags.opaque_lineage_present}`);
    lines.push(`- Threshold cliff: ${world.flags.threshold_cliff_present}`);
    lines.push(`- Feedback loop: ${world.flags.feedback_loop_present}`);
    lines.push(`- Gaming risk: ${world.flags.gaming_risk_present}`);
    lines.push(`- Version drift: ${world.flags.version_drift_present}`);
    lines.push(`- Manual override: ${world.flags.manual_override_present}`);
    lines.push(`- Absolute subgroup allocation error: ${world.absolute_subgroup_allocation_error}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
