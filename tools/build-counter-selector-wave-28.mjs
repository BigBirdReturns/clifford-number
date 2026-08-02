#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-28-batch-b-blind-review.json';
const BLIND_PATH = 'data/project/counter-selector-wave-28-blind-packet-registry.json';
const REVIEW_PATH = 'data/project/counter-selector-wave-28-review-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-28-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-28-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-28/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-28/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-28.yml',
  SOURCE_PATH,
  'schemas/counter-selector-observability-batch-b-review.schema.json',
  'docs/methods/counter-selector-observability-batch-b-review.md',
  'docs/milestones/counter-selector-wave-28.md',
  'tools/build-counter-selector-wave-28.mjs',
  'tools/validate-counter-selector-wave-28.mjs',
  'test/counter-selector-wave-28.test.js'
];

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function deriveBlindRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-28-blind-packet-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    status: source.status,
    independence: source.review_independence,
    input_contract: source.review_input_contract,
    packets: source.packets.map(packet => ({
      source_packet_id: packet.source_packet_id,
      review_packet_id: packet.review_packet_id,
      blind_token: packet.blind_token,
      candidate_type: packet.candidate_type,
      identity_labels_removed: true,
      identity_blindness_claimed: false,
      artifact_inferability: source.review_independence.artifact_inferability,
      blind_packet: packet.blind_packet,
      private_identity_map_available_during_passes: false,
      graph_effect: 'none'
    })),
    graph_effect: 'none'
  };
}

export function deriveReviewRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-28-review-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    independence: source.review_independence,
    packet_results: source.packets.map(packet => ({
      source_packet_id: packet.source_packet_id,
      review_packet_id: packet.review_packet_id,
      source_identity: packet.source_identity,
      public_label: packet.public_label,
      candidate_type: packet.candidate_type,
      review_passes: packet.review_passes,
      support_ledger: packet.support_ledger,
      person_bounded_supports: packet.person_bounded_supports,
      function_bounded_supports: packet.function_bounded_supports,
      dimension_vector: packet.dimension_vector,
      synthesis: packet.synthesis,
      disposition: packet.disposition,
      field_test_eligible: packet.field_test_eligible,
      operator_finding: packet.operator_finding,
      contact_authorized: packet.contact_authorized,
      graph_effect: packet.graph_effect
    })),
    boundaries: source.boundaries,
    graph_effect: 'none'
  };
}

export function deriveDisagreementLedger(source) {
  return {
    schema_version: 'counter-selector-wave-28-disagreement-ledger@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    disagreements_preserved: source.disagreements.length,
    disagreements: source.disagreements,
    averaging_authorized: false,
    graph_effect: 'none'
  };
}

export function deriveManifest(source) {
  const entries = STATIC_MANIFEST_PATHS.map(relativePath => {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined = sha256(Buffer.from(entries.map(entry =>
    `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-28-release-manifest@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      exact_bytes_prove_identity_blindness: false,
      exact_bytes_prove_person_attribution: false,
      exact_bytes_prove_dimension_support: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_handoff: false,
      exact_bytes_prove_external_review: false,
      exact_bytes_prove_complete_operator: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(source, blindRegistry, reviewRegistry, disagreements, manifest) {
  return {
    schema_version: 'counter-selector-wave-28-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
    sibling_wave_id: source.sibling_wave_id,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    independence: source.review_independence,
    blind_packet_summary: {
      packet_count: blindRegistry.packets.length,
      identity_labels_removed: true,
      identity_blindness_claimed: false,
      artifact_inferability: source.review_independence.artifact_inferability
    },
    packet_results: reviewRegistry.packet_results.map(packet => ({
      source_packet_id: packet.source_packet_id,
      review_packet_id: packet.review_packet_id,
      source_identity: packet.source_identity,
      public_label: packet.public_label,
      candidate_type: packet.candidate_type,
      person_bounded_supports: packet.person_bounded_supports,
      function_bounded_supports: packet.function_bounded_supports,
      dimension_vector: packet.dimension_vector,
      support_ledger_state: packet.support_ledger.state,
      valid_resource_normalized_comparator: packet.support_ledger.valid_resource_normalized_comparator,
      synthesis: packet.synthesis,
      disposition: packet.disposition,
      field_test_eligible: packet.field_test_eligible,
      operator_finding: packet.operator_finding,
      contact_authorized: packet.contact_authorized,
      graph_effect: packet.graph_effect
    })),
    disagreements: disagreements.disagreements,
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: {
      path: MANIFEST_PATH,
      combined_sha256: manifest.combined_sha256
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderHtml(report) {
  const rows = report.packet_results.map(packet => `<tr>
<td><code>${escapeHtml(packet.review_packet_id)}</code></td>
<td>${escapeHtml(packet.public_label)}</td>
<td>${escapeHtml(packet.candidate_type)}</td>
<td>${escapeHtml(packet.person_bounded_supports.join(', ') || 'none')}</td>
<td>${escapeHtml(packet.function_bounded_supports.join(', ') || 'none')}</td>
<td>${escapeHtml(packet.disposition)}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 28</title>
<style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1220px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.88rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W28-BB-01</strong></p>
<h1>Separate the operator from the operating system.</h1>
<p class="state">TWO REVIEWED PACKETS · THREE PERSON SUPPORTS · EIGHT FUNCTION SUPPORTS · ZERO OPERATORS</p>
<div class="grid"><article class="card"><b>${report.counts.identity_minimized_packets_reviewed}</b>reviewed packets</article>
<article class="card"><b>${report.counts.person_bounded_dimension_supports}</b>person supports</article>
<article class="card"><b>${report.counts.function_bounded_dimension_supports}</b>function supports</article>
<article class="card"><b>${report.counts.complete_operator_findings}</b>complete operators</article></div>
<table><thead><tr><th>ID</th><th>Artifact surface</th><th>Unit</th><th>Person support</th><th>Function support</th><th>Disposition</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>collective assurance ≠ person operator
current rollback ≠ successor handoff
failed acquisition ≠ universal elasticity
open sourcing ≠ completed handoff
service custody ≠ person custody
bounded support count ≠ rank
living person ≠ contact authority</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const blindRegistry = deriveBlindRegistry(source);
  const reviewRegistry = deriveReviewRegistry(source);
  const disagreements = deriveDisagreementLedger(source);
  fs.writeFileSync(path.join(ROOT, BLIND_PATH), stableJson(blindRegistry));
  fs.writeFileSync(path.join(ROOT, REVIEW_PATH), stableJson(reviewRegistry));
  fs.writeFileSync(path.join(ROOT, DISAGREEMENT_PATH), stableJson(disagreements));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, blindRegistry, reviewRegistry, disagreements, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, blindRegistry, reviewRegistry, disagreements, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { source } = buildAll();
  console.log(`build-counter-selector-wave-28: ${source.counts.identity_minimized_packets_reviewed} packets, ${source.counts.person_bounded_dimension_supports} person supports, ${source.counts.function_bounded_dimension_supports} function supports`);
}
