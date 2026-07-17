import { sha256 } from './openfec-cohort.mjs';

export const OPENFEC_SCHEDULE_B_URL = 'https://api.open.fec.gov/v1/schedules/schedule_b/';

function optional(url, key, value) {
  if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
}

export function publicScheduleBUrl(committeeId, {
  baseUrl = OPENFEC_SCHEDULE_B_URL,
  perPage = 100,
  page = 1,
  minDate,
  maxDate,
} = {}) {
  if (!/^C\d{8}$/.test(committeeId ?? '')) throw new Error(`invalid FEC committee_id: ${committeeId}`);
  const url = new URL(baseUrl);
  url.searchParams.set('committee_id', committeeId);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  optional(url, 'min_date', minDate);
  optional(url, 'max_date', maxDate);
  return url;
}

export function authenticatedScheduleBUrl(committeeId, apiKey, options = {}) {
  const url = publicScheduleBUrl(committeeId, options);
  url.searchParams.set('api_key', apiKey);
  return url;
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function cleanPagination(pagination = {}) {
  return {
    count: number(pagination.count),
    pages: number(pagination.pages),
    page: number(pagination.page),
    per_page: number(pagination.per_page),
    last_indexes: pagination.last_indexes ? {
      last_disbursement_date: text(pagination.last_indexes.last_disbursement_date),
      last_index: text(pagination.last_indexes.last_index),
    } : null,
  };
}

export function normalizeScheduleBRecord(record, context) {
  return {
    schema_version: 'openfec-schedule-b-record@1',
    cohort_id: context.cohort_id,
    person_id: context.person_id,
    person_name: context.person_name,
    candidate_id: context.candidate_id,
    committee_id: context.committee_id,
    committee_name: context.committee_name,
    payee_name_as_reported: text(record.recipient_name),
    payee_committee_id: text(record.recipient_committee_id),
    disbursement_date: text(record.disbursement_date),
    disbursement_amount: number(record.disbursement_amount),
    disbursement_description: text(record.disbursement_description),
    memo_text: text(record.memo_text),
    entity_type_as_reported: text(record.entity_type),
    filing_form: text(record.filing_form),
    line_number: text(record.line_number),
    report_type: text(record.report_type),
    election_cycle: number(record.two_year_transaction_period),
    image_number: text(record.image_number),
    transaction_id: text(record.transaction_id),
    sub_id: text(record.sub_id),
    amendment_indicator: text(record.amendment_indicator),
    query_url: context.query_url,
    retrieved_at: context.retrieved_at,
    evidence_layer: 'documented_fact',
    evidence_state: 'observed',
    workflow_status: 'intake',
    allowed_language: 'The committee reported this itemized Schedule B disbursement with the listed payee text, date, amount, and purpose fields.',
    forbidden_inferences: [
      'payee_identity_resolved_from_name_alone',
      'beneficial_ownership_from_payee_name',
      'personal_payment_to_candidate',
      'wrongdoing_from_disbursement',
    ],
    graph_effect: 'none',
  };
}

export function normalizeScheduleBPage(payload, context) {
  const raw = Array.isArray(payload?.results) ? payload.results : [];
  const pagination = cleanPagination(payload?.pagination);
  const records = raw.map(record => normalizeScheduleBRecord(record, context));
  const page = pagination.page ?? context.page;
  const pages = pagination.pages;
  const coverageStatus = pages !== null && page >= pages ? 'source_pages_complete' : 'bounded_partial';
  return {
    query: {
      schema_version: 'openfec-schedule-b-query@1',
      cohort_id: context.cohort_id,
      person_id: context.person_id,
      candidate_id: context.candidate_id,
      committee_id: context.committee_id,
      committee_name: context.committee_name,
      query_url: context.query_url,
      retrieved_at: context.retrieved_at,
      credential_mode: context.credential_mode,
      query_status: records.length ? 'records_observed' : 'null_observed',
      coverage_status: coverageStatus,
      pagination,
      records_observed: records.length,
      raw_response_sha256: sha256(payload),
      evidence_state: 'observed',
      privacy_projection: 'No street address, city, state, ZIP code, employer, occupation, or contact field is retained.',
      interpretation: 'This is bounded Schedule B source intake. Payee identity and beneficial ownership remain unresolved; an incomplete page range is not evidence of absence.',
      consumption: context.consumption,
      graph_effect: 'none',
    },
    records,
  };
}

export function summarizeScheduleBQueries(queries, records) {
  const committeeIds = new Set(queries.map(query => query.committee_id));
  return {
    committees_queried: committeeIds.size,
    pages_queried: queries.length,
    pages_with_records: queries.filter(query => query.query_status === 'records_observed').length,
    null_pages_observed: queries.filter(query => query.query_status === 'null_observed').length,
    source_failures: queries.filter(query => query.query_status === 'source_failure').length,
    records_observed: records.length,
    complete_committee_ranges: new Set(queries.filter(query => query.coverage_status === 'source_pages_complete').map(query => query.committee_id)).size,
    crossing_matches: 0,
  };
}
