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
assert.equal(report.counts.operating_sovereignty_dimensions,10);
assert.equal(report.counts.propositions,9);
assert.equal(report.current_result.highest_observed_level,'R5');
assert.equal(report.current_result.one_complete_domain_answer_observed,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.propositions.find((row)=>row.proposition_id==='M05-S03-L5-P01').disposition,'supported_for_human_review');
assert.equal(report.propositions.find((row)=>row.proposition_id==='M05-S03-L5-P05').disposition,'bounded_non_link');
assert.equal(report.propositions.find((row)=>row.proposition_id==='M05-S03-L5-P09').disposition,'retained_candidate_only');
assert.equal(report.boundaries.public_capacity_proves_co_governance,false);
assert.equal(report.boundaries.cost_savings_prove_value_recovery,false);
console.log('m05-answerable-power-sprint-03-leg-05.test: OK');
