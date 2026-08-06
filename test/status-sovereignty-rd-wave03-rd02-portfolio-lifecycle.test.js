#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  PRODUCT_ROOT,
  CURRENT_LEDGER_PATH,
  CLOSURE_PATH,
  PROMOTION_MERGE,
  PROMOTION_MANIFEST_SHA256,
  REQUIRED_FIELDS,
  classifyCurrentLedgerCustody,
  deriveProduct
} from '../tools/build-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle.mjs';
import {
  SCHEMA_PATH,
  validateSchemaContract,
  validateTerminalValue
} from '../tools/validate-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const terminal = read(`${PRODUCT_ROOT}/terminal-field-matrix.json`);
const schema = read(SCHEMA_PATH);
assert.deepEqual(terminal, deriveProduct(ROOT).terminal);
assert.equal(validateTerminalValue(terminal), true);
assert.equal(validateSchemaContract(schema), true);
const currentLedger = read(CURRENT_LEDGER_PATH);
assert.equal(
  classifyCurrentLedgerCustody(currentLedger, PROMOTION_MANIFEST_SHA256),
  'forward_post_promotion'
);

const mutations = [
  ['schema version', (v) => { v.schema_version = 'ssc-rd-wave03-rd02-portfolio-lifecycle-terminal-matrix@2'; }],
  ['wave identity', (v) => { v.wave_id = 'SSC-RD-W04'; }],
  ['lane identity', (v) => { v.lane_id = 'RD-03'; }],
  ['class identity', (v) => { v.class_id = 'RD-03-C05'; }],
  ['issue identity', (v) => { v.issue = 1016; }],
  ['class label', (v) => { v.class_label = 'partial lifecycle ledger'; }],
  ['status', (v) => { v.status = 'evidence_complete'; }],
  ['required field removed', (v) => { v.required_fields.pop(); }],
  ['required field reordered', (v) => { v.required_fields.reverse(); }],
  ['row removed', (v) => { v.rows.pop(); }],
  ['row duplicated', (v) => { v.rows[1] = clone(v.rows[0]); }],
  ['row reordered', (v) => { v.rows.reverse(); }],
  ['withheld row identity disclosed', (v) => { v.rows[17].identity_state = 'publicly_named'; }],
  ['withheld row legal vehicle guessed', (v) => { v.rows[17].legal_vehicle = 'Invented Fund, LP'; }],
  ['withheld label removed', (v) => { v.rows[17].withheld_state_label = null; }],
  ['unit 15 source removed', (v) => { v.rows[14].fields.source_identities_and_exact_custody.value.admitted_leaf_source_ids.pop(); }],
  ['unit 15 observation inflation', (v) => { v.rows[14].fields.publicly_identified_portfolio_investments.value.admitted_bounded_observations = 12; }],
  ['unit 15 lifecycle promotion', (v) => { v.rows[14].fields.publicly_identified_exits.value.lifecycle_events_observed = 1; }],
  ['unit 1 leaf source invented', (v) => { v.rows[0].fields.source_identities_and_exact_custody.value.admitted_leaf_source_ids = ['invented']; }],
  ['unit 1 search route removed', (v) => { v.rows[0].fields.source_identities_and_exact_custody.value.unit_search_route_ids.pop(); }],
  ['withheld row search route invented', (v) => { v.rows[17].fields.source_identities_and_exact_custody.value.unit_search_route_ids = ['RD02-W03-R18-PORTFOLIO']; }],
  ['row closure reopened', (v) => { v.rows[0].row_result.row_closed = false; }],
  ['row lifecycle count', (v) => { v.rows[0].row_result.lifecycle_events_observed = 1; }],
  ['named row terminal family', (v) => { v.rows[0].row_result.row_terminal_state = 'bounded_source_restricted'; }],
  ['withheld row terminal family', (v) => { v.rows[17].row_result.row_terminal_state = 'bounded_source_unavailable'; }],
  ['source merge', (v) => { v.source_product.canonical_source_merge = '0'.repeat(40); }],
  ['input digest map', (v) => { v.source_product.input_sha256[Object.keys(v.source_product.input_sha256)[0]] = '0'.repeat(64); }],
  ['parent custody reopened', (v) => { v.source_product.parent_wave02_custody.row_membership_reused_without_reopening_parent_class = false; }],
  ['search route denominator', (v) => { v.source_product.acquisition.search_census.fixed_routes = 50; }],
  ['candidate denominator', (v) => { v.source_product.acquisition.candidate_adjudication.terminal_candidate_urls = 209; }],
  ['candidate followup denominator', (v) => { v.source_product.acquisition.candidate_followups.fixed_routes = 9; }],
  ['same-host denominator', (v) => { v.source_product.acquisition.same_host_followups.fixed_routes = 4; }],
  ['leaf denominator', (v) => { v.source_product.acquisition.disclosure_leaves.fixed_routes = 1; }],
  ['replay denominator', (v) => { v.source_product.acquisition.manager_lineage_replay.fixed_routes = 0; }],
  ['result spawned request', (v) => { v.source_product.acquisition.result_spawned_requests = 1; }],
  ['additional search pass', (v) => { v.source_product.acquisition.automatic_additional_search_pass_authorized = true; }],
  ['source admission removed', (v) => { v.source_product.admitted_leaf_sources.pop(); }],
  ['source lifecycle promoted', (v) => { v.source_product.admitted_leaf_sources[0].lifecycle_events_observed = 1; }],
  ['terminal state', (v) => { v.current_result.terminal_state = 'evidence_complete'; }],
  ['fixed protocol reopened', (v) => { v.current_result.fixed_protocol_complete = false; }],
  ['class reopened', (v) => { v.current_result.class_closed = false; }],
  ['row denominator incomplete', (v) => { v.current_result.all_eighteen_rows_preserved = false; }],
  ['field denominator incomplete', (v) => { v.current_result.all_one_hundred_eighty_fields_terminal = false; }],
  ['complete ledger claimed', (v) => { v.current_result.complete_portfolio_lifecycle_ledger_observed = true; }],
  ['result lifecycle event', (v) => { v.current_result.lifecycle_events_observed = 1; }],
  ['result publication', (v) => { v.current_result.publication_effect = 'published'; }],
  ['result adoption', (v) => { v.current_result.adoption_effect = 'adopted'; }],
  ['result graph', (v) => { v.current_result.graph_effect = 'changed'; }]
];

for (const fieldName of [
  'canonical_cohort_row_and_legal_vehicle_or_withheld_state_label',
  'source_identities_and_exact_custody',
  'field_and_row_terminal_state'
]) {
  mutations.push([`unit 1 observed field downgrade ${fieldName}`, (v) => {
    v.rows[0].fields[fieldName].state = 'not_publicly_recovered';
  }]);
}
for (const fieldName of REQUIRED_FIELDS.slice(1, 8)) {
  mutations.push([`withheld lifecycle overpromotion ${fieldName}`, (v) => { v.rows[17].fields[fieldName].state = 'not_publicly_recovered'; }]);
  mutations.push([`named lifecycle event promotion ${fieldName}`, (v) => { v.rows[0].fields[fieldName].state = 'observed'; }]);
}
for (const key of [
  'cohort_rows','publicly_named_rows','identity_withheld_rows','required_fields_per_row','required_fields','observed_fields',
  'identity_withheld_under_policy_fields','source_restricted_fields','not_publicly_recovered_fields','terminal_fields',
  'bounded_source_unavailable_rows','bounded_source_restricted_rows','search_routes','unique_search_candidates',
  'candidate_followup_routes','same_host_followup_routes','disclosure_leaf_routes','failed_route_replays','admitted_leaf_sources',
  'admitted_bounded_observations'
]) mutations.push([`count ${key}`, (v) => { v.counts[key] += 1; }]);
for (const key of [
  'lifecycle_events_observed','publicly_identified_portfolio_investments_observed','publicly_identified_follow_on_investments_observed',
  'publicly_identified_exits_observed','publicly_identified_write_offs_or_realized_losses_observed',
  'publicly_identified_defaults_or_cures_observed','publicly_identified_realized_fund_returns_observed',
  'sba_repayment_or_loss_allocation_events_observed','result_spawned_requests','external_contacts','external_reviews'
]) mutations.push([`zero count ${key}`, (v) => { v.counts[key] = 1; }]);
for (const key of [
  'automatic_additional_search_pass_authorized','capital_conversion_finding','favoritism_finding','extraction_finding',
  'coordination_finding','common_purpose_finding','reviewed_disposition_changed','complete_compact_finding','racial_order_finding',
  'prevalence_finding','outside_human_dependency','project_blocking'
]) mutations.push([`result boundary ${key}`, (v) => { v.current_result[key] = true; }]);
for (const key of Object.keys(terminal.boundaries)) {
  mutations.push([`boundary ${key}`, (v) => { v.boundaries[key] = key.endsWith('_effect') ? 'changed' : true; }]);
}

let refused = 0;
for (const [label, mutate] of mutations) {
  const candidate = clone(terminal);
  mutate(candidate);
  assert.throws(() => validateTerminalValue(candidate), undefined, label);
  refused += 1;
}


const rd02Promotion = (value) => value.promoted_class_receipts.find((row) => row.class_id === 'RD-02-C05');
const ledgerMutations = [
  ['canonical residual denominator', (v) => { v.counts.canonical_residual_classes = 41; }],
  ['closed-before-wave denominator', (v) => { v.counts.classes_closed_before_wave = 5; }],
  ['selected-attempt denominator', (v) => { v.counts.wave_03_selected_class_attempts = 5; }],
  ['terminal-receipt denominator', (v) => { v.counts.wave_03_terminal_class_receipts = 3; }],
  ['classes-closed-this-wave denominator', (v) => { v.counts.classes_closed_this_wave = 3; }],
  ['closed arithmetic', (v) => { v.counts.closed_residual_classes = 9; }],
  ['open arithmetic', (v) => { v.counts.open_residual_classes = 31; }],
  ['result closed arithmetic', (v) => { v.current_result.classes_closed = 9; }],
  ['result open arithmetic', (v) => { v.current_result.classes_open = 31; }],
  ['result terminal-attempt arithmetic', (v) => { v.current_result.wave_03_selected_attempts_terminal = 3; }],
  ['promoted receipt removed', (v) => { v.promoted_class_receipts.splice(v.promoted_class_receipts.findIndex((row) => row.class_id === 'RD-02-C05'), 1); }],
  ['promoted receipt duplicated', (v) => { v.promoted_class_receipts[0] = structuredClone(rd02Promotion(v)); }],
  ['closed class ID removed', (v) => { v.current_result.closed_class_ids = v.current_result.closed_class_ids.filter((id) => id !== 'RD-02-C05'); }],
  ['open selected RD-02 invented', (v) => { v.current_result.open_selected_class_ids.push('RD-02-C05'); }],
  ['selected-open row removed', (v) => { v.selected_classes_open.pop(); }],
  ['RD-02 promotion source PR', (v) => { rd02Promotion(v).source_pr = 1099; }],
  ['RD-02 promotion merge', (v) => { rd02Promotion(v).merge_commit = '0'.repeat(40); }],
  ['RD-02 promotion constitutional label', (v) => { rd02Promotion(v).constitutional_exact_label += ' changed'; }],
  ['RD-02 promotion receipt label', (v) => { rd02Promotion(v).receipt_class_label += ' changed'; }],
  ['RD-02 promotion label equality', (v) => { rd02Promotion(v).labels_exact_match = false; }],
  ['RD-02 promotion label reconciliation', (v) => { rd02Promotion(v).label_reconciliation = 'changed'; }],
  ['RD-02 promotion terminal state', (v) => { rd02Promotion(v).terminal_state = 'evidence_complete'; }],
  ['RD-02 promotion closure path', (v) => { rd02Promotion(v).closure_reference_path = 'changed.json'; }],
  ['RD-02 promotion receipt path', (v) => { rd02Promotion(v).class_receipt_path = 'changed.json'; }],
  ['RD-02 promotion manifest', (v) => { rd02Promotion(v).manifest_combined_sha256 = '0'.repeat(64); }],
  ['RD-02 promotion reopened', (v) => { rd02Promotion(v).class_closed = false; }],
  ['RD-02 source snapshot closure path', (v) => { v.source_snapshots.rd02_closure_reference_path = 'changed.json'; }],
  ['RD-02 source snapshot receipt path', (v) => { v.source_snapshots.rd02_class_receipt_path = 'changed.json'; }],
  ['RD-02 source snapshot merge', (v) => { v.source_snapshots.rd02_merge_commit = '0'.repeat(40); }]
];
for (const [label, mutate] of ledgerMutations) {
  const candidate = clone(currentLedger);
  mutate(candidate);
  assert.throws(
    () => classifyCurrentLedgerCustody(candidate, PROMOTION_MANIFEST_SHA256),
    undefined,
    label
  );
  refused += 1;
}
assert.equal(rd02Promotion(currentLedger).merge_commit, PROMOTION_MERGE);
assert.equal(rd02Promotion(currentLedger).closure_reference_path, CLOSURE_PATH);

const schemaMutations = [
  ['schema root reopening', (s) => { s.additionalProperties = true; }],
  ['schema version', (s) => { s.properties.schema_version.const = 'v2'; }],
  ['schema row minimum', (s) => { s.properties.rows.minItems = 17; }],
  ['schema row maximum', (s) => { s.properties.rows.maxItems = 19; }],
  ['schema required fields', (s) => { s.properties.required_fields.const.pop(); }],
  ['schema observed count', (s) => { s.properties.counts.properties.observed_fields.const = 54; }],
  ['schema withheld count', (s) => { s.properties.counts.properties.identity_withheld_under_policy_fields.const = 2; }],
  ['schema restricted count', (s) => { s.properties.counts.properties.source_restricted_fields.const = 6; }],
  ['schema unrecovered count', (s) => { s.properties.counts.properties.not_publicly_recovered_fields.const = 120; }],
  ['schema terminal count', (s) => { s.properties.counts.properties.terminal_fields.const = 179; }],
  ['schema terminal family', (s) => { s.properties.current_result.properties.terminal_state.const = 'evidence_complete'; }],
  ['schema class closure', (s) => { s.properties.current_result.properties.class_closed.const = false; }],
  ['schema complete ledger', (s) => { s.properties.current_result.properties.complete_portfolio_lifecycle_ledger_observed.const = true; }]
];
for (const [label, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateSchemaContract(candidate), undefined, label);
  refused += 1;
}

console.log(`RD-02 Wave-03 portfolio-lifecycle adversarial suite: ${refused} mutations refused`);
