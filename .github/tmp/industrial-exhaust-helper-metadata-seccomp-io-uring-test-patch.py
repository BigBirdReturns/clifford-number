from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()

anchor = r'''      assert.equal(
        Array.isArray(metadataProof?.entries)
          && metadataProof.entries.every(
            entry => !/^ioctl:\d+$/.test(entry)
          ),
        true,
        `${receiptType} metadata seccomp proof must scope ioctl denial to request codes`
      );
'''
if text.count(anchor) != 1:
    raise SystemExit("io_uring metadata proof test anchor mismatch")

addition = anchor + r'''      assert.deepEqual(
        metadataProof?.entries?.filter(
          entry => /^io_uring_(?:setup|enter|register):\d+$/.test(entry)
        ),
        [
          'io_uring_setup:425',
          'io_uring_enter:426',
          'io_uring_register:427'
        ],
        `${receiptType} metadata seccomp proof must deny io_uring metadata submission`
      );
'''
PATH.write_text(text.replace(anchor, addition))
