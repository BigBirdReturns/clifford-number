#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave07Field } from '../tools/validate-k0-wave07-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave07-field-adjudication.mjs']);
const baseline = validateWave07Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave07-field-adjudication.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave07-field-test-'));
const write = (name, value) => { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); return path.relative(root, file).replaceAll('\\','/'); };

const promoted = structuredClone(audit);
promoted.rows[0].included_event = true;
let result = validateWave07Field({ root, auditPath: write('promoted.json', promoted) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const honlBridge = structuredClone(audit);
const honl = honlBridge.rows.find(row => row.record_id === 'K0-W07-R001');
honl.stage_assessments[0].status = 'documented'; honl.provisional_ccd_chain_depth = 1;
result = validateWave07Field({ root, auditPath: write('honl.json', honlBridge) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('chain depth mismatch') || row.includes('early causal-bridge laundering')));

const eveK0 = structuredClone(audit);
const eve = eveK0.rows.find(row => row.record_id === 'K0-W07-R002');
eve.stage_assessments[1].status = 'documented';
result = validateWave07Field({ root, auditPath: write('eve.json', eveK0) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('constructive-discharge K0 laundering')));

const transferReclassification = structuredClone(audit);
const transfer = transferReclassification.rows.find(row => row.record_id === 'K0-W07-R003');
transfer.stage_assessments[2].status = 'documented'; transfer.provisional_ccd_chain_depth = 5;
result = validateWave07Field({ root, auditPath: write('transfer.json', transferReclassification) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('reclassification/authorship boundary') || row.includes('chain depth mismatch')));

const controlCcd = structuredClone(audit);
controlCcd.rows.find(row => row.record_id === 'K0-W07-R006').provisional_ccd_chain_depth = 0;
result = validateWave07Field({ root, auditPath: write('control-ccd.json', controlCcd) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('control assigned CCD')));

const effectiveness = structuredClone(audit);
effectiveness.rows.find(row => row.record_id === 'K0-W07-R004').observed_effectiveness = true;
result = validateWave07Field({ root, auditPath: write('effectiveness.json', effectiveness) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('publication/graph/effectiveness boundary')));

const futureNeutral = structuredClone(neutral);
futureNeutral.status = 'execution_started_wave_08_discovery_only';
futureNeutral.execution.executed_wave_ids.push('K0-W08');
futureNeutral.discovery_waves.push({ wave_id:'K0-W08', path:'data/research/k0-role-neutral-wave-08.json', status:'discovery_complete_field_adjudication_pending', query_templates_touched:['K0-Q02'], gate_strata_touched:['K0-G03'], graph_effect:'none' });
const futureCoverage = structuredClone(coverage);
const lane = futureCoverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const metric = lane.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit');
metric.observed = 2; metric.source = 'data/research/k0-role-neutral-wave-08.json';
result = validateWave07Field({ root, neutralPath: write('future-neutral.json', futureNeutral), coveragePath: write('future-coverage.json', futureCoverage) });
assert.equal(result.ok, true, result.failures.join('\n'));

metric.source = 'data/research/k0-wave07-field-adjudication.json';
result = validateWave07Field({ root, neutralPath: write('stale-neutral.json', futureNeutral), coveragePath: write('stale-coverage.json', futureCoverage) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('coverage pending-field metric drift')));

console.log('k0-wave07-field-adjudication.test: OK');
