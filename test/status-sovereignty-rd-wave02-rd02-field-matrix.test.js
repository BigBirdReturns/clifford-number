#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMatrixData } from '../tools/acquisition/status-sovereignty-rd-wave02-rd02/validate-field-matrix.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/field-matrix.json'), 'utf8'));
const parent = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd02-sbicct-state-transitions.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data/project/ssc-residual-wave02/seeds/RD-02-C04.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(matrix));
const mutations = [
  ['schema', (m) => { m.schema_version = 'bad'; }],
  ['class', (m) => { m.class_id = 'RD-99'; }],
  ['issue', (m) => { m.issue = 0; }],
  ['status', (m) => { m.status = 'closed'; }],
  ['drop row', (m) => { m.rows.pop(); }],
  ['reorder row', (m) => { [m.rows[0], m.rows[1]] = [m.rows[1], m.rows[0]]; }],
  ['rename vehicle', (m) => { m.rows[0].legal_vehicle = 'Other'; }],
  ['drop field', (m) => { delete m.rows[0].fields.fee_and_pricing_terms; }],
  ['invalid state', (m) => { m.rows[0].fields.fee_and_pricing_terms.state = 'unknown'; }],
  ['unknown as zero', (m) => { m.rows[0].fields.fee_and_pricing_terms.value = 0; }],
  ['unresolved terminal', (m) => { m.rows[0].fields.fee_and_pricing_terms.terminal_for_class_closure = true; }],
  ['protocol complete', (m) => { m.rows[0].row_result.fixed_protocol_executed = true; }],
  ['row closed', (m) => { m.rows[0].row_result.row_closed = true; }],
  ['class closed', (m) => { m.current_result.class_closed = true; }],
  ['review change', (m) => { m.current_result.reviewed_disposition_changed = true; }],
  ['contacts', (m) => { m.counts.external_contacts = 1; }],
  ['reviews', (m) => { m.counts.external_reviews = 1; }],
  ['graph', (m) => { m.current_result.graph_effect = 'changed'; }],
  ['human gate', (m) => { m.boundaries.outside_human_dependency = true; }],
  ['seed drift', (m) => { m.parent.seed_input_manifest_sha256 = '0'.repeat(64); }]
];
validateMatrixData(matrix, parent, seed);
let rejected = 0;
for (const [name, mutate] of mutations) {
  const candidate = clone(); mutate(candidate);
  try { validateMatrixData(candidate, parent, seed); throw new Error(`mutation survived: ${name}`); }
  catch (error) { if (String(error.message).startsWith('mutation survived:')) throw error; rejected += 1; }
}
if (rejected !== mutations.length) throw new Error(`rejected ${rejected}/${mutations.length}`);
console.log(`rd02-field-matrix.test: ${rejected} adversarial mutations PASS`);
