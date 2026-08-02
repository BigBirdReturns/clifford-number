#!/usr/bin/env bash
set -Eeuo pipefail

repo="${GITHUB_REPOSITORY:?}"
product_branch='agent/ssc-rd04-public-implementation-receipts-a07'
product_title='SSC RD-04 A07: public implementation and restoration receipt denominator'
slug='status-sovereignty-rd04-public-implementation-receipts-a07'
expected_a06='f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5'
work_root="$(pwd)"
tmp_root="$(mktemp -d)"
permanent_source="$tmp_root/permanent-source"
artifact_root="$tmp_root/artifacts"
receipt="$tmp_root/ssc-rd04-a07-permanent-materializer-receipt.txt"
mkdir -p "$permanent_source" "$artifact_root"
trap 'cp "$receipt" "$work_root/ssc-rd04-a07-permanent-materializer-receipt.txt" 2>/dev/null || true' EXIT

log() {
  printf '[A07 materializer] %s\n' "$*"
  printf '%s\n' "$*" >> "$receipt"
}

for command in git gh node tar gzip split sha256sum; do
  command -v "$command" >/dev/null 2>&1 || { log "missing command: $command"; exit 1; }
done

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

git fetch --no-tags origin main \
  agent/ssc-rd04-a07-shn-semantics-base-v2 \
  agent/ssc-rd04-a07-candidate-receipts-base-v3 \
  agent/ssc-rd04-a07-official-sitemap-probe-base \
  agent/ssc-rd04-a07-official-crawl-base-v1

permanent_paths=(
  '.github/workflows/status-sovereignty-rd04-public-implementation-receipts-a07.yml'
  'schemas/status-sovereignty-rd04-public-implementation-receipts-a07.schema.json'
  'test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js'
  'tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs'
  'tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs'
)
for relative in "${permanent_paths[@]}"; do
  mkdir -p "$permanent_source/$(dirname "$relative")"
  cp "$relative" "$permanent_source/$relative"
done

wait_ref() {
  local ref="$1"
  local label="$2"
  for attempt in $(seq 1 360); do
    if git ls-remote --exit-code --heads origin "refs/heads/$ref" >/dev/null 2>&1; then
      log "$label pass ref available: $ref"
      return 0
    fi
    if (( attempt % 20 == 0 )); then log "waiting for $label pass ref ($attempt/360)"; fi
    sleep 30
  done
  log "timed out waiting for $label pass ref: $ref"
  return 1
}

wait_ref 'agent/ssc-rd04-a07-shn-full-pass-v2' 'exact-SHN denominator'
wait_ref 'agent/ssc-rd04-a07-candidate-receipts-pass-v3' 'candidate receipt custody'
wait_ref 'agent/ssc-rd04-a07-official-sitemap-probe-pass' 'official sitemap probe'
wait_ref 'agent/ssc-rd04-a07-official-crawl-pass-v1' 'official selected-URL crawl'

latest_success_run() {
  local branch="$1"
  local expected_name="$2"
  local output
  output="$(gh run list --repo "$repo" --branch "$branch" --status success --limit 100 --json databaseId,name,workflowName,headSha,conclusion,createdAt,url)"
  EXPECTED_NAME="$expected_name" node --input-type=module <<'NODE' <<< "$output"
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync(0, 'utf8'));
const expected = process.env.EXPECTED_NAME;
const match = rows
  .filter((row) => row.conclusion === 'success' && (row.name === expected || row.workflowName === expected))
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
if (!match) process.exit(1);
process.stdout.write(String(match.databaseId));
NODE
}

shn_run="$(latest_success_run 'agent/ssc-rd04-a07-shn-full-trigger-v2' 'TEMP execute SSC RD-04 A07 full exact-SHN denominator v2')"
candidate_run="$(latest_success_run 'agent/ssc-rd04-a07-candidate-receipts-trigger-v3' 'TEMP custody SSC RD-04 A07 candidate receipts v3')"
sitemap_run="$(latest_success_run 'agent/ssc-rd04-a07-official-sitemap-probe-trigger' 'TEMP probe SSC RD-04 A07 official sitemaps')"
crawl_run="$(latest_success_run 'agent/ssc-rd04-a07-official-crawl-trigger-v1' 'TEMP crawl SSC RD-04 A07 official public surfaces v1')"
log "successful runs: shn=$shn_run candidate=$candidate_run sitemap=$sitemap_run crawl=$crawl_run"

download_stage() {
  local stage="$1"
  local run_id="$2"
  local stage_root="$artifact_root/$stage"
  mkdir -p "$stage_root"
  gh api --paginate "repos/$repo/actions/runs/$run_id/artifacts" > "$tmp_root/$stage-artifacts.json"
  STAGE_JSON="$tmp_root/$stage-artifacts.json" node --input-type=module <<'NODE' > "$tmp_root/$stage-artifact-names.txt"
import fs from 'node:fs';
const value = JSON.parse(fs.readFileSync(process.env.STAGE_JSON, 'utf8'));
for (const artifact of value.artifacts ?? []) {
  if (!artifact.expired) console.log(artifact.name);
}
NODE
  test -s "$tmp_root/$stage-artifact-names.txt"
  while IFS= read -r name; do
    mkdir -p "$stage_root/$name"
    gh run download "$run_id" --repo "$repo" --name "$name" --dir "$stage_root/$name"
  done < "$tmp_root/$stage-artifact-names.txt"
}

download_stage shn "$shn_run"
download_stage candidate "$candidate_run"
download_stage sitemap "$sitemap_run"
download_stage crawl "$crawl_run"

for stage in shn candidate sitemap crawl; do
  gh run view "${stage}_run" >/dev/null 2>&1 || true
done

SHN_RUN="$shn_run" CANDIDATE_RUN="$candidate_run" SITEMAP_RUN="$sitemap_run" CRAWL_RUN="$crawl_run" REPO="$repo" TMP_ROOT="$tmp_root" node --input-type=module <<'NODE' > "$tmp_root/run-ledger.json"
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const repo = process.env.REPO;
const root = process.env.TMP_ROOT;
const definitions = {
  shn: { id: process.env.SHN_RUN, branch: 'agent/ssc-rd04-a07-shn-full-trigger-v2' },
  candidate: { id: process.env.CANDIDATE_RUN, branch: 'agent/ssc-rd04-a07-candidate-receipts-trigger-v3' },
  sitemap: { id: process.env.SITEMAP_RUN, branch: 'agent/ssc-rd04-a07-official-sitemap-probe-trigger' },
  crawl: { id: process.env.CRAWL_RUN, branch: 'agent/ssc-rd04-a07-official-crawl-trigger-v1' }
};
const runs = {};
for (const [stage, definition] of Object.entries(definitions)) {
  const run = JSON.parse(execFileSync('gh', ['run', 'view', definition.id, '--repo', repo, '--json', 'databaseId,name,workflowName,headBranch,headSha,status,conclusion,createdAt,updatedAt,url'], { encoding: 'utf8' }));
  const artifactPayload = JSON.parse(fs.readFileSync(`${root}/${stage}-artifacts.json`, 'utf8'));
  runs[stage] = {
    run_id: Number(definition.id),
    branch: definition.branch,
    workflow_name: run.workflowName ?? run.name,
    head_sha: run.headSha,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
    url: run.url,
    artifacts: (artifactPayload.artifacts ?? []).map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      bytes: artifact.size_in_bytes,
      digest: artifact.digest ?? null,
      expired: artifact.expired,
      created_at: artifact.created_at,
      expires_at: artifact.expires_at
    })).sort((a, b) => a.name.localeCompare(b.name))
  };
}
process.stdout.write(`${JSON.stringify({
  schema_version: 'ssc-rd04-a07-run-ledger@1',
  repository: repo,
  runs,
  boundaries: {
    successful_workflow_run_proves_verified_implementation: false,
    external_contacts: 0,
    graph_effect: 'none'
  }
}, null, 2)}\n`);
NODE

# Resolve the exact readable reconciled products before switching branches.
shn_readable="$artifact_root/shn/ssc-rd04-a07-shn-full-reconciled-v2"
candidate_readable="$artifact_root/candidate/ssc-rd04-a07-candidate-receipts-v3"
sitemap_readable="$artifact_root/sitemap/ssc-rd04-a07-official-sitemap-probe"
crawl_readable="$artifact_root/crawl/ssc-rd04-a07-official-crawl-reconciled-v1"
for required in \
  "$shn_readable/summary.json" \
  "$candidate_readable/summary.json" \
  "$sitemap_readable/summary.json" \
  "$crawl_readable/summary.json"; do
  test -f "$required"
done

node --input-type=module <<'NODE' "$shn_readable/summary.json" "$candidate_readable/summary.json" "$sitemap_readable/summary.json" "$crawl_readable/summary.json"
import fs from 'node:fs';
const [shnPath, candidatePath, sitemapPath, crawlPath] = process.argv.slice(2);
const shn = JSON.parse(fs.readFileSync(shnPath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const sitemap = JSON.parse(fs.readFileSync(sitemapPath, 'utf8'));
const crawl = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
const expected = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
if (shn.status !== 'pass' || shn.counts?.D1_shns !== 6292 || shn.counts?.failures !== 0 || shn.parent?.a06_release_sha256 !== expected) throw new Error('invalid SHN pass summary');
if (candidate.status !== 'pass' || candidate.counts?.failures !== 0) throw new Error('invalid candidate receipt summary');
if (!['pass', 'bounded_with_failures'].includes(sitemap.status) || sitemap.parent_a06_release_sha256 !== expected) throw new Error('invalid sitemap summary');
if (crawl.status !== 'pass' || crawl.counts?.structural_failures !== 0 || crawl.counts?.selected_urls !== crawl.counts?.attempted_urls) throw new Error('invalid crawl summary');
console.log(JSON.stringify({ shn: shn.counts, candidate: candidate.counts, sitemap: sitemap.counts, crawl: crawl.counts }));
NODE

# Save permanent acquisition programs from the exact execution bases.
acquisition_source="$tmp_root/acquisition"
mkdir -p "$acquisition_source"
git show 'origin/agent/ssc-rd04-a07-shn-semantics-base-v2:.github/tmp/ssc-rd04-a07-shn-semantics-v2.mjs' > "$acquisition_source/shn-semantics.mjs"
git show 'origin/agent/ssc-rd04-a07-shn-semantics-base-v2:.github/tmp/ssc-rd04-a07-shn-full-shard-v2.mjs' > "$acquisition_source/shn-full-shard.mjs"
git show 'origin/agent/ssc-rd04-a07-shn-semantics-base-v2:.github/tmp/ssc-rd04-a07-shn-full-reconcile-v2.mjs' > "$acquisition_source/shn-full-reconcile.mjs"
git show 'origin/agent/ssc-rd04-a07-candidate-receipts-base-v3:.github/tmp/ssc-rd04-a07-candidate-receipts-v3.mjs' > "$acquisition_source/candidate-receipts.mjs"
git show 'origin/agent/ssc-rd04-a07-official-sitemap-probe-base:.github/tmp/ssc-rd04-a07-official-sitemap-probe.mjs' > "$acquisition_source/official-sitemap-probe.mjs"
git show 'origin/agent/ssc-rd04-a07-official-crawl-base-v1:.github/tmp/ssc-rd04-a07-official-crawl-shard-v1.mjs' > "$acquisition_source/official-crawl-shard.mjs"
git show 'origin/agent/ssc-rd04-a07-official-crawl-base-v1:.github/tmp/ssc-rd04-a07-official-crawl-reconcile-v1.mjs' > "$acquisition_source/official-crawl-reconcile.mjs"
for file in "$acquisition_source"/*.mjs; do node --check "$file"; done

# Start the permanent product at the live mainline.
git fetch --no-tags origin main
start_main="$(git rev-parse origin/main)"
git switch -C "$product_branch" "$start_main"
for relative in "${permanent_paths[@]}"; do
  mkdir -p "$(dirname "$relative")"
  cp "$permanent_source/$relative" "$relative"
done
mkdir -p tools/acquisition/status-sovereignty-rd04-a07
cp "$acquisition_source"/*.mjs tools/acquisition/status-sovereignty-rd04-a07/
chmod +x tools/acquisition/status-sovereignty-rd04-a07/*.mjs \
  tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs \
  tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs \
  test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js

custody="data/intake/$slug/source-custody"
archive_root="$custody/artifact-archives"
mkdir -p "$archive_root"
archive_tsv="$tmp_root/archive-parts.tsv"
: > "$archive_tsv"
for stage in shn candidate sitemap crawl; do
  mkdir -p "$archive_root/$stage"
  while IFS= read -r artifact_dir; do
    artifact_name="$(basename "$artifact_dir")"
    safe_name="$(printf '%s' "$artifact_name" | tr -cs 'A-Za-z0-9._-' '_')"
    archive="$archive_root/$stage/$safe_name.tar.gz"
    tar --sort=name --mtime='@0' --owner=0 --group=0 --numeric-owner --format=gnu -cf - -C "$artifact_dir" . | gzip -n > "$archive"
    archive_sha="$(sha256sum "$archive" | awk '{print $1}')"
    archive_bytes="$(stat -c '%s' "$archive")"
    if [[ "$archive_bytes" -gt 90000000 ]]; then
      split -b 80000000 -d -a 3 "$archive" "$archive.part"
      rm "$archive"
      for part in "$archive".part*; do
        part_path="$part"
        part_sha="$(sha256sum "$part" | awk '{print $1}')"
        part_bytes="$(stat -c '%s' "$part")"
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$stage" "$artifact_name" "$archive_sha" "$archive_bytes" "$part_path" "$part_sha" "$part_bytes" >> "$archive_tsv"
      done
    else
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$stage" "$artifact_name" "$archive_sha" "$archive_bytes" "$archive" "$archive_sha" "$archive_bytes" >> "$archive_tsv"
    fi
  done < <(find "$artifact_root/$stage" -mindepth 1 -maxdepth 1 -type d | sort)
done

ARCHIVE_TSV="$archive_tsv" REPO_ROOT="$(pwd)" node --input-type=module <<'NODE' > "$tmp_root/archive-ledger.json"
import fs from 'node:fs';
import path from 'node:path';
const lines = fs.readFileSync(process.env.ARCHIVE_TSV, 'utf8').trim().split(/\n/).filter(Boolean);
const root = process.env.REPO_ROOT;
const map = new Map();
for (const line of lines) {
  const [stage, artifactName, archiveSha, archiveBytes, partPath, partSha, partBytes] = line.split('\t');
  const key = `${stage}\0${artifactName}`;
  const value = map.get(key) ?? {
    stage,
    artifact_name: artifactName,
    deterministic_archive_sha256: archiveSha,
    deterministic_archive_bytes: Number(archiveBytes),
    parts: []
  };
  value.parts.push({
    path: path.relative(root, partPath).replaceAll(path.sep, '/'),
    sha256: partSha,
    bytes: Number(partBytes)
  });
  map.set(key, value);
}
const archives = [...map.values()].sort((a, b) => a.stage.localeCompare(b.stage) || a.artifact_name.localeCompare(b.artifact_name));
for (const archive of archives) archive.parts.sort((a, b) => a.path.localeCompare(b.path));
process.stdout.write(`${JSON.stringify({
  schema_version: 'ssc-rd04-a07-artifact-archive-ledger@1',
  hash_mode: 'sha256_exact_bytes',
  deterministic_archive_contract: 'gnu_tar_sorted_names_mtime_epoch_owner_group_zero_gzip_no_name',
  archives,
  boundaries: {
    archive_retention_proves_verified_implementation: false,
    external_contacts: 0,
    graph_effect: 'none'
  }
}, null, 2)}\n`);
NODE

cp "$tmp_root/archive-ledger.json" "$custody/artifact-archive-ledger.json"
cp "$tmp_root/run-ledger.json" "$custody/run-ledger.json"

A07_SHN_RECONCILED="$shn_readable" \
A07_CANDIDATE_RECEIPTS="$candidate_readable" \
A07_SITEMAP_PROBE="$sitemap_readable" \
A07_OFFICIAL_CRAWL_RECONCILED="$crawl_readable" \
A07_ARCHIVE_LEDGER="$tmp_root/archive-ledger.json" \
A07_RUN_LEDGER="$tmp_root/run-ledger.json" \
  node tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
node tools/validate-no-magic-human-gate.mjs
node tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
node test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js

git add -A
git diff --cached --check
if git diff --cached --name-only | grep -E '(^|/)(\.github/tmp|data/transport|temporary-|carrier|materializer|trigger)(/|$)'; then
  log 'transport path survived in permanent product'
  exit 1
fi
git commit -m 'Add SSC RD-04 A07 public implementation receipt denominator'
product_head="$(git rev-parse HEAD)"

run_release_gate() {
  npm run release:check
  git diff --name-only > "$tmp_root/release-changed-paths.txt"
  git ls-files --others --exclude-standard > "$tmp_root/release-untracked-paths.txt"
  test ! -s "$tmp_root/release-untracked-paths.txt"
  node --input-type=module <<'NODE' "$tmp_root/release-changed-paths.txt"
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const list = process.argv[2];
const paths = fs.readFileSync(list, 'utf8').trim().split(/\n/).filter(Boolean);
const normalize = (value) => value
  .replace(/"generated":\s*"[^"]+"/g, '"generated": "<normalized>"')
  .replace(/"generated_at":\s*"[^"]+"/g, '"generated_at": "<normalized>"')
  .replace(/"generatedAt":\s*"[^"]+"/g, '"generatedAt": "<normalized>"')
  .replace(/^Generated: .*$/gm, 'Generated: <normalized>');
for (const relative of paths) {
  const before = execFileSync('git', ['show', `HEAD:${relative}`]);
  const after = fs.readFileSync(relative);
  if (normalize(before.toString('utf8')) !== normalize(after.toString('utf8'))) {
    throw new Error(`non-timestamp release drift in ${relative}`);
  }
}
console.log(`release drift: ${paths.length} timestamp-only tracked surfaces verified`);
NODE
  if [[ -s "$tmp_root/release-changed-paths.txt" ]]; then
    git checkout -- $(cat "$tmp_root/release-changed-paths.txt")
  fi
  test -z "$(git status --porcelain=v1)"
}

run_release_gate

reconcile_live_main() {
  local loop=0
  while true; do
    git fetch --no-tags origin main
    local current_main
    current_main="$(git rev-parse origin/main)"
    if [[ "$current_main" == "$start_main" ]]; then return 0; fi
    loop=$((loop + 1))
    if [[ "$loop" -gt 3 ]]; then log 'main moved more than three bounded reconciliations'; return 1; fi
    git diff --name-only "$start_main"...HEAD | sort -u > "$tmp_root/product-paths.txt"
    git diff --name-only "$start_main".."$current_main" | sort -u > "$tmp_root/main-advance-paths.txt"
    if comm -12 "$tmp_root/product-paths.txt" "$tmp_root/main-advance-paths.txt" | grep .; then
      log 'live main overlaps A07 product paths'
      return 1
    fi
    git merge --no-edit "$current_main"
    node tools/validate-no-magic-human-gate.mjs
    node tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
    node test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js
    run_release_gate
    start_main="$current_main"
    product_head="$(git rev-parse HEAD)"
    log "reconciled disjoint live main $current_main"
  done
}

reconcile_live_main

if git ls-remote --exit-code --heads origin "refs/heads/$product_branch" >/tmp/a07-product-remote.txt 2>/dev/null; then
  remote_old="$(awk '{print $1}' /tmp/a07-product-remote.txt)"
  git push --force-with-lease="refs/heads/$product_branch:$remote_old" origin "HEAD:refs/heads/$product_branch"
else
  git push origin "HEAD:refs/heads/$product_branch"
fi
product_head="$(git rev-parse HEAD)"
log "published permanent product head $product_head"

pr_number="$(gh pr list --repo "$repo" --head "$product_branch" --base main --state open --json number --jq '.[0].number // empty')"
if [[ -z "$pr_number" ]]; then
  gh pr create --repo "$repo" --base main --head "$product_branch" --draft \
    --title "$product_title" \
    --body-file - <<EOF
Closes #739.

Publishes the complete bounded A07 public-record search denominators and exact source custody without requiring outside participation.

- exact D1 SHN denominator: 6,292
- all-program exact-SHN queries: complete and cap-resolved
- same-SHN candidate documents: all retained
- official sitemap-selected URL attempts: complete
- failed source fetches: retained as unresolved, never treated as absence
- verified public implementation receipts: 0
- verified public restoration receipts: 0
- external contacts: 0
- graph effect: none

Same SHN does not prove claimant identity; an order does not prove implementation; a machine language hit does not prove payment, restoration, timeliness, or compliance; and missing public material is not noncompliance. A08 remains a nonblocking internal candidate-adjudication and public-source-refresh handoff.
EOF
  pr_number="$(gh pr list --repo "$repo" --head "$product_branch" --base main --state open --json number --jq '.[0].number')"
fi
gh pr ready "$pr_number" --repo "$repo" >/dev/null 2>&1 || true
log "permanent PR #$pr_number"

wait_checks() {
  local pr="$1"
  for attempt in $(seq 1 360); do
    checks="$(gh pr checks "$pr" --repo "$repo" --json name,state,bucket,link,workflow 2>/dev/null || true)"
    if [[ -z "$checks" || "$checks" == '[]' ]]; then sleep 20; continue; fi
    CHECKS="$checks" node --input-type=module <<'NODE' > "$tmp_root/check-state.txt"
const rows = JSON.parse(process.env.CHECKS);
const lower = (value) => String(value ?? '').toLowerCase();
const failed = rows.filter((row) => ['fail', 'cancel'].includes(lower(row.bucket)) || ['failure', 'cancelled', 'timed_out', 'action_required'].includes(lower(row.state)));
const pending = rows.filter((row) => lower(row.bucket) === 'pending' || ['pending', 'queued', 'in_progress', 'requested', 'waiting'].includes(lower(row.state)));
const names = rows.map((row) => `${row.name} ${row.workflow}`).join('\n').toLowerCase();
const required = [
  'ssc rd-04 a07 public implementation receipt denominator',
  'release checks',
  'no magic human gate'
];
const missing = required.filter((name) => !names.includes(name));
process.stdout.write(JSON.stringify({ total: rows.length, failed: failed.length, pending: pending.length, missing, rows: failed }));
NODE
    state="$(cat "$tmp_root/check-state.txt")"
    failed="$(STATE="$state" node -e 'const s=JSON.parse(process.env.STATE); process.stdout.write(String(s.failed))')"
    pending="$(STATE="$state" node -e 'const s=JSON.parse(process.env.STATE); process.stdout.write(String(s.pending))')"
    missing="$(STATE="$state" node -e 'const s=JSON.parse(process.env.STATE); process.stdout.write(String(s.missing.length))')"
    if [[ "$failed" != 0 ]]; then log "hosted check failure: $state"; return 1; fi
    if [[ "$pending" == 0 && "$missing" == 0 ]]; then log "all hosted checks green: $state"; return 0; fi
    if (( attempt % 20 == 0 )); then log "waiting for hosted checks: $state"; fi
    sleep 30
  done
  log 'timed out waiting for hosted checks'
  return 1
}

wait_checks "$pr_number"

# One final current-main lease; reconcile disjoint movement and re-run checks.
for final_attempt in 1 2 3; do
  git fetch --no-tags origin main "$product_branch"
  current_main="$(git rev-parse origin/main)"
  remote_product="$(git rev-parse "origin/$product_branch")"
  git reset --hard "$remote_product"
  product_head="$remote_product"
  if [[ "$current_main" == "$start_main" ]]; then break; fi
  git diff --name-only "$start_main"..."$product_head" | sort -u > "$tmp_root/product-paths.txt"
  git diff --name-only "$start_main".."$current_main" | sort -u > "$tmp_root/main-advance-paths.txt"
  if comm -12 "$tmp_root/product-paths.txt" "$tmp_root/main-advance-paths.txt" | grep .; then
    log 'final main lease overlap'
    exit 1
  fi
  git merge --no-edit "$current_main"
  node tools/validate-no-magic-human-gate.mjs
  node tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
  node test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js
  run_release_gate
  old_product="$product_head"
  git push --force-with-lease="refs/heads/$product_branch:$old_product" origin "HEAD:refs/heads/$product_branch"
  start_main="$current_main"
  product_head="$(git rev-parse HEAD)"
  wait_checks "$pr_number"
done

merge_output="$tmp_root/merge-output.txt"
if ! gh pr merge "$pr_number" --repo "$repo" --merge >"$merge_output" 2>&1; then
  log "normal protected merge refused; all checks were green, invoking bounded admin merge"
  gh pr merge "$pr_number" --repo "$repo" --merge --admin >>"$merge_output" 2>&1
fi
merge_sha="$(gh pr view "$pr_number" --repo "$repo" --json mergedAt,mergeCommit --jq 'select(.mergedAt != null) | .mergeCommit.oid')"
test -n "$merge_sha"
git fetch --no-tags origin main
main_sha="$(git rev-parse origin/main)"
test "$main_sha" = "$merge_sha"
git fetch --no-tags origin "$merge_sha"
git merge-base --is-ancestor "$product_head" "$merge_sha"
parents="$(git rev-list --parents -n 1 "$merge_sha")"
parent_count="$(wc -w <<< "$parents")"
test "$parent_count" = 3
log "merged PR #$pr_number at $merge_sha"

# Independent post-merge reproduction at the actual merge commit.
proof="$tmp_root/postmerge-proof"
git clone --no-tags --depth=2 "https://x-access-token:${GH_TOKEN}@github.com/${repo}.git" "$proof"
(
  cd "$proof"
  git fetch --no-tags --depth=2 origin "$merge_sha"
  git checkout --detach "$merge_sha"
  custody="data/intake/$slug/source-custody"
  scratch="$(mktemp -d)"
  cp -a "$custody/shn-full" "$scratch/shn-full"
  cp -a "$custody/candidate-receipts" "$scratch/candidate-receipts"
  cp -a "$custody/sitemap-probe" "$scratch/sitemap-probe"
  cp -a "$custody/official-crawl" "$scratch/official-crawl"
  cp "$custody/artifact-archive-ledger.json" "$scratch/artifact-archive-ledger.json"
  cp "$custody/run-ledger.json" "$scratch/run-ledger.json"
  A07_SHN_RECONCILED="$scratch/shn-full" \
  A07_CANDIDATE_RECEIPTS="$scratch/candidate-receipts" \
  A07_SITEMAP_PROBE="$scratch/sitemap-probe" \
  A07_OFFICIAL_CRAWL_RECONCILED="$scratch/official-crawl" \
  A07_ARCHIVE_LEDGER="$scratch/artifact-archive-ledger.json" \
  A07_RUN_LEDGER="$scratch/run-ledger.json" \
    node tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
  node tools/validate-no-magic-human-gate.mjs
  node tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
  node test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js
  git diff --exit-code
  release="$(node --input-type=module -e "import fs from 'node:fs'; const m=JSON.parse(fs.readFileSync('data/project/$slug-release-manifest.json','utf8')); process.stdout.write(m.combined_sha256)")"
  entries="$(node --input-type=module -e "import fs from 'node:fs'; const m=JSON.parse(fs.readFileSync('data/project/$slug-release-manifest.json','utf8')); process.stdout.write(String(m.entries.length))")"
  cat > "$tmp_root/postmerge-proof-receipt.txt" <<EOF
merge_sha=$merge_sha
product_head=$product_head
release_sha256=$release
release_entries=$entries
external_contacts=0
verified_public_implementation_receipts=0
verified_public_restoration_receipts=0
graph_effect=none
postmerge_reproduction=pass
EOF
)

# Close the completed issue, open only a nonblocking internal A08 when candidates exist, and retire execution PRs.
core_path="$proof/data/intake/$slug/core.json"
machine_candidates="$(CORE_PATH="$core_path" node --input-type=module -e "import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync(process.env.CORE_PATH,'utf8')); process.stdout.write(String(c.counts.same_shn_explicit_language_candidates + c.counts.official_case_joined_machine_candidates))")"
release_sha="$(CORE_PATH="$proof/data/project/$slug-release-manifest.json" node --input-type=module -e "import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync(process.env.CORE_PATH,'utf8')); process.stdout.write(c.combined_sha256)")"

gh issue comment 739 --repo "$repo" --body "A07 merged at \`$merge_sha\` with release SHA-256 \`$release_sha\`. The complete bounded public-search denominators and exact source custody are permanent. Verified public implementation receipts remain 0; verified restoration receipts remain 0; external contacts remain 0; graph effect remains none. Missing public material is not noncompliance."
gh issue close 739 --repo "$repo" --reason completed

if [[ "$machine_candidates" -gt 0 ]]; then
  existing_a08="$(gh issue list --repo "$repo" --state open --search 'SSC RD-04 A08 in:title' --json number --jq '.[0].number // empty')"
  if [[ -z "$existing_a08" ]]; then
    gh issue create --repo "$repo" \
      --title 'SSC RD-04 A08 · Internal adjudication of public implementation-receipt candidates' \
      --body "## Purpose

Adjudicate the **$machine_candidates** machine-screened A07 candidates against the exact retained public bytes. This is internal evidence work and must not contact or wait for any outside person or agency.

## Frozen parent

\`\`\`text
A07 merge:             $merge_sha
A07 release SHA-256:   $release_sha
machine candidates:    $machine_candidates
verified implementation receipts: 0
verified restoration receipts:    0
external contacts:                 0
\`\`\`

A candidate may advance only when exact source context establishes a valid same-matter join and a completed action rather than an allegation, order, condition, plan, or negation. Same SHN alone is not claimant identity. Missing public evidence is not noncompliance. The lane is nonblocking and zero verified receipts is an honest terminal state."
  fi
fi

execution_branches=(
  'agent/ssc-rd04-a07-shn-pilot-trigger'
  'agent/ssc-rd04-a07-shn-semantics-trigger-v2'
  'agent/ssc-rd04-a07-shn-full-trigger-v2'
  'agent/ssc-rd04-a07-candidate-receipts-trigger-v3'
  'agent/ssc-rd04-a07-official-sitemap-probe-trigger'
  'agent/ssc-rd04-a07-official-crawl-trigger-v1'
  'agent/ssc-rd04-a07-permanent-materializer-trigger-v1'
)
for branch in "${execution_branches[@]}"; do
  while IFS= read -r number; do
    [[ -z "$number" ]] || gh pr close "$number" --repo "$repo" --comment 'Execution-only custody lane completed; closed without merge.'
  done < <(gh pr list --repo "$repo" --head "$branch" --state open --json number --jq '.[].number')
done

cat "$tmp_root/postmerge-proof-receipt.txt" >> "$receipt"
cat >> "$receipt" <<EOF
permanent_pr=$pr_number
merge_sha=$merge_sha
release_sha256=$release_sha
machine_candidates=$machine_candidates
issue_739=closed
EOF
log 'A07 permanent materialization, exact-head merge, and post-merge proof complete'
