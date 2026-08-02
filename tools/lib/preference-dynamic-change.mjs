import { createHash } from 'node:crypto';

export const PREFERENCE_DYNAMIC_CHANGE_FIXTURE_SCHEMA_VERSION = 'preference-dynamic-change-fixture@1';
export const PREFERENCE_DYNAMIC_CHANGE_BUILD_SCHEMA_VERSION = 'preference-dynamic-change-build@1';

const OPTION_IDS = ['A', 'B'];
const EXPECTED_WORLD_IDS = [
  'composition-replacement-no-conversion',
  'instrument-drift-no-conversion',
  'postprocessing-imputation-no-conversion',
  'stable-panel-neutral-learning-conversion',
  'stable-panel-targeted-exposure-conversion',
  'strategic-compliance-no-conversion'
];
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

function emptyCounts() {
  return { A: 0, B: 0 };
}

function emptyMatrix(rowIds, columnIds) {
  return Object.fromEntries(rowIds.map(rowId => [
    rowId,
    Object.fromEntries(columnIds.map(columnId => [columnId, 0]))
  ]));
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
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...OPTION_IDS].sort())) {
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

function cohortCounts(cohorts, field) {
  const counts = emptyCounts();
  for (const cohort of array(cohorts)) counts[cohort[field]] += Number(cohort.count);
  return counts;
}

function validateCohort(cohort, label, errors) {
  if (!text(cohort?.cohort_id)) errors.push(`${label} requires cohort_id`);
  if (!Number.isInteger(cohort?.count) || cohort.count <= 0) errors.push(`${label}.count must be a positive integer`);
  if (!OPTION_IDS.includes(cohort?.latent_preference)) errors.push(`${label}.latent_preference must be A or B`);
  if (!OPTION_IDS.includes(cohort?.reported_choice)) errors.push(`${label}.reported_choice must be A or B`);
}

function requiredExpectedClassification() {
  return {
    aggregate_shift_identifies_individual_preference_change: false,
    stable_panel_identity_alone_is_sufficient: false,
    instrument_invariance_or_crosswalk_required: true,
    reported_choice_always_equals_latent_preference: false,
    entry_and_exit_are_individual_conversion: false,
    imputation_is_observed_human_response: false,
    targeted_exposure_conversion_supports_performative_path: true,
    targeted_exposure_conversion_establishes_manipulation: false,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceDynamicChangeFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const baselineCohorts = array(baseline.cohorts);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_DYNAMIC_CHANGE_FIXTURE_SCHEMA_VERSION) errors.push('preference dynamic-change fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!text(baseline.instrument_version) || !text(baseline.wording_hash)) errors.push('baseline instrument version and wording hash are required');
  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  if (baselineCohorts.length < 3) errors.push('baseline requires at least three cohorts');
  const baselineIds = baselineCohorts.map(cohort => text(cohort?.cohort_id));
  if (unique(baselineIds).length !== baselineCohorts.length) errors.push('baseline cohort IDs must be unique');
  baselineCohorts.forEach((cohort, index) => validateCohort(cohort, `baseline cohort ${index}`, errors));
  if (sum(baselineCohorts.map(cohort => cohort.count)) !== baseline.population_total) errors.push('baseline cohorts must sum to population_total');
  validateCounts(baseline.expected_latent_counts, 'baseline expected_latent_counts', baseline.population_total, errors);
  validateCounts(baseline.expected_observed_counts, 'baseline expected_observed_counts', baseline.population_total, errors);
  const computedBaselineLatent = cohortCounts(baselineCohorts, 'latent_preference');
  const computedBaselineObserved = cohortCounts(baselineCohorts, 'reported_choice');
  if (JSON.stringify(computedBaselineLatent) !== JSON.stringify(baseline.expected_latent_counts)) errors.push('baseline latent counts do not match cohorts');
  if (JSON.stringify(computedBaselineObserved) !== JSON.stringify(baseline.expected_observed_counts)) errors.push('baseline observed counts do not match cohorts');

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the six required dynamic worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worlds.length) errors.push('world IDs must be unique');

  const baselineById = Object.fromEntries(baselineCohorts.map(cohort => [cohort.cohort_id, cohort]));
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.instrument);
    const exposure = object(world?.exposure);
    const incentive = object(world?.incentive);
    const postprocessing = object(world?.postprocessing);
    const postCohorts = array(world?.post_cohorts);

    if (!text(instrument.version) || !text(instrument.wording_hash) || typeof instrument.invariant_from_baseline !== 'boolean') {
      errors.push(`world ${worldId} requires instrument version, wording hash, and invariance state`);
    }
    if (instrument.invariant_from_baseline === true
        && (instrument.version !== baseline.instrument_version || instrument.wording_hash !== baseline.wording_hash)) {
      errors.push(`world ${worldId} claims instrument invariance but changes the instrument`);
    }
    if (instrument.invariant_from_baseline === false
        && instrument.version === baseline.instrument_version
        && instrument.wording_hash === baseline.wording_hash) {
      errors.push(`world ${worldId} claims instrument drift without changing the instrument`);
    }

    if (!text(exposure.assignment) || !text(exposure.content_class) || !text(exposure.causal_design)) errors.push(`world ${worldId} exposure custody is incomplete`);
    if (!Array.isArray(exposure.target_cohorts)) errors.push(`world ${worldId} target_cohorts must be an array`);
    for (const cohortId of array(exposure.target_cohorts)) {
      if (!baselineById[cohortId]) errors.push(`world ${worldId} targets unknown baseline cohort ${cohortId}`);
    }
    if (!text(incentive.state) || typeof incentive.reporting_pressure !== 'boolean') errors.push(`world ${worldId} incentive custody is incomplete`);
    if (!text(postprocessing.state) || !Number.isInteger(postprocessing.imputed_count) || postprocessing.imputed_count < 0) {
      errors.push(`world ${worldId} postprocessing custody is incomplete`);
    }

    if (postCohorts.length < 2) errors.push(`world ${worldId} requires at least two post cohorts`);
    const postIds = postCohorts.map(cohort => text(cohort?.cohort_id));
    if (unique(postIds).length !== postCohorts.length) errors.push(`world ${worldId} post cohort IDs must be unique`);
    postCohorts.forEach((cohort, index) => {
      validateCohort(cohort, `world ${worldId} cohort ${index}`, errors);
      if (!['retained', 'entrant'].includes(cohort?.origin)) errors.push(`world ${worldId} cohort ${cohort?.cohort_id} origin must be retained or entrant`);
      if (!['direct', 'imputed'].includes(cohort?.observation_source)) errors.push(`world ${worldId} cohort ${cohort?.cohort_id} observation_source must be direct or imputed`);
      if (cohort?.origin === 'retained' && !baselineById[cohort?.cohort_id]) errors.push(`world ${worldId} retained cohort ${cohort?.cohort_id} lacks a baseline identity`);
      if (cohort?.origin === 'entrant' && baselineById[cohort?.cohort_id]) errors.push(`world ${worldId} entrant ${cohort?.cohort_id} reuses a baseline identity`);
      if (cohort?.origin === 'retained' && baselineById[cohort?.cohort_id] && cohort.count > baselineById[cohort.cohort_id].count) {
        errors.push(`world ${worldId} retained cohort ${cohort.cohort_id} exceeds its baseline count`);
      }
    });
    if (sum(postCohorts.map(cohort => cohort.count)) !== baseline.population_total) errors.push(`world ${worldId} post cohorts must preserve the frozen population total`);

    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of [
      'expected_individual_conversion_count',
      'expected_entrants',
      'expected_exits',
      'expected_report_latent_divergence_count',
      'expected_imputed_count'
    ]) {
      if (!Number.isInteger(world?.[key]) || world[key] < 0) errors.push(`world ${worldId} ${key} must be a non-negative integer`);
    }
    validateCounts(world?.expected_observed_counts, `world ${worldId} expected_observed_counts`, baseline.population_total, errors);
    if (typeof world?.performative_path_supported !== 'boolean') errors.push(`world ${worldId} performative_path_supported must be boolean`);
  }

  const expectedMetrics = object(fixture?.expected_metrics);
  const requiredMetrics = {
    world_count: 6,
    distinct_observed_headline_signatures: 1,
    distinct_latent_headline_signatures: 2,
    distinct_mechanism_signatures: 6,
    worlds_with_individual_conversion: 2,
    worlds_without_individual_conversion: 4,
    worlds_with_stable_panel_identity: 5,
    worlds_with_composition_change: 1,
    worlds_with_instrument_drift: 1,
    worlds_with_strategic_compliance: 1,
    worlds_with_imputation: 1,
    worlds_with_targeted_performative_path: 1,
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) {
    if (expectedMetrics[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  }

  const expectedClassification = object(fixture?.expected_classification);
  for (const [key, value] of Object.entries(requiredExpectedClassification())) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'aggregate_shift_is_not_individual_preference_change',
    'panel_continuity_is_not_instrument_invariance',
    'reported_choice_is_not_latent_preference_under_strategic_incentive',
    'entry_and_exit_are_not_conversion',
    'imputation_is_not_observed_response',
    'instrument_drift_is_not_population_learning',
    'targeted_exposure_conversion_supports_performative_path_not_manipulation_or_intent',
    'longitudinal_change_requires_identity_transition_instrument_exposure_and_attrition_custody',
    'dynamic_preference_change_does_not_confer_public_authority'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 8) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id)
      || !text(fixture?.interpretation_contract?.what_this_is)
      || !text(fixture?.interpretation_contract?.what_this_is_not)
      || !text(fixture?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('interpretation contract is incomplete');
  }
  return errors;
}

function sameMembers(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

export function simulateDynamicChangeWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const baselineCohorts = array(baseline.cohorts);
  const baselineById = Object.fromEntries(baselineCohorts.map(cohort => [cohort.cohort_id, cohort]));
  const retainedById = {};
  const latentCounts = emptyCounts();
  const observedCounts = emptyCounts();
  const transitionMatrix = emptyMatrix(['A', 'B', 'ENTRY'], OPTION_IDS);
  const reportMatrix = emptyMatrix(OPTION_IDS, OPTION_IDS);
  let entrants = 0;
  let individualConversionCount = 0;
  let reportLatentDivergenceCount = 0;
  let imputedCount = 0;

  for (const cohort of array(world.post_cohorts)) {
    const count = Number(cohort.count);
    latentCounts[cohort.latent_preference] += count;
    observedCounts[cohort.reported_choice] += count;
    reportMatrix[cohort.latent_preference][cohort.reported_choice] += count;
    if (cohort.latent_preference !== cohort.reported_choice) reportLatentDivergenceCount += count;
    if (cohort.observation_source === 'imputed') imputedCount += count;

    if (cohort.origin === 'entrant') {
      entrants += count;
      transitionMatrix.ENTRY[cohort.latent_preference] += count;
    } else {
      const baselineCohort = baselineById[cohort.cohort_id];
      retainedById[cohort.cohort_id] = (retainedById[cohort.cohort_id] ?? 0) + count;
      transitionMatrix[baselineCohort.latent_preference][cohort.latent_preference] += count;
      if (baselineCohort.latent_preference !== cohort.latent_preference) individualConversionCount += count;
    }
  }

  let exits = 0;
  const identityDisposition = [];
  for (const baselineCohort of baselineCohorts) {
    const retained = retainedById[baselineCohort.cohort_id] ?? 0;
    const exited = baselineCohort.count - retained;
    exits += exited;
    identityDisposition.push({
      cohort_id: baselineCohort.cohort_id,
      baseline_count: baselineCohort.count,
      retained_count: retained,
      exited_count: exited,
      baseline_latent_preference: baselineCohort.latent_preference
    });
  }
  for (const cohort of array(world.post_cohorts).filter(item => item.origin === 'entrant')) {
    identityDisposition.push({
      cohort_id: cohort.cohort_id,
      baseline_count: 0,
      retained_count: 0,
      entrant_count: cohort.count,
      exited_count: 0,
      baseline_latent_preference: null
    });
  }

  const latentDistribution = distributionFromCounts(latentCounts);
  const observedDistribution = distributionFromCounts(observedCounts);
  const baselineLatentDistribution = distributionFromCounts(baseline.expected_latent_counts);
  const baselineObservedDistribution = distributionFromCounts(baseline.expected_observed_counts);
  const stablePanelIdentity = entrants === 0 && exits === 0;
  const compositionChange = entrants > 0 || exits > 0;
  const instrumentDrift = world.instrument.invariant_from_baseline === false;
  const strategicCompliance = world.incentive.reporting_pressure === true;
  const imputationPresent = imputedCount > 0 || world.postprocessing.imputed_count > 0;
  const observedLatentTotalVariation = totalVariation(observedDistribution, latentDistribution);

  const mechanismState = {
    expected_mechanism: world.expected_mechanism,
    individual_conversion_count: individualConversionCount,
    entrants,
    exits,
    stable_panel_identity: stablePanelIdentity,
    composition_change: compositionChange,
    instrument_drift: instrumentDrift,
    strategic_compliance: strategicCompliance,
    imputation_present: imputationPresent,
    performative_path_supported: world.performative_path_supported,
    exposure: world.exposure,
    incentive: world.incentive,
    postprocessing: world.postprocessing,
    transition_matrix: transitionMatrix,
    report_matrix: reportMatrix
  };

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    instrument: world.instrument,
    exposure: world.exposure,
    incentive: world.incentive,
    postprocessing: world.postprocessing,
    post_cohorts: world.post_cohorts,
    identity_disposition: identityDisposition,
    transition_matrix: transitionMatrix,
    report_matrix: reportMatrix,
    latent_counts: latentCounts,
    observed_counts: observedCounts,
    baseline_latent_distribution: baselineLatentDistribution,
    baseline_observed_distribution: baselineObservedDistribution,
    post_latent_distribution: latentDistribution,
    post_observed_distribution: observedDistribution,
    individual_conversion_count: individualConversionCount,
    entrants,
    exits,
    stable_panel_identity: stablePanelIdentity,
    composition_change: compositionChange,
    instrument_drift: instrumentDrift,
    strategic_compliance: strategicCompliance,
    report_latent_divergence_count: reportLatentDivergenceCount,
    imputed_count: imputedCount,
    observed_latent_total_variation: observedLatentTotalVariation,
    performative_path_supported: world.performative_path_supported,
    observed_headline_signature_sha256: sha256(observedDistribution),
    latent_headline_signature_sha256: sha256(latentDistribution),
    mechanism_signature_sha256: sha256(mechanismState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildDynamicChangeChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'baseline_longitudinal_cohort_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:instrument-exposure`,
    event_type: 'instrument_exposure_and_incentive_state',
    evidence_class: 'synthetic_control_mechanism',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: {
      instrument: result.instrument,
      exposure: result.exposure,
      incentive: result.incentive
    }
  });
  push({
    event_id: `${result.world_id}:identity-transition`,
    event_type: 'longitudinal_identity_and_latent_transition',
    evidence_class: 'synthetic_control_mechanism',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:instrument-exposure`],
    payload: {
      identity_disposition: result.identity_disposition,
      transition_matrix: result.transition_matrix,
      entrants: result.entrants,
      exits: result.exits,
      individual_conversion_count: result.individual_conversion_count
    }
  });
  push({
    event_id: `${result.world_id}:reporting`,
    event_type: 'reported_response_matrix',
    evidence_class: 'synthetic_control_observation',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:identity-transition`],
    payload: {
      report_matrix: result.report_matrix,
      report_latent_divergence_count: result.report_latent_divergence_count,
      post_observed_distribution: result.post_observed_distribution
    }
  });
  push({
    event_id: `${result.world_id}:postprocessing`,
    event_type: 'postprocessing_and_imputation_state',
    evidence_class: 'synthetic_control_postprocessing',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:reporting`],
    payload: {
      postprocessing: result.postprocessing,
      imputed_count: result.imputed_count
    }
  });
  push({
    event_id: `${result.world_id}:headline`,
    event_type: 'aggregate_headline_emitted',
    evidence_class: 'synthetic_control_observation',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:postprocessing`],
    payload: {
      latent_counts: result.latent_counts,
      observed_counts: result.observed_counts,
      post_latent_distribution: result.post_latent_distribution,
      post_observed_distribution: result.post_observed_distribution,
      observed_latent_total_variation: result.observed_latent_total_variation
    }
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'dynamic_change_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'dynamic_change_compiler',
    source_event_ids: [`${result.world_id}:headline`],
    payload: {
      mechanism: result.mechanism,
      stable_panel_identity: result.stable_panel_identity,
      composition_change: result.composition_change,
      instrument_drift: result.instrument_drift,
      strategic_compliance: result.strategic_compliance,
      performative_path_supported: result.performative_path_supported
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'dynamic_change_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic mechanism behind the frozen longitudinal headline',
      refused_promotions: [
        'aggregate_shift_as_individual_conversion',
        'panel_identity_as_instrument_invariance',
        'reported_choice_as_latent_preference',
        'composition_change_as_conversion',
        'imputation_as_observed_response',
        'performative_path_as_manipulation_or_intent',
        'dynamic_change_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceDynamicChangeChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('dynamic-change event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate dynamic-change event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`dynamic-change event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`dynamic-change event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`dynamic-change event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceDynamicChangeFixture(fixture) {
  const errors = validatePreferenceDynamicChangeFixture(fixture);
  if (errors.length) throw new Error(`invalid preference dynamic-change fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulateDynamicChangeWorld(fixture, world);
    const expectedObserved = world.expected_observed_counts;
    if (JSON.stringify(result.observed_counts) !== JSON.stringify(expectedObserved)) throw new Error(`world ${world.world_id} observed counts mismatch`);
    if (result.individual_conversion_count !== world.expected_individual_conversion_count) throw new Error(`world ${world.world_id} conversion count mismatch`);
    if (result.entrants !== world.expected_entrants) throw new Error(`world ${world.world_id} entrant count mismatch`);
    if (result.exits !== world.expected_exits) throw new Error(`world ${world.world_id} exit count mismatch`);
    if (result.report_latent_divergence_count !== world.expected_report_latent_divergence_count) throw new Error(`world ${world.world_id} report-latent divergence mismatch`);
    if (result.imputed_count !== world.expected_imputed_count) throw new Error(`world ${world.world_id} imputed count mismatch`);
    const chain = buildDynamicChangeChain(fixture, result);
    return {
      ...result,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null
    };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const observedSignatures = unique(worlds.map(world => world.observed_headline_signature_sha256));
  const latentSignatures = unique(worlds.map(world => world.latent_headline_signature_sha256));
  const mechanismSignatures = unique(worlds.map(world => world.mechanism_signature_sha256));
  const metrics = {
    world_count: worlds.length,
    distinct_observed_headline_signatures: observedSignatures.length,
    distinct_latent_headline_signatures: latentSignatures.length,
    distinct_mechanism_signatures: mechanismSignatures.length,
    worlds_with_individual_conversion: worlds.filter(world => world.individual_conversion_count > 0).length,
    worlds_without_individual_conversion: worlds.filter(world => world.individual_conversion_count === 0).length,
    worlds_with_stable_panel_identity: worlds.filter(world => world.stable_panel_identity).length,
    worlds_with_composition_change: worlds.filter(world => world.composition_change).length,
    worlds_with_instrument_drift: worlds.filter(world => world.instrument_drift).length,
    worlds_with_strategic_compliance: worlds.filter(world => world.strategic_compliance).length,
    worlds_with_imputation: worlds.filter(world => world.imputed_count > 0).length,
    worlds_with_targeted_performative_path: worlds.filter(world => world.performative_path_supported).length,
    binding_public_authority_worlds: 0,
    baseline_A_share: worlds[0].baseline_observed_distribution.A,
    post_A_share: worlds[0].post_observed_distribution.A,
    observed_A_share_shift: worlds[0].post_observed_distribution.A - worlds[0].baseline_observed_distribution.A,
    maximum_observed_latent_total_variation: Math.max(...worlds.map(world => world.observed_latent_total_variation))
  };

  for (const [key, value] of Object.entries(fixture.expected_metrics)) {
    if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  }

  return {
    schema_version: PREFERENCE_DYNAMIC_CHANGE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'dynamic_change_equifinality_qualified',
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

export function validatePreferenceDynamicChangeBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_DYNAMIC_CHANGE_BUILD_SCHEMA_VERSION) errors.push('preference dynamic-change build schema mismatch');
  if (compiled?.status !== 'dynamic_change_equifinality_qualified') errors.push('compiled dynamic-change status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled dynamic-change graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled dynamic-change must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled dynamic-change must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled dynamic-change real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled dynamic-change worlds are incomplete');

  const metrics = object(compiled?.metrics);
  const expectedMetrics = {
    world_count: 6,
    distinct_observed_headline_signatures: 1,
    distinct_latent_headline_signatures: 2,
    distinct_mechanism_signatures: 6,
    worlds_with_individual_conversion: 2,
    worlds_without_individual_conversion: 4,
    worlds_with_stable_panel_identity: 5,
    worlds_with_composition_change: 1,
    worlds_with_instrument_drift: 1,
    worlds_with_strategic_compliance: 1,
    worlds_with_imputation: 1,
    worlds_with_targeted_performative_path: 1,
    binding_public_authority_worlds: 0,
    baseline_A_share: 0.6,
    post_A_share: 0.8,
    observed_A_share_shift: 0.2,
    maximum_observed_latent_total_variation: 0.2
  };
  for (const [key, value] of Object.entries(expectedMetrics)) {
    if (!close(metrics[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  }

  const classification = object(compiled?.classification);
  for (const [key, value] of Object.entries(requiredExpectedClassification())) {
    if (classification[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  }
  if (classification.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  for (const world of array(compiled?.worlds)) {
    if (!close(world?.post_observed_distribution?.A, 0.8) || !close(world?.post_observed_distribution?.B, 0.2)) {
      errors.push(`world ${world?.world_id} must preserve the frozen 80/20 observed headline`);
    }
    if (!/^[0-9a-f]{64}$/.test(text(world?.observed_headline_signature_sha256))) errors.push(`world ${world?.world_id} observed signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.latent_headline_signature_sha256))) errors.push(`world ${world?.world_id} latent signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.mechanism_signature_sha256))) errors.push(`world ${world?.world_id} mechanism signature is invalid`);
    errors.push(...validatePreferenceDynamicChangeChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['stable-panel-neutral-learning-conversion']?.individual_conversion_count !== 200) errors.push('neutral-learning world must preserve 200 conversions');
  if (byId['stable-panel-targeted-exposure-conversion']?.performative_path_supported !== true) errors.push('targeted-exposure world must support the bounded performative path');
  if (byId['composition-replacement-no-conversion']?.individual_conversion_count !== 0
      || byId['composition-replacement-no-conversion']?.entrants !== 200
      || byId['composition-replacement-no-conversion']?.exits !== 200) {
    errors.push('composition world must preserve zero conversion with 200 entrants and exits');
  }
  if (byId['instrument-drift-no-conversion']?.instrument_drift !== true) errors.push('instrument-drift world must preserve changed measurement');
  if (byId['strategic-compliance-no-conversion']?.strategic_compliance !== true) errors.push('strategic-compliance world must preserve reporting pressure');
  if (byId['postprocessing-imputation-no-conversion']?.imputed_count !== 200) errors.push('imputation world must preserve 200 imputed observations');

  if (unique(compiled?.refusal_rules).length < 9) errors.push('compiled dynamic-change refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled dynamic-change caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceDynamicChangeMarkdown(compiled) {
  const lines = [
    '# Dynamic preference change, composition, and measurement custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Observed headline signatures:** ${compiled.metrics.distinct_observed_headline_signatures}`,
    '',
    `**Latent headline signatures:** ${compiled.metrics.distinct_latent_headline_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen headline',
    '',
    `- Baseline A share: ${percentage(compiled.metrics.baseline_A_share)}`,
    `- Post-period A share: ${percentage(compiled.metrics.post_A_share)}`,
    `- Observed shift: ${percentage(compiled.metrics.observed_A_share_shift)}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Individual conversions: ${world.individual_conversion_count}`);
    lines.push(`- Entrants: ${world.entrants}`);
    lines.push(`- Exits: ${world.exits}`);
    lines.push(`- Stable panel identity: ${world.stable_panel_identity}`);
    lines.push(`- Instrument drift: ${world.instrument_drift}`);
    lines.push(`- Strategic compliance: ${world.strategic_compliance}`);
    lines.push(`- Imputed observations: ${world.imputed_count}`);
    lines.push(`- Report-latent divergence: ${world.report_latent_divergence_count}`);
    lines.push(`- Post latent A share: ${percentage(world.post_latent_distribution.A)}`);
    lines.push(`- Post observed A share: ${percentage(world.post_observed_distribution.A)}`);
    lines.push(`- Performative path supported: ${world.performative_path_supported}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Aggregate separations',
    '',
    `- Distinct observed headlines: ${compiled.metrics.distinct_observed_headline_signatures}`,
    `- Distinct latent headlines: ${compiled.metrics.distinct_latent_headline_signatures}`,
    `- Distinct mechanisms: ${compiled.metrics.distinct_mechanism_signatures}`,
    `- Worlds with individual conversion: ${compiled.metrics.worlds_with_individual_conversion}`,
    `- Worlds without individual conversion: ${compiled.metrics.worlds_without_individual_conversion}`,
    `- Stable-panel worlds: ${compiled.metrics.worlds_with_stable_panel_identity}`,
    `- Composition-change worlds: ${compiled.metrics.worlds_with_composition_change}`,
    `- Instrument-drift worlds: ${compiled.metrics.worlds_with_instrument_drift}`,
    `- Strategic-compliance worlds: ${compiled.metrics.worlds_with_strategic_compliance}`,
    `- Imputation worlds: ${compiled.metrics.worlds_with_imputation}`,
    `- Targeted performative-path worlds: ${compiled.metrics.worlds_with_targeted_performative_path}`,
    `- Maximum observed-latent total variation: ${percentage(compiled.metrics.maximum_observed_latent_total_variation)}`,
    '',
    '## Classification',
    ''
  );
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
