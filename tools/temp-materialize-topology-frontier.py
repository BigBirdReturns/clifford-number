#!/usr/bin/env python3
import runpy
import subprocess
import sys
from pathlib import Path

repo_path = Path('tools/temp-materialize-topology-frontier.py')
source = subprocess.check_output(
    ['git', 'show', f'HEAD^:{repo_path.as_posix()}'],
)
repo_path.write_bytes(source)
subprocess.run(
    [sys.executable, 'tools/temp-repair-topology-payload.py'],
    check=True,
)
runpy.run_path(str(repo_path), run_name='__main__')
