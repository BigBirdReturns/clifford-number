#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateWave04Field } from '../tools/validate-k0-wave04-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave04-field-adjudication.mjs']);
const baseline = validateWave04Field({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave04-field-adjudication.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave04-field-test-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const promotion = structuredClone(audit);
promotion.rows[0].included_event = true;
let result = validateWave04Field({ root, auditPath: write('promotion.json', promotion) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('event/truth/independence laundering')));

const temporalLaunder = structuredClone(audit);
const exclusion = temporalLaunder.rows.find(row => row.record_id === 'K0-W04-R004');
exclusion.stage_assessments[1].status = 'documented';
exclusion.provisional_ccd_chain_depth = 1;
result = validateWave04Field({ root, auditPath: write('temporal.json', temporalLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('post-action contradiction temporal laundering')));

const reclassificationLaunder = structuredClone(audit);
const reset = reclassificationLaunder.rows.find(row => row.record_id === 'K0-W04-R002');
reset.stage_assessments[2].status = 'documented';
result = validateWave04Field({ root, auditPath: write('reclassification.json', reclassificationLaunder) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('member-specific transition laundering')));

const duplicateSeed = structuredClone(audit);
duplicateSeed.rows.find(row => row.record_id === 'K0-W04-R001').control_disposition = 'supported_for_human_review';
result = validateWave04Field({ root, auditPath: write('seed-duplicate.json', duplicateSeed) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('ACIP seed-overlap drift')));

const controlCcd = structuredClone(audit);
controlCcd.rows.find(row => row.record_id === 'K0-W04-R005').provisional_ccd_chain_depth = 0;
result = validateWave04Field({ root, auditPath: write('control-ccd.json', controlCcd) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('control assigned CCD')));

const missingWave04 = structuredClone(neutral);
missingWave04.execution.executed_wave_ids = missingWave04.execution.executed_wave_ids.filter(id => id !== 'K0-W04');
result = validateWave04Field({ root, neutralPath: write('missing-wave04.json', missingWave04) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate Wave 04 reconciliation drift')));

const malformedPending = structuredClone(coverage);
const coverageRow = malformedPending.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
coverageRow.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit').observed = -1;
result = validateWave04Field({ root, coveragePath: write('malformed-pending.json', malformedPending) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('coverage pending-field metric shape drift')));

const graph = structuredClone(audit);
graph.rows.find(row => row.record_id === 'K0-W04-R006').graph_effect = 'create_hop';
result = validateWave04Field({ root, auditPath: write('graph.json', graph) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('publication/graph/effectiveness boundary drift')));

console.log('k0-wave04-field-adjudication.test: OK');
