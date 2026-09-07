#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../tools/validate-natsec100-2025-identity-adjudication.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const fixture = process.env.NATSEC100_IDENTITY_FIXTURE === '1';
function readJsonl(p) { return fs.readFileSync(p,'utf8').trim().split(/\r?\n/).map(JSON.parse); }
function writeJsonl(p, rows) { fs.writeFileSync(p, rows.map((r)=>JSON.stringify(r)).join('\n')+'\n'); }
const dataRel=path.join('data','intake','natsec100-pathways','chunk1');
const summaryRel=path.join(dataRel,'roster-2025-identity-adjudication.json');
const rowsRel=path.join(dataRel,'roster-2025-identity-adjudication.jsonl');
const rosterRel=path.join(dataRel,'roster-2025-official-visual-recovery.jsonl');
const registryRel=path.join(dataRel,'companies.jsonl');
const requiredRel=[summaryRel,rowsRel,rosterRel,registryRel];
function expectFailure(label, mutate) {
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'natsec100-id-adj-'));
  const temp = path.join(tempBase, 'repo');
  for (const rel of requiredRel) {
    const dest=path.join(temp,rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(path.join(ROOT,rel),dest);
  }
  mutate(temp);
  let failed=false;
  try { validate({ root:temp, fixture }); } catch { failed=true; }
  fs.rmSync(tempBase,{recursive:true,force:true});
  if (!failed) throw new Error(`mutation was accepted: ${label}`);
}

const baseline=validate({root:ROOT,fixture});
if (baseline.unresolved_source_rows !== 23 || baseline.deterministic_existing_matches !== 77) throw new Error('baseline denominator mismatch');
const mutations=[
 ['remove adjudication row',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x.pop();writeJsonl(p,x);}],
 ['duplicate rank',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[1].source.rank=x[0].source.rank;writeJsonl(p,x);}],
 ['change source website',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].source.website='wrong.example';writeJsonl(p,x);}],
 ['remove evidence',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].evidence=[];writeJsonl(p,x);}],
 ['replace first-party evidence authority',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);const q=x.find((z)=>z.source.rank===14);q.evidence[0].url='https://attacker.example/fabricated';q.evidence[0].publisher_domain='attacker.example';q.expected_evidence_hosts=['attacker.example'];writeJsonl(p,x);}],
 ['replace third-party issuer authority',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);const q=x.find((z)=>z.source.rank===54);const e=q.evidence.find((z)=>z.source_class==='issuer_press_release');e.url='https://attacker.example/fabricated';e.publisher_domain='attacker.example';q.expected_evidence_hosts=q.expected_evidence_hosts.map((z)=>z==='prnewswire.com'?'attacker.example':z);writeJsonl(p,x);}],
 ['promote evidence to receipt',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].state.receipt_admission_state='admitted_receipt';writeJsonl(p,x);}],
 ['silently promote identity',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].state.promotion_state='promoted';writeJsonl(p,x);}],
 ['broaden graph effect',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].state.graph_effect='adds_hop';writeJsonl(p,x);}],
 ['invent existing target',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x.find((q)=>q.source.rank===61).target.existing_company_id='missing';writeJsonl(p,x);}],
 ['remove existing alias',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x.find((q)=>q.source.rank===93).target.aliases=[];writeJsonl(p,x);}],
 ['collapse successor into exact name',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);const q=x.find((z)=>z.source.rank===54);q.target.canonical_name='Aetherflux';writeJsonl(p,x);}],
 ['duplicate proposed ID',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x.find((q)=>q.source.rank===20).target.proposed_company_id=x.find((q)=>q.source.rank===14).target.proposed_company_id;writeJsonl(p,x);}],
 ['launder denominator hash',(r)=>{const p=path.join(r,summaryRel);const x=JSON.parse(fs.readFileSync(p));x.denominator.unresolved_tuple_sha256='sha256:'+'0'.repeat(64);fs.writeFileSync(p,JSON.stringify(x));}],
 ['change declared roster path',(r)=>{const p=path.join(r,summaryRel);const x=JSON.parse(fs.readFileSync(p));x.source.roster_path='data/attacker.jsonl';fs.writeFileSync(p,JSON.stringify(x));}],
 ['change declared registry path',(r)=>{const p=path.join(r,summaryRel);const x=JSON.parse(fs.readFileSync(p));x.source.registry_path='data/attacker.jsonl';fs.writeFileSync(p,JSON.stringify(x));}],
 ['change declared transcription hash',(r)=>{const p=path.join(r,summaryRel);const x=JSON.parse(fs.readFileSync(p));x.source.roster_transcription_sha256='sha256:'+'0'.repeat(64);fs.writeFileSync(p,JSON.stringify(x));}],
 ['new unresolved source without adjudication',(r)=>{const p=path.join(r,rosterRel);const x=readJsonl(p);x.push({...x.at(-1),rank:101,company_name_as_reported:'New Unresolved Control',website:'new-unresolved.invalid',source_page:15});writeJsonl(p,x);const s=path.join(r,summaryRel);const y=JSON.parse(fs.readFileSync(s));y.denominator.source_rows=101;fs.writeFileSync(s,JSON.stringify(y));}],
 ['registry now resolves stale adjudication',(r)=>{const p=path.join(r,registryRel);const x=readJsonl(p);x[2]={...x[2],canonical_name:'Syntiant',website:'www.syntiant.com'};writeJsonl(p,x);}],
 ['assert procurement from rank',(r)=>{const p=path.join(r,rowsRel);const x=readJsonl(p);x[0].boundaries.procurement_established=true;writeJsonl(p,x);}],
];
for (const [label,mutate] of mutations) expectFailure(label,mutate);
console.log(`natsec100-2025-identity-adjudication.test: ${mutations.length} adversarial mutations PASS`);
