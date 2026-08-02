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
} from './build-counter-selector-wave-31.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-31-recipient-handoff-controls.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-31-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-31-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-31/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-31/index.html';

const EXPECTED_COUNTS = {
  handoff_controls_audited: 3,
  public_source_records: 18,
  named_outgoing_units: 3,
  named_incoming_units: 3,
  authorizing_surfaces: 3,
  authority_transfer_events: 3,
  recipient_handover_acknowledgment_events: 2,
  partial_state_category_inventories: 3,
  authority_before_access_controls: 1,
  successor_action_chains: 2,
  function_custody_refinements: 3,
  complete_outgoing_state_packages: 0,
  recipient_acknowledged_state_packages: 0,
  complete_open_decision_inventories: 0,
  rollback_or_safe_decline_packages: 0,
  complete_direct_handoffs: 0,
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
  adversarial_mutations: 72
};

const COMPONENT_ORDER = [
  'outgoing_intent_or_departure',
  'authorizing_body_or_rule',
  'incoming_identity_or_function',
  'authority_or_credential_transfer',
  'recipient_acceptance_or_role_occupancy',
  'open_decision_and_dependency_inventory',
  'rollback_and_safe_decline_conditions',
  'successor_action',
  'observable_continuity'
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-recipient-handoff-controls@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W31-RH-01');
  assert.equal(source.parent_wave_id, 'CS-W30-HC-01');
  assert.equal(source.status, 'two_recipient_handover_acknowledgments_one_authority_before_access_control_zero_complete_state_packages_zero_operator_findings');
  assert.deepEqual(source.counts, EXPECTED_COUNTS);
  assert.equal(source.controls.length, 3);
  assert.deepEqual(source.handoff_contract.component_order, COMPONENT_ORDER);
  assert.deepEqual(source.handoff_contract.recipient_acknowledgment_levels, [
    'none',
    'role_occupancy_only',
    'handover_event_acknowledged',
    'partial_state_categories_acknowledged',
    'complete_state_package_acknowledged'
  ]);
  assert.equal(source.handoff_contract.complete_direct_handoff_requires.length, 6);
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.positive_control_is_promotion, false);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W31-RH-01', 'CS-W31-RH-02', 'CS-W31-RH-03']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 18);
  assert.equal(new Set(sourceIds).size, 18);

  for (const control of source.controls) {
    assert.equal(control.source_records.length, 6);
    assert.deepEqual(Object.keys(control.components), COMPONENT_ORDER);
    assert.equal(control.adjudication.direct_state_handoff, 'not_established');
    assert.equal(control.adjudication.person_custody_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
    assert.equal(control.counterevidence.length >= 5, true);
    assert.equal(control.falsifiers.length >= 4, true);
    for (const record of control.source_records) {
      assert.match(record.source_id, /^CS-W31-S\d{2}$/);
      assert.match(record.url, /^https:\/\//);
      assert.equal(record.artifact_scope.length > 20, true);
    }
  }

  const first = source.controls[0];
  assert.equal(first.outgoing_entity, 'Sam Hartman');
  assert.deepEqual(first.incoming_entities, ['Jonathan Carter']);
  assert.equal(first.recipient_acknowledgment_level, 'partial_state_categories_acknowledged');
  assert.match(first.components.recipient_acceptance_or_role_occupancy, /handover_meeting_acknowledgment/);
  assert.match(first.components.open_decision_and_dependency_inventory, /finances_delegations_legal_outreach/);
  assert.match(first.components.successor_action, /first_month_decisions/);

  const second = source.controls[1];
  assert.equal(second.outgoing_entity, 'Andreas Tille');
  assert.deepEqual(second.incoming_entities, ['Sruthi Chandran']);
  assert.equal(second.recipient_acknowledgment_level, 'partial_state_categories_acknowledged');
  assert.match(second.components.recipient_acceptance_or_role_occupancy, /smooth_video_handover_acknowledgment/);
  assert.match(second.components.open_decision_and_dependency_inventory, /redelegations_time_limited_delegation_helpers/);
  assert.match(second.components.successor_action, /partial_initial_role_operation/);

  const third = source.controls[2];
  assert.equal(third.transition_type, 'function_authority_before_access_negative_control');
  assert.equal(third.recipient_acknowledgment_level, 'role_occupancy_only');
  assert.match(third.components.authority_or_credential_transfer, /authority_before_complete_queue_access/);
  assert.match(third.components.successor_action, /observed_team_operation/);
  assert.match(third.adjudication.authority_transfer, /bounded_positive_with_timing_failure/);

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.graph_effect, 'none');
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  const expectedRegistry = deriveRegistry(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedRegistry, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.controls.length, 3);
  assert.equal(registry.controls.every(control => control.operator_finding === false), true);
  assert.equal(registry.controls.every(control => control.field_test_eligible === false), true);
  assert.equal(registry.controls.every(control => control.contact_authorized === false), true);
  assert.equal(registry.controls.every(control => control.graph_effect === 'none'), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.exact_bytes_prove_recipient_package_acknowledgment, false);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W31-RH-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-31: contract and products valid');
}
