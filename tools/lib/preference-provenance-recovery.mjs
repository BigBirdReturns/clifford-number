import { createHash } from 'node:crypto';

export const PREFERENCE_PROVENANCE_RECOVERY_FIXTURE_SCHEMA_VERSION = 'preference-provenance-recovery-fixture@1';
export const PREFERENCE_PROVENANCE_RECOVERY_BUILD_SCHEMA_VERSION = 'preference-provenance-recovery-build@1';

const OPTIONS = ['A', 'B'];
const EXPECTED_WORLD_IDS = [
  'clean-authenticated-current-evidence',
  'compromised-signer-revocation-replay',
  'detected-attack-no-clean-recovery-abstention',
  'hash-valid-stale-replay-refreshed',
  'poisoned-source-postdecision-rollback-replay',
  'retrieval-injection-context-recovery',
  'silent-undetected-wrong-version',
  'source-spoofing-predecision-contained'
];
const ATTACK_VECTORS = new Set([
  'none',
  'source_spoofing',
  'data_poisoning',
  'retrieval_or_prompt_injection',
  'stale_replay',
  'credential_compromise',
  'source_corruption_and_clean_source_loss',
  'silent_authorized_surface_substitution'
]);
const TRUST_STATES = new Set(['trusted', 'untrusted', 'compromised', 'revoked']);
const FRESHNESS_STATES = new Set(['current', 'stale', 'unknown']);
const INTEGRITY_STATES = new Set(['verified', 'poisoned', 'tampered', 'unknown']);
const LINEAGE_STATES = new Set(['complete', 'broken', 'spoofed']);
const DETECTION_TIMINGS = new Set(['none', 'pre_decision', 'post_decision']);
const RESIDUAL_STATES = new Set(['none', 'bounded', 'material']);
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

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
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

function validSha(value) {
  return /^[0-9a-f]{64}$/.test(text(value));
}

function validTimestamp(value) {
  return text(value) && Number.isFinite(Date.parse(value));
}

function validateCounts(counts, label, expectedTotal, errors) {
  const value = object(counts);
  if (!sameMembers(Object.keys(value), OPTIONS)) {
    errors.push(`${label} must contain exactly A and B`);
    return;
  }
  for (const option of OPTIONS) {
    if (!Number.isInteger(value[option]) || value[option] < 0) errors.push(`${label}.${option} must be a non-negative integer`);
  }
  if (sum(Object.values(value)) !== expectedTotal) errors.push(`${label} must sum to ${expectedTotal}`);
}

function expectedClassification() {
  return {
    valid_hash_proves_current_semantic_validity: false,
    valid_signature_proves_uncompromised_signer_and_authorized_content: false,
    correct_final_result_proves_clean_execution_path: false,
    attack_detection_proves_successful_recovery: false,
    quarantine_is_rollback: false,
    rollback_is_deterministic_clean_replay: false,
    replay_success_proves_no_transient_exposure_or_residual_harm: false,
    eventual_correction_proves_no_prior_consequence: false,
    unchanged_public_headline_proves_same_exact_proposal_or_implementation_state: false,
    missing_detector_alert_proves_clean_provenance: false,
    bounded_predecision_containment_supported: true,
    bounded_postdecision_recovery_supported: true,
    safe_abstention_supported: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

export function validatePreferenceProvenanceRecoveryFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const proposals = array(baseline.proposal_registry);
  const artifacts = array(baseline.artifact_registry);
  const anchors = array(baseline.trust_anchor_registry);
  const signers = array(baseline.signer_registry);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_PROVENANCE_RECOVERY_FIXTURE_SCHEMA_VERSION) errors.push('preference provenance-recovery fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');

  if (!Number.isInteger(baseline.population_total) || baseline.population_total <= 0) errors.push('baseline population_total must be a positive integer');
  validateCounts(baseline.public_family_counts, 'baseline public_family_counts', baseline.population_total, errors);
  if (!text(baseline.current_evidence_packet_id) || !text(baseline.current_epoch) || !text(baseline.current_trust_anchor_id) || !text(baseline.clean_checkpoint_id)) errors.push('baseline current evidence, epoch, trust anchor, and checkpoint are required');
  const lineage = object(baseline.clean_runtime_lineage);
  for (const key of ['model_id', 'retrieval_id', 'prompt_id', 'toolchain_id', 'metric_id', 'policy_id']) if (!text(lineage[key])) errors.push(`baseline clean_runtime_lineage.${key} is required`);

  if (!sameMembers(proposals.map(proposal => proposal?.proposal_id), ['A0', 'A1', 'B0'])) errors.push('proposal registry must contain exactly A0, A1, and B0');
  const proposalById = Object.fromEntries(proposals.map(proposal => [proposal.proposal_id, proposal]));
  for (const proposal of proposals) {
    if (!OPTIONS.includes(proposal?.family) || !Number.isInteger(proposal?.version) || proposal.version < 0 || typeof proposal?.reference_correct !== 'boolean' || !array(proposal?.terms).length) errors.push(`proposal ${proposal?.proposal_id} is incomplete`);
  }
  if (baseline.reference_proposal_id !== 'A1' || proposalById.A1?.reference_correct !== true || proposalById.A0?.reference_correct !== false) errors.push('baseline reference proposal contract must preserve A1 as correct and A0 as incorrect');

  const artifactIds = artifacts.map(artifact => text(artifact?.artifact_id));
  if (unique(artifactIds).length !== artifacts.length || artifacts.length < 8) errors.push('artifact registry must preserve unique attack and recovery artifacts');
  const artifactById = Object.fromEntries(artifacts.map(artifact => [artifact.artifact_id, artifact]));
  for (const artifact of artifacts) {
    if (!text(artifact?.artifact_id) || !text(artifact?.artifact_type) || !validSha(artifact?.registered_sha256) || !text(artifact?.semantic_epoch)) errors.push(`artifact ${artifact?.artifact_id} registry entry is incomplete`);
  }
  if (!artifactById[baseline.current_evidence_packet_id]) errors.push('baseline current evidence packet is absent from artifact registry');

  const anchorIds = anchors.map(anchor => text(anchor?.trust_anchor_id));
  if (unique(anchorIds).length !== anchors.length || !anchorIds.includes('TRUST-ROOT-V2') || !anchorIds.includes('TRUST-ROOT-V3')) errors.push('trust-anchor registry is incomplete');
  const anchorById = Object.fromEntries(anchors.map(anchor => [anchor.trust_anchor_id, anchor]));
  for (const anchor of anchors) if (!text(anchor?.status) || (anchor?.predecessor_id !== null && !anchorById[anchor.predecessor_id])) errors.push(`trust anchor ${anchor?.trust_anchor_id} is incomplete`);
  if (!anchorById[baseline.current_trust_anchor_id]) errors.push('baseline current trust anchor is absent from registry');

  const signerIds = signers.map(signer => text(signer?.signer_id));
  if (unique(signerIds).length !== signers.length || signers.length < 4) errors.push('signer registry is incomplete');
  const signerById = Object.fromEntries(signers.map(signer => [signer.signer_id, signer]));
  for (const signer of signers) {
    if (!TRUST_STATES.has(signer?.baseline_trust_state) || !anchorById[signer?.trust_anchor_id]) errors.push(`signer ${signer?.signer_id} registry entry is incomplete`);
  }

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required provenance-recovery worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');

  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    const attack = object(world?.attack);
    const artifactStates = array(world?.artifact_states);
    const execution = object(world?.execution);
    const detection = object(world?.detection);
    const quarantine = object(world?.quarantine);
    const rollback = object(world?.rollback);
    const recovery = object(world?.recovery);
    const trustAction = object(world?.trust_action);
    const publication = object(world?.publication);
    const finalState = object(world?.final_state);

    if (typeof attack.present !== 'boolean' || !ATTACK_VECTORS.has(attack.vector) || !text(attack.entry_point) || !text(attack.target)) errors.push(`world ${worldId} attack custody is incomplete`);
    if (attack.present) {
      if (!text(attack.attack_id) || attack.vector === 'none' || !artifactById[attack.first_affected_artifact_id]) errors.push(`world ${worldId} attack identity or target artifact is incomplete`);
    } else if (attack.attack_id !== null || attack.vector !== 'none' || attack.first_affected_artifact_id !== null) {
      errors.push(`world ${worldId} clean execution must preserve an explicit no-attack state`);
    }

    if (!artifactStates.length) errors.push(`world ${worldId} requires artifact states`);
    const stateIds = artifactStates.map(state => text(state?.artifact_id));
    if (unique(stateIds).length !== artifactStates.length) errors.push(`world ${worldId} artifact-state IDs must be unique`);
    for (const state of artifactStates) {
      const registry = artifactById[state?.artifact_id];
      if (!registry) errors.push(`world ${worldId} references unknown artifact ${state?.artifact_id}`);
      if (!validSha(state?.observed_sha256) || typeof state?.hash_matches_registry !== 'boolean' || typeof state?.signature_valid !== 'boolean') errors.push(`world ${worldId} artifact ${state?.artifact_id} cryptographic state is incomplete`);
      if (registry && state.hash_matches_registry !== (state.observed_sha256 === registry.registered_sha256)) errors.push(`world ${worldId} artifact ${state?.artifact_id} hash-match state is inconsistent`);
      if (!signerById[state?.signer_id] || !TRUST_STATES.has(state?.signer_trust_state) || !anchorById[state?.trust_anchor_id]) errors.push(`world ${worldId} artifact ${state?.artifact_id} signer or trust state is incomplete`);
      if (!FRESHNESS_STATES.has(state?.freshness_state) || !text(state?.semantic_epoch) || typeof state?.authorized_for_current_epoch !== 'boolean') errors.push(`world ${worldId} artifact ${state?.artifact_id} semantic state is incomplete`);
      if (!INTEGRITY_STATES.has(state?.integrity_state) || !LINEAGE_STATES.has(state?.lineage_state)) errors.push(`world ${worldId} artifact ${state?.artifact_id} integrity or lineage state is invalid`);
    }
    if (attack.present && !stateIds.includes(attack.first_affected_artifact_id)) errors.push(`world ${worldId} first affected artifact lacks an observed state`);

    if (!artifactById[execution.initial_packet_id] || !artifactById[execution.initial_context_id] || !text(execution.checkpoint_id)) errors.push(`world ${worldId} execution inputs are incomplete`);
    if (execution.initial_proposal_id !== null && !proposalById[execution.initial_proposal_id]) errors.push(`world ${worldId} initial proposal is unknown`);
    if (typeof execution.decision_committed !== 'boolean' || typeof execution.implementation_started !== 'boolean') errors.push(`world ${worldId} execution state must be boolean`);
    if (execution.decision_committed && !execution.initial_proposal_id) errors.push(`world ${worldId} committed decision requires an initial proposal`);
    if (!execution.decision_committed && execution.initial_proposal_id !== null) errors.push(`world ${worldId} uncommitted execution must not preserve an initial proposal`);
    if (execution.implementation_started && !execution.decision_committed) errors.push(`world ${worldId} implementation cannot precede a committed decision`);

    if (typeof detection.detected !== 'boolean' || !DETECTION_TIMINGS.has(detection.timing) || !Number.isFinite(Number(detection.confidence)) || detection.confidence < 0 || detection.confidence > 1) errors.push(`world ${worldId} detection state is invalid`);
    if (detection.detected) {
      if (!text(detection.detector_id) || !text(detection.detector_version) || !text(detection.signal) || detection.timing === 'none' || !validTimestamp(detection.timestamp) || detection.confidence <= 0) errors.push(`world ${worldId} detected attack lacks detector, timing, or timestamp custody`);
      if (!attack.present) errors.push(`world ${worldId} cannot detect an absent attack`);
    } else if (detection.timing !== 'none' || detection.timestamp !== null) {
      errors.push(`world ${worldId} undetected state must preserve no detection timing or timestamp`);
    }

    if (typeof quarantine.triggered !== 'boolean' || !Array.isArray(quarantine.artifact_ids) || typeof quarantine.forensic_snapshot_preserved !== 'boolean') errors.push(`world ${worldId} quarantine state is incomplete`);
    for (const artifactId of array(quarantine.artifact_ids)) if (!stateIds.includes(artifactId)) errors.push(`world ${worldId} quarantines unobserved artifact ${artifactId}`);
    if (quarantine.triggered) {
      if (!detection.detected || !quarantine.artifact_ids.length || !quarantine.forensic_snapshot_preserved || !validTimestamp(quarantine.timestamp)) errors.push(`world ${worldId} triggered quarantine lacks detection, scope, forensic snapshot, or timestamp`);
    } else if (quarantine.artifact_ids.length || quarantine.forensic_snapshot_preserved || quarantine.timestamp !== null) {
      errors.push(`world ${worldId} inactive quarantine must preserve empty scope and null timestamp`);
    }

    if (typeof rollback.triggered !== 'boolean' || typeof rollback.initial_proposal_reverted !== 'boolean') errors.push(`world ${worldId} rollback state is incomplete`);
    if (rollback.triggered) {
      if (!detection.detected || detection.timing !== 'post_decision' || !text(rollback.from_checkpoint_id) || !text(rollback.to_checkpoint_id) || !rollback.initial_proposal_reverted || !validTimestamp(rollback.timestamp)) errors.push(`world ${worldId} rollback lacks postdecision detection, checkpoint, proposal, or timestamp custody`);
    } else if (rollback.from_checkpoint_id !== null || rollback.to_checkpoint_id !== null || rollback.initial_proposal_reverted || rollback.timestamp !== null) {
      errors.push(`world ${worldId} inactive rollback must preserve null checkpoint and timestamp state`);
    }

    if (typeof recovery.clean_source_available !== 'boolean' || typeof recovery.replay_attempted !== 'boolean' || !Array.isArray(recovery.replay_inputs) || !text(recovery.recovery_state)) errors.push(`world ${worldId} recovery state is incomplete`);
    if (recovery.replay_attempted) {
      if (!recovery.clean_source_available || !recovery.replay_inputs.length || typeof recovery.deterministic !== 'boolean' || typeof recovery.validation_passed !== 'boolean' || !proposalById[recovery.recovered_proposal_id]) errors.push(`world ${worldId} replay lacks clean source, inputs, determinism, validation, or proposal custody`);
    } else if (recovery.replay_inputs.length || recovery.deterministic !== null || recovery.validation_passed !== null || recovery.recovered_proposal_id !== null) {
      errors.push(`world ${worldId} non-replay state must preserve null replay result fields`);
    }

    if (typeof trustAction.revocation_required !== 'boolean' || !Array.isArray(trustAction.revoked_signer_ids) || !anchorById[trustAction.trust_anchor_before] || !anchorById[trustAction.trust_anchor_after]) errors.push(`world ${worldId} trust action is incomplete`);
    for (const signerId of array(trustAction.revoked_signer_ids)) if (!signerById[signerId]) errors.push(`world ${worldId} revokes unknown signer ${signerId}`);
    if (trustAction.revoked_signer_ids.length && !trustAction.revocation_required) errors.push(`world ${worldId} signer revocation requires revocation_required`);
    if (trustAction.trust_anchor_before !== trustAction.trust_anchor_after && (!trustAction.revocation_required || !text(trustAction.rotation_receipt_id))) errors.push(`world ${worldId} trust-anchor rotation lacks revocation and receipt`);
    if (trustAction.trust_anchor_before === trustAction.trust_anchor_after && trustAction.rotation_receipt_id !== null) errors.push(`world ${worldId} unchanged trust anchor must not emit a rotation receipt`);

    validateCounts(publication.family_counts, `world ${worldId} publication family_counts`, baseline.population_total, errors);
    if (JSON.stringify(publication.family_counts) !== JSON.stringify(baseline.public_family_counts)) errors.push(`world ${worldId} must preserve the frozen public family headline`);
    if (publication.published_exact_proposal_id !== null && !proposalById[publication.published_exact_proposal_id]) errors.push(`world ${worldId} publication exact proposal is unknown`);
    for (const key of ['correction_required', 'correction_issued', 'notification_required', 'notification_issued']) if (typeof publication[key] !== 'boolean') errors.push(`world ${worldId} publication.${key} must be boolean`);
    if (publication.correction_issued && !publication.correction_required) errors.push(`world ${worldId} cannot issue an unrequired correction`);
    if (publication.notification_issued && !publication.notification_required) errors.push(`world ${worldId} cannot issue an unrequired notification`);

    if (finalState.final_proposal_id !== null && !proposalById[finalState.final_proposal_id]) errors.push(`world ${worldId} final proposal is unknown`);
    if (!text(finalState.implementation_state) || typeof finalState.reference_correct !== 'boolean' || typeof finalState.transient_exposure !== 'boolean' || !RESIDUAL_STATES.has(finalState.residual_uncertainty)) errors.push(`world ${worldId} final state is incomplete`);
    const computedReference = finalState.final_proposal_id !== null && proposalById[finalState.final_proposal_id]?.reference_correct === true;
    if (finalState.reference_correct !== computedReference) errors.push(`world ${worldId} reference-correct state is inconsistent with final proposal`);

    if (!text(world?.expected_mechanism)) errors.push(`world ${worldId} expected_mechanism is required`);
    for (const key of [
      'expected_cryptographically_valid_but_provenance_invalid',
      'expected_predecision_containment',
      'expected_postdecision_rollback',
      'expected_successful_clean_replay',
      'expected_safe_abstention',
      'expected_wrong_version_active'
    ]) if (typeof world?.[key] !== 'boolean') errors.push(`world ${worldId} ${key} must be boolean`);
  }

  const requiredMetrics = {
    world_count: 8,
    distinct_public_headline_signatures: 1,
    distinct_final_disposition_signatures: 3,
    distinct_attack_recovery_signatures: 8,
    clean_execution_worlds: 1,
    attack_present_worlds: 7,
    detected_attack_worlds: 6,
    undetected_attack_worlds: 1,
    predecision_detection_worlds: 3,
    postdecision_detection_worlds: 3,
    predecision_containment_worlds: 2,
    postdecision_rollback_worlds: 3,
    successful_clean_replay_worlds: 5,
    detected_but_unrecoverable_worlds: 1,
    safe_abstention_worlds: 1,
    wrong_version_active_worlds: 1,
    reference_correct_final_worlds: 6,
    cryptographically_valid_but_provenance_invalid_worlds: 5,
    trust_anchor_rotation_worlds: 1,
    quarantine_worlds: 6,
    forensic_snapshot_worlds: 6,
    rollback_worlds: 3,
    correction_required_worlds: 3,
    correction_issued_worlds: 3,
    transient_exposure_worlds: 3,
    residual_uncertainty_worlds: 4,
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(requiredMetrics)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const mandatoryRules = [
    'valid_hash_is_not_current_or_semantically_valid_evidence',
    'valid_signature_is_not_uncompromised_signer_or_authorized_content',
    'correct_final_result_is_not_clean_execution_path',
    'attack_detection_is_not_successful_recovery',
    'quarantine_is_not_rollback',
    'rollback_is_not_deterministic_clean_replay',
    'replay_success_is_not_absence_of_transient_exposure_or_residual_harm',
    'eventual_correction_is_not_no_prior_consequence',
    'unchanged_public_headline_is_not_unchanged_exact_proposal_or_implementation_state',
    'missing_detector_alert_is_not_clean_provenance',
    'provenance_recovery_claim_requires_artifact_trust_freshness_detection_quarantine_rollback_replay_correction_consequence_uncertainty_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceProvenanceRecoveryWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const proposalById = Object.fromEntries(array(baseline.proposal_registry).map(proposal => [proposal.proposal_id, proposal]));
  const states = array(world.artifact_states);
  const allCryptoChecksPass = states.every(state => state.hash_matches_registry === true && state.signature_valid === true);
  const provenanceInvalid = states.some(state => (
    state.signer_trust_state !== 'trusted'
    || state.freshness_state !== 'current'
    || state.semantic_epoch !== baseline.current_epoch
    || state.authorized_for_current_epoch !== true
    || state.integrity_state !== 'verified'
    || state.lineage_state !== 'complete'
  ));
  const cryptographicallyValidButProvenanceInvalid = allCryptoChecksPass && provenanceInvalid;
  const successfulCleanReplay = world.recovery.replay_attempted === true
    && world.recovery.clean_source_available === true
    && world.recovery.deterministic === true
    && world.recovery.validation_passed === true
    && world.recovery.recovered_proposal_id === baseline.reference_proposal_id;
  const predecisionContainment = world.attack.present === true
    && world.detection.detected === true
    && world.detection.timing === 'pre_decision'
    && world.quarantine.triggered === true
    && world.execution.decision_committed === false
    && successfulCleanReplay;
  const postdecisionRollback = world.attack.present === true
    && world.detection.detected === true
    && world.detection.timing === 'post_decision'
    && world.rollback.triggered === true;
  const detectedButUnrecoverable = world.attack.present === true
    && world.detection.detected === true
    && !successfulCleanReplay
    && world.recovery.clean_source_available === false;
  const safeAbstention = world.final_state.final_proposal_id === null
    && world.final_state.implementation_state === 'blocked_abstention'
    && detectedButUnrecoverable;
  const wrongVersionActive = world.final_state.final_proposal_id === 'A0'
    && world.final_state.implementation_state === 'wrong_version_active';
  const trustAnchorRotated = world.trust_action.trust_anchor_before !== world.trust_action.trust_anchor_after;
  const finalDisposition = {
    final_proposal_id: world.final_state.final_proposal_id,
    reference_correct: world.final_state.reference_correct,
    implementation_class: world.final_state.final_proposal_id === baseline.reference_proposal_id
      ? 'reference_correct'
      : world.final_state.final_proposal_id === null
        ? 'abstention'
        : 'wrong_version_active'
  };
  const attackRecoveryState = {
    attack: world.attack,
    detection: world.detection,
    quarantine: world.quarantine,
    rollback: world.rollback,
    recovery: world.recovery,
    trust_action: world.trust_action,
    publication: world.publication,
    final_state: world.final_state,
    cryptographically_valid_but_provenance_invalid: cryptographicallyValidButProvenanceInvalid
  };

  return {
    world_id: world.world_id,
    mechanism: world.expected_mechanism,
    attack: world.attack,
    artifact_states: world.artifact_states,
    execution: world.execution,
    detection: world.detection,
    quarantine: world.quarantine,
    rollback: world.rollback,
    recovery: world.recovery,
    trust_action: world.trust_action,
    publication: world.publication,
    final_state: world.final_state,
    all_cryptographic_checks_pass: allCryptoChecksPass,
    provenance_invalid: provenanceInvalid,
    cryptographically_valid_but_provenance_invalid: cryptographicallyValidButProvenanceInvalid,
    predecision_containment: predecisionContainment,
    postdecision_rollback: postdecisionRollback,
    successful_clean_replay: successfulCleanReplay,
    detected_but_unrecoverable: detectedButUnrecoverable,
    safe_abstention: safeAbstention,
    wrong_version_active: wrongVersionActive,
    trust_anchor_rotated: trustAnchorRotated,
    reference_correct_final: world.final_state.reference_correct === true,
    public_headline_signature_sha256: sha256(world.publication.family_counts),
    final_disposition_signature_sha256: sha256(finalDisposition),
    attack_recovery_signature_sha256: sha256(attackRecoveryState),
    reference_proposal: proposalById[baseline.reference_proposal_id]
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildProvenanceChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'baseline_reference_artifact_trust_and_runtime_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:attack`,
    event_type: 'attack_entry_and_first_affected_artifact_recorded',
    evidence_class: 'synthetic_control_attack_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: result.attack
  });
  push({
    event_id: `${result.world_id}:artifacts`,
    event_type: 'artifact_hash_signature_trust_freshness_integrity_and_lineage_recorded',
    evidence_class: 'synthetic_control_provenance',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:attack`],
    payload: {
      artifact_states: result.artifact_states,
      all_cryptographic_checks_pass: result.all_cryptographic_checks_pass,
      provenance_invalid: result.provenance_invalid,
      cryptographically_valid_but_provenance_invalid: result.cryptographically_valid_but_provenance_invalid
    }
  });
  push({
    event_id: `${result.world_id}:detection`,
    event_type: 'detector_signal_timing_and_confidence_recorded',
    evidence_class: 'synthetic_control_detection',
    authority: 'fixture_detector',
    source_event_ids: [`${result.world_id}:artifacts`],
    payload: result.detection
  });
  push({
    event_id: `${result.world_id}:quarantine`,
    event_type: 'quarantine_scope_and_forensic_snapshot_recorded',
    evidence_class: 'synthetic_control_containment',
    authority: 'fixture_operator',
    source_event_ids: [`${result.world_id}:detection`],
    payload: result.quarantine
  });
  push({
    event_id: `${result.world_id}:recovery`,
    event_type: 'rollback_replay_validation_and_trust_succession_recorded',
    evidence_class: 'synthetic_control_recovery',
    authority: 'fixture_operator',
    source_event_ids: [`${result.world_id}:quarantine`],
    payload: {
      execution: result.execution,
      rollback: result.rollback,
      recovery: result.recovery,
      trust_action: result.trust_action,
      predecision_containment: result.predecision_containment,
      postdecision_rollback: result.postdecision_rollback,
      successful_clean_replay: result.successful_clean_replay,
      detected_but_unrecoverable: result.detected_but_unrecoverable
    }
  });
  push({
    event_id: `${result.world_id}:publication`,
    event_type: 'publication_correction_notification_and_final_consequence_recorded',
    evidence_class: 'synthetic_control_consequence',
    authority: 'fixture_institution',
    source_event_ids: [`${result.world_id}:recovery`],
    payload: {
      publication: result.publication,
      final_state: result.final_state,
      safe_abstention: result.safe_abstention,
      wrong_version_active: result.wrong_version_active
    }
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'provenance_attack_and_recovery_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'provenance_recovery_compiler',
    source_event_ids: [`${result.world_id}:publication`],
    payload: {
      mechanism: result.mechanism,
      reference_correct_final: result.reference_correct_final,
      trust_anchor_rotated: result.trust_anchor_rotated,
      residual_uncertainty: result.final_state.residual_uncertainty
    }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'provenance_recovery_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic provenance attack, containment, recovery, abstention, or undetected failure behind one public family headline',
      refused_promotions: [
        'valid_hash_as_current_semantic_validity',
        'valid_signature_as_signer_trust',
        'correct_result_as_clean_path',
        'detection_as_recovery',
        'quarantine_as_rollback',
        'rollback_as_clean_replay',
        'replay_as_no_prior_exposure',
        'correction_as_no_prior_consequence',
        'headline_stability_as_exact_state_stability',
        'no_alert_as_clean_provenance'
      ]
    }
  });
  return events;
}

export function validatePreferenceProvenanceRecoveryChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('provenance-recovery event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate provenance-recovery event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`provenance-recovery event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`provenance-recovery event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`provenance-recovery event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceProvenanceRecoveryFixture(fixture) {
  const errors = validatePreferenceProvenanceRecoveryFixture(fixture);
  if (errors.length) throw new Error(`invalid preference provenance-recovery fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceProvenanceRecoveryWorld(fixture, world);
    const expectations = {
      cryptographically_valid_but_provenance_invalid: 'expected_cryptographically_valid_but_provenance_invalid',
      predecision_containment: 'expected_predecision_containment',
      postdecision_rollback: 'expected_postdecision_rollback',
      successful_clean_replay: 'expected_successful_clean_replay',
      safe_abstention: 'expected_safe_abstention',
      wrong_version_active: 'expected_wrong_version_active'
    };
    for (const [observed, expected] of Object.entries(expectations)) if (result[observed] !== world[expected]) throw new Error(`world ${world.world_id} ${observed} mismatch`);
    if (result.successful_clean_replay && world.final_state.final_proposal_id !== fixture.baseline.reference_proposal_id) throw new Error(`world ${world.world_id} successful replay must end at reference proposal`);
    if (world.recovery.replay_attempted && world.recovery.recovered_proposal_id !== world.final_state.final_proposal_id) throw new Error(`world ${world.world_id} recovered and final proposal mismatch`);
    if (!world.recovery.replay_attempted && world.recovery.recovery_state === 'no_recovery_needed' && world.execution.initial_proposal_id !== world.final_state.final_proposal_id) throw new Error(`world ${world.world_id} clean initial and final proposal mismatch`);
    if (world.recovery.recovery_state === 'undetected_unrecovered' && world.execution.initial_proposal_id !== world.final_state.final_proposal_id) throw new Error(`world ${world.world_id} undetected initial and final proposal mismatch`);
    if (world.publication.published_exact_proposal_id !== world.final_state.final_proposal_id) throw new Error(`world ${world.world_id} published and final exact proposal mismatch`);
    const chain = buildProvenanceChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const metrics = {
    world_count: worlds.length,
    distinct_public_headline_signatures: unique(worlds.map(world => world.public_headline_signature_sha256)).length,
    distinct_final_disposition_signatures: unique(worlds.map(world => world.final_disposition_signature_sha256)).length,
    distinct_attack_recovery_signatures: unique(worlds.map(world => world.attack_recovery_signature_sha256)).length,
    clean_execution_worlds: worlds.filter(world => !world.attack.present).length,
    attack_present_worlds: worlds.filter(world => world.attack.present).length,
    detected_attack_worlds: worlds.filter(world => world.attack.present && world.detection.detected).length,
    undetected_attack_worlds: worlds.filter(world => world.attack.present && !world.detection.detected).length,
    predecision_detection_worlds: worlds.filter(world => world.detection.timing === 'pre_decision').length,
    postdecision_detection_worlds: worlds.filter(world => world.detection.timing === 'post_decision').length,
    predecision_containment_worlds: worlds.filter(world => world.predecision_containment).length,
    postdecision_rollback_worlds: worlds.filter(world => world.postdecision_rollback).length,
    successful_clean_replay_worlds: worlds.filter(world => world.successful_clean_replay).length,
    detected_but_unrecoverable_worlds: worlds.filter(world => world.detected_but_unrecoverable).length,
    safe_abstention_worlds: worlds.filter(world => world.safe_abstention).length,
    wrong_version_active_worlds: worlds.filter(world => world.wrong_version_active).length,
    reference_correct_final_worlds: worlds.filter(world => world.reference_correct_final).length,
    cryptographically_valid_but_provenance_invalid_worlds: worlds.filter(world => world.cryptographically_valid_but_provenance_invalid).length,
    trust_anchor_rotation_worlds: worlds.filter(world => world.trust_anchor_rotated).length,
    quarantine_worlds: worlds.filter(world => world.quarantine.triggered).length,
    forensic_snapshot_worlds: worlds.filter(world => world.quarantine.forensic_snapshot_preserved).length,
    rollback_worlds: worlds.filter(world => world.rollback.triggered).length,
    correction_required_worlds: worlds.filter(world => world.publication.correction_required).length,
    correction_issued_worlds: worlds.filter(world => world.publication.correction_issued).length,
    transient_exposure_worlds: worlds.filter(world => world.final_state.transient_exposure).length,
    residual_uncertainty_worlds: worlds.filter(world => world.final_state.residual_uncertainty !== 'none').length,
    binding_public_authority_worlds: 0,
    public_A_share: Number(fixture.baseline.public_family_counts.A) / Number(fixture.baseline.population_total)
  };
  for (const [key, value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_PROVENANCE_RECOVERY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'provenance_attack_and_recovery_equifinality_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: { ...fixture.expected_classification, preference_change_present: false },
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceProvenanceRecoveryBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_PROVENANCE_RECOVERY_BUILD_SCHEMA_VERSION) errors.push('preference provenance-recovery build schema mismatch');
  if (compiled?.status !== 'provenance_attack_and_recovery_equifinality_qualified') errors.push('compiled provenance-recovery status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled provenance-recovery graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled provenance-recovery must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled provenance-recovery must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled provenance-recovery real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled provenance-recovery worlds are incomplete');

  const expectedMetrics = {
    world_count: 8,
    distinct_public_headline_signatures: 1,
    distinct_final_disposition_signatures: 3,
    distinct_attack_recovery_signatures: 8,
    clean_execution_worlds: 1,
    attack_present_worlds: 7,
    detected_attack_worlds: 6,
    undetected_attack_worlds: 1,
    predecision_detection_worlds: 3,
    postdecision_detection_worlds: 3,
    predecision_containment_worlds: 2,
    postdecision_rollback_worlds: 3,
    successful_clean_replay_worlds: 5,
    detected_but_unrecoverable_worlds: 1,
    safe_abstention_worlds: 1,
    wrong_version_active_worlds: 1,
    reference_correct_final_worlds: 6,
    cryptographically_valid_but_provenance_invalid_worlds: 5,
    trust_anchor_rotation_worlds: 1,
    quarantine_worlds: 6,
    forensic_snapshot_worlds: 6,
    rollback_worlds: 3,
    correction_required_worlds: 3,
    correction_issued_worlds: 3,
    transient_exposure_worlds: 3,
    residual_uncertainty_worlds: 4,
    binding_public_authority_worlds: 0,
    public_A_share: 0.8
  };
  for (const [key, value] of Object.entries(expectedMetrics)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled fixture must not claim real-world preference change');

  for (const world of array(compiled?.worlds)) {
    if (!close(Number(world?.publication?.family_counts?.A) / 1000, 0.8)) errors.push(`world ${world?.world_id} must preserve the frozen public 80/20 headline`);
    for (const field of ['public_headline_signature_sha256', 'final_disposition_signature_sha256', 'attack_recovery_signature_sha256']) if (!validSha(world?.[field])) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceProvenanceRecoveryChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['clean-authenticated-current-evidence']?.attack?.present !== false || byId['clean-authenticated-current-evidence']?.reference_correct_final !== true) errors.push('clean world must preserve one clean reference-correct execution');
  if (byId['source-spoofing-predecision-contained']?.predecision_containment !== true) errors.push('source-spoofing world must preserve predecision containment');
  if (byId['hash-valid-stale-replay-refreshed']?.cryptographically_valid_but_provenance_invalid !== true) errors.push('stale world must preserve hash-valid semantic invalidity');
  if (byId['poisoned-source-postdecision-rollback-replay']?.postdecision_rollback !== true || byId['poisoned-source-postdecision-rollback-replay']?.successful_clean_replay !== true) errors.push('poison world must preserve postdecision rollback and clean replay');
  if (byId['retrieval-injection-context-recovery']?.postdecision_rollback !== true) errors.push('retrieval world must preserve postdecision rollback');
  if (byId['compromised-signer-revocation-replay']?.trust_anchor_rotated !== true) errors.push('credential world must preserve trust-anchor rotation');
  if (byId['detected-attack-no-clean-recovery-abstention']?.safe_abstention !== true) errors.push('unrecoverable world must preserve safe abstention');
  if (byId['silent-undetected-wrong-version']?.wrong_version_active !== true || byId['silent-undetected-wrong-version']?.detection?.detected !== false) errors.push('silent world must preserve undetected wrong-version activation');
  if (unique(compiled?.refusal_rules).length < 11) errors.push('compiled provenance-recovery refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled provenance-recovery caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceProvenanceRecoveryMarkdown(compiled) {
  const lines = [
    '# Provenance attack, quarantine, rollback, and recovery custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Public headline signatures:** ${compiled.metrics.distinct_public_headline_signatures}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen reference state',
    '',
    `- Public A share: ${percentage(compiled.metrics.public_A_share)}`,
    `- Reference proposal: ${compiled.baseline.reference_proposal_id}`,
    `- Current evidence packet: ${compiled.baseline.current_evidence_packet_id}`,
    `- Current epoch: ${compiled.baseline.current_epoch}`,
    `- Current trust anchor: ${compiled.baseline.current_trust_anchor_id}`,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Attack present: ${world.attack.present}`);
    lines.push(`- Vector: ${world.attack.vector}`);
    lines.push(`- Detection: ${world.detection.detected} (${world.detection.timing})`);
    lines.push(`- Quarantine: ${world.quarantine.triggered}`);
    lines.push(`- Forensic snapshot: ${world.quarantine.forensic_snapshot_preserved}`);
    lines.push(`- Rollback: ${world.rollback.triggered}`);
    lines.push(`- Clean replay: ${world.successful_clean_replay}`);
    lines.push(`- Cryptographically valid but provenance invalid: ${world.cryptographically_valid_but_provenance_invalid}`);
    lines.push(`- Trust anchor rotated: ${world.trust_anchor_rotated}`);
    lines.push(`- Final proposal: ${world.final_state.final_proposal_id ?? 'none'}`);
    lines.push(`- Implementation state: ${world.final_state.implementation_state}`);
    lines.push(`- Reference correct: ${world.reference_correct_final}`);
    lines.push(`- Correction required: ${world.publication.correction_required}`);
    lines.push(`- Correction issued: ${world.publication.correction_issued}`);
    lines.push(`- Transient exposure: ${world.final_state.transient_exposure}`);
    lines.push(`- Residual uncertainty: ${world.final_state.residual_uncertainty}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) {
    const rendered = typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value;
    lines.push(`- ${key}: ${rendered}`);
  }
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
