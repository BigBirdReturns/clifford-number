#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = rel => execFileSync(process.execPath, [path.join(root, rel)], { cwd: root, stdio: 'pipe' });
const digest = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

run('tools/build-m04f-epistemic-jurisdiction.mjs');
run('tools/validate-m04f-epistemic-jurisdiction.mjs');

const outputs = [
  'data/intake/m04f-epistemic-jurisdiction-wave-01.json',
  'data/project/m04f-epistemic-jurisdiction-estate.json',
  'build/core-thesis/epistemic-jurisdiction/manifest.json',
  'build/core-thesis/epistemic-jurisdiction/test-matrix.json',
  'build/core-thesis/epistemic-jurisdiction/stratigraphy.json',
  'reports/core-thesis/epistemic-jurisdiction/data.json',
  'reports/core-thesis/epistemic-jurisdiction/index.html',
];
const before = Object.fromEntries(outputs.map(rel => [rel, digest(rel)]));
run('tools/build-m04f-epistemic-jurisdiction.mjs');
assert.deepEqual(Object.fromEntries(outputs.map(rel => [rel, digest(rel)])), before);

const estate = readJson('data/project/m04f-epistemic-jurisdiction-estate.json');
const waveOne = readJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json');
const waveTwo = readJson('data/intake/m04f-epistemic-jurisdiction-wave-02.json');
const waveThree = readJson('data/intake/m04f-epistemic-jurisdiction-wave-03.json');
const report = readJson('reports/core-thesis/epistemic-jurisdiction/data.json');
const fanoutBase = readJson('data/project/m04f-epistemic-jurisdiction-fanout.json');
const fanoutThree = readJson('data/project/m04f-epistemic-jurisdiction-fanout-wave-03.json');
const stratigraphy = readJson('build/core-thesis/epistemic-jurisdiction/stratigraphy.json');

assert.equal(waveOne.records.length, 64);
assert.equal(waveTwo.records.length, 18);
assert.equal(waveThree.records.length, 40);
assert.equal(estate.counts.records, 122);
assert.equal(estate.counts.systems, 15);
assert.equal(estate.counts.sources, 66);
assert.equal(estate.counts.waves, 3);
assert.equal(estate.counts.fanout_lanes, 19);
assert.equal(estate.counts.by_disposition.supported_for_human_review, 76);
assert.equal(estate.counts.by_disposition.requires_additional_acquisition, 29);
assert.equal(estate.counts.by_disposition.retained_candidate_only, 14);
assert.equal(estate.counts.by_disposition.bounded_non_link, 3);
assert.equal(estate.counts.direct_represented_person_voice_records, 10);
assert.equal(fanoutBase.lanes.length + fanoutThree.lanes.length, 19);
assert.equal(report.records.length, 122);
assert.equal(report.source_waves.length, 3);
assert.equal(report.waterline.length, 15);
assert.equal(stratigraphy.records.length, 122);
assert.equal(stratigraphy.systems.length, 15);
assert.equal(
  Object.values(estate.counts.by_stratigraphy).reduce((sum, value) => sum + value, 0),
  122,
);
assert.equal(
  Object.values(estate.counts.waterline_by_state).reduce((sum, value) => sum + value, 0),
  15,
);

const byId = new Map(report.records.map(record => [record.record_id, record]));
assert.equal(byId.get('M04F-EJ-085').stratigraphy.state_id, 'bedrock');
assert.equal(byId.get('M04F-EJ-096').stratigraphy.state_id, 'fault_line');
assert.equal(byId.get('M04F-EJ-101').stratigraphy.state_id, 'bedrock');
assert.equal(byId.get('M04F-EJ-109').stratigraphy.state_id, 'bedrock');
assert.equal(byId.get('M04F-EJ-117').stratigraphy.state_id, 'bedrock');
assert.equal(byId.get('M04F-EJ-068').stratigraphy.state_id, 'fault_line');
assert.ok(report.waterline.some(item => item.waterline_state === 'bounded_landfall'));
assert.equal(report.boundaries.bedrock_is_not_system_truth, true);
assert.equal(report.boundaries.promotes_to, 'candidate_only');

console.log('m04f-epistemic-jurisdiction.test: OK (Wave 03 evidentiary stratigraphy)');
