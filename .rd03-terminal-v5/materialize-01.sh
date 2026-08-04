rm -rf /tmp/rd03-census /tmp/rd03-census.zip
mkdir -p /tmp/rd03-census
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/artifacts/${CENSUS_ARTIFACT_ID}/zip" \
  --output /tmp/rd03-census.zip
test "$(sha256sum /tmp/rd03-census.zip | awk '{print $1}')" = "$CENSUS_ARTIFACT_SHA256"
unzip -q /tmp/rd03-census.zip -d /tmp/rd03-census
python - <<'PY'
import hashlib, json, pathlib
root=pathlib.Path('/tmp/rd03-census')
manifest=json.loads((root/'manifest.json').read_text())
assert manifest['schema_version']=='ssc-rd03-wave02-public-record-census-manifest@1'
assert manifest['entry_count']==263 and len(manifest['entries'])==263
assert len({row['path'] for row in manifest['entries']})==263
for row in manifest['entries']:
    rel=pathlib.PurePosixPath(row['path'])
    assert not rel.is_absolute() and '..' not in rel.parts
    data=(root/rel).read_bytes()
    assert len(data)==row['bytes']
    assert hashlib.sha256(data).hexdigest()==row['sha256']
combined=hashlib.sha256('\n'.join(f"{row['sha256']}  {row['path']}" for row in manifest['entries']).encode()).hexdigest()
assert combined==manifest['combined_sha256']=='0bcee2db7be4904f775c55a2533a2a5f1c199edff47e273993925b742f24ac06'
summary=json.loads((root/'summary.json').read_text())
assert summary['fixed_routes']==30 and summary['route_attempts']==30
assert summary['terminal_transport_states']=={'http_terminal_non_success':15,'http_success':15}
assert summary['candidate_rows']==150 and summary['unique_candidate_urls']==60
assert summary['official_candidate_urls']==5 and summary['first_party_candidate_urls']==1
assert summary['result_spawned_requests']==0 and summary['transport_census_complete'] is True
assert summary['substantive_adjudication_complete'] is False and summary['class_closed'] is False
assert sum(1 for path in root.rglob('*') if path.is_file())==264
print(f"RD-03 census verified: 263 entries plus manifest; {combined}")
PY

test ! -e "$CENSUS_DEST"
mkdir -p "$CENSUS_DEST"
cp -a /tmp/rd03-census/. "$CENSUS_DEST/"
while read -r digest authored_path; do
  source_path="${authored_path#./}"
  install -D -m 0644 "/tmp/rd03-authored/${source_path}" "${source_path}"
done < /tmp/rd03-authored-sha256.txt

mkdir -p "$(dirname "$EXECUTION_RECEIPT_PATH")"
cat > "$EXECUTION_RECEIPT_PATH" <<'JSON'
{
  "schema_version": "ssc-rd03-wave02-public-record-census-execution-receipt@1",
  "wave_id": "SSC-RD-W02",
  "class_id": "RD-03-C04",
  "issue": 788,
  "research_head": "e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4",
  "workflow_run": 30864413469,
  "job_id": 91853036710,
  "artifact_id": 8875551993,
  "artifact_name": "ssc-rd03-wave02-public-record-census-v1",
  "artifact_zip_sha256": "5b5414816cb626a7d9bbe16d914f67d5d02d1233c6ca0d84e21930909eba5f08",
  "manifest_entry_count": 263,
  "manifest_combined_sha256": "0bcee2db7be4904f775c55a2533a2a5f1c199edff47e273993925b742f24ac06",
  "counts": {"fixed_routes":30,"route_attempts":30,"http_success":15,"terminal_non_success":15,"candidate_result_rows":150,"unique_candidate_urls":60,"official_candidate_urls":5,"first_party_candidate_urls":1,"admitted_candidate_urls":0,"result_spawned_requests":0},
  "authority": {"outside_human_dependency":false,"external_contacts":0,"external_reviews":0,"substantive_adjudication_performed_by_census":false,"class_closed_by_census":false,"publication_effect":"none","adoption_effect":"none","graph_effect":"none"}
}
JSON

node tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs --write
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs

git add \
  "$CENSUS_DEST" "$EXECUTION_RECEIPT_PATH" "$PRODUCT_ROOT" "$CLOSURE_REFERENCE_PATH" \
  .github/workflows/status-sovereignty-rd-wave02-rd03-negotiated-terms.yml \
  docs/milestones/ssc-rd-wave02-rd03-negotiated-terms.md \
  schemas/status-sovereignty-rd-wave02-rd03-negotiated-terms.schema.json \
  test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js \
  tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs \
  tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
git diff --cached --name-only | sort > /tmp/rd03-product-paths.txt
test "$(wc -l < /tmp/rd03-product-paths.txt | tr -d ' ')" = '276'
test -z "$(git diff --cached --name-status | awk '$1 != "A" {print}')"
test -z "$(grep -E '(^|/)\.rd03-|temporary-ssc-rd03' /tmp/rd03-product-paths.txt || true)"
test "$(grep -c '^data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/source-custody/public-record-census-v1/' /tmp/rd03-product-paths.txt)" = '264'
git diff --cached --check
git commit -m 'Close RD-03 negotiated terms as source unavailable'
export PRODUCT_SHA="$(git rev-parse HEAD)"
test "$(git rev-parse HEAD^)" = "$INTEGRATION_SHA"
