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
} from './build-counter-selector-wave-33.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-33-package-truth-table.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-33-package-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-33-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-33/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-33/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-package-truth-table@1');
  assert.equal(source.wave_id, 'CS-W33-PT-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W30-HC-01','CS-W31-RH-01','CS-W32-CH-01']);
  assert.equal(source.status, 'four_package_claim_controls_zero_complete_public_state_packages_zero_operator_findings');
  assert.equal(source.controls.length, 4);
  assert.equal(source.counts.controls_audited, 4);
  assert.equal(source.counts.public_source_records, 8);
  assert.equal(source.counts.named_recipient_surfaces, 2);
  assert.equal(source.counts.package_specifications, 2);
  assert.equal(source.counts.partial_outgoing_package_surfaces, 1);
  assert.equal(source.counts.recipient_group_acknowledgment_surfaces, 1);
  assert.equal(source.counts.source_restricted_package_surfaces, 1);
  assert.equal(source.counts.label_only_false_positives, 1);
  assert.equal(source.counts.template_only_controls, 1);
  assert.equal(source.counts.complete_outgoing_state_packages, 0);
  assert.equal(source.counts.recipient_acknowledged_state_packages, 0);
  assert.equal(source.counts.complete_direct_handoffs, 0);
  assert.equal(source.counts.person_dimension_supports_added, 0);
  assert.equal(source.counts.external_independent_reviews, 0);
  assert.equal(source.counts.complete_operator_findings, 0);
  assert.equal(source.counts.field_test_eligible_candidates, 0);
  assert.equal(source.counts.contacts_authorized, 0);
  assert.equal(source.counts.graph_effects, 0);
  assert.equal(source.counts.adversarial_mutations, 76);

  const ids = source.controls.map(control => control.control_id);
  assert.deepEqual(ids, ['CS-W33-PT-01','CS-W33-PT-02','CS-W33-PT-03','CS-W33-PT-04']);
  const sourceIds = source.controls.flatMap(control => control.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 8);
  assert.equal(new Set(sourceIds).size, 8);

  const claims = source.controls.map(control => control.claim_type);
  assert.deepEqual(claims, ['package_partially_populated','label_only','template_only','package_source_restricted']);

  for (const control of source.controls) {
    assert.equal(control.operator_finding, false);
    assert.equal(control.field_test_eligible, false);
    assert.equal(control.contact_authorized, false);
    assert.equal(control.graph_effect, 'none');
    assert.equal(control.counterevidence.length >= 5, true);
    assert.equal(Object.keys(control.components).length, 10);
    assert.notEqual(control.adjudication.direct_handoff, 'established');
  }

  const dap = source.controls[0];
  assert.equal(dap.incoming_unit, 'GitLab Authorization group');
  assert.equal(dap.named_recipients.length, 5);
  assert.equal(dap.adjudication.package_state, 'substantial_partial_outgoing_package');
  assert.match(dap.components.open_decisions_and_risks, /substantial_partial_inventory/);
  assert.match(dap.components.recipient_acknowledgment, /group_epic/);

  const jenkins = source.controls[1];
  assert.equal(jenkins.adjudication.package_state, 'label_only_false_positive');
  assert.equal(jenkins.components.versioned_package_identity, 'absent');

  const template = source.controls[2];
  assert.equal(template.adjudication.package_state, 'template_only_control');
  assert.equal(template.outgoing_unit, null);
  assert.equal(template.incoming_unit, null);

  const restricted = source.controls[3];
  assert.equal(restricted.adjudication.package_state, 'source_restricted_handover_surface');
  assert.match(restricted.components.public_inspectability, /security_restriction/);

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.graph_effect, 'none');
  assert.equal(source.package_contract.contact_required, false);
  assert.equal(source.package_contract.control_is_candidate_promotion, false);
  assert.equal(source.package_contract.complete_public_package_requires.length, 9);
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
  assert.equal(registry.controls.length, 4);
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
  assert.equal(rebuilt.source.wave_id, 'CS-W33-PT-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-33: contract and products valid');
}
