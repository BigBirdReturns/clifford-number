#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-26-observability-pivot.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-26-candidate-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-26-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-26/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-26/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-26.yml',
  SOURCE_PATH,
  'schemas/counter-selector-observability-pivot.schema.json',
  'docs/methods/counter-selector-observability-pivot.md',
  'docs/milestones/counter-selector-wave-26.md',
  'tools/build-counter-selector-wave-26.mjs',
  'tools/validate-counter-selector-wave-26.mjs',
  'test/counter-selector-wave-26.test.js'
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

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-26-candidate-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    status: source.status,
    pivot_trigger: source.pivot_trigger,
    counts: source.counts,
    packets: source.packets.map(packet => ({
      packet_id: packet.packet_id,
      public_label: packet.public_label,
      candidate_type: packet.candidate_type,
      identity_status: packet.identity_status,
      source_identity: packet.source_identity,
      domains: packet.domains,
      source_record_count: packet.source_records.length,
      observable_gate_surfaces: packet.observable_gate_surfaces,
      required_next_receipts: packet.required_next_receipts,
      blind_review_executed: false,
      dimension_supports_added: 0,
      field_test_eligible: false,
      graph_effect: 'none'
    })),
    review_plan: source.review_plan,
    boundaries: source.boundaries,
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
    schema_version: 'counter-selector-wave-26-release-manifest@1',
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
      exact_bytes_prove_operator_capacity: false,
      exact_bytes_prove_person_attribution: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_handoff: false,
      exact_bytes_prove_external_review: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(source, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-26-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    pivot_trigger: source.pivot_trigger,
    counts: source.counts,
    packets: source.packets,
    review_plan: source.review_plan,
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
  const rows = report.packets.map(packet => `<tr>
<td><code>${escapeHtml(packet.packet_id)}</code></td>
<td>${escapeHtml(packet.public_label)}</td>
<td>${escapeHtml(packet.candidate_type)}</td>
<td>${packet.source_records.length}</td>
<td>${escapeHtml(packet.required_next_receipts.join('; '))}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 26</title>
<style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W26-OP-01</strong></p>
<h1>Stop rewarding the least observable candidate surface.</h1>
<p class="state">FOUR GRAPH-INERT PACKETS · THIRTEEN PUBLIC SOURCE RECORDS · ZERO FINDINGS</p>
<div class="grid"><article class="card"><b>${report.counts.intake_packets}</b>intake packets</article>
<article class="card"><b>${report.counts.public_source_records}</b>source records</article>
<article class="card"><b>${report.counts.blind_reviews_executed}</b>blind reviews</article>
<article class="card"><b>${report.counts.complete_operator_findings}</b>complete operators</article></div>
<table><thead><tr><th>ID</th><th>Artifact surface</th><th>Unit</th><th>Sources</th><th>Next receipts</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>living person ≠ contact authority
project scale ≠ person surplus
public correction ≠ universal elasticity
governance plan ≠ completed handoff
collective system ≠ person operator
observability priority ≠ merit ranking</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const registry = deriveRegistry(source);
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, registry, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, registry, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { registry } = buildAll();
  console.log(`build-counter-selector-wave-26: ${registry.counts.intake_packets} packets, ${registry.counts.dimension_supports_added} supports`);
}
