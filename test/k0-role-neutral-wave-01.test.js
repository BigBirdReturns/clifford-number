#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateK0RoleNeutralWave01 } from '../tools/validate-k0-role-neutral-wave-01.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-epistemic-admissibility.mjs']);

const baseline = validateK0RoleNeutralWave01({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-01.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave01-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file);
};

const named = structuredClone(wave);
named.query_executions[0].query_text += ' Elon Musk';
let result = validateK0RoleNeutralWave01({ root, wavePath: write('named.json', named) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('seed person leaked')));

const graph = structuredClone(wave);
graph.records[0].graph_effect = 'create_hop';
result = validateK0RoleNeutralWave01({ root, wavePath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('graph/event promotion')));

const qualification = structuredClone(wave);
const candidate = qualification.records.find(row => row.selection_outcome === 'candidate_requires_field_audit');
candidate.qualification_basis_status = 'unresolved_in_current_source';
result = validateK0RoleNeutralWave01({ root, wavePath: write('qualification.json', qualification) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('candidate lacks explicit qualification')));

const promoted = structuredClone(wave);
promoted.records[0].included_event = true;
result = validateK0RoleNeutralWave01({ root, wavePath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('graph/event promotion')));

const drift = structuredClone(wave);
drift.counts.retained_records = 9;
result = validateK0RoleNeutralWave01({ root, wavePath: write('drift.json', drift) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('wave count drift')));

run(['tools/validate-k0-epistemic-admissibility.mjs']);
console.log('k0-role-neutral-wave-01.test: OK');
