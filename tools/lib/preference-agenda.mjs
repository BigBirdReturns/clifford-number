import { createHash } from 'node:crypto';

export const PREFERENCE_AGENDA_FIXTURE_SCHEMA_VERSION = 'preference-agenda-fixture@1';
export const PREFERENCE_AGENDA_BUILD_SCHEMA_VERSION = 'preference-agenda-build@1';

const EPSILON = 1e-12;
const AUTHORITY_CLASSES = new Set([
  'commissioner_fixed_agenda',
  'advisory_agenda_input',
  'binding_affected_public_agenda'
]);
const ACTION_TYPES = new Set(['none', 'propose_option', 'objective_challenge']);

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

function validateProbability(value, label, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    errors.push(`${label} must be a probability in [0, 1]${nullable ? ' or null' : ''}`);
  }
}

function rightsComplete(rights) {
  const value = object(rights);
  return value.option_proposal === true
    && value.coalition_formation === true
    && value.agenda_amendment === true
    && value.objective_challenge === true
    && value.appeal_and_remedy === true;
}

function fixedRights(rights) {
  const value = object(rights);
  return value.option_proposal === false
    && value.coalition_formation === false
    && value.agenda_amendment === false
    && value.objective_challenge === false
    && value.appeal_and_remedy === false;
}

function advisoryRights(rights) {
  const value = object(rights);
  return value.option_proposal === true
    && value.coalition_formation === true
    && value.agenda_amendment === false
    && value.objective_challenge === false
    && value.appeal_and_remedy === false;
}

function sameMembers(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function populationTotal(fixture) {
  return sum(Object.values(object(fixture?.population_groups)));
}

function chooseFromRanking(ranking, optionSet) {
  const available = new Set(optionSet);
  return array(ranking).find(option => available.has(option)) ?? null;
}

function choiceCounts(fixture, optionSet) {
  const counts = Object.fromEntries(optionSet.map(option => [option, 0]));
  for (const cohort of fixture.cohorts) {
    const choice = chooseFromRanking(cohort.ranking, optionSet);
    if (!choice) throw new Error(`cohort ${cohort.cohort_id} has no available option`);
    counts[choice] += cohort.count;
  }
  return counts;
}

function firstChoiceByGroup(fixture, optionId) {
  const result = Object.fromEntries(Object.keys(fixture.population_groups).sort().map(groupId => [groupId, 0]));
  for (const cohort of fixture.cohorts) {
    if (cohort.ranking[0] === optionId) result[cohort.group_id] += cohort.count;
  }
  return result;
}

function objectiveDispositionByGroup(fixture) {
  const result = Object.fromEntries(Object.keys(fixture.population_groups).sort().map(groupId => [
    groupId,
    { accept: 0, reject: 0 }
  ]));
  for (const cohort of fixture.cohorts) {
    const key = cohort.objective_accepts ? 'accept' : 'reject';
    result[cohort.group_id][key] += cohort.count;
  }
  return result;
}

function winnerFromCounts(counts) {
  const entries = Object.entries(counts);
  entries.sort(([leftId, leftCount], [rightId, rightCount]) => {
    if (rightCount !== leftCount) return rightCount - leftCount;
    return leftId.localeCompare(rightId);
  });
  return entries[0]?.[0] ?? null;
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validatePreferenceAgendaFixture(fixture) {
  const errors = [];
  const groups = object(fixture?.population_groups);
  const groupIds = Object.keys(groups).sort();
  const cohorts = array(fixture?.cohorts);
  const worlds = array(fixture?.worlds);
  const proposal = object(fixture?.proposal);
  const initialOptions = array(proposal.initial_option_set);
  const optionUniverse = array(proposal.possible_option_universe);

  if (fixture?.schema_version !== PREFERENCE_AGENDA_FIXTURE_SCHEMA_VERSION) errors.push('preference agenda fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (!text(proposal.proposal_id) || !text(proposal.objective) || !text(proposal.commissioner)) {
    errors.push('proposal identity, objective, and commissioner are required');
  }
  if (groupIds.length < 2) errors.push('fixture requires at least two affected groups');
  for (const groupId of groupIds) {
    const count = Number(groups[groupId]);
    if (!Number.isInteger(count) || count <= 0) errors.push(`population group ${groupId} must be a positive integer`);
  }
  if (unique(initialOptions).length !== initialOptions.length || initialOptions.length < 2) errors.push('initial option set must contain unique options');
  if (unique(optionUniverse).length !== optionUniverse.length || optionUniverse.length < initialOptions.length + 1) {
    errors.push('possible option universe must contain unique options and expand the initial set');
  }
  if (!initialOptions.every(option => optionUniverse.includes(option))) errors.push('initial option set must be contained in the possible option universe');

  const cohortIds = cohorts.map(cohort => text(cohort?.cohort_id));
  if (unique(cohortIds).length !== cohortIds.length) errors.push('cohort IDs must be unique');
  const groupSums = Object.fromEntries(groupIds.map(groupId => [groupId, 0]));
  for (const cohort of cohorts) {
    const cohortId = text(cohort?.cohort_id) || '(missing cohort ID)';
    if (!text(cohort?.cohort_id)) errors.push('every cohort requires cohort_id');
    if (!groupIds.includes(cohort?.group_id)) errors.push(`cohort ${cohortId} has unknown group ${cohort?.group_id}`);
    if (!Number.isInteger(cohort?.count) || cohort.count <= 0) errors.push(`cohort ${cohortId} count must be a positive integer`);
    if (!sameMembers(array(cohort?.ranking), optionUniverse)) errors.push(`cohort ${cohortId} ranking must contain every option exactly once`);
    if (typeof cohort?.objective_accepts !== 'boolean') errors.push(`cohort ${cohortId} objective_accepts must be boolean`);
    if (groupIds.includes(cohort?.group_id) && Number.isInteger(cohort?.count)) groupSums[cohort.group_id] += cohort.count;
  }
  for (const groupId of groupIds) {
    if (groupSums[groupId] !== groups[groupId]) errors.push(`cohort counts for ${groupId} must sum to the group denominator`);
  }

  const preliminary = object(fixture?.expected_preliminary_headline);
  if (!Number.isInteger(preliminary.A) || !Number.isInteger(preliminary.B)) errors.push('expected preliminary A and B counts must be integers');
  if (preliminary.A + preliminary.B !== populationTotal(fixture)) errors.push('expected preliminary headline must reconcile to the population');
  if (!close(preliminary.A_share, preliminary.A / (preliminary.A + preliminary.B))) errors.push('expected preliminary A share must match counts');

  const expanded = object(fixture?.expected_expanded_ballot);
  if (sum(Object.values(expanded)) !== populationTotal(fixture)) errors.push('expected expanded ballot must reconcile to the population');
  if (!sameMembers(Object.keys(expanded), optionUniverse)) errors.push('expected expanded ballot must use the possible option universe');

  const objective = object(fixture?.expected_objective_disposition);
  if (!Number.isInteger(objective.accept) || !Number.isInteger(objective.reject)) errors.push('expected objective disposition counts must be integers');
  if (objective.accept + objective.reject !== populationTotal(fixture)) errors.push('expected objective disposition must reconcile to the population');
  if (!close(objective.reject_share, objective.reject / (objective.accept + objective.reject))) errors.push('expected objective reject share must match counts');

  if (worlds.length < 4) errors.push('fixture requires at least four agenda worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.agenda_instrument);
    const rights = object(instrument.rights);
    const action = object(world?.agenda_action);
    const expected = object(world?.expected_resolution);

    if (!text(world?.world_id)) errors.push('every world requires world_id');
    if (!AUTHORITY_CLASSES.has(instrument.authority_class)) errors.push(`world ${worldId} has invalid agenda authority class ${instrument.authority_class}`);
    if (!ACTION_TYPES.has(action.action_type)) errors.push(`world ${worldId} has invalid agenda action ${action.action_type}`);
    if (!text(action.actor)) errors.push(`world ${worldId} action actor is required`);
    validateProbability(instrument.petition_threshold, `world ${worldId} petition_threshold`, errors, { nullable: true });
    validateProbability(instrument.group_petition_threshold, `world ${worldId} group_petition_threshold`, errors, { nullable: true });
    validateProbability(instrument.objective_rejection_threshold, `world ${worldId} objective_rejection_threshold`, errors, { nullable: true });

    if (instrument.authority_class === 'commissioner_fixed_agenda') {
      if (instrument.binding !== false || !fixedRights(rights)) errors.push(`world ${worldId} fixed agenda must be nonbinding with no public agenda rights`);
      if (instrument.petition_threshold !== null || instrument.group_petition_threshold !== null || instrument.objective_rejection_threshold !== null) {
        errors.push(`world ${worldId} fixed agenda cannot carry binding thresholds`);
      }
      if (action.action_type !== 'none' || action.actor !== 'fixture_commissioner') errors.push(`world ${worldId} fixed agenda requires commissioner action none`);
    } else if (instrument.authority_class === 'advisory_agenda_input') {
      if (instrument.binding !== false || !advisoryRights(rights)) errors.push(`world ${worldId} advisory agenda must permit proposal without binding amendment`);
      if (instrument.petition_threshold !== null || instrument.group_petition_threshold !== null || instrument.objective_rejection_threshold !== null) {
        errors.push(`world ${worldId} advisory agenda cannot carry binding thresholds`);
      }
      if (action.action_type !== 'propose_option' || action.actor !== 'affected_public_coalition' || !text(action.proposed_option)) {
        errors.push(`world ${worldId} advisory agenda requires an attributed coalition proposal`);
      }
    } else {
      if (instrument.binding !== true || !rightsComplete(rights)) errors.push(`world ${worldId} binding agenda requires proposal, coalition, amendment, challenge, appeal, and remedy rights`);
      if (instrument.petition_threshold === null || instrument.group_petition_threshold === null || instrument.objective_rejection_threshold === null) {
        errors.push(`world ${worldId} binding agenda requires petition, group, and objective-rejection thresholds`);
      }
      if (!['affected_public_coalition', 'affected_public'].includes(action.actor)) errors.push(`world ${worldId} binding agenda action must be attributed to the affected public`);
      if (action.action_type === 'propose_option' && !text(action.proposed_option)) errors.push(`world ${worldId} option proposal requires proposed_option`);
      if (action.action_type === 'objective_challenge' && action.proposed_option !== null) errors.push(`world ${worldId} objective challenge cannot carry proposed_option`);
    }

    if (typeof expected.agenda_amended !== 'boolean'
        || typeof expected.objective_rejected !== 'boolean'
        || typeof expected.public_agenda_authority_exercised !== 'boolean'
        || !array(expected.final_option_set).length
        || !text(expected.implementation_state)) {
      errors.push(`world ${worldId} expected agenda resolution is incomplete`);
    }
    if (expected.final_winner !== null && !text(expected.final_winner)) errors.push(`world ${worldId} final_winner must be a stable option ID or null`);
    if (instrument.authority_class !== 'binding_affected_public_agenda' && expected.public_agenda_authority_exercised !== false) {
      errors.push(`world ${worldId} nonbinding agenda cannot expect public agenda authority`);
    }
  }

  const expectedClassification = object(fixture?.expected_classification);
  const requiredExpected = {
    forced_choice_identifies_complete_agenda: false,
    advisory_proposal_confers_agenda_authority: false,
    binding_collective_option_generation_changes_outcome: true,
    forced_choice_support_identifies_objective_acceptance: false,
    synthetic_prediction_can_exercise_agenda_rights: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'forced_choice_is_not_complete_agenda',
    'unoffered_option_can_be_collectively_generated',
    'proposal_without_binding_rule_is_not_agenda_authority',
    'preference_over_options_is_not_acceptance_of_objective',
    'preliminary_winner_is_not_final_public_disposition',
    'collective_option_generation_requires_attributed_membership_and_rule',
    'synthetic_prediction_cannot_exercise_amendment_rights',
    'binding_objective_rejection_blocks_implementation'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) {
    if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_agenda_evidence).length < 8) errors.push('agenda evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

function evaluateWorld(fixture, world) {
  const initialOptions = fixture.proposal.initial_option_set;
  const optionUniverse = fixture.proposal.possible_option_universe;
  const population = populationTotal(fixture);
  const groupIds = Object.keys(fixture.population_groups).sort();
  const preliminaryCounts = choiceCounts(fixture, initialOptions);
  const preliminaryHeadline = {
    counts: preliminaryCounts,
    winner: winnerFromCounts(preliminaryCounts),
    A_share: preliminaryCounts.A / population
  };

  const proposedOption = world.agenda_action.proposed_option;
  const proposalSupportByGroup = proposedOption ? firstChoiceByGroup(fixture, proposedOption) : Object.fromEntries(groupIds.map(groupId => [groupId, 0]));
  const proposalSupport = sum(Object.values(proposalSupportByGroup));
  const proposalSupportShare = proposalSupport / population;
  const proposalGroupShares = Object.fromEntries(groupIds.map(groupId => [
    groupId,
    proposalSupportByGroup[groupId] / fixture.population_groups[groupId]
  ]));

  const objectiveByGroup = objectiveDispositionByGroup(fixture);
  const objectiveAccept = sum(groupIds.map(groupId => objectiveByGroup[groupId].accept));
  const objectiveReject = sum(groupIds.map(groupId => objectiveByGroup[groupId].reject));
  const objectiveRejectShare = objectiveReject / population;

  const instrument = world.agenda_instrument;
  const binding = instrument.authority_class === 'binding_affected_public_agenda';
  const completeRights = binding && rightsComplete(instrument.rights);
  const overallPetitionMet = binding && proposalSupportShare >= instrument.petition_threshold;
  const groupPetitionsMet = binding && groupIds.every(groupId => proposalGroupShares[groupId] >= instrument.group_petition_threshold);
  const proposalRulePassed = binding
    && world.agenda_action.action_type === 'propose_option'
    && completeRights
    && overallPetitionMet
    && groupPetitionsMet;
  const objectiveRulePassed = binding
    && world.agenda_action.action_type === 'objective_challenge'
    && completeRights
    && objectiveRejectShare >= instrument.objective_rejection_threshold;

  const agendaAmended = proposalRulePassed;
  const objectiveRejected = objectiveRulePassed;
  const finalOptionSet = agendaAmended ? optionUniverse : initialOptions;
  const finalBallot = objectiveRejected ? null : choiceCounts(fixture, finalOptionSet);
  const finalWinner = objectiveRejected ? null : winnerFromCounts(finalBallot);
  const publicAgendaAuthorityExercised = binding
    && (agendaAmended || objectiveRejected)
    && ['affected_public_coalition', 'affected_public'].includes(world.agenda_action.actor);

  let implementationState;
  if (objectiveRejected) implementationState = 'blocked_by_binding_objective_rejection';
  else if (agendaAmended) implementationState = 'implemented_collectively_generated_option';
  else if (instrument.authority_class === 'advisory_agenda_input') implementationState = 'implemented_after_nonbinding_agenda_advice';
  else implementationState = 'implemented_under_fixed_commissioner_agenda';

  const resolution = {
    agenda_amended: agendaAmended,
    objective_rejected: objectiveRejected,
    public_agenda_authority_exercised: publicAgendaAuthorityExercised,
    final_option_set: finalOptionSet,
    final_winner: finalWinner,
    implementation_state: implementationState
  };

  return {
    world_id: world.world_id,
    proposal_id: fixture.proposal.proposal_id,
    preliminary_headline: preliminaryHeadline,
    preliminary_headline_signature_sha256: sha256(preliminaryHeadline),
    agenda_action: world.agenda_action,
    proposal_support: {
      total: proposalSupport,
      share: proposalSupportShare,
      by_group: proposalSupportByGroup,
      group_shares: proposalGroupShares
    },
    objective_disposition: {
      accept: objectiveAccept,
      reject: objectiveReject,
      reject_share: objectiveRejectShare,
      by_group: objectiveByGroup
    },
    agenda_instrument: instrument,
    rule_evaluation: {
      binding,
      rights_complete: completeRights,
      overall_petition_met: overallPetitionMet,
      group_petitions_met: groupPetitionsMet,
      proposal_rule_passed: proposalRulePassed,
      objective_rule_passed: objectiveRulePassed
    },
    final_ballot: finalBallot,
    final_option_set_signature_sha256: sha256(finalOptionSet),
    resolution,
    agenda_resolution_signature_sha256: sha256(resolution)
  };
}

function buildAgendaChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:population`,
    event_type: 'population_and_rankings_sealed',
    evidence_class: 'synthetic_control_population',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      population_groups: fixture.population_groups,
      cohorts: fixture.cohorts
    }
  });
  push({
    event_id: `${result.world_id}:initial-agenda`,
    event_type: 'initial_agenda_authored',
    evidence_class: 'institution_authored_option_set',
    authority: fixture.proposal.commissioner,
    source_event_ids: [`${result.world_id}:population`],
    payload: fixture.proposal
  });
  push({
    event_id: `${result.world_id}:preliminary`,
    event_type: 'preliminary_forced_choice_observed',
    evidence_class: 'intervention_conditioned_human_response',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:initial-agenda`],
    payload: result.preliminary_headline
  });
  push({
    event_id: `${result.world_id}:agenda-action`,
    event_type: 'agenda_action_recorded',
    evidence_class: result.agenda_action.action_type === 'none' ? 'no_public_agenda_action' : 'attributed_public_agenda_action',
    authority: result.agenda_action.actor,
    source_event_ids: [`${result.world_id}:preliminary`],
    payload: {
      agenda_action: result.agenda_action,
      proposal_support: result.proposal_support,
      objective_disposition: result.objective_disposition
    }
  });
  push({
    event_id: `${result.world_id}:instrument`,
    event_type: 'agenda_authority_instrument_sealed',
    evidence_class: 'agenda_authority_contract',
    authority: 'fixture_constitution',
    source_event_ids: [`${result.world_id}:agenda-action`],
    payload: result.agenda_instrument
  });
  push({
    event_id: `${result.world_id}:rule-resolution`,
    event_type: 'agenda_rule_resolution',
    evidence_class: 'deterministic_agenda_resolution',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:instrument`],
    payload: result.rule_evaluation
  });
  push({
    event_id: `${result.world_id}:final-disposition`,
    event_type: result.resolution.objective_rejected ? 'binding_objective_disposition' : 'final_ballot_recorded',
    evidence_class: result.resolution.objective_rejected ? 'binding_affected_public_disposition' : 'agenda_conditioned_choice',
    authority: result.resolution.public_agenda_authority_exercised ? 'affected_public' : fixture.proposal.commissioner,
    source_event_ids: [`${result.world_id}:rule-resolution`],
    payload: {
      final_ballot: result.final_ballot,
      resolution: result.resolution
    }
  });
  push({
    event_id: `${result.world_id}:implementation`,
    event_type: 'implementation_resolution',
    evidence_class: 'deterministic_implementation_state',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:final-disposition`],
    payload: {
      final_winner: result.resolution.final_winner,
      implementation_state: result.resolution.implementation_state
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'fixture_analyst',
    source_event_ids: [`${result.world_id}:implementation`],
    payload: {
      allowed_interpretation: 'agenda_and_implementation_consequence_under_the_sealed_option_and_authority_history',
      refused_promotions: [
        'forced_choice_as_complete_agenda',
        'advisory_proposal_as_binding_amendment',
        'preliminary_winner_as_final_public_disposition',
        'option_preference_as_objective_acceptance',
        'synthetic_prediction_as_amendment_authority',
        'agenda_limitation_as_manipulative_intent'
      ]
    }
  });
  return events;
}

export function validateAgendaChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('agenda chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate agenda event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`agenda event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`agenda event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`agenda event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceAgendaFixture(fixture) {
  const errors = validatePreferenceAgendaFixture(fixture);
  if (errors.length) throw new Error(`invalid preference agenda fixture:\n- ${errors.join('\n- ')}`);

  const preliminaryComputed = choiceCounts(fixture, fixture.proposal.initial_option_set);
  if (preliminaryComputed.A !== fixture.expected_preliminary_headline.A
      || preliminaryComputed.B !== fixture.expected_preliminary_headline.B
      || !close(preliminaryComputed.A / populationTotal(fixture), fixture.expected_preliminary_headline.A_share)) {
    throw new Error('fixture cohorts do not produce the frozen preliminary headline');
  }
  const expandedComputed = choiceCounts(fixture, fixture.proposal.possible_option_universe);
  if (JSON.stringify(expandedComputed) !== JSON.stringify(fixture.expected_expanded_ballot)) {
    throw new Error('fixture cohorts do not produce the frozen expanded ballot');
  }
  const objectiveByGroup = objectiveDispositionByGroup(fixture);
  const objectiveComputed = {
    accept: sum(Object.values(objectiveByGroup).map(value => value.accept)),
    reject: sum(Object.values(objectiveByGroup).map(value => value.reject))
  };
  objectiveComputed.reject_share = objectiveComputed.reject / populationTotal(fixture);
  if (JSON.stringify(objectiveComputed) !== JSON.stringify(fixture.expected_objective_disposition)) {
    throw new Error('fixture cohorts do not produce the frozen objective disposition');
  }

  const worlds = fixture.worlds.map(world => evaluateWorld(fixture, world));
  for (let index = 0; index < worlds.length; index += 1) {
    const result = worlds[index];
    const expected = fixture.worlds[index].expected_resolution;
    if (JSON.stringify(result.resolution) !== JSON.stringify(expected)) {
      throw new Error(`world ${result.world_id} does not produce the frozen expected agenda resolution`);
    }
    result.custody_chain = buildAgendaChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const preliminarySignatures = unique(worlds.map(world => world.preliminary_headline_signature_sha256));
  const optionSetSignatures = unique(worlds.map(world => world.final_option_set_signature_sha256));
  const resolutionSignatures = unique(worlds.map(world => world.agenda_resolution_signature_sha256));
  const fixedWorld = worlds.find(world => world.world_id === 'fixed-agenda-commissioner-selection');
  const amendedWorld = worlds.find(world => world.world_id === 'binding-collective-amendment-adds-c');
  const cFirstChoiceShare = sum(Object.values(firstChoiceByGroup(fixture, 'C'))) / populationTotal(fixture);

  return {
    schema_version: PREFERENCE_AGENDA_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    proposal: fixture.proposal,
    population_groups: fixture.population_groups,
    cohorts: fixture.cohorts,
    expected_preliminary_headline: fixture.expected_preliminary_headline,
    expected_expanded_ballot: fixture.expected_expanded_ballot,
    expected_objective_disposition: fixture.expected_objective_disposition,
    worlds,
    metrics: {
      distinct_preliminary_headline_signatures: preliminarySignatures.length,
      distinct_final_option_set_signatures: optionSetSignatures.length,
      distinct_agenda_resolution_signatures: resolutionSignatures.length,
      institutionally_controlled_agenda_worlds: worlds.filter(world => !world.rule_evaluation.binding).length,
      public_agenda_authority_worlds: worlds.filter(world => world.resolution.public_agenda_authority_exercised).length,
      binding_collective_option_generation_worlds: worlds.filter(world => world.resolution.agenda_amended).length,
      binding_objective_rejection_worlds: worlds.filter(world => world.resolution.objective_rejected).length,
      preliminary_A_share: fixture.expected_preliminary_headline.A_share,
      latent_C_first_choice_share: cFirstChoiceShare,
      objective_reject_share: fixture.expected_objective_disposition.reject_share,
      winner_changed_by_binding_amendment: fixedWorld?.resolution.final_winner !== amendedWorld?.resolution.final_winner
    },
    identification: {
      complete_agenda: 'requires_option_origin_and_amendment_history',
      collective_option_generation: 'requires_attributed_membership_coalition_and_binding_rule',
      objective_acceptance: 'separate_from_preference_among_offered_options',
      agenda_authority: 'requires_binding_affected_public_amendment_or_challenge_rights',
      required_agenda_evidence: fixture.required_agenda_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceAgendaBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_AGENDA_BUILD_SCHEMA_VERSION) errors.push('preference agenda build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('agenda build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('agenda build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('agenda fixture must not generate a real-world conclusion');
  if (compiled?.metrics?.distinct_preliminary_headline_signatures !== 1) errors.push('agenda fixture must preserve one preliminary forced-choice headline');
  if (compiled?.metrics?.distinct_final_option_set_signatures !== 2) errors.push('agenda fixture must preserve two final option-set states');
  if (compiled?.metrics?.distinct_agenda_resolution_signatures !== 4) errors.push('agenda fixture must preserve four agenda consequences');
  if (compiled?.metrics?.institutionally_controlled_agenda_worlds !== 2) errors.push('agenda fixture must preserve two institutionally controlled worlds');
  if (compiled?.metrics?.public_agenda_authority_worlds !== 2) errors.push('agenda fixture must preserve two binding public agenda worlds');
  if (compiled?.metrics?.binding_collective_option_generation_worlds !== 1) errors.push('agenda fixture must preserve one binding option-generation world');
  if (compiled?.metrics?.binding_objective_rejection_worlds !== 1) errors.push('agenda fixture must preserve one binding objective-rejection world');
  if (!close(compiled?.metrics?.preliminary_A_share, 0.8)) errors.push('agenda fixture must preserve the frozen 80 percent preliminary A share');
  if (!close(compiled?.metrics?.latent_C_first_choice_share, 0.8)) errors.push('agenda fixture must preserve the frozen 80 percent C first-choice share');
  if (!close(compiled?.metrics?.objective_reject_share, 0.6)) errors.push('agenda fixture must preserve the frozen 60 percent objective-rejection share');
  if (compiled?.metrics?.winner_changed_by_binding_amendment !== true) errors.push('binding agenda amendment must change the final winner');
  if (compiled?.classification?.forced_choice_identifies_complete_agenda !== false) errors.push('fixture must refuse forced choice as complete agenda');
  if (compiled?.classification?.advisory_proposal_confers_agenda_authority !== false) errors.push('fixture must refuse advisory proposal as agenda authority');
  if (compiled?.classification?.binding_collective_option_generation_changes_outcome !== true) errors.push('fixture must preserve the binding option-generation consequence');
  if (compiled?.classification?.forced_choice_support_identifies_objective_acceptance !== false) errors.push('fixture must separate option preference from objective acceptance');
  if (compiled?.classification?.synthetic_prediction_can_exercise_agenda_rights !== false) errors.push('fixture must refuse synthetic prediction as agenda-rights holder');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.complete_agenda !== 'requires_option_origin_and_amendment_history') errors.push('complete-agenda identification boundary is required');
  if (compiled?.identification?.agenda_authority !== 'requires_binding_affected_public_amendment_or_challenge_rights') errors.push('binding agenda authority boundary is required');
  if (unique(compiled?.identification?.required_agenda_evidence).length < 8) errors.push('agenda evidence requirements are incomplete');

  const preliminarySignatures = unique(array(compiled?.worlds).map(world => world?.preliminary_headline_signature_sha256));
  if (preliminarySignatures.length !== 1) errors.push('compiled agenda worlds do not share one preliminary headline');
  for (const world of array(compiled?.worlds)) {
    errors.push(...validateAgendaChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (world?.resolution?.objective_rejected === true && world?.resolution?.implementation_state !== 'blocked_by_binding_objective_rejection') {
      errors.push(`world ${world?.world_id} binding objective rejection must block implementation`);
    }
    if (world?.resolution?.agenda_amended === true && world?.resolution?.final_winner !== 'C') {
      errors.push(`world ${world?.world_id} binding amendment must admit and select C`);
    }
    if (world?.agenda_instrument?.authority_class !== 'binding_affected_public_agenda'
        && world?.resolution?.public_agenda_authority_exercised !== false) {
      errors.push(`world ${world?.world_id} nonbinding agenda cannot exercise public agenda authority`);
    }
  }

  const mandatoryRules = [
    'forced_choice_is_not_complete_agenda',
    'unoffered_option_can_be_collectively_generated',
    'proposal_without_binding_rule_is_not_agenda_authority',
    'preference_over_options_is_not_acceptance_of_objective',
    'preliminary_winner_is_not_final_public_disposition',
    'collective_option_generation_requires_attributed_membership_and_rule',
    'synthetic_prediction_cannot_exercise_amendment_rights',
    'binding_objective_rejection_blocks_implementation'
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

export function renderPreferenceAgendaMarkdown(compiled) {
  const lines = [
    '# Preference custody: agenda formation and collective option generation',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared preliminary forced-choice headline',
    '',
    `- A: ${compiled.expected_preliminary_headline.A}`,
    `- B: ${compiled.expected_preliminary_headline.B}`,
    `- A share: ${percentage(compiled.expected_preliminary_headline.A_share)}`,
    `- C first-choice share in the complete synthetic ranking: ${percentage(compiled.metrics.latent_C_first_choice_share)}`,
    `- Objective rejection share: ${percentage(compiled.metrics.objective_reject_share)}`,
    '',
    '## Agenda worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Authority class: ${world.agenda_instrument.authority_class}`);
    lines.push(`- Action: ${world.agenda_action.action_type}`);
    lines.push(`- Proposal support: ${world.proposal_support.total} (${percentage(world.proposal_support.share)})`);
    lines.push(`- Agenda amended: ${world.resolution.agenda_amended}`);
    lines.push(`- Objective rejected: ${world.resolution.objective_rejected}`);
    lines.push(`- Public agenda authority exercised: ${world.resolution.public_agenda_authority_exercised}`);
    lines.push(`- Final option set: ${world.resolution.final_option_set.join(', ')}`);
    lines.push(`- Final winner: ${world.resolution.final_winner ?? 'none'}`);
    lines.push(`- Implementation state: ${world.resolution.implementation_state}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Forced choice identifies the complete agenda: false',
    '- Advisory proposal confers agenda authority: false',
    '- Binding collective option generation changes the outcome: true',
    '- Forced-choice support identifies objective acceptance: false',
    '- Synthetic prediction can exercise agenda rights: false',
    '- Preference change present: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Required agenda evidence',
    ''
  );
  for (const item of compiled.identification.required_agenda_evidence) lines.push(`- ${item}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
