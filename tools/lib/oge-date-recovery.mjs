import crypto from 'node:crypto';

const STRICT_SLASH_DATE = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
const STRICT_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_COLUMN_X_MIN = 480;
const DATE_COLUMN_X_MAX = 600;

export const sha256 = value => crypto.createHash('sha256').update(
  Buffer.isBuffer(value) || value instanceof Uint8Array ? value : String(value),
).digest('hex');

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function clean(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function lineNumber(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,3})\.?$/);
  if (match) return match[1];
  return /^I\.?$/i.test(String(value ?? '').trim()) ? '1' : null;
}

function joinItems(items) {
  return clean(items
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map(item => item.str)
    .join(' '));
}

function validCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function parseStrictSourceDateToken(value) {
  const raw = String(value ?? '').trim();
  let match = raw.match(STRICT_SLASH_DATE);
  let year;
  let month;
  let day;
  if (match) {
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  } else {
    match = raw.match(STRICT_ISO_DATE);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }
  if (!validCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function sourceRowGroup(page, sourceRowLabel) {
  const match = String(sourceRowLabel ?? '').match(/^(transactions|part-\d+)\/([^@]+)@y(-?\d+(?:\.\d+)?)$/);
  if (!match || !Array.isArray(page?.items)) return null;
  const [, section, label, rawY] = match;
  const targetY = Number(rawY);
  const transaction = section === 'transactions';
  const numberXMax = transaction ? 90 : 52;
  const topY = transaction ? 525 : 500;
  const bottomY = 42;
  const anchors = page.items
    .filter(item => item.x < numberXMax && item.y < topY && item.y > bottomY && lineNumber(item.str))
    .map(item => ({ y: item.y, label: lineNumber(item.str) }))
    .sort((a, b) => b.y - a.y);
  const unique = [];
  for (const anchor of anchors) {
    if (!unique.some(row => Math.abs(row.y - anchor.y) < 2)) unique.push(anchor);
  }
  const index = unique.findIndex(row => row.label === label && Math.abs(row.y - targetY) <= 0.11);
  if (index < 0) return null;
  const anchor = unique[index];
  const nextY = unique[index + 1]?.y ?? bottomY;
  const items = page.items.filter(item => item.y <= anchor.y + 4 && item.y > nextY + 3);
  return {
    section,
    label,
    source_y: Math.round(anchor.y * 10) / 10,
    upper_y: anchor.y + 4,
    lower_y_exclusive: nextY + 3,
    items,
    raw_text: joinItems(items),
  };
}

function baseEvidence(record, page, row) {
  const pageTextSha256 = page?.text_sha256 ?? null;
  const rawTextSha256Observed = row?.raw_text ? sha256(row.raw_text) : null;
  return {
    schema_version: 'oge-source-date-evidence@1',
    source_evidence_id: `oge-source-date-evidence:${sha256(`${record?.source_sha256 ?? ''}|${record?.source_page ?? ''}|${record?.source_row_label ?? ''}|${record?.raw_text_sha256 ?? ''}`).slice(0, 32)}`,
    oge_interest_input_line: null,
    source_document_id: record?.source_document_id ?? null,
    source_sha256: record?.source_sha256 ?? null,
    source_page: record?.source_page ?? null,
    source_row_label: record?.source_row_label ?? null,
    page_text_sha256: pageTextSha256,
    row_bounds: row ? { upper_y: row.upper_y, lower_y_exclusive: row.lower_y_exclusive } : null,
    raw_text_ref: record?.raw_text_ref ?? null,
    raw_text_sha256_expected: record?.raw_text_sha256 ?? null,
    raw_text_sha256_observed: rawTextSha256Observed,
    raw_text_sha256_verified: Boolean(rawTextSha256Observed && rawTextSha256Observed === record?.raw_text_sha256),
    record_kind: record?.record_kind ?? null,
    report_type: record?.report_type ?? null,
    report_date: record?.report_date ?? null,
    original_dates: {
      valid_from: record?.valid_from ?? null,
      valid_until: record?.valid_until ?? null,
      transaction_date_as_reported: record?.transaction_date_as_reported ?? null,
    },
    recovery_rule: 'oge-source-page-date-recovery@1',
    recovered_date: null,
    recovery_status: 'unrecovered',
    reason: null,
    source_date_items: [],
    verification_status: 'machine_generated_unreviewed',
    causal_status: 'not_established',
    graph_effect: 'none',
  };
}

export function analyzeInterestDateEvidence(record, page) {
  const row = sourceRowGroup(page, record?.source_row_label);
  const evidence = baseEvidence(record, page, row);
  if (!page) {
    evidence.recovery_status = 'source_error';
    evidence.reason = 'source_page_missing';
    return evidence;
  }
  if (!row) {
    evidence.recovery_status = 'source_error';
    evidence.reason = 'source_row_locator_not_found';
    return evidence;
  }
  if (!evidence.raw_text_sha256_verified) {
    evidence.recovery_status = 'source_error';
    evidence.reason = 'source_row_text_hash_mismatch';
    return evidence;
  }

  if (record?.record_kind !== 'reported_transaction') {
    evidence.reason = /^Termination\b/i.test(record?.report_type ?? '')
      ? 'termination_disclosure_interest_start_date_not_reported'
      : 'annual_disclosure_interest_start_date_not_reported';
    return evidence;
  }

  evidence.source_date_items = row.items
    .filter(item => item.x >= DATE_COLUMN_X_MIN && item.x < DATE_COLUMN_X_MAX && /\d/.test(item.str))
    .map(item => ({ x: item.x, y: item.y, str: item.str, text_sha256: sha256(item.str) }));
  const strict = evidence.source_date_items
    .map(item => ({ item, normalized: parseStrictSourceDateToken(item.str) }))
    .filter(candidate => candidate.normalized);
  const distinct = [...new Set(strict.map(candidate => candidate.normalized))];
  if (distinct.length > 1) {
    evidence.reason = 'source_row_multiple_strict_date_tokens';
    return evidence;
  }
  if (distinct.length === 1) {
    evidence.recovery_status = 'recovered';
    evidence.reason = 'single_strict_date_token_in_source_date_column';
    evidence.recovered_date = distinct[0];
    return evidence;
  }
  evidence.reason = evidence.source_date_items.length
    ? 'source_transaction_date_token_not_strict'
    : 'source_transaction_date_token_missing';
  return evidence;
}

export function applyDateRecovery(candidate, evidence) {
  const recovered = evidence?.recovery_status === 'recovered' ? evidence.recovered_date : null;
  return {
    ...candidate,
    interest_dates: recovered
      ? { ...candidate.interest_dates, valid_from: recovered, valid_until: recovered }
      : { ...candidate.interest_dates },
  };
}
