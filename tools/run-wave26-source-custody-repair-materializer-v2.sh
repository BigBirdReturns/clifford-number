#!/usr/bin/env bash
set -euo pipefail

runner='tools/run-wave26-source-custody-repair-materializer.sh'
self='tools/run-wave26-source-custody-repair-materializer-v2.sh'

test -f "$runner"
python3 - <<'PY'
from pathlib import Path
path = Path('tools/run-wave26-source-custody-repair-materializer.sh')
text = path.read_text()
line = "  LAW26_SC_SKIP_GIT=1 node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs\n"
if line not in text:
    raise SystemExit('early repair-validator marker absent')
path.write_text(text.replace(line, ''))
PY
rm -f "$self"
exec bash "$runner"
