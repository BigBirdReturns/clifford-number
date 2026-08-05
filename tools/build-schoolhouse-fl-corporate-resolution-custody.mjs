import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) {
  throw new Error('usage: node tools/build-schoolhouse-fl-corporate-resolution-custody.mjs <artifact-dir>');
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');
const SOURCE_INVENTORY_PATH = path.join(DIR, 'source-inventory-08.jsonl');
const FICTITIOUS_CANDIDATE_PATH = path.join(DIR, 'schoolhouse-fl-fictitious-candidates.jsonl');

const RECEIPT_ID = 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05';
const SOURCE_FILE = 'schoolhouse-fl-corporate-owner-resolution-source-receipt.json';
const INDEX_FILE = 'schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json';
const MEMBER_FILE = 'schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl';
const RECORD_FILE = 'schoolhouse-fl-corporate-owner-resolution-records.jsonl';
const MATRIX_FILE = 'schoolhouse-fl-corporate-owner-resolution-matrix.jsonl';
const ADJUDICATION_FILE = 'schoolhouse-fl-corporate-owner-resolution-adjudication.json';

const EXPECTED_CHARTERS = [
  'L16000000673',
  'L17000090349',
  'L20000357931',
  'L22000000212',
  'L22000358309',
  'L23000133581',
  'L23000411942',
  'L28059',
  'N12000000884',
  'N22000010097',
  'N96000004081',
  'P02000130432',
  'P07000017144',
  'P12000066520',
  'P17000074851'
];
const EXPECTED_CORPORATE_NAMES = {
  L16000000673: 'BOUTIQUE APARTMENTS III LLC',
  L17000090349: 'AMELIA SCHOOLHOUSE PROJECT, LLC',
  L20000357931: 'SIJ SCHOOLHOUSE LLC',
  L22000000212: 'LUCE EDUCATIONAL SERVICES, LLC',
  L22000358309: 'COLOBELA LLC',
  L23000133581: 'STRUVEDMUNDS LLC',
  L23000411942: 'CSI TUTORING SERVICES LLC',
  L28059: 'LITTLE RED SCHOOL HOUSE OF PENSACOLA, INC.',
  N12000000884: 'CLUB RECOVERY OF CITRUS COUNTY, INC.',
  N22000010097: 'MODPOD INC.',
  N96000004081: 'BOYNTON CULTURAL CENTRE, INC.',
  P02000130432: 'MY LITTLE SCHOOL HOUSE, INC.',
  P07000017144: 'THREE ANGELS PRESCHOOL INC.',
  P12000066520: 'TANGERINE SCHOOLHOUSE INC.',
  P17000074851: 'SYMBIO GLOBAL, INC.'
};
const EXPECTED_MEMBERS = {
  '0': { member: 'cordata0.txt', compressed_size: 181786383, uncompressed_size: 1846759306, row_count: 1280693, crc32: 'a10eac21', uncompressed_sha256: '4631c816b34fee06184920e80332eab096ed058a61f3daa168313b72cf103286' },
  '1': { member: 'cordata1.txt', compressed_size: 181868847, uncompressed_size: 1847134226, row_count: 1280953, crc32: '931cb9e1', uncompressed_sha256: 'f961da32f2d251312fe247bdf5cb92bdf39dcafd3c2f490e2a8c6828caf3c5ec' },
  '2': { member: 'cordata2.txt', compressed_size: 181880423, uncompressed_size: 1847037612, row_count: 1280886, crc32: '278d9bb2', uncompressed_sha256: '8fa76b88491dca7a7598f343848b4486ae81e48b540db9a87c122c1aa235c571' },
  '3': { member: 'cordata3.txt', compressed_size: 181950040, uncompressed_size: 1847163066, row_count: 1280973, crc32: '01b448c3', uncompressed_sha256: '126afe3874a0422091cc05ecb06298505dce61f555347650a8068117f192fc65' },
  '4': { member: 'cordata4.txt', compressed_size: 181950007, uncompressed_size: 1847093850, row_count: 1280925, crc32: 'a4c610a1', uncompressed_sha256: 'afd4a8d0d97268e8cc408772b29393d91f48040c65cc06731f804f6efaaa972b' },
  '7': { member: 'cordata7.txt', compressed_size: 181947770, uncompressed_size: 1846838616, row_count: 1280748, crc32: '2bd6f2f3', uncompressed_sha256: '795784a64b6a004afd46e08c346f0ed90222dd15dd63d3f0bd496a71fb5719fa' },
  '9': { member: 'cordata9.txt', compressed_size: 181872843, uncompressed_size: 1846838616, row_count: 1280748, crc32: '1106a6cd', uncompressed_sha256: '286486856e0621bcff1879d64ca05af616f8ee97063b6ee0ada90e0bda0ea126' }
};

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
const unique = values => new Set(values).size === values.length;
const countBy = (rows, key) => Object.fromEntries(
  [...rows.reduce((counts, row) => counts.set(row[key], (counts.get(row[key]) || 0) + 1), new Map()).entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
);
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
const sourceInventory08 = readJsonl(SOURCE_INVENTORY_PATH);
const fictitiousCandidates = readJsonl(FICTITIOUS_CANDIDATE_PATH);

const artifactSummary = readJson(path.join(ARTIFACT_DIR, 'summary.json'));
const artifactSource = readJson(path.join(ARTIFACT_DIR, 'source-receipt.json'));
const artifactIndex = readJson(path.join(ARTIFACT_DIR, 'remote-zip-index.json'));
const artifactRequests = readJsonl(path.join(ARTIFACT_DIR, 'range-request-receipts.jsonl'));
const artifactMembers = readJsonl(path.join(ARTIFACT_DIR, 'member-receipts.jsonl'));
const artifactTargets = readJsonl(path.join(ARTIFACT_DIR, 'owner-charter-targets.jsonl'));
const artifactRecords = readJsonl(path.join(ARTIFACT_DIR, 'corporate-records.jsonl'));
const artifactMatrix = readJsonl(path.join(ARTIFACT_DIR, 'resolution-matrix.jsonl'));

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 104) fail('expected 104 source rows before corporate resolution');
if (manifest.counts.fl_fictitious_owner_charter_numbers !== 15) fail('fictitious owner-charter predecessor drift');
if (manifest.counts.state_registry_admitted_identity_rows !== 0) fail('predecessor identity authority drift');
if (schoolhouse.state_registry_identity_census?.identity_state !== 'unresolved_no_florida_fictitious_name_identity_admitted') {
  fail('School.House state-registry predecessor state drift');
}
if (schoolhouse.state_registry_identity_census?.florida_corporate_owner_resolution) {
  fail('Florida corporate owner-resolution custody already exists');
}

if (artifactSummary.source_bytes !== 1_819_049_954) fail('corporate source byte count drift');
if (artifactSummary.remote_zip_members !== 10 || artifactSummary.target_partitions !== 7) fail('corporate ZIP partition denominator drift');
if (JSON.stringify(artifactSummary.target_partition_digits) !== JSON.stringify(['0', '1', '2', '3', '4', '7', '9'])) {
  fail('corporate target partition digit drift');
}
if (artifactSummary.target_charters !== 15 || artifactSummary.resolved_target_charters !== 15 || artifactSummary.unresolved_target_charters !== 0) {
  fail('corporate target resolution denominator drift');
}
if (artifactSummary.corporate_records_retained !== 15) fail('corporate retained-record denominator drift');
if (artifactSummary.selected_partition_rows_scanned !== 8_965_926) fail('corporate selected-row denominator drift');
if (artifactSummary.selected_compressed_bytes !== 1_273_256_313) fail('corporate selected compressed-byte denominator drift');
if (artifactSummary.selected_uncompressed_bytes !== 12_928_865_292) fail('corporate selected uncompressed-byte denominator drift');
if (artifactSummary.range_requests !== 24) fail('corporate range-request denominator drift');
if (artifactSummary.all_target_partitions_complete !== true || artifactSummary.all_target_charters_terminal !== true) {
  fail('corporate artifact is not terminal');
}
if (artifactSummary.full_source_downloaded !== false || artifactSummary.raw_source_retained !== false) {
  fail('corporate artifact violated bounded source-retention contract');
}
if (artifactSummary.street_address_rows_retained !== 0 || artifactSummary.mailing_address_rows_retained !== 0 || artifactSummary.postal_code_rows_retained !== 0 || artifactSummary.contact_detail_rows_retained !== 0 || artifactSummary.private_support_rows !== 0) {
  fail('corporate artifact privacy boundary failed');
}
if (artifactSummary.schoolhouse_identity_admitted !== false || artifactSummary.outside_human_dependency !== false || artifactSummary.graph_effect !== 'none') {
  fail('corporate artifact authority boundary failed');
}
if (artifactSource.source_bytes !== 1_819_049_954 || artifactSource.remote_zip_members !== 10 || artifactSource.selected_partition_count !== 7) {
  fail('corporate source receipt denominator drift');
}
if (artifactSource.selected_partition_rows !== 8_965_926 || artifactSource.resolved_target_charters !== 15) {
  fail('corporate source receipt result drift');
}
if (artifactIndex.central_directory_sha256 !== '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330') {
  fail('corporate central-directory SHA-256 drift');
}
if (artifactIndex.declared_partitions !== 10 || artifactIndex.selected_partition_count !== 7 || artifactIndex.members.length !== 10) {
  fail('corporate remote ZIP index drift');
}
if (artifactRequests.length !== 24 || !unique(artifactRequests.map(row => row.request_id))) {
  fail('corporate range-request receipt drift');
}
if (artifactRequests[0].request_id !== 'head-source' || artifactRequests[0].status !== 200) {
  fail('corporate HEAD receipt drift');
}
if (artifactRequests.slice(1).some(row => row.status !== 206 || !row.content_range || row.state !== 'captured')) {
  fail('corporate range receipts must all be complete HTTP 206 captures');
}
if (artifactMembers.length !== 7 || !unique(artifactMembers.map(row => row.partition_digit))) {
  fail('corporate selected-member denominator drift');
}
for (const member of artifactMembers) {
  const expected = EXPECTED_MEMBERS[member.partition_digit];
  if (!expected) fail(`unexpected corporate partition ${member.partition_digit}`);
  for (const key of ['member', 'compressed_size', 'uncompressed_size', 'row_count', 'crc32', 'uncompressed_sha256']) {
    if (member[key] !== expected[key]) fail(`corporate partition ${member.partition_digit} ${key} drift`);
  }
  if (member.state !== 'complete_partition_scanned' || member.direct_record_count !== member.row_count || member.reassembled_record_count !== 0 || member.fragment_line_count !== 0 || member.physical_line_count !== member.row_count) {
    fail(`corporate partition ${member.partition_digit} scan-state drift`);
  }
  if (member.raw_compressed_member_retained !== false || member.raw_uncompressed_member_retained !== false) {
    fail(`corporate partition ${member.partition_digit} retained a raw member`);
  }
}
if (artifactTargets.length !== 15 || artifactMatrix.length !== 15 || artifactRecords.length !== 15) {
  fail('corporate target, matrix, or record denominator drift');
}
if (JSON.stringify(artifactTargets.map(row => row.target_charter_number).sort()) !== JSON.stringify(EXPECTED_CHARTERS)) {
  fail('corporate frozen target charter set drift');
}
if (JSON.stringify(artifactMatrix.map(row => row.target_charter_number).sort()) !== JSON.stringify(EXPECTED_CHARTERS)) {
  fail('corporate resolution matrix charter set drift');
}
if (JSON.stringify(artifactRecords.map(row => row.document_number).sort()) !== JSON.stringify(EXPECTED_CHARTERS)) {
  fail('corporate record charter set drift');
}
if (artifactMatrix.some(row => row.matched_corporate_record_count !== 1 || row.resolution_state !== 'exact_corporate_record_resolved' || row.schoolhouse_identity_admitted !== false)) {
  fail('corporate resolution matrix is not exactly resolved and graph-inert');
}
for (const record of artifactRecords) {
  if (record.corporation_name_as_recorded !== EXPECTED_CORPORATE_NAMES[record.document_number]) {
    fail(`corporate name drift for ${record.document_number}`);
  }
  if (record.status !== 'A' || record.resolution_state !== 'exact_owner_charter_resolved' || record.schoolhouse_identity_admitted !== false) {
    fail(`corporate record authority drift for ${record.document_number}`);
  }
  if (record.street_address_retained !== false || record.mailing_address_retained !== false || record.postal_code_retained !== false || record.contact_details_retained !== false || record.private_support_rows !== 0 || record.graph_effect !== 'none') {
    fail(`corporate record privacy or graph drift for ${record.document_number}`);
  }
  for (const officer of record.officers) {
    if (officer.street_address_retained !== false || officer.postal_code_retained !== false || officer.contact_details_retained !== false) {
      fail(`corporate officer privacy drift for ${record.document_number}`);
    }
  }
}
const linkedCandidateIds = [...new Set(artifactMatrix.flatMap(row => row.fictitious_candidate_links.map(link => link.fictitious_candidate_id)))].sort();
if (linkedCandidateIds.length !== 17) fail('corporate owner-linked fictitious candidate denominator drift');
const knownFictitiousCandidateIds = new Set(fictitiousCandidates.map(row => row.candidate_id));
if (linkedCandidateIds.some(id => !knownFictitiousCandidateIds.has(id))) fail('corporate artifact links an unknown fictitious candidate');
const noCharterCandidates = fictitiousCandidates.filter(row => !row.owners.some(owner => owner.owner_charter_number));
if (noCharterCandidates.length !== 12) fail('fictitious candidate no-charter denominator drift');
const tampaCandidates = fictitiousCandidates.filter(row => row.public_tampa_bay_city_match);
if (tampaCandidates.length !== 2 || tampaCandidates.some(row => linkedCandidateIds.includes(row.candidate_id))) {
  fail('Tampa phrase-candidate owner-charter boundary drift');
}

for (const file of [SOURCE_FILE, INDEX_FILE, MEMBER_FILE, RECORD_FILE, MATRIX_FILE, ADJUDICATION_FILE]) {
  if (fs.existsSync(path.join(DIR, file))) fail(`permanent corporate-resolution path already exists: ${file}`);
}

const sanitizedRequests = artifactRequests.map(row => ({
  request_id: row.request_id,
  method: row.method,
  requested_url: row.requested_url || null,
  range_start: row.range_start ?? null,
  range_end: row.range_end ?? null,
  bytes: row.bytes ?? null,
  sha256: row.sha256 || null,
  status: row.status,
  content_range: row.content_range || null,
  content_length: row.content_length ?? null,
  content_type: row.content_type || null,
  last_modified: row.last_modified || null,
  attempt: row.attempt,
  state: row.state
}));
const permanentSource = {
  schema_version: 'schoolhouse-fl-corporate-owner-resolution-source-receipt@1',
  receipt_id: RECEIPT_ID,
  source_url: artifactSource.source_url,
  publisher: artifactSource.publisher,
  dataset: artifactSource.dataset,
  acquired_at: artifactSummary.completed_at,
  acquisition: {
    terminal_workflow_run_id: 30976259865,
    terminal_artifact_id: 8918418532,
    terminal_artifact_digest: 'sha256:97f2f4d86c3943cba165c8aeb094c03eda18d6951124aad2ca86fbdcafbc0e39',
    terminal_head_sha: '0a12ecb8109759110250def6dc7661757ef0c971',
    failed_predecessor_workflow_run_id: 30976149894,
    failed_predecessor_artifact_id: 8918320397,
    failed_predecessor_artifact_digest: 'sha256:75615e246fe28d200b0d9b0c9abba55efa0e69cd3cde8ec840786564e2b4a0f5',
    failed_predecessor_state: 'pre_acquisition_dictionary_access_error'
  },
  source_bytes: artifactSource.source_bytes,
  source_last_modified: artifactSource.source_last_modified,
  full_source_sha256: null,
  full_source_downloaded: false,
  remote_zip_members: 10,
  central_directory_sha256: artifactIndex.central_directory_sha256,
  selected_partitions: artifactSource.selected_partitions,
  selected_partition_count: 7,
  selected_compressed_bytes: 1_273_256_313,
  selected_uncompressed_bytes: 12_928_865_292,
  selected_partition_rows_scanned: 8_965_926,
  target_charters: 15,
  resolved_target_charters: 15,
  unresolved_target_charters: 0,
  corporate_records_retained: 15,
  range_requests: sanitizedRequests,
  range_request_count: sanitizedRequests.length,
  raw_source_retained: false,
  raw_compressed_members_retained: false,
  raw_uncompressed_members_retained: false,
  public_credential_username: artifactSource.public_credential_username,
  public_credential_password_retained: false,
  street_address_rows_retained: 0,
  mailing_address_rows_retained: 0,
  postal_code_rows_retained: 0,
  contact_detail_rows_retained: 0,
  private_support_rows: 0,
  schoolhouse_identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, SOURCE_FILE), permanentSource);

const permanentIndex = {
  ...artifactIndex,
  schema_version: 'schoolhouse-fl-corporate-owner-resolution-remote-zip-index@1',
  receipt_id: RECEIPT_ID,
  acquisition_workflow_run_id: 30976259865,
  acquisition_artifact_id: 8918418532,
  source_rows_scanned_in_selected_partitions: 8_965_926,
  raw_source_retained: false,
  schoolhouse_identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, INDEX_FILE), permanentIndex);

const permanentMembers = artifactMembers
  .map(row => ({ ...row, receipt_id: RECEIPT_ID }))
  .sort((a, b) => a.partition_digit.localeCompare(b.partition_digit));
writeJsonl(path.join(DIR, MEMBER_FILE), permanentMembers);

const permanentRecords = artifactRecords
  .map(row => ({ ...row, receipt_id: RECEIPT_ID }))
  .sort((a, b) => a.document_number.localeCompare(b.document_number));
writeJsonl(path.join(DIR, RECORD_FILE), permanentRecords);

const recordByDocument = new Map(permanentRecords.map(row => [row.document_number, row]));
const permanentMatrix = artifactMatrix
  .map(row => ({
    ...row,
    receipt_id: RECEIPT_ID,
    target_denominator: 15,
    resolved_corporation_name_as_recorded: recordByDocument.get(row.target_charter_number)?.corporation_name_as_recorded || null,
    schoolhouse_identity_disposition: 'not_admitted_distinct_owner_entity'
  }))
  .sort((a, b) => a.target_charter_number.localeCompare(b.target_charter_number));
writeJsonl(path.join(DIR, MATRIX_FILE), permanentMatrix);

const resolvedEntityRows = permanentRecords.map(row => ({
  document_number: row.document_number,
  corporation_name_as_recorded: row.corporation_name_as_recorded,
  status: row.status,
  filing_type: row.filing_type,
  file_date: row.file_date,
  principal_city: row.principal_city,
  principal_state: row.principal_state,
  linked_fictitious_candidate_ids: row.fictitious_candidate_links.map(link => link.fictitious_candidate_id),
  linked_fictitious_names: row.fictitious_candidate_links.map(link => link.fictitious_name_as_recorded),
  disposition: 'exact_owner_entity_resolved_not_admitted_as_schoolhouse'
}));
const permanentAdjudication = {
  schema_version: 'schoolhouse-fl-corporate-owner-resolution-adjudication@1',
  as_of: '2026-08-05',
  public_source_claims_used_for_adjudication: {
    public_name: 'School.House',
    founded_claim: 2023,
    location_claims: ['Tampa Bay', 'Fayetteville'],
    organization_type_claim: '501(c)(3) nonprofit / public charity',
    boundary: 'An owner corporation behind a Florida fictitious-name phrase candidate is not automatically the public School.House legal entity, fiscal sponsor, governing organization, or EIN.'
  },
  acquisition_history: [
    {
      attempt: 1,
      workflow_run_id: 30976149894,
      artifact_id: 8918320397,
      artifact_digest: 'sha256:75615e246fe28d200b0d9b0c9abba55efa0e69cd3cde8ec840786564e2b4a0f5',
      state: 'pre_acquisition_dictionary_access_error'
    },
    {
      attempt: 2,
      workflow_run_id: 30976259865,
      artifact_id: 8918418532,
      artifact_digest: 'sha256:97f2f4d86c3943cba165c8aeb094c03eda18d6951124aad2ca86fbdcafbc0e39',
      state: 'terminal_seven_partition_owner_charter_resolution'
    }
  ],
  source_denominator: {
    receipt_id: RECEIPT_ID,
    source_bytes: 1_819_049_954,
    full_source_downloaded: false,
    remote_zip_members: 10,
    central_directory_sha256: artifactIndex.central_directory_sha256,
    selected_partition_digits: ['0', '1', '2', '3', '4', '7', '9'],
    selected_partitions: 7,
    selected_compressed_bytes: 1_273_256_313,
    selected_uncompressed_bytes: 12_928_865_292,
    selected_partition_rows_scanned: 8_965_926,
    range_requests: 24
  },
  frozen_target_denominator: {
    owner_charter_numbers: EXPECTED_CHARTERS,
    target_charters: 15,
    resolved_target_charters: 15,
    unresolved_target_charters: 0,
    retained_corporate_records: 15,
    owner_linked_fictitious_candidates: 17,
    fictitious_candidates_without_owner_charter: 12,
    tampa_bay_phrase_candidates: 2,
    tampa_bay_phrase_candidates_with_owner_charter: 0
  },
  resolved_owner_entities: resolvedEntityRows,
  identity_decision: {
    state: 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted',
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_owner_charter_number: null,
    rationale: 'All fifteen owner charter numbers resolved exactly once across seven complete final-digit corporate partitions. Their corporate names and linked fictitious uses are distinct owner entities. None is admitted as the public School.House identity. The two Tampa phrase candidates were not among the owner-charter targets.',
    scope_boundary: 'This decision closes the frozen fifteen-charter owner-resolution matrix. It does not prove that School.House lacks a differently named Florida corporation, fiscal sponsor, Florida charity registration, North Carolina entity, or other registry record.'
  },
  next_transition: {
    action: 'Continue through the Florida charity registry and lawful North Carolina reports, listings, subscriptions, or distinct official downloads. Use the corporate plane only for identifier-grade candidates produced by those surfaces, and do not submit prohibited scripted interactive searches.',
    forbidden_inference: 'The exact resolution of owners behind phrase candidates does not establish or disprove a differently named School.House legal entity or fiscal sponsor.',
    outside_human_dependency: false
  },
  privacy: {
    full_source_downloaded: false,
    raw_source_retained: false,
    street_address_rows_retained: 0,
    mailing_address_rows_retained: 0,
    postal_code_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0
  },
  receipt_id: RECEIPT_ID,
  source_receipt_file: SOURCE_FILE,
  remote_zip_index_file: INDEX_FILE,
  member_receipt_file: MEMBER_FILE,
  record_file: RECORD_FILE,
  resolution_matrix_file: MATRIX_FILE,
  schoolhouse_identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, ADJUDICATION_FILE), permanentAdjudication);

const corporateSourceInventory = sourceInventory08.find(row => row.receipt_id === RECEIPT_ID);
if (!corporateSourceInventory) fail('corporate source-inventory row missing');
if (corporateSourceInventory.source_state !== 'route_accessible_not_acquired' || corporateSourceInventory.content_sha256 !== null) {
  fail('corporate source-inventory predecessor state drift');
}
corporateSourceInventory.retrieved_at = artifactSummary.completed_at;
corporateSourceInventory.source_state = 'seven_complete_partitions_captured_and_scanned';
corporateSourceInventory.note = 'Official Florida quarterly corporate bulk file; the remote ten-member ZIP was indexed, seven complete final-digit partitions totaling 8,965,926 records were captured and scanned, and all fifteen frozen owner charter numbers resolved exactly once. The full 1,819,049,954-byte source was not downloaded and no full-source SHA-256 is claimed.';
writeJsonl(SOURCE_INVENTORY_PATH, sourceInventory08);

schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_candidate_and_owner_resolution_custody';
const stateCensus = schoolhouse.state_registry_identity_census;
stateCensus.identity_state = 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted';
stateCensus.florida_corporate_owner_resolution = {
  as_of: '2026-08-05',
  receipt_id: RECEIPT_ID,
  remote_zip_members: 10,
  selected_partition_digits: ['0', '1', '2', '3', '4', '7', '9'],
  selected_partitions: 7,
  selected_partition_rows_scanned: 8_965_926,
  selected_compressed_bytes: 1_273_256_313,
  selected_uncompressed_bytes: 12_928_865_292,
  range_requests: 24,
  owner_charter_targets: 15,
  owner_charters_resolved: 15,
  owner_charters_unresolved: 0,
  corporate_records: 15,
  owner_linked_fictitious_candidates: 17,
  fictitious_candidates_without_owner_charter: 12,
  tampa_bay_phrase_candidates_with_owner_charter: 0,
  identity_state: 'owner_entities_resolved_no_schoolhouse_identity_admitted',
  source_receipt_file: SOURCE_FILE,
  remote_zip_index_file: INDEX_FILE,
  member_receipt_file: MEMBER_FILE,
  record_file: RECORD_FILE,
  resolution_matrix_file: MATRIX_FILE,
  adjudication_file: ADJUDICATION_FILE,
  boundary: 'All fifteen frozen owner charter numbers resolve exact corporate owners behind seventeen phrase candidates. These owner entities are not admitted as the public School.House legal entity, and the two Tampa phrase candidates have no owner-charter route in this denominator.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
stateCensus.boundary = 'The route, fictitious-name, and exact owner-corporate custody create no School.House legal-identity join. The complete fictitious-name phrase pass has no exact public-name candidate, all fifteen available owner charter numbers resolve to distinct owner entities, and no identity is admitted.';
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
schoolhouseTask.prior_state_registry_custody.corporate_owner_resolution = {
  source_bytes: 1_819_049_954,
  remote_zip_members: 10,
  selected_partitions: 7,
  selected_partition_rows_scanned: 8_965_926,
  owner_charter_targets: 15,
  owner_charters_resolved: 15,
  owner_charters_unresolved: 0,
  corporate_records: 15,
  owner_linked_fictitious_candidates: 17,
  admitted_identities: 0,
  state: 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted',
  adjudication_file: ADJUDICATION_FILE
};
schoolhouseTask.prior_state_registry_custody.state = 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted';
schoolhouseTask.next_transition = 'Continue through the Florida charity registry and lawful North Carolina reports, listings, subscriptions, or distinct official downloads. Use the Florida corporate plane only for identifier-grade candidates produced by those surfaces. Preserve exact rejections, submit no prohibited scripted interactive searches, and admit no entity without identifier-grade convergence.';
writeJson(FRONTIER_PATH, frontier);

if (coverage.denominators.some(row => row.surface === 'Florida corporate owner-charter resolution for School.House phrase candidates')) {
  fail('corporate owner-resolution coverage denominator already exists');
}
coverage.denominators.push({
  surface: 'Florida corporate owner-charter resolution for School.House phrase candidates',
  declared_total: 15,
  enumerated_total: 15,
  resolved_total: 15,
  selected_partition_total: 7,
  source_rows_scanned: 8_965_926,
  coverage_state: 'complete_for_frozen_owner_charter_set'
});
const oldGapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => row.startsWith('Florida corporate follow-up for fifteen owner charter numbers remains open;'));
if (oldGapIndex < 0) fail('open corporate owner-resolution gap missing');
coverage.explicit_nulls_and_gaps[oldGapIndex] = 'Florida corporate owner follow-up is complete for all fifteen frozen charter numbers across seven final-digit partitions and 8,965,926 records; every target resolved exactly once, but none is admitted as School.House. Florida charity identity, North Carolina entity and charity records, differently named legal entities, and fiscal-sponsor evidence remain open.';
writeJson(COVERAGE_PATH, coverage);

manifest.boundaries.push('An exact corporate owner record resolves the owner behind a fictitious-name candidate but does not establish that owner as the public School.House legal entity, fiscal sponsor, or governing organization.');
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.fl_corporate_remote_zip_members = 10;
manifest.counts.fl_corporate_target_partitions = 7;
manifest.counts.fl_corporate_selected_partition_rows = 8_965_926;
manifest.counts.fl_corporate_selected_compressed_bytes = 1_273_256_313;
manifest.counts.fl_corporate_selected_uncompressed_bytes = 12_928_865_292;
manifest.counts.fl_corporate_range_requests = 24;
manifest.counts.fl_corporate_owner_charter_targets = 15;
manifest.counts.fl_corporate_owner_charters_resolved = 15;
manifest.counts.fl_corporate_owner_charters_unresolved = 0;
manifest.counts.fl_corporate_records = 15;
manifest.counts.fl_corporate_owner_linked_fictitious_candidates = 17;
manifest.counts.fl_corporate_schoolhouse_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_fl_corporate_owner_resolution = '15_of_15_owner_charters_resolved_across_7_complete_partitions_8965926_rows_zero_schoolhouse_identity';
manifest.custody.next_waterline = 'charity_registry_north_carolina_entity_resolution_and_source_archival';
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_source_receipt = SOURCE_FILE;
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_remote_zip_index = INDEX_FILE;
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_member_receipts = MEMBER_FILE;
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_records = RECORD_FILE;
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_matrix = MATRIX_FILE;
manifest.storage_contract.schoolhouse_fl_corporate_owner_resolution_adjudication = ADJUDICATION_FILE;
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, exact Florida fictitious-name owner-corporate resolution, coverage nulls, and deterministic continuation work.';

const allSourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(file => readJsonl(path.join(DIR, file)));
if (allSourceInventory.length !== 104) fail('source inventory row count changed unexpectedly');
manifest.source_inventory.evidence_class_counts = countBy(allSourceInventory, 'evidence_class');
manifest.source_inventory.source_state_counts = countBy(allSourceInventory, 'source_state');
for (const file of [SOURCE_FILE, INDEX_FILE, MEMBER_FILE, RECORD_FILE, MATRIX_FILE, ADJUDICATION_FILE]) {
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
  'Florida post-2023 phrase candidates                   16\nstate-registry identities admitted                     0\n',
  'Florida post-2023 phrase candidates                   16\nFlorida owner charter targets                           15\nFlorida corporate owner records resolved                15 / 15\nFlorida corporate partitions scanned                     7 / 10\nFlorida corporate rows scanned                    8,965,926\nFlorida owner-linked phrase candidates                  17\nstate-registry identities admitted                     0\n',
  'README corporate counts insertion'
);
readme = replaceExact(
  readme,
  '- `schoolhouse-fl-fictitious-source-receipt.json`, `schoolhouse-fl-fictitious-member-inventory.jsonl`, `schoolhouse-fl-fictitious-candidates.jsonl`, and `schoolhouse-fl-fictitious-adjudication.json` preserve the exact 761,040-record Florida fictitious-name census, forty repaired embedded-linebreak records, twenty-nine sanitized phrase candidates, and the zero-admission decision.\n',
  '- `schoolhouse-fl-fictitious-source-receipt.json`, `schoolhouse-fl-fictitious-member-inventory.jsonl`, `schoolhouse-fl-fictitious-candidates.jsonl`, and `schoolhouse-fl-fictitious-adjudication.json` preserve the exact 761,040-record Florida fictitious-name census, forty repaired embedded-linebreak records, twenty-nine sanitized phrase candidates, and the zero-admission decision.\n- `schoolhouse-fl-corporate-owner-resolution-source-receipt.json`, `schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json`, `schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl`, `schoolhouse-fl-corporate-owner-resolution-records.jsonl`, `schoolhouse-fl-corporate-owner-resolution-matrix.jsonl`, and `schoolhouse-fl-corporate-owner-resolution-adjudication.json` preserve the bounded seven-partition corporate scan, all fifteen exact owner-entity resolutions, and the continued zero-admission decision.\n',
  'README corporate files insertion'
);
readme = replaceExact(
  readme,
  "The IRS legal-identity pass scanned 4,428,541 public rows across six complete routes, retained 641 sanitized phrase candidates representing 438 EINs, and admitted no School.House identity. The next pass then completed sixteen lawful state-registry route dispositions with zero scripted searches and scanned all 761,040 records in Florida's quarterly fictitious-name file. It retained twenty-nine privacy-minimized phrase candidates, found zero exact public-name candidates, found two distinctly named Tampa phrase candidates, and admitted no state-registry identity. The next lawful boundary is exact corporate resolution of fifteen owner charter numbers, followed by charity and North Carolina bulk or report surfaces that respect publisher automation policy.\n",
  "The IRS legal-identity pass scanned 4,428,541 public rows across six complete routes, retained 641 sanitized phrase candidates representing 438 EINs, and admitted no School.House identity. The next pass completed sixteen lawful state-registry route dispositions with zero scripted searches and scanned all 761,040 records in Florida's quarterly fictitious-name file. It retained twenty-nine privacy-minimized phrase candidates, found zero exact public-name candidates, and found two distinctly named Tampa phrase candidates. The corporate follow-up then indexed the ten-member 1,819,049,954-byte Florida source, acquired the seven complete final-digit partitions needed for the frozen target set, scanned 8,965,926 records, and resolved all fifteen owner charter numbers exactly once. Those records type seventeen phrase candidates to distinct owner entities; none is admitted as the public School.House identity. The next lawful boundary is Florida charity and North Carolina entity or charity custody that respects publisher automation policy.\n",
  'README corporate continuation replacement'
);
fs.writeFileSync(README_PATH, readme);

validator = replaceExact(
  validator,
  "  const schoolhouseFlFictitiousAdjudication = readJson(path.join(dir, 'schoolhouse-fl-fictitious-adjudication.json'));\n",
  "  const schoolhouseFlFictitiousAdjudication = readJson(path.join(dir, 'schoolhouse-fl-fictitious-adjudication.json'));\n  const schoolhouseFlCorporateSource = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-source-receipt.json'));\n  const schoolhouseFlCorporateIndex = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json'));\n  const schoolhouseFlCorporateMembers = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl'));\n  const schoolhouseFlCorporateRecords = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-records.jsonl'));\n  const schoolhouseFlCorporateMatrix = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-matrix.jsonl'));\n  const schoolhouseFlCorporateAdjudication = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-adjudication.json'));\n",
  'validator corporate reads'
);
validator = replaceExact(
  validator,
  "    state_registry_admitted_identity_rows: schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null ? 0 : 1\n",
  "    state_registry_admitted_identity_rows: schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null ? 0 : 1,\n    fl_corporate_remote_zip_members: schoolhouseFlCorporateIndex.members.length,\n    fl_corporate_target_partitions: schoolhouseFlCorporateMembers.length,\n    fl_corporate_selected_partition_rows: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.row_count, 0),\n    fl_corporate_selected_compressed_bytes: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.compressed_size, 0),\n    fl_corporate_selected_uncompressed_bytes: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.uncompressed_size, 0),\n    fl_corporate_range_requests: schoolhouseFlCorporateSource.range_requests.length,\n    fl_corporate_owner_charter_targets: schoolhouseFlCorporateMatrix.length,\n    fl_corporate_owner_charters_resolved: schoolhouseFlCorporateMatrix.filter(row => row.matched_corporate_record_count === 1).length,\n    fl_corporate_owner_charters_unresolved: schoolhouseFlCorporateMatrix.filter(row => row.matched_corporate_record_count === 0).length,\n    fl_corporate_records: schoolhouseFlCorporateRecords.length,\n    fl_corporate_owner_linked_fictitious_candidates: new Set(schoolhouseFlCorporateMatrix.flatMap(row => row.fictitious_candidate_links.map(link => link.fictitious_candidate_id))).size,\n    fl_corporate_schoolhouse_admitted_identity_rows: schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null ? 0 : 1\n",
  'validator corporate count checks'
);
validator = replaceExact(
  validator,
  "  check(schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null, 'Florida fictitious pass must admit no document number');\n",
  "  check(schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null, 'Florida fictitious pass must admit no document number');\n  check(schoolhouseFlCorporateIndex.members.length === 10, 'Florida corporate remote ZIP must contain ten members');\n  check(schoolhouseFlCorporateMembers.length === 7, 'Florida corporate owner resolution must scan seven target partitions');\n  check(schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.row_count, 0) === 8965926, 'Florida corporate owner resolution must scan 8,965,926 rows');\n  check(schoolhouseFlCorporateMatrix.length === 15, 'Florida corporate owner resolution must contain fifteen targets');\n  check(schoolhouseFlCorporateRecords.length === 15, 'Florida corporate owner resolution must retain fifteen exact records');\n  check(schoolhouseFlCorporateAdjudication.identity_decision.state === 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted', 'Florida corporate owner resolution must preserve unresolved School.House identity');\n  check(schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null, 'Florida corporate owner resolution must admit no document number');\n",
  'validator corporate exact denominators'
);
validator = replaceExact(
  validator,
  "  check(unique(schoolhouseFlFictitiousCandidates.map(row => row.candidate_id)), 'Florida fictitious candidate IDs must be unique');\n",
  "  check(unique(schoolhouseFlFictitiousCandidates.map(row => row.candidate_id)), 'Florida fictitious candidate IDs must be unique');\n  check(unique(schoolhouseFlCorporateMembers.map(row => row.partition_digit)), 'Florida corporate partition digits must be unique');\n  check(unique(schoolhouseFlCorporateRecords.map(row => row.document_number)), 'Florida corporate document numbers must be unique');\n  check(unique(schoolhouseFlCorporateMatrix.map(row => row.target_charter_number)), 'Florida corporate target charter numbers must be unique');\n",
  'validator corporate uniqueness checks'
);
validator = replaceExact(
  validator,
  "  check(schoolhouseFlFictitiousAdjudication.identity_admitted === false && schoolhouseFlFictitiousAdjudication.graph_effect === 'none', 'Florida fictitious adjudication must remain graph-inert');\n",
  "  check(schoolhouseFlFictitiousAdjudication.identity_admitted === false && schoolhouseFlFictitiousAdjudication.graph_effect === 'none', 'Florida fictitious adjudication must remain graph-inert');\n\n  const expectedCorporateMembers = " + JSON.stringify(EXPECTED_MEMBERS) + ";\n  const expectedCorporateNames = " + JSON.stringify(EXPECTED_CORPORATE_NAMES) + ";\n  check(schoolhouseFlCorporateSource.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', 'Florida corporate source receipt ID drift');\n  check(schoolhouseFlCorporateSource.source_bytes === 1819049954 && schoolhouseFlCorporateSource.remote_zip_members === 10, 'Florida corporate source denominator drift');\n  check(schoolhouseFlCorporateSource.selected_partition_count === 7 && schoolhouseFlCorporateSource.selected_partition_rows_scanned === 8965926, 'Florida corporate selected-partition denominator drift');\n  check(schoolhouseFlCorporateSource.target_charters === 15 && schoolhouseFlCorporateSource.resolved_target_charters === 15 && schoolhouseFlCorporateSource.unresolved_target_charters === 0, 'Florida corporate target-resolution denominator drift');\n  check(schoolhouseFlCorporateSource.range_request_count === 24 && schoolhouseFlCorporateSource.range_requests.length === 24, 'Florida corporate range-request denominator drift');\n  check(schoolhouseFlCorporateSource.full_source_sha256 === null && schoolhouseFlCorporateSource.full_source_downloaded === false, 'Florida corporate source must not claim a full-source hash or download');\n  check(schoolhouseFlCorporateSource.raw_source_retained === false && schoolhouseFlCorporateSource.raw_compressed_members_retained === false && schoolhouseFlCorporateSource.raw_uncompressed_members_retained === false, 'Florida corporate source must retain no raw source');\n  check(schoolhouseFlCorporateSource.public_credential_password_retained === false, 'Florida corporate source must retain no public password');\n  check(schoolhouseFlCorporateSource.street_address_rows_retained === 0 && schoolhouseFlCorporateSource.mailing_address_rows_retained === 0 && schoolhouseFlCorporateSource.postal_code_rows_retained === 0 && schoolhouseFlCorporateSource.contact_detail_rows_retained === 0, 'Florida corporate source must retain no contact fields');\n  check(schoolhouseFlCorporateSource.private_support_rows === 0 && schoolhouseFlCorporateSource.schoolhouse_identity_admitted === false && schoolhouseFlCorporateSource.outside_human_dependency === false && schoolhouseFlCorporateSource.graph_effect === 'none', 'Florida corporate source authority drift');\n  check(schoolhouseFlCorporateSource.range_requests[0].request_id === 'head-source' && schoolhouseFlCorporateSource.range_requests[0].status === 200, 'Florida corporate HEAD receipt drift');\n  check(schoolhouseFlCorporateSource.range_requests.slice(1).every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Florida corporate range receipts must be terminal HTTP 206 captures');\n  check(schoolhouseFlCorporateIndex.central_directory_sha256 === '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330', 'Florida corporate central-directory SHA-256 drift');\n  check(schoolhouseFlCorporateIndex.declared_partitions === 10 && schoolhouseFlCorporateIndex.selected_partition_count === 7, 'Florida corporate remote ZIP partition drift');\n  check(new Set(schoolhouseFlCorporateIndex.members.map(row => row.partition_digit)).size === 10, 'Florida corporate remote ZIP member digits must be complete');\n  for (const member of schoolhouseFlCorporateMembers) {\n    const expected = expectedCorporateMembers[member.partition_digit];\n    check(Boolean(expected), `unexpected Florida corporate partition ${member.partition_digit}`);\n    if (expected) {\n      for (const key of ['member','compressed_size','uncompressed_size','row_count','crc32','uncompressed_sha256']) {\n        check(member[key] === expected[key], `Florida corporate partition ${member.partition_digit} ${key} drift`);\n      }\n    }\n    check(member.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `Florida corporate partition ${member.partition_digit} source receipt drift`);\n    check(member.state === 'complete_partition_scanned' && member.direct_record_count === member.row_count && member.reassembled_record_count === 0 && member.fragment_line_count === 0 && member.physical_line_count === member.row_count, `Florida corporate partition ${member.partition_digit} scan-state drift`);\n    check(member.raw_compressed_member_retained === false && member.raw_uncompressed_member_retained === false, `Florida corporate partition ${member.partition_digit} must retain no raw member`);\n    check(member.street_address_rows_retained === 0 && member.postal_code_rows_retained === 0 && member.contact_detail_rows_retained === 0 && member.private_support_rows === 0, `Florida corporate partition ${member.partition_digit} must retain no contact fields`);\n    check(member.schoolhouse_identity_admitted === false && member.graph_effect === 'none' && member.promotes_to === 'candidate_only', `Florida corporate partition ${member.partition_digit} authority drift`);\n  }\n  const allowedCorporateRecordKeys = new Set(['annual_reports','contact_details_retained','corporate_record_id','corporation_name_as_recorded','document_number','external_separator','fei','fictitious_candidate_links','file_date','file_date_as_recorded','filing_type','graph_effect','last_transaction_date','last_transaction_date_as_recorded','mailing_address_retained','more_than_six_officers','officers','physical_fragment_count','postal_code_retained','principal_city','principal_country','principal_state','private_support_rows','promotes_to','reassembly_mode','registered_agent_name_as_recorded','registered_agent_type','resolution_state','schoolhouse_identity_admitted','schoolhouse_identity_state','source_member','source_row_number','state_country','status','street_address_retained','receipt_id']);\n  const allowedCorporateOfficerKeys = new Set(['actor_type','contact_details_retained','name_as_recorded','officer_index','postal_code_retained','street_address_retained','title_as_recorded']);\n  for (const row of schoolhouseFlCorporateRecords) {\n    check(Object.keys(row).every(key => allowedCorporateRecordKeys.has(key)), `${row.document_number} contains an unapproved corporate field`);\n    check(row.corporation_name_as_recorded === expectedCorporateNames[row.document_number], `${row.document_number} corporate name drift`);\n    check(row.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `${row.document_number} source receipt drift`);\n    check(row.status === 'A' && row.resolution_state === 'exact_owner_charter_resolved', `${row.document_number} resolution-state drift`);\n    check(row.schoolhouse_identity_state === 'resolved_owner_entity_not_admitted_as_schoolhouse' && row.schoolhouse_identity_admitted === false, `${row.document_number} must not be admitted as School.House`);\n    check(row.street_address_retained === false && row.mailing_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false && row.private_support_rows === 0, `${row.document_number} must retain no contact fields`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.document_number} must remain graph-inert`);\n    for (const officer of row.officers) {\n      check(Object.keys(officer).every(key => allowedCorporateOfficerKeys.has(key)), `${row.document_number} officer contains an unapproved field`);\n      check(officer.street_address_retained === false && officer.postal_code_retained === false && officer.contact_details_retained === false, `${row.document_number} officer must retain no contact fields`);\n    }\n  }\n  for (const row of schoolhouseFlCorporateMatrix) {\n    check(row.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `${row.target_charter_number} matrix source receipt drift`);\n    check(row.target_denominator === 15 && row.matched_corporate_record_count === 1 && row.resolution_state === 'exact_corporate_record_resolved', `${row.target_charter_number} matrix resolution drift`);\n    check(row.resolved_corporation_name_as_recorded === expectedCorporateNames[row.target_charter_number], `${row.target_charter_number} matrix corporate name drift`);\n    check(row.schoolhouse_identity_disposition === 'not_admitted_distinct_owner_entity' && row.schoolhouse_identity_admitted === false, `${row.target_charter_number} matrix must not admit School.House identity`);\n    check(row.street_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false && row.private_support_rows === 0, `${row.target_charter_number} matrix must retain no contact fields`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.target_charter_number} matrix must remain graph-inert`);\n  }\n  check(new Set(schoolhouseFlCorporateMatrix.flatMap(row => row.fictitious_candidate_links.map(link => link.fictitious_candidate_id))).size === 17, 'Florida corporate matrix must type seventeen fictitious-name candidates');\n  check(schoolhouseFlCorporateAdjudication.frozen_target_denominator.target_charters === 15 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.resolved_target_charters === 15 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.unresolved_target_charters === 0, 'Florida corporate adjudication target denominator drift');\n  check(schoolhouseFlCorporateAdjudication.frozen_target_denominator.owner_linked_fictitious_candidates === 17 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.fictitious_candidates_without_owner_charter === 12 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.tampa_bay_phrase_candidates_with_owner_charter === 0, 'Florida corporate adjudication candidate-link boundary drift');\n  check(schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null && schoolhouseFlCorporateAdjudication.identity_decision.admitted_legal_name === null && schoolhouseFlCorporateAdjudication.identity_decision.admitted_ein === null, 'Florida corporate adjudication must admit no identity');\n  check(schoolhouseFlCorporateAdjudication.privacy.raw_source_retained === false && schoolhouseFlCorporateAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.mailing_address_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.postal_code_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.contact_detail_rows_retained === 0, 'Florida corporate adjudication must retain no raw or contact fields');\n  check(schoolhouseFlCorporateAdjudication.schoolhouse_identity_admitted === false && schoolhouseFlCorporateAdjudication.outside_human_dependency === false && schoolhouseFlCorporateAdjudication.graph_effect === 'none' && schoolhouseFlCorporateAdjudication.promotes_to === 'candidate_only', 'Florida corporate adjudication authority drift');\n",
  'validator corporate semantic checks'
);
validator = replaceExact(
  validator,
  "    stateRegistryRouteResults, stateRegistryRouteCustody, schoolhouseFlFictitiousSource,\n    schoolhouseFlFictitiousCandidates, schoolhouseFlFictitiousAdjudication\n",
  "    stateRegistryRouteResults, stateRegistryRouteCustody, schoolhouseFlFictitiousSource,\n    schoolhouseFlFictitiousCandidates, schoolhouseFlFictitiousAdjudication,\n    schoolhouseFlCorporateSource, schoolhouseFlCorporateIndex, schoolhouseFlCorporateMembers,\n    schoolhouseFlCorporateRecords, schoolhouseFlCorporateMatrix, schoolhouseFlCorporateAdjudication\n",
  'validator corporate receipt references'
);
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  source_inventory_rows: manifest.counts.source_inventory_rows,
  remote_zip_members: 10,
  target_partitions: 7,
  selected_partition_rows_scanned: 8_965_926,
  selected_compressed_bytes: 1_273_256_313,
  selected_uncompressed_bytes: 12_928_865_292,
  range_requests: 24,
  target_charters: 15,
  resolved_target_charters: 15,
  corporate_records: 15,
  owner_linked_fictitious_candidates: 17,
  admitted_identities: 0,
  changed_data_paths: 12,
  changed_total_paths: 14,
  outside_human_dependency: false,
  graph_effect: 'none'
}));
