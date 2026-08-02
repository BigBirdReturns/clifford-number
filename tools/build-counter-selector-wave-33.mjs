#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-33-package-truth-table.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-33-package-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-33-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-33/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-33/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-33.yml',
  SOURCE_PATH,
  'schemas/counter-selector-package-truth-table.schema.json',
  'docs/methods/counter-selector-handoff-package-truth-table.md',
  'docs/milestones/counter-selector-wave-33.md',
  'tools/build-counter-selector-wave-33.mjs',
  'tools/validate-counter-selector-wave-33.mjs',
  'test/counter-selector-wave-33.test.js'
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
    schema_version: 'counter-selector-wave-33-package-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      claim_type: control.claim_type,
      outgoing_unit: control.outgoing_unit,
      incoming_unit: control.incoming_unit,
      named_recipients: control.named_recipients,
      source_record_count: control.source_records.length,
      package_state: control.adjudication.package_state,
      recipient_state: control.adjudication.recipient_state,
      direct_handoff: control.adjudication.direct_handoff,
      classification: control.adjudication.classification,
      operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none'
    })),
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
    schema_version: 'counter-selector-wave-33-release-manifest@1',
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
      exact_bytes_prove_package_completeness: false,
      exact_bytes_prove_recipient_acknowledgment: false,
      exact_bytes_prove_complete_handoff: false,
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
    schema_version: 'counter-selector-wave-33-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    package_contract: source.package_contract,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      claim_type: control.claim_type,
      outgoing_unit: control.outgoing_unit,
      incoming_unit: control.incoming_unit,
      named_recipients: control.named_recipients,
      source_record_count: control.source_records.length,
      components: control.components,
      adjudication: control.adjudication,
      counterevidence: control.counterevidence,
      operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none'
    })),
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
  const rows = report.controls.map(control => `<tr>
<td><code>${escapeHtml(control.control_id)}</code></td>
<td>${escapeHtml(control.public_label)}</td>
<td>${escapeHtml(control.claim_type)}</td>
<td>${escapeHtml(control.adjudication.package_state)}</td>
<td>${escapeHtml(control.adjudication.recipient_state)}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 33</title>
<style>:root{font-family:system-ui,sans-serif;background:#f3f0e9;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W33-PT-01</strong></p>
<h1>A handover-shaped surface is not a state package.</h1>
<p class="state">FOUR CONTROLS · ZERO COMPLETE PACKAGES · ZERO OPERATORS</p>
<div class="grid"><article class="card"><b>${report.counts.controls_audited}</b>controls</article>
<article class="card"><b>${report.counts.package_specifications}</b>package specifications</article>
<article class="card"><b>${report.counts.source_restricted_package_surfaces}</b>restricted surfaces</article>
<article class="card"><b>${report.counts.complete_direct_handoffs}</b>complete handoffs</article></div>
<table><thead><tr><th>ID</th><th>Surface</th><th>Claim type</th><th>Package state</th><th>Recipient state</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>handover label ≠ state package
checklist template ≠ observed transition
named recipient ≠ package acknowledgment
source restriction ≠ negative capability evidence
successor epic ≠ complete successor operation</pre></div>
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
  console.log(`build-counter-selector-wave-33: ${source.counts.controls_audited} controls, ${source.counts.complete_direct_handoffs} complete handoffs`);
}
