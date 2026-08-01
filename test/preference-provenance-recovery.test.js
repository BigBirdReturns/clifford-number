import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceProvenanceRecoveryFixture,
  renderPreferenceProvenanceRecoveryMarkdown,
  simulatePreferenceProvenanceRecoveryWorld,
  validatePreferenceProvenanceRecoveryBuild,
  validatePreferenceProvenanceRecoveryChain,
  validatePreferenceProvenanceRecoveryFixture
} from '../tools/lib/preference-provenance-recovery.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/provenance-recovery.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceProvenanceRecoveryFixture(fixture), []);

const compiled = compilePreferenceProvenanceRecoveryFixture(fixture);
assert.deepEqual(validatePreferenceProvenanceRecoveryBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-headline-different-provenance-recovery-v1');
assert.equal(compiled.issue, 678);
assert.equal(compiled.status, 'provenance_attack_and_recovery_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');

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
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(compiled.metrics[key], value);

for (const [key, value] of Object.entries({
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
  real_world_effect_claimed: false,
  preference_change_present: false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
assert.equal(worlds['clean-authenticated-current-evidence'].attack.present, false);
assert.equal(worlds['clean-authenticated-current-evidence'].provenance_invalid, false);
assert.equal(worlds['clean-authenticated-current-evidence'].reference_correct_final, true);

const spoof = worlds['source-spoofing-predecision-contained'];
assert.equal(spoof.detection.timing, 'pre_decision');
assert.equal(spoof.quarantine.triggered, true);
assert.equal(spoof.predecision_containment, true);
assert.equal(spoof.successful_clean_replay, true);

const poisoned = worlds['poisoned-source-postdecision-rollback-replay'];
assert.equal(poisoned.all_cryptographic_checks_pass, true);
assert.equal(poisoned.cryptographically_valid_but_provenance_invalid, true);
assert.equal(poisoned.postdecision_rollback, true);
assert.equal(poisoned.successful_clean_replay, true);
assert.equal(poisoned.publication.correction_issued, true);
assert.equal(poisoned.final_state.transient_exposure, true);

const retrieval = worlds['retrieval-injection-context-recovery'];
assert.equal(retrieval.artifact_states.length, 2);
assert.equal(retrieval.cryptographically_valid_but_provenance_invalid, true);
assert.equal(retrieval.postdecision_rollback, true);
assert.equal(retrieval.final_state.transient_exposure, false);

const stale = worlds['hash-valid-stale-replay-refreshed'];
assert.equal(stale.artifact_states[0].hash_matches_registry, true);
assert.equal(stale.artifact_states[0].signature_valid, true);
assert.equal(stale.artifact_states[0].freshness_state, 'stale');
assert.equal(stale.cryptographically_valid_but_provenance_invalid, true);
assert.equal(stale.predecision_containment, true);

const signer = worlds['compromised-signer-revocation-replay'];
assert.equal(signer.artifact_states[0].signature_valid, true);
assert.equal(signer.artifact_states[0].signer_trust_state, 'compromised');
assert.equal(signer.trust_anchor_rotated, true);
assert.equal(signer.trust_action.trust_anchor_after, 'TRUST-ROOT-V3');
assert.equal(signer.successful_clean_replay, true);

const abstention = worlds['detected-attack-no-clean-recovery-abstention'];
assert.equal(abstention.detected_but_unrecoverable, true);
assert.equal(abstention.safe_abstention, true);
assert.equal(abstention.final_state.final_proposal_id, null);
assert.equal(abstention.final_state.implementation_state, 'blocked_abstention');

const silent = worlds['silent-undetected-wrong-version'];
assert.equal(silent.detection.detected, false);
assert.equal(silent.quarantine.triggered, false);
assert.equal(silent.wrong_version_active, true);
assert.equal(silent.final_state.final_proposal_id, 'A0');
assert.equal(silent.cryptographically_valid_but_provenance_invalid, true);

assert.equal(new Set(compiled.worlds.map(world => world.public_headline_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.final_disposition_signature_sha256)).size, 3);
assert.equal(new Set(compiled.worlds.map(world => world.attack_recovery_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.deepEqual(world.publication.family_counts, {A: 800, B: 200});
  assert.deepEqual(validatePreferenceProvenanceRecoveryChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceProvenanceRecoveryWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'hash-valid-stale-replay-refreshed')
);
assert.equal(direct.all_cryptographic_checks_pass, true);
assert.equal(direct.provenance_invalid, true);
assert.equal(direct.predecision_containment, true);

const markdown = renderPreferenceProvenanceRecoveryMarkdown(compiled);
assert.match(markdown, /Provenance attack, quarantine, rollback, and recovery custody/);
assert.match(markdown, /Public A share: 80\.00%/);
assert.match(markdown, /source-spoofing-predecision-contained/);
assert.match(markdown, /Clean replay: true/);
assert.match(markdown, /hash-valid-stale-replay-refreshed/);
assert.match(markdown, /Cryptographically valid but provenance invalid: true/);
assert.match(markdown, /detected-attack-no-clean-recovery-abstention/);
assert.match(markdown, /Implementation state: blocked_abstention/);
assert.match(markdown, /silent-undetected-wrong-version/);
assert.match(markdown, /Implementation state: wrong_version_active/);
assert.doesNotMatch(markdown, /named institution was attacked|attacker identified|manipulated the public|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceProvenanceRecoveryFixture(graphLeak).some(error => /graph_effect/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceProvenanceRecoveryFixture(missingWorld).some(error => /exactly the eight required provenance-recovery worlds/.test(error)));

const inconsistentHash = structuredClone(fixture);
inconsistentHash.worlds[0].artifact_states[0].observed_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
assert.ok(validatePreferenceProvenanceRecoveryFixture(inconsistentHash).some(error => /hash-match state is inconsistent/.test(error)));

const falseDetectionTiming = structuredClone(fixture);
falseDetectionTiming.worlds.find(world => world.world_id === 'silent-undetected-wrong-version').detection.timing = 'post_decision';
assert.ok(validatePreferenceProvenanceRecoveryFixture(falseDetectionTiming).some(error => /undetected state must preserve no detection timing/.test(error)));

const quarantineWithoutDetection = structuredClone(fixture);
quarantineWithoutDetection.worlds.find(world => world.world_id === 'silent-undetected-wrong-version').quarantine = {
  triggered: true,
  artifact_ids: ['EVIDENCE-SET-SILENT-SUBSTITUTION'],
  forensic_snapshot_preserved: true,
  timestamp: '2026-08-01T11:00:00Z'
};
assert.ok(validatePreferenceProvenanceRecoveryFixture(quarantineWithoutDetection).some(error => /triggered quarantine lacks detection/.test(error)));

const replayWithoutCleanSource = structuredClone(fixture);
replayWithoutCleanSource.worlds.find(world => world.world_id === 'detected-attack-no-clean-recovery-abstention').recovery = {
  clean_source_available: false,
  replay_attempted: true,
  replay_inputs: ['EVIDENCE-SET-V2'],
  deterministic: true,
  validation_passed: true,
  recovered_proposal_id: 'A1',
  recovery_state: 'invalid'
};
assert.ok(validatePreferenceProvenanceRecoveryFixture(replayWithoutCleanSource).some(error => /replay lacks clean source/.test(error)));

const rotationWithoutReceipt = structuredClone(fixture);
rotationWithoutReceipt.worlds.find(world => world.world_id === 'compromised-signer-revocation-replay').trust_action.rotation_receipt_id = null;
assert.ok(validatePreferenceProvenanceRecoveryFixture(rotationWithoutReceipt).some(error => /trust-anchor rotation lacks revocation and receipt/.test(error)));

const stalePromotion = structuredClone(fixture);
const staleState = stalePromotion.worlds.find(world => world.world_id === 'hash-valid-stale-replay-refreshed').artifact_states[0];
staleState.freshness_state = 'current';
staleState.semantic_epoch = 'EPOCH-2';
staleState.authorized_for_current_epoch = true;
assert.throws(() => compilePreferenceProvenanceRecoveryFixture(stalePromotion), /cryptographically_valid_but_provenance_invalid mismatch/);

const signerTrustLaundering = structuredClone(fixture);
const signerState = signerTrustLaundering.worlds.find(world => world.world_id === 'compromised-signer-revocation-replay').artifact_states[0];
signerState.signer_trust_state = 'trusted';
signerState.authorized_for_current_epoch = true;
assert.throws(() => compilePreferenceProvenanceRecoveryFixture(signerTrustLaundering), /cryptographically_valid_but_provenance_invalid mismatch/);

const silentAlertInflation = structuredClone(fixture);
silentAlertInflation.worlds.find(world => world.world_id === 'silent-undetected-wrong-version').detection = {
  detected: true,
  detector_id: 'DET-KEY-1',
  detector_version: 'key-monitor-v2',
  signal: 'late_alert',
  timing: 'post_decision',
  timestamp: '2026-08-01T11:02:00Z',
  confidence: 1
};
assert.throws(() => compilePreferenceProvenanceRecoveryFixture(silentAlertInflation), /compiled metric detected_attack_worlds mismatch|compiled metric undetected_attack_worlds mismatch/);

const correctResultLeak = structuredClone(fixture);
correctResultLeak.expected_classification.correct_final_result_proves_clean_execution_path = true;
assert.ok(validatePreferenceProvenanceRecoveryFixture(correctResultLeak).some(error => /correct_final_result_proves_clean_execution_path/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceProvenanceRecoveryFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[5].payload.recovery.recovery_state = 'tampered';
assert.ok(validatePreferenceProvenanceRecoveryBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.successful_clean_replay_worlds = 6;
assert.ok(validatePreferenceProvenanceRecoveryBuild(metricInflation).some(error => /successful_clean_replay_worlds must equal 5/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceProvenanceRecoveryFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-provenance-recovery.test.js: OK');
