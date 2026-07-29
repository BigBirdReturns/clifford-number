#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWave04 } from '../tools/validate-k0-role-neutral-wave-04.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-role-neutral-wave-04.mjs']);

const baseline = validateWave04({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-04.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave04-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const named = structuredClone(wave);
named.query_executions[0].query_text += ' ACIP';
let result = validateWave04({ root, wavePath: write('named.json', named) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('named target leaked')));

const promoted = structuredClone(wave);
promoted.records[1].included_event = true;
result = validateWave04({ root, wavePath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('discovery promoted')));

const overlap = structuredClone(wave);
overlap.records.find(row => row.record_id === 'K0-W04-R001').selection_outcome = 'candidate_requires_field_audit';
result = validateWave04({ root, wavePath: write('overlap.json', overlap) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('seed-overlap control drift') || row.includes('selection outcome denominator drift')));

const stale = structuredClone(neutral);
stale.discovery_waves.find(row => row.wave_id === 'K0-W03').status = 'discovery_complete_field_adjudication_pending';
result = validateWave04({ root, neutralPath: write('stale-neutral.json', stale) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Wave 03 reconciliation drift')));

const missingWave04 = structuredClone(neutral);
missingWave04.execution.executed_wave_ids = missingWave04.execution.executed_wave_ids.filter(id => id !== 'K0-W04');
result = validateWave04({ root, neutralPath: write('missing-wave04.json', missingWave04) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate wave linkage drift')));

const undercount = structuredClone(neutral);
undercount.execution.searches_executed = 15;
result = validateWave04({ root, neutralPath: write('undercount.json', undercount) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate execution count drift')));

const capture = structuredClone(wave);
capture.boundaries.committee_reset_proves_capture = true;
result = validateWave04({ root, wavePath: write('capture.json', capture) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('wave boundaries drift')));

run(['tools/validate-k0-epistemic-admissibility.mjs']);
console.log('k0-role-neutral-wave-04.test: OK');
