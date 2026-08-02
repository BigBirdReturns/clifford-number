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
import { compilePreferenceCustodyManifest } from '../tools/lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from '../tools/lib/preference-custody-manifest-v9.mjs';
import {
  compilePreferenceCustodyManifestV10,
  renderPreferenceCustodyManifestV10Markdown,
  validatePreferenceCustodyManifestV10,
  validatePreferenceCustodyManifestV10Build
} from '../tools/lib/preference-custody-manifest-v10.mjs';

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
const deliberativeBuild = compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json'));
const manifest = readJson('data/research/preference-custody/control-manifest-v10.json');

assert.deepEqual(validatePreferenceCustodyManifestV10(manifest), []);
const compiled = compilePreferenceCustodyManifestV10(manifest, baseV9, deliberativeBuild);
assert.deepEqual(validatePreferenceCustodyManifestV10Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v10');
assert.equal(compiled.status, 'laboratory_floor_v10_qualified');
assert.equal(compiled.control_count, 12);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v9');
assert.equal(compiled.composition.base_control_count, 11);
assert.equal(compiled.composition.extension_control_id, 'PC-12');
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
for (const value of Object.values(compiled.control_integrity)) assert.equal(value, true);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), ['PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10','PC-11','PC-12']);

const pc12 = compiled.controls.find(control => control.control_id === 'PC-12');
assert.equal(pc12.failure_class, 'deliberative_reason_exchange_vote_and_summary_equifinality');
assert.deepEqual({
  worlds:pc12.proof_summary.world_count,
  published:pc12.proof_summary.distinct_published_disposition_signatures,
  private:pc12.proof_summary.distinct_private_preference_signatures,
  ballots:pc12.proof_summary.distinct_ballot_signatures,
  processes:pc12.proof_summary.distinct_process_signatures,
  converted:pc12.proof_summary.worlds_with_private_conversion,
  nonconverted:pc12.proof_summary.worlds_without_private_conversion,
  reciprocal:pc12.proof_summary.worlds_with_reciprocal_reason_exchange,
  uptake:pc12.proof_summary.worlds_with_reason_uptake,
  amendment:pc12.proof_summary.worlds_with_amendment_uptake,
  briefing:pc12.proof_summary.worlds_with_one_way_briefing,
  voteDivergence:pc12.proof_summary.worlds_with_vote_private_divergence,
  logroll:pc12.proof_summary.worlds_with_strategic_logroll,
  summaryDivergence:pc12.proof_summary.worlds_with_summary_vote_divergence,
  deliberation:pc12.proof_summary.worlds_with_deliberative_process,
  reasonResponsive:pc12.proof_summary.worlds_with_reason_responsive_collective_position
}, {
  worlds:6,published:1,private:2,ballots:2,processes:6,converted:3,nonconverted:3,
  reciprocal:1,uptake:1,amendment:1,briefing:1,voteDivergence:2,logroll:1,
  summaryDivergence:1,deliberation:1,reasonResponsive:1
});
assert.ok(Math.abs(pc12.proof_summary.baseline_A_share - 0.6) < 1e-12);
assert.ok(Math.abs(pc12.proof_summary.published_A_share - 0.8) < 1e-12);
assert.ok(Math.abs(pc12.proof_summary.published_A_share_shift - 0.2) < 1e-12);
assert.ok(Math.abs(pc12.proof_summary.maximum_published_private_total_variation - 0.2) < 1e-12);
assert.ok(Math.abs(pc12.proof_summary.maximum_published_vote_total_variation - 0.2) < 1e-12);
for (const key of [
  'published_disposition_identifies_private_preference','information_exposure_is_deliberation',
  'one_way_briefing_is_reciprocal_reason_exchange','speaking_opportunity_establishes_reason_uptake',
  'majority_vote_is_consensus','strategic_logroll_is_focal_preference_conversion',
  'published_summary_is_actual_ballot','reason_exchange_confers_binding_authority',
  'amendment_is_collective_agreement_without_disposition_rule','binding_public_authority_supported'
]) assert.equal(pc12.proof_summary[key], false);
assert.equal(pc12.proof_summary.deliberative_process_supported_in_at_least_one_world, true);
assert.equal(pc12.proof_summary.reason_responsive_collective_position_supported_in_at_least_one_world, true);

assert.ok(compiled.identification_requirements.some(item => item.stage === 'deliberative_reason_exchange_and_collective_position'));
assert.ok(!compiled.open_frontiers.includes('collective_deliberation_reason_exchange_and_emergent_group_preference'));
assert.ok(compiled.open_frontiers.includes('collective_reason_quality_epistemic_diversity_and_information_cascades'));
assert.ok(compiled.open_frontiers.includes('deliberative_scale_representation_and_nonparticipant_standing'));
for (const requirement of [
  'complete_transcript_or_structured_turn_ledger',
  'claim_evidence_and_source_provenance',
  'reason_uptake_rejection_or_no_disposition_state',
  'private_pre_and_post_process_preference',
  'summary_to_ballot_fidelity_and_appeal_route',
  'implementation_consequence_and_decision_receipt'
]) assert.ok(compiled.promotion_boundary.real_case_requires.includes(requirement));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

const markdown = renderPreferenceCustodyManifestV10Markdown(compiled);
assert.match(markdown, /Preference custody laboratory floor v10/);
assert.match(markdown, /\*\*Controls:\*\* 12/);
assert.match(markdown, /preference-custody-laboratory-floor-v9 \+ PC-12/);
assert.match(markdown, /worlds_with_reciprocal_reason_exchange: 1/);
assert.match(markdown, /worlds_with_summary_vote_divergence: 1/);
assert.match(markdown, /worlds_with_deliberative_process: 1/);
assert.match(markdown, /published_A_share_shift: 20\.00%/);
assert.doesNotMatch(markdown, /consensus confirmed|publicly authorized|manipulated participants|named institution distorted/i);

const oldManifestId = structuredClone(manifest);
oldManifestId.manifest_id = 'preference-custody-laboratory-floor-v9';
assert.ok(validatePreferenceCustodyManifestV10(oldManifestId).some(error => /manifest_id must remain preference-custody-laboratory-floor-v10/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-13';
assert.ok(validatePreferenceCustodyManifestV10(wrongControl).some(error => /must remain PC-12/.test(error)));

const missingFrontier = structuredClone(manifest);
missingFrontier.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV10(missingFrontier).some(error => /successor frontiers are incomplete/.test(error)));

const invalidBase = structuredClone(baseV9);
invalidBase.status = 'unqualified';
assert.throws(() => compilePreferenceCustodyManifestV10(manifest, invalidBase, deliberativeBuild), /invalid v9 base build/);

const invalidDeliberative = structuredClone(deliberativeBuild);
invalidDeliberative.graph_effect = 'asserted';
assert.throws(() => compilePreferenceCustodyManifestV10(manifest, baseV9, invalidDeliberative), /invalid PC-12 build/);

const missingRules = structuredClone(deliberativeBuild);
missingRules.refusal_rules = [];
assert.throws(() => compilePreferenceCustodyManifestV10(manifest, baseV9, missingRules), /invalid PC-12 build/);

const headlineInflation = structuredClone(compiled);
headlineInflation.controls.find(control => control.control_id === 'PC-12').proof_summary.distinct_published_disposition_signatures = 2;
assert.ok(validatePreferenceCustodyManifestV10Build(headlineInflation).some(error => /distinct_published_disposition_signatures must equal 1/.test(error)));

const consensusLeak = structuredClone(compiled);
consensusLeak.controls.find(control => control.control_id === 'PC-12').proof_summary.majority_vote_is_consensus = true;
assert.ok(validatePreferenceCustodyManifestV10Build(consensusLeak).some(error => /majority_vote_is_consensus must remain false/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.controls.find(control => control.control_id === 'PC-12').proof_summary.binding_public_authority_supported = true;
assert.ok(validatePreferenceCustodyManifestV10Build(authorityLeak).some(error => /binding_public_authority_supported must remain false/.test(error)));

const frontierLeak = structuredClone(compiled);
frontierLeak.open_frontiers.push('collective_deliberation_reason_exchange_and_emergent_group_preference');
assert.ok(validatePreferenceCustodyManifestV10Build(frontierLeak).some(error => /remove the resolved broad deliberative frontier/.test(error)));

const custodyTamper = structuredClone(compiled);
custodyTamper.custody_chain[1].payload.control.proof_summary.world_count = 7;
assert.ok(validatePreferenceCustodyManifestV10Build(custodyTamper).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v10.test.js: OK');
