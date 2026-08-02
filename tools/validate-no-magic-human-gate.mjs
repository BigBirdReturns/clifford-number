#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const requiredContinuationLanes = [
  'source acquisition and custody',
  'internal adversarial review',
  'falsifier and counterexample construction',
  'bounded judgment and disposition',
  'site and report publication with exact authority labels',
  'stable-ground succession',
  'repository maintenance, testing, and release',
  'field-hypothesis revision or rejection'
];

const requiredClaimHolds = new Map([
  ['externally reviewed', 'not externally reviewed'],
  ['externally adjudicated', 'not externally adjudicated'],
  ['externally adopted', 'no verified external adoption']
]);

export function loadNoMagicHumanGateContext() {
  return {
    policy: readJson('data/project/no-magic-human-gate.json'),
    campaign: readJson('data/project/status-sovereignty-wave-02-second-party-review-campaign.json'),
    packets: readJson('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json'),
    candidates: readJson('data/research/status-sovereignty-wave-02-second-party-review-candidates.json'),
    responses: readJson('data/research/status-sovereignty-wave-02-second-party-review-responses.json'),
    documentation: readText('docs/methods/no-magic-human-gate.md')
  };
}

export function validateNoMagicHumanGate(context = loadNoMagicHumanGateContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  const { policy, campaign, packets, candidates, responses, documentation } = context;
  const laws = policy.laws ?? {};
  const operator = policy.operator_contract ?? {};

  eq(policy.schema_version, 'no-magic-human-gate@1', 'policy schema');
  eq(policy.project_id, 'clifford-number', 'policy project');
  eq(policy.status, 'canonical_nonblocking_external_participation_law', 'policy status');
  eq(policy.governor_relation?.mode, 'supplemental_constitutional_control', 'governor relation');
  eq(policy.governor_relation?.rewrites_prior_stable_ground, false, 'historical rewrite boundary');
  eq(policy.governor_relation?.external_participation_changes_only_receipted_claim_authority, true, 'claim-specific authority law');

  eq(laws.default_outreach_state, 'prohibited_without_explicit_current_user_instruction', 'default outreach state');
  eq(laws.stranger_recruitment_is_project_dependency, false, 'stranger recruitment dependency');
  eq(laws.external_participation_is_optional_evidence_lane, true, 'optional evidence lane');
  eq(laws.absence_must_be_recorded_as_zero, true, 'zero-state law');
  eq(laws.absence_must_not_suspend_project_work, true, 'non-suspension law');
  eq(laws.machine_and_maintainer_judgment_may_continue, true, 'judgment continuation law');
  eq(laws.external_review_required_only_to_claim_external_review, true, 'external-review scope');
  eq(laws.external_adjudication_required_only_to_claim_external_adjudication, true, 'external-adjudication scope');
  eq(laws.external_adoption_required_only_to_claim_external_adoption, true, 'external-adoption scope');

  const continuation = new Set(policy.must_continue ?? []);
  for (const lane of requiredContinuationLanes) check(continuation.has(lane), `required continuation lane missing: ${lane}`);
  eq(continuation.size, (policy.must_continue ?? []).length, 'continuation lanes must be unique');

  check(Array.isArray(policy.forbidden_global_gates) && policy.forbidden_global_gates.length >= 5, 'forbidden global-gate denominator is incomplete');
  check(policy.forbidden_global_gates?.includes('requiring a user to recruit a reviewer'), 'user-recruitment prohibition missing');
  check(policy.forbidden_global_gates?.includes('waiting for a stranger to reply'), 'stranger-wait prohibition missing');
  check(policy.forbidden_global_gates?.includes('treating zero external reviews as project failure'), 'zero-review failure prohibition missing');

  const holds = policy.claim_specific_holds ?? [];
  eq(holds.length, requiredClaimHolds.size, 'claim-specific hold denominator');
  const observedClaims = new Set();
  for (const hold of holds) {
    observedClaims.add(hold.claim);
    check(typeof hold.required_receipt === 'string' && hold.required_receipt.length > 20, `claim ${hold.claim} lacks a bounded receipt contract`);
    eq(hold.zero_state, requiredClaimHolds.get(hold.claim), `claim ${hold.claim} zero state`);
    eq(hold.project_blocking, false, `claim ${hold.claim} project-blocking state`);
  }
  for (const claim of requiredClaimHolds.keys()) check(observedClaims.has(claim), `claim-specific hold missing: ${claim}`);

  const optionalLane = (policy.known_optional_lanes ?? []).find((row) => row.issue === 571);
  check(Boolean(optionalLane), 'Issue #571 optional-lane receipt missing');
  eq(optionalLane?.project_blocking, false, 'Issue #571 project-blocking state');
  eq(optionalLane?.contact_authorized_by_policy, false, 'Issue #571 contact authority');
  eq(optionalLane?.state_when_empty, 'zero valid external reviews', 'Issue #571 empty state');

  eq(operator.may_create_outreach_drafts_without_explicit_instruction, false, 'draft authority');
  eq(operator.may_send_outreach_without_explicit_instruction, false, 'send authority');
  eq(operator.may_ask_user_to_find_strangers_as_a_project_gate, false, 'user recruitment authority');
  eq(operator.may_treat_external_participation_as_permission_to_reason, false, 'reasoning permission boundary');
  eq(operator.on_absence, 'record zero and proceed', 'absence handling');

  for (const [key, value] of Object.entries(policy.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `policy boundary ${key}`);
    else eq(value, false, `policy boundary ${key}`);
  }

  eq(campaign.issue, 571, 'campaign issue identity');
  eq(campaign.selection_contract?.external_participation_required_for_external_review_claim, true, 'campaign external-review claim law');
  eq(campaign.selection_contract?.external_participation_is_permission_to_reason, false, 'campaign reasoning permission boundary');
  for (const state of ['candidate_only', 'invited', 'nonresponse', 'refused', 'accepted', 'submitted_unvalidated']) {
    eq(campaign.counting_law?.[state], false, `campaign counting law ${state}`);
  }
  eq(campaign.counting_law?.valid_review, true, 'campaign valid-review counting law');

  for (const source of [campaign, packets, responses]) {
    eq(source.boundaries?.candidate_is_review, false, `${source.schema_version} candidate boundary`);
    eq(source.boundaries?.invitation_is_review, false, `${source.schema_version} invitation boundary`);
    eq(source.boundaries?.acceptance_is_review, false, `${source.schema_version} acceptance boundary`);
    eq(source.boundaries?.valid_review_rewrites_disposition, false, `${source.schema_version} disposition boundary`);
    eq(source.boundaries?.valid_review_adjudicates_disagreement, false, `${source.schema_version} adjudication boundary`);
    eq(source.boundaries?.valid_review_clears_publication, false, `${source.schema_version} publication boundary`);
    eq(source.boundaries?.valid_review_creates_graph_edge, false, `${source.schema_version} graph boundary`);
    eq(source.boundaries?.valid_review_advances_adoption, false, `${source.schema_version} adoption boundary`);
  }

  eq(candidates.boundaries?.candidate_profile_is_identity_attestation, false, 'candidate identity boundary');
  eq(candidates.boundaries?.candidate_profile_is_conflict_disclosure, false, 'candidate conflict boundary');
  eq(candidates.boundaries?.candidate_profile_is_eligibility, false, 'candidate eligibility boundary');
  eq(candidates.boundaries?.candidate_record_is_invitation, false, 'candidate invitation boundary');
  eq(candidates.boundaries?.candidate_record_is_review, false, 'candidate review boundary');

  check(documentation.includes('record zero'), 'documentation omits zero-state continuation');
  check(documentation.includes('Default outreach state is **off**') || documentation.includes('default outreach state is **off**'), 'documentation omits default-off outreach rule');
  check(documentation.includes('Issue #571 is an optional external-review lane'), 'documentation omits Issue #571 nonblocking interpretation');

  return errors;
}

function main() {
  const errors = validateNoMagicHumanGate();
  if (errors.length) {
    console.error(`validate-no-magic-human-gate: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-no-magic-human-gate: PASS — external participation is optional, zero is honest, work continues');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
