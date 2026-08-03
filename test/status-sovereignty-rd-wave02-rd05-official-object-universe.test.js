#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateUniverseData } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/validate-official-object-universe.mjs';
import { OUTPUT_PATH, SEED_PATH, SUMMARY_PATH } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/build-official-object-universe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const value = JSON.parse(fs.readFileSync(path.join(root, OUTPUT_PATH), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(root, SEED_PATH), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(root, SUMMARY_PATH), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(value));
const seedIndex = value.objects.findIndex((row) => row.seed_source_ids.length > 0);
const discoveredIndex = value.objects.findIndex((row) => row.discovered_from_source_ids.length > 0);
const linkedOnlyIndex = value.objects.findIndex((row) => row.seed_source_ids.length === 0);
if ([seedIndex, discoveredIndex, linkedOnlyIndex].some((index) => index < 0)) throw new Error('required mutation target missing');
const mutations = [
  ['schema', m => { m.schema_version = 'bad'; }], ['class', m => { m.class_id = 'RD-99'; }],
  ['issue', m => { m.issue = 0; }], ['status', m => { m.status = 'complete'; }],
  ['drop object', m => { m.objects.pop(); }], ['duplicate id', m => { m.objects[1].object_id = m.objects[0].object_id; }],
  ['duplicate url', m => { m.objects[1].url = m.objects[0].url; }], ['reorder objects', m => { [m.objects[0],m.objects[1]]=[m.objects[1],m.objects[0]]; }],
  ['scope', m => { m.objects[0].source_scope = 'matched_nsb_control'; }], ['seed sources', m => { m.objects[seedIndex].seed_source_ids = []; }],
  ['discovery', m => { m.objects[discoveredIndex].discovered_from_source_ids = []; }], ['admission', m => { m.objects[0].admission_state = 'admitted'; }],
  ['remove field', m => { delete m.objects[0].fields.recommendation_state; }], ['recommendation', m => { m.objects[0].fields.recommendation_state = { state:'observed', value:'yes', terminal:true }; }],
  ['response', m => { m.objects[0].fields.agency_response_state.value = 'yes'; }], ['adoption', m => { m.objects[0].fields.adoption_or_rejection_state.terminal = true; }],
  ['implementation', m => { m.objects[0].fields.implementation_and_outcome_state.state = 'observed'; }], ['close field', m => { m.objects[0].fields.terminal_record_state.terminal = true; }],
  ['protocol', m => { m.objects[0].object_result.fixed_protocol_complete = true; }], ['close object', m => { m.objects[0].object_result.record_closed = true; }],
  ['terminal object', m => { m.objects[0].object_result.terminal_state = 'evidence_complete'; }], ['exact body inflation', m => { m.objects[linkedOnlyIndex].object_result.exact_object_capture_complete = true; }],
  ['complete universe', m => { m.denominator_contract.complete_official_object_universe_claimed = true; }], ['silent removal', m => { m.denominator_contract.silent_object_removal_allowed = true; }],
  ['target count', m => { m.counts.aces_target_objects = 50; }], ['recommendation count', m => { m.counts.completed_recommendations = 1; }],
  ['external contacts', m => { m.counts.external_contacts = 1; }], ['external reviews', m => { m.counts.external_reviews = 1; }],
  ['class close', m => { m.current_result.class_closed = true; }], ['human gate', m => { m.current_result.outside_human_dependency = true; }],
  ['publication', m => { m.current_result.publication_effect = 'changed'; }], ['boundary', m => { m.boundaries.keyword_occurrence_is_recommendation = true; }]
];
validateUniverseData(value, seed, summary);
let rejected = 0;
for (const [name, mutate] of mutations) {
  const candidate = clone(); mutate(candidate);
  try { validateUniverseData(candidate, seed, summary); throw new Error(`mutation survived: ${name}`); }
  catch (error) { if (String(error.message).startsWith('mutation survived:')) throw error; rejected += 1; }
}
if (rejected !== mutations.length) throw new Error(`rejected ${rejected}/${mutations.length}`);
console.log(`rd05-official-object-universe.test: ${rejected} adversarial mutations PASS`);
