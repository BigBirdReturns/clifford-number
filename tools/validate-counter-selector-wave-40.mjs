#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAll,
  deriveManifest,
  deriveRegistry,
  deriveReport,
  renderHtml,
  renderMethod,
  renderMilestone,
  stableJson,
} from './build-counter-selector-wave-40.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-40-cross-host-registry.json';
const SCHEMA_PATH = 'schemas/counter-selector-cross-host-registry.schema.json';
const WORKFLOW_PATH = '.github/workflows/counter-selector-wave-40.yml';
const BUILDER_PATH = 'tools/build-counter-selector-wave-40.mjs';
const VALIDATOR_PATH = 'tools/validate-counter-selector-wave-40.mjs';
const TEST_PATH = 'test/counter-selector-wave-40.test.js';
const REGISTRY_PATH = 'data/project/counter-selector-wave-40-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-40-release-manifest.json';
const METHOD_PATH = 'docs/methods/counter-selector-cross-host-registry.md';
const MILESTONE_PATH = 'docs/milestones/counter-selector-wave-40.md';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-40/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-40/index.html';

const EXPECTED_SOURCE_SHA256 = '738b1a83d3aba25418862a3acf1aa1d2b3461add0b36d00dafe77385d9b4baad';
const EXPECTED_SCHEMA_SHA256 = '0b99dadbf1edb0bc840dd391ce09a4e9093904567f43b6237dbd50440b5be195';
const EXPECTED_WORKFLOW_SHA256 = '501d997df8e608482d709d9d05b445fb9c2cf7f14dab1dec44d61abc764517c7';
const EXPECTED_BUILDER_SHA256 = 'fa5ded798e6281ae9bf973456129dcb573f6db7ccdcdfdb146a7d5b54ba1d86e';
const EXPECTED_TEST_SHA256 = 'b90f4d8b0fe7a7876541b0c5923625e0f37608e2aee8fef345f0ab57517db248';

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export const EXPECTED_COUNTS = {
  "controls_audited": 3,
  "public_source_records": 11,
  "documented_checkpoint_image_registry_migration_routes": 1,
  "registry_push_route_surfaces": 1,
  "registry_pull_on_different_system_surfaces": 1,
  "restore_from_pulled_checkpoint_image_surfaces": 1,
  "observed_registry_round_trip_receipts": 0,
  "public_fixed_checkpoint_digest_receipts": 0,
  "cross_host_archive_application_continuation_surfaces": 1,
  "source_application_state_observations": 1,
  "destination_application_state_continuations": 1,
  "different_host_restore_surfaces": 2,
  "clean_destination_operation_surfaces": 0,
  "checkpoint_compatibility_metadata_surfaces": 2,
  "runtime_mismatch_refusal_surfaces": 2,
  "base_image_dependency_replay_surfaces": 2,
  "itemized_internal_package_manifests": 0,
  "package_inventory_recipient_acknowledgments": 0,
  "complete_authority_credential_ledgers": 0,
  "complete_dependency_access_inventories": 0,
  "rollback_safe_decline_receipts": 0,
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
  "adversarial_mutations": 329,
  "exact_contract_tamper_cases": 8
};
export const EXPECTED_BOUNDARIES = {
  "documented_registry_route_is_observed_round_trip": false,
  "different_system_command_is_clean_destination_receipt": false,
  "tag_named_restore_is_fixed_digest_restore": false,
  "oci_content_addressability_is_public_checkpoint_digest_receipt": false,
  "registry_push_pull_route_is_recipient_acknowledgment": false,
  "cross_host_archive_is_registry_checkpoint_image": false,
  "cross_host_archive_application_receipt_may_be_borrowed_into_registry_image_control": false,
  "registry_image_route_may_be_borrowed_into_archive_control": false,
  "base_image_available_on_destination_is_self_containment": false,
  "checkpoint_annotations_are_complete_dependency_inventory": false,
  "runtime_mismatch_refusal_is_complete_compatibility_inventory": false,
  "destination_host_is_independent_external_review": false,
  "documented_commands_are_execution_receipt": false,
  "official_vendor_documentation_is_external_independent_review": false,
  "proof_components_across_controls_may_be_combined": false,
  "package_variants_may_be_combined_within_system": false,
  "public_fixed_checkpoint_digest_receipt": false,
  "clean_destination_operation_proven": false,
  "rollback_or_safe_decline_proven": false,
  "contact_authorized": false,
  "field_test_authorized": false,
  "promotion_authorized": false,
  "person_ranking_authorized": false,
  "public_identity_profile_authorized": false,
  "graph_effect": "none"
};
export const EXPECTED_JOIN_MATRIX = [
  {
    "control_id": "CS-W40-RM-01",
    "documented_registry_route": true,
    "registry_push": true,
    "different_system_pull": true,
    "restore_from_pulled_image": true,
    "observed_round_trip": false,
    "fixed_digest": false,
    "cross_host_application": false,
    "different_host": true,
    "clean_destination": false,
    "compatibility_metadata": true,
    "runtime_refusal": false,
    "dependency_replay": true,
    "inventory_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W40-RM-02",
    "documented_registry_route": false,
    "registry_push": false,
    "different_system_pull": false,
    "restore_from_pulled_image": false,
    "observed_round_trip": false,
    "fixed_digest": false,
    "cross_host_application": true,
    "different_host": true,
    "clean_destination": false,
    "compatibility_metadata": false,
    "runtime_refusal": true,
    "dependency_replay": true,
    "inventory_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  },
  {
    "control_id": "CS-W40-RM-03",
    "documented_registry_route": false,
    "registry_push": false,
    "different_system_pull": false,
    "restore_from_pulled_image": false,
    "observed_round_trip": false,
    "fixed_digest": false,
    "cross_host_application": false,
    "different_host": false,
    "clean_destination": false,
    "compatibility_metadata": true,
    "runtime_refusal": true,
    "dependency_replay": true,
    "inventory_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support": false
  }
];
export const EXPECTED_ADJUDICATIONS = [
  {
    "documented_checkpoint_image_registry_migration_route": true,
    "registry_push_route": true,
    "registry_pull_on_different_system": true,
    "restore_from_pulled_checkpoint_image": true,
    "observed_registry_round_trip": false,
    "public_fixed_checkpoint_digest_receipt": false,
    "cross_host_application_continuation": false,
    "different_host_restore": true,
    "clean_destination_operation": false,
    "checkpoint_compatibility_metadata": true,
    "runtime_mismatch_refusal": false,
    "base_image_dependency_replay": true,
    "application_specific_continuation": false,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "same_system_documented_checkpoint_image_registry_migration_route_without_observed_round_trip_or_application_receipt"
  },
  {
    "documented_checkpoint_image_registry_migration_route": false,
    "registry_push_route": false,
    "registry_pull_on_different_system": false,
    "restore_from_pulled_checkpoint_image": false,
    "observed_registry_round_trip": false,
    "public_fixed_checkpoint_digest_receipt": false,
    "cross_host_application_continuation": true,
    "different_host_restore": true,
    "clean_destination_operation": false,
    "checkpoint_compatibility_metadata": false,
    "runtime_mismatch_refusal": true,
    "base_image_dependency_replay": true,
    "application_specific_continuation": true,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "cross_host_archive_application_continuation_with_external_base_image_dependency_without_content_addressed_registry_package"
  },
  {
    "documented_checkpoint_image_registry_migration_route": false,
    "registry_push_route": false,
    "registry_pull_on_different_system": false,
    "restore_from_pulled_checkpoint_image": false,
    "observed_registry_round_trip": false,
    "public_fixed_checkpoint_digest_receipt": false,
    "cross_host_application_continuation": false,
    "different_host_restore": false,
    "clean_destination_operation": false,
    "checkpoint_compatibility_metadata": true,
    "runtime_mismatch_refusal": true,
    "base_image_dependency_replay": true,
    "application_specific_continuation": false,
    "package_inventory_recipient_acknowledgment": false,
    "external_independent_review": false,
    "complete_portable_operational_handoff": false,
    "person_support_added": false,
    "classification": "checkpoint_compatibility_metadata_and_fail_closed_runtime_boundary_without_complete_dependency_inventory"
  }
];
export const EXPECTED_CONTROL_METADATA = [
  {
    "control_id": "CS-W40-RM-01",
    "public_label": "same-system documented checkpoint-image registry migration route",
    "control_type": "documented_registry_migration_route_without_execution_receipt",
    "system_or_subject": "Podman checkpoint image push, different-system pull, and restore route"
  },
  {
    "control_id": "CS-W40-RM-02",
    "public_label": "cross-host checkpoint-archive application continuation",
    "control_type": "cross_host_application_continuation_without_registry_package_identity",
    "system_or_subject": "Red Hat Podman archive migration procedure"
  },
  {
    "control_id": "CS-W40-RM-03",
    "public_label": "checkpoint compatibility metadata and fail-closed runtime boundary",
    "control_type": "compatibility_metadata_and_refusal_without_complete_dependency_inventory",
    "system_or_subject": "Podman checkpoint annotations and restore compatibility controls"
  }
];
export const EXPECTED_SOURCE_RECORDS = [
  [
    {
      "source_id": "CS-W40-S01",
      "title": "Podman checkpoint image creation and different-system registry migration contract",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html",
      "source_class": "checkpoint_image_registry_migration_contract",
      "artifact_scope": "Defines --create-image as a standard OCI image with one checkpoint layer and states that it can be pushed to a standard registry and pulled on a different system to enable migration."
    },
    {
      "source_id": "CS-W40-S02",
      "title": "Podman checkpoint-image registry push, pull, and restore command route",
      "publisher": "CRIU project",
      "date": "2026-08-03",
      "url": "https://criu.org/index.php?title=Podman&oldid=5638",
      "source_class": "concrete_registry_migration_command_route",
      "artifact_scope": "Shows one looper container, creation of a registry-named checkpoint image, podman push, podman pull on a different system, and podman container restore from the pulled image."
    },
    {
      "source_id": "CS-W40-S03",
      "title": "Podman restore from checkpoint image contract",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html",
      "source_class": "checkpoint_image_restore_contract",
      "artifact_scope": "Defines restore inputs as container or checkpoint-image IDs or names and documents restore from one checkpoint image, including renaming and compatibility-sensitive options."
    },
    {
      "source_id": "CS-W40-S04",
      "title": "OCI Distribution Specification v1.1.1",
      "publisher": "Open Container Initiative",
      "date": "2026-08-03",
      "url": "https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md",
      "source_class": "registry_push_pull_and_digest_reference_contract",
      "artifact_scope": "Defines registry push and pull APIs, permits manifest references by tag or digest, and requires registries to retain uploaded manifest bytes and expose digest-addressed retrieval semantics."
    },
    {
      "source_id": "CS-W40-S05",
      "title": "OCI content descriptor contract",
      "publisher": "Open Container Initiative",
      "date": "2026-08-03",
      "url": "https://github.com/opencontainers/image-spec/blob/af26a05fba5ee648512f4ea3c9fda1fcc1b6d6dc/descriptor.md",
      "source_class": "content_digest_and_size_binding_contract",
      "artifact_scope": "Defines content descriptors that bind referenced bytes by digest and size and support independent digest verification."
    }
  ],
  [
    {
      "source_id": "CS-W40-S06",
      "title": "Container migration with Podman on RHEL",
      "publisher": "Red Hat",
      "date": "2026-08-03",
      "url": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_creating-and-restoring-container-checkpoints_configuring-unified-configuration-for-rootless-podman",
      "source_class": "cross_host_application_continuation_procedure",
      "artifact_scope": "Shows a counter service returning 0 and 1 on the source host, checkpoint export, transfer to other_host, restore on other_host, and a subsequent response of 2."
    },
    {
      "source_id": "CS-W40-S07",
      "title": "Podman checkpoint archive export contract",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html",
      "source_class": "cross_system_checkpoint_archive_contract",
      "artifact_scope": "Defines exported checkpoint archives and distinguishes their rootfs and volume inclusion choices from checkpoint OCI images."
    },
    {
      "source_id": "CS-W40-S08",
      "title": "Podman checkpoint archive import and runtime compatibility refusal",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html",
      "source_class": "cross_host_archive_restore_and_runtime_refusal_contract",
      "artifact_scope": "Defines import from another host and states that restore aborts when the requested runtime does not match the runtime recorded during container creation."
    }
  ],
  [
    {
      "source_id": "CS-W40-S09",
      "title": "Podman checkpoint-image source-environment annotations",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html",
      "source_class": "checkpoint_compatibility_metadata_contract",
      "artifact_scope": "Lists checkpoint name, raw image name, rootfs image ID, runtime, architecture, kernel, CRIU, and Podman metadata that can be inspected on a checkpoint image."
    },
    {
      "source_id": "CS-W40-S10",
      "title": "Podman fail-closed restore compatibility contract",
      "publisher": "Podman",
      "date": "2026-08-03",
      "url": "https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html",
      "source_class": "runtime_and_restore_option_refusal_contract",
      "artifact_scope": "Requires compatible runtime and restore options for file locks and TCP state and aborts restore when the selected runtime does not match the recorded runtime."
    },
    {
      "source_id": "CS-W40-S11",
      "title": "RHEL Podman destination-image and compatibility prerequisites",
      "publisher": "Red Hat",
      "date": "2026-08-03",
      "url": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_creating-and-restoring-container-checkpoints_configuring-unified-configuration-for-rootless-podman",
      "source_class": "destination_dependency_replay_contract",
      "artifact_scope": "States that the destination needs the original container image, obtained from a registry or transferred separately, before restoring the checkpoint archive."
    }
  ]
];

export function validateStaticInputs(overrides = {}) {
  const workflowBytes = overrides.workflowBytes ?? fs.readFileSync(path.join(ROOT, WORKFLOW_PATH));
  const builderBytes = overrides.builderBytes ?? fs.readFileSync(path.join(ROOT, BUILDER_PATH));
  const testBytes = overrides.testBytes ?? fs.readFileSync(path.join(ROOT, TEST_PATH));
  assert.equal(sha256(workflowBytes), EXPECTED_WORKFLOW_SHA256, 'workflow exact-contract drift');
  assert.equal(sha256(builderBytes), EXPECTED_BUILDER_SHA256, 'builder exact-contract drift');
  assert.equal(sha256(testBytes), EXPECTED_TEST_SHA256, 'test exact-contract drift');
  const workflow = workflowBytes.toString('utf8');
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.match(workflow, /npm run release:check/);
  assert.match(workflow, /git status --porcelain=v1 --untracked-files=all/);
}

export function validateGeneratedNarratives(
  source,
  methodBytes = fs.readFileSync(path.join(ROOT, METHOD_PATH)),
  milestoneBytes = fs.readFileSync(path.join(ROOT, MILESTONE_PATH)),
) {
  assert.equal(methodBytes.toString('utf8'), renderMethod(source), 'method narrative exact-contract drift');
  assert.equal(milestoneBytes.toString('utf8'), renderMilestone(source), 'milestone narrative exact-contract drift');
  assert.doesNotMatch(methodBytes.toString('utf8'), /first public|complete handoff established/i);
  assert.doesNotMatch(milestoneBytes.toString('utf8'), /first public|complete handoff established/i);
}

export function validateSource(source) {
  assert.equal(sha256(Buffer.from(stableJson(source), 'utf8')), EXPECTED_SOURCE_SHA256, 'source exact-contract drift');
  assert.equal(source.schema_version, 'counter-selector-cross-host-registry@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W40-RM-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W39-DR-01']);
  assert.equal(source.as_of, '2026-08-03');
  assert.equal(source.observed_at, '2026-08-03T10:47:12-07:00');
  assert.match(source.title, /Wave 40/);
  assert.match(source.purpose, /same-package registry handoff/);
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(Object.keys(source.counts).length, 36);
  assert.equal(source.controls.length, 3);
  assert.equal(source.join_matrix.length, 3);
  assert.equal(source.handoff_contract.component_order.length, 14);
  assert.equal(source.handoff_contract.complete_portable_operational_handoff_requires.length, 9);
  assert.equal(source.handoff_contract.proofs_may_be_assembled_across_controls, false);
  assert.equal(source.handoff_contract.package_variants_may_be_combined_within_system, false);
  assert.equal(source.handoff_contract.documentation_is_execution_receipt, false);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.control_is_candidate_promotion, false);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W40-RM-01', 'CS-W40-RM-02', 'CS-W40-RM-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 11);
  assert.equal(new Set(sourceIds).size, 11);
  assert.deepEqual(source.controls.map(control => ({
    control_id: control.control_id,
    public_label: control.public_label,
    control_type: control.control_type,
    system_or_subject: control.system_or_subject,
  })), EXPECTED_CONTROL_METADATA);
  assert.deepEqual(source.controls.map(control => control.source_records), EXPECTED_SOURCE_RECORDS);
  assert.deepEqual(source.controls.map(control => control.adjudication), EXPECTED_ADJUDICATIONS);
  assert.deepEqual(source.join_matrix, EXPECTED_JOIN_MATRIX);

  for (const control of source.controls) {
    assert.equal(Object.keys(control.components).length, 14);
    assert.equal(control.positive_findings.length, 5);
    assert.equal(control.known_limits.length, 10);
    assert.equal(Object.keys(control.adjudication).length, 18);
    assert.equal(control.adjudication.observed_registry_round_trip, false);
    assert.equal(control.adjudication.public_fixed_checkpoint_digest_receipt, false);
    assert.equal(control.adjudication.clean_destination_operation, false);
    assert.equal(control.adjudication.package_inventory_recipient_acknowledgment, false);
    assert.equal(control.adjudication.external_independent_review, false);
    assert.equal(control.adjudication.complete_portable_operational_handoff, false);
    assert.equal(control.adjudication.person_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
  }

  const route = source.controls[0];
  assert.equal(route.adjudication.documented_checkpoint_image_registry_migration_route, true);
  assert.equal(route.adjudication.registry_push_route, true);
  assert.equal(route.adjudication.registry_pull_on_different_system, true);
  assert.equal(route.adjudication.restore_from_pulled_checkpoint_image, true);
  assert.equal(route.adjudication.application_specific_continuation, false);
  assert.match(route.components.successor_operation_from_package, /documented/);

  const archive = source.controls[1];
  assert.equal(archive.adjudication.cross_host_application_continuation, true);
  assert.equal(archive.adjudication.different_host_restore, true);
  assert.equal(archive.adjudication.runtime_mismatch_refusal, true);
  assert.equal(archive.adjudication.application_specific_continuation, true);
  assert.equal(archive.adjudication.documented_checkpoint_image_registry_migration_route, false);
  assert.match(archive.components.successor_operation_from_package, /counter returns 0 and 1 before checkpoint and 2 after restore/);

  const compatibility = source.controls[2];
  assert.equal(compatibility.adjudication.checkpoint_compatibility_metadata, true);
  assert.equal(compatibility.adjudication.runtime_mismatch_refusal, true);
  assert.equal(compatibility.adjudication.application_specific_continuation, false);
  assert.equal(compatibility.adjudication.different_host_restore, false);

  assert.deepEqual(source.boundaries, EXPECTED_BOUNDARIES);
  assert.equal(Object.keys(source.boundaries).length, 25);
  assert.match(source.next_action, /fixed-digest checkpoint image/);
  assert.match(source.next_action, /Do not borrow/);
  assert.equal(source.graph_effect, 'none');
}

function resolveRef(rootSchema, ref) {
  assert.match(ref, /^#\/\$defs\//, `unsupported ref ${ref}`);
  const key = ref.slice('#/$defs/'.length);
  assert.ok(rootSchema.$defs[key], `missing schema definition ${key}`);
  return rootSchema.$defs[key];
}

function typeMatches(value, type) {
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return false;
}

function validateSchemaNode(value, node, rootSchema, location = '$') {
  if (node.$ref) return validateSchemaNode(value, resolveRef(rootSchema, node.$ref), rootSchema, location);
  if (Object.hasOwn(node, 'const')) assert.deepEqual(value, node.const, `${location} const mismatch`);
  if (node.type) assert.equal(typeMatches(value, node.type), true, `${location} type ${node.type} mismatch`);
  if (node.type === 'string') {
    if (node.minLength !== undefined) assert.equal(value.length >= node.minLength, true, `${location} minLength`);
    if (node.pattern !== undefined) assert.match(value, new RegExp(node.pattern), `${location} pattern`);
    if (node.format === 'uri') assert.doesNotThrow(() => new URL(value), `${location} URI`);
    if (node.format === 'date') assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${location} date`);
  }
  if (node.type === 'array') {
    if (node.minItems !== undefined) assert.equal(value.length >= node.minItems, true, `${location} minItems`);
    if (node.maxItems !== undefined) assert.equal(value.length <= node.maxItems, true, `${location} maxItems`);
    if (node.items) value.forEach((item, index) => validateSchemaNode(item, node.items, rootSchema, `${location}[${index}]`));
  }
  if (node.type === 'object') {
    const required = node.required ?? [];
    for (const key of required) assert.equal(Object.hasOwn(value, key), true, `${location} missing ${key}`);
    const properties = node.properties ?? {};
    if (node.additionalProperties === false) {
      for (const key of Object.keys(value)) assert.equal(Object.hasOwn(properties, key), true, `${location} unexpected ${key}`);
    }
    for (const [key, child] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) validateSchemaNode(value[key], child, rootSchema, `${location}.${key}`);
    }
  }
}

export function validateSchemaAgainstSource(schema, source) {
  assert.equal(sha256(Buffer.from(stableJson(schema), 'utf8')), EXPECTED_SCHEMA_SHA256, 'schema exact-contract drift');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.counts.additionalProperties, false);
  assert.equal(schema.properties.boundaries.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties.counts.properties), Object.keys(source.counts));
  assert.deepEqual(schema.properties.counts.required, Object.keys(source.counts));
  assert.deepEqual(Object.keys(schema.properties.boundaries.properties), Object.keys(source.boundaries));
  assert.deepEqual(schema.properties.boundaries.required, Object.keys(source.boundaries));
  assert.equal(schema.$defs.control.additionalProperties, false);
  assert.equal(schema.$defs.sourceRecord.additionalProperties, false);
  assert.equal(schema.$defs.joinRow.additionalProperties, false);
  validateSchemaNode(source, schema, schema);
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  const schema = readJson(SCHEMA_PATH);
  validateStaticInputs();
  validateSource(source);
  validateSchemaAgainstSource(schema, source);
  validateGeneratedNarratives(source);

  const expectedRegistry = deriveRegistry(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(METHOD_PATH, renderMethod(source));
  exact(MILESTONE_PATH, renderMilestone(source));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.controls.length, 3);
  assert.equal(registry.controls.filter(control => control.documented_registry_route).length, 1);
  assert.equal(registry.controls.filter(control => control.cross_host_application_continuation).length, 1);
  assert.equal(registry.controls.filter(control => control.observed_round_trip).length, 0);
  assert.equal(registry.controls.filter(control => control.clean_destination_operation).length, 0);
  assert.equal(registry.controls.every(control => control.complete_portable_operational_handoff === false), true);
  assert.equal(registry.controls.every(control => control.person_support_added === false), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.entries.some(entry => entry.path === VALIDATOR_PATH), true);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W40-RM-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-40: source, complete schema, static inputs, generated narratives, and products valid');
}
