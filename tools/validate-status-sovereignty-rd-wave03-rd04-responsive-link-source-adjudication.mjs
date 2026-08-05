#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_DIR,
  expectedOutputs,
  loadInputs,
  sha256,
  validateInputs,
} from './build-status-sovereignty-rd-wave03-rd04-responsive-link-source-adjudication.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), 'utf8'));
}
function readJsonl(rel) {
  return fs.readFileSync(path.join(DATA_DIR, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}
function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: object required`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label}: unexpected keys`);
}

export function validateProduct() {
  validateInputs(loadInputs());
  const outputs = expectedOutputs();
  for (const [rel, expected] of Object.entries(outputs)) {
    const target = path.join(DATA_DIR, rel);
    assert(fs.existsSync(target), `${rel}: missing`);
    assert(fs.readFileSync(target, 'utf8') === expected, `${rel}: deterministic mismatch`);
  }

  const index = readJson('index.json');
  exactKeys(index, [
    'schema_version','wave_id','lane_id','class_id','issue','capture_custody_path','capture_execution_receipt_path',
    'capture_route_results_path','source_decisions_path','source_adjudications_path','offline_field_review_protocol_path',
    'counts','capture_state_counts','source_class_counts','current_result','next_bounded_operation',
  ], 'index');
  assert(index.schema_version === 'ssc-rd04-wave03-responsive-link-source-adjudication-index@1', 'index schema');
  assert(index.wave_id === 'SSC-RD-W03' && index.lane_id === 'RD-04' && index.class_id === 'RD-04-C02' && index.issue === 1017, 'index identity');
  assert(index.counts.captured_routes === 62 && index.counts.captured_states === 30, 'index capture denominator');
  assert(index.counts.sources_admitted_for_any_bounded_scope === 58, 'index source admissions');
  assert(index.counts.offline_field_review_sources === 36, 'index field-review denominator');
  assert(index.counts.locator_context_or_toolkit_only_sources === 22, 'index context-only count');
  assert(index.counts.no_source_admitted === 4, 'index no-source count');
  assert(index.counts.substantive_field_classifications === 0 && index.counts.substantive_field_terminalizations === 0, 'index field effect');
  assert(index.counts.terminal_field_cells_before === 100 && index.counts.terminal_field_cells_after === 100 && index.counts.still_open_field_cells_after === 350, 'matrix unchanged');
  assert(index.current_result.responsive_link_source_adjudication_complete === true, 'source adjudication complete');
  assert(index.current_result.offline_field_review_protocol_frozen === true, 'offline review frozen');
  assert(index.current_result.field_matrix_changed === false && index.current_result.class_closed === false, 'class remains open');
  assert(index.current_result.outside_human_dependency === false, 'no outside-human dependency');
  assert(index.current_result.publication_effect === 'none' && index.current_result.adoption_effect === 'none' && index.current_result.graph_effect === 'none', 'no external authority effect');

  const rows = readJsonl('source-adjudications.jsonl');
  assert(rows.length === 62, '62 adjudication rows');
  assert(new Set(rows.map((r) => r.route_id)).size === 62, 'unique adjudication routes');
  assert(rows.reduce((n, r) => n + Number(r.source_admitted), 0) === 58, '58 admitted rows');
  assert(rows.reduce((n, r) => n + Number(r.field_review_selected), 0) === 36, '36 field-review rows');
  assert(rows.filter((r) => r.source_admitted && !r.field_review_selected).length === 22, '22 context-only rows');
  assert(rows.filter((r) => !r.source_admitted).length === 4, '4 no-source rows');
  assert(rows.every((r) => r.field_classification_effect === 'none' && r.substantive_field_terminalizations === 0 && r.class_closed === false), 'rows may not classify or close');
  assert(rows.every((r) => r.result_spawned_requests === 0 && r.outside_human_dependency === false), 'rows may not spawn or depend on outside humans');
  assert(rows.every((r) => r.publication_effect === 'none' && r.adoption_effect === 'none' && r.graph_effect === 'none'), 'rows may not publish, adopt, or graph');
  assert(rows.filter((r) => r.capture_state === 'http_success_pending_source_adjudication').length === 59, '59 allowed-host successes');
  assert(rows.filter((r) => r.capture_state === 'terminal_disallowed_final_host').length === 2, '2 disallowed hosts');
  assert(rows.filter((r) => r.capture_state === 'terminal_http_non_success').length === 1, '1 HTTP non-success');
  assert(rows.every((r) => !r.source_admitted || r.capture_state === 'http_success_pending_source_adjudication'), 'admission requires allowed-host success');

  const protocol = readJson('offline-field-review-protocol.json');
  assert(protocol.schema_version === 'ssc-rd04-wave03-responsive-link-offline-field-review-protocol@1', 'offline protocol schema');
  assert(protocol.fixed_source_rows === 36 && protocol.review_rows.length === 36, 'offline protocol denominator');
  assert(protocol.empirical_requests === 0 && protocol.result_spawned_requests === 0, 'offline protocol cannot request');
  assert(new Set(protocol.review_rows.map((r) => r.route_id)).size === 36, 'offline routes unique');
  assert(protocol.review_rows.every((r, i) => r.review_ordinal === i + 1), 'offline review order');
  assert(protocol.review_rows.every((r) => r.empirical_request_authority === false && r.source_admission_authority === false && r.field_classification_authority === false && r.class_closure_authority === false), 'offline review authority withheld');
  assert(protocol.review_rows.every((r) => r.result_spawned_requests === 0 && r.outside_human_dependency === false), 'offline review no spawned requests or human gate');
  assert(protocol.authority.automatic_source_admission === false && protocol.authority.automatic_field_classification === false && protocol.authority.automatic_class_closure === false, 'offline protocol automation boundary');

  const manifest = readJson('product-manifest.json');
  assert(manifest.schema_version === 'ssc-rd04-wave03-responsive-link-source-adjudication-manifest@1', 'product manifest schema');
  assert(manifest.permanent_data_files === 8 && manifest.entries.length === 7, 'product manifest counts');
  const expectedPaths = [
    'capture-custody.json','capture-execution-receipt.json','capture-route-results.json','source-decisions.json',
    'source-adjudications.jsonl','offline-field-review-protocol.json','index.json',
  ];
  assert(JSON.stringify(manifest.entries.map((e) => e.path)) === JSON.stringify(expectedPaths), 'manifest path order');
  for (const entry of manifest.entries) {
    const data = fs.readFileSync(path.join(DATA_DIR, entry.path));
    assert(data.length === entry.bytes, `${entry.path}: manifest bytes`);
    assert(sha256(data) === entry.sha256, `${entry.path}: manifest SHA`);
  }
  const combined = sha256(manifest.entries.map((e) => `${e.path}\t${e.bytes}\t${e.sha256}\n`).join(''));
  assert(combined === manifest.combined_sha256, 'manifest combined SHA');

  return { index, rows, protocol, manifest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { index, manifest } = validateProduct();
  console.log('responsive_link_source_adjudication_validation=pass');
  console.log(`captured_routes=${index.counts.captured_routes}`);
  console.log(`sources_admitted=${index.counts.sources_admitted_for_any_bounded_scope}`);
  console.log(`offline_field_review_sources=${index.counts.offline_field_review_sources}`);
  console.log(`field_terminalizations=${index.counts.substantive_field_terminalizations}`);
  console.log(`manifest_combined_sha256=${manifest.combined_sha256}`);
}
