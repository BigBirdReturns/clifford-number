#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03-leg-06.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03-leg-06.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-leg-06.json'),'utf8'));
assert.equal(report.counts.sources,14);
assert.equal(report.counts.systems,7);
assert.equal(report.counts.r_levels,7);
assert.equal(report.counts.value_dimensions,10);
assert.equal(report.counts.fault_lines,12);
assert.equal(report.counts.propositions,15);
assert.equal(report.current_result.highest_observed_level,'R7');
assert.equal(report.current_result.cross_sector_residual_right_architectures_observed,true);
assert.equal(report.current_result.cross_sector_realized_public_return_observed,false);
assert.equal(report.current_result.affected_party_distribution_observed,false);
assert.equal(report.current_result.one_complete_cross_sector_transfer_observed,false);
assert.equal(report.current_result.works_standard_met,false);
assert.ok(report.propositions.some((row)=>row.disposition==='supported_for_human_review'));
assert.ok(report.propositions.filter((row)=>row.disposition==='bounded_non_link').length>=5);
assert.equal(report.boundaries.equity_proves_realized_return,false);
assert.equal(report.boundaries.public_fiscal_return_proves_affected_party_recovery,false);
console.log('m05-answerable-power-sprint-03-leg-06.test: OK');
