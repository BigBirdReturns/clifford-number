import { createHash } from 'node:crypto';

export const PREFERENCE_EQUIFINALITY_FIXTURE_SCHEMA_VERSION = 'preference-equifinality-fixture@1';
export const PREFERENCE_EQUIFINALITY_BUILD_SCHEMA_VERSION = 'preference-equifinality-build@1';

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

function distributionFromCounts(counts, total) {
  return Object.fromEntries(Object.keys(counts).sort().map(optionId => [optionId, Number(counts[optionId]) / Number(total)]));
}

function totalVariation(left, right) {
  const optionIds = unique([...Object.keys(left), ...Object.keys(right)]).sort();
  return 0.5 * sum(optionIds.map(optionId => Math.abs(Number(left[optionId] ?? 0) - Number(right[optionId] ?? 0))));
}

function worldSignature(world) {
  return sha256({
    latent_first_choice: world.latent_first_choice,
    unavailable_behavior: world.unavailable_behavior
  });
}

function observationSignature(observation) {
  return sha256({
    observed_choices: observation.observed_choices,
    nonresponse: observation.nonresponse
  });
}

function validateExpectedObservation(observation, offeredOptions, total, errors) {
  const counts = object(observation?.observed_choices);
  if (JSON.stringify(Object.keys(counts).sort()) !== JSON.stringify([...offeredOptions].sort())) {
    errors.push('expected observation must use exactly the offered options');
  }
  for (const optionId of offeredOptions) {
    const count = Number(counts[optionId]);
    if (!Number.isInteger(count) || count < 0) errors.push(`expected observation ${optionId} must be a non-negative integer`);
  }
  const nonresponse = Number(observation?.nonresponse);
  if (!Number.isInteger(nonresponse) || nonresponse < 0) errors.push('expected observation nonresponse must be a non-negative integer');
  if (sum(Object.values(counts)) + nonresponse !== total) errors.push('expected observation must reconcile to population_total');
}

export function validatePreferenceEquifinalityFixture(fixture) {
  const errors = [];
  const worlds = array(fixture?.worlds);
  const offeredOptions = unique(fixture?.offered_options).sort();
  const total = Number(fixture?.population_total);

  if (fixture?.schema_version !== PREFERENCE_EQUIFINALITY_FIXTURE_SCHEMA_VERSION) errors.push('preference equifinality fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (!Number.isInteger(total) || total <= 0) errors.push('population_total must be a positive integer');
  if (fixture?.preference_mutable !== false) errors.push('fixture must declare preference_mutable false');
  if (offeredOptions.length < 2) errors.push('fixture requires at least two offered options');
  if (worlds.length < 3) errors.push('fixture requires at least three candidate worlds');

  validateExpectedObservation(fixture?.expected_observation, offeredOptions, total, errors);

  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  const allOptionIds = unique(worlds.flatMap(world => Object.keys(object(world?.latent_first_choice)))).sort();
  if (allOptionIds.length <= offeredOptions.length) errors.push('fixture requires at least one latent option outside the offered set');
  if (offeredOptions.some(optionId => !allOptionIds.includes(optionId))) errors.push('offered options must exist in every latent world');

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const latent = object(world?.latent_first_choice);
    const behavior = object(world?.unavailable_behavior);
    const excluded = allOptionIds.filter(optionId => !offeredOptions.includes(optionId));

    if (!text(world?.world_id)) errors.push('every world requires world_id');
    if (JSON.stringify(Object.keys(latent).sort()) !== JSON.stringify(allOptionIds)) errors.push(`world ${worldId} must use the complete latent option set`);
    for (const optionId of allOptionIds) {
      const count = Number(latent[optionId]);
      if (!Number.isInteger(count) || count < 0) errors.push(`world ${worldId} latent count ${optionId} must be a non-negative integer`);
    }
    if (sum(Object.values(latent)) !== total) errors.push(`world ${worldId} latent counts must sum to population_total`);
    if (JSON.stringify(Object.keys(behavior).sort()) !== JSON.stringify(excluded)) {
      errors.push(`world ${worldId} unavailable_behavior must cover exactly the unoffered options`);
    }
    for (const optionId of excluded) {
      const rule = object(behavior[optionId]);
      if (!UNAVAILABLE_MODES.has(rule.mode)) errors.push(`world ${worldId} ${optionId} has invalid unavailable mode ${rule.mode}`);
      if (rule.mode === 'fallback') {
        if (!text(rule.target)) errors.push(`world ${worldId} ${optionId} fallback requires a target`);
        if (!offeredOptions.includes(rule.target)) errors.push(`world ${worldId} ${optionId} fallback target must be offered`);
      }
      if (rule.mode === 'abstain' && Object.hasOwn(rule, 'target')) errors.push(`world ${worldId} ${optionId} abstain cannot declare a target`);
    }
  }

  if (unique(worlds.map(worldSignature)).length !== worlds.length) errors.push('candidate worlds must be materially distinct');

  const expected = object(fixture?.expected_classification);
  const requiredExpected = {
    observational_equivalence_supported: true,
    latent_first_choice_identification: 'unavailable',
    response_mechanism_identification: 'unavailable',
    same_behavior_implies_same_preference: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expected[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const requiredRules = unique(fixture?.required_refusal_rules);
  const mandatoryRules = [
    'same_behavior_does_not_imply_same_preference',
    'behavioral_fit_does_not_identify_mechanism',
    'aggregate_choice_does_not_identify_unavailable_demand',
    'model_match_does_not_confer_public_authorization',
    'observational_equivalence_requires_additional_evidence'
  ];
  for (const rule of mandatoryRules) {
    if (!requiredRules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_disambiguation_evidence).length < 3) errors.push('at least three disambiguation evidence classes are required');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited_inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function simulateEquifinalityWorld(world, offeredOptions) {
  const latent = object(world.latent_first_choice);
  const observedChoices = Object.fromEntries(offeredOptions.map(optionId => [optionId, 0]));
  const provenance = {};
  let nonresponse = 0;

  for (const [optionId, rawCount] of Object.entries(latent)) {
    const count = Number(rawCount);
    if (offeredOptions.includes(optionId)) {
      observedChoices[optionId] += count;
      provenance[optionId] = {
        latent_first_choice_count: count,
        observed_as: optionId,
        observation_class: 'first_choice_selected_when_offered'
      };
      continue;
    }

    const rule = object(world.unavailable_behavior?.[optionId]);
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
  return {
    world_id: world.world_id,
    latent_first_choice: latent,
    latent_first_choice_distribution: distributionFromCounts(latent, sum(Object.values(latent))),
    unavailable_behavior: world.unavailable_behavior,
    observed_choices: observedChoices,
    nonresponse,
    raw_choice_share_among_choices: Object.fromEntries(offeredOptions.map(optionId => [
      optionId,
      choiceTotal > 0 ? observedChoices[optionId] / choiceTotal : null
    ])),
    provenance_by_latent_first_choice: provenance,
    world_signature_sha256: worldSignature(world),
    observation_signature_sha256: observationSignature({ observed_choices: observedChoices, nonresponse })
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildWorldChain(result, offeredOptions) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:population`,
    event_type: 'population_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      latent_first_choice: result.latent_first_choice,
      preference_mutable: false
    }
  });
  push({
    event_id: `${result.world_id}:option-set`,
    event_type: 'option_set_authored',
    evidence_class: 'institution_selected_intervention',
    authority: 'fixture_institution',
    source_event_ids: [`${result.world_id}:population`],
    payload: {
      offered_options: offeredOptions,
      unavailable_behavior: result.unavailable_behavior
    }
  });
  push({
    event_id: `${result.world_id}:observation`,
    event_type: 'behavior_observed',
    evidence_class: 'intervention_conditioned_observation',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:option-set`],
    payload: {
      observed_choices: result.observed_choices,
      nonresponse: result.nonresponse,
      observation_signature_sha256: result.observation_signature_sha256
    }
  });
  return events;
}

export function validateEquifinalityChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('equifinality chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate equifinality event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`equifinality event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`equifinality event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`equifinality event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceEquifinalityFixture(fixture) {
  const errors = validatePreferenceEquifinalityFixture(fixture);
  if (errors.length) throw new Error(`invalid preference equifinality fixture:\n- ${errors.join('\n- ')}`);

  const offeredOptions = unique(fixture.offered_options).sort();
  const worldResults = fixture.worlds.map(world => simulateEquifinalityWorld(world, offeredOptions));
  const expected = fixture.expected_observation;
  for (const result of worldResults) {
    if (JSON.stringify(result.observed_choices) !== JSON.stringify(expected.observed_choices) || result.nonresponse !== expected.nonresponse) {
      throw new Error(`world ${result.world_id} does not produce the frozen expected observation`);
    }
    result.custody_chain = buildWorldChain(result, offeredOptions);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const latentSignatures = unique(worldResults.map(result => result.world_signature_sha256));
  const observationSignatures = unique(worldResults.map(result => result.observation_signature_sha256));
  const pairwise = [];
  for (let left = 0; left < worldResults.length; left += 1) {
    for (let right = left + 1; right < worldResults.length; right += 1) {
      pairwise.push({
        left_world_id: worldResults[left].world_id,
        right_world_id: worldResults[right].world_id,
        latent_total_variation: totalVariation(
          worldResults[left].latent_first_choice_distribution,
          worldResults[right].latent_first_choice_distribution
        ),
        observed_signature_equal: worldResults[left].observation_signature_sha256 === worldResults[right].observation_signature_sha256
      });
    }
  }

  const equivalenceClass = {
    observed_choices: expected.observed_choices,
    nonresponse: expected.nonresponse,
    observation_signature_sha256: observationSignatures[0],
    compatible_world_ids: worldResults.map(result => result.world_id),
    compatible_world_count: worldResults.length
  };

  return {
    schema_version: PREFERENCE_EQUIFINALITY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    population_total: fixture.population_total,
    preference_mutable: false,
    offered_options: offeredOptions,
    worlds: worldResults,
    observational_equivalence_class: equivalenceClass,
    pairwise_latent_distance: pairwise,
    metrics: {
      distinct_latent_world_signatures: latentSignatures.length,
      distinct_observation_signatures: observationSignatures.length,
      maximum_pairwise_latent_total_variation: Math.max(...pairwise.map(item => item.latent_total_variation)),
      all_pairwise_observations_equal: pairwise.every(item => item.observed_signature_equal)
    },
    identification: {
      latent_first_choice: 'unavailable_from_aggregate_observation',
      response_mechanism: 'unavailable_from_aggregate_observation',
      public_authorization: 'not_conferred_by_predictive_or_behavioral_agreement',
      required_additional_evidence: fixture.required_disambiguation_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceEquifinalityBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_EQUIFINALITY_BUILD_SCHEMA_VERSION) errors.push('preference equifinality build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('equifinality build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('equifinality build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('equifinality fixture must not generate a real-world conclusion');
  if (compiled?.preference_mutable !== false) errors.push('equifinality build must preserve fixed preferences');
  if (!(compiled?.metrics?.distinct_latent_world_signatures >= 3)) errors.push('equifinality fixture must preserve at least three distinct latent worlds');
  if (compiled?.metrics?.distinct_observation_signatures !== 1) errors.push('equifinality fixture must produce exactly one observation signature');
  if (compiled?.metrics?.all_pairwise_observations_equal !== true) errors.push('all world observations must be pairwise equal');
  if (!(compiled?.metrics?.maximum_pairwise_latent_total_variation >= 0.3)) errors.push('fixture must preserve material latent-world separation');
  if (compiled?.classification?.latent_first_choice_identification !== 'unavailable') errors.push('fixture must refuse latent first-choice identification');
  if (compiled?.classification?.response_mechanism_identification !== 'unavailable') errors.push('fixture must refuse response-mechanism identification');
  if (compiled?.classification?.same_behavior_implies_same_preference !== false) errors.push('fixture must refuse same-behavior preference equivalence');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.latent_first_choice !== 'unavailable_from_aggregate_observation') errors.push('identification boundary for latent first choice is required');
  if (compiled?.identification?.response_mechanism !== 'unavailable_from_aggregate_observation') errors.push('identification boundary for response mechanism is required');
  if (unique(compiled?.identification?.required_additional_evidence).length < 3) errors.push('disambiguation evidence requirements are incomplete');

  const observationSignatures = unique(array(compiled?.worlds).map(world => world?.observation_signature_sha256));
  if (observationSignatures.length !== 1) errors.push('compiled worlds do not share one observation signature');
  const worldSignatures = unique(array(compiled?.worlds).map(world => world?.world_signature_sha256));
  if (worldSignatures.length !== array(compiled?.worlds).length) errors.push('compiled worlds are not materially distinct');

  for (const world of array(compiled?.worlds)) {
    errors.push(...validateEquifinalityChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (world?.observation_signature_sha256 !== compiled?.observational_equivalence_class?.observation_signature_sha256) {
      errors.push(`world ${world?.world_id} does not belong to the declared equivalence class`);
    }
  }

  const mandatoryRules = [
    'same_behavior_does_not_imply_same_preference',
    'behavioral_fit_does_not_identify_mechanism',
    'aggregate_choice_does_not_identify_unavailable_demand',
    'model_match_does_not_confer_public_authorization',
    'observational_equivalence_requires_additional_evidence'
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

export function renderPreferenceEquifinalityMarkdown(compiled) {
  const lines = [
    '# Preference custody: observational-equivalence fixture',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared observation',
    ''
  ];
  for (const optionId of compiled.offered_options) {
    lines.push(`- ${optionId}: ${compiled.observational_equivalence_class.observed_choices[optionId]} observed choices`);
  }
  lines.push(`- Nonresponse: ${compiled.observational_equivalence_class.nonresponse}`);
  lines.push(`- Compatible latent worlds: ${compiled.observational_equivalence_class.compatible_world_count}`);

  lines.push('', '## Compatible worlds', '');
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    for (const [optionId, share] of Object.entries(world.latent_first_choice_distribution)) {
      lines.push(`- ${optionId} latent first choice: ${percentage(share)}`);
    }
    lines.push(`- Observation signature: ${world.observation_signature_sha256}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }

  lines.push('## Pairwise latent separation', '');
  for (const pair of compiled.pairwise_latent_distance) {
    lines.push(`- ${pair.left_world_id} ↔ ${pair.right_world_id}: total variation ${percentage(pair.latent_total_variation)}; observed signature equal: ${pair.observed_signature_equal}`);
  }

  lines.push(
    '',
    '## Identification result',
    '',
    '- Latent first-choice distribution identified: false',
    '- Response mechanism identified: false',
    '- Public authorization conferred: false',
    '- Preference change present: false',
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
