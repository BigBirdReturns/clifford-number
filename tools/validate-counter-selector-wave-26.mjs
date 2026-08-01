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
} from './build-counter-selector-wave-26.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-26-observability-pivot.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-26-candidate-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-26-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-26/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-26/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-observability-pivot@1');
  assert.equal(source.wave_id, 'CS-W26-OP-01');
  assert.equal(source.status, 'observability_pivot_seeded_four_graph_inert_packets_zero_findings');
  assert.equal(source.packets.length, 4);
  assert.equal(source.counts.intake_packets, 4);
  assert.equal(source.counts.person_attributable_packets, 3);
  assert.equal(source.counts.collective_system_packets, 1);
  assert.equal(source.counts.public_source_records, 13);
  assert.equal(source.counts.blind_reviews_executed, 0);
  assert.equal(source.counts.external_reviews_executed, 0);
  assert.equal(source.counts.dimension_supports_added, 0);
  assert.equal(source.counts.complete_operator_findings, 0);
  assert.equal(source.counts.field_test_eligible_candidates, 0);
  assert.equal(source.counts.contacts_authorized, 0);
  assert.equal(source.counts.rankings, 0);
  assert.equal(source.counts.graph_effects, 0);
  assert.equal(source.pivot_trigger.supported_dimensions, 7);
  assert.equal(source.pivot_trigger.direct_handoff_receipt, false);
  assert.equal(source.pivot_trigger.external_review_responses, 0);
  assert.equal(source.pivot_trigger.substantive_archival_responses, 0);
  assert.equal(source.boundaries.contact_authorized, false);
  assert.equal(source.boundaries.field_test_authorized, false);
  assert.equal(source.boundaries.graph_effect, 'none');

  const ids = source.packets.map(packet => packet.packet_id);
  assert.equal(new Set(ids).size, 4);
  const sourceIds = source.packets.flatMap(packet => packet.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 13);
  assert.equal(new Set(sourceIds).size, 13);

  for (const packet of source.packets) {
    assert.equal(packet.required_next_receipts.includes('external review') || packet.required_next_receipts.includes('external_review'), true);
    assert.equal(Object.keys(packet.observable_gate_surfaces).length, 8);
    assert.equal(packet.matched_countermodels.length >= 3, true);
    assert.equal(packet.required_next_receipts.length >= 5, true);
  }

  const collective = source.packets.find(packet => packet.candidate_type === 'collective_custody_system');
  assert.ok(collective);
  assert.equal(collective.source_identity, null);
  assert.equal(collective.identity_status, 'collective_retained_person_attribution_withheld');

  assert.deepEqual(source.review_plan.batch_a, ['CS-OBS-0001', 'CS-OBS-0004']);
  assert.equal(source.review_plan.blind_first_required, true);
  assert.equal(source.review_plan.support_ledger_required, true);
  assert.equal(source.review_plan.external_review_required_for_promotion, true);
  assert.equal(source.review_plan.field_test_requires_consent, true);

  const falseBoundaryKeys = [
    'living_person_is_contact_authorization',
    'public_blog_is_independent_review',
    'project_scale_is_person_surplus',
    'small_team_is_support_adjusted_surplus',
    'open_source_is_non_zero_sum_proof',
    'public_correction_is_universal_model_elasticity',
    'governance_document_is_completed_handoff',
    'succession_plan_is_observed_succession',
    'security_process_is_person_exception_handling',
    'collective_system_is_person_operator',
    'source_routing_is_blind_review',
    'observability_priority_is_merit_ranking',
    'four_packets_are_complete_denominator',
    'field_test_authorized',
    'contact_authorized',
    'promotion_authorized',
    'person_ranking_authorized',
    'public_identity_profile_authorized'
  ];
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.deepEqual(source.review_plan.batch_b, ['CS-OBS-0002', 'CS-OBS-0003']);
  assert.equal(source.review_plan.batching_rule, 'evidence_observability_and_person_function_separation_not_merit');
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
  assert.equal(registry.packets.length, 4);
  assert.equal(registry.packets.every(packet => packet.blind_review_executed === false), true);
  assert.equal(registry.packets.every(packet => packet.dimension_supports_added === 0), true);
  assert.equal(registry.packets.every(packet => packet.field_test_eligible === false), true);
  assert.equal(registry.packets.every(packet => packet.graph_effect === 'none'), true);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W26-OP-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-26: contract and products valid');
}
