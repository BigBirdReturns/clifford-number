#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSg02Manifest } from './build-project-stable-ground-sg02.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadSg02Context() {
  return {
    checkpoint: read('data/project/project-stable-ground-sg02.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    sg01: read('data/project/project-stable-ground-alignment.json'),
    dca: read('data/project/dca-h01-field-hypothesis.json'),
    denominator: read('data/project/dca-h01-role-neutral-denominator.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    sprint08: read('data/project/m05-answerable-power-sprint-08-plan.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    manifest: read('data/project/project-stable-ground-sg02-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg02/checkpoint.json')
  };
}

export function validateSg02(context = loadSg02Context()) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };

  const {
    checkpoint,
    pointer,
    sg01,
    dca,
    denominator,
    k0,
    stories,
    sprint08,
    sprint09,
    manifest,
    report
  } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-02 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-29-02', 'SG-02 checkpoint identity');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-01', 'SG-02 predecessor identity');
  equal(checkpoint.supersedes.source_path, 'data/project/project-stable-ground-alignment.json', 'SG-02 predecessor path');
  equal(checkpoint.supersedes.merge_commit, 'c810cc741b23062b7eb3d026a46404e138e93eda', 'SG-01 merge receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-01 preservation law');
  equal(sg01.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-01 source identity');
  equal(checkpoint.trigger.type, 'canonical_DCA_materialization', 'SG-02 trigger type');
  equal(checkpoint.trigger.merge_commit, 'af26b797ded7e11fc102f0935f71a9282e976090', 'DCA trigger receipt');
  equal(checkpoint.trigger.pull_request, 421, 'DCA trigger PR');
  equal(checkpoint.canonical_main.commit, checkpoint.trigger.merge_commit, 'SG-02 canonical base');

  equal(checkpoint.preserved_stable_propositions.length, 9, 'preserved stable-proposition count');
  equal(
    JSON.stringify(checkpoint.preserved_stable_propositions),
    JSON.stringify(sg01.stable_propositions.map((row) => row.proposition_id)),
    'preserved stable-proposition identities'
  );

  equal(checkpoint.authority_change.changed_layer, 'L10-DCA', 'SG-02 changed layer');
  equal(checkpoint.authority_change.prior_authority, 'named_field_hypothesis_not_canonical', 'SG-02 prior authority');
  equal(checkpoint.authority_change.current_authority, 'canonical_AT2_field_hypothesis', 'SG-02 current authority');
  equal(checkpoint.authority_change.release_sha256, 'f2eda91f178612fb526f8799f46ffd6667f8aaa30347d644fb5bd7e212d5bd46', 'DCA release digest');
  equal(checkpoint.authority_change.prevalence_execution_started, false, 'DCA execution state');
  equal(checkpoint.authority_change.prevalence_finding_generated, false, 'DCA prevalence state');
  equal(checkpoint.authority_change.graph_effect, 'none', 'DCA authority graph boundary');
  equal(checkpoint.authority_change.publication_effect, 'none', 'DCA authority publication boundary');
  equal(checkpoint.authority_change.field_effect, 'none', 'DCA authority field boundary');
  equal(checkpoint.authority_change.adoption_effect, 'none', 'DCA authority adoption boundary');

  equal(snapshot.k0.query_templates_total, 9, 'frozen K0 query denominator');
  equal(snapshot.k0.query_templates_executed, 8, 'frozen K0 execution count');
  equal(snapshot.k0.searches_executed, 44, 'frozen K0 search count');
  equal(snapshot.k0.raw_results_observed, 206, 'frozen K0 raw-result count');
  equal(snapshot.k0.returned_records, 57, 'frozen K0 retained-record count');
  equal(snapshot.k0.included_events, 0, 'frozen K0 included-event count');
  equal(snapshot.k0.independent_second_party_review_complete, false, 'frozen K0 review state');
  equal(snapshot.k0.graph_effect, 'none', 'frozen K0 graph boundary');

  equal(snapshot.m05_story_ecology.stories, 14, 'frozen M-05 story count');
  equal(snapshot.m05_story_ecology.last_canonical_story_id, 'M05-S14', 'frozen last M-05 story');
  equal(snapshot.m05_story_ecology.M05_S15_state, 'reserved_by_open_PR_410_not_canonical', 'frozen M05-S15 state');

  equal(snapshot.dca.hypothesis_id, 'DCA-H01', 'frozen DCA identity');
  equal(snapshot.dca.authority_tier, 'AT-2', 'frozen DCA authority tier');
  equal(snapshot.dca.mechanisms, 5, 'frozen DCA mechanism count');
  equal(snapshot.dca.denominator_strata, 12, 'frozen DCA stratum count');
  equal(snapshot.dca.frozen_query_templates, 12, 'frozen DCA query count');
  equal(snapshot.dca.query_templates_executed, 0, 'frozen DCA execution count');
  equal(snapshot.dca.field_records, 0, 'frozen DCA field-record count');
  equal(snapshot.dca.controls, 12, 'frozen DCA control count');
  equal(snapshot.dca.alternative_explanations, 9, 'frozen DCA alternative count');
  equal(snapshot.dca.falsifiers, 10, 'frozen DCA falsifier count');
  equal(snapshot.dca.prevalence_finding_generated, false, 'frozen DCA prevalence finding');
  equal(snapshot.dca.coordination_finding_generated, false, 'frozen DCA coordination finding');
  equal(snapshot.dca.common_purpose_finding_generated, false, 'frozen DCA common-purpose finding');
  equal(snapshot.dca.personal_hostility_finding_generated, false, 'frozen DCA personal-hostility finding');
  equal(snapshot.dca.graph_effect, 'none', 'frozen DCA graph boundary');

  equal(snapshot.sprint_08.status, 'protocol_complete_no_a1_entry', 'frozen Sprint 08 status');
  equal(snapshot.sprint_08.A1_registry_entries, 0, 'frozen Sprint 08 A1 count');
  equal(snapshot.sprint_08.maximum_verified_adoption_level, 'A0', 'frozen Sprint 08 adoption ceiling');
  equal(snapshot.sprint_08.real_person_pilot_authorized, false, 'frozen Sprint 08 pilot state');

  equal(snapshot.sprint_09.status, 'field_campaign_published_no_external_receipt', 'frozen Sprint 09 status');
  equal(snapshot.sprint_09.candidate_records, 26, 'frozen field-candidate count');
  equal(snapshot.sprint_09.external_reproduction_receipts, 0, 'frozen reproduction count');
  equal(snapshot.sprint_09.eligible_adjudicators, 0, 'frozen adjudicator count');
  equal(snapshot.sprint_09.A1_registry_entries, 0, 'frozen A1 count');
  equal(snapshot.sprint_09.A3_no_adverse_shadow_uses, 0, 'frozen A3 count');
  equal(snapshot.sprint_09.A4_prospective_parallel_operations, 0, 'frozen A4 count');
  equal(snapshot.sprint_09.A5_rights_bearing_uses, 0, 'frozen A5 count');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'frozen pilot state');
  equal(snapshot.sprint_09.project_complete, false, 'frozen project state');

  equal(checkpoint.fanout_state.owner_lanes.length, 6, 'frozen owner-lane count');
  equal(
    JSON.stringify(checkpoint.fanout_state.owner_lanes.map((row) => row.lane_id)),
    JSON.stringify(['FAN-01', 'FAN-02', 'FAN-03', 'FAN-04', 'FAN-05', 'FAN-06']),
    'frozen owner-lane identities'
  );
  equal(checkpoint.fanout_state.dca_execution_waves.length, 6, 'frozen DCA-wave count');
  equal(
    JSON.stringify(checkpoint.fanout_state.dca_execution_waves.map((row) => row.issue)),
    JSON.stringify([422, 423, 424, 425, 426, 427]),
    'frozen DCA-wave issues'
  );
  check(checkpoint.fanout_state.dca_execution_waves.every((row) => row.state.includes('zero')), 'frozen DCA wave state silently promotes execution');
  equal(checkpoint.build_order.length, 7, 'frozen build-order count');
  equal(checkpoint.build_order.find((row) => row.order === 4)?.state, 'object_complete_execution_open', 'frozen DCA build state');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-02 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-02 boundary ${key}`);
  }

  equal(manifest.schema_version, 'project-stable-ground-sg02-release-manifest@1', 'historical SG-02 manifest schema');
  equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-02 manifest identity');
  equal(manifest.combined_sha256, 'e8c8bc3c7d2eae6532c3fc52d4c99691979474533388a5b5a68836380a522061', 'historical SG-02 release digest');
  equal(report.schema_version, 'project-stable-ground-sg02-report@1', 'historical SG-02 report schema');
  equal(report.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-02 report identity');
  equal(report.counts.preserved_stable_propositions, 9, 'historical SG-02 report proposition count');
  equal(report.counts.fanout_owner_lanes, 6, 'historical SG-02 report lane count');
  equal(report.counts.dca_execution_waves, 6, 'historical SG-02 report wave count');
  equal(report.counts.dca_query_templates_executed, 0, 'historical SG-02 report DCA count');
  equal(report.counts.k0_query_templates_executed, 8, 'historical SG-02 report K0 count');
  equal(report.counts.m05_stories, 14, 'historical SG-02 report story count');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'historical SG-02 report digest');

  const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
  if (isCurrent) {
    equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg02.json', 'current SG-02 pointer path');
    equal(JSON.stringify(manifest), JSON.stringify(computeSg02Manifest()), 'current SG-02 exact-byte manifest');
    equal(dca.hypothesis_id, snapshot.dca.hypothesis_id, 'live DCA identity');
    equal(dca.current_state.canonical_field_hypothesis_object, true, 'live DCA canonical object state');
    equal(dca.current_state.prevalence_denominator_executed, false, 'live DCA execution state');
    equal(denominator.execution.query_templates_executed, snapshot.dca.query_templates_executed, 'live DCA execution count');
    equal(denominator.execution.records_retained, snapshot.dca.field_records, 'live DCA record count');
    equal(k0.execution.query_templates_executed, snapshot.k0.query_templates_executed, 'live K0 execution count');
    equal(k0.execution.included_events, snapshot.k0.included_events, 'live K0 included-event count');
    equal(stories.counts.stories, snapshot.m05_story_ecology.stories, 'live M-05 story count');
    equal(stories.stories.at(-1)?.story_id, snapshot.m05_story_ecology.last_canonical_story_id, 'live last M-05 story');
    check(!stories.stories.some((row) => row.story_id === 'M05-S15'), 'M05-S15 unexpectedly canonical while SG-02 is current');
    equal(sprint08.current_result.maximum_verified_adoption_level, snapshot.sprint_08.maximum_verified_adoption_level, 'live Sprint 08 adoption ceiling');
    equal(sprint09.current_result.maximum_verified_adoption_level, snapshot.sprint_09.maximum_verified_adoption_level, 'live Sprint 09 adoption ceiling');
  } else {
    const historyRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
    check(Boolean(historyRow), 'historical pointer row missing for SG-02');
    equal(historyRow?.path, 'data/project/project-stable-ground-sg02.json', 'historical SG-02 pointer path');
    equal(historyRow?.merge_commit, '6b54d531885b5de72be547933ad4f7828a34d529', 'historical SG-02 merge receipt');
    equal(historyRow?.trigger_commit, 'af26b797ded7e11fc102f0935f71a9282e976090', 'historical SG-02 trigger receipt');
    equal(historyRow?.status, 'superseded_preserved', 'historical SG-02 pointer status');
  }

  return errors;
}

function main() {
  const errors = validateSg02();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg02: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg02: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
