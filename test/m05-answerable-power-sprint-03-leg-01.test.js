#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03-leg-01.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03-leg-01.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-leg-01.json'),'utf8'));
assert.equal(report.constitution_id,'APC-01');
assert.equal(report.counts.roles,8);
assert.equal(report.counts.rights_levels,7);
assert.equal(report.counts.anti_bypass_rules,8);
assert.equal(report.counts.domains,5);
assert.equal(report.current_result.answer_constitution_frozen,true);
assert.equal(report.current_result.candidate_design_ready_for_domain_testing,true);
assert.equal(report.current_result.one_combined_durable_answer_observed,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.current_result.project_complete,false);
assert.equal(report.works_standard.current_state,'not_met');
assert.equal(report.boundaries.design_coherence_proves_observed_effectiveness,false);
console.log('m05-answerable-power-sprint-03-leg-01.test: OK');
