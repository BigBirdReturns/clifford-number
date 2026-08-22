#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def insert_before(text: str, anchor: str, addition: str, label: str) -> str:
    return replace_once(text, anchor, addition + anchor, label)


root = pathlib.Path(sys.argv[1]).resolve()
source_path = root / "tools/lib/industrial-exhaust-artifacts.mjs"
hydrator_path = root / "tools/hydrate-industrial-exhaust.mjs"
test_path = root / "test/industrial-exhaust-artifacts.test.js"
source = source_path.read_text(encoding="utf-8")
hydrator = hydrator_path.read_text(encoding="utf-8")
test = test_path.read_text(encoding="utf-8")

receipt_validator = r'''function portableReceiptPath(rootDir, absolutePath) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(absolutePath));
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`receipt path escapes repository root: ${absolutePath}`);
  }
  return relative.split(path.sep).join('/');
}

function loadReceiptJson(rootDir, relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath
    || relativePath.startsWith('/') || relativePath.includes('\\')
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith('../')) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  const root = path.resolve(rootDir);
  const absolutePath = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(root, absolutePath);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes repository root`);
  }
  if (!fs.existsSync(absolutePath)) throw new Error(`${label} does not exist: ${relativePath}`);
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return receipt;
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

export function validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }) {
  const root = path.resolve(rootDir);
  validateDiscoveryRevisionLineage(discoveryRecords);
  validateArtifactRevisionLineage(artifacts);
  const indexReceipts = new Map();
  const artifactReceipts = new Map();

  for (const record of discoveryRecords) {
    const id = record.discovery_id;
    const indexSha256 = assertSha256Digest(record.index_sha256, `discovery revision ${id} index_sha256`);
    const rawItemSha256 = assertSha256Digest(record.raw_item_sha256, `discovery revision ${id} raw_item_sha256`);
    const expectedPath = portableReceiptPath(root, indexReceiptPath(root, record.source_id, indexSha256));
    if (record.index_receipt_path !== expectedPath) {
      throw new Error(`discovery revision ${id} index_receipt_path does not match source_id and index_sha256`);
    }
    let cached = indexReceipts.get(expectedPath);
    if (!cached) {
      const receipt = loadReceiptJson(root, expectedPath, `index receipt ${expectedPath}`);
      if (receipt.schema_version !== ARTIFACT_SCHEMA_VERSION
        || receipt.receipt_type !== 'first_party_publication_index_snapshot') {
        throw new Error(`index receipt ${expectedPath} has an invalid receipt contract`);
      }
      if (receipt.source_id !== record.source_id || receipt.index_url !== record.source_index_url) {
        throw new Error(`index receipt ${expectedPath} does not match its discovery source`);
      }
      if (receipt.index_sha256 !== indexSha256 || sha256(receipt.body) !== indexSha256) {
        throw new Error(`index receipt ${expectedPath} body bytes do not match index_sha256`);
      }
      if (receipt.body_encoding !== 'utf-8' || typeof receipt.body !== 'string') {
        throw new Error(`index receipt ${expectedPath} must retain a UTF-8 body`);
      }
      if (receipt.graph_effect !== GRAPH_EFFECT || receipt.promotion_authority !== false
        || receipt.canonical_mutation_authorized !== false) {
        throw new Error(`index receipt ${expectedPath} exceeds its governance boundary`);
      }
      cached = {
        receipt,
        anchors: discoveryAnchorKeys(receipt.body, receipt.index_url)
      };
      indexReceipts.set(expectedPath, cached);
    }
    if (cached.receipt.source_id !== record.source_id || cached.receipt.index_url !== record.source_index_url
      || cached.receipt.index_sha256 !== indexSha256) {
      throw new Error(`discovery revision ${id} is rebound to an unrelated index receipt`);
    }
    const anchorKey = stableJson([record.canonical_url, record.title, rawItemSha256]);
    if (!cached.anchors.has(anchorKey)) {
      throw new Error(`discovery revision ${id} raw_item_sha256 does not identify its stored index anchor`);
    }
  }

  for (const record of artifacts) {
    const id = record.artifact_id;
    const bodySha256 = assertSha256Digest(record.body_sha256, `artifact revision ${id} body_sha256`);
    const expectedPath = portableReceiptPath(root, artifactReceiptPath(root, record.canonical_url, bodySha256));
    if (record.body_receipt_path !== expectedPath) {
      throw new Error(`artifact revision ${id} body_receipt_path does not match canonical_url and body_sha256`);
    }
    let receipt = artifactReceipts.get(expectedPath);
    if (!receipt) {
      receipt = loadReceiptJson(root, expectedPath, `artifact receipt ${expectedPath}`);
      if (receipt.schema_version !== ARTIFACT_SCHEMA_VERSION
        || receipt.receipt_type !== 'first_party_publication_artifact_snapshot') {
        throw new Error(`artifact receipt ${expectedPath} has an invalid receipt contract`);
      }
      if (receipt.canonical_url !== record.canonical_url || receipt.body_sha256 !== bodySha256) {
        throw new Error(`artifact receipt ${expectedPath} does not match its artifact identity`);
      }
      if (receiptBodySha256(receipt, `artifact receipt ${expectedPath}`) !== bodySha256) {
        throw new Error(`artifact receipt ${expectedPath} body bytes do not match body_sha256`);
      }
      if (receipt.source_class !== SOURCE_CLASS || receipt.graph_effect !== GRAPH_EFFECT
        || receipt.promotion_authority !== false || receipt.canonical_mutation_authorized !== false) {
        throw new Error(`artifact receipt ${expectedPath} exceeds its governance boundary`);
      }
      artifactReceipts.set(expectedPath, receipt);
    }
    if (receipt.canonical_url !== record.canonical_url || receipt.body_sha256 !== bodySha256) {
      throw new Error(`artifact revision ${id} is rebound to an unrelated body receipt`);
    }
  }

  return {
    discovery_record_count: discoveryRecords.length,
    artifact_record_count: artifacts.length,
    index_receipt_count: indexReceipts.size,
    artifact_receipt_count: artifactReceipts.size
  };
}

'''
source = insert_before(source, "function normalizeDate(value) {", receipt_validator, "receipt custody validator")

hydrator = replace_once(
    hydrator,
    "  validateArtifactConfig,\n  writeArtifactReceipt,",
    "  validateArtifactConfig,\n  validateIndustrialExhaustReceiptCustody,\n  writeArtifactReceipt,",
    "hydrator receipt validator import",
)

old_audit = r'''  const enabledIndexes = config.indexes.filter(source => source.enabled);
  if (args.audit) {
    console.log(JSON.stringify({
      lane: ARTIFACT_LANE,
      enabled_indexes: enabledIndexes.map(source => ({ id: source.id, index_url: source.index_url, publisher: source.publisher })),
      allowed_hosts: config.hydration.allowed_hosts,
      default_limit: config.hydration.default_limit,
      graph_effect: 'none',
      canonical_mutation_authorized: false
    }, null, 2));
    return;
  }

  const capturedAt = isoNow();
  const timeoutMs = runtimeInteger('EXHAUST_TIMEOUT_MS', process.env.EXHAUST_TIMEOUT_MS || 30_000, 1_000, 300_000);
  const maxBytes = runtimeInteger('EXHAUST_ARTIFACT_MAX_BYTES', process.env.EXHAUST_ARTIFACT_MAX_BYTES || config.hydration.max_bytes, 1_000, 50_000_000);
  const delayMs = runtimeInteger('EXHAUST_ARTIFACT_DELAY_MS', process.env.EXHAUST_ARTIFACT_DELAY_MS || config.hydration.request_delay_ms, 0, 60_000);
  let discoveryRecords = readJsonl(path.join(dataDir, 'discovery-observations.jsonl'));
  let artifacts = readJsonl(path.join(dataDir, 'artifacts.jsonl'));
'''
new_audit = r'''  const enabledIndexes = config.indexes.filter(source => source.enabled);
  let discoveryRecords = readJsonl(path.join(dataDir, 'discovery-observations.jsonl'));
  let artifacts = readJsonl(path.join(dataDir, 'artifacts.jsonl'));
  const receiptCustody = validateIndustrialExhaustReceiptCustody({
    rootDir,
    discoveryRecords,
    artifacts
  });
  if (args.audit) {
    console.log(JSON.stringify({
      lane: ARTIFACT_LANE,
      enabled_indexes: enabledIndexes.map(source => ({ id: source.id, index_url: source.index_url, publisher: source.publisher })),
      allowed_hosts: config.hydration.allowed_hosts,
      default_limit: config.hydration.default_limit,
      receipt_custody: receiptCustody,
      graph_effect: 'none',
      canonical_mutation_authorized: false
    }, null, 2));
    return;
  }

  const capturedAt = isoNow();
  const timeoutMs = runtimeInteger('EXHAUST_TIMEOUT_MS', process.env.EXHAUST_TIMEOUT_MS || 30_000, 1_000, 300_000);
  const maxBytes = runtimeInteger('EXHAUST_ARTIFACT_MAX_BYTES', process.env.EXHAUST_ARTIFACT_MAX_BYTES || config.hydration.max_bytes, 1_000, 50_000_000);
  const delayMs = runtimeInteger('EXHAUST_ARTIFACT_DELAY_MS', process.env.EXHAUST_ARTIFACT_DELAY_MS || config.hydration.request_delay_ms, 0, 60_000);
'''
hydrator = replace_once(hydrator, old_audit, new_audit, "hydrator startup receipt audit")

hydrator = replace_once(
    hydrator,
    "  const artifactAlerts = buildArtifactAlerts(artifacts, { watchConfig, candidates });",
    "  if (!args.dryRun) {\n    validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts });\n  }\n  const artifactAlerts = buildArtifactAlerts(artifacts, { watchConfig, candidates });",
    "hydrator pre-output receipt audit",
)

test = replace_once(
    test,
    "  validateDiscoveryRevisionLineage,\n  writeArtifactReceipt",
    "  validateDiscoveryRevisionLineage,\n  validateIndustrialExhaustReceiptCustody,\n  writeArtifactReceipt,\n  writeIndexReceipt",
    "test receipt custody imports",
)

custody_tests = r'''const receiptCustodyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'industrial-exhaust-receipt-custody-'));
try {
  const custodyCapturedAt = '2026-08-19T00:00:00.000Z';
  const custodyIndexHtml = '<!doctype html><html><head><title>Custody index</title></head><body><a href="/news-releases/custody-example">Custody Example</a></body></html>';
  const custodySource = config.indexes[0];
  const custodyParsedIndex = parseHtmlLinkIndex(custodyIndexHtml, custodySource);
  const custodyIndexReceiptPath = writeIndexReceipt({
    rootDir: receiptCustodyRoot,
    source: custodySource,
    parsedIndex: custodyParsedIndex,
    html: custodyIndexHtml,
    capturedAt: custodyCapturedAt,
    responseHeaders: { content_type: 'text/html', etag: 'index-custody', last_modified: null }
  });
  const custodyDiscoveryRecords = mergeDiscoveryRecords({
    records: [],
    source: custodySource,
    parsedIndex: custodyParsedIndex,
    capturedAt: custodyCapturedAt,
    indexReceiptPath: custodyIndexReceiptPath
  }).records;
  const custodyCanonicalUrl = custodyDiscoveryRecords[0].canonical_url;
  const custodyBody = Buffer.from('<!doctype html><html><head><title>Custody Example</title></head><body><main>Custody receipt body with enough stable publisher text for semantic extraction and verification.</main></body></html>');
  const custodyBodySha256 = crypto.createHash('sha256').update(custodyBody).digest('hex');
  const custodyArtifactReceiptPath = writeArtifactReceipt({
    rootDir: receiptCustodyRoot,
    canonicalUrl: custodyCanonicalUrl,
    body: custodyBody,
    bodySha256: custodyBodySha256,
    capturedAt: custodyCapturedAt,
    responseHeaders: {
      content_type: 'text/html',
      etag: 'artifact-custody',
      last_modified: null,
      final_url: custodyCanonicalUrl,
      redirect_chain: []
    }
  });
  const custodyProjection = extractHtmlArtifact(custodyBody.toString('utf8'), custodyCanonicalUrl);
  const custodyArtifacts = mergeArtifactProjection({
    artifacts: [],
    candidate: {
      canonical_url: custodyCanonicalUrl,
      source_id: custodySource.id,
      publisher: custodySource.publisher,
      title: custodyDiscoveryRecords[0].title,
      seed_matched_terms: [],
      linked_records: [{ record_type: 'index_discovery', record_id: custodyDiscoveryRecords[0].discovery_id }]
    },
    sourceProjection: custodyProjection,
    capturedAt: custodyCapturedAt,
    bodyReceiptPath: custodyArtifactReceiptPath,
    bodySha256: custodyBodySha256,
    responseHeaders: {
      content_type: 'text/html',
      etag: 'artifact-custody',
      last_modified: null,
      final_url: custodyCanonicalUrl,
      redirect_chain: [],
      watch_config: watchConfig
    }
  }).artifacts;
  assert.deepEqual(
    validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: custodyArtifacts
    }),
    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      artifact_receipt_count: 1
    }
  );

  const forgedBodySha256 = '0'.repeat(64);
  const forgedReceiptBinding = {
    ...custodyArtifacts[0],
    body_sha256: forgedBodySha256,
    body_receipt_path: custodyArtifacts[0].body_receipt_path.replace(custodyBodySha256, forgedBodySha256)
  };
  assert.equal(
    validateArtifactRevisionLineage([forgedReceiptBinding]),
    [forgedReceiptBinding],
    'semantic lineage validation alone does not authenticate the transport receipt'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: [forgedReceiptBinding]
    }),
    /does not exist/u
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: [{ ...custodyDiscoveryRecords[0], raw_item_sha256: '0'.repeat(64) }],
      artifacts: custodyArtifacts
    }),
    /does not identify its stored index anchor/u
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: [{ ...custodyArtifacts[0], body_receipt_path: '../outside.json' }]
    }),
    /body_receipt_path does not match/u
  );

  const custodyArtifactReceiptAbsolutePath = path.join(receiptCustodyRoot, custodyArtifactReceiptPath);
  const originalCustodyReceipt = fs.readFileSync(custodyArtifactReceiptAbsolutePath, 'utf8');
  const tamperedCustodyReceipt = JSON.parse(originalCustodyReceipt);
  tamperedCustodyReceipt.body = `${tamperedCustodyReceipt.body}tampered`;
  fs.writeFileSync(custodyArtifactReceiptAbsolutePath, `${JSON.stringify(tamperedCustodyReceipt, null, 2)}\n`);
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: custodyArtifacts
    }),
    /body bytes do not match body_sha256/u
  );
  fs.writeFileSync(custodyArtifactReceiptAbsolutePath, originalCustodyReceipt);
} finally {
  fs.rmSync(receiptCustodyRoot, { recursive: true, force: true });
}

'''
test = insert_before(test, "const hydratorRuntimeSource = fs.readFileSync(", custody_tests, "receipt custody regression matrix")

test = replace_once(
    test,
    "  /last_status: 'error',\\s+last_error: error\\.message,\\s+new_discovery_count: 0/u,\n  'an index acquisition error must reset the current-run discovery count'\n);",
    "  /last_status: 'error',\\s+last_error: error\\.message,\\s+new_discovery_count: 0/u,\n  'an index acquisition error must reset the current-run discovery count'\n);\nassert.match(\n  hydratorRuntimeSource,\n  /validateIndustrialExhaustReceiptCustody\\(\\{\\s+rootDir,\\s+discoveryRecords,\\s+artifacts\\s+\\}\\)/u,\n  'the runtime must authenticate receipt custody before records influence hydration state'\n);",
    "hydrator receipt custody source assertion",
)

test = replace_once(
    test,
    "assert.equal(\n  validateArtifactRevisionLineage(canonicalArtifactRecords),\n  canonicalArtifactRecords,\n  'the canonical artifact corpus must retain its historical projection and occurrence custody'\n);",
    "assert.equal(\n  validateArtifactRevisionLineage(canonicalArtifactRecords),\n  canonicalArtifactRecords,\n  'the canonical artifact corpus must retain its historical projection and occurrence custody'\n);\nconst canonicalReceiptCustody = validateIndustrialExhaustReceiptCustody({\n  rootDir: process.cwd(),\n  discoveryRecords: canonicalDiscoveryRecords,\n  artifacts: canonicalArtifactRecords\n});\nassert.equal(canonicalReceiptCustody.discovery_record_count, canonicalDiscoveryRecords.length);\nassert.equal(canonicalReceiptCustody.artifact_record_count, canonicalArtifactRecords.length);\nassert.ok(canonicalReceiptCustody.index_receipt_count > 0);\nassert.ok(canonicalReceiptCustody.artifact_receipt_count > 0);",
    "canonical receipt custody audit",
)

source_path.write_text(source, encoding="utf-8")
hydrator_path.write_text(hydrator, encoding="utf-8")
test_path.write_text(test, encoding="utf-8")
