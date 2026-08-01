import { createHash } from 'node:crypto';

export const PREFERENCE_PACKAGE_FIXTURE_SCHEMA_VERSION = 'preference-package-fixture@1';
export const PREFERENCE_PACKAGE_BUILD_SCHEMA_VERSION = 'preference-package-build@1';

const EPSILON = 1e-12;
const PACKAGE_SOURCES = new Set([
  'marginal_component_optimizer',
  'synthetic_generated_candidate',
  'advisory_human_proposal',
  'negotiated_tentative_agreement',
  'institution_counteroffer'
]);
const AUTHORITY_CLASSES = new Set([
  'institution_unilateral_bundle',
  'synthetic_candidate_generation',
  'advisory_co_design',
  'binding_collective_bargaining'
]);

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

function sameMembers(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function validateProbability(value, label, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    errors.push(`${label} must be a probability in [0, 1]${nullable ? ' or null' : ''}`);
  }
}

function populationTotal(fixture) {
  return sum(Object.values(object(fixture?.population_groups)));
}

function componentPoll(fixture) {
  const counts = Object.fromEntries(fixture.terms.map(term => [term, 0]));
  for (const cohort of fixture.cohorts) {
    for (const term of cohort.component_support) counts[term] += cohort.count;
  }
  return counts;
}

function cohortAcceptsPackage(cohort, packageTerms) {
  const terms = new Set(packageTerms);
  const rule = cohort.package_rule;
  if (!rule.required_terms.every(term => terms.has(term))) return false;
  for (const [trigger, requirements] of Object.entries(rule.conditional_requirements)) {
    if (terms.has(trigger) && !requirements.every(term => terms.has(term))) return false;
  }
  return true;
}

function packageSupport(fixture, packageTerms) {
  const byGroup = Object.fromEntries(Object.keys(fixture.population_groups).sort().map(groupId => [groupId, 0]));
  for (const cohort of fixture.cohorts) {
    if (cohortAcceptsPackage(cohort, packageTerms)) byGroup[cohort.group_id] += cohort.count;
  }
  const total = sum(Object.values(byGroup));
  const groupShares = Object.fromEntries(Object.keys(byGroup).map(groupId => [
    groupId,
    byGroup[groupId] / fixture.population_groups[groupId]
  ]));
  return {
    by_group: byGroup,
    group_shares: groupShares,
    total,
    share: total / populationTotal(fixture)
  };
}

function bindingInstrumentComplete(instrument) {
  return instrument.binding === true
    && instrument.representative_mandates === true
    && instrument.reciprocal_concessions === true
    && instrument.group_ratification_required === true
    && instrument.enforceable_obligations === true
    && instrument.reopen_clause === true
    && instrument.appeal_and_remedy === true
    && instrument.group_ratification_threshold !== null;
}

function nonbindingInstrumentSafe(instrument) {
  return instrument.binding === false
    && instrument.representative_mandates === false
    && instrument.group_ratification_required === false
    && instrument.group_ratification_threshold === null
    && instrument.enforceable_obligations === false;
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validatePreferencePackageFixture(fixture) {
  const errors = [];
  const groups = object(fixture?.population_groups);
  const groupIds = Object.keys(groups).sort();
  const terms = array(fixture?.terms);
  const cohorts = array(fixture?.cohorts);
  const packages = object(fixture?.expected_packages);
  const expectedSupports = object(fixture?.expected_package_support);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_PACKAGE_FIXTURE_SCHEMA_VERSION) errors.push('preference package fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (groupIds.length < 2) errors.push('fixture requires at least two bargaining groups');
  for (const groupId of groupIds) {
    const count = Number(groups[groupId]);
    if (!Number.isInteger(count) || count <= 0) errors.push(`population group ${groupId} must be a positive integer`);
  }
  if (unique(terms).length !== terms.length || terms.length < 4) errors.push('terms must contain at least four unique IDs');

  const cohortIds = cohorts.map(cohort => text(cohort?.cohort_id));
  if (unique(cohortIds).length !== cohortIds.length) errors.push('cohort IDs must be unique');
  const groupSums = Object.fromEntries(groupIds.map(groupId => [groupId, 0]));
  for (const cohort of cohorts) {
    const cohortId = text(cohort?.cohort_id) || '(missing cohort ID)';
    if (!text(cohort?.cohort_id)) errors.push('every cohort requires cohort_id');
    if (!groupIds.includes(cohort?.group_id)) errors.push(`cohort ${cohortId} has unknown group ${cohort?.group_id}`);
    if (!Number.isInteger(cohort?.count) || cohort.count <= 0) errors.push(`cohort ${cohortId} count must be a positive integer`);
    if (unique(cohort?.component_support).length !== array(cohort?.component_support).length) errors.push(`cohort ${cohortId} component support contains duplicates`);
    for (const term of array(cohort?.component_support)) {
      if (!terms.includes(term)) errors.push(`cohort ${cohortId} supports unknown term ${term}`);
    }
    const rule = object(cohort?.package_rule);
    if (!array(rule.required_terms).length) errors.push(`cohort ${cohortId} requires at least one package term`);
    for (const term of array(rule.required_terms)) {
      if (!terms.includes(term)) errors.push(`cohort ${cohortId} requires unknown term ${term}`);
    }
    for (const [trigger, requirements] of Object.entries(object(rule.conditional_requirements))) {
      if (!terms.includes(trigger)) errors.push(`cohort ${cohortId} has unknown conditional trigger ${trigger}`);
      if (!array(requirements).length) errors.push(`cohort ${cohortId} conditional trigger ${trigger} requires at least one term`);
      for (const term of array(requirements)) {
        if (!terms.includes(term)) errors.push(`cohort ${cohortId} condition ${trigger} requires unknown term ${term}`);
      }
    }
    if (groupIds.includes(cohort?.group_id) && Number.isInteger(cohort?.count)) groupSums[cohort.group_id] += cohort.count;
  }
  for (const groupId of groupIds) {
    if (groupSums[groupId] !== groups[groupId]) errors.push(`cohort counts for ${groupId} must sum to the group denominator`);
  }

  const expectedPoll = object(fixture?.expected_component_poll);
  if (!sameMembers(Object.keys(expectedPoll), terms)) errors.push('expected component poll must use exactly the package terms');
  for (const [term, count] of Object.entries(expectedPoll)) {
    if (!Number.isInteger(count) || count < 0 || count > populationTotal(fixture)) errors.push(`expected component count ${term} must be a valid integer`);
  }
  validateProbability(fixture?.component_inclusion_threshold, 'component_inclusion_threshold', errors);

  const requiredPackageRefs = ['marginal_majority', 'protected', 'one_sided_counteroffer'];
  if (!sameMembers(Object.keys(packages), requiredPackageRefs)) errors.push('expected packages must contain marginal_majority, protected, and one_sided_counteroffer');
  for (const [packageRef, packageTerms] of Object.entries(packages)) {
    if (!array(packageTerms).length || unique(packageTerms).length !== packageTerms.length) errors.push(`package ${packageRef} must contain unique terms`);
    for (const term of array(packageTerms)) {
      if (!terms.includes(term)) errors.push(`package ${packageRef} contains unknown term ${term}`);
    }
  }

  if (!sameMembers(Object.keys(expectedSupports), requiredPackageRefs)) errors.push('expected package support must cover every package reference');
  for (const [packageRef, support] of Object.entries(expectedSupports)) {
    const value = object(support);
    const supportGroups = Object.fromEntries(groupIds.map(groupId => [groupId, value[groupId]]));
    for (const groupId of groupIds) {
      if (!Number.isInteger(supportGroups[groupId]) || supportGroups[groupId] < 0 || supportGroups[groupId] > groups[groupId]) {
        errors.push(`package ${packageRef} support for ${groupId} must be within the group denominator`);
      }
    }
    if (value.total !== sum(Object.values(supportGroups))) errors.push(`package ${packageRef} total support must reconcile to group support`);
    if (!close(value.share, value.total / populationTotal(fixture))) errors.push(`package ${packageRef} support share must match the total`);
  }

  if (worlds.length < 5) errors.push('fixture requires at least five package worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const instrument = object(world?.bargaining_instrument);
    const expected = object(world?.expected_resolution);

    if (!text(world?.world_id)) errors.push('every world requires world_id');
    if (!PACKAGE_SOURCES.has(world?.package_source)) errors.push(`world ${worldId} has invalid package source ${world?.package_source}`);
    if (!requiredPackageRefs.includes(world?.package_terms_ref)) errors.push(`world ${worldId} has unknown package reference ${world?.package_terms_ref}`);
    if (!AUTHORITY_CLASSES.has(instrument.authority_class)) errors.push(`world ${worldId} has invalid bargaining authority class ${instrument.authority_class}`);
    validateProbability(instrument.group_ratification_threshold, `world ${worldId} group_ratification_threshold`, errors, { nullable: true });

    if (instrument.authority_class === 'binding_collective_bargaining') {
      if (instrument.binding !== true) errors.push(`world ${worldId} binding bargaining must declare binding true`);
      if (instrument.representative_mandates !== true) errors.push(`world ${worldId} binding bargaining requires representative mandates`);
      if (instrument.group_ratification_required !== true || instrument.group_ratification_threshold === null) {
        errors.push(`world ${worldId} binding bargaining requires group ratification and a threshold`);
      }
      if (instrument.enforceable_obligations !== true || instrument.reopen_clause !== true || instrument.appeal_and_remedy !== true) {
        errors.push(`world ${worldId} binding bargaining requires enforceable obligations, reopen, appeal, and remedy`);
      }
    } else if (!nonbindingInstrumentSafe(instrument)) {
      errors.push(`world ${worldId} nonbinding package process cannot claim mandates, ratification, or enforceable obligations`);
    }

    if (typeof expected.institutional_approval !== 'boolean'
        || typeof expected.collective_agreement !== 'boolean'
        || typeof expected.binding_impasse !== 'boolean'
        || !text(expected.implementation_state)) {
      errors.push(`world ${worldId} expected resolution is incomplete`);
    }
    if (instrument.authority_class !== 'binding_collective_bargaining' && (expected.collective_agreement || expected.binding_impasse)) {
      errors.push(`world ${worldId} nonbinding process cannot expect a collective agreement or binding impasse`);
    }
  }

  const expectedClassification = object(fixture?.expected_classification);
  const requiredExpected = {
    component_marginals_identify_package_acceptance: false,
    high_package_support_is_collective_agreement: false,
    synthetic_candidate_can_bind_representatives: false,
    advisory_co_design_is_collective_agreement: false,
    binding_ratification_creates_collective_agreement: true,
    bargaining_impasse_is_missing_preference_data: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'marginal_clause_support_is_not_package_acceptance',
    'package_support_is_not_collective_agreement',
    'synthetic_package_is_candidate_not_bargain',
    'advisory_co_design_is_not_binding_bargaining',
    'representative_mandate_requires_attributed_membership',
    'negotiated_package_requires_reciprocity_ratification_enforcement_and_reopen',
    'failed_ratification_is_binding_impasse_not_missing_data',
    'package_terms_require_versioned_custody',
    'collective_agreement_requires_group_disposition'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) {
    if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_bargaining_evidence).length < 10) errors.push('bargaining evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

function evaluateWorld(fixture, world) {
  const packageTerms = fixture.expected_packages[world.package_terms_ref];
  const support = packageSupport(fixture, packageTerms);
  const instrument = world.bargaining_instrument;
  const binding = instrument.authority_class === 'binding_collective_bargaining';
  const ratificationPassed = binding
    && Object.values(support.group_shares).every(share => share >= instrument.group_ratification_threshold);
  const formalBargainingComplete = bindingInstrumentComplete(instrument);
  const collectiveAgreement = formalBargainingComplete && ratificationPassed;
  const bindingImpasse = binding && !collectiveAgreement;

  let institutionalApproval = false;
  if (instrument.authority_class === 'institution_unilateral_bundle') institutionalApproval = true;
  else if (instrument.authority_class === 'advisory_co_design') institutionalApproval = true;
  else if (instrument.authority_class === 'binding_collective_bargaining') institutionalApproval = collectiveAgreement;

  let implementationState;
  if (collectiveAgreement) implementationState = 'authorized_by_ratified_collective_agreement';
  else if (bindingImpasse) implementationState = 'blocked_by_binding_bargaining_impasse';
  else if (instrument.authority_class === 'synthetic_candidate_generation') implementationState = 'candidate_only_without_collective_agreement';
  else if (instrument.authority_class === 'advisory_co_design') implementationState = 'institutionally_approved_without_collective_agreement';
  else implementationState = 'institutionally_selected_without_package_agreement';

  const resolution = {
    institutional_approval: institutionalApproval,
    collective_agreement: collectiveAgreement,
    binding_impasse: bindingImpasse,
    implementation_state: implementationState
  };

  return {
    world_id: world.world_id,
    package_source: world.package_source,
    package_terms_ref: world.package_terms_ref,
    package_terms: packageTerms,
    package_signature_sha256: sha256(packageTerms),
    component_poll: fixture.expected_component_poll,
    component_poll_signature_sha256: sha256(fixture.expected_component_poll),
    support,
    package_support_signature_sha256: sha256(support),
    bargaining_instrument: instrument,
    bargaining_instrument_signature_sha256: sha256(instrument),
    rule_evaluation: {
      binding,
      representative_mandates_present: instrument.representative_mandates,
      reciprocal_concessions_present: instrument.reciprocal_concessions,
      group_ratification_passed: ratificationPassed,
      formal_bargaining_complete: formalBargainingComplete
    },
    resolution,
    agreement_resolution_signature_sha256: sha256(resolution)
  };
}

function buildPackageChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:population`,
    event_type: 'population_and_conditional_package_rules_sealed',
    evidence_class: 'synthetic_control_population',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      population_groups: fixture.population_groups,
      cohorts: fixture.cohorts,
      terms: fixture.terms
    }
  });
  push({
    event_id: `${result.world_id}:component-poll`,
    event_type: 'component_poll_recorded',
    evidence_class: 'independent_component_response',
    authority: 'fixture_observer',
    source_event_ids: [`${result.world_id}:population`],
    payload: {
      component_poll: result.component_poll,
      inclusion_threshold: fixture.component_inclusion_threshold
    }
  });
  push({
    event_id: `${result.world_id}:package`,
    event_type: 'package_proposal_recorded',
    evidence_class: result.package_source,
    authority: result.package_source === 'synthetic_generated_candidate' ? 'synthetic_candidate_generator' : 'fixture_package_actor',
    source_event_ids: [`${result.world_id}:component-poll`],
    payload: {
      package_terms_ref: result.package_terms_ref,
      package_terms: result.package_terms,
      package_signature_sha256: result.package_signature_sha256
    }
  });
  push({
    event_id: `${result.world_id}:mandates`,
    event_type: 'representative_mandate_state_recorded',
    evidence_class: result.bargaining_instrument.representative_mandates ? 'attributed_group_mandates' : 'mandates_absent',
    authority: result.bargaining_instrument.representative_mandates ? 'affected_group_members' : 'fixture_observer',
    source_event_ids: [`${result.world_id}:package`],
    payload: {
      representative_mandates: result.bargaining_instrument.representative_mandates,
      affected_groups: Object.keys(fixture.population_groups).sort()
    }
  });
  push({
    event_id: `${result.world_id}:instrument`,
    event_type: 'bargaining_instrument_sealed',
    evidence_class: 'bargaining_authority_contract',
    authority: 'fixture_constitution',
    source_event_ids: [`${result.world_id}:mandates`],
    payload: result.bargaining_instrument
  });
  push({
    event_id: `${result.world_id}:ratification`,
    event_type: 'package_support_and_group_disposition_recorded',
    evidence_class: result.bargaining_instrument.group_ratification_required ? 'binding_group_ratification' : 'package_acceptance_observation',
    authority: result.bargaining_instrument.group_ratification_required ? 'affected_group_members' : 'fixture_observer',
    source_event_ids: [`${result.world_id}:instrument`],
    payload: {
      support: result.support,
      rule_evaluation: result.rule_evaluation
    }
  });
  push({
    event_id: `${result.world_id}:agreement`,
    event_type: 'agreement_or_impasse_resolution',
    evidence_class: 'deterministic_bargaining_resolution',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:ratification`],
    payload: result.resolution
  });
  push({
    event_id: `${result.world_id}:implementation`,
    event_type: 'implementation_resolution',
    evidence_class: 'deterministic_implementation_state',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:agreement`],
    payload: {
      package_terms_ref: result.package_terms_ref,
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
      allowed_interpretation: 'package_acceptance_and_agreement_consequence_under_the_sealed_terms_mandates_ratification_and_enforcement_history',
      refused_promotions: [
        'component_marginals_as_package_acceptance',
        'package_support_as_collective_agreement',
        'synthetic_candidate_as_bargained_agreement',
        'advisory_co_design_as_binding_bargaining',
        'failed_ratification_as_missing_preference_data',
        'bargaining_failure_as_manipulative_intent'
      ]
    }
  });
  return events;
}

export function validatePackageChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('package chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate package event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`package event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`package event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`package event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferencePackageFixture(fixture) {
  const errors = validatePreferencePackageFixture(fixture);
  if (errors.length) throw new Error(`invalid preference package fixture:\n- ${errors.join('\n- ')}`);

  const computedPoll = componentPoll(fixture);
  if (JSON.stringify(computedPoll) !== JSON.stringify(fixture.expected_component_poll)) {
    throw new Error('fixture cohorts do not produce the frozen component poll');
  }
  const thresholdPackage = fixture.terms.filter(term => computedPoll[term] / populationTotal(fixture) >= fixture.component_inclusion_threshold);
  if (JSON.stringify(thresholdPackage) !== JSON.stringify(fixture.expected_packages.marginal_majority)) {
    throw new Error('component-threshold rule does not produce the frozen marginal-majority package');
  }
  for (const [packageRef, packageTerms] of Object.entries(fixture.expected_packages)) {
    const support = packageSupport(fixture, packageTerms);
    const expected = fixture.expected_package_support[packageRef];
    const projected = {
      ...support.by_group,
      total: support.total,
      share: support.share
    };
    if (JSON.stringify(projected) !== JSON.stringify(expected)) {
      throw new Error(`package ${packageRef} does not produce the frozen support state`);
    }
  }

  const worlds = fixture.worlds.map(world => evaluateWorld(fixture, world));
  for (let index = 0; index < worlds.length; index += 1) {
    const result = worlds[index];
    const expected = fixture.worlds[index].expected_resolution;
    if (JSON.stringify(result.resolution) !== JSON.stringify(expected)) {
      throw new Error(`world ${result.world_id} does not produce the frozen expected package resolution`);
    }
    result.custody_chain = buildPackageChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const componentPollSignatures = unique(worlds.map(world => world.component_poll_signature_sha256));
  const packageSignatures = unique(worlds.map(world => world.package_signature_sha256));
  const packageSupportSignatures = unique(worlds.map(world => world.package_support_signature_sha256));
  const marginalWorld = worlds.find(world => world.package_terms_ref === 'marginal_majority');
  const protectedWorld = worlds.find(world => world.package_terms_ref === 'protected');
  const oneSidedWorld = worlds.find(world => world.package_terms_ref === 'one_sided_counteroffer');
  const groupShares = Object.values(oneSidedWorld?.support?.group_shares ?? {});

  return {
    schema_version: PREFERENCE_PACKAGE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    population_groups: fixture.population_groups,
    terms: fixture.terms,
    cohorts: fixture.cohorts,
    expected_component_poll: fixture.expected_component_poll,
    component_inclusion_threshold: fixture.component_inclusion_threshold,
    expected_packages: fixture.expected_packages,
    worlds,
    metrics: {
      distinct_component_poll_signatures: componentPollSignatures.length,
      distinct_package_signatures: packageSignatures.length,
      distinct_package_support_signatures: packageSupportSignatures.length,
      marginal_majority_package_support_share: marginalWorld?.support?.share,
      protected_package_support_share: protectedWorld?.support?.share,
      package_support_gap: (protectedWorld?.support?.share ?? 0) - (marginalWorld?.support?.share ?? 0),
      high_support_nonagreement_worlds: worlds.filter(world => world.support.share === 1 && !world.resolution.collective_agreement).length,
      binding_collective_agreement_worlds: worlds.filter(world => world.resolution.collective_agreement).length,
      binding_impasse_worlds: worlds.filter(world => world.resolution.binding_impasse).length,
      institutionally_approved_without_collective_agreement_worlds: worlds.filter(world => world.resolution.institutional_approval && !world.resolution.collective_agreement).length,
      synthetic_candidate_worlds: worlds.filter(world => world.package_source === 'synthetic_generated_candidate').length,
      maximum_one_sided_group_ratification_gap: groupShares.length ? Math.max(...groupShares) - Math.min(...groupShares) : 0
    },
    identification: {
      package_acceptance: 'requires_complete_package_level_instrument',
      collective_agreement: 'requires_mandates_reciprocity_group_ratification_enforcement_and_reopen',
      synthetic_candidate: 'proposal_only',
      bargaining_impasse: 'binding_disposition_not_missing_data',
      required_bargaining_evidence: fixture.required_bargaining_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferencePackageBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_PACKAGE_BUILD_SCHEMA_VERSION) errors.push('preference package build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('package build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('package build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('package fixture must not generate a real-world conclusion');
  if (compiled?.metrics?.distinct_component_poll_signatures !== 1) errors.push('package fixture must preserve one component-poll signature');
  if (compiled?.metrics?.distinct_package_signatures !== 3) errors.push('package fixture must preserve three package versions');
  if (compiled?.metrics?.distinct_package_support_signatures !== 3) errors.push('package fixture must preserve three package-support states');
  if (!close(compiled?.metrics?.marginal_majority_package_support_share, 0.2)) errors.push('marginal-majority package must preserve 20 percent support');
  if (!close(compiled?.metrics?.protected_package_support_share, 1)) errors.push('protected package must preserve complete support');
  if (!close(compiled?.metrics?.package_support_gap, 0.8)) errors.push('package fixture must preserve the 80-point package support gap');
  if (compiled?.metrics?.high_support_nonagreement_worlds !== 2) errors.push('package fixture must preserve two high-support nonagreement worlds');
  if (compiled?.metrics?.binding_collective_agreement_worlds !== 1) errors.push('package fixture must preserve one binding collective agreement');
  if (compiled?.metrics?.binding_impasse_worlds !== 1) errors.push('package fixture must preserve one binding impasse');
  if (compiled?.metrics?.institutionally_approved_without_collective_agreement_worlds !== 2) errors.push('package fixture must preserve two institutional approvals without collective agreement');
  if (compiled?.metrics?.synthetic_candidate_worlds !== 1) errors.push('package fixture must preserve one synthetic package candidate');
  if (!close(compiled?.metrics?.maximum_one_sided_group_ratification_gap, 0.8)) errors.push('package fixture must preserve the 80-point one-sided ratification gap');
  if (compiled?.classification?.component_marginals_identify_package_acceptance !== false) errors.push('fixture must refuse component marginals as package acceptance');
  if (compiled?.classification?.high_package_support_is_collective_agreement !== false) errors.push('fixture must refuse high support as collective agreement');
  if (compiled?.classification?.synthetic_candidate_can_bind_representatives !== false) errors.push('fixture must refuse synthetic candidate authority over representatives');
  if (compiled?.classification?.advisory_co_design_is_collective_agreement !== false) errors.push('fixture must refuse advisory co-design as collective agreement');
  if (compiled?.classification?.binding_ratification_creates_collective_agreement !== true) errors.push('fixture must preserve binding ratification as collective agreement');
  if (compiled?.classification?.bargaining_impasse_is_missing_preference_data !== false) errors.push('fixture must preserve bargaining impasse as a disposition');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.package_acceptance !== 'requires_complete_package_level_instrument') errors.push('package-level instrument boundary is required');
  if (compiled?.identification?.collective_agreement !== 'requires_mandates_reciprocity_group_ratification_enforcement_and_reopen') errors.push('collective agreement boundary is required');
  if (unique(compiled?.identification?.required_bargaining_evidence).length < 10) errors.push('bargaining evidence requirements are incomplete');

  for (const world of array(compiled?.worlds)) {
    errors.push(...validatePackageChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (world?.resolution?.collective_agreement && world?.resolution?.implementation_state !== 'authorized_by_ratified_collective_agreement') {
      errors.push(`world ${world?.world_id} collective agreement must authorize the ratified package`);
    }
    if (world?.resolution?.binding_impasse && world?.resolution?.implementation_state !== 'blocked_by_binding_bargaining_impasse') {
      errors.push(`world ${world?.world_id} binding impasse must block implementation`);
    }
    if (world?.bargaining_instrument?.authority_class !== 'binding_collective_bargaining' && world?.resolution?.collective_agreement !== false) {
      errors.push(`world ${world?.world_id} nonbinding process cannot resolve as collective agreement`);
    }
  }

  const mandatoryRules = [
    'marginal_clause_support_is_not_package_acceptance',
    'package_support_is_not_collective_agreement',
    'synthetic_package_is_candidate_not_bargain',
    'advisory_co_design_is_not_binding_bargaining',
    'representative_mandate_requires_attributed_membership',
    'negotiated_package_requires_reciprocity_ratification_enforcement_and_reopen',
    'failed_ratification_is_binding_impasse_not_missing_data',
    'package_terms_require_versioned_custody',
    'collective_agreement_requires_group_disposition'
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

export function renderPreferencePackageMarkdown(compiled) {
  const lines = [
    '# Preference custody: negotiated package formation and collective bargaining',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen component poll',
    ''
  ];
  for (const term of compiled.terms) {
    lines.push(`- ${term}: ${compiled.expected_component_poll[term]} (${percentage(compiled.expected_component_poll[term] / sum(Object.values(compiled.population_groups)))})`);
  }
  lines.push('', '## Package worlds', '');
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Package source: ${world.package_source}`);
    lines.push(`- Package terms: ${world.package_terms.join(', ')}`);
    lines.push(`- Package support: ${world.support.total} (${percentage(world.support.share)})`);
    lines.push(`- Group support: ${Object.entries(world.support.group_shares).map(([groupId, share]) => `${groupId} ${percentage(share)}`).join(', ')}`);
    lines.push(`- Bargaining authority: ${world.bargaining_instrument.authority_class}`);
    lines.push(`- Group ratification passed: ${world.rule_evaluation.group_ratification_passed}`);
    lines.push(`- Collective agreement: ${world.resolution.collective_agreement}`);
    lines.push(`- Binding impasse: ${world.resolution.binding_impasse}`);
    lines.push(`- Implementation state: ${world.resolution.implementation_state}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Component marginals identify package acceptance: false',
    '- High package support is collective agreement: false',
    '- Synthetic candidate can bind representatives: false',
    '- Advisory co-design is collective agreement: false',
    '- Binding ratification creates collective agreement: true',
    '- Bargaining impasse is missing preference data: false',
    '- Preference change present: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Required bargaining evidence',
    ''
  );
  for (const item of compiled.identification.required_bargaining_evidence) lines.push(`- ${item}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
