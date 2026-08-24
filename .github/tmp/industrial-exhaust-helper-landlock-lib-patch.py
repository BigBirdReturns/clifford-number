from pathlib import Path

path = Path('tools/lib/industrial-exhaust-artifacts.mjs')
text = path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one marker, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    """import base64
import errno
import hashlib
""",
    """import base64
import ctypes
import errno
import hashlib
""",
    'embedded helper ctypes import',
)

replace_once(
    """ROOT_FD = 3
INTERPRETER_FD = 4
EVENTS = []
FAULT = None
FAULT_USED = False
""",
    """ROOT_FD = 3
INTERPRETER_FD = 4
EVENTS = []
FAULT = None
FAULT_USED = False
LANDLOCK_ABI = None
""",
    'embedded helper globals',
)

landlock_code = r'''

class LandlockRulesetAttr(ctypes.Structure):
    _fields_ = [("handled_access_fs", ctypes.c_uint64)]


class LandlockPathBeneathAttr(ctypes.Structure):
    _fields_ = [
        ("allowed_access", ctypes.c_uint64),
        ("parent_fd", ctypes.c_int32),
    ]


LANDLOCK_CREATE_RULESET_VERSION = 1
LANDLOCK_RULE_PATH_BENEATH = 1
PR_SET_NO_NEW_PRIVS = 38
LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
LANDLOCK_ACCESS_FS_REMOVE_DIR = 1 << 4
LANDLOCK_ACCESS_FS_REMOVE_FILE = 1 << 5
LANDLOCK_ACCESS_FS_MAKE_CHAR = 1 << 6
LANDLOCK_ACCESS_FS_MAKE_DIR = 1 << 7
LANDLOCK_ACCESS_FS_MAKE_REG = 1 << 8
LANDLOCK_ACCESS_FS_MAKE_SOCK = 1 << 9
LANDLOCK_ACCESS_FS_MAKE_FIFO = 1 << 10
LANDLOCK_ACCESS_FS_MAKE_BLOCK = 1 << 11
LANDLOCK_ACCESS_FS_MAKE_SYM = 1 << 12
LANDLOCK_ACCESS_FS_REFER = 1 << 13
LANDLOCK_ACCESS_FS_TRUNCATE = 1 << 14
LANDLOCK_HANDLED_WRITE_ACCESS = (
    LANDLOCK_ACCESS_FS_WRITE_FILE
    | LANDLOCK_ACCESS_FS_REMOVE_DIR
    | LANDLOCK_ACCESS_FS_REMOVE_FILE
    | LANDLOCK_ACCESS_FS_MAKE_CHAR
    | LANDLOCK_ACCESS_FS_MAKE_DIR
    | LANDLOCK_ACCESS_FS_MAKE_REG
    | LANDLOCK_ACCESS_FS_MAKE_SOCK
    | LANDLOCK_ACCESS_FS_MAKE_FIFO
    | LANDLOCK_ACCESS_FS_MAKE_BLOCK
    | LANDLOCK_ACCESS_FS_MAKE_SYM
    | LANDLOCK_ACCESS_FS_REFER
    | LANDLOCK_ACCESS_FS_TRUNCATE
)
LANDLOCK_SYSCALLS = {
    "x86_64": (444, 445, 446),
    "aarch64": (444, 445, 446),
}
LIBC = ctypes.CDLL(None, use_errno=True)
LIBC.syscall.restype = ctypes.c_long
LIBC.prctl.restype = ctypes.c_int


def landlock_syscall(operation, *arguments):
    syscall_numbers = LANDLOCK_SYSCALLS.get(os.uname().machine)
    if syscall_numbers is None:
        fail(
            "descriptor-relative receipt helper does not know Landlock syscalls "
            f"for architecture {os.uname().machine}"
        )
    operation_index = {"create": 0, "add": 1, "restrict": 2}[operation]
    ctypes.set_errno(0)
    result = LIBC.syscall(
        ctypes.c_long(syscall_numbers[operation_index]),
        *arguments,
    )
    if result < 0:
        error_number = ctypes.get_errno()
        raise OSError(error_number, os.strerror(error_number))
    return int(result)


def landlock_abi_version():
    try:
        return landlock_syscall(
            "create",
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
            ctypes.c_uint32(LANDLOCK_CREATE_RULESET_VERSION),
        )
    except OSError as error:
        fail(f"descriptor-relative receipt helper requires Landlock: {error}")


def restrict_filesystem_writes(descriptor, scope):
    if not isinstance(LANDLOCK_ABI, int) or LANDLOCK_ABI < 3:
        fail("descriptor-relative receipt helper lacks Landlock truncate control")
    descriptor_stats = os.fstat(descriptor)
    if not stat.S_ISDIR(descriptor_stats.st_mode):
        fail(f"Landlock scope {scope} is not a directory")

    ruleset_descriptor = None
    try:
        ruleset_attr = LandlockRulesetAttr(LANDLOCK_HANDLED_WRITE_ACCESS)
        ruleset_descriptor = landlock_syscall(
            "create",
            ctypes.byref(ruleset_attr),
            ctypes.c_size_t(ctypes.sizeof(ruleset_attr)),
            ctypes.c_uint32(0),
        )
        os.set_inheritable(ruleset_descriptor, False)
        path_beneath = LandlockPathBeneathAttr(
            LANDLOCK_HANDLED_WRITE_ACCESS,
            descriptor,
        )
        landlock_syscall(
            "add",
            ctypes.c_int(ruleset_descriptor),
            ctypes.c_int(LANDLOCK_RULE_PATH_BENEATH),
            ctypes.byref(path_beneath),
            ctypes.c_uint32(0),
        )
        landlock_syscall(
            "restrict",
            ctypes.c_int(ruleset_descriptor),
            ctypes.c_uint32(0),
        )
    except OSError as error:
        fail(f"descriptor-relative receipt helper Landlock confinement failed: {error}")
    finally:
        if ruleset_descriptor is not None:
            os.close(ruleset_descriptor)

    after = os.fstat(descriptor)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(after, descriptor_stats):
        fail(f"Landlock scope {scope} changed during confinement")
    add_event(
        "filesystem-write-confined",
        scope=scope,
        abi=str(LANDLOCK_ABI),
        **identity(after),
    )
'''

marker = '\ndef runtime_file_paths():\n'
if text.count(marker) != 1:
    raise SystemExit(f'Landlock insertion marker count: {text.count(marker)}')
text = text.replace(marker, landlock_code + marker, 1)

confine_start = text.index('def confine_runtime():\n')
confine_end = text.index('\ndef maybe_probe_fork_denial():', confine_start)
new_confine = r'''def confine_runtime():
    global LANDLOCK_ABI
    if sys.platform != "linux" or os.name != "posix":
        fail("descriptor-relative receipt helper requires Linux process controls")
    if os.geteuid() == 0:
        fail("descriptor-relative receipt helper may not run as root")
    LANDLOCK_ABI = landlock_abi_version()
    if LANDLOCK_ABI < 3:
        fail(
            "descriptor-relative receipt helper requires Landlock ABI 3 "
            "for truncate confinement"
        )
    if LIBC.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
        error_number = ctypes.get_errno()
        fail(
            "descriptor-relative receipt helper no-new-privileges confinement "
            f"failed: {os.strerror(error_number)}"
        )
    try:
        os.umask(0o077)
        os.set_inheritable(ROOT_FD, False)
        os.set_inheritable(INTERPRETER_FD, False)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    except (AttributeError, OSError, ValueError) as error:
        fail(f"descriptor-relative receipt helper confinement failed: {error}")
    if resource.getrlimit(resource.RLIMIT_NPROC) != (0, 0):
        fail("descriptor-relative receipt helper process limit was not retained")

    root_stats = os.fstat(ROOT_FD)
    if stat.S_ISDIR(root_stats.st_mode):
        restrict_filesystem_writes(ROOT_FD, "repository-root")
    elif not stat.S_ISCHR(root_stats.st_mode):
        fail("runtime closure probe descriptor is not a harmless character device")
    add_event("landlock-supported", abi=str(LANDLOCK_ABI))

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
    cwd_mode = stat.S_IMODE(cwd_stats.st_mode)
    if (
        not stat.S_ISDIR(cwd_stats.st_mode)
        or cwd_stats.st_uid != os.geteuid()
        or cwd_mode & 0o077
        or cwd_mode & 0o700 != 0o700
    ):
        fail("descriptor-relative receipt helper working directory is not private")
    add_event(
        "runtime-confined",
        euid=str(os.geteuid()),
        cwd_dev=str(cwd_stats.st_dev),
        cwd_ino=str(cwd_stats.st_ino),
    )
'''
text = text[:confine_start] + new_confine + text[confine_end:]

narrow_start = text.index('def narrow_chain_to_parent(chain_descriptors, chain):\n')
narrow_end = text.index('\ndef inspect_final(', narrow_start)
new_narrow = r'''def narrow_chain_to_parent(chain_descriptors, chain):
    parent_descriptor = chain_descriptors[-1]
    for descriptor in chain_descriptors[:-1]:
        os.close(descriptor)
    restrict_filesystem_writes(parent_descriptor, "receipt-parent")
    parent_stats = os.fstat(parent_descriptor)
    add_event(
        "capability-narrowed",
        display=chain[-1]["display"],
        **identity(parent_stats),
    )
    return [parent_descriptor], parent_descriptor
'''
text = text[:narrow_start] + new_narrow + text[narrow_end:]

swap_start = text.index('def maybe_swap_visible_ancestor():\n')
swap_end = text.index('\ndef maybe_create_competing_receipt(', swap_start)
new_swap = r'''def maybe_swap_visible_ancestor():
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
    try:
        os.rename(canonical, displaced)
        os.symlink(external, canonical)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM, errno.EXDEV):
            raise
        if os.path.lexists(displaced) or not os.path.lexists(canonical):
            fail("Landlock rejection left a partial visible-ancestor swap")
        add_event(
            "ambient-write-denied",
            operation="visible-ancestor-swap",
            errno=error.errno,
        )
        return
    add_event("visible-ancestor-swapped")
'''
text = text[:swap_start] + new_swap + text[swap_end:]

probe_event_marker = """  const interpreterCloseEvents = Array.isArray(response.events)
    ? response.events.filter(
      event => event?.type === 'interpreter-capability-closed'
    )
    : [];
"""
replace_once(
    probe_event_marker,
    probe_event_marker + """  const landlockEvents = Array.isArray(response.events)
    ? response.events.filter(event => event?.type === 'landlock-supported')
    : [];
""",
    'runtime probe Landlock event extraction',
)
replace_once(
    """  if (!eventTypes.has('runtime-confined')
    || interpreterCloseEvents.length !== 1
""",
    """  if (!eventTypes.has('runtime-confined')
    || landlockEvents.length !== 1
    || Number(landlockEvents[0]?.abi) < 3
    || interpreterCloseEvents.length !== 1
""",
    'runtime probe Landlock proof',
)

actual_event_marker = """    const interpreterCloseEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'interpreter-capability-closed'
      )
      : [];
"""
replace_once(
    actual_event_marker,
    actual_event_marker + """    const writeConfinementEvents = Array.isArray(response.events)
      ? response.events.filter(
        event => event?.type === 'filesystem-write-confined'
      )
      : [];
    const capabilityEvents = Array.isArray(response.events)
      ? response.events.filter(event => event?.type === 'capability-narrowed')
      : [];
""",
    'capable helper Landlock event extraction',
)
replace_once(
    """    if (!eventTypes.has('runtime-confined')
      || !eventTypes.has('capability-narrowed')
      || interpreterCloseEvents.length !== 1
""",
    """    const rootConfinement = writeConfinementEvents.find(
      event => event?.scope === 'repository-root'
    );
    const parentConfinement = writeConfinementEvents.find(
      event => event?.scope === 'receipt-parent'
    );
    if (!eventTypes.has('runtime-confined')
      || writeConfinementEvents.length !== 2
      || capabilityEvents.length !== 1
      || !rootConfinement
      || !parentConfinement
      || Number(rootConfinement?.abi) < 3
      || Number(parentConfinement?.abi) < 3
      || String(parentConfinement?.dev) !== String(capabilityEvents[0]?.dev)
      || String(parentConfinement?.ino) !== String(capabilityEvents[0]?.ino)
      || interpreterCloseEvents.length !== 1
""",
    'capable helper Landlock proof',
)

path.write_text(text)
