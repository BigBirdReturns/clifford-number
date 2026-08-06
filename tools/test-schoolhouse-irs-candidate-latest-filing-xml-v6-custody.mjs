#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(root, 'tools/validate-schoolhouse-irs-candidate-latest-filing-xml-v6-custody.mjs');
const source = path.join(root, 'data/intake/schoolhouse-irs-candidate-latest-filing-xml-v6');
const clean = spawnSync(process.execPath, [validator], {cwd: root, encoding: 'utf8'});
assert.equal(clean.status, 0, clean.stderr || clean.stdout);

const mutations = [
  ['denominator drift', (dir) => {
    const file = path.join(dir, 'summary.json');
    const value = JSON.parse(readFileSync(file, 'utf8'));
    value.selected_latest_xml_routes = 91;
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
  ['observed organization-name retention', (dir) => {
    const file = path.join(dir, 'xml-results.jsonl');
    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    const value = JSON.parse(lines[0]);
    value.observed_organization_name = 'forbidden retained value';
    lines[0] = JSON.stringify(value);
    writeFileSync(file, lines.join('\n') + '\n');
  }],
  ['identity authority expansion', (dir) => {
    const file = path.join(dir, 'source-custody.json');
    const value = JSON.parse(readFileSync(file, 'utf8'));
    value.authority.identities_admitted = 1;
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
  ['source-byte drift', (dir) => {
    const file = path.join(dir, 'selection.jsonl');
    writeFileSync(file, readFileSync(file, 'utf8').replace('"selection_ordinal":1', '"selection_ordinal":2'));
  }],
  ['raw XML path injection', (dir) => {
    writeFileSync(path.join(dir, 'raw.xml'), '<Return/>\n');
  }],
  ['artifact digest drift', (dir) => {
    const file = path.join(dir, 'source-custody.json');
    const value = JSON.parse(readFileSync(file, 'utf8'));
    value.acquisition_artifact_digest = 'sha256:' + '0'.repeat(64);
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
];

let refused = 0;
for (const [label, mutate] of mutations) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'schoolhouse-xml-v6-test-'));
  try {
    cpSync(source, temp, {recursive: true});
    mutate(temp);
    const script = readFileSync(validator, 'utf8').replace(
      "const dataRoot = path.join(repoRoot, 'data/intake/schoolhouse-irs-candidate-latest-filing-xml-v6');",
      `const dataRoot = ${JSON.stringify(temp)};`,
    );
    const mutantValidator = path.join(temp, 'validator.mjs');
    writeFileSync(mutantValidator, script);
    const result = spawnSync(process.execPath, [mutantValidator], {cwd: root, encoding: 'utf8'});
    assert.notEqual(result.status, 0, `mutation must fail closed: ${label}`);
    refused += 1;
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}
console.log(`schoolhouse_irs_candidate_latest_filing_xml_v6_adversarial_refusals=${refused}`);
