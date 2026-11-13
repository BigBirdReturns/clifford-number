#!/usr/bin/env node
// One finite daily acquisition, no daemon/scheduler. External Estate/Automations owns cadence.
// Preserves previous editions and source status, with explicit no-change and change dispositions.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {acquire,verify} from './integrity-circulation.mjs';
import {writeTriage,analyze} from './integrity-triage.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const put=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const assert=(v,x)=>{if(!v)throw Error(x);};
const iso=x=>/^2026-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function diffSnapshots(current,old){
 const id=r=>r.cohort_id+'|'+r.member_id+'|'+r.award_id+'|'+r.recipient_uei;
 const oldMap=new Map(old.map(r=>[id(r),r]));
 const newMap=new Map(current.map(r=>[id(r),r]));
 const additions=[],amendments=[],no_longer_in_search=[];
 for(const[k,v]of newMap){const p=oldMap.get(k);
  if(!p)additions.push({id:k,roster_label:v.roster_label,recipient_name:v.recipient_name,award_id:v.award_id,recipient_uei:v.recipient_uei,amount_kind:v.amount_kind,source_award_amount:v.source_award_amount,status:'new_search_observation_not_new_award'});
  else if(JSON.stringify([p.source_award_amount,p.period_of_performance_start,p.period_of_performance_end,p.description])!==JSON.stringify([v.source_award_amount,v.period_of_performance_start,v.period_of_performance_end,v.description]))
   amendments.push({id:k,before:{award_amount:p.source_award_amount,dates:[p.period_of_performance_start,p.period_of_performance_end]},after:{award_amount:v.source_award_amount,dates:[v.period_of_performance_start,v.period_of_performance_end]},status:'changed_source_fields_not_contract_modification_proof'});
 }
 for(const[k,v]of oldMap)if(!newMap.has(k))no_longer_in_search.push({id:k,roster_label:v.roster_label,status:'not_in_current_bounded_query_not_contract_termination'});
 return {new_search_observations:additions,changed_source_fields:amendments,no_longer_returned:no_longer_in_search};
}
export async function runDaily({state,selection,dateKey,today=new Date(),acquireFn=acquire,triageFn=writeTriage}){
 assert(iso(dateKey)&&dateKey<='2026-12-31','Daily source period is bounded to 2026');
 const effective=new Date(today).toISOString().slice(0,10);
 assert(dateKey<=effective,'Do not publish observations from a future date');
 const selectionBytes=fs.readFileSync(selection),selectionDigest=sha(selectionBytes);
 const edition=path.join(state,'daily','run-'+dateKey),triage=path.join(state,'daily','triage-'+dateKey);
 const existed=fs.existsSync(edition);
 if(existed){
  const v=verify(edition);
  assert(read(path.join(edition,'selection.json')).schema==='clifford/public-procurement-selection@1','Unrecognized prior selection');
  assert(sha(fs.readFileSync(path.join(edition,'selection.json')))===selectionDigest,'Selection changed; retain date scope and use a new explicit edition');
  assert(fs.existsSync(triage),'An earlier acquisition exists without triage. Do not silently replay; repair the retained stage separately.');
  const result=read(path.join(state,'daily','digest-'+dateKey+'.json'));
  assert(result.acquisition_manifest_sha256===v.manifest_sha256,'Retained digest mismatch');
  return {...result,already_completed:true};
 }
 fs.mkdirSync(path.join(state,'daily'),{recursive:true});
 const sourceSelection=JSON.parse(selectionBytes.toString('utf8'));
 await acquireFn({selection:sourceSelection,output:edition,start:'2025-10-01',end:dateKey,perPage:50,maxPages:2,pauseMs:250});
 const v=verify(edition);
 const tr=triageFn(edition,triage);
 const cur=fs.readFileSync(path.join(edition,'rows.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const candidateDates=fs.readdirSync(path.join(state,'daily')).filter(x=>/^run-2026-\d{2}-\d{2}$/.test(x)&&x<'run-'+dateKey).sort();
 let baseline=null,delta=null;
 if(candidateDates.length){
  const previous=path.join(state,'daily',candidateDates.at(-1));
  const prior=verify(previous);
  baseline={edition:candidateDates.at(-1),manifest_sha256:prior.manifest_sha256};
  const prev=fs.readFileSync(path.join(previous,'rows.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  delta=diffSnapshots(cur,prev);
 }
 const sum=read(path.join(edition,'MANIFEST.json'));
 const digest={schema:'clifford/integrity-daily-digest@1',date:dateKey,selection_sha256:selectionDigest,
  acquisition_manifest_sha256:v.manifest_sha256,triage_manifest_sha256:sha(fs.readFileSync(path.join(triage,'MANIFEST.json'))),
  baseline,delta,source_records:sum.source_award_rows,raw_source_pages:sum.source_receipts,
  selected_members:sum.selected_members,complete_queries:sum.members_with_complete_pagination,
  incomplete_searches:sum.pagination_incomplete,query_failures:sum.query_failures,
  lexical_grades:tr.summary.grades,
  publication_status:'held_for_review',
  next_actions:sum.pagination_incomplete>0?['Resolve incomplete pagination and legal-entity identity before public reporting']:['Continue identifier-grade resolution and review of candidate names'],
  classification:'dated search observations, not new contract awards or ethics findings',no_publication:true};
 put(path.join(state,'daily','digest-'+dateKey+'.json'),digest);
 return digest;
}
async function cli(){
 const a=process.argv.slice(2);const args={};for(let i=0;i<a.length;i+=2){assert(a[i].startsWith('--')&&a[i+1],'Expected --key value');args[a[i].slice(2)]=a[i+1];}
 assert(args.state&&args.selection,'--state and --selection required');const day=args.date||new Date().toISOString().slice(0,10);
 console.log(JSON.stringify(await runDaily({state:path.resolve(args.state),selection:path.resolve(args.selection),dateKey:day}),null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error(JSON.stringify({status:'FAILED',error:String(e)}));process.exitCode=1;});
