import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  acquireFrozenSources,
  validateAcquisitionResult,
  validateSourceLedger
} from '../tools/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'a07-source-acquisition-test-'));
const ledgerPath = path.join(temp, 'source-ledger.json');
const outputRoot = path.join(temp, 'output');
const requestCounts = new Map();

const server = http.createServer((request, response) => {
  const parsed = new URL(request.url, 'http://127.0.0.1');
  requestCounts.set(parsed.pathname, (requestCounts.get(parsed.pathname) ?? 0) + 1);
  if (parsed.pathname === '/ok') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Test-Receipt': 'ok'
    });
    response.end('<html><body>official source</body></html>');
    return;
  }
  if (parsed.pathname === '/redirect') {
    response.writeHead(302, { Location: '/ok?from=redirect' });
    response.end('redirecting');
    return;
  }
  if (parsed.pathname === '/retry') {
    if (requestCounts.get('/retry') === 1) {
      response.writeHead(503, { 'Content-Type': 'text/plain' });
      response.end('retry later');
    } else {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('recovered on bounded retry');
    }
    return;
  }
  if (parsed.pathname === '/restricted') {
    response.writeHead(403, { 'Content-Type': 'text/plain' });
    response.end('authentication required');
    return;
  }
  if (parsed.pathname === '/empty') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end();
    return;
  }
  response.writeHead(404, { 'Content-Type': 'text/plain' });
  response.end('not found');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const source = (sourceId, pathname) => ({
  source_id: sourceId,
  source_class: 'official_state_rule_and_process_surfaces',
  authority: 'synthetic_official_control',
  requested_url: `${base}${pathname}`,
  official_host: '127.0.0.1',
  custody_state: 'pending_exact_custody',
  source_bytes_preserved_in_a07: false,
  eligible_for_case_level_implementation_join: false,
  expected_use: 'exercise exact-byte acquisition without semantic promotion'
});
const ledger = {
  schema_version: 'ssc-rd04-a07-source-ledger@1',
  acquisition_id: 'SSC-RD04-SNAP-A07',
  issue: 741,
  as_of: '2026-08-02',
  sources: [
    source('TEST-OK', '/ok'),
    source('TEST-REDIRECT', '/redirect'),
    source('TEST-RETRY', '/retry'),
    source('TEST-RESTRICTED', '/restricted'),
    source('TEST-EMPTY', '/empty')
  ],
  exact_search_receipt_contract: {
    preserve_requested_url: true,
    preserve_ordered_query: true,
    preserve_request_headers: true,
    preserve_response_headers: true,
    preserve_redirects: true,
    preserve_http_status: true,
    preserve_content_type: true,
    preserve_exact_body: true,
    preserve_body_sha256: true,
    preserve_zero_result_body: true,
    preserve_timestamp: true,
    retry_limit: 2,
    query_expansion_after_result_inspection: false
  },
  boundaries: {
    policy_proves_case_compliance: false,
    aggregate_proves_case_compliance: false,
    decision_order_proves_implementation: false,
    submitted_report_proves_issuance: false,
    absence_of_public_receipt_proves_noncompliance: false,
    one_county_proves_statewide_prevalence: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none'
  }
};
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

try {
  const preflight = validateSourceLedger(ledger, { enforceFrozenCount: false, allowHttp: true });
  if (preflight.length) throw new Error(`synthetic ledger failed preflight:\n${preflight.join('\n')}`);

  const result = await acquireFrozenSources({
    ledgerPath,
    outputRoot,
    timeoutMs: 5_000,
    retryDelayMs: 5,
    enforceFrozenCount: false,
    allowHttp: true
  });
  if (result.counts.frozen_sources !== 5 || result.counts.terminal_sources !== 5) {
    throw new Error('source denominator failed');
  }
  if (result.counts.exact_successful_bodies !== 3) throw new Error('exact-success count failed');
  if (result.counts.terminal_states.exact_response_preserved_pending_semantic_classification !== 3) {
    throw new Error('success terminal-state count failed');
  }
  if (result.counts.terminal_states.source_restricted !== 1) throw new Error('restricted state failed');
  if (result.counts.terminal_states.malformed_or_conflicting !== 1) throw new Error('empty-body state failed');

  const byId = new Map(result.sources.map((row) => [row.source_id, row]));
  if (byId.get('TEST-OK').attempts !== 1) throw new Error('OK source retried');
  if (byId.get('TEST-REDIRECT').attempts !== 1) throw new Error('redirect source retried');
  if (byId.get('TEST-RETRY').attempts !== 2) throw new Error('transient source did not retry exactly once');
  if (byId.get('TEST-RESTRICTED').attempts !== 1) throw new Error('restricted source retried');
  if (byId.get('TEST-EMPTY').attempts !== 2) throw new Error('empty source did not receive bounded retry');

  const redirectAttempt = JSON.parse(fs.readFileSync(
    path.join(outputRoot, 'TEST-REDIRECT/attempt-1/attempt.json'),
    'utf8'
  ));
  if (redirectAttempt.redirect_hops !== 2) throw new Error('redirect chain not preserved');
  const retryFirst = JSON.parse(fs.readFileSync(
    path.join(outputRoot, 'TEST-RETRY/attempt-1/attempt.json'),
    'utf8'
  ));
  const retrySecond = JSON.parse(fs.readFileSync(
    path.join(outputRoot, 'TEST-RETRY/attempt-2/attempt.json'),
    'utf8'
  ));
  if (retryFirst.http_status !== 503 || retrySecond.http_status !== 200) {
    throw new Error('bounded retry receipts incorrect');
  }

  const validation = validateAcquisitionResult(outputRoot, { expectedSources: 5 });
  if (validation.length) throw new Error(`acquisition result failed validation:\n${validation.join('\n')}`);
  for (const row of result.sources) {
    if (row.semantic_classification_complete !== false) throw new Error('semantic classification inflated');
    if (row.eligible_for_case_level_implementation_join !== false) throw new Error('join eligibility inflated');
    if (row.implementation_observed !== false) throw new Error('implementation inferred');
    if (row.complete_restoration_observed !== false) throw new Error('restoration inferred');
    if (row.remedy_timeliness_observed !== false) throw new Error('timeliness inferred');
  }
  if (result.authority.source_unavailable_proves_noncompliance !== false) {
    throw new Error('source absence became noncompliance');
  }
  if (result.authority.graph_effect !== 'none') throw new Error('graph effect inflated');

  const mutations = [
    ['retry limit', (draft) => { draft.exact_search_receipt_contract.retry_limit = 3; }, 'retry limit'],
    ['query shopping', (draft) => { draft.exact_search_receipt_contract.query_expansion_after_result_inspection = true; }, 'query expansion boundary'],
    ['duplicate identity', (draft) => { draft.sources[1].source_id = draft.sources[0].source_id; }, 'duplicate source identities'],
    ['host substitution', (draft) => { draft.sources[0].official_host = 'example.com'; }, 'official host TEST-OK'],
    ['invented custody', (draft) => { draft.sources[0].source_bytes_preserved_in_a07 = true; }, 'pre-acquisition byte state TEST-OK'],
    ['invented join', (draft) => { draft.sources[0].eligible_for_case_level_implementation_join = true; }, 'pre-acquisition case-join state TEST-OK'],
    ['absence laundering', (draft) => { draft.boundaries.absence_of_public_receipt_proves_noncompliance = true; }, 'source boundary absence_of_public_receipt_proves_noncompliance']
  ];
  for (const [name, mutate, expected] of mutations) {
    const draft = structuredClone(ledger);
    mutate(draft);
    const errors = validateSourceLedger(draft, { enforceFrozenCount: false, allowHttp: true });
    if (!errors.some((error) => error.includes(expected))) {
      throw new Error(`${name} mutation was not refused: ${JSON.stringify(errors)}`);
    }
  }

  const okBody = path.join(outputRoot, byId.get('TEST-OK').body_path);
  const originalBody = fs.readFileSync(okBody);
  fs.writeFileSync(okBody, Buffer.concat([originalBody, Buffer.from('tamper')]));
  const tampered = validateAcquisitionResult(outputRoot, { expectedSources: 5 });
  if (!tampered.some((error) => error.includes('body bytes TEST-OK') || error.includes('body hash TEST-OK'))) {
    throw new Error(`body tampering was not refused: ${JSON.stringify(tampered)}`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.test: 5 synthetic sources + 8 adversarial controls PASS');
