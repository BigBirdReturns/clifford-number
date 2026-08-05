import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) {
  throw new Error('usage: node tools/build-schoolhouse-charity-nc-final-static-residual-custody.mjs <artifact-dir>');
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const SOURCE_PART = 'source-inventory-11.jsonl';
const CUSTODY_FILE = 'schoolhouse-charity-nc-final-static-residual-custody.json';
const INPUT_LINKS_FILE = 'schoolhouse-charity-nc-final-static-residual-input-links.jsonl';
const ROUTE_RESULTS_FILE = 'schoolhouse-charity-nc-final-static-residual-route-results.jsonl';
const HTML_SURFACES_FILE = 'schoolhouse-charity-nc-final-static-residual-html-surfaces.jsonl';
const FORMS_FILE = 'schoolhouse-charity-nc-final-static-residual-surface-forms.jsonl';
const FILE_SAMPLES_FILE = 'schoolhouse-charity-nc-final-static-residual-file-samples.jsonl';

const WORKFLOW_RUN_ID = 30986284127;
const ARTIFACT_ID = 8922193975;
const ARTIFACT_NAME = 'schoolhouse-charity-nc-final-static-residual';
const ARTIFACT_DIGEST = 'sha256:aae714c531d7e4335c843ab9ce4bd7626c51c6f2d7be7588b6c8c02c7eb6142d';
const ACQUISITION_HEAD = '4aba5edcd8f7680510aa464952c2fcf2f9efee38';
const AS_OF = '2026-08-05';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`${file}:${index + 1}: ${error.message}`);
  }
});
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };
const countBy = (rows, key) => Object.fromEntries(
  [...rows.reduce((counts, row) => counts.set(String(row[key]), (counts.get(String(row[key])) || 0) + 1), new Map()).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
);
const unique = values => new Set(values).size === values.length;
const replaceExactOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected one exact anchor, found ${count}`);
  return source.replace(before, after);
};
const insertAfterOnce = (source, anchor, addition, label) => replaceExactOnce(source, anchor, anchor + addition, label);

const manifest = readJson(MANIFEST_PATH);
const schoolhouse = readJson(SCHOOLHOUSE_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected BVVC manifest schema');
if (manifest.counts.source_inventory_rows !== 224) fail(`expected 224 source receipts before final residual custody, got ${manifest.counts.source_inventory_rows}`);
if (manifest.counts.coverage_denominator_rows !== 20) fail('expected twenty coverage denominator rows before final residual custody');
if (manifest.counts.explicit_gap_rows !== 16) fail('expected sixteen explicit gap rows before final residual custody');
if (manifest.counts.schoolhouse_charity_nc_second_level_residual_relevant_links !== 51 || manifest.counts.schoolhouse_charity_nc_second_level_residual_file_links !== 16) fail('second-level residual predecessor is missing');
if (!manifest.storage_contract?.source_inventory_parts?.includes('source-inventory-10.jsonl')) fail('source-inventory-10.jsonl predecessor is missing');
if (!schoolhouse.state_registry_identity_census?.charity_north_carolina_second_level_route_discovery) fail('School.House second-level projection is missing');
if (schoolhouse.state_registry_identity_census?.charity_north_carolina_final_static_residual_custody) fail('School.House final residual projection already exists');
if (coverage.denominators.some(row => row.surface === 'School.House North Carolina final static residual route custody')) fail('final residual coverage denominator already exists');

for (const filename of [
  SOURCE_PART,
  CUSTODY_FILE,
  INPUT_LINKS_FILE,
  ROUTE_RESULTS_FILE,
  HTML_SURFACES_FILE,
  FORMS_FILE,
  FILE_SAMPLES_FILE
]) {
  if (fs.existsSync(path.join(DIR, filename))) fail(`permanent path already exists: ${filename}`);
}

const priorSourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(filename => readJsonl(path.join(DIR, filename)));
if (priorSourceInventory.length !== 224) fail(`predecessor source inventory denominator is ${priorSourceInventory.length}, expected 224`);
if (!unique(priorSourceInventory.map(row => row.receipt_id))) fail('predecessor source inventory receipt IDs are not unique');
const priorReceiptIds = new Set(priorSourceInventory.map(row => row.receipt_id));

const summary = readJson(path.join(ARTIFACT_DIR, 'summary.json'));
const policy = readJson(path.join(ARTIFACT_DIR, 'route-policy.json'));
const artifactManifest = readJson(path.join(ARTIFACT_DIR, 'artifact-manifest.json'));
const inputLinks = readJsonl(path.join(ARTIFACT_DIR, 'input-residual-links.jsonl'));
const routeResults = readJsonl(path.join(ARTIFACT_DIR, 'route-results.jsonl'));
const htmlSurfaces = readJsonl(path.join(ARTIFACT_DIR, 'html-surfaces.jsonl'));
const forms = readJsonl(path.join(ARTIFACT_DIR, 'surface-forms.jsonl'));
const fileSamples = readJsonl(path.join(ARTIFACT_DIR, 'file-samples.jsonl'));

if (artifactManifest.schema_version !== 'schoolhouse-charity-nc-final-static-residual-artifact-manifest@1') fail('unexpected final residual artifact manifest schema');
const artifactFiles = new Map(Object.entries(artifactManifest.files || {}));
for (const filename of [
  'input-residual-links.jsonl',
  'route-results.jsonl',
  'html-surfaces.jsonl',
  'surface-forms.jsonl',
  'file-samples.jsonl',
  'route-policy.json',
  'summary.json'
]) {
  const expected = artifactFiles.get(filename);
  const file = path.join(ARTIFACT_DIR, filename);
  if (!expected || !fs.existsSync(file)) fail(`artifact file missing: ${filename}`);
  if (fs.statSync(file).size !== expected.bytes) fail(`artifact byte-count drift: ${filename}`);
  if (sha256(file) !== expected.sha256) fail(`artifact SHA-256 drift: ${filename}`);
  if (Number.isInteger(expected.rows)) {
    const rows = readJsonl(file).length;
    if (rows !== expected.rows) fail(`artifact row-count drift: ${filename}`);
  }
}
if (artifactFiles.size !== 7) fail('artifact file denominator drift');
if (artifactManifest.declared_residual_routes !== 51 || artifactManifest.terminal_route_rows !== 51 || artifactManifest.input_file_links !== 16) fail('artifact route denominator drift');
if (artifactManifest.search_submissions !== 0 || artifactManifest.source_rows_acquired !== 0) fail('artifact search/source-row authority drift');
if (artifactManifest.identity_admitted !== false || artifactManifest.outside_human_dependency !== false || artifactManifest.graph_effect !== 'none') fail('artifact authority drift');

const expectedSummary = {
  input_discovered_link_rows: 524,
  residual_unique_links: 101,
  declared_residual_routes: 51,
  input_file_links: 16,
  terminal_route_rows: 51,
  request_attempts: 51,
  file_target_terminal_rows: 16,
  html_surface_rows: 35,
  form_rows: 0,
  file_sample_rows: 15,
  interactive_search_submissions: 0,
  organization_name_submissions: 0,
  license_number_submissions: 0,
  payment_submissions: 0,
  upload_submissions: 0,
  account_submissions: 0,
  contact_submissions: 0,
  source_rows_acquired: 0,
  street_address_rows_retained: 0,
  contact_detail_rows_retained: 0,
  private_support_rows: 0
};
for (const [key, expected] of Object.entries(expectedSummary)) {
  if (summary[key] !== expected) fail(`final residual summary drift for ${key}: expected ${expected}, got ${summary[key]}`);
}
if (summary.schema_version !== 'schoolhouse-charity-nc-final-static-residual-summary@1') fail('unexpected final residual summary schema');
if (summary.input_file_sha256 !== 'a25d2a537eda86f202ea438a53d6fd9369695a151163e2b67af304787fb25a52') fail('frozen predecessor input SHA-256 drift');
if (summary.maximum_attempts_per_route !== 1 || summary.maximum_workers !== 8 || JSON.stringify(summary.request_methods) !== JSON.stringify(['GET'])) fail('final residual request bounds drift');
if (summary.maximum_file_sample_bytes !== 1048576 || summary.maximum_html_bytes !== 2097152 || summary.result_spawned_requests !== 0) fail('final residual transport bounds drift');
if (summary.all_route_receipts_terminal !== true || summary.static_residual_route_denominator_terminal !== true) fail('final residual terminal state drift');
if (summary.raw_source_retained !== false || summary.complete_remote_files_retained !== false || summary.hidden_form_values_retained !== false) fail('final residual privacy/file-custody drift');
if (summary.identity_admitted !== false || summary.negative_existence_claim_created !== false || summary.outside_human_dependency !== false || summary.publication_effect !== 'none' || summary.adoption_effect !== 'none' || summary.graph_effect !== 'none' || summary.promotes_to !== 'candidate_only') fail('final residual authority drift');
if (JSON.stringify(summary.terminal_state_counts) !== JSON.stringify({ http_error: 2, http_success_file_sample: 15, http_success_html: 34 })) fail('final residual terminal-state denominator drift');
if (JSON.stringify(summary.http_status_counts) !== JSON.stringify({ '200': 34, '206': 15, '404': 1, '500': 1 })) fail('final residual HTTP-status denominator drift');

if (policy.schema_version !== 'schoolhouse-charity-nc-final-static-residual-policy@1') fail('unexpected final residual policy schema');
if (policy.frozen_input?.input_sha256 !== summary.input_file_sha256 || policy.frozen_input?.residual_unique_links !== 101 || policy.frozen_input?.relevant_residual_links !== 51 || policy.frozen_input?.file_links !== 16) fail('final residual frozen-input policy drift');
if (policy.transport?.maximum_attempts_per_route !== 1 || policy.transport?.maximum_parallel_workers !== 8 || JSON.stringify(policy.transport?.allowed_methods) !== JSON.stringify(['GET'])) fail('final residual policy transport drift');
if (policy.transport?.raw_response_retained !== false || policy.transport?.complete_remote_file_custody_claimed !== false) fail('final residual policy privacy/file drift');
if (policy.north_carolina?.automated_or_scripted_interactive_searches_not_permitted !== true || policy.north_carolina?.interactive_search_submissions !== 0) fail('North Carolina policy custody drift');
if (policy.florida?.check_a_charity_query_submissions !== 0 || policy.florida?.automation_permission_inferred !== false) fail('Florida policy custody drift');
if (!Object.values(policy.submissions || {}).every(value => value === 0)) fail('final residual policy submission drift');
if (policy.identity_admitted !== false || policy.negative_existence_claim_created !== false || policy.outside_human_dependency !== false || policy.publication_effect !== 'none' || policy.graph_effect !== 'none') fail('final residual policy authority drift');

if (inputLinks.length !== 51 || routeResults.length !== 51 || htmlSurfaces.length !== 35 || forms.length !== 0 || fileSamples.length !== 15) fail('final residual artifact row denominator drift');
if (!unique(inputLinks.map(row => row.route_id)) || !unique(inputLinks.map(row => row.url))) fail('final residual input route IDs and URLs must be unique');
if (!inputLinks.every(row => row.official_host === true && row.relevant === true && row.query_submission_required === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('final residual input authority drift');
if (inputLinks.filter(row => row.file_target === true).length !== 16) fail('final residual input file-target denominator drift');
if (!inputLinks.every(row => Array.isArray(row.source_receipt_ids) && row.source_receipt_ids.length > 0 && row.source_receipt_ids.every(id => priorReceiptIds.has(id)))) fail('final residual input lacks predecessor source receipt custody');
if (!inputLinks.every(row => row.url_metadata?.scheme === 'https' && row.url_metadata?.has_query === false && ['sosnc.gov', 'www.sosnc.gov'].includes(row.url_metadata?.host))) fail('final residual input URL boundary drift');

const inputByRoute = new Map(inputLinks.map(row => [row.route_id, row]));
if (!unique(routeResults.map(row => row.route_id))) fail('final residual route result IDs must be unique');
if (!routeResults.every(row => inputByRoute.has(row.route_id) && inputByRoute.get(row.route_id).url === row.url)) fail('final residual route result lacks exact frozen input');
if (!routeResults.every(row => row.all_attempts_terminal === true && row.request_attempts === 1 && row.request_method === 'GET' && row.final_host_allowed === true)) fail('final residual route request bound drift');
if (!routeResults.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.complete_remote_file_retained === false)) fail('final residual route source/privacy drift');
if (!routeResults.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('final residual route authority drift');
if (routeResults.filter(row => row.input_file_target === true).length !== 16) fail('final residual route file-target denominator drift');
if (routeResults.filter(row => row.terminal_state === 'http_success_html').length !== 34 || routeResults.filter(row => row.terminal_state === 'http_success_file_sample').length !== 15 || routeResults.filter(row => row.terminal_state === 'http_error').length !== 2) fail('final residual route terminal-state drift');
if (routeResults.filter(row => row.status === 200).length !== 34 || routeResults.filter(row => row.status === 206).length !== 15 || routeResults.filter(row => row.status === 404).length !== 1 || routeResults.filter(row => row.status === 500).length !== 1) fail('final residual route HTTP-status drift');
const errorRoutes = routeResults.filter(row => row.terminal_state === 'http_error');
if (!errorRoutes.some(row => row.status === 404 && row.input_file_target === true) || !errorRoutes.some(row => row.status === 500 && row.input_file_target === false)) fail('final residual expected transport failures missing');

if (!unique(htmlSurfaces.map(row => row.route_id))) fail('final residual HTML route IDs must be unique');
if (!htmlSurfaces.every(row => inputByRoute.has(row.route_id) && row.url === inputByRoute.get(row.route_id).url)) fail('final residual HTML surface lacks exact frozen input');
if (!htmlSurfaces.every(row => row.raw_html_retained === false && row.visible_text_retained === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('final residual HTML authority/privacy drift');
if (!unique(fileSamples.map(row => row.route_id))) fail('final residual file-sample route IDs must be unique');
if (!fileSamples.every(row => inputByRoute.has(row.route_id) && inputByRoute.get(row.route_id).file_target === true && row.url === inputByRoute.get(row.route_id).url)) fail('final residual file sample lacks exact frozen file target');
if (!fileSamples.every(row => row.status === 206 && row.range_requested === true && row.complete_remote_file_retained === false && row.full_file_sha256_claimed === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('final residual file-sample authority drift');
if (forms.length !== 0) fail('final residual unexpectedly retained a form row');

const receiptIdByRouteId = new Map(routeResults.map(row => [row.route_id, `r-${row.route_id}-${AS_OF}`]));
if (!unique([...receiptIdByRouteId.values()])) fail('final residual receipt IDs must be unique');
if ([...receiptIdByRouteId.values()].some(id => priorReceiptIds.has(id))) fail('final residual receipt ID collides with predecessor inventory');

const sourceStateFor = row => {
  if (row.terminal_state === 'http_success_file_sample') return 'captured_bounded_file_sample';
  if (row.terminal_state === 'http_success_html') return 'captured_html_surface';
  if (row.terminal_state === 'http_error') return 'source_unavailable_after_search';
  return `captured_terminal_route_${row.terminal_state}`;
};
const sourceNoteFor = row => {
  const base = `Official North Carolina static residual route; terminal state ${row.terminal_state}; HTTP ${row.status}; one GET attempt; no interactive query was submitted.`;
  if (row.terminal_state === 'http_success_file_sample') return `${base} The retained SHA-256 binds only the bounded public sample and is not a complete remote-file digest.`;
  if (row.terminal_state === 'http_error') return `${base} Provider response is transport custody and does not support an entity, filing, record, or absence claim.`;
  return base;
};
const sourceRows = routeResults.map(row => ({
  receipt_id: receiptIdByRouteId.get(row.route_id),
  route_id: row.route_id,
  evidence_class: 'official',
  locator_url: row.url,
  retrieved_at: row.completed_at,
  content_sha256: row.sample_sha256 || null,
  source_state: sourceStateFor(row),
  note: sourceNoteFor(row),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
if (sourceRows.length !== 51) fail('final residual source inventory addition must contain 51 rows');
writeJsonl(path.join(DIR, SOURCE_PART), sourceRows);

const permanentInputLinks = inputLinks.map(row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentRouteResults = routeResults.map(row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentHtmlSurfaces = htmlSurfaces.map(row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentForms = forms.map(row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentFileSamples = fileSamples.map(row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
writeJsonl(path.join(DIR, INPUT_LINKS_FILE), permanentInputLinks);
writeJsonl(path.join(DIR, ROUTE_RESULTS_FILE), permanentRouteResults);
writeJsonl(path.join(DIR, HTML_SURFACES_FILE), permanentHtmlSurfaces);
writeJsonl(path.join(DIR, FORMS_FILE), permanentForms);
writeJsonl(path.join(DIR, FILE_SAMPLES_FILE), permanentFileSamples);

const custody = {
  schema_version: 'schoolhouse-charity-nc-final-static-residual-custody@1',
  as_of: AS_OF,
  acquisition: {
    workflow_run_id: WORKFLOW_RUN_ID,
    artifact_id: ARTIFACT_ID,
    artifact_name: ARTIFACT_NAME,
    artifact_digest: ARTIFACT_DIGEST,
    acquisition_head: ACQUISITION_HEAD,
    started_at: summary.started_at,
    completed_at: summary.completed_at,
    artifact_manifest_sha256: sha256(path.join(ARTIFACT_DIR, 'artifact-manifest.json'))
  },
  frozen_input: {
    predecessor_file: summary.input_file,
    predecessor_sha256: summary.input_file_sha256,
    predecessor_discovered_link_rows: summary.input_discovered_link_rows,
    residual_unique_links: summary.residual_unique_links,
    relevant_residual_routes: summary.declared_residual_routes,
    file_targets: summary.input_file_links
  },
  bounds: {
    maximum_attempts_per_route: summary.maximum_attempts_per_route,
    maximum_parallel_workers: summary.maximum_workers,
    request_methods: summary.request_methods,
    maximum_file_sample_bytes: summary.maximum_file_sample_bytes,
    maximum_html_bytes: summary.maximum_html_bytes,
    result_spawned_requests: summary.result_spawned_requests,
    redirect_boundary: policy.transport.redirects
  },
  counts: {
    terminal_route_rows: routeResults.length,
    terminal_file_target_rows: routeResults.filter(row => row.input_file_target === true).length,
    html_success_routes: routeResults.filter(row => row.terminal_state === 'http_success_html').length,
    bounded_file_sample_routes: routeResults.filter(row => row.terminal_state === 'http_success_file_sample').length,
    http_error_routes: errorRoutes.length,
    html_surface_rows: htmlSurfaces.length,
    form_rows: forms.length,
    file_sample_rows: fileSamples.length,
    search_submissions: 0,
    organization_name_submissions: 0,
    license_number_submissions: 0,
    source_rows_acquired: 0,
    identities_admitted: 0
  },
  terminal_states: summary.terminal_state_counts,
  http_statuses: summary.http_status_counts,
  transport_failures: errorRoutes.map(row => ({
    route_id: row.route_id,
    url: row.url,
    status: row.status,
    error_class: row.error_class,
    state: 'terminal_transport_failure_not_absence_evidence'
  })),
  north_carolina: {
    automated_or_scripted_interactive_searches_not_permitted: policy.north_carolina.automated_or_scripted_interactive_searches_not_permitted,
    interactive_search_submissions: 0
  },
  florida: {
    check_a_charity_query_submissions: 0,
    automation_permission_inferred: false
  },
  terminal_frontier: {
    static_residual_route_denominator_terminal: true,
    relevant_residual_routes_terminal: 51,
    file_targets_terminal: 16,
    next_action: 'Preserve complete official-file and archive custody where lawful and technically available, and continue registry-grade legal-name, EIN, exemption, officer, governance, funding, fiscal-sponsor, related-party, and differently named or state-only entity evidence. Do not repeat the frozen static route denominator or submit a scripted interactive search.',
    stopping_rule: 'Stop only when each remaining legal-identity and governance surface has a registry-grade receipt, an explicit lawful source-unavailable state, or a strictly adjudicated rejection. Terminal static route custody is not legal-identity resolution.',
    outside_human_dependency: false
  },
  files: {
    source_inventory_part: SOURCE_PART,
    input_links: INPUT_LINKS_FILE,
    route_results: ROUTE_RESULTS_FILE,
    html_surfaces: HTML_SURFACES_FILE,
    surface_forms: FORMS_FILE,
    file_samples: FILE_SAMPLES_FILE
  },
  interpretation: {
    route_access_is_not_identity_evidence: true,
    terminal_static_route_denominator_is_not_identity_resolution: true,
    provider_failure_is_not_absence: true,
    bounded_file_sample_is_not_full_file_custody: true,
    form_mechanics_are_not_search_results: true,
    publisher_automation_policy_must_not_be_bypassed: true,
    forbidden_inference: policy.interpretation.forbidden_inference
  },
  privacy: {
    raw_source_retained: false,
    complete_remote_files_retained: false,
    hidden_form_values_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0
  },
  public_schoolhouse_identity_admitted: false,
  negative_existence_claim_created: false,
  outside_human_dependency: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, CUSTODY_FILE), custody);

schoolhouse.as_of = AS_OF;
schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_candidate_and_terminal_static_route_custody';
schoolhouse.state_registry_identity_census ||= {};
schoolhouse.state_registry_identity_census.charity_north_carolina_final_static_residual_custody = {
  as_of: AS_OF,
  workflow_run_id: WORKFLOW_RUN_ID,
  artifact_id: ARTIFACT_ID,
  artifact_digest: ARTIFACT_DIGEST,
  acquisition_head: ACQUISITION_HEAD,
  frozen_residual_unique_links: 101,
  declared_routes: 51,
  terminal_routes: 51,
  file_targets: 16,
  terminal_file_targets: 16,
  html_success_routes: 34,
  bounded_file_sample_routes: 15,
  http_error_routes: 2,
  html_surface_rows: 35,
  form_rows: 0,
  file_sample_rows: 15,
  search_submissions: 0,
  source_rows_acquired: 0,
  identity_state: 'unresolved_after_terminal_final_static_residual_no_public_identity_admitted',
  admitted_legal_name: null,
  admitted_ein: null,
  custody_file: CUSTODY_FILE,
  input_link_file: INPUT_LINKS_FILE,
  route_result_file: ROUTE_RESULTS_FILE,
  html_surface_file: HTML_SURFACES_FILE,
  form_file: FORMS_FILE,
  file_sample_file: FILE_SAMPLES_FILE,
  receipt_ids: sourceRows.map(row => row.receipt_id),
  boundary: 'The final no-submission static residual pass terminates the frozen fifty-one-route and sixteen-file-target denominator. It does not establish the public School.House legal identity, EIN, exemption, filing, fiscal sponsor, officers, governance, funding, control, or absence.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
schoolhouseTask.prior_charity_nc_final_static_residual_custody = {
  workflow_run_id: WORKFLOW_RUN_ID,
  artifact_id: ARTIFACT_ID,
  artifact_digest: ARTIFACT_DIGEST,
  acquisition_head: ACQUISITION_HEAD,
  frozen_residual_unique_links: 101,
  declared_routes: 51,
  terminal_routes: 51,
  file_targets: 16,
  terminal_file_targets: 16,
  html_success_routes: 34,
  bounded_file_sample_routes: 15,
  http_error_routes: 2,
  html_surface_rows: 35,
  form_rows: 0,
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  static_residual_route_denominator_terminal: true,
  state: 'terminal_final_static_residual_custody_no_identity_admitted',
  custody_file: CUSTODY_FILE
};
schoolhouseTask.next_transition = 'Do not repeat the frozen fifty-one-route static residual denominator and do not submit a scripted interactive search. Preserve complete official-file and archive custody where lawful and technically available, including the fifteen accessible PDF surfaces and explicit 404/500 transport dispositions; then continue registry-grade legal-name, EIN, exemption, officer, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence. Preserve the Magnolia shared-EIN conflict and admit no public School.House identity without identifier, time, place, organization class, and brand convergence.';
frontier.as_of = AS_OF;
writeJson(FRONTIER_PATH, frontier);

coverage.as_of = AS_OF;
coverage.denominators.push({
  surface: 'School.House North Carolina final static residual route custody',
  declared_total: 51,
  enumerated_total: 51,
  file_target_total: 16,
  terminal_file_target_total: 16,
  html_success_routes: 34,
  bounded_file_sample_routes: 15,
  http_error_routes: 2,
  html_surface_rows: 35,
  form_rows: 0,
  search_submissions: 0,
  coverage_state: 'terminal_final_no_submission_static_residual_route_custody'
});
const priorGapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => row.includes('School.House public identity remains unresolved after the second-level Florida-charity and North Carolina static-route pass'));
if (priorGapIndex === -1) fail('prior second-level coverage gap row missing');
coverage.explicit_nulls_and_gaps[priorGapIndex] = 'School.House public identity remains unresolved after the final no-submission North Carolina static residual pass placed all fifty-one frozen relevant routes and all sixteen frozen file targets into terminal custody. Thirty-four routes returned HTML, fifteen returned bounded PDF samples, one PDF returned HTTP 404, and one manual page returned HTTP 500; zero forms, searches, source rows, or identities were admitted. The static residual route denominator is complete, but complete remote-file and archive custody, legal name, EIN, exemption letter, officers, governance, funding, fiscal sponsor, related-party records, and differently named or state-only registrations remain open. Provider errors are not absence evidence.';
writeJson(COVERAGE_PATH, coverage);

readme = replaceExactOnce(readme, 'public-source receipts                        224', 'public-source receipts                        275', 'README source receipt count');
readme = insertAfterOnce(
  readme,
  'charity/NC second-level public identities admitted            0',
  '\ncharity/NC final static residual routes                 51 / 51\ncharity/NC final static residual file targets            16 / 16\ncharity/NC final static residual HTML successes               34\ncharity/NC final static residual bounded PDF samples          15\ncharity/NC final static residual HTTP error routes              2\ncharity/NC final static residual HTML surface rows             35\ncharity/NC final static residual form rows                       0\ncharity/NC final static residual searches                        0\ncharity/NC final static residual source rows acquired            0\ncharity/NC final static residual public identities admitted      0',
  'README final residual count block'
);
readme = replaceExactOnce(
  readme,
  '`source-inventory-01.jsonl` through `source-inventory-10.jsonl`',
  '`source-inventory-01.jsonl` through `source-inventory-11.jsonl`',
  'README source inventory range'
);
const priorFileBullet = '- `schoolhouse-charity-nc-second-level-route-custody.json` and the five `schoolhouse-charity-nc-second-level-*.jsonl` route, link, surface, and form files preserve eight second-level roots, eighty bounded official follow-ups, 524 discovered-link observations, sixty-eight bounded file samples, nineteen HTML surfaces, three privacy-minimized form rows, the fifty-one-link and sixteen-file residual, zero interactive searches, and the controlling North Carolina publisher policy.';
readme = insertAfterOnce(
  readme,
  priorFileBullet,
  '\n- `schoolhouse-charity-nc-final-static-residual-custody.json` and the five `schoolhouse-charity-nc-final-static-residual-*.jsonl` input, route, HTML, form, and file-sample files preserve terminal custody for all fifty-one frozen relevant routes and all sixteen file targets: thirty-four HTML successes, fifteen bounded PDF samples, one PDF 404, one manual-page 500, zero forms, zero searches, and zero identity admissions.',
  'README final residual file bullet'
);
readme = replaceExactOnce(
  readme,
  'That frozen residual, rather than an absence claim, is the next bounded static acquisition surface.',
  'That frozen residual, rather than an absence claim, became the next bounded static acquisition surface. The final no-submission pass then placed all fifty-one frozen relevant routes and all sixteen file targets into terminal custody: thirty-four HTML successes, fifteen bounded PDF samples, one PDF 404, and one manual-page 500, with zero forms, searches, source rows, or identity admissions. This terminates the frozen static residual route denominator but does not resolve the public School.House legal identity; complete official-file and archive custody plus registry-grade legal-name, EIN, exemption, officer, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence remain open.',
  'README final residual continuation paragraph'
);
fs.writeFileSync(README_PATH, readme);

manifest.as_of = AS_OF;
for (const boundary of [
  'Terminal custody for the frozen static residual route denominator does not resolve the School.House legal identity.',
  'An HTTP 404 or 500 on an official route is transport custody and not evidence of record, filing, or entity absence.'
]) {
  if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
}
manifest.counts.source_inventory_rows = 275;
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.schoolhouse_charity_nc_final_static_residual_input_rows = 51;
manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_route_rows = 51;
manifest.counts.schoolhouse_charity_nc_final_static_residual_file_target_rows = 16;
manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_file_target_rows = 16;
manifest.counts.schoolhouse_charity_nc_final_static_residual_html_success_routes = 34;
manifest.counts.schoolhouse_charity_nc_final_static_residual_bounded_file_sample_routes = 15;
manifest.counts.schoolhouse_charity_nc_final_static_residual_http_error_routes = 2;
manifest.counts.schoolhouse_charity_nc_final_static_residual_html_surface_rows = 35;
manifest.counts.schoolhouse_charity_nc_final_static_residual_form_rows = 0;
manifest.counts.schoolhouse_charity_nc_final_static_residual_file_sample_rows = 15;
manifest.counts.schoolhouse_charity_nc_final_static_residual_search_submissions = 0;
manifest.counts.schoolhouse_charity_nc_final_static_residual_source_rows_acquired = 0;
manifest.counts.schoolhouse_charity_nc_final_static_residual_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_charity_nc_final_static_residual_custody = '51_of_51_terminal_16_of_16_file_targets_34_html_15_bounded_pdf_samples_1_http_404_1_http_500_zero_forms_zero_search_submissions';
manifest.custody.next_waterline = 'charity_nc_complete_official_file_and_archive_custody_plus_registry_grade_legal_governance_evidence';
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, exact Florida fictitious-name and corporate resolution, Magnolia shared-EIN conflict custody, Florida-charity and North Carolina first-level, second-level, and final static residual route custody, coverage nulls, and deterministic continuation work.';
manifest.storage_contract ||= {};
manifest.storage_contract.source_inventory_parts ||= [];
if (!manifest.storage_contract.source_inventory_parts.includes(SOURCE_PART)) manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_custody = CUSTODY_FILE;
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_input_links = INPUT_LINKS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_route_results = ROUTE_RESULTS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_html_surfaces = HTML_SURFACES_FILE;
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_surface_forms = FORMS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_final_static_residual_file_samples = FILE_SAMPLES_FILE;

const allSourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(filename => readJsonl(path.join(DIR, filename)));
if (allSourceInventory.length !== 275) fail(`source inventory denominator after final residual custody is ${allSourceInventory.length}, expected 275`);
if (!unique(allSourceInventory.map(row => row.receipt_id))) fail('source inventory receipt IDs must remain unique');
manifest.source_inventory ||= {};
manifest.source_inventory.evidence_class_counts = countBy(allSourceInventory, 'evidence_class');
manifest.source_inventory.source_state_counts = countBy(allSourceInventory, 'source_state');

for (const filename of [
  SOURCE_PART,
  CUSTODY_FILE,
  INPUT_LINKS_FILE,
  ROUTE_RESULTS_FILE,
  HTML_SURFACES_FILE,
  FORMS_FILE,
  FILE_SAMPLES_FILE
]) {
  manifest.files[filename] = { bytes: 0, sha256: '' };
}
for (const filename of Object.keys(manifest.files)) {
  const file = path.join(DIR, filename);
  if (!fs.existsSync(file)) fail(`manifest-bound file missing before rehash: ${filename}`);
  manifest.files[filename] = fileRecord(file);
}
writeJson(MANIFEST_PATH, manifest);

validator = replaceExactOnce(
  validator,
  "    check(manifest.counts.source_inventory_rows === 224, 'second-level source-inventory denominator drift');",
  "    check(manifest.counts.source_inventory_rows === 275, 'second-level source-inventory denominator drift');",
  'second-level validator source-inventory successor denominator'
);
validator = replaceExactOnce(
  validator,
  "    check(manifest.counts.coverage_denominator_rows === 20, 'second-level coverage-denominator count drift');",
  "    check(manifest.counts.coverage_denominator_rows === 21, 'second-level coverage-denominator count drift');",
  'second-level validator coverage successor denominator'
);

const validationBlock = String.raw`

  {
    const finalResidualCustody = readJson(path.join(dir, '${CUSTODY_FILE}'));
    const finalResidualInputs = readJsonl(path.join(dir, '${INPUT_LINKS_FILE}'));
    const finalResidualRoutes = readJsonl(path.join(dir, '${ROUTE_RESULTS_FILE}'));
    const finalResidualHtml = readJsonl(path.join(dir, '${HTML_SURFACES_FILE}'));
    const finalResidualForms = readJsonl(path.join(dir, '${FORMS_FILE}'));
    const finalResidualFiles = readJsonl(path.join(dir, '${FILE_SAMPLES_FILE}'));

    check(manifest.counts.source_inventory_rows === 275, 'final residual source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 21, 'final residual coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'final residual explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_input_rows === finalResidualInputs.length && finalResidualInputs.length === 51, 'final residual input denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_route_rows === finalResidualRoutes.length && finalResidualRoutes.length === 51, 'final residual route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_file_target_rows === finalResidualInputs.filter(row => row.file_target === true).length && manifest.counts.schoolhouse_charity_nc_final_static_residual_file_target_rows === 16, 'final residual input file-target denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_file_target_rows === finalResidualRoutes.filter(row => row.input_file_target === true).length && manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_file_target_rows === 16, 'final residual terminal file-target denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_html_success_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_success_html').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_html_success_routes === 34, 'final residual HTML-success denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_bounded_file_sample_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_success_file_sample').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_bounded_file_sample_routes === 15, 'final residual file-sample-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_http_error_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_error').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_http_error_routes === 2, 'final residual HTTP-error denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_html_surface_rows === finalResidualHtml.length && finalResidualHtml.length === 35, 'final residual HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_form_rows === finalResidualForms.length && finalResidualForms.length === 0, 'final residual form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_file_sample_rows === finalResidualFiles.length && finalResidualFiles.length === 15, 'final residual file-sample denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_final_static_residual_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_final_static_residual_admitted_identity_rows === 0, 'final residual authority-count drift');

    check(unique(finalResidualInputs.map(row => row.route_id)) && unique(finalResidualInputs.map(row => row.url)), 'final residual input IDs and URLs must be unique');
    check(finalResidualInputs.every(row => knownReceiptIds.has(row.receipt_id) && row.source_receipt_ids.every(id => knownReceiptIds.has(id))), 'final residual input receipt custody drift');
    check(finalResidualInputs.every(row => row.official_host === true && row.relevant === true && row.query_submission_required === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'final residual input authority drift');
    check(unique(finalResidualRoutes.map(row => row.route_id)) && unique(finalResidualRoutes.map(row => row.receipt_id)), 'final residual route IDs and receipts must be unique');
    const finalResidualInputById = new Map(finalResidualInputs.map(row => [row.route_id, row]));
    check(finalResidualRoutes.every(row => finalResidualInputById.has(row.route_id) && finalResidualInputById.get(row.route_id).url === row.url && knownReceiptIds.has(row.receipt_id)), 'final residual route input/receipt drift');
    check(finalResidualRoutes.every(row => row.all_attempts_terminal === true && row.request_attempts === 1 && row.request_method === 'GET' && row.final_host_allowed === true), 'final residual route request-bound drift');
    check(finalResidualRoutes.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.complete_remote_file_retained === false), 'final residual route source/privacy drift');
    check(finalResidualRoutes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'final residual route authority drift');
    check(finalResidualRoutes.filter(row => row.status === 200).length === 34 && finalResidualRoutes.filter(row => row.status === 206).length === 15 && finalResidualRoutes.filter(row => row.status === 404).length === 1 && finalResidualRoutes.filter(row => row.status === 500).length === 1, 'final residual HTTP-status denominator drift');
    check(finalResidualRoutes.some(row => row.status === 404 && row.input_file_target === true && row.terminal_state === 'http_error'), 'final residual PDF 404 custody missing');
    check(finalResidualRoutes.some(row => row.status === 500 && row.input_file_target === false && row.terminal_state === 'http_error'), 'final residual manual-page 500 custody missing');

    check(unique(finalResidualHtml.map(row => row.route_id)), 'final residual HTML route IDs must be unique');
    check(finalResidualHtml.every(row => finalResidualInputById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.raw_html_retained === false && row.visible_text_retained === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'final residual HTML custody drift');
    check(finalResidualForms.length === 0, 'final residual form rows must remain zero');
    check(unique(finalResidualFiles.map(row => row.route_id)), 'final residual file route IDs must be unique');
    check(finalResidualFiles.every(row => finalResidualInputById.get(row.route_id)?.file_target === true && knownReceiptIds.has(row.receipt_id) && row.status === 206 && row.range_requested === true && row.complete_remote_file_retained === false && row.full_file_sha256_claimed === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'final residual file-sample custody drift');

    check(finalResidualCustody.acquisition.workflow_run_id === ${WORKFLOW_RUN_ID} && finalResidualCustody.acquisition.artifact_id === ${ARTIFACT_ID} && finalResidualCustody.acquisition.artifact_digest === '${ARTIFACT_DIGEST}' && finalResidualCustody.acquisition.acquisition_head === '${ACQUISITION_HEAD}', 'final residual acquisition custody drift');
    check(finalResidualCustody.frozen_input.predecessor_sha256 === 'a25d2a537eda86f202ea438a53d6fd9369695a151163e2b67af304787fb25a52' && finalResidualCustody.frozen_input.residual_unique_links === 101 && finalResidualCustody.frozen_input.relevant_residual_routes === 51 && finalResidualCustody.frozen_input.file_targets === 16, 'final residual frozen input drift');
    check(finalResidualCustody.bounds.maximum_attempts_per_route === 1 && finalResidualCustody.bounds.maximum_parallel_workers === 8 && JSON.stringify(finalResidualCustody.bounds.request_methods) === JSON.stringify(['GET']) && finalResidualCustody.bounds.result_spawned_requests === 0, 'final residual bound custody drift');
    check(finalResidualCustody.counts.terminal_route_rows === 51 && finalResidualCustody.counts.terminal_file_target_rows === 16 && finalResidualCustody.counts.html_success_routes === 34 && finalResidualCustody.counts.bounded_file_sample_routes === 15 && finalResidualCustody.counts.http_error_routes === 2 && finalResidualCustody.counts.html_surface_rows === 35 && finalResidualCustody.counts.form_rows === 0 && finalResidualCustody.counts.file_sample_rows === 15, 'final residual custody denominator drift');
    check(finalResidualCustody.terminal_frontier.static_residual_route_denominator_terminal === true && finalResidualCustody.terminal_frontier.relevant_residual_routes_terminal === 51 && finalResidualCustody.terminal_frontier.file_targets_terminal === 16 && finalResidualCustody.terminal_frontier.outside_human_dependency === false, 'final residual terminal-frontier drift');
    check(finalResidualCustody.north_carolina.automated_or_scripted_interactive_searches_not_permitted === true && finalResidualCustody.north_carolina.interactive_search_submissions === 0, 'final residual North Carolina policy drift');
    check(finalResidualCustody.privacy.raw_source_retained === false && finalResidualCustody.privacy.complete_remote_files_retained === false && finalResidualCustody.privacy.hidden_form_values_retained === false && finalResidualCustody.privacy.street_address_rows_retained === 0 && finalResidualCustody.privacy.contact_detail_rows_retained === 0 && finalResidualCustody.privacy.private_support_rows === 0, 'final residual custody privacy drift');
    check(finalResidualCustody.public_schoolhouse_identity_admitted === false && finalResidualCustody.negative_existence_claim_created === false && finalResidualCustody.outside_human_dependency === false && finalResidualCustody.publication_effect === 'none' && finalResidualCustody.adoption_effect === 'none' && finalResidualCustody.graph_effect === 'none' && finalResidualCustody.promotes_to === 'candidate_only', 'final residual custody authority drift');

    const finalResidualProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_final_static_residual_custody;
    check(finalResidualProjection?.terminal_routes === 51 && finalResidualProjection?.terminal_file_targets === 16 && finalResidualProjection?.bounded_file_sample_routes === 15 && finalResidualProjection?.http_error_routes === 2 && finalResidualProjection?.html_surface_rows === 35 && finalResidualProjection?.form_rows === 0, 'School.House final residual projection drift');
    check(finalResidualProjection?.identity_state === 'unresolved_after_terminal_final_static_residual_no_public_identity_admitted' && finalResidualProjection?.admitted_legal_name === null && finalResidualProjection?.admitted_ein === null, 'School.House final residual identity authority drift');
    const finalResidualFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_final_static_residual_custody;
    check(finalResidualFrontier?.terminal_routes === 51 && finalResidualFrontier?.terminal_file_targets === 16 && finalResidualFrontier?.bounded_file_sample_routes === 15 && finalResidualFrontier?.http_error_routes === 2 && finalResidualFrontier?.admitted_identities === 0 && finalResidualFrontier?.static_residual_route_denominator_terminal === true, 'School.House final residual frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House North Carolina final static residual route custody' && row.enumerated_total === 51 && row.terminal_file_target_total === 16 && row.bounded_file_sample_routes === 15 && row.http_error_routes === 2 && row.search_submissions === 0), 'final residual coverage denominator missing');
  }
`;
const returnAnchor = '\n  return errors;\n}';
const returnIndex = validator.lastIndexOf(returnAnchor);
if (returnIndex === -1) fail('validator return anchor missing');
if (validator.includes('schoolhouse-charity-nc-final-static-residual-custody@1')) fail('final residual validator block already exists');
validator = validator.slice(0, returnIndex) + validationBlock + validator.slice(returnIndex);
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  schema_version: 'schoolhouse-charity-nc-final-static-residual-custody-build@1',
  source_inventory_rows: manifest.counts.source_inventory_rows,
  input_routes: inputLinks.length,
  terminal_routes: routeResults.length,
  file_targets: inputLinks.filter(row => row.file_target === true).length,
  terminal_file_targets: routeResults.filter(row => row.input_file_target === true).length,
  html_success_routes: routeResults.filter(row => row.terminal_state === 'http_success_html').length,
  bounded_file_sample_routes: routeResults.filter(row => row.terminal_state === 'http_success_file_sample').length,
  http_error_routes: errorRoutes.length,
  html_surfaces: htmlSurfaces.length,
  forms: forms.length,
  file_samples: fileSamples.length,
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  outside_human_dependency: false,
  graph_effect: 'none'
}, null, 2));
