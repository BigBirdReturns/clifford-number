export const THESIS_SCHEMA_VERSION = 'clifford-thesis@1';
export const THESIS_EVIDENCE_SCHEMA_VERSION = 'clifford-thesis-evidence@1';
export const THESIS_REVIEW_SCHEMA_VERSION = 'clifford-thesis-review@1';
export const THESIS_BUILD_SCHEMA_VERSION = 'clifford-thesis-build@1';

export const THESIS_RELATIONS = Object.freeze([
  'supports',
  'weakens',
  'contradicts',
  'context',
  'coverage',
  'null_result'
]);

export const MACHINE_DISPOSITIONS = Object.freeze([
  'open_no_evidence_packets',
  'collecting_evidence',
  'contested_pending_human_synthesis',
  'eligible_for_human_synthesis'
]);

const RELATIONS = new Set(THESIS_RELATIONS);
const REVIEW_KINDS = new Set(['selection', 'methods', 'claim', 'synthesis', 'final_release']);
const REVIEW_STATUSES = new Set(['pending', 'not_started', 'accepted', 'accepted_with_revisions', 'revisions_required', 'contested', 'rejected', 'inconclusive']);
const EVIDENCE_BEARING_RELATIONS = new Set(['supports', 'weakens', 'contradicts']);
const CHALLENGE_RELATIONS = new Set(['weakens', 'contradicts', 'null_result']);
const FORBIDDEN_PACKET_KEYS = new Set(['finding', 'verdict', 'probability', 'guilt_score', 'influence_score', 'conclusion']);

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function relationCounts(packets) {
  const counts = Object.fromEntries(THESIS_RELATIONS.map(relation => [relation, 0]));
  for (const packet of packets) {
    if (RELATIONS.has(packet.relation)) counts[packet.relation] += 1;
  }
  return counts;
}

function acceptedIndependentReview(reviews, kind) {
  return reviews.some(review => review.review_kind === kind
    && review.independent === true
    && ['accepted', 'accepted_with_revisions'].includes(review.status));
}

function packetSources(packet) {
  return unique([
    ...array(packet.source_families),
    ...array(packet.source_paths)
  ]);
}

function packetCaseIds(packets) {
  return unique(packets.map(packet => packet.case_id));
}

function packetWorkstreams(packets, caseById) {
  return unique(packets.map(packet => caseById.get(packet.case_id)?.workstream));
}

function propositionBase(proposition, packets, caseById) {
  const counts = relationCounts(packets);
  const supportPackets = packets.filter(packet => packet.relation === 'supports');
  const challengePackets = packets.filter(packet => CHALLENGE_RELATIONS.has(packet.relation));
  const caseIds = packetCaseIds(packets.filter(packet => !['coverage', 'context'].includes(packet.relation)));
  const sourceFamilies = unique(packets.flatMap(packetSources));
  const workstreams = packetWorkstreams(packets, caseById);
  const requiredCaseIds = unique(proposition.required_case_ids);
  const coveredRequiredCaseIds = requiredCaseIds.filter(caseId => caseIds.includes(caseId));
  const missingRequiredCaseIds = requiredCaseIds.filter(caseId => !caseIds.includes(caseId));

  return {
    proposition_id: proposition.proposition_id,
    chapter_id: proposition.chapter_id,
    statement: proposition.statement,
    kind: proposition.kind,
    relation_counts: counts,
    evidence_packet_count: packets.length,
    support_packet_count: supportPackets.length,
    challenge_packet_count: challengePackets.length,
    distinct_case_ids: caseIds,
    distinct_case_count: caseIds.length,
    distinct_workstreams: workstreams,
    distinct_workstream_count: workstreams.length,
    source_families: sourceFamilies,
    source_family_count: sourceFamilies.length,
    required_case_ids: requiredCaseIds,
    covered_required_case_ids: coveredRequiredCaseIds,
    missing_required_case_ids: missingRequiredCaseIds,
    falsifiers: unique(proposition.falsifiers),
    alternative_explanations: unique(proposition.alternative_explanations),
    forbidden_inferences: unique(proposition.forbidden_inferences),
    denominator_requirements: unique(proposition.denominator_requirements),
    machine_disposition: 'open_no_evidence_packets',
    readiness_gates: {}
  };
}

function compileOrdinaryProposition(proposition, packets, caseById, selectionReviewAccepted) {
  const compiled = propositionBase(proposition, packets, caseById);
  const minimumCases = Number.isInteger(proposition.minimum_distinct_cases) ? proposition.minimum_distinct_cases : 1;
  const minimumSources = Number.isInteger(proposition.minimum_source_families) ? proposition.minimum_source_families : 1;
  const requiresCounterevidence = proposition.requires_counterevidence !== false;
  const supportPresent = compiled.support_packet_count > 0;
  const caseGate = compiled.distinct_case_count >= minimumCases;
  const sourceGate = compiled.source_family_count >= minimumSources;
  const challengeGate = !requiresCounterevidence || compiled.challenge_packet_count > 0;
  const receiptsReviewed = packets
    .filter(packet => EVIDENCE_BEARING_RELATIONS.has(packet.relation))
    .every(packet => ['human_reviewed', 'independently_reviewed'].includes(packet.review_status));

  compiled.readiness_gates = {
    support_present: supportPresent,
    minimum_distinct_cases: { required: minimumCases, observed: compiled.distinct_case_count, passed: caseGate },
    minimum_source_families: { required: minimumSources, observed: compiled.source_family_count, passed: sourceGate },
    counterevidence_or_null_test: { required: requiresCounterevidence, observed: compiled.challenge_packet_count, passed: challengeGate },
    evidence_packets_human_reviewed: receiptsReviewed,
    independent_selection_review: selectionReviewAccepted
  };

  if (!compiled.evidence_packet_count) compiled.machine_disposition = 'open_no_evidence_packets';
  else if (compiled.relation_counts.contradicts > 0) compiled.machine_disposition = 'contested_pending_human_synthesis';
  else if (supportPresent && caseGate && sourceGate && challengeGate && receiptsReviewed && selectionReviewAccepted) {
    compiled.machine_disposition = 'eligible_for_human_synthesis';
  } else compiled.machine_disposition = 'collecting_evidence';

  return compiled;
}

function compileSynthesisProposition(proposition, packets, caseById, selectionReviewAccepted, compiledById) {
  const compiled = propositionBase(proposition, packets, caseById);
  const dependencyIds = unique(proposition.required_proposition_ids);
  const dependencies = dependencyIds.map(id => compiledById.get(id)).filter(Boolean);
  const eligibleDependencies = dependencies.filter(item => item.machine_disposition === 'eligible_for_human_synthesis');
  const contestedDependencies = dependencies.filter(item => item.machine_disposition === 'contested_pending_human_synthesis');
  const minimumEligible = Number.isInteger(proposition.minimum_eligible_propositions) ? proposition.minimum_eligible_propositions : dependencyIds.length;
  const minimumWorkstreams = Number.isInteger(proposition.minimum_distinct_workstreams) ? proposition.minimum_distinct_workstreams : 1;
  const inheritedWorkstreams = unique(eligibleDependencies.flatMap(item => item.distinct_workstreams));
  const challengePresent = compiled.challenge_packet_count > 0
    || eligibleDependencies.some(item => item.challenge_packet_count > 0)
    || contestedDependencies.length > 0;
  const dependencyGate = eligibleDependencies.length >= minimumEligible;
  const workstreamGate = inheritedWorkstreams.length >= minimumWorkstreams;
  const synthesisReviewAccepted = false;

  compiled.required_proposition_ids = dependencyIds;
  compiled.eligible_proposition_ids = eligibleDependencies.map(item => item.proposition_id);
  compiled.contested_proposition_ids = contestedDependencies.map(item => item.proposition_id);
  compiled.distinct_workstreams = inheritedWorkstreams;
  compiled.distinct_workstream_count = inheritedWorkstreams.length;
  compiled.readiness_gates = {
    minimum_eligible_propositions: { required: minimumEligible, observed: eligibleDependencies.length, passed: dependencyGate },
    minimum_distinct_workstreams: { required: minimumWorkstreams, observed: inheritedWorkstreams.length, passed: workstreamGate },
    counterevidence_or_contestation_visible: challengePresent,
    independent_selection_review: selectionReviewAccepted,
    independent_synthesis_review: synthesisReviewAccepted
  };

  if (!dependencies.some(item => item.evidence_packet_count > 0) && !compiled.evidence_packet_count) {
    compiled.machine_disposition = 'open_no_evidence_packets';
  } else if (contestedDependencies.length || compiled.relation_counts.contradicts > 0) {
    compiled.machine_disposition = 'contested_pending_human_synthesis';
  } else if (dependencyGate && workstreamGate && challengePresent && selectionReviewAccepted) {
    compiled.machine_disposition = 'eligible_for_human_synthesis';
  } else compiled.machine_disposition = 'collecting_evidence';

  return compiled;
}

export function validateThesisBundle({ manifest, evidence, reviews, receiptIds = null }) {
  const errors = [];
  const receiptSet = receiptIds instanceof Set ? receiptIds : receiptIds ? new Set(receiptIds) : null;
  const cases = array(manifest?.case_index);
  const propositions = array(manifest?.propositions);
  const chapters = array(manifest?.chapters);
  const packets = array(evidence?.packets);
  const reviewRows = array(reviews?.reviews);
  const caseIds = new Set(cases.map(item => item.case_id));
  const propositionIds = new Set(propositions.map(item => item.proposition_id));
  const chapterIds = new Set(chapters.map(item => item.chapter_id));

  if (manifest?.schema_version !== THESIS_SCHEMA_VERSION) errors.push('thesis manifest schema mismatch');
  if (evidence?.schema_version !== THESIS_EVIDENCE_SCHEMA_VERSION) errors.push('thesis evidence schema mismatch');
  if (reviews?.schema_version !== THESIS_REVIEW_SCHEMA_VERSION) errors.push('thesis review schema mismatch');
  if (!manifest?.thesis_id || evidence?.thesis_id !== manifest.thesis_id || reviews?.thesis_id !== manifest.thesis_id) errors.push('thesis IDs must match across manifest, evidence, and review registries');
  for (const [label, value] of [['manifest', manifest], ['evidence', evidence], ['reviews', reviews]]) {
    if (value?.graph_effect !== 'none') errors.push(`${label} graph_effect must remain none`);
  }
  if (manifest?.machine_synthesis_ceiling !== 'eligible_for_human_synthesis') errors.push('machine synthesis ceiling must remain eligible_for_human_synthesis');
  if (!manifest?.interpretation_contract?.copy_ready_caveat) errors.push('thesis interpretation caveat is required');
  if (manifest?.bottom_line !== undefined || manifest?.conclusion !== undefined) errors.push('thesis manifest must not contain a bottom-line conclusion');

  const duplicateCaseIds = cases.map(item => item.case_id).filter((id, index, values) => values.indexOf(id) !== index);
  const duplicateIssues = cases.map(item => item.issue).filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateCaseIds.length) errors.push(`duplicate thesis case IDs: ${unique(duplicateCaseIds).join(', ')}`);
  if (duplicateIssues.length) errors.push(`duplicate thesis case issues: ${unique(duplicateIssues).join(', ')}`);
  for (const item of cases) {
    if (!item.case_id || !Number.isInteger(item.issue) || !item.workstream || !item.title) errors.push(`invalid case index row ${item.case_id || '(missing id)'}`);
    if (item.status !== 'contract_only') errors.push(`case ${item.case_id} must remain contract_only until evidence packets are reviewed`);
  }

  const duplicatePropositionIds = propositions.map(item => item.proposition_id).filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicatePropositionIds.length) errors.push(`duplicate proposition IDs: ${unique(duplicatePropositionIds).join(', ')}`);
  for (const proposition of propositions) {
    const id = proposition.proposition_id || '(missing proposition id)';
    if (!proposition.statement || !proposition.kind || !proposition.chapter_id) errors.push(`proposition ${id} lacks statement, kind, or chapter`);
    if (!chapterIds.has(proposition.chapter_id)) errors.push(`proposition ${id} references missing chapter ${proposition.chapter_id}`);
    if (!array(proposition.falsifiers).length) errors.push(`proposition ${id} must declare falsifiers`);
    if (!array(proposition.alternative_explanations).length) errors.push(`proposition ${id} must declare alternative explanations`);
    if (!array(proposition.forbidden_inferences).length) errors.push(`proposition ${id} must declare forbidden inferences`);
    if (!array(proposition.denominator_requirements).length) errors.push(`proposition ${id} must declare denominator requirements`);
    if (proposition.current_disposition !== 'open') errors.push(`proposition ${id} cannot begin beyond open disposition`);
    for (const caseId of array(proposition.required_case_ids)) {
      if (!caseIds.has(caseId)) errors.push(`proposition ${id} references missing case ${caseId}`);
    }
    for (const dependencyId of array(proposition.required_proposition_ids)) {
      if (!propositionIds.has(dependencyId)) errors.push(`proposition ${id} references missing proposition ${dependencyId}`);
      if (dependencyId === proposition.proposition_id) errors.push(`proposition ${id} cannot depend on itself`);
    }
  }

  const packetIds = new Set();
  for (const packet of packets) {
    const id = packet.packet_id || '(missing packet id)';
    if (packetIds.has(packet.packet_id)) errors.push(`duplicate thesis evidence packet ${packet.packet_id}`);
    packetIds.add(packet.packet_id);
    if (!packet.packet_id || !propositionIds.has(packet.proposition_id)) errors.push(`packet ${id} references an invalid proposition`);
    if (packet.case_id && !caseIds.has(packet.case_id)) errors.push(`packet ${id} references missing case ${packet.case_id}`);
    if (!RELATIONS.has(packet.relation)) errors.push(`packet ${id} has invalid relation ${packet.relation}`);
    if (packet.graph_effect !== 'none') errors.push(`packet ${id} graph_effect must remain none`);
    for (const key of FORBIDDEN_PACKET_KEYS) if (Object.hasOwn(packet, key)) errors.push(`packet ${id} contains forbidden field ${key}`);
    if (EVIDENCE_BEARING_RELATIONS.has(packet.relation)) {
      if (!text(packet.summary)) errors.push(`packet ${id} requires a factual summary`);
      if (!array(packet.receipt_ids).length) errors.push(`packet ${id} requires receipt IDs`);
      if (!array(packet.source_paths).length) errors.push(`packet ${id} requires source paths`);
      if (!['human_reviewed', 'independently_reviewed'].includes(packet.review_status)) errors.push(`packet ${id} cannot count as evidence before human review`);
      if (receiptSet) {
        for (const receiptId of array(packet.receipt_ids)) if (!receiptSet.has(receiptId)) errors.push(`packet ${id} references unknown receipt ${receiptId}`);
      }
    }
    if (packet.temporal_claim === true && !packet.valid_from && !packet.valid_until) errors.push(`packet ${id} makes a temporal claim without a documented window`);
    if (packet.relation === 'null_result') {
      if (!packet.query_scope || !packet.source_status) errors.push(`null-result packet ${id} requires query_scope and source_status`);
      if (/no relationship exists|proves absence|nothing found means/i.test(text(packet.summary))) errors.push(`null-result packet ${id} overstates a source-bounded null`);
    }
  }

  const reviewIds = new Set();
  for (const review of reviewRows) {
    const id = review.review_id || '(missing review id)';
    if (reviewIds.has(review.review_id)) errors.push(`duplicate thesis review ${review.review_id}`);
    reviewIds.add(review.review_id);
    if (!review.review_id || !REVIEW_KINDS.has(review.review_kind)) errors.push(`review ${id} has invalid kind`);
    if (!REVIEW_STATUSES.has(review.status)) errors.push(`review ${id} has invalid status ${review.status}`);
    if (review.independent === true && review.reviewer_id && review.author_id && review.reviewer_id === review.author_id) errors.push(`review ${id} is self-review represented as independent`);
    if (review.graph_effect !== 'none') errors.push(`review ${id} graph_effect must remain none`);
  }

  return errors;
}

export function compileThesisBundle({ manifest, evidence, reviews, generatedAt = new Date().toISOString() }) {
  const cases = array(manifest.case_index);
  const packets = array(evidence.packets);
  const reviewRows = array(reviews.reviews);
  const caseById = new Map(cases.map(item => [item.case_id, item]));
  const packetsByProposition = new Map();
  for (const proposition of array(manifest.propositions)) packetsByProposition.set(proposition.proposition_id, []);
  for (const packet of packets) {
    if (!packetsByProposition.has(packet.proposition_id)) packetsByProposition.set(packet.proposition_id, []);
    packetsByProposition.get(packet.proposition_id).push(packet);
  }

  const selectionReviewAccepted = acceptedIndependentReview(reviewRows, 'selection');
  const compiledById = new Map();
  const ordinary = array(manifest.propositions).filter(item => item.kind !== 'cross_case_synthesis');
  for (const proposition of ordinary) {
    const compiled = compileOrdinaryProposition(proposition, packetsByProposition.get(proposition.proposition_id) ?? [], caseById, selectionReviewAccepted);
    compiledById.set(proposition.proposition_id, compiled);
  }
  for (const proposition of array(manifest.propositions).filter(item => item.kind === 'cross_case_synthesis')) {
    const compiled = compileSynthesisProposition(proposition, packetsByProposition.get(proposition.proposition_id) ?? [], caseById, selectionReviewAccepted, compiledById);
    compiledById.set(proposition.proposition_id, compiled);
  }

  const propositionRows = array(manifest.propositions).map(item => compiledById.get(item.proposition_id));
  const dispositionCounts = Object.fromEntries(MACHINE_DISPOSITIONS.map(value => [value, propositionRows.filter(item => item.machine_disposition === value).length]));
  const totalPackets = packets.length;
  const evidencePackets = packets.filter(packet => EVIDENCE_BEARING_RELATIONS.has(packet.relation));
  const challengePackets = packets.filter(packet => CHALLENGE_RELATIONS.has(packet.relation));
  const overallStatus = totalPackets === 0
    ? 'assembly_open_no_evidence_packets'
    : propositionRows.some(item => item.machine_disposition === 'contested_pending_human_synthesis')
      ? 'contested_research_assembly'
      : propositionRows.every(item => item.machine_disposition === 'eligible_for_human_synthesis')
        ? 'eligible_for_human_synthesis'
        : 'collecting_evidence';

  const chapters = array(manifest.chapters).map(chapter => ({
    chapter_id: chapter.chapter_id,
    title: chapter.title,
    proposition_ids: unique(chapter.proposition_ids),
    propositions: unique(chapter.proposition_ids).map(id => compiledById.get(id)).filter(Boolean),
    generated_claims: [],
    open_questions: unique(array(manifest.propositions)
      .filter(item => array(chapter.proposition_ids).includes(item.proposition_id))
      .flatMap(item => item.falsifiers)),
    human_analysis_required: true
  }));

  return {
    schema_version: THESIS_BUILD_SCHEMA_VERSION,
    generated_at: new Date(generatedAt).toISOString(),
    thesis_id: manifest.thesis_id,
    title: manifest.title,
    research_question: manifest.research_question,
    working_thesis: manifest.working_thesis,
    status: overallStatus,
    publication_status: manifest.publication_status,
    graph_effect: 'none',
    conclusion_generated: false,
    bottom_line_generated: false,
    machine_synthesis_ceiling: manifest.machine_synthesis_ceiling,
    counts: {
      case_contracts: cases.length,
      propositions: propositionRows.length,
      evidence_packets: evidencePackets.length,
      challenge_packets: challengePackets.length,
      context_packets: packets.filter(packet => packet.relation === 'context').length,
      coverage_packets: packets.filter(packet => packet.relation === 'coverage').length,
      null_result_packets: packets.filter(packet => packet.relation === 'null_result').length,
      independent_reviews: reviewRows.filter(review => review.independent === true).length
    },
    disposition_counts: dispositionCounts,
    selection_review_accepted: selectionReviewAccepted,
    propositions: propositionRows,
    chapters,
    known_gaps: array(evidence.known_gaps),
    required_reviews: array(reviews.required_reviews),
    interpretation_contract: manifest.interpretation_contract,
    generated_narration_rule: 'Counts, declared questions, proposition text, falsifiers, alternatives, gaps, and review states only. Human analysis must supply any thesis argument.'
  };
}

export function renderThesisMarkdown(compiled) {
  const lines = [
    `# ${compiled.title}`,
    '',
    `**Working status:** ${compiled.status}`,
    '',
    `**Research question:** ${compiled.research_question}`,
    '',
    `**Provisional thesis:** ${compiled.working_thesis}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Assembly state',
    '',
    `- Case contracts: ${compiled.counts.case_contracts}`,
    `- Propositions: ${compiled.counts.propositions}`,
    `- Evidence packets: ${compiled.counts.evidence_packets}`,
    `- Challenge packets: ${compiled.counts.challenge_packets}`,
    `- Independent reviews: ${compiled.counts.independent_reviews}`,
    `- Machine conclusion generated: ${compiled.conclusion_generated}`,
    '',
    '## Proposition ledger',
    ''
  ];

  for (const proposition of compiled.propositions) {
    lines.push(`### ${proposition.proposition_id}`, '');
    lines.push(proposition.statement, '');
    lines.push(`**Machine disposition:** ${proposition.machine_disposition}`, '');
    lines.push(`**Packets:** ${proposition.evidence_packet_count}; support ${proposition.support_packet_count}; challenge ${proposition.challenge_packet_count}; cases ${proposition.distinct_case_count}; source families ${proposition.source_family_count}.`, '');
    if (proposition.missing_required_case_ids?.length) lines.push(`**Missing required cases:** ${proposition.missing_required_case_ids.join(', ')}`, '');
    lines.push('**Falsifiers**', '');
    for (const item of proposition.falsifiers) lines.push(`- ${item}`);
    lines.push('', '**Alternative explanations**', '');
    for (const item of proposition.alternative_explanations) lines.push(`- ${item}`);
    lines.push('', '**Forbidden inferences**', '');
    for (const item of proposition.forbidden_inferences) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Declared gaps', '');
  for (const gap of compiled.known_gaps) {
    lines.push(`### ${gap.gap_id}`, '', `${gap.description}`, '', `**Status:** ${gap.status}`, '', `**Next action:** ${gap.next_action}`, '');
  }
  lines.push('## Review boundary', '');
  for (const review of compiled.required_reviews) lines.push(`- ${review.review_kind}: ${review.status}; independent review required: ${review.independence_required}`);
  lines.push('', '## Generated-output boundary', '', compiled.generated_narration_rule, '');
  return lines.join('\n');
}
