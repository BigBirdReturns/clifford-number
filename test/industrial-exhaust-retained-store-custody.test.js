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

const receiptDirfdControlSymbol = Symbol.for(
  'clifford-number.industrial-exhaust.receipt-dirfd-control'
);
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';

const withReceiptDirfdControl = (control, operation) => {
  const previous = globalThis[receiptDirfdControlSymbol];
  globalThis[receiptDirfdControlSymbol] = control;
  try {
    return operation();
  } finally {
    if (previous === undefined) {
      delete globalThis[receiptDirfdControlSymbol];
    } else {
      globalThis[receiptDirfdControlSymbol] = previous;
    }
  }
};


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

  const assertNestedMountCrossingRejected = ({
    receiptType,
    raceRoot,
    absoluteReceiptPath,
    triggerDisplay,
    alternateRelativePath,
    writeReceipt
  }) => {
    const triggerPath = path.join(
      raceRoot,
      ...triggerDisplay.split('/')
    );
    const alternatePath = path.join(
      raceRoot,
      ...alternateRelativePath.split('/')
    );
    fs.mkdirSync(triggerPath, { recursive: true });
    fs.mkdirSync(alternatePath, { recursive: true });
    const crossedReceiptPath = path.join(
      alternatePath,
      path.relative(triggerPath, absoluteReceiptPath)
    );
    const control = {
      events: [],
      fault: {
        type: 'simulate_mount_crossing',
        after_display: triggerDisplay,
        external_directory: alternatePath
      }
    };

    try {
      assert.throws(
        () => withReceiptDirfdControl(control, writeReceipt),
        /mount point|directory chain changed/iu,
        `${receiptType} publication must reject a nested mount crossing`
      );
      assert.equal(
        fs.existsSync(crossedReceiptPath),
        false,
        `${receiptType} mount crossing may not publish into an alternate subtree`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'mount-crossing-rejected'
            && event.display === triggerDisplay
            && Number(event.errno) === 18
        ),
        true,
        `${receiptType} helper must prove openat2 mount-boundary rejection`
      );
      assert.equal(
        control.events.some(event => event.type === 'mount-crossing-followed'),
        false,
        `${receiptType} helper may not follow the simulated nested mount`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        false,
        `${receiptType} rejected mount crossing may not publish a visible receipt`
      );
    } finally {
      fs.rmSync(raceRoot, { recursive: true, force: true });
    }
  };

  const mountBoundaryIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-openat2-mount-')
  );
  const mountBoundaryIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/openat2-mount-index">Openat2 mount index</a></body></html>';
  const mountBoundaryParsedIndex = parseHtmlLinkIndex(
    mountBoundaryIndexHtml,
    source
  );
  const mountBoundaryIndexReceiptPath = indexReceiptFilePath(
    mountBoundaryIndexRoot,
    source.id,
    mountBoundaryParsedIndex.index_sha256
  );
  assertNestedMountCrossingRejected({
    receiptType: 'index',
    raceRoot: mountBoundaryIndexRoot,
    absoluteReceiptPath: mountBoundaryIndexReceiptPath,
    triggerDisplay: 'receipts/exhaust/indexes',
    alternateRelativePath:
      'receipts/exhaust/artifacts/openat2-mount-index-target',
    writeReceipt: () => writeIndexReceipt({
      rootDir: mountBoundaryIndexRoot,
      source,
      parsedIndex: mountBoundaryParsedIndex,
      html: mountBoundaryIndexHtml,
      capturedAt: '2026-08-25T05:00:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'openat2-mount-index'
      }
    })
  });

  const mountBoundaryArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-openat2-mount-')
  );
  const mountBoundaryArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/openat2-mount-artifact';
  const mountBoundaryArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Openat2 mount-boundary artifact.</main></body></html>'
  );
  const mountBoundaryArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(mountBoundaryArtifactBody)
    .digest('hex');
  const mountBoundaryArtifactReceiptPath = artifactReceiptFilePath(
    mountBoundaryArtifactRoot,
    mountBoundaryArtifactCanonicalUrl,
    mountBoundaryArtifactBodySha256
  );
  assertNestedMountCrossingRejected({
    receiptType: 'artifact',
    raceRoot: mountBoundaryArtifactRoot,
    absoluteReceiptPath: mountBoundaryArtifactReceiptPath,
    triggerDisplay: 'receipts/exhaust/artifacts',
    alternateRelativePath:
      'receipts/exhaust/indexes/openat2-mount-artifact-target',
    writeReceipt: () => writeArtifactReceipt({
      rootDir: mountBoundaryArtifactRoot,
      canonicalUrl: mountBoundaryArtifactCanonicalUrl,
      body: mountBoundaryArtifactBody,
      bodySha256: mountBoundaryArtifactBodySha256,
      capturedAt: '2026-08-25T05:00:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'openat2-mount-artifact',
        final_url: mountBoundaryArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

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
    const control = {
      events: [],
      fault: {
        type: 'create_competing_receipt_before_link',
        content_base64: Buffer.from(competingReceipt, 'utf8').toString('base64')
      }
    };
    try {
      const expectedRelativePath = path.relative(rootDir, absoluteReceiptPath)
        .split(path.sep)
        .join('/');
      assert.equal(
        withReceiptDirfdControl(control, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must accept the valid intervening winner`
      );
      assert.equal(
        control.events.some(event => event.type === 'competing-receipt-created'),
        true,
        `${receiptType} publication must exercise the destination-creation race`
      );
      assert.equal(
        control.events.some(event => event.type === 'publish-link-conflict'),
        true,
        `${receiptType} publication must preserve the no-overwrite conflict`
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

    const writeControl = { events: [] };
    try {
      assert.equal(
        withReceiptDirfdControl(writeControl, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must return its canonical receipt path`
      );
      const linkEventIndex = writeControl.events.findIndex(
        event => event.type === 'publish-link'
      );
      assert.notEqual(
        linkEventIndex,
        -1,
        `${receiptType} durability regression must exercise final-path publication`
      );
      assert.equal(
        writeControl.events
          .slice(linkEventIndex + 1)
          .some(event => event.type === 'directory-sync'),
        true,
        `${receiptType} publication must synchronize its directory after linking the receipt`
      );

      const directorySyncs = new Set(
        writeControl.events
          .filter(event => event.type === 'directory-sync')
          .map(event => `${event.dev}:${event.ino}`)
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
      const reuseControl = { events: [] };
      assert.equal(
        withReceiptDirfdControl(reuseControl, reuseReceipt),
        expectedRelativePath,
        `${receiptType} idempotent reuse must retain its canonical receipt path`
      );
      const reuseDirectorySyncs = new Set(
        reuseControl.events
          .filter(event => event.type === 'directory-sync')
          .map(event => `${event.dev}:${event.ino}`)
      );
      const parentStats = fs.lstatSync(path.dirname(absoluteReceiptPath));
      assert.equal(
        reuseDirectorySyncs.has(`${parentStats.dev}:${parentStats.ino}`),
        true,
        `${receiptType} idempotent reuse must synchronize the retained receipt directory`
      );
      assert.equal(
        fs.readFileSync(absoluteReceiptPath, 'utf8'),
        originalReceipt,
        `${receiptType} idempotent reuse may not rewrite retained receipt bytes`
      );

      const failureControl = {
        events: [],
        fault: { type: 'fail_next_directory_sync' }
      };
      assert.throws(
        () => withReceiptDirfdControl(failureControl, reuseReceipt),
        /synchronization failed/u,
        `${receiptType} reuse must fail closed when directory synchronization fails`
      );
      assert.equal(
        failureControl.events.some(
          event => event.type === 'directory-sync-failure'
        ),
        true,
        `${receiptType} failure injection must reach a directory synchronization call`
      );
      assert.equal(
        fs.readFileSync(absoluteReceiptPath, 'utf8'),
        originalReceipt,
        `${receiptType} failed durability proof may not rewrite retained receipt bytes`
      );
    } finally {
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

  const assertNoProcfsPathMediation = ({
    receiptType,
    publicationRoot,
    absoluteReceiptPath,
    writeReceipt
  }) => {
    const guardedMethods = [
      'openSync',
      'statSync',
      'statfsSync',
      'lstatSync',
      'mkdirSync',
      'linkSync',
      'unlinkSync',
      'readFileSync'
    ];
    const originals = new Map(
      guardedMethods.map(method => [method, fs[method]])
    );
    const attempts = [];
    for (const method of guardedMethods) {
      fs[method] = (...args) => {
        const pathArguments = method === 'linkSync'
          ? args.slice(0, 2)
          : args.slice(0, 1);
        const forbidden = pathArguments
          .map(value => String(value))
          .find(value => value.startsWith('/proc/self/'));
        if (forbidden) {
          attempts.push({ method, path: forbidden });
          throw new Error(`forbidden procfs path mediation: ${forbidden}`);
        }
        return originals.get(method)(...args);
      };
    }
    try {
      const expectedRelativePath = path.relative(
        publicationRoot,
        absoluteReceiptPath
      ).split(path.sep).join('/');
      assert.equal(
        writeReceipt(),
        expectedRelativePath,
        `${receiptType} publication must use inherited dirfd operations`
      );
      assert.deepEqual(
        attempts,
        [],
        `${receiptType} publication may not derive mutation paths through procfs`
      );
    } finally {
      for (const [method, original] of originals) fs[method] = original;
      fs.rmSync(publicationRoot, { recursive: true, force: true });
    }
  };

  const noProcfsIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-no-procfs-mediation-')
  );
  const noProcfsIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/no-procfs-index">No procfs index</a></body></html>';
  const noProcfsParsedIndex = parseHtmlLinkIndex(noProcfsIndexHtml, source);
  const noProcfsIndexReceiptPath = indexReceiptFilePath(
    noProcfsIndexRoot,
    source.id,
    noProcfsParsedIndex.index_sha256
  );
  assertNoProcfsPathMediation({
    receiptType: 'index',
    publicationRoot: noProcfsIndexRoot,
    absoluteReceiptPath: noProcfsIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir: noProcfsIndexRoot,
      source,
      parsedIndex: noProcfsParsedIndex,
      html: noProcfsIndexHtml,
      capturedAt: '2026-08-24T12:20:00.000Z'
    })
  });

  const noProcfsArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-no-procfs-mediation-')
  );
  const noProcfsArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/no-procfs-artifact';
  const noProcfsArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>No procfs artifact.</main></body></html>'
  );
  const noProcfsArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(noProcfsArtifactBody)
    .digest('hex');
  const noProcfsArtifactReceiptPath = artifactReceiptFilePath(
    noProcfsArtifactRoot,
    noProcfsArtifactCanonicalUrl,
    noProcfsArtifactBodySha256
  );
  assertNoProcfsPathMediation({
    receiptType: 'artifact',
    publicationRoot: noProcfsArtifactRoot,
    absoluteReceiptPath: noProcfsArtifactReceiptPath,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: noProcfsArtifactRoot,
      canonicalUrl: noProcfsArtifactCanonicalUrl,
      body: noProcfsArtifactBody,
      bodySha256: noProcfsArtifactBodySha256,
      capturedAt: '2026-08-24T12:20:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: noProcfsArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

  const unavailableHelperRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-dirfd-helper-unavailable-')
  );
  const unavailableHelperHtml =
    '<!doctype html><html><body><a href="/news-releases/helper-unavailable-index">Helper unavailable index</a></body></html>';
  const unavailableHelperParsedIndex = parseHtmlLinkIndex(
    unavailableHelperHtml,
    source
  );
  const unavailableControl = {
    events: [],
    interpreter_path: '/definitely/missing/industrial-exhaust-python3',
    allow_unleased_interpreter: true
  };
  try {
    assert.throws(
      () => withReceiptDirfdControl(
        unavailableControl,
        () => writeIndexReceipt({
          rootDir: unavailableHelperRoot,
          source,
          parsedIndex: unavailableHelperParsedIndex,
          html: unavailableHelperHtml,
          capturedAt: '2026-08-24T12:21:00.000Z'
        })
      ),
      /dirfd helper launch failed/u,
      'publication must fail closed when the dirfd helper runtime is unavailable'
    );
    assert.equal(
      fs.existsSync(path.join(unavailableHelperRoot, 'receipts')),
      false,
      'helper launch failure must precede receipt-tree mutation'
    );
  } finally {
    fs.rmSync(unavailableHelperRoot, { recursive: true, force: true });
  }


  const unleasedRuntimeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-unleased-helper-runtime-')
  );
  const unleasedRuntimePath = path.join(unleasedRuntimeRoot, 'python3');
  const unleasedRuntimeScript = `#!${process.execPath}
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const request = JSON.parse(input);
  const rootPath = fs.realpathSync.native('/proc/self/fd/3');
  const segments = String(request.relative_path ?? '').split('/');
  const parentSegments = segments.slice(0, -1);
  const finalPath = path.join(rootPath, ...segments);
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(
    path.join(rootPath, 'unleased-helper-runtime-escape.txt'),
    'unleased runtime escaped its receipt authority\n'
  );

  if (request.action === 'publish') {
    const retained = Buffer.from(request.serialized_base64, 'base64');
    try {
      fs.writeFileSync(finalPath, retained, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }

  const retained = fs.readFileSync(finalPath);
  const digest = crypto.createHash('sha256').update(retained).digest('hex');
  const finalStats = fs.lstatSync(finalPath);
  const chain = [];
  let currentPath = rootPath;
  let currentDisplay = '.';
  let stats = fs.lstatSync(currentPath);
  chain.push({
    display: currentDisplay,
    dev: String(stats.dev),
    ino: String(stats.ino)
  });
  for (const segment of parentSegments) {
    currentPath = path.join(currentPath, segment);
    currentDisplay = currentDisplay === '.'
      ? segment
      : currentDisplay + '/' + segment;
    stats = fs.lstatSync(currentPath);
    chain.push({
      display: currentDisplay,
      dev: String(stats.dev),
      ino: String(stats.ino)
    });
  }

  const response = {
    ok: true,
    events: [],
    retained_sha256: digest,
    final_identity: {
      dev: String(finalStats.dev),
      ino: String(finalStats.ino)
    },
    chain
  };
  if (request.action === 'publish') {
    response.published = true;
    response.retained_base64 = retained.toString('base64');
  }
  process.stdout.write(JSON.stringify(response));
});
`;
  fs.writeFileSync(unleasedRuntimePath, unleasedRuntimeScript, { mode: 0o700 });

  const assertUnleasedRuntimeRejectedBeforeMutation = ({
    receiptType,
    publicationRoot,
    writeReceipt
  }) => {
    const escapePath = path.join(
      publicationRoot,
      'unleased-helper-runtime-escape.txt'
    );
    try {
      assert.throws(
        () => withReceiptDirfdControl(
          {
            events: [],
            interpreter_path: unleasedRuntimePath
          },
          writeReceipt
        ),
        /interpreter lease failed/u,
        `${receiptType} publication must reject an unleased helper runtime`
      );
      assert.equal(
        fs.existsSync(path.join(publicationRoot, 'receipts')),
        false,
        `${receiptType} runtime rejection must precede receipt-tree mutation`
      );
      assert.equal(
        fs.existsSync(escapePath),
        false,
        `${receiptType} rejected runtime may not mutate outside the receipt path`
      );
    } finally {
      fs.rmSync(publicationRoot, { recursive: true, force: true });
    }
  };

  const unleasedRuntimeIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-unleased-runtime-')
  );
  const unleasedRuntimeIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/unleased-runtime-index">Unleased runtime index</a></body></html>';
  const unleasedRuntimeParsedIndex = parseHtmlLinkIndex(
    unleasedRuntimeIndexHtml,
    source
  );
  assertUnleasedRuntimeRejectedBeforeMutation({
    receiptType: 'index',
    publicationRoot: unleasedRuntimeIndexRoot,
    writeReceipt: () => writeIndexReceipt({
      rootDir: unleasedRuntimeIndexRoot,
      source,
      parsedIndex: unleasedRuntimeParsedIndex,
      html: unleasedRuntimeIndexHtml,
      capturedAt: '2026-08-24T19:20:00.000Z'
    })
  });

  const unleasedRuntimeArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-unleased-runtime-')
  );
  const unleasedRuntimeArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/unleased-runtime-artifact';
  const unleasedRuntimeArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Unleased runtime artifact.</main></body></html>'
  );
  const unleasedRuntimeArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(unleasedRuntimeArtifactBody)
    .digest('hex');
  assertUnleasedRuntimeRejectedBeforeMutation({
    receiptType: 'artifact',
    publicationRoot: unleasedRuntimeArtifactRoot,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: unleasedRuntimeArtifactRoot,
      canonicalUrl: unleasedRuntimeArtifactCanonicalUrl,
      body: unleasedRuntimeArtifactBody,
      bodySha256: unleasedRuntimeArtifactBodySha256,
      capturedAt: '2026-08-24T19:20:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: unleasedRuntimeArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });
  fs.rmSync(unleasedRuntimeRoot, { recursive: true, force: true });

  const forkProbeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-helper-fork-probe-')
  );
  const forkProbeHtml =
    '<!doctype html><html><body><a href="/news-releases/helper-fork-probe">Helper fork probe</a></body></html>';
  const forkProbeParsedIndex = parseHtmlLinkIndex(forkProbeHtml, source);
  const forkProbeControl = {
    events: [],
    fault: { type: 'probe_fork_denial' }
  };
  try {
    withReceiptDirfdControl(
      forkProbeControl,
      () => writeIndexReceipt({
        rootDir: forkProbeRoot,
        source,
        parsedIndex: forkProbeParsedIndex,
        html: forkProbeHtml,
        capturedAt: '2026-08-24T19:21:00.000Z',
        responseHeaders: { content_type: 'text/html' }
      })
    );
    assert.equal(
      forkProbeControl.events.some(event => event.type === 'fork-denied'),
      true,
      'the leased helper runtime must prohibit descendant process creation'
    );
  } finally {
    fs.rmSync(forkProbeRoot, { recursive: true, force: true });
  }

  const assertLeasedInterpreterDescriptorControlsExecution = ({
    receiptType,
    publicationRoot,
    writeReceipt
  }) => {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `industrial-exhaust-${receiptType}-leased-exec-swap-`)
    );
    const interpreterPath = path.join(runtimeRoot, 'python3');
    const originalInterpreterPath = path.join(runtimeRoot, 'python3.original');
    const escapePath = path.join(
      publicationRoot,
      'transient-interpreter-substitution-escape.txt'
    );
    fs.copyFileSync('/usr/bin/python3', interpreterPath);
    fs.chmodSync(interpreterPath, 0o755);

    const maliciousInterpreter = [
      '#!/bin/sh',
      `printf '%s\\n' 'transient interpreter substitution executed' > ${JSON.stringify(escapePath)}`,
      `/bin/rm -f -- ${JSON.stringify(interpreterPath)}`,
      `/bin/mv -- ${JSON.stringify(originalInterpreterPath)} ${JSON.stringify(interpreterPath)}`,
      `exec ${JSON.stringify(interpreterPath)} "$@"`,
      ''
    ].join('\n');

    const originalRelative = path.relative;
    const originalLstatSync = fs.lstatSync;
    const originalOpenSync = fs.openSync;
    const originalFstatSync = fs.fstatSync;
    const originalMkdtempSync = fs.mkdtempSync;
    let interpreterDescriptor = null;
    let substitutionInstalled = false;

    const trustedStats = stats => new Proxy(stats, {
      get(target, property, receiver) {
        if (property === 'uid') return 0;
        if (property === 'mode') {
          return Reflect.get(target, property, receiver) & ~0o022;
        }
        const value = Reflect.get(target, property, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

    path.relative = (from, to) => {
      if (from === '/usr/bin' && to === interpreterPath) {
        return path.basename(interpreterPath);
      }
      return originalRelative(from, to);
    };
    fs.lstatSync = (targetPath, ...args) => {
      const stats = originalLstatSync(targetPath, ...args);
      const absoluteTarget = path.resolve(String(targetPath));
      const interpreterDirectory = path.dirname(interpreterPath);
      const isLeasePath = absoluteTarget === interpreterPath
        || absoluteTarget === interpreterDirectory
        || interpreterDirectory.startsWith(`${absoluteTarget}${path.sep}`);
      return isLeasePath ? trustedStats(stats) : stats;
    };
    fs.openSync = (targetPath, ...args) => {
      const descriptor = originalOpenSync(targetPath, ...args);
      if (path.resolve(String(targetPath)) === interpreterPath) {
        interpreterDescriptor = descriptor;
      }
      return descriptor;
    };
    fs.fstatSync = (descriptor, ...args) => {
      const stats = originalFstatSync(descriptor, ...args);
      return descriptor === interpreterDescriptor ? trustedStats(stats) : stats;
    };
    fs.mkdtempSync = (prefix, ...args) => {
      const workingDirectory = originalMkdtempSync(prefix, ...args);
      if (!substitutionInstalled
        && String(prefix).includes('industrial-exhaust-receipt-helper-')) {
        fs.renameSync(interpreterPath, originalInterpreterPath);
        fs.writeFileSync(interpreterPath, maliciousInterpreter, { mode: 0o755 });
        substitutionInstalled = true;
      }
      return workingDirectory;
    };

    try {
      assert.throws(
        () => withReceiptDirfdControl(
          {
            events: [],
            interpreter_path: interpreterPath
          },
          writeReceipt
        ),
        /interpreter lease failed/u,
        `${receiptType} publication must fail closed when the leased pathname is substituted before execution`
      );
      assert.equal(
        substitutionInstalled,
        true,
        `${receiptType} regression must substitute the interpreter after lease admission`
      );
      assert.equal(
        fs.existsSync(escapePath),
        false,
        `${receiptType} publication must execute the leased descriptor rather than the substituted pathname`
      );
    } finally {
      path.relative = originalRelative;
      fs.lstatSync = originalLstatSync;
      fs.openSync = originalOpenSync;
      fs.fstatSync = originalFstatSync;
      fs.mkdtempSync = originalMkdtempSync;
      fs.rmSync(publicationRoot, { recursive: true, force: true });
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
  };

  const leasedExecIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-leased-exec-swap-')
  );
  const leasedExecIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/leased-exec-index">Leased exec index</a></body></html>';
  const leasedExecParsedIndex = parseHtmlLinkIndex(
    leasedExecIndexHtml,
    source
  );
  assertLeasedInterpreterDescriptorControlsExecution({
    receiptType: 'index',
    publicationRoot: leasedExecIndexRoot,
    writeReceipt: () => writeIndexReceipt({
      rootDir: leasedExecIndexRoot,
      source,
      parsedIndex: leasedExecParsedIndex,
      html: leasedExecIndexHtml,
      capturedAt: '2026-08-24T20:05:00.000Z'
    })
  });

  const leasedExecArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-leased-exec-swap-')
  );
  const leasedExecArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/leased-exec-artifact';
  const leasedExecArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Leased exec artifact.</main></body></html>'
  );
  const leasedExecArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(leasedExecArtifactBody)
    .digest('hex');
  assertLeasedInterpreterDescriptorControlsExecution({
    receiptType: 'artifact',
    publicationRoot: leasedExecArtifactRoot,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: leasedExecArtifactRoot,
      canonicalUrl: leasedExecArtifactCanonicalUrl,
      body: leasedExecArtifactBody,
      bodySha256: leasedExecArtifactBodySha256,
      capturedAt: '2026-08-24T20:05:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: leasedExecArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

  const untrustedRuntimeDependencyRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-untrusted-runtime-dependency-')
  );
  const untrustedRuntimeDependencyPath = path.join(
    untrustedRuntimeDependencyRoot,
    'mutable-runtime-module.py'
  );
  const untrustedRuntimeDependencyBytes =
    'mutable runtime dependency must never enter the helper closure\n';
  fs.writeFileSync(
    untrustedRuntimeDependencyPath,
    untrustedRuntimeDependencyBytes,
    { mode: 0o600 }
  );

  const runtimeClosureResults = [];
  const exerciseUntrustedRuntimeDependency = ({
    receiptType,
    publicationRoot,
    writeReceipt
  }) => {
    let rejected = false;
    let errorText = null;
    try {
      withReceiptDirfdControl(
        {
          events: [],
          runtime_dependency_paths: [untrustedRuntimeDependencyPath]
        },
        writeReceipt
      );
    } catch (error) {
      errorText = String(error?.message ?? error);
      rejected = /runtime dependency lease failed/u.test(errorText);
    }
    runtimeClosureResults.push({
      receiptType,
      rejected,
      errorText,
      receiptsCreated: fs.existsSync(path.join(publicationRoot, 'receipts'))
    });
    fs.rmSync(publicationRoot, { recursive: true, force: true });
  };

  const runtimeClosureIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-runtime-closure-')
  );
  const runtimeClosureIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/runtime-closure-index">Runtime closure index</a></body></html>';
  const runtimeClosureParsedIndex = parseHtmlLinkIndex(
    runtimeClosureIndexHtml,
    source
  );
  exerciseUntrustedRuntimeDependency({
    receiptType: 'index',
    publicationRoot: runtimeClosureIndexRoot,
    writeReceipt: () => writeIndexReceipt({
      rootDir: runtimeClosureIndexRoot,
      source,
      parsedIndex: runtimeClosureParsedIndex,
      html: runtimeClosureIndexHtml,
      capturedAt: '2026-08-24T20:10:00.000Z'
    })
  });

  const runtimeClosureArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-runtime-closure-')
  );
  const runtimeClosureArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/runtime-closure-artifact';
  const runtimeClosureArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Runtime closure artifact.</main></body></html>'
  );
  const runtimeClosureArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(runtimeClosureArtifactBody)
    .digest('hex');
  exerciseUntrustedRuntimeDependency({
    receiptType: 'artifact',
    publicationRoot: runtimeClosureArtifactRoot,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: runtimeClosureArtifactRoot,
      canonicalUrl: runtimeClosureArtifactCanonicalUrl,
      body: runtimeClosureArtifactBody,
      bodySha256: runtimeClosureArtifactBodySha256,
      capturedAt: '2026-08-24T20:10:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: runtimeClosureArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

  assert.deepEqual(
    runtimeClosureResults.map(result => ({
      receiptType: result.receiptType,
      rejected: result.rejected,
      receiptsCreated: result.receiptsCreated
    })),
    [
      { receiptType: 'index', rejected: true, receiptsCreated: false },
      { receiptType: 'artifact', rejected: true, receiptsCreated: false }
    ],
    `publication must reject every untrusted runtime dependency before mutation: ${JSON.stringify(runtimeClosureResults)}`
  );
  assert.equal(
    fs.readFileSync(untrustedRuntimeDependencyPath, 'utf8'),
    untrustedRuntimeDependencyBytes,
    'runtime dependency rejection may not alter the rejected file'
  );
  fs.rmSync(untrustedRuntimeDependencyRoot, { recursive: true, force: true });

  const forgedHelperRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-forged-dirfd-helper-')
  );
  const forgedHelperPath = path.join(forgedHelperRoot, 'python3');
  const forgedHelperScript = `#!${process.execPath}
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const request = JSON.parse(input);
  const rootPath = fs.realpathSync.native('/proc/self/fd/3');
  const segments = String(request.relative_path ?? '').split('/');
  const parentSegments = segments.slice(0, -1);
  fs.mkdirSync(path.join(rootPath, ...parentSegments), { recursive: true });

  const chain = [];
  let currentPath = rootPath;
  let currentDisplay = '.';
  let stats = fs.lstatSync(currentPath);
  chain.push({
    display: currentDisplay,
    dev: String(stats.dev),
    ino: String(stats.ino)
  });
  for (const segment of parentSegments) {
    currentPath = path.join(currentPath, segment);
    currentDisplay = currentDisplay === '.'
      ? segment
      : \`\${currentDisplay}/\${segment}\`;
    stats = fs.lstatSync(currentPath);
    chain.push({
      display: currentDisplay,
      dev: String(stats.dev),
      ino: String(stats.ino)
    });
  }

  let response;
  if (request.action === 'publish') {
    const retained = Buffer.from(request.serialized_base64, 'base64');
    const digest = crypto.createHash('sha256').update(retained).digest('hex');
    const rootStats = fs.fstatSync(3);
    response = {
      ok: true,
      events: [],
      published: true,
      retained_base64: retained.toString('base64'),
      retained_sha256: digest,
      final_identity: {
        dev: String(rootStats.dev),
        ino: String(rootStats.ino)
      },
      chain
    };
  } else if (request.action === 'verify') {
    response = {
      ok: true,
      events: [],
      retained_sha256: request.expected_sha256,
      final_identity: request.expected_identity,
      chain
    };
  } else {
    response = { ok: false, events: [], error: 'unsupported action' };
  }
  process.stdout.write(JSON.stringify(response));
});
`;
  fs.writeFileSync(forgedHelperPath, forgedHelperScript, { mode: 0o700 });

  const assertForgedHelperCannotClaimPublication = ({
    receiptType,
    publicationRoot,
    absoluteReceiptPath,
    writeReceipt
  }) => {
    const control = {
      events: [],
      interpreter_path: forgedHelperPath,
      allow_unleased_interpreter: true
    };
    try {
      assert.throws(
        () => withReceiptDirfdControl(control, writeReceipt),
        /visible receipt attestation failed/u,
        `${receiptType} publication must reject a helper transcript without a final receipt`
      );
      assert.equal(
        fs.existsSync(path.dirname(absoluteReceiptPath)),
        true,
        `${receiptType} forged helper must provide a complete visible parent chain`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        false,
        `${receiptType} forged helper may not claim a missing final receipt`
      );
    } finally {
      fs.rmSync(publicationRoot, { recursive: true, force: true });
    }
  };

  const forgedHelperIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-forged-helper-')
  );
  const forgedHelperIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/forged-helper-index">Forged helper index</a></body></html>';
  const forgedHelperParsedIndex = parseHtmlLinkIndex(
    forgedHelperIndexHtml,
    source
  );
  const forgedHelperIndexReceiptPath = indexReceiptFilePath(
    forgedHelperIndexRoot,
    source.id,
    forgedHelperParsedIndex.index_sha256
  );
  assertForgedHelperCannotClaimPublication({
    receiptType: 'index',
    publicationRoot: forgedHelperIndexRoot,
    absoluteReceiptPath: forgedHelperIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir: forgedHelperIndexRoot,
      source,
      parsedIndex: forgedHelperParsedIndex,
      html: forgedHelperIndexHtml,
      capturedAt: '2026-08-24T12:40:00.000Z'
    })
  });

  const forgedHelperArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-forged-helper-')
  );
  const forgedHelperArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/forged-helper-artifact';
  const forgedHelperArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Forged helper artifact.</main></body></html>'
  );
  const forgedHelperArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(forgedHelperArtifactBody)
    .digest('hex');
  const forgedHelperArtifactReceiptPath = artifactReceiptFilePath(
    forgedHelperArtifactRoot,
    forgedHelperArtifactCanonicalUrl,
    forgedHelperArtifactBodySha256
  );
  assertForgedHelperCannotClaimPublication({
    receiptType: 'artifact',
    publicationRoot: forgedHelperArtifactRoot,
    absoluteReceiptPath: forgedHelperArtifactReceiptPath,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: forgedHelperArtifactRoot,
      canonicalUrl: forgedHelperArtifactCanonicalUrl,
      body: forgedHelperArtifactBody,
      bodySha256: forgedHelperArtifactBodySha256,
      capturedAt: '2026-08-24T12:40:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        final_url: forgedHelperArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });
  fs.rmSync(forgedHelperRoot, { recursive: true, force: true });

  const assertHelperWriteAuthorityIsReceiptParentOnly = ({
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
    const control = {
      events: [],
      fault: {
        type: 'swap_visible_ancestor_after_temp_open',
        canonical_receipts_path: canonicalReceiptsPath,
        displaced_receipts_path: displacedReceiptsPath,
        external_receipts_path: externalReceiptsPath
      }
    };

    try {
      const expectedRelativePath = path.relative(
        raceRoot,
        absoluteReceiptPath
      ).split(path.sep).join('/');
      assert.equal(
        withReceiptDirfdControl(control, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must continue after denying ambient ancestor mutation`
      );
      const parentSegments = path.relative(
        raceRoot,
        path.dirname(absoluteReceiptPath)
      ).split(path.sep).filter(Boolean);
      const expectedConfinementScopes = [
        'receipt-parent',
        'repository-root'
      ];
      let progressiveDisplay = '';
      for (const segment of parentSegments) {
        progressiveDisplay = progressiveDisplay
          ? `${progressiveDisplay}/${segment}`
          : segment;
        expectedConfinementScopes.push(
          `directory-chain:${progressiveDisplay}`
        );
      }
      const confinementScopes = [...new Set(
        control.events
          .filter(event => event.type === 'filesystem-write-confined')
          .map(event => event.scope)
      )].sort();
      assert.deepEqual(
        confinementScopes,
        [...new Set(expectedConfinementScopes)].sort(),
        `${receiptType} helper must progressively narrow every directory-chain Landlock domain`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'ambient-write-denied'
            && event.operation === 'visible-ancestor-swap'
        ),
        true,
        `${receiptType} helper must prove that ancestor mutation was denied`
      );
      assert.equal(
        control.events.some(event => event.type === 'visible-ancestor-swapped'),
        false,
        `${receiptType} helper may not alter the visible receipt ancestor`
      );
      assert.equal(
        fs.existsSync(displacedReceiptsPath),
        false,
        `${receiptType} denied mutation may not displace the canonical receipt tree`
      );
      assert.equal(
        fs.existsSync(externalReceiptPath),
        false,
        `${receiptType} helper may not mutate the external replacement tree`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        true,
        `${receiptType} receipt must remain reachable after ambient mutation denial`
      );
    } finally {
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
  assertHelperWriteAuthorityIsReceiptParentOnly({
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
  assertHelperWriteAuthorityIsReceiptParentOnly({
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

  const assertHelperWriteAuthorityNarrowsWithDirectoryChain = ({
    receiptType,
    raceRoot,
    absoluteReceiptPath,
    triggerDisplay,
    siblingRelativePath,
    writeReceipt
  }) => {
    const siblingPath = path.join(
      raceRoot,
      ...siblingRelativePath.split('/')
    );
    const displacedSiblingPath = `${siblingPath}.displaced`;
    const siblingBody = `${receiptType} progressive Landlock sibling\n`;

    fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
    fs.mkdirSync(path.dirname(siblingPath), { recursive: true });
    fs.writeFileSync(siblingPath, siblingBody);
    const control = {
      events: [],
      fault: {
        type: 'rename_directory_chain_sibling_after_open',
        after_display: triggerDisplay,
        canonical_path: siblingPath,
        displaced_path: displacedSiblingPath
      }
    };

    try {
      const expectedRelativePath = path.relative(
        raceRoot,
        absoluteReceiptPath
      ).split(path.sep).join('/');
      assert.equal(
        withReceiptDirfdControl(control, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must continue after denying a directory-chain sibling mutation`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'filesystem-write-confined'
            && event.scope === `directory-chain:${triggerDisplay}`
        ),
        true,
        `${receiptType} helper must prove the directory-chain confinement point`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'ambient-write-denied'
            && event.operation === 'directory-chain-sibling-rename'
            && event.display === triggerDisplay
        ),
        true,
        `${receiptType} helper must deny sibling mutation after directory-chain narrowing`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'directory-chain-sibling-renamed'
        ),
        false,
        `${receiptType} helper may not rename a sibling outside the narrowed directory chain`
      );
      assert.equal(
        fs.readFileSync(siblingPath, 'utf8'),
        siblingBody,
        `${receiptType} sibling must remain at its canonical repository path`
      );
      assert.equal(
        fs.existsSync(displacedSiblingPath),
        false,
        `${receiptType} denied sibling mutation may not leave a displaced path`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        true,
        `${receiptType} receipt must remain reachable after progressive confinement`
      );
    } finally {
      fs.rmSync(raceRoot, { recursive: true, force: true });
    }
  };

  const progressiveIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-progressive-landlock-')
  );
  const progressiveIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/progressive-landlock-index">Progressive Landlock index</a></body></html>';
  const progressiveParsedIndex = parseHtmlLinkIndex(
    progressiveIndexHtml,
    source
  );
  const progressiveIndexReceiptPath = indexReceiptFilePath(
    progressiveIndexRoot,
    source.id,
    progressiveParsedIndex.index_sha256
  );
  assertHelperWriteAuthorityNarrowsWithDirectoryChain({
    receiptType: 'index',
    raceRoot: progressiveIndexRoot,
    absoluteReceiptPath: progressiveIndexReceiptPath,
    triggerDisplay: 'receipts/exhaust/indexes',
    siblingRelativePath:
      'receipts/exhaust/artifacts/progressive-landlock-index-sibling.txt',
    writeReceipt: () => writeIndexReceipt({
      rootDir: progressiveIndexRoot,
      source,
      parsedIndex: progressiveParsedIndex,
      html: progressiveIndexHtml,
      capturedAt: '2026-08-24T12:45:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'progressive-landlock-index'
      }
    })
  });

  const progressiveArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-progressive-landlock-')
  );
  const progressiveArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/progressive-landlock-artifact';
  const progressiveArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Progressive Landlock artifact.</main></body></html>'
  );
  const progressiveArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(progressiveArtifactBody)
    .digest('hex');
  const progressiveArtifactReceiptPath = artifactReceiptFilePath(
    progressiveArtifactRoot,
    progressiveArtifactCanonicalUrl,
    progressiveArtifactBodySha256
  );
  assertHelperWriteAuthorityNarrowsWithDirectoryChain({
    receiptType: 'artifact',
    raceRoot: progressiveArtifactRoot,
    absoluteReceiptPath: progressiveArtifactReceiptPath,
    triggerDisplay: 'receipts/exhaust/artifacts',
    siblingRelativePath:
      'receipts/exhaust/indexes/progressive-landlock-artifact-sibling.txt',
    writeReceipt: () => writeArtifactReceipt({
      rootDir: progressiveArtifactRoot,
      canonicalUrl: progressiveArtifactCanonicalUrl,
      body: progressiveArtifactBody,
      bodySha256: progressiveArtifactBodySha256,
      capturedAt: '2026-08-24T12:45:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'progressive-landlock-artifact',
        final_url: progressiveArtifactCanonicalUrl,
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

delete globalThis[receiptDirfdControlSymbol];
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;

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
