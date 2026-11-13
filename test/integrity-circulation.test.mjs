import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeSelection,validateSelection,queryBody,acquire,verify} from '../tools/integrity-circulation.mjs';

const selection=makeSelection();
assert.equal(validateSelection(selection).length,35);
assert.deepEqual(selection.cohorts.map(c=>c.members.length),[20,15]);
assert.equal(selection.graph_effect,'none');
assert.equal(selection.publication_status,'not_for_publication');
assert.ok(selection.sources.some(s=>s.cohort==='schoolhouse-2026'&&s.kind==='operator_supplied_public_post_not_independently_recovered'));
assert.throws(()=>validateSelection({...selection,cohorts:[{id:'../escape',members:[{id:'x',label:'x',query:'x'}]}]}),/Invalid slug/);
const body=queryBody('Austere Energy','2025-10-01','2026-11-02',1,30);
assert.equal(body.filters.recipient_search_text[0],'Austere Energy');
assert.deepEqual(body.filters.award_type_codes,['A','B','C','D']);
assert.throws(()=>queryBody('A','2026-02-30','2026-11-02',1,30),/Invalid ISO date/);
function sample(overrides={}){
 return {'Award ID':'FA123-26-C-0001','Recipient Name':'AUSTERE ENERGY INC','Recipient UEI':'123456789012',
  'Award Amount':345000.75,'Awarding Agency':'Department of the Army','Start Date':'2026-01-03','End Date':'2027-01-03','Description':'Sensor test','Award Type':'DEF',...overrides};
}
const tiny={...selection,cohorts:[{id:'schoolhouse-2026',year:2026,members:[
 {id:'s26-01',label:'Austere Energy',query:'Austere Energy',source_status:'operator_supplied_post_not_independently_recovered'},
 {id:'s26-02',label:'Feather Dynamics',query:'Feather Dynamics',source_status:'operator_supplied_post_not_independently_recovered'}]}]};
let calls=[];
async function fake(url,options){
 assert.equal(url,'https://api.usaspending.gov/api/v2/search/spending_by_award/');
 assert.equal(options.method,'POST');
 const req=JSON.parse(options.body);calls.push(req);
 const q=req.filters.recipient_search_text[0],page=req.page;
 let rows=[],hasNext=false;
 if(q==='Austere Energy'&&page===1){rows=[sample()];hasNext=true;}
 else if(q==='Austere Energy'&&page===2){rows=[sample({'Award ID':'FA123-26-C-0002','Recipient UEI':null,'Award Amount':null})];}
 else assert.equal(q,'Feather Dynamics');
 return new globalThis.Response(JSON.stringify({page_metadata:{page,hasNext},results:rows}),{status:200,headers:{'Content-Type':'application/json'}});
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cn-integrity-test-'));
const output=path.join(tmp,'edition-a');
try{
 const receipt=await acquire({selection:tiny,output,start:'2025-10-01',end:'2026-11-02',perPage:30,maxPages:2,pauseMs:0,fetchFn:fake});
 assert.equal(receipt.selected_members,2);assert.equal(receipt.source_award_rows,2);
 assert.equal(receipt.members_with_complete_pagination,2);
 assert.equal(receipt.zero_results,1);assert.equal(receipt.query_failures,0);
 assert.equal(receipt.ftm_stubs,1);assert.equal(calls.length,3);
 assert.equal(verify(output).status,'PASS');
 const rows=fs.readFileSync(path.join(output,'rows.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(rows.length,2);assert.ok(rows.every(r=>r.identity_disposition==='unresolved_roster_label_to_source_uei'));
 assert.ok(rows.every(r=>r.source_receipt.retrieved_at));
 assert.ok(rows.every(r=>r.source_receipt.sha256.length===64));
 assert.equal(rows[0].source_award_amount,'345000.75');assert.equal(rows[0].currency,'USD');
 assert.equal(rows[1].source_award_amount,null);
 assert.equal(rows[0].amount_kind,'USAspending API Award Amount (no payment or ceiling inference)');
 assert.equal(rows[0].graph_effect,'none');assert.equal(rows[0].publication_status,'held_for_review');
 const ftm=JSON.parse(fs.readFileSync(path.join(output,'followthemoney-contract-stubs.jsonl'),'utf8').trim());
 assert.equal(ftm.schema,'Contract');assert.ok(ftm.properties.procedureNumber.includes('FA123-26-C-0001'));
 assert.equal(ftm.properties.amountUsd,undefined);
 assert.throws(()=>verify(path.join(tmp,'missing')),/ENOENT/);
 const bodyPage=path.join(output,rows[0].source_receipt.path);fs.appendFileSync(bodyPage,' ');
 assert.throws(()=>verify(output),/Source receipt mismatch/);
 assert.throws(()=>fs.mkdirSync(output),/EEXIST/);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const errtmp=fs.mkdtempSync(path.join(os.tmpdir(),'cn-integrity-error-'));
try{
 const output=path.join(errtmp,'ed');
 let n=0;
 const receipt=await acquire({selection:tiny,output,start:'2025-10-01',end:'2026-11-02',perPage:30,maxPages:1,pauseMs:0,fetchFn:async()=>{n++;return new globalThis.Response('Unavailable',{status:503});}});
 assert.equal(n,2);assert.equal(receipt.query_failures,2);
 assert.equal(receipt.source_award_rows,0);assert.equal(verify(output).status,'PASS');
 const summary=fs.readFileSync(path.join(output,'runs.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.summary);
 assert.equal(summary.length,2);assert.ok(summary.every(r=>r.source_state==='query_failed'));
}finally{fs.rmSync(errtmp,{recursive:true,force:true});}
console.log('integrity-circulation.test: PASS 35 selected members; pagination, zero, identity holds, page custody, FtM stub, tamper and failure coverage');
