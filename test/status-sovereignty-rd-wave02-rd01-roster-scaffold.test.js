#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateScaffoldData } from '../tools/acquisition/status-sovereignty-rd-wave02-rd01/validate-roster-scaffold.mjs';
import {
  OUTPUT_PATH,
  SEED_PATH,
  RECEIPT_PATH
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd01/build-roster-scaffold.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(fs.readFileSync(path.join(root, OUTPUT_PATH), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(root, SEED_PATH), 'utf8'));
const receipt = JSON.parse(fs.readFileSync(path.join(root, RECEIPT_PATH), 'utf8'));
const body = fs.readFileSync(path.join(root, receipt.retained.body_path));
const clone = () => JSON.parse(JSON.stringify(matrix));

const mutations = [
  ['schema', (m) => { m.schema_version = 'bad'; }],
  ['class', (m) => { m.class_id = 'RD-99'; }],
  ['issue', (m) => { m.issue = 0; }],
  ['status', (m) => { m.status = 'complete'; }],
  ['drop selected row', (m) => { m.rows.splice(20, 1); }],
  ['drop control row', (m) => { m.rows.pop(); }],
  ['duplicate row id', (m) => { m.rows[1].row_id = m.rows[0].row_id; }],
  ['reorder rank rows', (m) => { [m.rows[0], m.rows[1]] = [m.rows[1], m.rows[0]]; }],
  ['rename selected display', (m) => { m.rows[0].fields.published_display_name.value = 'Other'; }],
  ['change rank', (m) => { m.rows[0].fields.published_rank_or_explicit_nonselection_class.value.published_rank = 2; }],
  ['rank control', (m) => { m.rows[100].fields.published_rank_or_explicit_nonselection_class.value.published_rank = 101; }],
  ['control enters roster', (m) => { m.rows[0].fields.published_display_name.value = 'SpaceX'; }],
  ['swap control class', (m) => { m.rows[100].fields.published_rank_or_explicit_nonselection_class.value.class = 'explicit_ineligibility_example'; }],
  ['remove field', (m) => { delete m.rows[0].fields.entity_jurisdiction; }],
  ['resolve entity early', (m) => { m.rows[0].fields.resolved_legal_entity = { state: 'observed', value: 'Example LLC', source_ids: [], note: '', fixed_protocol_complete: true, terminal_for_class_closure: true }; }],
  ['jurisdiction value early', (m) => { m.rows[0].fields.entity_jurisdiction.value = 'Delaware'; }],
  ['confidence early', (m) => { m.rows[0].fields.identity_confidence_state.state = 'exact'; }],
  ['terminal row early', (m) => { m.rows[0].fields.terminal_row_state.terminal_for_class_closure = true; }],
  ['protocol executed', (m) => { m.rows[0].row_result.fixed_protocol_executed = true; }],
  ['entity resolved result', (m) => { m.rows[0].row_result.legal_entity_resolved = true; }],
  ['row closed', (m) => { m.rows[0].row_result.row_closed = true; }],
  ['class closed', (m) => { m.current_result.class_closed = true; }],
  ['contacts', (m) => { m.counts.external_contacts = 1; }],
  ['reviews', (m) => { m.counts.external_reviews = 1; }],
  ['human gate', (m) => { m.current_result.outside_human_dependency = true; }],
  ['graph effect', (m) => { m.current_result.graph_effect = 'changed'; }],
  ['source digest drift', (m) => { m.parent.source_body_sha256 = '0'.repeat(64); }],
  ['inflate control universe', (m) => { m.denominator_contract.complete_rejected_or_ineligible_universe_claimed = true; }]
];

validateScaffoldData(matrix, seed, receipt, body);
let rejected = 0;
for (const [name, mutate] of mutations) {
  const candidate = clone();
  mutate(candidate);
  try {
    validateScaffoldData(candidate, seed, receipt, body);
    throw new Error(`mutation survived: ${name}`);
  } catch (error) {
    if (String(error.message).startsWith('mutation survived:')) throw error;
    rejected += 1;
  }
}
if (rejected !== mutations.length) throw new Error(`rejected ${rejected}/${mutations.length}`);
console.log(`rd01-roster-scaffold.test: ${rejected} adversarial mutations PASS`);
