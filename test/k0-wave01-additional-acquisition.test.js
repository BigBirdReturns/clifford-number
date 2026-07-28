#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateAdditionalAcquisition, validateResolutionObject } from '../tools/validate-k0-wave01-additional-acquisition.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};

run(['tools/build-k0-wave01-additional-acquisition.mjs']);
const baseline = validateAdditionalAcquisition({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const resolution = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave01-additional-acquisition-resolution.json'), 'utf8'));
assert.equal(resolution.rows.length, 2);
assert.deepEqual(resolution.rows.map(row => row.record_id), ['K0-W01-R006', 'K0-W01-R008']);
assert.ok(resolution.rows.every(row => row.provisional_ccd_chain_depth === 6));
assert.ok(resolution.rows.every(row => row.included_event === false));
assert.equal(resolution.counts.remaining_requires_additional_acquisition, 0);

const promoted = structuredClone(resolution);
promoted.rows[0].included_event = true;
let result = validateResolutionObject(promoted);
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('truth or event promotion')));

const inflated = structuredClone(resolution);
inflated.rows[0].provisional_ccd_chain_depth = 7;
result = validateResolutionObject(inflated);
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('CCD/furthest drift')));

const hashLaundered = structuredClone(resolution);
hashLaundered.rows[0].source_custody.exact_content_sha256 = '0'.repeat(64);
result = validateResolutionObject(hashLaundered);
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('exact remote-byte custody laundering')));

const fakeIndependent = structuredClone(resolution);
fakeIndependent.current_result.independent_second_party_review_complete = true;
result = validateResolutionObject(fakeIndependent);
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('result independence laundering')));

const stageGap = structuredClone(resolution);
stageGap.rows[1].stage_assessments[3].status = 'partial';
result = validateResolutionObject(stageGap);
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('stage 3 status')));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/answerable-power/k0-wave01-additional-acquisition.json'), 'utf8'));
assert.equal(report.counts.records_resolved, 2);
assert.equal(report.counts.included_events, 0);
assert.equal(report.current_result.publication_status, 'blocked');
assert.equal(report.current_result.graph_effect, 'none');

console.log('k0-wave01-additional-acquisition.test: OK');
