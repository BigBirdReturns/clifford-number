#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg10Manifest } from './build-project-stable-ground-sg10.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;

function ensureCommit(sha, label, depth = 16) {
  if (!hex40.test(sha || '')) return [`${label} is not a full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', `--depth=${depth}`, 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function showBytes(commit, rel, label, errors) {
  const result = spawnSync('git', ['show', `${commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    errors.push(`SG-10 transition cannot recover ${label}`);
    return null;
  }
  return result.stdout;
}

function showJson(commit, rel, label, errors) {
  const bytes = showBytes(commit, rel, label, errors);
  if (!bytes) return null;
  try { return JSON.parse(bytes.toString('utf8')); }
  catch {
    errors.push(`SG-10 transition ${label} is not valid JSON`);
    return null;
  }
}

function defaultTransitionVerifier(checkpoint) {
  const errors = [];
  const { transition_commit: transition, transition_base: base, transition_paths: declared } = checkpoint.trigger;
  errors.push(...ensureCommit(base, 'SG-10 transition base', 8));
  errors.push(...ensureCommit(transition, 'SG-10 transition commit', 24));
  if (errors.length) return errors;
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) errors.push('SG-10 transition commit is not descended from its declared base');
  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let observedPaths = [];
  if (changed.status !== 0) errors.push('SG-10 transition path denominator cannot be recovered');
  else {
    observedPaths = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observedPaths) !== JSON.stringify(expected)) errors.push(`SG-10 transition path denominator drift: ${JSON.stringify(observedPaths)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-10 transition path digest drift');
  }

  const reviewBytes = showBytes(transition, 'data/research/status-sovereignty-wave-02-maintainer-review.json', 'Wave 02 review contract', errors);
  const reviewRelease = showJson(transition, 'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json', 'Wave 02 review release', errors);
  const statusRelease = showJson(transition, 'data/project/status-sovereignty-release-manifest.json', 'transition status release', errors);
  const poofRelease = showJson(transition, 'data/project/poof-clifford-ecology-release-manifest.json', 'transition POOF release', errors);
  if (reviewBytes && sha256(reviewBytes) !== checkpoint.trigger.review_contract_sha256) errors.push('SG-10 transition review contract digest drift');
  if (reviewRelease?.combined_sha256 !== checkpoint.trigger.review_release_sha256) errors.push('SG-10 transition review release digest drift');
  if (statusRelease?.combined_sha256 !== checkpoint.trigger.transition_status_release_sha256) errors.push('SG-10 transition status release digest drift');
  if (poofRelease?.combined_sha256 !== checkpoint.trigger.transition_poof_release_sha256) errors.push('SG-10 transition POOF release digest drift');
  const review = reviewBytes ? JSON.parse(reviewBytes.toString('utf8')) : null;
  if (review && (
    review.review_id !== 'SSC-W02-MR01' ||
    review.status !== 'complete_non_adjudicative_maintainer_review_second_party_pending' ||
    review.counts?.observations !== 8 ||
    review.counts?.maintainer_reviewed !== 8 ||
    review.counts?.second_party_reviewed !== 0 ||
    review.counts?.adjudicated !== 0 ||
    review.counts?.requires_additional_acquisition !== 3 ||
    review.counts?.supported_bounded_compact !== 0 ||
    review.counts?.graph_effects !== 0 ||
    review.counts?.publication_clearances !== 0
  )) errors.push('SG-10 transition review state drift');
  if (observedPaths.some((rel) => rel.startsWith('.github/tmp/') || rel.includes('/temporary-') || rel.startsWith('.github/workflows/temporary-'))) {
    errors.push('SG-10 transition contains temporary transport files');
  }
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-09 merge receipt', 12));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg09.json',
    'data/project/project-stable-ground-sg09-release-manifest.json',
    'reports/core-thesis/stable-ground/sg09/checkpoint.json',
    'reports/core-thesis/stable-ground/sg09/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-09 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-09 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg10Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg10.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg09: read('data/project/project-stable-ground-sg09.json'),
    sg09Manifest: read('data/project/project-stable-ground-sg09-release-manifest.json'),
    review: read('data/research/status-sovereignty-wave-02-maintainer-review.json'),
    wave02: read('data/research/status-sovereignty-wave-02.json'),
    compact: read('data/project/status-sovereignty-compact.json'),
    fanout: read('data/project/status-sovereignty-fanout.json'),
    campaign: read('data/project/status-sovereignty-wave-01-second-party-review-campaign.json'),
    statusManifest: read('data/project/status-sovereignty-release-manifest.json'),
    poofManifest: read('data/project/poof-clifford-ecology-release-manifest.json'),
    manifest: read('data/project/project-stable-ground-sg10-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg10/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg10/index.html'), 'utf8'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg10(context = loadSg10Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg09, sg09Manifest, review, wave02, compact, fanout, campaign, statusManifest, poofManifest, manifest, report, html, transitionVerifier, historicalVerifier } = context;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-10 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-10', 'SG-10 identity');
  eq(checkpoint.as_of, '2026-07-31', 'SG-10 date');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-31-09', 'SG-10 predecessor');
  eq(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg09.json', 'SG-10 predecessor path');
  eq(checkpoint.supersedes?.merge_commit, '17775a008efbe33c57a59af489db691716e9bae1', 'SG-09 merge receipt');
  eq(checkpoint.supersedes?.release_sha256, 'a6c807988a3690ecd3f7d79c82074db75b9304ec366f1885ba6e3e9e6336fd40', 'SG-09 release receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-09 preservation');
  eq(sg09.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-09 source identity');
  eq(sg09Manifest.combined_sha256, checkpoint.supersedes.release_sha256, 'SG-09 manifest custody');

  const expectedHistory = [
    'SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03', 'SG-2026-07-29-04',
    'SG-2026-07-30-05', 'SG-2026-07-30-06', 'SG-2026-07-30-07', 'SG-2026-07-30-08',
    'SG-2026-07-31-09', 'SG-2026-07-31-10'
  ];
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'SG-10 history order');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'SG-10 current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'SG-10 current checkpoint');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg10.json', 'SG-10 current path');
  eq(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'SG-10 current transition receipt');
  const sg09Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-31-09');
  eq(sg09Row?.status, 'superseded_preserved', 'SG-09 historical status');
  eq(sg09Row?.merge_commit, checkpoint.supersedes.merge_commit, 'SG-09 historical merge receipt');
  const currentRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  eq(currentRow?.status, 'current', 'SG-10 pointer status');
  eq(currentRow?.trigger_commit, checkpoint.trigger.transition_commit, 'SG-10 pointer trigger receipt');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor historical no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_02_maintainer_review', 'SG-10 trigger type');
  eq(checkpoint.trigger?.issue, 508, 'SG-10 trigger issue');
  eq(checkpoint.trigger?.pull_request, 524, 'SG-10 trigger PR');
  eq(checkpoint.trigger?.review_id, 'SSC-W02-MR01', 'SG-10 review identity');
  eq(checkpoint.trigger?.transition_base, '52a363704857a2da5035c24898f9dfdc38b56754', 'SG-10 transition base');
  eq(checkpoint.trigger?.transition_commit, '4c8ec34686d7005b06a94dc75bb8828610be60a1', 'SG-10 transition commit');
  eq(checkpoint.trigger?.transition_paths?.length, 35, 'SG-10 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-10 transition path digest');
  eq(checkpoint.trigger?.wave_02_maintainer_reviewed, 8, 'SG-10 Wave 02 review count');
  eq(checkpoint.trigger?.wave_02_second_party_reviewed, 0, 'SG-10 Wave 02 second-party count');
  eq(checkpoint.trigger?.wave_02_adjudicated, 0, 'SG-10 Wave 02 adjudication count');
  eq(checkpoint.trigger?.wave_02_open_acquisition_obligations, 3, 'SG-10 Wave 02 acquisition count');
  eq(checkpoint.trigger?.global_open_acquisition_obligations, 6, 'SG-10 global acquisition count');
  for (const key of ['canonical_disposition_changes', 'complete_compact_findings', 'racial_order_findings', 'prevalence_findings', 'coordination_findings', 'common_purpose_findings', 'personal_hostility_findings', 'publication_clearances', 'graph_effects']) eq(checkpoint.trigger?.[key], 0, `SG-10 trigger ${key}`);
  for (const key of ['review_release_sha256', 'review_contract_sha256', 'transition_status_release_sha256', 'transition_poof_release_sha256']) check(hex64.test(checkpoint.trigger?.[key] || ''), `SG-10 ${key} format`);
  for (const error of transitionVerifier(checkpoint)) errors.push(error);
  if (sg09Row) for (const error of historicalVerifier(sg09Row)) errors.push(error);

  eq(review.review_id, 'SSC-W02-MR01', 'live Wave 02 review identity');
  eq(review.counts?.observations, 8, 'live Wave 02 observation count');
  eq(review.counts?.maintainer_reviewed, 8, 'live Wave 02 maintainer count');
  eq(review.counts?.second_party_reviewed, 0, 'live Wave 02 second-party count');
  eq(review.counts?.adjudicated, 0, 'live Wave 02 adjudication count');
  eq(review.counts?.requires_additional_acquisition, 3, 'live Wave 02 acquisition count');
  eq(review.counts?.effective_counterpower_controls, 1, 'live Wave 02 counterpower control count');
  eq(review.counts?.supported_bounded_compact, 0, 'live Wave 02 complete compact count');
  eq(review.current_result?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'live Wave 02 publication state');
  eq(review.current_result?.graph_effect, 'none', 'live Wave 02 graph state');
  eq(wave02.counts?.unreviewed, 0, 'live Wave 02 unreviewed count');
  eq(wave02.counts?.maintainer_reviewed, 8, 'live Wave 02 reviewed count');

  eq(compact.current_state?.waves_executed, 2, 'SSC wave count');
  eq(compact.current_state?.executed_lanes, 16, 'SSC executed lane count');
  eq(compact.current_state?.observations_retained, 22, 'SSC observation count');
  eq(compact.current_state?.maintainer_reviewed_observations, 22, 'SSC maintainer-reviewed count');
  eq(compact.current_state?.second_party_reviewed_observations, 0, 'SSC second-party-reviewed count');
  eq(compact.current_state?.adjudicated_observations, 0, 'SSC adjudicated count');
  eq(compact.current_state?.open_acquisition_obligations, 6, 'SSC global open-acquisition count');
  eq(compact.current_state?.wave_01_open_acquisition_obligations, 3, 'SSC Wave 01 open-acquisition count');
  eq(compact.current_state?.wave_02_open_acquisition_obligations, 3, 'SSC Wave 02 open-acquisition count');
  eq(compact.current_state?.complete_compact_findings, 0, 'SSC complete compact count');
  eq(compact.current_state?.publication_status, 'blocked_pending_second_party_review_and_still_open_denominators', 'SSC publication state');
  eq(compact.current_state?.graph_effect, 'none', 'SSC graph state');
  eq(compact.maintainer_reviews?.length, 2, 'SSC review registry denominator');
  eq(compact.maintainer_reviews?.[1]?.review_id, 'SSC-W02-MR01', 'SSC Wave 02 review registry identity');
  eq(fanout.counts?.executed_lanes, 16, 'fanout executed lanes');
  eq(fanout.counts?.maintainer_reviewed_records, 22, 'fanout reviewed records');
  eq(campaign.counts?.valid_reviews, 0, 'Wave 01 campaign valid-review count');
  eq(campaign.counts?.adjudicated_packets, 0, 'Wave 01 campaign adjudication count');

  for (const key of ['prevalence_finding_generated', 'racial_order_finding_generated', 'coordination_finding_generated', 'common_purpose_finding_generated', 'personal_hostility_finding_generated']) eq(compact.current_state?.[key], false, `SSC current ${key}`);
  eq(checkpoint.authority_change?.checkpoint_status_release_sha256, statusManifest.combined_sha256, 'SG-10 checkpoint status release custody');
  eq(checkpoint.authority_change?.checkpoint_poof_release_sha256, poofManifest.combined_sha256, 'SG-10 checkpoint POOF release custody');

  const expectedManifest = computeSg10Manifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'SG-10 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg10-report@1', 'SG-10 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-10 report identity');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-10 report release digest');
  eq(report.counts?.executed_lanes, 16, 'SG-10 report lane count');
  eq(report.counts?.maintainer_reviewed, 22, 'SG-10 report review count');
  eq(report.counts?.global_open_acquisition_obligations, 6, 'SG-10 report acquisition count');
  eq(report.counts?.complete_compact_findings, 0, 'SG-10 report complete compact count');
  eq(report.exact_custody?.transition_review_release_sha256, checkpoint.trigger.review_release_sha256, 'SG-10 report transition review custody');
  eq(report.exact_custody?.current_status_release_sha256, statusManifest.combined_sha256, 'SG-10 report status custody');
  eq(report.exact_custody?.current_poof_release_sha256, poofManifest.combined_sha256, 'SG-10 report POOF custody');
  check(html.includes('22/22 MAINTAINER REVIEWED · 0 SECOND-PARTY · 0 ADJUDICATED · 6 OPEN ACQUISITIONS · 0 COMPLETE COMPACT · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SG-10 boundary banner missing');
  check(html.includes(manifest.combined_sha256), 'SG-10 release digest missing');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-10 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-10 boundary ${key}`);
  }
  return errors;
}

function main() {
  const errors = validateSg10();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg10: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg10: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
