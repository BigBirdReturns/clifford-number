from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
text = PATH.read_text()

function_anchor = '''def maybe_probe_fork_denial():
'''
if text.count(function_anchor) != 1:
    raise SystemExit("runtime-probe fault function anchor mismatch")

function_block = r'''def maybe_probe_runtime_ambient_write():
    global FAULT_USED
    if (
        not isinstance(FAULT, dict)
        or FAULT.get("type") != "write_runtime_probe_escape"
        or FAULT_USED
    ):
        return
    FAULT_USED = True
    target = FAULT.get("path")
    encoded = FAULT.get("content_base64")
    if (
        not isinstance(target, str)
        or not target
        or not os.path.isabs(target)
        or not isinstance(encoded, str)
    ):
        fail("invalid runtime-probe ambient-write fault")
    content = base64.b64decode(encoded, validate=True)
    descriptor = None
    try:
        descriptor = os.open(
            target,
            os.O_WRONLY
            | os.O_CREAT
            | os.O_TRUNC
            | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
        write_all(descriptor, content)
        os.fsync(descriptor)
    except OSError as error:
        if error.errno not in (errno.EACCES, errno.EPERM):
            raise
        if os.path.lexists(target):
            fail("runtime-probe write denial left an ambient escape file")
        add_event("runtime-probe-write-denied", errno=error.errno)
        return
    finally:
        if descriptor is not None:
            os.close(descriptor)
    add_event("runtime-probe-escape-created")


def maybe_probe_fork_denial():
'''
text = text.replace(function_anchor, function_block)

main_anchor = '''    FAULT = request.get("fault")
    maybe_probe_fork_denial()
'''
if text.count(main_anchor) != 1:
    raise SystemExit("runtime-probe fault call anchor mismatch")
main_block = '''    FAULT = request.get("fault")
    maybe_probe_runtime_ambient_write()
    maybe_probe_fork_denial()
'''
text = text.replace(main_anchor, main_block)

request_anchor = """        input: JSON.stringify({ action: 'runtime_probe', fault: null }),
"""
if text.count(request_anchor) != 1:
    raise SystemExit("runtime-probe request anchor mismatch")
request_block = """        input: JSON.stringify({
          action: 'runtime_probe',
          fault: control?.runtime_probe_fault ?? null
        }),
"""
text = text.replace(request_anchor, request_block)

response_anchor = '''  const response = parseReceiptRuntimeProbeResult(
    result,
    label,
    interpreterLease
  );
'''
if text.count(response_anchor) != 1:
    raise SystemExit("runtime-probe event-recording anchor mismatch")
response_block = '''  const response = parseReceiptRuntimeProbeResult(
    result,
    label,
    interpreterLease
  );
  recordReceiptDirfdEvents(control, response.events);
'''
text = text.replace(response_anchor, response_block)

PATH.write_text(text)
