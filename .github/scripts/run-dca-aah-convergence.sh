#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

BRANCH="agent/dca-aah-convergence-20260729"
POOF_BRANCH="agent/poof-clifford-ecology"
K0_BRANCH="agent/k0-role-neutral-wave-08"
BASE_MAIN="$(git rev-parse HEAD)"

export GIT_AUTHOR_NAME="clifford-number constitutional materializer"
export GIT_AUTHOR_EMAIL="actions@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

git config user.name "$GIT_AUTHOR_NAME"
git config user.email "$GIT_AUTHOR_EMAIL"

run_node_if_present() {
  local file="$1"
  if [[ -f "$file" ]]; then
    node "$file"
  fi
}

run_npm_if_present() {
  local script="$1"
  if node -e 'const p=require("./package.json"); process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1)' "$script"; then
    npm run "$script"
  fi
}

restore_release_noise() {
  local paths=(
    build/axm-identity.json
    build/build-hop-report.json
    build/core-thesis/security-state-organism/dispatch-receipt.json
    build/hop-graph.json
    build/migration-review.md
    build/migration-summary.json
    build/receipt-graph.json
    build/scores.json
    build/scout-report.json
    build/scout-report.md
    build/surface-graph.json
  )
  local p
  for p in "${paths[@]}"; do
    if git cat-file -e "HEAD:$p" 2>/dev/null; then
      git restore --source=HEAD --staged --worktree -- "$p"
    elif [[ -e "$p" ]]; then
      rm -rf -- "$p"
    fi
  done
}

clean_poof_transport() {
  rm -f -- \
    .github/workflows/temporary-poof-mainline-reconcile.yml \
    build/poof-mainline-reconcile-probe.txt \
    .poof-bootstrap-launch \
    .poof-mainline-reconcile-launch \
    .github/workflows/poof-bootstrap-once.yml \
    .github/workflows/poof-shallow-hardening-once.yml \
    .github/scripts/apply-poof-bootstrap.sh \
    .github/scripts/apply-poof-bootstrap.py \
    .github/scripts/apply-poof-shallow-hardening.py \
    docs/poof-clifford-hardening-finalize.md
}

validate_poof_line() {
  run_node_if_present tools/build-m05-answerable-power-sprint-09.mjs
  run_node_if_present tools/validate-m05-answerable-power-sprint-09.mjs
  run_node_if_present test/m05-answerable-power-sprint-09.test.js
  run_node_if_present test/m05-answerable-power-sprint-09-omission.test.js
  run_node_if_present tools/build-stable-ground-checkpoint.mjs
  run_node_if_present tools/validate-stable-ground-checkpoint.mjs
  run_node_if_present test/stable-ground-checkpoint.test.js
  run_npm_if_present ci:poof-ecology
  run_node_if_present test/poof-ecology-negative.test.js
}

validate_k0_line() {
  run_node_if_present tools/build-k0-role-neutral-wave-08.mjs
  run_node_if_present tools/validate-k0-role-neutral-wave-08.mjs
  run_node_if_present test/k0-role-neutral-wave-08.test.js
  run_node_if_present test/k0-role-neutral-wave-08-omission.test.js
  run_node_if_present tools/validate-k0-epistemic-admissibility.mjs
}

commit_if_dirty() {
  local message="$1"
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "$message"
  fi
}

printf '%s\n' '=== fetch canonical and source branches ==='
git fetch --no-tags origin \
  "+refs/heads/main:refs/remotes/origin/main" \
  "+refs/heads/${POOF_BRANCH}:refs/remotes/origin/${POOF_BRANCH}" \
  "+refs/heads/${K0_BRANCH}:refs/remotes/origin/${K0_BRANCH}"
POOF_SOURCE="$(git rev-parse "origin/${POOF_BRANCH}")"
K0_SOURCE="$(git rev-parse "origin/${K0_BRANCH}")"

printf '%s\n' '=== stage 1: reconcile POOF/Sprint 09 on the current main line ==='
if ! git merge-base --is-ancestor "origin/${POOF_BRANCH}" HEAD; then
  git merge --no-ff --no-edit "origin/${POOF_BRANCH}"
fi
clean_poof_transport
validate_poof_line
npm run release:check
restore_release_noise
validate_poof_line
commit_if_dirty "Reconcile POOF ecology with Sprint 09 and stable ground"
POOF_STAGE="$(git rev-parse HEAD)"

printf '%s\n' '=== stage 2: execute K0-Q02 as the ninth frozen template ==='
if ! git merge-base --is-ancestor "origin/${K0_BRANCH}" HEAD; then
  set +e
  git merge --no-ff --no-commit "origin/${K0_BRANCH}"
  merge_status=$?
  set -e
  if [[ $merge_status -ne 0 ]]; then
    mapfile -t conflicts < <(git diff --name-only --diff-filter=U)
    unknown=()
    for p in "${conflicts[@]}"; do
      case "$p" in
        .github/tmp/build-k0-wave08*|.github/tmp/k0-wave08*|.github/workflows/temporary-k0-wave08*|build/k0-wave08-export-receipt.txt|data/project/k0-*|data/research/k0-*|data/research/corpus-coverage.json|data/research/selection-adversarial-reviews.json|docs/methods/k0-*|reports/core-thesis/answerable-power/k0.*|tools/*k0*|test/*k0*)
          git checkout --theirs -- "$p"
          git add -- "$p"
          ;;
        package.json|docs/README.md|data/project/m05-*|data/project/stable-ground-*|reports/core-thesis/answerable-power/index.*|reports/core-thesis/stable-ground/*)
          git checkout --ours -- "$p"
          git add -- "$p"
          ;;
        *)
          unknown+=("$p")
          ;;
      esac
    done
    if ((${#unknown[@]})); then
      printf 'unresolved K0 merge paths:\n' >&2
      printf '  %s\n' "${unknown[@]}" >&2
      exit 1
    fi
  fi

  if [[ -f .github/tmp/build-k0-wave08.py.gz.b64 ]]; then
    base64 --decode .github/tmp/build-k0-wave08.py.gz.b64 > /tmp/build-k0-wave08.py.gz
    gzip -dc /tmp/build-k0-wave08.py.gz > /tmp/build-k0-wave08.py
    python /tmp/build-k0-wave08.py
  elif [[ -f tools/build-k0-role-neutral-wave-08.mjs ]]; then
    node tools/build-k0-role-neutral-wave-08.mjs
  else
    echo 'K0 Wave 08 source carrier and permanent builder are both absent' >&2
    exit 1
  fi

  rm -f -- \
    .github/workflows/k0-role-neutral-wave-08.yml \
    .github/workflows/temporary-k0-wave08-bootstrap.yml \
    .github/workflows/temporary-k0-wave08-export.yml \
    .github/workflows/temporary-k0-wave08-materialize.yml \
    build/k0-wave08-export-receipt.txt
  rm -f -- .github/tmp/build-k0-wave08* .github/tmp/k0-wave08*
fi

validate_k0_line
validate_poof_line
npm run release:check
restore_release_noise
validate_k0_line
validate_poof_line
commit_if_dirty "Complete K0-Q02 and close the frozen denominator at nine of nine"
K0_STAGE="$(git rev-parse HEAD)"

printf '%s\n' '=== stage 3: materialize DCA-H01 and AAH-00 below the evidence graph ==='
python .github/scripts/materialize-dca-aah-phase01.py

python - "$BASE_MAIN" "$POOF_SOURCE" "$POOF_STAGE" "$K0_SOURCE" "$K0_STAGE" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

base_main, poof_source, poof_stage, k0_source, k0_stage = sys.argv[1:]
receipt = {
    "schema_version": "dca-aah-convergence-receipt@1",
    "checkpoint_id": "DCA-AAH-CONV-2026-07-29-01",
    "as_of": "2026-07-29",
    "branch": "agent/dca-aah-convergence-20260729",
    "base_main": base_main,
    "source_heads": {
        "poof_clifford_ecology": poof_source,
        "k0_role_neutral_wave_08": k0_source,
    },
    "validated_stage_heads": {
        "poof_sprint09_stable_ground": poof_stage,
        "k0_q02_ninth_template": k0_stage,
    },
    "execution_order": [
        "reconcile_poof_against_current_main_and_preserve_historical_stable_ground",
        "execute_k0_q02_and_close_frozen_denominator_nine_of_nine",
        "freeze_dca_aah_ontology_namespace_schema_dispositions_falsifiers_and_scoring",
    ],
    "phase_state": {
        "dca_records": 0,
        "aah_candidates": {"current": 0, "target": 30},
        "independent_proofs": {"current": 0, "target": 4},
        "question_4_field_attempts": {"current": 0, "target": 1},
    },
    "claims": {
        "canonical_main": False,
        "publication_clearance": False,
        "external_adoption": False,
        "external_effect": False,
        "coordination": False,
        "common_purpose": False,
        "motive_hostility_or_suppression": False,
    },
    "graph_effect": "none",
}
path = Path("data/project/dca-aah-convergence-receipt.json")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(receipt, indent=2) + "\n")

builder = Path("tools/build-dca-aah-program.mjs")
text = builder.read_text()
needle = "  'data/project/dca-h01-field-hypothesis.json',\n"
addition = "  'data/project/dca-aah-convergence-receipt.json',\n"
if addition not in text:
    if needle not in text:
        raise SystemExit("release-path insertion anchor missing")
    text = text.replace(needle, addition + needle, 1)
    builder.write_text(text)
PY

rm -f -- \
  .github/workflows/temporary-dca-aah-convergence.yml \
  .github/scripts/materialize-dca-aah-phase01.py \
  .github/scripts/run-dca-aah-convergence.sh

node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
npm run release:check
restore_release_noise
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js

if find .github/workflows -maxdepth 1 -type f \( -name 'temporary-poof-*' -o -name 'temporary-k0-*' -o -name 'temporary-dca-aah-*' \) -print -quit | grep -q .; then
  echo 'temporary convergence workflow survived final cleanup' >&2
  exit 1
fi
if find .github/tmp -maxdepth 1 -type f \( -name 'build-k0-wave08*' -o -name 'k0-wave08*' \) -print -quit 2>/dev/null | grep -q .; then
  echo 'K0 source carrier survived final cleanup' >&2
  exit 1
fi

commit_if_dirty "Materialize graph-inert DCA-H01 and AAH-00 phase-one program"

printf '%s\n' '=== final deterministic and constitutional checks ==='
node tools/build-dca-aah-program.mjs
node tools/validate-dca-aah-program.mjs
node test/dca-aah-program.test.js
git diff --exit-code
test -z "$(git status --porcelain)"

git push origin "HEAD:${BRANCH}"
printf 'convergence complete at %s\n' "$(git rev-parse HEAD)"
