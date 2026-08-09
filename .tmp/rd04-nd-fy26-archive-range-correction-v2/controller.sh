#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
EXPECTED_PARENT="4edc3f4f65851cf2643e889d93df3b6372a2f468"
EXPECTED_MATRIX_BLOB="19357f8214ab2710bc5e75b3fae8c7fb09ff1654"
MATRIX_PATH="data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json"
EXPECTED_CELL_SHA256="cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe"
CONTROLLER_PATH=".tmp/rd04-nd-fy26-archive-range-correction-v2/controller.sh"
WORKFLOW_PATH=".github/workflows/temp-rd04-nd-fy26-archive-range-correction-v2.yml"
TRIGGER_PATH=".tmp/rd04-nd-fy26-archive-range-correction-v2/trigger.json"
INDEX_ARTIFACT_ID=9032851171
INDEX_ARTIFACT_BYTES=16421
INDEX_ARTIFACT_SHA256="f6c158e57f9cc99d48b1c86048d1084f89f0be33bd490f5ab10a3f9cdd0109a1"
INDEX_BODY_SHA256="dcab625aeeebc30b1cf38dd32f67f0cb766a8e33735694b00f041e03d446476f"
ARCHIVE_ARTIFACT_ID=9033042970
ARCHIVE_ARTIFACT_BYTES=11695093
ARCHIVE_ARTIFACT_SHA256="d95177ff3bd7c5eea4510c8c5498c304534d09bc6523b4a60012be2a161658c9"
ARCHIVE_BODY_BYTES=18003072
ARCHIVE_BODY_SHA256="b74eccfba90bfd69dcd35567b714020de63cb80b0898323973b822f9813153b1"
TARGET_CODE="ND"
WRONG_URL="https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-NV-WI-7-2026.zip"
CORRECT_URL="https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-MI-NM-7-2026.zip"
OUT="${RUNNER_TEMP}/ssc-rd04-nd-fy26-archive-range-correction-v2"
TMP="${RUNNER_TEMP}/ssc-rd04-nd-fy26-archive-range-correction-v2-work"
rm -rf "$OUT" "$TMP"
mkdir -p "$OUT" "$TMP/index" "$TMP/archive"
STAGE_FILE="$OUT/STAGE"
EXIT_FILE="$OUT/EXIT_CODE"
printf '%s\n' topology > "$STAGE_FILE"
printf '%s\n' 1 > "$EXIT_FILE"

fail() {
  local stage="$1"
  local reason="$2"
  printf '%s\n' "$stage" > "$STAGE_FILE"
  python - "$OUT/receipt.json" "$stage" "$reason" <<'PY'
import json,sys
path,stage,reason=sys.argv[1:]
obj={
 "schema_version":"ssc-rd04-nd-fy26-archive-range-correction-receipt@1",
 "state":"failed_closed","failed_or_final_stage":stage,"exit_code":1,
 "reason":reason,"source_requests":0,"route_executions":0,"source_admissions":0,
 "field_decisions":0,"promotion_candidates":0,"selected_followup_routes":0,
 "field_terminalizations":0,"matrix_updates":0,"row_state_mutations":0,
 "class_closed":False,"cumulative_ledger_effect":"none","outside_human_dependency":False,
 "publication_effect":"none","adoption_effect":"none","graph_effect":"none",
 "additional_execution_authorized":False
}
open(path,'w',encoding='utf-8').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
  (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%P\0' | sort -z | xargs -0 sha256sum > SHA256SUMS)
  exit 1
}
trap 'rc=$?; if [[ $rc -ne 0 && "$(cat "$EXIT_FILE" 2>/dev/null || echo 1)" != 1 ]]; then printf "%s\n" 1 > "$EXIT_FILE"; fi' EXIT

[[ "${EVENT_NAME:-}" == "pull_request" ]] || fail topology "event_not_pull_request"
[[ "${HEAD_REPO:-}" == "$REPO" ]] || fail topology "head_repository_mismatch"
[[ "${HEAD_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || fail topology "invalid_head_sha"
[[ "${BASE_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || fail topology "invalid_base_sha"
[[ "$(git rev-parse HEAD)" == "$HEAD_SHA" ]] || fail topology "checkout_head_mismatch"
[[ "$(git rev-parse HEAD^)" == "$BASE_SHA" ]] || fail topology "head_parent_mismatch"
CONTROLLER_COMMIT="$(git rev-parse "$BASE_SHA^")"
[[ "$(git rev-parse "$CONTROLLER_COMMIT^")" == "$EXPECTED_PARENT" ]] || fail topology "controller_parent_mismatch"
mapfile -t controller_paths < <(git diff --name-only "$EXPECTED_PARENT" "$CONTROLLER_COMMIT")
mapfile -t workflow_paths < <(git diff --name-only "$CONTROLLER_COMMIT" "$BASE_SHA")
mapfile -t trigger_paths < <(git diff --name-only "$BASE_SHA" "$HEAD_SHA")
[[ ${#controller_paths[@]} -eq 1 && "${controller_paths[0]}" == "$CONTROLLER_PATH" ]] || fail topology "controller_path_denominator_mismatch"
[[ ${#workflow_paths[@]} -eq 1 && "${workflow_paths[0]}" == "$WORKFLOW_PATH" ]] || fail topology "workflow_path_denominator_mismatch"
[[ ${#trigger_paths[@]} -eq 1 && "${trigger_paths[0]}" == "$TRIGGER_PATH" ]] || fail topology "trigger_path_denominator_mismatch"
[[ "$(git rev-parse "$CONTROLLER_COMMIT:$CONTROLLER_PATH")" == "$(git hash-object "$CONTROLLER_PATH")" ]] || fail topology "controller_git_blob_mismatch"
git fetch --quiet origin main
LIVE_MAIN="$(git rev-parse origin/main)"
git merge-base --is-ancestor "$EXPECTED_PARENT" "$LIVE_MAIN" || fail topology "expected_parent_not_ancestor_of_live_main"
LIVE_MATRIX_BLOB="$(git rev-parse "origin/main:$MATRIX_PATH")"
[[ "$LIVE_MATRIX_BLOB" == "$EXPECTED_MATRIX_BLOB" ]] || fail topology "live_matrix_blob_moved"
printf '%s\n' "$LIVE_MAIN" > "$OUT/live-main.txt"
printf '%s\n' "$LIVE_MATRIX_BLOB" > "$OUT/live-matrix-blob.txt"

fetch_artifact() {
  local id="$1" bytes="$2" digest="$3" dest="$4"
  local meta="$dest-meta.json" zip="$dest.zip"
  gh api "repos/${REPO}/actions/artifacts/${id}" > "$meta"
  [[ "$(jq -r .id "$meta")" == "$id" ]] || fail artifact_authentication "artifact_id_mismatch_${id}"
  [[ "$(jq -r .size_in_bytes "$meta")" == "$bytes" ]] || fail artifact_authentication "artifact_size_mismatch_${id}"
  [[ "$(jq -r .digest "$meta")" == "sha256:${digest}" ]] || fail artifact_authentication "artifact_digest_metadata_mismatch_${id}"
  [[ "$(jq -r .expired "$meta")" == false ]] || fail artifact_authentication "artifact_expired_${id}"
  gh api "repos/${REPO}/actions/artifacts/${id}/zip" > "$zip"
  [[ "$(stat -c %s "$zip")" == "$bytes" ]] || fail artifact_authentication "artifact_download_size_mismatch_${id}"
  [[ "$(sha256sum "$zip" | awk '{print $1}')" == "$digest" ]] || fail artifact_authentication "artifact_download_digest_mismatch_${id}"
  unzip -tq "$zip" > "$dest-zip-test.txt" || fail artifact_authentication "artifact_zip_invalid_${id}"
}

printf '%s\n' artifact_authentication > "$STAGE_FILE"
fetch_artifact "$INDEX_ARTIFACT_ID" "$INDEX_ARTIFACT_BYTES" "$INDEX_ARTIFACT_SHA256" "$TMP/index-artifact"
fetch_artifact "$ARCHIVE_ARTIFACT_ID" "$ARCHIVE_ARTIFACT_BYTES" "$ARCHIVE_ARTIFACT_SHA256" "$TMP/archive-artifact"
unzip -q "$TMP/index-artifact.zip" -d "$TMP/index"
unzip -q "$TMP/archive-artifact.zip" -d "$TMP/archive"
(cd "$TMP/index" && sha256sum -c SHA256SUMS > "$OUT/index-internal-check.txt") || fail artifact_authentication "index_internal_checksum_failure"
(cd "$TMP/archive" && sha256sum -c SHA256SUMS > "$OUT/archive-internal-check.txt") || fail artifact_authentication "archive_internal_checksum_failure"
[[ "$(sha256sum "$TMP/index/response-body.html" | awk '{print $1}')" == "$INDEX_BODY_SHA256" ]] || fail artifact_authentication "index_body_digest_mismatch"
[[ "$(stat -c %s "$TMP/archive/source.zip")" == "$ARCHIVE_BODY_BYTES" ]] || fail artifact_authentication "archive_body_size_mismatch"
[[ "$(sha256sum "$TMP/archive/source.zip" | awk '{print $1}')" == "$ARCHIVE_BODY_SHA256" ]] || fail artifact_authentication "archive_body_digest_mismatch"
cmp -s "$TMP/archive/source.zip" "$TMP/archive/response-body.bin" || fail artifact_authentication "retained_archive_bodies_not_identical"
unzip -tq "$TMP/archive/source.zip" > "$OUT/source-archive-zip-test.txt" || fail artifact_authentication "source_archive_crc_failure"
cp "$TMP/index-artifact-meta.json" "$OUT/index-artifact-metadata.json"
cp "$TMP/archive-artifact-meta.json" "$OUT/archive-artifact-metadata.json"
cp "$TMP/index/route-receipt.json" "$OUT/index-route-receipt.json"
cp "$TMP/archive/route-receipt.json" "$OUT/archive-route-receipt.json"

printf '%s\n' adjudicate_range > "$STAGE_FILE"
if ! python - "$MATRIX_PATH" "$TMP/index/response-body.html" "$TMP/archive/source.zip" "$OUT" <<'PY'
import hashlib,json,re,sys,zipfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin,urlparse

matrix_path,index_path,archive_path,out_dir=map(Path,sys.argv[1:])
out_dir.mkdir(parents=True,exist_ok=True)
TARGET='ND'
EXPECTED_CELL_SHA='cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe'
EXPECTED_ARCHIVE_SHA='b74eccfba90bfd69dcd35567b714020de63cb80b0898323973b822f9813153b1'
WRONG='https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-NV-WI-7-2026.zip'
CORRECT='https://www.fna.usda.gov/sites/default/files/resource-files/FY2026-ABAWD-State-Requests-and-Data-MI-NM-7-2026.zip'
INDEX_BASE='https://www.fna.usda.gov/snap/waivers/timelimit/2025-2029'

def canon(v): return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def sha(b): return hashlib.sha256(b).hexdigest()
def write(name,obj):
    p=out_dir/name
    p.write_text(json.dumps(obj,indent=2,sort_keys=True,ensure_ascii=False)+'\n',encoding='utf-8')
    return sha(p.read_bytes())

m=json.loads(matrix_path.read_text(encoding='utf-8'))
rows=[r for r in m['rows'] if r.get('unit_id')=='US-STATE-ND']
assert len(rows)==1
row=rows[0]
cells=[c for c in row['cells'] if c.get('field_id')=='abawd_or_work_requirement_waiver_state_and_governing_period']
assert len(cells)==1
cell=cells[0]
assert sha(canon(cell))==EXPECTED_CELL_SHA
assert cell['state']=='still_open' and cell['terminal'] is False

class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.href=None; self.buf=[]; self.anchors=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a': self.href=dict(attrs).get('href'); self.buf=[]
    def handle_data(self,data):
        if self.href is not None: self.buf.append(data)
    def handle_endtag(self,tag):
        if tag=='a' and self.href is not None:
            self.anchors.append({'text':' '.join(''.join(self.buf).split()),'href':self.href,'url':urljoin(INDEX_BASE,self.href)})
            self.href=None; self.buf=[]

p=Parser(); p.feed(index_path.read_text(encoding='utf-8'))
pat=re.compile(r'^FY2026-ABAWD-State-Requests-and-Data-([A-Z]{2})-([A-Z]{2})-7-2026\.zip$')
ranges=[]
for a in p.anchors:
    name=Path(urlparse(a['url']).path).name
    mm=pat.match(name)
    if mm:
        lo,hi=mm.groups(); ranges.append({'lower':lo,'upper':hi,'text':a['text'],'href':a['href'],'url':a['url'],'filename':name})
ranges=sorted(ranges,key=lambda x:(x['lower'],x['upper']))
expected=[('AK','KY'),('MI','NM'),('NV','WI')]
assert [(x['lower'],x['upper']) for x in ranges]==expected
selected=[x for x in ranges if x['lower']<=TARGET<=x['upper']]
assert len(selected)==1 and selected[0]['url']==CORRECT
assert WRONG!=CORRECT

assert sha(archive_path.read_bytes())==EXPECTED_ARCHIVE_SHA
members=[]
with zipfile.ZipFile(archive_path) as z:
    assert z.testzip() is None
    for info in z.infolist():
        if info.is_dir(): continue
        data=z.read(info)
        parts=info.filename.split('/')
        assert len(parts)>=3
        state=parts[1]
        members.append({'path':info.filename,'state_directory':state,'bytes':info.file_size,'compressed_bytes':info.compress_size,'crc32':f'{info.CRC:08x}','sha256':sha(data)})
assert len(members)==16
counts=Counter(x['state_directory'] for x in members)
assert dict(sorted(counts.items()))=={'NV':3,'NY':8,'OR':4,'WI':1}
assert not any(x['state_directory']==TARGET for x in members)
assert not any('north dakota' in x['path'].casefold() for x in members)

inventory={
 'schema_version':'ssc-rd04-nd-fy26-archive-member-inventory@1',
 'artifact_id':9033042970,'archive_body_bytes':archive_path.stat().st_size,
 'archive_body_sha256':EXPECTED_ARCHIVE_SHA,'member_count':len(members),
 'state_directory_counts':dict(sorted(counts.items())),'members':members,
 'north_dakota_member_count':0,'north_dakota_directory_count':0,
 'inventory_role':'exact_consumed_archive_denominator_only'
}
inv_sha=write('archive-member-inventory.json',inventory)

correction={
 'schema_version':'ssc-rd04-nd-fy26-archive-range-correction@1',
 'target_state':{'unit_id':'US-STATE-ND','postal_code':'ND','state_name':'North Dakota'},
 'range_key_semantics':'two_letter_postal_code_lexicographic_inclusive',
 'available_ranges':ranges,
 'consumed_wrong_range':{'url':WRONG,'lower':'NV','upper':'WI','contains_target_postal_code':False,'member_state_directories':sorted(counts),'north_dakota_members':0},
 'selected_correct_range':selected[0],
 'selection_proof':{'expression':'MI <= ND <= NM','result':True,'unique_matching_ranges':1},
 'misrouting_classification':'state_name_order_assumption_rejected_postal_code_range_required',
 'substantive_effect':'none'
}
cor_sha=write('range-correction.json',correction)

field={
 'schema_version':'ssc-rd04-nd-fy26-archive-range-field-adjudication@1',
 'unit_id':'US-STATE-ND','field_id':'abawd_or_work_requirement_waiver_state_and_governing_period',
 'current_cell_sha256':EXPECTED_CELL_SHA,'current_state':'still_open','terminal':False,
 'disposition':'wrong_archive_range_consumed_without_nd_member_correct_mi_nm_range_selected_hold_open',
 'promotion_candidates':0,'held_open_fields':1,'selected_followup_routes':1,
 'prohibited_inferences':['do_not_treat_nv_wi_archive_omission_as_no_nd_request','do_not_infer_no_current_waiver','do_not_assign_other_state_members_to_nd','do_not_use_state_name_order_for_postal_code_ranges'],
 'authority_effect':'none'
}
field_sha=write('field-adjudication.json',field)

protocol={
 'schema_version':'ssc-rd04-nd-fy26-mi-nm-archive-origin-protocol@1',
 'route_id':'RD04-ND-FY2026-REQUEST-SUPPORT-ZIP-MI-NM-ORIGIN-001',
 'url':CORRECT,'method':'GET','attempts':1,'exact_host':'www.fna.usda.gov',
 'maximum_followed_redirects':0,'maximum_body_bytes':100000000,'require_zip_magic_on_http_200':True,
 'same_host_expansion':0,'sibling_path_expansion':0,'result_spawned_requests':0,
 'selection_scope':'capture_exact_mi_nm_archive_only_for_later_request_free_nd_member_inspection',
 'source_admissions':0,'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,
 'class_closed':False,'outside_human_dependency':False
}
proto_sha=write('selected-protocol.json',protocol)

receipt={
 'schema_version':'ssc-rd04-nd-fy26-archive-range-correction-receipt@1',
 'state':'complete','failed_or_final_stage':'complete','exit_code':0,
 'index_artifact_id':9032851171,'archive_artifact_id':9033042970,
 'source_requests':0,'route_executions':0,'source_admissions':0,
 'custody_objects_reviewed':2,'archive_members_reviewed':16,'north_dakota_members':0,
 'field_decisions':1,'promotion_candidates':0,'held_open_fields':1,'selected_followup_routes':1,
 'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,'class_closed':False,
 'cumulative_ledger_effect':'none','outside_human_dependency':False,
 'publication_effect':'none','adoption_effect':'none','graph_effect':'none',
 'additional_execution_authorized':True,
 'additional_execution_scope':'RD04-ND-FY2026-REQUEST-SUPPORT-ZIP-MI-NM-ORIGIN-001',
 'next_authorized_operation':'one exact locked GET to the selected MI-NM FNA archive origin; refuse any redirect before contact',
 'archive_member_inventory_sha256':inv_sha,'range_correction_sha256':cor_sha,
 'field_adjudication_sha256':field_sha,'selected_protocol_sha256':proto_sha
}
write('receipt.json',receipt)
summary=f'''# RD-04 North Dakota FY2026 archive range correction\n\nThe consumed NV-WI archive contains 16 members under NV, NY, OR, and WI and no North Dakota member. The index partitions FY2026 archives by inclusive two-letter postal-code ranges. ND satisfies MI <= ND <= NM and does not satisfy NV <= ND <= WI. The North Dakota field remains open. Exactly one unexecuted MI-NM origin route is selected.\n'''
(out_dir/'summary.md').write_text(summary,encoding='utf-8')
PY
then
  fail adjudicate_range "range_adjudication_failed"
fi

printf '%s\n' complete > "$STAGE_FILE"
printf '%s\n' 0 > "$EXIT_FILE"
(cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%P\0' | sort -z | xargs -0 sha256sum > SHA256SUMS)
(cd "$OUT" && sha256sum -c SHA256SUMS)
jq -c . "$OUT/receipt.json"
