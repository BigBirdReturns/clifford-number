#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-plan.json'),'utf8'));
assert.equal(report.counts.answer_levels,7);
assert.equal(report.counts.domain_tests,5);
assert.equal(report.counts.lanes,7);
assert.equal(report.counts.live_issues,8);
assert.equal(report.sprint_02_reconciliation.one_combined_durable_answer_observed,false);
assert.equal(report.sprint_02_reconciliation.works_standard_met,false);
assert.equal(report.sprint_exit_contract.minimum_domains_tested,3);
assert.equal(report.sprint_exit_contract.minimum_jurisdictions_tested,2);
assert.equal(report.sprint_exit_contract.network_output_auto_promotion,false);
assert.equal(report.boundaries.all_r_levels_observed_proves_composed_answer,false);
assert.equal(report.boundaries.source_health_proves_answer_effectiveness,false);
console.log('m05-answerable-power-sprint-03.test: OK');
