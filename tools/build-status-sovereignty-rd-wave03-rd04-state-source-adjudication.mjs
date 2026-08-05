#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-state-source-adjudication';
export const EXECUTION_RECEIPT_PATH = `${DATA_DIR}/execution-receipt.json`;
export const ROUTE_ADJUDICATIONS_PATH = `${DATA_DIR}/route-adjudications.jsonl`;
export const STATE_OBSERVATIONS_PATH = `${DATA_DIR}/state-source-observations.jsonl`;
export const LINK_CANDIDATES_PATH = `${DATA_DIR}/link-candidates.jsonl`;
export const FOLLOWUP_PROTOCOL_PATH = `${DATA_DIR}/selected-followup-protocol.json`;
export const INDEX_PATH = `${DATA_DIR}/index.json`;
export const PRODUCT_MANIFEST_PATH = `${DATA_DIR}/product-manifest.json`;
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd04-state-source-adjudication.schema.json';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd-wave03-rd04-state-source-adjudication.yml';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs';
export const TEST_PATH = 'test/status-sovereignty-rd-wave03-rd04-state-source-adjudication.test.js';
export const RUNNER_PATH = 'tools/acquisition/status-sovereignty-rd-wave03-rd04/run-responsive-link-protocol.py';
export const MILESTONE_PATH = 'docs/milestones/ssc-rd-wave03-rd04-state-source-adjudication.md';
export const SUCCESSOR_TRIGGER_PATH = '.ssc-rd04-wave03-responsive-link-trigger/EXECUTE';
export const DATA_MANIFEST_PATHS = Object.freeze([
  EXECUTION_RECEIPT_PATH,
  ROUTE_ADJUDICATIONS_PATH,
  STATE_OBSERVATIONS_PATH,
  LINK_CANDIDATES_PATH,
  FOLLOWUP_PROTOCOL_PATH,
  INDEX_PATH,
]);
export const PERMANENT_PATHS = Object.freeze([
  WORKFLOW_PATH,
  EXECUTION_RECEIPT_PATH,
  ROUTE_ADJUDICATIONS_PATH,
  STATE_OBSERVATIONS_PATH,
  LINK_CANDIDATES_PATH,
  FOLLOWUP_PROTOCOL_PATH,
  INDEX_PATH,
  PRODUCT_MANIFEST_PATH,
  SCHEMA_PATH,
  TEST_PATH,
  RUNNER_PATH,
  'tools/build-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs',
  VALIDATOR_PATH,
  MILESTONE_PATH,
].sort());

const abs = (root, rel) => path.join(root, rel);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const readJsonl = (root, rel) => fs.readFileSync(abs(root, rel), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const ok = (value, message) => { if (!value) throw new Error(message); };
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const same = (left, right, message) => ok(stable(left) === stable(right), message);
const countValues = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const writeJson = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), jsonBytes(value));
};
const fileEntry = (root, rel) => {
  const bytes = fs.readFileSync(abs(root, rel));
  return { path: path.basename(rel), bytes: bytes.length, sha256: sha(bytes) };
};
const sortedPaths = (values) => [...values].sort();
const samePathSet = (left, right) => stable(sortedPaths(left)) === stable(sortedPaths(right));

export const REQUIRED_FIELD_CATEGORIES = Object.freeze([
  'authority_rules',
  'policy_manual',
  'screening_verification',
  'work_requirement',
]);
export const DEFERRED_APPEAL_REASON = 'outside_current_rd04_c02_required_field_set_preserved_for_later_rd04_reuse';
export const NONRESPONSIVE_SUCCESS_POSTALS = Object.freeze(['KY', 'NJ']);
export const EXPECTED_ROUTE_STATES = Object.freeze({
  http_success_pending_source_adjudication: 38,
  terminal_disallowed_final_host: 5,
  terminal_http_non_success: 8,
  terminal_transport_failure: 3,
});
export const EXPECTED_CANDIDATE_DISPOSITIONS = Object.freeze({
  official_agency_wide_source_candidate: 203,
  official_exact_snap_source_candidate: 61,
  official_scope_candidate_selected_by_explicit_review: 2,
  official_unrelated_navigation_false_positive: 62,
  malformed_retained_link_candidate: 1,
});
export const EXPECTED_SELECTED_CATEGORIES = Object.freeze({
  authority_rules: 10,
  policy_manual: 16,
  screening_verification: 3,
  work_requirement: 33,
});

function hostAllowed(host, suffix) {
  const normalizedHost = String(host || '').toLowerCase();
  const normalizedSuffix = String(suffix || '').toLowerCase();
  return normalizedHost === normalizedSuffix || normalizedHost.endsWith(`.${normalizedSuffix}`);
}

function maximumBodyBytes(urlValue) {
  const value = urlValue.toLowerCase();
  if (value.endsWith('.zip')) return 104857600;
  if (value.endsWith('.pdf') || value.includes('download')) return 52428800;
  return 16777216;
}

export function validateExecutionReceipt(receipt) {
  ok(receipt.schema_version === 'ssc-rd04-wave03-state-source-execution-receipt@1', 'execution receipt schema changed');
  ok(receipt.wave_id === 'SSC-RD-W03' && receipt.lane_id === 'RD-04' && receipt.class_id === 'RD-04-C02' && receipt.issue === 1017, 'execution receipt identity changed');
  ok(receipt.canonical_predecessor_merge === '854d3fec35e57c0a0f0d06448146c99e5053dacf', 'canonical predecessor changed');
  ok(receipt.predecessor_product_commit === '5044122bef295f9b1397ca568f688acbb249d888', 'predecessor product commit changed');
  ok(receipt.predecessor_product_tree === 'a7f31360841e21d1cf3b3b81d9c30a21f6dcf036', 'predecessor product tree changed');
  ok(receipt.workflow_run === 30992649224 && receipt.artifact_id === 8924871940, 'state-source execution identity changed');
  ok(receipt.artifact_zip_bytes === 11178000, 'state-source artifact bytes changed');
  ok(receipt.artifact_zip_sha256 === '184258cf9453aa71e7322567a7e524694f4f3e0d1fc624cc6d5f0cc993f7851d', 'state-source artifact ZIP hash changed');
  ok(receipt.protocol_sha256 === 'c24ed256b4661623fff48dac128c6226e3f2763e6690612334eb31447c71acc9', 'state-source protocol hash changed');
  ok(receipt.route_results_sha256 === '1a27608ac8b9540b25384dac7073db644b2302d5cf12b5747f8285a05a71e4da', 'state-source route-results hash changed');
  ok(receipt.summary_sha256 === 'e578b0a213190a6f89645336006160e05c2a98731b9bd072a791d5f928e64953', 'state-source summary hash changed');
  ok(receipt.execution_receipt_sha256 === '9198e48955142d8ba58722dd071d603ce35b367eb0412dd20cc149a79c0ec8e0', 'state-source execution-receipt hash changed');
  ok(receipt.artifact_manifest_sha256 === '6fa5b0e3a565b0a4ddfed8c8d12c0ddbff36db47425815ad3c11317e73d1fa68', 'state-source artifact-manifest hash changed');
  ok(receipt.artifact_manifest_combined_sha256 === '9bc9019c3e1deb82fe254b818f02f00120db291fe49ac8a07f641df5874889f2', 'state-source manifest combined hash changed');
  ok(receipt.artifact_files === 326 && receipt.manifest_entries === 325, 'artifact file accounting changed');
  same(receipt.counts, {
    fixed_routes: 54,
    terminal_routes: 54,
    shared_federal_routes: 4,
    state_routes: 50,
    allowed_host_http_success: 38,
    disallowed_final_host: 5,
    http_non_success: 8,
    transport_failure: 3,
    admitted_state_landing_page_context_sources: 36,
    admitted_federal_documents: 0,
    field_classifications: 0,
    result_spawned_requests: 0,
    http_success_nonresponsive_or_script_only_surfaces: 2,
  }, 'execution receipt counts changed');
  same(receipt.matrix_effect, {
    prior_matrix_path: 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication/partial-field-matrix.json',
    prior_matrix_sha256: '93cd6840edfe329d4d49b715e5a981c8d390a2bb711cffbbd141e7f426ccbb41',
    materialized_cells_before: 450,
    terminal_cells_before: 100,
    terminal_cells_after: 100,
    still_open_cells_after: 350,
    terminal_units_after: 0,
    class_closed: false,
  }, 'matrix effect changed');
  ok(receipt.authority.outside_human_dependency === false, 'outside-human dependency changed');
  ok(receipt.authority.reviewed_disposition_changed === false && receipt.authority.cumulative_ledger_changed === false, 'authority changed');
  ok(receipt.authority.publication_effect === 'none' && receipt.authority.adoption_effect === 'none' && receipt.authority.graph_effect === 'none', 'release authority changed');
  return true;
}

export function validateRouteAdjudication(row, expectedOrdinal) {
  ok(row.route_ordinal === expectedOrdinal, `route ${expectedOrdinal}: ordinal changed`);
  if (expectedOrdinal <= 4) {
    ok(row.route_id === `RD04-W03-NEXT-FED-${String(expectedOrdinal).padStart(3, '0')}`, `route ${expectedOrdinal}: federal identity changed`);
    ok(row.scope === 'shared_federal', `${row.route_id}: federal scope changed`);
    ok(row.unit_ordinal === null && row.unit_id === null && row.postal_code === null && row.state_name === null, `${row.route_id}: federal unit fields changed`);
  } else {
    const stateOrdinal = expectedOrdinal - 4;
    ok(row.route_id === `RD04-W03-NEXT-STATE-${String(stateOrdinal).padStart(2, '0')}`, `route ${expectedOrdinal}: state identity changed`);
    ok(row.scope === 'state', `${row.route_id}: state scope changed`);
    ok(row.unit_ordinal === stateOrdinal && row.unit_id === `US-STATE-${row.postal_code}`, `${row.route_id}: state binding changed`);
    ok(typeof row.state_name === 'string' && row.state_name.length > 0, `${row.route_id}: state name changed`);
  }
  ok(typeof row.requested_url === 'string' && row.requested_url.length > 0, `${row.route_id}: requested URL changed`);
  ok(typeof row.allowed_final_host_suffix === 'string' && row.allowed_final_host_suffix.length > 0, `${row.route_id}: allowlist changed`);
  ok(typeof row.final_url === 'string' && typeof row.final_host === 'string', `${row.route_id}: final URL custody changed`);
  ok(Number.isInteger(row.curl_exit_code) && Number.isInteger(row.http_status), `${row.route_id}: transport typing changed`);
  ok(Number.isInteger(row.body_bytes) && row.body_bytes >= 0 && Number.isInteger(row.headers_bytes) && row.headers_bytes >= 0, `${row.route_id}: byte custody changed`);
  ok(/^[0-9a-f]{64}$/.test(row.body_sha256) && /^[0-9a-f]{64}$/.test(row.headers_sha256), `${row.route_id}: hash custody changed`);
  ok(Object.hasOwn(EXPECTED_ROUTE_STATES, row.execution_state), `${row.route_id}: execution state changed`);
  if (row.execution_state === 'http_success_pending_source_adjudication') {
    ok(row.curl_exit_code === 0 && row.http_status >= 200 && row.http_status < 300, `${row.route_id}: success transport changed`);
    ok(hostAllowed(row.final_host, row.allowed_final_host_suffix), `${row.route_id}: success final host changed`);
  } else if (row.execution_state === 'terminal_disallowed_final_host') {
    ok(row.curl_exit_code === 0 && !hostAllowed(row.final_host, row.allowed_final_host_suffix), `${row.route_id}: disallowed-host typing changed`);
  } else if (row.execution_state === 'terminal_http_non_success') {
    ok(row.curl_exit_code === 0 && hostAllowed(row.final_host, row.allowed_final_host_suffix) && !(row.http_status >= 200 && row.http_status < 300), `${row.route_id}: HTTP non-success typing changed`);
  } else if (row.execution_state === 'terminal_transport_failure') {
    ok(row.curl_exit_code !== 0, `${row.route_id}: transport failure typing changed`);
  }
  ok(row.field_classification_effect === 'none' && row.class_closed === false && row.result_spawned_requests === 0, `${row.route_id}: authority changed`);
  ok(Array.isArray(row.admitted_for) && Array.isArray(row.not_admitted_for) && row.not_admitted_for.length === 7, `${row.route_id}: admission surface changed`);
  const nonresponsiveSuccess = row.scope === 'state' && NONRESPONSIVE_SUCCESS_POSTALS.includes(row.postal_code);
  if (row.source_admitted) {
    ok(row.scope === 'state' && row.execution_state === 'http_success_pending_source_adjudication' && !nonresponsiveSuccess, `${row.route_id}: unauthorized source admission`);
    ok(row.source_adjudication_state === 'official_state_snap_program_landing_page_context_admitted', `${row.route_id}: admitted scope changed`);
    same(row.admitted_for, ['official_state_snap_program_landing_page_context', 'bounded_responsive_link_derivation'], `${row.route_id}: admitted purpose changed`);
    ok(row.typed_gap === 'landing_page_does_not_establish_operative_policy_version_or_remaining_substantive_fields', `${row.route_id}: admitted typed gap changed`);
  } else {
    ok(row.admitted_for.length === 0, `${row.route_id}: nonadmitted route has admitted purpose`);
    if (nonresponsiveSuccess) {
      ok(row.execution_state === 'http_success_pending_source_adjudication', `${row.route_id}: nonresponsive success state changed`);
      ok(row.source_adjudication_state === 'bounded_http_success_nonresponsive_or_script_only_surface', `${row.route_id}: nonresponsive success disposition changed`);
      ok(row.typed_gap === 'allowed_host_http_success_did_not_yield_a_responsive_state_snap_program_surface', `${row.route_id}: nonresponsive success gap changed`);
    }
  }
  return true;
}

export function validateStateObservation(row, expectedOrdinal, route, candidates) {
  ok(row.unit_ordinal === expectedOrdinal && row.unit_id === `US-STATE-${row.postal_code}`, `${row.postal_code}: state identity changed`);
  ok(row.route_id === route.route_id && row.execution_state === route.execution_state && row.source_admitted === route.source_admitted, `${row.postal_code}: route/source binding changed`);
  ok(row.source_adjudication_state === route.source_adjudication_state, `${row.postal_code}: source disposition changed`);
  ok(row.row_state === 'still_open' && row.substantive_field_terminalizations === 0, `${row.postal_code}: row was silently terminalized`);
  ok(row.matrix_terminal_cells_before === 2 && row.matrix_terminal_cells_after === 2 && row.matrix_open_cells_after === 7, `${row.postal_code}: matrix accounting changed`);
  ok(row.lexical_observations_are_field_classifications === false && row.result_spawned_requests === 0, `${row.postal_code}: authority changed`);
  const childCandidates = candidates.filter((candidate) => candidate.parent_route_id === row.route_id);
  ok(row.responsive_link_candidates === childCandidates.length, `${row.postal_code}: candidate accounting changed`);
  ok(row.selected_followups === childCandidates.filter((candidate) => candidate.selected_for_followup).length, `${row.postal_code}: selected accounting changed`);
  if (route.source_admitted) {
    ok(typeof row.page_title === 'string' && row.page_title.length > 0 && row.visible_text_characters > 0 && row.visible_word_count > 0, `${row.postal_code}: admitted page observation missing`);
    ok(row.typed_gap === 'landing_page_does_not_establish_operative_policy_version_or_remaining_substantive_fields', `${row.postal_code}: admitted gap changed`);
  } else if (route.execution_state === 'http_success_pending_source_adjudication') {
    ok(NONRESPONSIVE_SUCCESS_POSTALS.includes(row.postal_code), `${row.postal_code}: unexpected nonadmitted HTTP success`);
    ok(row.responsive_link_candidates === 0 && row.selected_followups === 0, `${row.postal_code}: nonresponsive success spawned candidates`);
    ok(Object.keys(row.lexical_surface_observations).length === 0, `${row.postal_code}: nonresponsive success invented lexical evidence`);
    ok(row.typed_gap === 'allowed_host_http_success_did_not_yield_a_responsive_state_snap_program_surface', `${row.postal_code}: nonresponsive success gap changed`);
  } else {
    ok(row.page_title === null && row.visible_text_characters === 0 && row.visible_word_count === 0, `${row.postal_code}: failed route invented page content`);
    ok(row.responsive_link_candidates === 0 && row.selected_followups === 0, `${row.postal_code}: failed route spawned candidates`);
  }
  return true;
}

export function candidateDigest(row) {
  return sha(Buffer.from(`${row.parent_route_id}\n${row.parent_body_sha256}\n${row.candidate_ordinal}\n${row.url}\n${row.label}\n`));
}

export function validateLinkCandidate(row, parentRoute) {
  ok(/^[0-9a-f]{64}$/.test(row.candidate_id) && row.candidate_id === candidateDigest(row), `${row.candidate_id}: candidate digest changed`);
  ok(parentRoute && row.parent_route_id === parentRoute.route_id, `${row.candidate_id}: parent route missing`);
  ok(parentRoute.source_admitted === true, `${row.candidate_id}: candidate derived from nonadmitted source`);
  ok(row.parent_body_sha256 === parentRoute.body_sha256 && row.parent_final_url === parentRoute.final_url, `${row.candidate_id}: parent source custody changed`);
  ok(row.unit_ordinal === parentRoute.unit_ordinal && row.unit_id === parentRoute.unit_id && row.postal_code === parentRoute.postal_code && row.state_name === parentRoute.state_name, `${row.candidate_id}: state binding changed`);
  ok(Number.isInteger(row.candidate_ordinal) && row.candidate_ordinal >= 1, `${row.candidate_id}: candidate ordinal changed`);
  if (row.url_parse_state === 'valid_http_url') {
    const parsed = new URL(row.url);
    ok(parsed.protocol === 'https:' || parsed.protocol === 'http:', `${row.candidate_id}: candidate URL scheme changed`);
    ok(parsed.hostname.toLowerCase() === row.url_host, `${row.candidate_id}: candidate host changed`);
  } else {
    ok(row.url_parse_state === 'malformed_retained_link_text', `${row.candidate_id}: URL parse state changed`);
    ok(row.disposition === 'malformed_retained_link_candidate', `${row.candidate_id}: malformed link disposition changed`);
    ok(row.selected_for_followup === false, `${row.candidate_id}: malformed link selected for execution`);
  }
  ok(typeof row.label === 'string', `${row.candidate_id}: label changed`);
  ok(Array.isArray(row.categories) && row.categories.length >= 1, `${row.candidate_id}: categories missing`);
  ok(Object.hasOwn(EXPECTED_CANDIDATE_DISPOSITIONS, row.disposition), `${row.candidate_id}: disposition changed`);
  ok(row.admitted_source === false && row.field_classification_effect === 'none' && row.result_spawned_requests === 0, `${row.candidate_id}: candidate gained authority`);
  if (row.selected_for_followup) {
    ok(row.url_parse_state === 'valid_http_url', `${row.candidate_id}: selected candidate URL is not executable`);
    ok(REQUIRED_FIELD_CATEGORIES.includes(row.selection_category), `${row.candidate_id}: selected category outside current class`);
    ok(typeof row.selection_reason === 'string' && row.selection_reason.length > 0, `${row.candidate_id}: selected rationale missing`);
    ok(Number.isInteger(row.followup_ordinal), `${row.candidate_id}: followup ordinal missing`);
    ok(row.deferred_reason === null, `${row.candidate_id}: selected candidate also deferred`);
  } else if (row.deferred_reason !== null) {
    ok(row.deferred_reason === DEFERRED_APPEAL_REASON, `${row.candidate_id}: deferred reason changed`);
    ok(row.categories.includes('appeal_hearing'), `${row.candidate_id}: deferred candidate is not appeal/hearing`);
    ok(row.selection_category === null && row.selection_reason === null && row.followup_ordinal === null, `${row.candidate_id}: deferred candidate retained execution metadata`);
  } else {
    ok(row.selection_category === null && row.selection_reason === null && row.followup_ordinal === null, `${row.candidate_id}: unselected candidate has execution metadata`);
  }
  return true;
}

export function deriveFollowupProtocol(candidates) {
  const selected = candidates.filter((row) => row.selected_for_followup).sort((a, b) => a.followup_ordinal - b.followup_ordinal);
  return {
    schema_version: 'ssc-rd04-wave03-responsive-link-followup-protocol@2',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    execution_trigger_path: SUCCESSOR_TRIGGER_PATH,
    source_execution_receipt_path: 'execution-receipt.json',
    source_route_adjudications_path: 'route-adjudications.jsonl',
    candidate_inventory_path: 'link-candidates.jsonl',
    selection_contract: {
      frozen_before_followup_execution: true,
      current_class_required_field_categories: [...REQUIRED_FIELD_CATEGORIES],
      appeal_hearing_candidates_preserved_but_deferred: 17,
      deferred_candidates_are_silently_dropped: false,
      selected_link_is_candidate_only_until_separate_response_adjudication: true,
    },
    denominator: {
      candidate_rows: candidates.length,
      selected_followup_routes: selected.length,
      states_represented: new Set(selected.map((row) => row.postal_code)).size,
      deferred_out_of_class_candidates: candidates.filter((row) => row.deferred_reason !== null).length,
      maximum_attempts_per_route: 1,
      maximum_parallel_workers: 6,
      result_spawned_requests: 0,
    },
    routes: selected.map((candidate, index) => ({
      route_ordinal: index + 1,
      route_id: `RD04-W03-LINK-${String(index + 1).padStart(3, '0')}`,
      scope: 'state',
      unit_ordinal: candidate.unit_ordinal,
      unit_id: candidate.unit_id,
      postal_code: candidate.postal_code,
      state_name: candidate.state_name,
      candidate_id: candidate.candidate_id,
      parent_route_id: candidate.parent_route_id,
      parent_body_sha256: candidate.parent_body_sha256,
      selection_category: candidate.selection_category,
      purpose: candidate.selection_reason,
      requested_url: candidate.url,
      allowed_final_host_suffix: candidate.url_host,
      maximum_attempts: 1,
      maximum_body_bytes: maximumBodyBytes(candidate.url),
      automatic_source_admission: false,
      automatic_field_classification: false,
      automatic_class_closure: false,
      result_spawned_requests: 0,
    })),
    boundaries: {
      landing_page_term_hit_is_field_classification: false,
      selected_link_is_admitted_source: false,
      http_success_is_source_admission: false,
      federal_rule_is_state_implementation: false,
      appeal_or_hearing_route_is_current_rd04_c02_field: false,
      one_state_result_is_national_prevalence: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };
}

export function validateFollowupRoute(route, expectedOrdinal, selectedCandidate) {
  ok(route.route_ordinal === expectedOrdinal && route.route_id === `RD04-W03-LINK-${String(expectedOrdinal).padStart(3, '0')}`, `followup ${expectedOrdinal}: identity changed`);
  ok(route.candidate_id === selectedCandidate.candidate_id && route.requested_url === selectedCandidate.url, `followup ${expectedOrdinal}: candidate binding changed`);
  ok(route.parent_route_id === selectedCandidate.parent_route_id && route.parent_body_sha256 === selectedCandidate.parent_body_sha256, `followup ${expectedOrdinal}: parent custody changed`);
  ok(route.unit_id === selectedCandidate.unit_id && route.postal_code === selectedCandidate.postal_code, `followup ${expectedOrdinal}: state binding changed`);
  ok(route.selection_category === selectedCandidate.selection_category && REQUIRED_FIELD_CATEGORIES.includes(route.selection_category), `followup ${expectedOrdinal}: category changed`);
  ok(new URL(route.requested_url).hostname.toLowerCase() === route.allowed_final_host_suffix, `followup ${expectedOrdinal}: final-host ceiling changed`);
  ok(route.maximum_attempts === 1 && route.result_spawned_requests === 0, `followup ${expectedOrdinal}: request ceiling changed`);
  ok([16777216, 52428800, 104857600].includes(route.maximum_body_bytes), `followup ${expectedOrdinal}: body ceiling changed`);
  for (const key of ['automatic_source_admission', 'automatic_field_classification', 'automatic_class_closure']) ok(route[key] === false, `followup ${expectedOrdinal}: ${key} changed`);
  return true;
}

export function validateAuthoredRows(root = ROOT) {
  const receipt = readJson(root, EXECUTION_RECEIPT_PATH);
  validateExecutionReceipt(receipt);
  const routes = readJsonl(root, ROUTE_ADJUDICATIONS_PATH);
  const observations = readJsonl(root, STATE_OBSERVATIONS_PATH);
  const candidates = readJsonl(root, LINK_CANDIDATES_PATH);
  ok(routes.length === 54, 'route denominator changed');
  routes.forEach((row, index) => validateRouteAdjudication(row, index + 1));
  same(countValues(routes.map((row) => row.execution_state)), EXPECTED_ROUTE_STATES, 'route-state denominator changed');
  ok(routes.filter((row) => row.source_admitted).length === 36, 'admitted landing-page denominator changed');
  ok(routes.filter((row) => row.scope === 'shared_federal' && row.source_admitted).length === 0, 'federal source admitted');
  ok(routes.filter((row) => row.execution_state === 'http_success_pending_source_adjudication' && !row.source_admitted).length === 2, 'nonresponsive success denominator changed');

  ok(candidates.length === 329, 'candidate denominator changed');
  const routeById = new Map(routes.map((row) => [row.route_id, row]));
  candidates.forEach((row) => validateLinkCandidate(row, routeById.get(row.parent_route_id)));
  ok(new Set(candidates.map((row) => row.candidate_id)).size === 329, 'candidate IDs are not unique');
  same(countValues(candidates.map((row) => row.disposition)), EXPECTED_CANDIDATE_DISPOSITIONS, 'candidate disposition denominator changed');
  const byParent = new Map();
  for (const row of candidates) {
    const group = byParent.get(row.parent_route_id) || [];
    group.push(row);
    byParent.set(row.parent_route_id, group);
  }
  for (const [parent, group] of byParent) {
    const ordinals = group.map((row) => row.candidate_ordinal);
    ok(new Set(ordinals).size === ordinals.length, `${parent}: candidate ordinals are not unique`);
    ok(ordinals.every((value, index) => Number.isInteger(value) && value >= 1 && (index === 0 || value > ordinals[index - 1])), `${parent}: candidate ordinals are not strictly increasing`);
  }
  const selected = candidates.filter((row) => row.selected_for_followup).sort((a, b) => a.followup_ordinal - b.followup_ordinal);
  ok(selected.length === 62, 'selected followup denominator changed');
  ok(selected.every((row, index) => row.followup_ordinal === index + 1), 'followup ordinals are not contiguous');
  same(countValues(selected.map((row) => row.selection_category)), EXPECTED_SELECTED_CATEGORIES, 'selected category denominator changed');
  ok(new Set(selected.map((row) => row.postal_code)).size === 30, 'selected state denominator changed');
  ok(candidates.filter((row) => row.deferred_reason === DEFERRED_APPEAL_REASON).length === 17, 'deferred appeal denominator changed');

  ok(observations.length === 50, 'state-observation denominator changed');
  for (let index = 0; index < observations.length; index += 1) {
    const route = routes[index + 4];
    validateStateObservation(observations[index], index + 1, route, candidates);
  }
  return { receipt, routes, observations, candidates, selected };
}

export function deriveIndex(root = ROOT) {
  const { routes, candidates } = validateAuthoredRows(root);
  return {
    schema_version: 'ssc-rd04-wave03-state-source-adjudication-index@2',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    execution_receipt_path: 'execution-receipt.json',
    route_adjudications_path: 'route-adjudications.jsonl',
    state_source_observations_path: 'state-source-observations.jsonl',
    link_candidates_path: 'link-candidates.jsonl',
    selected_followup_protocol_path: 'selected-followup-protocol.json',
    counts: {
      routes_adjudicated: 54,
      terminal_route_decisions: 54,
      state_landing_page_context_sources_admitted: 36,
      state_http_success_nonresponsive_or_script_only_surfaces: 2,
      federal_documents_admitted: 0,
      state_execution_route_gaps: 12,
      federal_execution_route_gaps: 4,
      responsive_link_candidates: 329,
      selected_followup_routes: 62,
      selected_followup_states: 30,
      deferred_out_of_class_candidates: 17,
      materialized_field_cells: 450,
      terminal_field_cells_before: 100,
      terminal_field_cells_after: 100,
      still_open_field_cells: 350,
      terminal_units: 0,
      result_spawned_requests: 0,
    },
    route_state_counts: EXPECTED_ROUTE_STATES,
    current_result: {
      state_source_execution_adjudication_complete: true,
      landing_page_context_layer_complete: '50/50 typed outcomes',
      substantive_field_terminalizations: 0,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
    next_bounded_operation: 'execute exactly the 62-route current-class responsive-link protocol and separately adjudicate every retained body before any field classification',
    candidate_disposition_counts: EXPECTED_CANDIDATE_DISPOSITIONS,
    selected_category_counts: EXPECTED_SELECTED_CATEGORIES,
    deferred_candidate_counts: { appeal_hearing: candidates.filter((row) => row.deferred_reason === DEFERRED_APPEAL_REASON).length },
  };
}

export function deriveProductManifest(root = ROOT) {
  const entries = DATA_MANIFEST_PATHS.map((rel) => fileEntry(root, rel));
  const combined = sha(Buffer.from(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}`).join('\n') + '\n'));
  return { schema_version: 'ssc-rd04-wave03-state-source-adjudication-product-manifest@2', entries, combined_sha256: combined };
}

export function expectedSuccessorTriggerText(root = ROOT) {
  const digest = sha(fs.readFileSync(abs(root, FOLLOWUP_PROTOCOL_PATH)));
  return [
    'state_source_adjudication_schema=ssc-rd04-wave03-state-source-adjudication-index@2',
    `protocol_path=${FOLLOWUP_PROTOCOL_PATH}`,
    `protocol_sha256=${digest}`,
    'fixed_routes=62',
    'maximum_attempts_per_route=1',
    'maximum_parallel_workers=6',
    'result_spawned_requests=0',
    'automatic_source_admission=false',
    'automatic_field_classification=false',
    'automatic_class_closure=false',
    'outside_human_dependency=false',
  ].join('\n') + '\n';
}

export function validateSuccessorTriggerText(value, root = ROOT) {
  ok(value === expectedSuccessorTriggerText(root), 'responsive-link trigger content changed');
  return true;
}

export function classifyChangedPathSurface(changed) {
  if (samePathSet(changed, [])) return 'canonical_main';
  if (samePathSet(changed, PERMANENT_PATHS)) return 'permanent_product';
  if (samePathSet(changed, [SUCCESSOR_TRIGGER_PATH])) return 'responsive_link_trigger';
  throw new Error(`unauthorized changed path surface: ${sortedPaths(changed).join(',') || '<empty>'}`);
}

function run() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check') || !write;
  const { candidates } = validateAuthoredRows(ROOT);
  const protocol = deriveFollowupProtocol(candidates);
  const index = deriveIndex(ROOT);
  if (write) {
    writeJson(ROOT, FOLLOWUP_PROTOCOL_PATH, protocol);
    writeJson(ROOT, INDEX_PATH, index);
  }
  if (check) {
    same(readJson(ROOT, FOLLOWUP_PROTOCOL_PATH), protocol, 'followup protocol differs from deterministic derivation');
    same(readJson(ROOT, INDEX_PATH), index, 'state-source adjudication index differs from deterministic derivation');
  }
  const manifest = deriveProductManifest(ROOT);
  if (write) writeJson(ROOT, PRODUCT_MANIFEST_PATH, manifest);
  if (check) same(readJson(ROOT, PRODUCT_MANIFEST_PATH), manifest, 'state-source adjudication product manifest differs from deterministic derivation');
  console.log('RD-04 state-source adjudication built: 54/54 routes typed, 36 responsive landing-page context sources admitted, 329 candidates preserved, 17 appeal/hearing candidates deferred, 62 current-class followups, 0 substantive field terminalizations');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
