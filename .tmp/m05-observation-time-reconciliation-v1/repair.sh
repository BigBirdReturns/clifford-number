#!/usr/bin/env bash
set -euo pipefail

BASE_SHA='46b2cb3bcd611f85c49088acc453fe81c32699a0'
BASE_TREE='dff78bb3d2b1c681bb8f4ea487e6be1d203b91d3'
PRODUCT_BRANCH='agent/m05-s03-l7-intel-realization-observation-time-custody-v2'
EXPECTED_HEAD='f97e8ee7e5c9cbba5d0d45ab79e0e6cc003d5f5e'
CONTRACT='data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json'
VALIDATOR='tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs'
TEST='test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js'
WORKFLOW='.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml'
OLD_CONTRACT_BLOB='817f2b571c5f5feb755c6ac97226567630de5c38'
OLD_VALIDATOR_BLOB='e5c2afe704f1589816c6c242ba096430aac38d91'
OLD_TEST_BLOB='e04c076b0a764b77053db504b94606f3ced44c98'
WORKFLOW_BLOB='d77e5a1a6a0bc2b22801d15850da5de177795641'
OLD_SEMANTIC='5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9'
NEW_CONTRACT_BLOB='8ec9e0b68217802064ad1d5352a22acd59084635'
NEW_VALIDATOR_BLOB='a476620dcb3ad23d737f01797ea28d0debe2a88f'
NEW_TEST_BLOB='55a822d572b1a51dc0f2450c231e6ae68c80bbba'
NEW_SEMANTIC='c42673fb356e5215d7e97374b06a8c3a9a43c5c01d1e620d3cdb816ea077faff'
TARGETS=("$CONTRACT" "$VALIDATOR" "$TEST")

git fetch --no-tags origin main "$PRODUCT_BRANCH"
test "$(git rev-parse origin/main)" = "$BASE_SHA"
test "$(git rev-parse "$BASE_SHA^{tree}")" = "$BASE_TREE"
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$EXPECTED_HEAD"
test "$(git rev-parse "$EXPECTED_HEAD^")" = "$BASE_SHA"
test "$(git rev-parse "$EXPECTED_HEAD:$CONTRACT")" = "$OLD_CONTRACT_BLOB"
test "$(git rev-parse "$EXPECTED_HEAD:$VALIDATOR")" = "$OLD_VALIDATOR_BLOB"
test "$(git rev-parse "$EXPECTED_HEAD:$TEST")" = "$OLD_TEST_BLOB"
test "$(git rev-parse "$EXPECTED_HEAD:$WORKFLOW")" = "$WORKFLOW_BLOB"

git switch --detach "$EXPECTED_HEAD"
git switch -C "$PRODUCT_BRANCH"
backup="$(mktemp -d)"
trap 'rm -rf "$backup"' EXIT

python - <<'PY'
from pathlib import Path
import hashlib
import json

contract = Path('data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json')
validator = Path('tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs')
test = Path('test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js')
old_semantic = '5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9'
new_semantic = 'c42673fb356e5215d7e97374b06a8c3a9a43c5c01d1e620d3cdb816ea077faff'
old_contract_blob = '817f2b571c5f5feb755c6ac97226567630de5c38'
new_contract_blob = '8ec9e0b68217802064ad1d5352a22acd59084635'

obj = json.loads(contract.read_text())
for stage_id in obj['stage_order']:
    row = obj['effective_stage_observation_time_custody'][stage_id]
    if 'temporal_reconciliation_result_must_be_pass' in row:
        raise SystemExit(f'{stage_id} pass control already exists')
    rebuilt = {}
    inserted = False
    for key, value in row.items():
        rebuilt[key] = value
        if key == 'freshness_result_must_be_pass':
            rebuilt['temporal_reconciliation_result_must_be_pass'] = True
            inserted = True
    if not inserted:
        raise SystemExit(f'{stage_id} insertion point missing')
    obj['effective_stage_observation_time_custody'][stage_id] = rebuilt
copy = json.loads(json.dumps(obj))
copy.pop('observation_time_amendment_sha256')
computed = hashlib.sha256(json.dumps(copy, separators=(',', ':')).encode()).hexdigest()
if computed != new_semantic:
    raise SystemExit(f'new semantic mismatch: {computed}')
obj['observation_time_amendment_sha256'] = computed
contract.write_text(json.dumps(obj, indent=2) + '\n')

text = validator.read_text()
replacements = [
    (f"amendmentBlob:'{old_contract_blob}'", f"amendmentBlob:'{new_contract_blob}'"),
    (f"amendmentSemantic:'{old_semantic}'", f"amendmentSemantic:'{new_semantic}'"),
    ("'freshness_policy_and_result_required','freshness_result_must_be_pass'", "'freshness_policy_and_result_required','freshness_result_must_be_pass','temporal_reconciliation_result_must_be_pass'")
]
for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f'validator replacement count for {old!r}: {text.count(old)}')
    text = text.replace(old, new)
validator.write_text(text)

text = test.read_text()
replacements = [
    ("stage.trusted_clock_source_required!==true||stage.bounded_uncertainty_interval_required!==true||stage.freshness_result_must_be_pass!==true", "stage.trusted_clock_source_required!==true||stage.bounded_uncertainty_interval_required!==true||stage.freshness_result_must_be_pass!==true||stage.temporal_reconciliation_result_must_be_pass!==true"),
    (f"declared!=='{old_semantic}'", f"declared!=='{new_semantic}'")
]
for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f'test replacement count for {old!r}: {text.count(old)}')
    text = text.replace(old, new)
needle = "  ['ambiguous-order-promotion',(row)=>{row.temporal_reconciliation_rules.ambiguous_or_overlapping_order_remains_indeterminate=false}],\n"
addition = needle + "  ['indeterminate-temporal-reconciliation-admission',(row)=>{row.effective_stage_observation_time_custody.transaction.temporal_reconciliation_result_must_be_pass=false}],\n"
if text.count(needle) != 1:
    raise SystemExit(f'test insertion count: {text.count(needle)}')
text = text.replace(needle, addition)
test.write_text(text)
PY

test "$(git hash-object "$CONTRACT")" = "$NEW_CONTRACT_BLOB"
test "$(git hash-object "$VALIDATOR")" = "$NEW_VALIDATOR_BLOB"
test "$(git hash-object "$TEST")" = "$NEW_TEST_BLOB"
test "$(git hash-object "$WORKFLOW")" = "$WORKFLOW_BLOB"

for rel in "${TARGETS[@]}"; do
  mkdir -p "$backup/$(dirname "$rel")"
  cp "$rel" "$backup/$rel"
done

node --check "$VALIDATOR"
node --check "$TEST"
node tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs
node test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test.js
node tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs
node test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js
node "$VALIDATOR"
node "$TEST"
npm run release:check

git restore --staged --worktree .
for rel in "${TARGETS[@]}"; do
  cp "$backup/$rel" "$rel"
done
node "$VALIDATOR"
node "$TEST"
git add -- "${TARGETS[@]}"
python - <<'PY'
import subprocess
expected = sorted([
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js',
])
actual = sorted(subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines())
if actual != expected:
    raise SystemExit(f'staged denominator drift: {actual!r}')
PY
test "$(git hash-object "$CONTRACT")" = "$NEW_CONTRACT_BLOB"
test "$(git hash-object "$VALIDATOR")" = "$NEW_VALIDATOR_BLOB"
test "$(git hash-object "$TEST")" = "$NEW_TEST_BLOB"

git config user.name 'BigBirdReturns'
git config user.email 'bigbirdreturns@proton.me'
git commit -m '[M-05 S03-L7] Require passing temporal reconciliation'
new_head="$(git rev-parse HEAD)"
test "$(git rev-parse "$new_head^")" = "$EXPECTED_HEAD"
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git push origin "HEAD:refs/heads/$PRODUCT_BRANCH"
printf 'product_branch=%s\nproduct_head=%s\nproduct_tree=%s\n' "$PRODUCT_BRANCH" "$new_head" "$(git rev-parse HEAD^{tree})"
