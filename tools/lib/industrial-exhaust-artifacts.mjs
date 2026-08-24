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

const RECEIPT_DESCRIPTOR_ROOT = '/proc/self/fd';

function receiptDirectoryDisplayPath(root, absolutePath) {
  const relative = path.relative(root, absolutePath);
  return relative ? relative.split(path.sep).join('/') : '.';
}

function receiptDescriptorPath(descriptor, childName = null) {
  if (process.platform !== 'linux' || !fs.existsSync(RECEIPT_DESCRIPTOR_ROOT)) {
    throw new Error('descriptor-relative receipt publication requires Linux procfs');
  }
  const base = path.join(RECEIPT_DESCRIPTOR_ROOT, String(descriptor));
  if (childName === null) return base;
  if (typeof childName !== 'string' || !childName
    || childName === '.' || childName === '..'
    || childName.includes('/') || childName.includes('\\')) {
    throw new Error(`invalid descriptor-relative receipt path component: ${childName}`);
  }
  return path.join(base, childName);
}

function synchronizeReceiptDirectoryDescriptor(descriptor, label) {
  let before;
  try {
    before = fs.fstatSync(descriptor);
    if (!before.isDirectory()) throw new Error('descriptor is not a directory');
    fs.fsyncSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!after.isDirectory() || !sameReceiptIdentity(before, after)) {
      throw new Error('directory descriptor identity changed');
    }
  } catch (error) {
    throw new Error(`${label} synchronization failed: ${error.message}`);
  }
}

function closeReceiptDirectorySession(session, label) {
  let failure = null;
  for (const entry of [...session.chain].reverse()) {
    try {
      fs.closeSync(entry.descriptor);
    } catch (error) {
      failure ??= new Error(`${label} directory descriptor close failed: ${error.message}`);
    }
  }
  return failure;
}

function verifyReceiptDirectorySession(session, label) {
  let currentRoot;
  try {
    currentRoot = fs.lstatSync(session.root);
  } catch (error) {
    throw new Error(`${label} directory chain changed at .: ${error.message}`);
  }
  if (!currentRoot.isDirectory()
    || !sameReceiptIdentity(currentRoot, session.chain[0].identity)) {
    throw new Error(`${label} directory chain changed at .`);
  }

  for (let index = 1; index < session.chain.length; index += 1) {
    const parent = session.chain[index - 1];
    const child = session.chain[index];
    const anchoredPath = receiptDescriptorPath(parent.descriptor, child.segment);
    let pathStats;
    let descriptorStats;
    try {
      pathStats = fs.lstatSync(anchoredPath);
      descriptorStats = fs.fstatSync(child.descriptor);
    } catch (error) {
      throw new Error(
        `${label} directory chain changed at ${child.display}: ${error.message}`
      );
    }
    if (!pathStats.isDirectory()
      || !descriptorStats.isDirectory()
      || !sameReceiptIdentity(pathStats, descriptorStats)
      || !sameReceiptIdentity(descriptorStats, child.identity)) {
      throw new Error(`${label} directory chain changed at ${child.display}`);
    }
  }
}

function openReceiptDirectorySession(rootDir, relativePath, label) {
  const segments = relativePath === '.' ? [] : String(relativePath).split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..'
    || segment.includes('\\'))) {
    throw new Error(`${label} is not a canonical directory path: ${relativePath}`);
  }

  const rootCustody = inspectReceiptRoot(rootDir);
  let rootDescriptor;
  try {
    rootDescriptor = fs.openSync(
      rootCustody.root,
      fs.constants.O_RDONLY
        | (fs.constants.O_DIRECTORY ?? 0)
        | (fs.constants.O_NOFOLLOW ?? 0)
    );
  } catch (error) {
    throw new Error(`${label} root descriptor open failed: ${error.message}`);
  }

  const session = {
    root: rootCustody.root,
    chain: []
  };
  try {
    const rootStats = fs.fstatSync(rootDescriptor);
    const currentRootStats = fs.lstatSync(rootCustody.root);
    if (!rootStats.isDirectory()
      || !sameReceiptIdentity(rootStats, rootCustody.identity)
      || !sameReceiptIdentity(rootStats, currentRootStats)) {
      throw new Error(`${label} root identity changed before descriptor anchoring`);
    }
    session.chain.push({
      descriptor: rootDescriptor,
      segment: null,
      display: '.',
      identity: { dev: rootStats.dev, ino: rootStats.ino }
    });

    for (const segment of segments) {
      const parent = session.chain.at(-1);
      const anchoredPath = receiptDescriptorPath(parent.descriptor, segment);
      const display = session.chain.length === 1
        ? segment
        : `${session.chain.at(-1).display}/${segment}`;
      let descriptor;
      try {
        descriptor = fs.openSync(
          anchoredPath,
          fs.constants.O_RDONLY
            | (fs.constants.O_DIRECTORY ?? 0)
            | (fs.constants.O_NOFOLLOW ?? 0)
        );
      } catch (error) {
        if (['ELOOP', 'ENOTDIR'].includes(error?.code)) {
          throw new Error(
            `${label} contains an unsupported path entry: ${display}`
          );
        }
        if (error?.code !== 'ENOENT') {
          throw new Error(`${label} directory open failed: ${error.message}`);
        }
        try {
          fs.mkdirSync(anchoredPath);
        } catch (mkdirError) {
          if (mkdirError?.code !== 'EEXIST') {
            throw new Error(`${label} directory creation failed: ${mkdirError.message}`);
          }
        }
        try {
          descriptor = fs.openSync(
            anchoredPath,
            fs.constants.O_RDONLY
              | (fs.constants.O_DIRECTORY ?? 0)
              | (fs.constants.O_NOFOLLOW ?? 0)
          );
        } catch (openError) {
          if (['ELOOP', 'ENOTDIR'].includes(openError?.code)) {
            throw new Error(
              `${label} contains an unsupported path entry: ${display}`
            );
          }
          throw new Error(`${label} directory open failed: ${openError.message}`);
        }
      }

      const descriptorStats = fs.fstatSync(descriptor);
      const pathStats = fs.lstatSync(anchoredPath);
      if (!descriptorStats.isDirectory()
        || !pathStats.isDirectory()
        || !sameReceiptIdentity(descriptorStats, pathStats)) {
        fs.closeSync(descriptor);
        throw new Error(`${label} directory identity changed while opening ${segment}`);
      }

      session.chain.push({
        descriptor,
        segment,
        display,
        identity: { dev: descriptorStats.dev, ino: descriptorStats.ino }
      });
      synchronizeReceiptDirectoryDescriptor(
        descriptor,
        `${label} directory ${display}`
      );
      synchronizeReceiptDirectoryDescriptor(
        parent.descriptor,
        `${label} parent directory ${parent.display}`
      );
    }

    verifyReceiptDirectorySession(session, label);
    return session;
  } catch (error) {
    const closeFailure = closeReceiptDirectorySession(session, label);
    if (session.chain.length === 0) {
      try {
        fs.closeSync(rootDescriptor);
      } catch (closeError) {
        if (!closeFailure) {
          throw new Error(
            `${error.message}; ${label} root descriptor close failed: ${closeError.message}`
          );
        }
      }
    }
    if (closeFailure) {
      throw new Error(`${error.message}; ${closeFailure.message}`);
    }
    throw error;
  }
}

function inspectAnchoredReceiptFile(parentDescriptor, fileName, label) {
  const anchoredPath = receiptDescriptorPath(parentDescriptor, fileName);
  let stats;
  try {
    stats = fs.lstatSync(anchoredPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { anchoredPath, exists: false, stats: null };
    }
    throw new Error(`${label} path inspection failed: ${error.message}`);
  }
  if (!stats.isFile()) {
    throw new Error(`${label} contains an unsupported path entry`);
  }
  if (stats.nlink !== 1) {
    throw new Error(`${label} contains a multiply linked receipt file`);
  }
  return { anchoredPath, exists: true, stats };
}

function openAnchoredReceiptFile(parentDescriptor, fileName, label) {
  const anchoredPath = receiptDescriptorPath(parentDescriptor, fileName);
  let descriptor;
  try {
    descriptor = fs.openSync(
      anchoredPath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const descriptorStats = fs.fstatSync(descriptor);
    const pathStats = fs.lstatSync(anchoredPath);
    if (!descriptorStats.isFile()
      || descriptorStats.nlink !== 1
      || !pathStats.isFile()
      || pathStats.nlink !== 1
      || !sameReceiptIdentity(descriptorStats, pathStats)) {
      throw new Error('receipt file identity changed');
    }
    return {
      descriptor,
      anchoredPath,
      identity: { dev: descriptorStats.dev, ino: descriptorStats.ino }
    };
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(`${label} file open failed: ${error.message}`);
  }
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

  const parentRelativePath = path.posix.dirname(relativePath);
  const finalName = path.posix.basename(relativePath);
  const session = openReceiptDirectorySession(
    rootDir,
    parentRelativePath,
    `${label} parent directory`
  );
  const parent = session.chain.at(-1);
  const finalInspection = inspectAnchoredReceiptFile(
    parent.descriptor,
    finalName,
    label
  );
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  let tempName = null;
  let tempIdentity = null;
  let published = false;
  let finalDescriptor = null;
  let failure = null;
  let absolutePath = path.resolve(session.root, ...relativePath.split('/'));

  try {
    if (!finalInspection.exists) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidateName =
          `${finalName}.${process.pid}.${crypto.randomBytes(16).toString('hex')}.tmp`;
        const candidatePath = receiptDescriptorPath(parent.descriptor, candidateName);
        let descriptor;
        try {
          descriptor = fs.openSync(
            candidatePath,
            fs.constants.O_WRONLY
              | fs.constants.O_CREAT
              | fs.constants.O_EXCL
              | (fs.constants.O_NOFOLLOW ?? 0),
            0o600
          );
        } catch (error) {
          if (error?.code === 'EEXIST') continue;
          throw new Error(`${label} temporary publication failed: ${error.message}`);
        }
        tempName = candidateName;
        try {
          fs.writeFileSync(descriptor, serialized, 'utf8');
          fs.fsyncSync(descriptor);
          const stats = fs.fstatSync(descriptor);
          if (!stats.isFile() || stats.nlink !== 1) {
            throw new Error(
              `${label} temporary publication is not an exclusive regular file`
            );
          }
          tempIdentity = { dev: stats.dev, ino: stats.ino };
        } finally {
          fs.closeSync(descriptor);
        }
        break;
      }
      if (!tempName || !tempIdentity) {
        throw new Error(
          `${label} could not allocate an exclusive temporary publication`
        );
      }

      try {
        fs.linkSync(
          receiptDescriptorPath(parent.descriptor, tempName),
          receiptDescriptorPath(parent.descriptor, finalName)
        );
        published = true;
      } catch (error) {
        if (error?.code !== 'EEXIST') {
          throw new Error(`${label} no-overwrite publication failed: ${error.message}`);
        }
      }
    }
  } catch (error) {
    failure = error;
  }

  if (tempName) {
    try {
      fs.unlinkSync(receiptDescriptorPath(parent.descriptor, tempName));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        failure ??= new Error(`${label} temporary cleanup failed: ${error.message}`);
      }
    }
  }

  try {
    synchronizeReceiptDirectoryDescriptor(
      parent.descriptor,
      `${label} publication directory`
    );
  } catch (error) {
    failure ??= error;
  }

  try {
    verifyReceiptDirectorySession(session, `${label} publication`);
  } catch (error) {
    failure ??= error;
  }

  if (!failure) {
    try {
      const opened = openAnchoredReceiptFile(
        parent.descriptor,
        finalName,
        label
      );
      finalDescriptor = opened.descriptor;
      if (published && !sameReceiptIdentity(opened.identity, tempIdentity)) {
        throw new Error(`${label} publication identity changed before validation`);
      }
      const retainedReceipt = parseReceiptJsonText(
        fs.readFileSync(finalDescriptor, 'utf8'),
        label
      );
      validateReceipt(retainedReceipt);

      const finalStats = fs.fstatSync(finalDescriptor);
      const finalPathStats = fs.lstatSync(opened.anchoredPath);
      if (!finalStats.isFile()
        || finalStats.nlink !== 1
        || !finalPathStats.isFile()
        || finalPathStats.nlink !== 1
        || !sameReceiptIdentity(finalStats, finalPathStats)
        || !sameReceiptIdentity(finalStats, opened.identity)) {
        throw new Error(`${label} publication identity changed during validation`);
      }
      verifyReceiptDirectorySession(session, `${label} validation`);
    } catch (error) {
      failure = error;
    }
  }

  if (finalDescriptor !== null) {
    try {
      fs.closeSync(finalDescriptor);
    } catch (error) {
      failure ??= new Error(`${label} file descriptor close failed: ${error.message}`);
    }
  }
  const closeFailure = closeReceiptDirectorySession(session, label);
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
