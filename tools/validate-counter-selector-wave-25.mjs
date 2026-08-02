#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STATIC_MANIFEST_PATHS,
  deriveManifest,
  deriveRegistry,
  deriveReport,
  readJson,
  renderHtml,
  stableJson
} from './build-counter-selector-wave-25.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-25-support-adjusted-surplus.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-25-comparator-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-25-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-25/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-25/index.html';

const EXPECTED_DIMENSIONS = [
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

function sameJson(actual, expected, label) {
  assert.equal(stableJson(actual), stableJson(expected), `${label} drift`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-support-adjusted-surplus@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W25-SA-01');
  assert.equal(source.status, 'matched_control_attack_completed_support_adjusted_surplus_unresolved');
  assert.equal(source.graph_effect, 'none');

  assert.deepEqual(source.candidate.supported_dimensions, EXPECTED_DIMENSIONS);
  assert.deepEqual(source.candidate.unresolved_dimensions, ['support_adjusted_surplus']);
  assert.equal(source.candidate.support_adjusted_surplus_state, 'insufficient_evidence_after_matched_control_attack');
  assert.equal(source.candidate.complete_operator_finding, false);
  assert.equal(source.candidate.field_test_eligible, false);
  assert.equal(source.candidate.rank, null);
  assert.equal(source.candidate.graph_effect, 'none');

  assert.equal(source.source_records.length, 12);
  assert.equal(new Set(source.source_records.map(item => item.source_id)).size, 12);
  assert.equal(source.comparator_lanes.length, 4);
  assert.equal(new Set(source.comparator_lanes.map(item => item.comparator_id)).size, 4);
  assert.deepEqual(source.comparator_lanes.map(item => item.admissibility), ['partial', 'partial', 'inadmissible', 'absent']);
  assert.equal(source.comparator_lanes.some(item => item.admissibility === 'valid'), false);
  for (const item of source.comparator_lanes) {
    assert.equal(item.support_adjusted_surplus_supported, false);
    assert.ok(item.reason.length > 20);
  }

  const counts = source.counts;
  assert.equal(counts.candidate_lanes_audited, 1);
  assert.equal(counts.source_records, 12);
  assert.equal(counts.comparator_lanes_tested, 4);
  assert.equal(counts.partial_comparator_lanes, 2);
  assert.equal(counts.inadmissible_comparator_lanes, 1);
  assert.equal(counts.absent_comparator_lanes, 1);
  assert.equal(counts.valid_resource_normalized_comparators, 0);
  assert.equal(counts.support_adjusted_surplus_supports_added, 0);
  assert.equal(counts.supported_dimensions_after_update, 7);
  assert.equal(counts.direct_handoff_receipts, 0);
  assert.equal(counts.external_review_responses_received, 0);
  assert.equal(counts.external_selector_reviews_executed, 0);
  assert.equal(counts.complete_operator_findings, 0);
  assert.equal(counts.field_test_eligible_candidates, 0);
  assert.equal(counts.custodian_followups_authorized, 0);
  assert.equal(counts.source_subject_contacts, 0);
  assert.equal(counts.bounded_collaborations_authorized, 0);
  assert.equal(counts.promotions, 0);
  assert.equal(counts.person_rankings, 0);
  assert.equal(counts.public_identity_profiles, 0);
  assert.equal(counts.graph_effects, 0);
  assert.equal(counts.adversarial_mutations, 64);

  const adjudication = source.support_adjusted_surplus_adjudication;
  assert.equal(adjudication.state, 'insufficient_evidence_after_matched_control_attack');
  assert.equal(adjudication.dimension_support_added, false);
  assert.equal(adjudication.valid_resource_normalized_comparator_acquired, false);
  assert.equal(adjudication.contradicted, false);
  assert.ok(adjudication.candidate_support_elements.length >= 6);
  assert.ok(adjudication.why_support_is_not_added.length >= 5);

  assert.equal(source.independent_review.issue_number, 597);
  assert.equal(source.independent_review.responses_received, 0);
  assert.equal(source.independent_review.reviews_executed, 0);
  assert.equal(source.independent_review.internal_comparator_audit_counts_as_external_review, false);

  const boundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  assert.equal(boundaryKeys.length, 40);
  for (const key of boundaryKeys) assert.equal(source.boundaries[key], false, `boundary ${key} must be false`);
  assert.equal(source.boundaries.graph_effect, 'none');

  return true;
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);

  const registry = readJson(REGISTRY_PATH);
  const expectedRegistry = deriveRegistry(source);
  sameJson(registry, expectedRegistry, 'registry');
  assert.deepEqual(registry.comparator_counts, {
    tested: 4,
    partial: 2,
    inadmissible: 1,
    absent: 1,
    valid_resource_normalized: 0
  });
  assert.equal(registry.adjudication.dimension_support_added, false);
  assert.equal(registry.complete_operator_finding, false);
  assert.equal(registry.field_test_eligible, false);
  assert.equal(registry.external_reviews_executed, 0);
  assert.equal(registry.graph_effect, 'none');

  const manifest = readJson(MANIFEST_PATH);
  const expectedManifest = deriveManifest(source);
  sameJson(manifest, expectedManifest, 'manifest');
  assert.deepEqual(manifest.entries.map(item => item.path), STATIC_MANIFEST_PATHS);
  assert.equal(manifest.boundaries.exact_bytes_prove_valid_comparator, false);
  assert.equal(manifest.boundaries.exact_bytes_prove_support_adjusted_surplus, false);
  assert.equal(manifest.boundaries.exact_bytes_prove_complete_operator, false);
  assert.equal(manifest.boundaries.graph_effect, 'none');

  const report = readJson(REPORT_PATH);
  const expectedReport = deriveReport(source, registry, manifest);
  sameJson(report, expectedReport, 'report');
  assert.equal(report.counts.valid_resource_normalized_comparators, 0);
  assert.equal(report.counts.support_adjusted_surplus_supports_added, 0);
  assert.equal(report.counts.complete_operator_findings, 0);
  assert.equal(report.candidate.field_test_eligible, false);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);

  const html = fs.readFileSync(path.join(ROOT, HTML_PATH), 'utf8');
  assert.equal(html, renderHtml(report), 'HTML drift');
  assert.match(html, /ZERO VALID NORMALIZED COMPARATORS/);
  assert.match(html, /internal audit ≠ external review/);

  return { source, registry, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-25: contract and products valid');
}
