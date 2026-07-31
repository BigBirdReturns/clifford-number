#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseScope } from './build-counter-selector-wave-03.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(modulePath), '..');
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const requireCondition = (condition, message) => { if (!condition) fail(message); };
const unique = (values) => new Set(values).size === values.length;
const sorted = (values) => [...values].sort();
const sameSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const EXPECTED_PARENT = '114bd54f5e700ff5b2227102ffd8df094682be1de58f73c139189081cb2fa308';
const EXPECTED_IDS = ['CS-C0001', 'CS-C0006', 'CS-C0011', 'CS-C0016', 'CS-C0021', 'CS-C0026'];
const EXPECTED_CLASSES = [
  'positive_candidate_operators',
  'false_positive_outsider_genius_candidates',
  'ordinary_specialists',
  'high_status_selected_operators',
  'repair_capable_partnerships',
  'brittle_or_failed_partnerships'
];
const EXPECTED_QUALIFIERS = ['CS-C0016', 'CS-C0021'];
const ALLOWED_HOSTS = new Set([
  'osc.gov', 'www.osc.gov',
  'oversight.gov', 'www.oversight.gov',
  'oig.justice.gov',
  'docs.house.gov'
]);
const FORBIDDEN_PUBLIC_PACKET_STRINGS = [
  'CS-C', 'K0-', 'CS-W03-S', 'osc.gov', 'oversight.gov', 'justice.gov', 'house.gov',
  'FAA', 'AmeriCorps', 'Army', 'USAMRIID', 'Senate-confirmed', 'prosecutor',
  'Veterans Affairs', ' VA ', 'BARDA', 'HHS', 'Rick Bright'
];

function exactCounts(counts) {
  const expected = {
    batch_objects: 6,
    denominator_classes: 6,
    official_source_packets: 17,
    qualifying_acquisitions: 2,
    partial_acquisitions: 4,
    blind_packets_ready: 2,
    blind_reviews_executed: 0,
    field_tests_executed: 0,
    promotions: 0,
    person_rankings: 0,
    graph_effects: 0
  };
  for (const [key, value] of Object.entries(expected)) {
    requireCondition(counts[key] === value, `Count ${key} must equal ${value}.`);
  }
}

function validateContract(contract) {
  requireCondition(contract.schema_version === 'counter-selector-artifact-acquisition-program@1', 'Unexpected Wave 03 contract schema.');
  requireCondition(contract.program_id === 'counter-selector-v1', 'Unexpected program ID.');
  requireCondition(contract.wave_id === 'CS-W03-B01', 'Unexpected Wave 03 ID.');
  requireCondition(contract.batch_id === 'CS-AQ-B01', 'Unexpected acquisition batch.');
  requireCondition(contract.parent_release_sha256 === EXPECTED_PARENT, 'Parent release digest drifted.');
  requireCondition(sameSet(contract.expected_candidate_ids, EXPECTED_IDS), 'Expected candidate denominator drifted.');
  requireCondition(contract.candidates.length === 6, 'Wave 03 must contain six candidates.');
  requireCondition(contract.source_packets.length === 17, 'Wave 03 must contain seventeen source packets.');
  requireCondition(contract.blind_packet_templates.length === 2, 'Wave 03 must contain exactly two blind-packet templates.');

  const candidateIds = contract.candidates.map((candidate) => candidate.candidate_id);
  const classes = contract.candidates.map((candidate) => candidate.denominator_class);
  requireCondition(unique(candidateIds), 'Candidate IDs must be unique.');
  requireCondition(sameSet(candidateIds, EXPECTED_IDS), 'Candidate denominator does not match Batch 01.');
  requireCondition(unique(classes), 'Batch 01 must retain one candidate per denominator class.');
  requireCondition(sameSet(classes, EXPECTED_CLASSES), 'Batch 01 class balance drifted.');

  const qualifiers = contract.candidates
    .filter((candidate) => candidate.qualification === 'qualifying_for_blind_packet')
    .map((candidate) => candidate.candidate_id);
  requireCondition(sameSet(qualifiers, EXPECTED_QUALIFIERS), 'Qualifying acquisition set drifted.');
  requireCondition(contract.candidates.filter((candidate) => candidate.qualification === 'partial_not_blind_ready').length === 4, 'Exactly four acquisitions must remain partial.');

  for (const candidate of contract.candidates) {
    requireCondition(Array.isArray(candidate.missing_receipts) && candidate.missing_receipts.length > 0, `${candidate.candidate_id} must preserve missing receipts.`);
    requireCondition(typeof candidate.falsifier === 'string' && candidate.falsifier.length > 25, `${candidate.candidate_id} must preserve a recoverable falsifier.`);
    requireCondition(candidate.artifact_summary.length > 35, `${candidate.candidate_id} artifact summary is too weak.`);
  }

  const sourceIds = contract.source_packets.map((source) => source.source_id);
  requireCondition(unique(sourceIds), 'Source packet IDs must be unique.');
  for (const source of contract.source_packets) {
    requireCondition(candidateIds.includes(source.candidate_id), `${source.source_id} targets an object outside Batch 01.`);
    const parsed = new URL(source.url);
    requireCondition(parsed.protocol === 'https:', `${source.source_id} must use HTTPS.`);
    requireCondition(ALLOWED_HOSTS.has(parsed.hostname), `${source.source_id} is not an allowed official-domain packet.`);
    requireCondition(Array.isArray(source.supports) && source.supports.length > 0, `${source.source_id} must state what it supports.`);
    requireCondition(Array.isArray(source.does_not_establish) && source.does_not_establish.length > 0, `${source.source_id} must state its authority ceiling.`);
  }

  const templates = contract.blind_packet_templates;
  requireCondition(unique(templates.map((packet) => packet.packet_id)), 'Blind packet IDs must be unique.');
  requireCondition(unique(templates.map((packet) => packet.blind_token)), 'Blind tokens must be unique.');
  requireCondition(sameSet(templates.map((packet) => packet.candidate_id_private_map), EXPECTED_QUALIFIERS), 'Blind templates must map only the two qualifying candidates.');
  for (const packet of templates) {
    requireCondition(packet.identity_removed === true, `${packet.packet_id} must remove identity.`);
    requireCondition(packet.status_cues_removed === true, `${packet.packet_id} must remove status cues.`);
    requireCondition(packet.source_ids_removed === true, `${packet.packet_id} must remove source IDs.`);
    requireCondition(packet.blind_review_executed === false, `${packet.packet_id} cannot claim a blind review.`);
    requireCondition(packet.field_test_authorized === false, `${packet.packet_id} cannot authorize a field test.`);
    requireCondition(packet.graph_effect === 'none', `${packet.packet_id} cannot create a graph effect.`);
  }

  requireCondition(contract.boundaries.public_identity_release_authorized === false, 'Public identity release must remain prohibited.');
  requireCondition(contract.boundaries.person_ranking_generated === false, 'Person ranking must remain prohibited.');
  requireCondition(contract.boundaries.promotion_generated === false, 'Promotion must remain prohibited.');
  requireCondition(contract.boundaries.graph_effect === 'none', 'Contract graph effect must remain none.');
}

function validateAcquisitionRegistry(contract, registry) {
  requireCondition(registry.schema_version === 'counter-selector-artifact-acquisition-registry@1', 'Unexpected acquisition-registry schema.');
  requireCondition(registry.parent_release_sha256 === EXPECTED_PARENT, 'Acquisition registry parent digest drifted.');
  requireCondition(registry.batch_id === 'CS-AQ-B01', 'Acquisition registry batch drifted.');
  exactCounts(registry.counts);
  requireCondition(registry.candidates.length === 6, 'Acquisition registry must contain six objects.');
  requireCondition(registry.source_packets.length === 17, 'Acquisition registry must contain seventeen sources.');
  requireCondition(JSON.stringify(registry.source_packets) === JSON.stringify(contract.source_packets), 'Acquisition registry source custody differs from the frozen contract.');

  const registryIds = registry.candidates.map((candidate) => candidate.candidate_id);
  requireCondition(sameSet(registryIds, EXPECTED_IDS), 'Acquisition registry denominator drifted.');
  const qualifierIds = registry.candidates.filter((candidate) => candidate.blind_packet_ready).map((candidate) => candidate.candidate_id);
  requireCondition(sameSet(qualifierIds, EXPECTED_QUALIFIERS), 'Blind-ready acquisition set drifted.');

  const contractById = new Map(contract.candidates.map((candidate) => [candidate.candidate_id, candidate]));
  for (const candidate of registry.candidates) {
    const source = contractById.get(candidate.candidate_id);
    requireCondition(Boolean(source), `${candidate.candidate_id} is not in the frozen contract.`);
    requireCondition(candidate.qualification === source.qualification, `${candidate.candidate_id} qualification drifted.`);
    requireCondition(candidate.acquisition_state === source.acquisition_state, `${candidate.candidate_id} acquisition state drifted.`);
    requireCondition(JSON.stringify(candidate.missing_receipts) === JSON.stringify(source.missing_receipts), `${candidate.candidate_id} missing-receipt ledger drifted.`);
    requireCondition(candidate.falsifier === source.falsifier, `${candidate.candidate_id} falsifier drifted.`);
    requireCondition(candidate.source_packet_count === candidate.source_packet_ids.length && candidate.source_packet_count > 0, `${candidate.candidate_id} source packet count is invalid.`);
    const expectedSourceIds = contract.source_packets.filter((packet) => packet.candidate_id === candidate.candidate_id).map((packet) => packet.source_id);
    requireCondition(sameSet(candidate.source_packet_ids, expectedSourceIds), `${candidate.candidate_id} source custody drifted.`);
    const expectedReviewState = candidate.blind_packet_ready ? 'blind_packet_ready_not_reviewed' : 'partial_acquisition_retained';
    requireCondition(candidate.review_state === expectedReviewState, `${candidate.candidate_id} review state is invalid.`);
    requireCondition(candidate.blind_review_executed === false, `${candidate.candidate_id} cannot claim blind review.`);
    requireCondition(candidate.field_test_executed === false, `${candidate.candidate_id} cannot claim field testing.`);
    requireCondition(candidate.promotion_generated === false, `${candidate.candidate_id} cannot claim promotion.`);
    requireCondition(candidate.person_ranking_generated === false, `${candidate.candidate_id} cannot claim person ranking.`);
    requireCondition(candidate.public_identity_release_authorized === false, `${candidate.candidate_id} cannot authorize identity release.`);
    requireCondition(candidate.graph_effect === 'none', `${candidate.candidate_id} graph effect must remain none.`);
  }
  requireCondition(registry.boundaries.graph_effect === 'none', 'Acquisition-registry graph effect must remain none.');
}

function validateBlindPacketRegistry(registry) {
  requireCondition(registry.schema_version === 'counter-selector-blind-packet-registry@1', 'Unexpected blind-packet registry schema.');
  requireCondition(registry.parent_release_sha256 === EXPECTED_PARENT, 'Blind-packet registry parent digest drifted.');
  requireCondition(registry.batch_id === 'CS-AQ-B01', 'Blind-packet registry batch drifted.');
  requireCondition(registry.counts.packets_ready === 2, 'Exactly two identity-minimized packets must be ready.');
  for (const zeroField of ['blind_reviews_executed', 'field_tests_executed', 'public_identity_releases', 'promotions', 'person_rankings', 'graph_effects']) {
    requireCondition(registry.counts[zeroField] === 0, `Blind-packet count ${zeroField} must remain zero.`);
  }
  requireCondition(registry.private_map.length === 2, 'Private packet map must contain two rows.');
  requireCondition(registry.packets.length === 2, 'Blind packet registry must contain two public packets.');
  requireCondition(sameSet(registry.private_map.map((row) => row.candidate_id), EXPECTED_QUALIFIERS), 'Private packet map targets the wrong candidates.');
  requireCondition(unique(registry.private_map.map((row) => row.blind_token)), 'Private packet tokens must be unique.');
  requireCondition(unique(registry.packets.map((packet) => packet.blind_token)), 'Public packet tokens must be unique.');
  requireCondition(sameSet(registry.private_map.map((row) => row.blind_token), registry.packets.map((packet) => packet.blind_token)), 'Private and public packet tokens do not reconcile.');

  for (const packet of registry.packets) {
    requireCondition(!Object.hasOwn(packet, 'candidate_id') && !Object.hasOwn(packet, 'candidate_id_private_map'), `${packet.packet_id} leaks candidate mapping.`);
    requireCondition(packet.identity_removed === true, `${packet.packet_id} identity-removal flag must be true.`);
    requireCondition(packet.status_cues_removed === true, `${packet.packet_id} status-removal flag must be true.`);
    requireCondition(packet.source_ids_removed === true, `${packet.packet_id} source-removal flag must be true.`);
    requireCondition(packet.packet_state === 'identity_minimized_ready_not_reviewed', `${packet.packet_id} packet state is invalid.`);
    requireCondition(packet.blind_review_executed === false, `${packet.packet_id} cannot claim blind review.`);
    requireCondition(packet.field_test_authorized === false, `${packet.packet_id} cannot authorize a field test.`);
    requireCondition(packet.public_identity_release_authorized === false, `${packet.packet_id} cannot authorize public identity release.`);
    requireCondition(packet.graph_effect === 'none', `${packet.packet_id} graph effect must remain none.`);
    const serialized = ` ${JSON.stringify(packet)} `;
    for (const forbidden of FORBIDDEN_PUBLIC_PACKET_STRINGS) {
      requireCondition(!serialized.includes(forbidden), `${packet.packet_id} leaks forbidden blind-review cue: ${forbidden}`);
    }
  }
  requireCondition(registry.boundaries.private_map_available_to_blind_reviewer === false, 'Private packet map must not be available to blind reviewers.');
  requireCondition(registry.boundaries.graph_effect === 'none', 'Blind-packet registry graph effect must remain none.');
}

function validateReport(acquisitionRegistry, blindPacketRegistry, report) {
  requireCondition(report.schema_version === 'counter-selector-wave-03-report@1', 'Unexpected Wave 03 report schema.');
  requireCondition(report.parent_release_sha256 === EXPECTED_PARENT, 'Report parent digest drifted.');
  exactCounts(report.counts);
  requireCondition(report.counts.identity_minimized_packets === 2, 'Report packet count drifted.');
  requireCondition(report.counts.adversarial_mutations === 24, 'Report adversarial-mutation count drifted.');
  requireCondition(report.candidate_results.length === 6, 'Report must expose six candidate results.');
  requireCondition(report.blind_packets.length === 2, 'Report must expose two packet states.');
  requireCondition(report.release_manifest?.combined_sha256?.length === 64, 'Report must expose the release digest.');
  requireCondition(report.boundaries.graph_effect === 'none', 'Report graph effect must remain none.');
  requireCondition(report.counts.qualifying_acquisitions === acquisitionRegistry.counts.qualifying_acquisitions, 'Report qualifying count does not reconcile.');
  requireCondition(report.counts.identity_minimized_packets === blindPacketRegistry.counts.packets_ready, 'Report packet count does not reconcile.');
}

function validateManifest(manifest, fileContents) {
  requireCondition(manifest.schema_version === 'counter-selector-wave-03-release-manifest@1', 'Unexpected release-manifest schema.');
  requireCondition(manifest.scope_ordered === true && manifest.self_included === false, 'Release-manifest scope contract drifted.');
  requireCondition(JSON.stringify(manifest.entries.map((entry) => entry.path)) === JSON.stringify(releaseScope), 'Release-manifest path scope drifted.');
  for (const entry of manifest.entries) {
    requireCondition(Object.hasOwn(fileContents, entry.path), `Missing exact-byte content for ${entry.path}.`);
    const bytes = Buffer.from(fileContents[entry.path], 'utf8');
    requireCondition(entry.bytes === bytes.length, `Byte count drifted for ${entry.path}.`);
    requireCondition(entry.sha256 === sha256(bytes), `SHA-256 drifted for ${entry.path}.`);
  }
  const combined = sha256(manifest.entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''));
  requireCondition(manifest.combined_sha256 === combined, 'Combined release digest drifted.');
  requireCondition(manifest.boundaries.graph_effect === 'none', 'Release-manifest graph effect must remain none.');
}

export function loadWave03State() {
  const contract = readJson('data/project/counter-selector-wave-03-batch-01.json');
  const parentManifest = readJson('data/project/counter-selector-wave-02-release-manifest.json');
  const acquisitionRegistry = readJson('data/project/counter-selector-artifact-acquisition-b01-registry.json');
  const blindPacketRegistry = readJson('data/project/counter-selector-blind-packet-registry.json');
  const report = readJson('reports/core-thesis/counter-selector-wave-03/data.json');
  const manifest = readJson('data/project/counter-selector-wave-03-release-manifest.json');
  const fileContents = Object.fromEntries(releaseScope.map((rel) => [rel, readText(rel)]));
  return { contract, parentManifest, acquisitionRegistry, blindPacketRegistry, report, manifest, fileContents };
}

export function validateWave03State(state) {
  requireCondition(state.parentManifest.combined_sha256 === EXPECTED_PARENT, 'Canonical Wave 02 parent release is not available.');
  validateContract(state.contract);
  validateAcquisitionRegistry(state.contract, state.acquisitionRegistry);
  validateBlindPacketRegistry(state.blindPacketRegistry);
  validateReport(state.acquisitionRegistry, state.blindPacketRegistry, state.report);
  validateManifest(state.manifest, state.fileContents);
  requireCondition(state.report.release_manifest.combined_sha256 === state.manifest.combined_sha256, 'Report and manifest release digests do not reconcile.');
  return {
    ok: true,
    objects: state.acquisitionRegistry.counts.batch_objects,
    sources: state.acquisitionRegistry.counts.official_source_packets,
    qualifying: state.acquisitionRegistry.counts.qualifying_acquisitions,
    partial: state.acquisitionRegistry.counts.partial_acquisitions,
    packets: state.blindPacketRegistry.counts.packets_ready,
    combined_sha256: state.manifest.combined_sha256
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const result = validateWave03State(loadWave03State());
  console.log(
    `validate-counter-selector-wave-03: PASS (${result.objects} objects, ${result.sources} sources, ` +
    `${result.qualifying} qualifying, ${result.partial} partial, ${result.packets} packets, ${result.combined_sha256})`
  );
}
