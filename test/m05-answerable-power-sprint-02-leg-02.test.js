#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-02-leg-02.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-leg-02.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-02.json'),'utf8'));
assert.equal(report.counts.sources,9);
assert.equal(report.counts.timeline_events,9);
assert.equal(report.counts.propositions,5);
assert.equal(report.disposition_counts.supported_for_human_review,1);
assert.equal(report.disposition_counts.requires_additional_acquisition,1);
assert.equal(report.disposition_counts.bounded_non_link,3);
assert.equal(report.current_result.direct_bridge,'bounded_non_link');
assert.equal(report.current_result.process_overlap,'supported_for_human_review');
assert.equal(report.current_result.procurement_effect,'bounded_non_link');
assert.equal(report.current_result.common_purpose,'bounded_non_link');
assert.equal(report.search_denominator.found_direct_bilateral_instrument,false);
assert.equal(report.search_denominator.found_process_mediated_overlap,true);
const workflow=fs.readFileSync(path.join(root,'.github/workflows/m05-answerable-power.yml'),'utf8');
assert.ok(workflow.includes('m05-answerable-power-sprint-02-leg-02.test.js'));
assert.ok(workflow.includes('build-m05-answerable-power-sprint-02-leg-02.mjs'));
assert.ok(workflow.includes('validate-m05-answerable-power-sprint-02-leg-02.mjs'));
console.log('m05-answerable-power-sprint-02-leg-02.test: OK');
