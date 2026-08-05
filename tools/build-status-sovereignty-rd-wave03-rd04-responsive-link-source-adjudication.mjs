#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-responsive-link-source-adjudication';
export const DATA_DIR = path.join(ROOT, DATA_REL);
export const PREDECESSOR_DIR = path.join(ROOT, 'data/intake/status-sovereignty-rd-wave03-rd04-state-source-adjudication');

const EXPECTED_INPUT_SHA256 = Object.freeze({
  'capture-custody.json': '2158cc096d977f785313e18d778c60f87deb8a310efd240022a42ac31188bfa2',
  'capture-execution-receipt.json': 'f8ff7bc77c162206f1155388bf363d0fc0ba12a2dbd67ffc0eafb0d1b2732bc4',
  'capture-route-results.json': '7bc1db2b09372d2902a8a506a85a0d6022bb7a3cac86d3393c9d371b6da24161',
  'source-decisions.json': '879c2191ca0128dd09e02ef66c01c5ee7058545a28ad25683eafb23f72451857',
});
const EXPECTED_PROTOCOL_SHA256 = 'd8e6b24448956ca495d387ac753ad7d2172d0fe5842fb1c2c800f7a98dc93a2c';
const EXPECTED_PREDECESSOR_INDEX_SHA256 = 'ca3c778b9007542075ed8dc6c2c59f40d45d66fd0173eb4e7206803a8fadc978';
const EXPECTED_CLASSES = Object.freeze({
  exact_official_document: 5,
  official_substantive_rule_page: 17,
  official_program_implementation_page: 14,
  official_manual_or_authority_locator: 21,
  official_nonpolicy_toolkit_archive: 1,
  official_script_only_surface_no_source: 1,
  terminal_disallowed_final_host_no_source: 2,
  terminal_http_non_success_no_source: 1,
});
const FIELD_NAMES = Object.freeze([
  'operative_state_implementation_authority_and_version',
  'implementation_effective_date_or_typed_gap',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'discretionary_exemption_authority_and_reported_state_practice',
  'fitness_for_work_or_eligibility_screening_rule',
  'verification_evidence_and_staff_discretion_surface',
  'field_and_row_terminal_state',
]);
const FIELD_REVIEW_CLASSES = new Set([
  'exact_official_document',
  'official_substantive_rule_page',
  'official_program_implementation_page',
]);
const NO_SOURCE_CLASSES = new Set([
  'official_script_only_surface_no_source',
  'terminal_disallowed_final_host_no_source',
  'terminal_http_non_success_no_source',
]);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
export function readBytes(rel) {
  return fs.readFileSync(path.join(DATA_DIR, rel));
}
export function readJson(rel) {
  return JSON.parse(readBytes(rel).toString('utf8'));
}
export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
export function stableJsonl(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: keys ${actual.join(',')} != ${expected.join(',')}`);
}
function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
function uniqueCount(values) {
  return new Set(values).size;
}

export function loadInputs() {
  for (const [rel, expected] of Object.entries(EXPECTED_INPUT_SHA256)) {
    assert(sha256(readBytes(rel)) === expected, `${rel}: exact SHA-256 mismatch`);
  }
  const protocolPath = path.join(PREDECESSOR_DIR, 'selected-followup-protocol.json');
  const predecessorIndexPath = path.join(PREDECESSOR_DIR, 'index.json');
  assert(fs.existsSync(protocolPath), 'missing predecessor selected-followup-protocol.json');
  assert(fs.existsSync(predecessorIndexPath), 'missing predecessor index.json');
  const protocolBytes = fs.readFileSync(protocolPath);
  const predecessorIndexBytes = fs.readFileSync(predecessorIndexPath);
  assert(sha256(protocolBytes) === EXPECTED_PROTOCOL_SHA256, 'predecessor protocol SHA-256 mismatch');
  assert(sha256(predecessorIndexBytes) === EXPECTED_PREDECESSOR_INDEX_SHA256, 'predecessor index SHA-256 mismatch');
  return {
    custody: readJson('capture-custody.json'),
    executionReceipt: readJson('capture-execution-receipt.json'),
    routeResults: readJson('capture-route-results.json'),
    decisions: readJson('source-decisions.json'),
    protocol: JSON.parse(protocolBytes.toString('utf8')),
    predecessorIndex: JSON.parse(predecessorIndexBytes.toString('utf8')),
  };
}

export function validateInputs(inputs) {
  const { custody, executionReceipt, routeResults, decisions, protocol, predecessorIndex } = inputs;
  assert(custody.schema_version === 'ssc-rd04-wave03-responsive-link-capture-custody@1', 'custody schema');
  assert(executionReceipt.schema_version === 'ssc-rd04-wave03-responsive-link-execution-receipt@2', 'execution receipt schema');
  assert(routeResults.schema_version === 'ssc-rd04-wave03-responsive-link-route-results@2', 'route results schema');
  assert(decisions.schema_version === 'ssc-rd04-wave03-responsive-link-source-decisions@1', 'decisions schema');
  assert(protocol.schema_version === 'ssc-rd04-wave03-responsive-link-followup-protocol@2', 'protocol schema');
  assert(predecessorIndex.schema_version === 'ssc-rd04-wave03-state-source-adjudication-index@2', 'predecessor index schema');

  const routes = routeResults.routes;
  const protocolRoutes = protocol.routes;
  const sourceDecisions = decisions.decisions;
  assert(Array.isArray(routes) && routes.length === 62, 'route results must contain 62 routes');
  assert(Array.isArray(protocolRoutes) && protocolRoutes.length === 62, 'protocol must contain 62 routes');
  assert(Array.isArray(sourceDecisions) && sourceDecisions.length === 62, 'decisions must contain 62 routes');
  assert(uniqueCount(routes.map((r) => r.route_id)) === 62, 'route result IDs must be unique');
  assert(uniqueCount(sourceDecisions.map((r) => r.route_id)) === 62, 'decision IDs must be unique');
  assert(JSON.stringify(routes.map((r) => r.route_id)) === JSON.stringify(protocolRoutes.map((r) => r.route_id)), 'route results must match protocol order');
  assert(JSON.stringify(routes.map((r) => r.route_id)) === JSON.stringify(sourceDecisions.map((r) => r.route_id)), 'decisions must match capture order');
  assert(uniqueCount(routes.map((r) => r.postal_code)) === 30, 'exactly 30 states represented');

  const routeStates = countBy(routes, 'state');
  assert(routeStates.http_success_pending_source_adjudication === 59, '59 success states required');
  assert(routeStates.terminal_disallowed_final_host === 2, '2 disallowed-host states required');
  assert(routeStates.terminal_http_non_success === 1, '1 HTTP non-success state required');
  assert(Object.keys(routeStates).length === 3, 'unexpected capture state');
  assert(routes.every((r) => r.request_attempts === 1 && r.result_spawned_requests === 0), 'one attempt and zero spawned requests required');
  assert(routes.every((r) => r.source_admitted === false && r.field_classification_effect === 'none' && r.class_closed === false), 'capture may not admit or classify');

  const classCounts = countBy(sourceDecisions, 'source_class');
  assert(Object.keys(classCounts).length === Object.keys(EXPECTED_CLASSES).length, `source class keys mismatch: ${JSON.stringify(classCounts)}`);
  for (const [name, expected] of Object.entries(EXPECTED_CLASSES)) assert(classCounts[name] === expected, `${name}: ${classCounts[name]} != ${expected}`);
  let admitted = 0;
  let fieldReview = 0;
  for (let i = 0; i < routes.length; i += 1) {
    const route = routes[i];
    const decision = sourceDecisions[i];
    assert(decision.route_ordinal === i + 1, `${decision.route_id}: ordinal`);
    for (const key of ['route_id', 'postal_code', 'state_name', 'selection_category']) {
      assert(decision[key] === route[key], `${decision.route_id}: ${key} does not bind capture`);
    }
    assert(decision.capture_state === route.state, `${decision.route_id}: capture state mismatch`);
    assert(decision.body_sha256 === route.body_sha256, `${decision.route_id}: body SHA mismatch`);
    assert(decision.body_bytes === route.body_bytes, `${decision.route_id}: body bytes mismatch`);
    assert(decision.content_type === route.content_type, `${decision.route_id}: content type mismatch`);
    assert(typeof decision.document_title === 'string' && decision.document_title.length > 0, `${decision.route_id}: title required`);
    assert(Number.isInteger(decision.visible_text_characters) && decision.visible_text_characters >= 0, `${decision.route_id}: text chars`);
    assert(Number.isInteger(decision.visible_word_count) && decision.visible_word_count >= 0, `${decision.route_id}: word count`);
    assert(typeof decision.source_scope === 'string' && decision.source_scope.length > 0, `${decision.route_id}: source scope`);
    assert(typeof decision.rationale_code === 'string' && decision.rationale_code.length > 0, `${decision.route_id}: rationale`);
    assert(Array.isArray(decision.admitted_for) && Array.isArray(decision.not_admitted_for), `${decision.route_id}: admission arrays`);
    assert(JSON.stringify(decision.not_admitted_for) === JSON.stringify(FIELD_NAMES), `${decision.route_id}: all field authority must remain withheld`);
    assert(Array.isArray(decision.candidate_fields_for_offline_review), `${decision.route_id}: candidate field array`);
    assert(decision.candidate_fields_for_offline_review.every((f) => FIELD_NAMES.slice(0, 6).includes(f)), `${decision.route_id}: invalid candidate field`);
    assert(decision.field_classification_effect === 'none', `${decision.route_id}: field effect must be none`);
    assert(decision.substantive_field_terminalizations === 0, `${decision.route_id}: no terminalizations`);
    assert(decision.class_closed === false, `${decision.route_id}: class must remain open`);
    assert(decision.result_spawned_requests === 0, `${decision.route_id}: no spawned requests`);
    assert(decision.outside_human_dependency === false, `${decision.route_id}: no outside-human dependency`);
    assert(decision.publication_effect === 'none' && decision.adoption_effect === 'none' && decision.graph_effect === 'none', `${decision.route_id}: authority effects`);

    const noSource = NO_SOURCE_CLASSES.has(decision.source_class);
    assert(decision.source_admitted === !noSource, `${decision.route_id}: source admission/class mismatch`);
    assert(!decision.source_admitted || route.state === 'http_success_pending_source_adjudication', `${decision.route_id}: only allowed-host success can be admitted`);
    assert(decision.source_admitted || decision.admitted_for.length === 0, `${decision.route_id}: nonadmitted source cannot carry scope`);
    const shouldReview = FIELD_REVIEW_CLASSES.has(decision.source_class);
    assert(decision.field_review_selected === shouldReview, `${decision.route_id}: field-review class mismatch`);
    assert(!decision.field_review_selected || decision.source_admitted, `${decision.route_id}: field review requires admitted source`);
    assert(decision.field_review_selected || decision.candidate_fields_for_offline_review.length === 0, `${decision.route_id}: unselected source cannot carry candidate fields`);
    admitted += Number(decision.source_admitted);
    fieldReview += Number(decision.field_review_selected);
  }
  assert(admitted === 58, `source admissions ${admitted} != 58`);
  assert(fieldReview === 36, `field-review sources ${fieldReview} != 36`);
  assert(sourceDecisions.filter((d) => d.source_admitted && !d.field_review_selected).length === 22, '22 narrow context-only sources required');
  assert(sourceDecisions.filter((d) => !d.source_admitted).length === 4, '4 no-source outcomes required');

  assert(custody.artifact_id === 8936867721, 'artifact ID');
  assert(custody.artifact_zip_bytes === 59462154, 'artifact zip bytes');
  assert(custody.artifact_zip_sha256 === 'bf34e7286bd151245d59e8ad131065fc5352f51d1f840e1adabe62f92484ad15', 'artifact zip SHA');
  assert(custody.artifact_manifest_combined_sha256 === '4b78e245a5cd496501fe8c737c959b6a9b383e0d4fa77a0d2a8850f8fd0e5af7', 'manifest combined SHA');
  assert(custody.verification.manifest_entry_mismatches === 0 && custody.verification.body_or_header_hash_mismatches === 0, 'capture custody must be exact');
  assert(executionReceipt.fixed_routes === 62 && executionReceipt.terminal_routes === 62, 'execution receipt counts');
  assert(executionReceipt.automatic_source_admission === false && executionReceipt.automatic_field_classification === false && executionReceipt.automatic_class_closure === false, 'capture receipt authority boundary');
  assert(predecessorIndex.counts.terminal_field_cells_after === 100, 'predecessor terminal cells');
  assert(predecessorIndex.counts.still_open_field_cells === 350, 'predecessor open cells');
  assert(predecessorIndex.current_result.class_closed === false, 'predecessor class must be open');
  return { routes, sourceDecisions, classCounts, routeStates };
}

export function deriveProduct(inputs) {
  const { routes, sourceDecisions, classCounts, routeStates } = validateInputs(inputs);
  const adjudications = routes.map((route, index) => {
    const decision = sourceDecisions[index];
    return {
      route_ordinal: route.route_ordinal,
      route_id: route.route_id,
      candidate_id: route.candidate_id,
      parent_route_id: route.parent_route_id,
      parent_body_sha256: route.parent_body_sha256,
      unit_ordinal: route.unit_ordinal,
      unit_id: route.unit_id,
      postal_code: route.postal_code,
      state_name: route.state_name,
      selection_category: route.selection_category,
      requested_url: inputs.protocol.routes[index].requested_url,
      allowed_final_host_suffix: inputs.protocol.routes[index].allowed_final_host_suffix,
      final_url: route.final_url,
      final_host: route.final_host,
      capture_state: route.state,
      curl_exit_code: route.curl_exit_code,
      http_status: route.http_status,
      content_type: route.content_type,
      body_bytes: route.body_bytes,
      body_sha256: route.body_sha256,
      headers_bytes: route.headers_bytes,
      headers_sha256: route.headers_sha256,
      document_title: decision.document_title,
      visible_text_characters: decision.visible_text_characters,
      visible_word_count: decision.visible_word_count,
      document_identity: decision.document_identity,
      source_class: decision.source_class,
      source_scope: decision.source_scope,
      source_adjudication_state: decision.source_class,
      source_admitted: decision.source_admitted,
      admitted_for: decision.admitted_for,
      not_admitted_for: decision.not_admitted_for,
      field_review_selected: decision.field_review_selected,
      candidate_fields_for_offline_review: decision.candidate_fields_for_offline_review,
      field_classification_effect: 'none',
      substantive_field_terminalizations: 0,
      class_closed: false,
      result_spawned_requests: 0,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      rationale_code: decision.rationale_code,
    };
  });
  const priority = { exact_official_document: 1, official_substantive_rule_page: 2, official_program_implementation_page: 3 };
  const reviewRows = adjudications
    .filter((row) => row.field_review_selected)
    .sort((a, b) => priority[a.source_class] - priority[b.source_class] || a.route_ordinal - b.route_ordinal)
    .map((row, index) => ({
      review_ordinal: index + 1,
      route_id: row.route_id,
      unit_id: row.unit_id,
      postal_code: row.postal_code,
      state_name: row.state_name,
      selection_category: row.selection_category,
      source_class: row.source_class,
      document_identity: row.document_identity,
      document_title: row.document_title,
      body_path_in_capture_artifact: `routes/${row.route_id}/body.bin`,
      body_bytes: row.body_bytes,
      body_sha256: row.body_sha256,
      candidate_fields: row.candidate_fields_for_offline_review,
      empirical_request_authority: false,
      source_admission_authority: false,
      field_classification_authority: false,
      class_closure_authority: false,
      result_spawned_requests: 0,
      outside_human_dependency: false,
    }));
  const fieldReviewProtocol = {
    schema_version: 'ssc-rd04-wave03-responsive-link-offline-field-review-protocol@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    capture_artifact_id: 8936867721,
    capture_artifact_zip_sha256: 'bf34e7286bd151245d59e8ad131065fc5352f51d1f840e1adabe62f92484ad15',
    fixed_source_rows: 36,
    states_represented: uniqueCount(reviewRows.map((r) => r.postal_code)),
    empirical_requests: 0,
    result_spawned_requests: 0,
    authority: {
      automatic_source_admission: false,
      automatic_field_classification: false,
      automatic_class_closure: false,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
    },
    review_rows: reviewRows,
  };
  const index = {
    schema_version: 'ssc-rd04-wave03-responsive-link-source-adjudication-index@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    capture_custody_path: 'capture-custody.json',
    capture_execution_receipt_path: 'capture-execution-receipt.json',
    capture_route_results_path: 'capture-route-results.json',
    source_decisions_path: 'source-decisions.json',
    source_adjudications_path: 'source-adjudications.jsonl',
    offline_field_review_protocol_path: 'offline-field-review-protocol.json',
    counts: {
      captured_routes: 62,
      captured_states: 30,
      allowed_host_http_success: 59,
      disallowed_final_host: 2,
      http_non_success: 1,
      source_decisions: 62,
      sources_admitted_for_any_bounded_scope: 58,
      offline_field_review_sources: 36,
      locator_context_or_toolkit_only_sources: 22,
      no_source_admitted: 4,
      substantive_field_classifications: 0,
      substantive_field_terminalizations: 0,
      terminal_field_cells_before: 100,
      terminal_field_cells_after: 100,
      still_open_field_cells_after: 350,
      terminal_units_after: 0,
      result_spawned_requests: 0,
    },
    capture_state_counts: routeStates,
    source_class_counts: classCounts,
    current_result: {
      responsive_link_source_adjudication_complete: true,
      offline_field_review_protocol_frozen: true,
      field_matrix_changed: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
    },
    next_bounded_operation: 'review exactly the 36 frozen admitted bodies offline, record field-specific evidence and counterevidence, and change no field cell without an independently validated field adjudication',
  };
  return {
    'source-adjudications.jsonl': stableJsonl(adjudications),
    'offline-field-review-protocol.json': stableJson(fieldReviewProtocol),
    'index.json': stableJson(index),
  };
}

function makeManifest(derived) {
  const rels = [
    'capture-custody.json',
    'capture-execution-receipt.json',
    'capture-route-results.json',
    'source-decisions.json',
    'source-adjudications.jsonl',
    'offline-field-review-protocol.json',
    'index.json',
  ];
  const entries = rels.map((rel) => {
    const data = Object.hasOwn(derived, rel) ? Buffer.from(derived[rel]) : readBytes(rel);
    return { path: rel, bytes: data.length, sha256: sha256(data) };
  });
  return stableJson({
    schema_version: 'ssc-rd04-wave03-responsive-link-source-adjudication-manifest@1',
    permanent_data_files: entries.length + 1,
    entries,
    combined_sha256: sha256(entries.map((e) => `${e.path}\t${e.bytes}\t${e.sha256}\n`).join('')),
  });
}

export function expectedOutputs() {
  const inputs = loadInputs();
  const outputs = deriveProduct(inputs);
  outputs['product-manifest.json'] = makeManifest(outputs);
  return outputs;
}

function run(mode) {
  const outputs = expectedOutputs();
  const mismatches = [];
  for (const [rel, content] of Object.entries(outputs)) {
    const target = path.join(DATA_DIR, rel);
    if (mode === 'write') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    } else {
      if (!fs.existsSync(target)) mismatches.push(`${rel}: missing`);
      else if (fs.readFileSync(target, 'utf8') !== content) mismatches.push(`${rel}: differs`);
    }
  }
  if (mode === 'check' && mismatches.length) throw new Error(mismatches.join('\n'));
  const index = JSON.parse(outputs['index.json']);
  console.log(`responsive_link_source_adjudication=${mode}`);
  console.log(`routes=${index.counts.captured_routes}`);
  console.log(`sources_admitted=${index.counts.sources_admitted_for_any_bounded_scope}`);
  console.log(`offline_field_review_sources=${index.counts.offline_field_review_sources}`);
  console.log(`field_terminalizations=${index.counts.substantive_field_terminalizations}`);
  console.log(`class_closed=${index.current_result.class_closed}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--write') run('write');
  else if (arg === '--check') run('check');
  else throw new Error('usage: node tools/build-status-sovereignty-rd-wave03-rd04-responsive-link-source-adjudication.mjs --write|--check');
}
