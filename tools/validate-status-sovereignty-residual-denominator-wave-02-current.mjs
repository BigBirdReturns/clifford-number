#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  CURRENT_PATH,
  CONSTITUTION_PATH,
  WAVE01_PATH,
  FIRST_PROGRESS_PATH,
  deriveCurrent
} from './build-status-sovereignty-residual-denominator-wave-02-current.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

function exactKeys(value, keys, label) {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  same(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);
}

function zeroCounts(counts) {
  for (const key of [
    'outside_human_dependencies',
    'external_contacts',
    'external_reviews',
    'reviewed_disposition_changes',
    'complete_compact_findings',
    'racial_order_findings',
    'prevalence_findings',
    'coordination_findings',
    'common_purpose_findings',
    'graph_effects',
    'publication_effects',
    'adoption_effects'
  ]) ok(counts[key] === 0, `${key} changed`);
}

export function validateCurrentShape(current, schema) {
  exactKeys(current, [
    'schema_version','wave_id','hypothesis_id','issue','as_of','authority',
    'source_snapshots','promoted_class_receipts','selected_classes_open',
    'counts','current_result','boundaries'
  ], 'current ledger');

  ok(current.schema_version === 'status-sovereignty-residual-denominator-wave-02-current@1', 'current schema version changed');
  ok(current.wave_id === 'SSC-RD-W02' && current.hypothesis_id === 'SSC-H01' && current.issue === 785, 'current identity changed');
  ok(current.as_of === '2026-08-03', 'current cutoff changed');
  ok(current.authority === 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'current authority changed');

  exactKeys(current.source_snapshots, [
    'constitution_path','wave_01_registry_path','first_promotion_snapshot_path','first_promotion_snapshot_is_historical'
  ], 'source snapshots');
  ok(current.source_snapshots.constitution_path === CONSTITUTION_PATH, 'constitution path changed');
  ok(current.source_snapshots.wave_01_registry_path === WAVE01_PATH, 'Wave-01 path changed');
  ok(current.source_snapshots.first_promotion_snapshot_path === FIRST_PROGRESS_PATH, 'first progress path changed');
  ok(current.source_snapshots.first_promotion_snapshot_is_historical === true, 'first promotion snapshot must be historical');

  ok(Array.isArray(current.promoted_class_receipts) && current.promoted_class_receipts.length === 5, 'four promoted class receipts required');
  unique(current.promoted_class_receipts.map((row) => row.class_id), 'duplicate promoted class id');
  unique(current.promoted_class_receipts.map((row) => row.lane_id), 'duplicate promoted lane id');
  same(current.promoted_class_receipts.map((row) => row.class_id), ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04'], 'promoted class order changed');

  const promotedKeys = [
    'lane_id','class_id','issue','source_pr','merge_commit','constitutional_exact_label',
    'receipt_class_label','labels_exact_match','label_reconciliation','terminal_state',
    'closure_reference_path','class_receipt_path','manifest_combined_sha256','class_closed'
  ];
  for (const row of current.promoted_class_receipts) {
    exactKeys(row, promotedKeys, `${row.class_id} promoted receipt`);
    ok(row.class_closed === true, `${row.class_id} must be closed`);
    ok(/^[0-9a-f]{40}$/.test(row.merge_commit), `${row.class_id} merge commit malformed`);
    ok(/^[0-9a-f]{64}$/.test(row.manifest_combined_sha256), `${row.class_id} manifest malformed`);
  }
  const rd04 = current.promoted_class_receipts[0];
  const rd05 = current.promoted_class_receipts[1];
  const rd01 = current.promoted_class_receipts[2];
  const rd06 = current.promoted_class_receipts[3];
  const rd03 = current.promoted_class_receipts[4];
  ok(rd04.lane_id === 'RD-04' && rd04.issue === 789 && rd04.source_pr === 804, 'RD-04 custody changed');
  ok(rd04.merge_commit === '7b21d1f2b0606a5550b9c26fadc0cb465ba88b7e', 'RD-04 merge custody changed');
  ok(rd04.manifest_combined_sha256 === 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b', 'RD-04 manifest custody changed');
  ok(rd04.terminal_state === 'bounded_source_unavailable', 'RD-04 terminal state changed');
  ok(rd04.labels_exact_match === true && rd04.label_reconciliation === 'none', 'RD-04 label state changed');
  ok(rd05.lane_id === 'RD-05' && rd05.issue === 790 && rd05.source_pr === 805, 'RD-05 custody changed');
  ok(rd05.merge_commit === '209c30585301a1069507d2e6b16db62ff4ffe1bd', 'RD-05 merge custody changed');
  ok(rd05.manifest_combined_sha256 === 'd9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11', 'RD-05 manifest custody changed');
  ok(rd05.terminal_state === 'bounded_non_link', 'RD-05 terminal state changed');
  ok(rd05.labels_exact_match === false, 'RD-05 exact-label mismatch must remain explicit');
  ok(rd05.label_reconciliation === 'receipt_and_seed_label_omit_the_constitutional_qualifier_complete; class identity remains bound by RD-05-C03 and issue 790', 'RD-05 label reconciliation changed');
  ok(rd01.lane_id === 'RD-01' && rd01.issue === 786 && rd01.source_pr === 801, 'RD-01 custody changed');
  ok(rd01.merge_commit === '64af19ce7f860a7024a37ba5b6eef796b57c87b1', 'RD-01 merge custody changed');
  ok(rd01.manifest_combined_sha256 === '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798', 'RD-01 manifest custody changed');
  ok(rd01.terminal_state === 'bounded_source_unavailable', 'RD-01 terminal state changed');
  ok(rd01.labels_exact_match === true && rd01.label_reconciliation === 'none', 'RD-01 label state changed');
  ok(rd06.lane_id === 'RD-06' && rd06.issue === 791 && rd06.source_pr === 806, 'RD-06 custody changed');
  ok(rd06.merge_commit === 'd7983e19c0783a048afb19adde0fb65ccf94c726', 'RD-06 merge custody changed');
  ok(rd06.manifest_combined_sha256 === '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5', 'RD-06 manifest custody changed');
  ok(rd06.terminal_state === 'bounded_source_restricted', 'RD-06 terminal state changed');
  ok(rd06.labels_exact_match === true && rd06.label_reconciliation === 'none', 'RD-06 label state changed');
  ok(rd03.lane_id === 'RD-03' && rd03.issue === 788 && rd03.source_pr === 803, 'RD-03 custody changed');
  ok(rd03.merge_commit === '580d9c998f747330d190bed5011c7a1a517a1c0d', 'RD-03 merge custody changed');
  ok(rd03.manifest_combined_sha256 === '1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e', 'RD-03 manifest custody changed');
  ok(rd03.terminal_state === 'bounded_source_unavailable', 'RD-03 terminal state changed');
  ok(rd03.labels_exact_match === false, 'RD-03 label mismatch must remain explicit');
  ok(rd03.label_reconciliation === 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact', 'RD-03 label reconciliation changed');

  ok(Array.isArray(current.selected_classes_open) && current.selected_classes_open.length === 1, 'two selected classes must remain open');
  unique(current.selected_classes_open.map((row) => row.class_id), 'duplicate open selected class');
  same(current.selected_classes_open.map((row) => row.class_id), ['RD-02-C04'], 'open selected class order changed');
  for (const row of current.selected_classes_open) {
    exactKeys(row, ['lane_id','class_id','issue','constitutional_exact_label','state','class_closed'], `${row.class_id} open class`);
    ok(row.state === 'open' && row.class_closed === false, `${row.class_id} overclosed`);
  }

  const allIds = [
    ...current.promoted_class_receipts.map((row) => row.class_id),
    ...current.selected_classes_open.map((row) => row.class_id)
  ];
  unique(allIds, 'closed and open selected classes overlap');
  ok(allIds.length === 6, 'six selected class identities required');

  exactKeys(current.counts, [
    'canonical_residual_classes','selected_class_attempts','terminal_class_receipts',
    'classes_closed_this_wave','closed_residual_classes','open_residual_classes',
    'label_reconciliations','outside_human_dependencies','external_contacts',
    'external_reviews','reviewed_disposition_changes','complete_compact_findings',
    'racial_order_findings','prevalence_findings','coordination_findings',
    'common_purpose_findings','graph_effects','publication_effects','adoption_effects'
  ], 'counts');
  ok(current.counts.canonical_residual_classes === 42, 'canonical denominator changed');
  ok(current.counts.selected_class_attempts === 6, 'selected attempt count changed');
  ok(current.counts.terminal_class_receipts === 5, 'terminal receipt count changed');
  ok(current.counts.classes_closed_this_wave === 5 && current.counts.closed_residual_classes === 5, 'closed class accounting changed');
  ok(current.counts.open_residual_classes === 37, 'open class accounting changed');
  ok(current.counts.closed_residual_classes + current.counts.open_residual_classes === 42, 'atlas arithmetic changed');
  ok(current.counts.label_reconciliations === current.promoted_class_receipts.filter((row) => !row.labels_exact_match).length, 'label reconciliation count changed');
  zeroCounts(current.counts);

  exactKeys(current.current_result, [
    'terminal_state','classes_closed','classes_open','closed_class_ids',
    'open_selected_class_ids','all_six_selected_classes_closed','wave_complete',
    'outside_human_dependency','project_blocking','graph_effect','publication_effect','adoption_effect'
  ], 'current result');
  ok(current.current_result.terminal_state === 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open', 'current terminal state changed');
  ok(current.current_result.classes_closed === 5 && current.current_result.classes_open === 37, 'current result arithmetic changed');
  same(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04'], 'closed class ids changed');
  same(current.current_result.open_selected_class_ids, ['RD-02-C04'], 'open selected ids changed');
  ok(current.current_result.all_six_selected_classes_closed === false && current.current_result.wave_complete === false, 'Wave 02 overclosed');
  ok(current.current_result.outside_human_dependency === false && current.current_result.project_blocking === false, 'human or project dependency introduced');
  for (const key of ['graph_effect','publication_effect','adoption_effect']) ok(current.current_result[key] === 'none', `${key} changed`);

  exactKeys(current.boundaries, [
    'historical_first_promotion_snapshot_is_current_ledger','one_class_closure_closes_lane',
    'two_class_closures_close_wave','bounded_non_link_is_no_private_influence',
    'source_unavailability_is_event_absence','source_unavailability_is_noncompliance',
    'publication_is_observed_implementation','class_closure_is_complete_compact',
    'functional_convergence_is_coordination_or_common_purpose',
    'graph_effect','publication_effect','adoption_effect'
  ], 'boundaries');
  for (const [key, value] of Object.entries(current.boundaries)) {
    if (key.endsWith('_effect')) ok(value === 'none', `${key} changed`);
    else ok(value === false, `${key} weakened`);
  }

  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json', 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === current.schema_version, 'schema version binding changed');
  ok(schema?.properties?.promoted_class_receipts?.minItems === 5 && schema?.properties?.promoted_class_receipts?.maxItems === 5, 'schema receipt denominator changed');
  ok(schema?.properties?.selected_classes_open?.minItems === 1 && schema?.properties?.selected_classes_open?.maxItems === 1, 'schema open-class denominator changed');
  ok(schema?.properties?.counts?.properties?.closed_residual_classes?.const === 5, 'schema closed count changed');
  ok(schema?.properties?.counts?.properties?.open_residual_classes?.const === 37, 'schema open count changed');
  return current;
}

function validateGitCustody(root, current) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  for (const row of current.promoted_class_receipts) {
    const exists = spawnSync('git', ['cat-file', '-e', `${row.merge_commit}^{commit}`], { cwd: root, encoding: 'utf8' });
    ok(exists.status === 0, `${row.class_id} merge commit missing from repository`);
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', row.merge_commit, 'HEAD'], { cwd: root, encoding: 'utf8' });
    ok(ancestor.status === 0, `${row.class_id} merge commit is not an ancestor of HEAD`);
  }
}

export function validateCurrent(root = ROOT) {
  const current = read(root, CURRENT_PATH);
  const schema = read(root, SCHEMA_PATH);
  validateCurrentShape(current, schema);
  const derived = deriveCurrent(root);
  same(current, derived, 'committed current ledger does not match exact closure receipts');
  validateGitCustody(root, current);
  return current;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const current = validateCurrent(ROOT);
  console.log(`Wave-02 current ledger validated: ${current.counts.open_residual_classes} open / ${current.counts.closed_residual_classes} closed`);
}
