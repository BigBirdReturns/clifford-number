#!/usr/bin/env bash
set -Eeuo pipefail

OLD_BRANCH="agent/dca-aah-convergence-20260729"
BRANCH="agent/dca-aah-convergence-20260729-v3"
SOURCE_MATERIALIZER=".github/scripts/materialize-dca-aah-phase01.py"
SOURCE_RUNNER=".github/scripts/run-dca-aah-convergence.sh"

repair_materializer() {
  python - "$SOURCE_MATERIALIZER" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
lines = text.splitlines()
replacement = [
    "const escapeHtml = (value) => String(value).replace(/[&<>\"']/g, (c) => {",
    "  if (c === '&') return '&amp;';",
    "  if (c === '<') return '&lt;';",
    "  if (c === '>') return '&gt;';",
    "  if (c === '\"') return '&quot;';",
    "  return '&#39;';",
    "});",
]
indices = [i for i, line in enumerate(lines) if line.startswith('const escapeHtml = ')]
if len(indices) != 1:
    raise SystemExit(f'expected one escapeHtml generator line, found {len(indices)}')
i = indices[0]
lines[i:i + 1] = replacement
path.write_text('\n'.join(lines) + '\n')
PY
}

if [[ -f "$SOURCE_RUNNER" && -f "$SOURCE_MATERIALIZER" ]]; then
  repair_materializer
  python - "$SOURCE_RUNNER" /tmp/run-dca-aah-convergence-v3.sh "$OLD_BRANCH" "$BRANCH" <<'PY'
from pathlib import Path
import sys

source, target, old_branch, new_branch = sys.argv[1:]
text = Path(source).read_text()
text = text.replace(old_branch, new_branch)
needle = "  .github/workflows/temporary-dca-aah-convergence.yml \\\n  .github/scripts/materialize-dca-aah-phase01.py \\\n  .github/scripts/run-dca-aah-convergence.sh\n"
replacement = "  .github/workflows/temporary-dca-aah-convergence.yml \\\n  .github/workflows/dca-aah-convergence-observer.yml \\\n  .github/workflows/temporary-dca-aah-convergence-v2.yml \\\n  .github/workflows/temporary-dca-aah-convergence-v3.yml \\\n  .github/scripts/materialize-dca-aah-phase01.py \\\n  .github/scripts/run-dca-aah-convergence.sh \\\n  .github/scripts/run-dca-aah-convergence-v2.sh \\\n  .github/scripts/run-dca-aah-convergence-v3.sh\n"
if needle not in text:
    raise SystemExit("v3 cleanup patch anchor missing")
text = text.replace(needle, replacement, 1)
source_head = 'POOF_SOURCE="$(git rev-parse "origin/${POOF_BRANCH}")"\n'
if source_head not in text:
    raise SystemExit('base-main insertion anchor missing')
text = text.replace(source_head, 'BASE_MAIN="$(git rev-parse origin/main)"\n' + source_head, 1)
Path(target).write_text(text)
PY
  chmod +x /tmp/run-dca-aah-convergence-v3.sh
  exec bash /tmp/run-dca-aah-convergence-v3.sh
fi

if [[ ! -f data/project/dca-aah-convergence-receipt.json || ! -f tools/build-dca-aah-program.mjs ]]; then
  echo 'neither source materializer nor a completed DCA/AAH product is present' >&2
  exit 1
fi

# Completed-product fallback: repair any stale generated escaper, rebind the
# branch-local receipt, remove every transport file, and rebuild custody.
git config user.name 'clifford-number constitutional materializer'
git config user.email 'actions@users.noreply.github.com'
python - "$BRANCH" <<'PY'
import json
import sys
from pathlib import Path

branch = sys.argv[1]
receipt_path = Path('data/project/dca-aah-convergence-receipt.json')
receipt = json.loads(receipt_path.read_text())
receipt['branch'] = branch
receipt['checkpoint_id'] = 'DCA-AAH-CONV-2026-07-29-03'
receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')

builder_path = Path('tools/build-dca-aah-program.mjs')
text = builder_path.read_text()
lines = text.splitlines()
indices = [i for i, line in enumerate(lines) if line.startswith('const escapeHtml = ')]
if len(indices) == 1 and '=> ({' in lines[indices[0]]:
    i = indices[0]
    lines[i:i + 1] = [
        "const escapeHtml = (value) => String(value).replace(/[&<>\"']/g, (c) => {",
        "  if (c === '&') return '&amp;';",
        "  if (c === '<') return '&lt;';",
        "  if (c === '>') return '&gt;';",
        "  if (c === '\"') return '&quot;';",
        "  return '&#39;';",
        "});",
    ]
    builder_path.write_text('\n'.join(lines) + '\n')
PY
rm -f -- \
  .github/workflows/temporary-dca-aah-convergence.yml \
  .github/workflows/dca-aah-convergence-observer.yml \
  .github/workflows/temporary-dca-aah-convergence-v2.yml \
  .github/workflows/temporary-dca-aah-convergence-v3.yml \
  .github/scripts/run-dca-aah-convergence-v2.sh \
  .github/scripts/run-dca-aah-convergence-v3.sh
node --check tools/build-dca-aah-program.mjs
node --check tools/validate-dca-aah-program.mjs
node --check test/dca-aah-program.test.js
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
git add -A
if ! git diff --cached --quiet; then
  git commit -m 'Repair and rebind validated DCA AAH convergence on v3'
fi
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
git diff --exit-code
test -z "$(git status --porcelain)"
git push origin "HEAD:${BRANCH}"
