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
  '.github/workflows/project-stable-ground-alignment.yml',
  'data/project/project-stable-ground-alignment.json',
  'docs/milestones/project-stable-ground-alignment.md',
  'tools/build-project-stable-ground-alignment.mjs',
  'tools/validate-project-stable-ground-alignment.mjs',
  'test/project-stable-ground-alignment.test.js'
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
    schema_version: 'project-stable-ground-alignment-release-manifest@1',
    project_id: 'clifford-number',
    checkpoint_id: 'SG-2026-07-29-01',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      release_manifest_makes_branch_shadow_canonical: false,
      release_manifest_proves_external_effect: false,
      graph_effect: 'none'
    }
  };
}

export function buildAlignment() {
  const checkpoint = read('data/project/project-stable-ground-alignment.json');
  const manifest = computeReleaseManifest();
  write(
    'data/project/project-stable-ground-alignment-release-manifest.json',
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const canonical = checkpoint.canonical_snapshot;
  const report = {
    schema_version: 'project-stable-ground-alignment-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Project stable-ground alignment checkpoint',
    canonical_main: checkpoint.canonical_main,
    source_basis: checkpoint.source_basis,
    counts: {
      lineage_layers: checkpoint.project_lineage.length,
      stable_propositions: checkpoint.stable_propositions.length,
      authority_tiers: checkpoint.authority_tiers.length,
      noncanonical_active_surfaces: checkpoint.noncanonical_active_surfaces.length,
      drift_rows: checkpoint.drift_register.length,
      build_steps: checkpoint.build_order.length,
      k0_query_templates_executed: canonical.k0.query_templates_executed,
      k0_query_templates_total: canonical.k0.query_templates_total,
      k0_retained_records: canonical.k0.returned_records,
      k0_included_events: canonical.k0.included_events,
      m05_stories: canonical.m05_story_ecology.stories,
      field_candidates: canonical.sprint_09.candidate_records,
      external_reproduction_receipts: canonical.sprint_09.external_reproduction_receipts,
      a1_registry_entries: canonical.sprint_09.A1_registry_entries,
      a3_uses: canonical.sprint_09.A3_no_adverse_shadow_uses,
      a4_operations: canonical.sprint_09.A4_prospective_parallel_operations,
      a5_uses: canonical.sprint_09.A5_rights_bearing_uses
    },
    governing_shape: {
      diagnosis: 'distributed counterpower aversion / self-sealing sovereignty',
      causal_anatomy: ['K0', 'Clifford C1–C7', 'POOF'],
      counter_constitution: 'Answerable Power / APC-01',
      field_test: 'Question 4 / F0–F7'
    },
    project_lineage: checkpoint.project_lineage,
    stable_propositions: checkpoint.stable_propositions,
    canonical_snapshot: checkpoint.canonical_snapshot,
    noncanonical_active_surfaces: checkpoint.noncanonical_active_surfaces,
    namespace_and_ontology: checkpoint.namespace_and_ontology,
    drift_register: checkpoint.drift_register,
    build_order: checkpoint.build_order,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    release_manifest: {
      path: 'data/project/project-stable-ground-alignment-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

  const lineageRows = checkpoint.project_lineage.map((row) => `
    <tr>
      <td>${row.order}</td>
      <td><code>${esc(row.layer_id)}</code></td>
      <td>${esc(row.name)}</td>
      <td>${esc(row.current_authority)}</td>
      <td>${esc(row.current_limit)}</td>
    </tr>`).join('');

  const shadowRows = checkpoint.noncanonical_active_surfaces.map((row) => `
    <tr>
      <td><code>${esc(row.reference)}</code></td>
      <td>${esc(row.title)}</td>
      <td>${esc(row.state)}</td>
      <td>${esc(row.required_reconciliation)}</td>
    </tr>`).join('');

  const driftRows = checkpoint.drift_register.map((row) => `
    <tr>
      <td><code>${esc(row.drift_id)}</code></td>
      <td>${esc(row.observation)}</td>
      <td>${esc(row.current_resolution)}</td>
    </tr>`).join('');

  const buildRows = checkpoint.build_order.map((row) => `
    <tr>
      <td>${row.order}</td>
      <td>${esc(row.action)}</td>
      <td>${esc(row.exit_condition)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project stable ground · Clifford Number</title>
  <style>
  :root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  body{max-width:1480px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}
  h1{font-size:clamp(2rem,5vw,4.4rem);line-height:.98;letter-spacing:-.045em;max-width:980px}
  h2{margin-top:2.6rem}
  code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}
  pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
  .card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}
  .card{padding:16px}
  .card b{display:block;font-size:2rem;line-height:1.1}
  table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}
  th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}
  tr:last-child td{border-bottom:0}
  .state{font-weight:800;color:#8c300d}
  .boundary{border-left:6px solid #7c2920}
  .small{font-size:.9rem;color:#625d54}
  </style>
  </head>
  <body>
  <p><strong>CLIFFORD NUMBER · M-05 · STABLE GROUND</strong></p>
  <h1>Backward alignment before the next build</h1>
  <p class="state">CANONICAL BASE: ${esc(checkpoint.canonical_main.commit)} · EXTERNAL ADOPTION CEILING: A0</p>
  <p>${esc(checkpoint.canonical_main.meaning)}</p>

  <div class="grid">
    <div class="card"><b>${report.counts.lineage_layers}</b>lineage layers</div>
    <div class="card"><b>${report.counts.stable_propositions}</b>stable propositions</div>
    <div class="card"><b>${report.counts.k0_query_templates_executed}/${report.counts.k0_query_templates_total}</b>K0 templates</div>
    <div class="card"><b>${report.counts.m05_stories}</b>mainline M-05 stories</div>
    <div class="card"><b>${report.counts.field_candidates}</b>field candidates</div>
    <div class="card"><b>0</b>A1–A5 observations</div>
  </div>

  <h2>Governing shape</h2>
  <pre>diagnosis
  distributed counterpower aversion / self-sealing sovereignty

  causal anatomy
  K0 + Clifford C1–C7 + POOF

  counter-constitution
  Answerable Power / APC-01

  field test
  Question 4 / F0–F7</pre>

  <h2>Backward lineage</h2>
  <table>
  <thead><tr><th>#</th><th>Layer</th><th>Name</th><th>Authority</th><th>Ceiling</th></tr></thead>
  <tbody>${lineageRows}</tbody>
  </table>

  <h2>Current mainline state</h2>
  <pre>${esc(JSON.stringify(checkpoint.canonical_snapshot, null, 2))}</pre>

  <h2>Noncanonical active surfaces</h2>
  <table>
  <thead><tr><th>Reference</th><th>Surface</th><th>State</th><th>Required reconciliation</th></tr></thead>
  <tbody>${shadowRows}</tbody>
  </table>

  <h2>Recorded drift</h2>
  <table>
  <thead><tr><th>ID</th><th>Observation</th><th>Resolution</th></tr></thead>
  <tbody>${driftRows}</tbody>
  </table>

  <h2>Build order</h2>
  <table>
  <thead><tr><th>#</th><th>Action</th><th>Exit condition</th></tr></thead>
  <tbody>${buildRows}</tbody>
  </table>

  <h2>Boundary</h2>
  <pre class="boundary">${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre>

  <p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p>
  </body>
  </html>`;
  write('reports/core-thesis/stable-ground/index.html', `${html}\n`);

  console.log(
    `build-project-stable-ground-alignment: ${report.counts.lineage_layers} layers, ` +
    `${report.counts.stable_propositions} propositions, K0 ${report.counts.k0_query_templates_executed}/` +
    `${report.counts.k0_query_templates_total}, field candidates ${report.counts.field_candidates}`
  );
  return { checkpoint, manifest, report };
}

function main() {
  buildAlignment();
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
