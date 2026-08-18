export const FOODINHO_COMPLIANCE_FRONTIER_ID='M05-IF-WORK-IT-FOODINHO-COMPLIANCE';
export const FOODINHO_COMPLIANCE_RECEIPT_ID='M05-RC-WORK-IT-FOODINHO';
export const FOODINHO_COMPLIANCE_DOMAIN_ID='APC-WORK-01';
export const FOODINHO_COMPLIANCE_JURISDICTION='IT';

export const FOODINHO_COMPLIANCE_SOURCE_IDS=[
  'IT-FOODINHO-2024-ORDER',
  'IT-FOODINHO-2024-EXTENSION',
  'IT-GARANTE-ANNUAL-REPORT-2025'
];

export const FOODINHO_COMPLIANCE_ROUTE_IDS=[
  'IT-FD-COMP-01',
  'IT-FD-COMP-02',
  'IT-FD-COMP-03',
  'IT-FD-COMP-04',
  'IT-FD-COMP-05'
];

export const FOODINHO_COMPLIANCE_SUBSTANTIVE_ROUTE_CLASSES=[
  'binding_order_only',
  'conditional_extension_only',
  'historical_enforcement_chain_only',
  'annual_oversight_without_foodinho_specific_entry'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeFoodinhoCompliancePublicRecordAcquisition(
  acquisition,
  implementationFrontier,
  implementationGapLedger,
  officialReceiptPacket
){
  const sourceRecords=Array.isArray(acquisition?.source_records)
    ?acquisition.source_records
    :[];
  const routeLedger=Array.isArray(acquisition?.route_ledger)
    ?acquisition.route_ledger
    :[];
  const targetFrontier=(implementationFrontier?.frontiers||[]).find(
    (row)=>row.frontier_id===FOODINHO_COMPLIANCE_FRONTIER_ID
  );
  if(!targetFrontier){
    throw new Error(`missing implementation frontier ${FOODINHO_COMPLIANCE_FRONTIER_ID}`);
  }
  const targetProbe=(implementationGapLedger?.probes||[]).find(
    (row)=>row.receipt_id===FOODINHO_COMPLIANCE_RECEIPT_ID
  );
  if(!targetProbe){
    throw new Error(`missing implementation probe ${FOODINHO_COMPLIANCE_RECEIPT_ID}`);
  }
  const targetRecord=(officialReceiptPacket?.records||[]).find(
    (row)=>row.receipt_id===FOODINHO_COMPLIANCE_RECEIPT_ID
  );
  if(!targetRecord){
    throw new Error(`missing official receipt ${FOODINHO_COMPLIANCE_RECEIPT_ID}`);
  }

  const target=acquisition?.target||{};
  if(
    target.frontier_id!==FOODINHO_COMPLIANCE_FRONTIER_ID||
    target.receipt_id!==FOODINHO_COMPLIANCE_RECEIPT_ID||
    target.domain_id!==FOODINHO_COMPLIANCE_DOMAIN_ID||
    target.jurisdiction!==FOODINHO_COMPLIANCE_JURISDICTION
  ){
    throw new Error('Foodinho compliance acquisition target drift');
  }

  const qualifyingSources=sourceRecords.filter(
    (row)=>row.qualifies_as_compliance_receipt===true
  );
  const substantiveRoutes=routeLedger.filter(
    (row)=>FOODINHO_COMPLIANCE_SUBSTANTIVE_ROUTE_CLASSES.includes(row.result_class)
  );
  const qualifyingRoutes=routeLedger.filter(
    (row)=>row.qualifying_receipt_found===true
  );
  const widerState=implementationFrontier?.expected_result||{};

  return {
    source_records:sourceRecords.length,
    new_source_records:sourceRecords.filter((row)=>row.newly_acquired===true).length,
    qualifying_compliance_receipts:qualifyingSources.length,
    routes_executed:routeLedger.length,
    routes_with_substantive_content:substantiveRoutes.length,
    routes_with_qualifying_receipt:qualifyingRoutes.length,
    foodinho_pre_action_timing:
      target.dimensions?.pre_action_timing?.after,
    foodinho_durability:
      target.dimensions?.durability?.after,
    deficits_closed:(acquisition?.finding?.deficits_closed||[]).length,
    deficits_preserved:(acquisition?.finding?.deficits_preserved||[]).length,
    candidate_evidence_records:widerState.candidate_evidence_records,
    repository_promotion_allowed:widerState.repository_promotion_allowed,
    advanced_answer_dimensions:widerState.advanced_answer_dimensions,
    effective_answers:widerState.effective_answers,
    qualifying_jurisdictions:widerState.qualifying_jurisdictions,
    answer_effectiveness:widerState.answer_effectiveness,
    cross_domain_regression_completed:widerState.cross_domain_regression_completed,
    issue_345_may_close:false,
    source_records_detail:clone(sourceRecords),
    route_ledger:clone(routeLedger),
    target_frontier:clone(targetFrontier),
    target_probe:clone(targetProbe),
    target_record:clone(targetRecord)
  };
}
