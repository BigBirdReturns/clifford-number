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
  'reports/core-thesis/epistemic-jurisdiction/data.json',
  'reports/core-thesis/epistemic-jurisdiction/index.html',
];
const before = Object.fromEntries(outputs.map(rel => [rel, digest(rel)]));
run('tools/build-m04f-epistemic-jurisdiction.mjs');
assert.deepEqual(Object.fromEntries(outputs.map(rel => [rel, digest(rel)]), before);

const estate = readJson('data/project/m04f-epistemic-jurisdiction-estate.json');
const waveOne = readJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json');
const waveTwo = readJson('data/intake/m04f-epistemic-jurisdiction-wave-02.json');
const fanout = readJson('data/project/m04f-epistemic-jurisdiction-fanout.json');
const report = readJson('reports/core-thesis/epistemic-jurisdiction/data.json');

assert.equal(waveOne.records.length, 64);
assert.equal(waveTwo.records.length, 18);
assert.equal(estate.counts.records, 82);
assert.equal(estate.counts.systems, 10);
assert.equal(estate.counts.sources, 48);
assert.equal(estate.counts.waves, 2);
assert.equal(estate.counts.by_disposition.supported_for_human_review, 48);
assert.equal(estate.counts.by_disposition.requires_additional_acquisition, 21);
assert.equal(estate.counts.by_disposition.retained_candidate_only, 11);
assert.equal(estate.counts.by_disposition.bounded_non_link, 2);
assert.equal(estate.counts.direct_represented_person_voice_records, 1);
assert.equal(fanout.lanes.length, 13);
assert.equal(report.records.length, 82);
assert.equal(report.source_waves.length, 2);

const combined = [...waveOne.records, ...waveTwo.records];
assert.equal(
  combined.filter(record => record.classification.remedy_power_id === 'RP4-compulsory-revision-reversal-or-termination').length,
  4,
);
assert.equal(
  combined.filter(record => record.classification.represented_voice_basis.startsWith('direct-subject')).length,
  1,
);
assert.equal(
  combined.find(record => record.record_id === 'M04F-EJ-068').disposition,
  'bounded_non_link',
);
assert.equal(
  combined.find(record => record.record_id === 'M04F-EJ-079').classification.remedy_power_id,
  'RP3-stay-veto-or-substitution-leverage',
);

console.log('m04f-epistemic-jurisdiction.test: OK (Wave 02 evidence lake)');
