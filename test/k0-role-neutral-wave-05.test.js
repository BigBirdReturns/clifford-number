#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave05 } from '../tools/validate-k0-role-neutral-wave-05.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-role-neutral-wave-05.mjs']);
const baseline = validateWave05({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-05.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave05-test-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const named = structuredClone(wave);
named.query_executions[0].query_text += ' Karolinska';
let result = validateWave05({ root, wavePath: write('named.json', named) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('named target leaked')));

const promoted = structuredClone(wave);
promoted.records[0].included_event = true;
result = validateWave05({ root, wavePath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted')));

const retractionLaunder = structuredClone(wave);
retractionLaunder.boundaries.retraction_proves_ceiling_conversion = true;
result = validateWave05({ root, wavePath: write('retraction.json', retractionLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('wave boundaries drift')));

const misconductLaunder = structuredClone(wave);
misconductLaunder.records.find(row => row.record_id === 'K0-W05-R003').selection_outcome = 'candidate_requires_field_audit';
result = validateWave05({ root, wavePath: write('misconduct.json', misconductLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('selection outcome denominator drift') || row.includes('misconduct negative control drift')));

const correctionPromote = structuredClone(wave);
correctionPromote.records.find(row => row.record_id === 'K0-W05-R007').ccd_chain_depth = 7;
result = validateWave05({ root, wavePath: write('correction.json', correctionPromote) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted')));

const missingWave05 = structuredClone(neutral);
missingWave05.execution.executed_wave_ids = missingWave05.execution.executed_wave_ids.filter(id => id !== 'K0-W05');
result = validateWave05({ root, neutralPath: write('missing-wave05.json', missingWave05) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate wave linkage drift')));

const undercount = structuredClone(neutral);
undercount.execution.searches_executed = 19;
result = validateWave05({ root, neutralPath: write('undercount.json', undercount) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate execution count drift')));

const graph = structuredClone(wave);
graph.records[0].graph_effect = 'create_hop';
result = validateWave05({ root, wavePath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication or graph boundary drift')));

console.log('k0-role-neutral-wave-05.test: OK');
