import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';
import {
  applyClaimEvidencePromotionAdjudication
} from './m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';

export const IMPLEMENTATION_GAP_PROBE_IDS=[
  'M05-IP-ADMIN-AU-ROBODEBT-PRE-ACTION-DURABILITY',
  'M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS',
  'M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY'
];

export const IMPLEMENTATION_GAP_RECEIPT_IDS=[
  'M05-RC-ADMIN-AU-ROBODEBT',
  'M05-RC-COERCION-NL-SYRI',
  'M05-RC-WORK-IT-FOODINHO'
];

export const IMPLEMENTATION_GAP_DOMAIN_IDS=[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01'
];

export const IMPLEMENTATION_GAP_JURISDICTIONS=['AU','NL','IT'];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeImplementationGapProbeLedger(packet,adjudication,contract,ledger){
  const applied=applyClaimEvidencePromotionAdjudication(packet,adjudication,contract);
  const promotedByReceipt=new Map(applied.promoted_records.map((row)=>[row.receipt_id,row]));
  const probes=(ledger.probes||[]).map((probe)=>{
    const promoted=promotedByReceipt.get(probe.receipt_id);
    if(!promoted)throw new Error(`missing promoted receipt ${probe.receipt_id}`);
    const evaluation=evaluateObservation(promoted.observation,contract);
    return {
      probe_id:probe.probe_id,
      receipt_id:probe.receipt_id,
      domain_id:probe.domain_id,
      jurisdiction:probe.jurisdiction,
      source_records:(probe.source_records||[]).length,
      target_deficits:clone(probe.target_deficits||[]),
      deficits_closed:clone(probe.probe_result?.deficits_closed||[]),
      deficits_preserved:clone(probe.probe_result?.deficits_preserved||[]),
      current_observation:clone(promoted.observation),
      source_observation:clone(promoted.source_observation),
      evaluation
    };
  });

  const regression=evaluateRegression(applied.derived_contract);
  const effectiveJurisdictions=new Set(
    regression.domains
      .map((evaluation,index)=>({evaluation,observation:applied.derived_contract.domain_observations[index]}))
      .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed)
      .map(({observation})=>observation.jurisdiction)
      .filter((value)=>value&&value!=='unassigned')
  );

  return {
    probe_records:probes.length,
    source_records:probes.reduce((sum,row)=>sum+row.source_records,0),
    deficit_entries_examined:probes.reduce((sum,row)=>sum+row.target_deficits.length,0),
    deficit_entries_closed:probes.reduce((sum,row)=>sum+row.deficits_closed.length,0),
    deficit_entries_preserved:probes.reduce((sum,row)=>sum+row.deficits_preserved.length,0),
    claim_evidence_admissible:probes.filter((row)=>row.evaluation.claim_evidence_admissible).length,
    repository_promotion_allowed:probes.filter((row)=>row.evaluation.repository_promotion_allowed).length,
    effective_answers:probes.filter((row)=>row.evaluation.answer_effective).length,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    issue_345_may_close:false,
    probes,
    regression,
    applied
  };
}
