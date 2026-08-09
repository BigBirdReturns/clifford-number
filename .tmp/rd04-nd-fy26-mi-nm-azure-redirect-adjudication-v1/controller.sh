#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
EXPECTED_PARENT="7d6f9895595a62b6a6cfb3205d03c3d9e50fce33"
PRE_ARCHIVE_PRODUCT_PARENT="8482b941aa0b1ecac685ab6ca98bba80ed80c5ee"
ARCHIVE_PRODUCT_HEAD="62b8406371d3c45268a59a24e8426c9bb22bb6db"
MATRIX_PATH="data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json"
EXPECTED_MATRIX_BLOB="19357f8214ab2710bc5e75b3fae8c7fb09ff1654"
EXPECTED_CELL_SHA256="cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe"
CONTROLLER_PATH=".tmp/rd04-nd-fy26-mi-nm-azure-redirect-adjudication-v1/controller.sh"
WORKFLOW_PATH=".github/workflows/temp-rd04-nd-fy26-mi-nm-azure-redirect-adjudication-v1.yml"
TRIGGER_PATH=".tmp/rd04-nd-fy26-mi-nm-azure-redirect-adjudication-v1/trigger.json"

ARTIFACT_ID=9041349436
ARTIFACT_BYTES=45591181
ARTIFACT_SHA256="f99ffd00090b199f78b409192cb4e27d4b8cc4196a76a5d78e850b6f5496db25"
EXECUTION_RECEIPT_SHA256="5d9c5fd39eff254a588585d2d967e6d553693a32b6253c931e3f4c0e2c59860a"
ROUTE_RECEIPT_SHA256="e13193e39e0279597edc8a97f41e6cf3bdcd503edf38a727e9a51665c90a9989"
REQUEST_LEDGER_SHA256="35ca454f01af0a13941c674d2d068ac817337960a43fa7a33d1013a9f55b5e5f"
HEADERS_SHA256="0315b2bc8dec1c6c2550c9bf0f9edbb45a87abc709b489e25bcc398a4d185622"
REQUEST_PLAN_SHA256="3110bf43b37ae4a6aa28c64693a1ce1f33277062e718b0fc91113e7107b51dd6"
SOURCE_TRIGGER_SHA256="2fe5d05f68e7e151351d672fd35cdf9138d9bf3eeb09e717f38f635cda0138b4"
EXECUTION_LOG_SHA256="631ba0abbbb448a6632103ab120a4de974cc1d7e98cbcc3c62ffcd5a9642c772"
EMPTY_SHA256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
RANGE_ARTIFACT_SHA256="a7e5652f8526b125732ef32ef0ce0c4fb975c3275b24b0f30d675b03c07462d3"
RANGE_RECEIPT_SHA256="b7576800378936d9cda7a4f177683c0ce40862b048a65c200a992d3a5706da31"
RANGE_CORRECTION_SHA256="9b92e38f38af1c381fb45637f42c4a76d2d073766e7ffc2bf033d9d3dc61f9e0"
RANGE_FIELD_SHA256="639b1e6ca558ec64ff4c7270e71b8a15a7be4eff599763a91bfc1531acdc03bb"
RANGE_PROTOCOL_SHA256="3110bf43b37ae4a6aa28c64693a1ce1f33277062e718b0fc91113e7107b51dd6"
RANGE_INVENTORY_SHA256="fb3ceefb8a04e1f2aec56b55d77f7feb492b9ffcf84450ab36f936d7f7681fe0"

ORIGIN_ROUTE_ID="RD04-ND-FY2026-REQUEST-SUPPORT-ZIP-MI-NM-ORIGIN-001"
ORIGIN_URL="https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-MI-NM-7-2026.zip"
AZURE_ROUTE_ID="RD04-ND-FY2026-REQUEST-SUPPORT-ZIP-MI-NM-AZURE-001"
AZURE_URL="https://fna-bwbufwdzbabpezgc.z01.azurefd.us/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-MI-NM-7-2026.zip"
AZURE_HOST="fna-bwbufwdzbabpezgc.z01.azurefd.us"
MAX_BODY_BYTES=100000000

OUT="${RUNNER_TEMP}/ssc-rd04-nd-fy26-mi-nm-azure-redirect-adjudication-v1"
TMP="${RUNNER_TEMP}/ssc-rd04-nd-fy26-mi-nm-azure-redirect-adjudication-v1-work"
rm -rf "$OUT" "$TMP"
mkdir -p "$OUT" "$TMP/source"
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
  "schema_version":"ssc-rd04-nd-fy26-mi-nm-azure-redirect-adjudication-receipt@1",
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
[[ ${#merge_parents[@]} -eq 2 ]] || fail topology archive_product_merge_parent_count_mismatch
[[ "${merge_parents[0]}" == "$PRE_ARCHIVE_PRODUCT_PARENT" ]] || fail topology archive_product_merge_first_parent_mismatch
[[ "${merge_parents[1]}" == "$ARCHIVE_PRODUCT_HEAD" ]] || fail topology archive_product_merge_second_parent_mismatch
[[ "$(git rev-parse "$EXPECTED_PARENT^{tree}")" == "$(git rev-parse "$ARCHIVE_PRODUCT_HEAD^{tree}")" ]] || fail topology archive_product_merge_tree_mismatch
mapfile -t archive_product_status < <(git diff --name-status "$PRE_ARCHIVE_PRODUCT_PARENT" "$EXPECTED_PARENT")
[[ ${#archive_product_status[@]} -eq 6 ]] || fail topology archive_product_path_count_mismatch
expected_archive_paths=(
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/archive-custody.json"
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/current-cell-custody.json"
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/member-inventory.json"
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/north-dakota-disposition.json"
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/product-manifest.json"
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/summary.json"
)
mapfile -t actual_archive_paths < <(printf '%s\n' "${archive_product_status[@]}" | awk -F '\t' '$1=="A"{print $2}' | sort)
mapfile -t expected_archive_paths_sorted < <(printf '%s\n' "${expected_archive_paths[@]}" | sort)
[[ ${#actual_archive_paths[@]} -eq 6 ]] || fail topology archive_product_not_addition_only
[[ "$(printf '%s\n' "${actual_archive_paths[@]}")" == "$(printf '%s\n' "${expected_archive_paths_sorted[@]}")" ]] || fail topology archive_product_path_set_mismatch
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
assert row['row_state']=='still_open' and row['terminal_fields']==7 and row['open_fields']==2
assert cell['state']=='still_open' and cell['terminal'] is False and cell['value'] is None
print(json.dumps({
  'unit_id':'US-STATE-ND','row_state':row['row_state'],'terminal_fields':row['terminal_fields'],
  'open_fields':row['open_fields'],'field_id':cell['field_id'],'field_state':cell['state'],
  'field_terminal':cell['terminal'],'field_value':cell['value'],'cell_sha256':digest
},indent=2,sort_keys=True))
PY
printf '%s\n' "$LIVE_MAIN" > "$OUT/live-main.txt"
printf '%s\n' "$LIVE_MATRIX_BLOB" > "$OUT/live-matrix-blob.txt"

printf '%s\n' artifact_authentication > "$OUT/STAGE"
META="$TMP/source-artifact-metadata.json"
ZIP="$TMP/source-artifact.zip"
gh api "repos/${REPO}/actions/artifacts/${ARTIFACT_ID}" > "$META"
[[ "$(jq -r .id "$META")" == "$ARTIFACT_ID" ]] || fail artifact_authentication artifact_id_mismatch
[[ "$(jq -r .size_in_bytes "$META")" == "$ARTIFACT_BYTES" ]] || fail artifact_authentication artifact_size_mismatch
[[ "$(jq -r .digest "$META")" == "sha256:${ARTIFACT_SHA256}" ]] || fail artifact_authentication artifact_metadata_digest_mismatch
[[ "$(jq -r .expired "$META")" == false ]] || fail artifact_authentication artifact_expired
gh api "repos/${REPO}/actions/artifacts/${ARTIFACT_ID}/zip" > "$ZIP"
[[ "$(stat -c %s "$ZIP")" == "$ARTIFACT_BYTES" ]] || fail artifact_authentication artifact_download_size_mismatch
[[ "$(sha256sum "$ZIP" | awk '{print $1}')" == "$ARTIFACT_SHA256" ]] || fail artifact_authentication artifact_download_digest_mismatch
unzip -tq "$ZIP" > "$OUT/source-artifact-zip-test.txt" || fail artifact_authentication artifact_zip_invalid
unzip -q "$ZIP" -d "$TMP/source"
[[ "$(wc -l < "$TMP/source/SHA256SUMS")" == 31 ]] || fail artifact_authentication top_level_checksum_row_count_mismatch
(cd "$TMP/source" && sha256sum -c SHA256SUMS > "$OUT/source-internal-check.txt") || fail artifact_authentication top_level_checksum_failure
[[ "$(wc -l < "$TMP/source/range/SHA256SUMS")" == 17 ]] || fail artifact_authentication nested_checksum_row_count_mismatch
(cd "$TMP/source/range" && sha256sum -c SHA256SUMS > "$OUT/range-internal-check.txt") || fail artifact_authentication nested_checksum_failure
[[ "$(cat "$TMP/source/EXIT_CODE")" == 1 ]] || fail artifact_authentication stale_exit_sentinel_not_preserved
[[ "$(cat "$TMP/source/STAGE")" == complete ]] || fail artifact_authentication source_stage_not_complete
[[ "$(sha256sum "$TMP/source/execution-receipt.json" | awk '{print $1}')" == "$EXECUTION_RECEIPT_SHA256" ]] || fail artifact_authentication execution_receipt_digest_mismatch
[[ "$(sha256sum "$TMP/source/route-receipt.json" | awk '{print $1}')" == "$ROUTE_RECEIPT_SHA256" ]] || fail artifact_authentication route_receipt_digest_mismatch
[[ "$(sha256sum "$TMP/source/physical-request-ledger.json" | awk '{print $1}')" == "$REQUEST_LEDGER_SHA256" ]] || fail artifact_authentication request_ledger_digest_mismatch
[[ "$(sha256sum "$TMP/source/transport/response-headers.json" | awk '{print $1}')" == "$HEADERS_SHA256" ]] || fail artifact_authentication response_headers_digest_mismatch
[[ "$(sha256sum "$TMP/source/request-plan.json" | awk '{print $1}')" == "$REQUEST_PLAN_SHA256" ]] || fail artifact_authentication request_plan_digest_mismatch
[[ "$(sha256sum "$TMP/source/trigger.json" | awk '{print $1}')" == "$SOURCE_TRIGGER_SHA256" ]] || fail artifact_authentication source_trigger_digest_mismatch
[[ "$(sha256sum "$TMP/source/execution.log" | awk '{print $1}')" == "$EXECUTION_LOG_SHA256" ]] || fail artifact_authentication execution_log_digest_mismatch
[[ "$(sha256sum "$TMP/source/transport/response-body.bin" | awk '{print $1}')" == "$EMPTY_SHA256" ]] || fail artifact_authentication response_body_digest_mismatch
[[ "$(stat -c %s "$TMP/source/transport/response-body.bin")" == 0 ]] || fail artifact_authentication response_body_not_empty
[[ "$(sha256sum "$TMP/source/range.zip" | awk '{print $1}')" == "$RANGE_ARTIFACT_SHA256" ]] || fail artifact_authentication range_artifact_digest_mismatch
[[ "$(sha256sum "$TMP/source/range/receipt.json" | awk '{print $1}')" == "$RANGE_RECEIPT_SHA256" ]] || fail artifact_authentication range_receipt_digest_mismatch
[[ "$(sha256sum "$TMP/source/range/range-correction.json" | awk '{print $1}')" == "$RANGE_CORRECTION_SHA256" ]] || fail artifact_authentication range_correction_digest_mismatch
[[ "$(sha256sum "$TMP/source/range/field-adjudication.json" | awk '{print $1}')" == "$RANGE_FIELD_SHA256" ]] || fail artifact_authentication range_field_digest_mismatch
[[ "$(sha256sum "$TMP/source/range/selected-protocol.json" | awk '{print $1}')" == "$RANGE_PROTOCOL_SHA256" ]] || fail artifact_authentication range_protocol_digest_mismatch
[[ "$(sha256sum "$TMP/source/range/archive-member-inventory.json" | awk '{print $1}')" == "$RANGE_INVENTORY_SHA256" ]] || fail artifact_authentication range_inventory_digest_mismatch
cp "$META" "$OUT/source-artifact-metadata.json"
cp "$TMP/source/execution-receipt.json" "$OUT/source-execution-receipt.json"
cp "$TMP/source/route-receipt.json" "$OUT/source-route-receipt.json"
cp "$TMP/source/physical-request-ledger.json" "$OUT/source-physical-request-ledger.json"
cp "$TMP/source/transport/response-headers.json" "$OUT/source-response-headers.json"
cp "$TMP/source/request-plan.json" "$OUT/source-request-plan.json"
cp "$TMP/source/trigger.json" "$OUT/source-trigger.json"

printf '%s\n' adjudicate_redirect > "$OUT/STAGE"
if ! python - "$TMP/source" "$OUT" "$EXPECTED_PARENT" "$EXPECTED_MATRIX_BLOB" "$EXPECTED_CELL_SHA256" "$ARTIFACT_ID" "$ARTIFACT_SHA256" "$ORIGIN_ROUTE_ID" "$ORIGIN_URL" "$AZURE_ROUTE_ID" "$AZURE_URL" "$AZURE_HOST" "$MAX_BODY_BYTES" <<'PY'
import hashlib,json,sys
from pathlib import Path
from urllib.parse import urlparse

(src,out,current_parent,matrix_blob,cell_sha,artifact_id,artifact_sha,origin_route,origin_url,azure_route,azure_url,azure_host,max_body)=sys.argv[1:]
src=Path(src); out=Path(out); max_body=int(max_body)

def read(name): return json.loads((src/name).read_text(encoding='utf-8'))
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def write(name,obj):
    p=out/name
    p.write_text(json.dumps(obj,indent=2,sort_keys=True,ensure_ascii=False)+'\n',encoding='utf-8')
    return digest(p)

execution=read('execution-receipt.json')
route=read('route-receipt.json')
ledger=read('physical-request-ledger.json')
headers=read('transport/response-headers.json')
plan=read('request-plan.json')
trigger=read('trigger.json')
range_receipt=read('range/receipt.json')
range_correction=read('range/range-correction.json')
range_field=read('range/field-adjudication.json')
range_protocol=read('range/selected-protocol.json')

assert execution['schema_version']=='ssc-rd04-nd-fy26-mi-nm-origin-execution@1'
assert execution['state']=='complete' and execution['failed_or_final_stage']=='complete' and execution['exit_code']==0
assert execution['execution_parent']=='8482b941aa0b1ecac685ab6ca98bba80ed80c5ee'
assert execution['execution_head']=='8e3cf92f1577dce7d99aad82c7f7606b1c3b159e'
assert execution['main_at_finish']==execution['execution_parent'] and execution['main_moved_during_execution'] is False
assert execution['fixed_route_count']==1 and execution['terminal_route_count']==1 and execution['physical_requests']==1
assert execution['route_terminal_state']=='redirect_refused_terminal' and execution['http_status']==302
assert execution['body_bytes']==0 and execution['body_sha256']=='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
assert execution['result_spawned_requests']==0 and execution['source_admissions']==0
assert execution['field_terminalizations']==0 and execution['matrix_updates']==0 and execution['row_state_mutations']==0
assert execution['class_closed'] is False and execution['cumulative_ledger_effect']=='none'
assert execution['outside_human_dependency'] is False and execution['publication_effect']=='none'
assert execution['adoption_effect']=='none' and execution['graph_effect']=='none'
assert execution['additional_execution_authorized'] is False

assert route['schema_version']=='ssc-rd04-nd-fy26-mi-nm-origin-route-receipt@1'
assert route['route_id']==origin_route and route['requested_url']==origin_url and route['effective_url']==origin_url
assert route['physical_requests']==1 and route['http_status']==302 and route['followed_redirects']==0
assert route['body_bytes']==0 and route['body_sha256']==execution['body_sha256']
assert route['terminal_state']=='redirect_refused_terminal' and route['zip_magic'] is False
assert route['location']==azure_url and route['transport_error'] is None
assert route['source_admissions']==0 and route['field_terminalizations']==0 and route['matrix_updates']==0
assert route['row_state_mutations']==0 and route['class_closed'] is False and route['additional_execution_authorized'] is False

assert ledger['schema_version']=='ssc-rd04-physical-request-ledger@1'
assert ledger['physical_requests']==1 and len(ledger['requests'])==1
request=ledger['requests'][0]
assert request=={'method':'GET','ordinal':1,'status':302,'terminal_state':'redirect_refused_terminal','url':origin_url}

assert plan['route_id']==origin_route and plan['url']==origin_url and plan['method']=='GET' and plan['attempts']==1
assert plan['exact_host']=='www.fna.usda.gov' and plan['maximum_followed_redirects']==0
assert plan['maximum_body_bytes']==max_body and plan['require_zip_magic_on_http_200'] is True
assert plan['same_host_expansion']==0 and plan['sibling_path_expansion']==0 and plan['result_spawned_requests']==0
assert plan['source_admissions']==0 and plan['field_terminalizations']==0 and plan['matrix_updates']==0
assert plan['row_state_mutations']==0 and plan['class_closed'] is False and plan['outside_human_dependency'] is False

assert trigger['canonical_parent']=='8482b941aa0b1ecac685ab6ca98bba80ed80c5ee'
assert trigger['matrix_blob']==matrix_blob and trigger['route_id']==origin_route and trigger['url']==origin_url
assert trigger['execute_once'] is True and trigger['maximum_followed_redirects']==0
assert trigger['maximum_body_bytes']==max_body and trigger['result_spawned_requests']==0
assert trigger['automatic_source_admissions']==0 and trigger['automatic_field_terminalizations']==0
assert trigger['automatic_matrix_updates']==0 and trigger['automatic_row_state_mutations']==0
assert trigger['automatic_class_closures']==0 and trigger['outside_human_dependency'] is False

assert isinstance(headers,list) and len(headers)==8
locations=[x['value'] for x in headers if x.get('name','').casefold()=='location']
lengths=[x['value'] for x in headers if x.get('name','').casefold()=='content-length']
servers=[x['value'] for x in headers if x.get('name','').casefold()=='server']
assert locations==[azure_url] and lengths==['0'] and servers==['AkamaiGHost']

op=urlparse(origin_url); ap=urlparse(azure_url)
assert op.scheme=='https' and ap.scheme=='https'
assert op.hostname=='www.fna.usda.gov' and ap.hostname==azure_host
assert op.path==ap.path and op.query==ap.query=='' and op.fragment==ap.fragment==''

assert range_receipt['state']=='complete' and range_receipt['additional_execution_scope']==origin_route
assert range_receipt['archive_members_reviewed']==16 and range_receipt['north_dakota_members']==0
assert range_receipt['field_decisions']==1 and range_receipt['promotion_candidates']==0 and range_receipt['held_open_fields']==1
assert range_correction['selected_correct_range']['lower']=='MI' and range_correction['selected_correct_range']['upper']=='NM'
assert range_correction['selected_correct_range']['url']==origin_url
assert range_correction['selection_proof']['result'] is True and range_correction['selection_proof']['unique_matching_ranges']==1
assert range_field['current_cell_sha256']==cell_sha and range_field['current_state']=='still_open' and range_field['terminal'] is False
assert range_field['promotion_candidates']==0 and range_field['held_open_fields']==1
assert range_protocol==plan

redirect={
  'schema_version':'ssc-rd04-nd-fy26-mi-nm-azure-redirect-adjudication@1',
  'source_artifact_id':int(artifact_id),'source_artifact_sha256':artifact_sha,
  'origin_observation':{
    'route_id':origin_route,'requested_url':origin_url,'http_status':302,
    'physical_requests':1,'followed_redirects':0,'body_bytes':0,
    'body_sha256':execution['body_sha256'],'server':'AkamaiGHost',
    'content_length':0,'location':azure_url,'target_contacted':False,
    'terminal_state':'redirect_refused_terminal'
  },
  'target_classification':'server_directed_transport_locator_only',
  'target_url':azure_url,'target_host':azure_host,
  'path_preserved':True,'query_preserved_empty':True,'fragment_preserved_empty':True,
  'wildcard_host_authority':False,'sibling_path_authority':False,
  'substantive_effect':'none'
}
redirect_sha=write('redirect-adjudication.json',redirect)

field={
  'schema_version':'ssc-rd04-nd-fy26-mi-nm-azure-field-adjudication@1',
  'unit_id':'US-STATE-ND','field_id':'abawd_or_work_requirement_waiver_state_and_governing_period',
  'current_parent':current_parent,'matrix_blob':matrix_blob,'current_cell_sha256':cell_sha,
  'current_state':'still_open','terminal':False,
  'disposition':'mi_nm_archive_origin_redirect_target_selected_but_archive_uncaptured_hold_open',
  'source_admissions':0,'promotion_candidates':0,'held_open_fields':1,'selected_followup_routes':1,
  'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,'class_closed':False,
  'prohibited_inferences':[
    'do_not_treat_redirect_as_archive_content','do_not_grant_wildcard_azurefd_authority',
    'do_not_infer_north_dakota_member_presence','do_not_infer_waiver_geography_or_governing_period',
    'do_not_replay_consumed_origin_route'
  ],
  'authority_effect':'none'
}
field_sha=write('field-adjudication.json',field)

protocol={
  'schema_version':'ssc-rd04-nd-fy26-mi-nm-azure-archive-protocol@1',
  'route_id':azure_route,'url':azure_url,'method':'GET','attempts':1,
  'exact_host':azure_host,'maximum_followed_redirects':0,
  'maximum_body_bytes':max_body,'require_zip_magic_on_http_200':True,
  'same_host_expansion':0,'sibling_path_expansion':0,'result_spawned_requests':0,
  'selection_scope':'capture_exact_mi_nm_azure_archive_only_for_later_request_free_member_complete_review',
  'source_admissions':0,'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,
  'class_closed':False,'outside_human_dependency':False
}
protocol_sha=write('selected-protocol.json',protocol)

receipt={
  'schema_version':'ssc-rd04-nd-fy26-mi-nm-azure-redirect-adjudication-receipt@1',
  'state':'complete','failed_or_final_stage':'complete','exit_code':0,
  'current_parent':current_parent,'matrix_blob':matrix_blob,'current_cell_sha256':cell_sha,
  'source_artifact_id':int(artifact_id),'source_artifact_sha256':artifact_sha,
  'source_exit_sentinel':1,'source_typed_receipt_exit_code':0,
  'source_top_level_checksum_rows':31,'source_nested_checksum_rows':17,
  'source_requests':0,'route_executions':0,'source_admissions':0,
  'field_decisions':1,'promotion_candidates':0,'held_open_fields':1,
  'selected_followup_routes':1,'field_terminalizations':0,'matrix_updates':0,
  'row_state_mutations':0,'class_closed':False,'cumulative_ledger_effect':'none',
  'outside_human_dependency':False,'publication_effect':'none','adoption_effect':'none','graph_effect':'none',
  'additional_execution_authorized':True,'additional_execution_scope':azure_route,
  'redirect_adjudication_sha256':redirect_sha,'field_adjudication_sha256':field_sha,
  'selected_protocol_sha256':protocol_sha,
  'next_authorized_operation':'one exact locked GET to the selected MI-NM Azure archive target; refuse any redirect before contact'
}
write('receipt.json',receipt)
(out/'summary.md').write_text(
  '# RD-04 North Dakota FY2026 MI-NM Azure redirect adjudication\n\n'
  'The consumed official origin returned one zero-byte HTTP 302 and one exact path-preserving Azure Front Door target. '
  'The target was not contacted. It is classified only as a server-directed transport locator. The North Dakota field '
  'remains open, and exactly one unexecuted Azure archive route is selected.\n',encoding='utf-8')
PY
then
  fail adjudicate_redirect redirect_adjudication_failed
fi

printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
seal_checksums
(cd "$OUT" && sha256sum -c SHA256SUMS)
jq -c . "$OUT/receipt.json"
