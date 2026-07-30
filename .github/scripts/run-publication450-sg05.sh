#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH='agent/publication-allowlist-poof-admission-v2'
REQUIRED_MAIN_ANCESTOR='c8415a769d03add67a92a3019794268bf5d1cb84'
CORRECTED_SG04_MERGE='8c5e592034effe30d644319e085f97e045060269'
EXPECTED_HEAD="${EXPECTED_HEAD:?EXPECTED_HEAD is required}"

test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
git fetch origin main
base="$(git rev-parse origin/main)"
git merge-base --is-ancestor "$REQUIRED_MAIN_ANCESTOR" "$base"
git merge-base --is-ancestor "$CORRECTED_SG04_MERGE" "$base"
transport_head="$EXPECTED_HEAD"
printf '%s\n' "$base" > /tmp/publication450-base-head

cat .github/tmp/publication450-transition-part-*.b64 | tr -d '\n\r\t ' > /tmp/publication450-transition.patch.xz.b64
printf '%s  %s\n' '0a183d23a2758756c34db7bcc7b7ca49252d1d56c2f085c414f892b6805e16d4' /tmp/publication450-transition.patch.xz.b64 | sha256sum --check --strict
base64 --decode /tmp/publication450-transition.patch.xz.b64 > /tmp/publication450-transition.patch.xz
printf '%s  %s\n' 'ebf222b838fd56cefcbd0cd4f67a1dcab6929a3242a0f2f6cdf90639dea6beb5' /tmp/publication450-transition.patch.xz | sha256sum --check --strict
xz --decompress --stdout /tmp/publication450-transition.patch.xz > /tmp/publication450-transition.patch
printf '%s  %s\n' '0e92647190e7a7b36f5a8488bf6ca9a5b9a789ada7bdfa7834bcd944fd6a77cb' /tmp/publication450-transition.patch | sha256sum --check --strict

cat .github/tmp/sg05-generator-part-*.b64 | tr -d '\n\r\t ' > /tmp/generate-sg05.py.xz.b64
printf '%s  %s\n' 'f611d47d35893d76119e6dc3f5797aac5767a73ec079ee833f0f96a05a51f0d8' /tmp/generate-sg05.py.xz.b64 | sha256sum --check --strict
base64 --decode /tmp/generate-sg05.py.xz.b64 > /tmp/generate-sg05.py.xz
printf '%s  %s\n' '6e260362c0f87bc71acab0d056e31ae72319020eebc5b08c5979066b086e7d31' /tmp/generate-sg05.py.xz | sha256sum --check --strict
xz --decompress --stdout /tmp/generate-sg05.py.xz > /tmp/generate-sg05.py
printf '%s  %s\n' '60f68eb56abb6afb19427150932b0b3fa21bcb90e543575965d4a18862f6801c' /tmp/generate-sg05.py | sha256sum --check --strict
chmod +x /tmp/generate-sg05.py

# Remove every old PR-450 transport/materializer byte before applying the frozen transition.
git reset --hard "$base"
git clean -fdx
git apply --check /tmp/publication450-transition.patch
git apply /tmp/publication450-transition.patch

cat > /tmp/publication-paths <<'PATHS'
.github/workflows/publication-integrity.yml
app.js
data/project/poof-clifford-constitutional-change-log.json
data/project/poof-clifford-ecology-contract.json
data/project/poof-clifford-ecology-release-manifest.json
data/project/publication-plan.json
docs/methods/status-aware-publication-allowlist.md
index.html
package.json
reports/audits/adversarial-release-integrity-failed-custody.md
reports/core-thesis/poof-clifford-ecology/data.json
reports/core-thesis/poof-clifford-ecology/methods/index.html
reports/core-thesis/poof-clifford-ecology/release-manifest.json
test/publication-manifest.test.js
test/publication-pages-browser.test.js
test/ui-contract.test.js
tools/build-pages.mjs
tools/build-standalone.mjs
tools/lib/publication-manifest.mjs
tools/validate-pages.mjs
tools/validate-publication-plan.mjs
PATHS
sort -o /tmp/publication-paths /tmp/publication-paths
git diff --name-only "$base" | sort > /tmp/observed-publication-paths
diff -u /tmp/publication-paths /tmp/observed-publication-paths
git diff --check

npm ci
node test/publication-manifest.test.js
npm run ci:poof-ecology
npm run build:pages
npm run build:standalone
npm run validate:pages
node test/ui-contract.test.js
npm install --no-save --no-package-lock playwright@1.55.0
npx playwright install --with-deps chromium
node test/publication-pages-browser.test.js

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Enforce status-aware publication allowlist'
transition_sha="$(git rev-parse HEAD)"
printf '%s\n' "$transition_sha" > /tmp/publication450-transition-head

# Append—not rewrite—the stable-ground successor required by receipt 006.
python /tmp/generate-sg05.py . "$transition_sha" "$CORRECTED_SG04_MERGE"
node tools/build-project-stable-ground-sg05.mjs
node tools/validate-project-stable-ground-sg05.mjs
node test/project-stable-ground-sg05.test.js
npm run release:check

# The generic compiler embeds only generated timestamps in these ten products.
# Verify that invariant before restoring their unrelated bytes from the publication transition.
python3 - <<'PY'
import subprocess
volatile = [
    'build/axm-identity.json',
    'build/build-hop-report.json',
    'build/hop-graph.json',
    'build/migration-review.md',
    'build/migration-summary.json',
    'build/receipt-graph.json',
    'build/scores.json',
    'build/scout-report.json',
    'build/scout-report.md',
    'build/surface-graph.json',
]
for path in volatile:
    diff = subprocess.run(['git','diff','--unified=0','--',path], check=True, text=True, capture_output=True).stdout
    if not diff:
        continue
    changed = [line[1:].strip() for line in diff.splitlines() if line.startswith(('+','-')) and not line.startswith(('+++','---'))]
    if len(changed) != 2 or not all(line.startswith('"generated": "') or line.startswith('Generated: ') for line in changed):
        raise RuntimeError(f'unexpected compiler drift in {path}: {changed}')
PY

git restore --source="$transition_sha" --worktree -- \
  build/axm-identity.json \
  build/build-hop-report.json \
  build/hop-graph.json \
  build/migration-review.md \
  build/migration-summary.json \
  build/receipt-graph.json \
  build/scores.json \
  build/scout-report.json \
  build/scout-report.md \
  build/surface-graph.json

# Stabilize the exact POOF and SG-05 derivative custody after the full release gate.
npm run ci:poof-ecology
node tools/build-project-stable-ground-sg05.mjs
node tools/validate-project-stable-ground-sg05.mjs
node test/project-stable-ground-sg05.test.js

cat > /tmp/final-paths <<'PATHS'
.github/workflows/project-stable-ground-sg05.yml
.github/workflows/publication-integrity.yml
app.js
data/project/poof-clifford-constitutional-change-log.json
data/project/poof-clifford-ecology-contract.json
data/project/poof-clifford-ecology-release-manifest.json
data/project/project-stable-ground-current.json
data/project/project-stable-ground-sg05-release-manifest.json
data/project/project-stable-ground-sg05.json
data/project/publication-plan.json
docs/methods/status-aware-publication-allowlist.md
docs/milestones/project-stable-ground-sg05.md
index.html
package.json
reports/audits/adversarial-release-integrity-failed-custody.md
reports/core-thesis/poof-clifford-ecology/data.json
reports/core-thesis/poof-clifford-ecology/methods/index.html
reports/core-thesis/poof-clifford-ecology/release-manifest.json
reports/core-thesis/stable-ground/sg05/checkpoint.json
reports/core-thesis/stable-ground/sg05/index.html
test/project-stable-ground-sg05.test.js
test/publication-manifest.test.js
test/publication-pages-browser.test.js
test/ui-contract.test.js
tools/build-pages.mjs
tools/build-project-stable-ground-sg05.mjs
tools/build-standalone.mjs
tools/lib/publication-manifest.mjs
tools/validate-pages.mjs
tools/validate-project-stable-ground-sg05.mjs
tools/validate-publication-plan.mjs
PATHS
sort -o /tmp/final-paths /tmp/final-paths
git diff --name-only "$base" | sort > /tmp/observed-final-paths
diff -u /tmp/final-paths /tmp/observed-final-paths
git diff --check

git add -A
git commit -m 'Append stable-ground supersession SG-05'

# Reproduce the final committed tree without changing a byte.
npm run ci:poof-ecology
node tools/build-project-stable-ground-sg05.mjs
node tools/validate-project-stable-ground-sg05.mjs
node test/project-stable-ground-sg05.test.js
npm run build:pages
npm run build:standalone
npm run validate:pages
node test/publication-pages-browser.test.js
git diff --check
git diff --exit-code
test -z "$(git status --porcelain)"

git push --force-with-lease=refs/heads/${BRANCH}:"$transport_head" origin HEAD:"$BRANCH"
