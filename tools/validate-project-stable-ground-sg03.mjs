#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;

function ensureCommit(sha) {
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', sha], {
    cwd: root,
    encoding: 'utf8'
  });
  if (fetched.status !== 0) {
    return [`historical SG-03 merge receipt cannot be acquired: ${fetched.stderr || fetched.stdout}`];
  }
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : ['historical SG-03 merge receipt is unavailable after bounded acquisition'];
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) {
    return ['historical SG-03 merge receipt is not a full commit SHA'];
  }
  errors.push(...ensureCommit(row.merge_commit));
  if (errors.length) return errors;

  const paths = [
    'data/project/project-stable-ground-sg03.json',
    'data/project/project-stable-ground-sg03-release-manifest.json',
    'reports/core-thesis/stable-ground/sg03/checkpoint.json',
    'reports/core-thesis/stable-ground/sg03/index.html'
  ];
  for (const rel of paths) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024
    });
    if (committed.status !== 0) {
      errors.push(`historical SG-03 merge receipt cannot recover ${rel}`);
      continue;
    }
    if (!committed.stdout.equals(readBytes(rel))) {
      errors.push(`historical SG-03 bytes drifted from merge receipt: ${rel}`);
    }
  }
  return errors;
}

export function loadSg03Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg03.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg01: read('data/project/project-stable-ground-alignment.json'),
    sg02: read('data/project/project-stable-ground-sg02.json'),
    manifest: read('data/project/project-stable-ground-sg03-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg03/checkpoint.json'),
    historicalVerifier
  };
}

export function validateSg03(context = loadSg03Context()) {
  const errors = [];
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const { checkpoint, pointer, governor, sg01, sg02, manifest, report, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-03 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-29-03', 'SG-03 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-03 governor');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-02', 'SG-03 predecessor');
  equal(checkpoint.supersedes.merge_commit, '6b54d531885b5de72be547933ad4f7828a34d529', 'SG-02 merge receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-02 preservation');
  equal(sg02.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-02 source identity');
  equal(sg01.checkpoint_id, 'SG-2026-07-29-01', 'SG-01 source identity');
  equal(checkpoint.trigger.type, 'canonical_POOF_Clifford_ecology', 'SG-03 trigger type');
  equal(checkpoint.trigger.issue, 438, 'SG-03 trigger issue');
  equal(checkpoint.trigger.pull_request, 410, 'SG-03 trigger PR');
  equal(checkpoint.trigger.merge_commit, 'e8fa1b4d188d128e856fb9900b0a4da8053042a5', 'POOF trigger receipt');
  equal(checkpoint.trigger.release_sha256, '26ebcd554cdc4a0c7a9b21946decf098aba8e2720c0a11121459f9fddb126248', 'POOF trigger digest');
  equal(checkpoint.canonical_main.commit, checkpoint.trigger.merge_commit, 'SG-03 canonical base');

  equal(checkpoint.preserved_stable_propositions.length, 9, 'SG-03 stable proposition count');
  equal(
    JSON.stringify(checkpoint.preserved_stable_propositions),
    JSON.stringify(sg01.stable_propositions.map((row) => row.proposition_id)),
    'SG-03 stable proposition identities'
  );
  equal(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  equal(governor.history_law.append_only, true, 'governor append-only law');
  equal(governor.history_law.historical_data_and_reports_rewritten, false, 'governor historical rewrite law');
  equal(governor.history_law.historical_release_manifests_recomputed, false, 'governor historical recompute law');

  equal(snapshot.k0.query_templates_total, 9, 'frozen K0 denominator');
  equal(snapshot.k0.query_templates_executed, 8, 'frozen K0 execution');
  equal(snapshot.k0.searches_executed, 44, 'frozen K0 searches');
  equal(snapshot.k0.raw_results_observed, 206, 'frozen K0 raw results');
  equal(snapshot.k0.returned_records, 57, 'frozen K0 retained records');
  equal(snapshot.k0.included_events, 0, 'frozen K0 events');
  equal(snapshot.poof.jurisdictions, 4, 'frozen POOF jurisdictions');
  equal(snapshot.poof.typed_transaction_objects, 5, 'frozen POOF objects');
  equal(snapshot.poof.routes, 9, 'frozen POOF routes');
  equal(snapshot.poof.deployed, false, 'frozen POOF deployment');
  equal(snapshot.poof.indexable, false, 'frozen POOF indexability');
  equal(snapshot.dca.query_templates_executed, 0, 'frozen DCA execution');
  equal(snapshot.dca.field_records, 0, 'frozen DCA records');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'frozen pilot boundary');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-03 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-03 boundary ${key}`);
  }

  equal(manifest.schema_version, 'project-stable-ground-sg03-release-manifest@1', 'historical SG-03 manifest schema');
  equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-03 manifest identity');
  equal(manifest.combined_sha256, '8bfe1eb4eb7acabfd67903e5a4485e781c01cd6b4f36f2423dd75d58c0ee8f06', 'historical SG-03 release digest');
  equal(report.schema_version, 'project-stable-ground-sg03-report@1', 'historical SG-03 report schema');
  equal(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-03 report identity');
  equal(report.counts.checkpoints_preserved, 3, 'historical SG-03 report history count');
  equal(report.counts.k0_executed, 8, 'historical SG-03 report K0 count');
  equal(report.counts.dca_executed, 0, 'historical SG-03 report DCA count');
  equal(report.poof_release.combined_sha256, 'af0559763bc6acb333a6b2f0d7cfd2c23afc284ed4fa59107ce3184aa5f87727', 'historical SG-03 report POOF digest');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'historical SG-03 report release digest');

  check(Array.isArray(pointer.history) && pointer.history.length >= 3, 'historical pointer is missing SG-03 lineage');
  equal(
    JSON.stringify(pointer.history.slice(0, 3).map((row) => row.checkpoint_id)),
    JSON.stringify(['SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03']),
    'historical SG-03 pointer prefix'
  );
  const historyRow = pointer.history.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  check(Boolean(historyRow), 'historical pointer row missing for SG-03');
  equal(historyRow?.path, 'data/project/project-stable-ground-sg03.json', 'historical SG-03 pointer path');
  equal(historyRow?.merge_commit, 'b305eb935864b8adef320e8db5ff471d2a778403', 'historical SG-03 merge receipt');
  equal(historyRow?.trigger_commit, checkpoint.trigger.merge_commit, 'historical SG-03 trigger receipt');
  equal(historyRow?.status, 'superseded_preserved', 'historical SG-03 pointer status');
  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-03 remains current after declared successor');

  if (historyRow) {
    for (const error of historicalVerifier(historyRow)) errors.push(error);
  }
  return errors;
}

function main() {
  const errors = validateSg03();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg03: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg03: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
