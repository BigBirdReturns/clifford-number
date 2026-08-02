#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-29-resumability-audit.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-29-resumability-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-29-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-29-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-29/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-29/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-29.yml',
  SOURCE_PATH,
  'schemas/counter-selector-resumability-audit.schema.json',
  'docs/methods/counter-selector-public-resumability-audit.md',
  'docs/milestones/counter-selector-wave-29.md',
  'tools/build-counter-selector-wave-29.mjs',
  'tools/validate-counter-selector-wave-29.mjs',
  'test/counter-selector-wave-29.test.js'
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
    schema_version: 'counter-selector-wave-29-resumability-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    lanes: source.lanes.map(lane => ({
      lane_id: lane.lane_id,
      source_packet_id: lane.source_packet_id,
      subject_type: lane.subject_type,
      source_identity: lane.source_identity,
      public_label: lane.public_label,
      source_record_count: lane.source_records.length,
      tested_claims: lane.tested_claims,
      person_supports_added: lane.dimension_effects.person_supports_added,
      function_refinements: lane.dimension_effects.function_refinements,
      person_custody_added: lane.dimension_effects.person_custody_added,
      disposition: lane.disposition,
      next_receipts: lane.next_receipts,
      complete_operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none'
    })),
    boundaries: source.boundaries,
    graph_effect: 'none'
  };
}

export function deriveDisagreementLedger(source) {
  return {
    schema_version: 'counter-selector-wave-29-disagreement-ledger@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    disagreements: source.disagreements,
    counts: {
      disagreements_preserved: source.disagreements.length,
      disagreements_averaged: source.disagreements.filter(item => item.averaged).length
    },
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
    schema_version: 'counter-selector-wave-29-release-manifest@1',
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
      exact_bytes_prove_independent_resumability: false,
      exact_bytes_prove_direct_handoff: false,
      exact_bytes_prove_person_custody: false,
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

export function deriveReport(source, registry, disagreements, manifest) {
  return {
    schema_version: 'counter-selector-wave-29-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    audit_contract: source.audit_contract,
    lane_results: registry.lanes,
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
  const rows = report.lane_results.map(lane => `<tr>
<td><code>${escapeHtml(lane.lane_id)}</code></td>
<td>${escapeHtml(lane.public_label)}</td>
<td>${escapeHtml(lane.tested_claims.independent_resumability)}</td>
<td>${escapeHtml(lane.tested_claims.direct_handoff)}</td>
<td>${escapeHtml(lane.function_refinements.join('; '))}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 29</title>
<style>:root{font-family:system-ui,sans-serif;background:#f2efe8;color:#171613}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W29-RA-01</strong></p>
<h1>Reproducible is not resumable.</h1>
<p class="state">FOUR LANES STRESSED · ZERO DIRECT HANDOFFS · ZERO PERSON SUPPORTS ADDED</p>
<div class="grid"><article class="card"><b>${report.counts.lanes_audited}</b>lanes audited</article>
<article class="card"><b>${report.counts.public_source_records}</b>source records</article>
<article class="card"><b>${report.counts.founder_independent_collective_continuation_surfaces}</b>collective continuation</article>
<article class="card"><b>${report.counts.independently_resumable_project_findings}</b>resumable projects</article></div>
<table><thead><tr><th>Lane</th><th>Surface</th><th>Resumability</th><th>Direct handoff</th><th>Retained refinement</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>public source ≠ independent resumability
reproducible release ≠ authority transfer
founder-independent continuation ≠ direct founder handoff
open code ≠ complete service state
function custody ≠ person custody</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const registry = deriveRegistry(source);
  const disagreements = deriveDisagreementLedger(source);
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  fs.writeFileSync(path.join(ROOT, DISAGREEMENT_PATH), stableJson(disagreements));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, registry, disagreements, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, registry, disagreements, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { registry } = buildAll();
  console.log(`build-counter-selector-wave-29: ${registry.counts.lanes_audited} lanes, ${registry.counts.person_dimension_supports_added} person supports added`);
}
