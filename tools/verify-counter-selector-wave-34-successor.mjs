#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-34-executable-handoff-control.json';
const PACKAGE_MANIFEST_PATH = 'data/project/counter-selector-wave-34-package/package-manifest.json';

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function verifySuccessor(outputDirectory) {
  const source = readJson(path.join(ROOT, SOURCE_PATH));
  const packageManifestBytes = fs.readFileSync(path.join(ROOT, PACKAGE_MANIFEST_PATH));
  const packageManifest = JSON.parse(packageManifestBytes.toString('utf8'));

  const successor = readJson(path.join(outputDirectory, 'successor-object.json'));
  const acknowledgment = readJson(path.join(outputDirectory, 'recipient-acknowledgment.json'));
  const declineProof = readJson(path.join(outputDirectory, 'safe-decline-proof.json'));

  assert.deepEqual(successor, source.control.expected_successor_object);
  assert.equal(acknowledgment.schema_version, 'counter-selector-wave-34-recipient-acknowledgment@1');
  assert.equal(acknowledgment.package_id, source.control.package_id);
  assert.equal(acknowledgment.package_version, source.control.package_version);
  assert.equal(acknowledgment.package_manifest_sha256, sha256(packageManifestBytes));
  assert.deepEqual(acknowledgment.received_entries, packageManifest.entries.map(entry => entry.path));
  assert.equal(acknowledgment.entry_hashes_verified, true);
  assert.equal(acknowledgment.authority_ledger_acknowledged, true);
  assert.equal(acknowledgment.dependency_inventory_acknowledged, true);
  assert.equal(acknowledgment.open_decision_inventory_acknowledged, true);
  assert.equal(acknowledgment.rollback_plan_acknowledged, true);
  assert.equal(acknowledgment.repository_checkout_observed, false);
  assert.deepEqual(acknowledgment.credential_inputs_used, []);
  assert.equal(acknowledgment.network_dependency_used, false);
  assert.deepEqual(acknowledgment.external_services_used, []);
  assert.equal(
    acknowledgment.successor_object_sha256,
    sha256(Buffer.from(stableJson(successor), 'utf8'))
  );
  assert.equal(acknowledgment.successor_state, 'resumed');
  assert.equal(acknowledgment.successor_sequence, 18);
  assert.equal(acknowledgment.successor_value, 42);

  assert.equal(declineProof.schema_version, 'counter-selector-wave-34-safe-decline-proof@1');
  assert.equal(declineProof.package_id, source.control.package_id);
  assert.equal(declineProof.corrupted_entry, 'object-before.json');
  assert.equal(declineProof.recipient_exit_nonzero, true);
  assert.equal(declineProof.successor_output_absent, true);
  assert.equal(declineProof.acknowledgment_output_absent, true);
  assert.equal(declineProof.classification, 'corrupted_package_refused_before_publication');

  return { successor, acknowledgment, declineProof };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputDirectory = path.resolve(process.argv[2] ?? 'successor-output');
  verifySuccessor(outputDirectory);
  console.log('verify-counter-selector-wave-34-successor: exact successor, acknowledgment, and safe decline verified');
}
