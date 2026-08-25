from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()

anchor = '''  const forkProbeRoot = fs.mkdtempSync(
'''
if text.count(anchor) != 1:
    raise SystemExit("metadata-seccomp test insertion anchor mismatch")

block = r'''  const assertUnrelatedMetadataMutationConfined = ({
    receiptType,
    publicationRoot,
    absoluteReceiptPath,
    writeReceipt
  }) => {
    const sentinelPath = path.join(
      publicationRoot,
      'unrelated-metadata-sentinel.txt'
    );
    const sentinelBody = `${receiptType} unrelated metadata sentinel\n`;
    fs.writeFileSync(sentinelPath, sentinelBody, { mode: 0o600 });
    fs.chmodSync(sentinelPath, 0o600);
    const before = fs.lstatSync(sentinelPath);
    const control = {
      events: [],
      fault: {
        type: 'chmod_unrelated_after_narrowing',
        path: sentinelPath,
        mode: 0o644
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
        `${receiptType} publication must survive a denied unrelated metadata mutation`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'metadata-mutation-denied'
            && event.operation === 'chmod'
        ),
        true,
        `${receiptType} helper must deny unrelated metadata mutation after capability narrowing`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'metadata-mutation-succeeded'
        ),
        false,
        `${receiptType} helper may not complete an unrelated metadata mutation`
      );
      const after = fs.lstatSync(sentinelPath);
      assert.equal(
        after.mode & 0o777,
        before.mode & 0o777,
        `${receiptType} denied metadata mutation must preserve the sentinel mode`
      );
      assert.equal(
        fs.readFileSync(sentinelPath, 'utf8'),
        sentinelBody,
        `${receiptType} denied metadata mutation must preserve sentinel bytes`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        true,
        `${receiptType} receipt must remain reachable after metadata confinement`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'filesystem-metadata-confined'
            && event.policy === 'filesystem-metadata-v1'
        ),
        true,
        `${receiptType} helper must prove filesystem metadata syscall confinement`
      );
    } finally {
      fs.rmSync(publicationRoot, { recursive: true, force: true });
    }
  };

  const metadataSeccompIndexRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-index-metadata-seccomp-')
  );
  const metadataSeccompIndexHtml =
    '<!doctype html><html><body><a href="/news-releases/metadata-seccomp-index">Metadata seccomp index</a></body></html>';
  const metadataSeccompParsedIndex = parseHtmlLinkIndex(
    metadataSeccompIndexHtml,
    source
  );
  const metadataSeccompIndexReceiptPath = indexReceiptFilePath(
    metadataSeccompIndexRoot,
    source.id,
    metadataSeccompParsedIndex.index_sha256
  );
  assertUnrelatedMetadataMutationConfined({
    receiptType: 'index',
    publicationRoot: metadataSeccompIndexRoot,
    absoluteReceiptPath: metadataSeccompIndexReceiptPath,
    writeReceipt: () => writeIndexReceipt({
      rootDir: metadataSeccompIndexRoot,
      source,
      parsedIndex: metadataSeccompParsedIndex,
      html: metadataSeccompIndexHtml,
      capturedAt: '2026-08-25T17:40:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'metadata-seccomp-index'
      }
    })
  });

  const metadataSeccompArtifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-artifact-metadata-seccomp-')
  );
  const metadataSeccompArtifactCanonicalUrl =
    'https://www.dentsu.com/news-releases/metadata-seccomp-artifact';
  const metadataSeccompArtifactBody = Buffer.from(
    '<!doctype html><html><body><main>Metadata seccomp artifact.</main></body></html>'
  );
  const metadataSeccompArtifactBodySha256 = crypto
    .createHash('sha256')
    .update(metadataSeccompArtifactBody)
    .digest('hex');
  const metadataSeccompArtifactReceiptPath = artifactReceiptFilePath(
    metadataSeccompArtifactRoot,
    metadataSeccompArtifactCanonicalUrl,
    metadataSeccompArtifactBodySha256
  );
  assertUnrelatedMetadataMutationConfined({
    receiptType: 'artifact',
    publicationRoot: metadataSeccompArtifactRoot,
    absoluteReceiptPath: metadataSeccompArtifactReceiptPath,
    writeReceipt: () => writeArtifactReceipt({
      rootDir: metadataSeccompArtifactRoot,
      canonicalUrl: metadataSeccompArtifactCanonicalUrl,
      body: metadataSeccompArtifactBody,
      bodySha256: metadataSeccompArtifactBodySha256,
      capturedAt: '2026-08-25T17:40:00.000Z',
      responseHeaders: {
        content_type: 'text/html',
        etag: 'metadata-seccomp-artifact',
        final_url: metadataSeccompArtifactCanonicalUrl,
        redirect_chain: []
      }
    })
  });

'''

PATH.write_text(text.replace(anchor, block + anchor))
