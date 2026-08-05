import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const artifactDir = process.argv[2];
if (!artifactDir) throw new Error('usage: node build-schoolhouse-charity-nc-complete-pdf-custody.mjs <artifact-dir>');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const compact = value => JSON.stringify(value);
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(compact).join('\n') + (rows.length ? '\n' : ''));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileMeta = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const check = (condition, message) => { if (!condition) throw new Error(message); };
const unique = values => new Set(values).size === values.length;

function verifyChecksums(dir) {
  const lines = fs.readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8').split(/\r?\n/).filter(Boolean);
  check(lines.length === 6, `expected six checksum rows, found ${lines.length}`);
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    check(Boolean(match), `malformed checksum row: ${line}`);
    const [, expected, name] = match;
    const file = path.join(dir, name);
    check(fs.existsSync(file), `checksum-bound artifact file missing: ${name}`);
    check(sha256(file) === expected, `artifact checksum drift: ${name}`);
  }
}

function receiptIdFor(oldRouteId) {
  const suffix = oldRouteId.split('-').at(-1);
  check(/^\d{3}$/.test(suffix), `unexpected predecessor route ID: ${oldRouteId}`);
  return `r-schoolhouse-charity-nc-complete-pdf-${suffix}-2026-08-05`;
}

function routeIdFor(oldRouteId) {
  const suffix = oldRouteId.split('-').at(-1);
  return `schoolhouse-charity-nc-complete-pdf-${suffix}`;
}

verifyChecksums(artifactDir);
const summary = readJson(path.join(artifactDir, 'summary.json'));
const policy = readJson(path.join(artifactDir, 'route-policy.json'));
const artifactManifest = readJson(path.join(artifactDir, 'artifact-manifest.json'));
const artifactInputs = readJsonl(path.join(artifactDir, 'input-pdf-routes.jsonl'));
const artifactFullRows = readJsonl(path.join(artifactDir, 'full-file-custody.jsonl'));
const artifactClassRows = readJsonl(path.join(artifactDir, 'content-field-classification.jsonl'));

check(summary.input_pdf_routes === 15 && summary.terminal_route_rows === 15 && summary.all_routes_terminal === true, 'complete-PDF route denominator drift');
check(summary.complete_file_hash_rows === 15 && summary.length_match_rows === 15, 'complete-PDF hash denominator drift');
check(summary.text_extraction_success_rows === 15 && summary.text_extraction_non_success_rows === 0, 'complete-PDF text-extraction denominator drift');
check(summary.total_pdf_pages === 377 && summary.total_extracted_text_chars === 332175, 'complete-PDF page/text denominator drift');
check(summary.subject_term_hit_rows === 0 && summary.subject_term_total_hits === 0 && summary.field_term_total_hits === 586, 'complete-PDF fixed-term denominator drift');
check(summary.search_submissions === 0 && summary.organization_name_submissions === 0 && summary.license_number_submissions === 0 && summary.source_rows_acquired === 0, 'complete-PDF no-submission boundary drift');
check(summary.raw_source_retained === false && summary.complete_remote_files_retained === false && summary.extracted_text_retained === false && summary.identity_admitted === false && summary.outside_human_dependency === false && summary.graph_effect === 'none', 'complete-PDF authority boundary drift');
check(artifactInputs.length === 15 && artifactFullRows.length === 15 && artifactClassRows.length === 15, 'complete-PDF artifact row count drift');
check(unique(artifactInputs.map(row => row.route_id)) && unique(artifactFullRows.map(row => row.route_id)) && unique(artifactClassRows.map(row => row.route_id)), 'complete-PDF artifact route IDs must be unique');
check(artifactFullRows.every(row => row.state === 'complete_file_hashed' && row.status === 200 && row.complete_file_hash_claimed === true && row.expected_length_matches === true && typeof row.full_file_sha256 === 'string' && row.full_file_sha256.length === 64), 'complete-PDF full-file custody state drift');
check(artifactFullRows.every(row => row.request_method === 'GET' && row.request_count === 1 && row.query_submitted === false && row.raw_source_retained === false && row.complete_remote_file_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'complete-PDF request/privacy authority drift');
check(artifactClassRows.every(row => row.text_extraction_state === 'success' && row.pdfinfo_state === 'success' && row.subject_term_hit === false && row.subject_term_hits === 0 && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'complete-PDF classification authority drift');
check(policy.maximum_attempts_per_route === 1 && policy.search_submissions === 0 && policy.raw_source_retained === false && policy.complete_remote_files_retained === false && policy.extracted_text_retained === false && policy.identity_admitted === false, 'complete-PDF policy drift');
check(artifactManifest.input_pdf_routes === 15 && artifactManifest.terminal_route_rows === 15 && artifactManifest.outside_human_dependency === false && artifactManifest.graph_effect === 'none', 'complete-PDF artifact manifest drift');

const inputByOldRoute = new Map(artifactInputs.map(row => [row.route_id, row]));
const classByOldRoute = new Map(artifactClassRows.map(row => [row.route_id, row]));
const permanentInputs = artifactInputs.map(row => ({
  ...row,
  predecessor_route_id: row.route_id,
  predecessor_receipt_id: row.receipt_id,
  route_id: routeIdFor(row.route_id),
  receipt_id: receiptIdFor(row.route_id),
}));
const permanentFullRows = artifactFullRows.map(row => ({
  ...row,
  predecessor_route_id: row.route_id,
  predecessor_receipt_id: row.receipt_id,
  route_id: routeIdFor(row.route_id),
  receipt_id: receiptIdFor(row.route_id),
}));
const permanentClassRows = artifactClassRows.map(row => ({
  ...row,
  predecessor_route_id: row.route_id,
  predecessor_receipt_id: row.receipt_id,
  route_id: routeIdFor(row.route_id),
  receipt_id: receiptIdFor(row.route_id),
}));

const termTotals = {};
for (const row of permanentClassRows) {
  for (const [key, value] of Object.entries(row.term_counts)) termTotals[key] = (termTotals[key] || 0) + value;
}
const documentClassCounts = {};
for (const row of permanentClassRows) documentClassCounts[row.document_class] = (documentClassCounts[row.document_class] || 0) + 1;
const fieldSummary = {
  schema_version: 'schoolhouse-charity-nc-complete-pdf-field-summary@1',
  as_of: '2026-08-05',
  input_pdf_routes: 15,
  complete_file_hash_rows: 15,
  text_extraction_success_rows: 15,
  total_pdf_pages: 377,
  total_extracted_text_chars_screened: 332175,
  extracted_text_retained: false,
  subject_term_hit_rows: 0,
  subject_term_total_hits: 0,
  field_term_total_hits: 586,
  document_class_counts: Object.fromEntries(Object.entries(documentClassCounts).sort()),
  aggregate_term_counts: Object.fromEntries(Object.entries(termTotals).sort()),
  subject_vocabulary: ['subject:bravo_victor', 'subject:bvvc', 'subject:school_dot_house', 'subject:schoolhouse'],
  identity_state: 'no_fixed_subject_terms_observed_no_public_identity_admitted',
  forbidden_inference: 'Zero fixed subject-term hits across these fifteen general official PDFs does not establish that no School.House legal entity, filing, exemption, fiscal sponsor, officer, governance record, funding record, related party, differently named corporation, or state-only registration exists elsewhere.',
  public_schoolhouse_identity_admitted: false,
  negative_existence_claim_created: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only',
};

const sourceInventory = permanentFullRows.map(row => {
  const classification = permanentClassRows.find(item => item.route_id === row.route_id);
  return {
    receipt_id: row.receipt_id,
    route_id: row.route_id,
    evidence_class: 'official',
    locator_url: row.url,
    retrieved_at: row.completed_at,
    content_sha256: row.full_file_sha256,
    source_state: 'captured_complete_file_hash',
    note: `Official North Carolina PDF complete-hash custody; HTTP 200; ${row.full_file_bytes} exact bytes; ${classification.page_count} pages; aggregate fixed-term content screen; zero School.House, School.House punctuation, Bravo Victor, or BVVC subject-term hits; one GET; no raw bytes or extracted text retained.`,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
});
check(unique(sourceInventory.map(row => row.receipt_id)) && unique(sourceInventory.map(row => row.route_id)), 'complete-PDF source-inventory IDs must be unique');

const dataFiles = {
  inputs: 'schoolhouse-charity-nc-complete-pdf-input-routes.jsonl',
  full: 'schoolhouse-charity-nc-complete-pdf-full-file-custody.jsonl',
  classifications: 'schoolhouse-charity-nc-complete-pdf-content-field-classification.jsonl',
  policy: 'schoolhouse-charity-nc-complete-pdf-route-policy.json',
  summary: 'schoolhouse-charity-nc-complete-pdf-field-summary.json',
  custody: 'schoolhouse-charity-nc-complete-pdf-custody.json',
  sourceInventory: 'source-inventory-12.jsonl',
};
writeJsonl(path.join(DIR, dataFiles.inputs), permanentInputs);
writeJsonl(path.join(DIR, dataFiles.full), permanentFullRows);
writeJsonl(path.join(DIR, dataFiles.classifications), permanentClassRows);
writeJson(path.join(DIR, dataFiles.policy), {
  ...policy,
  schema_version: 'schoolhouse-charity-nc-complete-pdf-route-policy@1',
  artifact_workflow_run_id: 30988735386,
  artifact_id: 8923190161,
  artifact_digest: 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8',
});
writeJson(path.join(DIR, dataFiles.summary), fieldSummary);
writeJsonl(path.join(DIR, dataFiles.sourceInventory), sourceInventory);

const custody = {
  schema_version: 'schoolhouse-charity-nc-complete-pdf-custody@1',
  as_of: '2026-08-05',
  acquisition: {
    workflow_run_id: 30988735386,
    artifact_id: 8923190161,
    artifact_name: 'schoolhouse-charity-nc-complete-pdf-custody',
    artifact_digest: 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8',
    acquisition_head: '91a16438fecb1bde772dd88147c06f2c72eca38a',
    started_at: summary.started_at,
    completed_at: summary.completed_at,
    artifact_manifest_sha256: sha256(path.join(artifactDir, 'artifact-manifest.json')),
  },
  predecessor: {
    custody_file: 'schoolhouse-charity-nc-final-static-residual-custody.json',
    file_sample_file: 'schoolhouse-charity-nc-final-static-residual-file-samples.jsonl',
    bounded_file_sample_rows: 15,
    predecessor_file_sha256: sha256(path.join(DIR, 'schoolhouse-charity-nc-final-static-residual-file-samples.jsonl')),
  },
  bounds: {
    exact_input_pdf_routes: 15,
    maximum_attempts_per_route: 1,
    maximum_parallel_workers: 3,
    request_methods: ['GET'],
    maximum_file_bytes: 20971520,
    result_spawned_requests: 0,
    allowed_hosts: ['sosnc.gov', 'www.sosnc.gov'],
  },
  counts: {
    input_pdf_routes: 15,
    terminal_route_rows: 15,
    complete_file_hash_rows: 15,
    exact_length_match_rows: 15,
    text_extraction_success_rows: 15,
    text_extraction_non_success_rows: 0,
    total_pdf_pages: 377,
    total_extracted_text_chars_screened: 332175,
    subject_term_hit_rows: 0,
    subject_term_total_hits: 0,
    field_term_total_hits: 586,
    search_submissions: 0,
    organization_name_submissions: 0,
    license_number_submissions: 0,
    source_rows_acquired: 0,
    identities_admitted: 0,
  },
  terminal_states: { complete_file_hashed: 15 },
  http_statuses: { '200': 15 },
  field_summary: dataFiles.summary,
  files: {
    source_inventory_part: dataFiles.sourceInventory,
    input_routes: dataFiles.inputs,
    full_file_custody: dataFiles.full,
    content_field_classification: dataFiles.classifications,
    route_policy: dataFiles.policy,
  },
  terminal_frontier: {
    complete_file_hash_denominator_terminal: true,
    fixed_subject_term_screen_terminal: true,
    next_action: 'Continue registry-grade legal-name, EIN, exemption, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, state-only registration, and archive-locator evidence. Do not repeat the fifteen-PDF complete-hash denominator and do not treat zero subject terms as absence evidence.',
    stopping_rule: 'Stop only when each remaining legal-identity or governance surface has a registry-grade receipt, a lawful source-unavailable state, or a strictly adjudicated rejection.',
    outside_human_dependency: false,
  },
  interpretation: {
    complete_file_hash_is_document_custody_not_identity_evidence: true,
    fixed_term_count_is_content_screen_not_entity_match: true,
    zero_subject_terms_is_not_absence_evidence: true,
    field_terms_describe_general_document_mechanics_and_do_not_establish_an_entity_specific_filing: true,
    publisher_automation_policy_must_not_be_bypassed: true,
    forbidden_inference: fieldSummary.forbidden_inference,
  },
  privacy: {
    raw_source_retained: false,
    complete_remote_files_retained: false,
    extracted_text_retained: false,
    hidden_form_values_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
  },
  public_schoolhouse_identity_admitted: false,
  negative_existence_claim_created: false,
  outside_human_dependency: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  promotes_to: 'candidate_only',
};
writeJson(path.join(DIR, dataFiles.custody), custody);

const schoolhousePath = path.join(DIR, 'schoolhouse.json');
const schoolhouse = readJson(schoolhousePath);
schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_candidate_route_and_complete_pdf_custody';
schoolhouse.state_registry_identity_census.charity_north_carolina_complete_pdf_custody = {
  as_of: '2026-08-05',
  workflow_run_id: 30988735386,
  artifact_id: 8923190161,
  artifact_digest: 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8',
  input_pdf_routes: 15,
  complete_file_hash_rows: 15,
  exact_length_match_rows: 15,
  text_extraction_success_rows: 15,
  total_pdf_pages: 377,
  total_extracted_text_chars_screened: 332175,
  extracted_text_retained: false,
  subject_term_hit_rows: 0,
  subject_term_total_hits: 0,
  field_term_total_hits: 586,
  identity_state: 'unresolved_after_complete_pdf_content_screen_no_public_identity_admitted',
  admitted_legal_name: null,
  admitted_ein: null,
  custody_file: dataFiles.custody,
  field_summary_file: dataFiles.summary,
  boundary: fieldSummary.forbidden_inference,
  graph_effect: 'none',
  promotes_to: 'candidate_only',
};
writeJson(schoolhousePath, schoolhouse);

const frontierPath = path.join(DIR, 'acquisition-frontier.json');
const frontier = readJson(frontierPath);
const legalTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
check(Boolean(legalTask), 'School.House legal-governance frontier task missing');
legalTask.prior_charity_nc_complete_pdf_custody = {
  workflow_run_id: 30988735386,
  artifact_id: 8923190161,
  artifact_digest: 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8',
  acquisition_head: '91a16438fecb1bde772dd88147c06f2c72eca38a',
  input_pdf_routes: 15,
  terminal_routes: 15,
  complete_file_hash_rows: 15,
  text_extraction_success_rows: 15,
  total_pdf_pages: 377,
  total_extracted_text_chars_screened: 332175,
  subject_term_hit_rows: 0,
  subject_term_total_hits: 0,
  field_term_total_hits: 586,
  search_submissions: 0,
  source_rows_acquired: 0,
  admitted_identities: 0,
  state: 'terminal_complete_pdf_hash_and_fixed_term_screen_no_identity_admitted',
  custody_file: dataFiles.custody,
};
legalTask.next_transition = 'Do not repeat the frozen fifty-one-route static residual or fifteen-PDF complete-hash denominator, and do not submit a scripted interactive search. Continue registry-grade legal-name, EIN, exemption, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, state-only registration, and archive-locator evidence. Preserve the Magnolia shared-EIN conflict and admit no public School.House identity without identifier, time, place, organization class, and brand convergence. Zero fixed subject terms in general official PDFs is not absence evidence.';
const archivalTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-source-archival');
if (archivalTask) archivalTask.prior_schoolhouse_complete_pdf_custody = {
  complete_file_hash_rows: 15,
  raw_files_retained: 0,
  artifact_id: 8923190161,
  custody_file: dataFiles.custody,
};
writeJson(frontierPath, frontier);

const coveragePath = path.join(DIR, 'coverage-matrix.json');
const coverage = readJson(coveragePath);
check(!coverage.denominators.some(row => row.surface === 'School.House North Carolina complete official PDF hash and fixed-term content custody'), 'complete-PDF coverage denominator already exists');
coverage.denominators.push({
  surface: 'School.House North Carolina complete official PDF hash and fixed-term content custody',
  declared_total: 15,
  enumerated_total: 15,
  complete_file_hash_rows: 15,
  exact_length_match_rows: 15,
  text_extraction_success_rows: 15,
  total_pdf_pages: 377,
  total_extracted_text_chars_screened: 332175,
  subject_term_hit_rows: 0,
  subject_term_total_hits: 0,
  field_term_total_hits: 586,
  search_submissions: 0,
  coverage_state: 'complete_for_frozen_fifteen_pdf_set_no_subject_terms_no_identity_admitted',
});
const priorGapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the final no-submission North Carolina static residual pass'));
check(priorGapIndex >= 0, 'final-residual explicit-gap row missing');
coverage.explicit_nulls_and_gaps[priorGapIndex] = 'School.House public identity remains unresolved after complete SHA-256 custody and fixed-term screening of all fifteen accessible North Carolina PDFs. All fifteen exact lengths and hashes were captured and 377 pages yielded zero School.House, School.House punctuation, Bravo Victor, or BVVC subject-term hits. That bounded zero is not absence evidence; registry-grade legal name, EIN, exemption, officers, governance, funding, fiscal sponsor, related parties, differently named corporations, state-only registrations, and archive locators remain open.';
writeJson(coveragePath, coverage);

const readmePath = path.join(DIR, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
check(readme.includes('public-source receipts                        275'), 'README source-receipt denominator marker missing');
readme = readme.replace('public-source receipts                        275', 'public-source receipts                        290');
check(readme.includes('source-inventory-01.jsonl` through `source-inventory-11.jsonl'), 'README source-inventory range marker missing');
readme = readme.replace('source-inventory-01.jsonl` through `source-inventory-11.jsonl', 'source-inventory-01.jsonl` through `source-inventory-12.jsonl');
const countAnchor = 'charity/NC final static residual public identities admitted      0\n';
check(readme.includes(countAnchor), 'README final-residual count anchor missing');
readme = readme.replace(countAnchor, `${countAnchor}charity/NC complete PDF routes                         15 / 15\ncharity/NC complete PDF exact hashes                    15 / 15\ncharity/NC complete PDF text extractions                15 / 15\ncharity/NC complete PDF pages                                377\ncharity/NC complete PDF screened text chars              332,175\ncharity/NC complete PDF fixed subject-term hits                0\ncharity/NC complete PDF fixed field-term hits                586\ncharity/NC complete PDF scripted or interactive searches      0\ncharity/NC complete PDF public identities admitted            0\n`);
const fileAnchor = '- `schoolhouse-charity-nc-final-static-residual-custody.json` and the five `schoolhouse-charity-nc-final-static-residual-*.jsonl` input, route, HTML, form, and file-sample files preserve terminal custody for all fifty-one frozen relevant routes and all sixteen file targets: thirty-four HTML successes, fifteen bounded PDF samples, one PDF 404, one manual-page 500, zero forms, zero searches, and zero identity admissions.\n';
check(readme.includes(fileAnchor), 'README file-list anchor missing');
readme = readme.replace(fileAnchor, `${fileAnchor}- \`schoolhouse-charity-nc-complete-pdf-custody.json\`, the fixed input, complete-hash, content-classification, policy, and field-summary files, and \`source-inventory-12.jsonl\` preserve exact full-file SHA-256 custody for all fifteen accessible North Carolina PDFs, 377 privacy-minimized page mechanics, 332,175 screened text characters with no text retained, 586 fixed field-term hits, zero School.House/BVVC subject-term hits, zero searches, and zero identity admissions.\n`);
const continuationNeedle = 'This terminates the frozen static residual route denominator but does not resolve the public School.House legal identity; complete official-file and archive custody plus registry-grade legal-name, EIN, exemption, officer, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence remain open.';
check(readme.includes(continuationNeedle), 'README continuation marker missing');
readme = readme.replace(continuationNeedle, 'This terminates the frozen static residual route denominator but does not resolve the public School.House legal identity. The complete-file successor then captured exact byte lengths and SHA-256 hashes for all fifteen accessible PDFs, extracted and discarded 332,175 characters across 377 pages, counted 586 fixed legal-governance field terms, and observed zero School.House, School.House punctuation, Bravo Victor, or BVVC subject terms. That bounded zero is not absence evidence. Registry-grade legal-name, EIN, exemption, officer, governance, funding, fiscal-sponsor, related-party, differently named corporation, state-only registration, and archive-locator evidence remain open.');
fs.writeFileSync(readmePath, readme);

const manifestPath = path.join(DIR, 'manifest.json');
const manifest = readJson(manifestPath);
check(manifest.counts.source_inventory_rows === 275, 'predecessor source-inventory denominator drift');
check(manifest.counts.coverage_denominator_rows === 21, 'predecessor coverage-denominator drift');
check(manifest.counts.explicit_gap_rows === 16, 'predecessor explicit-gap denominator drift');
check(manifest.source_inventory.evidence_class_counts.official === 194, 'predecessor official-receipt denominator drift');
check(manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-11.jsonl', 'predecessor source-inventory part order drift');
check(!manifest.storage_contract.source_inventory_parts.includes(dataFiles.sourceInventory), 'complete-PDF source-inventory part already exists');
for (const boundary of [
  'A complete-file SHA-256 and fixed-term content screen establishes document custody, not School.House identity, filing, exemption, governance, funding, or control.',
  'Zero fixed School.House or BVVC subject terms in the fifteen frozen North Carolina PDFs is not evidence that no legal entity, filing, exemption, sponsor, or governance record exists elsewhere.',
]) if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
manifest.counts.source_inventory_rows = 290;
manifest.counts.coverage_denominator_rows = 22;
Object.assign(manifest.counts, {
  schoolhouse_charity_nc_complete_pdf_input_rows: 15,
  schoolhouse_charity_nc_complete_pdf_terminal_route_rows: 15,
  schoolhouse_charity_nc_complete_pdf_complete_file_hash_rows: 15,
  schoolhouse_charity_nc_complete_pdf_exact_length_match_rows: 15,
  schoolhouse_charity_nc_complete_pdf_text_extraction_success_rows: 15,
  schoolhouse_charity_nc_complete_pdf_total_pages: 377,
  schoolhouse_charity_nc_complete_pdf_screened_text_chars: 332175,
  schoolhouse_charity_nc_complete_pdf_subject_term_hit_rows: 0,
  schoolhouse_charity_nc_complete_pdf_subject_term_total_hits: 0,
  schoolhouse_charity_nc_complete_pdf_field_term_total_hits: 586,
  schoolhouse_charity_nc_complete_pdf_search_submissions: 0,
  schoolhouse_charity_nc_complete_pdf_source_rows_acquired: 0,
  schoolhouse_charity_nc_complete_pdf_admitted_identity_rows: 0,
});
manifest.coverage.schoolhouse_charity_nc_complete_pdf_custody = '15_of_15_complete_hashes_15_text_extractions_377_pages_332175_chars_screened_586_field_terms_zero_subject_terms_zero_searches_zero_identity_admissions';
manifest.custody.next_waterline = 'registry_grade_schoolhouse_legal_identity_governance_and_archive_locator_evidence';
const priorPurpose = manifest.purpose;
manifest.purpose = manifest.purpose.replace('Florida-charity and North Carolina first-level, second-level, and final static residual route custody', 'Florida-charity and North Carolina first-level, second-level, final static residual route, and complete-PDF hash and content-field custody');
check(manifest.purpose !== priorPurpose, 'manifest purpose marker missing');
manifest.source_inventory.evidence_class_counts.official += 15;
manifest.source_inventory.source_state_counts.captured_complete_file_hash = 15;
manifest.storage_contract.source_inventory_parts.push(dataFiles.sourceInventory);
Object.assign(manifest.storage_contract, {
  schoolhouse_charity_nc_complete_pdf_custody: dataFiles.custody,
  schoolhouse_charity_nc_complete_pdf_input_routes: dataFiles.inputs,
  schoolhouse_charity_nc_complete_pdf_full_file_custody: dataFiles.full,
  schoolhouse_charity_nc_complete_pdf_content_field_classification: dataFiles.classifications,
  schoolhouse_charity_nc_complete_pdf_route_policy: dataFiles.policy,
  schoolhouse_charity_nc_complete_pdf_field_summary: dataFiles.summary,
});

const validatorPath = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');
let validator = fs.readFileSync(validatorPath, 'utf8');
check(!validator.includes('schoolhouse-charity-nc-complete-pdf-custody.json'), 'complete-PDF validator block already exists');
const sourceDenominatorMarkers = validator.split("manifest.counts.source_inventory_rows === 275").length - 1;
const coverageDenominatorMarkers = validator.split("manifest.counts.coverage_denominator_rows === 21").length - 1;
check(sourceDenominatorMarkers >= 2, `expected at least two source-denominator markers, found ${sourceDenominatorMarkers}`);
check(coverageDenominatorMarkers >= 2, `expected at least two coverage-denominator markers, found ${coverageDenominatorMarkers}`);
validator = validator.replaceAll("manifest.counts.source_inventory_rows === 275", "manifest.counts.source_inventory_rows === 290");
validator = validator.replaceAll("manifest.counts.coverage_denominator_rows === 21", "manifest.counts.coverage_denominator_rows === 22");
const marker = '\n  return errors;\n}';
check(validator.includes(marker), 'validator return marker missing');
const validatorBlock = `

  {
    const completePdfCustody = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-custody.json'));
    const completePdfInputs = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-input-routes.jsonl'));
    const completePdfFull = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-full-file-custody.jsonl'));
    const completePdfClass = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-content-field-classification.jsonl'));
    const completePdfPolicy = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-route-policy.json'));
    const completePdfSummary = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-field-summary.json'));

    check(manifest.counts.source_inventory_rows === 290, 'complete-PDF source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 22, 'complete-PDF coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'complete-PDF explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_input_rows === completePdfInputs.length && completePdfInputs.length === 15, 'complete-PDF input denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_terminal_route_rows === completePdfFull.length && completePdfFull.length === 15, 'complete-PDF terminal denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_complete_file_hash_rows === completePdfFull.filter(row => row.state === 'complete_file_hashed').length && manifest.counts.schoolhouse_charity_nc_complete_pdf_complete_file_hash_rows === 15, 'complete-PDF hash denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_exact_length_match_rows === completePdfFull.filter(row => row.expected_length_matches === true).length && manifest.counts.schoolhouse_charity_nc_complete_pdf_exact_length_match_rows === 15, 'complete-PDF length-match denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_text_extraction_success_rows === completePdfClass.filter(row => row.text_extraction_state === 'success').length && manifest.counts.schoolhouse_charity_nc_complete_pdf_text_extraction_success_rows === 15, 'complete-PDF text-extraction denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_total_pages === completePdfClass.reduce((sum, row) => sum + row.page_count, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_total_pages === 377, 'complete-PDF page denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_screened_text_chars === completePdfClass.reduce((sum, row) => sum + row.extracted_text_chars, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_screened_text_chars === 332175, 'complete-PDF screened-text denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_hit_rows === completePdfClass.filter(row => row.subject_term_hit).length && manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_hit_rows === 0, 'complete-PDF subject-hit row drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_total_hits === completePdfClass.reduce((sum, row) => sum + row.subject_term_hits, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_total_hits === 0, 'complete-PDF subject-hit total drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_field_term_total_hits === completePdfClass.reduce((sum, row) => sum + row.field_term_hits, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_field_term_total_hits === 586, 'complete-PDF field-term total drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_complete_pdf_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_complete_pdf_admitted_identity_rows === 0, 'complete-PDF authority-count drift');

    check(unique(completePdfInputs.map(row => row.route_id)) && unique(completePdfInputs.map(row => row.receipt_id)), 'complete-PDF input IDs must be unique');
    check(completePdfInputs.every(row => knownReceiptIds.has(row.receipt_id) && row.complete_remote_file_retained === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'complete-PDF input custody drift');
    check(unique(completePdfFull.map(row => row.route_id)) && unique(completePdfFull.map(row => row.receipt_id)), 'complete-PDF full-file IDs must be unique');
    check(completePdfFull.every(row => knownReceiptIds.has(row.receipt_id) && row.state === 'complete_file_hashed' && row.status === 200 && row.complete_file_hash_claimed === true && row.expected_length_matches === true && typeof row.full_file_sha256 === 'string' && row.full_file_sha256.length === 64), 'complete-PDF full-file state drift');
    check(completePdfFull.every(row => row.request_method === 'GET' && row.request_count === 1 && row.range_requested === false && row.query_submitted === false && row.organization_name_submitted === false && row.license_number_submitted === false), 'complete-PDF request-bound drift');
    check(completePdfFull.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.complete_remote_file_retained === false && row.hidden_form_values_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'complete-PDF privacy drift');
    check(completePdfFull.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'complete-PDF authority drift');
    check(unique(completePdfClass.map(row => row.route_id)) && unique(completePdfClass.map(row => row.receipt_id)), 'complete-PDF classification IDs must be unique');
    check(completePdfClass.every(row => knownReceiptIds.has(row.receipt_id) && row.pdfinfo_state === 'success' && row.text_extraction_state === 'success' && row.content_classification_state === 'aggregate_term_counts_complete_file'), 'complete-PDF classification state drift');
    check(completePdfClass.every(row => row.subject_term_hit === false && row.subject_term_hits === 0 && row.identity_admission_state === 'no_subject_term_observed_in_extracted_text' && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'complete-PDF subject/identity drift');

    check(completePdfPolicy.artifact_workflow_run_id === 30988735386 && completePdfPolicy.artifact_id === 8923190161 && completePdfPolicy.artifact_digest === 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8', 'complete-PDF policy artifact drift');
    check(completePdfPolicy.maximum_attempts_per_route === 1 && completePdfPolicy.search_submissions === 0 && completePdfPolicy.raw_source_retained === false && completePdfPolicy.complete_remote_files_retained === false && completePdfPolicy.extracted_text_retained === false && completePdfPolicy.identity_admitted === false && completePdfPolicy.graph_effect === 'none', 'complete-PDF policy authority drift');
    check(completePdfSummary.complete_file_hash_rows === 15 && completePdfSummary.text_extraction_success_rows === 15 && completePdfSummary.total_pdf_pages === 377 && completePdfSummary.total_extracted_text_chars_screened === 332175 && completePdfSummary.subject_term_total_hits === 0 && completePdfSummary.field_term_total_hits === 586, 'complete-PDF field summary denominator drift');
    check(completePdfSummary.extracted_text_retained === false && completePdfSummary.public_schoolhouse_identity_admitted === false && completePdfSummary.negative_existence_claim_created === false && completePdfSummary.graph_effect === 'none', 'complete-PDF field summary authority drift');

    check(completePdfCustody.acquisition.workflow_run_id === 30988735386 && completePdfCustody.acquisition.artifact_id === 8923190161 && completePdfCustody.acquisition.artifact_digest === 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8' && completePdfCustody.acquisition.acquisition_head === '91a16438fecb1bde772dd88147c06f2c72eca38a', 'complete-PDF acquisition custody drift');
    check(completePdfCustody.counts.input_pdf_routes === 15 && completePdfCustody.counts.terminal_route_rows === 15 && completePdfCustody.counts.complete_file_hash_rows === 15 && completePdfCustody.counts.text_extraction_success_rows === 15 && completePdfCustody.counts.total_pdf_pages === 377 && completePdfCustody.counts.subject_term_total_hits === 0 && completePdfCustody.counts.field_term_total_hits === 586, 'complete-PDF custody denominator drift');
    check(completePdfCustody.terminal_frontier.complete_file_hash_denominator_terminal === true && completePdfCustody.terminal_frontier.fixed_subject_term_screen_terminal === true && completePdfCustody.terminal_frontier.outside_human_dependency === false, 'complete-PDF terminal frontier drift');
    check(completePdfCustody.privacy.raw_source_retained === false && completePdfCustody.privacy.complete_remote_files_retained === false && completePdfCustody.privacy.extracted_text_retained === false && completePdfCustody.privacy.street_address_rows_retained === 0 && completePdfCustody.privacy.contact_detail_rows_retained === 0 && completePdfCustody.privacy.private_support_rows === 0, 'complete-PDF custody privacy drift');
    check(completePdfCustody.public_schoolhouse_identity_admitted === false && completePdfCustody.negative_existence_claim_created === false && completePdfCustody.outside_human_dependency === false && completePdfCustody.publication_effect === 'none' && completePdfCustody.adoption_effect === 'none' && completePdfCustody.graph_effect === 'none' && completePdfCustody.promotes_to === 'candidate_only', 'complete-PDF custody authority drift');

    const completePdfProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_complete_pdf_custody;
    check(completePdfProjection?.complete_file_hash_rows === 15 && completePdfProjection?.text_extraction_success_rows === 15 && completePdfProjection?.total_pdf_pages === 377 && completePdfProjection?.subject_term_total_hits === 0 && completePdfProjection?.field_term_total_hits === 586, 'School.House complete-PDF projection drift');
    check(completePdfProjection?.identity_state === 'unresolved_after_complete_pdf_content_screen_no_public_identity_admitted' && completePdfProjection?.admitted_legal_name === null && completePdfProjection?.admitted_ein === null, 'School.House complete-PDF identity authority drift');
    const completePdfFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_complete_pdf_custody;
    check(completePdfFrontier?.complete_file_hash_rows === 15 && completePdfFrontier?.text_extraction_success_rows === 15 && completePdfFrontier?.total_pdf_pages === 377 && completePdfFrontier?.subject_term_total_hits === 0 && completePdfFrontier?.field_term_total_hits === 586 && completePdfFrontier?.admitted_identities === 0, 'School.House complete-PDF frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House North Carolina complete official PDF hash and fixed-term content custody' && row.enumerated_total === 15 && row.complete_file_hash_rows === 15 && row.total_pdf_pages === 377 && row.subject_term_total_hits === 0 && row.field_term_total_hits === 586 && row.search_submissions === 0), 'complete-PDF coverage denominator missing');
  }`;
validator = validator.replace(marker, `${validatorBlock}${marker}`);
fs.writeFileSync(validatorPath, validator);

writeJson(frontierPath, frontier);
writeJson(coveragePath, coverage);
writeJson(schoolhousePath, schoolhouse);

const manifestBoundFiles = [
  'acquisition-frontier.json',
  'coverage-matrix.json',
  'schoolhouse.json',
  dataFiles.sourceInventory,
  dataFiles.custody,
  dataFiles.inputs,
  dataFiles.full,
  dataFiles.classifications,
  dataFiles.policy,
  dataFiles.summary,
];
for (const name of manifestBoundFiles) manifest.files[name] = fileMeta(path.join(DIR, name));
writeJson(manifestPath, manifest);

const output = {
  schema_version: 'schoolhouse-charity-nc-complete-pdf-build@1',
  source_inventory_rows: manifest.counts.source_inventory_rows,
  coverage_denominator_rows: manifest.counts.coverage_denominator_rows,
  input_pdf_routes: 15,
  complete_file_hash_rows: 15,
  text_extraction_success_rows: 15,
  total_pdf_pages: 377,
  total_extracted_text_chars_screened: 332175,
  subject_term_total_hits: 0,
  field_term_total_hits: 586,
  search_submissions: 0,
  admitted_identities: 0,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
};
console.log(JSON.stringify(output, null, 2));
