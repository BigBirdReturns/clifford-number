#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, deriveManifest, deriveRegistry, deriveReport, renderHtml, stableJson } from './build-counter-selector-wave-37.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-37-live-operational-handoff.json';
const SCHEMA_PATH = 'schemas/counter-selector-live-operational-handoff.schema.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-37-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-37-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-37/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-37/index.html';

export const EXPECTED_COUNTS = {
  "controls_audited": 3,
  "public_source_records": 15,
  "live_operational_handoff_surfaces": 1,
  "complete_bounded_live_operational_handoffs": 1,
  "same_pid_successor_operations": 1,
  "same_workload_pid_continuations": 1,
  "two_hop_chained_handoff_surfaces": 1,
  "version_confirmed_success_surfaces": 1,
  "post_handoff_output_growth_receipts": 1,
  "carried_state_categories": 8,
  "complete_same_package_portable_proof_chains": 1,
  "portable_package_round_trip_surfaces": 1,
  "package_inventory_recipient_acknowledgments": 0,
  "portable_exact_manifest_operational_handoffs": 0,
  "residual_live_handoff_edge_classes": 1,
  "arsas_unresolved_safety_findings": 7,
  "complete_direct_person_handoffs": 0,
  "person_dimension_supports_added": 0,
  "valid_resource_normalized_comparators": 0,
  "external_independent_reviews": 0,
  "complete_operator_findings": 0,
  "field_test_eligible_candidates": 0,
  "contacts_authorized": 0,
  "bounded_collaborations_authorized": 0,
  "promotions": 0,
  "person_rankings": 0,
  "public_identity_profiles": 0,
  "graph_effects": 0,
  "adversarial_mutations": 112
};
export const EXPECTED_BOUNDARIES = {
  "complete_bounded_live_system_handoff_is_complete_portable_package_handoff": false,
  "same_pid_process_continuity_is_person_identity": false,
  "version_confirmation_is_exact_binary_digest": false,
  "runtime_readoption_is_package_inventory_receipt": false,
  "dev_cluster_end_to_end_is_universal_production_assurance": false,
  "user_workload_scope_is_all_system_process_state": false,
  "retained_system_process_edge_is_complete_state_custody": false,
  "same_system_testing_is_external_independent_review": false,
  "complete_live_system_handoff_is_person_support": false,
  "portable_proof_chain_is_successor_operation": false,
  "incoming_proof_signature_is_operational_inventory_receipt": false,
  "portable_package_round_trip_is_field_operation": false,
  "native_reports_resolve_package_safety": false,
  "proof_components_across_controls_may_be_combined": false,
  "control_success_is_support_adjusted_surplus": false,
  "living_subject_is_contact_authorization": false,
  "field_test_authorized": false,
  "promotion_authorized": false,
  "person_ranking_authorized": false,
  "public_identity_profile_authorized": false,
  "graph_effect": "none"
};
export const EXPECTED_JOIN_MATRIX = [
  {
    "control_id": "CS-W37-LH-01",
    "live_state_transfer": true,
    "exact_portable_package_manifest": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "same_system_success_confirmation": true,
    "complete_bounded_live_operational_handoff": true,
    "complete_portable_package_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W37-LH-02",
    "live_state_transfer": false,
    "exact_portable_package_manifest": true,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "same_system_success_confirmation": true,
    "complete_bounded_live_operational_handoff": false,
    "complete_portable_package_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W37-LH-03",
    "live_state_transfer": false,
    "exact_portable_package_manifest": true,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "same_system_success_confirmation": true,
    "complete_bounded_live_operational_handoff": false,
    "complete_portable_package_handoff": false,
    "person_support": false
  }
];
export const EXPECTED_ADJUDICATIONS = [
  {
    "complete_bounded_live_operational_handoff": true,
    "complete_portable_package_handoff": false,
    "complete_portable_proof_chain": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "same_system_success_confirmation": true,
    "person_support_added": false,
    "classification": "complete_bounded_live_process_state_handoff_with_nonportable_receipt_and_retained_system_process_edge"
  },
  {
    "complete_bounded_live_operational_handoff": false,
    "complete_portable_package_handoff": false,
    "complete_portable_proof_chain": true,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "same_system_success_confirmation": true,
    "person_support_added": false,
    "classification": "complete_same_package_portable_proof_chain_without_live_operational_successor"
  },
  {
    "complete_bounded_live_operational_handoff": false,
    "complete_portable_package_handoff": false,
    "complete_portable_proof_chain": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "same_system_success_confirmation": true,
    "person_support_added": false,
    "classification": "portable_cross_workspace_package_with_seven_unresolved_safety_findings_and_no_live_recipient"
  }
];

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) { assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`); }

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-live-operational-handoff@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W37-LH-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W34-EH-01','CS-W36-PC-01']);
  assert.equal(source.as_of, '2026-08-02');
  assert.equal(source.observed_at, '2026-08-02T17:15:00-07:00');
  assert.equal(source.status, 'one_complete_bounded_live_operational_handoff_zero_portable_inventory_receipts_zero_person_findings');
  assert.match(source.purpose, /same-object live runtime transition/);
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(Object.keys(source.counts).length, 29);
  assert.equal(source.controls.length, 3);
  assert.equal(source.join_matrix.length, 3);
  assert.equal(source.handoff_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.control_is_candidate_promotion, false);
  assert.equal(source.handoff_contract.component_order.length, 11);
  assert.equal(source.handoff_contract.complete_bounded_live_handoff_requires.length, 6);
  assert.equal(source.handoff_contract.complete_portable_package_handoff_requires.length, 4);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W37-LH-01','CS-W37-LH-02','CS-W37-LH-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 15);
  assert.equal(new Set(sourceIds).size, 15);
  assert.deepEqual(source.controls.map(control => control.adjudication), EXPECTED_ADJUDICATIONS);
  assert.deepEqual(source.join_matrix, EXPECTED_JOIN_MATRIX);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 11);
    assert.equal(control.positive_findings.length >= 4, true);
    assert.equal(control.known_limits.length >= 6, true);
    assert.equal(control.adjudication.package_inventory_recipient_acknowledgment, false);
    assert.equal(control.adjudication.complete_portable_package_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const e2b = source.controls[0];
  assert.equal(e2b.source_records.length, 6);
  assert.equal(e2b.adjudication.complete_bounded_live_operational_handoff, true);
  assert.equal(e2b.adjudication.same_object_successor_operation, true);
  assert.equal(e2b.adjudication.complete_portable_package_handoff, false);
  assert.match(e2b.components.successor_operation_from_transferred_state, /same workload PID/);
  assert.equal(e2b.known_limits.length, 7);

  const cargo = source.controls[1];
  assert.equal(cargo.source_records.length, 4);
  assert.equal(cargo.adjudication.complete_portable_proof_chain, true);
  assert.equal(cargo.adjudication.same_object_successor_operation, false);
  assert.equal(cargo.adjudication.complete_bounded_live_operational_handoff, false);

  const arsas = source.controls[2];
  assert.equal(arsas.source_records.length, 5);
  assert.equal(arsas.known_limits.length, 7);
  assert.equal(arsas.adjudication.complete_bounded_live_operational_handoff, false);
  assert.match(arsas.adjudication.classification, /seven_unresolved/);

  assert.deepEqual(source.boundaries, EXPECTED_BOUNDARIES);
  assert.equal(Object.keys(source.boundaries).length, 21);
  assert.match(source.next_action, /same-object transition/);
  assert.match(source.next_action, /Do not assemble/);
  assert.equal(source.graph_effect, 'none');
}

export function validateSchemaAgainstSource(schema, source) {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.boundaries.additionalProperties, false);
  const sourceKeys = Object.keys(source.boundaries);
  const schemaKeys = Object.keys(schema.properties.boundaries.properties);
  assert.deepEqual(schemaKeys, sourceKeys);
  assert.deepEqual(schema.properties.boundaries.required, sourceKeys);
  for (const [key, value] of Object.entries(source.boundaries)) {
    assert.equal(schema.properties.boundaries.properties[key].const, value, `boundary schema drift: ${key}`);
  }
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  const schema = readJson(SCHEMA_PATH);
  validateSource(source);
  validateSchemaAgainstSource(schema, source);
  const expectedRegistry = deriveRegistry(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.controls.length, 3);
  assert.equal(registry.controls.filter(control => control.complete_bounded_live_operational_handoff).length, 1);
  assert.equal(registry.controls.filter(control => control.same_object_successor_operation).length, 1);
  assert.equal(registry.controls.filter(control => control.complete_portable_proof_chain).length, 1);
  assert.equal(registry.controls.every(control => control.complete_portable_package_handoff === false), true);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W37-LH-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-37: contract, schema, and products valid');
}
