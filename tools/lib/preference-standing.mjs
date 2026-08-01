import { createHash } from 'node:crypto';

export const PREFERENCE_STANDING_FIXTURE_SCHEMA_VERSION = 'preference-standing-fixture@1';
export const PREFERENCE_STANDING_BUILD_SCHEMA_VERSION = 'preference-standing-build@1';

const EPSILON = 1e-12;
const SUPPORT_SOURCES = new Set([
  'synthetic_predicted_response',
  'direct_advisory_human_response',
  'binding_constituency_disposition'
]);
const AUTHORITY_CLASSES = new Set([
  'commissioner_unilateral',
  'advisory_consultation',
  'binding_affected_public'
]);
const DECISION_OUTCOMES = new Set(['approve', 'reject']);

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
  if (!Number.isFinite(number) || number < 0 || number > 1) errors.push(`${label} must be a probability in [0, 1]${nullable ? ' or null' : ''}`);
}

function allBindingRights(rights) {
  const value = object(rights);
  return value.objective_amendment === true
    && value.suspension === true
    && value.veto === true
    && value.appeal_and_remedy === true;
}

function allNonbindingRightsFalse(rights) {
  const value = object(rights);
  return value.objective_amendment === false
    && value.suspension === false
    && value.veto === false
    && value.appeal_and_remedy === false;
}

export function validatePreferenceStandingFixture(fixture) {
  const errors = [];
  const groups = object(fixture?.population_groups);
  const groupIds = Object.keys(groups).sort();
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_STANDING_FIXTURE_SCHEMA_VERSION) errors.push('preference standing fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  if (!text(fixture?.proposal?.proposal_id) || !text(fixture?.proposal?.objective) || !text(fixture?.proposal?.commissioner)) errors.push('proposal identity, objective, and commissioner are required');
  if (groupIds.length < 2) errors.push('fixture requires at least two population groups');
  for (const groupId of groupIds) {
    const count = Number(groups[groupId]);
    if (!Number.isInteger(count) || count <= 0) errors.push(`population group ${groupId} must be a positive integer`);
  }

  const expectedHeadline = object(fixture?.expected_headline);
  if (!Number.isInteger(expectedHeadline.support) || expectedHeadline.support < 0) errors.push('expected headline support must be a non-negative integer');
  if (!Number.isInteger(expectedHeadline.oppose) || expectedHeadline.oppose < 0) errors.push('expected headline oppose must be a non-negative integer');
  if (expectedHeadline.support + expectedHeadline.oppose !== sum(Object.values(groups))) errors.push('expected headline must reconcile to the population');
  if (!close(expectedHeadline.support_rate, expectedHeadline.support / (expectedHeadline.support + expectedHeadline.oppose))) errors.push('expected support rate must match headline counts');

  if (worlds.length < 4) errors.push('fixture requires at least four authority worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const support = object(world?.support_evidence);
    const supportByGroup = object(support.support_by_group);
    const instrument = object(world?.authority_instrument);
    const rights = object(instrument.rights);
    const decision = object(world?.decision);
    const expected = object(world?.expected_resolution);

    if (!text(world?.world_id)) errors.push('every world requires world_id');
    if (!SUPPORT_SOURCES.has(support.source_class)) errors.push(`world ${worldId} has invalid support source ${support.source_class}`);
    if (JSON.stringify(Object.keys(supportByGroup).sort()) !== JSON.stringify(groupIds)) errors.push(`world ${worldId} support must use exactly the population groups`);
    for (const groupId of groupIds) {
      const count = Number(supportByGroup[groupId]);
      if (!Number.isInteger(count) || count < 0 || count > groups[groupId]) errors.push(`world ${worldId} support ${groupId} must be an integer within the group denominator`);
    }

    if (!AUTHORITY_CLASSES.has(instrument.authority_class)) errors.push(`world ${worldId} has invalid authority class ${instrument.authority_class}`);
    validateProbability(instrument.quorum_fraction, `world ${worldId} quorum_fraction`, errors, { nullable: true });
    validateProbability(instrument.overall_support_threshold, `world ${worldId} overall_support_threshold`, errors, { nullable: true });
    validateProbability(instrument.group_support_threshold, `world ${worldId} group_support_threshold`, errors, { nullable: true });
    if (!DECISION_OUTCOMES.has(decision.outcome)) errors.push(`world ${worldId} has invalid decision outcome ${decision.outcome}`);
    if (!text(decision.actor)) errors.push(`world ${worldId} decision actor is required`);

    if (instrument.authority_class === 'binding_affected_public') {
      if (instrument.binding !== true) errors.push(`world ${worldId} binding authority must declare binding true`);
      if (instrument.eligible_constituency_defined !== true) errors.push(`world ${worldId} binding authority requires an eligible constituency`);
      if (instrument.challenge_window !== true) errors.push(`world ${worldId} binding authority requires a challenge window`);
      if (!allBindingRights(rights)) errors.push(`world ${worldId} binding authority requires amend, suspend, veto, appeal, and remedy rights`);
      if (instrument.quorum_fraction === null || instrument.overall_support_threshold === null || instrument.group_support_threshold === null) {
        errors.push(`world ${worldId} binding authority requires quorum, overall, and group thresholds`);
      }
      if (support.source_class !== 'binding_constituency_disposition') errors.push(`world ${worldId} binding authority requires binding constituency evidence`);
      if (decision.actor !== 'affected_public') errors.push(`world ${worldId} binding authority requires affected_public as decision actor`);
    } else {
      if (instrument.binding !== false) errors.push(`world ${worldId} nonbinding authority must declare binding false`);
      if (instrument.challenge_window !== false) errors.push(`world ${worldId} nonbinding authority cannot claim a binding challenge window`);
      if (!allNonbindingRightsFalse(rights)) errors.push(`world ${worldId} nonbinding authority cannot claim binding public rights`);
      if (instrument.quorum_fraction !== null || instrument.overall_support_threshold !== null || instrument.group_support_threshold !== null) {
        errors.push(`world ${worldId} nonbinding authority cannot carry binding thresholds`);
      }
      if (decision.actor !== 'fixture_commissioner') errors.push(`world ${worldId} nonbinding authority requires fixture_commissioner as decision actor`);
    }

    if (typeof expected.institutional_approval !== 'boolean'
        || typeof expected.public_authorization !== 'boolean'
        || typeof expected.binding_public_rejection !== 'boolean'
        || !text(expected.implementation_state)) {
      errors.push(`world ${worldId} expected resolution is incomplete`);
    }
    if (instrument.authority_class !== 'binding_affected_public' && expected.public_authorization !== false) {
      errors.push(`world ${worldId} nonbinding evidence cannot expect public authorization`);
    }
  }

  const expectedClassification = object(fixture?.expected_classification);
  const requiredExpected = {
    support_equivalence_supported: true,
    authority_provenance_changes_consequence: true,
    modeled_support_confers_authorization: false,
    advisory_feedback_confers_authorization: false,
    institutional_approval_is_public_authorization: false,
    aggregate_support_identifies_authorization: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'prediction_is_evidence_not_authority',
    'advisory_feedback_is_not_binding_participation',
    'institutional_approval_is_not_public_authorization',
    'aggregate_support_does_not_override_distributional_rule',
    'authorization_requires_binding_affected_public_standing',
    'objective_control_requires_amend_suspend_veto_and_remedy',
    'public_rejection_blocks_implementation',
    'model_accuracy_does_not_confer_jurisdiction'
  ];
  const requiredRules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) {
    if (!requiredRules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_authorization_evidence).length < 6) errors.push('authorization evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

function evaluateWorld(fixture, world) {
  const groups = fixture.population_groups;
  const groupIds = Object.keys(groups).sort();
  const supportByGroup = world.support_evidence.support_by_group;
  const support = sum(Object.values(supportByGroup));
  const population = sum(Object.values(groups));
  const oppose = population - support;
  const supportRate = support / population;
  const groupRates = Object.fromEntries(groupIds.map(groupId => [groupId, supportByGroup[groupId] / groups[groupId]]));
  const instrument = world.authority_instrument;
  const binding = instrument.authority_class === 'binding_affected_public';
  const quorumMet = binding ? 1 >= instrument.quorum_fraction : false;
  const overallThresholdMet = binding ? supportRate >= instrument.overall_support_threshold : false;
  const groupThresholdsMet = binding ? groupIds.every(groupId => groupRates[groupId] >= instrument.group_support_threshold) : false;
  const bindingRulePassed = binding && quorumMet && overallThresholdMet && groupThresholdsMet;
  const rightsComplete = binding && instrument.challenge_window === true && allBindingRights(instrument.rights);
  const publicAuthorization = bindingRulePassed
    && rightsComplete
    && world.decision.actor === 'affected_public'
    && world.decision.outcome === 'approve';
  const bindingPublicRejection = binding
    && world.decision.actor === 'affected_public'
    && (world.decision.outcome === 'reject' || !bindingRulePassed);
  const institutionalApproval = !binding
    && world.decision.actor === 'fixture_commissioner'
    && world.decision.outcome === 'approve';

  let implementationState = 'candidate_only';
  if (publicAuthorization) implementationState = 'authorized_by_binding_public_standing';
  else if (bindingPublicRejection) implementationState = 'blocked_by_binding_public_rule';
  else if (institutionalApproval) implementationState = 'institutionally_approved_without_public_authorization';

  return {
    world_id: world.world_id,
    proposal_id: fixture.proposal.proposal_id,
    support_evidence: world.support_evidence,
    aggregate_headline: {
      support,
      oppose,
      support_rate: supportRate
    },
    group_support_rates: groupRates,
    aggregate_headline_signature_sha256: sha256({ support, oppose, support_rate: supportRate }),
    support_evidence_signature_sha256: sha256(world.support_evidence),
    authority_instrument: world.authority_instrument,
    authority_instrument_signature_sha256: sha256(world.authority_instrument),
    decision: world.decision,
    rule_evaluation: {
      quorum_met: quorumMet,
      overall_threshold_met: overallThresholdMet,
      group_thresholds_met: groupThresholdsMet,
      binding_rule_passed: bindingRulePassed,
      rights_complete: rightsComplete
    },
    resolution: {
      institutional_approval: institutionalApproval,
      public_authorization: publicAuthorization,
      binding_public_rejection: bindingPublicRejection,
      implementation_state: implementationState
    },
    authority_resolution_signature_sha256: sha256({
      institutional_approval: institutionalApproval,
      public_authorization: publicAuthorization,
      binding_public_rejection: bindingPublicRejection,
      implementation_state: implementationState
    })
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildStandingChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:proposal`,
    event_type: 'proposal_sealed',
    evidence_class: 'synthetic_control_object',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.proposal
  });
  push({
    event_id: `${result.world_id}:support`,
    event_type: 'support_evidence_recorded',
    evidence_class: result.support_evidence.source_class,
    authority: 'fixture_evidence_source',
    source_event_ids: [`${result.world_id}:proposal`],
    payload: {
      support_evidence: result.support_evidence,
      aggregate_headline: result.aggregate_headline,
      group_support_rates: result.group_support_rates
    }
  });
  push({
    event_id: `${result.world_id}:instrument`,
    event_type: 'authority_instrument_sealed',
    evidence_class: 'authority_contract',
    authority: 'fixture_constitution',
    source_event_ids: [`${result.world_id}:support`],
    payload: result.authority_instrument
  });
  push({
    event_id: `${result.world_id}:decision`,
    event_type: 'decision_disposition_recorded',
    evidence_class: 'attributed_disposition',
    authority: result.decision.actor,
    source_event_ids: [`${result.world_id}:instrument`],
    payload: {
      decision: result.decision,
      rule_evaluation: result.rule_evaluation
    }
  });
  push({
    event_id: `${result.world_id}:resolution`,
    event_type: 'authority_resolution',
    evidence_class: 'deterministic_authority_resolution',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:decision`],
    payload: result.resolution
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'fixture_analyst',
    source_event_ids: [`${result.world_id}:resolution`],
    payload: {
      allowed_interpretation: 'support_evidence_and_authority_consequence_under_the_sealed_instrument',
      refused_promotions: [
        'support_as_authorization',
        'advice_as_binding_participation',
        'commissioner_approval_as_public_authorization',
        'aggregate_support_as_jurisdiction',
        'model_accuracy_as_legitimacy',
        'authority_defect_as_manipulative_intent'
      ]
    }
  });
  return events;
}

export function validateStandingChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('standing chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate standing event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`standing event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`standing event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`standing event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceStandingFixture(fixture) {
  const errors = validatePreferenceStandingFixture(fixture);
  if (errors.length) throw new Error(`invalid preference standing fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => evaluateWorld(fixture, world));
  for (let index = 0; index < worlds.length; index += 1) {
    const result = worlds[index];
    const expected = fixture.worlds[index].expected_resolution;
    if (JSON.stringify(result.resolution) !== JSON.stringify(expected)) {
      throw new Error(`world ${result.world_id} does not produce the frozen expected authority resolution`);
    }
    if (result.aggregate_headline.support !== fixture.expected_headline.support
        || result.aggregate_headline.oppose !== fixture.expected_headline.oppose
        || !close(result.aggregate_headline.support_rate, fixture.expected_headline.support_rate)) {
      throw new Error(`world ${result.world_id} does not produce the frozen aggregate support headline`);
    }
    result.custody_chain = buildStandingChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  const headlineSignatures = unique(worlds.map(world => world.aggregate_headline_signature_sha256));
  const evidenceClasses = unique(worlds.map(world => world.support_evidence.source_class));
  const authorityClasses = unique(worlds.map(world => world.authority_instrument.authority_class));
  const authorityResolutions = unique(worlds.map(world => world.authority_resolution_signature_sha256));

  return {
    schema_version: PREFERENCE_STANDING_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    proposal: fixture.proposal,
    population_groups: fixture.population_groups,
    expected_headline: fixture.expected_headline,
    worlds,
    metrics: {
      distinct_aggregate_headline_signatures: headlineSignatures.length,
      distinct_support_evidence_classes: evidenceClasses.length,
      distinct_authority_classes: authorityClasses.length,
      distinct_authority_resolution_signatures: authorityResolutions.length,
      public_authorized_worlds: worlds.filter(world => world.resolution.public_authorization).length,
      institutionally_approved_without_public_authorization_worlds: worlds.filter(world => world.resolution.implementation_state === 'institutionally_approved_without_public_authorization').length,
      binding_public_rejection_worlds: worlds.filter(world => world.resolution.binding_public_rejection).length,
      aggregate_support_rate: fixture.expected_headline.support_rate
    },
    identification: {
      public_authorization: 'requires_binding_affected_public_standing',
      objective_control: 'requires_amend_suspend_veto_appeal_and_remedy',
      support_metric: 'evidence_only',
      institutional_approval: 'separate_from_public_authorization',
      required_authorization_evidence: fixture.required_authorization_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceStandingBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_STANDING_BUILD_SCHEMA_VERSION) errors.push('preference standing build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('standing build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('standing build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('standing fixture must not generate a real-world conclusion');
  if (compiled?.metrics?.distinct_aggregate_headline_signatures !== 1) errors.push('standing fixture must preserve one aggregate support headline');
  if (!(compiled?.metrics?.distinct_support_evidence_classes >= 3)) errors.push('standing fixture must preserve at least three evidence classes');
  if (!(compiled?.metrics?.distinct_authority_classes >= 3)) errors.push('standing fixture must preserve at least three authority classes');
  if (!(compiled?.metrics?.distinct_authority_resolution_signatures >= 3)) errors.push('standing fixture must preserve at least three authority consequences');
  if (compiled?.metrics?.public_authorized_worlds !== 1) errors.push('standing fixture must contain exactly one publicly authorized world');
  if (compiled?.metrics?.institutionally_approved_without_public_authorization_worlds !== 2) errors.push('standing fixture must contain two institutionally approved but publicly unauthorized worlds');
  if (compiled?.metrics?.binding_public_rejection_worlds !== 1) errors.push('standing fixture must contain one binding public rejection');
  if (!close(compiled?.metrics?.aggregate_support_rate, 0.8)) errors.push('standing fixture must preserve the frozen 80 percent support rate');
  if (compiled?.classification?.modeled_support_confers_authorization !== false) errors.push('fixture must refuse modeled support as authorization');
  if (compiled?.classification?.advisory_feedback_confers_authorization !== false) errors.push('fixture must refuse advisory feedback as authorization');
  if (compiled?.classification?.institutional_approval_is_public_authorization !== false) errors.push('fixture must separate institutional approval from public authorization');
  if (compiled?.classification?.aggregate_support_identifies_authorization !== false) errors.push('fixture must refuse aggregate support as authorization');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.public_authorization !== 'requires_binding_affected_public_standing') errors.push('binding public standing identification boundary is required');
  if (compiled?.identification?.objective_control !== 'requires_amend_suspend_veto_appeal_and_remedy') errors.push('objective control boundary is required');
  if (unique(compiled?.identification?.required_authorization_evidence).length < 6) errors.push('authorization evidence requirements are incomplete');

  const headlines = unique(array(compiled?.worlds).map(world => world?.aggregate_headline_signature_sha256));
  if (headlines.length !== 1) errors.push('compiled standing worlds do not share one support headline');
  for (const world of array(compiled?.worlds)) {
    errors.push(...validateStandingChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (world?.authority_instrument?.authority_class !== 'binding_affected_public' && world?.resolution?.public_authorization !== false) {
      errors.push(`world ${world?.world_id} nonbinding authority cannot resolve as publicly authorized`);
    }
    if (world?.resolution?.binding_public_rejection === true && world?.resolution?.implementation_state !== 'blocked_by_binding_public_rule') {
      errors.push(`world ${world?.world_id} binding rejection must block implementation`);
    }
  }

  const mandatoryRules = [
    'prediction_is_evidence_not_authority',
    'advisory_feedback_is_not_binding_participation',
    'institutional_approval_is_not_public_authorization',
    'aggregate_support_does_not_override_distributional_rule',
    'authorization_requires_binding_affected_public_standing',
    'objective_control_requires_amend_suspend_veto_and_remedy',
    'public_rejection_blocks_implementation',
    'model_accuracy_does_not_confer_jurisdiction'
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

export function renderPreferenceStandingMarkdown(compiled) {
  const lines = [
    '# Preference custody: standing and objective-control authority',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared support headline',
    '',
    `- Support: ${compiled.expected_headline.support}`,
    `- Oppose: ${compiled.expected_headline.oppose}`,
    `- Support rate: ${percentage(compiled.expected_headline.support_rate)}`,
    '',
    '## Authority worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Evidence class: ${world.support_evidence.source_class}`);
    lines.push(`- Authority class: ${world.authority_instrument.authority_class}`);
    lines.push(`- Institutional approval: ${world.resolution.institutional_approval}`);
    lines.push(`- Public authorization: ${world.resolution.public_authorization}`);
    lines.push(`- Binding public rejection: ${world.resolution.binding_public_rejection}`);
    lines.push(`- Implementation state: ${world.resolution.implementation_state}`);
    lines.push(`- Group support: ${Object.entries(world.group_support_rates).map(([groupId, rate]) => `${groupId} ${percentage(rate)}`).join(', ')}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Prediction confers public authorization: false',
    '- Advisory feedback confers public authorization: false',
    '- Institutional approval equals public authorization: false',
    '- Aggregate support identifies authorization: false',
    '- Binding public rejection blocks implementation: true',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Required authorization evidence',
    ''
  );
  for (const item of compiled.identification.required_authorization_evidence) lines.push(`- ${item}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
