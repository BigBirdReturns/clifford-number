#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;

function ensureCommit(sha, label, depth = 8) {
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
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-09 merge receipt'));
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

export function loadSg09Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg09.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    manifest: read('data/project/project-stable-ground-sg09-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg09/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg09/index.html'), 'utf8'),
    historicalVerifier
  };
}

export function validateSg09(context = loadSg09Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, manifest, report, html, historicalVerifier } = context;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-09 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-09', 'SG-09 identity');
  eq(checkpoint.trigger?.campaign_id, 'SSC-W01-SPR01', 'SG-09 campaign identity');
  eq(checkpoint.trigger?.wave_packets, 14, 'SG-09 packet denominator');
  eq(checkpoint.trigger?.valid_reviews, 0, 'SG-09 valid-review zero state');
  eq(checkpoint.trigger?.adjudicated_packets, 0, 'SG-09 adjudication zero state');
  eq(checkpoint.trigger?.graph_effects, 0, 'SG-09 graph zero state');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-08', 'SG-09 predecessor');
  eq(checkpoint.supersedes?.release_sha256, '3aa05e1e56e9fb625b7d849bbc1e13d36d1974341cbcd425c234e5634fbeb512', 'SG-09 predecessor release');
  eq(manifest.schema_version, 'project-stable-ground-sg09-release-manifest@1', 'SG-09 manifest schema');
  eq(manifest.combined_sha256, 'a6c807988a3690ecd3f7d79c82074db75b9304ec366f1885ba6e3e9e6336fd40', 'SG-09 release digest');
  eq(report.schema_version, 'project-stable-ground-sg09-report@1', 'SG-09 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-09 report identity');
  check(html.includes('14/14 PACKETS FROZEN · 14/14 UNASSIGNED · 0 CANDIDATES · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SG-09 historical banner missing');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.validation_modes?.historical?.must_not_validate?.includes('historical counts against later live corpus state'), true, 'governor historical live-state refusal');
  const row = pointer.history?.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(row), 'SG-09 history row missing');
  eq(row?.path, 'data/project/project-stable-ground-sg09.json', 'SG-09 history path');
  eq(row?.status, 'superseded_preserved', 'SG-09 historical status');
  eq(row?.trigger_commit, checkpoint.trigger.transition_commit, 'SG-09 trigger receipt');
  eq(row?.merge_commit, '17775a008efbe33c57a59af489db691716e9bae1', 'SG-09 merge receipt');
  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-09 incorrectly remains current');
  eq(pointer.history?.filter((item) => item.status === 'current').length, 1, 'pointer current checkpoint denominator');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-09 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-09 boundary ${key}`);
  }
  if (row) for (const error of historicalVerifier(row)) errors.push(error);
  return errors;
}

function main() {
  const errors = validateSg09();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg09: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg09: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
