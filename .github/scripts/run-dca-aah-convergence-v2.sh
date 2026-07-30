#!/usr/bin/env bash
set -Eeuo pipefail

OLD_BRANCH="agent/dca-aah-convergence-20260729"
BRANCH="agent/dca-aah-convergence-20260729-v2"
SOURCE_RUNNER=".github/scripts/run-dca-aah-convergence.sh"
V2_WORKFLOW=".github/workflows/temporary-dca-aah-convergence-v2.yml"
V2_RUNNER=".github/scripts/run-dca-aah-convergence-v2.sh"
OLD_OBSERVER=".github/workflows/dca-aah-convergence-observer.yml"

if [[ -f "$SOURCE_RUNNER" ]]; then
  python - "$SOURCE_RUNNER" /tmp/run-dca-aah-convergence-v2.sh "$OLD_BRANCH" "$BRANCH" <<'PY'
from pathlib import Path
import sys

source, target, old_branch, new_branch = sys.argv[1:]
text = Path(source).read_text()
text = text.replace(old_branch, new_branch)
needle = "  .github/workflows/temporary-dca-aah-convergence.yml \\\n  .github/scripts/materialize-dca-aah-phase01.py \\\n  .github/scripts/run-dca-aah-convergence.sh\n"
replacement = "  .github/workflows/temporary-dca-aah-convergence.yml \\\n  .github/workflows/temporary-dca-aah-convergence-v2.yml \\\n  .github/workflows/dca-aah-convergence-observer.yml \\\n  .github/scripts/materialize-dca-aah-phase01.py \\\n  .github/scripts/run-dca-aah-convergence.sh \\\n  .github/scripts/run-dca-aah-convergence-v2.sh\n"
if needle not in text:
    raise SystemExit("v2 cleanup patch anchor missing")
text = text.replace(needle, replacement, 1)
Path(target).write_text(text)
PY
  chmod +x /tmp/run-dca-aah-convergence-v2.sh
  exec bash /tmp/run-dca-aah-convergence-v2.sh
fi

if [[ ! -f data/project/dca-aah-convergence-receipt.json || ! -f tools/build-dca-aah-program.mjs ]]; then
  echo 'neither convergence source runner nor a completed DCA/AAH product is present' >&2
  exit 1
fi

# The source branch completed before the v2 snapshot. Rebind only the branch-local
# receipt, remove transport, rebuild exact-byte custody, and publish the clean v2 head.
git config user.name 'clifford-number constitutional materializer'
git config user.email 'actions@users.noreply.github.com'
python - "$BRANCH" <<'PY'
import json
import sys
from pathlib import Path

branch = sys.argv[1]
path = Path('data/project/dca-aah-convergence-receipt.json')
data = json.loads(path.read_text())
data['branch'] = branch
data['checkpoint_id'] = 'DCA-AAH-CONV-2026-07-29-02'
path.write_text(json.dumps(data, indent=2) + '\n')
PY
rm -f -- "$V2_WORKFLOW" "$V2_RUNNER" "$OLD_OBSERVER" .github/workflows/temporary-dca-aah-convergence.yml
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
git add -A
if ! git diff --cached --quiet; then
  git commit -m 'Rebind validated DCA AAH convergence to race-free v2 branch'
fi
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
git diff --exit-code
test -z "$(git status --porcelain)"
git push origin "HEAD:${BRANCH}"
