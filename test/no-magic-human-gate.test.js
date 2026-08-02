#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadNoMagicHumanGateContext,
  validateNoMagicHumanGate
} from '../tools/validate-no-magic-human-gate.mjs';

const base = loadNoMagicHumanGateContext();
assert.deepEqual(validateNoMagicHumanGate(base), [], 'canonical no-magic-human policy must validate');

const mutations = [
  ['turn stranger recruitment into a dependency', (c) => { c.policy.laws.stranger_recruitment_is_project_dependency = true; }],
  ['allow absence to suspend work', (c) => { c.policy.laws.absence_must_not_suspend_project_work = false; }],
  ['disable machine and maintainer judgment', (c) => { c.policy.laws.machine_and_maintainer_judgment_may_continue = false; }],
  ['make external review a general requirement', (c) => { c.policy.laws.external_review_required_only_to_claim_external_review = false; }],
  ['open outreach by default', (c) => { c.policy.laws.default_outreach_state = 'allowed'; }],
  ['remove bounded judgment from continuing work', (c) => { c.policy.must_continue = c.policy.must_continue.filter((x) => x !== 'bounded judgment and disposition'); }],
  ['remove the user-recruitment prohibition', (c) => { c.policy.forbidden_global_gates = c.policy.forbidden_global_gates.filter((x) => x !== 'requiring a user to recruit a reviewer'); }],
  ['make an external-review hold project-blocking', (c) => { c.policy.claim_specific_holds[0].project_blocking = true; }],
  ['make Issue 571 project-blocking', (c) => { c.policy.known_optional_lanes[0].project_blocking = true; }],
  ['authorize contact through Issue 571', (c) => { c.policy.known_optional_lanes[0].contact_authorized_by_policy = true; }],
  ['permit unsolicited draft creation', (c) => { c.policy.operator_contract.may_create_outreach_drafts_without_explicit_instruction = true; }],
  ['permit unsolicited sending', (c) => { c.policy.operator_contract.may_send_outreach_without_explicit_instruction = true; }],
  ['permit asking the user to find strangers', (c) => { c.policy.operator_contract.may_ask_user_to_find_strangers_as_a_project_gate = true; }],
  ['treat outside participation as permission to reason', (c) => { c.policy.operator_contract.may_treat_external_participation_as_permission_to_reason = true; }],
  ['replace zero-and-proceed with waiting', (c) => { c.policy.operator_contract.on_absence = 'wait for a reviewer'; }],
  ['let the campaign treat participation as permission to reason', (c) => { c.campaign.selection_contract.external_participation_is_permission_to_reason = true; }],
  ['count an invitation as review', (c) => { c.campaign.counting_law.invited = true; }],
  ['count a candidate as review', (c) => { c.campaign.boundaries.candidate_is_review = true; }],
  ['let a review rewrite disposition', (c) => { c.packets.boundaries.valid_review_rewrites_disposition = true; }],
  ['let a review clear publication', (c) => { c.responses.boundaries.valid_review_clears_publication = true; }],
  ['turn a candidate profile into eligibility', (c) => { c.candidates.boundaries.candidate_profile_is_eligibility = true; }],
  ['erase the zero-state documentation', (c) => { c.documentation = c.documentation.replaceAll('record zero', 'wait indefinitely'); }],
  ['erase the optional-lane interpretation', (c) => { c.documentation = c.documentation.replace('Issue #571 is an optional external-review lane', 'Issue #571 is mandatory'); }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  const errors = validateNoMagicHumanGate(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`no-magic-human-gate.test: ${mutations.length} adversarial mutations PASS`);
