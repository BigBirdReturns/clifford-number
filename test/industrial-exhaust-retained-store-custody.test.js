import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  artifactReceiptPath as artifactReceiptFilePath,
  extractHtmlArtifact,
  indexReceiptPath as indexReceiptFilePath,
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

  const assertPredictableTempAliasIgnored = ({
    receiptType,
    absoluteReceiptPath,
    writeReceipt,
    cleanupParent = false
  }) => {
    const externalRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `industrial-exhaust-${receiptType}-publication-external-`)
    );
    const externalPath = path.join(externalRoot, 'external.txt');
    const predictableTempPath = `${absoluteReceiptPath}.${process.pid}.tmp`;
    const sentinel = `external ${receiptType} sentinel\n`;
    fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
    fs.writeFileSync(externalPath, sentinel);
    fs.symlinkSync(externalPath, predictableTempPath, 'file');
    try {
      const expectedRelativePath = path.relative(rootDir, absoluteReceiptPath)
        .split(path.sep)
        .join('/');
      assert.equal(
        writeReceipt(),
        expectedRelativePath,
        `${receiptType} publication must ignore the predictable legacy temporary pathname`
      );
      assert.equal(
        fs.readFileSync(externalPath, 'utf8'),
        sentinel,
        `${receiptType} publication must not mutate bytes through the predictable temporary alias`
      );
      assert.equal(
        fs.lstatSync(predictableTempPath).isSymbolicLink(),
        true,
        `${receiptType} publication must not consume the attacker-controlled temporary alias`
      );
      const receiptStats = fs.lstatSync(absoluteReceiptPath);
      assert.equal(
        receiptStats.isFile(),
        true,
        `${receiptType} publication must create a regular receipt file`
      );
      assert.equal(
        receiptStats.nlink,
        1,
        `${receiptType} publication must leave the receipt under exclusive inode custody`
      );
    } finally {
      try {
        fs.unlinkSync(predictableTempPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      fs.rmSync(absoluteReceiptPath, { force: true });
      if (cleanupParent) fs.rmdirSync(path.dirname(absoluteReceiptPath));
      fs.rmSync(externalRoot, { recursive: true, force: true });
    }
  };

  const publicationIndexHtml = '<!doctype html><html><body><a href="/news-releases/publication-custody-index">Publication custody index</a></body></html>';
  const publicationParsedIndex = parseHtmlLinkIndex(publicationIndexHtml, source);
  const publicationIndexReceiptPath = indexReceiptFilePath(
    rootDir,
    source.id,
    publicationParsedIndex.index_sha256
  );
  assertPredictableTempAliasIgnored({
    receiptType: 'index',
    absoluteReceiptPath: publicationIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir,
      source,
      parsedIndex: publicationParsedIndex,
      html: publicationIndexHtml,
      capturedAt: '2026-08-22T10:06:00.000Z'
    })
  });

  const publicationCanonicalUrl = 'https://www.dentsu.com/news-releases/publication-custody-artifact';
  const publicationArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Publication custody artifact body.</main></body></html>'
  );
  const publicationArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(publicationArtifactBody)
    .digest('hex');
  const publicationArtifactReceiptPath = artifactReceiptFilePath(
    rootDir,
    publicationCanonicalUrl,
    publicationArtifactBodySha256
  );
  assertPredictableTempAliasIgnored({
    receiptType: 'artifact',
    absoluteReceiptPath: publicationArtifactReceiptPath,
    cleanupParent: true,
    writeReceipt: () => writeArtifactReceipt({
      rootDir,
      canonicalUrl: publicationCanonicalUrl,
      body: publicationArtifactBody,
      bodySha256: publicationArtifactBodySha256,
      capturedAt: '2026-08-22T10:06:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: publicationCanonicalUrl,
        redirect_chain: []
      }
    })
  });

  const assertDestinationRacePreservesWinner = ({
  receiptType,
  absoluteReceiptPath,
  competingReceipt,
  writeReceipt,
  cleanupParent = false
}) => {
  fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
  const originalLinkSync = fs.linkSync;
  let raceInjected = false;
  fs.linkSync = (sourcePath, destinationPath) => {
  let targetsReceipt = false;
  try {
    targetsReceipt = path.basename(destinationPath)
        === path.basename(absoluteReceiptPath)
      && fs.realpathSync.native(path.dirname(destinationPath))
        === fs.realpathSync.native(path.dirname(absoluteReceiptPath));
  } catch {}
  if (!raceInjected && targetsReceipt) {
    fs.writeFileSync(destinationPath, competingReceipt, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    });
    raceInjected = true;
  }
  return originalLinkSync(sourcePath, destinationPath);
};
  try {
    const expectedRelativePath = path.relative(rootDir, absoluteReceiptPath)
      .split(path.sep)
      .join('/');
    assert.equal(
      writeReceipt(),
      expectedRelativePath,
      `${receiptType} publication must accept the valid intervening winner`
    );
    assert.equal(
      raceInjected,
      true,
      `${receiptType} publication must exercise the destination-creation race`
    );
    assert.equal(
      fs.readFileSync(absoluteReceiptPath, 'utf8'),
      competingReceipt,
      `${receiptType} publication must not replace intervening destination bytes`
    );
    const receiptStats = fs.lstatSync(absoluteReceiptPath);
    assert.equal(
      receiptStats.isFile(),
      true,
      `${receiptType} race winner must remain a regular receipt file`
    );
    assert.equal(
      receiptStats.nlink,
      1,
      `${receiptType} race winner must remain under exclusive inode custody`
    );
  } finally {
    fs.linkSync = originalLinkSync;
    fs.rmSync(absoluteReceiptPath, { force: true });
    if (cleanupParent) {
      try {
        fs.rmdirSync(path.dirname(absoluteReceiptPath));
      } catch (error) {
        if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
      }
    }
  }
};

const raceIndexHtml = '<!doctype html><html><body><a href="/news-releases/publication-race-index">Publication race index</a></body></html>';
const raceParsedIndex = parseHtmlLinkIndex(raceIndexHtml, source);
const raceIndexRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-index-publication-race-winner-')
);
let competingIndexReceipt;
try {
  writeIndexReceipt({
    rootDir: raceIndexRoot,
    source,
    parsedIndex: raceParsedIndex,
    html: raceIndexHtml,
    capturedAt: '2026-08-22T10:07:00.000Z',
    responseHeaders: { content_type: 'text/html', etag: 'race-winner-index' }
  });
  competingIndexReceipt = fs.readFileSync(
    indexReceiptFilePath(
      raceIndexRoot,
      source.id,
      raceParsedIndex.index_sha256
    ),
    'utf8'
  );
} finally {
  fs.rmSync(raceIndexRoot, { recursive: true, force: true });
}
const raceIndexReceiptPath = indexReceiptFilePath(
  rootDir,
  source.id,
  raceParsedIndex.index_sha256
);
assertDestinationRacePreservesWinner({
  receiptType: 'index',
  absoluteReceiptPath: raceIndexReceiptPath,
  competingReceipt: competingIndexReceipt,
  writeReceipt: () => writeIndexReceipt({
    rootDir,
    source,
    parsedIndex: raceParsedIndex,
    html: raceIndexHtml,
    capturedAt: '2026-08-22T10:08:00.000Z',
    responseHeaders: { content_type: 'text/html', etag: 'race-loser-index' }
  })
});

const raceCanonicalUrl = 'https://www.dentsu.com/news-releases/publication-race-artifact';
const raceArtifactBody = Buffer.from(
  '<!doctype html><html><body><main>Publication destination race artifact.</main></body></html>'
);
const raceArtifactBodySha256 = crypto
  .createHash('sha256')
  .update(raceArtifactBody)
  .digest('hex');
const raceArtifactRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-artifact-publication-race-winner-')
);
let competingArtifactReceipt;
try {
  writeArtifactReceipt({
    rootDir: raceArtifactRoot,
    canonicalUrl: raceCanonicalUrl,
    body: raceArtifactBody,
    bodySha256: raceArtifactBodySha256,
    capturedAt: '2026-08-22T10:07:00.000Z',
    responseHeaders: {
      content_type: 'text/html',
      etag: 'race-winner-artifact',
      final_url: raceCanonicalUrl,
      redirect_chain: []
    }
  });
  competingArtifactReceipt = fs.readFileSync(
    artifactReceiptFilePath(
      raceArtifactRoot,
      raceCanonicalUrl,
      raceArtifactBodySha256
    ),
    'utf8'
  );
} finally {
  fs.rmSync(raceArtifactRoot, { recursive: true, force: true });
}
const raceArtifactReceiptPath = artifactReceiptFilePath(
  rootDir,
  raceCanonicalUrl,
  raceArtifactBodySha256
);
assertDestinationRacePreservesWinner({
  receiptType: 'artifact',
  absoluteReceiptPath: raceArtifactReceiptPath,
  competingReceipt: competingArtifactReceipt,
  cleanupParent: true,
  writeReceipt: () => writeArtifactReceipt({
    rootDir,
    canonicalUrl: raceCanonicalUrl,
    body: raceArtifactBody,
    bodySha256: raceArtifactBodySha256,
    capturedAt: '2026-08-22T10:08:00.000Z',
    responseHeaders: {
      content_type: 'text/html',
      etag: 'race-loser-artifact',
      final_url: raceCanonicalUrl,
      redirect_chain: []
    }
  })
});

  const assertReceiptPublicationDurability = ({
    receiptType,
    durabilityRoot,
    absoluteReceiptPath,
    writeReceipt,
    reuseReceipt
  }) => {
    const expectedRelativePath = path.relative(durabilityRoot, absoluteReceiptPath)
      .split(path.sep)
      .join('/');
    const directoryChain = [];
    let current = path.dirname(absoluteReceiptPath);
    while (current !== durabilityRoot) {
      const relative = path.relative(durabilityRoot, current);
      if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`${receiptType} durability test path escapes its root`);
      }
      directoryChain.unshift(current);
      current = path.dirname(current);
    }
    directoryChain.unshift(durabilityRoot);

    const originalFsyncSync = fs.fsyncSync;
    const originalLinkSync = fs.linkSync;
    const directorySyncs = new Set();
    const events = [];
    let failNextDirectorySync = false;

    fs.linkSync = (sourcePath, destinationPath) => {
    let targetsReceipt = false;
    try {
      targetsReceipt = path.basename(destinationPath)
          === path.basename(absoluteReceiptPath)
        && fs.realpathSync.native(path.dirname(destinationPath))
          === fs.realpathSync.native(path.dirname(absoluteReceiptPath));
    } catch {}
    if (targetsReceipt) events.push('publish-link');
    return originalLinkSync(sourcePath, destinationPath);
  };
    fs.fsyncSync = descriptor => {
      const stats = fs.fstatSync(descriptor);
      if (stats.isDirectory()) {
        events.push('directory-sync');
        if (failNextDirectorySync) {
          failNextDirectorySync = false;
          const error = new Error('simulated directory fsync failure');
          error.code = 'EIO';
          throw error;
        }
        directorySyncs.add(`${stats.dev}:${stats.ino}`);
      } else {
        events.push('file-sync');
      }
      return originalFsyncSync(descriptor);
    };

    try {
      assert.equal(
        writeReceipt(),
        expectedRelativePath,
        `${receiptType} publication must return its canonical receipt path`
      );
      const linkEventIndex = events.indexOf('publish-link');
      assert.notEqual(
        linkEventIndex,
        -1,
        `${receiptType} durability regression must exercise final-path publication`
      );
      assert.equal(
        events.slice(linkEventIndex + 1).includes('directory-sync'),
        true,
        `${receiptType} publication must synchronize its directory after linking the receipt`
      );

      for (const directoryPath of directoryChain) {
        const stats = fs.lstatSync(directoryPath);
        assert.equal(
          directorySyncs.has(`${stats.dev}:${stats.ino}`),
          true,
          `${receiptType} publication must synchronize directory ${path.relative(
            durabilityRoot,
            directoryPath
          ) || '.'}`
        );
      }

      const originalReceipt = fs.readFileSync(absoluteReceiptPath, 'utf8');
      directorySyncs.clear();
      events.length = 0;
      assert.equal(
        reuseReceipt(),
        expectedRelativePath,
        `${receiptType} idempotent reuse must retain its canonical receipt path`
      );
      const parentStats = fs.lstatSync(path.dirname(absoluteReceiptPath));
      assert.equal(
        directorySyncs.has(`${parentStats.dev}:${parentStats.ino}`),
        true,
        `${receiptType} idempotent reuse must synchronize the retained receipt directory`
      );
      assert.equal(
        fs.readFileSync(absoluteReceiptPath, 'utf8'),
        originalReceipt,
        `${receiptType} idempotent reuse may not rewrite retained receipt bytes`
      );

      failNextDirectorySync = true;
      assert.throws(
        () => reuseReceipt(),
        /synchronization failed/u,
        `${receiptType} reuse must fail closed when directory synchronization fails`
      );
      assert.equal(
        failNextDirectorySync,
        false,
        `${receiptType} failure injection must reach a directory synchronization call`
      );
      assert.equal(
        fs.readFileSync(absoluteReceiptPath, 'utf8'),
        originalReceipt,
        `${receiptType} failed durability proof may not rewrite retained receipt bytes`
      );
    } finally {
      fs.fsyncSync = originalFsyncSync;
      fs.linkSync = originalLinkSync;
      fs.rmSync(durabilityRoot, { recursive: true, force: true });
    }
  };

  const durableIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-publication-durability-')
  );
  const durableIndexHtml = '<!doctype html><html><body><a href="/news-releases/publication-durability-index">Publication durability index</a></body></html>';
  const durableParsedIndex = parseHtmlLinkIndex(durableIndexHtml, source);
  const durableIndexReceiptPath = indexReceiptFilePath(
    durableIndexRoot,
    source.id,
    durableParsedIndex.index_sha256
  );
  assertReceiptPublicationDurability({
    receiptType: 'index',
    durabilityRoot: durableIndexRoot,
    absoluteReceiptPath: durableIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir: durableIndexRoot,
      source,
      parsedIndex: durableParsedIndex,
      html: durableIndexHtml,
      capturedAt: '2026-08-22T10:09:00.000Z',
      responseHeaders: { content_type: 'text/html', etag: 'durability-index-a' }
    }),
    reuseReceipt: () => writeIndexReceipt({
      rootDir: durableIndexRoot,
      source,
      parsedIndex: durableParsedIndex,
      html: durableIndexHtml,
      capturedAt: '2026-08-22T10:10:00.000Z',
      responseHeaders: { content_type: 'text/html', etag: 'durability-index-b' }
    })
  });

  const durableArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-publication-durability-')
  );
  const durableArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/publication-durability-artifact';
  const durableArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Publication durability artifact.</main></body></html>'
  );
  const durableArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(durableArtifactBody)
    .digest('hex');
  const durableArtifactReceiptPath = artifactReceiptFilePath(
    durableArtifactRoot,
    durableArtifactCanonicalUrl,
    durableArtifactBodySha256
  );
  assertReceiptPublicationDurability({
    receiptType: 'artifact',
    durabilityRoot: durableArtifactRoot,
    absoluteReceiptPath: durableArtifactReceiptPath,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: durableArtifactRoot,
      canonicalUrl: durableArtifactCanonicalUrl,
      body: durableArtifactBody,
      bodySha256: durableArtifactBodySha256,
      capturedAt: '2026-08-22T10:09:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'durability-artifact-a',
        final_url: durableArtifactCanonicalUrl,
        redirect_chain: []
      }
    }),
    reuseReceipt: () => writeArtifactReceipt({
      rootDir: durableArtifactRoot,
      canonicalUrl: durableArtifactCanonicalUrl,
      body: durableArtifactBody,
      bodySha256: durableArtifactBodySha256,
      capturedAt: '2026-08-22T10:10:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'durability-artifact-b',
        final_url: durableArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

  const assertDescriptorBridgeFailurePrecedesMutation = ({
    receiptType,
    bridgeRoot,
    externalRoot = null,
    externalSentinelPath = null,
    externalSentinel = null,
    bridgeProbe,
    writeReceipt,
    expectedError
  }) => {
    const receiptsPath = path.join(bridgeRoot, 'receipts');
    const originalStatSync = fs.statSync;
    let bridgeProbeObserved = false;

    fs.statSync = (targetPath, ...args) => {
      if (/^\/proc\/self\/fd\/\d+$/u.test(String(targetPath))) {
        bridgeProbeObserved = true;
        return bridgeProbe({
          targetPath: String(targetPath),
          args,
          originalStatSync
        });
      }
      return originalStatSync(targetPath, ...args);
    };

    try {
      assert.throws(
        () => writeReceipt(),
        expectedError,
        `${receiptType} publication must reject an unauthenticated descriptor bridge`
      );
      assert.equal(
        bridgeProbeObserved,
        true,
        `${receiptType} regression must exercise descriptor-bridge authentication`
      );
      assert.equal(
        fs.existsSync(receiptsPath),
        false,
        `${receiptType} descriptor-bridge failure must precede receipt-tree mutation`
      );
      if (externalSentinelPath !== null) {
        assert.equal(
          fs.readFileSync(externalSentinelPath, 'utf8'),
          externalSentinel,
          `${receiptType} descriptor-bridge failure may not mutate the external tree`
        );
      }
    } finally {
      fs.statSync = originalStatSync;
      fs.rmSync(bridgeRoot, { recursive: true, force: true });
      if (externalRoot !== null) {
        fs.rmSync(externalRoot, { recursive: true, force: true });
      }
    }
  };

  const unavailableBridgeIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-bridge-unavailable-')
  );
  const unavailableBridgeIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/bridge-unavailable-index">Bridge unavailable index</a></body></html>';
  const unavailableBridgeParsedIndex = parseHtmlLinkIndex(
    unavailableBridgeIndexHtml,
    source
  );
  assertDescriptorBridgeFailurePrecedesMutation({
    receiptType: 'index',
    bridgeRoot: unavailableBridgeIndexRoot,
    bridgeProbe: () => {
      const error = new Error('simulated descriptor bridge outage');
      error.code = 'ENOENT';
      throw error;
    },
    writeReceipt: () => writeIndexReceipt({
      rootDir: unavailableBridgeIndexRoot,
      source,
      parsedIndex: unavailableBridgeParsedIndex,
      html: unavailableBridgeIndexHtml,
      capturedAt: '2026-08-24T10:40:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'bridge-unavailable-index'
      }
    }),
    expectedError: /descriptor bridge unavailable/u
  });

  const mismatchedBridgeArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-bridge-mismatch-')
  );
  const mismatchedBridgeExternalRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-bridge-external-')
  );
  const mismatchedBridgeSentinelPath = path.join(
    mismatchedBridgeExternalRoot,
    'sentinel.txt'
  );
  const mismatchedBridgeSentinel = 'external descriptor bridge sentinel\n';
  fs.writeFileSync(mismatchedBridgeSentinelPath, mismatchedBridgeSentinel);
  const mismatchedBridgeArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/bridge-mismatch-artifact';
  const mismatchedBridgeArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Bridge mismatch artifact.</main></body></html>'
  );
  const mismatchedBridgeArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(mismatchedBridgeArtifactBody)
    .digest('hex');
  assertDescriptorBridgeFailurePrecedesMutation({
    receiptType: 'artifact',
    bridgeRoot: mismatchedBridgeArtifactRoot,
    externalRoot: mismatchedBridgeExternalRoot,
    externalSentinelPath: mismatchedBridgeSentinelPath,
    externalSentinel: mismatchedBridgeSentinel,
    bridgeProbe: ({ originalStatSync }) =>
      originalStatSync(mismatchedBridgeExternalRoot),
    writeReceipt: () => writeArtifactReceipt({
      rootDir: mismatchedBridgeArtifactRoot,
      canonicalUrl: mismatchedBridgeArtifactCanonicalUrl,
      body: mismatchedBridgeArtifactBody,
      bodySha256: mismatchedBridgeArtifactBodySha256,
      capturedAt: '2026-08-24T10:40:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'bridge-mismatch-artifact',
        final_url: mismatchedBridgeArtifactCanonicalUrl,
        redirect_chain: []
      }
    }),
    expectedError: /descriptor bridge identity mismatch/u
  });

  const assertAncestorSwapCannotRedirectPublication = ({
  receiptType,
  raceRoot,
  externalRoot,
  absoluteReceiptPath,
  writeReceipt
}) => {
  const canonicalReceiptsPath = path.join(raceRoot, 'receipts');
  const displacedReceiptsPath = path.join(raceRoot, 'receipts-displaced');
  const externalReceiptsPath = path.join(externalRoot, 'receipts');
  const relativeWithinReceipts = path.relative(
    canonicalReceiptsPath,
    absoluteReceiptPath
  );
  const externalReceiptPath = path.join(
    externalReceiptsPath,
    relativeWithinReceipts
  );

  fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
  fs.mkdirSync(path.dirname(externalReceiptPath), { recursive: true });

  const originalOpenSync = fs.openSync;
  let swapInjected = false;
  fs.openSync = (targetPath, ...args) => {
    if (!swapInjected && String(targetPath).endsWith('.tmp')) {
      fs.renameSync(canonicalReceiptsPath, displacedReceiptsPath);
      fs.symlinkSync(externalReceiptsPath, canonicalReceiptsPath, 'dir');
      swapInjected = true;
    }
    return originalOpenSync(targetPath, ...args);
  };

  try {
    assert.throws(
      () => writeReceipt(),
      /directory chain changed/u,
      `${receiptType} publication must reject an ancestor substitution`
    );
    assert.equal(
      swapInjected,
      true,
      `${receiptType} regression must exercise the temporary-file publication window`
    );
    assert.equal(
      fs.existsSync(externalReceiptPath),
      false,
      `${receiptType} publication may not mutate the substituted external tree`
    );
  } finally {
    fs.openSync = originalOpenSync;
    fs.rmSync(raceRoot, { recursive: true, force: true });
    fs.rmSync(externalRoot, { recursive: true, force: true });
  }
};

const ancestorRaceIndexRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-index-ancestor-race-root-')
);
const ancestorRaceIndexExternalRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-index-ancestor-race-external-')
);
const ancestorRaceIndexHtml =
  '<!doctype html><html><body><a href="/news-releases/publication-ancestor-race-index">Publication ancestor race index</a></body></html>';
const ancestorRaceParsedIndex = parseHtmlLinkIndex(
  ancestorRaceIndexHtml,
  source
);
const ancestorRaceIndexReceiptPath = indexReceiptFilePath(
  ancestorRaceIndexRoot,
  source.id,
  ancestorRaceParsedIndex.index_sha256
);
assertAncestorSwapCannotRedirectPublication({
  receiptType: 'index',
  raceRoot: ancestorRaceIndexRoot,
  externalRoot: ancestorRaceIndexExternalRoot,
  absoluteReceiptPath: ancestorRaceIndexReceiptPath,
  writeReceipt: () => writeIndexReceipt({
    rootDir: ancestorRaceIndexRoot,
    source,
    parsedIndex: ancestorRaceParsedIndex,
    html: ancestorRaceIndexHtml,
    capturedAt: '2026-08-22T10:11:00.000Z',
    responseHeaders: {
      content_type: 'text/html',
      etag: 'ancestor-race-index'
    }
  })
});

const ancestorRaceArtifactRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-artifact-ancestor-race-root-')
);
const ancestorRaceArtifactExternalRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'industrial-exhaust-artifact-ancestor-race-external-')
);
const ancestorRaceArtifactCanonicalUrl =
  'https://www.dentsu.com/news-releases/publication-ancestor-race-artifact';
const ancestorRaceArtifactBody = Buffer.from(
  '<!doctype html><html><body><main>Publication ancestor race artifact.</main></body></html>'
);
const ancestorRaceArtifactBodySha256 = crypto
  .createHash('sha256')
  .update(ancestorRaceArtifactBody)
  .digest('hex');
const ancestorRaceArtifactReceiptPath = artifactReceiptFilePath(
  ancestorRaceArtifactRoot,
  ancestorRaceArtifactCanonicalUrl,
  ancestorRaceArtifactBodySha256
);
assertAncestorSwapCannotRedirectPublication({
  receiptType: 'artifact',
  raceRoot: ancestorRaceArtifactRoot,
  externalRoot: ancestorRaceArtifactExternalRoot,
  absoluteReceiptPath: ancestorRaceArtifactReceiptPath,
  writeReceipt: () => writeArtifactReceipt({
    rootDir: ancestorRaceArtifactRoot,
    canonicalUrl: ancestorRaceArtifactCanonicalUrl,
    body: ancestorRaceArtifactBody,
    bodySha256: ancestorRaceArtifactBodySha256,
    capturedAt: '2026-08-22T10:11:00.000Z',
    responseHeaders: {
      content_type: 'text/html',
      etag: 'ancestor-race-artifact',
      final_url: ancestorRaceArtifactCanonicalUrl,
      redirect_chain: []
    }
  })
});

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

  const unsupportedRegularFilePath = path.join(
    rootDir,
    'receipts',
    'exhaust',
    'artifacts',
    '.ignored-receipt'
  );
  fs.writeFileSync(unsupportedRegularFilePath, 'unauthenticated receipt bytes\n');
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /unsupported file: receipts\/exhaust\/artifacts\/\.ignored-receipt/u,
    'every retained regular file must enter the custody denominator'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /unsupported file: receipts\/exhaust\/artifacts\/\.ignored-receipt/u,
    'runtime custody must reject regular files outside the receipt contract'
  );
  fs.rmSync(unsupportedRegularFilePath);

  const assertSymlinkedStoreRejected = ({ storeName, writeReceipt }) => {
    const storePath = path.join(rootDir, 'receipts', 'exhaust', storeName);
    const externalRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `industrial-exhaust-external-${storeName}-`)
    );
    const externalStorePath = path.join(externalRoot, storeName);
    fs.renameSync(storePath, externalStorePath);
    try {
      fs.symlinkSync(externalStorePath, storePath, 'dir');
      const expectedError = new RegExp(
        `unsupported path entry: receipts/exhaust/${storeName}`,
        'u'
      );
      assert.throws(
        () => validateIndustrialExhaustReceiptStore({ rootDir }),
        expectedError,
        `store validation must reject a symlinked ${storeName} directory`
      );
      assert.throws(
        () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
        expectedError,
        `runtime custody must reject a symlinked ${storeName} directory`
      );
      assert.throws(
        writeReceipt,
        expectedError,
        `receipt writers must reject a symlinked ${storeName} directory`
      );
    } finally {
      try {
        fs.unlinkSync(storePath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      fs.renameSync(externalStorePath, storePath);
      fs.rmSync(externalRoot, { recursive: true, force: true });
    }
  };

  assertSymlinkedStoreRejected({
    storeName: 'artifacts',
    writeReceipt: () => writeArtifactReceipt({
      rootDir,
      canonicalUrl,
      body,
      bodySha256,
      capturedAt,
      responseHeaders: {
        content_type: 'text/html',
        final_url: canonicalUrl,
        redirect_chain: []
      }
    })
  });
  assertSymlinkedStoreRejected({
    storeName: 'indexes',
    writeReceipt: () => writeIndexReceipt({
      rootDir,
      source,
      parsedIndex,
      html: indexHtml,
      capturedAt
    })
  });

  const assertRootAliasRejected = ({ aliasRoot, expectedError, label }) => {
    assert.throws(
      () => validateIndustrialExhaustReceiptStore({ rootDir: aliasRoot }),
      expectedError,
      `store validation must reject ${label}`
    );
    assert.throws(
      () => validateIndustrialExhaustReceiptCustody({
        rootDir: aliasRoot,
        discoveryRecords,
        artifacts
      }),
      expectedError,
      `runtime custody must reject ${label}`
    );
    assert.throws(
      () => writeIndexReceipt({
        rootDir: aliasRoot,
        source,
        parsedIndex,
        html: indexHtml,
        capturedAt
      }),
      expectedError,
      `index receipt writes must reject ${label}`
    );
    assert.throws(
      () => writeArtifactReceipt({
        rootDir: aliasRoot,
        canonicalUrl,
        body,
        bodySha256,
        capturedAt,
        responseHeaders: {
          content_type: 'text/html',
          final_url: canonicalUrl,
          redirect_chain: []
        }
      }),
      expectedError,
      `artifact receipt writes must reject ${label}`
    );
  };

  const rootAliasContainer = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-root-alias-')
  );
  try {
    const directRootAlias = path.join(rootAliasContainer, 'repository');
    fs.symlinkSync(rootDir, directRootAlias, 'dir');
    assertRootAliasRejected({
      aliasRoot: directRootAlias,
      expectedError: /receipt repository root contains an unsupported path entry/u,
      label: 'a symbolic-link repository root'
    });
    fs.unlinkSync(directRootAlias);

    const ancestorAlias = path.join(rootAliasContainer, 'ancestor');
    fs.symlinkSync(path.dirname(rootDir), ancestorAlias, 'dir');
    assertRootAliasRejected({
      aliasRoot: path.join(ancestorAlias, path.basename(rootDir)),
      expectedError: /receipt repository root is not canonical/u,
      label: 'a repository root reached through a symbolic-link ancestor'
    });
  } finally {
    fs.rmSync(rootAliasContainer, { recursive: true, force: true });
  }

  const assertHardLinkedReceiptRejected = ({ receiptPath, writeReceipt, receiptType }) => {
    const absoluteReceiptPath = path.join(rootDir, receiptPath);
    const externalRoot = fs.mkdtempSync(
      path.join(path.dirname(rootDir), `industrial-exhaust-hardlink-${receiptType}-`)
    );
    const externalReceiptPath = path.join(externalRoot, 'receipt.json');
    fs.linkSync(absoluteReceiptPath, externalReceiptPath);
    try {
      assert.equal(
        fs.lstatSync(absoluteReceiptPath).nlink,
        2,
        'the adversarial fixture must create a second pathname for the same inode'
      );
      assert.throws(
        () => validateIndustrialExhaustReceiptStore({ rootDir }),
        /multiply linked receipt file/u,
        `store validation must reject a hard-linked ${receiptType} receipt`
      );
      assert.throws(
        () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
        /multiply linked receipt file/u,
        `runtime custody must reject a hard-linked ${receiptType} receipt`
      );
      assert.throws(
        writeReceipt,
        /multiply linked receipt file/u,
        `receipt writers must reject a hard-linked ${receiptType} receipt`
      );
    } finally {
      fs.rmSync(externalRoot, { recursive: true, force: true });
    }
  };

  assertHardLinkedReceiptRejected({
    receiptPath: artifactReceiptPath,
    receiptType: 'artifact',
    writeReceipt: () => writeArtifactReceipt({
      rootDir,
      canonicalUrl,
      body,
      bodySha256,
      capturedAt,
      responseHeaders: {
        content_type: 'text/html',
        final_url: canonicalUrl,
        redirect_chain: []
      }
    })
  });
  assertHardLinkedReceiptRejected({
    receiptPath: indexReceiptPath,
    receiptType: 'index',
    writeReceipt: () => writeIndexReceipt({
      rootDir,
      source,
      parsedIndex,
      html: indexHtml,
      capturedAt
    })
  });

  const emptyArtifactNamespacePath = path.join(
    rootDir,
    'receipts',
    'exhaust',
    'artifacts',
    'empty.example',
    '0'.repeat(64)
  );
  fs.mkdirSync(emptyArtifactNamespacePath, { recursive: true });
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /empty directory: receipts\/exhaust\/artifacts\/empty\.example\/0{64}/u,
    'store validation must reject empty receipt namespaces'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /empty directory: receipts\/exhaust\/artifacts\/empty\.example\/0{64}/u,
    'runtime custody must reject empty receipt namespaces'
  );
  fs.rmSync(path.join(rootDir, 'receipts', 'exhaust', 'artifacts', 'empty.example'), {
    recursive: true,
    force: true
  });

  const directoryReceiptLeafPath = path.join(
    rootDir,
    'receipts',
    'exhaust',
    'indexes',
    source.id,
    `${'f'.repeat(64)}.json`
  );
  fs.mkdirSync(directoryReceiptLeafPath, { recursive: true });
  assert.throws(
    () => validateIndustrialExhaustReceiptStore({ rootDir }),
    /unsupported directory: receipts\/exhaust\/indexes\/dentsu_global_news_sitemap\/f{64}\.json/u,
    'a directory may not occupy a receipt-file position'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /unsupported directory: receipts\/exhaust\/indexes\/dentsu_global_news_sitemap\/f{64}\.json/u,
    'runtime custody must reject directories in receipt-file positions'
  );
  fs.rmSync(directoryReceiptLeafPath, { recursive: true, force: true });
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
