export const THESIS_CASE_PACKET_SCHEMA_VERSION = 'clifford-thesis-case-packet@1';
export const THESIS_CASE_PACKET_BUILD_VERSION = 'clifford-thesis-case-packet-build@1';
export const THESIS_CASE_PACKET_INDEX_VERSION = 'clifford-thesis-case-packet-index@1';

const RELATIONS = new Set(['supports', 'weakens', 'contradicts', 'context', 'coverage', 'null_result']);
const EVIDENCE_BEARING = new Set(['supports', 'weakens', 'contradicts']);
const CHALLENGE = new Set(['weakens', 'contradicts', 'null_result']);
const PROMOTABLE_REVIEW = new Set(['human_reviewed', 'independently_reviewed']);
const INTAKE_STATUSES = new Set([
  'intake_pending_receipt_ingest_and_human_review',
  'intake_receipts_complete_human_review_and_denominator_pending'
]);
const FORBIDDEN_KEYS = new Set(['finding', 'verdict', 'conclusion', 'probability', 'influence_score', 'guilt_score']);

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function relationCounts(observations) {
  const counts = Object.fromEntries([...RELATIONS].map(relation => [relation, 0]));
  for (const observation of observations) if (RELATIONS.has(observation.relation)) counts[observation.relation] += 1;
  return counts;
}

function validUrl(value) {
  try {
    const url = new URL(String(value));
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function observationReceiptIds(observation) {
  return unique(observation.receipt_ids);
}

function evidenceBearingObservations(packet) {
  return array(packet.observations).filter(observation => EVIDENCE_BEARING.has(observation.relation));
}

function derivePromotion(packet) {
  const evidence = evidenceBearingObservations(packet);
  const receiptsComplete = evidence.length > 0 && evidence.every(observation => observationReceiptIds(observation).length > 0);
  const reviewComplete = evidence.length > 0 && evidence.every(observation => PROMOTABLE_REVIEW.has(observation.review_status));
  const denominatorComplete = packet.case_disposition?.denominator_complete === true;
  const challengePresent = array(packet.observations).some(observation => CHALLENGE.has(observation.relation));
  const positivePresent = array(packet.observations).some(observation => observation.relation === 'supports');
  const eligible = receiptsComplete && reviewComplete && denominatorComplete && challengePresent && positivePresent;
  const machineStage = eligible
    ? 'eligible_for_human_evidence_packet_promotion'
    : receiptsComplete
      ? reviewComplete ? 'denominator_or_packet_completion_pending' : 'human_review_pending'
      : evidence.some(observation => observationReceiptIds(observation).length > 0)
        ? 'receipt_ingest_in_progress'
        : 'intake_pending_receipt_ingest_and_human_review';
  return {
    evidence_bearing_observation_count: evidence.length,
    repository_receipts_complete: receiptsComplete,
    human_review_complete: reviewComplete,
    denominator_complete: denominatorComplete,
    positive_anchor_present: positivePresent,
    challenge_material_present: challengePresent,
    eligible_for_thesis_evidence_promotion: eligible,
    machine_stage: machineStage
  };
}

export function validateThesisCasePacket(packet, { receiptIds = null, thesisCaseIds = null, thesisPropositionIds = null } = {}) {
  const errors = [];
  const receipts = receiptIds instanceof Set ? receiptIds : receiptIds ? new Set(receiptIds) : null;
  const caseIds = thesisCaseIds instanceof Set ? thesisCaseIds : thesisCaseIds ? new Set(thesisCaseIds) : null;
  const propositionIds = thesisPropositionIds instanceof Set ? thesisPropositionIds : thesisPropositionIds ? new Set(thesisPropositionIds) : null;
  const sources = array(packet?.sources);
  const observations = array(packet?.observations);
  const sourceIds = new Set(sources.map(source => source.source_id));

  if (packet?.schema_version !== THESIS_CASE_PACKET_SCHEMA_VERSION) errors.push('thesis case packet schema mismatch');
  if (!packet?.thesis_id || !packet?.case_id || !Number.isInteger(packet?.issue) || !packet?.title) errors.push('case packet requires thesis ID, case ID, issue, and title');
  if (caseIds && !caseIds.has(packet.case_id)) errors.push(`case packet references unknown thesis case ${packet.case_id}`);
  if (!array(packet?.proposition_ids).length) errors.push('case packet requires at least one proposition ID');
  for (const propositionId of array(packet?.proposition_ids)) if (propositionIds && !propositionIds.has(propositionId)) errors.push(`case packet references unknown proposition ${propositionId}`);
  if (!INTAKE_STATUSES.has(packet?.status)) errors.push('case packet must remain in an allowed intake status');
  if (!text(packet?.publication_status).startsWith('blocked_')) errors.push('current case packet publication status must remain blocked');
  if (packet?.graph_effect !== 'none') errors.push('case packet graph_effect must remain none');
  if (!packet?.selection?.selection_unit || !packet?.selection?.selection_basis || !packet?.selection?.denominator_status || !packet?.selection?.denominator_description) errors.push('case packet requires a declared selection unit, basis, and denominator state');
  if (!array(packet?.selection?.promotion_blockers).length) errors.push('case packet requires explicit promotion blockers');
  if (!packet?.interpretation_contract?.copy_ready_caveat) errors.push('case packet requires an interpretation caveat');
  for (const key of FORBIDDEN_KEYS) if (Object.hasOwn(packet ?? {}, key)) errors.push(`case packet contains forbidden field ${key}`);

  const duplicateSourceIds = sources.map(source => source.source_id).filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateSourceIds.length) errors.push(`duplicate source IDs: ${unique(duplicateSourceIds).join(', ')}`);
  for (const source of sources) {
    const id = source.source_id || '(missing source ID)';
    if (!source.source_id || !source.publisher || !source.title || !source.source_class || !source.access_state) errors.push(`source ${id} lacks required metadata`);
    if (!validUrl(source.url)) errors.push(`source ${id} requires an http or https URL`);
    if (source.receipt_id && receipts && !receipts.has(source.receipt_id)) errors.push(`source ${id} references unknown receipt ${source.receipt_id}`);
  }

  const observationIds = observations.map(observation => observation.observation_id);
  const duplicateObservationIds = observationIds.filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateObservationIds.length) errors.push(`duplicate observation IDs: ${unique(duplicateObservationIds).join(', ')}`);
  for (const observation of observations) {
    const id = observation.observation_id || '(missing observation ID)';
    if (!observation.observation_id || !RELATIONS.has(observation.relation) || !observation.predicate || !observation.factual_statement) errors.push(`observation ${id} lacks ID, valid relation, predicate, or factual statement`);
    if (!array(observation.source_ids).length) errors.push(`observation ${id} requires source IDs`);
    for (const sourceId of array(observation.source_ids)) if (!sourceIds.has(sourceId)) errors.push(`observation ${id} references unknown source ${sourceId}`);
    for (const receiptId of observationReceiptIds(observation)) if (receipts && !receipts.has(receiptId)) errors.push(`observation ${id} references unknown receipt ${receiptId}`);
    if (!observation.evidence_class || !observation.review_status || !observation.promotion_status) errors.push(`observation ${id} requires evidence class, review status, and promotion status`);
    if (!observation.allowed_language || !array(observation.forbidden_inferences).length) errors.push(`observation ${id} requires allowed language and forbidden inferences`);
    if (observation.valid_from || observation.valid_until) {
      if (!observation.temporal_status) errors.push(`observation ${id} with dates requires temporal status`);
    }
    if (EVIDENCE_BEARING.has(observation.relation)) {
      const receipted = observationReceiptIds(observation).length > 0;
      const reviewed = PROMOTABLE_REVIEW.has(observation.review_status);
      if ((!receipted || !reviewed) && !text(observation.promotion_status).startsWith('blocked_')) errors.push(`unready evidence observation ${id} must remain blocked`);
      if ((receipted && reviewed) && observation.promotion_status === 'promoted') errors.push(`observation ${id} cannot self-promote from the intake layer`);
    }
    if (observation.relation === 'null_result') {
      if (!observation.query_scope || !observation.source_status) errors.push(`null-result observation ${id} requires query scope and source status`);
      if (/proves? (?:universal )?absence|no relationship exists|never existed|none exist/i.test(observation.factual_statement)) errors.push(`null-result observation ${id} overstates a bounded source search`);
    }
    if (observation.temporal_status === 'later_compliance_record') {
      if (observation.non_retroactive !== true) errors.push(`later compliance observation ${id} must be explicitly non-retroactive`);
      if (!array(observation.forbidden_inferences).some(item => /retroactive|retroactively/i.test(item))) errors.push(`later compliance observation ${id} must forbid retroactive inference`);
    }
    for (const key of FORBIDDEN_KEYS) if (Object.hasOwn(observation, key)) errors.push(`observation ${id} contains forbidden field ${key}`);
  }

  if (!observations.some(observation => observation.relation === 'supports')) errors.push('case packet requires at least one positive anchor');
  if (!observations.some(observation => CHALLENGE.has(observation.relation))) errors.push('case packet requires weakening, contradiction, or bounded-null material');

  const derived = derivePromotion(packet);
  const expectedStatus = derived.repository_receipts_complete
    ? 'intake_receipts_complete_human_review_and_denominator_pending'
    : 'intake_pending_receipt_ingest_and_human_review';
  if (packet.status !== expectedStatus) errors.push(`case packet status expected ${expectedStatus}, got ${packet.status}`);
  const disposition = packet?.case_disposition ?? {};
  for (const key of ['positive_anchor_present', 'challenge_material_present', 'repository_receipts_complete', 'human_review_complete', 'denominator_complete', 'eligible_for_thesis_evidence_promotion']) {
    if (disposition[key] !== derived[key]) errors.push(`case disposition ${key} expected ${derived[key]}, got ${disposition[key]}`);
  }
  if (derived.eligible_for_thesis_evidence_promotion) errors.push('current intake packet unexpectedly satisfies promotion; promotion requires a separate reviewed action');
  if (!disposition.machine_summary) errors.push('case disposition requires a bounded machine summary');

  return errors;
}

export function compileThesisCasePacket(packet) {
  const observations = array(packet.observations);
  const sources = array(packet.sources);
  const derived = derivePromotion(packet);
  const counts = relationCounts(observations);
  const evidence = evidenceBearingObservations(packet);
  const receipts = unique(observations.flatMap(observationReceiptIds));
  return {
    schema_version: THESIS_CASE_PACKET_BUILD_VERSION,
    packet_version: packet.packet_version,
    thesis_id: packet.thesis_id,
    case_id: packet.case_id,
    issue: packet.issue,
    title: packet.title,
    proposition_ids: unique(packet.proposition_ids),
    status: packet.status,
    receipt_custody_status: derived.repository_receipts_complete ? 'complete' : 'incomplete',
    publication_status: packet.publication_status,
    graph_effect: 'none',
    conclusion_generated: false,
    captured_at: packet.captured_at,
    selection: packet.selection,
    source_count: sources.length,
    official_source_count: sources.filter(source => /official/.test(source.source_class)).length,
    observation_count: observations.length,
    relation_counts: counts,
    evidence_bearing_observation_count: evidence.length,
    receipt_ids: receipts,
    receipt_count: receipts.length,
    promotion: derived,
    observations: observations.map(observation => ({
      observation_id: observation.observation_id,
      relation: observation.relation,
      predicate: observation.predicate,
      factual_statement: observation.factual_statement,
      valid_from: observation.valid_from ?? null,
      valid_until: observation.valid_until ?? null,
      temporal_status: observation.temporal_status ?? null,
      source_ids: unique(observation.source_ids),
      receipt_ids: observationReceiptIds(observation),
      evidence_class: observation.evidence_class,
      review_status: observation.review_status,
      promotion_status: observation.promotion_status,
      allowed_language: observation.allowed_language,
      forbidden_inferences: unique(observation.forbidden_inferences),
      query_scope: observation.query_scope ?? null,
      source_status: observation.source_status ?? null,
      non_retroactive: observation.non_retroactive === true
    })),
    sources: sources.map(source => ({
      source_id: source.source_id,
      publisher: source.publisher,
      title: source.title,
      url: source.url,
      published_at: source.published_at ?? null,
      updated_at: source.updated_at ?? null,
      source_class: source.source_class,
      access_state: source.access_state,
      receipt_id: source.receipt_id ?? null
    })),
    case_disposition: packet.case_disposition,
    interpretation_contract: packet.interpretation_contract,
    thesis_consumption: {
      evidence_packet_emitted: false,
      allowed_relations_before_promotion: ['coverage', 'context'],
      reason: 'The case packet preserves intended analytical relations but remains intake until receipt custody, denominator, and human-review gates pass in a separate promotion action.'
    }
  };
}

export function compileThesisCasePacketIndex(compiledPackets) {
  const packets = [...compiledPackets].sort((left, right) => left.case_id.localeCompare(right.case_id));
  const totals = {
    cases: packets.length,
    sources: packets.reduce((sum, packet) => sum + packet.source_count, 0),
    observations: packets.reduce((sum, packet) => sum + packet.observation_count, 0),
    intended_support_observations: packets.reduce((sum, packet) => sum + packet.relation_counts.supports, 0),
    challenge_observations: packets.reduce((sum, packet) => sum + packet.relation_counts.weakens + packet.relation_counts.contradicts + packet.relation_counts.null_result, 0),
    repository_receipts: packets.reduce((sum, packet) => sum + packet.receipt_count, 0),
    receipt_complete_cases: packets.filter(packet => packet.promotion.repository_receipts_complete).length,
    human_review_complete_cases: packets.filter(packet => packet.promotion.human_review_complete).length,
    denominator_complete_cases: packets.filter(packet => packet.promotion.denominator_complete).length,
    eligible_for_promotion: packets.filter(packet => packet.promotion.eligible_for_thesis_evidence_promotion).length,
    emitted_thesis_evidence_packets: 0
  };
  return {
    schema_version: THESIS_CASE_PACKET_INDEX_VERSION,
    thesis_id: packets[0]?.thesis_id ?? null,
    status: packets.length ? 'intake_in_progress' : 'no_case_packets',
    graph_effect: 'none',
    conclusion_generated: false,
    totals,
    cases: packets.map(packet => ({
      case_id: packet.case_id,
      issue: packet.issue,
      title: packet.title,
      proposition_ids: packet.proposition_ids,
      status: packet.status,
      receipt_custody_status: packet.receipt_custody_status,
      source_count: packet.source_count,
      observation_count: packet.observation_count,
      relation_counts: packet.relation_counts,
      receipt_count: packet.receipt_count,
      machine_stage: packet.promotion.machine_stage,
      eligible_for_thesis_evidence_promotion: packet.promotion.eligible_for_thesis_evidence_promotion
    })),
    interpretation_contract: {
      what_this_is: 'An index of bounded thesis case-intake packets and their promotion blockers.',
      what_this_is_not: 'A thesis evidence registry, finding set, graph projection, score, or conclusion.',
      copy_ready_caveat: 'Intended analytical relations inside intake packets do not count as thesis evidence. Receipt custody is necessary but does not replace denominator completion, human review, or a separate promotion act.'
    }
  };
}

export function renderThesisCasePacketMarkdown(compiled) {
  const lines = [
    `# ${compiled.title}`,
    '',
    `**Case:** ${compiled.case_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Receipt custody:** ${compiled.receipt_custody_status}`,
    '',
    `**Machine stage:** ${compiled.promotion.machine_stage}`,
    '',
    `**Eligible for thesis evidence promotion:** ${compiled.promotion.eligible_for_thesis_evidence_promotion}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Selection and denominator',
    '',
    compiled.selection.selection_unit,
    '',
    `**Denominator:** ${compiled.selection.denominator_status} — ${compiled.selection.denominator_description}`,
    '',
    '## Intake accounting',
    '',
    `- Sources: ${compiled.source_count}`,
    `- Observations: ${compiled.observation_count}`,
    `- Intended support observations: ${compiled.relation_counts.supports}`,
    `- Weakening observations: ${compiled.relation_counts.weakens}`,
    `- Contradictions: ${compiled.relation_counts.contradicts}`,
    `- Bounded null results: ${compiled.relation_counts.null_result}`,
    `- Repository receipts attached: ${compiled.receipt_count}`,
    '',
    '## Observations',
    ''
  ];
  for (const observation of compiled.observations) {
    lines.push(`### ${observation.observation_id}`, '', `**Relation:** ${observation.relation}`, '', `**Predicate:** ${observation.predicate}`, '', observation.factual_statement, '', `**Allowed language:** ${observation.allowed_language}`, '', '**Forbidden inferences**', '');
    for (const item of observation.forbidden_inferences) lines.push(`- ${item}`);
    if (observation.query_scope) lines.push('', `**Query scope:** ${observation.query_scope}`);
    lines.push('');
  }
  lines.push('## Promotion blockers', '');
  for (const blocker of compiled.selection.promotion_blockers) lines.push(`- ${blocker}`);
  lines.push('', '## Thesis boundary', '', compiled.thesis_consumption.reason, '');
  return lines.join('\n');
}

export function renderThesisCasePacketIndexMarkdown(index) {
  const lines = [
    '# Thesis case-packet intake index',
    '',
    `**Status:** ${index.status}`,
    '',
    '> ' + index.interpretation_contract.copy_ready_caveat,
    '',
    '## Totals',
    '',
    `- Cases: ${index.totals.cases}`,
    `- Sources: ${index.totals.sources}`,
    `- Observations: ${index.totals.observations}`,
    `- Intended support observations: ${index.totals.intended_support_observations}`,
    `- Challenge observations: ${index.totals.challenge_observations}`,
    `- Repository receipts: ${index.totals.repository_receipts}`,
    `- Receipt-complete cases: ${index.totals.receipt_complete_cases}`,
    `- Human-review-complete cases: ${index.totals.human_review_complete_cases}`,
    `- Denominator-complete cases: ${index.totals.denominator_complete_cases}`,
    `- Eligible for promotion: ${index.totals.eligible_for_promotion}`,
    `- Emitted thesis evidence packets: ${index.totals.emitted_thesis_evidence_packets}`,
    '',
    '## Cases',
    '',
    '| Case | Issue | Sources | Observations | Receipts | Receipt custody | Stage | Promotion eligible |',
    '|---|---:|---:|---:|---:|---|---|---:|'
  ];
  for (const item of index.cases) lines.push(`| ${item.case_id} | ${item.issue} | ${item.source_count} | ${item.observation_count} | ${item.receipt_count} | ${item.receipt_custody_status} | ${item.machine_stage} | ${item.eligible_for_thesis_evidence_promotion} |`);
  lines.push('');
  return lines.join('\n');
}
