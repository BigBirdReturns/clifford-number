#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-02-leg-04.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-leg-04.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-04.json'),'utf8'));
assert.equal(report.counts.sources,6);
assert.equal(report.counts.chain_stages,8);
assert.equal(report.counts.propositions,8);
assert.equal(report.counts.causal_fault_lines,6);
assert.equal(report.counts.decisive_acquisitions,11);
assert.equal(report.current_result.person_level_chain_reached,true);
assert.equal(report.current_result.direct_voice_present,true);
assert.equal(report.current_result.highest_observed_answer_level,'R4');
assert.equal(report.disposition_counts.supported_for_human_review,4);
assert.equal(report.disposition_counts.bounded_non_link,2);
assert.equal(report.disposition_counts.requires_additional_acquisition,1);
assert.equal(report.disposition_counts.retained_candidate_only,1);
const p02=report.ledger.propositions.find((row)=>row.proposition_id==='M05-S02-L4-P02');
const p07=report.ledger.propositions.find((row)=>row.proposition_id==='M05-S02-L4-P07');
assert.equal(p02.disposition,'bounded_non_link');
assert.equal(p07.disposition,'bounded_non_link');
console.log('m05-answerable-power-sprint-02-leg-04.test: OK');
