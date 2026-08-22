import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  extractHtmlArtifact,
  mergeArtifactProjection,
  mergeDiscoveryRecords,
  parseHtmlLinkIndex,
  validateIndustrialExhaustReceiptCustody,
  validateIndustrialExhaustReceiptStore,
  writeArtifactReceipt,
  writeIndexReceipt
} from '../tools/lib/industrial-exhaust-artifacts.mjs';

const source = {
  id: 'dentsu_global_news_sitemap',
  publisher: 'dentsu global website',
  publisher_resolution: 'brand_surface_not_legal_entity',
  surface: 'Global news-release sitemap',
  index_url: 'https://www.dentsu.com/sitemap',
  include_path_prefixes: ['/news-releases/'],
  source_class: 'first_party_corporate_publication',
  graph_effect: 'none'
};
const watchConfig = {
  schema_version: 1,
  terms: [{ id: 'custody', patterns: ['Custody'] }]
};
const capturedAt = '2026-08-22T10:00:00.000Z';
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'industrial-exhaust-retained-store-'));

try {
  const indexHtml = '<!doctype html><html><head><title>Custody index</title></head><body><a href="/news-releases/custody-example">Custody Example</a></body></html>';
  const parsedIndex = parseHtmlLinkIndex(indexHtml, source);
  const indexReceiptPath = writeIndexReceipt({
    rootDir,
    source,
    parsedIndex,
    html: indexHtml,
    capturedAt,
    responseHeaders: { content_type: 'text/html', etag: 'index-a' }
  });
  const discoveryRecords = mergeDiscoveryRecords({
    records: [],
    source,
    parsedIndex,
    capturedAt,
    indexReceiptPath
  }).records;

  const canonicalUrl = discoveryRecords[0].canonical_url;
  const body = Buffer.from(
    '<!doctype html><html><head><title>Custody Example</title></head><body><main>Custody receipt body with enough stable publisher text for semantic extraction and verification.</main></body></html>'
  );
  const bodySha256 = crypto.createHash('sha256').update(body).digest('hex');
  const artifactReceiptPath = writeArtifactReceipt({
    rootDir,
    canonicalUrl,
    body,
    bodySha256,
    capturedAt,
    responseHeaders: {
      content_type: 'text/html',
      etag: 'artifact-a',
      final_url: canonicalUrl,
      redirect_chain: []
    }
  });
  const projection = extractHtmlArtifact(body.toString('utf8'), canonicalUrl);
  const artifacts = mergeArtifactProjection({
    artifacts: [],
    candidate: {
      canonical_url: canonicalUrl,
      source_id: source.id,
      publisher: source.publisher,
      title: discoveryRecords[0].title,
      seed_matched_terms: [],
      linked_records: [{
        record_type: 'index_discovery',
        record_id: discoveryRecords[0].discovery_id
      }]
    },
    sourceProjection: projection,
    capturedAt,
    bodyReceiptPath: artifactReceiptPath,
    bodySha256,
    responseHeaders: {
      content_type: 'text/html',
      etag: 'artifact-a',
      final_url: canonicalUrl,
      redirect_chain: [],
      watch_config: watchConfig
    }
  }).artifacts;

  const onePairStore = {
    index_receipt_count: 1,
    byte_verified_index_receipt_count: 1,
    legacy_anchor_bound_index_receipt_count: 0,
    legacy_body_digest_matches_index_count: 0,
    legacy_body_digest_differs_from_index_count: 0,
    artifact_receipt_count: 1,
    byte_verified_artifact_receipt_count: 1
  };
  assert.deepEqual(
    validateIndustrialExhaustReceiptStore({ rootDir }),
    onePairStore
  );
  assert.deepEqual(
    validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      byte_verified_index_receipt_count: 1,
      legacy_anchor_bound_index_receipt_count: 0,
      artifact_receipt_count: 1,
      byte_verified_artifact_receipt_count: 1
    }
  );

  assert.equal(
    writeIndexReceipt({
      rootDir,
      source,
      parsedIndex,
      html: indexHtml,
      capturedAt: '2026-08-22T10:05:00.000Z'
    }),
    indexReceiptPath
  );
  assert.equal(
    writeArtifactReceipt({
      rootDir,
      canonicalUrl,
      body,
      bodySha256,
      capturedAt: '2026-08-22T10:05:00.000Z'
    }),
    artifactReceiptPath
  );

  const indexAbsolutePath = path.join(rootDir, indexReceiptPath);
  const originalIndexReceipt = fs.readFileSync(indexAbsolutePath, 'utf8');
  const tamperedIndexReceipt = JSON.parse(originalIndexReceipt);
  tamperedIndexReceipt.body = `${tamperedIndexReceipt.body}tampered`;
  fs.writeFileSync(indexAbsolutePath, `${JSON.stringify(tamperedIndexReceipt, null, 2)}\n`);
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /body bytes do not match body_sha256/u
  );
  assert.throws(
    () => writeIndexReceipt({ rootDir, source, parsedIndex, html: indexHtml, capturedAt }),
    /body bytes do not match body_sha256/u
  );
  fs.writeFileSync(indexAbsolutePath, originalIndexReceipt);

  const governanceTamperedIndexReceipt = JSON.parse(originalIndexReceipt);
  governanceTamperedIndexReceipt.promotion_authority = true;
  fs.writeFileSync(
    indexAbsolutePath,
    `${JSON.stringify(governanceTamperedIndexReceipt, null, 2)}\n`
  );
  assert.throws(
    () => writeIndexReceipt({ rootDir, source, parsedIndex, html: indexHtml, capturedAt }),
    /governance boundary/u
  );
  fs.writeFileSync(indexAbsolutePath, originalIndexReceipt);

  const legacyIndexReceipt = JSON.parse(originalIndexReceipt);
  delete legacyIndexReceipt.body_sha256;
  const legacyIndexText = `${JSON.stringify(legacyIndexReceipt, null, 2)}\n`;
  fs.writeFileSync(indexAbsolutePath, legacyIndexText);
  assert.deepEqual(
    validateIndustrialExhaustReceiptStore({ rootDir }),
    {
      ...onePairStore,
      byte_verified_index_receipt_count: 0,
      legacy_anchor_bound_index_receipt_count: 1,
      legacy_body_digest_matches_index_count: 1
    }
  );
  assert.equal(
    writeIndexReceipt({ rootDir, source, parsedIndex, html: indexHtml, capturedAt }),
    indexReceiptPath
  );
  assert.equal(
    fs.readFileSync(indexAbsolutePath, 'utf8'),
    legacyIndexText,
    'matching historical custody may be reused but may not be rewritten'
  );
  fs.writeFileSync(indexAbsolutePath, originalIndexReceipt);

  const artifactAbsolutePath = path.join(rootDir, artifactReceiptPath);
  const originalArtifactReceipt = fs.readFileSync(artifactAbsolutePath, 'utf8');
  const tamperedArtifactReceipt = JSON.parse(originalArtifactReceipt);
  tamperedArtifactReceipt.body = `${tamperedArtifactReceipt.body}tampered`;
  fs.writeFileSync(
    artifactAbsolutePath,
    `${JSON.stringify(tamperedArtifactReceipt, null, 2)}\n`
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /body bytes do not match body_sha256/u
  );
  assert.throws(
    () => writeArtifactReceipt({ rootDir, canonicalUrl, body, bodySha256, capturedAt }),
    /body bytes do not match body_sha256/u
  );
  fs.writeFileSync(artifactAbsolutePath, originalArtifactReceipt);

  const retainedIndexHtml = '<!doctype html><html><head><title>Retained index</title></head><body><a href="/news-releases/retained-only">Retained Only</a></body></html>';
  const retainedParsedIndex = parseHtmlLinkIndex(retainedIndexHtml, source);
  writeIndexReceipt({
    rootDir,
    source,
    parsedIndex: retainedParsedIndex,
    html: retainedIndexHtml,
    capturedAt: '2026-08-22T10:10:00.000Z'
  });
  const retainedCanonicalUrl = 'https://www.dentsu.com/news-releases/retained-artifact';
  const retainedBody = Buffer.from(
    '<!doctype html><html><body><main>Retained transport body without a semantic revision reference.</main></body></html>'
  );
  const retainedBodySha256 = crypto.createHash('sha256').update(retainedBody).digest('hex');
  const retainedArtifactPath = writeArtifactReceipt({
    rootDir,
    canonicalUrl: retainedCanonicalUrl,
    body: retainedBody,
    bodySha256: retainedBodySha256,
    capturedAt: '2026-08-22T10:10:00.000Z',
    responseHeaders: {
      content_type: 'text/html',
      final_url: retainedCanonicalUrl,
      redirect_chain: []
    }
  });

  assert.deepEqual(
    validateIndustrialExhaustReceiptStore({ rootDir }),
    {
      index_receipt_count: 2,
      byte_verified_index_receipt_count: 2,
      legacy_anchor_bound_index_receipt_count: 0,
      legacy_body_digest_matches_index_count: 0,
      legacy_body_digest_differs_from_index_count: 0,
      artifact_receipt_count: 2,
      byte_verified_artifact_receipt_count: 2
    }
  );
  assert.deepEqual(
    validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      byte_verified_index_receipt_count: 1,
      legacy_anchor_bound_index_receipt_count: 0,
      artifact_receipt_count: 1,
      byte_verified_artifact_receipt_count: 1
    },
    'runtime custody must validate retained-only receipts without counting them as semantic references'
  );

  const retainedArtifactAbsolutePath = path.join(rootDir, retainedArtifactPath);
  const originalRetainedArtifactReceipt = fs.readFileSync(retainedArtifactAbsolutePath, 'utf8');
  const tamperedRetainedArtifactReceipt = JSON.parse(originalRetainedArtifactReceipt);
  tamperedRetainedArtifactReceipt.body = `${tamperedRetainedArtifactReceipt.body}tampered`;
  fs.writeFileSync(
    retainedArtifactAbsolutePath,
    `${JSON.stringify(tamperedRetainedArtifactReceipt, null, 2)}\n`
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /body bytes do not match body_sha256/u,
    'an unreferenced malformed receipt must fail before records influence runtime state'
  );
  fs.writeFileSync(retainedArtifactAbsolutePath, originalRetainedArtifactReceipt);

  const noncanonicalReceiptPath = path.join(
    rootDir,
    'receipts',
    'exhaust',
    'artifacts',
    'noncanonical.json'
  );
  fs.mkdirSync(path.dirname(noncanonicalReceiptPath), { recursive: true });
  fs.writeFileSync(noncanonicalReceiptPath, '{}\n');
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /path is not canonical/u
  );
  fs.rmSync(noncanonicalReceiptPath);
} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

const canonicalDiscoveryRecords = fs.readFileSync(
  new URL('../data/exhaust/discovery-observations.jsonl', import.meta.url),
  'utf8'
).trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
const canonicalArtifactRecords = fs.readFileSync(
  new URL('../data/exhaust/artifacts.jsonl', import.meta.url),
  'utf8'
).trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
const canonicalStore = validateIndustrialExhaustReceiptStore({ rootDir: process.cwd() });
const canonicalCustody = validateIndustrialExhaustReceiptCustody({
  rootDir: process.cwd(),
  discoveryRecords: canonicalDiscoveryRecords,
  artifacts: canonicalArtifactRecords
});
assert.ok(canonicalStore.index_receipt_count > canonicalCustody.index_receipt_count);
assert.ok(canonicalStore.artifact_receipt_count > canonicalCustody.artifact_receipt_count);
assert.equal(
  canonicalStore.byte_verified_index_receipt_count
    + canonicalStore.legacy_anchor_bound_index_receipt_count,
  canonicalStore.index_receipt_count
);
assert.equal(
  canonicalStore.legacy_body_digest_matches_index_count
    + canonicalStore.legacy_body_digest_differs_from_index_count,
  canonicalStore.legacy_anchor_bound_index_receipt_count
);
assert.equal(canonicalStore.legacy_body_digest_differs_from_index_count, 0);
assert.equal(
  canonicalStore.byte_verified_artifact_receipt_count,
  canonicalStore.artifact_receipt_count
);

console.log('industrial-exhaust retained-store custody tests passed');
