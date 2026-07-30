#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH='agent/publication-allowlist-poof-admission-v2'
EXPECTED_BASE='0d701692fa83a405bd0ba86e7b45c525022589f7'
LOCAL_PUBLICATION_SHA='1991d4528cca0836be84469fb2115b3308b4dfa1'
EXPECTED_HEAD="${EXPECTED_HEAD:?EXPECTED_HEAD is required}"

test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
git fetch origin main
base="$(git rev-parse origin/main)"
test "$base" = "$EXPECTED_BASE"
transport_head="$EXPECTED_HEAD"

cat .github/tmp/publication-sg06-publication.part-*.b64 | tr -d '\n\r\t ' > /tmp/publication.patch.xz.b64
printf '%s  %s\n' '2175c03bd627aaf9e0ed31530e14bac60dd28807561692a1b7f42e251279b04d' /tmp/publication.patch.xz.b64 | sha256sum --check --strict
base64 --decode /tmp/publication.patch.xz.b64 > /tmp/publication.patch.xz
printf '%s  %s\n' 'a28622ad2c4aeb834e907d7a44dd95098e672e0594b4e59d5d1af5d750cd823d' /tmp/publication.patch.xz | sha256sum --check --strict
xz --decompress --stdout /tmp/publication.patch.xz > /tmp/publication.patch
printf '%s  %s\n' '4003b83ff0a2863dae3b83b0bc2bf92d26e95e411331052c9332b02038fc5d34' /tmp/publication.patch | sha256sum --check --strict

cat .github/tmp/publication-sg06-checkpoint.part-*.patch > /tmp/sg06.patch
printf '%s  %s\n' '0a2f358557c8c97e1ee6f3d5a8d565084ba3ee2f66c75c19bb3c7810ad103671' /tmp/sg06.patch | sha256sum --check --strict

volatile=(
  build/axm-identity.json
  build/build-hop-report.json
  build/hop-graph.json
  build/migration-review.md
  build/migration-summary.json
  build/receipt-graph.json
  build/scores.json
  build/scout-report.json
  build/scout-report.md
  build/surface-graph.json
)
restore_verified_volatile() {
  local source_ref="$1"
  python3 - <<'PY'
import subprocess
volatile=['build/axm-identity.json','build/build-hop-report.json','build/hop-graph.json','build/migration-review.md','build/migration-summary.json','build/receipt-graph.json','build/scores.json','build/scout-report.json','build/scout-report.md','build/surface-graph.json']
for path in volatile:
    diff=subprocess.run(['git','diff','--unified=0','--',path],check=True,text=True,capture_output=True).stdout
    if not diff: continue
    lines=[line[1:].strip() for line in diff.splitlines() if line.startswith(('+','-')) and not line.startswith(('+++','---'))]
    if len(lines)!=2 or not all(line.startswith('"generated": "') or line.startswith('Generated: ') for line in lines):
        raise RuntimeError(f'unexpected volatile compiler mutation in {path}: {lines}')
PY
  git restore --source="$source_ref" --worktree -- "${volatile[@]}"
  git diff --quiet -- "${volatile[@]}"
}

publication_paths=/tmp/publication-paths
cat > "$publication_paths" <<'PATHS'
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
test/status-sovereignty-compact.test.js
test/ui-contract.test.js
tools/build-pages.mjs
tools/build-standalone.mjs
tools/lib/publication-manifest.mjs
tools/validate-pages.mjs
tools/validate-publication-plan.mjs
PATHS
sort -o "$publication_paths" "$publication_paths"

sg06_paths=/tmp/sg06-paths
cat > "$sg06_paths" <<'PATHS'
.github/workflows/project-stable-ground-sg06.yml
data/project/project-stable-ground-current.json
data/project/project-stable-ground-governor.json
data/project/project-stable-ground-sg06-release-manifest.json
data/project/project-stable-ground-sg06.json
docs/milestones/project-stable-ground-sg06.md
reports/core-thesis/stable-ground/sg06/checkpoint.json
reports/core-thesis/stable-ground/sg06/index.html
test/project-stable-ground-sg06.test.js
tools/build-project-stable-ground-sg06.mjs
tools/validate-project-stable-ground-sg06.mjs
PATHS
sort -o "$sg06_paths" "$sg06_paths"

# Materialize the permanent publication transition.
git reset --hard "$base"
git clean -fdx
git apply --check /tmp/publication.patch
git apply /tmp/publication.patch
{ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$publication_paths" /tmp/observed
git diff --check

node test/publication-manifest.test.js
node test/ui-contract.test.js
node test/status-sovereignty-compact.test.js
node tools/build-poof-clifford-ecology.mjs
node tools/validate-poof-clifford-ecology.mjs
node test/poof-clifford-ecology.test.js
npm test
npm run build:pages
npm run build:standalone
npm run validate:publication
npm run validate:pages
restore_verified_volatile "$base"
{ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$publication_paths" /tmp/observed
git diff --check

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Enforce status-aware publication allowlist and stage POOF'
transition="$(git rev-parse HEAD)"

# Bind SG-06 to the real publication receipt, not the local construction hash.
sed -i "s/$LOCAL_PUBLICATION_SHA/$transition/g" /tmp/sg06.patch
git apply --check /tmp/sg06.patch
git apply /tmp/sg06.patch
npm run build:pages
npm run build:standalone
node tools/build-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
node tools/validate-project-stable-ground-sg06.mjs
npm run release:check

npm install --no-save --no-package-lock playwright@1.55.0
npx playwright install --with-deps chromium
node test/publication-pages-browser.test.js

# Release checks regenerate ten timestamp-only compiler products. Verify and restore them,
# then rebuild only the exact derivative custody that belongs to SG-06.
restore_verified_volatile "$transition"
node tools/build-poof-clifford-ecology.mjs
npm run build:pages
npm run build:standalone
node tools/build-project-stable-ground-sg06.mjs
node tools/validate-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
npm run validate:publication
npm run validate:pages
node test/publication-pages-browser.test.js

{ git diff --name-only "$transition"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$sg06_paths" /tmp/observed
git diff --check
git add -A
git commit -m 'Append stable-ground supersession SG-06'

# Prove the committed head reconstructs exactly without retaining transport.
npm run build:pages
npm run build:standalone
node tools/build-poof-clifford-ecology.mjs
node tools/build-project-stable-ground-sg06.mjs
node tools/validate-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
npm run validate:publication
npm run validate:pages
node test/publication-pages-browser.test.js
git diff --check
git diff --exit-code
test -z "$(git status --porcelain)"

git push --force-with-lease=refs/heads/${BRANCH}:"$transport_head" origin HEAD:"$BRANCH"
