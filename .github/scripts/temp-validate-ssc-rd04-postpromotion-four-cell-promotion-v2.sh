#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-four-cell-promotion-validation-v2"
rm -rf "$OUT"
mkdir -p "$OUT"
exec > >(tee "$OUT/validation.log") 2>&1
stage=bootstrap

finalize() {
  set +e
  (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS)
}

on_error() {
  local code=$?
  trap - ERR
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  jq -n \
    --arg stage "$stage" \
    --argjson exit_code "$code" \
    --arg parent "$CURRENT_MAIN" \
    --arg head "$(git rev-parse HEAD 2>/dev/null || true)" \
    '{schema_version:"ssc-rd04-postpromotion-four-cell-promotion-validation@2",state:"failed_closed",failed_or_final_stage:$stage,exit_code:$exit_code,execution_parent:$parent,execution_head:(if $head=="" then null else $head end),candidate_count:0,admissible_candidate_count:0,scope_held_candidate_count:0,validated_open_cell_count:0,held_cell_count:0,route_target_source_checks:0,route_target_locator_checks:0,matrix_updates:0,field_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",promotion_authority_created:false}' > "$OUT/validation-receipt.json"
  finalize
  exit "$code"
}
trap on_error ERR
set -Eeuo pipefail

stage=bind_carrier_and_live_main
printf '%s\n' "$CARRIER_SCRIPT_PATH" "$CARRIER_WORKFLOW_PATH" | LC_ALL=C sort > "$OUT/carrier-expected-paths.txt"
test "$(git rev-parse HEAD^^)" = "$CURRENT_MAIN"
test "$(git rev-list --count "$CURRENT_MAIN"..HEAD)" -eq 2
git diff --name-only "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-added-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-actual-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-added-paths.txt"
git diff --check "$CURRENT_MAIN" HEAD
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main"
test "$(git rev-parse origin/main)" = "$CURRENT_MAIN"
printf '%s\n' "$(git rev-parse "$CURRENT_MAIN^{tree}")" > "$OUT/current-main-tree.txt"

stage=bind_exact_inputs
while IFS='|' read -r path blob; do
  test "$(git hash-object "$path")" = "$blob"
done <<EOF_INPUTS
$MATRIX_PATH|$MATRIX_BLOB
$PROTOCOL_PATH|$PROTOCOL_BLOB
$FIELD_ADJUDICATIONS_PATH|$FIELD_ADJUDICATIONS_BLOB
$CAPTURE_CUSTODY_PATH|$CAPTURE_CUSTODY_BLOB
$SOURCE_ADJUDICATIONS_PATH|$SOURCE_ADJUDICATIONS_BLOB
$PDF_REVIEW_PATH|$PDF_REVIEW_BLOB
$PRODUCT_VALIDATOR_PATH|$PRODUCT_VALIDATOR_BLOB
$PRODUCT_TEST_PATH|$PRODUCT_TEST_BLOB
EOF_INPUTS

stage=replay_scope_repaired_product_gates
node "$PRODUCT_VALIDATOR_PATH"
node "$PRODUCT_TEST_PATH"
node tools/validate-no-magic-human-gate.mjs

stage=validate_candidate_cells_source_custody_and_route_targets
python - <<'PY'
import hashlib
import json
import os
import pathlib
import subprocess

root = pathlib.Path('.')
out = pathlib.Path(os.environ['RUNNER_TEMP']) / 'ssc-rd04-postpromotion-four-cell-promotion-validation-v2'
specs = {
    'matrix': (os.environ['MATRIX_PATH'], os.environ['MATRIX_BLOB']),
    'promotion_candidate_protocol': (os.environ['PROTOCOL_PATH'], os.environ['PROTOCOL_BLOB']),
    'field_adjudications': (os.environ['FIELD_ADJUDICATIONS_PATH'], os.environ['FIELD_ADJUDICATIONS_BLOB']),
    'capture_custody': (os.environ['CAPTURE_CUSTODY_PATH'], os.environ['CAPTURE_CUSTODY_BLOB']),
    'source_adjudications': (os.environ['SOURCE_ADJUDICATIONS_PATH'], os.environ['SOURCE_ADJUDICATIONS_BLOB']),
    'pdf_review_receipts': (os.environ['PDF_REVIEW_PATH'], os.environ['PDF_REVIEW_BLOB']),
    'product_validator': (os.environ['PRODUCT_VALIDATOR_PATH'], os.environ['PRODUCT_VALIDATOR_BLOB']),
    'product_adversarial_test': (os.environ['PRODUCT_TEST_PATH'], os.environ['PRODUCT_TEST_BLOB']),
}
route_targets = {
    'RD04-W03-PPN-MT-001': {
        'operative_state_implementation_authority_and_version',
        'implementation_effective_date_or_typed_gap',
    },
    'RD04-W03-PPN-MT-002': {
        'operative_state_implementation_authority_and_version',
        'implementation_effective_date_or_typed_gap',
    },
    'RD04-W03-PPN-MT-003': {
        'abawd_or_work_requirement_waiver_state_and_governing_period',
        'implementation_effective_date_or_typed_gap',
    },
    'RD04-W03-PPN-ND-001': {
        'operative_state_implementation_authority_and_version',
        'implementation_effective_date_or_typed_gap',
    },
    'RD04-W03-PPN-ND-002': {
        'abawd_or_work_requirement_waiver_state_and_governing_period',
        'implementation_effective_date_or_typed_gap',
    },
}

def canonical_sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def load(name):
    rel, blob = specs[name]
    path = root / rel
    data = path.read_bytes()
    observed = subprocess.check_output(['git', 'hash-object', str(path)], text=True).strip()
    assert observed == blob, (name, observed, blob)
    inventory = {
        'path': rel,
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'git_blob': observed,
    }
    if rel.endswith('.json'):
        return json.loads(data), inventory
    return None, inventory

loaded = {}
inventory = {}
for name in specs:
    loaded[name], inventory[name] = load(name)

matrix = loaded['matrix']
protocol = loaded['promotion_candidate_protocol']
fields = loaded['field_adjudications']
capture = loaded['capture_custody']
sources = loaded['source_adjudications']
pdfs = loaded['pdf_review_receipts']

counts = matrix['counts']
assert (
    counts['materialized_cells'],
    counts['terminal_cells'],
    counts['still_open_cells'],
    counts['still_open_substantive_cells'],
    counts['terminal_units'],
) == (450, 222, 228, 188, 10)
assert matrix['current_result']['class_closed'] is False
assert (protocol['candidate_count'], protocol['unique_candidate_cell_count'], protocol['held_cell_count']) == (4, 4, 2)
assert (protocol['matrix_updates'], protocol['field_terminalizations'], protocol['row_state_mutations'], protocol['class_closed']) == (0, 0, 0, False)

expected = [
    ('MT', 'operative_state_implementation_authority_and_version', 'RD04-PPN-CANDIDATE-MT-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION'),
    ('MT', 'implementation_effective_date_or_typed_gap', 'RD04-PPN-CANDIDATE-MT-IMPLEMENTATION-EFFECTIVE-DATE-OR-TYPED-GAP'),
    ('MT', 'abawd_or_work_requirement_waiver_state_and_governing_period', 'RD04-PPN-CANDIDATE-MT-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD'),
    ('ND', 'implementation_effective_date_or_typed_gap', 'RD04-PPN-CANDIDATE-ND-IMPLEMENTATION-EFFECTIVE-DATE-OR-TYPED-GAP'),
]
assert [(c['postal_code'], c['field_id'], c['candidate_id']) for c in protocol['candidates']] == expected

field_by_id = {decision['decision_id']: decision for decision in fields['decisions']}
source_by_route = {decision['route_id']: decision for decision in sources['decisions']}
body_by_route = {body['route_id']: body for body in capture['unique_bodies']}
pdf_receipts = pdfs['receipts']
assert capture['transport_ledger']['unique_route_count'] == 5
assert capture['transport_ledger']['unique_body_identity_count'] == 5
assert capture['transport_ledger']['duplicate_execution_substantive_weight_effect'] == 'none'
assert sources['authority_boundary']['source_admissions_created'] == 4
assert fields['authority_boundary']['field_terminalizations_created'] == 0
assert pdfs['authority_boundary']['source_admissions_created'] == 3

for source in sources['decisions']:
    allowed = route_targets[source['route_id']]
    assert set(source['candidate_fields_for_offline_review']).issubset(allowed), source['route_id']

validations = []
source_target_checks = 0
locator_target_checks = 0
for ordinal, candidate in enumerate(protocol['candidates'], 1):
    assert candidate['candidate_ordinal'] == ordinal
    assert candidate['current_cell_requirement'] == 'must_remain_still_open_on_exact_promotion_parent'
    assert candidate['promotion_effect_authorized_here'] == 'none'
    assert candidate['row_state_effect'] == 'none'
    assert candidate['class_closed'] is False
    assert candidate['cumulative_ledger_effect'] == 'none'

    row = next(row for row in matrix['rows'] if row['unit_id'] == candidate['unit_id'] and row['postal_code'] == candidate['postal_code'])
    cell = next(cell for cell in row['cells'] if cell['field_id'] == candidate['field_id'])
    assert cell['state'] == 'still_open' and cell['terminal'] is False

    decision = field_by_id[candidate['decision_id']]
    assert decision['unit_id'] == candidate['unit_id']
    assert decision['field_id'] == candidate['field_id']
    assert decision['promotion_candidate'] is True
    assert decision['disposition'] == 'evidence_complete_bounded_finding'
    assert decision['bounded_finding'] == candidate['bounded_finding']
    assert decision['source_route_ids'] == candidate['source_route_ids']
    assert decision['evidence_locators'] == candidate['evidence_locators']
    assert decision['substantive_field_terminalizations'] == 0
    assert decision['row_state_effect'] == 'none'

    source_rows = []
    for route_id in candidate['source_route_ids']:
        source_target_checks += 1
        assert candidate['field_id'] in route_targets[route_id], (candidate['candidate_id'], route_id)
        source = source_by_route[route_id]
        body = body_by_route[route_id]
        assert candidate['field_id'] in source['candidate_fields_for_offline_review'], (candidate['candidate_id'], route_id)
        assert source['source_admitted_for_narrow_scope'] is True
        assert source['substantive_weight_count'] == 1
        assert (source['body_sha256'], source['body_bytes'], source['final_url']) == (body['body_sha256'], body['body_bytes'], body['final_url'])
        reviewed = None
        if str(source['content_type']).startswith('application/pdf'):
            matches = [receipt for receipt in pdf_receipts if receipt.get('route_id') == route_id or receipt.get('body_sha256') == source['body_sha256']]
            assert len(matches) == 1
            review = matches[0]
            assert review['all_pages_rendered'] is True
            assert review['all_pages_visually_reviewed'] is True
            assert (review['body_sha256'], review['body_bytes']) == (source['body_sha256'], source['body_bytes'])
            reviewed = True
        source_rows.append({
            'route_id': route_id,
            'source_decision_id': source['source_decision_id'],
            'requested_url': source['requested_url'],
            'final_url': source['final_url'],
            'content_type': source['content_type'],
            'body_bytes': source['body_bytes'],
            'body_sha256': source['body_sha256'],
            'response_receipt_sha256': source['response_receipt_sha256'],
            'pdf_review_receipt_id': source.get('pdf_review_receipt_id'),
            'pdf_all_pages_reviewed': reviewed,
            'target_field_authorized': True,
        })

    for locator in candidate['evidence_locators']:
        locator_target_checks += 1
        assert candidate['field_id'] in route_targets[locator['route_id']], (candidate['candidate_id'], locator['route_id'])

    validations.append({
        'candidate_ordinal': ordinal,
        'candidate_id': candidate['candidate_id'],
        'decision_id': candidate['decision_id'],
        'unit_id': candidate['unit_id'],
        'postal_code': candidate['postal_code'],
        'state_name': candidate['state_name'],
        'field_id': candidate['field_id'],
        'current_cell_state': cell['state'],
        'current_cell_terminal': cell['terminal'],
        'current_cell_canonical_sha256': canonical_sha(cell),
        'current_row_canonical_sha256': canonical_sha(row),
        'bounded_finding': candidate['bounded_finding'],
        'evidence_locators': candidate['evidence_locators'],
        'source_route_ids': candidate['source_route_ids'],
        'source_custody': source_rows,
        'exact_current_cell_validation': 'pass',
        'candidate_and_source_identity_validation': 'pass',
        'route_target_subset_validation': 'pass',
        'promotion_authority_created': False,
    })

held = [decision for decision in fields['decisions'] if not decision['promotion_candidate']]
expected_held = {
    'RD04-PPN-ND-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION': 'no_relevant_support_hold_open',
    'RD04-PPN-ND-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD': 'temporal_or_scope_ambiguity_hold_open',
}
assert len(held) == 2
assert {decision['decision_id']: decision['disposition'] for decision in held} == expected_held
for decision in held:
    assert decision['selected_followup_route_ids']
    assert decision['substantive_field_terminalizations'] == 0

receipt = {
    'schema_version': 'ssc-rd04-postpromotion-four-cell-promotion-validation@2',
    'state': 'validated',
    'failed_or_final_stage': 'complete',
    'exit_code': 0,
    'issue': 1017,
    'wave_id': 'SSC-RD-W03',
    'lane_id': 'RD-04',
    'class_id': 'RD-04-C02',
    'supersedes_validation_pr': 1547,
    'scope_repair_merge': 'd35deab5ef1e255e5957f29e11fe53fcf74e1cfd',
    'workflow_run': int(os.environ['GITHUB_RUN_ID']),
    'execution_parent': os.environ['CURRENT_MAIN'],
    'execution_parent_tree': subprocess.check_output(['git', 'rev-parse', f"{os.environ['CURRENT_MAIN']}^{{tree}}"], text=True).strip(),
    'execution_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'input_inventory': inventory,
    'candidate_count': 4,
    'unique_candidate_cell_count': 4,
    'admissible_candidate_count': 4,
    'scope_held_candidate_count': 0,
    'validated_open_cell_count': 4,
    'held_cell_count': 2,
    'route_target_source_checks': source_target_checks,
    'route_target_locator_checks': locator_target_checks,
    'held_decisions': [{'decision_id': key, 'disposition': value} for key, value in sorted(expected_held.items())],
    'validations': validations,
    'matrix_transition_if_separately_promoted': {
        'terminal_cells_before': 222,
        'terminal_cells_after': 226,
        'still_open_cells_before': 228,
        'still_open_cells_after': 224,
        'open_substantive_cells_before': 188,
        'open_substantive_cells_after': 184,
        'terminal_units_before': 10,
        'terminal_units_after': 10,
    },
    'matrix_updates': 0,
    'field_terminalizations': 0,
    'row_state_mutations': 0,
    'class_closed': False,
    'cumulative_ledger_effect': 'none',
    'outside_human_dependency': False,
    'publication_effect': 'none',
    'adoption_effect': 'none',
    'graph_effect': 'none',
    'promotion_authority_created': False,
    'next_authorized_operation': 'construct a separate permanent four-cell promotion product over this exact parent and these exact candidate, source, PDF-review, and route-target identities; exclude both held North Dakota cells',
}
payload = json.dumps(receipt, indent=2, sort_keys=True) + '\n'
(out / 'validation-receipt.json').write_text(payload)
(out / 'validation-receipt-sha256.txt').write_text(hashlib.sha256(payload.encode()).hexdigest() + '\n')
(out / 'input-inventory.json').write_text(json.dumps(inventory, indent=2, sort_keys=True) + '\n')
(out / 'candidate-validation-ledger.json').write_text(json.dumps(validations, indent=2, sort_keys=True) + '\n')
print(f"postpromotion_promotion_validation_v2=pass candidates={len(validations)} held={len(held)} source_target_checks={source_target_checks} locator_target_checks={locator_target_checks} matrix={counts['terminal_cells']}/450")
PY

stage=reconfirm_live_lease
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
finalize
