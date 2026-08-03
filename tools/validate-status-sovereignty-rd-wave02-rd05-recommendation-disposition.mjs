#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT, PRODUCT_ROOT, CLOSURE_REFERENCE_PATH, SCHEMA_PATH,
  readInputs, deriveProduct, validateInputs, validateDerived,
} from './build-status-sovereignty-rd-wave02-rd05-recommendation-disposition.mjs';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

function readActual(root = ROOT) {
  return {
    exclusionLedger: readJson(root, `${PRODUCT_ROOT}/candidate-exclusion-ledger.json`),
    chainLedger: readJson(root, `${PRODUCT_ROOT}/chain-terminal-ledger.json`),
    terminalClassification: readJson(root, `${PRODUCT_ROOT}/terminal-classification.json`),
    classReceipt: readJson(root, `${PRODUCT_ROOT}/class-receipt.json`),
    summary: readJson(root, `${PRODUCT_ROOT}/summary.json`),
    manifest: readJson(root, `${PRODUCT_ROOT}/manifest.json`),
    closureReference: readJson(root, CLOSURE_REFERENCE_PATH),
  };
}

function validateSchema(root, receipt) {
  const schema = readJson(root, SCHEMA_PATH);
  ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave02-rd05-recommendation-disposition.schema.json', 'schema id changed');
  ok(schema.type === 'object' && schema.additionalProperties === false, 'schema root open');
  ok(schema.properties.schema_version.const === 'ssc-rd05-wave02-class-receipt@1', 'schema version changed');
  ok(schema.properties.terminal_state.const === 'bounded_non_link', 'schema terminal state changed');
  ok(schema.properties.class_closed.const === true, 'schema closure changed');
  ok(schema.properties.counts.properties.frozen_objects.const === 58, 'schema denominator changed');
  ok(schema.properties.counts.properties.terminal_objects.const === 58, 'schema terminal count changed');
  ok(schema.properties.counts.properties.bounded_non_link_chains.const === 4, 'schema chain count changed');
  ok(schema.properties.counts.properties.open_chains.const === 0, 'schema open-chain count changed');
  ok(schema.properties.authority.additionalProperties === false, 'authority schema open');
  same(Object.keys(schema.properties.authority.properties), Object.keys(receipt.authority), 'authority schema keys changed');
}

function validateManifestBytes(root, actual) {
  for (const entry of actual.manifest.entries) {
    const bytes = readBytes(root, `${PRODUCT_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: product byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: product digest changed`);
  }
  const combined = sha256(Buffer.from(actual.manifest.entries.map((row) => `${row.sha256}  ${row.path}`).join('\n'), 'utf8'));
  ok(combined === actual.manifest.combined_sha256, 'product manifest recomputation changed');
}

function validateGitCleanliness(root) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  ok(tracked.every((name) => !name.startsWith('.rd05-closure/')), 'temporary RD05 carrier retained');
  ok(tracked.every((name) => !/temporary-ssc-rd05-(?:successor|closure)/.test(name)), 'temporary RD05 workflow retained');
}

export function validateRepository(root = ROOT) {
  const inputs = readInputs(root);
  validateInputs(inputs, root);
  const expected = deriveProduct(root, { write: false }).derived;
  const actual = readActual(root);
  validateDerived(inputs, actual);
  same(actual, expected, 'generated RD05 terminal product is not deterministic');
  validateManifestBytes(root, actual);
  validateSchema(root, actual.classReceipt);
  validateGitCleanliness(root);
  return actual;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const actual = validateRepository(ROOT);
  console.log(`validate-rd05-terminal-closure: PASS — ${actual.classReceipt.counts.terminal_objects}/58 terminal, 49 routes, bounded_non_link`);
}
