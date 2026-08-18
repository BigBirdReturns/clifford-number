export const INTEL_PRE_ELIGIBILITY_FRONTIER_ID='M05-IF-VALUE-US-INTEL-REALIZATION';
export const INTEL_PRE_ELIGIBILITY_RECEIPT_ID='M05-RC-VALUE-US-INTEL-CHIPS-EQUITY';
export const INTEL_PRE_ELIGIBILITY_DOMAIN_ID='APC-VALUE-01';
export const INTEL_PRE_ELIGIBILITY_JURISDICTION='US';
export const INTEL_PRE_ELIGIBILITY_SOURCE_IDS=[
  'US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS',
  'US-INTEL-CHIPS-Q2-2026-10Q',
  'US-COMMERCE-INTEL-VALUATION-CLAIM'
];
export const INTEL_PRE_ELIGIBILITY_ROUTE_IDS=[
  'US-INTEL-MON-01',
  'US-INTEL-MON-02',
  'US-INTEL-MON-03',
  'US-INTEL-MON-04',
  'US-INTEL-MON-05',
  'US-INTEL-MON-06'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeIntelPreEligibilityRealizationMonitor(
  monitor,
  implementationFrontier,
  intelCandidate,
  latestSyriAcquisition
){
  const frontier=(implementationFrontier?.frontiers||[]).find(
    (row)=>row.frontier_id===INTEL_PRE_ELIGIBILITY_FRONTIER_ID
  );
  if(!frontier){
    throw new Error(`missing implementation frontier ${INTEL_PRE_ELIGIBILITY_FRONTIER_ID}`);
  }
  const target=monitor?.target||{};
  if(
    target.frontier_id!==INTEL_PRE_ELIGIBILITY_FRONTIER_ID||
    target.receipt_id!==INTEL_PRE_ELIGIBILITY_RECEIPT_ID||
    target.domain_id!==INTEL_PRE_ELIGIBILITY_DOMAIN_ID||
    target.jurisdiction!==INTEL_PRE_ELIGIBILITY_JURISDICTION
  ){
    throw new Error('Intel monitoring target drift');
  }

  const sources=Array.isArray(monitor?.source_records)?monitor.source_records:[];
  const routes=Array.isArray(monitor?.route_ledger)?monitor.route_ledger:[];
  const substantiveClasses=new Set([
    'substantive_date_gate_control',
    'substantive_operation_without_realization',
    'mark_to_market_only'
  ]);
  const substantiveRoutes=routes.filter((row)=>substantiveClasses.has(row.result_class));
  const boundedSearchRoutes=routes.filter(
    (row)=>row.result_class==='no_qualifying_event_located_in_bounded_search'
  );
  const qualifyingRoutes=routes.filter((row)=>row.qualifying_receipt_found===true);
  const observed=monitor?.observed_state||{};

  return {
    source_records:sources.length,
    new_source_records:sources.filter((row)=>row.newly_acquired===true).length,
    routes_executed:routes.length,
    routes_with_substantive_nonqualifying_content:substantiveRoutes.length,
    bounded_search_routes_without_qualifier:boundedSearchRoutes.length,
    routes_with_qualifying_receipt:qualifyingRoutes.length,
    standard_route_active:monitor?.monitoring_policy?.standard_route_active===true,
    bilateral_exception_public_record_located:
      monitor?.monitoring_policy?.bilateral_exception_public_record_located===true,
    completed_sale_observed:observed.completed_sale_observed===true,
    identified_federal_cash_receipt:observed.identified_federal_cash_receipt===true,
    transparent_public_or_affected_party_distribution:
      observed.transparent_public_or_affected_party_distribution===true,
    next_standard_scan_date:monitor?.finding?.next_standard_scan_date||null,
    issue_345_may_close:false,
    target_frontier:clone(frontier),
    intel_candidate_status:intelCandidate?.status||null,
    latest_controlled_acquisition_status:latestSyriAcquisition?.status||null,
    source_records_detail:clone(sources),
    route_ledger:clone(routes)
  };
}
