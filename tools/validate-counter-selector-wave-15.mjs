#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, deriveRegistry, deriveReport, renderHtml } from './build-counter-selector-wave-15.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dimensions = ['support_adjusted_surplus','cross_domain_transfer','exception_handling','custody','model_elasticity','governed_capacity','non_zero_sum_orientation','epistemic_restraint'];

export function validateAttributionObject(registry, contract) {
  assert.equal(registry.schema_version, 'counter-selector-attribution-census@1');
  assert.deepEqual(registry.counts, contract.counts);
  assert.equal(registry.person_near_hits.length, 3);
  assert.equal(registry.function_level_support.length, 5);
  assert.equal(registry.mechanism_control_packet_ids.length, 10);
  assert.equal(new Set(registry.mechanism_control_packet_ids).size, 10);
  assert.deepEqual(registry.person_near_hits.map((row) => row.candidate_id), ['CS-C0005','CS-C0016','CS-C0019']);
  assert.equal(registry.counts.denominator_objects, 30);
  assert.equal(registry.counts.processed_objects, 30);
  assert.equal(registry.counts.qualifying_acquisitions + registry.counts.partial_acquisitions, 30);
  assert.equal(registry.counts.blind_reviewed_packets, 18);
  assert.equal(registry.counts.procedurally_separated_review_passes, 36);
  assert.equal(registry.counts.bounded_dimension_supports, 18);
  assert.equal(registry.counts.person_attributable_bounded_supports + registry.counts.function_level_bounded_supports, 18);
  assert.equal(registry.counts.person_attributable_near_hits, 3);
  assert.equal(registry.counts.complete_operator_findings, 0);
  assert.equal(registry.counts.field_test_eligible_packets, 0);
  assert.equal(registry.counts.external_independent_reviews, 0);
  assert.equal(registry.counts.promotions, 0);
  assert.equal(registry.counts.person_rankings, 0);
  assert.equal(registry.counts.public_identity_releases, 0);
  assert.equal(registry.counts.graph_effects, 0);
  assert.equal(registry.counts.adversarial_mutations, 36);

  for (const row of registry.person_near_hits) {
    assert.ok(row.source_identity.length > 0);
    assert.ok(row.source_ids.length > 0);
    assert.ok(row.supported_dimensions.length > 0);
    assert.ok(row.missing_receipts.length > 0);
    assert.equal(row.complete_operator_finding, false);
    assert.equal(row.field_test_eligible, false);
    assert.equal(row.graph_effect, 'none');
    assert.equal(new Set([...row.supported_dimensions, ...row.unresolved_dimensions]).size, 8);
    assert.deepEqual([...row.supported_dimensions, ...row.unresolved_dimensions].sort(), [...dimensions].sort());
    assert.equal('score' in row, false);
    assert.equal('rank' in row, false);
  }

  const nancy = registry.person_near_hits.find((row) => row.candidate_id === 'CS-C0005');
  assert.deepEqual(nancy.supported_dimensions, ['exception_handling','non_zero_sum_orientation','epistemic_restraint']);
  const david = registry.person_near_hits.find((row) => row.candidate_id === 'CS-C0016');
  assert.deepEqual(david.supported_dimensions, ['governed_capacity','epistemic_restraint']);
  const elliot = registry.person_near_hits.find((row) => row.candidate_id === 'CS-C0019');
  assert.deepEqual(elliot.supported_dimensions, ['governed_capacity','epistemic_restraint']);

  for (const row of registry.function_level_support) {
    assert.equal(row.person_attribution_authorized, false);
    assert.ok(row.supported_dimensions.length > 0);
  }

  assert.equal(registry.boundaries.source_identity_reintroduction_is_promotion, false);
  assert.equal(registry.boundaries.supported_dimension_count_is_rank, false);
  assert.equal(registry.boundaries.collective_or_function_support_is_person_support, false);
  assert.equal(registry.boundaries.procedural_separation_is_external_independence, false);
  assert.equal(registry.boundaries.field_test_authorized, false);
  assert.equal(registry.boundaries.contact_authorized, false);
  assert.equal(registry.boundaries.public_identity_release_authorized, false);
  assert.equal(registry.boundaries.person_ranking_authorized, false);
  assert.equal(registry.boundaries.graph_effect, 'none');
  return true;
}

export function validateWave15() {
  const contract = read('data/project/counter-selector-wave-15-attribution-census.json');
  const registry = read('data/project/counter-selector-attribution-census.json');
  const manifest = read('data/project/counter-selector-wave-15-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-15/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-15/index.html');
  validateAttributionObject(registry, contract);
  assert.deepEqual(registry, deriveRegistry(contract));
  assert.deepEqual(manifest, computeReleaseManifest());
  assert.deepEqual(report, deriveReport(contract, registry, manifest));
  assert.equal(html, renderHtml(report));
  assert.equal(manifest.entries.length, 8);
  assert.equal(manifest.combined_sha256.length, 64);
  assert.ok(html.includes('Three near-hits. Zero complete operators.'));
  assert.ok(html.includes('NO RANK ORDER'));
  console.log(`validate-counter-selector-wave-15: PASS (${registry.person_near_hits.length} near-hits, ${registry.counts.complete_operator_findings} complete operators, ${manifest.combined_sha256})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateWave15();
