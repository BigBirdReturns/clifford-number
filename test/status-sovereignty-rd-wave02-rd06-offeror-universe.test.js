#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  PRODUCT_ROOT,
  EXECUTION_RECEIPT_PATH,
  CLOSURE_REFERENCE_PATH
} from '../tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs';
import {
  SCHEMA_PATH,
  readBundle,
  validateProduct,
  validateProductShape,
  validateCurrentAtlasCustody
} from '../tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);

validateProduct(ROOT);
const bundle = readBundle(ROOT);
const schema = read(SCHEMA_PATH);

const currentLedger = read('data/research/status-sovereignty-residual-denominator-wave-02-current.json');
assert.equal(validateCurrentAtlasCustody(currentLedger), 'post_promotion');

const prePromotionLedger = clone(currentLedger);
prePromotionLedger.authority = 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';
prePromotionLedger.promoted_class_receipts = prePromotionLedger.promoted_class_receipts.slice(0, 3);
prePromotionLedger.selected_classes_open.push({
  lane_id: 'RD-06',
  class_id: 'RD-06-C01',
  issue: 791,
  constitutional_exact_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
  state: 'open',
  class_closed: false
});
prePromotionLedger.counts.terminal_class_receipts = 3;
prePromotionLedger.counts.classes_closed_this_wave = 3;
prePromotionLedger.counts.closed_residual_classes = 3;
prePromotionLedger.counts.open_residual_classes = 39;
prePromotionLedger.current_result.terminal_state = 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open';
prePromotionLedger.current_result.classes_closed = 3;
prePromotionLedger.current_result.classes_open = 39;
prePromotionLedger.current_result.closed_class_ids = ['RD-04-C01','RD-05-C03','RD-01-C03'];
prePromotionLedger.current_result.open_selected_class_ids = ['RD-02-C04','RD-03-C04','RD-06-C01'];
assert.equal(validateCurrentAtlasCustody(prePromotionLedger), 'pre_promotion');

const custodyMutations = [
  ['post-promotion closed count', (v) => { v.counts.closed_residual_classes = 3; }],
  ['post-promotion open count', (v) => { v.counts.open_residual_classes = 39; }],
  ['post-promotion RD-06 merge', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],
  ['post-promotion RD-06 manifest', (v) => { v.promoted_class_receipts[3].manifest_combined_sha256 = '0'.repeat(64); }],
  ['post-promotion RD-06 terminal state', (v) => { v.promoted_class_receipts[3].terminal_state = 'evidence_complete'; }],
  ['post-promotion RD-06 reopened', (v) => { v.selected_classes_open.push({ lane_id: 'RD-06', class_id: 'RD-06-C01', issue: 791, constitutional_exact_label: v.promoted_class_receipts[3].constitutional_exact_label, state: 'open', class_closed: false }); }],
  ['post-promotion closed order', (v) => { v.promoted_class_receipts.reverse(); }],
  ['post-promotion graph effect', (v) => { v.current_result.graph_effect = 'graph_changed'; }]
];

for (const [name, mutate] of custodyMutations) {
  const candidate = clone(currentLedger);
  mutate(candidate);
  assert.throws(() => validateCurrentAtlasCustody(candidate), undefined, name);
}

const preCustodyMutations = [
  ['pre-promotion RD-06 missing from open set', (v) => { v.selected_classes_open.pop(); }],
  ['pre-promotion RD-06 silently promoted', (v) => { v.promoted_class_receipts.push(clone(currentLedger.promoted_class_receipts[3])); }],
  ['pre-promotion receipt count', (v) => { v.counts.terminal_class_receipts = 4; }],
  ['pre-promotion external review', (v) => { v.counts.external_reviews = 1; }]
];

for (const [name, mutate] of preCustodyMutations) {
  const candidate = clone(prePromotionLedger);
  mutate(candidate);
  assert.throws(() => validateCurrentAtlasCustody(candidate), undefined, name);
}


const mutations = [
  ['terminal schema', (b) => { b.terminal.schema_version = 'bad'; }],
  ['terminal wave', (b) => { b.terminal.wave_id = 'OTHER'; }],
  ['terminal class', (b) => { b.terminal.class_id = 'RD-01-C03'; }],
  ['terminal issue', (b) => { b.terminal.issue = 790; }],
  ['terminal cutoff', (b) => { b.terminal.as_of = '2026-08-02'; }],
  ['terminal status', (b) => { b.terminal.status = 'open'; }],
  ['research head', (b) => { b.terminal.source_product.research_head = '0'.repeat(40); }],
  ['matrix blob', (b) => { b.terminal.source_product.historical_field_matrix_git_blob_sha = '0'.repeat(40); }],
  ['census artifact', (b) => { b.terminal.source_product.census_artifact_sha256 = '0'.repeat(64); }],
  ['census manifest binding', (b) => { b.terminal.source_product.census_manifest_combined_sha256 = '0'.repeat(64); }],
  ['remove slot', (b) => { b.terminal.slots.pop(); }],
  ['duplicate slot', (b) => { b.terminal.slots[7].slot_id = b.terminal.slots[6].slot_id; }],
  ['slot order', (b) => { b.terminal.slots.reverse(); }],
  ['remove field', (b) => { delete b.terminal.slots[0].fields.proposal_status; }],
  ['field protocol false', (b) => { b.terminal.slots[0].fields.proposal_status.fixed_protocol_complete = false; }],
  ['field terminal false', (b) => { b.terminal.slots[0].fields.proposal_status.terminal_for_class_closure = false; }],
  ['slot protocol false', (b) => { b.terminal.slots[0].slot_result.fixed_protocol_executed = false; }],
  ['slot terminal fields', (b) => { b.terminal.slots[0].slot_result.terminal_fields = 9; }],
  ['slot architecture complete', (b) => { b.terminal.slots[0].slot_result.complete_offeror_team_architecture_record = true; }],
  ['Raytheon renamed', (b) => { b.terminal.slots[0].fields.legal_offeror_and_bidding_entity.value = 'RTX'; }],
  ['Raytheon architecture invented', (b) => { b.terminal.slots[0].fields.team_prime_subcontractor_and_architecture_identity_where_public.value = 'invented'; }],
  ['Palantir disposition', (b) => { b.terminal.slots[1].fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.value = 'named_rejected_offeror'; }],
  ['GDMS award', (b) => { b.terminal.slots[2].fields.terminal_proposal_slot_state.value = 'named_awardee'; }],
  ['unnamed identity state', (b) => { b.terminal.slots[3].identity_state = 'publicly_named'; }],
  ['unnamed legal identity', (b) => { b.terminal.slots[3].fields.legal_offeror_and_bidding_entity.value = 'guessed'; }],
  ['unnamed legal state', (b) => { b.terminal.slots[3].fields.legal_offeror_and_bidding_entity.state = 'observed'; }],
  ['unnamed architecture', (b) => { b.terminal.slots[4].fields.team_prime_subcontractor_and_architecture_identity_where_public.value = 'guessed'; }],
  ['unnamed evaluation', (b) => { b.terminal.slots[5].fields.evaluation_or_protest_cross_reference.value = { technical: 'Good' }; }],
  ['unnamed rejection', (b) => { b.terminal.slots[6].fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.value = 'named_rejected_offeror'; }],
  ['unnamed candidate', (b) => { b.terminal.slots[7].fields.identity_confidence_and_alternative_candidates.value.alternative_candidates.push('company'); }],
  ['unnamed terminal state', (b) => { b.terminal.slots[7].fields.terminal_proposal_slot_state.value = 'still_open'; }],
  ['proposal count', (b) => { b.terminal.counts.proposal_slots = 7; }],
  ['named count', (b) => { b.terminal.counts.publicly_named_offerors = 4; }],
  ['restricted count', (b) => { b.terminal.counts.public_identity_source_restricted_slots = 4; }],
  ['fixed slots', (b) => { b.terminal.counts.fixed_protocol_completed_slots = 7; }],
  ['terminal slots', (b) => { b.terminal.counts.identity_and_disposition_terminal_slots = 7; }],
  ['candidate count', (b) => { b.terminal.counts.candidate_result_rows = 279; }],
  ['admitted URL', (b) => { b.terminal.counts.admitted_candidate_urls = 1; }],
  ['spawned request', (b) => { b.terminal.counts.result_spawned_requests = 1; }],
  ['external contact', (b) => { b.terminal.counts.external_contacts = 1; }],
  ['terminal class reopened', (b) => { b.terminal.current_result.class_closed = false; }],
  ['terminal state changed', (b) => { b.terminal.current_result.terminal_state = 'evidence_complete'; }],
  ['complete universe promoted', (b) => { b.terminal.current_result.complete_offeror_team_architecture_universe_observed = true; }],
  ['superiority promoted', (b) => { b.terminal.current_result.technical_superiority_finding = true; }],
  ['favoritism promoted', (b) => { b.terminal.current_result.favoritism_finding = true; }],
  ['foreclosure promoted', (b) => { b.terminal.current_result.foreclosure_finding = true; }],
  ['coordination promoted', (b) => { b.terminal.current_result.coordination_finding = true; }],
  ['common purpose promoted', (b) => { b.terminal.current_result.common_purpose_finding = true; }],
  ['publication effect', (b) => { b.terminal.current_result.publication_effect = 'published'; }],
  ['nonaward laundered', (b) => { b.terminal.boundaries.nonaward_is_rejection_withdrawal_or_nonresponsiveness = true; }],
  ['protective order laundered', (b) => { b.terminal.boundaries.protective_order_is_no_proposal = true; }],
  ['no result laundered', (b) => { b.terminal.boundaries.no_public_result_is_no_proposal = true; }],
  ['Palantir promotion', (b) => { b.terminal.boundaries.Palantir_presence_is_coordination_or_common_purpose = true; }],
  ['receipt label', (b) => { b.receipt.class_label = 'partial universe'; }],
  ['receipt reopened', (b) => { b.receipt.class_closed = false; }],
  ['receipt terminal state', (b) => { b.receipt.terminal_state = 'still_open'; }],
  ['receipt atlas open after', (b) => { b.receipt.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01.open_after = 40; }],
  ['receipt contact', (b) => { b.receipt.authority.external_contacts = 1; }],
  ['receipt superiority', (b) => { b.receipt.authority.technical_superiority_finding = true; }],
  ['summary counts', (b) => { b.summary.counts.proposal_slots = 9; }],
  ['summary authority', (b) => { b.summary.authority.graph_effect = 'graph_changed'; }],
  ['manifest entry removed', (b) => { b.manifest.entries.pop(); }],
  ['manifest path changed', (b) => { b.manifest.entries[0].path = 'other.json'; }],
  ['manifest digest changed', (b) => { b.manifest.entries[0].sha256 = '0'.repeat(64); }],
  ['closure issue', (b) => { b.closure.child_issue = 790; }],
  ['closure PR', (b) => { b.closure.source_pr = 805; }],
  ['closure state', (b) => { b.closure.terminal_state = 'evidence_complete'; }],
  ['closure manifest', (b) => { b.closure.product.manifest_combined_sha256 = '0'.repeat(64); }],
  ['closure artifact', (b) => { b.closure.execution.artifact_zip_sha256 = '0'.repeat(64); }],
  ['execution run', (b) => { b.execution.workflow_run = 1; }],
  ['execution digest', (b) => { b.execution.artifact_zip_sha256 = '0'.repeat(64); }],
  ['execution candidates', (b) => { b.execution.counts.candidate_result_rows = 281; }],
  ['census manifest count', (b) => { b.censusManifest.entry_count = 328; }],
  ['census manifest digest', (b) => { b.censusManifest.combined_sha256 = '0'.repeat(64); }],
  ['census historical closure', (b) => { b.censusSummary.class_closed = true; }],
  ['parent denominator', (b) => { b.parent.recovered_denominators.later_procurement_proposals_received = 7; }],
  ['seed label', (b) => { b.seed.closure_target = 'different'; }],
  ['constitution label', (b) => { b.constitution.lane_attempts.find((row) => row.class_id === 'RD-06-C01').exact_label = 'different'; }]
];

for (const [name, mutate] of mutations) {
  const candidate = clone(bundle);
  mutate(candidate);
  assert.throws(() => validateProductShape(candidate, schema), undefined, name);
}

const schemaMutations = [
  ['schema root open', (s) => { s.additionalProperties = true; }],
  ['schema id changed', (s) => { s.$id = 'bad'; }],
  ['schema slots min', (s) => { s.properties.slots.minItems = 7; }],
  ['schema slots max', (s) => { s.properties.slots.maxItems = 9; }],
  ['schema proposal count', (s) => { s.properties.counts.properties.proposal_slots.const = 7; }],
  ['schema restricted count', (s) => { s.properties.counts.properties.public_identity_source_restricted_slots.const = 4; }],
  ['schema fixed count', (s) => { s.properties.counts.properties.fixed_protocol_completed_slots.const = 7; }],
  ['schema terminal state', (s) => { s.properties.current_result.properties.terminal_state.const = 'evidence_complete'; }],
  ['schema closure', (s) => { s.properties.current_result.properties.class_closed.const = false; }]
];

for (const [name, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateProductShape(bundle, candidate), undefined, name);
}

console.log(`RD-06 terminal adversarial suite: ${mutations.length + schemaMutations.length + custodyMutations.length + preCustodyMutations.length} mutations refused`);
