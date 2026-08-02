#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ISSUE = 739;
const EXECUTION = 'SSC-RD04-SNAP-A07-D1';
const AUTHORIZATION_MAIN = 'dffed8d63e5cefb3b73b8ad49a96b268e098d204';
const A06_MERGE = 'd1597233110715e58e76e3b50b6792c226d9f7e8';
const A06_PRODUCT = 'a2351895e7537db18dc83b66c5a4e25bc7114840';
const A06_RELEASE_SHA256 = 'a6ec8b59f706d55834e0033b47c2a8b09b556937819a0a390e429942fdfaef45';
const A06_CUSTODY_SHA256 = '9040299387bb8460949bf8bca733e465414efcc35a652638ca7b98d6dc939312';
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_DIR = path.join(ROOT, 'data/intake', A06_SLUG);
const SHARD_DIR = path.join(A06_DIR, 'denominator-shards');
const A06_CORE = path.join(A06_DIR, 'core.json');
const A06_RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const OUT = path.join(ROOT, 'a07-order-probe');
const RELIEF_DISPOSITIONS = new Set(['Grant', 'Partial Grant', 'Stipulation']);
const EXPECTED_RELIEF_ROWS = {
  Grant: 1190,
  'Partial Grant': 2479,
  Stipulation: 2964
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stable(value));
};
const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyFn(row) ?? '').trim() || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const month = Number(mm);
  const day = Number(dd);
  const year = Number(yyyy);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return ms;
}

function compactRow(row, shard) {
  return {
    shard,
    global_position: row.global_position,
    registry_id: row.registry_id,
    row_identity: row.row_identity,
    row_sha256: row.row_sha256,
    document_identity: row.document_identity,
    decision_id: row.decision_id,
    archived: row.archived,
    release_date: row.release_date,
    filing_date: row.filing_date,
    program: row.program,
    disposition: row.disposition,
    issue_codes: row.issue_codes,
    responsible_agency: row.responsible_agency,
    organizational_ar_name: row.organizational_ar_name,
    alj_name: row.alj_name,
    language: row.language,
    shn_number: row.shn_number
  };
}

function manifestFor(files) {
  const entries = files
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
    .map((file) => {
      const bytes = fs.readFileSync(file);
      return { path: path.basename(file), bytes: bytes.length, sha256: sha256(bytes) };
    });
  return {
    entries,
    combined_sha256: sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'))
  };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const a06Core = readJson(A06_CORE);
const a06Manifest = readJson(A06_RELEASE_MANIFEST);
invariant(a06Core.execution_id === 'SSC-RD04-SNAP-A06', 'A06 core execution identity mismatch');
invariant(a06Core.counts?.registry_rows === 12282, 'A06 core registry-row count mismatch');
invariant(a06Core.counts?.unique_documents === 11672, 'A06 core document count mismatch');
invariant(a06Core.counts?.exact_pdf_documents === 11672, 'A06 exact-PDF count mismatch');
invariant(a06Core.counts?.exact_text_documents === 11672, 'A06 exact-text count mismatch');
invariant(a06Core.counts?.missing_or_non_pdf_documents === 0, 'A06 unresolved-document count must remain zero');
invariant(a06Core.counts?.case_level_implementation_joins === 0, 'A06 implementation joins must remain zero');
invariant(a06Manifest.combined_sha256 === A06_RELEASE_SHA256, 'A06 exact-byte release digest mismatch');

const shardFiles = fs.readdirSync(SHARD_DIR)
  .filter((name) => /^\d{2}\.json$/.test(name))
  .sort()
  .map((name) => path.join(SHARD_DIR, name));
invariant(shardFiles.length === 64, `expected 64 A06 denominator shards, observed ${shardFiles.length}`);

const allRows = [];
const allDocuments = [];
const registryIds = new Set();
const documentIds = new Set();
for (const file of shardFiles) {
  const payload = readJson(file);
  const shard = String(payload.shard ?? path.basename(file, '.json')).padStart(2, '0');
  invariant(payload.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `invalid shard schema ${shard}`);
  invariant(payload.execution_id === 'SSC-RD04-SNAP-A06', `invalid shard execution ${shard}`);
  invariant(payload.shard === shard, `shard identity mismatch ${shard}`);
  invariant(Array.isArray(payload.documents), `missing document array ${shard}`);
  invariant(payload.counts?.documents === payload.documents.length, `document count mismatch ${shard}`);
  let observedRows = 0;
  for (const document of payload.documents) {
    invariant(typeof document.document_identity === 'string' && document.document_identity.length > 0, `missing document identity ${shard}`);
    invariant(!documentIds.has(document.document_identity), `duplicate document identity ${document.document_identity}`);
    documentIds.add(document.document_identity);
    invariant(Array.isArray(document.registry_rows), `missing registry rows ${document.document_identity}`);
    invariant(document.registry_row_count === document.registry_rows.length, `registry-row count mismatch ${document.document_identity}`);
    invariant(Array.isArray(document.registry_ids), `missing registry IDs ${document.document_identity}`);
    invariant(document.registry_ids.length === document.registry_rows.length, `registry-ID count mismatch ${document.document_identity}`);
    const normalizedRows = [];
    for (const row of document.registry_rows) {
      invariant(row.document_identity === document.document_identity, `row/document identity mismatch ${row.registry_id}`);
      invariant(row.row_identity === `registry:${row.registry_id}`, `row identity mismatch ${row.registry_id}`);
      invariant(row.program === 'CalFresh', `non-CalFresh row ${row.registry_id}`);
      invariant(!registryIds.has(row.registry_id), `duplicate registry ID ${row.registry_id}`);
      registryIds.add(row.registry_id);
      const compact = compactRow(row, shard);
      invariant(parseDate(compact.release_date) !== null, `malformed release date ${compact.registry_id}: ${compact.release_date}`);
      normalizedRows.push(compact);
      allRows.push(compact);
      observedRows += 1;
    }
    allDocuments.push({
      shard,
      document_identity: document.document_identity,
      document_identity_sha256: document.document_identity_sha256,
      document_metadata_sha256: document.document_metadata_sha256,
      decision_id: document.decision_id,
      archived: document.archived,
      download_url: document.download_url,
      registry_row_count: document.registry_row_count,
      registry_ids: [...document.registry_ids],
      registry_rows: normalizedRows
    });
  }
  invariant(payload.counts?.registry_rows === observedRows, `registry-row count mismatch ${shard}`);
}

invariant(allRows.length === 12282, `A06 row denominator drift: ${allRows.length}`);
invariant(registryIds.size === 12282, `A06 unique registry-ID drift: ${registryIds.size}`);
invariant(allDocuments.length === 11672, `A06 document denominator drift: ${allDocuments.length}`);
invariant(documentIds.size === 11672, `A06 unique document-identity drift: ${documentIds.size}`);

allRows.sort((a, b) => Number(a.global_position) - Number(b.global_position) || String(a.registry_id).localeCompare(String(b.registry_id)));
allDocuments.sort((a, b) => a.document_identity.localeCompare(b.document_identity));

const d1Rows = allRows.filter((row) => RELIEF_DISPOSITIONS.has(row.disposition));
const d1RowsByDisposition = countBy(d1Rows, (row) => row.disposition);
for (const [disposition, expected] of Object.entries(EXPECTED_RELIEF_ROWS)) {
  invariant(d1RowsByDisposition[disposition] === expected, `${disposition} row count drift: ${d1RowsByDisposition[disposition]}`);
}
invariant(d1Rows.length === 6633, `D1 relief-row denominator drift: ${d1Rows.length}`);

const d1RegistryIds = new Set(d1Rows.map((row) => row.registry_id));
const d1DocumentIds = new Set(d1Rows.map((row) => row.document_identity));
const d1Documents = allDocuments
  .filter((document) => d1DocumentIds.has(document.document_identity))
  .map((document) => {
    const selectedRows = document.registry_rows.filter((row) => RELIEF_DISPOSITIONS.has(row.disposition));
    const allShns = uniqueSorted(document.registry_rows.map((row) => row.shn_number).filter(Boolean));
    const selectedShns = uniqueSorted(selectedRows.map((row) => row.shn_number).filter(Boolean));
    return {
      shard: document.shard,
      document_identity: document.document_identity,
      document_identity_sha256: document.document_identity_sha256,
      document_metadata_sha256: document.document_metadata_sha256,
      decision_id: document.decision_id,
      archived: document.archived,
      registry_row_count: document.registry_row_count,
      all_registry_ids: [...document.registry_ids],
      selected_registry_ids: selectedRows.map((row) => row.registry_id),
      selected_registry_row_count: selectedRows.length,
      selected_dispositions: uniqueSorted(selectedRows.map((row) => row.disposition)),
      all_dispositions: uniqueSorted(document.registry_rows.map((row) => row.disposition)),
      selected_shn_numbers: selectedShns,
      all_shn_numbers: allShns,
      selected_release_dates: uniqueSorted(selectedRows.map((row) => row.release_date)),
      selected_responsible_agencies: uniqueSorted(selectedRows.map((row) => row.responsible_agency)),
      selected_languages: uniqueSorted(selectedRows.map((row) => row.language)),
      implementation_receipt_observed: false,
      restoration_amount_observed: false,
      restoration_timing_observed: false,
      registry_disposition_is_implementation: false
    };
  });
invariant(d1Documents.length === d1DocumentIds.size, 'D1 document reconstruction mismatch');

const d1RowsByShn = new Map();
const allRowsByShn = new Map();
for (const row of allRows) {
  const shn = row.shn_number.trim();
  if (!shn) continue;
  if (!allRowsByShn.has(shn)) allRowsByShn.set(shn, []);
  allRowsByShn.get(shn).push(row);
}
for (const row of d1Rows) {
  const shn = row.shn_number.trim();
  if (!shn) continue;
  if (!d1RowsByShn.has(shn)) d1RowsByShn.set(shn, []);
  d1RowsByShn.get(shn).push(row);
}

const shnLedger = [...d1RowsByShn.entries()].map(([shn, rows]) => {
  const docs = uniqueSorted(rows.map((row) => row.document_identity));
  const allSameShnRows = (allRowsByShn.get(shn) ?? []).slice().sort((a, b) => parseDate(a.release_date) - parseDate(b.release_date) || String(a.registry_id).localeCompare(String(b.registry_id)));
  return {
    shn_number: shn,
    d1_registry_rows: rows.length,
    d1_registry_ids: uniqueSorted(rows.map((row) => row.registry_id)),
    d1_documents: docs.length,
    d1_document_identities: docs,
    d1_dispositions: uniqueSorted(rows.map((row) => row.disposition)),
    d1_release_dates: uniqueSorted(rows.map((row) => row.release_date)),
    responsible_agencies: uniqueSorted(rows.map((row) => row.responsible_agency)),
    all_a06_rows_with_shn: allSameShnRows.length,
    all_a06_registry_ids_with_shn: allSameShnRows.map((row) => row.registry_id),
    same_shn_is_same_claimant_proven: false,
    public_implementation_receipt_observed: false
  };
}).sort((a, b) => a.shn_number.localeCompare(b.shn_number));

const followupCandidates = [];
const reliefRowsWithLater = new Set();
const laterRegistryIds = new Set();
const laterDocumentIds = new Set();
for (const [shn, reliefRows] of d1RowsByShn.entries()) {
  const allSameShn = allRowsByShn.get(shn) ?? [];
  const candidatesByRegistry = new Map();
  for (const reliefRow of reliefRows) {
    const reliefMs = parseDate(reliefRow.release_date);
    for (const candidate of allSameShn) {
      const candidateMs = parseDate(candidate.release_date);
      if (candidate.registry_id === reliefRow.registry_id || candidateMs <= reliefMs) continue;
      reliefRowsWithLater.add(reliefRow.registry_id);
      laterRegistryIds.add(candidate.registry_id);
      laterDocumentIds.add(candidate.document_identity);
      if (!candidatesByRegistry.has(candidate.registry_id)) candidatesByRegistry.set(candidate.registry_id, candidate);
    }
  }
  if (!candidatesByRegistry.size) continue;
  const candidates = [...candidatesByRegistry.values()].sort((a, b) => parseDate(a.release_date) - parseDate(b.release_date) || String(a.registry_id).localeCompare(String(b.registry_id)));
  followupCandidates.push({
    shn_number: shn,
    d1_registry_ids: uniqueSorted(reliefRows.map((row) => row.registry_id)),
    d1_document_identities: uniqueSorted(reliefRows.map((row) => row.document_identity)),
    d1_release_dates: uniqueSorted(reliefRows.map((row) => row.release_date)),
    later_same_shn_rows: candidates.map((row) => ({
      registry_id: row.registry_id,
      document_identity: row.document_identity,
      decision_id: row.decision_id,
      release_date: row.release_date,
      disposition: row.disposition,
      responsible_agency: row.responsible_agency,
      issue_codes: row.issue_codes,
      language: row.language
    })),
    later_same_shn_record_is_implementation: false
  });
}
followupCandidates.sort((a, b) => a.shn_number.localeCompare(b.shn_number));

const dateValues = d1Rows.map((row) => ({ value: row.release_date, ms: parseDate(row.release_date) })).sort((a, b) => a.ms - b.ms);
const d1BlankShnRows = d1Rows.filter((row) => !row.shn_number.trim());
const d1DocumentsWithAnyBlankShn = d1Documents.filter((document) => {
  const selected = d1Rows.filter((row) => row.document_identity === document.document_identity);
  return selected.some((row) => !row.shn_number.trim());
});
const d1DocumentsWithoutNonblankShn = d1Documents.filter((document) => document.selected_shn_numbers.length === 0);
const repeatedShnRows = shnLedger.filter((row) => row.d1_registry_rows > 1);
const repeatedShnDocuments = shnLedger.filter((row) => row.d1_documents > 1);

const contract = {
  schema_version: 'ssc-rd04-a07-d1-contract@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  authorized_main: AUTHORIZATION_MAIN,
  parent: {
    a06_merge: A06_MERGE,
    a06_product: A06_PRODUCT,
    a06_release_sha256: A06_RELEASE_SHA256,
    a06_combined_custody_sha256: A06_CUSTODY_SHA256
  },
  source: {
    path_pattern: `data/intake/${A06_SLUG}/denominator-shards/XX.json`,
    shards: 64,
    expected_registry_rows: 12282,
    expected_unique_documents: 11672
  },
  inclusion_rule: {
    field: 'registry_rows[].disposition',
    exact_values: [...RELIEF_DISPOSITIONS].sort(),
    selected_before_receipt_search: true,
    complete_non_sampled_denominator: true
  },
  frozen_public_record_cutoff: '2026-08-02T00:00:00Z',
  outside_human_dependency: false,
  external_contacts_authorized: 0,
  project_blocking: false
};

const d1RowsOutput = {
  schema_version: 'ssc-rd04-a07-d1-row-ledger@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  count: d1Rows.length,
  rows: d1Rows
};
const d1DocumentsOutput = {
  schema_version: 'ssc-rd04-a07-d1-document-ledger@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  count: d1Documents.length,
  documents: d1Documents
};
const shnOutput = {
  schema_version: 'ssc-rd04-a07-d1-shn-ledger@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  unique_nonblank_shns: shnLedger.length,
  shns: shnLedger
};
const followupOutput = {
  schema_version: 'ssc-rd04-a07-d1-same-shn-followup-candidates@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  scope: 'A06_fiscal_year_corpus_only',
  public_record_cutoff: '2026-08-02T00:00:00Z',
  same_shn_is_same_claimant_proven: false,
  later_same_shn_record_is_implementation: false,
  shns_with_later_rows: followupCandidates.length,
  later_registry_rows: laterRegistryIds.size,
  later_documents: laterDocumentIds.size,
  rows: followupCandidates
};
const summary = {
  schema_version: 'ssc-rd04-a07-d1-summary@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  parent: contract.parent,
  counts: {
    a06_registry_rows: allRows.length,
    a06_unique_registry_ids: registryIds.size,
    a06_unique_documents: allDocuments.length,
    d1_registry_rows: d1Rows.length,
    d1_unique_registry_ids: d1RegistryIds.size,
    d1_unique_documents: d1Documents.length,
    d1_nonblank_shn_rows: d1Rows.length - d1BlankShnRows.length,
    d1_blank_shn_rows: d1BlankShnRows.length,
    d1_unique_nonblank_shns: shnLedger.length,
    d1_documents_with_any_blank_shn_row: d1DocumentsWithAnyBlankShn.length,
    d1_documents_without_nonblank_shn: d1DocumentsWithoutNonblankShn.length,
    d1_shns_with_multiple_rows: repeatedShnRows.length,
    d1_shns_with_multiple_documents: repeatedShnDocuments.length,
    maximum_d1_rows_per_shn: shnLedger.reduce((max, row) => Math.max(max, row.d1_registry_rows), 0),
    maximum_d1_documents_per_shn: shnLedger.reduce((max, row) => Math.max(max, row.d1_documents), 0),
    d1_rows_with_later_same_shn_row_in_a06: reliefRowsWithLater.size,
    shns_with_later_same_shn_row_in_a06: followupCandidates.length,
    unique_later_same_shn_registry_rows_in_a06: laterRegistryIds.size,
    unique_later_same_shn_documents_in_a06: laterDocumentIds.size,
    external_contacts: 0,
    external_reviews: 0,
    qualifying_public_implementation_receipts: 0,
    case_level_implementation_joins: 0
  },
  d1_registry_rows_by_disposition: d1RowsByDisposition,
  d1_documents_by_selected_disposition: Object.fromEntries([...RELIEF_DISPOSITIONS].sort().map((disposition) => [
    disposition,
    d1Documents.filter((document) => document.selected_dispositions.includes(disposition)).length
  ])),
  d1_registry_rows_by_responsible_agency: countBy(d1Rows, (row) => row.responsible_agency),
  d1_registry_rows_by_language: countBy(d1Rows, (row) => row.language),
  release_date_range: {
    minimum: dateValues.at(0)?.value ?? null,
    maximum: dateValues.at(-1)?.value ?? null
  },
  terminal_state: 'complete_relief_order_denominator_no_public_implementation_receipt_yet',
  authority: {
    registry_disposition_is_implementation: false,
    relief_order_is_restoration: false,
    same_shn_is_same_claimant: false,
    later_same_shn_record_is_implementation: false,
    missing_public_receipt_is_noncompliance: false,
    complete_agency_action_universe: false,
    external_review: false,
    publication_effect: 'none',
    graph_effect: 'none',
    adoption_effect: 'none'
  }
};

const outputs = [
  ['contract.json', contract],
  ['d1-rows.json', d1RowsOutput],
  ['d1-documents.json', d1DocumentsOutput],
  ['d1-shn-ledger.json', shnOutput],
  ['same-shn-followup-candidates.json', followupOutput],
  ['summary.json', summary]
];
for (const [name, value] of outputs) writeJson(path.join(OUT, name), value);
const manifest = manifestFor(outputs.map(([name]) => path.join(OUT, name)));
writeJson(path.join(OUT, 'manifest.json'), {
  schema_version: 'ssc-rd04-a07-d1-probe-manifest@1',
  execution_id: EXECUTION,
  issue: ISSUE,
  hash_mode: 'sha256_exact_bytes',
  ...manifest,
  authority: {
    exact_bytes_prove_public_implementation: false,
    exact_bytes_prove_restoration: false,
    external_contacts: 0,
    graph_effect: 'none'
  }
});

console.log(JSON.stringify({
  d1_registry_rows: summary.counts.d1_registry_rows,
  d1_unique_documents: summary.counts.d1_unique_documents,
  d1_unique_nonblank_shns: summary.counts.d1_unique_nonblank_shns,
  d1_blank_shn_rows: summary.counts.d1_blank_shn_rows,
  shns_with_later_same_shn_row_in_a06: summary.counts.shns_with_later_same_shn_row_in_a06,
  later_same_shn_registry_rows_in_a06: summary.counts.unique_later_same_shn_registry_rows_in_a06,
  manifest_sha256: manifest.combined_sha256
}, null, 2));
