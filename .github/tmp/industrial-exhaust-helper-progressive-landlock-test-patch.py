from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()
anchor = "  const indexAbsolutePath = path.join(rootDir, indexReceiptPath);\n"
if text.count(anchor) != 1:
    raise SystemExit("test insertion anchor mismatch")

block = r'''  const assertHelperWriteAuthorityNarrowsWithDirectoryChain = ({
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

'''

PATH.write_text(text.replace(anchor, block + anchor))
