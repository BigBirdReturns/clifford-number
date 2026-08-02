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
import { compilePreferenceTrustFederationFixture } from '../tools/lib/preference-trust-federation.mjs';
import { compilePreferenceLiabilityRemedyFixture } from '../tools/lib/preference-liability-remedy.mjs';
import { compilePreferenceRemedyEnforcementFixture } from '../tools/lib/preference-remedy-enforcement.mjs';
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from '../tools/lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from '../tools/lib/preference-custody-manifest-v11.mjs';
import { compilePreferenceCustodyManifestV12 } from '../tools/lib/preference-custody-manifest-v12.mjs';
import { compilePreferenceCustodyManifestV13 } from '../tools/lib/preference-custody-manifest-v13.mjs';
import { compilePreferenceCustodyManifestV14 } from '../tools/lib/preference-custody-manifest-v14.mjs';
import {
  compilePreferenceCustodyManifestV15,
  renderPreferenceCustodyManifestV15Markdown,
  validatePreferenceCustodyManifestV15,
  validatePreferenceCustodyManifestV15Build
} from '../tools/lib/preference-custody-manifest-v15.mjs';

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
const baseV9 = compilePreferenceCustodyManifestV9(readJson('data/research/preference-custody/control-manifest-v9.json'), baseV8, compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json')));
const baseV10 = compilePreferenceCustodyManifestV10(readJson('data/research/preference-custody/control-manifest-v10.json'), baseV9, compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json')));
const baseV11 = compilePreferenceCustodyManifestV11(readJson('data/research/preference-custody/control-manifest-v11.json'), baseV10, compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json')));
const baseV12 = compilePreferenceCustodyManifestV12(readJson('data/research/preference-custody/control-manifest-v12.json'), baseV11, compilePreferenceProvenanceRecoveryFixture(readJson('data/research/preference-custody/provenance-recovery.fixture.json')));
const baseV13 = compilePreferenceCustodyManifestV13(readJson('data/research/preference-custody/control-manifest-v13.json'), baseV12, compilePreferenceTrustFederationFixture(readJson('data/research/preference-custody/trust-federation.fixture.json')));
const baseV14 = compilePreferenceCustodyManifestV14(readJson('data/research/preference-custody/control-manifest-v14.json'), baseV13, compilePreferenceLiabilityRemedyFixture(readJson('data/research/preference-custody/liability-remedy.fixture.json')));
const remedyBuild = compilePreferenceRemedyEnforcementFixture(readJson('data/research/preference-custody/remedy-enforcement.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v15.json');

assert.deepEqual(validatePreferenceCustodyManifestV15(manifest), []);
const compiled = compilePreferenceCustodyManifestV15(manifest, baseV14, remedyBuild);
assert.deepEqual(validatePreferenceCustodyManifestV15Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v15');
assert.equal(compiled.status, 'laboratory_floor_v15_qualified');
assert.equal(compiled.control_count, 17);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v14');
assert.equal(compiled.composition.base_control_count, 16);
assert.equal(compiled.composition.extension_control_id, 'PC-17');
assert.ok(compiled.composition.added_promotion_requirement_count >= 31);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + compiled.composition.added_promotion_requirement_count);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.promotion_boundary.real_case_requires.length);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), ['PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10','PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17']);

const pc17 = compiled.controls.find(control => control.control_id === 'PC-17');
assert.equal(pc17.failure_class, 'collective_remedy_enforcement_insolvency_priority_and_successor_equifinality');
assert.deepEqual({
  worlds: pc17.proof_summary.world_count,
  signatures: pc17.proof_summary.distinct_enforcement_signatures,
  public: pc17.proof_summary.distinct_public_status_signatures,
  complete: pc17.proof_summary.complete_durable_collective_remedy_worlds,
  stayed: pc17.proof_summary.appeal_stay_worlds,
  insolvency: pc17.proof_summary.insolvency_priority_gap_worlds,
  passThrough: pc17.proof_summary.pass_through_failure_worlds,
  fragmented: pc17.proof_summary.claim_fragmentation_worlds,
  successor: pc17.proof_summary.successor_liability_gap_worlds,
  clawback: pc17.proof_summary.clawback_risk_worlds,
  nonmonetary: pc17.proof_summary.nonmonetary_only_worlds,
  gross: pc17.proof_summary.full_gross_payment_worlds,
  grossAffected: pc17.proof_summary.full_gross_affected_payment_worlds,
  durable: pc17.proof_summary.full_durable_compensation_worlds,
  zeroDurable: pc17.proof_summary.zero_durable_compensation_worlds,
  collective: pc17.proof_summary.collective_standing_worlds
}, {
  worlds:8, signatures:8, public:1, complete:1, stayed:1, insolvency:2,
  passThrough:1, fragmented:1, successor:2, clawback:1, nonmonetary:1,
  gross:3, grossAffected:2, durable:1, zeroDurable:5, collective:7
});
assert.equal(pc17.proof_summary.total_gross_paid, 6600);
assert.equal(pc17.proof_summary.total_gross_paid_to_affected_people, 4600);
assert.equal(pc17.proof_summary.total_durable_compensation_paid, 2600);
assert.equal(pc17.proof_summary.total_unpaid_durable_obligation, 13400);
assert.equal(pc17.proof_summary.maximum_enforcement_delay_days, 365);
assert.equal(pc17.proof_summary.binding_public_authority_worlds, 0);
for (const key of [
  'judgment_or_settlement_identifies_collected_remedy','appeal_right_identifies_unstayed_enforcement',
  'escrow_announcement_identifies_funded_segregated_account','intermediary_payment_identifies_affected_party_payment',
  'nominal_collective_eligibility_identifies_usable_collective_standing','individual_claim_route_identifies_population_remedy',
  'gross_provisional_payment_identifies_durable_compensation','insolvency_claim_identifies_priority_or_recovery',
  'technical_correction_identifies_monetary_restoration','successor_acquisition_identifies_liability_assumption',
  'public_remedied_status_identifies_completed_durable_remedy','uncollected_award_establishes_breach_misconduct_or_intent',
  'binding_public_authority_supported'
]) assert.equal(pc17.proof_summary[key], false);
assert.equal(pc17.proof_summary.complete_durable_collective_remedy_supported_in_at_least_one_world, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'collective_remedy_enforcement_insolvency_priority_and_successor'));
assert.ok(!compiled.open_frontiers.includes('public_remedy_enforcement_insolvency_and_collective_claim_governance'));
assert.ok(compiled.open_frontiers.includes('collective_claim_representation_opt_out_and_distribution_governance'));
assert.ok(compiled.open_frontiers.includes('remedy_security_insolvency_priority_and_successor_enforcement'));
assert.ok(compiled.open_frontiers.includes('cross_jurisdiction_contribution_subrogation_and_insurance_succession'));
for (const requirement of [
  'eligible_claimant_population_identity_rule_and_denominator',
  'collective_class_representative_assignment_and_individual_standing',
  'escrow_trust_account_identity_bank_and_funding_receipt',
  'affected_party_recipient_payment_and_distribution_receipt',
  'proof_of_claim_allowance_objection_and_priority_class',
  'successor_assumption_exclusion_guarantee_and_security_state',
  'gross_paid_durable_paid_unpaid_obligation_and_delay_ledger'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV15Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v15/);
assert.match(markdown, /\*\*Controls:\*\* 17/);
assert.match(markdown, /preference-custody-laboratory-floor-v14 \+ PC-17/);
assert.match(markdown, /complete_durable_collective_remedy_worlds: 1/);
assert.match(markdown, /total_unpaid_durable_obligation: 13400/);
assert.match(markdown, /collective_claim_representation_opt_out_and_distribution_governance/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /named judgment uncollectible|successor liability established|breach confirmed|publicly authorized/i);

const wrongId = structuredClone(manifest);
wrongId.manifest_id = 'preference-custody-laboratory-floor-v14';
assert.ok(validatePreferenceCustodyManifestV15(wrongId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v15/.test(error)));
const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-18';
assert.ok(validatePreferenceCustodyManifestV15(wrongControl).some(error => /must remain PC-17/.test(error)));
const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV15(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));
const missingRequirements = structuredClone(manifest);
missingRequirements.real_case_requirements_added = [];
assert.ok(validatePreferenceCustodyManifestV15(missingRequirements).some(error => /real-case requirements are incomplete/.test(error)));

const invalidBase = structuredClone(baseV14);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV15(manifest, invalidBase, remedyBuild), /invalid v14 base build/);
const invalidRemedy = structuredClone(remedyBuild);
invalidRemedy.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV15(manifest, baseV14, invalidRemedy), /invalid PC-17 build/);
const missingRules = structuredClone(remedyBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV15(manifest, baseV14, missingRules), /invalid PC-17 build/);

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-17').proof_summary.complete_durable_collective_remedy_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV15Build(metricInflation).some(error => /complete_durable_collective_remedy_worlds must equal 1/.test(error)));
const collectionLeak = structuredClone(compiled);
collectionLeak.controls.find(control => control.control_id === 'PC-17').proof_summary.judgment_or_settlement_identifies_collected_remedy = true;
assert.ok(validatePreferenceCustodyManifestV15Build(collectionLeak).some(error => /judgment_or_settlement_identifies_collected_remedy must remain false/.test(error)));
const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-17').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV15Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));
const countLeak = structuredClone(compiled);
countLeak.composition.final_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV15Build(countLeak).some(error => /promotion requirement counts do not reconcile|final promotion count does not match/.test(error)));
const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('public_remedy_enforcement_insolvency_and_collective_claim_governance');
assert.ok(validatePreferenceCustodyManifestV15Build(frontierLeak).some(error => /remove the resolved broad remedy-enforcement frontier/.test(error)));
const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 9;
assert.ok(validatePreferenceCustodyManifestV15Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v15.test.js: OK');
