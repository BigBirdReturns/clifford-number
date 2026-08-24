from pathlib import Path

path = Path('test/industrial-exhaust-retained-store-custody.test.js')
text = path.read_text()

root_marker = """const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'industrial-exhaust-retained-store-'));
"""
control_insert = r"""const receiptDirfdControlSymbol = Symbol.for(
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
"""
if text.count(root_marker) != 1:
    raise SystemExit(f'unexpected root marker count: {text.count(root_marker)}')
text = text.replace(root_marker, root_marker + '\n' + control_insert + '\n', 1)

block_start_marker = """  const assertDestinationRacePreservesWinner = ({
"""
block_end_marker = """
  const indexAbsolutePath = path.join(rootDir, indexReceiptPath);
"""
start = text.index(block_start_marker)
end = text.index(block_end_marker, start)
replacement = r"""  const assertDestinationRacePreservesWinner = ({
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
    interpreter_path: '/definitely/missing/industrial-exhaust-python3'
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
      assert.throws(
        () => withReceiptDirfdControl(control, writeReceipt),
        /directory chain changed/u,
        `${receiptType} publication must reject a changed visible receipt chain`
      );
      assert.equal(
        control.events.some(event => event.type === 'visible-ancestor-swapped'),
        true,
        `${receiptType} regression must exercise the temporary-file publication window`
      );
      assert.equal(
        fs.existsSync(externalReceiptPath),
        false,
        `${receiptType} publication may not mutate the substituted external tree`
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
"""
text = text[:start] + replacement + text[end:]

restore_marker = """} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

const canonicalDiscoveryRecords = fs.readFileSync(
"""
restore_replacement = """} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

delete globalThis[receiptDirfdControlSymbol];
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;

const canonicalDiscoveryRecords = fs.readFileSync(
"""
if text.count(restore_marker) != 1:
    raise SystemExit(f'unexpected environment-restore marker count: {text.count(restore_marker)}')
text = text.replace(restore_marker, restore_replacement, 1)

path.write_text(text)
