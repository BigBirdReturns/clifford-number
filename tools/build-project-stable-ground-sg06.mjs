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
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  'package.json',
  '.github/workflows/project-stable-ground-sg05.yml',
  '.github/workflows/project-stable-ground-sg06.yml',
  '.github/workflows/status-sovereignty-compact.yml',
  '.github/workflows/status-sovereignty-wave-01.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg06.json',
  'data/project/project-stable-ground-sg05.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'data/project/k0-epistemic-admissibility-release-manifest.json',
  'docs/milestones/m05-status-sovereignty-wave-01.md',
  'docs/milestones/project-stable-ground-sg06.md',
  'tools/build-project-stable-ground-sg06.mjs',
  'tools/validate-project-stable-ground-sg06.mjs',
  'tools/validate-project-stable-ground-sg04.mjs',
  'tools/validate-project-stable-ground-sg05.mjs',
  'tools/build-status-sovereignty-wave-01.mjs',
  'tools/validate-status-sovereignty-wave-01.mjs',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'test/project-stable-ground-sg04.test.js',
  'test/project-stable-ground-sg05.test.js',
  'test/project-stable-ground-sg06.test.js',
  'test/status-sovereignty-wave-01.test.js',
  'test/status-sovereignty-compact.test.js'
];

export function computeSg06Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg06-release-manifest@1',
    checkpoint_id: 'SG-2026-07-30-06',
    as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_compact: false,
      manifest_proves_racial_order: false,
      manifest_proves_prevalence: false,
      manifest_proves_review: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG06() {
  const checkpoint = read('data/project/project-stable-ground-sg06.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const waveRelease = read('data/project/status-sovereignty-wave-01-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const k0Release = read('data/project/k0-epistemic-admissibility-release-manifest.json');
  const manifest = computeSg06Manifest();
  write('data/project/project-stable-ground-sg06-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const snapshot = checkpoint.canonical_snapshot;
  const report = {
    schema_version: 'project-stable-ground-sg06-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Stable-ground supersession 06 · SSC-H01 Wave 01 execution',
    canonical_main: checkpoint.canonical_main,
    supersedes: checkpoint.supersedes,
    history: pointer.history,
    governor: {
      path: checkpoint.governor,
      schema_version: governor.schema_version,
      correction_mode: governor.checkpoint_contract.correction_mode
    },
    authority_change: checkpoint.authority_change,
    counts: {
      checkpoints_preserved: pointer.history.length,
      stable_propositions: checkpoint.preserved_stable_propositions.length,
      owner_lanes: checkpoint.fanout_state.owner_lanes.length,
      ssc_gates: snapshot.status_sovereignty.gates,
      ssc_dimensions: snapshot.status_sovereignty.dimensions,
      ssc_lanes: snapshot.status_sovereignty.fanout_lanes,
      ssc_issue_groups: snapshot.status_sovereignty.issue_groups,
      ssc_field_sources: snapshot.status_sovereignty.field_source_records,
      ssc_waves: snapshot.status_sovereignty.waves_executed,
      ssc_executed_lanes: snapshot.status_sovereignty.executed_lanes,
      ssc_observations: snapshot.status_sovereignty.records_retained,
      ssc_complete_compact_findings: snapshot.status_sovereignty.complete_compact_findings,
      ssc_partial_convergence: snapshot.status_sovereignty.dispositions.partial_functional_convergence,
      ssc_controls: snapshot.status_sovereignty.dispositions.ordinary_patriotic_or_industrial_policy,
      ssc_open_acquisition: snapshot.status_sovereignty.dispositions.requires_additional_acquisition,
      ssc_capital_conversion_unsupported: snapshot.status_sovereignty.dispositions.capital_conversion_unsupported,
      maintainer_reviewed: snapshot.status_sovereignty.maintainer_reviewed,
      second_party_reviewed: snapshot.status_sovereignty.second_party_reviewed,
      adjudicated: snapshot.status_sovereignty.adjudicated,
      k0_executed: snapshot.k0.query_templates_executed,
      k0_total: snapshot.k0.query_templates_total,
      dca_executed: snapshot.dca.query_templates_executed,
      adoption_level: snapshot.sprint_09.maximum_verified_adoption_level
    },
    canonical_snapshot: snapshot,
    fanout_state: checkpoint.fanout_state,
    lifecycle_repair: checkpoint.lifecycle_repair,
    build_order: checkpoint.build_order,
    drift_resolutions: checkpoint.drift_resolutions,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    wave_release: {
      path: 'data/project/status-sovereignty-wave-01-release-manifest.json',
      combined_sha256: waveRelease.combined_sha256
    },
    status_release: {
      path: 'data/project/status-sovereignty-release-manifest.json',
      combined_sha256: statusRelease.combined_sha256
    },
    poof_release: {
      path: 'data/project/poof-clifford-ecology-release-manifest.json',
      combined_sha256: poofRelease.combined_sha256
    },
    k0_release: {
      path: 'data/project/k0-epistemic-admissibility-release-manifest.json',
      combined_sha256: k0Release.combined_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg06-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg06/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td><code>${esc(row.path)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const laneRows = checkpoint.fanout_state.ssc_lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.state)}</td><td>${esc(row.records_retained ?? 0)}</td></tr>`).join('');
  const ownerRows = checkpoint.fanout_state.owner_lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.surface)}</td><td>${esc(row.purpose)}</td><td>${esc(row.state)}</td></tr>`).join('');
  const driftRows = checkpoint.drift_resolutions.map((row) => `<tr><td><code>${esc(row.drift_id)}</code></td><td>${esc(row.prior_state)}</td><td>${esc(row.current_resolution)}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-06 · SSC-H01 Wave 01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1480px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:.98;letter-spacing:-.045em;max-width:1050px}h2{margin-top:2.6rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · M-05 · STABLE GROUND</strong></p><h1>SSC-H01 Wave 01 execution without a complete-compact finding</h1><p class="state">CURRENT CHECKPOINT: ${esc(checkpoint.checkpoint_id)} · SSC EXECUTION: ${snapshot.status_sovereignty.executed_lanes}/16 · OBSERVATIONS: ${snapshot.status_sovereignty.records_retained} UNREVIEWED · COMPLETE COMPACT: 0 · RACIAL-ORDER FINDING: FALSE · ADOPTION: ${esc(snapshot.sprint_09.maximum_verified_adoption_level)}</p>
<p>${esc(checkpoint.canonical_main.meaning)}</p><div class="grid"><div class="card"><b>${report.counts.checkpoints_preserved}</b>checkpoint rows</div><div class="card"><b>${report.counts.ssc_field_sources}</b>field sources</div><div class="card"><b>${report.counts.ssc_executed_lanes}/16</b>executed lanes</div><div class="card"><b>${report.counts.ssc_observations}</b>observations</div><div class="card"><b>${report.counts.ssc_partial_convergence}</b>partial mechanisms</div><div class="card"><b>${report.counts.ssc_controls}</b>controls</div><div class="card"><b>${report.counts.ssc_open_acquisition}</b>open acquisition</div><div class="card"><b>${report.counts.ssc_complete_compact_findings}</b>complete compact</div></div>
<h2>Authority change</h2><pre>${esc(JSON.stringify(checkpoint.authority_change, null, 2))}</pre><h2>Checkpoint history</h2><table><thead><tr><th>Checkpoint</th><th>Path</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table><h2>Owner lanes</h2><table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th></tr></thead><tbody>${ownerRows}</tbody></table><h2>SSC lane execution</h2><table><thead><tr><th>Lane</th><th>State</th><th>Retained</th></tr></thead><tbody>${laneRows}</tbody></table><h2>Drift resolved</h2><table><thead><tr><th>ID</th><th>Prior state</th><th>Current resolution</th></tr></thead><tbody>${driftRows}</tbody></table><h2>Current snapshot</h2><pre>${esc(JSON.stringify(snapshot, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre><p class="small"><code>Wave 01 release SHA-256: ${esc(waveRelease.combined_sha256)}</code></p><p class="small"><code>SSC release SHA-256: ${esc(statusRelease.combined_sha256)}</code></p><p class="small"><code>SG-06 release SHA-256: ${esc(manifest.combined_sha256)}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg06/index.html', `${html}\n`);
  console.log(`build-project-stable-ground-sg06: ${pointer.history.length} checkpoints, SSC Wave 01 ${snapshot.status_sovereignty.executed_lanes}/16 lanes, ${snapshot.status_sovereignty.records_retained} observations, 0 complete compact`);
  return { checkpoint, pointer, governor, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG06();
