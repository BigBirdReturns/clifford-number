#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  SEED_PATH,
  RECEIPT_PATH,
  OUTPUT_PATH,
  EXPECTED_SEED_MANIFEST_SHA256,
  REQUIRED_FIELDS,
  extractRoster
} from './build-roster-scaffold.mjs';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const readJson = (root, relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

export function validateScaffoldData(value, seed, receipt, body) {
  ok(value?.schema_version === 'ssc-rd-wave02-rd01-roster-scaffold@1', 'schema_version changed');
  ok(value?.wave_id === 'SSC-RD-W02' && value?.class_id === 'RD-01-C03' && value?.issue === 786, 'lane identity changed');
  ok(value?.as_of === '2026-08-02', 'cutoff changed');
  ok(value?.status === 'immutable_102_row_scaffold_pending_fixed_legal_entity_protocol', 'status escalated');
  ok(seed?.class_id === 'RD-01-C03' && seed?.child_issue === 786, 'seed identity changed');
  ok(seed?.input_manifest?.combined_sha256 === EXPECTED_SEED_MANIFEST_SHA256, 'seed manifest changed');
  ok(value?.parent?.seed_path === SEED_PATH, 'seed path changed');
  ok(value?.parent?.seed_input_manifest_sha256 === EXPECTED_SEED_MANIFEST_SHA256, 'parent seed digest changed');
  ok(value?.parent?.frozen_execution_base === seed.frozen_execution_base, 'frozen base changed');
  ok(value?.parent?.constitution_merge === seed.constitution.merge_commit, 'constitution merge changed');
  ok(value?.parent?.source_receipt_path === RECEIPT_PATH, 'source receipt path changed');

  ok(receipt?.schema_version === 'ssc-rd01-wave02-retained-roster-source@1', 'source receipt schema changed');
  ok(receipt?.source_id === 'NATSEC100-2026-FIRST-PARTY', 'source identity changed');
  ok(receipt?.source_url === 'https://www.natsec100.org/natsec100-2026', 'source URL changed');
  ok(receipt?.terminal_state === 'http_success_exact_body_captured' && receipt?.resolved === true, 'source is not terminally resolved');
  ok(body.length === receipt?.retained?.body_bytes, 'source body byte count changed');
  ok(sha256(body) === receipt?.retained?.body_sha256, 'source body digest changed');
  ok(value?.parent?.source_body_sha256 === receipt.retained.body_sha256, 'scaffold source digest changed');

  const expectedNames = extractRoster(body.toString('utf8'));
  ok(value?.denominator_contract?.selected_roster_rows === 100, 'selected denominator changed');
  ok(value?.denominator_contract?.explicit_assessed_nonselection_or_ineligibility_rows === 2, 'control denominator changed');
  ok(value?.denominator_contract?.total_required_rows === 102, 'total denominator changed');
  ok(value?.denominator_contract?.row_membership_frozen === true, 'row membership not frozen');
  ok(value?.denominator_contract?.source_order_is_rank_order === true, 'source order is not rank order');
  ok(value?.denominator_contract?.silent_row_removal_allowed === false, 'silent row removal authorized');
  ok(value?.denominator_contract?.complete_rejected_or_ineligible_universe_claimed === false, 'control universe inflated');
  ok(JSON.stringify(value?.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required fields changed');
  ok(Array.isArray(value?.rows) && value.rows.length === 102, `row denominator ${value?.rows?.length}`);
  ok(new Set(value.rows.map((row) => row.row_id)).size === 102, 'duplicate row ID');

  const selected = value.rows.filter((row) => row.unit_class === 'published_selected_roster_row');
  const controls = value.rows.filter((row) => row.unit_class === 'explicit_assessed_nonselection_or_ineligibility_example');
  ok(selected.length === 100 && controls.length === 2, `selected/control denominator ${selected.length}/${controls.length}`);
  const observedNames = selected.map((row) => row.fields?.published_display_name?.value);
  ok(JSON.stringify(observedNames) === JSON.stringify(expectedNames), 'published roster order or display names changed');
  ok(new Set(observedNames).size === 100, 'duplicate selected display name');
  ok(!observedNames.includes('SpaceX') && !observedNames.includes('Anthropic'), 'bounded controls entered selected roster');

  selected.forEach((row, index) => {
    const rank = index + 1;
    ok(row.row_id === `NATSEC100-2026-RANK-${String(rank).padStart(3, '0')}`, `${row.row_id}: rank row ID changed`);
    ok(row.fields?.edition?.state === 'observed' && row.fields.edition.value === 2026, `${row.row_id}: edition changed`);
    ok(row.fields?.published_rank_or_explicit_nonselection_class?.value?.published_rank === rank, `${row.row_id}: rank changed`);
    ok(row.fields?.published_rank_or_explicit_nonselection_class?.value?.class === 'selected', `${row.row_id}: selected class changed`);
  });

  const controlByName = new Map(controls.map((row) => [row.fields?.published_display_name?.value, row]));
  ok(JSON.stringify([...controlByName.keys()].sort()) === JSON.stringify(['Anthropic', 'SpaceX']), 'control identities changed');
  ok(controlByName.get('SpaceX')?.fields?.published_rank_or_explicit_nonselection_class?.value?.class === 'explicit_assessed_nonselection_example', 'SpaceX control class changed');
  ok(controlByName.get('Anthropic')?.fields?.published_rank_or_explicit_nonselection_class?.value?.class === 'explicit_ineligibility_example', 'Anthropic control class changed');
  ok(controls.every((row) => row.fields?.published_rank_or_explicit_nonselection_class?.value?.published_rank === null), 'control received a published rank');

  for (const row of value.rows) {
    ok(Object.keys(row.fields || {}).length === REQUIRED_FIELDS.length, `${row.row_id}: field denominator changed`);
    ok(JSON.stringify(Object.keys(row.fields)) === JSON.stringify(REQUIRED_FIELDS), `${row.row_id}: field order or identity changed`);
    for (const fieldName of REQUIRED_FIELDS) {
      const field = row.fields[fieldName];
      ok(field && typeof field.state === 'string', `${row.row_id}.${fieldName}: field missing`);
      if (['edition','published_rank_or_explicit_nonselection_class','published_display_name','source_locators_and_exact_retrieval_custody'].includes(fieldName)) {
        ok(field.state === 'observed' && field.fixed_protocol_complete === true && field.terminal_for_class_closure === true, `${row.row_id}.${fieldName}: observed custody changed`);
      } else {
        ok(field.state === 'pending_fixed_public_record_protocol', `${row.row_id}.${fieldName}: pending state changed`);
        ok(field.value === null && field.fixed_protocol_complete === false && field.terminal_for_class_closure === false, `${row.row_id}.${fieldName}: premature terminal value`);
      }
    }
    const custody = row.fields.source_locators_and_exact_retrieval_custody.value;
    ok(custody?.body_sha256 === receipt.retained.body_sha256, `${row.row_id}: custody body digest changed`);
    ok(custody?.capture_run === receipt.execution.workflow_run && custody?.capture_artifact === receipt.execution.artifact_id, `${row.row_id}: execution custody changed`);
    ok(row.row_result?.fixed_protocol_executed === false, `${row.row_id}: protocol prematurely executed`);
    ok(row.row_result?.legal_entity_resolved === false, `${row.row_id}: entity prematurely resolved`);
    ok(row.row_result?.row_closed === false && row.row_result?.terminal_state === 'still_open', `${row.row_id}: row prematurely closed`);
  }

  const counts = value.counts;
  ok(counts?.selected_roster_rows === 100 && counts?.explicit_control_rows === 2 && counts?.total_rows === 102, 'row counts changed');
  ok(counts?.exact_source_bodies === 1, 'source body count changed');
  for (const key of ['fixed_protocol_completed_rows','legal_entities_resolved','closed_rows','external_contacts','external_reviews','graph_effects']) {
    ok(counts?.[key] === 0, `${key} changed`);
  }
  const result = value.current_result;
  ok(result?.terminal_state === 'roster_scaffold_frozen_fixed_legal_entity_protocol_pending', 'terminal state changed');
  ok(result?.exact_102_row_denominator_bound === true, '102-row denominator not bound');
  ok(result?.fixed_protocol_complete === false && result?.class_closed === false, 'class prematurely completed');
  ok(result?.reviewed_disposition_changed === false && result?.project_blocking === false && result?.outside_human_dependency === false, 'authority escalated');
  ok(result?.publication_effect === 'none' && result?.adoption_effect === 'none' && result?.graph_effect === 'none', 'effect authority changed');
  for (const [key, state] of Object.entries(value.boundaries || {})) {
    if (key === 'graph_effect') ok(state === 'none', 'graph effect changed');
    else ok(state === false, `${key} weakened`);
  }
  return value;
}

export function validateScaffoldRepository(root = ROOT) {
  const value = readJson(root, OUTPUT_PATH);
  const seed = readJson(root, SEED_PATH);
  const receipt = readJson(root, RECEIPT_PATH);
  const body = fs.readFileSync(path.join(root, receipt.retained.body_path));
  validateScaffoldData(value, seed, receipt, body);
  console.log('validate-rd01-roster-scaffold: PASS — exact 100 ranked rows + 2 bounded controls, all legal entities still open');
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validateScaffoldRepository();
  } catch (error) {
    console.error(`validate-rd01-roster-scaffold: ${error.message}`);
    process.exit(1);
  }
}
