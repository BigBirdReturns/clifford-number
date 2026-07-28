#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave02 } from '../tools/validate-k0-role-neutral-wave-02.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-role-neutral-wave-02.mjs']);
const baseline = validateWave02({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-02.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave02-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const targetFirst = structuredClone(wave);
targetFirst.query_executions[0].query_text += ' Meta';
let result = validateWave02({ root, wavePath: write('target-first.json', targetFirst) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('named target leaked')));

const preliminaryPromoted = structuredClone(wave);
preliminaryPromoted.records.find(row => row.record_id === 'K0-W02-R004').lifecycle_state = 'final_noncompliance';
result = validateWave02({ root, wavePath: write('preliminary-promoted.json', preliminaryPromoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('preliminary finding promoted')));

const eventLaunder = structuredClone(wave);
eventLaunder.records[0].included_event = true;
eventLaunder.records[0].ccd_chain_depth = 7;
result = validateWave02({ root, wavePath: write('event-launder.json', eventLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted into event')));

const effectiveness = structuredClone(wave);
effectiveness.records.find(row => row.record_id === 'K0-W02-R003').lifecycle_state = 'final_noncompliance_corrective_plan_effective';
result = validateWave02({ root, wavePath: write('effectiveness.json', effectiveness) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('corrective effectiveness laundering')));

console.log('k0-role-neutral-wave-02.test: OK');
