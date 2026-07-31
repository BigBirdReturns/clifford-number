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

function ensureCommit(sha, label, depth = 3) {
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
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-07 merge receipt'));
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

export function loadSg07Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg07.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg06: read('data/project/project-stable-ground-sg06.json'),
    manifest: read('data/project/project-stable-ground-sg07-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg07/checkpoint.json'),
    historicalVerifier
  };
}

export function validateSg07(context = loadSg07Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg06, manifest, report, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-07 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-30-07', 'SG-07 checkpoint identity');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-06', 'SG-07 predecessor');
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
  eq(checkpoint.trigger?.transition_paths?.length, 35, 'SG-07 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-07 transition path digest');
  eq(checkpoint.trigger?.maintainer_reviewed, 14, 'SG-07 maintainer review count');
  eq(checkpoint.trigger?.second_party_reviewed, 0, 'SG-07 second-party review count');
  eq(checkpoint.trigger?.adjudicated, 0, 'SG-07 adjudication count');
  eq(checkpoint.trigger?.disposition_changes, 0, 'SG-07 disposition-change count');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  const expectedPrefix = [...expectedPreserved, 'SG-2026-07-30-07'];
  eq(JSON.stringify(pointer.history?.slice(0, 7).map((row) => row.checkpoint_id)), JSON.stringify(expectedPrefix), 'pointer history prefix');
  eq(new Set(pointer.history?.map((row) => row.checkpoint_id)).size, pointer.history?.length, 'pointer checkpoint uniqueness');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'pointer row missing for SG-07');
  eq(row?.path, 'data/project/project-stable-ground-sg07.json', 'SG-07 pointer path');
  eq(row?.status, 'superseded_preserved', 'historical SG-07 pointer status');
  eq(row?.merge_commit, 'f3fb90778ce12e262cd24824c385594d7c7daec2', 'historical SG-07 pointer merge receipt');

  eq(snapshot.status_sovereignty?.status, 'canonical_field_hypothesis_wave_01_maintainer_reviewed_no_prevalence_finding', 'frozen SSC status');
  eq(snapshot.status_sovereignty?.records_retained, 14, 'frozen SSC retained count');
  eq(snapshot.status_sovereignty?.maintainer_reviewed, 14, 'frozen maintainer review count');
  eq(snapshot.status_sovereignty?.second_party_reviewed, 0, 'frozen second-party review count');
  eq(snapshot.status_sovereignty?.adjudicated, 0, 'frozen adjudication count');
  eq(snapshot.status_sovereignty?.complete_compact_findings, 0, 'frozen complete compact count');
  eq(snapshot.status_sovereignty?.dispositions?.effective_counterpower_controls, 2, 'frozen effective-counterpower control count');
  eq(snapshot.status_sovereignty?.dispositions?.ordinary_industrial_policy_controls, 2, 'frozen industrial-policy control count');
  eq(snapshot.status_sovereignty?.dispositions?.requires_additional_acquisition, 3, 'frozen acquisition count');
  eq(snapshot.status_sovereignty?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'frozen publication state');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) eq(snapshot.status_sovereignty?.[key], false, `frozen SSC ${key}`);
  eq(snapshot.status_sovereignty?.graph_effect, 'none', 'frozen graph effect');
  eq(snapshot.k0?.included_events, 0, 'frozen K0 events');
  eq(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  eq(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  eq(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  eq(checkpoint.fanout_state?.maintainer_review?.disposition_changes, 0, 'SG-07 review disposition changes');
  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-07 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-07 boundary ${key}`);
  }

  eq(manifest.schema_version, 'project-stable-ground-sg07-release-manifest@1', 'historical SG-07 manifest schema');
  eq(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-07 manifest identity');
  eq(report.schema_version, 'project-stable-ground-sg07-report@1', 'historical SG-07 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-07 report identity');
  if (row) for (const error of historicalVerifier(row)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg07();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg07: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg07: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
