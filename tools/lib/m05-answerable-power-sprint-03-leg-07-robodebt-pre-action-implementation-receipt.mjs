import {
  applyClaimEvidencePromotionAdjudication
} from './m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';
import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';

export const ROBODEBT_IMPLEMENTATION_RECEIPT_ID='M05-RC-ADMIN-AU-ROBODEBT';
export const ROBODEBT_IMPLEMENTATION_DOMAIN_ID='APC-ADMIN-01';
export const ROBODEBT_IMPLEMENTATION_JURISDICTION='AU';
export const ROBODEBT_IMPLEMENTATION_DIMENSION='pre_action_timing';

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function applyRobodebtPreActionImplementationReceipt(
  packet,
  promotionAdjudication,
  implementationReceipt,
  contract
){
  const promoted=applyClaimEvidencePromotionAdjudication(
    packet,
    promotionAdjudication,
    contract
  );
  const derivedContract=clone(promoted.derived_contract);
  const index=derivedContract.domain_observations.findIndex(
    (row)=>row.domain_id===ROBODEBT_IMPLEMENTATION_DOMAIN_ID
  );
  if(index<0)throw new Error('missing Robodebt domain observation');

  const beforeObservation=clone(derivedContract.domain_observations[index]);
  if(beforeObservation.answer?.dimensions?.[ROBODEBT_IMPLEMENTATION_DIMENSION]!==false){
    throw new Error('Robodebt pre-action dimension is not closed before implementation receipt');
  }

  const target=implementationReceipt?.target||{};
  if(target.receipt_id!==ROBODEBT_IMPLEMENTATION_RECEIPT_ID){
    throw new Error('Robodebt implementation receipt identity drift');
  }
  if(target.domain_id!==ROBODEBT_IMPLEMENTATION_DOMAIN_ID){
    throw new Error('Robodebt implementation domain drift');
  }
  if(target.jurisdiction!==ROBODEBT_IMPLEMENTATION_JURISDICTION){
    throw new Error('Robodebt implementation jurisdiction drift');
  }
  if(target.dimension!==ROBODEBT_IMPLEMENTATION_DIMENSION){
    throw new Error('Robodebt implementation dimension drift');
  }

  const afterObservation=clone(beforeObservation);
  afterObservation.answer.dimensions[ROBODEBT_IMPLEMENTATION_DIMENSION]=target.after;
  afterObservation.expected={
    claim_evidence_admissible:true,
    answer_effective:false
  };
  derivedContract.domain_observations[index]=afterObservation;

  return {
    before_observation:beforeObservation,
    after_observation:afterObservation,
    derived_contract:derivedContract,
    promoted_records:promoted.promoted_records
  };
}

export function summarizeRobodebtPreActionImplementationReceipt(
  packet,
  promotionAdjudication,
  implementationReceipt,
  contract
){
  const applied=applyRobodebtPreActionImplementationReceipt(
    packet,
    promotionAdjudication,
    implementationReceipt,
    contract
  );
  const targetEvaluation=evaluateObservation(applied.after_observation,contract);
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
    claim_evidence_admissible:regression.admissible_domain_evidence_records,
    repository_promotion_allowed:regression.domains.filter(
      (row)=>row.repository_promotion_allowed
    ).length,
    advanced_answer_dimensions:
      applied.before_observation.answer.dimensions[ROBODEBT_IMPLEMENTATION_DIMENSION]===false&&
      applied.after_observation.answer.dimensions[ROBODEBT_IMPLEMENTATION_DIMENSION]===true
        ?1
        :0,
    robodebt_pre_action_timing:
      applied.after_observation.answer.dimensions.pre_action_timing,
    robodebt_durability:
      applied.after_observation.answer.dimensions.durability,
    effective_answers:regression.effective_domain_answers,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    evidentiary_sufficiency:regression.evidentiary_sufficiency,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    target_evaluation:targetEvaluation,
    regression,
    applied
  };
}
