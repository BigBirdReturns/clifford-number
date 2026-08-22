#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"{label}: start anchor not found")
    if text.find(start, start_index + len(start)) >= 0:
        raise SystemExit(f"{label}: start anchor is not unique")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"{label}: end anchor not found")
    return text[:start_index] + replacement + text[end_index:]


root = pathlib.Path(sys.argv[1]).resolve()
source_path = root / "tools/lib/industrial-exhaust-artifacts.mjs"
source = source_path.read_text(encoding="utf-8")

receipt_store_block = r'''function receiptBodySha256(receipt, label) {
  return crypto.createHash('sha256').update(receiptBodyBytes(receipt, label)).digest('hex');
}

function discoveryAnchorKeys(html, indexUrl) {
  const keys = new Set();
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/giu)) {
    const canonicalUrl = canonicalizeUrl(htmlAttribute(match[1], 'href'), indexUrl);
    const title = cleanText(match[2], 700);
    if (!canonicalUrl || !title) continue;
    keys.add(stableJson([canonicalUrl, title, sha256(match[0])]));
  }
  return keys;
}

function walkReceiptJson(rootDir, relativeDir) {
  const root = path.resolve(rootDir);
  const base = path.resolve(root, ...relativeDir.split('/'));
  const relativeBase = path.relative(root, base);
  if (!relativeBase || relativeBase.startsWith(`..${path.sep}`) || path.isAbsolute(relativeBase)) {
    throw new Error(`receipt store directory escapes repository root: ${relativeDir}`);
  }
  if (!fs.existsSync(base)) return [];

  const result = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.json')) result.push(portableReceiptPath(root, absolutePath));
      } else {
        throw new Error(`receipt store contains an unsupported entry: ${portableReceiptPath(root, absolutePath)}`);
      }
    }
  };
  visit(base);
  return result.sort();
}

function assertReceiptGovernance(receipt, label) {
  if (receipt.source_class !== SOURCE_CLASS || receipt.graph_effect !== GRAPH_EFFECT
    || receipt.promotion_authority !== false || receipt.canonical_mutation_authorized !== false) {
    throw new Error(`${label} exceeds its governance boundary`);
  }
}

function validateIndexReceiptAtPath({
  rootDir,
  relativePath,
  expectedSourceId,
  expectedIndexUrl,
  expectedIndexSha256,
  expectedBody
}) {
  const label = `index receipt ${relativePath}`;
  const match = relativePath.match(/^receipts\/exhaust\/indexes\/([^/]+)\/([a-f0-9]{64})\.json$/u);
  if (!match) throw new Error(`${label} path is not canonical`);
  const [, pathSourceId, pathIndexSha256] = match;
  const receipt = loadReceiptJson(rootDir, relativePath, label);
  if (receipt.schema_version !== ARTIFACT_SCHEMA_VERSION
    || receipt.receipt_type !== 'first_party_publication_index_snapshot') {
    throw new Error(`${label} has an invalid receipt contract`);
  }
  if (receipt.source_id !== pathSourceId || receipt.index_sha256 !== pathIndexSha256) {
    throw new Error(`${label} identity does not match its path`);
  }
  if (typeof receipt.index_url !== 'string' || !receipt.index_url) {
    throw new Error(`${label} lacks index_url`);
  }
  if (receipt.body_encoding !== 'utf-8' || typeof receipt.body !== 'string') {
    throw new Error(`${label} must retain a UTF-8 body`);
  }
  assertReceiptGovernance(receipt, label);

  const computedBodySha256 = sha256(receipt.body);
  let custodyMode;
  if (receipt.body_sha256 === undefined) {
    custodyMode = 'legacy_anchor_bound';
  } else {
    const storedBodySha256 = assertSha256Digest(receipt.body_sha256, `${label} body_sha256`);
    if (computedBodySha256 !== storedBodySha256) {
      throw new Error(`${label} body bytes do not match body_sha256`);
    }
    custodyMode = 'byte_verified';
  }

  if (expectedSourceId !== undefined && receipt.source_id !== expectedSourceId) {
    throw new Error(`${label} conflicts with expected source custody`);
  }
  if (expectedIndexUrl !== undefined && receipt.index_url !== expectedIndexUrl) {
    throw new Error(`${label} conflicts with expected index URL custody`);
  }
  if (expectedIndexSha256 !== undefined && receipt.index_sha256 !== expectedIndexSha256) {
    throw new Error(`${label} conflicts with expected index digest custody`);
  }
  if (expectedBody !== undefined && receipt.body !== expectedBody) {
    throw new Error(`${label} conflicts with retained body bytes`);
  }

  return {
    receipt,
    anchors: discoveryAnchorKeys(receipt.body, receipt.index_url),
    custody_mode: custodyMode,
    computed_body_sha256: computedBodySha256,
    legacy_body_matches_index: custodyMode === 'legacy_anchor_bound'
      && computedBodySha256 === receipt.index_sha256
  };
}

function validateArtifactReceiptAtPath({
  rootDir,
  relativePath,
  expectedCanonicalUrl,
  expectedBodySha256,
  expectedBody
}) {
  const label = `artifact receipt ${relativePath}`;
  const match = relativePath.match(
    /^receipts\/exhaust\/artifacts\/([^/]+)\/([a-f0-9]{64})\/([a-f0-9]{64})\.json$/u
  );
  if (!match) throw new Error(`${label} path is not canonical`);
  const [, pathHost, pathRecordKey, pathBodySha256] = match;
  const receipt = loadReceiptJson(rootDir, relativePath, label);
  if (receipt.schema_version !== ARTIFACT_SCHEMA_VERSION
    || receipt.receipt_type !== 'first_party_publication_artifact_snapshot') {
    throw new Error(`${label} has an invalid receipt contract`);
  }
  if (typeof receipt.canonical_url !== 'string' || !receipt.canonical_url) {
    throw new Error(`${label} lacks canonical_url`);
  }
  let canonicalUrl;
  try {
    canonicalUrl = new URL(receipt.canonical_url);
  } catch (error) {
    throw new Error(`${label} has an invalid canonical_url: ${error.message}`);
  }
  const safeHost = canonicalUrl.hostname.toLowerCase().replace(/[^a-z0-9.-]+/gu, '_');
  if (safeHost !== pathHost || sha256(canonicalUrl.href) !== pathRecordKey) {
    throw new Error(`${label} URL identity does not match its path`);
  }
  const bodySha256 = assertSha256Digest(receipt.body_sha256, `${label} body_sha256`);
  if (bodySha256 !== pathBodySha256) {
    throw new Error(`${label} body identity does not match its path`);
  }
  const bodyBytes = receiptBodyBytes(receipt, label);
  if (crypto.createHash('sha256').update(bodyBytes).digest('hex') !== bodySha256) {
    throw new Error(`${label} body bytes do not match body_sha256`);
  }
  assertReceiptGovernance(receipt, label);

  if (expectedCanonicalUrl !== undefined && receipt.canonical_url !== expectedCanonicalUrl) {
    throw new Error(`${label} conflicts with expected URL custody`);
  }
  if (expectedBodySha256 !== undefined && receipt.body_sha256 !== expectedBodySha256) {
    throw new Error(`${label} conflicts with expected body digest custody`);
  }
  if (expectedBody !== undefined && !bodyBytes.equals(Buffer.from(expectedBody))) {
    throw new Error(`${label} conflicts with retained body bytes`);
  }

  return { receipt, body_bytes: bodyBytes };
}

function loadIndustrialExhaustReceiptStore(rootDir) {
  const root = path.resolve(rootDir);
  const indexReceipts = new Map();
  const artifactReceipts = new Map();
  let byteVerifiedIndexes = 0;
  let legacyIndexes = 0;
  let legacyBodyMatchesIndex = 0;
  let legacyBodyDiffersFromIndex = 0;

  for (const relativePath of walkReceiptJson(root, 'receipts/exhaust/indexes')) {
    const validated = validateIndexReceiptAtPath({ rootDir: root, relativePath });
    indexReceipts.set(relativePath, validated);
    if (validated.custody_mode === 'byte_verified') {
      byteVerifiedIndexes += 1;
    } else {
      legacyIndexes += 1;
      if (validated.legacy_body_matches_index) legacyBodyMatchesIndex += 1;
      else legacyBodyDiffersFromIndex += 1;
    }
  }

  for (const relativePath of walkReceiptJson(root, 'receipts/exhaust/artifacts')) {
    artifactReceipts.set(
      relativePath,
      validateArtifactReceiptAtPath({ rootDir: root, relativePath })
    );
  }

  return {
    root,
    index_receipts: indexReceipts,
    artifact_receipts: artifactReceipts,
    summary: {
      index_receipt_count: indexReceipts.size,
      byte_verified_index_receipt_count: byteVerifiedIndexes,
      legacy_anchor_bound_index_receipt_count: legacyIndexes,
      legacy_body_digest_matches_index_count: legacyBodyMatchesIndex,
      legacy_body_digest_differs_from_index_count: legacyBodyDiffersFromIndex,
      artifact_receipt_count: artifactReceipts.size,
      byte_verified_artifact_receipt_count: artifactReceipts.size
    }
  };
}

export function validateIndustrialExhaustReceiptStore({ rootDir }) {
  return structuredClone(loadIndustrialExhaustReceiptStore(rootDir).summary);
}

export function validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }) {
  const store = loadIndustrialExhaustReceiptStore(rootDir);
  const root = store.root;
  validateDiscoveryRevisionLineage(discoveryRecords);
  validateArtifactRevisionLineage(artifacts);
  const referencedIndexPaths = new Set();
  const referencedArtifactPaths = new Set();

  for (const record of discoveryRecords) {
    const id = record.discovery_id;
    const indexSha256 = assertSha256Digest(record.index_sha256, `discovery revision ${id} index_sha256`);
    const rawItemSha256 = assertSha256Digest(record.raw_item_sha256, `discovery revision ${id} raw_item_sha256`);
    const expectedPath = portableReceiptPath(root, indexReceiptPath(root, record.source_id, indexSha256));
    if (record.index_receipt_path !== expectedPath) {
      throw new Error(`discovery revision ${id} index_receipt_path does not match source_id and index_sha256`);
    }
    const cached = store.index_receipts.get(expectedPath);
    if (!cached) throw new Error(`index receipt ${expectedPath} does not exist: ${expectedPath}`);
    if (cached.receipt.source_id !== record.source_id || cached.receipt.index_url !== record.source_index_url
      || cached.receipt.index_sha256 !== indexSha256) {
      throw new Error(`discovery revision ${id} is rebound to an unrelated index receipt`);
    }
    const anchorKey = stableJson([record.canonical_url, record.title, rawItemSha256]);
    if (!cached.anchors.has(anchorKey)) {
      throw new Error(`discovery revision ${id} raw_item_sha256 does not identify its stored index anchor`);
    }
    referencedIndexPaths.add(expectedPath);
  }

  for (const record of artifacts) {
    const id = record.artifact_id;
    const bodySha256 = assertSha256Digest(record.body_sha256, `artifact revision ${id} body_sha256`);
    const expectedPath = portableReceiptPath(root, artifactReceiptPath(root, record.canonical_url, bodySha256));
    if (record.body_receipt_path !== expectedPath) {
      throw new Error(`artifact revision ${id} body_receipt_path does not match canonical_url and body_sha256`);
    }
    const cached = store.artifact_receipts.get(expectedPath);
    if (!cached) throw new Error(`artifact receipt ${expectedPath} does not exist: ${expectedPath}`);
    if (cached.receipt.canonical_url !== record.canonical_url
      || cached.receipt.body_sha256 !== bodySha256) {
      throw new Error(`artifact revision ${id} is rebound to an unrelated body receipt`);
    }
    referencedArtifactPaths.add(expectedPath);
  }

  const referencedIndexModes = [...referencedIndexPaths]
    .map(relativePath => store.index_receipts.get(relativePath).custody_mode);
  return {
    discovery_record_count: discoveryRecords.length,
    artifact_record_count: artifacts.length,
    index_receipt_count: referencedIndexPaths.size,
    byte_verified_index_receipt_count: referencedIndexModes
      .filter(mode => mode === 'byte_verified').length,
    legacy_anchor_bound_index_receipt_count: referencedIndexModes
      .filter(mode => mode === 'legacy_anchor_bound').length,
    artifact_receipt_count: referencedArtifactPaths.size,
    byte_verified_artifact_receipt_count: referencedArtifactPaths.size
  };
}

'''

write_index_block = r'''export function writeIndexReceipt({ rootDir, source, parsedIndex, html, capturedAt, responseHeaders = {} }) {
  const computedBodySha256 = sha256(html);
  if (parsedIndex.index_sha256 !== computedBodySha256) {
    throw new Error('index body hash does not match parsed index digest');
  }
  const receiptPath = indexReceiptPath(rootDir, source.id, parsedIndex.index_sha256);
  const relativePath = portableReceiptPath(rootDir, receiptPath);
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
      body_sha256: computedBodySha256,
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
  validateIndexReceiptAtPath({
    rootDir,
    relativePath,
    expectedSourceId: source.id,
    expectedIndexUrl: source.index_url,
    expectedIndexSha256: parsedIndex.index_sha256,
    expectedBody: html
  });
  return relativePath;
}

'''

write_artifact_block = r'''export function writeArtifactReceipt({ rootDir, canonicalUrl, body, bodySha256, capturedAt, responseHeaders = {} }) {
  const computedBodySha256 = crypto.createHash('sha256').update(body).digest('hex');
  if (computedBodySha256 !== bodySha256) throw new Error('artifact body hash does not match supplied digest');
  const receiptPath = artifactReceiptPath(rootDir, canonicalUrl, bodySha256);
  const relativePath = portableReceiptPath(rootDir, receiptPath);
  const contentType = String(responseHeaders.content_type ?? '');
  const isText = contentType.startsWith('text/')
    || /(?:json|xml|html|javascript)/iu.test(contentType)
    || contentType === '';
  if (!fs.existsSync(receiptPath)) {
    writeJson(receiptPath, {
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
    });
  }
  validateArtifactReceiptAtPath({
    rootDir,
    relativePath,
    expectedCanonicalUrl: canonicalUrl,
    expectedBodySha256: bodySha256,
    expectedBody: body
  });
  return relativePath;
}

'''

source = replace_between(
    source,
    "function receiptBodySha256(receipt, label) {",
    "function normalizeDate(value) {",
    receipt_store_block,
    "retained receipt store validator",
)
source = replace_between(
    source,
    "export function writeIndexReceipt(",
    "export function artifactReceiptPath(",
    write_index_block,
    "index receipt writer",
)
source = replace_between(
    source,
    "export function writeArtifactReceipt(",
    "export function artifactStateTemplate(",
    write_artifact_block,
    "artifact receipt writer",
)

if source.count("export function validateIndustrialExhaustReceiptStore") != 1:
    raise SystemExit("full-store validator export count is invalid")
source_path.write_text(source, encoding="utf-8")
