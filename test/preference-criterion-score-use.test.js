import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceCriterionScoreUseFixture,
  renderPreferenceCriterionScoreUseMarkdown,
  simulatePreferenceCriterionScoreUseWorld,
  validatePreferenceCriterionScoreUseBuild,
  validatePreferenceCriterionScoreUseChain,
  validatePreferenceCriterionScoreUseFixture
} from '../tools/lib/preference-criterion-score-use.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/criterion-score-use.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceCriterionScoreUseFixture(fixture), []);
const compiled = compilePreferenceCriterionScoreUseFixture(fixture);
assert.deepEqual(validatePreferenceCriterionScoreUseBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-external-validation-status-different-criterion-use-governance-v1');
assert.equal(compiled.status, 'criterion_independence_external_validation_transport_and_score_use_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_external_validation_governance_signatures: 8,
  complete_external_validation_and_use_worlds: 1,
  same_team_criterion_worlds: 1,
  post_decision_criterion_worlds: 1,
  overlap_contamination_worlds: 1,
  proxy_criterion_worlds: 1,
  transport_failure_worlds: 1,
  unsupported_score_use_worlds: 1,
  validation_succession_drift_worlds: 1,
  criterion_independence_complete_worlds: 5,
  construct_relevance_complete_worlds: 7,
  predecision_criterion_complete_worlds: 7,
  blind_adjudication_complete_worlds: 6,
  independent_replication_complete_worlds: 6,
  representative_transport_complete_worlds: 7,
  score_use_alignment_complete_worlds: 6,
  current_validation_lineage_complete_worlds: 7,
  published_coefficient_matches_independent_reference_worlds: 1,
  same_public_decision_surface_worlds: 8,
  total_nonindependent_criterion_records: 300,
  total_post_decision_feedback_count: 100,
  total_overlap_count: 260,
  total_proxy_criterion_records: 100,
  total_transport_selection_bias_count: 60,
  total_unsupported_consequential_decisions: 360,
  total_stale_lineage_decisions: 100,
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  external_organization_identifies_independent_design_data_analysis_publication:false,
  criterion_availability_identifies_criterion_independence:false,
  post_decision_outcome_identifies_pre_treatment_criterion:false,
  decision_agreement_identifies_independent_validity_when_score_shaped_decision:false,
  shared_labels_features_records_answer_material_identify_independent_validation:false,
  independent_criterion_identifies_construct_relevance:false,
  replication_count_identifies_independent_representative_replication:false,
  external_replication_identifies_transport_to_deployed_population:false,
  predictive_validity_identifies_authority_for_consequential_score_use:false,
  historical_validation_identifies_current_validation_after_succession:false,
  public_externally_validated_status_identifies_independent_transportable_use_aligned_current_correctable_authorized_validation:false,
  criterion_transport_use_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent:false,
  complete_external_validation_and_use_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['independent-predecision-transportable-use-aligned-current'];
assert.equal(positive.flags.complete_external_validation_and_use_path, true);
assert.equal(positive.flags.criterion_independence_complete, true);
assert.equal(positive.flags.independent_replication_complete, true);
assert.equal(positive.flags.representative_transport_complete, true);
assert.equal(positive.flags.score_use_alignment_complete, true);
assert.equal(positive.flags.current_validation_lineage_complete, true);
assert.equal(positive.flags.published_matches_independent_reference, true);
assert.equal(new Set(positive.replications.map(replication => replication.legal_entity)).size, 2);

const sameTeam = worlds['same-team-criterion-presented-as-external'];
assert.equal(sameTeam.flags.same_team_criterion_present, true);
assert.equal(sameTeam.flags.criterion_independence_complete, false);
assert.equal(sameTeam.flags.independent_replication_complete, false);
assert.equal(new Set(sameTeam.replications.map(replication => replication.legal_entity)).size, 1);
assert.equal(sameTeam.nonindependent_criterion_record_count, 100);

const postDecision = worlds['post-decision-outcome-used-as-criterion'];
assert.equal(postDecision.flags.post_decision_criterion_present, true);
assert.equal(postDecision.flags.predecision_criterion_complete, false);
assert.equal(postDecision.criterion.decision_feedback_count, 100);
assert.equal(postDecision.flags.independent_replication_complete, true);
assert.equal(postDecision.criterion.independent_reference_coefficient, 0.3);

const overlap = worlds['shared-label-feature-record-contamination'];
assert.equal(overlap.flags.overlap_contamination_present, true);
assert.equal(overlap.overlap_count, 260);
assert.equal(overlap.criterion.label_overlap_count, 100);
assert.equal(overlap.criterion.feature_overlap_count, 40);
assert.equal(overlap.criterion.record_overlap_count, 100);
assert.equal(overlap.criterion.answer_material_overlap_count, 20);
assert.equal(overlap.flags.criterion_independence_complete, false);

const proxy = worlds['independent-but-construct-mismatched-proxy'];
assert.equal(proxy.flags.proxy_criterion_present, true);
assert.equal(proxy.flags.criterion_independence_complete, true);
assert.equal(proxy.flags.construct_relevance_complete, false);
assert.equal(proxy.flags.score_use_alignment_complete, false);
assert.equal(proxy.score_use.unsupported_decision_count, 100);

const transport = worlds['external-replication-nonrepresentative-transport-failure'];
assert.equal(transport.flags.transport_failure_present, true);
assert.equal(transport.flags.representative_transport_complete, false);
assert.equal(transport.transport.validation_population, 'volunteer-high-literacy-v1');
assert.equal(transport.transport.deployment_population, 'population-v1');
assert.equal(transport.transport.selection_bias_count, 60);
assert.equal(transport.transport.transported_count, 40);
assert.equal(transport.replications.every(replication => replication.representative === false), true);

const unsupportedUse = worlds['valid-prediction-unsupported-consequential-use'];
assert.equal(unsupportedUse.flags.unsupported_score_use_present, true);
assert.equal(unsupportedUse.score_use.validated_use, 'advisory_screening');
assert.equal(unsupportedUse.score_use.executed_use, 'consequential_release_choice');
assert.equal(unsupportedUse.score_use.unsupported_decision_count, 100);
assert.equal(unsupportedUse.flags.current_validation_lineage_complete, true);

const succession = worlds['historical-validation-inherited-after-system-succession'];
assert.equal(succession.flags.validation_succession_drift_present, true);
assert.equal(succession.flags.current_validation_lineage_complete, false);
assert.equal(succession.succession.approved_model_version, 'model-v1');
assert.equal(succession.succession.executed_model_version, 'model-v2');
assert.equal(succession.succession.approved_threshold, 0.7);
assert.equal(succession.succession.executed_threshold, 0.6);
assert.equal(succession.stale_lineage_decision_count, 100);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.external_validation_governance_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_validation_status, 'externally_validated');
  assert.equal(world.public_claim.published_criterion_coefficient, 0.8);
  assert.equal(world.public_claim.published_replication_count, 2);
  assert.equal(world.public_claim.scored_population, 100);
  assert.equal(world.public_claim.decision_population, 100);
  assert.equal(world.public_claim.published_decision_agreement, 0.8);
  assert.deepEqual(validatePreferenceCriterionScoreUseChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceCriterionScoreUseWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'external-replication-nonrepresentative-transport-failure')
);
assert.equal(direct.flags.transport_failure_present, true);
assert.equal(direct.flags.criterion_independence_complete, true);
assert.equal(direct.flags.independent_replication_complete, true);
assert.equal(direct.flags.representative_transport_complete, false);

const markdown = renderPreferenceCriterionScoreUseMarkdown(compiled);
assert.match(markdown, /Criterion independence, external validation, transport, and score-use custody/);
assert.match(markdown, /Published criterion coefficient: 80\.00%/);
assert.match(markdown, /independent-predecision-transportable-use-aligned-current/);
assert.match(markdown, /Complete external-validation and use path: true/);
assert.match(markdown, /same-team-criterion-presented-as-external/);
assert.match(markdown, /post-decision-outcome-used-as-criterion/);
assert.match(markdown, /Overlap objects: 260/);
assert.match(markdown, /Transport selection bias count: 60/);
assert.match(markdown, /Validated score use: advisory_screening/);
assert.match(markdown, /Current validation lineage: false/);
assert.doesNotMatch(markdown, /named validator was not independent|publicly authorized|actual manipulation or discrimination/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCriterionScoreUseFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceCriterionScoreUseFixture(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceCriterionScoreUseFixture(missingWorld).some(error => /exactly the eight required/.test(error)));

const publicSurfaceLeak = structuredClone(fixture);
publicSurfaceLeak.worlds[0].public_claim.published_criterion_coefficient = 0.9;
assert.ok(validatePreferenceCriterionScoreUseFixture(publicSurfaceLeak).some(error => /frozen public validation surface/.test(error)));

const replicationCountLeak = structuredClone(fixture);
replicationCountLeak.worlds[0].replications.pop();
assert.ok(validatePreferenceCriterionScoreUseFixture(replicationCountLeak).some(error => /exactly 2 replication records/.test(error)));

const sameTeamRepair = structuredClone(fixture);
const sameTeamFixture = sameTeamRepair.worlds.find(world => world.world_id === 'same-team-criterion-presented-as-external');
sameTeamFixture.criterion.owner_entity = 'VALIDATION-ORG-A';
sameTeamFixture.criterion.designer_entity = 'VALIDATION-ORG-A';
sameTeamFixture.criterion.collector_entity = 'VALIDATION-ORG-B';
sameTeamFixture.criterion.adjudicator_entity = 'VALIDATION-ORG-C';
sameTeamFixture.criterion.scorer_entity = 'VALIDATION-ORG-C';
sameTeamFixture.governance.independent_validation_state = 'complete';
assert.throws(() => compilePreferenceCriterionScoreUseFixture(sameTeamRepair), /same_team_criterion_present mismatch|criterion_independence_complete mismatch/);

const timingRepair = structuredClone(fixture);
const timingFixture = timingRepair.worlds.find(world => world.world_id === 'post-decision-outcome-used-as-criterion');
timingFixture.criterion.timing_state = 'pre_decision';
timingFixture.criterion.decision_feedback_count = 0;
assert.throws(() => compilePreferenceCriterionScoreUseFixture(timingRepair), /post_decision_criterion_present mismatch|predecision_criterion_complete mismatch|criterion_independence_complete mismatch/);

const overlapRepair = structuredClone(fixture);
const overlapFixture = overlapRepair.worlds.find(world => world.world_id === 'shared-label-feature-record-contamination');
overlapFixture.criterion.label_overlap_count = 0;
overlapFixture.criterion.feature_overlap_count = 0;
overlapFixture.criterion.record_overlap_count = 0;
overlapFixture.criterion.answer_material_overlap_count = 0;
overlapFixture.criterion.derived_from_score = false;
overlapFixture.criterion.blind = true;
overlapFixture.replications.forEach(replication => {
  replication.data_control = true;
  replication.blind = true;
  replication.conflict_state = 'none';
});
assert.throws(() => compilePreferenceCriterionScoreUseFixture(overlapRepair), /overlap_contamination_present mismatch|criterion_independence_complete mismatch|independent_replication_complete mismatch/);

const proxyRepair = structuredClone(fixture);
const proxyFixture = proxyRepair.worlds.find(world => world.world_id === 'independent-but-construct-mismatched-proxy');
proxyFixture.criterion.construct = proxyRepair.baseline.reference_criterion_construct;
proxyFixture.score_use.validated_use = 'consequential_release_choice';
proxyFixture.score_use.unsupported_decision_count = 0;
assert.throws(() => compilePreferenceCriterionScoreUseFixture(proxyRepair), /proxy_criterion_present mismatch|construct_relevance_complete mismatch|score_use_alignment_complete mismatch/);

const transportRepair = structuredClone(fixture);
const transportFixture = transportRepair.worlds.find(world => world.world_id === 'external-replication-nonrepresentative-transport-failure');
transportFixture.transport.validation_population = 'population-v1';
transportFixture.transport.eligibility_match = true;
transportFixture.transport.channel_match = true;
transportFixture.transport.subgroup_coverage_complete = true;
transportFixture.transport.selection_bias_count = 0;
transportFixture.transport.transported_count = 100;
transportFixture.replications.forEach(replication => {
  replication.population_id = 'population-v1';
  replication.representative = true;
  replication.sample_count = 100;
});
assert.throws(() => compilePreferenceCriterionScoreUseFixture(transportRepair), /transport_failure_present mismatch|representative_transport_complete mismatch/);

const useRepair = structuredClone(fixture);
const useFixture = useRepair.worlds.find(world => world.world_id === 'valid-prediction-unsupported-consequential-use');
useFixture.score_use.validated_use = 'consequential_release_choice';
useFixture.score_use.abstention_available = true;
useFixture.score_use.override_available = true;
useFixture.score_use.unsupported_decision_count = 0;
assert.throws(() => compilePreferenceCriterionScoreUseFixture(useRepair), /unsupported_score_use_present mismatch|score_use_alignment_complete mismatch/);

const successionRepair = structuredClone(fixture);
const successionFixture = successionRepair.worlds.find(world => world.world_id === 'historical-validation-inherited-after-system-succession');
successionFixture.succession.approved_model_version = 'model-v2';
successionFixture.succession.approved_threshold = 0.6;
successionFixture.succession.approved_policy_version = 'policy-v2';
successionFixture.succession.approved_workflow_version = 'workflow-v2';
successionFixture.succession.revalidation_state = 'current';
assert.throws(() => compilePreferenceCriterionScoreUseFixture(successionRepair), /validation_succession_drift_present mismatch|current_validation_lineage_complete mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].governance.binding_public_authority = true;
assert.ok(validatePreferenceCriterionScoreUseFixture(authorityLeak).some(error => /binding public authority must remain false/.test(error)));

const classificationLeak = structuredClone(fixture);
classificationLeak.expected_classification.external_organization_identifies_independent_design_data_analysis_publication = true;
assert.ok(validatePreferenceCriterionScoreUseFixture(classificationLeak).some(error => /expected_classification/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload[0].coefficient = 0.99;
assert.ok(validatePreferenceCriterionScoreUseBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_external_validation_and_use_worlds = 2;
assert.ok(validatePreferenceCriterionScoreUseBuild(metricInflation).some(error => /complete_external_validation_and_use_worlds must equal 1/.test(error)));

const realWorldLeak = structuredClone(compiled);
realWorldLeak.classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceCriterionScoreUseBuild(realWorldLeak).some(error => /zero intent, real-world effect, and preference-change claims/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCriterionScoreUseFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-criterion-score-use.test.js: OK');
