#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-07.mjs']);
run(['tools/validate-m05-answerable-power-sprint-07.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-07.json'),'utf8'));
assert.equal(report.counts.legs,7);assert.equal(report.counts.roles,5);assert.equal(report.counts.automatic_disqualifiers,14);assert.equal(report.counts.human_review_flags,8);assert.equal(report.counts.scenarios,18);assert.deepEqual(report.counts.scenario_denominator,{eligible_for_registry_proposal:1,blocked:13,mandatory_pause:4,total:18});assert.equal(report.counts.eligible_adjudicators,0);assert.equal(report.counts.approved_for_a1,0);assert.equal(report.current_result.a1_observed,false);assert.equal(report.current_result.maximum_verified_adoption_level,'A0');assert.equal(report.current_result.project_complete,false);assert.match(report.release_manifest.combined_sha256,/^[0-9a-f]{64}$/);
console.log('m05-answerable-power-sprint-07.test: OK');
