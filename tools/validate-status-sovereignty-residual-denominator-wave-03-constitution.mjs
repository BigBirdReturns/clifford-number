#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-03-constitution.schema.json';

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

const EXPECTED_ADVANCEMENT_PATHS = [
  'data/crawl/candidates.jsonl',
  'data/crawl/rejections.jsonl',
  'data/crawl/state.json'
];

const EXPECTED_CLOSED_CLASS_IDS = [
  'RD-04-C01',
  'RD-05-C03',
  'RD-01-C03',
  'RD-06-C01',
  'RD-03-C04',
  'RD-02-C04'
];

const EXPECTED_ATTEMPTS = [
  {
    lane_id: 'RD-01',
    class_id: 'RD-01-C06',
    canonical_ordinal: 6,
    issue: 1014,
    branch: 'agent/ssc-rd-wave03-rd01-methodology-correction',
    source_path: 'data/intake/status-sovereignty-natsec100-denominator-first-pass.json',
    residual_field: 'next_acquisitions',
    exact_label: 'methodology correction, appeal, and re-evaluation records',
    initial_unit_count: 3
  },
  {
    lane_id: 'RD-02',
    class_id: 'RD-02-C05',
    canonical_ordinal: 5,
    issue: 1015,
    branch: 'agent/ssc-rd-wave03-rd02-portfolio-lifecycle',
    source_path: 'data/intake/status-sovereignty-sbicct-denominator-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger',
    initial_unit_count: 18
  },
  {
    lane_id: 'RD-03',
    class_id: 'RD-03-C05',
    canonical_ordinal: 5,
    issue: 1016,
    branch: 'agent/ssc-rd-wave03-rd03-lifecycle-recovery',
    source_path: 'data/intake/status-sovereignty-osc-denominator-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'commitment, closing, draw, disbursement, amendment, waiver, default, cure, repayment, and recovery chronology',
    initial_unit_count: 5
  },
  {
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    canonical_ordinal: 2,
    issue: 1017,
    branch: 'agent/ssc-rd-wave03-rd04-state-implementation',
    source_path: 'data/intake/status-sovereignty-f02-snap-gate-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'complete state implementation, waiver, discretionary-exemption, and screening universe',
    initial_unit_count: 50
  },
  {
    lane_id: 'RD-05',
    class_id: 'RD-05-C02',
    canonical_ordinal: 2,
    issue: 1018,
    branch: 'agent/ssc-rd-wave03-rd05-member-participation',
    source_path: 'data/intake/status-sovereignty-f04-aces-governance-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'member-specific votes, dissents, subcommittee assignments, agenda control, information access, and recommendation authorship',
    initial_unit_count: 17
  },
  {
    lane_id: 'RD-06',
    class_id: 'RD-06-C04',
    canonical_ordinal: 4,
    issue: 1019,
    branch: 'agent/ssc-rd-wave03-rd06-evaluation-custody',
    source_path: 'data/intake/status-sovereignty-f13-dcgsa-first-pass.json',
    residual_field: 'open_denominators',
    exact_label: 'evaluation scores, debriefings, exception records, and source-selection decision files',
    initial_unit_count: 8
  }
];

export function validateConstitutionData(value, schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.issue?.const === 1013, 'schema issue changed');
  ok(schema?.properties?.parent_custody?.properties?.closed_residual_classes?.const === 6, 'schema parent closure count changed');
  ok(schema?.properties?.parent_custody?.properties?.open_residual_classes?.const === 36, 'schema parent open count changed');
  ok(schema?.properties?.closure_contract?.properties?.attempted_classes?.const === 6, 'schema attempted-class count changed');
  ok(schema?.properties?.current_result?.properties?.classes_closed?.const === 6, 'schema launch closure state changed');
  ok(schema?.properties?.current_result?.properties?.classes_open?.const === 36, 'schema launch open state changed');

  ok(value?.schema_version === 'status-sovereignty-residual-denominator-wave-03-constitution@1', 'schema_version changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.hypothesis_id === 'SSC-H01', 'wave identity changed');
  ok(value?.issue === 1013 && value?.as_of === '2026-08-04', 'issue or date changed');
  ok(value?.authority === 'class_closure_attempt_constitution_not_empirical_receipt', 'authority escalated');

  const parent = value.parent_custody;
  ok(parent?.wave_02_issue === 785 && parent?.wave_02_cumulative_promotion_pr === 1012, 'Wave 02 parent custody changed');
  ok(parent?.wave_02_promotion_merge === '2af6bb7819a37e51c7198fb48da894445a29e494', 'Wave 02 promotion merge changed');
  ok(parent?.wave_02_current_ledger_path === 'data/research/status-sovereignty-residual-denominator-wave-02-current.json', 'Wave 02 ledger path changed');
  ok(parent?.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(parent?.closed_residual_classes === 6 && parent?.open_residual_classes === 36, 'Wave 02 cumulative accounting changed');
  ok(parent?.terminal_selected_receipts === 6, 'Wave 02 terminal receipt count changed');
  ok(parent?.launch_main_head === 'a69bffa4c7c6934432b2b93816f5b2b6a466a85b', 'launch main head changed');
  ok(same(parent?.launch_main_advancement_paths, EXPECTED_ADVANCEMENT_PATHS), 'launch main advancement paths changed');
  ok(parent?.launch_main_advancement_disjoint === true, 'launch main advancement disjointness weakened');
  ok(parent?.frozen_execution_base === parent?.launch_main_head, 'frozen execution base changed');

  const contract = value.closure_contract;
  ok(contract?.starting_open_classes === 36 && contract?.starting_closed_classes === 6, 'starting class accounting changed');
  ok(contract?.attempted_classes === 6 && contract?.maximum_closed_classes_after_wave === 12, 'attempt ceiling changed');
  ok(contract?.minimum_open_classes_after_full_success === 30, 'minimum open-class floor changed');
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
  ok(counts?.classes_closed_before_wave === 6 && counts?.closed_residual_classes_at_launch === 6, 'historical closure count changed');
  ok(counts?.classes_closed_this_wave === 0 && counts?.open_residual_classes_after_launch === 36, 'Wave 03 class accounting promoted');
  for (const key of [
    'outside_human_dependencies','external_contacts','external_reviews',
    'reviewed_disposition_changes','complete_compact_findings','racial_order_findings',
    'prevalence_findings','coordination_findings','common_purpose_findings',
    'graph_effects','publication_effects','adoption_effects'
  ]) ok(counts?.[key] === 0, `${key} changed`);

  const result = value.current_result;
  ok(result?.terminal_state === 'constitution_frozen_six_amortized_class_attempts_not_executed', 'terminal state changed');
  ok(result?.all_six_issues_opened === true && result?.all_six_branches_created === true, 'fan-out incomplete');
  ok(result?.empirical_acquisition_started === false, 'unreceipted empirical acquisition');
  ok(result?.class_closures_authorized_without_terminal_receipt === false, 'unreceipted closure authorized');
  ok(result?.classes_closed === 6 && result?.classes_open === 36, 'result class accounting changed');
  ok(result?.outside_human_dependency === false && result?.project_blocking === false, 'human or project dependency introduced');
  ok(result?.graph_effect === 'none' && result?.publication_effect === 'none' && result?.adoption_effect === 'none', 'effect authority escalated');

  for (const [name, state] of Object.entries(value.boundaries || {})) {
    if (name.endsWith('_effect')) ok(state === 'none', `${name} changed`);
    else ok(state === false, `${name} weakened`);
  }
  return value;
}

function validateRepositoryBindings(root, value) {
  const ledger = read(root, value.parent_custody.wave_02_current_ledger_path);
  ok(ledger?.counts?.canonical_residual_classes === 42, 'Wave 02 canonical denominator mismatch');
  ok(ledger?.counts?.closed_residual_classes === 6 && ledger?.counts?.open_residual_classes === 36, 'Wave 02 cumulative class accounting mismatch');
  ok(ledger?.counts?.terminal_class_receipts === 6, 'Wave 02 terminal receipt denominator mismatch');
  ok(Array.isArray(ledger?.promoted_class_receipts) && ledger.promoted_class_receipts.length === 6, 'Wave 02 promoted receipt denominator mismatch');
  ok(ledger?.current_result?.all_six_selected_classes_closed === true, 'Wave 02 selected attempts are not all terminal');
  ok(ledger?.current_result?.wave_complete === false, 'Wave 02 complete-compact boundary changed');
  ok(same(ledger?.current_result?.closed_class_ids, EXPECTED_CLOSED_CLASS_IDS), 'Wave 02 closed-class identities changed');

  const selected = new Set(value.lane_attempts.map((row) => row.class_id));
  for (const classId of EXPECTED_CLOSED_CLASS_IDS) ok(!selected.has(classId), `${classId}: closed class selected again`);

  for (const row of value.lane_attempts) {
    const source = read(root, row.source_path);
    const labels = source[row.residual_field];
    ok(Array.isArray(labels), `${row.lane_id}: canonical residual field missing`);
    ok(labels[row.canonical_ordinal - 1] === row.exact_label, `${row.lane_id}: canonical class label does not match source`);
  }

  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status === 0) {
    for (const [label, commit] of [
      ['Wave 02 promotion', value.parent_custody.wave_02_promotion_merge],
      ['Wave 03 launch head', value.parent_custody.launch_main_head],
      ['Wave 03 frozen execution base', value.parent_custody.frozen_execution_base]
    ]) {
      const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root });
      ok(ancestry.status === 0, `${label} is not an ancestor of HEAD`);
    }

    const diff = spawnSync(
      'git',
      ['diff', '--name-only', `${value.parent_custody.wave_02_promotion_merge}..${value.parent_custody.launch_main_head}`],
      { cwd: root, encoding: 'utf8' }
    );
    ok(diff.status === 0, 'launch advancement diff failed');
    const paths = diff.stdout.split(/\r?\n/).filter(Boolean).sort();
    ok(same(paths, EXPECTED_ADVANCEMENT_PATHS), 'launch advancement is not the frozen three-path crawler delta');
  }
}

export function validateConstitution(root = ROOT) {
  const schema = read(root, SCHEMA_PATH);
  const value = read(root, CONSTITUTION_PATH);
  validateConstitutionData(value, schema);
  validateRepositoryBindings(root, value);
  console.log('validate-status-sovereignty-residual-denominator-wave-03-constitution: 6 attempts, 36 open, 6 closed, authority zero');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validateConstitution();
  } catch (error) {
    console.error(`validate-status-sovereignty-residual-denominator-wave-03-constitution: ${error.message}`);
    process.exit(1);
  }
}
