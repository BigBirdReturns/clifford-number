#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-02-reconciliation.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-reconciliation.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-reconciliation.json'),'utf8'));
assert.equal(report.counts.legs,7);
assert.equal(report.counts.merged_bounded_legs,6);
assert.equal(report.counts.merged_observed_targets_missed,1);
assert.equal(report.counts.answer_levels_observed,7);
assert.deepEqual(report.answer_levels_observed,['R1','R2','R3','R4','R5','R6','R7']);
assert.equal(report.reconciliation.cross_domain_assessment.one_combined_durable_answer_observed,false);
assert.equal(report.reconciliation.cross_domain_assessment.works_standard_met,false);
assert.equal(report.source_health_observation.route_succeeded,63);
assert.equal(report.source_health_observation.content_succeeded,60);
assert.equal(report.source_health_observation.healthy_basins,9);
assert.equal(report.source_health_state.coverage_healthy,false);
assert.equal(report.source_health_state.evidence_sufficient,false);
assert.equal(report.terminal_state,'sprint_02_reconciled_with_open_source_health_deficit');
console.log('m05-answerable-power-sprint-02-reconciliation.test: OK');
