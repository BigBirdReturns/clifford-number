#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {
  TARGETS,
  assessInterval,
  extractDisclosureEvidence,
  normalizedPageText,
  sha256,
  summarizeFecWindow,
} from './lib/trump-2016-candidate-disclosure.mjs';

const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = process.cwd();
const pdfPath = path.resolve(root, arg('pdf', 'build/trump-2016-candidate-disclosure/raw/Trump-2016-Financial-Disclosure.pdf'));
const fecPath = path.resolve(root, arg('fec-records', 'build/fec-payee-inventory/fec-oppexp-cohort-local-20260713-r2/payee-records.jsonl'));
const fecManifestPath = path.resolve(root, arg('fec-manifest', 'build/fec-payee-inventory/fec-oppexp-cohort-local-20260713-r2/manifest.json'));
const pdfjsPath = path.resolve(root, arg('pdfjs', 'build/oge-pdf-runtime/node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
const outputDir = path.resolve(root, arg('output-dir', 'build/trump-2016-candidate-disclosure'));
const durableOutput = arg('durable-output', '');

const pdfBytes = fs.readFileSync(pdfPath);
const pdfSha256 = sha256(pdfBytes);
const pdfjs = await import(`file:///${pdfjsPath.replaceAll('\\', '/')}`);
const document = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes), disableWorker: true, verbosity: 0 }).promise;
const pages = [];
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = normalizedPageText(content.items);
  pages.push({ page_number: pageNumber, text, text_sha256: sha256(text) });
}

const targetNames = new Set(TARGETS.map(target => target.entity_name));
const fecRows = [];
const stream = readline.createInterface({ input: fs.createReadStream(fecPath), crlfDelay: Infinity });
for await (const line of stream) {
  if (!line.includes('TRUMP')) continue;
  const row = JSON.parse(line);
  if (targetNames.has(row.normalized_payee_name)) fecRows.push(row);
}

const evidence = extractDisclosureEvidence(pages);
if (evidence.some(row => !row.exact_name_present || !row.section_header_present || !row.row_and_reference_pattern_verified)) {
  throw new Error('one or more configured disclosure rows failed exact source verification');
}
const fecWindow = summarizeFecWindow(fecRows);
const fecByName = new Map(fecWindow.map(row => [row.entity_name, row]));
const dispositions = evidence.map(row => ({
  ...row,
  fec_window: fecByName.get(row.entity_name_as_reported),
  temporal_assessment: assessInterval(row, fecByName.get(row.entity_name_as_reported)),
}));

fs.mkdirSync(outputDir, { recursive: true });
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  const bytes = fs.readFileSync(file);
  return { path: path.basename(file), bytes: bytes.length, sha256: sha256(bytes) };
}
function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map(JSON.stringify).join('\n')}\n`);
  const bytes = fs.readFileSync(file);
  return { path: path.basename(file), bytes: bytes.length, sha256: sha256(bytes) };
}

const acquisition = {
  schema_version: 'secondary-hosted-disclosure-acquisition@1',
  landing_url: 'https://www.documentcloud.org/documents/2838696-Trump-2016-Financial-Disclosure/',
  requested_pdf_url: 'https://www.documentcloud.org/documents/2838696-Trump-2016-Financial-Disclosure.pdf',
  resolved_pdf_url: 'https://s3.documentcloud.org/documents/2838696/Trump-2016-Financial-Disclosure.pdf',
  washington_post_linked_url: 'https://www.washingtonpost.com/wp-stat/graphics/politics/trump-archive/docs/personal-financial-disclosure-report-2-may-18-2016.pdf',
  custody_classification: 'secondary_hosted_copy_of_filer_report',
  http_response_date: '2026-07-14T03:13:10Z',
  source_http_last_modified: '2016-05-18T15:59:52Z',
  source_http_etag: '3260bd6534ebf82afbe85125c08f6799',
  local_path: path.relative(root, pdfPath).replaceAll('\\', '/'),
  bytes: pdfBytes.length,
  sha256: pdfSha256,
  pdf_pages: document.numPages,
  interpretation: 'A byte-preserved secondary-hosted copy of a filer report; this acquisition does not establish official agency custody.',
  graph_effect: 'none',
};
const acquisitionOutput = writeJson(path.join(outputDir, 'acquisition.json'), acquisition);
const evidenceOutput = writeJsonl(path.join(outputDir, 'entity-evidence.jsonl'), dispositions);
const fecManifest = JSON.parse(fs.readFileSync(fecManifestPath, 'utf8'));
const manifest = {
  schema_version: 'trump-2016-candidate-disclosure-audit@1',
  acquisition,
  pdf_text_pages_extracted: pages.length,
  target_legal_names_tested: TARGETS.length,
  target_legal_names_explicitly_reported: dispositions.filter(row => row.temporal_assessment.explicit_filer_report).length,
  target_names_contemporaneous_with_observed_fec_window: dispositions.filter(row => row.temporal_assessment.contemporaneous_with_observed_fec_window).length,
  target_names_with_defensible_closed_interval: dispositions.filter(row => row.temporal_assessment.supplies_defensible_closed_interval).length,
  fec_input: {
    path: path.relative(root, fecPath).replaceAll('\\', '/'),
    bytes: fecManifest.outputs.records.bytes,
    sha256: fecManifest.outputs.records.sha256,
    interpretation: 'FEC rows are committee-reported itemizations; amendments are retained and rows are not asserted to be unique payments.',
  },
  outputs: { acquisition: acquisitionOutput, entity_evidence: evidenceOutput },
  conclusion: 'All three exact legal names appear in filer-scoped Part 2 rows in the May 2016 report copy, and May 16 falls inside each name candidate’s observed 2015/2016 FEC itemization range. The report supplies a dated observation, not entity-specific start/end dates, so it does not create a defensible closed holding interval or resolve the same-named FEC payee identity.',
  verification_status: 'machine_extracted_secondary_copy_unreviewed',
  causal_status: 'not_established',
  graph_effect: 'none',
};
const manifestOutput = writeJson(path.join(outputDir, 'manifest.json'), manifest);
if (durableOutput) {
  const target = path.resolve(root, durableOutput);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(outputDir, manifestOutput.path), target);
}
console.log(`trump-2016-candidate-disclosure: OK (${document.numPages} pages; ${dispositions.length} exact target rows; 0 closed intervals)`);
