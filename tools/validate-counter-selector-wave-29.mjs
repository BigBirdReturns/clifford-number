#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAll,
  deriveDisagreementLedger,
  deriveManifest,
  deriveRegistry,
  deriveReport,
  renderHtml,
  stableJson
} from './build-counter-selector-wave-29.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-29-resumability-audit.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-29-resumability-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-29-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-29-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-29/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-29/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-resumability-audit@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W29-RA-01');
  assert.deepEqual(source.parent_wave_ids, ['CS-W27-BA-01', 'CS-W28-BB-01']);
  assert.equal(source.status, 'four_lanes_resumability_stressed_zero_person_handoffs_one_collective_continuation_zero_operator_findings');
  assert.equal(source.lanes.length, 4);
  assert.equal(source.disagreements.length, 4);

  const expectedCounts = {
    lanes_audited: 4,
    public_source_records: 17,
    public_reproduction_surfaces: 4,
    independent_verification_surfaces: 4,
    founder_independent_collective_continuation_surfaces: 1,
    authority_concentration_findings: 3,
    partial_or_negative_resumability_findings: 4,
    function_custody_refinements: 4,
    person_dimension_supports_added: 0,
    direct_person_handoff_receipts: 0,
    observed_person_successor_releases: 0,
    independently_resumable_project_findings: 0,
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
    adversarial_mutations: 64
  };
  assert.deepEqual(source.counts, expectedCounts);

  assert.equal(source.audit_contract.contact_required, false);
  assert.equal(source.audit_contract.public_reproduction_requires.length >= 3, true);
  assert.equal(source.audit_contract.independent_resumability_requires.length >= 4, true);
  assert.equal(source.audit_contract.direct_handoff_requires.length >= 5, true);

  const laneIds = source.lanes.map(lane => lane.lane_id);
  assert.deepEqual(laneIds, ['CS-W29-L01','CS-W29-L02','CS-W29-L03','CS-W29-L04']);
  assert.equal(new Set(laneIds).size, 4);
  const sourceIds = source.lanes.flatMap(lane => lane.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 17);
  assert.equal(new Set(sourceIds).size, 17);

  for (const lane of source.lanes) {
    assert.equal(lane.source_records.length >= 4, true);
    assert.equal(lane.findings.length >= 4, true);
    assert.equal(lane.counterevidence.length >= 3, true);
    assert.equal(lane.next_receipts.length >= 4, true);
    assert.deepEqual(lane.dimension_effects.person_supports_added, []);
    assert.equal(lane.dimension_effects.person_custody_added, false);
    assert.equal(lane.dimension_effects.function_refinements.length, 1);
    assert.notEqual(lane.tested_claims.independent_resumability, 'supported');
    assert.notEqual(lane.tested_claims.direct_handoff, 'supported');
  }

  const curl = source.lanes[0];
  assert.equal(curl.tested_claims.independent_verification, 'supported_anyone_can_verify_release_contents');
  assert.equal(curl.tested_claims.authority_concentration, 'observed_current_release_signature_person_keyed');

  const sqlite = source.lanes[1];
  assert.equal(sqlite.source_identity, null);
  assert.equal(sqlite.dimension_effects.function_refinements[0], 'public_source_and_checklist_visibility_with_private_assurance_boundary');

  const django = source.lanes[2];
  assert.equal(django.tested_claims.observed_succession, 'collective_project_continuation_observed_not_direct_person_handoff');
  assert.equal(django.dimension_effects.person_custody_added, false);

  const hibp = source.lanes[3];
  assert.equal(hibp.tested_claims.independent_resumability, 'not_established_full_service_data_credentials_and_operations_absent');

  for (const disagreement of source.disagreements) {
    assert.equal(disagreement.averaged, false);
    assert.match(disagreement.resolution, /no_|retain_/);
  }

  const falseBoundaryKeys = [
    'public_source_is_independent_resumability',
    'reproducible_release_is_authority_transfer',
    'independent_verification_is_direct_handoff',
    'backup_administrator_is_observed_successor',
    'future_governance_plan_is_observed_succession',
    'public_checklist_is_complete_assurance_state',
    'private_backup_is_public_custody',
    'founder_independent_continuation_is_direct_founder_handoff',
    'former_core_status_is_handoff_receipt',
    'open_code_is_complete_service_state',
    'team_growth_is_independent_resumability',
    'company_entity_is_successor_operator',
    'function_custody_is_person_custody',
    'function_refinement_is_new_person_support',
    'same_system_audit_is_external_review',
    'living_person_is_contact_authorization',
    'field_test_authorized',
    'promotion_authorized',
    'person_ranking_authorized',
    'public_identity_profile_authorized'
  ];
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  const expectedRegistry = deriveRegistry(source);
  const expectedDisagreements = deriveDisagreementLedger(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedRegistry, expectedDisagreements, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(DISAGREEMENT_PATH, stableJson(expectedDisagreements));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.lanes.every(lane => lane.person_supports_added.length === 0), true);
  assert.equal(registry.lanes.every(lane => lane.person_custody_added === false), true);
  assert.equal(registry.lanes.every(lane => lane.complete_operator_finding === false), true);
  assert.equal(registry.lanes.every(lane => lane.field_test_eligible === false), true);
  assert.equal(registry.lanes.every(lane => lane.contact_authorized === false), true);
  assert.equal(registry.lanes.every(lane => lane.graph_effect === 'none'), true);

  const disagreements = readJson(DISAGREEMENT_PATH);
  assert.equal(disagreements.counts.disagreements_preserved, 4);
  assert.equal(disagreements.counts.disagreements_averaged, 0);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W29-RA-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-29: contract and products valid');
}
