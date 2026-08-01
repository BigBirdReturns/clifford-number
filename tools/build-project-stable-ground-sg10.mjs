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
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  'package.json',
  '.github/workflows/project-stable-ground-sg09.yml',
  '.github/workflows/project-stable-ground-sg10.yml',
  '.github/workflows/status-sovereignty-wave-02-review.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg09.json',
  'data/project/project-stable-ground-sg09-release-manifest.json',
  'reports/core-thesis/stable-ground/sg09/checkpoint.json',
  'reports/core-thesis/stable-ground/sg09/index.html',
  'data/project/project-stable-ground-sg10.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json',
  'data/research/status-sovereignty-wave-02.json',
  'data/research/status-sovereignty-wave-02-maintainer-review.json',
  'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'reports/core-thesis/poof-clifford-ecology/release-manifest.json',
  'reports/core-thesis/status-sovereignty/data.json',
  'reports/core-thesis/status-sovereignty/index.html',
  'reports/core-thesis/status-sovereignty/wave-02-review/data.json',
  'reports/core-thesis/status-sovereignty/wave-02-review/index.html',
  'docs/milestones/m05-status-sovereignty-wave-02-review.md',
  'docs/milestones/project-stable-ground-sg10.md',
  'tools/build-status-sovereignty-wave-02-review.mjs',
  'tools/validate-status-sovereignty-wave-02-review.mjs',
  'test/status-sovereignty-wave-02-review.test.js',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'test/status-sovereignty-compact.test.js',
  'tools/build-project-stable-ground-sg10.mjs',
  'tools/validate-project-stable-ground-sg09.mjs',
  'test/project-stable-ground-sg09.test.js',
  'tools/validate-project-stable-ground-sg10.mjs',
  'test/project-stable-ground-sg10.test.js',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs'
];

export function computeSg10Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg10-release-manifest@1',
    checkpoint_id: 'SG-2026-07-31-10',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_empirical_truth: false,
      manifest_proves_complete_compact: false,
      manifest_proves_racial_order: false,
      manifest_proves_prevalence: false,
      manifest_proves_coordination: false,
      manifest_proves_second_party_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      manifest_rewrites_sg09: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG10() {
  const checkpoint = read('data/project/project-stable-ground-sg10.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const review = read('data/research/status-sovereignty-wave-02-maintainer-review.json');
  const compact = read('data/project/status-sovereignty-compact.json');
  const campaign = read('data/project/status-sovereignty-wave-01-second-party-review-campaign.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const publicPoofRelease = read('reports/core-thesis/poof-clifford-ecology/release-manifest.json');
  const manifest = computeSg10Manifest();
  write('data/project/project-stable-ground-sg10-release-manifest.json', stable(manifest));

  const report = {
    schema_version: 'project-stable-ground-sg10-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: checkpoint.title,
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
      waves_executed: compact.current_state.waves_executed,
      executed_lanes: compact.current_state.executed_lanes,
      observations: compact.current_state.observations_retained,
      maintainer_reviewed: compact.current_state.maintainer_reviewed_observations,
      second_party_reviewed: compact.current_state.second_party_reviewed_observations,
      adjudicated: compact.current_state.adjudicated_observations,
      wave_02_reviewed: review.counts.maintainer_reviewed,
      wave_01_open_acquisition_obligations: compact.current_state.wave_01_open_acquisition_obligations,
      wave_02_open_acquisition_obligations: compact.current_state.wave_02_open_acquisition_obligations,
      global_open_acquisition_obligations: compact.current_state.open_acquisition_obligations,
      complete_compact_findings: compact.current_state.complete_compact_findings,
      valid_wave_01_second_party_reviews: campaign.counts.valid_reviews,
      publication_clearances: review.counts.publication_clearances,
      graph_effects: review.counts.graph_effects
    },
    wave_02_review: {
      review_id: review.review_id,
      status: review.status,
      counts: review.counts,
      current_result: review.current_result
    },
    canonical_snapshot: checkpoint.canonical_snapshot,
    fanout_state: checkpoint.fanout_state,
    build_order: checkpoint.build_order,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    exact_custody: {
      transition_review_release_sha256: checkpoint.trigger.review_release_sha256,
      transition_status_release_sha256: checkpoint.trigger.transition_status_release_sha256,
      transition_poof_release_sha256: checkpoint.trigger.transition_poof_release_sha256,
      current_status_release_sha256: statusRelease.combined_sha256,
      current_poof_release_sha256: poofRelease.combined_sha256,
      public_poof_release_sha256: publicPoofRelease.combined_sha256,
      sg09_release_sha256: checkpoint.supersedes.release_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg10-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg10/checkpoint.json', stable(report));

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const reviewRows = review.reviewed_observations.map((row) => `<tr><td><code>${esc(row.observation_id)}</code></td><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.reviewed_disposition)}</td><td>${esc(row.review_outcome)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-10 · SSC-W02 maintainer review · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1420px;margin:auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,6vw,4.7rem);line-height:.96}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:collapse}th,td{padding:.65rem;border-bottom:1px solid #d5cdbf;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><code>${esc(checkpoint.checkpoint_id)}</code></p><h1>All sixteen lanes executed; the compact remains unproved</h1><p class="state">22/22 MAINTAINER REVIEWED · 0 SECOND-PARTY · 0 ADJUDICATED · 6 OPEN ACQUISITIONS · 0 COMPLETE COMPACT · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${compact.current_state.waves_executed}</b>waves</div><div class="card"><b>${compact.current_state.executed_lanes}/16</b>lanes</div><div class="card"><b>${compact.current_state.observations_retained}</b>observations</div><div class="card"><b>${compact.current_state.maintainer_reviewed_observations}</b>maintainer-reviewed</div><div class="card"><b>${compact.current_state.open_acquisition_obligations}</b>open acquisitions</div><div class="card"><b>${compact.current_state.complete_compact_findings}</b>complete compact</div></div><div class="boundary"><strong>Authority ceiling.</strong> Maintainer review is not external review or adjudication. All lanes executed does not prove the complete compact. The three Wave 01 and three Wave 02 acquisition obligations remain independently open. No racial-order, prevalence, coordination, common-purpose, publication, graph, deployment, or adoption authority is created.</div><h2>Wave 02 review packets</h2><table><thead><tr><th>Packet</th><th>Lane</th><th>Disposition</th><th>Review outcome</th></tr></thead><tbody>${reviewRows}</tbody></table><h2>Append-only history</h2><table><thead><tr><th>Checkpoint</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table><h2>Exact custody</h2><pre>${esc(JSON.stringify(report.exact_custody, null, 2))}</pre><p><code>SG-10 release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg10/index.html', html);

  console.log(`build-project-stable-ground-sg10: ${pointer.history.length} checkpoints, ${compact.current_state.executed_lanes}/16 lanes, ${compact.current_state.maintainer_reviewed_observations} reviewed, ${compact.current_state.open_acquisition_obligations} open acquisitions`);
  return { checkpoint, pointer, review, compact, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG10();
