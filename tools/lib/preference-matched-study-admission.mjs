import { createHash } from 'node:crypto';

export const MATCHED_STUDY_FIXTURE_SCHEMA_VERSION = 'preference-matched-study-admission-fixture@1';
export const MATCHED_STUDY_BUILD_SCHEMA_VERSION = 'preference-matched-study-admission-build@1';

const ADMISSION_STATES = [
  'complete_matched_execution',
  'bounded_matched_execution_missing_noncritical_context',
  'partial_noncomparable_execution',
  'architecture_or_capability_only',
  'confidential_or_source_restricted',
  'negative_control_no_matched_study',
  'contradicted_or_failed_reconciliation',
  'inadmissible'
];

const SOURCE_STATES = new Set([
  'executed',
  'architecture_only',
  'confidential',
  'no_matched_study',
  'inadmissible'
]);

const EVIDENCE_FIELDS = [
  'study_identity',
  'synthetic_system_identity',
  'human_method_identity',
  'instrument_match',
  'population_match',
  'assignment_and_timing',
  'response_distributions',
  'uncertainty',
  'missingness',
  'subgroup_slices',
  'metric_definition',
  'predeclared_threshold',
  'reconciliation_rule',
  'decision_disposition',
  'decision_receipt',
  'feedback_reuse_state',
  'system_lineage',
  'participant_rights',
  'participant_remedy',
  'public_authority_state',
  'optional_context'
];

const CRITICAL_COMPARABILITY = [
  'study_identity',
  'synthetic_system_identity',
  'human_method_identity',
  'instrument_match',
  'population_match',
  'assignment_and_timing',
  'response_distributions',
  'uncertainty',
  'missingness',
  'subgroup_slices',
  'metric_definition',
  'predeclared_threshold'
];

const CRITICAL_EXECUTION = [
  'reconciliation_rule',
  'decision_disposition',
  'feedback_reuse_state',
  'system_lineage'
];

const CRITICAL_GOVERNANCE = [
  'participant_rights',
  'public_authority_state'
];

const BOUNDED_CONTEXT = [
  'decision_receipt',
  'participant_remedy'
];

const EXPECTED_STUDY_IDS = [
  'MS-01-COMPLETE-POSITIVE',
  'MS-02-BOUNDED-REMEDY',
  'MS-03-INSTRUMENT-MISMATCH',
  'MS-04-POPULATION-MISMATCH',
  'MS-05-MISSING-UNCERTAINTY',
  'MS-06-UNRECEIPTED-DISPOSITION',
  'MS-07-HUMAN-BLOCK',
  'MS-08-STALE-LINEAGE',
  'MS-09-ARCHITECTURE-ONLY',
  'MS-10-SOURCE-RESTRICTED',
  'MS-11-NEGATIVE-NO-STUDY',
  'MS-12-INADMISSIBLE',
  'MS-13-NO-PREDECLARED-RULE'
];

const EXPECTED_STATE_COUNTS = {
  complete_matched_execution: 1,
  bounded_matched_execution_missing_noncritical_context: 2,
  partial_noncomparable_execution: 4,
  architecture_or_capability_only: 1,
  confidential_or_source_restricted: 1,
  negative_control_no_matched_study: 1,
  contradicted_or_failed_reconciliation: 2,
  inadmissible: 1
};

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

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function meaningful(value) {
  const source = text(value).toLowerCase();
  return Boolean(source)
    && !['unknown', 'withheld', 'not_reported', 'not applicable', 'not_applicable'].includes(source);
}

function countBy(values, key) {
  const counts = {};
  for (const value of array(values)) {
    const label = text(value?.[key]) || 'unknown';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function distributionStatus(value, optionIds) {
  const distribution = object(value);
  if (!optionIds.length) return { valid: false, reason: 'option_set_missing' };
  if (!sameMembers(Object.keys(distribution), optionIds)) return { valid: false, reason: 'option_keys_mismatch' };
  let total = 0;
  for (const optionId of optionIds) {
    const probability = Number(distribution[optionId]);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) return { valid: false, reason: `invalid_probability_${optionId}` };
    total += probability;
  }
  if (!close(total, 1)) return { valid: false, reason: 'distribution_does_not_sum_to_one' };
  return { valid: true, reason: 'valid' };
}

function totalVariation(left, right, optionIds) {
  return 0.5 * optionIds.reduce((total, optionId) => (
    total + Math.abs(Number(left[optionId]) - Number(right[optionId]))
  ), 0);
}

function validIsoDate(value) {
  const source = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return false;
  const date = new Date(`${source}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === source;
}

function validWindow(value) {
  const source = text(value);
  if (/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(source)) {
    const [start, end] = source.split('/');
    return validIsoDate(start) && validIsoDate(end) && start <= end;
  }
  return meaningful(source);
}

function fieldsPresent(study) {
  const decisionObject = object(study.decision_object);
  const synthetic = object(study.synthetic_system);
  const human = object(study.human_method);
  const instrument = object(study.instrument);
  const assignment = object(study.assignment);
  const results = object(study.results);
  const comparison = object(study.comparison);
  const reconciliation = object(study.reconciliation);
  const decision = object(study.decision);
  const feedback = object(study.feedback_reuse);
  const lineage = object(study.lineage);
  const rights = object(study.participant_rights);
  const authority = object(study.public_authority);
  const optional = object(study.optional_context);
  const optionIds = unique(instrument.option_ids);
  const syntheticDistribution = distributionStatus(results.synthetic_distribution, optionIds);
  const humanDistribution = distributionStatus(results.human_distribution, optionIds);

  const studyIdentity = meaningful(decisionObject.decision_id)
    && meaningful(decisionObject.commissioner)
    && meaningful(decisionObject.action_at_stake)
    && validIsoDate(decisionObject.decision_date);

  const syntheticIdentity = [
    'runtime_id',
    'validated_runtime_id',
    'model_version',
    'prompt_version',
    'retrieval_version',
    'postprocess_version',
    'benchmark_id',
    'data_window',
    'population_definition',
    'eligibility',
    'geography'
  ].every(key => meaningful(synthetic[key]));

  const humanIdentity = [
    'method_id',
    'instrument_id',
    'sample_definition',
    'eligibility',
    'weighting',
    'geography'
  ].every(key => meaningful(human[key]))
    && Number.isInteger(human.sample_size)
    && human.sample_size > 0
    && validWindow(human.field_window);

  const instrumentMatch = meaningful(instrument.synthetic_question_id)
    && instrument.synthetic_question_id === instrument.human_question_id
    && instrument.same_wording === true
    && instrument.same_options === true
    && instrument.same_order === true
    && optionIds.length >= 2
    && meaningful(instrument.objective)
    && meaningful(instrument.synthetic_hash)
    && instrument.synthetic_hash === instrument.human_hash;

  const exactPopulation = meaningful(synthetic.population_definition)
    && synthetic.population_definition === human.sample_definition
    && meaningful(synthetic.eligibility)
    && synthetic.eligibility === human.eligibility
    && meaningful(synthetic.geography)
    && synthetic.geography === human.geography;
  const declaredCrosswalk = meaningful(assignment.population_crosswalk);
  const populationMatch = (exactPopulation || declaredCrosswalk)
    && assignment.geography_aligned === true;

  const assignmentAndTiming = meaningful(assignment.sequence)
    && meaningful(assignment.timing_window)
    && assignment.same_time_window === true
    && assignment.geography_aligned === true;

  const responseDistributions = syntheticDistribution.valid
    && humanDistribution.valid
    && Number.isInteger(results.human_sample_size)
    && results.human_sample_size > 0;

  const uncertainty = meaningful(results.uncertainty?.method)
    && Number.isFinite(Number(results.uncertainty?.margin_of_error))
    && Number(results.uncertainty?.margin_of_error) >= 0
    && Number(results.uncertainty?.margin_of_error) <= 1;

  const missingness = meaningful(results.missingness?.synthetic)
    && meaningful(results.missingness?.human);

  const subgroupSlices = array(results.subgroup_slices).length > 0
    && array(results.subgroup_slices).every(slice => {
      if (!meaningful(slice?.group_id)) return false;
      const humanStatus = distributionStatus(slice?.human, optionIds);
      const syntheticStatus = distributionStatus(slice?.synthetic, optionIds);
      return humanStatus.valid && syntheticStatus.valid;
    });

  const metricDefinition = comparison.metric_id === 'total_variation'
    && meaningful(comparison.metric_formula);
  const predeclaredThreshold = Number.isFinite(Number(comparison.threshold))
    && Number(comparison.threshold) >= 0
    && Number(comparison.threshold) <= 1
    && comparison.threshold_predeclared === true;

  const reconciliationRule = meaningful(reconciliation.rule_id)
    && reconciliation.predeclared === true
    && meaningful(reconciliation.within_threshold_action)
    && meaningful(reconciliation.exceeds_threshold_action)
    && meaningful(reconciliation.observed_resolution)
    && meaningful(reconciliation.actor);

  const decisionDisposition = meaningful(decision.owner)
    && meaningful(decision.final_disposition)
    && meaningful(decision.implementation_state)
    && typeof decision.human_override_triggered === 'boolean'
    && !['not_executed', 'candidate_only'].includes(text(decision.implementation_state));

  const decisionReceipt = meaningful(decision.receipt_id);
  const feedbackReuse = meaningful(feedback.state)
    && meaningful(feedback.version_update_id);

  const exactLineage = lineage.runtime_matches_validated === true
    && meaningful(lineage.metric_version)
    && lineage.metric_version === lineage.validated_metric_version
    && meaningful(lineage.policy_version)
    && lineage.policy_version === lineage.validated_policy_version;
  const successionLineage = meaningful(lineage.succession_receipt)
    && lineage.succession_receipt !== 'not_required_exact_identity'
    && meaningful(lineage.metric_version)
    && meaningful(lineage.validated_metric_version)
    && meaningful(lineage.policy_version)
    && meaningful(lineage.validated_policy_version);
  const systemLineage = exactLineage || successionLineage;

  const participantRights = meaningful(rights.disclosure)
    && meaningful(rights.correction)
    && meaningful(rights.withdrawal)
    && meaningful(rights.complaint);
  const participantRemedy = meaningful(rights.remedy);
  const publicAuthorityState = typeof authority.binding === 'boolean'
    && typeof authority.objective_control === 'boolean'
    && typeof authority.appeal_and_remedy === 'boolean';
  const optionalContext = meaningful(optional.geography_precision)
    && meaningful(optional.reviewer_identity)
    && typeof optional.raw_data_public === 'boolean';

  return {
    study_identity: studyIdentity,
    synthetic_system_identity: syntheticIdentity,
    human_method_identity: humanIdentity,
    instrument_match: instrumentMatch,
    population_match: populationMatch,
    assignment_and_timing: assignmentAndTiming,
    response_distributions: responseDistributions,
    uncertainty,
    missingness,
    subgroup_slices: subgroupSlices,
    metric_definition: metricDefinition,
    predeclared_threshold: predeclaredThreshold,
    reconciliation_rule: reconciliationRule,
    decision_disposition: decisionDisposition,
    decision_receipt: decisionReceipt,
    feedback_reuse_state: feedbackReuse,
    system_lineage: systemLineage,
    participant_rights: participantRights,
    participant_remedy: participantRemedy,
    public_authority_state: publicAuthorityState,
    optional_context: optionalContext
  };
}

function allFields(fieldStatus, fieldIds) {
  return fieldIds.every(fieldId => fieldStatus[fieldId] === true);
}

function comparisonResult(study, fieldStatus) {
  const options = unique(study.instrument?.option_ids);
  if (!fieldStatus.response_distributions || !fieldStatus.metric_definition) {
    return {
      metric_id: study.comparison?.metric_id ?? null,
      discrepancy: null,
      threshold: Number.isFinite(Number(study.comparison?.threshold)) ? Number(study.comparison.threshold) : null,
      threshold_exceeded: null,
      comparison_state: 'unavailable'
    };
  }
  const discrepancy = totalVariation(study.results.synthetic_distribution, study.results.human_distribution, options);
  const threshold = Number.isFinite(Number(study.comparison?.threshold)) ? Number(study.comparison.threshold) : null;
  const thresholdExceeded = threshold === null ? null : discrepancy > threshold + EPSILON;
  return {
    metric_id: 'total_variation',
    discrepancy,
    threshold,
    threshold_exceeded: thresholdExceeded,
    comparison_state: thresholdExceeded === null
      ? 'threshold_unavailable'
      : thresholdExceeded
        ? 'material_discrepancy'
        : 'within_predeclared_threshold'
  };
}

function classifyStudy(study, fieldStatus, comparison) {
  if (study.source_state === 'inadmissible') return 'inadmissible';
  if (study.source_state === 'no_matched_study') return 'negative_control_no_matched_study';
  if (study.source_state === 'confidential' || study.confidentiality_state === 'materially_restricted') return 'confidential_or_source_restricted';
  if (study.execution_confirmed !== true) {
    return study.architecture_confirmed === true
      ? 'architecture_or_capability_only'
      : 'inadmissible';
  }

  const instrumentPopulationResultsReady = [
    'study_identity',
    'synthetic_system_identity',
    'human_method_identity',
    'instrument_match',
    'population_match',
    'assignment_and_timing',
    'response_distributions',
    'uncertainty',
    'missingness',
    'subgroup_slices',
    'metric_definition'
  ].every(fieldId => fieldStatus[fieldId] === true);

  if (instrumentPopulationResultsReady
      && comparison.threshold_exceeded === true
      && (study.comparison?.threshold_predeclared !== true || study.reconciliation?.predeclared !== true)) {
    return 'contradicted_or_failed_reconciliation';
  }

  if (!allFields(fieldStatus, CRITICAL_COMPARABILITY)) return 'partial_noncomparable_execution';

  if (comparison.threshold_exceeded === true) return 'contradicted_or_failed_reconciliation';

  if (!allFields(fieldStatus, CRITICAL_EXECUTION)) return 'partial_noncomparable_execution';
  if (!allFields(fieldStatus, CRITICAL_GOVERNANCE)) return 'partial_noncomparable_execution';

  if (!allFields(fieldStatus, BOUNDED_CONTEXT) || fieldStatus.optional_context !== true) {
    return 'bounded_matched_execution_missing_noncritical_context';
  }
  return 'complete_matched_execution';
}

function validationOutcome(study, admissionState, comparison, fieldStatus) {
  if (admissionState === 'complete_matched_execution') return 'bounded_positive_agreement';
  if (admissionState === 'bounded_matched_execution_missing_noncritical_context') return 'matched_comparison_complete_publication_context_bounded';
  if (admissionState === 'architecture_or_capability_only') return 'not_executed';
  if (admissionState === 'confidential_or_source_restricted') return 'source_restricted';
  if (admissionState === 'negative_control_no_matched_study') return 'explicit_no_matched_study';
  if (admissionState === 'inadmissible') return 'inadmissible_source_packet';
  if (admissionState === 'partial_noncomparable_execution') {
    if (!fieldStatus.instrument_match) return 'instrument_noncomparable';
    if (!fieldStatus.population_match) return 'population_noncomparable';
    if (!fieldStatus.uncertainty || !fieldStatus.missingness || !fieldStatus.subgroup_slices) return 'result_context_incomplete';
    if (!fieldStatus.system_lineage) return 'validation_lineage_not_current';
    return 'partial_noncomparable';
  }
  if (study.decision?.human_override_triggered === true
      && text(study.decision?.implementation_state).includes('blocked')) {
    return 'synthetic_contradicted_human_evidence_blocked_recommendation';
  }
  if (comparison.threshold_exceeded === true && study.reconciliation?.predeclared !== true) {
    return 'material_discrepancy_without_predeclared_reconciliation';
  }
  return 'contradicted_or_failed_reconciliation';
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildStudyChain(study, fieldStatus, comparison, admissionState, outcome) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${study.study_id}:identity`,
    event_type: 'study_identity_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      study_id: study.study_id,
      label: study.label,
      source_state: study.source_state,
      architecture_confirmed: study.architecture_confirmed,
      execution_confirmed: study.execution_confirmed,
      confidentiality_state: study.confidentiality_state,
      decision_object: study.decision_object
    }
  });
  push({
    event_id: `${study.study_id}:synthetic`,
    event_type: 'synthetic_system_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: 'fixture_author',
    source_event_ids: [`${study.study_id}:identity`],
    payload: study.synthetic_system
  });
  push({
    event_id: `${study.study_id}:human`,
    event_type: 'human_method_and_instrument_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: 'fixture_author',
    source_event_ids: [`${study.study_id}:synthetic`],
    payload: {
      human_method: study.human_method,
      instrument: study.instrument,
      assignment: study.assignment
    }
  });
  push({
    event_id: `${study.study_id}:results`,
    event_type: 'study_results_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: 'fixture_author',
    source_event_ids: [`${study.study_id}:human`],
    payload: study.results
  });
  push({
    event_id: `${study.study_id}:comparison`,
    event_type: 'comparison_resolved',
    evidence_class: 'deterministic_fixture_comparison',
    authority: 'matched_study_compiler',
    source_event_ids: [`${study.study_id}:results`],
    payload: {
      declared_comparison: study.comparison,
      computed_comparison: comparison,
      field_status: fieldStatus
    }
  });
  push({
    event_id: `${study.study_id}:disposition`,
    event_type: 'reconciliation_and_decision_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: study.decision?.owner ?? 'fixture_author',
    source_event_ids: [`${study.study_id}:comparison`],
    payload: {
      reconciliation: study.reconciliation,
      decision: study.decision,
      feedback_reuse: study.feedback_reuse
    }
  });
  push({
    event_id: `${study.study_id}:lineage-rights`,
    event_type: 'lineage_rights_and_authority_recorded',
    evidence_class: 'laboratory_fixture_source',
    authority: 'fixture_author',
    source_event_ids: [`${study.study_id}:disposition`],
    payload: {
      lineage: study.lineage,
      participant_rights: study.participant_rights,
      public_authority: study.public_authority,
      optional_context: study.optional_context
    }
  });
  push({
    event_id: `${study.study_id}:admission`,
    event_type: 'admission_state_resolved',
    evidence_class: 'deterministic_admission_resolution',
    authority: 'matched_study_compiler',
    source_event_ids: [`${study.study_id}:lineage-rights`],
    payload: {
      admission_state: admissionState,
      validation_outcome: outcome,
      expected_admission_state: study.expected_admission_state
    }
  });
  push({
    event_id: `${study.study_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'matched_study_analyst',
    source_event_ids: [`${study.study_id}:admission`],
    payload: {
      allowed_interpretation: 'laboratory admission state under the frozen evidence contract',
      refused_promotions: [
        'laboratory_fixture_as_named_real_study',
        'one_study_as_universal_model_validity',
        'agreement_as_public_authorization',
        'research_rights_as_objective_consent',
        'confidentiality_as_invalidity',
        'human_contradiction_as_missing_data',
        'historical_validation_as_successor_validation'
      ]
    }
  });
  return events;
}

export function validateMatchedStudyChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('matched-study event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate matched-study event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`matched-study event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`matched-study event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`matched-study event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function validateMatchedStudyFixture(fixture) {
  const errors = [];
  const studies = array(fixture?.studies);
  const evidenceFields = array(fixture?.evidence_fields);
  const expectedAggregate = object(fixture?.expected_aggregate);

  if (fixture?.schema_version !== MATCHED_STUDY_FIXTURE_SCHEMA_VERSION) errors.push('matched-study fixture schema mismatch');
  if (!text(fixture?.contract_id)) errors.push('contract_id is required');
  if (fixture?.status !== 'laboratory_admission_contract') errors.push('matched-study fixture status mismatch');
  if (fixture?.classification !== 'generic_matched_study_evidence_and_refusal_contract') errors.push('matched-study fixture classification mismatch');
  if (fixture?.graph_effect !== 'none') errors.push('matched-study fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);
  if (fixture?.publication_status !== 'laboratory_admission_contract_only') errors.push('publication status must remain laboratory_admission_contract_only');

  if (!sameMembers(fixture?.admission_states, ADMISSION_STATES)) errors.push('admission states are incomplete');
  if (!sameMembers(evidenceFields.map(field => field?.field_id), EVIDENCE_FIELDS)) errors.push('evidence fields are incomplete');
  if (unique(evidenceFields.map(field => field?.field_id)).length !== evidenceFields.length) errors.push('evidence fields must be unique');
  for (const field of evidenceFields) {
    if (!['critical_comparability', 'critical_execution', 'critical_governance', 'bounded_context', 'optional_context'].includes(field?.criticality)) {
      errors.push(`evidence field ${field?.field_id} has invalid criticality`);
    }
  }

  if (!sameMembers(studies.map(study => study?.study_id), EXPECTED_STUDY_IDS)) errors.push('matched-study fixture must contain exactly the 13 required studies');
  const studyIds = studies.map(study => text(study?.study_id));
  if (unique(studyIds).length !== studies.length) errors.push('study IDs must be unique');
  for (const study of studies) {
    const id = text(study?.study_id) || '(missing study ID)';
    if (!text(study?.label)) errors.push(`study ${id} requires a label`);
    if (!SOURCE_STATES.has(study?.source_state)) errors.push(`study ${id} has invalid source_state ${study?.source_state}`);
    if (typeof study?.architecture_confirmed !== 'boolean' || typeof study?.execution_confirmed !== 'boolean') errors.push(`study ${id} requires architecture and execution booleans`);
    if (!text(study?.confidentiality_state)) errors.push(`study ${id} requires confidentiality_state`);
    for (const key of [
      'decision_object',
      'synthetic_system',
      'human_method',
      'instrument',
      'assignment',
      'results',
      'comparison',
      'reconciliation',
      'decision',
      'feedback_reuse',
      'lineage',
      'participant_rights',
      'public_authority',
      'optional_context'
    ]) {
      if (!study?.[key] || typeof study[key] !== 'object' || Array.isArray(study[key])) errors.push(`study ${id} requires object ${key}`);
    }
    if (!ADMISSION_STATES.includes(study?.expected_admission_state)) errors.push(`study ${id} has invalid expected admission state`);
    if (study?.source_state !== 'inadmissible' && study?.execution_confirmed === true && study?.source_state !== 'confidential') {
      const optionIds = unique(study?.instrument?.option_ids);
      if (study?.results?.synthetic_distribution !== null && !distributionStatus(study.results.synthetic_distribution, optionIds).valid) {
        errors.push(`study ${id} synthetic distribution is invalid`);
      }
      if (study?.results?.human_distribution !== null && !distributionStatus(study.results.human_distribution, optionIds).valid) {
        errors.push(`study ${id} human distribution is invalid`);
      }
    }
  }

  const declaredStateCounts = countBy(studies, 'expected_admission_state');
  for (const [state, count] of Object.entries(EXPECTED_STATE_COUNTS)) {
    if (declaredStateCounts[state] !== count) errors.push(`declared expected state count mismatch for ${state}`);
    if (expectedAggregate?.state_counts?.[state] !== count) errors.push(`expected aggregate state count mismatch for ${state}`);
  }
  if (expectedAggregate.study_count !== 13) errors.push('expected aggregate study_count must remain 13');
  if (expectedAggregate.comparison_complete_count !== 5) errors.push('expected comparison_complete_count must remain 5');
  if (expectedAggregate.complete_positive_admission_count !== 1) errors.push('expected complete_positive_admission_count must remain 1');
  if (expectedAggregate.negative_validation_or_reconciliation_count !== 2) errors.push('expected negative_validation_or_reconciliation_count must remain 2');
  if (expectedAggregate.operational_human_override_receipt_count !== 1) errors.push('expected operational_human_override_receipt_count must remain 1');
  if (expectedAggregate.binding_public_authority_count !== 0) errors.push('expected binding_public_authority_count must remain 0');
  if (expectedAggregate.human_to_model_feedback_update_count !== 0) errors.push('expected human_to_model_feedback_update_count must remain 0');

  if (unique(fixture?.required_refusal_rules).length < 12) errors.push('required refusal-rule ledger is incomplete');
  if (unique(fixture?.prohibited_inferences).length < 8) errors.push('prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id)
      || !text(fixture?.interpretation_contract?.what_this_is)
      || !text(fixture?.interpretation_contract?.what_this_is_not)
      || !text(fixture?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('interpretation contract is incomplete');
  }
  return errors;
}

export function compileMatchedStudyFixture(fixture) {
  const errors = validateMatchedStudyFixture(fixture);
  if (errors.length) throw new Error(`invalid matched-study fixture:\n- ${errors.join('\n- ')}`);

  const studies = fixture.studies.map(study => {
    const fieldStatus = fieldsPresent(study);
    const comparison = comparisonResult(study, fieldStatus);
    const admissionState = classifyStudy(study, fieldStatus, comparison);
    if (admissionState !== study.expected_admission_state) {
      throw new Error(`study ${study.study_id} admission mismatch: expected ${study.expected_admission_state}, observed ${admissionState}`);
    }
    const outcome = validationOutcome(study, admissionState, comparison, fieldStatus);
    const chain = buildStudyChain(study, fieldStatus, comparison, admissionState, outcome);
    return {
      study_id: study.study_id,
      label: study.label,
      source_state: study.source_state,
      architecture_confirmed: study.architecture_confirmed,
      execution_confirmed: study.execution_confirmed,
      confidentiality_state: study.confidentiality_state,
      admission_state: admissionState,
      validation_outcome: outcome,
      field_status: fieldStatus,
      field_counts: {
        present: Object.values(fieldStatus).filter(Boolean).length,
        missing: Object.values(fieldStatus).filter(value => !value).length,
        total: EVIDENCE_FIELDS.length
      },
      critical_comparability_complete: allFields(fieldStatus, CRITICAL_COMPARABILITY),
      critical_execution_complete: allFields(fieldStatus, CRITICAL_EXECUTION),
      critical_governance_complete: allFields(fieldStatus, CRITICAL_GOVERNANCE),
      bounded_context_complete: allFields(fieldStatus, BOUNDED_CONTEXT),
      comparison,
      operational_human_override_supported: study.decision?.human_override_triggered === true
        && meaningful(study.decision?.receipt_id)
        && text(study.decision?.implementation_state).includes('blocked'),
      binding_public_authority_supported: study.public_authority?.binding === true
        && study.public_authority?.objective_control === true
        && study.public_authority?.appeal_and_remedy === true,
      human_to_model_feedback_update_supported: text(study.feedback_reuse?.state).startsWith('model_updated')
        && meaningful(study.feedback_reuse?.version_update_id),
      source_snapshot_sha256: sha256(study),
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
      refused_promotions: [
        'fixture_as_named_real_study',
        'one_study_as_universal_validity',
        'human_validation_as_public_authorization',
        'participant_rights_as_objective_consent',
        'historical_validation_as_successor_validation'
      ]
    };
  });

  const stateCounts = countBy(studies, 'admission_state');
  const fieldTrueCounts = Object.fromEntries(EVIDENCE_FIELDS.map(fieldId => [
    fieldId,
    studies.filter(study => study.field_status[fieldId] === true).length
  ]));
  const comparisonCompleteCount = studies.filter(study => study.critical_comparability_complete).length;
  const completePositiveAdmissionCount = studies.filter(study => study.admission_state === 'complete_matched_execution').length;
  const negativeValidationCount = studies.filter(study => study.admission_state === 'contradicted_or_failed_reconciliation').length;
  const overrideCount = studies.filter(study => study.operational_human_override_supported).length;
  const publicAuthorityCount = studies.filter(study => study.binding_public_authority_supported).length;
  const feedbackUpdateCount = studies.filter(study => study.human_to_model_feedback_update_supported).length;

  return {
    schema_version: MATCHED_STUDY_BUILD_SCHEMA_VERSION,
    contract_id: fixture.contract_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    substitution_issue: fixture.substitution_issue,
    captured_at: fixture.captured_at,
    status: 'matched_study_admission_laboratory_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none_laboratory_only',
    publication_status: fixture.publication_status,
    admission_states: fixture.admission_states,
    evidence_fields: fixture.evidence_fields,
    study_count: studies.length,
    state_counts: stateCounts,
    field_true_counts: fieldTrueCounts,
    comparison_complete_count: comparisonCompleteCount,
    complete_positive_admission_count: completePositiveAdmissionCount,
    negative_validation_or_reconciliation_count: negativeValidationCount,
    operational_human_override_receipt_count: overrideCount,
    binding_public_authority_count: publicAuthorityCount,
    human_to_model_feedback_update_count: feedbackUpdateCount,
    studies,
    required_refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validateMatchedStudyBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== MATCHED_STUDY_BUILD_SCHEMA_VERSION) errors.push('matched-study build schema mismatch');
  if (compiled?.status !== 'matched_study_admission_laboratory_qualified') errors.push('compiled matched-study status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled matched-study graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none_laboratory_only') errors.push('compiled real-world evidence state must remain none_laboratory_only');
  if (compiled?.study_count !== 13) errors.push('compiled study_count must remain 13');
  if (!sameMembers(array(compiled?.studies).map(study => study.study_id), EXPECTED_STUDY_IDS)) errors.push('compiled studies are incomplete');
  for (const [state, count] of Object.entries(EXPECTED_STATE_COUNTS)) {
    if (compiled?.state_counts?.[state] !== count) errors.push(`compiled state count mismatch for ${state}`);
  }
  if (compiled?.comparison_complete_count !== 5) errors.push('compiled comparison_complete_count must remain 5');
  if (compiled?.complete_positive_admission_count !== 1) errors.push('compiled complete_positive_admission_count must remain 1');
  if (compiled?.negative_validation_or_reconciliation_count !== 2) errors.push('compiled negative_validation_or_reconciliation_count must remain 2');
  if (compiled?.operational_human_override_receipt_count !== 1) errors.push('compiled operational_human_override_receipt_count must remain 1');
  if (compiled?.binding_public_authority_count !== 0) errors.push('compiled binding_public_authority_count must remain 0');
  if (compiled?.human_to_model_feedback_update_count !== 0) errors.push('compiled human_to_model_feedback_update_count must remain 0');
  if (!sameMembers(Object.keys(object(compiled?.field_true_counts)), EVIDENCE_FIELDS)) errors.push('compiled field true counts are incomplete');

  for (const study of array(compiled?.studies)) {
    if (!ADMISSION_STATES.includes(study?.admission_state)) errors.push(`study ${study?.study_id} has invalid admission state`);
    if (!sameMembers(Object.keys(object(study?.field_status)), EVIDENCE_FIELDS)) errors.push(`study ${study?.study_id} field matrix is incomplete`);
    if (study?.field_counts?.total !== EVIDENCE_FIELDS.length) errors.push(`study ${study?.study_id} field total mismatch`);
    if (study?.field_counts?.present + study?.field_counts?.missing !== EVIDENCE_FIELDS.length) errors.push(`study ${study?.study_id} field counts do not reconcile`);
    if (!/^[0-9a-f]{64}$/.test(text(study?.source_snapshot_sha256))) errors.push(`study ${study?.study_id} source snapshot hash is invalid`);
    errors.push(...validateMatchedStudyChain(study?.custody_chain));
    const head = array(study?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (study?.custody_chain_head_sha256 !== head) errors.push(`study ${study?.study_id} custody head mismatch`);
    if (study?.binding_public_authority_supported !== false) errors.push(`study ${study?.study_id} must not support binding public authority`);
    if (study?.human_to_model_feedback_update_supported !== false) errors.push(`study ${study?.study_id} must not support a human-to-model update`);
  }

  const complete = array(compiled?.studies).find(study => study.study_id === 'MS-01-COMPLETE-POSITIVE');
  if (complete?.admission_state !== 'complete_matched_execution') errors.push('MS-01 must remain the complete positive fixture');
  if (!(complete?.comparison?.discrepancy < complete?.comparison?.threshold)) errors.push('MS-01 must remain within threshold');
  const humanBlock = array(compiled?.studies).find(study => study.study_id === 'MS-07-HUMAN-BLOCK');
  if (humanBlock?.validation_outcome !== 'synthetic_contradicted_human_evidence_blocked_recommendation') errors.push('MS-07 must preserve the human-block negative outcome');
  if (humanBlock?.operational_human_override_supported !== true) errors.push('MS-07 must preserve one operational human override receipt');
  const stale = array(compiled?.studies).find(study => study.study_id === 'MS-08-STALE-LINEAGE');
  if (stale?.validation_outcome !== 'validation_lineage_not_current') errors.push('MS-08 must preserve stale-lineage refusal');
  const noRule = array(compiled?.studies).find(study => study.study_id === 'MS-13-NO-PREDECLARED-RULE');
  if (noRule?.validation_outcome !== 'material_discrepancy_without_predeclared_reconciliation') errors.push('MS-13 must preserve failed reconciliation');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled matched-study caveat is required');
  return errors;
}

function percentage(value) {
  if (value === null || value === undefined) return 'unavailable';
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderMatchedStudyMarkdown(compiled) {
  const lines = [
    '# Matched synthetic-human study admission laboratory v1',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Studies:** ${compiled.study_count}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Admission state counts',
    ''
  ];
  for (const state of ADMISSION_STATES) lines.push(`- ${state}: ${compiled.state_counts[state] ?? 0}`);
  lines.push(
    '',
    '## Aggregate frontiers',
    '',
    `- Comparability-complete packets: ${compiled.comparison_complete_count}`,
    `- Complete positive admissions: ${compiled.complete_positive_admission_count}`,
    `- Negative validation or reconciliation packets: ${compiled.negative_validation_or_reconciliation_count}`,
    `- Operational human override receipts: ${compiled.operational_human_override_receipt_count}`,
    `- Binding public-authority packets: ${compiled.binding_public_authority_count}`,
    `- Human-to-model feedback updates: ${compiled.human_to_model_feedback_update_count}`,
    '',
    '## Study fixtures',
    ''
  );
  for (const study of compiled.studies) {
    lines.push(`### ${study.study_id}: ${study.label}`, '');
    lines.push(`- Source state: ${study.source_state}`);
    lines.push(`- Admission state: ${study.admission_state}`);
    lines.push(`- Validation outcome: ${study.validation_outcome}`);
    lines.push(`- Fields present: ${study.field_counts.present}/${study.field_counts.total}`);
    lines.push(`- Critical comparability complete: ${study.critical_comparability_complete}`);
    lines.push(`- Critical execution complete: ${study.critical_execution_complete}`);
    lines.push(`- Critical governance complete: ${study.critical_governance_complete}`);
    lines.push(`- Total-variation discrepancy: ${percentage(study.comparison.discrepancy)}`);
    lines.push(`- Threshold: ${percentage(study.comparison.threshold)}`);
    lines.push(`- Operational human override supported: ${study.operational_human_override_supported}`);
    lines.push(`- Binding public authority supported: ${study.binding_public_authority_supported}`);
    lines.push(`- Custody head: ${study.custody_chain_head_sha256}`, '');
  }
  lines.push('## Required refusal rules', '');
  for (const rule of compiled.required_refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
