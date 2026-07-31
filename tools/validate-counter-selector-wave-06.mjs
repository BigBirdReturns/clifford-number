#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, deriveRegistry, deriveRoutes, deriveReport, renderHtml } from './build-counter-selector-wave-06.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dimensions = ['support_adjusted_surplus','cross_domain_transfer','exception_handling','custody','model_elasticity','governed_capacity','non_zero_sum_orientation','epistemic_restraint'];

export function validateRegistryObject(registry, contract, sourceRegistry, routes) {
  assert.equal(registry.schema_version, 'counter-selector-custody-finality-registry@1');
  assert.equal(registry.program_id, contract.program_id);
  assert.equal(registry.wave_id, contract.wave_id);
  assert.equal(registry.as_of, contract.as_of);
  assert.deepEqual(registry.counts, contract.expected_counts);
  assert.equal(registry.records.length, 2);
  assert.equal(sourceRegistry.sources.length, 6);
  assert.equal(sourceRegistry.search_receipts.length, 5);
  assert.equal(routes.routes.length, 5);
  assert.equal(routes.counts.routes, 5);
  assert.equal(routes.counts.routes_executed, 0);
  assert.equal(routes.counts.contact_authorizations, 0);
  assert.equal(routes.counts.evidence_objects_acquired, 0);
  assert.equal(routes.counts.field_test_authorizations, 0);
  assert.equal(routes.counts.graph_effects, 0);

  const byId = Object.fromEntries(registry.records.map((row) => [row.packet_id, row]));
  assert.deepEqual(Object.keys(byId).sort(), ['CS-BLIND-0016','CS-BLIND-0021']);

  for (const row of registry.records) {
    assert.equal(row.new_bounded_dimension_supports, 0);
    assert.equal(row.field_test_eligible, false);
    assert.equal(row.operator_finding, false);
    assert.equal(row.graph_effect, 'none');
    assert.deepEqual(Object.keys(row.dimension_vector), dimensions);
    assert.ok(row.source_ids.length > 0);
    for (const sourceId of row.source_ids) {
      assert.ok(sourceRegistry.sources.some((source) => source.source_id === sourceId));
    }
  }

  const p16 = byId['CS-BLIND-0016'];
  assert.equal(p16.findings.same_matter_successor_action_observed, true);
  assert.equal(p16.findings.successor_charging_object_located, true);
  assert.equal(p16.findings.career_prosecutor_continuity_observed, true);
  assert.equal(p16.findings.same_matter_later_outcome_observed, true);
  assert.equal(p16.findings.direct_outgoing_to_successor_handoff_receipt_located, false);
  assert.equal(p16.findings.original_contemporaneous_work_object_located, false);
  assert.equal(p16.findings.predecessor_attribution_for_later_outcome_established, false);
  assert.equal(p16.findings.cross_domain_transfer_artifact_located, false);
  assert.equal(p16.dimension_vector.custody, 'same_matter_successor_operational_custody_observed_direct_handoff_missing');

  const p21 = byId['CS-BLIND-0021'];
  assert.equal(p21.findings.public_final_decision_located, false);
  assert.equal(p21.findings.public_initial_decision_located, false);
  assert.equal(p21.findings.durable_post_finality_custody_observed, false);
  assert.equal(p21.findings.record_access_route_identified, true);
  assert.equal(p21.findings.record_request_sent, false);
  assert.equal(p21.findings.bounded_public_absence_only, true);
  assert.equal(p21.dimension_vector.custody, 'provisional_reinstatement_under_external_stay_public_finality_unresolved');

  for (const route of routes.routes) {
    assert.equal(route.state, 'route_frozen_not_executed');
    assert.equal(route.contact_authorized, false);
  }

  assert.equal(contract.boundaries.same_matter_successor_action_is_direct_handoff, false);
  assert.equal(contract.boundaries.later_case_success_is_prior_operator_attribution, false);
  assert.equal(contract.boundaries.retrospective_testimony_is_original_work_object, false);
  assert.equal(contract.boundaries.foia_route_is_acquired_evidence, false);
  assert.equal(contract.boundaries.bounded_public_absence_proves_nonexistence, false);
  assert.equal(contract.boundaries.custody_refinement_is_new_dimension_support, false);
  assert.equal(contract.boundaries.field_test_authorized, false);
  assert.equal(contract.boundaries.promotion_authorized, false);
  assert.equal(contract.boundaries.person_ranking_authorized, false);
  assert.equal(contract.boundaries.graph_effect, 'none');
  return true;
}

export function validateWave06() {
  const contract = read('data/project/counter-selector-wave-06-custody-finality.json');
  const sourceRegistry = read('data/project/counter-selector-wave-06-source-registry.json');
  const registry = read('data/project/counter-selector-custody-finality-registry.json');
  const routes = read('data/project/counter-selector-wave-06-acquisition-routes.json');
  const manifest = read('data/project/counter-selector-wave-06-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-06/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-06/index.html');

  validateRegistryObject(registry, contract, sourceRegistry, routes);
  assert.deepEqual(registry, deriveRegistry(contract));
  assert.deepEqual(routes, deriveRoutes(contract));
  assert.deepEqual(manifest, computeReleaseManifest());
  assert.deepEqual(report, deriveReport(contract, sourceRegistry, registry, routes, manifest));
  assert.equal(html, renderHtml(report));
  assert.equal(manifest.entries.length, 9);
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.equal(report.counts.adversarial_mutations, 30);
  assert.equal(report.counts.direct_handoff_receipts, 0);
  assert.equal(report.counts.original_contemporaneous_work_objects, 0);
  assert.equal(report.counts.public_final_merits_decisions_located, 0);
  assert.equal(report.counts.field_test_eligible_packets, 0);
  assert.ok(html.includes('Same matter is not a handoff'));
  assert.ok(html.includes('0 DIRECT HANDOFFS'));
  assert.ok(html.includes('0 FINAL-MERITS DECISIONS'));

  console.log(`validate-counter-selector-wave-06: PASS (${registry.records.length} packets, ${sourceRegistry.sources.length} sources, ${manifest.combined_sha256})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateWave06();
