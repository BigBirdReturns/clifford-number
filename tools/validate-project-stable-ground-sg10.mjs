#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;
const RECEIPT = 'b952da00932012be409c63554d6c81f8367723cb';
const FROZEN_RELEASE = '33e94ab2d918a2338f61e3b921052aae133726a3d86c7cab81411f14b9ac6c53';
const frozenPaths = [
  "data/project/project-stable-ground-sg10.json",
  "data/project/project-stable-ground-sg10-release-manifest.json",
  "reports/core-thesis/stable-ground/sg10/checkpoint.json",
  "reports/core-thesis/stable-ground/sg10/index.html"
];

function ensureCommit(sha, label, depth = 64) {
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
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-10 merge receipt'));
  if (errors.length) return errors;
  for (const rel of frozenPaths) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-10 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-10 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg10HistoricalContext({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg10.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    manifest: read('data/project/project-stable-ground-sg10-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg10/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg10/index.html'), 'utf8'),
    historicalVerifier
  };
}

export function validateSg10(context = loadSg10HistoricalContext()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, manifest, report, html, historicalVerifier } = context;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-10 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-10', 'SG-10 identity');
  eq(checkpoint.trigger?.review_id, 'SSC-W02-MR01', 'SG-10 review identity');
  eq(checkpoint.trigger?.wave_02_maintainer_reviewed, 8, 'SG-10 reviewed count');
  eq(checkpoint.trigger?.wave_02_second_party_reviewed, 0, 'SG-10 second-party zero');
  eq(checkpoint.trigger?.wave_02_adjudicated, 0, 'SG-10 adjudication zero');
  eq(checkpoint.trigger?.global_open_acquisition_obligations, 6, 'SG-10 open-acquisition denominator');
  eq(checkpoint.trigger?.complete_compact_findings, 0, 'SG-10 complete-compact zero');
  eq(checkpoint.trigger?.publication_clearances, 0, 'SG-10 publication zero');
  eq(checkpoint.trigger?.graph_effects, 0, 'SG-10 graph zero');
  eq(manifest.schema_version, 'project-stable-ground-sg10-release-manifest@1', 'SG-10 manifest schema');
  eq(manifest.combined_sha256, FROZEN_RELEASE, 'SG-10 frozen release digest');
  eq(report.schema_version, 'project-stable-ground-sg10-report@1', 'SG-10 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-10 report identity');
  eq(report.release_manifest?.combined_sha256, FROZEN_RELEASE, 'SG-10 report release digest');
  eq(report.counts?.maintainer_reviewed, 22, 'SG-10 report reviewed count');
  eq(report.counts?.global_open_acquisition_obligations, 6, 'SG-10 report obligation count');
  check(html.includes('22/22 MAINTAINER REVIEWED · 0 SECOND-PARTY · 0 ADJUDICATED · 6 OPEN ACQUISITIONS · 0 COMPLETE COMPACT · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SG-10 historical banner missing');
  check(html.includes(FROZEN_RELEASE), 'SG-10 frozen digest missing from HTML');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor historical no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.validation_modes?.historical?.must_not_validate?.includes('historical counts against later live corpus state'), true, 'governor historical live-state refusal');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'SG-10 history row missing');
  eq(row?.path, 'data/project/project-stable-ground-sg10.json', 'SG-10 history path');
  eq(row?.status, 'superseded_preserved', 'SG-10 historical status');
  eq(row?.trigger_commit, checkpoint.trigger.transition_commit, 'SG-10 trigger receipt');
  eq(row?.merge_commit, RECEIPT, 'SG-10 merge receipt');
  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-10 incorrectly remains current');
  eq(pointer.history?.filter((item) => item.status === 'current').length, 1, 'pointer current checkpoint denominator');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-10 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-10 boundary ${key}`);
  }
  if (row) for (const error of historicalVerifier(row)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg10();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg10: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg10: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
