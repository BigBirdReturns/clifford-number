#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'a07-shn-pass');
const OUT = path.join(ROOT, 'a07-candidate-receipts');
const REGISTRY = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_SHARDS = path.join(ROOT, 'data/intake', A06_SLUG, 'denominator-shards');
const A06_RELEASE = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const RELIEF = new Set(['Grant', 'Partial Grant', 'Stipulation']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);
const failures = [];
const fail = (condition, message, context = null) => { if (!condition) failures.push({ message, context }); };

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 256 * 1024 * 1024,
    timeout: options.timeout ?? 360_000
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

function loadCanonicalD1() {
  const release = readJson(A06_RELEASE);
  fail(release.combined_sha256 === EXPECTED_A06_RELEASE,
    `canonical A06 release ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}`);
  const shnRows = new Map();
  let reliefRows = 0;
  const reliefDocuments = new Set();
  for (let index = 0; index < 64; index += 1) {
    const id = String(index).padStart(2, '0');
    const file = path.join(A06_SHARDS, `${id}.json`);
    fail(fs.existsSync(file), `missing A06 shard ${id}`);
    if (!fs.existsSync(file)) continue;
    const shard = readJson(file);
    for (const document of shard.documents ?? []) {
      for (const row of document.registry_rows ?? []) {
        if (!RELIEF.has(String(row.disposition ?? '').trim())) continue;
        reliefRows += 1;
        reliefDocuments.add(String(document.document_identity ?? '').trim());
        const shn = String(row.shn_number ?? '').trim();
        fail(Boolean(shn), `blank D1 SHN ${String(row.registry_id ?? '')}`);
        if (!shn) continue;
        const normalized = {
          registry_id: String(row.registry_id ?? '').trim(),
          release_date: String(row.release_date ?? '').trim(),
          release_date_utc: parseDate(row.release_date),
          disposition: String(row.disposition ?? '').trim(),
          document_identity: String(document.document_identity ?? '').trim()
        };
        const bucket = shnRows.get(shn) ?? [];
        bucket.push(normalized);
        shnRows.set(shn, bucket);
      }
    }
  }
  fail(reliefRows === 6633, `D1 relief rows ${reliefRows} != 6633`);
  fail(reliefDocuments.size === 6294, `D1 relief documents ${reliefDocuments.size} != 6294`);
  fail(shnRows.size === 6292, `D1 SHNs ${shnRows.size} != 6292`);
  return { release, shnRows, reliefRows, reliefDocuments };
}

function bootstrap() {
  const dir = path.join(OUT, 'session');
  ensureDir(dir);
  const cookie = path.join(dir, 'cookies.txt');
  const headers = path.join(dir, 'registry-page.headers.txt');
  const body = path.join(dir, 'registry-page.html');
  const meta = run('curl', [
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--cookie-jar', cookie,
    '--dump-header', headers,
    '--output', body,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY
  ]).trim().split(/\n/);
  const raw = fs.readFileSync(body);
  const receipt = {
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: raw.length,
    sha256: sha256(raw)
  };
  writeJson(path.join(dir, 'registry-page.receipt.json'), receipt);
  if (receipt.http_status !== 200 || raw.length === 0) throw new Error(`registry bootstrap failed: ${stable(receipt)}`);
  return cookie;
}

function completedActionCandidates(text) {
  const normalized = String(text ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const completed = [
    /\b(?:county|agency|department)\s+(?:has\s+)?restored\b/g,
    /\bbenefits?\s+(?:have\s+been|were)\s+restored\b/g,
    /\bbenefits?\s+(?:have\s+been|were)\s+reinstated\b/g,
    /\b(?:county|agency|department)\s+(?:has\s+)?reinstated\b/g,
    /\b(?:county|agency|department)\s+(?:has\s+)?issued\s+(?:a\s+)?(?:payment|benefit|benefits|allotment|corrective payment)\b/g,
    /\b(?:payment|benefits?|allotment)\s+(?:has\s+been|have\s+been|was|were)\s+issued\b/g,
    /\b(?:county|agency|department)\s+(?:has\s+)?paid\b/g,
    /\b(?:county|agency|department)\s+(?:has\s+)?complied\b/g,
    /\bcompliance\s+(?:has\s+been|was)\s+(?:completed|achieved|verified)\b/g,
    /\bcorrective\s+(?:payment|benefits?)\s+(?:has\s+been|have\s+been|was|were)\s+(?:issued|paid|provided)\b/g,
    /\bretroactive\s+benefits?\s+(?:has\s+been|have\s+been|was|were)\s+(?:issued|paid|restored|provided)\b/g
  ];
  const exclusion = [
    /\b(?:appellant|claimant)\s+(?:states|stated|alleges|alleged|claims|claimed|argues|argued)\b/i,
    /\bif\s+(?:the\s+)?(?:county|agency|department)\b/i,
    /\b(?:shall|must|is ordered to|was ordered to|should)\b/i,
    /\brequest(?:s|ed)?\s+that\b/i,
    /\bnot\s+(?:yet\s+)?(?:restored|reinstated|issued|paid|complied)\b/i
  ];
  const contexts = [];
  for (const pattern of completed) {
    for (const match of lower.matchAll(pattern)) {
      const start = Math.max(0, match.index - 280);
      const end = Math.min(normalized.length, match.index + match[0].length + 280);
      const context = normalized.slice(start, end);
      const disqualified = exclusion.some((rule) => rule.test(context));
      contexts.push({
        matched_phrase: normalized.slice(match.index, match.index + match[0].length),
        context,
        disqualified_by_order_allegation_condition_or_negation: disqualified,
        context_sha256: sha256(Buffer.from(context, 'utf8'))
      });
    }
  }
  return {
    contexts,
    qualified_contexts: contexts.filter((row) => !row.disqualified_by_order_allegation_condition_or_negation)
  };
}

function fetchDocument(document, cookie) {
  const identityHash = sha256(Buffer.from(document.document_identity, 'utf8')).slice(0, 20);
  const dir = path.join(OUT, 'documents', identityHash);
  ensureDir(dir);
  const bodyPath = path.join(dir, 'document.bin');
  const headersPath = path.join(dir, 'headers.txt');
  const archived = document.archived === true;
  const url = archived
    ? `https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistryDownload&registry=${encodeURIComponent(document.archive_registry_id)}&archived=true`
    : `https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistryDownload&decision=${encodeURIComponent(document.decision_id)}&archived=false`;
  const meta = run('curl', [
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '300',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--referer', REGISTRY,
    '--cookie', cookie,
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    url
  ]).trim().split(/\n/);
  const raw = fs.readFileSync(bodyPath);
  const validPdf = raw.subarray(0, 5).toString('ascii') === '%PDF-';
  const receipt = {
    document_identity: document.document_identity,
    requested_url: url,
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: raw.length,
    sha256: sha256(raw),
    valid_pdf_magic: validPdf,
    registry_ids: document.registry_ids,
    matched_d1_shns: document.matched_d1_shns
  };
  writeJson(path.join(dir, 'fetch.json'), receipt);
  if (receipt.http_status !== 200 || !validPdf) {
    failures.push({ message: `candidate document fetch is not a valid PDF`, context: receipt });
    return { ...receipt, text: null, text_path: null, language: { contexts: [], qualified_contexts: [] } };
  }
  const pdfPath = path.join(dir, 'document.pdf');
  fs.renameSync(bodyPath, pdfPath);
  const textPath = path.join(dir, 'document.txt');
  run('pdftotext', ['-layout', pdfPath, textPath]);
  const text = fs.readFileSync(textPath, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(textPath, text);
  const language = completedActionCandidates(text);
  const textReceipt = {
    path: path.relative(ROOT, textPath).replaceAll(path.sep, '/'),
    bytes: Buffer.byteLength(text),
    sha256: sha256(Buffer.from(text, 'utf8')),
    completed_action_contexts: language.contexts.length,
    qualified_completed_action_contexts: language.qualified_contexts.length
  };
  writeJson(path.join(dir, 'text-receipt.json'), textReceipt);
  writeJson(path.join(dir, 'language-candidates.json'), language);
  return { ...receipt, pdf_path: path.relative(ROOT, pdfPath).replaceAll(path.sep, '/'), text_path: textReceipt.path, text_receipt: textReceipt, language };
}

let summary;
try {
  const shnSummaryPath = path.join(INPUT, 'summary.json');
  const candidateRowsPath = path.join(INPUT, 'candidate-rows.json');
  const candidateDocumentsPath = path.join(INPUT, 'candidate-documents.json');
  fail(fs.existsSync(shnSummaryPath), 'missing exact-SHN pass summary');
  fail(fs.existsSync(candidateRowsPath), 'missing exact-SHN candidate rows');
  fail(fs.existsSync(candidateDocumentsPath), 'missing exact-SHN candidate documents');
  if (failures.length) throw new Error('missing pass inputs');

  const shnSummary = readJson(shnSummaryPath);
  const candidateRows = readJson(candidateRowsPath);
  const candidateDocuments = readJson(candidateDocumentsPath);
  fail(shnSummary.status === 'pass', `exact-SHN status ${shnSummary.status}`);
  fail(shnSummary.counts?.D1_shns === 6292, `exact-SHN D1 count ${shnSummary.counts?.D1_shns}`);
  fail(shnSummary.counts?.failures === 0, `exact-SHN failures ${shnSummary.counts?.failures}`);
  fail(Array.isArray(candidateRows), 'candidate rows not array');
  fail(Array.isArray(candidateDocuments), 'candidate documents not array');
  fail(candidateRows.length === shnSummary.counts.public_followup_candidate_rows,
    `candidate row count ${candidateRows.length} != summary ${shnSummary.counts.public_followup_candidate_rows}`);
  fail(candidateDocuments.length === shnSummary.counts.public_followup_candidate_documents,
    `candidate document count ${candidateDocuments.length} != summary ${shnSummary.counts.public_followup_candidate_documents}`);

  const canonical = loadCanonicalD1();
  if (failures.length) throw new Error('canonical D1 validation failed');
  const documentResults = [];
  const explicitLanguageCandidates = [];
  let cookie = null;

  if (candidateDocuments.length > 0) {
    if (!process.env.PATH?.split(':').some((dir) => fs.existsSync(path.join(dir, 'pdftotext')))) {
      throw new Error('pdftotext is required');
    }
    cookie = bootstrap();
  }

  for (const document of candidateDocuments) {
    const result = fetchDocument(document, cookie);
    const d1Dates = [...new Set(document.matched_d1_shns.flatMap((shn) =>
      (canonical.shnRows.get(shn) ?? []).map((row) => row.release_date_utc).filter((value) => value !== null)))];
    const latestD1Date = d1Dates.length ? Math.max(...d1Dates) : null;
    const rowDates = document.rows.map((row) => parseDate(row.release_date)).filter((value) => value !== null);
    const earliestCandidateDate = rowDates.length ? Math.min(...rowDates) : null;
    const laterThanLatestD1 = latestD1Date !== null && earliestCandidateDate !== null && earliestCandidateDate > latestD1Date;
    const qualifiedContexts = result.language?.qualified_contexts ?? [];
    const classification = qualifiedContexts.length > 0 && laterThanLatestD1
      ? 'later_same_shn_explicit_completed_action_language_candidate'
      : qualifiedContexts.length > 0
        ? 'same_or_prior_date_explicit_completed_action_language_not_implementation_receipt'
        : laterThanLatestD1
          ? 'later_same_shn_document_without_qualified_completed_action_language'
          : 'same_or_prior_date_document_without_qualified_completed_action_language';
    const normalized = {
      ...result,
      latest_d1_relief_date_utc: latestD1Date,
      earliest_candidate_release_date_utc: earliestCandidateDate,
      later_than_latest_d1_relief: laterThanLatestD1,
      classification,
      authority: {
        machine_language_candidate_is_verified_implementation: false,
        same_shn_proves_same_claimant: false,
        document_proves_payment_or_restoration_without_explicit_completed_action: false
      }
    };
    documentResults.push(normalized);
    if (classification === 'later_same_shn_explicit_completed_action_language_candidate') {
      explicitLanguageCandidates.push({
        document_identity: document.document_identity,
        matched_d1_shns: document.matched_d1_shns,
        candidate_registry_ids: document.registry_ids,
        latest_d1_relief_date_utc: latestD1Date,
        earliest_candidate_release_date_utc: earliestCandidateDate,
        qualified_contexts: qualifiedContexts,
        text_path: result.text_path,
        pdf_path: result.pdf_path
      });
    }
  }

  const validPdfs = documentResults.filter((row) => row.valid_pdf_magic).length;
  const invalidDocuments = documentResults.length - validPdfs;
  summary = {
    schema_version: 'ssc-rd04-a07-candidate-receipt-custody@3',
    issue: 739,
    status: failures.length === 0 ? 'pass' : 'fail',
    input: {
      exact_shn_status: shnSummary.status,
      D1_shns: shnSummary.counts.D1_shns,
      candidate_rows: candidateRows.length,
      candidate_documents: candidateDocuments.length
    },
    counts: {
      candidate_rows: candidateRows.length,
      candidate_documents: candidateDocuments.length,
      valid_candidate_pdfs: validPdfs,
      invalid_candidate_documents: invalidDocuments,
      later_same_shn_documents: documentResults.filter((row) => row.later_than_latest_d1_relief).length,
      documents_with_any_completed_action_language: documentResults.filter((row) => (row.language?.contexts?.length ?? 0) > 0).length,
      later_documents_with_qualified_completed_action_language: explicitLanguageCandidates.length,
      verified_public_implementation_receipts: 0,
      verified_public_restoration_receipts: 0,
      failures: failures.length
    },
    authority: {
      exact_candidate_document_bytes_preserved: failures.length === 0,
      qualified_language_is_machine_candidate_only: true,
      machine_candidate_is_verified_implementation: false,
      same_shn_proves_same_claimant: false,
      missing_public_followup_is_noncompliance: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    failures
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'candidate-document-custody.json'), documentResults);
  writeJson(path.join(OUT, 'explicit-language-candidates.json'), explicitLanguageCandidates);
  writeJson(path.join(OUT, 'failure-ledger.json'), failures);
  console.log(JSON.stringify(summary.counts));
  if (failures.length) throw new Error(`candidate receipt custody failed with ${failures.length} errors`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-candidate-receipt-custody@3',
      issue: 739,
      status: 'fail',
      counts: { failures: failures.length + 1 },
      authority: {
        machine_candidate_is_verified_implementation: false,
        missing_public_followup_is_noncompliance: false,
        external_contacts: 0,
        graph_effect: 'none'
      },
      failures: [...failures, { message: error.message }]
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
    writeJson(path.join(OUT, 'failure-ledger.json'), summary.failures);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
