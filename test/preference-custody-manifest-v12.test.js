import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePerformativeFixture } from '../tools/lib/performative-synthetic-constituency.mjs';
import { compilePreferenceCustodyFixture } from '../tools/lib/preference-custody.mjs';
import { compilePreferenceEquifinalityFixture } from '../tools/lib/preference-equifinality.mjs';
import { compilePreferenceAttritionFixture } from '../tools/lib/preference-attrition.mjs';
import { compilePreferenceSubgroupFixture } from '../tools/lib/preference-subgroup.mjs';
import { compilePreferenceStandingFixture } from '../tools/lib/preference-standing.mjs';
import { compilePreferenceAgendaFixture } from '../tools/lib/preference-agenda.mjs';
import { compilePreferencePackageFixture } from '../tools/lib/preference-package.mjs';
import { compilePreferenceSuccessionFixture } from '../tools/lib/preference-succession.mjs';
import { compilePreferenceDynamicChangeFixture } from '../tools/lib/preference-dynamic-change.mjs';
import { compilePreferenceNetworkFormationFixture } from '../tools/lib/preference-network-formation.mjs';
import { compilePreferenceDeliberativeFormationFixture } from '../tools/lib/preference-deliberative-formation.mjs';
import { compilePreferenceEpistemicQualityFixture } from '../tools/lib/preference-epistemic-quality.mjs';
import { compilePreferenceProvenanceRecoveryFixture } from '../tools/lib/preference-provenance-recovery.mjs';
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from '../tools/lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from '../tools/lib/preference-custody-manifest-v11.mjs';
import {
  compilePreferenceCustodyManifestV12,
  renderPreferenceCustodyManifestV12Markdown,
  validatePreferenceCustodyManifestV12,
  validatePreferenceCustodyManifestV12Build
} from '../tools/lib/preference-custody-manifest-v12.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const baseV8 = compilePreferenceCustodyManifest(readJson('data/research/preference-custody/control-manifest.json'), {
  'build/research/performative-synthetic-constituency-fixture.json': compilePerformativeFixture(readJson('data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json')),
  'build/research/preference-custody-option-set-fixture.json': compilePreferenceCustodyFixture(readJson('data/research/preference-custody/option-set-starvation.fixture.json')),
  'build/research/preference-observational-equivalence.json': compilePreferenceEquifinalityFixture(readJson('data/research/preference-custody/observational-equivalence.fixture.json')),
  'build/research/preference-attrition-refusal.json': compilePreferenceAttritionFixture(readJson('data/research/preference-custody/refusal-exit.fixture.json')),
  'build/research/preference-subgroup-capacity.json': compilePreferenceSubgroupFixture(readJson('data/research/preference-custody/subgroup-capacity.fixture.json')),
  'build/research/preference-standing-authority.json': compilePreferenceStandingFixture(readJson('data/research/preference-custody/standing-authority.fixture.json')),
  'build/research/preference-agenda-formation.json': compilePreferenceAgendaFixture(readJson('data/research/preference-custody/agenda-formation.fixture.json')),
  'build/research/preference-package-bargaining.json': compilePreferencePackageFixture(readJson('data/research/preference-custody/package-bargaining.fixture.json')),
  'build/research/preference-succession-validation.json': compilePreferenceSuccessionFixture(readJson('data/research/preference-custody/succession-validation.fixture.json')),
  'build/research/preference-dynamic-change.json': compilePreferenceDynamicChangeFixture(readJson('data/research/preference-custody/dynamic-change.fixture.json'))
});
const baseV9 = compilePreferenceCustodyManifestV9(
  readJson('data/research/preference-custody/control-manifest-v9.json'),
  baseV8,
  compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json'))
);
const baseV10 = compilePreferenceCustodyManifestV10(
  readJson('data/research/preference-custody/control-manifest-v10.json'),
  baseV9,
  compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json'))
);
const baseV11 = compilePreferenceCustodyManifestV11(
  readJson('data/research/preference-custody/control-manifest-v11.json'),
  baseV10,
  compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json'))
);
const provenanceBuild = compilePreferenceProvenanceRecoveryFixture(readJson('data/research/preference-custody/provenance-recovery.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v12.json');

assert.deepEqual(validatePreferenceCustodyManifestV12(manifest), []);
const compiled = compilePreferenceCustodyManifestV12(manifest, baseV11, provenanceBuild);
assert.deepEqual(validatePreferenceCustodyManifestV12Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v12');
assert.equal(compiled.status, 'laboratory_floor_v12_qualified');
assert.equal(compiled.control_count, 14);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v11');
assert.equal(compiled.composition.base_control_count, 13);
assert.equal(compiled.composition.extension_control_id, 'PC-14');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07',
  'PC-08', 'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13', 'PC-14'
]);

const pc14 = compiled.controls.find(control => control.control_id === 'PC-14');
assert.equal(pc14.failure_class, 'epistemic_adversary_provenance_attack_detection_and_recovery_equifinality');
const expectedProofCounts = {
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
  residual_uncertainty_worlds: 4
};
for (const [key, value] of Object.entries(expectedProofCounts)) assert.equal(pc14.proof_summary[key], value);
assert.equal(pc14.proof_summary.public_A_share, 0.8);
for (const key of [
  'valid_hash_proves_current_semantic_validity',
  'valid_signature_proves_uncompromised_signer_and_authorized_content',
  'correct_final_result_proves_clean_execution_path',
  'attack_detection_proves_successful_recovery',
  'quarantine_is_rollback',
  'rollback_is_deterministic_clean_replay',
  'replay_success_proves_no_transient_exposure_or_residual_harm',
  'eventual_correction_proves_no_prior_consequence',
  'unchanged_public_headline_proves_same_exact_proposal_or_implementation_state',
  'missing_detector_alert_proves_clean_provenance',
  'binding_public_authority_supported'
]) assert.equal(pc14.proof_summary[key], false);
assert.equal(pc14.proof_summary.bounded_predecision_containment_supported, true);
assert.equal(pc14.proof_summary.bounded_postdecision_recovery_supported, true);
assert.equal(pc14.proof_summary.safe_abstention_supported, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'provenance_attack_detection_containment_and_recovery'));
assert.ok(!compiled.open_frontiers.includes('epistemic_adversaries_provenance_attack_and_recovery'));
assert.ok(compiled.open_frontiers.includes('cross_organizational_provenance_trust_federation_and_recovery'));
assert.ok(compiled.open_frontiers.includes('adversarial_attribution_incentives_and_recovery_externalities'));
for (const requirement of [
  'artifact_bytes_content_hash_version_and_registry_state',
  'trust_anchor_certificate_revocation_and_rotation_history',
  'detector_identity_version_configuration_and_declared_coverage',
  'quarantine_scope_timestamp_and_preserved_forensic_snapshot',
  'last_known_good_checkpoint_identity_and_hash',
  'replay_input_manifest_environment_and_dependency_versions',
  'replay_validation_reference_comparison_and_receipt',
  'publication_correction_retraction_and_affected_party_notification',
  'residual_uncertainty_unresolved_artifacts_and_safe_abstention_state'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV12Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v12/);
assert.match(markdown, /\*\*Controls:\*\* 14/);
assert.match(markdown, /preference-custody-laboratory-floor-v11 \+ PC-14/);
assert.match(markdown, /successful_clean_replay_worlds: 5/);
assert.match(markdown, /cryptographically_valid_but_provenance_invalid_worlds: 5/);
assert.match(markdown, /safe_abstention_worlds: 1/);
assert.match(markdown, /wrong_version_active_worlds: 1/);
assert.match(markdown, /bounded_postdecision_recovery_supported: true/);
assert.doesNotMatch(markdown, /named system was attacked|attacker identified|security certified|manipulated the public|publicly authorized/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v11';
assert.ok(validatePreferenceCustodyManifestV12(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v12/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-15';
assert.ok(validatePreferenceCustodyManifestV12(wrongControl).some(error => /must remain PC-14/.test(error)));

const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV12(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));

const invalidBase = structuredClone(baseV11);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV12(manifest, invalidBase, provenanceBuild), /invalid v11 base build/);

const invalidProvenance = structuredClone(provenanceBuild);
invalidProvenance.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV12(manifest, baseV11, invalidProvenance), /invalid PC-14 build/);

const missingRules = structuredClone(provenanceBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV12(manifest, baseV11, missingRules), /invalid PC-14 build/);

const replayInflation = structuredClone(compiled);
replayInflation.controls.find(control => control.control_id === 'PC-14').proof_summary.successful_clean_replay_worlds = 6;
assert.ok(validatePreferenceCustodyManifestV12Build(replayInflation).some(error => /successful_clean_replay_worlds must equal 5/.test(error)));

const cleanPathLeak = structuredClone(compiled);
cleanPathLeak.controls.find(control => control.control_id === 'PC-14').proof_summary.correct_final_result_proves_clean_execution_path = true;
assert.ok(validatePreferenceCustodyManifestV12Build(cleanPathLeak).some(error => /correct_final_result_proves_clean_execution_path must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-14').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV12Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('epistemic_adversaries_provenance_attack_and_recovery');
assert.ok(validatePreferenceCustodyManifestV12Build(frontierLeak).some(error => /remove the resolved broad provenance-recovery frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 9;
assert.ok(validatePreferenceCustodyManifestV12Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v12.test.js: OK');
