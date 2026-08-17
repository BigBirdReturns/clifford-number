import {
  evaluateObservation,
  evaluateRegression
} from './m05-source-health-evidence-state-regression.mjs';
import {
  applyFiveDomainClaimEvidenceReconciliation
} from './m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

export const IMPLEMENTATION_FRONTIER_IDS=[
  'M05-IF-ADMIN-AU-ROBODEBT-DURABILITY',
  'M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS',
  'M05-IF-WORK-IT-FOODINHO-COMPLIANCE',
  'M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY',
  'M05-IF-VALUE-US-INTEL-REALIZATION'
];

export const IMPLEMENTATION_FRONTIER_RECEIPT_IDS=[
  'M05-RC-ADMIN-AU-ROBODEBT',
  'M05-RC-COERCION-NL-SYRI',
  'M05-RC-WORK-IT-FOODINHO',
  'M05-RC-EXIT-UK-HFU-SHARE',
  'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY'
];

export const IMPLEMENTATION_FRONTIER_DOMAIN_IDS=[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
];

export const IMPLEMENTATION_FRONTIER_JURISDICTIONS=['AU','NL','IT','UK','US'];

export const IMPLEMENTATION_ROUTE_CLASSES=[
  'active_public_record_acquisition',
  'controlled_subject_or_archival_acquisition',
  'future_time_gated_monitoring'
];

const ROBODEBT_DOMAIN_ID='APC-ADMIN-01';
const ROBODEBT_DIMENSION='pre_action_timing';
const clone=(value)=>JSON.parse(JSON.stringify(value));

export function applyFiveDomainImplementationFrontier({
  officialPacket,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation,
  robodebtReceipt,
  legacyLedger,
  frontier
}){
  const reconciled=applyFiveDomainClaimEvidenceReconciliation({
    officialPacket,
    priorAdjudication,
    contract,
    intelCandidate,
    hfuCandidate,
    reconciliation
  });
  const derivedContract=clone(reconciled.derived_contract);
  const robodebtIndex=derivedContract.domain_observations.findIndex(
    (row)=>row.domain_id===ROBODEBT_DOMAIN_ID
  );
  if(robodebtIndex<0)throw new Error('missing Robodebt observation');

  const beforeRobodebt=clone(derivedContract.domain_observations[robodebtIndex]);
  if(beforeRobodebt.answer?.dimensions?.[ROBODEBT_DIMENSION]!==false){
    throw new Error('Robodebt pre-action dimension is not false before implementation receipt');
  }
  const target=robodebtReceipt?.target||{};
  if(
    target.receipt_id!=='M05-RC-ADMIN-AU-ROBODEBT'||
    target.domain_id!==ROBODEBT_DOMAIN_ID||
    target.jurisdiction!=='AU'||
    target.dimension!==ROBODEBT_DIMENSION||
    target.before!==false||
    target.after!==true
  ){
    throw new Error('Robodebt implementation target drift');
  }
  const afterRobodebt=clone(beforeRobodebt);
  afterRobodebt.answer.dimensions[ROBODEBT_DIMENSION]=true;
  afterRobodebt.expected={
    claim_evidence_admissible:true,
    answer_effective:false
  };
  derivedContract.domain_observations[robodebtIndex]=afterRobodebt;

  const observationsByDomain=new Map(
    derivedContract.domain_observations.map((row)=>[row.domain_id,row])
  );
  const legacyProbesById=new Map(
    (legacyLedger?.probes||[]).map((row)=>[row.probe_id,row])
  );
  const frontierRows=(frontier?.frontiers||[]).map((row)=>{
    const observation=observationsByDomain.get(row.domain_id);
    if(!observation)throw new Error(`missing domain observation ${row.domain_id}`);
    const inheritedProbe=row.inherited_probe_id
      ?legacyProbesById.get(row.inherited_probe_id)
      :null;
    if(row.inherited_probe_id&&!inheritedProbe){
      throw new Error(`missing inherited probe ${row.inherited_probe_id}`);
    }
    return {
      frontier_id:row.frontier_id,
      receipt_id:row.receipt_id,
      domain_id:row.domain_id,
      jurisdiction:row.jurisdiction,
      inherited_probe_id:row.inherited_probe_id,
      route_class:row.route_class,
      activation_state:row.activation_state,
      execution_wave:row.execution_wave,
      preserved_deficits:clone(row.preserved_deficits||[]),
      required_receipts:clone(row.required_receipts||[]),
      current_dimension_state:clone(row.current_dimension_state||{}),
      observation:clone(observation),
      evaluation:evaluateObservation(observation,contract),
      inherited_probe:inheritedProbe?clone(inheritedProbe):null
    };
  });

  return {
    before_robodebt_observation:beforeRobodebt,
    after_robodebt_observation:afterRobodebt,
    derived_contract:derivedContract,
    reconciled_records:reconciled.all_promoted_records,
    frontier_rows:frontierRows
  };
}

export function summarizeFiveDomainImplementationFrontier(inputs){
  const applied=applyFiveDomainImplementationFrontier(inputs);
  const regression=evaluateRegression(applied.derived_contract);
  const frontiers=applied.frontier_rows;
  const routeCounts=Object.fromEntries(
    IMPLEMENTATION_ROUTE_CLASSES.map((routeClass)=>[
      routeClass,
      frontiers.filter((row)=>row.route_class===routeClass).length
    ])
  );
  const effectiveJurisdictions=new Set(
    regression.domains
      .map((evaluation,index)=>({
        evaluation,
        observation:applied.derived_contract.domain_observations[index]
      }))
      .filter(({evaluation})=>
        evaluation.answer_effective&&evaluation.repository_promotion_allowed
      )
      .map(({observation})=>observation.jurisdiction)
      .filter((value)=>value&&value!=='unassigned')
  );

  return {
    frontier_records:frontiers.length,
    inherited_probe_records:frontiers.filter((row)=>row.inherited_probe_id).length,
    new_frontier_records:frontiers.filter((row)=>!row.inherited_probe_id).length,
    route_control_sources:(inputs.frontier?.route_control_sources||[]).length,
    active_public_record_frontiers:
      routeCounts.active_public_record_acquisition||0,
    controlled_subject_or_archival_frontiers:
      routeCounts.controlled_subject_or_archival_acquisition||0,
    future_time_gated_frontiers:
      routeCounts.future_time_gated_monitoring||0,
    candidate_evidence_records:regression.admissible_domain_evidence_records,
    repository_promotion_allowed:regression.domains.filter(
      (row)=>row.repository_promotion_allowed
    ).length,
    advanced_answer_dimensions:
      applied.before_robodebt_observation.answer.dimensions.pre_action_timing===false&&
      applied.after_robodebt_observation.answer.dimensions.pre_action_timing===true
        ?1
        :0,
    effective_answers:regression.effective_domain_answers,
    qualifying_jurisdictions:effectiveJurisdictions.size,
    evidentiary_sufficiency:regression.evidentiary_sufficiency,
    answer_effectiveness:regression.answer_effectiveness,
    cross_domain_regression_completed:regression.cross_domain_regression_completed,
    issue_345_may_close:false,
    route_counts:routeCounts,
    frontiers,
    regression,
    applied
  };
}
