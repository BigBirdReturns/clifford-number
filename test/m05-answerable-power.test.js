#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power.mjs']);
run(['tools/validate-m05-answerable-power.mjs']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/data.json'),'utf8'));
assert.equal(report.counts.stories,13);
assert.equal(report.counts.lanes,16);
assert.equal(report.counts.standalone_actor,3);
assert.equal(report.counts.exact_overlap,3);
assert.equal(report.counts.answer_story,3);
assert.equal(report.boundaries.promotes_to,'candidate_only');
assert.equal(report.boundaries.conclusion_generated,false);
assert.equal(report.boundaries.estate_completion_claimed,false);
const ids=new Set(report.stories.map((row)=>row.story_id));
for(const id of ['M05-S01','M05-S02','M05-S03','M05-S04','M05-S05','M05-S06','M05-S10','M05-S12','M05-S13'])assert.ok(ids.has(id),id);
console.log('m05-answerable-power.test: OK');
