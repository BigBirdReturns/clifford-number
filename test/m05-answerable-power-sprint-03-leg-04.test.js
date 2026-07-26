#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03-leg-04.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03-leg-04.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-leg-04.json'),'utf8'));
assert.equal(report.constitution_under_test,'APC-01');
assert.equal(report.counts.systems,4);
assert.equal(report.counts.r_levels,7);
assert.equal(report.counts.fault_lines,5);
assert.equal(report.counts.cross_system_controls,7);
assert.equal(report.counts.propositions,7);
assert.equal(report.domain_adapter.adapter_id,'APC-WORK-01');
assert.equal(report.current_result.r6_positive_control_observed,true);
assert.equal(report.current_result.centralization_fault_line_supported,true);
assert.equal(report.current_result.capability_based_anti_bypass_supported,true);
assert.equal(report.current_result.direct_individual_veto_observed,false);
assert.equal(report.current_result.r5_observed_in_domain,false);
assert.equal(report.current_result.r7_observed_in_domain,false);
assert.equal(report.current_result.composed_answer_observed,false);
assert.equal(report.boundaries.r6_proves_r4_r5_or_r7,false);
assert.equal(report.boundaries.one_jurisdiction_proves_transferability,false);
console.log('m05-answerable-power-sprint-03-leg-04.test: OK');
