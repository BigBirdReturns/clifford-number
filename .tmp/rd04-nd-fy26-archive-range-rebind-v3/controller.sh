#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
EXPECTED_PARENT="8482b941aa0b1ecac685ab6ca98bba80ed80c5ee"
PRE_REPAIR_PARENT="4edc3f4f65851cf2643e889d93df3b6372a2f468"
REPAIR_PRODUCT="55ca847cb8ac32b79e49bd3c3c7879b19669ac3a"
REPAIR_PATH="data/research/clifford-cross-corpus-public-interest-map.json"
MATRIX_PATH="data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json"
EXPECTED_MATRIX_BLOB="19357f8214ab2710bc5e75b3fae8c7fb09ff1654"
EXPECTED_CELL_SHA256="cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe"
CONTROLLER_PATH=".tmp/rd04-nd-fy26-archive-range-rebind-v3/controller.sh"
WORKFLOW_PATH=".github/workflows/temp-rd04-nd-fy26-archive-range-rebind-v3.yml"
TRIGGER_PATH=".tmp/rd04-nd-fy26-archive-range-rebind-v3/trigger.json"
PRIOR_ARTIFACT_ID=9041062191
PRIOR_ARTIFACT_BYTES=9655
PRIOR_ARTIFACT_SHA256="a7e5652f8526b125732ef32ef0ce0c4fb975c3275b24b0f30d675b03c07462d3"
PRIOR_RECEIPT_SHA256="b7576800378936d9cda7a4f177683c0ce40862b048a65c200a992d3a5706da31"
RANGE_CORRECTION_SHA256="9b92e38f38af1c381fb45637f42c4a76d2d073766e7ffc2bf033d9d3dc61f9e0"
FIELD_ADJUDICATION_SHA256="639b1e6ca558ec64ff4c7270e71b8a15a7be4eff599763a91bfc1531acdc03bb"
SELECTED_PROTOCOL_SHA256="3110bf43b37ae4a6aa28c64693a1ce1f33277062e718b0fc91113e7107b51dd6"
MEMBER_INVENTORY_SHA256="fb3ceefb8a04e1f2aec56b55d77f7feb492b9ffcf84450ab36f936d7f7681fe0"
ROUTE_ID="RD04-ND-FY2026-REQUEST-SUPPORT-ZIP-MI-NM-ORIGIN-001"
ROUTE_URL="https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-MI-NM-7-2026.zip"
OUT="${RUNNER_TEMP}/ssc-rd04-nd-fy26-archive-range-current-main-rebind-v3"
TMP="${RUNNER_TEMP}/ssc-rd04-nd-fy26-archive-range-current-main-rebind-v3-work"
rm -rf "$OUT" "$TMP"
mkdir -p "$OUT" "$TMP/prior"
printf '%s\n' topology > "$OUT/STAGE"
printf '%s\n' 1 > "$OUT/EXIT_CODE"

seal_checksums() {
  (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%P\0' | sort -z | xargs -0 sha256sum > SHA256SUMS)
}

fail() {
  local stage="$1" reason="$2"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  printf '%s\n' 1 > "$OUT/EXIT_CODE"
  python - "$OUT/receipt.json" "$stage" "$reason" <<'PY'
import json,sys
path,stage,reason=sys.argv[1:]
obj={
  "schema_version":"ssc-rd04-nd-fy26-archive-range-current-main-rebind-receipt@1",
  "state":"failed_closed","failed_or_final_stage":stage,"exit_code":1,
  "reason":reason,"source_requests":0,"route_executions":0,"source_admissions":0,
  "field_decisions":0,"promotion_candidates":0,"held_open_fields":0,
  "selected_followup_routes":0,"field_terminalizations":0,"matrix_updates":0,
  "row_state_mutations":0,"class_closed":False,"cumulative_ledger_effect":"none",
  "outside_human_dependency":False,"publication_effect":"none","adoption_effect":"none",
  "graph_effect":"none","additional_execution_authorized":False
}
open(path,'w',encoding='utf-8').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
  seal_checksums
  exit 1
}

[[ "${EVENT_NAME:-}" == "pull_request" ]] || fail topology event_not_pull_request
[[ "${HEAD_REPO:-}" == "$REPO" ]] || fail topology head_repository_mismatch
[[ "${HEAD_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || fail topology invalid_head_sha
[[ "${BASE_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || fail topology invalid_base_sha
[[ "$(git rev-parse HEAD)" == "$HEAD_SHA" ]] || fail topology checkout_head_mismatch
[[ "$(git rev-parse HEAD^)" == "$BASE_SHA" ]] || fail topology trigger_parent_mismatch
CONTROLLER_COMMIT="$(git rev-parse "$BASE_SHA^")"
[[ "$(git rev-parse "$CONTROLLER_COMMIT^")" == "$EXPECTED_PARENT" ]] || fail topology controller_parent_mismatch
mapfile -t controller_paths < <(git diff --name-only "$EXPECTED_PARENT" "$CONTROLLER_COMMIT")
mapfile -t workflow_paths < <(git diff --name-only "$CONTROLLER_COMMIT" "$BASE_SHA")
mapfile -t trigger_paths < <(git diff --name-only "$BASE_SHA" "$HEAD_SHA")
[[ ${#controller_paths[@]} -eq 1 && "${controller_paths[0]}" == "$CONTROLLER_PATH" ]] || fail topology controller_path_denominator_mismatch
[[ ${#workflow_paths[@]} -eq 1 && "${workflow_paths[0]}" == "$WORKFLOW_PATH" ]] || fail topology workflow_path_denominator_mismatch
[[ ${#trigger_paths[@]} -eq 1 && "${trigger_paths[0]}" == "$TRIGGER_PATH" ]] || fail topology trigger_path_denominator_mismatch
[[ "$(git rev-parse "$CONTROLLER_COMMIT:$CONTROLLER_PATH")" == "$(git hash-object "$CONTROLLER_PATH")" ]] || fail topology controller_blob_mismatch

git fetch --quiet origin main
LIVE_MAIN="$(git rev-parse origin/main)"
[[ "$LIVE_MAIN" == "$EXPECTED_PARENT" ]] || fail topology live_main_moved
mapfile -t merge_parents < <(git show -s --format='%P' "$EXPECTED_PARENT" | tr ' ' '\n')
[[ ${#merge_parents[@]} -eq 2 ]] || fail topology repair_merge_parent_count_mismatch
[[ "${merge_parents[0]}" == "$PRE_REPAIR_PARENT" ]] || fail topology repair_merge_first_parent_mismatch
[[ "${merge_parents[1]}" == "$REPAIR_PRODUCT" ]] || fail topology repair_merge_second_parent_mismatch
[[ "$(git rev-parse "$EXPECTED_PARENT^{tree}")" == "$(git rev-parse "$REPAIR_PRODUCT^{tree}")" ]] || fail topology repair_merge_tree_mismatch
mapfile -t repair_paths < <(git diff --name-only "$PRE_REPAIR_PARENT" "$EXPECTED_PARENT")
[[ ${#repair_paths[@]} -eq 1 && "${repair_paths[0]}" == "$REPAIR_PATH" ]] || fail topology repair_path_denominator_mismatch
LIVE_MATRIX_BLOB="$(git rev-parse "origin/main:$MATRIX_PATH")"
[[ "$LIVE_MATRIX_BLOB" == "$EXPECTED_MATRIX_BLOB" ]] || fail topology live_matrix_blob_moved
python - "$MATRIX_PATH" "$EXPECTED_CELL_SHA256" > "$OUT/current-cell-proof.json" <<'PY'
import hashlib,json,sys
path,expected=sys.argv[1:]
doc=json.load(open(path,encoding='utf-8'))
rows=[r for r in doc['rows'] if r.get('unit_id')=='US-STATE-ND']
assert len(rows)==1
row=rows[0]
cells=[c for c in row['cells'] if c.get('field_id')=='abawd_or_work_requirement_waiver_state_and_governing_period']
assert len(cells)==1
cell=cells[0]
raw=json.dumps(cell,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
digest=hashlib.sha256(raw).hexdigest()
assert digest==expected
assert cell['state']=='still_open' and cell['terminal'] is False and cell['value'] is None
assert row['row_state']=='still_open' and row['terminal_fields']==7 and row['open_fields']==2
print(json.dumps({
  'unit_id':'US-STATE-ND','row_state':row['row_state'],'terminal_fields':row['terminal_fields'],
  'open_fields':row['open_fields'],'field_id':cell['field_id'],'field_state':cell['state'],
  'field_terminal':cell['terminal'],'field_value':cell['value'],'cell_sha256':digest
},indent=2,sort_keys=True))
PY
printf '%s\n' "$LIVE_MAIN" > "$OUT/live-main.txt"
printf '%s\n' "$LIVE_MATRIX_BLOB" > "$OUT/live-matrix-blob.txt"

printf '%s\n' artifact_authentication > "$OUT/STAGE"
META="$TMP/prior-artifact-metadata.json"
ZIP="$TMP/prior-artifact.zip"
gh api "repos/${REPO}/actions/artifacts/${PRIOR_ARTIFACT_ID}" > "$META"
[[ "$(jq -r .id "$META")" == "$PRIOR_ARTIFACT_ID" ]] || fail artifact_authentication artifact_id_mismatch
[[ "$(jq -r .size_in_bytes "$META")" == "$PRIOR_ARTIFACT_BYTES" ]] || fail artifact_authentication artifact_size_mismatch
[[ "$(jq -r .digest "$META")" == "sha256:${PRIOR_ARTIFACT_SHA256}" ]] || fail artifact_authentication artifact_metadata_digest_mismatch
[[ "$(jq -r .expired "$META")" == false ]] || fail artifact_authentication artifact_expired
gh api "repos/${REPO}/actions/artifacts/${PRIOR_ARTIFACT_ID}/zip" > "$ZIP"
[[ "$(stat -c %s "$ZIP")" == "$PRIOR_ARTIFACT_BYTES" ]] || fail artifact_authentication artifact_download_size_mismatch
[[ "$(sha256sum "$ZIP" | awk '{print $1}')" == "$PRIOR_ARTIFACT_SHA256" ]] || fail artifact_authentication artifact_download_digest_mismatch
unzip -tq "$ZIP" > "$OUT/prior-artifact-zip-test.txt" || fail artifact_authentication artifact_zip_invalid
unzip -q "$ZIP" -d "$TMP/prior"
(cd "$TMP/prior" && sha256sum -c SHA256SUMS > "$OUT/prior-internal-check.txt") || fail artifact_authentication prior_internal_checksum_failure
[[ "$(sha256sum "$TMP/prior/receipt.json" | awk '{print $1}')" == "$PRIOR_RECEIPT_SHA256" ]] || fail artifact_authentication prior_receipt_digest_mismatch
[[ "$(sha256sum "$TMP/prior/range-correction.json" | awk '{print $1}')" == "$RANGE_CORRECTION_SHA256" ]] || fail artifact_authentication range_correction_digest_mismatch
[[ "$(sha256sum "$TMP/prior/field-adjudication.json" | awk '{print $1}')" == "$FIELD_ADJUDICATION_SHA256" ]] || fail artifact_authentication field_adjudication_digest_mismatch
[[ "$(sha256sum "$TMP/prior/selected-protocol.json" | awk '{print $1}')" == "$SELECTED_PROTOCOL_SHA256" ]] || fail artifact_authentication selected_protocol_digest_mismatch
[[ "$(sha256sum "$TMP/prior/archive-member-inventory.json" | awk '{print $1}')" == "$MEMBER_INVENTORY_SHA256" ]] || fail artifact_authentication member_inventory_digest_mismatch
[[ "$(cat "$TMP/prior/EXIT_CODE")" == 0 ]] || fail artifact_authentication prior_exit_code_not_zero
[[ "$(cat "$TMP/prior/STAGE")" == complete ]] || fail artifact_authentication prior_stage_not_complete
[[ "$(cat "$TMP/prior/live-matrix-blob.txt")" == "$EXPECTED_MATRIX_BLOB" ]] || fail artifact_authentication prior_matrix_blob_mismatch
jq -e --arg route "$ROUTE_ID" '
  .state=="complete" and .failed_or_final_stage=="complete" and .exit_code==0 and
  .source_requests==0 and .route_executions==0 and .source_admissions==0 and
  .archive_members_reviewed==16 and .north_dakota_members==0 and
  .field_decisions==1 and .promotion_candidates==0 and .held_open_fields==1 and
  .selected_followup_routes==1 and .field_terminalizations==0 and .matrix_updates==0 and
  .row_state_mutations==0 and .class_closed==false and .cumulative_ledger_effect=="none" and
  .outside_human_dependency==false and .publication_effect=="none" and
  .adoption_effect=="none" and .graph_effect=="none" and
  .additional_execution_authorized==true and .additional_execution_scope==$route
' "$TMP/prior/receipt.json" > /dev/null || fail artifact_authentication prior_receipt_semantics_mismatch
jq -e --arg url "$ROUTE_URL" '
  .selected_correct_range.lower=="MI" and .selected_correct_range.upper=="NM" and
  .selected_correct_range.url==$url and .consumed_wrong_range.lower=="NV" and
  .consumed_wrong_range.upper=="WI" and .consumed_wrong_range.north_dakota_members==0 and
  .selection_proof.result==true and .selection_proof.unique_matching_ranges==1
' "$TMP/prior/range-correction.json" > /dev/null || fail artifact_authentication range_correction_semantics_mismatch
jq -e --arg route "$ROUTE_ID" --arg url "$ROUTE_URL" '
  .route_id==$route and .url==$url and .method=="GET" and .attempts==1 and
  .exact_host=="www.fna.usda.gov" and .maximum_followed_redirects==0 and
  .maximum_body_bytes==100000000 and .require_zip_magic_on_http_200==true and
  .same_host_expansion==0 and .sibling_path_expansion==0 and .result_spawned_requests==0 and
  .source_admissions==0 and .field_terminalizations==0 and .matrix_updates==0 and
  .row_state_mutations==0 and .class_closed==false and .outside_human_dependency==false
' "$TMP/prior/selected-protocol.json" > /dev/null || fail artifact_authentication selected_protocol_semantics_mismatch
jq -e --arg cell "$EXPECTED_CELL_SHA256" '
  .unit_id=="US-STATE-ND" and
  .field_id=="abawd_or_work_requirement_waiver_state_and_governing_period" and
  .current_cell_sha256==$cell and .current_state=="still_open" and .terminal==false and
  .promotion_candidates==0 and .held_open_fields==1 and .selected_followup_routes==1 and
  .authority_effect=="none"
' "$TMP/prior/field-adjudication.json" > /dev/null || fail artifact_authentication field_adjudication_semantics_mismatch
cp "$META" "$OUT/prior-artifact-metadata.json"
cp "$TMP/prior/receipt.json" "$OUT/prior-receipt.json"
cp "$TMP/prior/range-correction.json" "$OUT/range-correction.json"
cp "$TMP/prior/field-adjudication.json" "$OUT/field-adjudication.json"
cp "$TMP/prior/selected-protocol.json" "$OUT/selected-protocol.json"
cp "$TMP/prior/archive-member-inventory.json" "$OUT/archive-member-inventory.json"

printf '%s\n' rebind_current_main > "$OUT/STAGE"
python - "$OUT/receipt.json" "$EXPECTED_PARENT" "$PRE_REPAIR_PARENT" "$REPAIR_PRODUCT" "$EXPECTED_MATRIX_BLOB" "$EXPECTED_CELL_SHA256" "$PRIOR_ARTIFACT_ID" "$PRIOR_ARTIFACT_SHA256" "$PRIOR_RECEIPT_SHA256" "$ROUTE_ID" "$ROUTE_URL" <<'PY'
import json,sys
(path,current,parent_before,repair_product,matrix_blob,cell_sha,artifact_id,artifact_sha,prior_receipt_sha,route_id,route_url)=sys.argv[1:]
obj={
  "schema_version":"ssc-rd04-nd-fy26-archive-range-current-main-rebind-receipt@1",
  "state":"complete","failed_or_final_stage":"complete","exit_code":0,
  "current_parent":current,"pre_repair_parent":parent_before,"canonical_repair_product":repair_product,
  "canonical_repair_path":"data/research/clifford-cross-corpus-public-interest-map.json",
  "matrix_blob":matrix_blob,"current_cell_sha256":cell_sha,
  "predecessor_artifact_id":int(artifact_id),"predecessor_artifact_sha256":artifact_sha,
  "predecessor_receipt_sha256":prior_receipt_sha,
  "source_requests":0,"route_executions":0,"source_admissions":0,
  "custody_objects_reviewed":1,"archive_members_reviewed":16,"north_dakota_members":0,
  "field_decisions":1,"promotion_candidates":0,"held_open_fields":1,
  "selected_followup_routes":1,"field_terminalizations":0,"matrix_updates":0,
  "row_state_mutations":0,"class_closed":False,"cumulative_ledger_effect":"none",
  "outside_human_dependency":False,"publication_effect":"none","adoption_effect":"none",
  "graph_effect":"none","additional_execution_authorized":True,
  "additional_execution_scope":route_id,
  "selected_route":{"route_id":route_id,"url":route_url,"method":"GET","attempts":1,
    "exact_host":"www.fna.usda.gov","maximum_followed_redirects":0,
    "maximum_body_bytes":100000000,"require_zip_magic_on_http_200":True,
    "same_host_expansion":0,"sibling_path_expansion":0,"result_spawned_requests":0},
  "next_authorized_operation":"one exact locked GET to the selected MI-NM FNA archive origin; refuse any redirect before contact"
}
open(path,'w',encoding='utf-8').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
cat > "$OUT/summary.md" <<'EOF'
# RD-04 North Dakota FY2026 archive range current-main rebind

The checksum-complete range correction in artifact 9041062191 is rebound to canonical parent 8482b941aa0b1ecac685ab6ca98bba80ed80c5ee. The only intervening canonical change repairs one unrelated cross-corpus crawl-gap map. The RD-04 matrix blob and North Dakota waiver cell are unchanged. The field remains open, and exactly one unexecuted MI-NM archive-origin route is authorized.
EOF
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
seal_checksums
(cd "$OUT" && sha256sum -c SHA256SUMS)
jq -c . "$OUT/receipt.json"
