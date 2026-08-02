#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const custody = path.resolve(process.env.A08_REFRESH_ROOT || path.join(root, 'data/intake/status-sovereignty-rd04-internal-adjudication-a08/source-custody/public-refresh'));
const expectedUrl = 'https://courts.ca.gov/california-courts-where-balance-restored';
const expectedUrlSha = '08a9cbb8b314e5389d73a61b06cc9b93c9df08eba0dd3e7318686d5888409c6b';
const expectedBody = Buffer.from('The website encountered an unexpected error. Please try again later.', 'utf8');
const expectedBodySha = '1f883abab1679fe55395f88313619fa1ed2236c6875895ac37cd4a1f11e511ce';
const expectedHeaderShas = [
  'd5fba3ae97a2c1b514d68bcdf3a02a02718451fbe9b517efb873000e10c4adc3',
  '74e90706d0169c991a65d70c6c2287261855b0f83b769b43bc19e3d6d812f2f5',
  '63f3af83a6307bf48b98733f76a2ef979004417112e4b5ca59e13ee877d90391'
];
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const summary = readJson(path.join(custody, 'summary.json'));
assert(summary.schema_version === 'ssc-rd04-a08-public-source-refresh@1', `schema ${summary.schema_version}`);
assert(summary.issue === 765, `issue ${summary.issue}`);
assert(summary.parent_a07_release_sha256 === 'a4be788259cd48235006d06b43271e61de625b72f2c7bb6d8663e63b82d520a3', 'parent digest');
assert(summary.frozen_url === expectedUrl, `URL ${summary.frozen_url}`);
assert(summary.frozen_url_sha256 === expectedUrlSha && sha256(Buffer.from(expectedUrl)) === expectedUrlSha, 'URL digest');
assert(summary.attempt_limit === 3 && summary.attempts.length === 3, 'attempt denominator');
assert(summary.status === 'pass_unresolved_after_bounded_retry', `status ${summary.status}`);
assert(summary.counts.frozen_urls === 1 && summary.counts.attempts === 3, 'refresh counts');
assert(summary.counts.resolved_urls === 0 && summary.counts.unresolved_urls === 1, 'resolution counts');
assert(summary.counts.external_contacts === 0 && summary.counts.external_reviews === 0 && summary.counts.graph_effects === 0, 'authority counters');
assert(summary.authority.failed_fetch_is_record_absence === false, 'failed-fetch boundary');
assert(summary.authority.missing_public_material_is_noncompliance === false, 'noncompliance boundary');
assert(summary.authority.outside_human_dependency === false && summary.authority.project_blocking === false, 'human/blocking boundary');

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const dir = path.join(custody, `attempt-${attempt}`);
  const body = fs.readFileSync(path.join(dir, 'body.bin'));
  const headers = fs.readFileSync(path.join(dir, 'headers.txt'));
  const exit = fs.readFileSync(path.join(dir, 'curl-exit.txt'), 'utf8');
  const meta = fs.readFileSync(path.join(dir, 'curl-meta.txt'), 'utf8');
  const stderr = fs.readFileSync(path.join(dir, 'curl-stderr.txt'));
  assert(body.equals(expectedBody), `attempt ${attempt} body bytes`);
  assert(body.length === 68 && sha256(body) === expectedBodySha, `attempt ${attempt} body digest`);
  assert(sha256(headers) === expectedHeaderShas[attempt - 1], `attempt ${attempt} header digest`);
  assert(exit === '0\n', `attempt ${attempt} curl exit`);
  assert(meta === `500\n${expectedUrl}\ntext/html; charset=UTF-8\n`, `attempt ${attempt} curl metadata`);
  assert(stderr.length === 0, `attempt ${attempt} stderr`);
  const receipt = summary.attempts[attempt - 1];
  assert(receipt.attempt === attempt && receipt.curl_exit === 0 && receipt.http_status === 500, `attempt ${attempt} receipt`);
  assert(receipt.body_bytes === body.length && receipt.body_sha256 === sha256(body), `attempt ${attempt} body receipt`);
  assert(receipt.headers_bytes === headers.length && receipt.headers_sha256 === sha256(headers), `attempt ${attempt} header receipt`);
}
console.log('verify-bounded-public-refresh-v1: PASS — one frozen URL, three exact HTTP 500 receipts, unresolved remains nonblocking');
