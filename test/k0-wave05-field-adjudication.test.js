#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave05Field } from '../tools/validate-k0-wave05-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};

run(['tools/build-k0-wave05-field-adjudication.mjs']);
const baseline = validateWave05Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave05-field-adjudication.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave05-field-test-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const promotion = structuredClone(audit);
promotion.rows[0].included_event = true;
let result = validateWave05Field({ root, auditPath: write('promotion.json', promotion) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const bridgeLaunder = structuredClone(audit);
const karolinska = bridgeLaunder.rows.find(row => row.record_id === 'K0-W05-R001');
karolinska.stage_assessments[2].status = 'documented';
karolinska.provisional_ccd_chain_depth = 2;
result = validateWave05Field({ root, auditPath: write('bridge.json', bridgeLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Karolinska causal-bridge laundering')));

const remedyLaunder = structuredClone(audit);
const olivieri = remedyLaunder.rows.find(row => row.record_id === 'K0-W05-R002');
olivieri.stage_assessments[7].status = 'documented';
olivieri.provisional_ccd_chain_depth = 7;
olivieri.furthest_documented_stage = 7;
result = validateWave05Field({ root, auditPath: write('remedy.json', remedyLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('Olivieri disposition/CCD drift') || row.includes('Olivieri remedy-completion laundering')));

const controlCcd = structuredClone(audit);
controlCcd.rows.find(row => row.record_id === 'K0-W05-R003').provisional_ccd_chain_depth = 0;
result = validateWave05Field({ root, auditPath: write('control-ccd.json', controlCcd) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('control assigned CCD')));

const missingWave05 = structuredClone(neutral);
missingWave05.execution.executed_wave_ids = missingWave05.execution.executed_wave_ids.filter(id => id !== 'K0-W05');
result = validateWave05Field({ root, neutralPath: write('missing-wave05.json', missingWave05) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate Wave 05 reconciliation drift')));

const stalePending = structuredClone(coverage);
const coverageRow = stalePending.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const pending = coverageRow.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit');
pending.observed = 2;
pending.source = 'data/research/k0-role-neutral-wave-05.json';
result = validateWave05Field({ root, coveragePath: write('stale-pending.json', stalePending) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('coverage pending-field metric drift')));

const graph = structuredClone(audit);
graph.rows.find(row => row.record_id === 'K0-W05-R004').graph_effect = 'create_hop';
result = validateWave05Field({ root, auditPath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication/graph/effectiveness boundary drift')));

console.log('k0-wave05-field-adjudication.test: OK');
