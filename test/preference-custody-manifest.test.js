import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceCustodyManifest,
  renderPreferenceCustodyManifestMarkdown,
  validatePreferenceCustodyManifest,
  validatePreferenceCustodyManifestBuild
} from '../tools/lib/preference-custody-manifest.mjs';

const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest.json', 'utf8'));
assert.deepEqual(validatePreferenceCustodyManifest(manifest), []);

const buildsByPath = {
  'build/research/performative-synthetic-constituency-fixture.json': {
    schema_version: 'performative-synthetic-constituency-build@1',
    fixture_id: 'exposure-confounding-fixed-preference-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      max_naive_absolute_drift_from_latent: 0.3529411764705882,
      max_propensity_corrected_absolute_drift_from_latent: 0
    },
    classification: {
      exposure_confounding_supported: true,
      preference_identification_without_propensity: 'unavailable',
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: [
      'not_exposed_is_not_rejected',
      'no_click_is_not_negative_preference',
      'raw_engagement_share_is_not_population_preference',
      'propensity_correction_requires_logged_exposure',
      'synthetic_fixture_creates_no_real_world_claim'
    ]
  },
  'build/research/preference-custody-option-set-fixture.json': {
    schema_version: 'preference-custody-build@1',
    fixture_id: 'option-set-starvation-fixed-preference-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_observation_signatures: 2,
      same_population_distinct_observations: true,
      max_unsupported_naive_full_vector_absolute_drift: 0.3
    },
    classification: {
      first_choice_identification_from_raw_choices: 'unavailable',
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[1].required_refusal_rules
  },
  'build/research/preference-observational-equivalence.json': {
    schema_version: 'preference-equifinality-build@1',
    fixture_id: 'observational-equivalence-three-worlds-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_latent_world_signatures: 3,
      distinct_observation_signatures: 1,
      maximum_pairwise_latent_total_variation: 0.3
    },
    classification: {
      latent_first_choice_identification: 'unavailable',
      response_mechanism_identification: 'unavailable',
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[2].required_refusal_rules
  },
  'build/research/preference-attrition-refusal.json': {
    schema_version: 'preference-attrition-build@1',
    fixture_id: 'retained-share-equivalence-three-worlds-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_headline_signatures: 1,
      distinct_full_outcome_signatures: 3,
      distinct_mechanism_signatures: 3,
      observed_total_range: 250,
      exit_total_range: 250,
      nonresponse_total_range: 250
    },
    classification: {
      preference_change_identification_from_headline: 'unavailable',
      strategic_refusal_identification_from_headline: 'unavailable',
      population_support_identification_from_headline: 'unavailable',
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[3].required_refusal_rules
  },
  'build/research/preference-subgroup-capacity.json': {
    schema_version: 'preference-subgroup-build@1',
    fixture_id: 'aggregate-success-equivalence-three-worlds-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_aggregate_headline_signatures: 1,
      distinct_subgroup_outcome_signatures: 3,
      distinct_burden_signatures: 3,
      maximum_subgroup_success_rate_gap: 0.4,
      maximum_adaptation_cost_ratio: 15,
      aggregate_success_rate: 0.8
    },
    classification: {
      subgroup_outcome_identification_from_aggregate: 'unavailable',
      adaptation_burden_identification_from_aggregate: 'unavailable',
      willingness_identification_from_adaptation: 'unavailable',
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[4].required_refusal_rules
  },
  'build/research/preference-standing-authority.json': {
    schema_version: 'preference-standing-build@1',
    fixture_id: 'same-support-different-standing-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_aggregate_headline_signatures: 1,
      distinct_support_evidence_classes: 3,
      distinct_authority_classes: 3,
      distinct_authority_resolution_signatures: 3,
      public_authorized_worlds: 1,
      institutionally_approved_without_public_authorization_worlds: 2,
      binding_public_rejection_worlds: 1,
      aggregate_support_rate: 0.8
    },
    classification: {
      modeled_support_confers_authorization: false,
      advisory_feedback_confers_authorization: false,
      institutional_approval_is_public_authorization: false,
      aggregate_support_identifies_authorization: false,
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[5].required_refusal_rules
  },
  'build/research/preference-agenda-formation.json': {
    schema_version: 'preference-agenda-build@1',
    fixture_id: 'same-forced-choice-different-agenda-v1',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    metrics: {
      distinct_preliminary_headline_signatures: 1,
      distinct_final_option_set_signatures: 2,
      distinct_agenda_resolution_signatures: 4,
      institutionally_controlled_agenda_worlds: 2,
      public_agenda_authority_worlds: 2,
      binding_collective_option_generation_worlds: 1,
      binding_objective_rejection_worlds: 1,
      preliminary_A_share: 0.8,
      latent_C_first_choice_share: 0.8,
      objective_reject_share: 0.6,
      winner_changed_by_binding_amendment: true
    },
    classification: {
      forced_choice_identifies_complete_agenda: false,
      advisory_proposal_confers_agenda_authority: false,
      binding_collective_option_generation_changes_outcome: true,
      forced_choice_support_identifies_objective_acceptance: false,
      synthetic_prediction_can_exercise_agenda_rights: false,
      preference_change_present: false,
      manipulative_intent_inferable: false,
      real_world_effect_claimed: false
    },
    refusal_rules: manifest.controls[6].required_refusal_rules
  }
};

const compiled = compilePreferenceCustodyManifest(manifest, buildsByPath);
assert.deepEqual(validatePreferenceCustodyManifestBuild(compiled), []);
assert.equal(compiled.status, 'laboratory_floor_qualified');
assert.equal(compiled.control_count, 7);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_integrity.all_graph_effect_none, true);
assert.equal(compiled.control_integrity.no_thesis_evidence_consumption, true);
assert.equal(compiled.control_integrity.no_real_world_conclusion, true);
assert.equal(compiled.control_integrity.no_preference_change_claim, true);
assert.equal(compiled.control_integrity.no_intent_inference, true);
assert.equal(compiled.control_integrity.all_required_refusal_rules_present, true);
assert.ok(compiled.refusal_rule_union.includes('same_behavior_does_not_imply_same_preference'));
assert.ok(compiled.open_frontiers.includes('federated_multilevel_and_successor_authority'));
assert.ok(compiled.open_frontiers.includes('negotiated_package_formation_and_collective_bargaining'));
assert.ok(!compiled.open_frontiers.includes('coordinated_refusal_and_collective_bargaining'));
assert.ok(compiled.refusal_rule_union.includes('organized_refusal_is_not_missing_data'));
assert.ok(compiled.refusal_rule_union.includes('distributional_acceptability_requires_external_authority'));
assert.ok(compiled.refusal_rule_union.includes('prediction_is_evidence_not_authority'));
assert.ok(compiled.refusal_rule_union.includes('public_rejection_blocks_implementation'));
assert.ok(compiled.refusal_rule_union.includes('forced_choice_is_not_complete_agenda'));
assert.ok(compiled.refusal_rule_union.includes('binding_objective_rejection_blocks_implementation'));

const markdown = renderPreferenceCustodyManifestMarkdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v5/);
assert.match(markdown, /PC-01: exposure_policy_confounding/);
assert.match(markdown, /PC-02: option_set_starvation/);
assert.match(markdown, /PC-03: observational_equivalence/);
assert.match(markdown, /PC-04: attrition_and_refusal_censoring/);
assert.match(markdown, /PC-05: subgroup_response_capacity_and_burden/);
assert.match(markdown, /PC-06: authority_laundering_and_nonbinding_consultation/);
assert.match(markdown, /PC-07: agenda_formation_and_collective_option_generation/);
assert.match(markdown, /Publicly authorized worlds: 1/);
assert.match(markdown, /Institutional-only approval worlds: 2/);
assert.match(markdown, /Binding public rejection worlds: 1/);
assert.match(markdown, /Binding option-generation worlds: 1/);
assert.match(markdown, /Binding objective-rejection worlds: 1/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|illegitimate institution|suppressed the public|manipulated the public/i);

const missingControl = structuredClone(manifest);
missingControl.controls.pop();
assert.ok(validatePreferenceCustodyManifest(missingControl).some(error => /exactly PC-01, PC-02, PC-03, PC-04, PC-05, PC-06, and PC-07/.test(error)));

const graphLeak = structuredClone(buildsByPath);
graphLeak['build/research/preference-custody-option-set-fixture.json'].graph_effect = 'asserted';
const graphCompiled = compilePreferenceCustodyManifest(manifest, graphLeak);
assert.ok(validatePreferenceCustodyManifestBuild(graphCompiled).some(error => /all_graph_effect_none/.test(error)));

const realWorldLeak = structuredClone(buildsByPath);
realWorldLeak['build/research/preference-observational-equivalence.json'].classification.real_world_effect_claimed = true;
const realWorldCompiled = compilePreferenceCustodyManifest(manifest, realWorldLeak);
assert.ok(validatePreferenceCustodyManifestBuild(realWorldCompiled).some(error => /no_real_world_conclusion/.test(error)));

const missingRule = structuredClone(buildsByPath);
missingRule['build/research/performative-synthetic-constituency-fixture.json'].refusal_rules = [];
const missingRuleCompiled = compilePreferenceCustodyManifest(manifest, missingRule);
assert.ok(validatePreferenceCustodyManifestBuild(missingRuleCompiled).some(error => /all_required_refusal_rules_present/.test(error)));

const attritionLeak = structuredClone(buildsByPath);
attritionLeak['build/research/preference-attrition-refusal.json'].classification.preference_change_present = true;
const attritionLeakCompiled = compilePreferenceCustodyManifest(manifest, attritionLeak);
assert.ok(validatePreferenceCustodyManifestBuild(attritionLeakCompiled).some(error => /no_preference_change_claim/.test(error)));

const subgroupLeak = structuredClone(buildsByPath);
subgroupLeak['build/research/preference-subgroup-capacity.json'].classification.manipulative_intent_inferable = true;
const subgroupLeakCompiled = compilePreferenceCustodyManifest(manifest, subgroupLeak);
assert.ok(validatePreferenceCustodyManifestBuild(subgroupLeakCompiled).some(error => /no_intent_inference/.test(error)));

const authorityLeak = structuredClone(buildsByPath);
authorityLeak['build/research/preference-standing-authority.json'].classification.modeled_support_confers_authorization = true;
const authorityLeakCompiled = compilePreferenceCustodyManifest(manifest, authorityLeak);
assert.ok(validatePreferenceCustodyManifestBuild(authorityLeakCompiled).some(error => /refuse modeled support as authorization/.test(error)));

const resolutionLeak = structuredClone(buildsByPath);
resolutionLeak['build/research/preference-standing-authority.json'].metrics.binding_public_rejection_worlds = 0;
const resolutionLeakCompiled = compilePreferenceCustodyManifest(manifest, resolutionLeak);
assert.ok(validatePreferenceCustodyManifestBuild(resolutionLeakCompiled).some(error => /preserve one binding public rejection/.test(error)));

const agendaLeak = structuredClone(buildsByPath);
agendaLeak['build/research/preference-agenda-formation.json'].classification.forced_choice_identifies_complete_agenda = true;
const agendaLeakCompiled = compilePreferenceCustodyManifest(manifest, agendaLeak);
assert.ok(validatePreferenceCustodyManifestBuild(agendaLeakCompiled).some(error => /refuse forced choice as the complete agenda/.test(error)));

const objectiveLeak = structuredClone(buildsByPath);
objectiveLeak['build/research/preference-agenda-formation.json'].metrics.binding_objective_rejection_worlds = 0;
const objectiveLeakCompiled = compilePreferenceCustodyManifest(manifest, objectiveLeak);
assert.ok(validatePreferenceCustodyManifestBuild(objectiveLeakCompiled).some(error => /preserve one binding objective rejection/.test(error)));

console.log('preference-custody-manifest.test.js: OK');
