import { createHash } from 'node:crypto';

export const PREFERENCE_ATTRITION_FIXTURE_SCHEMA_VERSION = 'preference-attrition-fixture@1';
export const PREFERENCE_ATTRITION_BUILD_SCHEMA_VERSION = 'preference-attrition-build@1';

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

function distributionFromCounts(counts) {
  const total = sum(Object.values(counts));
  return Object.fromEntries(Object.keys(counts).sort().map(optionId => [optionId, total > 0 ? Number(counts[optionId]) / total : null]));
}

function validateCountMap(value, optionIds, label, errors) {
  const counts = object(value);
  if (JSON.stringify(Object.keys(counts).sort()) !== JSON.stringify([...optionIds].sort())) {
    errors.push(`${label} must use exactly the baseline option IDs`);
    return;
  }
  for (const optionId of optionIds) {
    const count = Number(counts[optionId]);
    if (!Number.isInteger(count) || count < 0) errors.push(`${label}.${optionId} must be a non-negative integer`);
  }
}

function applyTransitions(baseline, transitions, errors, worldId) {
  const result = { ...baseline };
  for (const [transition, rawCount] of Object.entries(object(transitions))) {
    const match = /^(.+)_to_(.+)$/.exec(transition);
    const count = Number(rawCount);
    if (!match || !Object.hasOwn(result, match[1]) || !Object.hasOwn(result, match[2])) {
      errors?.push(`world ${worldId} has invalid transition ${transition}`);
      continue;
    }
    if (!Number.isInteger(count) || count < 0) {
      errors?.push(`world ${worldId} transition ${transition} must be a non-negative integer`);
      continue;
    }
    if (count > result[match[1]]) {
      errors?.push(`world ${worldId} transition ${transition} exceeds source population`);
      continue;
    }
    result[match[1]] -= count;
    result[match[2]] += count;
  }
  return result;
}

export function validatePreferenceAttritionFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline_first_choice);
  const optionIds = Object.keys(baseline).sort();
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_ATTRITION_FIXTURE_SCHEMA_VERSION) errors.push('preference attrition fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (!Number.isInteger(fixture?.population_total) || fixture.population_total <= 0) errors.push('population_total must be a positive integer');
  if (optionIds.length < 2) errors.push('fixture requires at least two baseline preference options');
  validateCountMap(baseline, optionIds, 'baseline_first_choice', errors);
  if (sum(Object.values(baseline)) !== fixture?.population_total) errors.push('baseline preferences must sum to population_total');
  if (!optionIds.includes(fixture?.institutional_intervention?.selected_option)) errors.push('selected option must exist in the baseline');
  if (fixture?.institutional_intervention?.headline_metric !== 'normalized_observed_share') errors.push('headline metric must remain normalized_observed_share');
  if (fixture?.institutional_intervention?.headline_denominator !== 'responding_or_retained_population_only') errors.push('headline denominator must remain responding_or_retained_population_only');

  const expectedHeadline = object(fixture?.expected_headline);
  if (JSON.stringify(Object.keys(expectedHeadline).sort()) !== JSON.stringify(optionIds)) errors.push('expected headline must use the baseline option IDs');
  for (const optionId of optionIds) {
    const value = Number(expectedHeadline[optionId]);
    if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(`expected headline ${optionId} must be a probability`);
  }
  if (!close(sum(Object.values(expectedHeadline)), 1)) errors.push('expected headline must sum to 1');

  if (worlds.length < 3) errors.push('fixture requires at least three candidate worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    if (!text(world?.world_id)) errors.push('every world requires world_id');
    validateCountMap(world?.exit, optionIds, `world ${worldId} exit`, errors);
    validateCountMap(world?.nonresponse, optionIds, `world ${worldId} nonresponse`, errors);
    const transitioned = applyTransitions(baseline, world?.preference_transitions, errors, worldId);
    for (const optionId of optionIds) {
      if (Number(world?.exit?.[optionId]) + Number(world?.nonresponse?.[optionId]) > transitioned[optionId]) {
        errors.push(`world ${worldId} exit plus nonresponse exceeds post-transition ${optionId} population`);
      }
    }
  }

  const expected = object(fixture?.expected_classification);
  const requiredExpected = {
    headline_equivalence_supported: true,
    full_outcome_divergence_supported: true,
    preference_change_identification_from_headline: 'unavailable',
    strategic_refusal_identification_from_headline: 'unavailable',
    population_support_identification_from_headline: 'unavailable',
    same_headline_implies_same_population_state: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expected[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const requiredRules = unique(fixture?.required_refusal_rules);
  const mandatoryRules = [
    'retained_sample_is_not_original_population',
    'exit_is_not_preference_conversion',
    'nonresponse_is_not_indifference',
    'churn_is_not_negative_preference_without_reason',
    'normalized_share_requires_denominator_and_attrition',
    'post_intervention_active_share_is_not_public_authorization',
    'organized_refusal_is_not_missing_data'
  ];
  for (const rule of mandatoryRules) {
    if (!requiredRules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_disambiguation_evidence).length < 5) errors.push('disambiguation evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited_inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function simulateAttritionWorld(fixture, world) {
  const baseline = object(fixture.baseline_first_choice);
  const optionIds = Object.keys(baseline).sort();
  const transitionErrors = [];
  const postTransition = applyTransitions(baseline, world.preference_transitions, transitionErrors, world.world_id);
  if (transitionErrors.length) throw new Error(transitionErrors.join('\n'));

  const observed = {};
  const disposition = {};
  for (const optionId of optionIds) {
    const exited = Number(world.exit[optionId]);
    const nonresponse = Number(world.nonresponse[optionId]);
    observed[optionId] = postTransition[optionId] - exited - nonresponse;
    disposition[optionId] = {
      baseline_first_choice: baseline[optionId],
      post_transition_preference: postTransition[optionId],
      exited,
      nonresponse,
      observed: observed[optionId]
    };
  }

  const headline = distributionFromCounts(observed);
  const fullOutcome = {
    post_transition_preference: postTransition,
    observed,
    exit: world.exit,
    nonresponse: world.nonresponse,
    observed_total: sum(Object.values(observed)),
    exit_total: sum(Object.values(world.exit)),
    nonresponse_total: sum(Object.values(world.nonresponse)),
    population_total: fixture.population_total
  };

  return {
    world_id: world.world_id,
    preference_transitions: world.preference_transitions,
    post_transition_preference: postTransition,
    exit: world.exit,
    nonresponse: world.nonresponse,
    observed,
    disposition_by_preference: disposition,
    headline_normalized_observed_share: headline,
    headline_signature_sha256: sha256(headline),
    full_outcome_signature_sha256: sha256(fullOutcome),
    mechanism_signature_sha256: sha256({
      preference_transitions: world.preference_transitions,
      exit: world.exit,
      nonresponse: world.nonresponse
    }),
    full_outcome: fullOutcome
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildAttritionChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'baseline_population_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      population_total: fixture.population_total,
      baseline_first_choice: fixture.baseline_first_choice
    }
  });
  push({
    event_id: `${result.world_id}:intervention`,
    event_type: 'institutional_intervention_selected',
    evidence_class: 'institution_selected_intervention',
    authority: 'fixture_institution',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: fixture.institutional_intervention
  });
  push({
    event_id: `${result.world_id}:disposition`,
    event_type: 'post_intervention_disposition',
    evidence_class: 'synthetic_control_mechanism',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:intervention`],
    payload: {
      preference_transitions: result.preference_transitions,
      exit: result.exit,
      nonresponse: result.nonresponse
    }
  });
  push({
    event_id: `${result.world_id}:observation`,
    event_type: 'behavior_observed',
    evidence_class: 'intervention_conditioned_observation',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:disposition`],
    payload: result.full_outcome
  });
  push({
    event_id: `${result.world_id}:headline`,
    event_type: 'headline_aggregation',
    evidence_class: 'lossy_aggregate',
    authority: 'fixture_dashboard',
    source_event_ids: [`${result.world_id}:observation`],
    payload: {
      metric: fixture.institutional_intervention.headline_metric,
      denominator: fixture.institutional_intervention.headline_denominator,
      normalized_observed_share: result.headline_normalized_observed_share,
      headline_signature_sha256: result.headline_signature_sha256
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'fixture_analyst',
    source_event_ids: [`${result.world_id}:headline`],
    payload: {
      allowed_interpretation: 'normalized_share_among_observed_people_under_the_recorded_disposition_process',
      refused_promotions: [
        'population_support',
        'preference_conversion',
        'absence_of_refusal',
        'public_authorization',
        'manipulative_intent'
      ]
    }
  });
  return events;
}

export function validateAttritionChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('attrition chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate attrition event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`attrition event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`attrition event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`attrition event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceAttritionFixture(fixture) {
  const errors = validatePreferenceAttritionFixture(fixture);
  if (errors.length) throw new Error(`invalid preference attrition fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => simulateAttritionWorld(fixture, world));
  for (const result of worlds) {
    for (const [optionId, expected] of Object.entries(fixture.expected_headline)) {
      if (!close(result.headline_normalized_observed_share[optionId], expected)) {
        throw new Error(`world ${result.world_id} does not produce the frozen expected headline`);
      }
    }
    result.custody_chain = buildAttritionChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const headlineSignatures = unique(worlds.map(world => world.headline_signature_sha256));
  const fullOutcomeSignatures = unique(worlds.map(world => world.full_outcome_signature_sha256));
  const mechanismSignatures = unique(worlds.map(world => world.mechanism_signature_sha256));
  const observedTotals = worlds.map(world => world.full_outcome.observed_total);
  const exitTotals = worlds.map(world => world.full_outcome.exit_total);
  const nonresponseTotals = worlds.map(world => world.full_outcome.nonresponse_total);

  return {
    schema_version: PREFERENCE_ATTRITION_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    population_total: fixture.population_total,
    baseline_first_choice: fixture.baseline_first_choice,
    institutional_intervention: fixture.institutional_intervention,
    expected_headline: fixture.expected_headline,
    worlds,
    metrics: {
      distinct_headline_signatures: headlineSignatures.length,
      distinct_full_outcome_signatures: fullOutcomeSignatures.length,
      distinct_mechanism_signatures: mechanismSignatures.length,
      all_headlines_equal: headlineSignatures.length === 1,
      observed_total_range: Math.max(...observedTotals) - Math.min(...observedTotals),
      exit_total_range: Math.max(...exitTotals) - Math.min(...exitTotals),
      nonresponse_total_range: Math.max(...nonresponseTotals) - Math.min(...nonresponseTotals)
    },
    identification: {
      preference_change: 'unavailable_from_headline',
      strategic_refusal: 'unavailable_from_headline',
      population_support: 'unavailable_from_headline',
      public_authorization: 'not_conferred_by_normalized_observed_share',
      required_additional_evidence: fixture.required_disambiguation_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceAttritionBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_ATTRITION_BUILD_SCHEMA_VERSION) errors.push('preference attrition build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('attrition build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('attrition build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('attrition fixture must not generate a real-world conclusion');
  if (!(compiled?.metrics?.distinct_headline_signatures === 1)) errors.push('attrition fixture must produce one shared headline signature');
  if (!(compiled?.metrics?.distinct_full_outcome_signatures >= 3)) errors.push('attrition fixture must preserve at least three distinct full outcomes');
  if (!(compiled?.metrics?.distinct_mechanism_signatures >= 3)) errors.push('attrition fixture must preserve at least three distinct mechanisms');
  if (compiled?.metrics?.all_headlines_equal !== true) errors.push('all attrition worlds must share the headline');
  if (!(compiled?.metrics?.observed_total_range >= 250)) errors.push('attrition fixture must preserve material denominator variation');
  if (!(compiled?.metrics?.exit_total_range >= 250)) errors.push('attrition fixture must preserve material exit variation');
  if (!(compiled?.metrics?.nonresponse_total_range >= 250)) errors.push('attrition fixture must preserve material nonresponse variation');
  if (compiled?.classification?.preference_change_identification_from_headline !== 'unavailable') errors.push('fixture must refuse preference-change identification');
  if (compiled?.classification?.strategic_refusal_identification_from_headline !== 'unavailable') errors.push('fixture must refuse strategic-refusal identification');
  if (compiled?.classification?.population_support_identification_from_headline !== 'unavailable') errors.push('fixture must refuse population-support identification');
  if (compiled?.classification?.same_headline_implies_same_population_state !== false) errors.push('fixture must refuse headline equivalence as population-state equivalence');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.preference_change !== 'unavailable_from_headline') errors.push('preference-change identification boundary is required');
  if (compiled?.identification?.strategic_refusal !== 'unavailable_from_headline') errors.push('strategic-refusal identification boundary is required');
  if (compiled?.identification?.population_support !== 'unavailable_from_headline') errors.push('population-support identification boundary is required');
  if (unique(compiled?.identification?.required_additional_evidence).length < 5) errors.push('disambiguation evidence requirements are incomplete');

  const headlines = unique(array(compiled?.worlds).map(world => world?.headline_signature_sha256));
  if (headlines.length !== 1) errors.push('compiled worlds do not share one headline signature');
  for (const world of array(compiled?.worlds)) {
    errors.push(...validateAttritionChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (sum(Object.values(object(world?.observed))) + sum(Object.values(object(world?.exit))) + sum(Object.values(object(world?.nonresponse))) !== compiled.population_total) {
      errors.push(`world ${world?.world_id} disposition does not reconcile to the population`);
    }
  }

  const mandatoryRules = [
    'retained_sample_is_not_original_population',
    'exit_is_not_preference_conversion',
    'nonresponse_is_not_indifference',
    'churn_is_not_negative_preference_without_reason',
    'normalized_share_requires_denominator_and_attrition',
    'post_intervention_active_share_is_not_public_authorization',
    'organized_refusal_is_not_missing_data'
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

export function renderPreferenceAttritionMarkdown(compiled) {
  const lines = [
    '# Preference custody: refusal, exit, and denominator fixture',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared headline',
    ''
  ];
  for (const [optionId, share] of Object.entries(compiled.expected_headline)) {
    lines.push(`- ${optionId}: ${percentage(share)}`);
  }
  lines.push('', '## Compatible worlds', '');
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Observed total: ${world.full_outcome.observed_total}`);
    lines.push(`- Exit total: ${world.full_outcome.exit_total}`);
    lines.push(`- Nonresponse total: ${world.full_outcome.nonresponse_total}`);
    for (const [optionId, count] of Object.entries(world.post_transition_preference)) {
      lines.push(`- ${optionId} post-transition preference: ${count}`);
    }
    lines.push(`- Full outcome signature: ${world.full_outcome_signature_sha256}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Preference change identified from headline: false',
    '- Strategic refusal identified from headline: false',
    '- Population support identified from headline: false',
    '- Public authorization conferred: false',
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
