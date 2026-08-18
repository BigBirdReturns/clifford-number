export const INTEL_REALIZATION_FRONTIER_ID='M05-IF-VALUE-US-INTEL-REALIZATION';
export const INTEL_REALIZATION_RECEIPT_ID='M05-RC-VALUE-US-INTEL-CHIPS-EQUITY';
export const INTEL_REALIZATION_DOMAIN_ID='APC-VALUE-01';
export const INTEL_REALIZATION_JURISDICTION='US';
export const INTEL_REALIZATION_ORDINARY_GATE='2026-08-27T00:00:00Z';

export const INTEL_REALIZATION_ROUTE_IDS=[
  'US-INTEL-REALIZATION-01',
  'US-INTEL-REALIZATION-02',
  'US-INTEL-REALIZATION-03',
  'US-INTEL-REALIZATION-04',
  'US-INTEL-REALIZATION-05'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));
const parseTime=(value,label)=>{
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed))throw new Error(`${label} is not a valid timestamp`);
  return parsed;
};
const recursiveValues=(value,key,found=[])=>{
  if(Array.isArray(value)){
    for(const row of value)recursiveValues(row,key,found);
    return found;
  }
  if(value&&typeof value==='object'){
    for(const [entryKey,entryValue] of Object.entries(value)){
      if(entryKey===key)found.push(entryValue);
      recursiveValues(entryValue,key,found);
    }
  }
  return found;
};

export function shouldActivateIntelRealizationAcquisition(
  monitor,
  referenceTime=new Date()
){
  const reference=referenceTime instanceof Date
    ?referenceTime.getTime()
    :parseTime(referenceTime,'reference time');
  const gate=parseTime(
    monitor?.target?.ordinary_gate_utc||INTEL_REALIZATION_ORDINARY_GATE,
    'ordinary gate'
  );
  return reference>=gate||monitor?.target?.bilateral_exception_receipt_located===true;
}

export function summarizeIntelRealizationDateGateMonitor(
  monitor,
  implementationFrontier,
  intelCandidate,
  referenceTime=`${monitor?.as_of||'1970-01-01'}T23:59:59Z`
){
  const target=monitor?.target||{};
  if(
    target.frontier_id!==INTEL_REALIZATION_FRONTIER_ID||
    target.receipt_id!==INTEL_REALIZATION_RECEIPT_ID||
    target.domain_id!==INTEL_REALIZATION_DOMAIN_ID||
    target.jurisdiction!==INTEL_REALIZATION_JURISDICTION||
    target.route_class!=='future_time_gated_monitoring'
  ){
    throw new Error('Intel realization monitor target drift');
  }

  const frontierRow=(implementationFrontier?.frontiers||[]).find(
    (row)=>row.frontier_id===INTEL_REALIZATION_FRONTIER_ID
  );
  if(!frontierRow)throw new Error('Intel realization frontier missing');
  const controlSource=(implementationFrontier?.route_control_sources||[]).find(
    (row)=>row.source_id==='US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS'
  );
  if(!controlSource)throw new Error('Intel resale-timing control source missing');

  const routes=Array.isArray(monitor?.official_routes)?monitor.official_routes:[];
  const receipts=Array.isArray(monitor?.observed_receipts)?monitor.observed_receipts:[];
  const qualifyingReceipts=receipts.filter((row)=>row?.qualifying_receipt===true);
  const gateOpen=shouldActivateIntelRealizationAcquisition(monitor,referenceTime);
  const eventChain=monitor?.required_event_chain||{};
  const realizationSupported=
    qualifyingReceipts.length>0&&
    eventChain.source_addressed_sale_transfer_dividend_or_warrant_exercise===true&&
    eventChain.transaction_quantity_and_date_bound===true&&
    eventChain.qualifying_realization_receipt===true;
  const federalReceiptSupported=
    realizationSupported&&
    eventChain.identified_federal_cash_receipt===true&&
    eventChain.public_account_booking===true;
  const distributionSupported=
    federalReceiptSupported&&
    eventChain.transparent_public_or_affected_party_distribution===true;

  const candidateRealizationValues=recursiveValues(
    intelCandidate,
    'realized_sale_dividend_or_warrant_exercise'
  );
  const candidateReceiptValues=recursiveValues(
    intelCandidate,
    'identified_federal_cash_receipt'
  );
  const candidateDistributionValues=recursiveValues(
    intelCandidate,
    'transparent_public_or_affected_party_distribution'
  );

  return {
    official_routes:routes.length,
    qualifying_receipts:qualifyingReceipts.length,
    ordinary_gate_open_as_of_reference:gateOpen,
    monitor_state:gateOpen?'gate_open_requires_acquisition':'waiting_for_gate',
    realization_supported:realizationSupported,
    federal_receipt_supported:federalReceiptSupported,
    distribution_supported:distributionSupported,
    answer_changes_authorized:monitor?.boundaries?.answer_changes_authorized===true,
    effective_answers:0,
    qualifying_jurisdictions:0,
    cross_domain_regression_completed:false,
    graph_effect:monitor?.boundaries?.graph_effect||'none',
    issue_345_may_close:false,
    frontier_row:clone(frontierRow),
    control_source:clone(controlSource),
    candidate_nonfinding_state:{
      realized_sale_dividend_or_warrant_exercise:candidateRealizationValues,
      identified_federal_cash_receipt:candidateReceiptValues,
      transparent_public_or_affected_party_distribution:candidateDistributionValues
    }
  };
}
