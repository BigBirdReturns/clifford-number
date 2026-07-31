#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;

function ensureCommit(sha, label, depth = 4) {
  if (!hex40.test(sha || '')) return [`${label} is not a full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', `--depth=${depth}`, 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-08 merge receipt'));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg08.json',
    'data/project/project-stable-ground-sg08-release-manifest.json',
    'reports/core-thesis/stable-ground/sg08/checkpoint.json',
    'reports/core-thesis/stable-ground/sg08/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-08 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-08 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg08Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg08.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg07: read('data/project/project-stable-ground-sg07.json'),
    manifest: read('data/project/project-stable-ground-sg08-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg08/checkpoint.json'),
    historicalVerifier
  };
}

export function validateSg08(context = loadSg08Context()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg07, manifest, report, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-08 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-30-08', 'SG-08 checkpoint identity');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-07', 'SG-08 predecessor');
  eq(checkpoint.supersedes?.merge_commit, 'f3fb90778ce12e262cd24824c385594d7c7daec2', 'SG-07 merge receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-07 preservation');
  eq(sg07.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-07 source identity');
  eq(checkpoint.preserved_history?.length, 7, 'SG-08 preserved-history count');
  const expectedPreserved = [
    'SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03',
    'SG-2026-07-29-04', 'SG-2026-07-30-05', 'SG-2026-07-30-06',
    'SG-2026-07-30-07'
  ];
  eq(JSON.stringify(checkpoint.preserved_history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedPreserved), 'SG-08 preserved-history order');
  check(checkpoint.preserved_history?.every((row) => row.status === 'superseded_preserved'), 'SG-08 predecessor status drift');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_01_targeted_acquisition', 'SG-08 trigger type');
  eq(checkpoint.trigger?.issue, 503, 'SG-08 trigger issue');
  eq(checkpoint.trigger?.pull_request, 504, 'SG-08 trigger PR');
  eq(checkpoint.trigger?.acquisition_id, 'SSC-W01-TA01', 'SG-08 acquisition identity');
  eq(checkpoint.trigger?.transition_base, 'f3fb90778ce12e262cd24824c385594d7c7daec2', 'SG-08 transition base');
  eq(checkpoint.trigger?.transition_commit, 'c7507a8705b086371a79bb52e92b344be17685e0', 'SG-08 transition commit');
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

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  const expectedPrefix = [...expectedPreserved, 'SG-2026-07-30-08'];
  eq(JSON.stringify(pointer.history?.slice(0, 8).map((row) => row.checkpoint_id)), JSON.stringify(expectedPrefix), 'pointer history prefix');
  eq(new Set(pointer.history?.map((row) => row.checkpoint_id)).size, pointer.history?.length, 'pointer checkpoint uniqueness');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'pointer row missing for SG-08');
  eq(row?.path, 'data/project/project-stable-ground-sg08.json', 'SG-08 pointer path');
  eq(row?.status, 'superseded_preserved', 'historical SG-08 pointer status');
  eq(row?.merge_commit, '0d0999b89196294ec6d8058b7f18e44360d2b6e6', 'historical SG-08 pointer merge receipt');

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
  for (const key of ['prevalence_finding_generated', 'racial_order_finding_generated', 'coordination_finding_generated', 'common_purpose_finding_generated', 'personal_hostility_finding_generated']) {
    eq(snapshot.status_sovereignty?.[key], false, `frozen SSC ${key}`);
  }
  eq(snapshot.status_sovereignty?.graph_effect, 'none', 'frozen SSC graph effect');
  eq(snapshot.k0?.query_templates_executed, 9, 'frozen K0 execution');
  eq(snapshot.k0?.included_events, 0, 'frozen K0 events');
  eq(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  eq(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  eq(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  eq(checkpoint.fanout_state?.targeted_acquisition?.obligations, 3, 'SG-08 targeted obligation count');
  eq(checkpoint.fanout_state?.targeted_acquisition?.partially_repaired_open, 3, 'SG-08 targeted partially repaired count');
  eq(checkpoint.fanout_state?.targeted_acquisition?.closed, 0, 'SG-08 targeted closed count');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-08 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-08 boundary ${key}`);
  }

  eq(manifest.schema_version, 'project-stable-ground-sg08-release-manifest@1', 'historical SG-08 manifest schema');
  eq(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-08 manifest identity');
  eq(manifest.combined_sha256, '3aa05e1e56e9fb625b7d849bbc1e13d36d1974341cbcd425c234e5634fbeb512', 'historical SG-08 release digest');
  eq(report.schema_version, 'project-stable-ground-sg08-report@1', 'historical SG-08 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-08 report identity');
  if (row) for (const error of historicalVerifier(row)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg08();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg08: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg08: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
