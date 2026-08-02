#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-32-candidate-handoff-application.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-32-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-32-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-32/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-32/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-32.yml',
  SOURCE_PATH,
  'schemas/counter-selector-candidate-handoff-application.schema.json',
  'docs/methods/counter-selector-candidate-handoff-application.md',
  'docs/milestones/counter-selector-wave-32.md',
  'tools/build-counter-selector-wave-32.mjs',
  'tools/validate-counter-selector-wave-32.mjs',
  'test/counter-selector-wave-32.test.js'
];

export function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
export function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
export function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-32-handoff-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    candidate_lanes: source.candidate_lanes.map(lane => ({
      lane_id: lane.lane_id,
      candidate_id: lane.candidate_id,
      source_identity: lane.source_identity,
      recipient_acknowledgment_level: lane.recipient_acknowledgment_level,
      prior_person_supports: lane.prior_person_supports,
      current_person_supports: lane.current_person_supports,
      person_custody_support_added: lane.adjudication.person_custody_support_added,
      custody_scope: lane.adjudication.custody_scope,
      direct_state_handoff: lane.adjudication.direct_state_handoff,
      classification: lane.adjudication.classification,
      complete_operator_finding: false,
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
  const combined = sha256(Buffer.from(entries.map(entry => `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-32-release-manifest@1',
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
      exact_bytes_prove_custody_support: false,
      exact_bytes_prove_complete_handoff: false,
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
    schema_version: 'counter-selector-wave-32-report@1',
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
    review_independence: source.review_independence,
    candidate_lanes: source.candidate_lanes.map(lane => ({
      lane_id: lane.lane_id,
      candidate_id: lane.candidate_id,
      source_identity: lane.source_identity,
      public_label: lane.public_label,
      source_record_count: lane.source_records.length,
      components: lane.components,
      recipient_acknowledgment_level: lane.recipient_acknowledgment_level,
      review: lane.review,
      adjudication: lane.adjudication,
      prior_person_supports: lane.prior_person_supports,
      current_person_supports: lane.current_person_supports,
      counterevidence: lane.counterevidence,
      falsifiers: lane.falsifiers,
      contact_authorized: false,
      graph_effect: 'none'
    })),
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: { path: MANIFEST_PATH, combined_sha256: manifest.combined_sha256 }
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

export function renderHtml(report) {
  const rows = report.candidate_lanes.map(lane => `<tr><td>${escapeHtml(lane.source_identity)}</td><td>${escapeHtml(lane.recipient_acknowledgment_level)}</td><td>${escapeHtml(lane.adjudication.classification)}</td><td>${lane.adjudication.person_custody_support_added ? 'yes' : 'no'}</td><td>${escapeHtml(lane.adjudication.direct_state_handoff)}</td></tr>`).join('');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 32</title><style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.3rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>\n<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W32-CH-01</strong></p><h1>Recognize bounded stewardship without inventing a package.</h1><p class="state">ONE BOUNDED PERSON CUSTODY ADDITION · ZERO COMPLETE HANDOFFS · ZERO OPERATORS</p><div class="grid"><article class="card"><b>${report.counts.candidate_lanes_audited}</b>candidate lanes</article><article class="card"><b>${report.counts.person_custody_supports_added}</b>custody support added</article><article class="card"><b>${report.counts.recipient_acknowledged_state_packages}</b>package receipts</article><article class="card"><b>${report.counts.complete_direct_handoffs}</b>complete handoffs</article></div><table><thead><tr><th>Candidate</th><th>Recipient level</th><th>Classification</th><th>Custody added</th><th>Direct handoff</th></tr></thead><tbody>${rows}</tbody></table><div class="boundary"><strong>Authority ceiling</strong><pre>incoming stewardship ≠ complete outgoing handoff\nrecipient account ≠ external review\nsuccessor releases ≠ package receipt\ncollective continuation ≠ founder handoff\nbounded custody ≠ complete operator</pre></div></body></html>\n`;
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
  console.log(`build-counter-selector-wave-32: ${source.counts.candidate_lanes_audited} lanes, ${source.counts.person_custody_supports_added} custody support added`);
}
