#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PATHS, buildExpectedBundle, loadCommittedBundle, stableJson } from './build-status-sovereignty-rd-wave03-rd01-methodology-correction.mjs';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, keys, label) => {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  ok(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label} keys changed`);
};
const unique = (values, label) => ok(new Set(values).size === values.length, `${label} duplicated`);
const TERMINAL_FIELD_STATES = new Set(['observed','not_applicable_by_edition_state','source_restricted','source_unavailable_after_fixed_protocol','not_publicly_recovered']);
const REQUIRED_FIELDS = [
  'edition_identity_and_publication_cutoff',
  'methodology_identity_and_published_input_description',
  'published_correction_or_errata_record',
  'published_appeal_or_challenge_route',
  'published_re_evaluation_reranking_or_reconsideration_record',
  'version_exception_and_override_custody_where_public',
  'source_identities_and_exact_locators',
  'field_and_row_terminal_state'
];

export function validateBundleShape(bundle) {
  exactKeys(bundle, ['capture','matrix','summary','classReceipt','manifest','closure','schema'], 'bundle');
  const { capture, matrix, summary, classReceipt, manifest, closure, schema } = bundle;

  ok(capture.schema_version === 'ssc-rd01-wave03-methodology-correction-capture-receipt@1', 'capture schema changed');
  ok(capture.class_id === 'RD-01-C06' && capture.issue === 1014, 'capture identity changed');
  ok(capture.target_head === 'c491c99b2deb79b069a6dd7bc92f68e764228151', 'capture target head changed');
  ok(capture.fixed_protocol.fixed_routes === 30 && capture.fixed_protocol.exact_first_party_get_routes === 3 && capture.fixed_protocol.candidate_census_routes === 27, 'fixed route denominator changed');
  ok(capture.fixed_route_capture.workflow_run === 30914248336 && capture.fixed_route_capture.artifact_id === 8894359001, 'fixed capture identity changed');
  ok(capture.fixed_route_capture.artifact_zip_sha256 === 'c247a5f9a3d8cd2bc6feb5c30dd643af0bbd3878a8712f7e4fadfdf24ad91291', 'fixed capture archive changed');
  ok(capture.fixed_route_capture.manifest_combined_sha256 === 'a3c00b6bb04367646153b693ff229adc046f174c043e88b7dd3a949e670ac12c', 'fixed capture manifest changed');
  ok(capture.fixed_route_capture.route_attempts === 30 && capture.fixed_route_capture.http_success_routes === 30, 'fixed execution count changed');
  ok(capture.fixed_route_capture.candidate_rows === 269 && capture.fixed_route_capture.natsec100_candidate_rows === 0 && capture.fixed_route_capture.admitted_candidate_sources === 0, 'candidate census changed');
  ok(capture.report_pdf_capture.workflow_run === 30916279943 && capture.report_pdf_capture.artifact_id === 8895179282, 'PDF capture identity changed');
  ok(capture.report_pdf_capture.artifact_zip_sha256 === '26c67041bbe69e2983c8733c58c062f808de8d803c8146238f63351db8e9de01', 'PDF capture archive changed');
  ok(capture.report_pdf_capture.manifest_combined_sha256 === '609a9e8e80fe257e2a253aa61dbcd6501e18f63b74d6a42d7d25ff61b1f1ceb9', 'PDF capture manifest changed');
  ok(capture.report_pdf_capture.pdfs_observed === 3 && capture.report_pdf_capture.routes_attempted === 3, 'PDF denominator changed');
  ok(capture.edition_sources.length === 3, 'three edition sources required');
  ok(JSON.stringify(capture.edition_sources.map((row) => row.edition)) === JSON.stringify([2024,2025,2026]), 'edition source order changed');
  unique(capture.edition_sources.map((row) => row.direct_html.sha256), 'direct body digest');
  unique(capture.edition_sources.map((row) => row.report_pdf.sha256), 'PDF body digest');
  capture.edition_sources.forEach((row) => {
    ok(row.fixed_candidate_query_route_ids.length === 9, `${row.edition}: query denominator changed`);
    ok(row.report_pdf.pages > 0 && row.report_pdf.bytes > 0, `${row.edition}: PDF custody missing`);
  });
  ok(capture.inspection.ocr_used === false && capture.inspection.external_review === false, 'inspection authority changed');
  for (const [key, value] of Object.entries(capture.authority)) {
    if (key.endsWith('_effect')) ok(value === 'none', `capture ${key} changed`);
    else if (typeof value === 'boolean') ok(value === (key === 'source_acquisition_only'), `capture ${key} changed`);
    else ok(value === 0, `capture ${key} changed`);
  }

  ok(matrix.schema_version === 'ssc-rd01-wave03-methodology-correction-terminal-matrix@1', 'matrix schema changed');
  ok(matrix.class_id === 'RD-01-C06' && matrix.class_label === 'methodology correction, appeal, and re-evaluation records', 'matrix identity changed');
  ok(JSON.stringify(matrix.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required field order changed');
  ok(matrix.rows.length === 3, 'three edition rows required');
  ok(JSON.stringify(matrix.rows.map((row) => row.edition_year)) === JSON.stringify([2024,2025,2026]), 'edition row order changed');
  unique(matrix.rows.map((row) => row.unit_id), 'unit id');
  let observed = 0; let missing = 0; let terminal = 0;
  for (const row of matrix.rows) {
    exactKeys(row.fields, REQUIRED_FIELDS, `${row.edition_year} fields`);
    for (const fieldId of REQUIRED_FIELDS) {
      const cell = row.fields[fieldId];
      exactKeys(cell, ['state','value','source_ids','note','fixed_protocol_complete','terminal_for_class_closure'], `${row.edition_year}/${fieldId}`);
      ok(TERMINAL_FIELD_STATES.has(cell.state), `${row.edition_year}/${fieldId}: nonterminal state`);
      ok(cell.fixed_protocol_complete === true && cell.terminal_for_class_closure === true, `${row.edition_year}/${fieldId}: protocol incomplete`);
      ok(Array.isArray(cell.source_ids) && cell.source_ids.length >= 2, `${row.edition_year}/${fieldId}: source custody missing`);
      ok(typeof cell.note === 'string' && cell.note.length > 30, `${row.edition_year}/${fieldId}: note missing`);
      if (cell.state === 'observed') observed += 1;
      if (cell.state === 'not_publicly_recovered') { missing += 1; ok(cell.value === null, `${row.edition_year}/${fieldId}: unavailable value invented`); }
      terminal += 1;
    }
    ok(row.row_result.fixed_protocol_executed === true && row.row_result.required_fields === 8 && row.row_result.terminal_fields === 8, `${row.edition_year}: row denominator changed`);
    ok(row.row_result.row_closed === true && row.row_result.terminal_state === 'bounded_source_unavailable', `${row.edition_year}: row not closed correctly`);
  }
  ok(terminal === 24 && observed === 16 && missing === 8, 'cell accounting changed');
  ok(matrix.rows[0].fields.version_exception_and_override_custody_where_public.value.headcount_growth_scoring_sensitivity_increased === true, '2024 version disclosure changed');
  ok(matrix.rows[1].fields.version_exception_and_override_custody_where_public.value.spacex_isolated_in_some_analysis === true, '2025 analytical treatment changed');
  ok(matrix.rows[2].fields.methodology_identity_and_published_input_description.value.published_inputs[0] === 'U.S. government contracting activity', '2026 contracting input changed');
  const reeval = matrix.rows[2].fields.published_re_evaluation_reranking_or_reconsideration_record;
  ok(reeval.state === 'observed' && reeval.value.statement_scope === 'eligibility for future editions' && reeval.value.completed_2026_reranking_or_changed_disposition === false, 'prospective re-evaluation boundary changed');
  ok(matrix.counts.required_fields === 24 && matrix.counts.terminal_fields === 24 && matrix.counts.observed_fields === 16 && matrix.counts.not_publicly_recovered_fields === 8, 'matrix counts changed');
  ok(matrix.counts.completed_correction_or_errata_records === 0 && matrix.counts.published_formal_appeal_routes === 0 && matrix.counts.completed_reranking_or_changed_disposition_records === 0, 'unsupported completion promoted');
  ok(matrix.current_result.terminal_state === 'bounded_source_unavailable' && matrix.current_result.class_closed === true, 'matrix terminal result changed');
  ok(matrix.current_result.prospective_future_re_evaluation_preserved_without_completion_claim === true, 'prospective boundary missing');
  for (const [key, value] of Object.entries(matrix.boundaries)) {
    if (key.endsWith('_effect')) ok(value === 'none', `matrix boundary ${key} changed`); else ok(value === false, `matrix boundary ${key} weakened`);
  }
  for (const [key, value] of Object.entries(matrix.authority)) {
    if (key.endsWith('_effect')) ok(value === 'none', `matrix authority ${key} changed`);
    else if (typeof value === 'boolean') ok(value === false, `matrix authority ${key} changed`);
    else ok(value === 0, `matrix authority ${key} changed`);
  }

  ok(summary.terminal_state === matrix.current_result.terminal_state && summary.class_closed === true, 'summary terminal state changed');
  ok(JSON.stringify(summary.counts) === JSON.stringify(matrix.counts), 'summary counts drift');
  ok(JSON.stringify(summary.current_result) === JSON.stringify(matrix.current_result), 'summary result drift');
  ok(JSON.stringify(summary.authority) === JSON.stringify(matrix.authority), 'summary authority drift');

  ok(classReceipt.schema_version === 'ssc-rd01-wave03-class-receipt@1' && classReceipt.source_pr === 1022, 'class receipt identity changed');
  ok(classReceipt.terminal_state === 'bounded_source_unavailable' && classReceipt.class_closed === true, 'class receipt reopened');
  ok(classReceipt.closure_basis.length === 6, 'closure basis changed');
  ok(classReceipt.source_custody.capture_receipt_sha256 === matrix.source_product.capture_receipt_sha256, 'capture digest custody drift');
  ok(classReceipt.unresolved_limit.not_publicly_recovered_fields === 8 && classReceipt.unresolved_limit.automatic_additional_search_pass_authorized === false, 'unresolved limit changed');
  ok(JSON.stringify(classReceipt.authority) === JSON.stringify(matrix.authority), 'class receipt authority drift');

  ok(manifest.schema_version === 'ssc-rd01-wave03-terminal-product-manifest@1' && manifest.entry_count === 3 && manifest.entries.length === 3, 'manifest denominator changed');
  ok(JSON.stringify(manifest.entries.map((entry) => entry.path)) === JSON.stringify(['terminal-field-matrix.json','summary.json','class-receipt.json']), 'manifest order changed');
  ok(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'manifest digest malformed');

  ok(closure.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1', 'closure schema changed');
  ok(closure.wave_issue === 1013 && closure.child_issue === 1014 && closure.source_pr === 1022, 'closure issue custody changed');
  ok(closure.class_id === 'RD-01-C06' && closure.class_closed === true && closure.terminal_state === 'bounded_source_unavailable', 'closure identity or state changed');
  ok(closure.product.manifest_combined_sha256 === manifest.combined_sha256, 'closure manifest changed');
  const atlas = closure.residual_atlas_effect_if_promoted_after_wave02_six_closures;
  ok(atlas.canonical_classes === 42 && atlas.open_before === 36 && atlas.closed_before === 6 && atlas.open_after === 35 && atlas.closed_after === 7 && atlas.wave_complete === false, 'closure atlas arithmetic changed');

  ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema' && schema.additionalProperties === false, 'schema root changed');
  ok(schema.properties.schema_version.const === 'ssc-rd01-wave03-class-receipt@1', 'schema version changed');
  ok(schema.properties.class_id.const === 'RD-01-C06' && schema.properties.terminal_state.const === 'bounded_source_unavailable', 'schema class state changed');
  ok(schema.properties.counts.properties.required_fields.const === 24 && schema.properties.counts.properties.not_publicly_recovered_fields.const === 8, 'schema counts changed');

  const expected = buildExpectedBundle();
  assert.deepEqual(bundle, expected, 'terminal bundle differs from the frozen deterministic product');
  return bundle;
}

function validateManifestBytes(root, bundle) {
  const files = [
    ['terminal-field-matrix.json', PATHS.matrix],
    ['summary.json', PATHS.summary],
    ['class-receipt.json', PATHS.classReceipt]
  ];
  const entries = files.map(([entryPath, rel]) => {
    const bytes = fs.readFileSync(path.join(root, rel));
    return { path: entryPath, bytes: bytes.length, sha256: sha256(bytes) };
  });
  ok(JSON.stringify(entries) === JSON.stringify(bundle.manifest.entries), 'manifest file hashes changed');
  const combined = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('')));
  ok(combined === bundle.manifest.combined_sha256, 'manifest combined digest changed');
  ok(sha256(Buffer.from(stableJson(bundle.capture))) === bundle.classReceipt.source_custody.capture_receipt_sha256, 'capture receipt file digest changed');
}

function validateRepositoryBindings(root) {
  const constitution = read(root, 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json');
  ok(constitution.wave_id === 'SSC-RD-W03' && constitution.issue === 1013, 'Wave-03 constitution identity changed');
  const lane = constitution.lane_attempts.find((row) => row.class_id === 'RD-01-C06');
  ok(lane?.exact_label === 'methodology correction, appeal, and re-evaluation records' && lane?.initial_unit_count === 3, 'constitutional RD-01 class changed');
  ok(constitution.parent_custody.closed_residual_classes === 6 && constitution.parent_custody.open_residual_classes === 36, 'Wave-03 parent counts changed');

  const wave02 = read(root, 'data/research/status-sovereignty-residual-denominator-wave-02-current.json');
  ok(wave02.counts.closed_residual_classes === 6 && wave02.counts.open_residual_classes === 36, 'Wave-02 six-closure parent changed');
  ok(wave02.current_result.all_six_selected_classes_closed === true && wave02.current_result.wave_complete === false, 'Wave-02 parent completion boundary changed');

  const firstPass = read(root, 'data/intake/status-sovereignty-natsec100-denominator-first-pass.json');
  ok(firstPass.next_acquisitions[5] === 'methodology correction, appeal, and re-evaluation records', 'first-pass class label changed');
  const seed = read(root, 'data/project/ssc-residual-wave03/seeds/RD-01-C06.json');
  ok(seed.class_id === 'RD-01-C06' && seed.denominator_contract.unit_count === 3 && seed.class_closed === false, 'seed denominator changed');
  const contract = read(root, 'data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/field-matrix-contract.json');
  ok(contract.expansion_contract.required_cells === 24 && contract.current_counts.terminal_cells === 0, 'intake contract changed');
  const protocol = read(root, 'data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/fixed-protocol-package.json');
  ok(protocol.class_id === 'RD-01-C06' && protocol.routes.length === 30, 'fixed protocol denominator changed');
  unique(protocol.routes.map((row) => row.route_id), 'fixed protocol route');
  ok(protocol.routes.every((row) => row.automatic_result_followups === 0), 'fixed protocol recursion introduced');

  const priorReceipt = read(root, 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json');
  const priorClosure = read(root, 'data/project/ssc-residual-wave02/closures/RD-01-C03.json');
  ok(priorReceipt.class_id === 'RD-01-C03' && priorReceipt.class_closed === true, 'prior RD-01 receipt changed');
  ok(priorClosure.class_id === 'RD-01-C03' && priorClosure.class_closed === true, 'prior RD-01 closure changed');
}

export function validateRd01Wave03(root = ROOT) {
  const bundle = loadCommittedBundle(root);
  validateBundleShape(bundle);
  validateManifestBytes(root, bundle);
  validateRepositoryBindings(root);
  console.log('validate-status-sovereignty-rd-wave03-rd01-methodology-correction: 3 editions, 24 / 24 terminal, 16 observed, 8 not publicly recovered, class bounded_source_unavailable');
  return bundle;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validateRd01Wave03(ROOT); } catch (error) {
    console.error(`validate-status-sovereignty-rd-wave03-rd01-methodology-correction: ${error.message}`);
    process.exit(1);
  }
}
