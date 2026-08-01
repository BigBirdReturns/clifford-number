#!/usr/bin/env bash
set -euo pipefail

runner='tools/run-wave26-source-custody-repair-materializer.sh'
self='tools/run-wave26-source-custody-repair-materializer-v4.sh'

test -f "$runner"
python3 - <<'PY'
from pathlib import Path
path = Path('tools/run-wave26-source-custody-repair-materializer.sh')
text = path.read_text()
replacements = {
    "trigger='.github/tmp/wave26-source-custody-repair-trigger.json'": "trigger='.github/tmp/wave26-source-custody-repair-trigger-3.json'",
    "temporary_workflow='.github/workflows/temporary-wave26-source-custody-repair-materializer.yml'": "temporary_workflow='.github/workflows/temporary-wave26-source-custody-repair-materializer-retry3.yml'",
    "  LAW26_SC_SKIP_GIT=1 node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs\n": ""
}
for before, after in replacements.items():
    if before not in text:
        raise SystemExit(f'repair materializer marker absent: {before!r}')
    text = text.replace(before, after)
path.write_text(text)
PY
rm -f \
  "$self" \
  'tools/run-wave26-source-custody-repair-materializer-v2.sh' \
  'tools/run-wave26-source-custody-repair-materializer-v3.sh' \
  '.github/tmp/wave26-source-custody-repair-trigger-2.json'
exec bash "$runner"
