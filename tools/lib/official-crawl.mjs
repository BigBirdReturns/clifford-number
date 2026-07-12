import crypto from 'node:crypto';

export const EVENT_HINTS = new Set([
  'procurement_notice', 'commitment', 'capital_flow', 'corporate_filing',
  'policy_publication', 'regulatory_notice', 'appointment', 'outcome_observation', 'unknown'
]);

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

export function contentId(prefix, ...parts) {
  return `${prefix}_${sha256(parts.join('|')).slice(0, 24)}`;
}

export function cleanText(value, max = 800) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isoDate(value) {
  if (!value) return null;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function canonicalUrl(value, fallback) {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== 'https:') return fallback;
    url.hash = '';
    return url.href;
  } catch { return fallback; }
}

function first(...values) { return values.find(value => value !== undefined && value !== null && value !== '') ?? null; }

function normalizeSam(record, context) {
  const id = String(first(record.noticeId, record.notice_id, record.solicitationNumber, record.solicitation_number) ?? '');
  if (!id) throw new Error('SAM record lacks notice/solicitation identifier');
  const amount = Number(first(record.award?.amount, record.awardAmount));
  return {
    source_record_id: id,
    record_type: cleanText(first(record.type, record.ptype, 'contract opportunity'), 80),
    title: cleanText(first(record.title, record.fullParentPathName, id), 240),
    summary: cleanText(first(record.description, record.additionalInfoLink, ''), 600),
    source_url: canonicalUrl(first(record.uiLink, record.link, record.additionalInfoLink), `https://sam.gov/opp/${encodeURIComponent(id)}/view`),
    published_at: isoDate(first(record.postedDate, record.posted_date)),
    updated_at: isoDate(first(record.modifiedDate, record.responseDeadLine, record.archiveDate)),
    event_hints: ['procurement_notice'],
    identifiers: {
      notice_id: String(first(record.noticeId, record.notice_id, '') || ''),
      solicitation_number: String(first(record.solicitationNumber, record.solicitation_number, '') || ''),
      award_number: String(first(record.award?.number, record.awardNumber, '') || '')
    },
    amounts: Number.isFinite(amount) ? [{ currency: 'USD', amount, amount_kind: 'ceiling' }] : [],
    entity_hints: [context.term, cleanText(first(record.award?.awardee?.name, record.organizationName, ''), 160)].filter(Boolean)
  };
}

function normalizeUsaspending(record, context) {
  const id = String(first(record['Award ID'], record.Award_ID, record.generated_unique_award_id, record.award_id) ?? '');
  if (!id) throw new Error('USAspending record lacks award identifier');
  const amount = Number(first(record['Award Amount'], record.Award_Amount, record.total_obligation, record.award_amount));
  const recipient = cleanText(first(record['Recipient Name'], record.Recipient_Name, record.recipient_name, context.term), 180);
  return {
    source_record_id: id,
    record_type: cleanText(first(record['Award Type'], record.Award_Type, 'federal award'), 80),
    title: cleanText(`${recipient} — ${id}`, 240),
    summary: cleanText([first(record['Awarding Agency'], record.Awarding_Agency), first(record['Description'], record.description)].filter(Boolean).join(' · '), 600),
    source_url: canonicalUrl(first(record.generated_internal_id && `https://www.usaspending.gov/award/${record.generated_internal_id}/`), `https://www.usaspending.gov/search/?hash=award`),
    published_at: isoDate(first(record['Start Date'], record.Start_Date, record.period_of_performance_start_date)),
    updated_at: isoDate(first(record['End Date'], record.End_Date, record.period_of_performance_current_end_date)),
    event_hints: ['capital_flow'],
    identifiers: { award_id: id, generated_internal_id: String(record.generated_internal_id || ''), recipient_uei: String(first(record['Recipient UEI'], record.recipient_uei, '') || '') },
    amounts: Number.isFinite(amount) ? [{ currency: 'USD', amount, amount_kind: 'obligated' }] : [],
    entity_hints: [context.term, recipient].filter(Boolean)
  };
}

function normalizeSec(record, context) {
  const id = String(first(record.accession, record.accession_number, record.cik) ?? '');
  if (!id) throw new Error('SEC record lacks accession/CIK');
  return {
    source_record_id: id,
    record_type: 'SEC Form D filing',
    title: cleanText(first(record.title, `${context.term} Form D`), 240),
    summary: cleanText(`Official SEC filing discovered for configured frontier term ${context.term}.`, 600),
    source_url: canonicalUrl(record.link, `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(context.term)}&forms=D`),
    published_at: isoDate(first(record.updated, record.filed_at)),
    updated_at: isoDate(first(record.updated, record.filed_at)),
    event_hints: ['corporate_filing'],
    identifiers: { accession_number: String(record.accession || ''), cik: String(record.cik || '') },
    amounts: [],
    entity_hints: [context.term]
  };
}

function normalizeFederalRegister(record, context) {
  const id = String(first(record.document_number, record.id) ?? '');
  if (!id) throw new Error('Federal Register record lacks document number');
  return {
    source_record_id: id,
    record_type: cleanText(first(record.type, 'Federal Register document'), 80),
    title: cleanText(first(record.title, id), 240),
    summary: cleanText(first(record.abstract, record.excerpts, ''), 600),
    source_url: canonicalUrl(first(record.html_url, record.pdf_url), `https://www.federalregister.gov/d/${encodeURIComponent(id)}`),
    published_at: isoDate(record.publication_date),
    updated_at: isoDate(record.publication_date),
    event_hints: ['regulatory_notice'],
    identifiers: { document_number: id },
    amounts: [],
    entity_hints: [context.term, ...(record.agencies ?? []).map(agency => cleanText(agency.name, 120))].filter(Boolean)
  };
}

function normalizeGovuk(record, context) {
  const id = String(first(record.link, record.content_id, record.public_timestamp) ?? '');
  if (!id) throw new Error('GOV.UK record lacks content identifier/link');
  return {
    source_record_id: id,
    record_type: cleanText(first(record.format, record.content_store_document_type, 'GOV.UK content'), 80),
    title: cleanText(first(record.title, id), 240),
    summary: cleanText(first(record.description, record.summary, ''), 600),
    source_url: canonicalUrl(record.link?.startsWith('/') ? `https://www.gov.uk${record.link}` : record.link, 'https://www.gov.uk/search/all'),
    published_at: isoDate(first(record.public_timestamp, record.publication_date)),
    updated_at: isoDate(first(record.public_timestamp, record.updated_at)),
    event_hints: ['policy_publication'],
    identifiers: { content_id: String(record.content_id || ''), path: String(record.link || '') },
    amounts: [],
    entity_hints: [context.term, ...(record.organisations ?? []).map(value => cleanText(typeof value === 'string' ? value : first(value.title, value.label, value.slug, ''), 120))].filter(Boolean)
  };
}

export const NORMALIZERS = {
  sam_opportunities: normalizeSam,
  usaspending_awards: normalizeUsaspending,
  sec_form_d: normalizeSec,
  federal_register: normalizeFederalRegister,
  govuk_search: normalizeGovuk
};

function searchText(value) {
  return cleanText(typeof value === 'string' ? value : stableJson(value), 100000)
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function recordMatchBasis(adapter, rawRecord, term) {
  const phrase = searchText(term);
  if (!phrase) return null;
  const title = searchText(first(rawRecord.title, rawRecord['Recipient Name'], rawRecord.award?.awardee?.name, ''));
  const summary = searchText(first(rawRecord.abstract, rawRecord.description, rawRecord.summary, ''));
  if (title.includes(phrase)) return 'title';
  if (summary.includes(phrase)) return 'summary';
  const haystack = searchText(rawRecord);
  if (adapter === 'federal_register' || adapter === 'govuk_search') return haystack.includes(phrase) ? 'body' : null;
  const distinctive = phrase.split(' ').find(token => token.length >= 4 && !['technologies', 'industries', 'systems', 'capital'].includes(token));
  return (distinctive ? haystack.includes(distinctive) : haystack.includes(phrase)) ? 'record' : null;
}

export function recordMatchesTerm(adapter, rawRecord, term) {
  return recordMatchBasis(adapter, rawRecord, term) !== null;
}

function formatUsDate(value) {
  const date = new Date(value);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function dateMinusDays(now, days) {
  return new Date(new Date(now).getTime() - days * 86400000).toISOString().slice(0, 10);
}

function parseSecAtom(atom) {
  return [...String(atom).matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(([entry]) => ({
    title: cleanText(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    cik: cleanText(entry.match(/<cik>(.*?)<\/cik>/)?.[1] ?? '', 20),
    accession: cleanText(entry.match(/accession-number=([^<&"]+)/)?.[1] ?? '', 40),
    updated: cleanText(entry.match(/<updated>(.*?)<\/updated>/)?.[1] ?? '', 40),
    link: cleanText(entry.match(/<link rel="alternate" type="text\/html" href="(.*?)"/)?.[1] ?? '', 500)
  }));
}

async function responsePayload(response, mode = 'json') {
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${cleanText(await response.text(), 300)}`);
  return mode === 'text' ? response.text() : response.json();
}

export async function fetchAdapterRecords(source, term, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date().toISOString();
  const limit = options.limit ?? 10;
  const from = options.from ?? dateMinusDays(now, options.overlapDays ?? 7);
  const to = options.to ?? now.slice(0, 10);
  if (source.adapter === 'sam_opportunities') {
    const target = new URL(source.base_url);
    target.search = new URLSearchParams({ api_key: options.apiKey, limit: String(limit), offset: '0', postedFrom: formatUsDate(from), postedTo: formatUsDate(to), title: term });
    const payload = await responsePayload(await fetchImpl(target, { headers: options.headers }));
    return { records: payload.opportunitiesData ?? [], request_url: target.href };
  }
  if (source.adapter === 'usaspending_awards') {
    const body = { subawards: false, limit, page: 1, filters: { time_period: [{ start_date: from, end_date: to }], award_type_codes: ['A', 'B', 'C', 'D'], recipient_search_text: [term] }, fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Start Date', 'End Date', 'generated_unique_award_id'] };
    const payload = await responsePayload(await fetchImpl(source.base_url, { method: 'POST', headers: { ...options.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    return { records: payload.results ?? [], request_url: source.base_url };
  }
  if (source.adapter === 'sec_form_d') {
    const target = new URL(source.base_url);
    target.search = new URLSearchParams({ action: 'getcompany', company: term, type: 'D', owner: 'include', count: String(limit), output: 'atom' });
    const atom = await responsePayload(await fetchImpl(target, { headers: { ...options.headers, 'User-Agent': options.secUserAgent ?? options.headers?.['User-Agent'], Accept: 'application/atom+xml,text/xml' } }), 'text');
    return { records: parseSecAtom(atom).slice(0, limit), request_url: target.href };
  }
  if (source.adapter === 'federal_register') {
    const target = new URL(source.base_url);
    target.searchParams.set('per_page', String(limit));
    target.searchParams.set('order', 'newest');
    target.searchParams.set('conditions[term]', term);
    target.searchParams.set('conditions[publication_date][gte]', from);
    const payload = await responsePayload(await fetchImpl(target, { headers: options.headers }));
    return { records: payload.results ?? [], request_url: target.href };
  }
  if (source.adapter === 'govuk_search') {
    const target = new URL(source.base_url);
    target.search = new URLSearchParams({ q: term, count: String(limit), start: '0', order: '-public_timestamp' });
    const payload = await responsePayload(await fetchImpl(target, { headers: options.headers }));
    return { records: payload.results ?? [], request_url: target.href };
  }
  throw new Error(`unsupported adapter ${source.adapter}`);
}

export function observationFromRecord(source, term, rawRecord, retrievedAt) {
  const normalize = NORMALIZERS[source.adapter];
  if (!normalize) throw new Error(`unsupported adapter ${source.adapter}`);
  const normalized = normalize(rawRecord, { term, source });
  const upstreamContentSha256 = sha256(rawRecord);
  const observationId = contentId('obs', source.id, normalized.source_record_id, upstreamContentSha256);
  const snapshot = {
    schema_version: 'official-observation-snapshot@1',
    source_id: source.id,
    authority: source.authority,
    source_record_id: normalized.source_record_id,
    retrieved_at: retrievedAt,
    match_basis: recordMatchBasis(source.adapter, rawRecord, term),
    upstream_content_sha256: upstreamContentSha256,
    record: normalized
  };
  const snapshotSha256 = sha256(snapshot);
  return {
    schema_version: 'official-observation@1',
    observation_id: observationId,
    candidate_id: contentId('candidate', source.id, normalized.source_record_id),
    source_id: source.id,
    authority: source.authority,
    source_record_id: normalized.source_record_id,
    record_type: normalized.record_type,
    title: normalized.title,
    summary: normalized.summary,
    source_url: normalized.source_url,
    published_at: normalized.published_at,
    updated_at: normalized.updated_at,
    retrieved_at: retrievedAt,
    match_basis: snapshot.match_basis,
    entity_hints: [...new Set(normalized.entity_hints)],
    event_hints: normalized.event_hints,
    identifiers: normalized.identifiers,
    amounts: normalized.amounts,
    upstream_content_sha256: upstreamContentSha256,
    snapshot_sha256: snapshotSha256,
    snapshot_path: `receipts/crawl/${observationId}.json`,
    graph_effect: 'none',
    status: 'observed',
    causal_status: 'not_established',
    privacy: 'public-record-projection',
    snapshot
  };
}

export function candidateFromObservation(observation, existing) {
  const priority = observation.match_basis === 'title' ? 'high' : observation.match_basis === 'summary' || observation.match_basis === 'record' ? 'medium' : 'low';
  return {
    schema_version: 'official-candidate@1',
    candidate_id: observation.candidate_id,
    label: observation.title,
    status: 'intake_only',
    graph_effect: 'none',
    causal_status: 'not_established',
    source_id: observation.source_id,
    source_record_id: observation.source_record_id,
    first_seen: existing?.first_seen ?? observation.retrieved_at,
    last_seen: observation.retrieved_at,
    priority,
    match_basis: observation.match_basis,
    observation_ids: [...new Set([...(existing?.observation_ids ?? []), observation.observation_id])],
    entity_hints: [...new Set([...(existing?.entity_hints ?? []), ...observation.entity_hints])],
    event_hints: [...new Set([...(existing?.event_hints ?? []), ...observation.event_hints])],
    source_url: observation.source_url,
    next_step: 'Resolve canonical entities and attach independent claim-level receipts; promotion requires a human-reviewed PR.'
  };
}

export function containsPrivateContact(record) {
  const text = JSON.stringify(record);
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)
    || /\b(?:phone|mobile|street_address|mailing_address|pointOfContact|point_of_contact)\b/i.test(text);
}
