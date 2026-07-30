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
  '.github/workflows/project-stable-ground-sg04.yml',
  '.github/workflows/project-stable-ground-sg03.yml',
  '.github/workflows/status-sovereignty-compact.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-sg05.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg04.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/core-thesis.json',
  'data/project/dca-h01-field-hypothesis.json',
  'data/project/m05-answerable-power-story-registry.json',
  'data/project/m05-answerable-power-fanout.json',
  'data/project/security-state-organism-program.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'data/project/k0-epistemic-admissibility-release-manifest.json',
  'data/research/k0-role-neutral-denominator.json',
  'docs/milestones/project-stable-ground-sg05.md',
  'tools/build-project-stable-ground-sg05.mjs',
  'tools/validate-project-stable-ground-sg05.mjs',
  'tools/validate-project-stable-ground-sg04.mjs',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'test/project-stable-ground-sg05.test.js',
  'test/project-stable-ground-sg04.test.js',
  'test/status-sovereignty-compact.test.js'
];

export function computeSg05Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg05-release-manifest@1',
    checkpoint_id: 'SG-2026-07-30-05',
    as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_status_compact: false,
      manifest_proves_racial_order: false,
      manifest_proves_prevalence: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG05() {
  const checkpoint = read('data/project/project-stable-ground-sg05.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const k0Release = read('data/project/k0-epistemic-admissibility-release-manifest.json');
  const manifest = computeSg05Manifest();
  write('data/project/project-stable-ground-sg05-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const snapshot = checkpoint.canonical_snapshot;
  const report = {
    schema_version: 'project-stable-ground-sg05-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Stable-ground supersession 05 · Status-for-sovereignty compact',
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
      ssc_external_references: snapshot.status_sovereignty.external_references,
      ssc_repository_sources: snapshot.status_sovereignty.repository_sources,
      ssc_executed_lanes: snapshot.status_sovereignty.query_or_field_execution_started ? 1 : 0,
      ssc_retained_records: snapshot.status_sovereignty.records_retained,
      core_thesis_report_contracts: snapshot.core_thesis.report_contracts,
      core_thesis_field_hypotheses: snapshot.core_thesis.field_hypothesis_bridges,
      m05_stories: snapshot.m05_story_ecology.stories,
      m05_research_lanes: snapshot.m05_story_ecology.research_lanes,
      k0_executed: snapshot.k0.query_templates_executed,
      k0_total: snapshot.k0.query_templates_total,
      dca_executed: snapshot.dca.query_templates_executed,
      external_reproduction_receipts: snapshot.sprint_09.external_reproduction_receipts,
      adoption_level: snapshot.sprint_09.maximum_verified_adoption_level
    },
    canonical_snapshot: snapshot,
    fanout_state: checkpoint.fanout_state,
    lifecycle_repair: checkpoint.lifecycle_repair,
    build_order: checkpoint.build_order,
    drift_resolutions: checkpoint.drift_resolutions,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
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
      path: 'data/project/project-stable-ground-sg05-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg05/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td><code>${esc(row.path)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const laneRows = checkpoint.fanout_state.owner_lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.surface)}</td><td>${esc(row.purpose)}</td><td>${esc(row.state)}</td></tr>`).join('');
  const driftRows = checkpoint.drift_resolutions.map((row) => `<tr><td><code>${esc(row.drift_id)}</code></td><td>${esc(row.prior_state)}</td><td>${esc(row.current_resolution)}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-05 · SSC-H01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1480px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:.98;letter-spacing:-.045em;max-width:1050px}h2{margin-top:2.6rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · M-05 · STABLE GROUND</strong></p><h1>Status-for-sovereignty compact, zero field execution</h1><p class="state">CURRENT CHECKPOINT: ${esc(checkpoint.checkpoint_id)} · SSC EXECUTION: 0/16 · RACIAL-ORDER FINDING: FALSE · ADOPTION: ${esc(snapshot.sprint_09.maximum_verified_adoption_level)}</p>
<p>${esc(checkpoint.canonical_main.meaning)}</p><div class="grid"><div class="card"><b>${report.counts.checkpoints_preserved}</b>preserved checkpoints</div><div class="card"><b>${report.counts.ssc_gates}</b>SSC gates</div><div class="card"><b>${report.counts.ssc_dimensions}</b>SSC dimensions</div><div class="card"><b>${report.counts.ssc_lanes}</b>SSC lanes</div><div class="card"><b>0</b>executed SSC lanes</div><div class="card"><b>${report.counts.k0_executed}/${report.counts.k0_total}</b>K0 templates</div><div class="card"><b>${report.counts.dca_executed}/12</b>DCA templates</div></div>
<h2>Authority change</h2><pre>${esc(JSON.stringify(checkpoint.authority_change, null, 2))}</pre><h2>Checkpoint history</h2><table><thead><tr><th>Checkpoint</th><th>Path</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table><h2>Fan-out state</h2><table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th></tr></thead><tbody>${laneRows}</tbody></table><h2>Drift resolved</h2><table><thead><tr><th>ID</th><th>Prior state</th><th>Current resolution</th></tr></thead><tbody>${driftRows}</tbody></table><h2>Current snapshot</h2><pre>${esc(JSON.stringify(snapshot, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre><p class="small"><code>SSC release SHA-256: ${esc(statusRelease.combined_sha256)}</code></p><p class="small"><code>SG-05 release SHA-256: ${esc(manifest.combined_sha256)}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg05/index.html', `${html}\n`);
  console.log(`build-project-stable-ground-sg05: ${pointer.history.length} checkpoints, SSC ${snapshot.status_sovereignty.gates} gates/${snapshot.status_sovereignty.dimensions} dimensions/${snapshot.status_sovereignty.fanout_lanes} lanes, execution 0`);
  return { checkpoint, pointer, governor, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG05();
