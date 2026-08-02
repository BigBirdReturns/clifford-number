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
} from './build-counter-selector-wave-30.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-30-handoff-controls.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-30-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-30-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-30/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-30/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-handoff-controls@1');
  assert.equal(source.wave_id, 'CS-W30-HC-01');
  assert.equal(source.parent_wave_id, 'CS-W29-RA-01');
  assert.equal(source.status, 'two_public_authority_transfers_observed_zero_complete_state_handoffs_zero_operator_findings');
  assert.equal(source.controls.length, 2);
  assert.equal(source.counts.handoff_controls_audited, 2);
  assert.equal(source.counts.public_source_records, 13);
  assert.equal(source.counts.authority_transfer_events, 2);
  assert.equal(source.counts.credential_or_key_rotations, 1);
  assert.equal(source.counts.successor_action_chains, 2);
  assert.equal(source.counts.complete_direct_handoffs, 0);
  assert.equal(source.counts.person_dimension_supports_added, 0);
  assert.equal(source.counts.external_independent_reviews, 0);
  assert.equal(source.counts.complete_operator_findings, 0);
  assert.equal(source.counts.field_test_eligible_candidates, 0);
  assert.equal(source.counts.contacts_authorized, 0);
  assert.equal(source.counts.graph_effects, 0);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W30-HC-01', 'CS-W30-HC-02']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 13);
  assert.equal(new Set(sourceIds).size, 13);

  for (const control of source.controls) {
    assert.equal(control.adjudication.authority_transfer, 'bounded_positive');
    assert.equal(control.adjudication.direct_state_handoff, 'not_established');
    assert.equal(control.adjudication.person_custody_support_added, false);
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
    assert.equal(control.counterevidence.length >= 5, true);
    assert.equal(control.falsifiers.length >= 4, true);
    assert.equal(Object.keys(control.components).length, 9);
  }

  const pytorch = source.controls[0];
  assert.equal(pytorch.outgoing_entity, 'Soumith Chintala');
  assert.deepEqual(pytorch.incoming_entities, ['Alban Desmaison']);
  assert.match(pytorch.components.authority_or_credential_transfer, /role_authority_transfer_observed/);
  assert.equal(pytorch.components.open_decision_and_dependency_inventory, 'not_observed');
  assert.equal(pytorch.components.rollback_and_safe_decline_conditions, 'not_observed');
  assert.match(pytorch.components.successor_action, /posttransition_governance_and_release_coordination/);

  const aave = source.controls[1];
  assert.equal(aave.outgoing_entity, 'Chaos Labs');
  assert.deepEqual(aave.incoming_entities, ['LlamaRisk', 'Aave Labs']);
  assert.match(aave.components.authority_or_credential_transfer, /key_rotation/);
  assert.match(aave.components.successor_action, /executed_parameter_updates/);
  assert.match(aave.components.open_decision_and_dependency_inventory, /partial_/);
  assert.match(aave.components.rollback_and_safe_decline_conditions, /partial_/);

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.graph_effect, 'none');
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.positive_control_is_promotion, false);
  assert.equal(source.handoff_contract.component_order.length, 9);
  assert.equal(source.handoff_contract.complete_direct_handoff_requires.length >= 6, true);
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
  assert.equal(registry.controls.length, 2);
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
  assert.equal(rebuilt.source.wave_id, 'CS-W30-HC-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-30: contract and products valid');
}
