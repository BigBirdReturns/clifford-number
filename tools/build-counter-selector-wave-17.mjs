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
  '.github/workflows/counter-selector-wave-17.yml',
  'data/project/counter-selector-wave-17-function-attribution.json',
  'schemas/counter-selector-function-attribution-fanout.schema.json',
  'docs/methods/counter-selector-function-attribution-fanout.md',
  'docs/milestones/counter-selector-wave-17.md',
  'tools/build-counter-selector-wave-17.mjs',
  'tools/validate-counter-selector-wave-17.mjs',
  'test/counter-selector-wave-17.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-17-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W17-FA-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_person_attribution: false,
      manifest_proves_external_review: false,
      manifest_proves_complete_operator: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveAttributionRegistry(contract) {
  return {
    schema_version: 'counter-selector-function-attribution-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    function_packets: structuredClone(contract.function_packets),
    person_traces: structuredClone(contract.person_traces),
    identity_blocks: structuredClone(contract.identity_blocks),
    sources: structuredClone(contract.sources),
    acquisition_lanes: structuredClone(contract.acquisition_lanes),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReviewRegistry(contract) {
  return {
    schema_version: 'counter-selector-external-review-packet-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'six_artifact_only_packets_prepared_zero_external_reviews',
    publication_status: contract.publication_status,
    counts: {
      packets_prepared: contract.external_review_packets.length,
      review_requests_sent: contract.counts.external_review_requests_sent,
      external_reviews_executed: contract.counts.external_selector_reviews_executed,
      contacts_authorized: contract.counts.contacts_authorized,
      field_test_eligible_candidates: contract.counts.field_test_eligible_candidates,
      graph_effects: contract.counts.graph_effects
    },
    packets: structuredClone(contract.external_review_packets),
    boundaries: {
      packet_preparation_is_external_review: false,
      packet_preparation_authorizes_contact: false,
      packet_preparation_authorizes_field_test: false,
      packet_preparation_authorizes_public_identity_profile: false,
      packet_preparation_authorizes_person_ranking: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(contract, attribution, review, manifest) {
  return {
    schema_version: 'counter-selector-wave-17-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    person_traces: attribution.person_traces.map((row) => ({
      trace_id: row.trace_id,
      parent_packet_id: row.parent_packet_id,
      source_identity: row.source_identity,
      artifact_scope: row.artifact_scope,
      supported_dimensions: row.supported_dimensions,
      unresolved_dimensions: row.unresolved_dimensions,
      external_review_ready: row.external_review_ready,
      complete_operator_finding: row.complete_operator_finding,
      field_test_eligible: row.field_test_eligible,
      graph_effect: row.graph_effect
    })),
    identity_blocks: attribution.identity_blocks.map((row) => ({
      identity_block_id: row.identity_block_id,
      packet_id: row.packet_id,
      blocked_identity_label: row.blocked_identity_label,
      blocking_reason: row.blocking_reason,
      named_person_inferred: row.named_person_inferred,
      person_support_assigned: row.person_support_assigned,
      graph_effect: row.graph_effect
    })),
    external_review: {
      packets_prepared: review.counts.packets_prepared,
      review_requests_sent: review.counts.review_requests_sent,
      reviews_executed: review.counts.external_reviews_executed,
      packet_ids: review.packets.map((row) => row.review_packet_id)
    },
    open_acquisition_lanes: attribution.acquisition_lanes.map((row) => ({
      lane_id: row.lane_id,
      subject: row.subject,
      required_objects: row.required_objects,
      contact_authorized: row.contact_authorized,
      graph_effect: row.graph_effect
    })),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-17-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const personRows = report.person_traces.map((row) =>
    `<tr><td>${esc(row.source_identity)}</td><td><code>${esc(row.parent_packet_id)}</code></td>` +
    `<td>${row.supported_dimensions.map(esc).join(', ')}</td>` +
    `<td>${row.unresolved_dimensions.map(esc).join(', ')}</td>` +
    `<td>${row.external_review_ready}</td></tr>`
  ).join('');
  const blockRows = report.identity_blocks.map((row) =>
    `<tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.blocked_identity_label)}</td>` +
    `<td>${esc(row.blocking_reason)}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Counter-Selector Wave 17 fan-out</title>` +
    `<style>:root{color-scheme:light;background:#f1eee7;color:#171714;font-family:system-ui,sans-serif}` +
    `body{max-width:1280px;margin:auto;padding:42px 24px;line-height:1.55}` +
    `h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}` +
    `.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}` +
    `.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}` +
    `.card{padding:16px}.card b{display:block;font-size:2.2rem}` +
    `table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}` +
    `th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}` +
    `.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}` +
    `code{overflow-wrap:anywhere}</style></head><body>` +
    `<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>` +
    `<h1>Four attributed traces. Six review packets. Zero external reviews.</h1>` +
    `<p class="state">FUNCTION FAN-OUT · IDENTITY BLOCKS PRESERVED · NO RANK · NO FIELD TEST</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.function_level_packets_audited}</b>function packets audited</article>` +
    `<article class="card"><b>${report.counts.public_record_person_attributions}</b>public-record person traces</article>` +
    `<article class="card"><b>${report.counts.external_review_packets_prepared}</b>review packets prepared</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews executed</article></div>` +
    `<h2>Person-attributable traces</h2><table><thead><tr><th>Identity</th><th>Parent packet</th>` +
    `<th>Bounded support</th><th>Unresolved</th><th>Review ready</th></tr></thead><tbody>${personRows}</tbody></table>` +
    `<h2>Identity blocks</h2><table><thead><tr><th>Packet</th><th>Blocked unit</th><th>Why blocked</th></tr></thead>` +
    `<tbody>${blockRows}</tbody></table>` +
    `<div class="boundary">function split ≠ new denominator object\nperson attribution ≠ new aggregate support\n` +
    `authored warning ≠ safe handoff\nofficeholder custody ≠ sole authorship\n` +
    `prepared review packet ≠ external review\nsupported-dimension count ≠ rank</div>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave17() {
  const contract = read('data/project/counter-selector-wave-17-function-attribution.json');
  const attribution = deriveAttributionRegistry(contract);
  const review = deriveReviewRegistry(contract);
  writeJson('data/project/counter-selector-function-attribution-registry.json', attribution);
  writeJson('data/project/counter-selector-external-review-packet-registry.json', review);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-17-release-manifest.json', manifest);
  const report = deriveReport(contract, attribution, review, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-17/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-17/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-17: ${attribution.person_traces.length} person traces, ${review.packets.length} review packets, ${review.counts.external_reviews_executed} external reviews`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave17();
