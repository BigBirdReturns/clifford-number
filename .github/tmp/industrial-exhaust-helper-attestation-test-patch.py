from pathlib import Path

path = Path('test/industrial-exhaust-retained-store-custody.test.js')
text = path.read_text()
marker = """  const assertAncestorSwapCannotRedirectPublication = ({
"""
if text.count(marker) != 1:
    raise SystemExit(
        f'unexpected forged-helper regression insertion count: {text.count(marker)}'
    )

insertion = r'''
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
      interpreter_path: forgedHelperPath
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

'''
path.write_text(text.replace(marker, insertion + marker, 1))
