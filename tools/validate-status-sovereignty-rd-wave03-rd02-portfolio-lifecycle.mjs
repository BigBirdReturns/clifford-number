#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ROOT,
  WAVE_ID,
  LANE_ID,
  CLASS_ID,
  ISSUE,
  SOURCE_PR,
  CLASS_LABEL,
  TERMINAL_STATE,
  CANONICAL_SOURCE_MERGE,
  CURRENT_LEDGER_PATH,
  MATRIX_PATH,
  PRODUCT_ROOT,
  CLOSURE_PATH,
  REQUIRED_FIELDS,
  INPUT_SHA256,
  deriveProduct,
  checkProduct
} from './build-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle.schema.json';
const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const allFalse = (value, keys, prefix) => { for (const key of keys) ok(value[key] === false, `${prefix}.${key} changed`); };
const allNone = (value, keys, prefix) => { for (const key of keys) ok(value[key] === 'none', `${prefix}.${key} changed`); };
const lifecycleFields = REQUIRED_FIELDS.slice(1, 8);
const sourceIds = ['STIFEL-AM-FORWARD-2024-FINAL-APPROVAL', 'STIFEL-NORTH-ATLANTIC-2021-MANAGER-LINEAGE'];

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root reopened');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd-wave03-rd02-portfolio-lifecycle-terminal-matrix@1', 'schema version changed');
  ok(schema?.properties?.wave_id?.const === WAVE_ID && schema?.properties?.lane_id?.const === LANE_ID && schema?.properties?.class_id?.const === CLASS_ID, 'schema identity changed');
  ok(schema?.properties?.issue?.const === ISSUE && schema?.properties?.class_label?.const === CLASS_LABEL, 'schema issue or label changed');
  ok(schema?.properties?.rows?.minItems === 18 && schema?.properties?.rows?.maxItems === 18, 'schema row denominator changed');
  same(schema?.properties?.required_fields?.const, REQUIRED_FIELDS, 'schema required fields changed');
  const counts = schema?.properties?.counts?.properties;
  for (const [key, expected] of Object.entries({
    cohort_rows: 18,
    publicly_named_rows: 17,
    identity_withheld_rows: 1,
    required_fields_per_row: 10,
    required_fields: 180,
    observed_fields: 53,
    identity_withheld_under_policy_fields: 1,
    source_restricted_fields: 7,
    not_publicly_recovered_fields: 119,
    terminal_fields: 180,
    bounded_source_unavailable_rows: 17,
    bounded_source_restricted_rows: 1,
    search_routes: 51,
    unique_search_candidates: 210,
    candidate_followup_routes: 10,
    same_host_followup_routes: 5,
    disclosure_leaf_routes: 2,
    failed_route_replays: 1,
    admitted_leaf_sources: 2,
    admitted_bounded_observations: 11,
    lifecycle_events_observed: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0
  })) ok(counts?.[key]?.const === expected, `schema count ${key} changed`);
  ok(schema?.properties?.current_result?.properties?.terminal_state?.const === TERMINAL_STATE, 'schema terminal state changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === true, 'schema class closure changed');
  ok(schema?.properties?.current_result?.properties?.complete_portfolio_lifecycle_ledger_observed?.const === false, 'schema complete-ledger boundary changed');
  return true;
}

function validateField(field, expectedState, context) {
  ok(field && field.state === expectedState, `${context}: state changed`);
  ok(Array.isArray(field.source_ids) && Array.isArray(field.custody_paths), `${context}: custody arrays changed`);
  ok(typeof field.note === 'string' && field.note.length > 20, `${context}: note missing`);
  ok(field.fixed_protocol_complete === true && field.terminal_for_class_closure === true, `${context}: terminality changed`);
}

export function validateTerminalValue(terminal) {
  ok(terminal.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-terminal-matrix@1', 'terminal schema changed');
  ok(terminal.wave_id === WAVE_ID && terminal.lane_id === LANE_ID && terminal.class_id === CLASS_ID && terminal.issue === ISSUE, 'terminal identity changed');
  ok(terminal.class_label === CLASS_LABEL && terminal.status === 'eighteen_row_portfolio_lifecycle_terminal_bounded_source_unavailable', 'terminal label or status changed');
  same(terminal.required_fields, REQUIRED_FIELDS, 'terminal required-field order changed');
  ok(terminal.rows.length === 18, 'terminal row denominator changed');
  same(terminal.rows.map((row) => row.unit_ordinal), Array.from({ length: 18 }, (_, index) => index + 1), 'terminal row order changed');
  unique(terminal.rows.map((row) => row.unit_id), 'duplicate terminal unit ID');

  for (const row of terminal.rows) {
    same(Object.keys(row.fields), REQUIRED_FIELDS, `${row.unit_ordinal}: field order changed`);
    ok(row.row_result.required_fields === 10 && row.row_result.terminal_fields === 10 && row.row_result.row_closed === true, `${row.unit_ordinal}: row result changed`);
    ok(row.row_result.fixed_protocol_executed === true && row.row_result.lifecycle_events_observed === 0, `${row.unit_ordinal}: row execution or lifecycle count changed`);
    const restricted = row.unit_ordinal === 18;
    validateField(row.fields.canonical_cohort_row_and_legal_vehicle_or_withheld_state_label, restricted ? 'identity_withheld_under_policy' : 'observed', `${row.unit_ordinal}: identity`);
    for (const key of lifecycleFields) validateField(row.fields[key], restricted ? 'source_restricted' : 'not_publicly_recovered', `${row.unit_ordinal}: ${key}`);
    validateField(row.fields.source_identities_and_exact_custody, 'observed', `${row.unit_ordinal}: source custody`);
    validateField(row.fields.field_and_row_terminal_state, 'observed', `${row.unit_ordinal}: row terminal state`);
    const expectedRowState = restricted ? 'bounded_source_restricted' : TERMINAL_STATE;
    ok(row.row_result.row_terminal_state === expectedRowState, `${row.unit_ordinal}: row terminal family changed`);
    ok(row.fields.field_and_row_terminal_state.value.row_terminal_state === expectedRowState, `${row.unit_ordinal}: terminal field family changed`);
    const expectedRoutes = restricted ? [] : ['PORTFOLIO', 'DISPOSITION', 'RECOVERY'].map((kind) => `RD02-W03-R${String(row.unit_ordinal).padStart(2, '0')}-${kind}`);
    same(row.fields.source_identities_and_exact_custody.value.unit_search_route_ids, expectedRoutes, `${row.unit_ordinal}: unit route IDs changed`);
    if (row.unit_ordinal === 15) {
      same(row.fields.source_identities_and_exact_custody.value.admitted_leaf_source_ids, sourceIds, 'unit 15 admitted source IDs changed');
      for (const key of lifecycleFields) {
        same(row.fields[key].source_ids, sourceIds, `unit 15 ${key}: source IDs changed`);
        ok(row.fields[key].value.admitted_bounded_observations === 11 && row.fields[key].value.lifecycle_events_observed === 0, `unit 15 ${key}: bounded observation custody changed`);
      }
    } else {
      same(row.fields.source_identities_and_exact_custody.value.admitted_leaf_source_ids, [], `${row.unit_ordinal}: unexpected leaf source`);
      for (const key of lifecycleFields) same(row.fields[key].source_ids, [], `${row.unit_ordinal}: ${key} unexpected source`);
    }
  }

  const withheld = terminal.rows[17];
  ok(withheld.identity_state === 'identity_withheld_under_policy' && withheld.legal_vehicle === null && withheld.withheld_state_label === 'withheld under SBA policy', 'withheld row changed');
  const counts = terminal.counts;
  same({
    cohort_rows: counts.cohort_rows,
    named: counts.publicly_named_rows,
    withheld_rows: counts.identity_withheld_rows,
    required_per_row: counts.required_fields_per_row,
    required: counts.required_fields,
    observed: counts.observed_fields,
    withheld_fields: counts.identity_withheld_under_policy_fields,
    restricted: counts.source_restricted_fields,
    unrecovered: counts.not_publicly_recovered_fields,
    terminal: counts.terminal_fields,
    unavailable_rows: counts.bounded_source_unavailable_rows,
    restricted_rows: counts.bounded_source_restricted_rows
  }, {
    cohort_rows: 18,
    named: 17,
    withheld_rows: 1,
    required_per_row: 10,
    required: 180,
    observed: 53,
    withheld_fields: 1,
    restricted: 7,
    unrecovered: 119,
    terminal: 180,
    unavailable_rows: 17,
    restricted_rows: 1
  }, 'terminal arithmetic changed');
  ok(counts.observed_fields + counts.identity_withheld_under_policy_fields + counts.source_restricted_fields + counts.not_publicly_recovered_fields === 180, 'state counts do not sum to 180');
  for (const key of [
    'lifecycle_events_observed',
    'publicly_identified_portfolio_investments_observed',
    'publicly_identified_follow_on_investments_observed',
    'publicly_identified_exits_observed',
    'publicly_identified_write_offs_or_realized_losses_observed',
    'publicly_identified_defaults_or_cures_observed',
    'publicly_identified_realized_fund_returns_observed',
    'sba_repayment_or_loss_allocation_events_observed',
    'result_spawned_requests',
    'external_contacts',
    'external_reviews'
  ]) ok(counts[key] === 0, `terminal zero count ${key} changed`);
  same({ search: counts.search_routes, candidates: counts.unique_search_candidates, candidate_followup: counts.candidate_followup_routes, same_host: counts.same_host_followup_routes, leaves: counts.disclosure_leaf_routes, replay: counts.failed_route_replays, sources: counts.admitted_leaf_sources, observations: counts.admitted_bounded_observations }, { search: 51, candidates: 210, candidate_followup: 10, same_host: 5, leaves: 2, replay: 1, sources: 2, observations: 11 }, 'pipeline counts changed');

  const source = terminal.source_product;
  ok(source.canonical_source_merge === CANONICAL_SOURCE_MERGE, 'canonical source merge changed');
  same(source.input_sha256, INPUT_SHA256, 'input digest map changed');
  ok(source.parent_wave02_custody.row_membership_reused_without_reopening_parent_class === true, 'parent custody reopened');
  ok(source.acquisition.search_census.fixed_routes === 51 && source.acquisition.search_census.terminal_routes === 51, 'source search custody changed');
  ok(source.acquisition.candidate_adjudication.terminal_candidate_urls === 210 && source.acquisition.candidate_adjudication.fixed_followup_routes === 10, 'source candidate custody changed');
  ok(source.acquisition.candidate_followups.fixed_routes === 10 && source.acquisition.same_host_followups.fixed_routes === 5, 'source followup custody changed');
  ok(source.acquisition.disclosure_leaves.fixed_routes === 2 && source.acquisition.manager_lineage_replay.fixed_routes === 1, 'source leaf custody changed');
  ok(source.acquisition.result_spawned_requests === 0 && source.acquisition.automatic_additional_search_pass_authorized === false, 'source fanout widened');
  ok(source.admitted_leaf_sources.length === 2 && source.admitted_leaf_sources.every((item) => item.lifecycle_events_observed === 0), 'source admissions changed');

  const result = terminal.current_result;
  ok(result.terminal_state === TERMINAL_STATE && result.fixed_protocol_complete === true && result.class_closed === true, 'terminal result changed');
  ok(result.all_eighteen_rows_preserved === true && result.all_one_hundred_eighty_fields_terminal === true, 'terminal denominator completion changed');
  ok(result.complete_portfolio_lifecycle_ledger_observed === false && result.lifecycle_events_observed === 0, 'complete-ledger or lifecycle result escalated');
  allFalse(result, ['automatic_additional_search_pass_authorized','capital_conversion_finding','favoritism_finding','extraction_finding','coordination_finding','common_purpose_finding','reviewed_disposition_changed','complete_compact_finding','racial_order_finding','prevalence_finding','outside_human_dependency','project_blocking'], 'current_result');
  allNone(result, ['publication_effect','adoption_effect','graph_effect'], 'current_result');
  for (const [key, value] of Object.entries(terminal.boundaries)) {
    if (key.endsWith('_effect')) ok(value === 'none', `boundary ${key} changed`);
    else ok(value === false, `boundary ${key} weakened`);
  }
  return true;
}

function validateManifest(root, manifest) {
  ok(manifest.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-manifest@1', 'manifest schema changed');
  same(manifest.entries.map((entry) => entry.path), ['class-receipt.json','summary.json','terminal-field-matrix.json'], 'manifest paths changed');
  for (const entry of manifest.entries) {
    const bytes = readBytes(root, `${PRODUCT_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: manifest byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: manifest digest changed`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''), 'utf8'));
  ok(combined === manifest.combined_sha256, 'manifest combined digest changed');
}

function validateLedgerCustody(current, manifestCombined) {
  const pre = current.counts.closed_residual_classes === 8 && current.counts.open_residual_classes === 34 && current.current_result.open_selected_class_ids.includes(CLASS_ID) && !current.current_result.closed_class_ids.includes(CLASS_ID);
  const postRow = current.promoted_class_receipts?.find((row) => row.class_id === CLASS_ID);
  const post = current.counts.closed_residual_classes === 9 && current.counts.open_residual_classes === 33 && !current.current_result.open_selected_class_ids.includes(CLASS_ID) && current.current_result.closed_class_ids.includes(CLASS_ID) && postRow?.source_pr === SOURCE_PR && postRow?.manifest_combined_sha256 === manifestCombined && postRow?.terminal_state === TERMINAL_STATE && postRow?.class_closed === true;
  ok(pre || post, 'cumulative ledger is neither exact RD-02 pre-promotion nor post-promotion custody');
  return pre ? 'pre_promotion' : 'post_promotion';
}

function validateGit(root) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  const sourceObject = spawnSync('git', ['cat-file', '-e', `${CANONICAL_SOURCE_MERGE}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (sourceObject.status === 0) {
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', CANONICAL_SOURCE_MERGE, 'HEAD'], { cwd: root, encoding: 'utf8' });
    ok(ancestor.status === 0, 'canonical RD-02 source merge is not an ancestor');
  }
  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n');
  ok(!tracked.some((rel) => rel.includes('temporary-rd02') || rel.startsWith('.rd02-terminal-source-export') || rel.startsWith('.ssc-rd02-')), 'temporary RD-02 transport retained');
}

export function validateProduct(root = ROOT) {
  checkProduct(root);
  const terminal = read(root, `${PRODUCT_ROOT}/terminal-field-matrix.json`);
  const receipt = read(root, `${PRODUCT_ROOT}/class-receipt.json`);
  const summary = read(root, `${PRODUCT_ROOT}/summary.json`);
  const manifest = read(root, `${PRODUCT_ROOT}/manifest.json`);
  const closure = read(root, CLOSURE_PATH);
  const schema = read(root, SCHEMA_PATH);
  const current = read(root, CURRENT_LEDGER_PATH);
  const derived = deriveProduct(root);
  same(terminal, derived.terminal, 'terminal differs from derivation');
  same(receipt, derived.receipt, 'receipt differs from derivation');
  same(summary, derived.summary, 'summary differs from derivation');
  same(manifest, derived.manifest, 'manifest differs from derivation');
  same(closure, derived.closure, 'closure differs from derivation');
  validateSchemaContract(schema);
  validateTerminalValue(terminal);
  same(receipt.counts, terminal.counts, 'receipt counts changed');
  same(summary.counts, terminal.counts, 'summary counts changed');
  same(receipt.current_result, terminal.current_result, 'receipt result changed');
  same(summary.current_result, terminal.current_result, 'summary result changed');
  ok(receipt.terminal_state === TERMINAL_STATE && receipt.class_closed === true && receipt.label_custody.labels_exact_match === true && receipt.label_custody.reconciliation === 'none', 'class receipt changed');
  same(receipt.residual_atlas_effect_if_promoted, { canonical_classes: 42, open_before: 34, closed_before: 8, open_after: 33, closed_after: 9 }, 'atlas transition changed');
  validateManifest(root, manifest);
  ok(closure.source_pr === SOURCE_PR && closure.child_issue === ISSUE && closure.class_id === CLASS_ID && closure.class_closed === true, 'closure reference changed');
  ok(closure.product.manifest_combined_sha256 === manifest.combined_sha256, 'closure manifest binding changed');
  ok(closure.source_custody.canonical_source_merge === CANONICAL_SOURCE_MERGE && closure.source_custody.lifecycle_events_observed === 0, 'closure source custody changed');
  validateLedgerCustody(current, manifest.combined_sha256);
  validateGit(root);
  return { terminal, receipt, summary, manifest, closure };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const bundle = validateProduct(ROOT);
  console.log(`RD-02 Wave-03 terminal product validated: ${bundle.terminal.counts.terminal_fields}/180 terminal; ${bundle.terminal.counts.lifecycle_events_observed} lifecycle events; ${bundle.manifest.combined_sha256}`);
}
