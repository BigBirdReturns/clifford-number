from pathlib import Path

path = Path('tools/lib/industrial-exhaust-artifacts.mjs')
text = path.read_text()

constant_old = """const RECEIPT_DIRFD_HELPER_MAX_BUFFER = 64 * 1024 * 1024;
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
"""
constant_new = """const RECEIPT_DIRFD_HELPER_MAX_BUFFER = 64 * 1024 * 1024;
const RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES = 24_000_000;
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
"""
if text.count(constant_old) != 1:
    raise SystemExit(
        f'unexpected helper byte-limit marker count: {text.count(constant_old)}'
    )
text = text.replace(constant_old, constant_new, 1)

start = text.index('function verifyReceiptDirectoryReachability(')
end = text.index('\nfunction decodeReceiptDirfdRetainedBytes', start)
replacement = r'''function expectedReceiptDirectoryDisplays(relativePath, label) {
  const segments = String(relativePath).split('/');
  if (segments.length < 1
    || segments.some(segment => !segment || segment === '.' || segment === '..'
      || segment.includes('\\'))) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  const displays = ['.'];
  const current = [];
  for (const segment of segments.slice(0, -1)) {
    current.push(segment);
    displays.push(current.join('/'));
  }
  return displays;
}

function verifyReceiptDirectoryReachability(
  session,
  chain,
  relativePath,
  label
) {
  const expectedDisplays = expectedReceiptDirectoryDisplays(
    relativePath,
    label
  );
  if (!Array.isArray(chain) || chain.length !== expectedDisplays.length) {
    throw new Error(`${label} returned an incomplete directory chain`);
  }

  const rootDescriptorStats = fs.fstatSync(session.descriptor);
  if (!rootDescriptorStats.isDirectory()
    || !sameReceiptIdentity(rootDescriptorStats, session.identity)) {
    throw new Error(`${label} directory chain changed at .`);
  }

  const normalized = [];
  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    const expectedDisplay = expectedDisplays[index];
    if (!entry || entry.display !== expectedDisplay
      || !['string', 'number', 'bigint'].includes(typeof entry.dev)
      || !['string', 'number', 'bigint'].includes(typeof entry.ino)) {
      throw new Error(`${label} returned an invalid directory-chain entry`);
    }
    const segments = expectedDisplay === '.' ? [] : expectedDisplay.split('/');
    const absolutePath = path.resolve(session.root, ...segments);
    const relative = path.relative(session.root, absolutePath);
    if (expectedDisplay !== '.'
      && (!relative || relative.startsWith(`..${path.sep}`)
        || path.isAbsolute(relative))) {
      throw new Error(`${label} directory chain escapes the repository root`);
    }
    let stats;
    try {
      stats = fs.lstatSync(absolutePath);
    } catch (error) {
      throw new Error(
        `${label} directory chain changed at ${expectedDisplay}: ${error.message}`
      );
    }
    if (!stats.isDirectory() || !sameReceiptIdentityText(stats, entry)) {
      throw new Error(`${label} directory chain changed at ${expectedDisplay}`);
    }
    normalized.push({
      display: expectedDisplay,
      dev: String(entry.dev),
      ino: String(entry.ino)
    });
  }
  return normalized;
}

function readReceiptDescriptorBytes(descriptor, label) {
  const chunks = [];
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let total = 0;
  while (true) {
    const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
    if (count === 0) break;
    total += count;
    if (total > RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES) {
      throw new Error(`${label} exceeds the parent byte limit`);
    }
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return Buffer.concat(chunks, total);
}

function attestVisibleReceipt({
  session,
  relativePath,
  chain,
  expectedIdentity,
  expectedSha256,
  label,
  validateReceipt
}) {
  if (!expectedIdentity || typeof expectedIdentity !== 'object'
    || typeof expectedSha256 !== 'string'
    || !/^[a-f0-9]{64}$/u.test(expectedSha256)) {
    throw new Error(`${label} visible receipt attestation lacks helper identity`);
  }

  const absolutePath = path.resolve(
    session.root,
    ...relativePath.split('/')
  );
  let descriptor = null;
  let failure = null;
  try {
    verifyReceiptDirectoryReachability(
      session,
      chain,
      relativePath,
      `${label} visible preflight`
    );
    descriptor = fs.openSync(
      absolutePath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const openedStats = fs.fstatSync(descriptor);
    const visibleStats = fs.lstatSync(absolutePath);
    if (!openedStats.isFile()
      || openedStats.nlink !== 1
      || !visibleStats.isFile()
      || visibleStats.nlink !== 1
      || !sameReceiptIdentity(openedStats, visibleStats)
      || !sameReceiptIdentityText(openedStats, expectedIdentity)) {
      throw new Error('visible final receipt identity does not match helper proof');
    }

    const retainedBytes = readReceiptDescriptorBytes(descriptor, label);
    const digest = crypto
      .createHash('sha256')
      .update(retainedBytes)
      .digest('hex');
    if (digest !== expectedSha256) {
      throw new Error('visible final receipt bytes do not match helper proof');
    }
    const retainedReceipt = parseReceiptJsonText(
      retainedBytes.toString('utf8'),
      label
    );
    validateReceipt(retainedReceipt);

    const finalStats = fs.fstatSync(descriptor);
    const finalVisibleStats = fs.lstatSync(absolutePath);
    if (!finalStats.isFile()
      || finalStats.nlink !== 1
      || !finalVisibleStats.isFile()
      || finalVisibleStats.nlink !== 1
      || !sameReceiptIdentity(finalStats, openedStats)
      || !sameReceiptIdentity(finalVisibleStats, openedStats)
      || !sameReceiptIdentityText(finalStats, expectedIdentity)) {
      throw new Error('visible final receipt identity changed during attestation');
    }
    verifyReceiptDirectoryReachability(
      session,
      chain,
      relativePath,
      `${label} visible postflight`
    );
  } catch (error) {
    failure = new Error(
      `${label} visible receipt attestation failed: ${error.message}`
    );
  }

  if (descriptor !== null) {
    try {
      fs.closeSync(descriptor);
    } catch (error) {
      failure ??= new Error(
        `${label} visible receipt descriptor close failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;
}

'''
text = text[:start] + replacement + text[end:]

publication_old = """    verifyReceiptDirectoryReachability(
      rootSession,
      publication.chain,
      `${label} publication`
    );
"""
publication_new = """    const publicationChain = verifyReceiptDirectoryReachability(
      rootSession,
      publication.chain,
      relativePath,
      `${label} publication`
    );
"""
if text.count(publication_old) != 1:
    raise SystemExit(
        f'unexpected publication-chain call count: {text.count(publication_old)}'
    )
text = text.replace(publication_old, publication_new, 1)

verification_old = """    if (verification.retained_sha256 !== publication.retained_sha256
      || JSON.stringify(verification.final_identity)
        !== JSON.stringify(publication.final_identity)) {
      throw new Error(`${label} publication identity changed after validation`);
    }
    verifyReceiptDirectoryReachability(
      rootSession,
      verification.chain,
      `${label} validation`
    );
"""
verification_new = """    if (verification.retained_sha256 !== publication.retained_sha256
      || JSON.stringify(verification.final_identity)
        !== JSON.stringify(publication.final_identity)) {
      throw new Error(`${label} publication identity changed after validation`);
    }
    const verificationChain = verifyReceiptDirectoryReachability(
      rootSession,
      verification.chain,
      relativePath,
      `${label} validation`
    );
    if (JSON.stringify(verificationChain) !== JSON.stringify(publicationChain)) {
      throw new Error(`${label} directory chain changed after validation`);
    }
    attestVisibleReceipt({
      session: rootSession,
      relativePath,
      chain: verification.chain,
      expectedIdentity: verification.final_identity,
      expectedSha256: verification.retained_sha256,
      label,
      validateReceipt
    });
"""
if text.count(verification_old) != 1:
    raise SystemExit(
        f'unexpected verification-chain call count: {text.count(verification_old)}'
    )
text = text.replace(verification_old, verification_new, 1)

path.write_text(text)
