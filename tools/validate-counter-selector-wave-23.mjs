#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-23.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const eq = (a, b, message) => assert.deepEqual(a, b, message);

const supported = [
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

export function validateContract(contract) {
  assert.equal(contract.schema_version, 'counter-selector-full-record-corroboration-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W23-FR-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_wave_id, 'CS-W22-EX-01');
  assert.equal(contract.parent_wave_merge_sha, '2155844efb5867f60013711fe8647a6a7f938604');
  assert.equal(contract.parent_release_sha256, '063e8a58ab8fdeb344832aa9b454dc08964c19b0818deaffb283987cd112c6e6');
  assert.match(contract.publication_base_sha, /^[0-9a-f]{40}$/);
  assert.equal(contract.publication_status, 'permanent_full_record_corroboration_candidate');

  const expectedCounts = {
    candidate_lanes_audited: 1,
    source_records: 6,
    full_text_institutional_records_acquired: 1,
    pages_in_full_text_record: 134,
    page_image_checks_completed: 1,
    person_action_corroborations: 3,
    existing_dimension_corroborations: 2,
    custody_scope_refinements: 1,
    sole_person_causality_upgrades: 0,
    new_dimension_supports: 0,
    direct_handoff_receipts: 0,
    new_model_elasticity_supports: 0,
    new_support_adjusted_surplus_supports: 0,
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
    adversarial_mutations: 54
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  eq(contract.candidate_state.supported_dimensions, supported, 'candidate vector unchanged');
  eq(contract.candidate_state.unresolved_dimensions,
    ['support_adjusted_surplus', 'model_elasticity'], 'unresolved vector');
  assert.equal(contract.candidate_state.complete_operator_finding, false);
  assert.equal(contract.candidate_state.field_test_eligible, false);
  assert.equal(contract.candidate_state.rank, null);
  assert.equal(contract.candidate_state.graph_effect, 'none');

  assert.equal(contract.source_records.length, 6);
  assert.equal(new Set(contract.source_records.map((row) => row.source_id)).size, 6);
  const full = contract.source_records.find((row) => row.source_id === 'CS-W23-S01');
  assert(full);
  assert.equal(full.full_text_acquired, true);
  assert.equal(full.page_count, 134);
  assert.equal(full.page_image_checked, true);
  assert.equal(full.page_image_check_page_index, 23);
  assert.equal(full.independent_counter_selector_review, false);

  assert.equal(contract.corroborations.length, 3);
  assert.equal(new Set(contract.corroborations.map((row) => row.corroboration_id)).size, 3);
  assert.equal(contract.corroborations.filter(
    (row) => row.existing_dimension_corroborated === 'exception_handling').length, 2);
  assert.equal(contract.corroborations.filter(
    (row) => row.existing_dimension_corroborated === 'custody').length, 1);
  assert(contract.corroborations.every((row) => row.new_dimension_support === false));
  assert(contract.corroborations.every((row) => row.sole_person_causality_upgrade === false));
  assert.equal(contract.corroborations[2].direct_handoff_receipt, false);

  assert.equal(contract.support_ledger.status, 'heavy_multi_institution_support_corroborated');
  assert.equal(contract.support_ledger.resource_normalized_comparator_acquired, false);
  assert.equal(contract.support_ledger.support_adjusted_surplus_supported, false);
  assert(contract.support_ledger.elements.length >= 6);

  assert.equal(contract.catalogue_refinements.length, 3);
  assert(contract.catalogue_refinements.every((row) => row.underlying_items_acquired === false));
  assert(contract.catalogue_refinements.every((row) => row.followup_authorized === false));
  const un = contract.catalogue_refinements[0];
  assert.equal(un.reference_code, 'S-0342');
  eq(un.accessions, ['93/166', '93/167'], 'UN accessions');
  assert.equal(un.extent, '1 box');
  assert.equal(contract.catalogue_refinements[1].box_range, 'I:346-394');
  assert.equal(contract.catalogue_refinements[2].box_range, 'I:108-173');

  assert.equal(contract.independent_review.issue_number, 597);
  assert.equal(contract.independent_review.comments_observed, 0);
  assert.equal(contract.independent_review.responses_received, 0);
  assert.equal(contract.independent_review.reviews_executed, 0);
  assert.equal(
    contract.independent_review.participating_institution_report_counts_as_external_review, false);
  assert.equal(contract.independent_review.field_test_authorized, false);

  const boundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(boundaries.length >= 20);
  assert(boundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.match(contract.next_action, /independent review/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  return true;
}

export function validateProducts(contract) {
  const registry = read('data/project/counter-selector-wave-23-corroboration-registry.json');
  const manifest = read('data/project/counter-selector-wave-23-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-23/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-23/index.html');

  eq(registry, deriveRegistry(contract), 'registry deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, registry, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(registry.counts.pages_in_full_text_record, 134);
  assert.equal(registry.counts.person_action_corroborations, 3);
  assert.equal(registry.counts.new_dimension_supports, 0);
  assert.equal(registry.counts.external_selector_reviews_executed, 0);
  assert.equal(report.candidate.complete_operator_finding, false);
  assert.equal(report.candidate.field_test_eligible, false);
  assert(report.corroborations.every((row) => row.new_dimension_support === false));
  assert.equal(manifest.entries.length, 8);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 8);
  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert(Object.entries(manifest.boundaries).every(
    ([key, value]) => key === 'graph_effect' ? value === 'none' : value === false));
  assert.match(html, /The full record sharpened the action/);
  assert.match(html, /full report ≠ independent review/);
  assert(!html.includes('field-test eligible: true'));
  return true;
}

export function validateCounterSelectorWave23() {
  const contract = read('data/project/counter-selector-wave-23-full-record-corroboration.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-23: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave23();
