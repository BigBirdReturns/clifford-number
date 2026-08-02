#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PACKAGE_ENTRY_PATHS,
  STATIC_MANIFEST_PATHS,
  buildAll,
  derivePackageManifest,
  deriveRegistry,
  deriveReleaseManifest,
  deriveReport,
  renderHtml,
  sha256,
  stableJson
} from './build-counter-selector-wave-34.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-34-executable-handoff-control.json';
const PACKAGE_DIR = 'data/project/counter-selector-wave-34-package';
const PACKAGE_MANIFEST_PATH = `${PACKAGE_DIR}/package-manifest.json`;
const REGISTRY_PATH = 'data/project/counter-selector-wave-34-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-34-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-34/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-34/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-executable-handoff-control@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W34-EH-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W30-HC-01','CS-W31-RH-01','CS-W32-CH-01','CS-W33-PT-01']);
  assert.equal(source.status, 'one_complete_bounded_package_handoff_zero_person_findings');
  assert.equal(source.graph_effect, 'none');

  const expectedCounts = {
    controls_audited: 1,
    public_source_records: 4,
    package_entries: 7,
    versioned_outgoing_packages: 1,
    fresh_workspace_recipient_jobs: 1,
    corrupted_package_decline_probes: 1,
    recipient_package_acknowledgments: 1,
    successor_operation_chains: 1,
    separate_verifier_jobs: 1,
    complete_bounded_package_handoffs: 1,
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
    adversarial_mutations: 84
  };
  assert.deepEqual(source.counts, expectedCounts);

  assert.deepEqual(source.handoff_contract.component_order, [
    'versioned_package_identity',
    'outgoing_and_incoming_authority',
    'credential_and_access_ledger',
    'dependency_inventory',
    'open_decision_inventory',
    'rollback_and_safe_decline',
    'package_level_recipient_acknowledgment',
    'successor_operation_from_package_state',
    'separate_successor_verification'
  ]);
  assert.equal(new Set(source.handoff_contract.component_order).size, 9);
  assert.deepEqual(source.handoff_contract.complete_bounded_package_requires, [
    'one identified package with exact entry hashes and combined digest',
    'bounded outgoing and incoming authority with prohibited actions',
    'explicit credential and access inventory including an explicit empty set',
    'complete runtime, tool, repository, network, and external-service dependency inventory',
    'explicit open-decision inventory including an explicit empty set',
    'decline conditions and rollback state that prevent partial publication',
    'recipient acknowledgment of the exact identified package and entries',
    'successor operation in a fresh workspace using the package as the sole state bridge',
    'separate verification of the successor object and acknowledgment'
  ]);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.control_is_candidate_promotion, false);
  assert.equal(source.handoff_contract.control_counts_toward_person_support, false);

  const control = source.control;
  assert.equal(control.control_id, 'CS-W34-EH-01');
  assert.equal(control.control_type, 'synthetic_executable_positive_control');
  assert.equal(control.package_id, 'CS-W34-PACKAGE-01');
  assert.equal(control.package_version, '1.0.0');
  assert.deepEqual(control.package_paths, PACKAGE_ENTRY_PATHS);
  assert.equal(new Set(control.package_paths).size, 7);
  assert.equal(control.source_records.length, 4);
  assert.equal(new Set(control.source_records.map(record => record.source_id)).size, 4);
  assert.deepEqual(control.expected_successor_object, {
    schema_version: 'counter-selector-handoff-object@1',
    object_id: 'CS-W34-OBJECT-01',
    state: 'resumed',
    sequence: 18,
    value: 42,
    lineage: ['prepared@17','resumed@18'],
    preserved_valid_work: [
      'bounded object identity',
      'pretransition sequence lineage',
      'pretransition value'
    ]
  });

  assert.equal(control.execution_roles.outgoing_package_builder.repository_checkout, true);
  assert.equal(control.execution_roles.outgoing_package_builder.may_build_package, true);
  assert.equal(control.execution_roles.outgoing_package_builder.may_certify_recipient_operation, false);
  assert.equal(control.execution_roles.fresh_workspace_recipient.repository_checkout, false);
  assert.equal(control.execution_roles.fresh_workspace_recipient.repository_permissions, 'none');
  assert.equal(control.execution_roles.fresh_workspace_recipient.package_is_sole_state_bridge, true);
  assert.equal(control.execution_roles.fresh_workspace_recipient.may_modify_package, false);
  assert.equal(control.execution_roles.fresh_workspace_recipient.may_emit_successor_state, true);
  assert.equal(control.execution_roles.successor_verifier.repository_checkout, true);
  assert.equal(control.execution_roles.successor_verifier.may_compare_outputs_to_canonical_contract, true);
  assert.equal(control.execution_roles.successor_verifier.may_modify_recipient_outputs, false);

  const adjudication = control.adjudication;
  assert.equal(adjudication.package_state, 'versioned_exact_entry_bound_package');
  assert.equal(adjudication.recipient_state, 'package_level_acknowledgment_in_fresh_workspace');
  assert.equal(adjudication.safe_decline_state, 'corrupted_package_refused_before_successor_outputs');
  assert.equal(adjudication.successor_state, 'bounded_successor_operation_from_package_only_state');
  assert.equal(adjudication.verification_state, 'separate_job_compares_exact_successor_and_acknowledgment');
  assert.equal(adjudication.complete_bounded_package_handoff, true);
  assert.equal(adjudication.complete_direct_person_handoff, false);
  assert.equal(adjudication.person_support_added, false);
  assert.equal(adjudication.operator_finding, false);
  assert.equal(adjudication.field_test_eligible, false);
  assert.equal(adjudication.classification, 'complete_bounded_process_package_handoff_positive_control');
  assert.equal(control.operator_finding, false);
  assert.equal(control.field_test_eligible, false);
  assert.equal(control.contact_authorized, false);
  assert.equal(control.graph_effect, 'none');
  assert.equal(control.counterevidence.length, 5);
  assert.equal(control.falsifiers.length, 6);

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  assert.equal(falseBoundaryKeys.length, 15);
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
}

export function validatePackageFiles(source) {
  const objectBefore = readJson(`${PACKAGE_DIR}/object-before.json`);
  const operation = readJson(`${PACKAGE_DIR}/operation-contract.json`);
  const authority = readJson(`${PACKAGE_DIR}/authority-ledger.json`);
  const dependencies = readJson(`${PACKAGE_DIR}/dependency-inventory.json`);
  const decisions = readJson(`${PACKAGE_DIR}/open-decision-inventory.json`);
  const rollback = readJson(`${PACKAGE_DIR}/rollback-plan.json`);

  assert.equal(objectBefore.object_id, source.control.expected_successor_object.object_id);
  assert.equal(objectBefore.state, 'prepared');
  assert.equal(objectBefore.sequence, 17);
  assert.equal(objectBefore.value, 41);
  assert.equal(operation.from_sequence, 17);
  assert.equal(operation.to_sequence, 18);
  assert.equal(operation.from_value, 41);
  assert.equal(operation.to_value, 42);
  assert.equal(authority.required_credentials.length, 0);
  assert.deepEqual(authority.required_access, ['read package directory','write successor output directory']);
  assert.equal(dependencies.repository_checkout_required, false);
  assert.equal(dependencies.network_required, false);
  assert.equal(dependencies.secret_inputs_required.length, 0);
  assert.equal(dependencies.external_services_required.length, 0);
  assert.equal(dependencies.undeclared_dependencies_permitted, false);
  assert.equal(decisions.complete_for_bounded_operation, true);
  assert.equal(decisions.open_decisions.length, 0);
  assert.equal(decisions.open_risks.length, 0);
  assert.equal(rollback.external_side_effects.length, 0);
  assert.match(rollback.safe_decline, /exit nonzero/);

  const resume = fs.readFileSync(path.join(ROOT, PACKAGE_DIR, 'resume.mjs'), 'utf8');
  assert.match(resume, /package entry hash mismatch/);
  assert.match(resume, /pretransition object mismatch/);
  assert.match(resume, /atomicWrite/);
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  validatePackageFiles(source);

  const expectedPackageManifest = derivePackageManifest(source);
  exact(PACKAGE_MANIFEST_PATH, stableJson(expectedPackageManifest));
  const packageManifest = readJson(PACKAGE_MANIFEST_PATH);
  assert.equal(packageManifest.entries.length, 7);
  assert.deepEqual(packageManifest.entries.map(entry => entry.path), PACKAGE_ENTRY_PATHS);
  assert.match(packageManifest.combined_sha256, /^[a-f0-9]{64}$/);
  for (const entry of packageManifest.entries) {
    assert.equal(entry.path.includes('..'), false);
    const bytes = fs.readFileSync(path.join(ROOT, PACKAGE_DIR, entry.path));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(sha256(bytes), entry.sha256);
  }

  const expectedRegistry = deriveRegistry(source, expectedPackageManifest);
  const expectedReleaseManifest = deriveReleaseManifest(source);
  const expectedReport = deriveReport(source, expectedPackageManifest, expectedReleaseManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedReleaseManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.control.complete_bounded_package_handoff, true);
  assert.equal(registry.control.complete_direct_person_handoff, false);
  assert.equal(registry.control.person_support_added, false);
  assert.equal(registry.control.operator_finding, false);
  assert.equal(registry.control.field_test_eligible, false);
  assert.equal(registry.control.contact_authorized, false);

  const releaseManifest = readJson(MANIFEST_PATH);
  assert.deepEqual(releaseManifest.entries.map(entry => entry.path), STATIC_MANIFEST_PATHS);
  assert.equal(releaseManifest.entries.length, 17);
  assert.match(releaseManifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(releaseManifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(releaseManifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(releaseManifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W34-EH-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-34: contract and products valid');
}
