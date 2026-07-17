import crypto from 'node:crypto';

const HOLDER_SCOPES = new Set(['filer', 'spouse', 'dependent_child', 'joint', 'unknown']);
const PRIVATE_TEXT = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b\d{3}[-. ]\d{2}[-. ]\d{4}\b/,
  /\b(?:account|acct)\s*(?:number|no\.?|#)\s*[:=-]?\s*[A-Z0-9-]{5,}\b/i,
];

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

function joinItems(items) {
  return clean(items
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map(item => item.str)
    .join(' '));
}

function lineNumber(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,3})\.?$/);
  if (match) return match[1];
  return /^I\.?$/i.test(String(value ?? '').trim()) ? '1' : null;
}

function pageText(page) {
  return page.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
}

function rowGroups(page, { numberXMax, topY = 500, bottomY = 42 }) {
  const anchors = page.items
    .filter(item => item.x < numberXMax && item.y < topY && item.y > bottomY && lineNumber(item.str))
    .map(item => ({ y: item.y, label: lineNumber(item.str) }))
    .sort((a, b) => b.y - a.y);
  const unique = [];
  for (const anchor of anchors) {
    if (!unique.some(row => Math.abs(row.y - anchor.y) < 2)) unique.push(anchor);
  }
  return unique.map((anchor, index) => {
    const nextY = unique[index + 1]?.y ?? bottomY;
    return {
      label: anchor.label,
      source_y: Math.round(anchor.y * 10) / 10,
      items: page.items.filter(item => item.y <= anchor.y + 4 && item.y > nextY + 3),
    };
  });
}

function explicitScope(description, fallback = 'unknown') {
  const marker = String(description ?? '').match(/^\s*(?:\(|\[)?(S|SP|DC|J)(?:\)|\])\s*[-:)]?\s*/i)?.[1]?.toUpperCase();
  if (marker === 'S' || marker === 'SP') return 'spouse';
  if (marker === 'DC') return 'dependent_child';
  if (marker === 'J') return 'joint';
  return fallback;
}

function privacyFailure(text) {
  return PRIVATE_TEXT.find(pattern => pattern.test(text))?.source ?? null;
}

function normalizeTransactionDate(value) {
  const raw = clean(value);
  const match = raw?.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeTransactionType(value) {
  const normalized = clean(value)?.toLowerCase();
  return new Set(['purchase', 'sale', 'exchange']).has(normalized) ? normalized : null;
}

function baseRecord({ context, page, rowLabel, scope, name, rawText, recordKind }) {
  if (!HOLDER_SCOPES.has(scope)) throw new Error(`invalid holder scope ${scope}`);
  const rawTextHash = sha256(rawText);
  return {
    schema_version: 'presidential-beneficial-interest-intake@1',
    cohort_id: 'us-presidents-eiga-era-1979-present',
    person_id: context.person_id,
    person_name: context.person_name ?? null,
    source_document_id: context.source_document_id,
    report_type: context.report_type,
    report_date: context.report_date ?? null,
    source_url: context.source_url,
    source_sha256: context.source_sha256,
    source_page: page,
    source_row_label: rowLabel,
    raw_text_ref: `pages/${context.source_sha256}.jsonl#page=${page}&row=${encodeURIComponent(rowLabel)}`,
    raw_text_sha256: rawTextHash,
    record_kind: recordKind,
    interest_holder_scope: scope,
    asset_or_entity_name_as_reported: name,
    entity_resolution_status: 'unresolved_as_reported_name',
    evidence_layer: 'documented_fact',
    evidence_state: 'self_claimed',
    verification_status: 'machine_proposed_unverified',
    workflow_status: 'machine_extracted_pending_review',
    causal_status: 'not_established',
    allowed_language: 'The filer reported the listed text in the identified public financial disclosure document.',
    forbidden_inferences: [
      'reported_name_is_resolved_legal_entity',
      'spouse_or_dependent_interest_is_filer_ownership',
      'value_range_is_exact_value',
      'disclosure_proves_current_control',
      'transaction_proves_current_ownership',
      'wrongdoing_from_disclosed_interest',
    ],
    privacy_projection: 'Whitelisted disclosure fields only; no address, account number, signature, contact field, dependent name, or exact private identifier is retained.',
    graph_effect: 'none',
  };
}

function parseAnnualPage(page, context) {
  const header = pageText(page);
  let part = null;
  let fallbackScope = 'unknown';
  let kind = null;
  if (/Part\s*2\s*:\s*Filer'?s Employment Assets/i.test(header)) {
    part = '2'; fallbackScope = 'filer'; kind = 'employment_asset_or_income';
  } else if (/Part\s*5\s*:\s*Spouse'?s Employment Assets/i.test(header)) {
    part = '5'; fallbackScope = 'spouse'; kind = 'employment_asset_or_income';
  } else if (/Part\s*6\s*:\s*Other Assets and Income/i.test(header)) {
    part = '6'; kind = 'other_asset_or_income';
  } else if (/\bDescription\b/i.test(header) && /\bEIF\b/i.test(header) && /\bValue\b/i.test(header)) {
    if (page.page_number === 3) {
      part = '2'; fallbackScope = 'filer'; kind = 'employment_asset_or_income';
    } else if (page.page_number === 6) {
      part = '5'; fallbackScope = 'spouse'; kind = 'employment_asset_or_income';
    } else if (page.page_number >= 7) {
      part = '6'; kind = 'other_asset_or_income';
    }
  }
  if (!part) return { records: [], rejections: [] };

  const records = [];
  const rejections = [];
  for (const group of rowGroups(page, { numberXMax: 52 })) {
    const description = joinItems(group.items.filter(item => item.x >= 50 && item.x < 294));
    if (!description || /^(?:none|not applicable|n\/a)$/i.test(description)) continue;
    const rawText = joinItems(group.items) ?? description;
    const failedPattern = privacyFailure(rawText) ?? privacyFailure(description);
    const rowLabel = `part-${part}/${group.label}@y${group.source_y}`;
    if (failedPattern) {
      rejections.push({ page: page.page_number, row_label: rowLabel, reason: 'privacy_pattern', pattern: failedPattern, raw_text_sha256: sha256(rawText) });
      continue;
    }
    const record = baseRecord({
      context, page: page.page_number, rowLabel, scope: explicitScope(description, fallbackScope),
      name: description, rawText, recordKind: kind,
    });
    record.asset_description_as_reported = description;
    record.interest_type_as_reported = kind;
    record.eif_as_reported = joinItems(group.items.filter(item => item.x >= 294 && item.x < 324));
    record.value_range_as_reported = joinItems(group.items.filter(item => item.x >= 320 && item.x < 448));
    record.income_type_as_reported = joinItems(group.items.filter(item => item.x >= 448 && item.x < 545));
    record.income_range_as_reported = joinItems(group.items.filter(item => item.x >= 545));
    record.valid_from = null;
    record.valid_until = context.report_date ?? null;
    records.push(record);
  }
  return { records, rejections };
}

function parseTransactionPage(page, context) {
  const header = pageText(page);
  const hasTransactionSignal = /Transa(?:c|e)tion|Tranuc|o..rchase|purchase|sale|exchange/i.test(header);
  const hasDateSignal = /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{3,4}[\/-]\d{4})\b/.test(header);
  if (!hasTransactionSignal && !hasDateSignal) {
    return { records: [], rejections: [] };
  }
  const records = [];
  const rejections = [];
  for (const group of rowGroups(page, { numberXMax: 90, topY: 525 })) {
    const items = group.items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
    const dateItem = items.find(item => /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{3,4}[\/-]\d{4})\b/.test(item.str));
    const typeItem = items.find(item => /p.{0,4}rch|ourch|sale|salo|sell|exchange|exch/i.test(item.str));
    const notificationItem = dateItem
      ? items.find(item => item.x > dateItem.x && /^(?:yes|no|y[eo]s|n[o0]|vos)\b/i.test(item.str.trim()))
      : null;
    const descriptionEnd = typeItem?.x ?? (dateItem ? dateItem.x - 8 : 500);
    let description = joinItems(items.filter(item => item.x >= 90 && item.x < descriptionEnd));
    if (description && typeItem && typeItem.x < 400) {
      description = clean(description.replace(/\b(?:purchase|purchaso|purehase|ourchase|sale|salo|exchange)\b.*$/i, ''));
    }
    if (!description || /^(?:none|not applicable|n\/a)$/i.test(description)) continue;
    const rawText = joinItems(group.items) ?? description;
    const failedPattern = privacyFailure(rawText) ?? privacyFailure(description);
    const rowLabel = `transactions/${group.label}@y${group.source_y}`;
    if (failedPattern) {
      rejections.push({ page: page.page_number, row_label: rowLabel, reason: 'privacy_pattern', pattern: failedPattern, raw_text_sha256: sha256(rawText) });
      continue;
    }
    let amountItems = [];
    if (notificationItem) amountItems = items.filter(item => item.x > notificationItem.x + 2);
    else if (dateItem) amountItems = items.filter(item => item.x > dateItem.x + 25);
    let amount = joinItems(amountItems);
    if (notificationItem && /[$S]\s*\d/i.test(notificationItem.str)) {
      amount = clean(`${notificationItem.str.slice(notificationItem.str.search(/[$S]\s*\d/i))} ${amount ?? ''}`);
    }
    const transactionDate = dateItem ? clean(dateItem.str.match(/(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{3,4}[\/-]\d{4})/)?.[0]) : null;
    if (!transactionDate || !amount || !/\d/.test(amount)) {
      rejections.push({ page: page.page_number, row_label: rowLabel, reason: 'incomplete_transaction_columns', raw_text_sha256: sha256(rawText) });
      continue;
    }
    const record = baseRecord({
      context, page: page.page_number, rowLabel, scope: explicitScope(description),
      name: description, rawText, recordKind: 'reported_transaction',
    });
    record.asset_description_as_reported = description;
    record.interest_type_as_reported = typeItem ? clean(typeItem.str) : null;
    record.interest_type_normalized = normalizeTransactionType(record.interest_type_as_reported);
    record.interest_type_status = record.interest_type_normalized ? 'strictly_parsed' : 'ocr_ambiguous';
    record.value_range_as_reported = amount;
    record.income_type_as_reported = null;
    record.income_range_as_reported = null;
    record.transaction_date_as_reported = transactionDate;
    record.transaction_date_normalized = normalizeTransactionDate(transactionDate);
    record.transaction_date_status = record.transaction_date_normalized ? 'strictly_parsed' : 'ocr_ambiguous';
    record.notification_over_30_days_as_reported = notificationItem ? clean(notificationItem.str.match(/^(?:yes|no|y[eo]s|n[o0]|vos)/i)?.[0]) : null;
    record.valid_from = record.transaction_date_normalized;
    record.valid_until = record.transaction_date_normalized;
    records.push(record);
  }
  return { records, rejections };
}

export function normalizePdfItems(items) {
  return items
    .filter(item => clean(item?.str) && Array.isArray(item?.transform))
    .map(item => ({
      x: Math.round(Number(item.transform[4]) * 10) / 10,
      y: Math.round(Number(item.transform[5]) * 10) / 10,
      str: clean(item.str),
    }));
}

export function parseOgePages(pages, context) {
  const records = [];
  const rejections = [];
  for (const page of pages) {
    const parsed = /278[- ]?T|Transaction/i.test(context.report_type)
      ? parseTransactionPage(page, context)
      : parseAnnualPage(page, context);
    records.push(...parsed.records);
    rejections.push(...parsed.rejections.map(row => ({ ...row, source_sha256: context.source_sha256, graph_effect: 'none' })));
  }
  return { records, rejections };
}

export function assertPrivacyProjection(record) {
  const forbiddenKeys = /address|account|signature|phone|email|dependent_name|family_member/i;
  for (const key of Object.keys(record)) {
    if (forbiddenKeys.test(key)) throw new Error(`private field leaked: ${key}`);
  }
  for (const text of [record.asset_or_entity_name_as_reported, record.asset_description_as_reported]) {
    const failed = privacyFailure(text);
    if (failed) throw new Error(`private text leaked: ${failed}`);
  }
  return true;
}

export { HOLDER_SCOPES };
