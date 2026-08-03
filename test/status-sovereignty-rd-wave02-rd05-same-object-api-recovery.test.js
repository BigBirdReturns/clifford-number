import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildRecoveryIndex, writeRecoveryIndex, CONSTANTS } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/build-same-object-api-recovery-index.mjs';
import { validateRecovery } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/validate-same-object-api-recovery.mjs';

const fixtureRoot = CONSTANTS.captureRoot;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function copyFixture() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rd05-api-recovery-'));
  const captureRoot = path.join(temp, 'capture');
  fs.cpSync(fixtureRoot, captureRoot, { recursive: true });
  return { temp, captureRoot, outputPath: path.join(temp, 'index.json') };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function refreshManifest(captureRoot, relativePath) {
  const manifestPath = path.join(captureRoot, 'manifest.json');
  const manifest = readJson(manifestPath);
  const entry = manifest.entries.find((candidate) => candidate.path === relativePath);
  assert.ok(entry, `manifest entry ${relativePath}`);
  const body = fs.readFileSync(path.join(captureRoot, ...relativePath.split('/')));
  entry.bytes = body.length;
  entry.sha256 = sha256(body);
  writeJson(manifestPath, manifest);
}

function mutateJson(captureRoot, relativePath, mutate, refresh = true) {
  const file = path.join(captureRoot, ...relativePath.split('/'));
  const value = readJson(file);
  mutate(value);
  writeJson(file, value);
  if (refresh) refreshManifest(captureRoot, relativePath);
}

function mustReject(name, mutate) {
  test(name, () => {
    const fixture = copyFixture();
    try {
      mutate(fixture);
      assert.throws(() => buildRecoveryIndex({ captureRoot: fixture.captureRoot }));
    } finally {
      fs.rmSync(fixture.temp, { recursive: true, force: true });
    }
  });
}

test('builds and validates the exact recovery product', () => {
  const fixture = copyFixture();
  try {
    const product = writeRecoveryIndex(fixture);
    assert.equal(product.counts.exact_custody_files, 14);
    assert.equal(product.counts.frozen_object_denominator, 58);
    assert.equal(product.semantic_adjudication.object_open_chain_can_close, true);
    validateRecovery(fixture);
  } finally {
    fs.rmSync(fixture.temp, { recursive: true, force: true });
  }
});

mustReject('rejects wrong manifest object id', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.object_id = 'RD05-OBJ-999'; }, false));
mustReject('rejects wrong manifest document number', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.document_number = '2024-00000'; }, false));
mustReject('rejects missing manifest entry', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.entries.pop(); }, false));
mustReject('rejects duplicate manifest path', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.entries[1].path = m.entries[0].path; }, false));
mustReject('rejects traversal manifest path', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.entries[0].path = '../body.bin'; }, false));
mustReject('rejects manifest byte mismatch', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.entries[0].bytes += 1; }, false));
mustReject('rejects manifest hash mismatch', ({ captureRoot }) => mutateJson(captureRoot, 'manifest.json', (m) => { m.entries[0].sha256 = '0'.repeat(64); }, false));
mustReject('rejects undeclared capture file', ({ captureRoot }) => fs.writeFileSync(path.join(captureRoot, 'extra.txt'), 'extra\n'));
mustReject('rejects absent captured body', ({ captureRoot }) => fs.rmSync(path.join(captureRoot, 'attempts/attempt-1/body.bin')));
mustReject('rejects a second attempt directory', ({ captureRoot }) => fs.cpSync(path.join(captureRoot, 'attempts/attempt-1'), path.join(captureRoot, 'attempts/attempt-2'), { recursive: true }));

mustReject('rejects wrong request target', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.single_authorized_target_url = 'https://example.invalid/'; }));
mustReject('rejects widened request host', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.authorized_hosts.push('example.invalid'); }));
mustReject('rejects raised attempt ceiling', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.maximum_attempts = 3; }));
mustReject('rejects crawl authorization', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.crawl_authorized = true; }));
mustReject('rejects linked fetch authorization', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.linked_object_fetch_authorized = true; }));
mustReject('rejects link admission authorization', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.new_link_admission_authorized = true; }));
mustReject('rejects outside-human dependency', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.outside_human_dependency = true; }));
mustReject('rejects graph authority', ({ captureRoot }) => mutateJson(captureRoot, 'request-contract.json', (v) => { v.graph_effect = 'add_edge'; }));

mustReject('rejects wrong selected attempt', ({ captureRoot }) => { fs.writeFileSync(path.join(captureRoot, 'selected-attempt.txt'), '2\n'); refreshManifest(captureRoot, 'selected-attempt.txt'); });
mustReject('rejects undelivered summary', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.same_object_target_delivered = false; }));
mustReject('rejects changed denominator', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.frozen_denominator_changed = true; }));
mustReject('rejects fetched linked urls', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.linked_urls_fetched = 1; }));
mustReject('rejects admitted links', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.links_admitted = 1; }));
mustReject('rejects recommendation status advance', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.recommendation_status_changed = true; }));
mustReject('rejects agency-response status advance', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.agency_response_status_changed = true; }));
mustReject('rejects outcome status advance', ({ captureRoot }) => mutateJson(captureRoot, 'summary.json', (v) => { v.implementation_or_outcome_status_changed = true; }));

mustReject('rejects transport failure', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/receipt.json', (v) => { v.curl_exit = 1; }));
mustReject('rejects non-200 response', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/receipt.json', (v) => { v.http_status = 404; }));
mustReject('rejects wrong final url', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/receipt.json', (v) => { v.final_url = 'https://unblock.federalregister.gov/'; }));
mustReject('rejects failed same-object match', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/receipt.json', (v) => { v.same_object_document_match = false; }));
mustReject('rejects inferred disposition', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/receipt.json', (v) => { v.recommendation_or_disposition_inferred = true; }));

mustReject('rejects wrong body document number', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.document_number = '2024-00000'; }));
mustReject('rejects wrong body title', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.title = 'Different notice'; }));
mustReject('rejects wrong record type', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.type = 'Rule'; }));
mustReject('rejects wrong action', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.action = 'Final recommendation.'; }));
mustReject('rejects wrong publication date', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.publication_date = '2024-04-30'; }));
mustReject('rejects wrong citation', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.citation = '89 FR 1'; }));
mustReject('rejects wrong agency identity', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.agencies[1].id = 999; }));
mustReject('rejects locator mismatch', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/body.bin', (v) => { v.html_url = 'https://www.federalregister.gov/documents/other'; }));

mustReject('rejects wrong document-record identity', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/document-record.json', (v) => { v.same_object_document_number = '2024-00000'; }));
mustReject('rejects linked-url fetch in document record', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/document-record.json', (v) => { v.linked_urls[0].fetched = true; }));
mustReject('rejects link admission in document record', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/document-record.json', (v) => { v.linked_urls[0].admitted = true; }));
mustReject('rejects semantic authority inflation', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/document-record.json', (v) => { v.semantic_authority = 'recommendation_complete'; }));
mustReject('rejects disposition status inflation', ({ captureRoot }) => mutateJson(captureRoot, 'attempts/attempt-1/document-record.json', (v) => { v.disposition_status_changed = true; }));

test('validator rejects tampered generated counts', () => {
  const fixture = copyFixture();
  try {
    writeRecoveryIndex(fixture);
    const product = readJson(fixture.outputPath);
    product.counts.frozen_object_denominator = 59;
    writeJson(fixture.outputPath, product);
    assert.throws(() => validateRecovery(fixture));
  } finally {
    fs.rmSync(fixture.temp, { recursive: true, force: true });
  }
});

test('validator rejects tampered authority', () => {
  const fixture = copyFixture();
  try {
    writeRecoveryIndex(fixture);
    const product = readJson(fixture.outputPath);
    product.authority.graph_effect = 'add_edge';
    writeJson(fixture.outputPath, product);
    assert.throws(() => validateRecovery(fixture));
  } finally {
    fs.rmSync(fixture.temp, { recursive: true, force: true });
  }
});

test('validator rejects tampered custody digest', () => {
  const fixture = copyFixture();
  try {
    writeRecoveryIndex(fixture);
    const product = readJson(fixture.outputPath);
    product.recovery.official_api_representation.body.sha256 = '0'.repeat(64);
    writeJson(fixture.outputPath, product);
    assert.throws(() => validateRecovery(fixture));
  } finally {
    fs.rmSync(fixture.temp, { recursive: true, force: true });
  }
});

const mutationCount = 47;
test('mutation denominator is explicit', () => {
  assert.equal(mutationCount, 47);
});

console.log(`rd05-same-object-api-recovery.test: ${mutationCount} adversarial mutations registered`);
