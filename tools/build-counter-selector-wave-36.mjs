#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-36-portable-proof-closure.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-36-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-36-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-36/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-36/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-36.yml',
  SOURCE_PATH,
  'schemas/counter-selector-portable-proof-closure.schema.json',
  'docs/methods/counter-selector-portable-proof-closure.md',
  'docs/milestones/counter-selector-wave-36.md',
  'tools/build-counter-selector-wave-36.mjs',
  'tools/validate-counter-selector-wave-36.mjs',
  'test/counter-selector-wave-36.test.js'
];

export function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
export function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
export function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-36-control-registry@1',
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
      complete_portable_proof_chain: control.adjudication.complete_portable_proof_chain,
      package_inventory_recipient_acknowledgment: control.adjudication.package_inventory_recipient_acknowledgment,
      same_package_independent_recalculation: control.adjudication.same_package_independent_recalculation,
      field_successor_operation: control.adjudication.field_successor_operation,
      complete_operational_handoff: false,
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
    schema_version: 'counter-selector-wave-36-release-manifest@1',
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
      exact_bytes_prove_complete_proof: false,
      exact_bytes_prove_complete_operational_handoff: false,
      exact_bytes_prove_package_safety: false,
      exact_bytes_prove_recipient_inventory_receipt: false,
      exact_bytes_prove_successor_operation: false,
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
    schema_version: 'counter-selector-wave-36-report@1',
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
    release_manifest: { path: MANIFEST_PATH, combined_sha256: manifest.combined_sha256 },
    graph_effect: 'none'
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

export function renderHtml(report) {
  const rows = report.controls.map(control => `<tr><td><code>${escapeHtml(control.control_id)}</code></td><td>${escapeHtml(control.system_or_subject)}</td><td>${escapeHtml(control.adjudication.classification)}</td><td>${control.adjudication.complete_portable_proof_chain ? 'yes' : 'no'}</td><td>${control.adjudication.field_successor_operation ? 'yes' : 'no'}</td><td>no</td></tr>`).join('');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 36</title>\n<style>:root{font-family:system-ui,sans-serif;background:#f3f0e9;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.2rem,6vw,4.8rem);line-height:.96;letter-spacing:-.04em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>\n<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W36-PC-01</strong></p>\n<h1>Proof complete is not operation complete.</h1>\n<p class="state">ONE COMPLETE SAME-PACKAGE PROOF CHAIN · ZERO COMPLETE OPERATIONAL HANDOFFS</p>\n<div class="grid"><article class="card"><b>${report.counts.complete_same_package_proof_chains}</b>complete proof chain</article><article class="card"><b>${report.counts.field_successor_operation_surfaces}</b>field operation surface</article><article class="card"><b>${report.counts.known_package_safety_defects}</b>ARSAS findings</article><article class="card"><b>${report.counts.complete_operational_handoffs}</b>complete handoffs</article></div>\n<table><thead><tr><th>ID</th><th>System</th><th>Classification</th><th>Proof chain</th><th>Field operation</th><th>Operational handoff</th></tr></thead><tbody>${rows}</tbody></table>\n<div class="boundary"><strong>Non-combinability ceiling</strong><pre>Cargo complete proof + ARSAS package execution + BasketForm field use ≠ one handoff\nproof complete ≠ operation complete\nincoming signature ≠ package inventory receipt\nsame-system recalculation ≠ external review</pre></div>\n</body></html>\n`;
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
  console.log(`build-counter-selector-wave-36: ${source.counts.complete_same_package_proof_chains} complete proof chain, ${source.counts.complete_operational_handoffs} complete operational handoffs`);
}
