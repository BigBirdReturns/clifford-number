#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave06Field } from '../tools/validate-k0-wave06-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave06-field-adjudication.mjs']);
const baseline = validateWave06Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave06-field-adjudication.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave06-field-test-'));
const write = (name, value) => { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); return path.relative(root, file).replaceAll('\\','/'); };

const promoted = structuredClone(audit);
promoted.rows[0].included_event = true;
let result = validateWave06Field({ root, auditPath: write('promoted.json', promoted) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const threatLaunder = structuredClone(audit);
threatLaunder.rows.find(row => row.record_id === 'K0-W06-R001').stage_assessments[5].status = 'documented';
result = validateWave06Field({ root, auditPath: write('threat.json', threatLaunder) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('chain depth mismatch') || row.includes('consequence/sensor laundering')));

const analystBridge = structuredClone(audit);
analystBridge.rows.find(row => row.record_id === 'K0-W06-R002').stage_assessments[0].status = 'documented';
result = validateWave06Field({ root, auditPath: write('analyst.json', analystBridge) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('chain depth mismatch') || row.includes('causal-bridge laundering')));

const jacobsComplete = structuredClone(audit);
const jacobs = jacobsComplete.rows.find(row => row.record_id === 'K0-W06-R003');
jacobs.stage_assessments[7].status = 'documented'; jacobs.provisional_ccd_chain_depth = 7; jacobs.furthest_documented_stage = 7;
result = validateWave06Field({ root, auditPath: write('jacobs.json', jacobsComplete) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('correction-completion laundering') || row.includes('provisional_chain_depth_6')));

const controlCcd = structuredClone(audit);
controlCcd.rows.find(row => row.record_id === 'K0-W06-R006').provisional_ccd_chain_depth = 0;
result = validateWave06Field({ root, auditPath: write('control-ccd.json', controlCcd) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('control assigned CCD')));

const effectiveness = structuredClone(audit);
effectiveness.rows.find(row => row.record_id === 'K0-W06-R007').observed_effectiveness = true;
result = validateWave06Field({ root, auditPath: write('effectiveness.json', effectiveness) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('publication/graph/effectiveness boundary')));

const futureNeutral = structuredClone(neutral);
futureNeutral.status = 'execution_started_wave_07_discovery_only';
futureNeutral.execution.executed_wave_ids.push('K0-W07');
futureNeutral.discovery_waves.push({ wave_id:'K0-W07', path:'data/research/k0-role-neutral-wave-07.json', status:'discovery_complete_field_adjudication_pending', query_templates_touched:['K0-Q02'], gate_strata_touched:['K0-G03'], graph_effect:'none' });
const futureCoverage = structuredClone(coverage);
const lane = futureCoverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const metric = lane.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit');
metric.observed = 2; metric.source = 'data/research/k0-role-neutral-wave-07.json';
result = validateWave06Field({ root, neutralPath: write('future-neutral.json', futureNeutral), coveragePath: write('future-coverage.json', futureCoverage) });
assert.equal(result.ok, true, result.failures.join('\n'));

metric.source = 'data/research/k0-wave06-field-adjudication.json';
result = validateWave06Field({ root, neutralPath: write('stale-neutral.json', futureNeutral), coveragePath: write('stale-coverage.json', futureCoverage) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('coverage pending-field metric drift')));

console.log('k0-wave06-field-adjudication.test: OK');
