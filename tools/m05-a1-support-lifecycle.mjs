#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_COMMIT='ce8f4194019cf75cc2b66436efbeebdfd43f9951';
export const TARGET_BUNDLE='9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad';
export const PRIOR_REGISTRY_BLOB='5555d18654c2fb7bc908efe7c0ffbc25487b8fac';
export const CHALLENGE_CATEGORIES=[
  'identity_or_independence_failure','undisclosed_material_conflict','selection_capture_or_veto','evidence_custody_break','reproduction_or_output_failure','material_reference_or_successor_change','retaliation_or_chilling_effect','challenge_suppression_or_docket_omission','registry_or_signature_mismatch','fraud_misrepresentation_or_omitted_failure'
];
export const SUPPORT_LOSS_TRIGGERS=[
  'reference_byte_mismatch','receipt_or_evidence_unavailable','signature_or_digest_invalid','substantive_adjudicator_disqualified','adjudication_or_entry_expired','unresolved_material_challenge','registry_history_not_append_preserving','material_update_without_successor_review','newly_disclosed_material_conflict','retaliation_or_challenge_suppression','binding_court_or_regulator_order','required_exit_or_substitution_route_unavailable'
];
export const STATES=['active','challenged','suspended','revoked','expired','restoration_pending','restored','superseded'];
const HEX64=/^[0-9a-f]{64}$/; const HEX40=/^[0-9a-f]{40}$/;
const object=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonempty=(v)=>typeof v==='string'&&v.trim().length>0;
const uri=(v)=>nonempty(v)&&v.length>=8;
const parseDate=(v)=>{if(!nonempty(v))return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const days=(n)=>n*86400000;
const baseResult=(kind,errors,warnings)=>({schema_version:`m05-a1-support-${kind}-validation@1`,structurally_valid:errors.length===0,errors,warnings,machine_verifiable_only:true,identity_truth_determined:false,evidence_truth_determined:false,support_loss_truth_determined:false,external_adjudication_observed:false,a1_observed:false,registry_mutated:false,real_person_pilot_authorized:false});
const evidenceList=(value,error,label)=>{if(!Array.isArray(value)||value.length===0){error('EVIDENCE',`${label} evidence missing`);return;}for(const [i,row] of value.entries()){if(!object(row)||!uri(row.uri)||!HEX64.test(row.sha256||''))error('EVIDENCE',`${label} evidence ${i} has invalid URI or SHA-256`);}};

export function evaluateA1Challenge(challenge,{asOf=new Date()}={}){
  const errors=[];const warnings=[];const error=(code,message)=>errors.push({code,message});
  if(!(asOf instanceof Date)||Number.isNaN(asOf.getTime()))throw new Error('invalid asOf');
  if(!object(challenge))return {...baseResult('challenge',[{code:'CHALLENGE-TYPE',message:'Challenge must be an object.'}],[]),eligible_for_docket:false};
  if(challenge.schema_version!=='apc-a1-support-challenge@1')error('SCHEMA','schema_version mismatch');
  if(!/^A1C-[A-Z0-9][A-Z0-9-]{7,63}$/.test(challenge.challenge_id||''))error('CHALLENGE-ID','invalid challenge_id');
  const submitted=parseDate(challenge.submitted_at);if(!submitted)error('SUBMITTED-AT','invalid submitted_at');else if(submitted>asOf)error('FUTURE-CHALLENGE','challenge submitted in future');
  if(!['public','protected'].includes(challenge.route))error('ROUTE','invalid challenge route');
  if(!CHALLENGE_CATEGORIES.includes(challenge.category))error('CATEGORY','invalid challenge category');
  if(!/^A1E-[A-Z0-9][A-Z0-9-]{7,63}$/.test(challenge.target_entry_id||''))error('ENTRY-ID','invalid target_entry_id');
  if(!nonempty(challenge.statement)||challenge.statement.trim().length<20)error('STATEMENT','bounded challenge statement is too short');
  if(!['nonmaterial','material','potentially_dispositive'].includes(challenge.materiality))error('MATERIALITY','invalid materiality');
  if(!['notice','challenge_state','suspend','revoke','expire','supersede','reconsider'].includes(challenge.requested_action))error('REQUESTED-ACTION','invalid requested action');
  evidenceList(challenge.evidence,error,'challenge');
  const submitter=object(challenge.submitter)?challenge.submitter:{};
  if(challenge.route==='public'){
    for(const key of ['name','identity_uri','signature_uri'])if(!uri(submitter[key]))error('PUBLIC-IDENTITY',`invalid submitter.${key}`);
    if(!HEX64.test(submitter.signature_sha256||''))error('PUBLIC-SIGNATURE','invalid public signature digest');
    if('identity_digest_sha256' in submitter||'identity_custodian_id' in submitter)warnings.push({code:'PUBLIC-PROTECTED-MIX',message:'Public route includes protected-route fields; verify no protected identity was exposed.'});
  }
  if(challenge.route==='protected'){
    if(!HEX64.test(submitter.identity_digest_sha256||''))error('PROTECTED-DIGEST','invalid protected identity digest');
    if(!nonempty(submitter.identity_custodian_id))error('PROTECTED-CUSTODIAN','protected identity custodian missing');
    if(!uri(submitter.custody_attestation_uri)||!HEX64.test(submitter.custody_attestation_sha256||''))error('PROTECTED-ATTESTATION','protected identity custody attestation invalid');
    if(nonempty(submitter.name)||nonempty(submitter.identity_uri))error('PROTECTED-EXPOSURE','protected route must not expose public identity fields');
  }
  const declaration=object(challenge.declaration)?challenge.declaration:{};
  for(const key of ['evidence_preserved','no_restricted_data','submission_does_not_prove_truth','submission_does_not_mutate_registry'])if(declaration[key]!==true)error('DECLARATION',`declaration.${key} must be true`);
  const result=baseResult('challenge',errors,warnings);return {...result,challenge_id:challenge.challenge_id||null,eligible_for_docket:result.structurally_valid,challenge_truth_determined:false};
}

export function evaluateA1SupportIncident(incident,{asOf=new Date()}={}){
  const errors=[];const warnings=[];const error=(code,message)=>errors.push({code,message});
  if(!(asOf instanceof Date)||Number.isNaN(asOf.getTime()))throw new Error('invalid asOf');
  if(!object(incident))return {...baseResult('incident',[{code:'INCIDENT-TYPE',message:'Incident must be an object.'}],[]),eligible_for_incident_docket:false,mandatory_interim_proposal:false};
  if(incident.schema_version!=='apc-a1-support-incident@1')error('SCHEMA','schema_version mismatch');
  if(!/^A1I-[A-Z0-9][A-Z0-9-]{7,63}$/.test(incident.incident_id||''))error('INCIDENT-ID','invalid incident_id');
  const observed=parseDate(incident.observed_at);if(!observed)error('OBSERVED-AT','invalid observed_at');else if(observed>asOf)error('FUTURE-INCIDENT','incident observed in future');
  if(!/^A1E-[A-Z0-9][A-Z0-9-]{7,63}$/.test(incident.target_entry_id||''))error('ENTRY-ID','invalid target_entry_id');
  if(!SUPPORT_LOSS_TRIGGERS.includes(incident.trigger))error('TRIGGER','invalid support-loss trigger');
  if(!['monitor','material','critical'].includes(incident.severity))error('SEVERITY','invalid severity');
  evidenceList(incident.evidence,error,'incident');
  const reporter=object(incident.reporter)?incident.reporter:{};
  if(!['public','protected'].includes(reporter.route))error('REPORTER-ROUTE','invalid reporter route');
  if(reporter.route==='public'&&(!uri(reporter.identity_uri)||!uri(reporter.signature_uri)||!HEX64.test(reporter.signature_sha256||'')))error('PUBLIC-REPORTER','public reporter custody invalid');
  if(reporter.route==='protected'&&(!HEX64.test(reporter.identity_digest_sha256||'')||!nonempty(reporter.identity_custodian_id)||!uri(reporter.custody_attestation_uri)||!HEX64.test(reporter.custody_attestation_sha256||'')))error('PROTECTED-REPORTER','protected reporter custody invalid');
  if(!['challenge_state','suspend','revoke','expire','supersede'].includes(incident.automatic_action))error('AUTOMATIC-ACTION','invalid automatic action');
  if(['material','critical'].includes(incident.severity)&&incident.automatic_action==='challenge_state'&&incident.trigger!=='unresolved_material_challenge')error('UNDER-REACTION','material or critical trigger requires suspension, revocation, expiry, or supersession');
  const declaration=object(incident.declaration)?incident.declaration:{};
  for(const key of ['evidence_preserved','contradictions_preserved','incident_does_not_prove_trigger','incident_does_not_mutate_registry'])if(declaration[key]!==true)error('DECLARATION',`declaration.${key} must be true`);
  const result=baseResult('incident',errors,warnings);return {...result,incident_id:incident.incident_id||null,eligible_for_incident_docket:result.structurally_valid,mandatory_interim_proposal:result.structurally_valid&&['material','critical'].includes(incident.severity),trigger_truth_determined:false};
}

const ALLOWED=new Set([
  'active>challenged','active>suspended','challenged>suspended','active>revoked','challenged>revoked','suspended>revoked','active>expired','challenged>expired','suspended>restoration_pending','revoked>restoration_pending','expired>restoration_pending','restoration_pending>restored','active>superseded','challenged>superseded','suspended>superseded','restored>challenged','restored>suspended','restored>expired','restored>superseded'
]);

export function evaluateA1SupportLifecycle(tx,{asOf=new Date()}={}){
  const errors=[];const warnings=[];const error=(code,message)=>errors.push({code,message});
  if(!(asOf instanceof Date)||Number.isNaN(asOf.getTime()))throw new Error('invalid asOf');
  if(!object(tx))return {...baseResult('lifecycle',[{code:'TRANSACTION-TYPE',message:'Transaction must be an object.'}],[]),eligible_for_lifecycle_proposal:false};
  if(tx.schema_version!=='apc-a1-support-lifecycle-transaction@1')error('SCHEMA','schema_version mismatch');
  if(!/^A1L-[A-Z0-9][A-Z0-9-]{7,63}$/.test(tx.transaction_id||''))error('TRANSACTION-ID','invalid transaction_id');
  const issued=parseDate(tx.as_of);if(!issued)error('AS-OF','invalid as_of');else if(issued>asOf)error('FUTURE-TRANSACTION','transaction as_of is in future');
  const entry=object(tx.entry)?tx.entry:{};
  if(!/^A1E-[A-Z0-9][A-Z0-9-]{7,63}$/.test(entry.entry_id||''))error('ENTRY-ID','invalid entry_id');
  if(!uri(entry.entry_uri)||!HEX64.test(entry.entry_sha256||''))error('ENTRY-CUSTODY','invalid entry custody');
  if(!HEX64.test(entry.prior_entry_sha256||''))error('PRIOR-ENTRY','invalid prior entry digest');
  if(entry.reference_commit!==TARGET_COMMIT||entry.reference_bundle_sha256!==TARGET_BUNDLE)error('REFERENCE','reference capsule mismatch');
  const validFrom=parseDate(entry.valid_from), expires=parseDate(entry.expires_at);
  if(!validFrom||!expires)error('ENTRY-DATES','invalid entry dates');else {if(expires-validFrom>days(366))error('ENTRY-VALIDITY','entry validity exceeds 366 days');if(validFrom>asOf)error('FUTURE-ENTRY','entry valid_from in future');}
  const transition=object(tx.transition)?tx.transition:{};
  if(!STATES.includes(transition.from)||!STATES.includes(transition.to))error('STATE','invalid lifecycle state');
  if(!ALLOWED.has(`${transition.from}>${transition.to}`))error('ILLEGAL-TRANSITION',`transition ${transition.from}>${transition.to} is not allowed`);
  if(transition.from!==entry.current_status)error('CURRENT-STATE','transition.from does not match entry current_status');
  if(!nonempty(transition.basis))error('TRANSITION-BASIS','transition basis missing');
  const basis=object(tx.basis)?tx.basis:{};
  if(!Array.isArray(basis.challenge_ids)||!Array.isArray(basis.incident_ids))error('BASIS-DENOMINATOR','challenge_ids and incident_ids must be arrays');
  if(!Array.isArray(basis.evidence)||basis.evidence.length===0)evidenceList([],error,'lifecycle');else evidenceList(basis.evidence,error,'lifecycle');
  if(!Array.isArray(basis.open_blockers))error('BLOCKERS','open_blockers must be an array');else if(basis.open_blockers.length)error('OPEN-BLOCKERS','lifecycle proposal has open blockers');
  if(!Array.isArray(basis.unresolved_dissent))error('DISSENT','unresolved_dissent must be an array');else if(basis.unresolved_dissent.length)error('UNRESOLVED-DISSENT','lifecycle proposal has unresolved dissent');
  const triggerSet=new Set(Array.isArray(basis.support_loss_triggers)?basis.support_loss_triggers:[]);
  for(const trigger of triggerSet)if(!SUPPORT_LOSS_TRIGGERS.includes(trigger))error('TRIGGER','unknown support-loss trigger');
  if(triggerSet.size&&['active','restored'].includes(transition.to))error('ACTIVE-WITH-TRIGGER','support-loss trigger cannot leave or return entry active');
  if(triggerSet.size&& !['suspended','revoked','expired','superseded'].includes(transition.to))error('TRIGGER-ACTION','support-loss trigger requires suspension, revocation, expiry, or supersession');
  if((basis.challenge_ids||[]).length&&transition.to==='active')error('CHALLENGE-ACTION','challenge may not be silently cleared to active');
  if(transition.to==='challenged'&&!(basis.challenge_ids||[]).length)error('CHALLENGE-BASIS','challenged state requires at least one challenge');
  if(['suspended','revoked'].includes(transition.to)&&!(basis.incident_ids||[]).length&&!(basis.challenge_ids||[]).length)error('ADVERSE-BASIS','suspension or revocation requires a challenge or incident');
  if(transition.to==='expired'&&expires&&expires>asOf)error('PREMATURE-EXPIRY','entry has not expired');
  if(transition.to==='superseded'&&!triggerSet.has('material_update_without_successor_review'))error('SUPERSESSION-BASIS','supersession requires material successor-change trigger');
  const decisions=object(tx.decisions)?tx.decisions:{};
  const requireDecision=['revoked','restored','superseded'].includes(transition.to);
  if(requireDecision){
    const indep=object(decisions.independence)?decisions.independence:{};const evidence=object(decisions.evidence)?decisions.evidence:{};
    for(const [role,d] of [['independence',indep],['evidence',evidence]]){
      if(!nonempty(d.adjudicator_id)||!nonempty(d.legal_entity))error('DECISION-IDENTITY',`${role} adjudicator identity missing`);
      if(d.disposition!=='approve')error('DECISION-DISPOSITION',`${role} decision must approve proposed transition`);
      if(d.entry_sha256!==entry.entry_sha256)error('DECISION-SCOPE',`${role} decision not bound to entry digest`);
      if(!Array.isArray(d.findings)||d.findings.length===0)error('DECISION-FINDINGS',`${role} findings missing`);
      if(!Array.isArray(d.blockers)||d.blockers.length!==0)error('DECISION-BLOCKERS',`${role} decision has blockers`);
      if(!Array.isArray(d.dissent)||d.dissent.length!==0)error('DECISION-DISSENT',`${role} decision has unresolved dissent`);
      if(!uri(d.signature_uri)||!HEX64.test(d.signature_sha256||''))error('DECISION-SIGNATURE',`${role} signature invalid`);
      const signed=parseDate(d.issued_at), exp=parseDate(d.expires_at);if(!signed||!exp)error('DECISION-DATES',`${role} decision dates invalid`);else {if(signed>asOf)error('FUTURE-DECISION',`${role} decision in future`);if(exp<=asOf)error('STALE-DECISION',`${role} decision expired`);if(exp-signed>days(366))error('DECISION-VALIDITY',`${role} decision validity exceeds 366 days`);}
    }
    if(indep.adjudicator_id===evidence.adjudicator_id)error('ROLE-OVERLAP','same person occupies both substantive roles');
    if(indep.legal_entity===evidence.legal_entity)error('LEGAL-ENTITY-OVERLAP','substantive roles share a legal entity');
  }
  const window=object(tx.challenge_window)?tx.challenge_window:{};
  const opened=parseDate(window.opened_at), deadline=parseDate(window.deadline);
  if(!opened||!deadline)error('CHALLENGE-DATES','invalid challenge window dates');else {if(deadline-opened<days(14))error('SHORT-CHALLENGE-WINDOW','challenge window shorter than 14 days');if(requireDecision&&deadline>asOf)error('CHALLENGE-WINDOW-OPEN','challenge window has not elapsed');}
  if(!Number.isInteger(window.window_days)||window.window_days<14)error('CHALLENGE-WINDOW','window_days must be at least 14');
  if(!Array.isArray(window.unresolved_challenges)||window.unresolved_challenges.length!==0)error('UNRESOLVED-CHALLENGE','material challenge remains unresolved');
  if(transition.to==='restored'){
    const restoration=object(tx.restoration)?tx.restoration:{};
    if(!uri(restoration.correction_package_uri)||!HEX64.test(restoration.correction_package_sha256||''))error('CORRECTION-PACKAGE','correction package custody invalid');
    if(!Array.isArray(restoration.support_restored_evidence)||restoration.support_restored_evidence.length===0)evidenceList([],error,'restoration');else evidenceList(restoration.support_restored_evidence,error,'restoration');
    if(restoration.successor_compatibility_verified!==true)error('SUCCESSOR-COMPATIBILITY','successor compatibility not verified');
    if(restoration.renewed_external_adjudication!==true)error('RENEWED-ADJUDICATION','renewed external adjudication missing');
    const newExpiry=parseDate(restoration.new_expires_at);if(!newExpiry||newExpiry<=asOf)error('NEW-EXPIRY','restoration requires a future expiry');else if(newExpiry-asOf>days(366))error('NEW-VALIDITY','restoration validity exceeds 366 days');
  }
  const reg=object(tx.registry_transaction)?tx.registry_transaction:{};
  if(!HEX40.test(reg.prior_registry_blob_sha||'')||reg.prior_registry_blob_sha!==PRIOR_REGISTRY_BLOB)error('PRIOR-REGISTRY','prior registry blob mismatch');
  if(!uri(reg.proposed_entry_uri)||!HEX64.test(reg.proposed_entry_sha256||''))error('PROPOSED-ENTRY','proposed entry custody invalid');
  if(reg.proposed_status!==transition.to)error('PROPOSED-STATUS','registry proposed status does not match transition');
  if(reg.append_preserving!==true)error('APPEND-LAW','registry transaction is not append-preserving');
  if(reg.prior_entry_retained!==true||reg.challenges_retained!==true||reg.incidents_retained!==true||reg.dissent_retained!==true)error('RETENTION','prior state, challenges, incidents, and dissent must be retained');
  if(reg.silent_deletion!==false)error('SILENT-DELETION','silent deletion is forbidden');
  if(reg.backdated!==false)error('BACKDATING','backdating is forbidden');
  if(!nonempty(reg.custodian_id)||reg.custodian_substantive_override!==false)error('CUSTODIAN','registry custodian identity or ministerial boundary invalid');
  if(requireDecision&&[decisions.independence?.adjudicator_id,decisions.evidence?.adjudicator_id].includes(reg.custodian_id))error('CUSTODIAN-OVERLAP','registry custodian overlaps substantive adjudicator');
  const declaration=object(tx.declaration)?tx.declaration:{};
  for(const key of ['no_self_award','no_project_self_clearance','no_silent_deletion','no_backdating','registry_not_mutated_by_cli','external_truth_not_determined_by_structure'])if(declaration[key]!==true)error('DECLARATION',`declaration.${key} must be true`);
  const result=baseResult('lifecycle',errors,warnings);
  if(result.structurally_valid)warnings.push({code:'EXTERNAL-ADJUDICATION-REMAINS',message:'Structural eligibility does not determine event truth, reviewer independence, evidence truth, or registry approval.'});
  return {...result,transaction_id:tx.transaction_id||null,entry_id:entry.entry_id||null,from:transition.from||null,to:transition.to||null,eligible_for_lifecycle_proposal:result.structurally_valid,external_truth_required:true};
}

function main(){
  const kind=process.argv[2],input=process.argv[3];
  if(!['challenge','incident','transaction'].includes(kind)||!input){console.error('usage: node tools/m05-a1-support-lifecycle.mjs <challenge|incident|transaction> <input.json> [--as-of YYYY-MM-DD]');process.exit(64)}
  let asOf=new Date();const idx=process.argv.indexOf('--as-of');if(idx>=0){const value=process.argv[idx+1];if(!value)process.exit(64);asOf=new Date(`${value}T23:59:59.999Z`)}
  try{const value=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));const out=kind==='challenge'?evaluateA1Challenge(value,{asOf}):kind==='incident'?evaluateA1SupportIncident(value,{asOf}):evaluateA1SupportLifecycle(value,{asOf});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);process.exit(out.structurally_valid?0:2)}catch(error){console.error(error.message);process.exit(64)}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(invoked)main();
