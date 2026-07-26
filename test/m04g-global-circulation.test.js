#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m04g-global-circulation.mjs']);
run(['tools/validate-m04g-global-circulation.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/global-circulation/data.json'),'utf8'));
assert.equal(report.counts.basins,12);assert.equal(report.counts.currents,8);assert.equal(report.counts.sources,192);assert.equal(report.counts.polls,96);assert.equal(report.counts.lanes,20);assert.equal(report.coverage_gaps.length,0);assert.ok(report.counts.unique_hosts>=100);assert.ok(report.source_diversity.max_host_share<=0.08);
const allPlan=JSON.parse(run(['tools/refresh-m04g-global-circulation.mjs','--dry-run','--basin','all','--class','all','--limit','200']));assert.equal(allPlan.selected,96);
for(const basin of report.basins){const plan=JSON.parse(run(['tools/refresh-m04g-global-circulation.mjs','--dry-run','--basin',basin.basin_id,'--class','all','--limit','20']));assert.equal(plan.selected,8)}
const workflow=fs.readFileSync(path.join(root,'.github/workflows/m04g-global-circulation.yml'),'utf8');for(const cron of ['17 0 * * *','17 6 * * *','17 12 * * *','17 18 * * *','43 2 * * 1','53 4 1 * *'])assert.ok(workflow.includes(cron));assert.ok(workflow.includes('contents: read'));assert.ok(!workflow.includes('contents: write'));assert.ok(workflow.includes('orbit-proof'));
console.log('m04g-global-circulation.test: OK');
