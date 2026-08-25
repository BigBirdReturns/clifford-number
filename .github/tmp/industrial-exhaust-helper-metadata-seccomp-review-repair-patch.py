from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

js_policy_anchor = """const RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES = Object.freeze({
  x86_64: Object.freeze([
    'chmod:90',
    'fchmod:91',
    'chown:92',
    'fchown:93',
    'lchown:94',
    'utime:132',
    'setxattr:188',
    'lsetxattr:189',
    'fsetxattr:190',
    'removexattr:197',
    'lremovexattr:198',
    'fremovexattr:199',
    'utimes:235',
    'fchownat:260',
    'futimesat:261',
    'fchmodat:268',
    'utimensat:280',
    'fchmodat2:452'
  ]),
  aarch64: Object.freeze([
    'setxattr:5',
    'lsetxattr:6',
    'fsetxattr:7',
    'removexattr:14',
    'lremovexattr:15',
    'fremovexattr:16',
    'fchmod:52',
    'fchmodat:53',
    'fchownat:54',
    'fchown:55',
    'utimensat:88',
    'fchmodat2:452'
  ])
});
"""
js_policy_block = """const RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES = Object.freeze({
  x86_64: Object.freeze({
    audit_arch: 0xC000003E,
    rejected_syscall_mask: 0x40000000,
    ioctl_syscall: 16,
    ioctl_requests: Object.freeze([
      'FS_IOC_SETFLAGS:1074292226',
      'FS_IOC_FSSETXATTR:1075599392'
    ]),
    entries: Object.freeze([
      'chmod:90',
      'fchmod:91',
      'chown:92',
      'fchown:93',
      'lchown:94',
      'utime:132',
      'setxattr:188',
      'lsetxattr:189',
      'fsetxattr:190',
      'removexattr:197',
      'lremovexattr:198',
      'fremovexattr:199',
      'utimes:235',
      'fchownat:260',
      'futimesat:261',
      'fchmodat:268',
      'utimensat:280',
      'fchmodat2:452'
    ])
  }),
  aarch64: Object.freeze({
    audit_arch: 0xC00000B7,
    rejected_syscall_mask: 0,
    ioctl_syscall: 29,
    ioctl_requests: Object.freeze([
      'FS_IOC_SETFLAGS:1074292226',
      'FS_IOC_FSSETXATTR:1075599392'
    ]),
    entries: Object.freeze([
      'setxattr:5',
      'lsetxattr:6',
      'fsetxattr:7',
      'removexattr:14',
      'lremovexattr:15',
      'fremovexattr:16',
      'fchmod:52',
      'fchmodat:53',
      'fchownat:54',
      'fchown:55',
      'utimensat:88',
      'fchmodat2:452'
    ])
  })
});
"""
if text.count(js_policy_anchor) != 1:
    raise SystemExit("metadata review JS policy anchor mismatch")
text = text.replace(js_policy_anchor, js_policy_block)

bpf_anchor = """BPF_JMP = 0x05
BPF_JEQ = 0x10
BPF_K = 0x00
"""
bpf_block = """BPF_JMP = 0x05
BPF_JEQ = 0x10
BPF_JSET = 0x40
BPF_K = 0x00
"""
if text.count(bpf_anchor) != 1:
    raise SystemExit("metadata review BPF constant anchor mismatch")
text = text.replace(bpf_anchor, bpf_block)

offset_anchor = """SECCOMP_DATA_NR_OFFSET = 0
SECCOMP_DATA_ARCH_OFFSET = 4
"""
offset_block = """SECCOMP_DATA_NR_OFFSET = 0
SECCOMP_DATA_ARCH_OFFSET = 4
SECCOMP_DATA_ARG1_OFFSET = 24
"""
if text.count(offset_anchor) != 1:
    raise SystemExit("metadata review seccomp offset anchor mismatch")
text = text.replace(offset_anchor, offset_block)

python_policy_anchor = """FILESYSTEM_METADATA_SECCOMP_POLICIES = {
    "x86_64": {
        "audit_arch": 0xC000003E,
        "entries": (
            ("chmod", 90),
            ("fchmod", 91),
            ("chown", 92),
            ("fchown", 93),
            ("lchown", 94),
            ("utime", 132),
            ("setxattr", 188),
            ("lsetxattr", 189),
            ("fsetxattr", 190),
            ("removexattr", 197),
            ("lremovexattr", 198),
            ("fremovexattr", 199),
            ("utimes", 235),
            ("fchownat", 260),
            ("futimesat", 261),
            ("fchmodat", 268),
            ("utimensat", 280),
            ("fchmodat2", 452),
        ),
    },
    "aarch64": {
        "audit_arch": 0xC00000B7,
        "entries": (
            ("setxattr", 5),
            ("lsetxattr", 6),
            ("fsetxattr", 7),
            ("removexattr", 14),
            ("lremovexattr", 15),
            ("fremovexattr", 16),
            ("fchmod", 52),
            ("fchmodat", 53),
            ("fchownat", 54),
            ("fchown", 55),
            ("utimensat", 88),
            ("fchmodat2", 452),
        ),
    },
}
"""
python_policy_block = """FILESYSTEM_METADATA_SECCOMP_POLICIES = {
    "x86_64": {
        "audit_arch": 0xC000003E,
        "rejected_syscall_mask": 0x40000000,
        "ioctl_syscall": 16,
        "ioctl_requests": (
            ("FS_IOC_SETFLAGS", 0x40086602),
            ("FS_IOC_FSSETXATTR", 0x401C5820),
        ),
        "entries": (
            ("chmod", 90),
            ("fchmod", 91),
            ("chown", 92),
            ("fchown", 93),
            ("lchown", 94),
            ("utime", 132),
            ("setxattr", 188),
            ("lsetxattr", 189),
            ("fsetxattr", 190),
            ("removexattr", 197),
            ("lremovexattr", 198),
            ("fremovexattr", 199),
            ("utimes", 235),
            ("fchownat", 260),
            ("futimesat", 261),
            ("fchmodat", 268),
            ("utimensat", 280),
            ("fchmodat2", 452),
        ),
    },
    "aarch64": {
        "audit_arch": 0xC00000B7,
        "rejected_syscall_mask": 0,
        "ioctl_syscall": 29,
        "ioctl_requests": (
            ("FS_IOC_SETFLAGS", 0x40086602),
            ("FS_IOC_FSSETXATTR", 0x401C5820),
        ),
        "entries": (
            ("setxattr", 5),
            ("lsetxattr", 6),
            ("fsetxattr", 7),
            ("removexattr", 14),
            ("lremovexattr", 15),
            ("fremovexattr", 16),
            ("fchmod", 52),
            ("fchmodat", 53),
            ("fchownat", 54),
            ("fchown", 55),
            ("utimensat", 88),
            ("fchmodat2", 452),
        ),
    },
}
"""
if text.count(python_policy_anchor) != 1:
    raise SystemExit("metadata review Python policy anchor mismatch")
text = text.replace(python_policy_anchor, python_policy_block)

function_anchor = """def confine_filesystem_metadata():
"""
function_block = """def require_syscall_errno(
    syscall_number,
    label,
    expected_errno,
    *arguments,
):
    ctypes.set_errno(0)
    result = LIBC.syscall(ctypes.c_long(syscall_number), *arguments)
    error_number = ctypes.get_errno()
    if result != -1 or error_number != expected_errno:
        fail(
            "descriptor-relative receipt helper metadata seccomp "
            f"probe mismatch for {label}: result={result}, "
            f"errno={error_number}, expected={expected_errno}"
        )


def confine_filesystem_metadata():
"""
if text.count(function_anchor) != 1:
    raise SystemExit("metadata review seccomp probe function anchor mismatch")
text = text.replace(function_anchor, function_block)

filter_anchor = """    ]
    for _name, syscall_number in policy["entries"]:
"""
filter_block = """    ]
    rejected_syscall_mask = policy["rejected_syscall_mask"]
    if rejected_syscall_mask:
        filters.extend(
            [
                SockFilter(
                    BPF_JMP | BPF_JSET | BPF_K,
                    0,
                    1,
                    rejected_syscall_mask,
                ),
                SockFilter(
                    BPF_RET | BPF_K,
                    0,
                    0,
                    SECCOMP_RET_ERRNO | errno.EPERM,
                ),
            ]
        )

    ioctl_requests = policy["ioctl_requests"]
    filters.extend(
        [
            SockFilter(
                BPF_JMP | BPF_JEQ | BPF_K,
                0,
                2 * len(ioctl_requests) + 1,
                policy["ioctl_syscall"],
            ),
            SockFilter(
                BPF_LD | BPF_W | BPF_ABS,
                0,
                0,
                SECCOMP_DATA_ARG1_OFFSET,
            ),
        ]
    )
    for _name, request_number in ioctl_requests:
        filters.extend(
            [
                SockFilter(
                    BPF_JMP | BPF_JEQ | BPF_K,
                    0,
                    1,
                    request_number,
                ),
                SockFilter(
                    BPF_RET | BPF_K,
                    0,
                    0,
                    SECCOMP_RET_ERRNO | errno.EPERM,
                ),
            ]
        )
    filters.append(
        SockFilter(
            BPF_LD | BPF_W | BPF_ABS,
            0,
            0,
            SECCOMP_DATA_NR_OFFSET,
        )
    )

    for _name, syscall_number in policy["entries"]:
"""
if text.count(filter_anchor) != 1:
    raise SystemExit("metadata review ioctl filter anchor mismatch")
text = text.replace(filter_anchor, filter_block)

probe_anchor = """    cwd_before = os.stat(".", follow_symlinks=False)
"""
probe_block = """    for request_name, request_number in ioctl_requests:
        require_syscall_errno(
            policy["ioctl_syscall"],
            request_name,
            errno.EPERM,
            ctypes.c_int(-1),
            ctypes.c_ulong(request_number),
            ctypes.c_void_p(0),
        )
    require_syscall_errno(
        policy["ioctl_syscall"],
        "unlisted ioctl request",
        errno.EBADF,
        ctypes.c_int(-1),
        ctypes.c_ulong(0),
        ctypes.c_void_p(0),
    )
    if rejected_syscall_mask:
        require_syscall_errno(
            rejected_syscall_mask,
            "x32 syscall namespace",
            errno.EPERM,
            ctypes.c_int(-1),
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
        )

    cwd_before = os.stat(".", follow_symlinks=False)
"""
if text.count(probe_anchor) != 1:
    raise SystemExit("metadata review syscall probe anchor mismatch")
text = text.replace(probe_anchor, probe_block)

event_anchor = """        policy=FILESYSTEM_METADATA_SECCOMP_POLICY,
        architecture=machine,
        errno=errno.EPERM,
        entries=[
"""
event_block = """        policy=FILESYSTEM_METADATA_SECCOMP_POLICY,
        architecture=machine,
        audit_arch=policy["audit_arch"],
        rejected_syscall_mask=rejected_syscall_mask,
        ioctl_syscall=policy["ioctl_syscall"],
        ioctl_requests=[
            f"{name}:{request_number}"
            for name, request_number in ioctl_requests
        ],
        errno=errno.EPERM,
        entries=[
"""
if text.count(event_anchor) != 1:
    raise SystemExit("metadata review proof event anchor mismatch")
text = text.replace(event_anchor, event_block)

validation_anchor = """  const expected = RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES[event.architecture];
  return Array.isArray(expected)
    && JSON.stringify(event.entries) === JSON.stringify(expected);
"""
validation_block = """  const expected = RECEIPT_DIRFD_METADATA_SECCOMP_POLICIES[event.architecture];
  return expected && typeof expected === 'object'
    && Number(event.audit_arch) === expected.audit_arch
    && Number(event.rejected_syscall_mask) === expected.rejected_syscall_mask
    && Number(event.ioctl_syscall) === expected.ioctl_syscall
    && Array.isArray(expected.ioctl_requests)
    && JSON.stringify(event.ioctl_requests)
      === JSON.stringify(expected.ioctl_requests)
    && Array.isArray(expected.entries)
    && JSON.stringify(event.entries) === JSON.stringify(expected.entries);
"""
if text.count(validation_anchor) != 1:
    raise SystemExit("metadata review parent proof anchor mismatch")
text = text.replace(validation_anchor, validation_block)

PATH.write_text(text)
