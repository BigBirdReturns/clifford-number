from pathlib import Path

path = Path('tools/lib/industrial-exhaust-artifacts.mjs')
text = path.read_text()

constant_marker = "const RECEIPT_DIRFD_INTERPRETER_MAX_BYTES = 64 * 1024 * 1024;\n"
constant_replacement = constant_marker + """const RECEIPT_DIRFD_RUNTIME_FILE_MAX_BYTES = 64 * 1024 * 1024;
const RECEIPT_DIRFD_RUNTIME_CLOSURE_MAX_FILES = 256;
"""
if text.count(constant_marker) != 1:
    raise SystemExit(f'unexpected runtime constant marker count: {text.count(constant_marker)}')
text = text.replace(constant_marker, constant_replacement, 1)

python_marker = """def confine_runtime():
"""
python_replacement = r'''def runtime_file_paths():
    paths = set()
    for module in tuple(sys.modules.values()):
        for attribute in ("__file__", "__cached__"):
            value = getattr(module, attribute, None)
            if not isinstance(value, str) or not value or not os.path.isabs(value):
                continue
            canonical = os.path.realpath(value)
            if os.path.exists(canonical):
                paths.add(canonical)
    try:
        with open("/proc/self/maps", "r", encoding="utf-8") as mappings:
            for line in mappings:
                fields = line.rstrip("\n").split(None, 5)
                if len(fields) != 6 or not fields[5].startswith("/"):
                    continue
                candidate = fields[5]
                if candidate.endswith(" (deleted)"):
                    fail(f"descriptor-relative receipt helper mapped a deleted runtime file: {candidate}")
                canonical = os.path.realpath(candidate)
                if os.path.exists(canonical):
                    paths.add(canonical)
    except OSError as error:
        fail(f"descriptor-relative receipt helper runtime closure inspection failed: {error}")
    return sorted(paths)

def confine_runtime():
'''
if text.count(python_marker) != 1:
    raise SystemExit(f'unexpected Python confinement marker count: {text.count(python_marker)}')
text = text.replace(python_marker, python_replacement, 1)

main_marker = r'''def main():
    global FAULT
    require_dir_fd_support()
    confine_runtime()
    request = json.load(sys.stdin)
    FAULT = request.get("fault")
    maybe_probe_fork_denial()
    action = request.get("action")
    if action == "publish":
        result = publish(request)
    elif action == "verify":
        result = verify(request)
    else:
        fail("unsupported receipt dirfd helper action")
    sys.stdout.write(json.dumps({"ok": True, "events": EVENTS, **result}))
'''
main_replacement = r'''def main():
    global FAULT
    require_dir_fd_support()
    confine_runtime()
    request = json.load(sys.stdin)
    FAULT = request.get("fault")
    maybe_probe_fork_denial()
    action = request.get("action")
    if action == "runtime_probe":
        result = {}
    elif action == "publish":
        result = publish(request)
    elif action == "verify":
        result = verify(request)
    else:
        fail("unsupported receipt dirfd helper action")
    result["runtime_files"] = runtime_file_paths()
    sys.stdout.write(json.dumps({"ok": True, "events": EVENTS, **result}))
'''
if text.count(main_marker) != 1:
    raise SystemExit(f'unexpected helper main marker count: {text.count(main_marker)}')
text = text.replace(main_marker, main_replacement, 1)

run_start = text.index("function runReceiptDirfdHelper({\n")
run_end = text.index("\nfunction openReceiptRootDescriptor", run_start)

runtime_helpers = r'''function receiptRuntimeDependencyPathIsTrusted(canonicalPath) {
  return ['/usr', '/lib', '/lib64'].some(root => {
    const relative = path.relative(root, canonicalPath);
    return Boolean(relative)
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative);
  });
}

function hashReceiptRuntimeFileDescriptor(descriptor, size, label) {
  if (!Number.isSafeInteger(size) || size < 1
    || size > RECEIPT_DIRFD_RUNTIME_FILE_MAX_BYTES) {
    throw new Error(`${label} has an unsupported runtime-file size`);
  }
  const digest = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let offset = 0;
  while (offset < size) {
    const count = fs.readSync(
      descriptor,
      buffer,
      0,
      Math.min(buffer.length, size - offset),
      offset
    );
    if (count <= 0) {
      throw new Error(`${label} runtime-file hash made no progress`);
    }
    digest.update(buffer.subarray(0, count));
    offset += count;
  }
  return digest.digest('hex');
}

function normalizeReceiptRuntimeFiles(files, label) {
  if (!Array.isArray(files)
    || files.length < 1
    || files.length > RECEIPT_DIRFD_RUNTIME_CLOSURE_MAX_FILES) {
    throw new Error(`${label} returned an invalid runtime closure`);
  }
  const normalized = [];
  const seen = new Set();
  for (const value of files) {
    if (typeof value !== 'string' || !path.isAbsolute(value)) {
      throw new Error(`${label} returned a nonabsolute runtime dependency`);
    }
    const canonicalPath = fs.realpathSync.native(value);
    if (canonicalPath !== value) {
      throw new Error(`${label} returned a noncanonical runtime dependency`);
    }
    if (!seen.has(canonicalPath)) {
      seen.add(canonicalPath);
      normalized.push(canonicalPath);
    }
  }
  normalized.sort();
  return normalized;
}

function openReceiptRuntimeDependencyLease(runtimePath, label) {
  let descriptor = null;
  try {
    const canonicalPath = fs.realpathSync.native(runtimePath);
    if (canonicalPath !== runtimePath
      || !receiptRuntimeDependencyPathIsTrusted(canonicalPath)) {
      throw new Error('runtime dependency is outside the trusted system roots');
    }

    let current = path.parse(canonicalPath).root;
    const parentSegments = path.relative(
      current,
      path.dirname(canonicalPath)
    ).split(path.sep).filter(Boolean);
    for (const segment of parentSegments) {
      current = path.join(current, segment);
      const stats = fs.lstatSync(current);
      if (!stats.isDirectory() || !receiptInterpreterPathEntryIsTrusted(stats)) {
        throw new Error(`runtime dependency parent is not root-owned and immutable: ${current}`);
      }
    }

    const before = fs.lstatSync(canonicalPath);
    if (!before.isFile() || !receiptInterpreterPathEntryIsTrusted(before)) {
      throw new Error('runtime dependency is not a root-owned immutable file');
    }
    descriptor = fs.openSync(
      canonicalPath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const opened = fs.fstatSync(descriptor);
    const after = fs.lstatSync(canonicalPath);
    if (!opened.isFile()
      || !sameReceiptIdentity(opened, before)
      || !sameReceiptIdentity(opened, after)
      || opened.size !== before.size
      || opened.size !== after.size
      || opened.mode !== before.mode
      || opened.uid !== before.uid
      || !receiptInterpreterPathEntryIsTrusted(opened)) {
      throw new Error('runtime dependency identity changed during lease admission');
    }
    const sha256 = hashReceiptRuntimeFileDescriptor(
      descriptor,
      opened.size,
      label
    );
    const finalStats = fs.fstatSync(descriptor);
    if (!sameReceiptIdentity(finalStats, opened)
      || finalStats.size !== opened.size
      || finalStats.mode !== opened.mode
      || finalStats.uid !== opened.uid) {
      throw new Error('runtime dependency identity changed during content lease');
    }
    return {
      path: canonicalPath,
      descriptor,
      identity: {
        dev: opened.dev,
        ino: opened.ino,
        size: opened.size,
        mode: opened.mode,
        uid: opened.uid
      },
      sha256
    };
  } catch (error) {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch {}
    }
    throw new Error(
      `${label} dirfd helper runtime dependency lease failed: ${error.message}`
    );
  }
}

function verifyReceiptRuntimeDependencyLease(lease, label) {
  try {
    const descriptorStats = fs.fstatSync(lease.descriptor);
    const pathStats = fs.lstatSync(lease.path);
    if (!descriptorStats.isFile()
      || !pathStats.isFile()
      || !sameReceiptIdentity(descriptorStats, lease.identity)
      || !sameReceiptIdentity(pathStats, lease.identity)
      || descriptorStats.size !== lease.identity.size
      || pathStats.size !== lease.identity.size
      || descriptorStats.mode !== lease.identity.mode
      || pathStats.mode !== lease.identity.mode
      || descriptorStats.uid !== lease.identity.uid
      || pathStats.uid !== lease.identity.uid
      || !receiptInterpreterPathEntryIsTrusted(pathStats)) {
      throw new Error('runtime dependency identity changed while the helper executed');
    }
    const digest = hashReceiptRuntimeFileDescriptor(
      lease.descriptor,
      lease.identity.size,
      label
    );
    if (digest !== lease.sha256) {
      throw new Error('runtime dependency bytes changed while the helper executed');
    }
  } catch (error) {
    throw new Error(
      `${label} dirfd helper runtime dependency lease failed: ${error.message}`
    );
  }
}

function closeReceiptRuntimeClosureLease(closure, label) {
  if (!closure || !Array.isArray(closure.dependencies)) return null;
  let failure = null;
  for (const lease of [...closure.dependencies].reverse()) {
    if (!Number.isInteger(lease?.descriptor)) continue;
    try {
      fs.closeSync(lease.descriptor);
      lease.descriptor = null;
    } catch (error) {
      failure ??= new Error(
        `${label} dirfd helper runtime dependency descriptor close failed: ${error.message}`
      );
    }
  }
  return failure;
}

function verifyReceiptRuntimeClosureLease(closure, label) {
  for (const lease of closure.dependencies) {
    verifyReceiptRuntimeDependencyLease(lease, label);
  }
}

function parseReceiptRuntimeProbeResult(result, label, interpreterLease) {
  if (result.error) {
    throw new Error(`${label} runtime closure probe launch failed: ${result.error.message}`);
  }
  let response;
  try {
    response = JSON.parse(String(result.stdout ?? ''));
  } catch (error) {
    const stderr = String(result.stderr ?? '').trim();
    throw new Error(
      `${label} runtime closure probe returned invalid JSON: ${error.message}`
        + (stderr ? `; stderr: ${stderr}` : '')
    );
  }
  if (response.ok !== true || result.status !== 0) {
    throw new Error(
      `${label} runtime closure probe failed: ${response.error ?? `status ${result.status}`}`
    );
  }
  const eventTypes = new Set(
    Array.isArray(response.events)
      ? response.events.map(event => event?.type)
      : []
  );
  const interpreterCloseEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'interpreter-capability-closed'
    )
    : [];
  if (!eventTypes.has('runtime-confined')
    || interpreterCloseEvents.length !== 1
    || String(interpreterCloseEvents[0]?.dev)
      !== String(interpreterLease.identity.dev)
    || String(interpreterCloseEvents[0]?.ino)
      !== String(interpreterLease.identity.ino)) {
    throw new Error(`${label} runtime closure probe omitted confinement proof`);
  }
  return response;
}

function probeReceiptRuntimeClosure({ interpreterLease, label, control }) {
  let nullDescriptor = null;
  let workingDirectory = null;
  let result = null;
  let failure = null;
  try {
    nullDescriptor = fs.openSync('/dev/null', fs.constants.O_RDONLY);
    workingDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'industrial-exhaust-receipt-runtime-probe-')
    );
    fs.chmodSync(workingDirectory, 0o700);
    result = spawnSync(
      RECEIPT_DIRFD_INTERPRETER_EXEC_PATH,
      ['-I', '-S', '-B', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify({ action: 'runtime_probe', fault: null }),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio: [
          'pipe',
          'pipe',
          'pipe',
          nullDescriptor,
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
    verifyReceiptInterpreterLease(interpreterLease, label);
  } catch (error) {
    failure = error;
  }

  if (nullDescriptor !== null) {
    try {
      fs.closeSync(nullDescriptor);
    } catch (error) {
      failure ??= new Error(
        `${label} runtime closure probe descriptor close failed: ${error.message}`
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
    interpreterLease
  );
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

function runReceiptDirfdHelper({
  rootDescriptor,
  label,
  request
}) {
  const control = receiptDirfdTestControl();
  const interpreter = typeof control?.interpreter_path === 'string'
    ? control.interpreter_path
    : RECEIPT_DIRFD_HELPER_INTERPRETER;
  const allowUnleasedInterpreter = control?.allow_unleased_interpreter === true;
  const helperRequest = {
    ...request,
    fault: control?.fault ?? null
  };
  let lease = null;
  let runtimeClosure = null;
  let workingDirectory = null;
  let result = null;
  let failure = null;
  try {
    if (!allowUnleasedInterpreter) {
      lease = openReceiptInterpreterLease(interpreter, label);
      runtimeClosure = probeReceiptRuntimeClosure({
        interpreterLease: lease,
        label,
        control
      });
    }
    workingDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'industrial-exhaust-receipt-helper-')
    );
    fs.chmodSync(workingDirectory, 0o700);
    const executable = lease === null
      ? interpreter
      : RECEIPT_DIRFD_INTERPRETER_EXEC_PATH;
    const stdio = lease === null
      ? ['pipe', 'pipe', 'pipe', rootDescriptor]
      : ['pipe', 'pipe', 'pipe', rootDescriptor, lease.descriptor];
    result = spawnSync(
      executable,
      ['-I', '-S', '-B', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify(helperRequest),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio,
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
    if (lease !== null) verifyReceiptInterpreterLease(lease, label);
    if (runtimeClosure !== null) {
      verifyReceiptRuntimeClosureLease(runtimeClosure, label);
    }
  } catch (error) {
    failure = error;
  }

  const runtimeCloseFailure = closeReceiptRuntimeClosureLease(
    runtimeClosure,
    label
  );
  failure ??= runtimeCloseFailure;
  const leaseCloseFailure = closeReceiptInterpreterLease(lease, label);
  failure ??= leaseCloseFailure;
  if (workingDirectory !== null) {
    try {
      fs.rmSync(workingDirectory, { recursive: true, force: true });
    } catch (error) {
      failure ??= new Error(
        `${label} dirfd helper working-directory cleanup failed: ${error.message}`
      );
    }
  }
  if (failure) throw failure;
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
  if (!allowUnleasedInterpreter) {
    const eventTypes = new Set(
      Array.isArray(response.events)
        ? response.events.map(event => event?.type)
        : []
    );
    const interpreterCloseEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'interpreter-capability-closed'
      )
      : [];
    if (!eventTypes.has('runtime-confined')
      || !eventTypes.has('capability-narrowed')
      || interpreterCloseEvents.length !== 1
      || String(interpreterCloseEvents[0]?.dev)
        !== String(lease?.identity?.dev)
      || String(interpreterCloseEvents[0]?.ino)
        !== String(lease?.identity?.ino)) {
      throw new Error(
        `${label} dirfd helper omitted runtime-confinement proof`
      );
    }
    const actualRuntimeFiles = normalizeReceiptRuntimeFiles(
      response.runtime_files,
      label
    );
    if (JSON.stringify(actualRuntimeFiles)
      !== JSON.stringify(runtimeClosure.runtimeFiles)) {
      throw new Error(
        `${label} dirfd helper runtime closure changed after admission`
      );
    }
  }
  return response;
}
'''

text = text[:run_start] + runtime_helpers + text[run_end:]
path.write_text(text)
