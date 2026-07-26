#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03-leg-05.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03-leg-05.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-leg-05.json'),'utf8'));
assert.equal(report.counts.systems,3);
assert.equal(report.counts.r_levels,7);
assert.equal(report.current_result.highest_observed_level,'R5');
assert.equal(report.current_result.composed_answer_observed,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.boundaries.one_exit_proves_universal_substitutability,false);
assert.equal(report.boundaries.public_operation_proves_R6,false);
assert.equal(report.boundaries.reported_savings_prove_full_value_recovery,false);
assert.ok(report.propositions.some((row)=>row.disposition==='supported_for_human_review'));
assert.ok(report.propositions.filter((row)=>row.disposition==='bounded_non_link').length>=4);
console.log('m05-answerable-power-sprint-03-leg-05.test: OK');
