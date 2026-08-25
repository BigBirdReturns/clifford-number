from pathlib import Path

PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")
text = PATH.read_text()

anchor = """      assert.equal(
        control.events.some(
          event => event.type === 'filesystem-metadata-confined'
            && event.policy === 'filesystem-metadata-v1'
        ),
        true,
        `${receiptType} helper must prove filesystem metadata syscall confinement`
      );
"""
replacement = """      const metadataProof = control.events.find(
        event => event.type === 'filesystem-metadata-confined'
          && event.policy === 'filesystem-metadata-v1'
      );
      assert.equal(
        Boolean(metadataProof),
        true,
        `${receiptType} helper must prove filesystem metadata syscall confinement`
      );
      assert.equal(
        Array.isArray(metadataProof?.entries)
          && metadataProof.entries.some(
            entry => /^ioctl:\\d+$/.test(entry)
          ),
        true,
        `${receiptType} metadata seccomp proof must deny ioctl`
      );
      assert.equal(
        metadataProof?.architecture === 'x86_64'
          ? Number(metadataProof?.rejected_syscall_mask) === 0x40000000
          : Number(metadataProof?.rejected_syscall_mask) === 0,
        true,
        `${receiptType} metadata seccomp proof must bind the alternate syscall namespace`
      );
      assert.equal(
        metadataProof?.architecture === 'x86_64'
          ? Number(metadataProof?.audit_arch) === 0xC000003E
          : metadataProof?.architecture === 'aarch64'
            && Number(metadataProof?.audit_arch) === 0xC00000B7,
        true,
        `${receiptType} metadata seccomp proof must bind the Linux audit architecture`
      );
"""
if text.count(anchor) != 1:
    raise SystemExit("metadata review test anchor mismatch")
PATH.write_text(text.replace(anchor, replacement))
