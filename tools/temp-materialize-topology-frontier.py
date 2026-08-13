#!/usr/bin/env python3
import runpy
import subprocess
import sys
from pathlib import Path

repo_path = Path('tools/temp-materialize-topology-frontier.py')
source = None
for commit in subprocess.check_output(
    ['git', 'rev-list', '--first-parent', 'HEAD'],
    text=True,
).splitlines():
    try:
        candidate = subprocess.check_output(
            ['git', 'show', f'{commit}:{repo_path.as_posix()}'],
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        continue
    if b'def inherited_payload(name):' in candidate and b'FRONTIER_GZ_B64' in candidate:
        source = candidate
        break
if source is None:
    raise SystemExit('full topology materializer not found in first-parent ancestry')
repo_path.write_bytes(source)
subprocess.run(
    [sys.executable, 'tools/temp-repair-topology-payload.py'],
    check=True,
)
runpy.run_path(str(repo_path), run_name='__main__')
