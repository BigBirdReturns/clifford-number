import { createHash } from 'node:crypto';

export const STANDING_MATRIX_SCHEMA_VERSION = 'preference-standing-matrix@1';
export const STANDING_MATRIX_BUILD_SCHEMA_VERSION = 'preference-standing-matrix-build@1';

const REQUIRED_CASE_IDS = [
  'newsuk-nucleus-human-companion-v1',
  'times-exploraition-public-admission-v1',
  'twineo-originalvoices-representation-custody-v1',
  'yougov-parallax-hybrid-architecture-v1'
];
const REQUIRED_AXIS_IDS = [
  'decision_authority',
  'human_validation',
  'representation_fidelity',
  'succession_and_lineage',
  'value_and_collective_power'
];
const REQUIRED_DIMENSIONS = [
  'synthetic_or_twin_surface_confirmed',
  'individual_real_person_mapping_confirmed',
  'participant_training_update_and_review_confirmed',
  'participant_correction_deletion_withdrawal_and_portability_confirmed',
  'task_specific_pre_execution_approval_confirmed',
  'parallel_direct_human_research_confirmed',
  'participant_owner_fidelity_review_loop_confirmed',
  'same_represented_person_verification_route_confirmed',
  'fresh_or_targeted_finding_validation_route_confirmed',
  'executed_matched_study_confirmed',
  'response_distributions_and_uncertainty_confirmed',
  'discrepancy_reconciliation_confirmed',
  'operational_human_override_consequence_confirmed',
  'binding_affected_public_objective_control_confirmed',
  'participant_reward_path_confirmed',
  'collective_bargaining_or_group_ratification_confirmed',
  'deployment_specific_system_and_validation_lineage_confirmed'
];
const EXPECTED_TRUE_COUNTS = {
  synthetic_or_twin_surface_confirmed: 4,
  individual_real_person_mapping_confirmed: 2,
  participant_training_update_and_review_confirmed: 1,
  participant_correction_deletion_withdrawal_and_portability_confirmed: 1,
  task_specific_pre_execution_approval_confirmed: 0,
  parallel_direct_human_research_confirmed: 1,
  participant_owner_fidelity_review_loop_confirmed: 1,
  same_represented_person_verification_route_confirmed: 1,
  fresh_or_targeted_finding_validation_route_confirmed: 1,
  executed_matched_study_confirmed: 0,
  response_distributions_and_uncertainty_confirmed: 0,
  discrepancy_reconciliation_confirmed: 0,
  operational_human_override_consequence_confirmed: 0,
  binding_affected_public_objective_control_confirmed: 0,
  participant_reward_path_confirmed: 1,
  collective_bargaining_or_group_ratification_confirmed: 0,
  deployment_specific_system_and_validation_lineage_confirmed: 0
};

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

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function falseDimensions() {
  return Object.fromEntries(REQUIRED_DIMENSIONS.map(dimension => [dimension, false]));
}

function axisDimensionMap(axes) {
  return Object.fromEntries(array(axes).map(axis => [axis.axis_id, axis.dimensions]));
}

function countTrueByAxis(dimensions, axes) {
  return Object.fromEntries(array(axes).map(axis => [
    axis.axis_id,
    axis.dimensions.filter(dimension => dimensions[dimension] === true).length
  ]));
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validateStandingMatrixManifest(manifest) {
  const errors = [];
  const sourceCases = array(manifest?.source_cases);
  const axes = array(manifest?.axes);
  const expected = object(manifest?.expected_matrix_counts);
  const boundaries = object(manifest?.boundaries);

  if (manifest?.schema_version !== STANDING_MATRIX_SCHEMA_VERSION) errors.push('standing-matrix schema mismatch');
  if (!text(manifest?.matrix_id)) errors.push('matrix_id is required');
  if (manifest?.status !== 'bounded_orthogonal_control_surface') errors.push('standing-matrix status mismatch');
  if (manifest?.classification !== 'orthogonal_representation_validation_and_authority_matrix') errors.push('standing-matrix classification mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('standing-matrix graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);

  if (!sameMembers(sourceCases.map(source => source?.case_id), REQUIRED_CASE_IDS)) errors.push('standing matrix must contain exactly the four required source cases');
  for (const source of sourceCases) {
    const id = text(source?.case_id) || '(missing case ID)';
    for (const key of ['source_path', 'compiler', 'expected_compiled_status']) {
      if (!text(source?.[key])) errors.push(`source case ${id} requires ${key}`);
    }
  }

  if (!sameMembers(axes.map(axis => axis?.axis_id), REQUIRED_AXIS_IDS)) errors.push('standing matrix axes are incomplete');
  const allAxisDimensions = axes.flatMap(axis => array(axis?.dimensions));
  if (!sameMembers(allAxisDimensions, REQUIRED_DIMENSIONS)) errors.push('standing matrix dimensions are incomplete');
  if (unique(allAxisDimensions).length !== allAxisDimensions.length) errors.push('standing matrix dimensions must belong to exactly one axis');
  for (const axis of axes) {
    if (!text(axis?.question) || !array(axis?.dimensions).length) errors.push(`axis ${axis?.axis_id} requires a question and dimensions`);
  }

  if (expected.source_case_count !== 4) errors.push('expected source-case count must remain 4');
  if (!sameMembers(Object.keys(object(expected.dimension_true_counts)), REQUIRED_DIMENSIONS)) errors.push('expected dimension count keys are incomplete');
  for (const [dimension, count] of Object.entries(EXPECTED_TRUE_COUNTS)) {
    if (expected?.dimension_true_counts?.[dimension] !== count) errors.push(`expected true count mismatch for ${dimension}`);
  }
  for (const key of [
    'cases_with_all_representation_validation_and_authority_axes_positive',
    'cases_with_complete_matched_execution',
    'cases_with_operational_human_override',
    'cases_with_binding_public_authority'
  ]) {
    if (expected[key] !== 0) errors.push(`expected_matrix_counts.${key} must remain 0`);
  }

  for (const key of [
    'matrix_is_product_ranking',
    'matrix_is_maturity_scale',
    'matrix_is_market_denominator',
    'representation_fidelity_equals_finding_validation',
    'finding_validation_equals_decision_authority',
    'individual_representation_custody_equals_collective_power',
    'participant_reward_equals_fair_value_allocation',
    'parallel_human_research_equals_integrated_validation',
    'integrated_validation_route_equals_executed_matched_study',
    'human_evidence_equals_public_authorization',
    'matrix_creates_real_world_causal_conclusion',
    'matrix_creates_graph_effect'
  ]) requireFalse(boundaries[key], `boundaries.${key}`, errors);

  if (unique(manifest?.required_next_evidence).length < 10) errors.push('standing-matrix next-evidence ledger is incomplete');
  if (unique(manifest?.prohibited_inferences).length < 8) errors.push('standing-matrix prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('standing-matrix interpretation contract is incomplete');
  }
  return errors;
}

function adaptTimes(compiled, axes) {
  const dimensions = falseDimensions();
  dimensions.synthetic_or_twin_surface_confirmed = compiled?.admission_verdict?.deployment_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'Times ExplorAItion bounded deployment',
    institution: compiled?.deployment?.publisher ?? 'News UK / Times Media',
    representation_mode: 'modelled_population_individual_mapping_not_publicly_established',
    validation_mode: 'no_public_direct_human_validation_route_inside_the_named_workflow',
    authority_mode: 'institutional_decision_authority_public_authorization_not_established',
    dimensions,
    axis_positive_counts: countTrueByAxis(dimensions, axes),
    bounded_support: [
      'synthetic audience deployment and named workflow influence confirmed',
      'screening acceleration supplementation and one vendor-attributed bounded compression preserved'
    ],
    unresolved: [
      'individual real-person mapping and participant custody',
      'parallel or integrated human route inside one decision',
      'matched execution discrepancy handling and override',
      'participant value return collective bargaining and public authority',
      'deployment-specific system and validation lineage'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled)
  };
}

function adaptNewsUkCompanion(compiled, axes) {
  const dimensions = falseDimensions();
  dimensions.synthetic_or_twin_surface_confirmed = true;
  dimensions.parallel_direct_human_research_confirmed = compiled?.classification_verdict?.parallel_human_research_infrastructure_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'News UK Nucleus Panel human-companion control',
    institution: compiled.institution,
    representation_mode: 'synthetic_surface_plus_direct_human_panel_no_individual_twin_custody_claim',
    validation_mode: 'parallel_direct_human_research_matched_workflow_not_publicly_established',
    authority_mode: 'human_research_advisory_binding_authority_not_established',
    dimensions,
    axis_positive_counts: countTrueByAxis(dimensions, axes),
    bounded_support: [
      'parallel direct face-to-face reader research confirmed',
      'publisher states that the human surface complements AI-driven insight',
      'organization-wide full-replacement counterevidence preserved'
    ],
    unresolved: [
      'integrated routing matched instruments and paired execution',
      'discrepancy reconciliation and human override',
      'human-to-model feedback reuse',
      'participant representation custody and value return',
      'binding affected-public authority and system lineage'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled),
    source_custody_head_sha256: compiled.custody_chain_head_sha256
  };
}

function adaptYouGov(compiled, axes) {
  const dimensions = falseDimensions();
  dimensions.synthetic_or_twin_surface_confirmed = compiled?.classification_verdict?.integrated_hybrid_product_architecture_confirmed === true;
  dimensions.individual_real_person_mapping_confirmed = true;
  dimensions.same_represented_person_verification_route_confirmed = compiled?.bounded_observations?.same_represented_person_validation_possible === true;
  dimensions.fresh_or_targeted_finding_validation_route_confirmed = compiled?.bounded_observations?.fresh_sample_validation_possible === true
    && compiled?.bounded_observations?.targeted_sample_validation_possible === true;
  return {
    case_id: compiled.case_id,
    case_label: 'YouGov Parallax hybrid-architecture control',
    institution: compiled?.product?.provider,
    representation_mode: 'individually_mapped_real_person_twins_participant_custody_not_publicly_established',
    validation_mode: 'integrated_same_person_verification_and_fresh_or_targeted_finding_validation_capability',
    authority_mode: 'finding_validation_available_human_override_and_public_authority_not_established',
    dimensions,
    axis_positive_counts: countTrueByAxis(dimensions, axes),
    bounded_support: [
      'individually mapped AI twins grounded in real panel members',
      'same represented-person fresh-population and targeted validation options confirmed',
      'method verification and finding validation explicitly separated'
    ],
    unresolved: [
      'participant training correction deletion exit and reward rights',
      'one executed matched study and question-level distributions',
      'discrepancy reconciliation and operational override',
      'collective bargaining public authority and complete system lineage'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled),
    source_custody_head_sha256: compiled.custody_chain_head_sha256
  };
}

function adaptTwineo(compiled, axes) {
  const dimensions = falseDimensions();
  dimensions.synthetic_or_twin_surface_confirmed = compiled?.classification_verdict?.individual_representation_grounding_confirmed === true;
  dimensions.individual_real_person_mapping_confirmed = compiled?.classification_verdict?.individual_representation_grounding_confirmed === true;
  dimensions.participant_training_update_and_review_confirmed = compiled?.classification_verdict?.individual_training_update_review_and_correction_rights_confirmed === true;
  dimensions.participant_correction_deletion_withdrawal_and_portability_confirmed = compiled?.classification_verdict?.individual_deletion_withdrawal_objection_and_portability_rights_confirmed === true;
  dimensions.participant_owner_fidelity_review_loop_confirmed = compiled?.operational_rights?.participant_reviews_and_rates_twin_answers_confirmed === true;
  dimensions.participant_reward_path_confirmed = compiled?.classification_verdict?.participant_reward_path_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'Twineo and OriginalVoices participant representation-custody control',
    institution: compiled?.ecosystem?.operator_public_name,
    representation_mode: 'participant_grounded_trainable_reviewable_correctable_deletable_and_portable_twin',
    validation_mode: 'participant_owner_fidelity_review_loop_finding_specific_live_validation_not_publicly_established',
    authority_mode: 'individual_custody_confirmed_task_specific_and_collective_authority_not_established',
    dimensions,
    axis_positive_counts: countTrueByAxis(dimensions, axes),
    bounded_support: [
      'individual grounding training updating review correction deletion withdrawal and portability confirmed',
      'participant reward path confirmed',
      'participant owner review loop confirmed',
      'anonymised client outputs and platform-retained powers preserved'
    ],
    unresolved: [
      'task-specific pre-execution approval',
      'fresh or targeted live finding-validation route',
      'executed matched study and discrepancy reconciliation',
      'operational override collective bargaining public authority and complete system lineage'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled),
    source_custody_head_sha256: compiled.custody_chain_head_sha256
  };
}

function adaptSource(compiled, axes) {
  if (compiled?.case_id === 'times-exploraition-public-admission-v1') return adaptTimes(compiled, axes);
  if (compiled?.case_id === 'newsuk-nucleus-human-companion-v1') return adaptNewsUkCompanion(compiled, axes);
  if (compiled?.case_id === 'yougov-parallax-hybrid-architecture-v1') return adaptYouGov(compiled, axes);
  if (compiled?.case_id === 'twineo-originalvoices-representation-custody-v1') return adaptTwineo(compiled, axes);
  throw new Error(`unsupported standing-matrix source case: ${compiled?.case_id}`);
}

function buildStandingMatrixChain(manifest, rows, dimensionTrueCounts) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${manifest.matrix_id}:manifest`,
    event_type: 'standing_matrix_manifest_sealed',
    evidence_class: 'comparative_control_contract',
    authority: 'standing_matrix_author',
    source_event_ids: [],
    payload: {
      matrix_id: manifest.matrix_id,
      axes: manifest.axes,
      boundaries: manifest.boundaries
    }
  });
  for (const row of rows) {
    push({
      event_id: `${manifest.matrix_id}:${row.case_id}`,
      event_type: 'standing_matrix_source_classified',
      evidence_class: 'compiled_real_case_control',
      authority: 'standing_matrix_compiler',
      source_event_ids: [`${manifest.matrix_id}:manifest`],
      payload: row
    });
  }
  push({
    event_id: `${manifest.matrix_id}:aggregate`,
    event_type: 'standing_matrix_aggregate_resolved',
    evidence_class: 'deterministic_comparative_aggregate',
    authority: 'standing_matrix_compiler',
    source_event_ids: rows.map(row => `${manifest.matrix_id}:${row.case_id}`),
    payload: {
      dimension_true_counts: dimensionTrueCounts,
      expected_zero_frontiers: {
        executed_matched_study_confirmed: 0,
        operational_human_override_consequence_confirmed: 0,
        binding_affected_public_objective_control_confirmed: 0,
        collective_bargaining_or_group_ratification_confirmed: 0,
        deployment_specific_system_and_validation_lineage_confirmed: 0
      }
    }
  });
  push({
    event_id: `${manifest.matrix_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'standing_matrix_analyst',
    source_event_ids: [`${manifest.matrix_id}:aggregate`],
    payload: {
      allowed_interpretation: 'representation fidelity finding validation and decision authority are orthogonal human-control mechanisms across current public cases',
      refused_promotions: [
        'positive_dimension_count_as_product_ranking',
        'participant_custody_as_finding_validation',
        'finding_validation_as_decision_authority',
        'reward_path_as_fair_value_allocation',
        'four_cases_as_market_prevalence',
        'unresolved_matrix_as_causal_or_intent_finding'
      ]
    }
  });
  return events;
}

export function validateStandingMatrixChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('standing-matrix event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate standing-matrix event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`standing-matrix event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`standing-matrix event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`standing-matrix event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compileStandingMatrix(manifest, compiledSources) {
  const errors = validateStandingMatrixManifest(manifest);
  if (errors.length) throw new Error(`invalid standing-matrix manifest:\n- ${errors.join('\n- ')}`);

  const axes = manifest.axes;
  const rows = manifest.source_cases.map(source => {
    const compiled = compiledSources[source.case_id];
    if (!compiled) throw new Error(`missing compiled standing-matrix source ${source.case_id}`);
    if (compiled.status !== source.expected_compiled_status) throw new Error(`compiled status mismatch for ${source.case_id}`);
    return adaptSource(compiled, axes);
  }).sort((left, right) => left.case_id.localeCompare(right.case_id));

  const dimensionTrueCounts = Object.fromEntries(REQUIRED_DIMENSIONS.map(dimension => [
    dimension,
    rows.filter(row => row.dimensions[dimension] === true).length
  ]));
  const axisMap = axisDimensionMap(axes);
  const casesWithAllThreeCoreAxes = rows.filter(row => (
    axisMap.representation_fidelity.some(dimension => row.dimensions[dimension] === true)
    && axisMap.human_validation.some(dimension => row.dimensions[dimension] === true)
    && axisMap.decision_authority.some(dimension => row.dimensions[dimension] === true)
  )).length;
  const chain = buildStandingMatrixChain(manifest, rows, dimensionTrueCounts);

  return {
    schema_version: STANDING_MATRIX_BUILD_SCHEMA_VERSION,
    matrix_id: manifest.matrix_id,
    issue: manifest.issue,
    parent_program_issue: manifest.parent_program_issue,
    substitution_issue: manifest.substitution_issue,
    captured_at: manifest.captured_at,
    status: 'standing_matrix_compiled_four_cases_no_complete_authority_chain',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_orthogonal_comparative_control_surface',
    source_case_count: rows.length,
    axes,
    dimensions: REQUIRED_DIMENSIONS,
    rows,
    dimension_true_counts: dimensionTrueCounts,
    cases_with_all_representation_validation_and_authority_axes_positive: casesWithAllThreeCoreAxes,
    cases_with_complete_matched_execution: dimensionTrueCounts.executed_matched_study_confirmed,
    cases_with_operational_human_override: dimensionTrueCounts.operational_human_override_consequence_confirmed,
    cases_with_binding_public_authority: dimensionTrueCounts.binding_affected_public_objective_control_confirmed,
    boundaries: manifest.boundaries,
    required_next_evidence: manifest.required_next_evidence,
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: manifest.prohibited_inferences,
    interpretation_contract: manifest.interpretation_contract
  };
}

export function validateStandingMatrixBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== STANDING_MATRIX_BUILD_SCHEMA_VERSION) errors.push('standing-matrix build schema mismatch');
  if (compiled?.status !== 'standing_matrix_compiled_four_cases_no_complete_authority_chain') errors.push('compiled standing-matrix status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled standing-matrix graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_orthogonal_comparative_control_surface') errors.push('compiled standing-matrix evidence state mismatch');
  if (compiled?.source_case_count !== 4) errors.push('compiled standing matrix must preserve four source cases');
  if (!sameMembers(array(compiled?.rows).map(row => row.case_id), REQUIRED_CASE_IDS)) errors.push('compiled standing-matrix source cases are incomplete');
  if (!sameMembers(compiled?.dimensions, REQUIRED_DIMENSIONS)) errors.push('compiled standing-matrix dimensions are incomplete');
  for (const [dimension, count] of Object.entries(EXPECTED_TRUE_COUNTS)) {
    if (compiled?.dimension_true_counts?.[dimension] !== count) errors.push(`compiled true count mismatch for ${dimension}`);
  }
  if (compiled?.cases_with_all_representation_validation_and_authority_axes_positive !== 0) errors.push('compiled matrix must preserve zero cases spanning all three core axes');
  if (compiled?.cases_with_complete_matched_execution !== 0) errors.push('compiled matrix must preserve zero complete matched executions');
  if (compiled?.cases_with_operational_human_override !== 0) errors.push('compiled matrix must preserve zero operational human overrides');
  if (compiled?.cases_with_binding_public_authority !== 0) errors.push('compiled matrix must preserve zero binding public-authority cases');

  for (const row of array(compiled?.rows)) {
    if (!sameMembers(Object.keys(object(row?.dimensions)), REQUIRED_DIMENSIONS)) errors.push(`row ${row?.case_id} dimensions are incomplete`);
    if (!sameMembers(Object.keys(object(row?.axis_positive_counts)), REQUIRED_AXIS_IDS)) errors.push(`row ${row?.case_id} axis counts are incomplete`);
    if (!text(row?.representation_mode) || !text(row?.validation_mode) || !text(row?.authority_mode)) errors.push(`row ${row?.case_id} mode classifications are incomplete`);
    if (!array(row?.bounded_support).length || !array(row?.unresolved).length) errors.push(`row ${row?.case_id} support or unresolved ledger is empty`);
    if (!/^[0-9a-f]{64}$/.test(text(row?.source_snapshot_sha256))) errors.push(`row ${row?.case_id} source snapshot hash is invalid`);
  }
  errors.push(...validateStandingMatrixChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled standing-matrix custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled standing-matrix caveat is required');
  return errors;
}

export function renderStandingMatrixMarkdown(compiled) {
  const lines = [
    '# Preference standing matrix v1',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Source cases:** ${compiled.source_case_count}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Axes',
    ''
  ];
  for (const axis of compiled.axes) {
    lines.push(`### ${axis.axis_id}`, '');
    lines.push(`- Question: ${axis.question}`);
    for (const dimension of axis.dimensions) lines.push(`- Dimension: ${dimension}`);
    lines.push('');
  }
  lines.push('## Case rows', '');
  for (const row of compiled.rows) {
    lines.push(`### ${row.case_label}`, '');
    lines.push(`- Case ID: ${row.case_id}`);
    lines.push(`- Institution: ${row.institution}`);
    lines.push(`- Representation mode: ${row.representation_mode}`);
    lines.push(`- Validation mode: ${row.validation_mode}`);
    lines.push(`- Authority mode: ${row.authority_mode}`);
    for (const dimension of compiled.dimensions) lines.push(`- ${dimension}: ${row.dimensions[dimension]}`);
    for (const item of row.bounded_support) lines.push(`- Supported: ${item}`);
    for (const item of row.unresolved) lines.push(`- Unresolved: ${item}`);
    lines.push('');
  }
  lines.push('## Aggregate true counts', '');
  for (const dimension of compiled.dimensions) lines.push(`- ${dimension}: ${compiled.dimension_true_counts[dimension]}`);
  lines.push(
    '',
    '## Current zero frontiers',
    '',
    `- Cases spanning representation, validation, and authority: ${compiled.cases_with_all_representation_validation_and_authority_axes_positive}`,
    `- Complete matched executions: ${compiled.cases_with_complete_matched_execution}`,
    `- Operational human overrides: ${compiled.cases_with_operational_human_override}`,
    `- Binding public-authority cases: ${compiled.cases_with_binding_public_authority}`,
    '',
    '## Required next evidence',
    ''
  );
  for (const item of compiled.required_next_evidence) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
