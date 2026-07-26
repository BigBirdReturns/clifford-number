#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-02-leg-06.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-leg-06.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-06.json'),'utf8'));
assert.equal(report.counts.sources,10);
assert.equal(report.counts.recovery_stages,10);
assert.equal(report.counts.propositions,11);
assert.equal(report.current_result.highest_observed_level,'R7');
assert.equal(report.current_result.observed_public_value_recovery,true);
assert.equal(report.current_result.observed_direct_affected_person_recovery,false);
assert.equal(report.current_result.observed_public_co_governance,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.disposition_counts.supported_for_human_review,5);
assert.equal(report.disposition_counts.bounded_non_link,4);
assert.equal(report.disposition_counts.retained_candidate_only,2);
const r7=report.candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P05');
assert.equal(r7.maximum_ceiling,'R7_bounded_public_capital_and_risk_value_recovery');
console.log('m05-answerable-power-sprint-02-leg-06.test: OK');
