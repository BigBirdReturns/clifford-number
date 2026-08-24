from pathlib import Path

path = Path('tools/lib/industrial-exhaust-artifacts.mjs')
text = path.read_text()

constants_marker = '''const RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES = 24_000_000;
const RECEIPT_DIRFD_INTERPRETER_MAX_BYTES = 64 * 1024 * 1024;
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
'''
constants_replacement = '''const RECEIPT_DIRFD_HELPER_MAX_RECEIPT_BYTES = 24_000_000;
const RECEIPT_DIRFD_INTERPRETER_MAX_BYTES = 64 * 1024 * 1024;
const RECEIPT_DIRFD_INTERPRETER_CHILD_FD = 4;
const RECEIPT_DIRFD_INTERPRETER_EXEC_PATH =
  `/proc/self/fd/${RECEIPT_DIRFD_INTERPRETER_CHILD_FD}`;
const RECEIPT_DIRFD_HELPER_SOURCE = String.raw`
'''
if text.count(constants_marker) != 1:
    raise SystemExit(f'unexpected constants marker count: {text.count(constants_marker)}')
text = text.replace(constants_marker, constants_replacement, 1)

fd_marker = '''MAX_RECEIPT_BYTES = 24_000_000
ROOT_FD = 3
EVENTS = []
'''
fd_replacement = '''MAX_RECEIPT_BYTES = 24_000_000
ROOT_FD = 3
INTERPRETER_FD = 4
EVENTS = []
'''
if text.count(fd_marker) != 1:
    raise SystemExit(f'unexpected helper fd marker count: {text.count(fd_marker)}')
text = text.replace(fd_marker, fd_replacement, 1)

confinement_marker = '''    try:
        os.umask(0o077)
        os.set_inheritable(ROOT_FD, False)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    except (AttributeError, OSError, ValueError) as error:
        fail(f"descriptor-relative receipt helper confinement failed: {error}")
    if resource.getrlimit(resource.RLIMIT_NPROC) != (0, 0):
        fail("descriptor-relative receipt helper process limit was not retained")
    cwd_stats = os.stat(".", follow_symlinks=False)
'''
confinement_replacement = '''    try:
        os.umask(0o077)
        os.set_inheritable(ROOT_FD, False)
        os.set_inheritable(INTERPRETER_FD, False)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    except (AttributeError, OSError, ValueError) as error:
        fail(f"descriptor-relative receipt helper confinement failed: {error}")
    if resource.getrlimit(resource.RLIMIT_NPROC) != (0, 0):
        fail("descriptor-relative receipt helper process limit was not retained")
    try:
        interpreter_stats = os.fstat(INTERPRETER_FD)
        if not stat.S_ISREG(interpreter_stats.st_mode):
            fail("descriptor-relative receipt helper executable descriptor is not a file")
        os.close(INTERPRETER_FD)
    except OSError as error:
        fail(f"descriptor-relative receipt helper executable closure failed: {error}")
    add_event(
        "interpreter-capability-closed",
        **identity(interpreter_stats),
    )
    cwd_stats = os.stat(".", follow_symlinks=False)
'''
if text.count(confinement_marker) != 1:
    raise SystemExit(
        f'unexpected confinement marker count: {text.count(confinement_marker)}'
    )
text = text.replace(confinement_marker, confinement_replacement, 1)

spawn_marker = '''    result = spawnSync(
      lease?.path ?? interpreter,
      ['-I', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify(helperRequest),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe', rootDescriptor],
        env: {
'''
spawn_replacement = '''    const executable = lease === null
      ? interpreter
      : RECEIPT_DIRFD_INTERPRETER_EXEC_PATH;
    const stdio = lease === null
      ? ['pipe', 'pipe', 'pipe', rootDescriptor]
      : ['pipe', 'pipe', 'pipe', rootDescriptor, lease.descriptor];
    result = spawnSync(
      executable,
      ['-I', '-c', RECEIPT_DIRFD_HELPER_SOURCE],
      {
        input: JSON.stringify(helperRequest),
        encoding: 'utf8',
        maxBuffer: RECEIPT_DIRFD_HELPER_MAX_BUFFER,
        timeout: 120_000,
        cwd: workingDirectory,
        stdio,
        env: {
'''
if text.count(spawn_marker) != 1:
    raise SystemExit(f'unexpected spawn marker count: {text.count(spawn_marker)}')
text = text.replace(spawn_marker, spawn_replacement, 1)

event_marker = '''    if (!eventTypes.has('runtime-confined')
      || !eventTypes.has('capability-narrowed')) {
      throw new Error(
        `${label} dirfd helper omitted runtime-confinement proof`
      );
    }
'''
event_replacement = '''    const interpreterCloseEvents = Array.isArray(response.events)
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
'''
if text.count(event_marker) != 1:
    raise SystemExit(f'unexpected event marker count: {text.count(event_marker)}')
text = text.replace(event_marker, event_replacement, 1)

path.write_text(text)
