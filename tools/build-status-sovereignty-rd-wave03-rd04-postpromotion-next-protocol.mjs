import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCT_DIR = path.join(ROOT, 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol');
export const SCHEMA_VERSION = 'ssc-rd04-wave03-postpromotion-next-protocol@1';
export const PRODUCT_PARENT = '3918c799f8b8dcdac49c33cec5c7bbd01ac428e4';
export const PROMOTION_TRIGGER_CUSTODY = '2aaadb3b87c83a8cf79ded7046a3856101bf943b';
export const PROMOTION_MERGE = '120c3b51b696a002a06ff82a0599216b84247882';
export const PROMOTION_PRODUCT = 'feadf9f13d87d714eca4b5d142538a4a73d684aa';
export const PREVIOUS_PROTOCOL_MERGE = '34583221f8d2485798fbe308241bf28fefd255ed';

export const INPUT_SPECS = Object.freeze([
  Object.freeze({
    key: 'promoted_matrix',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promoted-partial-field-matrix.json',
    git_blob: '42361e559db90777e1d60aea5530df5694c86dc6',
  }),
  Object.freeze({
    key: 'remaining_open_census',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/remaining-open-field-census.json',
    git_blob: 'e6ea2bb2722d084d0bb601864d4de5d9db4c7b47',
  }),
  Object.freeze({
    key: 'promotion_summary',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promotion-summary.json',
    git_blob: 'e774a9ed555364e4c6616c407a24001dd39f8f51',
  }),
  Object.freeze({
    key: 'previous_route_protocol',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/route-discovery-protocol.json',
    git_blob: '35e09035659d54060547e84ab29d5ba440402b2c',
  }),
  Object.freeze({
    key: 'selected_followup_protocol',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/selected-followup-protocol.json',
    git_blob: '88cb73c7bae87a4031d1571d7dd5ebdcb58aa2f4',
  }),
  Object.freeze({
    key: 'source_adjudications',
    path: 'data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/source-adjudications.json',
    git_blob: '53f378c9c4a56ca4aab0312bba38150b071786af',
  }),
]);

export const PERMANENT_PATHS = Object.freeze([
  ".github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.yml",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/frontier-selection.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/predecessor-custody.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/previously-frozen-url-exclusion.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/product-manifest.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-ledger.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-query-contract.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/summary.json",
  "docs/milestones/ssc-rd-wave03-rd04-postpromotion-next-protocol.md",
  "schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.schema.json",
  "test/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.test.js",
  "tools/acquisition/status-sovereignty-rd-wave03-rd04-postpromotion-next/execute-fixed-routes.py",
  "tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs",
  "tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs"
]);
export const FROZEN_URLS = Object.freeze([
  "https://dphhs.mt.gov/assets/hcsd/StatePlanMT2026OriginalSubmissionApproved.pdf",
  "https://dphhs.mt.gov/hcsd/Manuals/SNAPmanual",
  "https://dphhs.mt.gov/hcsd/OfficeofPublicAssistance",
  "https://dphhs.mt.gov/hcsd/SNAP",
  "https://dphhs.mt.gov/hcsd/SNAP/SNAPETPlanAmendment",
  "https://www.applyforhelp.nd.gov/",
  "https://www.fna.usda.gov/snap-directory-entry/montana",
  "https://www.fna.usda.gov/snap-directory-entry/north-dakota",
  "https://www.hhs.nd.gov/applyforhelp",
  "https://www.hhs.nd.gov/applyforhelp/snap",
  "https://www.hhs.nd.gov/human-service/zones",
  "https://www.hhs.nd.gov/resources/policy-manuals",
  "https://www.hhs.nd.gov/service-locations/human-service/zones",
  "https://www.hhs.nd.gov/sites/default/files/documents/EA/e-t-state-plan-ffy-2026-exclusion.pdf"
]);
export const ROUTES = Object.freeze([
  {
    "route_id": "RD04-W03-PPN-MT-001",
    "postal_code": "MT",
    "state_id": "US-STATE-MT",
    "route_category": "current_manual_release_index",
    "expected_host": "dphhs.mt.gov",
    "target_field_ids": [
      "operative_state_implementation_authority_and_version",
      "implementation_effective_date_or_typed_gap"
    ],
    "selection_purpose": "Capture the dated Montana SNAP manual table of contents that identifies the current section set and revision dates.",
    "pre_execution_context": "The current Montana manual index identifies section-level revision dates but does not by itself establish complete implementation, waiver, frontline practice, or any person-level result.",
    "route_ordinal": 1,
    "requested_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAPTOC7.2026.pdf",
    "normalized_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAPTOC7.2026.pdf",
    "url_sha256": "a15612157e33e65b101933588d00cfe5b60530b4c117d7b330c21412e3c60f07",
    "request_method": "GET",
    "maximum_attempts": 1,
    "maximum_redirects": 4,
    "maximum_body_bytes": 33554432,
    "cross_host_redirects_allowed": false,
    "result_spawned_requests": 0,
    "automatic_source_admission": false,
    "automatic_field_classification": false,
    "automatic_row_terminalization": false,
    "automatic_class_closure": false,
    "pre_execution_context_authority": "route_selection_context_only",
    "outside_human_dependency": false,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
  },
  {
    "route_id": "RD04-W03-PPN-MT-002",
    "postal_code": "MT",
    "state_id": "US-STATE-MT",
    "route_category": "work_registration_authority",
    "expected_host": "dphhs.mt.gov",
    "target_field_ids": [
      "operative_state_implementation_authority_and_version",
      "implementation_effective_date_or_typed_gap"
    ],
    "selection_purpose": "Capture Montana SNAP 700 as the exact current work-registration authority and effective-date surface.",
    "pre_execution_context": "A work-registration rule can establish bounded authority and effective-date text but does not establish uniform staff practice or individual outcomes.",
    "route_ordinal": 2,
    "requested_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAP700.pdf",
    "normalized_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAP700.pdf",
    "url_sha256": "f2d3beb6e1a7b9902cc2e83584a1a66806512224bb498ef96eab18d566d893b1",
    "request_method": "GET",
    "maximum_attempts": 1,
    "maximum_redirects": 4,
    "maximum_body_bytes": 33554432,
    "cross_host_redirects_allowed": false,
    "result_spawned_requests": 0,
    "automatic_source_admission": false,
    "automatic_field_classification": false,
    "automatic_row_terminalization": false,
    "automatic_class_closure": false,
    "pre_execution_context_authority": "route_selection_context_only",
    "outside_human_dependency": false,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
  },
  {
    "route_id": "RD04-W03-PPN-MT-003",
    "postal_code": "MT",
    "state_id": "US-STATE-MT",
    "route_category": "abawd_geographic_waiver_authority",
    "expected_host": "dphhs.mt.gov",
    "target_field_ids": [
      "abawd_or_work_requirement_waiver_state_and_governing_period",
      "implementation_effective_date_or_typed_gap"
    ],
    "selection_purpose": "Capture Montana SNAP 802-1 as the exact geographic-waiver and effective-date surface.",
    "pre_execution_context": "The policy section may state the current public waiver position and effective date; it is not an individual exemption or case determination.",
    "route_ordinal": 3,
    "requested_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAP802.1.pdf",
    "normalized_url": "https://dphhs.mt.gov/assets/hcsd/snapmanual/SNAP802.1.pdf",
    "url_sha256": "5516fa1c62d9199bc4d54e1d992af3498201d10604eb3fbc3cf7b7e02392a41f",
    "request_method": "GET",
    "maximum_attempts": 1,
    "maximum_redirects": 4,
    "maximum_body_bytes": 33554432,
    "cross_host_redirects_allowed": false,
    "result_spawned_requests": 0,
    "automatic_source_admission": false,
    "automatic_field_classification": false,
    "automatic_row_terminalization": false,
    "automatic_class_closure": false,
    "pre_execution_context_authority": "route_selection_context_only",
    "outside_human_dependency": false,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
  },
  {
    "route_id": "RD04-W03-PPN-ND-001",
    "postal_code": "ND",
    "state_id": "US-STATE-ND",
    "route_category": "current_manual_release_index",
    "expected_host": "www.nd.gov",
    "target_field_ids": [
      "operative_state_implementation_authority_and_version",
      "implementation_effective_date_or_typed_gap"
    ],
    "selection_purpose": "Capture the current North Dakota SNAP manual release index and publication date.",
    "pre_execution_context": "The manual home identifies the current public release and update boundary but is not complete proof of every operative section or practice.",
    "route_ordinal": 4,
    "requested_url": "https://www.nd.gov/dhs/policymanuals/SNAP/SNAP.htm",
    "normalized_url": "https://www.nd.gov/dhs/policymanuals/SNAP/SNAP.htm",
    "url_sha256": "dbe655dccc2de08b2307cdf717d2de7765f945197571b60c523a4c41f04eb520",
    "request_method": "GET",
    "maximum_attempts": 1,
    "maximum_redirects": 4,
    "maximum_body_bytes": 33554432,
    "cross_host_redirects_allowed": false,
    "result_spawned_requests": 0,
    "automatic_source_admission": false,
    "automatic_field_classification": false,
    "automatic_row_terminalization": false,
    "automatic_class_closure": false,
    "pre_execution_context_authority": "route_selection_context_only",
    "outside_human_dependency": false,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
  },
  {
    "route_id": "RD04-W03-PPN-ND-002",
    "postal_code": "ND",
    "state_id": "US-STATE-ND",
    "route_category": "abawd_geographic_waiver_authority",
    "expected_host": "www.nd.gov",
    "target_field_ids": [
      "abawd_or_work_requirement_waiver_state_and_governing_period",
      "implementation_effective_date_or_typed_gap"
    ],
    "selection_purpose": "Capture North Dakota policy section 403 as the current geographic-waiver period and effective-date surface.",
    "pre_execution_context": "The policy section may state public waiver periods and geography; it does not establish individual eligibility, exemption, or worker exercise.",
    "route_ordinal": 5,
    "requested_url": "https://www.nd.gov/dhs/policymanuals/SNAP/Content/403%20Geographic%20Waiver.htm",
    "normalized_url": "https://www.nd.gov/dhs/policymanuals/SNAP/Content/403%20Geographic%20Waiver.htm",
    "url_sha256": "20e5a6b4bffc5acc7591db2177de5176fe18402a1e7c399a1fbc20d679d9381e",
    "request_method": "GET",
    "maximum_attempts": 1,
    "maximum_redirects": 4,
    "maximum_body_bytes": 33554432,
    "cross_host_redirects_allowed": false,
    "result_spawned_requests": 0,
    "automatic_source_admission": false,
    "automatic_field_classification": false,
    "automatic_row_terminalization": false,
    "automatic_class_closure": false,
    "pre_execution_context_authority": "route_selection_context_only",
    "outside_human_dependency": false,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
  }
]);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function gitBlobSha(data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest('hex');
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  }
  return value;
}

export function canonicalJSON(value) {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}

function readBytes(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function readJSON(relativePath) {
  return JSON.parse(readBytes(relativePath).toString('utf8'));
}

export function verifyInputBlobs() {
  if (process.env.RD04_PROTOCOL_SKIP_INPUT_BLOB_CHECKS === '1') return;
  for (const spec of INPUT_SPECS) {
    const actual = gitBlobSha(readBytes(spec.path));
    if (actual !== spec.git_blob) {
      throw new Error(`input Git blob mismatch for ${spec.path}: ${actual} != ${spec.git_blob}`);
    }
  }
}

function openSubstantiveFields(row) {
  return [...row.still_open_field_ids]
    .filter((field) => field !== 'field_and_row_terminal_state')
    .sort();
}

export function deriveFrontier(census) {
  const eligible = census.state_rows
    .map((row) => ({ state_id: row.unit_id, postal_code: row.postal_code, fields: openSubstantiveFields(row) }))
    .filter((row) => row.fields.length > 0);
  const minimum = Math.min(...eligible.map((row) => row.fields.length));
  const groups = new Map();
  for (const row of eligible.filter((item) => item.fields.length === minimum)) {
    const signature = row.fields.join('\u0000');
    const prior = groups.get(signature) ?? { fields: row.fields, states: [] };
    prior.states.push(row.state_id);
    groups.set(signature, prior);
  }
  const cohorts = [...groups.values()]
    .map((group) => ({ field_ids: group.fields, state_ids: group.states.sort(), row_count: group.states.length }))
    .sort((a, b) => {
      if (a.row_count !== b.row_count) return b.row_count - a.row_count;
      const af = a.field_ids.join('\u0000');
      const bf = b.field_ids.join('\u0000');
      if (af !== bf) return af.localeCompare(bf);
      return a.state_ids.join('\u0000').localeCompare(b.state_ids.join('\u0000'));
    });
  if (cohorts.length === 0) throw new Error('no open substantive cohort');
  return { minimum_open_substantive_cells_per_row: minimum, cohorts, selected: cohorts[0] };
}

export function normalizedURL(raw) {
  const url = new URL(raw);
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  if (url.pathname !== '/' && url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function inputCustody() {
  return INPUT_SPECS.map((spec) => ({ ...spec }));
}

function authorityBoundary() {
  return {
    outside_human_dependency: false,
    external_contacts: 0,
    external_reviews: 0,
    reviewed_disposition_changes: 0,
    source_requests_executed: 0,
    source_admissions: 0,
    field_classifications: 0,
    row_state_mutations: 0,
    class_closed: false,
    cumulative_ledger_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    national_prevalence_effect: 'none',
    discrimination_effect: 'none',
    racial_order_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    complete_compact_effect: 'none',
  };
}

export function buildCoreObjects() {
  verifyInputBlobs();
  const census = readJSON(INPUT_SPECS.find((spec) => spec.key === 'remaining_open_census').path);
  const promotionSummary = readJSON(INPUT_SPECS.find((spec) => spec.key === 'promotion_summary').path);
  const frontier = deriveFrontier(census);
  const selected = frontier.selected;

  const expectedFields = [
    'abawd_or_work_requirement_waiver_state_and_governing_period',
    'implementation_effective_date_or_typed_gap',
    'operative_state_implementation_authority_and_version',
  ];
  const expectedStates = ['US-STATE-MT', 'US-STATE-ND'];
  if (canonicalJSON(selected.field_ids) !== canonicalJSON(expectedFields)) throw new Error('postpromotion field cohort drift');
  if (canonicalJSON(selected.state_ids) !== canonicalJSON(expectedStates)) throw new Error('postpromotion state cohort drift');
  if (census.counts.terminal_cells !== 222 || census.counts.substantive_fields_still_open !== 188) {
    throw new Error('postpromotion census counts drift');
  }
  if (promotionSummary.matrix_transition.terminal_cells_after !== 222 ||
      promotionSummary.matrix_transition.substantive_fields_still_open_after !== 188 ||
      promotionSummary.matrix_transition.class_closed_after !== false) {
    throw new Error('promotion summary drift');
  }

  const frozenLedger = `${FROZEN_URLS.join('\n')}\n`;
  const frozenDigest = sha256(Buffer.from(frozenLedger));
  if (frozenDigest !== 'c0fe247684720baf21ce6a76436a48b4398ecc0e8ef55ce383486e984ce8e846') throw new Error('frozen URL digest drift');

  const normalizedRoutes = ROUTES.map((route) => ({ ...route, normalized_url: normalizedURL(route.requested_url) }));
  const frozenSet = new Set(FROZEN_URLS);
  for (const route of normalizedRoutes) {
    if (frozenSet.has(route.normalized_url)) throw new Error(`new route overlaps frozen denominator: ${route.normalized_url}`);
    if (route.url_sha256 !== sha256(Buffer.from(route.normalized_url))) throw new Error(`route URL digest drift: ${route.route_id}`);
  }

  const predecessor = {
    object_type: 'predecessor_custody',
    schema_version: SCHEMA_VERSION,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    canonical_parent: PRODUCT_PARENT,
    promotion_product_commit: PROMOTION_PRODUCT,
    promotion_merge: PROMOTION_MERGE,
    promotion_repair_merge: '987f1b2574eeddaba49d67c1c1498a81d40f7c69',
    promotion_trigger_custody_merge: PROMOTION_TRIGGER_CUSTODY,
    previous_protocol_merge: PREVIOUS_PROTOCOL_MERGE,
    terminal_cells_before: 222,
    still_open_cells_before: 228,
    still_open_substantive_cells_before: 188,
    terminal_units_before: 10,
    input_custody: inputCustody(),
    authority_boundary: authorityBoundary(),
  };

  const frontierSelection = {
    object_type: 'frontier_selection',
    schema_version: SCHEMA_VERSION,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    canonical_parent: PRODUCT_PARENT,
    state_denominator: 50,
    field_denominator_per_state: 9,
    terminal_cells_before: 222,
    still_open_cells_before: 228,
    still_open_substantive_cells_before: 188,
    terminal_units_before: 10,
    minimum_open_substantive_cells_per_row: frontier.minimum_open_substantive_cells_per_row,
    minimum_cohorts: frontier.cohorts,
    selection_rule: 'minimum positive substantive-cell count; then largest exact field-signature cohort; then lexicographic field signature and state IDs',
    selected_state_ids: selected.state_ids,
    selected_field_ids: selected.field_ids,
    selected_state_count: selected.state_ids.length,
    selected_field_count: selected.field_ids.length,
    selected_substantive_cell_count: selected.state_ids.length * selected.field_ids.length,
    derivative_row_state_cells_excluded: selected.state_ids.length,
    class_closed: false,
    outside_human_dependency: false,
  };

  const exclusion = {
    object_type: 'previously_frozen_url_exclusion',
    schema_version: SCHEMA_VERSION,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    normalization_rule: 'lowercase scheme and host; strip default port and fragment; preserve path and query bytes; ensure root slash; strip non-root trailing slash',
    source_protocol_merge: PREVIOUS_PROTOCOL_MERGE,
    source_capture_artifact_id: 9002226845,
    source_capture_zip_sha256: '0ddb75c966d20bf9d05385adce6960b06b8c96c3696aed55bafabc853f9e2b63',
    source_followup_capture_artifact_id: 9009440088,
    source_followup_capture_zip_sha256: '575bba100ecde8908ca8a437adbb3871ffdd77b237753d1e7d41a23e3e1a2796',
    normalized_url_count: FROZEN_URLS.length,
    normalized_url_ledger_bytes: Buffer.byteLength(frozenLedger),
    normalized_url_ledger_sha256: frozenDigest,
    normalized_urls: FROZEN_URLS,
    new_route_overlap_count: 0,
    authority_boundary: authorityBoundary(),
  };

  const routeLedger = {
    object_type: 'route_ledger',
    schema_version: SCHEMA_VERSION,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    canonical_parent: PRODUCT_PARENT,
    selected_state_ids: selected.state_ids,
    selected_field_ids: selected.field_ids,
    fixed_route_count: normalizedRoutes.length,
    routes: normalizedRoutes,
    previous_frozen_url_ledger_sha256: frozenDigest,
    source_requests_executed: 0,
    result_spawned_requests: 0,
    automatic_source_admissions: 0,
    automatic_field_classifications: 0,
    automatic_row_terminalizations: 0,
    automatic_class_closures: 0,
    authority_boundary: authorityBoundary(),
  };

  const routeQueryContract = {
    object_type: 'route_query_contract',
    schema_version: SCHEMA_VERSION,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    fixed_route_count: normalizedRoutes.length,
    maximum_total_requests: normalizedRoutes.length,
    maximum_attempts_per_route: 1,
    maximum_redirects_per_route: 4,
    maximum_body_bytes_per_route: 33554432,
    parallel_workers: 1,
    request_methods: ['GET'],
    allowed_initial_hosts: ['dphhs.mt.gov', 'www.nd.gov'],
    cross_host_redirects_allowed: false,
    credentials_allowed: false,
    cookies_allowed: false,
    browser_state_allowed: false,
    form_submissions_allowed: false,
    result_spawned_requests: 0,
    retained_transport_fields: [
      'route_id', 'requested_url', 'final_url', 'terminal_state', 'http_status',
      'content_type', 'body_bytes', 'body_sha256', 'response_receipt_sha256',
    ],
    terminal_states: [
      'terminal_http_success_body_captured',
      'terminal_http_success_no_body',
      'terminal_http_non_success',
      'terminal_cross_host_redirect_refused',
      'terminal_body_limit_exceeded',
      'terminal_transport_error',
    ],
    source_admission_effect: 'none',
    field_classification_effect: 'none',
    row_state_effect: 'none',
    class_effect: 'none',
    cumulative_ledger_effect: 'none',
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };

  const summary = {
    object_type: 'summary',
    schema_version: SCHEMA_VERSION,
    canonical_parent: PRODUCT_PARENT,
    selected_state_count: selected.state_ids.length,
    selected_field_count: selected.field_ids.length,
    selected_substantive_cell_count: selected.state_ids.length * selected.field_ids.length,
    derivative_row_state_cells_excluded: selected.state_ids.length,
    fixed_route_count: normalizedRoutes.length,
    previously_frozen_url_count: FROZEN_URLS.length,
    previously_frozen_url_ledger_sha256: frozenDigest,
    source_requests_executed: 0,
    source_admissions: 0,
    field_classifications: 0,
    row_state_mutations: 0,
    terminal_cells_before: 222,
    open_substantive_cells_before: 188,
    class_closed: false,
    outside_human_dependency: false,
    cumulative_ledger_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    next_operation: 'execute exactly the five fixed routes once through a separate never-merge trigger; capture transport custody only; adjudicate every route offline before any source or field effect',
  };

  return {
    'predecessor-custody.json': predecessor,
    'frontier-selection.json': frontierSelection,
    'previously-frozen-url-exclusion.json': exclusion,
    'route-ledger.json': routeLedger,
    'route-query-contract.json': routeQueryContract,
    'summary.json': summary,
  };
}

const HASHED_STATIC_PATHS = Object.freeze([
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.yml',
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-next-protocol.md',
  'test/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.test.js',
  'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs',
  'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs',
  'tools/acquisition/status-sovereignty-rd-wave03-rd04-postpromotion-next/execute-fixed-routes.py',
]);

function buildManifest(coreObjects) {
  const hashes = [];
  for (const [name, value] of Object.entries(coreObjects)) {
    const content = canonicalJSON(value);
    hashes.push({ path: `data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/${name}`, bytes: Buffer.byteLength(content), sha256: sha256(Buffer.from(content)) });
  }
  for (const staticPath of HASHED_STATIC_PATHS) {
    const bytes = readBytes(staticPath);
    hashes.push({ path: staticPath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  hashes.sort((a, b) => a.path.localeCompare(b.path));
  return {
    object_type: 'product_manifest',
    schema_version: SCHEMA_VERSION,
    canonical_parent: PRODUCT_PARENT,
    product_branch: 'agent/ssc-rd04-postpromotion-next-protocol-product-v2',
    permanent_path_count: PERMANENT_PATHS.length,
    permanent_paths: PERMANENT_PATHS,
    addition_only: true,
    modified_paths: 0,
    deleted_paths: 0,
    workflow_paths: 1,
    write_capable_permanent_workflows: 0,
    transport_paths: 0,
    hashed_file_count: hashes.length,
    hashed_files: hashes,
    self_describing_unhashed_paths: [
      'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/product-manifest.json',
      'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.schema.json',
    ],
    source_requests_executed: 0,
    source_admissions: 0,
    field_classifications: 0,
    row_state_mutations: 0,
    class_closed: false,
    cumulative_ledger_effect: 'none',
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
}

export function buildProduct() {
  const core = buildCoreObjects();
  return { ...core, 'product-manifest.json': buildManifest(core) };
}

export function writeProduct() {
  fs.mkdirSync(PRODUCT_DIR, { recursive: true });
  const product = buildProduct();
  for (const [name, value] of Object.entries(product)) {
    fs.writeFileSync(path.join(PRODUCT_DIR, name), canonicalJSON(value));
  }
  return product;
}

export function checkProduct() {
  const product = buildProduct();
  for (const [name, value] of Object.entries(product)) {
    const expected = canonicalJSON(value);
    const actual = fs.readFileSync(path.join(PRODUCT_DIR, name), 'utf8');
    if (actual !== expected) throw new Error(`deterministic product drift: ${name}`);
  }
  return product;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write');
  const product = write ? writeProduct() : checkProduct();
  const summary = product['summary.json'];
  console.log(`postpromotion_next_protocol=${write ? 'written' : 'clean'} routes=${summary.fixed_route_count} selected_states=${summary.selected_state_count} open_substantive=${summary.open_substantive_cells_before}`);
}
