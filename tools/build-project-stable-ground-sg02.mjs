#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = (rel) => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};

export const releaseScope = [
  '.github/workflows/project-stable-ground-sg02.yml',
  'data/project/project-stable-ground-sg02.json',
  'data/project/project-stable-ground-current.json',
  'docs/milestones/project-stable-ground-sg02.md',
  'tools/build-project-stable-ground-sg02.mjs',
  'tools/validate-project-stable-ground-sg02.mjs',
  'test/project-stable-ground-sg02.test.js'
];

export function computeSg02Manifest() {
  const entries = releaseScope.map((rel) => {
    const content = bytes(rel);
    return {
      path: rel,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
      bytes: content.length
    };
  });
  const combined_sha256 = crypto
    .createHash('sha256')
    .update(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''))
    .digest('hex');
  return {
    schema_version: 'project-stable-ground-sg02-release-manifest@1',
    checkpoint_id: 'SG-2026-07-29-02',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_hypothesis: false,
      manifest_proves_prevalence: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildSg02() {
  const checkpoint = read('data/project/project-stable-ground-sg02.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const sg01 = read('data/project/project-stable-ground-alignment.json');
  const dca = read('data/project/dca-h01-field-hypothesis.json');
  const denominator = read('data/project/dca-h01-role-neutral-denominator.json');
  const k0 = read('data/research/k0-role-neutral-denominator.json');
  const stories = read('data/project/m05-answerable-power-story-registry.json');
  const sprint08 = read('data/project/m05-answerable-power-sprint-08-plan.json');
  const sprint09 = read('data/project/m05-answerable-power-sprint-09-plan.json');
  const manifest = computeSg02Manifest();

  write('data/project/project-stable-ground-sg02-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const report = {
    schema_version: 'project-stable-ground-sg02-report@1',
    checkpoint_id: checkpoint.checkpoint_id,
    supersedes: checkpoint.supersedes,
    trigger: checkpoint.trigger,
    canonical_main: checkpoint.canonical_main,
    authority_change: checkpoint.authority_change,
    counts: {
      preserved_stable_propositions: checkpoint.preserved_stable_propositions.length,
      fanout_owner_lanes: checkpoint.fanout_state.owner_lanes.length,
      dca_execution_waves: checkpoint.fanout_state.dca_execution_waves.length,
      dca_mechanisms: dca.mechanisms.length,
      dca_denominator_strata: denominator.strata.length,
      dca_query_templates_total: denominator.frozen_query_templates.length,
      dca_query_templates_executed: denominator.execution.query_templates_executed,
      dca_field_records: denominator.execution.records_retained,
      k0_query_templates_executed: k0.execution.query_templates_executed,
      k0_query_templates_total: k0.search_battery.length,
      m05_stories: stories.counts.stories,
      external_reproduction_receipts: sprint09.current_result.external_reproduction_receipts,
      A1_registry_entries: sprint09.current_result.A1_registry_entries,
      A3_no_adverse_shadow_uses: sprint09.current_result.A3_no_adverse_shadow_uses,
      A4_prospective_parallel_operations: sprint09.current_result.A4_prospective_parallel_operations,
      A5_rights_bearing_uses: sprint09.current_result.A5_rights_bearing_uses
    },
    preserved_checkpoint: {
      checkpoint_id: sg01.checkpoint_id,
      canonical_main: sg01.canonical_main,
      stable_propositions: sg01.stable_propositions,
      authority_tiers: sg01.authority_tiers
    },
    current_snapshot: checkpoint.canonical_snapshot,
    fanout_state: checkpoint.fanout_state,
    build_order: checkpoint.build_order,
    drift_resolutions: checkpoint.drift_resolutions,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    pointer,
    release_manifest: {
      path: 'data/project/project-stable-ground-sg02-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg02/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
  const laneRows = checkpoint.fanout_state.owner_lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.surface)}</td><td>${esc(row.purpose)}</td><td>${esc(row.state)}</td><td>${esc(row.dependency)}</td></tr>`).join('');
  const waveRows = checkpoint.fanout_state.dca_execution_waves.map((row) => `<tr><td>#${row.issue}</td><td>${esc(row.query_ids.join(', '))}</td><td>${esc(row.state)}</td></tr>`).join('');
  const buildRows = checkpoint.build_order.map((row) => `<tr><td>${row.order}</td><td>${esc(row.action)}</td><td>${esc(row.state)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SG-2026-07-29-02 · Clifford Number</title><style>:root{background:#f1eee6;color:#181713;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1500px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2.4rem,6vw,5.4rem);line-height:.96;letter-spacing:-.05em;max-width:1100px}h2{margin-top:2.8rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;text-align:left;vertical-align:top;border-bottom:1px solid #ddd6c9}tr:last-child td{border:0}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f5f0e4;padding:18px;border-radius:12px}.state{font-weight:800;color:#8b2f0e}.boundary{border-left:6px solid #842e24}</style></head><body><p><strong>CLIFFORD NUMBER · PROJECT STATE CHECKPOINT</strong></p><h1>Stable ground · supersession 02</h1><p class="state">DCA-H01 CANONICAL AT-2 · PREVALENCE EXECUTION ZERO · ADOPTION A0</p><p>SG-02 preserves SG-01 and records the single authority transition from a named issue-level hypothesis to a canonical, graph-inert field-hypothesis object.</p><div class="grid"><div class="card"><b>${report.counts.preserved_stable_propositions}</b>stable propositions preserved</div><div class="card"><b>${report.counts.fanout_owner_lanes}</b>fan-out owner lanes</div><div class="card"><b>${report.counts.dca_execution_waves}</b>DCA execution waves</div><div class="card"><b>${report.counts.dca_query_templates_executed}/${report.counts.dca_query_templates_total}</b>DCA queries executed</div><div class="card"><b>${report.counts.k0_query_templates_executed}/${report.counts.k0_query_templates_total}</b>K0 queries</div><div class="card"><b>A0</b>maximum verified adoption</div></div><h2>Authority change</h2><pre>${esc(JSON.stringify(checkpoint.authority_change, null, 2))}</pre><h2>Fan-out owner lanes</h2><table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th><th>Dependency</th></tr></thead><tbody>${laneRows}</tbody></table><h2>DCA execution waves</h2><table><thead><tr><th>Issue</th><th>Queries</th><th>State</th></tr></thead><tbody>${waveRows}</tbody></table><h2>Build order</h2><table><thead><tr><th>#</th><th>Action</th><th>State</th></tr></thead><tbody>${buildRows}</tbody></table><h2>Current empirical ceiling</h2><pre>${esc(JSON.stringify(checkpoint.canonical_snapshot.sprint_09, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg02/index.html', `${html}\n`);

  console.log(`build-project-stable-ground-sg02: ${report.counts.fanout_owner_lanes} lanes, ${report.counts.dca_execution_waves} DCA waves, adoption ${checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level}`);
  return { checkpoint, pointer, sg01, dca, denominator, k0, stories, sprint08, sprint09, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildSg02();
