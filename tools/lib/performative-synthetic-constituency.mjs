export const PERFORMATIVE_FIXTURE_SCHEMA_VERSION = 'performative-synthetic-constituency-fixture@1';
export const PERFORMATIVE_BUILD_SCHEMA_VERSION = 'performative-synthetic-constituency-build@1';

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

function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function normalizedDistribution(value, optionIds, label, errors) {
  const distribution = object(value);
  const keys = Object.keys(distribution).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...optionIds].sort())) {
    errors.push(`${label} must use exactly the latent-preference option IDs`);
    return distribution;
  }
  for (const optionId of optionIds) {
    const probability = Number(distribution[optionId]);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      errors.push(`${label}.${optionId} must be a finite probability in [0, 1]`);
    }
  }
  if (!close(sum(optionIds.map(optionId => distribution[optionId])), 1)) {
    errors.push(`${label} must sum to 1`);
  }
  return distribution;
}

export function validatePerformativeFixture(fixture) {
  const errors = [];
  const population = object(fixture?.population);
  const latent = object(population.latent_preferences);
  const optionIds = Object.keys(latent).sort();
  const rounds = array(fixture?.rounds);

  if (fixture?.schema_version !== PERFORMATIVE_FIXTURE_SCHEMA_VERSION) errors.push('performative fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('synthetic fixture must not count toward thesis evidence');
  if (fixture?.population?.preference_mutable !== false) errors.push('fixed-preference fixture must declare preference_mutable false');
  if (!Number.isInteger(population.total) || population.total <= 0) errors.push('population.total must be a positive integer');
  if (optionIds.length < 2) errors.push('fixture requires at least two latent-preference options');

  for (const optionId of optionIds) {
    const count = Number(latent[optionId]);
    if (!Number.isInteger(count) || count < 0) errors.push(`latent preference ${optionId} must be a non-negative integer`);
  }
  if (sum(optionIds.map(optionId => latent[optionId])) !== population.total) {
    errors.push('latent preference counts must sum to population.total');
  }

  normalizedDistribution(fixture?.initial_model_prediction, optionIds, 'initial_model_prediction', errors);

  if (fixture?.response_model?.rule !== 'click_if_preferred_option_is_shown') errors.push('unsupported response model rule');
  if (fixture?.response_model?.cross_option_clicks !== false) errors.push('fixture must disable cross-option clicks');
  if (!text(fixture?.response_model?.nonresponse_interpretation)) errors.push('nonresponse interpretation is required');

  if (rounds.length !== 2) errors.push('fixture must contain exactly two rounds');
  if (rounds[0]?.round !== 1 || rounds[1]?.round !== 2) errors.push('rounds must be ordered 1, 2');
  normalizedDistribution(rounds[0]?.exposure_policy, optionIds, 'rounds[0].exposure_policy', errors);
  if (rounds[1]?.exposure_policy !== 'prior_naive_estimate') errors.push('round 2 must derive exposure from the prior naive estimate');

  const expected = object(fixture?.expected_classification);
  const requiredExpected = {
    exposure_confounding_supported: true,
    counterfactual_starvation_supported: true,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false,
    preference_identification_without_propensity: 'unavailable'
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expected[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited_inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');

  return errors;
}

export function simulateExposureRound(latentPreferences, exposurePolicy) {
  const optionIds = Object.keys(latentPreferences).sort();
  const observedFeedback = {};
  const correctedCounts = {};
  let observedTotal = 0;

  for (const optionId of optionIds) {
    const exposure = Number(exposurePolicy[optionId]);
    const observed = Number(latentPreferences[optionId]) * exposure;
    observedFeedback[optionId] = observed;
    observedTotal += observed;
    correctedCounts[optionId] = exposure > 0 ? observed / exposure : null;
  }

  const naiveEstimate = Object.fromEntries(optionIds.map(optionId => [
    optionId,
    observedTotal > 0 ? observedFeedback[optionId] / observedTotal : null
  ]));

  const correctedTotal = sum(optionIds.map(optionId => correctedCounts[optionId] ?? 0));
  const propensityCorrectedEstimate = Object.fromEntries(optionIds.map(optionId => [
    optionId,
    correctedCounts[optionId] === null || correctedTotal === 0
      ? null
      : correctedCounts[optionId] / correctedTotal
  ]));

  return {
    exposure_policy: Object.fromEntries(optionIds.map(optionId => [optionId, Number(exposurePolicy[optionId])])),
    observed_feedback: observedFeedback,
    observed_feedback_total: observedTotal,
    naive_estimate: naiveEstimate,
    propensity_corrected_estimate: propensityCorrectedEstimate
  };
}

export function compilePerformativeFixture(fixture) {
  const errors = validatePerformativeFixture(fixture);
  if (errors.length) throw new Error(`invalid performative fixture:\n- ${errors.join('\n- ')}`);

  const latentPreferences = object(fixture.population.latent_preferences);
  const latentDistribution = Object.fromEntries(Object.entries(latentPreferences).map(([optionId, count]) => [
    optionId,
    Number(count) / fixture.population.total
  ]));

  const first = simulateExposureRound(latentPreferences, fixture.rounds[0].exposure_policy);
  const second = simulateExposureRound(latentPreferences, first.naive_estimate);

  const rounds = [
    {
      round: 1,
      model_prediction: fixture.initial_model_prediction,
      policy_source: fixture.rounds[0].policy_source,
      ...first
    },
    {
      round: 2,
      model_prediction: first.naive_estimate,
      policy_source: fixture.rounds[1].policy_source,
      ...second
    }
  ];

  const optionIds = Object.keys(latentPreferences).sort();
  const maxNaiveDrift = Math.max(...rounds.flatMap(round => optionIds.map(optionId => (
    Math.abs(round.naive_estimate[optionId] - latentDistribution[optionId])
  ))));
  const maxCorrectedDrift = Math.max(...rounds.flatMap(round => optionIds.map(optionId => (
    Math.abs(round.propensity_corrected_estimate[optionId] - latentDistribution[optionId])
  ))));

  return {
    schema_version: PERFORMATIVE_BUILD_SCHEMA_VERSION,
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
      latent_preferences: latentPreferences,
      latent_distribution: latentDistribution
    },
    response_model: fixture.response_model,
    rounds,
    metrics: {
      max_naive_absolute_drift_from_latent: maxNaiveDrift,
      max_propensity_corrected_absolute_drift_from_latent: maxCorrectedDrift
    },
    classification: fixture.expected_classification,
    refusal_rules: [
      'not_exposed_is_not_rejected',
      'no_click_is_not_negative_preference',
      'raw_engagement_share_is_not_population_preference',
      'propensity_correction_requires_logged_exposure',
      'synthetic_fixture_creates_no_real_world_claim'
    ],
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePerformativeBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PERFORMATIVE_BUILD_SCHEMA_VERSION) errors.push('performative build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('performative build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('performative build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('performative fixture must not generate a real-world conclusion');
  if (compiled?.population?.preference_mutable !== false) errors.push('compiled population must preserve fixed preferences');
  if (array(compiled?.rounds).length !== 2) errors.push('compiled build must contain two rounds');
  if (!(compiled?.metrics?.max_naive_absolute_drift_from_latent > 0.3)) errors.push('fixture must demonstrate material naive drift');
  if (!(compiled?.metrics?.max_propensity_corrected_absolute_drift_from_latent <= EPSILON)) errors.push('propensity-corrected estimate must recover the frozen latent distribution');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (!array(compiled?.refusal_rules).includes('not_exposed_is_not_rejected')) errors.push('not-exposed refusal rule is required');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPerformativeFixtureMarkdown(compiled) {
  const options = Object.keys(compiled.population.latent_distribution).sort();
  const lines = [
    '# Performative synthetic constituency: exposure-confounding fixture',
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
    lines.push(`- ${optionId}: ${compiled.population.latent_preferences[optionId]} (${percentage(compiled.population.latent_distribution[optionId])})`);
  }
  lines.push('', '## Rounds', '');
  for (const round of compiled.rounds) {
    lines.push(`### Round ${round.round}`, '');
    for (const optionId of options) {
      lines.push(`- ${optionId} exposure: ${percentage(round.exposure_policy[optionId])}; expected observed feedback: ${round.observed_feedback[optionId].toFixed(4)}; naive share: ${percentage(round.naive_estimate[optionId])}; corrected share: ${percentage(round.propensity_corrected_estimate[optionId])}`);
    }
    lines.push('');
  }
  lines.push(
    '## Result',
    '',
    `- Maximum naive absolute drift from latent preference: ${percentage(compiled.metrics.max_naive_absolute_drift_from_latent)}`,
    `- Maximum propensity-corrected absolute drift: ${percentage(compiled.metrics.max_propensity_corrected_absolute_drift_from_latent)}`,
    '- Preference change present: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Refusal rules',
    ''
  );
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
