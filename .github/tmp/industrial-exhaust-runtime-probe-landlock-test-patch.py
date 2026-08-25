from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()

anchor = '''  const untrustedRuntimeDependencyRoot = fs.mkdtempSync(
'''
if text.count(anchor) != 1:
    raise SystemExit("runtime-probe test insertion anchor mismatch")

block = r'''  const assertRuntimeClosureProbeWriteConfined = ({
    receiptType,
    publicationRoot,
    absoluteReceiptPath,
    writeReceipt
  }) => {
    const escapePath = path.join(
      publicationRoot,
      'runtime-probe-ambient-write-escape.txt'
    );
    const escapeBody = `${receiptType} runtime probe ambient write escape\n`;
    const control = {
      events: [],
      runtime_probe_fault: {
        type: 'write_runtime_probe_escape',
        path: escapePath,
        content_base64: Buffer.from(escapeBody, 'utf8').toString('base64')
      }
    };

    try {
      const expectedRelativePath = path.relative(
        publicationRoot,
        absoluteReceiptPath
      ).split(path.sep).join('/');
      assert.equal(
        withReceiptDirfdControl(control, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must survive a denied runtime-probe escape write`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'runtime-probe-write-denied'
        ),
        true,
        `${receiptType} runtime closure probe must deny ambient repository mutation`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'runtime-probe-escape-created'
        ),
        false,
        `${receiptType} runtime closure probe may not create an ambient escape file`
      );
      assert.equal(
        fs.existsSync(escapePath),
        false,
        `${receiptType} runtime closure probe may not mutate the publication root`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        true,
        `${receiptType} receipt must remain reachable after probe confinement`
      );
    } finally {
      fs.rmSync(publicationRoot, { recursive: true, force: true });
    }
  };

  const runtimeProbeIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-runtime-probe-landlock-')
  );
  const runtimeProbeIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/runtime-probe-landlock-index">Runtime probe Landlock index</a></body></html>';
  const runtimeProbeParsedIndex = parseHtmlLinkIndex(
    runtimeProbeIndexHtml,
    source
  );
  const runtimeProbeIndexReceiptPath = indexReceiptFilePath(
    runtimeProbeIndexRoot,
    source.id,
    runtimeProbeParsedIndex.index_sha256
  );
  assertRuntimeClosureProbeWriteConfined({
    receiptType: 'index',
    publicationRoot: runtimeProbeIndexRoot,
    absoluteReceiptPath: runtimeProbeIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir: runtimeProbeIndexRoot,
      source,
      parsedIndex: runtimeProbeParsedIndex,
      html: runtimeProbeIndexHtml,
      capturedAt: '2026-08-25T10:15:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'runtime-probe-landlock-index'
      }
    })
  });

  const runtimeProbeArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-runtime-probe-landlock-')
  );
  const runtimeProbeArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/runtime-probe-landlock-artifact';
  const runtimeProbeArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Runtime probe Landlock artifact.</main></body></html>'
  );
  const runtimeProbeArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(runtimeProbeArtifactBody)
    .digest('hex');
  const runtimeProbeArtifactReceiptPath = artifactReceiptFilePath(
    runtimeProbeArtifactRoot,
    runtimeProbeArtifactCanonicalUrl,
    runtimeProbeArtifactBodySha256
  );
  assertRuntimeClosureProbeWriteConfined({
    receiptType: 'artifact',
    publicationRoot: runtimeProbeArtifactRoot,
    absoluteReceiptPath: runtimeProbeArtifactReceiptPath,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: runtimeProbeArtifactRoot,
      canonicalUrl: runtimeProbeArtifactCanonicalUrl,
      body: runtimeProbeArtifactBody,
      bodySha256: runtimeProbeArtifactBodySha256,
      capturedAt: '2026-08-25T10:15:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'runtime-probe-landlock-artifact',
        final_url: runtimeProbeArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

'''

PATH.write_text(text.replace(anchor, block + anchor))
