#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ROOT,
  CURRENT_PATH,
  RD01_CLOSURE_PATH,
  RD01_RECEIPT_PATH,
  RD01_MANIFEST_PATH,
  RD03_CLOSURE_PATH,
  RD03_RECEIPT_PATH,
  RD03_MANIFEST_PATH,
  RD02_CLOSURE_PATH,
  RD02_RECEIPT_PATH,
  RD02_MANIFEST_PATH,
  RD05_CLOSURE_PATH,
  RD05_RECEIPT_PATH,
  RD05_MANIFEST_PATH,
  WAVE02_PROMOTION_MERGE,
  RD01_MERGE,
  RD03_MERGE,
  RD02_MERGE,
  RD05_MERGE,
  RD01_MANIFEST,
  RD03_MANIFEST,
  RD02_MANIFEST,
  RD05_MANIFEST,
  RD03_LABEL_RECONCILIATION,
  INHERITED_CLOSED_IDS,
  CLOSED_IDS,
  OPEN_SELECTED_IDS,
  deriveCurrent
} from './build-status-sovereignty-residual-denominator-wave-03-current.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema top-level closure changed');
  ok(schema?.properties?.schema_version?.const === 'status-sovereignty-residual-denominator-wave-03-current@1', 'schema version contract changed');
  ok(schema?.properties?.authority?.const === 'four_wave03_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'schema authority contract changed');
  ok(schema?.properties?.promoted_class_receipts?.minItems === 10 && schema?.properties?.promoted_class_receipts?.maxItems === 10, 'schema promoted-receipt denominator changed');
  ok(schema?.properties?.selected_classes_open?.minItems === 2 && schema?.properties?.selected_classes_open?.maxItems === 2, 'schema open-selected denominator changed');
  ok(schema?.properties?.counts?.properties?.canonical_residual_classes?.const === 42, 'schema canonical denominator changed');
  ok(schema?.properties?.counts?.properties?.closed_residual_classes?.const === 10, 'schema closed count changed');
  ok(schema?.properties?.counts?.properties?.open_residual_classes?.const === 32, 'schema open count changed');
  ok(schema?.properties?.counts?.properties?.wave_03_terminal_class_receipts?.const === 4, 'schema Wave-03 receipt count changed');
  ok(schema?.properties?.counts?.properties?.wave_03_label_reconciliations?.const === 1, 'schema Wave-03 label reconciliation count changed');
  same(schema?.properties?.current_result?.properties?.closed_class_ids?.const, [...CLOSED_IDS], 'schema closed IDs changed');
  same(schema?.properties?.current_result?.properties?.open_selected_class_ids?.const, [...OPEN_SELECTED_IDS], 'schema open selected IDs changed');
  ok(schema?.properties?.current_result?.properties?.wave_complete?.const === false, 'schema Wave-03 completion boundary changed');
  ok(schema?.properties?.current_result?.properties?.residual_denominator_complete?.const === false, 'schema residual completion boundary changed');
  for (const key of [
    'wave_02_receipts_reopened_or_rewritten',
    'one_wave03_class_closure_closes_lane',
    'one_wave03_class_closure_closes_wave',
    'bounded_source_unavailable_is_event_absence',
    'bounded_source_restricted_is_event_absence',
    'not_publicly_recovered_is_nonoccurrence',
    'prospective_re_evaluation_is_completed_re_evaluation',
    'outstanding_balance_is_default',
    'scheduled_payment_is_observed_payment',
    'class_closure_is_selector_accuracy_or_technical_superiority',
    'ten_closures_are_complete_compact',
    'functional_convergence_is_coordination_or_common_purpose'
  ]) {
    ok(schema?.properties?.boundaries?.properties?.[key]?.const === false, `schema boundary ${key} changed`);
  }
  return true;
}

export function validateValue(value, root = ROOT) {
  const derived = deriveCurrent(root);
  same(value, derived, 'Wave-03 current ledger differs from deterministic source derivation');

  ok(value?.schema_version === 'status-sovereignty-residual-denominator-wave-03-current@1', 'current-ledger schema changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.issue === 1013, 'current-ledger identity changed');
  ok(value?.authority === 'four_wave03_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'current-ledger authority changed');
  ok(value?.promoted_class_receipts?.length === 10, 'ten promoted receipts required');
  same(value.promoted_class_receipts.map((row) => row.class_id), [...CLOSED_IDS], 'promoted receipt order changed');
  ok(new Set(value.promoted_class_receipts.map((row) => row.class_id)).size === 10, 'promoted class IDs must be unique');
  ok(value.promoted_class_receipts.every((row) => row.class_closed === true), 'promoted receipt reopened');

  const rd01 = value.promoted_class_receipts[6];
  ok(rd01.lane_id === 'RD-01' && rd01.class_id === 'RD-01-C06', 'RD-01 promotion identity changed');
  ok(rd01.issue === 1014 && rd01.source_pr === 1022 && rd01.merge_commit === RD01_MERGE, 'RD-01 promotion custody changed');
  ok(rd01.manifest_combined_sha256 === RD01_MANIFEST, 'RD-01 promotion manifest changed');
  ok(rd01.terminal_state === 'bounded_source_unavailable', 'RD-01 promotion state changed');
  ok(rd01.labels_exact_match === true && rd01.label_reconciliation === 'none', 'RD-01 promotion label custody changed');

  const rd03 = value.promoted_class_receipts[7];
  ok(rd03.lane_id === 'RD-03' && rd03.class_id === 'RD-03-C05', 'RD-03 promotion identity changed');
  ok(rd03.issue === 1016 && rd03.source_pr === 1057 && rd03.merge_commit === RD03_MERGE, 'RD-03 promotion custody changed');
  ok(rd03.manifest_combined_sha256 === RD03_MANIFEST, 'RD-03 promotion manifest changed');
  ok(rd03.terminal_state === 'bounded_source_restricted', 'RD-03 promotion state changed');
  ok(rd03.labels_exact_match === false, 'RD-03 label difference was silently erased');
  ok(rd03.label_reconciliation === RD03_LABEL_RECONCILIATION, 'RD-03 label reconciliation changed');


  const rd02 = value.promoted_class_receipts[8];
  ok(rd02.lane_id === 'RD-02' && rd02.class_id === 'RD-02-C05', 'RD-02 promotion identity changed');
  ok(rd02.issue === 1015 && rd02.source_pr === 1098 && rd02.merge_commit === RD02_MERGE, 'RD-02 promotion custody changed');
  ok(rd02.manifest_combined_sha256 === RD02_MANIFEST, 'RD-02 promotion manifest changed');
  ok(rd02.terminal_state === 'bounded_source_unavailable', 'RD-02 promotion state changed');
  ok(rd02.labels_exact_match === true && rd02.label_reconciliation === 'none', 'RD-02 promotion label custody changed');



  const rd05 = value.promoted_class_receipts[9];
  ok(rd05.lane_id === 'RD-05' && rd05.class_id === 'RD-05-C02', 'RD-05 promotion identity changed');
  ok(rd05.issue === 1018 && rd05.source_pr === 1227 && rd05.merge_commit === RD05_MERGE, 'RD-05 promotion custody changed');
  ok(rd05.manifest_combined_sha256 === RD05_MANIFEST, 'RD-05 promotion manifest changed');
  ok(rd05.terminal_state === 'bounded_source_unavailable', 'RD-05 promotion state changed');
  ok(rd05.labels_exact_match === true && rd05.label_reconciliation === 'none', 'RD-05 promotion label custody changed');

  same(value.selected_classes_open.map((row) => row.class_id), [...OPEN_SELECTED_IDS], 'open selected class order changed');
  ok(value.selected_classes_open.every((row) => row.state === 'open' && row.class_closed === false), 'open selected row state changed');
  ok(new Set(value.selected_classes_open.map((row) => row.class_id)).size === 2, 'open selected class IDs must be unique');
  ok(!value.selected_classes_open.some((row) => value.current_result.closed_class_ids.includes(row.class_id)), 'class appears in both closed and open sets');

  ok(value.counts.canonical_residual_classes === 42, 'canonical denominator changed');
  ok(value.counts.classes_closed_before_wave === 6, 'Wave-03 starting closed count changed');
  ok(value.counts.wave_03_selected_class_attempts === 6, 'Wave-03 selected attempt denominator changed');
  ok(value.counts.wave_03_terminal_class_receipts === 4 && value.counts.classes_closed_this_wave === 4, 'Wave-03 terminal receipt accounting changed');
  ok(value.counts.closed_residual_classes === 10 && value.counts.open_residual_classes === 32, 'residual arithmetic changed');
  ok(value.counts.closed_residual_classes + value.counts.open_residual_classes === value.counts.canonical_residual_classes, 'residual arithmetic does not sum to 42');
  ok(value.counts.label_reconciliations === 2 && value.counts.wave_03_label_reconciliations === 1, 'label reconciliation accounting changed');

  for (const key of [
    'outside_human_dependencies',
    'external_contacts',
    'external_reviews',
    'reviewed_disposition_changes',
    'complete_compact_findings',
    'racial_order_findings',
    'prevalence_findings',
    'coordination_findings',
    'common_purpose_findings',
    'graph_effects',
    'publication_effects',
    'adoption_effects'
  ]) {
    ok(value.counts[key] === 0, `authority count ${key} changed`);
  }

  same(value.current_result.closed_class_ids, [...CLOSED_IDS], 'current-result closed IDs changed');
  same(value.current_result.open_selected_class_ids, [...OPEN_SELECTED_IDS], 'current-result open selected IDs changed');
  ok(value.current_result.classes_closed === 10 && value.current_result.classes_open === 32, 'current-result arithmetic changed');
  ok(value.current_result.wave_03_selected_attempts_terminal === 4, 'current-result Wave-03 terminal count changed');
  ok(value.current_result.all_six_selected_classes_closed === false, 'all six Wave-03 attempts were incorrectly marked closed');
  ok(value.current_result.wave_complete === false && value.current_result.residual_denominator_complete === false, 'completion boundary changed');
  ok(value.current_result.outside_human_dependency === false && value.current_result.project_blocking === false, 'human-dependency or blocking boundary changed');

  for (const location of [value.current_result, value.boundaries]) {
    for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
      ok(location[key] === 'none', `${key} changed`);
    }
  }
  for (const key of [
    'wave_02_receipts_reopened_or_rewritten',
    'one_wave03_class_closure_closes_lane',
    'one_wave03_class_closure_closes_wave',
    'bounded_source_unavailable_is_event_absence',
    'bounded_source_restricted_is_event_absence',
    'not_publicly_recovered_is_nonoccurrence',
    'prospective_re_evaluation_is_completed_re_evaluation',
    'outstanding_balance_is_default',
    'scheduled_payment_is_observed_payment',
    'class_closure_is_selector_accuracy_or_technical_superiority',
    'ten_closures_are_complete_compact',
    'functional_convergence_is_coordination_or_common_purpose'
  ]) {
    ok(value.boundaries[key] === false, `boundary ${key} changed`);
  }
  return true;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function validateRepository(root = ROOT) {
  const current = read(root, CURRENT_PATH);
  const schema = read(root, SCHEMA_PATH);
  validateSchemaContract(schema);
  validateValue(current, root);

  for (const merge of [WAVE02_PROMOTION_MERGE, RD01_MERGE, RD03_MERGE, RD02_MERGE, RD05_MERGE]) {
    execFileSync('git', ['merge-base', '--is-ancestor', merge, 'HEAD'], { cwd: root, stdio: 'ignore' });
    ok(git(root, ['show', '-s', '--format=%H', merge]) === merge, `${merge}: merge object changed`);
  }
  for (const rel of [RD01_CLOSURE_PATH, RD01_RECEIPT_PATH, RD01_MANIFEST_PATH]) {
    execFileSync('git', ['cat-file', '-e', `${RD01_MERGE}:${rel}`], { cwd: root, stdio: 'ignore' });
  }
  for (const rel of [RD03_CLOSURE_PATH, RD03_RECEIPT_PATH, RD03_MANIFEST_PATH]) {
    execFileSync('git', ['cat-file', '-e', `${RD03_MERGE}:${rel}`], { cwd: root, stdio: 'ignore' });
  }
  for (const rel of [RD02_CLOSURE_PATH, RD02_RECEIPT_PATH, RD02_MANIFEST_PATH]) {
    execFileSync('git', ['cat-file', '-e', `${RD02_MERGE}:${rel}`], { cwd: root, stdio: 'ignore' });
  }
  for (const rel of [RD05_CLOSURE_PATH, RD05_RECEIPT_PATH, RD05_MANIFEST_PATH]) {
    execFileSync('git', ['cat-file', '-e', `${RD05_MERGE}:${rel}`], { cwd: root, stdio: 'ignore' });
  }
  return true;
}

function run() {
  validateRepository(ROOT);
  console.log('Wave-03 current ledger validated: 32 open / 10 closed; RD-05-C02 exact merge custody preserved');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
