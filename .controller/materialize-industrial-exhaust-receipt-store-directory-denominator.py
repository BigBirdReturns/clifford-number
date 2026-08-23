from pathlib import Path
import sys

root = Path(sys.argv[1])
library = root / 'tools/lib/industrial-exhaust-artifacts.mjs'
text = library.read_text()
old = """  const result = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        const relativePath = portableReceiptPath(root, absolutePath);
        if (!entry.name.endsWith('.json')) {
          throw new Error(`receipt store contains an unsupported file: ${relativePath}`);
        }
        result.push(relativePath);
      } else {
        throw new Error(`receipt store contains an unsupported entry: ${portableReceiptPath(root, absolutePath)}`);
      }
    }
  };
  visit(base);
  return result.sort();
"""
new = """  const maxDirectoryDepth = relativeDir === 'receipts/exhaust/indexes'
    ? 1
    : relativeDir === 'receipts/exhaust/artifacts'
      ? 2
      : null;
  if (maxDirectoryDepth === null) {
    throw new Error(`unsupported receipt store directory: ${relativeDir}`);
  }

  const result = [];
  const visit = (current, depth) => {
    let fileCount = 0;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = portableReceiptPath(root, absolutePath);
      if (entry.isDirectory()) {
        if (depth >= maxDirectoryDepth) {
          throw new Error(`receipt store contains an unsupported directory: ${relativePath}`);
        }
        const nestedFileCount = visit(absolutePath, depth + 1);
        if (nestedFileCount === 0) {
          throw new Error(`receipt store contains an empty directory: ${relativePath}`);
        }
        fileCount += nestedFileCount;
      } else if (entry.isFile()) {
        if (!entry.name.endsWith('.json')) {
          throw new Error(`receipt store contains an unsupported file: ${relativePath}`);
        }
        result.push(relativePath);
        fileCount += 1;
      } else {
        throw new Error(`receipt store contains an unsupported entry: ${relativePath}`);
      }
    }
    return fileCount;
  };
  visit(base, 0);
  return result.sort();
"""
if text.count(old) != 1:
    raise SystemExit('receipt directory walker anchor is not unique')
library.write_text(text.replace(old, new))

test_file = root / 'test/industrial-exhaust-retained-store-custody.test.js'
test_text = test_file.read_text()
anchor = """  assertHardLinkedReceiptRejected({
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
} finally {
"""
replacement = """  assertHardLinkedReceiptRejected({
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
    /empty directory: receipts\\/exhaust\\/artifacts\\/empty\\.example\\/0{64}/u,
    'store validation must reject empty receipt namespaces'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /empty directory: receipts\\/exhaust\\/artifacts\\/empty\\.example\\/0{64}/u,
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
    /unsupported directory: receipts\\/exhaust\\/indexes\\/dentsu_global_news_sitemap\\/f{64}\\.json/u,
    'a directory may not occupy a receipt-file position'
  );
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({ rootDir, discoveryRecords, artifacts }),
    /unsupported directory: receipts\\/exhaust\\/indexes\\/dentsu_global_news_sitemap\\/f{64}\\.json/u,
    'runtime custody must reject directories in receipt-file positions'
  );
  fs.rmSync(directoryReceiptLeafPath, { recursive: true, force: true });
} finally {
"""
if test_text.count(anchor) != 1:
    raise SystemExit('directory denominator regression anchor is not unique')
test_file.write_text(test_text.replace(anchor, replacement))
