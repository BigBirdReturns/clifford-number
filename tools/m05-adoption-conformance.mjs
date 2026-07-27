#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEVELS = ['A0','A1','A2','A3','A4','A5','A6'];

const requiredTopLevel = [
  'schema_version','package_id','claim','independence','reviews',
  'affected_party','deployment','stop_authority','evidence',
  'evaluation','successor','registry','observations'
];

const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
const object=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const nonempty=(value)=>typeof value==='string'&&value.trim().length>0;
const bool=(value)=>value===true||value===false;

function parseDate(value){
  if(!nonempty(value))return null;
  const time=Date.parse(value);
  return Number.isFinite(time)?time:null;
}

function reviewApproved(review,asOf){
  if(!object(review)||review.status!=='approved'||!nonempty(review.authority)||!nonempty(review.evidence_uri))return false;
  const expiry=parseDate(review.expires_at);
  return expiry!==null&&expiry>=asOf;
}

function attestorComplete(attestor){
  return object(attestor)
    && nonempty(attestor.attestor_id)
    && nonempty(attestor.relationship_disclosure)
    && nonempty(attestor.signed_at)
    && nonempty(attestor.evidence_uri)
    && attestor.self===false;
}

function modeNoAdverse(deployment){
  return deployment.adverse_action_authority===false
    && deployment.recommendation_authority===false
    && deployment.influence_allowed===false
    && deployment.staff_consultation_allowed===false;
}

export function evaluateAdoptionPackage(manifest){
  const errors=[];
  const warnings=[
    {
      code:'TRUTH-NOT-DETERMINED',
      message:'Structural conformance does not establish that evidence is truthful, reviewers or representatives are independent, or stopping, remedy, exit, and value powers work in practice.'
    }
  ];
  const error=(code,message)=>errors.push({code,message});

  if(!object(manifest)){
    return {
      schema_version:'apc-adoption-conformance-result@1',
      conformant:false,
      requested_level:null,
      computed_maximum_level:'NONE',
      errors:[{code:'MANIFEST-TYPE',message:'Manifest must be a JSON object.'}],
      warnings,
      machine_verifiable_only:true,
      truthfulness_determined:false
    };
  }

  for(const field of requiredTopLevel){
    if(!own(manifest,field))error('MISSING-TOP-LEVEL',`Missing required top-level field: ${field}`);
  }

  if(manifest.schema_version!=='apc-adoption-package@1')error('SCHEMA',`Expected schema_version apc-adoption-package@1.`);
  if(!nonempty(manifest.package_id))error('PACKAGE-ID','package_id must be a non-empty string.');

  const claim=object(manifest.claim)?manifest.claim:{};
  const requested=claim.requested_level;
  if(!LEVELS.includes(requested))error('REQUESTED-LEVEL',`claim.requested_level must be one of ${LEVELS.join(', ')}.`);
  if(!nonempty(claim.deployment_mode))error('DEPLOYMENT-MODE','claim.deployment_mode is required.');
  const asOf=parseDate(claim.as_of);
  if(asOf===null)error('AS-OF','claim.as_of must be a valid date.');

  const independence=object(manifest.independence)?manifest.independence:{};
  if(independence.self_attested!==false)error('SELF-ATTESTED-INDEPENDENCE','independence.self_attested must be false.');
  const attestors=Array.isArray(independence.external_attestors)?independence.external_attestors:[];
  const completeAttestors=attestors.filter(attestorComplete);

  const reviews=object(manifest.reviews)?manifest.reviews:{};
  const reviewsCurrent=asOf!==null
    && reviewApproved(reviews.legal,asOf)
    && reviewApproved(reviews.privacy,asOf)
    && reviewApproved(reviews.ethics,asOf);

  const affected=object(manifest.affected_party)?manifest.affected_party:{};
  const affectedApproved=affected.approval_status==='approved'
    && affected.selection_independent===true
    && affected.institution_or_vendor_controls_majority===false
    && nonempty(affected.body_id)
    && nonempty(affected.approval_evidence_uri)
    && affected.nonretaliation_protection===true
    && affected.direct_r1_r4_waiver_allowed===false;

  const deployment=object(manifest.deployment)?manifest.deployment:{};
  if(!bool(deployment.real_person_data))error('REAL-PERSON-DATA-FLAG','deployment.real_person_data must be boolean.');
  if(!bool(deployment.adverse_action_authority))error('ADVERSE-AUTHORITY-FLAG','deployment.adverse_action_authority must be boolean.');
  if(deployment.material_update_since_approval===true&&deployment.update_reapproved!==true){
    error('SILENT-MATERIAL-UPDATE','A material update is recorded without reapproval.');
  }

  const emergency=object(deployment.emergency_authority)?deployment.emergency_authority:{enabled:false};
  if(emergency.enabled===true){
    if(emergency.bounded!==true
      || !nonempty(emergency.expires_at)
      || !nonempty(emergency.independent_authorizer)
      || !nonempty(emergency.minimum_necessary_scope)
      || emergency.evidence_preserved!==true){
      error('UNBOUNDED-EMERGENCY','Enabled emergency authority requires bounded scope, expiry, independent authorization, and preserved evidence.');
    }else if(asOf!==null&&parseDate(emergency.expires_at)!==null&&parseDate(emergency.expires_at)<asOf){
      error('EXPIRED-EMERGENCY','Emergency authority is expired.');
    }
  }

  const stop=object(manifest.stop_authority)?manifest.stop_authority:{};
  const bindingStop=stop.independent===true
    && stop.can_bind_operator===true
    && stop.can_bind_vendor===true
    && stop.complete_evidence_access===true
    && nonempty(stop.evidence_uri);

  const evidence=object(manifest.evidence)?manifest.evidence:{};
  if(evidence.vendor_exclusive===true)error('VENDOR-EXCLUSIVE-CUSTODY','Material evidence may not remain in exclusive vendor custody.');
  if(!nonempty(evidence.custodian))error('EVIDENCE-CUSTODIAN','A named evidence custodian is required.');
  if(!Array.isArray(evidence.integrity_receipts))error('EVIDENCE-RECEIPTS','evidence.integrity_receipts must be an array.');

  const evaluation=object(manifest.evaluation)?manifest.evaluation:{};
  const preregistered=evaluation.preregistered===true
    && evaluation.metrics_frozen===true
    && evaluation.denominators_frozen===true
    && evaluation.stop_thresholds_frozen===true
    && evaluation.results_seen_before_freeze===false
    && nonempty(evaluation.preregistration_uri);

  const successor=object(manifest.successor)?manifest.successor:{};
  const successorInherited=successor.inheritance_required===true
    && successor.observed_inheritance===true
    && successor.post_change_reapproved===true
    && nonempty(successor.evidence_uri);

  const registry=object(manifest.registry)?manifest.registry:{};
  if(!Array.isArray(registry.open_blockers))error('OPEN-BLOCKERS','registry.open_blockers must be an array.');
  const expiry=parseDate(registry.expires_at);
  const reviewDate=parseDate(registry.re_review_date);
  if(expiry===null)error('REGISTRY-EXPIRY','registry.expires_at must be a valid date.');
  if(reviewDate===null)error('RE-REVIEW-DATE','registry.re_review_date must be a valid date.');
  if(asOf!==null&&expiry!==null&&expiry<asOf)error('EXPIRED-REGISTRY','The registry claim is expired.');

  const observations=object(manifest.observations)?manifest.observations:{};

  const baseStructural = manifest.schema_version==='apc-adoption-package@1'
    && nonempty(manifest.package_id)
    && LEVELS.includes(requested)
    && asOf!==null
    && nonempty(claim.deployment_mode)
    && independence.self_attested===false
    && bool(deployment.real_person_data)
    && bool(deployment.adverse_action_authority)
    && nonempty(evidence.custodian)
    && Array.isArray(evidence.integrity_receipts)
    && Array.isArray(registry.open_blockers)
    && expiry!==null
    && reviewDate!==null
    && !(expiry<asOf)
    && evidence.vendor_exclusive!==true
    && !(deployment.material_update_since_approval===true&&deployment.update_reapproved!==true);

  const reached={A0:baseStructural};
  reached.A1=reached.A0
    && completeAttestors.length>0
    && observations.independent_reproduction===true;
  reached.A2=reached.A1
    && reviewsCurrent
    && observations.independent_review===true
    && affectedApproved;
  reached.A3=reached.A2
    && deployment.entry_gate_approved===true
    && bindingStop
    && preregistered
    && observations.lawful_shadow_period===true
    && observations.shadow_adverse_action_boundary_preserved===true;
  reached.A4=reached.A3
    && observations.prospective_parallel_operation===true
    && observations.parallel_adverse_action_boundary_preserved===true
    && observations.comparator_and_failure_denominator_complete===true;
  reached.A5=reached.A4
    && observations.rights_bearing_use===true
    && observations.rights_receipts_complete===true
    && observations.binding_stop_or_remedy_observed===true
    && observations.open_harm_denominator===true;
  reached.A6=reached.A5
    && observations.turnover_survived===true
    && observations.successor_system_survived===true
    && successorInherited;

  let computed='NONE';
  for(const level of LEVELS){
    if(reached[level])computed=level;
    else break;
  }

  const requestedIndex=LEVELS.indexOf(requested);
  if(requestedIndex>=1&&completeAttestors.length===0){
    error('NO-EXTERNAL-ATTESTOR','A1+ requires at least one complete non-self external attestor.');
  }
  if((requestedIndex>=2||deployment.real_person_data===true)&&!reviewsCurrent){
    error('REVIEWS-NOT-CURRENT','Current approved legal, privacy, and ethics reviews are required.');
  }
  if(requestedIndex>=2&&!affectedApproved){
    error('AFFECTED-PARTY-APPROVAL','A2+ requires independent binding affected-party approval with nonretaliation and an immutable direct R1–R4 floor.');
  }
  if(deployment.real_person_data===true&&deployment.entry_gate_approved!==true){
    error('REAL-PERSON-ENTRY-GATE','Real-person data requires an approved entry gate.');
  }
  if(requested==='A3'||requested==='A4'){
    if(!modeNoAdverse(deployment))error('ADVERSE-AUTHORITY-IN-NO-ADVERSE-MODE','A3 and A4 prohibit adverse authority, recommendation, influence, and staff consultation.');
  }
  if(requestedIndex>=3&&!bindingStop)error('STOP-AUTHORITY','A3+ requires an independent authority with complete evidence access that can bind operator and vendor.');
  if(requestedIndex>=3&&!preregistered)error('PREREGISTRATION','A3+ requires metrics, denominators, and stop thresholds frozen before results are visible.');
  if(requested==='A6'&&!successorInherited)error('SUCCESSOR-INHERITANCE','A6 requires observed successor inheritance and post-change reapproval.');

  const computedIndex=LEVELS.indexOf(computed);
  if(requestedIndex>=0&&requestedIndex>computedIndex){
    error('UNSUPPORTED-LEVEL',`Requested ${requested} exceeds computed maximum ${computed}.`);
  }

  const conformant=errors.length===0&&requestedIndex>=0&&requestedIndex<=computedIndex;
  return {
    schema_version:'apc-adoption-conformance-result@1',
    package_id:nonempty(manifest.package_id)?manifest.package_id:null,
    conformant,
    requested_level:LEVELS.includes(requested)?requested:null,
    computed_maximum_level:computed,
    errors,
    warnings,
    machine_verifiable_only:true,
    truthfulness_determined:false
  };
}

function main(){
  const input=process.argv[2];
  if(!input){
    console.error('usage: node tools/m05-adoption-conformance.mjs <manifest.json>');
    process.exit(64);
  }
  try{
    const manifest=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
    const result=evaluateAdoptionPackage(manifest);
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    process.exit(result.conformant?0:2);
  }catch(error){
    console.error(JSON.stringify({
      schema_version:'apc-adoption-conformance-result@1',
      conformant:false,
      requested_level:null,
      computed_maximum_level:'NONE',
      errors:[{code:'INPUT',message:error.message}],
      warnings:[],
      machine_verifiable_only:true,
      truthfulness_determined:false
    },null,2));
    process.exit(64);
  }
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked)main();
