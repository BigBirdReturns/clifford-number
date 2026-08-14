#!/usr/bin/env bash
set -euo pipefail
RECEIPT_DIR=/tmp/ssc-rd01-wave03-promotion-materializer-receipt
rm -rf "$RECEIPT_DIR"
mkdir -p "$RECEIPT_DIR"
exec > >(tee "$RECEIPT_DIR/materializer.log") 2>&1
trap 'rc=$?; printf "exit_code: %s\nrun_id: %s\nhead_sha: %s\n" "$rc" "${GITHUB_RUN_ID:-}" "${GITHUB_SHA:-}" > "$RECEIPT_DIR/status.txt"; trap - EXIT; exit "$rc"' EXIT
export EXPECTED_BASE=fd34ca0a2726ff6972ccbc32ea7e5e13101b161b
export CANDIDATE_BRANCH=candidate/newsuk-times-exploraition-launch-principals-v1
set -euo pipefail

base64 -d .github/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs.gz.b64 \
  | gzip -d > /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs
echo '4ed77e65c75fd05b940298e5e921a3655c7ac5636bc59d7b1bf992e742a6ef12  /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs' | sha256sum -c -
node --check /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs

git fetch --no-tags origin main
BASE_SHA="$(git rev-parse origin/main)"
test "$BASE_SHA" = "$EXPECTED_BASE"
test -z "$(git ls-remote origin "refs/heads/$CANDIDATE_BRANCH")"

rm -rf /tmp/newsuk-times-exploraition-launch-principals-product
git worktree add --detach /tmp/newsuk-times-exploraition-launch-principals-product "$BASE_SHA"
cd /tmp/newsuk-times-exploraition-launch-principals-product
git checkout -B "$CANDIDATE_BRANCH"
test -z "$(git status --porcelain)"

node /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs

python3 - <<'PY'
import json
from pathlib import Path

def read_json(path):
    return json.loads(Path(path).read_text())

def count_jsonl(path):
    return sum(1 for line in Path(path).read_text().splitlines() if line.strip())

path = Path('data/research/clifford-cross-corpus-public-interest-map.json')
doc = read_json(path)
scout_count = len(read_json('build/scout-report.json').get('findings', []))
canonical = doc['inventory']['canonical']
canonical['actors'] = len(read_json('data/canonical/actors.json')['actors'])
canonical['organizations'] = len(read_json('data/canonical/organizations.json')['organizations'])
canonical['surfaces'] = count_jsonl('data/ledger/surfaces.jsonl')
canonical['participations'] = count_jsonl('data/ledger/participation.jsonl')
canonical['receipts'] = count_jsonl('data/ledger/receipts.jsonl')
canonical['compiled_hop_edges'] = len(read_json('build/hop-graph.json').get('edges', []))
doc['inventory']['discovery_queue']['scout_findings'] = scout_count
lane = next(row for row in doc['lanes'] if row['lane_id'] == 'official-research-fanout')
lane['counts']['scout_findings'] = scout_count
path.write_text(json.dumps(doc, indent=2) + '\n')
PY

npm run release:check

node --input-type=module <<'NODE'
import fs from 'node:fs';
import { buildAdjacency, shortestPath } from './tools/lib/hops.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const jsonl = p => fs.readFileSync(p, 'utf8')
  .split(/\r?\n/).filter(Boolean).map(JSON.parse);
const pair = edge => [edge.actor_a, edge.actor_b].sort().join('|');
const surfaceId = 'newsuk-times-exploraition-launch-publication-principals-2026-04-27';
const receiptId = 'newsuk-times-exploraition-launch-publication-principals-2026-04-27';
const expectedActors = [
  'alex-cooper',
  'caroline-tredget-news-uk',
  'luke-costello-news-uk',
].sort();
const expectedOrganizations = ['electric-twin', 'news-uk'].sort();
const expectedPairs = [
  'alex-cooper|caroline-tredget-news-uk',
  'alex-cooper|luke-costello-news-uk',
  'caroline-tredget-news-uk|luke-costello-news-uk',
].sort();

const actors = json('data/canonical/actors.json').actors;
const organizations = json('data/canonical/organizations.json').organizations;
const surfaces = jsonl('data/ledger/surfaces.jsonl');
const parts = jsonl('data/ledger/participation.jsonl');
const receipts = jsonl('data/ledger/receipts.jsonl');
const claims = jsonl('data/ledger/claims.jsonl');
const hop = json('build/hop-graph.json');
const scores = json('build/scores.json');

assert(actors.length === 169, `actor count drift: ${actors.length}`);
assert(organizations.length === 32, `organization count drift: ${organizations.length}`);
assert(surfaces.length === 51, `surface count drift: ${surfaces.length}`);
assert(parts.length === 275, `participation count drift: ${parts.length}`);
assert(receipts.length === 70, `receipt count drift: ${receipts.length}`);
assert(claims.length === 38, `claim count drift: ${claims.length}`);
assert(hop.edges.length === 90, `hop edge count drift: ${hop.edges.length}`);

const surface = surfaces.find(row => row.surface_id === surfaceId);
assert(surface?.hop_eligible === true, 'launch-principals surface is not hop eligible');
assert(surface?.time_start === '2026-04-27' && surface?.time_end === '2026-04-27',
  'launch-principals surface date drift');
const surfaceParts = parts.filter(row => row.surface_id === surfaceId);
assert(JSON.stringify(surfaceParts.filter(row => row.participant_type === 'actor')
  .map(row => row.actor_id).sort()) === JSON.stringify(expectedActors),
  'launch-principals actor denominator drift');
assert(JSON.stringify(surfaceParts.filter(row => row.participant_type === 'organization')
  .map(row => row.organization_id).sort()) === JSON.stringify(expectedOrganizations),
  'launch-principals organization denominator drift');

const edges = hop.edges.filter(edge =>
  edge.surfaces.some(basis => basis.surface_id === surfaceId));
assert(edges.length === 3, 'expected exactly three launch-principals edges');
assert(JSON.stringify(edges.map(pair).sort()) === JSON.stringify(expectedPairs),
  'launch-principals pair-set drift');
for (const edge of edges) {
  assert(edge.evidence_weight === 1.25, 'launch-principals edge weight drift');
  const basis = edge.surfaces.find(row => row.surface_id === surfaceId);
  assert(basis?.evidence_class === 'primary_public',
    'launch-principals basis evidence drift');
  assert(JSON.stringify(basis?.receipt_ids) === JSON.stringify([receiptId]),
    'launch-principals basis receipt drift');
}

assert(parts.filter(row =>
  row.surface_id === 'electric-twin-newsuk-synthetic-audience'
    && row.participant_type === 'actor').length === 0,
  'organization-only News UK deployment acquired actors');

const receipt = receipts.find(row => row.receipt_id === receiptId);
assert(receipt?.archive?.ref ===
  'sha256:302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87', 'receipt digest drift');
assert(receipt?.attributed_statement_count === 3, 'statement count drift');
assert(receipt?.publication_coappearance_only === true,
  'publication scope drift');
assert(receipt?.physical_coattendance_established === false
  && receipt?.shared_meeting_established === false,
  'attendance or meeting boundary drift');

const topology = buildAdjacency(hop.edges);
for (const actorId of ['caroline-tredget-news-uk', 'luke-costello-news-uk']) {
  const actor = scores.actors.find(row => row.actor_id === actorId);
  assert(actor?.clifford_number === 4, `${actorId} score drift`);
  const route = shortestPath(topology, actorId, 'matt-clifford');
  assert(route.number === 4, `${actorId} route length drift`);
  assert(JSON.stringify(route.actor_path.slice(0, 3))
    === JSON.stringify([actorId, 'alex-cooper', 'ben-warner']),
    `${actorId} route prefix drift`);
  assert(route.actor_path.at(-1) === 'matt-clifford',
    `${actorId} route target drift`);
  assert(shortestPath(topology, actorId, 'matt-clifford', {
    asOf: '2026-04-27',
  }).number === null, `${actorId} received a false contemporaneous route`);
}
NODE

echo '302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87  receipts/topology/newsuk-times-exploraition-launch-publication-principals-2026-04-27.md' | sha256sum -c -

git add -A
git diff --cached --check
test -z "$(git diff --cached --diff-filter=D --name-only)"

cat > /tmp/expected-paths <<'EOF'
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
data/canonical/actors.json
data/canonical/aliases.json
data/ledger/claims.jsonl
data/ledger/participation.jsonl
data/ledger/receipts.jsonl
data/ledger/surfaces.jsonl
data/research/clifford-cross-corpus-public-interest-map.json
receipts/topology/newsuk-times-exploraition-launch-publication-principals-2026-04-27.md
test/compiler.test.js
tools/validate-release.mjs
EOF
sort -o /tmp/expected-paths /tmp/expected-paths
git diff --cached --name-only | sort > /tmp/actual-paths
diff -u /tmp/expected-paths /tmp/actual-paths
if grep -E '(^|/)\.github(/|$)' /tmp/actual-paths; then
  echo 'transport path entered permanent product' >&2
  exit 1
fi

git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$BASE_SHA"
test -z "$(git ls-remote origin "refs/heads/$CANDIDATE_BRANCH")"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'topology: admit Times ExplorAItion launch-publication principals'
test "$(git rev-list --count "$BASE_SHA"..HEAD)" = '1'
test "$(git rev-parse HEAD^)" = "$BASE_SHA"
git push origin "HEAD:refs/heads/$CANDIDATE_BRANCH"

{
  echo '## Qualified Times ExplorAItion launch-publication principals'
  echo
  echo '```text'
  echo "commit $(git rev-parse HEAD)"
  echo "tree   $(git rev-parse HEAD^{tree})"
  echo "parent $(git rev-parse HEAD^)"
  echo 'delta  actors +2 | organizations +0 | surfaces +1 | participation +5 | receipts +1 | claims +2 | edges +3'
  echo '```'
} >> "$GITHUB_STEP_SUMMARY"

printf 'base: %s\ncandidate_branch: %s\ncandidate_commit: %s\ncandidate_tree: %s\ncandidate_parent: %s\nreceipt_sha256: %s\n' \
  "$BASE_SHA" "$CANDIDATE_BRANCH" "$(git rev-parse HEAD)" "$(git rev-parse HEAD^{tree})" "$(git rev-parse HEAD^)" \
  '302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87' \
  > "$RECEIPT_DIR/product.txt"
cp /tmp/expected-paths "$RECEIPT_DIR/expected-paths.txt"
cp /tmp/actual-paths "$RECEIPT_DIR/actual-paths.txt"
