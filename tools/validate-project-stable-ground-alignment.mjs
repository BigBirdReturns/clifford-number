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
    k0: read('data/research/k0-role-neutral-denominator.json'),
    sprint08: read('data/project/m05-answerable-power-sprint-08-plan.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    fieldGate: read('data/project/m05-answerable-power-sprint-09-field-gate.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    manifest: read('data/project/project-stable-ground-alignment-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/checkpoint.json')
  };
}

const valueAt = (object, pathExpression) => pathExpression
  .split('.')
  .reduce((value, key) => (value == null ? undefined : value[key]), object);

export function validateAlignment(context = loadAlignmentContext()) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };

  const { record, k0, sprint08, sprint09, fieldGate, stories, manifest, report } = context;

  equal(record.schema_version, 'project-stable-ground-alignment@1', 'alignment schema');
  equal(record.checkpoint_id, 'SG-2026-07-29-01', 'checkpoint identity');
  equal(record.canonical_main.repository, 'BigBirdReturns/clifford-number', 'repository identity');
  equal(record.canonical_main.branch, 'main', 'canonical branch');
  equal(record.canonical_main.commit, 'dd4dc58fc594418d8bd588332c9874fde4f14d36', 'canonical base commit');
  check(
    record.source_basis.some((row) =>
      row.source_id === 'SRC-DCA-ESSAY' &&
      row.sha256 === 'd3e91ee771f67ef8577e7ad56d139a657f04bfba0f8d9a2ab386222b83968bcd'
    ),
    'exact attached DCA essay digest missing'
  );
  check(
    record.source_basis.some((row) =>
      row.source_id === 'SRC-HONEST-ANSWER-ESSAY' &&
      row.custody === 'conversation_attachment_reference_only' &&
      row.sha256 === null
    ),
    'conversation-only honest-answer custody boundary missing'
  );

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
  equal(
    JSON.stringify(record.project_lineage.map((row) => row.layer_id)),
    JSON.stringify(requiredLineage),
    'lineage order'
  );
  check(
    record.stable_propositions.some((row) =>
      row.proposition_id === 'SG-P03' &&
      row.text.includes('Same mechanism is not communication')
    ),
    'non-coordination stable proposition missing'
  );
  check(
    record.stable_propositions.some((row) =>
      row.proposition_id === 'SG-P06' &&
      row.text.includes('External participation is required for an external claim')
    ),
    'external-claim versus internal-reasoning proposition missing'
  );

  const snapshot = record.canonical_snapshot;

  equal(k0.status, snapshot.k0.status, 'K0 status');
  equal(k0.execution.query_templates_executed, snapshot.k0.query_templates_executed, 'K0 executed-template count');
  equal(k0.search_battery.length, snapshot.k0.query_templates_total, 'K0 total-template count');
  equal(k0.execution.searches_executed, snapshot.k0.searches_executed, 'K0 search count');
  equal(k0.execution.raw_results_observed, snapshot.k0.raw_results_observed, 'K0 raw-result count');
  equal(k0.execution.returned_records, snapshot.k0.returned_records, 'K0 retained-record count');
  equal(k0.execution.candidate_records, snapshot.k0.candidate_records, 'K0 candidate count');
  equal(k0.execution.non_events, snapshot.k0.non_events, 'K0 non-event count');
  equal(k0.execution.open_additional_acquisition, snapshot.k0.open_additional_acquisition, 'K0 open-acquisition count');
  equal(k0.execution.included_events, snapshot.k0.included_events, 'K0 included-event count');
  equal(
    k0.execution.independent_second_party_review_complete,
    snapshot.k0.independent_second_party_review_complete,
    'K0 independent-review state'
  );
  equal(k0.boundaries.graph_effect, snapshot.k0.graph_effect, 'K0 graph boundary');

  equal(k0.as_of, '2026-07-27', 'recorded K0 top-level as_of debt');
  equal(k0.execution.last_executed_at, '2026-07-29', 'recorded K0 last-executed date');
  check(
    record.drift_register.some((row) =>
      row.drift_id === 'DRIFT-05' &&
      row.observation.includes('top-level as_of') &&
      row.current_resolution.includes('ordinary K0 builder')
    ),
    'K0 metadata drift is not explicitly recorded'
  );

  equal(stories.counts.stories, snapshot.m05_story_ecology.stories, 'M-05 story count');
  equal(stories.counts.standalone_actor, snapshot.m05_story_ecology.standalone_actor, 'standalone story count');
  equal(stories.counts.exact_overlap, snapshot.m05_story_ecology.exact_overlap, 'overlap story count');
  equal(
    stories.counts.constitutional_mechanism,
    snapshot.m05_story_ecology.constitutional_mechanism,
    'constitutional story count'
  );
  equal(stories.counts.answer_story, snapshot.m05_story_ecology.answer_story, 'answer-story count');
  equal(stories.counts.non_link, snapshot.m05_story_ecology.non_link, 'non-link story count');
  equal(stories.stories.at(-1)?.story_id, snapshot.m05_story_ecology.last_canonical_story_id, 'last canonical story');
  check(!stories.stories.some((row) => row.story_id === 'M05-S15'), 'M05-S15 unexpectedly exists on the frozen mainline');

  equal(sprint08.status, snapshot.sprint_08.status, 'Sprint 08 status');
  for (const [key, expected] of Object.entries(snapshot.sprint_08)) {
    if (key === 'status') continue;
    equal(sprint08.current_result[key], expected, `Sprint 08 ${key}`);
  }

  equal(sprint09.status, snapshot.sprint_09.status, 'Sprint 09 status');
  for (const [key, expected] of Object.entries(snapshot.sprint_09)) {
    if (key === 'status') continue;
    equal(sprint09.current_result[key], expected, `Sprint 09 ${key}`);
  }

  equal(fieldGate.question, 'Can the authority topology survive contact with power?', 'Question 4 text');
  equal(fieldGate.field_sequence.length, 8, 'F0-F7 denominator');
  equal(fieldGate.field_sequence[0]?.stage_id, 'F0', 'first field stage');
  equal(fieldGate.field_sequence.at(-1)?.stage_id, 'F7', 'last field stage');
  equal(fieldGate.field_sequence[0]?.current_state, 'complete', 'F0 state');
  check(
    fieldGate.field_sequence.slice(1).every((row) => row.external_effect_observed === false),
    'an external field effect was silently promoted'
  );
  for (const [key, expected] of Object.entries(snapshot.works_standard)) {
    equal(fieldGate.works_standard[key], expected, `works standard ${key}`);
  }
  equal(fieldGate.magic_human_boundary.external_participation_required_for_external_claim, true, 'external claim law');
  equal(fieldGate.magic_human_boundary.external_participation_required_for_internal_reasoning, false, 'internal reasoning law');
  equal(fieldGate.magic_human_boundary.one_missing_participant_halts_campaign, false, 'campaign continuity law');
  equal(fieldGate.magic_human_boundary.one_willing_participant_may_collapse_roles, false, 'role separation law');

  equal(record.namespace_and_ontology.field_hypothesis_id, 'DCA-H01', 'DCA hypothesis ID');
  equal(record.namespace_and_ontology.field_hypothesis_graph_effect, 'none', 'DCA graph boundary');
  equal(
    record.namespace_and_ontology.story_id_policy.M05_S15 ??
      record.namespace_and_ontology.story_id_policy['M05-S15'],
    'reserved by open PR #410 for the two-tier constitution and safeguard-allocation story',
    'M05-S15 reservation'
  );
  equal(
    record.namespace_and_ontology.story_id_policy.DCA_future_story_id,
    'M05-S16 only after PR #410 lands and only if the field hypothesis is admitted to the story registry',
    'DCA future story reservation'
  );

  const pr410 = record.noncanonical_active_surfaces.find((row) => row.surface_id === 'NC-PR-410');
  check(Boolean(pr410), 'PR #410 shadow record missing');
  equal(pr410?.observed_base_commit, 'fdc13faf46e9a4ea273d7dce3d656b8e36d21844', 'PR #410 observed base');
  equal(pr410?.observed_head_commit, 'd0cb21a537dd20cbd1d14693f8f3ea26cbca4293', 'PR #410 observed head');
  equal(pr410?.behind_current_main_by_commits, 1, 'PR #410 divergence count');
  check(pr410?.required_reconciliation.includes('Sprint 09'), 'PR #410 Sprint 09 reconciliation missing');

  const issue416 = record.noncanonical_active_surfaces.find((row) => row.surface_id === 'NC-ISSUE-416');
  equal(issue416?.state, 'open_issue_named_not_canonical', 'DCA issue authority state');

  const requiredShortcutFragments = [
    'branch fact narrated as mainline fact',
    'issue text narrated as canonical object',
    'canonicality narrated as empirical truth',
    'internal build narrated as external reproduction',
    'same mechanism narrated as coordination'
  ];
  for (const fragment of requiredShortcutFragments) {
    check(
      record.change_control.forbidden_shortcuts.some((row) => row.includes(fragment)),
      `forbidden shortcut missing: ${fragment}`
    );
  }

  const expectedManifest = computeReleaseManifest();
  equal(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'exact-byte release manifest');
  equal(report.schema_version, 'project-stable-ground-alignment-report@1', 'report schema');
  equal(report.checkpoint_id, record.checkpoint_id, 'report checkpoint identity');
  equal(report.canonical_main.commit, record.canonical_main.commit, 'report canonical base');
  equal(report.counts.lineage_layers, record.project_lineage.length, 'report lineage count');
  equal(report.counts.stable_propositions, record.stable_propositions.length, 'report proposition count');
  equal(report.counts.k0_query_templates_executed, snapshot.k0.query_templates_executed, 'report K0 count');
  equal(report.counts.m05_stories, snapshot.m05_story_ecology.stories, 'report story count');
  equal(report.counts.field_candidates, snapshot.sprint_09.candidate_records, 'report field-candidate count');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'report release digest');

  for (const [key, value] of Object.entries(record.boundaries)) {
    if (key === 'graph_effect') {
      equal(value, 'none', `boundary ${key}`);
    } else if (typeof value === 'boolean') {
      equal(value, false, `boundary ${key}`);
    }
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
  console.log('validate-project-stable-ground-alignment: OK');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
