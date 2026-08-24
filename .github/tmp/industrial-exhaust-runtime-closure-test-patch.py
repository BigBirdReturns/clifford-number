from pathlib import Path

path = Path('test/industrial-exhaust-retained-store-custody.test.js')
text = path.read_text()

marker = """  const forgedHelperRoot = fs.mkdtempSync(
"""
block = r'''  const untrustedRuntimeDependencyRoot = fs.mkdtempSync(
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

'''
if text.count(marker) != 1:
    raise SystemExit(f'unexpected forged-helper marker count: {text.count(marker)}')
text = text.replace(marker, block + marker, 1)
path.write_text(text)
