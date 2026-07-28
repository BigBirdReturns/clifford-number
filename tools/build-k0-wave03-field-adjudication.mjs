#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = rel => fs.readFileSync(path.join(root, rel));
const stable = value => JSON.stringify(value, null, 2) + '\n';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};

export const fieldScope = [
  '.github/workflows/k0-wave03-field-adjudication.yml',
  'data/research/k0-wave03-field-adjudication.json',
  'docs/milestones/m05-k0-wave03-field-adjudication.md',
  'tools/build-k0-wave03-field-adjudication.mjs',
  'tools/validate-k0-wave03-field-adjudication.mjs',
  'test/k0-wave03-field-adjudication.test.js'
];

export function computeWave03FieldManifest() {
  const entries = fieldScope.map(rel => {
    const data = bytes(rel);
    return { path: rel, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'k0-wave03-field-adjudication-release-manifest@1',
    program_id: 'M-05',
    layer_id: 'K0',
    audit_id: 'K0-W03-FIELD-2026-07-28-MAINTAINER',
    as_of: '2026-07-28',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_event_truth: false,
      maintainer_adjudication_proves_independence: false,
      accident_proves_ceiling_conversion: false,
      management_override_proves_psychological_state: false,
      distributed_system_is_one_event: false,
      manifest_creates_graph_effect: false
    }
  };
}

const audit = read('data/research/k0-wave03-field-adjudication.json');
const wave = read('data/research/k0-role-neutral-wave-03.json');
const manifest = computeWave03FieldManifest();

const dispositionCounts = {};
const depthCounts = {};
for (const row of audit.rows) {
  const disposition = row.candidate_disposition || row.control_disposition;
  dispositionCounts[disposition] = (dispositionCounts[disposition] || 0) + 1;
  if (row.record_role === 'stage_adjudicated_candidate') {
    const key = row.provisional_ccd_chain_depth === null ? 'null' : String(row.provisional_ccd_chain_depth);
    depthCounts[key] = (depthCounts[key] || 0) + 1;
  }
}

const report = {
  schema_version: 'k0-wave03-field-adjudication-report@1',
  program_id: 'M-05',
  layer_id: 'K0',
  title: 'K0 Wave 03 safety-warning field adjudication',
  status: 'maintainer_field_adjudication_complete_independent_review_open',
  as_of: audit.as_of,
  source_wave: {
    wave_id: wave.wave_id,
    path: audit.source_wave_path,
    retained_records: wave.records.length,
    candidate_records: wave.counts.candidate_requires_field_audit
  },
  counts: {
    records_reviewed: audit.rows.length,
    stage_adjudicated_records: audit.counts.stage_adjudicated_records,
    control_records_reviewed: audit.counts.control_records_reviewed,
    supported_for_human_review: dispositionCounts.supported_for_human_review || 0,
    bounded_non_link: dispositionCounts.bounded_non_link || 0,
    retained_candidate_only: dispositionCounts.retained_candidate_only || 0,
    negative_controls: dispositionCounts.negative_control_retained || 0,
    coverage_controls: dispositionCounts.coverage_control_retained || 0,
    provisional_chain_depths: depthCounts,
    included_events: audit.rows.filter(row => row.included_event).length,
    official_source_pages_used: audit.counts.official_source_pages_used,
    graph_effects: audit.rows.filter(row => row.graph_effect !== 'none').length
  },
  method: audit.method,
  rows: audit.rows,
  current_result: {
    every_wave03_record_reviewed: audit.rows.length === wave.records.length,
    maintainer_field_adjudication_complete: true,
    independent_second_party_review_complete: false,
    evidence_truth_determined: false,
    included_events: 0,
    publication_status: 'blocked',
    graph_effect: 'none',
    project_complete: false
  },
  release_manifest: {
    path: 'data/project/k0-wave03-field-adjudication-release-manifest.json',
    combined_sha256: manifest.combined_sha256
  },
  boundaries: audit.boundaries
};

write('data/project/k0-wave03-field-adjudication-release-manifest.json', stable(manifest));
write('reports/core-thesis/answerable-power/k0-wave03-field-adjudication.json', stable(report));

const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));
const rows = audit.rows.map(row => {
  const disposition = row.candidate_disposition || row.control_disposition;
  const depth = row.provisional_ccd_chain_depth ?? '—';
  const furthest = row.furthest_documented_stage ?? '—';
  const requirements = (row.open_requirements || row.control_findings || []).join('; ');
  return `<tr><td><code>${esc(row.record_id)}</code></td><td>${esc(row.matter)}</td><td>${esc(row.record_role)}</td><td>${esc(disposition)}</td><td>${esc(depth)}</td><td>${esc(furthest)}</td><td>${esc(requirements)}</td></tr>`;
}).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K0 Wave 03 field adjudication</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,table,pre{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,pre{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · K0</b></p><h1>K0 Wave 03 safety-warning field adjudication</h1><p class="state">MAINTAINER REVIEW ONLY · NO INCLUDED EVENTS · PUBLICATION BLOCKED · GRAPH INERT</p><div class="metrics"><div class="metric"><b>${report.counts.records_reviewed}</b>records reviewed</div><div class="metric"><b>${report.counts.supported_for_human_review}</b>supported for review</div><div class="metric"><b>${report.counts.bounded_non_link}</b>bounded non-links</div><div class="metric"><b>${report.counts.retained_candidate_only}</b>candidate only</div><div class="metric"><b>${report.counts.included_events}</b>included events</div></div><h2>Field results</h2><table><tr><th>Record</th><th>Matter</th><th>Role</th><th>Disposition</th><th>Chain</th><th>Furthest</th><th>Open requirements / control finding</th></tr>${rows}</table><h2>Current result</h2><pre>${esc(JSON.stringify(report.current_result, null, 2))}</pre><h2>Boundary</h2><pre>${esc(JSON.stringify(report.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/k0-wave03-field-adjudication.html', html + '\n');

console.log(`build-k0-wave03-field-adjudication: ${audit.rows.length} records, ${report.counts.supported_for_human_review} supported, ${report.counts.bounded_non_link} bounded non-link, 0 included events`);
