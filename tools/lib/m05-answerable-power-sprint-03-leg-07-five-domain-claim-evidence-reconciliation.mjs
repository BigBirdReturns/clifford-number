import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';
import {
  applyClaimEvidencePromotionAdjudication,
  summarizeClaimEvidencePromotionAdjudication
} from './m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';

export const FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS=[
  'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',
  'M05-RC-EXIT-UK-HFU-SHARE'
];

export const FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS=[
  'APC-VALUE-01',
  'APC-EXIT-01'
];

export const FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS=['US','UK'];

const clone=(value)=>JSON.parse(JSON.stringify(value));

const candidateReceipts=(intelCandidate,hfuCandidate)=>[
  intelCandidate?.receipt,
  hfuCandidate?.receipt
];

export function applyFiveDomainClaimEvidenceReconciliation({
  officialPacket,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation
}){
  const priorApplied=applyClaimEvidencePromotionAdjudication(
    officialPacket,
    priorAdjudication,
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

  const allPromotedRecords=[
    ...priorApplied.promoted_records,
    ...additionalPromotedRecords
  ];
  const promotedByDomain=new Map(allPromotedRecords.map((row)=>[row.domain_id,row.observation]));
  const derivedContract=clone(contract);
  derivedContract.domain_observations=contract.domain_observations.map((row)=>
    promotedByDomain.has(row.domain_id)?clone(promotedByDomain.get(row.domain_id)):clone(row)
  );

  return {
    prior_promoted_records:priorApplied.promoted_records,
    additional_promoted_records:additionalPromotedRecords,
    all_promoted_records:allPromotedRecords,
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
