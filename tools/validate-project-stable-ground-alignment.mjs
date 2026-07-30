#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-project-stable-ground-alignment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadAlignmentContext() {
  return {
    record: read('data/project/project-stable-ground-alignment.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    sprint08: read('data/project/m05-answerable-power-sprint-08-plan.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    fieldGate: read('data/project/m05-answerable-power-sprint-09-field-gate.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    manifest: read('data/project/project-stable-ground-alignment-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/checkpoint.json')
  };
}

export function validateAlignment(context = loadAlignmentContext()) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };

  const { record, pointer, k0, sprint08, sprint09, fieldGate, stories, manifest, report } = context;
  const snapshot = record.canonical_snapshot;

  equal(record.schema_version, 'project-stable-ground-alignment@1', 'alignment schema');
  equal(record.checkpoint_id, 'SG-2026-07-29-01', 'checkpoint identity');
  equal(record.canonical_main.repository, 'BigBirdReturns/clifford-number', 'repository identity');
  equal(record.canonical_main.branch, 'main', 'canonical branch');
  equal(record.canonical_main.commit, 'dd4dc58fc594418d8bd588332c9874fde4f14d36', 'canonical base commit');

  check(record.source_basis.some((row) =>
    row.source_id === 'SRC-DCA-ESSAY' &&
    row.sha256 === 'd3e91ee771f67ef8577e7ad56d139a657f04bfba0f8d9a2ab386222b83968bcd'
  ), 'exact attached DCA essay digest missing');
  check(record.source_basis.some((row) =>
    row.source_id === 'SRC-HONEST-ANSWER-ESSAY' &&
    row.custody === 'conversation_attachment_reference_only' &&
    row.sha256 === null
  ), 'conversation-only honest-answer custody boundary missing');

  equal(record.project_lineage.length, 10, 'lineage denominator');
  equal(record.stable_propositions.length, 9, 'stable proposition denominator');
  equal(record.authority_tiers.length, 5, 'authority-tier denominator');
  equal(record.noncanonical_active_surfaces.length, 6, 'noncanonical-surface denominator');
  equal(record.drift_register.length, 7, 'drift denominator');
  equal(record.build_order.length, 7, 'build-order denominator');

  const requiredLineage = [
    'L1-NETWORK-ORIENTATION',
    'L2-BOUNDED-SURFACES',
    'L3-ESTATES-AND-LAKE',
    'L4-K0',
    'L5-C1-C7',
    'L6-POOF',
    'L7-M05-R0-R7',
    'L8-APC01-A0',
    'L9-QUESTION-4',
    'L10-DCA'
  ];
  equal(JSON.stringify(record.project_lineage.map((row) => row.layer_id)), JSON.stringify(requiredLineage), 'lineage order');
  check(record.stable_propositions.some((row) => row.proposition_id === 'SG-P03' && row.text.includes('Same mechanism is not communication')), 'non-coordination stable proposition missing');
  check(record.stable_propositions.some((row) => row.proposition_id === 'SG-P06' && row.text.includes('External participation is required for an external claim')), 'external-claim versus internal-reasoning proposition missing');

  equal(snapshot.k0.query_templates_total, 9, 'K0 total-template count');
  equal(snapshot.k0.query_templates_executed, 8, 'K0 executed-template count');
  equal(snapshot.k0.searches_executed, 44, 'K0 search count');
  equal(snapshot.k0.raw_results_observed, 206, 'K0 raw-result count');
  equal(snapshot.k0.returned_records, 57, 'K0 retained-record count');
  equal(snapshot.k0.candidate_records, 24, 'K0 candidate count');
  equal(snapshot.k0.non_events, 30, 'K0 non-event count');
  equal(snapshot.k0.open_additional_acquisition, 1, 'K0 open-acquisition count');
  equal(snapshot.k0.included_events, 0, 'K0 included-event count');
  equal(snapshot.k0.independent_second_party_review_complete, false, 'K0 independent-review state');
  equal(snapshot.k0.graph_effect, 'none', 'K0 graph boundary');

  equal(snapshot.m05_story_ecology.stories, 14, 'M-05 story count');
  equal(snapshot.m05_story_ecology.standalone_actor, 3, 'standalone story count');
  equal(snapshot.m05_story_ecology.exact_overlap, 3, 'overlap story count');
  equal(snapshot.m05_story_ecology.constitutional_mechanism, 4, 'constitutional story count');
  equal(snapshot.m05_story_ecology.answer_story, 3, 'answer-story count');
  equal(snapshot.m05_story_ecology.non_link, 1, 'non-link story count');
  equal(snapshot.m05_story_ecology.last_canonical_story_id, 'M05-S14', 'last canonical story');

  equal(snapshot.sprint_08.status, 'protocol_complete_no_a1_entry', 'Sprint 08 status');
  equal(snapshot.sprint_08.a1_registry_entries, 0, 'Sprint 08 a1_registry_entries');
  equal(snapshot.sprint_08.maximum_verified_adoption_level, 'A0', 'Sprint 08 adoption level');
  equal(snapshot.sprint_08.real_person_pilot_authorized, false, 'Sprint 08 pilot state');

  equal(snapshot.sprint_09.status, 'field_campaign_published_no_external_receipt', 'Sprint 09 status');
  equal(snapshot.sprint_09.candidate_records, 26, 'Sprint 09 candidate_records');
  equal(snapshot.sprint_09.external_reproduction_receipts, 0, 'Sprint 09 external_reproduction_receipts');
  equal(snapshot.sprint_09.A1_registry_entries, 0, 'Sprint 09 A1_registry_entries');
  equal(snapshot.sprint_09.A3_no_adverse_shadow_uses, 0, 'Sprint 09 A3_no_adverse_shadow_uses');
  equal(snapshot.sprint_09.A4_prospective_parallel_operations, 0, 'Sprint 09 A4_prospective_parallel_operations');
  equal(snapshot.sprint_09.A5_rights_bearing_uses, 0, 'Sprint 09 A5_rights_bearing_uses');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'Sprint 09 adoption level');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'Sprint 09 pilot state');
  equal(snapshot.sprint_09.project_complete, false, 'Sprint 09 project state');

  equal(record.namespace_and_ontology.field_hypothesis_id, 'DCA-H01', 'DCA hypothesis ID');
  equal(record.namespace_and_ontology.field_hypothesis_graph_effect, 'none', 'DCA graph boundary');
  equal(record.namespace_and_ontology.story_id_policy['M05-S15'], 'reserved by open PR #410 for the two-tier constitution and safeguard-allocation story', 'M05-S15 reservation');
  equal(record.namespace_and_ontology.story_id_policy.DCA_future_story_id, 'M05-S16 only after PR #410 lands and only if the field hypothesis is admitted to the story registry', 'DCA future story reservation');

  check(record.noncanonical_active_surfaces.some((row) => row.surface_id === 'NC-PR-382'), 'publication-safety dependency missing');
  check(record.change_control.forbidden_shortcuts.some((row) => row.includes('branch fact narrated as mainline fact')), 'branch-fact shortcut boundary missing');
  check(record.change_control.forbidden_shortcuts.some((row) => row.includes('issue text narrated as canonical object')), 'issue-object shortcut boundary missing');
  check(record.change_control.forbidden_shortcuts.some((row) => row.includes('canonicality narrated as empirical truth')), 'canonicality shortcut boundary missing');
  check(record.change_control.forbidden_shortcuts.some((row) => row.includes('internal build narrated as external reproduction')), 'external-reproduction shortcut boundary missing');
  check(record.change_control.forbidden_shortcuts.some((row) => row.includes('same mechanism narrated as coordination')), 'coordination shortcut boundary missing');

  for (const [key, value] of Object.entries(record.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `boundary ${key}`);
  }

  equal(manifest.schema_version, 'project-stable-ground-alignment-release-manifest@1', 'historical release schema');
  equal(manifest.checkpoint_id, record.checkpoint_id, 'historical release checkpoint');
  equal(manifest.combined_sha256, 'b405d984f522ae36b46ad4941eaca154cb98316c98c036f816e90233204d2ddd', 'historical release digest');
  equal(report.schema_version, 'project-stable-ground-alignment-report@1', 'report schema');
  equal(report.checkpoint_id, record.checkpoint_id, 'report checkpoint identity');
  equal(report.canonical_main.commit, record.canonical_main.commit, 'report canonical base');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'report release digest');

  const isCurrent = pointer.current_checkpoint_id === record.checkpoint_id;
  if (isCurrent) {
    equal(JSON.stringify(manifest), JSON.stringify(computeReleaseManifest()), 'exact-byte release manifest');
    equal(k0.execution.query_templates_executed, snapshot.k0.query_templates_executed, 'live K0 executed-template count');
    equal(stories.counts.stories, snapshot.m05_story_ecology.stories, 'live M-05 story count');
    equal(stories.stories.at(-1)?.story_id, snapshot.m05_story_ecology.last_canonical_story_id, 'live last canonical story');
    equal(sprint08.status, snapshot.sprint_08.status, 'live Sprint 08 status');
    equal(sprint09.status, snapshot.sprint_09.status, 'live Sprint 09 status');
    equal(fieldGate.field_sequence.length, 8, 'live F0-F7 denominator');
  } else {
    const historyRow = pointer.history?.find((row) => row.checkpoint_id === record.checkpoint_id);
    check(Boolean(historyRow), 'historical pointer row missing for SG-01');
    equal(historyRow?.path, 'data/project/project-stable-ground-alignment.json', 'historical pointer path');
    equal(historyRow?.merge_commit, 'c810cc741b23062b7eb3d026a46404e138e93eda', 'historical pointer merge commit');
    equal(historyRow?.status, 'superseded_preserved', 'historical pointer status');
  }

  return errors;
}

function main() {
  const errors = validateAlignment();
  if (errors.length) {
    console.error(`validate-project-stable-ground-alignment: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-alignment: historical checkpoint PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
