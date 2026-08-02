import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceInterferenceMappingFixture,
  validatePreferenceInterferenceMappingFixture,
  validatePreferenceInterferenceMappingBuild
} from '../tools/lib/preference-interference-mapping.mjs';

execFileSync(process.execPath, ['tools/compile-preference-interference-mapping.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/interference-mapping.fixture.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-interference-mapping.json', 'utf8'));
const markdown = readFileSync('build/research/preference-interference-mapping.md', 'utf8');
const record = (value, id) => value.worlds.find(world => world.world_id === id);

assert.deepEqual(validatePreferenceInterferenceMappingFixture(fixture), []);
assert.deepEqual(validatePreferenceInterferenceMappingBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-interference-adjusted-status-different-exposure-governance-v1');
assert.equal(compiled.schema_version, 'preference-interference-mapping-build@1');
assert.equal(compiled.status, 'interference_network_channel_exposure_mapping_and_equilibrium_assurance_qualified');
assert.equal(compiled.issue, 752);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.interference_governance_signature_sha256)).size, 8);

const expectedMetrics = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_interference_governance_signatures: 8,
  complete_interference_assurance_worlds: 1,
  peer_spillover_worlds: 1,
  institutional_channel_contamination_worlds: 1,
  cross_cluster_interference_worlds: 1,
  network_undercoverage_worlds: 1,
  treatment_version_interference_worlds: 1,
  endogenous_network_rewiring_worlds: 1,
  general_equilibrium_saturation_worlds: 1,
  assignment_complete_worlds: 8,
  network_census_complete_worlds: 6,
  channel_map_complete_worlds: 7,
  control_unexposed_complete_worlds: 2,
  stable_treatment_complete_worlds: 7,
  stable_network_complete_worlds: 6,
  partial_interference_supported_worlds: 3,
  exposure_mapping_complete_worlds: 1,
  spillover_estimand_identified_worlds: 1,
  current_interference_lineage_complete_worlds: 5,
  same_public_interference_surface_worlds: 8,
  total_true_exposed_control_count: 205,
  total_false_negative_exposure_count: 205,
  total_peer_spillover_count: 30,
  total_institutional_exposure_count: 40,
  total_cross_cluster_exposure_count: 25,
  total_hidden_network_exposure_count: 40,
  total_rewiring_exposure_count: 20,
  total_ambient_saturation_exposure_count: 100,
  total_missing_edge_count: 400,
  total_cross_cluster_edge_count: 50,
  total_shared_channel_exposure_count: 140,
  total_multiple_version_unit_count: 30,
  total_rewired_edge_count: 100,
  total_unsupported_interference_decisions: 700,
  binding_public_authority_worlds: 0
};
assert.deepEqual(compiled.metrics, expectedMetrics);

for (const key of [
  'cluster_randomization_identifies_absence_of_interference',
  'nominal_control_identifies_unexposed_control',
  'complete_node_coverage_identifies_complete_edge_channel_exposure_coverage',
  'person_network_identifies_complete_institutional_market_exposure',
  'predeclared_mapping_identifies_correct_exposure_when_channels_omitted',
  'zero_observed_cross_cluster_edges_identifies_partial_interference',
  'stable_assignment_identifies_stable_network',
  'single_treatment_label_identifies_stable_version_or_dose',
  'network_adjusted_estimator_identifies_valid_exposure_model',
  'cluster_robust_uncertainty_identifies_spillover_correction',
  'zero_reported_spillover_identifies_zero_true_spillover',
  'current_network_snapshot_identifies_pre_treatment_network',
  'saturation_equilibrium_identifies_unit_level_untreated_counterfactual',
  'public_interference_adjusted_status_identifies_complete_current_exposure_aware_correctable_authorized_evidence',
  'interference_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed',
  'preference_change_present'
]) assert.equal(compiled.classification[key], false);
assert.equal(compiled.classification.complete_interference_assurance_supported_in_at_least_one_world, true);

const byId = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
assert.equal(byId['complete-predeclared-exposure-map-stable-unexposed-current'].flags.complete_interference_assurance, true);
assert.equal(byId['direct-peer-spillover-to-nominal-controls'].flags.peer_spillover_present, true);
assert.equal(byId['direct-peer-spillover-to-nominal-controls'].exposure.true_exposed_control_count, 30);
assert.equal(byId['shared-institutional-channel-contamination'].flags.institutional_channel_contamination_present, true);
assert.equal(byId['shared-institutional-channel-contamination'].channel_map.shared_channel_exposure_count, 40);
assert.equal(byId['cross-cluster-diffusion-breaks-partial-interference'].flags.cross_cluster_interference_present, true);
assert.equal(byId['cross-cluster-diffusion-breaks-partial-interference'].network.cross_cluster_edge_count, 50);
assert.equal(byId['incomplete-network-census-hidden-exposure'].flags.network_undercoverage_present, true);
assert.equal(byId['incomplete-network-census-hidden-exposure'].network.missing_edge_count, 400);
assert.equal(byId['multiple-treatment-versions-and-doses-collapsed'].flags.treatment_version_interference_present, true);
assert.equal(byId['multiple-treatment-versions-and-doses-collapsed'].treatment.version_count, 3);
assert.equal(byId['post-assignment-network-rewiring'].flags.endogenous_network_rewiring_present, true);
assert.equal(byId['post-assignment-network-rewiring'].network.rewired_edge_count, 100);
assert.equal(byId['market-and-institutional-saturation-general-equilibrium'].flags.general_equilibrium_saturation_present, true);
assert.equal(byId['market-and-institutional-saturation-general-equilibrium'].exposure.ambient_saturation_exposure_count, 100);

for (const world of compiled.worlds) {
  assert.equal(world.custody_chain.length, 8);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.interference_governance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(compiled.worlds[0].custody_chain[0].event_type, 'interference_publication_surface_frozen');
assert.equal(compiled.worlds[0].custody_chain[3].event_type, 'true_classified_and_misclassified_exposure_state');
assert.equal(compiled.worlds[0].custody_chain[6].event_type, 'interference_mechanism_classified');

assert.match(markdown, /Interference, network spillover, and exposure-mapping custody/);
assert.match(markdown, /Worlds:\*\* 8/);
assert.match(markdown, /total_true_exposed_control_count: 205/);
assert.match(markdown, /total_false_negative_exposure_count: 205/);
assert.match(markdown, /market-and-institutional-saturation-general-equilibrium/);
assert.doesNotMatch(markdown, /named network caused|actual manipulation|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceInterferenceMappingFixture(graphLeak).some(error => /status or graph effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 751;
assert.ok(validatePreferenceInterferenceMappingFixture(issueLeak).some(error => /issue lineage mismatch/.test(error)));

const publicClaimDrift = structuredClone(fixture);
publicClaimDrift.world_defaults.public_claim.reported_direct_effect = 0.21;
assert.ok(validatePreferenceInterferenceMappingFixture(publicClaimDrift).some(error => /frozen interference-publication surface/.test(error)));

const denominatorDrift = structuredClone(fixture);
denominatorDrift.world_defaults.population.nominal_control_count = 49;
assert.ok(validatePreferenceInterferenceMappingFixture(denominatorDrift).some(error => /population denominators/.test(error)));

const edgeMismatch = structuredClone(fixture);
record(edgeMismatch, 'cross-cluster-diffusion-breaks-partial-interference').overrides.network.missing_edge_count = 1;
assert.ok(validatePreferenceInterferenceMappingFixture(edgeMismatch).some(error => /observed and missing edges must reconcile/.test(error)));

const exposureMismatch = structuredClone(fixture);
record(exposureMismatch, 'direct-peer-spillover-to-nominal-controls').overrides.exposure.false_negative_count = 29;
assert.ok(validatePreferenceInterferenceMappingFixture(exposureMismatch).some(error => /exposure classification counts must reconcile/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.world_defaults.governance.binding_public_authority = true;
assert.ok(validatePreferenceInterferenceMappingFixture(authorityLeak).some(error => /binding public authority/.test(error)));

const falsePeerRepair = structuredClone(fixture);
const peer = record(falsePeerRepair, 'direct-peer-spillover-to-nominal-controls').overrides;
peer.population.indirectly_exposed_control_count = 0;
peer.population.truly_unexposed_control_count = 50;
peer.treatment.spillover_dose_count = 0;
peer.exposure.true_exposed_control_count = 0;
peer.exposure.false_negative_count = 0;
peer.exposure.peer_spillover_count = 0;
assert.throws(() => compilePreferenceInterferenceMappingFixture(falsePeerRepair), /peer_spillover_present mismatch|control_unexposed_complete mismatch/);

const falseUndercoverageRepair = structuredClone(fixture);
const under = record(falseUndercoverageRepair, 'incomplete-network-census-hidden-exposure').overrides;
Object.assign(under.network, {census_state:'pre_treatment_complete',true_edge_count:200,observed_edge_count:200,missing_edge_count:0,coverage_rate:1});
Object.assign(under.population, {indirectly_exposed_control_count:0,truly_unexposed_control_count:50});
Object.assign(under.exposure, {current:true,true_exposed_control_count:0,false_negative_count:0,hidden_network_exposure_count:0});
assert.throws(() => compilePreferenceInterferenceMappingFixture(falseUndercoverageRepair), /network_undercoverage_present mismatch|network_census_complete mismatch|control_unexposed_complete mismatch/);

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_interference_assurance_worlds = 2;
assert.ok(validatePreferenceInterferenceMappingBuild(metricInflation).some(error => /complete_interference_assurance_worlds must equal 1/.test(error)));

const classificationInflation = structuredClone(compiled);
classificationInflation.classification.cluster_randomization_identifies_absence_of_interference = true;
assert.ok(validatePreferenceInterferenceMappingBuild(classificationInflation).some(error => /cluster_randomization_identifies_absence_of_interference must remain false/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[3].payload.true_exposed_control_count = 999;
assert.ok(validatePreferenceInterferenceMappingBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceInterferenceMappingFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-interference-mapping.test.js: OK');
