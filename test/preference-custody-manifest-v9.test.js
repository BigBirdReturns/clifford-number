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
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import {
  compilePreferenceCustodyManifestV9,
  renderPreferenceCustodyManifestV9Markdown,
  validatePreferenceCustodyManifestV9,
  validatePreferenceCustodyManifestV9Build
} from '../tools/lib/preference-custody-manifest-v9.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const baseManifest = readJson('data/research/preference-custody/control-manifest.json');
const baseBuild = compilePreferenceCustodyManifest(baseManifest, {
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
const networkBuild = compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v9.json');

assert.deepEqual(validatePreferenceCustodyManifestV9(manifest), []);
const compiled = compilePreferenceCustodyManifestV9(manifest, baseBuild, networkBuild);
assert.deepEqual(validatePreferenceCustodyManifestV9Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v9');
assert.equal(compiled.status, 'laboratory_floor_v9_qualified');
assert.equal(compiled.control_count, 11);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v8');
assert.equal(compiled.composition.base_control_count, 10);
assert.equal(compiled.composition.extension_control_id, 'PC-11');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);

const controlIds = compiled.controls.map(control => control.control_id).sort();
assert.deepEqual(controlIds, ['PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10','PC-11']);
const pc11 = compiled.controls.find(control => control.control_id === 'PC-11');
assert.equal(pc11.failure_class, 'network_dependence_collective_formation_and_visibility_equifinality');
assert.deepEqual({
  worlds: pc11.proof_summary.world_count,
  surface: pc11.proof_summary.distinct_surface_headline_signatures,
  latent: pc11.proof_summary.distinct_latent_headline_signatures,
  reports: pc11.proof_summary.distinct_report_headline_signatures,
  actions: pc11.proof_summary.distinct_action_headline_signatures,
  mechanisms: pc11.proof_summary.distinct_mechanism_signatures,
  converted: pc11.proof_summary.worlds_with_latent_conversion,
  nonconverted: pc11.proof_summary.worlds_without_latent_conversion,
  networked: pc11.proof_summary.worlds_with_network_mediated_response,
  deliberative: pc11.proof_summary.worlds_with_collective_deliberation
}, {
  worlds: 6,
  surface: 1,
  latent: 2,
  reports: 2,
  actions: 2,
  mechanisms: 6,
  converted: 3,
  nonconverted: 3,
  networked: 3,
  deliberative: 0
});
assert.equal(pc11.proof_summary.worlds_with_independent_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_peer_mediated_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_common_source_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_report_latent_divergence, 1);
assert.equal(pc11.proof_summary.worlds_with_action_latent_divergence, 1);
assert.equal(pc11.proof_summary.worlds_with_ranking_amplification, 1);
assert.equal(pc11.proof_summary.stable_identity_worlds, 6);
assert.equal(pc11.proof_summary.stable_network_version_worlds, 6);
assert.equal(pc11.proof_summary.stable_instrument_worlds, 6);
assert.ok(Math.abs(pc11.proof_summary.surfaced_A_share_shift - 0.2) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.maximum_surface_latent_total_variation - 0.2) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.maximum_surface_report_total_variation - 0.2) < 1e-12);
for (const key of [
  'surface_majority_identifies_independent_preference_distribution',
  'correlated_change_identifies_peer_influence_without_source_separation',
  'homophily_identifies_contagion',
  'common_broadcast_is_peer_cascade',
  'public_report_always_equals_private_preference',
  'public_action_always_equals_private_preference',
  'surfaced_share_always_equals_population_report_share',
  'collective_deliberation_supported',
  'network_path_establishes_manipulation',
  'binding_public_authority_supported'
]) assert.equal(pc11.proof_summary[key], false);
assert.equal(pc11.proof_summary.peer_influence_path_supported_in_at_least_one_world, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'network_dependence_and_collective_formation'));
assert.ok(!compiled.open_frontiers.includes('endogenous_network_and_collective_preference_formation'));
assert.ok(compiled.open_frontiers.includes('collective_deliberation_reason_exchange_and_emergent_group_preference'));
assert.ok(compiled.open_frontiers.includes('network_interference_multihop_causal_identification'));
for (const requirement of [
  'network_version_graph_hash_and_edge_schema',
  'private_evidence_and_common_source_exposure_logs',
  'latent_preference_public_report_and_public_action_transitions',
  'ranking_sampling_visibility_and_recommendation_logs',
  'edge_shuffle_source_removal_or_other_valid_network_counterfactual'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV9Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v9/);
assert.match(markdown, /\*\*Controls:\*\* 11/);
assert.match(markdown, /preference-custody-laboratory-floor-v8 \+ PC-11/);
assert.match(markdown, /Distinct surfaced headlines: 1/);
assert.match(markdown, /Peer-mediated conversion worlds: 1/);
assert.match(markdown, /Ranking-amplification worlds: 1/);
assert.match(markdown, /Collective-deliberation worlds: 0/);
assert.match(markdown, /Frozen surfaced A shift: 20\.00%/);
assert.doesNotMatch(markdown, /peer contagion confirmed|collective deliberation confirmed|manipulated the public|publicly authorized/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v8';
assert.ok(validatePreferenceCustodyManifestV9(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v9/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-12';
assert.ok(validatePreferenceCustodyManifestV9(wrongControl).some(error => /must remain PC-11/.test(error)));

const missingSuccessor = structuredClone(manifest);
missingSuccessor.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV9(missingSuccessor).some(error => /successor frontiers are incomplete/.test(error)));

const invalidBase = structuredClone(baseBuild);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV9(manifest, invalidBase, networkBuild), /invalid v8 base build/);

const invalidNetwork = structuredClone(networkBuild);
invalidNetwork.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV9(manifest, baseBuild, invalidNetwork), /invalid PC-11 build/);

const missingRule = structuredClone(networkBuild);
missingRule.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV9(manifest, baseBuild, missingRule), /invalid PC-11 build/);

const headlineInflation = structuredClone(compiled);
headlineInflation.controls.find(control => control.control_id === 'PC-11').proof_summary.distinct_surface_headline_signatures = 2;
assert.ok(validatePreferenceCustodyManifestV9Build(headlineInflation).some(error => /one surfaced headline/.test(error)));

const contagionLeak = structuredClone(compiled);
contagionLeak.controls.find(control => control.control_id === 'PC-11').proof_summary.homophily_identifies_contagion = true;
assert.ok(validatePreferenceCustodyManifestV9Build(contagionLeak).some(error => /homophily_identifies_contagion must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-11').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV9Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('endogenous_network_and_collective_preference_formation');
assert.ok(validatePreferenceCustodyManifestV9Build(frontierLeak).some(error => /remove the resolved broad network frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 7;
assert.ok(validatePreferenceCustodyManifestV9Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v9.test.js: OK');
