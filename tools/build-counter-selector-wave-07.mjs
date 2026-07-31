#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const writeJson = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const releaseScope = [
  '.github/workflows/counter-selector-wave-07.yml',
  'data/project/counter-selector-wave-07-batch-02.json',
  'data/project/counter-selector-wave-07-source-registry.json',
  'schemas/counter-selector-batch02-acquisition.schema.json',
  'docs/methods/counter-selector-batch02-acquisition.md',
  'docs/milestones/counter-selector-wave-07.md',
  'tools/build-counter-selector-wave-07.mjs',
  'tools/validate-counter-selector-wave-07.mjs',
  'test/counter-selector-wave-07.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-07-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W07-B02',
    batch_id: 'CS-AQ-B02',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_artifact_quality: false,
      manifest_proves_operator_or_partnership_capacity: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveAcquisitionRegistry(contract) {
  return {
    schema_version: 'counter-selector-artifact-acquisition-b02-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: 'batch_02_acquired_four_packets_ready_review_not_started',
    parent_release_sha256: contract.parent_release_sha256,
    counts: structuredClone(contract.expected_counts),
    class_counts: Object.fromEntries(contract.candidate_results.map((row) => [row.denominator_class, 1])),
    qualification_counts: {
      partial_not_blind_ready: contract.candidate_results.filter((row) => row.qualification === 'partial_not_blind_ready').length,
      qualifying_for_blind_packet: contract.candidate_results.filter((row) => row.qualification === 'qualifying_for_blind_packet').length
    },
    candidates: structuredClone(contract.candidate_results),
    next_action: 'Run procedurally separated blind-first review on the four identity-minimized Batch 02 packets. Preserve mechanism-only and failure-only packet classes without converting them into people or partnerships.',
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveBlindPacketRegistry(contract) {
  const qualifying = contract.candidate_results.filter((row) => row.blind_packet_ready);
  const specByToken = Object.fromEntries(contract.blind_packet_specs.map((row) => [row.blind_token, row]));
  const packets = qualifying.map((row) => {
    const spec = specByToken[row.blind_token];
    return {
      schema_version: 'counter-selector-blind-packet@2',
      program_id: contract.program_id,
      wave_id: contract.wave_id,
      batch_id: contract.batch_id,
      ...structuredClone(spec),
      identity_removed: true,
      status_cues_removed: true,
      class_cues_removed: true,
      source_ids_removed: true,
      blind_review_executed: false,
      field_test_authorized: false,
      public_identity_release_authorized: false,
      graph_effect: 'none',
      packet_state: 'identity_minimized_ready_not_reviewed'
    };
  });
  return {
    schema_version: 'counter-selector-blind-packet-registry-b02@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: 'four_identity_minimized_packets_ready_blind_review_not_started',
    counts: {
      packets_ready: packets.length,
      operator_artifact_packets: packets.filter((row) => row.packet_kind === 'operator_artifact_packet').length,
      mechanism_only_packets: packets.filter((row) => row.packet_kind !== 'operator_artifact_packet').length,
      blind_reviews_executed: 0,
      field_tests_executed: 0,
      person_or_partnership_findings: 0,
      public_identity_releases: 0,
      promotions: 0,
      person_rankings: 0,
      graph_effects: 0
    },
    private_map: qualifying.map((row) => ({
      packet_id: specByToken[row.blind_token].packet_id,
      blind_token: row.blind_token,
      candidate_id: row.candidate_id,
      mapping_authority: 'custody_only_not_available_to_blind_reviewer'
    })),
    packets,
    next_action: 'Assign four packets to procedurally separated artifact-validity and adversarial-countermodel passes without exposing the private map.',
    boundaries: {
      packet_is_operator_finding: false,
      mechanism_packet_is_person_or_partnership_finding: false,
      failure_packet_is_person_or_partnership_finding: false,
      packet_is_blind_review_result: false,
      private_map_available_to_blind_reviewer: false,
      packet_authorizes_contact: false,
      packet_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export function deriveReport(contract, sources, acquisition, packets, manifest) {
  return {
    schema_version: 'counter-selector-wave-07-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    title: contract.title,
    status: acquisition.status,
    parent_release_sha256: contract.parent_release_sha256,
    counts: acquisition.counts,
    class_counts: acquisition.class_counts,
    qualification_counts: acquisition.qualification_counts,
    candidate_results: acquisition.candidates.map((row) => ({
      candidate_id: row.candidate_id,
      blind_token: row.blind_token,
      denominator_class: row.denominator_class,
      public_label: row.public_label,
      acquisition_state: row.acquisition_state,
      qualification: row.qualification,
      packet_kind: row.packet_kind,
      source_packet_count: row.source_ids.length,
      missing_receipts: row.missing_receipts,
      review_state: row.review_state,
      graph_effect: 'none'
    })),
    blind_packets: packets.packets.map((row) => ({
      packet_id: row.packet_id,
      blind_token: row.blind_token,
      packet_kind: row.packet_kind,
      review_authority: row.review_authority,
      packet_state: row.packet_state,
      graph_effect: row.graph_effect
    })),
    source_summary: {
      official_source_packets: sources.sources.length,
      source_domains: [...new Set(sources.sources.map((row) => new URL(row.url).hostname))].sort()
    },
    next_action: acquisition.next_action,
    boundaries: {
      ...contract.boundaries,
      ...sources.boundaries,
      ...packets.boundaries
    },
    release_manifest: {
      path: 'data/project/counter-selector-wave-07-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

export function renderHtml(report) {
  const candidateRows = report.candidate_results.map((row) => `
    <tr><td><code>${esc(row.candidate_id)}</code></td><td>${esc(row.denominator_class)}</td><td>${esc(row.qualification)}</td><td>${esc(row.packet_kind)}</td><td>${row.source_packet_count}</td></tr>`).join('');
  const packetRows = report.blind_packets.map((row) => `
    <tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.packet_kind)}</td><td>${esc(row.review_authority)}</td><td>${esc(row.packet_state)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 07 · Batch 02 acquisition</title>
<style>:root{color-scheme:light;background:#f0ede5;color:#171612;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1440px;margin:0 auto;padding:42px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5.2rem);line-height:.96;letter-spacing:-.05em;max-width:1100px}.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>
<h1>Four packets, zero selections</h1>
<p class="state">6 OBJECTS · 13 OFFICIAL SOURCES · 4 BLIND PACKETS · 0 REVIEWS · 0 FIELD TESTS</p>
<div class="grid"><article class="card"><b>${report.counts.qualifying_acquisitions}</b>qualifying acquisitions</article><article class="card"><b>${report.counts.partial_acquisitions}</b>explicit partials</article><article class="card"><b>${report.counts.operator_artifact_packets}</b>operator-artifact packets</article><article class="card"><b>${report.counts.mechanism_only_packets}</b>mechanism/failure packets</article></div>
<h2>Acquisition results</h2><table><thead><tr><th>Object</th><th>Historical class</th><th>Qualification</th><th>Packet kind</th><th>Sources</th></tr></thead><tbody>${candidateRows}</tbody></table>
<h2>Identity-minimized packets</h2><table><thead><tr><th>Packet</th><th>Kind</th><th>Authority</th><th>State</th></tr></thead><tbody>${packetRows}</tbody></table>
<div class="boundary">official investigation ≠ original work object
critical report + resignation ≠ retaliatory removal
mechanism packet ≠ person or partnership finding
system failure ledger ≠ one operator
blind packet ≠ review result
acquisition ≠ field-test authority</div>
<p><strong>Next:</strong> ${esc(report.next_action)}</p>
<p><code>${esc(report.release_manifest.combined_sha256)}</code></p>
</body></html>
`;
}

export function buildCounterSelectorWave07() {
  const contract = read('data/project/counter-selector-wave-07-batch-02.json');
  const sources = read('data/project/counter-selector-wave-07-source-registry.json');
  const acquisition = deriveAcquisitionRegistry(contract);
  const packets = deriveBlindPacketRegistry(contract);
  writeJson('data/project/counter-selector-artifact-acquisition-b02-registry.json', acquisition);
  writeJson('data/project/counter-selector-blind-packet-registry-b02.json', packets);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-07-release-manifest.json', manifest);
  const report = deriveReport(contract, sources, acquisition, packets, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-07/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-07/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-07: ${acquisition.candidates.length} objects, ${sources.sources.length} sources, ${packets.packets.length} packets, 0 reviews`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave07();
