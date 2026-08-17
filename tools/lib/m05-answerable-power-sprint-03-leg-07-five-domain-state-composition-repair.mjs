import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';
import {
  applyRobodebtPreActionImplementationReceipt,
  summarizeRobodebtPreActionImplementationReceipt
} from './m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs';
import {
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,
  summarizeFiveDomainClaimEvidenceReconciliation
} from './m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

export const FIVE_DOMAIN_STATE_REPAIR_RECEIPT_ID='M05-RC-ADMIN-AU-ROBODEBT';
export const FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID='APC-ADMIN-01';
export const FIVE_DOMAIN_STATE_REPAIR_JURISDICTION='AU';
export const FIVE_DOMAIN_STATE_REPAIR_DIMENSION='pre_action_timing';

const clone=(value)=>JSON.parse(JSON.stringify(value));

const additionalSourceReceipts=(intelCandidate,hfuCandidate)=>[
  intelCandidate?.receipt,
  hfuCandidate?.receipt
];

const observationForDomain=(contract,domainId)=>
  contract.domain_observations.find((row)=>row.domain_id===domainId);

export function applyFiveDomainStateCompositionRepair({
  officialPacket,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  fiveDomainReconciliation,
  intelCandidate,
  hfuCandidate
}){
  const fiveDomainBaseline=summarizeFiveDomainClaimEvidenceReconciliation({
    officialPacket,
    priorAdjudication,
    contract,
    intelCandidate,
    hfuCandidate,
    reconciliation:fiveDomainReconciliation
  });
  const robodebtApplied=applyRobodebtPreActionImplementationReceipt(
    officialPacket,
    priorAdjudication,
    robodebtImplementationReceipt,
    contract
  );

  const receipts=additionalSourceReceipts(intelCandidate,hfuCandidate);
  const receiptsById=new Map(receipts.map((row)=>[row?.receipt_id,row]));
  const decisions=Array.isArray(fiveDomainReconciliation?.adjudications)
    ?fiveDomainReconciliation.adjudications
    :[];
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
      preserved_deficits:clone(decision.preserved_deficits||[]),
      guarded_nonfindings:clone(decision.guarded_nonfindings||{})
    };
  });

  const finalContract=clone(robodebtApplied.derived_contract);
  const promotedByDomain=new Map(
    additionalPromotedRecords.map((row)=>[row.domain_id,row.observation])
  );
  finalContract.domain_observations=finalContract.domain_observations.map((row)=>
    promotedByDomain.has(row.domain_id)
      ?clone(promotedByDomain.get(row.domain_id))
      :clone(row)
  );

  return {
    five_domain_baseline:fiveDomainBaseline,
    robodebt_applied:robodebtApplied,
    additional_promoted_records:additionalPromotedRecords,
    all_promoted_records:[
      ...robodebtApplied.promoted_records,
      ...additionalPromotedRecords
    ],
    final_contract:finalContract
  };
}

export function summarizeFiveDomainStateCompositionRepair(inputs){
  const robodebtSummary=summarizeRobodebtPreActionImplementationReceipt(
    inputs.officialPacket,
    inputs.priorAdjudication,
    inputs.robodebtImplementationReceipt,
    inputs.contract
  );
  const applied=applyFiveDomainStateCompositionRepair(inputs);
  const regression=evaluateRegression(applied.final_contract);
  const additionalEvaluations=applied.additional_promoted_records.map((row)=>({
    receipt_id:row.receipt_id,
    domain_id:row.domain_id,
    jurisdiction:row.jurisdiction,
    ...evaluateObservation(row.observation,inputs.contract)
  }));

  const baselineRobodebt=observationForDomain(
    applied.five_domain_baseline.applied.derived_contract,
    FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID
  );
  const canonicalRobodebt=robodebtSummary.applied.after_observation;
  const finalRobodebt=observationForDomain(
    applied.final_contract,
    FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID
  );
  if(!baselineRobodebt)throw new Error('missing five-domain baseline Robodebt observation');
  if(!canonicalRobodebt)throw new Error('missing canonical Robodebt implementation observation');
  if(!finalRobodebt)throw new Error('missing final Robodebt observation');

  const effectiveJurisdictions=new Set(
    regression.domains
      .map((evaluation,index)=>({
        evaluation,
        observation:applied.final_contract.domain_observations[index]
      }))
      .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed)
      .map(({observation})=>observation.jurisdiction)
      .filter((value)=>value&&value!=='unassigned')
  );

  const beforeValue=baselineRobodebt.answer?.dimensions?.[FIVE_DOMAIN_STATE_REPAIR_DIMENSION];
  const canonicalValue=canonicalRobodebt.answer?.dimensions?.[FIVE_DOMAIN_STATE_REPAIR_DIMENSION];
  const finalValue=finalRobodebt.answer?.dimensions?.[FIVE_DOMAIN_STATE_REPAIR_DIMENSION];

  return {
    audited_domains:regression.domain_observations_evaluated,
    claim_evidence_admissible:regression.admissible_domain_evidence_records,
    repository_promotion_allowed:regression.domains.filter(
      (row)=>row.repository_promotion_allowed
    ).length,
    advanced_answer_dimensions:
      beforeValue===false&&canonicalValue===true&&finalValue===true?1:0,
    five_domain_baseline_robodebt_pre_action_timing:beforeValue,
    canonical_robodebt_pre_action_timing:canonicalValue,
    robodebt_pre_action_timing:finalValue,
    robodebt_durability:finalRobodebt.answer?.dimensions?.durability,
    effective_answers:regression.effective_domain_answers,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    evidentiary_sufficiency:regression.evidentiary_sufficiency,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    additional_evaluations:additionalEvaluations,
    robodebt_summary:robodebtSummary,
    regression,
    applied
  };
}
