#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateA1Challenge,evaluateA1SupportIncident,evaluateA1SupportLifecycle,CHALLENGE_CATEGORIES,SUPPORT_LOSS_TRIGGERS } from '../tools/m05-a1-support-lifecycle.mjs';
const H='a'.repeat(64),H2='b'.repeat(64),H3='c'.repeat(64),H4='d'.repeat(64);
const asOf=new Date('2026-07-29T23:59:59.999Z');
const clone=(v)=>structuredClone(v);
const validChallenge={schema_version:'apc-a1-support-challenge@1',challenge_id:'A1C-PUBLIC-0001',submitted_at:'2026-07-10T12:00:00Z',route:'public',category:CHALLENGE_CATEGORIES[0],target_entry_id:'A1E-ENTRY-0001',statement:'The independence record omits a material employment relationship.',materiality:'material',requested_action:'suspend',evidence:[{uri:'https://example.test/challenge/evidence',sha256:H}],submitter:{name:'Public Challenger',identity_uri:'https://example.test/identity',signature_uri:'https://example.test/signature',signature_sha256:H2},declaration:{evidence_preserved:true,no_restricted_data:true,submission_does_not_prove_truth:true,submission_does_not_mutate_registry:true}};
let out=evaluateA1Challenge(validChallenge,{asOf});assert.equal(out.structurally_valid,true);assert.equal(out.eligible_for_docket,true);assert.equal(out.challenge_truth_determined,false);assert.equal(out.registry_mutated,false);
const protectedChallenge=clone(validChallenge);protectedChallenge.challenge_id='A1C-PROTECTED-01';protectedChallenge.route='protected';protectedChallenge.submitter={identity_digest_sha256:H3,identity_custodian_id:'PIC-EXTERNAL-01',custody_attestation_uri:'https://example.test/protected/attestation',custody_attestation_sha256:H4};
out=evaluateA1Challenge(protectedChallenge,{asOf});assert.equal(out.structurally_valid,true);assert.equal(out.identity_truth_determined,false);
const validIncident={schema_version:'apc-a1-support-incident@1',incident_id:'A1I-INCIDENT-001',observed_at:'2026-07-11T12:00:00Z',target_entry_id:'A1E-ENTRY-0001',trigger:SUPPORT_LOSS_TRIGGERS[0],severity:'critical',evidence:[{uri:'https://example.test/incident/evidence',sha256:H}],reporter:{route:'public',identity_uri:'https://example.test/reporter',signature_uri:'https://example.test/reporter/signature',signature_sha256:H2},automatic_action:'suspend',declaration:{evidence_preserved:true,contradictions_preserved:true,incident_does_not_prove_trigger:true,incident_does_not_mutate_registry:true}};
out=evaluateA1SupportIncident(validIncident,{asOf});assert.equal(out.structurally_valid,true);assert.equal(out.mandatory_interim_proposal,true);assert.equal(out.trigger_truth_determined,false);
const validTx={schema_version:'apc-a1-support-lifecycle-transaction@1',transaction_id:'A1L-SUSPEND-001',as_of:'2026-07-29T12:00:00Z',entry:{entry_id:'A1E-ENTRY-0001',entry_uri:'https://example.test/registry/entry',entry_sha256:H,prior_entry_sha256:H2,reference_commit:'ce8f4194019cf75cc2b66436efbeebdfd43f9951',reference_bundle_sha256:'9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad',valid_from:'2026-01-01T00:00:00Z',expires_at:'2026-12-31T00:00:00Z',current_status:'active'},transition:{from:'active',to:'suspended',basis:'automatic_support_loss'},basis:{challenge_ids:['A1C-PUBLIC-0001'],incident_ids:['A1I-INCIDENT-001'],support_loss_triggers:['reference_byte_mismatch'],evidence:[{uri:'https://example.test/lifecycle/evidence',sha256:H3}],open_blockers:[],unresolved_dissent:[]},decisions:{},challenge_window:{opened_at:'2026-07-01T00:00:00Z',deadline:'2026-07-15T00:00:00Z',window_days:14,unresolved_challenges:[]},registry_transaction:{prior_registry_blob_sha:'5555d18654c2fb7bc908efe7c0ffbc25487b8fac',proposed_entry_uri:'https://example.test/registry/proposed',proposed_entry_sha256:H4,proposed_status:'suspended',append_preserving:true,prior_entry_retained:true,challenges_retained:true,incidents_retained:true,dissent_retained:true,silent_deletion:false,backdated:false,custodian_id:'REG-CUSTODIAN-01',custodian_substantive_override:false},declaration:{no_self_award:true,no_project_self_clearance:true,no_silent_deletion:true,no_backdating:true,registry_not_mutated_by_cli:true,external_truth_not_determined_by_structure:true}};
out=evaluateA1SupportLifecycle(validTx,{asOf});assert.equal(out.structurally_valid,true);assert.equal(out.eligible_for_lifecycle_proposal,true);assert.equal(out.a1_observed,false);assert.equal(out.registry_mutated,false);assert.equal(out.real_person_pilot_authorized,false);
const restoration=clone(validTx);restoration.transaction_id='A1L-RESTORE-0001';restoration.entry.current_status='restoration_pending';restoration.transition={from:'restoration_pending',to:'restored',basis:'renewed_external_adjudication'};restoration.basis.challenge_ids=[];restoration.basis.incident_ids=[];restoration.basis.support_loss_triggers=[];restoration.decisions={independence:{adjudicator_id:'ADJ-INDEP-01',legal_entity:'Independent Entity A',disposition:'approve',entry_sha256:H,findings:['independence requirements met'],blockers:[],dissent:[],signature_uri:'https://example.test/independence/signature',signature_sha256:H2,issued_at:'2026-07-16T00:00:00Z',expires_at:'2027-01-01T00:00:00Z'},evidence:{adjudicator_id:'ADJ-EVID-01',legal_entity:'Independent Entity B',disposition:'approve',entry_sha256:H,findings:['support correction reproduced'],blockers:[],dissent:[],signature_uri:'https://example.test/evidence/signature',signature_sha256:H3,issued_at:'2026-07-17T00:00:00Z',expires_at:'2027-01-01T00:00:00Z'}};restoration.restoration={correction_package_uri:'https://example.test/restoration/package',correction_package_sha256:H4,support_restored_evidence:[{uri:'https://example.test/restoration/evidence',sha256:H3}],successor_compatibility_verified:true,renewed_external_adjudication:true,new_expires_at:'2027-01-01T00:00:00Z'};restoration.registry_transaction.proposed_status='restored';
out=evaluateA1SupportLifecycle(restoration,{asOf});assert.equal(out.structurally_valid,true);assert.equal(out.eligible_for_lifecycle_proposal,true);assert.equal(out.external_adjudication_observed,false);
const negativeCases=[
  ['schema',x=>x.schema_version='wrong'],
  ['transaction id',x=>x.transaction_id='bad'],
  ['future',x=>x.as_of='2027-01-01T00:00:00Z'],
  ['entry id',x=>x.entry.entry_id='bad'],
  ['entry hash',x=>x.entry.entry_sha256='bad'],
  ['reference',x=>x.entry.reference_commit='0'.repeat(40)],
  ['validity',x=>x.entry.expires_at='2028-01-01T00:00:00Z'],
  ['state',x=>x.transition.to='active'],
  ['from mismatch',x=>x.transition.from='challenged'],
  ['basis',x=>x.transition.basis=''],
  ['evidence',x=>x.basis.evidence=[]],
  ['open blocker',x=>x.basis.open_blockers=['material']],
  ['dissent',x=>x.basis.unresolved_dissent=['unresolved']],
  ['unknown trigger',x=>x.basis.support_loss_triggers=['unknown']],
  ['missing challenge basis',x=>{x.transition.to='challenged';x.transition.basis='eligible_public_challenge';x.basis.challenge_ids=[];x.basis.incident_ids=[];x.basis.support_loss_triggers=[]}],
  ['short window',x=>x.challenge_window.deadline='2026-07-05T00:00:00Z'],
  ['window count',x=>x.challenge_window.window_days=7],
  ['unresolved challenge',x=>x.challenge_window.unresolved_challenges=['A1C-OPEN-0001']],
  ['prior registry',x=>x.registry_transaction.prior_registry_blob_sha='0'.repeat(40)],
  ['status mismatch',x=>x.registry_transaction.proposed_status='revoked'],
  ['append law',x=>x.registry_transaction.append_preserving=false],
  ['retention',x=>x.registry_transaction.challenges_retained=false],
  ['silent deletion',x=>x.registry_transaction.silent_deletion=true],
  ['self award',x=>x.declaration.no_self_award=false]
];
assert.equal(negativeCases.length,24);
for(const [name,mutate] of negativeCases){const bad=clone(validTx);mutate(bad);const result=evaluateA1SupportLifecycle(bad,{asOf});assert.equal(result.structurally_valid,false,`negative case passed: ${name}`);assert.equal(result.registry_mutated,false)}
const badProtected=clone(protectedChallenge);badProtected.submitter.identity_digest_sha256='bad';assert.equal(evaluateA1Challenge(badProtected,{asOf}).structurally_valid,false);
const underreaction=clone(validIncident);underreaction.automatic_action='challenge_state';assert.equal(evaluateA1SupportIncident(underreaction,{asOf}).structurally_valid,false);
console.log('m05-a1-support-lifecycle.test: OK (24 negative lifecycle cases)');
