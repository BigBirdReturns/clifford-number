#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const methodology=read('data/project/m05-answerable-power-methodology.json');
const registry=read('data/project/m05-answerable-power-story-registry.json');
const fanout=read('data/project/m05-answerable-power-fanout.json');
const report=read('reports/core-thesis/answerable-power/data.json');

if(methodology.story_modes.length!==5)fail('expected five story modes');
if(methodology.power_answer_ladder.length!==8)fail('expected R0-R7 ladder');
if(registry.stories.length!==13)fail(`expected 13 stories, got ${registry.stories.length}`);
if(fanout.lanes.length!==16)fail(`expected 16 lanes, got ${fanout.lanes.length}`);
if(new Set(registry.stories.map((row)=>row.story_id)).size!==registry.stories.length)fail('duplicate story ids');
if(new Set(fanout.lanes.map((row)=>row.lane_id)).size!==fanout.lanes.length)fail('duplicate lane ids');

const modes=new Set(methodology.story_modes.map((row)=>row.mode_id));
for(const story of registry.stories){
  if(!modes.has(story.mode))fail(`${story.story_id}: unknown mode`);
  if(!story.question || !story.maximum_ceiling)fail(`${story.story_id}: incomplete story`);
  if(!Array.isArray(story.canonical_routes) || story.canonical_routes.length<2)fail(`${story.story_id}: insufficient canonical routes`);
  if(!Array.isArray(story.must_preserve) || story.must_preserve.length<4)fail(`${story.story_id}: insufficient preservation contract`);
}
for(const lane of fanout.lanes){
  if(!lane.question || !lane.falsifier || !lane.stopping_rule)fail(`${lane.lane_id}: incomplete lane`);
  if(!Array.isArray(lane.allowed_terminal_states) || lane.allowed_terminal_states.length<3)fail(`${lane.lane_id}: terminal states`);
}
const expectedCounts={standalone_actor:3,exact_overlap:3,constitutional_mechanism:3,answer_story:3,non_link:1};
for(const [mode,count] of Object.entries(expectedCounts)){
  if(registry.counts[mode]!==count)fail(`${mode}: expected ${count}, got ${registry.counts[mode]}`);
}
if(methodology.works_standard.minimum_observed_domains<3)fail('works standard too weak');
if(methodology.works_standard.minimum_observed_jurisdictions<2)fail('jurisdiction standard too weak');
for(const [key,value] of Object.entries(methodology.boundaries)){
  if(['status','promotes_to','graph_effect'].includes(key))continue;
  if(value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.stories!==13 || report.counts.lanes!==16)fail('report counts drift');
if(JSON.stringify(report.boundaries)!==JSON.stringify(methodology.boundaries))fail('report boundary drift');
console.log('validate-m05-answerable-power: OK');
