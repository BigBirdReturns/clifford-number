#!/usr/bin/env bash
set -euo pipefail

on_exit() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    for log in /tmp/canonical-release.log /tmp/product-release.log /tmp/clean-release.log; do
      if [[ -s "$log" ]]; then
        echo "--- ${log} (tail) ---"
        tail -120 "$log" || true
      fi
    done
  fi
  exit "$status"
}
trap on_exit EXIT

: "${BASE_SHA:?}"
: "${BASE_TREE:?}"
: "${PAYLOAD_BRANCH:?}"
: "${CONTROLLER_BRANCH:?}"
: "${PRODUCT_BRANCH:?}"

git cat-file -e "$BASE_SHA^{commit}"
test "$(git rev-parse "$BASE_SHA^{tree}")" = "$BASE_TREE"
test "$(git rev-parse origin/main)" = "$BASE_SHA"
for index in 00 01 02 03; do
  git show "origin/$PAYLOAD_BRANCH:.github/temporary/no10-broad-adjacency-boundary.part-${index}.b64" > "/tmp/part-${index}.b64"
done
printf '%s  %s\n' \
  f57d0a6f8c1f99849b1fa028754c360287c82343966fa9254b1ffe2a14205d68 /tmp/part-00.b64 \
  958612402a9e58ba96fcced110a70a8a65c61468f721c761bf4fa7af50c68ea9 /tmp/part-01.b64 \
  cc58872b7b0f3a97decc4289dcfe9fef3142076e0aa95e09be4c1b8aa464b903 /tmp/part-02.b64 \
  35b28cacfde11588f9964b637b2277d39e926683740a5ee3370320a545416b59 /tmp/part-03.b64 \
  | sha256sum -c -
cat /tmp/part-{00,01,02,03}.b64 > /tmp/no10-boundary.patch.gz.b64
echo '335db0c2ce495b5b129bb843ab231a843d23ec16d84aea6c9c6f2440ffdfb4df  /tmp/no10-boundary.patch.gz.b64' | sha256sum -c -
base64 --decode /tmp/no10-boundary.patch.gz.b64 > /tmp/no10-boundary.patch.gz
echo 'daacbbb9957f6f04803215c2d5e8cb176c167faa96cbce18d75c70ee5aa55d0e  /tmp/no10-boundary.patch.gz' | sha256sum -c -
gzip -dc /tmp/no10-boundary.patch.gz > /tmp/no10-boundary.patch
echo 'f94d38d965da814e38f64f5ea661d5337212cc03caa3786adc6559594db7dee4  /tmp/no10-boundary.patch' | sha256sum -c -
git show "origin/$CONTROLLER_BRANCH:.github/temporary/no10-pages-validator.patch" > /tmp/no10-pages-validator.patch
echo 'dbe6ef6fe6116da0da9cc468b9a0eae1f49952409c79bdc0b863f45a4941f139  /tmp/no10-pages-validator.patch' | sha256sum -c -
git show "origin/$CONTROLLER_BRANCH:.github/temporary/no10-sg12-custody-repair.patch" > /tmp/no10-sg12-custody-repair.patch
echo '3d5be341ccbeaf364819232411d867e5bb3d2596171d6110ecbf9ffc01be6a21  /tmp/no10-sg12-custody-repair.patch' | sha256sum -c -
git worktree add --detach /tmp/canonical "$BASE_SHA"
git worktree add --detach /tmp/product "$BASE_SHA"

cd /tmp/canonical
npm run release:check > /tmp/canonical-release.log 2>&1
cp reports/core-thesis/answerable-power/data.json /tmp/canonical-answerable-power.json
echo 'CANONICAL_RELEASE_PASS true'

cd /tmp/product
git apply --index /tmp/no10-boundary.patch
git apply --index /tmp/no10-pages-validator.patch
git apply --index /tmp/no10-sg12-custody-repair.patch
cat > /tmp/source-paths.txt <<'PATHS'
README.md
data/canonical/actors.json
data/ledger/chains.jsonl
data/ledger/claims.jsonl
data/ledger/participation.jsonl
data/ledger/receipts.jsonl
data/ledger/surfaces.jsonl
data/research/clifford-cross-corpus-public-interest-map.json
docs/plain-language.md
docs/release-architecture.md
receipts/topology/gov-sage-89-ben-warner-no10-2021-05-13.md
receipts/topology/uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16.md
test/axm-id.test.js
test/compiler.test.js
test/narrate-hops.test.js
test/project-stable-ground-sg12.test.js
tools/lib/hops.mjs
tools/validate-pages.mjs
tools/validate-project-stable-ground-sg12.mjs
tools/validate-release.mjs
PATHS
sort /tmp/source-paths.txt -o /tmp/source-paths.txt
git diff --cached --name-only | sort > /tmp/staged-source-paths.txt
diff -u /tmp/source-paths.txt /tmp/staged-source-paths.txt
npm run release:check > /tmp/product-release.log 2>&1
cp reports/core-thesis/answerable-power/data.json /tmp/product-answerable-power.json
cmp /tmp/canonical-answerable-power.json /tmp/product-answerable-power.json

cat > /tmp/generated-paths.txt <<'PATHS'
build/axm-identity.json
build/build-hop-report.json
build/core-thesis/status-sovereignty/data.json
build/core-thesis/status-sovereignty/manifest.json
build/hop-graph.json
build/migration-review.md
build/migration-summary.json
build/receipt-graph.json
build/scores.json
build/scout-report.json
build/scout-report.md
build/surface-graph.json
data/project/project-stable-ground-sg12-release-manifest.json
data/project/status-sovereignty-release-manifest.json
reports/core-thesis/stable-ground/sg12/checkpoint.json
reports/core-thesis/stable-ground/sg12/index.html
reports/core-thesis/status-sovereignty/data.json
reports/core-thesis/status-sovereignty/index.html
PATHS
cat > /tmp/temporal-generated-paths.txt <<'PATHS'
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
PATHS
sort /tmp/generated-paths.txt -o /tmp/generated-paths.txt
sort /tmp/temporal-generated-paths.txt -o /tmp/temporal-generated-paths.txt
git diff --name-only | sort > /tmp/observed-generated-paths.txt
diff -u /tmp/generated-paths.txt /tmp/observed-generated-paths.txt
test -z "$(git ls-files --others --exclude-standard)"
git add --pathspec-from-file=/tmp/generated-paths.txt
cat /tmp/source-paths.txt /tmp/generated-paths.txt | sort > /tmp/product-paths.txt
git diff --cached --name-only | sort > /tmp/staged-product-paths.txt
diff -u /tmp/product-paths.txt /tmp/staged-product-paths.txt
git diff --cached --check

node - <<'NODE'
const fs = require('fs');
const hops = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const scout = JSON.parse(fs.readFileSync('build/scout-report.json', 'utf8'));
const participation = fs.readFileSync('data/ledger/participation.jsonl', 'utf8').trim().split('\n').length;
const receipts = fs.readFileSync('data/ledger/receipts.jsonl', 'utf8').trim().split('\n').length;
const surfaces = fs.readFileSync('data/ledger/surfaces.jsonl', 'utf8').trim().split('\n').length;
const obsoletePair = (hops.rejected_hop_pairs ?? []).find(item =>
  item.surface_id === 'no10-digital-data-advisory-2019-2021'
  && item.actor_a === 'dan-rosenfield'
  && item.actor_b === 'dominic-cummings');
const contextRefusal = (hops.rejected_hop_surfaces ?? []).find(item =>
  item.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021');
const contextEdge = hops.edges.some(edge => (edge.surfaces ?? []).some(surface =>
  surface.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021'));
const statusManifest = JSON.parse(fs.readFileSync('data/project/status-sovereignty-release-manifest.json', 'utf8'));
const sg12 = JSON.parse(fs.readFileSync('data/project/project-stable-ground-sg12.json', 'utf8'));
const sg12Manifest = JSON.parse(fs.readFileSync('data/project/project-stable-ground-sg12-release-manifest.json', 'utf8'));
if (hops.edges.length !== 27) throw new Error(`expected 27 hop edges, got ${hops.edges.length}`);
if (scout.findings.length !== 144) throw new Error(`expected 144 scout findings, got ${scout.findings.length}`);
if (participation !== 183) throw new Error(`expected 183 participation rows, got ${participation}`);
if (receipts !== 44) throw new Error(`expected 44 receipts, got ${receipts}`);
if (surfaces !== 21) throw new Error(`expected 21 surfaces, got ${surfaces}`);
if (obsoletePair !== undefined) throw new Error('obsolete Rosenfield/Cummings No. 10 refusal survived');
if (contextRefusal?.reason !== 'broad_institution_context_only') throw new Error('No. 10 context refusal is missing or stale');
if (contextEdge) throw new Error('No. 10 context was promoted into an actor edge');
if (statusManifest.combined_sha256 !== '1cf30cef50bc5f0e7b688dfea0da08ff8382ebb07acb71a61575283ca62f4cb2') throw new Error(`unexpected current SSC manifest ${statusManifest.combined_sha256}`);
if (sg12.trigger.checkpoint_status_release_sha256 !== '8e0e381911f99261af0b4e5a4c07a9eec364eeca58d4e657faf612c042eab327') throw new Error('SG-12 historical SSC receipt changed');
if (sg12.authority_change.status_release_sha256 !== sg12.trigger.checkpoint_status_release_sha256) throw new Error('SG-12 historical SSC receipt is internally inconsistent');
if (sg12Manifest.combined_sha256 !== '270ff29ca5bad03a4906096d53152429ed9a99c4e5ae3ec93576b0c9f2958112') throw new Error(`unexpected SG-12 manifest ${sg12Manifest.combined_sha256}`);
NODE

echo 'PRODUCT_RELEASE_PASS true'
echo 'ANSWERABLE_POWER_PROJECTION_STABLE true'
echo 'BROAD_INSTITUTION_REFUSAL_PASS true'

git config user.name 'BigBirdReturns'
git config user.email 'bigbirdreturns@proton.me'
git commit -m 'topology: retire broad No. 10 actor adjacency'
test "$(git rev-parse 'HEAD^')" = "$BASE_SHA"
git rev-parse HEAD > /tmp/product-commit.txt
git rev-parse 'HEAD^{tree}' > /tmp/product-tree.txt
git worktree add --detach /tmp/clean HEAD

cd /tmp/clean
npm run release:check > /tmp/clean-release.log 2>&1
cmp /tmp/canonical-answerable-power.json reports/core-thesis/answerable-power/data.json
git diff --name-only | sort > /tmp/clean-generated-paths.txt
diff -u /tmp/temporal-generated-paths.txt /tmp/clean-generated-paths.txt
for path in \
  build/core-thesis/status-sovereignty/data.json \
  build/core-thesis/status-sovereignty/manifest.json \
  data/project/project-stable-ground-sg12-release-manifest.json \
  data/project/status-sovereignty-release-manifest.json \
  reports/core-thesis/stable-ground/sg12/checkpoint.json \
  reports/core-thesis/stable-ground/sg12/index.html \
  reports/core-thesis/status-sovereignty/data.json \
  reports/core-thesis/status-sovereignty/index.html; do
  git diff --exit-code -- "$path"
done
test -z "$(git ls-files --others --exclude-standard)"
python - <<'PY'
import json
import re
import subprocess
from pathlib import Path

json_paths = [
    'build/axm-identity.json',
    'build/build-hop-report.json',
    'build/hop-graph.json',
    'build/migration-summary.json',
    'build/receipt-graph.json',
    'build/scores.json',
    'build/scout-report.json',
    'build/surface-graph.json',
]
markdown_paths = ['build/migration-review.md', 'build/scout-report.md']
for relative in json_paths:
    committed = json.loads(subprocess.check_output(['git', 'show', f'HEAD:{relative}'], text=True))
    rebuilt = json.loads(Path(relative).read_text())
    committed.pop('generated', None)
    rebuilt.pop('generated', None)
    if committed != rebuilt:
        raise SystemExit(f'non-temporal generated drift: {relative}')
for relative in markdown_paths:
    committed = subprocess.check_output(['git', 'show', f'HEAD:{relative}'], text=True)
    rebuilt = Path(relative).read_text()
    normalize = lambda value: re.sub(r'^Generated: .*$', 'Generated: <normalized>', value, count=1, flags=re.MULTILINE)
    if normalize(committed) != normalize(rebuilt):
        raise SystemExit(f'non-temporal generated drift: {relative}')
PY

git push origin "HEAD:refs/heads/$PRODUCT_BRANCH"
echo "PRODUCT_BRANCH $PRODUCT_BRANCH"
echo "PRODUCT_COMMIT $(cat /tmp/product-commit.txt)"
echo "PRODUCT_TREE $(cat /tmp/product-tree.txt)"
echo 'CLEAN_CHECKOUT_RELEASE_PASS true'
echo 'GENERATED_STATE_SEMANTIC_REPRODUCTION true'
