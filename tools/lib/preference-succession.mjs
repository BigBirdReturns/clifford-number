import { createHash } from 'node:crypto';

export const PREFERENCE_SUCCESSION_FIXTURE_SCHEMA_VERSION = 'preference-succession-fixture@1';
export const PREFERENCE_SUCCESSION_BUILD_SCHEMA_VERSION = 'preference-succession-build@1';

const EPSILON = 1e-12;
const VALIDATION_ACTIONS = new Set([
  'inherit_exact',
  'inherit_without_revalidation',
  'new_validation_no_crosswalk',
  'inherit_predictive_validation_without_policy_test',
  'new_validation_with_crosswalk_and_policy_test',
  'failed_revalidation_rollback'
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

function sameObject(left, right) {
  return sha256(left) === sha256(right);
}

function validateProbability(value, label, errors) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) errors.push(`${label} must be a probability in [0, 1]`);
}

function validateArtifact(value, label, errors) {
  const artifact = object(value);
  for (const key of ['model_id', 'prompt_id', 'retrieval_id', 'postprocess_id']) {
    if (!text(artifact[key])) errors.push(`${label}.${key} is required`);
  }
}

function validateMetric(value, label, errors) {
  const metric = object(value);
  for (const key of ['metric_id', 'definition', 'code_id']) {
    if (!text(metric[key])) errors.push(`${label}.${key} is required`);
  }
}

function validatePolicy(value, label, errors) {
  const policy = object(value);
  if (!text(policy.policy_id) || !text(policy.action)) errors.push(`${label} identity and action are required`);
  validateProbability(policy.action_threshold, `${label}.action_threshold`, errors);
}

function validateValidation(value, label, errors) {
  const validation = object(value);
  for (const key of ['receipt_id', 'benchmark_id', 'data_window']) {
    if (!text(validation[key])) errors.push(`${label}.${key} is required`);
  }
  validateProbability(validation.score, `${label}.score`, errors);
  validateProbability(validation.pass_threshold, `${label}.pass_threshold`, errors);
}

function validationPassed(validation) {
  return Boolean(validation) && Number(validation.score) >= Number(validation.pass_threshold);
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validatePreferenceSuccessionFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline_system);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_SUCCESSION_FIXTURE_SCHEMA_VERSION) errors.push('preference succession fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  validateArtifact(baseline.artifact, 'baseline_system.artifact', errors);
  validateMetric(baseline.metric, 'baseline_system.metric', errors);
  validatePolicy(baseline.policy, 'baseline_system.policy', errors);
  validateValidation(baseline.validation, 'baseline_system.validation', errors);
  if (!validationPassed(baseline.validation)) errors.push('baseline validation must pass its declared threshold');
  if (fixture?.public_headline?.claim !== 'validated_accuracy') errors.push('public headline claim must remain validated_accuracy');
  validateProbability(fixture?.public_headline?.score, 'public_headline.score', errors);
  if (!close(fixture?.public_headline?.score, baseline?.validation?.score)) errors.push('public headline score must match the baseline validation score');

  if (worlds.length < 6) errors.push('fixture requires at least six succession worlds');
  const worldIds = worlds.map(world => text(world?.world_id));
  if (unique(worldIds).length !== worldIds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    if (!text(world?.world_id)) errors.push('every world requires world_id');
    validateArtifact(world?.successor_artifact, `world ${worldId}.successor_artifact`, errors);
    validateMetric(world?.successor_metric, `world ${worldId}.successor_metric`, errors);
    validatePolicy(world?.successor_policy, `world ${worldId}.successor_policy`, errors);
    if (!VALIDATION_ACTIONS.has(world?.validation_action)) errors.push(`world ${worldId} has invalid validation action ${world?.validation_action}`);
    if (world?.new_validation !== null) validateValidation(world?.new_validation, `world ${worldId}.new_validation`, errors);
    if (typeof world?.metric_crosswalk !== 'boolean') errors.push(`world ${worldId}.metric_crosswalk must be boolean`);
    if (typeof world?.policy_consequence_test !== 'boolean') errors.push(`world ${worldId}.policy_consequence_test must be boolean`);
    if (!text(world?.public_badge?.receipt_id)) errors.push(`world ${worldId} public badge receipt is required`);
    validateProbability(world?.public_badge?.score, `world ${worldId}.public_badge.score`, errors);
    if (!close(world?.public_badge?.score, fixture.public_headline.score)) errors.push(`world ${worldId} public badge must preserve the shared headline score`);

    const expected = object(world?.expected_resolution);
    for (const key of [
      'artifact_changed',
      'metric_changed',
      'policy_changed',
      'current_predictive_claim_eligible',
      'continuity_claim_eligible',
      'metric_comparable',
      'deployment_policy_claim_eligible',
      'public_badge_bound_to_current_predictive_artifact',
      'deployment_allowed',
      'rollback_required'
    ]) {
      if (typeof expected[key] !== 'boolean') errors.push(`world ${worldId} expected_resolution.${key} must be boolean`);
    }
    if (!text(expected.succession_state)) errors.push(`world ${worldId} expected succession state is required`);

    const artifactChanged = !sameObject(baseline.artifact, world.successor_artifact);
    const metricChanged = !sameObject(baseline.metric, world.successor_metric);
    const policyChanged = !sameObject(baseline.policy, world.successor_policy);
    if (world.validation_action === 'inherit_exact' && (artifactChanged || metricChanged || policyChanged || world.new_validation !== null)) {
      errors.push(`world ${worldId} exact inheritance requires no artifact, metric, policy, or validation change`);
    }
    if (world.validation_action === 'inherit_without_revalidation' && (!artifactChanged || world.new_validation !== null)) {
      errors.push(`world ${worldId} inherited runtime successor requires an artifact change and no new validation`);
    }
    if (world.validation_action === 'new_validation_no_crosswalk' && (!metricChanged || world.new_validation === null || world.metric_crosswalk !== false)) {
      errors.push(`world ${worldId} changed-metric validation requires a new receipt and no crosswalk`);
    }
    if (world.validation_action === 'inherit_predictive_validation_without_policy_test' && (!policyChanged || world.policy_consequence_test !== false || world.new_validation !== null)) {
      errors.push(`world ${worldId} policy successor must change policy, omit the consequence test, and inherit predictive validation`);
    }
    if (world.validation_action === 'new_validation_with_crosswalk_and_policy_test') {
      if (!(artifactChanged && metricChanged && policyChanged && world.new_validation !== null && world.metric_crosswalk && world.policy_consequence_test)) {
        errors.push(`world ${worldId} fully revalidated successor requires runtime, metric, policy, crosswalk, and policy-test evidence`);
      }
    }
    if (world.validation_action === 'failed_revalidation_rollback') {
      if (!artifactChanged || world.new_validation === null || validationPassed(world.new_validation)) {
        errors.push(`world ${worldId} failed revalidation requires a changed artifact and a below-threshold receipt`);
      }
    }
  }

  const expectedClassification = object(fixture?.expected_classification);
  const requiredExpected = {
    prior_validation_transfers_across_runtime_change: false,
    same_score_under_changed_metric_is_comparable: false,
    predictive_validation_authorizes_changed_policy: false,
    revalidated_successor_can_carry_bounded_claim: true,
    failed_revalidation_is_negative_evidence_not_missing_data: true,
    public_badge_identifies_current_artifact: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
  for (const [key, value] of Object.entries(requiredExpected)) {
    if (expectedClassification[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const mandatoryRules = [
    'validation_binds_exact_artifact_metric_policy_and_scope',
    'runtime_change_requires_revalidation',
    'prompt_retrieval_or_postprocess_change_requires_revalidation',
    'metric_change_requires_new_validation_and_comparability_crosswalk',
    'policy_change_requires_consequence_validation',
    'same_headline_is_not_same_measurement_or_scope',
    'old_badge_cannot_authorize_successor',
    'failed_revalidation_is_negative_evidence_not_missing_data',
    'rollback_or_abstention_preserves_failed_result',
    'publication_claim_requires_current_receipt_and_version'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) {
    if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  }
  if (unique(fixture?.required_succession_evidence).length < 12) errors.push('succession evidence requirements are incomplete');
  if (!array(fixture?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(fixture?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(fixture?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(fixture?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

function evaluateWorld(fixture, world) {
  const baseline = fixture.baseline_system;
  const artifactChanged = !sameObject(baseline.artifact, world.successor_artifact);
  const metricChanged = !sameObject(baseline.metric, world.successor_metric);
  const policyChanged = !sameObject(baseline.policy, world.successor_policy);
  const newValidationPassed = validationPassed(world.new_validation);

  const currentPredictiveClaimEligible = artifactChanged || metricChanged
    ? newValidationPassed
    : world.new_validation === null || newValidationPassed;
  const metricComparable = !metricChanged || world.metric_crosswalk === true;
  const deploymentPolicyClaimEligible = currentPredictiveClaimEligible
    && (!policyChanged || world.policy_consequence_test === true);
  const continuityClaimEligible = currentPredictiveClaimEligible
    && metricComparable
    && deploymentPolicyClaimEligible
    && (!artifactChanged || newValidationPassed);

  const currentReceiptId = newValidationPassed
    ? world.new_validation.receipt_id
    : (!artifactChanged && !metricChanged ? baseline.validation.receipt_id : null);
  const publicBadgeBound = currentPredictiveClaimEligible
    && currentReceiptId !== null
    && world.public_badge.receipt_id === currentReceiptId;
  const rollbackRequired = world.new_validation !== null && !newValidationPassed;
  const deploymentAllowed = deploymentPolicyClaimEligible && !rollbackRequired;

  let successionState;
  if (rollbackRequired) successionState = 'failed_revalidation_preserved_and_rollback_required';
  else if (!artifactChanged && !metricChanged && !policyChanged) successionState = 'exact_artifact_scope_inheritance';
  else if (artifactChanged && !newValidationPassed) successionState = 'blocked_unvalidated_runtime_successor';
  else if (metricChanged && currentPredictiveClaimEligible && !metricComparable) successionState = 'current_metric_validated_noncomparable_to_baseline';
  else if (policyChanged && !deploymentPolicyClaimEligible) successionState = 'predictive_validation_retained_policy_validation_required';
  else successionState = 'validated_successor_bounded_scope';

  const resolution = {
    artifact_changed: artifactChanged,
    metric_changed: metricChanged,
    policy_changed: policyChanged,
    current_predictive_claim_eligible: currentPredictiveClaimEligible,
    continuity_claim_eligible: continuityClaimEligible,
    metric_comparable: metricComparable,
    deployment_policy_claim_eligible: deploymentPolicyClaimEligible,
    public_badge_bound_to_current_predictive_artifact: publicBadgeBound,
    deployment_allowed: deploymentAllowed,
    rollback_required: rollbackRequired,
    succession_state: successionState
  };

  return {
    world_id: world.world_id,
    public_headline: fixture.public_headline,
    public_headline_signature_sha256: sha256(fixture.public_headline),
    baseline_artifact_signature_sha256: sha256(baseline.artifact),
    successor_artifact: world.successor_artifact,
    successor_artifact_signature_sha256: sha256(world.successor_artifact),
    baseline_metric_signature_sha256: sha256(baseline.metric),
    successor_metric: world.successor_metric,
    successor_metric_signature_sha256: sha256(world.successor_metric),
    baseline_policy_signature_sha256: sha256(baseline.policy),
    successor_policy: world.successor_policy,
    successor_policy_signature_sha256: sha256(world.successor_policy),
    validation_action: world.validation_action,
    new_validation: world.new_validation,
    new_validation_passed: newValidationPassed,
    metric_crosswalk: world.metric_crosswalk,
    policy_consequence_test: world.policy_consequence_test,
    public_badge: world.public_badge,
    lineage_diff: {
      artifact_changed: artifactChanged,
      metric_changed: metricChanged,
      policy_changed: policyChanged
    },
    resolution,
    resolution_signature_sha256: sha256(resolution)
  };
}

function buildSuccessionChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline-system`,
    event_type: 'baseline_system_sealed',
    evidence_class: 'validated_baseline_artifact',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: {
      artifact: fixture.baseline_system.artifact,
      metric: fixture.baseline_system.metric,
      policy: fixture.baseline_system.policy
    }
  });
  push({
    event_id: `${result.world_id}:baseline-validation`,
    event_type: 'baseline_validation_receipt_recorded',
    evidence_class: 'validation_receipt',
    authority: 'fixture_validator',
    source_event_ids: [`${result.world_id}:baseline-system`],
    payload: fixture.baseline_system.validation
  });
  push({
    event_id: `${result.world_id}:successor-system`,
    event_type: 'successor_system_sealed',
    evidence_class: 'successor_artifact_candidate',
    authority: 'fixture_builder',
    source_event_ids: [`${result.world_id}:baseline-validation`],
    payload: {
      artifact: result.successor_artifact,
      metric: result.successor_metric,
      policy: result.successor_policy
    }
  });
  push({
    event_id: `${result.world_id}:lineage-diff`,
    event_type: 'successor_lineage_diff_recorded',
    evidence_class: 'deterministic_version_diff',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:successor-system`],
    payload: result.lineage_diff
  });
  push({
    event_id: `${result.world_id}:validation-action`,
    event_type: 'successor_validation_action_recorded',
    evidence_class: result.new_validation === null ? 'validation_inheritance_claim' : 'successor_validation_receipt',
    authority: result.new_validation === null ? 'fixture_claimant' : 'fixture_validator',
    source_event_ids: [`${result.world_id}:lineage-diff`],
    payload: {
      validation_action: result.validation_action,
      new_validation: result.new_validation,
      new_validation_passed: result.new_validation_passed
    }
  });
  push({
    event_id: `${result.world_id}:comparability-policy`,
    event_type: 'metric_and_policy_evidence_recorded',
    evidence_class: 'succession_scope_evidence',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:validation-action`],
    payload: {
      metric_crosswalk: result.metric_crosswalk,
      policy_consequence_test: result.policy_consequence_test
    }
  });
  push({
    event_id: `${result.world_id}:claim-resolution`,
    event_type: 'claim_eligibility_resolution',
    evidence_class: 'deterministic_succession_resolution',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:comparability-policy`],
    payload: {
      public_badge: result.public_badge,
      resolution: result.resolution
    }
  });
  push({
    event_id: `${result.world_id}:deployment`,
    event_type: result.resolution.rollback_required ? 'rollback_resolution' : 'deployment_resolution',
    evidence_class: 'deterministic_deployment_state',
    authority: 'fixture_resolver',
    source_event_ids: [`${result.world_id}:claim-resolution`],
    payload: {
      deployment_allowed: result.resolution.deployment_allowed,
      rollback_required: result.resolution.rollback_required,
      succession_state: result.resolution.succession_state
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'fixture_analyst',
    source_event_ids: [`${result.world_id}:deployment`],
    payload: {
      allowed_interpretation: 'validation_and_deployment_claim_eligibility_under_the_sealed_artifact_metric_policy_benchmark_and_receipt_lineage',
      refused_promotions: [
        'old_badge_as_current_successor_validation',
        'same_score_as_metric_comparability',
        'predictive_validation_as_policy_consequence_validation',
        'failed_revalidation_as_missing_data',
        'version_gap_as_deceptive_intent'
      ]
    }
  });
  return events;
}

export function validateSuccessionChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('succession chain event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate succession event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`succession event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`succession event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`succession event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceSuccessionFixture(fixture) {
  const errors = validatePreferenceSuccessionFixture(fixture);
  if (errors.length) throw new Error(`invalid preference succession fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => evaluateWorld(fixture, world));
  for (let index = 0; index < worlds.length; index += 1) {
    const result = worlds[index];
    const expected = fixture.worlds[index].expected_resolution;
    if (JSON.stringify(result.resolution) !== JSON.stringify(expected)) {
      throw new Error(`world ${result.world_id} does not produce the frozen expected succession resolution`);
    }
    result.custody_chain = buildSuccessionChain(fixture, result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1)?.event_sha256 ?? null;
  }

  return {
    schema_version: PREFERENCE_SUCCESSION_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    baseline_system: fixture.baseline_system,
    public_headline: fixture.public_headline,
    worlds,
    metrics: {
      distinct_public_headline_signatures: unique(worlds.map(world => world.public_headline_signature_sha256)).length,
      distinct_successor_artifact_signatures: unique(worlds.map(world => world.successor_artifact_signature_sha256)).length,
      distinct_successor_metric_signatures: unique(worlds.map(world => world.successor_metric_signature_sha256)).length,
      distinct_successor_policy_signatures: unique(worlds.map(world => world.successor_policy_signature_sha256)).length,
      distinct_resolution_signatures: unique(worlds.map(world => world.resolution_signature_sha256)).length,
      exact_inheritance_worlds: worlds.filter(world => world.resolution.succession_state === 'exact_artifact_scope_inheritance').length,
      unvalidated_runtime_successor_worlds: worlds.filter(world => world.resolution.succession_state === 'blocked_unvalidated_runtime_successor').length,
      current_noncomparable_metric_worlds: worlds.filter(world => world.resolution.succession_state === 'current_metric_validated_noncomparable_to_baseline').length,
      policy_validation_required_worlds: worlds.filter(world => world.resolution.succession_state === 'predictive_validation_retained_policy_validation_required').length,
      revalidated_successor_worlds: worlds.filter(world => world.resolution.succession_state === 'validated_successor_bounded_scope').length,
      failed_revalidation_worlds: worlds.filter(world => world.resolution.rollback_required).length,
      current_predictive_claim_worlds: worlds.filter(world => world.resolution.current_predictive_claim_eligible).length,
      continuity_claim_worlds: worlds.filter(world => world.resolution.continuity_claim_eligible).length,
      deployment_allowed_worlds: worlds.filter(world => world.resolution.deployment_allowed).length,
      deployment_blocked_worlds: worlds.filter(world => !world.resolution.deployment_allowed).length,
      public_badge_unbound_worlds: worlds.filter(world => !world.resolution.public_badge_bound_to_current_predictive_artifact).length,
      shared_headline_but_deployment_blocked_worlds: worlds.filter(world => world.public_badge.score === fixture.public_headline.score && !world.resolution.deployment_allowed).length,
      rollback_required_worlds: worlds.filter(world => world.resolution.rollback_required).length
    },
    identification: {
      validation_scope: 'exact_artifact_metric_benchmark_policy_and_receipt',
      runtime_succession: 'requires_new_validation_when_runtime_identity_changes',
      metric_succession: 'requires_current_validation_and_comparability_crosswalk',
      policy_succession: 'requires_consequence_validation',
      failed_validation: 'negative_evidence_with_rollback_or_abstention',
      required_succession_evidence: fixture.required_succession_evidence
    },
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceSuccessionBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_SUCCESSION_BUILD_SCHEMA_VERSION) errors.push('preference succession build schema mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('succession build graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('succession build must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('succession fixture must not generate a real-world conclusion');
  if (compiled?.metrics?.distinct_public_headline_signatures !== 1) errors.push('succession fixture must preserve one public validation headline');
  if (compiled?.metrics?.distinct_successor_artifact_signatures !== 4) errors.push('succession fixture must preserve four runtime artifact identities');
  if (compiled?.metrics?.distinct_successor_metric_signatures !== 2) errors.push('succession fixture must preserve two metric identities');
  if (compiled?.metrics?.distinct_successor_policy_signatures !== 2) errors.push('succession fixture must preserve two policy identities');
  if (compiled?.metrics?.distinct_resolution_signatures !== 6) errors.push('succession fixture must preserve six distinct succession consequences');
  if (compiled?.metrics?.exact_inheritance_worlds !== 1) errors.push('succession fixture must preserve one exact inheritance world');
  if (compiled?.metrics?.unvalidated_runtime_successor_worlds !== 1) errors.push('succession fixture must preserve one unvalidated runtime successor');
  if (compiled?.metrics?.current_noncomparable_metric_worlds !== 1) errors.push('succession fixture must preserve one current but noncomparable metric world');
  if (compiled?.metrics?.policy_validation_required_worlds !== 1) errors.push('succession fixture must preserve one changed-policy validation gap');
  if (compiled?.metrics?.revalidated_successor_worlds !== 1) errors.push('succession fixture must preserve one fully revalidated successor');
  if (compiled?.metrics?.failed_revalidation_worlds !== 1) errors.push('succession fixture must preserve one failed revalidation');
  if (compiled?.metrics?.current_predictive_claim_worlds !== 4) errors.push('succession fixture must preserve four current predictive claim worlds');
  if (compiled?.metrics?.continuity_claim_worlds !== 2) errors.push('succession fixture must preserve two continuity claim worlds');
  if (compiled?.metrics?.deployment_allowed_worlds !== 3) errors.push('succession fixture must preserve three deployable worlds');
  if (compiled?.metrics?.deployment_blocked_worlds !== 3) errors.push('succession fixture must preserve three blocked worlds');
  if (compiled?.metrics?.public_badge_unbound_worlds !== 2) errors.push('succession fixture must preserve two unbound public badge worlds');
  if (compiled?.metrics?.shared_headline_but_deployment_blocked_worlds !== 3) errors.push('succession fixture must preserve three shared-headline blocked worlds');
  if (compiled?.metrics?.rollback_required_worlds !== 1) errors.push('succession fixture must preserve one rollback requirement');
  if (compiled?.classification?.prior_validation_transfers_across_runtime_change !== false) errors.push('fixture must refuse prior validation transfer across runtime change');
  if (compiled?.classification?.same_score_under_changed_metric_is_comparable !== false) errors.push('fixture must refuse same score as metric comparability');
  if (compiled?.classification?.predictive_validation_authorizes_changed_policy !== false) errors.push('fixture must refuse predictive validation as changed-policy authority');
  if (compiled?.classification?.revalidated_successor_can_carry_bounded_claim !== true) errors.push('fixture must preserve a bounded revalidated successor claim');
  if (compiled?.classification?.failed_revalidation_is_negative_evidence_not_missing_data !== true) errors.push('fixture must preserve failed revalidation as negative evidence');
  if (compiled?.classification?.public_badge_identifies_current_artifact !== false) errors.push('fixture must refuse public badge as current artifact identity');
  if (compiled?.classification?.preference_change_present !== false) errors.push('fixture must not claim preference change');
  if (compiled?.classification?.manipulative_intent_inferable !== false) errors.push('fixture must refuse intent inference');
  if (compiled?.classification?.real_world_effect_claimed !== false) errors.push('fixture must refuse real-world effect claims');
  if (compiled?.identification?.validation_scope !== 'exact_artifact_metric_benchmark_policy_and_receipt') errors.push('exact validation scope boundary is required');
  if (compiled?.identification?.policy_succession !== 'requires_consequence_validation') errors.push('policy consequence validation boundary is required');
  if (unique(compiled?.identification?.required_succession_evidence).length < 12) errors.push('succession evidence requirements are incomplete');

  for (const world of array(compiled?.worlds)) {
    errors.push(...validateSuccessionChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
    if (world?.resolution?.rollback_required && world?.resolution?.deployment_allowed) errors.push(`world ${world?.world_id} rollback cannot permit deployment`);
    if (world?.resolution?.continuity_claim_eligible && !world?.resolution?.current_predictive_claim_eligible) {
      errors.push(`world ${world?.world_id} continuity claim requires current predictive eligibility`);
    }
    if (world?.resolution?.deployment_allowed && !world?.resolution?.deployment_policy_claim_eligible) {
      errors.push(`world ${world?.world_id} deployment requires policy claim eligibility`);
    }
  }

  const mandatoryRules = [
    'validation_binds_exact_artifact_metric_policy_and_scope',
    'runtime_change_requires_revalidation',
    'prompt_retrieval_or_postprocess_change_requires_revalidation',
    'metric_change_requires_new_validation_and_comparability_crosswalk',
    'policy_change_requires_consequence_validation',
    'same_headline_is_not_same_measurement_or_scope',
    'old_badge_cannot_authorize_successor',
    'failed_revalidation_is_negative_evidence_not_missing_data',
    'rollback_or_abstention_preserves_failed_result',
    'publication_claim_requires_current_receipt_and_version'
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

export function renderPreferenceSuccessionMarkdown(compiled) {
  const lines = [
    '# Preference custody: model, metric, policy, and validation succession',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Shared public headline',
    '',
    `- Claim: ${compiled.public_headline.claim}`,
    `- Score: ${percentage(compiled.public_headline.score)}`,
    '',
    '## Succession worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Validation action: ${world.validation_action}`);
    lines.push(`- Artifact changed: ${world.resolution.artifact_changed}`);
    lines.push(`- Metric changed: ${world.resolution.metric_changed}`);
    lines.push(`- Policy changed: ${world.resolution.policy_changed}`);
    lines.push(`- Current predictive claim eligible: ${world.resolution.current_predictive_claim_eligible}`);
    lines.push(`- Continuity claim eligible: ${world.resolution.continuity_claim_eligible}`);
    lines.push(`- Metric comparable: ${world.resolution.metric_comparable}`);
    lines.push(`- Deployment-policy claim eligible: ${world.resolution.deployment_policy_claim_eligible}`);
    lines.push(`- Public badge bound to current predictive artifact: ${world.resolution.public_badge_bound_to_current_predictive_artifact}`);
    lines.push(`- Deployment allowed: ${world.resolution.deployment_allowed}`);
    lines.push(`- Rollback required: ${world.resolution.rollback_required}`);
    lines.push(`- Succession state: ${world.resolution.succession_state}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push(
    '## Identification result',
    '',
    '- Prior validation transfers across runtime change: false',
    '- Same score under a changed metric is comparable: false',
    '- Predictive validation authorizes a changed policy: false',
    '- Revalidated successor can carry a bounded claim: true',
    '- Failed revalidation is negative evidence, not missing data: true',
    '- Public badge identifies the current artifact: false',
    '- Preference change present: false',
    '- Manipulative intent inferable: false',
    '- Real-world effect claimed: false',
    '',
    '## Required succession evidence',
    ''
  );
  for (const item of compiled.identification.required_succession_evidence) lines.push(`- ${item}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
