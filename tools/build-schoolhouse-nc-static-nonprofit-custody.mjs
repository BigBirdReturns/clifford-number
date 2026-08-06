import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const CANONICAL_PARENT_COMMIT = 'b6d69b5502e4429e3769591b5ebd88555aad62be';
const CANONICAL_PARENT_TREE = 'f3d6a9f856dd22833f11847ae4b18bdbd4151890';
const ACQUISITION = {
  pr: 1232,
  workflow_run_id: 31065319021,
  workflow_head: '180fed11c83ea08cc014b2f5ea0c785e97bfcfdc',
  artifact_id: 8953623153,
  artifact_digest: 'sha256:f1462cc30b2f34d56ab59d0711d88e4ef4017a8eded51406b511c6cbc84210cc',
};
const ARTIFACT_SHA256 = {
  'SHA256SUMS': 'ac3b78b63ea7510e4423717c5028d554fc276ff55539971ca23c568253b88ea2',
  'adjudication.json': '7dea3787842b8b1ed8650fd4d352a6e1bf01de1762fc00eb986d9086e5638e3e',
  'artifact-manifest.json': 'da6989de3e94cb46fd156030933d76f06158b844c525374cd429d8b2089a2830',
  'block-hit-receipts.jsonl': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'candidate-rows.jsonl': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'route-results.jsonl': '209d978caa18067ddd0e2be1b8521524cd6b3e14f4f34c8b0479ac8f72de6458',
  'source-receipt.json': '4f9d5939368aee355a19a64ac6ae4caa2fb6c2bbdc945fc026efcd0a027a81f6',
  'summary.json': 'c58723d931298599a9af5656b77a6b3c4e44ef63e6862837504545a04a73c1d9',
  'target-matrix.json': 'ca8f1e138e8acc3af5a4f155513499b03110c0528cf42424be505fb7b405a8d4',
};
const PREDECESSOR_SOURCE_ROWS = 478;
const PREDECESSOR_COVERAGE_ROWS = 29;
const EXPECTED_SOURCE_ROWS = 480;
const EXPECTED_COVERAGE_ROWS = 30;
const EXPECTED_GAP_ROWS = 16;
const FILES = {
  sourceReceipt: 'schoolhouse-nc-static-nonprofit-census-source-receipt.json',
  routeResults: 'schoolhouse-nc-static-nonprofit-census-route-results.jsonl',
  targetMatrix: 'schoolhouse-nc-static-nonprofit-census-target-matrix.json',
  adjudication: 'schoolhouse-nc-static-nonprofit-census-adjudication.json',
  candidates: 'schoolhouse-nc-static-nonprofit-census-candidate-rows.jsonl',
  blockHits: 'schoolhouse-nc-static-nonprofit-census-block-hit-receipts.jsonl',
  custody: 'schoolhouse-nc-static-nonprofit-census-custody.json',
  sourceInventory: 'source-inventory-20.jsonl',
};

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonicalJsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const writeJsonl = (file, rows) => fs.writeFileSync(file, canonicalJsonl(rows));
const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const countOccurrences = (value, needle) => value.split(needle).length - 1;
const replaceOnce = (value, from, to, label) => {
  assert.equal(countOccurrences(value, from), 1, `${label}: expected exactly one occurrence`);
  return value.replace(from, to);
};
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};
const unique = values => new Set(values).size === values.length;

function verifyPredecessor() {
  const manifest = readJson(path.join(DATA_DIR, 'manifest.json'));
  const coverage = readJson(path.join(DATA_DIR, 'coverage-matrix.json'));
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS);
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS);
  assert.equal(manifest.counts.explicit_gap_rows, EXPECTED_GAP_ROWS);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS);
  assert.equal(coverage.explicit_nulls_and_gaps.length, EXPECTED_GAP_ROWS);
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-19.jsonl');
  assert.equal(manifest.source_inventory.evidence_class_counts.official, 253);
  assert.equal(manifest.source_inventory.source_state_counts.captured_corporate_bulk_central_directory, 1);
}

function verifyChecksums(dir) {
  const checksum = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(checksum), 'artifact SHA256SUMS missing');
  assert.equal(sha256File(checksum), ARTIFACT_SHA256.SHA256SUMS, 'artifact SHA256SUMS drift');
  for (const line of fs.readFileSync(checksum, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `malformed artifact checksum row: ${line}`);
    const target = path.join(dir, match[2]);
    assert(fs.existsSync(target), `artifact file missing: ${match[2]}`);
    assert.equal(sha256File(target), match[1], `artifact checksum drift: ${match[2]}`);
  }
  for (const [filename, expected] of Object.entries(ARTIFACT_SHA256)) {
    assert.equal(sha256File(path.join(dir, filename)), expected, `sealed artifact SHA drift: ${filename}`);
  }
}

function verifyArtifact(dir) {
  verifyChecksums(dir);
  const summary = readJson(path.join(dir, 'summary.json'));
  const source = readJson(path.join(dir, 'source-receipt.json'));
  const routes = readJsonl(path.join(dir, 'route-results.jsonl'));
  const target = readJson(path.join(dir, 'target-matrix.json'));
  const adjudication = readJson(path.join(dir, 'adjudication.json'));
  const candidates = readJsonl(path.join(dir, 'candidate-rows.jsonl'));
  const blockHits = readJsonl(path.join(dir, 'block-hit-receipts.jsonl'));
  const artifactManifest = readJson(path.join(dir, 'artifact-manifest.json'));

  assert.equal(summary.schema_version, 'schoolhouse-nc-static-nonprofit-census@1');
  assert.equal(summary.declared_static_routes, 2);
  assert.equal(summary.terminal_routes, 2);
  assert.equal(summary.accessible_static_html_routes, 2);
  assert.equal(summary.transport_or_http_error_routes, 0);
  assert.equal(summary.body_bytes_screened, 1040288);
  assert.equal(summary.visible_text_chars_screened, 58971);
  assert.equal(summary.script_text_chars_screened, 4044);
  assert.equal(summary.table_rows_screened, 0);
  assert.equal(summary.table_data_rows_screened, 0);
  assert.equal(summary.source_rows_acquired, 0);
  assert.equal(summary.candidate_rows, 0);
  assert.equal(summary.candidate_block_hits, 0);
  assert.equal(summary.query_submissions, 0);
  assert.equal(summary.form_submissions, 0);
  assert.equal(summary.identity_admitted_rows, 0);
  assert.equal(summary.negative_existence_claims_created, 0);
  assert.equal(summary.raw_source_retained, false);
  assert.equal(summary.raw_visible_text_retained, false);
  assert.equal(summary.raw_script_text_retained, false);
  assert.equal(summary.street_address_rows_retained, 0);
  assert.equal(summary.mailing_address_rows_retained, 0);
  assert.equal(summary.postal_code_rows_retained, 0);
  assert.equal(summary.contact_detail_rows_retained, 0);
  assert.equal(summary.private_support_rows, 0);
  assert.equal(summary.outside_human_dependency, false);
  assert.equal(summary.publication_effect, 'none');
  assert.equal(summary.adoption_effect, 'none');
  assert.equal(summary.graph_effect, 'none');
  assert.equal(summary.promotes_to, 'candidate_only');
  assert.equal(summary.terminal_state, 'terminal_two_route_get_only_nc_static_nonprofit_census_no_identity_admitted');

  assert.equal(source.schema_version, 'schoolhouse-nc-static-nonprofit-source-receipt@1');
  assert.equal(source.receipt_id, 'r-nc-sos-static-nonprofit-reports-2026-08-05');
  assert.equal(source.routes.length, 2);
  assert.deepEqual(source.routes.map(row => row.route_id), ['nc-nonprofits-by-county', 'nc-unincorporated-nonprofits']);
  assert.deepEqual(source.routes.map(row => row.body_sha256), [
    'a6ec51d7095e3df619add33c9fe6ec12b3aa171a4c774b1e0f61b48707f97649',
    '752893c3363833eade108e721378f6dadd4a56695711f496e8546f9cce3203f7',
  ]);
  assert.deepEqual(source.routes.map(row => row.body_bytes), [121309, 918979]);
  assert(source.routes.every(row => row.http_status === 200 && row.state === 'accessible_static_html' && row.table_data_rows === 0 && row.candidate_rows === 0));
  assert.equal(source.query_submissions, 0);
  assert.equal(source.form_submissions, 0);
  assert.equal(source.raw_source_retained, false);
  assert.equal(source.identity_admitted, false);
  assert.equal(source.negative_existence_claim_created, false);
  assert.equal(source.outside_human_dependency, false);
  assert.equal(source.graph_effect, 'none');

  assert.equal(routes.length, 2);
  assert(unique(routes.map(row => row.route_id)));
  assert(routes.every(row => row.method === 'GET' && row.http_status === 200 && row.state === 'accessible_static_html'));
  assert(routes.every(row => row.table_count === 0 && row.table_rows_total === 0 && row.table_data_rows === 0 && row.candidate_rows === 0 && row.candidate_block_hits === 0));
  assert(routes.every(row => row.query_submitted === false && row.form_submitted === false && row.raw_source_retained === false && row.raw_html_retained === false && row.raw_visible_text_retained === false && row.raw_script_text_retained === false));
  assert(routes.every(row => row.street_address_rows_retained === 0 && row.mailing_address_rows_retained === 0 && row.postal_code_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0));
  assert(routes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'));

  assert.equal(target.schema_version, 'schoolhouse-nc-static-nonprofit-target-matrix@1');
  assert.equal(target.routes.length, 2);
  assert.deepEqual(target.person_targets.map(row => row.public_label), ['Joe Musselman', 'Alex Martin', 'Leyla Gladish', 'Nicole Nsam']);
  assert.equal(target.interactive_search_prohibited, true);
  assert.equal(target.query_submissions, 0);
  assert.equal(target.outside_human_dependency, false);
  assert.equal(target.graph_effect, 'none');

  assert.equal(candidates.length, 0);
  assert.equal(blockHits.length, 0);
  assert.equal(adjudication.schema_version, 'schoolhouse-nc-static-nonprofit-adjudication@1');
  assert.equal(adjudication.public_schoolhouse_identity_admitted, false);
  assert.equal(adjudication.negative_existence_claim_created, false);
  assert.equal(adjudication.outside_human_dependency, false);
  assert.equal(adjudication.graph_effect, 'none');
  assert.equal(artifactManifest.schema_version, 'schoolhouse-nc-static-nonprofit-artifact-manifest@1');
  assert.equal(artifactManifest.counts.routes, 2);
  assert.equal(artifactManifest.counts.table_data_rows_screened, 0);
  assert.equal(artifactManifest.counts.candidate_rows, 0);
  assert.equal(artifactManifest.counts.block_hit_receipts, 0);
  assert.equal(artifactManifest.counts.identity_admitted_rows, 0);
  assert.equal(artifactManifest.raw_source_retained, false);
  assert.equal(artifactManifest.outside_human_dependency, false);
  assert.equal(artifactManifest.graph_effect, 'none');
  return { summary, source, routes, target, adjudication, candidates, blockHits, artifactManifest };
}

function copyArtifactFile(dir, sourceName, targetName) {
  fs.copyFileSync(path.join(dir, sourceName), path.join(DATA_DIR, targetName));
}

function sourceInventoryRows(routes) {
  const receiptIds = [
    'r-nc-sos-static-nonprofit-reports-2026-08-05',
    'r-nc-sos-static-unincorporated-nonprofits-2026-08-05',
  ];
  return routes.map((route, index) => ({
    receipt_id: receiptIds[index],
    source_id: `schoolhouse-nc-static-nonprofit-${route.route_id}`,
    locator_url: route.requested_url,
    source_type: 'official_north_carolina_static_nonprofit_report',
    evidence_class: 'official',
    source_state: 'captured_nc_static_nonprofit_html_surface',
    retrieved_at: AS_OF,
    content_sha256: route.body_sha256,
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    acquisition_head: ACQUISITION.workflow_head,
    route_id: route.route_id,
    request_method: 'GET',
    http_status: 200,
    response_bytes: route.body_bytes,
    content_type: route.content_type,
    table_rows_screened: route.table_rows_total,
    table_data_rows_screened: route.table_data_rows,
    visible_text_chars_screened: route.visible_text_chars_screened,
    script_text_chars_screened: route.script_text_chars_screened,
    source_rows_acquired: 0,
    candidate_rows: 0,
    query_submitted: false,
    form_submitted: false,
    raw_source_retained: false,
    raw_visible_text_retained: false,
    raw_script_text_retained: false,
    street_address_rows_retained: 0,
    mailing_address_rows_retained: 0,
    postal_code_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    identity_admitted: false,
    relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    note: 'Exact official North Carolina static nonprofit report HTML acquired and privacy-minimized; zero rendered table rows is bounded surface custody and not absence evidence.',
  }));
}

function buildCustody(artifact) {
  return {
    schema_version: 'schoolhouse-nc-static-nonprofit-census-custody@1',
    as_of: AS_OF,
    canonical_parent: { commit: CANONICAL_PARENT_COMMIT, tree: CANONICAL_PARENT_TREE },
    acquisition: {
      pull_request: ACQUISITION.pr,
      workflow_run_id: ACQUISITION.workflow_run_id,
      workflow_head: ACQUISITION.workflow_head,
      artifact_id: ACQUISITION.artifact_id,
      artifact_digest: ACQUISITION.artifact_digest,
      artifact_sha256sums_sha256: ARTIFACT_SHA256.SHA256SUMS,
      artifact_manifest_sha256: ARTIFACT_SHA256['artifact-manifest.json'],
    },
    counts: {
      declared_static_routes: 2,
      terminal_routes: 2,
      accessible_static_html_routes: 2,
      transport_or_http_error_routes: 0,
      body_bytes_screened: 1040288,
      visible_text_chars_screened: 58971,
      script_text_chars_screened: 4044,
      table_rows_screened: 0,
      table_data_rows_screened: 0,
      source_rows_acquired: 0,
      candidate_rows: 0,
      candidate_block_hits: 0,
      exact_public_brand_candidate_rows: 0,
      fayetteville_candidate_rows: 0,
      cumberland_candidate_rows: 0,
      query_submissions: 0,
      form_submissions: 0,
      identity_admitted_rows: 0,
      relationship_admitted_rows: 0,
      negative_existence_claims_created: 0,
    },
    source_inventory_receipt_ids: [
      'r-nc-sos-static-nonprofit-reports-2026-08-05',
      'r-nc-sos-static-unincorporated-nonprofits-2026-08-05',
    ],
    interpretation: {
      static_report_page_is_not_registry_grade_identity: true,
      zero_rendered_table_rows_are_not_zero_records: true,
      zero_candidate_rows_are_not_absence_evidence: true,
      county_or_unincorporated_report_language_is_not_a_schoolhouse_join: true,
      source_page_structure_may_change_without_record_absence: true,
      no_identity_or_relationship_may_be_admitted_by_this_lane: true,
    },
    privacy: {
      raw_source_retained: false,
      raw_visible_text_retained: false,
      raw_script_text_retained: false,
      hidden_form_values_retained: false,
      street_address_rows_retained: 0,
      mailing_address_rows_retained: 0,
      postal_code_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    terminal_state: 'terminal_two_route_get_only_nc_static_nonprofit_census_no_identity_admitted',
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_formation_record: null,
    admitted_officer_or_director: null,
    admitted_fiscal_sponsor: null,
    relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function updateSchoolhouse() {
  const file = path.join(DATA_DIR, 'schoolhouse.json');
  const schoolhouse = readJson(file);
  const state = schoolhouse.state_registry_identity_census;
  assert(state && !state.north_carolina_static_nonprofit_census, 'NC static nonprofit projection already exists');
  state.north_carolina_static_nonprofit_census = {
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    declared_static_routes: 2,
    terminal_routes: 2,
    accessible_static_html_routes: 2,
    body_bytes_screened: 1040288,
    visible_text_chars_screened: 58971,
    script_text_chars_screened: 4044,
    table_rows_screened: 0,
    table_data_rows_screened: 0,
    source_rows_acquired: 0,
    candidate_rows: 0,
    candidate_block_hits: 0,
    query_submissions: 0,
    form_submissions: 0,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    terminal_state: 'terminal_two_route_get_only_nc_static_nonprofit_census_no_identity_admitted',
    source_receipt_file: FILES.sourceReceipt,
    route_results_file: FILES.routeResults,
    target_matrix_file: FILES.targetMatrix,
    adjudication_file: FILES.adjudication,
    custody_file: FILES.custody,
    boundary: 'Both exact official North Carolina nonprofit report pages were acquired and hashed, but rendered zero table rows. That is page-structure custody, not evidence that no corporation, unincorporated nonprofit, filing, sponsor, or differently named School.House entity exists.',
  };
  state.identity_state = 'unresolved_after_complete_florida_corporate_and_bounded_nc_static_nonprofit_report_custody_no_public_identity_admitted';
  state.boundary += ' The two exact North Carolina static nonprofit report pages were acquired with zero rendered table rows and zero candidates; page structure and bounded zero observations do not establish entity or filing absence.';
  writeJson(file, schoolhouse);
}

function updateFrontier() {
  const file = path.join(DATA_DIR, 'acquisition-frontier.json');
  const frontier = readJson(file);
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(task && !task.prior_nc_static_nonprofit_census, 'legal-governance task projection drift');
  task.prior_nc_static_nonprofit_census = {
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    declared_static_routes: 2,
    terminal_routes: 2,
    body_bytes_screened: 1040288,
    table_data_rows_screened: 0,
    source_rows_acquired: 0,
    candidate_rows: 0,
    query_submissions: 0,
    form_submissions: 0,
    admitted_identities: 0,
    state: 'terminal_two_route_get_only_nc_static_nonprofit_census_no_identity_admitted',
    custody_file: FILES.custody,
  };
  task.next_transition = 'Do not repeat the frozen North Carolina route/PDF, first-party, Archive, Florida charity, complete July 2026 Florida corporate, or the two exact North Carolina static nonprofit report-page denominators unless a material provider or source condition changes. The NC static pages were acquired and hashed but rendered zero table rows; that is not a zero-record search. Continue only with materially distinct registry-grade legal-name, EIN, exemption, formation, officer, board, funding, fiscal-sponsor, related-party, differently named corporation, state-only registration, or separately authorized exact report-query evidence.';
  writeJson(file, frontier);
}

function updateCoverage() {
  const file = path.join(DATA_DIR, 'coverage-matrix.json');
  const coverage = readJson(file);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS);
  assert(!coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit report custody'));
  coverage.denominators.push({
    surface: 'School.House North Carolina static nonprofit report custody',
    declared_total: 2,
    enumerated_total: 2,
    accessible_static_html_routes: 2,
    body_bytes_screened: 1040288,
    visible_text_chars_screened: 58971,
    script_text_chars_screened: 4044,
    table_rows_screened: 0,
    table_data_rows_screened: 0,
    source_rows_acquired: 0,
    candidate_total: 0,
    query_submissions: 0,
    form_submissions: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_two_route_get_only_static_page_custody_zero_rendered_table_rows_not_absence_evidence',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the complete first-party live-surface census'));
  assert(gapIndex >= 0, 'School.House cumulative gap missing');
  coverage.explicit_nulls_and_gaps[gapIndex] += ' The North Carolina static nonprofit successor then acquired and hashed both exact official report pages, screening 1,040,288 body bytes, 58,971 visible-text characters, and 4,044 script characters. Both pages rendered zero table rows, produced zero candidate rows and zero block hits, and required zero searches or form submissions. A zero rendered-table denominator is page-structure custody rather than evidence that no entity, filing, sponsor, related party, or differently named corporation exists.';
  writeJson(file, coverage);
}

function updateReadme() {
  const file = path.join(DATA_DIR, 'README.md');
  let text = fs.readFileSync(file, 'utf8');
  text = replaceOnce(text, 'public-source receipts                        478', 'public-source receipts                        480', 'README source count');
  const marker = 'state-registry identities admitted                     0\n';
  const block = [
    'North Carolina static nonprofit routes acquired         2 / 2',
    'North Carolina static nonprofit body bytes          1,040,288',
    'North Carolina rendered table/data rows                0 / 0',
    'North Carolina static nonprofit candidate rows             0',
    'North Carolina static nonprofit identities admitted        0',
  ].join('\n') + '\n';
  text = replaceOnce(text, marker, block + marker, 'README NC counts');
  const filesMarker = '- `schoolhouse-fl-corporate-identity-census-custody.json`, `schoolhouse-fl-corporate-identity-census-source-receipt.json`, `schoolhouse-fl-corporate-identity-census-remote-zip-index.json`, `schoolhouse-fl-corporate-identity-census-range-request-receipts.jsonl`, `schoolhouse-fl-corporate-identity-census-member-receipts.jsonl`, `schoolhouse-fl-corporate-identity-census-target-matrix.json`, `schoolhouse-fl-corporate-identity-census-candidate-records.jsonl`, `schoolhouse-fl-corporate-identity-census-adjudication.json`, and `source-inventory-19.jsonl` preserve the complete ten-partition, 12,808,196-row Florida corporate candidate census. The product retains 300 privacy-minimized candidate documents, four inactive exact public-brand-base records, twenty-two exact public-label Alex Martin rows, zero SchoolHouse-name/person overlap, and zero identity admissions while discarding raw members, street and mailing addresses, postal codes, contact details, and the public credential password.\n';
  const filesAddition = `- \`${FILES.custody}\`, \`${FILES.sourceReceipt}\`, \`${FILES.routeResults}\`, \`${FILES.targetMatrix}\`, \`${FILES.adjudication}\`, \`${FILES.candidates}\`, \`${FILES.blockHits}\`, and \`${FILES.sourceInventory}\` preserve the exact two-route North Carolina static nonprofit report census. Both pages were acquired and hashed; neither rendered a table row or candidate. The lane retains no response body, address, contact detail, officer row, private support, identity, relationship, or absence claim.\n`;
  text = replaceOnce(text, filesMarker, filesMarker + filesAddition, 'README NC files');
  const narrativeMarker = 'The lawful-route successor then enumerated eight official roots';
  const narrativeAddition = 'The North Carolina static nonprofit successor then acquired the exact nonprofits-by-county and unincorporated-nonprofits pages through two GET requests. It hashed 1,040,288 response bytes and screened 58,971 visible-text and 4,044 script characters while retaining no raw source. Both pages rendered zero tables and zero data rows, producing zero School.House, location, or source-listed-person candidates. This is terminal custody for those two static page surfaces, not a zero-result entity search or evidence that no differently named corporation, unincorporated association, sponsor, filing, or related party exists.\n\n';
  text = replaceOnce(text, narrativeMarker, narrativeAddition + narrativeMarker, 'README NC narrative');
  fs.writeFileSync(file, text);
}

function standaloneValidatorSource() {
  return `import assert from 'node:assert/strict';\nimport crypto from 'node:crypto';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst DEFAULT_DIR = 'data/intake/bvvc-defense-capital';\nconst readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));\nconst readJsonl = file => fs.readFileSync(file, 'utf8').split(/\\r?\\n/).filter(Boolean).map(JSON.parse);\nconst sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');\n\nexport function validateSchoolhouseNcStaticNonprofitCustody(dir = DEFAULT_DIR) {\n  const errors = [];\n  const check = (condition, message) => { if (!condition) errors.push(message); };\n  const manifest = readJson(path.join(dir, 'manifest.json'));\n  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));\n  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));\n  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));\n  const source = readJson(path.join(dir, '${FILES.sourceReceipt}'));\n  const routes = readJsonl(path.join(dir, '${FILES.routeResults}'));\n  const targets = readJson(path.join(dir, '${FILES.targetMatrix}'));\n  const adjudication = readJson(path.join(dir, '${FILES.adjudication}'));\n  const candidates = readJsonl(path.join(dir, '${FILES.candidates}'));\n  const blockHits = readJsonl(path.join(dir, '${FILES.blockHits}'));\n  const custody = readJson(path.join(dir, '${FILES.custody}'));\n  const sourceRows = readJsonl(path.join(dir, '${FILES.sourceInventory}'));\n\n  check(manifest.counts.source_inventory_rows === 480, 'source inventory denominator');\n  check(manifest.counts.coverage_denominator_rows === 30, 'coverage denominator');\n  check(manifest.counts.explicit_gap_rows === 16, 'gap denominator');\n  check(manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === '${FILES.sourceInventory}', 'source inventory tail');\n  check(manifest.source_inventory.evidence_class_counts.official === 255, 'official evidence count');\n  check(manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_html_surface === 2, 'NC source state count');\n  check(coverage.denominators.length === 30, 'coverage row length');\n  check(coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit report custody' && row.enumerated_total === 2 && row.body_bytes_screened === 1040288 && row.table_data_rows_screened === 0 && row.candidate_total === 0 && row.admitted_identities === 0), 'coverage projection');\n\n  check(source.schema_version === 'schoolhouse-nc-static-nonprofit-source-receipt@1' && source.routes.length === 2, 'source receipt');\n  check(routes.length === 2 && new Set(routes.map(row => row.route_id)).size === 2, 'route denominator');\n  check(routes.reduce((sum, row) => sum + row.body_bytes, 0) === 1040288, 'route byte total');\n  check(routes.reduce((sum, row) => sum + row.visible_text_chars_screened, 0) === 58971, 'visible text total');\n  check(routes.reduce((sum, row) => sum + row.script_text_chars_screened, 0) === 4044, 'script text total');\n  check(routes.every(row => row.method === 'GET' && row.http_status === 200 && row.state === 'accessible_static_html' && row.table_count === 0 && row.table_rows_total === 0 && row.table_data_rows === 0 && row.candidate_rows === 0 && row.candidate_block_hits === 0), 'route terminal state');\n  check(routes.every(row => row.query_submitted === false && row.form_submitted === false && row.raw_source_retained === false && row.raw_html_retained === false && row.raw_visible_text_retained === false && row.raw_script_text_retained === false), 'route acquisition boundary');\n  check(routes.every(row => row.street_address_rows_retained === 0 && row.mailing_address_rows_retained === 0 && row.postal_code_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'route privacy boundary');\n  check(routes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'route authority boundary');\n  check(targets.routes.length === 2 && targets.person_targets.map(row => row.public_label).join('|') === 'Joe Musselman|Alex Martin|Leyla Gladish|Nicole Nsam' && targets.interactive_search_prohibited === true, 'target matrix');\n  check(candidates.length === 0 && blockHits.length === 0, 'candidate/block-hit denominator');\n  check(adjudication.public_schoolhouse_identity_admitted === false && adjudication.negative_existence_claim_created === false && adjudication.outside_human_dependency === false && adjudication.graph_effect === 'none', 'adjudication authority');\n  check(custody.canonical_parent.commit === '${CANONICAL_PARENT_COMMIT}' && custody.canonical_parent.tree === '${CANONICAL_PARENT_TREE}', 'parent custody');\n  check(custody.acquisition.workflow_run_id === ${ACQUISITION.workflow_run_id} && custody.acquisition.artifact_id === ${ACQUISITION.artifact_id} && custody.acquisition.artifact_digest === '${ACQUISITION.artifact_digest}', 'acquisition custody');\n  check(custody.counts.declared_static_routes === 2 && custody.counts.body_bytes_screened === 1040288 && custody.counts.table_data_rows_screened === 0 && custody.counts.candidate_rows === 0 && custody.counts.identity_admitted_rows === 0, 'custody counts');\n  check(custody.interpretation.zero_rendered_table_rows_are_not_zero_records === true && custody.interpretation.zero_candidate_rows_are_not_absence_evidence === true, 'custody interpretation');\n  check(custody.public_schoolhouse_identity_admitted === false && custody.relationship_admitted === false && custody.negative_existence_claim_created === false && custody.outside_human_dependency === false && custody.graph_effect === 'none', 'custody authority');\n  check(sourceRows.length === 2 && new Set(sourceRows.map(row => row.receipt_id)).size === 2, 'source inventory rows');\n  check(sourceRows.every(row => row.evidence_class === 'official' && row.source_state === 'captured_nc_static_nonprofit_html_surface' && row.request_method === 'GET' && row.http_status === 200 && row.source_rows_acquired === 0 && row.candidate_rows === 0), 'source inventory semantics');\n  check(sourceRows.every(row => row.query_submitted === false && row.form_submitted === false && row.raw_source_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'source inventory privacy');\n  check(sourceRows.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'source inventory authority');\n  const projection = schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_census;\n  check(projection?.declared_static_routes === 2 && projection?.table_data_rows_screened === 0 && projection?.candidate_rows === 0 && projection?.public_schoolhouse_identity_admitted === false, 'School.House projection');\n  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_nc_static_nonprofit_census;\n  check(task?.declared_static_routes === 2 && task?.table_data_rows_screened === 0 && task?.candidate_rows === 0 && task?.admitted_identities === 0, 'frontier projection');\n  for (const filename of ['${FILES.sourceReceipt}','${FILES.routeResults}','${FILES.targetMatrix}','${FILES.adjudication}','${FILES.candidates}','${FILES.blockHits}','${FILES.custody}','${FILES.sourceInventory}']) {\n    const expected = manifest.files[filename];\n    const file = path.join(dir, filename);\n    check(Boolean(expected) && fs.existsSync(file), \`manifest-bound file missing: \${filename}\`);\n    if (expected && fs.existsSync(file)) { check(fs.statSync(file).size === expected.bytes, \`byte drift: \${filename}\`); check(sha256(file) === expected.sha256, \`hash drift: \${filename}\`); }\n  }\n  return errors;\n}\n\nif (process.argv[1] === fileURLToPath(import.meta.url)) {\n  const errors = validateSchoolhouseNcStaticNonprofitCustody(process.argv[2] || DEFAULT_DIR);\n  if (errors.length) { for (const error of errors) console.error(\`ERROR: \${error}\`); process.exit(1); }\n  console.log('School.House NC static nonprofit custody: PASS');\n}\n`;
}

function updateValidators() {
  const validatorFile = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  let validator = fs.readFileSync(validatorFile, 'utf8');
  assert.equal(countOccurrences(validator, 'source_inventory_rows === 478'), 9, 'main validator source denominator fixtures');
  assert.equal(countOccurrences(validator, 'coverage_denominator_rows === 29'), 9, 'main validator coverage denominator fixtures');
  validator = validator.replaceAll('source_inventory_rows === 478', 'source_inventory_rows === 480');
  validator = validator.replaceAll('coverage_denominator_rows === 29', 'coverage_denominator_rows === 30');
  validator = replaceOnce(validator, 'sourceInventory.length === 478', 'sourceInventory.length === 480', 'main validator source length');
  validator = replaceOnce(validator, 'coverage.denominators.length === 29', 'coverage.denominators.length === 30', 'main validator coverage length');
  validator = replaceOnce(validator, "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-19.jsonl'", "manifest.storage_contract.source_inventory_parts.at(-4) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'", 'main validator historical tail');
  validator = replaceOnce(validator, "manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-19.jsonl'", "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'", 'main validator corporate tail');
  validator = replaceOnce(validator, 'evidence_class_counts.official === 253', 'evidence_class_counts.official === 255', 'main validator official count');

  const importMarker = "import { validateSchoolhouseHonorFoundation990Custody } from './validate-schoolhouse-honor-foundation-990-custody.mjs';\n";
  validator = replaceOnce(validator, importMarker, importMarker + "import { validateSchoolhouseNcStaticNonprofitCustody } from './validate-schoolhouse-nc-static-nonprofit-custody.mjs';\n", 'main validator import');
  const callMarker = "  for (const error of validateSchoolhouseHonorFoundation990Custody(dir)) errors.push(`School.House related-charity Form 990: ${error}`);\n";
  validator = replaceOnce(validator, callMarker, "  for (const error of validateSchoolhouseNcStaticNonprofitCustody(dir)) errors.push(`School.House NC static nonprofit: ${error}`);\n\n" + callMarker, 'main validator call');
  fs.writeFileSync(validatorFile, validator);

  const honorFile = path.resolve('tools/validate-schoolhouse-honor-foundation-990-custody.mjs');
  let honor = fs.readFileSync(honorFile, 'utf8');
  honor = replaceOnce(honor, 'source_inventory_rows === 478', 'source_inventory_rows === 480', 'Honor source denominator');
  honor = replaceOnce(honor, 'coverage_denominator_rows === 29', 'coverage_denominator_rows === 30', 'Honor coverage denominator');
  honor = replaceOnce(honor, 'evidence_class_counts.official === 253', 'evidence_class_counts.official === 255', 'Honor official count');
  honor = replaceOnce(honor, "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-19.jsonl'", "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'", 'Honor source inventory tail');
  fs.writeFileSync(honorFile, honor);

  fs.writeFileSync(path.resolve('tools/validate-schoolhouse-nc-static-nonprofit-custody.mjs'), standaloneValidatorSource());
}

function updateManifest() {
  const file = path.join(DATA_DIR, 'manifest.json');
  const manifest = readJson(file);
  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_nc_static_nonprofit_declared_routes: 2,
    schoolhouse_nc_static_nonprofit_terminal_routes: 2,
    schoolhouse_nc_static_nonprofit_accessible_html_routes: 2,
    schoolhouse_nc_static_nonprofit_body_bytes_screened: 1040288,
    schoolhouse_nc_static_nonprofit_visible_text_chars_screened: 58971,
    schoolhouse_nc_static_nonprofit_script_text_chars_screened: 4044,
    schoolhouse_nc_static_nonprofit_table_rows_screened: 0,
    schoolhouse_nc_static_nonprofit_table_data_rows_screened: 0,
    schoolhouse_nc_static_nonprofit_source_rows_acquired: 0,
    schoolhouse_nc_static_nonprofit_candidate_rows: 0,
    schoolhouse_nc_static_nonprofit_candidate_block_hits: 0,
    schoolhouse_nc_static_nonprofit_query_submissions: 0,
    schoolhouse_nc_static_nonprofit_form_submissions: 0,
    schoolhouse_nc_static_nonprofit_admitted_identity_rows: 0,
    schoolhouse_nc_static_nonprofit_negative_existence_claims: 0,
  });
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-19.jsonl');
  manifest.storage_contract.source_inventory_parts.push(FILES.sourceInventory);
  Object.assign(manifest.storage_contract, {
    schoolhouse_nc_static_nonprofit_census_source_receipt: FILES.sourceReceipt,
    schoolhouse_nc_static_nonprofit_census_route_results: FILES.routeResults,
    schoolhouse_nc_static_nonprofit_census_target_matrix: FILES.targetMatrix,
    schoolhouse_nc_static_nonprofit_census_adjudication: FILES.adjudication,
    schoolhouse_nc_static_nonprofit_census_candidate_rows: FILES.candidates,
    schoolhouse_nc_static_nonprofit_census_block_hit_receipts: FILES.blockHits,
    schoolhouse_nc_static_nonprofit_census_custody: FILES.custody,
  });
  manifest.source_inventory.evidence_class_counts.official += 2;
  manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_html_surface = 2;
  manifest.coverage.schoolhouse_nc_static_nonprofit_census = '2_of_2_exact_static_pages_1040288_bytes_zero_rendered_table_rows_zero_candidates_zero_identity';
  manifest.boundaries.push('A North Carolina static nonprofit report page, page title, county label, or unincorporated-nonprofit label is not a registry-grade School.House legal-identity, formation, officer, sponsor, funding, governance, or control record.');
  manifest.boundaries.push('Zero rendered table rows across the two exact static report pages is page-structure custody, not a zero-result entity search or evidence that no North Carolina record, filing, sponsor, related party, or differently named corporation exists.');
  manifest.custody.next_waterline = 'materially_distinct_registry_grade_schoolhouse_identity_or_exact_authorized_nc_report_query_evidence';
  for (const filename of [
    'acquisition-frontier.json', 'coverage-matrix.json', 'schoolhouse.json',
    FILES.sourceReceipt, FILES.routeResults, FILES.targetMatrix, FILES.adjudication,
    FILES.candidates, FILES.blockHits, FILES.custody, FILES.sourceInventory,
  ]) manifest.files[filename] = fileReceipt(filename);
  writeJson(file, manifest);
}

function main() {
  const artifactDir = process.argv[2];
  assert(artifactDir, 'usage: node build-schoolhouse-nc-static-nonprofit-custody.mjs <artifact-dir>');
  verifyPredecessor();
  const artifact = verifyArtifact(path.resolve(artifactDir));

  copyArtifactFile(artifactDir, 'source-receipt.json', FILES.sourceReceipt);
  copyArtifactFile(artifactDir, 'route-results.jsonl', FILES.routeResults);
  copyArtifactFile(artifactDir, 'target-matrix.json', FILES.targetMatrix);
  copyArtifactFile(artifactDir, 'adjudication.json', FILES.adjudication);
  copyArtifactFile(artifactDir, 'candidate-rows.jsonl', FILES.candidates);
  copyArtifactFile(artifactDir, 'block-hit-receipts.jsonl', FILES.blockHits);
  writeJsonl(path.join(DATA_DIR, FILES.sourceInventory), sourceInventoryRows(artifact.routes));
  writeJson(path.join(DATA_DIR, FILES.custody), buildCustody(artifact));

  updateSchoolhouse();
  updateFrontier();
  updateCoverage();
  updateReadme();
  updateValidators();
  updateManifest();

  const output = {
    schema_version: 'schoolhouse-nc-static-nonprofit-custody-build@1',
    canonical_parent_commit: CANONICAL_PARENT_COMMIT,
    canonical_parent_tree: CANONICAL_PARENT_TREE,
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    explicit_gap_rows: EXPECTED_GAP_ROWS,
    declared_static_routes: 2,
    terminal_routes: 2,
    body_bytes_screened: 1040288,
    table_data_rows_screened: 0,
    source_rows_acquired: 0,
    candidate_rows: 0,
    identity_admitted_rows: 0,
    negative_existence_claims_created: 0,
    permanent_files: 17,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
  console.log(canonicalJson(output));
}

main();
