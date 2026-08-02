#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-27-batch-a-blind-review.json';
const BLIND_PATH = 'data/project/counter-selector-wave-27-blind-packet-registry.json';
const REVIEW_PATH = 'data/project/counter-selector-wave-27-review-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-27-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-27-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-27/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-27/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-27.yml',
  SOURCE_PATH,
  'schemas/counter-selector-observability-blind-review.schema.json',
  'docs/methods/counter-selector-observability-blind-review.md',
  'docs/milestones/counter-selector-wave-27.md',
  'tools/build-counter-selector-wave-27.mjs',
  'tools/validate-counter-selector-wave-27.mjs',
  'test/counter-selector-wave-27.test.js'
];

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function deriveBlindRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-27-blind-packet-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
    as_of: source.as_of,
    status: 'two_identity_label_removed_packets_reviewed_identity_blindness_not_claimed',
    review_input_contract: source.review_input_contract,
    independence: source.review_independence,
    counts: {
      identity_minimized_packets_created: source.counts.identity_minimized_packets_created,
      identity_minimized_packets_reviewed: source.counts.identity_minimized_packets_reviewed,
      source_routes_exposed_in_packets: 0,
      identity_labels_exposed_in_packets: 0
    },
    packets: source.packets.map(packet => ({
      ...packet.blind_packet,
      input_digest: sha256(Buffer.from(stableJson(packet.blind_packet), 'utf8')),
      identity_labels_removed: true,
      identity_blindness_claimed: false,
      artifact_inferability: source.review_independence.artifact_inferability,
      source_routes_exposed: false,
      candidate_mapping_exposed: false,
      graph_effect: 'none'
    })),
    boundaries: {
      identity_label_removed_is_identity_blind: false,
      inferable_artifact_is_blind: false,
      blind_packet_is_external_review: false,
      packet_authorizes_contact: false,
      packet_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReviewRegistry(source, blindRegistry) {
  const digestByPacket = new Map(blindRegistry.packets.map(packet => [packet.packet_id, packet.input_digest]));
  return {
    schema_version: 'counter-selector-wave-27-review-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    review_independence: source.review_independence,
    packet_results: source.packets.map(packet => ({
      source_packet_id: packet.source_packet_id,
      review_packet_id: packet.review_packet_id,
      blind_token: packet.blind_token,
      source_identity: packet.source_identity,
      public_label: packet.public_label,
      candidate_type: packet.candidate_type,
      review_input_digest: digestByPacket.get(packet.review_packet_id),
      support_ledger: packet.support_ledger,
      review_passes: packet.review_passes.map(pass => ({
        ...pass,
        input_digest: digestByPacket.get(packet.review_packet_id),
        separation: 'fresh_context_identity_label_removed_packet_only',
        independence_class: 'procedural_same_system_not_external',
        operator_finding: false,
        field_test_authorized: false,
        promotion_generated: false,
        person_ranking_generated: false,
        public_identity_profile_generated: false,
        contact_authorized: false,
        graph_effect: 'none'
      })),
      dimension_vector: packet.dimension_vector,
      person_bounded_supports: packet.person_bounded_supports,
      function_bounded_supports: packet.function_bounded_supports,
      synthesis: packet.synthesis,
      disposition: packet.disposition,
      field_test_eligible: packet.field_test_eligible,
      operator_finding: packet.operator_finding,
      contact_authorized: packet.contact_authorized,
      graph_effect: packet.graph_effect
    })),
    boundaries: source.boundaries,
    next_action: source.next_action,
    graph_effect: 'none'
  };
}

export function deriveDisagreementLedger(source) {
  return {
    schema_version: 'counter-selector-wave-27-disagreement-ledger@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    status: 'two_review_disagreements_localized_not_averaged',
    counts: {
      disagreements_preserved: source.counts.disagreements_preserved,
      averaged_disagreements: source.disagreements.filter(item => item.averaged).length,
      person_function_attribution_disagreements: source.disagreements.filter(item => item.topic.includes('person_versus_collective')).length,
      custody_scope_disagreements: source.disagreements.filter(item => item.topic.includes('custody')).length
    },
    disagreements: source.disagreements,
    boundaries: {
      disagreement_is_confidence_average: false,
      provisional_support_is_final_support: false,
      publication_object_is_independent_handoff: false,
      collective_action_is_person_causality: false,
      graph_effect: 'none'
    }
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
    schema_version: 'counter-selector-wave-27-release-manifest@1',
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

export function deriveReport(source, blindRegistry, reviewRegistry, disagreementLedger, manifest) {
  return {
    schema_version: 'counter-selector-wave-27-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
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
    packet_results: reviewRegistry.packet_results.map(result => ({
      source_packet_id: result.source_packet_id,
      review_packet_id: result.review_packet_id,
      source_identity: result.source_identity,
      public_label: result.public_label,
      person_bounded_supports: result.person_bounded_supports,
      function_bounded_supports: result.function_bounded_supports,
      dimension_vector: result.dimension_vector,
      support_ledger_state: result.support_ledger.state,
      valid_resource_normalized_comparator: result.support_ledger.valid_resource_normalized_comparator,
      synthesis: result.synthesis,
      disposition: result.disposition,
      field_test_eligible: result.field_test_eligible,
      operator_finding: result.operator_finding,
      contact_authorized: result.contact_authorized,
      graph_effect: result.graph_effect
    })),
    disagreements: disagreementLedger.disagreements,
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
  const rows = report.packet_results.map(result => `<tr>
<td><code>${escapeHtml(result.review_packet_id)}</code></td>
<td>${escapeHtml(result.source_identity)}</td>
<td>${escapeHtml(result.person_bounded_supports.join(', ') || 'none')}</td>
<td>${escapeHtml(result.function_bounded_supports.join(', ') || 'none')}</td>
<td>${escapeHtml(result.support_ledger_state)}</td>
<td>${escapeHtml(result.disposition)}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 27</title>
<style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W27-BA-01</strong></p>
<h1>Observable correction is not yet a complete operator.</h1>
<p class="state">TWO IDENTITY-LABEL-REMOVED PACKETS · FIVE PERSON SUPPORTS · ONE FUNCTION SUPPORT · ZERO OPERATORS</p>
<div class="grid"><article class="card"><b>${report.counts.identity_minimized_packets_reviewed}</b>packets reviewed</article>
<article class="card"><b>${report.counts.person_bounded_dimension_supports}</b>person supports</article>
<article class="card"><b>${report.counts.function_bounded_dimension_supports}</b>function supports</article>
<article class="card"><b>${report.counts.complete_operator_findings}</b>complete operators</article></div>
<table><thead><tr><th>Packet</th><th>Source lane</th><th>Person support</th><th>Function support</th><th>Support ledger</th><th>Disposition</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>identity label removed ≠ identity blind
team reversal ≠ sole-person exception handling
public repair object ≠ independent handoff
external research and AI assistance ≠ person surplus
related software breadth ≠ cross-domain transfer
internal two-pass review ≠ external review
living person ≠ contact authority</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const blindRegistry = deriveBlindRegistry(source);
  fs.writeFileSync(path.join(ROOT, BLIND_PATH), stableJson(blindRegistry));
  const reviewRegistry = deriveReviewRegistry(source, blindRegistry);
  fs.writeFileSync(path.join(ROOT, REVIEW_PATH), stableJson(reviewRegistry));
  const disagreementLedger = deriveDisagreementLedger(source);
  fs.writeFileSync(path.join(ROOT, DISAGREEMENT_PATH), stableJson(disagreementLedger));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, blindRegistry, reviewRegistry, disagreementLedger, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, blindRegistry, reviewRegistry, disagreementLedger, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { reviewRegistry } = buildAll();
  console.log(`build-counter-selector-wave-27: ${reviewRegistry.counts.identity_minimized_packets_reviewed} packets, ${reviewRegistry.counts.person_bounded_dimension_supports} person supports, ${reviewRegistry.counts.function_bounded_dimension_supports} function support`);
}
