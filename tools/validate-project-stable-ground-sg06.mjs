#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePublicationPlan } from './lib/publication-manifest.mjs';
import { computeSg06Manifest } from './build-project-stable-ground-sg06.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const zero40 = '0'.repeat(40);

function ensureCommit(sha, label) {
  if (!hex40.test(sha || '') || sha === zero40) return [`${label} is not a materialized full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${fetched.stderr || fetched.stdout}`];
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
  if (ancestry.status !== 0) errors.push('SG-06 transition commit is not descended from its declared base');
  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) errors.push('SG-06 transition path denominator cannot be recovered');
  else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-06 transition path denominator drift: ${JSON.stringify(observed)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-06 transition path digest drift');
  }
  const show = (rel) => spawnSync('git', ['show', `${transition}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const planResult = show('data/project/publication-plan.json');
  if (planResult.status !== 0) errors.push('SG-06 transition cannot recover publication plan');
  else {
    try {
      const plan = JSON.parse(planResult.stdout);
      if (plan.default_decision !== 'exclude' || plan.status !== 'active_status_aware_positive_allowlist' || plan.boundaries?.graph_effect !== 'none') errors.push('SG-06 transition publication plan drift');
      const held = new Set((plan.held_surfaces || []).map((row) => row.path.replace(/\/$/, '')));
      for (const required of ['graph.json','legacy','reports/core-thesis/poof-clifford-ecology','build/core-thesis/status-sovereignty','reports/core-thesis/status-sovereignty']) {
        if (!held.has(required)) errors.push(`SG-06 transition missing held surface ${required}`);
      }
    } catch { errors.push('SG-06 transition publication plan is not valid JSON'); }
  }
  const runtimeChecks = [
    ['app.js', ["loadJson('graph.json')", 'researchNetworkModel']],
    ['src/visual-aperture-part-11.js', ["readData('graph.json')", 'state.legacyGraph =']],
    ['src/visual-aperture-part-2.js', ['legacyGraph.nodes']]
  ];
  for (const [rel, forbidden] of runtimeChecks) {
    const result = show(rel);
    if (result.status !== 0) errors.push(`SG-06 transition cannot recover public runtime ${rel}`);
    else if (forbidden.some((token) => result.stdout.includes(token))) errors.push(`SG-06 transition retains generic graph runtime in ${rel}`);
  }
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) return ['historical SG-05 merge receipt is not a full commit SHA'];
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-05 merge receipt'));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg05.json',
    'data/project/project-stable-ground-sg05-release-manifest.json',
    'reports/core-thesis/stable-ground/sg05/checkpoint.json',
    'reports/core-thesis/stable-ground/sg05/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 32 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-05 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-05 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

function currentPublicationManifest() {
  return read('dist/publication-manifest.json');
}

export function loadSg06Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg06.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg05: read('data/project/project-stable-ground-sg05.json'),
    publicationPlan: read('data/project/publication-plan.json'),
    publicationManifest: currentPublicationManifest(),
    poofLog: read('data/project/poof-clifford-constitutional-change-log.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofContract: read('data/project/poof-clifford-ecology-contract.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    status: read('data/project/status-sovereignty-compact.json'),
    statusRelease: read('data/project/status-sovereignty-release-manifest.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    denominator: read('data/project/dca-h01-role-neutral-denominator.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    manifest: read('data/project/project-stable-ground-sg06-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg06/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg06(context = loadSg06Context()) {
  const errors = [];
  const equal = (actual, expected, message) => { if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const { checkpoint, pointer, governor, sg05, publicationPlan, publicationManifest, poofLog, poofAperture, poofContract, poofRelease, status, statusRelease, k0, denominator, sprint09, manifest, report, transitionVerifier, historicalVerifier } = context;
  const snapshot = checkpoint.canonical_snapshot;
  const publication = snapshot.publication_safety;
  const expectedHistory = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05','SG-2026-07-30-06'];

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-06 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-30-06', 'SG-06 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-06 governor');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-30-05', 'SG-06 predecessor');
  equal(checkpoint.supersedes.source_path, 'data/project/project-stable-ground-sg05.json', 'SG-06 predecessor path');
  equal(checkpoint.supersedes.merge_commit, 'cada5ce40087305196a53a9ecc32a707cff28e52', 'SG-05 final custody receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-05 preservation');
  equal(sg05.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-05 source identity');
  equal(checkpoint.preserved_history.length, 5, 'SG-06 preserved-history count');
  equal(JSON.stringify(checkpoint.preserved_history.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory.slice(0,5)), 'SG-06 preserved-history order');
  check(checkpoint.preserved_history.every((row) => row.status === 'superseded_preserved'), 'SG-06 predecessor status drift');

  equal(checkpoint.trigger.type, 'canonical_status_aware_publication_safety', 'SG-06 trigger type');
  equal(checkpoint.trigger.issue, 463, 'SG-06 trigger issue');
  equal(checkpoint.trigger.pull_request, 484, 'SG-06 trigger PR');
  check(hex40.test(checkpoint.trigger.transition_base), 'SG-06 transition base format');
  check(hex40.test(checkpoint.trigger.transition_commit), 'SG-06 transition commit format');
  check(checkpoint.trigger.transition_paths.length === 29, 'SG-06 transition path denominator missing');
  check(['src/visual-aperture-part-11.js','src/visual-aperture-part-2.js'].every((rel) => checkpoint.trigger.transition_paths.includes(rel)), 'SG-06 transition missing secondary runtime retirement');
  equal(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-06 transition path digest');
  equal(checkpoint.canonical_main.commit, checkpoint.trigger.transition_commit, 'SG-06 canonical main receipt');
  equal(checkpoint.authority_change.publication_manifest_sha256, checkpoint.trigger.publication_manifest_sha256, 'SG-06 authority publication digest');

  equal(governor.history_law.append_only, true, 'governor append-only law');
  equal(governor.history_law.historical_data_and_reports_rewritten, false, 'governor historical rewrite law');
  check(governor.trigger_classes.some((row) => row.includes('status-aware publication')), 'governor missing publication trigger class');
  equal(checkpoint.lifecycle_repair.SG04.state, 'successor_aware_immutable_history_validation_installed_by_SG06', 'SG-04 successor-aware lifecycle state');
  equal(checkpoint.lifecycle_repair.SG04.merge_commit, '8c5e592034effe30d644319e085f97e045060269', 'SG-04 lifecycle receipt');
  equal(checkpoint.lifecycle_repair.SG05.state, 'successor_aware_immutable_history_validation_installed_by_SG06', 'SG-05 successor-aware lifecycle state');
  equal(checkpoint.lifecycle_repair.SG05.merge_commit, 'cada5ce40087305196a53a9ecc32a707cff28e52', 'SG-05 lifecycle receipt');
  equal(checkpoint.lifecycle_repair.SG06.state, 'successor_aware_from_initial_release', 'SG-06 lifecycle state');
  equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  equal(JSON.stringify(pointer.history.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'pointer history order');
  equal(new Set(pointer.history.map((row) => row.checkpoint_id)).size, pointer.history.length, 'pointer checkpoint uniqueness');
  equal(pointer.history.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  equal(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'pointer current checkpoint');
  equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg06.json', 'pointer current path');
  equal(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');
  equal(pointer.history.find((row) => row.checkpoint_id === 'SG-2026-07-30-05')?.status, 'superseded_preserved', 'historical SG-05 pointer status');
  equal(pointer.history.find((row) => row.checkpoint_id === 'SG-2026-07-30-05')?.merge_commit, checkpoint.supersedes.merge_commit, 'historical SG-05 pointer receipt');

  const planValidation = validatePublicationPlan(publicationPlan, { root });
  check(planValidation.ok, `live publication plan invalid: ${planValidation.failures.join('; ')}`);
  equal(publicationPlan.default_decision, 'exclude', 'live publication default decision');
  equal(publicationPlan.entries.length, 100, 'live publication entry count');
  equal(publicationPlan.allowed_dependency_prefixes.length, 20, 'live publication dependency count');
  equal(publicationPlan.generated_outputs.length, 4, 'live publication generated-output count');
  equal(publicationPlan.held_surfaces.length, 11, 'live publication held-surface count');
  equal(publicationManifest.combined_sha256, publication.manifest_sha256, 'live publication manifest digest');
  equal(publicationManifest.counts.files, publication.manifest_files, 'live publication file count');
  equal(publicationManifest.counts.source_files, publication.source_files, 'live publication source-file count');
  equal(publicationManifest.counts.normalized_source_files, publication.normalized_source_files, 'live normalized projection count');
  equal(publicationManifest.counts.held_surfaces, publication.held_surfaces, 'live held-surface count');
  equal(publication.recursive_repository_copy, false, 'frozen recursive copy boundary');
  equal(publication.unclassified_dependency_allowed, false, 'frozen unclassified dependency boundary');
  equal(publication.generic_graph_public_route, false, 'frozen graph route boundary');
  equal(publication.legacy_public_route, false, 'frozen legacy route boundary');
  equal(publication.poof_github_pages_deployed, false, 'frozen POOF Pages deployment');
  equal(publication.ssc_publication_status, 'blocked', 'frozen SSC publication state');
  equal(publication.graph_effect, 'none', 'frozen publication graph effect');

  equal(poofLog.changes.length, 6, 'live POOF receipt count');
  equal(poofLog.changes.at(-1)?.change_id, 'POOF-CONST-2026-07-29-006', 'live POOF last receipt');
  equal(poofContract.publication_state.current_state, 'staged_nonpublic_generated_aperture', 'live POOF publication status');
  equal(poofAperture.publication.deployed, false, 'live POOF deployment');
  equal(poofAperture.publication.indexable, false, 'live POOF indexability');
  equal(poofRelease.combined_sha256, snapshot.poof.release_sha256, 'live POOF release digest');
  equal(status.current_state.query_or_field_execution_started, false, 'live SSC execution state');
  equal(status.current_state.observations_retained, 0, 'live SSC retained count');
  equal(statusRelease.combined_sha256, snapshot.status_sovereignty.release_sha256, 'live SSC release digest');
  equal(k0.execution.query_templates_executed, 9, 'live K0 execution');
  equal(k0.execution.returned_records, 65, 'live K0 retained count');
  equal(k0.execution.included_events, 0, 'live K0 event count');
  equal(denominator.execution.query_templates_executed, 0, 'live DCA execution');
  equal(denominator.execution.records_retained, 0, 'live DCA record count');
  equal(sprint09.current_result.maximum_verified_adoption_level, 'A0', 'live adoption');
  equal(sprint09.current_result.real_person_pilot_authorized, false, 'live pilot state');

  equal(checkpoint.fanout_state.owner_lanes.length, 7, 'SG-06 owner-lane count');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-04')?.state, 'complete_canonical_default_exclude', 'FAN-04 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-04')?.receipt, checkpoint.trigger.transition_commit, 'FAN-04 receipt');
  equal(checkpoint.build_order.find((row) => row.order === 2)?.receipt, checkpoint.trigger.transition_commit, 'SG-06 build-order receipt');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-06 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-06 boundary ${key}`);
  }

  for (const error of transitionVerifier(checkpoint)) errors.push(error);
  const historyRow = pointer.history.find((row) => row.checkpoint_id === 'SG-2026-07-30-05');
  for (const error of historicalVerifier(historyRow)) errors.push(error);

  equal(manifest.schema_version, 'project-stable-ground-sg06-release-manifest@1', 'SG-06 manifest schema');
  equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-06 manifest identity');
  equal(JSON.stringify(manifest), JSON.stringify(computeSg06Manifest()), 'current SG-06 exact-byte manifest');
  equal(report.schema_version, 'project-stable-ground-sg06-report@1', 'SG-06 report schema');
  equal(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-06 report identity');
  equal(report.canonical_main.commit, checkpoint.trigger.transition_commit, 'SG-06 report transition');
  equal(report.counts.checkpoints_preserved, 6, 'SG-06 report history count');
  equal(report.counts.publication_entries, 100, 'SG-06 report publication entry count');
  equal(report.counts.publication_files, 118, 'SG-06 report publication file count');
  equal(report.counts.held_surfaces, 11, 'SG-06 report held count');
  equal(report.publication_manifest.combined_sha256, publication.manifest_sha256, 'SG-06 report publication digest');
  equal(report.poof_release.combined_sha256, poofRelease.combined_sha256, 'SG-06 report POOF digest');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'SG-06 report release digest');
  check(hex64.test(manifest.combined_sha256), 'SG-06 release digest format');
  return errors;
}

function main() {
  const errors = validateSg06();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg06: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg06: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
