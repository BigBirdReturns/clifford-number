#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const custodyRoot = path.join(root, 'data/intake/status-sovereignty-rd04-california-remedy-chain-a05/source-custody');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const write = (target, value) => { ensureDir(path.dirname(target)); fs.writeFileSync(target, value); };

const sources = [
  {
    id: 'SHD-FY2025-26',
    url: 'https://www.cdss.ca.gov/Portals/9/SHD/SHD%20Hearing%20Data%20Summary%20Report%20FY%202025-2026.pdf',
    body: 'report.pdf',
    kind: 'pdf',
    authority: 'official_state_hearings_fiscal_year_report'
  },
  {
    id: 'DECISION-REGISTRY',
    url: 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry',
    body: 'page.html',
    kind: 'html',
    authority: 'official_public_decision_registry'
  },
  {
    id: 'HEARING-REQUESTS',
    url: 'https://www.cdss.ca.gov/hearing-requests',
    body: 'page.html',
    kind: 'html',
    authority: 'official_hearing_request_instructions'
  }
];

function headerValue(text, name) {
  const blocks = text.split(/\r?\n\r?\n/).filter(Boolean);
  const last = blocks.at(-1) ?? '';
  const match = last.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() ?? null;
}

function fetchSource(source) {
  const dir = path.join(custodyRoot, source.id);
  ensureDir(dir);
  const bodyPath = path.join(dir, source.body);
  const headersPath = path.join(dir, 'headers.txt');
  const metaPath = path.join(dir, 'fetch.json');
  const format = '%{http_code}\n%{url_effective}\n%{content_type}\n';
  const result = spawnSync('curl', [
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--dump-header', headersPath, '--output', bodyPath, '--write-out', format, source.url
  ], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`fetch failed for ${source.id}: ${(result.stderr || result.stdout || '').trim()}`);
  const [statusText, finalUrl, contentType] = result.stdout.trim().split(/\n/);
  const status = Number(statusText);
  if (!Number.isInteger(status) || status < 200 || status >= 400) throw new Error(`unexpected HTTP status for ${source.id}: ${statusText}`);
  const body = fs.readFileSync(bodyPath);
  const headers = fs.readFileSync(headersPath);
  const meta = {
    source_id: source.id,
    authority: source.authority,
    requested_url: source.url,
    final_url: finalUrl,
    http_status: status,
    content_type: contentType || headerValue(headers.toString('utf8'), 'content-type'),
    fetched_at: new Date().toISOString(),
    body_path: path.relative(root, bodyPath).replaceAll(path.sep, '/'),
    body_bytes: body.length,
    body_sha256: sha256(body),
    headers_path: path.relative(root, headersPath).replaceAll(path.sep, '/'),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    official_host: new URL(finalUrl).hostname,
    source_bytes_preserved: true
  };
  write(metaPath, stable(meta));
  return { source, dir, bodyPath, meta };
}

function normalizedLines(value) {
  return value.replace(/\r/g, '').split('\n').map((line) => line.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

function section(lines, start, end) {
  const startIndex = lines.findIndex((line) => line.includes(start));
  if (startIndex < 0) throw new Error(`report section missing: ${start}`);
  const endIndex = end ? lines.findIndex((line, index) => index > startIndex && line.includes(end)) : lines.length;
  return lines.slice(startIndex, endIndex < 0 ? lines.length : endIndex).join('\n');
}

function parseProgramRow(block, label) {
  const line = block.split('\n').find((row) => row.startsWith(`${label} `));
  if (!line) throw new Error(`program row missing: ${label}`);
  const numbers = [...line.matchAll(/\b\d[\d,]*\b/g)].map((m) => Number(m[0].replaceAll(',', '')));
  if (numbers.length < 5) throw new Error(`program row malformed: ${line}`);
  return { q1: numbers.at(-5), q2: numbers.at(-4), q3: numbers.at(-3), q4: numbers.at(-2), total: numbers.at(-1) };
}

function parseReport(reportText) {
  const lines = normalizedLines(reportText);
  const facts = {
    report_period: '2025-07-01/2026-06-30',
    appeals_filed: parseProgramRow(section(lines, 'APPEALS FILED BY PROGRAM AND QUARTER', 'APPEALS ADMINISTRATIVELY DISMISSED'), 'CalFresh'),
    appeals_administratively_dismissed: parseProgramRow(section(lines, 'APPEALS ADMINISTRATIVELY DISMISSED BY PROGRAM AND QUARTER', 'APPEALS WITHDRAWN'), 'CalFresh'),
    appeals_withdrawn: parseProgramRow(section(lines, 'APPEALS WITHDRAWN BY PROGRAM AND QUARTER', 'APPEALS WITHDRAWN BY QUARTER'), 'CalFresh'),
    hearings_scheduled: parseProgramRow(section(lines, 'HEARINGS SCHEDULED BY PROGRAM AND QUARTER', 'HEARINGS HELD'), 'CalFresh'),
    hearings_held: parseProgramRow(section(lines, 'HEARINGS HELD BY PROGRAM AND QUARTER', 'HEARINGS POSTPONED'), 'CalFresh'),
    hearings_postponed: parseProgramRow(section(lines, 'HEARINGS POSTPONED BY PROGRAM AND QUARTER', 'NON-APPEARANCES'), 'CalFresh'),
    nonappearances: parseProgramRow(section(lines, 'NON-APPEARANCES BY PROGRAM AND QUARTER', 'ADMINISTRATIVE DISMISSALS'), 'CalFresh'),
    hearing_administrative_dismissals: parseProgramRow(section(lines, 'ADMINISTRATIVE DISMISSALS BY PROGRAM AND QUARTER', 'HEARING OUTCOME RATES'), 'CalFresh'),
    decisions_released: parseProgramRow(section(lines, 'DECISIONS RELEASED BY PROGRAM AND QUARTER', 'DECISIONS RELEASED BY QUARTER AND TYPE'), 'CalFresh'),
    rehearing_requests: parseProgramRow(section(lines, 'REHEARING REQUESTS FILED BY PROGRAM AND QUARTER', 'REQUESTS FILED BY REQUESTOR'), 'CalFresh'),
    all_program_decision_types: {
      denial: 13134,
      dismissal: 3723,
      grant_or_partial_grant: 9308,
      stipulation: 6512,
      total: 32677
    },
    all_program_rehearing_determinations: {
      denied: 1132,
      denied_untimely: 58,
      granted_hearing_scheduled: 117,
      granted_on_record: 42,
      total: 1349
    }
  };
  const expectedTotals = {
    appeals_filed: 44504,
    appeals_administratively_dismissed: 66,
    appeals_withdrawn: 32769,
    hearings_scheduled: 42368,
    hearings_held: 10434,
    hearings_postponed: 4204,
    nonappearances: 5569,
    hearing_administrative_dismissals: 22,
    decisions_released: 10582,
    rehearing_requests: 384
  };
  for (const [key, expected] of Object.entries(expectedTotals)) {
    if (facts[key].total !== expected) throw new Error(`report total drift for ${key}: ${facts[key].total}`);
  }
  const normalized = lines.join('\n');
  for (const token of ['Decision Type Total 13,134 3,723 9,308 6,512 32,677', 'Grand Total 1,132 58 117 42 1,349']) {
    if (!normalized.includes(token)) throw new Error(`report cross-program total missing: ${token}`);
  }
  return facts;
}

function assertHtmlSource(sourceId, html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  if (sourceId === 'DECISION-REGISTRY') {
    for (const token of ['Decision Registry', 'CalFresh', 'Partial Grant', 'decisions are not precedential']) {
      if (!text.toLowerCase().includes(token.toLowerCase())) throw new Error(`decision registry token missing: ${token}`);
    }
  }
  if (sourceId === 'HEARING-REQUESTS') {
    for (const token of ['90 days', 'CalFresh', 'Request a Hearing']) {
      if (!text.toLowerCase().includes(token.toLowerCase())) throw new Error(`hearing request token missing: ${token}`);
    }
  }
  return text;
}

function main() {
  ensureDir(custodyRoot);
  const fetched = sources.map(fetchSource);
  const report = fetched.find((row) => row.source.id === 'SHD-FY2025-26');
  const reportTextPath = path.join(report.dir, 'report.txt');
  const pdftotext = spawnSync('pdftotext', ['-layout', report.bodyPath, reportTextPath], { cwd: root, encoding: 'utf8' });
  if (pdftotext.status !== 0) throw new Error(`pdftotext failed: ${(pdftotext.stderr || pdftotext.stdout || '').trim()}`);
  const reportText = fs.readFileSync(reportTextPath, 'utf8').replace(/\r\n/g, '\n');
  write(reportTextPath, reportText);
  const reportFacts = parseReport(reportText);
  const htmlFacts = {};
  for (const row of fetched.filter((item) => item.source.kind === 'html')) {
    const html = fs.readFileSync(row.bodyPath, 'utf8');
    const text = assertHtmlSource(row.source.id, html);
    const textPath = path.join(row.dir, 'page.txt');
    write(textPath, `${text}\n`);
    htmlFacts[row.source.id] = {
      text_path: path.relative(root, textPath).replaceAll(path.sep, '/'),
      text_bytes: Buffer.byteLength(`${text}\n`),
      text_sha256: sha256(Buffer.from(`${text}\n`))
    };
  }
  const ledger = {
    schema_version: 'ssc-rd04-a05-source-ledger@1',
    acquisition_id: 'SSC-RD04-SNAP-A05',
    as_of: '2026-08-02',
    sources: fetched.map((row) => ({ ...row.meta, ...(htmlFacts[row.source.id] ?? {}) })),
    report_text: {
      path: path.relative(root, reportTextPath).replaceAll(path.sep, '/'),
      bytes: Buffer.byteLength(reportText),
      sha256: sha256(Buffer.from(reportText))
    },
    normalized_facts: reportFacts,
    boundaries: {
      source_bytes_prove_case_level_join: false,
      aggregate_counts_form_one_cohort: false,
      cross_program_outcomes_are_calfresh_outcomes: false,
      graph_effect: 'none'
    }
  };
  write(path.join(custodyRoot, 'source-ledger.json'), stable(ledger));
  console.log(`acquire-status-sovereignty-rd04-california-remedy-chain-a05: ${ledger.sources.length} official sources, report totals verified`);
}

main();
