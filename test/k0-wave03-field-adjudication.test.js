#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave03Field } from '../tools/validate-k0-wave03-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave03-field-adjudication.mjs']);

const baseline = validateWave03Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave03-field-adjudication.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave03-field-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file);
};

const promoted = structuredClone(audit);
promoted.rows[0].included_event = true;
let result = validateWave03Field({ root, auditPath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const challengerSeven = structuredClone(audit);
challengerSeven.rows.find(row => row.record_id === 'K0-W03-R001').provisional_ccd_chain_depth = 7;
result = validateWave03Field({ root, auditPath: write('challenger-seven.json', challengerSeven) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('chain depth mismatch') || row.includes('Challenger disposition/CCD drift')));

const columbiaLaunder = structuredClone(audit);
columbiaLaunder.rows.find(row => row.record_id === 'K0-W03-R002').stage_assessments[2].status = 'documented';
result = validateWave03Field({ root, auditPath: write('columbia-launder.json', columbiaLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Columbia reclassification laundering') || row.includes('chain depth mismatch')));

const grenfellCompression = structuredClone(audit);
grenfellCompression.rows.find(row => row.record_id === 'K0-W03-R005').decomposition_required = false;
result = validateWave03Field({ root, auditPath: write('grenfell-compression.json', grenfellCompression) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Grenfell decomposition boundary')));

const controlCCD = structuredClone(audit);
controlCCD.rows.find(row => row.record_id === 'K0-W03-R006').provisional_ccd_chain_depth = 5;
result = validateWave03Field({ root, auditPath: write('control-ccd.json', controlCCD) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('control assigned CCD')));

const networkLaunder = structuredClone(audit);
networkLaunder.boundaries.same_failure_shape_proves_coordination = true;
result = validateWave03Field({ root, auditPath: write('network-launder.json', networkLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('distributed/network boundary')));

const graph = structuredClone(audit);
graph.rows[3].graph_effect = 'create_hop';
result = validateWave03Field({ root, auditPath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication/graph boundary')));

console.log('k0-wave03-field-adjudication.test: OK');
