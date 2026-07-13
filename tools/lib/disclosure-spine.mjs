const MEMBER_IDS = [
  'barack-obama',
  'bill-clinton',
  'donald-trump',
  'george-h-w-bush',
  'george-w-bush',
  'jimmy-carter',
  'joe-biden',
  'ronald-reagan',
];

const HOLDER_SCOPES = new Set(['filer', 'spouse', 'dependent_child', 'joint', 'unknown']);

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function validateDisclosureSourceCoverage(matrix) {
  const errors = [];
  if (matrix?.schema_version !== 'presidential-disclosure-source-coverage@1') errors.push('invalid schema_version');
  if (matrix?.cohort_id !== 'us-presidents-eiga-era-1979-present') errors.push('invalid cohort_id');
  if (matrix?.graph_effect !== 'none' || matrix?.workflow_contract?.graph_effect !== 'none') errors.push('graph effect must remain none');
  if (matrix?.workflow_contract?.discovery_may_continue_with_pending_selection_review !== true) errors.push('pending review must not stop discovery');
  if (matrix?.workflow_contract?.intake_may_continue_without_openfec_api_key !== true) errors.push('missing API key must not stop intake');
  if (matrix?.source_families?.length !== 4) errors.push('expected four source families');

  const allowed = new Set(matrix?.allowed_coverage_states ?? []);
  for (const source of matrix?.source_families ?? []) {
    const ids = (source.member_coverage ?? []).map(row => row.person_id).sort();
    if (JSON.stringify(ids) !== JSON.stringify(MEMBER_IDS)) errors.push(`${source.source_id}: incomplete cohort coverage`);
    if (!source.official_url || !source.access_mode || source.graph_effect !== 'none') errors.push(`${source.source_id}: incomplete source contract`);
    for (const row of source.member_coverage ?? []) {
      if (!allowed.has(row.state)) errors.push(`${source.source_id}/${row.person_id}: invalid coverage state ${row.state}`);
    }
  }
  const oppexp = matrix?.source_families?.find(source => source.source_id === 'fec-operating-expenditure-cycle-files');
  if (oppexp?.acquisition_status !== 'ingested_partial'
    || oppexp?.member_coverage?.find(row => row.person_id === 'george-w-bush')?.state !== 'ingested_partial') {
    errors.push('2004 FEC operating-expenditure intake is not represented');
  }
  if (matrix?.coverage?.cohort_members !== 8
    || matrix?.coverage?.source_families !== 4
    || matrix?.coverage?.member_source_cells !== 32
    || matrix?.coverage?.hashed_source_artifacts !== 1
    || matrix?.coverage?.bulk_cycle_files_ingested !== 1
    || matrix?.coverage?.normalized_transaction_records !== 27862
    || matrix?.coverage?.normalized_beneficial_interest_records !== 0
    || matrix?.coverage?.crossing_matches !== 0) {
    errors.push('dishonest disclosure coverage counts');
  }
  return errors;
}

export function validateFecBulkManifest(manifest) {
  const errors = [];
  if (manifest?.schema_version !== 'fec-bulk-operating-expenditure-manifest@1') errors.push('invalid FEC bulk manifest schema');
  if (manifest?.source_zip_bytes !== 25734364 || manifest?.extracted_source_bytes !== 168173606) errors.push('incorrect FEC bulk byte counts');
  if (manifest?.extracted_source_sha256 !== '315ed8d44164bbcb889788f7cbe48d7116f38a8385c104f93e76619775cc7008') errors.push('incorrect FEC bulk source hash');
  if (manifest?.source_rows_scanned !== 954706 || manifest?.matched_reported_rows_observed !== 27862) errors.push('incorrect FEC bulk row counts');
  if (manifest?.cohort_committees_observed?.length !== 6) errors.push('incorrect FEC bulk committee count');
  const indicators = manifest?.report_filing_indicator_counts;
  if (indicators?.A !== 26115 || indicators?.N !== 1746 || indicators?.T !== 1 || indicators?.other !== 0) errors.push('incorrect report filing indicator counts');
  const audit = manifest?.amendment_audit;
  if (audit?.rows_with_transaction_id !== 27862
    || audit?.distinct_transaction_report_keys !== 27862
    || audit?.transaction_report_keys_spanning_multiple_file_numbers !== 0
    || audit?.duplicate_transaction_report_file_keys !== 0) {
    errors.push('incorrect amendment audit counts');
  }
  if (!manifest?.forbidden_inferences?.includes('report_amendment_indicator_is_duplicate_row_flag')
    || !manifest?.forbidden_inferences?.includes('amended_report_row_ratio_is_overcount_ratio')) {
    errors.push('missing amendment interpretation guardrails');
  }
  return errors;
}

export function normalizeBeneficialInterestRecord(record, context) {
  if (!MEMBER_IDS.includes(context?.person_id)) throw new Error(`unknown cohort person_id: ${context?.person_id}`);
  const interestHolderScope = text(record?.interest_holder_scope) ?? 'unknown';
  if (!HOLDER_SCOPES.has(interestHolderScope)) throw new Error(`invalid interest_holder_scope: ${interestHolderScope}`);
  if (!text(record?.asset_or_entity_name_as_reported)) throw new Error('asset_or_entity_name_as_reported is required');
  if (!text(context?.source_url) || !/^[a-f0-9]{64}$/i.test(context?.source_sha256 ?? '')) {
    throw new Error('source_url and source_sha256 are required');
  }

  return {
    schema_version: 'presidential-beneficial-interest-intake@1',
    cohort_id: 'us-presidents-eiga-era-1979-present',
    person_id: context.person_id,
    person_name: text(context.person_name),
    source_document_id: text(context.source_document_id),
    report_type: text(context.report_type),
    report_date: text(context.report_date),
    source_url: context.source_url,
    source_sha256: context.source_sha256.toLowerCase(),
    source_page: Number.isInteger(record.source_page) ? record.source_page : null,
    source_row_label: text(record.source_row_label),
    interest_holder_scope: interestHolderScope,
    asset_or_entity_name_as_reported: text(record.asset_or_entity_name_as_reported),
    asset_description_as_reported: text(record.asset_description_as_reported),
    interest_type_as_reported: text(record.interest_type_as_reported),
    value_range_as_reported: text(record.value_range_as_reported),
    income_type_as_reported: text(record.income_type_as_reported),
    income_range_as_reported: text(record.income_range_as_reported),
    valid_from: text(record.valid_from),
    valid_until: text(record.valid_until),
    entity_resolution_status: 'unresolved_as_reported_name',
    evidence_layer: 'documented_fact',
    evidence_state: 'self_claimed',
    workflow_status: 'machine_extracted_pending_review',
    allowed_language: 'The filer reported the listed interest text in the identified public financial disclosure document.',
    forbidden_inferences: [
      'reported_name_is_resolved_legal_entity',
      'spouse_or_dependent_interest_is_filer_ownership',
      'value_range_is_exact_value',
      'disclosure_proves_current_control',
      'wrongdoing_from_disclosed_interest',
    ],
    privacy_projection: 'No address, account number, signature, dependent name, contact field, or exact private identifier is retained.',
    graph_effect: 'none',
  };
}

export { MEMBER_IDS };
