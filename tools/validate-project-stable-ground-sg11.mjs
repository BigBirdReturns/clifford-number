#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;
const RECEIPT = '974b7a70cdc46828805f38bb4abe46aacd94380c';
const FROZEN_RELEASE = 'bd559144b5b12743312a2cc6fa233492542175b90be1a7f3e083e0156b4db9f2';
const frozenPaths = [
  'data/project/project-stable-ground-sg11.json',
  'data/project/project-stable-ground-sg11-release-manifest.json',
  'reports/core-thesis/stable-ground/sg11/checkpoint.json',
  'reports/core-thesis/stable-ground/sg11/index.html'
];

function ensureCommit(sha, label, depth = 128) {
  if (!hex40.test(sha || '')) return [`${label} is not a full commit SHA`];
  if (spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root }).status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', '--no-write-fetch-head', `--depth=${depth}`, 'origin', `${sha}:refs/sg11-history/${sha}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  return spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root }).status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function defaultHistoricalVerifier(row) {
  const errors = ensureCommit(row?.merge_commit, 'historical SG-11 merge receipt');
  if (errors.length) return errors;
  for (const rel of frozenPaths) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-11 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-11 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg11HistoricalContext({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg11.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    manifest: read('data/project/project-stable-ground-sg11-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg11/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg11/index.html'), 'utf8'),
    historicalVerifier
  };
}

export function validateSg11(context = loadSg11HistoricalContext()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, manifest, report, html, historicalVerifier } = context;
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-11', 'SG-11 identity');
  eq(checkpoint.trigger?.campaign_id, 'SSC-W02-SPR01', 'SG-11 campaign identity');
  eq(checkpoint.trigger?.reviewer_candidates, 0, 'SG-11 frozen candidate zero');
  eq(checkpoint.trigger?.valid_reviews, 0, 'SG-11 frozen review zero');
  eq(checkpoint.trigger?.adjudicated_packets, 0, 'SG-11 frozen adjudication zero');
  eq(manifest.schema_version, 'project-stable-ground-sg11-release-manifest@1', 'SG-11 manifest schema');
  eq(manifest.combined_sha256, FROZEN_RELEASE, 'SG-11 frozen release digest');
  eq(report.schema_version, 'project-stable-ground-sg11-report@1', 'SG-11 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-11 report identity');
  eq(report.counts?.reviewer_candidates, 0, 'SG-11 report candidate zero');
  eq(report.counts?.valid_reviews, 0, 'SG-11 report review zero');
  eq(report.release_manifest?.combined_sha256, FROZEN_RELEASE, 'SG-11 report release digest');
  check(html.includes('0 CANDIDATES · 0 INVITATIONS · 0 VALID REVIEWS'), 'SG-11 historical banner missing');
  check(html.includes(FROZEN_RELEASE), 'SG-11 frozen digest missing from HTML');
  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor historical no-rewrite law');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'SG-11 history row missing');
  eq(row?.path, 'data/project/project-stable-ground-sg11.json', 'SG-11 history path');
  eq(row?.status, 'superseded_preserved', 'SG-11 historical status');
  eq(row?.trigger_commit, checkpoint.trigger.transition_commit, 'SG-11 trigger receipt');
  eq(row?.integration_commit, checkpoint.trigger.integration_commit, 'SG-11 integration receipt');
  eq(row?.merge_commit, RECEIPT, 'SG-11 merge receipt');
  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-11 incorrectly remains current');
  eq(pointer.history?.filter((item) => item.status === 'current').length, 1, 'pointer current checkpoint denominator');
  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-11 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-11 boundary ${key}`);
  }
  if (row) for (const error of historicalVerifier(row)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg11();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg11: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg11: historical checkpoint PASS');
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
