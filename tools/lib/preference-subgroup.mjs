import { createHash } from 'node:crypto';

export const PREFERENCE_SUBGROUP_FIXTURE_SCHEMA_VERSION = 'preference-subgroup-fixture@1';
export const PREFERENCE_SUBGROUP_BUILD_SCHEMA_VERSION = 'preference-subgroup-build@1';

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

function validateGroupOutcome(outcome, denominator, label, errors) {
  const success = Number(outcome?.success);
  const failure = Number(outcome?.failure);
  const cost = Number(outcome?.adaptation_cost_per_success);
  if (!Number.isInteger(success) || success < 0) errors.push(`${label}.success must be a non-negative integer`);
  if (!Number.isInteger(failure) || failure < 0) errors.push(`${label}.failure must be a non-negative integer`);
  if (success + failure !== denominator) errors.push(`${label} success plus failure must equal the group denominator`);
  if (!Number.isFinite(cost) || cost < 0) errors.push(`${label}.adaptation_cost_per_success must be a non-negative number`);
}

export function validatePreferenceSubgroupFixture(fixture) {
  const errors = [];
  const groups = object(fixture?.population_groups);
  const groupIds = Object.keys(groups).sort();
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_SUBGROUP_FIXTURE_SCHEMA_VERSION) errors.push('preference subgroup fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (groupIds.length < 2) errors.push('fixture requires at least two population groups');
  for (const groupId of groupIds) {
    const count = Number(groups[groupId]);
    if (!Number.isInteger(count) || count <= 0) errors.push(`population group ${groupId} must be a positive integer`);
  }
  if (fixture?.institutional_intervention?.objective !== 'maximize_observed_adaptation_success') errors.push('intervention objective must remain maximize_observed_adaptation_success');
  if (fixture?.institutional_intervention?.headline_metric !== 'aggregate_success_rate') errors.push('headline metric must remain aggregate_success_rate');
  if (fixture?.institutional_intervention?.reported_group_slices !== false) errors.push('fixture must declare group slices unreported at headline level');

  const expected = object(fixture?.expected_headline);
  if (!Number.isInteger(expected.success) || expected.success < 0) errors.push('expected success must be a non-negative integer');
  if (!Number.isInteger(expected.failure) || expected.failure < 0) errors.push('expected failure must be a non-negative integer');
  if (expected.success + expected.failure !== sum(Object.values(groups))) errors.push('expected headline counts must reconcile to the population');
  if (!Number.isFinite(expected.success_rate) || !close(expected.success_rate, expected.success / (expected.success + expected.failure))) errors.push('expected success rate must match the headline counts');

  if (worlds.length < 3) errors.push('fixture requires at least three candidate worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const outcomes = object(world?.groups);
    if (!text(world?.world_id)) errors.push('every world requires world_id');
    if (JSON.stringify(Object.keys(outcomes).sort()) !== JSON.stringify(groupIds)) errors.push(`world ${worldId} must use exactly the population groups`);
    for (const groupId of groupIds) validateGroupOutcome(outcomes[groupId], groups[groupId], `world ${worldId} group ${groupId}`, errors);
  }

  const expectedClassification = object(fixture?.expected_classification);
  const requiredExpected = {
    aggregate_success_equivalence_supported: true,
    subgroup_outcome_identification_from_aggregate: 'unavailable',
    adaptation_burden_identification_from_aggregate: 'unavailable',
    willingness_identification_from_adaptation: 'unavailable',
    same_aggregate_implies_same_distribution: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'aggregate_success_is_not_subgroup_parity',
    'adaptation_is_not_preference',
    'compliance_is_not_low_burden',
    'average_outcome_does_not_cancel_group_harm',
    'high_capacity_group_is_not_universal_population',
    'missing_group_slice_is_not_no_disparity',
    'distributional_acceptability_requires_external_authority'
  ];
  const requiredRules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) {
    if (!requiredRules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_disambiguation_evidence).length < 5) errors.push('disambiguation evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function simulateSubgroupWorld(fixture, world) {
  const groupIds = Object.keys(fixture.population_groups).sort();
  const groups = {};
  let success = 0;
  let failure = 0;
  let burden = 0;

  for (const groupId of groupIds) {
    const denominator = Number(fixture.population_groups[groupId]);
    const outcome = object(world.groups[groupId]);
    const groupSuccess = Number(outcome.success);
    const groupFailure = Number(outcome.failure);
    const cost = Number(outcome.adaptation_cost_per_success);
    const groupBurden = groupSuccess * cost;
    groups[groupId] = {
      denominator,
      success: groupSuccess,
      failure: groupFailure,
      success_rate: groupSuccess / denominator,
      adaptation_cost_per_success: cost,
      total_adaptation_burden: groupBurden
    };
    success += groupSuccess;
    failure += groupFailure;
    burden += groupBurden;
  }

  const successRates = Object.values(groups).map(group => group.success_rate);
  const perSuccessCosts = Object.values(groups).map(group => group.adaptation_cost_per_success);
  const headline = {
    success,
    failure,
    success_rate: success / (success + failure)
  };
  const fullOutcome = {
    groups,
    aggregate: {
      ...headline,
      total_adaptation_burden: burden
    }
  };

  return {
    world_id: world.world_id,
    groups,
    aggregate_headline: headline,
    aggregate_headline_signature_sha256: sha256(headline),
    subgroup_outcome_signature_sha256: sha256(groups),
    burden_signature_sha256: sha256(Object.fromEntries(groupIds.map(groupId => [groupId, {
      adaptation_cost_per_success: groups[groupId].adaptation_cost_per_success,
      total_adaptation_burden: groups[groupId].total_adaptation_burden
    }]))),
    full_outcome: fullOutcome,
    subgroup_success_rate_gap: Math.max(...successRates) - Math.min(...successRates),
    adaptation_cost_ratio: Math.min(...perSuccessCosts) === 0 ? null : Math.max(...perSuccessCosts) / Math.min(...perSuccessCosts)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildSubgroupChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:population`,
    event_type: 'group_population_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.population_groups
  });
  push({
    event_id: `${result.world_id}:intervention`,
    event_type: 'institutional_intervention_selected',
    evidence_class: 'institution_selected_intervention',
    authority: 'fixture_institution',
    source_event_ids: [`${result.world_id}:population`],
    payload: fixture.institutional_intervention
  });
  push({
    event_id: `${result.world_id}:group-outcomes`,
    event_type: 'group_outcomes_observed',
    evidence_class: 'intervention_conditioned_group_observation',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:intervention`],
    payload: result.groups
  });
  push({
    event_id: `${result.world_id}:aggregate`,
    event_type: 'aggregate_headline_computed',
    evidence_class: 'lossy_aggregate',
    authority: 'fixture_dashboard',
    source_event_ids: [`${result.world_id}:group-outcomes`],
    payload: {
      headline: result.aggregate_headline,
      group_slices_reported: false,
      aggregate_headline_signature_sha256: result.aggregate_headline_signature_sha256
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'fixture_analyst',
    source_event_ids: [`${result.world_id}:aggregate`],
    payload: {
      allowed_interpretation: 'aggregate_success_under_the_recorded_group_outcomes',
      refused_promotions: [
        'subgroup_parity',
        'voluntary_preference',
        'low_adaptation_burden',
        'distributional_acceptability',
        'public_authorization',
        'manipulative_intent'
      ]
    }
  });
  return events;
}

export function validateSubgroupChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('subgroup chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate subgroup event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`subgroup event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`subgroup event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`subgroup event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceSubgroupFixture(fixture) {
  const errors = validatePreferenceSubgroupFixture(fixture);
  if (errors.length) throw new Error(`invalid preference subgroup fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => simulateSubgroupWorld(fixture, world));
  for (const result of worlds) {
    if (result.aggregate_headline.success !== fixture.expected_headline.success ||
        result.aggregate_headline.failure !== fixture.expected_headline.failure ||
        !close(result.aggregate_headline.success_rate, fixture.expected_headline.success_rate)) {
      throw new Error(`world ${result.world_id} does not produce the frozen aggregate headline`);
    }
    result.custody_chain = buildSubgroupChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const headlineSignatures = unique(worlds.map(world => world.aggregate_headline_signature_sha256));
  const subgroupSignatures = unique(worlds.map(world => world.subgroup_outcome_signature_sha256));
  const burdenSignatures = unique(worlds.map(world => world.burden_signature_sha256));

  return {
    schema_version: PREFERENCE_SUBGROUP_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    population_groups: fixture.population_groups,
    institutional_intervention: fixture.institutional_intervention,
    expected_headline: fixture.expected_headline,
    worlds,
    metrics: {
      distinct_aggregate_headline_signatures: headlineSignatures.length,
      distinct_subgroup_outcome_signatures: subgroupSignatures.length,
      distinct_burden_signatures: burdenSignatures.length,
      all_aggregate_headlines_equal: headlineSignatures.length === 1,
      maximum_subgroup_success_rate_gap: Math.max(...worlds.map(world => world.subgroup_success_rate_gap)),
      maximum_adaptation_cost_ratio: Math.max(...worlds.map(world => world.adaptation_cost_ratio ?? 0)),
      aggregate_success_rate: fixture.expected_headline.success_rate
    },
    identification: {
      subgroup_outcomes: 'unavailable_from_aggregate',
      adaptation_burden: 'unavailable_from_aggregate',
      willingness_or_preference: 'unavailable_from_adaptation',
      distributional_acceptability: 'requires_external_group_standing',
      required_additional_evidence: fixture.required_disambiguation_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceSubgroupBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_SUBGROUP_BUILD_SCHEMA_VERSION) errors.push('preference subgroup build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('subgroup build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('subgroup build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('subgroup fixture must not generate a real-world conclusion');
  if (compiled?.metrics?.distinct_aggregate_headline_signatures !== 1) errors.push('subgroup fixture must produce one aggregate headline signature');
  if (!(compiled?.metrics?.distinct_subgroup_outcome_signatures >= 3)) errors.push('subgroup fixture must preserve at least three distinct subgroup outcomes');
  if (!(compiled?.metrics?.distinct_burden_signatures >= 3)) errors.push('subgroup fixture must preserve at least three distinct burden distributions');
  if (compiled?.metrics?.all_aggregate_headlines_equal !== true) errors.push('all subgroup worlds must share the aggregate headline');
  if (!(compiled?.metrics?.maximum_subgroup_success_rate_gap >= 0.4)) errors.push('subgroup fixture must preserve a material success-rate gap');
  if (!(compiled?.metrics?.maximum_adaptation_cost_ratio >= 15)) errors.push('subgroup fixture must preserve material adaptation-cost inequality');
  if (!close(compiled?.metrics?.aggregate_success_rate, 0.8)) errors.push('subgroup fixture must preserve the frozen 80 percent aggregate success rate');
  if (compiled?.classification?.subgroup_outcome_identification_from_aggregate !== 'unavailable') errors.push('fixture must refuse subgroup-outcome identification');
  if (compiled?.classification?.adaptation_burden_identification_from_aggregate !== 'unavailable') errors.push('fixture must refuse burden identification');
  if (compiled?.classification?.willingness_identification_from_adaptation !== 'unavailable') errors.push('fixture must refuse willingness identification');
  if (compiled?.classification?.same_aggregate_implies_same_distribution !== false) errors.push('fixture must refuse aggregate equivalence as distributional equivalence');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.subgroup_outcomes !== 'unavailable_from_aggregate') errors.push('subgroup identification boundary is required');
  if (compiled?.identification?.adaptation_burden !== 'unavailable_from_aggregate') errors.push('burden identification boundary is required');
  if (compiled?.identification?.willingness_or_preference !== 'unavailable_from_adaptation') errors.push('willingness identification boundary is required');
  if (unique(compiled?.identification?.required_additional_evidence).length < 5) errors.push('disambiguation evidence requirements are incomplete');

  const headlines = unique(array(compiled?.worlds).map(world => world?.aggregate_headline_signature_sha256));
  if (headlines.length !== 1) errors.push('compiled subgroup worlds do not share one aggregate headline');
  for (const world of array(compiled?.worlds)) {
    errors.push(...validateSubgroupChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    for (const [groupId, outcome] of Object.entries(object(world?.groups))) {
      if (outcome.success + outcome.failure !== outcome.denominator) errors.push(`world ${world?.world_id} group ${groupId} does not reconcile`);
    }
  }

  const mandatoryRules = [
    'aggregate_success_is_not_subgroup_parity',
    'adaptation_is_not_preference',
    'compliance_is_not_low_burden',
    'average_outcome_does_not_cancel_group_harm',
    'high_capacity_group_is_not_universal_population',
    'missing_group_slice_is_not_no_disparity',
    'distributional_acceptability_requires_external_authority'
  ];
  for (const rule of mandatoryRules) {
    if (!array(compiled?.refusal_rules).includes(rule)) errors.push(`compiled refusal rule missing: ${rule}`);
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceSubgroupMarkdown(compiled) {
  const lines = [
    '# Preference custody: subgroup response capacity and burden',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared aggregate headline',
    '',
    `- Success: ${compiled.expected_headline.success}`,
    `- Failure: ${compiled.expected_headline.failure}`,
    `- Success rate: ${percentage(compiled.expected_headline.success_rate)}`,
    '',
    '## Compatible group worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    for (const [groupId, outcome] of Object.entries(world.groups)) {
      lines.push(`- ${groupId}: success ${outcome.success}/${outcome.denominator} (${percentage(outcome.success_rate)}); cost per success ${outcome.adaptation_cost_per_success}; total burden ${outcome.total_adaptation_burden}`);
    }
    lines.push(`- Subgroup success-rate gap: ${percentage(world.subgroup_success_rate_gap)}`);
    lines.push(`- Adaptation cost ratio: ${world.adaptation_cost_ratio?.toFixed(2) ?? 'undefined'}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Subgroup outcomes identified from aggregate: false',
    '- Adaptation burden identified from aggregate: false',
    '- Willingness or preference identified from adaptation: false',
    '- Distributional acceptability established: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Required additional evidence',
    ''
  );
  for (const item of compiled.identification.required_additional_evidence) lines.push(`- ${item}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
