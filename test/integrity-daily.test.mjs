import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {makeSelection,acquire} from '../tools/integrity-circulation.mjs';
import {runDaily,diffSnapshots} from '../tools/integrity-daily.mjs';
const old={cohort_id:'schoolhouse-2024',member_id:'x',award_id:'A',recipient_uei:'U',source_award_amount:'3',period_of_performance_start:null,period_of_performance_end:null};
assert.deepEqual(diffSnapshots([{...old,source_award_amount:'4'}],[old]).changed_source_fields.map(r=>r.status),['changed_source_fields_not_contract_modification_proof']);
assert.deepEqual(diffSnapshots([],[old]).no_longer_returned.map(r=>r.status),['not_in_current_bounded_query_not_contract_termination']);
const d=fs.mkdtempSync(path.join(os.tmpdir(),'cn-integrity-daily-'));
const selection=makeSelection();
selection.cohorts=[{id:'schoolhouse-2026',year:2026,members:[{id:'s26-01',label:'AstroForge',query:'AstroForge',source_status:'operator_supplied_post_not_independently_recovered'}]}];
const sl=path.join(d,'selection.json');fs.writeFileSync(sl,JSON.stringify(selection,null,2)+'\n');
let calls=0;
const fake=async(url,o)=>{calls++;return new Response(JSON.stringify({page_metadata:{page:1,hasNext:false},results:[{'Award ID':'AA26','Recipient Name':'ASTROFORGE INC','Recipient UEI':'UEIX','Award Amount':500,'Awarding Agency':'NASA','Start Date':'2026-02-01','End Date':'2026-12-31','Description':'Research','Award Type':'A'}]}),{status:200});};
const acquisition=opts=>acquire({...opts,fetchFn:fake,pauseMs:0});
try{
 const dateKey='2026-11-02';
 const first=await runDaily({state:d,selection:sl,dateKey,today:new Date('2026-11-02T23:30:00Z'),acquireFn:acquisition});
 assert.equal(first.source_records,1);assert.equal(calls,1);
 assert.equal(first.lexical_grades.lexically_exact_candidate,1);
 assert.equal(first.no_publication,true);
 const second=await runDaily({state:d,selection:sl,dateKey,today:new Date('2026-11-03T18:30:00Z'),acquireFn:acquisition});
 assert.equal(calls,1);assert.equal(second.already_completed,true);assert.equal(second.source_records,1);
 await assert.rejects(()=>runDaily({state:d,selection:sl,dateKey:'2027-01-01',today:new Date('2027-01-02T00:00:00Z'),acquireFn:acquisition}),/Daily source period is bounded/);
}finally{fs.rmSync(d,{recursive:true,force:true});}
console.log('integrity-daily.test: PASS (one native edition per date, checked reuse, explicit 2026 sunset, no automatic publication)');
