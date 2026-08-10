#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { C, buildProduct } from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs';
import { loadModel, validateModel } from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs';

const repoRoot = process.cwd();
const base = loadModel(repoRoot);
validateModel(base);

const dataNames = [
  'promotion-input-custody.json',
  'promotion-decision.json',
  'cell-promotion-ledger.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'promotion-summary.json',
  'index.json',
];
const productRoot = path.join(repoRoot, C.ROOT);
const expectedBytes = Object.fromEntries(dataNames.map(name => [name, fs.readFileSync(path.join(productRoot, name))]));
const hiddenRoot = `${productRoot}.builder-independence-${process.pid}`;
assert.equal(fs.existsSync(hiddenRoot), false, 'builder-independence temporary path already exists');
fs.renameSync(productRoot, hiddenRoot);
try {
  const rebuilt = buildProduct(repoRoot);
  for (const name of dataNames) assert.deepEqual(rebuilt[name], expectedBytes[name], `builder depends on committed ${name}`);
} finally {
  fs.renameSync(hiddenRoot, productRoot);
}

const schemaPath = path.join(repoRoot, 'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.oneOf.length, 8, 'schema root must close all eight product JSON document classes');
assert.equal(schema.$defs.authorityBoundary.additionalProperties, false);
assert.equal(schema.$defs.cell.additionalProperties, false);
assert.equal(schema.$defs.row.properties.cells.items.$ref, '#/$defs/cell');
assert.equal(schema.$defs.promotedMatrix.properties.rows.items.$ref, '#/$defs/row');
assert.equal(schema.$defs.manifest.properties.authority_boundary.$ref, '#/$defs/authorityBoundary');

function deref(ref) {
  const name = ref.replace('#/$defs/', '');
  assert.ok(schema.$defs[name], `missing schema definition ${name}`);
  return schema.$defs[name];
}
function rootShapeMatches(document, variantRef) {
  const variant = deref(variantRef.$ref);
  const required = variant.required ?? [];
  if (!required.every(key => Object.hasOwn(document, key))) return false;
  if (variant.additionalProperties === false && Object.keys(document).some(key => !Object.hasOwn(variant.properties, key))) return false;
  const expectedVersion = variant.properties?.schema_version?.const;
  return expectedVersion === undefined || document.schema_version === expectedVersion;
}
assert.equal(schema.oneOf.some(variant => rootShapeMatches({}, variant)), false, 'empty object must not validate at the schema root');
const schemaDocuments = [base.input, base.decision, base.ledger, base.matrix, base.census, base.summary, base.index, base.manifest];
for (const document of schemaDocuments) {
  const matches = schema.oneOf.filter(variant => rootShapeMatches(document, variant));
  assert.equal(matches.length, 1, `schema root did not uniquely classify ${document.schema_version}`);
}

const clone = value => structuredClone(value);
let refusals = 0;
function reject(name, mutate) {
  const model = clone(base);
  model.repoRoot = base.repoRoot;
  model.root = base.root;
  mutate(model);
  assert.throws(() => validateModel(model), undefined, name);
  refusals += 1;
}
reject('terminal count inflation', m => m.matrix.counts.terminal_cells = 229);
reject('open count deflation', m => m.matrix.counts.still_open_cells = 221);
reject('unit terminalization', m => m.matrix.counts.terminal_units = 11);
reject('class closure', m => m.matrix.counts.class_closed = true);
reject('row transition', m => m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND').row_state = 'terminal');
reject('row field count', m => m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND').open_fields = 0);
reject('target state widening', m => m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND').cells.find(c => c.field_ordinal === 4).state = 'evidence_complete');
reject('target terminal rollback', m => m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND').cells.find(c => c.field_ordinal === 4).terminal = false);
reject('row-state mutation', m => m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND').cells.find(c => c.field_ordinal === 9).typed_gap = 'one_open_field');
reject('source set truncation', m => m.decision.evidence_source_ids.pop());
reject('missing class refusal', m => m.decision.prohibited_inferences = m.decision.prohibited_inferences.filter(x => x !== 'do_not_close_rd04_c02'));
reject('matrix update inflation', m => m.ledger.matrix_update_count = 2);
reject('row mutation authority', m => m.summary.row_state_mutations = 1);
reject('network request authority', m => m.summary.authority_boundary.source_requests = 1);
reject('source admission authority', m => m.input.authority_boundary.source_admissions = 1);
reject('cumulative ledger effect', m => m.ledger.authority_boundary.cumulative_ledger_effect = 'changed');
reject('publication effect', m => m.decision.authority_boundary.publication_effect = 'claimed');
reject('graph effect', m => m.summary.authority_boundary.graph_effect = 'edge_created');
reject('open census shrink', m => m.census.open_cell_count = 221);
reject('non-target census corruption', m => m.census.open_cells.find(cell => cell.unit_id === 'US-STATE-AL').typed_gap = 'corrupted_non_target_row');
reject('manifest path denominator', m => m.manifest.permanent_path_count = 13);
reject('manifest network request authority', m => m.manifest.authority_boundary.source_requests = 1);
reject('manifest source admission authority', m => m.manifest.authority_boundary.source_admissions = 1);
reject('manifest row mutation authority', m => m.manifest.authority_boundary.row_state_mutations = 1);
reject('manifest class closure', m => m.manifest.authority_boundary.class_closed = true);
reject('manifest cumulative ledger effect', m => m.manifest.authority_boundary.cumulative_ledger_effect = 'changed');
reject('manifest publication effect', m => m.manifest.authority_boundary.publication_effect = 'claimed');
reject('manifest adoption effect', m => m.manifest.authority_boundary.adoption_effect = 'claimed');
reject('manifest graph effect', m => m.manifest.authority_boundary.graph_effect = 'edge_created');
reject('manifest outside-human dependency', m => m.manifest.authority_boundary.outside_human_dependency = true);
console.log(JSON.stringify({state:'builder_independence_schema_root_manifest_boundary_and_adversarial_refusals_complete',refusals}, null, 2));
