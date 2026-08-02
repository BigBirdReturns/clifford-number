#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAll,
  deriveManifest,
  deriveRegistry,
  deriveReport,
  renderHtml,
  stableJson
} from './build-counter-selector-wave-35.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-35-real-world-handoff-join.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-35-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-35-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-35/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-35/index.html';
const SCHEMA_PATH = 'schemas/counter-selector-real-world-handoff-join.schema.json';

const EXPECTED_COUNTS = {
  controls_audited: 3,
  public_source_records: 10,
  versioned_or_bound_package_surfaces: 2,
  portable_package_implementations: 1,
  bounded_executable_round_trip_surfaces: 1,
  automated_cross_workspace_resumption_surfaces: 1,
  tamper_or_signature_rejection_surfaces: 2,
  continuity_downgrade_surfaces: 1,
  cryptographic_two_party_acceptance_surfaces: 1,
  observed_independent_recipient_operations: 1,
  recipient_acceptance_surfaces: 2,
  external_automated_review_surfaces: 1,
  external_automated_review_findings: 4,
  known_package_safety_defects: 4,
  package_level_recipient_acknowledgments: 0,
  proof_component_joins_completed: 0,
  complete_bounded_executable_handoff_packages: 0,
  complete_direct_person_handoffs: 0,
  person_dimension_supports_added: 0,
  valid_resource_normalized_comparators: 0,
  external_independent_reviews: 0,
  complete_operator_findings: 0,
  field_test_eligible_candidates: 0,
  contacts_authorized: 0,
  bounded_collaborations_authorized: 0,
  promotions: 0,
  person_rankings: 0,
  public_identity_profiles: 0,
  graph_effects: 0,
  adversarial_mutations: 96
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-real-world-handoff-join@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W35-RJ-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W33-PT-01', 'CS-W34-EH-01']);
  assert.equal(source.status, 'three_real_world_controls_zero_complete_join_zero_person_findings');
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(source.controls.length, 3);
  assert.equal(source.join_matrix.length, 3);
  assert.equal(source.join_contract.component_order.length, 10);
  assert.equal(source.join_contract.complete_real_world_handoff_requires.length, 8);
  assert.equal(source.join_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.join_contract.contact_required, false);
  assert.equal(source.join_contract.control_is_candidate_promotion, false);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W35-RJ-01', 'CS-W35-RJ-02', 'CS-W35-RJ-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 10);
  assert.equal(new Set(sourceIds).size, 10);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 10);
    assert.equal(control.positive_findings.length >= 4, true);
    assert.equal(control.known_review_findings.length >= 1, true);
    assert.equal(control.falsifiers.length >= 5, true);
    assert.equal(control.adjudication.complete_bounded_executable_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const arsas = source.controls[0];
  assert.equal(arsas.source_records.length, 4);
  assert.equal(arsas.adjudication.bounded_executable_round_trip, 'observed_in_automated_regression');
  assert.equal(arsas.known_review_findings.length, 4);
  assert.match(arsas.adjudication.safe_conflict_handling, /four_unresolved/);
  assert.match(arsas.adjudication.package_level_recipient_acknowledgment, /absent/);

  const cargo = source.controls[1];
  assert.equal(cargo.source_records.length, 3);
  assert.match(cargo.components.exact_integrity_binding, /Ed25519/);
  assert.match(cargo.adjudication.package_level_recipient_acknowledgment, /not_package_inventory_receipt/);
  assert.equal(cargo.adjudication.field_successor_operation, 'absent');

  const basket = source.controls[2];
  assert.equal(basket.source_records.length, 3);
  assert.match(basket.components.successor_operation_from_package_state, /independently uploads two videos/);
  assert.match(basket.adjudication.package_level_recipient_acknowledgment, /not_package_receipt/);
  assert.match(basket.adjudication.field_successor_operation, /observed_bounded_end_user_operation/);

  for (const row of source.join_matrix) assert.equal(row.complete_join, false);
  assert.equal(source.join_matrix[0].versioned_package, 'yes');
  assert.equal(source.join_matrix[1].integrity, 'cryptographic_two_party_positive');
  assert.equal(source.join_matrix[2].successor_operation, 'bounded_end_user_operation_yes');

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.graph_effect, 'none');

  const schema = readJson(SCHEMA_PATH);
  const boundarySchema = schema.properties.boundaries;
  const boundaryKeys = Object.keys(source.boundaries);
  assert.equal(boundarySchema.type, 'object');
  assert.equal(boundarySchema.additionalProperties, false);
  assert.deepEqual(boundarySchema.required, boundaryKeys);
  assert.deepEqual(Object.keys(boundarySchema.properties), boundaryKeys);
  for (const key of boundaryKeys) {
    const expected = key === 'graph_effect' ? 'none' : false;
    assert.equal(boundarySchema.properties[key].const, expected, `schema boundary ${key}`);
  }

  assert.match(source.next_action, /same identified package/);
  assert.match(source.next_action, /Do not assemble/);
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  const expectedRegistry = deriveRegistry(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.controls.length, 3);
  assert.equal(registry.controls.every(control => control.complete_bounded_executable_handoff === false), true);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);
  assert.equal(registry.controls.every(control => control.operator_finding === false), true);
  assert.equal(registry.controls.every(control => control.field_test_eligible === false), true);
  assert.equal(registry.controls.every(control => control.contact_authorized === false), true);
  assert.equal(registry.controls.every(control => control.graph_effect === 'none'), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W35-RJ-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-35: contract and products valid');
}
