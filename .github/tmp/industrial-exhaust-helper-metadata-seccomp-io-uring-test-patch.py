from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()

anchor = """      assert.equal(
        Array.isArray(metadataProof?.entries)
          && metadataProof.entries.every(
            entry => !/^ioctl:\\d+$/.test(entry)
          ),
        true,
        `${receiptType} metadata seccomp proof must scope ioctl denial to request codes`
      );
"""
replacement = """      assert.equal(
        Array.isArray(metadataProof?.entries)
          && metadataProof.entries.every(
            entry => !/^ioctl:\\d+$/.test(entry)
          ),
        true,
        `${receiptType} metadata seccomp proof must scope ioctl denial to request codes`
      );
      assert.deepEqual(
        metadataProof?.entries.filter(
          entry => entry.startsWith('io_uring_')
        ),
        [
          'io_uring_setup:425',
          'io_uring_enter:426',
          'io_uring_register:427'
        ],
        `${receiptType} metadata seccomp proof must block io_uring`
      );
"""
if text.count(anchor) != 1:
    raise SystemExit("io_uring metadata review test anchor mismatch")
PATH.write_text(text.replace(anchor, replacement))
