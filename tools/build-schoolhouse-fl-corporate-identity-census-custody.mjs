import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const CANONICAL_PARENT_COMMIT = 'e46d4aa98955e890a1bd2820dc43c52bc256490e';
const CANONICAL_PARENT_TREE = 'f6110927bb6a0241169f1e915db732e41fcb52cf';
const ACQUISITION = {
  workflow_run_id: 31056239350,
  workflow_head: 'fab302a769eff491f0caa363a3a565ec828e32e6',
  artifact_id: 8950526654,
  artifact_digest: 'sha256:98925c7a750f23cf8ed10fb1123ed0d79d78dcca79d4c67a2b0e26ed86146746',
  prior_unauthenticated_workflow_run_id: 31055609795,
  prior_unauthenticated_state: 'provider_http_403_before_source_scan',
};
const ARTIFACT_SHA256 = {
  'summary.json': 'a9d02a73824e08fd620ae95b16e7b341d0da5088dc2648da0b517d6c467f1e1c',
  'source-receipt.json': '0345130ae24f8b1467e03cc73f3e1d392b36ec3f3e6457a3361db9390124c389',
  'remote-zip-index.json': 'f5b8cc589ae24815b4e13ecd8c8a618936bd9190150dfc52794fbe543c6ac21c',
  'range-request-receipts.jsonl': '09e924518e2b128aa4249c9025e279dd2821f38ee7e425c0c4c7ffadbe54498a',
  'member-receipts.jsonl': '85a914c5e076a1b17cbf30ef19f640f0ae92db1ae794a6958a08598447bf700e',
  'target-matrix.json': '1bb8fad62c2f00be67b875948bcb05ed2edc9625c33ceecc135dcf78818d4622',
  'candidate-records.jsonl': '77b6c86d0f9aaf735df53157d10d55ca793342493cd85e3ca8f2ad5adb0937eb',
  'adjudication.json': '24debcf2046a6a54ef7d6b2b86d8029c297111c6228f2cc14344bdede492a5e0',
  'artifact-manifest.json': '51b7f22eb650d5f00c1de1aa1bd39cf7308bdecdf5994e339d4e277e466db388',
  'SHA256SUMS': '856cb0f0461c37fbab6b07cd5c68988c1b6dd14a13a642400c338c1bb0169f34',
};
const PREDECESSOR_SOURCE_ROWS = 447;
const PREDECESSOR_COVERAGE_ROWS = 28;
const EXPECTED_SOURCE_ROWS = 478;
const EXPECTED_COVERAGE_ROWS = 29;
const EXPECTED_GAP_ROWS = 16;

const FILES = {
  sourceReceipt: 'schoolhouse-fl-corporate-identity-census-source-receipt.json',
  remoteIndex: 'schoolhouse-fl-corporate-identity-census-remote-zip-index.json',
  rangeReceipts: 'schoolhouse-fl-corporate-identity-census-range-request-receipts.jsonl',
  memberReceipts: 'schoolhouse-fl-corporate-identity-census-member-receipts.jsonl',
  targetMatrix: 'schoolhouse-fl-corporate-identity-census-target-matrix.json',
  candidates: 'schoolhouse-fl-corporate-identity-census-candidate-records.jsonl',
  adjudication: 'schoolhouse-fl-corporate-identity-census-adjudication.json',
  custody: 'schoolhouse-fl-corporate-identity-census-custody.json',
  sourceInventory: 'source-inventory-19.jsonl',
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
const sha256Text = text => sha256Buffer(Buffer.from(text, 'utf8'));
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};
const countOccurrences = (value, needle) => value.split(needle).length - 1;
const replaceOnce = (value, from, to, label) => {
  assert.equal(countOccurrences(value, from), 1, `${label}: expected exactly one occurrence`);
  return value.replace(from, to);
};
const unique = values => new Set(values).size === values.length;
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));

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
  const index = readJson(path.join(dir, 'remote-zip-index.json'));
  const ranges = readJsonl(path.join(dir, 'range-request-receipts.jsonl'));
  const members = readJsonl(path.join(dir, 'member-receipts.jsonl'));
  const target = readJson(path.join(dir, 'target-matrix.json'));
  const candidates = readJsonl(path.join(dir, 'candidate-records.jsonl'));
  const acquisitionAdjudication = readJson(path.join(dir, 'adjudication.json'));
  const artifactManifest = readJson(path.join(dir, 'artifact-manifest.json'));

  assert.equal(summary.schema_version, 'schoolhouse-fl-corporate-identity-census@1');
  assert.equal(summary.source_rows_scanned, 12808196);
  assert.equal(summary.partitions_scanned, 10);
  assert.equal(summary.remote_zip_members, 10);
  assert.equal(summary.range_requests, 31);
  assert.equal(summary.candidate_rows, 300);
  assert.equal(summary.unique_candidate_documents, 300);
  assert.equal(summary.corporate_name_schoolhouse_phrase_rows, 278);
  assert.equal(summary.corporate_name_exact_public_brand_base_rows, 4);
  assert.equal(summary.corporate_name_schoolhouse_1776_rows, 0);
  assert.equal(summary.source_listed_person_match_rows, 22);
  assert.equal(summary.name_and_person_overlap_rows, 0);
  assert.equal(summary.multiple_source_listed_people_rows, 0);
  assert.equal(summary.active_candidate_rows, 130);
  assert.equal(summary.nonprofit_candidate_rows, 43);
  assert.equal(summary.filed_2023_or_later_candidate_rows, 74);
  assert.equal(summary.principal_city_exact_tampa_candidate_rows, 9);
  assert.equal(summary.fei_present_candidate_rows, 234);
  assert.deepEqual(summary.target_match_row_counts, {
    'schoolhouse-visible-employee-alex-martin': 22,
    'schoolhouse-visible-employee-joe-musselman': 0,
    'schoolhouse-visible-employee-leyla-gladish': 0,
    'schoolhouse-visible-employee-nicole-nsam': 0,
  });
  assert.equal(summary.query_submissions, 0);
  assert.equal(summary.identity_admitted_rows, 0);
  assert.equal(summary.negative_existence_claims_created, 0);
  assert.equal(summary.raw_source_retained, false);
  assert.equal(summary.raw_compressed_members_retained, false);
  assert.equal(summary.raw_uncompressed_members_retained, false);
  assert.equal(summary.street_address_rows_retained, 0);
  assert.equal(summary.mailing_address_rows_retained, 0);
  assert.equal(summary.postal_code_rows_retained, 0);
  assert.equal(summary.contact_detail_rows_retained, 0);
  assert.equal(summary.private_support_rows, 0);
  assert.equal(summary.outside_human_dependency, false);
  assert.equal(summary.graph_effect, 'none');
  assert.equal(summary.terminal_state, 'terminal_complete_ten_partition_florida_corporate_name_and_source_listed_person_candidate_census');

  assert.equal(source.schema_version, 'schoolhouse-fl-corporate-identity-source-receipt@1');
  assert.equal(source.expected_source_bytes, 1819049954);
  assert.equal(source.central_directory_sha256, '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330');
  assert.equal(source.head_receipt.status, 200);
  assert.equal(source.head_receipt.content_length, 1819049954);
  assert.equal(source.public_credentials_used, true);
  assert.equal(source.public_credential_password_retained, false);
  assert.equal(source.public_credentials_embedded_or_retained, false);
  assert.equal(source.transport_profile, 'public_basic_auth_https_head_plus_ipv4_http1_1_ranges');
  assert.equal(source.identity_admitted, false);

  assert.equal(index.schema_version, 'schoolhouse-fl-corporate-identity-remote-zip-index@1');
  assert.equal(index.all_partitions_selected, true);
  assert.equal(index.members.length, 10);
  assert.deepEqual(index.members.map(row => row.partition_digit), [...'0123456789']);
  assert.equal(ranges.length, 31);
  assert(unique(ranges.map(row => row.request_id)), 'range request IDs drift');
  assert(ranges.every(row => row.state === 'captured' && row.bytes > 0 && /^[0-9a-f]{64}$/.test(row.sha256)), 'range receipt drift');
  assert.equal(members.length, 10);
  assert.deepEqual(members.map(row => row.partition_digit), [...'0123456789']);
  assert.equal(members.reduce((sum, row) => sum + row.rows_scanned, 0), 12808196);
  assert.equal(members.reduce((sum, row) => sum + row.candidate_rows, 0), 300);
  assert(members.every(row => row.raw_compressed_member_retained === false && row.raw_uncompressed_member_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'member authority/privacy drift');

  assert.equal(target.schema_version, 'schoolhouse-fl-corporate-identity-target-matrix@1');
  assert.equal(target.person_match_rule, 'exact public-label token multiset, order-insensitive; no nickname or legal-name expansion');
  assert.deepEqual(target.person_targets.map(row => row.public_label), ['Joe Musselman', 'Alex Martin', 'Leyla Gladish', 'Nicole Nsam']);
  assert.equal(candidates.length, 300);
  assert(unique(candidates.map(row => row.document_number)), 'candidate document IDs must be unique');
  assert.equal(candidates.filter(row => row.schoolhouse_phrase_match).length, 278);
  assert.equal(candidates.filter(row => row.exact_public_brand_base_match).length, 4);
  assert.equal(candidates.filter(row => row.schoolhouse_1776_match).length, 0);
  assert.equal(candidates.filter(row => row.person_matches.length > 0).length, 22);
  assert.equal(candidates.filter(row => row.schoolhouse_phrase_match && row.person_matches.length > 0).length, 0);
  assert.equal(candidates.filter(row => row.candidate_signals.nonprofit_filing_type && row.candidate_signals.principal_city_exact_tampa).length, 0);
  assert.equal(candidates.filter(row => row.exact_public_brand_base_match && row.candidate_signals.active_status).length, 0);
  assert.equal(candidates.filter(row => row.exact_public_brand_base_match && row.candidate_signals.filed_2023_or_later).length, 0);
  assert.equal(candidates.filter(row => row.person_matches.some(match => match.public_label !== 'Alex Martin')).length, 0);
  assert(candidates.every(row => row.public_schoolhouse_identity_admitted === false && row.negative_existence_claim_created === false && row.street_address_retained === false && row.mailing_address_retained === false && row.postal_code_retained === false && row.contact_detail_retained === false && row.private_support_rows === 0 && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'candidate privacy/authority drift');
  const forbiddenKeys = new Set(['principal_address','mailing_address','registered_agent_address','officer_address','street_address','postal_code','email','phone']);
  assert(candidates.every(row => ![...forbiddenKeys].some(key => Object.hasOwn(row, key))), 'candidate forbidden field retained');

  assert.equal(acquisitionAdjudication.public_schoolhouse_identity_admitted, false);
  assert.equal(acquisitionAdjudication.negative_existence_claim_created, false);
  assert.equal(artifactManifest.counts.source_rows_scanned, 12808196);
  assert.equal(artifactManifest.counts.candidate_rows, 300);
  assert.equal(artifactManifest.counts.unique_candidate_documents, 300);
  return { summary, source, index, ranges, members, target, candidates, acquisitionAdjudication, artifactManifest };
}

function verifyPredecessor() {
  const manifest = readJson(path.join(DATA_DIR, 'manifest.json'));
  const coverage = readJson(path.join(DATA_DIR, 'coverage-matrix.json'));
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS, 'predecessor source denominator drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage denominator drift');
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage rows drift');
  assert.equal(coverage.explicit_nulls_and_gaps.length, EXPECTED_GAP_ROWS, 'predecessor explicit-gap drift');
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-18.jsonl', 'predecessor source inventory tail drift');
  assert(!fs.existsSync(path.join(DATA_DIR, FILES.custody)), 'corporate identity custody already exists');
  assert(!manifest.files[FILES.sourceInventory], 'source-inventory-19 already materialized');
}

function copyArtifactFile(artifactDir, artifactName, destinationName) {
  const source = path.join(artifactDir, artifactName);
  const destination = path.join(DATA_DIR, destinationName);
  fs.copyFileSync(source, destination);
}

function sourceInventoryRows(ranges, members, source) {
  const byDigit = new Map(members.map(row => [row.partition_digit, row]));
  return ranges.map((row, index) => {
    const memberMatch = /^member-compressed-(\d)$/.exec(row.request_id);
    const localMatch = /^local-(?:variable-)?header-(\d)$/.exec(row.request_id);
    const digit = memberMatch?.[1] ?? localMatch?.[1] ?? null;
    const member = digit === null ? null : byDigit.get(digit);
    const sourceState = row.request_id === 'zip-central-directory'
      ? 'captured_corporate_bulk_central_directory'
      : memberMatch
        ? 'captured_corporate_bulk_member_scanned'
        : 'captured_corporate_bulk_member_header';
    const note = row.request_id === 'zip-central-directory'
      ? 'Authenticated official Florida corporate bulk central-directory range; exact bytes and SHA-256 retained, raw archive not retained.'
      : memberMatch
        ? `Authenticated official Florida corporate bulk compressed member ${member.filename}; CRC, sizes, compressed SHA-256, ${member.rows_scanned} fixed-width rows, and ${member.candidate_rows} privacy-minimized candidate rows verified; compressed and uncompressed bytes discarded.`
        : `Authenticated official Florida corporate bulk local-header range for partition ${digit}; exact bytes and SHA-256 retained, raw archive/member bytes not retained.`;
    return {
      receipt_id: `r-schoolhouse-fl-corporate-identity-census-${String(index + 1).padStart(2, '0')}-${row.request_id}-${AS_OF}`,
      source_id: `schoolhouse-fl-corporate-identity-census-${row.request_id}`,
      locator_url: source.source_url,
      source_type: 'official_florida_corporate_bulk_range_request',
      evidence_class: 'official',
      source_state: sourceState,
      retrieved_at: AS_OF,
      content_sha256: row.sha256,
      workflow_run_id: ACQUISITION.workflow_run_id,
      artifact_id: ACQUISITION.artifact_id,
      artifact_digest: ACQUISITION.artifact_digest,
      acquisition_head: ACQUISITION.workflow_head,
      transport_profile: source.transport_profile,
      request_id: row.request_id,
      request_method: 'GET_RANGE',
      range_start: row.range_start,
      range_end: row.range_end,
      response_bytes: row.bytes,
      partition_digit: digit,
      member_filename: memberMatch ? member.filename : null,
      member_crc32: memberMatch ? member.crc32 : null,
      member_compressed_sha256: memberMatch ? member.compressed_sha256 : null,
      source_rows_scanned: memberMatch ? member.rows_scanned : 0,
      candidate_rows: memberMatch ? member.candidate_rows : 0,
      public_credentials_used: true,
      public_credential_password_retained: false,
      query_submitted: false,
      raw_source_retained: false,
      raw_compressed_member_retained: false,
      raw_uncompressed_member_retained: false,
      street_address_rows_retained: 0,
      mailing_address_rows_retained: 0,
      postal_code_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
      identity_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
      note,
    };
  });
}

function candidateProjection(row) {
  return {
    document_number: row.document_number,
    corporation_name_as_recorded: row.corporation_name_as_recorded,
    filing_type: row.filing_type,
    status: row.status,
    file_date: row.file_date,
    last_transaction_date: row.last_transaction_date,
    fei: row.fei,
    principal_city: row.principal_city,
    principal_state: row.principal_state,
    registered_agent_name_as_recorded: row.registered_agent_name_as_recorded,
    match_classes: row.match_classes,
    person_matches: row.person_matches,
    disposition: row.exact_public_brand_base_match
      ? 'exact_public_brand_base_but_historical_inactive_and_not_location_timeline_aligned'
      : row.candidate_signals.principal_city_exact_tampa
        ? 'tampa_candidate_with_distinct_legal_name_and_no_cross_signal_identity_join'
        : row.person_matches.length
          ? 'common_name_person_candidate_without_schoolhouse_name_overlap_or_independent_identity_alignment'
          : 'phrase_candidate_only',
  };
}

function buildPermanentAdjudication(candidates, acquisitionAdjudication) {
  const exactBase = candidates.filter(row => row.exact_public_brand_base_match);
  const tampa = candidates.filter(row => row.candidate_signals.principal_city_exact_tampa);
  const nonprofitTampa = candidates.filter(row => row.candidate_signals.nonprofit_filing_type && row.candidate_signals.principal_city_exact_tampa);
  const personRows = candidates.filter(row => row.person_matches.length > 0);
  return {
    schema_version: 'schoolhouse-fl-corporate-identity-census-adjudication@2',
    as_of: AS_OF,
    acquisition_adjudication_sha256: ARTIFACT_SHA256['adjudication.json'],
    declared_candidate_rows: 300,
    unique_candidate_documents: 300,
    corporate_name_schoolhouse_phrase_rows: 278,
    corporate_name_exact_public_brand_base_rows: 4,
    corporate_name_schoolhouse_1776_rows: 0,
    source_listed_person_match_rows: 22,
    source_listed_person_target_counts: {
      'Joe Musselman': 0,
      'Alex Martin': 22,
      'Leyla Gladish': 0,
      'Nicole Nsam': 0,
    },
    cross_signal_counts: {
      name_and_person_overlap_rows: 0,
      exact_public_brand_base_active_rows: exactBase.filter(row => row.candidate_signals.active_status).length,
      exact_public_brand_base_post_2023_rows: exactBase.filter(row => row.candidate_signals.filed_2023_or_later).length,
      exact_public_brand_base_tampa_rows: exactBase.filter(row => row.candidate_signals.principal_city_exact_tampa).length,
      exact_public_brand_base_nonprofit_rows: exactBase.filter(row => row.candidate_signals.nonprofit_filing_type).length,
      nonprofit_tampa_rows: nonprofitTampa.length,
      person_match_schoolhouse_phrase_rows: personRows.filter(row => row.schoolhouse_phrase_match).length,
      multiple_source_listed_people_rows: 0,
    },
    exact_public_brand_base_candidates: exactBase.map(candidateProjection),
    tampa_candidate_rows: tampa.map(candidateProjection),
    source_listed_person_candidate_summary: {
      all_exact_label_rows_are_alex_martin: personRows.every(row => row.person_matches.every(match => match.public_label === 'Alex Martin')),
      common_name_collision_requires_independent_identity_evidence: true,
      candidate_documents: sorted(personRows.map(row => row.document_number)),
    },
    admission_rule: acquisitionAdjudication.admission_rule,
    rejection_basis: [
      'All four exact public-brand-base corporate records are inactive historical entities; none aligns to the claimed 2023 founding or Tampa Bay/Fayetteville public surface.',
      'No source-listed person-label match overlaps a SchoolHouse-name corporation. All twenty-two exact-label rows are the common label Alex Martin and remain identity-ambiguous.',
      'No nonprofit candidate has principal city Tampa, and no candidate combines exact public-brand base, active status, post-2023 filing, Tampa location, nonprofit type, or source-listed-person evidence into an identifier-grade join.',
      'The active 2024 Tampa record SCHOOL HOUSE STITCH LLC is a distinctly named for-profit LLC and supplies no independent public School.House identity alignment.',
      'The complete July 2026 Florida snapshot cannot establish entity nonexistence outside Florida, a differently named entity, fiscal sponsorship, a state-only charity registration, or historical records absent from this source.',
    ],
    identity_state: 'unresolved_after_complete_florida_corporate_name_and_source_listed_person_census_no_cross_signal_identity_admitted',
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_officer_or_director: null,
    public_schoolhouse_identity_admitted: false,
    governance_relationship_admitted: false,
    ownership_relationship_admitted: false,
    fiscal_sponsor_relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function buildCustody(artifact, adjudication) {
  return {
    schema_version: 'schoolhouse-fl-corporate-identity-census-custody@1',
    as_of: AS_OF,
    canonical_parent: { commit: CANONICAL_PARENT_COMMIT, tree: CANONICAL_PARENT_TREE },
    acquisitions: {
      unauthenticated_preflight: {
        workflow_run_id: ACQUISITION.prior_unauthenticated_workflow_run_id,
        state: ACQUISITION.prior_unauthenticated_state,
        source_scan_started: false,
        source_rows_scanned: 0,
        identity_effect: 'none',
      },
      authenticated_complete_census: {
        workflow_run_id: ACQUISITION.workflow_run_id,
        workflow_head: ACQUISITION.workflow_head,
        artifact_id: ACQUISITION.artifact_id,
        artifact_digest: ACQUISITION.artifact_digest,
        artifact_manifest_sha256: ARTIFACT_SHA256['artifact-manifest.json'],
        artifact_sha256sums_sha256: ARTIFACT_SHA256.SHA256SUMS,
        transport_profile: artifact.source.transport_profile,
        public_credentials_used: true,
        public_credential_password_retained: false,
      },
    },
    counts: {
      source_bytes: 1819049954,
      remote_zip_members: 10,
      partitions_scanned: 10,
      range_requests: 31,
      source_rows_scanned: 12808196,
      candidate_rows: 300,
      unique_candidate_documents: 300,
      corporate_name_schoolhouse_phrase_rows: 278,
      corporate_name_exact_public_brand_base_rows: 4,
      corporate_name_schoolhouse_1776_rows: 0,
      source_listed_person_match_rows: 22,
      name_and_person_overlap_rows: 0,
      active_candidate_rows: 130,
      nonprofit_candidate_rows: 43,
      filed_2023_or_later_candidate_rows: 74,
      principal_city_exact_tampa_candidate_rows: 9,
      fei_present_candidate_rows: 234,
      query_submissions: 0,
      identity_admitted_rows: 0,
      negative_existence_claims_created: 0,
    },
    source_contract: {
      source_url: artifact.source.source_url,
      source_last_modified: artifact.summary.source_last_modified,
      central_directory_range: artifact.source.central_directory_range,
      central_directory_sha256: artifact.source.central_directory_sha256,
      record_length: 1440,
      all_ten_partitions_selected: true,
      fixed_public_brand_variants: artifact.summary.fixed_public_brand_variants,
      person_match_rule: artifact.target.person_match_rule,
      source_listed_person_targets: artifact.target.person_targets.map(row => row.public_label),
    },
    adjudication: {
      identity_state: adjudication.identity_state,
      exact_public_brand_base_candidates: 4,
      all_exact_public_brand_base_candidates_inactive: adjudication.exact_public_brand_base_candidates.every(row => row.status === 'I'),
      source_listed_person_match_rows: 22,
      all_source_listed_person_matches_are_alex_martin: adjudication.source_listed_person_candidate_summary.all_exact_label_rows_are_alex_martin,
      name_and_person_overlap_rows: 0,
      nonprofit_tampa_rows: 0,
      public_schoolhouse_identity_admitted: false,
      negative_existence_claim_created: false,
    },
    files: {
      source_receipt: FILES.sourceReceipt,
      remote_zip_index: FILES.remoteIndex,
      range_request_receipts: FILES.rangeReceipts,
      member_receipts: FILES.memberReceipts,
      target_matrix: FILES.targetMatrix,
      candidate_records: FILES.candidates,
      adjudication: FILES.adjudication,
      source_inventory: FILES.sourceInventory,
    },
    interpretation: {
      complete_snapshot_is_not_entity_nonexistence: true,
      corporate_name_match_is_candidate_only: true,
      exact_person_label_match_is_not_identity_or_governance: true,
      active_status_is_not_current_public_brand_alignment: true,
      FEI_is_registry_field_not_public_schoolhouse_join: true,
      city_level_location_is_not_identifier_grade_identity: true,
      no_cross_signal_join_is_not_absence_evidence: true,
    },
    privacy: {
      raw_source_retained: false,
      raw_compressed_members_retained: false,
      raw_uncompressed_members_retained: false,
      street_address_rows_retained: 0,
      mailing_address_rows_retained: 0,
      postal_code_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
      public_credential_password_retained: false,
    },
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_ein: null,
    public_schoolhouse_identity_admitted: false,
    governance_relationship_admitted: false,
    ownership_relationship_admitted: false,
    fiscal_sponsor_relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function updateSchoolhouse(adjudication) {
  const file = path.join(DATA_DIR, 'schoolhouse.json');
  const schoolhouse = readJson(file);
  const state = schoolhouse.state_registry_identity_census;
  assert(state, 'School.House state registry census missing');
  assert(!state.florida_corporate_identity_census, 'Florida corporate identity census projection already exists');
  state.florida_corporate_identity_census = {
    as_of: AS_OF,
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    source_bytes: 1819049954,
    remote_zip_members: 10,
    partitions_scanned: 10,
    range_requests: 31,
    source_rows_scanned: 12808196,
    candidate_rows: 300,
    unique_candidate_documents: 300,
    corporate_name_schoolhouse_phrase_rows: 278,
    corporate_name_exact_public_brand_base_rows: 4,
    corporate_name_schoolhouse_1776_rows: 0,
    source_listed_person_match_rows: 22,
    source_listed_person_target_counts: adjudication.source_listed_person_target_counts,
    name_and_person_overlap_rows: 0,
    active_candidate_rows: 130,
    nonprofit_candidate_rows: 43,
    filed_2023_or_later_candidate_rows: 74,
    principal_city_exact_tampa_candidate_rows: 9,
    nonprofit_tampa_rows: 0,
    exact_public_brand_base_active_rows: 0,
    exact_public_brand_base_post_2023_rows: 0,
    query_submissions: 0,
    identity_state: adjudication.identity_state,
    admitted_document_number: null,
    admitted_legal_name: null,
    admitted_ein: null,
    public_schoolhouse_identity_admitted: false,
    governance_relationship_admitted: false,
    ownership_relationship_admitted: false,
    fiscal_sponsor_relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: FILES.custody,
    adjudication_file: FILES.adjudication,
    candidate_file: FILES.candidates,
    boundary: 'The complete July 2026 Florida corporate bulk census yields 300 privacy-minimized name or exact public-label candidates, including four inactive exact brand-base entities and twenty-two common-name Alex Martin rows. No name/person overlap or cross-signal identifier-grade join admits a public School.House legal identity, governance, ownership, fiscal sponsor, or control relationship.',
  };
  state.identity_state = 'unresolved_after_complete_florida_corporate_candidate_census_no_public_identity_admitted';
  state.boundary = 'The route, fictitious-name, owner-corporate, Magnolia, complete corporate candidate, and Florida charity transport custody create no public School.House legal-identity join. The complete corporate snapshot retains 300 candidates but no exact-brand active/post-2023/Tampa alignment, no SchoolHouse-name/person overlap, and no admitted identity.';
  writeJson(file, schoolhouse);
}

function updateFrontier() {
  const file = path.join(DATA_DIR, 'acquisition-frontier.json');
  const frontier = readJson(file);
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(task, 'School.House frontier task missing');
  assert(!task.prior_fl_corporate_identity_census, 'frontier corporate census projection already exists');
  task.prior_fl_corporate_identity_census = {
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    source_bytes: 1819049954,
    remote_zip_members: 10,
    partitions_scanned: 10,
    range_requests: 31,
    source_rows_scanned: 12808196,
    candidate_rows: 300,
    unique_candidate_documents: 300,
    corporate_name_schoolhouse_phrase_rows: 278,
    corporate_name_exact_public_brand_base_rows: 4,
    corporate_name_schoolhouse_1776_rows: 0,
    source_listed_person_match_rows: 22,
    source_listed_person_target_counts: {
      joe_musselman: 0,
      alex_martin: 22,
      leyla_gladish: 0,
      nicole_nsam: 0,
    },
    name_and_person_overlap_rows: 0,
    active_candidate_rows: 130,
    nonprofit_candidate_rows: 43,
    filed_2023_or_later_candidate_rows: 74,
    principal_city_exact_tampa_candidate_rows: 9,
    query_submissions: 0,
    admitted_identities: 0,
    negative_existence_claims: 0,
    state: 'terminal_complete_ten_partition_candidate_census_no_cross_signal_identity_admitted',
    custody_file: FILES.custody,
    adjudication_file: FILES.adjudication,
  };
  task.next_transition = 'Do not repeat the frozen North Carolina route/PDF, first-party, Archive, Florida charity, or complete ten-partition Florida corporate name/person denominators against the July 10, 2026 source. The corporate census preserves 300 candidate documents, four inactive exact brand-base entities, twenty-two common-name Alex Martin rows, zero name/person overlap, and zero admitted identities. Continue only with materially distinct registry-grade evidence that independently aligns a candidate legal name or identifier to the public 2023 Tampa Bay or Fayetteville School.House surface, or with lawful exemption, formation, officer, board, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence.';
  writeJson(file, frontier);
}

function updateCoverage() {
  const file = path.join(DATA_DIR, 'coverage-matrix.json');
  const coverage = readJson(file);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'coverage predecessor row drift');
  assert(!coverage.denominators.some(row => row.surface === 'School.House complete Florida corporate legal-name and source-listed-person candidate census'), 'coverage row already exists');
  coverage.denominators.push({
    surface: 'School.House complete Florida corporate legal-name and source-listed-person candidate census',
    declared_total: 10,
    enumerated_total: 10,
    remote_zip_members: 10,
    partitions_scanned: 10,
    range_requests: 31,
    source_rows_scanned: 12808196,
    candidate_rows: 300,
    unique_candidate_documents: 300,
    corporate_name_schoolhouse_phrase_rows: 278,
    corporate_name_exact_public_brand_base_rows: 4,
    corporate_name_schoolhouse_1776_rows: 0,
    source_listed_person_match_rows: 22,
    name_and_person_overlap_rows: 0,
    active_candidate_rows: 130,
    nonprofit_candidate_rows: 43,
    filed_2023_or_later_candidate_rows: 74,
    principal_city_exact_tampa_candidate_rows: 9,
    query_submissions: 0,
    source_rows_acquired: 12808196,
    admitted_identities: 0,
    coverage_state: 'terminal_complete_ten_partition_florida_corporate_candidate_census_no_cross_signal_identity_admitted',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the complete first-party live-surface census'));
  assert(gapIndex >= 0, 'School.House cumulative gap missing');
  coverage.explicit_nulls_and_gaps[gapIndex] += ' The complete Florida corporate bulk successor then scanned all 12,808,196 fixed-width rows across all ten partitions, retaining 300 privacy-minimized candidate documents: 278 SchoolHouse-name phrase rows, four inactive exact public-brand-base records, and twenty-two exact public-label Alex Martin rows. No candidate combines a SchoolHouse-name match with a source-listed-person match; no exact brand-base record is active, Tampa-based, or filed in 2023 or later; and no nonprofit candidate has principal city Tampa. These bounded candidate dispositions do not establish entity absence, and no identity, governance, ownership, fiscal-sponsor, or control relationship was admitted.';
  writeJson(file, coverage);
}

function updateReadme() {
  const file = path.join(DATA_DIR, 'README.md');
  let text = fs.readFileSync(file, 'utf8');
  text = replaceOnce(text, 'public-source receipts                        447', 'public-source receipts                        478', 'README source count');
  const marker = 'state-registry identities admitted                     0\n';
  const block = [
    'Florida complete corporate partitions scanned            10 / 10',
    'Florida complete corporate rows scanned               12,808,196',
    'Florida complete corporate candidate documents               300',
    'Florida corporate SchoolHouse phrase rows                     278',
    'Florida exact public-brand-base corporate rows                  4',
    'Florida source-listed person-match rows                        22',
    'Florida SchoolHouse-name/person overlap rows                     0',
    'Florida active/nonprofit/post-2023/Tampa candidates 130 / 43 / 74 / 9',
    'Florida complete corporate identities admitted                  0',
  ].join('\n') + '\n';
  text = replaceOnce(text, marker, block + marker, 'README corporate counts');
  const filesMarker = '- `schoolhouse-fl-corporate-owner-resolution-source-receipt.json`, `schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json`, `schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl`, `schoolhouse-fl-corporate-owner-resolution-records.jsonl`, `schoolhouse-fl-corporate-owner-resolution-matrix.jsonl`, and `schoolhouse-fl-corporate-owner-resolution-adjudication.json` preserve the bounded seven-partition corporate scan, all fifteen exact owner-entity resolutions, and the continued zero-admission decision.\n';
  const filesAddition = `- \`${FILES.custody}\`, \`${FILES.sourceReceipt}\`, \`${FILES.remoteIndex}\`, \`${FILES.rangeReceipts}\`, \`${FILES.memberReceipts}\`, \`${FILES.targetMatrix}\`, \`${FILES.candidates}\`, \`${FILES.adjudication}\`, and \`${FILES.sourceInventory}\` preserve the complete ten-partition, 12,808,196-row Florida corporate candidate census. The product retains 300 privacy-minimized candidate documents, four inactive exact public-brand-base records, twenty-two exact public-label Alex Martin rows, zero SchoolHouse-name/person overlap, and zero identity admissions while discarding raw members, street and mailing addresses, postal codes, contact details, and the public credential password.\n`;
  text = replaceOnce(text, filesMarker, filesMarker + filesAddition, 'README corporate files');
  const narrativeMarker = 'The lawful-route successor then enumerated eight official roots';
  const narrativeAddition = 'The complete Florida corporate candidate successor then expanded from the prior target-specific seven-partition pass to all ten official partitions. It authenticated with the publisher\'s public bulk-access credential, verified the 1,819,049,954-byte archive, central directory, every member header, compressed size, CRC, and full 12,808,196-row denominator, and discarded all compressed and uncompressed source bytes after screening. The retained candidate plane contains 278 SchoolHouse-name phrase rows, four exact public-brand-base rows, and twenty-two exact public-label Alex Martin rows. All four exact brand-base records are inactive historical entities; none is Tampa-based or filed in 2023 or later. No person match overlaps a SchoolHouse-name record, no nonprofit candidate is Tampa-based, and no identity, governance, ownership, fiscal-sponsor, control, or absence finding is admitted.\n\n';
  text = replaceOnce(text, narrativeMarker, narrativeAddition + narrativeMarker, 'README corporate narrative');
  fs.writeFileSync(file, text);
}

function updateManifest(sourceRows) {
  const file = path.join(DATA_DIR, 'manifest.json');
  const manifest = readJson(file);
  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_fl_corporate_identity_remote_zip_members: 10,
    schoolhouse_fl_corporate_identity_partitions_scanned: 10,
    schoolhouse_fl_corporate_identity_range_requests: 31,
    schoolhouse_fl_corporate_identity_source_rows_scanned: 12808196,
    schoolhouse_fl_corporate_identity_candidate_rows: 300,
    schoolhouse_fl_corporate_identity_unique_candidate_documents: 300,
    schoolhouse_fl_corporate_identity_schoolhouse_phrase_rows: 278,
    schoolhouse_fl_corporate_identity_exact_public_brand_base_rows: 4,
    schoolhouse_fl_corporate_identity_schoolhouse_1776_rows: 0,
    schoolhouse_fl_corporate_identity_source_listed_person_match_rows: 22,
    schoolhouse_fl_corporate_identity_alex_martin_match_rows: 22,
    schoolhouse_fl_corporate_identity_joe_musselman_match_rows: 0,
    schoolhouse_fl_corporate_identity_leyla_gladish_match_rows: 0,
    schoolhouse_fl_corporate_identity_nicole_nsam_match_rows: 0,
    schoolhouse_fl_corporate_identity_name_and_person_overlap_rows: 0,
    schoolhouse_fl_corporate_identity_active_candidate_rows: 130,
    schoolhouse_fl_corporate_identity_nonprofit_candidate_rows: 43,
    schoolhouse_fl_corporate_identity_post_2023_candidate_rows: 74,
    schoolhouse_fl_corporate_identity_tampa_candidate_rows: 9,
    schoolhouse_fl_corporate_identity_fei_present_candidate_rows: 234,
    schoolhouse_fl_corporate_identity_query_submissions: 0,
    schoolhouse_fl_corporate_identity_admitted_identity_rows: 0,
    schoolhouse_fl_corporate_identity_negative_existence_claims: 0,
  });
  assert.equal(sourceRows.length, 31);
  manifest.storage_contract.source_inventory_parts.push(FILES.sourceInventory);
  Object.assign(manifest.storage_contract, {
    schoolhouse_fl_corporate_identity_census_source_receipt: FILES.sourceReceipt,
    schoolhouse_fl_corporate_identity_census_remote_zip_index: FILES.remoteIndex,
    schoolhouse_fl_corporate_identity_census_range_request_receipts: FILES.rangeReceipts,
    schoolhouse_fl_corporate_identity_census_member_receipts: FILES.memberReceipts,
    schoolhouse_fl_corporate_identity_census_target_matrix: FILES.targetMatrix,
    schoolhouse_fl_corporate_identity_census_candidate_records: FILES.candidates,
    schoolhouse_fl_corporate_identity_census_adjudication: FILES.adjudication,
    schoolhouse_fl_corporate_identity_census_custody: FILES.custody,
  });
  manifest.source_inventory.evidence_class_counts.official += 31;
  manifest.source_inventory.source_state_counts.captured_corporate_bulk_central_directory = 1;
  manifest.source_inventory.source_state_counts.captured_corporate_bulk_member_header = 20;
  manifest.source_inventory.source_state_counts.captured_corporate_bulk_member_scanned = 10;
  manifest.coverage.schoolhouse_fl_corporate_identity_census = '10_of_10_partitions_12808196_rows_31_ranges_300_candidates_4_inactive_exact_brand_base_22_alex_martin_zero_name_person_overlap_zero_identity';
  manifest.boundaries.push('A Florida corporate name containing SchoolHouse, an exact public-brand-base match, a city-level Tampa record, or a source-listed person-label match is candidate evidence only and does not establish the public School.House legal entity, governance, ownership, fiscal sponsor, funding, or control.');
  manifest.boundaries.push('All twenty-two exact source-listed-person label matches are the common label Alex Martin and none overlaps a SchoolHouse-name corporation; common-name coincidence may not be promoted without independent identifier-grade alignment.');
  manifest.boundaries.push('A complete July 2026 ten-partition Florida corporate bulk snapshot is bounded source custody, not evidence that no differently named, out-of-state, state-charity-only, historical, sponsored, or otherwise structured School.House legal entity exists.');
  manifest.custody.next_waterline = 'cross_surface_registry_grade_adjudication_after_complete_florida_corporate_candidate_census';
  for (const filename of [
    'acquisition-frontier.json',
    'coverage-matrix.json',
    'schoolhouse.json',
    FILES.sourceReceipt,
    FILES.remoteIndex,
    FILES.rangeReceipts,
    FILES.memberReceipts,
    FILES.targetMatrix,
    FILES.candidates,
    FILES.adjudication,
    FILES.custody,
    FILES.sourceInventory,
  ]) manifest.files[filename] = fileReceipt(filename);
  writeJson(file, manifest);
}

function updateValidators() {
  const validatorFile = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  let validator = fs.readFileSync(validatorFile, 'utf8');
  assert.equal(countOccurrences(validator, 'manifest.counts.source_inventory_rows === 447'), 8, 'main validator source count occurrence drift');
  assert.equal(countOccurrences(validator, 'manifest.counts.coverage_denominator_rows === 28'), 8, 'main validator coverage count occurrence drift');
  validator = validator.split('manifest.counts.source_inventory_rows === 447').join('manifest.counts.source_inventory_rows === 478');
  validator = validator.split('manifest.counts.coverage_denominator_rows === 28').join('manifest.counts.coverage_denominator_rows === 29');
  validator = replaceOnce(validator,
    "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-18.jsonl'",
    "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-19.jsonl'",
    'Florida charity and Form 990 source-inventory tail');
  const block = `

  if (fs.existsSync(path.join(dir, '${FILES.custody}'))) {
    const corporateCustody = readJson(path.join(dir, '${FILES.custody}'));
    const corporateSource = readJson(path.join(dir, '${FILES.sourceReceipt}'));
    const corporateIndex = readJson(path.join(dir, '${FILES.remoteIndex}'));
    const corporateRanges = readJsonl(path.join(dir, '${FILES.rangeReceipts}'));
    const corporateMembers = readJsonl(path.join(dir, '${FILES.memberReceipts}'));
    const corporateTargets = readJson(path.join(dir, '${FILES.targetMatrix}'));
    const corporateCandidates = readJsonl(path.join(dir, '${FILES.candidates}'));
    const corporateAdjudication = readJson(path.join(dir, '${FILES.adjudication}'));
    const corporateSourceRows = readJsonl(path.join(dir, '${FILES.sourceInventory}'));
    const corporateReceiptIds = new Set(sourceInventory.map(row => row.receipt_id));

    const exactBrand = corporateCandidates.filter(row => row.exact_public_brand_base_match);
    const personCandidates = corporateCandidates.filter(row => row.person_matches.length > 0);
    const namePersonOverlap = corporateCandidates.filter(row => row.schoolhouse_phrase_match && row.person_matches.length > 0);
    const nonprofitTampa = corporateCandidates.filter(row => row.candidate_signals.nonprofit_filing_type && row.candidate_signals.principal_city_exact_tampa);

    check(manifest.counts.source_inventory_rows === 478 && sourceInventory.length === 478, 'complete Florida corporate source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 29 && coverage.denominators.length === 29, 'complete Florida corporate coverage denominator drift');
    check(manifest.counts.explicit_gap_rows === 16 && coverage.explicit_nulls_and_gaps.length === 16, 'complete Florida corporate explicit-gap denominator drift');
    check(manifest.storage_contract.source_inventory_parts.at(-1) === '${FILES.sourceInventory}', 'complete Florida corporate source-inventory tail drift');
    check(manifest.source_inventory.evidence_class_counts.official === 253, 'complete Florida corporate official evidence count drift');
    check(manifest.source_inventory.source_state_counts.captured_corporate_bulk_central_directory === 1 && manifest.source_inventory.source_state_counts.captured_corporate_bulk_member_header === 20 && manifest.source_inventory.source_state_counts.captured_corporate_bulk_member_scanned === 10, 'complete Florida corporate source-state count drift');

    check(corporateSource.expected_source_bytes === 1819049954 && corporateSource.central_directory_sha256 === '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330', 'complete Florida corporate source contract drift');
    check(corporateSource.head_receipt.status === 200 && corporateSource.head_receipt.content_length === 1819049954 && corporateSource.public_credentials_used === true && corporateSource.public_credential_password_retained === false && corporateSource.public_credentials_embedded_or_retained === false, 'complete Florida corporate authenticated transport drift');
    check(corporateIndex.all_partitions_selected === true && corporateIndex.members.length === 10 && corporateIndex.members.map(row => row.partition_digit).join('') === '0123456789', 'complete Florida corporate ZIP denominator drift');
    check(corporateRanges.length === 31 && unique(corporateRanges.map(row => row.request_id)) && corporateRanges.every(row => row.state === 'captured'), 'complete Florida corporate range denominator drift');
    check(corporateMembers.length === 10 && corporateMembers.reduce((sum, row) => sum + row.rows_scanned, 0) === 12808196 && corporateMembers.reduce((sum, row) => sum + row.candidate_rows, 0) === 300, 'complete Florida corporate member denominator drift');
    check(corporateMembers.every(row => row.raw_compressed_member_retained === false && row.raw_uncompressed_member_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'complete Florida corporate member authority drift');

    check(corporateTargets.person_match_rule === 'exact public-label token multiset, order-insensitive; no nickname or legal-name expansion' && corporateTargets.person_targets.map(row => row.public_label).join('|') === 'Joe Musselman|Alex Martin|Leyla Gladish|Nicole Nsam', 'complete Florida corporate target matrix drift');
    check(corporateCandidates.length === 300 && unique(corporateCandidates.map(row => row.document_number)), 'complete Florida corporate candidate denominator drift');
    check(corporateCandidates.filter(row => row.schoolhouse_phrase_match).length === 278 && exactBrand.length === 4 && corporateCandidates.filter(row => row.schoolhouse_1776_match).length === 0, 'complete Florida corporate name-match denominator drift');
    check(personCandidates.length === 22 && personCandidates.every(row => row.person_matches.every(match => match.public_label === 'Alex Martin')), 'complete Florida corporate person-match denominator drift');
    check(namePersonOverlap.length === 0 && nonprofitTampa.length === 0 && exactBrand.every(row => row.status === 'I' && row.candidate_signals.active_status === false && row.candidate_signals.filed_2023_or_later === false && row.candidate_signals.principal_city_exact_tampa === false), 'complete Florida corporate cross-signal refusal drift');
    check(corporateCandidates.filter(row => row.candidate_signals.active_status).length === 130 && corporateCandidates.filter(row => row.candidate_signals.nonprofit_filing_type).length === 43 && corporateCandidates.filter(row => row.candidate_signals.filed_2023_or_later).length === 74 && corporateCandidates.filter(row => row.candidate_signals.principal_city_exact_tampa).length === 9 && corporateCandidates.filter(row => row.candidate_signals.fei_present).length === 234, 'complete Florida corporate candidate signal denominator drift');
    check(corporateCandidates.every(row => row.public_schoolhouse_identity_admitted === false && row.negative_existence_claim_created === false && row.street_address_retained === false && row.mailing_address_retained === false && row.postal_code_retained === false && row.contact_detail_retained === false && row.private_support_rows === 0 && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'complete Florida corporate candidate authority/privacy drift');

    check(corporateSourceRows.length === 31 && unique(corporateSourceRows.map(row => row.receipt_id)) && corporateSourceRows.every(row => corporateReceiptIds.has(row.receipt_id)), 'complete Florida corporate source receipt linkage drift');
    check(corporateSourceRows.filter(row => row.source_state === 'captured_corporate_bulk_central_directory').length === 1 && corporateSourceRows.filter(row => row.source_state === 'captured_corporate_bulk_member_header').length === 20 && corporateSourceRows.filter(row => row.source_state === 'captured_corporate_bulk_member_scanned').length === 10, 'complete Florida corporate source-state rows drift');
    check(corporateSourceRows.filter(row => row.source_state === 'captured_corporate_bulk_member_scanned').reduce((sum, row) => sum + row.source_rows_scanned, 0) === 12808196 && corporateSourceRows.filter(row => row.source_state === 'captured_corporate_bulk_member_scanned').reduce((sum, row) => sum + row.candidate_rows, 0) === 300, 'complete Florida corporate source-row accounting drift');
    check(corporateSourceRows.every(row => row.evidence_class === 'official' && row.public_credentials_used === true && row.public_credential_password_retained === false && row.query_submitted === false && row.raw_source_retained === false && row.raw_compressed_member_retained === false && row.raw_uncompressed_member_retained === false && row.street_address_rows_retained === 0 && row.mailing_address_rows_retained === 0 && row.postal_code_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0 && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'complete Florida corporate source inventory authority drift');

    check(corporateAdjudication.identity_state === 'unresolved_after_complete_florida_corporate_name_and_source_listed_person_census_no_cross_signal_identity_admitted' && corporateAdjudication.public_schoolhouse_identity_admitted === false && corporateAdjudication.governance_relationship_admitted === false && corporateAdjudication.ownership_relationship_admitted === false && corporateAdjudication.fiscal_sponsor_relationship_admitted === false && corporateAdjudication.negative_existence_claim_created === false, 'complete Florida corporate adjudication authority drift');
    check(corporateCustody.canonical_parent.commit === '${CANONICAL_PARENT_COMMIT}' && corporateCustody.canonical_parent.tree === '${CANONICAL_PARENT_TREE}', 'complete Florida corporate parent custody drift');
    check(corporateCustody.acquisitions.authenticated_complete_census.workflow_run_id === ${ACQUISITION.workflow_run_id} && corporateCustody.acquisitions.authenticated_complete_census.artifact_id === ${ACQUISITION.artifact_id} && corporateCustody.acquisitions.authenticated_complete_census.artifact_digest === '${ACQUISITION.artifact_digest}', 'complete Florida corporate acquisition custody drift');
    check(corporateCustody.counts.source_rows_scanned === 12808196 && corporateCustody.counts.candidate_rows === 300 && corporateCustody.counts.corporate_name_exact_public_brand_base_rows === 4 && corporateCustody.counts.source_listed_person_match_rows === 22 && corporateCustody.counts.name_and_person_overlap_rows === 0 && corporateCustody.counts.identity_admitted_rows === 0, 'complete Florida corporate custody denominator drift');
    check(corporateCustody.privacy.raw_source_retained === false && corporateCustody.privacy.raw_compressed_members_retained === false && corporateCustody.privacy.raw_uncompressed_members_retained === false && corporateCustody.privacy.street_address_rows_retained === 0 && corporateCustody.privacy.mailing_address_rows_retained === 0 && corporateCustody.privacy.postal_code_rows_retained === 0 && corporateCustody.privacy.contact_detail_rows_retained === 0 && corporateCustody.privacy.private_support_rows === 0 && corporateCustody.privacy.public_credential_password_retained === false, 'complete Florida corporate custody privacy drift');

    const schoolProjection = schoolhouse.state_registry_identity_census?.florida_corporate_identity_census;
    check(schoolProjection?.source_rows_scanned === 12808196 && schoolProjection?.candidate_rows === 300 && schoolProjection?.corporate_name_exact_public_brand_base_rows === 4 && schoolProjection?.source_listed_person_match_rows === 22 && schoolProjection?.name_and_person_overlap_rows === 0 && schoolProjection?.public_schoolhouse_identity_admitted === false, 'complete Florida corporate School.House projection drift');
    const frontierProjection = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_fl_corporate_identity_census;
    check(frontierProjection?.source_rows_scanned === 12808196 && frontierProjection?.candidate_rows === 300 && frontierProjection?.source_listed_person_match_rows === 22 && frontierProjection?.name_and_person_overlap_rows === 0 && frontierProjection?.admitted_identities === 0, 'complete Florida corporate frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House complete Florida corporate legal-name and source-listed-person candidate census' && row.enumerated_total === 10 && row.source_rows_scanned === 12808196 && row.candidate_rows === 300 && row.corporate_name_exact_public_brand_base_rows === 4 && row.source_listed_person_match_rows === 22 && row.name_and_person_overlap_rows === 0 && row.admitted_identities === 0), 'complete Florida corporate coverage row missing');
  }
`;
  const marker = '\n  for (const error of validateSchoolhouseHonorFoundation990Custody(dir)) errors.push(`School.House related-charity Form 990: ${error}`);\n';
  validator = replaceOnce(validator, marker, block + marker, 'main validator insertion');
  fs.writeFileSync(validatorFile, validator);

  const honorFile = path.resolve('tools/validate-schoolhouse-honor-foundation-990-custody.mjs');
  let honor = fs.readFileSync(honorFile, 'utf8');
  honor = replaceOnce(honor,
    "manifest.counts.source_inventory_rows === 447 && manifest.counts.coverage_denominator_rows === 28 && manifest.counts.explicit_gap_rows === 16",
    "manifest.counts.source_inventory_rows === 478 && manifest.counts.coverage_denominator_rows === 29 && manifest.counts.explicit_gap_rows === 16",
    'Honor validator headline denominator');
  honor = replaceOnce(honor,
    "manifest.source_inventory.evidence_class_counts.official === 222",
    "manifest.source_inventory.evidence_class_counts.official === 253",
    'Honor validator official provenance denominator');
  honor = replaceOnce(honor,
    "manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-18.jsonl'",
    "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-19.jsonl'",
    'Honor validator source inventory tail');
  fs.writeFileSync(honorFile, honor);
}

function main() {
  const artifactDir = process.argv[2];
  assert(artifactDir, 'usage: node build-schoolhouse-fl-corporate-identity-census-custody.mjs <artifact-dir>');
  verifyPredecessor();
  const artifact = verifyArtifact(path.resolve(artifactDir));

  copyArtifactFile(artifactDir, 'source-receipt.json', FILES.sourceReceipt);
  copyArtifactFile(artifactDir, 'remote-zip-index.json', FILES.remoteIndex);
  copyArtifactFile(artifactDir, 'range-request-receipts.jsonl', FILES.rangeReceipts);
  copyArtifactFile(artifactDir, 'member-receipts.jsonl', FILES.memberReceipts);
  copyArtifactFile(artifactDir, 'target-matrix.json', FILES.targetMatrix);
  copyArtifactFile(artifactDir, 'candidate-records.jsonl', FILES.candidates);

  const sourceRows = sourceInventoryRows(artifact.ranges, artifact.members, artifact.source);
  assert.equal(sourceRows.length, 31);
  assert.equal(sourceRows.reduce((sum, row) => sum + row.source_rows_scanned, 0), 12808196);
  assert.equal(sourceRows.reduce((sum, row) => sum + row.candidate_rows, 0), 300);
  writeJsonl(path.join(DATA_DIR, FILES.sourceInventory), sourceRows);

  const adjudication = buildPermanentAdjudication(artifact.candidates, artifact.acquisitionAdjudication);
  writeJson(path.join(DATA_DIR, FILES.adjudication), adjudication);
  const custody = buildCustody(artifact, adjudication);
  writeJson(path.join(DATA_DIR, FILES.custody), custody);

  updateSchoolhouse(adjudication);
  updateFrontier();
  updateCoverage();
  updateManifest(sourceRows);
  updateReadme();
  updateValidators();

  const output = {
    schema_version: 'schoolhouse-fl-corporate-identity-census-custody-build@1',
    canonical_parent_commit: CANONICAL_PARENT_COMMIT,
    canonical_parent_tree: CANONICAL_PARENT_TREE,
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    explicit_gap_rows: EXPECTED_GAP_ROWS,
    source_rows_scanned: 12808196,
    candidate_rows: 300,
    corporate_name_schoolhouse_phrase_rows: 278,
    corporate_name_exact_public_brand_base_rows: 4,
    corporate_name_schoolhouse_1776_rows: 0,
    source_listed_person_match_rows: 22,
    name_and_person_overlap_rows: 0,
    identity_admitted_rows: 0,
    negative_existence_claims_created: 0,
    permanent_files: [
      ...Object.values(FILES),
      'README.md',
      'acquisition-frontier.json',
      'coverage-matrix.json',
      'manifest.json',
      'schoolhouse.json',
      '../../tools/build-schoolhouse-fl-corporate-identity-census-custody.mjs',
      '../../tools/validate-bvvc-defense-capital.mjs',
      '../../tools/validate-schoolhouse-honor-foundation-990-custody.mjs',
    ].length,
    outside_human_dependency: false,
    graph_effect: 'none',
  };
  console.log(canonicalJson(output));
}

main();
