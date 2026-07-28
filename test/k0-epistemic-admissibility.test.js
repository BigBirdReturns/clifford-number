#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateK0 } from '../tools/validate-k0-epistemic-admissibility.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-epistemic-admissibility.mjs']);
const baseline = validateK0({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const seeds = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/k0-ceiling-conversion-seed-events.json'), 'utf8'));
const wiring = JSON.parse(fs.readFileSync(path.join(root, 'data/project/k0-existing-ecosystem-wiring.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-test-'));
const write = (name, value) => { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); return file; };
const rel = file => path.relative(root, file).replaceAll('\\', '/');

const graphLeak = structuredClone(seeds);
graphLeak.events[0].graph_effect = 'create_hop';
let result = validateK0({ root, seedPath: rel(write('graph-leak.json', graphLeak)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('graph boundary')));

const truthLaunder = structuredClone(seeds);
truthLaunder.events[0].evidence_truth_determined = true;
result = validateK0({ root, seedPath: rel(write('truth-launder.json', truthLaunder)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('evidence truth laundering')));

const noCounter = structuredClone(seeds);
noCounter.events[0].counterevidence = [];
result = validateK0({ root, seedPath: rel(write('no-counter.json', noCounter)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('counterevidence missing')));

const network = structuredClone(wiring);
network.justified_common_purpose_network_edges_among_top_ten = 1;
result = validateK0({ root, wiringPath: rel(write('network.json', network)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('pairwise/network boundary')));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/answerable-power/k0.json'), 'utf8'));
assert.equal(report.counts.top_ten_people, 10);
assert.equal(report.counts.normalized_seed_events, 13);
assert.equal(report.counts.natural_k0_fixtures, 10);
assert.equal(report.counts.common_purpose_network_edges, 0);
assert.equal(report.current_result.graph_effect, 'none');
assert.equal(report.current_result.evidence_truth_determined, false);
console.log('k0-epistemic-admissibility.test: OK');
