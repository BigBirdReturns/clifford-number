from pathlib import Path

path = Path('tools/lib/industrial-exhaust-artifacts.mjs')
text = path.read_text()

import_marker = """import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
"""
import_replacement = """import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
"""
if text.count(import_marker) != 1:
    raise SystemExit(f'unexpected import marker count: {text.count(import_marker)}')
text = text.replace(import_marker, import_replacement, 1)

start_marker = """const RECEIPT_DESCRIPTOR_ROOT = '/proc/self/fd';
"""
end_marker = """
export function indexReceiptPath(rootDir, sourceId, hash) {
"""
start = text.index(start_marker)
end = text.index(end_marker, start)
replacement = r"""const RECEIPT_DIRFD_HELPER_INTERPRETER = '/usr/bin/python3';
const RECEIPT_DIRFD_CONTROL_SYMBOL = Symbol.for(
  'clifford-number.industrial-exhaust.receipt-dirfd-control'
);
const RECEIPT_DIRFD_HELPER_MAX_BUFFER = 64 * 1024 * 1024;
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
import base64
import errno
import hashlib
import json
import os
import secrets
import stat
import sys

MAX_RECEIPT_BYTES = 24_000_000
ROOT_FD = 3
EVENTS = []
FAULT = None
FAULT_USED = False

def identity(stats):
    return {"dev": str(stats.st_dev), "ino": str(stats.st_ino)}

def same_identity(left, right):
    return left.st_dev == right.st_dev and left.st_ino == right.st_ino

def add_event(event_type, **values):
    EVENTS.append({"type": event_type, **values})

def fail(message):
    raise RuntimeError(message)

def validate_component(component):
    if (
        not isinstance(component, str)
        or not component
        or component in (".", "..")
        or "/" in component
        or "\\" in component
    ):
        fail(f"invalid descriptor-relative receipt path component: {component}")

def require_dir_fd_support():
    required = [os.open, os.stat, os.mkdir, os.link, os.unlink]
    missing = [function.__name__ for function in required if function not in os.supports_dir_fd]
    if missing:
        fail(
            "descriptor-relative receipt publication requires dir_fd support for "
            + ", ".join(missing)
        )

def sync_directory(descriptor, label):
    global FAULT_USED
    before = os.fstat(descriptor)
    if not stat.S_ISDIR(before.st_mode):
        fail(f"{label} synchronization failed: descriptor is not a directory")
    if (
        isinstance(FAULT, dict)
        and FAULT.get("type") == "fail_next_directory_sync"
        and not FAULT_USED
    ):
        FAULT_USED = True
        add_event("directory-sync-failure", **identity(before))
        error = OSError(errno.EIO, "simulated directory fsync failure")
        raise RuntimeError(f"{label} synchronization failed: {error}")
    os.fsync(descriptor)
    after = os.fstat(descriptor)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(before, after):
        fail(f"{label} synchronization failed: directory descriptor identity changed")
    add_event("directory-sync", **identity(after))

def write_all(descriptor, data):
    offset = 0
    while offset < len(data):
        written = os.write(descriptor, data[offset:])
        if written <= 0:
            fail("temporary receipt write made no progress")
        offset += written

def read_all(descriptor):
    os.lseek(descriptor, 0, os.SEEK_SET)
    chunks = []
    total = 0
    while True:
        chunk = os.read(descriptor, 1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_RECEIPT_BYTES:
            fail("retained receipt exceeds the helper byte limit")
        chunks.append(chunk)
    return b"".join(chunks)

def open_directory_chain(relative_parent, create):
    segments = [] if relative_parent == "." else relative_parent.split("/")
    for segment in segments:
        validate_component(segment)

    root_descriptor = os.dup(ROOT_FD)
    chain_descriptors = [root_descriptor]
    root_stats = os.fstat(root_descriptor)
    if not stat.S_ISDIR(root_stats.st_mode):
        fail("inherited receipt repository descriptor is not a directory")
    chain = [{"display": ".", **identity(root_stats)}]

    for segment in segments:
        parent_descriptor = chain_descriptors[-1]
        display = segment if len(chain) == 1 else f"{chain[-1]['display']}/{segment}"
        created = False
        try:
            descriptor = os.open(
                segment,
                os.O_RDONLY
                | getattr(os, "O_DIRECTORY", 0)
                | getattr(os, "O_NOFOLLOW", 0),
                dir_fd=parent_descriptor,
            )
        except OSError as error:
            if error.errno in (errno.ELOOP, errno.ENOTDIR):
                fail(f"receipt parent directory contains an unsupported path entry: {display}")
            if error.errno != errno.ENOENT or not create:
                raise
            try:
                os.mkdir(segment, 0o755, dir_fd=parent_descriptor)
                created = True
                add_event("directory-created", display=display)
            except FileExistsError:
                pass
            descriptor = os.open(
                segment,
                os.O_RDONLY
                | getattr(os, "O_DIRECTORY", 0)
                | getattr(os, "O_NOFOLLOW", 0),
                dir_fd=parent_descriptor,
            )

        descriptor_stats = os.fstat(descriptor)
        path_stats = os.stat(
            segment,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISDIR(descriptor_stats.st_mode)
            or not stat.S_ISDIR(path_stats.st_mode)
            or not same_identity(descriptor_stats, path_stats)
        ):
            os.close(descriptor)
            fail(f"receipt parent directory identity changed while opening {display}")

        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        sync_directory(descriptor, f"receipt parent directory {display}")
        sync_directory(parent_descriptor, f"receipt parent directory parent {chain[-2]['display']}")
        if created:
            add_event("directory-created-durable", display=display)

    return chain_descriptors, chain

def inspect_final(parent_descriptor, final_name):
    try:
        stats = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(stats.st_mode):
        fail("receipt contains an unsupported path entry")
    if stats.st_nlink != 1:
        fail("receipt contains a multiply linked receipt file")
    return stats

def open_final(parent_descriptor, final_name):
    descriptor = os.open(
        final_name,
        os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0),
        dir_fd=parent_descriptor,
    )
    descriptor_stats = os.fstat(descriptor)
    path_stats = os.stat(
        final_name,
        dir_fd=parent_descriptor,
        follow_symlinks=False,
    )
    if (
        not stat.S_ISREG(descriptor_stats.st_mode)
        or descriptor_stats.st_nlink != 1
        or not stat.S_ISREG(path_stats.st_mode)
        or path_stats.st_nlink != 1
        or not same_identity(descriptor_stats, path_stats)
    ):
        os.close(descriptor)
        fail("receipt publication identity changed")
    return descriptor, descriptor_stats

def maybe_swap_visible_ancestor():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "swap_visible_ancestor_after_temp_open"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    canonical = FAULT.get("canonical_receipts_path")
    displaced = FAULT.get("displaced_receipts_path")
    external = FAULT.get("external_receipts_path")
    if not all(isinstance(value, str) and value for value in (canonical, displaced, external)):
        fail("invalid visible-ancestor swap fault")
    os.rename(canonical, displaced)
    os.symlink(external, canonical)
    add_event("visible-ancestor-swapped")

def maybe_create_competing_receipt(parent_descriptor, final_name):
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "create_competing_receipt_before_link"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    encoded = FAULT.get("content_base64")
    if not isinstance(encoded, str):
        fail("invalid competing receipt fault")
    content = base64.b64decode(encoded, validate=True)
    descriptor = os.open(
        final_name,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL
        | getattr(os, "O_NOFOLLOW", 0),
        0o600,
        dir_fd=parent_descriptor,
    )
    try:
        write_all(descriptor, content)
        os.fsync(descriptor)
        add_event("file-sync")
    finally:
        os.close(descriptor)
    add_event("competing-receipt-created")

def publish(request):
    relative_path = request.get("relative_path")
    serialized_base64 = request.get("serialized_base64")
    if not isinstance(relative_path, str) or not relative_path:
        fail("receipt path is not canonical")
    if relative_path.startswith("/") or "\\" in relative_path:
        fail("receipt path is not canonical")
    segments = relative_path.split("/")
    if any(not segment or segment in (".", "..") for segment in segments):
        fail("receipt path is not canonical")
    if not isinstance(serialized_base64, str):
        fail("receipt publication lacks serialized bytes")
    serialized = base64.b64decode(serialized_base64, validate=True)
    if len(serialized) > MAX_RECEIPT_BYTES:
        fail("receipt publication exceeds the helper byte limit")

    parent_relative = "/".join(segments[:-1]) or "."
    final_name = segments[-1]
    validate_component(final_name)
    chain_descriptors, chain = open_directory_chain(parent_relative, True)
    parent_descriptor = chain_descriptors[-1]
    temp_name = None
    temp_identity = None
    published = False
    final_descriptor = None
    try:
        final_stats = inspect_final(parent_descriptor, final_name)
        if final_stats is None:
            for _attempt in range(8):
                candidate_name = (
                    f"{final_name}.{os.getpid()}.{secrets.token_hex(16)}.tmp"
                )
                try:
                    temp_descriptor = os.open(
                        candidate_name,
                        os.O_WRONLY
                        | os.O_CREAT
                        | os.O_EXCL
                        | getattr(os, "O_NOFOLLOW", 0),
                        0o600,
                        dir_fd=parent_descriptor,
                    )
                except FileExistsError:
                    continue
                temp_name = candidate_name
                add_event("temporary-open")
                maybe_swap_visible_ancestor()
                try:
                    write_all(temp_descriptor, serialized)
                    os.fsync(temp_descriptor)
                    add_event("file-sync")
                    stats = os.fstat(temp_descriptor)
                    if not stat.S_ISREG(stats.st_mode) or stats.st_nlink != 1:
                        fail("temporary publication is not an exclusive regular file")
                    temp_identity = identity(stats)
                finally:
                    os.close(temp_descriptor)
                    add_event("temporary-close")
                break
            if temp_name is None or temp_identity is None:
                fail("could not allocate an exclusive temporary publication")

            maybe_create_competing_receipt(parent_descriptor, final_name)
            try:
                os.link(
                    temp_name,
                    final_name,
                    src_dir_fd=parent_descriptor,
                    dst_dir_fd=parent_descriptor,
                    follow_symlinks=False,
                )
                published = True
                add_event("publish-link")
            except FileExistsError:
                add_event("publish-link-conflict")

        if temp_name is not None:
            try:
                os.unlink(temp_name, dir_fd=parent_descriptor)
                add_event("temporary-unlink")
            except FileNotFoundError:
                pass

        sync_directory(parent_descriptor, "receipt publication directory")
        final_descriptor, final_stats = open_final(parent_descriptor, final_name)
        if published and identity(final_stats) != temp_identity:
            fail("receipt publication identity changed before validation")
        retained = read_all(final_descriptor)
        final_after = os.fstat(final_descriptor)
        path_after = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(final_after.st_mode)
            or final_after.st_nlink != 1
            or not stat.S_ISREG(path_after.st_mode)
            or path_after.st_nlink != 1
            or not same_identity(final_after, path_after)
            or not same_identity(final_after, final_stats)
        ):
            fail("receipt publication identity changed during read")
        return {
            "published": published,
            "retained_base64": base64.b64encode(retained).decode("ascii"),
            "retained_sha256": hashlib.sha256(retained).hexdigest(),
            "final_identity": identity(final_after),
            "chain": chain,
        }
    finally:
        if final_descriptor is not None:
            os.close(final_descriptor)
        if temp_name is not None:
            try:
                os.unlink(temp_name, dir_fd=parent_descriptor)
            except FileNotFoundError:
                pass
        for descriptor in reversed(chain_descriptors):
            os.close(descriptor)

def verify(request):
    relative_path = request.get("relative_path")
    expected_identity = request.get("expected_identity")
    expected_sha256 = request.get("expected_sha256")
    if not isinstance(relative_path, str) or not relative_path:
        fail("receipt verification path is not canonical")
    segments = relative_path.split("/")
    if any(not segment or segment in (".", "..") for segment in segments):
        fail("receipt verification path is not canonical")
    parent_relative = "/".join(segments[:-1]) or "."
    final_name = segments[-1]
    validate_component(final_name)
    chain_descriptors, chain = open_directory_chain(parent_relative, False)
    parent_descriptor = chain_descriptors[-1]
    final_descriptor = None
    try:
        final_descriptor, final_stats = open_final(parent_descriptor, final_name)
        retained = read_all(final_descriptor)
        if identity(final_stats) != expected_identity:
            fail("receipt publication identity changed after validation")
        digest = hashlib.sha256(retained).hexdigest()
        if digest != expected_sha256:
            fail("receipt publication bytes changed after validation")
        sync_directory(parent_descriptor, "receipt verification directory")
        final_after = os.fstat(final_descriptor)
        path_after = os.stat(
            final_name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not same_identity(final_after, final_stats)
            or not same_identity(path_after, final_stats)
            or final_after.st_nlink != 1
            or path_after.st_nlink != 1
        ):
            fail("receipt publication identity changed during final verification")
        return {
            "retained_sha256": digest,
            "final_identity": identity(final_after),
            "chain": chain,
        }
    finally:
        if final_descriptor is not None:
            os.close(final_descriptor)
        for descriptor in reversed(chain_descriptors):
            os.close(descriptor)

def main():
    global FAULT
    require_dir_fd_support()
    request = json.load(sys.stdin)
    FAULT = request.get("fault")
    action = request.get("action")
    if action == "publish":
        result = publish(request)
    elif action == "verify":
        result = verify(request)
    else:
        fail("unsupported receipt dirfd helper action")
    sys.stdout.write(json.dumps({"ok": True, "events": EVENTS, **result}))

try:
    main()
except BaseException as error:
    sys.stdout.write(json.dumps({
        "ok": False,
        "error": str(error),
        "events": EVENTS,
    }))
    sys.exit(1)
`;

function receiptDirfdTestControl() {
  if (process.env.NODE_ENV !== 'test') return null;
  const control = globalThis[RECEIPT_DIRFD_CONTROL_SYMBOL];
  return control && typeof control === 'object' ? control : null;
}

function recordReceiptDirfdEvents(control, events) {
  if (!control || !Array.isArray(control.events) || !Array.isArray(events)) return;
  control.events.push(...events.map(event => structuredClone(event)));
}

function runReceiptDirfdHelper({
  rootDescriptor,
  label,
  request
}) {
  const control = receiptDirfdTestControl();
  const interpreter = typeof control?.interpreter_path === 'string'
    ? control.interpreter_path
    : RECEIPT_DIRFD_HELPER_INTERPRETER;
  const helperRequest = {
    ...request,
    fault: control?.fault ?? null
  };
  const result = spawnSync(
    interpreter,
    ['-I', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
    {
      input: JSON.stringify(helperRequest),
      encoding: 'utf8',
      maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe', rootDescriptor],
      env: {
        PATH: '/usr/bin:/bin',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        PYTHONIOENCODING: 'utf-8'
      }
    }
  );
  if (result.error) {
    throw new Error(`${label} dirfd helper launch failed: ${result.error.message}`);
  }

  let response;
  try {
    response = JSON.parse(String(result.stdout ?? ''));
  } catch (error) {
    const stderr = String(result.stderr ?? '').trim();
    throw new Error(
      `${label} dirfd helper returned invalid JSON: ${error.message}`
        + (stderr ? `; stderr: ${stderr}` : '')
    );
  }
  recordReceiptDirfdEvents(control, response.events);
  if (response.ok !== true) {
    throw new Error(
      `${label} dirfd helper failed: ${response.error ?? 'unknown helper failure'}`
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${label} dirfd helper exited with status ${result.status}`
    );
  }
  return response;
}

function openReceiptRootDescriptor(rootDir, label) {
  const rootCustody = inspectReceiptRoot(rootDir);
  let descriptor;
  try {
    descriptor = fs.openSync(
      rootCustody.root,
      fs.constants.O_RDONLY
        | (fs.constants.O_DIRECTORY ?? 0)
        | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const descriptorStats = fs.fstatSync(descriptor);
    const pathStats = fs.lstatSync(rootCustody.root);
    if (!descriptorStats.isDirectory()
      || !pathStats.isDirectory()
      || !sameReceiptIdentity(descriptorStats, rootCustody.identity)
      || !sameReceiptIdentity(descriptorStats, pathStats)) {
      throw new Error('root identity changed during descriptor admission');
    }
    return {
      root: rootCustody.root,
      descriptor,
      identity: {
        dev: descriptorStats.dev,
        ino: descriptorStats.ino
      }
    };
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(`${label} root descriptor admission failed: ${error.message}`);
  }
}

function closeReceiptRootDescriptor(session, label) {
  if (!session || !Number.isInteger(session.descriptor)) return null;
  try {
    fs.closeSync(session.descriptor);
    session.descriptor = null;
    return null;
  } catch (error) {
    return new Error(`${label} root descriptor close failed: ${error.message}`);
  }
}

function sameReceiptIdentityText(stats, identity) {
  return String(stats.dev) === String(identity?.dev)
    && String(stats.ino) === String(identity?.ino);
}

function verifyReceiptDirectoryReachability(session, chain, label) {
  if (!Array.isArray(chain) || chain.length === 0 || chain[0]?.display !== '.') {
    throw new Error(`${label} returned an invalid directory chain`);
  }
  const rootDescriptorStats = fs.fstatSync(session.descriptor);
  if (!rootDescriptorStats.isDirectory()
    || !sameReceiptIdentity(rootDescriptorStats, session.identity)) {
    throw new Error(`${label} directory chain changed at .`);
  }

  for (const entry of chain) {
    if (!entry || typeof entry.display !== 'string') {
      throw new Error(`${label} returned an invalid directory-chain entry`);
    }
    const segments = entry.display === '.' ? [] : entry.display.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..'
      || segment.includes('\\'))) {
      throw new Error(`${label} returned a noncanonical directory-chain entry`);
    }
    const absolutePath = path.resolve(session.root, ...segments);
    const relative = path.relative(session.root, absolutePath);
    if (entry.display !== '.'
      && (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))) {
      throw new Error(`${label} directory chain escapes the repository root`);
    }
    let stats;
    try {
      stats = fs.lstatSync(absolutePath);
    } catch (error) {
      throw new Error(
        `${label} directory chain changed at ${entry.display}: ${error.message}`
      );
    }
    if (!stats.isDirectory() || !sameReceiptIdentityText(stats, entry)) {
      throw new Error(`${label} directory chain changed at ${entry.display}`);
    }
  }
}

function decodeReceiptDirfdRetainedBytes(response, label) {
  if (typeof response.retained_base64 !== 'string'
    || typeof response.retained_sha256 !== 'string') {
    throw new Error(`${label} dirfd helper omitted retained receipt bytes`);
  }
  const compact = response.retained_base64.replace(/\s+/gu, '');
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.toString('base64').replace(/=+$/u, '')
    !== compact.replace(/=+$/u, '')) {
    throw new Error(`${label} dirfd helper returned invalid base64`);
  }
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== response.retained_sha256) {
    throw new Error(`${label} dirfd helper returned inconsistent retained bytes`);
  }
  return bytes;
}

function publishReceiptJson({
  rootDir,
  relativePath,
  receipt,
  label,
  validateReceipt
}) {
  if (typeof relativePath !== 'string' || !relativePath
    || relativePath.startsWith('/') || relativePath.includes('\\')
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith('../')) {
    throw new Error(`${label} is not a canonical repository-relative path`);
  }
  if (typeof validateReceipt !== 'function') {
    throw new Error(`${label} requires an anchored validation callback`);
  }

  const rootSession = openReceiptRootDescriptor(rootDir, label);
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  const absolutePath = path.resolve(
    rootSession.root,
    ...relativePath.split('/')
  );
  let failure = null;
  try {
    const publication = runReceiptDirfdHelper({
      rootDescriptor: rootSession.descriptor,
      label,
      request: {
        action: 'publish',
        relative_path: relativePath,
        serialized_base64: Buffer.from(serialized, 'utf8').toString('base64')
      }
    });
    verifyReceiptDirectoryReachability(
      rootSession,
      publication.chain,
      `${label} publication`
    );
    const retainedBytes = decodeReceiptDirfdRetainedBytes(publication, label);
    const retainedReceipt = parseReceiptJsonText(
      retainedBytes.toString('utf8'),
      label
    );
    validateReceipt(retainedReceipt);

    const verification = runReceiptDirfdHelper({
      rootDescriptor: rootSession.descriptor,
      label,
      request: {
        action: 'verify',
        relative_path: relativePath,
        expected_identity: publication.final_identity,
        expected_sha256: publication.retained_sha256
      }
    });
    if (verification.retained_sha256 !== publication.retained_sha256
      || JSON.stringify(verification.final_identity)
        !== JSON.stringify(publication.final_identity)) {
      throw new Error(`${label} publication identity changed after validation`);
    }
    verifyReceiptDirectoryReachability(
      rootSession,
      verification.chain,
      `${label} validation`
    );
  } catch (error) {
    failure = error;
  }

  const closeFailure = closeReceiptRootDescriptor(rootSession, label);
  failure ??= closeFailure;
  if (failure) throw failure;
  return absolutePath;
}
"""
text = text[:start] + replacement + '\n' + text[end:]

path.write_text(text)
