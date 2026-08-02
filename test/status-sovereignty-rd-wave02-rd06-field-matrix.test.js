#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMatrixData } from '../tools/acquisition/status-sovereignty-rd-wave02-rd06/validate-field-matrix.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd-wave02-rd06-offeror-universe/field-matrix.json'), 'utf8'));
const parent = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd06-dcgsa-support-exit.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data/project/ssc-residual-wave02/seeds/RD-06-C01.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(matrix));
const mutations = [
  ['schema', (m) => { m.schema_version = 'bad'; }],
  ['class', (m) => { m.class_id = 'RD-99'; }],
  ['issue', (m) => { m.issue = 0; }],
  ['status', (m) => { m.status = 'closed'; }],
  ['drop slot', (m) => { m.slots.pop(); }],
  ['reorder slot', (m) => { [m.slots[0], m.slots[1]] = [m.slots[1], m.slots[0]]; }],
  ['claim ordinal', (m) => { m.slots[0].slot_basis = 'original proposal ordinal'; }],
  ['rename named offeror', (m) => { m.slots[0].fields.legal_offeror_and_bidding_entity.value = 'Other'; }],
  ['guess unresolved offeror', (m) => { m.slots[3].fields.legal_offeror_and_bidding_entity.value = 'Guessed Co.'; }],
  ['guess unresolved candidate', (m) => { m.slots[3].fields.identity_confidence_and_alternative_candidates.value.alternative_candidates.push('Guess'); }],
  ['copy evaluation to unresolved', (m) => { m.slots[3].fields.evaluation_or_protest_cross_reference.state = 'observed'; }],
  ['drop field', (m) => { delete m.slots[0].fields.team_prime_subcontractor_and_architecture_identity_where_public; }],
  ['invalid state', (m) => { m.slots[0].fields.team_prime_subcontractor_and_architecture_identity_where_public.state = 'unknown'; }],
  ['unresolved terminal', (m) => { m.slots[3].fields.legal_offeror_and_bidding_entity.terminal_for_class_closure = true; }],
  ['protocol complete', (m) => { m.slots[3].fields.legal_offeror_and_bidding_entity.fixed_protocol_complete = true; }],
  ['slot closed', (m) => { m.slots[3].slot_result.slot_closed_for_identity_and_disposition = true; }],
  ['class closed', (m) => { m.current_result.class_closed = true; }],
  ['technical superiority', (m) => { m.current_result.technical_superiority_finding = true; }],
  ['contacts', (m) => { m.counts.external_contacts = 1; }],
  ['human gate', (m) => { m.boundaries.outside_human_dependency = true; }]
];
validateMatrixData(matrix, parent, seed);
let rejected = 0;
for (const [name, mutate] of mutations) {
  const candidate = clone();
  mutate(candidate);
  try { validateMatrixData(candidate, parent, seed); throw new Error(`mutation survived: ${name}`); }
  catch (error) { if (String(error.message).startsWith('mutation survived:')) throw error; rejected += 1; }
}
if (rejected !== mutations.length) throw new Error(`rejected ${rejected}/${mutations.length}`);
console.log(`rd06-field-matrix.test: ${rejected} adversarial mutations PASS`);
