#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveAcquisitionRegistry,
  deriveBlindPacketRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-07.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const expectedCandidates = ['CS-C0002','CS-C0007','CS-C0012','CS-C0017','CS-C0022','CS-C0027'];
const expectedClasses = [
  'positive_candidate_operators',
  'false_positive_outsider_genius_candidates',
  'ordinary_specialists',
  'high_status_selected_operators',
  'repair_capable_partnerships',
  'brittle_or_failed_partnerships'
];
const expectedPackets = ['CS-BLIND-0012','CS-BLIND-0017','CS-BLIND-0022','CS-BLIND-0027'];

export function validateObjects(contract, sources, acquisition, packets) {
  assert.equal(contract.schema_version, 'counter-selector-wave-07-batch-02@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W07-B02');
  assert.equal(contract.batch_id, 'CS-AQ-B02');
  assert.equal(contract.parent_release_sha256.length, 64);
  assert.equal(contract.candidate_results.length, 6);
  assert.equal(contract.blind_packet_specs.length, 4);

  assert.deepEqual(contract.candidate_results.map((row) => row.candidate_id).sort(), expectedCandidates);
  assert.deepEqual(contract.candidate_results.map((row) => row.denominator_class).sort(), [...expectedClasses].sort());
  assert.equal(new Set(contract.candidate_results.map((row) => row.candidate_id)).size, 6);
  assert.equal(new Set(contract.candidate_results.map((row) => row.blind_token)).size, 6);

  assert.equal(sources.schema_version, 'counter-selector-wave-07-source-registry@1');
  assert.equal(sources.sources.length, 13);
  assert.equal(new Set(sources.sources.map((row) => row.source_id)).size, 13);
  for (const source of sources.sources) {
    assert.ok(expectedCandidates.includes(source.candidate_id));
    assert.ok(source.supports.length > 0);
    assert.ok(source.limits.length > 0);
    assert.ok(source.url.startsWith('https://'));
  }

  assert.deepEqual(acquisition, deriveAcquisitionRegistry(contract));
  assert.equal(acquisition.counts.batch_objects, 6);
  assert.equal(acquisition.counts.denominator_classes, 6);
  assert.equal(acquisition.counts.official_source_packets, 13);
  assert.equal(acquisition.counts.qualifying_acquisitions, 4);
  assert.equal(acquisition.counts.partial_acquisitions, 2);
  assert.equal(acquisition.counts.blind_packets_ready, 4);
  assert.equal(acquisition.counts.identity_minimized_packets, 4);
  assert.equal(acquisition.counts.operator_artifact_packets, 2);
  assert.equal(acquisition.counts.mechanism_only_packets, 2);
  assert.equal(acquisition.counts.blind_reviews_executed, 0);
  assert.equal(acquisition.counts.field_tests_executed, 0);
  assert.equal(acquisition.counts.person_or_partnership_findings, 0);
  assert.equal(acquisition.counts.operator_findings, 0);
  assert.equal(acquisition.counts.promotions, 0);
  assert.equal(acquisition.counts.person_rankings, 0);
  assert.equal(acquisition.counts.public_identity_releases, 0);
  assert.equal(acquisition.counts.graph_effects, 0);
  assert.equal(acquisition.counts.adversarial_mutations, 30);

  const byId = Object.fromEntries(acquisition.candidates.map((row) => [row.candidate_id, row]));
  assert.equal(byId['CS-C0002'].qualification, 'partial_not_blind_ready');
  assert.equal(byId['CS-C0007'].qualification, 'partial_not_blind_ready');
  for (const id of ['CS-C0012','CS-C0017','CS-C0022','CS-C0027']) {
    assert.equal(byId[id].qualification, 'qualifying_for_blind_packet');
    assert.equal(byId[id].blind_packet_ready, true);
    assert.equal(byId[id].review_state, 'blind_packet_ready_not_reviewed');
  }
  assert.equal(byId['CS-C0012'].packet_kind, 'operator_artifact_packet');
  assert.equal(byId['CS-C0017'].packet_kind, 'operator_artifact_packet');
  assert.equal(byId['CS-C0022'].packet_kind, 'system_mechanism_packet');
  assert.equal(byId['CS-C0027'].packet_kind, 'system_failure_packet');

  for (const row of acquisition.candidates) {
    assert.ok(row.source_ids.length > 0);
    for (const sourceId of row.source_ids) {
      assert.ok(sources.sources.some((source) => source.source_id === sourceId && source.candidate_id === row.candidate_id));
    }
    assert.ok(row.missing_receipts.length > 0);
    assert.ok(row.falsifier.length > 0);
  }

  assert.deepEqual(packets, deriveBlindPacketRegistry(contract));
  assert.equal(packets.counts.packets_ready, 4);
  assert.equal(packets.counts.operator_artifact_packets, 2);
  assert.equal(packets.counts.mechanism_only_packets, 2);
  assert.equal(packets.counts.blind_reviews_executed, 0);
  assert.equal(packets.counts.field_tests_executed, 0);
  assert.equal(packets.counts.person_or_partnership_findings, 0);
  assert.equal(packets.counts.public_identity_releases, 0);
  assert.equal(packets.counts.promotions, 0);
  assert.equal(packets.counts.person_rankings, 0);
  assert.equal(packets.counts.graph_effects, 0);
  assert.deepEqual(packets.packets.map((row) => row.packet_id).sort(), expectedPackets);
  assert.equal(packets.private_map.length, 4);

  for (const packet of packets.packets) {
    assert.equal(packet.identity_removed, true);
    assert.equal(packet.status_cues_removed, true);
    assert.equal(packet.class_cues_removed, true);
    assert.equal(packet.source_ids_removed, true);
    assert.equal(packet.blind_review_executed, false);
    assert.equal(packet.field_test_authorized, false);
    assert.equal(packet.public_identity_release_authorized, false);
    assert.equal(packet.graph_effect, 'none');
    assert.equal(packet.packet_state, 'identity_minimized_ready_not_reviewed');
    assert.ok(packet.task.length > 0);
    assert.ok(packet.requirements.length > 0);
    assert.ok(packet.bounded_chronology.length > 0);
    assert.ok(packet.counterevidence.length > 0);
    assert.ok(packet.falsifier.length > 0);
    for (const forbidden of ['candidate_id','denominator_class','public_label','source_ids','source_record_id']) {
      assert.equal(Object.prototype.hasOwnProperty.call(packet, forbidden), false);
    }
  }

  assert.equal(contract.boundaries.source_summary_is_artifact, false);
  assert.equal(contract.boundaries.settlement_is_merits_finding, false);
  assert.equal(contract.boundaries.official_investigation_is_original_work_object, false);
  assert.equal(contract.boundaries.accident_inquiry_is_operator_finding, false);
  assert.equal(contract.boundaries.critical_report_plus_resignation_is_retaliatory_removal, false);
  assert.equal(contract.boundaries.mechanism_packet_is_person_finding, false);
  assert.equal(contract.boundaries.system_failure_packet_is_partnership_finding, false);
  assert.equal(contract.boundaries.blind_packet_is_review_result, false);
  assert.equal(contract.boundaries.blind_review_authorized, true);
  assert.equal(contract.boundaries.field_test_authorized, false);
  assert.equal(contract.boundaries.promotion_authorized, false);
  assert.equal(contract.boundaries.person_ranking_authorized, false);
  assert.equal(contract.boundaries.public_identity_release_authorized, false);
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(acquisition.boundaries.field_test_authorized, false);
  assert.equal(packets.boundaries.mechanism_packet_is_person_or_partnership_finding, false);
  assert.equal(packets.boundaries.failure_packet_is_person_or_partnership_finding, false);
  return true;
}

export function validateWave07() {
  const contract = read('data/project/counter-selector-wave-07-batch-02.json');
  const sources = read('data/project/counter-selector-wave-07-source-registry.json');
  const acquisition = read('data/project/counter-selector-artifact-acquisition-b02-registry.json');
  const packets = read('data/project/counter-selector-blind-packet-registry-b02.json');
  const manifest = read('data/project/counter-selector-wave-07-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-07/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-07/index.html');

  validateObjects(contract, sources, acquisition, packets);
  assert.deepEqual(manifest, computeReleaseManifest());
  assert.deepEqual(report, deriveReport(contract, sources, acquisition, packets, manifest));
  assert.equal(html, renderHtml(report));
  assert.equal(manifest.entries.length, 9);
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.equal(report.counts.adversarial_mutations, 30);
  assert.equal(report.counts.blind_reviews_executed, 0);
  assert.equal(report.counts.field_tests_executed, 0);
  assert.equal(report.counts.person_or_partnership_findings, 0);
  assert.ok(html.includes('Four packets, zero selections'));
  assert.ok(html.includes('0 REVIEWS'));
  assert.ok(html.includes('0 FIELD TESTS'));
  console.log(`validate-counter-selector-wave-07: PASS (${acquisition.candidates.length} objects, ${sources.sources.length} sources, ${packets.packets.length} packets, ${manifest.combined_sha256})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateWave07();
