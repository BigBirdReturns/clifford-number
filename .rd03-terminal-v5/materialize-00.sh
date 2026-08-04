set -Eeuo pipefail

export RESEARCH_START_SHA="$(git rev-parse HEAD)"
test "$RESEARCH_START_SHA" = "$EXPECTED_RESEARCH_HEAD"
test "$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)" = "$EXPECTED_RESEARCH_HEAD"
git fetch --no-tags origin main
export MAIN_START_SHA="$(git rev-parse FETCH_HEAD)"
test "$MAIN_START_SHA" = "$EXPECTED_MAIN_HEAD"
node tools/validate-no-magic-human-gate.mjs

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git checkout -B rd03-permanent-integration "$MAIN_START_SHA"
git merge --no-ff --no-commit "$RESEARCH_START_SHA"
git diff --cached --name-only | sort > /tmp/rd03-integration-paths.txt
cat > /tmp/rd03-expected-integration-paths.txt <<'PATHS'
data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json
data/project/ssc-residual-wave02/seeds/RD-03-C04.json
test/status-sovereignty-rd-wave02-rd03-field-matrix.test.js
tools/acquisition/status-sovereignty-rd-wave02-rd03/build-field-matrix.mjs
tools/acquisition/status-sovereignty-rd-wave02-rd03/validate-field-matrix.mjs
PATHS
diff -u /tmp/rd03-expected-integration-paths.txt /tmp/rd03-integration-paths.txt
git diff --cached --check
git commit -m 'Integrate current main with RD-03 acquisition lineage'
export INTEGRATION_SHA="$(git rev-parse HEAD)"
test "$(git rev-list --parents -n1 "$INTEGRATION_SHA" | awk '{print NF-1}')" = '2'
test "$(git rev-parse "${INTEGRATION_SHA}^1")" = "$MAIN_START_SHA"
test "$(git rev-parse "${INTEGRATION_SHA}^2")" = "$RESEARCH_START_SHA"

git fetch origin "refs/heads/${CARRIER_BRANCH}:refs/remotes/origin/${CARRIER_BRANCH}"
rm -rf /tmp/rd03-authored /tmp/rd03-authored.b64 /tmp/rd03-authored.zip
mkdir -p /tmp/rd03-authored /tmp/rd03-shards
git ls-tree -r --name-only "origin/${CARRIER_BRANCH}" .rd03-terminal-v5/authored \
  | grep -E '^\.rd03-terminal-v5/authored/part-[0-9]{2}\.b64$' \
  | sort > /tmp/rd03-shard-paths.txt
test "$(wc -l < /tmp/rd03-shard-paths.txt | tr -d ' ')" = '6'
while read -r shard; do
  name="$(basename "$shard")"
  git show "origin/${CARRIER_BRANCH}:${shard}" > "/tmp/rd03-shards/${name}"
done < /tmp/rd03-shard-paths.txt
cat > /tmp/rd03-shard-sha256.txt <<'HASHES'
99a2247821f17995efcb33e10c9964fad7bd93306da5df078bbfe42a3817af41  /tmp/rd03-shards/part-00.b64
c95cd994c3edd55c60b67d14794f37454d7ec1989a47b74ac9b5b5b09850d813  /tmp/rd03-shards/part-01.b64
4d7c98d89315c00888c1a0c1335d9554f13adb06fdd7dd6697f004cf4b463039  /tmp/rd03-shards/part-02.b64
4c2778687051f2fe6952df2f055659ae53dfbaf30bcce750d0cec8d6098e4c6e  /tmp/rd03-shards/part-03.b64
e2215eb93ba56f47c71f40d15da1c478c5f3256a48070d869e2dda5be3ecfa5b  /tmp/rd03-shards/part-04.b64
3d232d6b164070ca7253ed07e8b7c4541a6e8ea3adb1c6f49830cbe1cf1c159d  /tmp/rd03-shards/part-05.b64
HASHES
sha256sum --check --strict /tmp/rd03-shard-sha256.txt
cat /tmp/rd03-shards/part-*.b64 > /tmp/rd03-authored.b64
test "$(wc -c < /tmp/rd03-authored.b64 | tr -d ' ')" = '25656'
test "$(sha256sum /tmp/rd03-authored.b64 | awk '{print $1}')" = '60c2f065ec38e4aec1bc5907e9108a1ea8f3c23f42e3d3eb6e807986be928350'
base64 --decode /tmp/rd03-authored.b64 > /tmp/rd03-authored.zip
test "$(wc -c < /tmp/rd03-authored.zip | tr -d ' ')" = '19242'
test "$(sha256sum /tmp/rd03-authored.zip | awk '{print $1}')" = '37c9bd3c4f9dc6456b92efe2d5841809e30988bfe237a1756100bea088e9ef3a'
unzip -t /tmp/rd03-authored.zip
unzip -q /tmp/rd03-authored.zip -d /tmp/rd03-authored
cat > /tmp/rd03-authored-sha256.txt <<'HASHES'
27fd04bde88341499b2ae8494a0b6a8126358f0f550315213ec0469fccaa7364  ./.github/workflows/status-sovereignty-rd-wave02-rd03-negotiated-terms.yml
5f90199a597cc92050ecc91b20076849de9f453cc369675fce97c67ea9c67a57  ./docs/milestones/ssc-rd-wave02-rd03-negotiated-terms.md
dfeea84c64828a8719e9fcf35ce6ffd5cd1f5be39a31fcc056b66d414399c4d5  ./schemas/status-sovereignty-rd-wave02-rd03-negotiated-terms.schema.json
22c47846a7aab3e86bad0958c41d9f2793480286c57336acda00988949dd4cbc  ./test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
05fc644ca63a9acb2b5b5c8e86883b2d73a954e8a06f796fe59c07389bf5b396  ./tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
299c63cf44f6b52aab31fb5ccac7353c2ae878eeeb79ff933d24af6ee8cef035  ./tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
HASHES
(cd /tmp/rd03-authored && sha256sum --check --strict /tmp/rd03-authored-sha256.txt)
test "$(find /tmp/rd03-authored -type f | wc -l | tr -d ' ')" = '6'
