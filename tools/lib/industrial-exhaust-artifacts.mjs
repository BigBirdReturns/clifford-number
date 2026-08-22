import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  GRAPH_EFFECT,
  SOURCE_CLASS,
  canonicalizeUrl,
  classifyEventHints,
  cleanText,
  contentId,
  decodeXmlEntities,
  matchWatchTerms,
  redactContactData,
  sha256,
  stableJson,
  writeJson
} from './industrial-exhaust.mjs';

export const ARTIFACT_LANE = 'first_party_industrial_exhaust_artifact_hydration';
export const ARTIFACT_SCHEMA_VERSION = 1;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlAttribute(attributes, name) {
  const escaped = escapeRegExp(name);
  const quoted = String(attributes ?? '').match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'iu'));
  if (quoted) return decodeXmlEntities(quoted[2]).trim();
  const bare = String(attributes ?? '').match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*([^\\s>]+)`, 'iu'));
  return bare ? decodeXmlEntities(bare[1]).trim() : null;
}

function latestBy(records, keyName, revisionName = 'revision_number') {
  const map = new Map();
  for (const record of records) {
    const key = record?.[keyName];
    if (!key) continue;
    const current = map.get(key);
    if (!current || Number(record?.[revisionName] ?? 0) > Number(current?.[revisionName] ?? 0)) {
      map.set(key, record);
    }
  }
  return map;
}

function validateRevisionLineage(records, { label, idName, keyNames }) {
  if (!Array.isArray(records)) throw new Error(`${label} revision lineage must be an array`);
  const byId = new Map();
  const byRevision = new Map();

  for (const record of records) {
    const id = record?.[idName];
    if (typeof id !== 'string' || !id) throw new Error(`${label} revision is missing ${idName}`);
    if (byId.has(id)) throw new Error(`duplicate ${label} occurrence id: ${id}`);

    const keyParts = keyNames.map(keyName => record?.[keyName]);
    if (keyParts.some(value => typeof value !== 'string' || !value)) {
      throw new Error(`${label} revision ${id} lacks stable identity`);
    }
    const lineageKey = stableJson(keyParts);
    const revisionNumber = record?.revision_number;
    if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
      throw new Error(`${label} revision ${id} has an invalid revision_number`);
    }
    const revisionKey = stableJson([lineageKey, revisionNumber]);
    if (byRevision.has(revisionKey)) {
      throw new Error(`forked ${label} lineage at revision ${revisionNumber}: ${id}`);
    }

    const node = { id, lineageKey, revisionNumber, record };
    byId.set(id, node);
    byRevision.set(revisionKey, node);
  }

  for (const node of byId.values()) {
    const parentId = node.record.revision_of;
    if (node.revisionNumber === 1) {
      if (parentId !== null) {
        throw new Error(`${label} root ${node.id} must declare revision_of null`);
      }
      continue;
    }
    if (typeof parentId !== 'string' || !parentId) {
      throw new Error(`${label} revision ${node.id} is missing its predecessor`);
    }
    const parent = byId.get(parentId);
    if (!parent) {
      throw new Error(`${label} revision ${node.id} names a missing predecessor: ${parentId}`);
    }
    if (parent.lineageKey !== node.lineageKey) {
      throw new Error(`${label} revision ${node.id} crosses stable identity through revision_of`);
    }
    if (parent.revisionNumber !== node.revisionNumber - 1) {
      throw new Error(`${label} revision ${node.id} does not name its immediate predecessor`);
    }
  }

  return records;
}

export function validateDiscoveryRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'discovery',
    idName: 'discovery_id',
    keyNames: ['source_id', 'source_record_key']
  });
}

export function validateArtifactRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'artifact',
    idName: 'artifact_id',
    keyNames: ['artifact_record_key']
  });
}

function normalizeDate(value) {
  const raw = cleanText(value, 300);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function validateArtifactConfig(config) {
  if (!config || config.schema_version !== ARTIFACT_SCHEMA_VERSION || config.lane !== ARTIFACT_LANE) {
    throw new Error('artifact hydration config must use schema_version 1 and the bounded artifact lane');
  }
  if (!Array.isArray(config.indexes) || !config.indexes.length) throw new Error('artifact hydration config requires indexes[]');
  const ids = new Set();
  for (const source of config.indexes) {
    if (!/^[a-z0-9][a-z0-9_-]{2,80}$/u.test(source.id ?? '')) throw new Error(`invalid artifact index id: ${source.id}`);
    if (ids.has(source.id)) throw new Error(`duplicate artifact index id: ${source.id}`);
    ids.add(source.id);
    let indexUrl;
    try { indexUrl = new URL(source.index_url); } catch { throw new Error(`invalid artifact index URL for ${source.id}`); }
    if (indexUrl.protocol !== 'https:') throw new Error(`artifact index ${source.id} must use https`);
    if (source.index_format !== 'html_link_index') throw new Error(`unsupported artifact index format for ${source.id}`);
    if (source.source_class !== SOURCE_CLASS || source.graph_effect !== GRAPH_EFFECT) {
      throw new Error(`artifact index ${source.id} must remain first-party with graph_effect none`);
    }
    if (!Array.isArray(source.include_path_prefixes) || !source.include_path_prefixes.length
      || source.include_path_prefixes.some(prefix => !String(prefix).startsWith('/'))) {
      throw new Error(`artifact index ${source.id} requires absolute include_path_prefixes`);
    }
    if (!source.publisher || !source.surface) throw new Error(`artifact index ${source.id} lacks publisher or surface`);
    if (source.enabled !== true && source.enabled !== false) throw new Error(`artifact index ${source.id} must declare enabled boolean`);
  }
  const hydration = config.hydration;
  if (!hydration || !Array.isArray(hydration.allowed_hosts) || !hydration.allowed_hosts.length) {
    throw new Error('artifact hydration config requires allowed_hosts[]');
  }
  if (hydration.allowed_hosts.some(host => !/^[a-z0-9.-]+$/u.test(String(host)))) {
    throw new Error('artifact hydration allowed_hosts contains an invalid hostname');
  }
  const allowedHosts = new Set(hydration.allowed_hosts.map(host => String(host).toLowerCase()));
  if (allowedHosts.size !== hydration.allowed_hosts.length) {
    throw new Error('artifact hydration allowed_hosts contains duplicates');
  }
  for (const source of config.indexes) {
    const indexUrl = new URL(source.index_url);
    if (!allowedHosts.has(indexUrl.hostname.toLowerCase())) {
      throw new Error(`artifact index ${source.id} host is not allowlisted`);
    }
    if (indexUrl.username || indexUrl.password || (indexUrl.port && indexUrl.port !== '443')) {
      throw new Error(`artifact index ${source.id} must use credential-free standard HTTPS`);
    }
  }
  for (const [key, minimum] of [['default_limit', 1], ['max_bytes', 1000], ['max_normalized_chars', 1000], ['request_delay_ms', 0]]) {
    const value = Number(hydration[key]);
    if (!Number.isInteger(value) || value < minimum) throw new Error(`artifact hydration ${key} is invalid`);
  }
  if (config.graph_effect !== GRAPH_EFFECT || config.promotion_authority !== false
    || config.canonical_mutation_authorized !== false) {
    throw new Error('artifact hydration config may not authorize graph or canonical effects');
  }
  return config;
}

export function assertAllowedArtifactUrl(value, config) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`invalid artifact URL: ${value}`); }
  if (url.protocol !== 'https:') throw new Error(`artifact URL must use https: ${value}`);
  if (url.username || url.password) throw new Error(`artifact URL may not contain credentials: ${value}`);
  if (url.port && url.port !== '443') throw new Error(`artifact URL must use the standard HTTPS port: ${value}`);
  const allowed = new Set(config.hydration.allowed_hosts.map(host => String(host).toLowerCase()));
  if (!allowed.has(url.hostname.toLowerCase())) throw new Error(`artifact host is not allowlisted: ${url.hostname}`);
  url.hash = '';
  return url.href;
}

export function parseHtmlLinkIndex(html, source) {
  if (typeof html !== 'string' || !html.trim()) throw new Error(`empty HTML index body for ${source.id}`);
  const maxBytes = Number(source.max_bytes ?? 6_000_000);
  if (Buffer.byteLength(html, 'utf8') > maxBytes) throw new Error(`HTML index ${source.id} exceeds configured maximum`);
  if (!/<html\b|<!doctype\s+html/iu.test(html)) throw new Error(`unrecognized HTML index root for ${source.id}`);

  const prefixes = source.include_path_prefixes.map(prefix => String(prefix));
  const indexUrl = new URL(source.index_url);
  const records = new Map();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/giu)) {
    const rawHref = htmlAttribute(match[1], 'href');
    const canonicalUrl = canonicalizeUrl(rawHref, source.index_url);
    if (!canonicalUrl) continue;
    const url = new URL(canonicalUrl);
    if (url.hostname.toLowerCase() !== indexUrl.hostname.toLowerCase()) continue;
    if (!prefixes.some(prefix => url.pathname.startsWith(prefix)) || prefixes.includes(url.pathname)) continue;
    const title = cleanText(match[2], 700);
    if (!title) continue;
    const sourceRecordKey = sha256(`${source.id}|${canonicalUrl}`);
    if (records.has(sourceRecordKey)) continue;
    const normalized = { canonical_url: canonicalUrl, title };
    records.set(sourceRecordKey, {
      source_record_key: sourceRecordKey,
      source_record_id: canonicalUrl,
      canonical_url: canonicalUrl,
      title,
      summary: '',
      content_sha256: sha256(normalized),
      raw_item_sha256: sha256(match[0]),
      raw_html: match[0]
    });
  }
  if (!records.size) throw new Error(`HTML index ${source.id} contains no included publication links`);
  const items = [...records.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  return {
    index_title: cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu)?.[1], 500),
    index_sha256: sha256(html),
    item_count: items.length,
    items
  };
}

export function mergeDiscoveryRecords({ records, source, parsedIndex, capturedAt, indexReceiptPath }) {
  validateDiscoveryRevisionLineage(records);
  const merged = [...records];
  const latest = latestBy(merged.filter(record => record.source_id === source.id), 'source_record_key');
  const added = [];
  for (const item of parsedIndex.items) {
    const previous = latest.get(item.source_record_key) ?? null;
    if (previous?.content_sha256 === item.content_sha256) continue;
    const revisionNumber = previous ? Number(previous.revision_number ?? 1) + 1 : 1;
    const record = {
      schema_version: ARTIFACT_SCHEMA_VERSION,
      discovery_id: revisionOccurrenceId(
        'xdiscover',
        [source.id, item.source_record_key],
        previous?.discovery_id ?? null,
        item.content_sha256
      ),
      source_id: source.id,
      source_class: SOURCE_CLASS,
      publisher: source.publisher,
      publisher_resolution: source.publisher_resolution ?? null,
      surface: source.surface,
      source_index_url: source.index_url,
      source_record_key: item.source_record_key,
      source_record_id: item.source_record_id,
      canonical_url: item.canonical_url,
      title: item.title,
      summary: item.summary,
      captured_at: capturedAt,
      index_receipt_path: indexReceiptPath,
      index_sha256: parsedIndex.index_sha256,
      raw_item_sha256: item.raw_item_sha256,
      content_sha256: item.content_sha256,
      revision_of: previous?.discovery_id ?? null,
      revision_number: revisionNumber,
      evidence_class: 'first_party_attributed_statement',
      evidentiary_scope: 'publisher_index_listing_only',
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false
    };
    merged.push(record);
    latest.set(item.source_record_key, record);
    added.push(record);
  }
  merged.sort((a, b) => a.discovery_id.localeCompare(b.discovery_id));
  validateDiscoveryRevisionLineage(merged);
  return { records: merged, added };
}

function removeHtmlBlocks(html) {
  return String(html ?? '')
    .replace(/<!--([\s\S]*?)-->/gu, ' ')
    .replace(/<(script|style|noscript|svg|canvas|iframe|form|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ');
}

function extractMetaContent(html, selectorName, selectorValue) {
  for (const match of html.matchAll(/<meta\b([^>]*)\/?\s*>/giu)) {
    const attributes = match[1];
    const selector = htmlAttribute(attributes, selectorName);
    if (selector?.toLowerCase() !== selectorValue.toLowerCase()) continue;
    return htmlAttribute(attributes, 'content');
  }
  return null;
}

function firstElementBody(html, names) {
  for (const name of names) {
    const escaped = escapeRegExp(name);
    const match = html.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, 'iu'));
    if (match) return match[1];
  }
  return null;
}

function extractJsonLdPublishedAt(html) {
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/giu)) {
    const raw = decodeXmlEntities(match[2]).trim();
    try {
      const parsed = JSON.parse(raw);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const queue = [...values];
      while (queue.length) {
        const value = queue.shift();
        if (!value || typeof value !== 'object') continue;
        if (value.datePublished) return normalizeDate(value.datePublished);
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) queue.push(...child);
          else if (child && typeof child === 'object') queue.push(child);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function extractHtmlArtifact(html, canonicalUrl, maxNormalizedChars = 60_000) {
  if (typeof html !== 'string' || !html.trim()) throw new Error(`empty HTML artifact body for ${canonicalUrl}`);
  const challengeSample = html.slice(0, 250_000);
  const challengeMarkers = [
    /<title\b[^>]*>\s*just a moment/iu,
    /cf-chl-/iu,
    /challenges\.cloudflare\.com/iu,
    /enable javascript and cookies to continue/iu,
    /incapsula incident id/iu
  ];
  if (challengeMarkers.some(pattern => pattern.test(challengeSample))) {
    throw new Error(`HTML artifact is an access-control challenge for ${canonicalUrl}`);
  }
  const cleaned = removeHtmlBlocks(html);
  const articleHtml = firstElementBody(cleaned, ['article', 'main'])
    ?? firstElementBody(cleaned, ['body'])
    ?? cleaned;
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  const title = cleanText(
    ogTitle
      ?? html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/iu)?.[1]
      ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu)?.[1],
    700
  );
  const description = cleanText(
    extractMetaContent(html, 'name', 'description')
      ?? extractMetaContent(html, 'property', 'og:description'),
    3000
  );
  const bodyText = cleanText(articleHtml, Number(maxNormalizedChars));
  const normalizedText = redactContactData([description, bodyText].filter(Boolean).join('\n'))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, Number(maxNormalizedChars));
  if (!title && normalizedText.length < 80) throw new Error(`HTML artifact yielded no usable article projection for ${canonicalUrl}`);

  const publishedAt = normalizeDate(
    extractMetaContent(html, 'property', 'article:published_time')
      ?? extractMetaContent(html, 'name', 'date')
      ?? extractMetaContent(html, 'name', 'publish-date')
  ) ?? extractJsonLdPublishedAt(html);

  return {
    title,
    description,
    normalized_text: normalizedText,
    normalized_text_sha256: sha256(normalizedText),
    published_at: publishedAt
  };
}

export function buildHydrationCandidates({ baseAlerts, discoveryRecords, watchConfig }) {
  validateDiscoveryRevisionLineage(discoveryRecords);
  const candidates = new Map();
  const add = ({ canonicalUrl, sourceId, publisher, title, matchedTerms, recordType, recordId }) => {
    if (!canonicalUrl) return;
    const current = candidates.get(canonicalUrl) ?? {
      canonical_url: canonicalUrl,
      source_id: sourceId,
      publisher,
      title,
      seed_matched_terms: [],
      linked_records: []
    };
    current.seed_matched_terms = [...new Set([...current.seed_matched_terms, ...(matchedTerms ?? [])])].sort();
    if (!current.linked_records.some(record => record.record_type === recordType && record.record_id === recordId)) {
      current.linked_records.push({ record_type: recordType, record_id: recordId });
    }
    current.linked_records.sort((a, b) => `${a.record_type}|${a.record_id}`.localeCompare(`${b.record_type}|${b.record_id}`));
    candidates.set(canonicalUrl, current);
  };

  for (const alert of baseAlerts) {
    add({
      canonicalUrl: alert.canonical_url,
      sourceId: alert.source_id,
      publisher: alert.publisher,
      title: alert.title,
      matchedTerms: alert.matched_terms,
      recordType: 'feed_observation',
      recordId: alert.observation_id
    });
  }

  const latestDiscovery = latestBy(discoveryRecords, 'source_record_key');
  for (const record of latestDiscovery.values()) {
    const matched = matchWatchTerms(record, watchConfig);
    if (!matched.length) continue;
    add({
      canonicalUrl: record.canonical_url,
      sourceId: record.source_id,
      publisher: record.publisher,
      title: record.title,
      matchedTerms: matched,
      recordType: 'index_discovery',
      recordId: record.discovery_id
    });
  }

  const highPriority = new Set(['electric_twin', 'evidenza', 'generative_audiences', 'tsuyoshi_george_komuro']);
  return [...candidates.values()].sort((a, b) => {
    const aPriority = a.seed_matched_terms.some(term => highPriority.has(term)) ? 0 : 1;
    const bPriority = b.seed_matched_terms.some(term => highPriority.has(term)) ? 0 : 1;
    return aPriority - bPriority || a.canonical_url.localeCompare(b.canonical_url);
  });
}

export function selectHydrationCandidates(candidates, state, limit) {
  const positions = new Map(candidates.map((candidate, index) => [candidate.canonical_url, index]));
  const pageFor = candidate => state?.pages?.[candidate.canonical_url] ?? null;
  const rank = candidate => {
    const page = pageFor(candidate);
    if (!page) return 0;
    if (page.last_status === 'error') return 1;
    return 2;
  };
  const lastCheckedAt = candidate => String(pageFor(candidate)?.last_checked_at ?? '');
  return [...candidates]
    .sort((left, right) => rank(left) - rank(right)
      || lastCheckedAt(left).localeCompare(lastCheckedAt(right))
      || Number(positions.get(left.canonical_url)) - Number(positions.get(right.canonical_url)))
    .slice(0, limit);
}

function revisionOccurrenceId(prefix, stableParts, previousId, contentSha256) {
  const parts = Array.isArray(stableParts) ? stableParts : [stableParts];
  return previousId
    ? contentId(prefix, ...parts, previousId, contentSha256)
    : contentId(prefix, ...parts, contentSha256);
}

function artifactProjectionIdentity({ bodyRecord, bodySha256, contentType }) {
  const mediaType = String(contentType ?? '')
    .toLowerCase()
    .split(';', 1)[0]
    .trim();
  const projectionMode = mediaType === 'application/pdf' ? 'opaque_body' : 'semantic_text';
  return projectionMode === 'opaque_body'
    ? { projection_mode: projectionMode, ...bodyRecord, body_sha256: bodySha256 ?? null }
    : { projection_mode: projectionMode, ...bodyRecord };
}

export function mergeArtifactProjection({ artifacts, candidate, sourceProjection, capturedAt, bodyReceiptPath, bodySha256, responseHeaders }) {
  validateArtifactRevisionLineage(artifacts);
  const merged = [...artifacts];
  const recordKey = sha256(candidate.canonical_url);
  const latest = latestBy(merged, 'artifact_record_key');
  const previous = latest.get(recordKey) ?? null;
  const bodyRecord = {
    title: sourceProjection.title || candidate.title || '',
    description: sourceProjection.description ?? '',
    normalized_text: sourceProjection.normalized_text ?? '',
    normalized_text_sha256: sourceProjection.normalized_text_sha256 ?? null,
    published_at: sourceProjection.published_at ?? null
  };
  const projectionIdentity = artifactProjectionIdentity({
    bodyRecord,
    bodySha256,
    contentType: responseHeaders.content_type
  });
  const projectionSha256 = sha256(projectionIdentity);
  if (previous) {
    const previousBodyRecord = {
      title: previous.title ?? '',
      description: previous.description ?? '',
      normalized_text: previous.normalized_text ?? '',
      normalized_text_sha256: previous.normalized_text_sha256 ?? null,
      published_at: previous.published_at ?? null
    };
    const previousProjectionIdentity = artifactProjectionIdentity({
      bodyRecord: previousBodyRecord,
      bodySha256: previous.body_sha256 ?? null,
      contentType: previous.content_type
    });
    if (sha256(previousProjectionIdentity) === projectionSha256) {
      return { artifacts: merged, added: null, unchanged: previous };
    }
  }

  const watchConfig = responseHeaders.watch_config;
  const artifactMatchedTerms = sourceProjection.normalized_text
    ? matchWatchTerms({ title: bodyRecord.title, summary: sourceProjection.normalized_text }, watchConfig)
    : [];
  const matchedTerms = [...new Set([...candidate.seed_matched_terms, ...artifactMatchedTerms])].sort();
  const revisionNumber = previous ? Number(previous.revision_number ?? 1) + 1 : 1;
  const artifact = {
    schema_version: ARTIFACT_SCHEMA_VERSION,
    artifact_id: revisionOccurrenceId(
      'xartifact',
      recordKey,
      previous?.artifact_id ?? null,
      projectionSha256
    ),
    artifact_record_key: recordKey,
    source_id: candidate.source_id,
    source_class: SOURCE_CLASS,
    publisher: candidate.publisher,
    canonical_url: candidate.canonical_url,
    resolved_url: responseHeaders.final_url ?? candidate.canonical_url,
    redirect_chain: structuredClone(responseHeaders.redirect_chain ?? []),
    linked_records: candidate.linked_records,
    title: bodyRecord.title,
    description: bodyRecord.description,
    normalized_text: bodyRecord.normalized_text,
    normalized_text_sha256: bodyRecord.normalized_text_sha256,
    published_at: bodyRecord.published_at,
    captured_at: capturedAt,
    content_type: responseHeaders.content_type ?? null,
    etag: responseHeaders.etag ?? null,
    last_modified: responseHeaders.last_modified ?? null,
    body_receipt_path: bodyReceiptPath,
    body_sha256: bodySha256,
    projection_sha256: projectionSha256,
    seed_matched_terms: candidate.seed_matched_terms,
    artifact_matched_terms: artifactMatchedTerms,
    matched_terms: matchedTerms,
    event_hints: classifyEventHints({ title: bodyRecord.title, summary: bodyRecord.normalized_text }),
    revision_of: previous?.artifact_id ?? null,
    revision_number: revisionNumber,
    evidence_class: 'first_party_attributed_statement',
    evidentiary_scope: 'publisher_artifact_body_only',
    graph_effect: GRAPH_EFFECT,
    promotion_authority: false,
    canonical_mutation_authorized: false
  };
  merged.push(artifact);
  merged.sort((a, b) => a.artifact_id.localeCompare(b.artifact_id));
  validateArtifactRevisionLineage(merged);
  return { artifacts: merged, added: artifact, unchanged: null };
}

export function buildArtifactAlerts(artifacts, { watchConfig = null, candidates = [] } = {}) {
  validateArtifactRevisionLineage(artifacts);
  const latest = latestBy(artifacts, 'artifact_record_key');
  const candidatesByUrl = new Map(candidates.map(candidate => [candidate.canonical_url, candidate]));
  const alerts = [];
  for (const artifact of latest.values()) {
    const candidate = candidatesByUrl.get(artifact.canonical_url) ?? null;
    const artifactMatchedTerms = watchConfig
      ? matchWatchTerms({ title: artifact.title, summary: artifact.normalized_text }, watchConfig)
      : [...(artifact.artifact_matched_terms ?? [])];
    const seedMatchedTerms = watchConfig
      ? [...(candidate?.seed_matched_terms ?? [])]
      : [...(artifact.seed_matched_terms ?? [])];
    const matchedTerms = [...new Set([...seedMatchedTerms, ...artifactMatchedTerms])].sort();
    if (!matchedTerms.length) continue;
    const linkedRecords = candidate?.linked_records ?? artifact.linked_records;
    alerts.push({
      schema_version: ARTIFACT_SCHEMA_VERSION,
      alert_id: contentId('xartifact_alert', artifact.artifact_id, matchedTerms.join(',')),
      artifact_id: artifact.artifact_id,
      source_id: artifact.source_id,
      publisher: artifact.publisher,
      title: artifact.title,
      canonical_url: artifact.canonical_url,
      published_at: artifact.published_at,
      revision_number: artifact.revision_number,
      linked_records: linkedRecords,
      seed_matched_terms: seedMatchedTerms,
      artifact_matched_terms: artifactMatchedTerms,
      matched_terms: matchedTerms,
      event_hints: artifact.event_hints,
      match_scope: 'hydrated_publisher_artifact',
      evidence_class: 'first_party_attributed_statement',
      review_status: 'queued',
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false,
      forbidden_inferences: [
        'publisher statement independently proves the statement',
        'shared product category proves a commercial relationship',
        'article-body mention automatically creates an actor or relationship edge',
        'profile attention establishes motive or corporate direction'
      ]
    });
  }
  return alerts.sort((a, b) => a.alert_id.localeCompare(b.alert_id));
}

export function indexReceiptPath(rootDir, sourceId, hash) {
  return path.join(rootDir, 'receipts', 'exhaust', 'indexes', sourceId, `${hash}.json`);
}

export function writeIndexReceipt({ rootDir, source, parsedIndex, html, capturedAt, responseHeaders = {} }) {
  const receiptPath = indexReceiptPath(rootDir, source.id, parsedIndex.index_sha256);
  if (!fs.existsSync(receiptPath)) {
    writeJson(receiptPath, {
      schema_version: ARTIFACT_SCHEMA_VERSION,
      receipt_type: 'first_party_publication_index_snapshot',
      source_id: source.id,
      source_class: SOURCE_CLASS,
      publisher: source.publisher,
      publisher_resolution: source.publisher_resolution ?? null,
      index_url: source.index_url,
      captured_at: capturedAt,
      index_sha256: parsedIndex.index_sha256,
      index_title: parsedIndex.index_title,
      item_count: parsedIndex.item_count,
      response_headers: {
        content_type: responseHeaders.content_type ?? null,
        etag: responseHeaders.etag ?? null,
        last_modified: responseHeaders.last_modified ?? null
      },
      body_encoding: 'utf-8',
      body: html,
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false
    });
  }
  return path.relative(rootDir, receiptPath).split(path.sep).join('/');
}

export function artifactReceiptPath(rootDir, canonicalUrl, bodyHash) {
  const url = new URL(canonicalUrl);
  const safeHost = url.hostname.toLowerCase().replace(/[^a-z0-9.-]+/gu, '_');
  const recordKey = sha256(url.href);
  return path.join(rootDir, 'receipts', 'exhaust', 'artifacts', safeHost, recordKey, `${bodyHash}.json`);
}

export function writeArtifactReceipt({ rootDir, canonicalUrl, body, bodySha256, capturedAt, responseHeaders = {} }) {
  const computedBodySha256 = crypto.createHash('sha256').update(body).digest('hex');
  if (computedBodySha256 !== bodySha256) throw new Error('artifact body hash does not match supplied digest');
  const receiptPath = artifactReceiptPath(rootDir, canonicalUrl, bodySha256);
  const contentType = responseHeaders.content_type ?? '';
  const isText = contentType.startsWith('text/')
    || /(?:json|xml|html|javascript)/iu.test(contentType)
    || contentType === '';
  const payload = {
    schema_version: ARTIFACT_SCHEMA_VERSION,
    receipt_type: 'first_party_publication_artifact_snapshot',
    source_class: SOURCE_CLASS,
    canonical_url: canonicalUrl,
    resolved_url: responseHeaders.final_url ?? canonicalUrl,
    redirect_chain: structuredClone(responseHeaders.redirect_chain ?? []),
    captured_at: capturedAt,
    body_sha256: bodySha256,
    response_headers: {
      content_type: responseHeaders.content_type ?? null,
      etag: responseHeaders.etag ?? null,
      last_modified: responseHeaders.last_modified ?? null
    },
    body_encoding: isText ? 'utf-8' : 'base64',
    body: isText ? body.toString('utf8') : body.toString('base64'),
    graph_effect: GRAPH_EFFECT,
    promotion_authority: false,
    canonical_mutation_authorized: false
  };
  if (fs.existsSync(receiptPath)) {
    const existing = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    if (existing.canonical_url !== canonicalUrl || existing.body_sha256 !== bodySha256) {
      throw new Error('existing artifact receipt conflicts with URL or body custody');
    }
  } else {
    writeJson(receiptPath, payload);
  }
  return path.relative(rootDir, receiptPath).split(path.sep).join('/');
}

export function artifactStateTemplate() {
  return {
    schema_version: ARTIFACT_SCHEMA_VERSION,
    lane: ARTIFACT_LANE,
    last_run_at: null,
    indexes: {},
    pages: {},
    graph_effect: GRAPH_EFFECT,
    promotion_authority: false,
    canonical_mutation_authorized: false
  };
}

export function projectionFingerprint(value) {
  return sha256(stableJson(value));
}
