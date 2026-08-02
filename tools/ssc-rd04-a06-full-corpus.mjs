#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const EXECUTION = 'SSC-RD04-SNAP-A06';
const ISSUE = 721;
const PARENT_MAIN = '80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589';
const PARENT_RELEASE = 'b3f36dff2969d95767e6f0d564f7d3744bd72de98cf2b758d4729c6bc0de50c4';
const PROOF_ARTIFACT_ID = 8827602155;
const PROOF_ARTIFACT_SHA256 = '8ec1b2a042ec7db54f01b87d75d7ba10201a709b430ba3189b8ce35402205674';
const SHARD_COUNT = 64;
const RELEASE_TAG = 'ssc-rd04-a06-fy2025-26-corpus-v1';
const REGISTRY_URL = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const PRODUCT_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const INTAKE_REL = `data/intake/${PRODUCT_SLUG}`;
const PROJECT_MANIFEST_REL = `data/project/${PRODUCT_SLUG}-release-manifest.json`;
const BUILD_REL = 'build/core-thesis/status-sovereignty/rd04-calfresh-decision-corpus-a06';
const REPORT_REL = 'reports/core-thesis/status-sovereignty/rd04-calfresh-decision-corpus-a06';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };
const toPosix = (value) => value.split(path.sep).join('/');
const rel = (root, file) => toPosix(path.relative(root, file));

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function safeId(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '-');
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyFn(row) ?? '').trim() || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(target));
    else if (entry.isFile()) out.push(target);
  }
  return out;
}

function normalizeRow(raw, source) {
  const registryId = String(raw?.registryId ?? '').trim();
  const decisionId = String(raw?.decisionId ?? '').trim();
  const archived = raw?.isArchived === true || raw?.isArchived === 'true';
  if (!registryId) throw new Error(`missing registryId in ${source.slice}:${source.source_index}`);
  if (!archived && !decisionId) throw new Error(`missing decisionId for current registry row ${registryId}`);
  const documentIdentity = archived ? `archived-registry:${registryId}` : `current-decision:${decisionId}`;
  const downloadUrl = archived
    ? `${REGISTRY_URL.replace('public.decisionRegistry', 'public.decisionRegistryDownload')}&registry=${encodeURIComponent(registryId)}&archived=true`
    : `${REGISTRY_URL.replace('public.decisionRegistry', 'public.decisionRegistryDownload')}&decision=${encodeURIComponent(decisionId)}&archived=false`;
  const normalized = {
    global_position: source.global_position,
    terminal_slice_position: source.terminal_slice_position,
    source_index: source.source_index,
    slice: source.slice,
    registry_id: registryId,
    row_identity: `registry:${registryId}`,
    document_identity: documentIdentity,
    decision_id: decisionId,
    archived,
    download_url: downloadUrl,
    release_date: String(raw?.releaseDate ?? '').trim(),
    filing_date: String(raw?.filingDate ?? '').trim(),
    program: String(raw?.program ?? '').trim(),
    disposition: String(raw?.disposition ?? '').trim(),
    issue_codes: String(raw?.issueCodes ?? '').trim(),
    responsible_agency: String(raw?.responsibleAgency ?? '').trim(),
    organizational_ar_name: String(raw?.orgArName ?? '').trim(),
    alj_name: String(raw?.aljName ?? '').trim(),
    language: String(raw?.language ?? '').trim(),
    shn_number: String(raw?.shnNumber ?? '').trim(),
    raw
  };
  normalized.row_sha256 = sha256(Buffer.from(stableStringify(normalized), 'utf8'));
  return normalized;
}

function documentComparable(row) {
  return {
    document_identity: row.document_identity,
    decision_id: row.decision_id,
    archived: row.archived,
    download_url: row.download_url,
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

function shardForDocument(documentIdentity, shardCount = SHARD_COUNT) {
  const digest = sha256(Buffer.from(documentIdentity, 'utf8'));
  return Number(BigInt(`0x${digest}`) % BigInt(shardCount));
}

function manifestFor(root, files) {
  const entries = [...new Set(files)]
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => rel(root, a).localeCompare(rel(root, b)))
    .map((file) => {
      const bytes = fs.readFileSync(file);
      return { path: rel(root, file), bytes: bytes.length, sha256: sha256(bytes) };
    });
  const combinedSha256 = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'));
  return { entries, combined_sha256: combinedSha256 };
}

function validateProofSummary(summary) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  fail(summary.schema_version === 'ssc-rd04-a06-registry-proof@1', 'proof schema version');
  fail(summary.issue === ISSUE, 'proof issue');
  fail(summary.parent_main === PARENT_MAIN, 'proof parent main');
  fail(summary.parent_release_sha256 === PARENT_RELEASE, 'proof parent release');
  fail(summary.query_contract?.date_interval === '2025-07-01/2026-06-30', 'proof date interval');
  fail(summary.query_contract?.program === 'CalFresh', 'proof program');
  fail(summary.query_contract?.empty_text_inputs_required === true, 'proof empty-text contract');
  fail(summary.query_contract?.parameter_order_material === false, 'proof parameter-order contract');
  fail(summary.source_cap?.threshold === 100 && summary.source_cap?.confirmed === true, 'proof cap');
  fail(summary.source_cap?.partition_requests === 423, 'proof partition count');
  fail(summary.source_cap?.terminal_slices === 212, 'proof terminal slice count');
  fail(summary.source_cap?.one_day_slices_still_capped === 0, 'proof one-day cap exhaustion');
  fail(summary.counts?.registry_rows === 12282, 'proof registry rows');
  fail(summary.counts?.unique_registry_row_identities === 12282, 'proof row identities');
  fail(summary.counts?.unique_download_documents === 11672, 'proof documents');
  fail(summary.counts?.shared_document_groups === 530, 'proof shared document groups');
  fail(summary.counts?.shared_document_excess_registry_rows === 610, 'proof shared row excess');
  fail(summary.counts?.maximum_registry_rows_per_document === 7, 'proof max multiplicity');
  fail(summary.counts?.duplicate_registry_row_identities === 0, 'proof duplicate identities');
  fail(summary.counts?.document_conflicts === 0, 'proof document conflicts');
  fail(summary.counts?.malformed_rows === 0, 'proof malformed rows');
  fail(summary.complete_mechanical_denominator === true, 'proof completeness');
  if (errors.length) throw new Error(`invalid A06 proof summary:\n${errors.join('\n')}`);
}

function prepare(proofDir, outDir, shardCount = SHARD_COUNT) {
  if (shardCount !== SHARD_COUNT) throw new Error(`A06 shard count is frozen at ${SHARD_COUNT}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
  const summary = readJson(path.join(proofDir, 'summary.json'));
  validateProofSummary(summary);
  const terminalSlices = readJson(path.join(proofDir, 'terminal-slices.json'));
  if (!Array.isArray(terminalSlices) || terminalSlices.length !== 212) throw new Error('terminal slice denominator mismatch');

  const rows = [];
  const registryIds = new Set();
  let globalPosition = 0;
  for (let slicePosition = 0; slicePosition < terminalSlices.length; slicePosition += 1) {
    const slice = terminalSlices[slicePosition];
    const responsePath = path.join(proofDir, 'requests', slice.id, 'response.bin');
    if (!fs.existsSync(responsePath)) throw new Error(`missing terminal response ${slice.id}`);
    const response = readJson(responsePath);
    if (!Array.isArray(response) || response.length !== slice.rows) throw new Error(`terminal response count mismatch ${slice.id}`);
    for (let sourceIndex = 0; sourceIndex < response.length; sourceIndex += 1) {
      globalPosition += 1;
      const row = normalizeRow(response[sourceIndex], {
        global_position: globalPosition,
        terminal_slice_position: slicePosition + 1,
        source_index: sourceIndex,
        slice: slice.id
      });
      if (row.program !== 'CalFresh') throw new Error(`non-CalFresh row ${row.registry_id}`);
      if (registryIds.has(row.registry_id)) throw new Error(`duplicate registryId ${row.registry_id}`);
      registryIds.add(row.registry_id);
      rows.push(row);
    }
  }
  if (rows.length !== 12282 || registryIds.size !== 12282) throw new Error('registry row reconstruction mismatch');

  const documentMap = new Map();
  const conflicts = [];
  for (const row of rows) {
    const comparable = documentComparable(row);
    const comparableSha = sha256(Buffer.from(stableStringify(comparable), 'utf8'));
    const prior = documentMap.get(row.document_identity);
    if (!prior) {
      documentMap.set(row.document_identity, {
        document_identity: row.document_identity,
        decision_id: row.decision_id,
        archived: row.archived,
        download_url: row.download_url,
        document_metadata_sha256: comparableSha,
        representative_metadata: comparable,
        registry_rows: [row]
      });
    } else {
      prior.registry_rows.push(row);
      if (prior.document_metadata_sha256 !== comparableSha || prior.download_url !== row.download_url) {
        conflicts.push({ document_identity: row.document_identity, registry_id: row.registry_id });
      }
    }
  }
  if (conflicts.length) throw new Error(`document metadata conflicts: ${JSON.stringify(conflicts.slice(0, 10))}`);
  const documents = [...documentMap.values()].sort((a, b) => a.document_identity.localeCompare(b.document_identity));
  if (documents.length !== 11672) throw new Error(`document count mismatch: ${documents.length}`);

  const shardRows = Array.from({ length: shardCount }, () => []);
  const registryIndex = [];
  for (const document of documents) {
    const shard = shardForDocument(document.document_identity, shardCount);
    const documentSha = sha256(Buffer.from(document.document_identity, 'utf8'));
    const registryRowsForDocument = document.registry_rows.sort((a, b) => Number(a.registry_id) - Number(b.registry_id));
    const entry = {
      document_identity: document.document_identity,
      document_identity_sha256: documentSha,
      decision_id: document.decision_id,
      archived: document.archived,
      download_url: document.download_url,
      document_metadata_sha256: document.document_metadata_sha256,
      representative_metadata: document.representative_metadata,
      registry_row_count: registryRowsForDocument.length,
      registry_ids: registryRowsForDocument.map((row) => row.registry_id),
      registry_rows: registryRowsForDocument
    };
    shardRows[shard].push(entry);
    for (const row of registryRowsForDocument) {
      registryIndex.push({
        global_position: row.global_position,
        registry_id: row.registry_id,
        row_identity: row.row_identity,
        row_sha256: row.row_sha256,
        document_identity: document.document_identity,
        document_identity_sha256: documentSha,
        shard: String(shard).padStart(2, '0'),
        release_date: row.release_date,
        disposition: row.disposition,
        responsible_agency: row.responsible_agency,
        language: row.language,
        issue_codes: row.issue_codes
      });
    }
  }
  registryIndex.sort((a, b) => a.global_position - b.global_position);

  const proofSummaryPath = path.join(outDir, 'proof-summary.json');
  const terminalSlicesPath = path.join(outDir, 'terminal-slices.json');
  const registryIndexPath = path.join(outDir, 'registry-index.json');
  writeJson(proofSummaryPath, summary);
  writeJson(terminalSlicesPath, terminalSlices);
  writeJson(registryIndexPath, {
    schema_version: 'ssc-rd04-a06-registry-index@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    rows: registryIndex
  });

  const issueCodeRows = rows.flatMap((row) => row.issue_codes.split(',').map((value) => value.trim()).filter(Boolean).map((code) => ({ code })));
  const distributions = {
    schema_version: 'ssc-rd04-a06-registry-distributions@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    registry_rows: rows.length,
    disposition: countBy(rows, (row) => row.disposition),
    responsible_agency: countBy(rows, (row) => row.responsible_agency),
    language: countBy(rows, (row) => row.language),
    issue_code: countBy(issueCodeRows, (row) => row.code)
  };
  const distributionsPath = path.join(outDir, 'distributions.json');
  writeJson(distributionsPath, distributions);

  const shardSummaries = [];
  for (let shard = 0; shard < shardCount; shard += 1) {
    const shardId = String(shard).padStart(2, '0');
    const docs = shardRows[shard].sort((a, b) => a.document_identity.localeCompare(b.document_identity));
    const rowCount = docs.reduce((sum, document) => sum + document.registry_row_count, 0);
    const file = path.join(outDir, 'shards', `${shardId}.json`);
    const payload = {
      schema_version: 'ssc-rd04-a06-document-shard-plan@1',
      execution_id: EXECUTION,
      issue: ISSUE,
      shard: shardId,
      shard_index: shard,
      shard_count: shardCount,
      assignment: 'sha256_document_identity_mod_64',
      counts: { documents: docs.length, registry_rows: rowCount },
      documents: docs
    };
    writeJson(file, payload);
    const bytes = fs.readFileSync(file);
    shardSummaries.push({ shard: shardId, documents: docs.length, registry_rows: rowCount, path: `shards/${shardId}.json`, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const totalDocs = shardSummaries.reduce((sum, row) => sum + row.documents, 0);
  const totalRegistryRows = shardSummaries.reduce((sum, row) => sum + row.registry_rows, 0);
  if (totalDocs !== 11672 || totalRegistryRows !== 12282) throw new Error('shard coverage mismatch');
  const plan = {
    schema_version: 'ssc-rd04-a06-full-corpus-plan@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    parent: { main_commit: PARENT_MAIN, a05_release_sha256: PARENT_RELEASE },
    proof: {
      workflow_run: 30729860202,
      artifact_id: PROOF_ARTIFACT_ID,
      artifact_zip_sha256: PROOF_ARTIFACT_SHA256,
      artifact_files: 2137,
      uncompressed_bytes: 21991618
    },
    frozen_interval: '2025-07-01/2026-06-30',
    query_contract: summary.query_contract,
    source_cap: summary.source_cap,
    identities: {
      registry_row_identity: 'registryId',
      current_document_identity: 'decisionId',
      archived_document_identity: 'registryId'
    },
    shard_count: shardCount,
    shard_assignment: 'sha256(document_identity) interpreted as unsigned integer mod 64',
    content_neutral_assignment: true,
    counts: {
      registry_rows: 12282,
      unique_documents: 11672,
      shared_document_groups: 530,
      shared_document_excess_registry_rows: 610,
      maximum_registry_rows_per_document: 7,
      a05_decisions_released: 10582,
      registry_rows_minus_a05_aggregate: 1700,
      download_documents_minus_a05_aggregate: 1090
    },
    release_custody: {
      tag: RELEASE_TAG,
      must_remain_draft: true,
      proof_asset: 'ssc-rd04-a06-registry-identity-proof.zip',
      prepared_asset: 'ssc-rd04-a06-prepared-denominator.tar.zst',
      pdf_shard_asset_pattern: 'ssc-rd04-a06-pdf-shard-XX.tar.zst'
    },
    shards: shardSummaries,
    authority: {
      complete_fy_administrative_universe: false,
      case_level_join: false,
      implementation_or_restoration: false,
      remedy_timeliness: false,
      prevalence: false,
      racial_order: false,
      coordination: false,
      common_purpose: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  const planPath = path.join(outDir, 'plan.json');
  writeJson(planPath, plan);
  const preparedManifest = manifestFor(outDir, walkFiles(outDir).filter((file) => path.basename(file) !== 'prepared-manifest.json'));
  writeJson(path.join(outDir, 'prepared-manifest.json'), {
    schema_version: 'ssc-rd04-a06-prepared-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    ...preparedManifest
  });

  const pilotDocs = documents.slice(0, 8).map((document) => ({
    document_identity: document.document_identity,
    decision_id: document.decision_id,
    archived: document.archived,
    download_url: document.download_url,
    registry_ids: document.registry_rows.map((row) => row.registry_id),
    representative_metadata: document.representative_metadata
  }));
  writeJson(path.join(outDir, 'pilot.json'), {
    schema_version: 'ssc-rd04-a06-pilot@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    selected_before_pdf_content: true,
    selection: 'first_eight_document_identities_in_lexical_order',
    documents: pilotDocs
  });

  console.log(JSON.stringify({ registry_rows: rows.length, documents: documents.length, shards: shardCount, prepared_manifest_sha256: preparedManifest.combined_sha256 }, null, 2));
}

function runCurl(args, timeoutMs = 240_000) {
  const result = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16, timeout: timeoutMs });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function bootstrapSession(outDir) {
  ensureDir(outDir);
  const cookiePath = path.join(outDir, 'cookies.txt');
  const headersPath = path.join(outDir, 'registry-page.headers.txt');
  const bodyPath = path.join(outDir, 'registry-page.html');
  const result = runCurl([
    '--compressed', '--location', '--silent', '--show-error',
    '--max-time', '180', '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--cookie-jar', cookiePath,
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY_URL
  ]);
  const [statusText, finalUrl, contentType] = result.stdout.trim().split(/\n/);
  const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
  const receipt = {
    http_status: Number(statusText || 0),
    final_url: finalUrl || null,
    content_type: contentType || null,
    bytes: body.length,
    sha256: sha256(body),
    curl_status: result.status,
    curl_error: result.stderr.trim() || null
  };
  writeJson(path.join(outDir, 'registry-page.receipt.json'), receipt);
  if (result.status !== 0 || receipt.http_status !== 200 || body.length === 0) throw new Error(`registry bootstrap failed: ${JSON.stringify(receipt)}`);
  return cookiePath;
}

function downloadAttempt(document, attempt, directory, cookiePath) {
  const prefix = `attempt-${attempt}`;
  const bodyPath = path.join(directory, `${prefix}.body`);
  const headersPath = path.join(directory, `${prefix}.headers.txt`);
  const startedAt = new Date().toISOString();
  const result = runCurl([
    '--compressed', '--location', '--silent', '--show-error',
    '--max-time', '180', '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--header', 'Accept: application/pdf,application/octet-stream;q=0.9,*/*;q=0.5',
    '--referer', REGISTRY_URL,
    '--cookie', cookiePath,
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n',
    document.download_url
  ]);
  const [statusText, finalUrl, contentType, sizeText] = result.stdout.trim().split(/\n/);
  const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
  const headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath) : Buffer.alloc(0);
  const pdfMagic = body.subarray(0, 5).toString('ascii') === '%PDF-';
  return {
    attempt,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    requested_url: document.download_url,
    final_url: finalUrl || null,
    http_status: Number(statusText || 0),
    content_type: contentType || null,
    reported_download_bytes: Number(sizeText || 0),
    body_path: path.basename(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    headers_path: path.basename(headersPath),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    curl_status: result.status,
    curl_error: result.stderr.trim() || null,
    pdf_magic: pdfMagic,
    usable_pdf: result.status === 0 && Number(statusText || 0) === 200 && body.length > 0 && pdfMagic
  };
}

function parsePdfInfo(file) {
  const result = spawnSync('pdfinfo', [file], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4, timeout: 60_000 });
  if (result.status !== 0) return { pages: null, error: (result.stderr || result.stdout || '').trim() || `pdfinfo_exit_${result.status}` };
  const match = result.stdout.match(/^Pages:\s+(\d+)\s*$/m);
  return { pages: match ? Number(match[1]) : null, error: null };
}

const MARKERS = [
  ['restore', /\brestor(?:e|ed|ation|ing)\b/i],
  ['reimburse', /\breimburs(?:e|ed|ement|ing)\b/i],
  ['benefit', /\bbenefit(?:s)?\b/i],
  ['set_aside', /\bset\s+aside\b/i],
  ['remand', /\bremand(?:ed)?\b/i],
  ['comply', /\bcompl(?:y|ied|iance)\b/i],
  ['order', /\border(?:ed)?\b/i]
];

function lexicalMarkers(text) {
  const rows = [];
  const lines = String(text).split(/\r?\n/);
  for (let index = 0; index < lines.length && rows.length < 100; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const [marker, pattern] of MARKERS) {
      if (!pattern.test(trimmed)) continue;
      rows.push({ marker, line_number: index + 1, line_sha256: sha256(Buffer.from(line, 'utf8')), line_bytes: Buffer.byteLength(line, 'utf8') });
      if (rows.length >= 100) break;
    }
  }
  return rows;
}

function acquireDocuments(documents, outDir, label) {
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
  const sessionDir = path.join(outDir, 'session');
  const cookiePath = bootstrapSession(sessionDir);
  const documentResults = [];
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    const directory = path.join(outDir, 'documents', safeId(document.document_identity));
    ensureDir(directory);
    const attempts = [];
    let selected = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const receipt = downloadAttempt(document, attempt, directory, cookiePath);
      attempts.push(receipt);
      if (receipt.usable_pdf) { selected = receipt; break; }
    }
    let terminalState = 'source_unavailable_after_bounded_retry';
    let textPath = null;
    let textBytes = 0;
    let textSha = null;
    let textError = null;
    let pages = null;
    let pdfInfoError = null;
    let markers = [];
    if (selected) {
      const selectedBody = path.join(directory, selected.body_path);
      const textFile = path.join(directory, 'decision.txt');
      const textResult = spawnSync('pdftotext', ['-layout', selectedBody, textFile], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 8, timeout: 120_000 });
      const info = parsePdfInfo(selectedBody);
      pages = info.pages;
      pdfInfoError = info.error;
      if (textResult.status === 0 && fs.existsSync(textFile)) {
        const text = fs.readFileSync(textFile);
        textPath = rel(directory, textFile);
        textBytes = text.length;
        textSha = sha256(text);
        markers = lexicalMarkers(text.toString('utf8'));
        terminalState = 'exact_pdf_and_text_recovered';
      } else {
        textError = (textResult.stderr || textResult.stdout || '').trim() || `pdftotext_exit_${textResult.status}`;
        terminalState = 'exact_pdf_unparseable_text_preserved';
      }
    } else if (attempts.some((row) => row.http_status === 200 && row.body_bytes > 0)) {
      terminalState = 'non_pdf_response_after_bounded_retry';
    }
    const dispositionSet = [...new Set((document.registry_rows ?? []).map((row) => row.disposition))].sort();
    const agencySet = [...new Set((document.registry_rows ?? []).map((row) => row.responsible_agency))].sort();
    const result = {
      document_identity: document.document_identity,
      document_identity_sha256: document.document_identity_sha256 ?? sha256(Buffer.from(document.document_identity, 'utf8')),
      decision_id: document.decision_id,
      archived: document.archived,
      download_url: document.download_url,
      registry_ids: [...document.registry_ids],
      registry_row_count: document.registry_row_count ?? document.registry_ids.length,
      registry_dispositions: dispositionSet,
      responsible_agencies: agencySet,
      attempts,
      selected_attempt: selected?.attempt ?? null,
      selected_pdf_path: selected ? rel(directory, path.join(directory, selected.body_path)) : null,
      selected_pdf_bytes: selected?.body_bytes ?? 0,
      selected_pdf_sha256: selected?.body_sha256 ?? null,
      extracted_text_path: textPath,
      extracted_text_bytes: textBytes,
      extracted_text_sha256: textSha,
      extracted_text_error: textError,
      pdf_pages: pages,
      pdf_info_error: pdfInfoError,
      lexical_markers: markers,
      terminal_state: terminalState,
      registry_disposition_is_case_truth: false,
      decision_is_precedential_authority: false,
      order_is_observed_implementation: false,
      compliance_state: 'no_separate_public_compliance_receipt',
      restoration_amount: null,
      restoration_date: null,
      remedy_timeliness: null
    };
    writeJson(path.join(directory, 'fetch.json'), result);
    documentResults.push(result);
    if ((index + 1) % 25 === 0 || index + 1 === documents.length) console.log(`${label}: ${index + 1}/${documents.length}`);
  }
  fs.rmSync(cookiePath, { force: true });
  return documentResults;
}

function createArchive(outDir, shardId, manifest) {
  const contentFiles = walkFiles(outDir).filter((file) => !file.endsWith('.tar.zst') && !file.endsWith('.sha256'));
  const contentManifest = manifestFor(outDir, contentFiles.filter((file) => path.basename(file) !== 'archive-content-manifest.json'));
  writeJson(path.join(outDir, 'archive-content-manifest.json'), {
    schema_version: 'ssc-rd04-a06-archive-content-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: shardId,
    ...contentManifest
  });
  const archiveName = `ssc-rd04-a06-pdf-shard-${shardId}.tar.zst`;
  const archivePath = path.join(path.dirname(outDir), archiveName);
  const result = spawnSync('tar', ['--zstd', '-cf', archivePath, '-C', outDir, '.'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 8, timeout: 1_800_000 });
  if (result.status !== 0) throw new Error(`archive failed: ${(result.stderr || result.stdout || '').trim()}`);
  const archiveBytes = fs.readFileSync(archivePath);
  const archiveSha = sha256(archiveBytes);
  const shaPath = `${archivePath}.sha256`;
  fs.writeFileSync(shaPath, `${archiveSha}  ${archiveName}\n`);
  manifest.archive = { name: archiveName, bytes: archiveBytes.length, sha256: archiveSha, sha256_asset: `${archiveName}.sha256` };
  writeJson(path.join(outDir, 'shard-manifest.json'), manifest);
  return { archivePath, shaPath, archiveSha, archiveBytes: archiveBytes.length };
}

function acquire(preparedDir, shardId, outParent, { limit = null, pilot = false } = {}) {
  const plan = readJson(path.join(preparedDir, 'plan.json'));
  if (plan.shard_count !== SHARD_COUNT) throw new Error('prepared shard count mismatch');
  const shard = pilot
    ? { shard: 'pilot', documents: readJson(path.join(preparedDir, 'pilot.json')).documents, counts: { documents: 8, registry_rows: null } }
    : readJson(path.join(preparedDir, 'shards', `${shardId}.json`));
  let documents = shard.documents;
  if (limit !== null) documents = documents.slice(0, limit);
  const outDir = path.join(outParent, pilot ? 'pilot' : `shard-${shardId}`);
  const results = acquireDocuments(documents, outDir, pilot ? 'pilot' : `shard ${shardId}`);
  const counts = countBy(results, (row) => row.terminal_state);
  const exactPdfs = results.filter((row) => ['exact_pdf_and_text_recovered', 'exact_pdf_unparseable_text_preserved'].includes(row.terminal_state)).length;
  const registryRows = results.reduce((sum, row) => sum + row.registry_row_count, 0);
  const manifest = {
    schema_version: 'ssc-rd04-a06-acquisition-shard-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: pilot ? 'pilot' : shardId,
    shard_count: SHARD_COUNT,
    pilot,
    plan_sha256: sha256(fs.readFileSync(path.join(preparedDir, 'plan.json'))),
    counts: {
      documents: results.length,
      registry_rows: registryRows,
      exact_pdf_documents: exactPdfs,
      separate_public_compliance_receipts: 0,
      case_level_implementation_joins: 0,
      terminal_states: counts
    },
    documents: results,
    authority: {
      complete_fy_administrative_universe: false,
      case_level_join: false,
      implementation_or_restoration: false,
      remedy_timeliness: false,
      prevalence: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  writeJson(path.join(outDir, 'shard-manifest.json'), manifest);
  if (pilot) {
    if (exactPdfs === 0) throw new Error('pilot recovered zero exact PDFs; full matrix refused');
    console.log(JSON.stringify({ pilot_documents: results.length, exact_pdfs: exactPdfs, terminal_states: counts }, null, 2));
    return;
  }
  const archive = createArchive(outDir, shardId, manifest);
  writeJson(path.join(outDir, 'upload-receipt.json'), {
    schema_version: 'ssc-rd04-a06-shard-upload-receipt@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: shardId,
    release_tag: RELEASE_TAG,
    draft_release_required: true,
    archive: manifest.archive
  });
  console.log(JSON.stringify({ shard: shardId, documents: results.length, registry_rows: registryRows, exact_pdfs: exactPdfs, terminal_states: counts, archive }, null, 2));
}

function loadShardManifests(manifestsDir) {
  const files = walkFiles(manifestsDir).filter((file) => path.basename(file) === 'shard-manifest.json');
  return files.map(readJson).sort((a, b) => a.shard.localeCompare(b.shard));
}

function assetMap(releaseJson) {
  const map = new Map();
  for (const asset of releaseJson.assets ?? []) map.set(asset.name, asset);
  return map;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function buildReport(core) {
  const dispositionRows = Object.entries(core.registry_distributions.disposition)
    .map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`).join('');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SSC RD-04 A06 CalFresh Decision Registry corpus</title><style>body{font-family:system-ui,sans-serif;max-width:1000px;margin:2rem auto;padding:0 1rem;line-height:1.5}pre,code{background:#f4f4f4}pre{padding:1rem;overflow:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.45rem;text-align:left}.boundary{border-left:5px solid #555;padding-left:1rem}</style></head><body><h1>CalFresh Decision Registry corpus</h1><p><strong>Terminal receipt:</strong> <code>${escapeHtml(core.current_result.terminal_state)}</code></p><pre>${escapeHtml(JSON.stringify(core.counts, null, 2))}</pre><h2>Registry dispositions</h2><table><thead><tr><th>Disposition</th><th>Registry rows</th></tr></thead><tbody>${dispositionRows}</tbody></table><h2>Bounded interpretation</h2><div class="boundary"><p>The full mechanical FY 2025–26 registry denominator contains 12,282 registry rows and 11,672 unique current decision documents. Those counts are distinct from the separately published A05 aggregate of 10,582 decisions released.</p><p>Registry disposition and decision text do not prove compliance, benefit issuance, restoration amount, restoration date, remedy timeliness, precedent, program completeness, or case-level material recovery.</p><p>Exact PDF custody is retained in a draft GitHub release. The release remains unpublished and creates no graph, publication, adoption, prevalence, racial-order, coordination, or common-purpose effect.</p></div><h2>Authority</h2><pre>${escapeHtml(JSON.stringify(core.authority, null, 2))}</pre></body></html>\n`;
}

function reconcile(preparedDir, manifestsDir, releaseJsonPath, releaseHashesDir, repoRoot) {
  const plan = readJson(path.join(preparedDir, 'plan.json'));
  const distributions = readJson(path.join(preparedDir, 'distributions.json'));
  const registryIndex = readJson(path.join(preparedDir, 'registry-index.json'));
  const manifests = loadShardManifests(manifestsDir);
  if (manifests.length !== SHARD_COUNT) throw new Error(`expected ${SHARD_COUNT} shard manifests, observed ${manifests.length}`);
  const expectedShardIds = Array.from({ length: SHARD_COUNT }, (_, index) => String(index).padStart(2, '0'));
  if (stableStringify(manifests.map((row) => row.shard)) !== stableStringify(expectedShardIds)) throw new Error('shard manifest identity mismatch');

  const documentIds = new Set();
  const registryIds = new Set();
  const duplicates = [];
  const missingDocs = [];
  const terminalCounts = new Map();
  let exactPdfDocuments = 0;
  let exactTextDocuments = 0;
  let archiveBytes = 0;
  for (const manifest of manifests) {
    if (manifest.execution_id !== EXECUTION || manifest.issue !== ISSUE || manifest.pilot !== false) throw new Error(`invalid shard manifest ${manifest.shard}`);
    for (const [state, count] of Object.entries(manifest.counts.terminal_states ?? {})) terminalCounts.set(state, (terminalCounts.get(state) ?? 0) + count);
    exactPdfDocuments += manifest.documents.filter((row) => ['exact_pdf_and_text_recovered', 'exact_pdf_unparseable_text_preserved'].includes(row.terminal_state)).length;
    exactTextDocuments += manifest.documents.filter((row) => row.terminal_state === 'exact_pdf_and_text_recovered').length;
    archiveBytes += manifest.archive?.bytes ?? 0;
    for (const document of manifest.documents) {
      if (documentIds.has(document.document_identity)) duplicates.push(document.document_identity);
      documentIds.add(document.document_identity);
      for (const registryId of document.registry_ids) {
        if (registryIds.has(registryId)) throw new Error(`registry row appears in multiple documents: ${registryId}`);
        registryIds.add(registryId);
      }
      if (!['exact_pdf_and_text_recovered', 'exact_pdf_unparseable_text_preserved'].includes(document.terminal_state)) missingDocs.push({
        shard: manifest.shard,
        document_identity: document.document_identity,
        registry_ids: document.registry_ids,
        terminal_state: document.terminal_state,
        absence_semantics: 'source_or_transport_state_not_record_absence'
      });
    }
  }
  if (duplicates.length) throw new Error(`duplicate document identities: ${duplicates.slice(0, 10).join(', ')}`);
  if (documentIds.size !== plan.counts.unique_documents) throw new Error(`document coverage mismatch ${documentIds.size}`);
  if (registryIds.size !== plan.counts.registry_rows) throw new Error(`registry coverage mismatch ${registryIds.size}`);

  const release = readJson(releaseJsonPath);
  if (release.tag_name !== RELEASE_TAG && release.tagName !== RELEASE_TAG) throw new Error('release tag mismatch');
  if (release.draft !== true && release.isDraft !== true) throw new Error('A06 release must remain draft');
  const assets = assetMap(release);
  const expectedAssets = [
    'ssc-rd04-a06-registry-identity-proof.zip',
    'ssc-rd04-a06-registry-identity-proof.zip.sha256',
    'ssc-rd04-a06-prepared-denominator.tar.zst',
    'ssc-rd04-a06-prepared-denominator.tar.zst.sha256'
  ];
  for (const shardId of expectedShardIds) {
    expectedAssets.push(`ssc-rd04-a06-pdf-shard-${shardId}.tar.zst`);
    expectedAssets.push(`ssc-rd04-a06-pdf-shard-${shardId}.tar.zst.sha256`);
  }
  for (const name of expectedAssets) if (!assets.has(name)) throw new Error(`missing draft-release asset ${name}`);
  const unexpectedAssets = [...assets.keys()].filter((name) => !expectedAssets.includes(name));
  if (unexpectedAssets.length) throw new Error(`unexpected draft-release assets: ${unexpectedAssets.join(', ')}`);

  const hashFiles = walkFiles(releaseHashesDir).filter((file) => file.endsWith('.sha256'));
  const hashMap = new Map();
  for (const file of hashFiles) {
    const text = fs.readFileSync(file, 'utf8').trim();
    const match = text.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
    if (!match) throw new Error(`malformed release hash file ${file}`);
    hashMap.set(path.basename(match[2]), match[1]);
  }
  for (const manifest of manifests) {
    if (hashMap.get(manifest.archive.name) !== manifest.archive.sha256) throw new Error(`release archive hash mismatch ${manifest.shard}`);
  }
  if (hashMap.get('ssc-rd04-a06-registry-identity-proof.zip') !== PROOF_ARTIFACT_SHA256) throw new Error('proof release asset hash mismatch');

  const intakeDir = path.join(repoRoot, INTAKE_REL);
  fs.rmSync(intakeDir, { recursive: true, force: true });
  ensureDir(intakeDir);
  for (const file of ['proof-summary.json', 'terminal-slices.json', 'registry-index.json', 'distributions.json', 'plan.json', 'prepared-manifest.json']) {
    fs.copyFileSync(path.join(preparedDir, file), path.join(intakeDir, file));
  }
  const denominatorDir = path.join(intakeDir, 'denominator-shards');
  const acquisitionDir = path.join(intakeDir, 'acquisition-shards');
  ensureDir(denominatorDir);
  ensureDir(acquisitionDir);
  for (const shardId of expectedShardIds) {
    fs.copyFileSync(path.join(preparedDir, 'shards', `${shardId}.json`), path.join(denominatorDir, `${shardId}.json`));
    writeJson(path.join(acquisitionDir, `${shardId}.json`), manifests.find((row) => row.shard === shardId));
  }

  const assetRows = [...assets.values()].filter((asset) => expectedAssets.includes(asset.name)).sort((a, b) => a.name.localeCompare(b.name)).map((asset) => ({
    id: asset.id,
    name: asset.name,
    size: asset.size,
    content_type: asset.content_type ?? asset.contentType ?? null,
    browser_download_url: asset.browser_download_url ?? asset.url ?? null,
    sha256: hashMap.get(asset.name) ?? null
  }));
  const releaseLedger = {
    schema_version: 'ssc-rd04-a06-draft-release-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    tag: RELEASE_TAG,
    release_id: release.id,
    draft: true,
    published_at: null,
    publication_effect: 'none',
    expected_assets: expectedAssets.length,
    observed_assets: assetRows.length,
    total_pdf_archive_bytes: archiveBytes,
    assets: assetRows
  };
  writeJson(path.join(intakeDir, 'release-assets.json'), releaseLedger);
  writeJson(path.join(intakeDir, 'missing-ledger.json'), {
    schema_version: 'ssc-rd04-a06-missing-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    missing_or_non_pdf_documents: missingDocs.length,
    rows: missingDocs
  });
  writeJson(path.join(intakeDir, 'compliance-ledger.json'), {
    schema_version: 'ssc-rd04-a06-compliance-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    documents: plan.counts.unique_documents,
    separate_public_compliance_receipts: 0,
    case_level_implementation_joins: 0,
    restoration_amounts_observed: 0,
    restoration_dates_observed: 0,
    remedy_timeliness_observed: 0,
    shard_paths: expectedShardIds.map((id) => `acquisition-shards/${id}.json`),
    order_is_implementation: false,
    absence_of_compliance_receipt_is_noncompliance: false
  });

  const terminalState = missingDocs.length === 0
    ? 'bounded_registry_denominator_orders_without_compliance_join'
    : 'requires_additional_acquisition';
  const core = {
    schema_version: 'ssc-rd04-a06-full-corpus-core@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    as_of: '2026-08-02',
    title: 'Full FY 2025–26 CalFresh Decision Registry denominator and decision-document custody',
    parent: { main_commit: PARENT_MAIN, a05_release_sha256: PARENT_RELEASE },
    proof: plan.proof,
    query_contract: plan.query_contract,
    source_cap: plan.source_cap,
    identities: plan.identities,
    sharding: {
      shard_count: SHARD_COUNT,
      assignment: plan.shard_assignment,
      content_neutral_assignment: true,
      all_shards_terminal: true
    },
    counts: {
      registry_rows: registryIds.size,
      unique_documents: documentIds.size,
      shared_document_groups: plan.counts.shared_document_groups,
      shared_document_excess_registry_rows: plan.counts.shared_document_excess_registry_rows,
      maximum_registry_rows_per_document: plan.counts.maximum_registry_rows_per_document,
      exact_pdf_documents: exactPdfDocuments,
      exact_text_documents: exactTextDocuments,
      missing_or_non_pdf_documents: missingDocs.length,
      terminal_document_receipts: documentIds.size,
      draft_release_assets: assetRows.length,
      draft_release_pdf_archive_bytes: archiveBytes,
      a05_decisions_released: plan.counts.a05_decisions_released,
      registry_rows_minus_a05_aggregate: plan.counts.registry_rows_minus_a05_aggregate,
      download_documents_minus_a05_aggregate: plan.counts.download_documents_minus_a05_aggregate,
      separate_public_compliance_receipts: 0,
      case_level_implementation_joins: 0,
      complete_restorations_observed: 0,
      remedy_timeliness_observed: 0,
      residual_classes_closed: 0,
      reviewed_disposition_changes: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0,
      adoption_effects: 0
    },
    registry_distributions: distributions,
    document_terminal_states: Object.fromEntries([...terminalCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    current_result: {
      terminal_state: terminalState,
      complete_mechanical_registry_denominator: true,
      complete_fy_administrative_universe: false,
      complete_row_to_document_map: true,
      all_unique_documents_terminal: true,
      all_unique_documents_recovered_as_pdf: missingDocs.length === 0,
      decision_text_is_case_truth: false,
      decision_is_precedential_authority: false,
      registry_disposition_is_implementation: false,
      separate_compliance_join_supported: false,
      complete_restoration_supported: false,
      remedy_timeliness_supported: false,
      prevalence_supported: false,
      residual_class_closed: false,
      draft_release_is_publication: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      acquisition_id: 'SSC-RD04-SNAP-A07',
      status: 'authorized_nonblocking_public_compliance_receipt_acquisition',
      unit: 'search separately for public county or state implementation, issuance, restoration amount, and restoration timing receipts tied to predeclared A06 registry rows without contacting claimants or agencies',
      outside_human_dependency: false,
      project_blocking: false
    },
    authority: plan.authority,
    boundaries: {
      registry_rows_equal_a05_decisions_released: false,
      unique_documents_equal_a05_decisions_released: false,
      mechanical_registry_denominator_is_complete_administrative_universe: false,
      shared_document_identity_collapses_registry_rows: false,
      registry_disposition_proves_case_facts: false,
      grant_partial_grant_or_stipulation_proves_implementation: false,
      order_to_restore_proves_restoration: false,
      decision_text_proves_compliance: false,
      absence_of_public_compliance_receipt_proves_noncompliance: false,
      registry_distribution_is_population_prevalence: false,
      agency_count_is_agency_quality: false,
      public_decision_is_precedent: false,
      draft_release_is_publication: false,
      administrative_reversal_is_racial_hierarchy_or_common_purpose: false
    }
  };
  writeJson(path.join(intakeDir, 'core.json'), core);

  const buildDir = path.join(repoRoot, BUILD_REL);
  const reportDir = path.join(repoRoot, REPORT_REL);
  ensureDir(buildDir);
  ensureDir(reportDir);
  writeJson(path.join(buildDir, 'data.json'), { core, release_assets: releaseLedger, missing: { count: missingDocs.length }, compliance: { separate_public_receipts: 0 } });
  writeJson(path.join(reportDir, 'data.json'), { core, release_assets: releaseLedger, missing: { count: missingDocs.length }, compliance: { separate_public_receipts: 0 } });
  fs.writeFileSync(path.join(reportDir, 'index.html'), buildReport(core));

  const sourceFiles = [
    path.join(repoRoot, '.github', 'workflows', 'status-sovereignty-rd04-a06-full-corpus.yml'),
    path.join(repoRoot, 'tools', 'ssc-rd04-a06-full-corpus.mjs'),
    path.join(repoRoot, 'test', 'status-sovereignty-rd04-a06-full-corpus.test.js'),
    path.join(repoRoot, 'schemas', 'status-sovereignty-rd04-a06-full-corpus.schema.json'),
    path.join(repoRoot, 'docs', 'milestones', 'ssc-rd04-a06-full-corpus.md')
  ];
  const productFiles = [
    ...walkFiles(intakeDir),
    ...walkFiles(buildDir),
    ...walkFiles(reportDir)
  ];
  const releaseManifest = manifestFor(repoRoot, [...sourceFiles, ...productFiles]);
  const manifestObject = {
    schema_version: 'ssc-rd04-a06-full-corpus-release-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    as_of: '2026-08-02',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    ...releaseManifest,
    boundaries: {
      exact_bytes_prove_case_truth: false,
      draft_release_proves_publication: false,
      decision_proves_implementation: false,
      manifest_authorizes_graph_effect: false,
      graph_effect: 'none'
    }
  };
  writeJson(path.join(repoRoot, PROJECT_MANIFEST_REL), manifestObject);
  writeJson(path.join(buildDir, 'manifest.json'), manifestObject);
  console.log(JSON.stringify({ terminal_state: terminalState, registry_rows: registryIds.size, documents: documentIds.size, exact_pdf_documents: exactPdfDocuments, missing_documents: missingDocs.length, release_sha256: releaseManifest.combined_sha256 }, null, 2));
}

export function validatePermanent(repoRoot = DEFAULT_ROOT, { checkFiles = true } = {}) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  const intakeDir = path.join(repoRoot, INTAKE_REL);
  const corePath = path.join(intakeDir, 'core.json');
  const planPath = path.join(intakeDir, 'plan.json');
  const releaseAssetsPath = path.join(intakeDir, 'release-assets.json');
  const compliancePath = path.join(intakeDir, 'compliance-ledger.json');
  const missingPath = path.join(intakeDir, 'missing-ledger.json');
  const manifestPath = path.join(repoRoot, PROJECT_MANIFEST_REL);
  const schemaPath = path.join(repoRoot, 'schemas', 'status-sovereignty-rd04-a06-full-corpus.schema.json');
  for (const file of [corePath, planPath, releaseAssetsPath, compliancePath, missingPath, manifestPath, schemaPath]) fail(fs.existsSync(file), `required file ${rel(repoRoot, file)}`);
  if (errors.length) return errors;
  const core = readJson(corePath);
  const plan = readJson(planPath);
  const releaseAssets = readJson(releaseAssetsPath);
  const compliance = readJson(compliancePath);
  const missing = readJson(missingPath);
  const manifest = readJson(manifestPath);
  const schema = readJson(schemaPath);

  fail(core.schema_version === 'ssc-rd04-a06-full-corpus-core@1', 'core schema version');
  fail(core.execution_id === EXECUTION && core.issue === ISSUE, 'core identity');
  fail(core.parent?.main_commit === PARENT_MAIN && core.parent?.a05_release_sha256 === PARENT_RELEASE, 'parent custody');
  fail(core.counts?.registry_rows === 12282, 'registry row count');
  fail(core.counts?.unique_documents === 11672, 'document count');
  fail(core.counts?.shared_document_groups === 530, 'shared document groups');
  fail(core.counts?.shared_document_excess_registry_rows === 610, 'shared document excess');
  fail(core.counts?.maximum_registry_rows_per_document === 7, 'maximum multiplicity');
  fail(core.counts?.terminal_document_receipts === 11672, 'terminal document receipts');
  fail(core.counts?.exact_pdf_documents + core.counts?.missing_or_non_pdf_documents === 11672, 'document terminal arithmetic');
  fail(core.counts?.separate_public_compliance_receipts === 0, 'compliance receipt count');
  fail(core.counts?.case_level_implementation_joins === 0, 'case-level join count');
  fail(core.counts?.complete_restorations_observed === 0, 'complete restoration count');
  fail(core.counts?.remedy_timeliness_observed === 0, 'remedy timeliness count');
  fail(core.counts?.residual_classes_closed === 0 && core.counts?.reviewed_disposition_changes === 0, 'authority closure counts');
  fail(core.counts?.external_contacts === 0 && core.counts?.external_reviews === 0, 'outside-human counts');
  fail(core.counts?.graph_effects === 0 && core.counts?.publication_effects === 0 && core.counts?.adoption_effects === 0, 'effect counts');
  fail(core.counts?.a05_decisions_released === 10582, 'A05 aggregate custody');
  fail(core.counts?.registry_rows_minus_a05_aggregate === 1700, 'registry/A05 delta');
  fail(core.counts?.download_documents_minus_a05_aggregate === 1090, 'document/A05 delta');
  fail(core.sharding?.shard_count === SHARD_COUNT && core.sharding?.content_neutral_assignment === true && core.sharding?.all_shards_terminal === true, 'sharding contract');
  fail(core.current_result?.complete_mechanical_registry_denominator === true, 'mechanical denominator complete');
  fail(core.current_result?.complete_fy_administrative_universe === false, 'administrative-universe boundary');
  fail(core.current_result?.complete_row_to_document_map === true, 'row-document map');
  fail(core.current_result?.all_unique_documents_terminal === true, 'document terminal state');
  fail(core.current_result?.decision_text_is_case_truth === false, 'case-truth boundary');
  fail(core.current_result?.decision_is_precedential_authority === false, 'precedent boundary');
  fail(core.current_result?.registry_disposition_is_implementation === false, 'disposition implementation boundary');
  fail(core.current_result?.separate_compliance_join_supported === false, 'compliance boundary');
  fail(core.current_result?.complete_restoration_supported === false, 'restoration boundary');
  fail(core.current_result?.remedy_timeliness_supported === false, 'timeliness boundary');
  fail(core.current_result?.prevalence_supported === false, 'prevalence boundary');
  fail(core.current_result?.residual_class_closed === false, 'residual closure boundary');
  fail(core.current_result?.draft_release_is_publication === false, 'draft release boundary');
  fail(core.current_result?.graph_effect === 'none' && core.current_result?.publication_effect === 'none' && core.current_result?.adoption_effect === 'none', 'effect boundary');
  fail(['bounded_registry_denominator_orders_without_compliance_join', 'requires_additional_acquisition'].includes(core.current_result?.terminal_state), 'terminal receipt vocabulary');
  fail(core.next_handoff?.acquisition_id === 'SSC-RD04-SNAP-A07' && core.next_handoff?.outside_human_dependency === false && core.next_handoff?.project_blocking === false, 'next handoff');
  for (const [key, value] of Object.entries(core.boundaries ?? {})) fail(value === false, `boundary ${key}`);
  fail(schema?.additionalProperties === false, 'closed schema top level');
  fail(schema?.properties?.current_result?.additionalProperties === false, 'closed current-result schema');
  fail(schema?.properties?.authority?.additionalProperties === false, 'closed authority schema');
  fail(stableStringify(Object.keys(core).sort()) === stableStringify(Object.keys(schema?.properties ?? {}).sort()), 'core top-level closed shape');

  fail(plan.schema_version === 'ssc-rd04-a06-full-corpus-plan@1', 'plan schema version');
  fail(plan.counts?.registry_rows === 12282 && plan.counts?.unique_documents === 11672, 'plan denominator counts');
  fail(plan.shard_count === SHARD_COUNT && plan.content_neutral_assignment === true, 'plan shard contract');
  fail(Array.isArray(plan.shards) && plan.shards.length === SHARD_COUNT, 'plan shard rows');

  const denominatorFiles = walkFiles(path.join(intakeDir, 'denominator-shards')).filter((file) => file.endsWith('.json')).sort();
  const acquisitionFiles = walkFiles(path.join(intakeDir, 'acquisition-shards')).filter((file) => file.endsWith('.json')).sort();
  fail(denominatorFiles.length === SHARD_COUNT, 'denominator shard file count');
  fail(acquisitionFiles.length === SHARD_COUNT, 'acquisition shard file count');
  const documentIds = new Set();
  const registryIds = new Set();
  let exactPdfDocs = 0;
  let missingDocs = 0;
  for (let index = 0; index < Math.min(denominatorFiles.length, acquisitionFiles.length); index += 1) {
    const expectedId = String(index).padStart(2, '0');
    const denominator = readJson(denominatorFiles[index]);
    const acquisition = readJson(acquisitionFiles[index]);
    fail(denominator.shard === expectedId && acquisition.shard === expectedId, `shard identity ${expectedId}`);
    fail(denominator.assignment === 'sha256_document_identity_mod_64', `shard assignment ${expectedId}`);
    fail(denominator.documents.length === acquisition.documents.length, `shard document count ${expectedId}`);
    const acquisitionMap = new Map(acquisition.documents.map((row) => [row.document_identity, row]));
    for (const document of denominator.documents) {
      fail(shardForDocument(document.document_identity, SHARD_COUNT) === index, `document shard assignment ${document.document_identity}`);
      fail(!documentIds.has(document.document_identity), `duplicate document ${document.document_identity}`);
      documentIds.add(document.document_identity);
      const observed = acquisitionMap.get(document.document_identity);
      fail(Boolean(observed), `missing document receipt ${document.document_identity}`);
      for (const registryId of document.registry_ids) {
        fail(!registryIds.has(registryId), `duplicate registry row ${registryId}`);
        registryIds.add(registryId);
      }
      if (observed && ['exact_pdf_and_text_recovered', 'exact_pdf_unparseable_text_preserved'].includes(observed.terminal_state)) exactPdfDocs += 1;
      else missingDocs += 1;
      if (observed) {
        fail(observed.order_is_observed_implementation === false, `order implementation ${document.document_identity}`);
        fail(observed.compliance_state === 'no_separate_public_compliance_receipt', `compliance state ${document.document_identity}`);
        fail(observed.restoration_amount === null && observed.restoration_date === null && observed.remedy_timeliness === null, `restoration invention ${document.document_identity}`);
        fail(Array.isArray(observed.attempts) && observed.attempts.length >= 1 && observed.attempts.length <= 2, `bounded attempts ${document.document_identity}`);
      }
    }
  }
  fail(documentIds.size === 11672, 'reconstructed document coverage');
  fail(registryIds.size === 12282, 'reconstructed registry coverage');
  fail(exactPdfDocs === core.counts.exact_pdf_documents, 'reconstructed exact PDF count');
  fail(missingDocs === core.counts.missing_or_non_pdf_documents, 'reconstructed missing count');

  fail(releaseAssets.schema_version === 'ssc-rd04-a06-draft-release-ledger@1', 'release ledger schema');
  fail(releaseAssets.tag === RELEASE_TAG && releaseAssets.draft === true && releaseAssets.published_at === null, 'draft release state');
  fail(releaseAssets.publication_effect === 'none', 'release publication effect');
  fail(releaseAssets.expected_assets === 132 && releaseAssets.observed_assets === 132, 'release asset count');
  fail(Array.isArray(releaseAssets.assets) && releaseAssets.assets.length === 132, 'release asset rows');
  const assetNames = new Set(releaseAssets.assets.map((row) => row.name));
  for (let index = 0; index < SHARD_COUNT; index += 1) {
    const shardId = String(index).padStart(2, '0');
    fail(assetNames.has(`ssc-rd04-a06-pdf-shard-${shardId}.tar.zst`), `release archive ${shardId}`);
    fail(assetNames.has(`ssc-rd04-a06-pdf-shard-${shardId}.tar.zst.sha256`), `release archive hash ${shardId}`);
  }
  fail(compliance.separate_public_compliance_receipts === 0 && compliance.case_level_implementation_joins === 0, 'compliance ledger authority');
  fail(compliance.order_is_implementation === false && compliance.absence_of_compliance_receipt_is_noncompliance === false, 'compliance ledger boundaries');
  fail(missing.missing_or_non_pdf_documents === core.counts.missing_or_non_pdf_documents, 'missing ledger count');

  if (checkFiles) {
    fail(manifest.schema_version === 'ssc-rd04-a06-full-corpus-release-manifest@1', 'release manifest schema');
    fail(manifest.execution_id === EXECUTION && manifest.issue === ISSUE, 'release manifest identity');
    fail(manifest.self_included === false, 'release manifest self exclusion');
    const paths = manifest.entries?.map((entry) => entry.path) ?? [];
    fail(stableStringify(paths) === stableStringify([...paths].sort()), 'release manifest order');
    fail(new Set(paths).size === paths.length, 'release manifest uniqueness');
    for (const entry of manifest.entries ?? []) {
      fail(!/(^|\/)(\.github\/tmp|data\/transport|temporary-|carrier|materializer|trigger)/i.test(entry.path), `transport exclusion ${entry.path}`);
      const file = path.join(repoRoot, entry.path);
      fail(fs.existsSync(file), `manifest file ${entry.path}`);
      if (!fs.existsSync(file)) continue;
      const bytes = fs.readFileSync(file);
      fail(bytes.length === entry.bytes, `manifest bytes ${entry.path}`);
      fail(sha256(bytes) === entry.sha256, `manifest hash ${entry.path}`);
    }
    const combined = sha256(Buffer.from((manifest.entries ?? []).map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'));
    fail(combined === manifest.combined_sha256, 'release manifest combined hash');
  }
  return errors;
}

function validate(repoRoot = DEFAULT_ROOT) {
  const errors = validatePermanent(repoRoot, { checkFiles: true });
  if (errors.length) {
    console.error('SSC RD-04 A06 full corpus validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const core = readJson(path.join(repoRoot, INTAKE_REL, 'core.json'));
  console.log(`validate A06 full corpus: PASS — ${core.counts.registry_rows} registry rows, ${core.counts.unique_documents} documents, ${core.counts.exact_pdf_documents} exact PDFs, zero compliance joins and zero authority escalation`);
}

function usage() {
  console.error('usage: node tools/ssc-rd04-a06-full-corpus.mjs <prepare|acquire|reconcile|validate> ...');
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'prepare') {
    if (args.length < 2) return usage();
    prepare(path.resolve(args[0]), path.resolve(args[1]), args[2] ? Number(args[2]) : SHARD_COUNT);
    return;
  }
  if (command === 'acquire') {
    if (args.length < 3) return usage();
    const pilot = args.includes('--pilot');
    const limitArg = args.find((value) => value.startsWith('--limit='));
    acquire(path.resolve(args[0]), args[1], path.resolve(args[2]), { pilot, limit: limitArg ? Number(limitArg.split('=')[1]) : null });
    return;
  }
  if (command === 'reconcile') {
    if (args.length < 5) return usage();
    reconcile(path.resolve(args[0]), path.resolve(args[1]), path.resolve(args[2]), path.resolve(args[3]), path.resolve(args[4]));
    return;
  }
  if (command === 'validate') {
    validate(args[0] ? path.resolve(args[0]) : DEFAULT_ROOT);
    return;
  }
  usage();
  process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
