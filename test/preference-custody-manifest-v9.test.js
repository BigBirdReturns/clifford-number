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
const buildsByPath = {
  'build/research/performative-synthetic-constituency-fixture.json': compilePerformativeFixture(
    readJson('data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json')
  ),
  'build/research/preference-custody-option-set-fixture.json': compilePreferenceCustodyFixture(
    readJson('data/research/preference-custody/option-set-starvation.fixture.json')
  ),
  'build/research/preference-observational-equivalence.json': compilePreferenceEquifinalityFixture(
    readJson('data/research/preference-custody/observational-equivalence.fixture.json')
  ),
  'build/research/preference-attrition-refusal.json': compilePreferenceAttritionFixture(
    readJson('data/research/preference-custody/refusal-exit.fixture.json')
  ),
  'build/research/preference-subgroup-capacity.json': compilePreferenceSubgroupFixture(
    readJson('data/research/preference-custody/subgroup-capacity.fixture.json')
  ),
  'build/research/preference-standing-authority.json': compilePreferenceStandingFixture(
    readJson('data/research/preference-custody/standing-authority.fixture.json')
  ),
  'build/research/preference-agenda-formation.json': compilePreferenceAgendaFixture(
    readJson('data/research/preference-custody/agenda-formation.fixture.json')
  ),
  'build/research/preference-package-bargaining.json': compilePreferencePackageFixture(
    readJson('data/research/preference-custody/package-bargaining.fixture.json')
  ),
  'build/research/preference-succession-validation.json': compilePreferenceSuccessionFixture(
    readJson('data/research/preference-custody/succession-validation.fixture.json')
  ),
  'build/research/preference-dynamic-change.json': compilePreferenceDynamicChangeFixture(
    readJson('data/research/preference-custody/dynamic-change.fixture.json')
  )
};
const baseBuild = compilePreferenceCustodyManifest(baseManifest, buildsByPath);
const networkBuild = compilePreferenceNetworkFormationFixture(
  readJson('data/research/preference-custody/network-formation.fixture.json')
);
const manifest = readJson('data/research/preference-custody/control-manifest-v9.json');

assert.deepEqual(validatePreferenceCustodyManifestV9(manifest), []);
const compiled = compilePreferenceCustodyManifestV9(manifest, baseBuild, networkBuild);
assert.deepEqual(validatePreferenceCustodyManifestV9Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v9');
assert.equal(compiled.status, 'laboratory_floor_v9_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_count, 11);
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v8');
assert.equal(compiled.composition.base_control_count, 10);
assert.equal(compiled.composition.extension_control_id, 'PC-11');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.equal(compiled.control_integrity.base_floor_qualified, true);
assert.equal(compiled.control_integrity.base_integrity_preserved, true);
assert.equal(compiled.control_integrity.all_graph_effect_none, true);
assert.equal(compiled.control_integrity.no_thesis_evidence_consumption, true);
assert.equal(compiled.control_integrity.no_real_world_conclusion, true);
assert.equal(compiled.control_integrity.no_preference_change_claim, true);
assert.equal(compiled.control_integrity.no_intent_inference, true);
assert.equal(compiled.control_integrity.all_required_pc11_refusal_rules_present, true);
assert.equal(compiled.identification_requirements.length, 11);
assert.ok(compiled.identification_requirements.some(item => item.stage === 'network_dependence_and_collective_formation'));
assert.ok(!compiled.open_frontiers.includes('endogenous_network_and_collective_preference_formation'));
assert.ok(compiled.open_frontiers.includes('collective_deliberation_reason_exchange_and_emergent_group_preference'));
assert.ok(compiled.open_frontiers.includes('network_interference_multihop_causal_identification'));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.ok(compiled.promotion_boundary.real_case_requires.includes('network_version_graph_hash_and_edge_schema'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('private_evidence_and_common_source_exposure_logs'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('latent_preference_public_report_and_public_action_transitions'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('ranking_sampling_visibility_and_recommendation_logs'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('edge_shuffle_source_removal_or_other_valid_network_counterfactual'));
assert.ok(compiled.refusal_rule_union.includes('homophily_is_not_contagion'));
assert.ok(compiled.refusal_rule_union.includes('surfaced_content_share_is_not_population_report_share'));
assert.ok(compiled.refusal_rule_union.includes('network_influence_path_is_not_manipulation_or_intent'));
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const controls = Object.fromEntries(compiled.controls.map(control => [control.control_id, control]));
assert.ok(controls['PC-01']);
assert.ok(controls['PC-10']);
assert.ok(controls['PC-11']);
const pc11 = controls['PC-11'];
assert.equal(pc11.failure_class, 'network_dependence_collective_formation_and_visibility_equifinality');
assert.equal(pc11.proof_summary.world_count, 6);
assert.equal(pc11.proof_summary.distinct_surface_headline_signatures, 1);
assert.equal(pc11.proof_summary.distinct_latent_headline_signatures, 2);
assert.equal(pc11.proof_summary.distinct_report_headline_signatures, 2);
assert.equal(pc11.proof_summary.distinct_action_headline_signatures, 2);
assert.equal(pc11.proof_summary.distinct_mechanism_signatures, 6);
assert.equal(pc11.proof_summary.worlds_with_latent_conversion, 3);
assert.equal(pc11.proof_summary.worlds_without_latent_conversion, 3);
assert.equal(pc11.proof_summary.worlds_with_independent_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_peer_mediated_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_common_source_conversion, 1);
assert.equal(pc11.proof_summary.worlds_with_report_latent_divergence, 1);
assert.equal(pc11.proof_summary.worlds_with_action_latent_divergence, 1);
assert.equal(pc11.proof_summary.worlds_with_ranking_amplification, 1);
assert.equal(pc11.proof_summary.worlds_with_network_mediated_response, 3);
assert.equal(pc11.proof_summary.worlds_with_collective_deliberation, 0);
assert.equal(pc11.proof_summary.stable_identity_worlds, 6);
assert.equal(pc11.proof_summary.stable_network_version_worlds, 6);
assert.equal(pc11.proof_summary.stable_instrument_worlds, 6);
assert.ok(Math.abs(pc11.proof_summary.baseline_A_share - 0.6) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.surfaced_A_share - 0.8) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.surfaced_A_share_shift - 0.2) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.maximum_surface_latent_total_variation - 0.2) < 1e-12);
assert.ok(Math.abs(pc11.proof_summary.maximum_surface_report_total_variation - 0.2) < 1e-12);
assert.equal(pc11.proof_summary.surface_majority_identifies_independent_preference_distribution, false);
assert.equal(pc11.proof_summary.correlated_change_identifies_peer_influence_without_source_separation, false);
assert.equal(pc11.proof_summary.homophily_identifies_contagion, false);
assert.equal(pc11.proof_summary.common_broadcast_is_peer_cascade, false);
assert.equal(pc11.proof_summary.public_report_always_equals_private_preference, false);
assert.equal(pc11.proof_summary.public_action_always_equals_private_preference, false);
assert.equal(pc11.proof_summary.surfaced_share_always_equals_population_report_share, false);
assert.equal(pc11.proof_summary.peer_influence_path_supported_in_at_least_one_world, true);
assert.equal(pc11.proof_summary.collective_deliberation_supported, false);
assert.equal(pc11.proof_summary.network_path_establishes_manipulation, false);
assert.equal(pc11.proof_summary.binding_public_authority_supported, false);

const markdown = renderPreferenceCustodyManifestV9Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v9/);
assert.match(markdown, /\*\*Controls:\*\* 11/);
assert.match(markdown, /preference-custody-laboratory-floor-v8 \+ PC-11/);
assert.match(markdown, /PC-11: network dependence, collective formation, and visibility/);
assert.match(markdown, /Distinct surfaced headlines: 1/);
assert.match(markdown, /Distinct latent headlines: 2/);
assert.match(markdown, /Peer-mediated conversion worlds: 1/);
assert.match(markdown, /Common-source conversion worlds: 1/);
assert.match(markdown, /Report-latent divergence worlds: 1/);
assert.match(markdown, /Action-latent divergence worlds: 1/);
assert.match(markdown, /Ranking-amplification worlds: 1/);
assert.match(markdown, /Collective-deliberation worlds: 0/);
assert.match(markdown, /Frozen surfaced A shift: 20\.00%/);
assert.match(markdown, /collective_deliberation_reason_exchange_and_emergent_group_preference/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|peer contagion confirmed|collective deliberation confirmed|manipulated the public|publicly authorized/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v8';
assert.ok(validatePreferenceCustodyManifestV9(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v9/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v7';
assert.ok(validatePreferenceCustodyManifestV9(wrongBase).some(error => /base manifest must remain floor v8/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-12';
assert.ok(validatePreferenceCustodyManifestV9(wrongControl).some(error => /must remain PC-11/.test(error)));

const missingSuccessor = structuredClone(manifest);
missingSuccessor.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV9(missingSuccessor).some(error => /successor frontiers are incomplete/.test(error)));

const missingRequirements = structuredClone(manifest);
missingRequirements.real_case_requirements_added = [];
assert.ok(validatePreferenceCustodyManifestV9(missingRequirements).some(error => /network real-case requirements are incomplete/.test(error)));

const baseStatusLeak = structuredClone(baseBuild);
baseStatusLeak.status = 'unqualified';
assert.throws(
  () => compilePreferenceCustodyManifestV9(manifest, baseStatusLeak, networkBuild),
  /invalid v8 base build/
);

const networkGraphLeak = structuredClone(networkBuild);
networkGraphLeak.graph_effect = 'asserted';
assert.throws(
  () => compilePreferenceCustodyManifestV9(manifest, baseBuild, networkGraphLeak),
  /invalid PC-11 build/
);

const missingRule = structuredClone(networkBuild);
missingRule.refusal_rules = [];
const missingRuleCompiled = compilePreferenceCustodyManifestV9(manifest, baseBuild, missingRule);
assert.ok(validatePreferenceCustodyManifestV9Build(missingRuleCompiled).some(error => /all_required_pc11_refusal_rules_present/.test(error)));

const headlineInflation = structuredClone(compiled);
headlineInflation.controls.find(control => control.control_id === 'PC-11').proof_summary.distinct_surface_headline_signatures = 2;
assert.ok(validatePreferenceCustodyManifestV9Build(headlineInflation).some(error => /one surfaced headline/.test(error)));

const conversionInflation = structuredClone(compiled);
conversionInflation.controls.find(control => control.control_id === 'PC-11').proof_summary.worlds_with_latent_conversion = 6;
assert.ok(validatePreferenceCustodyManifestV9Build(conversionInflation).some(error => /three conversion and three nonconversion worlds/.test(error)));

const contagionLeak = structuredClone(compiled);
contagionLeak.controls.find(control => control.control_id === 'PC-11').proof_summary.homophily_identifies_contagion = true;
assert.ok(validatePreferenceCustodyManifestV9Build(contagionLeak).some(error => /homophily_identifies_contagion must remain false/.test(error)));

const deliberationLeak = structuredClone(compiled);
deliberationLeak.controls.find(control => control.control_id === 'PC-11').proof_summary.collective_deliberation_supported = true;
assert.ok(validatePreferenceCustodyManifestV9Build(deliberationLeak).some(error => /collective_deliberation_supported must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-11').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV9Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('endogenous_network_and_collective_preference_formation');
assert.ok(validatePreferenceCustodyManifestV9Build(frontierLeak).some(error => /remove the resolved broad network frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 7;
assert.ok(validatePreferenceCustodyManifestV9Build(custodyTamper).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV9(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-custody-manifest-v9.test.js: OK');
