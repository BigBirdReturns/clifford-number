from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

root_anchor = '''    root_stats = os.fstat(ROOT_FD)
    if stat.S_ISDIR(root_stats.st_mode):
        require_openat2_support(ROOT_FD)
        restrict_filesystem_writes(ROOT_FD, "repository-root")
    elif not stat.S_ISCHR(root_stats.st_mode):
        fail("runtime closure probe descriptor is not a harmless character device")
'''
if text.count(root_anchor) != 1:
    raise SystemExit("runtime-probe root confinement anchor mismatch")
root_block = '''    root_stats = os.fstat(ROOT_FD)
    if not stat.S_ISDIR(root_stats.st_mode):
        fail("descriptor-relative receipt helper authority root is not a directory")
    require_openat2_support(ROOT_FD)
    restrict_filesystem_writes(ROOT_FD, "repository-root")
'''
text = text.replace(root_anchor, root_block)

signature_anchor = '''function parseReceiptRuntimeProbeResult(result, label, interpreterLease) {
'''
if text.count(signature_anchor) != 1:
    raise SystemExit("runtime-probe parser signature anchor mismatch")
text = text.replace(
    signature_anchor,
    '''function parseReceiptRuntimeProbeResult(
  result,
  label,
  interpreterLease,
  probeRootIdentity
) {
'''
)

proof_anchor = '''  const landlockEvents = Array.isArray(response.events)
    ? response.events.filter(event => event?.type === 'landlock-supported')
    : [];
  if (!eventTypes.has('runtime-confined')
    || landlockEvents.length !== 1
    || Number(landlockEvents[0]?.abi) < 3
    || interpreterCloseEvents.length !== 1
'''
if text.count(proof_anchor) != 1:
    raise SystemExit("runtime-probe proof anchor mismatch")
proof_block = '''  const landlockEvents = Array.isArray(response.events)
    ? response.events.filter(event => event?.type === 'landlock-supported')
    : [];
  const rootConfinementEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'filesystem-write-confined'
        && event?.scope === 'repository-root'
    )
    : [];
  const mountBoundaryEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'mount-boundary-supported'
    )
    : [];
  const rootConfinement = rootConfinementEvents[0];
  const mountBoundary = mountBoundaryEvents[0];
  if (!eventTypes.has('runtime-confined')
    || landlockEvents.length !== 1
    || Number(landlockEvents[0]?.abi) < 3
    || rootConfinementEvents.length !== 1
    || Number(rootConfinement?.abi) < 3
    || String(rootConfinement?.dev) !== String(probeRootIdentity?.dev)
    || String(rootConfinement?.ino) !== String(probeRootIdentity?.ino)
    || mountBoundaryEvents.length !== 1
    || mountBoundary?.syscall !== 'openat2'
    || Number(mountBoundary?.resolve) !== 0x0f
    || String(mountBoundary?.dev) !== String(probeRootIdentity?.dev)
    || String(mountBoundary?.ino) !== String(probeRootIdentity?.ino)
    || interpreterCloseEvents.length !== 1
'''
text = text.replace(proof_anchor, proof_block)

function_start = text.find(
    'function probeReceiptRuntimeClosure({ interpreterLease, label, control }) {'
)
function_end = text.find('\nfunction runReceiptDirfdHelper({', function_start)
if function_start < 0 or function_end < 0:
    raise SystemExit("runtime-probe function boundary mismatch")

replacement = r'''function probeReceiptRuntimeClosure({ interpreterLease, label, control }) {
  let probeRootDescriptor = null;
  let probeRootIdentity = null;
  let workingDirectory = null;
  let result = null;
  let failure = null;
  try {
    workingDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'industrial-exhaust-receipt-runtime-probe-')
    );
    fs.chmodSync(workingDirectory, 0o700);
    const before = fs.lstatSync(workingDirectory);
    probeRootDescriptor = fs.openSync(
      workingDirectory,
      fs.constants.O_RDONLY
        | (fs.constants.O_DIRECTORY ?? 0)
        | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const opened = fs.fstatSync(probeRootDescriptor);
    const admittedPath = fs.lstatSync(workingDirectory);
    const admittedMode = opened.mode & 0o777;
    if (!before.isDirectory()
      || !opened.isDirectory()
      || !admittedPath.isDirectory()
      || !sameReceiptIdentity(before, opened)
      || !sameReceiptIdentity(opened, admittedPath)
      || admittedMode !== 0o700) {
      throw new Error(
        `${label} runtime closure probe root admission failed`
      );
    }
    probeRootIdentity = {
      dev: opened.dev,
      ino: opened.ino
    };

    result = spawnSync(
      RECEIPT_DIRFD_INTERPRETER_EXEC_PATH,
      ['-I', '-S', '-B', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify({
          action: 'runtime_probe',
          fault: control?.runtime_probe_fault ?? null
        }),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio: [
          'pipe',
          'pipe',
          'pipe',
          probeRootDescriptor,
          interpreterLease.descriptor
        ],
        env: {
          PATH: '/usr/bin:/bin',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          PYTHONIOENCODING: 'utf-8',
          HOME: workingDirectory,
          TMPDIR: workingDirectory
        }
      }
    );

    const descriptorAfter = fs.fstatSync(probeRootDescriptor);
    const pathAfter = fs.lstatSync(workingDirectory);
    if (!descriptorAfter.isDirectory()
      || !pathAfter.isDirectory()
      || !sameReceiptIdentity(descriptorAfter, probeRootIdentity)
      || !sameReceiptIdentity(pathAfter, probeRootIdentity)
      || (descriptorAfter.mode & 0o777) !== 0o700
      || (pathAfter.mode & 0o777) !== 0o700) {
      throw new Error(
        `${label} runtime closure probe root changed while the helper executed`
      );
    }
    verifyReceiptInterpreterLease(interpreterLease, label);
  } catch (error) {
    failure = error;
  }

  if (probeRootDescriptor !== null) {
    try {
      fs.closeSync(probeRootDescriptor);
    } catch (error) {
      failure ??= new Error(
        `${label} runtime closure probe root descriptor close failed: ${error.message}`
      );
    }
  }
  if (workingDirectory !== null) {
    try {
      fs.rmSync(workingDirectory, { recursive: true, force: true });
    } catch (error) {
      failure ??= new Error(
        `${label} runtime closure probe cleanup failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;

  const response = parseReceiptRuntimeProbeResult(
    result,
    label,
    interpreterLease,
    probeRootIdentity
  );
  recordReceiptDirfdEvents(control, response.events);
  const injected = Array.isArray(control?.runtime_dependency_paths)
    ? control.runtime_dependency_paths
    : [];
  const runtimeFiles = normalizeReceiptRuntimeFiles(
    [...(response.runtime_files ?? []), ...injected],
    label
  );
  const dependencies = [];
  try {
    for (const runtimePath of runtimeFiles) {
      if (runtimePath === interpreterLease.path) continue;
      dependencies.push(
        openReceiptRuntimeDependencyLease(runtimePath, label)
      );
    }
  } catch (error) {
    closeReceiptRuntimeClosureLease({ dependencies }, label);
    throw error;
  }
  if (control && Array.isArray(control.events)) {
    control.events.push({
      type: 'runtime-closure-leased',
      file_count: runtimeFiles.length
    });
  }
  return { runtimeFiles, dependencies };
}
'''

text = text[:function_start] + replacement + text[function_end:]
PATH.write_text(text)
