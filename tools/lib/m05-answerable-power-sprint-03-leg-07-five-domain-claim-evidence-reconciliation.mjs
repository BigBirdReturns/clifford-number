import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';
import {
  summarizeClaimEvidencePromotionAdjudication
} from './m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';
import {
  applyRobodebtPreActionImplementationReceipt
} from './m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs';

export const FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS=[
  'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',
  'M05-RC-EXIT-UK-HFU-SHARE'
];

export const FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS=[
  'APC-VALUE-01',
  'APC-EXIT-01'
];

export const FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS=['US','UK'];
export const FIVE_DOMAIN_ROBODEBT_RECEIPT_ID='M05-RC-ADMIN-AU-ROBODEBT';
export const FIVE_DOMAIN_ROBODEBT_DOMAIN_ID='APC-ADMIN-01';
export const FIVE_DOMAIN_ROBODEBT_JURISDICTION='AU';
export const FIVE_DOMAIN_ROBODEBT_DIMENSION='pre_action_timing';

const FROZEN_ROBODEBT_TARGET=Object.freeze({
  receipt_id:FIVE_DOMAIN_ROBODEBT_RECEIPT_ID,
  domain_id:FIVE_DOMAIN_ROBODEBT_DOMAIN_ID,
  jurisdiction:FIVE_DOMAIN_ROBODEBT_JURISDICTION,
  dimension:FIVE_DOMAIN_ROBODEBT_DIMENSION,
  before:false,
  after:true
});

const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

const candidateReceipts=(intelCandidate,hfuCandidate)=>[
  intelCandidate?.receipt,
  hfuCandidate?.receipt
];

const assertRobodebtTarget=(target)=>{
  for(const [key,value] of Object.entries(FROZEN_ROBODEBT_TARGET)){
    if(target?.[key]!==value){
      throw new Error(`Robodebt implementation target drift: ${key}`);
    }
  }
};

const applyRobodebtState=(
  officialPacket,
  priorAdjudication,
  robodebtImplementationReceipt,
  contract
)=>{
  if(!robodebtImplementationReceipt){
    throw new Error('missing Robodebt implementation receipt');
  }
  assertRobodebtTarget(robodebtImplementationReceipt.target);
  return applyRobodebtPreActionImplementationReceipt(
    officialPacket,
    priorAdjudication,
    robodebtImplementationReceipt,
    contract
  );
};

export function applyFiveDomainClaimEvidenceReconciliation({
  officialPacket,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  intelCandidate,
  hfuCandidate,
  reconciliation
}){
  const robodebtApplied=applyRobodebtState(
    officialPacket,
    priorAdjudication,
    robodebtImplementationReceipt,
    contract
  );
  const receipts=candidateReceipts(intelCandidate,hfuCandidate);
  const receiptsById=new Map(receipts.map((row)=>[row?.receipt_id,row]));
  const decisions=Array.isArray(reconciliation?.adjudications)?reconciliation.adjudications:[];
  const decisionsById=new Map(decisions.map((row)=>[row.receipt_id,row]));

  const additionalPromotedRecords=FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS.map((receiptId)=>{
    const source=receiptsById.get(receiptId);
    const decision=decisionsById.get(receiptId);
    if(!source)throw new Error(`missing additional source candidate ${receiptId}`);
    if(!decision)throw new Error(`missing additional promotion adjudication ${receiptId}`);

    const observation=clone(source.observation);
    observation.promotes_to=decision.promotes_to;
    observation.evidence.promotion_authority=decision.promotion_authority;
    observation.evidence.promotion_ceiling=decision.promotion_ceiling;
    observation.expected={
      claim_evidence_admissible:true,
      answer_effective:false
    };

    return {
      receipt_id:receiptId,
      domain_id:source.domain_id,
      jurisdiction:source.jurisdiction,
      authorized_claim:decision.authorized_claim,
      source_claim:source.claim_binding.claim,
      observation,
      source_observation:clone(source.observation),
      source_instrument_chain:clone(source.instrument_chain||source.transition_chain||{}),
      preserved_deficits:clone(decision.preserved_deficits),
      guarded_nonfindings:clone(decision.guarded_nonfindings||{})
    };
  });

  const priorPromotedRecords=robodebtApplied.promoted_records.map((row)=>{
    const promoted=clone(row);
    if(promoted.domain_id===FIVE_DOMAIN_ROBODEBT_DOMAIN_ID){
      promoted.observation=clone(robodebtApplied.after_observation);
      promoted.preserved_deficits=clone(
        robodebtImplementationReceipt.retained_deficits||[]
      );
    }
    return promoted;
  });
  const allPromotedRecords=[
    ...priorPromotedRecords,
    ...additionalPromotedRecords
  ];
  const promotedByDomain=new Map(
    additionalPromotedRecords.map((row)=>[row.domain_id,row.observation])
  );
  const derivedContract=clone(robodebtApplied.derived_contract);
  derivedContract.domain_observations=derivedContract.domain_observations.map((row)=>
    promotedByDomain.has(row.domain_id)?clone(promotedByDomain.get(row.domain_id)):clone(row)
  );

  const preImplementationContract=clone(derivedContract);
  const robodebtIndex=preImplementationContract.domain_observations.findIndex(
    (row)=>row.domain_id===FIVE_DOMAIN_ROBODEBT_DOMAIN_ID
  );
  if(robodebtIndex<0)throw new Error('missing final Robodebt domain observation');
  preImplementationContract.domain_observations[robodebtIndex]=clone(
    robodebtApplied.before_observation
  );

  const finalRobodebt=derivedContract.domain_observations[robodebtIndex];
  if(!same(finalRobodebt,robodebtApplied.after_observation)){
    throw new Error('final Robodebt state differs from implementation receipt');
  }

  return {
    prior_promoted_records:priorPromotedRecords,
    robodebt_applied:robodebtApplied,
    additional_promoted_records:additionalPromotedRecords,
    all_promoted_records:allPromotedRecords,
    pre_implementation_contract:preImplementationContract,
    derived_contract:derivedContract
  };
}

export function summarizeFiveDomainClaimEvidenceReconciliation(inputs){
  const priorSummary=summarizeClaimEvidencePromotionAdjudication(
    inputs.officialPacket,
    inputs.priorAdjudication,
    inputs.contract
  );
  const applied=applyFiveDomainClaimEvidenceReconciliation(inputs);
  const additionalEvaluations=applied.additional_promoted_records.map((row)=>({
    receipt_id:row.receipt_id,
    domain_id:row.domain_id,
    jurisdiction:row.jurisdiction,
    ...evaluateObservation(row.observation,inputs.contract)
  }));
  const regression=evaluateRegression(applied.derived_contract);
  const effectiveJurisdictions=new Set(
    regression.domains
      .map((evaluation,index)=>({
        evaluation,
        observation:applied.derived_contract.domain_observations[index]
      }))
      .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed)
      .map(({observation})=>observation.jurisdiction)
      .filter((value)=>value&&value!=='unassigned')
  );

  return {
    audited_domains:regression.domain_observations_evaluated,
    prior_claim_evidence_admissible:priorSummary.claim_evidence_admissible,
    newly_adjudicated_receipts:applied.additional_promoted_records.length,
    newly_claim_evidence_admissible:additionalEvaluations.filter((row)=>row.claim_evidence_admissible).length,
    total_claim_evidence_admissible:regression.admissible_domain_evidence_records,
    total_repository_promotion_allowed:regression.domains.filter((row)=>row.repository_promotion_allowed).length,
    effective_answers:regression.effective_domain_answers,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    evidentiary_sufficiency:regression.evidentiary_sufficiency,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    additional_evaluations:additionalEvaluations,
    prior_summary:priorSummary,
    regression,
    applied
  };
}
