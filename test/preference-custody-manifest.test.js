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
  }
};

const compiled = compilePreferenceCustodyManifest(manifest, buildsByPath);
assert.deepEqual(validatePreferenceCustodyManifestBuild(compiled), []);
assert.equal(compiled.status, 'laboratory_floor_qualified');
assert.equal(compiled.control_count, 4);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_integrity.all_graph_effect_none, true);
assert.equal(compiled.control_integrity.no_thesis_evidence_consumption, true);
assert.equal(compiled.control_integrity.no_real_world_conclusion, true);
assert.equal(compiled.control_integrity.no_preference_change_claim, true);
assert.equal(compiled.control_integrity.no_intent_inference, true);
assert.equal(compiled.control_integrity.all_required_refusal_rules_present, true);
assert.ok(compiled.refusal_rule_union.includes('same_behavior_does_not_imply_same_preference'));
assert.ok(compiled.open_frontiers.includes('binding_public_standing_and_objective_control'));
assert.ok(compiled.refusal_rule_union.includes('organized_refusal_is_not_missing_data'));

const markdown = renderPreferenceCustodyManifestMarkdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v2/);
assert.match(markdown, /PC-01: exposure_policy_confounding/);
assert.match(markdown, /PC-02: option_set_starvation/);
assert.match(markdown, /PC-03: observational_equivalence/);
assert.match(markdown, /PC-04: attrition_and_refusal_censoring/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|manipulated the public/i);

const missingControl = structuredClone(manifest);
missingControl.controls.pop();
assert.ok(validatePreferenceCustodyManifest(missingControl).some(error => /exactly PC-01, PC-02, PC-03, and PC-04/.test(error)));

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

console.log('preference-custody-manifest.test.js: OK');
