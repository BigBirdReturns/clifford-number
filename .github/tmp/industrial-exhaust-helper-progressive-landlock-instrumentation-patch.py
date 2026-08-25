from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

function_anchor = '''    add_event("visible-ancestor-swapped")

def maybe_create_competing_receipt(parent_descriptor, final_name):
'''
if text.count(function_anchor) != 1:
    raise SystemExit("helper fault function anchor mismatch")

function_block = r'''    add_event("visible-ancestor-swapped")

def maybe_rename_directory_chain_sibling(display, create):
    global FAULT_USED
    if (
        not create
        or not isinstance(FAULT, dict)
        or FAULT.get("type") != "rename_directory_chain_sibling_after_open"
        or FAULT_USED
        or FAULT.get("after_display") != display
    ):
        return
    FAULT_USED = True
    canonical = FAULT.get("canonical_path")
    displaced = FAULT.get("displaced_path")
    if (
        not all(
            isinstance(value, str) and value and os.path.isabs(value)
            for value in (canonical, displaced)
        )
        or canonical == displaced
    ):
        fail("invalid directory-chain sibling rename fault")
    try:
        os.rename(canonical, displaced)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM, errno.EXDEV):
            raise
        if os.path.lexists(displaced) or not os.path.lexists(canonical):
            fail(
                "progressive Landlock rejection left a partial "
                "directory-chain sibling rename"
            )
        add_event(
            "ambient-write-denied",
            operation="directory-chain-sibling-rename",
            display=display,
            errno=error.errno,
        )
        return
    add_event("directory-chain-sibling-renamed", display=display)

def maybe_create_competing_receipt(parent_descriptor, final_name):
'''

call_anchor = '''        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        sync_directory(descriptor, f"receipt parent directory {display}")
'''
if text.count(call_anchor) != 1:
    raise SystemExit("helper fault call anchor mismatch")

call_block = '''        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        maybe_rename_directory_chain_sibling(display, create)
        sync_directory(descriptor, f"receipt parent directory {display}")
'''

text = text.replace(function_anchor, function_block)
text = text.replace(call_anchor, call_block)
PATH.write_text(text)
