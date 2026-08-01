#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveRequestRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-22.mjs';

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
  assert.equal(contract.schema_version, 'counter-selector-external-gate-execution-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W22-EX-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_main_sha, '02f34f693389dbf878e3dc523ee20ad5fa1cb533');
  assert.equal(contract.parent_wave_id, 'CS-W21-GE-01');
  assert.equal(contract.parent_release_sha256, '9e910fc56a4aa2652a38f47d31bf211fa08b39cd66039f0ad5eb968c44d20d5e');
  assert.equal(contract.publication_status, 'staged_request_execution_receipt_custody');

  const expectedCounts = {
    candidate_lanes_audited: 1,
    external_gate_families_executed: 2,
    archive_request_packets_inherited: 3,
    archive_requests_sent: 3,
    gmail_submission_receipts: 3,
    official_recipient_routes_verified: 3,
    recipient_delivery_confirmations: 0,
    responses_received: 1,
    automatic_responses: 1,
    substantive_archive_responses: 0,
    service_suspension_responses: 1,
    archive_evidence_objects_acquired: 0,
    external_review_requests_opened: 1,
    external_review_responses_received: 0,
    external_selector_reviews_executed: 0,
    new_dimension_supports: 0,
    new_model_elasticity_supports: 0,
    new_support_adjusted_surplus_supports: 0,
    direct_handoff_receipts: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    source_subject_contacts: 0,
    custodian_contacts_executed: 3,
    followups_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 48
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  eq(contract.candidate_state.supported_dimensions, supported, 'candidate vector unchanged');
  eq(contract.candidate_state.unresolved_dimensions, ['support_adjusted_surplus', 'model_elasticity'], 'unresolved vector');
  assert.equal(contract.candidate_state.complete_operator_finding, false);
  assert.equal(contract.candidate_state.field_test_eligible, false);
  assert.equal(contract.candidate_state.graph_effect, 'none');

  assert.equal(contract.archive_requests.length, 3);
  const ids = contract.archive_requests.map((row) => row.request_id);
  eq(ids, ['CS-W21-AQ-LOC', 'CS-W21-AQ-UNARMS', 'CS-W21-AQ-CARTER'], 'request order');
  assert.equal(new Set(contract.archive_requests.map((row) => row.recipient)).size, 3);
  assert.equal(new Set(contract.archive_requests.map((row) => row.gmail_message_id)).size, 3);

  for (const row of contract.archive_requests) {
    assert.match(row.recipient, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    assert.match(row.official_route_url, /^https:\/\//);
    assert.equal(row.official_route_verified, true);
    assert.match(row.gmail_message_id, /^[0-9a-f]+$/);
    assert.equal(row.gmail_submission_receipt, true);
    assert.equal(row.recipient_delivery_confirmed, false);
    assert.equal(row.substantive_reference_response, false);
    assert.equal(row.evidence_objects_acquired, 0);
  }

  const un = contract.archive_requests.find((row) => row.request_id === 'CS-W21-AQ-UNARMS');
  assert(un);
  assert.equal(un.response_received, true);
  assert.equal(un.response_class, 'automatic_service_suspension_notice');
  assert.equal(un.external_reference_service_status, 'unavailable');
  assert.equal(un.digitization_on_demand_status, 'suspended');
  assert.equal(un.evidence_objects_acquired, 0);

  const waiting = contract.archive_requests.filter((row) => row.request_id !== 'CS-W21-AQ-UNARMS');
  assert(waiting.every((row) => row.response_received === false && row.response_message_id === null));

  assert.equal(contract.independent_review.issue_number, 597);
  assert.equal(contract.independent_review.request_opened, true);
  assert.equal(contract.independent_review.comments_observed, 0);
  assert.equal(contract.independent_review.responses_received, 0);
  assert.equal(contract.independent_review.reviews_executed, 0);
  assert.equal(contract.independent_review.field_test_authorized, false);
  assert.equal(contract.independent_review.graph_effect, 'none');

  const falseBoundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(falseBoundaries.length >= 19);
  assert(falseBoundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(contract.boundaries.gmail_sent_label_is_recipient_delivery, false);
  assert.equal(contract.boundaries.service_suspension_is_record_absence, false);
  assert.equal(contract.boundaries.open_review_issue_is_completed_review, false);
  assert.match(contract.next_action, /ingest any substantive archive reply/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  return true;
}

export function validateProducts(contract) {
  const registry = read('data/project/counter-selector-wave-22-request-receipt-registry.json');
  const manifest = read('data/project/counter-selector-wave-22-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-22/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-22/index.html');

  eq(registry, deriveRequestRegistry(contract), 'request registry deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, registry, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(registry.counts.archive_requests_sent, 3);
  assert.equal(registry.counts.archive_evidence_objects_acquired, 0);
  assert.equal(registry.counts.external_selector_reviews_executed, 0);
  assert.equal(report.candidate.complete_operator_finding, false);
  assert.equal(report.candidate.field_test_eligible, false);
  assert.equal(report.independent_review.reviews_executed, 0);
  assert(report.archive_execution.every((row) => row.gmail_submission_receipt === true));
  assert(report.archive_execution.every((row) => row.recipient_delivery_confirmed === false));
  assert(report.archive_execution.every((row) => row.evidence_objects_acquired === 0));
  assert.equal(manifest.entries.length, 8);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 8);
  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert(Object.entries(manifest.boundaries).every(([key, value]) => key === 'graph_effect' ? value === 'none' : value === false));
  assert.match(html, /The requests left the building/);
  assert.match(html, /Gmail SENT ≠ recipient delivery/);
  assert(!html.includes('field-test eligible: true'));
  return true;
}

export function validateCounterSelectorWave22() {
  const contract = read('data/project/counter-selector-wave-22-external-execution.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-22: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave22();
