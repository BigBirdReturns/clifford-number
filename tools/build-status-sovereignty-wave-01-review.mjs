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
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-wave-01-review.yml',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'schemas/status-sovereignty-observation.schema.json',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'tools/build-status-sovereignty-wave-01-review.mjs',
  'tools/validate-status-sovereignty-wave-01-review.mjs',
  'test/status-sovereignty-wave-01-review.test.js'
];

export function computeWave01ReviewManifest() {
  const entries = releaseScope.map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-maintainer-review-release-manifest@1',
    hypothesis_id: 'SSC-H01', wave_id: 'SSC-W01', review_id: 'SSC-W01-MR01', as_of: '2026-07-30',
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

export function buildWave01Review() {
  const review = read('data/research/status-sovereignty-wave-01-maintainer-review.json');
  const wave = read('data/research/status-sovereignty-wave-01.json');
  const sources = read('data/research/status-sovereignty-wave-01-source-receipts.json');
  const manifest = computeWave01ReviewManifest();
  write('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json', stable(manifest));
  const sourceById = new Map(sources.records.map((row) => [row.source_id, row]));
  const report = {
    schema_version: 'status-sovereignty-maintainer-review-report@1',
    ...review,
    source_wave: { path: review.source_wave_path, status: wave.status, counts: wave.counts, current_result: wave.current_result },
    reviewed_observations: review.reviewed_observations.map((row) => ({
      ...row,
      sources: row.source_ids.map((id) => { const source = sourceById.get(id); return source ? { source_id:id, title:source.title, publisher:source.publisher, url:source.url, source_class:source.source_class, limitations:source.limitations } : { source_id:id, missing:true }; })
    })),
    release_manifest: { path: 'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json', combined_sha256: manifest.combined_sha256 }
  };
  write('build/core-thesis/status-sovereignty/wave-01-review/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-01-review/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-01-review/data.json', stable(report));
  const rows = report.reviewed_observations.map((row) => `<tr><td><code>${esc(row.observation_id)}</code><br><code>${esc(row.lane_id)}</code></td><td>${esc(row.reviewed_disposition)}<br>${esc(row.control_class || '')}</td><td>${row.four_gate_assessment.map((g) => `<code>${esc(g.gate_id)}</code> ${esc(g.state)}`).join('<br>')}</td><td>${esc(row.review_finding)}</td><td>${row.open_acquisition.required ? esc(row.open_acquisition.missing_record) : 'closed for current disposition'}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-W01 maintainer review · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1500px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · NON-ADJUDICATIVE REVIEW</strong></p><h1>Wave 01 maintainer review</h1><p class="state">14/14 MAINTAINER REVIEWED · 0 SECOND-PARTY · 0 ADJUDICATED · 0 COMPLETE COMPACT · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${review.counts.maintainer_reviewed}</b>maintainer reviewed</div><div class="card"><b>${review.counts.effective_counterpower_controls}</b>effective-counterpower controls</div><div class="card"><b>${review.counts.ordinary_industrial_policy_controls}</b>industrial-policy controls</div><div class="card"><b>${review.counts.requires_additional_acquisition}</b>open acquisitions</div><div class="card"><b>${review.counts.disposition_changes}</b>disposition changes</div><div class="card"><b>${review.counts.supported_bounded_compact}</b>complete compact</div></div><h2>Review packets</h2><table><thead><tr><th>Observation</th><th>Disposition/control</th><th>Four gates</th><th>Maintainer finding</th><th>Acquisition</th></tr></thead><tbody>${rows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(review.current_result,null,2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(review.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-01-review/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-wave-01-review: ${review.counts.maintainer_reviewed}/14 reviewed, ${review.counts.supported_bounded_compact} complete compact, publication blocked`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildWave01Review();
