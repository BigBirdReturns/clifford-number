#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-02-constitution.schema.json';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const EXPECTED_TERMINALS = [
  'evidence_complete',
  'bounded_non_link',
  'bounded_source_restricted',
  'bounded_source_unavailable',
  'still_open'
];

const EXPECTED_ATTEMPTS = [
  {
    lane_id: 'RD-01',
    class_id: 'RD-01-C03',
    canonical_ordinal: 3,
    issue: 786,
    branch: 'agent/ssc-rd-wave02-rd01-legal-entity',
    source_path: 'data/intake/status-sovereignty-natsec100-denominator-first-pass.json',
    residual_field: 'next_acquisitions',
    exact_label: 'legal-entity resolution for selected and matched control companies',
    initial_unit_count: 102
  },
  {
    lane_id: 'RD-02',
    class_id: 'RD-02-C04',
    canonical_ordinal: 4,
    issue: 787,
    branch: 'agent/ssc-rd-wave02-rd02-license-leverage',
    source_path: 'data/intake/status-sovereignty-sbicct-denominator-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology',
    initial_unit_count: 18
  },
  {
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    canonical_ordinal: 4,
    issue: 788,
    branch: 'agent/ssc-rd-wave02-rd03-negotiated-terms',
    source_path: 'data/intake/status-sovereignty-osc-denominator-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
    initial_unit_count: 5
  },
  {
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    canonical_ordinal: 1,
    issue: 789,
    branch: 'agent/ssc-rd-wave02-rd04-version-history',
    source_path: 'data/intake/status-sovereignty-f02-snap-gate-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'current statutory, regulatory, and guidance version history after the 2025 law',
    initial_unit_count: null
  },
  {
    lane_id: 'RD-05',
    class_id: 'RD-05-C03',
    canonical_ordinal: 3,
    issue: 790,
    branch: 'agent/ssc-rd-wave02-rd05-recommendation-disposition',
    source_path: 'data/intake/status-sovereignty-f04-aces-governance-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'complete recommendation, agency response, adoption, rejection, implementation, and outcome ledger',
    initial_unit_count: null
  },
  {
    lane_id: 'RD-06',
    class_id: 'RD-06-C01',
    canonical_ordinal: 1,
    issue: 791,
    branch: 'agent/ssc-rd-wave02-rd06-offeror-universe',
    source_path: 'data/intake/status-sovereignty-f13-dcgsa-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
    initial_unit_count: 8
  }
];

export function validateConstitutionData(value, schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.issue?.const === 785, 'schema issue changed');
  ok(schema?.properties?.parent_custody?.properties?.canonical_residual_classes?.const === 42, 'schema residual denominator changed');
  ok(schema?.properties?.closure_contract?.properties?.attempted_classes?.const === 6, 'schema attempted-class count changed');
  ok(schema?.properties?.current_result?.properties?.classes_closed?.const === 0, 'schema pre-authorized class closure');

  ok(value?.schema_version === 'status-sovereignty-residual-denominator-wave-02-constitution@1', 'schema_version changed');
  ok(value?.wave_id === 'SSC-RD-W02' && value?.hypothesis_id === 'SSC-H01', 'wave identity changed');
  ok(value?.issue === 785 && value?.as_of === '2026-08-02', 'issue or date changed');
  ok(value?.authority === 'class_closure_attempt_constitution_not_empirical_receipt', 'authority escalated');

  const parent = value.parent_custody;
  ok(parent?.wave_01_issue === 615 && parent?.wave_01_reconciliation_pr === 660, 'Wave 01 parent custody changed');
  ok(parent?.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(parent?.closed_residual_classes === 0 && parent?.open_residual_classes === 42, 'launch closure state changed');
  ok(parent?.rd04_a08_merge === '68f4cb2aeccb129a3789b0b1b5da0f1e1c52cab6', 'A08 parent changed');
  ok(parent?.rd04_a09_merge === 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'A09 parent changed');
  ok(parent?.frozen_execution_base === 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'frozen execution base changed');

  const contract = value.closure_contract;
  ok(contract?.starting_open_classes === 42 && contract?.starting_closed_classes === 0, 'starting class accounting changed');
  ok(contract?.attempted_classes === 6 && contract?.maximum_closed_classes_after_wave === 6, 'attempt ceiling changed');
  ok(contract?.selected_class_closure_does_not_close_lane === true, 'class-to-lane boundary weakened');
  ok(contract?.source_restricted_closes_only_acquisition_obligation === true, 'source-restriction boundary weakened');
  ok(contract?.source_unavailable_closes_only_acquisition_obligation === true, 'source-unavailability boundary weakened');
  ok(same(contract?.permitted_terminal_states, EXPECTED_TERMINALS), 'permitted terminal states changed');
  ok(Array.isArray(contract?.required_conditions) && contract.required_conditions.length === 6, 'closure conditions changed');

  ok(Array.isArray(value.lane_attempts) && value.lane_attempts.length === 6, 'six lane attempts required');
  unique(value.lane_attempts.map((row) => row.lane_id), 'duplicate lane id');
  unique(value.lane_attempts.map((row) => row.class_id), 'duplicate class id');
  unique(value.lane_attempts.map((row) => row.issue), 'duplicate child issue');
  unique(value.lane_attempts.map((row) => row.branch), 'duplicate execution branch');

  value.lane_attempts.forEach((row, index) => {
    const expected = EXPECTED_ATTEMPTS[index];
    ok(row?.lane_id === expected.lane_id, `${expected.lane_id}: lane order or identity changed`);
    ok(row?.class_id === expected.class_id, `${expected.lane_id}: class id changed`);
    ok(row?.canonical_ordinal === expected.canonical_ordinal, `${expected.lane_id}: canonical ordinal changed`);
    ok(row?.issue === expected.issue, `${expected.lane_id}: issue changed`);
    ok(row?.branch === expected.branch, `${expected.lane_id}: branch changed`);
    ok(row?.source_path === expected.source_path && row?.residual_field === expected.residual_field, `${expected.lane_id}: source binding changed`);
    ok(row?.exact_label === expected.exact_label, `${expected.lane_id}: exact class label changed`);
    ok(row?.initial_unit_count === expected.initial_unit_count, `${expected.lane_id}: launch unit count changed`);
    ok(typeof row?.declared_unit === 'string' && row.declared_unit.length > 0, `${expected.lane_id}: declared unit missing`);
    ok(row?.selected_because_expected_result === false, `${expected.lane_id}: outcome-selected`);
    ok(row?.execution_state === 'not_executed', `${expected.lane_id}: unreceipted execution state`);
    ok(row?.class_closed === false, `${expected.lane_id}: class closed without receipt`);
  });

  const counts = value.counts;
  ok(counts?.execution_lanes === 6 && counts?.selected_class_attempts === 6, 'execution count changed');
  ok(counts?.terminal_class_receipts === 0, 'terminal receipt invented');
  ok(counts?.classes_closed_this_wave === 0 && counts?.classes_still_open_after_launch === 42, 'class accounting promoted');
  for (const key of [
    'outside_human_dependencies','external_contacts','external_reviews',
    'reviewed_disposition_changes','complete_compact_findings','racial_order_findings',
    'prevalence_findings','coordination_findings','common_purpose_findings',
    'graph_effects','publication_effects','adoption_effects'
  ]) ok(counts?.[key] === 0, `${key} changed`);

  const result = value.current_result;
  ok(result?.terminal_state === 'constitution_frozen_six_class_attempts_not_executed', 'terminal state changed');
  ok(result?.all_six_issues_opened === true && result?.all_six_branches_created === true, 'fan-out incomplete');
  ok(result?.empirical_acquisition_started === false, 'unreceipted empirical acquisition');
  ok(result?.class_closures_authorized_without_terminal_receipt === false, 'unreceipted closure authorized');
  ok(result?.classes_closed === 0 && result?.classes_open === 42, 'result class accounting changed');
  ok(result?.outside_human_dependency === false && result?.project_blocking === false, 'human or project dependency introduced');
  ok(result?.graph_effect === 'none' && result?.publication_effect === 'none' && result?.adoption_effect === 'none', 'effect authority escalated');

  for (const [name, state] of Object.entries(value.boundaries || {})) {
    if (name.endsWith('_effect')) ok(state === 'none', `${name} changed`);
    else ok(state === false, `${name} weakened`);
  }
  return value;
}

function validateRepositoryBindings(root, value) {
  const wave01 = read(root, value.parent_custody.wave_01_registry_path);
  ok(wave01?.counts?.canonical_residual_classes === 42, 'Wave 01 canonical denominator mismatch');
  ok(wave01?.counts?.closed_residual_classes === 0 && wave01?.counts?.open_residual_classes === 42, 'Wave 01 launch state mismatch');
  ok(wave01?.lane_receipts?.length === 6, 'Wave 01 lane denominator mismatch');

  const a09 = read(root, value.parent_custody.rd04_a09_core_path);
  ok(a09?.execution_id === 'SSC-RD04-CHANGED-INPUT-GATE-A09', 'A09 execution identity changed');
  ok(a09?.current_result?.terminal_state === 'no_changed_input_observed', 'A09 result changed');
  ok(a09?.current_result?.reusable_gate_installed === true, 'A09 reusable gate missing');
  ok(a09?.current_result?.automatic_schedule_installed === false, 'A09 automatic schedule introduced');
  ok(a09?.current_result?.project_blocking === false, 'A09 became project-blocking');

  for (const row of value.lane_attempts) {
    const source = read(root, row.source_path);
    const labels = source[row.residual_field];
    ok(Array.isArray(labels), `${row.lane_id}: canonical residual field missing`);
    ok(labels[row.canonical_ordinal - 1] === row.exact_label, `${row.lane_id}: canonical class label does not match source`);
  }

  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status === 0) {
    const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', value.parent_custody.frozen_execution_base, 'HEAD'], { cwd: root });
    ok(ancestry.status === 0, 'frozen Wave 02 base is not an ancestor of HEAD');
  }
}

export function validateConstitution(root = ROOT) {
  const schema = read(root, SCHEMA_PATH);
  const value = read(root, CONSTITUTION_PATH);
  validateConstitutionData(value, schema);
  validateRepositoryBindings(root, value);
  console.log('validate-status-sovereignty-residual-denominator-wave-02-constitution: 6 attempts, 42 open, 0 closed, authority zero');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validateConstitution();
  } catch (error) {
    console.error(`validate-status-sovereignty-residual-denominator-wave-02-constitution: ${error.message}`);
    process.exit(1);
  }
}
