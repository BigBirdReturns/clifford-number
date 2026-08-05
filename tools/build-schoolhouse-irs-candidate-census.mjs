import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) throw new Error('usage: node tools/build-schoolhouse-irs-candidate-census.mjs <artifact-dir>');

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');
const SOURCE_PART = 'source-inventory-07.jsonl';
const SOURCE_PART_PATH = path.join(DIR, SOURCE_PART);
const ROUTES_FILE = 'schoolhouse-irs-source-routes.jsonl';
const ROUTES_PATH = path.join(DIR, ROUTES_FILE);
const ADJUDICATION_FILE = 'schoolhouse-irs-identity-adjudication.json';
const ADJUDICATION_PATH = path.join(DIR, ADJUDICATION_FILE);
const CANDIDATE_PARTS = {
  eo_bmf: 'schoolhouse-irs-candidates-eo-bmf.jsonl',
  publication_78: 'schoolhouse-irs-candidates-publication-78.jsonl',
  form_990n: 'schoolhouse-irs-candidates-form-990n.jsonl',
  auto_revocation: 'schoolhouse-irs-candidates-auto-revocation.jsonl'
};

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const manifest = readJson(MANIFEST_PATH);
const schoolhouse = readJson(SCHOOLHOUSE_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');
const summary = readJson(path.join(ARTIFACT_DIR, 'summary.json'));
const artifactReceipt = readJson(path.join(ARTIFACT_DIR, 'acquisition-receipt.json'));
const artifactRoutes = readJsonl(path.join(ARTIFACT_DIR, 'source-routes.jsonl'));
const artifactCandidates = readJsonl(path.join(ARTIFACT_DIR, 'identity-candidates.jsonl'));

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 86) fail('expected 86 source rows before IRS census');
if (summary.route_count !== 6 || summary.all_routes_terminal !== true) fail('IRS route matrix is not terminal');
if (summary.candidate_rows !== 641 || summary.unique_candidate_eins !== 438) fail('IRS candidate denominator drift');
if (summary.registry_identity_admitted !== false) fail('artifact must not admit an identity');
if (summary.street_address_rows_retained !== 0 || summary.contact_detail_rows_retained !== 0 || summary.private_support_rows !== 0) fail('artifact privacy boundary failed');
if (artifactRoutes.length !== 6 || artifactCandidates.length !== 641) fail('artifact row count drift');
if (artifactReceipt.all_routes_terminal !== true || artifactReceipt.registry_identity_admitted !== false) fail('artifact receipt authority drift');
for (const file of [SOURCE_PART_PATH, ROUTES_PATH, ADJUDICATION_PATH, ...Object.values(CANDIDATE_PARTS).map(file => path.join(DIR, file))]) {
  if (fs.existsSync(file)) fail(`IRS census path already exists: ${file}`);
}

const routeReceiptIds = {
  'irs-eo-bmf-florida': 'r-irs-eo-bmf-florida-2026-08-05',
  'irs-eo-bmf-illinois': 'r-irs-eo-bmf-illinois-2026-08-05',
  'irs-eo-bmf-north-carolina': 'r-irs-eo-bmf-north-carolina-2026-08-05',
  'irs-publication-78': 'r-irs-publication-78-2026-08-05',
  'irs-form-990n': 'r-irs-form-990n-2026-08-05',
  'irs-auto-revocation': 'r-irs-auto-revocation-2026-08-05'
};

const sourceRows = artifactRoutes.map(route => ({
  receipt_id: routeReceiptIds[route.source_id],
  evidence_class: 'official',
  locator_url: route.url,
  retrieved_at: route.retrieved_at,
  content_sha256: route.sha256,
  source_state: 'captured_and_scanned',
  note: `${route.dataset} official IRS public dataset; ${route.candidate_rows} School.House phrase candidate rows on the declared scan.`,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
sourceRows.push(
  {
    receipt_id: 'r-irs-teos-form-990n-data-dictionary-2026-08-05',
    evidence_class: 'official',
    locator_url: 'https://www.irs.gov/pub/irs-tege/990n-data-dictionary.pdf',
    retrieved_at: '2026-08-05',
    content_sha256: null,
    source_state: 'live_locator',
    note: 'Official IRS TEOS field order for the headerless pipe-delimited Form 990-N bulk file.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: 'r-irs-teos-pub78-data-dictionary-2026-08-05',
    evidence_class: 'official',
    locator_url: 'https://www.irs.gov/pub/irs-tege/pub-78-data-dictionary.pdf',
    retrieved_at: '2026-08-05',
    content_sha256: null,
    source_state: 'live_locator',
    note: 'Official IRS TEOS field order for the headerless pipe-delimited Publication 78 bulk file.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  },
  {
    receipt_id: 'r-irs-teos-auto-revocation-data-dictionary-2026-08-05',
    evidence_class: 'official',
    locator_url: 'https://www.irs.gov/pub/irs-tege/auto-revocation-data-dictionary.pdf',
    retrieved_at: '2026-08-05',
    content_sha256: null,
    source_state: 'live_locator',
    note: 'Official IRS TEOS field order for the headerless pipe-delimited automatic-revocation bulk file.',
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  }
);
if (sourceRows.length !== 9) fail('IRS source inventory addition must contain 9 rows');
writeJsonl(SOURCE_PART_PATH, sourceRows);

const sanitizedRoutes = artifactRoutes.map(route => ({
  source_id: route.source_id,
  receipt_id: routeReceiptIds[route.source_id],
  dataset: route.dataset,
  jurisdiction: route.jurisdiction,
  locator_url: route.url,
  retrieved_at: route.retrieved_at,
  state: route.state,
  bytes: route.bytes,
  sha256: route.sha256,
  candidate_rows: route.candidate_rows,
  members: (route.members || []).map(member => ({
    member: member.member,
    bytes: member.bytes,
    sha256: member.sha256,
    row_count: member.row_count,
    match_count: member.match_count,
    schema_source: member.schema_source,
    row_width_counts: member.row_width_counts,
    state: member.state
  })),
  raw_source_retained: false,
  street_address_retained: false,
  contact_details_retained: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
writeJsonl(ROUTES_PATH, sanitizedRoutes);

const allowedCandidateKeys = [
  'candidate_row_id', 'identity_candidate_key', 'source_id', 'receipt_id', 'dataset',
  'source_member', 'source_row_number', 'ein', 'legal_name_as_recorded', 'normalized_name',
  'matched_name_as_recorded', 'matched_name_field', 'match_basis', 'city', 'state', 'country',
  'public_location_state_match', 'subsection', 'ruling_date', 'organization_status',
  'deductibility_status', 'tax_period', 'filing_type', 'filing_date', 'revocation_date',
  'reinstatement_date', 'cross_dataset_occurrence_count', 'identity_state',
  'street_address_retained', 'contact_details_retained', 'graph_effect', 'promotes_to'
];
const sanitizedCandidates = artifactCandidates.map(row => {
  const receiptId = routeReceiptIds[row.source_id];
  if (!receiptId) fail(`candidate source has no receipt mapping: ${row.source_id}`);
  const sanitized = {
    candidate_row_id: `${row.source_id}:${row.ein || 'no-ein'}:${row.source_member}:${row.source_row_number}`,
    identity_candidate_key: row.ein ? `irs-ein:${row.ein}` : `irs-row:${row.source_id}:${row.source_row_number}`,
    source_id: row.source_id,
    receipt_id: receiptId,
    dataset: row.dataset,
    source_member: row.source_member,
    source_row_number: row.source_row_number,
    ein: row.ein,
    legal_name_as_recorded: row.legal_name_as_recorded,
    normalized_name: row.normalized_name,
    matched_name_as_recorded: row.matched_name_as_recorded,
    matched_name_field: row.matched_name_field,
    match_basis: row.match_basis,
    city: row.city,
    state: row.state,
    country: row.country,
    public_location_state_match: row.public_location_state_match,
    subsection: row.subsection,
    ruling_date: row.ruling_date,
    organization_status: row.organization_status,
    deductibility_status: row.deductibility_status,
    tax_period: row.tax_period,
    filing_type: row.filing_type,
    filing_date: row.filing_date,
    revocation_date: row.revocation_date,
    reinstatement_date: row.reinstatement_date,
    cross_dataset_occurrence_count: row.cross_dataset_occurrence_count,
    identity_state: 'registry_candidate_not_admitted',
    street_address_retained: false,
    contact_details_retained: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only'
  };
  if (Object.keys(sanitized).some(key => !allowedCandidateKeys.includes(key))) fail('candidate sanitizer added an unapproved field');
  return sanitized;
}).sort((a, b) => a.dataset.localeCompare(b.dataset) || String(a.ein).localeCompare(String(b.ein)) || a.candidate_row_id.localeCompare(b.candidate_row_id));
if (new Set(sanitizedCandidates.map(row => row.candidate_row_id)).size !== 641) fail('candidate-row IDs must be unique');
for (const [dataset, filename] of Object.entries(CANDIDATE_PARTS)) {
  writeJsonl(path.join(DIR, filename), sanitizedCandidates.filter(row => row.dataset === dataset));
}

const simpleNames = new Set(['SCHOOLHOUSE', 'SCHOOL HOUSE', 'THE SCHOOLHOUSE', 'THE SCHOOL HOUSE', 'SCHOOLHOUSE INC', 'SCHOOL HOUSE INC', 'THE SCHOOLHOUSE INC', 'THE SCHOOL HOUSE INC']);
const exact1776 = sanitizedCandidates.filter(row => /(^| )SCHOOL ?HOUSE 1776($| )/.test(normalize(row.matched_name_as_recorded)));
const simpleNameRows = sanitizedCandidates.filter(row => simpleNames.has(normalize(row.matched_name_as_recorded)));
const tampaRows = sanitizedCandidates.filter(row => normalize(row.city) === 'TAMPA');
const fayettevilleRows = sanitizedCandidates.filter(row => normalize(row.city) === 'FAYETTEVILLE');
const recentFlNcBmf = sanitizedCandidates.filter(row => row.dataset === 'eo_bmf' && ['FL', 'NC'].includes(row.state) && String(row.ruling_date || '') >= '202301');
const datasetCounts = Object.fromEntries(Object.keys(CANDIDATE_PARTS).map(dataset => [dataset, sanitizedCandidates.filter(row => row.dataset === dataset).length]));
const uniqueEins = new Set(sanitizedCandidates.map(row => row.ein).filter(Boolean));

const adjudication = {
  schema_version: 'schoolhouse-irs-identity-adjudication@1',
  as_of: '2026-08-05',
  public_source_claims_used_for_adjudication: {
    public_name: 'School.House',
    organization_type_claim: '501(c)(3) nonprofit / public charity',
    founded_claim: 2023,
    location_claims: ['Tampa Bay', 'Fayetteville'],
    boundary: 'A public brand, claimed founding year, and broad location do not establish a legal entity or EIN.'
  },
  acquisition_history: [
    {
      attempt: 1,
      workflow_run_id: 30970304754,
      artifact_id: 8916249854,
      artifact_digest: 'sha256:00e7554ec0da5657ff15f87434dca39a4dfdccdeb80f4539e66e398ac930ac94',
      state: 'three_state_bmf_files_scanned_three_nationwide_schemas_unresolved'
    },
    {
      attempt: 2,
      workflow_run_id: 30970579557,
      artifact_id: 8916378534,
      artifact_digest: 'sha256:11b96fc65ce070fd6e0117f932b7606a00a0ddeafaa936e7eb6d5d20e0303d1f',
      state: 'five_of_six_routes_scanned_form_990n_field_limit_failure'
    },
    {
      attempt: 3,
      workflow_run_id: 30970977853,
      artifact_id: 8916487320,
      artifact_digest: 'sha256:cae7e1ac514d8c49af7552e2dd556144799d8a87d7ae7537f5f59f967e865938',
      state: 'six_of_six_routes_complete'
    }
  ],
  route_denominator: {
    declared_routes: 6,
    terminal_routes: 6,
    source_rows_scanned: sanitizedRoutes.reduce((sum, route) => sum + route.members.reduce((inner, member) => inner + member.row_count, 0), 0),
    candidate_rows: sanitizedCandidates.length,
    unique_candidate_eins: uniqueEins.size,
    dataset_candidate_counts: datasetCounts
  },
  exact_tests: {
    schoolhouse_1776_name_rows: exact1776.length,
    simple_schoolhouse_name_rows: simpleNameRows.map(row => ({
      ein: row.ein,
      legal_name_as_recorded: row.legal_name_as_recorded,
      city: row.city,
      state: row.state,
      dataset: row.dataset,
      disposition: 'not_admitted_outside_declared_public_locations'
    })),
    exact_fayetteville_rows: fayettevilleRows.length,
    exact_tampa_rows: tampaRows.map(row => ({
      ein: row.ein,
      legal_name_as_recorded: row.legal_name_as_recorded,
      dataset: row.dataset,
      revocation_date: row.revocation_date,
      disposition: 'not_admitted_distinct_name_and_historical_revocation'
    }))
  },
  post_2023_fl_nc_bmf_candidates: recentFlNcBmf.map(row => ({
    ein: row.ein,
    legal_name_as_recorded: row.legal_name_as_recorded,
    matched_name_as_recorded: row.matched_name_as_recorded,
    city: row.city,
    state: row.state,
    ruling_date: row.ruling_date,
    disposition: 'not_admitted_distinct_name_and_location'
  })),
  identity_decision: {
    state: 'unresolved_no_registry_candidate_admitted',
    admitted_ein: null,
    admitted_legal_name: null,
    reason: 'No candidate on the declared IRS surfaces aligns with the public School.House name, claimed 2023 founding, and declared Tampa Bay or Fayetteville locations strongly enough to support an identifier-grade join.',
    residual_fog: 'The public brand may operate through a differently named entity, fiscal sponsor, related charity, or unsearched state record. The result therefore preserves unresolved identity rather than a negative existence claim.'
  },
  privacy: {
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    officer_name_rows_retained: 0,
    private_support_rows: 0
  },
  outside_human_dependency: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
if (adjudication.route_denominator.source_rows_scanned !== 4394541) fail(`IRS scanned-row count drift: ${adjudication.route_denominator.source_rows_scanned}`);
if (exact1776.length !== 0 || fayettevilleRows.length !== 0 || tampaRows.length !== 1 || recentFlNcBmf.length !== 5) fail('IRS adjudication fixture drift');
writeJson(ADJUDICATION_PATH, adjudication);

schoolhouse.irs_legal_identity_census = {
  as_of: '2026-08-05',
  source_route_rows: 6,
  source_rows_scanned: adjudication.route_denominator.source_rows_scanned,
  candidate_rows: 641,
  unique_candidate_eins: 438,
  identity_state: 'unresolved_no_registry_candidate_admitted',
  admitted_ein: null,
  admitted_legal_name: null,
  exact_schoolhouse_1776_rows: 0,
  exact_fayetteville_rows: 0,
  exact_tampa_rows: 1,
  exact_tampa_candidate_disposition: 'distinct name and historical 2010 revocation; not admitted',
  post_2023_fl_nc_bmf_candidates: 5,
  receipt_ids: sourceRows.map(row => row.receipt_id),
  candidate_parts: Object.values(CANDIDATE_PARTS),
  route_file: ROUTES_FILE,
  adjudication_file: ADJUDICATION_FILE,
  boundary: 'The candidate census is complete only for the declared IRS source and phrase matrix. It does not prove that School.House lacks a legal entity, fiscal sponsor, differently named charity, or state registration.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

coverage.denominators.push({
  surface: 'School.House IRS legal-identity source and phrase matrix',
  declared_total: 6,
  enumerated_total: 6,
  coverage_state: 'surface_complete_sanitized_candidate_census'
});
coverage.explicit_nulls_and_gaps.push('School.House exact legal entity and EIN remain unresolved after 4,394,541 official IRS rows across six declared routes produced 641 phrase candidates and 438 unique EINs; no candidate aligned with the public name, 2023 founding claim, and Tampa Bay or Fayetteville location claims strongly enough for admission');
writeJson(COVERAGE_PATH, coverage);

const identityTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!identityTask) fail('School.House legal-governance frontier task missing');
identityTask.prior_irs_candidate_census = {
  source_routes: 6,
  source_rows_scanned: 4394541,
  candidate_rows: 641,
  unique_candidate_eins: 438,
  admitted_identities: 0,
  state: 'unresolved_no_registry_candidate_admitted',
  adjudication_file: ADJUDICATION_FILE
};
identityTask.next_transition = 'Search the bounded Florida and North Carolina corporate and charity registries, then test any exact legal-entity candidates against IRS EIN, formation date, officers, and the public School.House brand without using private contact data.';
writeJson(FRONTIER_PATH, frontier);

manifest.counts.source_inventory_rows = 95;
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.schoolhouse_irs_source_route_rows = 6;
manifest.counts.schoolhouse_irs_candidate_rows = 641;
manifest.counts.schoolhouse_irs_unique_candidate_eins = 438;
manifest.counts.schoolhouse_irs_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_irs_legal_identity = '6_of_6_routes_complete_641_candidates_438_unique_eins_zero_admitted_identity';
manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.storage_contract.schoolhouse_irs_candidate_parts = Object.values(CANDIDATE_PARTS);
manifest.source_inventory.evidence_class_counts.official = (manifest.source_inventory.evidence_class_counts.official || 0) + 9;
manifest.source_inventory.source_state_counts.live_locator = (manifest.source_inventory.source_state_counts.live_locator || 0) + 9;
manifest.files[SOURCE_PART] = fileRecord(SOURCE_PART_PATH);
manifest.files[ROUTES_FILE] = fileRecord(ROUTES_PATH);
manifest.files[ADJUDICATION_FILE] = fileRecord(ADJUDICATION_PATH);
for (const file of Object.values(CANDIDATE_PARTS)) manifest.files[file] = fileRecord(path.join(DIR, file));
manifest.files['schoolhouse.json'] = fileRecord(SCHOOLHOUSE_PATH);
manifest.files['coverage-matrix.json'] = fileRecord(COVERAGE_PATH);
manifest.files['acquisition-frontier.json'] = fileRecord(FRONTIER_PATH);
writeJson(MANIFEST_PATH, manifest);

const readmeReplacements = [
  ['public-source receipts                         86', 'public-source receipts                         95'],
  ['SEC Form D source rows acquired                     0', 'SEC Form D source rows acquired                     0\nIRS legal-identity source routes                    6 / 6\nIRS legal-name candidate rows                     641\nIRS unique candidate EINs                         438\nIRS identities admitted                             0'],
  ['- `schoolhouse.json` preserves source-specific identity and timeline claims, eighteen current faculty labels, one dated twenty-company Demo Day surface, panelists, sponsors, organizers, founder mappings, two counterpart confirmations, and the public company-profile snapshot.', '- `schoolhouse.json` preserves source-specific identity and timeline claims, eighteen current faculty labels, one dated twenty-company Demo Day surface, panelists, sponsors, organizers, founder mappings, two counterpart confirmations, the public company-profile snapshot, and the terminal IRS candidate-census state.'],
  ['- `sec-form-d-route-custody.json` binds those route results to their workflow runs and retained artifacts without converting provider failure into an absence claim.', '- `sec-form-d-route-custody.json` binds those route results to their workflow runs and retained artifacts without converting provider failure into an absence claim.\n- `schoolhouse-irs-source-routes.jsonl`, the four `schoolhouse-irs-candidates-*.jsonl` shards, and `schoolhouse-irs-identity-adjudication.json` preserve the complete sanitized six-route IRS name-candidate census and the no-admission decision.']
];
for (const [from, to] of readmeReplacements) {
  if (!readme.includes(from)) fail(`README boundary missing: ${from}`);
  readme = readme.replace(from, to);
}
const continuationAnchor = 'The checked-in frontier now directs the next bounded pass toward the complete BVVC vehicle denominator';
if (!readme.includes(continuationAnchor)) fail('README continuation anchor missing');
readme = readme.replace(continuationAnchor, 'The IRS legal-identity pass scanned 4,394,541 public rows across six complete routes, retained 641 sanitized phrase candidates representing 438 EINs, and admitted no School.House identity. No candidate aligned with the public brand, claimed 2023 founding, and Tampa Bay or Fayetteville location claims strongly enough for an identifier-grade join; the next lawful boundary is the bounded Florida and North Carolina corporate and charity registries.\n\n' + continuationAnchor);
fs.writeFileSync(README_PATH, readme);

const loadAnchor = "  const secRouteCustody = readJson(path.join(dir, 'sec-form-d-route-custody.json'));";
if (!validator.includes(loadAnchor)) fail('validator IRS load anchor missing');
validator = validator.replace(loadAnchor, `${loadAnchor}\n  const schoolhouseIrsRoutes = readJsonl(path.join(dir, 'schoolhouse-irs-source-routes.jsonl'));\n  const schoolhouseIrsCandidates = manifest.storage_contract.schoolhouse_irs_candidate_parts.flatMap(file => readJsonl(path.join(dir, file)));\n  const schoolhouseIrsAdjudication = readJson(path.join(dir, 'schoolhouse-irs-identity-adjudication.json'));`);
const countAnchor = '    sec_form_d_route_result_rows: secRouteResults.length';
if (!validator.includes(countAnchor)) fail('validator IRS count anchor missing');
validator = validator.replace(countAnchor, `${countAnchor},\n    schoolhouse_irs_source_route_rows: schoolhouseIrsRoutes.length,\n    schoolhouse_irs_candidate_rows: schoolhouseIrsCandidates.length,\n    schoolhouse_irs_unique_candidate_eins: new Set(schoolhouseIrsCandidates.map(row => row.ein).filter(Boolean)).size,\n    schoolhouse_irs_admitted_identity_rows: schoolhouseIrsAdjudication.identity_decision.admitted_ein === null ? 0 : 1`);
const directAnchor = "  check(secRouteResults.length === 95, 'SEC route-result denominator must contain 95 rows');";
if (!validator.includes(directAnchor)) fail('validator IRS direct anchor missing');
validator = validator.replace(directAnchor, `${directAnchor}\n  check(schoolhouseIrsRoutes.length === 6, 'School.House IRS route denominator must contain 6 rows');\n  check(schoolhouseIrsCandidates.length === 641, 'School.House IRS candidate census must contain 641 rows');\n  check(new Set(schoolhouseIrsCandidates.map(row => row.ein).filter(Boolean)).size === 438, 'School.House IRS unique EIN count must be 438');\n  check(schoolhouseIrsAdjudication.identity_decision.state === 'unresolved_no_registry_candidate_admitted', 'School.House IRS identity must remain unresolved');\n  check(schoolhouseIrsAdjudication.identity_decision.admitted_ein === null, 'School.House IRS pass must admit no EIN');`);
const uniqueAnchor = "  check(unique(secRouteResults.map(row => row.route_id)), 'SEC route-result IDs must be unique');";
if (!validator.includes(uniqueAnchor)) fail('validator IRS unique anchor missing');
validator = validator.replace(uniqueAnchor, `${uniqueAnchor}\n  check(unique(schoolhouseIrsCandidates.map(row => row.candidate_row_id)), 'School.House IRS candidate-row IDs must be unique');`);
const loopAnchor = "  for (const row of secRouteResults) {";
if (!validator.includes(loopAnchor)) fail('validator IRS loop anchor missing');
validator = validator.replace(loopAnchor, `  const allowedSchoolhouseIrsCandidateKeys = new Set(${JSON.stringify(allowedCandidateKeys)});\n  for (const route of schoolhouseIrsRoutes) {\n    check(route.state === 'captured_and_scanned', \`${'${route.source_id}'} must be terminal\`);\n    check(route.street_address_retained === false && route.contact_details_retained === false, \`${'${route.source_id}'} must retain no contact data\`);\n    check(route.graph_effect === 'none' && route.promotes_to === 'candidate_only', \`${'${route.source_id}'} must remain graph-inert\`);\n  }\n  for (const row of schoolhouseIrsCandidates) {\n    check(Object.keys(row).every(key => allowedSchoolhouseIrsCandidateKeys.has(key)), \`${'${row.candidate_row_id}'} contains an unapproved field\`);\n    check(row.street_address_retained === false && row.contact_details_retained === false, \`${'${row.candidate_row_id}'} must retain no contact data\`);\n    check(row.identity_state === 'registry_candidate_not_admitted', \`${'${row.candidate_row_id}'} must not be admitted\`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', \`${'${row.candidate_row_id}'} must remain graph-inert\`);\n  }\n  check(schoolhouseIrsAdjudication.route_denominator.source_rows_scanned === 4394541, 'School.House IRS scanned-row count must remain 4,394,541');\n  check(schoolhouseIrsAdjudication.exact_tests.schoolhouse_1776_name_rows === 0, 'School.House IRS pass must preserve zero 1776-name matches');\n  check(schoolhouseIrsAdjudication.exact_tests.exact_fayetteville_rows === 0, 'School.House IRS pass must preserve zero Fayetteville matches');\n  check(schoolhouseIrsAdjudication.exact_tests.exact_tampa_rows.length === 1, 'School.House IRS pass must preserve one distinct historical Tampa candidate');\n  check(schoolhouseIrsAdjudication.post_2023_fl_nc_bmf_candidates.length === 5, 'School.House IRS pass must preserve five distinct recent FL/NC BMF candidates');\n  check(schoolhouseIrsAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.contact_detail_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.officer_name_rows_retained === 0, 'School.House IRS adjudication must retain no private contact fields');\n\n${loopAnchor}`);
const receiptAnchor = '    transactions, claims, coverage, portfolioDelta';
if (!validator.includes(receiptAnchor)) fail('validator IRS receipt anchor missing');
validator = validator.replace(receiptAnchor, '    transactions, claims, coverage, portfolioDelta, schoolhouseIrsCandidates, schoolhouseIrsAdjudication');
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  schema_version: 'schoolhouse-irs-candidate-census-build-receipt@1',
  source_routes: 6,
  source_rows_scanned: 4394541,
  candidate_rows: 641,
  unique_candidate_eins: 438,
  admitted_identities: 0,
  source_inventory_rows: 95,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
