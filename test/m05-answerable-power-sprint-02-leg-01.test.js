#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  if(result.status!==0){
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${args.join(' ')} failed`);
  }
  return result.stdout;
};

run(['tools/build-m05-answerable-power-sprint-02-leg-01.mjs']);
run(['tools/validate-m05-answerable-power-sprint-02-leg-01.mjs']);

const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-01.json'),'utf8'));
assert.equal(report.counts.ecosystem_layers,4);
assert.equal(report.counts.decision_sources,4);
assert.equal(report.counts.chain_stages,4);
assert.equal(report.counts.transitions,5);
assert.equal(report.counts.propositions,4);
assert.equal(report.current_result.disposition,'requires_additional_acquisition');
assert.equal(report.current_result.maximum_current_ceiling,'actor_specific_institutional_translation');
assert.equal(report.disposition_counts.supported_for_human_review,1);
assert.equal(report.disposition_counts.requires_additional_acquisition,1);
assert.equal(report.disposition_counts.bounded_non_link,1);
assert.equal(report.disposition_counts.retained_candidate_only,1);
assert.equal(report.transition_counts.supported_for_human_review,2);
assert.equal(report.transition_counts.requires_additional_acquisition,3);
assert.equal(report.boundaries.same_day_sequence_proves_self_selection,false);
assert.equal(report.boundaries.advisory_role_proves_final_authority,false);
assert.ok(fs.statSync(path.join(root,'reports/core-thesis/answerable-power/sprint-02-leg-01.html')).size>1000);

console.log('m05-answerable-power-sprint-02-leg-01.test: OK');
