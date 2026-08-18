export const SYRI_ACCESS_FRONTIER_ID='M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS';
export const SYRI_ACCESS_RECEIPT_ID='M05-RC-COERCION-NL-SYRI';
export const SYRI_ACCESS_DOMAIN_ID='APC-COERCION-01';
export const SYRI_ACCESS_JURISDICTION='NL';
export const SYRI_ACCESS_DIMENSION='evidence_access';
export const SYRI_ACCESS_PROBE_ID='M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS';

export const SYRI_ACCESS_SOURCE_IDS=[
  'NL-SYRI-COURT-JUDGMENT-2020',
  'NL-SYRI-REGISTER-ACCESS-RULE-2014',
  'NL-SYRI-DATA-DESTRUCTION-ANSWERS-2022',
  'NL-SYRI-RISK-MODEL-WOB-2023',
  'NL-SZW-CURRENT-PRIVACY-RIGHTS-ROUTE'
];

export const SYRI_ACCESS_ROUTE_IDS=[
  'NL-SYRI-ACCESS-01',
  'NL-SYRI-ACCESS-02',
  'NL-SYRI-ACCESS-03',
  'NL-SYRI-ACCESS-04',
  'NL-SYRI-ACCESS-05',
  'NL-SYRI-ACCESS-06'
];

export const SYRI_ACCESS_SUBSTANTIVE_ROUTE_CLASSES=[
  'system_level_adjudication_without_subject_access',
  'formal_access_route_only',
  'destruction_and_no_decision_record',
  'system_level_model_disclosure',
  'current_general_access_route'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeSyriSubjectAccessPublicRecordAcquisition(
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
    (row)=>row.frontier_id===SYRI_ACCESS_FRONTIER_ID
  );
  if(!targetFrontier){
    throw new Error(`missing implementation frontier ${SYRI_ACCESS_FRONTIER_ID}`);
  }
  const targetProbe=(implementationGapLedger?.probes||[]).find(
    (row)=>row.probe_id===SYRI_ACCESS_PROBE_ID
  );
  if(!targetProbe){
    throw new Error(`missing implementation probe ${SYRI_ACCESS_PROBE_ID}`);
  }
  const sourceCandidate=(officialReceiptPacket?.records||[]).find(
    (row)=>row.receipt_id===SYRI_ACCESS_RECEIPT_ID
  );
  if(!sourceCandidate){
    throw new Error(`missing official candidate ${SYRI_ACCESS_RECEIPT_ID}`);
  }

  const target=acquisition?.target||{};
  if(
    target.frontier_id!==SYRI_ACCESS_FRONTIER_ID||
    target.receipt_id!==SYRI_ACCESS_RECEIPT_ID||
    target.domain_id!==SYRI_ACCESS_DOMAIN_ID||
    target.jurisdiction!==SYRI_ACCESS_JURISDICTION||
    target.dimension!==SYRI_ACCESS_DIMENSION
  ){
    throw new Error('SyRI subject-access acquisition target drift');
  }

  const qualifyingSources=sourceRecords.filter(
    (row)=>row.qualifies_as_evidence_access_receipt===true
  );
  const substantiveRoutes=routeLedger.filter(
    (row)=>SYRI_ACCESS_SUBSTANTIVE_ROUTE_CLASSES.includes(row.result_class)
  );
  const qualifyingRoutes=routeLedger.filter(
    (row)=>row.qualifying_receipt_found===true
  );
  const wider=implementationFrontier?.expected_result||{};

  return {
    source_records:sourceRecords.length,
    new_source_records:sourceRecords.filter((row)=>row.newly_acquired===true).length,
    routes_executed:routeLedger.length,
    routes_with_substantive_content:substantiveRoutes.length,
    routes_with_qualifying_receipt:qualifyingRoutes.length,
    qualifying_evidence_access_receipts:qualifyingSources.length,
    syri_evidence_access:target.after,
    syri_composed_durable_answer:
      targetFrontier.current_dimension_state?.composed_durable_answer===true,
    candidate_evidence_records:wider.candidate_evidence_records,
    repository_promotions:wider.repository_promotion_allowed,
    advanced_answer_dimensions:wider.advanced_answer_dimensions,
    effective_answers:wider.effective_answers,
    qualifying_jurisdictions:wider.qualifying_jurisdictions,
    answer_effectiveness:wider.answer_effectiveness,
    cross_domain_regression_completed:wider.cross_domain_regression_completed,
    issue_345_may_close:false,
    deficits_closed:clone(acquisition?.finding?.deficits_closed||[]),
    deficits_preserved:clone(acquisition?.finding?.deficits_preserved||[]),
    answer_changes_authorized:acquisition?.finding?.answer_changes_authorized===true,
    repository_effect:acquisition?.finding?.repository_effect||'none',
    graph_effect:acquisition?.finding?.graph_effect||'none',
    source_records_detail:clone(sourceRecords),
    route_ledger:clone(routeLedger),
    target_frontier:clone(targetFrontier),
    target_probe:clone(targetProbe),
    source_candidate:clone(sourceCandidate)
  };
}
