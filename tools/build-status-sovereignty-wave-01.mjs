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
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-wave-01.yml',
  '.github/workflows/status-sovereignty-wave-01-review.yml',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'schemas/status-sovereignty-observation.schema.json',
  'docs/milestones/m05-status-sovereignty-wave-01.md',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'tools/build-status-sovereignty-wave-01.mjs',
  'tools/validate-status-sovereignty-wave-01.mjs',
  'test/status-sovereignty-wave-01.test.js',
  'tools/build-status-sovereignty-wave-01-review.mjs',
  'tools/validate-status-sovereignty-wave-01-review.mjs',
  'test/status-sovereignty-wave-01-review.test.js'
];

export function computeWave01Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-wave-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-W01',
    as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      normalized_facts_equal_source_bytes: false,
      manifest_proves_complete_compact: false,
      manifest_proves_prevalence: false,
      manifest_proves_racial_order: false,
      manifest_proves_coordination: false,
      manifest_authorizes_graph_edge: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildWave01() {
  const wave = read('data/research/status-sovereignty-wave-01.json');
  const sources = read('data/research/status-sovereignty-wave-01-source-receipts.json');
  const hypothesis = read('data/project/status-sovereignty-compact.json');
  const fanout = read('data/project/status-sovereignty-fanout.json');
  const review = read('data/research/status-sovereignty-wave-01-maintainer-review.json');
  const manifest = computeWave01Manifest();
  write('data/project/status-sovereignty-wave-01-release-manifest.json', stable(manifest));

  const sourceById = new Map(sources.records.map((row) => [row.source_id, row]));
  const report = {
    schema_version: 'status-sovereignty-wave-report@1',
    hypothesis_id: wave.hypothesis_id,
    wave_id: wave.wave_id,
    as_of: wave.as_of,
    title: wave.title,
    status: wave.status,
    publication_status: wave.current_result.publication_status,
    selection_contract: wave.selection_contract,
    counts: wave.counts,
    lane_counts: wave.lane_counts,
    disposition_counts: wave.disposition_counts,
    executed_lane_ids: wave.executed_lane_ids,
    observations: wave.observations.map((observation) => ({
      ...observation,
      sources: observation.source_ids.map((sourceId) => {
        const source = sourceById.get(sourceId);
        return source ? {
          source_id: source.source_id,
          title: source.title,
          publisher: source.publisher,
          url: source.url,
          issued_at: source.issued_at,
          source_class: source.source_class,
          authority: source.authority,
          retrieval_status: source.retrieval.status,
          limitations: source.limitations
        } : { source_id: sourceId, missing: true };
      })
    })),
    source_receipts: {
      path: wave.source_receipts_path,
      selection_window: sources.selection_window,
      counts: sources.counts,
      records: sources.records,
      boundaries: sources.boundaries
    },
    parent_hypothesis: {
      path: 'data/project/status-sovereignty-compact.json',
      status: hypothesis.status,
      gates: hypothesis.four_gate_discriminator.length,
      dimensions: hypothesis.dimensions.length,
      publication_status: hypothesis.current_state.publication_status
    },
    fanout: {
      path: 'data/project/status-sovereignty-fanout.json',
      total_lanes: fanout.lanes.length,
      executed_lanes: fanout.lanes.filter((row) => row.execution.started).map((row) => ({
        lane_id: row.lane_id,
        title: row.title,
        records_retained: row.execution.records_retained
      }))
    },
    maintainer_review: {
      path: 'data/research/status-sovereignty-wave-01-maintainer-review.json',
      review_id: review.review_id,
      status: review.status,
      counts: review.counts,
      current_result: review.current_result
    },
    current_result: wave.current_result,
    boundaries: wave.boundaries,
    release_manifest: {
      path: 'data/project/status-sovereignty-wave-01-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('build/core-thesis/status-sovereignty/wave-01/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-01/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-01/data.json', stable(report));

  const observationRows = report.observations.map((row) => `<tr><td><code>${esc(row.observation_id)}</code><br><code>${esc(row.lane_id)}</code></td><td>${esc(row.disposition)}<br><code>${esc(row.review_state)}</code></td><td>${esc(row.observed_facts.join(' '))}</td><td>${esc(row.working_interpretation)}</td><td>${row.sources.map((source) => `<a href="${esc(source.url)}">${esc(source.source_id)}</a>`).join('<br>')}</td></tr>`).join('');
  const laneRows = Object.entries(report.lane_counts).map(([lane, count]) => `<tr><td><code>${esc(lane)}</code></td><td>${count}</td></tr>`).join('');
  const dispositionRows = Object.entries(report.disposition_counts).map(([state, count]) => `<tr><td><code>${esc(state)}</code></td><td>${count}</td></tr>`).join('');
  const sourceRows = sources.records.map((row) => `<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a><br>${esc(row.publisher)}</td><td>${esc(row.source_class)}</td><td>${esc(row.retrieval.status)}</td><td>${esc(row.limitations.join(' '))}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-H01 Wave 01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1560px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,5vw,4.8rem);line-height:.98;letter-spacing:-.045em;max-width:1180px}h2{margin-top:2.6rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem;line-height:1.1}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}a{color:#6b2b16}</style></head><body>
<p><strong>CLIFFORD NUMBER · SSC-H01 · FIELD WAVE</strong></p><h1>Wave 01: allocator, selector, capital, and counterpower</h1><p class="state">EXECUTED · MAINTAINER REVIEWED 14/14 · SECOND-PARTY REVIEW 0 · COMPLETE-COMPACT FINDINGS 0 · RACIAL-ORDER FINDING FALSE · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p>
<p>${esc(wave.selection_contract.selection_universe)}</p><div class="grid"><div class="card"><b>${wave.counts.source_records}</b>source records</div><div class="card"><b>${wave.counts.maintainer_reviewed}</b>maintainer reviewed</div><div class="card"><b>${wave.counts.observations}</b>observations</div><div class="card"><b>${wave.counts.executed_lanes}/16</b>executed lanes</div><div class="card"><b>${wave.counts.partial_functional_convergence}</b>partial convergence</div><div class="card"><b>${wave.counts.ordinary_patriotic_or_industrial_policy}</b>controls</div><div class="card"><b>${wave.counts.requires_additional_acquisition}</b>open acquisition</div><div class="card"><b>${wave.counts.capital_conversion_unsupported}</b>unsupported capital claim</div><div class="card"><b>${wave.counts.supported_bounded_compact}</b>complete compact</div></div>
<h2>Disposition denominator</h2><table><thead><tr><th>Disposition</th><th>Count</th></tr></thead><tbody>${dispositionRows}</tbody></table>
<h2>Lane denominator</h2><table><thead><tr><th>Lane</th><th>Retained observations</th></tr></thead><tbody>${laneRows}</tbody></table>
<h2>Observation packets</h2><table><thead><tr><th>Observation</th><th>Disposition</th><th>Observed facts</th><th>Interpretation ceiling</th><th>Sources</th></tr></thead><tbody>${observationRows}</tbody></table>
<h2>Declared source universe</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Retrieval</th><th>Limits</th></tr></thead><tbody>${sourceRows}</tbody></table>
<h2>Current result</h2><pre>${esc(JSON.stringify(wave.current_result, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(wave.boundaries, null, 2))}</pre><p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-01/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-wave-01: ${wave.counts.source_records} sources, ${wave.counts.observations} observations, ${wave.counts.executed_lanes}/16 lanes, ${wave.counts.supported_bounded_compact} complete compact`);
  return { wave, sources, hypothesis, fanout, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildWave01();
