from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

function_anchor = '''def maybe_swap_visible_ancestor():
'''
if text.count(function_anchor) != 1:
    raise SystemExit("metadata fault function anchor mismatch")

function_block = r'''def maybe_chmod_unrelated_after_narrowing():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "chmod_unrelated_after_narrowing"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    target = FAULT.get("path")
    requested_mode = FAULT.get("mode")
    if (
        not isinstance(target, str)
        or not target
        or not os.path.isabs(target)
        or not isinstance(requested_mode, int)
        or isinstance(requested_mode, bool)
        or requested_mode < 0
        or requested_mode > 0o7777
    ):
        fail("invalid unrelated metadata mutation fault")
    before = os.lstat(target)
    before_mode = stat.S_IMODE(before.st_mode)
    if not stat.S_ISREG(before.st_mode):
        fail("unrelated metadata mutation target is not a regular file")
    try:
        os.chmod(target, requested_mode)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM):
            raise
        after = os.lstat(target)
        if (
            not stat.S_ISREG(after.st_mode)
            or not same_identity(before, after)
            or stat.S_IMODE(after.st_mode) != before_mode
        ):
            fail("metadata mutation denial changed the unrelated target")
        add_event(
            "metadata-mutation-denied",
            operation="chmod",
            errno=error.errno,
            mode=str(before_mode),
        )
        return
    after = os.lstat(target)
    add_event(
        "metadata-mutation-succeeded",
        operation="chmod",
        before_mode=str(before_mode),
        after_mode=str(stat.S_IMODE(after.st_mode)),
    )


def maybe_swap_visible_ancestor():
'''
text = text.replace(function_anchor, function_block)

call_anchor = '''    chain_descriptors, parent_descriptor = narrow_chain_to_parent(
        chain_descriptors,
        chain,
    )
    temp_name = None
'''
if text.count(call_anchor) != 1:
    raise SystemExit("metadata fault call anchor mismatch")
call_block = '''    chain_descriptors, parent_descriptor = narrow_chain_to_parent(
        chain_descriptors,
        chain,
    )
    maybe_chmod_unrelated_after_narrowing()
    temp_name = None
'''
text = text.replace(call_anchor, call_block)

PATH.write_text(text)
