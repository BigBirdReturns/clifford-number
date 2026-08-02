import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceEpistemicQualityFixture,
  renderPreferenceEpistemicQualityMarkdown,
  simulatePreferenceEpistemicQualityWorld,
  validatePreferenceEpistemicQualityBuild,
  validatePreferenceEpistemicQualityChain,
  validatePreferenceEpistemicQualityFixture
} from '../tools/lib/preference-epistemic-quality.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/epistemic-quality.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceEpistemicQualityFixture(fixture), []);

const compiled = compilePreferenceEpistemicQualityFixture(fixture);
assert.deepEqual(validatePreferenceEpistemicQualityBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-majority-different-evidence-quality-v1');
assert.equal(compiled.issue, 676);
assert.equal(compiled.status, 'epistemic_quality_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');

const expectedMetrics = {
  world_count: 6,
  distinct_published_disposition_signatures: 1,
  distinct_private_preference_signatures: 1,
  distinct_ballot_signatures: 1,
  distinct_final_proposal_signatures: 2,
  distinct_evidence_dependency_signatures: 6,
  worlds_with_four_speakers: 6,
  worlds_with_four_evidence_presentations: 6,
  worlds_with_reference_preferred_proposal: 1,
  worlds_with_wrong_A_version: 5,
  worlds_with_independent_source_diversity: 1,
  worlds_with_derivative_source_laundering: 1,
  worlds_with_model_monoculture: 1,
  worlds_with_information_cascade: 1,
  worlds_with_suppressed_counterevidence: 1,
  worlds_with_evidence_integrity_failure: 1,
  worlds_with_minority_correction_uptake: 1,
  worlds_with_challenge_response_amendment: 1,
  worlds_with_complete_source_root_provenance: 6,
  submitted_counterevidence_worlds: 2,
  visible_counterevidence_worlds: 1,
  minimum_root_source_count: 1,
  maximum_root_source_count: 4,
  minimum_valid_evidence_count: 0,
  maximum_valid_evidence_count: 4,
  binding_public_authority_worlds: 0,
  baseline_A_share: 0.6,
  post_A_share: 0.8,
  published_A_share: 0.8
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(compiled.metrics[key], value);

for (const [key, value] of Object.entries({
  citation_count_identifies_source_independence: false,
  speaker_count_identifies_epistemic_diversity: false,
  nominal_agent_count_identifies_model_independence: false,
  claim_repetition_is_corroboration: false,
  majority_agreement_identifies_truth: false,
  correct_family_vote_identifies_correct_proposal_version: false,
  surfaced_evidence_set_is_complete_available_evidence: false,
  source_diversity_identifies_evidence_validity: false,
  minority_group_size_identifies_evidence_quality: false,
  source_diverse_reason_quality_supported_in_at_least_one_world: true,
  minority_correction_path_supported: true,
  collective_agreement_supported: false,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false,
  preference_change_present: false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['independent-diverse-corroboration-minority-correction'];
assert.equal(positive.root_source_count, 4);
assert.equal(positive.independence_cluster_count, 4);
assert.equal(positive.valid_evidence_count, 4);
assert.equal(positive.inspected_evidence_count, 4);
assert.equal(positive.visible_evidence_count, 4);
assert.equal(positive.challenge_count, 1);
assert.equal(positive.response_count, 1);
assert.equal(positive.uptake_count, 2);
assert.equal(positive.amendment_count, 1);
assert.equal(positive.final_proposal_id, 'A1');
assert.equal(positive.reference_acceptable, true);
assert.equal(positive.wrong_A_version, false);
assert.equal(positive.source_diverse_reason_quality_supported, true);
assert.equal(positive.minority_correction_supported, true);
assert.equal(positive.challenge_response_amendment_supported, true);
assert.equal(positive.submitted_counterevidence, true);
assert.equal(positive.visible_counterevidence, true);
assert.equal(positive.reason_events[0].speech_act, 'challenge');
assert.equal(positive.reason_events[1].speech_act, 'response');
assert.equal(positive.reason_events[2].proposal_id, 'A1');

const derivative = worlds['derivative-source-laundering'];
assert.equal(derivative.root_source_count, 1);
assert.equal(derivative.independence_cluster_count, 1);
assert.equal(derivative.derivative_count, 4);
assert.equal(derivative.valid_evidence_count, 4);
assert.equal(derivative.speaker_count, 4);
assert.equal(derivative.derivative_source_laundering, true);
assert.equal(derivative.final_proposal_id, 'A0');
assert.equal(derivative.wrong_A_version, true);

const model = worlds['common-model-expert-monoculture'];
assert.equal(model.root_source_count, 1);
assert.equal(model.independence_cluster_count, 1);
assert.equal(model.model_output_count, 4);
assert.equal(model.model_monoculture, true);
assert.equal(new Set(model.presentations.map(item => item.source_id)).size, 4);
assert.equal(new Set(model.presentations.map(item => item.root_source_id)).size, 1);
assert.equal(new Set(model.presentations.map(item => item.independence_cluster_id)).size, 1);
assert.equal(model.final_proposal_id, 'A0');

const cascade = worlds['information-cascade-without-source-inspection'];
assert.equal(cascade.root_source_count, 1);
assert.equal(cascade.inspected_evidence_count, 1);
assert.equal(cascade.uninspected_repeat_count, 3);
assert.equal(cascade.information_cascade, true);
assert.equal(cascade.presentations[0].source_class, 'inspected_primary_claim');
assert.equal(cascade.presentations.slice(1).every(item => item.source_class === 'uninspected_claim_repeat'), true);
assert.equal(cascade.final_proposal_id, 'A0');

const suppressed = worlds['suppressed-minority-counterevidence'];
assert.equal(suppressed.root_source_count, 4);
assert.equal(suppressed.independence_cluster_count, 4);
assert.equal(suppressed.valid_evidence_count, 4);
assert.equal(suppressed.visible_evidence_count, 2);
assert.equal(suppressed.suppressed_count, 2);
assert.equal(suppressed.submitted_counterevidence, true);
assert.equal(suppressed.visible_counterevidence, false);
assert.equal(suppressed.suppressed_counterevidence, true);
assert.equal(suppressed.reason_events[0].uptake_state, 'suppressed');
assert.equal(suppressed.final_proposal_id, 'A0');
assert.equal(suppressed.counterfactual.expected_final_proposal_id, 'A1');

const fabricated = worlds['fabricated-or-poisoned-evidence'];
assert.equal(fabricated.root_source_count, 4);
assert.equal(fabricated.independence_cluster_count, 4);
assert.equal(fabricated.valid_evidence_count, 0);
assert.equal(fabricated.invalid_evidence_count, 4);
assert.equal(fabricated.evidence_integrity_failure, true);
assert.equal(fabricated.presentations.every(item => item.integrity_state !== 'verified'), true);
assert.equal(fabricated.final_proposal_id, 'A0');

assert.equal(new Set(compiled.worlds.map(world => world.private_preference_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.ballot_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.published_disposition_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.final_proposal_signature_sha256)).size, 2);
assert.equal(new Set(compiled.worlds.map(world => world.evidence_dependency_signature_sha256)).size, 6);

for (const world of compiled.worlds) {
  assert.equal(world.speaker_count, 4);
  assert.equal(world.evidence_presentation_count, 4);
  assert.equal(world.post_private_distribution.A, 0.8);
  assert.equal(world.post_vote_distribution.A, 0.8);
  assert.equal(world.published_distribution.A, 0.8);
  assert.equal(world.full_source_root_provenance, true);
  assert.deepEqual(validatePreferenceEpistemicQualityChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceEpistemicQualityWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'common-model-expert-monoculture')
);
assert.equal(direct.model_monoculture, true);
assert.equal(direct.speaker_count, 4);
assert.equal(direct.root_source_count, 1);
assert.equal(direct.final_proposal_id, 'A0');

const markdown = renderPreferenceEpistemicQualityMarkdown(compiled);
assert.match(markdown, /Epistemic diversity, source independence, and evidence-quality custody/);
assert.match(markdown, /Baseline private A share: 60\.00%/);
assert.match(markdown, /Post private A share: 80\.00%/);
assert.match(markdown, /Speakers per world: 4/);
assert.match(markdown, /independent-diverse-corroboration-minority-correction/);
assert.match(markdown, /Final proposal: A1/);
assert.match(markdown, /derivative-source-laundering/);
assert.match(markdown, /Derivative items: 4/);
assert.match(markdown, /common-model-expert-monoculture/);
assert.match(markdown, /Model outputs: 4/);
assert.match(markdown, /information-cascade-without-source-inspection/);
assert.match(markdown, /Uninspected repeats: 3/);
assert.match(markdown, /suppressed-minority-counterevidence/);
assert.match(markdown, /Suppressed items: 2/);
assert.match(markdown, /fabricated-or-poisoned-evidence/);
assert.match(markdown, /Invalid items: 4/);
assert.doesNotMatch(markdown, /named system used fabricated evidence|consensus confirmed|publicly authorized|manipulated participants/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceEpistemicQualityFixture(graphLeak).some(error => /graph_effect/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceEpistemicQualityFixture(missingWorld).some(error => /exactly the six required epistemic-quality worlds/.test(error)));

const missingRoot = structuredClone(fixture);
missingRoot.baseline.source_registry.find(source => source.source_id === 'DER-EFF-1').root_source_id = 'MISSING';
assert.ok(validatePreferenceEpistemicQualityFixture(missingRoot).some(error => /references missing root source/.test(error)));

const lineageCycle = structuredClone(fixture);
lineageCycle.baseline.source_registry.find(source => source.source_id === 'DER-EFF-1').derivation_parent_id = 'DER-EFF-2';
lineageCycle.baseline.source_registry.find(source => source.source_id === 'DER-EFF-2').derivation_parent_id = 'DER-EFF-1';
assert.ok(validatePreferenceEpistemicQualityFixture(lineageCycle).some(error => /lineage contains a cycle/.test(error)));

const speakerDuplication = structuredClone(fixture);
speakerDuplication.worlds[0].evidence_presentations[1].speaker_id = 'SPK-A';
assert.ok(validatePreferenceEpistemicQualityFixture(speakerDuplication).some(error => /four distinct speaker slots/.test(error)));

const sourceMutation = structuredClone(fixture);
sourceMutation.worlds.find(world => world.world_id === 'common-model-expert-monoculture').evidence_presentations[3].source_id = 'SRC-B-COMP';
assert.throws(() => compilePreferenceEpistemicQualityFixture(sourceMutation), /root_source_count mismatch|independence_cluster_count mismatch|model_output_count mismatch/);

const cascadeInspection = structuredClone(fixture);
cascadeInspection.worlds.find(world => world.world_id === 'information-cascade-without-source-inspection').evidence_presentations[1].inspected = true;
assert.throws(() => compilePreferenceEpistemicQualityFixture(cascadeInspection), /inspected_evidence_count mismatch|uninspected_repeat_count mismatch/);

const counterevidenceVisibility = structuredClone(fixture);
const suppressionWorld = counterevidenceVisibility.worlds.find(world => world.world_id === 'suppressed-minority-counterevidence');
suppressionWorld.evidence_presentations.find(item => item.effect === 'reveals_A0_burden_constraint_failure').visible_to_decision = true;
assert.throws(() => compilePreferenceEpistemicQualityFixture(counterevidenceVisibility), /visible_evidence_count mismatch|suppressed_count mismatch/);

const integrityRepair = structuredClone(fixture);
const repairedSource = integrityRepair.baseline.source_registry.find(source => source.source_id === 'FAB-1');
repairedSource.validity_state = 'valid';
repairedSource.integrity_state = 'verified';
assert.throws(() => compilePreferenceEpistemicQualityFixture(integrityRepair), /valid_evidence_count mismatch|invalid_evidence_count mismatch/);

const positiveVersionLeak = structuredClone(fixture);
positiveVersionLeak.worlds.find(world => world.world_id === 'independent-diverse-corroboration-minority-correction').final_proposal_id = 'A0';
assert.throws(() => compilePreferenceEpistemicQualityFixture(positiveVersionLeak), /reference acceptability mismatch|wrong A version mismatch|reason-quality classification mismatch/);

const falseIndependenceLeak = structuredClone(fixture);
falseIndependenceLeak.expected_classification.citation_count_identifies_source_independence = true;
assert.ok(validatePreferenceEpistemicQualityFixture(falseIndependenceLeak).some(error => /citation_count_identifies_source_independence/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceEpistemicQualityFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.root_source_count = 9;
assert.ok(validatePreferenceEpistemicQualityBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.worlds_with_independent_source_diversity = 2;
assert.ok(validatePreferenceEpistemicQualityBuild(metricInflation).some(error => /worlds_with_independent_source_diversity must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceEpistemicQualityBuild(preferenceClaimLeak).some(error => /must not claim real-world preference change/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceEpistemicQualityFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-epistemic-quality.test.js: OK');
