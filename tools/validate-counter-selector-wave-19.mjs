#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveTransferRegistry,
  deriveReviewExportRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-19.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const eq = (a, b, message) => assert.deepEqual(a, b, message);
const dimensions = [
  'support_adjusted_surplus',
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

export function validateContract(contract) {
  assert.equal(contract.schema_version, 'counter-selector-cross-domain-governance-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W19-XD-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_main_sha, '2a7539fcbb3387abd9a009c58a72f89a89cf9c01');
  assert.equal(contract.parent_wave_id, 'CS-W18-RC-01');
  assert.equal(contract.parent_release_sha256, 'ce52e1065bb02d49e521819a0a25d595028187fa7bfb5cfa1cf7353c097efce3');
  assert.equal(contract.publication_status, 'staged_nonpublic_source_custody');

  const expectedCounts = {
    person_lanes_audited: 3,
    official_or_institutional_source_records: 12,
    materially_distinct_domains_in_supported_trace: 3,
    matched_controls_retained: 2,
    new_person_supports: 2,
    new_cross_domain_transfer_supports: 1,
    new_custody_supports: 1,
    external_review_exports_updated: 1,
    external_review_requests_sent: 0,
    external_selector_reviews_executed: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    contacts_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 46
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  const trace = contract.supported_trace;
  assert.equal(trace.candidate_id, 'CS-C0019');
  assert.equal(trace.packet_id, 'CS-BLIND-0019');
  assert.equal(trace.source_identity, 'Elliot Richardson');
  eq(trace.previous_supported_dimensions, [
    'governed_capacity',
    'non_zero_sum_orientation',
    'epistemic_restraint'
  ], 'previous vector');
  assert.equal(trace.new_support_assignments.length, 2);
  eq(trace.new_support_assignments.map((row) => row.dimension).sort(), ['cross_domain_transfer', 'custody'], 'new dimensions');
  eq(trace.supported_dimensions_after_update, [
    'cross_domain_transfer',
    'custody',
    'governed_capacity',
    'non_zero_sum_orientation',
    'epistemic_restraint'
  ], 'updated vector');
  eq(trace.unresolved_dimensions, [
    'support_adjusted_surplus',
    'exception_handling',
    'model_elasticity'
  ], 'unresolved vector');
  assert.equal(new Set([...trace.supported_dimensions_after_update, ...trace.unresolved_dimensions]).size, 8);
  assert(dimensions.every((dimension) => trace.supported_dimensions_after_update.includes(dimension) || trace.unresolved_dimensions.includes(dimension)));

  const transfer = trace.new_support_assignments.find((row) => row.dimension === 'cross_domain_transfer');
  assert(transfer);
  assert.equal(transfer.domain_receipts.length, 3);
  eq(transfer.domain_receipts.map((row) => row.domain), [
    'domestic_executive_justice',
    'multilateral_oceans_governance',
    'international_election_verification'
  ], 'materially distinct domains');
  assert.equal(new Set(transfer.domain_receipts.map((row) => row.domain)).size, 3);
  assert.equal(transfer.operation_signature.length, 5);
  assert.match(transfer.ceiling, /appointments do not by themselves prove transfer/i);

  const custody = trace.new_support_assignments.find((row) => row.dimension === 'custody');
  assert(custody);
  assert.match(custody.state, /successor_capable/);
  assert.match(custody.ceiling, /not a direct/i);
  assert.equal(custody.source_ids.length, 2);

  assert.equal(trace.support_context.substantial_support_observed, true);
  assert.equal(trace.support_context.support_adjusted_surplus_established, false);
  assert(trace.support_context.observed_support.length >= 5);
  assert(trace.countermodels.length >= 5);
  assert.equal(trace.external_review_ready, true);
  assert.equal(trace.complete_operator_finding, false);
  assert.equal(trace.field_test_eligible, false);
  assert.equal(trace.contact_authorized, false);
  assert.equal(trace.public_identity_profile_authorized, false);
  assert.equal(trace.graph_effect, 'none');

  assert.equal(contract.matched_controls.length, 2);
  eq(contract.matched_controls.map((row) => row.control_id).sort(), [
    'CS-XD-CONTROL-W19-MCDONALD',
    'CS-XD-CONTROL-W19-OLIVIERI'
  ], 'control ids');
  for (const control of contract.matched_controls) {
    assert.equal(control.cross_domain_transfer_supported, false);
    assert.equal(control.new_dimension_supports, 0);
    assert.equal(control.graph_effect, 'none');
    assert.match(control.non_advance_reason, /not cross-domain transfer|does not yet establish|do not yet establish|is not cross-domain transfer/i);
  }

  assert.equal(contract.sources.length, 12);
  const sourceIds = contract.sources.map((row) => row.source_id);
  assert.equal(new Set(sourceIds).size, 12);
  assert(sourceIds.every((id, index) => id === `CS-W19-S${String(index + 1).padStart(3, '0')}`));
  for (const source of contract.sources) {
    assert.match(source.url, /^https:\/\//);
    assert(source.supports.length >= 2);
    assert(source.limits.length >= 2);
    assert(source.record_state.length >= 5);
  }
  const allowedHosts = new Set([
    'www.presidency.ucsb.edu',
    'history.state.gov',
    'digitallibrary.un.org',
    'dam.media.un.org',
    'ims.utoronto.ca',
    'clinicaltrials.gov',
    'www.nasa.gov'
  ]);
  for (const source of contract.sources) {
    assert(allowedHosts.has(new URL(source.url).hostname), `approved source host: ${source.url}`);
  }
  const sourceSet = new Set(sourceIds);
  for (const assignment of trace.new_support_assignments) {
    for (const sourceId of assignment.source_ids ?? []) assert(sourceSet.has(sourceId));
    for (const receipt of assignment.domain_receipts ?? []) {
      assert(receipt.source_ids.length >= 1);
      for (const sourceId of receipt.source_ids) assert(sourceSet.has(sourceId));
    }
  }
  for (const control of contract.matched_controls) {
    for (const sourceId of control.source_ids) assert(sourceSet.has(sourceId));
  }

  const exportPacket = contract.external_review_export_update;
  assert.equal(exportPacket.export_id, 'CS-ERX-W19-0019');
  assert.equal(exportPacket.source_trace_or_candidate_id, 'CS-C0019');
  assert.equal(exportPacket.source_identity_omitted_from_export, true);
  assert.equal(exportPacket.artifact_may_remain_inferable, true);
  assert.equal(exportPacket.external_review_executed, false);
  assert.equal(exportPacket.contact_required, false);
  assert.equal(exportPacket.contact_authorized, false);
  assert.equal(exportPacket.field_test_authorized, false);
  assert.equal(exportPacket.public_identity_profile_authorized, false);
  assert.equal(exportPacket.graph_effect, 'none');
  eq(exportPacket.supported_dimensions, trace.supported_dimensions_after_update, 'review vector linked');
  assert(exportPacket.review_questions.length >= 3);
  assert(exportPacket.falsifiers.length >= 4);
  assert(exportPacket.missing_receipts.length >= 4);

  assert.equal(contract.acquisition_lanes.length, 7);
  assert.equal(new Set(contract.acquisition_lanes.map((row) => row.lane_id)).size, 7);
  assert(contract.acquisition_lanes.every((row) => row.contact_authorized === false && row.graph_effect === 'none'));
  const richardsonLane = contract.acquisition_lanes.find((row) => row.subject === 'Elliot Richardson');
  assert(richardsonLane);
  assert(!richardsonLane.required_objects.some((item) => /domain transfer/i.test(item)));
  assert.equal(richardsonLane.required_objects.length, 4);
  assert(richardsonLane.required_objects.some((item) => /direct successor/i.test(item)));
  assert(richardsonLane.required_objects.some((item) => /independent Counter-Selector review/i.test(item)));

  const falseBoundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(falseBoundaries.length >= 20);
  assert(falseBoundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(contract.boundaries.multiple_titles_are_cross_domain_transfer, false);
  assert.equal(contract.boundaries.adjacent_domain_expansion_is_materially_unrelated_transfer, false);
  assert.equal(contract.boundaries.same_program_stage_breadth_is_cross_domain_transfer, false);
  assert.equal(contract.boundaries.successor_continuity_is_direct_person_handoff, false);
  assert.equal(contract.boundaries.review_export_prepared_is_external_review, false);
  assert.equal(contract.boundaries.supported_dimension_count_is_rank, false);

  assert.match(contract.next_action, /genuinely independent reviewers/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  return true;
}

export function validateProducts(contract) {
  const transfer = read('data/project/counter-selector-cross-domain-transfer-registry.json');
  const review = read('data/project/counter-selector-wave-19-external-review-export-registry.json');
  const manifest = read('data/project/counter-selector-wave-19-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-19/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-19/index.html');

  eq(transfer, deriveTransferRegistry(contract), 'transfer registry deterministic');
  eq(review, deriveReviewExportRegistry(contract), 'review export deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, transfer, review, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(review.counts.source_identity_labels_in_exports, 0);
  assert.equal(review.counts.external_reviews_executed, 0);
  assert.equal(review.exports.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(review.exports[0], 'identity_key'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(review.exports[0], 'source_identity'), false);
  assert.equal(review.exports[0].source_identity_omitted_from_export, true);
  assert.equal(review.identity_key_registry[0].released_to_reviewer, false);

  assert.equal(report.counts.complete_operator_findings, 0);
  assert.equal(report.counts.field_test_eligible_candidates, 0);
  assert.equal(report.counts.person_rankings, 0);
  assert.equal(report.counts.graph_effects, 0);
  assert.equal(report.supported_trace.complete_operator_finding, false);
  assert.equal(report.supported_trace.field_test_eligible, false);
  assert.equal(report.external_review.reviews_executed, 0);
  assert(report.matched_controls.every((row) => row.cross_domain_transfer_supported === false));
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.entries.length, 8);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 8);
  assert(manifest.boundaries && Object.entries(manifest.boundaries).every(([key, value]) => key === 'graph_effect' ? value === 'none' : value === false));

  assert.match(html, /A governing operation transferred/);
  assert.match(html, /successor continuity ≠ direct person handoff/);
  assert(!html.includes('ranked first'));
  assert(!html.includes('field-test eligible: true'));
  return true;
}

export function validateCounterSelectorWave19() {
  const contract = read('data/project/counter-selector-wave-19-cross-domain-governance.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-19: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave19();
