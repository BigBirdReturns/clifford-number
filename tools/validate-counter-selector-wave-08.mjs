#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, deriveReviewRegistry, deriveDisagreementLedger, deriveReport, renderHtml } from './build-counter-selector-wave-08.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
export const dimensions = ['support_adjusted_surplus','cross_domain_transfer','exception_handling','custody','model_elasticity','governed_capacity','non_zero_sum_orientation','epistemic_restraint'];

export function validateRegistryObject(registry, program, parent, ledger) {
  assert.equal(registry.schema_version, 'counter-selector-blind-review-b02-registry@1');
  assert.equal(registry.program_id, 'counter-selector-v1');
  assert.equal(registry.program_id, program.program_id);
  assert.equal(registry.wave_id, 'CS-W08-B02');
  assert.equal(registry.wave_id, program.wave_id);
  assert.equal(registry.batch_id, 'CS-AQ-B02');
  assert.equal(registry.batch_id, program.batch_id);
  assert.equal(registry.as_of, '2026-07-31');
  assert.equal(registry.parent_wave_id, 'CS-W07-B02');
  assert.equal(registry.parent_release_sha256, '327ba98adea1abe549eff050955a109d6c79fd1a1252ee633198ef984ba06311');
  assert.equal(registry.parent_release_sha256, program.parent_release_sha256);
  assert.deepEqual(registry.counts, program.expected_counts);
  assert.equal(registry.counts.identity_minimized_packets_reviewed, 4);
  assert.equal(registry.counts.procedurally_separated_review_passes, 8);
  assert.equal(registry.counts.external_independent_reviews, 0);
  assert.equal(registry.counts.packets_with_bounded_dimension_support, 2);
  assert.equal(registry.counts.bounded_dimension_supports, 4);
  assert.equal(registry.counts.mechanism_only_findings, 2);
  assert.equal(registry.counts.disagreements_preserved, 4);
  assert.equal(registry.counts.analysis_class_recommendations, 4);
  assert.equal(registry.counts.field_test_eligible_packets, 0);
  assert.equal(registry.counts.operator_findings, 0);
  assert.equal(registry.counts.person_or_partnership_findings, 0);
  assert.equal(registry.counts.promotions, 0);
  assert.equal(registry.counts.person_rankings, 0);
  assert.equal(registry.counts.public_identity_releases, 0);
  assert.equal(registry.counts.graph_effects, 0);
  assert.equal(registry.counts.adversarial_mutations, 32);

  assert.equal(parent.status, 'four_identity_minimized_packets_ready_blind_review_not_started');
  assert.equal(parent.packets.length, 4);
  assert.equal(registry.packet_results.length, 4);
  assert.deepEqual(registry.parent_packet_ids, parent.packets.map((row) => row.packet_id));
  const expectedIds = ['CS-BLIND-0012','CS-BLIND-0017','CS-BLIND-0022','CS-BLIND-0027'];
  assert.deepEqual(registry.packet_results.map((row) => row.packet_id), expectedIds);
  assert.equal(new Set(registry.packet_results.map((row) => row.packet_id)).size, 4);

  let supportCount = 0;
  for (const row of registry.packet_results) {
    assert.equal(row.review_passes.length, 2);
    assert.deepEqual(row.review_passes.map((pass) => pass.reviewer_role), ['artifact_validity','adversarial_countermodel']);
    for (const pass of row.review_passes) {
      assert.equal(pass.fresh_context, true);
      assert.equal(pass.external_independence_claimed, false);
      assert.ok(pass.observations.length > 0);
      assert.ok(pass.countermodels.length > 0);
    }
    assert.deepEqual(Object.keys(row.dimension_vector), dimensions);
    assert.equal(row.field_test_eligible, false);
    assert.equal(row.operator_finding, false);
    assert.equal(row.person_or_partnership_finding, false);
    assert.equal(row.graph_effect, 'none');
    assert.equal(row.analysis_class_recommendation.rewrites_historical_class, false);
    assert.equal(row.analysis_class_recommendation.historical_class, row.historical_class);
    const rowSupports = Object.values(row.dimension_vector).filter((value) => value.startsWith('bounded_support')).length;
    assert.equal(rowSupports, row.new_bounded_dimension_supports);
    supportCount += rowSupports;
  }
  assert.equal(supportCount, 4);

  const byId = Object.fromEntries(registry.packet_results.map((row) => [row.packet_id, row]));
  const p12 = byId['CS-BLIND-0012'];
  assert.equal(p12.packet_kind, 'operator_artifact_packet');
  assert.equal(p12.dimension_vector.exception_handling, 'bounded_support_collective_function_scope');
  assert.equal(p12.dimension_vector.epistemic_restraint, 'bounded_support_collective_function_scope');
  assert.equal(p12.dimension_vector.custody, 'insufficient_attributable_handoff_receipt');
  assert.equal(p12.dimension_vector.governed_capacity, 'not_tested_decision_gate_not_controlled');
  assert.equal(p12.analysis_class_recommendation.recommended_analysis_class, 'collective_technical_function');
  assert.equal(p12.new_bounded_dimension_supports, 2);

  const p17 = byId['CS-BLIND-0017'];
  assert.equal(p17.packet_kind, 'operator_artifact_packet');
  assert.equal(p17.dimension_vector.custody, 'bounded_support_checking_output_preserved');
  assert.equal(p17.dimension_vector.governed_capacity, 'bounded_support_checking_function_scope');
  assert.equal(p17.dimension_vector.support_adjusted_surplus, 'not_tested_substantial_office_support_no_comparator');
  assert.equal(p17.analysis_class_recommendation.recommended_analysis_class, 'checking_function_artifact');
  assert.equal(p17.new_bounded_dimension_supports, 2);

  const p22 = byId['CS-BLIND-0022'];
  assert.equal(p22.packet_kind, 'system_mechanism_packet');
  for (const value of Object.values(p22.dimension_vector)) assert.equal(value, 'not_attributable_from_system_mechanism_packet');
  assert.equal(p22.mechanism_observations.addressable_record_correction_observed, true);
  assert.equal(p22.mechanism_observations.voluntary_relationship_repair_observed, false);
  assert.equal(p22.mechanism_observations.partnership_capacity_established, false);
  assert.equal(p22.analysis_class_recommendation.recommended_analysis_class, 'external_merits_correction_control');
  assert.equal(p22.new_bounded_dimension_supports, 0);

  const p27 = byId['CS-BLIND-0027'];
  assert.equal(p27.packet_kind, 'system_failure_packet');
  for (const value of Object.values(p27.dimension_vector)) assert.equal(value, 'not_attributable_from_distributed_system_failure_packet');
  assert.equal(p27.mechanism_observations.situated_warning_channel_observed, true);
  assert.equal(p27.mechanism_observations.durable_repair_implementation_observed, false);
  assert.equal(p27.mechanism_observations.bounded_partnership_identified, false);
  assert.equal(p27.analysis_class_recommendation.recommended_analysis_class, 'distributed_warning_failure_control');
  assert.equal(p27.new_bounded_dimension_supports, 0);

  assert.equal(ledger.schema_version, 'counter-selector-review-disagreement-b02-ledger@1');
  assert.equal(ledger.counts.disagreements, 4);
  assert.equal(ledger.counts.erased_countermodels, 0);
  assert.equal(ledger.counts.averaged_resolutions, 0);
  assert.equal(ledger.counts.field_test_authorizations, 0);
  assert.equal(ledger.counts.graph_effects, 0);
  assert.equal(ledger.disagreements.length, 4);
  assert.deepEqual(ledger.disagreements.map((row) => row.packet_id), expectedIds);

  assert.equal(registry.independence.procedural_separation_claimed, true);
  assert.equal(registry.independence.fresh_context_claimed, true);
  assert.equal(registry.independence.external_human_independence_claimed, false);
  assert.equal(registry.independence.different_model_or_institution_claimed, false);
  assert.equal(registry.independence.same_system_limitation_preserved, true);

  assert.equal(program.boundaries.procedural_separation_is_external_independence, false);
  assert.equal(program.boundaries.collective_function_is_individual_operator, false);
  assert.equal(program.boundaries.checking_function_output_is_support_adjusted_surplus, false);
  assert.equal(program.boundaries.catastrophic_consequence_proves_counterfactual_efficacy, false);
  assert.equal(program.boundaries.mechanism_finding_is_person_or_partnership_finding, false);
  assert.equal(program.boundaries.distributed_failure_is_one_partnership, false);
  assert.equal(program.boundaries.bounded_dimension_support_is_operator_finding, false);
  assert.equal(program.boundaries.review_survival_authorizes_field_test, false);
  assert.equal(program.boundaries.review_authorizes_contact, false);
  assert.equal(program.boundaries.field_test_authorized, false);
  assert.equal(program.boundaries.promotion_authorized, false);
  assert.equal(program.boundaries.person_ranking_authorized, false);
  assert.equal(program.boundaries.public_identity_release_authorized, false);
  assert.equal(program.boundaries.graph_effect, 'none');
  return true;
}

export function validateWave08() {
  const program = read('data/project/counter-selector-wave-08-blind-review.json');
  const parent = read(program.review_protocol.parent_packet_path);
  const registry = read('data/project/counter-selector-blind-review-b02-registry.json');
  const ledger = read('data/project/counter-selector-review-disagreement-b02-ledger.json');
  const manifest = read('data/project/counter-selector-wave-08-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-08/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-08/index.html');

  validateRegistryObject(registry, program, parent, ledger);
  assert.deepEqual(registry, deriveReviewRegistry(program, parent));
  assert.deepEqual(ledger, deriveDisagreementLedger(program));
  assert.deepEqual(manifest, computeReleaseManifest());
  assert.deepEqual(report, deriveReport(program, registry, ledger, manifest));
  assert.equal(html, renderHtml(report));
  assert.equal(manifest.entries.length, 8);
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.ok(html.includes('Useful conduct found. No person selected.'));
  assert.ok(html.includes('0 OPERATOR FINDINGS'));
  assert.ok(html.includes('0 FIELD TESTS'));
  console.log(`validate-counter-selector-wave-08: PASS (${registry.packet_results.length} packets, ${registry.counts.bounded_dimension_supports} supports, ${manifest.combined_sha256})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateWave08();
