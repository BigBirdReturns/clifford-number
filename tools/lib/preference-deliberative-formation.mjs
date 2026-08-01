import { createHash } from 'node:crypto';

export const PREFERENCE_DELIBERATIVE_FORMATION_FIXTURE_SCHEMA_VERSION = 'preference-deliberative-formation-fixture@1';
export const PREFERENCE_DELIBERATIVE_FORMATION_BUILD_SCHEMA_VERSION = 'preference-deliberative-formation-build@1';

const OPTIONS = ['A', 'B'];
const EXPECTED_WORLD_IDS = [
  'facilitator-summary-distortion-without-vote-change',
  'independent-private-evidence-conversion',
  'one-way-expert-briefing-conversion',
  'public-conformity-vote-without-conversion',
  'reciprocal-reason-exchange-amendment',
  'strategic-logroll-vote-without-focal-conversion'
];
const SPEECH_ACTS = new Set([
  'challenge', 'response', 'amendment', 'endorsement', 'briefing',
  'straw_poll_announcement', 'offer', 'conditional_opposition'
]);
const EXTERNAL_ACTORS = new Set(['EXPERT', 'FACILITATOR']);
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

function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
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

function emptyCounts() {
  return { A: 0, B: 0 };
}

function distribution(counts) {
  const total = sum(Object.values(counts));
  return Object.fromEntries(OPTIONS.map(option => [option, total > 0 ? Number(counts[option]) / total : null]));
}

function totalVariation(left, right) {
  return 0.5 * OPTIONS.reduce((total, option) => total + Math.abs(Number(left[option]) - Number(right[option])), 0);
}

function validateCounts(counts, label, expectedTotal, errors) {
  const value = object(counts);
  if (!sameMembers(Object.keys(value), OPTIONS)) {
    errors.push(`${label} must contain exactly A and B`);
    return;
  }
  for (const option of OPTIONS) {
    if (!Number.isInteger(value[option]) || value[option] < 0) errors.push(`${label}.${option} must be a non-negative integer`);
  }
  if (sum(Object.values(value)) !== expectedTotal) errors.push(`${label} must sum to ${expectedTotal}`);
}

function countGroups(groups, field) {
  const counts = emptyCounts();
  for (const group of array(groups)) counts[group[field]] += Number(group.count);
  return counts;
}

function validateParticipantGroup(group, label, errors) {
  if (!text(group?.group_id)) errors.push(`${label} requires group_id`);
  if (!Number.isInteger(group?.count) || group.count <= 0) errors.push(`${label}.count must be a positive integer`);
  if (!OPTIONS.includes(group?.private_preference)) errors.push(`${label}.private_preference must be A or B`);
  if (!OPTIONS.includes(group?.public_vote)) errors.push(`${label}.public_vote must be A or B`);
}

function expectedClassification() {
  return {
    published_disposition_identifies_private_preference: false,
    information_exposure_is_deliberation: false,
    one_way_briefing_is_reciprocal_reason_exchange: false,
    speaking_opportunity_establishes_reason_uptake: false,
    majority_vote_is_consensus: false,
    strategic_logroll_is_focal_preference_conversion: false,
    published_summary_is_actual_ballot: false,
    reason_exchange_confers_binding_authority: false,
    amendment_is_collective_agreement_without_disposition_rule: false,
    deliberative_process_supported_in_at_least_one_world: true,
    reason_responsive_collective_position_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceDeliberativeFormationFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const groups = array(baseline.participant_groups);
  const initialProposals = array(baseline.initial_proposals);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_DELIBERATIVE_FORMATION_FIXTURE_SCHEMA_VERSION) errors.push('preference deliberative-formation fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  if (!text(baseline.instrument_version) || !text(baseline.wording_hash) || !text(baseline.agenda_family)) errors.push('baseline instrument and agenda identity are required');
  if (!text(baseline.ballot_rule) || baseline.quorum !== baseline.population_total) errors.push('baseline ballot rule and full quorum are required');
  if (groups.length !== 3) errors.push('baseline must contain exactly three participant groups');
  const groupIds = groups.map(group => text(group?.group_id));
  if (unique(groupIds).length !== groups.length) errors.push('baseline group IDs must be unique');
  groups.forEach((group, index) => validateParticipantGroup(group, `baseline group ${index}`, errors));
  if (sum(groups.map(group => group.count)) !== baseline.population_total) errors.push('baseline participant groups must sum to population_total');

  if (!sameMembers(initialProposals.map(proposal => proposal?.proposal_id), ['A0', 'B0'])) errors.push('baseline proposals must contain exactly A0 and B0');
  for (const proposal of initialProposals) {
    if (!OPTIONS.includes(proposal?.family) || proposal?.parent_proposal_id !== null || proposal?.version !== 0 || !array(proposal?.terms).length || !text(proposal?.status)) {
      errors.push(`baseline proposal ${proposal?.proposal_id} is incomplete`);
    }
  }
  const rights = object(baseline.participation_rights);
  for (const key of ['speak','challenge','respond','propose_amendment','private_ballot']) if (rights[key] !== true) errors.push(`baseline participation_rights.${key} must remain true`);
  if (rights.appeal_summary !== false || rights.binding_public_authority !== false) errors.push('baseline must preserve no summary appeal and no binding public authority');
  validateCounts(baseline.expected_private_counts, 'baseline expected_private_counts', baseline.population_total, errors);
  validateCounts(baseline.expected_vote_counts, 'baseline expected_vote_counts', baseline.population_total, errors);
  if (JSON.stringify(countGroups(groups, 'private_preference')) !== JSON.stringify(baseline.expected_private_counts)) errors.push('baseline private counts do not match groups');
  if (JSON.stringify(countGroups(groups, 'public_vote')) !== JSON.stringify(baseline.expected_vote_counts)) errors.push('baseline vote counts do not match groups');

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the six required deliberative worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  const baselineById = Object.fromEntries(groups.map(group => [group.group_id, group]));
  const allowedActors = new Set([...groupIds, ...EXTERNAL_ACTORS]);

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.instrument);
    const privateEvidence = object(world?.private_evidence);
    const events = array(world?.communication_events);
    const proposals = array(world?.proposal_versions);
    const social = object(world?.social_incentive);
    const facilitator = object(world?.facilitator);
    const postGroups = array(world?.post_groups);
    const publication = object(world?.publication);
    const counterfactual = object(world?.counterfactual);

    if (instrument.invariant_from_baseline !== true || instrument.version !== baseline.instrument_version || instrument.wording_hash !== baseline.wording_hash) {
      errors.push(`world ${worldId} must preserve the baseline instrument`);
    }
    if (!text(world?.process_mode)) errors.push(`world ${worldId} process_mode is required`);
    if (!text(privateEvidence.state) || !Array.isArray(privateEvidence.recipient_groups) || !Number.isInteger(privateEvidence.recipient_count) || privateEvidence.recipient_count < 0) {
      errors.push(`world ${worldId} private_evidence custody is incomplete`);
    }
    for (const groupId of array(privateEvidence.recipient_groups)) if (!baselineById[groupId]) errors.push(`world ${worldId} private_evidence references unknown group ${groupId}`);
    const recipientTotal = array(privateEvidence.recipient_groups).reduce((total, groupId) => total + Number(baselineById[groupId]?.count ?? 0), 0);
    if (recipientTotal !== privateEvidence.recipient_count) errors.push(`world ${worldId} private_evidence recipient_count does not match recipient groups`);

    const eventIds = events.map(event => text(event?.event_id));
    if (unique(eventIds).length !== events.length) errors.push(`world ${worldId} communication event IDs must be unique`);
    let priorRound = 0;
    const knownTargets = new Set(initialProposals.map(proposal => proposal.proposal_id));
    for (const event of events) {
      if (!Number.isInteger(event?.round) || event.round <= priorRound) errors.push(`world ${worldId} communication rounds must be strictly increasing positive integers`);
      priorRound = Number(event?.round);
      if (!allowedActors.has(event?.speaker_group)) errors.push(`world ${worldId} event ${event?.event_id} has unknown speaker`);
      if (!Array.isArray(event?.recipient_groups) || !event.recipient_groups.length) errors.push(`world ${worldId} event ${event?.event_id} requires recipients`);
      for (const recipient of array(event?.recipient_groups)) if (!allowedActors.has(recipient)) errors.push(`world ${worldId} event ${event?.event_id} has unknown recipient ${recipient}`);
      if (!SPEECH_ACTS.has(event?.speech_act)) errors.push(`world ${worldId} event ${event?.event_id} has invalid speech_act`);
      if (!text(event?.claim_id) || !Array.isArray(event?.evidence_ids) || !text(event?.uptake_state)) errors.push(`world ${worldId} event ${event?.event_id} lacks claim, evidence, or uptake custody`);
      if (event?.target_claim_id !== null && !knownTargets.has(event?.target_claim_id)) errors.push(`world ${worldId} event ${event?.event_id} targets unknown prior claim or proposal`);
      knownTargets.add(event.claim_id);
    }

    const proposalIds = proposals.map(proposal => text(proposal?.proposal_id));
    if (unique(proposalIds).length !== proposals.length || !proposalIds.includes('A0') || !proposalIds.includes('B0')) errors.push(`world ${worldId} proposal versions must preserve unique A0 and B0`);
    const priorProposalIds = new Set();
    for (const proposal of proposals.sort((left, right) => Number(left.version) - Number(right.version))) {
      if (!OPTIONS.includes(proposal?.family) || !Number.isInteger(proposal?.version) || proposal.version < 0 || !array(proposal?.terms).length || !text(proposal?.status)) errors.push(`world ${worldId} proposal ${proposal?.proposal_id} is incomplete`);
      if (proposal?.parent_proposal_id !== null && !priorProposalIds.has(proposal.parent_proposal_id)) errors.push(`world ${worldId} proposal ${proposal?.proposal_id} has unknown or later parent`);
      priorProposalIds.add(proposal.proposal_id);
    }

    if (!text(social.state) || typeof social.conformity_pressure !== 'boolean' || typeof social.strategic_exchange !== 'boolean') errors.push(`world ${worldId} social-incentive custody is incomplete`);
    if (!Array.isArray(world?.side_agreements)) errors.push(`world ${worldId} side_agreements must be an array`);
    for (const agreement of array(world?.side_agreements)) {
      if (!text(agreement?.agreement_id) || !baselineById[agreement?.beneficiary_group] || !text(agreement?.condition) || !text(agreement?.consideration) || typeof agreement?.binding !== 'boolean') errors.push(`world ${worldId} side agreement is incomplete`);
    }
    if (!text(facilitator.mode) || !text(facilitator.summary_rule) || typeof facilitator.can_reclassify !== 'boolean') errors.push(`world ${worldId} facilitator custody is incomplete`);

    if (!sameMembers(postGroups.map(group => group?.group_id), groupIds) || unique(postGroups.map(group => text(group?.group_id))).length !== postGroups.length) errors.push(`world ${worldId} must preserve all participant identities exactly once`);
    postGroups.forEach((group, index) => {
      validateParticipantGroup(group, `world ${worldId} group ${index}`, errors);
      if (baselineById[group?.group_id] && group.count !== baselineById[group.group_id].count) errors.push(`world ${worldId} group ${group.group_id} must preserve its baseline count`);
    });
    if (sum(postGroups.map(group => group.count)) !== baseline.population_total) errors.push(`world ${worldId} post groups must preserve population_total`);

    if (!['ballot','summary'].includes(publication.source) || !Array.isArray(publication.summary_adjustments)) errors.push(`world ${worldId} publication custody is incomplete`);
    for (const adjustment of array(publication.summary_adjustments)) {
      if (!OPTIONS.includes(adjustment?.from) || !OPTIONS.includes(adjustment?.to) || adjustment.from === adjustment.to || !Number.isInteger(adjustment?.count) || adjustment.count <= 0 || !baselineById[adjustment?.source_group] || !text(adjustment?.rule)) errors.push(`world ${worldId} publication adjustment is invalid`);
    }
    validateCounts(publication.expected_counts, `world ${worldId} publication expected_counts`, baseline.population_total, errors);
    if (!text(counterfactual.intervention) || !text(counterfactual.interpretation)) errors.push(`world ${worldId} counterfactual custody is incomplete`);
    validateCounts(counterfactual.expected_published_counts, `world ${worldId} counterfactual expected_published_counts`, baseline.population_total, errors);

    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of ['expected_private_conversion_count','expected_vote_private_divergence_count','expected_summary_vote_divergence_count','expected_reciprocal_exchange_count','expected_reason_uptake_count','expected_amendment_count']) {
      if (!Number.isInteger(world?.[key]) || world[key] < 0) errors.push(`world ${worldId} ${key} must be a non-negative integer`);
    }
    validateCounts(world?.expected_published_counts, `world ${worldId} expected_published_counts`, baseline.population_total, errors);
    if (typeof world?.deliberative_process_supported !== 'boolean' || typeof world?.reason_responsive_collective_position_supported !== 'boolean') errors.push(`world ${worldId} deliberative support states must be boolean`);
  }

  const requiredMetrics = {
    world_count: 6,
    distinct_published_disposition_signatures: 1,
    distinct_private_preference_signatures: 2,
    distinct_ballot_signatures: 2,
    distinct_process_signatures: 6,
    worlds_with_private_conversion: 3,
    worlds_without_private_conversion: 3,
    worlds_with_reciprocal_reason_exchange: 1,
    worlds_with_reason_uptake: 1,
    worlds_with_amendment_uptake: 1,
    worlds_with_one_way_briefing: 1,
    worlds_with_vote_private_divergence: 2,
    worlds_with_strategic_logroll: 1,
    worlds_with_summary_vote_divergence: 1,
    worlds_with_deliberative_process: 1,
    worlds_with_reason_responsive_collective_position: 1,
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const mandatoryRules = [
    'final_vote_is_not_private_preference_under_conformity_or_strategy',
    'published_summary_is_not_actual_ballot',
    'information_exposure_is_not_deliberation',
    'one_way_briefing_is_not_reciprocal_reason_exchange',
    'speaking_opportunity_is_not_reason_uptake',
    'reason_exchange_is_not_binding_authority',
    'amendment_is_not_collective_agreement_without_disposition_rule',
    'strategic_logroll_is_not_focal_preference_conversion',
    'majority_agreement_is_not_consensus',
    'reason_responsive_deliberation_is_not_public_authorization',
    'deliberative_claim_requires_identity_turn_claim_evidence_challenge_response_uptake_amendment_ballot_summary_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function computePublishedCounts(voteCounts, publication) {
  const counts = { ...voteCounts };
  if (publication.source === 'summary') {
    for (const adjustment of array(publication.summary_adjustments)) {
      counts[adjustment.from] -= adjustment.count;
      counts[adjustment.to] += adjustment.count;
    }
  }
  return counts;
}

export function simulatePreferenceDeliberativeFormationWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const baselineById = Object.fromEntries(array(baseline.participant_groups).map(group => [group.group_id, group]));
  const postGroups = array(world.post_groups);
  const privateCounts = countGroups(postGroups, 'private_preference');
  const voteCounts = countGroups(postGroups, 'public_vote');
  const publishedCounts = computePublishedCounts(voteCounts, world.publication);
  let privateConversionCount = 0;
  let votePrivateDivergenceCount = 0;
  for (const group of postGroups) {
    if (baselineById[group.group_id].private_preference !== group.private_preference) privateConversionCount += group.count;
    if (group.private_preference !== group.public_vote) votePrivateDivergenceCount += group.count;
  }
  const summaryVoteDivergenceCount = 0.5 * OPTIONS.reduce((total, option) => total + Math.abs(publishedCounts[option] - voteCounts[option]), 0);

  const events = array(world.communication_events);
  const challengeClaims = new Set(events.filter(event => event.speech_act === 'challenge').map(event => event.claim_id));
  const reciprocalExchangeCount = events.filter(event => event.speech_act === 'response' && challengeClaims.has(event.target_claim_id)).length;
  const reasonUptakeCount = events.filter(event => ['amendment','endorsement'].includes(event.speech_act) && ['incorporated','accepted'].includes(event.uptake_state)).length;
  const amendmentCount = array(world.proposal_versions).filter(proposal => proposal.parent_proposal_id !== null).length;
  const evidenceCitationCount = events.filter(event => array(event.evidence_ids).length > 0).length;
  const oneWayBriefing = world.process_mode === 'one_way_expert_briefing';
  const strategicLogroll = world.social_incentive?.strategic_exchange === true && array(world.side_agreements).length > 0;
  const conformityVote = world.social_incentive?.conformity_pressure === true && votePrivateDivergenceCount > 0;
  const summaryDistortion = world.publication?.source === 'summary' && summaryVoteDivergenceCount > 0;
  const computedDeliberativeProcess = reciprocalExchangeCount > 0
    && reasonUptakeCount >= 2
    && amendmentCount > 0
    && evidenceCitationCount >= 2
    && world.social_incentive?.conformity_pressure === false
    && world.social_incentive?.strategic_exchange === false
    && world.publication?.source === 'ballot'
    && privateConversionCount > 0
    && votePrivateDivergenceCount === 0;
  const computedReasonResponsivePosition = computedDeliberativeProcess
    && array(world.proposal_versions).some(proposal => proposal.parent_proposal_id === 'A0' && proposal.status === 'adopted');

  const privateDistribution = distribution(privateCounts);
  const voteDistribution = distribution(voteCounts);
  const publishedDistribution = distribution(publishedCounts);
  const processState = {
    process_mode: world.process_mode,
    private_evidence: world.private_evidence,
    communication_events: world.communication_events,
    proposal_versions: world.proposal_versions,
    social_incentive: world.social_incentive,
    side_agreements: world.side_agreements,
    facilitator: world.facilitator,
    publication: world.publication,
    reciprocal_exchange_count: reciprocalExchangeCount,
    reason_uptake_count: reasonUptakeCount,
    amendment_count: amendmentCount
  };

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    instrument: world.instrument,
    process_mode: world.process_mode,
    private_evidence: world.private_evidence,
    communication_events: world.communication_events,
    proposal_versions: world.proposal_versions,
    social_incentive: world.social_incentive,
    side_agreements: world.side_agreements,
    facilitator: world.facilitator,
    post_groups: world.post_groups,
    publication: world.publication,
    counterfactual: world.counterfactual,
    private_counts: privateCounts,
    vote_counts: voteCounts,
    published_counts: publishedCounts,
    baseline_private_distribution: distribution(baseline.expected_private_counts),
    baseline_vote_distribution: distribution(baseline.expected_vote_counts),
    post_private_distribution: privateDistribution,
    post_vote_distribution: voteDistribution,
    published_distribution: publishedDistribution,
    private_conversion_count: privateConversionCount,
    vote_private_divergence_count: votePrivateDivergenceCount,
    summary_vote_divergence_count: summaryVoteDivergenceCount,
    reciprocal_exchange_count: reciprocalExchangeCount,
    reason_uptake_count: reasonUptakeCount,
    amendment_count: amendmentCount,
    evidence_citation_count: evidenceCitationCount,
    one_way_briefing: oneWayBriefing,
    strategic_logroll: strategicLogroll,
    conformity_vote: conformityVote,
    summary_distortion: summaryDistortion,
    deliberative_process_supported: computedDeliberativeProcess,
    reason_responsive_collective_position_supported: computedReasonResponsivePosition,
    published_private_total_variation: totalVariation(publishedDistribution, privateDistribution),
    published_vote_total_variation: totalVariation(publishedDistribution, voteDistribution),
    private_preference_signature_sha256: sha256(privateDistribution),
    ballot_signature_sha256: sha256(voteDistribution),
    published_disposition_signature_sha256: sha256(publishedDistribution),
    process_signature_sha256: sha256(processState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildDeliberativeChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'baseline_identity_preference_agenda_and_rights_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:communication`,
    event_type: 'turn_claim_evidence_challenge_response_and_uptake_ledger',
    evidence_class: 'synthetic_control_process',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: {
      private_evidence: result.private_evidence,
      communication_events: result.communication_events,
      reciprocal_exchange_count: result.reciprocal_exchange_count,
      reason_uptake_count: result.reason_uptake_count,
      evidence_citation_count: result.evidence_citation_count
    }
  });
  push({
    event_id: `${result.world_id}:proposals`,
    event_type: 'proposal_amendment_and_side_agreement_versions',
    evidence_class: 'synthetic_control_process',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:communication`],
    payload: {
      proposal_versions: result.proposal_versions,
      amendment_count: result.amendment_count,
      side_agreements: result.side_agreements,
      social_incentive: result.social_incentive
    }
  });
  push({
    event_id: `${result.world_id}:private-state`,
    event_type: 'post_process_private_preference_state',
    evidence_class: 'synthetic_control_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:proposals`],
    payload: {
      post_groups: result.post_groups,
      private_counts: result.private_counts,
      private_conversion_count: result.private_conversion_count
    }
  });
  push({
    event_id: `${result.world_id}:ballot`,
    event_type: 'public_ballot_state',
    evidence_class: 'synthetic_control_disposition',
    authority: 'fixture_ballot',
    source_event_ids: [`${result.world_id}:private-state`],
    payload: {
      vote_counts: result.vote_counts,
      vote_private_divergence_count: result.vote_private_divergence_count
    }
  });
  push({
    event_id: `${result.world_id}:publication`,
    event_type: 'facilitator_summary_and_published_disposition',
    evidence_class: 'synthetic_control_publication',
    authority: result.publication.source === 'ballot' ? 'fixture_ballot' : 'fixture_facilitator',
    source_event_ids: [`${result.world_id}:ballot`],
    payload: {
      facilitator: result.facilitator,
      publication: result.publication,
      published_counts: result.published_counts,
      summary_vote_divergence_count: result.summary_vote_divergence_count
    }
  });
  push({
    event_id: `${result.world_id}:counterfactual`,
    event_type: 'process_counterfactual',
    evidence_class: 'synthetic_control_counterfactual',
    authority: 'fixture_author',
    source_event_ids: [`${result.world_id}:publication`],
    payload: result.counterfactual
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'deliberative_process_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'deliberative_formation_compiler',
    source_event_ids: [`${result.world_id}:counterfactual`],
    payload: {
      mechanism: result.mechanism,
      one_way_briefing: result.one_way_briefing,
      strategic_logroll: result.strategic_logroll,
      conformity_vote: result.conformity_vote,
      summary_distortion: result.summary_distortion,
      deliberative_process_supported: result.deliberative_process_supported,
      reason_responsive_collective_position_supported: result.reason_responsive_collective_position_supported
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'deliberative_formation_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic communicative and disposition mechanism behind the frozen published majority',
      refused_promotions: [
        'published_disposition_as_private_preference',
        'summary_as_ballot',
        'information_exposure_as_deliberation',
        'speaking_as_uptake',
        'majority_as_consensus',
        'amendment_as_collective_agreement',
        'reason_exchange_as_binding_public_authority',
        'process_distortion_as_manipulation_or_intent'
      ]
    }
  });
  return events;
}

export function validatePreferenceDeliberativeFormationChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('deliberative-formation event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate deliberative-formation event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`deliberative-formation event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`deliberative-formation event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`deliberative-formation event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceDeliberativeFormationFixture(fixture) {
  const errors = validatePreferenceDeliberativeFormationFixture(fixture);
  if (errors.length) throw new Error(`invalid preference deliberative-formation fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceDeliberativeFormationWorld(fixture, world);
    if (JSON.stringify(result.published_counts) !== JSON.stringify(world.expected_published_counts)) throw new Error(`world ${world.world_id} published counts mismatch`);
    if (result.private_conversion_count !== world.expected_private_conversion_count) throw new Error(`world ${world.world_id} private conversion count mismatch`);
    if (result.vote_private_divergence_count !== world.expected_vote_private_divergence_count) throw new Error(`world ${world.world_id} vote-private divergence mismatch`);
    if (result.summary_vote_divergence_count !== world.expected_summary_vote_divergence_count) throw new Error(`world ${world.world_id} summary-vote divergence mismatch`);
    if (result.reciprocal_exchange_count !== world.expected_reciprocal_exchange_count) throw new Error(`world ${world.world_id} reciprocal exchange count mismatch`);
    if (result.reason_uptake_count !== world.expected_reason_uptake_count) throw new Error(`world ${world.world_id} reason uptake count mismatch`);
    if (result.amendment_count !== world.expected_amendment_count) throw new Error(`world ${world.world_id} amendment count mismatch`);
    if (result.deliberative_process_supported !== world.deliberative_process_supported) throw new Error(`world ${world.world_id} deliberative-process classification mismatch`);
    if (result.reason_responsive_collective_position_supported !== world.reason_responsive_collective_position_supported) throw new Error(`world ${world.world_id} reason-responsive classification mismatch`);
    const chain = buildDeliberativeChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_published_disposition_signatures: unique(worlds.map(world => world.published_disposition_signature_sha256)).length,
    distinct_private_preference_signatures: unique(worlds.map(world => world.private_preference_signature_sha256)).length,
    distinct_ballot_signatures: unique(worlds.map(world => world.ballot_signature_sha256)).length,
    distinct_process_signatures: unique(worlds.map(world => world.process_signature_sha256)).length,
    worlds_with_private_conversion: worlds.filter(world => world.private_conversion_count > 0).length,
    worlds_without_private_conversion: worlds.filter(world => world.private_conversion_count === 0).length,
    worlds_with_reciprocal_reason_exchange: worlds.filter(world => world.reciprocal_exchange_count > 0).length,
    worlds_with_reason_uptake: worlds.filter(world => world.reason_uptake_count > 0).length,
    worlds_with_amendment_uptake: worlds.filter(world => world.amendment_count > 0 && world.reason_uptake_count > 0).length,
    worlds_with_one_way_briefing: worlds.filter(world => world.one_way_briefing).length,
    worlds_with_vote_private_divergence: worlds.filter(world => world.vote_private_divergence_count > 0).length,
    worlds_with_strategic_logroll: worlds.filter(world => world.strategic_logroll).length,
    worlds_with_summary_vote_divergence: worlds.filter(world => world.summary_vote_divergence_count > 0).length,
    worlds_with_deliberative_process: worlds.filter(world => world.deliberative_process_supported).length,
    worlds_with_reason_responsive_collective_position: worlds.filter(world => world.reason_responsive_collective_position_supported).length,
    binding_public_authority_worlds: 0,
    baseline_A_share: worlds[0].baseline_private_distribution.A,
    published_A_share: worlds[0].published_distribution.A,
    published_A_share_shift: worlds[0].published_distribution.A - worlds[0].baseline_private_distribution.A,
    maximum_published_private_total_variation: Math.max(...worlds.map(world => world.published_private_total_variation)),
    maximum_published_vote_total_variation: Math.max(...worlds.map(world => world.published_vote_total_variation))
  };
  for (const [key, value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_DELIBERATIVE_FORMATION_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'deliberative_process_equifinality_qualified',
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

export function validatePreferenceDeliberativeFormationBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_DELIBERATIVE_FORMATION_BUILD_SCHEMA_VERSION) errors.push('preference deliberative-formation build schema mismatch');
  if (compiled?.status !== 'deliberative_process_equifinality_qualified') errors.push('compiled deliberative-formation status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled deliberative-formation graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled deliberative-formation must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled deliberative-formation must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled deliberative-formation real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled deliberative worlds are incomplete');

  const expectedMetrics = {
    world_count:6,
    distinct_published_disposition_signatures:1,
    distinct_private_preference_signatures:2,
    distinct_ballot_signatures:2,
    distinct_process_signatures:6,
    worlds_with_private_conversion:3,
    worlds_without_private_conversion:3,
    worlds_with_reciprocal_reason_exchange:1,
    worlds_with_reason_uptake:1,
    worlds_with_amendment_uptake:1,
    worlds_with_one_way_briefing:1,
    worlds_with_vote_private_divergence:2,
    worlds_with_strategic_logroll:1,
    worlds_with_summary_vote_divergence:1,
    worlds_with_deliberative_process:1,
    worlds_with_reason_responsive_collective_position:1,
    binding_public_authority_worlds:0,
    baseline_A_share:0.6,
    published_A_share:0.8,
    published_A_share_shift:0.2,
    maximum_published_private_total_variation:0.2,
    maximum_published_vote_total_variation:0.2
  };
  for (const [key, value] of Object.entries(expectedMetrics)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  for (const world of array(compiled?.worlds)) {
    if (!close(world?.published_distribution?.A, 0.8) || !close(world?.published_distribution?.B, 0.2)) errors.push(`world ${world?.world_id} must preserve the frozen published 80/20 disposition`);
    for (const field of ['private_preference_signature_sha256','ballot_signature_sha256','published_disposition_signature_sha256','process_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceDeliberativeFormationChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  const reciprocal = byId['reciprocal-reason-exchange-amendment'];
  if (reciprocal?.reciprocal_exchange_count !== 1 || reciprocal?.reason_uptake_count !== 2 || reciprocal?.amendment_count !== 1) errors.push('reciprocal world must preserve challenge, response, uptake, and amendment');
  if (reciprocal?.deliberative_process_supported !== true || reciprocal?.reason_responsive_collective_position_supported !== true) errors.push('reciprocal world must preserve the one deliberative and reason-responsive position');
  if (byId['one-way-expert-briefing-conversion']?.one_way_briefing !== true) errors.push('briefing world must preserve one-way information exposure');
  if (byId['public-conformity-vote-without-conversion']?.vote_private_divergence_count !== 200) errors.push('conformity world must preserve 200 vote-private divergences');
  if (byId['strategic-logroll-vote-without-focal-conversion']?.strategic_logroll !== true) errors.push('logroll world must preserve strategic exchange');
  if (byId['facilitator-summary-distortion-without-vote-change']?.summary_vote_divergence_count !== 200) errors.push('summary world must preserve 200 summary-vote divergences');
  if (!close(byId['facilitator-summary-distortion-without-vote-change']?.post_vote_distribution?.A, 0.6)) errors.push('summary world must preserve the 60 percent actual ballot');
  if (unique(compiled?.refusal_rules).length < 11) errors.push('compiled deliberative refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled deliberative caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceDeliberativeFormationMarkdown(compiled) {
  const lines = [
    '# Deliberative reason exchange, vote, and summary custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Published disposition signatures:** ${compiled.metrics.distinct_published_disposition_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen state',
    '',
    `- Baseline private A share: ${percentage(compiled.metrics.baseline_A_share)}`,
    `- Published A share: ${percentage(compiled.metrics.published_A_share)}`,
    `- Published shift: ${percentage(compiled.metrics.published_A_share_shift)}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Private conversions: ${world.private_conversion_count}`);
    lines.push(`- Vote-private divergence: ${world.vote_private_divergence_count}`);
    lines.push(`- Summary-vote divergence: ${world.summary_vote_divergence_count}`);
    lines.push(`- Reciprocal exchanges: ${world.reciprocal_exchange_count}`);
    lines.push(`- Reason uptake events: ${world.reason_uptake_count}`);
    lines.push(`- Amendments: ${world.amendment_count}`);
    lines.push(`- Private A share: ${percentage(world.post_private_distribution.A)}`);
    lines.push(`- Ballot A share: ${percentage(world.post_vote_distribution.A)}`);
    lines.push(`- Published A share: ${percentage(world.published_distribution.A)}`);
    lines.push(`- One-way briefing: ${world.one_way_briefing}`);
    lines.push(`- Strategic logroll: ${world.strategic_logroll}`);
    lines.push(`- Conformity vote: ${world.conformity_vote}`);
    lines.push(`- Summary distortion: ${world.summary_distortion}`);
    lines.push(`- Deliberative process supported: ${world.deliberative_process_supported}`);
    lines.push(`- Reason-responsive collective position supported: ${world.reason_responsive_collective_position_supported}`);
    lines.push(`- Counterfactual: ${world.counterfactual.intervention} → A=${world.counterfactual.expected_published_counts.A}, B=${world.counterfactual.expected_published_counts.B}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value}`);
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
