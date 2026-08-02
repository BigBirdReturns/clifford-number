#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateAll, validateSource } from '../tools/validate-counter-selector-wave-34.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-34-executable-handoff-control.json';
const PACKAGE_DIR = 'data/project/counter-selector-wave-34-package';

function clone(value) {
  return structuredClone(value);
}

function expectRejected(source, mutate, label) {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, label);
}

function testExecutablePackage() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-w34-'));
  const packageDirectory = path.join(temporary, 'package');
  const outputDirectory = path.join(temporary, 'output');
  fs.cpSync(path.join(ROOT, PACKAGE_DIR), packageDirectory, { recursive: true });

  const valid = spawnSync(process.execPath, [
    path.join(packageDirectory, 'resume.mjs'),
    packageDirectory,
    outputDirectory
  ], { cwd: temporary, encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(fs.existsSync(path.join(outputDirectory, 'successor-object.json')), true);
  assert.equal(fs.existsSync(path.join(outputDirectory, 'recipient-acknowledgment.json')), true);
  const acknowledgment = JSON.parse(fs.readFileSync(
    path.join(outputDirectory, 'recipient-acknowledgment.json'), 'utf8'));
  assert.equal(acknowledgment.repository_checkout_observed, false);

  const corruptedDirectory = path.join(temporary, 'corrupted');
  const refusedDirectory = path.join(temporary, 'refused');
  fs.cpSync(packageDirectory, corruptedDirectory, { recursive: true });
  fs.appendFileSync(path.join(corruptedDirectory, 'object-before.json'), ' ');
  const refused = spawnSync(process.execPath, [
    path.join(corruptedDirectory, 'resume.mjs'),
    corruptedDirectory,
    refusedDirectory
  ], { cwd: temporary, encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /package entry (byte-count|hash) mismatch/);
  assert.equal(fs.existsSync(path.join(refusedDirectory, 'successor-object.json')), false);
  assert.equal(fs.existsSync(path.join(refusedDirectory, 'recipient-acknowledgment.json')), false);
}

function adversarialMutations() {
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, SOURCE_PATH), 'utf8'));
  const mutations = [];

  for (const key of Object.keys(source.counts)) {
    mutations.push({
      label: `count:${key}`,
      apply: candidate => { candidate.counts[key] += 1; }
    });
  }

  for (const key of Object.keys(source.boundaries).filter(key => key !== 'graph_effect')) {
    mutations.push({
      label: `boundary:${key}`,
      apply: candidate => { candidate.boundaries[key] = true; }
    });
  }

  source.control.package_paths.forEach((_, index) => {
    mutations.push({
      label: `package-path:${index}`,
      apply: candidate => { candidate.control.package_paths[index] = `mutated-${index}`; }
    });
  });

  source.handoff_contract.component_order.forEach((_, index) => {
    mutations.push({
      label: `component-order:${index}`,
      apply: candidate => { candidate.handoff_contract.component_order[index] = `mutated-component-${index}`; }
    });
  });

  source.handoff_contract.complete_bounded_package_requires.forEach((_, index) => {
    mutations.push({
      label: `package-requirement:${index}`,
      apply: candidate => { candidate.handoff_contract.complete_bounded_package_requires[index] = `mutated-requirement-${index}`; }
    });
  });

  source.control.source_records.forEach((_, index) => {
    mutations.push({
      label: `source-record:${index}`,
      apply: candidate => { candidate.control.source_records.splice(index, 1); }
    });
  });

  const roleMutations = [
    candidate => { candidate.control.execution_roles.outgoing_package_builder.repository_checkout = false; },
    candidate => { candidate.control.execution_roles.outgoing_package_builder.may_build_package = false; },
    candidate => { candidate.control.execution_roles.outgoing_package_builder.may_certify_recipient_operation = true; },
    candidate => { candidate.control.execution_roles.fresh_workspace_recipient.repository_checkout = true; },
    candidate => { candidate.control.execution_roles.fresh_workspace_recipient.repository_permissions = 'read'; },
    candidate => { candidate.control.execution_roles.fresh_workspace_recipient.package_is_sole_state_bridge = false; },
    candidate => { candidate.control.execution_roles.fresh_workspace_recipient.may_modify_package = true; },
    candidate => { candidate.control.execution_roles.fresh_workspace_recipient.may_emit_successor_state = false; },
    candidate => { candidate.control.execution_roles.successor_verifier.repository_checkout = false; },
    candidate => { candidate.control.execution_roles.successor_verifier.may_compare_outputs_to_canonical_contract = false; },
    candidate => { candidate.control.execution_roles.successor_verifier.may_modify_recipient_outputs = true; }
  ];
  roleMutations.forEach((apply, index) => mutations.push({ label: `role:${index}`, apply }));

  const adjudicationFields = [
    'package_state',
    'recipient_state',
    'safe_decline_state',
    'successor_state',
    'verification_state',
    'classification'
  ];
  adjudicationFields.forEach(field => {
    mutations.push({
      label: `adjudication:${field}`,
      apply: candidate => { candidate.control.adjudication[field] = 'mutated'; }
    });
  });

  assert.equal(mutations.length, 84);
  for (const mutation of mutations) {
    expectRejected(source, mutation.apply, mutation.label);
  }
  return mutations.length;
}

validateAll();
testExecutablePackage();
const count = adversarialMutations();
console.log(`counter-selector-wave-34.test: ${count} adversarial mutations refused`);
