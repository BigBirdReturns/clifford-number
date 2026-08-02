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
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from '../tools/lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from '../tools/lib/preference-custody-manifest-v11.mjs';
import { compilePreferenceCustodyManifestV12 } from '../tools/lib/preference-custody-manifest-v12.mjs';
import { compilePreferenceCustodyManifestV13 } from '../tools/lib/preference-custody-manifest-v13.mjs';
import {
  compilePreferenceCustodyManifestV14,
  renderPreferenceCustodyManifestV14Markdown,
  validatePreferenceCustodyManifestV14,
  validatePreferenceCustodyManifestV14Build
} from '../tools/lib/preference-custody-manifest-v14.mjs';

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
const baseV11 = compilePreferenceCustodyManifestV11(
  readJson('data/research/preference-custody/control-manifest-v11.json'),
  baseV10,
  compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json'))
);
const baseV12 = compilePreferenceCustodyManifestV12(
  readJson('data/research/preference-custody/control-manifest-v12.json'),
  baseV11,
  compilePreferenceProvenanceRecoveryFixture(readJson('data/research/preference-custody/provenance-recovery.fixture.json'))
);
const baseV13 = compilePreferenceCustodyManifestV13(
  readJson('data/research/preference-custody/control-manifest-v13.json'),
  baseV12,
  compilePreferenceTrustFederationFixture(readJson('data/research/preference-custody/trust-federation.fixture.json'))
);
const liabilityBuild = compilePreferenceLiabilityRemedyFixture(readJson('data/research/preference-custody/liability-remedy.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v14.json');

assert.deepEqual(validatePreferenceCustodyManifestV14(manifest), []);
const compiled = compilePreferenceCustodyManifestV14(manifest, baseV13, liabilityBuild);
assert.deepEqual(validatePreferenceCustodyManifestV14Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v14');
assert.equal(compiled.status, 'laboratory_floor_v14_qualified');
assert.equal(compiled.control_count, 16);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v13');
assert.equal(compiled.composition.base_control_count, 15);
assert.equal(compiled.composition.extension_control_id, 'PC-16');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.ok(compiled.composition.added_promotion_requirement_count >= 30);
assert.equal(
  compiled.composition.final_promotion_requirement_count,
  compiled.composition.base_promotion_requirement_count + compiled.composition.added_promotion_requirement_count
);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.promotion_boundary.real_case_requires.length);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(
  compiled.controls.map(control => control.control_id).sort(),
  ['PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10','PC-11','PC-12','PC-13','PC-14','PC-15','PC-16']
);

const pc16 = compiled.controls.find(control => control.control_id === 'PC-16');
assert.equal(pc16.failure_class, 'federated_liability_loss_allocation_insurance_and_public_remedy_equifinality');
assert.deepEqual({
  worlds: pc16.proof_summary.world_count,
  signatures: pc16.proof_summary.distinct_liability_remedy_signatures,
  publicStates: pc16.proof_summary.distinct_public_status_signatures,
  complete: pc16.proof_summary.complete_governance_and_remedy_worlds,
  affectedComplete: pc16.proof_summary.complete_affected_party_compensation_worlds,
  noStanding: pc16.proof_summary.direct_standing_absent_worlds,
  caps: pc16.proof_summary.liability_cap_worlds,
  circular: pc16.proof_summary.circular_indemnity_worlds,
  disclaimer: pc16.proof_summary.upstream_disclaimer_worlds,
  exclusion: pc16.proof_summary.insurance_exclusion_worlds,
  forum: pc16.proof_summary.forum_fragmentation_worlds,
  causation: pc16.proof_summary.causation_burden_block_worlds,
  insurancePaid: pc16.proof_summary.insurance_payment_worlds,
  customerConcentrated: pc16.proof_summary.customer_concentrated_loss_worlds,
  externalized: pc16.proof_summary.externalized_loss_worlds,
  unresolved: pc16.proof_summary.unresolved_liability_worlds
}, {
  worlds:8, signatures:8, publicStates:1, complete:1, affectedComplete:2,
  noStanding:3, caps:1, circular:1, disclaimer:1, exclusion:1, forum:2,
  causation:1, insurancePaid:1, customerConcentrated:1, externalized:6, unresolved:4
});
assert.equal(pc16.proof_summary.total_paid_across_worlds, 10750);
assert.equal(pc16.proof_summary.total_affected_party_compensation_paid, 5000);
assert.equal(pc16.proof_summary.total_uncompensated_affected_party_harm, 11000);
assert.equal(pc16.proof_summary.total_externalized_loss, 17250);
assert.equal(pc16.proof_summary.maximum_enforcement_delay_days, 365);
assert.equal(pc16.proof_summary.binding_public_authority_worlds, 0);
for (const key of [
  'technical_recovery_identifies_loss_allocation',
  'vendor_indemnity_identifies_direct_public_remedy',
  'contractual_indemnity_identifies_payment',
  'liability_cap_identifies_complete_compensation',
  'insurance_policy_identifies_covered_or_paid_claim',
  'claim_acceptance_identifies_full_indemnification',
  'customer_payment_identifies_correct_cross_organizational_allocation',
  'forum_availability_identifies_timely_enforceable_remedy',
  'public_recovered_status_identifies_compensated_population',
  'correction_identifies_monetary_or_nonmonetary_restoration',
  'uncompensated_loss_establishes_breach_misconduct_or_intent',
  'binding_public_authority_supported'
]) assert.equal(pc16.proof_summary[key], false);
assert.equal(pc16.proof_summary.complete_joint_allocation_supported_in_at_least_one_world, true);
assert.equal(pc16.proof_summary.complete_affected_party_compensation_supported_in_at_least_one_world, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'federated_liability_loss_allocation_insurance_and_public_remedy'));
assert.ok(!compiled.open_frontiers.includes('federated_trust_governance_liability_and_public_remedy'));
assert.ok(compiled.open_frontiers.includes('public_remedy_enforcement_insolvency_and_collective_claim_governance'));
assert.ok(compiled.open_frontiers.includes('cross_jurisdiction_contribution_subrogation_and_insurance_succession'));
assert.ok(compiled.open_frontiers.includes('multi_party_recovery_succession_and_service_substitution'));
for (const requirement of [
  'contract_identity_effective_date_version_and_complete_incorporated_terms',
  'insurance_claim_submission_reservation_coverage_decision_and_payment',
  'direct_affected_party_standing_third_party_beneficiary_and_collective_claim_state',
  'payer_recipient_amount_date_currency_and_payment_receipt',
  'uncompensated_affected_harm_and_externalized_loss_ledger',
  'insolvency_bankruptcy_security_priority_and_claim_survival_state',
  'organizational_substitution_merger_assignment_and_successor_liability'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV14Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v14/);
assert.match(markdown, /\*\*Controls:\*\* 16/);
assert.match(markdown, /preference-custody-laboratory-floor-v13 \+ PC-16/);
assert.match(markdown, /complete_governance_and_remedy_worlds: 1/);
assert.match(markdown, /complete_affected_party_compensation_worlds: 2/);
assert.match(markdown, /total_externalized_loss: 17250/);
assert.match(markdown, /maximum_enforcement_delay_days: 365/);
assert.match(markdown, /public_remedy_enforcement_insolvency_and_collective_claim_governance/);
assert.match(markdown, /Laboratory controls are real-world evidence: false/);
assert.doesNotMatch(markdown, /named organization breached|insurance coverage established|negligence confirmed|publicly authorized/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v13';
assert.ok(validatePreferenceCustodyManifestV14(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v14/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-17';
assert.ok(validatePreferenceCustodyManifestV14(wrongControl).some(error => /must remain PC-16/.test(error)));

const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV14(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));

const missingRequirements = structuredClone(manifest);
missingRequirements.real_case_requirements_added = [];
assert.ok(validatePreferenceCustodyManifestV14(missingRequirements).some(error => /real-case requirements are incomplete/.test(error)));

const invalidBase = structuredClone(baseV13);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV14(manifest, invalidBase, liabilityBuild), /invalid v13 base build/);

const invalidLiability = structuredClone(liabilityBuild);
invalidLiability.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV14(manifest, baseV13, invalidLiability), /invalid PC-16 build/);

const missingRules = structuredClone(liabilityBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV14(manifest, baseV13, missingRules), /invalid PC-16 build/);

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-16').proof_summary.complete_governance_and_remedy_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV14Build(metricInflation).some(error => /complete_governance_and_remedy_worlds must equal 1/.test(error)));

const policyLeak = structuredClone(compiled);
policyLeak.controls.find(control => control.control_id === 'PC-16').proof_summary.insurance_policy_identifies_covered_or_paid_claim = true;
assert.ok(validatePreferenceCustodyManifestV14Build(policyLeak).some(error => /insurance_policy_identifies_covered_or_paid_claim must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-16').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV14Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const promotionCountLeak = structuredClone(compiled);
promotionCountLeak.composition.final_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV14Build(promotionCountLeak).some(error => /promotion requirement counts do not reconcile|final promotion count does not match/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('federated_trust_governance_liability_and_public_remedy');
assert.ok(validatePreferenceCustodyManifestV14Build(frontierLeak).some(error => /remove the resolved broad liability-remedy frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 9;
assert.ok(validatePreferenceCustodyManifestV14Build(custodyTamper).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV14(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-custody-manifest-v14.test.js: OK');
