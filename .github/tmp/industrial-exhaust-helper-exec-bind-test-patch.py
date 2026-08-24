from pathlib import Path

path = Path('test/industrial-exhaust-retained-store-custody.test.js')
text = path.read_text()

marker = '''  const forgedHelperRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'industrial-exhaust-forged-dirfd-helper-')
  );
'''
if text.count(marker) != 1:
    raise SystemExit(f'unexpected forged-helper marker count: {text.count(marker)}')

insertion = r'''  const assertLeasedInterpreterDescriptorControlsExecution = ({
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

'''

text = text.replace(marker, insertion + marker, 1)
path.write_text(text)
