export const FEC_OPPEXP_COLUMNS = [
  'CMTE_ID', 'AMNDT_IND', 'RPT_YR', 'RPT_TP', 'IMAGE_NUM', 'LINE_NUM', 'FORM_TP_CD', 'SCHED_TP_CD',
  'NAME', 'CITY', 'STATE', 'ZIP_CODE', 'TRANSACTION_DT', 'TRANSACTION_AMT', 'TRANSACTION_PGI', 'PURPOSE',
  'CATEGORY', 'CATEGORY_DESC', 'MEMO_CD', 'MEMO_TEXT', 'ENTITY_TP', 'SUB_ID', 'FILE_NUM', 'TRAN_ID', 'BACK_REF_TRAN_ID',
];

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fecDate(value) {
  const raw = text(value);
  if (!raw) return null;
  const digits = raw.replaceAll(/[^0-9]/g, '');
  if (digits.length !== 8) return raw;
  const [month, day, year] = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)];
  return `${year}-${month}-${day}`;
}

export function parseOperatingExpenditureLine(line) {
  const values = line.replace(/\r?\n$/, '').split('|');
  return Object.fromEntries(FEC_OPPEXP_COLUMNS.map((column, index) => [column, values[index] ?? '']));
}

export function normalizeBulkOperatingExpenditure(row, context) {
  if (!/^C\d{8}$/.test(row?.CMTE_ID ?? '')) throw new Error(`invalid CMTE_ID: ${row?.CMTE_ID}`);
  return {
    schema_version: 'fec-bulk-operating-expenditure@1',
    cohort_id: context.cohort_id,
    person_id: context.person_id,
    person_name: context.person_name,
    candidate_id: context.candidate_id,
    committee_id: row.CMTE_ID,
    committee_name: context.committee_name,
    payee_name_as_reported: text(row.NAME),
    disbursement_date: fecDate(row.TRANSACTION_DT),
    disbursement_amount: amount(row.TRANSACTION_AMT),
    disbursement_description: text(row.PURPOSE),
    category_code: text(row.CATEGORY),
    category_description: text(row.CATEGORY_DESC),
    memo_code: text(row.MEMO_CD),
    memo_text: text(row.MEMO_TEXT),
    entity_type_as_reported: text(row.ENTITY_TP),
    amendment_indicator: text(row.AMNDT_IND),
    report_year: amount(row.RPT_YR),
    report_type: text(row.RPT_TP),
    image_number: text(row.IMAGE_NUM),
    line_number: text(row.LINE_NUM),
    form_type: text(row.FORM_TP_CD),
    schedule_type: text(row.SCHED_TP_CD),
    sub_id: text(row.SUB_ID),
    file_number: text(row.FILE_NUM),
    transaction_id: text(row.TRAN_ID),
    back_reference_transaction_id: text(row.BACK_REF_TRAN_ID),
    source_url: context.source_url,
    source_sha256: context.source_sha256,
    source_line: context.source_line,
    evidence_layer: 'documented_fact',
    evidence_state: 'observed',
    workflow_status: 'intake',
    allowed_language: 'The committee reported this operating expenditure with the listed payee text, date, amount, and purpose fields in the official FEC bulk file.',
    forbidden_inferences: [
      'payee_identity_resolved_from_name_alone',
      'beneficial_ownership_from_payee_name',
      'amendment_duplicates_are_distinct_payments_without_review',
      'wrongdoing_from_disbursement',
    ],
    privacy_projection: 'City, state, ZIP code, street address, and private contact fields are not retained.',
    graph_effect: 'none',
  };
}

export function operatingExpenditureUrl(cycle) {
  const value = Number(cycle);
  if (!Number.isInteger(value) || value < 2004 || value % 2 !== 0) throw new Error(`invalid FEC operating-expenditure cycle: ${cycle}`);
  return `https://www.fec.gov/files/bulk-downloads/${value}/oppexp${String(value).slice(-2)}.zip`;
}
