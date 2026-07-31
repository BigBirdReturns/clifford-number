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
  '.github/workflows/status-sovereignty-wave-01-targeted-acquisition.yml',
  'package.json',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  'schemas/status-sovereignty-targeted-acquisition.schema.json',
  'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md',
  'tools/build-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'test/status-sovereignty-wave-01-targeted-acquisition.test.js'
];

export function computeTargetedAcquisitionManifest() {
  const entries = releaseScope.map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-targeted-acquisition-release-manifest@1',
    hypothesis_id: 'SSC-H01', wave_id: 'SSC-W01', acquisition_id: 'SSC-W01-TA01', as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes', scope_ordered: true, self_included: false, entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_denominator: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_second_party_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildTargetedAcquisition() {
  const acquisition = read('data/research/status-sovereignty-wave-01-targeted-acquisition.json');
  const sources = read('data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json');
  const review = read('data/research/status-sovereignty-wave-01-maintainer-review.json');
  const manifest = computeTargetedAcquisitionManifest();
  write('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json', stable(manifest));
  const sourceById = new Map(sources.records.map((row) => [row.source_id, row]));
  const report = {
    schema_version: 'status-sovereignty-targeted-acquisition-report@1',
    ...acquisition,
    parent_review: {
      path: 'data/research/status-sovereignty-wave-01-maintainer-review.json',
      review_id: review.review_id,
      status: review.status,
      open_acquisition_obligations: review.open_acquisition_obligations
    },
    obligations: acquisition.obligations.map((row) => ({
      ...row,
      sources: row.source_ids.map((id) => {
        const source = sourceById.get(id);
        return source ? { source_id: id, title: source.title, publisher: source.publisher, url: source.url, source_class: source.source_class, authority: source.authority, limitations: source.limitations } : { source_id: id, missing: true };
      })
    })),
    source_plane: { path: 'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json', counts: sources.counts, boundaries: sources.boundaries },
    release_manifest: { path: 'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json', combined_sha256: manifest.combined_sha256 }
  };
  write('build/core-thesis/status-sovereignty/wave-01-targeted-acquisition/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-01-targeted-acquisition/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-01-targeted-acquisition/data.json', stable(report));

  const obligationRows = report.obligations.map((row) => `<tr><td><code>${esc(row.observation_id)}</code><br><code>${esc(row.lane_id)}</code></td><td>${esc(row.status)}</td><td>${esc(row.required_record)}</td><td>${esc(Object.entries(row.recovered).filter(([,v]) => typeof v !== 'object').map(([k,v]) => `${k}: ${v}`).join(' · '))}</td><td>${esc(row.remaining_absences.join(' · '))}</td><td>${row.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.source_id)}</a>`).join('<br>')}</td></tr>`).join('');
  const sourceRows = sources.records.map((row) => `<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a><br>${esc(row.publisher)}</td><td>${esc(row.source_class)}<br><code>${esc(row.authority)}</code></td><td>${esc(row.normalized_fact_record.join(' '))}</td><td>${esc(row.limitations.join(' '))}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-W01 targeted acquisition · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1540px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · TARGETED ACQUISITION</strong></p><h1>NatSec100, SBICCT, and OSC denominator repair</h1><p class="state">3/3 PARTIALLY REPAIRED · 3/3 STILL OPEN · 0 DISPOSITION CHANGES · 0 SECOND-PARTY · 0 ADJUDICATION · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${acquisition.counts.source_records}</b>source records</div><div class="card"><b>${acquisition.counts.natsec_selected_roster}</b>published NatSec selections</div><div class="card"><b>${acquisition.counts.sbicct_formal_applications_as_of_2024_10_22}</b>time-bounded SBICCT applications</div><div class="card"><b>${acquisition.counts.sbicct_first_cohort}</b>first-cohort funds</div><div class="card"><b>${acquisition.counts.osc_applications_minimum}+</b>OSC applications</div><div class="card"><b>$${(acquisition.counts.osc_named_amounts_usd/1e9).toFixed(3)}B</b>named OSC instruments</div><div class="card"><b>${acquisition.counts.closed}</b>obligations closed</div><div class="card"><b>${acquisition.counts.complete_compact_findings}</b>complete compact</div></div><h2>Obligation ledger</h2><table><thead><tr><th>Observation</th><th>Status</th><th>Required record</th><th>Recovered</th><th>Still absent</th><th>Sources</th></tr></thead><tbody>${obligationRows}</tbody></table><h2>Source ledger</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Normalized facts</th><th>Limits</th></tr></thead><tbody>${sourceRows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(acquisition.current_result,null,2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(acquisition.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-01-targeted-acquisition/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-wave-01-targeted-acquisition: ${acquisition.counts.source_records} sources, 3 obligations partially repaired, 0 closed`);
  return { acquisition, sources, review, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildTargetedAcquisition();
