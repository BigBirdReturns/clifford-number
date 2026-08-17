#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateObservation} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  INTEL_CHIPS_AUTHORIZED_CLAIM,
  INTEL_CHIPS_DEFICITS,
  INTEL_CHIPS_INSTRUMENT_QUANTITIES,
  INTEL_CHIPS_RESALE_REGISTRATION_LOCATOR,
  INTEL_CHIPS_RECEIPT_ID,
  INTEL_CHIPS_SOURCE_IDS,
  summarizeIntelChipsEquityReceiptCandidate,
  validateIntelChipsEquityReceiptCandidate
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const candidate=read(
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
);
const audit=read(
  'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'
);
const promotion=read(
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const packet=read('data/project/m05-cross-domain-official-receipt-candidates.json');
const contract=read('data/project/m05-source-health-evidence-state-regression.json');
const robodebtReceipt=read(
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);
const valuePilot=read(
  'data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json'
);
const valueSources=read(
  'data/intake/m05-answerable-power-sprint-03-leg-06-value-recovery-sources.json'
);

const runValidator=(extraEnv={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...extraEnv}
  }
);

const initial=runValidator();
if(initial.status!==0){
  console.error(initial.stdout);
  console.error(initial.stderr);
  throw new Error('Intel candidate validator failed');
}

assert.deepEqual(
  validateIntelChipsEquityReceiptCandidate(
    candidate,
    {audit,promotion,packet,contract,valuePilot,valueSources,robodebtReceipt}
  ),
  []
);
const summary=summarizeIntelChipsEquityReceiptCandidate(
  candidate,
  {audit,promotion,packet,contract,robodebtReceipt}
);
assert.deepEqual(
  {
    existing_promoted_claims:summary.existing_promoted_claims,
    existing_effective_answers:summary.existing_effective_answers,
    existing_robodebt_pre_action_timing:summary.existing_robodebt_pre_action_timing,
    intel_cumulative_escrow_releases_approximate:summary.intel_cumulative_escrow_releases_approximate,
    intel_resale_registered_common_shares:summary.intel_resale_registered_common_shares,
    intel_source_addressed_candidates:summary.intel_source_addressed_candidates,
    intel_claim_evidence_admissible:summary.intel_claim_evidence_admissible,
    intel_repository_promotion_allowed:summary.intel_repository_promotion_allowed,
    intel_answer_effective:summary.intel_answer_effective,
    total_effective_answers:summary.total_effective_answers,
    cross_domain_regression_completed:summary.cross_domain_regression_completed,
    issue_345_may_close:summary.issue_345_may_close
  },
  candidate.expected_state
);
assert.equal(candidate.receipt.receipt_id,INTEL_CHIPS_RECEIPT_ID);
assert.equal(candidate.receipt.claim_binding.claim,INTEL_CHIPS_AUTHORIZED_CLAIM);
assert.deepEqual(candidate.receipt.sources.map((row)=>row.source_id),INTEL_CHIPS_SOURCE_IDS);
assert.deepEqual(candidate.receipt.deficits,INTEL_CHIPS_DEFICITS);
assert.deepEqual(candidate.receipt.instrument_quantities,INTEL_CHIPS_INSTRUMENT_QUANTITIES);
assert.deepEqual(
  candidate.receipt.sources.find(
    (row)=>row.source_id==='US-INTEL-CHIPS-RESALE-REGISTRATION'
  ).locator,
  INTEL_CHIPS_RESALE_REGISTRATION_LOCATOR
);
assert.equal(summary.existing_summary.repository_promotion_allowed,3);
assert.equal(summary.existing_summary.effective_answers,0);
assert.equal(summary.existing_summary.robodebt_pre_action_timing,true);
assert.equal(summary.existing_summary.robodebt_durability,false);
assert.equal(summary.existing_summary.cross_domain_regression_completed,false);

const syntheticPromotion=structuredClone(candidate.receipt.observation);
syntheticPromotion.promotes_to='candidate_evidence';
syntheticPromotion.evidence.promotion_authority=true;
syntheticPromotion.evidence.promotion_ceiling='claim_evidence';
const syntheticEvaluation=evaluateObservation(syntheticPromotion,contract);
assert.equal(syntheticEvaluation.claim_evidence_admissible,true);
assert.equal(syntheticEvaluation.repository_promotion_allowed,true);
assert.equal(syntheticEvaluation.answer_effective,false);
assert.ok(syntheticEvaluation.answer_failures.includes('minimum_observed_domains'));
assert.ok(syntheticEvaluation.answer_failures.includes('minimum_observed_jurisdictions'));
assert.ok(syntheticEvaluation.answer_failures.includes('composed_durable_answer'));
assert.ok(syntheticEvaluation.answer_failures.includes('dimension:durability'));

const writeTempJson=(prefix,value)=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  const target=path.join(directory,'object.json');
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`,'utf8');
  return {directory,target};
};

const expectCandidateFailure=(label,mutate,pattern)=>{
  const mutation=structuredClone(candidate);
  mutate(mutation);
  const {directory,target}=writeTempJson('m05-intel-candidate-',mutation);
  try{
    const result=runValidator({M05_INTEL_CHIPS_EQUITY_CANDIDATE_PATH:target});
    assert.notEqual(result.status,0,`${label} mutation must fail`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      pattern,
      `${label} mutation must fail for the expected reason`
    );
  }finally{
    fs.rmSync(directory,{recursive:true,force:true});
  }
};

expectCandidateFailure(
  'schema',
  (row)=>{row.schema_version='m05-invalid@1'},
  /Intel candidate schema drift/u
);
expectCandidateFailure(
  'canonical base',
  (row)=>{row.canonical_base.sha='0'.repeat(40)},
  /Intel canonical base drift/u
);
expectCandidateFailure(
  'audit binding',
  (row)=>{row.bindings.real_receipt_audit.blob_sha='0'.repeat(40)},
  /Intel source-custody binding drift/u
);
expectCandidateFailure(
  'exact claim',
  (row)=>{row.receipt.claim_binding.claim+=' Unsupported widening.'},
  /Intel exact claim widened or changed/u
);
expectCandidateFailure(
  'insecure URL',
  (row)=>{row.receipt.sources[0].url=row.receipt.sources[0].url.replace('https://','http://')},
  /must use HTTPS/u
);
expectCandidateFailure(
  'foreign host',
  (row)=>{row.receipt.sources[1].url='https://example.com/intel-agreement'},
  /escaped the official host boundary/u
);
expectCandidateFailure(
  'missing locator',
  (row)=>{row.receipt.sources[2].locator=[]},
  /lacks a substantive locator/u
);
expectCandidateFailure(
  'duplicate source identifier',
  (row)=>{row.receipt.sources[1].source_id=row.receipt.sources[0].source_id},
  /duplicate Intel source identifier/u
);
expectCandidateFailure(
  'promotion authority',
  (row)=>{row.receipt.observation.evidence.promotion_authority=true},
  /Intel evidence gate promotion_authority drift/u
);
expectCandidateFailure(
  'promotion ceiling',
  (row)=>{row.receipt.observation.evidence.promotion_ceiling='claim_evidence'},
  /Intel evidence promotion ceiling drift/u
);
expectCandidateFailure(
  'repository promotion target',
  (row)=>{row.receipt.observation.promotes_to='candidate_evidence'},
  /Intel receipt escaped the no-promotion boundary/u
);
expectCandidateFailure(
  'resale-registration common-share quantity',
  (row)=>{row.receipt.instrument_quantities.resale_registered_common_shares=673839149},
  /Intel instrument quantity ledger drift/u
);
expectCandidateFailure(
  'cumulative escrow releases',
  (row)=>{row.receipt.instrument_quantities.cumulative_escrow_releases_through_2026_06_27_approximate=13000000},
  /Intel instrument quantity ledger drift/u
);
expectCandidateFailure(
  'resale-registration quantity locator',
  (row)=>{row.receipt.sources[3].locator[0]='Registration categories without the exact registered quantities required by this receipt'},
  /Intel resale-registration quantity locator drift/u
);
expectCandidateFailure(
  'sale realization',
  (row)=>{row.receipt.instrument_chain.realized_sale_dividend_or_warrant_exercise=true},
  /must remain false/u
);
expectCandidateFailure(
  'federal receipt',
  (row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true},
  /must remain false/u
);
expectCandidateFailure(
  'public distribution',
  (row)=>{row.receipt.instrument_chain.transparent_public_or_affected_party_distribution=true},
  /must remain false/u
);
expectCandidateFailure(
  'market-value sufficiency',
  (row)=>{row.boundaries.market_value_is_realized_return=true},
  /Intel boundary market_value_is_realized_return weakened/u
);
expectCandidateFailure(
  'durability promotion',
  (row)=>{row.receipt.observation.answer.dimensions.durability=true},
  /Intel answer dimension ledger drift/u
);
expectCandidateFailure(
  'composed answer',
  (row)=>{row.receipt.observation.answer.composed_durable_answer=true},
  /improperly claims a composed durable answer/u
);
expectCandidateFailure(
  'expected promotion',
  (row)=>{row.expected_state.intel_claim_evidence_admissible=1},
  /Intel expected state intel_claim_evidence_admissible drift/u
);

const expectBoundObjectFailure=(label,envName,value,pattern)=>{
  const {directory,target}=writeTempJson('m05-intel-bound-',value);
  try{
    const result=runValidator({[envName]:target});
    assert.notEqual(result.status,0,`${label} mutation must fail`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      pattern,
      `${label} mutation must fail for the expected reason`
    );
  }finally{
    fs.rmSync(directory,{recursive:true,force:true});
  }
};

const changedPromotion=structuredClone(promotion);
changedPromotion.adjudications[0].answer_changes_authorized=true;
expectBoundObjectFailure(
  'existing promotion adjudication',
  'M05_CLAIM_PROMOTION_ADJUDICATION_PATH',
  changedPromotion,
  /claim_promotion_adjudication Git object drift/u
);

const changedPacket=structuredClone(packet);
changedPacket.records[0].claim_binding.claim+=' Mutated.';
expectBoundObjectFailure(
  'existing official receipt packet',
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  changedPacket,
  /official_receipt_packet Git object drift/u
);

const changedRobodebtReceipt=structuredClone(robodebtReceipt);
changedRobodebtReceipt.target.after=false;
expectBoundObjectFailure(
  'Robodebt pre-action receipt',
  'M05_ROBODEBT_PRE_ACTION_RECEIPT_PATH',
  changedRobodebtReceipt,
  /robodebt_pre_action_implementation_receipt Git object drift/u
);

console.log(
  `m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate.test: OK `+
  `(${INTEL_CHIPS_SOURCE_IDS.length} official sources; `+
  `3 preserved candidate-evidence claims; 24 fail-closed mutations; `+
  `Intel realization and distribution remain unresolved)`
);
