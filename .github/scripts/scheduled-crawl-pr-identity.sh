#!/usr/bin/env bash

# Loaded only through BASH_ENV by the scheduled-crawl promotion step. The gate
# delegates every command to the runner binaries except the exact candidate
# publication and pull-request creation operations described below.

if [[ -z "${SCHEDULED_CRAWL_REAL_GIT:-}" ]]; then
  SCHEDULED_CRAWL_REAL_GIT="$(type -P git)"
fi
if [[ -z "${SCHEDULED_CRAWL_REAL_GH:-}" ]]; then
  SCHEDULED_CRAWL_REAL_GH="$(type -P gh)"
fi
readonly SCHEDULED_CRAWL_REAL_GIT SCHEDULED_CRAWL_REAL_GH

scheduled_crawl_write_pr_identity_receipt() {
  local state="$1"
  local token_state="$2"
  local receipt_dir="${RECEIPT_DIR:-${RUNNER_TEMP:-/tmp}/scheduled-crawl-promotion-receipt}"

  mkdir -p "$receipt_dir"
  {
    printf 'state=%s\n' "$state"
    printf 'mint_outcome=%s\n' "${SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME:-unknown}"
    printf 'app_slug=%s\n' "${SCHEDULED_CRAWL_PR_APP_SLUG:-}"
    printf 'installation_id=%s\n' "${SCHEDULED_CRAWL_PR_INSTALLATION_ID:-}"
    printf 'token_state=%s\n' "$token_state"
  } > "$receipt_dir/pr-publication-identity.txt"
}

scheduled_crawl_pr_identity_available() {
  [[ "${SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME:-}" == 'success' &&
     -n "${SCHEDULED_CRAWL_PR_TOKEN:-}" ]]
}

git() {
  local is_candidate_publication='false'
  local rc=0

  if [[ "$#" -eq 3 &&
        "${1:-}" == 'push' &&
        "${2:-}" == 'origin' &&
        -n "${CANDIDATE_SHA:-}" &&
        -n "${CANDIDATE_BRANCH:-}" &&
        "${3:-}" == "${CANDIDATE_SHA}:refs/heads/${CANDIDATE_BRANCH}" ]]; then
    is_candidate_publication='true'
    if ! scheduled_crawl_pr_identity_available; then
      STAGE='require-pull-request-publication-identity'
      OUTCOME='publication_identity_unavailable'
      PR_PUBLISHER_IDENTITY='unavailable'
      scheduled_crawl_write_pr_identity_receipt 'unavailable_before_branch_publication' 'absent'
      echo 'The dedicated scheduled-crawl pull-request identity is unavailable; refusing remote candidate publication.' >&2
      return 86
    fi

    PR_PUBLISHER_IDENTITY='available_before_branch_publication'
    scheduled_crawl_write_pr_identity_receipt 'available_before_branch_publication' 'present'
  fi

  "$SCHEDULED_CRAWL_REAL_GIT" "$@" || rc=$?
  if [[ "$is_candidate_publication" == 'true' && "$rc" -ne 0 ]]; then
    unset SCHEDULED_CRAWL_PR_TOKEN
    PR_PUBLISHER_IDENTITY='candidate_branch_publication_failed'
    scheduled_crawl_write_pr_identity_receipt 'candidate_branch_publication_failed' 'unset'
  fi
  return "$rc"
}

gh() {
  local rc=0

  if [[ "$#" -eq 6 &&
        "${1:-}" == 'api' &&
        "${2:-}" == '--method' &&
        "${3:-}" == 'POST' &&
        "${4:-}" == "repos/${REPO:-}/pulls" &&
        "${5:-}" == '--input' &&
        "${6:-}" == '-' ]]; then
    if ! scheduled_crawl_pr_identity_available; then
      STAGE='open-ordinary-pull-request'
      OUTCOME='publication_identity_unavailable'
      PR_PUBLISHER_IDENTITY='unavailable'
      scheduled_crawl_write_pr_identity_receipt 'unavailable_before_pr_creation' 'absent'
      echo 'The dedicated scheduled-crawl pull-request identity is unavailable; refusing pull-request creation.' >&2
      return 86
    fi

    GH_TOKEN="$SCHEDULED_CRAWL_PR_TOKEN" "$SCHEDULED_CRAWL_REAL_GH" "$@" || rc=$?
    unset SCHEDULED_CRAWL_PR_TOKEN
    if [[ "$rc" -ne 0 ]]; then
      OUTCOME='publication_identity_pr_create_failed'
      PR_PUBLISHER_IDENTITY='pr_create_failed'
      scheduled_crawl_write_pr_identity_receipt 'pr_create_failed' 'unset'
    else
      PR_PUBLISHER_IDENTITY='used_for_pr_create_only'
      scheduled_crawl_write_pr_identity_receipt 'used_for_pr_create_only' 'unset'
    fi
    return "$rc"
  fi

  "$SCHEDULED_CRAWL_REAL_GH" "$@"
}
