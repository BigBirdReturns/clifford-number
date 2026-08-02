import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceReleaseAuthorityFixture,
  renderPreferenceReleaseAuthorityMarkdown,
  simulatePreferenceReleaseAuthorityWorld,
  validatePreferenceReleaseAuthorityBuild,
  validatePreferenceReleaseAuthorityChain,
  validatePreferenceReleaseAuthorityFixture
} from '../tools/lib/preference-release-authority.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/release-authority.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceReleaseAuthorityFixture(fixture), []);

const compiled = compilePreferenceReleaseAuthorityFixture(fixture);
assert.deepEqual(validatePreferenceReleaseAuthorityBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-all-claims-released-status-different-notice-exit-authority-v1');
assert.equal(compiled.status, 'release_notice_exit_and_binding_authority_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_release_authority_signatures: 8,
  complete_notice_exit_release_worlds: 1,
  delivery_without_comprehension_worlds: 4,
  notice_overload_worlds: 1,
  accessibility_failure_worlds: 1,
  meaningful_exit_failure_worlds: 5,
  release_scope_drift_worlds: 2,
  future_claim_release_worlds: 2,
  nonparticipant_binding_worlds: 1,
  payment_as_consent_worlds: 1,
  approved_binding_version_mismatch_worlds: 2,
  independent_review_and_correction_complete_worlds: 1,
  notice_comprehension_complete_worlds: 4,
  full_notice_delivery_worlds: 8,
  full_affected_payment_worlds: 8,
  total_affected_people_without_notice_comprehension: 245,
  total_failed_optout_attempts: 55,
  total_nonparticipant_bound_people: 20,
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  notice_delivery_identifies_received_understood_accessible_usable_notice:false,
  formal_optout_identifies_meaningful_exit:false,
  payment_acceptance_identifies_informed_release_agreement:false,
  approval_or_collective_judgment_identifies_consent_by_every_bound_person:false,
  approved_release_identifies_binding_release:false,
  release_label_identifies_operative_text_version_scope_or_time_horizon:false,
  narrow_disclosed_release_identifies_narrow_binding_release:false,
  representation_confers_authority_to_bind_nonparticipants_or_future_claimants:false,
  full_compensation_identifies_informed_release_or_objective_control:false,
  objection_or_appeal_identifies_effective_explanation_correction_or_exit:false,
  release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent:false,
  public_all_claims_released_status_identifies_complete_informed_accessible_exit_capable_authorized_release:false,
  complete_notice_exit_release_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const complete = worlds['complete-accessible-comprehended-exitable-narrow-release'];
assert.equal(complete.flags.complete_notice_exit_release_path, true);
assert.equal(complete.flags.notice_comprehension_complete, true);
assert.equal(complete.flags.independent_review_and_correction_complete, true);
assert.equal(complete.notice.comprehended_count, 100);
assert.equal(complete.exit.meaningful_exit, true);
assert.equal(complete.release.binding_release_id, 'RELEASE-INCIDENT-V1');
assert.equal(complete.release.binding_scope, 'incident_specific_existing_claims');
assert.equal(complete.release.explicit_agreement_count, 100);
assert.equal(complete.affected_people_without_notice_comprehension, 0);

const unread = worlds['notice-delivered-but-mostly-unacknowledged-and-unread'];
assert.equal(unread.flags.delivery_without_comprehension_present, true);
assert.equal(unread.notice.delivered_count, 100);
assert.equal(unread.notice.comprehended_count, 10);
assert.equal(unread.affected_people_without_notice_comprehension, 90);

const overload = worlds['material-release-and-exit-terms-buried-in-overloaded-notice'];
assert.equal(overload.flags.notice_overload_present, true);
assert.equal(overload.notice.material_terms_prominent, false);
assert.equal(overload.notice.comprehended_count, 35);

const access = worlds['language-and-accessibility-gaps-block-usable-comprehension-and-exit'];
assert.equal(access.flags.accessibility_failure_present, true);
assert.equal(access.flags.meaningful_exit_failure_present, true);
assert.equal(access.notice.language_covered_count, 80);
assert.equal(access.notice.accessibility_covered_count, 90);
assert.equal(access.failed_optout_attempts, 20);

const friction = worlds['formal-optout-with-short-deadline-high-friction-and-failed-exits'];
assert.equal(friction.flags.notice_comprehension_complete, true);
assert.equal(friction.flags.meaningful_exit_failure_present, true);
assert.equal(friction.exit.deadline_days, 7);
assert.equal(friction.exit.attempt_count, 30);
assert.equal(friction.exit.success_count, 5);
assert.equal(friction.exit.failure_count, 25);
assert.equal(friction.release.bound_population_count, 95);

const drift = worlds['approved-narrow-release-replaced-by-broader-future-claims-version'];
assert.equal(drift.flags.release_scope_drift_present, true);
assert.equal(drift.flags.future_claim_release_present, true);
assert.equal(drift.flags.approved_binding_version_mismatch_present, true);
assert.equal(drift.release.approved_release_id, 'RELEASE-INCIDENT-V1');
assert.equal(drift.release.binding_release_id, 'RELEASE-FUTURE-V2');
assert.equal(drift.release.operative_release_comprehended_count, 0);

const nonparticipant = worlds['affiliate-and-nonparticipant-release-without-notice-or-consideration'];
assert.equal(nonparticipant.flags.nonparticipant_binding_present, true);
assert.equal(nonparticipant.nonparticipant_bound_people, 20);
assert.equal(nonparticipant.release.bound_population_count, 120);
assert.equal(nonparticipant.release.consideration_covered_population_count, 100);
assert.equal(nonparticipant.release.authority_to_bind_nonparticipants, false);

const paymentAssent = worlds['payment-acceptance-treated-as-assent-without-complete-release-understanding'];
assert.equal(paymentAssent.flags.payment_as_consent_present, true);
assert.equal(paymentAssent.release.payment_acceptance_treated_as_assent, true);
assert.equal(paymentAssent.release.explicit_agreement_count, 0);
assert.equal(paymentAssent.notice.comprehended_count, 50);
assert.equal(paymentAssent.failed_optout_attempts, 10);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.release_authority_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_release_status, 'all_claims_released');
  assert.equal(world.public_claim.people_paid, 100);
  assert.equal(world.public_claim.amount_paid, 1800);
  assert.equal(world.full_notice_delivery, true);
  assert.equal(world.full_affected_payment, true);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.release_authority_signature_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(validatePreferenceReleaseAuthorityChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceReleaseAuthorityWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'payment-acceptance-treated-as-assent-without-complete-release-understanding')
);
assert.equal(direct.flags.payment_as_consent_present, true);
assert.equal(direct.full_notice_delivery, true);
assert.equal(direct.full_affected_payment, true);

const markdown = renderPreferenceReleaseAuthorityMarkdown(compiled);
assert.match(markdown, /Release scope, notice comprehension, collective exit, and binding-authority custody/);
assert.match(markdown, /complete-accessible-comprehended-exitable-narrow-release/);
assert.match(markdown, /Complete notice-exit-release path: true/);
assert.match(markdown, /approved-narrow-release-replaced-by-broader-future-claims-version/);
assert.match(markdown, /Future claims released: true/);
assert.match(markdown, /affiliate-and-nonparticipant-release-without-notice-or-consideration/);
assert.match(markdown, /Nonparticipant binding: true/);
assert.match(markdown, /total_affected_people_without_notice_comprehension: 245/);
assert.doesNotMatch(markdown, /named court coerced|actual release was unenforceable|binding public authorization|manipulated claimants/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceReleaseAuthorityFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceReleaseAuthorityFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceReleaseAuthorityFixture(missingWorld).some(error => /exactly the eight required release-authority worlds/.test(error)));

const baselinePopulationLeak = structuredClone(fixture);
baselinePopulationLeak.baseline.affected_population = 99;
assert.ok(validatePreferenceReleaseAuthorityFixture(baselinePopulationLeak).some(error => /affected_population must remain 100|access groups must sum/.test(error)));

const publicClaimLeak = structuredClone(fixture);
publicClaimLeak.worlds[0].public_claim.people_paid = 99;
assert.ok(validatePreferenceReleaseAuthorityFixture(publicClaimLeak).some(error => /must preserve the frozen public release claim/.test(error)));

const noticeChainLeak = structuredClone(fixture);
noticeChainLeak.worlds[0].notice.acknowledged_count = 101;
assert.ok(validatePreferenceReleaseAuthorityFixture(noticeChainLeak).some(error => /notice acknowledged_count must be within|notice counts do not form a valid custody chain/.test(error)));

const exitLedgerLeak = structuredClone(fixture);
exitLedgerLeak.worlds.find(world => world.world_id === 'formal-optout-with-short-deadline-high-friction-and-failed-exits').exit.failure_count = 24;
assert.ok(validatePreferenceReleaseAuthorityFixture(exitLedgerLeak).some(error => /opt-out attempts must equal successes plus failures/.test(error)));

const boundPopulationLeak = structuredClone(fixture);
boundPopulationLeak.worlds.find(world => world.world_id === 'affiliate-and-nonparticipant-release-without-notice-or-consideration').release.bound_population_count = 119;
assert.ok(validatePreferenceReleaseAuthorityFixture(boundPopulationLeak).some(error => /bound population does not reconcile/.test(error)));

const paymentAssentLeak = structuredClone(fixture);
paymentAssentLeak.worlds.find(world => world.world_id === 'payment-acceptance-treated-as-assent-without-complete-release-understanding').release.explicit_agreement_count = 1;
assert.ok(validatePreferenceReleaseAuthorityFixture(paymentAssentLeak).some(error => /payment-as-assent must preserve zero explicit agreement/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].governance.binding_public_authority = true;
assert.ok(validatePreferenceReleaseAuthorityFixture(authorityLeak).some(error => /binding_public_authority must remain false/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds.find(world => world.world_id === 'notice-delivered-but-mostly-unacknowledged-and-unread').expected_flags.delivery_without_comprehension_present = false;
assert.throws(() => compilePreferenceReleaseAuthorityFixture(expectedFlagLeak), /delivery_without_comprehension_present mismatch/);

const falseComprehensionRepair = structuredClone(fixture);
const unreadWorld = falseComprehensionRepair.worlds.find(world => world.world_id === 'notice-delivered-but-mostly-unacknowledged-and-unread');
unreadWorld.notice.acknowledged_count = 100;
unreadWorld.notice.comprehended_count = 100;
unreadWorld.release.operative_release_comprehended_count = 100;
unreadWorld.release.explicit_agreement_count = 100;
assert.throws(() => compilePreferenceReleaseAuthorityFixture(falseComprehensionRepair), /delivery_without_comprehension_present mismatch|notice_comprehension_complete mismatch/);

const falseDriftRepair = structuredClone(fixture);
const driftWorld = falseDriftRepair.worlds.find(world => world.world_id === 'approved-narrow-release-replaced-by-broader-future-claims-version');
driftWorld.release.approved_release_id = driftWorld.release.binding_release_id;
driftWorld.release.approved_version = driftWorld.release.binding_version;
assert.throws(() => compilePreferenceReleaseAuthorityFixture(falseDriftRepair), /approved_binding_version_mismatch_present mismatch/);

const consentInferenceLeak = structuredClone(fixture);
consentInferenceLeak.expected_classification.payment_acceptance_identifies_informed_release_agreement = true;
assert.ok(validatePreferenceReleaseAuthorityFixture(consentInferenceLeak).some(error => /payment_acceptance_identifies_informed_release_agreement/.test(error)));

const coercionInferenceLeak = structuredClone(fixture);
coercionInferenceLeak.expected_classification.release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent = true;
assert.ok(validatePreferenceReleaseAuthorityFixture(coercionInferenceLeak).some(error => /release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'complete-accessible-comprehended-exitable-narrow-release');
tamperedWorld.custody_chain[3].payload.binding_scope = 'tampered_scope';
assert.ok(validatePreferenceReleaseAuthorityBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_notice_exit_release_worlds = 2;
assert.ok(validatePreferenceReleaseAuthorityBuild(metricInflation).some(error => /complete_notice_exit_release_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceReleaseAuthorityFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-release-authority.test.js: OK');
