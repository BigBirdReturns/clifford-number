#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-38-portable-operational-checkpoint.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-38-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-38-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-38/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-38/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-38.yml',
  SOURCE_PATH,
  'schemas/counter-selector-portable-operational-checkpoint.schema.json',
  'docs/methods/counter-selector-portable-operational-checkpoint.md',
  'docs/milestones/counter-selector-wave-38.md',
  'tools/build-counter-selector-wave-38.mjs',
  'tools/validate-counter-selector-wave-38.mjs',
  'test/counter-selector-wave-38.test.js'
];

export function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
export function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
export function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-38-control-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      system_or_subject: control.system_or_subject,
      source_record_count: control.source_records.length,
      content_addressed_portable_package: control.adjudication.content_addressed_portable_package,
      package_level_manifest_binding: control.adjudication.package_level_manifest_binding,
      itemized_operational_inventory: control.adjudication.itemized_operational_inventory,
      package_inventory_recipient_acknowledgment: control.adjudication.package_inventory_recipient_acknowledgment,
      same_object_successor_operation: control.adjudication.same_object_successor_operation,
      application_specific_continuation: control.adjudication.application_specific_continuation,
      hidden_predecessor_state_free: control.adjudication.hidden_predecessor_state_free,
      external_independent_review: control.adjudication.external_independent_review,
      complete_portable_operational_handoff: control.adjudication.complete_portable_operational_handoff,
      person_support_added: false,
      classification: control.adjudication.classification,
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
  const combined = sha256(Buffer.from(entries.map(entry => `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-38-release-manifest@1',
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
      exact_bytes_prove_itemized_internal_inventory: false,
      exact_bytes_prove_recipient_inventory_acknowledgment: false,
      exact_bytes_prove_hidden_predecessor_state_absence: false,
      exact_bytes_prove_complete_portable_operational_handoff: false,
      exact_bytes_prove_external_independent_review: false,
      exact_bytes_prove_person_support: false,
      exact_bytes_prove_complete_operator: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_promotion: false,
      manifest_authorizes_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(source, manifest) {
  return {
    schema_version: 'counter-selector-wave-38-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    handoff_contract: source.handoff_contract,
    controls: source.controls,
    join_matrix: source.join_matrix,
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: { path: MANIFEST_PATH, combined_sha256: manifest.combined_sha256 },
    graph_effect: 'none'
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

export function renderHtml(report) {
  const rows = report.controls.map(control => `<tr><td><code>${escapeHtml(control.control_id)}</code></td><td>${escapeHtml(control.system_or_subject)}</td><td>${escapeHtml(control.adjudication.classification)}</td><td>${control.adjudication.content_addressed_portable_package ? 'yes' : 'no'}</td><td>${control.adjudication.same_object_successor_operation ? 'yes' : 'no'}</td><td>${control.adjudication.package_inventory_recipient_acknowledgment ? 'yes' : 'no'}</td><td>${control.adjudication.complete_portable_operational_handoff ? 'yes' : 'no'}</td><td>no</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 38</title>
<style>:root{font-family:system-ui,sans-serif;background:#f3f0e9;color:#191816}body{max-width:1260px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.2rem,6vw,4.8rem);line-height:.96;letter-spacing:-.04em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.84rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W38-PO-01</strong></p>
<h1>The package reached operation. The inventory did not.</h1>
<p class="state">ONE CONTENT-ADDRESSED PACKAGE→OPERATION JOIN · ZERO INVENTORY ACKNOWLEDGMENTS · ZERO COMPLETE PORTABLE OPERATIONAL HANDOFFS · ZERO PERSON FINDINGS</p>
<div class="grid"><article class="card"><b>${report.counts.content_addressed_package_successor_operation_joins}</b>content-addressed join</article><article class="card"><b>${report.counts.same_object_successor_operation_surfaces}</b>successor-operation surfaces</article><article class="card"><b>${report.counts.package_inventory_recipient_acknowledgments}</b>inventory acknowledgments</article><article class="card"><b>${report.counts.complete_portable_operational_handoffs}</b>complete portable handoffs</article></div>
<table><thead><tr><th>ID</th><th>System</th><th>Classification</th><th>Content-addressed package</th><th>Successor operation</th><th>Inventory receipt</th><th>Complete portable handoff</th><th>Person support</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Scope ceiling</strong><pre>OCI layer digest ≠ itemized checkpoint inventory
restore acceptance ≠ recipient inventory receipt
source removal ≠ hidden predecessor state absent
cross-root tar continuation ≠ OCI-image continuation
E2B live handoff + Podman package + Cargo proof ≠ one complete handoff
system control ≠ person support</pre></div>
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
  console.log(`build-counter-selector-wave-38: ${source.counts.content_addressed_package_successor_operation_joins} content-addressed package-operation join, ${source.counts.complete_portable_operational_handoffs} complete portable handoffs`);
}
