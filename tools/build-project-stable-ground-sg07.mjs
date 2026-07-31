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
  '.github/workflows/project-stable-ground-sg06.yml',
  '.github/workflows/project-stable-ground-sg07.yml',
  '.github/workflows/status-sovereignty-compact.yml',
  '.github/workflows/status-sovereignty-wave-01.yml',
  '.github/workflows/status-sovereignty-wave-01-review.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg06.json',
  'data/project/project-stable-ground-sg06-release-manifest.json',
  'reports/core-thesis/stable-ground/sg06/checkpoint.json',
  'reports/core-thesis/stable-ground/sg06/index.html',
  'data/project/project-stable-ground-sg07.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/k0-role-neutral-denominator.json',
  'data/project/dca-h01-role-neutral-denominator.json',
  'data/project/poof-clifford-aperture.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'data/project/m05-answerable-power-sprint-09-plan.json',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'docs/milestones/project-stable-ground-sg07.md',
  'tools/build-project-stable-ground-sg07.mjs',
  'tools/validate-project-stable-ground-sg06.mjs',
  'tools/validate-project-stable-ground-sg07.mjs',
  'tools/build-status-sovereignty-wave-01.mjs',
  'tools/build-status-sovereignty-wave-01-review.mjs',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-wave-01.mjs',
  'tools/validate-status-sovereignty-wave-01-review.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'test/project-stable-ground-sg06.test.js',
  'test/project-stable-ground-sg07.test.js',
  'test/status-sovereignty-wave-01.test.js',
  'test/status-sovereignty-wave-01-review.test.js',
  'test/status-sovereignty-compact.test.js'
];

export function computeSg07Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg07-release-manifest@1',
    checkpoint_id: 'SG-2026-07-30-07',
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
      manifest_proves_second_party_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG07() {
  const checkpoint = read('data/project/project-stable-ground-sg07.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const waveRelease = read('data/project/status-sovereignty-wave-01-release-manifest.json');
  const reviewRelease = read('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const manifest = computeSg07Manifest();
  write('data/project/project-stable-ground-sg07-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const snapshot = checkpoint.canonical_snapshot;
  const report = {
    schema_version: 'project-stable-ground-sg07-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Stable-ground supersession 07 · SSC-H01 Wave 01 maintainer review',
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
      effective_counterpower_controls: snapshot.status_sovereignty.dispositions.effective_counterpower_controls,
      ordinary_industrial_policy_controls: snapshot.status_sovereignty.dispositions.ordinary_industrial_policy_controls,
      ssc_open_acquisition: snapshot.status_sovereignty.dispositions.requires_additional_acquisition,
      ssc_capital_conversion_unsupported: snapshot.status_sovereignty.dispositions.capital_conversion_unsupported,
      maintainer_reviewed: snapshot.status_sovereignty.maintainer_reviewed,
      second_party_reviewed: snapshot.status_sovereignty.second_party_reviewed,
      adjudicated: snapshot.status_sovereignty.adjudicated,
      disposition_changes: checkpoint.fanout_state.maintainer_review.disposition_changes,
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
    maintainer_review_release: {
      path: 'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
      combined_sha256: reviewRelease.combined_sha256
    },
    status_release: {
      path: 'data/project/status-sovereignty-release-manifest.json',
      combined_sha256: statusRelease.combined_sha256
    },
    poof_release: {
      path: 'data/project/poof-clifford-ecology-release-manifest.json',
      combined_sha256: poofRelease.combined_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg07-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg07/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const dispositionRows = Object.entries(snapshot.status_sovereignty.dispositions).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const driftRows = checkpoint.drift_resolutions.map((row) => `<tr><td><code>${esc(row.drift_id)}</code></td><td>${esc(row.prior_state)}</td><td>${esc(row.current_resolution)}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-07 · SSC-H01 maintainer review · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1380px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,5vw,4.2rem);line-height:1;letter-spacing:-.04em;max-width:1100px}h2{margin-top:2.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.boundary{border-left:6px solid #7c2920}.state{font-weight:800;color:#7c2920}</style></head><body>
<p><code>${esc(checkpoint.checkpoint_id)}</code> · ${esc(checkpoint.as_of)}</p>
<h1>Wave 01 is maintainer-reviewed. It is not independently reviewed or adjudicated.</h1>
<p class="state">Publication remains blocked. Graph effect remains none. Adoption remains A0.</p>
<div class="grid">
<div class="card"><span>Observations</span><b>${esc(snapshot.status_sovereignty.records_retained)}</b></div>
<div class="card"><span>Maintainer reviewed</span><b>${esc(snapshot.status_sovereignty.maintainer_reviewed)}</b></div>
<div class="card"><span>Second-party reviewed</span><b>${esc(snapshot.status_sovereignty.second_party_reviewed)}</b></div>
<div class="card"><span>Adjudicated</span><b>${esc(snapshot.status_sovereignty.adjudicated)}</b></div>
<div class="card"><span>Complete compact</span><b>${esc(snapshot.status_sovereignty.complete_compact_findings)}</b></div>
<div class="card"><span>Adoption</span><b>${esc(snapshot.sprint_09.maximum_verified_adoption_level)}</b></div>
</div>
<h2>Append-only checkpoint history</h2><table><thead><tr><th>Checkpoint</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table>
<h2>Wave 01 dispositions</h2><table><thead><tr><th>Disposition</th><th>Count</th></tr></thead><tbody>${dispositionRows}</tbody></table>
<h2>Drift resolved</h2><table><thead><tr><th>ID</th><th>Prior state</th><th>Resolution</th></tr></thead><tbody>${driftRows}</tbody></table>
<h2>Authority boundary</h2><div class="card boundary"><pre>${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre></div>
<h2>Exact-byte custody</h2><p><code>${esc(manifest.combined_sha256)}</code></p>
</body></html>`;
  write('reports/core-thesis/stable-ground/sg07/index.html', html);
  return { checkpoint, report, manifest };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const { report, manifest } = buildStableGroundSG07();
  console.log(`build-project-stable-ground-sg07: ${report.counts.checkpoints_preserved} checkpoints, ${report.counts.maintainer_reviewed}/${report.counts.ssc_observations} maintainer reviewed, ${report.counts.second_party_reviewed} second-party, ${report.counts.adjudicated} adjudicated, ${manifest.entries.length} release entries`);
}
