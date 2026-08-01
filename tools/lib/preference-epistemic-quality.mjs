import { createHash } from 'node:crypto';

export const PREFERENCE_EPISTEMIC_QUALITY_FIXTURE_SCHEMA_VERSION = 'preference-epistemic-quality-fixture@1';
export const PREFERENCE_EPISTEMIC_QUALITY_BUILD_SCHEMA_VERSION = 'preference-epistemic-quality-build@1';

const OPTIONS = ['A', 'B'];
const EXPECTED_WORLD_IDS = [
  'common-model-expert-monoculture',
  'derivative-source-laundering',
  'fabricated-or-poisoned-evidence',
  'independent-diverse-corroboration-minority-correction',
  'information-cascade-without-source-inspection',
  'suppressed-minority-counterevidence'
];
const SPEECH_ACTS = new Set(['challenge', 'response', 'amendment', 'endorsement']);
const VALIDITY_STATES = new Set(['valid', 'invalid']);
const INTEGRITY_STATES = new Set(['verified', 'fabricated', 'poisoned']);
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

function validateParticipantGroup(group, label, errors) {
  if (!text(group?.group_id)) errors.push(`${label} requires group_id`);
  if (!Number.isInteger(group?.count) || group.count <= 0) errors.push(`${label}.count must be a positive integer`);
  if (!OPTIONS.includes(group?.private_preference)) errors.push(`${label}.private_preference must be A or B`);
  if (!OPTIONS.includes(group?.public_vote)) errors.push(`${label}.public_vote must be A or B`);
}

function countGroups(groups, field) {
  const counts = emptyCounts();
  for (const group of array(groups)) counts[group[field]] += Number(group.count);
  return counts;
}

function expectedClassification() {
  return {
    citation_count_identifies_source_independence: false,
    speaker_count_identifies_epistemic_diversity: false,
    nominal_agent_count_identifies_model_independence: false,
    claim_repetition_is_corroboration: false,
    majority_agreement_identifies_truth: false,
    correct_family_vote_identifies_correct_proposal_version: false,
    surfaced_evidence_set_is_complete_available_evidence: false,
    source_diversity_identifies_evidence_validity: false,
    minority_group_size_identifies_evidence_quality: false,
    source_diverse_reason_quality_supported_in_at_least_one_world: true,
    minority_correction_path_supported: true,
    collective_agreement_supported: false,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

function validateSourceRegistry(sources, errors) {
  const sourceIds = sources.map(source => text(source?.source_id));
  if (unique(sourceIds).length !== sources.length) errors.push('source registry IDs must be unique');
  const byId = Object.fromEntries(sources.map(source => [source.source_id, source]));
  for (const source of sources) {
    const id = text(source?.source_id) || '(missing source ID)';
    if (!text(source?.root_source_id) || !text(source?.independence_cluster_id) || !text(source?.source_class)) errors.push(`source ${id} requires root, cluster, and class`);
    if (!VALIDITY_STATES.has(source?.validity_state)) errors.push(`source ${id} has invalid validity_state`);
    if (!INTEGRITY_STATES.has(source?.integrity_state)) errors.push(`source ${id} has invalid integrity_state`);
    if (!byId[source?.root_source_id]) errors.push(`source ${id} references missing root source ${source?.root_source_id}`);
    if (source?.derivation_parent_id !== null && !byId[source?.derivation_parent_id]) errors.push(`source ${id} references missing derivation parent ${source?.derivation_parent_id}`);
    const root = byId[source?.root_source_id];
    if (root && (root.root_source_id !== root.source_id || root.derivation_parent_id !== null)) errors.push(`source ${id} root source is not a lineage root`);
    const seen = new Set([id]);
    let cursor = source?.derivation_parent_id;
    while (cursor !== null && cursor !== undefined) {
      if (seen.has(cursor)) {
        errors.push(`source ${id} derivation lineage contains a cycle`);
        break;
      }
      seen.add(cursor);
      cursor = byId[cursor]?.derivation_parent_id;
    }
  }
}

export function validatePreferenceEpistemicQualityFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const groups = array(baseline.participant_groups);
  const proposals = array(baseline.proposal_registry);
  const sources = array(baseline.source_registry);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_EPISTEMIC_QUALITY_FIXTURE_SCHEMA_VERSION) errors.push('preference epistemic-quality fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  if (!text(baseline.instrument_version) || !text(baseline.wording_hash)) errors.push('baseline instrument identity is required');
  if (!sameMembers(baseline.speaker_slots, ['SPK-A', 'SPK-BR', 'SPK-BS', 'SPK-X'])) errors.push('baseline speaker slots are incomplete');
  if (baseline.evidence_presentations_per_world !== 4) errors.push('baseline evidence_presentations_per_world must remain 4');
  if (groups.length !== 3) errors.push('baseline must preserve three participant groups');
  const groupIds = groups.map(group => text(group?.group_id));
  if (unique(groupIds).length !== groups.length) errors.push('baseline participant group IDs must be unique');
  groups.forEach((group, index) => validateParticipantGroup(group, `baseline group ${index}`, errors));
  if (sum(groups.map(group => group.count)) !== baseline.population_total) errors.push('baseline participant groups must sum to population_total');
  validateCounts(baseline.expected_private_counts, 'baseline expected_private_counts', baseline.population_total, errors);
  validateCounts(baseline.expected_vote_counts, 'baseline expected_vote_counts', baseline.population_total, errors);
  if (JSON.stringify(countGroups(groups, 'private_preference')) !== JSON.stringify(baseline.expected_private_counts)) errors.push('baseline private counts do not match participant groups');
  if (JSON.stringify(countGroups(groups, 'public_vote')) !== JSON.stringify(baseline.expected_vote_counts)) errors.push('baseline vote counts do not match participant groups');

  if (!text(baseline.reference_constraint?.constraint_id) || !text(baseline.reference_constraint?.description)) errors.push('baseline reference constraint is incomplete');
  if (!sameMembers(proposals.map(proposal => proposal?.proposal_id), ['A0', 'A1', 'B0'])) errors.push('proposal registry must contain exactly A0, A1, and B0');
  const proposalById = Object.fromEntries(proposals.map(proposal => [proposal.proposal_id, proposal]));
  for (const proposal of proposals) {
    if (!OPTIONS.includes(proposal?.family) || !Number.isInteger(proposal?.version) || proposal.version < 0 || !array(proposal?.terms).length) errors.push(`proposal ${proposal?.proposal_id} is incomplete`);
    if (proposal?.parent_proposal_id !== null && !proposalById[proposal.parent_proposal_id]) errors.push(`proposal ${proposal?.proposal_id} has unknown parent`);
    if (!Number.isFinite(Number(proposal?.objective_score)) || proposal.objective_score < 0 || proposal.objective_score > 1) errors.push(`proposal ${proposal?.proposal_id} objective_score must be a probability`);
    if (typeof proposal?.constraint_pass !== 'boolean' || typeof proposal?.reference_acceptable !== 'boolean') errors.push(`proposal ${proposal?.proposal_id} reference evaluation must be boolean`);
  }
  if (baseline.reference_preferred_proposal_id !== 'A1' || proposalById.A1?.reference_acceptable !== true || proposalById.A0?.reference_acceptable !== false) errors.push('baseline reference proposal contract must preserve preferred A1 and unacceptable A0');
  validateSourceRegistry(sources, errors);
  const sourceById = Object.fromEntries(sources.map(source => [source.source_id, source]));

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the six required epistemic-quality worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  const speakers = new Set(baseline.speaker_slots);
  const baselineById = Object.fromEntries(groups.map(group => [group.group_id, group]));

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.instrument);
    const presentations = array(world?.evidence_presentations);
    const reasonEvents = array(world?.reason_events);
    const postGroups = array(world?.post_groups);
    const publication = object(world?.publication);
    const counterfactual = object(world?.counterfactual);

    if (instrument.invariant_from_baseline !== true || instrument.version !== baseline.instrument_version || instrument.wording_hash !== baseline.wording_hash) errors.push(`world ${worldId} must preserve the baseline instrument`);
    if (presentations.length !== baseline.evidence_presentations_per_world) errors.push(`world ${worldId} must preserve four evidence presentations`);
    const presentationIds = presentations.map(item => text(item?.presentation_id));
    if (unique(presentationIds).length !== presentations.length) errors.push(`world ${worldId} presentation IDs must be unique`);
    const speakerIds = presentations.map(item => text(item?.speaker_id));
    if (!sameMembers(speakerIds, baseline.speaker_slots) || unique(speakerIds).length !== baseline.speaker_slots.length) errors.push(`world ${worldId} must preserve four distinct speaker slots`);
    const orders = presentations.map(item => item?.order).sort((left, right) => Number(left) - Number(right));
    if (JSON.stringify(orders) !== JSON.stringify([1, 2, 3, 4])) errors.push(`world ${worldId} presentation order must be exactly 1 through 4`);
    const knownClaims = new Set();
    for (const presentation of [...presentations].sort((left, right) => left.order - right.order)) {
      if (!speakers.has(presentation?.speaker_id)) errors.push(`world ${worldId} presentation ${presentation?.presentation_id} has unknown speaker`);
      if (!text(presentation?.claim_id) || knownClaims.has(presentation.claim_id)) errors.push(`world ${worldId} presentation claim IDs must be unique and non-empty`);
      knownClaims.add(presentation.claim_id);
      if (!proposalById[presentation?.target_proposal_id]) errors.push(`world ${worldId} presentation ${presentation?.presentation_id} targets unknown proposal`);
      if (!sourceById[presentation?.source_id]) errors.push(`world ${worldId} presentation ${presentation?.presentation_id} references unknown source`);
      if (typeof presentation?.inspected !== 'boolean' || typeof presentation?.replicated !== 'boolean' || typeof presentation?.visible_to_decision !== 'boolean' || !text(presentation?.effect)) errors.push(`world ${worldId} presentation ${presentation?.presentation_id} custody is incomplete`);
    }

    const reasonIds = reasonEvents.map(event => text(event?.event_id));
    if (unique(reasonIds).length !== reasonEvents.length) errors.push(`world ${worldId} reason event IDs must be unique`);
    let priorRound = 0;
    const knownTargets = new Set([...knownClaims, ...Object.keys(proposalById)]);
    for (const event of reasonEvents) {
      if (!Number.isInteger(event?.round) || event.round <= priorRound) errors.push(`world ${worldId} reason rounds must be strictly increasing positive integers`);
      priorRound = Number(event?.round);
      if (!speakers.has(event?.speaker_id) || !SPEECH_ACTS.has(event?.speech_act)) errors.push(`world ${worldId} reason event ${event?.event_id} has invalid speaker or speech act`);
      if (!knownTargets.has(event?.target_claim_id)) errors.push(`world ${worldId} reason event ${event?.event_id} targets unknown claim or proposal`);
      if (!Array.isArray(event?.evidence_ids) || event.evidence_ids.some(id => !presentationIds.includes(id))) errors.push(`world ${worldId} reason event ${event?.event_id} references unknown evidence`);
      if (!proposalById[event?.proposal_id] || !text(event?.uptake_state)) errors.push(`world ${worldId} reason event ${event?.event_id} proposal or uptake custody is incomplete`);
    }

    if (!proposalById[world?.final_proposal_id]) errors.push(`world ${worldId} final proposal is unknown`);
    if (!sameMembers(postGroups.map(group => group?.group_id), groupIds) || unique(postGroups.map(group => text(group?.group_id))).length !== postGroups.length) errors.push(`world ${worldId} must preserve all participant identities exactly once`);
    postGroups.forEach((group, index) => {
      validateParticipantGroup(group, `world ${worldId} group ${index}`, errors);
      if (baselineById[group?.group_id] && group.count !== baselineById[group.group_id].count) errors.push(`world ${worldId} group ${group.group_id} must preserve its baseline count`);
    });
    if (sum(postGroups.map(group => group.count)) !== baseline.population_total) errors.push(`world ${worldId} post groups must preserve population_total`);
    if (publication.source !== 'ballot') errors.push(`world ${worldId} publication source must remain ballot`);
    validateCounts(publication.expected_counts, `world ${worldId} publication expected_counts`, baseline.population_total, errors);
    if (!text(counterfactual.intervention) || !text(counterfactual.expected_final_proposal_id) || !text(counterfactual.interpretation)) errors.push(`world ${worldId} counterfactual custody is incomplete`);
    validateCounts(counterfactual.expected_counts, `world ${worldId} counterfactual expected_counts`, baseline.population_total, errors);

    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of [
      'expected_root_source_count', 'expected_independence_cluster_count', 'expected_valid_evidence_count',
      'expected_inspected_evidence_count', 'expected_visible_evidence_count', 'expected_derivative_count',
      'expected_model_output_count', 'expected_uninspected_repeat_count', 'expected_suppressed_count',
      'expected_invalid_evidence_count', 'expected_challenge_count', 'expected_response_count',
      'expected_uptake_count', 'expected_amendment_count'
    ]) if (!Number.isInteger(world?.[key]) || world[key] < 0) errors.push(`world ${worldId} ${key} must be a non-negative integer`);
    for (const key of ['expected_reference_acceptable', 'expected_wrong_A_version', 'source_diverse_reason_quality_supported', 'minority_correction_supported']) if (typeof world?.[key] !== 'boolean') errors.push(`world ${worldId} ${key} must be boolean`);
  }

  const requiredMetrics = {
    world_count: 6,
    distinct_published_disposition_signatures: 1,
    distinct_private_preference_signatures: 1,
    distinct_ballot_signatures: 1,
    distinct_final_proposal_signatures: 2,
    distinct_evidence_dependency_signatures: 6,
    worlds_with_four_speakers: 6,
    worlds_with_four_evidence_presentations: 6,
    worlds_with_reference_preferred_proposal: 1,
    worlds_with_wrong_A_version: 5,
    worlds_with_independent_source_diversity: 1,
    worlds_with_derivative_source_laundering: 1,
    worlds_with_model_monoculture: 1,
    worlds_with_information_cascade: 1,
    worlds_with_suppressed_counterevidence: 1,
    worlds_with_evidence_integrity_failure: 1,
    worlds_with_minority_correction_uptake: 1,
    worlds_with_challenge_response_amendment: 1,
    worlds_with_complete_source_root_provenance: 6,
    submitted_counterevidence_worlds: 2,
    visible_counterevidence_worlds: 1,
    minimum_root_source_count: 1,
    maximum_root_source_count: 4,
    minimum_valid_evidence_count: 0,
    maximum_valid_evidence_count: 4,
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const mandatoryRules = [
    'citation_count_is_not_source_independence',
    'speaker_count_is_not_epistemic_diversity',
    'nominal_expert_plurality_is_not_model_or_corpus_independence',
    'claim_repetition_is_not_corroboration',
    'agreement_is_not_truth',
    'correct_proposal_family_is_not_correct_proposal_version',
    'absence_from_surfaced_evidence_is_not_absence_of_counterevidence',
    'minority_group_size_is_not_evidence_quality',
    'source_diversity_is_not_evidence_validity',
    'reason_quality_is_not_collective_agreement_or_public_authorization',
    'epistemic_claim_requires_source_root_derivation_independence_model_corpus_integrity_visibility_challenge_uptake_version_outcome_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 9) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceEpistemicQualityWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const sourceById = Object.fromEntries(array(baseline.source_registry).map(source => [source.source_id, source]));
  const proposalById = Object.fromEntries(array(baseline.proposal_registry).map(proposal => [proposal.proposal_id, proposal]));
  const presentations = array(world.evidence_presentations).map(presentation => ({ ...presentation, source: sourceById[presentation.source_id] }));
  const privateCounts = countGroups(world.post_groups, 'private_preference');
  const voteCounts = countGroups(world.post_groups, 'public_vote');
  const publishedCounts = { ...voteCounts };
  const roots = unique(presentations.map(item => item.source.root_source_id));
  const clusters = unique(presentations.map(item => item.source.independence_cluster_id));
  const validEvidenceCount = presentations.filter(item => item.source.validity_state === 'valid').length;
  const inspectedEvidenceCount = presentations.filter(item => item.inspected).length;
  const visibleEvidenceCount = presentations.filter(item => item.visible_to_decision).length;
  const derivativeCount = presentations.filter(item => item.source.source_class === 'derivative_reporting').length;
  const modelOutputCount = presentations.filter(item => item.source.source_class === 'model_output').length;
  const uninspectedRepeatCount = presentations.filter(item => item.source.source_class === 'uninspected_claim_repeat' && item.inspected === false).length;
  const suppressedCount = presentations.filter(item => item.visible_to_decision === false).length;
  const invalidEvidenceCount = presentations.filter(item => item.source.validity_state === 'invalid' || item.source.integrity_state !== 'verified').length;
  const challengeCount = array(world.reason_events).filter(event => event.speech_act === 'challenge').length;
  const responseCount = array(world.reason_events).filter(event => event.speech_act === 'response').length;
  const uptakeCount = array(world.reason_events).filter(event => ['incorporated', 'accepted'].includes(event.uptake_state)).length;
  const amendmentCount = array(world.reason_events).filter(event => event.speech_act === 'amendment').length;
  const finalProposal = proposalById[world.final_proposal_id];
  const referenceAcceptable = finalProposal.reference_acceptable === true;
  const wrongAVersion = finalProposal.family === 'A' && finalProposal.proposal_id !== baseline.reference_preferred_proposal_id;
  const submittedCounterevidence = presentations.some(item => item.effect === 'reveals_A0_burden_constraint_failure');
  const visibleCounterevidence = presentations.some(item => item.effect === 'reveals_A0_burden_constraint_failure' && item.visible_to_decision === true);
  const fullSourceRootProvenance = presentations.every(item => text(item.source.root_source_id) && sourceById[item.source.root_source_id]);
  const derivativeSourceLaundering = derivativeCount === 4 && roots.length === 1;
  const modelMonoculture = modelOutputCount === 4 && roots.length === 1 && clusters.length === 1;
  const informationCascade = uninspectedRepeatCount === 3 && inspectedEvidenceCount === 1;
  const suppressedCounterevidence = suppressedCount > 0 && submittedCounterevidence && !visibleCounterevidence;
  const evidenceIntegrityFailure = invalidEvidenceCount === 4;
  const minorityCorrection = challengeCount === 1 && responseCount === 1 && amendmentCount === 1 && uptakeCount >= 2 && finalProposal.proposal_id === 'A1';
  const sourceDiverseReasonQuality = roots.length === 4
    && clusters.length === 4
    && validEvidenceCount === 4
    && inspectedEvidenceCount === 4
    && visibleEvidenceCount === 4
    && invalidEvidenceCount === 0
    && minorityCorrection
    && referenceAcceptable;
  const challengeResponseAmendment = challengeCount > 0 && responseCount > 0 && amendmentCount > 0;
  const evidenceDependencyState = presentations.map(item => ({
    presentation_id: item.presentation_id,
    order: item.order,
    speaker_id: item.speaker_id,
    claim_id: item.claim_id,
    target_proposal_id: item.target_proposal_id,
    source_id: item.source.source_id,
    root_source_id: item.source.root_source_id,
    derivation_parent_id: item.source.derivation_parent_id,
    independence_cluster_id: item.source.independence_cluster_id,
    source_class: item.source.source_class,
    validity_state: item.source.validity_state,
    integrity_state: item.source.integrity_state,
    inspected: item.inspected,
    replicated: item.replicated,
    visible_to_decision: item.visible_to_decision,
    effect: item.effect
  }));

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    instrument: world.instrument,
    presentations: evidenceDependencyState,
    reason_events: world.reason_events,
    final_proposal_id: world.final_proposal_id,
    final_proposal: finalProposal,
    post_groups: world.post_groups,
    publication: world.publication,
    counterfactual: world.counterfactual,
    private_counts: privateCounts,
    vote_counts: voteCounts,
    published_counts: publishedCounts,
    post_private_distribution: distribution(privateCounts),
    post_vote_distribution: distribution(voteCounts),
    published_distribution: distribution(publishedCounts),
    speaker_count: unique(presentations.map(item => item.speaker_id)).length,
    evidence_presentation_count: presentations.length,
    root_source_count: roots.length,
    independence_cluster_count: clusters.length,
    valid_evidence_count: validEvidenceCount,
    inspected_evidence_count: inspectedEvidenceCount,
    visible_evidence_count: visibleEvidenceCount,
    derivative_count: derivativeCount,
    model_output_count: modelOutputCount,
    uninspected_repeat_count: uninspectedRepeatCount,
    suppressed_count: suppressedCount,
    invalid_evidence_count: invalidEvidenceCount,
    challenge_count: challengeCount,
    response_count: responseCount,
    uptake_count: uptakeCount,
    amendment_count: amendmentCount,
    reference_acceptable: referenceAcceptable,
    wrong_A_version: wrongAVersion,
    submitted_counterevidence: submittedCounterevidence,
    visible_counterevidence: visibleCounterevidence,
    full_source_root_provenance: fullSourceRootProvenance,
    derivative_source_laundering: derivativeSourceLaundering,
    model_monoculture: modelMonoculture,
    information_cascade: informationCascade,
    suppressed_counterevidence: suppressedCounterevidence,
    evidence_integrity_failure: evidenceIntegrityFailure,
    minority_correction_supported: minorityCorrection,
    challenge_response_amendment_supported: challengeResponseAmendment,
    source_diverse_reason_quality_supported: sourceDiverseReasonQuality,
    private_preference_signature_sha256: sha256(distribution(privateCounts)),
    ballot_signature_sha256: sha256(distribution(voteCounts)),
    published_disposition_signature_sha256: sha256(distribution(publishedCounts)),
    final_proposal_signature_sha256: sha256({ proposal_id: finalProposal.proposal_id, terms: finalProposal.terms, reference_acceptable: finalProposal.reference_acceptable }),
    evidence_dependency_signature_sha256: sha256(evidenceDependencyState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildEpistemicChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'baseline_identity_instrument_reference_and_source_registry_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:evidence`,
    event_type: 'speaker_claim_source_root_derivation_and_visibility_ledger',
    evidence_class: 'synthetic_control_evidence',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: result.presentations
  });
  push({
    event_id: `${result.world_id}:dependency`,
    event_type: 'source_independence_integrity_and_inspection_resolved',
    evidence_class: 'deterministic_control_classification',
    authority: 'epistemic_quality_compiler',
    source_event_ids: [`${result.world_id}:evidence`],
    payload: {
      root_source_count: result.root_source_count,
      independence_cluster_count: result.independence_cluster_count,
      valid_evidence_count: result.valid_evidence_count,
      inspected_evidence_count: result.inspected_evidence_count,
      visible_evidence_count: result.visible_evidence_count,
      derivative_count: result.derivative_count,
      model_output_count: result.model_output_count,
      uninspected_repeat_count: result.uninspected_repeat_count,
      suppressed_count: result.suppressed_count,
      invalid_evidence_count: result.invalid_evidence_count
    }
  });
  push({
    event_id: `${result.world_id}:reason`,
    event_type: 'challenge_response_uptake_and_amendment_ledger',
    evidence_class: 'synthetic_control_process',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:dependency`],
    payload: {
      reason_events: result.reason_events,
      challenge_count: result.challenge_count,
      response_count: result.response_count,
      uptake_count: result.uptake_count,
      amendment_count: result.amendment_count
    }
  });
  push({
    event_id: `${result.world_id}:disposition`,
    event_type: 'private_ballot_publication_and_proposal_version_state',
    evidence_class: 'synthetic_control_disposition',
    authority: 'fixture_ballot',
    source_event_ids: [`${result.world_id}:reason`],
    payload: {
      post_groups: result.post_groups,
      private_counts: result.private_counts,
      vote_counts: result.vote_counts,
      published_counts: result.published_counts,
      final_proposal: result.final_proposal,
      reference_acceptable: result.reference_acceptable,
      wrong_A_version: result.wrong_A_version
    }
  });
  push({
    event_id: `${result.world_id}:counterfactual`,
    event_type: 'source_dependency_visibility_or_integrity_counterfactual',
    evidence_class: 'synthetic_control_counterfactual',
    authority: 'fixture_author',
    source_event_ids: [`${result.world_id}:disposition`],
    payload: result.counterfactual
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'epistemic_quality_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'epistemic_quality_compiler',
    source_event_ids: [`${result.world_id}:counterfactual`],
    payload: {
      mechanism: result.mechanism,
      derivative_source_laundering: result.derivative_source_laundering,
      model_monoculture: result.model_monoculture,
      information_cascade: result.information_cascade,
      suppressed_counterevidence: result.suppressed_counterevidence,
      evidence_integrity_failure: result.evidence_integrity_failure,
      minority_correction_supported: result.minority_correction_supported,
      source_diverse_reason_quality_supported: result.source_diverse_reason_quality_supported
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'epistemic_quality_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic evidence-dependence and proposal-quality mechanism behind the frozen majority',
      refused_promotions: [
        'citation_count_as_independence',
        'speaker_count_as_epistemic_diversity',
        'agent_plurality_as_model_independence',
        'repetition_as_corroboration',
        'agreement_as_truth',
        'family_majority_as_correct_version',
        'surface_absence_as_no_counterevidence',
        'source_diversity_as_validity',
        'reason_quality_as_public_authority'
      ]
    }
  });
  return events;
}

export function validatePreferenceEpistemicQualityChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('epistemic-quality event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate epistemic-quality event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`epistemic-quality event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`epistemic-quality event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`epistemic-quality event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceEpistemicQualityFixture(fixture) {
  const errors = validatePreferenceEpistemicQualityFixture(fixture);
  if (errors.length) throw new Error(`invalid preference epistemic-quality fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceEpistemicQualityWorld(fixture, world);
    const checks = {
      root_source_count: 'expected_root_source_count',
      independence_cluster_count: 'expected_independence_cluster_count',
      valid_evidence_count: 'expected_valid_evidence_count',
      inspected_evidence_count: 'expected_inspected_evidence_count',
      visible_evidence_count: 'expected_visible_evidence_count',
      derivative_count: 'expected_derivative_count',
      model_output_count: 'expected_model_output_count',
      uninspected_repeat_count: 'expected_uninspected_repeat_count',
      suppressed_count: 'expected_suppressed_count',
      invalid_evidence_count: 'expected_invalid_evidence_count',
      challenge_count: 'expected_challenge_count',
      response_count: 'expected_response_count',
      uptake_count: 'expected_uptake_count',
      amendment_count: 'expected_amendment_count'
    };
    for (const [observed, expected] of Object.entries(checks)) if (result[observed] !== world[expected]) throw new Error(`world ${world.world_id} ${observed} mismatch`);
    if (result.reference_acceptable !== world.expected_reference_acceptable) throw new Error(`world ${world.world_id} reference acceptability mismatch`);
    if (result.wrong_A_version !== world.expected_wrong_A_version) throw new Error(`world ${world.world_id} wrong A version mismatch`);
    if (result.source_diverse_reason_quality_supported !== world.source_diverse_reason_quality_supported) throw new Error(`world ${world.world_id} reason-quality classification mismatch`);
    if (result.minority_correction_supported !== world.minority_correction_supported) throw new Error(`world ${world.world_id} minority-correction classification mismatch`);
    if (JSON.stringify(result.published_counts) !== JSON.stringify(world.publication.expected_counts)) throw new Error(`world ${world.world_id} published counts mismatch`);
    const chain = buildEpistemicChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_published_disposition_signatures: unique(worlds.map(world => world.published_disposition_signature_sha256)).length,
    distinct_private_preference_signatures: unique(worlds.map(world => world.private_preference_signature_sha256)).length,
    distinct_ballot_signatures: unique(worlds.map(world => world.ballot_signature_sha256)).length,
    distinct_final_proposal_signatures: unique(worlds.map(world => world.final_proposal_signature_sha256)).length,
    distinct_evidence_dependency_signatures: unique(worlds.map(world => world.evidence_dependency_signature_sha256)).length,
    worlds_with_four_speakers: worlds.filter(world => world.speaker_count === 4).length,
    worlds_with_four_evidence_presentations: worlds.filter(world => world.evidence_presentation_count === 4).length,
    worlds_with_reference_preferred_proposal: worlds.filter(world => world.final_proposal_id === fixture.baseline.reference_preferred_proposal_id).length,
    worlds_with_wrong_A_version: worlds.filter(world => world.wrong_A_version).length,
    worlds_with_independent_source_diversity: worlds.filter(world => world.source_diverse_reason_quality_supported).length,
    worlds_with_derivative_source_laundering: worlds.filter(world => world.derivative_source_laundering).length,
    worlds_with_model_monoculture: worlds.filter(world => world.model_monoculture).length,
    worlds_with_information_cascade: worlds.filter(world => world.information_cascade).length,
    worlds_with_suppressed_counterevidence: worlds.filter(world => world.suppressed_counterevidence).length,
    worlds_with_evidence_integrity_failure: worlds.filter(world => world.evidence_integrity_failure).length,
    worlds_with_minority_correction_uptake: worlds.filter(world => world.minority_correction_supported).length,
    worlds_with_challenge_response_amendment: worlds.filter(world => world.challenge_response_amendment_supported).length,
    worlds_with_complete_source_root_provenance: worlds.filter(world => world.full_source_root_provenance).length,
    submitted_counterevidence_worlds: worlds.filter(world => world.submitted_counterevidence).length,
    visible_counterevidence_worlds: worlds.filter(world => world.visible_counterevidence).length,
    minimum_root_source_count: Math.min(...worlds.map(world => world.root_source_count)),
    maximum_root_source_count: Math.max(...worlds.map(world => world.root_source_count)),
    minimum_valid_evidence_count: Math.min(...worlds.map(world => world.valid_evidence_count)),
    maximum_valid_evidence_count: Math.max(...worlds.map(world => world.valid_evidence_count)),
    binding_public_authority_worlds: 0,
    baseline_A_share: distribution(fixture.baseline.expected_private_counts).A,
    post_A_share: worlds[0].post_private_distribution.A,
    published_A_share: worlds[0].published_distribution.A
  };
  for (const [key, value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_EPISTEMIC_QUALITY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'epistemic_quality_equifinality_qualified',
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

export function validatePreferenceEpistemicQualityBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_EPISTEMIC_QUALITY_BUILD_SCHEMA_VERSION) errors.push('preference epistemic-quality build schema mismatch');
  if (compiled?.status !== 'epistemic_quality_equifinality_qualified') errors.push('compiled epistemic-quality status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled epistemic-quality graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled epistemic-quality must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled epistemic-quality must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled epistemic-quality real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled epistemic-quality worlds are incomplete');

  const expectedMetrics = {
    world_count: 6,
    distinct_published_disposition_signatures: 1,
    distinct_private_preference_signatures: 1,
    distinct_ballot_signatures: 1,
    distinct_final_proposal_signatures: 2,
    distinct_evidence_dependency_signatures: 6,
    worlds_with_four_speakers: 6,
    worlds_with_four_evidence_presentations: 6,
    worlds_with_reference_preferred_proposal: 1,
    worlds_with_wrong_A_version: 5,
    worlds_with_independent_source_diversity: 1,
    worlds_with_derivative_source_laundering: 1,
    worlds_with_model_monoculture: 1,
    worlds_with_information_cascade: 1,
    worlds_with_suppressed_counterevidence: 1,
    worlds_with_evidence_integrity_failure: 1,
    worlds_with_minority_correction_uptake: 1,
    worlds_with_challenge_response_amendment: 1,
    worlds_with_complete_source_root_provenance: 6,
    submitted_counterevidence_worlds: 2,
    visible_counterevidence_worlds: 1,
    minimum_root_source_count: 1,
    maximum_root_source_count: 4,
    minimum_valid_evidence_count: 0,
    maximum_valid_evidence_count: 4,
    binding_public_authority_worlds: 0,
    baseline_A_share: 0.6,
    post_A_share: 0.8,
    published_A_share: 0.8
  };
  for (const [key, value] of Object.entries(expectedMetrics)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  for (const world of array(compiled?.worlds)) {
    if (!close(world?.post_private_distribution?.A, 0.8) || !close(world?.post_vote_distribution?.A, 0.8) || !close(world?.published_distribution?.A, 0.8)) errors.push(`world ${world?.world_id} must preserve the frozen private ballot and published 80/20 majority`);
    if (world?.speaker_count !== 4 || world?.evidence_presentation_count !== 4) errors.push(`world ${world?.world_id} must preserve four speakers and four presentations`);
    for (const field of ['private_preference_signature_sha256', 'ballot_signature_sha256', 'published_disposition_signature_sha256', 'final_proposal_signature_sha256', 'evidence_dependency_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceEpistemicQualityChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  const positive = byId['independent-diverse-corroboration-minority-correction'];
  if (positive?.final_proposal_id !== 'A1' || positive?.source_diverse_reason_quality_supported !== true || positive?.minority_correction_supported !== true) errors.push('positive world must preserve diverse valid evidence, minority correction, and A1');
  if (positive?.root_source_count !== 4 || positive?.independence_cluster_count !== 4 || positive?.valid_evidence_count !== 4) errors.push('positive world must preserve four independent valid roots');
  if (byId['derivative-source-laundering']?.derivative_source_laundering !== true) errors.push('derivative world must preserve source laundering');
  if (byId['common-model-expert-monoculture']?.model_monoculture !== true) errors.push('model world must preserve shared-model monoculture');
  if (byId['information-cascade-without-source-inspection']?.information_cascade !== true) errors.push('cascade world must preserve uninspected claim repetition');
  if (byId['suppressed-minority-counterevidence']?.suppressed_counterevidence !== true) errors.push('suppression world must preserve hidden valid counterevidence');
  if (byId['fabricated-or-poisoned-evidence']?.evidence_integrity_failure !== true) errors.push('fabrication world must preserve evidence-integrity failure');
  for (const worldId of EXPECTED_WORLD_IDS.filter(id => id !== 'independent-diverse-corroboration-minority-correction')) if (byId[worldId]?.wrong_A_version !== true) errors.push(`world ${worldId} must preserve the wrong A0 version`);
  if (unique(compiled?.refusal_rules).length < 11) errors.push('compiled epistemic-quality refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled epistemic-quality caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceEpistemicQualityMarkdown(compiled) {
  const lines = [
    '# Epistemic diversity, source independence, and evidence-quality custody',
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
    `- Post private A share: ${percentage(compiled.metrics.post_A_share)}`,
    `- Published A share: ${percentage(compiled.metrics.published_A_share)}`,
    '- Speakers per world: 4',
    '- Evidence presentations per world: 4',
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Root sources: ${world.root_source_count}`);
    lines.push(`- Independence clusters: ${world.independence_cluster_count}`);
    lines.push(`- Valid evidence items: ${world.valid_evidence_count}`);
    lines.push(`- Inspected evidence items: ${world.inspected_evidence_count}`);
    lines.push(`- Visible evidence items: ${world.visible_evidence_count}`);
    lines.push(`- Derivative items: ${world.derivative_count}`);
    lines.push(`- Model outputs: ${world.model_output_count}`);
    lines.push(`- Uninspected repeats: ${world.uninspected_repeat_count}`);
    lines.push(`- Suppressed items: ${world.suppressed_count}`);
    lines.push(`- Invalid items: ${world.invalid_evidence_count}`);
    lines.push(`- Challenges: ${world.challenge_count}`);
    lines.push(`- Responses: ${world.response_count}`);
    lines.push(`- Uptake events: ${world.uptake_count}`);
    lines.push(`- Amendments: ${world.amendment_count}`);
    lines.push(`- Final proposal: ${world.final_proposal_id}`);
    lines.push(`- Reference acceptable: ${world.reference_acceptable}`);
    lines.push(`- Wrong A version: ${world.wrong_A_version}`);
    lines.push(`- Source-diverse reason quality supported: ${world.source_diverse_reason_quality_supported}`);
    lines.push(`- Minority correction supported: ${world.minority_correction_supported}`);
    lines.push(`- Counterfactual: ${world.counterfactual.intervention} → ${world.counterfactual.expected_final_proposal_id}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) {
    const rendered = typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value;
    lines.push(`- ${key}: ${rendered}`);
  }
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
