#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, deriveManifest, deriveRegistry, deriveReport, renderHtml, stableJson } from './build-counter-selector-wave-38.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-38-portable-operational-checkpoint.json';
const SCHEMA_PATH = 'schemas/counter-selector-portable-operational-checkpoint.schema.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-38-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-38-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-38/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-38/index.html';

export const EXPECTED_TITLE = "Counter-Selector Wave 38: content-addressed checkpoint operation join and hidden predecessor remainder";
export const EXPECTED_STATUS = "one_content_addressed_checkpoint_image_operation_join_zero_inventory_acknowledgments_zero_complete_portable_operational_handoffs_zero_person_findings";
export const EXPECTED_PURPOSE = "Adjudicate the first public same-object checkpoint surface that joins a content-addressed portable package to observed successor operation, while preserving the absence of itemized internal inventory, recipient acknowledgment, complete authority and dependency custody, hidden-predecessor-state freedom, external independent review, and person-level support.";
export const EXPECTED_NEXT_ACTION = "Seek one exact checkpoint package whose internal entries, base image or rootfs, runtime and kernel dependencies, credentials and authority, network and volume access, open decisions, and rollback state are itemized and integrity-bound; whose recipient acknowledges that inventory; whose destination begins clean without hidden predecessor state; whose application-specific continuation is observed; and whose whole chain is independently reproduced outside the originating project. Do not borrow Podman export/import service continuity into the OCI image case, combine E2B live continuity with Cargo proof, or convert a system control into person support.";
export const EXPECTED_COUNTS = {
  "controls_audited": 4,
  "public_source_records": 21,
  "content_addressed_checkpoint_image_surfaces": 1,
  "content_addressed_package_successor_operation_joins": 1,
  "package_level_manifest_operation_joins": 1,
  "portable_package_successor_operation_surfaces": 2,
  "same_object_successor_operation_surfaces": 3,
  "source_container_removed_before_restore_surfaces": 2,
  "restored_successor_running_surfaces": 3,
  "cross_root_service_continuation_surfaces": 1,
  "post_restore_output_growth_receipts": 2,
  "volume_state_transfer_receipts": 1,
  "same_pid_live_handoff_surfaces": 1,
  "complete_same_package_portable_proof_chains": 1,
  "itemized_internal_package_manifests": 0,
  "package_inventory_recipient_acknowledgments": 0,
  "complete_authority_credential_ledgers": 0,
  "complete_dependency_access_inventories": 0,
  "hidden_predecessor_state_free_surfaces": 0,
  "base_image_pull_dependencies": 2,
  "silent_optional_entry_copy_paths": 1,
  "minimal_inventory_only_acceptance_checks": 1,
  "complete_portable_operational_handoffs": 0,
  "external_independent_reviews": 0,
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
  "arsas_unresolved_safety_findings": 7,
  "adversarial_mutations": 162
};
export const EXPECTED_BOUNDARIES = {
  "oci_manifest_digest_is_itemized_internal_inventory": false,
  "oci_layer_digest_is_per_entry_checkpoint_digest": false,
  "checkpoint_image_is_self_contained_operational_package": false,
  "source_container_removal_proves_hidden_state_absence": false,
  "automatic_base_image_pull_is_dependency_carried": false,
  "restore_runtime_acceptance_is_recipient_inventory_acknowledgment": false,
  "running_status_is_application_specific_correctness": false,
  "same_container_id_is_same_pid_continuity": false,
  "cross_root_tar_continuation_may_be_borrowed_into_oci_image": false,
  "cross_root_archive_is_content_addressed_manifest": false,
  "fixed_import_copy_list_is_itemized_acknowledgment": false,
  "inventory_img_exists_is_complete_package_validation": false,
  "debug_logged_missing_entry_is_fail_closed_inventory": false,
  "runtime_compatibility_annotations_are_authority_credential_ledger": false,
  "checkpoint_config_is_complete_open_decision_inventory": false,
  "same_system_testing_is_external_independent_review": false,
  "e2b_live_handoff_plus_podman_package_plus_cargo_proof_is_one_handoff": false,
  "complete_proof_chain_is_successor_operation": false,
  "system_control_success_is_person_support": false,
  "living_subject_is_contact_authorization": false,
  "field_test_authorized": false,
  "promotion_authorized": false,
  "person_ranking_authorized": false,
  "public_identity_profile_authorized": false,
  "graph_effect": "none"
};
export const EXPECTED_JOIN_MATRIX = [
  {
    "control_id": "CS-W38-PO-01",
    "content_addressed_package": true,
    "package_level_manifest": true,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W38-PO-02",
    "content_addressed_package": false,
    "package_level_manifest": false,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": true,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W38-PO-03",
    "content_addressed_package": false,
    "package_level_manifest": false,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": true,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W38-PO-04",
    "content_addressed_package": true,
    "package_level_manifest": true,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "application_specific_continuation": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  }
];
export const EXPECTED_ADJUDICATIONS = [
  {
    "content_addressed_portable_package": true,
    "package_level_manifest_binding": true,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "content_addressed_oci_checkpoint_image_with_restored_successor_operation_and_hidden_base_image_dependency"
  },
  {
    "content_addressed_portable_package": false,
    "package_level_manifest_binding": false,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": true,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "cross_root_checkpoint_archive_with_service_and_volume_continuation_without_content_addressed_manifest"
  },
  {
    "content_addressed_portable_package": false,
    "package_level_manifest_binding": false,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": true,
    "application_specific_continuation": true,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "complete_bounded_live_process_state_handoff_without_portable_package_custody"
  },
  {
    "content_addressed_portable_package": true,
    "package_level_manifest_binding": true,
    "itemized_operational_inventory": false,
    "package_inventory_recipient_acknowledgment": false,
    "same_object_successor_operation": false,
    "application_specific_continuation": false,
    "hidden_predecessor_state_free": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "complete_same_package_portable_proof_chain_without_operational_successor"
  }
];

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) { assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`); }

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-portable-operational-checkpoint@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W38-PO-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W36-PC-01','CS-W37-LH-01']);
  assert.equal(source.as_of, '2026-08-03');
  assert.equal(source.observed_at, '2026-08-03T01:06:08-07:00');
  assert.equal(source.title, EXPECTED_TITLE);
  assert.equal(source.status, EXPECTED_STATUS);
  assert.equal(source.purpose, EXPECTED_PURPOSE);
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(Object.keys(source.counts).length, 37);
  assert.equal(source.controls.length, 4);
  assert.equal(source.join_matrix.length, 4);
  assert.deepEqual(source.handoff_contract.component_order, ["same_object_identity", "package_identity", "package_content_addressing", "internal_inventory_and_entry_integrity", "outgoing_and_incoming_roles", "authority_and_credentials", "dependencies_and_access", "open_decisions_and_deadlines", "rollback_safe_decline_and_failure_containment", "recipient_or_successor_acknowledgment", "successor_operation_from_package", "independent_verification"]);
  assert.equal(source.handoff_contract.complete_portable_operational_handoff_requires.length, 8);
  assert.equal(source.handoff_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.handoff_contract.package_variants_may_be_combined_within_system, false);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.control_is_candidate_promotion, false);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W38-PO-01','CS-W38-PO-02','CS-W38-PO-03','CS-W38-PO-04']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 21);
  assert.equal(new Set(sourceIds).size, 21);
  assert.deepEqual(source.controls.map(control => control.adjudication), EXPECTED_ADJUDICATIONS);
  assert.deepEqual(source.join_matrix, EXPECTED_JOIN_MATRIX);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 12);
    assert.equal(control.positive_findings.length >= 4, true);
    assert.equal(control.known_limits.length >= 6, true);
    assert.equal(control.adjudication.itemized_operational_inventory, false);
    assert.equal(control.adjudication.package_inventory_recipient_acknowledgment, false);
    assert.equal(control.adjudication.hidden_predecessor_state_free, false);
    assert.equal(control.adjudication.external_independent_review, false);
    assert.equal(control.adjudication.complete_portable_operational_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const podmanImage = source.controls[0];
  assert.equal(podmanImage.source_records.length, 9);
  assert.equal(podmanImage.adjudication.content_addressed_portable_package, true);
  assert.equal(podmanImage.adjudication.package_level_manifest_binding, true);
  assert.equal(podmanImage.adjudication.same_object_successor_operation, true);
  assert.equal(podmanImage.adjudication.application_specific_continuation, false);
  assert.match(podmanImage.components.dependencies_and_access, /pulls the original rootfs image/);
  assert.match(podmanImage.known_limits.join(' '), /per-entry manifest/);
  assert.match(podmanImage.known_limits.join(' '), /cannot be borrowed/);

  const podmanArchive = source.controls[1];
  assert.equal(podmanArchive.source_records.length, 4);
  assert.equal(podmanArchive.adjudication.content_addressed_portable_package, false);
  assert.equal(podmanArchive.adjudication.same_object_successor_operation, true);
  assert.equal(podmanArchive.adjudication.application_specific_continuation, true);
  assert.match(podmanArchive.components.successor_operation_from_package, /timestamp file advances/);

  const e2b = source.controls[2];
  assert.equal(e2b.source_records.length, 4);
  assert.equal(e2b.adjudication.same_object_successor_operation, true);
  assert.equal(e2b.adjudication.content_addressed_portable_package, false);
  assert.match(e2b.components.successor_operation_from_package, /same workload PID/);

  const cargo = source.controls[3];
  assert.equal(cargo.source_records.length, 4);
  assert.equal(cargo.adjudication.content_addressed_portable_package, true);
  assert.equal(cargo.adjudication.same_object_successor_operation, false);
  assert.match(cargo.adjudication.classification, /proof_chain/);

  assert.deepEqual(source.boundaries, EXPECTED_BOUNDARIES);
  assert.equal(Object.keys(source.boundaries).length, 25);
  assert.equal(source.next_action, EXPECTED_NEXT_ACTION);
  assert.match(source.next_action, /hidden predecessor state/);
  assert.match(source.next_action, /Do not borrow/);
  assert.equal(source.graph_effect, 'none');
}

export function validateSchemaAgainstSource(schema, source) {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.counts.additionalProperties, false);
  assert.equal(schema.properties.boundaries.additionalProperties, false);
  const countKeys = Object.keys(source.counts);
  assert.deepEqual(Object.keys(schema.properties.counts.properties), countKeys);
  assert.deepEqual(schema.properties.counts.required, countKeys);
  for (const [key, value] of Object.entries(source.counts)) {
    assert.equal(schema.properties.counts.properties[key].const, value, `count schema drift: ${key}`);
  }
  const boundaryKeys = Object.keys(source.boundaries);
  assert.deepEqual(Object.keys(schema.properties.boundaries.properties), boundaryKeys);
  assert.deepEqual(schema.properties.boundaries.required, boundaryKeys);
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
  assert.equal(registry.controls.length, 4);
  assert.equal(registry.controls.filter(control => control.content_addressed_portable_package && control.same_object_successor_operation).length, 1);
  assert.equal(registry.controls.filter(control => control.application_specific_continuation).length, 2);
  assert.equal(registry.controls.filter(control => control.package_inventory_recipient_acknowledgment).length, 0);
  assert.equal(registry.controls.filter(control => control.complete_portable_operational_handoff).length, 0);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W38-PO-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-38: package-operation join, schema, and products valid');
}
