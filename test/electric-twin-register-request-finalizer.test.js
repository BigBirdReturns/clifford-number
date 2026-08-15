#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  finalizeRequestFiles,
  renderFinalizedRequests,
  validatePrivateInput,
} from '../tools/lib/electric-twin-register-request-core.mjs';
import { validateTrackedElectricTwinRequestPacket } from '../tools/validate-electric-twin-register-request-packet.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const examplePath = 'data/research/electric-twin-register-of-members-acquisition/requester-input.example.json';
const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
assert.throws(() => validatePrivateInput(example), /placeholder|finalization_authorized/u);

const privateInput = {
  schema_version: 'electric-twin-register-request-private-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  requester: {
    full_name: 'Test Researcher',
    postal_address_lines: ['1 Test Street', 'London', 'SW1A 1AA'],
    email: 'researcher@example.test',
  },
  request_date: '2026-08-15',
  disclosure_recipients: ['NO OTHER PERSON'],
  location_verification: {
    checked_at: '2026-08-15',
    registered_office_lines: ['7 Berwick Street', 'London', 'W1F 0PQ'],
    register_location_basis: 'sail',
    register_location_lines: ['2 Inspection Road', 'London', 'EC1A 1AA'],
    source_urls: [
      'https://find-and-update.company-information.service.gov.uk/company/15173006',
      'https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history',
    ],
  },
  authorization: {
    finalization_authorized: true,
    finalization_record: 'test-finalization-authorization-001',
    finalized_at: '2026-08-15T12:00:00Z',
    statutory_dispatch_authorized: false,
    statutory_dispatch_record: null,
    voluntary_dispatch_authorized: false,
    voluntary_dispatch_record: null,
  },
};

const template = fs.readFileSync('docs/requests/electric-twin-section-116-register-of-members-request.md', 'utf8');
const rendered = renderFinalizedRequests(template, privateInput);
assert.equal(rendered.statutory, renderFinalizedRequests(template, privateInput).statutory);
assert.equal(rendered.voluntary, renderFinalizedRequests(template, privateInput).voluntary);
assert.match(rendered.statutory, /2 Inspection Road/u);
assert.doesNotMatch(rendered.statutory, /7 Berwick Street/u);
assert.match(rendered.voluntary, /7 Berwick Street/u);
assert.match(rendered.statutory, /Test Researcher/u);
assert.match(rendered.statutory, /15 August 2026/u);
assert.doesNotMatch(rendered.statutory, /\[[^\]]+\]/u);
assert.doesNotMatch(rendered.voluntary, /\[[^\]]+\]/u);

const privateDir = 'data/local';
const privatePath = `${privateDir}/electric-twin-register-finalizer-test-${process.pid}.json`;
const outputDir = `build/source-acquisition/electric-twin-register-of-members/test-${process.pid}`;
fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(privatePath, `${JSON.stringify(privateInput, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(privatePath, 0o600);
fs.rmSync(outputDir, { recursive: true, force: true });

try {
  assert.throws(
    () => finalizeRequestFiles({ inputPath: 'request.json', outputDir }),
    /private input must remain under ignored data\/local/u,
  );
  assert.throws(
    () => finalizeRequestFiles({ inputPath: privatePath, outputDir: 'build/untracked-finalization' }),
    /output must remain under ignored build\/source-acquisition/u,
  );

  const result = finalizeRequestFiles({ inputPath: privatePath, outputDir });
  assert.equal(result.state, 'source_finalized_not_dispatch_authorized');
  assert.equal(result.messages_sent, false);
  assert.equal(result.files.length, 2);

  const manifestPath = path.join(outputDir, 'outbound-source-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.controls.messages_sent, false);
  assert.equal(manifest.controls.dispatch_ready, false);
  assert.equal(manifest.controls.pdfs_rendered, false);
  assert.equal(manifest.controls.postal_dispatch_performed, false);
  assert.equal(manifest.controls.routing_email_sent, false);
  assert.equal(manifest.controls.response_deadline, null);
  assert.equal(manifest.controls.requester_particulars_in_manifest, false);
  assert.equal(JSON.stringify(manifest).includes('Test Researcher'), false);
  assert.equal(JSON.stringify(manifest).includes('researcher@example.test'), false);
  assert.equal(fs.statSync(outputDir).mode & 0o077, 0);
  assert.equal(fs.statSync(path.join(outputDir, 'statutory-register-of-members-request.txt')).mode & 0o077, 0);
  assert.equal(fs.statSync(path.join(outputDir, 'voluntary-transaction-instrument-request.txt')).mode & 0o077, 0);
  assert.equal(fs.statSync(manifestPath).mode & 0o077, 0);

  assert.throws(
    () => finalizeRequestFiles({ inputPath: privatePath, outputDir }),
    /refusing to overwrite existing finalization directory/u,
  );
} finally {
  fs.rmSync(privatePath, { force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });
}

assert.deepEqual(validateTrackedElectricTwinRequestPacket(), {
  acquisition_id: 'ET-ROM-2025-09-01',
  status: 'prepared_not_sent',
  authority: 'not_authorized',
  messages_sent: false,
});

console.log('electric-twin-register-request-finalizer.test: OK');
