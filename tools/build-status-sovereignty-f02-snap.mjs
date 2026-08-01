#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-f02-snap.yml',
  'data/intake/status-sovereignty-f02-snap-gate-first-pass.json',
  'schemas/status-sovereignty-institutional-gate-first-pass.schema.json',
  'docs/milestones/ssc-f02-snap-gate-first-pass.md',
  'tools/build-status-sovereignty-f02-snap.mjs',
  'tools/validate-status-sovereignty-f02-snap.mjs',
  'test/status-sovereignty-f02-snap.test.js'
];

export function computeSnapGateManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-institutional-gate-first-pass-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-F02',
    observation_id: 'SSC-OBS-0016',
    first_pass_id: 'SSC-F02-SNAP-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_affected_person_or_correction_denominator: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_racial_hierarchy: false,
      manifest_proves_unlawful_discrimination: false,
      manifest_proves_effective_counterpower: false,
      manifest_proves_prevalence_or_common_purpose: false,
      manifest_proves_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildSnapGateFirstPass() {
  const record = read('data/intake/status-sovereignty-f02-snap-gate-first-pass.json');
  const manifest = computeSnapGateManifest();
  const report = {
    schema_version: 'status-sovereignty-institutional-gate-first-pass-report@1',
    first_pass_id: 'SSC-F02-SNAP-01',
    ...record,
    counts: {
      source_records: record.sources.length,
      gate_states: Object.keys(record.four_gate_first_pass).length,
      open_denominators: record.open_denominators.length,
      bounded_status_frames: record.four_gate_first_pass.SSC-G1_status_and_deservingness === 'supported_bounded_frame' ? 1 : 0,
      selector_variation_controls: record.four_gate_first_pass.SSC-G2_epistemic_admissibility === 'candidate_selector_variation_observed' ? 1 : 0,
      material_benefit_gates: record.four_gate_first_pass.SSC-G3_material_conversion === 'benefit_time_limit_and_disqualification_instrument_observed' ? 1 : 0,
      formal_correction_routes: record.four_gate_first_pass.SSC-G4_correction_monopoly.startsWith('formal_fair_hearing_observed') ? 1 : 0,
      practical_correction_effectiveness_complete: 0,
      program_evaluation_counterevidence: record.sources.some((source) => source.source_class === 'official_program_evaluation_and_counterevidence') ? 1 : 0,
      racial_hierarchy_findings: record.current_result.racial_hierarchy_finding ? 1 : 0,
      unlawful_discrimination_findings: record.current_result.unlawful_discrimination_finding ? 1 : 0,
      complete_compact_findings: record.current_result.complete_compact_finding ? 1 : 0,
      prevalence_findings: record.current_result.prevalence_finding ? 1 : 0,
      graph_effects: record.current_result.graph_effect === 'none' ? 0 : 1,
      publication_effects: record.current_result.publication_effect === 'none' ? 0 : 1
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-f02-snap-gate-first-pass-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-f02-snap-gate-first-pass-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/f02-snap/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/f02-snap/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/f02-snap/data.json', stable(report));

  const sourceRows = record.sources.map((source) => `<tr><td><code>${esc(source.source_id)}</code></td><td><a href="${esc(source.url)}">${esc(source.title)}</a><br>${esc(source.publisher)}</td><td>${esc(source.source_class)}</td><td>${esc(source.retrieved_facts.join(' '))}</td></tr>`).join('');
  const gateRows = Object.entries(record.four_gate_first_pass).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const openRows = record.open_denominators.map((item) => `<li>${esc(item)}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-F02 · SNAP institutional gate</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1440px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · SSC-F02 · ACQUISITION ONLY</strong></p><h1>SNAP work-requirement and time-limit gate</h1><p class="state">STATUS FRAME OBSERVED · SELECTOR VARIATION OBSERVED · MATERIAL BENEFIT GATE OBSERVED · FORMAL HEARING OBSERVED · PRACTICAL CORRECTION UNRESOLVED · RACIAL HIERARCHY NOT ESTABLISHED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>${report.counts.source_records}</b>official sources</div><div class="card"><b>${report.counts.gate_states}</b>gate states</div><div class="card"><b>${report.counts.formal_correction_routes}</b>formal correction route</div><div class="card"><b>${report.counts.program_evaluation_counterevidence}</b>counterevidence study</div><div class="card"><b>${report.counts.open_denominators}</b>open denominators</div><div class="card"><b>${report.counts.racial_hierarchy_findings}</b>racial-hierarchy findings</div></div><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Four-gate first pass</h2><table><thead><tr><th>Gate</th><th>Observed state</th></tr></thead><tbody>${gateRows}</tbody></table><h2>Official source ledger</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Recovered facts and limits</th></tr></thead><tbody>${sourceRows}</tbody></table><h2>Still required</h2><ul>${openRows}</ul><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/f02-snap/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-f02-snap: ${record.sources.length} sources, 4 gates, 1 formal hearing route, 0 racial-hierarchy findings`);
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSnapGateFirstPass();
}
