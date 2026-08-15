#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeRequestFiles } from '../tools/lib/electric-twin-register-request-core.mjs';
import {
  PDF_MANIFEST_NAME,
  renderRequestPdfs,
} from '../tools/lib/electric-twin-register-request-pdf-core.mjs';
import { renderTextPdf } from '../tools/lib/deterministic-text-pdf.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

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
    register_location_basis: 'registered_office',
    register_location_lines: ['7 Berwick Street', 'London', 'W1F 0PQ'],
    source_urls: [
      'https://find-and-update.company-information.service.gov.uk/company/15173006',
      'https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history',
    ],
  },
  authorization: {
    finalization_authorized: true,
    finalization_record: 'test-pdf-finalization-authorization-001',
    finalized_at: '2026-08-15T13:00:00Z',
    statutory_dispatch_authorized: false,
    statutory_dispatch_record: null,
    voluntary_dispatch_authorized: false,
    voluntary_dispatch_record: null,
  },
};

const privateDir = 'data/local';
const privatePath = `${privateDir}/electric-twin-register-pdf-test-${process.pid}.json`;
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const outputA = `${outputRoot}/pdf-test-${process.pid}-a`;
const outputB = `${outputRoot}/pdf-test-${process.pid}-b`;
const tamperDir = `${outputRoot}/pdf-test-${process.pid}-tamper`;
const symlinkDir = `${outputRoot}/pdf-test-${process.pid}-symlink`;
const cleanupPaths = [privatePath, outputA, outputB, tamperDir, symlinkDir];

fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(privatePath, `${JSON.stringify(privateInput, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(privatePath, 0o600);
for (const target of cleanupPaths.slice(1)) fs.rmSync(target, { recursive: true, force: true });

try {
  finalizeRequestFiles({ inputPath: privatePath, outputDir: outputA });
  finalizeRequestFiles({ inputPath: privatePath, outputDir: outputB });
  const resultA = renderRequestPdfs({ sourceDir: outputA });
  const resultB = renderRequestPdfs({ sourceDir: outputB });

  assert.equal(resultA.state, 'pdfs_rendered_not_dispatched');
  assert.equal(resultA.messages_sent, false);
  assert.equal(resultA.dispatch_ready, false);
  assert.equal(resultA.files.length, 2);
  assert.ok(resultA.files.every((row) => row.pages >= 1));

  for (const fileName of [
    'statutory-register-of-members-request.pdf',
    'voluntary-transaction-instrument-request.pdf',
  ]) {
    const bytesA = fs.readFileSync(path.join(outputA, fileName));
    const bytesB = fs.readFileSync(path.join(outputB, fileName));
    assert.deepEqual(bytesA, bytesB, `${fileName} must be byte-deterministic`);
    assert.equal(bytesA.subarray(0, 8).toString('ascii'), '%PDF-1.4');
    assert.match(bytesA.subarray(-16).toString('ascii'), /%%EOF/u);
    assert.equal(bytesA.includes(Buffer.from('Test Researcher', 'ascii')), true);
    assert.equal(bytesA.includes(Buffer.from('/CreationDate', 'ascii')), false);
    assert.equal(fs.statSync(path.join(outputA, fileName)).mode & 0o077, 0);
  }

  const pdfManifestPath = path.join(outputA, PDF_MANIFEST_NAME);
  const pdfManifest = JSON.parse(fs.readFileSync(pdfManifestPath, 'utf8'));
  assert.equal(pdfManifest.controls.messages_sent, false);
  assert.equal(pdfManifest.controls.dispatch_ready, false);
  assert.equal(pdfManifest.controls.pdfs_rendered, true);
  assert.equal(pdfManifest.controls.postal_dispatch_performed, false);
  assert.equal(pdfManifest.controls.routing_email_sent, false);
  assert.equal(pdfManifest.controls.response_deadline, null);
  assert.equal(pdfManifest.controls.requester_particulars_in_manifest, false);
  assert.equal(pdfManifest.controls.pdfs_contain_requester_particulars, true);
  assert.equal(JSON.stringify(pdfManifest).includes('Test Researcher'), false);
  assert.equal(JSON.stringify(pdfManifest).includes('researcher@example.test'), false);
  assert.equal(fs.statSync(pdfManifestPath).mode & 0o077, 0);

  assert.throws(
    () => renderRequestPdfs({ sourceDir: outputA }),
    /refusing to overwrite existing PDF custody artifact/u,
  );
  assert.throws(
    () => renderRequestPdfs({ sourceDir: outputRoot }),
    /immutable child/u,
  );
  assert.throws(
    () => renderTextPdf('unsupported emoji 😀'),
    /unsupported character/u,
  );

  finalizeRequestFiles({ inputPath: privatePath, outputDir: tamperDir });
  const tamperedPath = path.join(tamperDir, 'statutory-register-of-members-request.txt');
  const tamperedBytes = fs.readFileSync(tamperedPath);
  tamperedBytes[0] = tamperedBytes[0] === 0x54 ? 0x74 : 0x54;
  fs.writeFileSync(tamperedPath, tamperedBytes);
  fs.chmodSync(tamperedPath, 0o600);
  assert.throws(
    () => renderRequestPdfs({ sourceDir: tamperDir }),
    /SHA-256 does not match source manifest/u,
  );

  finalizeRequestFiles({ inputPath: privatePath, outputDir: symlinkDir });
  const statutoryPath = path.join(symlinkDir, 'statutory-register-of-members-request.txt');
  fs.rmSync(statutoryPath);
  fs.symlinkSync('voluntary-transaction-instrument-request.txt', statutoryPath);
  assert.throws(
    () => renderRequestPdfs({ sourceDir: symlinkDir }),
    /symlink path component is not allowed/u,
  );
} finally {
  fs.rmSync(privatePath, { force: true });
  for (const target of cleanupPaths.slice(1)) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-pdf.test: OK');
