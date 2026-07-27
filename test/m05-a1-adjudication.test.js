#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateA1Adjudication } from '../tools/m05-a1-adjudication.mjs';
const H=(c)=>c.repeat(64);
const clone=(v)=>JSON.parse(JSON.stringify(v));
const asOf=new Date('2026-07-27T23:59:59.999Z');
const reviewer=(id,role,entity)=>({adjudicator_id:id,name:`Reviewer ${id}`,legal_entity:entity,role,identity_uri:`https://example.org/${id}/identity`,eligibility_uri:`https://example.org/${id}/eligibility.json`,eligibility_sha256:H(role==='independence'?'b':'c'),selected_from_public_pool:true,selected_by_reproducer:false,selected_by_project_unilaterally:false,repo_admin_or_maintainer:false,reference_contributor:false,receipt_preparer_or_reproducer:false,vendor_operator_customer_or_adopter:false,same_legal_entity_as_disqualified:false,project_bot_or_ci:false,contingent_compensation:false,evidence_host_or_preparer:false,conflicts_disclosed:true,conflict_disclosures:[],signed_at:'2026-07-20T12:00:00Z',expires_at:'2027-01-20T12:00:00Z',signature_uri:`https://example.org/${id}/signature`,signature_sha256:H(role==='independence'?'d':'e')});
const receiptSha=H('a');
const base={schema_version:'apc-a1-adjudication-transaction@1',transaction_id:'A1T-SYNTHETIC-0001',as_of:'2026-07-27T20:00:00Z',expires_at:'2027-01-20T20:00:00Z',receipt:{receipt_id:'A1R-SYNTHETIC-0001',receipt_uri:'https://example.org/receipt.json',receipt_sha256:receiptSha,structural_validation_uri:'https://example.org/validation.json',structural_validation_sha256:H('f'),structurally_valid:true,target_commit:'ce8f4194019cf75cc2b66436efbeebdfd43f9951',target_bundle_sha256:'9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad'},docket:{docket_uri:'https://example.org/docket',opened_at:'2026-07-01T00:00:00Z',public_notice_uri:'https://example.org/notice',challenge_deadline:'2026-07-15T00:00:00Z',pool_snapshot_uri:'https://example.org/pool.json',pool_snapshot_sha256:H('1'),selection_method:'public_pool_recorded_selection',selection_seed_sha256:H('2'),pool_size:6,reproducer_controlled:false,project_unilateral_selection:false},adjudicators:[reviewer('IND-01','independence','Independent Entity A'),reviewer('EVD-01','evidence','Independent Entity B')],decisions:{independence:{adjudicator_id:'IND-01',disposition:'approve',receipt_sha256:receiptSha,issued_at:'2026-07-21T00:00:00Z',expires_at:'2027-01-21T00:00:00Z',evidence_uris:['https://example.org/independence-evidence'],findings:['identity and relationship record reviewed'],blockers:[],dissent:[],signature_uri:'https://example.org/independence-decision.sig',signature_sha256:H('3')},evidence:{adjudicator_id:'EVD-01',disposition:'approve',receipt_sha256:receiptSha,issued_at:'2026-07-22T00:00:00Z',expires_at:'2027-01-22T00:00:00Z',evidence_uris:['https://example.org/reproduction-evidence'],findings:['command and exact-reference evidence reviewed'],blockers:[],dissent:[],signature_uri:'https://example.org/evidence-decision.sig',signature_sha256:H('4')}},challenge:{public_notice_uri:'https://example.org/challenge-notice',opened_at:'2026-07-01T00:00:00Z',deadline:'2026-07-15T00:00:00Z',window_days:14,submissions_count:0,unresolved_challenges:[],dissent:[],reconsideration_required:false},registry_transaction:{prior_registry_blob_sha:'5555d18654c2fb7bc908efe7c0ffbc25487b8fac',proposed_status:'approved_for_a1',proposed_entry_uri:'https://example.org/proposed-entry.json',proposed_entry_sha256:H('5'),open_blockers:[],prepared_by:'Registry preparer',prepared_at:'2026-07-26T00:00:00Z',custodian_id:'CUST-01',custodian_is_substantive_adjudicator:false,custodian_substantive_override:false,entry_matches_decisions:true,append_preserving:true},declaration:{no_self_award:true,no_unilateral_project_award:true,separate_reviewers:true,no_open_blockers:true,no_unresolved_challenge:true,registry_not_mutated_by_cli:true}};
const ok=evaluateA1Adjudication(base,{asOf});
assert.equal(ok.structurally_valid,true);assert.equal(ok.eligible_for_registry_proposal,true);assert.equal(ok.independence_determined,false);assert.equal(ok.a1_observed,false);assert.equal(ok.registry_mutated,false);
const cases=[
 ['same person',(x)=>{x.adjudicators[1].adjudicator_id='IND-01';x.decisions.evidence.adjudicator_id='IND-01'},'ROLE-OVERLAP'],
 ['same legal entity',(x)=>{x.adjudicators[1].legal_entity='Independent Entity A'},'LEGAL-ENTITY-OVERLAP'],
 ['maintainer reviewer',(x)=>{x.adjudicators[0].repo_admin_or_maintainer=true},'DISQUALIFIED-REVIEWER'],
 ['reference contributor',(x)=>{x.adjudicators[1].reference_contributor=true},'DISQUALIFIED-REVIEWER'],
 ['reproducer controls selection',(x)=>{x.docket.reproducer_controlled=true},'REPRODUCER-SELECTION'],
 ['project unilateral selection',(x)=>{x.docket.project_unilateral_selection=true},'PROJECT-SELECTION'],
 ['success fee',(x)=>{x.adjudicators[0].contingent_compensation=true},'DISQUALIFIED-REVIEWER'],
 ['evidence preparer reviewer',(x)=>{x.adjudicators[1].evidence_host_or_preparer=true},'DISQUALIFIED-REVIEWER'],
 ['decision scope mismatch',(x)=>{x.decisions.evidence.receipt_sha256=H('9')},'DECISION-SCOPE'],
 ['stale decision',(x)=>{x.decisions.independence.expires_at='2026-07-26T00:00:00Z'},'STALE-DECISION'],
 ['wrong prior registry',(x)=>{x.registry_transaction.prior_registry_blob_sha='0'.repeat(40)},'PRIOR-REGISTRY'],
 ['open registry blocker',(x)=>{x.registry_transaction.open_blockers=['conflict unresolved']},'REGISTRY-BLOCKERS'],
 ['custodian override',(x)=>{x.registry_transaction.custodian_substantive_override=true},'CUSTODIAN-OVERRIDE'],
 ['window still open',(x)=>{x.challenge.deadline='2026-08-01T00:00:00Z'},'CHALLENGE-WINDOW-OPEN'],
 ['unresolved challenge',(x)=>{x.challenge.unresolved_challenges=['material identity challenge']},'UNRESOLVED-CHALLENGE'],
 ['independence pause',(x)=>{x.decisions.independence.disposition='pause'},'DECISION-NOT-APPROVED'],
 ['evidence reject',(x)=>{x.decisions.evidence.disposition='reject'},'DECISION-NOT-APPROVED'],
 ['custodian overlaps reviewer',(x)=>{x.registry_transaction.custodian_id='IND-01'},'CUSTODIAN-OVERLAP'],
 ['short challenge window',(x)=>{x.challenge.deadline='2026-07-10T00:00:00Z';x.challenge.window_days=9},'SHORT-CHALLENGE-WINDOW']
];
for(const [name,mutate,code] of cases){const tx=clone(base);mutate(tx);const out=evaluateA1Adjudication(tx,{asOf});assert.equal(out.structurally_valid,false,name);assert(out.errors.some((e)=>e.code===code),`${name}: expected ${code}, got ${out.errors.map((e)=>e.code).join(',')}`);assert.equal(out.a1_observed,false);assert.equal(out.registry_mutated,false)}
console.log(`m05-a1-adjudication.test: OK (${cases.length} negative cases)`);
