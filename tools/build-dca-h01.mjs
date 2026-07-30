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

export const releaseScope = [
  '.github/workflows/dca-h01.yml',
  'data/project/dca-h01-field-hypothesis.json',
  'data/project/dca-h01-crosswalk.json',
  'data/project/dca-h01-role-neutral-denominator.json',
  'schemas/dca-field-record.schema.json',
  'docs/methods/distributed-counterpower-aversion.md',
  'docs/milestones/m05-dca-h01-field-hypothesis.md',
  'tools/build-dca-h01.mjs',
  'tools/validate-dca-h01.mjs',
  'test/dca-h01.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return {
      path: rel,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length
    };
  });
  const combined_sha256 = crypto
    .createHash('sha256')
    .update(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''))
    .digest('hex');
  return {
    schema_version: 'dca-h01-release-manifest@1',
    hypothesis_id: 'DCA-H01',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_hypothesis: false,
      manifest_proves_prevalence: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function buildDca() {
  const hypothesis = read('data/project/dca-h01-field-hypothesis.json');
  const crosswalk = read('data/project/dca-h01-crosswalk.json');
  const denominator = read('data/project/dca-h01-role-neutral-denominator.json');
  const manifest = computeReleaseManifest();
  write('data/project/dca-h01-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const report = {
    schema_version: 'dca-h01-report@1',
    hypothesis_id: hypothesis.hypothesis_id,
    program_id: hypothesis.program_id,
    as_of: hypothesis.as_of,
    title: hypothesis.title,
    status: hypothesis.status,
    authority_tier: hypothesis.authority_tier,
    proposition: hypothesis.working_proposition,
    negative_constitution: hypothesis.negative_constitution,
    counts: {
      positional_controls: hypothesis.positional_control_surface.length,
      causal_stages: hypothesis.causal_sequence.length,
      k0_chain_stages: hypothesis.bounded_k0_chain.length,
      mechanisms: hypothesis.mechanisms.length,
      controls: hypothesis.controls.length,
      alternative_explanations: hypothesis.alternative_explanations.length,
      falsifiers: hypothesis.falsifiers.length,
      crosswalk_layers: crosswalk.layers.length,
      denominator_strata: denominator.strata.length,
      query_templates: denominator.frozen_query_templates.length,
      execution_records: denominator.records.length,
      executed_queries: denominator.execution.query_templates_executed
    },
    mechanisms: hypothesis.mechanisms,
    crosswalk: crosswalk.layers,
    denominator: {
      status: denominator.status,
      selection_unit: denominator.selection_unit,
      selection_universe: denominator.selection_universe,
      strata: denominator.strata,
      query_axes: denominator.query_axes,
      frozen_query_templates: denominator.frozen_query_templates,
      execution: denominator.execution
    },
    controls: hypothesis.controls,
    alternative_explanations: hypothesis.alternative_explanations,
    falsifiers: hypothesis.falsifiers,
    personal_and_outsider_boundary: hypothesis.personal_and_outsider_boundary,
    current_state: hypothesis.current_state,
    boundaries: hypothesis.boundaries,
    release_manifest: {
      path: 'data/project/dca-h01-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/distributed-counterpower-aversion/data.json', `${JSON.stringify(report, null, 2)}\n`);

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
  const mechanismRows = hypothesis.mechanisms.map((row) => `<tr><td><code>${esc(row.mechanism_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.required_observation)}</td><td>${esc(row.forbidden_inference)}</td></tr>`).join('');
  const layerRows = crosswalk.layers.map((row) => `<tr><td>${row.order}</td><td><code>${esc(row.layer_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.status)}</td><td>${esc(row.boundary)}</td></tr>`).join('');
  const controlRows = hypothesis.controls.map((row) => `<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.expected)}</td></tr>`).join('');
  const queryRows = denominator.frozen_query_templates.map((row) => `<tr><td><code>${esc(row.query_id)}</code></td><td>${esc(row.purpose)}</td><td>${esc(row.template)}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DCA-H01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1500px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.2rem,5vw,4.7rem);line-height:.98;letter-spacing:-.045em;max-width:1050px}h2{margin-top:2.6rem}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem;line-height:1.1}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · M-05 · AT-2 FIELD HYPOTHESIS</strong></p><h1>Distributed counterpower aversion</h1><p class="state">DCA-H01 · NO PREVALENCE FINDING · GRAPH EFFECT NONE</p>
<p>${esc(hypothesis.working_proposition)}</p><h2>Negative constitution under test</h2><pre>${esc(hypothesis.negative_constitution)}</pre>
<div class="grid"><div class="card"><b>${report.counts.mechanisms}</b>mechanisms</div><div class="card"><b>${report.counts.denominator_strata}</b>denominator strata</div><div class="card"><b>${report.counts.query_templates}</b>frozen query templates</div><div class="card"><b>${report.counts.controls}</b>controls</div><div class="card"><b>${report.counts.falsifiers}</b>falsifiers</div><div class="card"><b>0</b>executed field records</div></div>
<h2>Causal sequence</h2><pre>${esc(hypothesis.causal_sequence.join('\n→ '))}</pre>
<h2>Non-centralized mechanisms</h2><table><thead><tr><th>ID</th><th>Mechanism</th><th>Required observation</th><th>Forbidden inference</th></tr></thead><tbody>${mechanismRows}</tbody></table>
<h2>System crosswalk</h2><table><thead><tr><th>#</th><th>Layer</th><th>Name</th><th>Status</th><th>Boundary</th></tr></thead><tbody>${layerRows}</tbody></table>
<h2>Role-neutral queries</h2><table><thead><tr><th>ID</th><th>Purpose</th><th>Template</th></tr></thead><tbody>${queryRows}</tbody></table>
<h2>Controls</h2><table><thead><tr><th>ID</th><th>Control</th><th>Expected</th></tr></thead><tbody>${controlRows}</tbody></table>
<h2>Current state</h2><pre>${esc(JSON.stringify(hypothesis.current_state, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(hypothesis.boundaries, null, 2))}</pre><p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/distributed-counterpower-aversion/index.html', `${html}\n`);

  console.log(`build-dca-h01: ${report.counts.mechanisms} mechanisms, ${report.counts.denominator_strata} strata, ${report.counts.query_templates} query templates, ${report.counts.execution_records} records`);
  return { hypothesis, crosswalk, denominator, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildDca();
