#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave07 } from '../tools/validate-k0-role-neutral-wave-07.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-role-neutral-wave-07.mjs']);
const baseline = validateWave07({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const wave = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-wave-07.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave07-test-'));
const write = (name, value) => { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); return file; };
const rel = file => path.relative(root, file).replaceAll('\\', '/');

const targetLeak = structuredClone(wave);
targetLeak.query_executions[0].query_text += ' Patrick Soon-Shiong';
let result = validateWave07({ root, wavePath: rel(write('target-leak.json', targetLeak)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('named target leaked')));

const graphLeak = structuredClone(wave);
graphLeak.records[0].graph_effect = 'create_hop';
result = validateWave07({ root, wavePath: rel(write('graph-leak.json', graphLeak)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('publication or graph boundary')));

const eventLaunder = structuredClone(wave);
eventLaunder.records[0].included_event = true;
result = validateWave07({ root, wavePath: rel(write('event-launder.json', eventLaunder)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('promoted into event')));

const seedDup = structuredClone(wave);
seedDup.records.find(row => row.record_id === 'K0-W07-R008').selection_outcome = 'candidate_requires_field_audit';
result = validateWave07({ root, wavePath: rel(write('seed-dup.json', seedDup)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('selection outcome denominator')));

const resignationLaunder = structuredClone(wave);
resignationLaunder.boundaries.accepted_resignation_proves_voluntary_departure = true;
result = validateWave07({ root, wavePath: rel(write('resignation-launder.json', resignationLaunder)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('boundaries drift')));

const aggregateDrift = structuredClone(neutral);
aggregateDrift.execution.returned_records = 56;
result = validateWave07({ root, neutralPath: rel(write('aggregate-drift.json', aggregateDrift)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('aggregate execution count')));


const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const futureNeutral = structuredClone(neutral);
futureNeutral.status = 'execution_started_wave_08_discovery_only';
futureNeutral.execution.executed_wave_ids.push('K0-W08');
futureNeutral.discovery_waves.push({ wave_id:'K0-W08', path:'data/research/k0-role-neutral-wave-08.json', status:'discovery_complete_field_adjudication_pending', query_templates_touched:['K0-Q02'], gate_strata_touched:['K0-G03'], graph_effect:'none' });
const futureCoverage = structuredClone(coverage);
const lane = futureCoverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const metric = lane.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit');
metric.observed = 2; metric.source = 'data/research/k0-role-neutral-wave-08.json';
const futureCoveragePath = rel(write('future-coverage.json', futureCoverage));
const futureNeutralPath = rel(write('future-neutral.json', futureNeutral));
result = validateWave07({ root, neutralPath: futureNeutralPath, coveragePath: futureCoveragePath });
assert.equal(result.ok, true, result.failures.join('\n'));

metric.source = 'data/research/k0-wave07-field-adjudication.json';
result = validateWave07({ root, neutralPath: futureNeutralPath, coveragePath: rel(write('stale-coverage.json', futureCoverage)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('Wave 07 coverage metric drift')));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/answerable-power/k0-role-neutral-wave-07.json'), 'utf8'));
assert.equal(report.counts.retained_records, 9);
assert.equal(report.counts.candidate_requires_field_audit, 3);
assert.equal(report.current_result.field_adjudication_complete, false);
assert.equal(report.current_result.included_events, 0);
assert.equal(report.current_result.graph_effect, 'none');
console.log('k0-role-neutral-wave-07.test: OK');
