import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileRepresentationCustodyPacket,
  renderRepresentationCustodyMarkdown,
  validateRepresentationCustodyBuild,
  validateRepresentationCustodyChain,
  validateRepresentationCustodyPacket
} from '../tools/lib/preference-representation-custody.mjs';

const packet = JSON.parse(readFileSync('data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json', 'utf8'));
assert.deepEqual(validateRepresentationCustodyPacket(packet), []);

const compiled = compileRepresentationCustodyPacket(packet);
assert.deepEqual(validateRepresentationCustodyBuild(compiled), []);
assert.equal(compiled.case_id, 'twineo-originalvoices-representation-custody-v1');
assert.equal(compiled.status, 'individual_representation_custody_confirmed_highest_rc03_collective_authority_unresolved');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_individual_rights_and_platform_control_surface');
assert.equal(compiled.receipt_count, 6);
assert.deepEqual(compiled.receipt_source_class_counts, {
  client_methodology_primary_public: 1,
  client_policy_primary_public: 1,
  client_terms_primary_public: 1,
  participant_policy_primary_public: 1,
  participant_product_primary_public: 1,
  participant_terms_primary_public: 1
});
assert.equal(compiled.supported_state_count, 3);
assert.equal(compiled.highest_supported_representation_state, 'RC-03');
assert.equal(compiled.operational_rights_confirmed_count, 13);
assert.equal(compiled.platform_retained_powers_confirmed_count, 7);
assert.equal(compiled.unresolved_control_field_count, 12);
assert.equal(compiled.operational_rights.individual_source_grounding_confirmed, true);
assert.equal(compiled.operational_rights.participant_reviews_and_rates_twin_answers_confirmed, true);
assert.equal(compiled.operational_rights.participant_can_request_deletion_confirmed, true);
assert.equal(compiled.operational_rights.participant_has_data_portability_right_confirmed, true);
assert.equal(compiled.operational_rights.participant_data_used_to_train_third_party_models, false);
assert.equal(compiled.platform_retained_powers.anonymised_user_content_license_to_platform_confirmed, true);
assert.equal(compiled.platform_retained_powers.platform_controls_reward_and_redemption_rules_confirmed, true);
assert.equal(compiled.classification_verdict.pre_task_specific_purpose_and_client_control_supported, false);
assert.equal(compiled.classification_verdict.legal_twin_ownership_assignment_supported, false);
assert.equal(compiled.classification_verdict.collective_bargaining_supported, false);
assert.equal(compiled.classification_verdict.binding_public_authority_supported, false);
assert.equal(compiled.classification_verdict.complete_economic_fairness_supported, false);
assert.deepEqual(validateRepresentationCustodyChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const stateMap = Object.fromEntries(compiled.representation_states.map(state => [state.state_id, state.supported_in_case]));
assert.deepEqual(stateMap, {
  'RC-00': false,
  'RC-01': true,
  'RC-02': true,
  'RC-03': true,
  'RC-04': false,
  'RC-05': false
});

const markdown = renderRepresentationCustodyMarkdown(compiled);
assert.match(markdown, /Twineo and OriginalVoices representation-custody positive control/);
assert.match(markdown, /Highest supported state:\*\* RC-03/);
assert.match(markdown, /RC-04 participant_controls_each_task_purpose_client_and_downstream_use_before_execution: false/);
assert.match(markdown, /RC-05 represented_people_collectively_bind_objective_terms_and_remedy: false/);
assert.match(markdown, /Legal Twin ownership assignment recovered: false/);
assert.match(markdown, /binding_public_authority_supported: false/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered representation packet must preserve the prohibited-inference ledger');
const publicationSurface = markdown.slice(0, prohibitedIndex);
const prohibitedSurface = markdown.slice(prohibitedIndex);
assert.doesNotMatch(publicationSurface, /participant legally owns the Twin|pre-approves every task|fair value allocation established|binding public authority confirmed/i);
assert.match(prohibitedSurface, /Do not treat marketing ownership language as a complete legal assignment of Twin ownership/);
assert.match(prohibitedSurface, /Do not treat post-task review as proof of pre-task approval/);
assert.match(prohibitedSurface, /Do not treat individual representation custody as collective or public authority/);

const graphLeak = structuredClone(packet);
graphLeak.graph_effect = 'asserted';
assert.ok(validateRepresentationCustodyPacket(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(packet);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validateRepresentationCustodyPacket(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const ownershipLeak = structuredClone(packet);
ownershipLeak.ownership_language.legal_twin_ownership_assignment_publicly_recovered = true;
assert.ok(validateRepresentationCustodyPacket(ownershipLeak).some(error => /legal_twin_ownership_assignment_publicly_recovered/.test(error)));

const preTaskLeak = structuredClone(packet);
preTaskLeak.classification_verdict.pre_task_specific_purpose_and_client_control_supported = true;
assert.ok(validateRepresentationCustodyPacket(preTaskLeak).some(error => /pre_task_specific_purpose_and_client_control_supported/.test(error)));

const collectiveLeak = structuredClone(packet);
collectiveLeak.classification_verdict.collective_bargaining_supported = true;
assert.ok(validateRepresentationCustodyPacket(collectiveLeak).some(error => /collective_bargaining_supported/.test(error)));

const authorityLeak = structuredClone(packet);
authorityLeak.classification_verdict.binding_public_authority_supported = true;
assert.ok(validateRepresentationCustodyPacket(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const fairnessLeak = structuredClone(packet);
fairnessLeak.classification_verdict.complete_economic_fairness_supported = true;
assert.ok(validateRepresentationCustodyPacket(fairnessLeak).some(error => /complete_economic_fairness_supported/.test(error)));

const statePromotionLeak = structuredClone(packet);
statePromotionLeak.representation_states.find(state => state.state_id === 'RC-04').supported_in_case = true;
assert.ok(validateRepresentationCustodyPacket(statePromotionLeak).some(error => /representation state RC-04 support must remain false/.test(error)));

const missingReceiptClass = structuredClone(packet);
missingReceiptClass.receipts = missingReceiptClass.receipts.filter(receipt => receipt.source_class !== 'client_policy_primary_public');
assert.ok(validateRepresentationCustodyPacket(missingReceiptClass).some(error => /missing representation-custody receipt source class client_policy_primary_public/.test(error)));

const taskControlLeak = structuredClone(packet);
taskControlLeak.unresolved_control_fields.participant_can_refuse_each_question_before_twin_answers_publicly_recovered = true;
assert.ok(validateRepresentationCustodyPacket(taskControlLeak).some(error => /participant_can_refuse_each_question_before_twin_answers_publicly_recovered/.test(error)));

const downstreamLeak = structuredClone(packet);
downstreamLeak.platform_retained_powers.client_controls_downstream_decision_confirmed = true;
assert.ok(validateRepresentationCustodyPacket(downstreamLeak).some(error => /client_controls_downstream_decision_confirmed/.test(error)));

const thirdPartyTrainingLeak = structuredClone(packet);
thirdPartyTrainingLeak.operational_rights.participant_data_used_to_train_third_party_models = true;
assert.ok(validateRepresentationCustodyPacket(thirdPartyTrainingLeak).some(error => /participant_data_used_to_train_third_party_models/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.custody_chain[2].payload.participant_reward_path_confirmed = false;
assert.ok(validateRepresentationCustodyBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const highestStateLeak = structuredClone(compiled);
highestStateLeak.highest_supported_representation_state = 'RC-04';
assert.ok(validateRepresentationCustodyBuild(highestStateLeak).some(error => /highest supported representation state must remain RC-03/.test(error)));

const strippedCaveat = structuredClone(packet);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validateRepresentationCustodyPacket(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-representation-custody.test.js: OK');
