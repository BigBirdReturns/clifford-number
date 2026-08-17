export const ROBODEBT_DURABILITY_FRONTIER_ID='M05-IF-ADMIN-AU-ROBODEBT-DURABILITY';
export const ROBODEBT_DURABILITY_RECEIPT_ID='M05-RC-ADMIN-AU-ROBODEBT';
export const ROBODEBT_DURABILITY_DOMAIN_ID='APC-ADMIN-01';
export const ROBODEBT_DURABILITY_JURISDICTION='AU';
export const ROBODEBT_DURABILITY_DIMENSION='durability';

export const ROBODEBT_DURABILITY_SOURCE_IDS=[
  'AU-ROBODEBT-SA-ANNUAL-REPORT-2024-25',
  'AU-ROBODEBT-ANAO-DEBT-AUDIT-POTENTIAL-2027-29',
  'AU-ROBODEBT-DEBT-SUPPORT-2026'
];

export const ROBODEBT_DURABILITY_ROUTE_IDS=[
  'AU-RD-DUR-01',
  'AU-RD-DUR-02',
  'AU-RD-DUR-03',
  'AU-RD-DUR-04',
  'AU-RD-DUR-05',
  'AU-RD-DUR-06'
];

export const ROBODEBT_DURABILITY_SUBSTANTIVE_ROUTE_CLASSES=[
  'substantive_nonqualifying_content',
  'future_audit_route_only',
  'inherited_implementation_statement_only'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeRobodebtDurabilityPublicRecordAcquisition(
  acquisition,
  implementationFrontier,
  priorImplementationReceipt
){
  const sourceRecords=Array.isArray(acquisition?.source_records)
    ?acquisition.source_records
    :[];
  const routeLedger=Array.isArray(acquisition?.route_ledger)
    ?acquisition.route_ledger
    :[];
  const targetFrontier=(implementationFrontier?.frontiers||[]).find(
    (row)=>row.frontier_id===ROBODEBT_DURABILITY_FRONTIER_ID
  );
  if(!targetFrontier){
    throw new Error(`missing implementation frontier ${ROBODEBT_DURABILITY_FRONTIER_ID}`);
  }
  const target=acquisition?.target||{};
  if(
    target.frontier_id!==ROBODEBT_DURABILITY_FRONTIER_ID||
    target.receipt_id!==ROBODEBT_DURABILITY_RECEIPT_ID||
    target.domain_id!==ROBODEBT_DURABILITY_DOMAIN_ID||
    target.jurisdiction!==ROBODEBT_DURABILITY_JURISDICTION||
    target.dimension!==ROBODEBT_DURABILITY_DIMENSION
  ){
    throw new Error('Robodebt durability acquisition target drift');
  }

  const qualifyingSources=sourceRecords.filter(
    (row)=>row.qualifies_as_durability_receipt===true
  );
  const substantiveRoutes=routeLedger.filter(
    (row)=>ROBODEBT_DURABILITY_SUBSTANTIVE_ROUTE_CLASSES.includes(row.result_class)
  );
  const qualifyingRoutes=routeLedger.filter(
    (row)=>row.qualifying_receipt_found===true
  );
  const priorTarget=priorImplementationReceipt?.target||{};
  const preActionTiming=
    priorTarget.receipt_id===ROBODEBT_DURABILITY_RECEIPT_ID&&
    priorTarget.dimension==='pre_action_timing'
      ?priorTarget.after
      :targetFrontier.current_dimension_state?.pre_action_timing;
  const durability=target.after;

  return {
    source_records:sourceRecords.length,
    new_source_records:sourceRecords.filter(
      (row)=>row.source_role!=='inherited_current_implementation_without_durability'
    ).length,
    qualifying_durability_receipts:qualifyingSources.length,
    routes_executed:routeLedger.length,
    routes_with_substantive_content:substantiveRoutes.length,
    routes_with_qualifying_receipt:qualifyingRoutes.length,
    robodebt_pre_action_timing:preActionTiming,
    robodebt_durability:durability,
    deficits_closed:clone(acquisition?.finding?.deficits_closed||[]),
    deficits_preserved:clone(acquisition?.finding?.deficits_preserved||[]),
    answer_changes_authorized:acquisition?.finding?.answer_changes_authorized===true,
    repository_effect:acquisition?.finding?.repository_effect||'none',
    issue_345_may_close:false,
    source_records_detail:clone(sourceRecords),
    route_ledger:clone(routeLedger),
    target_frontier:clone(targetFrontier)
  };
}
