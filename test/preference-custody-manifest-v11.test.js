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
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from '../tools/lib/preference-custody-manifest-v10.mjs';
import {
  compilePreferenceCustodyManifestV11,
  renderPreferenceCustodyManifestV11Markdown,
  validatePreferenceCustodyManifestV11,
  validatePreferenceCustodyManifestV11Build
} from '../tools/lib/preference-custody-manifest-v11.mjs';

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
const epistemicBuild = compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v11.json');

assert.deepEqual(validatePreferenceCustodyManifestV11(manifest), []);
const compiled = compilePreferenceCustodyManifestV11(manifest, baseV10, epistemicBuild);
assert.deepEqual(validatePreferenceCustodyManifestV11Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v11');
assert.equal(compiled.status, 'laboratory_floor_v11_qualified');
assert.equal(compiled.control_count, 13);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v10');
assert.equal(compiled.composition.base_control_count, 12);
assert.equal(compiled.composition.extension_control_id, 'PC-13');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07',
  'PC-08', 'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13'
]);

const pc13 = compiled.controls.find(control => control.control_id === 'PC-13');
assert.equal(pc13.failure_class, 'epistemic_diversity_source_independence_and_evidence_quality_equifinality');
const expectedProofCounts = {
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
  maximum_valid_evidence_count: 4
};
for (const [key, value] of Object.entries(expectedProofCounts)) assert.equal(pc13.proof_summary[key], value);
assert.equal(pc13.proof_summary.baseline_A_share, 0.6);
assert.equal(pc13.proof_summary.post_A_share, 0.8);
assert.equal(pc13.proof_summary.published_A_share, 0.8);
for (const key of [
  'citation_count_identifies_source_independence',
  'speaker_count_identifies_epistemic_diversity',
  'nominal_agent_count_identifies_model_independence',
  'claim_repetition_is_corroboration',
  'majority_agreement_identifies_truth',
  'correct_family_vote_identifies_correct_proposal_version',
  'surfaced_evidence_set_is_complete_available_evidence',
  'source_diversity_identifies_evidence_validity',
  'minority_group_size_identifies_evidence_quality',
  'collective_agreement_supported',
  'binding_public_authority_supported'
]) assert.equal(pc13.proof_summary[key], false);
assert.equal(pc13.proof_summary.source_diverse_reason_quality_supported_in_at_least_one_world, true);
assert.equal(pc13.proof_summary.minority_correction_path_supported, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'epistemic_quality_source_independence_and_proposal_version'));
assert.ok(!compiled.open_frontiers.includes('collective_reason_quality_epistemic_diversity_and_information_cascades'));
assert.ok(compiled.open_frontiers.includes('epistemic_adversaries_provenance_attack_and_recovery'));
assert.ok(compiled.open_frontiers.includes('knowledge_production_replication_and_source_power'));
for (const requirement of [
  'evidence_item_identity_content_hash_and_version',
  'derivation_citation_syndication_and_replication_graph',
  'model_checkpoint_corpus_retrieval_tool_and_benchmark_lineage',
  'submitted_available_retrieved_visible_and_published_evidence_sets',
  'counterevidence_identity_visibility_challenge_response_and_uptake',
  'proposal_family_version_terms_constraint_and_amendment_lineage',
  'source_removal_deduplication_visibility_restoration_or_integrity_counterfactual'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV11Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v11/);
assert.match(markdown, /\*\*Controls:\*\* 13/);
assert.match(markdown, /preference-custody-laboratory-floor-v10 \+ PC-13/);
assert.match(markdown, /worlds_with_independent_source_diversity: 1/);
assert.match(markdown, /worlds_with_wrong_A_version: 5/);
assert.match(markdown, /worlds_with_suppressed_counterevidence: 1/);
assert.match(markdown, /source_diverse_reason_quality_supported_in_at_least_one_world: true/);
assert.doesNotMatch(markdown, /truth confirmed|consensus confirmed|publicly authorized|named system fabricated evidence|manipulated participants/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v10';
assert.ok(validatePreferenceCustodyManifestV11(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v11/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-14';
assert.ok(validatePreferenceCustodyManifestV11(wrongControl).some(error => /must remain PC-13/.test(error)));

const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV11(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));

const invalidBase = structuredClone(baseV10);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV11(manifest, invalidBase, epistemicBuild), /invalid v10 base build/);

const invalidEpistemic = structuredClone(epistemicBuild);
invalidEpistemic.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV11(manifest, baseV10, invalidEpistemic), /invalid PC-13 build/);

const missingRules = structuredClone(epistemicBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV11(manifest, baseV10, missingRules), /invalid PC-13 build/);

const headlineInflation = structuredClone(compiled);
headlineInflation.controls.find(control => control.control_id === 'PC-13').proof_summary.distinct_published_disposition_signatures = 2;
assert.ok(validatePreferenceCustodyManifestV11Build(headlineInflation).some(error => /distinct_published_disposition_signatures must equal 1/.test(error)));

const truthLeak = structuredClone(compiled);
truthLeak.controls.find(control => control.control_id === 'PC-13').proof_summary.majority_agreement_identifies_truth = true;
assert.ok(validatePreferenceCustodyManifestV11Build(truthLeak).some(error => /majority_agreement_identifies_truth must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-13').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV11Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('collective_reason_quality_epistemic_diversity_and_information_cascades');
assert.ok(validatePreferenceCustodyManifestV11Build(frontierLeak).some(error => /remove the resolved broad epistemic frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 7;
assert.ok(validatePreferenceCustodyManifestV11Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v11.test.js: OK');
