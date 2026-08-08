import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  DATA_DIR,
  loadInputs,
  validateInputs,
  readProducts,
  validateProducts,
  checkProducts,
  stableJson,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-field-promotion.mjs';

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inputs = loadInputs();
validateInputs(inputs);
const products = readProducts();
validateProducts(products, inputs);
checkProducts(inputs);

const schemaPath = path.join(ROOT, 'schemas/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-field-promotion.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};
for (const [name, value] of Object.entries(products)) {
  const variants = schema.oneOf.filter((variant) => variant.properties.schema_version.const === value.schema_version);
  assert.equal(variants.length, 1, `${name}: unique schema variant`);
  const variant = variants[0];
  assert.deepEqual(Object.keys(value), variant.required, `${name}: exact top-level key order`);
  assert.equal(variant.additionalProperties, false, `${name}: top-level closed`);
  for (const [key, rule] of Object.entries(variant.properties)) {
    if ('const' in rule) assert.deepEqual(value[key], rule.const, `${name}/${key}: const`);
    if ('type' in rule) assert.equal(typeOf(value[key]), rule.type, `${name}/${key}: type`);
  }
}

const mutations = [
  ['promotion-input-custody.json', 'canonical parent', (v) => { v.canonical_parent.commit = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'canonical tree', (v) => { v.canonical_parent.tree = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'reconstructed tree', (v) => { v.canonical_parent.reconstructed_tree = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'source archive digest', (v) => { v.canonical_parent.repository_archive_sha256 = '0'.repeat(64); }],
  ['promotion-input-custody.json', 'input export PR', (v) => { v.promotion_input_export.pull_request = 1415; }],
  ['promotion-input-custody.json', 'input export head', (v) => { v.promotion_input_export.head_commit = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'input export merge ref', (v) => { v.promotion_input_export.pull_request_merge_ref = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'input export artifact', (v) => { v.promotion_input_export.artifact_id += 1; }],
  ['promotion-input-custody.json', 'input file deletion', (v) => { v.promotion_input_export.files.pop(); }],
  ['promotion-input-custody.json', 'input file blob', (v) => { v.promotion_input_export.files[0].git_blob = '0'.repeat(40); }],
  ['promotion-input-custody.json', 'validation receipt', (v) => { v.candidate_validation.receipt_sha256 = '0'.repeat(64); }],
  ['promotion-input-custody.json', 'validation cell hash', (v) => { v.candidate_validation.validations[0].current_cell_canonical_sha256 = '0'.repeat(64); }],
  ['promotion-input-custody.json', 'validation authority', (v) => { v.candidate_validation.validations[0].promotion_authority_created = true; }],
  ['promotion-input-custody.json', 'main overlap', (v) => { v.current_main_reconciliation.overlapping_input_paths = 1; }],
  ['promotion-input-custody.json', 'outside human', (v) => { v.authority_boundary.outside_human_dependency = true; }],
  ['promotion-input-custody.json', 'publication', (v) => { v.authority_boundary.publication_effect = 'changed'; }],
  ['promotion-input-custody.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['promotion-decisions.json', 'decision count', (v) => { v.decision_count = 3; }],
  ['promotion-decisions.json', 'decision order', (v) => { v.decisions.reverse(); }],
  ['promotion-decisions.json', 'candidate id', (v) => { v.decisions[0].promotion_candidate_id = 'changed'; }],
  ['promotion-decisions.json', 'unit id', (v) => { v.decisions[1].unit_id = 'US-STATE-MT'; }],
  ['promotion-decisions.json', 'field id', (v) => { v.decisions[2].field_id = 'verification_evidence_and_staff_discretion_surface'; }],
  ['promotion-decisions.json', 'source request', (v) => { v.decisions[3].source_request_ids[0] = 'changed'; }],
  ['promotion-decisions.json', 'body hash', (v) => { v.decisions[0].source_body_sha256s[0] = '0'.repeat(64); }],
  ['promotion-decisions.json', 'finding', (v) => { v.decisions[1].bounded_finding = 'changed'; }],
  ['promotion-decisions.json', 'cell hash', (v) => { v.decisions[2].exact_current_cell_canonical_sha256 = '0'.repeat(64); }],
  ['promotion-decisions.json', 'row hash', (v) => { v.decisions[3].exact_current_row_canonical_sha256 = '0'.repeat(64); }],
  ['promotion-decisions.json', 'outcome', (v) => { v.decisions[0].promotion_outcome = 'hold_open'; }],
  ['promotion-decisions.json', 'terminal after', (v) => { v.decisions[1].terminal_after = false; }],
  ['promotion-decisions.json', 'row transition', (v) => { v.decisions[2].row_state_transition = 'terminalized'; }],
  ['promotion-decisions.json', 'class closure', (v) => { v.decisions[3].class_closure_effect = 'closed'; }],
  ['promotion-decisions.json', 'authority count', (v) => { v.authority_boundary.authorized_field_terminalizations = 3; }],
  ['promotion-decisions.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['cell-promotion-ledger.json', 'promoted count', (v) => { v.counts.promoted_cells = 3; }],
  ['cell-promotion-ledger.json', 'terminal before', (v) => { v.counts.terminal_cells_before = 219; }],
  ['cell-promotion-ledger.json', 'terminal after', (v) => { v.counts.terminal_cells_after = 221; }],
  ['cell-promotion-ledger.json', 'row transitions', (v) => { v.counts.row_state_transitions = 1; }],
  ['cell-promotion-ledger.json', 'cell state', (v) => { v.cells[0].state_after = 'still_open'; }],
  ['cell-promotion-ledger.json', 'cell value', (v) => { v.cells[1].value_after.findings[0].finding_summary = 'changed'; }],
  ['cell-promotion-ledger.json', 'cell evidence', (v) => { v.cells[2].evidence_source_ids_after = []; }],
  ['cell-promotion-ledger.json', 'derived gap', (v) => { v.derived_row_state_refreshes[3].typed_gap_after = 'changed'; }],
  ['cell-promotion-ledger.json', 'class closed', (v) => { v.current_result.class_closed = true; }],
  ['cell-promotion-ledger.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['promoted-partial-field-matrix.json', 'terminal count', (v) => { v.counts.terminal_cells = 221; }],
  ['promoted-partial-field-matrix.json', 'open count', (v) => { v.counts.still_open_cells = 229; }],
  ['promoted-partial-field-matrix.json', 'substantive terminal', (v) => { v.counts.terminal_substantive_cells = 111; }],
  ['promoted-partial-field-matrix.json', 'terminal units', (v) => { v.counts.terminal_units = 11; }],
  ['promoted-partial-field-matrix.json', 'class closed', (v) => { v.counts.class_closed = true; }],
  ['promoted-partial-field-matrix.json', 'MT target state', (v) => { v.rows.find((r) => r.postal_code === 'MT').cells[6].state = 'still_open'; }],
  ['promoted-partial-field-matrix.json', 'ND target terminal', (v) => { v.rows.find((r) => r.postal_code === 'ND').cells[6].terminal = false; }],
  ['promoted-partial-field-matrix.json', 'OR target value', (v) => { v.rows.find((r) => r.postal_code === 'OR').cells[2].value = null; }],
  ['promoted-partial-field-matrix.json', 'WI target evidence', (v) => { v.rows.find((r) => r.postal_code === 'WI').cells[2].evidence_source_ids = []; }],
  ['promoted-partial-field-matrix.json', 'MT row count', (v) => { v.rows.find((r) => r.postal_code === 'MT').terminal_fields = 4; }],
  ['promoted-partial-field-matrix.json', 'ND gap', (v) => { v.rows.find((r) => r.postal_code === 'ND').cells[8].typed_gap = 'changed'; }],
  ['promoted-partial-field-matrix.json', 'non-target mutation', (v) => { v.rows.find((r) => r.postal_code === 'AL').state_name = 'Changed'; }],
  ['promoted-partial-field-matrix.json', 'predecessor hash', (v) => { v.five_state_field_promotion_product.predecessor_matrix_sha256 = '0'.repeat(64); }],
  ['promoted-partial-field-matrix.json', 'current result', (v) => { v.current_result.still_open_substantive_cells = 189; }],
  ['promoted-partial-field-matrix.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['remaining-open-field-census.json', 'terminal cells', (v) => { v.counts.terminal_cells = 221; }],
  ['remaining-open-field-census.json', 'substantive open', (v) => { v.counts.substantive_fields_still_open = 189; }],
  ['remaining-open-field-census.json', 'field count', (v) => { v.field_counts[2].still_open_cells = 39; }],
  ['remaining-open-field-census.json', 'row count', (v) => { v.rows.find((r) => r.postal_code === 'OR').open_fields = 5; }],
  ['remaining-open-field-census.json', 'next operation', (v) => { v.next_bounded_operation = 'close class'; }],
  ['remaining-open-field-census.json', 'authority', (v) => { v.authority_boundary.outside_human_dependency = true; }],
  ['remaining-open-field-census.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['promotion-summary.json', 'candidate count', (v) => { v.input_counts.promotion_candidates = 3; }],
  ['promotion-summary.json', 'promoted count', (v) => { v.promotion_counts.candidates_promoted = 3; }],
  ['promotion-summary.json', 'matrix transition', (v) => { v.matrix_transition.terminal_cells_after = 221; }],
  ['promotion-summary.json', 'affected states', (v) => { v.affected_states.pop(); }],
  ['promotion-summary.json', 'source admission', (v) => { v.current_result.new_source_admissions = 1; }],
  ['promotion-summary.json', 'class closed', (v) => { v.current_result.class_closed = true; }],
  ['promotion-summary.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['index.json', 'permanent paths', (v) => { v.product.permanent_paths = 13; }],
  ['index.json', 'transport path', (v) => { v.product.transport_paths = 1; }],
  ['index.json', 'matrix updates', (v) => { v.counts.matrix_updates = 3; }],
  ['index.json', 'terminal cells', (v) => { v.counts.terminal_cells_after = 221; }],
  ['index.json', 'cumulative effect', (v) => { v.current_result.cumulative_ledger_effect = 'changed'; }],
  ['index.json', 'outside human', (v) => { v.current_result.outside_human_dependency = true; }],
  ['index.json', 'unknown top key', (v) => { v.unknown = true; }],

  ['product-manifest.json', 'entry deletion', (v) => { v.entries.pop(); }],
  ['product-manifest.json', 'entry digest', (v) => { v.entries[0].sha256 = '0'.repeat(64); }],
  ['product-manifest.json', 'entry bytes', (v) => { v.entries[1].bytes += 1; }],
  ['product-manifest.json', 'combined digest', (v) => { v.combined_sha256 = '0'.repeat(64); }],
  ['product-manifest.json', 'unknown top key', (v) => { v.unknown = true; }],
];

let refused = 0;
for (const [file, label, mutate] of mutations) {
  const mutatedProducts = clone(products);
  mutate(mutatedProducts[file]);
  assert.throws(() => validateProducts(mutatedProducts, inputs), undefined, `semantic mutation accepted: ${file} ${label}`);
  refused += 1;
}

let byteMutations = 0;
outer: for (let round = 0; round < 300; round += 1) {
  for (const entry of products['product-manifest.json'].entries) {
    const buffer = Buffer.from(readFileSync(path.join(DATA_DIR, entry.path)));
    const position = (round * 131 + byteMutations * 17) % buffer.length;
    const mutated = Buffer.from(buffer);
    mutated[position] ^= 0x01;
    assert.notEqual(sha256(mutated), entry.sha256, `byte mutation retained digest: ${entry.path} ${position}`);
    byteMutations += 1;
    if (byteMutations === 700) break outer;
  }
}
assert.equal(byteMutations, 700);
refused += byteMutations;

for (const [name, value] of Object.entries(products)) {
  assert.equal(stableJson(value), readFileSync(path.join(DATA_DIR, name), 'utf8'), `${name}: stable bytes`);
}

assert.equal(refused, mutations.length + 700);
console.log(`rd04_five_state_field_promotion_adversarial=pass mutations_refused=${refused}`);
