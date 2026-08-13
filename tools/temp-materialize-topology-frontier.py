#!/usr/bin/env python3
import runpy
import subprocess
import sys
from pathlib import Path

path = Path(__file__)
source = subprocess.check_output(
    ['git', 'show', f'HEAD^:{path.as_posix()}'],
)
path.write_bytes(source)
subprocess.run(
    [sys.executable, 'tools/temp-repair-topology-payload.py'],
    check=True,
)
runpy.run_path(str(path), run_name='__main__')
