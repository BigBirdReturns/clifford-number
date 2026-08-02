#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('a06-semantics');
const registry = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const cookiePath = path.join(root, 'cookies.txt');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

ensureDir(root);

function curl(args, label) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    timeout: 420_000
  });
  if (result.status !== 0) {
    throw new Error(`${label} curl failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

curl([
  '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
  '--retry', '2', '--retry-delay', '2', '--max-time', '180',
  '--user-agent', 'clifford-number-public-record-acquisition/1.0',
  '--cookie-jar', cookiePath,
  '--dump-header', path.join(root, 'registry-page-headers.txt'),
  '--output', path.join(root, 'registry-page.html'),
  registry
], 'registry page');

const variants = [
  {
    id: 'frozen_exact',
    authority: 'frozen_denominator',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/2025'],
      ['releasedBefore', '06/30/2026'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ],
    preserveRaw: true
  },
  {
    id: 'browser_serialized_order',
    authority: 'mechanical_form_semantics_only',
    parameters: [
      ['releasedAfter', '07/01/2025'],
      ['releasedBefore', '06/30/2026'],
      ['programType', '2'],
      ['shnNumber', ''],
      ['issueCodes', ''],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass'],
      ['isForSearch', '1']
    ]
  },
  {
    id: 'fy_dates_all_programs',
    authority: 'mechanical_filter_isolation_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/2025'],
      ['releasedBefore', '06/30/2026'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_all_dates',
    authority: 'mechanical_filter_isolation_only',
    parameters: [
      ['isForSearch', '1'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_start_only',
    authority: 'mechanical_filter_isolation_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/2025'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_end_only',
    authority: 'mechanical_filter_isolation_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedBefore', '06/30/2026'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_iso_dates',
    authority: 'mechanical_date_encoding_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '2025-07-01'],
      ['releasedBefore', '2026-06-30'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_short_year_dates',
    authority: 'mechanical_date_encoding_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/25'],
      ['releasedBefore', '06/30/26'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_end_next_day',
    authority: 'mechanical_boundary_semantics_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/2025'],
      ['releasedBefore', '07/01/2026'],
      ['programType', '2'],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  },
  {
    id: 'calfresh_empty_select_fields',
    authority: 'mechanical_empty_parameter_semantics_only',
    parameters: [
      ['isForSearch', '1'],
      ['releasedAfter', '07/01/2025'],
      ['releasedBefore', '06/30/2026'],
      ['programType', '2'],
      ['disposition', ''],
      ['responsibleAgency', ''],
      ['shnNumber', ''],
      ['issueCodes', ''],
      ['organizationalAr', ''],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass']
    ]
  }
];

const results = [];
for (const variant of variants) {
  const dir = path.join(root, variant.id);
  ensureDir(dir);
  const bodyPath = path.join(dir, 'response.bin');
  const headersPath = path.join(dir, 'headers.txt');
  const args = [
    '--get', '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '300',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--header', 'Accept: application/json, text/javascript, */*; q=0.01',
    '--header', 'X-Requested-With: XMLHttpRequest',
    '--referer', registry,
    '--cookie', cookiePath
  ];
  for (const [key, value] of variant.parameters) args.push('--data-urlencode', `${key}=${value}`);
  args.push(
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    registry
  );
  const metaText = curl(args, variant.id).trim();
  fs.writeFileSync(path.join(dir, 'curl-meta.txt'), `${metaText}\n`);
  const [statusText, finalUrl, contentType] = metaText.split(/\n/);
  const raw = fs.readFileSync(bodyPath);
  const text = raw.toString('utf8');
  let count = null;
  let jsonArray = false;
  let parseError = null;
  if (/^\s*</.test(text)) {
    parseError = 'html_body';
  } else {
    try {
      const value = JSON.parse(text);
      jsonArray = Array.isArray(value);
      count = jsonArray ? value.length : null;
      if (!jsonArray) parseError = `json_${typeof value}`;
    } catch (error) {
      parseError = error.message;
    }
  }
  results.push({
    id: variant.id,
    authority: variant.authority,
    parameters: variant.parameters,
    http_status: Number(statusText),
    final_url: finalUrl,
    content_type: contentType,
    bytes: raw.length,
    sha256: sha256(raw),
    json_array: jsonArray,
    rows_returned: count,
    parse_error: parseError
  });
  if (!variant.preserveRaw) fs.rmSync(bodyPath);
}

fs.rmSync(cookiePath, { force: true });
const frozen = results.find((row) => row.id === 'frozen_exact');
const summary = {
  schema_version: 'ssc-rd04-a06-registry-semantics@1',
  issue: 721,
  parent_main: '80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589',
  parent_release_sha256: 'b3f36dff2969d95767e6f0d564f7d3744bd72de98cf2b758d4729c6bc0de50c4',
  frozen_query_unchanged: true,
  frozen_result: frozen,
  diagnostics_are_not_alternate_denominators: true,
  variants: results,
  authority: {
    may_identify_input_semantics: true,
    may_select_outcomes: false,
    may_replace_frozen_query_without_explicit_record: false,
    complete_fy_decision_universe: false,
    case_level_join: false,
    graph_effect: 'none'
  }
};
fs.writeFileSync(path.join(root, 'summary.json'), stable(summary));
console.log(JSON.stringify(Object.fromEntries(results.map((row) => [row.id, row.rows_returned]))));
for (const row of results) {
  if (row.http_status !== 200 || !row.json_array) throw new Error(`${row.id} did not return a JSON array`);
}
