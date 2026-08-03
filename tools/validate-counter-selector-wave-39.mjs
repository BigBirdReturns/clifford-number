#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, deriveManifest, deriveRegistry, deriveReport, renderHtml, stableJson } from './build-counter-selector-wave-39.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-39-digest-selected-restore.json';
const SCHEMA_PATH = 'schemas/counter-selector-digest-selected-restore.schema.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-39-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-39-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-39/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-39/index.html';

export const EXPECTED_COUNTS = {
  "controls_audited": 3,
  "public_source_records": 11,
  "repo_digest_selected_checkpoint_restore_surfaces": 1,
  "repo_digest_selected_successor_operation_joins": 1,
  "dynamic_repo_digest_values_consumed": 1,
  "public_fixed_checkpoint_digest_receipts": 0,
  "new_pod_successor_operation_surfaces": 2,
  "source_container_and_pod_removed_before_restore_surfaces": 2,
  "rootfs_digest_dependency_binding_surfaces": 2,
  "explicit_external_dependency_replay_surfaces": 1,
  "bind_mount_missing_dependency_refusals": 1,
  "application_specific_continuation_surfaces": 1,
  "checkpoint_package_inspection_surfaces": 1,
  "registry_push_routes": 1,
  "registry_round_trip_restore_receipts": 0,
  "itemized_internal_package_manifests": 0,
  "package_inventory_recipient_acknowledgments": 0,
  "complete_authority_credential_ledgers": 0,
  "complete_dependency_access_inventories": 0,
  "hidden_predecessor_state_free_surfaces": 0,
  "namespaced_signature_policy_restore_support_surfaces": 0,
  "namespaced_signature_policy_restore_refusals": 1,
  "clean_destination_operation_surfaces": 0,
  "external_independent_reviews": 0,
  "complete_portable_operational_handoffs": 0,
  "complete_direct_person_handoffs": 0,
  "person_dimension_supports_added": 0,
  "valid_resource_normalized_comparators": 0,
  "complete_operator_findings": 0,
  "field_test_eligible_candidates": 0,
  "contacts_authorized": 0,
  "bounded_collaborations_authorized": 0,
  "promotions": 0,
  "person_rankings": 0,
  "public_identity_profiles": 0,
  "graph_effects": 0,
  "adversarial_mutations": 162
};
export const EXPECTED_BOUNDARIES = {
  "repo_digest_reference_is_public_fixed_digest_receipt": false,
  "repo_digest_selected_restore_is_registry_round_trip": false,
  "new_pod_is_clean_destination": false,
  "new_pod_is_new_host": false,
  "image_digest_is_internal_entry_manifest": false,
  "checkpoint_annotation_is_inventory_acknowledgment": false,
  "rootfs_image_ref_binding_is_self_containment": false,
  "redeclared_bind_mounts_are_package_contents": false,
  "explicit_dependency_failure_is_complete_dependency_inventory": false,
  "running_successor_is_application_continuation": false,
  "archive_application_continuation_may_be_borrowed_into_digest_control": false,
  "checkpointctl_inspection_is_recipient_acknowledgment": false,
  "registry_push_route_is_registry_restore_receipt": false,
  "same_project_integration_is_external_independent_review": false,
  "digest_selected_system_control_is_person_support": false,
  "proof_components_across_controls_may_be_combined": false,
  "package_variants_may_be_combined_within_system": false,
  "public_fixed_checkpoint_digest_receipt": false,
  "clean_destination_operation_proven": false,
  "contact_authorized": false,
  "field_test_authorized": false,
  "promotion_authorized": false,
  "person_ranking_authorized": false,
  "public_identity_profile_authorized": false,
  "graph_effect": "none"
};
export const EXPECTED_JOIN_MATRIX = [
  {
    "control_id": "CS-W39-DR-01",
    "repo_digest_selector": true,
    "new_pod_operation": true,
    "application_continuation": false,
    "explicit_dependency_replay": false,
    "package_inspection": false,
    "registry_push_route": false,
    "public_fixed_digest": false,
    "inventory_acknowledgment": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W39-DR-02",
    "repo_digest_selector": false,
    "new_pod_operation": true,
    "application_continuation": true,
    "explicit_dependency_replay": true,
    "package_inspection": false,
    "registry_push_route": false,
    "public_fixed_digest": false,
    "inventory_acknowledgment": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W39-DR-03",
    "repo_digest_selector": false,
    "new_pod_operation": false,
    "application_continuation": false,
    "explicit_dependency_replay": false,
    "package_inspection": true,
    "registry_push_route": true,
    "public_fixed_digest": false,
    "inventory_acknowledgment": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  }
];
export const EXPECTED_ADJUDICATIONS = [
  {
    "repo_digest_selected_checkpoint_package": true,
    "public_fixed_checkpoint_digest_receipt": false,
    "new_pod_successor_operation": true,
    "source_container_and_pod_removed_before_restore": true,
    "rootfs_digest_dependency_binding": true,
    "explicit_external_dependency_replay": false,
    "application_specific_continuation": false,
    "checkpoint_package_inspection": false,
    "registry_push_route": false,
    "registry_round_trip_restore": false,
    "hidden_predecessor_state_free": false,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "repo_digest_selected_checkpoint_image_restored_into_new_pod_with_external_dependency_state"
  },
  {
    "repo_digest_selected_checkpoint_package": false,
    "public_fixed_checkpoint_digest_receipt": false,
    "new_pod_successor_operation": true,
    "source_container_and_pod_removed_before_restore": true,
    "rootfs_digest_dependency_binding": true,
    "explicit_external_dependency_replay": true,
    "application_specific_continuation": true,
    "checkpoint_package_inspection": false,
    "registry_push_route": false,
    "registry_round_trip_restore": false,
    "hidden_predecessor_state_free": false,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "new_pod_archive_restore_with_application_continuation_and_external_bind_mount_replay"
  },
  {
    "repo_digest_selected_checkpoint_package": false,
    "public_fixed_checkpoint_digest_receipt": false,
    "new_pod_successor_operation": false,
    "source_container_and_pod_removed_before_restore": false,
    "rootfs_digest_dependency_binding": false,
    "explicit_external_dependency_replay": false,
    "application_specific_continuation": false,
    "checkpoint_package_inspection": true,
    "registry_push_route": true,
    "registry_round_trip_restore": false,
    "hidden_predecessor_state_free": false,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "inspectable_checkpoint_archive_and_registry_push_route_without_downstream_operation_receipt"
  }
];

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) { assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`); }

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-digest-selected-restore@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W39-DR-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W38-PO-01']);
  assert.equal(source.as_of, '2026-08-03');
  assert.equal(source.observed_at, '2026-08-03T03:30:00-07:00');
  assert.equal(source.status, 'one_repo_digest_selected_checkpoint_operation_join_zero_public_fixed_digest_receipts_zero_inventory_acknowledgments_zero_complete_portable_operational_handoffs_zero_person_findings');
  assert.match(source.purpose, /repository digest/);
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(Object.keys(source.counts).length, 37);
  assert.equal(source.controls.length, 3);
  assert.equal(source.join_matrix.length, 3);
  assert.equal(source.handoff_contract.component_order.length, 14);
  assert.equal(source.handoff_contract.complete_portable_operational_handoff_requires.length, 9);
  assert.equal(source.handoff_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.handoff_contract.package_variants_may_be_combined_within_system, false);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.control_is_candidate_promotion, false);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W39-DR-01','CS-W39-DR-02','CS-W39-DR-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 11);
  assert.equal(new Set(sourceIds).size, 11);
  assert.deepEqual(source.controls.map(control => control.adjudication), EXPECTED_ADJUDICATIONS);
  assert.deepEqual(source.join_matrix, EXPECTED_JOIN_MATRIX);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 14);
    assert.equal(control.positive_findings.length >= 4, true);
    assert.equal(control.known_limits.length >= 7, true);
    assert.equal(Object.keys(control.adjudication).length, 16);
    assert.equal(control.adjudication.public_fixed_checkpoint_digest_receipt, false);
    assert.equal(control.adjudication.registry_round_trip_restore, false);
    assert.equal(control.adjudication.hidden_predecessor_state_free, false);
    assert.equal(control.adjudication.package_inventory_recipient_acknowledgment, false);
    assert.equal(control.adjudication.external_independent_review, false);
    assert.equal(control.adjudication.complete_portable_operational_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const digest = source.controls[0];
  assert.equal(digest.source_records.length, 5);
  assert.equal(digest.adjudication.repo_digest_selected_checkpoint_package, true);
  assert.equal(digest.adjudication.new_pod_successor_operation, true);
  assert.equal(digest.adjudication.application_specific_continuation, false);
  assert.equal(digest.adjudication.rootfs_digest_dependency_binding, true);
  assert.match(digest.components.exact_package_selector, /repoDigest/);
  assert.match(digest.known_limits.join(' '), /does not retain one literal checkpoint repoDigest value/);

  const archive = source.controls[1];
  assert.equal(archive.source_records.length, 3);
  assert.equal(archive.adjudication.explicit_external_dependency_replay, true);
  assert.equal(archive.adjudication.application_specific_continuation, true);
  assert.equal(archive.adjudication.repo_digest_selected_checkpoint_package, false);
  assert.match(archive.components.dependencies_and_access, /bind mounts/);

  const tooling = source.controls[2];
  assert.equal(tooling.source_records.length, 3);
  assert.equal(tooling.adjudication.checkpoint_package_inspection, true);
  assert.equal(tooling.adjudication.registry_push_route, true);
  assert.equal(tooling.adjudication.new_pod_successor_operation, false);
  assert.equal(tooling.adjudication.registry_round_trip_restore, false);

  assert.deepEqual(source.boundaries, EXPECTED_BOUNDARIES);
  assert.equal(Object.keys(source.boundaries).length, 25);
  assert.match(source.next_action, /fixed-digest checkpoint image/);
  assert.match(source.next_action, /Do not borrow/);
  assert.equal(source.graph_effect, 'none');
}

export function validateSchemaAgainstSource(schema, source) {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.counts.additionalProperties, false);
  assert.equal(schema.properties.boundaries.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties.counts.properties), Object.keys(source.counts));
  assert.deepEqual(schema.properties.counts.required, Object.keys(source.counts));
  for (const [key, value] of Object.entries(source.counts)) {
    assert.equal(schema.properties.counts.properties[key].const, value, `count schema drift: ${key}`);
  }
  assert.deepEqual(Object.keys(schema.properties.boundaries.properties), Object.keys(source.boundaries));
  assert.deepEqual(schema.properties.boundaries.required, Object.keys(source.boundaries));
  for (const [key, value] of Object.entries(source.boundaries)) {
    assert.equal(schema.properties.boundaries.properties[key].const, value, `boundary schema drift: ${key}`);
  }
  assert.equal(schema.$defs.control.additionalProperties, false);
  assert.equal(schema.$defs.sourceRecord.additionalProperties, false);
  assert.equal(schema.$defs.joinRow.additionalProperties, false);
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
  assert.equal(registry.controls.filter(control => control.repo_digest_selected_checkpoint_package).length, 1);
  assert.equal(registry.controls.filter(control => control.new_pod_successor_operation).length, 2);
  assert.equal(registry.controls.filter(control => control.application_specific_continuation).length, 1);
  assert.equal(registry.controls.filter(control => control.checkpoint_package_inspection).length, 1);
  assert.equal(registry.controls.every(control => control.complete_portable_operational_handoff === false), true);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W39-DR-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-39: contract, schema, and products valid');
}
