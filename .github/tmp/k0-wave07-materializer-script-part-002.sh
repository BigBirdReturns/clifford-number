ave-07.mjs
  node tools/validate-k0-role-neutral-wave-06.mjs
  node test/k0-role-neutral-wave-06.test.js
  node tools/validate-k0-role-neutral-wave-07.mjs
  node test/k0-role-neutral-wave-07.test.js
  node tools/build-k0-epistemic-admissibility.mjs
  node tools/validate-k0-epistemic-admissibility.mjs
  node test/k0-epistemic-admissibility.test.js
  node tools/validate-corpus-selection.mjs
  node tools/validate-consumption-contract.mjs
}

reconstruct_source
run_focused
npm run release:check

git restore --staged --worktree .
git clean -fd
reconstruct_source
run_focused

python - <<'PY'
from pathlib import Path
import hashlib, json, subprocess
paths = [
  '.github/workflows/k0-role-neutral-wave-07.yml',
  'data/project/k0-epistemic-admissibility-methodology.json',
  'data/project/k0-epistemic-admissibility-release-manifest.json',
  'data/project/k0-role-neutral-wave-06-release-manifest.jso