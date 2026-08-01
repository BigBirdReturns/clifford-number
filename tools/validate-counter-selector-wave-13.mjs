#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, deriveRegistry, deriveDisagreementLedger, deriveReport, renderHtml } from './build-counter-selector-wave-13.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dimensions = ["support_adjusted_surplus", "cross_domain_transfer", "exception_handling", "custody", "model_elasticity", "governed_capacity", "non_zero_sum_orientation", "epistemic_restraint"];

export function validateRegistryObject(registry, contract, parentRegistry) {
  assert.equal(registry.schema_version, 'counter-selector-blind-review-b04-registry@1');
  assert.equal(registry.program_id, contract.program_id);
  assert.equal(registry.wave_id, contract.wave_id);
  assert.equal(registry.batch_id, contract.batch_id);
  assert.equal(registry.as_of, contract.as_of);
  assert.deepEqual(registry.counts, contract.expected_counts);
  assert.deepEqual(registry.independence, contract.independence);
  assert.equal(registry.packet_results.length, 5);
  assert.equal(registry.counts.procedurally_separated_review_passes, registry.packet_results.length * 2);
  assert.equal(registry.counts.external_independent_reviews, 0);
  assert.equal(registry.counts.field_test_eligible_packets, 0);
  assert.equal(registry.counts.operator_findings, 0);
  assert.equal(registry.counts.person_or_partnership_findings, 0);
  assert.equal(registry.counts.promotions, 0);
  assert.equal(registry.counts.person_rankings, 0);
  assert.equal(registry.counts.public_identity_releases, 0);
  assert.equal(registry.counts.graph_effects, 0);

  const expectedIds = ["CS-BLIND-0004", "CS-BLIND-0009", "CS-BLIND-0014", "CS-BLIND-0019", "CS-BLIND-0024"];
  const actualIds = registry.packet_results.map((row) => row.packet_id);
  assert.deepEqual(actualIds, expectedIds);
  const parentIds = parentRegistry.packets.map((row) => row.packet_id);
  for (const packetId of expectedIds) assert.ok(parentIds.includes(packetId));

  let supportCount = 0;
  let supportPackets = 0;
  let operatorArtifacts = 0;
  let mechanismPackets = 0;
  for (const row of registry.packet_results) {
    assert.equal(row.review_passes.length, 2);
    for (const pass of row.review_passes) {
      assert.equal(pass.fresh_context, true);
      assert.equal(pass.external_independence_claimed, false);
      assert.ok(['artifact_validity', 'adversarial_countermodel'].includes(pass.reviewer_role));
      assert.ok(pass.observations.length > 0);
      assert.ok(pass.countermodels.length > 0);
    }
    assert.deepEqual(Object.keys(row.dimension_vector), dimensions);
    assert.equal(row.analysis_class_recommendation.historical_class, row.historical_class);
    assert.equal(row.analysis_class_recommendation.rewrites_historical_class, false);
    assert.equal(row.field_test_eligible, false);
    assert.equal(row.operator_finding, false);
    assert.equal(row.person_or_partnership_finding, false);
    assert.equal(row.graph_effect, 'none');
    const supported = Object.values(row.dimension_vector).filter((value) => String(value).startsWith('bounded_support')).length;
    assert.equal(row.new_bounded_dimension_supports, supported);
    supportCount += supported;
    if (supported > 0) supportPackets += 1;
    if (row.packet_kind === 'operator_artifact_packet') {
      operatorArtifacts += 1;
      assert.equal(row.mechanism_observations, null);
    } else {
      mechanismPackets += 1;
      assert.ok(row.mechanism_observations && typeof row.mechanism_observations === 'object');
      for (const value of Object.values(row.dimension_vector)) assert.ok(String(value).startsWith('not_attributable_from_'));
    }
  }
  assert.equal(supportCount, registry.counts.bounded_dimension_supports);
  assert.equal(supportPackets, registry.counts.packets_with_bounded_dimension_support);
  assert.equal(operatorArtifacts, registry.counts.operator_artifact_packets_reviewed);
  assert.equal(mechanismPackets, registry.counts.non_person_mechanism_packets_reviewed);
  assert.equal(mechanismPackets, registry.counts.mechanism_only_findings);

  assert.equal(contract.disagreements.length, registry.counts.disagreements_preserved);
  for (const disagreement of contract.disagreements) assert.ok(expectedIds.includes(disagreement.packet_id));
  assert.equal(contract.boundaries.blind_review_is_operator_selection, false);
  assert.equal(contract.boundaries.procedural_separation_is_external_independence, false);
  assert.equal(contract.boundaries.review_authorizes_field_test, false);
  assert.equal(contract.boundaries.public_identity_release_authorized, false);
  assert.equal(contract.boundaries.aggregate_rank_generated, false);
  assert.equal(contract.boundaries.graph_effect, 'none');
  return true;
}

export function validateWave13() {
  const contract = read('data/project/counter-selector-wave-13-blind-review.json');
  const parentRegistry = read('data/project/counter-selector-blind-packet-registry-b04.json');
  const registry = read('data/project/counter-selector-blind-review-b04-registry.json');
  const ledger = read('data/project/counter-selector-review-disagreement-b04-ledger.json');
  const manifest = read('data/project/counter-selector-wave-13-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-13/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-13/index.html');

  validateRegistryObject(registry, contract, parentRegistry);
  assert.deepEqual(registry, deriveRegistry(contract));
  assert.deepEqual(ledger, deriveDisagreementLedger(contract));
  assert.deepEqual(manifest, computeReleaseManifest());
  assert.deepEqual(report, deriveReport(contract, registry, ledger, manifest));
  assert.equal(html, renderHtml(report));
  assert.equal(ledger.disagreements.length, contract.disagreements.length);
  assert.equal(ledger.counts.resolutions_erasing_countermodels, 0);
  assert.equal(ledger.counts.field_test_authorizations, 0);
  assert.equal(ledger.counts.graph_effects, 0);
  assert.equal(manifest.entries.length, 8);
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.equal(report.counts.adversarial_mutations, 34);
  assert.equal(report.counts.operator_findings, 0);
  assert.equal(report.counts.field_test_eligible_packets, 0);
  assert.ok(html.includes('0 COMPLETE OPERATORS'));
  assert.ok(html.includes('0 FIELD TESTS'));

  console.log(`validate-counter-selector-wave-13: PASS (${registry.packet_results.length} packets, ${registry.counts.bounded_dimension_supports} supports, ${manifest.combined_sha256})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateWave13();
