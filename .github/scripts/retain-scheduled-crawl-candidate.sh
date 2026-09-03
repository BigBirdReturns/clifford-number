#!/usr/bin/env bash
set -Eeuo pipefail

WORKSPACE="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
RECEIPT_DIR="${RUNNER_TEMP:-/tmp}/scheduled-crawl-promotion-receipt"
CHECKPOINT="$RECEIPT_DIR/checkpoint.txt"
BUNDLE="$RECEIPT_DIR/candidate.bundle"
VERIFY_RECEIPT="$RECEIPT_DIR/candidate-bundle-verify.txt"
DIGEST_RECEIPT="$RECEIPT_DIR/candidate-bundle.sha256"
BUNDLE_RECEIPT="$RECEIPT_DIR/candidate-bundle.txt"

cd "$WORKSPACE"

if [[ ! -f "$CHECKPOINT" ]]; then
  exit 0
fi

checkpoint_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$CHECKPOINT"
}

BASE_SHA="$(checkpoint_value base_sha)"
CANDIDATE_SHA="$(checkpoint_value candidate_sha)"

if [[ -z "$CANDIDATE_SHA" ]]; then
  exit 0
fi

if [[ -z "$BASE_SHA" ]]; then
  echo 'candidate checkpoint is missing base_sha' >&2
  exit 1
fi

git cat-file -e "$BASE_SHA^{commit}"
git cat-file -e "$CANDIDATE_SHA^{commit}"
test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"
test "$(git rev-parse "$CANDIDATE_SHA^")" = "$BASE_SHA"

rm -f "$BUNDLE" "$VERIFY_RECEIPT" "$DIGEST_RECEIPT" "$BUNDLE_RECEIPT"
git bundle create "$BUNDLE" HEAD "^$BASE_SHA"
git bundle verify "$BUNDLE" > "$VERIFY_RECEIPT" 2>&1
BUNDLE_SHA256="$(sha256sum "$BUNDLE" | awk '{print $1}')"
printf '%s  candidate.bundle\n' "$BUNDLE_SHA256" > "$DIGEST_RECEIPT"
{
  printf 'base_sha=%s\n' "$BASE_SHA"
  printf 'candidate_sha=%s\n' "$CANDIDATE_SHA"
  printf 'candidate_tree=%s\n' "$(git rev-parse "$CANDIDATE_SHA^{tree}")"
  printf 'bundle_sha256=%s\n' "$BUNDLE_SHA256"
  printf 'bundle_ref=HEAD\n'
  printf 'restore_hint=git fetch candidate.bundle HEAD:refs/heads/recovered-scheduled-crawl\n'
} > "$BUNDLE_RECEIPT"
