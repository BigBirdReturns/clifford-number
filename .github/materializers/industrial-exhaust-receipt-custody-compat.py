#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def insert_before(text: str, anchor: str, addition: str, label: str) -> str:
    return replace_once(text, anchor, addition + anchor, label)


root = pathlib.Path(sys.argv[1]).resolve()
source_path = root / "tools/lib/industrial-exhaust-artifacts.mjs"
test_path = root / "test/industrial-exhaust-artifacts.test.js"
source = source_path.read_text(encoding="utf-8")
test = test_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    r'''      if (receipt.index_sha256 !== indexSha256 || sha256(receipt.body) !== indexSha256) {
        throw new Error(`index receipt ${expectedPath} body bytes do not match index_sha256`);
      }
      if (receipt.body_encoding !== 'utf-8' || typeof receipt.body !== 'string') {
        throw new Error(`index receipt ${expectedPath} must retain a UTF-8 body`);
      }
''',
    r'''      if (receipt.index_sha256 !== indexSha256) {
        throw new Error(`index receipt ${expectedPath} does not match index_sha256`);
      }
      if (receipt.body_encoding !== 'utf-8' || typeof receipt.body !== 'string') {
        throw new Error(`index receipt ${expectedPath} must retain a UTF-8 body`);
      }
      let custodyMode;
      if (receipt.body_sha256 === undefined) {
        custodyMode = 'legacy_anchor_bound';
      } else {
        const storedBodySha256 = assertSha256Digest(
          receipt.body_sha256,
          `index receipt ${expectedPath} body_sha256`
        );
        if (storedBodySha256 !== indexSha256 || sha256(receipt.body) !== storedBodySha256) {
          throw new Error(`index receipt ${expectedPath} body bytes do not match body_sha256`);
        }
        custodyMode = 'byte_verified';
      }
''',
    "index receipt custody tier",
)

source = replace_once(
    source,
    r'''      cached = {
        receipt,
        anchors: discoveryAnchorKeys(receipt.body, receipt.index_url)
      };
''',
    r'''      cached = {
        receipt,
        anchors: discoveryAnchorKeys(receipt.body, receipt.index_url),
        custody_mode: custodyMode
      };
''',
    "index receipt custody cache",
)

source = replace_once(
    source,
    r'''  return {
    discovery_record_count: discoveryRecords.length,
    artifact_record_count: artifacts.length,
    index_receipt_count: indexReceipts.size,
    artifact_receipt_count: artifactReceipts.size
  };
''',
    r'''  const indexCustodyModes = [...indexReceipts.values()].map(value => value.custody_mode);
  return {
    discovery_record_count: discoveryRecords.length,
    artifact_record_count: artifacts.length,
    index_receipt_count: indexReceipts.size,
    byte_verified_index_receipt_count: indexCustodyModes.filter(mode => mode === 'byte_verified').length,
    legacy_anchor_bound_index_receipt_count: indexCustodyModes.filter(mode => mode === 'legacy_anchor_bound').length,
    artifact_receipt_count: artifactReceipts.size,
    byte_verified_artifact_receipt_count: artifactReceipts.size
  };
''',
    "receipt custody counters",
)

source = replace_once(
    source,
    r'''      index_sha256: parsedIndex.index_sha256,
      index_title: parsedIndex.index_title,
''',
    r'''      index_sha256: parsedIndex.index_sha256,
      body_sha256: sha256(html),
      index_title: parsedIndex.index_title,
''',
    "prospective index body digest",
)

source_path.write_text(source, encoding="utf-8")

test = replace_once(
    test,
    r'''  assert.equal(
    validateArtifactRevisionLineage([forgedReceiptBinding]),
    [forgedReceiptBinding],
    'semantic lineage validation alone does not authenticate the transport receipt'
  );
''',
    r'''  assert.deepEqual(
    validateArtifactRevisionLineage([forgedReceiptBinding]),
    [forgedReceiptBinding],
    'semantic lineage validation alone does not authenticate the transport receipt'
  );
''',
    "semantic lineage acceptance assertion",
)

test = replace_once(
    test,
    r'''    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      artifact_receipt_count: 1
    }
''',
    r'''    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      byte_verified_index_receipt_count: 1,
      legacy_anchor_bound_index_receipt_count: 0,
      artifact_receipt_count: 1,
      byte_verified_artifact_receipt_count: 1
    }
''',
    "prospective receipt custody expectation",
)

index_custody_tests = r'''  const custodyIndexReceiptAbsolutePath = path.join(receiptCustodyRoot, custodyIndexReceiptPath);
  const originalCustodyIndexReceipt = fs.readFileSync(custodyIndexReceiptAbsolutePath, 'utf8');
  const tamperedCustodyIndexReceipt = JSON.parse(originalCustodyIndexReceipt);
  tamperedCustodyIndexReceipt.body = `${tamperedCustodyIndexReceipt.body}tampered`;
  fs.writeFileSync(custodyIndexReceiptAbsolutePath, `${JSON.stringify(tamperedCustodyIndexReceipt, null, 2)}\n`);
  assert.throws(
    () => validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: custodyArtifacts
    }),
    /body bytes do not match body_sha256/u
  );
  fs.writeFileSync(custodyIndexReceiptAbsolutePath, originalCustodyIndexReceipt);

  const legacyCustodyIndexReceipt = JSON.parse(originalCustodyIndexReceipt);
  delete legacyCustodyIndexReceipt.body_sha256;
  fs.writeFileSync(custodyIndexReceiptAbsolutePath, `${JSON.stringify(legacyCustodyIndexReceipt, null, 2)}\n`);
  assert.deepEqual(
    validateIndustrialExhaustReceiptCustody({
      rootDir: receiptCustodyRoot,
      discoveryRecords: custodyDiscoveryRecords,
      artifacts: custodyArtifacts
    }),
    {
      discovery_record_count: 1,
      artifact_record_count: 1,
      index_receipt_count: 1,
      byte_verified_index_receipt_count: 0,
      legacy_anchor_bound_index_receipt_count: 1,
      artifact_receipt_count: 1,
      byte_verified_artifact_receipt_count: 1
    }
  );
  fs.writeFileSync(custodyIndexReceiptAbsolutePath, originalCustodyIndexReceipt);

'''
test = insert_before(
    test,
    "  const forgedBodySha256 = '0'.repeat(64);",
    index_custody_tests,
    "index receipt two-tier regressions",
)

test = replace_once(
    test,
    r'''assert.ok(canonicalReceiptCustody.index_receipt_count > 0);
assert.ok(canonicalReceiptCustody.artifact_receipt_count > 0);''',
    r'''assert.ok(canonicalReceiptCustody.index_receipt_count > 0);
assert.equal(
  canonicalReceiptCustody.byte_verified_index_receipt_count
    + canonicalReceiptCustody.legacy_anchor_bound_index_receipt_count,
  canonicalReceiptCustody.index_receipt_count
);
assert.ok(canonicalReceiptCustody.legacy_anchor_bound_index_receipt_count > 0);
assert.ok(canonicalReceiptCustody.artifact_receipt_count > 0);
assert.equal(
  canonicalReceiptCustody.byte_verified_artifact_receipt_count,
  canonicalReceiptCustody.artifact_receipt_count
);''',
    "canonical two-tier custody audit",
)

test_path.write_text(test, encoding="utf-8")
