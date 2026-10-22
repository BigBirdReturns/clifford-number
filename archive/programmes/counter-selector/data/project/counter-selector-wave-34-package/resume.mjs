#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function atomicWrite(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, text, 'utf8');
  fs.renameSync(temporary, filePath);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function execute(packageDirectory, outputDirectory) {
  const manifestPath = path.join(packageDirectory, 'package-manifest.json');
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));

  if (manifest.schema_version !== 'counter-selector-wave-34-package-manifest@1') {
    fail('unsupported package manifest schema');
  }
  if (manifest.package_id !== 'CS-W34-PACKAGE-01' || manifest.package_version !== '1.0.0') {
    fail('unexpected package identity');
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length !== 7) {
    fail('unexpected package entry count');
  }

  const receivedEntries = [];
  for (const entry of manifest.entries) {
    const entryPath = path.join(packageDirectory, entry.path);
    const bytes = fs.readFileSync(entryPath);
    if (bytes.length !== entry.bytes) {
      fail(`package entry byte-count mismatch: ${entry.path}`);
    }
    if (sha256(bytes) !== entry.sha256) {
      fail(`package entry hash mismatch: ${entry.path}`);
    }
    receivedEntries.push(entry.path);
  }

  const combinedMaterial = manifest.entries
    .map(entry => `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`)
    .join('');
  if (sha256(Buffer.from(combinedMaterial, 'utf8')) !== manifest.combined_sha256) {
    fail('package combined digest mismatch');
  }

  const dependencies = readJson(path.join(packageDirectory, 'dependency-inventory.json'));
  if (dependencies.repository_checkout_required !== false ||
      dependencies.network_required !== false ||
      dependencies.undeclared_dependencies_permitted !== false ||
      dependencies.secret_inputs_required.length !== 0 ||
      dependencies.external_services_required.length !== 0) {
    fail('dependency inventory exceeds bounded package authority');
  }
  const runtimeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (!Number.isInteger(runtimeMajor) || runtimeMajor < dependencies.runtime.minimum_major) {
    fail('unsupported runtime version');
  }

  const authority = readJson(path.join(packageDirectory, 'authority-ledger.json'));
  if (authority.required_credentials.length !== 0 ||
      !authority.required_access.includes('read package directory') ||
      !authority.required_access.includes('write successor output directory')) {
    fail('authority or credential ledger invalid');
  }

  const decisions = readJson(path.join(packageDirectory, 'open-decision-inventory.json'));
  if (decisions.complete_for_bounded_operation !== true ||
      decisions.open_decisions.length !== 0 ||
      decisions.open_risks.length !== 0 ||
      decisions.deadlines.length !== 0 ||
      decisions.owners.length !== 0) {
    fail('bounded open-decision inventory incomplete');
  }

  const rollback = readJson(path.join(packageDirectory, 'rollback-plan.json'));
  if (rollback.safe_decline !== 'exit nonzero before successor or acknowledgment publication' ||
      rollback.external_side_effects.length !== 0) {
    fail('rollback and safe-decline contract invalid');
  }

  const operation = readJson(path.join(packageDirectory, 'operation-contract.json'));
  const before = readJson(path.join(packageDirectory, 'object-before.json'));
  if (before.object_id !== operation.object_id ||
      before.state !== operation.from_state ||
      before.sequence !== operation.from_sequence ||
      before.value !== operation.from_value) {
    fail('pretransition object mismatch');
  }

  const successor = {
    schema_version: before.schema_version,
    object_id: before.object_id,
    state: operation.to_state,
    sequence: operation.to_sequence,
    value: operation.to_value,
    lineage: [...before.lineage, `${operation.to_state}@${operation.to_sequence}`],
    preserved_valid_work: [...before.valid_work]
  };

  if (successor.object_id !== before.object_id ||
      successor.sequence !== before.sequence + 1 ||
      successor.value !== before.value + 1 ||
      successor.lineage.length !== before.lineage.length + 1 ||
      successor.preserved_valid_work.length !== before.valid_work.length) {
    fail('successor invariant failure');
  }

  const manifestSha256 = sha256(manifestBytes);
  const acknowledgment = {
    schema_version: 'counter-selector-wave-34-recipient-acknowledgment@1',
    package_id: manifest.package_id,
    package_version: manifest.package_version,
    package_manifest_sha256: manifestSha256,
    received_entries: receivedEntries,
    entry_hashes_verified: true,
    authority_ledger_acknowledged: true,
    dependency_inventory_acknowledged: true,
    open_decision_inventory_acknowledged: true,
    rollback_plan_acknowledged: true,
    repository_checkout_observed: fs.existsSync(path.join(process.cwd(), '.git')),
    credential_inputs_used: [],
    network_dependency_used: false,
    external_services_used: [],
    successor_object_sha256: sha256(Buffer.from(stableJson(successor), 'utf8')),
    successor_state: successor.state,
    successor_sequence: successor.sequence,
    successor_value: successor.value
  };

  const successorPath = path.join(outputDirectory, 'successor-object.json');
  const acknowledgmentPath = path.join(outputDirectory, 'recipient-acknowledgment.json');
  atomicWrite(successorPath, stableJson(successor));
  atomicWrite(acknowledgmentPath, stableJson(acknowledgment));

  return { successor, acknowledgment };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packageDirectory = path.resolve(process.argv[2] ?? '.');
  const outputDirectory = path.resolve(process.argv[3] ?? 'successor-output');
  execute(packageDirectory, outputDirectory);
  console.log('counter-selector-wave-34 package resumed successfully');
}
