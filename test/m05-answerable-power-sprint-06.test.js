#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-06.mjs']);
run(['tools/validate-m05-answerable-power-sprint-06.mjs']);
run(['test/m05-independent-reproduction.test.js']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-06.json'),'utf8'));
assert.equal(report.counts.intake_stages,5);assert.equal(report.counts.legs,7);assert.equal(report.counts.required_commands,8);assert.equal(report.counts.registry_entries,0);assert.equal(report.counts.approved_for_a1,0);
assert.equal(report.current_result.maximum_verified_adoption_level,'A0');assert.equal(report.current_result.a1_observed,false);assert.equal(report.current_result.external_receipts_received,0);assert.equal(report.boundaries.maintainer_reproduction_proves_a1,false);
console.log('m05-answerable-power-sprint-06.test: OK');
