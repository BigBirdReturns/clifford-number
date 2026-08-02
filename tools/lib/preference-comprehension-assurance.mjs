import { createHash } from 'node:crypto';

export const PREFERENCE_COMPREHENSION_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-comprehension-assurance-fixture@1';
export const PREFERENCE_COMPREHENSION_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-comprehension-assurance-build@1';

const EXPECTED_WORLD_IDS = [
  'administrator-coaching-and-answer-prompting',
  'immediate-pass-with-delayed-retention-collapse',
  'leaked-item-bank-and-memorized-answers',
  'literal-translation-with-differential-item-functioning',
  'nominal-accessibility-with-construct-failure',
  'partial-assessment-with-certificate-imputation',
  'recognition-only-without-consequence-transfer',
  'validated-consequence-transfer-retention-assurance'
];
const EXPECTED_FLAG_KEYS = [
  'accessibility_construct_failure_present',
  'coaching_contamination_present',
  'complete_measurement_assurance',
  'construct_valid_complete',
  'delayed_retention_complete',
  'delayed_retention_failure_present',
  'denominator_imputation_present',
  'full_population_observed',
  'independent_validation_complete',
  'item_leakage_present',
  'item_security_complete',
  'recognition_only_present',
  'scenario_transfer_complete',
  'subgroup_equivalence_complete',
  'translation_dif_present'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_measurement_assurance_signatures: 8,
  complete_measurement_assurance_worlds: 1,
  recognition_only_worlds: 1,
  item_leakage_worlds: 1,
  coaching_contamination_worlds: 1,
  translation_dif_worlds: 1,
  accessibility_construct_failure_worlds: 1,
  denominator_imputation_worlds: 1,
  delayed_retention_failure_worlds: 7,
  construct_valid_complete_worlds: 4,
  scenario_transfer_complete_worlds: 1,
  delayed_retention_complete_worlds: 1,
  independent_validation_complete_worlds: 1,
  subgroup_equivalence_complete_worlds: 6,
  item_security_complete_worlds: 7,
  full_population_observed_worlds: 7,
  same_certificate_publication_worlds: 8,
  total_assessed_count: 760,
  total_certified_count: 800,
  total_imputed_count: 40,
  total_recognition_count: 760,
  total_consequence_understanding_count: 545,
  total_scenario_transfer_count: 455,
  total_delayed_retention_count: 365,
  total_item_leakage_count: 100,
  total_memorized_answer_count: 80,
  total_coaching_count: 60,
  total_answer_prompt_count: 60,
  total_translation_dif_affected_count: 30,
  total_access_failure_count: 20,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  certificate_count_identifies_assessed_population_or_validated_comprehension: false,
  mean_score_identifies_operative_consequence_understanding: false,
  recognition_recall_identifies_scenario_transfer: false,
  immediate_pass_identifies_delayed_retention: false,
  translation_availability_identifies_semantic_procedural_consequence_equivalence: false,
  accessibility_label_identifies_usable_construct_preserving_accommodation: false,
  expert_review_identifies_independent_validation: false,
  item_bank_secrecy_claim_identifies_item_security: false,
  administrator_assistance_identifies_uncontaminated_person_understanding: false,
  imputed_certificate_identifies_observed_person_comprehension: false,
  aggregate_pass_parity_identifies_subgroup_measurement_equivalence: false,
  public_comprehension_validated_status_identifies_secure_representative_transfer_retained_accessible_independently_validated_authorized_comprehension: false,
  measurement_failure_identifies_coercion_manipulation_breach_discrimination_misconduct_intent: false,
  complete_measurement_assurance_supported_in_at_least_one_world: true,
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
    operative_release_id: baseline.operative_release_id,
    operative_release_version: baseline.operative_release_version,
    public_comprehension_status: baseline.public_comprehension_status,
    affected_population: baseline.affected_population,
    certificates_issued: baseline.certificates_issued,
    published_mean_score: baseline.published_mean_score,
    published_pass_rate: baseline.published_pass_rate,
    published_threshold: baseline.published_threshold
  };
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const population = object(world?.population);
  const measurement = object(world?.measurement);
  const itemSecurity = object(world?.item_security);
  const administration = object(world?.administration);
  const translation = object(world?.translation);
  const accessibility = object(world?.accessibility);
  const validation = object(world?.validation);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  if (JSON.stringify(world?.public_claim) !== JSON.stringify(expectedPublicClaim(baseline))) errors.push(`world ${worldId} must preserve the frozen public claim`);

  for (const key of ['eligible_count','sampled_count','assigned_count','assessed_count','completed_count','passed_count','certified_count','excluded_count','imputed_count','assisted_count','reassessed_count']) {
    if (!nonNegativeInteger(population[key])) errors.push(`world ${worldId} population.${key} must be a non-negative integer`);
  }
  if (population.eligible_count !== baseline.affected_population) errors.push(`world ${worldId} eligible_count must preserve the affected population`);
  if (population.sampled_count > population.eligible_count || population.assigned_count > population.sampled_count || population.assessed_count > population.assigned_count || population.completed_count > population.assessed_count || population.passed_count > population.completed_count) errors.push(`world ${worldId} population denominators are inconsistent`);
  if (population.certified_count !== baseline.certificates_issued) errors.push(`world ${worldId} certified_count must preserve the published certificate count`);
  if (population.certified_count !== population.passed_count + population.imputed_count) errors.push(`world ${worldId} certified_count must reconcile to passed plus imputed certificates`);
  if (population.excluded_count !== population.eligible_count - population.assessed_count) errors.push(`world ${worldId} excluded_count must reconcile to the unassessed eligible population`);
  if (population.assisted_count > population.assessed_count || population.reassessed_count > population.assessed_count) errors.push(`world ${worldId} assistance or reassessment exceeds the assessed population`);

  for (const key of ['construct_id','construct_state','instrument_id','item_bank_id','item_format','confidence_calibration_state']) if (!text(measurement[key])) errors.push(`world ${worldId} measurement.${key} is required`);
  for (const key of ['instrument_version','item_bank_version','threshold','recognition_count','consequence_understanding_count','scenario_transfer_count','delayed_retention_count']) if (!nonNegativeInteger(measurement[key])) errors.push(`world ${worldId} measurement.${key} must be a non-negative integer`);
  if (!Number.isFinite(Number(measurement.observed_mean_score))) errors.push(`world ${worldId} observed_mean_score must be numeric`);
  if (!close(measurement.observed_mean_score, baseline.published_mean_score) || measurement.threshold !== baseline.published_threshold) errors.push(`world ${worldId} measurement must preserve the published score and threshold`);
  for (const key of ['recognition_count','consequence_understanding_count','scenario_transfer_count','delayed_retention_count']) if (measurement[key] > population.assessed_count) errors.push(`world ${worldId} measurement.${key} exceeds the assessed population`);
  for (const key of ['construct_valid','scenario_transfer_valid','delayed_retention_valid']) if (typeof measurement[key] !== 'boolean') errors.push(`world ${worldId} measurement.${key} must be boolean`);

  for (const key of ['exposure_state','answer_key_state','randomization_state','reuse_state','security_audit_state']) if (!text(itemSecurity[key])) errors.push(`world ${worldId} item_security.${key} is required`);
  for (const key of ['leakage_count','memorized_answer_count']) if (!nonNegativeInteger(itemSecurity[key])) errors.push(`world ${worldId} item_security.${key} must be a non-negative integer`);
  if (itemSecurity.leakage_count > population.assessed_count || itemSecurity.memorized_answer_count > population.assessed_count) errors.push(`world ${worldId} item-security counts exceed the assessed population`);

  for (const key of ['mode','administrator_id','assistance_state','administration_log_state']) if (!text(administration[key])) errors.push(`world ${worldId} administration.${key} is required`);
  if (typeof administration.administrator_independent !== 'boolean') errors.push(`world ${worldId} administrator_independent must be boolean`);
  for (const key of ['coaching_count','answer_prompt_count','answer_substitution_count','assistance_count']) if (!nonNegativeInteger(administration[key])) errors.push(`world ${worldId} administration.${key} must be a non-negative integer`);
  if (administration.assistance_count !== population.assisted_count) errors.push(`world ${worldId} administration assistance must match the population ledger`);
  for (const key of ['coaching_count','answer_prompt_count','answer_substitution_count','assistance_count']) if (administration[key] > population.assessed_count) errors.push(`world ${worldId} administration.${key} exceeds the assessed population`);

  for (const key of ['translation_id','review_state','differential_item_functioning_state']) if (!text(translation[key])) errors.push(`world ${worldId} translation.${key} is required`);
  if (!nonNegativeInteger(translation.languages_covered) || !nonNegativeInteger(translation.dif_affected_count)) errors.push(`world ${worldId} translation counts must be non-negative integers`);
  for (const key of ['semantic_equivalence','procedural_equivalence','consequence_equivalence']) if (typeof translation[key] !== 'boolean') errors.push(`world ${worldId} translation.${key} must be boolean`);
  if (translation.dif_affected_count > population.assessed_count) errors.push(`world ${worldId} translation DIF count exceeds the assessed population`);

  for (const key of ['accessibility_id','accommodation_state']) if (!text(accessibility[key])) errors.push(`world ${worldId} accessibility.${key} is required`);
  if (!nonNegativeInteger(accessibility.formats_covered) || !nonNegativeInteger(accessibility.access_failure_count)) errors.push(`world ${worldId} accessibility counts must be non-negative integers`);
  for (const key of ['assistive_technology_tested','usability_tested','accommodation_construct_preserved']) if (typeof accessibility[key] !== 'boolean') errors.push(`world ${worldId} accessibility.${key} must be boolean`);
  if (accessibility.access_failure_count > population.assessed_count) errors.push(`world ${worldId} accessibility failure exceeds the assessed population`);

  for (const key of ['sampling_state','uncertainty_state','validation_state','audit_state','correction_state']) if (!text(validation[key])) errors.push(`world ${worldId} validation.${key} is required`);
  for (const key of ['subgroup_equivalence','independent_validation','external_replication']) if (typeof validation[key] !== 'boolean') errors.push(`world ${worldId} validation.${key} must be boolean`);
  requireFalse(validation.binding_public_authority, `world ${worldId} binding_public_authority`, errors);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceComprehensionAssuranceFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_COMPREHENSION_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('preference comprehension-assurance fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-comprehension-status-different-measurement-assurance-v1') errors.push('comprehension-assurance fixture identity mismatch');
  if (fixture?.issue !== 731) errors.push('comprehension-assurance issue must remain 731');
  if (fixture?.parent_program_issue !== 594) errors.push('comprehension-assurance parent program must remain 594');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  const baselineContract = {
    operative_release_id:'RELEASE-INCIDENT-V1', operative_release_version:1, public_comprehension_status:'comprehension_validated',
    affected_population:100, certificates_issued:100, published_mean_score:85, published_pass_rate:1, published_threshold:70,
    binding_public_authority:false
  };
  if (JSON.stringify(baseline) !== JSON.stringify(baselineContract)) errors.push('comprehension-assurance baseline contract mismatch');
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required comprehension-assurance worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('comprehension-assurance world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(fixture?.expected_metrics?.[key], value)) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const requiredRules = [
    'certificate_count_is_not_assessed_population_or_validated_comprehension',
    'mean_score_is_not_operative_consequence_understanding',
    'recognition_or_recall_is_not_scenario_transfer',
    'immediate_pass_is_not_delayed_retention',
    'translation_availability_is_not_semantic_procedural_or_consequence_equivalence',
    'accessibility_label_is_not_usable_access_or_construct_preserving_accommodation',
    'expert_review_is_not_independent_validation',
    'item_bank_secrecy_claim_is_not_item_security',
    'administrator_assistance_is_not_uncontaminated_person_understanding',
    'imputed_or_extrapolated_certificate_is_not_observed_person_level_comprehension',
    'aggregate_pass_parity_is_not_subgroup_measurement_equivalence',
    'public_comprehension_validated_status_is_not_secure_representative_transfer_capable_retained_accessible_independently_validated_authorized_comprehension',
    'measurement_failure_or_subgroup_gap_is_not_proof_of_coercion_manipulation_breach_discrimination_misconduct_or_intent',
    'comprehension_assurance_claim_requires_population_construct_instrument_item_security_administration_assistance_denominator_translation_accessibility_transfer_retention_subgroup_uncertainty_validation_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('comprehension-assurance prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('comprehension-assurance interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceComprehensionAssuranceWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const population = object(world.population);
  const measurement = object(world.measurement);
  const itemSecurity = object(world.item_security);
  const administration = object(world.administration);
  const translation = object(world.translation);
  const accessibility = object(world.accessibility);
  const validation = object(world.validation);

  const recognitionOnly = measurement.construct_state === 'recognition_only';
  const itemLeakage = itemSecurity.leakage_count > 0 || itemSecurity.memorized_answer_count > 0 || itemSecurity.answer_key_state === 'compromised';
  const coachingContamination = administration.coaching_count > 0 || administration.answer_prompt_count > 0 || administration.answer_substitution_count > 0 || administration.assistance_state === 'construct_contaminating';
  const translationDif = !translation.semantic_equivalence || !translation.procedural_equivalence || !translation.consequence_equivalence || translation.dif_affected_count > 0;
  const accessibilityFailure = !accessibility.assistive_technology_tested || !accessibility.usability_tested || !accessibility.accommodation_construct_preserved || accessibility.access_failure_count > 0;
  const denominatorImputation = population.assessed_count < baseline.affected_population || population.imputed_count > 0 || population.excluded_count > 0;
  const delayedRetentionFailure = measurement.delayed_retention_valid !== true || measurement.delayed_retention_count < baseline.affected_population;
  const constructValidComplete = measurement.construct_valid === true && !itemLeakage && !coachingContamination && !accessibilityFailure;
  const scenarioTransferComplete = measurement.scenario_transfer_valid === true && measurement.scenario_transfer_count === baseline.affected_population;
  const delayedRetentionComplete = measurement.delayed_retention_valid === true && measurement.delayed_retention_count === baseline.affected_population;
  const independentValidationComplete = validation.independent_validation === true && validation.external_replication === true && validation.audit_state === 'independent_complete';
  const subgroupEquivalenceComplete = validation.subgroup_equivalence === true;
  const itemSecurityComplete = !itemLeakage && itemSecurity.security_audit_state !== 'post_hoc_only';
  const fullPopulationObserved = population.assessed_count === baseline.affected_population && population.imputed_count === 0 && population.excluded_count === 0;
  const complete = constructValidComplete
    && scenarioTransferComplete
    && delayedRetentionComplete
    && itemSecurityComplete
    && administration.administrator_independent === true
    && !coachingContamination
    && !translationDif
    && !accessibilityFailure
    && fullPopulationObserved
    && validation.subgroup_equivalence === true
    && independentValidationComplete
    && validation.correction_state === 'reassessment_revocation_and_reissue_operational';

  const flags = {
    complete_measurement_assurance: complete,
    recognition_only_present: recognitionOnly,
    item_leakage_present: itemLeakage,
    coaching_contamination_present: coachingContamination,
    translation_dif_present: translationDif,
    accessibility_construct_failure_present: accessibilityFailure,
    denominator_imputation_present: denominatorImputation,
    delayed_retention_failure_present: delayedRetentionFailure,
    construct_valid_complete: constructValidComplete,
    scenario_transfer_complete: scenarioTransferComplete,
    delayed_retention_complete: delayedRetentionComplete,
    independent_validation_complete: independentValidationComplete,
    subgroup_equivalence_complete: subgroupEquivalenceComplete,
    item_security_complete: itemSecurityComplete,
    full_population_observed: fullPopulationObserved
  };
  const publicStatusState = { ...world.public_claim };
  const measurementState = { population, measurement, item_security:itemSecurity, administration, translation, accessibility, validation, flags };
  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    public_claim: world.public_claim,
    population,
    measurement,
    item_security: itemSecurity,
    administration,
    translation,
    accessibility,
    validation,
    flags,
    public_status_signature_sha256: sha256(publicStatusState),
    measurement_assurance_signature_sha256: sha256(measurementState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildComprehensionAssuranceChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = sealedEvent(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({event_id:`${result.world_id}:baseline`,event_type:'release_public_certificate_score_threshold_and_authority_snapshot',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:fixture.baseline});
  push({event_id:`${result.world_id}:population`,event_type:'eligible_sampled_assessed_passed_certified_excluded_imputed_and_reassessed_population_state',evidence_class:'synthetic_control_denominator',authority:'fixture_world',source_event_ids:[`${result.world_id}:baseline`],payload:result.population});
  push({event_id:`${result.world_id}:measurement`,event_type:'construct_instrument_item_bank_score_consequence_transfer_retention_and_confidence_state',evidence_class:'synthetic_control_measurement',authority:'fixture_world',source_event_ids:[`${result.world_id}:population`],payload:result.measurement});
  push({event_id:`${result.world_id}:security-administration`,event_type:'item_exposure_leakage_memorization_proctor_coaching_prompting_and_assistance_state',evidence_class:'synthetic_control_administration',authority:'fixture_world',source_event_ids:[`${result.world_id}:measurement`],payload:{item_security:result.item_security,administration:result.administration}});
  push({event_id:`${result.world_id}:translation-accessibility`,event_type:'translation_equivalence_dif_accessibility_usability_and_construct_preservation_state',evidence_class:'synthetic_control_access',authority:'fixture_world',source_event_ids:[`${result.world_id}:security-administration`],payload:{translation:result.translation,accessibility:result.accessibility}});
  push({event_id:`${result.world_id}:validation`,event_type:'sampling_uncertainty_subgroup_independent_validation_replication_audit_correction_and_authority_state',evidence_class:'synthetic_control_validation',authority:'fixture_world',source_event_ids:[`${result.world_id}:translation-accessibility`],payload:result.validation});
  push({event_id:`${result.world_id}:classification`,event_type:'comprehension_assurance_mechanism_classified',evidence_class:'deterministic_control_classification',authority:'comprehension_assurance_compiler',source_event_ids:[`${result.world_id}:validation`],payload:{mechanism:result.mechanism,flags:result.flags}});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'comprehension_assurance_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic measurement, denominator, item-security, administration, translation, accessibility, transfer, retention, validation, correction, and authority state beneath one public certification surface',refused_promotions:['certificate_count_as_assessed_population_or_validated_comprehension','mean_score_as_operative_understanding','recognition_as_transfer','immediate_pass_as_retention','translation_availability_as_equivalence','accessibility_label_as_usable_construct_preserving_access','expert_review_as_independent_validation','item_secrecy_claim_as_security','administrator_assistance_as_uncontaminated_understanding','imputation_as_observed_comprehension','aggregate_parity_as_subgroup_equivalence','measurement_failure_as_coercion_discrimination_or_intent','public_status_as_authorized_comprehension']}});
  return events;
}

export function validatePreferenceComprehensionAssuranceChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('comprehension-assurance event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate comprehension-assurance event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`comprehension-assurance event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`comprehension-assurance event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`comprehension-assurance event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceComprehensionAssuranceFixture(fixture) {
  const errors = validatePreferenceComprehensionAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid preference comprehension-assurance fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceComprehensionAssuranceWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildComprehensionAssuranceChain(fixture, result);
    return { ...result, custody_chain:chain, custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));
  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_measurement_assurance_signatures: unique(worlds.map(world => world.measurement_assurance_signature_sha256)).length,
    complete_measurement_assurance_worlds: countFlag('complete_measurement_assurance'),
    recognition_only_worlds: countFlag('recognition_only_present'),
    item_leakage_worlds: countFlag('item_leakage_present'),
    coaching_contamination_worlds: countFlag('coaching_contamination_present'),
    translation_dif_worlds: countFlag('translation_dif_present'),
    accessibility_construct_failure_worlds: countFlag('accessibility_construct_failure_present'),
    denominator_imputation_worlds: countFlag('denominator_imputation_present'),
    delayed_retention_failure_worlds: countFlag('delayed_retention_failure_present'),
    construct_valid_complete_worlds: countFlag('construct_valid_complete'),
    scenario_transfer_complete_worlds: countFlag('scenario_transfer_complete'),
    delayed_retention_complete_worlds: countFlag('delayed_retention_complete'),
    independent_validation_complete_worlds: countFlag('independent_validation_complete'),
    subgroup_equivalence_complete_worlds: countFlag('subgroup_equivalence_complete'),
    item_security_complete_worlds: countFlag('item_security_complete'),
    full_population_observed_worlds: countFlag('full_population_observed'),
    same_certificate_publication_worlds: worlds.filter(world => world.public_claim.certificates_issued === 100 && close(world.public_claim.published_mean_score,85) && close(world.public_claim.published_pass_rate,1)).length,
    total_assessed_count: sum(worlds.map(world => world.population.assessed_count)),
    total_certified_count: sum(worlds.map(world => world.population.certified_count)),
    total_imputed_count: sum(worlds.map(world => world.population.imputed_count)),
    total_recognition_count: sum(worlds.map(world => world.measurement.recognition_count)),
    total_consequence_understanding_count: sum(worlds.map(world => world.measurement.consequence_understanding_count)),
    total_scenario_transfer_count: sum(worlds.map(world => world.measurement.scenario_transfer_count)),
    total_delayed_retention_count: sum(worlds.map(world => world.measurement.delayed_retention_count)),
    total_item_leakage_count: sum(worlds.map(world => world.item_security.leakage_count)),
    total_memorized_answer_count: sum(worlds.map(world => world.item_security.memorized_answer_count)),
    total_coaching_count: sum(worlds.map(world => world.administration.coaching_count)),
    total_answer_prompt_count: sum(worlds.map(world => world.administration.answer_prompt_count)),
    total_translation_dif_affected_count: sum(worlds.map(world => world.translation.dif_affected_count)),
    total_access_failure_count: sum(worlds.map(world => world.accessibility.access_failure_count)),
    binding_public_authority_worlds: 0
  };
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version: PREFERENCE_COMPREHENSION_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'comprehension_measurement_translation_accessibility_transfer_assurance_qualified',
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

export function validatePreferenceComprehensionAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_COMPREHENSION_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('preference comprehension-assurance build schema mismatch');
  if (compiled?.fixture_id !== 'same-comprehension-status-different-measurement-assurance-v1') errors.push('compiled comprehension-assurance fixture identity mismatch');
  if (compiled?.issue !== 731) errors.push('compiled comprehension-assurance issue must remain 731');
  if (compiled?.status !== 'comprehension_measurement_translation_accessibility_transfer_assurance_qualified') errors.push('compiled comprehension-assurance status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled comprehension-assurance graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled comprehension-assurance worlds are incomplete');
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.measurement_assurance_signature_sha256))) errors.push(`world ${world?.world_id} measurement signature is invalid`);
    errors.push(...validatePreferenceComprehensionAssuranceChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['validated-consequence-transfer-retention-assurance']?.flags?.complete_measurement_assurance !== true) errors.push('positive world must preserve complete measurement assurance');
  if (byId['recognition-only-without-consequence-transfer']?.flags?.recognition_only_present !== true) errors.push('recognition world must preserve recognition-only substitution');
  if (byId['leaked-item-bank-and-memorized-answers']?.flags?.item_leakage_present !== true) errors.push('leakage world must preserve item contamination');
  if (byId['administrator-coaching-and-answer-prompting']?.flags?.coaching_contamination_present !== true) errors.push('coaching world must preserve administration contamination');
  if (byId['literal-translation-with-differential-item-functioning']?.flags?.translation_dif_present !== true) errors.push('translation world must preserve differential item functioning');
  if (byId['nominal-accessibility-with-construct-failure']?.flags?.accessibility_construct_failure_present !== true) errors.push('accessibility world must preserve construct failure');
  if (byId['partial-assessment-with-certificate-imputation']?.flags?.denominator_imputation_present !== true) errors.push('denominator world must preserve certificate imputation');
  if (byId['immediate-pass-with-delayed-retention-collapse']?.flags?.delayed_retention_failure_present !== true) errors.push('retention world must preserve delayed collapse');
  if (unique(compiled?.refusal_rules).length < 14) errors.push('compiled comprehension-assurance refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled comprehension-assurance caveat is required');
  return errors;
}

export function renderPreferenceComprehensionAssuranceMarkdown(compiled) {
  const lines = [
    '# Comprehension measurement, translation, accessibility, and scenario-transfer assurance custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public comprehension status:** ${compiled.baseline.public_comprehension_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- Assessed: ${world.population.assessed_count}`,
      `- Certified: ${world.population.certified_count}`,
      `- Imputed: ${world.population.imputed_count}`,
      `- Recognition: ${world.measurement.recognition_count}`,
      `- Consequence understanding: ${world.measurement.consequence_understanding_count}`,
      `- Scenario transfer: ${world.measurement.scenario_transfer_count}`,
      `- Delayed retention: ${world.measurement.delayed_retention_count}`,
      `- Item leakage: ${world.item_security.leakage_count}`,
      `- Coaching: ${world.administration.coaching_count}`,
      `- Translation DIF affected: ${world.translation.dif_affected_count}`,
      `- Accessibility failures: ${world.accessibility.access_failure_count}`,
      `- Complete assurance: ${world.flags.complete_measurement_assurance}`,
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
