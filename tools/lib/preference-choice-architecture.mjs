import { createHash } from 'node:crypto';

export const PREFERENCE_CHOICE_ARCHITECTURE_FIXTURE_SCHEMA_VERSION = 'preference-choice-architecture-fixture@1';
export const PREFERENCE_CHOICE_ARCHITECTURE_BUILD_SCHEMA_VERSION = 'preference-choice-architecture-build@1';

const EXPECTED_WORLD_IDS = [
  'assent-bundled-with-payment-access',
  'binding-by-default-suppresses-intended-exit',
  'exit-authentication-and-cost-asymmetry',
  'exit-requires-repeated-confirmation',
  'neutral-symmetric-active-choice-before-payment',
  'payment-before-choice-with-clawback-exit',
  'representative-or-operator-substitutes-choice',
  'urgent-countdown-compresses-exit-completion'
];
const EXPECTED_FLAG_KEYS = [
  'asymmetric_path_cost_present',
  'bundled_assent_present',
  'complete_neutral_choice_path',
  'confirmation_asymmetry_present',
  'default_binding_present',
  'explicit_assent_complete',
  'intended_exit_suppression_present',
  'meaningful_reversal_available',
  'payment_clawback_present',
  'representative_substitution_present',
  'self_authorship_complete',
  'urgency_pressure_present'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_architecture_governance_signatures: 8,
  complete_neutral_choice_worlds: 1,
  default_binding_worlds: 1,
  asymmetric_path_cost_worlds: 2,
  urgency_pressure_worlds: 2,
  confirmation_asymmetry_worlds: 2,
  bundled_assent_worlds: 2,
  representative_substitution_worlds: 1,
  payment_clawback_worlds: 1,
  intended_exit_suppression_worlds: 5,
  self_authorship_complete_worlds: 2,
  explicit_assent_complete_worlds: 1,
  meaningful_reversal_worlds: 2,
  full_comprehension_worlds: 8,
  same_recorded_disposition_worlds: 8,
  full_payment_worlds: 8,
  total_intended_exit_count: 92,
  total_completed_exit_count: 40,
  total_suppressed_exit_intentions: 52,
  total_default_or_automated_recorded_choices: 110,
  total_representative_substituted_choices: 30,
  total_inferred_assent_count: 140,
  total_payment_before_choice_count: 100,
  total_clawback_exposed_people: 95,
  total_reversal_completed_count: 3,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  verified_comprehension_identifies_neutral_self_authored_choice: false,
  visible_option_identifies_symmetric_path_cost: false,
  completed_choice_field_identifies_active_choice: false,
  nonresponse_or_timeout_identifies_assent: false,
  recorded_exit_rate_identifies_intended_exit_or_completed_agency: false,
  representative_operator_action_identifies_affected_person_authorship: false,
  bundled_benefit_acceptance_identifies_independent_assent: false,
  payment_retention_identifies_prior_assent: false,
  repayment_clawback_route_identifies_meaningful_exit: false,
  formal_cooling_off_text_identifies_usable_reconsideration: false,
  same_recorded_disposition_identifies_same_architecture_intention_authorship_assent_authority: false,
  architecture_pressure_identifies_coercion_manipulation_breach_misconduct_intent: false,
  public_choice_final_status_identifies_neutral_self_authored_reversible_auditable_authorized_choice: false,
  complete_neutral_choice_supported_in_at_least_one_world: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false
};
const EPSILON = 1e-12;

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function sum(values) { return array(values).reduce((total, value) => total + Number(value), 0); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function nonNegativeInteger(value) { return Number.isInteger(value) && value >= 0; }
function nonNegativeNumber(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function requireFalse(value, label, errors) { if (value !== false) errors.push(`${label} must remain false`); }
function validateExactObjectKeys(value, expectedKeys, label, errors) {
  if (!sameMembers(Object.keys(object(value)), expectedKeys)) errors.push(`${label} must contain exactly ${expectedKeys.join(', ')}`);
}

function expectedPublicClaim(baseline) {
  return {
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    operative_release_id: baseline.operative_release_id,
    operative_release_version: baseline.operative_release_version,
    public_choice_status: baseline.public_choice_status,
    affected_population: baseline.affected_population,
    comprehension_verified_count: baseline.comprehension_verified_count,
    formal_choice_recorded_count: baseline.formal_choice_recorded_count,
    recorded_bound_count: baseline.recorded_bound_count,
    recorded_exit_count: baseline.recorded_exit_count,
    people_paid: baseline.people_paid,
    amount_paid: baseline.amount_paid
  };
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const publicClaim = object(world?.public_claim);
  const interfaceState = object(world?.interface);
  const agency = object(world?.agency);
  const bundling = object(world?.bundling);
  const payment = object(world?.payment);
  const reversal = object(world?.reversal);
  const governance = object(world?.governance);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  if (JSON.stringify(publicClaim) !== JSON.stringify(expectedPublicClaim(baseline))) errors.push(`world ${worldId} must preserve the frozen public claim`);

  for (const key of ['interface_id','default_state','option_order','salience_state','bind_authentication','exit_authentication','bind_documentary_burden','exit_documentary_burden','urgency_state']) {
    if (!text(interfaceState[key])) errors.push(`world ${worldId} interface.${key} is required`);
  }
  for (const key of ['version','bind_steps','exit_steps','deadline_days','bind_confirmations','exit_confirmations']) {
    if (!nonNegativeInteger(interfaceState[key])) errors.push(`world ${worldId} interface.${key} must be a non-negative integer`);
  }
  for (const key of ['bind_monetary_cost','exit_monetary_cost']) {
    if (!nonNegativeNumber(interfaceState[key])) errors.push(`world ${worldId} interface.${key} must be non-negative`);
  }
  if (typeof interfaceState.active_choice_required !== 'boolean') errors.push(`world ${worldId} active_choice_required must be boolean`);

  for (const key of [
    'intended_exit_count','attempted_exit_count','completed_exit_count','failed_exit_count','abandoned_exit_count',
    'self_authored_choice_count','representative_substituted_choice_count','default_or_automated_recorded_choice_count',
    'explicit_assent_count','inferred_assent_count'
  ]) if (!nonNegativeInteger(agency[key])) errors.push(`world ${worldId} agency.${key} must be a non-negative integer`);
  if (agency.completed_exit_count !== baseline.recorded_exit_count) errors.push(`world ${worldId} completed exits must equal the recorded exit count`);
  if (agency.attempted_exit_count !== agency.completed_exit_count + agency.failed_exit_count) errors.push(`world ${worldId} attempted exits must equal completed plus failed exits`);
  if (agency.intended_exit_count !== agency.completed_exit_count + agency.failed_exit_count + agency.abandoned_exit_count) errors.push(`world ${worldId} intended exits must reconcile to completed, failed, and abandoned exits`);
  if (agency.self_authored_choice_count + agency.representative_substituted_choice_count + agency.default_or_automated_recorded_choice_count !== baseline.formal_choice_recorded_count) errors.push(`world ${worldId} choice authorship counts must reconcile to the formal choice record`);
  if (agency.explicit_assent_count + agency.inferred_assent_count !== baseline.recorded_bound_count) errors.push(`world ${worldId} assent counts must reconcile to the recorded bound population`);

  for (const key of ['bundled_with_benefit','independent_choice_available','severable']) if (typeof bundling[key] !== 'boolean') errors.push(`world ${worldId} bundling.${key} must be boolean`);
  if (bundling.bundled_with_benefit && !text(bundling.benefit_id)) errors.push(`world ${worldId} bundled benefit requires benefit_id`);
  if (!bundling.bundled_with_benefit && bundling.benefit_id !== null) errors.push(`world ${worldId} unbundled state must use null benefit_id`);

  if (!['before_choice','after_choice'].includes(payment.timing)) errors.push(`world ${worldId} payment timing is invalid`);
  for (const key of ['payment_count','clawback_exposed_count']) if (!nonNegativeInteger(payment[key])) errors.push(`world ${worldId} payment.${key} must be a non-negative integer`);
  if (!nonNegativeNumber(payment.amount_paid)) errors.push(`world ${worldId} payment amount must be non-negative`);
  for (const key of ['repayment_required_to_exit','retention_inferred_assent']) if (typeof payment[key] !== 'boolean') errors.push(`world ${worldId} payment.${key} must be boolean`);
  if (payment.payment_count !== baseline.people_paid || !close(payment.amount_paid, baseline.amount_paid)) errors.push(`world ${worldId} payment must preserve the frozen payment state`);
  if (payment.clawback_exposed_count > baseline.affected_population) errors.push(`world ${worldId} clawback exposure exceeds the affected population`);

  for (const key of ['cooling_off_days','reversal_attempt_count','reversal_completed_count']) if (!nonNegativeInteger(reversal[key])) errors.push(`world ${worldId} reversal.${key} must be a non-negative integer`);
  for (const key of ['reversal_available','readministration_available']) if (typeof reversal[key] !== 'boolean') errors.push(`world ${worldId} reversal.${key} must be boolean`);
  if (reversal.reversal_completed_count > reversal.reversal_attempt_count) errors.push(`world ${worldId} completed reversals cannot exceed attempts`);
  if (!reversal.reversal_available && (reversal.reversal_attempt_count > 0 || reversal.reversal_completed_count > 0)) errors.push(`world ${worldId} unavailable reversal route cannot contain reversal receipts`);

  if (governance.comprehension_verified_count !== baseline.comprehension_verified_count) errors.push(`world ${worldId} must preserve verified comprehension for the full population`);
  for (const key of ['interface_audit_state','authorship_audit_state','explanation_state','objection_route','appeal_route','correction_state']) if (!text(governance[key])) errors.push(`world ${worldId} governance.${key} is required`);
  requireFalse(governance.binding_public_authority, `world ${worldId} binding_public_authority`, errors);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceChoiceArchitectureFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_CHOICE_ARCHITECTURE_FIXTURE_SCHEMA_VERSION) errors.push('preference choice-architecture fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-choice-final-status-different-architecture-agency-v1') errors.push('choice-architecture fixture identity mismatch');
  if (fixture?.issue !== 727) errors.push('choice-architecture issue must remain 727');
  if (fixture?.parent_program_issue !== 594) errors.push('choice-architecture parent program must remain 594');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  const baselineContract = {
    technical_correction_state:'complete', final_proposal_id:'A1', operative_release_id:'RELEASE-INCIDENT-V1', operative_release_version:1,
    public_choice_status:'choice_final', affected_population:100, comprehension_verified_count:100, formal_choice_recorded_count:100,
    recorded_bound_count:95, recorded_exit_count:5, people_paid:100, amount_paid:1800, currency:'synthetic_units'
  };
  if (JSON.stringify(baseline) !== JSON.stringify(baselineContract)) errors.push('choice-architecture baseline contract mismatch');
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required choice-architecture worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('choice-architecture world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(fixture?.expected_metrics?.[key], value)) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const requiredRules = [
    'verified_comprehension_is_not_neutral_or_self_authored_choice',
    'visible_option_is_not_symmetric_path_cost',
    'completed_choice_field_is_not_active_choice',
    'nonresponse_or_timeout_is_not_assent',
    'recorded_exit_rate_is_not_intended_exit_or_completed_agency',
    'representative_or_operator_action_is_not_affected_person_authorship',
    'bundled_benefit_acceptance_is_not_independent_release_assent',
    'payment_retention_is_not_prior_assent',
    'repayment_or_clawback_route_is_not_meaningful_exit',
    'formal_cooling_off_text_is_not_usable_reconsideration',
    'same_recorded_disposition_is_not_same_architecture_intention_authorship_assent_or_authority_state',
    'architecture_pressure_or_exit_suppression_is_not_proof_of_coercion_manipulation_breach_misconduct_or_intent',
    'public_choice_final_status_is_not_neutral_self_authored_reversible_auditable_authorized_choice',
    'choice_architecture_claim_requires_population_interface_default_order_salience_path_cost_intention_attempt_authorship_assent_bundling_payment_sequence_clawback_reversal_validation_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('choice-architecture prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('choice-architecture interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceChoiceArchitectureWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const interfaceState = object(world.interface);
  const agency = object(world.agency);
  const bundling = object(world.bundling);
  const payment = object(world.payment);
  const reversal = object(world.reversal);
  const governance = object(world.governance);

  const defaultBinding = interfaceState.default_state !== 'neutral_no_default' || interfaceState.active_choice_required !== true;
  const asymmetricPathCost = interfaceState.bind_authentication !== interfaceState.exit_authentication
    || interfaceState.bind_documentary_burden !== interfaceState.exit_documentary_burden
    || Number(interfaceState.exit_monetary_cost) > Number(interfaceState.bind_monetary_cost)
    || Number(interfaceState.exit_steps) > Number(interfaceState.bind_steps);
  const urgencyPressure = interfaceState.urgency_state !== 'none' || Number(interfaceState.deadline_days) < 7;
  const confirmationAsymmetry = Number(interfaceState.exit_confirmations) > Number(interfaceState.bind_confirmations);
  const bundledAssent = bundling.bundled_with_benefit === true && (bundling.independent_choice_available !== true || bundling.severable !== true);
  const representativeSubstitution = Number(agency.representative_substituted_choice_count) > 0;
  const paymentClawback = payment.timing === 'before_choice' && payment.repayment_required_to_exit === true && Number(payment.clawback_exposed_count) > 0;
  const intendedExitSuppression = Number(agency.intended_exit_count) > Number(agency.completed_exit_count);
  const selfAuthorshipComplete = agency.self_authored_choice_count === baseline.formal_choice_recorded_count
    && agency.representative_substituted_choice_count === 0
    && agency.default_or_automated_recorded_choice_count === 0;
  const explicitAssentComplete = agency.explicit_assent_count === baseline.recorded_bound_count
    && agency.inferred_assent_count === 0
    && bundling.independent_choice_available === true
    && bundling.severable === true
    && payment.timing === 'after_choice';
  const meaningfulReversal = reversal.reversal_available === true
    && reversal.cooling_off_days >= 7
    && reversal.readministration_available === true
    && reversal.reversal_completed_count > 0;
  const complete = governance.comprehension_verified_count === baseline.affected_population
    && interfaceState.default_state === 'neutral_no_default'
    && interfaceState.active_choice_required === true
    && !asymmetricPathCost
    && !urgencyPressure
    && !confirmationAsymmetry
    && !bundledAssent
    && !representativeSubstitution
    && !paymentClawback
    && !intendedExitSuppression
    && selfAuthorshipComplete
    && explicitAssentComplete
    && meaningfulReversal
    && governance.interface_audit_state === 'independent_complete'
    && governance.authorship_audit_state === 'person_level_complete'
    && governance.correction_state === 'operational_and_receipted';

  const flags = {
    complete_neutral_choice_path: complete,
    default_binding_present: defaultBinding,
    asymmetric_path_cost_present: asymmetricPathCost,
    urgency_pressure_present: urgencyPressure,
    confirmation_asymmetry_present: confirmationAsymmetry,
    bundled_assent_present: bundledAssent,
    representative_substitution_present: representativeSubstitution,
    payment_clawback_present: paymentClawback,
    intended_exit_suppression_present: intendedExitSuppression,
    self_authorship_complete: selfAuthorshipComplete,
    explicit_assent_complete: explicitAssentComplete,
    meaningful_reversal_available: meaningfulReversal
  };
  const publicStatusState = { ...world.public_claim };
  const architectureState = { interface:interfaceState, agency, bundling, payment, reversal, governance, flags };
  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    public_claim: world.public_claim,
    interface: interfaceState,
    agency,
    bundling,
    payment,
    reversal,
    governance,
    flags,
    suppressed_exit_intentions: agency.intended_exit_count - agency.completed_exit_count,
    public_status_signature_sha256: sha256(publicStatusState),
    architecture_governance_signature_sha256: sha256(architectureState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildChoiceArchitectureChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({event_id:`${result.world_id}:baseline`,event_type:'population_comprehension_release_payment_and_public_status_snapshot',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:fixture.baseline});
  push({event_id:`${result.world_id}:interface`,event_type:'default_order_salience_path_cost_deadline_and_confirmation_state',evidence_class:'synthetic_control_architecture',authority:'fixture_world',source_event_ids:[`${result.world_id}:baseline`],payload:result.interface});
  push({event_id:`${result.world_id}:agency`,event_type:'intention_attempt_completion_failure_abandonment_and_authorship_state',evidence_class:'synthetic_control_agency',authority:'fixture_world',source_event_ids:[`${result.world_id}:interface`],payload:result.agency});
  push({event_id:`${result.world_id}:assent`,event_type:'explicit_inferred_representative_default_and_bundled_assent_state',evidence_class:'synthetic_control_assent',authority:'fixture_world',source_event_ids:[`${result.world_id}:agency`],payload:{bundling:result.bundling,explicit_assent_count:result.agency.explicit_assent_count,inferred_assent_count:result.agency.inferred_assent_count}});
  push({event_id:`${result.world_id}:payment-reversal`,event_type:'payment_sequence_clawback_cooling_off_reversal_and_readministration_state',evidence_class:'synthetic_control_sequence',authority:'fixture_world',source_event_ids:[`${result.world_id}:assent`],payload:{payment:result.payment,reversal:result.reversal}});
  push({event_id:`${result.world_id}:governance`,event_type:'audit_explanation_objection_appeal_correction_and_authority_state',evidence_class:'synthetic_control_governance',authority:'fixture_world',source_event_ids:[`${result.world_id}:payment-reversal`],payload:result.governance});
  push({event_id:`${result.world_id}:classification`,event_type:'choice_architecture_mechanism_classified',evidence_class:'deterministic_control_classification',authority:'choice_architecture_compiler',source_event_ids:[`${result.world_id}:governance`],payload:{mechanism:result.mechanism,flags:result.flags,suppressed_exit_intentions:result.suppressed_exit_intentions}});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'choice_architecture_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic choice-architecture, intention, authorship, assent, payment-sequence, reversal, and authority state beneath one recorded disposition',refused_promotions:['comprehension_as_neutral_architecture','visible_option_as_symmetric_exit','completed_field_as_active_choice','nonresponse_as_assent','recorded_exit_as_intended_exit','operator_action_as_person_authorship','bundled_benefit_as_independent_assent','payment_retention_as_prior_assent','clawback_as_meaningful_exit','cooling_off_label_as_usable_reconsideration','architecture_pressure_as_coercion_or_intent','choice_final_status_as_public_authority']}});
  return events;
}

export function validatePreferenceChoiceArchitectureChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('choice-architecture event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate choice-architecture event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`choice-architecture event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`choice-architecture event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`choice-architecture event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceChoiceArchitectureFixture(fixture) {
  const errors = validatePreferenceChoiceArchitectureFixture(fixture);
  if (errors.length) throw new Error(`invalid preference choice-architecture fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceChoiceArchitectureWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildChoiceArchitectureChain(fixture, result);
    return { ...result, custody_chain:chain, custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));
  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_architecture_governance_signatures: unique(worlds.map(world => world.architecture_governance_signature_sha256)).length,
    complete_neutral_choice_worlds: countFlag('complete_neutral_choice_path'),
    default_binding_worlds: countFlag('default_binding_present'),
    asymmetric_path_cost_worlds: countFlag('asymmetric_path_cost_present'),
    urgency_pressure_worlds: countFlag('urgency_pressure_present'),
    confirmation_asymmetry_worlds: countFlag('confirmation_asymmetry_present'),
    bundled_assent_worlds: countFlag('bundled_assent_present'),
    representative_substitution_worlds: countFlag('representative_substitution_present'),
    payment_clawback_worlds: countFlag('payment_clawback_present'),
    intended_exit_suppression_worlds: countFlag('intended_exit_suppression_present'),
    self_authorship_complete_worlds: countFlag('self_authorship_complete'),
    explicit_assent_complete_worlds: countFlag('explicit_assent_complete'),
    meaningful_reversal_worlds: countFlag('meaningful_reversal_available'),
    full_comprehension_worlds: worlds.filter(world => world.governance.comprehension_verified_count === fixture.baseline.affected_population).length,
    same_recorded_disposition_worlds: worlds.filter(world => world.public_claim.recorded_bound_count === 95 && world.public_claim.recorded_exit_count === 5).length,
    full_payment_worlds: worlds.filter(world => world.payment.payment_count === 100 && close(world.payment.amount_paid,1800)).length,
    total_intended_exit_count: sum(worlds.map(world => world.agency.intended_exit_count)),
    total_completed_exit_count: sum(worlds.map(world => world.agency.completed_exit_count)),
    total_suppressed_exit_intentions: sum(worlds.map(world => world.suppressed_exit_intentions)),
    total_default_or_automated_recorded_choices: sum(worlds.map(world => world.agency.default_or_automated_recorded_choice_count)),
    total_representative_substituted_choices: sum(worlds.map(world => world.agency.representative_substituted_choice_count)),
    total_inferred_assent_count: sum(worlds.map(world => world.agency.inferred_assent_count)),
    total_payment_before_choice_count: sum(worlds.filter(world => world.payment.timing === 'before_choice').map(world => world.payment.payment_count)),
    total_clawback_exposed_people: sum(worlds.map(world => world.payment.clawback_exposed_count)),
    total_reversal_completed_count: sum(worlds.map(world => world.reversal.reversal_completed_count)),
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version: PREFERENCE_CHOICE_ARCHITECTURE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'choice_architecture_exit_authorship_assent_payment_sequence_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: { ...fixture.expected_classification, preference_change_present:false },
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceChoiceArchitectureBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CHOICE_ARCHITECTURE_BUILD_SCHEMA_VERSION) errors.push('preference choice-architecture build schema mismatch');
  if (compiled?.fixture_id !== 'same-choice-final-status-different-architecture-agency-v1') errors.push('compiled choice-architecture fixture identity mismatch');
  if (compiled?.issue !== 727) errors.push('compiled choice-architecture issue must remain 727');
  if (compiled?.status !== 'choice_architecture_exit_authorship_assent_payment_sequence_qualified') errors.push('compiled choice-architecture status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled choice-architecture graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled choice-architecture worlds are incomplete');
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.architecture_governance_signature_sha256))) errors.push(`world ${world?.world_id} architecture signature is invalid`);
    errors.push(...validatePreferenceChoiceArchitectureChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['neutral-symmetric-active-choice-before-payment']?.flags?.complete_neutral_choice_path !== true) errors.push('positive world must preserve the complete neutral choice path');
  if (byId['binding-by-default-suppresses-intended-exit']?.flags?.default_binding_present !== true) errors.push('default world must preserve binding by default');
  if (byId['exit-authentication-and-cost-asymmetry']?.flags?.asymmetric_path_cost_present !== true) errors.push('path-cost world must preserve exit asymmetry');
  if (byId['urgent-countdown-compresses-exit-completion']?.flags?.urgency_pressure_present !== true) errors.push('urgency world must preserve deadline pressure');
  if (byId['exit-requires-repeated-confirmation']?.flags?.confirmation_asymmetry_present !== true) errors.push('confirmation world must preserve repeated-confirmation asymmetry');
  if (byId['assent-bundled-with-payment-access']?.flags?.bundled_assent_present !== true) errors.push('bundling world must preserve nonseverable benefit bundling');
  if (byId['representative-or-operator-substitutes-choice']?.flags?.representative_substitution_present !== true) errors.push('substitution world must preserve representative or operator authorship');
  if (byId['payment-before-choice-with-clawback-exit']?.flags?.payment_clawback_present !== true) errors.push('payment world must preserve payment-first clawback');
  if (unique(compiled?.refusal_rules).length < 14) errors.push('compiled choice-architecture refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled choice-architecture caveat is required');
  return errors;
}

export function renderPreferenceChoiceArchitectureMarkdown(compiled) {
  const lines = [
    '# Choice architecture, exit authorship, assent, and payment-sequence custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public choice status:** ${compiled.baseline.public_choice_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- Default: ${world.interface.default_state}`,
      `- Active choice required: ${world.interface.active_choice_required}`,
      `- Bind path: ${world.interface.bind_steps} steps, ${world.interface.bind_confirmations} confirmations, cost ${world.interface.bind_monetary_cost}`,
      `- Exit path: ${world.interface.exit_steps} steps, ${world.interface.exit_confirmations} confirmations, cost ${world.interface.exit_monetary_cost}`,
      `- Intended exits: ${world.agency.intended_exit_count}`,
      `- Completed exits: ${world.agency.completed_exit_count}`,
      `- Self-authored choices: ${world.agency.self_authored_choice_count}`,
      `- Representative-substituted choices: ${world.agency.representative_substituted_choice_count}`,
      `- Default or automated records: ${world.agency.default_or_automated_recorded_choice_count}`,
      `- Explicit assents: ${world.agency.explicit_assent_count}`,
      `- Inferred assents: ${world.agency.inferred_assent_count}`,
      `- Payment timing: ${world.payment.timing}`,
      `- Clawback exposure: ${world.payment.clawback_exposed_count}`,
      `- Reversals completed: ${world.reversal.reversal_completed_count}`,
      `- Complete neutral choice: ${world.flags.complete_neutral_choice_path}`,
      `- Custody head: ${world.custody_chain_head_sha256}`,'');
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
