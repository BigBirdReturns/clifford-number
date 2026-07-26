#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const run = (script, args = []) => {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], { encoding:'utf8', cwd:root });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
  }
  assert.equal(result.status, 0, `${script} failed`);
  return result.stdout;
};

run('tools/build-m04g-evidence-hydrology.mjs');
run('tools/validate-m04g-evidence-hydrology.mjs');
const dry = run('tools/refresh-m04g-evidence-hydrology.mjs', ['--dry-run', '--class', 'freshwater_authoritative', '--limit', '5']);
const plan = JSON.parse(dry);
assert.equal(plan.ok, true);
assert.equal(plan.dry_run, true);
assert.equal(plan.selected, 5);
assert(plan.plan.every((row) => row.hydrology_class === 'freshwater_authoritative'));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/evidence-hydrology/data.json'), 'utf8'));
assert.equal(report.counts.sources, 128);
assert.equal(report.counts.catchments, 18);
assert.equal(report.counts.fanout_lanes, 24);
assert.equal(report.counts.pilot_polls, 25);
assert.deepEqual(report.counts.by_hydrology_class, {
  ocean_discovery:16,
  freshwater_authoritative:72,
  tributary_direct_voice:24,
  aquifer_archival_or_restricted:16,
});
assert.equal(report.current_ceiling.system_claim, 'retained_candidate_only');
assert.equal(report.boundaries.conclusion_generated, false);
assert.equal(report.boundaries.estate_completion_claimed, false);
assert.equal(report.promotion_law.source_count_is_not_proof, true);
assert(report.connected_estates.some((row) => row.program === 'M-04B'));
assert(report.connected_estates.some((row) => row.program === 'M-04F'));
assert(report.connected_estates.some((row) => row.program === 'F20-F46'));
assert(report.fanout.some((lane) => lane.lane_id === 'H18' && lane.title.includes('Flock')));
assert(report.fanout.some((lane) => lane.lane_id === 'H24'));

const html = fs.readFileSync(path.join(root, 'reports/core-thesis/evidence-hydrology/index.html'), 'utf8');
assert(html.includes('Evidence Hydrology'));
assert(html.includes('128'));
assert(html.includes('OCEAN DISCOVERY'));
assert(html.includes('candidate_only'));
console.log('m04g-evidence-hydrology.test: OK');
