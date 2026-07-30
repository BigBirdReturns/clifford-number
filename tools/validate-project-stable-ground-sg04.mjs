#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg04Manifest } from './build-project-stable-ground-sg04.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const transitionCommit = 'e9b85b31281db02ce3f9a9a84dd7aea34b714849';
const transitionBase = 'c788888417110e4dcdfbcc0697b03687c0bd6938';
const transitionPaths = [
  '.github/workflows/k0-role-neutral-wave-08.yml',
  'data/project/k0-epistemic-admissibility-methodology.json',
  'data/project/k0-epistemic-admissibility-release-manifest.json',
  'data/project/k0-role-neutral-wave-08-release-manifest.json',
  'data/research/corpus-coverage.json',
  'data/research/k0-role-neutral-denominator.json',
  'data/research/k0-role-neutral-wave-08.json',
  'data/research/selection-adversarial-reviews.json',
  'docs/milestones/m05-k0-role-neutral-wave-08.md',
  'reports/core-thesis/answerable-power/k0-role-neutral-wave-08.html',
  'reports/core-thesis/answerable-power/k0-role-neutral-wave-08.json',
  'reports/core-thesis/answerable-power/k0.html',
  'reports/core-thesis/answerable-power/k0.json',
  'test/k0-epistemic-admissibility.test.js',
  'test/k0-role-neutral-wave-08.test.js',
  'tools/build-k0-epistemic-admissibility.mjs',
  'tools/build-k0-role-neutral-wave-08.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-role-neutral-wave-08.mjs'
].sort();

function ensureCommit(sha, label) {
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', sha], {
    cwd: root,
    encoding: 'utf8'
  });
  if (fetched.status !== 0) {
    return [`${label} cannot be acquired: ${fetched.stderr || fetched.stdout}`];
  }
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function defaultTransitionVerifier() {
  const errors = [
    ...ensureCommit(transitionCommit, 'K0 transition commit'),
    ...ensureCommit(transitionBase, 'K0 transition base')
  ];
  if (errors.length) return errors;

  const changed = spawnSync('git', ['diff', '--name-only', transitionBase, transitionCommit], {
    cwd: root,
    encoding: 'utf8'
  });
  if (changed.status !== 0) {
    errors.push('K0 transition path denominator cannot be recovered');
  } else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    if (JSON.stringify(observed) !== JSON.stringify(transitionPaths)) {
      errors.push(`K0 transition path denominator drift: ${JSON.stringify(observed)}`);
    }
  }

  const wave = spawnSync('git', ['show', `${transitionCommit}:data/research/k0-role-neutral-wave-08.json`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  if (wave.status !== 0) {
    errors.push('K0 transition cannot recover Wave 08 source object');
  } else {
    try {
      const parsed = JSON.parse(wave.stdout);
      if (parsed.wave_id !== 'K0-W08' || parsed.counts?.retained_records !== 9 ||
          parsed.counts?.candidate_requires_field_audit !== 4 || parsed.counts?.included_events !== 0) {
        errors.push('K0 transition Wave 08 source object drift');
      }
    } catch {
      errors.push('K0 transition Wave 08 source object is not valid JSON');
    }
  }
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) {
    return ['historical SG-04 merge receipt is not a full commit SHA'];
  }
  errors.push(...ensureCommit(row.merge_commit, 'historical SG-04 merge receipt'));
  if (errors.length) return errors;
  const paths = [
    'data/project/project-stable-ground-sg04.json',
    'data/project/project-stable-ground-sg04-release-manifest.json',
    'reports/core-thesis/stable-ground/sg04/checkpoint.json',
    'reports/core-thesis/stable-ground/sg04/index.html'
  ];
  for (const rel of paths) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024
    });
    if (committed.status !== 0) {
      errors.push(`historical SG-04 merge receipt cannot recover ${rel}`);
      continue;
    }
    if (!committed.stdout.equals(readBytes(rel))) {
      errors.push(`historical SG-04 bytes drifted from merge receipt: ${rel}`);
    }
  }
  return errors;
}

export function loadSg04Context({
  transitionVerifier = defaultTransitionVerifier,
  historicalVerifier = defaultHistoricalVerifier
} = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg04.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg01: read('data/project/project-stable-ground-alignment.json'),
    sg02: read('data/project/project-stable-ground-sg02.json'),
    sg03: read('data/project/project-stable-ground-sg03.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    wave08: read('data/research/k0-role-neutral-wave-08.json'),
    k0Release: read('data/project/k0-epistemic-admissibility-release-manifest.json'),
    waveRelease: read('data/project/k0-role-neutral-wave-08-release-manifest.json'),
    coreThesis: read('data/project/core-thesis.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    fanout: read('data/project/m05-answerable-power-fanout.json'),
    poofContract: read('data/project/poof-clifford-ecology-contract.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofObjects: read('data/project/poof-clifford-object-registry.json'),
    poofChanges: read('data/project/poof-clifford-constitutional-change-log.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    dca: read('data/project/dca-h01-field-hypothesis.json'),
    denominator: read('data/project/dca-h01-role-neutral-denominator.json'),
    sprint08: read('data/project/m05-answerable-power-sprint-08-plan.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    fieldGate: read('data/project/m05-answerable-power-sprint-09-field-gate.json'),
    manifest: read('data/project/project-stable-ground-sg04-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg04/checkpoint.json'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg04(context = loadSg04Context()) {
  const errors = [];
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const {
    checkpoint, pointer, governor, sg01, sg02, sg03, k0, wave08, k0Release, waveRelease,
    coreThesis, stories, fanout, poofContract, poofAperture, poofObjects, poofChanges,
    poofRelease, dca, denominator, sprint08, sprint09, fieldGate, manifest, report,
    transitionVerifier, historicalVerifier
  } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-04 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-29-04', 'SG-04 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-04 governor');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-03', 'SG-04 predecessor');
  equal(checkpoint.supersedes.source_path, 'data/project/project-stable-ground-sg03.json', 'SG-04 predecessor path');
  equal(checkpoint.supersedes.merge_commit, 'b305eb935864b8adef320e8db5ff471d2a778403', 'SG-03 merge receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-03 preservation');
  equal(sg03.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-03 source identity');
  equal(sg02.checkpoint_id, 'SG-2026-07-29-02', 'SG-02 source identity');
  equal(sg01.checkpoint_id, 'SG-2026-07-29-01', 'SG-01 source identity');
  equal(checkpoint.preserved_history.length, 3, 'SG-04 preserved-history count');
  equal(
    JSON.stringify(checkpoint.preserved_history.map((row) => row.checkpoint_id)),
    JSON.stringify(['SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03']),
    'SG-04 preserved-history order'
  );
  check(checkpoint.preserved_history.every((row) => row.status === 'superseded_preserved'), 'SG-04 predecessor status drift');

  equal(checkpoint.trigger.type, 'canonical_K0_query_battery_completion', 'SG-04 trigger type');
  equal(checkpoint.trigger.issue, 446, 'SG-04 trigger issue');
  equal(checkpoint.trigger.fanout_issue, 419, 'SG-04 fan-out issue');
  equal(checkpoint.trigger.pull_request, 405, 'SG-04 trigger PR');
  equal(checkpoint.trigger.transition_commit, transitionCommit, 'SG-04 K0 transition receipt');
  equal(checkpoint.trigger.wave_id, 'K0-W08', 'SG-04 wave identity');
  equal(checkpoint.trigger.query_id, 'K0-Q02', 'SG-04 query identity');
  equal(checkpoint.trigger.source_wave_release_sha256, '05ed2e35fcee292b9710d32a0656cd9ad70c917f1b56119d15f48bf52846b7ff', 'source Wave 08 digest');
  equal(checkpoint.trigger.source_aggregate_release_sha256, 'a5d2c4c75c85780069dea51aa05c7e99db2d3b051e8fd0d5e02ba96008ab90c1', 'source aggregate K0 digest');
  equal(checkpoint.canonical_main.commit, transitionCommit, 'SG-04 canonical transition');
  equal(checkpoint.canonical_main.repository, 'BigBirdReturns/clifford-number', 'SG-04 repository');
  equal(checkpoint.canonical_main.branch, 'main', 'SG-04 branch');

  equal(checkpoint.preserved_stable_propositions.length, 9, 'preserved stable-proposition count');
  equal(
    JSON.stringify(checkpoint.preserved_stable_propositions),
    JSON.stringify(sg01.stable_propositions.map((row) => row.proposition_id)),
    'preserved stable-proposition identities'
  );

  equal(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  equal(governor.history_law.append_only, true, 'governor append-only law');
  equal(governor.history_law.checkpoint_ids_unique, true, 'governor unique-ID law');
  equal(governor.history_law.history_order_oldest_to_newest, true, 'governor history-order law');
  equal(governor.history_law.one_current_checkpoint, true, 'governor current-checkpoint law');
  equal(governor.history_law.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  equal(governor.history_law.historical_release_manifests_recomputed, false, 'governor no-recompute law');
  equal(governor.authority_law.issue_or_pr_opening_is_execution, false, 'governor issue-execution law');
  equal(governor.authority_law.same_mechanism_is_coordination, false, 'governor coordination law');

  equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  equal(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'current checkpoint identity');
  equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg04.json', 'current checkpoint path');
  equal(pointer.current_canonical_main_commit, transitionCommit, 'current canonical transition');
  equal(pointer.history.length, 4, 'pointer history count');
  equal(
    JSON.stringify(pointer.history.map((row) => row.checkpoint_id)),
    JSON.stringify(['SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03', 'SG-2026-07-29-04']),
    'pointer history order'
  );
  equal(new Set(pointer.history.map((row) => row.checkpoint_id)).size, 4, 'pointer checkpoint uniqueness');
  equal(pointer.history.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  equal(pointer.history[2].merge_commit, 'b305eb935864b8adef320e8db5ff471d2a778403', 'pointer SG-03 merge receipt');
  equal(pointer.history[2].status, 'superseded_preserved', 'pointer SG-03 state');
  equal(pointer.history[3].trigger_commit, transitionCommit, 'pointer SG-04 trigger receipt');
  equal(pointer.history[3].status, 'current', 'pointer SG-04 state');

  equal(checkpoint.authority_change.changed_layer, 'L4-K0', 'SG-04 changed layer');
  equal(checkpoint.authority_change.prior_authority, 'canonical_graph_inert_layer_eight_of_nine_query_templates', 'SG-04 prior authority');
  equal(checkpoint.authority_change.current_authority, 'canonical_graph_inert_layer_full_frozen_query_battery_executed_field_adjudication_open', 'SG-04 current authority');
  equal(checkpoint.authority_change.source_transition_commit, transitionCommit, 'SG-04 authority transition');
  equal(checkpoint.authority_change.graph_effect, 'none', 'SG-04 authority graph effect');
  equal(checkpoint.authority_change.publication_effect, 'none', 'SG-04 authority publication effect');
  equal(checkpoint.authority_change.field_effect, 'none', 'SG-04 authority field effect');
  equal(checkpoint.authority_change.adoption_effect, 'none', 'SG-04 authority adoption effect');

  const expectedK0 = {
    query_templates_total: 9,
    query_templates_executed: 9,
    searches_executed: 52,
    raw_results_observed: 302,
    returned_records: 66,
    candidate_records: 28,
    positive_controls: 15,
    negative_controls: 12,
    coverage_controls: 8,
    non_events: 35,
    open_additional_acquisition: 1,
    included_events: 0,
    independent_second_party_review_complete: false,
    graph_effect: 'none'
  };
  for (const [key, value] of Object.entries(expectedK0)) equal(snapshot.k0[key], value, `frozen K0 ${key}`);

  const expectedWave = {
    wave_id: 'K0-W08',
    query_id: 'K0-Q02',
    query_executions: 8,
    raw_results_observed: 96,
    retained_records: 9,
    candidate_records: 4,
    positive_controls: 2,
    negative_controls: 2,
    coverage_controls: 1,
    counterpower_controls: 2,
    included_events: 0,
    assigned_ccd_values: 0,
    field_adjudication_complete: false,
    publication_status: 'blocked',
    graph_effect: 'none'
  };
  for (const [key, value] of Object.entries(expectedWave)) equal(snapshot.wave_08[key], value, `frozen Wave 08 ${key}`);

  equal(snapshot.core_thesis.report_contracts, 9, 'frozen core-thesis report count');
  equal(snapshot.m05_story_ecology.stories, 15, 'frozen M-05 story count');
  equal(snapshot.m05_story_ecology.research_lanes, 18, 'frozen M-05 lane count');
  equal(snapshot.poof.jurisdictions, 4, 'frozen POOF jurisdictions');
  equal(snapshot.poof.typed_transaction_objects, 5, 'frozen POOF objects');
  equal(snapshot.poof.routes, 9, 'frozen POOF routes');
  equal(snapshot.poof.operational_effect_dimensions, 7, 'frozen POOF effects');
  equal(snapshot.poof.constitutional_change_receipts, 5, 'frozen POOF receipts');
  equal(snapshot.poof.deployed, false, 'frozen POOF deployment');
  equal(snapshot.poof.indexable, false, 'frozen POOF indexability');
  equal(snapshot.poof.canonical_claim_created, false, 'frozen POOF canonical claim');
  equal(snapshot.dca.query_templates_executed, 0, 'frozen DCA execution');
  equal(snapshot.dca.field_records, 0, 'frozen DCA records');
  equal(snapshot.dca.prevalence_finding_generated, false, 'frozen DCA prevalence');
  equal(snapshot.sprint_09.external_reproduction_receipts, 0, 'frozen external reproduction');
  equal(snapshot.sprint_09.A1_registry_entries, 0, 'frozen A1');
  equal(snapshot.sprint_09.A3_no_adverse_shadow_uses, 0, 'frozen A3');
  equal(snapshot.sprint_09.A4_prospective_parallel_operations, 0, 'frozen A4');
  equal(snapshot.sprint_09.A5_rights_bearing_uses, 0, 'frozen A5');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'frozen pilot boundary');

  equal(checkpoint.fanout_state.owner_lanes.length, 6, 'owner-lane count');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-02')?.state, 'complete_on_SG04_merge', 'FAN-02 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-02')?.receipt, transitionCommit, 'FAN-02 receipt');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-03')?.state, 'canonical_protocol_execution_zero', 'FAN-03 state');
  equal(checkpoint.fanout_state.dca_execution_waves.length, 6, 'DCA wave count');
  check(checkpoint.fanout_state.dca_execution_waves.every((row) => row.state.includes('zero')), 'DCA wave state silently promotes execution');
  equal(checkpoint.lifecycle_repair.SG03.state, 'immutable_history_validation_installed_by_SG04', 'SG-03 lifecycle state');
  equal(checkpoint.lifecycle_repair.SG04.state, 'successor_aware_from_initial_release', 'SG-04 lifecycle state');
  equal(checkpoint.build_order.find((row) => row.order === 3)?.state, 'open_field_adjudication', 'Wave 08 adjudication build state');
  equal(checkpoint.build_order.find((row) => row.order === 4)?.state, 'open_zero_of_twelve', 'DCA build state');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-04 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-04 boundary ${key}`);
  }

  const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
  if (isCurrent) {
    for (const error of transitionVerifier()) errors.push(error);

    equal(k0.status, snapshot.k0.status, 'live K0 status');
    equal(k0.execution.query_templates_executed, snapshot.k0.query_templates_executed, 'live K0 query count');
    equal(k0.execution.searches_executed, snapshot.k0.searches_executed, 'live K0 search count');
    equal(k0.execution.raw_results_observed, snapshot.k0.raw_results_observed, 'live K0 raw-result count');
    equal(k0.execution.returned_records, snapshot.k0.returned_records, 'live K0 retained count');
    equal(k0.execution.candidate_records, snapshot.k0.candidate_records, 'live K0 candidate count');
    equal(k0.execution.positive_controls, snapshot.k0.positive_controls, 'live K0 positive-control count');
    equal(k0.execution.negative_controls, snapshot.k0.negative_controls, 'live K0 negative-control count');
    equal(k0.execution.coverage_controls, snapshot.k0.coverage_controls, 'live K0 coverage-control count');
    equal(k0.execution.non_events, snapshot.k0.non_events, 'live K0 non-event count');
    equal(k0.execution.open_additional_acquisition, snapshot.k0.open_additional_acquisition, 'live K0 acquisition count');
    equal(k0.execution.included_events, snapshot.k0.included_events, 'live K0 event count');
    equal(k0.execution.independent_second_party_review_complete, false, 'live K0 independent-review state');
    equal(JSON.stringify(k0.execution.executed_wave_ids), JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06','K0-W07','K0-W08']), 'live K0 wave identities');

    equal(wave08.wave_id, snapshot.wave_08.wave_id, 'live Wave 08 identity');
    equal(JSON.stringify(wave08.query_template_ids), JSON.stringify(['K0-Q02']), 'live Wave 08 query');
    equal(wave08.counts.query_executions, snapshot.wave_08.query_executions, 'live Wave 08 execution count');
    equal(wave08.counts.raw_results_observed, snapshot.wave_08.raw_results_observed, 'live Wave 08 raw count');
    equal(wave08.counts.retained_records, snapshot.wave_08.retained_records, 'live Wave 08 retained count');
    equal(wave08.counts.candidate_requires_field_audit, snapshot.wave_08.candidate_records, 'live Wave 08 candidate count');
    equal(wave08.counts.positive_controls, snapshot.wave_08.positive_controls, 'live Wave 08 positive controls');
    equal(wave08.counts.negative_controls, snapshot.wave_08.negative_controls, 'live Wave 08 negative controls');
    equal(wave08.counts.coverage_controls, snapshot.wave_08.coverage_controls, 'live Wave 08 coverage controls');
    equal(wave08.counts.counterpower_controls, snapshot.wave_08.counterpower_controls, 'live Wave 08 counterpower controls');
    equal(wave08.counts.included_events, 0, 'live Wave 08 event count');
    equal(wave08.counts.assigned_ccd_values, 0, 'live Wave 08 CCD count');
    check(wave08.records.every((row) => row.field_audit_status === 'pending' && row.included_event === false &&
      row.ccd_chain_depth === null && row.publication_status === 'blocked' && row.graph_effect === 'none'),
      'live Wave 08 promotion boundary drift');
    check(Object.values(wave08.boundaries).every((value) => value === false || value === 'none'), 'live Wave 08 boundary drift');

    equal(coreThesis.report_contracts.length, 9, 'live core-thesis report count');
    equal(stories.counts.stories, 15, 'live M-05 story count');
    equal(stories.stories.at(-1)?.story_id, 'M05-S15', 'live last M-05 story');
    equal(fanout.counts.lanes, 18, 'live M-05 lane count');
    equal(fanout.lanes.at(-1)?.lane_id, 'A18', 'live last M-05 lane');

    equal(poofContract.ecology_id, snapshot.poof.ecology_id, 'live POOF identity');
    equal(poofContract.jurisdictions.length, snapshot.poof.jurisdictions, 'live POOF jurisdictions');
    equal(poofContract.transaction_objects.length, snapshot.poof.typed_transaction_objects, 'live POOF objects');
    equal(poofContract.publication_state.may_be_represented_as_deployed, false, 'live POOF deployment representation');
    equal(poofAperture.routes.length, snapshot.poof.routes, 'live POOF routes');
    equal(poofAperture.publication.deployed, false, 'live POOF deployment');
    equal(poofAperture.publication.indexable, false, 'live POOF indexability');
    equal(poofObjects.effect_dimensions.length, snapshot.poof.operational_effect_dimensions, 'live POOF effects');
    equal(poofChanges.changes.length, snapshot.poof.constitutional_change_receipts, 'live POOF receipt count');
    check(hex64.test(poofRelease.combined_sha256), 'live POOF release digest format');
    check(hex64.test(k0Release.combined_sha256), 'live K0 release digest format');
    check(hex64.test(waveRelease.combined_sha256), 'live Wave 08 release digest format');

    equal(dca.current_state.prevalence_denominator_executed, false, 'live DCA execution state');
    equal(dca.current_state.prevalence_finding_generated, false, 'live DCA prevalence state');
    equal(denominator.execution.query_templates_executed, 0, 'live DCA query count');
    equal(denominator.execution.records_retained, 0, 'live DCA record count');
    equal(sprint08.current_result.maximum_verified_adoption_level, 'A0', 'live Sprint 08 adoption');
    equal(sprint09.current_result.external_reproduction_receipts, 0, 'live reproduction count');
    equal(sprint09.current_result.A1_registry_entries, 0, 'live A1 count');
    equal(sprint09.current_result.A3_no_adverse_shadow_uses, 0, 'live A3 count');
    equal(sprint09.current_result.A4_prospective_parallel_operations, 0, 'live A4 count');
    equal(sprint09.current_result.A5_rights_bearing_uses, 0, 'live A5 count');
    equal(sprint09.current_result.maximum_verified_adoption_level, 'A0', 'live adoption ceiling');
    equal(sprint09.current_result.real_person_pilot_authorized, false, 'live pilot state');
    equal(fieldGate.field_sequence.length, 8, 'live F0-F7 denominator');
    check(fieldGate.field_sequence.slice(1).every((row) => row.external_effect_observed === false), 'live field effect silently promoted');

    equal(manifest.schema_version, 'project-stable-ground-sg04-release-manifest@1', 'SG-04 manifest schema');
    equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-04 manifest identity');
    equal(JSON.stringify(manifest), JSON.stringify(computeSg04Manifest()), 'current SG-04 exact-byte manifest');
    equal(report.schema_version, 'project-stable-ground-sg04-report@1', 'SG-04 report schema');
    equal(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-04 report identity');
    equal(report.canonical_main.commit, transitionCommit, 'SG-04 report canonical transition');
    equal(report.counts.checkpoints_preserved, 4, 'SG-04 report history count');
    equal(report.counts.k0_executed, 9, 'SG-04 report K0 count');
    equal(report.counts.k0_total, 9, 'SG-04 report K0 denominator');
    equal(report.counts.included_k0_events, 0, 'SG-04 report event count');
    equal(report.k0_release.combined_sha256, k0Release.combined_sha256, 'SG-04 report K0 digest');
    equal(report.wave_08_release.combined_sha256, waveRelease.combined_sha256, 'SG-04 report Wave 08 digest');
    equal(report.poof_release.combined_sha256, poofRelease.combined_sha256, 'SG-04 report POOF digest');
    equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'SG-04 report release digest');
  } else {
    const historyRow = pointer.history.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
    check(Boolean(historyRow), 'historical pointer row missing for SG-04');
    equal(historyRow?.path, 'data/project/project-stable-ground-sg04.json', 'historical SG-04 pointer path');
    equal(historyRow?.status, 'superseded_preserved', 'historical SG-04 pointer status');
    for (const error of historicalVerifier(historyRow)) errors.push(error);
  }
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

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
