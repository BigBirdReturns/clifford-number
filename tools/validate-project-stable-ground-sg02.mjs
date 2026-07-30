#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSg02Manifest } from './build-project-stable-ground-sg02.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function validateSg02() {
  const checkpoint = read('data/project/project-stable-ground-sg02.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const sg01 = read('data/project/project-stable-ground-alignment.json');
  const dca = read('data/project/dca-h01-field-hypothesis.json');
  const denominator = read('data/project/dca-h01-role-neutral-denominator.json');
  const k0 = read('data/research/k0-role-neutral-denominator.json');
  const stories = read('data/project/m05-answerable-power-story-registry.json');
  const sprint08 = read('data/project/m05-answerable-power-sprint-08-plan.json');
  const sprint09 = read('data/project/m05-answerable-power-sprint-09-plan.json');
  const manifest = read('data/project/project-stable-ground-sg02-release-manifest.json');
  const report = read('reports/core-thesis/stable-ground/sg02/checkpoint.json');

  assert.equal(checkpoint.schema_version, 'project-stable-ground-supersession@1');
  assert.equal(checkpoint.checkpoint_id, 'SG-2026-07-29-02');
  assert.equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-01');
  assert.equal(checkpoint.supersedes.merge_commit, 'c810cc741b23062b7eb3d026a46404e138e93eda');
  assert.equal(checkpoint.supersedes.preserved_unchanged, true);
  assert.equal(sg01.checkpoint_id, checkpoint.supersedes.checkpoint_id);
  assert.equal(checkpoint.trigger.merge_commit, 'af26b797ded7e11fc102f0935f71a9282e976090');
  assert.equal(checkpoint.canonical_main.commit, checkpoint.trigger.merge_commit);

  assert.equal(pointer.current_checkpoint_id, checkpoint.checkpoint_id);
  assert.equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg02.json');
  assert.equal(pointer.history.length, 2);
  assert.equal(pointer.history[0].checkpoint_id, sg01.checkpoint_id);
  assert.equal(pointer.history[0].status, 'superseded_preserved');
  assert.equal(pointer.history[1].checkpoint_id, checkpoint.checkpoint_id);

  assert.deepEqual(checkpoint.preserved_stable_propositions, sg01.stable_propositions.map((row) => row.proposition_id));
  assert.equal(checkpoint.preserved_stable_propositions.length, 9);
  assert.equal(checkpoint.authority_change.changed_layer, 'L10-DCA');
  assert.equal(checkpoint.authority_change.current_authority, 'canonical_AT2_field_hypothesis');
  assert.equal(checkpoint.authority_change.release_sha256, 'f2eda91f178612fb526f8799f46ffd6667f8aaa30347d644fb5bd7e212d5bd46');
  assert.equal(checkpoint.authority_change.graph_effect, 'none');
  assert.equal(checkpoint.authority_change.prevalence_execution_started, false);

  assert.equal(dca.hypothesis_id, 'DCA-H01');
  assert.equal(dca.authority_tier, 'AT-2');
  assert.equal(dca.current_state.canonical_field_hypothesis_object, true);
  assert.equal(dca.current_state.prevalence_denominator_executed, false);
  assert.equal(dca.current_state.prevalence_finding_generated, false);
  assert.equal(dca.current_state.graph_effect, 'none');
  assert.equal(dca.mechanisms.length, checkpoint.canonical_snapshot.dca.mechanisms);
  assert.equal(dca.controls.length, checkpoint.canonical_snapshot.dca.controls);
  assert.equal(dca.alternative_explanations.length, checkpoint.canonical_snapshot.dca.alternative_explanations);
  assert.equal(dca.falsifiers.length, checkpoint.canonical_snapshot.dca.falsifiers);

  assert.equal(denominator.strata.length, checkpoint.canonical_snapshot.dca.denominator_strata);
  assert.equal(denominator.frozen_query_templates.length, checkpoint.canonical_snapshot.dca.frozen_query_templates);
  assert.equal(denominator.execution.query_templates_executed, checkpoint.canonical_snapshot.dca.query_templates_executed);
  assert.equal(denominator.execution.records_retained, checkpoint.canonical_snapshot.dca.field_records);
  assert.equal(denominator.execution.started, false);

  assert.equal(k0.search_battery.length, checkpoint.canonical_snapshot.k0.query_templates_total);
  assert.equal(k0.execution.query_templates_executed, checkpoint.canonical_snapshot.k0.query_templates_executed);
  assert.equal(k0.execution.searches_executed, checkpoint.canonical_snapshot.k0.searches_executed);
  assert.equal(k0.execution.raw_results_observed, checkpoint.canonical_snapshot.k0.raw_results_observed);
  assert.equal(k0.execution.returned_records, checkpoint.canonical_snapshot.k0.returned_records);
  assert.equal(k0.execution.included_events, 0);
  assert.equal(k0.boundaries.graph_effect, 'none');

  assert.equal(stories.counts.stories, checkpoint.canonical_snapshot.m05_story_ecology.stories);
  assert.equal(stories.stories.at(-1)?.story_id, checkpoint.canonical_snapshot.m05_story_ecology.last_canonical_story_id);
  assert.equal(stories.stories.some((row) => row.story_id === 'M05-S15'), false);

  assert.equal(sprint08.status, checkpoint.canonical_snapshot.sprint_08.status);
  assert.equal(sprint08.current_result.a1_registry_entries, checkpoint.canonical_snapshot.sprint_08.A1_registry_entries);
  assert.equal(sprint08.current_result.maximum_verified_adoption_level, 'A0');
  assert.equal(sprint08.current_result.real_person_pilot_authorized, false);

  assert.equal(sprint09.status, checkpoint.canonical_snapshot.sprint_09.status);
  assert.equal(sprint09.current_result.candidate_records, checkpoint.canonical_snapshot.sprint_09.candidate_records);
  assert.equal(sprint09.current_result.external_reproduction_receipts, 0);
  assert.equal(sprint09.current_result.A1_registry_entries, 0);
  assert.equal(sprint09.current_result.A3_no_adverse_shadow_uses, 0);
  assert.equal(sprint09.current_result.A4_prospective_parallel_operations, 0);
  assert.equal(sprint09.current_result.A5_rights_bearing_uses, 0);
  assert.equal(sprint09.current_result.maximum_verified_adoption_level, 'A0');
  assert.equal(sprint09.current_result.real_person_pilot_authorized, false);
  assert.equal(sprint09.current_result.project_complete, false);

  assert.equal(checkpoint.fanout_state.owner_lanes.length, 6);
  assert.deepEqual(checkpoint.fanout_state.owner_lanes.map((row) => row.lane_id), ['FAN-01', 'FAN-02', 'FAN-03', 'FAN-04', 'FAN-05', 'FAN-06']);
  assert.equal(checkpoint.fanout_state.dca_execution_waves.length, 6);
  assert.deepEqual(checkpoint.fanout_state.dca_execution_waves.map((row) => row.issue), [422, 423, 424, 425, 426, 427]);
  assert.deepEqual(checkpoint.fanout_state.dca_execution_waves.flatMap((row) => row.query_ids), denominator.frozen_query_templates.map((row) => row.query_id));
  assert.equal(checkpoint.build_order.length, 7);
  assert.equal(checkpoint.build_order.find((row) => row.order === 4)?.state, 'object_complete_execution_open');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') assert.equal(value, 'none');
    else if (typeof value === 'boolean') assert.equal(value, false, `boundary ${key}`);
  }

  assert.deepEqual(manifest, computeSg02Manifest());
  assert.equal(report.schema_version, 'project-stable-ground-sg02-report@1');
  assert.equal(report.checkpoint_id, checkpoint.checkpoint_id);
  assert.equal(report.counts.preserved_stable_propositions, 9);
  assert.equal(report.counts.fanout_owner_lanes, 6);
  assert.equal(report.counts.dca_execution_waves, 6);
  assert.equal(report.counts.dca_query_templates_executed, 0);
  assert.equal(report.counts.k0_query_templates_executed, 8);
  assert.equal(report.counts.m05_stories, 14);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);

  console.log('validate-project-stable-ground-sg02: PASS');
  return true;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) validateSg02();
