#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stable = value => JSON.stringify(value, null, 2) + '\n';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

export const releaseScope = [
  '.github/workflows/k0-wave01-additional-acquisition.yml',
  'data/research/k0-wave01-additional-acquisition-resolution.json',
  'docs/milestones/m05-k0-wave01-additional-acquisition.md',
  'tools/build-k0-wave01-additional-acquisition.mjs',
  'tools/validate-k0-wave01-additional-acquisition.mjs',
  'test/k0-wave01-additional-acquisition.test.js',
];

export function computeAdditionalAcquisitionManifest(root = defaultRoot) {
  const entries = releaseScope.map(rel => {
    const data = fs.readFileSync(path.join(root, rel));
    return { path: rel, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'k0-wave01-additional-acquisition-release-manifest@1',
    program_id: 'M-05',
    layer_id: 'K0',
    resolution_id: 'K0-W01-ADD-2026-07-28-MAINTAINER',
    as_of: '2026-07-28',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_event_truth: false,
      maintainer_resolution_proves_independence: false,
      supported_for_human_review_creates_event: false,
      settlement_proves_complete_remedy: false,
      manifest_creates_graph_effect: false,
    },
  };
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[c]));

export function buildAdditionalAcquisition(root = defaultRoot) {
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const write = (rel, value) => {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value);
  };

  const resolution = read('data/research/k0-wave01-additional-acquisition-resolution.json');
  const manifest = computeAdditionalAcquisitionManifest(root);
  const report = {
    schema_version: 'k0-wave01-additional-acquisition-report@1',
    program_id: resolution.program_id,
    layer_id: resolution.layer_id,
    resolution_id: resolution.resolution_id,
    title: 'K0 Wave 01 additional-acquisition resolution',
    status: 'maintainer_additional_acquisition_complete_independent_review_open',
    as_of: resolution.as_of,
    counts: resolution.counts,
    method: resolution.method,
    rows: resolution.rows,
    current_result: resolution.current_result,
    boundaries: resolution.boundaries,
    release_manifest: {
      path: 'data/project/k0-wave01-additional-acquisition-release-manifest.json',
      combined_sha256: manifest.combined_sha256,
    },
  };

  const rows = resolution.rows.map(row => {
    const sourceLinks = row.source_packets.map(packet =>
      `<li><a href="${esc(packet.url)}">${esc(packet.source_class)}</a></li>`
    ).join('');
    return `<tr>
      <td><code>${esc(row.record_id)}</code></td>
      <td>${esc(row.matter)}</td>
      <td>${esc(row.resolution_disposition)}</td>
      <td>${esc(row.provisional_ccd_chain_depth)}</td>
      <td>${esc(row.furthest_documented_stage)}</td>
      <td><ul>${sourceLinks}</ul></td>
    </tr>`;
  }).join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>K0 Wave 01 additional acquisition</title>
<style>
body{font:16px/1.55 system-ui;max-width:1300px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}
code,pre{font-family:ui-monospace,SFMono-Regular,monospace}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}
.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}
table{border-collapse:collapse;width:100%}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}
.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}
</style>
</head>
<body>
<p><b>CLIFFORD NUMBER · M-05 · K0</b></p>
<h1>K0 Wave 01 additional-acquisition resolution</h1>
<p class="state">MAINTAINER RESOLUTION COMPLETE · INDEPENDENT REVIEW OPEN · PUBLICATION BLOCKED · GRAPH INERT</p>
<div class="metrics">
  <div class="metric"><b>${resolution.counts.records_resolved}</b>records resolved</div>
  <div class="metric"><b>${resolution.counts.supported_for_human_review}</b>supported for review</div>
  <div class="metric"><b>${resolution.counts.remaining_requires_additional_acquisition}</b>remaining gaps</div>
  <div class="metric"><b>${resolution.counts.provisional_chain_depth_6}</b>provisional CCD 6</div>
  <div class="metric"><b>${resolution.counts.included_events}</b>included events</div>
</div>
<h2>Resolved records</h2>
<table>
<tr><th>ID</th><th>Matter</th><th>Disposition</th><th>Chain CCD</th><th>Furthest</th><th>Official packets</th></tr>
${rows}
</table>
<h2>Method</h2>
<pre class="box">${esc(JSON.stringify(resolution.method, null, 2))}</pre>
<h2>Current result</h2>
<pre class="box boundary">${esc(JSON.stringify(resolution.current_result, null, 2))}</pre>
<p><code>release SHA-256: ${manifest.combined_sha256}</code></p>
</body>
</html>
`;

  write('data/project/k0-wave01-additional-acquisition-release-manifest.json', stable(manifest));
  write('reports/core-thesis/answerable-power/k0-wave01-additional-acquisition.json', stable(report));
  write('reports/core-thesis/answerable-power/k0-wave01-additional-acquisition.html', html);
  console.log(`build-k0-wave01-additional-acquisition: ${resolution.counts.records_resolved} resolved, ${resolution.counts.supported_for_human_review} supported, ${resolution.counts.included_events} included`);
  return { resolution, manifest, report };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) buildAdditionalAcquisition();
