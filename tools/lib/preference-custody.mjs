import { createHash } from 'node:crypto';

export const PREFERENCE_CUSTODY_FIXTURE_SCHEMA_VERSION = 'preference-custody-fixture@1';
export const PREFERENCE_CUSTODY_BUILD_SCHEMA_VERSION = 'preference-custody-build@1';

const EPSILON = 1e-12;
const UNAVAILABLE_MODES = new Set(['fallback', 'abstain']);

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

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(canonicalValue(value)), 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(canonicalBytes(value)).digest('hex');
}

function distributionFromCounts(counts, total) {
  return Object.fromEntries(Object.keys(counts).sort().map(optionId => [optionId, Number(counts[optionId]) / Number(total)]));
}

function validateProbabilityDistribution(distribution, optionIds, label, errors) {
  const value = object(distribution);
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...optionIds].sort())) {
    errors.push(`${label} must use exactly the population option IDs`);
    return;
  }
  for (const optionId of optionIds) {
    const probability = Number(value[optionId]);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      errors.push(`${label}.${optionId} must be a finite probability in [0, 1]`);
    }
  }
  if (!close(sum(optionIds.map(optionId => value[optionId])), 1)) errors.push(`${label} must sum to 1`);
}

export function validatePreferenceCustodyFixture(fixture) {
  const errors = [];
  const population = object(fixture?.population);
  const latent = object(population.latent_first_choice);
  const optionIds = Object.keys(latent).sort();
  const scenarios = array(fixture?.scenarios);

  if (fixture?.schema_version !== PREFERENCE_CUSTODY_FIXTURE_SCHEMA_VERSION) errors.push('preference custody fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (!Number.isInteger(population.total) || population.total <= 0) errors.push('population.total must be a positive integer');
  if (population.preference_mutable !== false) errors.push('fixed-preference fixture must declare preference_mutable false');
  if (optionIds.length < 3) errors.push('option-set starvation fixture requires at least three latent options');

  for (const optionId of optionIds) {
    const count = Number(latent[optionId]);
    if (!Number.isInteger(count) || count < 0) errors.push(`latent first-choice count ${optionId} must be a non-negative integer`);
  }
  if (sum(optionIds.map(optionId => latent[optionId])) !== population.total) errors.push('latent first-choice counts must sum to population.total');

  if (scenarios.length < 2) errors.push('fixture requires at least two scenarios');
  const scenarioIds = scenarios.map(scenario => text(scenario?.scenario_id));
  if (unique(scenarioIds).length !== scenarioIds.length) errors.push('scenario IDs must be unique');

  for (const scenario of scenarios) {
    const scenarioId = text(scenario?.scenario_id) || '(missing scenario ID)';
    const offered = unique(scenario?.offered_options).sort();
    const excluded = optionIds.filter(optionId => !offered.includes(optionId));
    const behavior = object(scenario?.unavailable_behavior);

    if (!text(scenario?.scenario_id)) errors.push('every scenario requires scenario_id');
    if (scenario?.assignment !== 'universal') errors.push(`scenario ${scenarioId} assignment must be universal`);
    if (!offered.length) errors.push(`scenario ${scenarioId} must offer at least one option`);
    if (offered.some(optionId => !optionIds.includes(optionId))) errors.push(`scenario ${scenarioId} offers an unknown option`);
    if (offered.length === optionIds.length) errors.push(`scenario ${scenarioId} must omit at least one latent option`);
    if (JSON.stringify(Object.keys(behavior).sort()) !== JSON.stringify(excluded.sort())) {
      errors.push(`scenario ${scenarioId} unavailable_behavior must cover exactly the excluded options`);
    }

    for (const optionId of excluded) {
      const rule = object(behavior[optionId]);
      if (!UNAVAILABLE_MODES.has(rule.mode)) errors.push(`scenario ${scenarioId} ${optionId} has invalid unavailable mode ${rule.mode}`);
      if (rule.mode === 'fallback') {
        if (!text(rule.target)) errors.push(`scenario ${scenarioId} ${optionId} fallback requires a target`);
        if (!offered.includes(rule.target)) errors.push(`scenario ${scenarioId} ${optionId} fallback target must be offered`);
      }
      if (rule.mode === 'abstain' && Object.hasOwn(rule, 'target')) errors.push(`scenario ${scenarioId} ${optionId} abstain rule cannot declare a target`);
    }
  }

  const expected = object(fixture?.expected_classification);
  const requiredExpected = {
    option_set_starvation_supported: true,
    same_population_distinct_observations_supported: true,
    first_choice_identification_from_raw_choices: 'unavailable',
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expected[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const requiredRules = unique(fixture?.required_refusal_rules);
  const mandatoryRules = [
    'unoffered_option_is_not_rejected',
    'choice_among_offered_options_is_not_latent_preference',
    'fallback_selection_is_not_first_choice',
    'nonresponse_is_not_negative_preference',
    'synthetic_prediction_is_not_public_authorization',
    'intervention_conditioned_observation_requires_option_set_provenance'
  ];
  for (const rule of mandatoryRules) {
    if (!requiredRules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }

  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited_inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');

  return errors;
}

export function simulateOptionSetScenario(latentFirstChoice, scenario) {
  const optionIds = Object.keys(latentFirstChoice).sort();
  const offeredOptions = unique(scenario.offered_options).sort();
  const excludedOptions = optionIds.filter(optionId => !offeredOptions.includes(optionId));
  const observedChoices = Object.fromEntries(offeredOptions.map(optionId => [optionId, 0]));
  const provenance = {};
  let nonresponse = 0;

  for (const optionId of optionIds) {
    const count = Number(latentFirstChoice[optionId]);
    if (offeredOptions.includes(optionId)) {
      observedChoices[optionId] += count;
      provenance[optionId] = {
        latent_first_choice_count: count,
        observed_as: optionId,
        observation_class: 'first_choice_selected_when_offered'
      };
      continue;
    }

    const rule = object(scenario.unavailable_behavior?.[optionId]);
    if (rule.mode === 'fallback') {
      observedChoices[rule.target] += count;
      provenance[optionId] = {
        latent_first_choice_count: count,
        observed_as: rule.target,
        observation_class: 'fallback_selected_because_first_choice_unavailable'
      };
    } else {
      nonresponse += count;
      provenance[optionId] = {
        latent_first_choice_count: count,
        observed_as: null,
        observation_class: 'nonresponse_with_first_choice_unavailable'
      };
    }
  }

  const choiceTotal = sum(Object.values(observedChoices));
  const rawChoiceShare = Object.fromEntries(offeredOptions.map(optionId => [
    optionId,
    choiceTotal > 0 ? observedChoices[optionId] / choiceTotal : null
  ]));
  const populationSelectionShare = Object.fromEntries(offeredOptions.map(optionId => [
    optionId,
    observedChoices[optionId] / sum(Object.values(latentFirstChoice))
  ]));
  const excludedObservationState = Object.fromEntries(excludedOptions.map(optionId => [optionId, 'unoffered']));

  return {
    scenario_id: scenario.scenario_id,
    assignment: scenario.assignment,
    offered_options: offeredOptions,
    excluded_options: excludedOptions,
    unavailable_behavior: scenario.unavailable_behavior,
    observed_choices: observedChoices,
    nonresponse,
    choice_total: choiceTotal,
    raw_choice_share_among_choices: rawChoiceShare,
    population_selection_share: populationSelectionShare,
    excluded_option_observation_state: excludedObservationState,
    provenance_by_latent_first_choice: provenance,
    first_choice_identification: 'unavailable_from_raw_choices',
    allowed_interpretation: 'behavior_among_offered_options_under_declared_unavailable_option_rules'
  };
}

function eventWithHash(event, previousEventSha256) {
  const unsigned = {
    ...event,
    previous_event_sha256: previousEventSha256
  };
  return {
    ...unsigned,
    event_sha256: sha256(unsigned)
  };
}

function buildCustodyChain(fixture, scenarioResults) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = eventWithHash(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: 'population-snapshot',
    event_type: 'population_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      preference_mutable: false,
      total: fixture.population.total,
      latent_first_choice: fixture.population.latent_first_choice
    }
  });

  for (const result of scenarioResults) {
    const prefix = result.scenario_id;
    push({
      event_id: `${prefix}:option-set`,
      event_type: 'option_set_authored',
      evidence_class: 'institution_selected_intervention',
      authority: 'fixture_institution',
      source_event_ids: ['population-snapshot'],
      payload: {
        offered_options: result.offered_options,
        excluded_options: result.excluded_options,
        unavailable_behavior: result.unavailable_behavior
      }
    });
    push({
      event_id: `${prefix}:exposure`,
      event_type: 'population_exposed',
      evidence_class: 'institution_selected_intervention',
      authority: 'fixture_institution',
      source_event_ids: [`${prefix}:option-set`],
      payload: {
        assignment: result.assignment,
        eligible_population: fixture.population.total,
        offered_options: result.offered_options
      }
    });
    push({
      event_id: `${prefix}:observation`,
      event_type: 'behavior_observed',
      evidence_class: 'intervention_conditioned_observation',
      authority: 'fixture_observer',
      source_event_ids: [`${prefix}:exposure`],
      payload: {
        observed_choices: result.observed_choices,
        nonresponse: result.nonresponse,
        raw_choice_share_among_choices: result.raw_choice_share_among_choices,
        excluded_option_observation_state: result.excluded_option_observation_state
      }
    });
    push({
      event_id: `${prefix}:interpretation`,
      event_type: 'interpretation_sealed',
      evidence_class: 'candidate_inference',
      authority: 'fixture_analyst',
      source_event_ids: [`${prefix}:observation`],
      payload: {
        allowed_interpretation: result.allowed_interpretation,
        first_choice_identification: result.first_choice_identification,
        forbidden_promotions: [
          'full_population_preference_distribution',
          'public_authorization',
          'preference_change',
          'manipulative_intent'
        ]
      }
    });
  }

  return events;
}

function scenarioObservationSignature(result) {
  return sha256({
    observed_choices: result.observed_choices,
    nonresponse: result.nonresponse,
    raw_choice_share_among_choices: result.raw_choice_share_among_choices
  });
}

export function compilePreferenceCustodyFixture(fixture) {
  const errors = validatePreferenceCustodyFixture(fixture);
  if (errors.length) throw new Error(`invalid preference custody fixture:\n- ${errors.join('\n- ')}`);

  const latentFirstChoice = object(fixture.population.latent_first_choice);
  const latentDistribution = distributionFromCounts(latentFirstChoice, fixture.population.total);
  const scenarioResults = fixture.scenarios.map(scenario => simulateOptionSetScenario(latentFirstChoice, scenario));
  const signatures = unique(scenarioResults.map(scenarioObservationSignature));
  const custodyChain = buildCustodyChain(fixture, scenarioResults);

  const naiveFullVectorDrifts = [];
  for (const result of scenarioResults) {
    const naiveFull = Object.fromEntries(Object.keys(latentDistribution).sort().map(optionId => [
      optionId,
      Object.hasOwn(result.raw_choice_share_among_choices, optionId)
        ? result.raw_choice_share_among_choices[optionId]
        : 0
    ]));
    result.unsupported_naive_full_vector = naiveFull;
    result.unsupported_naive_full_vector_label = 'for_demonstration_only_not_an_admissible_preference_estimate';
    for (const optionId of Object.keys(latentDistribution)) {
      naiveFullVectorDrifts.push(Math.abs(naiveFull[optionId] - latentDistribution[optionId]));
    }
  }

  return {
    schema_version: PREFERENCE_CUSTODY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    population: {
      total: fixture.population.total,
      preference_mutable: false,
      latent_first_choice: latentFirstChoice,
      latent_first_choice_distribution: latentDistribution
    },
    scenarios: scenarioResults,
    custody_chain: custodyChain,
    custody_chain_head_sha256: custodyChain.at(-1)?.event_sha256 ?? null,
    metrics: {
      distinct_observation_signatures: signatures.length,
      same_population_distinct_observations: signatures.length > 1,
      max_unsupported_naive_full_vector_absolute_drift: Math.max(...naiveFullVectorDrifts),
      excluded_options_with_identified_first_choice_share: 0
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validateCustodyChain(events) {
  const errors = [];
  const seenIds = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('custody event requires event_id');
    if (seenIds.has(event?.event_id)) errors.push(`duplicate custody event ID: ${event.event_id}`);
    seenIds.add(event?.event_id);
    if (event?.previous_event_sha256 !== previous) errors.push(`custody event ${event?.event_id} previous hash mismatch`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    const expectedHash = sha256(unsigned);
    if (event?.event_sha256 !== expectedHash) errors.push(`custody event ${event?.event_id} hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seenIds.has(sourceId)) errors.push(`custody event ${event?.event_id} references an unseen source event ${sourceId}`);
    }
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function validatePreferenceCustodyBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_BUILD_SCHEMA_VERSION) errors.push('preference custody build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('preference custody build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('preference custody build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('synthetic fixture must not generate a real-world conclusion');
  if (compiled?.population?.preference_mutable !== false) errors.push('compiled population must preserve fixed preferences');
  if (array(compiled?.scenarios).length < 2) errors.push('compiled build requires at least two scenarios');
  if (compiled?.metrics?.same_population_distinct_observations !== true) errors.push('fixture must demonstrate distinct observations from the same population');
  if (!(compiled?.metrics?.distinct_observation_signatures >= 2)) errors.push('fixture must preserve at least two observation signatures');
  if (!(compiled?.metrics?.max_unsupported_naive_full_vector_absolute_drift >= 0.3)) errors.push('fixture must demonstrate material naive full-vector drift');
  if (compiled?.metrics?.excluded_options_with_identified_first_choice_share !== 0) errors.push('excluded options must not receive an identified first-choice share');
  if (compiled?.classification?.first_choice_identification_from_raw_choices !== 'unavailable') errors.push('raw choices must not identify the full first-choice distribution');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');

  for (const result of array(compiled?.scenarios)) {
    if (result?.first_choice_identification !== 'unavailable_from_raw_choices') errors.push(`scenario ${result?.scenario_id} must refuse first-choice identification`);
    for (const state of Object.values(object(result?.excluded_option_observation_state))) {
      if (state !== 'unoffered') errors.push(`scenario ${result?.scenario_id} excluded option state must remain unoffered`);
    }
    if (sum(Object.values(object(result?.observed_choices))) + Number(result?.nonresponse) !== compiled.population.total) {
      errors.push(`scenario ${result?.scenario_id} observation accounting must reconcile to population total`);
    }
    validateProbabilityDistribution(
      result?.unsupported_naive_full_vector,
      Object.keys(compiled.population.latent_first_choice_distribution),
      `scenario ${result?.scenario_id} unsupported_naive_full_vector`,
      errors
    );
  }

  errors.push(...validateCustodyChain(compiled?.custody_chain));
  const chainHead = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== chainHead) errors.push('custody chain head mismatch');

  const mandatoryRules = [
    'unoffered_option_is_not_rejected',
    'choice_among_offered_options_is_not_latent_preference',
    'fallback_selection_is_not_first_choice',
    'nonresponse_is_not_negative_preference',
    'synthetic_prediction_is_not_public_authorization',
    'intervention_conditioned_observation_requires_option_set_provenance'
  ];
  for (const rule of mandatoryRules) {
    if (!array(compiled?.refusal_rules).includes(rule)) errors.push(`compiled refusal rule missing: ${rule}`);
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled copy-ready caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyMarkdown(compiled) {
  const options = Object.keys(compiled.population.latent_first_choice_distribution).sort();
  const lines = [
    '# Preference custody: option-set starvation fixture',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen population',
    '',
    `- Total: ${compiled.population.total}`,
    `- Preference mutable: ${compiled.population.preference_mutable}`
  ];
  for (const optionId of options) {
    lines.push(`- ${optionId}: ${compiled.population.latent_first_choice[optionId]} (${percentage(compiled.population.latent_first_choice_distribution[optionId])})`);
  }

  lines.push('', '## Scenarios', '');
  for (const scenario of compiled.scenarios) {
    lines.push(`### ${scenario.scenario_id}`, '');
    lines.push(`- Offered options: ${scenario.offered_options.join(', ')}`);
    lines.push(`- Excluded options: ${scenario.excluded_options.join(', ')}`);
    for (const optionId of scenario.offered_options) {
      lines.push(`- ${optionId}: ${scenario.observed_choices[optionId]} observed choices; ${percentage(scenario.raw_choice_share_among_choices[optionId])} of choices; ${percentage(scenario.population_selection_share[optionId])} of the population`);
    }
    lines.push(`- Nonresponse: ${scenario.nonresponse}`);
    for (const optionId of scenario.excluded_options) {
      lines.push(`- ${optionId} observation state: ${scenario.excluded_option_observation_state[optionId]}`);
    }
    lines.push('- Full first-choice distribution identified from raw choices: false', '');
  }

  lines.push(
    '## Result',
    '',
    `- Distinct observation signatures from the same population: ${compiled.metrics.distinct_observation_signatures}`,
    `- Maximum drift in the inadmissible zero-imputed full vector: ${percentage(compiled.metrics.max_unsupported_naive_full_vector_absolute_drift)}`,
    '- Preference change present: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Refusal rules',
    ''
  );
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Custody chain', '');
  lines.push(`- Events: ${compiled.custody_chain.length}`);
  lines.push(`- Head SHA-256: ${compiled.custody_chain_head_sha256}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
