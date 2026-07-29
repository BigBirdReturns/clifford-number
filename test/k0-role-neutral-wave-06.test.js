#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave06 } from '../tools/validate-k0-role-neutral-wave-06.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-role-neutral-wave-06.mjs']);
const baseline = validateWave06({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-06.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave06-test-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const named = structuredClone(wave);
named.query_executions[0].query_text += ' Neil Jacobs';
let result = validateWave06({ root, wavePath: write('named.json', named) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('named target leaked')));

const promoted = structuredClone(wave);
promoted.records[0].included_event = true;
result = validateWave06({ root, wavePath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted')));

const chainLaunder = structuredClone(wave);
chainLaunder.boundaries.reprisal_finding_proves_complete_k0_chain = true;
result = validateWave06({ root, wavePath: write('reprisal-chain.json', chainLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('wave boundaries drift')));

const lawfulDiscipline = structuredClone(wave);
lawfulDiscipline.records.find(row => row.record_id === 'K0-W06-R006').selection_outcome = 'candidate_requires_field_audit';
result = validateWave06({ root, wavePath: write('lawful-discipline.json', lawfulDiscipline) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('selection outcome denominator drift') || row.includes('lawful-discipline control drift')));

const policyPromote = structuredClone(wave);
policyPromote.records.find(row => row.record_id === 'K0-W06-R005').ccd_chain_depth = 3;
result = validateWave06({ root, wavePath: write('policy-promote.json', policyPromote) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted')));

const missingWave06 = structuredClone(neutral);
missingWave06.execution.executed_wave_ids = missingWave06.execution.executed_wave_ids.filter(id => id !== 'K0-W06');
result = validateWave06({ root, neutralPath: write('missing-wave06.json', missingWave06) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate wave linkage drift')));

const stayMerits = structuredClone(wave);
stayMerits.boundaries.stay_proves_final_merits = true;
result = validateWave06({ root, wavePath: write('stay-merits.json', stayMerits) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('wave boundaries drift')));

const graph = structuredClone(wave);
graph.records[0].graph_effect = 'create_hop';
result = validateWave06({ root, wavePath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication or graph boundary drift')));

console.log('k0-role-neutral-wave-06.test: OK');
