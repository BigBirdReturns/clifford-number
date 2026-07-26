#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-02-leg-05.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-leg-05.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-05.json'),'utf8'));
assert.equal(report.counts.sources,8);
assert.equal(report.counts.r6_dimensions,8);
assert.equal(report.counts.propositions,8);
assert.equal(report.current_result.highest_observed_level,'R6');
assert.equal(report.current_result.observed_binding_result,true);
assert.equal(report.current_result.represented_population_has_direct_individual_veto,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.disposition_counts.supported_for_human_review,4);
assert.equal(report.disposition_counts.bounded_non_link,3);
assert.equal(report.disposition_counts.retained_candidate_only,1);
const r6=report.candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L5-P03');
assert.equal(r6.maximum_ceiling,'R6_bounded_collective_co_governance_over_monitoring_use');
console.log('m05-answerable-power-sprint-02-leg-05.test: OK');
