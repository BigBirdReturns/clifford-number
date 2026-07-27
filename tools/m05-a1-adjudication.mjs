#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_COMMIT='ce8f4194019cf75cc2b66436efbeebdfd43f9951';
export const TARGET_BUNDLE='9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad';
export const PRIOR_REGISTRY_BLOB='5555d18654c2fb7bc908efe7c0ffbc25487b8fac';
const HEX64=/^[0-9a-f]{64}$/;
const HEX40=/^[0-9a-f]{40}$/;
const object=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonempty=(v)=>typeof v==='string'&&v.trim().length>0;
const parseDate=(v)=>{if(!nonempty(v))return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const days=(n)=>n*86400000;
const uri=(v)=>nonempty(v)&&v.length>=8;

export function evaluateA1Adjudication(tx,{asOf=new Date()}={}){
  const errors=[]; const warnings=[]; const error=(code,message)=>errors.push({code,message});
  if(!(asOf instanceof Date)||Number.isNaN(asOf.getTime()))throw new Error('invalid asOf');
  if(!object(tx))return {schema_version:'m05-a1-adjudication-validation@1',structurally_valid:false,eligible_for_registry_proposal:false,errors:[{code:'TRANSACTION-TYPE',message:'Transaction must be an object.'}],warnings:[],machine_verifiable_only:true,independence_determined:false,evidence_truth_determined:false,external_adjudication_observed:false,a1_observed:false,registry_mutated:false};
  if(tx.schema_version!=='apc-a1-adjudication-transaction@1')error('SCHEMA','schema_version mismatch');
  if(!/^A1T-[A-Z0-9][A-Z0-9-]{7,63}$/.test(tx.transaction_id||''))error('TRANSACTION-ID','invalid transaction_id');
  const issued=parseDate(tx.as_of), expires=parseDate(tx.expires_at);
  if(!issued)error('AS-OF','invalid as_of'); else if(issued>asOf)error('FUTURE-TRANSACTION','transaction as_of is in the future');
  if(!expires)error('EXPIRY','invalid expires_at'); else {if(expires<=asOf)error('EXPIRED','transaction expired');if(issued&&expires-issued>days(366))error('VALIDITY','transaction validity exceeds 366 days');}
  const receipt=object(tx.receipt)?tx.receipt:{};
  if(!/^A1R-[A-Z0-9][A-Z0-9-]{7,63}$/.test(receipt.receipt_id||''))error('RECEIPT-ID','invalid receipt_id');
  if(!uri(receipt.receipt_uri)||!HEX64.test(receipt.receipt_sha256||''))error('RECEIPT-CUSTODY','invalid receipt URI or SHA-256');
  if(!uri(receipt.structural_validation_uri)||!HEX64.test(receipt.structural_validation_sha256||''))error('STRUCTURAL-VALIDATION','invalid structural validation custody');
  if(receipt.structurally_valid!==true)error('RECEIPT-NOT-VALID','receipt was not structurally valid');
  if(receipt.target_commit!==TARGET_COMMIT)error('REFERENCE-COMMIT','reference commit mismatch');
  if(receipt.target_bundle_sha256!==TARGET_BUNDLE)error('REFERENCE-BUNDLE','reference bundle mismatch');
  const docket=object(tx.docket)?tx.docket:{};
  for(const [key,value] of [['docket_uri',docket.docket_uri],['public_notice_uri',docket.public_notice_uri],['pool_snapshot_uri',docket.pool_snapshot_uri]])if(!uri(value))error('DOCKET-FIELD',`invalid ${key}`);
  if(!HEX64.test(docket.pool_snapshot_sha256||''))error('POOL-SNAPSHOT','invalid pool snapshot hash');
  if(!HEX64.test(docket.selection_seed_sha256||''))error('SELECTION-SEED','invalid selection seed');
  if(docket.selection_method!=='public_pool_recorded_selection')error('SELECTION-METHOD','selection method mismatch');
  if(!Number.isInteger(docket.pool_size)||docket.pool_size<4)error('POOL-SIZE','public pool must contain at least four candidates');
  if(docket.reproducer_controlled!==false)error('REPRODUCER-SELECTION','reproducer may not control selection');
  if(docket.project_unilateral_selection!==false)error('PROJECT-SELECTION','project may not select reviewers unilaterally');
  const docketOpened=parseDate(docket.opened_at), docketDeadline=parseDate(docket.challenge_deadline);
  if(!docketOpened||!docketDeadline)error('DOCKET-DATES','invalid docket dates'); else if(docketDeadline-docketOpened<days(14))error('SHORT-DOCKET-WINDOW','docket challenge window is shorter than 14 days');
  const reviewers=Array.isArray(tx.adjudicators)?tx.adjudicators:[];
  if(reviewers.length!==2)error('REVIEWER-DENOMINATOR','exactly two substantive adjudicators are required');
  const byRole=new Map();
  const disqualifierFlags=['repo_admin_or_maintainer','reference_contributor','receipt_preparer_or_reproducer','vendor_operator_customer_or_adopter','same_legal_entity_as_disqualified','project_bot_or_ci','contingent_compensation','evidence_host_or_preparer'];
  for(const [i,r] of reviewers.entries()){
    if(!object(r)){error('REVIEWER-TYPE',`adjudicator ${i} must be an object`);continue;}
    if(!['independence','evidence'].includes(r.role))error('REVIEWER-ROLE',`invalid reviewer role ${r.role}`); else if(byRole.has(r.role))error('DUPLICATE-ROLE',`duplicate reviewer role ${r.role}`); else byRole.set(r.role,r);
    for(const key of ['adjudicator_id','name','legal_entity'])if(!nonempty(r[key]))error('REVIEWER-IDENTITY',`missing adjudicator ${i} ${key}`);
    for(const key of ['identity_uri','eligibility_uri','signature_uri'])if(!uri(r[key]))error('REVIEWER-URI',`invalid adjudicator ${i} ${key}`);
    for(const key of ['eligibility_sha256','signature_sha256'])if(!HEX64.test(r[key]||''))error('REVIEWER-HASH',`invalid adjudicator ${i} ${key}`);
    if(r.selected_from_public_pool!==true)error('POOL-SELECTION',`${r.adjudicator_id||i} not selected from public pool`);
    if(r.selected_by_reproducer!==false)error('REPRODUCER-SELECTION',`${r.adjudicator_id||i} selected by reproducer`);
    if(r.selected_by_project_unilaterally!==false)error('PROJECT-SELECTION',`${r.adjudicator_id||i} selected unilaterally by project`);
    for(const flag of disqualifierFlags)if(r[flag]!==false)error('DISQUALIFIED-REVIEWER',`${r.adjudicator_id||i}: ${flag}`);
    if(r.conflicts_disclosed!==true||!Array.isArray(r.conflict_disclosures))error('CONFLICT-DISCLOSURE',`${r.adjudicator_id||i} conflict disclosure incomplete`);
    const signed=parseDate(r.signed_at), exp=parseDate(r.expires_at);
    if(!signed||!exp)error('REVIEWER-DATES',`${r.adjudicator_id||i} has invalid dates`); else {if(signed>asOf)error('FUTURE-REVIEWER-SIGNATURE',`${r.adjudicator_id||i} signed in future`);if(exp<=asOf)error('STALE-REVIEWER',`${r.adjudicator_id||i} eligibility expired`);if(exp-signed>days(366))error('REVIEWER-VALIDITY',`${r.adjudicator_id||i} validity exceeds 366 days`);}
  }
  const independenceReviewer=byRole.get('independence'), evidenceReviewer=byRole.get('evidence');
  if(independenceReviewer&&evidenceReviewer){
    if(independenceReviewer.adjudicator_id===evidenceReviewer.adjudicator_id)error('ROLE-OVERLAP','same person occupies both roles');
    if(independenceReviewer.legal_entity===evidenceReviewer.legal_entity)error('LEGAL-ENTITY-OVERLAP','substantive reviewers share a legal entity');
  }
  const decisions=object(tx.decisions)?tx.decisions:{};
  for(const role of ['independence','evidence']){
    const d=object(decisions[role])?decisions[role]:{}; const reviewer=byRole.get(role);
    if(!reviewer||d.adjudicator_id!==reviewer.adjudicator_id)error('DECISION-REVIEWER',`${role} decision reviewer mismatch`);
    if(d.disposition!=='approve')error('DECISION-NOT-APPROVED',`${role} decision is not approve`);
    if(d.receipt_sha256!==receipt.receipt_sha256)error('DECISION-SCOPE',`${role} decision is not bound to receipt hash`);
    if(!Array.isArray(d.evidence_uris)||d.evidence_uris.length===0||d.evidence_uris.some((v)=>!uri(v)))error('DECISION-EVIDENCE',`${role} decision evidence missing`);
    if(!Array.isArray(d.findings)||d.findings.length===0)error('DECISION-FINDINGS',`${role} decision findings missing`);
    if(!Array.isArray(d.blockers)||d.blockers.length!==0)error('DECISION-BLOCKERS',`${role} decision has blockers`);
    if(!Array.isArray(d.dissent)||d.dissent.length!==0)error('DECISION-DISSENT',`${role} decision has unresolved dissent`);
    if(!uri(d.signature_uri)||!HEX64.test(d.signature_sha256||''))error('DECISION-SIGNATURE',`${role} decision signature invalid`);
    const dIssued=parseDate(d.issued_at), dExpires=parseDate(d.expires_at);
    if(!dIssued||!dExpires)error('DECISION-DATES',`${role} decision dates invalid`); else {if(dIssued>asOf)error('FUTURE-DECISION',`${role} decision issued in future`);if(dExpires<=asOf)error('STALE-DECISION',`${role} decision expired`);if(dExpires-dIssued>days(366))error('DECISION-VALIDITY',`${role} decision validity exceeds 366 days`);}
  }
  const challenge=object(tx.challenge)?tx.challenge:{};
  if(!uri(challenge.public_notice_uri))error('CHALLENGE-NOTICE','invalid challenge notice URI');
  const challengeOpened=parseDate(challenge.opened_at), challengeDeadline=parseDate(challenge.deadline);
  if(!challengeOpened||!challengeDeadline)error('CHALLENGE-DATES','invalid challenge dates'); else {if(challengeDeadline-challengeOpened<days(14))error('SHORT-CHALLENGE-WINDOW','challenge window is shorter than 14 days');if(challengeDeadline>asOf)error('CHALLENGE-WINDOW-OPEN','challenge window has not elapsed');}
  if(!Number.isInteger(challenge.window_days)||challenge.window_days<14)error('CHALLENGE-WINDOW','window_days must be at least 14');
  if(!Number.isInteger(challenge.submissions_count)||challenge.submissions_count<0)error('CHALLENGE-COUNT','invalid submissions_count');
  if(!Array.isArray(challenge.unresolved_challenges)||challenge.unresolved_challenges.length!==0)error('UNRESOLVED-CHALLENGE','material challenge remains unresolved');
  if(!Array.isArray(challenge.dissent)||challenge.dissent.length!==0)error('UNRESOLVED-DISSENT','dissent remains unresolved');
  if(challenge.reconsideration_required!==false)error('RECONSIDERATION','transaction requires reconsideration');
  const reg=object(tx.registry_transaction)?tx.registry_transaction:{};
  if(!HEX40.test(reg.prior_registry_blob_sha||'')||reg.prior_registry_blob_sha!==PRIOR_REGISTRY_BLOB)error('PRIOR-REGISTRY','prior registry blob mismatch');
  if(reg.proposed_status!=='approved_for_a1')error('PROPOSED-STATUS','proposed status mismatch');
  if(!uri(reg.proposed_entry_uri)||!HEX64.test(reg.proposed_entry_sha256||''))error('PROPOSED-ENTRY','invalid proposed entry custody');
  if(!Array.isArray(reg.open_blockers)||reg.open_blockers.length!==0)error('REGISTRY-BLOCKERS','registry transaction has open blockers');
  if(!nonempty(reg.prepared_by)||!nonempty(reg.custodian_id))error('REGISTRY-IDENTITY','registry transaction identities missing');
  const prepared=parseDate(reg.prepared_at);if(!prepared||prepared>asOf)error('REGISTRY-DATE','invalid registry prepared_at');
  if(reg.custodian_is_substantive_adjudicator!==false)error('CUSTODIAN-ROLE','custodian may not be a substantive adjudicator');
  if(reviewers.some((r)=>r.adjudicator_id===reg.custodian_id))error('CUSTODIAN-OVERLAP','custodian overlaps substantive adjudicator');
  if(reg.custodian_substantive_override!==false)error('CUSTODIAN-OVERRIDE','custodian substantive override is forbidden');
  if(reg.entry_matches_decisions!==true)error('ENTRY-MISMATCH','proposed entry does not match decisions');
  if(reg.append_preserving!==true)error('APPEND-LAW','registry transaction is not append-preserving');
  const declaration=object(tx.declaration)?tx.declaration:{};
  for(const key of ['no_self_award','no_unilateral_project_award','separate_reviewers','no_open_blockers','no_unresolved_challenge','registry_not_mutated_by_cli'])if(declaration[key]!==true)error('DECLARATION',`declaration.${key} must be true`);
  const structurallyValid=errors.length===0;
  if(structurallyValid)warnings.push({code:'HUMAN-ADJUDICATION-REMAINS',message:'Structural eligibility does not determine actual reviewer independence, evidence truth, challenge suppression, or A1 registry approval.'});
  return {schema_version:'m05-a1-adjudication-validation@1',transaction_id:tx.transaction_id||null,receipt_id:receipt.receipt_id||null,structurally_valid:structurallyValid,eligible_for_registry_proposal:structurallyValid,errors,warnings,machine_verifiable_only:true,human_review_required:true,independence_determined:false,evidence_truth_determined:false,external_adjudication_observed:false,a1_observed:false,registry_mutated:false};
}

function main(){
  const input=process.argv[2];if(!input){console.error('usage: node tools/m05-a1-adjudication.mjs <transaction.json> [--as-of YYYY-MM-DD]');process.exit(64)}
  let asOf=new Date();const idx=process.argv.indexOf('--as-of');if(idx>=0){const value=process.argv[idx+1];if(!value){process.exit(64)}asOf=new Date(`${value}T23:59:59.999Z`)}
  try{const tx=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));const out=evaluateA1Adjudication(tx,{asOf});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);process.exit(out.structurally_valid?0:2)}catch(error){console.error(error.message);process.exit(64)}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(invoked)main();
