#!/usr/bin/env python3
import runpy
import subprocess
import sys
import traceback
from pathlib import Path


def emit_failure(detail):
    text = detail.strip() or 'materializer failed without diagnostic output'
    escaped = text[-3500:].replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print(text, file=sys.stderr, flush=True)
    print(f'::error title=topology materialization::{escaped}', flush=True)


repo_path = Path('tools/temp-materialize-topology-frontier.py')
source = None
for commit in subprocess.check_output(
    ['git', 'rev-list', '--first-parent', 'HEAD^'],
    text=True,
).splitlines():
    try:
        candidate = subprocess.check_output(
            ['git', 'show', f'{commit}:{repo_path.as_posix()}'],
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        continue
    if candidate.startswith(
        b'#!/usr/bin/env python3\nimport base64\nimport gzip\nimport json\nimport re\nimport subprocess\nfrom pathlib import Path\n'
    ):
        source = candidate
        break
if source is None:
    emit_failure('full topology materializer not found in first-parent ancestry')
    raise SystemExit(1)
repo_path.write_bytes(source)
try:
    subprocess.run(
        [sys.executable, 'tools/temp-repair-topology-payload.py'],
        check=True,
    )
    runpy.run_path(str(repo_path), run_name='__main__')
except BaseException as exc:
    emit_failure(''.join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    raise

print('temporary topology wrapper completed materialization', flush=True)
