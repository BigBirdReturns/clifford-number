import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
  stableJson
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

function assertSha256Digest(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function storedArtifactBodyRecord(record, id) {
  const title = record?.title ?? '';
  const description = record?.description ?? '';
  const normalizedText = record?.normalized_text ?? '';
  const publishedAt = record?.published_at ?? null;
  if (typeof title !== 'string' || typeof description !== 'string' || typeof normalizedText !== 'string') {
    throw new Error(`artifact revision ${id} has non-string projection text`);
  }
  if (publishedAt !== null && typeof publishedAt !== 'string') {
    throw new Error(`artifact revision ${id} has an invalid published_at value`);
  }
  const normalizedTextSha256 = record?.normalized_text_sha256;
  if (normalizedTextSha256 === null) {
    if (normalizedText !== '') {
      throw new Error(`artifact revision ${id} has normalized text without normalized_text_sha256`);
    }
  } else if (normalizedTextSha256 !== sha256(normalizedText)) {
    throw new Error(`artifact revision ${id} normalized_text_sha256 does not match normalized_text`);
  }
  return {
    title,
    description,
    normalized_text: normalizedText,
    normalized_text_sha256: normalizedTextSha256,
    published_at: publishedAt
  };
}

function validateDiscoveryRevisionRecord(record, id) {
  const sourceId = record?.source_id;
  const canonicalUrl = record?.canonical_url;
  const title = record?.title;
  if (typeof sourceId !== 'string' || !sourceId || typeof canonicalUrl !== 'string' || !canonicalUrl
    || typeof title !== 'string') {
    throw new Error(`discovery revision ${id} lacks canonical source content`);
  }
  const expectedRecordKey = sha256(`${sourceId}|${canonicalUrl}`);
  if (record.source_record_key !== expectedRecordKey) {
    throw new Error(`discovery revision ${id} source_record_key does not match source_id and canonical_url`);
  }
  const expectedContentSha256 = sha256({ canonical_url: canonicalUrl, title });
  if (record.content_sha256 !== expectedContentSha256) {
    throw new Error(`discovery revision ${id} content_sha256 does not match canonical discovery content`);
  }
  return {
    occurrencePrefix: 'xdiscover',
    occurrenceParts: [sourceId, expectedRecordKey],
    payloadDigest: expectedContentSha256,
    allowLegacyOccurrence: false,
    projectionContract: null
  };
}

function validateArtifactRevisionRecord(record, id) {
  const canonicalUrl = record?.canonical_url;
  if (typeof canonicalUrl !== 'string' || !canonicalUrl) {
    throw new Error(`artifact revision ${id} lacks canonical_url`);
  }
  const expectedRecordKey = sha256(canonicalUrl);
  if (record.artifact_record_key !== expectedRecordKey) {
    throw new Error(`artifact revision ${id} artifact_record_key does not match canonical_url`);
  }
  const bodyRecord = storedArtifactBodyRecord(record, id);
  const bodySha256 = assertSha256Digest(record?.body_sha256, `artifact revision ${id} body_sha256`);
  const projectionSha256 = assertSha256Digest(
    record?.projection_sha256,
    `artifact revision ${id} projection_sha256`
  );
  const legacyProjectionSha256 = sha256({ ...bodyRecord, body_sha256: bodySha256 });
  const currentProjectionSha256 = sha256(artifactProjectionIdentity({
    bodyRecord,
    bodySha256,
    contentType: record?.content_type
  }));
  let projectionContract;
  if (projectionSha256 === currentProjectionSha256) {
    projectionContract = 'current_projection';
  } else if (projectionSha256 === legacyProjectionSha256) {
    projectionContract = 'legacy_body_bound';
  } else {
    throw new Error(`artifact revision ${id} projection_sha256 does not match a supported projection contract`);
  }
  return {
    occurrencePrefix: 'xartifact',
    occurrenceParts: [expectedRecordKey],
    payloadDigest: projectionSha256,
    allowLegacyOccurrence: projectionContract === 'legacy_body_bound',
    projectionContract
  };
}

function validateRevisionLineage(records, { label, idName, keyNames, validateRecord }) {
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

    const custody = validateRecord(record, id);
    const node = {
      id,
      lineageKey,
      revisionNumber,
      record,
      custody,
      occurrenceScheme: null
    };
    byId.set(id, node);
    byRevision.set(revisionKey, node);
  }

  for (const node of byId.values()) {
    const parentId = node.record.revision_of;
    if (node.revisionNumber === 1) {
      if (parentId !== null) {
        throw new Error(`${label} root ${node.id} must declare revision_of null`);
      }
      const expectedRootId = revisionOccurrenceId(
        node.custody.occurrencePrefix,
        node.custody.occurrenceParts,
        null,
        node.custody.payloadDigest
      );
      if (node.id !== expectedRootId) {
        throw new Error(`${label} root ${node.id} occurrence id does not match its canonical payload`);
      }
      node.occurrenceScheme = 'root';
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

    const expectedPredecessorBoundId = revisionOccurrenceId(
      node.custody.occurrencePrefix,
      node.custody.occurrenceParts,
      parentId,
      node.custody.payloadDigest
    );
    const expectedLegacyId = revisionOccurrenceId(
      node.custody.occurrencePrefix,
      node.custody.occurrenceParts,
      null,
      node.custody.payloadDigest
    );
    if (node.id === expectedPredecessorBoundId) {
      node.occurrenceScheme = 'predecessor_bound';
    } else if (node.custody.allowLegacyOccurrence && node.id === expectedLegacyId) {
      node.occurrenceScheme = 'legacy';
    } else if (node.custody.allowLegacyOccurrence) {
      throw new Error(`${label} revision ${node.id} occurrence id matches neither supported contract`);
    } else {
      throw new Error(`${label} revision ${node.id} must use a predecessor-bound occurrence id`);
    }
  }

  for (const node of byId.values()) {
    if (node.revisionNumber === 1) continue;
    const parent = byId.get(node.record.revision_of);
    if (parent.occurrenceScheme === 'predecessor_bound' && node.occurrenceScheme !== 'predecessor_bound') {
      throw new Error(`${label} revision ${node.id} may not return to a legacy occurrence contract`);
    }
    if (parent.custody.projectionContract === 'current_projection'
      && node.custody.projectionContract === 'legacy_body_bound') {
      throw new Error(`artifact revision ${node.id} may not return to the legacy projection contract`);
    }
  }

  return records;
}

export function validateDiscoveryRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'discovery',
    idName: 'discovery_id',
    keyNames: ['source_id', 'source_record_key'],
    validateRecord: validateDiscoveryRevisionRecord
  });
}

export function validateArtifactRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'artifact',
    idName: 'artifact_id',
    keyNames: ['artifact_record_key'],
    validateRecord: validateArtifactRevisionRecord
  });
}

function sameReceiptIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function inspectReceiptRoot(rootDir) {
  const root = path.resolve(rootDir);
  let before;
  try {
    before = fs.lstatSync(root);
  } catch (error) {
    throw new Error(`receipt repository root inspection failed: ${error.message}`);
  }
  if (!before.isDirectory()) {
    throw new Error(`receipt repository root contains an unsupported path entry: ${root}`);
  }

  let canonicalRoot;
  try {
    canonicalRoot = fs.realpathSync.native(root);
  } catch (error) {
    throw new Error(`receipt repository root resolution failed: ${error.message}`);
  }
  if (canonicalRoot !== root) {
    throw new Error(`receipt repository root is not canonical: ${root}`);
  }

  let after;
  try {
    after = fs.lstatSync(root);
  } catch (error) {
    throw new Error(`receipt repository root reinspection failed: ${error.message}`);
  }
  if (!after.isDirectory() || !sameReceiptIdentity(before, after)) {
    throw new Error(`receipt repository root identity changed during inspection: ${root}`);
  }
  return {
    root,
    identity: { dev: after.dev, ino: after.ino }
  };
}

function resolveReceiptRoot(rootDir) {
  return inspectReceiptRoot(rootDir).root;
}

function portableReceiptPath(rootDir, absolutePath) {
  const relative = path.relative(resolveReceiptRoot(rootDir), path.resolve(absolutePath));
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`receipt path escapes repository root: ${absolutePath}`);
  }
  return relative.split(path.sep).join('/');
}

function inspectReceiptPath(rootDir, relativePath, { label, leafType }) {
  const root = resolveReceiptRoot(rootDir);
  const segments = String(relativePath).split('/');
  const absolutePath = path.resolve(root, ...segments);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === 'ENOENT') return { absolutePath, exists: false };
      throw new Error(`${label} path inspection failed: ${error.message}`);
    }
    const expectsDirectory = index < segments.length - 1 || leafType === 'directory';
    if (expectsDirectory ? !stats.isDirectory() : !stats.isFile()) {
      throw new Error(
        `${label} contains an unsupported path entry: ${portableReceiptPath(root, current)}`
      );
    }
    if (!expectsDirectory && stats.nlink !== 1) {
      throw new Error(
        `${label} contains a multiply linked receipt file: ${portableReceiptPath(root, current)}`
      );
    }
  }
  return { absolutePath, exists: true };
}

function assertReceiptJsonObject(receipt, label) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return receipt;
}

function parseReceiptJsonText(text, label) {
  let receipt;
  try {
    receipt = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  return assertReceiptJsonObject(receipt, label);
}

function loadReceiptJson(rootDir, relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath
    || relativePath.startsWith('/') || relativePath.includes('\\')
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith('../')) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  const root = resolveReceiptRoot(rootDir);
  const absolutePath = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(root, absolutePath);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes repository root`);
  }
  const inspected = inspectReceiptPath(root, relativePath, { label, leafType: 'file' });
  if (!inspected.exists) throw new Error(`${label} does not exist: ${relativePath}`);
  return parseReceiptJsonText(fs.readFileSync(absolutePath, 'utf8'), label);
}

function receiptBodyBytes(receipt, label) {
  if (typeof receipt.body !== 'string') throw new Error(`${label} lacks a string body`);
  if (receipt.body_encoding === 'utf-8') return Buffer.from(receipt.body, 'utf8');
  if (receipt.body_encoding === 'base64') {
    const compact = receipt.body.replace(/\s+/gu, '');
    const bytes = Buffer.from(compact, 'base64');
    if (bytes.toString('base64').replace(/=+$/u, '') !== compact.replace(/=+$/u, '')) {
      throw new Error(`${label} contains invalid base64 body data`);
    }
    return bytes;
  }
  throw new Error(`${label} has unsupported body_encoding ${receipt.body_encoding ?? 'missing'}`);
}

function receiptBodySha256(receipt, label) {
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
  const root = resolveReceiptRoot(rootDir);
  const base = path.resolve(root, ...relativeDir.split('/'));
  const relativeBase = path.relative(root, base);
  if (!relativeBase || relativeBase.startsWith(`..${path.sep}`) || path.isAbsolute(relativeBase)) {
    throw new Error(`receipt store directory escapes repository root: ${relativeDir}`);
  }
  const inspected = inspectReceiptPath(root, relativeDir, {
    label: `receipt store directory ${relativeDir}`,
    leafType: 'directory'
  });
  if (!inspected.exists) return [];

  const maxDirectoryDepth = relativeDir === 'receipts/exhaust/indexes'
    ? 1
    : relativeDir === 'receipts/exhaust/artifacts'
      ? 2
      : null;
  if (maxDirectoryDepth === null) {
    throw new Error(`unsupported receipt store directory: ${relativeDir}`);
  }

  const result = [];
  const visit = (current, depth) => {
    let fileCount = 0;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = portableReceiptPath(root, absolutePath);
      if (entry.isDirectory()) {
        if (depth >= maxDirectoryDepth) {
          throw new Error(`receipt store contains an unsupported directory: ${relativePath}`);
        }
        const nestedFileCount = visit(absolutePath, depth + 1);
        if (nestedFileCount === 0) {
          throw new Error(`receipt store contains an empty directory: ${relativePath}`);
        }
        fileCount += nestedFileCount;
      } else if (entry.isFile()) {
        if (!entry.name.endsWith('.json')) {
          throw new Error(`receipt store contains an unsupported file: ${relativePath}`);
        }
        result.push(relativePath);
        fileCount += 1;
      } else {
        throw new Error(`receipt store contains an unsupported entry: ${relativePath}`);
      }
    }
    return fileCount;
  };
  visit(base, 0);
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
  expectedBody,
  receiptOverride
}) {
  const label = `index receipt ${relativePath}`;
  const match = relativePath.match(/^receipts\/exhaust\/indexes\/([^/]+)\/([a-f0-9]{64})\.json$/u);
  if (!match) throw new Error(`${label} path is not canonical`);
  const [, pathSourceId, pathIndexSha256] = match;
  const receipt = receiptOverride === undefined
  ? loadReceiptJson(rootDir, relativePath, label)
  : assertReceiptJsonObject(receiptOverride, label);
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
  expectedBody,
  receiptOverride
}) {
  const label = `artifact receipt ${relativePath}`;
  const match = relativePath.match(
    /^receipts\/exhaust\/artifacts\/([^/]+)\/([a-f0-9]{64})\/([a-f0-9]{64})\.json$/u
  );
  if (!match) throw new Error(`${label} path is not canonical`);
  const [, pathHost, pathRecordKey, pathBodySha256] = match;
  const receipt = receiptOverride === undefined
  ? loadReceiptJson(rootDir, relativePath, label)
  : assertReceiptJsonObject(receiptOverride, label);
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
  const root = resolveReceiptRoot(rootDir);
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

const RECEIPT_DIRFD_HELPER_INTERPRETER = '/usr/bin/python3';
const RECEIPT_DIRFD_CONTROL_SYMBOL = Symbol.for(
  'clifford-number.industrial-exhaust.receipt-dirfd-control'
);
const RECEIPT_DIRFD_HELPER_MAX_BUFFER = 64 * 1024 * 1024;
const RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES = 24_000_000;
const RECEIPT_DIRFD_INTERPRETER_MAX_BYTES = 64 * 1024 * 1024;
const RECEIPT_DIRFD_RUNTIME_FILE_MAX_BYTES = 64 * 1024 * 1024;
const RECEIPT_DIRFD_RUNTIME_CLOSURE_MAX_FILES = 256;
const RECEIPT_DIRFD_INTERPRETER_CHILD_FD = 4;
const RECEIPT_DIRFD_INTERPRETER_EXEC_PATH =
  `/proc/self/fd/${RECEIPT_DIRFD_INTERPRETER_CHILD_FD}`;
const RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES = Object.freeze({
  x86_64: Object.freeze([
    'chmod:90',
    'fchmod:91',
    'chown:92',
    'fchown:93',
    'lchown:94',
    'utime:132',
    'setxattr:188',
    'lsetxattr:189',
    'fsetxattr:190',
    'removexattr:197',
    'lremovexattr:198',
    'fremovexattr:199',
    'utimes:235',
    'fchownat:260',
    'futimesat:261',
    'fchmodat:268',
    'utimensat:280',
    'fchmodat2:452'
  ]),
  aarch64: Object.freeze([
    'setxattr:5',
    'lsetxattr:6',
    'fsetxattr:7',
    'removexattr:14',
    'lremovexattr:15',
    'fremovexattr:16',
    'fchmod:52',
    'fchmodat:53',
    'fchownat:54',
    'fchown:55',
    'utimensat:88',
    'fchmodat2:452'
  ])
});
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
import base64
import ctypes
import errno
import hashlib
import json
import os
import resource
import secrets
import stat
import sys

MAX_RECEIPT_BYTES = 24_000_000
ROOT_FD = 3
INTERPRETER_FD = 4
EVENTS = []
FAULT = None
FAULT_USED = False
LANDLOCK_ABI = None

def identity(stats):
    return {"dev": str(stats.st_dev), "ino": str(stats.st_ino)}

def same_identity(left, right):
    return left.st_dev == right.st_dev and left.st_ino == right.st_ino

def add_event(event_type, **values):
    EVENTS.append({"type": event_type, **values})

def fail(message):
    raise RuntimeError(message)

def validate_component(component):
    if (
        not isinstance(component, str)
        or not component
        or component in (".", "..")
        or "/" in component
        or "\\" in component
        or "\x00" in component
    ):
        fail(f"invalid descriptor-relative receipt path component: {component}")

class OpenHow(ctypes.Structure):
    _fields_ = [
        ("flags", ctypes.c_uint64),
        ("mode", ctypes.c_uint64),
        ("resolve", ctypes.c_uint64),
    ]


RESOLVE_NO_XDEV = 0x01
RESOLVE_NO_MAGICLINKS = 0x02
RESOLVE_NO_SYMLINKS = 0x04
RESOLVE_BENEATH = 0x08
SECURE_OPEN_RESOLVE = (
    RESOLVE_NO_XDEV
    | RESOLVE_NO_MAGICLINKS
    | RESOLVE_NO_SYMLINKS
    | RESOLVE_BENEATH
)
OPENAT2_SYSCALLS = {
    "x86_64": 437,
    "aarch64": 437,
}


def openat2_syscall(directory_descriptor, component, flags, mode):
    syscall_number = OPENAT2_SYSCALLS.get(os.uname().machine)
    if syscall_number is None:
        fail(
            "descriptor-relative receipt helper does not know openat2 "
            f"for architecture {os.uname().machine}"
        )
    how = OpenHow(
        flags=flags,
        mode=mode,
        resolve=SECURE_OPEN_RESOLVE,
    )
    encoded = os.fsencode(component)
    ctypes.set_errno(0)
    result = LIBC.syscall(
        ctypes.c_long(syscall_number),
        ctypes.c_int(directory_descriptor),
        ctypes.c_char_p(encoded),
        ctypes.byref(how),
        ctypes.c_size_t(ctypes.sizeof(how)),
    )
    if result >= 0:
        return int(result)
    error_number = ctypes.get_errno()
    raise OSError(
        error_number,
        os.strerror(error_number),
        component,
    )


def secure_open(
    directory_descriptor,
    component,
    flags,
    mode,
    label,
    *,
    display=None,
    stage="generic",
    allow_fault=True,
):
    global FAULT_USED
    if component != ".":
        validate_component(component)
    if (
        allow_fault
        and isinstance(FAULT, dict)
        and FAULT.get("type") == "simulate_mount_crossing"
        and not FAULT_USED
        and stage == "directory"
        and FAULT.get("after_display") == display
    ):
        FAULT_USED = True
        error = OSError(
            errno.EXDEV,
            "simulated nested mount crossing",
            component,
        )
        add_event(
            "mount-crossing-rejected",
            display=display,
            stage=stage,
            errno=error.errno,
        )
        raise RuntimeError(f"{label} crosses a mount point: {error}")

    try:
        descriptor = openat2_syscall(
            directory_descriptor,
            component,
            flags,
            mode,
        )
    except OSError as error:
        if error.errno == errno.EXDEV:
            add_event(
                "mount-crossing-rejected",
                display=display or component,
                stage=stage,
                errno=error.errno,
            )
            raise RuntimeError(f"{label} crosses a mount point: {error}")
        raise
    os.set_inheritable(descriptor, False)
    return descriptor


def opened_component_stats(
    directory_descriptor,
    component,
    descriptor,
    display,
):
    return os.stat(
        component,
        dir_fd=directory_descriptor,
        follow_symlinks=False,
    )


def require_openat2_support(descriptor):
    probe = secure_open(
        descriptor,
        ".",
        os.O_RDONLY
        | getattr(os, "O_DIRECTORY", 0)
        | getattr(os, "O_CLOEXEC", 0),
        0,
        "receipt repository openat2 capability probe",
        display=".",
        stage="probe",
        allow_fault=False,
    )
    try:
        root_stats = os.fstat(descriptor)
        probe_stats = os.fstat(probe)
        if (
            not stat.S_ISDIR(root_stats.st_mode)
            or not stat.S_ISDIR(probe_stats.st_mode)
            or not same_identity(root_stats, probe_stats)
        ):
            fail("receipt repository openat2 capability probe changed identity")
    finally:
        os.close(probe)
    add_event(
        "mount-boundary-supported",
        syscall="openat2",
        resolve=str(SECURE_OPEN_RESOLVE),
        **identity(root_stats),
    )


def require_dir_fd_support():
    required = [os.open, os.stat, os.mkdir, os.link, os.unlink]
    missing = [function.__name__ for function in required if function not in os.supports_dir_fd]
    if missing:
        fail(
            "descriptor-relative receipt publication requires dir_fd support for "
            + ", ".join(missing)
        )


class LandlockRulesetAttr(ctypes.Structure):
    _fields_ = [("handled_access_fs", ctypes.c_uint64)]


class LandlockPathBeneathAttr(ctypes.Structure):
    _fields_ = [
        ("allowed_access", ctypes.c_uint64),
        ("parent_fd", ctypes.c_int32),
    ]


class SockFilter(ctypes.Structure):
    _fields_ = [
        ("code", ctypes.c_ushort),
        ("jt", ctypes.c_ubyte),
        ("jf", ctypes.c_ubyte),
        ("k", ctypes.c_uint32),
    ]


class SockFprog(ctypes.Structure):
    _fields_ = [
        ("length", ctypes.c_ushort),
        ("filters", ctypes.POINTER(SockFilter)),
    ]


LANDLOCK_CREATE_RULESET_VERSION = 1
LANDLOCK_RULE_PATH_BENEATH = 1
PR_SET_SECCOMP = 22
PR_SET_NO_NEW_PRIVS = 38
SECCOMP_MODE_FILTER = 2
SECCOMP_RET_KILL_PROCESS = 0x80000000
SECCOMP_RET_ERRNO = 0x00050000
SECCOMP_RET_ALLOW = 0x7FFF0000
BPF_LD = 0x00
BPF_W = 0x00
BPF_ABS = 0x20
BPF_JMP = 0x05
BPF_JEQ = 0x10
BPF_K = 0x00
BPF_RET = 0x06
SECCOMP_DATA_NR_OFFSET = 0
SECCOMP_DATA_ARCH_OFFSET = 4
FILESYSTEM_METADATA_SECCOMP_POLICY = "filesystem-metadata-v1"
FILESYSTEM_METADATA_SECCOMP_POLICIES = {
    "x86_64": {
        "audit_arch": 0xC000003E,
        "entries": (
            ("chmod", 90),
            ("fchmod", 91),
            ("chown", 92),
            ("fchown", 93),
            ("lchown", 94),
            ("utime", 132),
            ("setxattr", 188),
            ("lsetxattr", 189),
            ("fsetxattr", 190),
            ("removexattr", 197),
            ("lremovexattr", 198),
            ("fremovexattr", 199),
            ("utimes", 235),
            ("fchownat", 260),
            ("futimesat", 261),
            ("fchmodat", 268),
            ("utimensat", 280),
            ("fchmodat2", 452),
        ),
    },
    "aarch64": {
        "audit_arch": 0xC00000B7,
        "entries": (
            ("setxattr", 5),
            ("lsetxattr", 6),
            ("fsetxattr", 7),
            ("removexattr", 14),
            ("lremovexattr", 15),
            ("fremovexattr", 16),
            ("fchmod", 52),
            ("fchmodat", 53),
            ("fchownat", 54),
            ("fchown", 55),
            ("utimensat", 88),
            ("fchmodat2", 452),
        ),
    },
}
LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
LANDLOCK_ACCESS_FS_REMOVE_DIR = 1 << 4
LANDLOCK_ACCESS_FS_REMOVE_FILE = 1 << 5
LANDLOCK_ACCESS_FS_MAKE_CHAR = 1 << 6
LANDLOCK_ACCESS_FS_MAKE_DIR = 1 << 7
LANDLOCK_ACCESS_FS_MAKE_REG = 1 << 8
LANDLOCK_ACCESS_FS_MAKE_SOCK = 1 << 9
LANDLOCK_ACCESS_FS_MAKE_FIFO = 1 << 10
LANDLOCK_ACCESS_FS_MAKE_BLOCK = 1 << 11
LANDLOCK_ACCESS_FS_MAKE_SYM = 1 << 12
LANDLOCK_ACCESS_FS_REFER = 1 << 13
LANDLOCK_ACCESS_FS_TRUNCATE = 1 << 14
LANDLOCK_HANDLED_WRITE_ACCESS = (
    LANDLOCK_ACCESS_FS_WRITE_FILE
    | LANDLOCK_ACCESS_FS_REMOVE_DIR
    | LANDLOCK_ACCESS_FS_REMOVE_FILE
    | LANDLOCK_ACCESS_FS_MAKE_CHAR
    | LANDLOCK_ACCESS_FS_MAKE_DIR
    | LANDLOCK_ACCESS_FS_MAKE_REG
    | LANDLOCK_ACCESS_FS_MAKE_SOCK
    | LANDLOCK_ACCESS_FS_MAKE_FIFO
    | LANDLOCK_ACCESS_FS_MAKE_BLOCK
    | LANDLOCK_ACCESS_FS_MAKE_SYM
    | LANDLOCK_ACCESS_FS_REFER
    | LANDLOCK_ACCESS_FS_TRUNCATE
)
LANDLOCK_SYSCALLS = {
    "x86_64": (444, 445, 446),
    "aarch64": (444, 445, 446),
}
LIBC = ctypes.CDLL(None, use_errno=True)
LIBC.syscall.restype = ctypes.c_long
LIBC.prctl.restype = ctypes.c_int


def landlock_syscall(operation, *arguments):
    syscall_numbers = LANDLOCK_SYSCALLS.get(os.uname().machine)
    if syscall_numbers is None:
        fail(
            "descriptor-relative receipt helper does not know Landlock syscalls "
            f"for architecture {os.uname().machine}"
        )
    operation_index = {"create": 0, "add": 1, "restrict": 2}[operation]
    ctypes.set_errno(0)
    result = LIBC.syscall(
        ctypes.c_long(syscall_numbers[operation_index]),
        *arguments,
    )
    if result < 0:
        error_number = ctypes.get_errno()
        raise OSError(error_number, os.strerror(error_number))
    return int(result)


def landlock_abi_version():
    try:
        return landlock_syscall(
            "create",
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
            ctypes.c_uint32(LANDLOCK_CREATE_RULESET_VERSION),
        )
    except OSError as error:
        fail(f"descriptor-relative receipt helper requires Landlock: {error}")


def restrict_filesystem_writes(descriptor, scope):
    if not isinstance(LANDLOCK_ABI, int) or LANDLOCK_ABI < 3:
        fail("descriptor-relative receipt helper lacks Landlock truncate control")
    descriptor_stats = os.fstat(descriptor)
    if not stat.S_ISDIR(descriptor_stats.st_mode):
        fail(f"Landlock scope {scope} is not a directory")

    ruleset_descriptor = None
    try:
        ruleset_attr = LandlockRulesetAttr(LANDLOCK_HANDLED_WRITE_ACCESS)
        ruleset_descriptor = landlock_syscall(
            "create",
            ctypes.byref(ruleset_attr),
            ctypes.c_size_t(ctypes.sizeof(ruleset_attr)),
            ctypes.c_uint32(0),
        )
        os.set_inheritable(ruleset_descriptor, False)
        path_beneath = LandlockPathBeneathAttr(
            LANDLOCK_HANDLED_WRITE_ACCESS,
            descriptor,
        )
        landlock_syscall(
            "add",
            ctypes.c_int(ruleset_descriptor),
            ctypes.c_int(LANDLOCK_RULE_PATH_BENEATH),
            ctypes.byref(path_beneath),
            ctypes.c_uint32(0),
        )
        landlock_syscall(
            "restrict",
            ctypes.c_int(ruleset_descriptor),
            ctypes.c_uint32(0),
        )
    except OSError as error:
        fail(f"descriptor-relative receipt helper Landlock confinement failed: {error}")
    finally:
        if ruleset_descriptor is not None:
            os.close(ruleset_descriptor)

    after = os.fstat(descriptor)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(after, descriptor_stats):
        fail(f"Landlock scope {scope} changed during confinement")
    add_event(
        "filesystem-write-confined",
        scope=scope,
        abi=str(LANDLOCK_ABI),
        **identity(after),
    )

def confine_filesystem_metadata():
    machine = os.uname().machine
    policy = FILESYSTEM_METADATA_SECCOMP_POLICIES.get(machine)
    if policy is None:
        fail(
            "descriptor-relative receipt helper does not know metadata "
            f"seccomp policy for architecture {machine}"
        )

    filters = [
        SockFilter(
            BPF_LD | BPF_W | BPF_ABS,
            0,
            0,
            SECCOMP_DATA_ARCH_OFFSET,
        ),
        SockFilter(
            BPF_JMP | BPF_JEQ | BPF_K,
            1,
            0,
            policy["audit_arch"],
        ),
        SockFilter(
            BPF_RET | BPF_K,
            0,
            0,
            SECCOMP_RET_KILL_PROCESS,
        ),
        SockFilter(
            BPF_LD | BPF_W | BPF_ABS,
            0,
            0,
            SECCOMP_DATA_NR_OFFSET,
        ),
    ]
    for _name, syscall_number in policy["entries"]:
        filters.extend(
            [
                SockFilter(
                    BPF_JMP | BPF_JEQ | BPF_K,
                    0,
                    1,
                    syscall_number,
                ),
                SockFilter(
                    BPF_RET | BPF_K,
                    0,
                    0,
                    SECCOMP_RET_ERRNO | errno.EPERM,
                ),
            ]
        )
    filters.append(
        SockFilter(
            BPF_RET | BPF_K,
            0,
            0,
            SECCOMP_RET_ALLOW,
        )
    )
    filter_array = (SockFilter * len(filters))(*filters)
    program = SockFprog(len(filters), filter_array)
    ctypes.set_errno(0)
    if LIBC.prctl(
        PR_SET_SECCOMP,
        SECCOMP_MODE_FILTER,
        ctypes.byref(program),
    ) != 0:
        error_number = ctypes.get_errno()
        fail(
            "descriptor-relative receipt helper metadata seccomp "
            f"confinement failed: {os.strerror(error_number)}"
        )

    cwd_before = os.stat(".", follow_symlinks=False)
    cwd_mode = stat.S_IMODE(cwd_before.st_mode)
    try:
        os.chmod(".", cwd_mode)
    except OSError as error:
        if error.errno != errno.EPERM:
            fail(
                "descriptor-relative receipt helper metadata seccomp "
                f"probe failed unexpectedly: {error}"
            )
    else:
        fail(
            "descriptor-relative receipt helper metadata seccomp "
            "probe permitted chmod"
        )
    cwd_after = os.stat(".", follow_symlinks=False)
    if (
        not stat.S_ISDIR(cwd_after.st_mode)
        or not same_identity(cwd_before, cwd_after)
        or stat.S_IMODE(cwd_after.st_mode) != cwd_mode
    ):
        fail(
            "descriptor-relative receipt helper metadata seccomp "
            "probe changed the working directory"
        )
    add_event(
        "filesystem-metadata-confined",
        policy=FILESYSTEM_METADATA_SECCOMP_POLICY,
        architecture=machine,
        errno=errno.EPERM,
        entries=[
            f"{name}:{syscall_number}"
            for name, syscall_number in policy["entries"]
        ],
    )


def runtime_file_paths():
    paths = set()
    for module in tuple(sys.modules.values()):
        for attribute in ("__file__", "__cached__"):
            value = getattr(module, attribute, None)
            if not isinstance(value, str) or not value or not os.path.isabs(value):
                continue
            canonical = os.path.realpath(value)
            if os.path.exists(canonical):
                paths.add(canonical)
    try:
        with open("/proc/self/maps", "r", encoding="utf-8") as mappings:
            for line in mappings:
                fields = line.rstrip("\n").split(None, 5)
                if len(fields) != 6 or not fields[5].startswith("/"):
                    continue
                candidate = fields[5]
                if candidate.endswith(" (deleted)"):
                    fail(f"descriptor-relative receipt helper mapped a deleted runtime file: {candidate}")
                canonical = os.path.realpath(candidate)
                if os.path.exists(canonical):
                    paths.add(canonical)
    except OSError as error:
        fail(f"descriptor-relative receipt helper runtime closure inspection failed: {error}")
    return sorted(paths)

def confine_runtime():
    global LANDLOCK_ABI
    if sys.platform != "linux" or os.name != "posix":
        fail("descriptor-relative receipt helper requires Linux process controls")
    if os.geteuid() == 0:
        fail("descriptor-relative receipt helper may not run as root")
    LANDLOCK_ABI = landlock_abi_version()
    if LANDLOCK_ABI < 3:
        fail(
            "descriptor-relative receipt helper requires Landlock ABI 3 "
            "for truncate confinement"
        )
    if LIBC.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
        error_number = ctypes.get_errno()
        fail(
            "descriptor-relative receipt helper no-new-privileges confinement "
            f"failed: {os.strerror(error_number)}"
        )
    try:
        os.umask(0o077)
        os.set_inheritable(ROOT_FD, False)
        os.set_inheritable(INTERPRETER_FD, False)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    except (AttributeError, OSError, ValueError) as error:
        fail(f"descriptor-relative receipt helper confinement failed: {error}")
    if resource.getrlimit(resource.RLIMIT_NPROC) != (0, 0):
        fail("descriptor-relative receipt helper process limit was not retained")

    root_stats = os.fstat(ROOT_FD)
    if not stat.S_ISDIR(root_stats.st_mode):
        fail("descriptor-relative receipt helper authority root is not a directory")
    require_openat2_support(ROOT_FD)
    restrict_filesystem_writes(ROOT_FD, "repository-root")
    confine_filesystem_metadata()
    add_event("landlock-supported", abi=str(LANDLOCK_ABI))

    try:
        interpreter_stats = os.fstat(INTERPRETER_FD)
        if not stat.S_ISREG(interpreter_stats.st_mode):
            fail("descriptor-relative receipt helper executable descriptor is not a file")
        os.close(INTERPRETER_FD)
    except OSError as error:
        fail(f"descriptor-relative receipt helper executable closure failed: {error}")
    add_event(
        "interpreter-capability-closed",
        **identity(interpreter_stats),
    )
    cwd_stats = os.stat(".", follow_symlinks=False)
    cwd_mode = stat.S_IMODE(cwd_stats.st_mode)
    if (
        not stat.S_ISDIR(cwd_stats.st_mode)
        or cwd_stats.st_uid != os.geteuid()
        or cwd_mode & 0o077
        or cwd_mode & 0o700 != 0o700
    ):
        fail("descriptor-relative receipt helper working directory is not private")
    add_event(
        "runtime-confined",
        euid=str(os.geteuid()),
        cwd_dev=str(cwd_stats.st_dev),
        cwd_ino=str(cwd_stats.st_ino),
    )

def maybe_probe_runtime_ambient_write():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "write_runtime_probe_escape"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    target = FAULT.get("path")
    encoded = FAULT.get("content_base64")
    if (
        not isinstance(target, str)
        or not target
        or not os.path.isabs(target)
        or not isinstance(encoded, str)
    ):
        fail("invalid runtime-probe ambient-write fault")
    content = base64.b64decode(encoded, validate=True)
    descriptor = None
    try:
        descriptor = os.open(
            target,
            os.O_WRONLY
            | os.O_CREAT
            | os.O_TRUNC
            | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
        write_all(descriptor, content)
        os.fsync(descriptor)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM):
            raise
        if os.path.lexists(target):
            fail("runtime-probe write denial left an ambient escape file")
        add_event("runtime-probe-write-denied", errno=error.errno)
        return
    finally:
        if descriptor is not None:
            os.close(descriptor)
    add_event("runtime-probe-escape-created")


def maybe_probe_fork_denial():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "probe_fork_denial"
        or FAULT_USED
    ):
        return
    try:
        child = os.fork()
    except OSError as error:
        if error.errno not in (errno.EAGAIN, errno.EPERM):
            fail(f"unexpected helper fork failure: {error}")
        FAULT_USED = True
        add_event("fork-denied", errno=error.errno)
        return
    if child == 0:
        os._exit(0)
    os.waitpid(child, 0)
    fail("descriptor-relative receipt helper permitted descendant creation")

def sync_directory(descriptor, label):
    global FAULT_USED
    before = os.fstat(descriptor)
    if not stat.S_ISDIR(before.st_mode):
        fail(f"{label} synchronization failed: descriptor is not a directory")
    if (
        isinstance(FAULT, dict)
        and FAULT.get("type") == "fail_next_directory_sync"
        and not FAULT_USED
    ):
        FAULT_USED = True
        add_event("directory-sync-failure", **identity(before))
        error = OSError(errno.EIO, "simulated directory fsync failure")
        raise RuntimeError(f"{label} synchronization failed: {error}")
    os.fsync(descriptor)
    after = os.fstat(descriptor)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(before, after):
        fail(f"{label} synchronization failed: directory descriptor identity changed")
    add_event("directory-sync", **identity(after))

def write_all(descriptor, data):
    offset = 0
    while offset < len(data):
        written = os.write(descriptor, data[offset:])
        if written <= 0:
            fail("temporary receipt write made no progress")
        offset += written

def read_all(descriptor):
    os.lseek(descriptor, 0, os.SEEK_SET)
    chunks = []
    total = 0
    while True:
        chunk = os.read(descriptor, 1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_RECEIPT_BYTES:
            fail("retained receipt exceeds the helper byte limit")
        chunks.append(chunk)
    return b"".join(chunks)

def open_directory_chain(relative_parent, create):
    segments = [] if relative_parent == "." else relative_parent.split("/")
    for segment in segments:
        validate_component(segment)

    global ROOT_FD
    root_descriptor = os.dup(ROOT_FD)
    os.set_inheritable(root_descriptor, False)
    os.close(ROOT_FD)
    ROOT_FD = -1
    chain_descriptors = [root_descriptor]
    root_stats = os.fstat(root_descriptor)
    if not stat.S_ISDIR(root_stats.st_mode):
        fail("inherited receipt repository descriptor is not a directory")
    chain = [{"display": ".", **identity(root_stats)}]

    for segment in segments:
        parent_descriptor = chain_descriptors[-1]
        display = segment if len(chain) == 1 else f"{chain[-1]['display']}/{segment}"
        created = False
        try:
            descriptor = secure_open(
                parent_descriptor,
                segment,
                os.O_RDONLY
                | getattr(os, "O_DIRECTORY", 0)
                | getattr(os, "O_NOFOLLOW", 0)
                | getattr(os, "O_CLOEXEC", 0),
                0,
                f"receipt parent directory {display}",
                display=display,
                stage="directory",
            )
        except OSError as error:
            if error.errno in (errno.ELOOP, errno.ENOTDIR):
                fail(f"receipt parent directory contains an unsupported path entry: {display}")
            if error.errno != errno.ENOENT or not create:
                raise
            try:
                os.mkdir(segment, 0o755, dir_fd=parent_descriptor)
                created = True
                add_event("directory-created", display=display)
            except FileExistsError:
                pass
            descriptor = secure_open(
                parent_descriptor,
                segment,
                os.O_RDONLY
                | getattr(os, "O_DIRECTORY", 0)
                | getattr(os, "O_NOFOLLOW", 0)
                | getattr(os, "O_CLOEXEC", 0),
                0,
                f"receipt parent directory {display}",
                display=display,
                stage="directory",
            )

        os.set_inheritable(descriptor, False)
        descriptor_stats = os.fstat(descriptor)
        path_stats = opened_component_stats(
            parent_descriptor,
            segment,
            descriptor,
            display,
        )
        if (
            not stat.S_ISDIR(descriptor_stats.st_mode)
            or not stat.S_ISDIR(path_stats.st_mode)
            or not same_identity(descriptor_stats, path_stats)
        ):
            os.close(descriptor)
            fail(f"receipt parent directory identity changed while opening {display}")

        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        restrict_filesystem_writes(
            descriptor,
            f"directory-chain:{display}",
        )
        maybe_rename_directory_chain_sibling(display, create)
        sync_directory(descriptor, f"receipt parent directory {display}")
        sync_directory(parent_descriptor, f"receipt parent directory parent {chain[-2]['display']}")
        if created:
            add_event("directory-created-durable", display=display)

    return chain_descriptors, chain

def narrow_chain_to_parent(chain_descriptors, chain):
    parent_descriptor = chain_descriptors[-1]
    for descriptor in chain_descriptors[:-1]:
        os.close(descriptor)
    restrict_filesystem_writes(parent_descriptor, "receipt-parent")
    parent_stats = os.fstat(parent_descriptor)
    add_event(
        "capability-narrowed",
        display=chain[-1]["display"],
        **identity(parent_stats),
    )
    return [parent_descriptor], parent_descriptor

def inspect_final(parent_descriptor, final_name):
    try:
        stats = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(stats.st_mode):
        fail("receipt contains an unsupported path entry")
    if stats.st_nlink != 1:
        fail("receipt contains a multiply linked receipt file")
    return stats

def open_final(parent_descriptor, final_name):
    descriptor = secure_open(
        parent_descriptor,
        final_name,
        os.O_RDONLY
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_CLOEXEC", 0),
        0,
        "receipt final file",
        display=final_name,
        stage="final",
    )
    os.set_inheritable(descriptor, False)
    descriptor_stats = os.fstat(descriptor)
    path_stats = os.stat(
        final_name,
        dir_fd=parent_descriptor,
        follow_symlinks=False,
    )
    if (
        not stat.S_ISREG(descriptor_stats.st_mode)
        or descriptor_stats.st_nlink != 1
        or not stat.S_ISREG(path_stats.st_mode)
        or path_stats.st_nlink != 1
        or not same_identity(descriptor_stats, path_stats)
    ):
        os.close(descriptor)
        fail("receipt publication identity changed")
    return descriptor, descriptor_stats

def maybe_chmod_unrelated_after_narrowing():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "chmod_unrelated_after_narrowing"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    target = FAULT.get("path")
    requested_mode = FAULT.get("mode")
    if (
        not isinstance(target, str)
        or not target
        or not os.path.isabs(target)
        or not isinstance(requested_mode, int)
        or isinstance(requested_mode, bool)
        or requested_mode < 0
        or requested_mode > 0o7777
    ):
        fail("invalid unrelated metadata mutation fault")
    before = os.lstat(target)
    before_mode = stat.S_IMODE(before.st_mode)
    if not stat.S_ISREG(before.st_mode):
        fail("unrelated metadata mutation target is not a regular file")
    try:
        os.chmod(target, requested_mode)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM):
            raise
        after = os.lstat(target)
        if (
            not stat.S_ISREG(after.st_mode)
            or not same_identity(before, after)
            or stat.S_IMODE(after.st_mode) != before_mode
        ):
            fail("metadata mutation denial changed the unrelated target")
        add_event(
            "metadata-mutation-denied",
            operation="chmod",
            errno=error.errno,
            mode=str(before_mode),
        )
        return
    after = os.lstat(target)
    add_event(
        "metadata-mutation-succeeded",
        operation="chmod",
        before_mode=str(before_mode),
        after_mode=str(stat.S_IMODE(after.st_mode)),
    )


def maybe_swap_visible_ancestor():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "swap_visible_ancestor_after_temp_open"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    canonical = FAULT.get("canonical_receipts_path")
    displaced = FAULT.get("displaced_receipts_path")
    external = FAULT.get("external_receipts_path")
    if not all(isinstance(value, str) and value for value in (canonical, displaced, external)):
        fail("invalid visible-ancestor swap fault")
    try:
        os.rename(canonical, displaced)
        os.symlink(external, canonical)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM, errno.EXDEV):
            raise
        if os.path.lexists(displaced) or not os.path.lexists(canonical):
            fail("Landlock rejection left a partial visible-ancestor swap")
        add_event(
            "ambient-write-denied",
            operation="visible-ancestor-swap",
            errno=error.errno,
        )
        return
    add_event("visible-ancestor-swapped")

def maybe_rename_directory_chain_sibling(display, create):
    global FAULT_USED
    if (
        not create
        or not isinstance(FAULT, dict)
        or FAULT.get("type") != "rename_directory_chain_sibling_after_open"
        or FAULT_USED
        or FAULT.get("after_display") != display
    ):
        return
    FAULT_USED = True
    canonical = FAULT.get("canonical_path")
    displaced = FAULT.get("displaced_path")
    if (
        not all(
            isinstance(value, str) and value and os.path.isabs(value)
            for value in (canonical, displaced)
        )
        or canonical == displaced
    ):
        fail("invalid directory-chain sibling rename fault")
    try:
        os.rename(canonical, displaced)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM, errno.EXDEV):
            raise
        if os.path.lexists(displaced) or not os.path.lexists(canonical):
            fail(
                "progressive Landlock rejection left a partial "
                "directory-chain sibling rename"
            )
        add_event(
            "ambient-write-denied",
            operation="directory-chain-sibling-rename",
            display=display,
            errno=error.errno,
        )
        return
    add_event("directory-chain-sibling-renamed", display=display)

def maybe_create_competing_receipt(parent_descriptor, final_name):
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "create_competing_receipt_before_link"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    encoded = FAULT.get("content_base64")
    if not isinstance(encoded, str):
        fail("invalid competing receipt fault")
    content = base64.b64decode(encoded, validate=True)
    descriptor = secure_open(
        parent_descriptor,
        final_name,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_CLOEXEC", 0),
        0o600,
        "competing receipt file",
        display=final_name,
        stage="competing",
    )
    try:
        write_all(descriptor, content)
        os.fsync(descriptor)
        add_event("file-sync")
    finally:
        os.close(descriptor)
    add_event("competing-receipt-created")

def publish(request):
    relative_path = request.get("relative_path")
    serialized_base64 = request.get("serialized_base64")
    if not isinstance(relative_path, str) or not relative_path:
        fail("receipt path is not canonical")
    if relative_path.startswith("/") or "\\" in relative_path:
        fail("receipt path is not canonical")
    segments = relative_path.split("/")
    if any(not segment or segment in (".", "..") for segment in segments):
        fail("receipt path is not canonical")
    if not isinstance(serialized_base64, str):
        fail("receipt publication lacks serialized bytes")
    serialized = base64.b64decode(serialized_base64, validate=True)
    if len(serialized) > MAX_RECEIPT_BYTES:
        fail("receipt publication exceeds the helper byte limit")

    parent_relative = "/".join(segments[:-1]) or "."
    final_name = segments[-1]
    validate_component(final_name)
    chain_descriptors, chain = open_directory_chain(parent_relative, True)
    chain_descriptors, parent_descriptor = narrow_chain_to_parent(
        chain_descriptors,
        chain,
    )
    maybe_chmod_unrelated_after_narrowing()
    temp_name = None
    temp_identity = None
    published = False
    final_descriptor = None
    try:
        final_stats = inspect_final(parent_descriptor, final_name)
        if final_stats is None:
            for _attempt in range(8):
                candidate_name = (
                    f"{final_name}.{os.getpid()}.{secrets.token_hex(16)}.tmp"
                )
                try:
                    temp_descriptor = secure_open(
                        parent_descriptor,
                        candidate_name,
                        os.O_WRONLY
                        | os.O_CREAT
                        | os.O_EXCL
                        | getattr(os, "O_NOFOLLOW", 0)
                        | getattr(os, "O_CLOEXEC", 0),
                        0o600,
                        "temporary receipt file",
                        display=candidate_name,
                        stage="temporary",
                    )
                except FileExistsError:
                    continue
                temp_name = candidate_name
                add_event("temporary-open")
                maybe_swap_visible_ancestor()
                try:
                    write_all(temp_descriptor, serialized)
                    os.fsync(temp_descriptor)
                    add_event("file-sync")
                    stats = os.fstat(temp_descriptor)
                    if not stat.S_ISREG(stats.st_mode) or stats.st_nlink != 1:
                        fail("temporary publication is not an exclusive regular file")
                    temp_identity = identity(stats)
                finally:
                    os.close(temp_descriptor)
                    add_event("temporary-close")
                break
            if temp_name is None or temp_identity is None:
                fail("could not allocate an exclusive temporary publication")

            maybe_create_competing_receipt(parent_descriptor, final_name)
            try:
                os.link(
                    temp_name,
                    final_name,
                    src_dir_fd=parent_descriptor,
                    dst_dir_fd=parent_descriptor,
                    follow_symlinks=False,
                )
                published = True
                add_event("publish-link")
            except FileExistsError:
                add_event("publish-link-conflict")

        if temp_name is not None:
            try:
                os.unlink(temp_name, dir_fd=parent_descriptor)
                add_event("temporary-unlink")
            except FileNotFoundError:
                pass

        sync_directory(parent_descriptor, "receipt publication directory")
        final_descriptor, final_stats = open_final(parent_descriptor, final_name)
        if published and identity(final_stats) != temp_identity:
            fail("receipt publication identity changed before validation")
        retained = read_all(final_descriptor)
        final_after = os.fstat(final_descriptor)
        path_after = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(final_after.st_mode)
            or final_after.st_nlink != 1
            or not stat.S_ISREG(path_after.st_mode)
            or path_after.st_nlink != 1
            or not same_identity(final_after, path_after)
            or not same_identity(final_after, final_stats)
        ):
            fail("receipt publication identity changed during read")
        return {
            "published": published,
            "retained_base64": base64.b64encode(retained).decode("ascii"),
            "retained_sha256": hashlib.sha256(retained).hexdigest(),
            "final_identity": identity(final_after),
            "chain": chain,
        }
    finally:
        if final_descriptor is not None:
            os.close(final_descriptor)
        if temp_name is not None:
            try:
                os.unlink(temp_name, dir_fd=parent_descriptor)
            except FileNotFoundError:
                pass
        for descriptor in reversed(chain_descriptors):
            os.close(descriptor)

def verify(request):
    relative_path = request.get("relative_path")
    expected_identity = request.get("expected_identity")
    expected_sha256 = request.get("expected_sha256")
    if not isinstance(relative_path, str) or not relative_path:
        fail("receipt verification path is not canonical")
    segments = relative_path.split("/")
    if any(not segment or segment in (".", "..") for segment in segments):
        fail("receipt verification path is not canonical")
    parent_relative = "/".join(segments[:-1]) or "."
    final_name = segments[-1]
    validate_component(final_name)
    chain_descriptors, chain = open_directory_chain(parent_relative, False)
    chain_descriptors, parent_descriptor = narrow_chain_to_parent(
        chain_descriptors,
        chain,
    )
    final_descriptor = None
    try:
        final_descriptor, final_stats = open_final(parent_descriptor, final_name)
        retained = read_all(final_descriptor)
        if identity(final_stats) != expected_identity:
            fail("receipt publication identity changed after validation")
        digest = hashlib.sha256(retained).hexdigest()
        if digest != expected_sha256:
            fail("receipt publication bytes changed after validation")
        sync_directory(parent_descriptor, "receipt verification directory")
        final_after = os.fstat(final_descriptor)
        path_after = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not same_identity(final_after, final_stats)
            or not same_identity(path_after, final_stats)
            or final_after.st_nlink != 1
            or path_after.st_nlink != 1
        ):
            fail("receipt publication identity changed during final verification")
        return {
            "retained_sha256": digest,
            "final_identity": identity(final_after),
            "chain": chain,
        }
    finally:
        if final_descriptor is not None:
            os.close(final_descriptor)
        for descriptor in reversed(chain_descriptors):
            os.close(descriptor)

def main():
    global FAULT
    require_dir_fd_support()
    confine_runtime()
    request = json.load(sys.stdin)
    FAULT = request.get("fault")
    maybe_probe_runtime_ambient_write()
    maybe_probe_fork_denial()
    action = request.get("action")
    if action == "runtime_probe":
        result = {}
    elif action == "publish":
        result = publish(request)
    elif action == "verify":
        result = verify(request)
    else:
        fail("unsupported receipt dirfd helper action")
    result["runtime_files"] = runtime_file_paths()
    sys.stdout.write(json.dumps({"ok": True, "events": EVENTS, **result}))

try:
    main()
except BaseException as error:
    sys.stdout.write(json.dumps({
        "ok": False,
        "error": str(error),
        "events": EVENTS,
    }))
    sys.exit(1)
`;

function receiptDirfdTestControl() {
  if (process.env.NODE_ENV !== 'test') return null;
  const control = globalThis[RECEIPT_DIRFD_CONTROL_SYMBOL];
  return control && typeof control === 'object' ? control : null;
}

function recordReceiptDirfdEvents(control, events) {
  if (!control || !Array.isArray(control.events) || !Array.isArray(events)) return;
  control.events.push(...events.map(event => structuredClone(event)));
}

function receiptFilesystemMetadataProofIsValid(event) {
  if (!event || event.type !== 'filesystem-metadata-confined'
    || event.policy !== 'filesystem-metadata-v1'
    || Number(event.errno) !== 1
    || typeof event.architecture !== 'string'
    || !Array.isArray(event.entries)) {
    return false;
  }
  const expected = RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES[event.architecture];
  return Array.isArray(expected)
    && JSON.stringify(event.entries) === JSON.stringify(expected);
}

function receiptInterpreterPathEntryIsTrusted(stats) {
  return stats.uid === 0 && (stats.mode & 0o022) === 0;
}

function hashReceiptInterpreterDescriptor(descriptor, size, label) {
  if (!Number.isSafeInteger(size) || size < 1
    || size > RECEIPT_DIRFD_INTERPRETER_MAX_BYTES) {
    throw new Error(`${label} has an unsupported executable size`);
  }
  const digest = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let offset = 0;
  while (offset < size) {
    const count = fs.readSync(
      descriptor,
      buffer,
      0,
      Math.min(buffer.length, size - offset),
      offset
    );
    if (count <= 0) {
      throw new Error(`${label} executable hash made no progress`);
    }
    digest.update(buffer.subarray(0, count));
    offset += count;
  }
  return digest.digest('hex');
}

function openReceiptInterpreterLease(interpreter, label) {
  let descriptor = null;
  try {
    if (typeof interpreter !== 'string' || !path.isAbsolute(interpreter)) {
      throw new Error('interpreter path is not absolute');
    }
    const canonicalPath = fs.realpathSync.native(interpreter);
    const relativeToUsrBin = path.relative('/usr/bin', canonicalPath);
    if (!relativeToUsrBin
      || relativeToUsrBin.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativeToUsrBin)) {
      throw new Error('interpreter does not resolve beneath /usr/bin');
    }

    let current = path.parse(canonicalPath).root;
    const parentSegments = path.relative(
      current,
      path.dirname(canonicalPath)
    ).split(path.sep).filter(Boolean);
    for (const segment of parentSegments) {
      current = path.join(current, segment);
      const stats = fs.lstatSync(current);
      if (!stats.isDirectory() || !receiptInterpreterPathEntryIsTrusted(stats)) {
        throw new Error(`interpreter parent is not root-owned and immutable: ${current}`);
      }
    }

    const before = fs.lstatSync(canonicalPath);
    if (!before.isFile()
      || !receiptInterpreterPathEntryIsTrusted(before)
      || (before.mode & 0o111) === 0) {
      throw new Error('interpreter target is not a root-owned immutable executable');
    }
    descriptor = fs.openSync(
      canonicalPath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const opened = fs.fstatSync(descriptor);
    const after = fs.lstatSync(canonicalPath);
    if (!opened.isFile()
      || !sameReceiptIdentity(opened, before)
      || !sameReceiptIdentity(opened, after)
      || opened.size !== before.size
      || opened.size !== after.size
      || !receiptInterpreterPathEntryIsTrusted(opened)) {
      throw new Error('interpreter identity changed during lease admission');
    }
    const sha256 = hashReceiptInterpreterDescriptor(
      descriptor,
      opened.size,
      label
    );
    const finalStats = fs.fstatSync(descriptor);
    if (!sameReceiptIdentity(finalStats, opened)
      || finalStats.size !== opened.size) {
      throw new Error('interpreter identity changed during content lease');
    }
    return {
      path: canonicalPath,
      descriptor,
      identity: {
        dev: opened.dev,
        ino: opened.ino,
        size: opened.size,
        mode: opened.mode,
        uid: opened.uid
      },
      sha256
    };
  } catch (error) {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(
      `${label} dirfd helper interpreter lease failed: ${error.message}`
    );
  }
}

function verifyReceiptInterpreterLease(lease, label) {
  try {
    const descriptorStats = fs.fstatSync(lease.descriptor);
    const pathStats = fs.lstatSync(lease.path);
    if (!descriptorStats.isFile()
      || !pathStats.isFile()
      || !sameReceiptIdentity(descriptorStats, lease.identity)
      || !sameReceiptIdentity(pathStats, lease.identity)
      || descriptorStats.size !== lease.identity.size
      || pathStats.size !== lease.identity.size
      || descriptorStats.mode !== lease.identity.mode
      || descriptorStats.uid !== lease.identity.uid
      || !receiptInterpreterPathEntryIsTrusted(pathStats)) {
      throw new Error('interpreter identity changed while the helper executed');
    }
    const digest = hashReceiptInterpreterDescriptor(
      lease.descriptor,
      lease.identity.size,
      label
    );
    if (digest !== lease.sha256) {
      throw new Error('interpreter bytes changed while the helper executed');
    }
  } catch (error) {
    throw new Error(
      `${label} dirfd helper interpreter lease failed: ${error.message}`
    );
  }
}

function closeReceiptInterpreterLease(lease, label) {
  if (!lease || !Number.isInteger(lease.descriptor)) return null;
  try {
    fs.closeSync(lease.descriptor);
    lease.descriptor = null;
    return null;
  } catch (error) {
    return new Error(
      `${label} dirfd helper interpreter descriptor close failed: ${error.message}`
    );
  }
}

function receiptRuntimeDependencyPathIsTrusted(canonicalPath) {
  return ['/usr', '/lib', '/lib64'].some(root => {
    const relative = path.relative(root, canonicalPath);
    return Boolean(relative)
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative);
  });
}

function hashReceiptRuntimeFileDescriptor(descriptor, size, label) {
  if (!Number.isSafeInteger(size) || size < 1
    || size > RECEIPT_DIRFD_RUNTIME_FILE_MAX_BYTES) {
    throw new Error(`${label} has an unsupported runtime-file size`);
  }
  const digest = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let offset = 0;
  while (offset < size) {
    const count = fs.readSync(
      descriptor,
      buffer,
      0,
      Math.min(buffer.length, size - offset),
      offset
    );
    if (count <= 0) {
      throw new Error(`${label} runtime-file hash made no progress`);
    }
    digest.update(buffer.subarray(0, count));
    offset += count;
  }
  return digest.digest('hex');
}

function normalizeReceiptRuntimeFiles(files, label) {
  if (!Array.isArray(files)
    || files.length < 1
    || files.length > RECEIPT_DIRFD_RUNTIME_CLOSURE_MAX_FILES) {
    throw new Error(`${label} returned an invalid runtime closure`);
  }
  const normalized = [];
  const seen = new Set();
  for (const value of files) {
    if (typeof value !== 'string' || !path.isAbsolute(value)) {
      throw new Error(`${label} returned a nonabsolute runtime dependency`);
    }
    const canonicalPath = fs.realpathSync.native(value);
    if (canonicalPath !== value) {
      throw new Error(`${label} returned a noncanonical runtime dependency`);
    }
    if (!seen.has(canonicalPath)) {
      seen.add(canonicalPath);
      normalized.push(canonicalPath);
    }
  }
  normalized.sort();
  return normalized;
}

function openReceiptRuntimeDependencyLease(runtimePath, label) {
  let descriptor = null;
  try {
    const canonicalPath = fs.realpathSync.native(runtimePath);
    if (canonicalPath !== runtimePath
      || !receiptRuntimeDependencyPathIsTrusted(canonicalPath)) {
      throw new Error('runtime dependency is outside the trusted system roots');
    }

    let current = path.parse(canonicalPath).root;
    const parentSegments = path.relative(
      current,
      path.dirname(canonicalPath)
    ).split(path.sep).filter(Boolean);
    for (const segment of parentSegments) {
      current = path.join(current, segment);
      const stats = fs.lstatSync(current);
      if (!stats.isDirectory() || !receiptInterpreterPathEntryIsTrusted(stats)) {
        throw new Error(`runtime dependency parent is not root-owned and immutable: ${current}`);
      }
    }

    const before = fs.lstatSync(canonicalPath);
    if (!before.isFile() || !receiptInterpreterPathEntryIsTrusted(before)) {
      throw new Error('runtime dependency is not a root-owned immutable file');
    }
    descriptor = fs.openSync(
      canonicalPath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const opened = fs.fstatSync(descriptor);
    const after = fs.lstatSync(canonicalPath);
    if (!opened.isFile()
      || !sameReceiptIdentity(opened, before)
      || !sameReceiptIdentity(opened, after)
      || opened.size !== before.size
      || opened.size !== after.size
      || opened.mode !== before.mode
      || opened.uid !== before.uid
      || !receiptInterpreterPathEntryIsTrusted(opened)) {
      throw new Error('runtime dependency identity changed during lease admission');
    }
    const sha256 = hashReceiptRuntimeFileDescriptor(
      descriptor,
      opened.size,
      label
    );
    const finalStats = fs.fstatSync(descriptor);
    if (!sameReceiptIdentity(finalStats, opened)
      || finalStats.size !== opened.size
      || finalStats.mode !== opened.mode
      || finalStats.uid !== opened.uid) {
      throw new Error('runtime dependency identity changed during content lease');
    }
    return {
      path: canonicalPath,
      descriptor,
      identity: {
        dev: opened.dev,
        ino: opened.ino,
        size: opened.size,
        mode: opened.mode,
        uid: opened.uid
      },
      sha256
    };
  } catch (error) {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(
      `${label} dirfd helper runtime dependency lease failed: ${error.message}`
    );
  }
}

function verifyReceiptRuntimeDependencyLease(lease, label) {
  try {
    const descriptorStats = fs.fstatSync(lease.descriptor);
    const pathStats = fs.lstatSync(lease.path);
    if (!descriptorStats.isFile()
      || !pathStats.isFile()
      || !sameReceiptIdentity(descriptorStats, lease.identity)
      || !sameReceiptIdentity(pathStats, lease.identity)
      || descriptorStats.size !== lease.identity.size
      || pathStats.size !== lease.identity.size
      || descriptorStats.mode !== lease.identity.mode
      || pathStats.mode !== lease.identity.mode
      || descriptorStats.uid !== lease.identity.uid
      || pathStats.uid !== lease.identity.uid
      || !receiptInterpreterPathEntryIsTrusted(pathStats)) {
      throw new Error('runtime dependency identity changed while the helper executed');
    }
    const digest = hashReceiptRuntimeFileDescriptor(
      lease.descriptor,
      lease.identity.size,
      label
    );
    if (digest !== lease.sha256) {
      throw new Error('runtime dependency bytes changed while the helper executed');
    }
  } catch (error) {
    throw new Error(
      `${label} dirfd helper runtime dependency lease failed: ${error.message}`
    );
  }
}

function closeReceiptRuntimeClosureLease(closure, label) {
  if (!closure || !Array.isArray(closure.dependencies)) return null;
  let failure = null;
  for (const lease of [...closure.dependencies].reverse()) {
    if (!Number.isInteger(lease?.descriptor)) continue;
    try {
      fs.closeSync(lease.descriptor);
      lease.descriptor = null;
    } catch (error) {
      failure ??= new Error(
        `${label} dirfd helper runtime dependency descriptor close failed: ${error.message}`
      );
    }
  }
  return failure;
}

function verifyReceiptRuntimeClosureLease(closure, label) {
  for (const lease of closure.dependencies) {
    verifyReceiptRuntimeDependencyLease(lease, label);
  }
}

function parseReceiptRuntimeProbeResult(
  result,
  label,
  interpreterLease,
  probeRootIdentity
) {
  if (result.error) {
    throw new Error(`${label} runtime closure probe launch failed: ${result.error.message}`);
  }
  let response;
  try {
    response = JSON.parse(String(result.stdout ?? ''));
  } catch (error) {
    const stderr = String(result.stderr ?? '').trim();
    throw new Error(
      `${label} runtime closure probe returned invalid JSON: ${error.message}`
        + (stderr ? `; stderr: ${stderr}` : '')
    );
  }
  if (response.ok !== true || result.status !== 0) {
    throw new Error(
      `${label} runtime closure probe failed: ${response.error ?? `status ${result.status}`}`
    );
  }
  const eventTypes = new Set(
    Array.isArray(response.events)
      ? response.events.map(event => event?.type)
      : []
  );
  const interpreterCloseEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'interpreter-capability-closed'
    )
    : [];
  const landlockEvents = Array.isArray(response.events)
    ? response.events.filter(event => event?.type === 'landlock-supported')
    : [];
  const rootConfinementEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'filesystem-write-confined'
        && event?.scope === 'repository-root'
    )
    : [];
  const mountBoundaryEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'mount-boundary-supported'
    )
    : [];
  const metadataConfinementEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'filesystem-metadata-confined'
    )
    : [];
  const rootConfinement = rootConfinementEvents[0];
  const mountBoundary = mountBoundaryEvents[0];
  const metadataConfinement = metadataConfinementEvents[0];
  if (!eventTypes.has('runtime-confined')
    || metadataConfinementEvents.length !== 1
    || !receiptFilesystemMetadataProofIsValid(metadataConfinement)
    || landlockEvents.length !== 1
    || Number(landlockEvents[0]?.abi) < 3
    || rootConfinementEvents.length !== 1
    || Number(rootConfinement?.abi) < 3
    || String(rootConfinement?.dev) !== String(probeRootIdentity?.dev)
    || String(rootConfinement?.ino) !== String(probeRootIdentity?.ino)
    || mountBoundaryEvents.length !== 1
    || mountBoundary?.syscall !== 'openat2'
    || Number(mountBoundary?.resolve) !== 0x0f
    || String(mountBoundary?.dev) !== String(probeRootIdentity?.dev)
    || String(mountBoundary?.ino) !== String(probeRootIdentity?.ino)
    || interpreterCloseEvents.length !== 1
    || String(interpreterCloseEvents[0]?.dev)
      !== String(interpreterLease.identity.dev)
    || String(interpreterCloseEvents[0]?.ino)
      !== String(interpreterLease.identity.ino)) {
    throw new Error(`${label} runtime closure probe omitted confinement proof`);
  }
  return response;
}

function probeReceiptRuntimeClosure({ interpreterLease, label, control }) {
  let probeRootDescriptor = null;
  let probeRootIdentity = null;
  let workingDirectory = null;
  let result = null;
  let failure = null;
  try {
    workingDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'industrial-exhaust-receipt-runtime-probe-')
    );
    fs.chmodSync(workingDirectory, 0o700);
    const before = fs.lstatSync(workingDirectory);
    probeRootDescriptor = fs.openSync(
      workingDirectory,
      fs.constants.O_RDONLY
        | (fs.constants.O_DIRECTORY ?? 0)
        | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const opened = fs.fstatSync(probeRootDescriptor);
    const admittedPath = fs.lstatSync(workingDirectory);
    const admittedMode = opened.mode & 0o777;
    if (!before.isDirectory()
      || !opened.isDirectory()
      || !admittedPath.isDirectory()
      || !sameReceiptIdentity(before, opened)
      || !sameReceiptIdentity(opened, admittedPath)
      || admittedMode !== 0o700) {
      throw new Error(
        `${label} runtime closure probe root admission failed`
      );
    }
    probeRootIdentity = {
      dev: opened.dev,
      ino: opened.ino
    };

    result = spawnSync(
      RECEIPT_DIRFD_INTERPRETER_EXEC_PATH,
      ['-I', '-S', '-B', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify({
          action: 'runtime_probe',
          fault: control?.runtime_probe_fault ?? null
        }),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio: [
          'pipe',
          'pipe',
          'pipe',
          probeRootDescriptor,
          interpreterLease.descriptor
        ],
        env: {
          PATH: '/usr/bin:/bin',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          PYTHONIOENCODING: 'utf-8',
          HOME: workingDirectory,
          TMPDIR: workingDirectory
        }
      }
    );

    const descriptorAfter = fs.fstatSync(probeRootDescriptor);
    const pathAfter = fs.lstatSync(workingDirectory);
    if (!descriptorAfter.isDirectory()
      || !pathAfter.isDirectory()
      || !sameReceiptIdentity(descriptorAfter, probeRootIdentity)
      || !sameReceiptIdentity(pathAfter, probeRootIdentity)
      || (descriptorAfter.mode & 0o777) !== 0o700
      || (pathAfter.mode & 0o777) !== 0o700) {
      throw new Error(
        `${label} runtime closure probe root changed while the helper executed`
      );
    }
    verifyReceiptInterpreterLease(interpreterLease, label);
  } catch (error) {
    failure = error;
  }

  if (probeRootDescriptor !== null) {
    try {
      fs.closeSync(probeRootDescriptor);
    } catch (error) {
      failure ??= new Error(
        `${label} runtime closure probe root descriptor close failed: ${error.message}`
      );
    }
  }
  if (workingDirectory !== null) {
    try {
      fs.rmSync(workingDirectory, { recursive: true, force: true });
    } catch (error) {
      failure ??= new Error(
        `${label} runtime closure probe cleanup failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;

  const response = parseReceiptRuntimeProbeResult(
    result,
    label,
    interpreterLease,
    probeRootIdentity
  );
  recordReceiptDirfdEvents(control, response.events);
  const injected = Array.isArray(control?.runtime_dependency_paths)
    ? control.runtime_dependency_paths
    : [];
  const runtimeFiles = normalizeReceiptRuntimeFiles(
    [...(response.runtime_files ?? []), ...injected],
    label
  );
  const dependencies = [];
  try {
    for (const runtimePath of runtimeFiles) {
      if (runtimePath === interpreterLease.path) continue;
      dependencies.push(
        openReceiptRuntimeDependencyLease(runtimePath, label)
      );
    }
  } catch (error) {
    closeReceiptRuntimeClosureLease({ dependencies }, label);
    throw error;
  }
  if (control && Array.isArray(control.events)) {
    control.events.push({
      type: 'runtime-closure-leased',
      file_count: runtimeFiles.length
    });
  }
  return { runtimeFiles, dependencies };
}

function runReceiptDirfdHelper({
  rootDescriptor,
  label,
  request
}) {
  const control = receiptDirfdTestControl();
  const interpreter = typeof control?.interpreter_path === 'string'
    ? control.interpreter_path
    : RECEIPT_DIRFD_HELPER_INTERPRETER;
  const allowUnleasedInterpreter = control?.allow_unleased_interpreter === true;
  const helperRequest = {
    ...request,
    fault: control?.fault ?? null
  };
  let lease = null;
  let runtimeClosure = null;
  let workingDirectory = null;
  let result = null;
  let failure = null;
  try {
    if (!allowUnleasedInterpreter) {
      lease = openReceiptInterpreterLease(interpreter, label);
      runtimeClosure = probeReceiptRuntimeClosure({
        interpreterLease: lease,
        label,
        control
      });
    }
    workingDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'industrial-exhaust-receipt-helper-')
    );
    fs.chmodSync(workingDirectory, 0o700);
    const executable = lease === null
      ? interpreter
      : RECEIPT_DIRFD_INTERPRETER_EXEC_PATH;
    const stdio = lease === null
      ? ['pipe', 'pipe', 'pipe', rootDescriptor]
      : ['pipe', 'pipe', 'pipe', rootDescriptor, lease.descriptor];
    result = spawnSync(
      executable,
      ['-I', '-S', '-B', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify(helperRequest),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio,
        env: {
          PATH: '/usr/bin:/bin',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          PYTHONIOENCODING: 'utf-8',
          HOME: workingDirectory,
          TMPDIR: workingDirectory
        }
      }
    );
    if (lease !== null) verifyReceiptInterpreterLease(lease, label);
    if (runtimeClosure !== null) {
      verifyReceiptRuntimeClosureLease(runtimeClosure, label);
    }
  } catch (error) {
    failure = error;
  }

  const runtimeCloseFailure = closeReceiptRuntimeClosureLease(
    runtimeClosure,
    label
  );
  failure ??= runtimeCloseFailure;
  const leaseCloseFailure = closeReceiptInterpreterLease(lease, label);
  failure ??= leaseCloseFailure;
  if (workingDirectory !== null) {
    try {
      fs.rmSync(workingDirectory, { recursive: true, force: true });
    } catch (error) {
      failure ??= new Error(
        `${label} dirfd helper working-directory cleanup failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;
  if (result.error) {
    throw new Error(`${label} dirfd helper launch failed: ${result.error.message}`);
  }

  let response;
  try {
    response = JSON.parse(String(result.stdout ?? ''));
  } catch (error) {
    const stderr = String(result.stderr ?? '').trim();
    throw new Error(
      `${label} dirfd helper returned invalid JSON: ${error.message}`
        + (stderr ? `; stderr: ${stderr}` : '')
    );
  }
  recordReceiptDirfdEvents(control, response.events);
  if (response.ok !== true) {
    throw new Error(
      `${label} dirfd helper failed: ${response.error ?? 'unknown helper failure'}`
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${label} dirfd helper exited with status ${result.status}`
    );
  }
  if (!allowUnleasedInterpreter) {
    const eventTypes = new Set(
      Array.isArray(response.events)
        ? response.events.map(event => event?.type)
        : []
    );
    const interpreterCloseEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'interpreter-capability-closed'
      )
      : [];
    const writeConfinementEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'filesystem-write-confined'
      )
      : [];
    const capabilityEvents = Array.isArray(response.events)
      ? response.events.filter(event => event?.type === 'capability-narrowed')
      : [];
    const mountBoundaryEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'mount-boundary-supported'
      )
      : [];
    const metadataConfinementEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'filesystem-metadata-confined'
      )
      : [];
    const rootConfinement = writeConfinementEvents.find(
      event => event?.scope === 'repository-root'
    );
    const parentConfinement = writeConfinementEvents.find(
      event => event?.scope === 'receipt-parent'
    );
    const directoryConfinements = writeConfinementEvents.filter(
      event => typeof event?.scope === 'string'
        && event.scope.startsWith('directory-chain:')
    );
    const chainEntries = Array.isArray(response.chain)
      ? response.chain.slice(1)
      : [];
    const directoryConfinementByScope = new Map(
      directoryConfinements.map(event => [event.scope, event])
    );
    const directoryChainConfined =
      directoryConfinementByScope.size === directoryConfinements.length
      && directoryConfinements.length === chainEntries.length
      && chainEntries.every(entry => {
        const event = directoryConfinementByScope.get(
          `directory-chain:${entry?.display}`
        );
        return event
          && Number(event.abi) >= 3
          && String(event.dev) === String(entry?.dev)
          && String(event.ino) === String(entry?.ino);
      });
    const rootChainEntry = Array.isArray(response.chain)
      ? response.chain[0]
      : null;
    const mountBoundary = mountBoundaryEvents[0];
    const metadataConfinement = metadataConfinementEvents[0];
    if (!eventTypes.has('runtime-confined')
      || metadataConfinementEvents.length !== 1
      || !receiptFilesystemMetadataProofIsValid(metadataConfinement)
      || mountBoundaryEvents.length !== 1
      || mountBoundary?.syscall !== 'openat2'
      || Number(mountBoundary?.resolve) !== 0x0f
      || String(mountBoundary?.dev) !== String(rootChainEntry?.dev)
      || String(mountBoundary?.ino) !== String(rootChainEntry?.ino)
      || writeConfinementEvents.length !== chainEntries.length + 2
      || capabilityEvents.length !== 1
      || !rootConfinement
      || !parentConfinement
      || !directoryChainConfined
      || Number(rootConfinement?.abi) < 3
      || Number(parentConfinement?.abi) < 3
      || String(parentConfinement?.dev) !== String(capabilityEvents[0]?.dev)
      || String(parentConfinement?.ino) !== String(capabilityEvents[0]?.ino)
      || interpreterCloseEvents.length !== 1
      || String(interpreterCloseEvents[0]?.dev)
        !== String(lease?.identity?.dev)
      || String(interpreterCloseEvents[0]?.ino)
        !== String(lease?.identity?.ino)) {
      throw new Error(
        `${label} dirfd helper omitted runtime-confinement proof`
      );
    }
    const actualRuntimeFiles = normalizeReceiptRuntimeFiles(
      response.runtime_files,
      label
    );
    if (JSON.stringify(actualRuntimeFiles)
      !== JSON.stringify(runtimeClosure.runtimeFiles)) {
      throw new Error(
        `${label} dirfd helper runtime closure changed after admission`
      );
    }
  }
  return response;
}

function openReceiptRootDescriptor(rootDir, label) {
  const rootCustody = inspectReceiptRoot(rootDir);
  let descriptor;
  try {
    descriptor = fs.openSync(
      rootCustody.root,
      fs.constants.O_RDONLY
        | (fs.constants.O_DIRECTORY ?? 0)
        | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const descriptorStats = fs.fstatSync(descriptor);
    const pathStats = fs.lstatSync(rootCustody.root);
    if (!descriptorStats.isDirectory()
      || !pathStats.isDirectory()
      || !sameReceiptIdentity(descriptorStats, rootCustody.identity)
      || !sameReceiptIdentity(descriptorStats, pathStats)) {
      throw new Error('root identity changed during descriptor admission');
    }
    return {
      root: rootCustody.root,
      descriptor,
      identity: {
        dev: descriptorStats.dev,
        ino: descriptorStats.ino
      }
    };
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(`${label} root descriptor admission failed: ${error.message}`);
  }
}

function closeReceiptRootDescriptor(session, label) {
  if (!session || !Number.isInteger(session.descriptor)) return null;
  try {
    fs.closeSync(session.descriptor);
    session.descriptor = null;
    return null;
  } catch (error) {
    return new Error(`${label} root descriptor close failed: ${error.message}`);
  }
}

function sameReceiptIdentityText(stats, identity) {
  return String(stats.dev) === String(identity?.dev)
    && String(stats.ino) === String(identity?.ino);
}

function expectedReceiptDirectoryDisplays(relativePath, label) {
  const segments = String(relativePath).split('/');
  if (segments.length < 1
    || segments.some(segment => !segment || segment === '.' || segment === '..'
      || segment.includes('\\'))) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  const displays = ['.'];
  const current = [];
  for (const segment of segments.slice(0, -1)) {
    current.push(segment);
    displays.push(current.join('/'));
  }
  return displays;
}

function verifyReceiptDirectoryReachability(
  session,
  chain,
  relativePath,
  label
) {
  const expectedDisplays = expectedReceiptDirectoryDisplays(
    relativePath,
    label
  );
  if (!Array.isArray(chain) || chain.length !== expectedDisplays.length) {
    throw new Error(`${label} returned an incomplete directory chain`);
  }

  const rootDescriptorStats = fs.fstatSync(session.descriptor);
  if (!rootDescriptorStats.isDirectory()
    || !sameReceiptIdentity(rootDescriptorStats, session.identity)) {
    throw new Error(`${label} directory chain changed at .`);
  }

  const normalized = [];
  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    const expectedDisplay = expectedDisplays[index];
    if (!entry || entry.display !== expectedDisplay
      || !['string', 'number', 'bigint'].includes(typeof entry.dev)
      || !['string', 'number', 'bigint'].includes(typeof entry.ino)) {
      throw new Error(`${label} returned an invalid directory-chain entry`);
    }
    const segments = expectedDisplay === '.' ? [] : expectedDisplay.split('/');
    const absolutePath = path.resolve(session.root, ...segments);
    const relative = path.relative(session.root, absolutePath);
    if (expectedDisplay !== '.'
      && (!relative || relative.startsWith(`..${path.sep}`)
        || path.isAbsolute(relative))) {
      throw new Error(`${label} directory chain escapes the repository root`);
    }
    let stats;
    try {
      stats = fs.lstatSync(absolutePath);
    } catch (error) {
      throw new Error(
        `${label} directory chain changed at ${expectedDisplay}: ${error.message}`
      );
    }
    if (!stats.isDirectory() || !sameReceiptIdentityText(stats, entry)) {
      throw new Error(`${label} directory chain changed at ${expectedDisplay}`);
    }
    normalized.push({
      display: expectedDisplay,
      dev: String(entry.dev),
      ino: String(entry.ino)
    });
  }
  return normalized;
}

function readReceiptDescriptorBytes(descriptor, label) {
  const chunks = [];
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let total = 0;
  while (true) {
    const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
    if (count === 0) break;
    total += count;
    if (total > RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES) {
      throw new Error(`${label} exceeds the parent byte limit`);
    }
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return Buffer.concat(chunks, total);
}

function attestVisibleReceipt({
  session,
  relativePath,
  chain,
  expectedIdentity,
  expectedSha256,
  label,
  validateReceipt
}) {
  if (!expectedIdentity || typeof expectedIdentity !== 'object'
    || typeof expectedSha256 !== 'string'
    || !/^[a-f0-9]{64}$/u.test(expectedSha256)) {
    throw new Error(`${label} visible receipt attestation lacks helper identity`);
  }

  const absolutePath = path.resolve(
    session.root,
    ...relativePath.split('/')
  );
  let descriptor = null;
  let failure = null;
  try {
    verifyReceiptDirectoryReachability(
      session,
      chain,
      relativePath,
      `${label} visible preflight`
    );
    descriptor = fs.openSync(
      absolutePath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const openedStats = fs.fstatSync(descriptor);
    const visibleStats = fs.lstatSync(absolutePath);
    if (!openedStats.isFile()
      || openedStats.nlink !== 1
      || !visibleStats.isFile()
      || visibleStats.nlink !== 1
      || !sameReceiptIdentity(openedStats, visibleStats)
      || !sameReceiptIdentityText(openedStats, expectedIdentity)) {
      throw new Error('visible final receipt identity does not match helper proof');
    }

    const retainedBytes = readReceiptDescriptorBytes(descriptor, label);
    const digest = crypto
      .createHash('sha256')
      .update(retainedBytes)
      .digest('hex');
    if (digest !== expectedSha256) {
      throw new Error('visible final receipt bytes do not match helper proof');
    }
    const retainedReceipt = parseReceiptJsonText(
      retainedBytes.toString('utf8'),
      label
    );
    validateReceipt(retainedReceipt);

    const finalStats = fs.fstatSync(descriptor);
    const finalVisibleStats = fs.lstatSync(absolutePath);
    if (!finalStats.isFile()
      || finalStats.nlink !== 1
      || !finalVisibleStats.isFile()
      || finalVisibleStats.nlink !== 1
      || !sameReceiptIdentity(finalStats, openedStats)
      || !sameReceiptIdentity(finalVisibleStats, openedStats)
      || !sameReceiptIdentityText(finalStats, expectedIdentity)) {
      throw new Error('visible final receipt identity changed during attestation');
    }
    verifyReceiptDirectoryReachability(
      session,
      chain,
      relativePath,
      `${label} visible postflight`
    );
  } catch (error) {
    failure = new Error(
      `${label} visible receipt attestation failed: ${error.message}`
    );
  }

  if (descriptor !== null) {
    try {
      fs.closeSync(descriptor);
    } catch (error) {
      failure ??= new Error(
        `${label} visible receipt descriptor close failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;
}


function decodeReceiptDirfdRetainedBytes(response, label) {
  if (typeof response.retained_base64 !== 'string'
    || typeof response.retained_sha256 !== 'string') {
    throw new Error(`${label} dirfd helper omitted retained receipt bytes`);
  }
  const compact = response.retained_base64.replace(/\s+/gu, '');
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.toString('base64').replace(/=+$/u, '')
    !== compact.replace(/=+$/u, '')) {
    throw new Error(`${label} dirfd helper returned invalid base64`);
  }
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== response.retained_sha256) {
    throw new Error(`${label} dirfd helper returned inconsistent retained bytes`);
  }
  return bytes;
}

function publishReceiptJson({
  rootDir,
  relativePath,
  receipt,
  label,
  validateReceipt
}) {
  if (typeof relativePath !== 'string' || !relativePath
    || relativePath.startsWith('/') || relativePath.includes('\\')
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith('../')) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  if (typeof validateReceipt !== 'function') {
    throw new Error(`${label} requires an anchored validation callback`);
  }

  const rootSession = openReceiptRootDescriptor(rootDir, label);
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  const absolutePath = path.resolve(
    rootSession.root,
    ...relativePath.split('/')
  );
  let failure = null;
  try {
    const publication = runReceiptDirfdHelper({
      rootDescriptor: rootSession.descriptor,
      label,
      request: {
        action: 'publish',
        relative_path: relativePath,
        serialized_base64: Buffer.from(serialized, 'utf8').toString('base64')
      }
    });
    const publicationChain = verifyReceiptDirectoryReachability(
      rootSession,
      publication.chain,
      relativePath,
      `${label} publication`
    );
    const retainedBytes = decodeReceiptDirfdRetainedBytes(publication, label);
    const retainedReceipt = parseReceiptJsonText(
      retainedBytes.toString('utf8'),
      label
    );
    validateReceipt(retainedReceipt);

    const verification = runReceiptDirfdHelper({
      rootDescriptor: rootSession.descriptor,
      label,
      request: {
        action: 'verify',
        relative_path: relativePath,
        expected_identity: publication.final_identity,
        expected_sha256: publication.retained_sha256
      }
    });
    if (verification.retained_sha256 !== publication.retained_sha256
      || JSON.stringify(verification.final_identity)
        !== JSON.stringify(publication.final_identity)) {
      throw new Error(`${label} publication identity changed after validation`);
    }
    const verificationChain = verifyReceiptDirectoryReachability(
      rootSession,
      verification.chain,
      relativePath,
      `${label} validation`
    );
    if (JSON.stringify(verificationChain) !== JSON.stringify(publicationChain)) {
      throw new Error(`${label} directory chain changed after validation`);
    }
    attestVisibleReceipt({
      session: rootSession,
      relativePath,
      chain: verification.chain,
      expectedIdentity: verification.final_identity,
      expectedSha256: verification.retained_sha256,
      label,
      validateReceipt
    });
  } catch (error) {
    failure = error;
  }

  const closeFailure = closeReceiptRootDescriptor(rootSession, label);
  failure ??= closeFailure;
  if (failure) throw failure;
  return absolutePath;
}


export function indexReceiptPath(rootDir, sourceId, hash) {
  return path.join(rootDir, 'receipts', 'exhaust', 'indexes', sourceId, `${hash}.json`);
}

export function writeIndexReceipt({ rootDir, source, parsedIndex, html, capturedAt, responseHeaders = {} }) {
  const computedBodySha256 = sha256(html);
  if (parsedIndex.index_sha256 !== computedBodySha256) {
    throw new Error('index body hash does not match parsed index digest');
  }
  const receiptPath = indexReceiptPath(rootDir, source.id, parsedIndex.index_sha256);
  const relativePath = portableReceiptPath(rootDir, receiptPath);
  const receipt = {
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
  };
  publishReceiptJson({
  rootDir,
  relativePath,
  receipt,
  label: `index receipt ${relativePath}`,
  validateReceipt: receiptOverride => validateIndexReceiptAtPath({
    rootDir,
    relativePath,
    expectedSourceId: source.id,
    expectedIndexUrl: source.index_url,
    expectedIndexSha256: parsedIndex.index_sha256,
    expectedBody: html,
    receiptOverride
  })
});
  return relativePath;
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
  const relativePath = portableReceiptPath(rootDir, receiptPath);
  const contentType = String(responseHeaders.content_type ?? '');
  const isText = contentType.startsWith('text/')
    || /(?:json|xml|html|javascript)/iu.test(contentType)
    || contentType === '';
  const receipt = {
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
  publishReceiptJson({
  rootDir,
  relativePath,
  receipt,
  label: `artifact receipt ${relativePath}`,
  validateReceipt: receiptOverride => validateArtifactReceiptAtPath({
    rootDir,
    relativePath,
    expectedCanonicalUrl: canonicalUrl,
    expectedBodySha256: bodySha256,
    expectedBody: body,
    receiptOverride
  })
});
  return relativePath;
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
