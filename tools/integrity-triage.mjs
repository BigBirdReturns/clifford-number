#!/usr/bin/env node
// Independent lexical review route, never an entity resolver or publication gate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verify} from './integrity-circulation.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const words=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
const suffix=new Set(['inc','incorporated','llc','l','l','c','corporation','corp','co','company','limited','ltd']);
const canonicalWords=x=>{
 const out=words(x).filter(t=>!suffix.has(t));
 return out.map(t=>t==='technologies'||t==='technology'?'tech':t==='aerosystems'?'aerosystem':t);
};
const norm=x=>canonicalWords(x).join(' ');
const empty=x=>x===null||x===undefined||x==='';
export function triage(row){
 const label=row.roster_label||'',recipient=row.recipient_name||'';
 const a=canonicalWords(label),b=canonicalWords(recipient);
 const left=a.join(' '),right=b.join(' ');
 let grade='lexically_inconsistent_search_hit',why='Recipient name does not contain the roster label as an exact normalized entity name.';
 if(!b.length) {grade='missing_recipient_name';why='Source returned no recipient name.';}
 else if(left===right && left) {grade='lexically_exact_candidate';why='Normalized label matches recipient name after legal suffix removal. This is still not an established company identity.';}
 else if(a.length>=2 && a.every((x,i)=>b[i]===x)) {grade='lexically_prefix_candidate';why='All full label tokens occur as a prefix of the recipient name; company identity still requires independent evidence.';}
 else if(a.length===1 && b[0]===a[0]) {grade='single_token_ambiguous';why='A generic or one-token label only overlaps the recipient name; no unique identity is established.';}
 return {candidate_id:row.id,cohort_id:row.cohort_id,member_id:row.member_id,roster_label:label,
  recipient_name:recipient,recipient_uei:row.recipient_uei,award_id:row.award_id,
  lexical_grade:grade,normalized_roster:left,normalized_recipient:right,classification_reason:why,
  identity_disposition:'unresolved',graph_effect:'none',independent_review:'not_performed',
  source_sha256:row.source_receipt.sha256,source_path:row.source_receipt.path,
  amount_kind:row.amount_kind,source_award_amount:row.source_award_amount};
}
export function analyze(dir){
 const v=verify(dir);
 const raw=fs.readFileSync(path.join(dir,'rows.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const records=raw.map(triage);
 const counts={};const perLabel={};
 for(const x of records){counts[x.lexical_grade]=(counts[x.lexical_grade]||0)+1;
  const k=x.cohort_id+'|'+x.roster_label;
  const d=perLabel[k]||(perLabel[k]={cohort:x.cohort_id,label:x.roster_label,records:0,grades:{},distinct_recipient_ueis:new Set(),recipient_examples:new Set()});
  d.records++;d.grades[x.lexical_grade]=(d.grades[x.lexical_grade]||0)+1;
  if(x.recipient_uei)d.distinct_recipient_ueis.add(x.recipient_uei);
  if(x.recipient_name)d.recipient_examples.add(x.recipient_name);
 }
 const details=Object.values(perLabel).map(x=>({...x,distinct_recipient_ueis:x.distinct_recipient_ueis.size,
  recipient_examples:[...x.recipient_examples].slice(0,12)})).sort((a,b)=>a.cohort.localeCompare(b.cohort)||a.label.localeCompare(b.label));
 const summary={schema:'clifford/integrity-triage@1',
  source_manifest_sha256:v.manifest_sha256, source_snapshot:dir,
  total:records.length,grades:counts,
  source_record_status:'USASpending API search observations',
  triage_method:'pure lexical name screen for workload routing, not a legal-entity resolver',
  concluded_award_to_roster_identity:0,company_ownership_claims:0,publication_approved:0,
  incomplete_searches:JSON.parse(fs.readFileSync(path.join(dir,'MANIFEST.json'),'utf8')).pagination_incomplete,
  caveat:'Strong-looking names only prioritize source-identifier acquisition. Search collision is not absence of contracts; exact-name match is not proof that roster company and source recipient are the same legal entity. No ethics or wrongdoing scoring.',
  per_label:details};
 return {summary,records};
}
export function writeTriage(snapshot,out){
 if(fs.existsSync(out))throw Error('Triage output already exists; preserve previous edition.');
 const {summary,records}=analyze(snapshot);
 fs.mkdirSync(out,{recursive:true});
 const raw=records.map(x=>JSON.stringify(x)).join('\n')+'\n';const text=JSON.stringify(summary,null,2)+'\n';
 fs.writeFileSync(path.join(out,'rows.jsonl'),raw);fs.writeFileSync(path.join(out,'analysis.json'),text);
 const m={schema:'clifford/integrity-triage-manifest@1',source_snapshot:snapshot,source_manifest_sha256:summary.source_manifest_sha256,
  sha256:{'rows.jsonl':sha(raw),'analysis.json':sha(text)},no_claim_approval:true};
 fs.writeFileSync(path.join(out,'MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 return {directory:out,summary};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const argv=process.argv.slice(2);const args=Object.fromEntries(argv.reduce((acc,v,i)=>i%2===0?[...acc,[v.replace(/^--/,'') ,argv[i+1]]]:acc,[]));
 try{
  if(!args.snapshot||!args.out)throw Error('--snapshot DIR --out NEW_DIR required');
  const r=writeTriage(path.resolve(args.snapshot),path.resolve(args.out));
  console.log(JSON.stringify(r.summary,null,2));
 }catch(e){console.error(JSON.stringify({status:'FAILED',error:String(e)}));process.exitCode=1;}
}
