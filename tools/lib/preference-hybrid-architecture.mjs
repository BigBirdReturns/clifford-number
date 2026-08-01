import { createHash } from 'node:crypto';

export const PREFERENCE_HYBRID_ARCHITECTURE_SCHEMA_VERSION = 'preference-custody-hybrid-architecture@1';
export const PREFERENCE_HYBRID_ARCHITECTURE_BUILD_SCHEMA_VERSION = 'preference-custody-hybrid-architecture-build@1';

const REQUIRED_RECEIPT_CLASSES = new Set([
  'provider_primary_public',
  'independent_professional_reporting'
]);
const REQUIRED_CONTROL_IDS = ['PC-01', 'PC-03', 'PC-05', 'PC-06', 'PC-09'];

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

function countBy(values, key) {
  const counts = {};
  for (const value of array(values)) {
    const label = text(value?.[key]) || 'unknown';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
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

function requireTrue(value, label, errors) {
  if (value !== true) errors.push(`${label} must remain true`);
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildHybridChain(packet) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${packet.case_id}:product`,
    event_type: 'product_surface_recorded',
    evidence_class: 'provider_primary_public',
    authority: packet.product.provider,
    source_event_ids: [],
    payload: packet.product
  });
  push({
    event_id: `${packet.case_id}:simulation`,
    event_type: 'simulation_layer_recorded',
    evidence_class: 'provider_primary_public',
    authority: packet.product.provider,
    source_event_ids: [`${packet.case_id}:product`],
    payload: packet.architecture.simulation_layer
  });
  push({
    event_id: `${packet.case_id}:validation`,
    event_type: 'human_validation_layer_recorded',
    evidence_class: 'provider_and_independent_public',
    authority: packet.product.provider,
    source_event_ids: [`${packet.case_id}:simulation`],
    payload: {
      human_validation_layer: packet.architecture.human_validation_layer,
      validation_scope_options: packet.architecture.validation_scope_options,
      validation_population_options: packet.architecture.validation_population_options,
      configurable_fields: packet.architecture.configurable_fields
    }
  });
  push({
    event_id: `${packet.case_id}:method-distinction`,
    event_type: 'verification_validation_distinction_recorded',
    evidence_class: 'provider_methodology_statement',
    authority: packet.product.provider,
    source_event_ids: [`${packet.case_id}:validation`],
    payload: {
      method_distinction: packet.architecture.method_distinction,
      public_demo_automatically_validated: packet.architecture.public_demo_automatically_validated,
      tracking_studies_replaced: packet.architecture.tracking_studies_replaced
    }
  });
  push({
    event_id: `${packet.case_id}:classification`,
    event_type: 'bounded_architecture_classification',
    evidence_class: 'bounded_real_case_analysis',
    authority: 'preference_custody_compiler',
    source_event_ids: [`${packet.case_id}:method-distinction`],
    payload: {
      bounded_observations: packet.bounded_observations,
      classification_verdict: packet.classification_verdict,
      control_relations: packet.control_relations
    }
  });
  push({
    event_id: `${packet.case_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_analyst',
    source_event_ids: [`${packet.case_id}:classification`],
    payload: {
      allowed_interpretation: 'an integrated simulation and configurable live-human validation product architecture is publicly documented',
      refused_promotions: [
        'available_validation_as_validation_of_every_output',
        'public_demo_as_live_validated',
        'product_architecture_as_executed_matched_study',
        'targeted_sample_option_as_subgroup_parity',
        'survey_validation_as_binding_public_authority',
        'provider_claim_as_independent_performance_superiority'
      ]
    }
  });
  return events;
}

export function validateHybridArchitectureChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('hybrid-architecture event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate hybrid event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`hybrid event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`hybrid event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`hybrid event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function validatePreferenceHybridArchitecture(packet) {
  const errors = [];
  const product = object(packet?.product);
  const receipts = array(packet?.receipts);
  const architecture = object(packet?.architecture);
  const simulation = object(architecture.simulation_layer);
  const human = object(architecture.human_validation_layer);
  const distinction = object(architecture.method_distinction);
  const observations = object(packet?.bounded_observations);
  const relations = array(packet?.control_relations);
  const verdict = object(packet?.classification_verdict);

  if (packet?.schema_version !== PREFERENCE_HYBRID_ARCHITECTURE_SCHEMA_VERSION) errors.push('preference hybrid-architecture schema mismatch');
  if (!text(packet?.case_id)) errors.push('case_id is required');
  if (packet?.status !== 'public_hybrid_architecture_admitted_execution_unresolved') errors.push('hybrid-architecture status mismatch');
  if (packet?.classification !== 'public_product_architecture_positive_control') errors.push('hybrid-architecture classification mismatch');
  if (packet?.graph_effect !== 'none') errors.push('hybrid-architecture graph_effect must remain none');
  requireFalse(packet?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);
  if (packet?.publication_status !== 'bounded_architecture_only') errors.push('publication status must remain bounded_architecture_only');

  for (const key of ['provider', 'name', 'public_launch_date', 'technology_partner', 'public_demo', 'product_state']) {
    if (!text(product[key])) errors.push(`product.${key} is required`);
  }
  if (product.provider !== 'YouGov' || product.name !== 'YouGov Parallax') errors.push('product identity must remain YouGov Parallax');
  if (product.public_launch_date !== '2026-07-08') errors.push('product launch date must remain 2026-07-08');

  if (receipts.length < 3) errors.push('hybrid-architecture packet requires at least three receipts');
  const receiptIds = receipts.map(receipt => text(receipt?.receipt_id));
  if (unique(receiptIds).length !== receipts.length) errors.push('hybrid receipt IDs must be unique');
  for (const receipt of receipts) {
    const id = text(receipt?.receipt_id) || '(missing receipt ID)';
    if (!text(receipt?.url) || !text(receipt?.receipt_id)) errors.push(`receipt ${id} requires identity and URL`);
    if (!REQUIRED_RECEIPT_CLASSES.has(receipt?.source_class)) errors.push(`receipt ${id} has invalid source class ${receipt?.source_class}`);
    if (!array(receipt?.supports).length) errors.push(`receipt ${id} must declare bounded support`);
  }
  for (const requiredClass of REQUIRED_RECEIPT_CLASSES) {
    if (!receipts.some(receipt => receipt.source_class === requiredClass)) errors.push(`missing hybrid receipt source class ${requiredClass}`);
  }

  requireTrue(simulation.confirmed, 'architecture.simulation_layer.confirmed', errors);
  requireTrue(human.confirmed, 'architecture.human_validation_layer.confirmed', errors);
  for (const key of ['object', 'grounding', 'role']) if (!text(simulation[key])) errors.push(`simulation layer ${key} is required`);
  for (const key of ['object', 'role', 'minimum_public_turnaround_claim']) if (!text(human[key])) errors.push(`human validation layer ${key} is required`);
  if (unique(architecture.validation_scope_options).length < 3) errors.push('validation scope options are incomplete');
  if (unique(architecture.validation_population_options).length < 3) errors.push('validation population options are incomplete');
  if (unique(architecture.configurable_fields).length < 4) errors.push('configurable validation fields are incomplete');
  if (!text(distinction.verification) || !text(distinction.validation)) errors.push('verification and validation definitions are required');
  requireFalse(architecture.public_demo_automatically_validated, 'public_demo_automatically_validated', errors);
  requireFalse(architecture.tracking_studies_replaced, 'tracking_studies_replaced', errors);

  for (const key of [
    'integrated_simulation_and_live_validation_architecture_confirmed',
    'live_validation_capability_available',
    'same_represented_person_validation_possible',
    'fresh_sample_validation_possible',
    'targeted_sample_validation_possible',
    'full_or_selected_question_validation_possible',
    'verification_validation_distinction_publicly_defined',
    'public_demo_not_automatically_validated',
    'tracking_studies_explicitly_not_replaced'
  ]) requireTrue(observations[key], `bounded_observations.${key}`, errors);
  for (const key of [
    'one_executed_matched_study_with_complete_receipts_publicly_recovered',
    'study_level_synthetic_and_human_instruments_publicly_recovered',
    'study_level_response_distributions_publicly_recovered',
    'study_level_subgroup_errors_and_burden_publicly_recovered',
    'study_level_disagreement_reconciliation_publicly_recovered',
    'human_override_rule_publicly_recovered',
    'client_finding_feedback_reuse_in_twins_publicly_recovered',
    'deployment_specific_runtime_metric_policy_lineage_publicly_recovered',
    'binding_affected_public_authority_publicly_recovered'
  ]) requireFalse(observations[key], `bounded_observations.${key}`, errors);

  if (!sameMembers(relations.map(relation => relation?.control_id), REQUIRED_CONTROL_IDS)) errors.push('control relations must contain exactly PC-01, PC-03, PC-05, PC-06, and PC-09');
  for (const relation of relations) {
    const id = text(relation?.control_id) || '(missing control ID)';
    if (!text(relation?.state) || !text(relation?.allowed_conclusion)) errors.push(`control relation ${id} requires state and allowed conclusion`);
    if (!array(relation?.supported).length) errors.push(`control relation ${id} requires bounded support`);
    if (!array(relation?.missing).length) errors.push(`control relation ${id} requires missing evidence`);
  }

  for (const key of [
    'integrated_hybrid_product_architecture_confirmed',
    'live_human_validation_capability_confirmed',
    'method_verification_and_finding_validation_separated'
  ]) requireTrue(verdict[key], `classification_verdict.${key}`, errors);
  for (const key of [
    'public_demo_automatically_validated',
    'every_enterprise_result_necessarily_validated',
    'one_executed_matched_study_fully_reproduced',
    'study_level_discrepancy_handling_supported',
    'human_override_supported',
    'binding_public_authority_supported',
    'tracking_replacement_supported',
    'independent_performance_superiority_established',
    'real_world_causal_effect_claimed',
    'manipulative_intent_inferable'
  ]) requireFalse(verdict[key], `classification_verdict.${key}`, errors);

  if (unique(packet?.required_next_evidence).length < 10) errors.push('required next-evidence ledger is incomplete');
  if (unique(packet?.prohibited_inferences).length < 7) errors.push('prohibited-inference ledger is incomplete');
  if (!text(packet?.interpretation_contract?.contract_id)
      || !text(packet?.interpretation_contract?.what_this_is)
      || !text(packet?.interpretation_contract?.what_this_is_not)
      || !text(packet?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('interpretation contract is incomplete');
  }
  return errors;
}

export function compilePreferenceHybridArchitecture(packet) {
  const errors = validatePreferenceHybridArchitecture(packet);
  if (errors.length) throw new Error(`invalid preference hybrid architecture:\n- ${errors.join('\n- ')}`);

  const chain = buildHybridChain(packet);
  const relations = packet.control_relations.map(relation => ({
    ...relation,
    supported_count: relation.supported.length,
    missing_count: relation.missing.length
  }));

  return {
    schema_version: PREFERENCE_HYBRID_ARCHITECTURE_BUILD_SCHEMA_VERSION,
    case_id: packet.case_id,
    issue: packet.issue,
    parent_program_issue: packet.parent_program_issue,
    substitution_issue: packet.substitution_issue,
    captured_at: packet.captured_at,
    status: 'hybrid_architecture_confirmed_matched_execution_unresolved',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_public_product_architecture',
    publication_status: packet.publication_status,
    product: packet.product,
    receipt_count: packet.receipts.length,
    receipt_source_class_counts: countBy(packet.receipts, 'source_class'),
    receipts: packet.receipts,
    architecture: packet.architecture,
    bounded_observations: packet.bounded_observations,
    control_relation_count: relations.length,
    control_relation_state_counts: countBy(relations, 'state'),
    control_relations: relations,
    classification_verdict: packet.classification_verdict,
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    allowed_publication_claims: [
      'YouGov Parallax publicly integrates an AI twin simulation layer with configurable surveys of live panelists.',
      'YouGov publicly distinguishes methodology verification from finding-specific validation.',
      'The public demo is not automatically validated by live people, and the product is not presented as a replacement for tracking studies.',
      'Public materials do not supply one complete executed matched study, discrepancy-resolution record, subgroup result, override consequence, deployment lineage, or binding public-authority instrument.'
    ],
    required_next_evidence: packet.required_next_evidence,
    prohibited_inferences: packet.prohibited_inferences,
    interpretation_contract: packet.interpretation_contract
  };
}

export function validatePreferenceHybridArchitectureBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_HYBRID_ARCHITECTURE_BUILD_SCHEMA_VERSION) errors.push('preference hybrid-architecture build schema mismatch');
  if (compiled?.status !== 'hybrid_architecture_confirmed_matched_execution_unresolved') errors.push('compiled hybrid status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled hybrid graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_public_product_architecture') errors.push('compiled real-world evidence state mismatch');
  if (!(compiled?.receipt_count >= 3)) errors.push('compiled hybrid packet requires at least three receipts');
  if (compiled?.control_relation_count !== 5) errors.push('compiled hybrid packet must preserve five control relations');
  requireTrue(compiled?.classification_verdict?.integrated_hybrid_product_architecture_confirmed, 'compiled integrated_hybrid_product_architecture_confirmed', errors);
  requireTrue(compiled?.classification_verdict?.live_human_validation_capability_confirmed, 'compiled live_human_validation_capability_confirmed', errors);
  requireTrue(compiled?.classification_verdict?.method_verification_and_finding_validation_separated, 'compiled method_verification_and_finding_validation_separated', errors);
  for (const key of [
    'public_demo_automatically_validated',
    'every_enterprise_result_necessarily_validated',
    'one_executed_matched_study_fully_reproduced',
    'study_level_discrepancy_handling_supported',
    'human_override_supported',
    'binding_public_authority_supported',
    'tracking_replacement_supported',
    'independent_performance_superiority_established',
    'real_world_causal_effect_claimed',
    'manipulative_intent_inferable'
  ]) requireFalse(compiled?.classification_verdict?.[key], `compiled classification_verdict.${key}`, errors);
  errors.push(...validateHybridArchitectureChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled hybrid custody head mismatch');
  if (!array(compiled?.allowed_publication_claims).length) errors.push('compiled allowed publication claims are required');
  if (!array(compiled?.required_next_evidence).length) errors.push('compiled next-evidence ledger is required');
  if (!array(compiled?.prohibited_inferences).length) errors.push('compiled prohibited-inference ledger is required');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled hybrid caveat is required');
  return errors;
}

export function renderPreferenceHybridArchitectureMarkdown(compiled) {
  const lines = [
    '# YouGov Parallax hybrid-architecture positive control',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Product',
    '',
    `- Provider: ${compiled.product.provider}`,
    `- Product: ${compiled.product.name}`,
    `- Launch: ${compiled.product.public_launch_date}`,
    `- Technology partner: ${compiled.product.technology_partner}`,
    '',
    '## Architecture',
    '',
    `- Simulation layer confirmed: ${compiled.architecture.simulation_layer.confirmed}`,
    `- Human validation layer confirmed: ${compiled.architecture.human_validation_layer.confirmed}`,
    `- Public demo automatically validated: ${compiled.architecture.public_demo_automatically_validated}`,
    `- Tracking studies replaced: ${compiled.architecture.tracking_studies_replaced}`,
    `- Verification: ${compiled.architecture.method_distinction.verification}`,
    `- Validation: ${compiled.architecture.method_distinction.validation}`,
    '',
    '## Validation configurations',
    ''
  ];
  for (const option of compiled.architecture.validation_scope_options) lines.push(`- Scope: ${option}`);
  for (const option of compiled.architecture.validation_population_options) lines.push(`- Population: ${option}`);
  lines.push('', '## Bounded verdict', '');
  for (const [key, value] of Object.entries(compiled.classification_verdict)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Control relations', '');
  for (const relation of compiled.control_relations) {
    lines.push(`### ${relation.control_id}`, '');
    lines.push(`- State: ${relation.state}`);
    lines.push(`- Allowed conclusion: ${relation.allowed_conclusion}`);
    for (const item of relation.supported) lines.push(`- Supported: ${item}`);
    for (const item of relation.missing) lines.push(`- Missing: ${item}`);
    lines.push('');
  }
  lines.push('## Required next evidence', '');
  for (const item of compiled.required_next_evidence) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
