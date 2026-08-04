#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  RECONCILIATION_PATH,
  CURRENT_LEDGER_PROMOTION_MERGE,
  EXPECTED_RECEIPTS,
  deriveReconciliation
} from './build-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-02-reconciliation.schema.json';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

function exactKeys(value, keys, label) {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  same(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);
}

function allZero(value, keys, label) {
  for (const key of keys) ok(value?.[key] === 0, `${label}.${key} changed`);
}

function allNone(value, keys, label) {
  for (const key of keys) ok(value?.[key] === 'none', `${label}.${key} changed`);
}

export function validateReconciliationShape(value, schema) {
  exactKeys(value, [
    'schema_version','wave_id','hypothesis_id','issue','as_of','title','authority',
    'parent_custody','selected_class_execution','canonical_residual_atlas',
    'promoted_class_receipts','counts','current_result','boundaries'
  ], 'reconciliation');

  ok(value.schema_version === 'status-sovereignty-residual-denominator-wave-02-reconciliation@1', 'schema identity changed');
  ok(value.wave_id === 'SSC-RD-W02' && value.hypothesis_id === 'SSC-H01' && value.issue === 785, 'wave identity changed');
  ok(value.as_of === '2026-08-04', 'reconciliation cutoff changed');
  ok(value.title === 'SSC residual-denominator Wave 02 · six class-closure reconciliation', 'title changed');
  ok(value.authority === 'execution_wave_reconciled_six_class_closures_without_broader_empirical_authority', 'authority changed');

  exactKeys(value.parent_custody, [
    'wave_01_registry_path','wave_02_constitution_path','wave_02_current_ledger_path',
    'wave_01_issue','wave_01_reconciliation_pr','wave_02_constitution_pr',
    'wave_02_current_ledger_pr','wave_02_current_ledger_merge','frozen_execution_base',
    'canonical_residual_classes_at_start','closed_residual_classes_at_start',
    'open_residual_classes_at_start'
  ], 'parent custody');
  ok(value.parent_custody.wave_01_registry_path === 'data/research/status-sovereignty-residual-denominator-wave-01.json', 'Wave-01 registry path changed');
  ok(value.parent_custody.wave_02_constitution_path === 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json', 'Wave-02 constitution path changed');
  ok(value.parent_custody.wave_02_current_ledger_path === 'data/research/status-sovereignty-residual-denominator-wave-02-current.json', 'current ledger path changed');
  ok(value.parent_custody.wave_01_issue === 615 && value.parent_custody.wave_01_reconciliation_pr === 660, 'Wave-01 parent custody changed');
  ok(value.parent_custody.wave_02_constitution_pr === 796 && value.parent_custody.wave_02_current_ledger_pr === 1012, 'Wave-02 PR custody changed');
  ok(value.parent_custody.wave_02_current_ledger_merge === CURRENT_LEDGER_PROMOTION_MERGE, 'current ledger merge custody changed');
  ok(value.parent_custody.frozen_execution_base === 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'frozen execution base changed');
  ok(value.parent_custody.canonical_residual_classes_at_start === 42, 'starting canonical denominator changed');
  ok(value.parent_custody.closed_residual_classes_at_start === 0 && value.parent_custody.open_residual_classes_at_start === 42, 'starting residual accounting changed');

  exactKeys(value.selected_class_execution, [
    'attempted_classes','terminal_class_receipts','all_selected_attempts_terminal',
    'selected_class_ids','promotion_order_class_ids','terminal_state_counts'
  ], 'selected class execution');
  ok(value.selected_class_execution.attempted_classes === 6, 'attempted-class count changed');
  ok(value.selected_class_execution.terminal_class_receipts === 6, 'terminal-receipt count changed');
  ok(value.selected_class_execution.all_selected_attempts_terminal === true, 'selected attempt left unterminated');
  same(value.selected_class_execution.selected_class_ids, [
    'RD-01-C03','RD-02-C04','RD-03-C04','RD-04-C01','RD-05-C03','RD-06-C01'
  ], 'selected class identities changed');
  same(value.selected_class_execution.promotion_order_class_ids, [
    'RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04','RD-02-C04'
  ], 'promotion order changed');
  exactKeys(value.selected_class_execution.terminal_state_counts, [
    'evidence_complete','bounded_non_link','bounded_source_restricted',
    'bounded_source_unavailable','still_open'
  ], 'terminal state counts');
  same(value.selected_class_execution.terminal_state_counts, {
    evidence_complete: 0,
    bounded_non_link: 1,
    bounded_source_restricted: 1,
    bounded_source_unavailable: 4,
    still_open: 0
  }, 'terminal-state distribution changed');

  exactKeys(value.canonical_residual_atlas, [
    'class_groups','all_class_ids','selected_class_ids','remaining_open_class_ids',
    'canonical_residual_classes','closed_before_wave','open_before_wave',
    'classes_closed_this_wave','closed_after_wave','open_after_wave',
    'nonselected_classes_preserved_open','selected_classes_still_open'
  ], 'canonical residual atlas');
  ok(value.canonical_residual_atlas.class_groups === 6, 'class-group denominator changed');
  ok(Array.isArray(value.canonical_residual_atlas.all_class_ids) && value.canonical_residual_atlas.all_class_ids.length === 42, '42 canonical class ids required');
  ok(Array.isArray(value.canonical_residual_atlas.selected_class_ids) && value.canonical_residual_atlas.selected_class_ids.length === 6, 'six selected class ids required');
  ok(Array.isArray(value.canonical_residual_atlas.remaining_open_class_ids) && value.canonical_residual_atlas.remaining_open_class_ids.length === 36, '36 remaining open class ids required');
  unique(value.canonical_residual_atlas.all_class_ids, 'duplicate canonical class id');
  unique(value.canonical_residual_atlas.selected_class_ids, 'duplicate selected class id');
  unique(value.canonical_residual_atlas.remaining_open_class_ids, 'duplicate remaining class id');
  same(value.canonical_residual_atlas.selected_class_ids, value.selected_class_execution.selected_class_ids, 'selected class projection changed');
  const selectedSet = new Set(value.canonical_residual_atlas.selected_class_ids);
  const remainingSet = new Set(value.canonical_residual_atlas.remaining_open_class_ids);
  ok(value.canonical_residual_atlas.all_class_ids.every((id) => selectedSet.has(id) || remainingSet.has(id)), 'canonical class omitted from selected/open partition');
  ok(value.canonical_residual_atlas.selected_class_ids.every((id) => !remainingSet.has(id)), 'selected class remains in open partition');
  ok(value.canonical_residual_atlas.remaining_open_class_ids.every((id) => !selectedSet.has(id)), 'open class overlaps selected partition');
  ok(selectedSet.size + remainingSet.size === 42, 'selected/open class partition arithmetic changed');
  ok(value.canonical_residual_atlas.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(value.canonical_residual_atlas.closed_before_wave === 0 && value.canonical_residual_atlas.open_before_wave === 42, 'pre-wave accounting changed');
  ok(value.canonical_residual_atlas.classes_closed_this_wave === 6, 'Wave-02 closure count changed');
  ok(value.canonical_residual_atlas.closed_after_wave === 6 && value.canonical_residual_atlas.open_after_wave === 36, 'post-wave accounting changed');
  ok(value.canonical_residual_atlas.closed_after_wave + value.canonical_residual_atlas.open_after_wave === 42, 'post-wave denominator arithmetic changed');
  ok(value.canonical_residual_atlas.nonselected_classes_preserved_open === 36, 'nonselected open custody changed');
  ok(value.canonical_residual_atlas.selected_classes_still_open === 0, 'selected class remains open');

  ok(Array.isArray(value.promoted_class_receipts) && value.promoted_class_receipts.length === 6, 'six promoted receipts required');
  same(value.promoted_class_receipts, EXPECTED_RECEIPTS, 'promoted receipt custody changed');
  unique(value.promoted_class_receipts.map((row) => row.class_id), 'duplicate promoted class id');
  for (const row of value.promoted_class_receipts) {
    exactKeys(row, [
      'lane_id','class_id','issue','source_pr','merge_commit',
      'constitutional_exact_label','receipt_class_label','labels_exact_match',
      'label_reconciliation','terminal_state','closure_reference_path',
      'class_receipt_path','manifest_combined_sha256','class_closed'
    ], `${row.class_id} promoted receipt`);
    ok(row.class_closed === true, `${row.class_id} reopened`);
    ok(/^[0-9a-f]{40}$/.test(row.merge_commit), `${row.class_id} merge commit malformed`);
    ok(/^[0-9a-f]{64}$/.test(row.manifest_combined_sha256), `${row.class_id} manifest digest malformed`);
  }

  exactKeys(value.counts, [
    'execution_lanes','selected_class_attempts','terminal_class_receipts',
    'classes_closed_this_wave','canonical_residual_classes','closed_residual_classes',
    'open_residual_classes','nonselected_classes_preserved_open',
    'selected_classes_still_open','label_reconciliations',
    'outside_human_dependencies','external_contacts','external_reviews',
    'reviewed_disposition_changes','complete_compact_findings',
    'racial_order_findings','prevalence_findings','coordination_findings',
    'common_purpose_findings','graph_effects','publication_effects','adoption_effects'
  ], 'counts');
  ok(value.counts.execution_lanes === 6 && value.counts.selected_class_attempts === 6, 'execution denominator changed');
  ok(value.counts.terminal_class_receipts === 6 && value.counts.classes_closed_this_wave === 6, 'receipt/closure accounting changed');
  ok(value.counts.canonical_residual_classes === 42, 'counted canonical denominator changed');
  ok(value.counts.closed_residual_classes === 6 && value.counts.open_residual_classes === 36, 'counted residual accounting changed');
  ok(value.counts.closed_residual_classes + value.counts.open_residual_classes === 42, 'counted denominator arithmetic changed');
  ok(value.counts.nonselected_classes_preserved_open === 36 && value.counts.selected_classes_still_open === 0, 'selected/nonselected accounting changed');
  ok(value.counts.label_reconciliations === 1, 'row-level label reconciliation count changed');
  allZero(value.counts, [
    'outside_human_dependencies','external_contacts','external_reviews',
    'reviewed_disposition_changes','complete_compact_findings',
    'racial_order_findings','prevalence_findings','coordination_findings',
    'common_purpose_findings','graph_effects','publication_effects','adoption_effects'
  ], 'counts');

  exactKeys(value.current_result, [
    'terminal_state','execution_wave_complete','all_six_selected_attempts_terminal',
    'selected_class_closures','current_ledger_wave_complete',
    'residual_denominator_complete','parent_execution_issue_complete',
    'next_wave_may_select_only_from_remaining_open_classes',
    'next_wave_created_by_this_reconciliation','outside_human_dependency',
    'project_blocking','graph_effect','publication_effect','adoption_effect'
  ], 'current result');
  ok(value.current_result.terminal_state === 'wave02_execution_complete_six_selected_classes_closed_thirty_six_nonselected_classes_open', 'result terminal state changed');
  ok(value.current_result.execution_wave_complete === true, 'execution wave not complete');
  ok(value.current_result.all_six_selected_attempts_terminal === true && value.current_result.selected_class_closures === 6, 'selected closure result changed');
  ok(value.current_result.current_ledger_wave_complete === false, 'current ledger completion boundary changed');
  ok(value.current_result.residual_denominator_complete === false, 'residual denominator overclosed');
  ok(value.current_result.parent_execution_issue_complete === true, 'parent execution issue left open in product semantics');
  ok(value.current_result.next_wave_may_select_only_from_remaining_open_classes === true, 'next-wave selection boundary weakened');
  ok(value.current_result.next_wave_created_by_this_reconciliation === false, 'reconciliation silently created successor wave');
  ok(value.current_result.outside_human_dependency === false && value.current_result.project_blocking === false, 'dependency boundary changed');
  allNone(value.current_result, ['graph_effect','publication_effect','adoption_effect'], 'current result');

  exactKeys(value.boundaries, [
    'execution_wave_complete_is_residual_denominator_complete',
    'six_class_closures_are_complete_compact',
    'selected_class_closure_closes_broader_lane',
    'bounded_source_unavailable_is_event_absence',
    'bounded_source_restricted_is_fairness_or_nonparticipation_finding',
    'bounded_non_link_is_no_private_influence',
    'legal_entity_resolution_is_common_control',
    'license_or_green_light_is_leverage_draw',
    'executed_loan_is_repayment_or_public_recovery',
    'version_history_is_effective_implementation',
    'recommendation_record_is_adopted_output',
    'named_offeror_universe_proves_equal_support',
    'functional_convergence_is_coordination_or_common_purpose',
    'remaining_open_class_count_is_prevalence',
    'next_wave_created_by_this_reconciliation',
    'graph_effect','publication_effect','adoption_effect'
  ], 'boundaries');
  for (const [key, boundary] of Object.entries(value.boundaries)) {
    if (key.endsWith('_effect')) ok(boundary === 'none', `${key} changed`);
    else ok(boundary === false, `${key} weakened`);
  }

  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-residual-denominator-wave-02-reconciliation.schema.json', 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === value.schema_version, 'schema version binding changed');
  ok(schema?.properties?.promoted_class_receipts?.minItems === 6 && schema?.properties?.promoted_class_receipts?.maxItems === 6, 'schema receipt denominator changed');
  ok(schema?.properties?.canonical_residual_atlas?.properties?.all_class_ids?.minItems === 42, 'schema canonical denominator changed');
  ok(schema?.properties?.canonical_residual_atlas?.properties?.remaining_open_class_ids?.minItems === 36, 'schema remaining-open denominator changed');
  ok(schema?.properties?.counts?.properties?.closed_residual_classes?.const === 6, 'schema closed count changed');
  ok(schema?.properties?.counts?.properties?.open_residual_classes?.const === 36, 'schema open count changed');
  return value;
}

function validateGitCustody(root, value) {
  const inside = spawnSync('git', ['rev-parse','--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;

  for (const row of value.promoted_class_receipts) {
    const exists = spawnSync('git', ['cat-file','-e',`${row.merge_commit}^{commit}`], { cwd: root, encoding: 'utf8' });
    ok(exists.status === 0, `${row.class_id} merge commit missing`);
    const ancestor = spawnSync('git', ['merge-base','--is-ancestor',row.merge_commit,'HEAD'], { cwd: root, encoding: 'utf8' });
    ok(ancestor.status === 0, `${row.class_id} merge commit is not an ancestor of HEAD`);
  }

  const ledgerAncestor = spawnSync('git', ['merge-base','--is-ancestor',CURRENT_LEDGER_PROMOTION_MERGE,'HEAD'], { cwd: root, encoding: 'utf8' });
  ok(ledgerAncestor.status === 0, 'six-receipt cumulative promotion is not an ancestor of HEAD');

  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\\n').filter(Boolean);
  ok(!tracked.some((rel) => rel.includes('temporary-ssc-wave02-reconciliation') || rel.startsWith('.github/tmp/ssc-wave02-reconciliation')), 'temporary Wave-02 reconciliation transport retained');
}

export function validateReconciliation(root = ROOT) {
  const value = read(root, RECONCILIATION_PATH);
  const schema = read(root, SCHEMA_PATH);
  validateReconciliationShape(value, schema);
  same(value, deriveReconciliation(root), 'committed reconciliation differs from exact derivation');
  validateGitCustody(root, value);
  return value;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const value = validateReconciliation(ROOT);
  console.log(`Wave-02 reconciliation validated: ${value.counts.terminal_class_receipts}/6 selected attempts terminal; ${value.counts.closed_residual_classes} closed / ${value.counts.open_residual_classes} open`);
}
