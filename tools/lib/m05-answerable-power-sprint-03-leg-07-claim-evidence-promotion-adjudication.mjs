import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';

export const CLAIM_PROMOTION_RECEIPT_IDS=[
  'M05-RC-ADMIN-AU-ROBODEBT',
  'M05-RC-COERCION-NL-SYRI',
  'M05-RC-WORK-IT-FOODINHO'
];

export const CLAIM_PROMOTION_DOMAIN_IDS=[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01'
];

export const CLAIM_PROMOTION_JURISDICTIONS=['AU','NL','IT'];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function applyClaimEvidencePromotionAdjudication(packet,adjudication,contract){
  const records=Array.isArray(packet?.records)?packet.records:[];
  const decisions=Array.isArray(adjudication?.adjudications)?adjudication.adjudications:[];
  const recordsById=new Map(records.map((row)=>[row.receipt_id,row]));
  const decisionsById=new Map(decisions.map((row)=>[row.receipt_id,row]));

  const promotedRecords=CLAIM_PROMOTION_RECEIPT_IDS.map((receiptId)=>{
    const source=recordsById.get(receiptId);
    const decision=decisionsById.get(receiptId);
    if(!source)throw new Error(`missing source candidate ${receiptId}`);
    if(!decision)throw new Error(`missing promotion adjudication ${receiptId}`);

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
      preserved_deficits:clone(decision.preserved_deficits)
    };
  });

  const promotedByDomain=new Map(promotedRecords.map((row)=>[row.domain_id,row.observation]));
  const derivedContract=clone(contract);
  derivedContract.domain_observations=contract.domain_observations.map((row)=>
    promotedByDomain.has(row.domain_id)?clone(promotedByDomain.get(row.domain_id)):clone(row)
  );

  return {
    promoted_records:promotedRecords,
    derived_contract:derivedContract
  };
}

export function summarizeClaimEvidencePromotionAdjudication(packet,adjudication,contract){
  const applied=applyClaimEvidencePromotionAdjudication(packet,adjudication,contract);
  const candidateEvaluations=applied.promoted_records.map((row)=>({
    receipt_id:row.receipt_id,
    domain_id:row.domain_id,
    jurisdiction:row.jurisdiction,
    ...evaluateObservation(row.observation,contract)
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
    adjudicated_receipts:applied.promoted_records.length,
    claim_evidence_admissible:candidateEvaluations.filter((row)=>row.claim_evidence_admissible).length,
    repository_promotion_allowed:candidateEvaluations.filter((row)=>row.repository_promotion_allowed).length,
    effective_answers:candidateEvaluations.filter((row)=>row.answer_effective).length,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    evidentiary_sufficiency:regression.evidentiary_sufficiency,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    candidate_evaluations:candidateEvaluations,
    regression,
    applied
  };
}
