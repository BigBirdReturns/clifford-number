#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveAuditRegistry,
  deriveReviewExportRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-20.mjs';

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
  assert.equal(contract.schema_version, 'counter-selector-exception-falsification-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W20-EF-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_main_sha, '2362f4357bf58d388dad11f38bcac62f580ce89b');
  assert.equal(contract.parent_wave_id, 'CS-W19-XD-01');
  assert.equal(contract.parent_release_sha256, 'e57e081bf9847be5a3a9507ff7840a0dbc02703dfae73a4a178ab435da96dfdd');
  assert.equal(contract.publication_status, 'staged_nonpublic_source_custody');

  const expectedCounts = {
    person_lanes_audited: 1,
    official_or_archival_source_records: 10,
    person_attributable_exception_interventions: 4,
    team_level_mechanisms_preserved: 3,
    new_person_supports: 1,
    new_exception_handling_supports: 1,
    new_model_elasticity_supports: 0,
    new_support_adjusted_surplus_supports: 0,
    direct_handoff_receipts: 0,
    custody_counterevidence_items: 2,
    retrospective_update_indicators: 2,
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
    adversarial_mutations: 50
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  const candidate = contract.candidate_audit;
  assert.equal(candidate.candidate_id, 'CS-C0019');
  assert.equal(candidate.packet_id, 'CS-BLIND-0019');
  assert.equal(candidate.source_identity, 'Elliot Richardson');
  eq(candidate.previous_supported_dimensions, [
    'cross_domain_transfer',
    'custody',
    'governed_capacity',
    'non_zero_sum_orientation',
    'epistemic_restraint'
  ], 'previous vector');
  assert.equal(candidate.new_support_assignments.length, 1);
  const exception = candidate.new_support_assignments[0];
  assert.equal(exception.dimension, 'exception_handling');
  assert.match(exception.state, /bounded_support/);
  assert.match(exception.ceiling, /does not prove/i);
  assert.equal(exception.interventions.length, 4);
  eq(exception.interventions.map((row) => row.intervention_id), ['CS-W20-I001', 'CS-W20-I002', 'CS-W20-I003', 'CS-W20-I004'], 'intervention ids');
  assert.equal(new Set(exception.interventions.map((row) => row.intervention_id)).size, 4);
  assert.equal(new Set(exception.interventions.map((row) => row.gate)).size, 4);
  assert(exception.interventions.every((row) => row.person_action.length >= 40 && row.source_ids.length >= 1));
  assert(exception.source_ids.length >= 3);

  eq(candidate.supported_dimensions_after_update, [
    'cross_domain_transfer',
    'exception_handling',
    'custody',
    'governed_capacity',
    'non_zero_sum_orientation',
    'epistemic_restraint'
  ], 'updated vector');
  eq(candidate.unresolved_dimensions, ['support_adjusted_surplus', 'model_elasticity'], 'unresolved vector');
  assert.equal(new Set([...candidate.supported_dimensions_after_update, ...candidate.unresolved_dimensions]).size, 8);
  assert(dimensions.every((dimension) => candidate.supported_dimensions_after_update.includes(dimension) || candidate.unresolved_dimensions.includes(dimension)));

  assert.equal(candidate.team_mechanisms_not_person_support.length, 3);
  assert(candidate.team_mechanisms_not_person_support.every((row) => row.mechanism.length >= 20 && /not assigned solely|collective|not converted/i.test(row.reason)));

  assert.equal(candidate.model_elasticity_adjudication.supported, false);
  assert.equal(candidate.model_elasticity_adjudication.indicators.length, 2);
  assert(candidate.model_elasticity_adjudication.indicators.every((row) => row.indicator.length >= 40 && row.classification.length >= 30));
  assert.match(candidate.model_elasticity_adjudication.reason, /changed decision|changed object|recoverable object/i);

  assert.equal(candidate.support_context.substantial_support_observed, true);
  assert.equal(candidate.support_context.support_adjusted_surplus_established, false);
  assert(candidate.support_context.observed_support.length >= 7);
  assert.match(candidate.support_context.reason, /resource-normalized comparator/i);

  const custody = candidate.custody_adjudication;
  assert.equal(custody.prior_bounded_law_of_sea_transition_custody_preserved, true);
  assert.equal(custody.new_custody_support, false);
  assert.equal(custody.counterevidence.length, 2);
  assert(custody.counterevidence.every((row) => row.item.length >= 50 && row.effect.length >= 40));
  assert.equal(custody.direct_handoff_established, false);

  assert(candidate.countermodels.length >= 5);
  assert.equal(candidate.external_review_ready, true);
  assert.equal(candidate.complete_operator_finding, false);
  assert.equal(candidate.field_test_eligible, false);
  assert.equal(candidate.contact_authorized, false);
  assert.equal(candidate.public_identity_profile_authorized, false);
  assert.equal(candidate.graph_effect, 'none');

  assert.equal(contract.negative_controls.length, 3);
  eq(contract.negative_controls.map((row) => row.control_id).sort(), [
    'CS-EF-CONTROL-W20-SELFCRITIQUE',
    'CS-EF-CONTROL-W20-TEAM',
    'CS-EF-CONTROL-W20-TITLE'
  ], 'negative controls');
  for (const control of contract.negative_controls) {
    assert.equal(control.new_dimension_supports, 0);
    assert.equal(control.graph_effect, 'none');
    assert(control.finding.length >= 80);
  }

  assert.equal(contract.sources.length, 10);
  const sourceIds = contract.sources.map((row) => row.source_id);
  assert.equal(new Set(sourceIds).size, 10);
  assert(sourceIds.every((id, index) => id === `CS-W20-S${String(index + 1).padStart(3, '0')}`));
  const allowedHosts = new Set([
    'ugspace.ug.edu.gh',
    'digitallibrary.un.org',
    'dam.media.un.org',
    'search.archives.un.org',
    'findingaids.loc.gov',
    'www.presidency.ucsb.edu'
  ]);
  for (const source of contract.sources) {
    assert(allowedHosts.has(new URL(source.url).hostname), `approved source host: ${source.url}`);
    assert(source.supports.length >= 3);
    assert(source.limits.length >= 3);
    assert(source.record_state.length >= 40);
    assert.equal(source.acquired_on, '2026-08-01');
  }
  const sourceSet = new Set(sourceIds);
  for (const sourceId of exception.source_ids) assert(sourceSet.has(sourceId));
  for (const intervention of exception.interventions) for (const sourceId of intervention.source_ids) assert(sourceSet.has(sourceId));

  const exportPacket = contract.external_review_export_update;
  assert.equal(exportPacket.export_id, 'CS-ERX-W20-0019');
  assert.equal(exportPacket.source_trace_or_candidate_id, 'CS-C0019');
  assert.equal(exportPacket.source_identity_omitted_from_export, true);
  assert.equal(exportPacket.artifact_may_remain_inferable, true);
  assert.equal(exportPacket.export_state, 'ready_not_sent');
  assert.equal(exportPacket.external_review_executed, false);
  assert.equal(exportPacket.contact_required, false);
  assert.equal(exportPacket.contact_authorized, false);
  assert.equal(exportPacket.field_test_authorized, false);
  assert.equal(exportPacket.public_identity_profile_authorized, false);
  assert.equal(exportPacket.graph_effect, 'none');
  eq(exportPacket.supported_dimensions, candidate.supported_dimensions_after_update, 'review vector linked');
  eq(exportPacket.unresolved_dimensions, candidate.unresolved_dimensions, 'review unresolved vector linked');
  assert(exportPacket.review_questions.length >= 5);
  assert(exportPacket.countermodels.length >= 4);
  assert(exportPacket.falsifiers.length >= 5);
  assert(exportPacket.missing_receipts.length >= 6);

  assert.equal(contract.acquisition_lanes.length, 1);
  const lane = contract.acquisition_lanes[0];
  assert.equal(lane.lane_id, 'CS-AQ-W20-RICHARDSON-NICARAGUA');
  assert.equal(lane.subject, 'Elliot Richardson');
  assert.equal(lane.required_objects.length, 6);
  assert.equal(lane.known_routes.length, 3);
  assert.equal(lane.route_executed, false);
  assert.equal(lane.contact_authorized, false);
  assert.equal(lane.graph_effect, 'none');

  const falseBoundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(falseBoundaries.length >= 25);
  assert(falseBoundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(contract.boundaries.unprecedented_appointment_is_exception_handling, false);
  assert.equal(contract.boundaries.retrospective_assessment_change_is_model_elasticity, false);
  assert.equal(contract.boundaries.candid_self_critique_is_repair, false);
  assert.equal(contract.boundaries.known_archive_route_authorizes_contact, false);
  assert.equal(contract.boundaries.six_supported_dimensions_is_rank, false);
  assert.equal(contract.boundaries.review_export_prepared_is_external_review, false);

  assert.match(contract.next_action, /genuinely independent reviewer/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  assert.match(contract.next_action, /non-contact public or archival access/i);
  return true;
}

export function validateProducts(contract) {
  const audit = read('data/project/counter-selector-exception-falsification-registry.json');
  const review = read('data/project/counter-selector-wave-20-external-review-export-registry.json');
  const manifest = read('data/project/counter-selector-wave-20-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-20/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-20/index.html');

  eq(audit, deriveAuditRegistry(contract), 'audit registry deterministic');
  eq(review, deriveReviewExportRegistry(contract), 'review registry deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, audit, review, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(review.counts.source_identity_labels_in_exports, 0);
  assert.equal(review.counts.external_reviews_executed, 0);
  assert.equal(review.exports.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(review.exports[0], 'identity_key'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(review.exports[0], 'source_identity'), false);
  assert.equal(review.identity_key_registry[0].released_to_reviewer, false);

  assert.equal(report.counts.complete_operator_findings, 0);
  assert.equal(report.counts.field_test_eligible_candidates, 0);
  assert.equal(report.counts.person_rankings, 0);
  assert.equal(report.counts.graph_effects, 0);
  assert.equal(report.candidate.complete_operator_finding, false);
  assert.equal(report.candidate.field_test_eligible, false);
  assert.equal(report.candidate.model_elasticity_adjudication.supported, false);
  assert.equal(report.candidate.support_context.support_adjusted_surplus_established, false);
  assert.equal(report.external_review.reviews_executed, 0);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.entries.length, 8);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 8);
  assert(manifest.boundaries && Object.entries(manifest.boundaries).every(([key, value]) => key === 'graph_effect' ? value === 'none' : value === false));

  assert.match(html, /Exception intervention survived/);
  assert.match(html, /retrospective assessment change ≠ model elasticity/);
  assert.match(html, /missing letter copy ≠ complete custody/);
  assert(!html.includes('ranked first'));
  assert(!html.includes('field-test eligible: true'));
  return true;
}

export function validateCounterSelectorWave20() {
  const contract = read('data/project/counter-selector-wave-20-exception-falsification.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-20: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave20();
