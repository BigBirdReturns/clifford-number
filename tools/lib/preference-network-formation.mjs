import { createHash } from 'node:crypto';

export const PREFERENCE_NETWORK_FORMATION_FIXTURE_SCHEMA_VERSION = 'preference-network-formation-fixture@1';
export const PREFERENCE_NETWORK_FORMATION_BUILD_SCHEMA_VERSION = 'preference-network-formation-build@1';

const OPTION_IDS = ['A', 'B'];
const EXPECTED_WORLD_IDS = [
  'algorithmic-visibility-amplification',
  'common-broadcast-latent-conversion',
  'coordination-action-without-conversion',
  'independent-private-evidence-conversion',
  'peer-cascade-latent-conversion',
  'pluralistic-conformity-reporting'
];
const SURFACE_SOURCES = new Set(['public_report', 'public_action', 'ranked_visibility']);
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

function distributionFromCounts(counts) {
  const total = sum(Object.values(counts));
  return Object.fromEntries(OPTION_IDS.map(optionId => [optionId, total > 0 ? Number(counts[optionId]) / total : null]));
}

function totalVariation(left, right) {
  return 0.5 * OPTION_IDS.reduce((total, optionId) => (
    total + Math.abs(Number(left[optionId]) - Number(right[optionId]))
  ), 0);
}

function validateCounts(counts, label, expectedTotal, errors) {
  const value = object(counts);
  if (!sameMembers(Object.keys(value), OPTION_IDS)) {
    errors.push(`${label} must contain exactly A and B`);
    return;
  }
  for (const optionId of OPTION_IDS) {
    const count = Number(value[optionId]);
    if (!Number.isInteger(count) || count < 0) errors.push(`${label}.${optionId} must be a non-negative integer`);
  }
  if (Number.isInteger(expectedTotal) && sum(Object.values(value)) !== expectedTotal) {
    errors.push(`${label} must sum to ${expectedTotal}`);
  }
}

function countGroups(groups, field) {
  const counts = emptyCounts();
  for (const group of array(groups)) counts[group[field]] += Number(group.count);
  return counts;
}

function validateGroup(group, label, errors) {
  if (!text(group?.group_id)) errors.push(`${label} requires group_id`);
  if (!Number.isInteger(group?.count) || group.count <= 0) errors.push(`${label}.count must be a positive integer`);
  for (const field of ['latent_preference', 'public_report', 'public_action']) {
    if (!OPTION_IDS.includes(group?.[field])) errors.push(`${label}.${field} must be A or B`);
  }
}

function expectedClassification() {
  return {
    surface_majority_identifies_independent_preference_distribution: false,
    correlated_change_identifies_peer_influence_without_source_separation: false,
    homophily_identifies_contagion: false,
    common_broadcast_is_peer_cascade: false,
    public_report_always_equals_private_preference: false,
    public_action_always_equals_private_preference: false,
    surfaced_share_always_equals_population_report_share: false,
    peer_influence_path_supported_in_at_least_one_world: true,
    collective_deliberation_supported: false,
    network_path_establishes_manipulation: false,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceNetworkFormationFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const groups = array(baseline.node_groups);
  const edges = array(baseline.edge_classes);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_NETWORK_FORMATION_FIXTURE_SCHEMA_VERSION) errors.push('preference network-formation fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  if (!Number.isInteger(baseline.surface_sample_total) || baseline.surface_sample_total <= 0) errors.push('baseline surface_sample_total must be a positive integer');
  if (!text(baseline.network_version) || !text(baseline.instrument_version) || !text(baseline.wording_hash)) errors.push('baseline network and instrument identity are required');
  if (!Number.isFinite(Number(baseline.homophily_index)) || baseline.homophily_index < 0 || baseline.homophily_index > 1) errors.push('baseline homophily_index must be a probability');
  if (groups.length < 4) errors.push('baseline requires at least four node groups');
  const groupIds = groups.map(group => text(group?.group_id));
  if (unique(groupIds).length !== groups.length) errors.push('baseline group IDs must be unique');
  groups.forEach((group, index) => validateGroup(group, `baseline group ${index}`, errors));
  if (sum(groups.map(group => group.count)) !== baseline.population_total) errors.push('baseline node groups must sum to population_total');

  if (edges.length < 4) errors.push('baseline requires at least four edge classes');
  const edgeIds = edges.map(edge => text(edge?.edge_id));
  if (unique(edgeIds).length !== edges.length) errors.push('baseline edge IDs must be unique');
  for (const edge of edges) {
    const edgeId = text(edge?.edge_id) || '(missing edge ID)';
    if (!groupIds.includes(edge?.from_group) || !groupIds.includes(edge?.to_group)) errors.push(`edge ${edgeId} references an unknown group`);
    if (edge?.directed !== true) errors.push(`edge ${edgeId} must remain directed`);
    if (!Number.isInteger(edge?.edge_count) || edge.edge_count <= 0) errors.push(`edge ${edgeId}.edge_count must be a positive integer`);
    if (!Number.isFinite(Number(edge?.weight)) || edge.weight <= 0) errors.push(`edge ${edgeId}.weight must be positive`);
  }

  for (const [field, label] of [
    ['expected_latent_counts', 'baseline expected_latent_counts'],
    ['expected_report_counts', 'baseline expected_report_counts'],
    ['expected_action_counts', 'baseline expected_action_counts'],
    ['expected_uniform_surface_counts', 'baseline expected_uniform_surface_counts']
  ]) validateCounts(baseline[field], label, baseline.population_total, errors);

  const baselineLatent = countGroups(groups, 'latent_preference');
  const baselineReport = countGroups(groups, 'public_report');
  const baselineAction = countGroups(groups, 'public_action');
  if (JSON.stringify(baselineLatent) !== JSON.stringify(baseline.expected_latent_counts)) errors.push('baseline latent counts do not match node groups');
  if (JSON.stringify(baselineReport) !== JSON.stringify(baseline.expected_report_counts)) errors.push('baseline report counts do not match node groups');
  if (JSON.stringify(baselineAction) !== JSON.stringify(baseline.expected_action_counts)) errors.push('baseline action counts do not match node groups');
  if (JSON.stringify(baselineReport) !== JSON.stringify(baseline.expected_uniform_surface_counts)) errors.push('baseline uniform surface counts must equal public reports');

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the six required network worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worlds.length) errors.push('world IDs must be unique');
  const baselineById = Object.fromEntries(groups.map(group => [group.group_id, group]));

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.instrument);
    const privateEvidence = object(world?.private_evidence);
    const broadcast = object(world?.common_broadcast);
    const social = object(world?.social_incentive);
    const ranking = object(world?.ranking);
    const postGroups = array(world?.post_groups);
    const counterfactual = object(world?.counterfactual);

    if (world?.network_version !== baseline.network_version) errors.push(`world ${worldId} must preserve the baseline network version`);
    if (instrument.invariant_from_baseline !== true
        || instrument.version !== baseline.instrument_version
        || instrument.wording_hash !== baseline.wording_hash) {
      errors.push(`world ${worldId} must preserve the baseline instrument`);
    }

    for (const [source, label] of [[privateEvidence, 'private_evidence'], [broadcast, 'common_broadcast']]) {
      if (!text(source.state) || !Array.isArray(source.recipient_groups)) errors.push(`world ${worldId} ${label} custody is incomplete`);
      if (!Number.isInteger(source.recipient_count) || source.recipient_count < 0) errors.push(`world ${worldId} ${label}.recipient_count must be a non-negative integer`);
      for (const groupId of array(source.recipient_groups)) if (!baselineById[groupId]) errors.push(`world ${worldId} ${label} references unknown group ${groupId}`);
      const declaredRecipientTotal = array(source.recipient_groups).reduce((total, groupId) => total + Number(baselineById[groupId]?.count ?? 0), 0);
      if (declaredRecipientTotal !== source.recipient_count) errors.push(`world ${worldId} ${label} recipient_count does not match recipient groups`);
    }

    if (!Array.isArray(world?.peer_rounds)) errors.push(`world ${worldId} peer_rounds must be an array`);
    let priorRound = -1;
    for (const round of array(world?.peer_rounds)) {
      if (!Number.isInteger(round?.round) || round.round < 0 || round.round <= priorRound) errors.push(`world ${worldId} peer rounds must be strictly increasing non-negative integers`);
      priorRound = Number(round?.round);
      if (!text(round?.source)) errors.push(`world ${worldId} peer round requires source`);
      for (const field of ['source_groups', 'target_groups']) {
        if (!Array.isArray(round?.[field])) errors.push(`world ${worldId} peer round ${field} must be an array`);
        for (const groupId of array(round?.[field])) if (!baselineById[groupId]) errors.push(`world ${worldId} peer round references unknown group ${groupId}`);
      }
      for (const field of ['latent_conversions', 'report_changes', 'action_changes']) {
        if (!Number.isInteger(round?.[field]) || round[field] < 0) errors.push(`world ${worldId} peer round ${field} must be a non-negative integer`);
      }
    }

    if (!text(social.state) || typeof social.conformity_pressure !== 'boolean' || typeof social.coordination_payoff !== 'boolean') errors.push(`world ${worldId} social-incentive custody is incomplete`);
    if (!text(ranking.state) || !object(ranking.weights)) errors.push(`world ${worldId} ranking custody is incomplete`);
    for (const optionId of OPTION_IDS) {
      if (!Number.isFinite(Number(ranking.weights?.[optionId])) || ranking.weights[optionId] <= 0) errors.push(`world ${worldId} ranking weight ${optionId} must be positive`);
    }
    if (!SURFACE_SOURCES.has(world?.surface_source)) errors.push(`world ${worldId} has invalid surface_source`);

    if (!sameMembers(postGroups.map(group => group?.group_id), groupIds)) errors.push(`world ${worldId} must preserve every baseline group identity`);
    if (unique(postGroups.map(group => text(group?.group_id))).length !== postGroups.length) errors.push(`world ${worldId} post group IDs must be unique`);
    postGroups.forEach((group, index) => {
      validateGroup(group, `world ${worldId} group ${index}`, errors);
      if (baselineById[group?.group_id] && group.count !== baselineById[group.group_id].count) errors.push(`world ${worldId} group ${group.group_id} must preserve its baseline count`);
    });
    if (sum(postGroups.map(group => group.count)) !== baseline.population_total) errors.push(`world ${worldId} post groups must preserve population_total`);

    if (!text(counterfactual.intervention) || !text(counterfactual.interpretation)) errors.push(`world ${worldId} counterfactual custody is incomplete`);
    validateCounts(counterfactual.expected_surface_counts, `world ${worldId} counterfactual expected_surface_counts`, baseline.surface_sample_total, errors);
    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of [
      'expected_latent_conversion_count',
      'expected_peer_mediated_conversion_count',
      'expected_common_source_conversion_count',
      'expected_report_latent_divergence_count',
      'expected_action_latent_divergence_count'
    ]) {
      if (!Number.isInteger(world?.[key]) || world[key] < 0) errors.push(`world ${worldId} ${key} must be a non-negative integer`);
    }
    validateCounts(world?.expected_surface_counts, `world ${worldId} expected_surface_counts`, baseline.surface_sample_total, errors);
    if (typeof world?.peer_influence_path_supported !== 'boolean' || typeof world?.collective_deliberation_supported !== 'boolean') errors.push(`world ${worldId} path and deliberation states must be boolean`);
  }

  const requiredMetrics = {
    world_count: 6,
    distinct_surface_headline_signatures: 1,
    distinct_latent_headline_signatures: 2,
    distinct_report_headline_signatures: 2,
    distinct_action_headline_signatures: 2,
    distinct_mechanism_signatures: 6,
    worlds_with_latent_conversion: 3,
    worlds_without_latent_conversion: 3,
    worlds_with_independent_conversion: 1,
    worlds_with_peer_mediated_conversion: 1,
    worlds_with_common_source_conversion: 1,
    worlds_with_report_latent_divergence: 1,
    worlds_with_action_latent_divergence: 1,
    worlds_with_ranking_amplification: 1,
    worlds_with_network_mediated_response: 3,
    worlds_with_collective_deliberation: 0,
    stable_identity_worlds: 6,
    stable_network_version_worlds: 6,
    stable_instrument_worlds: 6,
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) {
    if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  }
  for (const [key, value] of Object.entries(expectedClassification())) {
    if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'final_majority_is_not_independent_preference_distribution',
    'correlated_change_is_not_peer_influence_without_source_separation',
    'homophily_is_not_contagion',
    'common_broadcast_is_not_network_cascade',
    'public_action_is_not_latent_preference_under_coordination_incentive',
    'public_report_is_not_private_belief_under_conformity_pressure',
    'surfaced_content_share_is_not_population_report_share',
    'engagement_cascade_is_not_collective_deliberation_or_public_authorization',
    'network_influence_path_is_not_manipulation_or_intent',
    'network_claim_requires_identity_graph_source_timing_private_public_visibility_and_counterfactual_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 9) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id)
      || !text(fixture?.interpretation_contract?.what_this_is)
      || !text(fixture?.interpretation_contract?.what_this_is_not)
      || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function weightedSurfaceCounts(counts, weights, sampleTotal) {
  const weighted = Object.fromEntries(OPTION_IDS.map(optionId => [optionId, Number(counts[optionId]) * Number(weights[optionId])]));
  const weightedTotal = sum(Object.values(weighted));
  const result = {};
  for (const optionId of OPTION_IDS) {
    const raw = weightedTotal > 0 ? weighted[optionId] / weightedTotal * sampleTotal : 0;
    if (!close(raw, Math.round(raw))) throw new Error(`weighted surface count for ${optionId} is not integral`);
    result[optionId] = Math.round(raw);
  }
  return result;
}

export function simulatePreferenceNetworkFormationWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const baselineById = Object.fromEntries(array(baseline.node_groups).map(group => [group.group_id, group]));
  const postGroups = array(world.post_groups);
  const latentCounts = countGroups(postGroups, 'latent_preference');
  const reportCounts = countGroups(postGroups, 'public_report');
  const actionCounts = countGroups(postGroups, 'public_action');
  let latentConversionCount = 0;
  let reportLatentDivergenceCount = 0;
  let actionLatentDivergenceCount = 0;

  for (const group of postGroups) {
    const baselineGroup = baselineById[group.group_id];
    if (baselineGroup.latent_preference !== group.latent_preference) latentConversionCount += group.count;
    if (group.latent_preference !== group.public_report) reportLatentDivergenceCount += group.count;
    if (group.latent_preference !== group.public_action) actionLatentDivergenceCount += group.count;
  }

  const peerMediatedConversionCount = array(world.peer_rounds)
    .filter(round => round.source === 'converted_peers')
    .reduce((total, round) => total + Number(round.latent_conversions), 0);
  const broadcastRecipients = new Set(array(world.common_broadcast?.recipient_groups));
  const commonSourceConversionCount = postGroups
    .filter(group => broadcastRecipients.has(group.group_id) && baselineById[group.group_id].latent_preference !== group.latent_preference)
    .reduce((total, group) => total + Number(group.count), 0);
  const privateRecipients = new Set(array(world.private_evidence?.recipient_groups));
  const privateSourceConversionCount = postGroups
    .filter(group => privateRecipients.has(group.group_id) && baselineById[group.group_id].latent_preference !== group.latent_preference)
    .reduce((total, group) => total + Number(group.count), 0);

  let surfaceCounts;
  if (world.surface_source === 'public_report') surfaceCounts = { ...reportCounts };
  else if (world.surface_source === 'public_action') surfaceCounts = { ...actionCounts };
  else surfaceCounts = weightedSurfaceCounts(reportCounts, world.ranking.weights, baseline.surface_sample_total);

  const latentDistribution = distributionFromCounts(latentCounts);
  const reportDistribution = distributionFromCounts(reportCounts);
  const actionDistribution = distributionFromCounts(actionCounts);
  const surfaceDistribution = distributionFromCounts(surfaceCounts);
  const baselineLatentDistribution = distributionFromCounts(baseline.expected_latent_counts);
  const baselineReportDistribution = distributionFromCounts(baseline.expected_report_counts);

  const independentConversion = latentConversionCount > 0
    && privateSourceConversionCount === latentConversionCount
    && peerMediatedConversionCount === 0
    && commonSourceConversionCount === 0
    && world.private_evidence.state === 'independent_person_level_signal_A';
  const rankingAmplification = world.ranking.state !== 'uniform';
  const networkMediatedResponse = world.peer_influence_path_supported === true;

  const mechanismState = {
    expected_mechanism: world.expected_mechanism,
    private_evidence: world.private_evidence,
    common_broadcast: world.common_broadcast,
    peer_rounds: world.peer_rounds,
    social_incentive: world.social_incentive,
    ranking: world.ranking,
    surface_source: world.surface_source,
    latent_conversion_count: latentConversionCount,
    peer_mediated_conversion_count: peerMediatedConversionCount,
    common_source_conversion_count: commonSourceConversionCount,
    report_latent_divergence_count: reportLatentDivergenceCount,
    action_latent_divergence_count: actionLatentDivergenceCount
  };

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    network_version: world.network_version,
    network_snapshot_sha256: sha256({
      network_version: baseline.network_version,
      node_groups: baseline.node_groups,
      edge_classes: baseline.edge_classes,
      homophily_index: baseline.homophily_index
    }),
    instrument: world.instrument,
    private_evidence: world.private_evidence,
    common_broadcast: world.common_broadcast,
    peer_rounds: world.peer_rounds,
    social_incentive: world.social_incentive,
    ranking: world.ranking,
    surface_source: world.surface_source,
    post_groups: world.post_groups,
    counterfactual: world.counterfactual,
    latent_counts: latentCounts,
    report_counts: reportCounts,
    action_counts: actionCounts,
    surface_counts: surfaceCounts,
    baseline_latent_distribution: baselineLatentDistribution,
    baseline_report_distribution: baselineReportDistribution,
    post_latent_distribution: latentDistribution,
    post_report_distribution: reportDistribution,
    post_action_distribution: actionDistribution,
    surfaced_distribution: surfaceDistribution,
    latent_conversion_count: latentConversionCount,
    private_source_conversion_count: privateSourceConversionCount,
    peer_mediated_conversion_count: peerMediatedConversionCount,
    common_source_conversion_count: commonSourceConversionCount,
    report_latent_divergence_count: reportLatentDivergenceCount,
    action_latent_divergence_count: actionLatentDivergenceCount,
    independent_conversion: independentConversion,
    ranking_amplification: rankingAmplification,
    network_mediated_response: networkMediatedResponse,
    collective_deliberation_supported: world.collective_deliberation_supported,
    surface_latent_total_variation: totalVariation(surfaceDistribution, latentDistribution),
    surface_report_total_variation: totalVariation(surfaceDistribution, reportDistribution),
    surface_headline_signature_sha256: sha256(surfaceDistribution),
    latent_headline_signature_sha256: sha256(latentDistribution),
    report_headline_signature_sha256: sha256(reportDistribution),
    action_headline_signature_sha256: sha256(actionDistribution),
    mechanism_signature_sha256: sha256(mechanismState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildNetworkFormationChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline-network`,
    event_type: 'baseline_identity_network_and_instrument_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:sources`,
    event_type: 'private_common_and_social_source_state',
    evidence_class: 'synthetic_control_mechanism',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline-network`],
    payload: {
      private_evidence: result.private_evidence,
      common_broadcast: result.common_broadcast,
      social_incentive: result.social_incentive
    }
  });
  push({
    event_id: `${result.world_id}:peer-rounds`,
    event_type: 'peer_exposure_and_transition_rounds',
    evidence_class: 'synthetic_control_temporal_mechanism',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:sources`],
    payload: result.peer_rounds
  });
  push({
    event_id: `${result.world_id}:private-public-state`,
    event_type: 'latent_report_and_action_state',
    evidence_class: 'synthetic_control_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:peer-rounds`],
    payload: {
      post_groups: result.post_groups,
      latent_counts: result.latent_counts,
      report_counts: result.report_counts,
      action_counts: result.action_counts,
      latent_conversion_count: result.latent_conversion_count,
      report_latent_divergence_count: result.report_latent_divergence_count,
      action_latent_divergence_count: result.action_latent_divergence_count
    }
  });
  push({
    event_id: `${result.world_id}:visibility`,
    event_type: 'ranking_sampling_and_surface_state',
    evidence_class: 'synthetic_control_observation',
    authority: 'fixture_surface',
    source_event_ids: [`${result.world_id}:private-public-state`],
    payload: {
      ranking: result.ranking,
      surface_source: result.surface_source,
      surface_counts: result.surface_counts,
      surfaced_distribution: result.surfaced_distribution,
      surface_latent_total_variation: result.surface_latent_total_variation,
      surface_report_total_variation: result.surface_report_total_variation
    }
  });
  push({
    event_id: `${result.world_id}:counterfactual`,
    event_type: 'network_or_source_counterfactual',
    evidence_class: 'synthetic_control_counterfactual',
    authority: 'fixture_author',
    source_event_ids: [`${result.world_id}:visibility`],
    payload: result.counterfactual
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'network_formation_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'network_formation_compiler',
    source_event_ids: [`${result.world_id}:counterfactual`],
    payload: {
      mechanism: result.mechanism,
      independent_conversion: result.independent_conversion,
      peer_mediated_conversion_count: result.peer_mediated_conversion_count,
      common_source_conversion_count: result.common_source_conversion_count,
      network_mediated_response: result.network_mediated_response,
      ranking_amplification: result.ranking_amplification,
      collective_deliberation_supported: result.collective_deliberation_supported
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'network_formation_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic dependence mechanism behind the frozen surfaced majority',
      refused_promotions: [
        'surface_majority_as_independent_preference',
        'correlation_as_peer_influence',
        'homophily_as_contagion',
        'common_source_as_cascade',
        'public_report_or_action_as_private_preference',
        'ranking_surface_as_population_distribution',
        'cascade_as_collective_deliberation',
        'network_path_as_manipulation_or_public_authority'
      ]
    }
  });
  return events;
}

export function validatePreferenceNetworkFormationChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('network-formation event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate network-formation event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`network-formation event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`network-formation event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`network-formation event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceNetworkFormationFixture(fixture) {
  const errors = validatePreferenceNetworkFormationFixture(fixture);
  if (errors.length) throw new Error(`invalid preference network-formation fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceNetworkFormationWorld(fixture, world);
    if (JSON.stringify(result.surface_counts) !== JSON.stringify(world.expected_surface_counts)) throw new Error(`world ${world.world_id} surface counts mismatch`);
    if (result.latent_conversion_count !== world.expected_latent_conversion_count) throw new Error(`world ${world.world_id} latent conversion count mismatch`);
    if (result.peer_mediated_conversion_count !== world.expected_peer_mediated_conversion_count) throw new Error(`world ${world.world_id} peer-mediated conversion count mismatch`);
    if (result.common_source_conversion_count !== world.expected_common_source_conversion_count) throw new Error(`world ${world.world_id} common-source conversion count mismatch`);
    if (result.report_latent_divergence_count !== world.expected_report_latent_divergence_count) throw new Error(`world ${world.world_id} report-latent divergence mismatch`);
    if (result.action_latent_divergence_count !== world.expected_action_latent_divergence_count) throw new Error(`world ${world.world_id} action-latent divergence mismatch`);
    const chain = buildNetworkFormationChain(fixture, result);
    return {
      ...result,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null
    };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_surface_headline_signatures: unique(worlds.map(world => world.surface_headline_signature_sha256)).length,
    distinct_latent_headline_signatures: unique(worlds.map(world => world.latent_headline_signature_sha256)).length,
    distinct_report_headline_signatures: unique(worlds.map(world => world.report_headline_signature_sha256)).length,
    distinct_action_headline_signatures: unique(worlds.map(world => world.action_headline_signature_sha256)).length,
    distinct_mechanism_signatures: unique(worlds.map(world => world.mechanism_signature_sha256)).length,
    worlds_with_latent_conversion: worlds.filter(world => world.latent_conversion_count > 0).length,
    worlds_without_latent_conversion: worlds.filter(world => world.latent_conversion_count === 0).length,
    worlds_with_independent_conversion: worlds.filter(world => world.independent_conversion).length,
    worlds_with_peer_mediated_conversion: worlds.filter(world => world.peer_mediated_conversion_count > 0).length,
    worlds_with_common_source_conversion: worlds.filter(world => world.common_source_conversion_count > 0).length,
    worlds_with_report_latent_divergence: worlds.filter(world => world.report_latent_divergence_count > 0).length,
    worlds_with_action_latent_divergence: worlds.filter(world => world.action_latent_divergence_count > 0).length,
    worlds_with_ranking_amplification: worlds.filter(world => world.ranking_amplification).length,
    worlds_with_network_mediated_response: worlds.filter(world => world.network_mediated_response).length,
    worlds_with_collective_deliberation: worlds.filter(world => world.collective_deliberation_supported).length,
    stable_identity_worlds: worlds.filter(world => sameMembers(world.post_groups.map(group => group.group_id), fixture.baseline.node_groups.map(group => group.group_id))).length,
    stable_network_version_worlds: worlds.filter(world => world.network_version === fixture.baseline.network_version).length,
    stable_instrument_worlds: worlds.filter(world => world.instrument.invariant_from_baseline === true).length,
    binding_public_authority_worlds: 0,
    baseline_A_share: worlds[0].baseline_report_distribution.A,
    surfaced_A_share: worlds[0].surfaced_distribution.A,
    surfaced_A_share_shift: worlds[0].surfaced_distribution.A - worlds[0].baseline_report_distribution.A,
    maximum_surface_latent_total_variation: Math.max(...worlds.map(world => world.surface_latent_total_variation)),
    maximum_surface_report_total_variation: Math.max(...worlds.map(world => world.surface_report_total_variation))
  };

  for (const [key, value] of Object.entries(fixture.expected_metrics)) {
    if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  }

  return {
    schema_version: PREFERENCE_NETWORK_FORMATION_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'network_formation_equifinality_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: {
      ...fixture.expected_classification,
      preference_change_present: false
    },
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceNetworkFormationBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_NETWORK_FORMATION_BUILD_SCHEMA_VERSION) errors.push('preference network-formation build schema mismatch');
  if (compiled?.status !== 'network_formation_equifinality_qualified') errors.push('compiled network-formation status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled network-formation graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled network-formation must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled network-formation must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled network-formation real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled network-formation worlds are incomplete');

  const expectedMetrics = {
    world_count: 6,
    distinct_surface_headline_signatures: 1,
    distinct_latent_headline_signatures: 2,
    distinct_report_headline_signatures: 2,
    distinct_action_headline_signatures: 2,
    distinct_mechanism_signatures: 6,
    worlds_with_latent_conversion: 3,
    worlds_without_latent_conversion: 3,
    worlds_with_independent_conversion: 1,
    worlds_with_peer_mediated_conversion: 1,
    worlds_with_common_source_conversion: 1,
    worlds_with_report_latent_divergence: 1,
    worlds_with_action_latent_divergence: 1,
    worlds_with_ranking_amplification: 1,
    worlds_with_network_mediated_response: 3,
    worlds_with_collective_deliberation: 0,
    stable_identity_worlds: 6,
    stable_network_version_worlds: 6,
    stable_instrument_worlds: 6,
    binding_public_authority_worlds: 0,
    baseline_A_share: 0.6,
    surfaced_A_share: 0.8,
    surfaced_A_share_shift: 0.2,
    maximum_surface_latent_total_variation: 0.2,
    maximum_surface_report_total_variation: 0.2
  };
  for (const [key, value] of Object.entries(expectedMetrics)) {
    if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  }
  for (const [key, value] of Object.entries(expectedClassification())) {
    if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  }
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  const networkHashes = unique(array(compiled?.worlds).map(world => world.network_snapshot_sha256));
  if (networkHashes.length !== 1) errors.push('all worlds must preserve one network snapshot');
  for (const world of array(compiled?.worlds)) {
    if (!close(world?.surfaced_distribution?.A, 0.8) || !close(world?.surfaced_distribution?.B, 0.2)) errors.push(`world ${world?.world_id} must preserve the frozen surfaced 80/20 headline`);
    for (const field of ['surface_headline_signature_sha256', 'latent_headline_signature_sha256', 'report_headline_signature_sha256', 'action_headline_signature_sha256', 'mechanism_signature_sha256', 'network_snapshot_sha256']) {
      if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    }
    errors.push(...validatePreferenceNetworkFormationChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['independent-private-evidence-conversion']?.independent_conversion !== true) errors.push('independent-evidence world must preserve independent conversion');
  if (byId['peer-cascade-latent-conversion']?.peer_mediated_conversion_count !== 150) errors.push('peer-cascade world must preserve 150 peer-mediated conversions');
  if (byId['common-broadcast-latent-conversion']?.common_source_conversion_count !== 200) errors.push('common-broadcast world must preserve 200 common-source conversions');
  if (byId['pluralistic-conformity-reporting']?.report_latent_divergence_count !== 200) errors.push('conformity world must preserve 200 report-latent divergences');
  if (byId['coordination-action-without-conversion']?.action_latent_divergence_count !== 200) errors.push('coordination world must preserve 200 action-latent divergences');
  if (byId['algorithmic-visibility-amplification']?.ranking_amplification !== true) errors.push('visibility world must preserve ranking amplification');
  if (!close(byId['algorithmic-visibility-amplification']?.post_report_distribution?.A, 0.6)) errors.push('visibility world must preserve the 60 percent population report share');
  if (unique(compiled?.refusal_rules).length < 10) errors.push('compiled network-formation refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled network-formation caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceNetworkFormationMarkdown(compiled) {
  const lines = [
    '# Network dependence and collective preference-formation custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Surface headline signatures:** ${compiled.metrics.distinct_surface_headline_signatures}`,
    '',
    `**Latent headline signatures:** ${compiled.metrics.distinct_latent_headline_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen state',
    '',
    `- Baseline A share: ${percentage(compiled.metrics.baseline_A_share)}`,
    `- Surfaced A share: ${percentage(compiled.metrics.surfaced_A_share)}`,
    `- Surfaced shift: ${percentage(compiled.metrics.surfaced_A_share_shift)}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Latent conversions: ${world.latent_conversion_count}`);
    lines.push(`- Private-source conversions: ${world.private_source_conversion_count}`);
    lines.push(`- Peer-mediated conversions: ${world.peer_mediated_conversion_count}`);
    lines.push(`- Common-source conversions: ${world.common_source_conversion_count}`);
    lines.push(`- Report-latent divergence: ${world.report_latent_divergence_count}`);
    lines.push(`- Action-latent divergence: ${world.action_latent_divergence_count}`);
    lines.push(`- Population report A share: ${percentage(world.post_report_distribution.A)}`);
    lines.push(`- Population action A share: ${percentage(world.post_action_distribution.A)}`);
    lines.push(`- Surfaced A share: ${percentage(world.surfaced_distribution.A)}`);
    lines.push(`- Network-mediated response: ${world.network_mediated_response}`);
    lines.push(`- Ranking amplification: ${world.ranking_amplification}`);
    lines.push(`- Collective deliberation supported: ${world.collective_deliberation_supported}`);
    lines.push(`- Counterfactual: ${world.counterfactual.intervention} → A=${world.counterfactual.expected_surface_counts.A}, B=${world.counterfactual.expected_surface_counts.B}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) {
    lines.push(`- ${key}: ${typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value}`);
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
