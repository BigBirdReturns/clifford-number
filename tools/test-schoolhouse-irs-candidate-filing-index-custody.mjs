#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(root, 'tools/validate-schoolhouse-irs-candidate-filing-index-custody.mjs');
const source = path.join(root, 'data/intake/schoolhouse-irs-candidate-filing-index-census');
const clean = spawnSync(process.execPath, [validator], {cwd:root,encoding:'utf8'});
assert.equal(clean.status, 0, clean.stderr || clean.stdout);
const temp = mkdtempSync(path.join(os.tmpdir(), 'schoolhouse-irs-index-test-'));
try {
  cpSync(source, temp, {recursive:true});
  const summaryPath = path.join(temp, 'summary.json');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  summary.unique_candidate_eins = 437;
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  const script = readFileSync(validator, 'utf8').replace("const dataRoot = path.join(repoRoot, 'data/intake/schoolhouse-irs-candidate-filing-index-census');", `const dataRoot = ${JSON.stringify(temp)};`);
  const mutantValidator = path.join(temp, 'validator.mjs');
  writeFileSync(mutantValidator, script);
  const mutated = spawnSync(process.execPath, [mutantValidator], {cwd:root,encoding:'utf8'});
  assert.notEqual(mutated.status, 0, 'mutated denominator must be refused');
} finally {
  rmSync(temp, {recursive:true,force:true});
}
console.log('schoolhouse_irs_candidate_filing_index_adversarial_refusals=1');
