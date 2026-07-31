#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(modulePath), '..');

const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const writeText = (rel, content) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const countBy = (rows, key) => rows.reduce((acc, row) => {
  const value = row[key];
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}, {});
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  '.github/workflows/counter-selector-wave-03.yml',
  'data/project/counter-selector-wave-03-batch-01.json',
  'data/project/counter-selector-artifact-acquisition-b01-registry.json',
  'data/project/counter-selector-blind-packet-registry.json',
  'schemas/counter-selector-artifact-acquisition.schema.json',
  'docs/methods/counter-selector-artifact-acquisition.md',
  'docs/milestones/counter-selector-wave-03-batch-01.md',
  'tools/build-counter-selector-wave-03.mjs',
  'tools/validate-counter-selector-wave-03.mjs',
  'test/counter-selector-wave-03.test.js'
];

function buildAcquisitionRegistry(contract) {
  const sourcePacketsByCandidate = new Map();
  for (const source of contract.source_packets) {
    const rows = sourcePacketsByCandidate.get(source.candidate_id) || [];
    rows.push(source);
    sourcePacketsByCandidate.set(source.candidate_id, rows);
  }

  const candidates = contract.candidates.map((candidate) => {
    const sourcePackets = sourcePacketsByCandidate.get(candidate.candidate_id) || [];
    const qualifying = candidate.qualification === 'qualifying_for_blind_packet';
    return {
      schema_version: 'counter-selector-artifact-acquisition@1',
      program_id: contract.program_id,
      wave_id: contract.wave_id,
      batch_id: contract.batch_id,
      candidate_id: candidate.candidate_id,
      blind_token: candidate.blind_token,
      denominator_class: candidate.denominator_class,
      public_label: candidate.public_label,
      source_record_id: candidate.source_record_id,
      acquisition_state: candidate.acquisition_state,
      qualification: candidate.qualification,
      artifact_summary: candidate.artifact_summary,
      source_packet_ids: sourcePackets.map((source) => source.source_id),
      source_packet_count: sourcePackets.length,
      source_domains: [...new Set(sourcePackets.map((source) => new URL(source.url).hostname))].sort(),
      missing_receipts: [...candidate.missing_receipts],
      falsifier: candidate.falsifier,
      review_state: qualifying ? 'blind_packet_ready_not_reviewed' : 'partial_acquisition_retained',
      blind_packet_ready: qualifying,
      blind_review_executed: false,
      field_test_executed: false,
      promotion_generated: false,
      person_ranking_generated: false,
      public_identity_release_authorized: false,
      graph_effect: 'none'
    };
  });

  const qualifying = candidates.filter((candidate) => candidate.blind_packet_ready);
  const partial = candidates.filter((candidate) => !candidate.blind_packet_ready);
  return {
    schema_version: 'counter-selector-artifact-acquisition-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: 'batch_01_acquisition_complete_blind_review_not_started',
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      batch_objects: candidates.length,
      denominator_classes: Object.keys(countBy(candidates, 'denominator_class')).length,
      official_source_packets: contract.source_packets.length,
      qualifying_acquisitions: qualifying.length,
      partial_acquisitions: partial.length,
      blind_packets_ready: qualifying.length,
      blind_reviews_executed: 0,
      field_tests_executed: 0,
      promotions: 0,
      person_rankings: 0,
      graph_effects: 0
    },
    class_counts: countBy(candidates, 'denominator_class'),
    qualification_counts: countBy(candidates, 'qualification'),
    candidates,
    source_packets: contract.source_packets.map((source) => ({ ...source })),
    next_action: 'Run independent blind-first artifact review on the two identity-minimized packets while retaining four partial acquisitions in the denominator.',
    boundaries: {
      official_source_acquisition_is_operator_finding: false,
      partial_acquisition_is_negative_capability_evidence: false,
      qualifying_acquisition_is_blind_review_result: false,
      settlement_is_final_merits: false,
      stay_is_final_merits: false,
      publication_cleared: false,
      graph_effect: 'none'
    }
  };
}

function buildBlindPacketRegistry(contract, acquisitionRegistry) {
  const qualifyingCandidates = acquisitionRegistry.candidates
    .filter((candidate) => candidate.blind_packet_ready)
    .sort((left, right) => left.candidate_id.localeCompare(right.candidate_id));
  const templateByCandidate = new Map(
    contract.blind_packet_templates.map((template) => [template.candidate_id_private_map, template])
  );

  const privateMap = [];
  const packets = qualifyingCandidates.map((candidate) => {
    const template = templateByCandidate.get(candidate.candidate_id);
    if (!template) throw new Error(`Missing blind-packet template for ${candidate.candidate_id}`);
    privateMap.push({
      packet_id: template.packet_id,
      blind_token: template.blind_token,
      candidate_id: candidate.candidate_id,
      mapping_authority: 'custody_only_not_available_to_blind_reviewer'
    });
    const { candidate_id_private_map: _candidateIdPrivateMap, ...publicPacket } = template;
    return {
      schema_version: 'counter-selector-blind-packet@1',
      program_id: contract.program_id,
      wave_id: contract.wave_id,
      batch_id: contract.batch_id,
      ...publicPacket,
      packet_state: 'identity_minimized_ready_not_reviewed',
      public_identity_release_authorized: false
    };
  });

  return {
    schema_version: 'counter-selector-blind-packet-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: 'two_identity_minimized_packets_ready_blind_review_not_started',
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      packets_ready: packets.length,
      blind_reviews_executed: 0,
      field_tests_executed: 0,
      public_identity_releases: 0,
      promotions: 0,
      person_rankings: 0,
      graph_effects: 0
    },
    private_map: privateMap,
    packets,
    next_action: 'Assign the packets to independent reviewers without disclosing class, identity, status, source route, or matched-control identity.',
    boundaries: {
      packet_is_operator_finding: false,
      packet_is_blind_review_result: false,
      private_map_available_to_blind_reviewer: false,
      packet_authorizes_contact: false,
      packet_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

function computeReleaseManifest(contract, generatedTexts) {
  const entries = releaseScope.map((rel) => {
    const content = generatedTexts[rel] ?? readText(rel);
    const bytes = Buffer.from(content, 'utf8');
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-03-release-manifest@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_artifact_quality: false,
      manifest_proves_operator_capacity: false,
      manifest_authorizes_blind_review_result: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

function buildReport(contract, acquisitionRegistry, blindPacketRegistry, manifest) {
  return {
    schema_version: 'counter-selector-wave-03-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    title: contract.title,
    status: 'batch_01_acquired_two_packets_ready_review_not_started',
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      ...acquisitionRegistry.counts,
      identity_minimized_packets: blindPacketRegistry.counts.packets_ready,
      adversarial_mutations: 24
    },
    class_counts: acquisitionRegistry.class_counts,
    qualification_counts: acquisitionRegistry.qualification_counts,
    candidate_results: acquisitionRegistry.candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      blind_token: candidate.blind_token,
      denominator_class: candidate.denominator_class,
      public_label: candidate.public_label,
      acquisition_state: candidate.acquisition_state,
      qualification: candidate.qualification,
      source_packet_count: candidate.source_packet_count,
      missing_receipts: candidate.missing_receipts,
      review_state: candidate.review_state,
      graph_effect: candidate.graph_effect
    })),
    blind_packets: blindPacketRegistry.packets.map((packet) => ({
      packet_id: packet.packet_id,
      blind_token: packet.blind_token,
      packet_state: packet.packet_state,
      review_authority: packet.review_authority,
      blind_review_executed: packet.blind_review_executed,
      field_test_authorized: packet.field_test_authorized,
      graph_effect: packet.graph_effect
    })),
    next_action: acquisitionRegistry.next_action,
    release_manifest: {
      path: 'data/project/counter-selector-wave-03-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    },
    boundaries: {
      ...contract.boundaries,
      ...acquisitionRegistry.boundaries,
      ...blindPacketRegistry.boundaries
    }
  };
}

function buildHtml(report) {
  const resultRows = report.candidate_results.map((candidate) => `
    <tr><td><code>${escapeHtml(candidate.candidate_id)}</code></td><td>${escapeHtml(candidate.denominator_class)}</td><td>${escapeHtml(candidate.public_label)}</td><td>${escapeHtml(candidate.qualification)}</td><td>${candidate.source_packet_count}</td><td>${escapeHtml(candidate.review_state)}</td></tr>`).join('');
  const packetRows = report.blind_packets.map((packet) => `
    <tr><td><code>${escapeHtml(packet.packet_id)}</code></td><td><code>${escapeHtml(packet.blind_token)}</code></td><td>${escapeHtml(packet.packet_state)}</td><td>${escapeHtml(packet.review_authority)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 03 · Batch 01 acquisition</title>
<style>:root{color-scheme:light;background:#ece8de;color:#171612;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1500px;margin:0 auto;padding:42px 24px 76px;line-height:1.5}h1{max-width:1050px;font-size:clamp(2.6rem,6vw,5.8rem);line-height:.94;letter-spacing:-.055em}h2{margin-top:3rem}.lede{max-width:920px;font-size:1.18rem}.state{font-weight:900;color:#7d2d16}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c7bfae;border-radius:12px}.card{padding:17px;display:grid;gap:5px}.card b{font-size:2.35rem;line-height:1}.card span{font-weight:700}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}code{overflow-wrap:anywhere}.boundary{border-left:7px solid #7d2d16;padding:18px;white-space:pre-wrap}.small{color:#625d53;font-size:.88rem}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${escapeHtml(report.wave_id)}</strong></p>
<h1>Acquire the object, not the mythology</h1>
<p class="state">6 OBJECTS · 17 OFFICIAL SOURCE PACKETS · 2 BLIND PACKETS READY · 0 REVIEWS · GRAPH EFFECT NONE</p>
<p class="lede">Batch 01 preserves one object from every denominator class. Official acquisition produced two identity-minimized packets and four explicit partials. No source packet, settlement, stay, title, or positive evaluation becomes an operator finding by itself.</p>
<div class="metrics">
<article class="card"><b>${report.counts.batch_objects}</b><span>objects acquired</span></article>
<article class="card"><b>${report.counts.official_source_packets}</b><span>official source packets</span></article>
<article class="card"><b>${report.counts.qualifying_acquisitions}</b><span>qualifying acquisitions</span></article>
<article class="card"><b>${report.counts.partial_acquisitions}</b><span>explicit partials</span></article>
<article class="card"><b>${report.counts.identity_minimized_packets}</b><span>blind packets ready</span></article>
<article class="card"><b>${report.counts.blind_reviews_executed}</b><span>reviews executed</span></article>
</div>
<h2>Acquisition results</h2><table><thead><tr><th>Object</th><th>Class</th><th>Public route</th><th>Result</th><th>Sources</th><th>Review state</th></tr></thead><tbody>${resultRows}</tbody></table>
<h2>Identity-minimized packets</h2><table><thead><tr><th>Packet</th><th>Token</th><th>State</th><th>Authority</th></tr></thead><tbody>${packetRows}</tbody></table>
<h2>Authority ceiling</h2><div class="boundary">official source acquisition ≠ operator capability finding
later oversight reconstruction ≠ original work product
settlement ≠ final merits finding
stay ≠ final merits finding
positive performance record ≠ universal operator quality
identity-minimized packet ≠ blind review result
missing original object ≠ negative capability evidence
same mechanism ≠ coordination</div>
<p class="small">Exact-byte release digest: <code>${escapeHtml(report.release_manifest.combined_sha256)}</code>. This inspection surface is no-index and creates no public identity, ranking, promotion, relationship, or graph effect.</p>
</body></html>\n`;
}

export function buildCounterSelectorWave03({ writeFiles = true } = {}) {
  const contract = readJson('data/project/counter-selector-wave-03-batch-01.json');
  const parentManifest = readJson('data/project/counter-selector-wave-02-release-manifest.json');
  if (parentManifest.combined_sha256 !== contract.parent_release_sha256) {
    throw new Error('Wave 03 parent digest does not match the canonical Wave 02 release manifest.');
  }

  const acquisitionRegistry = buildAcquisitionRegistry(contract);
  const blindPacketRegistry = buildBlindPacketRegistry(contract, acquisitionRegistry);
  const generatedTexts = {
    'data/project/counter-selector-artifact-acquisition-b01-registry.json': stableJson(acquisitionRegistry),
    'data/project/counter-selector-blind-packet-registry.json': stableJson(blindPacketRegistry)
  };
  const manifest = computeReleaseManifest(contract, generatedTexts);
  const report = buildReport(contract, acquisitionRegistry, blindPacketRegistry, manifest);
  const reportText = stableJson(report);
  const htmlText = buildHtml(report);

  if (writeFiles) {
    for (const [rel, content] of Object.entries(generatedTexts)) writeText(rel, content);
    writeText('data/project/counter-selector-wave-03-release-manifest.json', stableJson(manifest));
    writeText('reports/core-thesis/counter-selector-wave-03/data.json', reportText);
    writeText('reports/core-thesis/counter-selector-wave-03/index.html', htmlText);
  }

  return {
    contract,
    acquisitionRegistry,
    blindPacketRegistry,
    manifest,
    report,
    generatedTexts: {
      ...generatedTexts,
      'data/project/counter-selector-wave-03-release-manifest.json': stableJson(manifest),
      'reports/core-thesis/counter-selector-wave-03/data.json': reportText,
      'reports/core-thesis/counter-selector-wave-03/index.html': htmlText
    }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const result = buildCounterSelectorWave03({ writeFiles: true });
  console.log(
    `build-counter-selector-wave-03: ${result.report.counts.batch_objects} objects, ` +
    `${result.report.counts.official_source_packets} source packets, ` +
    `${result.report.counts.qualifying_acquisitions} qualifying, ` +
    `${result.report.counts.identity_minimized_packets} blind packets`
  );
}
