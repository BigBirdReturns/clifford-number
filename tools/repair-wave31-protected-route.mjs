#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const branch = 'agent/lake-allocator-war-public-routes-wave-31';
const policyPath = 'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json';
const triggerPath = '.github/tmp/wave31-protected-route-repair-trigger.json';
const exportTriggerPath = '.github/tmp/wave31-tree-export-trigger.json';
const selfPath = 'tools/repair-wave31-protected-route.mjs';

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const route = policy.route_plans.find(row => row.route_class === 'protected-personnel-records');
if (!route) throw new Error('Wave 31 protected-personnel route is missing');
if (!Array.isArray(route.recovered_surfaces)) throw new Error('Wave 31 protected-personnel recovered_surfaces is not an array');
route.recovered_surfaces = [
  'Wave 30 preserved four exact protected-personnel obligations with stable task, route, and owner references',
  'Wave 31 explicitly preserves the public-execution exclusion and lawful-access boundary'
];
fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);

for (const relative of [triggerPath, exportTriggerPath, selfPath]) {
  if (fs.existsSync(relative)) fs.rmSync(relative);
}
try { fs.rmdirSync('.github/tmp'); } catch {}

execFileSync('node', ['tools/build-lake-allocator-war-public-route-execution-wave-31.mjs'], { stdio: 'inherit' });
const repaired = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const repairedRoute = repaired.route_plans.find(row => row.route_class === 'protected-personnel-records');
if (repairedRoute.public_execution !== false) throw new Error('Wave 31 protected route became publicly executable');
if (repairedRoute.default_result_state !== 'preserved_access_bounded') throw new Error('Wave 31 protected route result state drift');
for (const key of ['recovered_surfaces', 'remaining_limits', 'refused_substitutions', 'correction_route']) {
  if (!Array.isArray(repairedRoute[key]) || repairedRoute[key].length === 0) {
    throw new Error(`Wave 31 protected route list remains empty: ${key}`);
  }
}
const projection = JSON.parse(fs.readFileSync('build/lake-actions/allocator-war-public-route-execution-wave-31.json', 'utf8'));
if (projection.counts.preserved_access_bounded_tasks !== 4) throw new Error('Wave 31 protected task count drift');
if (projection.counts.executed_public_tasks !== 34) throw new Error('Wave 31 public execution count drift');
for (const key of ['complete_denominators', 'evidence_rows', 'estate_adoptions', 'finding_promotions', 'graph_effects', 'publication_clearances']) {
  if (projection.counts[key] !== 0) throw new Error(`Wave 31 authority inflation during repair: ${key}`);
}

execFileSync('git', ['config', 'user.name', 'github-actions[bot]']);
execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
execFileSync('git', ['add', '-A']);
const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (!status) throw new Error('Wave 31 protected-route repair produced no change');
execFileSync('git', ['commit', '-m', 'Repair Wave 31 protected-route custody surface'], { stdio: 'inherit' });
execFileSync('git', ['fetch', 'origin', branch], { stdio: 'inherit' });
const remoteHead = execFileSync('git', ['rev-parse', 'FETCH_HEAD'], { encoding: 'utf8' }).trim();
const parentHead = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
if (remoteHead !== parentHead) {
  throw new Error(`Wave 31 repair stale-head refusal: remote=${remoteHead} parent=${parentHead}`);
}
execFileSync('git', ['push', 'origin', `HEAD:${branch}`], { stdio: 'inherit' });
