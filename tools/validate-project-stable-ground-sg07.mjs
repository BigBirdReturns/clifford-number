#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg07Manifest } from './build-project-stable-ground-sg07.mjs';

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

function defaultTransitionVerifier(checkpoint) {
  const errors = [];
  const { transition_commit: transition, transition_base: base, transition_paths: declared } = checkpoint.trigger;
  errors.push(...ensureCommit(base, 'SG-07 transition base', 2));
  errors.push(...ensureCommit(transition, 'SG-07 transition commit', 4));
  if (errors.length) return errors;

  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) {
    const walked = spawnSync('git', ['rev-list', '--parents', '--max-count=3', transition], { cwd: root, encoding: 'utf8' });
    const observed = walked.status === 0 ? walked.stdout : '';
    if (!observed.includes(base)) errors.push('SG-07 transition commit is not descended from its declared base');
  }

  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) errors.push('SG-07 transition path denominator cannot be recovered');
  else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-07 transition path denominator drift: ${JSON.stringify(observed)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-07 transition path digest drift');
  }

  const show = (rel, encoding = 'utf8') => spawnSync('git', ['show', `${transition}:${rel}`], { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 });
  const showJson = (rel, label) => {
    const result = show(rel, 'utf8');
    if (result.status !== 0) { errors.push(`SG-07 transition cannot recover ${label}`); return null; }
    try { return JSON.parse(result.stdout); } catch { errors.push(`SG-07 transition ${label} is not valid JSON`); return null; }
  };
  const status = showJson('data/project/status-sovereignty-compact.json', 'SSC-H01 source object');
  const wave = showJson('data/research/status-sovereignty-wave-01.json', 'Wave 01 object');
  const review = showJson('data/research/status-sovereignty-wave-01-maintainer-review.json', 'maintainer-review object');
  const waveRelease = showJson('data/project/status-sovereignty-wave-01-release-manifest.json', 'Wave 01 release manifest');
  const reviewRelease = showJson('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json', 'maintainer-review release manifest');
  const statusRelease = showJson('data/project/status-sovereignty-release-manifest.json', 'SSC-H01 release manifest');
  const workflow = show('.github/workflows/status-sovereignty-wave-01-review.yml', null);

  if (status && (
    status.status !== 'canonical_field_hypothesis_wave_01_maintainer_reviewed_no_prevalence_finding' ||
    status.current_state?.observations_retained !== 14 ||
    status.current_state?.maintainer_reviewed_observations !== 14 ||
    status.current_state?.second_party_reviewed_observations !== 0 ||
    status.current_state?.adjudicated_observations !== 0 ||
    status.current_state?.complete_compact_findings !== 0 ||
    status.current_state?.prevalence_finding_generated !== false ||
    status.current_state?.racial_order_finding_generated !== false ||
    status.current_state?.coordination_finding_generated !== false ||
    status.current_state?.common_purpose_finding_generated !== false ||
    status.current_state?.personal_hostility_finding_generated !== false ||
    status.current_state?.graph_effect !== 'none'
  )) errors.push('SG-07 transition SSC-H01 state drift');

  if (wave && (
    wave.wave_id !== 'SSC-W01' ||
    wave.status !== 'executed_maintainer_reviewed_zero_complete_compact' ||
    wave.counts?.source_records !== 15 ||
    wave.counts?.observations !== 14 ||
    wave.counts?.executed_lanes !== 8 ||
    wave.counts?.maintainer_reviewed !== 14 ||
    wave.counts?.second_party_reviewed !== 0 ||
    wave.counts?.adjudicated !== 0 ||
    wave.counts?.supported_bounded_compact !== 0 ||
    wave.current_result?.graph_effect !== 'none'
  )) errors.push('SG-07 transition Wave 01 object drift');

  if (review && (
    review.review_id !== 'SSC-W01-MR01' ||
    review.status !== 'complete_non_adjudicative_maintainer_review_second_party_pending' ||
    review.counts?.observations !== 14 ||
    review.counts?.maintainer_reviewed !== 14 ||
    review.counts?.second_party_reviewed !== 0 ||
    review.counts?.adjudicated !== 0 ||
    review.counts?.disposition_changes !== 0 ||
    review.counts?.effective_counterpower_controls !== 2 ||
    review.counts?.ordinary_industrial_policy_controls !== 2 ||
    review.counts?.requires_additional_acquisition !== 3 ||
    review.counts?.supported_bounded_compact !== 0 ||
    review.current_result?.graph_effect !== 'none'
  )) errors.push('SG-07 transition maintainer-review object drift');

  if (waveRelease && waveRelease.combined_sha256 !== checkpoint.trigger.wave_release_sha256) errors.push('SG-07 transition Wave 01 release digest drift');
  if (reviewRelease && reviewRelease.combined_sha256 !== checkpoint.trigger.maintainer_review_release_sha256) errors.push('SG-07 transition maintainer-review release digest drift');
  if (statusRelease && statusRelease.combined_sha256 !== checkpoint.trigger.status_release_sha256) errors.push('SG-07 transition SSC-H01 release digest drift');
  if (workflow.status !== 0) errors.push('SG-07 transition cannot recover maintainer-review workflow');
  else if (sha256(workflow.stdout) !== checkpoint.trigger.review_workflow_sha256) errors.push('SG-07 transition maintainer-review workflow digest drift');
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) return ['historical SG-06 merge receipt is not a full commit SHA'];
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-06 merge receipt', 3));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg06.json',
    'data/project/project-stable-ground-sg06-release-manifest.json',
    'reports/core-thesis/stable-ground/sg06/checkpoint.json',
    'reports/core-thesis/stable-ground/sg06/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-06 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-06 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg07Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg07.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg06: read('data/project/project-stable-ground-sg06.json'),
    status: read('data/project/status-sovereignty-compact.json'),
    fanout: read('data/project/status-sovereignty-fanout.json'),
    sources: read('data/project/status-sovereignty-source-registry.json'),
    wave: read('data/research/status-sovereignty-wave-01.json'),
    review: read('data/research/status-sovereignty-wave-01-maintainer-review.json'),
    waveRelease: read('data/project/status-sovereignty-wave-01-release-manifest.json'),
    reviewRelease: read('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json'),
    statusRelease: read('data/project/status-sovereignty-release-manifest.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    dca: read('data/project/dca-h01-role-neutral-denominator.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    manifest: read('data/project/project-stable-ground-sg07-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg07/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg07(context = loadSg07Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg06, status, fanout, sources, wave, review, waveRelease, reviewRelease, statusRelease, k0, dca, poofAperture, poofRelease, sprint09, manifest, report, transitionVerifier, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-07 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-30-07', 'SG-07 checkpoint identity');
  eq(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-07 governor');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-06', 'SG-07 predecessor');
  eq(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg06.json', 'SG-07 predecessor path');
  eq(checkpoint.supersedes?.merge_commit, 'a9cb4c707a1cc6afb51d0fd20b0375e0cf2373b7', 'SG-06 merge receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-06 preservation');
  eq(sg06.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-06 source identity');
  eq(checkpoint.preserved_history?.length, 6, 'SG-07 preserved-history count');
  const expectedPreserved = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05','SG-2026-07-30-06'];
  eq(JSON.stringify(checkpoint.preserved_history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedPreserved), 'SG-07 preserved-history order');
  check(checkpoint.preserved_history?.every((row) => row.status === 'superseded_preserved'), 'SG-07 predecessor status drift');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_01_maintainer_review', 'SG-07 trigger type');
  eq(checkpoint.trigger?.issue, 498, 'SG-07 trigger issue');
  eq(checkpoint.trigger?.pull_request, 499, 'SG-07 trigger PR');
  eq(checkpoint.trigger?.review_id, 'SSC-W01-MR01', 'SG-07 review identity');
  eq(checkpoint.trigger?.transition_base, 'a9cb4c707a1cc6afb51d0fd20b0375e0cf2373b7', 'SG-07 transition base');
  check(hex40.test(checkpoint.trigger?.transition_commit) && checkpoint.trigger.transition_commit !== zero40, 'SG-07 transition receipt is not materialized');
  eq(checkpoint.trigger?.transition_paths?.length, 35, 'SG-07 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-07 transition path digest');
  eq(checkpoint.trigger?.source_records, 15, 'SG-07 source count');
  eq(checkpoint.trigger?.observations, 14, 'SG-07 observation count');
  eq(checkpoint.trigger?.executed_lanes, 8, 'SG-07 executed lane count');
  eq(checkpoint.trigger?.maintainer_reviewed, 14, 'SG-07 maintainer review count');
  eq(checkpoint.trigger?.second_party_reviewed, 0, 'SG-07 second-party review count');
  eq(checkpoint.trigger?.adjudicated, 0, 'SG-07 adjudication count');
  eq(checkpoint.trigger?.disposition_changes, 0, 'SG-07 disposition-change count');
  check(hex64.test(checkpoint.trigger?.wave_release_sha256 || ''), 'SG-07 Wave release digest format');
  check(hex64.test(checkpoint.trigger?.maintainer_review_release_sha256 || ''), 'SG-07 maintainer-review release digest format');
  check(hex64.test(checkpoint.trigger?.status_release_sha256 || ''), 'SG-07 SSC release digest format');
  check(hex64.test(checkpoint.trigger?.review_workflow_sha256 || ''), 'SG-07 review workflow digest format');
  eq(checkpoint.canonical_main?.commit, checkpoint.trigger.transition_commit, 'SG-07 canonical transition');
  eq(checkpoint.canonical_main?.repository, 'BigBirdReturns/clifford-number', 'SG-07 repository');

  eq(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  check(governor.trigger_classes.some((row) => row.includes('source-review')), 'governor missing source-review trigger');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  const expectedHistory = [...expectedPreserved, 'SG-2026-07-30-07'];
  eq(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'pointer history order');
  eq(new Set(pointer.history?.map((row) => row.checkpoint_id)).size, pointer.history?.length, 'pointer checkpoint uniqueness');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'current checkpoint after SG-06');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg07.json', 'pointer current path');
  eq(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');
  const sg06Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-30-06');
  eq(sg06Row?.path, 'data/project/project-stable-ground-sg06.json', 'historical SG-06 pointer path');
  eq(sg06Row?.status, 'superseded_preserved', 'historical SG-06 pointer status');
  eq(sg06Row?.merge_commit, checkpoint.supersedes.merge_commit, 'historical SG-06 pointer merge receipt');
  if (sg06Row) for (const error of historicalVerifier(sg06Row)) errors.push(error);

  eq(snapshot.status_sovereignty?.hypothesis_id, 'SSC-H01', 'frozen SSC identity');
  eq(snapshot.status_sovereignty?.authority_tier, 'AT-2', 'frozen SSC authority tier');
  eq(snapshot.status_sovereignty?.status, 'canonical_field_hypothesis_wave_01_maintainer_reviewed_no_prevalence_finding', 'frozen SSC status');
  eq(snapshot.status_sovereignty?.gates, 4, 'frozen SSC gate count');
  eq(snapshot.status_sovereignty?.dimensions, 10, 'frozen SSC dimension count');
  eq(snapshot.status_sovereignty?.fanout_lanes, 16, 'frozen SSC lane count');
  eq(snapshot.status_sovereignty?.field_source_records, 15, 'frozen field source count');
  eq(snapshot.status_sovereignty?.executed_lanes, 8, 'frozen SSC executed lane count');
  eq(snapshot.status_sovereignty?.records_retained, 14, 'frozen SSC retained count');
  eq(snapshot.status_sovereignty?.complete_compact_findings, 0, 'frozen complete compact count');
  eq(snapshot.status_sovereignty?.maintainer_reviewed, 14, 'frozen maintainer review count');
  eq(snapshot.status_sovereignty?.second_party_reviewed, 0, 'frozen second-party review count');
  eq(snapshot.status_sovereignty?.adjudicated, 0, 'frozen adjudication count');
  eq(snapshot.status_sovereignty?.dispositions?.partial_functional_convergence, 6, 'frozen partial convergence count');
  eq(snapshot.status_sovereignty?.dispositions?.ordinary_patriotic_or_industrial_policy, 4, 'frozen control count');
  eq(snapshot.status_sovereignty?.dispositions?.effective_counterpower_controls, 2, 'frozen effective-counterpower control count');
  eq(snapshot.status_sovereignty?.dispositions?.ordinary_industrial_policy_controls, 2, 'frozen industrial-policy control count');
  eq(snapshot.status_sovereignty?.dispositions?.requires_additional_acquisition, 3, 'frozen acquisition count');
  eq(snapshot.status_sovereignty?.dispositions?.capital_conversion_unsupported, 1, 'frozen unsupported capital count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) eq(snapshot.status_sovereignty?.[key], false, `frozen SSC ${key}`);
  eq(snapshot.status_sovereignty?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'frozen SSC publication status');
  eq(snapshot.status_sovereignty?.graph_effect, 'none', 'frozen SSC graph effect');
  eq(snapshot.k0?.query_templates_executed, 9, 'frozen K0 execution');
  eq(snapshot.k0?.included_events, 0, 'frozen K0 event count');
  eq(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  eq(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  eq(snapshot.poof?.indexable, false, 'frozen POOF indexability');
  eq(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  eq(snapshot.sprint_09?.real_person_pilot_authorized, false, 'frozen pilot state');
  eq(snapshot.sprint_09?.project_complete, false, 'frozen project completion');

  eq(checkpoint.fanout_state?.ssc_lanes?.length, 16, 'SG-07 lane fanout count');
  eq(checkpoint.fanout_state?.ssc_lanes?.filter((row) => row.records_retained > 0).length, 8, 'SG-07 executed lane rows');
  eq(checkpoint.fanout_state?.ssc_lanes?.reduce((sum, row) => sum + (row.records_retained ?? 0), 0), 14, 'SG-07 lane retained denominator');
  eq(checkpoint.fanout_state?.ssc_lanes?.reduce((sum, row) => sum + (row.maintainer_reviewed_records ?? 0), 0), 14, 'SG-07 lane maintainer-review denominator');
  eq(checkpoint.fanout_state?.ssc_lanes?.reduce((sum, row) => sum + (row.second_party_reviewed_records ?? 0), 0), 0, 'SG-07 lane second-party denominator');
  eq(checkpoint.fanout_state?.ssc_lanes?.reduce((sum, row) => sum + (row.adjudicated_records ?? 0), 0), 0, 'SG-07 lane adjudication denominator');
  eq(checkpoint.fanout_state?.owner_lanes?.find((row) => row.lane_id === 'FAN-07')?.state, 'canonical_wave01_maintainer_review_complete_second_party_pending_zero_complete_compact', 'FAN-07 state');
  eq(checkpoint.fanout_state?.owner_lanes?.find((row) => row.lane_id === 'FAN-07')?.receipt, checkpoint.trigger.transition_commit, 'FAN-07 receipt');
  eq(checkpoint.fanout_state?.maintainer_review?.observations, 14, 'SG-07 review observation denominator');
  eq(checkpoint.fanout_state?.maintainer_review?.disposition_changes, 0, 'SG-07 review disposition changes');
  eq(checkpoint.build_order?.find((row) => row.order === 3)?.state, 'partial_8_of_16_maintainer_reviewed', 'SG-07 execution build state');
  eq(checkpoint.build_order?.find((row) => row.order === 4)?.state, 'open_zero_second_party_or_adjudicated', 'SG-07 external review build state');
  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-07 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-07 boundary ${key}`);
  }

  for (const error of transitionVerifier(checkpoint)) errors.push(error);

  eq(status.status, snapshot.status_sovereignty.status, 'live SSC status');
  eq(status.current_state?.observations_retained, 14, 'live SSC retained count');
  eq(status.current_state?.executed_lanes, 8, 'live SSC executed lane count');
  eq(status.current_state?.maintainer_reviewed_observations, 14, 'live SSC maintainer review count');
  eq(status.current_state?.second_party_reviewed_observations, 0, 'live SSC second-party review count');
  eq(status.current_state?.adjudicated_observations, 0, 'live SSC adjudication count');
  eq(status.current_state?.complete_compact_findings, 0, 'live SSC complete compact count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) eq(status.current_state?.[key], false, `live SSC ${key}`);
  eq(status.current_state?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'live SSC publication state');
  eq(status.current_state?.graph_effect, 'none', 'live SSC graph effect');
  eq(fanout.counts?.executed_lanes, 8, 'live fanout executed count');
  eq(fanout.counts?.records_retained, 14, 'live fanout retained count');
  eq(fanout.counts?.maintainer_reviewed_records, 14, 'live fanout review count');
  eq(fanout.counts?.second_party_reviewed_records, 0, 'live fanout second-party count');
  eq(fanout.counts?.adjudicated_records, 0, 'live fanout adjudication count');
  eq(sources.counts?.field_source_records, 15, 'live source registry field count');
  eq(sources.counts?.maintainer_reviewed_observation_packets, 14, 'live source registry review count');
  eq(sources.counts?.second_party_reviewed_observation_packets, 0, 'live source registry second-party count');
  eq(wave.status, 'executed_maintainer_reviewed_zero_complete_compact', 'live Wave 01 status');
  eq(wave.counts?.source_records, 15, 'live wave source count');
  eq(wave.counts?.observations, 14, 'live wave observation count');
  eq(wave.counts?.maintainer_reviewed, 14, 'live wave review count');
  eq(wave.counts?.second_party_reviewed, 0, 'live wave second-party count');
  eq(wave.counts?.adjudicated, 0, 'live wave adjudication count');
  eq(wave.counts?.supported_bounded_compact, 0, 'live wave complete compact count');
  eq(review.review_id, 'SSC-W01-MR01', 'live review identity');
  eq(review.counts?.observations, 14, 'live review observation count');
  eq(review.counts?.maintainer_reviewed, 14, 'live review maintainer count');
  eq(review.counts?.second_party_reviewed, 0, 'live review second-party count');
  eq(review.counts?.adjudicated, 0, 'live review adjudication count');
  eq(review.counts?.disposition_changes, 0, 'live review disposition changes');
  eq(review.counts?.effective_counterpower_controls, 2, 'live review effective-counterpower controls');
  eq(review.counts?.ordinary_industrial_policy_controls, 2, 'live review industrial-policy controls');
  eq(review.counts?.requires_additional_acquisition, 3, 'live review acquisition obligations');
  eq(review.current_result?.graph_effect, 'none', 'live review graph effect');
  eq(waveRelease.combined_sha256, snapshot.status_sovereignty.wave_release_sha256, 'live Wave 01 release digest');
  eq(reviewRelease.combined_sha256, snapshot.status_sovereignty.maintainer_review_release_sha256, 'live maintainer-review release digest');
  eq(statusRelease.combined_sha256, snapshot.status_sovereignty.status_release_sha256, 'live SSC release digest');
  eq(k0.execution?.query_templates_executed, 9, 'live K0 execution');
  eq(k0.execution?.included_events, 0, 'live K0 event count');
  eq(dca.execution?.query_templates_executed, 0, 'live DCA execution');
  eq(poofAperture.publication?.deployed, false, 'live POOF deployment');
  eq(poofAperture.publication?.indexable, false, 'live POOF indexability');
  check(hex64.test(poofRelease.combined_sha256), 'live POOF release digest format');
  eq(sprint09.current_result?.maximum_verified_adoption_level, 'A0', 'live adoption');
  eq(sprint09.current_result?.real_person_pilot_authorized, false, 'live pilot state');
  eq(sprint09.current_result?.project_complete, false, 'live project completion');

  eq(manifest.schema_version, 'project-stable-ground-sg07-release-manifest@1', 'SG-07 manifest schema');
  eq(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-07 manifest identity');
  eq(JSON.stringify(manifest), JSON.stringify(computeSg07Manifest()), 'current SG-07 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg07-report@1', 'SG-07 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-07 report identity');
  eq(report.canonical_main?.commit, checkpoint.trigger.transition_commit, 'SG-07 report transition');
  eq(report.counts?.checkpoints_preserved, 7, 'SG-07 report history count');
  eq(report.counts?.ssc_field_sources, 15, 'SG-07 report field source count');
  eq(report.counts?.ssc_observations, 14, 'SG-07 report observation count');
  eq(report.counts?.maintainer_reviewed, 14, 'SG-07 report maintainer-review count');
  eq(report.counts?.second_party_reviewed, 0, 'SG-07 report second-party count');
  eq(report.counts?.adjudicated, 0, 'SG-07 report adjudication count');
  eq(report.counts?.ssc_complete_compact_findings, 0, 'SG-07 report complete compact count');
  eq(report.wave_release?.combined_sha256, waveRelease.combined_sha256, 'SG-07 report Wave 01 digest');
  eq(report.maintainer_review_release?.combined_sha256, reviewRelease.combined_sha256, 'SG-07 report maintainer-review digest');
  eq(report.status_release?.combined_sha256, statusRelease.combined_sha256, 'SG-07 report SSC digest');
  eq(report.poof_release?.combined_sha256, poofRelease.combined_sha256, 'SG-07 report POOF digest');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-07 report release digest');
  return errors;
}

function main() {
  const errors = validateSg07();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg07: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg07: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
