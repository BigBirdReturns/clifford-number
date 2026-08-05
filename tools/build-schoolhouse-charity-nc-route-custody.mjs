import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) {
  throw new Error('usage: node tools/build-schoolhouse-charity-nc-route-custody.mjs <artifact-dir>');
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const SOURCE_PART = 'source-inventory-09.jsonl';
const CUSTODY_FILE = 'schoolhouse-charity-nc-route-custody.json';
const ROOT_RESULTS_FILE = 'schoolhouse-charity-nc-root-route-results.jsonl';
const FOLLOWED_RESULTS_FILE = 'schoolhouse-charity-nc-followed-route-results.jsonl';
const DISCOVERED_LINKS_FILE = 'schoolhouse-charity-nc-discovered-links.jsonl';
const HTML_SURFACES_FILE = 'schoolhouse-charity-nc-html-surfaces.jsonl';
const FORMS_FILE = 'schoolhouse-charity-nc-surface-forms.jsonl';

const WORKFLOW_RUN_ID = 30980115912;
const ARTIFACT_ID = 8919817084;
const ARTIFACT_DIGEST = 'sha256:87bb2327fea644c185e2b2bb8bdf542a95e12d14da524ac20157f190c0512068';
const ACQUISITION_HEAD = '9d1d35d181a33b12c3ed578b7969dcf69e581112';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  });
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };
const countBy = (rows, key) => Object.fromEntries(
  [...rows.reduce((counts, row) => counts.set(row[key], (counts.get(row[key]) || 0) + 1), new Map()).entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
);
const replaceExact = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected one replacement anchor, found ${count}`);
  return source.replace(before, after);
};
const ensureUnique = (values, label) => {
  if (new Set(values).size !== values.length) fail(`${label} must be unique`);
};
const slug = value => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 120);

const manifest = readJson(MANIFEST_PATH);
const schoolhouse = readJson(SCHOOLHOUSE_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected BVVC manifest schema');
if (manifest.counts.source_inventory_rows !== 104) fail(`expected 104 source receipts before route custody, got ${manifest.counts.source_inventory_rows}`);
if (manifest.counts.fl_magnolia_documents_resolved !== 2) fail('Magnolia predecessor custody is missing');
if (schoolhouse.state_registry_identity_census?.florida_magnolia_corporate_resolution?.resolved_documents !== 2) {
  fail('School.House Magnolia predecessor projection is missing');
}

for (const filename of [
  SOURCE_PART,
  CUSTODY_FILE,
  ROOT_RESULTS_FILE,
  FOLLOWED_RESULTS_FILE,
  DISCOVERED_LINKS_FILE,
  HTML_SURFACES_FILE,
  FORMS_FILE
]) {
  if (fs.existsSync(path.join(DIR, filename))) fail(`permanent path already exists: ${filename}`);
}

const summary = readJson(path.join(ARTIFACT_DIR, 'summary.json'));
const policy = readJson(path.join(ARTIFACT_DIR, 'route-policy.json'));
const artifactManifest = readJson(path.join(ARTIFACT_DIR, 'artifact-manifest.json'));
const roots = readJsonl(path.join(ARTIFACT_DIR, 'root-route-receipts.jsonl'));
const followed = readJsonl(path.join(ARTIFACT_DIR, 'followed-route-receipts.jsonl'));
const discovered = readJsonl(path.join(ARTIFACT_DIR, 'discovered-links.jsonl'));
const htmlSurfaces = readJsonl(path.join(ARTIFACT_DIR, 'html-surfaces.jsonl'));
const forms = readJsonl(path.join(ARTIFACT_DIR, 'surface-forms.jsonl'));

const expectedArtifactFiles = new Map(artifactManifest.files.map(row => [row.path, row]));
for (const [filename, expected] of expectedArtifactFiles) {
  const file = path.join(ARTIFACT_DIR, filename);
  if (!fs.existsSync(file)) fail(`artifact file missing: ${filename}`);
  if (fs.statSync(file).size !== expected.bytes) fail(`artifact byte-count drift: ${filename}`);
  if (sha256(file) !== expected.sha256) fail(`artifact SHA-256 drift: ${filename}`);
}
if (artifactManifest.file_count !== 7 || expectedArtifactFiles.size !== 7) fail('artifact manifest denominator drift');
if (artifactManifest.search_submissions !== 0 || artifactManifest.source_rows_acquired !== 0) fail('artifact authority drift');
if (artifactManifest.raw_source_retained !== false || artifactManifest.hidden_form_values_retained !== false) fail('artifact privacy drift');
if (artifactManifest.identity_admitted !== false || artifactManifest.outside_human_dependency !== false || artifactManifest.graph_effect !== 'none') {
  fail('artifact graph or identity authority drift');
}

const expectedSummary = {
  declared_root_routes: 8,
  root_route_receipts: 8,
  discovered_link_rows: 65,
  unique_discovered_links: 55,
  followed_routes: 24,
  direct_file_sample_routes: 15,
  html_surface_rows: 12,
  form_rows: 8,
  search_submissions: 0,
  source_rows_acquired: 0,
  street_address_rows_retained: 0,
  contact_detail_rows_retained: 0,
  private_support_rows: 0
};
for (const [key, expected] of Object.entries(expectedSummary)) {
  if (summary[key] !== expected) fail(`route-discovery summary drift for ${key}: expected ${expected}, got ${summary[key]}`);
}
if (summary.all_route_receipts_terminal !== true) fail('route receipts are not terminal');
if (summary.raw_source_retained !== false || summary.hidden_form_values_retained !== false) fail('route summary privacy drift');
if (summary.identity_admitted !== false || summary.outside_human_dependency !== false || summary.graph_effect !== 'none') fail('route summary authority drift');
const expectedStateCounts = {
  accessible_file_sample: 11,
  accessible_html: 12,
  accessible_non_html: 3,
  provider_blocked: 1,
  timeout: 5
};
if (JSON.stringify(summary.state_counts) !== JSON.stringify(expectedStateCounts)) fail('terminal state-count drift');
if (summary.fl_check_a_charity_state !== 'timeout' || summary.fl_check_a_charity_form_count !== 0 || summary.fl_check_a_charity_named_control_count !== 0 || summary.fl_check_a_charity_post_form_count !== 0) {
  fail('Florida Check-A-Charity disposition drift');
}
if (summary.nc_automated_search_prohibition_captured !== true || summary.nc_bulk_subscription_direction_captured !== true) {
  fail('North Carolina policy capture drift');
}

if (roots.length !== 8 || followed.length !== 24 || discovered.length !== 65 || htmlSurfaces.length !== 12 || forms.length !== 8) {
  fail('artifact row denominator drift');
}
ensureUnique(roots.map(row => row.route_id), 'root route IDs');
ensureUnique(followed.map(row => row.route_id), 'followed route IDs');
ensureUnique([...roots, ...followed].map(row => row.route_id), 'all route IDs');
ensureUnique(htmlSurfaces.map(row => row.route_id), 'HTML surface route IDs');

const terminalStates = new Set(['accessible_html', 'accessible_file_sample', 'accessible_non_html', 'provider_blocked', 'timeout']);
for (const row of [...roots, ...followed]) {
  if (!terminalStates.has(row.state)) fail(`nonterminal route state: ${row.route_id} ${row.state}`);
  if (row.query_submitted !== false || row.source_rows_acquired !== 0 || row.raw_source_retained !== false) fail(`route authority drift: ${row.route_id}`);
  if (row.hidden_form_values_retained !== false || row.street_address_rows_retained !== 0 || row.contact_detail_rows_retained !== 0 || row.private_support_rows !== 0) fail(`route privacy drift: ${row.route_id}`);
  if (row.identity_admitted !== false || row.outside_human_dependency !== false || row.graph_effect !== 'none' || row.promotes_to !== 'candidate_only') fail(`route graph authority drift: ${row.route_id}`);
  if (!/^https:\/\//.test(row.requested_url)) fail(`route must retain a public HTTPS locator: ${row.route_id}`);
}
for (const row of discovered) {
  if (row.official_host !== true || row.relevant !== true || row.query_submission_required !== false) fail(`discovered-link boundary drift: ${row.href}`);
  if (row.graph_effect !== 'none' || row.promotes_to !== 'candidate_only') fail(`discovered link graph drift: ${row.href}`);
}
for (const row of htmlSurfaces) {
  if (row.raw_body_retained !== false || row.query_submitted !== false || row.graph_effect !== 'none' || row.promotes_to !== 'candidate_only') {
    fail(`HTML surface boundary drift: ${row.route_id}`);
  }
}
for (const row of forms) {
  if (row.hidden_values_retained !== false || row.query_submitted !== false || row.graph_effect !== 'none' || row.promotes_to !== 'candidate_only') {
    fail(`form boundary drift: ${row.route_id}:${row.form_index}`);
  }
  for (const control of row.controls || []) {
    if (Object.hasOwn(control, 'value')) fail(`raw form value retained: ${row.route_id}:${row.form_index}`);
    if (control.type === 'hidden' && control.hidden_value_receipt && (!control.hidden_value_receipt.sha256 || !Number.isInteger(control.hidden_value_receipt.bytes))) {
      fail(`invalid hidden-value receipt: ${row.route_id}:${row.form_index}`);
    }
  }
}
if (policy.search_submissions !== 0 || policy.source_rows_acquired !== 0 || policy.outside_human_dependency !== false || policy.graph_effect !== 'none') fail('route policy authority drift');
if (policy.florida.search_submissions !== 0 || policy.florida.automation_permission_inferred !== false || policy.florida.hidden_form_values_retained !== false || policy.florida.check_a_charity_route_state !== 'timeout') fail('Florida route-policy drift');
if (policy.north_carolina.search_submissions !== 0 || policy.north_carolina.automated_or_scripted_searches_not_permitted !== true || policy.north_carolina.bulk_data_subscription_direction_captured !== true) fail('North Carolina route-policy drift');

const receiptIdByRoute = new Map();
for (const row of [...roots, ...followed]) {
  receiptIdByRoute.set(row.route_id, `r-schoolhouse-charity-nc-route-${slug(row.route_id)}-2026-08-05`);
}
ensureUnique([...receiptIdByRoute.values()], 'route receipt IDs');

const sourceState = row => {
  if (row.state === 'provider_blocked') return 'provider_blocked_no_query';
  if (row.state === 'timeout') return 'source_unavailable_after_search';
  return 'captured_route_surface';
};
const routeNote = row => {
  const base = `Official ${row.jurisdiction} ${String(row.surface).replaceAll('_', ' ')} route; terminal state ${row.state}; no interactive query was submitted.`;
  if (row.state === 'accessible_file_sample') return `${base} The retained SHA-256 binds only the bounded public file sample acquired by the route-discovery runner, not the complete remote file.`;
  if (row.state === 'timeout') return `${base} Timeout is transport custody and does not support an entity or filing absence claim.`;
  if (row.state === 'provider_blocked') return `${base} Provider blocking is route custody and does not support an entity or filing absence claim.`;
  return base;
};
const sourceRows = [...roots, ...followed].map(row => ({
  receipt_id: receiptIdByRoute.get(row.route_id),
  route_id: row.route_id,
  evidence_class: 'official',
  locator_url: row.requested_url,
  retrieved_at: row.probed_at,
  content_sha256: row.body_sha256 || null,
  source_state: sourceState(row),
  note: routeNote(row),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
writeJsonl(path.join(DIR, SOURCE_PART), sourceRows);

const permanentRoute = row => ({
  ...row,
  receipt_id: receiptIdByRoute.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
});
const permanentRoots = roots.map(permanentRoute);
const permanentFollowed = followed.map(permanentRoute);
const permanentDiscovered = discovered.map(row => ({
  ...row,
  source_receipt_id: receiptIdByRoute.get(row.source_route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentSurfaces = htmlSurfaces.map(row => ({
  ...row,
  receipt_id: receiptIdByRoute.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentForms = forms.map(row => ({
  ...row,
  receipt_id: receiptIdByRoute.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
if (permanentDiscovered.some(row => !row.source_receipt_id)) fail('a discovered link has no source receipt');
if (permanentSurfaces.some(row => !row.receipt_id) || permanentForms.some(row => !row.receipt_id)) fail('a surface or form has no route receipt');
writeJsonl(path.join(DIR, ROOT_RESULTS_FILE), permanentRoots);
writeJsonl(path.join(DIR, FOLLOWED_RESULTS_FILE), permanentFollowed);
writeJsonl(path.join(DIR, DISCOVERED_LINKS_FILE), permanentDiscovered);
writeJsonl(path.join(DIR, HTML_SURFACES_FILE), permanentSurfaces);
writeJsonl(path.join(DIR, FORMS_FILE), permanentForms);

const custody = {
  schema_version: 'schoolhouse-charity-nc-route-custody@1',
  as_of: '2026-08-05',
  acquisition: {
    workflow_run_id: WORKFLOW_RUN_ID,
    artifact_id: ARTIFACT_ID,
    artifact_name: 'schoolhouse-charity-nc-route-discovery',
    artifact_digest: ARTIFACT_DIGEST,
    acquisition_head: ACQUISITION_HEAD,
    started_at: summary.started_at,
    completed_at: summary.completed_at,
    artifact_manifest_sha256: sha256(path.join(ARTIFACT_DIR, 'artifact-manifest.json'))
  },
  counts: {
    declared_root_routes: roots.length,
    terminal_root_routes: roots.length,
    followed_routes: followed.length,
    terminal_followed_routes: followed.length,
    terminal_route_rows: roots.length + followed.length,
    discovered_link_rows: discovered.length,
    unique_discovered_links: new Set(discovered.map(row => row.href)).size,
    html_surface_rows: htmlSurfaces.length,
    form_rows: forms.length,
    accessible_file_sample_routes: [...roots, ...followed].filter(row => row.state === 'accessible_file_sample').length,
    accessible_html_routes: [...roots, ...followed].filter(row => row.state === 'accessible_html').length,
    accessible_non_html_routes: [...roots, ...followed].filter(row => row.state === 'accessible_non_html').length,
    provider_blocked_routes: [...roots, ...followed].filter(row => row.state === 'provider_blocked').length,
    timeout_routes: [...roots, ...followed].filter(row => row.state === 'timeout').length,
    search_submissions: 0,
    source_rows_acquired: 0,
    identities_admitted: 0
  },
  florida: {
    root_routes: roots.filter(row => row.jurisdiction === 'Florida').length,
    followed_routes: followed.filter(row => row.jurisdiction === 'Florida').length,
    check_a_charity_state: summary.fl_check_a_charity_state,
    check_a_charity_forms: summary.fl_check_a_charity_form_count,
    search_submissions: 0,
    automation_permission_inferred: false,
    boundary: policy.florida.boundary
  },
  north_carolina: {
    root_routes: roots.filter(row => row.jurisdiction === 'North Carolina').length,
    followed_routes: followed.filter(row => row.jurisdiction === 'North Carolina').length,
    automated_or_scripted_searches_not_permitted: true,
    bulk_data_subscription_direction_captured: true,
    interactive_real_time_instruction_captured: true,
    search_submissions: 0,
    allowed_next_surfaces: policy.north_carolina.allowed_next_surfaces,
    forbidden_next_surface: policy.north_carolina.forbidden_next_surface
  },
  files: {
    source_inventory_part: SOURCE_PART,
    root_route_results: ROOT_RESULTS_FILE,
    followed_route_results: FOLLOWED_RESULTS_FILE,
    discovered_links: DISCOVERED_LINKS_FILE,
    html_surfaces: HTML_SURFACES_FILE,
    surface_forms: FORMS_FILE
  },
  interpretation: {
    route_access_is_not_identity_evidence: true,
    form_mechanics_are_not_search_results: true,
    provider_failure_is_not_absence: true,
    bounded_file_sample_is_not_full_file_custody: true,
    publisher_automation_policy_must_not_be_bypassed: true,
    forbidden_inference: 'An official route, report, form, file sample, or data-subscription surface does not establish the public School.House legal entity, EIN, exemption, fiscal sponsor, ownership, governance, funding, or control.'
  },
  next_transition: {
    action: 'Run one targeted no-submission second-level pass over the official North Carolina nonprofits-by-county, unincorporated-nonprofit, data-subscription, data-dictionary, annual-report, and distinct downloadable report surfaces, plus a focused retry of Florida Check-A-Charity mechanics. Preserve publisher policy and submit no interactive organization-name search.',
    stopping_rule: 'Stop when each selected official second-level route has one terminal disposition and every downloadable report or dictionary is either captured under a bounded public transport or recorded as unavailable. Do not submit an interactive search.',
    outside_human_dependency: false
  },
  privacy: {
    raw_source_retained: false,
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

schoolhouse.as_of = '2026-08-05';
schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_candidate_and_lawful_route_custody';
schoolhouse.state_registry_identity_census ||= {};
if (schoolhouse.state_registry_identity_census.charity_north_carolina_route_discovery) {
  fail('School.House charity/North Carolina route projection already exists');
}
schoolhouse.state_registry_identity_census.charity_north_carolina_route_discovery = {
  as_of: '2026-08-05',
  declared_root_routes: 8,
  terminal_root_routes: 8,
  followed_routes: 24,
  terminal_route_rows: 32,
  discovered_link_rows: 65,
  unique_discovered_links: 55,
  html_surface_rows: 12,
  form_rows: 8,
  florida_check_a_charity_state: 'timeout',
  florida_charity_search_submissions: 0,
  north_carolina_scripted_search_submissions: 0,
  north_carolina_automation_prohibition_captured: true,
  north_carolina_bulk_subscription_direction_captured: true,
  source_rows_acquired: 0,
  identity_state: 'unresolved_after_lawful_route_discovery_no_public_identity_admitted',
  admitted_legal_name: null,
  admitted_ein: null,
  custody_file: CUSTODY_FILE,
  root_route_file: ROOT_RESULTS_FILE,
  followed_route_file: FOLLOWED_RESULTS_FILE,
  discovered_link_file: DISCOVERED_LINKS_FILE,
  html_surface_file: HTML_SURFACES_FILE,
  form_file: FORMS_FILE,
  receipt_ids: sourceRows.map(row => row.receipt_id),
  boundary: 'The route pass establishes lawful official continuation surfaces and publisher policy only. It submits no organization-name search and creates no public School.House identity, filing, exemption, fiscal-sponsor, ownership, governance, funding, or control finding.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
frontier.as_of = '2026-08-05';
schoolhouseTask.prior_charity_nc_route_discovery = {
  workflow_run_id: WORKFLOW_RUN_ID,
  artifact_id: ARTIFACT_ID,
  artifact_digest: ARTIFACT_DIGEST,
  declared_root_routes: 8,
  terminal_root_routes: 8,
  followed_routes: 24,
  terminal_route_rows: 32,
  discovered_link_rows: 65,
  unique_discovered_links: 55,
  html_surface_rows: 12,
  form_rows: 8,
  florida_check_a_charity_state: 'timeout',
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  state: 'terminal_lawful_route_discovery_no_identity_admitted',
  custody_file: CUSTODY_FILE
};
schoolhouseTask.next_transition = 'Run one targeted no-submission pass over official North Carolina nonprofits-by-county, unincorporated-nonprofit, data-subscription, data-dictionary, annual-report, and distinct downloadable report surfaces, plus a focused retry of Florida Check-A-Charity mechanics. Preserve the Magnolia shared-EIN conflict, publisher automation restrictions, transport failures, and explicit nulls. Admit no public School.House identity without identifier, time, place, organization class, and brand convergence.';
writeJson(FRONTIER_PATH, frontier);

coverage.as_of = '2026-08-05';
if (coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina lawful-route discovery')) {
  fail('route-discovery coverage denominator already exists');
}
coverage.denominators.push({
  surface: 'School.House Florida-charity and North Carolina lawful-route discovery',
  declared_total: 32,
  enumerated_total: 32,
  root_route_total: 8,
  followed_route_total: 24,
  discovered_link_rows: 65,
  unique_discovered_links: 55,
  html_surface_rows: 12,
  form_rows: 8,
  search_submissions: 0,
  coverage_state: 'terminal_no_submission_route_discovery'
});
const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => typeof row === 'string' && row.includes('Florida corporate owner follow-up is complete'));
if (gapIndex === -1) fail('expected School.House registry gap row is missing');
coverage.explicit_nulls_and_gaps[gapIndex] = 'School.House public identity remains unresolved after the Florida charity and North Carolina lawful-route pass enumerated thirty-two terminal official routes, sixty-five discovered links, twelve HTML surfaces, and eight privacy-minimized form rows with zero search submissions. Florida Check-A-Charity timed out, North Carolina scripted interactive searches remain prohibited, and second-level reports, listings, subscriptions, dictionaries, charity filings, governance, funding, and fiscal-sponsor evidence remain open.';
writeJson(COVERAGE_PATH, coverage);

manifest.as_of = '2026-08-05';
for (const boundary of [
  'A charity or report route, form-control map, bounded file sample, or data-subscription page is not a School.House legal-identity, exemption, filing, fiscal-sponsor, ownership, governance, funding, or control record.',
  'North Carolina scripted interactive searches remain prohibited; only official reports, listings, subscriptions, and distinct downloadable surfaces may advance this lane.'
]) {
  if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
}
manifest.counts.source_inventory_rows = 136;
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.schoolhouse_charity_nc_root_route_rows = 8;
manifest.counts.schoolhouse_charity_nc_followed_route_rows = 24;
manifest.counts.schoolhouse_charity_nc_terminal_route_rows = 32;
manifest.counts.schoolhouse_charity_nc_discovered_link_rows = 65;
manifest.counts.schoolhouse_charity_nc_unique_discovered_links = 55;
manifest.counts.schoolhouse_charity_nc_html_surface_rows = 12;
manifest.counts.schoolhouse_charity_nc_form_rows = 8;
manifest.counts.schoolhouse_charity_nc_accessible_file_sample_routes = 11;
manifest.counts.schoolhouse_charity_nc_accessible_html_routes = 12;
manifest.counts.schoolhouse_charity_nc_accessible_non_html_routes = 3;
manifest.counts.schoolhouse_charity_nc_provider_blocked_routes = 1;
manifest.counts.schoolhouse_charity_nc_timeout_routes = 5;
manifest.counts.schoolhouse_charity_nc_search_submissions = 0;
manifest.counts.schoolhouse_charity_nc_source_rows_acquired = 0;
manifest.counts.schoolhouse_charity_nc_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_charity_nc_route_discovery = '8_root_24_followed_32_terminal_65_links_12_html_8_forms_zero_search_submissions';
manifest.custody.next_waterline = 'charity_nc_second_level_reports_governance_and_source_archival';
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, exact Florida fictitious-name and corporate resolution, Magnolia shared-EIN conflict custody, Florida-charity and North Carolina lawful-route discovery, coverage nulls, and deterministic continuation work.';
if (!manifest.storage_contract.source_inventory_parts.includes(SOURCE_PART)) manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.storage_contract.schoolhouse_charity_nc_route_custody = CUSTODY_FILE;
manifest.storage_contract.schoolhouse_charity_nc_root_route_results = ROOT_RESULTS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_followed_route_results = FOLLOWED_RESULTS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_discovered_links = DISCOVERED_LINKS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_html_surfaces = HTML_SURFACES_FILE;
manifest.storage_contract.schoolhouse_charity_nc_surface_forms = FORMS_FILE;

const allSourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(file => readJsonl(path.join(DIR, file)));
if (allSourceInventory.length !== 136) fail(`source inventory denominator after route custody is ${allSourceInventory.length}, expected 136`);
ensureUnique(allSourceInventory.map(row => row.receipt_id), 'source inventory receipt IDs');
manifest.source_inventory.evidence_class_counts = countBy(allSourceInventory, 'evidence_class');
manifest.source_inventory.source_state_counts = countBy(allSourceInventory, 'source_state');

for (const filename of [SOURCE_PART, CUSTODY_FILE, ROOT_RESULTS_FILE, FOLLOWED_RESULTS_FILE, DISCOVERED_LINKS_FILE, HTML_SURFACES_FILE, FORMS_FILE]) {
  manifest.files[filename] = { bytes: 0, sha256: '' };
}
for (const filename of Object.keys(manifest.files)) {
  const file = path.join(DIR, filename);
  if (!fs.existsSync(file)) fail(`manifest-bound file missing before rehash: ${filename}`);
  manifest.files[filename] = fileRecord(file);
}
writeJson(MANIFEST_PATH, manifest);

readme = replaceExact(readme, 'public-source receipts                        104', 'public-source receipts                        136', 'README source receipt count');
readme = replaceExact(
  readme,
  'state-registry identities admitted                     0\ninstitutional self-claim rows                  10',
  'state-registry identities admitted                     0\ncharity/NC root routes                              8 / 8\ncharity/NC followed routes                         24 / 24\ncharity/NC terminal route rows                     32 / 32\ncharity/NC discovered link rows                         65\ncharity/NC unique discovered links                      55\ncharity/NC HTML surfaces                                12\ncharity/NC privacy-minimized form rows                   8\ncharity/NC scripted or interactive searches              0\ncharity/NC source rows acquired                           0\ncharity/NC public identities admitted                     0\ninstitutional self-claim rows                  10',
  'README route-discovery counts'
);
readme = replaceExact(
  readme,
  '- `source-inventory-01.jsonl` through `source-inventory-04.jsonl` preserve every public locator and its evidence class in manifest-bound order.',
  '- `source-inventory-01.jsonl` through `source-inventory-09.jsonl` preserve every public locator and its evidence class in manifest-bound order.',
  'README source inventory range'
);
readme = replaceExact(
  readme,
  '- `state-registry-route-results.jsonl` and `state-registry-route-custody.json` preserve sixteen lawful Florida and North Carolina route dispositions, zero scripted search submissions, exact accessible bulk paths, publisher policy, and strict transport boundaries.\n',
  '- `state-registry-route-results.jsonl` and `state-registry-route-custody.json` preserve sixteen lawful Florida and North Carolina route dispositions, zero scripted search submissions, exact accessible bulk paths, publisher policy, and strict transport boundaries.\n- `schoolhouse-charity-nc-route-custody.json` and the five `schoolhouse-charity-nc-*.jsonl` route, link, surface, and form files preserve eight root routes, twenty-four bounded official follow-ups, sixty-five discovered-link observations, twelve HTML surfaces, eight privacy-minimized form rows, zero interactive searches, and the controlling North Carolina publisher policy.\n',
  'README route custody files'
);
readme = replaceExact(
  readme,
  'The next lawful boundary is Florida charity and North Carolina entity or charity custody that respects publisher automation policy.\n\nThe checked-in frontier now directs',
  'The lawful-route successor then enumerated eight official roots and twenty-four bounded official follow-ups, preserving sixty-five discovered links, twelve HTML surfaces, eight privacy-minimized form rows, and zero organization-name or license-number submissions. Florida Check-A-Charity timed out in this transport, while North Carolina policy continued to prohibit scripted interactive searches and direct bulk users to reports, listings, subscriptions, and distinct downloadable documents. The next boundary is a targeted second-level pass over those official static surfaces, with no interactive search and no public-identity admission by route inference.\n\nThe checked-in frontier now directs',
  'README continuation route discovery'
);
fs.writeFileSync(README_PATH, readme);

const validationBlock = `

  {
    const routeCustody = readJson(path.join(dir, '${CUSTODY_FILE}'));
    const rootRoutes = readJsonl(path.join(dir, '${ROOT_RESULTS_FILE}'));
    const followedRoutes = readJsonl(path.join(dir, '${FOLLOWED_RESULTS_FILE}'));
    const discoveredLinks = readJsonl(path.join(dir, '${DISCOVERED_LINKS_FILE}'));
    const routeHtmlSurfaces = readJsonl(path.join(dir, '${HTML_SURFACES_FILE}'));
    const routeForms = readJsonl(path.join(dir, '${FORMS_FILE}'));
    const allRouteRows = [...rootRoutes, ...followedRoutes];

    check(manifest.counts.schoolhouse_charity_nc_root_route_rows === rootRoutes.length && rootRoutes.length === 8, 'charity/NC root-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_followed_route_rows === followedRoutes.length && followedRoutes.length === 24, 'charity/NC followed-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_terminal_route_rows === allRouteRows.length && allRouteRows.length === 32, 'charity/NC terminal-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_discovered_link_rows === discoveredLinks.length && discoveredLinks.length === 65, 'charity/NC discovered-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_unique_discovered_links === new Set(discoveredLinks.map(row => row.href)).size && manifest.counts.schoolhouse_charity_nc_unique_discovered_links === 55, 'charity/NC unique-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_html_surface_rows === routeHtmlSurfaces.length && routeHtmlSurfaces.length === 12, 'charity/NC HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_form_rows === routeForms.length && routeForms.length === 8, 'charity/NC form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_search_submissions === 0 && allRouteRows.filter(row => row.query_submitted).length === 0, 'charity/NC search-submission boundary drift');
    check(manifest.counts.schoolhouse_charity_nc_source_rows_acquired === 0 && allRouteRows.reduce((sum, row) => sum + row.source_rows_acquired, 0) === 0, 'charity/NC source-row boundary drift');
    check(manifest.counts.schoolhouse_charity_nc_admitted_identity_rows === 0, 'charity/NC route pass must admit no identity');
    check(unique(allRouteRows.map(row => row.route_id)), 'charity/NC route IDs must be unique');
    check(unique(allRouteRows.map(row => row.receipt_id)), 'charity/NC receipt IDs must be unique');
    check(allRouteRows.every(row => row.query_submitted === false && row.source_rows_acquired === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'charity/NC route authority drift');
    check(allRouteRows.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'charity/NC route privacy drift');
    check(allRouteRows.filter(row => row.state === 'accessible_file_sample').length === 11, 'charity/NC file-sample state count drift');
    check(allRouteRows.filter(row => row.state === 'accessible_html').length === 12, 'charity/NC HTML state count drift');
    check(allRouteRows.filter(row => row.state === 'accessible_non_html').length === 3, 'charity/NC non-HTML state count drift');
    check(allRouteRows.filter(row => row.state === 'provider_blocked').length === 1, 'charity/NC provider-blocked state count drift');
    check(allRouteRows.filter(row => row.state === 'timeout').length === 5, 'charity/NC timeout state count drift');
    check(discoveredLinks.every(row => row.official_host === true && row.relevant === true && row.query_submission_required === false && knownReceiptIds.has(row.source_receipt_id) && row.graph_effect === 'none'), 'charity/NC discovered-link boundary drift');
    check(routeHtmlSurfaces.every(row => row.raw_body_retained === false && row.query_submitted === false && knownReceiptIds.has(row.receipt_id) && row.graph_effect === 'none'), 'charity/NC HTML-surface boundary drift');
    check(routeForms.every(row => row.hidden_values_retained === false && row.query_submitted === false && knownReceiptIds.has(row.receipt_id) && row.graph_effect === 'none'), 'charity/NC form boundary drift');
    check(routeForms.every(row => (row.controls || []).every(control => !Object.hasOwn(control, 'value'))), 'charity/NC form retained a raw control value');

    check(routeCustody.acquisition.workflow_run_id === ${WORKFLOW_RUN_ID} && routeCustody.acquisition.artifact_id === ${ARTIFACT_ID} && routeCustody.acquisition.artifact_digest === '${ARTIFACT_DIGEST}', 'charity/NC artifact custody drift');
    check(routeCustody.counts.terminal_route_rows === 32 && routeCustody.counts.discovered_link_rows === 65 && routeCustody.counts.unique_discovered_links === 55 && routeCustody.counts.html_surface_rows === 12 && routeCustody.counts.form_rows === 8, 'charity/NC custody denominator drift');
    check(routeCustody.counts.search_submissions === 0 && routeCustody.counts.source_rows_acquired === 0 && routeCustody.counts.identities_admitted === 0, 'charity/NC custody authority drift');
    check(routeCustody.florida.check_a_charity_state === 'timeout' && routeCustody.florida.search_submissions === 0 && routeCustody.florida.automation_permission_inferred === false, 'Florida charity route custody drift');
    check(routeCustody.north_carolina.automated_or_scripted_searches_not_permitted === true && routeCustody.north_carolina.bulk_data_subscription_direction_captured === true && routeCustody.north_carolina.search_submissions === 0, 'North Carolina route-policy custody drift');
    check(routeCustody.privacy.raw_source_retained === false && routeCustody.privacy.hidden_form_values_retained === false && routeCustody.privacy.street_address_rows_retained === 0 && routeCustody.privacy.contact_detail_rows_retained === 0 && routeCustody.privacy.private_support_rows === 0, 'charity/NC custody privacy drift');
    check(routeCustody.public_schoolhouse_identity_admitted === false && routeCustody.negative_existence_claim_created === false && routeCustody.outside_human_dependency === false && routeCustody.graph_effect === 'none' && routeCustody.promotes_to === 'candidate_only', 'charity/NC custody authority ceiling drift');

    const routeProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_route_discovery;
    check(routeProjection?.terminal_route_rows === 32 && routeProjection?.discovered_link_rows === 65 && routeProjection?.form_rows === 8, 'School.House route projection drift');
    check(routeProjection?.identity_state === 'unresolved_after_lawful_route_discovery_no_public_identity_admitted' && routeProjection?.admitted_legal_name === null && routeProjection?.admitted_ein === null, 'School.House route projection admitted an identity');
    const routeFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_route_discovery;
    check(routeFrontier?.terminal_route_rows === 32 && routeFrontier?.search_submissions === 0 && routeFrontier?.admitted_identities === 0, 'School.House route frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina lawful-route discovery' && row.enumerated_total === 32 && row.search_submissions === 0), 'charity/NC coverage denominator missing');
  }
`;
validator = replaceExact(validator, '\n  return errors;\n}', `${validationBlock}\n  return errors;\n}`, 'validator route-custody block');
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  schema_version: 'schoolhouse-charity-nc-route-custody-build@1',
  source_inventory_rows: manifest.counts.source_inventory_rows,
  root_routes: roots.length,
  followed_routes: followed.length,
  terminal_route_rows: roots.length + followed.length,
  discovered_links: discovered.length,
  unique_discovered_links: new Set(discovered.map(row => row.href)).size,
  html_surfaces: htmlSurfaces.length,
  forms: forms.length,
  search_submissions: 0,
  source_rows_acquired: 0,
  identities_admitted: 0,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none'
}, null, 2));
