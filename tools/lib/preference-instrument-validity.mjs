import { createHash } from 'node:crypto';

export const PREFERENCE_INSTRUMENT_VALIDITY_FIXTURE_SCHEMA_VERSION = 'preference-instrument-validity-fixture@1';
export const PREFERENCE_INSTRUMENT_VALIDITY_BUILD_SCHEMA_VERSION = 'preference-instrument-validity-build@1';

const EXPECTED_WORLD_IDS = [
  'adaptive-item-exposure-concentration',
  'administrator-model-prompting-and-score-overrides',
  'complete-construct-secure-independent-equated-validation',
  'construct-irrelevant-reading-speed-and-technical-familiarity',
  'construct-underrepresentation-vocabulary-only',
  'criterion-contamination-shared-items-and-instruction',
  'form-equating-and-version-drift',
  'item-leakage-and-teaching-to-test'
];
const EXPECTED_FLAG_KEYS = [
  'adaptive_exposure_concentration_present',
  'administration_independence_complete',
  'administration_scoring_override_present',
  'complete_instrument_assurance',
  'construct_coverage_complete',
  'construct_irrelevant_variance_present',
  'construct_underrepresentation_present',
  'criterion_contamination_present',
  'criterion_independence_complete',
  'external_replication_complete',
  'form_comparability_complete',
  'form_equating_version_drift_present',
  'item_leakage_teaching_present',
  'item_security_complete',
  'published_validity_matches_independent_criterion'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_score_provenance_signatures: 8,
  complete_instrument_assurance_worlds: 1,
  construct_underrepresentation_worlds: 1,
  construct_irrelevant_variance_worlds: 1,
  criterion_contamination_worlds: 1,
  item_leakage_teaching_worlds: 1,
  adaptive_exposure_concentration_worlds: 1,
  administration_scoring_override_worlds: 1,
  form_equating_version_drift_worlds: 1,
  construct_coverage_complete_worlds: 7,
  criterion_independence_complete_worlds: 7,
  item_security_complete_worlds: 6,
  administration_independence_complete_worlds: 7,
  form_comparability_complete_worlds: 5,
  external_replication_complete_worlds: 1,
  published_validity_matches_independent_criterion_worlds: 1,
  same_reliability_publication_worlds: 8,
  same_validity_publication_worlds: 8,
  total_excluded_construct_domains: 3,
  total_high_exposure_participant_count: 180,
  total_item_leakage_count: 100,
  total_memorized_answer_count: 80,
  total_teaching_to_test_count: 80,
  total_criterion_item_overlap_count: 10,
  total_criterion_curriculum_overlap_count: 20,
  total_criterion_answer_key_overlap_count: 10,
  total_model_assistance_count: 60,
  total_answer_prompt_count: 60,
  total_answer_completion_count: 20,
  total_score_override_count: 25,
  total_nonindependent_administration_population: 60,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  reliability_coefficient_identifies_construct_validity: false,
  validity_coefficient_identifies_independent_criterion_validity: false,
  high_mean_pass_rate_identifies_complete_construct_coverage: false,
  content_review_identifies_absence_of_construct_underrepresentation: false,
  stable_aggregate_score_identifies_form_comparability: false,
  item_bank_secrecy_claim_identifies_secure_item_exposure: false,
  instructional_alignment_identifies_uncontaminated_understanding: false,
  adaptive_delivery_identifies_exposure_diversity_or_score_comparability: false,
  administrator_assistance_identifies_independent_response_production: false,
  automated_score_identifies_unoverridden_score_provenance: false,
  equating_label_identifies_valid_cross_form_equivalence: false,
  public_instrument_validated_status_identifies_complete_secure_independent_comparable_replicated_correctable_authorized_measurement: false,
  construct_security_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent: false,
  complete_instrument_assurance_supported_in_at_least_one_world: true,
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
function probability(value) { return Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1; }
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
    public_instrument_status: baseline.public_instrument_status,
    affected_population: baseline.affected_population,
    assessed_population: baseline.assessed_population,
    certificates_issued: baseline.certificates_issued,
    published_mean_score: baseline.published_mean_score,
    published_pass_rate: baseline.published_pass_rate,
    published_threshold: baseline.published_threshold,
    published_reliability: baseline.published_reliability,
    published_validity_coefficient: baseline.published_validity_coefficient
  };
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const population = object(world?.population);
  const construct = object(world?.construct);
  const instrument = object(world?.instrument);
  const items = object(world?.items);
  const criterion = object(world?.criterion);
  const administration = object(world?.administration);
  const equating = object(world?.equating);
  const validation = object(world?.validation);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  if (JSON.stringify(world?.public_claim) !== JSON.stringify(expectedPublicClaim(baseline))) errors.push(`world ${worldId} must preserve the frozen public claim`);

  for (const key of ['assessed_count','completed_count','passed_count','certified_count','assisted_count','overridden_score_count','reassessed_count']) {
    if (!nonNegativeInteger(population[key])) errors.push(`world ${worldId} population.${key} must be a non-negative integer`);
  }
  if (population.assessed_count !== baseline.assessed_population || population.completed_count !== population.assessed_count || population.passed_count !== population.completed_count || population.certified_count !== baseline.certificates_issued) errors.push(`world ${worldId} population must preserve the full assessed, passed, and certified surface`);
  if (population.assisted_count > population.assessed_count || population.overridden_score_count > population.assessed_count || population.reassessed_count > population.assessed_count) errors.push(`world ${worldId} population intervention counts exceed the assessed population`);

  for (const key of ['construct_id','coverage_state','intended_interpretation']) if (!text(construct[key])) errors.push(`world ${worldId} construct.${key} is required`);
  if (!nonNegativeInteger(construct.construct_version) || !nonNegativeInteger(construct.total_reference_domains)) errors.push(`world ${worldId} construct version and domain count must be non-negative integers`);
  if (construct.total_reference_domains !== baseline.reference_domains.length) errors.push(`world ${worldId} construct domain count must preserve the reference domain count`);
  if (!Array.isArray(construct.covered_domains) || !Array.isArray(construct.excluded_domains)) errors.push(`world ${worldId} construct domain ledgers must be arrays`);
  if (!sameMembers([...array(construct.covered_domains), ...array(construct.excluded_domains)], baseline.reference_domains)) errors.push(`world ${worldId} construct domain coverage must partition the reference domains`);
  if (array(construct.covered_domains).some(domain => array(construct.excluded_domains).includes(domain))) errors.push(`world ${worldId} construct domains must not overlap`);
  if (unique(array(construct.covered_domains)).length !== array(construct.covered_domains).length || unique(array(construct.excluded_domains)).length !== array(construct.excluded_domains).length) errors.push(`world ${worldId} construct domain ledgers must not repeat entries`);
  if (!probability(construct.construct_relevant_variance_share) || !probability(construct.construct_irrelevant_variance_share) || !close(Number(construct.construct_relevant_variance_share) + Number(construct.construct_irrelevant_variance_share), 1)) errors.push(`world ${worldId} construct variance shares must be probabilities summing to one`);
  for (const key of ['construct_underrepresentation','construct_irrelevant_variance_present']) if (typeof construct[key] !== 'boolean') errors.push(`world ${worldId} construct.${key} must be boolean`);

  for (const key of ['instrument_id','form_id','item_bank_id','scoring_model_id','reliability_method','validity_method','equating_id','equating_state']) if (!text(instrument[key])) errors.push(`world ${worldId} instrument.${key} is required`);
  for (const key of ['instrument_version','form_version','item_bank_version','administered_items','threshold']) if (!nonNegativeInteger(instrument[key])) errors.push(`world ${worldId} instrument.${key} must be a non-negative integer`);
  for (const key of ['observed_mean_score','observed_reliability','published_validity_coefficient','independent_observed_validity_coefficient']) if (!Number.isFinite(Number(instrument[key]))) errors.push(`world ${worldId} instrument.${key} must be numeric`);
  if (!close(instrument.observed_mean_score, baseline.published_mean_score) || instrument.threshold !== baseline.published_threshold || !close(instrument.observed_reliability, baseline.published_reliability) || !close(instrument.published_validity_coefficient, baseline.published_validity_coefficient)) errors.push(`world ${worldId} instrument must preserve the published score, threshold, reliability, and validity surface`);
  if (!probability(instrument.observed_reliability) || !probability(instrument.published_validity_coefficient) || !probability(instrument.independent_observed_validity_coefficient)) errors.push(`world ${worldId} instrument coefficients must be probabilities`);
  if (typeof instrument.comparable_to_reference !== 'boolean') errors.push(`world ${worldId} instrument.comparable_to_reference must be boolean`);

  for (const key of ['unique_items_administered','anchor_items_count','maximum_item_exposure_count','high_exposure_participant_count','leakage_count','memorized_answer_count','teaching_to_test_count']) if (!nonNegativeInteger(items[key])) errors.push(`world ${worldId} items.${key} must be a non-negative integer`);
  for (const key of ['exposure_state','reuse_state','retirement_state','security_audit_state']) if (!text(items[key])) errors.push(`world ${worldId} items.${key} is required`);
  if (typeof items.answer_key_compromised !== 'boolean') errors.push(`world ${worldId} answer_key_compromised must be boolean`);
  for (const key of ['high_exposure_participant_count','leakage_count','memorized_answer_count','teaching_to_test_count']) if (items[key] > baseline.affected_population) errors.push(`world ${worldId} items.${key} exceeds the affected population`);
  if (items.anchor_items_count > items.unique_items_administered) errors.push(`world ${worldId} anchor item count exceeds unique administered items`);

  for (const key of ['criterion_id','contamination_state','criterion_audit_state']) if (!text(criterion[key])) errors.push(`world ${worldId} criterion.${key} is required`);
  for (const key of ['item_overlap_count','curriculum_overlap_count','answer_key_overlap_count']) if (!nonNegativeInteger(criterion[key])) errors.push(`world ${worldId} criterion.${key} must be a non-negative integer`);
  for (const key of ['criterion_independent','temporal_independence','criterion_valid']) if (typeof criterion[key] !== 'boolean') errors.push(`world ${worldId} criterion.${key} must be boolean`);
  if (criterion.item_overlap_count > instrument.administered_items || criterion.answer_key_overlap_count > instrument.administered_items) errors.push(`world ${worldId} criterion item overlap exceeds administered items`);

  for (const key of ['administrator_id','assistance_state','administration_log_state','scoring_log_state']) if (!text(administration[key])) errors.push(`world ${worldId} administration.${key} is required`);
  for (const key of ['model_assistance_count','answer_prompt_count','answer_completion_count','score_override_count','human_override_count','automated_override_count']) if (!nonNegativeInteger(administration[key])) errors.push(`world ${worldId} administration.${key} must be a non-negative integer`);
  for (const key of ['administrator_independent','scoring_independent']) if (typeof administration[key] !== 'boolean') errors.push(`world ${worldId} administration.${key} must be boolean`);
  if (administration.score_override_count !== administration.human_override_count + administration.automated_override_count) errors.push(`world ${worldId} score overrides must reconcile to human plus automated overrides`);
  if (population.assisted_count !== Math.max(administration.model_assistance_count, items.teaching_to_test_count)) errors.push(`world ${worldId} assisted population cannot be smaller than model assistance or instructional exposure and must reconcile to the dominant count`);
  if (population.overridden_score_count !== administration.score_override_count) errors.push(`world ${worldId} overridden score population must match the score override ledger`);
  for (const key of ['model_assistance_count','answer_prompt_count','answer_completion_count','score_override_count']) if (administration[key] > baseline.affected_population) errors.push(`world ${worldId} administration.${key} exceeds the affected population`);

  for (const key of ['approved_form_id','executed_form_id','equating_method','anchor_security_state','equating_audit_state']) if (!text(equating[key])) errors.push(`world ${worldId} equating.${key} is required`);
  if (!nonNegativeInteger(equating.secure_anchor_count)) errors.push(`world ${worldId} secure_anchor_count must be a non-negative integer`);
  for (const key of ['version_drift','form_comparable','score_transformation_disclosed']) if (typeof equating[key] !== 'boolean') errors.push(`world ${worldId} equating.${key} must be boolean`);
  if (equating.secure_anchor_count > items.anchor_items_count) errors.push(`world ${worldId} secure anchors exceed the item anchor count`);

  for (const key of ['content_review_state','uncertainty_state','audit_state','correction_state']) if (!text(validation[key])) errors.push(`world ${worldId} validation.${key} is required`);
  for (const key of ['content_blueprint_predeclared','subgroup_validation','external_replication','independent_validation']) if (typeof validation[key] !== 'boolean') errors.push(`world ${worldId} validation.${key} must be boolean`);
  requireFalse(validation.binding_public_authority, `world ${worldId} binding_public_authority`, errors);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceInstrumentValidityFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_INSTRUMENT_VALIDITY_FIXTURE_SCHEMA_VERSION) errors.push('preference instrument-validity fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-instrument-validation-status-different-score-provenance-v1') errors.push('instrument-validity fixture identity mismatch');
  if (fixture?.issue !== 734) errors.push('instrument-validity issue must remain 734');
  if (fixture?.parent_program_issue !== 594) errors.push('instrument-validity parent program must remain 594');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  const baselineContract = {
    operative_release_id:'RELEASE-INCIDENT-V1', operative_release_version:1, public_instrument_status:'instrument_validated',
    affected_population:100, assessed_population:100, certificates_issued:100, published_mean_score:85,
    published_pass_rate:1, published_threshold:70, published_reliability:0.9, published_validity_coefficient:0.8,
    reference_construct_id:'OPERATIVE-CONSEQUENCE-UNDERSTANDING',
    reference_domains:['release_scope','choice_consequence','exit_consequence','payment_and_clawback_consequence'],
    binding_public_authority:false
  };
  if (JSON.stringify(baseline) !== JSON.stringify(baselineContract)) errors.push('instrument-validity baseline contract mismatch');
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required instrument-validity worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('instrument-validity world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(fixture?.expected_metrics?.[key], value)) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const requiredRules = [
    'reliability_coefficient_is_not_construct_validity',
    'validity_coefficient_is_not_independent_criterion_validity',
    'high_mean_or_pass_rate_is_not_complete_construct_coverage',
    'content_review_is_not_absence_of_construct_underrepresentation',
    'stable_aggregate_score_is_not_form_comparability',
    'item_bank_secrecy_claim_is_not_secure_item_exposure',
    'instructional_alignment_is_not_uncontaminated_understanding',
    'adaptive_delivery_is_not_exposure_diversity_or_score_comparability',
    'administrator_assistance_is_not_independent_response_production',
    'automated_score_is_not_unoverridden_score_provenance',
    'equating_label_is_not_valid_cross_form_equivalence',
    'public_instrument_validated_status_is_not_complete_secure_independent_comparable_replicated_correctable_authorized_measurement',
    'construct_or_security_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_or_intent',
    'instrument_validation_claim_requires_construct_blueprint_item_exposure_instruction_criterion_administration_scoring_override_equating_version_reliability_validity_uncertainty_replication_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('instrument-validity prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('instrument-validity interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceInstrumentValidityWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const population = object(world.population);
  const construct = object(world.construct);
  const instrument = object(world.instrument);
  const items = object(world.items);
  const criterion = object(world.criterion);
  const administration = object(world.administration);
  const equating = object(world.equating);
  const validation = object(world.validation);

  const constructUnderrepresentation = construct.construct_underrepresentation === true || construct.excluded_domains.length > 0;
  const constructIrrelevantVariance = construct.construct_irrelevant_variance_present === true;
  const criterionContamination = !criterion.criterion_independent || !criterion.temporal_independence || !criterion.criterion_valid || criterion.item_overlap_count > 0 || criterion.curriculum_overlap_count > 0 || criterion.answer_key_overlap_count > 0 || criterion.contamination_state !== 'none';
  const itemLeakageTeaching = items.leakage_count > 0 || items.memorized_answer_count > 0 || items.teaching_to_test_count > 0 || items.answer_key_compromised;
  const adaptiveExposureConcentration = !itemLeakageTeaching && items.high_exposure_participant_count > 0 && (items.exposure_state.includes('dominate') || items.reuse_state === 'concentrated' || items.maximum_item_exposure_count >= baseline.affected_population);
  const administrationOverride = !administration.administrator_independent || !administration.scoring_independent || administration.model_assistance_count > 0 || administration.answer_prompt_count > 0 || administration.answer_completion_count > 0 || administration.score_override_count > 0;
  const formDrift = equating.version_drift || equating.approved_form_id !== equating.executed_form_id;
  const constructCoverageComplete = construct.covered_domains.length === baseline.reference_domains.length && construct.excluded_domains.length === 0;
  const criterionIndependenceComplete = !criterionContamination;
  const itemSecurityComplete = !itemLeakageTeaching && !adaptiveExposureConcentration && items.security_audit_state === 'independent_complete';
  const administrationIndependenceComplete = administration.administrator_independent && administration.scoring_independent && administration.model_assistance_count === 0 && administration.answer_prompt_count === 0 && administration.answer_completion_count === 0 && administration.score_override_count === 0;
  const formComparabilityComplete = equating.form_comparable && !formDrift && equating.secure_anchor_count >= 4 && equating.anchor_security_state === 'verified' && equating.approved_form_id === equating.executed_form_id;
  const externalReplicationComplete = validation.external_replication === true;
  const validityMatches = criterionIndependenceComplete && validation.independent_validation === true && close(instrument.independent_observed_validity_coefficient, baseline.published_validity_coefficient);
  const complete = constructCoverageComplete
    && !constructUnderrepresentation
    && !constructIrrelevantVariance
    && criterionIndependenceComplete
    && itemSecurityComplete
    && administrationIndependenceComplete
    && formComparabilityComplete
    && externalReplicationComplete
    && validityMatches
    && validation.content_blueprint_predeclared === true
    && validation.subgroup_validation === true
    && validation.audit_state === 'independent_complete'
    && validation.correction_state === 'reassessment_revocation_and_reissue_operational';

  const flags = {
    complete_instrument_assurance: complete,
    construct_underrepresentation_present: constructUnderrepresentation,
    construct_irrelevant_variance_present: constructIrrelevantVariance,
    criterion_contamination_present: criterionContamination,
    item_leakage_teaching_present: itemLeakageTeaching,
    adaptive_exposure_concentration_present: adaptiveExposureConcentration,
    administration_scoring_override_present: administrationOverride,
    form_equating_version_drift_present: formDrift,
    construct_coverage_complete: constructCoverageComplete,
    criterion_independence_complete: criterionIndependenceComplete,
    item_security_complete: itemSecurityComplete,
    administration_independence_complete: administrationIndependenceComplete,
    form_comparability_complete: formComparabilityComplete,
    external_replication_complete: externalReplicationComplete,
    published_validity_matches_independent_criterion: validityMatches
  };
  const publicStatusState = { ...world.public_claim };
  const provenanceState = { population, construct, instrument, items, criterion, administration, equating, validation, flags };
  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    public_claim: world.public_claim,
    population,
    construct,
    instrument,
    items,
    criterion,
    administration,
    equating,
    validation,
    flags,
    excluded_construct_domain_count: construct.excluded_domains.length,
    nonindependent_administration_population: administration.administrator_independent ? 0 : population.assisted_count,
    public_status_signature_sha256: sha256(publicStatusState),
    score_provenance_signature_sha256: sha256(provenanceState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildInstrumentValidityChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = sealedEvent(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({event_id:`${result.world_id}:baseline`,event_type:'release_population_certificate_score_reliability_validity_and_authority_snapshot',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:fixture.baseline});
  push({event_id:`${result.world_id}:construct`,event_type:'construct_domain_blueprint_coverage_exclusion_interpretation_and_variance_state',evidence_class:'synthetic_control_construct',authority:'fixture_world',source_event_ids:[`${result.world_id}:baseline`],payload:result.construct});
  push({event_id:`${result.world_id}:instrument-items`,event_type:'instrument_form_item_bank_score_item_exposure_leakage_reuse_and_security_state',evidence_class:'synthetic_control_instrument',authority:'fixture_world',source_event_ids:[`${result.world_id}:construct`],payload:{instrument:result.instrument,items:result.items}});
  push({event_id:`${result.world_id}:criterion`,event_type:'criterion_identity_independence_overlap_contamination_and_validity_state',evidence_class:'synthetic_control_criterion',authority:'fixture_world',source_event_ids:[`${result.world_id}:instrument-items`],payload:result.criterion});
  push({event_id:`${result.world_id}:administration`,event_type:'administrator_model_prompt_completion_scoring_override_and_response_provenance_state',evidence_class:'synthetic_control_administration',authority:'fixture_world',source_event_ids:[`${result.world_id}:criterion`],payload:{population:result.population,administration:result.administration}});
  push({event_id:`${result.world_id}:equating`,event_type:'approved_executed_form_anchor_version_equating_comparability_and_transformation_state',evidence_class:'synthetic_control_equating',authority:'fixture_world',source_event_ids:[`${result.world_id}:administration`],payload:result.equating});
  push({event_id:`${result.world_id}:validation`,event_type:'content_subgroup_replication_uncertainty_audit_correction_and_authority_state',evidence_class:'synthetic_control_validation',authority:'fixture_world',source_event_ids:[`${result.world_id}:equating`],payload:result.validation});
  push({event_id:`${result.world_id}:classification`,event_type:'instrument_validity_and_score_provenance_mechanism_classified',evidence_class:'deterministic_control_classification',authority:'instrument_validity_compiler',source_event_ids:[`${result.world_id}:validation`],payload:{mechanism:result.mechanism,flags:result.flags,excluded_construct_domain_count:result.excluded_construct_domain_count,nonindependent_administration_population:result.nonindependent_administration_population}});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'instrument_validity_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic construct, item, criterion, administration, scoring, equating, validation, correction, and authority state beneath one instrument-validation publication surface',refused_promotions:['reliability_as_construct_validity','validity_coefficient_as_independent_criterion_validity','high_score_as_construct_coverage','content_review_as_no_underrepresentation','stable_score_as_form_comparability','item_secrecy_as_secure_exposure','instruction_as_uncontaminated_understanding','adaptive_delivery_as_exposure_diversity','administrator_assistance_as_independent_response','automated_score_as_unoverridden_provenance','equating_label_as_equivalence','construct_or_security_failure_as_coercion_discrimination_or_intent','public_status_as_authorized_measurement']}});
  return events;
}

export function validatePreferenceInstrumentValidityChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('instrument-validity event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate instrument-validity event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`instrument-validity event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`instrument-validity event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`instrument-validity event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceInstrumentValidityFixture(fixture) {
  const errors = validatePreferenceInstrumentValidityFixture(fixture);
  if (errors.length) throw new Error(`invalid preference instrument-validity fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceInstrumentValidityWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildInstrumentValidityChain(fixture, result);
    return { ...result, custody_chain:chain, custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));
  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_score_provenance_signatures: unique(worlds.map(world => world.score_provenance_signature_sha256)).length,
    complete_instrument_assurance_worlds: countFlag('complete_instrument_assurance'),
    construct_underrepresentation_worlds: countFlag('construct_underrepresentation_present'),
    construct_irrelevant_variance_worlds: countFlag('construct_irrelevant_variance_present'),
    criterion_contamination_worlds: countFlag('criterion_contamination_present'),
    item_leakage_teaching_worlds: countFlag('item_leakage_teaching_present'),
    adaptive_exposure_concentration_worlds: countFlag('adaptive_exposure_concentration_present'),
    administration_scoring_override_worlds: countFlag('administration_scoring_override_present'),
    form_equating_version_drift_worlds: countFlag('form_equating_version_drift_present'),
    construct_coverage_complete_worlds: countFlag('construct_coverage_complete'),
    criterion_independence_complete_worlds: countFlag('criterion_independence_complete'),
    item_security_complete_worlds: countFlag('item_security_complete'),
    administration_independence_complete_worlds: countFlag('administration_independence_complete'),
    form_comparability_complete_worlds: countFlag('form_comparability_complete'),
    external_replication_complete_worlds: countFlag('external_replication_complete'),
    published_validity_matches_independent_criterion_worlds: countFlag('published_validity_matches_independent_criterion'),
    same_reliability_publication_worlds: worlds.filter(world => close(world.public_claim.published_reliability,fixture.baseline.published_reliability)).length,
    same_validity_publication_worlds: worlds.filter(world => close(world.public_claim.published_validity_coefficient,fixture.baseline.published_validity_coefficient)).length,
    total_excluded_construct_domains: sum(worlds.map(world => world.excluded_construct_domain_count)),
    total_high_exposure_participant_count: sum(worlds.map(world => world.items.high_exposure_participant_count)),
    total_item_leakage_count: sum(worlds.map(world => world.items.leakage_count)),
    total_memorized_answer_count: sum(worlds.map(world => world.items.memorized_answer_count)),
    total_teaching_to_test_count: sum(worlds.map(world => world.items.teaching_to_test_count)),
    total_criterion_item_overlap_count: sum(worlds.map(world => world.criterion.item_overlap_count)),
    total_criterion_curriculum_overlap_count: sum(worlds.map(world => world.criterion.curriculum_overlap_count)),
    total_criterion_answer_key_overlap_count: sum(worlds.map(world => world.criterion.answer_key_overlap_count)),
    total_model_assistance_count: sum(worlds.map(world => world.administration.model_assistance_count)),
    total_answer_prompt_count: sum(worlds.map(world => world.administration.answer_prompt_count)),
    total_answer_completion_count: sum(worlds.map(world => world.administration.answer_completion_count)),
    total_score_override_count: sum(worlds.map(world => world.administration.score_override_count)),
    total_nonindependent_administration_population: sum(worlds.map(world => world.nonindependent_administration_population)),
    binding_public_authority_worlds: 0
  };
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version:PREFERENCE_INSTRUMENT_VALIDITY_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'measurement_construct_validity_item_security_administration_independence_score_provenance_qualified',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    baseline:fixture.baseline,
    worlds,
    metrics,
    classification:{...fixture.expected_classification, preference_change_present:false},
    refusal_rules:fixture.required_refusal_rules,
    prohibited_inferences:fixture.prohibited_inferences,
    interpretation_contract:fixture.interpretation_contract
  };
}

export function validatePreferenceInstrumentValidityBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_INSTRUMENT_VALIDITY_BUILD_SCHEMA_VERSION) errors.push('preference instrument-validity build schema mismatch');
  if (compiled?.fixture_id !== 'same-instrument-validation-status-different-score-provenance-v1') errors.push('compiled instrument-validity fixture identity mismatch');
  if (compiled?.issue !== 734) errors.push('compiled instrument-validity issue must remain 734');
  if (compiled?.status !== 'measurement_construct_validity_item_security_administration_independence_score_provenance_qualified') errors.push('compiled instrument-validity status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled instrument-validity graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled instrument-validity worlds are incomplete');
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.score_provenance_signature_sha256))) errors.push(`world ${world?.world_id} score-provenance signature is invalid`);
    errors.push(...validatePreferenceInstrumentValidityChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['complete-construct-secure-independent-equated-validation']?.flags?.complete_instrument_assurance !== true) errors.push('positive world must preserve complete instrument assurance');
  if (byId['construct-underrepresentation-vocabulary-only']?.flags?.construct_underrepresentation_present !== true) errors.push('underrepresentation world must preserve omitted construct domains');
  if (byId['construct-irrelevant-reading-speed-and-technical-familiarity']?.flags?.construct_irrelevant_variance_present !== true) errors.push('irrelevant-variance world must preserve construct-irrelevant variance');
  if (byId['criterion-contamination-shared-items-and-instruction']?.flags?.criterion_contamination_present !== true) errors.push('criterion world must preserve shared-item and curriculum contamination');
  if (byId['item-leakage-and-teaching-to-test']?.flags?.item_leakage_teaching_present !== true) errors.push('item world must preserve leakage and teaching-to-test');
  if (byId['adaptive-item-exposure-concentration']?.flags?.adaptive_exposure_concentration_present !== true) errors.push('adaptive world must preserve exposure concentration');
  if (byId['administrator-model-prompting-and-score-overrides']?.flags?.administration_scoring_override_present !== true) errors.push('administration world must preserve prompting and score overrides');
  if (byId['form-equating-and-version-drift']?.flags?.form_equating_version_drift_present !== true) errors.push('form world must preserve equating and version drift');
  if (unique(compiled?.refusal_rules).length < 14) errors.push('compiled instrument-validity refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled instrument-validity caveat is required');
  return errors;
}

export function renderPreferenceInstrumentValidityMarkdown(compiled) {
  const lines = [
    '# Construct validity, item security, administration independence, and score-provenance custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public instrument status:** ${compiled.baseline.public_instrument_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- Covered domains: ${world.construct.covered_domains.length}/${world.construct.total_reference_domains}`,
      `- Excluded domains: ${world.construct.excluded_domains.length}`,
      `- Independent criterion coefficient: ${world.instrument.independent_observed_validity_coefficient}`,
      `- Item leakage: ${world.items.leakage_count}`,
      `- Teaching-to-test exposure: ${world.items.teaching_to_test_count}`,
      `- High-exposure participants: ${world.items.high_exposure_participant_count}`,
      `- Model assistance: ${world.administration.model_assistance_count}`,
      `- Score overrides: ${world.administration.score_override_count}`,
      `- Approved form: ${world.equating.approved_form_id}`,
      `- Executed form: ${world.equating.executed_form_id}`,
      `- Form comparable: ${world.flags.form_comparability_complete}`,
      `- Complete assurance: ${world.flags.complete_instrument_assurance}`,
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
