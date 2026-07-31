#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, buildCounterSelectorWave05 } from './build-counter-selector-wave-05.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const dimensions = ['support_adjusted_surplus','cross_domain_transfer','exception_handling','custody','model_elasticity','governed_capacity','non_zero_sum_orientation','epistemic_restraint'];

export function validateCounterSelectorWave05() {
  const built = buildCounterSelectorWave05();
  const { contract, sources, registry, supersession } = built;
  assert.equal(contract.wave_id, 'CS-W05-GAP-01');
  assert.equal(contract.parent_release_sha256, '4bfa22d8087becfa12549cd27c60441dbddd3e5047a4133d1fbec6c468e0e19d');
  assert.equal(contract.lane_plans.length, 2);
  assert.equal(sources.sources.length, 6);
  assert.equal(sources.search_receipts.length, 3);
  assert.equal(new Set(sources.sources.map((row) => row.source_id)).size, 6);
  assert.equal(new Set(sources.search_receipts.map((row) => row.search_receipt_id)).size, 3);
  assert.equal(registry.records.length, 2);
  assert.deepEqual(registry.records.map((row) => row.packet_id).sort(), ['CS-BLIND-0016','CS-BLIND-0021']);
  for (const record of registry.records) {
    assert.equal(record.schema_version, 'counter-selector-post-review-gap@1');
    assert.deepEqual(Object.keys(record.dimension_vector).sort(), [...dimensions].sort());
    assert.equal(record.field_test_eligible, false);
    assert.equal(record.operator_finding, false);
    assert.equal(record.promotion_generated, false);
    assert.equal(record.person_ranking_generated, false);
    assert.equal(record.public_identity_release_authorized, false);
    assert.equal(record.graph_effect, 'none');
  }
  const decision = registry.records.find((row) => row.packet_id === 'CS-BLIND-0016');
  assert.equal(decision.lane_type, 'support_handoff_transfer_audit');
  assert.equal(decision.findings.support_ledger_complete_for_bounded_public_record, true);
  assert.equal(decision.findings.support_adjusted_surplus_established, false);
  assert.equal(decision.findings.office_continuity_observed, true);
  assert.equal(decision.findings.independent_handoff_receipt_located, false);
  assert.equal(decision.findings.cross_domain_role_observed, true);
  assert.equal(decision.findings.cross_domain_transfer_artifact_located, false);
  assert.equal(decision.dimension_vector.governed_capacity, 'bounded_support_preserved');
  assert.equal(decision.dimension_vector.epistemic_restraint, 'bounded_support_preserved');
  const correction = registry.records.find((row) => row.packet_id === 'CS-BLIND-0021');
  assert.equal(correction.lane_type, 'correction_finality_audit');
  assert.equal(correction.chronology.length, 6);
  assert.equal(correction.findings.employment_state_reinstated_under_stay, true);
  assert.equal(correction.findings.final_merits_observed, false);
  assert.equal(correction.findings.durable_final_custody_observed, false);
  assert.equal(correction.findings.partnership_capacity_established, false);
  assert.equal(correction.analysis_class, 'correction_mechanism_control');
  assert.equal(correction.dimension_vector.custody, 'provisional_reinstatement_under_external_stay_finality_unknown');
  assert.equal(supersession.target.historical_file_rewritten, false);
  assert.equal(supersession.authority_effect.adverse_state_reinstated_under_external_stay, true);
  assert.equal(supersession.authority_effect.final_merits_established, false);
  assert.equal(supersession.authority_effect.durable_internal_repair_established, false);
  assert.equal(supersession.authority_effect.graph_effect, 'none');
  assert.equal(registry.counts.support_ledgers_completed, 1);
  assert.equal(registry.counts.chronology_supersessions, 1);
  assert.equal(registry.counts.support_adjusted_surplus_findings, 0);
  assert.equal(registry.counts.independent_handoff_receipts, 0);
  assert.equal(registry.counts.cross_domain_transfer_artifacts, 0);
  assert.equal(registry.counts.public_final_merits_decisions_located, 0);
  assert.equal(registry.counts.durable_final_custody_states, 0);
  assert.equal(registry.counts.new_bounded_dimension_supports, 0);
  assert.equal(registry.counts.field_test_eligible_packets, 0);
  assert.equal(registry.counts.operator_findings, 0);
  assert.equal(registry.counts.graph_effects, 0);
  for (const receipt of sources.search_receipts) {
    assert.match(receipt.result, /^no_later_public_/);
    assert.match(receipt.authority_ceiling, /does not prove/i);
  }
  for (const key of ['support_ledger_proves_surplus','office_continuity_is_independent_handoff','cross_domain_role_is_transfer_artifact','stay_is_final_merits','reinstatement_under_order_is_internal_partnership_repair','public_search_absence_proves_nonexistence','chronology_correction_is_operator_finding','field_test_authorized','promotion_authorized','person_ranking_authorized']) {
    assert.equal(registry.boundaries[key], false, key);
  }
  assert.equal(registry.boundaries.graph_effect, 'none');
  assert.deepEqual(read('data/project/counter-selector-wave-05-release-manifest.json'), computeReleaseManifest());
  const report = read('reports/core-thesis/counter-selector-wave-05/data.json');
  assert.equal(report.counts.reviewed_packets_audited, 2);
  assert.equal(report.counts.field_test_eligible_packets, 0);
  assert.equal(report.supersession.prior_record_deleted, false);
  const html = fs.readFileSync(path.join(root, 'reports/core-thesis/counter-selector-wave-05/index.html'), 'utf8');
  for (const phrase of ['Correction entered. Advancement refused.','support ledger ≠ support-adjusted surplus','stay ≠ final merits','search absence ≠ nonexistence','graph effect: none']) assert.ok(html.includes(phrase), phrase);
  console.log(`validate-counter-selector-wave-05: PASS (2 lanes, 1 supersession, 0 field tests, ${built.manifest.combined_sha256})`);
  return built;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validateCounterSelectorWave05();
