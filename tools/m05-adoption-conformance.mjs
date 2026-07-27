#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEVELS=['A0','A1','A2','A3','A4','A5','A6'];
export const MODE_BY_LEVEL={A0:'published_reference',A1:'independent_reproduction',A2:'independent_review',A3:'no_adverse_shadow',A4:'prospective_parallel',A5:'rights_bearing_live',A6:'durable_rights_bearing_live'};
const REQUIRED_TOP=['schema_version','package_id','reference','claim','independence','reviews','affected_party','deployment','stop_authority','evidence','evaluation','successor','registry','observations'];
const REQUIRED_REVIEWS=['legal','privacy','ethics','technical'];
const OBSERVATION_KEYS={
  A1:['independent_reproduction'],
  A2:['independent_review'],
  A3:['lawful_shadow_period','shadow_adverse_action_boundary_preserved'],
  A4:['prospective_parallel_operation','parallel_adverse_action_boundary_preserved','comparator_and_failure_denominator_complete'],
  A5:['rights_bearing_use','rights_receipts_complete','binding_stop_or_remedy_observed','open_harm_denominator'],
  A6:['turnover_survived','successor_system_survived']
};
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v||{},k);
const object=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonempty=(v)=>typeof v==='string'&&v.trim().length>0;
const bool=(v)=>v===true||v===false;
const sha256=(v)=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
function parseDate(v){if(!nonempty(v))return null;const n=Date.parse(v);return Number.isFinite(n)?n:null}
function onOrBefore(v,asOf){const n=parseDate(v);return n!==null&&asOf!==null&&n<=asOf}
function currentThrough(v,asOf){const n=parseDate(v);return n!==null&&asOf!==null&&n>=asOf}
function scopedReceipt(v,asOf,scope,dateKey='observed_at'){
  return object(v)&&v.observed===true&&nonempty(v.evidence_uri)&&onOrBefore(v[dateKey],asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function attestorComplete(v,asOf,scope){
  return object(v)&&nonempty(v.attestor_id)&&nonempty(v.relationship_disclosure)&&nonempty(v.evidence_uri)&&v.self===false&&onOrBefore(v.signed_at,asOf)&&currentThrough(v.expires_at,asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function reviewComplete(v,asOf,scope){
  return object(v)&&v.status==='approved'&&nonempty(v.authority)&&nonempty(v.reviewer_id)&&nonempty(v.evidence_uri)&&nonempty(v.independence_evidence_uri)&&onOrBefore(v.approved_at,asOf)&&currentThrough(v.expires_at,asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function entryGateComplete(v,asOf,scope){
  return object(v)&&v.approved===true&&nonempty(v.authority)&&nonempty(v.evidence_uri)&&onOrBefore(v.approved_at,asOf)&&currentThrough(v.expires_at,asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function stopComplete(v,asOf,scope){
  return object(v)&&v.independent===true&&v.can_bind_operator===true&&v.can_bind_institution===true&&v.can_bind_vendor===true&&v.can_bind_downstream_recipients===true&&v.complete_evidence_access===true&&nonempty(v.evidence_uri)&&onOrBefore(v.approved_at,asOf)&&currentThrough(v.expires_at,asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function preregComplete(v,asOf,scope){
  return object(v)&&v.preregistered===true&&v.metrics_frozen===true&&v.denominators_frozen===true&&v.stop_thresholds_frozen===true&&v.analysis_plan_frozen===true&&v.results_seen_before_freeze===false&&nonempty(v.preregistration_uri)&&onOrBefore(v.frozen_at,asOf)&&sha256(v.scope_fingerprint)&&v.scope_fingerprint===scope;
}
function integrityReceipt(v){return object(v)&&nonempty(v.path)&&sha256(v.sha256)&&Number.isInteger(v.bytes)&&v.bytes>=0}
function modeNoAdverse(v){return v.adverse_action_authority===false&&v.recommendation_authority===false&&v.influence_allowed===false&&v.staff_consultation_allowed===false}
function structuredBlocker(v){return object(v)&&nonempty(v.blocker_id)&&['open','resolved'].includes(v.status)&&LEVELS.includes(v.first_affected_level)&&nonempty(v.reason)}

export function evaluateAdoptionPackage(manifest){
  const errors=[];const warnings=[{code:'TRUTH-NOT-DETERMINED',message:'Structural conformance does not establish evidence truth, reviewer or representative independence, or effective stopping, remedy, exit, and value power.'}];
  const error=(code,message)=>errors.push({code,message});
  if(!object(manifest))return {schema_version:'apc-adoption-conformance-result@2',conformant:false,requested_level:null,computed_maximum_level:'NONE',unblocked_maximum_level:'NONE',blocker_cap:'NONE',errors:[{code:'MANIFEST-TYPE',message:'Manifest must be a JSON object.'}],warnings,machine_verifiable_only:true,truthfulness_determined:false};
  for(const k of REQUIRED_TOP)if(!own(manifest,k))error('MISSING-TOP-LEVEL',`Missing required top-level field: ${k}`);
  if(manifest.schema_version!=='apc-adoption-package@2')error('SCHEMA','Expected schema_version apc-adoption-package@2.');
  if(!nonempty(manifest.package_id))error('PACKAGE-ID','package_id must be non-empty.');

  const reference=object(manifest.reference)?manifest.reference:{};
  const referenceReceipts=Array.isArray(reference.integrity_receipts)?reference.integrity_receipts:[];
  const referenceComplete=nonempty(reference.version)&&nonempty(reference.source_uri)&&nonempty(reference.public_boundary_uri)&&sha256(reference.bundle_fingerprint)&&referenceReceipts.length>0&&referenceReceipts.every(integrityReceipt);
  if(!referenceComplete)error('REFERENCE-BUNDLE','A0 requires version, source URI, public boundary URI, 64-hex bundle fingerprint, and nonempty exact-byte integrity receipts.');

  const claim=object(manifest.claim)?manifest.claim:{};const requested=claim.requested_level;const asOf=parseDate(claim.as_of);const scope=claim.scope_fingerprint;
  if(!LEVELS.includes(requested))error('REQUESTED-LEVEL',`claim.requested_level must be one of ${LEVELS.join(', ')}.`);
  if(asOf===null)error('AS-OF','claim.as_of must be a valid date.');
  if(!nonempty(claim.deployment_mode))error('DEPLOYMENT-MODE','claim.deployment_mode is required.');
  if(!sha256(scope))error('CLAIM-SCOPE','claim.scope_fingerprint must be 64 lowercase hexadecimal characters.');
  if(LEVELS.includes(requested)&&claim.deployment_mode!==MODE_BY_LEVEL[requested])error('LEVEL-MODE-MISMATCH',`Requested ${requested} requires claim.deployment_mode ${MODE_BY_LEVEL[requested]}.`);

  const independence=object(manifest.independence)?manifest.independence:{};
  if(independence.self_attested!==false)error('SELF-ATTESTED-INDEPENDENCE','independence.self_attested must be false.');
  const attestors=Array.isArray(independence.external_attestors)?independence.external_attestors:[];
  const completeAttestors=attestors.filter((v)=>attestorComplete(v,asOf,scope));

  const reviews=object(manifest.reviews)?manifest.reviews:{};
  const reviewStates=Object.fromEntries(REQUIRED_REVIEWS.map((k)=>[k,reviewComplete(reviews[k],asOf,scope)]));
  const reviewsCurrent=REQUIRED_REVIEWS.every((k)=>reviewStates[k]);

  const affected=object(manifest.affected_party)?manifest.affected_party:{};
  const affectedApproved=affected.approval_status==='approved'&&affected.selection_independent===true&&affected.institution_or_vendor_controls_majority===false&&nonempty(affected.body_id)&&nonempty(affected.formation_evidence_uri)&&nonempty(affected.approval_evidence_uri)&&nonempty(affected.conflict_register_uri)&&nonempty(affected.dissent_record_uri)&&affected.recall_and_removal_enabled===true&&affected.nonretaliation_protection===true&&affected.direct_r1_r4_waiver_allowed===false&&sha256(affected.scope_fingerprint)&&affected.scope_fingerprint===scope;

  const deployment=object(manifest.deployment)?manifest.deployment:{};
  if(!nonempty(deployment.mode))error('DEPLOYMENT-MODE-ACTUAL','deployment.mode is required.');
  if(nonempty(claim.deployment_mode)&&deployment.mode!==claim.deployment_mode)error('CLAIM-DEPLOYMENT-MODE-MISMATCH','claim.deployment_mode must equal deployment.mode.');
  for(const k of ['real_person_data','adverse_action_authority','recommendation_authority','influence_allowed','staff_consultation_allowed'])if(!bool(deployment[k]))error('DEPLOYMENT-BOOLEAN',`deployment.${k} must be boolean.`);
  const entryGate=entryGateComplete(deployment.entry_gate,asOf,scope);
  if(deployment.material_update_since_approval===true){
    const u=object(deployment.update_reapproval)?deployment.update_reapproval:{};
    if(!(u.approved===true&&nonempty(u.evidence_uri)&&onOrBefore(u.approved_at,asOf)&&currentThrough(u.expires_at,asOf)&&sha256(u.scope_fingerprint)&&u.scope_fingerprint===scope))error('SILENT-MATERIAL-UPDATE','A material update is recorded without current scoped reapproval.');
  }
  const emergency=object(deployment.emergency_authority)?deployment.emergency_authority:{enabled:false};
  if(emergency.enabled===true){
    if(!(emergency.bounded===true&&nonempty(emergency.independent_authorizer)&&nonempty(emergency.minimum_necessary_scope)&&nonempty(emergency.evidence_uri)&&emergency.evidence_preserved===true&&onOrBefore(emergency.authorized_at,asOf)&&currentThrough(emergency.expires_at,asOf)&&sha256(emergency.scope_fingerprint)&&emergency.scope_fingerprint===scope))error('UNBOUNDED-EMERGENCY','Emergency authority requires current bounded scope, independent authorization, evidence, and matching scope.');
  }

  const bindingStop=stopComplete(manifest.stop_authority,asOf,scope);
  const evidence=object(manifest.evidence)?manifest.evidence:{};const evidenceReceipts=Array.isArray(evidence.integrity_receipts)?evidence.integrity_receipts:[];
  const evidenceComplete=nonempty(evidence.custodian)&&nonempty(evidence.custody_instrument_uri)&&evidence.vendor_exclusive===false&&evidenceReceipts.length>0&&evidenceReceipts.every(integrityReceipt);
  if(evidence.vendor_exclusive===true)error('VENDOR-EXCLUSIVE-CUSTODY','Material evidence may not remain in exclusive vendor custody.');
  if(!evidenceComplete)error('EVIDENCE-CUSTODY','A named custodian, custody instrument, nonexclusive custody, and nonempty exact-byte integrity receipts are required.');
  const preregistered=preregComplete(manifest.evaluation,asOf,scope);

  const successor=object(manifest.successor)?manifest.successor:{};
  const successorInherited=successor.inheritance_required===true&&scopedReceipt(successor.inheritance_receipt,asOf,scope)&&scopedReceipt(successor.post_change_reapproval_receipt,asOf,scope);

  const registry=object(manifest.registry)?manifest.registry:{};const expiry=parseDate(registry.expires_at);const reReview=parseDate(registry.re_review_date);
  if(expiry===null||asOf===null||expiry<asOf)error('EXPIRED-REGISTRY','registry.expires_at must be valid and current.');
  if(reReview===null||asOf===null||reReview<asOf)error('STALE-RE-REVIEW','registry.re_review_date must be valid and on or after claim.as_of.');
  const blockers=Array.isArray(registry.open_blockers)?registry.open_blockers:[];
  if(!Array.isArray(registry.open_blockers)||!blockers.every(structuredBlocker))error('BLOCKER-SCHEMA','registry.open_blockers must contain structured blockers with id, status, first_affected_level, and reason.');

  const observations=object(manifest.observations)?manifest.observations:{};
  const observed=(key)=>scopedReceipt(observations[key],asOf,scope);
  const baseStructural=manifest.schema_version==='apc-adoption-package@2'&&nonempty(manifest.package_id)&&referenceComplete&&LEVELS.includes(requested)&&asOf!==null&&nonempty(claim.deployment_mode)&&sha256(scope)&&independence.self_attested===false&&nonempty(deployment.mode)&&deployment.mode===claim.deployment_mode&&['real_person_data','adverse_action_authority','recommendation_authority','influence_allowed','staff_consultation_allowed'].every((k)=>bool(deployment[k]))&&evidenceComplete&&expiry!==null&&expiry>=asOf&&reReview!==null&&reReview>=asOf&&Array.isArray(registry.open_blockers)&&blockers.every(structuredBlocker);

  const reached={A0:baseStructural};
  reached.A1=reached.A0&&completeAttestors.length>0&&OBSERVATION_KEYS.A1.every(observed);
  reached.A2=reached.A1&&reviewsCurrent&&affectedApproved&&OBSERVATION_KEYS.A2.every(observed);
  reached.A3=reached.A2&&deployment.real_person_data===true&&entryGate&&bindingStop&&preregistered&&modeNoAdverse(deployment)&&OBSERVATION_KEYS.A3.every(observed);
  reached.A4=reached.A3&&modeNoAdverse(deployment)&&OBSERVATION_KEYS.A4.every(observed);
  reached.A5=reached.A4&&OBSERVATION_KEYS.A5.every(observed);
  reached.A6=reached.A5&&successorInherited&&OBSERVATION_KEYS.A6.every(observed);

  let unblocked='NONE';for(const level of LEVELS){if(reached[level])unblocked=level;else break}
  let capIndex=LEVELS.length-1;const open=blockers.filter((b)=>b.status==='open');
  for(const b of open)capIndex=Math.min(capIndex,LEVELS.indexOf(b.first_affected_level)-1);
  const blockerCap=capIndex<0?'NONE':LEVELS[capIndex];
  const unblockedIndex=LEVELS.indexOf(unblocked);const computedIndex=Math.min(unblockedIndex,capIndex);const computed=computedIndex<0?'NONE':LEVELS[computedIndex];
  const requestedIndex=LEVELS.indexOf(requested);

  if(requestedIndex>=1&&completeAttestors.length===0)error('NO-CURRENT-SCOPED-ATTESTOR','A1+ requires at least one current complete non-self attestor matching claim scope.');
  if((requestedIndex>=2||deployment.real_person_data===true)&&!reviewsCurrent)error('REVIEWS-NOT-CURRENT','Current scoped legal, privacy, ethics, and technical reviews are required.');
  if(requestedIndex>=2&&!affectedApproved)error('AFFECTED-PARTY-APPROVAL','A2+ requires complete independent affected-party formation and binding approval evidence.');
  if(deployment.real_person_data===true&&!entryGate)error('REAL-PERSON-ENTRY-GATE','Real-person data requires a current scoped entry-gate instrument.');
  if((requested==='A3'||requested==='A4')&&!modeNoAdverse(deployment))error('ADVERSE-AUTHORITY-IN-NO-ADVERSE-MODE','A3 and A4 prohibit adverse authority, recommendation, influence, and staff consultation.');
  if(requestedIndex>=3&&!bindingStop)error('STOP-AUTHORITY','A3+ requires current independent authority binding institution, operator, vendor, and downstream recipients.');
  if(requestedIndex>=3&&!preregistered)error('PREREGISTRATION','A3+ requires a current scope-bound preregistration frozen before results.');
  for(let i=1;i<=requestedIndex;i++)for(const key of OBSERVATION_KEYS[LEVELS[i]]||[])if(!observed(key))error('MISSING-OBSERVATION-RECEIPT',`${LEVELS[i]} requires a current scope-bound receipt for observations.${key}.`);
  if(requested==='A6'&&!successorInherited)error('SUCCESSOR-INHERITANCE','A6 requires scope-bound inheritance and post-change reapproval receipts.');
  for(const b of open)if(requestedIndex>=LEVELS.indexOf(b.first_affected_level))error('OPEN-CRITICAL-BLOCKER',`${b.blocker_id} caps the claim below ${b.first_affected_level}: ${b.reason}`);
  if(requestedIndex>=0&&requestedIndex>computedIndex)error('UNSUPPORTED-LEVEL',`Requested ${requested} exceeds computed maximum ${computed}.`);

  const conformant=errors.length===0&&requestedIndex>=0&&requestedIndex<=computedIndex;
  return {schema_version:'apc-adoption-conformance-result@2',package_id:nonempty(manifest.package_id)?manifest.package_id:null,conformant,requested_level:LEVELS.includes(requested)?requested:null,computed_maximum_level:computed,unblocked_maximum_level:unblocked,blocker_cap:blockerCap,errors,warnings,machine_verifiable_only:true,truthfulness_determined:false};
}

function main(){const input=process.argv[2];if(!input){console.error('usage: node tools/m05-adoption-conformance.mjs <manifest.json>');process.exit(64)}try{const manifest=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));const result=evaluateAdoptionPackage(manifest);process.stdout.write(`${JSON.stringify(result,null,2)}\n`);process.exit(result.conformant?0:2)}catch(err){console.error(JSON.stringify({schema_version:'apc-adoption-conformance-result@2',conformant:false,requested_level:null,computed_maximum_level:'NONE',unblocked_maximum_level:'NONE',blocker_cap:'NONE',errors:[{code:'INPUT',message:err.message}],warnings:[],machine_verifiable_only:true,truthfulness_determined:false},null,2));process.exit(64)}}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(invoked)main();
