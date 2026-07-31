#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg08Manifest } from './build-project-stable-ground-sg08.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const zero40 = '0'.repeat(40);

function ensureCommit(sha, label, depth = 4) {
  if (!hex40.test(sha || '') || sha === zero40) return [`${label} is not a materialized full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', `--depth=${depth}`, 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function showJson(commit, rel, label, errors) {
  const result = spawnSync('git', ['show', `${commit}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) { errors.push(`SG-08 transition cannot recover ${label}`); return null; }
  try { return JSON.parse(result.stdout); } catch { errors.push(`SG-08 transition ${label} is not valid JSON`); return null; }
}

function defaultTransitionVerifier(checkpoint) {
  const errors = [];
  const { transition_commit: transition, transition_base: base, transition_paths: declared } = checkpoint.trigger;
  errors.push(...ensureCommit(base, 'SG-08 transition base', 2));
  errors.push(...ensureCommit(transition, 'SG-08 transition commit', 4));
  if (errors.length) return errors;
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) errors.push('SG-08 transition commit is not descended from its declared base');
  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) errors.push('SG-08 transition path denominator cannot be recovered');
  else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-08 transition path denominator drift: ${JSON.stringify(observed)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-08 transition path digest drift');
  }
  const acquisition = showJson(transition, 'data/research/status-sovereignty-wave-01-targeted-acquisition.json', 'targeted-acquisition object', errors);
  const release = showJson(transition, 'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json', 'targeted-acquisition release manifest', errors);
  const workflow = spawnSync('git', ['show', `${transition}:.github/workflows/status-sovereignty-wave-01-targeted-acquisition.yml`], { cwd: root, encoding: null, maxBuffer: 8 * 1024 * 1024 });
  if (acquisition && (
    acquisition.acquisition_id !== 'SSC-W01-TA01' ||
    acquisition.status !== 'complete_targeted_acquisition_three_obligations_partially_repaired_all_open' ||
    acquisition.counts?.source_records !== 12 ||
    acquisition.counts?.obligations !== 3 ||
    acquisition.counts?.partially_repaired_open !== 3 ||
    acquisition.counts?.closed !== 0 ||
    acquisition.counts?.reviewed_disposition_changes !== 0 ||
    acquisition.counts?.second_party_reviews !== 0 ||
    acquisition.counts?.adjudications !== 0 ||
    acquisition.counts?.complete_compact_findings !== 0 ||
    acquisition.counts?.graph_effects !== 0 ||
    acquisition.counts?.publication_clearances !== 0
  )) errors.push('SG-08 transition targeted-acquisition state drift');
  if (release && release.combined_sha256 !== checkpoint.trigger.targeted_acquisition_release_sha256) errors.push('SG-08 transition targeted-acquisition release digest drift');
  if (workflow.status !== 0) errors.push('SG-08 transition cannot recover targeted-acquisition workflow');
  else if (sha256(workflow.stdout) !== checkpoint.trigger.targeted_acquisition_workflow_sha256) errors.push('SG-08 transition targeted-acquisition workflow digest drift');
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) return ['historical SG-07 merge receipt is not a full commit SHA'];
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-07 merge receipt', 3));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg07.json',
    'data/project/project-stable-ground-sg07-release-manifest.json',
    'reports/core-thesis/stable-ground/sg07/checkpoint.json',
    'reports/core-thesis/stable-ground/sg07/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-07 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-07 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg08Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg08.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg07: read('data/project/project-stable-ground-sg07.json'),
    status: read('data/project/status-sovereignty-compact.json'),
    wave: read('data/research/status-sovereignty-wave-01.json'),
    review: read('data/research/status-sovereignty-wave-01-maintainer-review.json'),
    acquisition: read('data/research/status-sovereignty-wave-01-targeted-acquisition.json'),
    targetRelease: read('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json'),
    statusRelease: read('data/project/status-sovereignty-release-manifest.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    dca: read('data/project/dca-h01-role-neutral-denominator.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    manifest: read('data/project/project-stable-ground-sg08-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg08/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg08(context = loadSg08Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg07, status, wave, review, acquisition, targetRelease, statusRelease, k0, dca, poofAperture, poofRelease, sprint09, manifest, report, transitionVerifier, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-08 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-30-08', 'SG-08 checkpoint identity');
  eq(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-08 governor');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-07', 'SG-08 predecessor');
  eq(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg07.json', 'SG-08 predecessor path');
  eq(checkpoint.supersedes?.merge_commit, 'f3fb90778ce12e262cd24824c385594d7c7daec2', 'SG-07 merge receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-07 preservation');
  eq(sg07.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-07 source identity');
  eq(checkpoint.preserved_history?.length, 7, 'SG-08 preserved-history count');
  const expectedPreserved = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05','SG-2026-07-30-06','SG-2026-07-30-07'];
  eq(JSON.stringify(checkpoint.preserved_history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedPreserved), 'SG-08 preserved-history order');
  check(checkpoint.preserved_history?.every((row) => row.status === 'superseded_preserved'), 'SG-08 predecessor status drift');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_01_targeted_acquisition', 'SG-08 trigger type');
  eq(checkpoint.trigger?.issue, 503, 'SG-08 trigger issue');
  eq(checkpoint.trigger?.pull_request, 504, 'SG-08 trigger PR');
  eq(checkpoint.trigger?.acquisition_id, 'SSC-W01-TA01', 'SG-08 acquisition identity');
  eq(checkpoint.trigger?.transition_base, 'f3fb90778ce12e262cd24824c385594d7c7daec2', 'SG-08 transition base');
  check(hex40.test(checkpoint.trigger?.transition_commit) && checkpoint.trigger.transition_commit !== zero40, 'SG-08 transition receipt is not materialized');
  eq(checkpoint.trigger?.transition_paths?.length, 38, 'SG-08 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-08 transition path digest');
  eq(checkpoint.trigger?.source_records, 12, 'SG-08 source count');
  eq(checkpoint.trigger?.obligations, 3, 'SG-08 obligation count');
  eq(checkpoint.trigger?.partially_repaired_open, 3, 'SG-08 partially repaired count');
  eq(checkpoint.trigger?.closed, 0, 'SG-08 closed obligation count');
  eq(checkpoint.trigger?.reviewed_disposition_changes, 0, 'SG-08 disposition-change count');
  eq(checkpoint.trigger?.second_party_reviewed, 0, 'SG-08 second-party count');
  eq(checkpoint.trigger?.adjudicated, 0, 'SG-08 adjudication count');
  eq(checkpoint.trigger?.complete_compact_findings, 0, 'SG-08 complete compact count');
  check(hex64.test(checkpoint.trigger?.targeted_acquisition_release_sha256 || ''), 'SG-08 targeted-acquisition release digest format');
  check(hex64.test(checkpoint.trigger?.targeted_acquisition_workflow_sha256 || ''), 'SG-08 targeted-acquisition workflow digest format');
  eq(checkpoint.canonical_main?.commit, checkpoint.trigger.transition_commit, 'SG-08 canonical transition');

  eq(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  check(governor.trigger_classes.some((row) => row.includes('source-review')), 'governor missing source-review trigger');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  const expectedHistory = [...expectedPreserved, 'SG-2026-07-30-08'];
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'pointer history order');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'current checkpoint after SG-07');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg08.json', 'pointer current path');
  eq(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');
  const sg07Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-30-07');
  eq(sg07Row?.status, 'superseded_preserved', 'historical SG-07 pointer status');
  eq(sg07Row?.merge_commit, checkpoint.supersedes.merge_commit, 'historical SG-07 pointer merge receipt');
  if (sg07Row) for (const error of historicalVerifier(sg07Row)) errors.push(error);

  eq(snapshot.status_sovereignty?.status, 'canonical_field_hypothesis_wave_01_maintainer_reviewed_targeted_acquisition_open_no_prevalence_finding', 'frozen SSC status');
  eq(snapshot.status_sovereignty?.records_retained, 14, 'frozen SSC retained count');
  eq(snapshot.status_sovereignty?.maintainer_reviewed, 14, 'frozen maintainer review count');
  eq(snapshot.status_sovereignty?.second_party_reviewed, 0, 'frozen second-party review count');
  eq(snapshot.status_sovereignty?.adjudicated, 0, 'frozen adjudication count');
  eq(snapshot.status_sovereignty?.complete_compact_findings, 0, 'frozen complete compact count');
  eq(snapshot.status_sovereignty?.targeted_acquisition_supplements, 1, 'frozen acquisition supplement count');
  eq(snapshot.status_sovereignty?.targeted_acquisition_source_records, 12, 'frozen targeted source count');
  eq(snapshot.status_sovereignty?.open_acquisition_obligations, 3, 'frozen open obligation count');
  eq(snapshot.status_sovereignty?.partially_repaired_acquisition_obligations, 3, 'frozen partially repaired count');
  eq(snapshot.status_sovereignty?.closed_acquisition_obligations, 0, 'frozen closed obligation count');
  eq(snapshot.status_sovereignty?.publication_status, 'blocked_pending_second_party_review_and_still_open_denominators', 'frozen SSC publication status');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) eq(snapshot.status_sovereignty?.[key], false, `frozen SSC ${key}`);
  eq(snapshot.status_sovereignty?.graph_effect, 'none', 'frozen SSC graph effect');
  eq(snapshot.k0?.query_templates_executed, 9, 'frozen K0 execution');
  eq(snapshot.k0?.included_events, 0, 'frozen K0 event count');
  eq(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  eq(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  eq(snapshot.poof?.indexable, false, 'frozen POOF indexability');
  eq(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  eq(snapshot.sprint_09?.real_person_pilot_authorized, false, 'frozen pilot state');

  const target = checkpoint.fanout_state?.targeted_acquisition;
  eq(target?.acquisition_id, 'SSC-W01-TA01', 'fanout acquisition identity');
  eq(target?.source_records, 12, 'fanout acquisition source count');
  eq(target?.obligations, 3, 'fanout obligation count');
  eq(target?.partially_repaired_open, 3, 'fanout partially repaired count');
  eq(target?.closed, 0, 'fanout closed obligation count');
  eq(target?.reviewed_disposition_changes, 0, 'fanout disposition changes');
  eq(target?.second_party_reviews, 0, 'fanout second-party count');
  eq(target?.adjudications, 0, 'fanout adjudication count');
  eq(target?.graph_effect, 'none', 'fanout graph effect');
  eq(checkpoint.build_order?.find((row) => row.order === 3)?.state, 'open_three_partially_repaired_zero_closed', 'SG-08 denominator build state');
  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-08 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-08 boundary ${key}`);
  }

  for (const error of transitionVerifier(checkpoint)) errors.push(error);

  eq(status.status, snapshot.status_sovereignty.status, 'live SSC status');
  eq(status.current_state?.maintainer_reviewed_observations, 14, 'live SSC maintainer review count');
  eq(status.current_state?.second_party_reviewed_observations, 0, 'live SSC second-party review count');
  eq(status.current_state?.adjudicated_observations, 0, 'live SSC adjudication count');
  eq(status.current_state?.targeted_acquisition_supplements, 1, 'live acquisition supplement count');
  eq(status.current_state?.targeted_acquisition_source_records, 12, 'live targeted source count');
  eq(status.current_state?.open_acquisition_obligations, 3, 'live open obligation count');
  eq(status.current_state?.partially_repaired_acquisition_obligations, 3, 'live partially repaired count');
  eq(status.current_state?.closed_acquisition_obligations, 0, 'live closed obligation count');
  eq(status.current_state?.complete_compact_findings, 0, 'live complete compact count');
  eq(status.current_state?.graph_effect, 'none', 'live SSC graph effect');
  eq(wave.counts?.maintainer_reviewed, 14, 'live Wave review count');
  eq(review.counts?.disposition_changes, 0, 'live review disposition changes');
  eq(review.counts?.requires_additional_acquisition, 3, 'live review acquisition obligations');
  eq(acquisition.status, 'complete_targeted_acquisition_three_obligations_partially_repaired_all_open', 'live acquisition status');
  eq(acquisition.counts?.source_records, 12, 'live acquisition source count');
  eq(acquisition.counts?.obligations, 3, 'live acquisition obligation count');
  eq(acquisition.counts?.partially_repaired_open, 3, 'live acquisition partial count');
  eq(acquisition.counts?.closed, 0, 'live acquisition closed count');
  eq(acquisition.counts?.reviewed_disposition_changes, 0, 'live acquisition disposition changes');
  eq(acquisition.counts?.second_party_reviews, 0, 'live acquisition second-party count');
  eq(acquisition.counts?.adjudications, 0, 'live acquisition adjudication count');
  eq(acquisition.counts?.complete_compact_findings, 0, 'live acquisition complete compact count');
  eq(acquisition.counts?.graph_effects, 0, 'live acquisition graph effects');
  eq(acquisition.counts?.publication_clearances, 0, 'live acquisition publication clearances');
  eq(targetRelease.combined_sha256, snapshot.status_sovereignty.targeted_acquisition_release_sha256, 'live targeted-acquisition release digest');
  eq(statusRelease.combined_sha256, snapshot.status_sovereignty.status_release_sha256, 'live SSC release digest');
  eq(k0.execution?.included_events, 0, 'live K0 event count');
  eq(dca.execution?.query_templates_executed, 0, 'live DCA execution');
  eq(poofAperture.publication?.deployed, false, 'live POOF deployment');
  eq(poofAperture.publication?.indexable, false, 'live POOF indexability');
  check(hex64.test(poofRelease.combined_sha256), 'live POOF release digest format');
  eq(sprint09.current_result?.maximum_verified_adoption_level, 'A0', 'live adoption');
  eq(sprint09.current_result?.real_person_pilot_authorized, false, 'live pilot state');

  eq(manifest.schema_version, 'project-stable-ground-sg08-release-manifest@1', 'SG-08 manifest schema');
  eq(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-08 manifest identity');
  eq(JSON.stringify(manifest), JSON.stringify(computeSg08Manifest()), 'current SG-08 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg08-report@1', 'SG-08 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-08 report identity');
  eq(report.canonical_main?.commit, checkpoint.trigger.transition_commit, 'SG-08 report transition');
  eq(report.counts?.checkpoints_preserved, 8, 'SG-08 report history count');
  eq(report.counts?.targeted_acquisition_source_records, 12, 'SG-08 report targeted source count');
  eq(report.counts?.acquisition_obligations, 3, 'SG-08 report obligation count');
  eq(report.counts?.partially_repaired_open, 3, 'SG-08 report partially repaired count');
  eq(report.counts?.closed_obligations, 0, 'SG-08 report closed count');
  eq(report.targeted_acquisition_release?.combined_sha256, targetRelease.combined_sha256, 'SG-08 report acquisition digest');
  eq(report.status_release?.combined_sha256, statusRelease.combined_sha256, 'SG-08 report SSC digest');
  eq(report.poof_release?.combined_sha256, poofRelease.combined_sha256, 'SG-08 report POOF digest');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-08 report release digest');
  return errors;
}

function main() {
  const errors = validateSg08();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg08: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg08: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
