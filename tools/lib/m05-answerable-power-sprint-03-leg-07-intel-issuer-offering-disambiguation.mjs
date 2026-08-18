export const INTEL_OFFERING_FRONTIER_ID='M05-IF-VALUE-US-INTEL-REALIZATION';
export const INTEL_OFFERING_RECEIPT_ID='M05-RC-VALUE-US-INTEL-CHIPS-EQUITY';
export const INTEL_OFFERING_DOMAIN_ID='APC-VALUE-01';
export const INTEL_OFFERING_JURISDICTION='US';
export const INTEL_OFFERING_ORDINARY_GATE='2026-08-27T00:00:00Z';

export const INTEL_OFFERING_SOURCE_IDS=[
  'US-INTEL-COMMERCE-RESALE-GATE-2026-01-23',
  'US-INTEL-ISSUER-OFFERING-424B5-2026-08-10',
  'US-INTEL-ISSUER-OFFERING-8K-2026-08-12',
  'US-COMMERCE-INTEL-VALUATION-2026-01'
];

export const INTEL_OFFERING_ROUTE_IDS=[
  'US-INTEL-REALIZATION-01',
  'US-INTEL-REALIZATION-02',
  'US-INTEL-REALIZATION-03',
  'US-INTEL-REALIZATION-04',
  'US-INTEL-REALIZATION-05'
];

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function classifyIntelOfferingRecord(record){
  const facts=record?.facts||{};
  const issuer=facts.issuer||null;
  const proceedsRecipient=facts.proceeds_recipient||null;
  const commerceSeller=facts.commerce_selling_securityholder===true;
  const federalReceipt=facts.federal_cash_receipt_recorded===true;
  const publicDistribution=facts.public_distribution_recorded===true;

  if(
    issuer==='Intel Corporation'&&
    proceedsRecipient==='Intel Corporation'&&
    commerceSeller===false
  ){
    return 'issuer_primary_offering';
  }
  if(
    issuer==='Intel Corporation'&&
    facts.option_exercised_in_full===true&&
    commerceSeller===false
  ){
    return 'issuer_underwriting_and_option_exercise';
  }
  if(
    commerceSeller===true&&
    federalReceipt===true&&
    publicDistribution===true
  ){
    return 'qualifying_commerce_realization_chain';
  }
  return 'nonqualifying_or_incomplete_record';
}

export function summarizeIntelIssuerOfferingDisambiguation(
  acquisition,
  dateGateMonitor,
  implementationFrontier,
  intelCandidate
){
  const target=acquisition?.target||{};
  if(
    target.frontier_id!==INTEL_OFFERING_FRONTIER_ID||
    target.receipt_id!==INTEL_OFFERING_RECEIPT_ID||
    target.domain_id!==INTEL_OFFERING_DOMAIN_ID||
    target.jurisdiction!==INTEL_OFFERING_JURISDICTION||
    target.route_class!=='future_time_gated_monitoring'
  ){
    throw new Error('Intel issuer-offering target drift');
  }

  const frontierRow=(implementationFrontier?.frontiers||[]).find(
    (row)=>row.frontier_id===INTEL_OFFERING_FRONTIER_ID
  );
  if(!frontierRow)throw new Error('Intel realization frontier missing');

  const sources=Array.isArray(acquisition?.source_records)
    ?acquisition.source_records:[];
  const routes=Array.isArray(acquisition?.route_ledger)
    ?acquisition.route_ledger:[];
  const instrument=acquisition?.instrument_disambiguation||{};
  const eventChain=acquisition?.required_event_chain||{};

  const issuerOfferingSources=sources.filter((source)=>{
    const classification=classifyIntelOfferingRecord(source);
    return classification==='issuer_primary_offering'||
      classification==='issuer_underwriting_and_option_exercise';
  });
  const qualifyingReceipts=sources.filter(
    (source)=>source?.qualifies_as_commerce_realization_receipt===true
  );
  const substantiveNonqualifying=routes.filter(
    (route)=>[
      'substantive_nonqualifying_issuer_offering',
      'valuation_only_without_exception_or_disposition_receipt'
    ].includes(route?.result_class)
  );
  const boundedSearchWithoutQualifier=routes.filter(
    (route)=>[
      'no_qualifying_federal_account_receipt_located',
      'no_qualifying_distribution_receipt_located'
    ].includes(route?.result_class)
  );

  const computedIssuerShares=
    Number(instrument.issuer_offering_base_shares||0)+
    Number(instrument.issuer_offering_option_shares||0);

  const commerceDispositionSupported=
    qualifyingReceipts.length>0&&
    eventChain.source_addressed_commerce_sale_transfer_dividend_or_warrant_exercise===true&&
    eventChain.transaction_quantity_and_date_bound_to_commerce===true&&
    eventChain.qualifying_realization_receipt===true;
  const federalReceiptSupported=
    commerceDispositionSupported&&
    eventChain.identified_federal_cash_receipt===true&&
    eventChain.public_account_booking===true;
  const distributionSupported=
    federalReceiptSupported&&
    eventChain.transparent_public_or_affected_party_distribution===true;

  return {
    official_source_records:sources.length,
    executed_routes:routes.length,
    substantive_nonqualifying_routes:substantiveNonqualifying.length,
    bounded_search_routes_without_qualifier:boundedSearchWithoutQualifier.length,
    issuer_offering_sources:issuerOfferingSources.length,
    issuer_offering_total_shares:computedIssuerShares,
    qualifying_commerce_realization_receipts:qualifyingReceipts.length,
    commerce_disposition_supported:commerceDispositionSupported,
    federal_receipt_supported:federalReceiptSupported,
    public_account_booking_supported:federalReceiptSupported,
    distribution_supported:distributionSupported,
    answer_changes_authorized:acquisition?.boundaries?.answer_changes_authorized===true,
    effective_answers:0,
    qualifying_jurisdictions:0,
    cross_domain_regression_completed:false,
    graph_effect:acquisition?.boundaries?.graph_effect||'none',
    issue_345_may_close:false,
    predecessor_state:{
      date_gate_monitor_state:dateGateMonitor?.target?.monitor_state||null,
      date_gate_realization_supported:
        dateGateMonitor?.expected_result?.realization_supported===true,
      candidate_realization_supported:
        intelCandidate?.receipt?.instrument_chain
          ?.realized_sale_dividend_or_warrant_exercise===true,
      candidate_federal_receipt_supported:
        intelCandidate?.receipt?.instrument_chain
          ?.identified_federal_cash_receipt===true,
      candidate_distribution_supported:
        intelCandidate?.receipt?.instrument_chain
          ?.transparent_public_or_affected_party_distribution===true
    },
    frontier_row:clone(frontierRow)
  };
}
