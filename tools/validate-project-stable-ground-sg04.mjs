#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;
const transitionCommit = 'e9b85b31281db02ce3f9a9a84dd7aea34b714849';
const sg04MergeCommit = '8c5e592034effe30d644319e085f97e045060269';
const sg04ReleaseDigest = '7b2c6aa2cebd82ad027c81fd3a82bc07162f1b49f44a8c34981ed2f5af7805a1';
const k0ReleaseDigest = '373955b42246fe20abc51d7ede50c18c3af39430ac523d8dc9206316f530bf16';
const waveReleaseDigest = '2b26149de23b27bc51431307afa4efaedf72d055d304a00bd97508175543259c';
const poofReleaseDigest = '81d0ea9f894cde1d673580c18adaebc5284a381cc0ce67a9e8be3dbcde1d0df5';

function ensureCommit(sha, label) {
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  return [`${label} is unavailable in repository history`];
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) return ['historical SG-04 merge receipt is not a full commit SHA'];
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-04 merge receipt'));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg04.json',
    'data/project/project-stable-ground-sg04-release-manifest.json',
    'reports/core-thesis/stable-ground/sg04/checkpoint.json',
    'reports/core-thesis/stable-ground/sg04/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 32 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-04 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-04 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg04Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg04.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    manifest: read('data/project/project-stable-ground-sg04-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg04/checkpoint.json'),
    historicalVerifier
  };
}

export function validateSg04(context = loadSg04Context()) {
  const errors = [];
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const { checkpoint, pointer, governor, manifest, report, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-04 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-29-04', 'SG-04 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-04 governor');
  equal(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-29-03', 'SG-04 predecessor');
  equal(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg03.json', 'SG-04 predecessor path');
  equal(checkpoint.supersedes?.merge_commit, 'b305eb935864b8adef320e8db5ff471d2a778403', 'SG-03 merge receipt');
  equal(checkpoint.supersedes?.preserved_unchanged, true, 'SG-03 preservation');
  equal(checkpoint.preserved_history?.length, 3, 'SG-04 preserved-history count');
  equal(JSON.stringify(checkpoint.preserved_history?.map((row) => row.checkpoint_id)), JSON.stringify(['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03']), 'SG-04 preserved-history order');
  check(checkpoint.preserved_history?.every((row) => row.status === 'superseded_preserved'), 'SG-04 predecessor status drift');

  equal(checkpoint.trigger?.type, 'canonical_K0_query_battery_completion', 'SG-04 trigger type');
  equal(checkpoint.trigger?.issue, 446, 'SG-04 trigger issue');
  equal(checkpoint.trigger?.pull_request, 405, 'SG-04 trigger PR');
  equal(checkpoint.trigger?.transition_commit, transitionCommit, 'SG-04 K0 transition receipt');
  equal(checkpoint.trigger?.source_wave_release_sha256, waveReleaseDigest, 'source Wave 08 digest');
  equal(checkpoint.trigger?.source_aggregate_release_sha256, k0ReleaseDigest, 'source aggregate K0 digest');
  equal(checkpoint.canonical_main?.commit, transitionCommit, 'SG-04 canonical transition');

  equal(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  equal(governor.history_law?.append_only, true, 'governor append-only law');
  equal(governor.history_law?.checkpoint_ids_unique, true, 'governor unique-ID law');
  equal(governor.history_law?.history_order_oldest_to_newest, true, 'governor history-order law');
  equal(governor.history_law?.one_current_checkpoint, true, 'governor current-checkpoint law');
  equal(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  equal(governor.history_law?.historical_release_manifests_recomputed, false, 'governor no-recompute law');

  equal(snapshot.k0?.query_templates_total, 9, 'frozen K0 query_templates_total');
  equal(snapshot.k0?.query_templates_executed, 9, 'frozen K0 query_templates_executed');
  equal(snapshot.k0?.returned_records, 65, 'frozen K0 returned_records');
  equal(snapshot.k0?.candidate_records, 28, 'frozen K0 candidate_records');
  equal(snapshot.k0?.included_events, 0, 'frozen K0 included_events');
  equal(snapshot.k0?.graph_effect, 'none', 'frozen K0 graph effect');
  equal(snapshot.wave_08?.retained_records, 8, 'frozen Wave 08 retained_records');
  equal(snapshot.wave_08?.candidate_records, 4, 'frozen Wave 08 candidate_records');
  equal(snapshot.wave_08?.assigned_ccd_values, 0, 'frozen Wave 08 assigned_ccd_values');
  equal(snapshot.wave_08?.field_adjudication_complete, false, 'frozen Wave 08 field_adjudication_complete');
  equal(snapshot.wave_08?.publication_status, 'blocked', 'frozen Wave 08 publication status');
  equal(snapshot.poof?.deployed, false, 'frozen POOF deployment');
  equal(snapshot.poof?.indexable, false, 'frozen POOF indexability');
  equal(snapshot.dca?.query_templates_executed, 0, 'frozen DCA execution');
  equal(snapshot.dca?.prevalence_finding_generated, false, 'frozen DCA prevalence');
  equal(snapshot.sprint_09?.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09?.real_person_pilot_authorized, false, 'frozen pilot state');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') equal(value, 'none', `SG-04 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-04 boundary ${key}`);
  }

  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-04 remains current after SG-05 succession');
  equal(pointer.current_checkpoint_id, 'SG-2026-07-30-05', 'current checkpoint after SG-04');
  const historyIds = pointer.history?.map((row) => row.checkpoint_id) ?? [];
  equal(JSON.stringify(historyIds), JSON.stringify(['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05']), 'pointer history order');
  const historyRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(historyRow), 'historical pointer row missing for SG-04');
  equal(historyRow?.path, 'data/project/project-stable-ground-sg04.json', 'historical SG-04 pointer path');
  equal(historyRow?.status, 'superseded_preserved', 'historical SG-04 pointer status');
  equal(historyRow?.merge_commit, sg04MergeCommit, 'historical SG-04 merge receipt');

  equal(manifest.schema_version, 'project-stable-ground-sg04-release-manifest@1', 'historical SG-04 manifest schema');
  equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-04 manifest identity');
  equal(manifest.combined_sha256, sg04ReleaseDigest, 'historical SG-04 release digest');
  equal(report.schema_version, 'project-stable-ground-sg04-report@1', 'historical SG-04 report schema');
  equal(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-04 report identity');
  equal(report.k0_release?.combined_sha256, k0ReleaseDigest, 'historical SG-04 report K0 digest');
  equal(report.wave_08_release?.combined_sha256, waveReleaseDigest, 'historical SG-04 report Wave 08 digest');
  equal(report.poof_release?.combined_sha256, poofReleaseDigest, 'historical SG-04 report POOF digest');
  equal(report.release_manifest?.combined_sha256, sg04ReleaseDigest, 'historical SG-04 report release digest');

  if (historyRow) for (const error of historicalVerifier(historyRow)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg04();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg04: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg04: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
