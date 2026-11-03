#!/usr/bin/env node
// Clifford Number: bounded source-native acquisition with no automatic graph promotion.
// Authority: existing BUILD-INSTRUCTIONS.md sections 1.1, 1.2, 1.4, 1.7, 1.10, 1.11.
// Native source: public USAspending search API; data-only review and FtM stub export.
// No credential, household data, match scoring, unbounded enumeration, or automatic publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ENDPOINT = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FIELDS = Object.freeze(['Award ID','Recipient Name','Recipient UEI','Award Amount','Awarding Agency','Start Date','End Date','Description','Award Type']);
const CODE = 'clifford/integrity-circulation@1';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const canonical = value => JSON.stringify(value, Object.keys(value).sort()); // hash boundaries use exact original bytes instead
const date = x => { if (!/^20\d{2}-\d{2}-\d{2}$/.test(x) || new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x) throw Error('Invalid ISO date: '+x); return x; };
const stable = x => String(x).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safeSlug = x => { if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(x)) throw Error('Invalid slug'); return x; };
const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const put = (p,body) => { fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,body); };
const jl = (p,rows) => put(p,rows.map(r=>JSON.stringify(r)).join('\n')+(rows.length?'\n':''));
const digest = p => sha(fs.readFileSync(p));
const assert = (ok, why) => { if (!ok) throw Error(why); };
const rel = (root, p) => { const relative=path.relative(root,p);assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative),'Escaped output');return relative.replaceAll('\\','/'); };
const sourceRef = 'https://luma.com/51srpf3e';
const latest = [
 'Austere Energy','Feather Dynamics','AstroForge','Charter Space','INTALUS',
 'Lola Vision Systems','Longshot Space Technologies Corporation','NX Atomics',
 'Reachpower','varron','Aestus Industries','PVX Aero - KARGO UAV',
 'Vandrel Industries','Dunedain','Crixus Defense'
];
export function makeSelection(sourceSchool=path.join(ROOT,'data/intake/bvvc-defense-capital/schoolhouse.json')) {
 const school=read(sourceSchool), list=school.demo_day_2024.companies;
 assert(list.length===20,'The existing 2024 Schoolhouse source denominator changed');
 const older=list.map((r,i)=>({id:'s24-'+String(i+1).padStart(2,'0'),label:r.label,query:r.label,source_status:'first_party_historical_roster'}));
 const newer=latest.map((label,i)=>({id:'s26-'+String(i+1).padStart(2,'0'),label,query:label,source_status:'operator_supplied_post_not_independently_recovered'}));
 const selection={
  schema:'clifford/public-procurement-selection@1',
  neutral_unit:'Every company label in each bounded SCHOOLHOUSE demo-day roster, without investor, nationality, opinion or adverse-result filtering.',
  public_interest_question:'What USAspending source-native federal award records and source gaps can be found for each roster label under identical public search rules?',
  inclusion:'All 20 names in the preserved 2024 roster and all 15 names in the user-provided 2026 announcement.',
  comparator:'The full older and newer declared rosters are queried with identical time windows, fields, page limits, and classification; there is no hand-picked positive target.',
  exclusions:'No natural persons, inferred subsidiaries, nickname variants, fuzzy aliases, private files, unsourced portfolio joins, or expanded searches.',
  research_status:'lead_acquisition_only',
  review_status:'pending_independent_review',
  graph_effect:'none',
  publication_status:'not_for_publication',
  interpretation:'Roster appearance is not a legal-entity or government contractor match. Empty searches do not establish no contracts; dates, recipient scope, unavailable records, and pagination limits remain explicit.',
  sources:[
   {cohort:'schoolhouse-2024',kind:'retained_first_party_public_roster',path:'data/intake/bvvc-defense-capital/schoolhouse.json',sha256:digest(sourceSchool),as_of:school.as_of||null,claim:'20 company labels in the retained 2024 Demo Day roster'},
   {cohort:'schoolhouse-2026',kind:'operator_supplied_public_post_not_independently_recovered',source_page:'https://www.linkedin.com/company/schoolhouse1776/',corroboration_url:sourceRef,claim:'Organizer event page establishes 15 presentations; it does not independently verify the 15 individual labels',as_of:'2026-11-02'}
  ],
  cohorts:[{id:'schoolhouse-2024',year:2024,roster_status:'retained_first_party',members:older},
   {id:'schoolhouse-2026',year:2026,roster_status:'operator_supplied_unverified',members:newer}],
  coverage_baseline:{included:35,excluded:0,missing_source_names:0},
  sunset:'2026-12-31',
  review_by:'2026-12-31'
 };
 validateSelection(selection);
 return selection;
}
export function validateSelection(selection){
 assert(selection?.schema==='clifford/public-procurement-selection@1','Selection schema invalid');
 for(const c of selection.cohorts) safeSlug(c.id);
 const all=selection.cohorts.flatMap(c=>c.members.map(m=>({...m,cohort_id:c.id})));
 assert(all.length>0 && all.length<=200,'Selection universe must be bounded');
 assert(new Set(all.map(m=>m.cohort_id+'|'+m.id)).size===all.length,'Duplicate selected member ID');
 for(const m of all){
  safeSlug(m.id);assert(typeof m.label==='string' && m.label.trim() && m.label.length<150,'Invalid name');
  assert(m.query===m.label,'The native first pass forbids operator-selected query variants');
  assert(!/[\r\n]/.test(m.query),'Untrusted newline in search');
 }
 assert(selection.graph_effect==='none' && selection.publication_status==='not_for_publication','Selection has forbidden graph/publication effect');
 return all;
}
export function queryBody(label,start,end,page,limit){
 return {filters:{award_type_codes:['A','B','C','D'],recipient_search_text:[label],time_period:[{start_date:date(start),end_date:date(end)}]},
  fields:[...FIELDS],limit,page,sort:'Award Amount',order:'desc'};
}
export async function boundedText(response,max=2_000_000){
 const cl=response.headers.get('content-length');
 if(cl && Number(cl)>max)throw Error('Response exceeds bounded byte limit');
 const chunks=[];let total=0;
 for await(const c of response.body){total+=c.byteLength;if(total>max){await response.body.cancel().catch(()=>{});throw Error('Response exceeded byte limit');}chunks.push(c);}
 return Buffer.concat(chunks,total).toString('utf8');
}
export async function acquire({selection,output,start,end,perPage=30,maxPages=2,pauseMs=180,fetchFn=fetch}){
 const members=validateSelection(selection);date(start);date(end);assert(start<=end,'Reversed period');
 assert(Number.isInteger(perPage)&&perPage>=1&&perPage<=100,'Invalid page limit');
 assert(Number.isInteger(maxPages)&&maxPages>=1&&maxPages<=4,'Invalid maximum pages');
 assert(Number.isInteger(pauseMs)&&pauseMs>=0&&pauseMs<=10000,'Invalid pacing');
 assert(!fs.existsSync(output),'Edition exists, refuse overwrite');
 const parent=path.dirname(output);fs.mkdirSync(parent,{recursive:true});fs.mkdirSync(output);
 const corpus=[],runs=[],apiReceipts=[];
 for(const m of members){
  let finished=false,counts=0,reason='not_started';
  const observed=new Set();
  for(let page=1;page<=maxPages;page++){
   const request=queryBody(m.query,start,end,page,perPage);const body=JSON.stringify(request);
   const sourcePath=path.join(output,'responses',m.cohort_id,m.id+'-p'+page+'.json');
   let responseBytes,parsed,meta,code=0,error=null;
   try{
    const response=await fetchFn(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'CliffordNumber-public-record/2026 (source-acquisition; contact bigbirdreturns@proton.me)'},body,signal:AbortSignal.timeout(28000)});
    code=response.status;
    responseBytes=await boundedText(response);
    if(!response.ok)throw Error('HTTP '+code);
    parsed=JSON.parse(responseBytes);
    if(!Array.isArray(parsed.results) || !parsed.page_metadata || parsed.page_metadata.page!==page)throw Error('Source-native response shape changed');
    for(const x of parsed.results)if(x&&typeof x!=='object')throw Error('Malformed award row');
    meta=parsed.page_metadata; const capturedAt=new Date().toISOString();
    put(sourcePath,responseBytes);
    apiReceipts.push({path:rel(output,sourcePath),sha256:digest(sourcePath),bytes:Buffer.byteLength(responseBytes)});
    const rows=parsed.results;
    for(let i=0;i<rows.length;i++){
     const row=rows[i]; const award=String(row['Award ID']??'').trim(), uei=String(row['Recipient UEI']??'').trim();
     const native=award&&uei?award+'|'+uei:'missing-id:'+m.id+'|p'+page+'|'+i;
     const key=m.cohort_id+'|'+m.id+'|'+native;
     if(observed.has(key))continue; observed.add(key);
     const value=row['Award Amount'];
     const validAmt=typeof value==='number' && Number.isFinite(value);
     corpus.push({id:'cnaward_'+sha(m.cohort_id+'|'+m.id+'|'+native).slice(0,32),cohort_id:m.cohort_id,member_id:m.id,
      roster_label:m.label,roster_source_state:m.source_status,
      award_id:award||null,recipient_name:row['Recipient Name']??null,recipient_uei:uei||null,
      awarding_agency:row['Awarding Agency']??null,source_award_amount:validAmt?String(value):null,
      amount_kind:'USAspending API Award Amount (no payment or ceiling inference)',currency:validAmt?'USD':null,
      period_of_performance_start:row['Start Date']??null,period_of_performance_end:row['End Date']??null,
      description:row.Description??null,award_type:row['Award Type']??null,
      source_native_fields:row,query_body:request,
      identity_disposition:'unresolved_roster_label_to_source_uei',verification_state:'source_returned_candidate_only',
      causal_status:'not_established',graph_effect:'none',publication_status:'held_for_review',
      source_receipt:{path:rel(output,sourcePath),sha256:digest(sourcePath),row_index:i,retrieved_at:capturedAt,endpoint:ENDPOINT},
      caveat:'Source-native agency, UEI and award observation only. Name search is not legal-entity resolution; award amount is not an outlay, profit, total contract ceiling, delivery or proof of wrongdoing.'});
    }
    counts+=rows.length;
    finished=meta.hasNext===false;reason=finished?'pagination_complete':'pagination_incomplete';
    runs.push({cohort_id:m.cohort_id,member_id:m.id,queried_name:m.query,page,source:'USAspending',method:'POST',endpoint:ENDPOINT,
      http_status:code,request_body:request,request_sha256:sha(body),response:rel(output,sourcePath),response_sha256:digest(sourcePath),
      response_bytes:Buffer.byteLength(responseBytes),rows:rows.length,has_next:meta.hasNext,source_state:'ok'});
    if(finished)break;
   } catch(e){
    error=String(e?.message||e).slice(0,500);reason='query_failed';
    runs.push({cohort_id:m.cohort_id,member_id:m.id,queried_name:m.query,page,source:'USAspending',method:'POST',endpoint:ENDPOINT,
      http_status:code,request_body:request,request_sha256:sha(body),source_state:'failed',error});
    break;
   }
   if(pauseMs)await new Promise(r=>setTimeout(r,pauseMs));
  }
  const queried=runs.filter(r=>r.cohort_id===m.cohort_id&&r.member_id===m.id);
  if(queried.every(r=>r.source_state==='ok') && finished && counts===0)reason='zero_rows_in_queried_scope';
  runs.push({cohort_id:m.cohort_id,member_id:m.id,summary:true,source_state:reason,result_rows:counts,pages_queried:queried.length,
    search_complete_within_declared_time_window:finished,company_identity_verified:false});
  if(pauseMs)await new Promise(r=>setTimeout(r,pauseMs));
 }
 // Deterministic, source-scoped FtM Contract stubs. No ownership or amount coercion.
 const seen=new Set(),ftm=[];
 for(const r of corpus){
  if(!r.award_id||!r.recipient_uei)continue;
  const key=r.award_id+'|'+r.recipient_uei;
  if(seen.has(key))continue;seen.add(key);
  const props={name:[r.award_id],procedureNumber:[r.award_id],publisher:['USAspending.gov'],
   sourceUrl:['https://api.usaspending.gov/'],
   notes:['Source-reported award to UEI '+r.recipient_uei+'; amount_kind: '+r.amount_kind+'. Candidate only; no roster identity join, outlay, profit or delivery inferred.']};
  if(r.description)props.title=[String(r.description).slice(0,400)];
  ftm.push({id:'clifford_contract_'+sha(key).slice(0,32),schema:'Contract',properties:props,datasets:['clifford_official_usa_spending_candidate']});
 }
 const sourceFiles={};
 for(const x of apiReceipts)sourceFiles[x.path]={sha256:x.sha256,bytes:x.bytes};
 const selectionRaw=JSON.stringify(selection,null,2)+'\n';put(path.join(output,'selection.json'),selectionRaw);
 jl(path.join(output,'rows.jsonl'),corpus);jl(path.join(output,'runs.jsonl'),runs);jl(path.join(output,'followthemoney-contract-stubs.jsonl'),ftm);
 const acquiredAt=new Date().toISOString();
 const summaries=runs.filter(x=>x.summary);
 const summary={schema:CODE,acquired_at:acquiredAt,source_time_window:{start_date:start,end_date:end},source_endpoint:ENDPOINT,
  source_status:'first_page_or_bounded_pagination_only',selected_members:members.length,
  member_runs:summaries.length,members_with_rows:summaries.filter(x=>x.result_rows>0).length,
  members_with_complete_pagination:summaries.filter(x=>x.search_complete_within_declared_time_window).length,
  zero_results:summaries.filter(x=>x.source_state==='zero_rows_in_queried_scope').length,
  query_failures:summaries.filter(x=>x.source_state==='query_failed').length,
  pagination_incomplete:summaries.filter(x=>x.source_state==='pagination_incomplete').length,
  source_award_rows:corpus.length,distinct_native_awards:seen.size,ftm_stubs:ftm.length,
  source_receipts:apiReceipts.length,selected_roster_status:'2024 retained first-party; 2026 operator-supplied unverified names',
  source_disclaimer:'A name query is a discovery candidate, not proof the roster entity is the award recipient. Zero rows can mean no matching public source records in this time window, not absence of contracts. Do not treat source Award Amount as obligated, paid or a ceiling.',
  no_graph_promotion:true,no_independent_human_review:true,no_partner_ingestion:true,source_files:sourceFiles,
  output_digests:Object.fromEntries(['selection.json','rows.jsonl','runs.jsonl','followthemoney-contract-stubs.jsonl'].map(x=>[x,digest(path.join(output,x))])),
  publication_status:'owner_local_candidate_only',rights:'Official public API records; third-party sources and code rights tracked separately.'};
 put(path.join(output,'MANIFEST.json'),JSON.stringify(summary,null,2)+'\n');
 verify(output);
 return summary;
}
export function verify(output){
 const summary=read(path.join(output,'MANIFEST.json'));
 assert(summary.schema===CODE&&summary.publication_status==='owner_local_candidate_only','Unsupported manifest');
 const dig=summary.output_digests||{};
 for(const [k,v] of Object.entries(dig))assert(digest(path.join(output,k))===v,'Output checksum mismatch: '+k);
 for(const [file,meta] of Object.entries(summary.source_files||{})){
  const p=path.resolve(output,file);
  assert(p.startsWith(path.resolve(output)+path.sep),'Unsafe manifest source path');
  assert(fs.statSync(p).size===meta.bytes&&digest(p)===meta.sha256,'Source receipt mismatch: '+file);
 }
 const selection=read(path.join(output,'selection.json')),members=validateSelection(selection);
 const rows=fs.readFileSync(path.join(output,'rows.jsonl'),'utf8').split(/\r?\n/u).filter(Boolean).map(JSON.parse);
 const runs=fs.readFileSync(path.join(output,'runs.jsonl'),'utf8').split(/\r?\n/u).filter(Boolean).map(JSON.parse);
 const seen=new Set();
 for(const row of rows){
  assert(row.graph_effect==='none'&&row.publication_status==='held_for_review'&&row.identity_disposition==='unresolved_roster_label_to_source_uei','Forbidden claim promotion');
  const key=row.id;assert(!seen.has(key),'Duplicate candidate id');seen.add(key);
  const src=row.source_receipt,fp=path.join(output,src.path);
  assert(digest(fp)===src.sha256,'Row detached from raw source');
  const parent=JSON.parse(fs.readFileSync(fp,'utf8')),official=parent.results?.[src.row_index];
  assert(official&&JSON.stringify(official)===JSON.stringify(row.source_native_fields),'Source row mismatch');
  assert(row.amount_kind.startsWith('USAspending API Award Amount'),'Financial meaning changed');
 }
 const summaries=runs.filter(r=>r.summary);
 assert(summaries.length===members.length,'No complete roster coverage accounting');
 assert(summary.source_award_rows===rows.length&&summary.member_runs===members.length,'Manifest coverage drift');
 assert(summary.no_graph_promotion===true&&summary.no_independent_human_review===true,'Illicit approval');
 return {status:'PASS',selected_members:members.length,observations:rows.length,pages:runs.filter(r=>!r.summary).length,
  complete:summaries.filter(r=>r.search_complete_within_declared_time_window).length,unresolved:rows.length,
  manifest_sha256:digest(path.join(output,'MANIFEST.json'))};
}
async function main(){
 const [cmd,...args]=process.argv.slice(2);const opt={};
 for(let i=0;i<args.length;i+=2){assert(args[i].startsWith('--') && args[i+1]!==undefined,'Expected --key value');opt[args[i].slice(2)]=args[i+1];}
 if(cmd==='selection'){const o=path.resolve(opt.output||'');assert(opt.output,'--output required');assert(!fs.existsSync(o),'Refuse overwrite');put(o,JSON.stringify(makeSelection(),null,2)+'\n');console.log(JSON.stringify({file:o,sha256:digest(o)}));return;}
 if(cmd==='run'){assert(opt.selection && opt.output,'--selection and --output required');
  const result=await acquire({selection:read(opt.selection),output:path.resolve(opt.output),start:date(opt.start||'2025-10-01'),end:date(opt.end||'2026-11-02'),
    perPage:Number(opt.limit||30),maxPages:Number(opt.pages||2),pauseMs:Number(opt.pause||180)});
  console.log(JSON.stringify(result,null,2));return;}
 if(cmd==='verify'){assert(opt.output,'--output required');console.log(JSON.stringify(verify(path.resolve(opt.output)),null,2));return;}
 throw Error('Usage: selection --output FILE | run --selection FILE --output NEW_DIR [--start YYYY-MM-DD --end YYYY-MM-DD --limit 30 --pages 2] | verify --output DIR');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(JSON.stringify({status:'FAILED',error:String(e)}));process.exitCode=1;});
