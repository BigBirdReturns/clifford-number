import { createHash } from 'node:crypto';

export const PREFERENCE_CHOICE_EFFECTIVENESS_FIXTURE_SCHEMA_VERSION = 'preference-choice-effectiveness-fixture@1';
export const PREFERENCE_CHOICE_EFFECTIVENESS_BUILD_SCHEMA_VERSION = 'preference-choice-effectiveness-build@1';

const EXPECTED_ACCESS_GROUP_IDS = ['COGNITIVE-ACCESS', 'LANGUAGE-ACCESS', 'SENSORY-ACCESS', 'STANDARD'];
const EXPECTED_WORLD_IDS = [
  'accessibility-and-assisted-comprehension-gaps',
  'comprehended-choice-with-default-friction-suppressing-intended-exit',
  'literal-translation-without-semantic-or-procedural-equivalence',
  'message-open-receipt-treated-as-comprehension',
  'payment-precedes-choice-and-retention-is-treated-as-assent',
  'recognition-quiz-passes-without-scenario-transfer',
  'representative-or-call-center-substitutes-affected-person-choice',
  'verified-comprehension-accessible-self-authored-choice'
];
const EXPECTED_FLAG_KEYS = [
  'complete_informed_choice_path',
  'open_receipt_as_comprehension_present',
  'recognition_without_transfer_present',
  'translation_equivalence_failure_present',
  'accessibility_failure_present',
  'intended_exit_suppression_present',
  'representative_substitution_present',
  'payment_before_assent_present',
  'explicit_assent_complete',
  'self_authorship_complete',
  'independent_validation_and_correction_complete',
  'verified_comprehension_complete'
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
function nonnegativeInteger(value) { return Number.isInteger(value) && value >= 0; }
function positiveInteger(value) { return Number.isInteger(value) && value > 0; }

function expectedClassification() {
  return {
    notice_delivery_or_message_open_identifies_comprehension: false,
    recognition_score_identifies_consequence_understanding_or_scenario_transfer: false,
    translation_availability_identifies_semantic_procedural_equivalence: false,
    formal_accessibility_label_identifies_usable_access_or_assisted_comprehension: false,
    formal_choice_route_identifies_self_authored_meaningful_choice: false,
    recorded_exit_rate_identifies_intended_exit_or_completed_agency: false,
    representative_or_operator_action_identifies_affected_person_assent: false,
    payment_retention_identifies_prior_informed_agreement: false,
    explicit_choice_field_identifies_valid_explicit_assent_receipt: false,
    same_recorded_disposition_identifies_same_comprehension_intention_choice_or_authority: false,
    comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent: false,
    public_informed_choice_complete_status_identifies_validated_accessible_self_authored_correctable_authorized_choice: false,
    complete_informed_choice_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

function requiredMetrics() {
  return {
    world_count: 8,
    distinct_public_status_signatures: 1,
    distinct_choice_effectiveness_signatures: 8,
    complete_informed_choice_worlds: 1,
    open_receipt_as_comprehension_worlds: 1,
    recognition_without_transfer_worlds: 1,
    translation_equivalence_failure_worlds: 1,
    accessibility_failure_worlds: 1,
    intended_exit_suppression_worlds: 1,
    representative_substitution_worlds: 1,
    payment_before_assent_worlds: 1,
    explicit_assent_complete_worlds: 5,
    self_authorship_complete_worlds: 5,
    independent_validation_and_correction_complete_worlds: 1,
    verified_comprehension_complete_worlds: 3,
    full_notice_delivery_worlds: 8,
    full_formal_choice_record_worlds: 8,
    same_recorded_disposition_worlds: 8,
    full_payment_worlds: 8,
    total_verified_consequence_understanding: 550,
    total_scenario_transfer_count: 505,
    total_intended_exit_count: 55,
    total_completed_exit_count: 40,
    total_suppressed_exit_intentions: 15,
    total_representative_substituted_choices: 30,
    total_inferred_assent_count: 140,
    total_payment_before_choice_count: 100,
    binding_public_authority_worlds: 0
  };
}

function validatePublicClaim(claim, baseline, worldId, errors) {
  const expected = {
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    operative_release_id: baseline.operative_release_id,
    operative_release_version: baseline.operative_release_version,
    public_choice_status: baseline.public_choice_status,
    affected_population: baseline.affected_population,
    notice_delivered_count: baseline.notice_delivered_count,
    formal_choice_recorded_count: baseline.formal_choice_recorded_count,
    recorded_bound_count: baseline.recorded_bound_count,
    recorded_exit_count: baseline.recorded_exit_count,
    people_paid: baseline.people_paid,
    amount_paid: baseline.amount_paid
  };
  if (JSON.stringify(claim) !== JSON.stringify(expected)) errors.push(`world ${worldId} must preserve the frozen public informed-choice claim`);
}

function validateNotice(notice, baseline, worldId, errors) {
  for (const key of ['notice_id','operative_release_id']) if (!text(notice?.[key])) errors.push(`world ${worldId} notice ${key} is required`);
  for (const key of ['version','operative_release_version']) if (!positiveInteger(notice?.[key])) errors.push(`world ${worldId} notice ${key} must be a positive integer`);
  for (const key of ['sent_count','delivered_count','opened_count','acknowledged_count']) if (!nonnegativeInteger(notice?.[key]) || notice[key] > baseline.affected_population) errors.push(`world ${worldId} notice ${key} must be within the affected population`);
  if (!(notice.sent_count >= notice.delivered_count && notice.delivered_count >= notice.opened_count && notice.opened_count >= notice.acknowledged_count)) errors.push(`world ${worldId} notice counts do not form a valid custody chain`);
  if (notice.operative_release_id !== baseline.operative_release_id || notice.operative_release_version !== baseline.operative_release_version) errors.push(`world ${worldId} notice must reference the frozen operative release`);
}

function validateAssessment(assessment, baseline, worldId, errors) {
  for (const key of ['construct_id','instrument_id','validity_state','confidence_calibration_state']) if (!text(assessment?.[key])) errors.push(`world ${worldId} assessment ${key} is required`);
  if (!positiveInteger(assessment?.instrument_version)) errors.push(`world ${worldId} assessment instrument_version must be positive`);
  for (const key of ['assessed_count','pass_count','recognition_count','consequence_understanding_count','scenario_transfer_count','delayed_retention_count']) if (!nonnegativeInteger(assessment?.[key]) || assessment[key] > baseline.affected_population) errors.push(`world ${worldId} assessment ${key} must be within the affected population`);
  if ([assessment.pass_count, assessment.recognition_count, assessment.consequence_understanding_count, assessment.scenario_transfer_count, assessment.delayed_retention_count].some(value => value > assessment.assessed_count)) errors.push(`world ${worldId} assessment result counts cannot exceed assessed_count`);
  if (typeof assessment?.threshold_predeclared !== 'boolean') errors.push(`world ${worldId} assessment threshold_predeclared must be boolean`);
}

function validateTranslation(translation, baseline, worldId, errors) {
  for (const key of ['translated_population_count','semantic_equivalence_count','procedural_equivalence_count']) if (!nonnegativeInteger(translation?.[key]) || translation[key] > baseline.affected_population) errors.push(`world ${worldId} translation ${key} must be within the affected population`);
  if (translation.semantic_equivalence_count > translation.translated_population_count || translation.procedural_equivalence_count > translation.translated_population_count) errors.push(`world ${worldId} translation equivalence counts cannot exceed translated population`);
  if (!text(translation?.reviewer_state)) errors.push(`world ${worldId} translation reviewer_state is required`);
}

function validateAccessibility(accessibility, baseline, worldId, errors) {
  for (const key of ['format_coverage_count','usable_access_count','assisted_comprehension_count']) if (!nonnegativeInteger(accessibility?.[key]) || accessibility[key] > baseline.affected_population) errors.push(`world ${worldId} accessibility ${key} must be within the affected population`);
  if (accessibility.usable_access_count > accessibility.format_coverage_count) errors.push(`world ${worldId} usable access cannot exceed format coverage`);
  if (!text(accessibility?.support_state)) errors.push(`world ${worldId} accessibility support_state is required`);
}

function validateChoiceArchitecture(choice, worldId, errors) {
  for (const key of ['default_state','urgency_state','friction_state']) if (!text(choice?.[key])) errors.push(`world ${worldId} choice architecture ${key} is required`);
  if (!positiveInteger(choice?.deadline_days)) errors.push(`world ${worldId} choice architecture deadline_days must be positive`);
  if (typeof choice?.assistance_available !== 'boolean') errors.push(`world ${worldId} choice architecture assistance_available must be boolean`);
}

function validateAgency(agency, baseline, worldId, errors) {
  for (const key of [
    'intended_exit_count','attempted_exit_count','completed_exit_count','failed_exit_count','abandoned_exit_count',
    'self_authored_choice_count','representative_substituted_choice_count','explicit_assent_count','inferred_assent_count',
    'payment_before_choice_count','representative_ratification_count'
  ]) if (!nonnegativeInteger(agency?.[key]) || agency[key] > baseline.affected_population) errors.push(`world ${worldId} agency ${key} must be within the affected population`);
  if (agency.attempted_exit_count !== agency.completed_exit_count + agency.failed_exit_count + agency.abandoned_exit_count) errors.push(`world ${worldId} exit attempts must equal completions, failures, and abandonments`);
  if (agency.intended_exit_count !== agency.completed_exit_count + agency.failed_exit_count + agency.abandoned_exit_count) errors.push(`world ${worldId} intended exits must reconcile to completed, failed, and abandoned exits`);
  if (agency.completed_exit_count !== baseline.recorded_exit_count) errors.push(`world ${worldId} completed exits must preserve the frozen recorded exit count`);
  if (agency.explicit_assent_count + agency.inferred_assent_count !== baseline.recorded_bound_count) errors.push(`world ${worldId} explicit and inferred assent must reconcile to the frozen bound count`);
  if (agency.self_authored_choice_count !== agency.explicit_assent_count + agency.completed_exit_count) errors.push(`world ${worldId} self-authored choices must reconcile to explicit assent and completed exit`);
  if (agency.representative_ratification_count > agency.representative_substituted_choice_count) errors.push(`world ${worldId} representative ratification cannot exceed substituted choices`);
}

function validateGovernance(governance, worldId, errors) {
  for (const key of ['independent_validation_state','audit_state','explanation_state','objection_route','appeal_route','readministration_state','correction_state']) if (!text(governance?.[key])) errors.push(`world ${worldId} governance ${key} is required`);
  if (governance?.binding_public_authority !== false) errors.push(`world ${worldId} binding_public_authority must remain false`);
}

export function validatePreferenceChoiceEffectivenessFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const accessGroups = array(baseline.access_groups);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_CHOICE_EFFECTIVENESS_FIXTURE_SCHEMA_VERSION) errors.push('preference choice-effectiveness fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  const expectedBaseline = {
    technical_correction_state: 'complete',
    final_proposal_id: 'A1',
    operative_release_id: 'RELEASE-INCIDENT-V1',
    operative_release_version: 1,
    public_choice_status: 'informed_choice_complete',
    affected_population: 100,
    notice_delivered_count: 100,
    formal_choice_recorded_count: 100,
    recorded_bound_count: 95,
    recorded_exit_count: 5,
    people_paid: 100,
    amount_paid: 1800,
    currency: 'synthetic_units',
    reference_intended_exit_count: 5,
    reference_explicit_assent_count: 95
  };
  for (const [key, value] of Object.entries(expectedBaseline)) if (baseline[key] !== value) errors.push(`baseline ${key} must remain ${JSON.stringify(value)}`);
  if (baseline.recorded_bound_count + baseline.recorded_exit_count !== baseline.affected_population) errors.push('baseline recorded disposition does not reconcile');
  if (!sameMembers(accessGroups.map(group => group?.group_id), EXPECTED_ACCESS_GROUP_IDS) || unique(accessGroups.map(group => group?.group_id)).length !== accessGroups.length) errors.push('baseline access groups must contain exactly the required groups');
  if (sum(accessGroups.map(group => group.count)) !== baseline.affected_population) errors.push('baseline access groups must sum to the affected population');
  for (const group of accessGroups) if (!positiveInteger(group?.count) || !text(group?.language_requirement) || !text(group?.accessibility_requirement)) errors.push(`baseline access group ${group?.group_id} is incomplete`);
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required choice-effectiveness worlds');
  if (unique(worlds.map(world => world?.world_id)).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    validatePublicClaim(object(world?.public_claim), baseline, worldId, errors);
    validateNotice(object(world?.notice), baseline, worldId, errors);
    validateAssessment(object(world?.assessment), baseline, worldId, errors);
    validateTranslation(object(world?.translation), baseline, worldId, errors);
    validateAccessibility(object(world?.accessibility), baseline, worldId, errors);
    validateChoiceArchitecture(object(world?.choice_architecture), worldId, errors);
    validateAgency(object(world?.agency), baseline, worldId, errors);
    validateGovernance(object(world?.governance), worldId, errors);
    const flags = object(world?.expected_flags);
    if (!sameMembers(Object.keys(flags), EXPECTED_FLAG_KEYS)) errors.push(`world ${worldId} expected_flags must contain exactly the required choice-effectiveness flags`);
    for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
  }
  for (const [key, value] of Object.entries(requiredMetrics())) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  const mandatoryRules = [
    'notice_delivery_or_message_open_is_not_comprehension',
    'recognition_score_is_not_consequence_understanding_or_scenario_transfer',
    'translation_availability_is_not_semantic_procedural_or_legal_equivalence',
    'formal_accessibility_label_is_not_usable_access_or_assisted_comprehension',
    'formal_choice_route_is_not_self_authored_or_meaningful_choice',
    'recorded_exit_rate_is_not_intended_exit_rate_or_completed_agency',
    'representative_or_operator_action_is_not_affected_person_assent',
    'payment_retention_is_not_prior_informed_agreement',
    'explicit_choice_field_is_not_valid_explicit_assent_receipt',
    'same_recorded_disposition_is_not_same_comprehension_intention_choice_or_authority_state',
    'comprehension_or_exit_failure_is_not_proof_of_coercion_manipulation_breach_misconduct_or_intent',
    'public_informed_choice_complete_status_is_not_validated_accessible_self_authored_correctable_authorized_choice',
    'informed_choice_claim_requires_population_notice_comprehension_construct_validity_scenario_transfer_translation_accessibility_assistance_intention_choice_architecture_exit_assent_payment_sequence_representation_validation_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceChoiceEffectivenessWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const verifiedComprehensionComplete = world.assessment.consequence_understanding_count === baseline.affected_population
    && world.assessment.scenario_transfer_count === baseline.affected_population
    && world.assessment.delayed_retention_count === baseline.affected_population
    && world.assessment.validity_state === 'verified_construct_and_transfer';
  const openReceiptAsComprehension = world.assessment.validity_state === 'open_receipt_substituted_for_population_assessment';
  const recognitionWithoutTransfer = world.assessment.recognition_count >= 90 && world.assessment.scenario_transfer_count < 50;
  const translationFailure = world.translation.semantic_equivalence_count < world.translation.translated_population_count
    || world.translation.procedural_equivalence_count < world.translation.translated_population_count;
  const accessibilityFailure = world.accessibility.format_coverage_count < baseline.affected_population
    || world.accessibility.usable_access_count < baseline.affected_population;
  const intendedExitSuppression = world.agency.intended_exit_count > world.agency.completed_exit_count;
  const representativeSubstitution = world.agency.representative_substituted_choice_count > 0;
  const paymentBeforeAssent = world.agency.payment_before_choice_count > 0;
  const explicitAssentComplete = world.agency.explicit_assent_count === baseline.reference_explicit_assent_count;
  const selfAuthorshipComplete = world.agency.self_authored_choice_count === baseline.formal_choice_recorded_count;
  const independentValidationAndCorrectionComplete = world.governance.independent_validation_state === 'complete'
    && world.governance.audit_state === 'complete'
    && world.governance.explanation_state === 'person_and_group_complete'
    && world.governance.objection_route === 'available'
    && world.governance.appeal_route === 'available'
    && world.governance.readministration_state === 'available'
    && world.governance.correction_state === 'operational_and_receipted';
  const completePath = verifiedComprehensionComplete
    && !translationFailure
    && !accessibilityFailure
    && !intendedExitSuppression
    && !representativeSubstitution
    && !paymentBeforeAssent
    && explicitAssentComplete
    && selfAuthorshipComplete
    && world.agency.inferred_assent_count === 0
    && independentValidationAndCorrectionComplete;
  const flags = {
    complete_informed_choice_path: completePath,
    open_receipt_as_comprehension_present: openReceiptAsComprehension,
    recognition_without_transfer_present: recognitionWithoutTransfer,
    translation_equivalence_failure_present: translationFailure,
    accessibility_failure_present: accessibilityFailure,
    intended_exit_suppression_present: intendedExitSuppression,
    representative_substitution_present: representativeSubstitution,
    payment_before_assent_present: paymentBeforeAssent,
    explicit_assent_complete: explicitAssentComplete,
    self_authorship_complete: selfAuthorshipComplete,
    independent_validation_and_correction_complete: independentValidationAndCorrectionComplete,
    verified_comprehension_complete: verifiedComprehensionComplete
  };
  const fullNoticeDelivery = world.public_claim.notice_delivered_count === baseline.affected_population;
  const fullFormalChoiceRecord = world.public_claim.formal_choice_recorded_count === baseline.affected_population;
  const sameRecordedDisposition = world.public_claim.recorded_bound_count === baseline.recorded_bound_count
    && world.public_claim.recorded_exit_count === baseline.recorded_exit_count;
  const fullPayment = world.public_claim.people_paid === baseline.people_paid && world.public_claim.amount_paid === baseline.amount_paid;
  const suppressedExitIntentions = world.agency.intended_exit_count - world.agency.completed_exit_count;
  const signatureState = {
    notice: world.notice,
    assessment: world.assessment,
    translation: world.translation,
    accessibility: world.accessibility,
    choice_architecture: world.choice_architecture,
    agency: world.agency,
    governance: world.governance,
    flags
  };
  return {
    world_id: world.world_id,
    public_claim: world.public_claim,
    notice: world.notice,
    assessment: world.assessment,
    translation: world.translation,
    accessibility: world.accessibility,
    choice_architecture: world.choice_architecture,
    agency: world.agency,
    governance: world.governance,
    flags,
    full_notice_delivery: fullNoticeDelivery,
    full_formal_choice_record: fullFormalChoiceRecord,
    same_recorded_disposition: sameRecordedDisposition,
    full_payment: fullPayment,
    suppressed_exit_intentions: suppressedExitIntentions,
    public_status_signature_sha256: sha256(world.public_claim),
    choice_effectiveness_signature_sha256: sha256(signatureState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildChoiceChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({event_id:`${result.world_id}:baseline`,event_type:'affected_population_release_disposition_payment_and_public_status_snapshot',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:fixture.baseline});
  push({event_id:`${result.world_id}:notice`,event_type:'notice_delivery_open_acknowledgement_and_release_cross_reference_recorded',evidence_class:'synthetic_control_notice',authority:'fixture_world',source_event_ids:[`${result.world_id}:baseline`],payload:result.notice});
  push({event_id:`${result.world_id}:comprehension`,event_type:'construct_instrument_recognition_consequence_transfer_retention_translation_and_accessibility_recorded',evidence_class:'synthetic_control_comprehension',authority:'fixture_world',source_event_ids:[`${result.world_id}:notice`],payload:{assessment:result.assessment,translation:result.translation,accessibility:result.accessibility}});
  push({event_id:`${result.world_id}:architecture`,event_type:'default_deadline_urgency_friction_and_assistance_state_recorded',evidence_class:'synthetic_control_choice_architecture',authority:'fixture_world',source_event_ids:[`${result.world_id}:comprehension`],payload:result.choice_architecture});
  push({event_id:`${result.world_id}:agency`,event_type:'intention_attempt_exit_authorship_assent_representation_and_payment_sequence_recorded',evidence_class:'synthetic_control_agency',authority:'fixture_world',source_event_ids:[`${result.world_id}:architecture`],payload:result.agency});
  push({event_id:`${result.world_id}:governance`,event_type:'validation_audit_explanation_objection_appeal_readministration_correction_and_authority_recorded',evidence_class:'synthetic_control_governance',authority:'fixture_world',source_event_ids:[`${result.world_id}:agency`],payload:result.governance});
  push({event_id:`${result.world_id}:consequence`,event_type:'comprehension_transfer_intended_exit_authorship_assent_and_payment_sequence_consequence_resolved',evidence_class:'deterministic_control_consequence',authority:'choice_effectiveness_compiler',source_event_ids:[`${result.world_id}:governance`],payload:{full_notice_delivery:result.full_notice_delivery,full_formal_choice_record:result.full_formal_choice_record,same_recorded_disposition:result.same_recorded_disposition,full_payment:result.full_payment,suppressed_exit_intentions:result.suppressed_exit_intentions}});
  push({event_id:`${result.world_id}:classification`,event_type:'notice_comprehension_accessibility_exit_and_assent_effectiveness_classified',evidence_class:'deterministic_control_classification',authority:'choice_effectiveness_compiler',source_event_ids:[`${result.world_id}:consequence`],payload:result.flags});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'choice_effectiveness_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic comprehension construct, translation, accessibility, choice architecture, intention, authorship, assent, payment sequencing, validation, correction, and authority state behind one public informed-choice-complete status',refused_promotions:['delivery_or_open_as_comprehension','recognition_as_consequence_or_transfer','translation_availability_as_equivalence','accessibility_label_as_usable_access','formal_choice_as_self_authored_meaningful_choice','recorded_exit_as_intended_exit_or_agency','representative_action_as_assent','payment_retention_as_prior_informed_agreement','choice_field_as_valid_assent_receipt','same_disposition_as_same_choice_state','failure_as_coercion_manipulation_breach_misconduct_or_intent','public_status_as_authorized_choice']}});
  return events;
}

export function validatePreferenceChoiceEffectivenessChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('choice-effectiveness event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate choice-effectiveness event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`choice-effectiveness event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`choice-effectiveness event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`choice-effectiveness event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceChoiceEffectivenessFixture(fixture) {
  const errors = validatePreferenceChoiceEffectivenessFixture(fixture);
  if (errors.length) throw new Error(`invalid preference choice-effectiveness fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceChoiceEffectivenessWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildChoiceChain(fixture, result);
    return {...result,custody_chain:chain,custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null};
  }).sort((left,right)=>left.world_id.localeCompare(right.world_id));
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world=>world.public_status_signature_sha256)).length,
    distinct_choice_effectiveness_signatures: unique(worlds.map(world=>world.choice_effectiveness_signature_sha256)).length,
    complete_informed_choice_worlds: worlds.filter(world=>world.flags.complete_informed_choice_path).length,
    open_receipt_as_comprehension_worlds: worlds.filter(world=>world.flags.open_receipt_as_comprehension_present).length,
    recognition_without_transfer_worlds: worlds.filter(world=>world.flags.recognition_without_transfer_present).length,
    translation_equivalence_failure_worlds: worlds.filter(world=>world.flags.translation_equivalence_failure_present).length,
    accessibility_failure_worlds: worlds.filter(world=>world.flags.accessibility_failure_present).length,
    intended_exit_suppression_worlds: worlds.filter(world=>world.flags.intended_exit_suppression_present).length,
    representative_substitution_worlds: worlds.filter(world=>world.flags.representative_substitution_present).length,
    payment_before_assent_worlds: worlds.filter(world=>world.flags.payment_before_assent_present).length,
    explicit_assent_complete_worlds: worlds.filter(world=>world.flags.explicit_assent_complete).length,
    self_authorship_complete_worlds: worlds.filter(world=>world.flags.self_authorship_complete).length,
    independent_validation_and_correction_complete_worlds: worlds.filter(world=>world.flags.independent_validation_and_correction_complete).length,
    verified_comprehension_complete_worlds: worlds.filter(world=>world.flags.verified_comprehension_complete).length,
    full_notice_delivery_worlds: worlds.filter(world=>world.full_notice_delivery).length,
    full_formal_choice_record_worlds: worlds.filter(world=>world.full_formal_choice_record).length,
    same_recorded_disposition_worlds: worlds.filter(world=>world.same_recorded_disposition).length,
    full_payment_worlds: worlds.filter(world=>world.full_payment).length,
    total_verified_consequence_understanding: sum(worlds.map(world=>world.assessment.consequence_understanding_count)),
    total_scenario_transfer_count: sum(worlds.map(world=>world.assessment.scenario_transfer_count)),
    total_intended_exit_count: sum(worlds.map(world=>world.agency.intended_exit_count)),
    total_completed_exit_count: sum(worlds.map(world=>world.agency.completed_exit_count)),
    total_suppressed_exit_intentions: sum(worlds.map(world=>world.suppressed_exit_intentions)),
    total_representative_substituted_choices: sum(worlds.map(world=>world.agency.representative_substituted_choice_count)),
    total_inferred_assent_count: sum(worlds.map(world=>world.agency.inferred_assent_count)),
    total_payment_before_choice_count: sum(worlds.map(world=>world.agency.payment_before_choice_count)),
    binding_public_authority_worlds: worlds.filter(world=>world.governance.binding_public_authority===true).length
  };
  for (const [key,value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version:PREFERENCE_CHOICE_EFFECTIVENESS_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'notice_comprehension_accessibility_exit_and_assent_effectiveness_qualified',
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

export function validatePreferenceChoiceEffectivenessBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CHOICE_EFFECTIVENESS_BUILD_SCHEMA_VERSION) errors.push('preference choice-effectiveness build schema mismatch');
  if (compiled?.status !== 'notice_comprehension_accessibility_exit_and_assent_effectiveness_qualified') errors.push('compiled choice-effectiveness status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled choice-effectiveness graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled choice-effectiveness must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled choice-effectiveness must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled choice-effectiveness real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world=>world.world_id),EXPECTED_WORLD_IDS)) errors.push('compiled choice-effectiveness worlds are incomplete');
  for (const [key,value] of Object.entries(requiredMetrics())) if (!close(compiled?.metrics?.[key],value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled choice-effectiveness must not claim preference change');
  for (const world of array(compiled?.worlds)) {
    const claim = object(world?.public_claim);
    if (claim.public_choice_status !== 'informed_choice_complete' || claim.affected_population !== 100 || claim.recorded_bound_count !== 95 || claim.recorded_exit_count !== 5 || claim.people_paid !== 100 || claim.amount_paid !== 1800) errors.push(`world ${world?.world_id} must preserve the frozen public choice claim`);
    if (world?.full_notice_delivery !== true || world?.full_formal_choice_record !== true || world?.same_recorded_disposition !== true || world?.full_payment !== true) errors.push(`world ${world?.world_id} must preserve delivery, recorded choice, disposition, and payment`);
    for (const field of ['public_status_signature_sha256','choice_effectiveness_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceChoiceEffectivenessChain(world?.custody_chain));
    if (array(world?.custody_chain).at(-1)?.event_sha256 !== world?.custody_chain_head_sha256) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world=>[world.world_id,world]));
  if (byId['verified-comprehension-accessible-self-authored-choice']?.flags?.complete_informed_choice_path !== true) errors.push('positive choice world must preserve one complete informed-choice path');
  if (byId['message-open-receipt-treated-as-comprehension']?.flags?.open_receipt_as_comprehension_present !== true) errors.push('open-receipt world must preserve receipt substitution');
  if (byId['recognition-quiz-passes-without-scenario-transfer']?.flags?.recognition_without_transfer_present !== true) errors.push('recognition world must preserve recognition without transfer');
  if (byId['literal-translation-without-semantic-or-procedural-equivalence']?.flags?.translation_equivalence_failure_present !== true) errors.push('translation world must preserve semantic and procedural failure');
  if (byId['accessibility-and-assisted-comprehension-gaps']?.flags?.accessibility_failure_present !== true) errors.push('accessibility world must preserve unusable access');
  if (byId['comprehended-choice-with-default-friction-suppressing-intended-exit']?.flags?.intended_exit_suppression_present !== true) errors.push('friction world must preserve intended-exit suppression');
  if (byId['representative-or-call-center-substitutes-affected-person-choice']?.flags?.representative_substitution_present !== true) errors.push('representative world must preserve substituted choice');
  if (byId['payment-precedes-choice-and-retention-is-treated-as-assent']?.flags?.payment_before_assent_present !== true) errors.push('payment world must preserve payment-before-assent');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled choice-effectiveness refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled choice-effectiveness caveat is required');
  return errors;
}

export function renderPreferenceChoiceEffectivenessMarkdown(compiled) {
  const lines = [
    '# Notice comprehension, accessibility, exit, and assent-effectiveness custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public choice-status signatures:** ${compiled.metrics.distinct_public_status_signatures}`,'',
    '> '+compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen choice ledger','',
    `- Operative release: ${compiled.baseline.operative_release_id}@${compiled.baseline.operative_release_version}`,
    `- Public choice status: ${compiled.baseline.public_choice_status}`,
    `- Affected population: ${compiled.baseline.affected_population}`,
    `- Recorded bound: ${compiled.baseline.recorded_bound_count}`,
    `- Recorded exited: ${compiled.baseline.recorded_exit_count}`,
    `- People paid: ${compiled.baseline.people_paid}`,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'');
    lines.push(`- Consequence understanding: ${world.assessment.consequence_understanding_count}/100`);
    lines.push(`- Scenario transfer: ${world.assessment.scenario_transfer_count}/100`);
    lines.push(`- Intended exits: ${world.agency.intended_exit_count}`);
    lines.push(`- Completed exits: ${world.agency.completed_exit_count}`);
    lines.push(`- Self-authored choices: ${world.agency.self_authored_choice_count}`);
    lines.push(`- Explicit assent: ${world.agency.explicit_assent_count}`);
    lines.push(`- Inferred assent: ${world.agency.inferred_assent_count}`);
    lines.push(`- Representative substitutions: ${world.agency.representative_substituted_choice_count}`);
    lines.push(`- Payment before choice: ${world.agency.payment_before_choice_count}`);
    lines.push(`- Complete informed-choice path: ${world.flags.complete_informed_choice_path}`);
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
