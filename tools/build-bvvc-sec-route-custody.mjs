import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');
const ROUTES_FILE = 'sec-form-d-route-results.jsonl';
const CUSTODY_FILE = 'sec-form-d-route-custody.json';
const ROUTES_PATH = path.join(DIR, ROUTES_FILE);
const CUSTODY_PATH = path.join(DIR, CUSTODY_FILE);

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };

const manifest = readJson(MANIFEST_PATH);
const coverage = readJson(COVERAGE_PATH);
const frontier = readJson(FRONTIER_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 86) fail('expected 86 source rows before SEC route custody');
if (fs.existsSync(ROUTES_PATH) || fs.existsSync(CUSTODY_PATH)) fail('SEC route custody already exists');

const quarters = [];
for (let year = 2019; year <= 2026; year += 1) {
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    if (year === 2026 && quarter > 2) continue;
    quarters.push({ year, quarter, key: `${year}Q${quarter}` });
  }
}
if (quarters.length !== 30) fail('quarter denominator must be 30');

const common = {
  http_status: 403,
  state: 'source_unavailable_after_search',
  result_rows: 0,
  absence_claim_permitted: false,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};

const routeRows = [];
for (const { year, quarter, key } of quarters) {
  routeRows.push({
    ...common,
    attempt_id: 'bvvc-sec-form-d-attempt-01',
    route_id: `attempt-01-quarterly-flat-${key}`,
    route_family: 'official_form_d_quarterly_flat_file',
    route_variant: 'datastandardsinnovation_all_years',
    requested_url: `https://www.sec.gov/files/datastandardsinnovation/data/form-d-data-sets/${year}q${quarter}_d.zip`,
    declared_unit: key,
    request_attempts: 6
  });
}
for (const { year, quarter, key } of quarters) {
  const directory = year <= 2025 ? 'structureddata' : 'datastandardsinnovation';
  routeRows.push({
    ...common,
    attempt_id: 'bvvc-sec-form-d-attempt-02',
    route_id: `attempt-02-quarterly-flat-${key}`,
    route_family: 'official_form_d_quarterly_flat_file',
    route_variant: 'year_partitioned_documented_paths',
    requested_url: `https://www.sec.gov/files/${directory}/data/form-d-data-sets/${year}q${quarter}_d.zip`,
    declared_unit: key,
    request_attempts: 3
  });
}
routeRows.push({
  ...common,
  attempt_id: 'bvvc-sec-form-d-attempt-03',
  route_id: 'attempt-03-edgar-full-text-search',
  route_family: 'official_edgar_full_text_search',
  route_variant: 'BVVC_forms_D_DA_2019_2026',
  requested_url: 'https://efts.sec.gov/LATEST/search-index?q=BVVC&forms=D%2CD%2FA&dateRange=custom&startdt=2019-01-01&enddt=2026-06-30&from=0&size=100',
  declared_unit: 'full_text_search_query',
  request_attempts: 3
});
for (const cik of ['0001982744', '0001992728', '0002050061', '0002078836']) {
  routeRows.push({
    ...common,
    attempt_id: 'bvvc-sec-form-d-attempt-03',
    route_id: `attempt-03-submissions-${cik}`,
    route_family: 'official_data_sec_submissions',
    route_variant: 'known_anchor_cik_history',
    requested_url: `https://data.sec.gov/submissions/CIK${cik}.json`,
    declared_unit: cik,
    request_attempts: 3
  });
}
for (const { year, quarter, key } of quarters) {
  routeRows.push({
    ...common,
    attempt_id: 'bvvc-sec-form-d-attempt-03',
    route_id: `attempt-03-company-index-${key}`,
    route_family: 'official_edgar_quarterly_company_index',
    route_variant: 'issuer_name_BVVC_scan',
    requested_url: `https://www.sec.gov/Archives/edgar/full-index/${year}/QTR${quarter}/company.idx`,
    declared_unit: key,
    request_attempts: 3
  });
}
if (routeRows.length !== 95) fail(`SEC route denominator drift: ${routeRows.length}`);
writeJsonl(ROUTES_PATH, routeRows);

const attempts = [
  {
    attempt_id: 'bvvc-sec-form-d-attempt-01',
    started_at: '2026-08-05T01:38:32Z',
    completed_at: '2026-08-05T02:17:11Z',
    workflow_run_id: 30966935809,
    head_sha: '4e386a4c0f172a68d70756af12841080347b8965',
    artifact_id: 8915769528,
    artifact_digest: 'sha256:86b1183ae6c2519a4e21951b1102b5325b337a10d3e1768c0263d31c7052a6c1',
    route_result_rows: 30,
    source_rows_acquired: 0,
    terminal_state: 'all_declared_routes_http_403'
  },
  {
    attempt_id: 'bvvc-sec-form-d-attempt-02',
    started_at: '2026-08-05T02:23:11Z',
    completed_at: '2026-08-05T02:28:29Z',
    workflow_run_id: 30969190170,
    head_sha: 'e6a464d1d46bba96b23596d1cdcf41997185f3b9',
    artifact_id: 8915954440,
    artifact_digest: 'sha256:c001a04cd07e4d234497a6e34fddfa6ca7545704dd8e2570a923d875dbabf7a2',
    route_result_rows: 30,
    source_rows_acquired: 0,
    terminal_state: 'all_declared_routes_http_403'
  },
  {
    attempt_id: 'bvvc-sec-form-d-attempt-03',
    started_at: '2026-08-05T02:38:33Z',
    completed_at: '2026-08-05T02:44:44Z',
    workflow_run_id: 30969929707,
    head_sha: '6c7a91391624c7de314a1ddba2aff8d15850d501',
    artifact_id: 8916218355,
    artifact_digest: 'sha256:236e0d49a57fc01633a18f805fe57d4c8cca409372676a8f8731dbcb124f8bfa',
    route_result_rows: 35,
    source_rows_acquired: 0,
    terminal_state: 'all_declared_routes_http_403'
  }
];

const custody = {
  schema_version: 'bvvc-sec-form-d-route-custody@1',
  as_of: '2026-08-05',
  declared_coverage_window: '2019Q1/2026Q2',
  official_route_attempts: attempts,
  counts: {
    attempts: 3,
    route_result_rows: 95,
    route_result_state_counts: { source_unavailable_after_search: 95 },
    provider_http_403_rows: 95,
    source_rows_acquired: 0,
    empirical_no_match_rows: 0,
    anchor_ciks_expected: 4,
    anchor_ciks_acquired: 0,
    portfolio_transaction_joins_created: 0,
    ownership_findings: 0,
    governance_right_findings: 0,
    private_support_rows: 0
  },
  route_families: [
    'official_form_d_quarterly_flat_file',
    'official_edgar_full_text_search',
    'official_data_sec_submissions',
    'official_edgar_quarterly_company_index'
  ],
  interpretation: {
    what_this_is: 'Custody of three bounded official SEC acquisition attempts and every declared route disposition.',
    what_this_is_not: 'Evidence that no additional BVVC filer, vehicle, amendment, or related person exists.',
    next_transition: 'Do not repeat an identical blocked route. Retry only after a material provider-route or transport condition changes, or acquire exact filing instruments through a distinct lawful official surface.',
    source_failure_is_not_absence: true
  },
  outside_human_dependency: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(CUSTODY_PATH, custody);

coverage.denominators.push({
  surface: 'BVVC SEC Form D official-route acquisition attempts 1 through 3',
  declared_total: 95,
  enumerated_total: 95,
  coverage_state: 'terminal_route_failure_custody_no_source_rows'
});
coverage.explicit_nulls_and_gaps.push('95 of 95 declared SEC route objects terminated in provider HTTP 403 across quarterly flat files, EDGAR full-text search, submissions histories, and quarterly company indexes; this is source-unavailable custody and cannot support a no-match or absence claim');
writeJson(COVERAGE_PATH, coverage);

const secTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-sec-vehicle-denominator');
if (!secTask) fail('SEC vehicle-denominator frontier task missing');
secTask.prior_route_custody = {
  attempts: 3,
  route_result_rows: 95,
  state: 'provider_http_403_all_declared_routes',
  source_rows_acquired: 0,
  custody_file: CUSTODY_FILE,
  route_file: ROUTES_FILE
};
secTask.next_transition = 'Do not repeat an identical blocked route. Retry only after a material provider-route or transport condition changes, or acquire exact filing instruments through a distinct lawful official surface.';
writeJson(FRONTIER_PATH, frontier);

manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.sec_form_d_acquisition_attempts = 3;
manifest.counts.sec_form_d_route_result_rows = 95;
manifest.coverage.sec_vehicle_denominator_routes = '95_of_95_declared_official_routes_source_unavailable_after_search_http_403';
manifest.files[ROUTES_FILE] = fileRecord(ROUTES_PATH);
manifest.files[CUSTODY_FILE] = fileRecord(CUSTODY_PATH);
manifest.files['coverage-matrix.json'] = fileRecord(COVERAGE_PATH);
manifest.files['acquisition-frontier.json'] = fileRecord(FRONTIER_PATH);
writeJson(MANIFEST_PATH, manifest);

const readmeReplacements = [
  ['off-roster public-claim candidates                 9', 'off-roster public-claim candidates                 9\nSEC Form D route dispositions                      95\nSEC Form D source rows acquired                     0'],
  ['- `coverage-matrix.json` freezes complete, partial, open, and explicit-null surfaces.', '- `coverage-matrix.json` freezes complete, partial, open, and explicit-null surfaces.\n- `sec-form-d-route-results.jsonl` preserves all ninety-five official-route dispositions across three bounded acquisition attempts.\n- `sec-form-d-route-custody.json` binds those route results to their workflow runs and retained artifacts without converting provider failure into an absence claim.']
];
for (const [from, to] of readmeReplacements) {
  if (!readme.includes(from)) fail(`README boundary missing: ${from}`);
  readme = readme.replace(from, to);
}
const secParagraph = "The SEC rows preserve filer-reported identities, exemptions, offering amounts, sales, investor counts, and related persons. They also carry the SEC's warning that Form D information has not necessarily been reviewed for accuracy or completeness. No SPV is assigned to a portfolio transaction without a transaction-specific instrument.";
if (!readme.includes(secParagraph)) fail('README SEC paragraph missing');
readme = readme.replace(secParagraph, `${secParagraph}\n\nThree bounded expansion attempts then exercised ninety-five official SEC route objects. Every route returned provider HTTP 403 from the GitHub Actions transport, so the lake preserves the route failures, request families, run IDs, artifact digests, and zero acquired rows. That custody narrows the transport problem but does not establish that the denominator contains no additional filings.`);
fs.writeFileSync(README_PATH, readme);

const loadAnchor = "  const portfolioDelta = readJsonl(path.join(dir, 'portfolio-delta-candidates.jsonl'));";
if (!validator.includes(loadAnchor)) fail('validator load anchor missing');
validator = validator.replace(loadAnchor, `${loadAnchor}\n  const secRouteResults = readJsonl(path.join(dir, 'sec-form-d-route-results.jsonl'));\n  const secRouteCustody = readJson(path.join(dir, 'sec-form-d-route-custody.json'));`);
const countAnchor = '    portfolio_delta_candidate_rows: portfolioDelta.length';
if (!validator.includes(countAnchor)) fail('validator count anchor missing');
validator = validator.replace(countAnchor, `${countAnchor},\n    sec_form_d_acquisition_attempts: secRouteCustody.official_route_attempts.length,\n    sec_form_d_route_result_rows: secRouteResults.length`);
const directAnchor = "  check(portfolioDelta.length === 9, 'portfolio delta must contain 9 public-claim candidates');";
if (!validator.includes(directAnchor)) fail('validator direct anchor missing');
validator = validator.replace(directAnchor, `${directAnchor}\n  check(secRouteCustody.official_route_attempts.length === 3, 'SEC route custody must contain 3 bounded attempts');\n  check(secRouteResults.length === 95, 'SEC route-result denominator must contain 95 rows');`);
const uniqueAnchor = "  check(unique(portfolioDelta.map(row => row.candidate_id)), 'portfolio-delta candidate IDs must be unique');";
if (!validator.includes(uniqueAnchor)) fail('validator unique anchor missing');
validator = validator.replace(uniqueAnchor, `${uniqueAnchor}\n  check(unique(secRouteResults.map(row => row.route_id)), 'SEC route-result IDs must be unique');`);
const loopAnchor = "  check(/must_not_merge/i.test(Object.keys(appliedAtomicsDelta || {}).join(' ')), 'Applied Atomics row must carry a non-merge boundary');";
if (!validator.includes(loopAnchor)) fail('validator route-loop anchor missing');
validator = validator.replace(loopAnchor, `${loopAnchor}\n  check(secRouteCustody.counts.route_result_rows === 95, 'SEC custody route count must be 95');\n  check(secRouteCustody.counts.source_rows_acquired === 0, 'SEC route attempts must not invent source rows');\n  check(secRouteCustody.interpretation.source_failure_is_not_absence === true, 'SEC route custody must preserve source-failure boundary');\n  check(secRouteCustody.graph_effect === 'none' && secRouteCustody.promotes_to === 'candidate_only', 'SEC route custody must remain graph-inert');\n  for (const row of secRouteResults) {\n    check(row.state === 'source_unavailable_after_search', \`${'${row.route_id}'} must preserve the source-unavailable state\`);\n    check(row.http_status === 403, \`${'${row.route_id}'} must preserve HTTP 403\`);\n    check(row.result_rows === 0, \`${'${row.route_id}'} must preserve zero acquired rows\`);\n    check(row.absence_claim_permitted === false, \`${'${row.route_id}'} must refuse absence inference\`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', \`${'${row.route_id}'} must remain graph-inert\`);\n  }`);
fs.writeFileSync(VALIDATOR_PATH, validator);

const receipt = {
  schema_version: 'bvvc-sec-form-d-route-custody-build-receipt@1',
  as_of: '2026-08-05',
  route_result_rows: 95,
  acquisition_attempts: 3,
  source_rows_acquired: 0,
  absence_claims_created: 0,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
console.log(JSON.stringify(receipt));
