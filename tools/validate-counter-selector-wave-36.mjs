#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, deriveManifest, deriveRegistry, deriveReport, renderHtml, stableJson } from './build-counter-selector-wave-36.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-36-portable-proof-closure.json';
const SCHEMA_PATH = 'schemas/counter-selector-portable-proof-closure.schema.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-36-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-36-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-36/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-36/index.html';

export const EXPECTED_COUNTS = {
  "controls_audited": 3,
  "public_source_records": 12,
  "complete_portable_proof_verification_surfaces": 1,
  "complete_same_package_proof_chains": 1,
  "incoming_proof_binding_acceptances": 1,
  "package_inventory_recipient_acknowledgments": 0,
  "same_package_independent_recalculations": 1,
  "full_chain_substitution_rejection_families": 3,
  "field_successor_operation_surfaces": 1,
  "package_and_field_operation_joins": 0,
  "arsas_package_generations_audited": 2,
  "external_automated_review_surfaces": 2,
  "external_automated_review_findings": 7,
  "known_package_safety_defects": 7,
  "complete_operational_handoffs": 0,
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
  "package_safety_clearances": 0,
  "successor_operation_receipts_bound_to_verified_package": 0,
  "adversarial_mutations": 104
};
export const EXPECTED_BOUNDARIES = {
  "complete_portable_proof_is_complete_operational_handoff": false,
  "incoming_signature_is_package_inventory_receipt": false,
  "same_system_recalculation_is_external_independent_review": false,
  "verified_transfer_event_is_successor_operation": false,
  "physical_actuation_out_of_scope_is_observed_operation": false,
  "automated_round_trip_is_field_operation": false,
  "native_reports_resolve_package_safety": false,
  "report_hashes_resolve_state_collision": false,
  "per_entry_limits_are_aggregate_archive_budget": false,
  "legacy_compatibility_allows_modern_manifest_omission": false,
  "end_user_operation_is_package_receipt": false,
  "written_guidance_is_versioned_state_package": false,
  "recipient_satisfaction_is_authority_transfer": false,
  "proof_components_across_controls_may_be_combined": false,
  "complete_proof_chain_is_person_support": false,
  "living_subject_is_contact_authorization": false,
  "field_test_authorized": false,
  "promotion_authorized": false,
  "person_ranking_authorized": false,
  "public_identity_profile_authorized": false,
  "graph_effect": "none"
};
export const EXPECTED_JOIN_MATRIX = [
  {
    "control_id": "CS-W36-PC-01",
    "complete_portable_proof": true,
    "incoming_proof_acceptance": true,
    "package_inventory_receipt": false,
    "same_package_independent_recalculation": true,
    "field_successor_operation": false,
    "complete_operational_handoff": false
  },
  {
    "control_id": "CS-W36-PC-02",
    "complete_portable_proof": false,
    "incoming_proof_acceptance": false,
    "package_inventory_receipt": false,
    "same_package_independent_recalculation": false,
    "field_successor_operation": false,
    "complete_operational_handoff": false
  },
  {
    "control_id": "CS-W36-PC-03",
    "complete_portable_proof": false,
    "incoming_proof_acceptance": false,
    "package_inventory_receipt": false,
    "same_package_independent_recalculation": false,
    "field_successor_operation": true,
    "complete_operational_handoff": false
  }
];
export const EXPECTED_ADJUDICATIONS = [
  {
    "complete_portable_proof_chain": true,
    "package_inventory_recipient_acknowledgment": false,
    "same_package_independent_recalculation": true,
    "field_successor_operation": false,
    "complete_operational_handoff": false,
    "person_support_added": false,
    "classification": "complete_same_package_portable_proof_verification_without_successor_operation"
  },
  {
    "complete_portable_proof_chain": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_package_independent_recalculation": false,
    "field_successor_operation": false,
    "complete_operational_handoff": false,
    "person_support_added": false,
    "classification": "feature_richer_portable_package_with_seven_unresolved_safety_findings"
  },
  {
    "complete_portable_proof_chain": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_package_independent_recalculation": false,
    "field_successor_operation": true,
    "complete_operational_handoff": false,
    "person_support_added": false,
    "classification": "bounded_field_recipient_operation_without_versioned_package_or_proof_chain"
  }
];

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) { assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`); }

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-portable-proof-closure@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W36-PC-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W34-EH-01','CS-W35-RJ-01']);
  assert.equal(source.as_of, '2026-08-02');
  assert.equal(source.observed_at, '2026-08-02T13:45:00-07:00');
  assert.equal(source.status, 'one_complete_same_package_proof_chain_zero_complete_operational_handoffs_zero_person_findings');
  assert.match(source.purpose, /complete same-package portable proof-verification chain/);
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(Object.keys(source.counts).length, 30);
  assert.equal(source.controls.length, 3);
  assert.equal(source.join_matrix.length, 3);
  assert.equal(source.join_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.join_contract.contact_required, false);
  assert.equal(source.join_contract.control_is_candidate_promotion, false);
  assert.equal(source.join_contract.component_order.length, 10);
  assert.equal(source.join_contract.complete_portable_proof_chain_requires.length, 4);
  assert.equal(source.join_contract.complete_operational_handoff_requires.length, 4);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W36-PC-01','CS-W36-PC-02','CS-W36-PC-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 12);
  assert.equal(new Set(sourceIds).size, 12);
  assert.deepEqual(source.controls.map(control => control.adjudication), EXPECTED_ADJUDICATIONS);
  assert.deepEqual(source.join_matrix, EXPECTED_JOIN_MATRIX);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 10);
    assert.equal(control.positive_findings.length >= 4, true);
    assert.equal(control.known_limits.length >= 5, true);
    assert.equal(control.adjudication.package_inventory_recipient_acknowledgment, false);
    assert.equal(control.adjudication.complete_operational_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const cargo = source.controls[0];
  assert.equal(cargo.source_records.length, 4);
  assert.equal(cargo.adjudication.complete_portable_proof_chain, true);
  assert.equal(cargo.adjudication.same_package_independent_recalculation, true);
  assert.equal(cargo.adjudication.field_successor_operation, false);
  assert.match(cargo.components.successor_operation_from_package_state, /not observed/);

  const arsas = source.controls[1];
  assert.equal(arsas.source_records.length, 5);
  assert.equal(arsas.known_limits.length, 7);
  assert.equal(arsas.adjudication.complete_portable_proof_chain, false);
  assert.match(arsas.adjudication.classification, /seven_unresolved/);

  const basket = source.controls[2];
  assert.equal(basket.source_records.length, 3);
  assert.equal(basket.adjudication.field_successor_operation, true);
  assert.equal(basket.adjudication.complete_portable_proof_chain, false);

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
  assert.equal(registry.controls.filter(control => control.complete_portable_proof_chain).length, 1);
  assert.equal(registry.controls.filter(control => control.field_successor_operation).length, 1);
  assert.equal(registry.controls.every(control => control.complete_operational_handoff === false), true);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W36-PC-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-36: contract, schema, and products valid');
}
