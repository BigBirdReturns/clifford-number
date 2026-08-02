#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-31-recipient-handoff-controls.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-31-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-31-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-31/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-31/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-31.yml',
  SOURCE_PATH,
  'schemas/counter-selector-recipient-handoff-controls.schema.json',
  'docs/methods/counter-selector-recipient-acknowledgment.md',
  'docs/milestones/counter-selector-wave-31.md',
  'tools/build-counter-selector-wave-31.mjs',
  'tools/validate-counter-selector-wave-31.mjs',
  'test/counter-selector-wave-31.test.js'
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
    schema_version: 'counter-selector-wave-31-handoff-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      transition_type: control.transition_type,
      outgoing_entity: control.outgoing_entity,
      incoming_entities: control.incoming_entities,
      authorizing_body: control.authorizing_body,
      source_record_count: control.source_records.length,
      components: control.components,
      recipient_acknowledgment_level: control.recipient_acknowledgment_level,
      adjudication: control.adjudication,
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
    schema_version: 'counter-selector-wave-31-release-manifest@1',
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
      exact_bytes_prove_recipient_package_acknowledgment: false,
      exact_bytes_prove_complete_handoff: false,
      exact_bytes_prove_person_custody: false,
      exact_bytes_prove_dimension_support: false,
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

export function deriveReport(source, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-31-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_id: source.parent_wave_id,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    handoff_contract: source.handoff_contract,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      transition_type: control.transition_type,
      outgoing_entity: control.outgoing_entity,
      incoming_entities: control.incoming_entities,
      authorizing_body: control.authorizing_body,
      source_record_count: control.source_records.length,
      components: control.components,
      recipient_acknowledgment_level: control.recipient_acknowledgment_level,
      adjudication: control.adjudication,
      counterevidence: control.counterevidence,
      falsifiers: control.falsifiers,
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
<td>${escapeHtml(control.recipient_acknowledgment_level)}</td>
<td>${escapeHtml(control.adjudication.classification)}</td>
<td>${escapeHtml(control.components.successor_action)}</td>
</tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 31</title>
<style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W31-RH-01</strong></p>
<h1>Acknowledge the package, not merely the meeting.</h1>
<p class="state">TWO RECIPIENT HANDOVER ACKNOWLEDGMENTS · ONE AUTHORITY-BEFORE-ACCESS CONTROL · ZERO COMPLETE PACKAGES</p>
<div class="grid"><article class="card"><b>${report.counts.handoff_controls_audited}</b>handoff controls</article>
<article class="card"><b>${report.counts.recipient_handover_acknowledgment_events}</b>recipient acknowledgments</article>
<article class="card"><b>${report.counts.authority_before_access_controls}</b>timing-gap control</article>
<article class="card"><b>${report.counts.complete_direct_handoffs}</b>complete handoffs</article></div>
<table><thead><tr><th>ID</th><th>Transition</th><th>Acknowledgment</th><th>Classification</th><th>Successor action</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>handover meeting ≠ complete state package
recipient says smooth ≠ complete custody
formal delegation ≠ operational access
listed open items ≠ complete decision inventory
eventual operation ≠ timely handoff
positive control ≠ candidate promotion</pre></div>
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
  const { source } = buildAll();
  console.log(`build-counter-selector-wave-31: ${source.counts.handoff_controls_audited} controls, ${source.counts.recipient_handover_acknowledgment_events} recipient acknowledgments, ${source.counts.complete_direct_handoffs} complete handoffs`);
}
