#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWave02Field } from '../tools/validate-k0-wave02-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave02-field-adjudication.mjs']);

const baseline = validateWave02Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave02-field-adjudication.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave02-field-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const promote = structuredClone(audit);
promote.rows.find(row => row.record_id === 'K0-W02-R003').included_event = true;
let result = validateWave02Field({ root, auditPath: write('promote.json', promote) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const reclassify = structuredClone(audit);
reclassify.rows.find(row => row.record_id === 'K0-W02-R003').stage_assessments[2].status = 'documented';
result = validateWave02Field({ root, auditPath: write('reclassify.json', reclassify) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('chain depth mismatch') || row.includes('reclassification/mutation laundering')));

const finalMeta = structuredClone(audit);
finalMeta.rows.find(row => row.record_id === 'K0-W02-R004').decision_state = 'final_decision';
result = validateWave02Field({ root, auditPath: write('final-meta.json', finalMeta) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('preliminary-state drift')));

const temuMerits = structuredClone(audit);
const temu = temuMerits.rows.find(row => row.record_id === 'K0-W02-R007');
temu.decision_state = 'final_noncompliance';
temu.furthest_documented_stage = 1;
result = validateWave02Field({ root, auditPath: write('temu-merits.json', temuMerits) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Temu acquisition boundary drift') || row.includes('Temu merits laundering')));

const effectiveness = structuredClone(audit);
effectiveness.rows.find(row => row.record_id === 'K0-W02-R006').observed_effectiveness = true;
result = validateWave02Field({ root, auditPath: write('effectiveness.json', effectiveness) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('effectiveness laundering')));

const graph = structuredClone(audit);
graph.rows[0].graph_effect = 'create_hop';
result = validateWave02Field({ root, auditPath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication/graph boundary drift')));

console.log('k0-wave02-field-adjudication.test: OK');
