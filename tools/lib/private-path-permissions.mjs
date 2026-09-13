import assert from 'node:assert/strict';

// Node exposes synthesized POSIX mode bits on Windows; they do not describe
// NTFS ACLs and remain non-zero after chmod. Path confinement, symlink refusal,
// exclusive creation, and inherited ACLs remain active there. POSIX runners
// additionally enforce the requested 0600/0700 group/world boundary.
export const POSIX_MODE_BITS_ENFORCEABLE = process.platform !== 'win32';

export function assertNoGroupOrWorldMode(stat, message) {
  assert.ok(stat && Number.isInteger(stat.mode), 'filesystem stat with numeric mode is required');
  if (POSIX_MODE_BITS_ENFORCEABLE) assert.equal(stat.mode & 0o077, 0, message);
}
