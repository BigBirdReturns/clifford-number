#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertPrivacyProjection,
  normalizePdfItems,
  parseOgePages,
  sha256,
  stableJson,
} from './lib/oge-beneficial-interest.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = process.cwd();
const locatorFile = path.resolve(root, value('locators', 'data/research/oge-disclosure-locators.json'));
const outputDir = path.resolve(root, value('output', 'build/oge-beneficial-interests'));
const pdfjsFile = path.resolve(root, value('pdfjs', process.env.PDFJS_DIST_PATH ?? 'build/oge-pdf-runtime/node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
const delayMs = Number(value('delay-ms', '500'));
const maxRetries = Number(value('retries', '4'));
const timeoutMs = Number(value('timeout-ms', '90000'));
const maxDocuments = Number(value('max-documents', '0'));
const durableOutputArg = value('durable-output', '');
const durableOutput = durableOutputArg ? path.resolve(root, durableOutputArg) : null;
const userAgent = process.env.CRAWL_USER_AGENT ?? 'clifford-number/0.3 OGE public-disclosure intake (+https://github.com/BigBirdReturns/clifford-number)';

if (!fs.existsSync(pdfjsFile)) {
  throw new Error(`Pinned PDF parser missing at ${pdfjsFile}. Reproduce without changing package.json: npm install --prefix build/oge-pdf-runtime --no-save --ignore-scripts pdfjs-dist@5.4.530`);
}
const pdfjs = await import(pathToFileURL(pdfjsFile));
const locators = JSON.parse(fs.readFileSync(locatorFile, 'utf8'));
const cohort = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/us-presidential-officeholder-cohort.json'), 'utf8'));
const people = new Map(cohort.members.map(member => [member.person_id, member.name]));
const documents = locators.members.flatMap(member => (member.locators ?? [])
  .filter(locator => locator.sha256)
  .map(locator => ({ ...locator, person_id: member.person_id, person_name: people.get(member.person_id) ?? null })));
const selected = maxDocuments > 0 ? documents.slice(0, maxDocuments) : documents;
const rawDir = path.join(outputDir, 'raw');
const pagesDir = path.join(outputDir, 'pages');
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function download(locator) {
  const finalPath = path.join(rawDir, `${locator.sha256}.pdf`);
  if (fs.existsSync(finalPath)) {
    const bytes = fs.readFileSync(finalPath);
    if (sha256(bytes) === locator.sha256 && bytes.length === locator.bytes) return { path: finalPath, bytes, mode: 'verified_cache' };
    throw new Error(`cached artifact failed locator hash/byte check: ${locator.sha256}`);
  }
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(locator.url, {
        headers: { Accept: 'application/pdf', 'User-Agent': userAgent },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const error = new Error(`OGE HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get('retry-after'));
        throw error;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const digest = sha256(bytes);
      if (digest !== locator.sha256 || bytes.length !== locator.bytes) {
        throw new Error(`locator integrity mismatch: expected ${locator.bytes}/${locator.sha256}, observed ${bytes.length}/${digest}`);
      }
      const partial = `${finalPath}.partial`;
      fs.writeFileSync(partial, bytes);
      fs.renameSync(partial, finalPath);
      return { path: finalPath, bytes, mode: 'downloaded' };
    } catch (error) {
      lastError = error;
      const retryable = !error.status || [408, 425, 429, 500, 502, 503, 504].includes(error.status);
      if (!retryable || attempt === maxRetries || /integrity mismatch/.test(String(error.message))) break;
      const wait = Number.isFinite(error.retryAfter) && error.retryAfter > 0
        ? error.retryAfter * 1000
        : Math.min(60000, 1500 * (2 ** attempt));
      await sleep(wait);
    }
  }
  throw lastError;
}

async function extractPages(bytes) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const displayItems = content.items.map(item => {
      const transform = pdfjs.Util.transform(viewport.transform, item.transform);
      return { ...item, transform: [...transform.slice(0, 4), transform[4], viewport.height - transform[5]] };
    });
    const items = normalizePdfItems(displayItems);
    pages.push({
      schema_version: 'oge-pdf-page-text@1',
      page_number: pageNumber,
      items,
      text_sha256: sha256(stableJson(items)),
      graph_effect: 'none',
    });
  }
  return pages;
}

const documentRows = [];
const interestRows = [];
const rejectionRows = [];
const failures = [];
for (let index = 0; index < selected.length; index += 1) {
  const locator = selected[index];
  const startedAt = new Date().toISOString();
  try {
    const acquired = await download(locator);
    const pages = await extractPages(acquired.bytes);
    const pagePath = path.join(pagesDir, `${locator.sha256}.jsonl`);
    fs.writeFileSync(pagePath, `${pages.map(stableJson).join('\n')}\n`);
    const context = {
      person_id: locator.person_id,
      person_name: locator.person_name,
      source_document_id: `oge:${locator.sha256}`,
      report_type: locator.document_type,
      report_date: locator.filing_date,
      source_url: locator.url,
      source_sha256: locator.sha256,
    };
    const parsed = parseOgePages(pages, context);
    if (/278[- ]?T|Transaction/i.test(locator.document_type) && parsed.records.length === 0) {
      parsed.rejections.push({
        page: null,
        row_label: null,
        reason: 'no_machine_readable_transaction_rows',
        source_sha256: locator.sha256,
        graph_effect: 'none',
      });
    }
    for (const row of parsed.records) {
      assertPrivacyProjection(row);
      interestRows.push(row);
    }
    rejectionRows.push(...parsed.rejections);
    documentRows.push({
      schema_version: 'oge-disclosure-document-intake@1',
      ...context,
      expected_bytes: locator.bytes,
      observed_bytes: acquired.bytes.length,
      expected_sha256: locator.sha256,
      observed_sha256: sha256(acquired.bytes),
      expected_page_count: locator.page_count ?? null,
      observed_page_count: pages.length,
      acquisition_mode: acquired.mode,
      page_text_path: path.relative(outputDir, pagePath).replaceAll('\\', '/'),
      page_text_sha256: sha256(fs.readFileSync(pagePath)),
      normalized_interest_records: parsed.records.length,
      normalization_rejections: parsed.rejections.length,
      privacy_rejections: parsed.rejections.filter(row => row.reason === 'privacy_pattern').length,
      parse_rejections: parsed.rejections.filter(row => row.reason !== 'privacy_pattern').length,
      retrieved_or_verified_at: startedAt,
      verification_status: 'machine_proposed_unverified',
      causal_status: 'not_established',
      graph_effect: 'none',
    });
  } catch (error) {
    failures.push({
      schema_version: 'oge-disclosure-source-failure@1',
      source_url: locator.url,
      source_sha256: locator.sha256,
      person_id: locator.person_id,
      observed_at: new Date().toISOString(),
      error: String(error?.message ?? error),
      interpretation: 'Acquisition or parsing failed; this does not establish that no disclosure or beneficial interest exists.',
      graph_effect: 'none',
    });
  }
  const progress = {
    schema_version: 'oge-beneficial-interest-progress@1',
    locator_snapshot_sha256: sha256(stableJson(locators)),
    documents_expected: selected.length,
    documents_attempted: index + 1,
    documents_completed: documentRows.length,
    documents_failed: failures.length,
    normalized_interest_records: interestRows.length,
    normalization_rejections: rejectionRows.length,
    privacy_rejections: rejectionRows.filter(row => row.reason === 'privacy_pattern').length,
    parse_rejections: rejectionRows.filter(row => row.reason !== 'privacy_pattern').length,
    graph_effect: 'none',
  };
  fs.writeFileSync(path.join(outputDir, 'progress.json'), `${JSON.stringify(progress, null, 2)}\n`);
  if (delayMs > 0 && index + 1 < selected.length) await sleep(delayMs);
}

fs.writeFileSync(path.join(outputDir, 'documents.jsonl'), `${documentRows.map(stableJson).join('\n')}${documentRows.length ? '\n' : ''}`);
fs.writeFileSync(path.join(outputDir, 'interests.jsonl'), `${interestRows.map(stableJson).join('\n')}${interestRows.length ? '\n' : ''}`);
fs.writeFileSync(path.join(outputDir, 'rejections.jsonl'), `${rejectionRows.map(stableJson).join('\n')}${rejectionRows.length ? '\n' : ''}`);
fs.writeFileSync(path.join(outputDir, 'source-failures.jsonl'), `${failures.map(stableJson).join('\n')}${failures.length ? '\n' : ''}`);
const outputReceipts = Object.fromEntries(['documents.jsonl', 'interests.jsonl', 'rejections.jsonl', 'source-failures.jsonl'].map(file => {
  const outputPath = path.join(outputDir, file);
  const bytes = fs.readFileSync(outputPath);
  return [file.replace('.jsonl', ''), { path: file, bytes: bytes.length, sha256: sha256(bytes) }];
}));
const summaryByPerson = Object.fromEntries([...new Set(selected.map(row => row.person_id))].sort().map(personId => [personId, {
  documents: documentRows.filter(row => row.person_id === personId).length,
  records: interestRows.filter(row => row.person_id === personId).length,
}]));
const transactionRows = interestRows.filter(row => row.record_kind === 'reported_transaction');
const extractionQuality = {
  transaction_rows: transactionRows.length,
  transaction_dates_strictly_parsed: transactionRows.filter(row => row.transaction_date_status === 'strictly_parsed').length,
  transaction_dates_ocr_ambiguous: transactionRows.filter(row => row.transaction_date_status === 'ocr_ambiguous').length,
  transaction_types_strictly_parsed: transactionRows.filter(row => row.interest_type_status === 'strictly_parsed').length,
  transaction_types_ocr_ambiguous: transactionRows.filter(row => row.interest_type_status === 'ocr_ambiguous').length,
  unknown_holder_scope_rows: interestRows.filter(row => row.interest_holder_scope === 'unknown').length,
};
const manifest = {
  schema_version: 'oge-beneficial-interest-manifest@1',
  locator_snapshot: path.relative(root, locatorFile).replaceAll('\\', '/'),
  locator_snapshot_sha256: sha256(stableJson(locators)),
  parser: { engine: 'pdfjs-dist', version: '5.4.530', entrypoint: path.relative(root, pdfjsFile).replaceAll('\\', '/') },
  documents_expected: selected.length,
  documents_completed: documentRows.length,
  documents_failed: failures.length,
  source_bytes_verified: documentRows.reduce((sum, row) => sum + row.observed_bytes, 0),
  source_pages_extracted: documentRows.reduce((sum, row) => sum + row.observed_page_count, 0),
  normalized_beneficial_interest_records: interestRows.length,
  normalization_rejections: rejectionRows.length,
  privacy_rejections: rejectionRows.filter(row => row.reason === 'privacy_pattern').length,
  parse_rejections: rejectionRows.filter(row => row.reason !== 'privacy_pattern').length,
  outputs: outputReceipts,
  summary_by_person: summaryByPerson,
  extraction_quality: extractionQuality,
  interpretation: 'Machine-extracted intake from hash-verified public OGE PDFs. Rows preserve filer-reported text, categorical ranges, holder scope when explicit or section-bounded, and page/row text hashes. They do not resolve legal entities, exact value, current control, causation, or wrongdoing.',
  consumption: {
    contract_id: 'public-topology-map@1',
    what_this_is: 'Machine-extracted, source-addressable intake from hash-verified public OGE disclosure PDFs.',
    what_this_is_not: 'A resolved legal-entity ledger, exact valuation, current-ownership finding, crossing, causal claim, or finding of wrongdoing.',
    copy_ready_caveat: 'Each row preserves filer-reported text and scope as machine-extracted intake. It remains unresolved and non-graphing until its page locator, entity identity, and temporal meaning are separately reviewed.',
  },
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
if (durableOutput) {
  fs.mkdirSync(path.dirname(durableOutput), { recursive: true });
  fs.writeFileSync(durableOutput, `${JSON.stringify({
    ...manifest,
    durable_artifact: true,
    generated_from_output: path.relative(root, outputDir).replaceAll('\\', '/'),
    records_artifact: `${path.relative(root, outputDir).replaceAll('\\', '/')}/interests.jsonl (gitignored; hash-pinned in outputs)`,
  }, null, 2)}\n`);
}
fs.rmSync(path.join(outputDir, 'progress.json'), { force: true });
console.log(`OGE beneficial-interest intake: ${documentRows.length}/${selected.length} documents, ${interestRows.length} rows, ${rejectionRows.length} normalization rejections (${rejectionRows.filter(row => row.reason === 'privacy_pattern').length} privacy), ${failures.length} source failure(s)`);
console.log(`output: ${path.relative(root, outputDir).replaceAll('\\', '/')}`);
if (durableOutput) console.log(`durable manifest: ${path.relative(root, durableOutput).replaceAll('\\', '/')}`);
if (failures.length) process.exitCode = 1;
