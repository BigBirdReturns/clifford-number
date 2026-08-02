import { createHash } from 'node:crypto';

export const PREFERENCE_CRITERION_SCORE_USE_FIXTURE_SCHEMA_VERSION = 'preference-criterion-score-use-fixture@1';
export const PREFERENCE_CRITERION_SCORE_USE_BUILD_SCHEMA_VERSION = 'preference-criterion-score-use-build@1';

const EXPECTED_WORLD_IDS = [
  'external-replication-nonrepresentative-transport-failure',
  'historical-validation-inherited-after-system-succession',
  'independent-but-construct-mismatched-proxy',
  'independent-predecision-transportable-use-aligned-current',
  'post-decision-outcome-used-as-criterion',
  'same-team-criterion-presented-as-external',
  'shared-label-feature-record-contamination',
  'valid-prediction-unsupported-consequential-use'
];

const FLAG_KEYS = [
  'complete_external_validation_and_use_path',
  'same_team_criterion_present',
  'post_decision_criterion_present',
  'overlap_contamination_present',
  'proxy_criterion_present',
  'transport_failure_present',
  'unsupported_score_use_present',
  'validation_succession_drift_present',
  'criterion_independence_complete',
  'construct_relevance_complete',
  'predecision_criterion_complete',
  'blind_adjudication_complete',
  'independent_replication_complete',
  'representative_transport_complete',
  'score_use_alignment_complete',
  'current_validation_lineage_complete',
  'published_matches_independent_reference'
];

const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_external_validation_governance_signatures: 8,
  complete_external_validation_and_use_worlds: 1,
  same_team_criterion_worlds: 1,
  post_decision_criterion_worlds: 1,
  overlap_contamination_worlds: 1,
  proxy_criterion_worlds: 1,
  transport_failure_worlds: 1,
  unsupported_score_use_worlds: 1,
  validation_succession_drift_worlds: 1,
  criterion_independence_complete_worlds: 5,
  construct_relevance_complete_worlds: 7,
  predecision_criterion_complete_worlds: 7,
  blind_adjudication_complete_worlds: 6,
  independent_replication_complete_worlds: 6,
  representative_transport_complete_worlds: 7,
  score_use_alignment_complete_worlds: 6,
  current_validation_lineage_complete_worlds: 7,
  published_coefficient_matches_independent_reference_worlds: 1,
  same_public_decision_surface_worlds: 8,
  total_nonindependent_criterion_records: 300,
  total_post_decision_feedback_count: 100,
  total_overlap_count: 260,
  total_proxy_criterion_records: 100,
  total_transport_selection_bias_count: 60,
  total_unsupported_consequential_decisions: 360,
  total_stale_lineage_decisions: 100,
  binding_public_authority_worlds: 0
};

const EXPECTED_FALSE_CLASSIFICATIONS = [
  'external_organization_identifies_independent_design_data_analysis_publication',
  'criterion_availability_identifies_criterion_independence',
  'post_decision_outcome_identifies_pre_treatment_criterion',
  'decision_agreement_identifies_independent_validity_when_score_shaped_decision',
  'shared_labels_features_records_answer_material_identify_independent_validation',
  'independent_criterion_identifies_construct_relevance',
  'replication_count_identifies_independent_representative_replication',
  'external_replication_identifies_transport_to_deployed_population',
  'predictive_validity_identifies_authority_for_consequential_score_use',
  'historical_validation_identifies_current_validation_after_succession',
  'public_externally_validated_status_identifies_independent_transportable_use_aligned_current_correctable_authorized_validation',
  'criterion_transport_use_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
];

const EPSILON = 1e-12;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex');
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function numberInRange(value, minimum, maximum) {
  return Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum;
}

function integerInRange(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function publicClaimFromBaseline(baseline) {
  return {
    operative_release_id: baseline.operative_release_id,
    operative_release_version: baseline.operative_release_version,
    scored_population: baseline.scored_population,
    decision_population: baseline.decision_population,
    public_validation_status: baseline.public_validation_status,
    published_criterion_coefficient: baseline.published_criterion_coefficient,
    published_replication_count: baseline.published_replication_count,
    approved_score_use: baseline.approved_score_use,
    published_decision_agreement: baseline.published_decision_agreement
  };
}

function validatePublicClaim(publicClaim, baseline, worldId, errors) {
  const expected = publicClaimFromBaseline(baseline);
  if (JSON.stringify(canonicalValue(publicClaim)) !== JSON.stringify(canonicalValue(expected))) {
    errors.push(`world ${worldId} must preserve the frozen public validation surface`);
  }
}

function validateSystem(system, worldId, errors) {
  for (const key of ['model_version', 'score_version', 'policy_version', 'workflow_version', 'population_version', 'use_case']) {
    if (!text(system?.[key])) errors.push(`world ${worldId} system.${key} is required`);
  }
  if (!numberInRange(system?.threshold, 0, 1)) errors.push(`world ${worldId} system.threshold must be between zero and one`);
}

function validateCriterion(criterion, baseline, worldId, errors) {
  for (const key of [
    'criterion_id', 'construct', 'intended_interpretation', 'owner_entity', 'designer_entity',
    'collector_entity', 'adjudicator_entity', 'scorer_entity', 'repository_id', 'timing_state'
  ]) if (!text(criterion?.[key])) errors.push(`world ${worldId} criterion.${key} is required`);
  if (!Number.isInteger(criterion?.version) || criterion.version <= 0) errors.push(`world ${worldId} criterion.version must be a positive integer`);
  for (const key of ['predeclared', 'blind', 'derived_from_score']) {
    if (typeof criterion?.[key] !== 'boolean') errors.push(`world ${worldId} criterion.${key} must be boolean`);
  }
  for (const key of [
    'observed_count', 'missing_count', 'label_overlap_count', 'feature_overlap_count',
    'record_overlap_count', 'answer_material_overlap_count', 'decision_feedback_count'
  ]) if (!integerInRange(criterion?.[key], 0, baseline.scored_population)) errors.push(`world ${worldId} criterion.${key} must be an integer between zero and the scored population`);
  if (criterion?.observed_count + criterion?.missing_count > baseline.scored_population) errors.push(`world ${worldId} criterion observed and missing counts exceed the scored population`);
  if (!numberInRange(criterion?.published_coefficient, 0, 1)) errors.push(`world ${worldId} criterion published coefficient must be between zero and one`);
  if (criterion?.independent_reference_coefficient !== null && !numberInRange(criterion?.independent_reference_coefficient, 0, 1)) errors.push(`world ${worldId} criterion independent reference coefficient must be null or between zero and one`);
}

function validateReplications(replications, baseline, worldId, errors) {
  if (replications.length !== baseline.published_replication_count) errors.push(`world ${worldId} must preserve exactly ${baseline.published_replication_count} replication records`);
  const ids = replications.map(replication => text(replication?.replication_id));
  if (unique(ids).length !== replications.length) errors.push(`world ${worldId} replication IDs must be unique`);
  for (const replication of replications) {
    for (const key of ['replication_id', 'validator_entity', 'legal_entity', 'funding_state', 'conflict_state', 'population_id']) {
      if (!text(replication?.[key])) errors.push(`world ${worldId} replication.${key} is required`);
    }
    for (const key of ['design_control', 'data_control', 'analysis_control', 'publication_control', 'representative', 'blind']) {
      if (typeof replication?.[key] !== 'boolean') errors.push(`world ${worldId} replication ${replication?.replication_id} ${key} must be boolean`);
    }
    if (!Number.isInteger(replication?.sample_count) || replication.sample_count <= 0) errors.push(`world ${worldId} replication ${replication?.replication_id} sample_count must be positive`);
    if (!numberInRange(replication?.coefficient, 0, 1)) errors.push(`world ${worldId} replication ${replication?.replication_id} coefficient must be between zero and one`);
  }
}

function validateTransport(transport, baseline, worldId, errors) {
  for (const key of ['validation_population', 'deployment_population', 'transport_state']) if (!text(transport?.[key])) errors.push(`world ${worldId} transport.${key} is required`);
  for (const key of ['eligibility_match', 'geography_match', 'time_match', 'channel_match', 'subgroup_coverage_complete']) {
    if (typeof transport?.[key] !== 'boolean') errors.push(`world ${worldId} transport.${key} must be boolean`);
  }
  for (const key of ['selection_bias_count', 'transported_count']) {
    if (!integerInRange(transport?.[key], 0, baseline.scored_population)) errors.push(`world ${worldId} transport.${key} must be within the scored population`);
  }
}

function validateScoreUse(scoreUse, baseline, worldId, errors) {
  for (const key of ['validated_use', 'approved_use', 'executed_use', 'decision_object', 'human_authority', 'consequence_state']) {
    if (!text(scoreUse?.[key])) errors.push(`world ${worldId} score_use.${key} is required`);
  }
  if (!numberInRange(scoreUse?.action_threshold, 0, 1)) errors.push(`world ${worldId} score_use.action_threshold must be between zero and one`);
  for (const key of ['abstention_available', 'override_available']) if (typeof scoreUse?.[key] !== 'boolean') errors.push(`world ${worldId} score_use.${key} must be boolean`);
  if (scoreUse?.decisions_made !== baseline.decision_population) errors.push(`world ${worldId} must preserve the frozen decision population`);
  if (!integerInRange(scoreUse?.unsupported_decision_count, 0, baseline.decision_population)) errors.push(`world ${worldId} score_use.unsupported_decision_count must be within the decision population`);
}

function validateSuccession(succession, worldId, errors) {
  for (const key of [
    'approved_model_version', 'executed_model_version', 'approved_policy_version', 'executed_policy_version',
    'approved_workflow_version', 'executed_workflow_version', 'approved_population_version',
    'executed_population_version', 'approved_use_case', 'executed_use_case', 'revalidation_state'
  ]) if (!text(succession?.[key])) errors.push(`world ${worldId} succession.${key} is required`);
  for (const key of ['approved_threshold', 'executed_threshold']) if (!numberInRange(succession?.[key], 0, 1)) errors.push(`world ${worldId} succession.${key} must be between zero and one`);
  if (succession?.succession_receipt !== null && !text(succession?.succession_receipt)) errors.push(`world ${worldId} succession receipt must be null or non-empty`);
}

function validateGovernance(governance, worldId, errors) {
  for (const key of [
    'independent_validation_state', 'audit_state', 'monitoring_state', 'drift_state', 'rollback_state',
    'correction_state', 'appeal_state', 'certificate_withdrawal_state', 'publication_authority'
  ]) if (!text(governance?.[key])) errors.push(`world ${worldId} governance.${key} is required`);
  if (governance?.binding_public_authority !== false) errors.push(`world ${worldId} binding public authority must remain false`);
}

function expectedClassification() {
  return {
    external_organization_identifies_independent_design_data_analysis_publication: false,
    criterion_availability_identifies_criterion_independence: false,
    post_decision_outcome_identifies_pre_treatment_criterion: false,
    decision_agreement_identifies_independent_validity_when_score_shaped_decision: false,
    shared_labels_features_records_answer_material_identify_independent_validation: false,
    independent_criterion_identifies_construct_relevance: false,
    replication_count_identifies_independent_representative_replication: false,
    external_replication_identifies_transport_to_deployed_population: false,
    predictive_validity_identifies_authority_for_consequential_score_use: false,
    historical_validation_identifies_current_validation_after_succession: false,
    public_externally_validated_status_identifies_independent_transportable_use_aligned_current_correctable_authorized_validation: false,
    criterion_transport_use_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent: false,
    complete_external_validation_and_use_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceCriterionScoreUseFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_CRITERION_SCORE_USE_FIXTURE_SCHEMA_VERSION) errors.push('preference criterion-score-use fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  if (!text(baseline.operative_release_id) || !Number.isInteger(baseline.operative_release_version) || baseline.operative_release_version <= 0) errors.push('baseline operative release identity is incomplete');
  if (baseline.scored_population !== 100 || baseline.decision_population !== 100) errors.push('baseline must preserve one hundred scored people and one hundred decisions');
  if (baseline.public_validation_status !== 'externally_validated') errors.push('baseline public validation status must remain externally_validated');
  if (!close(baseline.published_criterion_coefficient, 0.8) || baseline.published_replication_count !== 2 || baseline.approved_score_use !== 'consequential_release_choice' || !close(baseline.published_decision_agreement, 0.8)) errors.push('baseline published validation surface mismatch');
  if (!text(baseline.reference_criterion_construct)) errors.push('baseline reference criterion construct is required');
  validateSystem(baseline.reference_system, 'baseline', errors);

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required criterion-score-use worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    validatePublicClaim(object(world?.public_claim), baseline, worldId, errors);
    validateSystem(object(world?.system), worldId, errors);
    validateCriterion(object(world?.criterion), baseline, worldId, errors);
    validateReplications(array(world?.replications), baseline, worldId, errors);
    validateTransport(object(world?.transport), baseline, worldId, errors);
    validateScoreUse(object(world?.score_use), baseline, worldId, errors);
    validateSuccession(object(world?.succession), worldId, errors);
    validateGovernance(object(world?.governance), worldId, errors);
    const flags = object(world?.expected_flags);
    for (const key of FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected flag ${key} must be boolean`);
  }

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const mandatoryRules = [
    'external_organization_is_not_independent_design_data_analysis_or_publication_authority',
    'criterion_availability_is_not_criterion_independence',
    'post_decision_outcome_is_not_pre_treatment_criterion',
    'decision_agreement_is_not_independent_validity_when_the_score_shaped_the_decision',
    'shared_labels_features_records_or_answer_material_are_not_independent_validation',
    'independent_criterion_is_not_necessarily_construct_relevant',
    'replication_count_is_not_independent_or_representative_replication',
    'external_replication_is_not_transport_to_the_deployed_population',
    'predictive_validity_for_one_purpose_is_not_authority_for_another_consequential_score_use',
    'historical_validation_is_not_current_validation_after_model_threshold_policy_population_workflow_or_use_case_succession',
    'public_externally_validated_status_is_not_independent_transportable_use_aligned_current_correctable_or_publicly_authorized_validation',
    'criterion_transport_or_use_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_or_intent',
    'external_validation_claim_requires_criterion_identity_independence_timing_overlap_replication_transport_score_use_feedback_succession_monitoring_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function exactLineage(succession) {
  return succession.approved_model_version === succession.executed_model_version
    && close(succession.approved_threshold, succession.executed_threshold)
    && succession.approved_policy_version === succession.executed_policy_version
    && succession.approved_workflow_version === succession.executed_workflow_version
    && succession.approved_population_version === succession.executed_population_version
    && succession.approved_use_case === succession.executed_use_case;
}

function qualifiedSuccession(succession) {
  return exactLineage(succession)
    || (Boolean(text(succession.succession_receipt)) && succession.revalidation_state === 'current');
}

function replicationIndependence(replications) {
  const legalEntities = unique(replications.map(replication => replication.legal_entity));
  return replications.length === 2
    && legalEntities.length === 2
    && replications.every(replication => replication.design_control === true
      && replication.data_control === true
      && replication.analysis_control === true
      && replication.publication_control === true
      && replication.blind === true
      && replication.conflict_state === 'none');
}

export function simulatePreferenceCriterionScoreUseWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const criterion = object(world.criterion);
  const replications = array(world.replications);
  const transport = object(world.transport);
  const scoreUse = object(world.score_use);
  const succession = object(world.succession);
  const governance = object(world.governance);

  const criterionEntities = unique([
    criterion.owner_entity,
    criterion.designer_entity,
    criterion.collector_entity,
    criterion.adjudicator_entity,
    criterion.scorer_entity
  ]);
  const sameTeamCriterion = criterionEntities.length === 1 || criterionEntities.every(entity => entity.startsWith('DECISION-ORG'));
  const overlapCount = Number(criterion.label_overlap_count)
    + Number(criterion.feature_overlap_count)
    + Number(criterion.record_overlap_count)
    + Number(criterion.answer_material_overlap_count);
  const overlapContamination = overlapCount > 0 || criterion.derived_from_score === true;
  const postDecisionCriterion = criterion.timing_state !== 'pre_decision' || criterion.decision_feedback_count > 0;
  const proxyCriterion = criterion.construct !== baseline.reference_criterion_construct;
  const predecisionCriterion = criterion.timing_state === 'pre_decision' && criterion.decision_feedback_count === 0;
  const blindAdjudication = criterion.blind === true;
  const criterionIndependence = !sameTeamCriterion
    && criterion.predeclared === true
    && predecisionCriterion
    && !overlapContamination
    && governance.independent_validation_state !== 'same_team';
  const independentReplication = replicationIndependence(replications);
  const representativeTransport = transport.validation_population === transport.deployment_population
    && transport.eligibility_match === true
    && transport.geography_match === true
    && transport.time_match === true
    && transport.channel_match === true
    && transport.subgroup_coverage_complete === true
    && transport.selection_bias_count === 0
    && transport.transported_count === baseline.scored_population
    && replications.every(replication => replication.representative === true);
  const scoreUseAlignment = scoreUse.validated_use === scoreUse.approved_use
    && scoreUse.approved_use === scoreUse.executed_use;
  const currentLineage = qualifiedSuccession(succession);
  const publishedMatchesIndependent = criterion.independent_reference_coefficient !== null
    && close(criterion.published_coefficient, criterion.independent_reference_coefficient)
    && close(criterion.published_coefficient, baseline.published_criterion_coefficient);
  const unsupportedScoreUse = scoreUse.validated_use === 'advisory_screening'
    && scoreUse.executed_use === baseline.approved_score_use;
  const successionDrift = !currentLineage;
  const completePath = criterionIndependence
    && !proxyCriterion
    && blindAdjudication
    && independentReplication
    && representativeTransport
    && scoreUseAlignment
    && currentLineage
    && publishedMatchesIndependent
    && governance.independent_validation_state === 'complete'
    && governance.audit_state === 'complete'
    && governance.correction_state === 'operational_and_receipted'
    && governance.publication_authority === 'independent_validator';

  const flags = {
    complete_external_validation_and_use_path: completePath,
    same_team_criterion_present: sameTeamCriterion,
    post_decision_criterion_present: postDecisionCriterion,
    overlap_contamination_present: overlapContamination,
    proxy_criterion_present: proxyCriterion,
    transport_failure_present: !representativeTransport,
    unsupported_score_use_present: unsupportedScoreUse,
    validation_succession_drift_present: successionDrift,
    criterion_independence_complete: criterionIndependence,
    construct_relevance_complete: !proxyCriterion,
    predecision_criterion_complete: predecisionCriterion,
    blind_adjudication_complete: blindAdjudication,
    independent_replication_complete: independentReplication,
    representative_transport_complete: representativeTransport,
    score_use_alignment_complete: scoreUseAlignment,
    current_validation_lineage_complete: currentLineage,
    published_matches_independent_reference: publishedMatchesIndependent
  };

  return {
    world_id: world.world_id,
    public_claim: world.public_claim,
    system: world.system,
    criterion: world.criterion,
    replications: world.replications,
    transport: world.transport,
    score_use: world.score_use,
    succession: world.succession,
    governance: world.governance,
    flags,
    overlap_count: overlapCount,
    nonindependent_criterion_record_count: criterionIndependence ? 0 : criterion.observed_count,
    proxy_criterion_record_count: proxyCriterion ? criterion.observed_count : 0,
    stale_lineage_decision_count: successionDrift ? scoreUse.decisions_made : 0,
    public_status_signature_sha256: sha256(world.public_claim),
    external_validation_governance_signature_sha256: sha256({
      system: world.system,
      criterion: world.criterion,
      replications: world.replications,
      transport: world.transport,
      score_use: world.score_use,
      succession: world.succession,
      governance: world.governance
    })
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCriterionScoreUseChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:public-surface`,
    event_type: 'public_validation_score_use_and_decision_surface_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: result.public_claim
  });
  push({
    event_id: `${result.world_id}:criterion`,
    event_type: 'criterion_identity_independence_timing_and_overlap_ledger',
    evidence_class: 'synthetic_control_criterion',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:public-surface`],
    payload: { criterion: result.criterion, overlap_count: result.overlap_count }
  });
  push({
    event_id: `${result.world_id}:replication`,
    event_type: 'external_replication_identity_control_and_result_ledger',
    evidence_class: 'synthetic_control_replication',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:criterion`],
    payload: result.replications
  });
  push({
    event_id: `${result.world_id}:transport`,
    event_type: 'validation_to_deployment_population_transport_ledger',
    evidence_class: 'synthetic_control_transport',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:replication`],
    payload: result.transport
  });
  push({
    event_id: `${result.world_id}:score-use`,
    event_type: 'validated_approved_executed_score_use_and_decision_ledger',
    evidence_class: 'synthetic_control_score_use',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:transport`],
    payload: result.score_use
  });
  push({
    event_id: `${result.world_id}:succession`,
    event_type: 'model_threshold_policy_workflow_population_and_use_succession_ledger',
    evidence_class: 'synthetic_control_succession',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:score-use`],
    payload: result.succession
  });
  push({
    event_id: `${result.world_id}:governance`,
    event_type: 'monitoring_correction_appeal_withdrawal_and_authority_ledger',
    evidence_class: 'synthetic_control_governance',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:succession`],
    payload: result.governance
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'criterion_transport_score_use_and_lineage_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'criterion_score_use_compiler',
    source_event_ids: [`${result.world_id}:governance`],
    payload: result.flags
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'criterion_score_use_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic criterion independence, replication, transport, score-use, and succession mechanism behind the frozen external-validation surface',
      refused_promotions: [
        'external_entity_as_independence',
        'criterion_presence_as_independent_criterion',
        'post_decision_outcome_as_pre_treatment_validation',
        'shared_data_as_independent_validation',
        'independent_proxy_as_construct_relevance',
        'replication_count_as_independent_transportable_replication',
        'predictive_validity_as_consequential_use_authority',
        'historical_validation_as_successor_validation',
        'laboratory_control_as_named_real_world_finding'
      ]
    }
  });
  return events;
}

export function validatePreferenceCriterionScoreUseChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('criterion-score-use event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate criterion-score-use event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`criterion-score-use event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`criterion-score-use event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`criterion-score-use event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceCriterionScoreUseFixture(fixture) {
  const errors = validatePreferenceCriterionScoreUseFixture(fixture);
  if (errors.length) throw new Error(`invalid preference criterion-score-use fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceCriterionScoreUseWorld(fixture, world);
    for (const key of FLAG_KEYS) {
      if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} flag ${key} mismatch: expected ${world.expected_flags[key]}, observed ${result.flags[key]}`);
    }
    const chain = buildCriterionScoreUseChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_external_validation_governance_signatures: unique(worlds.map(world => world.external_validation_governance_signature_sha256)).length,
    complete_external_validation_and_use_worlds: worlds.filter(world => world.flags.complete_external_validation_and_use_path).length,
    same_team_criterion_worlds: worlds.filter(world => world.flags.same_team_criterion_present).length,
    post_decision_criterion_worlds: worlds.filter(world => world.flags.post_decision_criterion_present).length,
    overlap_contamination_worlds: worlds.filter(world => world.flags.overlap_contamination_present).length,
    proxy_criterion_worlds: worlds.filter(world => world.flags.proxy_criterion_present).length,
    transport_failure_worlds: worlds.filter(world => world.flags.transport_failure_present).length,
    unsupported_score_use_worlds: worlds.filter(world => world.flags.unsupported_score_use_present).length,
    validation_succession_drift_worlds: worlds.filter(world => world.flags.validation_succession_drift_present).length,
    criterion_independence_complete_worlds: worlds.filter(world => world.flags.criterion_independence_complete).length,
    construct_relevance_complete_worlds: worlds.filter(world => world.flags.construct_relevance_complete).length,
    predecision_criterion_complete_worlds: worlds.filter(world => world.flags.predecision_criterion_complete).length,
    blind_adjudication_complete_worlds: worlds.filter(world => world.flags.blind_adjudication_complete).length,
    independent_replication_complete_worlds: worlds.filter(world => world.flags.independent_replication_complete).length,
    representative_transport_complete_worlds: worlds.filter(world => world.flags.representative_transport_complete).length,
    score_use_alignment_complete_worlds: worlds.filter(world => world.flags.score_use_alignment_complete).length,
    current_validation_lineage_complete_worlds: worlds.filter(world => world.flags.current_validation_lineage_complete).length,
    published_coefficient_matches_independent_reference_worlds: worlds.filter(world => world.flags.published_matches_independent_reference).length,
    same_public_decision_surface_worlds: worlds.filter(world => world.public_status_signature_sha256 === worlds[0].public_status_signature_sha256).length,
    total_nonindependent_criterion_records: worlds.reduce((total, world) => total + world.nonindependent_criterion_record_count, 0),
    total_post_decision_feedback_count: worlds.reduce((total, world) => total + Number(world.criterion.decision_feedback_count), 0),
    total_overlap_count: worlds.reduce((total, world) => total + world.overlap_count, 0),
    total_proxy_criterion_records: worlds.reduce((total, world) => total + world.proxy_criterion_record_count, 0),
    total_transport_selection_bias_count: worlds.reduce((total, world) => total + Number(world.transport.selection_bias_count), 0),
    total_unsupported_consequential_decisions: worlds.reduce((total, world) => total + Number(world.score_use.unsupported_decision_count), 0),
    total_stale_lineage_decisions: worlds.reduce((total, world) => total + world.stale_lineage_decision_count, 0),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  }

  return {
    schema_version: PREFERENCE_CRITERION_SCORE_USE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'criterion_independence_external_validation_transport_and_score_use_qualified',
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

export function validatePreferenceCriterionScoreUseBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CRITERION_SCORE_USE_BUILD_SCHEMA_VERSION) errors.push('preference criterion-score-use build schema mismatch');
  if (compiled?.status !== 'criterion_independence_external_validation_transport_and_score_use_qualified') errors.push('compiled criterion-score-use status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled criterion-score-use graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled criterion-score-use counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled criterion-score-use conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled criterion-score-use real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled criterion-score-use worlds are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const key of EXPECTED_FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`compiled classification.${key} must remain false`);
  if (compiled?.classification?.complete_external_validation_and_use_supported_in_at_least_one_world !== true) errors.push('compiled fixture must preserve one complete external-validation and score-use path');
  if (compiled?.classification?.manipulative_intent_inferable !== false || compiled?.classification?.real_world_effect_claimed !== false || compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must preserve zero intent, real-world effect, and preference-change claims');

  for (const world of array(compiled?.worlds)) {
    if (world?.public_claim?.public_validation_status !== 'externally_validated'
      || !close(world?.public_claim?.published_criterion_coefficient, 0.8)
      || world?.public_claim?.published_replication_count !== 2
      || world?.public_claim?.scored_population !== 100
      || world?.public_claim?.decision_population !== 100
      || !close(world?.public_claim?.published_decision_agreement, 0.8)) errors.push(`world ${world?.world_id} must preserve the frozen public validation surface`);
    for (const field of ['public_status_signature_sha256', 'external_validation_governance_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceCriterionScoreUseChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['independent-predecision-transportable-use-aligned-current']?.flags.complete_external_validation_and_use_path !== true) errors.push('positive world must preserve the complete external-validation and score-use path');
  if (byId['same-team-criterion-presented-as-external']?.flags.same_team_criterion_present !== true) errors.push('same-team world must preserve criterion nonindependence');
  if (byId['post-decision-outcome-used-as-criterion']?.flags.post_decision_criterion_present !== true) errors.push('post-decision world must preserve temporal criterion contamination');
  if (byId['shared-label-feature-record-contamination']?.overlap_count !== 260) errors.push('overlap world must preserve 260 overlapping objects');
  if (byId['independent-but-construct-mismatched-proxy']?.flags.proxy_criterion_present !== true) errors.push('proxy world must preserve criterion construct mismatch');
  if (byId['external-replication-nonrepresentative-transport-failure']?.transport.selection_bias_count !== 60) errors.push('transport world must preserve sixty people outside the validated transport surface');
  if (byId['valid-prediction-unsupported-consequential-use']?.flags.unsupported_score_use_present !== true) errors.push('score-use world must preserve the advisory-to-consequential use expansion');
  if (byId['historical-validation-inherited-after-system-succession']?.flags.validation_succession_drift_present !== true) errors.push('succession world must preserve stale validation lineage');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled criterion-score-use refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled criterion-score-use caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCriterionScoreUseMarkdown(compiled) {
  const lines = [
    '# Criterion independence, external validation, transport, and score-use custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Public validation signatures:** ${compiled.metrics.distinct_public_status_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen public surface',
    '',
    `- Public validation status: ${compiled.baseline.public_validation_status}`,
    `- Published criterion coefficient: ${percentage(compiled.baseline.published_criterion_coefficient)}`,
    `- Published replications: ${compiled.baseline.published_replication_count}`,
    `- Scored people: ${compiled.baseline.scored_population}`,
    `- Decisions: ${compiled.baseline.decision_population}`,
    `- Published decision agreement: ${percentage(compiled.baseline.published_decision_agreement)}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Criterion construct: ${world.criterion.construct}`);
    lines.push(`- Criterion timing: ${world.criterion.timing_state}`);
    lines.push(`- Criterion entities: ${unique([world.criterion.owner_entity, world.criterion.designer_entity, world.criterion.collector_entity, world.criterion.adjudicator_entity, world.criterion.scorer_entity]).length}`);
    lines.push(`- Overlap objects: ${world.overlap_count}`);
    lines.push(`- Decision feedback count: ${world.criterion.decision_feedback_count}`);
    lines.push(`- Independent reference coefficient: ${world.criterion.independent_reference_coefficient === null ? 'unavailable' : percentage(world.criterion.independent_reference_coefficient)}`);
    lines.push(`- Replication legal entities: ${unique(world.replications.map(replication => replication.legal_entity)).length}`);
    lines.push(`- Transported people: ${world.transport.transported_count}`);
    lines.push(`- Transport selection bias count: ${world.transport.selection_bias_count}`);
    lines.push(`- Validated score use: ${world.score_use.validated_use}`);
    lines.push(`- Executed score use: ${world.score_use.executed_use}`);
    lines.push(`- Unsupported decisions: ${world.score_use.unsupported_decision_count}`);
    lines.push(`- Current validation lineage: ${world.flags.current_validation_lineage_complete}`);
    lines.push(`- Complete external-validation and use path: ${world.flags.complete_external_validation_and_use_path}`);
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
