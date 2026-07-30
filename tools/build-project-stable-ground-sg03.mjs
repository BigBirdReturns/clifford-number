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
  '.github/workflows/project-stable-ground-sg03.yml',
  '.github/workflows/project-stable-ground-sg02.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-sg03.json',
  'data/project/project-stable-ground-current.json',
  'docs/milestones/project-stable-ground-sg03.md',
  'tools/build-project-stable-ground-sg03.mjs',
  'tools/validate-project-stable-ground-sg03.mjs',
  'tools/validate-project-stable-ground-sg02.mjs',
  'test/project-stable-ground-sg03.test.js',
  'test/project-stable-ground-sg02.test.js'
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
    schema_version: 'project-stable-ground-sg03-release-manifest@1',
    checkpoint_id: 'SG-2026-07-29-03',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_deployment: false,
      manifest_advances_adoption: false,
      historical_checkpoint_recomputed: false,
      graph_effect: 'none'
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

export function buildStableGroundSG03() {
  const checkpoint = read('data/project/project-stable-ground-sg03.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const manifest = computeReleaseManifest();

  write(
    'data/project/project-stable-ground-sg03-release-manifest.json',
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const snapshot = checkpoint.canonical_snapshot;
  const report = {
    schema_version: 'project-stable-ground-sg03-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Stable-ground supersession 03 · Canonical POOF/Clifford ecology',
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
      fanout_owner_lanes: checkpoint.fanout_state.owner_lanes.length,
      dca_execution_waves: checkpoint.fanout_state.dca_execution_waves.length,
      poof_jurisdictions: snapshot.poof.jurisdictions,
      poof_transaction_objects: snapshot.poof.typed_transaction_objects,
      poof_routes: snapshot.poof.routes,
      poof_effect_dimensions: snapshot.poof.operational_effect_dimensions,
      poof_change_receipts: snapshot.poof.constitutional_change_receipts,
      core_thesis_report_contracts: snapshot.core_thesis.report_contracts,
      m05_stories: snapshot.m05_story_ecology.stories,
      m05_research_lanes: snapshot.m05_story_ecology.research_lanes,
      k0_executed: snapshot.k0.query_templates_executed,
      k0_total: snapshot.k0.query_templates_total,
      dca_executed: snapshot.dca.query_templates_executed,
      dca_total: snapshot.dca.frozen_query_templates,
      external_reproduction_receipts: snapshot.sprint_09.external_reproduction_receipts,
      a1_registry_entries: snapshot.sprint_09.A1_registry_entries,
      a3_uses: snapshot.sprint_09.A3_no_adverse_shadow_uses,
      a4_operations: snapshot.sprint_09.A4_prospective_parallel_operations,
      a5_uses: snapshot.sprint_09.A5_rights_bearing_uses
    },
    canonical_snapshot: snapshot,
    fanout_state: checkpoint.fanout_state,
    lifecycle_repair: checkpoint.lifecycle_repair,
    build_order: checkpoint.build_order,
    drift_resolutions: checkpoint.drift_resolutions,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    poof_release: {
      path: 'data/project/poof-clifford-ecology-release-manifest.json',
      combined_sha256: poofRelease.combined_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg03-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg03/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const laneRows = checkpoint.fanout_state.owner_lanes.map((row) => `
    <tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.surface)}</td><td>${esc(row.purpose)}</td><td>${esc(row.state)}</td></tr>`).join('');
  const historyRows = pointer.history.map((row) => `
    <tr><td><code>${esc(row.checkpoint_id)}</code></td><td><code>${esc(row.path)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const driftRows = checkpoint.drift_resolutions.map((row) => `
    <tr><td><code>${esc(row.drift_id)}</code></td><td>${esc(row.prior_state)}</td><td>${esc(row.current_resolution)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SG-03 · Canonical POOF ecology · Clifford Number</title>
<style>
:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{max-width:1480px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}
h1{font-size:clamp(2rem,5vw,4.4rem);line-height:.98;letter-spacing:-.045em;max-width:1050px}
h2{margin-top:2.6rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px}
.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}
table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}
code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}
.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}
</style>
</head>
<body>
<p><strong>CLIFFORD NUMBER · M-05 · STABLE GROUND</strong></p>
<h1>Canonical POOF ecology, unchanged empirical ceiling</h1>
<p class="state">CURRENT CHECKPOINT: ${esc(checkpoint.checkpoint_id)} · EXTERNAL ADOPTION: A0 · POOF DEPLOYED: FALSE</p>
<p>${esc(checkpoint.canonical_main.meaning)}</p>
<div class="grid">
  <div class="card"><b>${report.counts.checkpoints_preserved}</b>preserved checkpoints</div>
  <div class="card"><b>${report.counts.poof_jurisdictions}</b>POOF jurisdictions</div>
  <div class="card"><b>${report.counts.poof_transaction_objects}</b>typed transactions</div>
  <div class="card"><b>${report.counts.poof_routes}</b>staged routes</div>
  <div class="card"><b>${report.counts.m05_stories}</b>M-05 stories</div>
  <div class="card"><b>${report.counts.k0_executed}/${report.counts.k0_total}</b>K0 templates</div>
  <div class="card"><b>${report.counts.dca_executed}/${report.counts.dca_total}</b>DCA templates</div>
  <div class="card"><b>0</b>A1–A5 observations</div>
</div>
<h2>Authority change</h2>
<pre>${esc(JSON.stringify(checkpoint.authority_change, null, 2))}</pre>
<h2>Checkpoint history</h2>
<table><thead><tr><th>Checkpoint</th><th>Path</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table>
<h2>Fan-out state</h2>
<table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th></tr></thead><tbody>${laneRows}</tbody></table>
<h2>Drift resolved</h2>
<table><thead><tr><th>ID</th><th>Prior state</th><th>Current resolution</th></tr></thead><tbody>${driftRows}</tbody></table>
<h2>Current snapshot</h2>
<pre>${esc(JSON.stringify(snapshot, null, 2))}</pre>
<h2>Boundary</h2>
<pre class="boundary">${esc(JSON.stringify(checkpoint.boundaries, null, 2))}</pre>
<p class="small"><code>POOF release SHA-256: ${esc(poofRelease.combined_sha256)}</code></p>
<p class="small"><code>SG-03 release SHA-256: ${esc(manifest.combined_sha256)}</code></p>
</body>
</html>`;
  write('reports/core-thesis/stable-ground/sg03/index.html', `${html}\n`);

  console.log(
    `build-project-stable-ground-sg03: ${pointer.history.length} checkpoints, POOF ${snapshot.poof.jurisdictions} jurisdictions/` +
    `${snapshot.poof.typed_transaction_objects} objects, K0 ${snapshot.k0.query_templates_executed}/${snapshot.k0.query_templates_total}, ` +
    `DCA ${snapshot.dca.query_templates_executed}/${snapshot.dca.frozen_query_templates}`
  );
  return { checkpoint, pointer, governor, manifest, report };
}

function main() {
  buildStableGroundSG03();
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
