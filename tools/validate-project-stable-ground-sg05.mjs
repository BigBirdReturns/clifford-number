#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg05Manifest } from './build-project-stable-ground-sg05.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const zero40 = '0'.repeat(40);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

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
  errors.push(...ensureCommit(base, 'SG-05 transition base'));
  errors.push(...ensureCommit(transition, 'SG-05 transition commit'));
  if (errors.length) return errors;

  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) {
  // Shallow transports can hide reachability even though the immutable
  // transition object names the declared base as its direct parent.
  const rawCommit = spawnSync('git', ['cat-file', '-p', transition], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  const parents = rawCommit.status === 0
    ? rawCommit.stdout.split('\n').filter((line) => line.startsWith('parent ')).map((line) => line.slice(7).trim())
    : [];
  if (!parents.includes(base)) errors.push('SG-05 transition commit is not descended from its declared base');
}

  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) {
    errors.push('SG-05 transition path denominator cannot be recovered');
  } else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-05 transition path denominator drift: ${JSON.stringify(observed)}`);
    const digest = sha256(`${declared.join('\n')}\n`);
    if (digest !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-05 transition path digest drift');
  }

  const showJson = (rel, label) => {
    const result = spawnSync('git', ['show', `${transition}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0) { errors.push(`SG-05 transition cannot recover ${label}`); return null; }
    try { return JSON.parse(result.stdout); } catch { errors.push(`SG-05 transition ${label} is not valid JSON`); return null; }
  };
  const hypothesis = showJson('data/project/status-sovereignty-compact.json', 'SSC-H01 source object');
  const fanout = showJson('data/project/status-sovereignty-fanout.json', 'SSC-H01 fanout object');
  const sources = showJson('data/project/status-sovereignty-source-registry.json', 'SSC-H01 source registry');
  const release = showJson('data/project/status-sovereignty-release-manifest.json', 'SSC-H01 release manifest');
  if (hypothesis) {
    if (hypothesis.hypothesis_id !== 'SSC-H01' || hypothesis.four_gate_discriminator?.length !== 4 ||
        hypothesis.dimensions?.length !== 10 || hypothesis.current_state?.query_or_field_execution_started !== false ||
        hypothesis.current_state?.observations_retained !== 0 || hypothesis.current_state?.racial_order_finding_generated !== false ||
        hypothesis.boundaries?.graph_effect !== 'none') errors.push('SG-05 transition SSC-H01 source object drift');
    if (hypothesis.source_basis?.sha256 !== checkpoint.trigger.source_sha256) errors.push('SG-05 transition source digest drift');
  }
  if (fanout && (fanout.lanes?.length !== 16 || fanout.issue_groups?.length !== 8 ||
      fanout.lanes.some((row) => row.execution?.started || row.execution?.records_observed || row.execution?.records_retained || row.graph_effect !== 'none'))) {
    errors.push('SG-05 transition SSC-H01 fanout drift');
  }
  if (sources && (sources.counts?.independently_retrieved_external_references !== 0 || sources.boundaries?.source_document_is_canonical_evidence !== false)) {
    errors.push('SG-05 transition SSC-H01 source custody drift');
  }
  if (release && release.combined_sha256 !== checkpoint.trigger.status_release_sha256) errors.push('SG-05 transition SSC-H01 release digest drift');
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

export function loadSg05Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg05.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg04: read('data/project/project-stable-ground-sg04.json'),
    status: read('data/project/status-sovereignty-compact.json'),
    fanout: read('data/project/status-sovereignty-fanout.json'),
    sources: read('data/project/status-sovereignty-source-registry.json'),
    statusRelease: read('data/project/status-sovereignty-release-manifest.json'),
    core: read('data/project/core-thesis.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    denominator: read('data/project/dca-h01-role-neutral-denominator.json'),
    dca: read('data/project/dca-h01-field-hypothesis.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    m05Fanout: read('data/project/m05-answerable-power-fanout.json'),
    organism: read('data/project/security-state-organism-program.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    manifest: read('data/project/project-stable-ground-sg05-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg05/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg05(context = loadSg05Context()) {
  const errors = [];
  const equal = (actual, expected, message) => { if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const {
    checkpoint, pointer, governor, sg04, status, fanout, sources, statusRelease, core, k0,
    denominator, dca, stories, m05Fanout, organism, poofAperture, poofRelease, sprint09,
    manifest, report, transitionVerifier, historicalVerifier
  } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-05 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-30-05', 'SG-05 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-05 governor');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-04', 'SG-05 predecessor');
  equal(checkpoint.supersedes.source_path, 'data/project/project-stable-ground-sg04.json', 'SG-05 predecessor path');
  equal(checkpoint.supersedes.merge_commit, '8c5e592034effe30d644319e085f97e045060269', 'SG-04 final custody receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-04 preservation');
  equal(sg04.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-04 source identity');
  equal(checkpoint.preserved_history.length, 4, 'SG-05 preserved-history count');
  equal(JSON.stringify(checkpoint.preserved_history.map((row) => row.checkpoint_id)), JSON.stringify([
    'SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04'
  ]), 'SG-05 preserved-history order');
  check(checkpoint.preserved_history.every((row) => row.status === 'superseded_preserved'), 'SG-05 predecessor status drift');

  equal(checkpoint.trigger.type, 'canonical_status_for_sovereignty_field_hypothesis', 'SG-05 trigger type');
  equal(checkpoint.trigger.issue, 468, 'SG-05 trigger issue');
  equal(JSON.stringify(checkpoint.trigger.fanout_issues), JSON.stringify([469,470,471,472,473,474,475,476]), 'SG-05 fanout issues');
  equal(checkpoint.trigger.pull_request, 467, 'SG-05 trigger PR');
  check(hex40.test(checkpoint.trigger.transition_commit) && checkpoint.trigger.transition_commit !== zero40, 'SG-05 transition receipt is not materialized');
  equal(checkpoint.trigger.transition_base, 'c8415a769d03add67a92a3019794268bf5d1cb84', 'SG-05 transition base');
  check(Array.isArray(checkpoint.trigger.transition_paths) && checkpoint.trigger.transition_paths.length > 0, 'SG-05 transition path denominator missing');
  equal(checkpoint.trigger.transition_paths_sha256, sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), 'SG-05 transition path digest');
  equal(checkpoint.trigger.source_path, 'data/intake/status-sovereignty-compact-source.md', 'SG-05 source path');
  equal(checkpoint.trigger.source_sha256, '6cddd17c6526afc8f9407beb7b7888b5c8d0c05ecb14c8b4bc8dd4ae8d4a9011', 'SG-05 source digest');
  check(hex64.test(checkpoint.trigger.status_release_sha256), 'SG-05 status release digest format');
  equal(checkpoint.canonical_main.commit, checkpoint.trigger.transition_commit, 'SG-05 canonical transition');
  equal(checkpoint.canonical_main.repository, 'BigBirdReturns/clifford-number', 'SG-05 repository');
  equal(checkpoint.authority_change.release_sha256, checkpoint.trigger.status_release_sha256, 'SG-05 authority release digest');
  equal(checkpoint.authority_change.graph_effect, 'none', 'SG-05 authority graph effect');
  equal(checkpoint.authority_change.publication_effect, 'none', 'SG-05 authority publication effect');
  equal(checkpoint.authority_change.field_effect, 'none', 'SG-05 authority field effect');
  equal(checkpoint.authority_change.adoption_effect, 'none', 'SG-05 authority adoption effect');

  equal(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  equal(governor.history_law.append_only, true, 'governor append-only law');
  equal(governor.history_law.checkpoint_ids_unique, true, 'governor unique-ID law');
  equal(governor.history_law.history_order_oldest_to_newest, true, 'governor history-order law');
  equal(governor.history_law.one_current_checkpoint, true, 'governor current-checkpoint law');
  equal(governor.history_law.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  equal(governor.history_law.historical_release_manifests_recomputed, false, 'governor no-recompute law');
  check(governor.trigger_classes.some((row) => row.includes('status-for-sovereignty')), 'governor missing SSC trigger class');

  const expectedHistory = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05'];
  equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  equal(JSON.stringify(pointer.history.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'pointer history order');
  equal(new Set(pointer.history.map((row) => row.checkpoint_id)).size, pointer.history.length, 'pointer checkpoint uniqueness');
  equal(pointer.history.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg05.json', 'pointer current path');
  equal(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');

  equal(snapshot.status_sovereignty.hypothesis_id, 'SSC-H01', 'frozen SSC identity');
  equal(snapshot.status_sovereignty.authority_tier, 'AT-2', 'frozen SSC authority tier');
  equal(snapshot.status_sovereignty.gates, 4, 'frozen SSC gate count');
  equal(snapshot.status_sovereignty.dimensions, 10, 'frozen SSC dimension count');
  equal(snapshot.status_sovereignty.causal_stages, 12, 'frozen SSC causal-stage count');
  equal(snapshot.status_sovereignty.fanout_lanes, 16, 'frozen SSC lane count');
  equal(snapshot.status_sovereignty.issue_groups, 8, 'frozen SSC issue-group count');
  equal(snapshot.status_sovereignty.external_references, 8, 'frozen SSC external-reference count');
  equal(snapshot.status_sovereignty.repository_sources, 7, 'frozen SSC repository-source count');
  equal(snapshot.status_sovereignty.source_sha256, checkpoint.trigger.source_sha256, 'frozen SSC source digest');
  equal(snapshot.status_sovereignty.release_sha256, checkpoint.trigger.status_release_sha256, 'frozen SSC release digest');
  equal(snapshot.status_sovereignty.query_or_field_execution_started, false, 'frozen SSC execution');
  equal(snapshot.status_sovereignty.records_observed, 0, 'frozen SSC observed count');
  equal(snapshot.status_sovereignty.records_retained, 0, 'frozen SSC retained count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) {
    equal(snapshot.status_sovereignty[key], false, `frozen SSC ${key}`);
  }
  equal(snapshot.status_sovereignty.graph_effect, 'none', 'frozen SSC graph effect');
  equal(snapshot.k0.query_templates_executed, 9, 'frozen K0 execution');
  equal(snapshot.k0.returned_records, 65, 'frozen K0 retained count');
  equal(snapshot.k0.candidate_records, 28, 'frozen K0 candidate count');
  equal(snapshot.k0.included_events, 0, 'frozen K0 event count');
  equal(snapshot.dca.query_templates_executed, 0, 'frozen DCA execution');
  equal(snapshot.dca.field_records, 0, 'frozen DCA records');
  equal(snapshot.poof.deployed, false, 'frozen POOF deployment');
  equal(snapshot.poof.indexable, false, 'frozen POOF indexability');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'frozen pilot boundary');
  equal(snapshot.core_thesis.field_hypothesis_bridges, 2, 'frozen field hypothesis count');
  equal(snapshot.core_thesis.report_contracts, 9, 'frozen report contract count');
  equal(snapshot.m05_story_ecology.stories, 15, 'frozen M-05 story count');
  equal(snapshot.m05_story_ecology.research_lanes, 18, 'frozen M-05 lane count');

  equal(checkpoint.fanout_state.owner_lanes.length, 7, 'SG-05 owner-lane count');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07')?.state, 'canonical_hypothesis_zero_execution', 'FAN-07 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07')?.receipt, checkpoint.trigger.transition_commit, 'FAN-07 receipt');
  equal(checkpoint.fanout_state.ssc_issue_groups.length, 8, 'SSC issue-group fanout count');
  equal(checkpoint.fanout_state.ssc_lanes.length, 16, 'SSC lane fanout count');
  check(checkpoint.fanout_state.ssc_lanes.every((row) => row.state === 'open_zero_execution'), 'SSC stable-ground lane execution drift');
  equal(checkpoint.build_order.find((row) => row.order === 2)?.receipt, checkpoint.trigger.transition_commit, 'SG-05 build-order receipt');
  equal(checkpoint.build_order.find((row) => row.order === 3)?.state, 'open_zero_of_sixteen', 'SG-05 execution build state');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-05 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-05 boundary ${key}`);
  }

  const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
  if (isCurrent) {
    for (const error of transitionVerifier(checkpoint)) errors.push(error);
    equal(status.hypothesis_id, 'SSC-H01', 'live SSC identity');
    equal(status.status, snapshot.status_sovereignty.status, 'live SSC status');
    equal(status.four_gate_discriminator.length, snapshot.status_sovereignty.gates, 'live SSC gate count');
    equal(status.dimensions.length, snapshot.status_sovereignty.dimensions, 'live SSC dimension count');
    equal(status.causal_sequence.length, snapshot.status_sovereignty.causal_stages, 'live SSC causal-stage count');
    equal(status.current_state.query_or_field_execution_started, false, 'live SSC execution state');
    equal(status.current_state.observations_retained, 0, 'live SSC retained count');
    equal(status.current_state.racial_order_finding_generated, false, 'live SSC racial_order_finding_generated');
    equal(status.current_state.common_purpose_finding_generated, false, 'live SSC common_purpose_finding_generated');
    equal(status.boundaries.patriotism_is_white_power, false, 'live patriotism boundary');
    equal(status.boundaries.multiracial_presence_proves_neutrality, false, 'live neutrality boundary');
    equal(status.boundaries.multiracial_presence_proves_tokenism, false, 'live tokenism boundary');
    check(fanout.lanes.length === 16 && fanout.lanes.every((row) => !row.execution.started && row.execution.records_observed === 0 && row.execution.records_retained === 0 && row.graph_effect === 'none'), 'live SSC lane execution or graph drift');
    equal(sources.counts.independently_retrieved_external_references, 0, 'live SSC retrieval state');
    equal(statusRelease.combined_sha256, snapshot.status_sovereignty.release_sha256, 'live SSC release digest');
    equal(core.field_hypothesis_bridges.length, snapshot.core_thesis.field_hypothesis_bridges, 'live field hypothesis count');
    equal(core.field_hypothesis_bridges.find((row) => row.hypothesis_id === 'SSC-H01')?.graph_effect, 'none', 'live SSC core bridge graph effect');
    equal(k0.execution.included_events, 0, 'live K0 event count');
    equal(k0.execution.returned_records, 65, 'live K0 retained count');
    equal(denominator.execution.query_templates_executed, 0, 'live DCA execution');
    equal(denominator.execution.records_retained, 0, 'live DCA record count');
    equal(dca.current_state.prevalence_finding_generated, false, 'live DCA prevalence state');
    equal(stories.counts.stories, 15, 'live M-05 story count');
    equal(m05Fanout.counts.lanes, 18, 'live M-05 lane count');
    equal(organism.status_for_sovereignty_bridge.hypothesis_id, 'SSC-H01', 'live organism SSC bridge');
    equal(poofAperture.publication.deployed, false, 'live POOF deployment');
    equal(poofAperture.publication.indexable, false, 'live POOF indexability');
    equal(sprint09.current_result.maximum_verified_adoption_level, 'A0', 'live adoption');
    equal(sprint09.current_result.real_person_pilot_authorized, false, 'live pilot state');
    check(hex64.test(poofRelease.combined_sha256), 'live POOF release digest format');

    equal(manifest.schema_version, 'project-stable-ground-sg05-release-manifest@1', 'SG-05 manifest schema');
    equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-05 manifest identity');
    equal(JSON.stringify(manifest), JSON.stringify(computeSg05Manifest()), 'current SG-05 exact-byte manifest');
    equal(report.schema_version, 'project-stable-ground-sg05-report@1', 'SG-05 report schema');
    equal(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-05 report identity');
    equal(report.canonical_main.commit, checkpoint.trigger.transition_commit, 'SG-05 report transition');
    equal(report.counts.checkpoints_preserved, 5, 'SG-05 report history count');
    equal(report.counts.ssc_gates, 4, 'SG-05 report gate count');
    equal(report.counts.ssc_dimensions, 10, 'SG-05 report dimension count');
    equal(report.counts.ssc_lanes, 16, 'SG-05 report lane count');
    equal(report.counts.ssc_executed_lanes, 0, 'SG-05 report execution count');
    equal(report.counts.ssc_retained_records, 0, 'SG-05 report retained count');
    equal(report.status_release.combined_sha256, statusRelease.combined_sha256, 'SG-05 report SSC digest');
    equal(report.poof_release.combined_sha256, poofRelease.combined_sha256, 'SG-05 report POOF digest');
    equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'SG-05 report release digest');
  } else {
    const row = pointer.history.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
    check(Boolean(row), 'historical pointer row missing for SG-05');
    equal(row?.path, 'data/project/project-stable-ground-sg05.json', 'historical SG-05 pointer path');
    equal(row?.status, 'superseded_preserved', 'historical SG-05 pointer status');
    if (row) for (const error of historicalVerifier(row)) errors.push(error);
  }
  return errors;
}

function main() {
  const errors = validateSg05();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg05: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg05: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
