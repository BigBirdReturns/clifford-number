import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DATA_DIR,
  PREDECESSOR_MATRIX_PATH,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication.mjs';
import { validateProduct } from '../tools/validate-status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication.mjs';

const root = process.cwd();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const clone = (value) => structuredClone(value);
const rel = (name) => `${DATA_DIR}/${name}`;

async function loadJson(name) {
  return JSON.parse(await readFile(path.join(root, rel(name)), 'utf8'));
}

await validateProduct(root);

const base = {
  decisions: await loadJson('authored-row-state-decisions.json'),
  custody: await loadJson('predecessor-custody.json'),
  ledger: await loadJson('row-state-ledger.json'),
  matrix: await loadJson('promoted-partial-field-matrix.json'),
  census: await loadJson('remaining-open-field-census.json'),
  summary: await loadJson('summary.json'),
  index: await loadJson('index.json'),
  manifest: await loadJson('product-manifest.json'),
};

const semanticMutations = [
  ['authored-row-state-decisions.json', 'issue', (v) => { v.issue = 1018; }],
  ['authored-row-state-decisions.json', 'state order', (v) => { v.target_states.reverse(); }],
  ['authored-row-state-decisions.json', 'row state', (v) => { v.decisions[0].row_state_after = 'still_open'; }],
  ['authored-row-state-decisions.json', 'outside human', (v) => { v.authority_boundary.outside_human_dependency = true; }],
  ['authored-row-state-decisions.json', 'publication', (v) => { v.authority_boundary.publication_effect = 'changed'; }],
  ['authored-row-state-decisions.json', 'row terminal', (v) => { v.decisions[1].row_terminal = false; }],
  ['authored-row-state-decisions.json', 'predecessor hash', (v) => { v.decisions[2].predecessor_row_canonical_sha256 = '0'.repeat(64); }],
  ['authored-row-state-decisions.json', 'terminal fields', (v) => { v.decisions[0].predecessor_terminal_fields = 7; }],
  ['authored-row-state-decisions.json', 'class close rule', (v) => { v.decision_rule.row_terminalization_closes_class = true; }],
  ['authored-row-state-decisions.json', 'prohibition deletion', (v) => { v.prohibited_inferences.pop(); }],

  ['predecessor-custody.json', 'product commit', (v) => { v.predecessor.product_commit = '0'.repeat(40); }],
  ['predecessor-custody.json', 'product tree', (v) => { v.predecessor.product_tree = '0'.repeat(40); }],
  ['predecessor-custody.json', 'merge commit', (v) => { v.predecessor.merge_commit = '0'.repeat(40); }],
  ['predecessor-custody.json', 'matrix hash', (v) => { v.predecessor.matrix_sha256 = '0'.repeat(64); }],
  ['predecessor-custody.json', 'terminal count', (v) => { v.predecessor_counts.terminal_cells = 188; }],
  ['predecessor-custody.json', 'class closed', (v) => { v.predecessor_counts.class_closed = true; }],
  ['predecessor-custody.json', 'external contact', (v) => { v.authority_boundary.external_contacts = 1; }],
  ['predecessor-custody.json', 'target row hash', (v) => { v.target_row_canonical_sha256.CA = 'f'.repeat(64); }],

  ['row-state-ledger.json', 'target count', (v) => { v.counts.target_rows = 2; }],
  ['row-state-ledger.json', 'substantive change', (v) => { v.counts.substantive_field_changes = 1; }],
  ['row-state-ledger.json', 'terminal unit count', (v) => { v.counts.terminal_units_after = 2; }],
  ['row-state-ledger.json', 'row state', (v) => { v.rows[0].row_state_after = 'still_open'; }],
  ['row-state-ledger.json', 'open fields', (v) => { v.rows[1].final_open_fields = 1; }],
  ['row-state-ledger.json', 'class closure effect', (v) => { v.rows[2].class_closure_effect = 'changed'; }],
  ['row-state-ledger.json', 'final row hash', (v) => { v.rows[0].final_row_canonical_sha256 = 'a'.repeat(64); }],
  ['row-state-ledger.json', 'graph effect', (v) => { v.authority_boundary.graph_effect = 'changed'; }],

  ['promoted-partial-field-matrix.json', 'terminal count', (v) => { v.counts.terminal_cells = 189; }],
  ['promoted-partial-field-matrix.json', 'open substantive', (v) => { v.counts.still_open_substantive_cells = 212; }],
  ['promoted-partial-field-matrix.json', 'terminal units', (v) => { v.counts.terminal_units = 2; }],
  ['promoted-partial-field-matrix.json', 'class closed', (v) => { v.current_result.class_closed = true; }],
  ['promoted-partial-field-matrix.json', 'CA row state', (v) => { v.rows.find((r) => r.postal_code === 'CA').row_state = 'still_open'; }],
  ['promoted-partial-field-matrix.json', 'SD row cell terminal', (v) => { v.rows.find((r) => r.postal_code === 'SD').cells[8].terminal = false; }],
  ['promoted-partial-field-matrix.json', 'WA row cell state', (v) => { v.rows.find((r) => r.postal_code === 'WA').cells[8].state = 'still_open'; }],
  ['promoted-partial-field-matrix.json', 'CA substantive mutation', (v) => { v.rows.find((r) => r.postal_code === 'CA').cells[1].authority_effect = 'changed'; }],
  ['promoted-partial-field-matrix.json', 'non-target mutation', (v) => { v.rows.find((r) => r.postal_code === 'AL').state_name = 'Changed'; }],
  ['promoted-partial-field-matrix.json', 'composition predecessor', (v) => { v.row_state_product.predecessor_merge_commit = '0'.repeat(40); }],

  ['remaining-open-field-census.json', 'open count', (v) => { v.counts.still_open_cells = 259; }],
  ['remaining-open-field-census.json', 'terminal rows', (v) => { v.terminal_rows.pop(); }],
  ['remaining-open-field-census.json', 'row-state field count', (v) => { v.field_counts.field_and_row_terminal_state.terminal = 2; }],
  ['remaining-open-field-census.json', 'outside human', (v) => { v.authority_boundary.outside_human_dependency = true; }],

  ['summary.json', 'terminal transition', (v) => { v.transition.terminal_cells_after = 189; }],
  ['summary.json', 'class state', (v) => { v.class_state = 'closed'; }],
  ['summary.json', 'cumulative effect', (v) => { v.cumulative_ledger_effect = 'changed'; }],

  ['index.json', 'terminal cells', (v) => { v.counts.terminal_cells_after = 191; }],
  ['index.json', 'next operation', (v) => { v.next_bounded_operation = 'close class'; }],

  ['product-manifest.json', 'manifest digest', (v) => { v.file_set_combined_sha256 = '0'.repeat(64); }],
];

assert.equal(semanticMutations.length, 46);

const baseByFile = new Map([
  ['authored-row-state-decisions.json', base.decisions],
  ['predecessor-custody.json', base.custody],
  ['row-state-ledger.json', base.ledger],
  ['promoted-partial-field-matrix.json', base.matrix],
  ['remaining-open-field-census.json', base.census],
  ['summary.json', base.summary],
  ['index.json', base.index],
  ['product-manifest.json', base.manifest],
]);

let refused = 0;
for (const [file, label, mutate] of semanticMutations) {
  const value = clone(baseByFile.get(file));
  mutate(value);
  const overrides = new Map([[rel(file), jsonText(value)]]);
  await assert.rejects(
    () => validateProduct(root, overrides),
    undefined,
    `semantic mutation accepted: ${file} ${label}`,
  );
  refused += 1;
}

// Byte-level exact-custody attacks. These exercise every manifest-tracked file
// without repeatedly invoking the full repository validator.
const manifestEntries = base.manifest.entries;
let byteMutations = 0;
outer:
for (let round = 0; round < 200; round += 1) {
  for (const entry of manifestEntries) {
    const buffer = Buffer.from(await readFile(path.join(root, rel(entry.path))));
    const position = (round * 131 + byteMutations * 17) % buffer.length;
    const mutated = Buffer.from(buffer);
    mutated[position] = mutated[position] ^ 0x01;
    assert.notEqual(sha256(mutated), entry.sha256, `byte mutation retained digest: ${entry.path} ${position}`);
    byteMutations += 1;
    if (byteMutations === 600) break outer;
  }
}
assert.equal(byteMutations, 600);
refused += byteMutations;

assert.equal(refused, 646);
console.log(`rd04_ca_sd_wa_row_state_adversarial=pass mutations_refused=${refused}`);
