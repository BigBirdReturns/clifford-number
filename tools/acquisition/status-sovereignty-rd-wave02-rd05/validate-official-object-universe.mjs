#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, SEED_PATH, OUTPUT_PATH, EXPECTED_SEED_MANIFEST_SHA256,
  EXPECTED_CAPTURE_MANIFEST_SHA256, EXPECTED_SOURCE_IDS, REQUIRED_FIELDS,
  verifyCapture, deriveUniverse
} from './build-official-object-universe.mjs';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function validateUniverseData(value, seed, summary) {
  ok(value?.schema_version === 'ssc-rd-wave02-rd05-official-object-candidate-universe@1', 'schema version changed');
  ok(value?.wave_id === 'SSC-RD-W02' && value?.class_id === 'RD-05-C03' && value?.issue === 790, 'lane identity changed');
  ok(value?.status === 'immutable_initial_surface_candidate_universe_pending_exact_object_capture_and_disposition_protocol', 'status escalated');
  ok(seed?.class_id === 'RD-05-C03' && seed?.child_issue === 790, 'seed identity changed');
  ok(seed?.input_manifest?.combined_sha256 === EXPECTED_SEED_MANIFEST_SHA256, 'seed digest changed');
  ok(value?.parent?.capture_manifest_sha256 === EXPECTED_CAPTURE_MANIFEST_SHA256, 'capture digest changed');
  ok(JSON.stringify(summary.sources.map((row) => row.source_id)) === JSON.stringify(EXPECTED_SOURCE_IDS), 'source IDs changed');

  const expected = deriveUniverse(summary);
  ok(Array.isArray(value.objects) && value.objects.length === 58, `object denominator ${value.objects?.length}`);
  ok(new Set(value.objects.map((row) => row.object_id)).size === 58, 'duplicate object ID');
  ok(new Set(value.objects.map((row) => row.url)).size === 58, 'duplicate object URL');
  ok(JSON.stringify(value.objects.map((row) => ({ id: row.object_id, url: row.url, scope: row.source_scope, seed: row.seed_source_ids, from: row.discovered_from_source_ids, admission: row.admission_state }))) ===
     JSON.stringify(expected.map((row) => ({ id: row.object_id, url: row.url, scope: row.source_scope, seed: row.seed_source_ids, from: row.discovered_from_source_ids, admission: row.admission_state }))), 'object membership, admission, or ordering changed');
  ok(value.objects.filter((row) => row.source_scope === 'aces_target').length === 51, 'target denominator changed');
  ok(value.objects.filter((row) => row.source_scope === 'matched_nsb_control').length === 7, 'control denominator changed');
  ok(value.objects.filter((row) => row.seed_source_ids.length && row.discovered_from_source_ids.length).length === 7, 'seed/link overlap changed');
  ok(JSON.stringify(value.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required fields changed');

  for (const row of value.objects) {
    ok(Object.keys(row.fields || {}).length === REQUIRED_FIELDS.length, `${row.object_id}: field denominator changed`);
    ok(JSON.stringify(Object.keys(row.fields)) === JSON.stringify(REQUIRED_FIELDS), `${row.object_id}: field identity changed`);
    ok(row.object_result?.fixed_protocol_complete === false && row.object_result?.record_closed === false && row.object_result?.terminal_state === 'still_open', `${row.object_id}: prematurely closed`);
    const exact = row.object_result.exact_object_capture_complete;
    ok(exact === (row.seed_source_ids.length === 1), `${row.object_id}: exact-capture state changed`);
    for (const [field, state] of Object.entries(row.fields)) {
      if (field === 'record_class_and_issuing_authority' && exact) ok(state.state === 'observed' && state.terminal === true, `${row.object_id}.${field}: parent source custody changed`);
      else if (field === 'exact_source_locator_and_byte_custody' && exact) ok(state.state === 'observed' && state.terminal === true, `${row.object_id}.${field}: exact custody changed`);
      else ok(state.state === 'pending_fixed_official_record_protocol' && state.value === null && state.terminal === false, `${row.object_id}.${field}: premature adjudication`);
    }
  }

  const d = value.denominator_contract;
  ok(d?.frozen_parent_sources === 10 && d?.linked_candidates === 55 && d?.unique_object_candidates === 58, 'denominator contract changed');
  ok(d?.aces_target_objects === 51 && d?.matched_control_objects === 7 && d?.seed_link_overlaps === 7, 'scope counts changed');
  ok(d?.candidate_membership_frozen_before_object_adjudication === true && d?.silent_object_removal_allowed === false, 'freeze contract weakened');
  ok(d?.complete_official_object_universe_claimed === false, 'complete universe falsely claimed');

  const c = value.counts;
  ok(c?.frozen_parent_sources === 10 && c?.terminal_parent_source_receipts === 10 && c?.linked_candidates === 55 && c?.unique_object_candidates === 58, 'counts changed');
  ok(c?.aces_target_objects === 51 && c?.matched_control_objects === 7 && c?.exact_object_bodies === 10, 'object counts changed');
  for (const key of ['fixed_protocol_completed_objects','completed_recommendations','agency_responses','adopted_outputs','rejected_outputs','implementation_or_outcomes','closed_objects','external_contacts','external_reviews','graph_effects']) ok(c?.[key] === 0, `${key} changed`);

  const result = value.current_result;
  ok(result?.terminal_state === 'initial_candidate_universe_frozen_exact_object_capture_pending', 'terminal state changed');
  ok(result?.initial_candidate_universe_frozen === true && result?.complete_official_object_universe_frozen === false, 'universe authority changed');
  ok(result?.recommendation_disposition_protocol_complete === false && result?.class_closed === false, 'class prematurely complete');
  ok(result?.outside_human_dependency === false && result?.project_blocking === false, 'human dependency introduced');
  ok(result?.publication_effect === 'none' && result?.adoption_effect === 'none' && result?.graph_effect === 'none', 'effect authority changed');
  for (const [key, state] of Object.entries(value.boundaries || {})) {
    if (key === 'graph_effect') ok(state === 'none', 'graph effect changed');
    else ok(state === false, `${key} weakened`);
  }
  return value;
}

export function validateUniverseRepository(root = ROOT) {
  const { summary } = verifyCapture(root);
  const value = readJson(root, OUTPUT_PATH);
  const seed = readJson(root, SEED_PATH);
  validateUniverseData(value, seed, summary);
  console.log('validate-rd05-object-universe: PASS — 58 immutable candidates, 10 exact parent bodies, zero adjudications');
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validateUniverseRepository(); }
  catch (error) { console.error(`validate-rd05-object-universe: ${error.message}`); process.exit(1); }
}
