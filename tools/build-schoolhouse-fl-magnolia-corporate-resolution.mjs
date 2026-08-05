import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const ARTIFACT_DIR = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(ARTIFACT_DIR)) {
  throw new Error('usage: node tools/build-schoolhouse-fl-magnolia-corporate-resolution.mjs <artifact-dir>');
}

const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const SCHOOLHOUSE_PATH = path.join(DIR, 'schoolhouse.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const FRONTIER_PATH = path.join(DIR, 'acquisition-frontier.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const SOURCE_RECEIPT_ID = 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05';
const SOURCE_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-source-receipt.json';
const INDEX_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-remote-zip-index.json';
const REQUEST_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-range-request-receipts.jsonl';
const MEMBER_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-member-receipts.jsonl';
const RECORD_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-records.jsonl';
const MATRIX_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-matrix.jsonl';
const ADJUDICATION_FILE = 'schoolhouse-fl-magnolia-corporate-resolution-adjudication.json';

const EXPECTED_DOCUMENTS = ['L25000047895', 'N25000006947'];
const EXPECTED_MEMBERS = {
  '5': {
    member: 'cordata5.txt',
    compressed_size: 181873253,
    uncompressed_size: 1846812660,
    row_count: 1280730,
    crc32: '39f1a07a',
    uncompressed_sha256: 'b4427a149b3ffa1df69c50173bc1e2dae1c5eeab53a00d7eb8f3fd7b82439b0a',
    target_document: 'L25000047895'
  },
  '7': {
    member: 'cordata7.txt',
    compressed_size: 181947770,
    uncompressed_size: 1846838616,
    row_count: 1280748,
    crc32: '2bd6f2f3',
    uncompressed_sha256: '795784a64b6a004afd46e08c346f0ed90222dd15dd63d3f0bd496a71fb5719fa',
    target_document: 'N25000006947'
  }
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

const artifactSummary = readJson(path.join(ARTIFACT_DIR, 'summary.json'));
const artifactSource = readJson(path.join(ARTIFACT_DIR, 'source-receipt.json'));
const artifactIndex = readJson(path.join(ARTIFACT_DIR, 'remote-zip-index.json'));
const artifactRequests = readJsonl(path.join(ARTIFACT_DIR, 'range-request-receipts.jsonl'));
const artifactMembers = readJsonl(path.join(ARTIFACT_DIR, 'member-receipts.jsonl'));
const artifactTargets = readJsonl(path.join(ARTIFACT_DIR, 'target-documents.jsonl'));
const artifactRecords = readJsonl(path.join(ARTIFACT_DIR, 'corporate-records.jsonl'));
const artifactMatrix = readJsonl(path.join(ARTIFACT_DIR, 'resolution-matrix.jsonl'));
const artifactAdjudication = readJson(path.join(ARTIFACT_DIR, 'cross-registry-adjudication.json'));

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.fl_corporate_owner_charter_targets !== 15 || manifest.counts.fl_corporate_owner_charters_resolved !== 15) {
  fail('Florida corporate owner-resolution predecessor drift');
}
if (manifest.counts.fl_corporate_schoolhouse_admitted_identity_rows !== 0) fail('predecessor identity authority drift');
if (schoolhouse.state_registry_identity_census?.florida_corporate_owner_resolution?.owner_charters_resolved !== 15) {
  fail('School.House corporate-owner predecessor state drift');
}
if (schoolhouse.state_registry_identity_census?.florida_magnolia_corporate_resolution) {
  fail('Magnolia corporate-resolution custody already exists');
}
for (const file of [SOURCE_FILE, INDEX_FILE, REQUEST_FILE, MEMBER_FILE, RECORD_FILE, MATRIX_FILE, ADJUDICATION_FILE]) {
  if (fs.existsSync(path.join(DIR, file))) fail(`Magnolia permanent path already exists: ${file}`);
}

if (artifactSummary.source_bytes !== 1_819_049_954) fail('Magnolia source byte count drift');
if (artifactSummary.remote_zip_members !== 10 || artifactSummary.target_partitions !== 2) fail('Magnolia partition denominator drift');
if (JSON.stringify(artifactSummary.target_partition_digits) !== JSON.stringify(['5', '7'])) fail('Magnolia target partition digits drift');
if (artifactSummary.target_documents !== 2 || artifactSummary.resolved_target_documents !== 2 || artifactSummary.corporate_records_retained !== 2) {
  fail('Magnolia target-document denominator drift');
}
if (artifactSummary.selected_partition_rows_scanned !== 2_561_478) fail('Magnolia scanned-row denominator drift');
if (artifactSummary.selected_compressed_bytes !== 363_821_023) fail('Magnolia selected compressed-byte denominator drift');
if (artifactSummary.selected_uncompressed_bytes !== 3_693_651_276) fail('Magnolia selected uncompressed-byte denominator drift');
if (artifactSummary.range_requests !== 9) fail('Magnolia range-request denominator drift');
if (artifactSummary.all_target_partitions_complete !== true || artifactSummary.all_target_documents_terminal !== true) {
  fail('Magnolia artifact is not terminal');
}
if (artifactSummary.magnolia_nonprofit_identifier_grade_irs_resolution !== true) fail('Magnolia nonprofit IRS resolution drift');
if (artifactSummary.magnolia_llc_bulk_fei !== '392669585') fail('Magnolia LLC bulk FEI drift');
if (artifactSummary.magnolia_llc_exact_fei_search_association_state !== 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication') {
  fail('Magnolia LLC shared-EIN conflict state drift');
}
if (artifactSummary.full_source_downloaded !== false || artifactSummary.raw_source_retained !== false) fail('Magnolia bounded-source contract failed');
for (const key of [
  'street_address_rows_retained',
  'mailing_address_rows_retained',
  'postal_code_rows_retained',
  'registered_agent_name_rows_retained',
  'officer_name_rows_retained',
  'officer_address_rows_retained',
  'contact_detail_rows_retained',
  'private_support_rows'
]) {
  if (artifactSummary[key] !== 0) fail(`Magnolia privacy count drift for ${key}`);
}
if (artifactSummary.public_schoolhouse_identity_admitted !== false || artifactSummary.negative_existence_claim_created !== false || artifactSummary.outside_human_dependency !== false || artifactSummary.graph_effect !== 'none') {
  fail('Magnolia authority boundary failed');
}
if (artifactSource.source_bytes !== 1_819_049_954 || artifactSource.remote_zip_members !== 10 || artifactSource.selected_partition_count !== 2) {
  fail('Magnolia source receipt denominator drift');
}
if (artifactSource.selected_partition_rows !== 2_561_478 || artifactSource.target_documents !== 2 || artifactSource.resolved_target_documents !== 2) {
  fail('Magnolia source receipt result drift');
}
if (artifactSource.public_credential_password_retained !== false || artifactSource.raw_source_retained !== false || artifactSource.raw_compressed_members_retained !== false || artifactSource.raw_uncompressed_members_retained !== false) {
  fail('Magnolia source receipt retention drift');
}
if (artifactIndex.central_directory_sha256 !== '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330') {
  fail('Magnolia central-directory SHA-256 drift');
}
if (artifactIndex.declared_partitions !== 10 || artifactIndex.selected_partition_count !== 2 || artifactIndex.members.length !== 10) {
  fail('Magnolia remote ZIP index drift');
}
if (artifactRequests.length !== 9 || !unique(artifactRequests.map(row => row.request_id))) fail('Magnolia range-request receipts drift');
const artifactHeadRequest = artifactRequests.find(row => row.request_id === 'head-source');
const artifactRangeRequests = artifactRequests.filter(row => row.request_id !== 'head-source');
if (!artifactHeadRequest || artifactHeadRequest.status !== 200 || artifactHeadRequest.state !== 'captured') fail('Magnolia HEAD receipt drift');
if (artifactRangeRequests.length !== 8 || artifactRangeRequests.some(row => row.status !== 206 || !row.content_range || row.state !== 'captured')) {
  fail('Magnolia range receipts must be eight terminal HTTP 206 captures');
}
if (artifactMembers.length !== 2 || !unique(artifactMembers.map(row => row.partition_digit))) fail('Magnolia member denominator drift');
for (const member of artifactMembers) {
  const expected = EXPECTED_MEMBERS[member.partition_digit];
  if (!expected) fail(`unexpected Magnolia partition ${member.partition_digit}`);
  for (const key of ['member', 'compressed_size', 'uncompressed_size', 'row_count', 'crc32', 'uncompressed_sha256']) {
    if (member[key] !== expected[key]) fail(`Magnolia partition ${member.partition_digit} ${key} drift`);
  }
  if (member.target_charter_count !== 1 || member.target_charters[0] !== expected.target_document || member.target_match_counts[expected.target_document] !== 1) {
    fail(`Magnolia partition ${member.partition_digit} target match drift`);
  }
  if (member.state !== 'complete_partition_scanned' || member.direct_record_count !== member.row_count || member.reassembled_record_count !== 0 || member.fragment_line_count !== 0 || member.physical_line_count !== member.row_count) {
    fail(`Magnolia partition ${member.partition_digit} scan-state drift`);
  }
  if (member.raw_compressed_member_retained !== false || member.raw_uncompressed_member_retained !== false) {
    fail(`Magnolia partition ${member.partition_digit} retained a raw member`);
  }
}
if (artifactTargets.length !== 2 || artifactRecords.length !== 2 || artifactMatrix.length !== 2) fail('Magnolia target, record, or matrix denominator drift');
if (JSON.stringify(artifactTargets.map(row => row.target_document_number).sort()) !== JSON.stringify(EXPECTED_DOCUMENTS)) fail('Magnolia target set drift');
if (JSON.stringify(artifactRecords.map(row => row.document_number).sort()) !== JSON.stringify(EXPECTED_DOCUMENTS)) fail('Magnolia record set drift');
if (JSON.stringify(artifactMatrix.map(row => row.target_document_number).sort()) !== JSON.stringify(EXPECTED_DOCUMENTS)) fail('Magnolia matrix set drift');
if (artifactMatrix.some(row => row.matched_corporate_record_count !== 1 || row.resolution_state !== 'exact_corporate_record_resolved' || row.public_schoolhouse_identity_admitted !== false)) {
  fail('Magnolia resolution matrix authority drift');
}
const artifactRecordByDocument = new Map(artifactRecords.map(row => [row.document_number, row]));
const llc = artifactRecordByDocument.get('L25000047895');
const nonprofit = artifactRecordByDocument.get('N25000006947');
if (!llc || !nonprofit) fail('Magnolia exact records missing');
if (llc.corporation_name_as_recorded !== 'THE MAGNOLIA SCHOOLHOUSE LLC' || llc.filing_type !== 'FLAL' || llc.file_date !== '2025-01-28' || llc.principal_city !== 'VERO BEACH' || llc.principal_state !== 'FL' || llc.fei !== '392669585') {
  fail('Magnolia LLC record drift');
}
if (llc.exact_fei_search_association_state !== 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication' || llc.irs_candidate_resolution_state !== 'exact_fei_search_association_not_identifier_grade') {
  fail('Magnolia LLC conflict classification drift');
}
if (nonprofit.corporation_name_as_recorded !== 'THE MAGNOLIA SCHOOLHOUSE, INC.' || nonprofit.filing_type !== 'DOMNP' || nonprofit.file_date !== '2025-06-11' || nonprofit.principal_city !== 'VERO BEACH' || nonprofit.principal_state !== 'FL' || nonprofit.fei !== '392669585') {
  fail('Magnolia nonprofit record drift');
}
if (nonprofit.exact_fei_search_association_state !== 'bulk_confirms_exact_irs_candidate_ein' || nonprofit.irs_candidate_resolution_state !== 'identifier_grade_irs_candidate_identity_resolved') {
  fail('Magnolia nonprofit classification drift');
}
for (const record of artifactRecords) {
  if (record.street_address_retained !== false || record.mailing_address_retained !== false || record.postal_code_retained !== false || record.registered_agent_name_retained !== false || record.officer_names_retained !== false || record.officer_addresses_retained !== false || record.contact_details_retained !== false || record.private_support_rows !== 0) {
    fail(`Magnolia record privacy drift for ${record.document_number}`);
  }
  if (record.public_schoolhouse_brand_join_state !== 'not_established' || record.public_schoolhouse_identity_admitted !== false || record.outside_human_dependency !== false || record.graph_effect !== 'none') {
    fail(`Magnolia record authority drift for ${record.document_number}`);
  }
  if (Object.hasOwn(record, 'registered_agent_name_as_recorded') || Object.hasOwn(record, 'officers')) {
    fail(`Magnolia forbidden identity detail survived for ${record.document_number}`);
  }
}
if (artifactAdjudication.public_schoolhouse_identity_decision?.state !== 'unresolved_no_florida_corporate_identity_admitted') fail('Magnolia artifact public-identity decision drift');

const permanentSource = {
  ...artifactSource,
  schema_version: 'schoolhouse-fl-magnolia-corporate-resolution-source-receipt@1',
  source_receipt_id: SOURCE_RECEIPT_ID,
  acquired_at: artifactSummary.completed_at,
  acquisition: {
    workflow_run_id: 30977237597,
    artifact_id: 8918773370,
    artifact_digest: 'sha256:77822ab6da2521db59a887f2559fd1123996083ec8dd61ca8e607ea094f6692d',
    head_sha: '6de90f006ec8b4d1fec4eef4542a387f2cb483bc',
    strict_exact_fei_predecessor_run_id: 30975237852,
    strict_exact_fei_predecessor_artifact_id: 8918041117,
    strict_exact_fei_predecessor_digest: 'sha256:1066e00ddff9b55f0e976abaa1212429c726ac8507d31691e163bbaee73a4316'
  },
  central_directory_sha256: artifactIndex.central_directory_sha256,
  range_request_count: artifactRequests.length,
  raw_source_retained: false,
  raw_compressed_members_retained: false,
  raw_uncompressed_members_retained: false,
  public_credential_password_retained: false,
  public_schoolhouse_identity_admitted: false,
  negative_existence_claim_created: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, SOURCE_FILE), permanentSource);

const permanentIndex = {
  ...artifactIndex,
  schema_version: 'schoolhouse-fl-magnolia-corporate-resolution-remote-zip-index@1',
  source_receipt_id: SOURCE_RECEIPT_ID,
  acquisition_workflow_run_id: 30977237597,
  acquisition_artifact_id: 8918773370,
  selected_partition_rows_scanned: 2_561_478,
  raw_source_retained: false,
  public_schoolhouse_identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, INDEX_FILE), permanentIndex);

const permanentRequests = artifactRequests.map(row => ({
  ...row,
  source_receipt_id: SOURCE_RECEIPT_ID,
  public_credential_password_retained: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
}));
writeJsonl(path.join(DIR, REQUEST_FILE), permanentRequests);

const permanentMembers = artifactMembers
  .map(row => ({ ...row, source_receipt_id: SOURCE_RECEIPT_ID }))
  .sort((a, b) => a.partition_digit.localeCompare(b.partition_digit));
writeJsonl(path.join(DIR, MEMBER_FILE), permanentMembers);

const permanentRecords = artifactRecords
  .map(row => ({
    ...row,
    source_receipt_id: SOURCE_RECEIPT_ID,
    shared_ein_conflict_state: 'two_distinct_florida_legal_entities_report_same_ein_no_control_or_tax_inference',
    public_schoolhouse_identity_disposition: 'not_admitted_2025_vero_beach_records_do_not_converge_with_public_2023_tampa_bay_or_fayetteville_claims'
  }))
  .sort((a, b) => a.document_number.localeCompare(b.document_number));
writeJsonl(path.join(DIR, RECORD_FILE), permanentRecords);

const permanentMatrix = artifactMatrix
  .map(row => ({
    ...row,
    source_receipt_id: SOURCE_RECEIPT_ID,
    target_denominator: 2,
    shared_ein_conflict_state: 'two_distinct_florida_legal_entities_report_same_ein_no_control_or_tax_inference',
    public_schoolhouse_identity_disposition: 'not_admitted'
  }))
  .sort((a, b) => a.target_document_number.localeCompare(b.target_document_number));
writeJsonl(path.join(DIR, MATRIX_FILE), permanentMatrix);

const permanentAdjudication = {
  schema_version: 'schoolhouse-fl-magnolia-corporate-resolution-adjudication@1',
  as_of: '2026-08-05',
  public_source_claims_used_for_adjudication: {
    public_name: 'School.House',
    founded_claim: 2023,
    location_claims: ['Tampa Bay', 'Fayetteville'],
    organization_type_claim: '501(c)(3) nonprofit / public charity',
    boundary: 'An exact EIN and legal-name resolution of an IRS candidate does not identify that entity as BVVC\'s public School.House unless the public brand, time, place, and registry identifiers converge.'
  },
  acquisition_history: [
    {
      stage: 'strict_exact_fei_candidate_denominator',
      workflow_run_id: 30975237852,
      artifact_id: 8918041117,
      artifact_digest: 'sha256:1066e00ddff9b55f0e976abaa1212429c726ac8507d31691e163bbaee73a4316',
      state: 'two_exact_document_numbers_three_search_name_rows_detail_denominator_incomplete'
    },
    {
      stage: 'complete_partition_corporate_resolution',
      workflow_run_id: 30977237597,
      artifact_id: 8918773370,
      artifact_digest: 'sha256:77822ab6da2521db59a887f2559fd1123996083ec8dd61ca8e607ea094f6692d',
      state: 'two_complete_partitions_two_exact_documents_terminal'
    }
  ],
  source_denominator: {
    source_receipt_id: SOURCE_RECEIPT_ID,
    source_bytes: 1_819_049_954,
    remote_zip_members: 10,
    central_directory_sha256: artifactIndex.central_directory_sha256,
    selected_partition_digits: ['5', '7'],
    selected_partitions: 2,
    selected_partition_rows_scanned: 2_561_478,
    selected_compressed_bytes: 363_821_023,
    selected_uncompressed_bytes: 3_693_651_276,
    range_requests: 9,
    full_source_downloaded: false
  },
  frozen_target_denominator: {
    irs_candidate_ein: '392669585',
    target_document_numbers: EXPECTED_DOCUMENTS,
    target_documents: 2,
    resolved_target_documents: 2,
    retained_corporate_records: 2
  },
  resolved_entities: [
    {
      document_number: 'N25000006947',
      legal_name_as_recorded: nonprofit.corporation_name_as_recorded,
      entity_type: nonprofit.filing_type,
      file_date: nonprofit.file_date,
      principal_city: nonprofit.principal_city,
      principal_state: nonprofit.principal_state,
      fei_ein: nonprofit.fei,
      irs_candidate_resolution_state: nonprofit.irs_candidate_resolution_state,
      disposition: 'identifier_grade_resolution_of_one_irs_candidate_not_public_schoolhouse'
    },
    {
      document_number: 'L25000047895',
      legal_name_as_recorded: llc.corporation_name_as_recorded,
      entity_type: llc.filing_type,
      file_date: llc.file_date,
      principal_city: llc.principal_city,
      principal_state: llc.principal_state,
      fei_ein: llc.fei,
      irs_candidate_resolution_state: llc.irs_candidate_resolution_state,
      disposition: 'shared_ein_distinct_legal_entity_requires_cross_surface_conflict_adjudication'
    }
  ],
  shared_identifier_conflict: {
    identifier_type: 'FEI_EIN',
    identifier: '392669585',
    reporting_entities: EXPECTED_DOCUMENTS,
    reporting_entity_count: 2,
    state: 'two_distinct_florida_legal_entities_report_same_ein',
    allowed_statement: 'The official quarterly corporate bulk records report FEI/EIN 39-2669585 for both the Magnolia nonprofit and Magnolia LLC.',
    forbidden_inferences: [
      'shared EIN proves ownership or common control',
      'shared EIN proves lawful or unlawful tax treatment',
      'shared EIN proves fiscal sponsorship',
      'shared EIN proves either entity is BVVC\'s public School.House'
    ]
  },
  public_schoolhouse_identity_decision: {
    state: 'unresolved_no_florida_corporate_identity_admitted',
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_ein: null,
    negative_existence_claim_created: false,
    rationale: 'The Magnolia nonprofit is an identifier-grade resolution of one IRS candidate, and the Magnolia LLC reports the same EIN in the official bulk record. Both are 2025 Vero Beach formations. Neither converges with the public School.House 2023 founding and Tampa Bay or Fayetteville claims, so no public-brand identity is admitted.'
  },
  next_transition: {
    action: 'Continue through the Florida charity registry and lawful North Carolina entity or charity reports, listings, subscriptions, or distinct official downloads. Preserve the Magnolia shared-EIN conflict as a source-specific fact and admit no public School.House identity without cross-source convergence.',
    forbidden_inference: 'A resolved IRS candidate or shared corporate EIN is not a public School.House identity, fiscal-sponsor, ownership, governance, or control finding.',
    outside_human_dependency: false
  },
  privacy: {
    full_source_downloaded: false,
    raw_source_retained: false,
    street_address_rows_retained: 0,
    mailing_address_rows_retained: 0,
    postal_code_rows_retained: 0,
    registered_agent_name_rows_retained: 0,
    officer_name_rows_retained: 0,
    officer_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0
  },
  source_receipt_id: SOURCE_RECEIPT_ID,
  source_receipt_file: SOURCE_FILE,
  remote_zip_index_file: INDEX_FILE,
  range_request_receipt_file: REQUEST_FILE,
  member_receipt_file: MEMBER_FILE,
  record_file: RECORD_FILE,
  resolution_matrix_file: MATRIX_FILE,
  public_schoolhouse_identity_admitted: false,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, ADJUDICATION_FILE), permanentAdjudication);

schoolhouse.coverage_state = 'bounded_current_surfaces_plus_registry_owner_and_magnolia_resolution_custody';
const stateCensus = schoolhouse.state_registry_identity_census;
stateCensus.identity_state = 'unresolved_after_exact_florida_owner_and_magnolia_corporate_resolution_no_public_identity_admitted';
stateCensus.florida_magnolia_corporate_resolution = {
  as_of: '2026-08-05',
  source_receipt_id: SOURCE_RECEIPT_ID,
  source_bytes: 1_819_049_954,
  remote_zip_members: 10,
  selected_partition_digits: ['5', '7'],
  selected_partitions: 2,
  selected_partition_rows_scanned: 2_561_478,
  selected_compressed_bytes: 363_821_023,
  selected_uncompressed_bytes: 3_693_651_276,
  range_requests: 9,
  target_documents: 2,
  resolved_documents: 2,
  irs_candidate_ein: '392669585',
  nonprofit_document_number: 'N25000006947',
  nonprofit_irs_candidate_resolution_state: 'identifier_grade_irs_candidate_identity_resolved',
  llc_document_number: 'L25000047895',
  llc_shared_ein_state: 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication',
  shared_ein_reporting_entities: 2,
  public_schoolhouse_identity_state: 'unresolved_no_florida_corporate_identity_admitted',
  source_receipt_file: SOURCE_FILE,
  remote_zip_index_file: INDEX_FILE,
  range_request_receipt_file: REQUEST_FILE,
  member_receipt_file: MEMBER_FILE,
  record_file: RECORD_FILE,
  resolution_matrix_file: MATRIX_FILE,
  adjudication_file: ADJUDICATION_FILE,
  boundary: 'The Magnolia nonprofit resolves one IRS candidate, and the Magnolia LLC reports the same EIN. Both are 2025 Vero Beach entities and neither is admitted as BVVC\'s public School.House.',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
stateCensus.boundary = 'The route, fictitious-name, owner-corporate, and Magnolia cross-registry custody create no public School.House legal-identity join. Fifteen phrase-candidate owners resolve to distinct entities. One IRS candidate resolves to a Magnolia nonprofit, while a Magnolia LLC reports the same EIN; both are 2025 Vero Beach entities and neither matches the public 2023 Tampa Bay or Fayetteville identity surface.';
const irsCensus = schoolhouse.irs_legal_identity_census;
irsCensus.resolved_candidate_eins = 1;
irsCensus.resolved_candidate_entities = 2;
irsCensus.magnolia_candidate_resolution = {
  ein: '392669585',
  irs_legal_name_as_recorded: 'THE MAGNOLIA SCHOOLHOUSE INC',
  nonprofit_document_number: 'N25000006947',
  nonprofit_resolution_state: 'identifier_grade_irs_candidate_identity_resolved',
  llc_document_number: 'L25000047895',
  llc_resolution_state: 'same_ein_distinct_legal_entity_requires_conflict_adjudication',
  public_schoolhouse_brand_join_state: 'not_established',
  adjudication_file: ADJUDICATION_FILE
};
irsCensus.boundary = 'The declared IRS phrase matrix is complete. One IRS candidate EIN is now resolved to two Florida corporate records that report the same identifier, but neither 2025 Vero Beach entity is admitted as the public School.House legal identity, fiscal sponsor, or governing organization.';
writeJson(SCHOOLHOUSE_PATH, schoolhouse);

const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
if (!schoolhouseTask) fail('School.House legal-governance frontier task missing');
schoolhouseTask.prior_irs_candidate_census.resolved_candidate_eins = 1;
schoolhouseTask.prior_irs_candidate_census.resolved_candidate_entities = 2;
schoolhouseTask.prior_irs_candidate_census.state = 'one_irs_candidate_resolved_shared_ein_conflict_public_identity_unresolved';
schoolhouseTask.prior_state_registry_custody.magnolia_corporate_resolution = {
  source_bytes: 1_819_049_954,
  selected_partitions: 2,
  selected_partition_rows_scanned: 2_561_478,
  target_documents: 2,
  resolved_documents: 2,
  irs_candidate_ein: '392669585',
  nonprofit_document_number: 'N25000006947',
  nonprofit_identifier_grade_resolution: true,
  llc_document_number: 'L25000047895',
  llc_shared_ein_state: 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication',
  public_schoolhouse_identity_admitted: false,
  state: 'unresolved_no_florida_corporate_identity_admitted',
  adjudication_file: ADJUDICATION_FILE
};
schoolhouseTask.prior_state_registry_custody.state = 'unresolved_after_exact_florida_owner_and_magnolia_corporate_resolution_no_public_identity_admitted';
schoolhouseTask.next_transition = 'Continue through the Florida charity registry and lawful North Carolina reports, listings, subscriptions, or distinct official downloads. Preserve the Magnolia shared-EIN conflict without ownership, tax, fiscal-sponsor, or governance inference, and admit no public School.House identity without identifier, time, place, and brand convergence.';
writeJson(FRONTIER_PATH, frontier);

if (coverage.denominators.some(row => row.surface === 'Florida corporate resolution for IRS candidate EIN 39-2669585')) {
  fail('Magnolia coverage denominator already exists');
}
coverage.denominators.push({
  surface: 'Florida corporate resolution for IRS candidate EIN 39-2669585',
  declared_total: 2,
  enumerated_total: 2,
  resolved_total: 2,
  selected_partition_total: 2,
  source_rows_scanned: 2_561_478,
  shared_ein_reporting_entities: 2,
  public_schoolhouse_identities_admitted: 0,
  coverage_state: 'complete_for_frozen_two_document_set_shared_ein_conflict_preserved'
});
const irsGapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => row.startsWith('School.House exact legal entity and EIN remain unresolved after 4,428,541 official IRS rows'));
if (irsGapIndex < 0) fail('School.House IRS unresolved gap missing');
coverage.explicit_nulls_and_gaps[irsGapIndex] = 'School.House public legal identity remains unresolved after 4,428,541 official IRS rows produced 641 phrase candidates and 438 unique EINs. IRS candidate EIN 39-2669585 is now identifier-grade resolved to Florida nonprofit N25000006947, while LLC L25000047895 also reports the same EIN in the official corporate bulk record. The shared identifier conflict is preserved, and neither 2025 Vero Beach entity is admitted as the public 2023 Tampa Bay or Fayetteville School.House identity.';
const corporateGapIndex = coverage.explicit_nulls_and_gaps.findIndex(row => row.startsWith('Florida corporate owner follow-up is complete for all fifteen frozen charter numbers'));
if (corporateGapIndex < 0) fail('Florida corporate continuation gap missing');
coverage.explicit_nulls_and_gaps[corporateGapIndex] = 'Florida corporate owner follow-up is complete for all fifteen frozen charter numbers across seven final-digit partitions and 8,965,926 records. The two Magnolia exact-FEI documents are separately resolved across complete partitions 5 and 7, and both official bulk records report EIN 39-2669585. None of the seventeen corporate records is admitted as public School.House. Florida charity identity, North Carolina entity and charity records, differently named legal entities, fiscal-sponsor evidence, governance, and funding remain open.';
writeJson(COVERAGE_PATH, coverage);

manifest.boundaries ??= [];
manifest.boundaries.push('An identifier-grade resolution of an IRS candidate, or the same EIN appearing on two Florida legal entities, does not establish either entity as BVVC\'s public School.House, a fiscal sponsor, an owner, a governing entity, or a common-control relationship.');
manifest.counts.coverage_denominator_rows = coverage.denominators.length;
manifest.counts.explicit_gap_rows = coverage.explicit_nulls_and_gaps.length;
manifest.counts.fl_magnolia_remote_zip_members = 10;
manifest.counts.fl_magnolia_target_partitions = 2;
manifest.counts.fl_magnolia_selected_partition_rows = 2_561_478;
manifest.counts.fl_magnolia_selected_compressed_bytes = 363_821_023;
manifest.counts.fl_magnolia_selected_uncompressed_bytes = 3_693_651_276;
manifest.counts.fl_magnolia_range_requests = 9;
manifest.counts.fl_magnolia_target_documents = 2;
manifest.counts.fl_magnolia_documents_resolved = 2;
manifest.counts.fl_magnolia_corporate_records = 2;
manifest.counts.fl_magnolia_shared_ein_reporting_entities = 2;
manifest.counts.fl_magnolia_identifier_grade_irs_candidate_resolution_rows = 1;
manifest.counts.fl_magnolia_public_schoolhouse_admitted_identity_rows = 0;
manifest.coverage.schoolhouse_fl_magnolia_corporate_resolution = '2_of_2_documents_resolved_across_partitions_5_and_7_2561478_rows_shared_ein_conflict_zero_public_identity';
manifest.custody.next_waterline = 'florida_charity_north_carolina_entity_governance_and_source_archival';
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_source_receipt = SOURCE_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_remote_zip_index = INDEX_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_range_request_receipts = REQUEST_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_member_receipts = MEMBER_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_records = RECORD_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_matrix = MATRIX_FILE;
manifest.storage_contract.schoolhouse_fl_magnolia_corporate_resolution_adjudication = ADJUDICATION_FILE;
manifest.purpose = 'A source-addressed, graph-inert public-record lake for BVVC, School.House, current and historical roster observations, legal vehicles, financing announcements, institutional self-claims, explicit rejected joins, IRS and state-registry legal-identity candidate custody, exact Florida fictitious-name owner-corporate resolution, Magnolia IRS-candidate corporate conflict custody, coverage nulls, and deterministic continuation work.';
for (const file of [SOURCE_FILE, INDEX_FILE, REQUEST_FILE, MEMBER_FILE, RECORD_FILE, MATRIX_FILE, ADJUDICATION_FILE]) {
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
  'Florida owner-linked phrase candidates                  17\nstate-registry identities admitted                     0\n',
  'Florida owner-linked phrase candidates                  17\nFlorida Magnolia target documents                         2 / 2\nFlorida Magnolia partitions scanned                       2 / 10\nFlorida Magnolia rows scanned                      2,561,478\nFlorida Magnolia records reporting EIN 39-2669585         2\nFlorida Magnolia IRS candidate resolutions                1\nstate-registry identities admitted                     0\n',
  'README Magnolia counts insertion'
);
readme = replaceExact(
  readme,
  '- `schoolhouse-fl-corporate-owner-resolution-source-receipt.json`, `schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json`, `schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl`, `schoolhouse-fl-corporate-owner-resolution-records.jsonl`, `schoolhouse-fl-corporate-owner-resolution-matrix.jsonl`, and `schoolhouse-fl-corporate-owner-resolution-adjudication.json` preserve the bounded seven-partition corporate scan, all fifteen exact owner-entity resolutions, and the continued zero-admission decision.\n',
  '- `schoolhouse-fl-corporate-owner-resolution-source-receipt.json`, `schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json`, `schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl`, `schoolhouse-fl-corporate-owner-resolution-records.jsonl`, `schoolhouse-fl-corporate-owner-resolution-matrix.jsonl`, and `schoolhouse-fl-corporate-owner-resolution-adjudication.json` preserve the bounded seven-partition corporate scan, all fifteen exact owner-entity resolutions, and the continued zero-admission decision.\n- The seven `schoolhouse-fl-magnolia-corporate-resolution-*` files preserve the complete two-partition cross-registry pass for IRS candidate EIN 39-2669585, both exact Florida corporate records, the shared-EIN conflict, and the refusal to identify either 2025 Vero Beach entity as the public School.House platform.\n',
  'README Magnolia files insertion'
);
readme = replaceExact(
  readme,
  'Those records type seventeen phrase candidates to distinct owner entities; none is admitted as the public School.House identity. The next lawful boundary is Florida charity and North Carolina entity or charity custody that respects publisher automation policy.',
  'Those records type seventeen phrase candidates to distinct owner entities; none is admitted as the public School.House identity. The Magnolia cross-registry pass then scanned complete corporate partitions 5 and 7, resolved both exact documents tied to IRS candidate EIN 39-2669585, and found that the nonprofit and LLC official bulk records both report that identifier. The nonprofit is an identifier-grade resolution of the IRS candidate, while the LLC creates a source-specific shared-EIN conflict. Neither 2025 Vero Beach entity is admitted as the public 2023 Tampa Bay or Fayetteville School.House identity. The next lawful boundary is Florida charity and North Carolina entity or charity custody that respects publisher automation policy.',
  'README Magnolia continuation insertion'
);
fs.writeFileSync(README_PATH, readme);

const magnoliaValidatorBlock = `
  const schoolhouseFlMagnoliaSource = readJson(path.join(dir, '${SOURCE_FILE}'));
  const schoolhouseFlMagnoliaIndex = readJson(path.join(dir, '${INDEX_FILE}'));
  const schoolhouseFlMagnoliaRequests = readJsonl(path.join(dir, '${REQUEST_FILE}'));
  const schoolhouseFlMagnoliaMembers = readJsonl(path.join(dir, '${MEMBER_FILE}'));
  const schoolhouseFlMagnoliaRecords = readJsonl(path.join(dir, '${RECORD_FILE}'));
  const schoolhouseFlMagnoliaMatrix = readJsonl(path.join(dir, '${MATRIX_FILE}'));
  const schoolhouseFlMagnoliaAdjudication = readJson(path.join(dir, '${ADJUDICATION_FILE}'));

  check(manifest.counts.fl_magnolia_remote_zip_members === schoolhouseFlMagnoliaIndex.members.length, 'Magnolia remote ZIP member count drift');
  check(manifest.counts.fl_magnolia_target_partitions === schoolhouseFlMagnoliaMembers.length, 'Magnolia target partition count drift');
  check(manifest.counts.fl_magnolia_selected_partition_rows === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.row_count, 0), 'Magnolia selected-row count drift');
  check(manifest.counts.fl_magnolia_selected_compressed_bytes === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.compressed_size, 0), 'Magnolia compressed-byte count drift');
  check(manifest.counts.fl_magnolia_selected_uncompressed_bytes === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.uncompressed_size, 0), 'Magnolia uncompressed-byte count drift');
  check(manifest.counts.fl_magnolia_range_requests === schoolhouseFlMagnoliaRequests.length, 'Magnolia range-request count drift');
  check(manifest.counts.fl_magnolia_target_documents === schoolhouseFlMagnoliaMatrix.length, 'Magnolia target-document count drift');
  check(manifest.counts.fl_magnolia_documents_resolved === schoolhouseFlMagnoliaMatrix.filter(row => row.matched_corporate_record_count === 1).length, 'Magnolia resolved-document count drift');
  check(manifest.counts.fl_magnolia_corporate_records === schoolhouseFlMagnoliaRecords.length, 'Magnolia corporate-record count drift');
  check(manifest.counts.fl_magnolia_shared_ein_reporting_entities === schoolhouseFlMagnoliaRecords.filter(row => row.fei === '392669585').length, 'Magnolia shared-EIN reporting-entity count drift');
  check(manifest.counts.fl_magnolia_identifier_grade_irs_candidate_resolution_rows === schoolhouseFlMagnoliaRecords.filter(row => row.irs_candidate_resolution_state === 'identifier_grade_irs_candidate_identity_resolved').length, 'Magnolia identifier-grade IRS resolution count drift');
  check(manifest.counts.fl_magnolia_public_schoolhouse_admitted_identity_rows === 0, 'Magnolia must admit no public School.House identity');

  check(schoolhouseFlMagnoliaSource.source_receipt_id === '${SOURCE_RECEIPT_ID}', 'Magnolia source receipt ID drift');
  check(schoolhouseFlMagnoliaSource.source_bytes === 1819049954 && schoolhouseFlMagnoliaSource.remote_zip_members === 10, 'Magnolia source denominator drift');
  check(schoolhouseFlMagnoliaSource.selected_partition_count === 2 && schoolhouseFlMagnoliaSource.selected_partition_rows === 2561478, 'Magnolia selected-partition denominator drift');
  check(schoolhouseFlMagnoliaSource.target_documents === 2 && schoolhouseFlMagnoliaSource.resolved_target_documents === 2, 'Magnolia target-resolution denominator drift');
  check(schoolhouseFlMagnoliaSource.range_request_count === 9, 'Magnolia source range-request denominator drift');
  check(schoolhouseFlMagnoliaSource.full_source_downloaded === false && schoolhouseFlMagnoliaSource.raw_source_retained === false && schoolhouseFlMagnoliaSource.raw_compressed_members_retained === false && schoolhouseFlMagnoliaSource.raw_uncompressed_members_retained === false, 'Magnolia source must retain no raw source');
  check(schoolhouseFlMagnoliaSource.public_credential_password_retained === false, 'Magnolia source must retain no public password');
  check(schoolhouseFlMagnoliaSource.street_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.mailing_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.postal_code_rows_retained === 0 && schoolhouseFlMagnoliaSource.registered_agent_name_rows_retained === 0 && schoolhouseFlMagnoliaSource.officer_name_rows_retained === 0 && schoolhouseFlMagnoliaSource.officer_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.contact_detail_rows_retained === 0 && schoolhouseFlMagnoliaSource.private_support_rows === 0, 'Magnolia source privacy drift');
  check(schoolhouseFlMagnoliaSource.public_schoolhouse_identity_admitted === false && schoolhouseFlMagnoliaSource.negative_existence_claim_created === false && schoolhouseFlMagnoliaSource.outside_human_dependency === false && schoolhouseFlMagnoliaSource.graph_effect === 'none', 'Magnolia source authority drift');

  check(schoolhouseFlMagnoliaIndex.central_directory_sha256 === '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330', 'Magnolia central-directory SHA-256 drift');
  check(schoolhouseFlMagnoliaIndex.declared_partitions === 10 && schoolhouseFlMagnoliaIndex.selected_partition_count === 2, 'Magnolia ZIP partition drift');
  check(JSON.stringify(schoolhouseFlMagnoliaIndex.selected_partitions) === JSON.stringify(['5','7']), 'Magnolia selected partition digits drift');
  check(new Set(schoolhouseFlMagnoliaIndex.members.map(row => row.partition_digit)).size === 10, 'Magnolia ZIP member digits must be complete');

  check(schoolhouseFlMagnoliaRequests.length === 9 && unique(schoolhouseFlMagnoliaRequests.map(row => row.request_id)), 'Magnolia range-request receipt drift');
  const schoolhouseFlMagnoliaHeadRequest = schoolhouseFlMagnoliaRequests.find(row => row.request_id === 'head-source');
  const schoolhouseFlMagnoliaRangeRequests = schoolhouseFlMagnoliaRequests.filter(row => row.request_id !== 'head-source');
  check(Boolean(schoolhouseFlMagnoliaHeadRequest) && schoolhouseFlMagnoliaHeadRequest.status === 200 && schoolhouseFlMagnoliaHeadRequest.state === 'captured', 'Magnolia HEAD receipt drift');
  check(schoolhouseFlMagnoliaRangeRequests.length === 8 && schoolhouseFlMagnoliaRangeRequests.every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Magnolia range receipts must be eight terminal HTTP 206 captures');
  check(schoolhouseFlMagnoliaRequests.every(row => row.source_receipt_id === '${SOURCE_RECEIPT_ID}' && row.public_credential_password_retained === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Magnolia range-request authority drift');

  const expectedMagnoliaMembers = ${JSON.stringify(EXPECTED_MEMBERS)};
  check(schoolhouseFlMagnoliaMembers.length === 2 && unique(schoolhouseFlMagnoliaMembers.map(row => row.partition_digit)), 'Magnolia member denominator drift');
  for (const member of schoolhouseFlMagnoliaMembers) {
    const expected = expectedMagnoliaMembers[member.partition_digit];
    check(Boolean(expected), \`unexpected Magnolia partition \${member.partition_digit}\`);
    if (expected) {
      for (const key of ['member','compressed_size','uncompressed_size','row_count','crc32','uncompressed_sha256']) {
        check(member[key] === expected[key], \`Magnolia partition \${member.partition_digit} \${key} drift\`);
      }
      check(member.target_charter_count === 1 && member.target_charters[0] === expected.target_document && member.target_match_counts[expected.target_document] === 1, \`Magnolia partition \${member.partition_digit} target match drift\`);
    }
    check(member.state === 'complete_partition_scanned' && member.direct_record_count === member.row_count && member.reassembled_record_count === 0 && member.fragment_line_count === 0 && member.physical_line_count === member.row_count, \`Magnolia partition \${member.partition_digit} scan-state drift\`);
    check(member.raw_compressed_member_retained === false && member.raw_uncompressed_member_retained === false, \`Magnolia partition \${member.partition_digit} retained raw data\`);
    check(member.street_address_rows_retained === 0 && member.mailing_address_rows_retained === 0 && member.postal_code_rows_retained === 0 && member.registered_agent_name_rows_retained === 0 && member.officer_name_rows_retained === 0 && member.officer_address_rows_retained === 0 && member.contact_detail_rows_retained === 0 && member.private_support_rows === 0, \`Magnolia partition \${member.partition_digit} privacy drift\`);
    check(member.public_schoolhouse_identity_admitted === false && member.outside_human_dependency === false && member.graph_effect === 'none', \`Magnolia partition \${member.partition_digit} authority drift\`);
  }

  check(schoolhouseFlMagnoliaRecords.length === 2 && unique(schoolhouseFlMagnoliaRecords.map(row => row.document_number)), 'Magnolia corporate-record denominator drift');
  check(schoolhouseFlMagnoliaMatrix.length === 2 && unique(schoolhouseFlMagnoliaMatrix.map(row => row.target_document_number)), 'Magnolia matrix denominator drift');
  const magnoliaRecordByDocument = new Map(schoolhouseFlMagnoliaRecords.map(row => [row.document_number, row]));
  const magnoliaLlc = magnoliaRecordByDocument.get('L25000047895');
  const magnoliaNonprofit = magnoliaRecordByDocument.get('N25000006947');
  check(Boolean(magnoliaLlc) && Boolean(magnoliaNonprofit), 'Magnolia exact records missing');
  if (magnoliaLlc) {
    check(magnoliaLlc.corporation_name_as_recorded === 'THE MAGNOLIA SCHOOLHOUSE LLC' && magnoliaLlc.filing_type === 'FLAL' && magnoliaLlc.file_date === '2025-01-28' && magnoliaLlc.principal_city === 'VERO BEACH' && magnoliaLlc.principal_state === 'FL' && magnoliaLlc.fei === '392669585', 'Magnolia LLC exact fields drift');
    check(magnoliaLlc.exact_fei_search_association_state === 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication' && magnoliaLlc.irs_candidate_resolution_state === 'exact_fei_search_association_not_identifier_grade', 'Magnolia LLC conflict classification drift');
  }
  if (magnoliaNonprofit) {
    check(magnoliaNonprofit.corporation_name_as_recorded === 'THE MAGNOLIA SCHOOLHOUSE, INC.' && magnoliaNonprofit.filing_type === 'DOMNP' && magnoliaNonprofit.file_date === '2025-06-11' && magnoliaNonprofit.principal_city === 'VERO BEACH' && magnoliaNonprofit.principal_state === 'FL' && magnoliaNonprofit.fei === '392669585', 'Magnolia nonprofit exact fields drift');
    check(magnoliaNonprofit.exact_fei_search_association_state === 'bulk_confirms_exact_irs_candidate_ein' && magnoliaNonprofit.irs_candidate_resolution_state === 'identifier_grade_irs_candidate_identity_resolved', 'Magnolia nonprofit IRS classification drift');
  }
  for (const record of schoolhouseFlMagnoliaRecords) {
    check(record.source_receipt_id === '${SOURCE_RECEIPT_ID}', \`Magnolia record \${record.document_number} source receipt drift\`);
    check(record.shared_ein_conflict_state === 'two_distinct_florida_legal_entities_report_same_ein_no_control_or_tax_inference', \`Magnolia record \${record.document_number} shared-EIN state drift\`);
    check(record.street_address_retained === false && record.mailing_address_retained === false && record.postal_code_retained === false && record.registered_agent_name_retained === false && record.officer_names_retained === false && record.officer_addresses_retained === false && record.contact_details_retained === false && record.private_support_rows === 0, \`Magnolia record \${record.document_number} privacy drift\`);
    check(!Object.hasOwn(record, 'registered_agent_name_as_recorded') && !Object.hasOwn(record, 'officers'), \`Magnolia record \${record.document_number} retained forbidden identity detail\`);
    check(record.public_schoolhouse_brand_join_state === 'not_established' && record.public_schoolhouse_identity_admitted === false && record.outside_human_dependency === false && record.graph_effect === 'none' && record.promotes_to === 'candidate_only', \`Magnolia record \${record.document_number} authority drift\`);
  }
  check(schoolhouseFlMagnoliaMatrix.every(row => row.matched_corporate_record_count === 1 && row.resolution_state === 'exact_corporate_record_resolved' && row.target_denominator === 2 && row.public_schoolhouse_brand_join_state === 'not_established' && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'Magnolia matrix authority drift');
  check(schoolhouseFlMagnoliaAdjudication.shared_identifier_conflict.state === 'two_distinct_florida_legal_entities_report_same_ein', 'Magnolia shared-EIN conflict adjudication drift');
  check(schoolhouseFlMagnoliaAdjudication.shared_identifier_conflict.reporting_entity_count === 2, 'Magnolia shared-EIN reporting-entity denominator drift');
  check(schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.state === 'unresolved_no_florida_corporate_identity_admitted' && schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.admitted_document_number === null && schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.negative_existence_claim_created === false, 'Magnolia public School.House identity decision drift');
  check(schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_admitted === false && schoolhouseFlMagnoliaAdjudication.outside_human_dependency === false && schoolhouseFlMagnoliaAdjudication.graph_effect === 'none', 'Magnolia adjudication authority drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.resolved_documents === 2, 'School.House Magnolia resolution projection drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.shared_ein_reporting_entities === 2, 'School.House Magnolia shared-EIN projection drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.public_schoolhouse_identity_state === 'unresolved_no_florida_corporate_identity_admitted', 'School.House Magnolia identity projection drift');
`;
validator = replaceExact(
  validator,
  '  return errors;\n}',
  `${magnoliaValidatorBlock}\n  return errors;\n}`,
  'validator Magnolia block insertion'
);
fs.writeFileSync(VALIDATOR_PATH, validator);

console.log(JSON.stringify({
  schema_version: 'schoolhouse-fl-magnolia-corporate-resolution-build@1',
  source_receipt_id: SOURCE_RECEIPT_ID,
  source_bytes: 1_819_049_954,
  selected_partitions: 2,
  selected_partition_rows_scanned: 2_561_478,
  target_documents: 2,
  resolved_documents: 2,
  shared_ein_reporting_entities: 2,
  identifier_grade_irs_candidate_resolutions: 1,
  public_schoolhouse_identities_admitted: 0,
  permanent_paths: 14,
  outside_human_dependency: false,
  graph_effect: 'none'
}, null, 2));
