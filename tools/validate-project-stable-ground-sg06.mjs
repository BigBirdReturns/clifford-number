#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg06Manifest } from './build-project-stable-ground-sg06.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const zero40 = '0'.repeat(40);

function ensureCommit(sha, label, depth = 3) {
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
  errors.push(...ensureCommit(base, 'SG-06 transition base'));
  errors.push(...ensureCommit(transition, 'SG-06 transition commit'));
  if (errors.length) return errors;
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) {
    const raw = spawnSync('git', ['cat-file', '-p', transition], { cwd: root, encoding: 'utf8' });
    const parents = raw.status === 0 ? raw.stdout.split('\n').filter((line) => line.startsWith('parent ')).map((line) => line.slice(7).trim()) : [];
    if (!parents.includes(base)) errors.push('SG-06 transition commit is not descended from its declared base');
  }
  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) errors.push('SG-06 transition path denominator cannot be recovered');
  else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-06 transition path denominator drift: ${JSON.stringify(observed)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-06 transition path digest drift');
  }
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) return ['historical SG-06 merge receipt is not a full commit SHA'];
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-06 merge receipt'));
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

export function loadSg06Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg06.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg05: read('data/project/project-stable-ground-sg05.json'),
    status: read('data/project/status-sovereignty-compact.json'),
    manifest: read('data/project/project-stable-ground-sg06-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg06/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg06(context = loadSg06Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg05, status, manifest, report, transitionVerifier, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-06 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-30-06', 'SG-06 checkpoint identity');
  eq(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-06 governor');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-05', 'SG-06 predecessor');
  eq(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg05.json', 'SG-06 predecessor path');
  eq(checkpoint.supersedes?.merge_commit, 'cada5ce40087305196a53a9ecc32a707cff28e52', 'SG-05 merge receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-05 preservation');
  eq(sg05.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-05 source identity');
  eq(checkpoint.preserved_history?.length, 5, 'SG-06 preserved-history count');
  const expectedPreserved = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05'];
  eq(JSON.stringify(checkpoint.preserved_history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedPreserved), 'SG-06 preserved-history order');
  check(checkpoint.preserved_history?.every((row) => row.status === 'superseded_preserved'), 'SG-06 predecessor status drift');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_01_execution', 'SG-06 trigger type');
  eq(checkpoint.trigger?.issue, 468, 'SG-06 trigger issue');
  eq(checkpoint.trigger?.pull_request, 480, 'SG-06 trigger PR');
  check(hex40.test(checkpoint.trigger?.transition_commit) && checkpoint.trigger.transition_commit !== zero40, 'SG-06 transition receipt is not materialized');
  eq(checkpoint.trigger?.transition_base, '0d701692fa83a405bd0ba86e7b45c525022589f7', 'SG-06 transition base');
  eq(checkpoint.trigger?.transition_paths?.length, 43, 'SG-06 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-06 transition path digest');
  eq(checkpoint.canonical_main?.commit, checkpoint.trigger.transition_commit, 'SG-06 canonical transition');

  eq(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  check(governor.trigger_classes.some((row) => row.includes('field-execution')), 'governor missing field-execution trigger');

  const expectedPrefix = [...expectedPreserved, 'SG-2026-07-30-06'];
  eq(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  eq(JSON.stringify(pointer.history?.slice(0, 6).map((row) => row.checkpoint_id)), JSON.stringify(expectedPrefix), 'pointer history prefix');
  eq(new Set(pointer.history?.map((row) => row.checkpoint_id)).size, pointer.history?.length, 'pointer checkpoint uniqueness');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'pointer row missing for SG-06');
  eq(row?.path, 'data/project/project-stable-ground-sg06.json', 'SG-06 pointer path');

  eq(snapshot.status_sovereignty?.hypothesis_id, 'SSC-H01', 'frozen SSC identity');
  eq(snapshot.status_sovereignty?.authority_tier, 'AT-2', 'frozen SSC authority tier');
  eq(snapshot.status_sovereignty?.status, 'canonical_field_hypothesis_wave_01_executed_unreviewed_no_prevalence_finding', 'frozen SSC status');
  eq(snapshot.status_sovereignty?.gates, 4, 'frozen SSC gate count');
  eq(snapshot.status_sovereignty?.dimensions, 10, 'frozen SSC dimension count');
  eq(snapshot.status_sovereignty?.fanout_lanes, 16, 'frozen SSC lane count');
  eq(snapshot.status_sovereignty?.field_source_records, 15, 'frozen field source count');
  eq(snapshot.status_sovereignty?.executed_lanes, 8, 'frozen SSC executed lane count');
  eq(snapshot.status_sovereignty?.records_retained, 14, 'frozen SSC retained count');
  eq(snapshot.status_sovereignty?.complete_compact_findings, 0, 'frozen complete compact count');
  eq(snapshot.status_sovereignty?.maintainer_reviewed, 0, 'frozen maintainer review count');
  eq(snapshot.status_sovereignty?.second_party_reviewed, 0, 'frozen second-party review count');
  eq(snapshot.status_sovereignty?.adjudicated, 0, 'frozen adjudication count');
  eq(snapshot.status_sovereignty?.dispositions?.partial_functional_convergence, 6, 'frozen partial convergence count');
  eq(snapshot.status_sovereignty?.dispositions?.ordinary_patriotic_or_industrial_policy, 4, 'frozen control count');
  eq(snapshot.status_sovereignty?.dispositions?.requires_additional_acquisition, 3, 'frozen acquisition count');
  eq(snapshot.status_sovereignty?.dispositions?.capital_conversion_unsupported, 1, 'frozen unsupported capital count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) eq(snapshot.status_sovereignty?.[key], false, `frozen SSC ${key}`);
  eq(snapshot.status_sovereignty?.publication_status, 'blocked_pending_maintainer_and_second_party_review', 'frozen SSC publication status');
  eq(snapshot.status_sovereignty?.graph_effect, 'none', 'frozen SSC graph effect');
  eq(snapshot.k0?.query_templates_executed, 9, 'frozen K0 execution');
  eq(snapshot.k0?.included_events, 0, 'frozen K0 event count');
  eq(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  eq(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  eq(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');

  eq(checkpoint.fanout_state?.ssc_lanes?.length, 16, 'SG-06 lane fanout count');
  eq(checkpoint.fanout_state?.ssc_lanes?.filter((item) => item.records_retained > 0).length, 8, 'SG-06 executed lane rows');
  eq(checkpoint.fanout_state?.ssc_lanes?.reduce((sum, item) => sum + (item.records_retained ?? 0), 0), 14, 'SG-06 lane retained denominator');
  eq(checkpoint.fanout_state?.owner_lanes?.find((item) => item.lane_id === 'FAN-07')?.state, 'canonical_wave01_execution_unreviewed_zero_complete_compact', 'FAN-07 state');
  eq(checkpoint.build_order?.find((item) => item.order === 3)?.state, 'partial_8_of_16_unreviewed', 'SG-06 execution build state');
  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-06 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-06 boundary ${key}`);
  }

  const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
  if (isCurrent) {
    eq(row?.status, 'current', 'current SG-06 pointer status');
    eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg06.json', 'current SG-06 pointer path');
    eq(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'current SG-06 pointer receipt');
    for (const error of transitionVerifier(checkpoint)) errors.push(error);
    eq(status.status, snapshot.status_sovereignty.status, 'live SSC status');
    eq(status.current_state?.maintainer_reviewed_observations, 0, 'live SSC maintainer review count');
    eq(manifest.schema_version, 'project-stable-ground-sg06-release-manifest@1', 'SG-06 manifest schema');
    eq(JSON.stringify(manifest), JSON.stringify(computeSg06Manifest()), 'current SG-06 exact-byte manifest');
  } else {
    eq(row?.status, 'superseded_preserved', 'historical SG-06 pointer status');
    eq(row?.merge_commit, 'a9cb4c707a1cc6afb51d0fd20b0375e0cf2373b7', 'historical SG-06 pointer merge receipt');
    eq(manifest.schema_version, 'project-stable-ground-sg06-release-manifest@1', 'historical SG-06 manifest schema');
    eq(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-06 manifest identity');
    eq(report.schema_version, 'project-stable-ground-sg06-report@1', 'historical SG-06 report schema');
    eq(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-06 report identity');
    if (row) for (const error of historicalVerifier(row)) errors.push(error);
  }
  return errors;
}

function main() {
  const errors = validateSg06();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg06: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg06: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
