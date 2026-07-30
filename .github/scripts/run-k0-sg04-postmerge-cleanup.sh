#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH='agent/k0-sg04-postmerge-cleanup'
SG04_MERGE='4335ccf527099d7747a037f86b9d5cf22866e58d'
EXPECTED_HEAD="${EXPECTED_HEAD:?EXPECTED_HEAD is required}"

volatile_paths=(
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

restore_verified_volatile_products() {
  local source_ref="$1"
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
        raise RuntimeError(f'unexpected volatile compiler diff in {path}: {changed}')
PY
  git restore --source="$source_ref" --worktree -- "${volatile_paths[@]}"
  git diff --quiet -- "${volatile_paths[@]}"
}

test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
git fetch origin main
base="$(git rev-parse origin/main)"
git merge-base --is-ancestor "$SG04_MERGE" "$base"
transport_head="$EXPECTED_HEAD"
printf '%s\n' "$base" > /tmp/base-head

cat .github/tmp/k0-cleanhouse-patch-*.b64 | tr -d '\n\r\t ' > /tmp/k0-cleanhouse.patch.xz.b64
printf '%s  %s\n' '47bd6acd94178ed3927616f37b43333ba9337ac70060c691dde2de0da7d93fb5' /tmp/k0-cleanhouse.patch.xz.b64 | sha256sum --check --strict
base64 --decode /tmp/k0-cleanhouse.patch.xz.b64 > /tmp/k0-cleanhouse.patch.xz
printf '%s  %s\n' 'a412b62f9693ef5cd53648366cb3601fd07ee809cf7be43b4f75b8b78ed51248' /tmp/k0-cleanhouse.patch.xz | sha256sum --check --strict
xz --decompress --stdout /tmp/k0-cleanhouse.patch.xz > /tmp/k0-cleanhouse.patch
printf '%s  %s\n' '1f74b83e2f373df64317f36c70ffea921eae22e0f94ea815cdc80429ce4d3d9d' /tmp/k0-cleanhouse.patch | sha256sum --check --strict

git reset --hard "$base"
git apply --check /tmp/k0-cleanhouse.patch
git apply /tmp/k0-cleanhouse.patch
restore_verified_volatile_products "$base"

cat > /tmp/expected-initial-paths <<'EOF'
data/project/k0-epistemic-admissibility-release-manifest.json
data/project/k0-role-neutral-wave-08-release-manifest.json
data/project/project-stable-ground-sg04-release-manifest.json
data/project/project-stable-ground-sg04.json
data/research/corpus-coverage.json
data/research/k0-role-neutral-denominator.json
data/research/k0-role-neutral-wave-08.json
data/research/selection-adversarial-reviews.json
docs/milestones/m05-k0-role-neutral-wave-08.md
docs/milestones/project-stable-ground-sg04.md
reports/core-thesis/answerable-power/k0-role-neutral-wave-08.html
reports/core-thesis/answerable-power/k0-role-neutral-wave-08.json
reports/core-thesis/answerable-power/k0.html
reports/core-thesis/answerable-power/k0.json
reports/core-thesis/stable-ground/sg04/checkpoint.json
reports/core-thesis/stable-ground/sg04/index.html
test/k0-epistemic-admissibility.test.js
test/k0-role-neutral-wave-08.test.js
tools/validate-k0-epistemic-admissibility.mjs
tools/validate-k0-role-neutral-wave-08.mjs
tools/validate-project-stable-ground-sg04.mjs
EOF
sort -o /tmp/expected-initial-paths /tmp/expected-initial-paths
git diff --name-only "$base" | sort > /tmp/observed-paths
diff -u /tmp/expected-initial-paths /tmp/observed-paths
git diff --check

node tools/build-k0-role-neutral-wave-08.mjs
node tools/validate-k0-role-neutral-wave-08.mjs
node test/k0-role-neutral-wave-08.test.js
node tools/build-k0-epistemic-admissibility.mjs
node tools/validate-k0-epistemic-admissibility.mjs
node test/k0-epistemic-admissibility.test.js
node tools/build-poof-clifford-ecology.mjs
node tools/validate-poof-clifford-ecology.mjs
node test/poof-clifford-ecology.test.js
node tools/build-project-stable-ground-sg04.mjs
node tools/validate-project-stable-ground-sg04.mjs
node test/project-stable-ground-sg04.test.js
npm run release:check

restore_verified_volatile_products "$base"

cp /tmp/expected-initial-paths /tmp/expected-final-paths
cat >> /tmp/expected-final-paths <<'EOF'
data/project/poof-clifford-ecology-release-manifest.json
reports/core-thesis/poof-clifford-ecology/release-manifest.json
EOF
sort -o /tmp/expected-final-paths /tmp/expected-final-paths
git diff --name-only "$base" | sort > /tmp/observed-paths
diff -u /tmp/expected-final-paths /tmp/observed-paths
git diff --check

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Deduplicate K0 Wave 08 and refresh SG-04 custody'

node tools/build-k0-role-neutral-wave-08.mjs
node tools/validate-k0-role-neutral-wave-08.mjs
node test/k0-role-neutral-wave-08.test.js
node tools/build-k0-epistemic-admissibility.mjs
node tools/validate-k0-epistemic-admissibility.mjs
node test/k0-epistemic-admissibility.test.js
node tools/build-poof-clifford-ecology.mjs
node tools/validate-poof-clifford-ecology.mjs
node test/poof-clifford-ecology.test.js
node tools/build-project-stable-ground-sg04.mjs
node tools/validate-project-stable-ground-sg04.mjs
node test/project-stable-ground-sg04.test.js
git diff --check
git diff --exit-code
test -z "$(git status --porcelain)"

git push --force-with-lease=refs/heads/${BRANCH}:"$transport_head" origin HEAD:"$BRANCH"
