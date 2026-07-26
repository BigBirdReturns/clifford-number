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
assert.equal(report.counts.merged_research_legs,6);
assert.equal(report.counts.engineering_merged_pending_proof,1);
assert.equal(report.counts.answer_levels_observed,7);
assert.deepEqual(report.answer_levels_observed,['R1','R2','R3','R4','R5','R6','R7']);
assert.equal(report.reconciliation.cross_domain_assessment.one_combined_durable_answer_observed,false);
assert.equal(report.reconciliation.cross_domain_assessment.works_standard_met,false);
const observationExists=fs.existsSync(path.join(root,'data/project/m05-answerable-power-sprint-02-source-health-observation.json'));
assert.equal(report.terminal_state,observationExists?'sprint_02_reconciled':'awaiting_post_repair_orbit');
assert.equal(report.source_health_state.evidence_sufficient,false);
console.log('m05-answerable-power-sprint-02-reconciliation.test: OK');
