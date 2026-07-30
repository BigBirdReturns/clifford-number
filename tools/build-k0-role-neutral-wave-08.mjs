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

export const releaseScope = [
  '.github/workflows/k0-role-neutral-wave-08.yml',
  'data/research/k0-role-neutral-wave-08.json',
  'docs/milestones/m05-k0-role-neutral-wave-08.md',
  'tools/build-k0-role-neutral-wave-08.mjs',
  'tools/validate-k0-role-neutral-wave-08.mjs',
  'test/k0-role-neutral-wave-08.test.js'
];

export function computeWave08Manifest() {
  const entries = releaseScope.map(rel => {
    const data = bytes(rel);
    return { path: rel, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'k0-role-neutral-wave-08-release-manifest@1',
    program_id: 'M-05',
    layer_id: 'K0',
    wave_id: 'K0-W08',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_event_truth: false,
      search_capture_proves_complete_universe: false,
      contrary_advice_proves_competence_reclassification: false,
      appointment_or_removal_proves_retaliation: false,
      leadership_change_proves_epistemic_exclusion: false,
      failed_removal_attempt_proves_feedback_source_removed: false,
      investigation_rationale_proves_merits: false,
      manifest_creates_graph_effect: false
    }
  };
}

const wave = read('data/research/k0-role-neutral-wave-08.json');
const manifest = computeWave08Manifest();
const outcomes = wave.records.reduce((acc, row) => ((acc[row.selection_outcome] = (acc[row.selection_outcome] || 0) + 1), acc), {});
const report = {
  schema_version: 'k0-role-neutral-wave-08-report@1',
  program_id: 'M-05',
  layer_id: 'K0',
  wave_id: wave.wave_id,
  title: 'K0 role-neutral denominator Wave 08 · contrary advice, appointment, removal, and board action',
  status: wave.status,
  as_of: wave.as_of,
  source_plane: wave.source_plane,
  query_executions: wave.query_executions,
  counts: wave.counts,
  outcomes,
  records: wave.records,
  excluded_result_summaries: wave.excluded_result_summaries,
  current_result: {
    name_blind_query_execution_complete: true,
    public_source_plane_only: true,
    full_frozen_search_battery_executed: true,
    field_adjudication_complete: false,
    included_events: 0,
    assigned_ccd_values: 0,
    evidence_truth_determined: false,
    independent_second_party_review_complete: false,
    publication_status: 'blocked',
    graph_effect: 'none',
    project_complete: false
  },
  release_manifest: {
    path: 'data/project/k0-role-neutral-wave-08-release-manifest.json',
    combined_sha256: manifest.combined_sha256
  },
  boundaries: wave.boundaries
};

write('data/project/k0-role-neutral-wave-08-release-manifest.json', stable(manifest));
write('reports/core-thesis/answerable-power/k0-role-neutral-wave-08.json', stable(report));

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const rows = wave.records.map(row => `<tr><td><code>${esc(row.record_id)}</code></td><td>${esc(row.institution)}</td><td>${esc(row.selection_outcome)}</td><td>${esc(row.field_audit_status)}</td></tr>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K0 Wave 08 · contrary advice and gate action</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · K0 · WAVE 08</b></p><h1>Contrary-advice, appointment, removal, and board-action discovery</h1><p class="state">DISCOVERY COMPLETE · FIELD ADJUDICATION PENDING · PUBLICATION BLOCKED · GRAPH INERT</p><div class="metrics"><div class="metric"><b>${wave.counts.query_executions}</b>query executions</div><div class="metric"><b>${wave.counts.raw_results_observed}</b>raw results</div><div class="metric"><b>${wave.counts.retained_records}</b>retained records</div><div class="metric"><b>${wave.counts.candidate_requires_field_audit}</b>candidates</div><div class="metric"><b>${wave.counts.positive_controls}</b>positive controls</div><div class="metric"><b>${wave.counts.negative_controls}</b>negative controls</div><div class="metric"><b>${wave.counts.coverage_controls}</b>coverage controls</div><div class="metric"><b>${wave.counts.included_events}</b>included events</div></div><h2>Records</h2><table><tr><th>ID</th><th>Institution</th><th>Outcome</th><th>Field state</th></tr>${rows}</table><h2>Source-plane boundary</h2><pre class="box boundary">${esc(JSON.stringify(wave.source_plane, null, 2))}</pre><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/k0-role-neutral-wave-08.html', html + '\n');

console.log(`build-k0-role-neutral-wave-08: ${wave.counts.retained_records} records, ${wave.counts.candidate_requires_field_audit} candidates, ${wave.counts.positive_controls} positive controls, 0 included events`);
