export const VENDOR_DENOMINATOR_SCHEMA_VERSION = 'synthetic-population-vendor-denominator@1';
export const VENDOR_DENOMINATOR_BUILD_VERSION = 'synthetic-population-vendor-denominator-build@1';

const CLAIM_STATES = new Set([
  'first_party_self_report',
  'first_party_individual_self_report',
  'first_party_seed_case',
  'third_party_commentary_only',
  'source_document_confirmed'
]);

const CLAIMED_DESIGNATIONS = new Set([
  'front_runner',
  'polished_diamonds',
  'startup_to_watch'
]);

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
  for (const value of values) {
    const label = text(value?.[key]) || 'unknown';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function validateVendorDenominator(ledger) {
  const errors = [];
  const candidates = array(ledger?.public_recovery_candidates);
  const members = array(ledger?.denominator_members);
  const source = ledger?.source_document ?? {};
  const recovery = ledger?.recovery_state ?? {};
  const universe = source.reported_universe ?? {};

  if (ledger?.schema_version !== VENDOR_DENOMINATOR_SCHEMA_VERSION) errors.push('vendor denominator schema mismatch');
  if (!ledger?.denominator_id || !ledger?.thesis_id || !ledger?.case_id) errors.push('vendor denominator requires denominator, thesis, and case IDs');
  if (ledger?.graph_effect !== 'none') errors.push('vendor denominator graph_effect must remain none');
  if (ledger?.counts_toward_thesis_evidence !== false) errors.push('vendor denominator recovery must not count as thesis evidence');
  if (!ledger?.interpretation_contract?.copy_ready_caveat) errors.push('vendor denominator interpretation caveat is required');
  if (!array(ledger?.prohibited_uses).length) errors.push('vendor denominator must declare prohibited uses');
  if (!array(ledger?.next_actions).length) errors.push('vendor denominator must declare next actions');
  if (Object.hasOwn(ledger ?? {}, 'coverage_ratio') || Object.hasOwn(recovery, 'coverage_ratio')) errors.push('public recovery coverage ratios are forbidden because visibility is non-random');

  if (source.publisher !== 'Gartner' || source.document_id !== '7718657') errors.push('source document identity mismatch');
  if (universe.reviewed_vendors !== 60 || universe.startups_to_watch !== 33 || universe.front_runners !== 10) {
    errors.push('reported source-universe counts must preserve 60 reviewed, 33 watched, and 10 front-runners');
  }
  if (!['licensed_artifact_unavailable', 'authorized_complete_source_artifact'].includes(source.access_state)) errors.push('invalid source access state');

  if (recovery.transcribed_candidate_count !== candidates.length) errors.push(`transcribed candidate count expected ${candidates.length}, got ${recovery.transcribed_candidate_count}`);
  if (!Number.isInteger(recovery.latest_issue_reported_recovery_count) || recovery.latest_issue_reported_recovery_count < candidates.length) {
    errors.push('latest issue-reported recovery count cannot be smaller than the transcribed set');
  }
  if (recovery.untranscribed_candidate_count !== recovery.latest_issue_reported_recovery_count - candidates.length) {
    errors.push('untranscribed candidate count must equal latest reported minus transcribed');
  }
  if (recovery.recovery_set_is_denominator !== false) errors.push('public recovery set must never be represented as the denominator');

  const candidateIds = candidates.map(candidate => candidate.vendor_id);
  const duplicateCandidateIds = candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index);
  if (duplicateCandidateIds.length) errors.push(`duplicate public recovery candidates: ${unique(duplicateCandidateIds).join(', ')}`);
  for (const candidate of candidates) {
    const id = candidate.vendor_id || '(missing vendor id)';
    if (!candidate.vendor_id || !candidate.label) errors.push(`candidate ${id} lacks a stable ID or label`);
    if (!CLAIM_STATES.has(candidate.claim_state)) errors.push(`candidate ${id} has invalid claim state ${candidate.claim_state}`);
    if (candidate.claimed_designation !== null && candidate.claimed_designation !== undefined && !CLAIMED_DESIGNATIONS.has(candidate.claimed_designation)) {
      errors.push(`candidate ${id} has invalid claimed designation ${candidate.claimed_designation}`);
    }
    if (!candidate.source_url && !candidate.source_ref) errors.push(`candidate ${id} requires a source URL or bounded source reference`);
    if (candidate.counts_toward_thesis_evidence === true) errors.push(`candidate ${id} cannot count toward thesis evidence`);
    if (candidate.claim_state !== 'source_document_confirmed' && candidate.source_document_membership_confirmed !== false) {
      errors.push(`candidate ${id} cannot be source-confirmed from ${candidate.claim_state}`);
    }
    if (candidate.claim_state !== 'source_document_confirmed' && candidate.tier_confirmed !== false) {
      errors.push(`candidate ${id} cannot carry a confirmed tier from ${candidate.claim_state}`);
    }
    if (candidate.claim_state === 'source_document_confirmed' && !candidate.source_span) errors.push(`source-confirmed candidate ${id} requires a source span`);
  }

  const memberIds = members.map(member => member.vendor_id);
  const duplicateMemberIds = memberIds.filter((id, index) => memberIds.indexOf(id) !== index);
  if (duplicateMemberIds.length) errors.push(`duplicate denominator members: ${unique(duplicateMemberIds).join(', ')}`);
  for (const member of members) {
    const id = member.vendor_id || '(missing vendor id)';
    if (!member.vendor_id || !member.label || !member.source_span || !member.tier_label) errors.push(`denominator member ${id} lacks identity, source span, or tier`);
    if (member.human_review_status !== 'accepted') errors.push(`denominator member ${id} requires accepted human identity and tier review`);
  }

  const promotion = ledger?.promotion_gate ?? {};
  if (promotion.required_membership_count !== 33) errors.push('promotion gate must require all 33 watched vendors');
  const freezeReady = source.access_state === 'authorized_complete_source_artifact'
    && source.authorized_copy_present === true
    && source.complete_roster_transcribed === true
    && source.method_text_transcribed === true
    && source.tier_labels_transcribed === true
    && members.length === 33
    && members.every(member => member.human_review_status === 'accepted');
  if (promotion.current_gate_passed !== freezeReady) errors.push('promotion gate state does not match the source-custody and membership requirements');
  if (ledger.usable_as_denominator !== freezeReady) errors.push('usable_as_denominator does not match the promotion gate');
  if (freezeReady && ledger.status !== 'frozen_human_reviewed') errors.push('a complete denominator must use frozen_human_reviewed status');
  if (!freezeReady && ledger.status !== 'blocked_not_frozen') errors.push('an incomplete denominator must remain blocked_not_frozen');
  if (!freezeReady && members.length > 0) errors.push('partial source-document transcriptions belong in recovery candidates until the full denominator is frozen');

  return errors;
}

export function compileVendorDenominator(ledger) {
  const candidates = array(ledger.public_recovery_candidates);
  const members = array(ledger.denominator_members);
  const sourceConfirmed = candidates.filter(candidate => candidate.source_document_membership_confirmed === true);
  return {
    schema_version: VENDOR_DENOMINATOR_BUILD_VERSION,
    captured_at: ledger.captured_at,
    denominator_id: ledger.denominator_id,
    thesis_id: ledger.thesis_id,
    case_id: ledger.case_id,
    status: ledger.status,
    usable_as_denominator: ledger.usable_as_denominator,
    counts_toward_thesis_evidence: false,
    graph_effect: 'none',
    conclusion_generated: false,
    source_document: {
      publisher: ledger.source_document.publisher,
      document_id: ledger.source_document.document_id,
      title: ledger.source_document.title,
      published_at: ledger.source_document.published_at,
      access_state: ledger.source_document.access_state,
      reported_universe: ledger.source_document.reported_universe
    },
    counts: {
      public_recovery_candidates_transcribed: candidates.length,
      latest_issue_reported_recovery_count: ledger.recovery_state.latest_issue_reported_recovery_count,
      public_recoveries_not_yet_transcribed: ledger.recovery_state.untranscribed_candidate_count,
      source_document_membership_confirmed: sourceConfirmed.length,
      denominator_members_frozen: members.length
    },
    claim_state_counts: countBy(candidates, 'claim_state'),
    claimed_designation_counts: countBy(candidates.filter(candidate => candidate.claimed_designation), 'claimed_designation'),
    public_recovery_candidates: candidates.map(candidate => ({
      vendor_id: candidate.vendor_id,
      label: candidate.label,
      claim_state: candidate.claim_state,
      claimed_designation: candidate.claimed_designation ?? null,
      source_document_membership_confirmed: candidate.source_document_membership_confirmed,
      tier_confirmed: candidate.tier_confirmed
    })),
    denominator_members: members,
    recovery_batches: array(ledger.recovery_batches),
    prohibited_uses: array(ledger.prohibited_uses),
    next_actions: array(ledger.next_actions),
    promotion_gate: ledger.promotion_gate,
    thesis_consumption: {
      allowed_relations: ['coverage', 'context'],
      evidence_bearing_relation_allowed: false,
      reason: 'Public recovery records source custody and discovery coverage. It does not establish the neutral vendor denominator or any thesis proposition.'
    },
    interpretation_contract: ledger.interpretation_contract
  };
}

export function renderVendorDenominatorMarkdown(compiled) {
  const counts = compiled.counts;
  const lines = [
    '# Synthetic-population vendor denominator lock',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Usable as denominator:** ${compiled.usable_as_denominator}`,
    '',
    `**Source:** ${compiled.source_document.publisher} ${compiled.source_document.document_id}, ${compiled.source_document.title}`,
    '',
    `**Source access:** ${compiled.source_document.access_state}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Recovery accounting',
    '',
    `- Reported reviewed universe: ${compiled.source_document.reported_universe.reviewed_vendors}`,
    `- Reported startups to watch: ${compiled.source_document.reported_universe.startups_to_watch}`,
    `- Reported front-runners: ${compiled.source_document.reported_universe.front_runners}`,
    `- Public recovery candidates transcribed: ${counts.public_recovery_candidates_transcribed}`,
    `- Latest issue-reported recovery count: ${counts.latest_issue_reported_recovery_count}`,
    `- Public recoveries not yet transcribed: ${counts.public_recoveries_not_yet_transcribed}`,
    `- Source-document memberships confirmed: ${counts.source_document_membership_confirmed}`,
    `- Frozen denominator members: ${counts.denominator_members_frozen}`,
    '',
    '## Public recovery set',
    '',
    '| Vendor | Claim state | Publicly claimed designation | Source-confirmed | Tier confirmed |',
    '|---|---|---|---:|---:|'
  ];
  for (const candidate of compiled.public_recovery_candidates) {
    lines.push(`| ${candidate.label} | ${candidate.claim_state} | ${candidate.claimed_designation ?? 'not recovered'} | ${candidate.source_document_membership_confirmed} | ${candidate.tier_confirmed} |`);
  }
  lines.push('', '## Prohibited uses', '');
  for (const item of compiled.prohibited_uses) lines.push(`- ${item}`);
  lines.push('', '## Next actions', '');
  for (const item of compiled.next_actions) lines.push(`- ${item}`);
  lines.push('', '## Thesis boundary', '', compiled.thesis_consumption.reason, '');
  return lines.join('\n');
}
