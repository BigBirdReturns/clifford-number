#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-35-real-world-handoff-join.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-35-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-35-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-35/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-35/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-35.yml',
  SOURCE_PATH,
  'schemas/counter-selector-real-world-handoff-join.schema.json',
  'docs/methods/counter-selector-real-world-handoff-join.md',
  'docs/milestones/counter-selector-wave-35.md',
  'tools/build-counter-selector-wave-35.mjs',
  'tools/validate-counter-selector-wave-35.mjs',
  'test/counter-selector-wave-35.test.js'
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
    schema_version: 'counter-selector-wave-35-control-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      control_type: control.control_type,
      system_or_subject: control.system_or_subject,
      source_record_count: control.source_records.length,
      classification: control.adjudication.classification,
      bounded_executable_round_trip: control.adjudication.bounded_executable_round_trip,
      package_level_recipient_acknowledgment: control.adjudication.package_level_recipient_acknowledgment,
      field_successor_operation: control.adjudication.field_successor_operation,
      complete_bounded_executable_handoff: false,
      person_support_added: false,
      operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none'
    })),
    join_matrix: source.join_matrix,
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
    schema_version: 'counter-selector-wave-35-release-manifest@1',
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
      exact_bytes_prove_complete_handoff: false,
      exact_bytes_prove_package_safety: false,
      exact_bytes_prove_recipient_acknowledgment: false,
      exact_bytes_prove_person_support: false,
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

export function deriveReport(source, manifest) {
  return {
    schema_version: 'counter-selector-wave-35-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    join_contract: source.join_contract,
    controls: source.controls,
    join_matrix: source.join_matrix,
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: {
      path: MANIFEST_PATH,
      combined_sha256: manifest.combined_sha256
    },
    graph_effect: 'none'
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
  const rows = report.controls.map(control => `<tr>
<td><code>${escapeHtml(control.control_id)}</code></td>
<td>${escapeHtml(control.system_or_subject)}</td>
<td>${escapeHtml(control.adjudication.package_integrity)}</td>
<td>${escapeHtml(control.adjudication.package_level_recipient_acknowledgment)}</td>
<td>${escapeHtml(control.adjudication.field_successor_operation)}</td>
<td>${escapeHtml(control.adjudication.classification)}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 35</title>
<style>:root{font-family:system-ui,sans-serif;background:#f1eee7;color:#191714}body{max-width:1240px;margin:auto;padding:42px 24px;line-height:1.5}h1{font-size:clamp(2.5rem,6vw,5.5rem);line-height:.94;letter-spacing:-.05em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c7bdac;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.85rem}th,td{padding:11px;border-bottom:1px solid #ded5c7;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}pre{white-space:pre-wrap}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W35-RJ-01</strong></p>
<h1>Real proof fragments do not become one handoff by proximity.</h1>
<p class="state">THREE REAL CONTROLS · ZERO COMPLETE JOINS · ZERO PERSON FINDINGS</p>
<div class="grid"><article class="card"><b>${report.counts.controls_audited}</b>controls</article>
<article class="card"><b>${report.counts.bounded_executable_round_trip_surfaces}</b>package round-trip</article>
<article class="card"><b>${report.counts.cryptographic_two_party_acceptance_surfaces}</b>two-party binding</article>
<article class="card"><b>${report.counts.observed_independent_recipient_operations}</b>recipient operation</article>
<article class="card"><b>${report.counts.complete_bounded_executable_handoff_packages}</b>complete joins</article></div>
<table><thead><tr><th>ID</th><th>Control</th><th>Integrity</th><th>Package receipt</th><th>Successor operation</th><th>Classification</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Non-combinability boundary</strong><pre>ARSAS executable package
+ Cargo OS two-party signature
+ BasketForm customer operation
≠ one complete handoff

Every component must bind the same package, recipient, transition, authority state, and resulting operation.</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const registry = deriveRegistry(source);
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, registry, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { source } = buildAll();
  console.log(`build-counter-selector-wave-35: ${source.counts.controls_audited} controls, ${source.counts.complete_bounded_executable_handoff_packages} complete joins`);
}
