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
  '.github/workflows/status-sovereignty-compact.yml',
  'data/intake/status-sovereignty-compact-source.md',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'schemas/status-sovereignty-observation.schema.json',
  'docs/methods/status-sovereignty-compact.md',
  'docs/milestones/m05-status-sovereignty-fanout.md',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'test/status-sovereignty-compact.test.js',
  'data/project/core-thesis.json',
  'tools/build-core-thesis.mjs',
  'tools/validate-core-thesis.mjs',
  'test/core-thesis.test.js',
  'data/project/dca-h01-field-hypothesis.json',
  'data/project/m05-answerable-power-story-registry.json',
  'data/project/m05-answerable-power-fanout.json',
  'data/project/security-state-organism-program.json',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'package.json'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_hypothesis: false,
      manifest_proves_prevalence: false,
      manifest_proves_racial_order: false,
      manifest_authorizes_graph_edge: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildStatusSovereignty() {
  const hypothesis = read('data/project/status-sovereignty-compact.json');
  const fanout = read('data/project/status-sovereignty-fanout.json');
  const sources = read('data/project/status-sovereignty-source-registry.json');
  const manifest = computeReleaseManifest();
  write('data/project/status-sovereignty-release-manifest.json', stable(manifest));

  const report = {
    schema_version: 'status-sovereignty-report@1',
    hypothesis_id: hypothesis.hypothesis_id,
    program_id: hypothesis.program_id,
    as_of: hypothesis.as_of,
    title: hypothesis.title,
    status: hypothesis.status,
    authority_tier: hypothesis.authority_tier,
    publication_status: hypothesis.current_state.publication_status,
    working_proposition: hypothesis.working_proposition,
    negative_constitution: hypothesis.negative_constitution,
    counts: {
      gates: hypothesis.four_gate_discriminator.length,
      dimensions: hypothesis.dimensions.length,
      causal_stages: hypothesis.causal_sequence.length,
      fanout_lanes: fanout.lanes.length,
      issue_groups: fanout.issue_groups.length,
      external_references: sources.external_references.length,
      repository_sources: sources.repository_sources.length,
      executed_lanes: fanout.lanes.filter((row) => row.execution.started).length,
      retained_observations: fanout.lanes.reduce((sum, row) => sum + row.execution.records_retained, 0),
      alternatives: hypothesis.alternative_explanations.length,
      falsifiers: hypothesis.falsifiers.length,
      forbidden_inferences: hypothesis.forbidden_inferences.length
    },
    racial_order_hypothesis: hypothesis.racial_order_hypothesis,
    patriotism_discriminator: hypothesis.patriotism_discriminator,
    four_gate_discriminator: hypothesis.four_gate_discriminator,
    causal_sequence: hypothesis.causal_sequence,
    dimensions: hypothesis.dimensions,
    fanout: fanout.lanes,
    source_registry: {
      source_document: sources.source_document,
      external_references: sources.external_references,
      repository_sources: sources.repository_sources,
      counts: sources.counts
    },
    alternative_explanations: hypothesis.alternative_explanations,
    falsifiers: hypothesis.falsifiers,
    forbidden_inferences: hypothesis.forbidden_inferences,
    current_state: hypothesis.current_state,
    boundaries: hypothesis.boundaries,
    release_manifest: {
      path: 'data/project/status-sovereignty-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('build/core-thesis/status-sovereignty/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/data.json', stable(report));

  const gateRows = hypothesis.four_gate_discriminator.map((row) => `<tr><td><code>${esc(row.gate_id)}</code></td><td><strong>${esc(row.name)}</strong><br>${esc(row.question)}</td><td>${esc(row.required_record)}</td><td>${esc(row.forbidden_inference)}</td></tr>`).join('');
  const dimensionRows = hypothesis.dimensions.map((row) => `<tr><td><code>${esc(row.dimension_id)}</code></td><td>${esc(row.label)}</td><td>${esc(row.question)}</td><td>${esc(row.required_observation)}</td></tr>`).join('');
  const laneRows = fanout.lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code><br>${row.issue_numbers.map((n) => `<a href="https://github.com/BigBirdReturns/clifford-number/issues/${n}">#${n}</a>`).join(' ')}</td><td>${esc(row.title)}</td><td>${esc(row.question)}</td><td>${esc(row.selection_unit)}</td><td>${esc(row.allowed_terminal_states.join(' · '))}</td></tr>`).join('');
  const sourceRows = sources.external_references.map((row) => `<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a><br>${esc(row.publisher)}</td><td>${esc(row.source_class)}</td><td>${esc(row.custody)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-H01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1500px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.2rem,5vw,4.8rem);line-height:.98;letter-spacing:-.045em;max-width:1120px}h2{margin-top:2.6rem}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem;line-height:1.1}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}a{color:#6b2b16}</style></head><body>
<p><strong>CLIFFORD NUMBER · M-05 · AT-2 FIELD HYPOTHESIS</strong></p><h1>Status-for-sovereignty compact</h1><p class="state">SSC-H01 · ZERO EXECUTION · NO RACIAL-ORDER FINDING · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p>
<p>${esc(hypothesis.working_proposition)}</p><h2>Negative constitution under test</h2><pre>${esc(hypothesis.negative_constitution)}</pre>
<div class="grid"><div class="card"><b>${report.counts.gates}</b>gates</div><div class="card"><b>${report.counts.dimensions}</b>dimensions</div><div class="card"><b>${report.counts.fanout_lanes}</b>fanout lanes</div><div class="card"><b>${report.counts.issue_groups}</b>issue groups</div><div class="card"><b>${report.counts.external_references}</b>source-provided references</div><div class="card"><b>0</b>executed lanes</div></div>
<h2>Patriotism discriminator</h2><pre>${esc(JSON.stringify(hypothesis.patriotism_discriminator, null, 2))}</pre>
<h2>Four-gate discriminator</h2><table><thead><tr><th>Gate</th><th>Question</th><th>Required record</th><th>Forbidden inference</th></tr></thead><tbody>${gateRows}</tbody></table>
<h2>Causal sequence</h2><pre>${esc(hypothesis.causal_sequence.join('\n→ '))}</pre>
<h2>Ten dimensions</h2><table><thead><tr><th>ID</th><th>Dimension</th><th>Question</th><th>Required observation</th></tr></thead><tbody>${dimensionRows}</tbody></table>
<h2>Sixteen-lane fanout</h2><table><thead><tr><th>Lane</th><th>Title</th><th>Question</th><th>Selection unit</th><th>Terminal states</th></tr></thead><tbody>${laneRows}</tbody></table>
<h2>Source-provided external references</h2><p class="small">These references are preserved from the supplied synthesis and were not independently retrieved in this change.</p><table><thead><tr><th>ID</th><th>Source</th><th>Class</th><th>Custody</th></tr></thead><tbody>${sourceRows}</tbody></table>
<h2>Current state</h2><pre>${esc(JSON.stringify(hypothesis.current_state, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(hypothesis.boundaries, null, 2))}</pre><p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-compact: ${report.counts.gates} gates, ${report.counts.dimensions} dimensions, ${report.counts.fanout_lanes} lanes, ${report.counts.retained_observations} observations`);
  return { hypothesis, fanout, sources, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStatusSovereignty();
