npm run release:check
git restore --worktree -- .
git clean -fdx
node tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs --check
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --exit-code HEAD
test -z "$(git status --porcelain=v1 --untracked-files=all)"

test "$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)" = "$RESEARCH_START_SHA"
git fetch --no-tags origin main
test "$(git rev-parse FETCH_HEAD)" = "$MAIN_START_SHA"
git push origin "HEAD:refs/heads/${TARGET_BRANCH}" --force-with-lease="refs/heads/${TARGET_BRANCH}:${RESEARCH_START_SHA}"
test "$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)" = "$PRODUCT_SHA"

rm -rf /tmp/rd03-terminal-receipt
mkdir -p /tmp/rd03-terminal-receipt
cp /tmp/rd03-integration-paths.txt /tmp/rd03-terminal-receipt/integration-paths.txt
cp /tmp/rd03-product-paths.txt /tmp/rd03-terminal-receipt/product-paths.txt
cp /tmp/rd03-authored-sha256.txt /tmp/rd03-terminal-receipt/authored-sha256.txt
cp /tmp/rd03-shard-sha256.txt /tmp/rd03-terminal-receipt/shard-sha256.txt
cp "$EXECUTION_RECEIPT_PATH" /tmp/rd03-terminal-receipt/
cp "$PRODUCT_ROOT/class-receipt.json" "$PRODUCT_ROOT/manifest.json" "$PRODUCT_ROOT/summary.json" /tmp/rd03-terminal-receipt/
cp "$CLOSURE_REFERENCE_PATH" /tmp/rd03-terminal-receipt/closure-reference.json
cat > /tmp/rd03-terminal-receipt/materialization.json <<JSON
{
  "schema_version": "ssc-rd03-wave02-terminal-materialization-receipt@5",
  "main_first_parent": "$MAIN_START_SHA",
  "research_second_parent": "$RESEARCH_START_SHA",
  "integration_commit": "$INTEGRATION_SHA",
  "product_head": "$PRODUCT_SHA",
  "integration_paths": 5,
  "product_paths": 276,
  "total_permanent_increment_paths": 281,
  "temporary_paths": 0,
  "authored_base64_bytes": 25656,
  "authored_base64_sha256": "60c2f065ec38e4aec1bc5907e9108a1ea8f3c23f42e3d3eb6e807986be928350",
  "authored_zip_bytes": 19242,
  "authored_zip_sha256": "37c9bd3c4f9dc6456b92efe2d5841809e30988bfe237a1756100bea088e9ef3a",
  "authored_shards": 6,
  "terminal_state": "bounded_source_unavailable",
  "instruments": 5,
  "terminal_fields": 70,
  "observed_fields": 8,
  "conditional_term_only_fields": 15,
  "source_unavailable_fields": 47,
  "adversarial_mutations_refused": 94,
  "outside_human_dependency": false,
  "external_contacts": 0,
  "external_reviews": 0,
  "publication_effect": "none",
  "adoption_effect": "none",
  "graph_effect": "none"
}
JSON
