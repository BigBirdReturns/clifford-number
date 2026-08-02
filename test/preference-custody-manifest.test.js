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
import {
  compilePreferenceCustodyManifest,
  renderPreferenceCustodyManifestMarkdown,
  validatePreferenceCustodyManifest,
  validatePreferenceCustodyManifestBuild
} from '../tools/lib/preference-custody-manifest.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson('data/research/preference-custody/control-manifest.json');
assert.deepEqual(validatePreferenceCustodyManifest(manifest), []);
assert.equal(manifest.manifest_id, 'preference-custody-laboratory-floor-v8');
assert.equal(manifest.controls.length, 10);
assert.equal(manifest.identification_requirements.length, 10);
assert.ok(!manifest.open_frontiers.includes('dynamic_preference_change'));
assert.ok(manifest.open_frontiers.includes('endogenous_network_and_collective_preference_formation'));

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

const compiled = compilePreferenceCustodyManifest(manifest, buildsByPath);
assert.deepEqual(validatePreferenceCustodyManifestBuild(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v8');
assert.equal(compiled.status, 'laboratory_floor_qualified');
assert.equal(compiled.control_count, 10);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_integrity.all_graph_effect_none, true);
assert.equal(compiled.control_integrity.no_thesis_evidence_consumption, true);
assert.equal(compiled.control_integrity.no_real_world_conclusion, true);
assert.equal(compiled.control_integrity.no_preference_change_claim, true);
assert.equal(compiled.control_integrity.no_intent_inference, true);
assert.equal(compiled.control_integrity.all_required_refusal_rules_present, true);
assert.ok(compiled.refusal_rule_union.includes('same_behavior_does_not_imply_same_preference'));
assert.ok(compiled.refusal_rule_union.includes('package_support_is_not_collective_agreement'));
assert.ok(compiled.refusal_rule_union.includes('failed_ratification_is_binding_impasse_not_missing_data'));
assert.ok(compiled.refusal_rule_union.includes('validation_binds_exact_artifact_metric_policy_and_scope'));
assert.ok(compiled.refusal_rule_union.includes('old_badge_cannot_authorize_successor'));
assert.ok(compiled.refusal_rule_union.includes('aggregate_shift_is_not_individual_preference_change'));
assert.ok(compiled.refusal_rule_union.includes('panel_continuity_is_not_instrument_invariance'));
assert.ok(compiled.refusal_rule_union.includes('imputation_is_not_observed_response'));
assert.ok(compiled.refusal_rule_union.includes('dynamic_preference_change_does_not_confer_public_authority'));
assert.ok(compiled.open_frontiers.includes('cross_organizational_vendor_customer_and_regulator_succession'));
assert.ok(!compiled.open_frontiers.includes('dynamic_preference_change'));

const controls = Object.fromEntries(compiled.controls.map(control => [control.control_id, control]));
assert.equal(controls['PC-10'].failure_class, 'dynamic_preference_change_and_measurement_equifinality');
assert.equal(controls['PC-10'].proof_summary.world_count, 6);
assert.equal(controls['PC-10'].proof_summary.distinct_observed_headline_signatures, 1);
assert.equal(controls['PC-10'].proof_summary.distinct_latent_headline_signatures, 2);
assert.equal(controls['PC-10'].proof_summary.distinct_mechanism_signatures, 6);
assert.equal(controls['PC-10'].proof_summary.worlds_with_individual_conversion, 2);
assert.equal(controls['PC-10'].proof_summary.worlds_without_individual_conversion, 4);
assert.equal(controls['PC-10'].proof_summary.worlds_with_stable_panel_identity, 5);
assert.equal(controls['PC-10'].proof_summary.worlds_with_composition_change, 1);
assert.equal(controls['PC-10'].proof_summary.worlds_with_instrument_drift, 1);
assert.equal(controls['PC-10'].proof_summary.worlds_with_strategic_compliance, 1);
assert.equal(controls['PC-10'].proof_summary.worlds_with_imputation, 1);
assert.equal(controls['PC-10'].proof_summary.worlds_with_targeted_performative_path, 1);
assert.ok(Math.abs(controls['PC-10'].proof_summary.maximum_observed_latent_total_variation - 0.2) < 1e-12);
assert.ok(Math.abs(controls['PC-10'].proof_summary.observed_A_share_shift - 0.2) < 1e-12);
assert.equal(controls['PC-10'].proof_summary.aggregate_shift_identifies_individual_preference_change, false);
assert.equal(controls['PC-10'].proof_summary.stable_panel_identity_alone_is_sufficient, false);
assert.equal(controls['PC-10'].proof_summary.instrument_invariance_or_crosswalk_required, true);
assert.equal(controls['PC-10'].proof_summary.reported_choice_always_equals_latent_preference, false);
assert.equal(controls['PC-10'].proof_summary.targeted_exposure_conversion_supports_performative_path, true);
assert.equal(controls['PC-10'].proof_summary.targeted_exposure_conversion_establishes_manipulation, false);
assert.equal(controls['PC-10'].proof_summary.binding_public_authority_supported, false);

const markdown = renderPreferenceCustodyManifestMarkdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v8/);
assert.match(markdown, /\*\*Controls:\*\* 10/);
assert.match(markdown, /PC-01: exposure_policy_confounding/);
assert.match(markdown, /PC-02: option_set_starvation/);
assert.match(markdown, /PC-03: observational_equivalence/);
assert.match(markdown, /PC-04: attrition_and_refusal_censoring/);
assert.match(markdown, /PC-05: subgroup_response_capacity_and_burden/);
assert.match(markdown, /PC-06: authority_laundering_and_nonbinding_consultation/);
assert.match(markdown, /PC-07: agenda_formation_and_collective_option_generation/);
assert.match(markdown, /PC-08: negotiated_package_formation_and_collective_bargaining/);
assert.match(markdown, /PC-09: model_metric_policy_and_validation_succession/);
assert.match(markdown, /PC-10: dynamic_preference_change_and_measurement_equifinality/);
assert.match(markdown, /Dynamic worlds: 6/);
assert.match(markdown, /Distinct observed headlines: 1/);
assert.match(markdown, /Distinct latent headlines: 2/);
assert.match(markdown, /Distinct mechanisms: 6/);
assert.match(markdown, /Targeted performative-path worlds: 1/);
assert.match(markdown, /Frozen observed A shift: 20\.00%/);
assert.match(markdown, /Maximum observed-latent separation: 20\.00%/);
assert.match(markdown, /dynamic_preference_change/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|changed audience preferences|manipulated the public|publicly authorized the intervention/i);

const missingControl = structuredClone(manifest);
missingControl.controls.pop();
assert.ok(validatePreferenceCustodyManifest(missingControl).some(error => /exactly PC-01 through PC-10/.test(error)));

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v7';
assert.ok(validatePreferenceCustodyManifest(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v8/.test(error)));

const retainedFrontier = structuredClone(manifest);
retainedFrontier.open_frontiers.push('dynamic_preference_change');
assert.ok(validatePreferenceCustodyManifest(retainedFrontier).some(error => /must be removed from open frontiers/.test(error)));

const missingDynamicStage = structuredClone(manifest);
missingDynamicStage.identification_requirements = missingDynamicStage.identification_requirements.filter(item => item.stage !== 'dynamic_preference_change');
assert.ok(validatePreferenceCustodyManifest(missingDynamicStage).some(error => /identification requirement stages are incomplete/.test(error)));

const graphLeak = structuredClone(buildsByPath);
graphLeak['build/research/preference-custody-option-set-fixture.json'].graph_effect = 'asserted';
const graphCompiled = compilePreferenceCustodyManifest(manifest, graphLeak);
assert.ok(validatePreferenceCustodyManifestBuild(graphCompiled).some(error => /all_graph_effect_none/.test(error)));

const realWorldLeak = structuredClone(buildsByPath);
realWorldLeak['build/research/preference-dynamic-change.json'].classification.real_world_effect_claimed = true;
const realWorldCompiled = compilePreferenceCustodyManifest(manifest, realWorldLeak);
assert.ok(validatePreferenceCustodyManifestBuild(realWorldCompiled).some(error => /no_real_world_conclusion/.test(error)));

const missingRule = structuredClone(buildsByPath);
missingRule['build/research/preference-dynamic-change.json'].refusal_rules = [];
const missingRuleCompiled = compilePreferenceCustodyManifest(manifest, missingRule);
assert.ok(validatePreferenceCustodyManifestBuild(missingRuleCompiled).some(error => /all_required_refusal_rules_present/.test(error)));

const preferenceClaimLeak = structuredClone(buildsByPath);
preferenceClaimLeak['build/research/preference-dynamic-change.json'].classification.preference_change_present = true;
const preferenceClaimCompiled = compilePreferenceCustodyManifest(manifest, preferenceClaimLeak);
assert.ok(validatePreferenceCustodyManifestBuild(preferenceClaimCompiled).some(error => /no_preference_change_claim/.test(error)));

const authorityLeak = structuredClone(buildsByPath);
authorityLeak['build/research/preference-standing-authority.json'].classification.modeled_support_confers_authorization = true;
const authorityLeakCompiled = compilePreferenceCustodyManifest(manifest, authorityLeak);
assert.ok(validatePreferenceCustodyManifestBuild(authorityLeakCompiled).some(error => /refuse modeled support as authorization/.test(error)));

const agendaLeak = structuredClone(buildsByPath);
agendaLeak['build/research/preference-agenda-formation.json'].classification.forced_choice_identifies_complete_agenda = true;
const agendaLeakCompiled = compilePreferenceCustodyManifest(manifest, agendaLeak);
assert.ok(validatePreferenceCustodyManifestBuild(agendaLeakCompiled).some(error => /refuse forced choice as the complete agenda/.test(error)));

const packageLeak = structuredClone(buildsByPath);
packageLeak['build/research/preference-package-bargaining.json'].classification.high_package_support_is_collective_agreement = true;
const packageLeakCompiled = compilePreferenceCustodyManifest(manifest, packageLeak);
assert.ok(validatePreferenceCustodyManifestBuild(packageLeakCompiled).some(error => /refuse package support as collective agreement/.test(error)));

const runtimeLeak = structuredClone(buildsByPath);
runtimeLeak['build/research/preference-succession-validation.json'].classification.prior_validation_transfers_across_runtime_change = true;
const runtimeLeakCompiled = compilePreferenceCustodyManifest(manifest, runtimeLeak);
assert.ok(validatePreferenceCustodyManifestBuild(runtimeLeakCompiled).some(error => /refuse validation transfer across runtime change/.test(error)));

const dynamicHeadlineLeak = structuredClone(buildsByPath);
dynamicHeadlineLeak['build/research/preference-dynamic-change.json'].metrics.distinct_observed_headline_signatures = 2;
const dynamicHeadlineCompiled = compilePreferenceCustodyManifest(manifest, dynamicHeadlineLeak);
assert.ok(validatePreferenceCustodyManifestBuild(dynamicHeadlineCompiled).some(error => /one shared observed headline/.test(error)));

const dynamicConversionLeak = structuredClone(buildsByPath);
dynamicConversionLeak['build/research/preference-dynamic-change.json'].metrics.worlds_with_individual_conversion = 6;
const dynamicConversionCompiled = compilePreferenceCustodyManifest(manifest, dynamicConversionLeak);
assert.ok(validatePreferenceCustodyManifestBuild(dynamicConversionCompiled).some(error => /two conversion worlds/.test(error)));

const dynamicManipulationLeak = structuredClone(buildsByPath);
dynamicManipulationLeak['build/research/preference-dynamic-change.json'].classification.targeted_exposure_conversion_establishes_manipulation = true;
const dynamicManipulationCompiled = compilePreferenceCustodyManifest(manifest, dynamicManipulationLeak);
assert.ok(validatePreferenceCustodyManifestBuild(dynamicManipulationCompiled).some(error => /refuse performative path as manipulation/.test(error)));

const dynamicAuthorityLeak = structuredClone(buildsByPath);
dynamicAuthorityLeak['build/research/preference-dynamic-change.json'].classification.binding_public_authority_supported = true;
const dynamicAuthorityCompiled = compilePreferenceCustodyManifest(manifest, dynamicAuthorityLeak);
assert.ok(validatePreferenceCustodyManifestBuild(dynamicAuthorityCompiled).some(error => /refuse dynamic change as public authority/.test(error)));

console.log('preference-custody-manifest.test.js: OK');
