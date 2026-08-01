#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveEvidenceRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-24.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const eq = (a, b, message) => assert.deepEqual(a, b, message);

const supported = [
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

export function validateContract(contract) {
  assert.equal(contract.schema_version, 'counter-selector-model-update-handoff-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W24-MH-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_main_sha, '873597f8254b8fb67452ffbb4146e607afad770b');
  assert.equal(contract.parent_wave_id, 'CS-W23-FR-01');
  assert.equal(contract.parent_release_sha256, '45f4dcc191406676ca135119b580645c2bc65084625d6c12a76f4f455cb524ab');
  assert.equal(contract.status, 'bounded_model_elasticity_supported_direct_handoff_unresolved');

  const expectedCounts = {
    candidate_lanes_audited: 1,
    source_records: 6,
    direct_self_correction_records: 1,
    live_counterevidence_intake_records: 1,
    later_collective_policy_objects: 1,
    model_elasticity_supports_added: 1,
    supported_dimensions_after_update: 7,
    handoff_continuity_records: 3,
    custody_scope_refinements: 1,
    direct_handoff_receipts: 0,
    support_adjusted_surplus_supports: 0,
    external_review_requests_opened: 1,
    external_review_responses_received: 0,
    external_selector_reviews_executed: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    custodian_followups_authorized: 0,
    source_subject_contacts: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 60
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  eq(contract.candidate_state.supported_dimensions, supported, 'seven-dimension vector');
  eq(contract.candidate_state.unresolved_dimensions, ['support_adjusted_surplus'], 'one unresolved dimension');
  assert.equal(contract.candidate_state.new_dimension.dimension, 'model_elasticity');
  assert.equal(contract.candidate_state.new_dimension.state, 'bounded_observation');
  assert.equal(contract.candidate_state.new_dimension.independently_reviewed, false);
  assert.equal(contract.candidate_state.new_dimension.repeated_across_distinct_events, false);
  assert.equal(contract.candidate_state.complete_operator_finding, false);
  assert.equal(contract.candidate_state.field_test_eligible, false);
  assert.equal(contract.candidate_state.rank, null);
  assert.equal(contract.candidate_state.graph_effect, 'none');

  assert.equal(contract.source_records.length, 6);
  assert.equal(new Set(contract.source_records.map((row) => row.source_id)).size, 6);
  assert.equal(contract.source_records.filter((row) => row.primary_record).length, 5);
  assert.equal(contract.source_records.filter((row) => row.direct_quote_custody).length, 3);
  for (const row of contract.source_records) {
    assert.match(row.url, /^https:\/\//);
    assert.match(row.source_id, /^CS-W24-S0[1-6]$/);
  }

  assert.equal(contract.model_elasticity_adjudication.state, 'bounded_observation');
  assert.equal(contract.model_elasticity_adjudication.dimension_support_added, true);
  assert.equal(contract.model_elasticity_adjudication.sequence.length, 3);
  assert.equal(contract.model_elasticity_adjudication.independently_reviewed, false);
  assert.equal(contract.model_elasticity_adjudication.repeated_across_distinct_events, false);
  assert(contract.model_elasticity_adjudication.limits.length >= 5);

  assert.equal(contract.handoff_adjudication.direct_handoff_receipt, false);
  assert.equal(contract.handoff_adjudication.records.length, 3);
  assert(contract.handoff_adjudication.limits.length >= 4);

  assert.equal(contract.support_adjusted_surplus_adjudication.dimension_support_added, false);
  assert.equal(contract.support_adjusted_surplus_adjudication.resource_normalized_comparator_acquired, false);

  assert.equal(contract.independent_review.issue_number, 597);
  assert.equal(contract.independent_review.comments_observed, 0);
  assert.equal(contract.independent_review.responses_received, 0);
  assert.equal(contract.independent_review.reviews_executed, 0);
  assert.equal(contract.independent_review.field_test_authorized, false);

  const falseBoundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(falseBoundaries.length >= 19);
  assert(falseBoundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(contract.boundaries.seven_supported_dimensions_is_rank, false);
  assert.equal(contract.boundaries.successor_objective_continuity_is_direct_handoff, false);
  assert.equal(contract.boundaries.bounded_model_elasticity_is_complete_operator, false);
  assert.match(contract.next_action, /genuine external review/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  return true;
}

export function validateProducts(contract) {
  const registry = read('data/project/counter-selector-wave-24-evidence-registry.json');
  const manifest = read('data/project/counter-selector-wave-24-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-24/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-24/index.html');

  eq(registry, deriveEvidenceRegistry(contract), 'evidence registry deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, registry, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(report.counts.model_elasticity_supports_added, 1);
  assert.equal(report.counts.supported_dimensions_after_update, 7);
  assert.equal(report.counts.direct_handoff_receipts, 0);
  assert.equal(report.counts.external_selector_reviews_executed, 0);
  assert.equal(report.candidate.complete_operator_finding, false);
  assert.equal(report.candidate.field_test_eligible, false);
  assert.equal(manifest.entries.length, 8);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 8);
  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert(Object.entries(manifest.boundaries).every(([key, value]) => key === 'graph_effect' ? value === 'none' : value === false));
  assert.match(html, /The model moved\. The handoff gate did not\./);
  assert.match(html, /seven dimensions ≠ rank/);
  assert(!html.includes('field-test eligible: true'));
  return true;
}

export function validateCounterSelectorWave24() {
  const contract = read('data/project/counter-selector-wave-24-model-update-handoff.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-24: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave24();
