import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ROUTE_ARTIFACT_DIR = path.resolve(process.argv[2] || '');
const FICTITIOUS_ARTIFACT_DIR = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !fs.existsSync(ROUTE_ARTIFACT_DIR) || !process.argv[3] || !fs.existsSync(FICTITIOUS_ARTIFACT_DIR)) {
  throw new Error(
    'usage: node tools/build-schoolhouse-state-registry-custody.mjs <route-artifact-dir> <fictitious-artifact-dir>'
  );
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const SOURCE_PART = 'source-inventory-08.jsonl';
const ROUTE_RESULTS_FILE = 'state-registry-route-results.jsonl';
const ROUTE_CUSTODY_FILE = 'state-registry-route-custody.json';
const FICTITIOUS_SOURCE_FILE = 'schoolhouse-fl-fictitious-source-receipt.json';
const FICTITIOUS_MEMBER_FILE = 'schoolhouse-fl-fictitious-member-inventory.jsonl';
const FICTITIOUS_CANDIDATE_FILE = 'schoolhouse-fl-fictitious-candidates.jsonl';
const FICTITIOUS_ADJUDICATION_FILE = 'schoolhouse-fl-fictitious-adjudication.json';

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
const parseInteger = value => /^\d+$/.test(String(value || '')) ? Number(value) : null;
const replaceExact = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected one replacement anchor, found ${count}`);
  return source.replace(before, after);
};

const manifest = readJson(MANIFEST_PATH);
const schoolhouse = readJson(SCHOOLHOUSE_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

const routeSummary = readJson(path.join(ROUTE_ARTIFACT_DIR, 'summary.json'));
const routePolicy = readJson(path.join(ROUTE_ARTIFACT_DIR, 'route-policy.json'));
const routeArtifactRows = readJsonl(path.join(ROUTE_ARTIFACT_DIR, 'route-receipts.jsonl'));
const fictitiousSummary = readJson(path.join(FICTITIOUS_ARTIFACT_DIR, 'summary.json'));
const fictitiousSourceArtifact = readJson(path.join(FICTITIOUS_ARTIFACT_DIR, 'source-receipt.json'));
const fictitiousMemberArtifact = readJsonl(path.join(FICTITIOUS_ARTIFACT_DIR, 'member-inventory.jsonl'));
const fictitiousCandidateArtifact = readJsonl(path.join(FICTITIOUS_ARTIFACT_DIR, 'fictitious-name-candidates.jsonl'));
const fictitiousExactTests = readJson(path.join(FICTITIOUS_ARTIFACT_DIR, 'exact-tests.json'));

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 95) fail('expected 95 source rows before state-registry custody');
if (manifest.counts.schoolhouse_irs_candidate_rows !== 641) fail('IRS predecessor candidate count drift');
if (manifest.counts.schoolhouse_irs_admitted_identity_rows !== 0) fail('IRS predecessor identity authority drift');
if (schoolhouse.irs_legal_identity_census?.identity_state !== 'unresolved_no_registry_candidate_admitted') {
  fail('School.House IRS predecessor state drift');
}
if (schoolhouse.state_registry_identity_census) fail('state-registry custody already exists');

if (routeSummary.declared_routes !== 16 || routeSummary.route_receipts !== 16 || routeSummary.all_routes_terminal !== true) {
  fail('state-registry route artifact is not terminal');
}
if (routeArtifactRows.length !== 16 || new Set(routeArtifactRows.map(row => row.route_id)).size !== 16) {
  fail('state-registry route denominator drift');
}
if (routeSummary.north_carolina_search_submissions !== 0 || routeSummary.florida_charity_search_submissions !== 0) {
  fail('state-registry probe submitted a prohibited or unbounded search');
}
if (routeSummary.source_rows_acquired !== 0 || routeSummary.identity_admitted !== false) {
  fail('route probe must acquire no identity rows and admit no identity');
}
if (routePolicy.north_carolina.interactive_search_automation_permitted !== false) {
  fail('North Carolina automation policy boundary drift');
}
if (routePolicy.north_carolina.business_search_submissions !== 0 || routePolicy.north_carolina.charity_search_submissions !== 0) {
  fail('North Carolina search-submission boundary drift');
}

if (fictitiousSummary.source_bytes !== 74_947_584) fail('Florida fictitious source byte-count drift');
if (fictitiousSummary.source_sha256 !== '38576d314638f16d074d963eb6fba784de095ca2146c04016638a43fe48da113') {
  fail('Florida fictitious source SHA-256 drift');
}
if (fictitiousSummary.source_rows_scanned !== 761_040 || fictitiousSummary.candidate_rows !== 29) {
  fail('Florida fictitious denominator drift');
}
if (fictitiousSummary.exact_public_name_candidates !== 0 || fictitiousSummary.tampa_bay_city_candidates !== 2) {
  fail('Florida fictitious exact-test drift');
}
if (fictitiousSummary.filed_2023_or_later_candidates !== 16) fail('Florida fictitious filing-year denominator drift');
if (fictitiousSummary.unique_owner_charter_numbers !== 15 || fictitiousSummary.unique_owner_feis !== 15) {
  fail('Florida fictitious owner-identifier denominator drift');
}
if (fictitiousSummary.all_members_scanned !== true || fictitiousSummary.identity_admitted !== false) {
  fail('Florida fictitious artifact is not terminal and graph-inert');
}
if (fictitiousMemberArtifact.length !== 1 || fictitiousMemberArtifact[0].row_count !== 761_040) {
  fail('Florida fictitious member inventory drift');
}
if (fictitiousMemberArtifact[0].record_framing !== 'fixed_width_with_embedded_linebreak_reassembly') {
  fail('Florida fictitious record-framing custody drift');
}
if (fictitiousMemberArtifact[0].direct_record_count !== 761_000 || fictitiousMemberArtifact[0].reassembled_record_count !== 40) {
  fail('Florida fictitious reassembly denominator drift');
}
if (fictitiousMemberArtifact[0].physical_line_count !== 761_101 || fictitiousMemberArtifact[0].fragment_line_count !== 101) {
  fail('Florida fictitious physical-line denominator drift');
}
if (fictitiousMemberArtifact[0].reassembly_mode_counts?.join_fragments_with_lf !== 40) {
  fail('Florida fictitious reassembly mode drift');
}
if (fictitiousCandidateArtifact.length !== 29 || new Set(fictitiousCandidateArtifact.map(row => row.candidate_id)).size !== 29) {
  fail('Florida fictitious candidate denominator drift');
}
if (fictitiousExactTests.exact_public_name_candidate_count !== 0 || fictitiousExactTests.filed_2023_or_later_candidate_count !== 16) {
  fail('Florida fictitious adjudication input drift');
}

for (const file of [
  SOURCE_PART,
  ROUTE_RESULTS_FILE,
  ROUTE_CUSTODY_FILE,
  FICTITIOUS_SOURCE_FILE,
  FICTITIOUS_MEMBER_FILE,
  FICTITIOUS_CANDIDATE_FILE,
  FICTITIOUS_ADJUDICATION_FILE
]) {
  if (fs.existsSync(path.join(DIR, file))) fail(`permanent path already exists: ${file}`);
}

const routeById = new Map(routeArtifactRows.map(row => [row.route_id, row]));
const requireRoute = routeId => {
  const row = routeById.get(routeId);
  if (!row) fail(`missing route artifact row: ${routeId}`);
  return row;
};
const receiptIds = {
  quarterlyReference: 'r-fl-sunbiz-quarterly-data-reference-2026-08-05',
  corporateSchema: 'r-fl-sunbiz-corporate-definition-2026-08-05',
  fictitiousSchema: 'r-fl-sunbiz-fictitious-definition-2026-08-05',
  floridaCharity: 'r-fl-fdacs-check-a-charity-2026-08-05',
  ncBusinessPolicy: 'r-nc-sos-business-search-policy-2026-08-05',
  ncCharityPolicy: 'r-nc-sos-charity-search-policy-2026-08-05',
  ncReports: 'r-nc-sos-reports-listings-2026-08-05',
  corporateBulk: 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05',
  fictitiousBulk: 'r-fl-sunbiz-quarterly-fictitious-bulk-2026-08-05'
};
const routeReceiptMap = {
  'fl-sunbiz-quarterly-reference': receiptIds.quarterlyReference,
  'fl-sunbiz-corporate-definition': receiptIds.corporateSchema,
  'fl-sunbiz-fictitious-definition': receiptIds.fictitiousSchema,
  'fl-fdacs-check-a-charity': receiptIds.floridaCharity,
  'nc-sos-business-search-policy': receiptIds.ncBusinessPolicy,
  'nc-sos-charity-search-policy': receiptIds.ncCharityPolicy,
  'nc-sos-reports-and-listings': receiptIds.ncReports,
  'fl-sftp-portal-root': receiptIds.quarterlyReference,
  'fl-cor-https-home-path': receiptIds.corporateBulk,
  'fl-cor-https-public-path': receiptIds.corporateBulk,
  'fl-fic-https-home-path': receiptIds.fictitiousBulk,
  'fl-fic-https-public-path': receiptIds.fictitiousBulk,
  'fl-cor-sftp-home-path': receiptIds.corporateBulk,
  'fl-cor-sftp-public-path': receiptIds.corporateBulk,
  'fl-fic-sftp-home-path': receiptIds.fictitiousBulk,
  'fl-fic-sftp-public-path': receiptIds.fictitiousBulk
};
const errorClass = row => {
  if (row.state === 'provider_blocked') return `provider_http_${row.status || 'blocked'}`;
  if (row.state === 'auth_required') return `provider_http_${row.status || 401}`;
  if (row.state === 'not_found') return `provider_http_${row.status || 404}`;
  if (row.state === 'transport_error' && row.method === 'SFTP_RANGE_0_0') return 'strict_ssh_host_key_not_recognized';
  if (row.state === 'transport_error') return 'transport_error';
  return null;
};

const routeResults = routeArtifactRows.map(row => ({
  route_id: row.route_id,
  receipt_id: routeReceiptMap[row.route_id],
  jurisdiction: row.jurisdiction,
  surface: row.surface,
  requested_url: row.url,
  final_url: row.final_url || null,
  method: row.method_executed || row.method,
  state: row.state,
  http_status: row.status ?? null,
  returncode: row.returncode ?? null,
  content_type: row.content_type || null,
  content_length: parseInteger(row.content_length_header),
  content_range: row.content_range || null,
  last_modified: row.last_modified || null,
  content_disposition: row.content_disposition || null,
  sample_bytes: row.sample_bytes || 0,
  sample_sha256: row.sample_sha256 || null,
  public_credentials_used: row.public_credentials_used === true,
  query_submitted: false,
  source_rows_acquired: 0,
  raw_source_retained: false,
  street_address_rows_retained: 0,
  contact_detail_rows_retained: 0,
  identity_admitted: false,
  error_class: errorClass(row),
  publisher_policy_boundary: row.jurisdiction === 'North Carolina'
    ? 'automated interactive searches not permitted; no search was submitted'
    : null,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
})).sort((a, b) => a.route_id.localeCompare(b.route_id));
if (routeResults.some(row => !row.receipt_id)) fail('route result lacks a source receipt mapping');
writeJsonl(path.join(DIR, ROUTE_RESULTS_FILE), routeResults);

const stateRegistryCustody = {
  schema_version: 'schoolhouse-state-registry-route-custody@1',
  as_of: '2026-08-05',
  route_probe: {
    workflow_run_id: 30973871220,
    artifact_id: 8917541589,
    artifact_digest: 'sha256:02f718c9250be32fac6a6259919bbd3490c1d649f7fb545073756d93436c77ee',
    head_sha: 'f4cacb912a8313775b50bceb79d46aecb4428b91'
  },
  counts: {
    declared_routes: 16,
    terminal_route_rows: 16,
    florida_routes: 13,
    north_carolina_routes: 3,
    north_carolina_search_submissions: 0,
    florida_charity_search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    state_counts: countBy(routeResults, 'state')
  },
  florida: {
    official_bulk_reference_receipt_id: receiptIds.quarterlyReference,
    corporate_schema_receipt_id: receiptIds.corporateSchema,
    fictitious_schema_receipt_id: receiptIds.fictitiousSchema,
    accessible_bulk_routes: [
      {
        route_id: 'fl-cor-https-public-path',
        receipt_id: receiptIds.corporateBulk,
        url: requireRoute('fl-cor-https-public-path').url,
        content_length: 1_819_049_954,
        acquisition_state: 'accessible_not_acquired'
      },
      {
        route_id: 'fl-fic-https-public-path',
        receipt_id: receiptIds.fictitiousBulk,
        url: requireRoute('fl-fic-https-public-path').url,
        content_length: 74_947_584,
        acquisition_state: 'captured_and_scanned_in_successor_census'
      }
    ],
    rejected_path_variants: ['fl-cor-https-home-path', 'fl-fic-https-home-path'],
    public_portal_root_state: 'auth_required_http_401',
    sftp_state: 'strict_host_key_validation_refused_unrecognized_key',
    weakened_host_key_policy_used: false,
    charity_search_submissions: 0,
    charity_surface_state: requireRoute('fl-fdacs-check-a-charity').state
  },
  north_carolina: {
    interactive_search_automation_permitted: false,
    business_search_state: requireRoute('nc-sos-business-search-policy').state,
    charity_search_state: requireRoute('nc-sos-charity-search-policy').state,
    reports_and_listings_state: requireRoute('nc-sos-reports-and-listings').state,
    business_search_submissions: 0,
    charity_search_submissions: 0,
    allowed_next_surfaces: routePolicy.north_carolina.allowed_next_surfaces,
    policy_basis: routePolicy.north_carolina.policy_basis
  },
  interpretation: {
    route_access_is_not_identity_evidence: true,
    provider_failure_is_not_absence: true,
    publisher_automation_policy_must_not_be_bypassed: true,
    accessible_bulk_file_is_not_an_admitted_legal_entity: true,
    forbidden_inference: 'A route result, public credential, transport error, or accessible bulk file does not establish the School.House legal entity.'
  },
  privacy: {
    raw_source_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0
  },
  route_file: ROUTE_RESULTS_FILE,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, ROUTE_CUSTODY_FILE), stateRegistryCustody);

const sourceRows = [
  {
    receipt_id: receiptIds.quarterlyReference,
    route_id: 'fl-sunbiz-quarterly-reference',
    evidence_class: 'official',
    locator_url: requireRoute('fl-sunbiz-quarterly-reference').url,
    retrieved_at: requireRoute('fl-sunbiz-quarterly-reference').probed_at,
    content_sha256: requireRoute('fl-sunbiz-quarterly-reference').sample_sha256,
    source_state: 'captured_route_surface',
    note: 'Official Florida Division of Corporations quarterly-data reference and public bulk-access instructions.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.corporateSchema,
    route_id: 'fl-sunbiz-corporate-definition',
    evidence_class: 'official',
    locator_url: requireRoute('fl-sunbiz-corporate-definition').url,
    retrieved_at: requireRoute('fl-sunbiz-corporate-definition').probed_at,
    content_sha256: requireRoute('fl-sunbiz-corporate-definition').sample_sha256,
    source_state: 'captured_route_surface',
    note: 'Official Florida corporate bulk-file field definition.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.fictitiousSchema,
    route_id: 'fl-sunbiz-fictitious-definition',
    evidence_class: 'official',
    locator_url: requireRoute('fl-sunbiz-fictitious-definition').url,
    retrieved_at: requireRoute('fl-sunbiz-fictitious-definition').probed_at,
    content_sha256: requireRoute('fl-sunbiz-fictitious-definition').sample_sha256,
    source_state: 'captured_route_surface',
    note: 'Official Florida fictitious-name bulk-file field definition, including the 2,098-character record layout.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.floridaCharity,
    route_id: 'fl-fdacs-check-a-charity',
    evidence_class: 'official',
    locator_url: requireRoute('fl-fdacs-check-a-charity').url,
    retrieved_at: requireRoute('fl-fdacs-check-a-charity').probed_at,
    content_sha256: requireRoute('fl-fdacs-check-a-charity').sample_sha256 || null,
    source_state: 'source_unavailable_after_search',
    note: 'Official Florida charity-search surface; route timed out and no organization-name query was submitted.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.ncBusinessPolicy,
    route_id: 'nc-sos-business-search-policy',
    evidence_class: 'official',
    locator_url: requireRoute('nc-sos-business-search-policy').url,
    retrieved_at: requireRoute('nc-sos-business-search-policy').probed_at,
    content_sha256: requireRoute('nc-sos-business-search-policy').sample_sha256 || null,
    source_state: 'provider_blocked_no_query',
    note: 'Official North Carolina business-search surface and publisher automation boundary; no scripted search was submitted.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.ncCharityPolicy,
    route_id: 'nc-sos-charity-search-policy',
    evidence_class: 'official',
    locator_url: requireRoute('nc-sos-charity-search-policy').url,
    retrieved_at: requireRoute('nc-sos-charity-search-policy').probed_at,
    content_sha256: requireRoute('nc-sos-charity-search-policy').sample_sha256 || null,
    source_state: 'provider_blocked_no_query',
    note: 'Official North Carolina charity-search surface and publisher automation boundary; no scripted search was submitted.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.ncReports,
    route_id: 'nc-sos-reports-and-listings',
    evidence_class: 'official',
    locator_url: requireRoute('nc-sos-reports-and-listings').url,
    retrieved_at: requireRoute('nc-sos-reports-and-listings').probed_at,
    content_sha256: requireRoute('nc-sos-reports-and-listings').sample_sha256,
    source_state: 'captured_route_surface',
    note: 'Official North Carolina reports-and-listings surface retained as the lawful bulk or downloadable continuation route.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.corporateBulk,
    route_id: 'fl-cor-https-public-path',
    evidence_class: 'official',
    locator_url: requireRoute('fl-cor-https-public-path').url,
    retrieved_at: requireRoute('fl-cor-https-public-path').probed_at,
    content_sha256: null,
    source_state: 'route_accessible_not_acquired',
    note: 'Official Florida quarterly corporate bulk file; exact authenticated HTTPS route accessible at 1,819,049,954 bytes and not blindly downloaded in this pass.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: receiptIds.fictitiousBulk,
    route_id: 'fl-fic-https-public-path',
    evidence_class: 'official',
    locator_url: fictitiousSourceArtifact.source_url,
    retrieved_at: fictitiousSourceArtifact.retrieved_at,
    content_sha256: fictitiousSummary.source_sha256,
    source_state: 'captured_and_scanned',
    note: 'Official Florida quarterly fictitious-name bulk file; 761,040 records scanned and 29 privacy-minimized School.House phrase candidates retained.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  }
];
if (sourceRows.length !== 9 || new Set(sourceRows.map(row => row.receipt_id)).size !== 9) {
  fail('state-registry source-inventory addition drift');
}
writeJsonl(path.join(DIR, SOURCE_PART), sourceRows);

const permanentFictitiousSource = {
  ...fictitiousSourceArtifact,
  schema_version: 'schoolhouse-fl-fictitious-source-receipt@1',
  acquisition: {
    workflow_run_id: 30975014198,
    artifact_id: 8917930934,
    artifact_digest: 'sha256:6a5d293dbd18cf41ae189406653eccb0021eb0506fc81db40d8e91d9d334f5bc',
    head_sha: '28f80cab557fc28aa5e4e1397626d5289d052cb9'
  },
  receipt_id: receiptIds.fictitiousBulk,
  source_rows_scanned: 761_040,
  candidate_rows_retained: 29,
  exact_public_name_candidates: 0,
  raw_source_retained: false,
  public_credential_password_retained: false,
  street_address_rows_retained: 0,
  postal_code_rows_retained: 0,
  contact_detail_rows_retained: 0,
  private_support_rows: 0,
  identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, FICTITIOUS_SOURCE_FILE), permanentFictitiousSource);
writeJsonl(path.join(DIR, FICTITIOUS_MEMBER_FILE), fictitiousMemberArtifact);

const permanentCandidates = fictitiousCandidateArtifact
  .map(row => ({ ...row, receipt_id: receiptIds.fictitiousBulk }))
  .sort((a, b) => a.normalized_fictitious_name.localeCompare(b.normalized_fictitious_name)
    || String(a.filing_date).localeCompare(String(b.filing_date))
    || a.candidate_id.localeCompare(b.candidate_id));
writeJsonl(path.join(DIR, FICTITIOUS_CANDIDATE_FILE), permanentCandidates);

const compactCandidate = row => ({
  candidate_id: row.candidate_id,
  document_number: row.document_number,
  fictitious_name_as_recorded: row.fictitious_name_as_recorded,
  city: row.city,
  state: row.state,
  filing_date: row.filing_date,
  status: row.status,
  owner_names_as_recorded: row.owners.map(owner => owner.owner_name_as_recorded).filter(Boolean),
  owner_charter_numbers: row.owners.map(owner => owner.owner_charter_number).filter(Boolean),
  disposition: 'phrase_candidate_not_admitted'
});
const permanentAdjudication = {
  schema_version: 'schoolhouse-fl-fictitious-adjudication@1',
  as_of: '2026-08-05',
  public_source_claims_used_for_adjudication: {
    public_name: 'School.House',
    founded_claim: 2023,
    location_claims: ['Tampa Bay', 'Fayetteville'],
    boundary: 'A public brand, broad location, or phrase match does not establish a Florida fictitious name, corporate filer, legal entity, or EIN.'
  },
  route_custody: {
    route_file: ROUTE_RESULTS_FILE,
    custody_file: ROUTE_CUSTODY_FILE,
    route_probe_workflow_run_id: 30973871220,
    declared_routes: 16,
    north_carolina_search_submissions: 0,
    florida_charity_search_submissions: 0
  },
  acquisition_history: [
    {
      attempt: 1,
      workflow_run_id: 30974231051,
      artifact_id: 8917660266,
      artifact_digest: 'sha256:c722a80c36f1c9b07afd06a3589ebe0af0cb3e29749b24692ab6c4e4f2846787',
      state: 'fixed_span_parser_failed_at_mixed_record_separator'
    },
    {
      attempt: 2,
      workflow_run_id: 30974386664,
      artifact_id: 8917720602,
      artifact_digest: 'sha256:f2d79c331053ad77aba07778b41b3bf83bfe6738d719668379fa09bd992bdd79',
      state: 'flexible_separator_scan_completed_but_created_boundary_drift'
    },
    {
      attempt: 3,
      workflow_run_id: 30974566059,
      artifact_id: 8917775906,
      artifact_digest: 'sha256:f79aa321987b2b2c169d6db1ab7fc75c7bd78da78fa3fa66660f1b7c2d03e366',
      state: 'physical_line_scan_identified_101_fragments_across_40_records'
    },
    {
      attempt: 4,
      workflow_run_id: 30974744337,
      artifact_id: 8917833644,
      artifact_digest: 'sha256:30b76f1ffc27c5c98a38b06f1208403f587b04458f4fbf82a7e07140d7ac3c4d',
      state: 'first_fragment_reassembly_overcounted_embedded_linebreak_bytes'
    },
    {
      attempt: 5,
      workflow_run_id: 30974871690,
      artifact_id: 8917890060,
      artifact_digest: 'sha256:8f0dca451a7756408e54d31f1ce9a4ea0b591d515edc43cee4fcc53a1cfa72aa',
      state: 'terminal_record_reassembly_stale_filing_year_classifier'
    },
    {
      attempt: 6,
      workflow_run_id: 30975014198,
      artifact_id: 8917930934,
      artifact_digest: 'sha256:6a5d293dbd18cf41ae189406653eccb0021eb0506fc81db40d8e91d9d334f5bc',
      state: 'terminal_exact_denominator_and_filing_year_census'
    }
  ],
  source_denominator: {
    receipt_id: receiptIds.fictitiousBulk,
    source_bytes: 74_947_584,
    source_sha256: fictitiousSummary.source_sha256,
    archive_members: 1,
    source_rows_scanned: 761_040,
    physical_lines: 761_101,
    direct_records: 761_000,
    reassembled_records: 40,
    embedded_linebreak_fragments: 101,
    candidate_rows: 29
  },
  exact_tests: {
    exact_public_name_candidate_count: 0,
    exact_public_name_candidates: [],
    tampa_bay_city_candidate_count: 2,
    tampa_bay_city_candidates: fictitiousExactTests.tampa_bay_city_candidates.map(compactCandidate),
    filed_2023_or_later_candidate_count: 16,
    filed_2023_or_later_candidates: fictitiousExactTests.filed_2023_or_later_candidates.map(compactCandidate),
    unique_owner_charter_numbers: fictitiousExactTests.unique_owner_charter_numbers,
    unique_owner_feis: fictitiousExactTests.unique_owner_feis
  },
  identity_decision: {
    state: 'unresolved_no_florida_fictitious_name_identity_admitted',
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_owner_charter_number: null,
    rationale: 'The complete quarterly file contains no exact School.House public-name candidate. Two Tampa phrase candidates have distinct names and uses; neither is admitted. Phrase matches and owner identifiers remain follow-up routes only.',
    scope_boundary: 'This decision is complete only for the declared Florida quarterly fictitious-name source and name battery. It does not prove that School.House lacks a Florida corporation, charity registration, fiscal sponsor, differently named legal entity, or North Carolina record.'
  },
  next_transition: {
    action: 'Resolve the fifteen owner charter numbers against the official Florida corporate plane to reject or type phrase candidates, then continue through lawful Florida charity and North Carolina report or bulk surfaces without scripted interactive searches.',
    forbidden_inference: 'An owner charter number attached to a phrase candidate is not automatically the School.House legal entity or governing organization.',
    outside_human_dependency: false
  },
  privacy: {
    raw_source_retained: false,
    street_address_rows_retained: 0,
    postal_code_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0
  },
  receipt_ids: Object.values(receiptIds),
  candidate_file: FICTITIOUS_CANDIDATE_FILE,
  source_receipt_file: FICTITIOUS_SOURCE_FILE,
  member_inventory_file: FICTITIOUS_MEMBER_FILE,
  identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, FICTITIOUS_ADJUDICATION_FILE), permanentAdjudication);

schoolhouse.as_of = '2026-08-05';
schoolhouse.coverage_state = 'bounded_current_surfaces_plus_one_dated_demo_day_plus_registry_candidate_custody';
schoolhouse.state_registry_identity_census = {
  as_of: '2026-08-05',
  route_probe_rows: 16,
  route_probe_terminal_rows: 16,
  north_carolina_search_submissions: 0,
  florida_charity_search_submissions: 0,
  florida_fictitious_source_rows_scanned: 761_040,
  florida_fictitious_candidate_rows: 29,
  exact_public_name_candidate_rows: 0,
  tampa_bay_phrase_candidate_rows: 2,
  filed_2023_or_later_candidate_rows: 16,
  unique_owner_charter_numbers: 15,
  unique_owner_feis: 15,
  identity_state: 'unresolved_no_florida_fictitious_name_identity_admitted',
  admitted_document_number: null,
  admitted_legal_name: null,
  receipt_ids: Object.values(receiptIds),
  route_file: ROUTE_RESULTS_FILE,
  route_custody_file: ROUTE_CUSTODY_FILE,
  source_receipt_file: FICTITIOUS_SOURCE_FILE,
  member_inventory_file: FICTITIOUS_MEMBER_FILE,
  candidate_file: FICTITIOUS_CANDIDATE_FILE,
  adjudication_file: FICTITIOUS_ADJUDICATION_FILE,
  boundary: 'The route custody and Florida fictitious-name census create no legal-identity join. The complete phrase pass contains no exact public-name candidate, and the two Tampa phrase candidates remain distinct and not admitted.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
frontier.as_of = '2026-08-05';
schoolhouseTask.prior_state_registry_custody = {
  route_probe_rows: 16,
  terminal_route_rows: 16,
  north_carolina_search_submissions: 0,
  florida_charity_search_submissions: 0,
  florida_fictitious_source_rows_scanned: 761_040,
  florida_fictitious_candidate_rows: 29,
  exact_public_name_candidate_rows: 0,
  tampa_bay_phrase_candidate_rows: 2,
  filed_2023_or_later_candidate_rows: 16,
  unique_owner_charter_numbers: 15,
  admitted_identities: 0,
  state: 'unresolved_no_florida_fictitious_name_identity_admitted',
  route_custody_file: ROUTE_CUSTODY_FILE,
  adjudication_file: FICTITIOUS_ADJUDICATION_FILE
};
schoolhouseTask.next_transition = 'Resolve the fifteen owner charter numbers through the official Florida corporate plane, use the accessible Florida charity surface only through a lawful bounded route, and continue through North Carolina reports, listings, subscriptions, or distinct official downloads without scripted interactive searches. Preserve exact rejections and admit no entity without identifier-grade convergence.';
writeJson(FRONTIER_PATH, frontier);

coverage.as_of = '2026-08-05';
if (coverage.denominators.some(row => row.surface === 'School.House state-registry lawful-route probe')) {
  fail('state-registry coverage denominator already exists');
}
coverage.denominators.push(
  {
    surface: 'School.House state-registry lawful-route probe',
    declared_total: 16,
    enumerated_total: 16,
    coverage_state: 'terminal_route_custody_zero_search_submissions'
  },
  {
    surface: 'Florida quarterly fictitious-name School.House phrase census',
    declared_total: 761_040,
    enumerated_total: 761_040,
    candidate_total: 29,
    coverage_state: 'surface_complete_sanitized_candidate_census'
  }
);
coverage.explicit_nulls_and_gaps.push(
  'School.House exact legal entity remains unresolved after 761,040 Florida fictitious-name records produced 29 phrase candidates, zero exact public-name candidates, and two distinct Tampa phrase candidates; no fictitious-name identity was admitted',
  'Florida corporate follow-up for fifteen owner charter numbers remains open; the Florida charity search route timed out without a query, and North Carolina interactive business and charity searches remain unsubmitted under the publisher automation prohibition'
);
writeJson(COVERAGE_PATH, coverage);

manifest.as_of = '2026-08-05';
manifest.boundaries.push(
  'A state-registry route result, fictitious-name phrase match, owner name, FEI, or charter number is not a legal-identity join.',
  'Publisher automation prohibitions and strict transport validation are custody boundaries and may not be bypassed.'
);
manifest.counts.source_inventory_rows = 104;
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.state_registry_route_result_rows = 16;
manifest.counts.state_registry_search_submissions = 0;
manifest.counts.fl_fictitious_source_rows = 761_040;
manifest.counts.fl_fictitious_candidate_rows = 29;
manifest.counts.fl_fictitious_exact_public_name_rows = 0;
manifest.counts.fl_fictitious_tampa_bay_candidate_rows = 2;
manifest.counts.fl_fictitious_post_2023_candidate_rows = 16;
manifest.counts.fl_fictitious_owner_charter_numbers = 15;
manifest.counts.fl_fictitious_owner_feis = 15;
manifest.counts.state_registry_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_state_registry_routes = '16_of_16_terminal_zero_search_submissions';
manifest.coverage.schoolhouse_fl_fictitious_identity = '761040_rows_29_phrase_candidates_zero_exact_public_name_two_tampa_zero_admitted_identity';
manifest.custody.next_waterline = 'corporate_owner_identifier_resolution_charity_registry_and_source_archival';
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, coverage nulls, and deterministic continuation work.';
if (!manifest.storage_contract.source_inventory_parts.includes(SOURCE_PART)) {
  manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
}
manifest.storage_contract.schoolhouse_state_registry_route_results = ROUTE_RESULTS_FILE;
manifest.storage_contract.schoolhouse_fl_fictitious_candidate_file = FICTITIOUS_CANDIDATE_FILE;

const allSourceInventory = manifest.storage_contract.source_inventory_parts
  .flatMap(file => readJsonl(path.join(DIR, file)));
manifest.source_inventory.evidence_class_counts = countBy(allSourceInventory, 'evidence_class');
manifest.source_inventory.source_state_counts = countBy(allSourceInventory, 'source_state');

for (const file of [
  SOURCE_PART,
  ROUTE_RESULTS_FILE,
  ROUTE_CUSTODY_FILE,
  FICTITIOUS_SOURCE_FILE,
  FICTITIOUS_MEMBER_FILE,
  FICTITIOUS_CANDIDATE_FILE,
  FICTITIOUS_ADJUDICATION_FILE
]) {
  manifest.files[file] = { bytes: 0, sha256: '' };
}
for (const filename of Object.keys(manifest.files)) {
  const file = path.join(DIR, filename);
  if (!fs.existsSync(file)) fail(`manifest-bound file missing before rehash: ${filename}`);
  manifest.files[filename] = fileRecord(file);
}
writeJson(MANIFEST_PATH, manifest);

readme = replaceExact(
  readme,
  'public-source receipts                         95',
  'public-source receipts                        104',
  'README source-receipt count'
);
readme = replaceExact(
  readme,
  'IRS identities admitted                             0\n',
  'IRS identities admitted                             0\nstate-registry route dispositions                 16 / 16\nstate-registry scripted searches                      0\nFlorida fictitious-name rows scanned             761,040\nFlorida fictitious-name phrase candidates             29\nFlorida exact public-name candidates                   0\nFlorida Tampa Bay phrase candidates                    2\nFlorida post-2023 phrase candidates                   16\nstate-registry identities admitted                     0\n',
  'README state-registry counts insertion'
);
readme = replaceExact(
  readme,
  '- `schoolhouse-irs-source-routes.jsonl`, the four `schoolhouse-irs-candidates-*.jsonl` shards, and `schoolhouse-irs-identity-adjudication.json` preserve the complete sanitized six-route IRS name-candidate census and the no-admission decision.\n',
  '- `schoolhouse-irs-source-routes.jsonl`, the four `schoolhouse-irs-candidates-*.jsonl` shards, and `schoolhouse-irs-identity-adjudication.json` preserve the complete sanitized six-route IRS name-candidate census and the no-admission decision.\n- `state-registry-route-results.jsonl` and `state-registry-route-custody.json` preserve sixteen lawful Florida and North Carolina route dispositions, zero scripted search submissions, exact accessible bulk paths, publisher policy, and strict transport boundaries.\n- `schoolhouse-fl-fictitious-source-receipt.json`, `schoolhouse-fl-fictitious-member-inventory.jsonl`, `schoolhouse-fl-fictitious-candidates.jsonl`, and `schoolhouse-fl-fictitious-adjudication.json` preserve the exact 761,040-record Florida fictitious-name census, forty repaired embedded-linebreak records, twenty-nine sanitized phrase candidates, and the zero-admission decision.\n',
  'README state-registry files insertion'
);
readme = replaceExact(
  readme,
  'The IRS legal-identity pass scanned 4,428,541 public rows across six complete routes, retained 641 sanitized phrase candidates representing 438 EINs, and admitted no School.House identity. No candidate aligned with the public brand, claimed 2023 founding, and Tampa Bay or Fayetteville location claims strongly enough for an identifier-grade join; the next lawful boundary is the bounded Florida and North Carolina corporate and charity registries.\n',
  'The IRS legal-identity pass scanned 4,428,541 public rows across six complete routes, retained 641 sanitized phrase candidates representing 438 EINs, and admitted no School.House identity. The next pass then completed sixteen lawful state-registry route dispositions with zero scripted searches and scanned all 761,040 records in Florida\'s quarterly fictitious-name file. It retained twenty-nine privacy-minimized phrase candidates, found zero exact public-name candidates, found two distinctly named Tampa phrase candidates, and admitted no state-registry identity. The next lawful boundary is exact corporate resolution of fifteen owner charter numbers, followed by charity and North Carolina bulk or report surfaces that respect publisher automation policy.\n',
  'README state-registry continuation replacement'
);
fs.writeFileSync(README_PATH, readme);

validator = replaceExact(
  validator,
  "  const schoolhouseIrsAdjudication = readJson(path.join(dir, 'schoolhouse-irs-identity-adjudication.json'));\n",
  "  const schoolhouseIrsAdjudication = readJson(path.join(dir, 'schoolhouse-irs-identity-adjudication.json'));\n  const stateRegistryRouteResults = readJsonl(path.join(dir, 'state-registry-route-results.jsonl'));\n  const stateRegistryRouteCustody = readJson(path.join(dir, 'state-registry-route-custody.json'));\n  const schoolhouseFlFictitiousSource = readJson(path.join(dir, 'schoolhouse-fl-fictitious-source-receipt.json'));\n  const schoolhouseFlFictitiousMembers = readJsonl(path.join(dir, 'schoolhouse-fl-fictitious-member-inventory.jsonl'));\n  const schoolhouseFlFictitiousCandidates = readJsonl(path.join(dir, 'schoolhouse-fl-fictitious-candidates.jsonl'));\n  const schoolhouseFlFictitiousAdjudication = readJson(path.join(dir, 'schoolhouse-fl-fictitious-adjudication.json'));\n",
  'validator state-registry reads'
);
validator = replaceExact(
  validator,
  "    schoolhouse_irs_admitted_identity_rows: schoolhouseIrsAdjudication.identity_decision.admitted_ein === null ? 0 : 1\n",
  "    schoolhouse_irs_admitted_identity_rows: schoolhouseIrsAdjudication.identity_decision.admitted_ein === null ? 0 : 1,\n    state_registry_route_result_rows: stateRegistryRouteResults.length,\n    state_registry_search_submissions: stateRegistryRouteResults.filter(row => row.query_submitted).length,\n    fl_fictitious_source_rows: schoolhouseFlFictitiousMembers.reduce((sum, row) => sum + row.row_count, 0),\n    fl_fictitious_candidate_rows: schoolhouseFlFictitiousCandidates.length,\n    fl_fictitious_exact_public_name_rows: schoolhouseFlFictitiousCandidates.filter(row => row.match_basis === 'exact_public_name').length,\n    fl_fictitious_tampa_bay_candidate_rows: schoolhouseFlFictitiousCandidates.filter(row => row.public_tampa_bay_city_match).length,\n    fl_fictitious_post_2023_candidate_rows: schoolhouseFlFictitiousCandidates.filter(row => row.filed_2023_or_later).length,\n    fl_fictitious_owner_charter_numbers: new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_charter_number)).filter(Boolean)).size,\n    fl_fictitious_owner_feis: new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_fei)).filter(Boolean)).size,\n    state_registry_admitted_identity_rows: schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null ? 0 : 1\n",
  'validator count checks'
);
validator = replaceExact(
  validator,
  "  check(schoolhouseIrsAdjudication.identity_decision.admitted_ein === null, 'School.House IRS pass must admit no EIN');\n",
  "  check(schoolhouseIrsAdjudication.identity_decision.admitted_ein === null, 'School.House IRS pass must admit no EIN');\n  check(stateRegistryRouteResults.length === 16, 'School.House state-registry route denominator must contain 16 rows');\n  check(stateRegistryRouteCustody.counts.declared_routes === 16 && stateRegistryRouteCustody.counts.terminal_route_rows === 16, 'state-registry route custody must be terminal');\n  check(stateRegistryRouteCustody.counts.north_carolina_search_submissions === 0 && stateRegistryRouteCustody.counts.florida_charity_search_submissions === 0, 'state-registry route custody must preserve zero search submissions');\n  check(schoolhouseFlFictitiousMembers.length === 1, 'Florida fictitious member denominator must contain one member');\n  check(schoolhouseFlFictitiousMembers[0].row_count === 761040, 'Florida fictitious source denominator must contain 761,040 rows');\n  check(schoolhouseFlFictitiousCandidates.length === 29, 'Florida fictitious candidate census must contain 29 rows');\n  check(schoolhouseFlFictitiousAdjudication.identity_decision.state === 'unresolved_no_florida_fictitious_name_identity_admitted', 'Florida fictitious identity must remain unresolved');\n  check(schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null, 'Florida fictitious pass must admit no document number');\n",
  'validator exact denominator checks'
);
validator = replaceExact(
  validator,
  "  check(unique(schoolhouseIrsCandidates.map(row => row.candidate_row_id)), 'School.House IRS candidate-row IDs must be unique');\n",
  "  check(unique(schoolhouseIrsCandidates.map(row => row.candidate_row_id)), 'School.House IRS candidate-row IDs must be unique');\n  check(unique(stateRegistryRouteResults.map(row => row.route_id)), 'state-registry route-result IDs must be unique');\n  check(unique(schoolhouseFlFictitiousCandidates.map(row => row.candidate_id)), 'Florida fictitious candidate IDs must be unique');\n",
  'validator uniqueness checks'
);
validator = replaceExact(
  validator,
  "  check(schoolhouseIrsAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.contact_detail_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.officer_name_rows_retained === 0, 'School.House IRS adjudication must retain no private contact fields');\n",
  "  check(schoolhouseIrsAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.contact_detail_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.officer_name_rows_retained === 0, 'School.House IRS adjudication must retain no private contact fields');\n\n  for (const row of stateRegistryRouteResults) {\n    check(row.query_submitted === false, `${row.route_id} must preserve zero search submission`);\n    check(row.source_rows_acquired === 0, `${row.route_id} must preserve zero acquired identity rows`);\n    check(row.raw_source_retained === false, `${row.route_id} must retain no raw source`);\n    check(row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0, `${row.route_id} must retain no contact fields`);\n    check(row.identity_admitted === false, `${row.route_id} must admit no identity`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.route_id} must remain graph-inert`);\n  }\n  check(stateRegistryRouteCustody.florida.weakened_host_key_policy_used === false, 'state-registry custody must not weaken SSH host-key validation');\n  check(stateRegistryRouteCustody.north_carolina.interactive_search_automation_permitted === false, 'North Carolina scripted-search prohibition must remain explicit');\n  check(stateRegistryRouteCustody.interpretation.publisher_automation_policy_must_not_be_bypassed === true, 'publisher automation policy must remain binding');\n  check(stateRegistryRouteCustody.graph_effect === 'none' && stateRegistryRouteCustody.promotes_to === 'candidate_only', 'state-registry route custody must remain graph-inert');\n\n  check(schoolhouseFlFictitiousSource.bytes === 74947584, 'Florida fictitious source byte count must remain 74,947,584');\n  check(schoolhouseFlFictitiousSource.sha256 === '38576d314638f16d074d963eb6fba784de095ca2146c04016638a43fe48da113', 'Florida fictitious source SHA-256 drift');\n  check(schoolhouseFlFictitiousSource.source_rows_scanned === 761040 && schoolhouseFlFictitiousSource.candidate_rows_retained === 29, 'Florida fictitious source receipt denominator drift');\n  check(schoolhouseFlFictitiousSource.raw_source_retained === false && schoolhouseFlFictitiousSource.street_address_rows_retained === 0 && schoolhouseFlFictitiousSource.postal_code_rows_retained === 0 && schoolhouseFlFictitiousSource.contact_detail_rows_retained === 0, 'Florida fictitious source receipt must retain no raw or contact fields');\n  const flFictitiousMember = schoolhouseFlFictitiousMembers[0];\n  check(flFictitiousMember.member === 'FICFILE.TXT', 'Florida fictitious member name drift');\n  check(flFictitiousMember.zip_crc32 === 'aa36329a', 'Florida fictitious member CRC drift');\n  check(flFictitiousMember.uncompressed_stream_sha256 === 'e74d9999516e4b87b9b5200e2792eff190a9c54e3da77dfb49aba71e11838da1', 'Florida fictitious member stream SHA-256 drift');\n  check(flFictitiousMember.physical_line_count === 761101 && flFictitiousMember.direct_record_count === 761000 && flFictitiousMember.reassembled_record_count === 40 && flFictitiousMember.fragment_line_count === 101, 'Florida fictitious record-framing denominator drift');\n  check(flFictitiousMember.reassembly_mode_counts.join_fragments_with_lf === 40, 'Florida fictitious embedded-linebreak reassembly drift');\n  check(flFictitiousMember.short_record_count === 0 && flFictitiousMember.trailing_bytes === 0 && flFictitiousMember.state === 'scanned', 'Florida fictitious member must be completely scanned');\n  const allowedFlCandidateKeys = new Set(['candidate_id','source_member','source_row_number','document_number','fictitious_name_as_recorded','normalized_fictitious_name','match_basis','county','city','state','filing_date','status','cancellation_date','expiration_date','declared_owner_count','fictitious_name_fei','more_than_ten_owners','owners','public_tampa_bay_city_match','filed_2023_or_later','identity_state','street_address_retained','postal_code_retained','contact_details_retained','private_support_rows','identity_admitted','graph_effect','promotes_to','source_record_bytes','schema_defined_prefix_bytes','physical_fragment_count','reassembly_mode','receipt_id']);\n  const allowedFlOwnerKeys = new Set(['owner_index','owner_document_number','owner_name_as_recorded','owner_name_format','owner_fei','owner_charter_number','street_address_retained','contact_details_retained']);\n  for (const row of schoolhouseFlFictitiousCandidates) {\n    check(Object.keys(row).every(key => allowedFlCandidateKeys.has(key)), `${row.candidate_id} contains an unapproved field`);\n    check(row.receipt_id === 'r-fl-sunbiz-quarterly-fictitious-bulk-2026-08-05', `${row.candidate_id} must bind the source receipt`);\n    check(row.identity_state === 'fictitious_name_candidate_not_admitted' && row.identity_admitted === false, `${row.candidate_id} must not be admitted`);\n    check(row.street_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false, `${row.candidate_id} must retain no contact fields`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.candidate_id} must remain graph-inert`);\n    for (const owner of row.owners) {\n      check(Object.keys(owner).every(key => allowedFlOwnerKeys.has(key)), `${row.candidate_id} owner contains an unapproved field`);\n      check(owner.street_address_retained === false && owner.contact_details_retained === false, `${row.candidate_id} owner must retain no contact fields`);\n    }\n  }\n  check(schoolhouseFlFictitiousCandidates.filter(row => row.match_basis === 'exact_public_name').length === 0, 'Florida fictitious pass must preserve zero exact public-name candidates');\n  check(schoolhouseFlFictitiousCandidates.filter(row => row.public_tampa_bay_city_match).length === 2, 'Florida fictitious pass must preserve two Tampa Bay phrase candidates');\n  check(schoolhouseFlFictitiousCandidates.filter(row => row.filed_2023_or_later).length === 16, 'Florida fictitious pass must preserve sixteen post-2023 phrase candidates');\n  check(new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_charter_number)).filter(Boolean)).size === 15, 'Florida fictitious pass must preserve fifteen owner charter numbers');\n  check(new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_fei)).filter(Boolean)).size === 15, 'Florida fictitious pass must preserve fifteen owner FEIs');\n  check(schoolhouseFlFictitiousAdjudication.exact_tests.exact_public_name_candidate_count === 0 && schoolhouseFlFictitiousAdjudication.exact_tests.tampa_bay_city_candidate_count === 2 && schoolhouseFlFictitiousAdjudication.exact_tests.filed_2023_or_later_candidate_count === 16, 'Florida fictitious adjudication exact-test drift');\n  check(schoolhouseFlFictitiousAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseFlFictitiousAdjudication.privacy.postal_code_rows_retained === 0 && schoolhouseFlFictitiousAdjudication.privacy.contact_detail_rows_retained === 0, 'Florida fictitious adjudication must retain no contact fields');\n  check(schoolhouseFlFictitiousAdjudication.identity_admitted === false && schoolhouseFlFictitiousAdjudication.graph_effect === 'none', 'Florida fictitious adjudication must remain graph-inert');\n",
  'validator state-registry semantic checks'
);
validator = replaceExact(
  validator,
  "    transactions, claims, coverage, portfolioDelta, schoolhouseIrsCandidates, schoolhouseIrsAdjudication\n",
  "    transactions, claims, coverage, portfolioDelta, schoolhouseIrsCandidates, schoolhouseIrsAdjudication,\n    stateRegistryRouteResults, stateRegistryRouteCustody, schoolhouseFlFictitiousSource,\n    schoolhouseFlFictitiousCandidates, schoolhouseFlFictitiousAdjudication\n",
  'validator receipt-reference coverage'
);
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  source_inventory_rows: manifest.counts.source_inventory_rows,
  state_registry_route_rows: routeResults.length,
  state_registry_search_submissions: routeResults.filter(row => row.query_submitted).length,
  fl_fictitious_source_rows: fictitiousSummary.source_rows_scanned,
  fl_fictitious_candidate_rows: permanentCandidates.length,
  fl_fictitious_exact_public_name_rows: 0,
  fl_fictitious_tampa_bay_candidate_rows: 2,
  fl_fictitious_post_2023_candidate_rows: 16,
  fl_fictitious_owner_charter_numbers: 15,
  admitted_identities: 0,
  changed_data_paths: 12,
  changed_total_paths: 14,
  outside_human_dependency: false,
  graph_effect: 'none'
}));
