#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  HFU_SHARE_FALSE_CHAIN_FIELDS,
  HFU_SHARE_TRUE_CHAIN_FIELDS,
  buildSyntheticPromotableHfuObservation,
  summarizeHfuShareExitReceiptCandidate,
  validateHfuShareExitReceiptCandidate
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.mjs';
import {
  ANSWER_DIMENSIONS,
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation
} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const load=(relative)=>JSON.parse(fs.readFileSync(path.join(ROOT,relative),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));

const candidate=load(
  'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'
);
const deps={
  audit:load('data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'),
  exitPilot:load('data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json'),
  sourceRegistry:load('data/intake/m05-answerable-power-sprint-01-sources.json'),
  intelCandidate:load(
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
  ),
  contract:load('data/project/m05-source-health-evidence-state-regression.json'),
  dependencyBlobShas:{
    real_receipt_audit:'4dce5e6d28c427a8c5fff3953c44d0e1e5a1f99f',
    public_platform_exit_pilot:'e0002da8f65c46acd00a84251a6d141487daf8b8',
    sprint_01_source_registry:'c933a61fa709584f80b175aba972f93a19a6d90f',
    evidence_state_contract:'72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33',
    intel_repository_content_receipt:'ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a'
  }
};

const validate=(value,overrides={})=>validateHfuShareExitReceiptCandidate(
  value,
  {...deps,...overrides}
);

const baselineErrors=validate(candidate);
assert.deepEqual(baselineErrors,[],'baseline HFU candidate must validate');

const summary=summarizeHfuShareExitReceiptCandidate(candidate,{
  intelCandidate:deps.intelCandidate,
  contract:deps.contract
});
assert.equal(summary.existing_promoted_claims,3);
assert.equal(summary.existing_effective_answers,0);
assert.equal(summary.existing_robodebt_pre_action_timing,true);
assert.equal(summary.existing_intel_repository_content_receipts,1);
assert.equal(summary.hfu_source_addressed_candidates,1);
assert.equal(summary.hfu_claim_evidence_admissible,0);
assert.equal(summary.hfu_repository_promotion_allowed,0);
assert.equal(summary.hfu_answer_effective,false);
assert.equal(summary.hfu_practical_exit_or_governance,true);
assert.equal(summary.hfu_durability,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.issue_345_may_close,false);

const assertMutationFails=(mutate,label,overrides={})=>{
  const changed=clone(candidate);
  mutate(changed);
  const errors=validate(changed,overrides);
  assert.ok(errors.length>0,`${label} must fail closed`);
};

assertMutationFails((row)=>{row.schema_version='drift';},'schema drift');
assertMutationFails((row)=>{row.canonical_base.sha='0'.repeat(40);},'canonical base drift');
assertMutationFails((row)=>{row.receipt.claim_binding.claim+=' widened';},'claim widening');
assertMutationFails((row)=>{row.bindings.external_service_repository.commit_sha='0'.repeat(40);},
  'external repository commit drift');
assertMutationFails((row)=>{row.bindings.external_service_repository.tree_sha='0'.repeat(40);},
  'external repository tree drift');
assertMutationFails((row)=>{row.bindings.external_service_repository.changelog_blob_sha='0'.repeat(40);},
  'external repository changelog blob drift');

for(let index=0;index<candidate.receipt.sources.length;index+=1){
  assertMutationFails((row)=>{
    row.receipt.sources[index].source_id=`MUTATED-${index}`;
  },`source identity mutation ${index}`);
  assertMutationFails((row)=>{
    row.receipt.sources[index].url='https://example.com/substituted';
  },`source URL mutation ${index}`);
  assertMutationFails((row)=>{
    row.receipt.sources[index].locator=[];
  },`source locator mutation ${index}`);
}

for(const field of HFU_SHARE_TRUE_CHAIN_FIELDS){
  assertMutationFails((row)=>{row.receipt.transition_chain[field]=false;},
    `true transition-chain field ${field}`);
}
for(const field of HFU_SHARE_FALSE_CHAIN_FIELDS){
  assertMutationFails((row)=>{row.receipt.transition_chain[field]=true;},
    `false transition-chain field ${field}`);
}

for(const gate of EVIDENCE_BOOLEAN_GATES){
  assertMutationFails((row)=>{
    row.receipt.observation.evidence[gate]=
      gate==='promotion_authority'?true:false;
  },`evidence gate mutation ${gate}`);
}
assertMutationFails((row)=>{
  row.receipt.observation.evidence.promotion_ceiling='claim_evidence';
},'promotion ceiling expansion');
assertMutationFails((row)=>{
  row.receipt.observation.promotes_to='candidate_evidence';
},'promotion target expansion');

for(const dimension of ANSWER_DIMENSIONS){
  assertMutationFails((row)=>{
    row.receipt.observation.answer.dimensions[dimension]=
      !row.receipt.observation.answer.dimensions[dimension];
  },`answer dimension mutation ${dimension}`);
}
assertMutationFails((row)=>{
  row.receipt.observation.answer.composed_durable_answer=true;
},'composed-answer inflation');
assertMutationFails((row)=>{
  row.receipt.observation.answer.observed_outcome=false;
},'observed-outcome erasure');
assertMutationFails((row)=>{row.receipt.deficits.pop();},'deficit erasure');
assertMutationFails((row)=>{
  row.expected_state.hfu_claim_evidence_admissible=1;
},'expected claim admission inflation');
assertMutationFails((row)=>{
  row.expected_state.hfu_answer_effective=true;
},'expected answer inflation');
assertMutationFails((row)=>{
  row.boundaries.supplier_exit_is_complete_sovereignty=true;
},'complete-sovereignty boundary inflation');
assertMutationFails((row)=>{
  row.boundaries.public_code_is_supplier_free_operation=true;
},'supplier-free boundary inflation');
assertMutationFails((row)=>{
  row.boundaries.issue_345_may_close=true;
},'issue closure inflation');

{
  const audit=clone(deps.audit);
  const exitAudit=audit.domain_audits.find((row)=>row.domain_id==='APC-EXIT-01');
  exitAudit.current_state.claim_evidence_admissible=true;
  assert.ok(validate(candidate,{audit}).length>0,'audit-state drift must fail');
}
{
  const exitPilot=clone(deps.exitPilot);
  exitPilot.systems.find((row)=>row.system_id==='EXIT-HFU-SHARE').highest_observed_level='R7';
  assert.ok(validate(candidate,{exitPilot}).length>0,'exit-pilot ceiling drift must fail');
}
{
  const sourceRegistry=clone(deps.sourceRegistry);
  sourceRegistry.sources.find((row)=>row.source_id==='M05-SP01-SRC-012').url=
    'https://example.com/substituted';
  assert.ok(validate(candidate,{sourceRegistry}).length>0,'source-registry drift must fail');
}
{
  const intelCandidate=clone(deps.intelCandidate);
  intelCandidate.expected_state.existing_robodebt_pre_action_timing=false;
  assert.ok(validate(candidate,{intelCandidate}).length>0,
    'Robodebt predecessor-state rollback must fail');
}
{
  const contract=clone(deps.contract);
  contract.schema_version='drift';
  assert.ok(validate(candidate,{contract}).length>0,'evidence-contract drift must fail');
}
{
  const dependencyBlobShas={...deps.dependencyBlobShas};
  dependencyBlobShas.public_platform_exit_pilot='0'.repeat(40);
  assert.ok(validate(candidate,{dependencyBlobShas}).length>0,
    'live dependency Git-blob drift must fail');
}

const syntheticObservation=buildSyntheticPromotableHfuObservation(candidate);
const syntheticEvaluation=evaluateObservation(syntheticObservation,deps.contract);
assert.equal(syntheticEvaluation.claim_evidence_admissible,true,
  'complete synthetic promotion mutation should clear claim admission');
assert.equal(syntheticEvaluation.repository_promotion_allowed,true,
  'complete synthetic promotion mutation should clear repository promotion');
assert.equal(syntheticEvaluation.answer_effective,false,
  'promotion alone must not clear the answer-effectiveness gate');

const promotedCandidate=clone(candidate);
promotedCandidate.receipt.observation=syntheticObservation;
assert.ok(validate(promotedCandidate).length>0,
  'this repository-content transaction must reject synthetic promotion authority');

console.log(JSON.stringify({
  status:'passed',
  source_records:candidate.receipt.sources.length,
  source_mutations:candidate.receipt.sources.length*3,
  transition_mutations:
    HFU_SHARE_TRUE_CHAIN_FIELDS.length+HFU_SHARE_FALSE_CHAIN_FIELDS.length,
  evidence_mutations:EVIDENCE_BOOLEAN_GATES.length+2,
  answer_mutations:ANSWER_DIMENSIONS.length+2,
  custody_mutations:5,
  synthetic_claim_admission:syntheticEvaluation.claim_evidence_admissible,
  synthetic_repository_promotion:syntheticEvaluation.repository_promotion_allowed,
  synthetic_answer_effective:syntheticEvaluation.answer_effective
},null,2));
