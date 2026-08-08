import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, PRODUCT_DIR, SCHEMA_VERSION, PRODUCT_PARENT, PERMANENT_PATHS,
  FROZEN_URLS, ROUTES, canonicalJSON, sha256, buildProduct, normalizedURL,
} from './build-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadActualProduct() {
  const names = [
    'predecessor-custody.json',
    'frontier-selection.json',
    'previously-frozen-url-exclusion.json',
    'route-ledger.json',
    'route-query-contract.json',
    'summary.json',
    'product-manifest.json',
  ];
  return Object.fromEntries(names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(PRODUCT_DIR, name), 'utf8')),
  ]));
}

function validateAuthority(authority, label) {
  assert(authority.outside_human_dependency === false, `${label} outside human`);
  assert(authority.external_contacts === 0, `${label} external contacts`);
  assert(authority.external_reviews === 0, `${label} external reviews`);
  assert(authority.reviewed_disposition_changes === 0, `${label} reviewed disposition`);
  assert(authority.source_requests_executed === 0, `${label} source requests`);
  assert(authority.source_admissions === 0, `${label} source admissions`);
  assert(authority.field_classifications === 0, `${label} field classifications`);
  assert(authority.row_state_mutations === 0, `${label} row mutations`);
  assert(authority.class_closed === false, `${label} class closure`);
  assert(authority.cumulative_ledger_effect === 'none', `${label} cumulative ledger`);
  for (const key of [
    'publication_effect', 'adoption_effect', 'graph_effect', 'national_prevalence_effect',
    'discrimination_effect', 'racial_order_effect', 'coordination_effect',
    'common_purpose_effect', 'complete_compact_effect',
  ]) assert(authority[key] === 'none', `${label} ${key}`);
}

function validateRoute(route, selectedStates, selectedFields, frozenSet) {
  assert(route.schema_version === undefined, 'route schema version must be inherited');
  assert(selectedStates.has(route.state_id), `route state outside selected cohort: ${route.route_id}`);
  assert(route.postal_code === route.state_id.slice(-2), `route postal mismatch: ${route.route_id}`);
  assert(route.request_method === 'GET', `route method: ${route.route_id}`);
  assert(route.maximum_attempts === 1, `route attempts: ${route.route_id}`);
  assert(route.maximum_redirects === 4, `route redirects: ${route.route_id}`);
  assert(route.maximum_body_bytes === 33554432, `route body limit: ${route.route_id}`);
  assert(route.cross_host_redirects_allowed === false, `route cross-host: ${route.route_id}`);
  assert(route.result_spawned_requests === 0, `route spawned requests: ${route.route_id}`);
  assert(route.automatic_source_admission === false, `route source admission: ${route.route_id}`);
  assert(route.automatic_field_classification === false, `route field classification: ${route.route_id}`);
  assert(route.automatic_row_terminalization === false, `route row terminalization: ${route.route_id}`);
  assert(route.automatic_class_closure === false, `route class closure: ${route.route_id}`);
  assert(route.outside_human_dependency === false, `route outside human: ${route.route_id}`);
  assert(route.publication_effect === 'none', `route publication: ${route.route_id}`);
  assert(route.adoption_effect === 'none', `route adoption: ${route.route_id}`);
  assert(route.graph_effect === 'none', `route graph: ${route.route_id}`);
  assert(route.pre_execution_context_authority === 'route_selection_context_only', `route context authority: ${route.route_id}`);
  assert(normalizedURL(route.requested_url) === route.normalized_url, `route normalization: ${route.route_id}`);
  assert(route.url_sha256 === sha256(Buffer.from(route.normalized_url)), `route digest: ${route.route_id}`);
  const parsed = new URL(route.normalized_url);
  assert(parsed.protocol === 'https:', `route protocol: ${route.route_id}`);
  assert(parsed.hostname === route.expected_host, `route host: ${route.route_id}`);
  assert(!frozenSet.has(route.normalized_url), `route overlaps frozen URL: ${route.route_id}`);
  assert(Array.isArray(route.target_field_ids) && route.target_field_ids.length > 0, `route target fields: ${route.route_id}`);
  for (const field of route.target_field_ids) assert(selectedFields.has(field), `route field outside selected cohort: ${route.route_id} ${field}`);
}

export function validateObjects(product, { compareExpected = true, checkManifestFiles = true } = {}) {
  const expected = buildProduct();
  if (compareExpected) {
    for (const [name, value] of Object.entries(expected)) {
      assert(canonicalJSON(product[name]) === canonicalJSON(value), `object drift: ${name}`);
    }
  }

  const predecessor = product['predecessor-custody.json'];
  const frontier = product['frontier-selection.json'];
  const exclusion = product['previously-frozen-url-exclusion.json'];
  const ledger = product['route-ledger.json'];
  const contract = product['route-query-contract.json'];
  const summary = product['summary.json'];
  const manifest = product['product-manifest.json'];

  for (const [name, value] of Object.entries(product)) {
    assert(value.schema_version === SCHEMA_VERSION, `schema version: ${name}`);
  }

  assert(predecessor.canonical_parent === PRODUCT_PARENT, 'predecessor parent');
  assert(predecessor.terminal_cells_before === 222, 'predecessor terminal cells');
  assert(predecessor.still_open_substantive_cells_before === 188, 'predecessor open substantive');
  validateAuthority(predecessor.authority_boundary, 'predecessor');

  assert(frontier.minimum_open_substantive_cells_per_row === 3, 'minimum frontier size');
  assert(canonicalJSON(frontier.selected_state_ids) === canonicalJSON(['US-STATE-MT', 'US-STATE-ND']), 'selected states');
  assert(canonicalJSON(frontier.selected_field_ids) === canonicalJSON([
    'abawd_or_work_requirement_waiver_state_and_governing_period',
    'implementation_effective_date_or_typed_gap',
    'operative_state_implementation_authority_and_version',
  ]), 'selected fields');
  assert(frontier.selected_substantive_cell_count === 6, 'selected cell count');
  assert(frontier.derivative_row_state_cells_excluded === 2, 'row exclusions');
  assert(frontier.class_closed === false && frontier.outside_human_dependency === false, 'frontier authority');

  const frozenLedger = `${exclusion.normalized_urls.join('\n')}\n`;
  assert(exclusion.normalized_url_count === 14, 'frozen URL count');
  assert(exclusion.normalized_url_ledger_bytes === Buffer.byteLength(frozenLedger), 'frozen URL bytes');
  assert(exclusion.normalized_url_ledger_sha256 === sha256(Buffer.from(frozenLedger)), 'frozen URL digest');
  assert(exclusion.normalized_url_ledger_sha256 === 'c0fe247684720baf21ce6a76436a48b4398ecc0e8ef55ce383486e984ce8e846', 'frozen URL fixed digest');
  assert(canonicalJSON(exclusion.normalized_urls) === canonicalJSON(FROZEN_URLS), 'frozen URL ledger');
  assert(exclusion.new_route_overlap_count === 0, 'frozen URL overlap count');
  validateAuthority(exclusion.authority_boundary, 'exclusion');

  const selectedStates = new Set(frontier.selected_state_ids);
  const selectedFields = new Set(frontier.selected_field_ids);
  const frozenSet = new Set(exclusion.normalized_urls);
  assert(ledger.fixed_route_count === 5, 'route count');
  assert(ledger.routes.length === 5, 'route array count');
  assert(ledger.previous_frozen_url_ledger_sha256 === exclusion.normalized_url_ledger_sha256, 'route exclusion digest');
  const routeIds = new Set();
  const routeUrls = new Set();
  const fieldCoverage = new Map([...selectedStates].flatMap((state) => [...selectedFields].map((field) => [`${state}:${field}`, 0])));
  for (const route of ledger.routes) {
    validateRoute(route, selectedStates, selectedFields, frozenSet);
    assert(!routeIds.has(route.route_id), `duplicate route id: ${route.route_id}`);
    assert(!routeUrls.has(route.normalized_url), `duplicate route URL: ${route.route_id}`);
    routeIds.add(route.route_id);
    routeUrls.add(route.normalized_url);
    for (const field of route.target_field_ids) {
      const key = `${route.state_id}:${field}`;
      fieldCoverage.set(key, (fieldCoverage.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of fieldCoverage) assert(count > 0, `uncovered selected field: ${key}`);
  assert(ledger.source_requests_executed === 0, 'ledger requests');
  assert(ledger.result_spawned_requests === 0, 'ledger spawned requests');
  assert(ledger.automatic_source_admissions === 0, 'ledger source admission');
  assert(ledger.automatic_field_classifications === 0, 'ledger field classification');
  assert(ledger.automatic_row_terminalizations === 0, 'ledger row terminalization');
  assert(ledger.automatic_class_closures === 0, 'ledger class closure');
  validateAuthority(ledger.authority_boundary, 'route ledger');

  assert(contract.fixed_route_count === 5, 'contract route count');
  assert(contract.maximum_logical_route_attempts === 5, 'contract logical attempts');
  assert(contract.maximum_total_requests === 5, 'contract request maximum');
  assert(contract.maximum_physical_requests === 5, 'contract physical maximum');
  assert(contract.maximum_total_request_semantics === 'physical_http_requests_including_redirects', 'contract request semantics');
  assert(contract.redirects_consume_total_request_budget === true, 'contract redirect accounting');
  assert(contract.redirect_target_scheme === 'https', 'contract redirect scheme');
  assert(contract.maximum_attempts_per_route === 1, 'contract attempts');
  assert(contract.parallel_workers === 1, 'contract workers');
  assert(contract.cross_host_redirects_allowed === false, 'contract cross-host');
  assert(contract.credentials_allowed === false, 'contract credentials');
  assert(contract.cookies_allowed === false, 'contract cookies');
  assert(contract.browser_state_allowed === false, 'contract browser state');
  assert(contract.form_submissions_allowed === false, 'contract forms');
  assert(contract.runner_root_override_allowed === false, 'contract root override');
  assert(contract.protocol_input_sha256_binding === true, 'contract input binding');
  assert(contract.result_spawned_requests === 0, 'contract spawned requests');
  assert(contract.receipt_preimage_field === 'receipt_preimage_sha256', 'contract receipt preimage');
  assert(contract.final_receipt_ledger_path === 'receipt-file-ledger.json', 'contract receipt ledger');
  assert(contract.final_receipt_sha256_embedded === false, 'contract final receipt embedding');
  assert(contract.additional_execution_authorized === false, 'contract execution authority');
  assert(contract.source_admission_effect === 'none', 'contract source effect');
  assert(contract.field_classification_effect === 'none', 'contract field effect');
  assert(contract.row_state_effect === 'none', 'contract row effect');
  assert(contract.class_effect === 'none', 'contract class effect');
  assert(contract.cumulative_ledger_effect === 'none', 'contract cumulative effect');
  assert(contract.outside_human_dependency === false, 'contract outside human');

  assert(summary.selected_state_count === 2, 'summary state count');
  assert(summary.selected_field_count === 3, 'summary field count');
  assert(summary.selected_substantive_cell_count === 6, 'summary cell count');
  assert(summary.fixed_route_count === 5, 'summary route count');
  assert(summary.previously_frozen_url_count === 14, 'summary frozen count');
  assert(summary.terminal_cells_before === 222, 'summary terminal cells');
  assert(summary.open_substantive_cells_before === 188, 'summary open fields');
  assert(summary.class_closed === false, 'summary class');
  assert(summary.cumulative_ledger_effect === 'none', 'summary cumulative');
  assert(summary.captured_transport_logical_attempts === 5, 'summary captured logical attempts');
  assert(summary.captured_transport_physical_requests === 5, 'summary captured physical requests');
  assert(summary.captured_transport_artifact_id === 9018149945, 'summary artifact ID');
  assert(summary.captured_transport_artifact_sha256 === '9b828cef364b156cc995409e445d5a1250c981127d21b841d56b05ef14b036e3', 'summary artifact SHA-256');
  assert(summary.additional_execution_authorized === false, 'summary execution authority');

  assert(manifest.canonical_parent === 'a18f19ddc923e553848a5165cdf29fb1b9add97a', 'manifest repair parent');
  assert(manifest.permanent_path_count === 14, 'manifest path count');
  assert(canonicalJSON(manifest.permanent_paths) === canonicalJSON(PERMANENT_PATHS), 'manifest paths');
  assert(manifest.addition_only === false, 'manifest repair topology');
  assert(manifest.modified_paths === 10 && manifest.deleted_paths === 0, 'manifest modifications');
  assert(manifest.workflow_paths === 1, 'manifest workflow count');
  assert(manifest.write_capable_permanent_workflows === 0, 'manifest workflow authority');
  assert(manifest.transport_paths === 0, 'manifest transport');
  assert(manifest.source_requests_executed === 0, 'manifest source requests');
  assert(manifest.source_admissions === 0, 'manifest source admissions');
  assert(manifest.field_classifications === 0, 'manifest field classifications');
  assert(manifest.row_state_mutations === 0, 'manifest row mutations');
  assert(manifest.class_closed === false, 'manifest class');
  assert(manifest.cumulative_ledger_effect === 'none', 'manifest cumulative');

  if (checkManifestFiles) {
    for (const entry of manifest.hashed_files) {
      const bytes = fs.readFileSync(path.join(ROOT, entry.path));
      assert(bytes.length === entry.bytes, `manifest bytes: ${entry.path}`);
      assert(sha256(bytes) === entry.sha256, `manifest SHA-256: ${entry.path}`);
    }
  }

  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const product = loadActualProduct();
  validateObjects(product);
  console.log('postpromotion_next_protocol_validation=pass objects=7 routes=5 frozen_urls=14 selected_cells=6');
}
