import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {buildTimelineModel,layoutTimeline} from '../src/visual-aperture-timeline.mjs';
const sg=JSON.parse(readFileSync('build/surface-graph.json','utf8'));
const hg=JSON.parse(readFileSync('build/hop-graph.json','utf8'));
const snapshot=JSON.stringify({sg,hg});
const recorded=buildTimelineModel(sg,hg);
const event=buildTimelineModel(sg,hg,{timeBasis:'occurrence'});
assert.equal(recorded.rows.length,12234);assert.equal(event.rows.length,recorded.rows.length);
assert.deepEqual(recorded.counts.kinds,{day:10495,span:1423,year:2,open:314,undated:0});
assert.deepEqual(event.counts.kinds,{day:9310,span:1416,year:9,open:314,undated:1185}); // 2026-11-16 awards re-dated (owner: "Yes, restore them"): day 9280 -> 9310, undated 1215 -> 1185 (the 30 rows of the fifteen awards dated by their USAspending signature date are recorded dates, not retrieval-day observations).
assert.equal(JSON.stringify({sg,hg}),snapshot,'source graphs are immutable');
let obs=0,unknown=0,years=0;const scopes={};
for(const r of recorded.rows){const e=event.rowsByKey.get(r.key);assert.ok(e);assert.deepEqual(r.receipt_ids,e.receipt_ids);assert.equal(r.surface_hop_eligible,e.surface_hop_eligible);assert.equal(r.role,e.role);assert.equal(r.evidence_class,e.evidence_class);assert.equal(r.date_basis,e.date_basis);assert.equal(r.date_limits,e.date_limits);
 if(r.temporal_semantics==='observation'){obs++;assert.equal(e.start_day,null);assert.equal(e.end_day,null);assert.equal(e.time_start,null);assert.equal(e.time_end,null);assert.equal(r.time_start,r.source_time_start);assert.equal(r.time_end,r.source_time_end);assert.equal(e.observation_start,r.source_time_start);scopes[r.surface_id]=(scopes[r.surface_id]||0)+1;}
 else if(r.temporal_semantics==='unknown_event'){unknown++;assert.equal(e.start_day,null);assert.equal(e.end_day,null);}
 else if(r.temporal_semantics==='year_precision'){years++;assert.match(e.time_start,/^\d{4}$/);assert.equal(e.precision,'year');}
 else {assert.equal(e.time_start,r.time_start || null);assert.equal(e.time_end,r.time_end || null);assert.equal(e.start_day,r.start_day);assert.equal(e.end_day,r.end_day);}
}
const named=recorded.rows.filter(x=>/will-depue-self-reported-openai-role|encode.*team|team.*encode/i.test(x.surface_id));
const depue=recorded.rows.filter(x=>x.surface_id==='will-depue-self-reported-openai-role-2026-11-13');assert.equal(depue.length,2);assert.ok(depue.every(x=>x.observed_on==='2026-11-13'&&x.occurrence_time_start===null&&x.date_basis));
const actor=recorded.rows.find(x=>x.temporal_semantics==='observation'&&x.participant_type==='actor');const plotted=layoutTimeline(recorded,{laneIds:[actor.entity_id],maxLanes:18,domainFrom:'2026-01-01',domainTo:'2027-01-01'});for(const mark of plotted.marks){assert.ok('date_basis' in mark);assert.ok('time_basis' in mark);}
const runtime=readFileSync('src/visual-aperture-timeline-runtime.js','utf8');const fn=runtime.slice(runtime.indexOf('function timelineWindowText('),runtime.indexOf('\nfunction timelineEvidenceBadges('));const label=vm.runInNewContext('('+fn+')');assert.match(label(depue[0]),/observed 2026-11-13.*unknown/);assert.match(label(event.rowsByKey.get(depue[0].key)),/observed 2026-11-13.*unknown/);
assert.throws(()=>buildTimelineModel(sg,hg,{timeBasis:'made-up'}),TypeError);
assert.match(readFileSync('src/visual-aperture-timeline.mjs','utf8'),/export function resolveTemporalPlacement/);
console.log(JSON.stringify({state:'PASS',source_rows:recorded.rows.length,observation_rows:obs,unknown_event_rows:unknown,year_precision_rows:years,observation_surfaces:Object.keys(scopes).length,original_records_unchanged:true,recorded_view_preserved:true,hop_bases:recorded.counts.hop_bases}));
