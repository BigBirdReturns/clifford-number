#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => { const target = path.join(root, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-wave-02-review.yml',
  'data/intake/status-sovereignty-wave-02-structural-synthesis.md',
  'data/intake/status-sovereignty-wave-02-source-denominator.json',
  'data/intake/status-sovereignty-wave-02-candidate-observations.json',
  'data/project/status-sovereignty-wave-02-intake-release-manifest.json',
  'data/research/status-sovereignty-wave-02.json',
  'data/research/status-sovereignty-wave-02-maintainer-review.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'schemas/status-sovereignty-wave-02-intake.schema.json',
  'docs/milestones/m05-status-sovereignty-wave-02-review.md',
  'tools/build-status-sovereignty-wave-02-review.mjs',
  'tools/validate-status-sovereignty-wave-02-review.mjs',
  'test/status-sovereignty-wave-02-review.test.js'
];

export function computeWave02ReviewManifest() {
  const entries = releaseScope.map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-wave-02-maintainer-review-release-manifest@1',
    hypothesis_id: 'SSC-H01', wave_id: 'SSC-W02', review_id: 'SSC-W02-MR01', as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes', scope_ordered: true, self_included: false, entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_compact: false,
      manifest_proves_second_party_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildWave02Review() {
  const intake = read('data/intake/status-sovereignty-wave-02-candidate-observations.json');
  const sources = read('data/intake/status-sovereignty-wave-02-source-denominator.json');
  const wave = read('data/research/status-sovereignty-wave-02.json');
  const review = read('data/research/status-sovereignty-wave-02-maintainer-review.json');
  const compact = read('data/project/status-sovereignty-compact.json');
  const fanout = read('data/project/status-sovereignty-fanout.json');
  const registry = read('data/project/status-sovereignty-source-registry.json');
  const intakeRelease = read('data/project/status-sovereignty-wave-02-intake-release-manifest.json');
  const manifest = computeWave02ReviewManifest();
  write('data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json', stable(manifest));
  const sourceById = new Map(sources.records.map((row) => [row.source_id, row]));
  const report = {
    schema_version: 'status-sovereignty-wave-02-maintainer-review-report@1',
    hypothesis_id: review.hypothesis_id, wave_id: review.wave_id, review_id: review.review_id,
    as_of: review.as_of, title: review.title, status: review.status,
    review_contract: review.review_contract, counts: review.counts,
    reviewed_observations: review.reviewed_observations.map((row) => ({
      ...row,
      sources: row.source_ids.map((id) => { const source = sourceById.get(id); return source ? { source_id:id, title:source.title, publisher:source.publisher, url:source.url, authority:source.authority, retrieval_status:source.retrieval.status, limitations:source.limitations } : { source_id:id, missing:true }; })
    })),
    open_acquisition_obligations: review.open_acquisition_obligations,
    current_result: review.current_result,
    boundaries: review.boundaries,
    parent_intake: { path: review.intake_path, status: intake.status, counts: intake.counts, release_sha256: intakeRelease.combined_sha256 },
    canonical_wave: { path: review.source_wave_path, status: wave.status, counts: wave.counts, current_result: wave.current_result },
    integrated_state: {
      compact_status: compact.status,
      waves_executed: compact.current_state.waves_executed,
      executed_lanes: compact.current_state.executed_lanes,
      retained_observations: compact.current_state.observations_retained,
      maintainer_reviewed_observations: compact.current_state.maintainer_reviewed_observations,
      fanout_status: fanout.status,
      field_source_records: registry.counts.field_source_records
    },
    release_manifest: { path: 'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json', combined_sha256: manifest.combined_sha256 }
  };
  write('build/core-thesis/status-sovereignty/wave-02-review/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-02-review/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-02-review/data.json', stable(report));
  const rows = report.reviewed_observations.map((row) => `<tr><td><code>${esc(row.observation_id)}</code><br><code>${esc(row.lane_id)}</code></td><td>${esc(row.reviewed_disposition)}<br>${esc(row.control_class || '')}</td><td>${row.four_gate_assessment.map((g) => `<code>${esc(g.gate_id)}</code> ${esc(g.state)}`).join('<br>')}</td><td>${esc(row.review_finding)}</td><td>${row.open_acquisition.required ? esc(row.open_acquisition.missing_record) : 'closed for current disposition'}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-W02 maintainer review · Clifford Number</title><style>:root{background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1500px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><b>CLIFFORD NUMBER · SSC-H01 · NON-ADJUDICATIVE REVIEW</b></p><h1>Wave 02 maintainer review</h1><p class="state">8/8 MAINTAINER REVIEWED · 0 SECOND-PARTY · 0 ADJUDICATED · 0 COMPLETE COMPACT · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${review.counts.maintainer_reviewed}</b>reviewed</div><div class="card"><b>${review.counts.requires_additional_acquisition}</b>open acquisitions</div><div class="card"><b>${review.counts.effective_counterpower_controls}</b>effective-counterpower controls</div><div class="card"><b>${review.counts.disposition_changes}</b>disposition changes</div><div class="card"><b>${review.counts.supported_bounded_compact}</b>complete compact</div></div><h2>Review packets</h2><table><thead><tr><th>Observation</th><th>Disposition/control</th><th>Four gates</th><th>Finding</th><th>Acquisition</th></tr></thead><tbody>${rows}</tbody></table><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(review.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-02-review/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-wave-02-review: ${review.counts.maintainer_reviewed}/8 reviewed, ${review.counts.requires_additional_acquisition} open acquisitions, publication blocked`);
  return { intake, sources, wave, review, compact, fanout, registry, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildWave02Review();
