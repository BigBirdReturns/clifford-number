import { createHash } from 'node:crypto';

export const PREFERENCE_HUMAN_COMPANION_SCHEMA_VERSION = 'preference-custody-human-companion@1';
export const PREFERENCE_HUMAN_COMPANION_BUILD_SCHEMA_VERSION = 'preference-custody-human-companion-build@1';

const REQUIRED_RECEIPT_CLASSES = new Set([
  'publisher_primary_public',
  'independent_trade_reporting'
]);

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

function parseIsoDate(value, label, errors) {
  const source = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    errors.push(`${label} must use YYYY-MM-DD`);
    return null;
  }
  const parsed = new Date(`${source}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== source) {
    errors.push(`${label} is not a valid calendar date`);
    return null;
  }
  return parsed;
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

function buildCustodyChain(packet, daysBetweenLaunches) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${packet.case_id}:synthetic-surface`,
    event_type: 'synthetic_surface_recorded',
    evidence_class: 'publisher_primary_public',
    authority: packet.institution,
    source_event_ids: [],
    payload: packet.surfaces.synthetic
  });
  push({
    event_id: `${packet.case_id}:human-surface`,
    event_type: 'human_surface_recorded',
    evidence_class: 'publisher_primary_public',
    authority: packet.institution,
    source_event_ids: [`${packet.case_id}:synthetic-surface`],
    payload: {
      ...packet.surfaces.human,
      days_after_synthetic_launch: daysBetweenLaunches
    }
  });
  push({
    event_id: `${packet.case_id}:relationship`,
    event_type: 'institutional_relationship_classified',
    evidence_class: 'bounded_real_case_analysis',
    authority: 'preference_custody_compiler',
    source_event_ids: [
      `${packet.case_id}:synthetic-surface`,
      `${packet.case_id}:human-surface`
    ],
    payload: {
      bounded_observations: packet.bounded_observations,
      classification_verdict: packet.classification_verdict,
      negative_control: packet.negative_control
    }
  });
  push({
    event_id: `${packet.case_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_analyst',
    source_event_ids: [`${packet.case_id}:relationship`],
    payload: {
      allowed_interpretation: 'parallel direct human research infrastructure is confirmed alongside the synthetic audience surface',
      refused_promotions: [
        'parallel_surface_as_matched_validation',
        'human_panel_as_binding_public_authority',
        'parallel_human_product_as_proof_no_substitution_occurs',
        'institutional_colocation_as_shared_workflow',
        'bounded_counterevidence_as_thesis_prevalence'
      ]
    }
  });
  return events;
}

export function validateHumanCompanionChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('human-companion event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate human-companion event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`human-companion event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`human-companion event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`human-companion event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function validatePreferenceHumanCompanion(packet) {
  const errors = [];
  const receipts = array(packet?.receipts);
  const surfaces = object(packet?.surfaces);
  const synthetic = object(surfaces.synthetic);
  const human = object(surfaces.human);
  const observations = object(packet?.bounded_observations);
  const verdict = object(packet?.classification_verdict);
  const control = object(packet?.negative_control);

  if (packet?.schema_version !== PREFERENCE_HUMAN_COMPANION_SCHEMA_VERSION) errors.push('preference human-companion schema mismatch');
  if (!text(packet?.case_id)) errors.push('case_id is required');
  if (packet?.status !== 'bounded_parallel_human_infrastructure_admitted') errors.push('human-companion status mismatch');
  if (packet?.classification !== 'institutional_human_companion_negative_control') errors.push('human-companion classification mismatch');
  if (packet?.graph_effect !== 'none') errors.push('human-companion graph_effect must remain none');
  requireFalse(packet?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);
  if (packet?.publication_status !== 'bounded_negative_control_only') errors.push('publication status must remain bounded_negative_control_only');
  if (!text(packet?.institution) || !text(packet?.portfolio) || !text(packet?.related_real_case)) errors.push('institution portfolio and related real case are required');

  for (const [label, surface] of [['synthetic', synthetic], ['human', human]]) {
    for (const key of ['product', 'public_launch_date', 'mode', 'publisher_scope']) {
      if (!text(surface[key])) errors.push(`surfaces.${label}.${key} is required`);
    }
  }
  const syntheticDate = parseIsoDate(synthetic.public_launch_date, 'synthetic launch date', errors);
  const humanDate = parseIsoDate(human.public_launch_date, 'human launch date', errors);
  if (syntheticDate && humanDate && humanDate <= syntheticDate) errors.push('human companion must launch after the synthetic surface in this frozen case');
  if (synthetic.product !== 'Times ExplorAItion') errors.push('synthetic surface must remain Times ExplorAItion');
  if (human.product !== 'Nucleus Panel') errors.push('human surface must remain Nucleus Panel');

  if (receipts.length < 3) errors.push('human-companion packet requires at least three receipts');
  const receiptIds = receipts.map(receipt => text(receipt?.receipt_id));
  if (unique(receiptIds).length !== receipts.length) errors.push('human-companion receipt IDs must be unique');
  for (const receipt of receipts) {
    const id = text(receipt?.receipt_id) || '(missing receipt ID)';
    if (!text(receipt?.receipt_id) || !text(receipt?.url)) errors.push(`receipt ${id} requires identity and URL`);
    if (!REQUIRED_RECEIPT_CLASSES.has(receipt?.source_class)) errors.push(`receipt ${id} has invalid source class ${receipt?.source_class}`);
    if (!array(receipt?.supports).length) errors.push(`receipt ${id} must declare bounded support`);
  }
  for (const requiredClass of REQUIRED_RECEIPT_CLASSES) {
    if (!receipts.some(receipt => receipt.source_class === requiredClass)) errors.push(`missing human-companion receipt source class ${requiredClass}`);
  }

  for (const key of [
    'same_institution_and_nucleus_portfolio',
    'parallel_synthetic_and_direct_human_surfaces_confirmed',
    'human_panel_provides_direct_face_to_face_reader_access',
    'publisher_explicitly_describes_human_panel_as_complementing_ai',
    'human_panel_delivers_post_session_reports'
  ]) requireTrue(observations[key], `bounded_observations.${key}`, errors);
  for (const key of [
    'matched_same_decision_workflow_publicly_recovered',
    'synthetic_human_validation_protocol_publicly_recovered',
    'routing_rule_between_synthetic_and_human_methods_publicly_recovered',
    'conflict_resolution_rule_publicly_recovered',
    'human_feedback_reuse_in_synthetic_model_publicly_recovered',
    'binding_affected_public_authority_publicly_recovered'
  ]) requireFalse(observations[key], `bounded_observations.${key}`, errors);

  requireTrue(verdict.parallel_human_research_infrastructure_confirmed, 'parallel_human_research_infrastructure_confirmed', errors);
  requireTrue(verdict.organization_wide_full_replacement_counterevidence_present, 'organization_wide_full_replacement_counterevidence_present', errors);
  for (const key of [
    'same_workflow_hybrid_operation_supported',
    'matched_human_synthetic_validation_supported',
    'human_panel_confers_binding_public_authority',
    'human_panel_proves_no_partial_substitution_anywhere',
    'real_world_causal_effect_claimed',
    'manipulative_intent_inferable'
  ]) requireFalse(verdict[key], `classification_verdict.${key}`, errors);

  if (control.control_class !== 'parallel_human_infrastructure') errors.push('negative control class mismatch');
  if (!text(control.bounded_support) || !text(control.refused_generalization)) errors.push('negative control support and refusal are required');
  if (control.matched_validation_state !== 'not_established') errors.push('matched validation must remain not_established');
  if (control.public_authority_state !== 'not_established') errors.push('public authority must remain not_established');
  if (unique(packet?.required_next_evidence).length < 8) errors.push('required next-evidence ledger is incomplete');
  if (!array(packet?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(packet?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(packet?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(packet?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(packet?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function compilePreferenceHumanCompanion(packet) {
  const errors = validatePreferenceHumanCompanion(packet);
  if (errors.length) throw new Error(`invalid preference human-companion packet:\n- ${errors.join('\n- ')}`);

  const syntheticDate = new Date(`${packet.surfaces.synthetic.public_launch_date}T00:00:00Z`);
  const humanDate = new Date(`${packet.surfaces.human.public_launch_date}T00:00:00Z`);
  const daysBetweenLaunches = Math.round((humanDate - syntheticDate) / 86_400_000);
  const custodyChain = buildCustodyChain(packet, daysBetweenLaunches);

  return {
    schema_version: PREFERENCE_HUMAN_COMPANION_BUILD_SCHEMA_VERSION,
    case_id: packet.case_id,
    issue: packet.issue,
    related_issue: packet.related_issue,
    related_real_case: packet.related_real_case,
    captured_at: packet.captured_at,
    status: 'parallel_human_companion_confirmed_matched_workflow_unresolved',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_parallel_human_infrastructure',
    publication_status: packet.publication_status,
    institution: packet.institution,
    portfolio: packet.portfolio,
    surfaces: packet.surfaces,
    days_between_launches: daysBetweenLaunches,
    receipt_count: packet.receipts.length,
    receipt_source_class_counts: countBy(packet.receipts, 'source_class'),
    receipts: packet.receipts,
    bounded_observations: packet.bounded_observations,
    classification_verdict: packet.classification_verdict,
    negative_control_state: 'bounded_counterevidence_to_organization_wide_full_replacement',
    matched_validation_state: packet.negative_control.matched_validation_state,
    public_authority_state: packet.negative_control.public_authority_state,
    negative_control: packet.negative_control,
    custody_chain: custodyChain,
    custody_chain_head_sha256: custodyChain.at(-1)?.event_sha256 ?? null,
    allowed_publication_claims: [
      'News UK launched Times ExplorAItion and later launched Nucleus Panel inside its Nucleus insight portfolio.',
      'Nucleus Panel gives brands and agencies direct face-to-face access to readers, and News UK describes it as complementing AI-driven insight.',
      'The parallel direct-human surface is bounded counterevidence to an organization-wide claim that synthetic audiences replaced all human research at News UK.',
      'Public materials do not establish a matched Times ExplorAItion and Nucleus Panel workflow, validation protocol, reconciliation rule, feedback loop, or binding affected-public authority.'
    ],
    required_next_evidence: packet.required_next_evidence,
    prohibited_inferences: packet.prohibited_inferences,
    interpretation_contract: packet.interpretation_contract
  };
}

export function validatePreferenceHumanCompanionBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_HUMAN_COMPANION_BUILD_SCHEMA_VERSION) errors.push('preference human-companion build schema mismatch');
  if (compiled?.status !== 'parallel_human_companion_confirmed_matched_workflow_unresolved') errors.push('compiled human-companion status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled human-companion graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_parallel_human_infrastructure') errors.push('compiled real-world evidence state mismatch');
  if (compiled?.days_between_launches !== 85) errors.push('compiled chronology must preserve the 85-day launch interval');
  if (!(compiled?.receipt_count >= 3)) errors.push('compiled human-companion packet requires at least three receipts');
  requireTrue(compiled?.classification_verdict?.parallel_human_research_infrastructure_confirmed, 'compiled parallel_human_research_infrastructure_confirmed', errors);
  requireTrue(compiled?.classification_verdict?.organization_wide_full_replacement_counterevidence_present, 'compiled organization_wide_full_replacement_counterevidence_present', errors);
  for (const key of [
    'same_workflow_hybrid_operation_supported',
    'matched_human_synthetic_validation_supported',
    'human_panel_confers_binding_public_authority',
    'human_panel_proves_no_partial_substitution_anywhere',
    'real_world_causal_effect_claimed',
    'manipulative_intent_inferable'
  ]) requireFalse(compiled?.classification_verdict?.[key], `compiled classification_verdict.${key}`, errors);
  if (compiled?.negative_control_state !== 'bounded_counterevidence_to_organization_wide_full_replacement') errors.push('compiled negative-control state mismatch');
  if (compiled?.matched_validation_state !== 'not_established') errors.push('compiled matched-validation state must remain not_established');
  if (compiled?.public_authority_state !== 'not_established') errors.push('compiled public-authority state must remain not_established');
  errors.push(...validateHumanCompanionChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled human-companion custody head mismatch');
  if (!array(compiled?.allowed_publication_claims).length) errors.push('compiled allowed publication claims are required');
  if (!array(compiled?.required_next_evidence).length) errors.push('compiled next-evidence ledger is required');
  if (!array(compiled?.prohibited_inferences).length) errors.push('compiled prohibited inferences are required');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

export function renderPreferenceHumanCompanionMarkdown(compiled) {
  const lines = [
    '# News UK Nucleus human-companion admission',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Chronology',
    '',
    `- ${compiled.surfaces.synthetic.public_launch_date}: ${compiled.surfaces.synthetic.product} launched as ${compiled.surfaces.synthetic.mode}.`,
    `- ${compiled.surfaces.human.public_launch_date}: ${compiled.surfaces.human.product} launched as ${compiled.surfaces.human.mode}.`,
    `- Launch interval: ${compiled.days_between_launches} days.`,
    '',
    '## Bounded classification',
    '',
    `- Parallel direct-human research infrastructure confirmed: ${compiled.classification_verdict.parallel_human_research_infrastructure_confirmed}`,
    `- Organization-wide full-replacement counterevidence present: ${compiled.classification_verdict.organization_wide_full_replacement_counterevidence_present}`,
    `- Same-workflow hybrid operation supported: ${compiled.classification_verdict.same_workflow_hybrid_operation_supported}`,
    `- Matched human-synthetic validation supported: ${compiled.classification_verdict.matched_human_synthetic_validation_supported}`,
    `- Human panel confers binding public authority: ${compiled.classification_verdict.human_panel_confers_binding_public_authority}`,
    `- Human panel proves no bounded substitution occurs anywhere: ${compiled.classification_verdict.human_panel_proves_no_partial_substitution_anywhere}`,
    '',
    '## Negative-control result',
    '',
    `- State: ${compiled.negative_control_state}`,
    `- Matched validation: ${compiled.matched_validation_state}`,
    `- Public authority: ${compiled.public_authority_state}`,
    `- Bounded support: ${compiled.negative_control.bounded_support}`,
    `- Refused generalization: ${compiled.negative_control.refused_generalization}`,
    '',
    '## Allowed publication claims',
    ''
  ];
  for (const claim of compiled.allowed_publication_claims) lines.push(`- ${claim}`);
  lines.push('', '## Required next evidence', '');
  for (const item of compiled.required_next_evidence) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
