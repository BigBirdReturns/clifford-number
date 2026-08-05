import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) {
  throw new Error('usage: node tools/build-schoolhouse-charity-nc-second-level-route-custody.mjs <artifact-dir>');
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const SOURCE_PART = 'source-inventory-10.jsonl';
const CUSTODY_FILE = 'schoolhouse-charity-nc-second-level-route-custody.json';
const ROOT_RESULTS_FILE = 'schoolhouse-charity-nc-second-level-root-route-results.jsonl';
const FOLLOWED_RESULTS_FILE = 'schoolhouse-charity-nc-second-level-followed-route-results.jsonl';
const DISCOVERED_LINKS_FILE = 'schoolhouse-charity-nc-second-level-discovered-links.jsonl';
const HTML_SURFACES_FILE = 'schoolhouse-charity-nc-second-level-html-surfaces.jsonl';
const FORMS_FILE = 'schoolhouse-charity-nc-second-level-surface-forms.jsonl';

const WORKFLOW_RUN_ID = 30982778498;
const ARTIFACT_ID = 8920802436;
const ARTIFACT_NAME = 'schoolhouse-charity-nc-second-level-route-discovery';
const ARTIFACT_DIGEST = 'sha256:f109b0c3c1b0b582cdf124029cd5bf6663dc1510eec89eed6ee8bf25f1e55eec';
const ACQUISITION_HEAD = '75c8f50ab1a31e5b115e3d6973cbd6ffb7c750ee';
const AS_OF = '2026-08-05';
const MAX_FOLLOWED_ROUTES = 80;
const MAX_DEPTH = 2;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
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
const unique = values => new Set(values).size === values.length;
const slug = value => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 140);
const replaceExactOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected one exact anchor, found ${count}`);
  return source.replace(before, after);
};
const insertAfterOnce = (source, anchor, addition, label) => replaceExactOnce(source, anchor, anchor + addition, label);
const fileSuffix = value => {
  try {
    return path.posix.extname(new URL(value).pathname).toLowerCase();
  } catch {
    return '';
  }
};

const manifest = readJson(MANIFEST_PATH);
const schoolhouse = readJson(SCHOOLHOUSE_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected BVVC manifest schema');
if (manifest.counts.source_inventory_rows !== 136) fail(`expected 136 source receipts before second-level custody, got ${manifest.counts.source_inventory_rows}`);
if (manifest.counts.schoolhouse_charity_nc_terminal_route_rows !== 32) fail('predecessor charity/NC custody is missing');
if (!manifest.storage_contract?.source_inventory_parts?.includes('source-inventory-09.jsonl')) fail('source-inventory-09.jsonl predecessor is missing');
if (schoolhouse.state_registry_identity_census?.charity_north_carolina_second_level_route_discovery) fail('School.House second-level projection already exists');
if (coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina second-level static-route discovery')) fail('second-level coverage denominator already exists');

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

const artifactFiles = new Map(artifactManifest.files.map(row => [row.path, row]));
for (const filename of [
  'root-route-receipts.jsonl',
  'followed-route-receipts.jsonl',
  'discovered-links.jsonl',
  'html-surfaces.jsonl',
  'surface-forms.jsonl',
  'route-policy.json',
  'summary.json'
]) {
  const expected = artifactFiles.get(filename);
  const file = path.join(ARTIFACT_DIR, filename);
  if (!expected || !fs.existsSync(file)) fail(`artifact file missing: ${filename}`);
  if (expected && fs.statSync(file).size !== expected.bytes) fail(`artifact byte-count drift: ${filename}`);
  if (expected && sha256(file) !== expected.sha256) fail(`artifact SHA-256 drift: ${filename}`);
}
if (artifactManifest.file_count !== 7 || artifactFiles.size !== 7) fail('artifact file denominator drift');
if (artifactManifest.search_submissions !== 0 || artifactManifest.source_rows_acquired !== 0) fail('artifact search/source-row authority drift');
if (artifactManifest.raw_source_retained !== false || artifactManifest.hidden_form_values_retained !== false) fail('artifact privacy drift');
if (artifactManifest.identity_admitted !== false || artifactManifest.negative_existence_claim_created !== false || artifactManifest.outside_human_dependency !== false || artifactManifest.graph_effect !== 'none') fail('artifact identity or graph authority drift');

const expectedSummary = {
  declared_root_routes: 8,
  root_route_receipts: 8,
  followed_routes: 80,
  terminal_route_rows: 88,
  discovered_link_rows: 524,
  unique_discovered_links: 185,
  file_sample_routes: 68,
  html_surface_rows: 19,
  form_rows: 3,
  search_submissions: 0,
  organization_name_submissions: 0,
  license_number_submissions: 0,
  source_rows_acquired: 0,
  street_address_rows_retained: 0,
  contact_detail_rows_retained: 0,
  private_support_rows: 0
};
for (const [key, expected] of Object.entries(expectedSummary)) {
  if (summary[key] !== expected) fail(`second-level summary drift for ${key}: expected ${expected}, got ${summary[key]}`);
}
if (summary.all_route_receipts_terminal !== true || summary.raw_source_retained !== false || summary.hidden_form_values_retained !== false) fail('second-level summary terminal/privacy drift');
if (summary.identity_admitted !== false || summary.negative_existence_claim_created !== false || summary.outside_human_dependency !== false || summary.publication_effect !== 'none' || summary.adoption_effect !== 'none' || summary.graph_effect !== 'none') fail('second-level summary authority drift');
if (JSON.stringify(summary.depth_counts) !== JSON.stringify({ '0': 8, '1': 80 })) fail('second-level depth denominator drift');
if (JSON.stringify(summary.state_counts) !== JSON.stringify({ accessible_file_sample: 68, accessible_html: 19, timeout: 1 })) fail('second-level terminal state denominator drift');
if (summary.fl_check_a_charity_state !== 'timeout' || summary.fl_check_a_charity_form_count !== 0) fail('Florida Check-A-Charity disposition drift');
if (summary.nc_automated_search_prohibition_captured !== true || summary.nc_bulk_subscription_direction_captured !== true || summary.nc_interactive_real_time_instruction_captured !== true) fail('North Carolina publisher-policy capture drift');
if (policy.north_carolina?.automated_or_scripted_interactive_searches_not_permitted !== true || policy.north_carolina?.interactive_search_submissions !== 0) fail('North Carolina route-policy drift');
if (policy.florida?.check_a_charity_query_submissions !== 0 || policy.florida?.automation_permission_inferred !== false) fail('Florida route-policy drift');
if (policy.search_submissions !== 0 || policy.source_rows_acquired !== 0 || policy.raw_source_retained !== false || policy.hidden_form_values_retained !== false || policy.identity_admitted !== false || policy.negative_existence_claim_created !== false || policy.outside_human_dependency !== false || policy.graph_effect !== 'none') fail('second-level policy authority drift');

if (roots.length !== 8 || followed.length !== 80 || discovered.length !== 524 || htmlSurfaces.length !== 19 || forms.length !== 3) fail('artifact row denominator drift');
const allRoutes = [...roots, ...followed];
if (!unique(allRoutes.map(row => row.route_id))) fail('route IDs must be unique');
if (!allRoutes.every(row => row.query_submitted === false && row.source_rows_acquired === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false)) fail('route search/source/privacy drift');
if (!allRoutes.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0)) fail('route retained private/contact data');
if (!allRoutes.every(row => row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('route authority drift');
if (!forms.every(row => row.query_submitted === false && row.hidden_values_retained === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('form authority drift');
if (!forms.every(row => (row.controls || []).every(control => control.raw_value_retained === false && !Object.hasOwn(control, 'value')))) fail('form retained a raw value');
if (!discovered.every(row => row.official_host === true && row.query_submission_required === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('discovered-link boundary drift');
if (!htmlSurfaces.every(row => row.query_submitted === false && row.raw_body_retained === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only')) fail('HTML-surface boundary drift');

const receiptIdByRouteId = new Map(allRoutes.map(row => [
  row.route_id,
  `r-schoolhouse-charity-nc-second-level-${slug(row.route_id)}-${AS_OF}`
]));
if (!unique([...receiptIdByRouteId.values()])) fail('second-level route receipt IDs must be unique');
const routeById = new Map(allRoutes.map(row => [row.route_id, row]));
for (const row of followed) {
  if (!row.source_route_id || !routeById.has(row.source_route_id)) fail(`followed route lacks a valid source route: ${row.route_id}`);
}
for (const row of discovered) {
  if (!row.source_route_id || !routeById.has(row.source_route_id)) fail(`discovered link lacks a valid source route: ${row.href}`);
}
for (const row of htmlSurfaces) {
  if (!routeById.has(row.route_id)) fail(`HTML surface lacks a valid route: ${row.route_id}`);
}
for (const row of forms) {
  if (!routeById.has(row.route_id)) fail(`form lacks a valid route: ${row.route_id}`);
}

const sourceStateFor = row => {
  if (row.state === 'timeout') return 'source_unavailable_after_search';
  if (row.state === 'accessible_file_sample') return 'captured_bounded_file_sample';
  if (row.state === 'accessible_html') return 'captured_html_surface';
  return `captured_terminal_route_${row.state}`;
};
const sourceNoteFor = row => {
  const base = `Official ${row.jurisdiction} ${String(row.surface).replaceAll('_', ' ')} route; terminal state ${row.state}; no interactive query was submitted.`;
  if (row.state === 'accessible_file_sample') return `${base} The retained SHA-256 binds only the bounded public file sample acquired by the runner, not the complete remote file.`;
  if (row.state === 'timeout') return `${base} Timeout is transport custody and does not support an entity, filing, or record absence claim.`;
  return base;
};
const sourceRows = allRoutes.map(row => ({
  receipt_id: receiptIdByRouteId.get(row.route_id),
  route_id: row.route_id,
  evidence_class: 'official',
  locator_url: row.requested_url,
  retrieved_at: row.probed_at,
  content_sha256: row.body_sha256 || null,
  source_state: sourceStateFor(row),
  note: sourceNoteFor(row),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
if (sourceRows.length !== 88) fail('second-level source inventory addition must contain 88 rows');
writeJsonl(path.join(DIR, SOURCE_PART), sourceRows);

const permanentRoute = row => ({
  ...row,
  receipt_id: receiptIdByRouteId.get(row.route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
});
const permanentRoots = roots.map(permanentRoute);
const permanentFollowed = followed.map(permanentRoute);
const permanentDiscovered = discovered.map(row => ({
  ...row,
  source_receipt_id: receiptIdByRouteId.get(row.source_route_id),
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
const permanentHtml = htmlSurfaces.map(row => ({
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
writeJsonl(path.join(DIR, ROOT_RESULTS_FILE), permanentRoots);
writeJsonl(path.join(DIR, FOLLOWED_RESULTS_FILE), permanentFollowed);
writeJsonl(path.join(DIR, DISCOVERED_LINKS_FILE), permanentDiscovered);
writeJsonl(path.join(DIR, HTML_SURFACES_FILE), permanentHtml);
writeJsonl(path.join(DIR, FORMS_FILE), permanentForms);

const probedUrls = new Set(allRoutes.map(row => row.requested_url));
const uniqueDiscoveredByUrl = new Map();
for (const row of discovered) {
  if (!uniqueDiscoveredByUrl.has(row.href)) uniqueDiscoveredByUrl.set(row.href, row);
}
const residualUnique = [...uniqueDiscoveredByUrl.values()].filter(row => !probedUrls.has(row.href));
const residualRelevant = residualUnique.filter(row => row.relevant === true);
const fileSuffixes = new Set(['.csv', '.doc', '.docx', '.json', '.pdf', '.txt', '.xls', '.xlsx', '.xml', '.zip']);
const residualFiles = residualRelevant.filter(row => fileSuffixes.has(fileSuffix(row.href)));
if (residualUnique.length !== 101 || residualRelevant.length !== 51 || residualFiles.length !== 16) fail('second-level residual denominator drift');

const custody = {
  schema_version: 'schoolhouse-charity-nc-second-level-route-custody@1',
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
  bounds: {
    declared_root_routes: 8,
    maximum_followed_routes: MAX_FOLLOWED_ROUTES,
    maximum_depth: MAX_DEPTH,
    observed_depth_counts: summary.depth_counts,
    followed_route_cap_exhausted: followed.length === MAX_FOLLOWED_ROUTES,
    depth_two_routes_followed: followed.filter(row => row.depth === 2).length,
    boundary: 'The eighty-route depth-one cap was exhausted before any depth-two continuation. Residual links remain acquisition work and are not absence evidence.'
  },
  counts: {
    declared_root_routes: roots.length,
    terminal_root_routes: roots.length,
    followed_routes: followed.length,
    terminal_followed_routes: followed.length,
    terminal_route_rows: allRoutes.length,
    discovered_link_rows: discovered.length,
    unique_discovered_links: uniqueDiscoveredByUrl.size,
    bounded_file_sample_routes: summary.file_sample_routes,
    html_surface_rows: htmlSurfaces.length,
    form_rows: forms.length,
    accessible_file_sample_routes: summary.state_counts.accessible_file_sample,
    accessible_html_routes: summary.state_counts.accessible_html,
    timeout_routes: summary.state_counts.timeout,
    residual_unique_links: residualUnique.length,
    residual_relevant_links: residualRelevant.length,
    residual_file_links: residualFiles.length,
    search_submissions: 0,
    organization_name_submissions: 0,
    license_number_submissions: 0,
    source_rows_acquired: 0,
    identities_admitted: 0
  },
  florida: {
    check_a_charity_state: summary.fl_check_a_charity_state,
    check_a_charity_forms: summary.fl_check_a_charity_form_count,
    query_submissions: 0,
    automation_permission_inferred: false,
    boundary: policy.florida.boundary
  },
  north_carolina: {
    automated_or_scripted_interactive_searches_not_permitted: policy.north_carolina.automated_or_scripted_interactive_searches_not_permitted,
    interactive_search_submissions: 0,
    policy_hits: summary.policy_hit_counts,
    allowed_surfaces: policy.north_carolina.allowed_surfaces,
    forbidden_surface: policy.north_carolina.forbidden_surface
  },
  residual_frontier: {
    relevant_unfollowed_links: residualRelevant.length,
    unfollowed_file_links: residualFiles.length,
    file_suffix_counts: countBy(residualFiles.map(row => ({ suffix: fileSuffix(row.href) })), 'suffix'),
    action: 'Run one final static residual pass over the fifty-one relevant unfollowed official links, prioritizing the sixteen official file links and the data-subscription layout dictionaries, charity manuals, campaign notices, donor guidance, and remaining static charity or enforcement pages. Submit no interactive search.',
    stopping_rule: 'Stop when every one of the fifty-one frozen residual relevant links has one terminal route disposition and every one of the sixteen frozen residual file links is either captured under bounded public transport or recorded as unavailable. Do not submit an interactive search.',
    outside_human_dependency: false
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
    exhausted_follow_cap_is_not_denominator_completion: true,
    publisher_automation_policy_must_not_be_bypassed: true,
    forbidden_inference: 'An official route, report, form, dictionary, file sample, annual report, or data-subscription surface does not establish the public School.House legal entity, EIN, exemption, filing, fiscal sponsor, ownership, governance, funding, control, or absence.'
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

schoolhouse.as_of = AS_OF;
schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_candidate_and_second_level_route_custody';
schoolhouse.state_registry_identity_census ||= {};
schoolhouse.state_registry_identity_census.charity_north_carolina_second_level_route_discovery = {
  as_of: AS_OF,
  workflow_run_id: WORKFLOW_RUN_ID,
  artifact_id: ARTIFACT_ID,
  artifact_digest: ARTIFACT_DIGEST,
  declared_root_routes: 8,
  terminal_root_routes: 8,
  followed_routes: 80,
  terminal_route_rows: 88,
  discovered_link_rows: 524,
  unique_discovered_links: 185,
  bounded_file_sample_routes: 68,
  html_surface_rows: 19,
  form_rows: 3,
  residual_unique_links: 101,
  residual_relevant_links: 51,
  residual_file_links: 16,
  florida_check_a_charity_state: 'timeout',
  north_carolina_automation_prohibition_captured: true,
  search_submissions: 0,
  source_rows_acquired: 0,
  identity_state: 'unresolved_after_terminal_second_level_static_route_discovery_no_public_identity_admitted',
  admitted_legal_name: null,
  admitted_ein: null,
  custody_file: CUSTODY_FILE,
  root_route_file: ROOT_RESULTS_FILE,
  followed_route_file: FOLLOWED_RESULTS_FILE,
  discovered_link_file: DISCOVERED_LINKS_FILE,
  html_surface_file: HTML_SURFACES_FILE,
  form_file: FORMS_FILE,
  receipt_ids: sourceRows.map(row => row.receipt_id),
  boundary: 'The second-level pass freezes official static continuation surfaces and publisher policy. It submits no organization-name or license-number search and does not establish a public School.House legal identity, exemption, filing, fiscal sponsor, governance, funding, control, or absence.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
schoolhouseTask.prior_charity_nc_second_level_route_discovery = {
  workflow_run_id: WORKFLOW_RUN_ID,
  artifact_id: ARTIFACT_ID,
  artifact_digest: ARTIFACT_DIGEST,
  acquisition_head: ACQUISITION_HEAD,
  declared_root_routes: 8,
  terminal_root_routes: 8,
  followed_routes: 80,
  terminal_route_rows: 88,
  discovered_link_rows: 524,
  unique_discovered_links: 185,
  bounded_file_sample_routes: 68,
  html_surface_rows: 19,
  form_rows: 3,
  residual_unique_links: 101,
  residual_relevant_links: 51,
  residual_file_links: 16,
  followed_route_cap_exhausted: true,
  depth_two_routes_followed: 0,
  florida_check_a_charity_state: 'timeout',
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  state: 'terminal_bounded_second_level_static_route_discovery_residual_preserved_no_identity_admitted',
  custody_file: CUSTODY_FILE
};
schoolhouseTask.next_transition = 'Run one final no-submission static residual pass over the fifty-one frozen relevant unfollowed official links from the second-level artifact, prioritizing the sixteen official file links, data-subscription layout dictionaries, charity manuals, campaign notices, donor guidance, annual reports, and remaining static charity or enforcement pages. Preserve the Magnolia shared-EIN conflict, publisher automation restrictions, file-sample boundaries, transport failures, and explicit nulls. Admit no public School.House identity without identifier, time, place, organization class, and brand convergence.';
frontier.as_of = AS_OF;
writeJson(FRONTIER_PATH, frontier);

coverage.as_of = AS_OF;
coverage.denominators.push({
  surface: 'School.House Florida-charity and North Carolina second-level static-route discovery',
  declared_total: 88,
  enumerated_total: 88,
  root_route_total: 8,
  followed_route_total: 80,
  discovered_link_rows: 524,
  unique_discovered_links: 185,
  bounded_file_sample_routes: 68,
  html_surface_rows: 19,
  form_rows: 3,
  residual_relevant_links: 51,
  residual_file_links: 16,
  search_submissions: 0,
  coverage_state: 'terminal_bounded_second_level_no_submission_route_discovery_residual_preserved'
});
const priorGapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => row.includes('Florida charity and North Carolina lawful-route pass enumerated thirty-two terminal official routes'));
if (priorGapIndex === -1) fail('prior charity/NC coverage gap row missing');
coverage.explicit_nulls_and_gaps[priorGapIndex] = 'School.House public identity remains unresolved after the second-level Florida-charity and North Carolina static-route pass froze eighty-eight terminal official routes, 524 discovered-link observations representing 185 unique links, sixty-eight bounded file samples, nineteen HTML surfaces, and three privacy-minimized form rows with zero search submissions. Florida Check-A-Charity timed out, North Carolina scripted interactive searches remain prohibited, and the exhausted eighty-route depth-one cap leaves fifty-one relevant unfollowed official links including sixteen file links. Those residual static reports, dictionaries, annual reports, charity filings, governance, funding, and fiscal-sponsor surfaces remain open.';
writeJson(COVERAGE_PATH, coverage);

readme = replaceExactOnce(readme, 'public-source receipts                        136', 'public-source receipts                        224', 'README source receipt count');
readme = insertAfterOnce(
  readme,
  'charity/NC public identities admitted                     0',
  '\ncharity/NC second-level root routes                    8 / 8\ncharity/NC second-level followed routes               80 / 80\ncharity/NC second-level terminal route rows           88 / 88\ncharity/NC second-level discovered link rows               524\ncharity/NC second-level unique discovered links            185\ncharity/NC second-level bounded file samples                68\ncharity/NC second-level HTML surfaces                       19\ncharity/NC second-level privacy-minimized form rows           3\ncharity/NC second-level residual relevant links              51\ncharity/NC second-level residual file links                  16\ncharity/NC second-level scripted or interactive searches     0\ncharity/NC second-level source rows acquired                  0\ncharity/NC second-level public identities admitted            0',
  'README second-level count block'
);
readme = replaceExactOnce(
  readme,
  '`source-inventory-01.jsonl` through `source-inventory-09.jsonl`',
  '`source-inventory-01.jsonl` through `source-inventory-10.jsonl`',
  'README source inventory range'
);
const priorFileBullet = '- `schoolhouse-charity-nc-route-custody.json` and the five `schoolhouse-charity-nc-*.jsonl` route, link, surface, and form files preserve eight root routes, twenty-four bounded official follow-ups, sixty-five discovered-link observations, twelve HTML surfaces, eight privacy-minimized form rows, zero interactive searches, and the controlling North Carolina publisher policy.';
readme = insertAfterOnce(
  readme,
  priorFileBullet,
  '\n- `schoolhouse-charity-nc-second-level-route-custody.json` and the five `schoolhouse-charity-nc-second-level-*.jsonl` route, link, surface, and form files preserve eight second-level roots, eighty bounded official follow-ups, 524 discovered-link observations, sixty-eight bounded file samples, nineteen HTML surfaces, three privacy-minimized form rows, the fifty-one-link and sixteen-file residual, zero interactive searches, and the controlling North Carolina publisher policy.',
  'README second-level file bullet'
);
readme = replaceExactOnce(
  readme,
  'The next boundary is a targeted second-level pass over those official static surfaces, with no interactive search and no public-identity admission by route inference.',
  'The second-level successor then froze eight exact roots and eighty bounded official follow-ups, yielding eighty-eight terminal routes, 524 discovered-link observations, sixty-eight bounded file samples, nineteen HTML surfaces, and three privacy-minimized form rows with zero interactive searches. The eighty-route depth-one cap was exhausted before any depth-two follow-up, leaving fifty-one relevant unfollowed official links including sixteen file links. That frozen residual, rather than an absence claim, is the next bounded static acquisition surface.',
  'README second-level continuation paragraph'
);
fs.writeFileSync(README_PATH, readme);

manifest.as_of = AS_OF;
for (const boundary of [
  'An exhausted followed-route cap is a residual acquisition state and not denominator completion or evidence of absence.',
  'A bounded file-sample hash binds only the acquired sample and not the complete remote report, dictionary, form, annual report, or archive.'
]) {
  if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
}
manifest.counts.source_inventory_rows = 224;
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.schoolhouse_charity_nc_second_level_root_route_rows = 8;
manifest.counts.schoolhouse_charity_nc_second_level_followed_route_rows = 80;
manifest.counts.schoolhouse_charity_nc_second_level_terminal_route_rows = 88;
manifest.counts.schoolhouse_charity_nc_second_level_discovered_link_rows = 524;
manifest.counts.schoolhouse_charity_nc_second_level_unique_discovered_links = 185;
manifest.counts.schoolhouse_charity_nc_second_level_bounded_file_sample_routes = 68;
manifest.counts.schoolhouse_charity_nc_second_level_html_surface_rows = 19;
manifest.counts.schoolhouse_charity_nc_second_level_form_rows = 3;
manifest.counts.schoolhouse_charity_nc_second_level_residual_unique_links = 101;
manifest.counts.schoolhouse_charity_nc_second_level_residual_relevant_links = 51;
manifest.counts.schoolhouse_charity_nc_second_level_residual_file_links = 16;
manifest.counts.schoolhouse_charity_nc_second_level_timeout_routes = 1;
manifest.counts.schoolhouse_charity_nc_second_level_search_submissions = 0;
manifest.counts.schoolhouse_charity_nc_second_level_source_rows_acquired = 0;
manifest.counts.schoolhouse_charity_nc_second_level_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_charity_nc_second_level_route_discovery = '8_root_80_followed_88_terminal_524_links_185_unique_68_file_samples_19_html_3_forms_51_relevant_residual_16_file_residual_zero_search_submissions';
manifest.custody.next_waterline = 'charity_nc_residual_static_file_capture_governance_and_source_archival';
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, exact Florida fictitious-name and corporate resolution, Magnolia shared-EIN conflict custody, Florida-charity and North Carolina first- and second-level lawful static-route discovery, coverage nulls, and deterministic continuation work.';
manifest.storage_contract ||= {};
manifest.storage_contract.source_inventory_parts ||= [];
if (!manifest.storage_contract.source_inventory_parts.includes(SOURCE_PART)) manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.storage_contract.schoolhouse_charity_nc_second_level_route_custody = CUSTODY_FILE;
manifest.storage_contract.schoolhouse_charity_nc_second_level_root_route_results = ROOT_RESULTS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_second_level_followed_route_results = FOLLOWED_RESULTS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_second_level_discovered_links = DISCOVERED_LINKS_FILE;
manifest.storage_contract.schoolhouse_charity_nc_second_level_html_surfaces = HTML_SURFACES_FILE;
manifest.storage_contract.schoolhouse_charity_nc_second_level_surface_forms = FORMS_FILE;

const allSourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(filename => readJsonl(path.join(DIR, filename)));
if (allSourceInventory.length !== 224) fail(`source inventory denominator after second-level custody is ${allSourceInventory.length}, expected 224`);
if (!unique(allSourceInventory.map(row => row.receipt_id))) fail('source inventory receipt IDs must remain unique');
manifest.source_inventory ||= {};
manifest.source_inventory.evidence_class_counts = countBy(allSourceInventory, 'evidence_class');
manifest.source_inventory.source_state_counts = countBy(allSourceInventory, 'source_state');

for (const filename of [
  SOURCE_PART,
  CUSTODY_FILE,
  ROOT_RESULTS_FILE,
  FOLLOWED_RESULTS_FILE,
  DISCOVERED_LINKS_FILE,
  HTML_SURFACES_FILE,
  FORMS_FILE
]) {
  manifest.files[filename] = { bytes: 0, sha256: '' };
}
for (const filename of Object.keys(manifest.files)) {
  const file = path.join(DIR, filename);
  if (!fs.existsSync(file)) fail(`manifest-bound file missing before rehash: ${filename}`);
  manifest.files[filename] = fileRecord(file);
}
writeJson(MANIFEST_PATH, manifest);

const validationBlock = String.raw`

  {
    const secondLevelCustody = readJson(path.join(dir, '${CUSTODY_FILE}'));
    const secondLevelRoots = readJsonl(path.join(dir, '${ROOT_RESULTS_FILE}'));
    const secondLevelFollowed = readJsonl(path.join(dir, '${FOLLOWED_RESULTS_FILE}'));
    const secondLevelDiscovered = readJsonl(path.join(dir, '${DISCOVERED_LINKS_FILE}'));
    const secondLevelHtml = readJsonl(path.join(dir, '${HTML_SURFACES_FILE}'));
    const secondLevelForms = readJsonl(path.join(dir, '${FORMS_FILE}'));
    const secondLevelRoutes = [...secondLevelRoots, ...secondLevelFollowed];

    check(manifest.counts.source_inventory_rows === 224, 'second-level source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 20, 'second-level coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'second-level explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_root_route_rows === secondLevelRoots.length && secondLevelRoots.length === 8, 'second-level root-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_followed_route_rows === secondLevelFollowed.length && secondLevelFollowed.length === 80, 'second-level followed-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_terminal_route_rows === secondLevelRoutes.length && secondLevelRoutes.length === 88, 'second-level terminal-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_discovered_link_rows === secondLevelDiscovered.length && secondLevelDiscovered.length === 524, 'second-level discovered-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_unique_discovered_links === new Set(secondLevelDiscovered.map(row => row.href)).size && manifest.counts.schoolhouse_charity_nc_second_level_unique_discovered_links === 185, 'second-level unique-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_bounded_file_sample_routes === secondLevelRoutes.filter(row => row.state === 'accessible_file_sample').length && manifest.counts.schoolhouse_charity_nc_second_level_bounded_file_sample_routes === 68, 'second-level file-sample denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_html_surface_rows === secondLevelHtml.length && secondLevelHtml.length === 19, 'second-level HTML denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_form_rows === secondLevelForms.length && secondLevelForms.length === 3, 'second-level form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_timeout_routes === secondLevelRoutes.filter(row => row.state === 'timeout').length && manifest.counts.schoolhouse_charity_nc_second_level_timeout_routes === 1, 'second-level timeout denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_second_level_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_second_level_admitted_identity_rows === 0, 'second-level authority count drift');

    check(unique(secondLevelRoutes.map(row => row.route_id)), 'second-level route IDs must be unique');
    check(unique(secondLevelRoutes.map(row => row.receipt_id)), 'second-level receipt IDs must be unique');
    check(secondLevelRoutes.every(row => knownReceiptIds.has(row.receipt_id)), 'second-level route receipt missing from source inventory');
    check(secondLevelRoutes.every(row => row.query_submitted === false && row.source_rows_acquired === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false), 'second-level route search/source/privacy drift');
    check(secondLevelRoutes.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'second-level route retained private/contact data');
    check(secondLevelRoutes.every(row => row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'second-level route authority drift');
    check(secondLevelRoutes.filter(row => row.depth === 0).length === 8 && secondLevelRoutes.filter(row => row.depth === 1).length === 80 && secondLevelRoutes.filter(row => row.depth === 2).length === 0, 'second-level depth denominator drift');
    check(secondLevelRoutes.filter(row => row.state === 'accessible_file_sample').length === 68 && secondLevelRoutes.filter(row => row.state === 'accessible_html').length === 19 && secondLevelRoutes.filter(row => row.state === 'timeout').length === 1, 'second-level state denominator drift');
    check(secondLevelRoots.some(row => row.route_id === 'fl-check-a-charity-retry' && row.state === 'timeout'), 'Florida Check-A-Charity timeout custody missing');

    const secondLevelRouteById = new Map(secondLevelRoutes.map(row => [row.route_id, row]));
    check(secondLevelFollowed.every(row => secondLevelRouteById.has(row.source_route_id)), 'second-level followed route has no source route');
    check(secondLevelDiscovered.every(row => secondLevelRouteById.has(row.source_route_id) && knownReceiptIds.has(row.source_receipt_id) && row.official_host === true && row.query_submission_required === false && row.graph_effect === 'none'), 'second-level discovered-link boundary drift');
    check(secondLevelHtml.every(row => secondLevelRouteById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.query_submitted === false && row.raw_body_retained === false && row.graph_effect === 'none'), 'second-level HTML boundary drift');
    check(secondLevelForms.every(row => secondLevelRouteById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.query_submitted === false && row.hidden_values_retained === false && row.graph_effect === 'none'), 'second-level form boundary drift');
    check(secondLevelForms.every(row => (row.controls || []).every(control => control.raw_value_retained === false && !Object.hasOwn(control, 'value'))), 'second-level form retained a raw value');

    const secondLevelProbedUrls = new Set(secondLevelRoutes.map(row => row.requested_url));
    const secondLevelUniqueLinks = new Map();
    for (const row of secondLevelDiscovered) if (!secondLevelUniqueLinks.has(row.href)) secondLevelUniqueLinks.set(row.href, row);
    const secondLevelResidual = [...secondLevelUniqueLinks.values()].filter(row => !secondLevelProbedUrls.has(row.href));
    const secondLevelRelevantResidual = secondLevelResidual.filter(row => row.relevant === true);
    const secondLevelFileSuffixes = new Set(['.csv','.doc','.docx','.json','.pdf','.txt','.xls','.xlsx','.xml','.zip']);
    const secondLevelResidualFiles = secondLevelRelevantResidual.filter(row => {
      try { return secondLevelFileSuffixes.has(path.posix.extname(new URL(row.href).pathname).toLowerCase()); } catch { return false; }
    });
    check(secondLevelResidual.length === 101 && manifest.counts.schoolhouse_charity_nc_second_level_residual_unique_links === 101, 'second-level residual-unique denominator drift');
    check(secondLevelRelevantResidual.length === 51 && manifest.counts.schoolhouse_charity_nc_second_level_residual_relevant_links === 51, 'second-level residual-relevant denominator drift');
    check(secondLevelResidualFiles.length === 16 && manifest.counts.schoolhouse_charity_nc_second_level_residual_file_links === 16, 'second-level residual-file denominator drift');

    check(secondLevelCustody.acquisition.workflow_run_id === ${WORKFLOW_RUN_ID} && secondLevelCustody.acquisition.artifact_id === ${ARTIFACT_ID} && secondLevelCustody.acquisition.artifact_digest === '${ARTIFACT_DIGEST}' && secondLevelCustody.acquisition.acquisition_head === '${ACQUISITION_HEAD}', 'second-level acquisition custody drift');
    check(secondLevelCustody.bounds.maximum_followed_routes === 80 && secondLevelCustody.bounds.maximum_depth === 2 && secondLevelCustody.bounds.followed_route_cap_exhausted === true && secondLevelCustody.bounds.depth_two_routes_followed === 0, 'second-level bound custody drift');
    check(secondLevelCustody.counts.terminal_route_rows === 88 && secondLevelCustody.counts.discovered_link_rows === 524 && secondLevelCustody.counts.unique_discovered_links === 185 && secondLevelCustody.counts.bounded_file_sample_routes === 68 && secondLevelCustody.counts.html_surface_rows === 19 && secondLevelCustody.counts.form_rows === 3, 'second-level custody denominator drift');
    check(secondLevelCustody.counts.residual_unique_links === 101 && secondLevelCustody.counts.residual_relevant_links === 51 && secondLevelCustody.counts.residual_file_links === 16, 'second-level custody residual drift');
    check(secondLevelCustody.florida.check_a_charity_state === 'timeout' && secondLevelCustody.florida.query_submissions === 0 && secondLevelCustody.florida.automation_permission_inferred === false, 'second-level Florida custody drift');
    check(secondLevelCustody.north_carolina.automated_or_scripted_interactive_searches_not_permitted === true && secondLevelCustody.north_carolina.interactive_search_submissions === 0, 'second-level North Carolina policy custody drift');
    check(secondLevelCustody.privacy.raw_source_retained === false && secondLevelCustody.privacy.hidden_form_values_retained === false && secondLevelCustody.privacy.street_address_rows_retained === 0 && secondLevelCustody.privacy.contact_detail_rows_retained === 0 && secondLevelCustody.privacy.private_support_rows === 0, 'second-level custody privacy drift');
    check(secondLevelCustody.public_schoolhouse_identity_admitted === false && secondLevelCustody.negative_existence_claim_created === false && secondLevelCustody.outside_human_dependency === false && secondLevelCustody.publication_effect === 'none' && secondLevelCustody.adoption_effect === 'none' && secondLevelCustody.graph_effect === 'none' && secondLevelCustody.promotes_to === 'candidate_only', 'second-level custody authority drift');

    const secondLevelProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_second_level_route_discovery;
    check(secondLevelProjection?.terminal_route_rows === 88 && secondLevelProjection?.discovered_link_rows === 524 && secondLevelProjection?.residual_relevant_links === 51 && secondLevelProjection?.residual_file_links === 16, 'School.House second-level projection drift');
    check(secondLevelProjection?.identity_state === 'unresolved_after_terminal_second_level_static_route_discovery_no_public_identity_admitted' && secondLevelProjection?.admitted_legal_name === null && secondLevelProjection?.admitted_ein === null, 'School.House second-level identity authority drift');
    const secondLevelFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_second_level_route_discovery;
    check(secondLevelFrontier?.terminal_route_rows === 88 && secondLevelFrontier?.residual_relevant_links === 51 && secondLevelFrontier?.residual_file_links === 16 && secondLevelFrontier?.admitted_identities === 0, 'School.House second-level frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina second-level static-route discovery' && row.enumerated_total === 88 && row.residual_relevant_links === 51 && row.residual_file_links === 16 && row.search_submissions === 0), 'second-level coverage denominator missing');
  }
`;
const returnAnchor = '\n  return errors;\n}';
const returnIndex = validator.lastIndexOf(returnAnchor);
if (returnIndex === -1) fail('validator return anchor missing');
if (validator.includes('schoolhouse-charity-nc-second-level-route-custody@1')) fail('second-level validator block already exists');
validator = validator.slice(0, returnIndex) + validationBlock + validator.slice(returnIndex);
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  schema_version: 'schoolhouse-charity-nc-second-level-route-custody-build@1',
  source_inventory_rows: manifest.counts.source_inventory_rows,
  root_routes: roots.length,
  followed_routes: followed.length,
  terminal_route_rows: allRoutes.length,
  discovered_link_rows: discovered.length,
  unique_discovered_links: uniqueDiscoveredByUrl.size,
  bounded_file_sample_routes: summary.file_sample_routes,
  html_surfaces: htmlSurfaces.length,
  forms: forms.length,
  residual_unique_links: residualUnique.length,
  residual_relevant_links: residualRelevant.length,
  residual_file_links: residualFiles.length,
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  outside_human_dependency: false,
  graph_effect: 'none'
}, null, 2));
