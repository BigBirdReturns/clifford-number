#!/usr/bin/env node
// The visitor surface is a projection of already-published case records.
// It cannot promote repository-only intake, infer ownership, or assign scores.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root} from './lib/ledger.mjs';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourcePath='build/cases/anduril-access-ownership.json';
const source=JSON.parse(read(sourcePath));
const policy=JSON.parse(read('data/project/publication-allowlist.json'));
if(!policy.paths.includes(sourcePath))throw Error('Visitor source must already be publicly admitted');
const http=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
const excluded=[];
const records=source.claims.filter(r=>{
 const ok=r.receipts?.length&&r.receipts.every(x=>http(x.url||x.source_url));
 if(!ok)excluded.push({claim_id:r.claim_id,reason:'Private or unresolved supporting locator; not included in the visitor projection.'});
 return ok;
}).map(r=>({claim_id:r.claim_id,subject_id:r.subject_id,predicate:r.predicate,plain:r.plain,object:r.object,
 claim_status:r.claim_status,evidence_class:r.evidence_class,causal_status:r.causal_status,
 valid_from:r.valid_from,valid_until:r.valid_until,qualification:r.qualification||source.boundary,
 receipts:r.receipts.map(x=>({receipt_id:x.receipt_id,label:x.label,url:x.url||x.source_url,publisher:x.publisher,
  source_type:x.source_type,evidence_class:x.evidence_class,retrieved_at:x.retrieved_at,
  content_sha256:x.content_sha256||null,archive:x.archive||null,notes:x.notes||x.limits||null})),
 case_status:source.status,graph_effect:'none',publication_approval_added:false}));
const scenarios=[
 {id:'obligation',label:'A government order',claim_id:'clm-cbp-order-362974500',eyebrow:'PUBLIC PROCUREMENT',title:'Read the amount in its own terms.',field:'amount',unit:'obligated',question:'What money was committed?',note:'The source reports an obligated order. It does not establish payment, revenue or delivered performance.'},
 {id:'ceiling',label:'A contract ceiling',claim_id:'clm-army-enterprise-vehicle',eyebrow:'CONTRACT STRUCTURE',title:'A ceiling preserves a possibility.',field:'amount',unit:'ceiling',question:'What does the headline amount represent?',note:'An ordering vehicle describes the possible scope. Obligations and payments require their own records.'},
 {id:'counterweight',label:'A competitive award',claim_id:'clm-usmc-competitive-ten-offers',eyebrow:'COUNTERWEIGHT',title:'Keep the competitive record visible.',field:'amount',unit:'ceiling',question:'What evidence tests the story?',note:'The retained award record includes ten offers. Comparative evidence travels with the investigation.'}
];
for(const s of scenarios)if(!records.some(r=>r.claim_id===s.claim_id))throw Error('Scenario has no public claim: '+s.id);
const payload={schema_version:'clifford-visitor-evidence@1',source:{path:sourcePath,sha256:hash(read(sourcePath)),case_id:source.case_id,
 as_of:source.as_of,published_at:source.published_at,status:source.status},
 scope:'All claims in the existing public Anduril case with public supporting locators. This is one worked example, not the whole corpus or a new independent review.',
 boundary:source.boundary,disclaimer:source.disclaimer,records,excluded,scenarios,
 consumer:{name:'Integrity.ai',relationship:'Tailored evaluation path, not a partnership or endorsement.',status:'Review export candidate; production registry ingestion untested.',dimension:null,polarity:null,weight:null,registry_status:null},
 counts:{records:records.length,receipts:new Set(records.flatMap(r=>r.receipts.map(x=>x.receipt_id))).size,excluded:excluded.length}};
fs.mkdirSync(path.join(root,'experience'),{recursive:true});
fs.writeFileSync(path.join(root,'experience/evidence.json'),JSON.stringify(payload,null,2)+'\n');
const exports=records.map(r=>({id:r.claim_id,entity_ref:r.subject_id,summary:r.plain,
 sources:r.receipts.map(x=>x.url),source_dates:{valid_from:r.valid_from,valid_until:r.valid_until,receipts:r.receipts.map(x=>({id:x.receipt_id,retrieved_at:x.retrieved_at}))},
 native_status:r.claim_status,case_status:r.case_status,evidence_class:r.evidence_class,causal_status:r.causal_status,
 qualification:r.qualification,object:r.object,review_state:'requires_independent_review',
 dimension:null,polarity:null,weight:null,registry_status:null,graph_effect:'none',consumer_accepted:false}));
fs.writeFileSync(path.join(root,'experience/review-inbox.jsonl'),exports.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(`visitor-experience: ${records.length} existing public claims, ${payload.counts.receipts} public source locators; ${excluded.length} claims excluded; no promotion`);
