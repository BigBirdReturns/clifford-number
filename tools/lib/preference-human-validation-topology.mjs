import { createHash } from 'node:crypto';

export const HUMAN_VALIDATION_TOPOLOGY_SCHEMA_VERSION = 'preference-human-validation-topology@1';
export const HUMAN_VALIDATION_TOPOLOGY_BUILD_SCHEMA_VERSION = 'preference-human-validation-topology-build@1';

const STATE_ORDER = ['HV-00', 'HV-01', 'HV-02', 'HV-03', 'HV-04', 'HV-05'];
const REQUIRED_CASE_IDS = [
  'newsuk-nucleus-human-companion-v1',
  'times-exploraition-public-admission-v1',
  'yougov-parallax-hybrid-architecture-v1'
];
const REQUIRED_DIMENSIONS = [
  'synthetic_surface_confirmed',
  'named_direct_human_surface_confirmed',
  'integrated_validation_route_confirmed',
  'matched_instruments_publicly_recovered',
  'executed_paired_study_publicly_recovered',
  'response_distributions_and_uncertainty_publicly_recovered',
  'disagreement_reconciliation_publicly_recovered',
  'human_override_consequence_publicly_recovered',
  'human_to_model_feedback_reuse_publicly_recovered',
  'subgroup_outcomes_and_burden_publicly_recovered',
  'binding_affected_public_authority_publicly_recovered',
  'deployment_specific_system_and_validation_lineage_publicly_recovered'
];

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

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validateHumanValidationTopologyManifest(manifest) {
  const errors = [];
  const sourceCases = array(manifest?.source_cases);
  const states = array(manifest?.evidence_states);
  const expected = object(manifest?.expected_topology);
  const boundaries = object(manifest?.boundaries);

  if (manifest?.schema_version !== HUMAN_VALIDATION_TOPOLOGY_SCHEMA_VERSION) errors.push('human-validation topology schema mismatch');
  if (!text(manifest?.topology_id)) errors.push('topology_id is required');
  if (manifest?.status !== 'bounded_comparative_control_surface') errors.push('topology status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('topology graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);

  if (!sameMembers(sourceCases.map(item => item?.case_id), REQUIRED_CASE_IDS)) errors.push('topology must contain exactly the three required source cases');
  for (const source of sourceCases) {
    const caseId = text(source?.case_id) || '(missing case ID)';
    for (const key of ['source_path', 'compiler', 'expected_compiled_status', 'expected_highest_public_evidence_state']) {
      if (!text(source?.[key])) errors.push(`source case ${caseId} requires ${key}`);
    }
    if (!STATE_ORDER.includes(source?.expected_highest_public_evidence_state)) errors.push(`source case ${caseId} has invalid expected highest state`);
  }

  if (!sameMembers(states.map(state => state?.state_id), STATE_ORDER)) errors.push('topology evidence states must contain exactly HV-00 through HV-05');
  for (const state of states) {
    if (!text(state?.name) || !text(state?.required_state) || !text(state?.refused_inference)) errors.push(`evidence state ${state?.state_id} is incomplete`);
  }
  if (!sameMembers(manifest?.matrix_dimensions, REQUIRED_DIMENSIONS)) errors.push('topology matrix dimensions are incomplete');

  if (expected.source_case_count !== 3) errors.push('expected source-case count must remain 3');
  if (expected.current_public_frontier !== 'HV-03') errors.push('current public frontier must remain HV-03');
  for (const stateId of STATE_ORDER) {
    if (!Number.isInteger(expected?.highest_state_counts?.[stateId])) errors.push(`expected highest-state count missing for ${stateId}`);
    if (!Number.isInteger(expected?.cumulative_state_coverage_counts?.[stateId])) errors.push(`expected cumulative-state count missing for ${stateId}`);
  }
  for (const key of ['complete_executed_matched_study_count', 'operational_human_override_count', 'binding_affected_public_authority_count']) {
    if (expected[key] !== 0) errors.push(`expected_topology.${key} must remain 0`);
  }

  for (const key of [
    'topology_is_product_quality_ranking',
    'higher_state_is_universally_better',
    'parallel_human_surface_is_matched_validation',
    'integrated_architecture_is_executed_study',
    'executed_human_validation_is_public_authority',
    'three_cases_are_market_prevalence_denominator',
    'topology_creates_real_world_causal_conclusion',
    'topology_creates_graph_effect'
  ]) requireFalse(boundaries[key], `boundaries.${key}`, errors);

  if (unique(manifest?.required_next_evidence).length < 10) errors.push('topology next-evidence ledger is incomplete');
  if (unique(manifest?.prohibited_inferences).length < 6) errors.push('topology prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('topology interpretation contract is incomplete');
  }
  return errors;
}

function falseDimensions() {
  return Object.fromEntries(REQUIRED_DIMENSIONS.map(dimension => [dimension, false]));
}

function adaptTimes(compiled) {
  const dimensions = falseDimensions();
  dimensions.synthetic_surface_confirmed = compiled?.admission_verdict?.deployment_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'Times ExplorAItion bounded deployment admission',
    institution: compiled?.deployment?.publisher ?? 'News UK / Times Media',
    surface_type: 'deployed_synthetic_audience_workflow',
    highest_public_evidence_state: 'HV-00',
    dimensions,
    bounded_support: [
      'reciprocal publisher and vendor deployment confirmation',
      'screening and acceleration supported',
      'supplementation supported',
      'one vendor-attributed bounded qualitative-fieldwork compression'
    ],
    unresolved: [
      'named direct-human companion route inside the same decision',
      'integrated validation route',
      'executed paired study',
      'human override consequence',
      'binding affected-public authority',
      'current deployment-specific validation lineage'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled)
  };
}

function adaptNewsUkCompanion(compiled) {
  const dimensions = falseDimensions();
  dimensions.synthetic_surface_confirmed = true;
  dimensions.named_direct_human_surface_confirmed = compiled?.classification_verdict?.parallel_human_research_infrastructure_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'News UK Nucleus Panel human-companion negative control',
    institution: compiled.institution,
    surface_type: 'parallel_synthetic_and_direct_human_surfaces',
    highest_public_evidence_state: 'HV-01',
    dimensions,
    bounded_support: [
      'Times ExplorAItion and Nucleus Panel chronology preserved',
      'direct face-to-face reader research confirmed',
      'publisher complement language confirmed',
      'organization-wide full-replacement counterevidence present'
    ],
    unresolved: [
      'same-decision hybrid workflow',
      'matched validation protocol',
      'method routing and reconciliation',
      'human override consequence',
      'human-to-model feedback reuse',
      'binding affected-public authority'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled),
    source_custody_head_sha256: compiled.custody_chain_head_sha256
  };
}

function adaptYouGov(compiled) {
  const dimensions = falseDimensions();
  dimensions.synthetic_surface_confirmed = compiled?.classification_verdict?.integrated_hybrid_product_architecture_confirmed === true;
  dimensions.named_direct_human_surface_confirmed = compiled?.classification_verdict?.live_human_validation_capability_confirmed === true;
  dimensions.integrated_validation_route_confirmed = compiled?.classification_verdict?.integrated_hybrid_product_architecture_confirmed === true;
  return {
    case_id: compiled.case_id,
    case_label: 'YouGov Parallax hybrid-architecture positive control',
    institution: compiled?.product?.provider,
    surface_type: 'integrated_synthetic_to_live_human_validation_architecture',
    highest_public_evidence_state: 'HV-02',
    dimensions,
    bounded_support: [
      'AI twin simulation and live-panel validation layers confirmed',
      'validation scope and population are configurable',
      'method verification and finding validation are explicitly separated',
      'public demo is not automatically validated',
      'tracking-study replacement is explicitly refused'
    ],
    unresolved: [
      'one complete executed matched study',
      'question-level response distributions and uncertainty',
      'study-level subgroup errors and burden',
      'disagreement reconciliation and human override',
      'human-to-model feedback reuse',
      'deployment-specific system and validation lineage',
      'binding affected-public authority'
    ],
    source_status: compiled.status,
    source_snapshot_sha256: sha256(compiled),
    source_custody_head_sha256: compiled.custody_chain_head_sha256
  };
}

function adaptSource(compiled) {
  if (compiled?.case_id === 'times-exploraition-public-admission-v1') return adaptTimes(compiled);
  if (compiled?.case_id === 'newsuk-nucleus-human-companion-v1') return adaptNewsUkCompanion(compiled);
  if (compiled?.case_id === 'yougov-parallax-hybrid-architecture-v1') return adaptYouGov(compiled);
  throw new Error(`unsupported human-validation topology source case: ${compiled?.case_id}`);
}

function computeCumulative(rows) {
  return Object.fromEntries(STATE_ORDER.map((stateId, index) => [
    stateId,
    rows.filter(row => STATE_ORDER.indexOf(row.highest_public_evidence_state) >= index).length
  ]));
}

function buildTopologyChain(manifest, rows, highestCounts, cumulativeCounts) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${manifest.topology_id}:manifest`,
    event_type: 'topology_manifest_sealed',
    evidence_class: 'comparative_control_contract',
    authority: 'topology_author',
    source_event_ids: [],
    payload: {
      topology_id: manifest.topology_id,
      evidence_states: manifest.evidence_states,
      matrix_dimensions: manifest.matrix_dimensions,
      boundaries: manifest.boundaries
    }
  });
  for (const row of rows) {
    push({
      event_id: `${manifest.topology_id}:${row.case_id}`,
      event_type: 'source_case_classified',
      evidence_class: 'compiled_real_case_control',
      authority: 'topology_compiler',
      source_event_ids: [`${manifest.topology_id}:manifest`],
      payload: row
    });
  }
  push({
    event_id: `${manifest.topology_id}:aggregate`,
    event_type: 'topology_aggregate_resolved',
    evidence_class: 'deterministic_comparative_aggregate',
    authority: 'topology_compiler',
    source_event_ids: rows.map(row => `${manifest.topology_id}:${row.case_id}`),
    payload: {
      highest_state_counts: highestCounts,
      cumulative_state_coverage_counts: cumulativeCounts,
      current_public_frontier: manifest.expected_topology.current_public_frontier
    }
  });
  push({
    event_id: `${manifest.topology_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'topology_analyst',
    source_event_ids: [`${manifest.topology_id}:aggregate`],
    payload: {
      allowed_interpretation: 'current public cases distinguish deployed synthetic workflow, parallel human infrastructure, and integrated validation architecture',
      refused_promotions: [
        'topology_as_product_ranking',
        'three_cases_as_market_prevalence',
        'parallel_human_surface_as_matched_validation',
        'integrated_architecture_as_executed_study',
        'human_validation_as_public_authority',
        'unresolved_state_as_causal_or_intent_finding'
      ]
    }
  });
  return events;
}

export function validateHumanValidationTopologyChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('topology event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate topology event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`topology event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`topology event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`topology event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compileHumanValidationTopology(manifest, compiledSources) {
  const errors = validateHumanValidationTopologyManifest(manifest);
  if (errors.length) throw new Error(`invalid human-validation topology manifest:\n- ${errors.join('\n- ')}`);

  const rows = manifest.source_cases.map(source => {
    const compiled = compiledSources[source.case_id];
    if (!compiled) throw new Error(`missing compiled topology source ${source.case_id}`);
    if (compiled.status !== source.expected_compiled_status) throw new Error(`compiled status mismatch for ${source.case_id}`);
    const row = adaptSource(compiled);
    if (row.highest_public_evidence_state !== source.expected_highest_public_evidence_state) {
      throw new Error(`highest public evidence state mismatch for ${source.case_id}`);
    }
    return row;
  }).sort((left, right) => left.case_id.localeCompare(right.case_id));

  const highestStateCounts = Object.fromEntries(STATE_ORDER.map(stateId => [
    stateId,
    rows.filter(row => row.highest_public_evidence_state === stateId).length
  ]));
  const cumulativeStateCoverageCounts = computeCumulative(rows);
  const matrixTrueCounts = Object.fromEntries(REQUIRED_DIMENSIONS.map(dimension => [
    dimension,
    rows.filter(row => row.dimensions[dimension] === true).length
  ]));
  const chain = buildTopologyChain(manifest, rows, highestStateCounts, cumulativeStateCoverageCounts);

  return {
    schema_version: HUMAN_VALIDATION_TOPOLOGY_BUILD_SCHEMA_VERSION,
    topology_id: manifest.topology_id,
    issue: manifest.issue,
    parent_program_issue: manifest.parent_program_issue,
    substitution_issue: manifest.substitution_issue,
    captured_at: manifest.captured_at,
    status: 'human_validation_topology_compiled_public_frontier_hv03',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_comparative_control_surface',
    source_case_count: rows.length,
    evidence_states: manifest.evidence_states,
    matrix_dimensions: manifest.matrix_dimensions,
    rows,
    highest_state_counts: highestStateCounts,
    cumulative_state_coverage_counts: cumulativeStateCoverageCounts,
    matrix_true_counts: matrixTrueCounts,
    current_public_frontier: manifest.expected_topology.current_public_frontier,
    complete_executed_matched_study_count: matrixTrueCounts.executed_paired_study_publicly_recovered,
    operational_human_override_count: matrixTrueCounts.human_override_consequence_publicly_recovered,
    binding_affected_public_authority_count: matrixTrueCounts.binding_affected_public_authority_publicly_recovered,
    boundaries: manifest.boundaries,
    required_next_evidence: manifest.required_next_evidence,
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: manifest.prohibited_inferences,
    interpretation_contract: manifest.interpretation_contract
  };
}

export function validateHumanValidationTopologyBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== HUMAN_VALIDATION_TOPOLOGY_BUILD_SCHEMA_VERSION) errors.push('human-validation topology build schema mismatch');
  if (compiled?.status !== 'human_validation_topology_compiled_public_frontier_hv03') errors.push('compiled topology status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled topology graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_comparative_control_surface') errors.push('compiled topology evidence state mismatch');
  if (compiled?.source_case_count !== 3) errors.push('compiled topology must preserve three source cases');
  if (!sameMembers(array(compiled?.rows).map(row => row.case_id), REQUIRED_CASE_IDS)) errors.push('compiled topology source cases are incomplete');
  if (compiled?.current_public_frontier !== 'HV-03') errors.push('compiled public frontier must remain HV-03');

  const expectedHighest = { 'HV-00': 1, 'HV-01': 1, 'HV-02': 1, 'HV-03': 0, 'HV-04': 0, 'HV-05': 0 };
  const expectedCumulative = { 'HV-00': 3, 'HV-01': 2, 'HV-02': 1, 'HV-03': 0, 'HV-04': 0, 'HV-05': 0 };
  for (const stateId of STATE_ORDER) {
    if (compiled?.highest_state_counts?.[stateId] !== expectedHighest[stateId]) errors.push(`compiled highest-state count mismatch for ${stateId}`);
    if (compiled?.cumulative_state_coverage_counts?.[stateId] !== expectedCumulative[stateId]) errors.push(`compiled cumulative-state count mismatch for ${stateId}`);
  }
  if (compiled?.complete_executed_matched_study_count !== 0) errors.push('compiled topology must preserve zero complete executed matched studies');
  if (compiled?.operational_human_override_count !== 0) errors.push('compiled topology must preserve zero operational human overrides');
  if (compiled?.binding_affected_public_authority_count !== 0) errors.push('compiled topology must preserve zero binding affected-public authority cases');
  if (compiled?.matrix_true_counts?.synthetic_surface_confirmed !== 3) errors.push('all three topology rows must confirm a synthetic surface');
  if (compiled?.matrix_true_counts?.named_direct_human_surface_confirmed !== 2) errors.push('exactly two topology rows must confirm a named direct-human surface');
  if (compiled?.matrix_true_counts?.integrated_validation_route_confirmed !== 1) errors.push('exactly one topology row must confirm an integrated validation route');

  for (const row of array(compiled?.rows)) {
    if (!STATE_ORDER.includes(row?.highest_public_evidence_state)) errors.push(`row ${row?.case_id} has invalid highest state`);
    if (!sameMembers(Object.keys(object(row?.dimensions)), REQUIRED_DIMENSIONS)) errors.push(`row ${row?.case_id} matrix dimensions are incomplete`);
    if (!array(row?.bounded_support).length || !array(row?.unresolved).length) errors.push(`row ${row?.case_id} requires support and unresolved ledgers`);
    if (!/^[0-9a-f]{64}$/.test(text(row?.source_snapshot_sha256))) errors.push(`row ${row?.case_id} source snapshot hash is invalid`);
  }
  errors.push(...validateHumanValidationTopologyChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled topology custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled topology caveat is required');
  return errors;
}

function stateLabel(stateId, states) {
  return states.find(state => state.state_id === stateId)?.name ?? stateId;
}

export function renderHumanValidationTopologyMarkdown(compiled) {
  const lines = [
    '# Preference Custody human-validation topology v1',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Source cases:** ${compiled.source_case_count}`,
    '',
    `**Current public frontier:** ${compiled.current_public_frontier}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Evidence states',
    ''
  ];
  for (const state of compiled.evidence_states) {
    lines.push(`### ${state.state_id}: ${state.name}`, '');
    lines.push(`- Required state: ${state.required_state}`);
    lines.push(`- Refusal: ${state.refused_inference}`, '');
  }
  lines.push('## Case rows', '');
  for (const row of compiled.rows) {
    lines.push(`### ${row.case_label}`, '');
    lines.push(`- Case ID: ${row.case_id}`);
    lines.push(`- Institution: ${row.institution}`);
    lines.push(`- Surface: ${row.surface_type}`);
    lines.push(`- Highest public evidence state: ${row.highest_public_evidence_state} (${stateLabel(row.highest_public_evidence_state, compiled.evidence_states)})`);
    for (const dimension of compiled.matrix_dimensions) lines.push(`- ${dimension}: ${row.dimensions[dimension]}`);
    for (const item of row.bounded_support) lines.push(`- Supported: ${item}`);
    for (const item of row.unresolved) lines.push(`- Unresolved: ${item}`);
    lines.push('');
  }
  lines.push('## Coverage', '');
  for (const stateId of STATE_ORDER) {
    lines.push(`- ${stateId} highest-state cases: ${compiled.highest_state_counts[stateId]}; cumulative coverage: ${compiled.cumulative_state_coverage_counts[stateId]}`);
  }
  lines.push(
    '',
    '## Frontier counts',
    '',
    `- Complete executed matched studies: ${compiled.complete_executed_matched_study_count}`,
    `- Operational human overrides: ${compiled.operational_human_override_count}`,
    `- Binding affected-public authority cases: ${compiled.binding_affected_public_authority_count}`,
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
