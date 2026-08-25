from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

js_x86_anchor = '''      'utimensat:280',
      'fchmodat2:452'
    ])
  }),
  aarch64: Object.freeze({
'''
if text.count(js_x86_anchor) != 1:
    raise SystemExit("io_uring JavaScript x86_64 policy anchor mismatch")
js_x86_replacement = '''      'utimensat:280',
      'fchmodat2:452',
      'io_uring_setup:425',
      'io_uring_enter:426',
      'io_uring_register:427'
    ])
  }),
  aarch64: Object.freeze({
'''
text = text.replace(js_x86_anchor, js_x86_replacement)

js_aarch64_anchor = '''      'utimensat:88',
      'fchmodat2:452'
    ])
  })
});
'''
if text.count(js_aarch64_anchor) != 1:
    raise SystemExit("io_uring JavaScript aarch64 policy anchor mismatch")
js_aarch64_replacement = '''      'utimensat:88',
      'fchmodat2:452',
      'io_uring_setup:425',
      'io_uring_enter:426',
      'io_uring_register:427'
    ])
  })
});
'''
text = text.replace(js_aarch64_anchor, js_aarch64_replacement)

python_x86_anchor = '''            ("utimensat", 280),
            ("fchmodat2", 452),
        ),
    },
    "aarch64": {
'''
if text.count(python_x86_anchor) != 1:
    raise SystemExit("io_uring Python x86_64 policy anchor mismatch")
python_x86_replacement = '''            ("utimensat", 280),
            ("fchmodat2", 452),
            ("io_uring_setup", 425),
            ("io_uring_enter", 426),
            ("io_uring_register", 427),
        ),
    },
    "aarch64": {
'''
text = text.replace(python_x86_anchor, python_x86_replacement)

python_aarch64_anchor = '''            ("utimensat", 88),
            ("fchmodat2", 452),
        ),
    },
}
LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
'''
if text.count(python_aarch64_anchor) != 1:
    raise SystemExit("io_uring Python aarch64 policy anchor mismatch")
python_aarch64_replacement = '''            ("utimensat", 88),
            ("fchmodat2", 452),
            ("io_uring_setup", 425),
            ("io_uring_enter", 426),
            ("io_uring_register", 427),
        ),
    },
}
LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
'''
text = text.replace(python_aarch64_anchor, python_aarch64_replacement)

probe_anchor = '''    if rejected_syscall_mask:
        require_syscall_errno(
            rejected_syscall_mask,
            "x32 syscall namespace",
            errno.EPERM,
            ctypes.c_int(-1),
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
        )

    cwd_before = os.stat(".", follow_symlinks=False)
'''
if text.count(probe_anchor) != 1:
    raise SystemExit("io_uring seccomp probe anchor mismatch")
probe_replacement = '''    if rejected_syscall_mask:
        require_syscall_errno(
            rejected_syscall_mask,
            "x32 syscall namespace",
            errno.EPERM,
            ctypes.c_int(-1),
            ctypes.c_void_p(0),
            ctypes.c_size_t(0),
        )

    entry_syscalls = dict(policy["entries"])
    for io_uring_name in (
        "io_uring_setup",
        "io_uring_enter",
        "io_uring_register",
    ):
        require_syscall_errno(
            entry_syscalls[io_uring_name],
            io_uring_name,
            errno.EPERM,
        )

    cwd_before = os.stat(".", follow_symlinks=False)
'''
text = text.replace(probe_anchor, probe_replacement)

PATH.write_text(text)
