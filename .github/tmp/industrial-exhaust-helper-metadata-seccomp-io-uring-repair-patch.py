from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

x86_js_anchor = """      'fchmodat:268',
      'utimensat:280',
      'fchmodat2:452'
"""
x86_js_block = """      'fchmodat:268',
      'utimensat:280',
      'io_uring_setup:425',
      'io_uring_enter:426',
      'io_uring_register:427',
      'fchmodat2:452'
"""
if text.count(x86_js_anchor) != 1:
    raise SystemExit("io_uring x86 JavaScript policy anchor mismatch")
text = text.replace(x86_js_anchor, x86_js_block)

arm_js_anchor = """      'fchown:55',
      'utimensat:88',
      'fchmodat2:452'
"""
arm_js_block = """      'fchown:55',
      'utimensat:88',
      'io_uring_setup:425',
      'io_uring_enter:426',
      'io_uring_register:427',
      'fchmodat2:452'
"""
if text.count(arm_js_anchor) != 1:
    raise SystemExit("io_uring aarch64 JavaScript policy anchor mismatch")
text = text.replace(arm_js_anchor, arm_js_block)

x86_python_anchor = """            ("fchmodat", 268),
            ("utimensat", 280),
            ("fchmodat2", 452),
"""
x86_python_block = """            ("fchmodat", 268),
            ("utimensat", 280),
            ("io_uring_setup", 425),
            ("io_uring_enter", 426),
            ("io_uring_register", 427),
            ("fchmodat2", 452),
"""
if text.count(x86_python_anchor) != 1:
    raise SystemExit("io_uring x86 Python policy anchor mismatch")
text = text.replace(x86_python_anchor, x86_python_block)

arm_python_anchor = """            ("fchown", 55),
            ("utimensat", 88),
            ("fchmodat2", 452),
"""
arm_python_block = """            ("fchown", 55),
            ("utimensat", 88),
            ("io_uring_setup", 425),
            ("io_uring_enter", 426),
            ("io_uring_register", 427),
            ("fchmodat2", 452),
"""
if text.count(arm_python_anchor) != 1:
    raise SystemExit("io_uring aarch64 Python policy anchor mismatch")
text = text.replace(arm_python_anchor, arm_python_block)

probe_anchor = """    if rejected_syscall_mask:
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
probe_block = """    if rejected_syscall_mask:
        require_syscall_errno(
            rejected_syscall_mask,
            "x32 syscall namespace",
            errno.EPERM,
            ctypes.c_int(-1),
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
        )

    entry_numbers = dict(policy["entries"])
    require_syscall_errno(
        entry_numbers["io_uring_setup"],
        "io_uring_setup",
        errno.EPERM,
        ctypes.c_uint(1),
        ctypes.c_void_p(0),
    )
    require_syscall_errno(
        entry_numbers["io_uring_enter"],
        "io_uring_enter",
        errno.EPERM,
        ctypes.c_int(-1),
        ctypes.c_uint(0),
        ctypes.c_uint(0),
        ctypes.c_uint(0),
        ctypes.c_void_p(0),
        ctypes.c_size_t(0),
    )
    require_syscall_errno(
        entry_numbers["io_uring_register"],
        "io_uring_register",
        errno.EPERM,
        ctypes.c_int(-1),
        ctypes.c_uint(0),
        ctypes.c_void_p(0),
        ctypes.c_uint(0),
    )

    cwd_before = os.stat(".", follow_symlinks=False)
"""
if text.count(probe_anchor) != 1:
    raise SystemExit("io_uring seccomp probe anchor mismatch")
text = text.replace(probe_anchor, probe_block)

PATH.write_text(text)
