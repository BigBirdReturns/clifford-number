#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WAVE_PATH = 'data/research/status-sovereignty-residual-denominator-wave-01.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-01.schema.json';
export const PROJECT_MANIFEST_PATH = 'data/project/status-sovereignty-residual-denominator-wave-01-release-manifest.json';
export const BUILD_ROOT = 'build/core-thesis/status-sovereignty/residual-denominator-wave-01';
export const REPORT_ROOT = 'reports/core-thesis/status-sovereignty/residual-denominator-wave-01';

export const releaseScope = [
  '.github/workflows/status-sovereignty-residual-denominator-wave-01.yml',
  'data/intake/status-sovereignty-six-gate-first-pass-reconciliation.json',
  'data/intake/status-sovereignty-natsec100-denominator-first-pass.json',
  'data/intake/status-sovereignty-sbicct-denominator-first-pass.json',
  'data/intake/status-sovereignty-osc-denominator-first-pass.json',
  'data/intake/status-sovereignty-f02-snap-gate-first-pass.json',
  'data/intake/status-sovereignty-f04-aces-governance-first-pass.json',
  'data/intake/status-sovereignty-f13-dcgsa-first-pass.json',
  'data/intake/status-sovereignty-rd01-natsec100-outcome-controls.json',
  'data/intake/status-sovereignty-rd02-sbicct-state-transitions.json',
  'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json',
  'data/intake/status-sovereignty-rd04-snap-state-remedy.json',
  'data/intake/status-sovereignty-rd05-aces-authority-control.json',
  'data/intake/status-sovereignty-rd06-dcgsa-support-exit.json',
  'data/research/status-sovereignty-residual-denominator-wave-01.json',
  'docs/milestones/ssc-rd01-natsec100-outcome-controls.md',
  'docs/milestones/ssc-rd02-sbicct-state-transitions.md',
  'docs/milestones/ssc-rd03-osc-instrument-lifecycle.md',
  'docs/milestones/ssc-rd04-snap-state-remedy.md',
  'docs/milestones/ssc-rd05-aces-authority-control.md',
  'docs/milestones/ssc-rd06-dcgsa-support-exit.md',
  'docs/milestones/ssc-residual-denominator-wave-01.md',
  'schemas/status-sovereignty-residual-denominator-wave-01.schema.json',
  'tools/build-status-sovereignty-residual-denominator-wave-01.mjs',
  'tools/validate-status-sovereignty-residual-denominator-wave-01.mjs',
  'test/status-sovereignty-residual-denominator-wave-01.test.js'
];

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readBytes = (root, rel) => fs.readFileSync(path.join(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlobSha1 = (bytes) => crypto.createHash('sha1').update(Buffer.concat([
  Buffer.from(`blob ${bytes.length}\0`, 'utf8'),
  bytes
])).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[c]));

export function computeReleaseManifest(root = ROOT) {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(root, rel);
    return { path: rel, git_blob_sha1: gitBlobSha1(bytes) };
  });
  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-01-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-RD-W01',
    issue: 615,
    as_of: '2026-08-01',
    hash_mode: 'git_blob_sha1_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(Buffer.from(entries.map((row) =>
      `${row.path}\0${row.git_blob_sha1}\n`).join(''), 'utf8')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_residual_class_closure: false,
      manifest_proves_review_or_adjudication: false,
      manifest_authorizes_graph_effect: false,
      manifest_authorizes_publication: false,
      functional_convergence_proves_common_purpose: false,
      graph_effect: 'none'
    }
  };
}

export function generateWaveOutputs(root = ROOT) {
  const wave = readJson(root, WAVE_PATH);
  const residualRegistry = wave.canonical_residual_atlas.groups.flatMap((group) => {
    const source = readJson(root, group.source_path);
    const labels = source[group.residual_field];
    return labels.map((label, index) => ({
      residual_id: `${group.lane_id}-R${String(index + 1).padStart(2, '0')}`,
      lane_id: group.lane_id,
      gate_id: group.gate_id,
      class_id: group.class_id,
      ordinal: index + 1,
      label,
      state: 'open',
      closure_evidence_observed: false,
      source_path: group.source_path,
      residual_field: group.residual_field
    }));
  });
  const lanes = wave.lane_receipts.map((receipt) => {
    const acquisition = readJson(root, receipt.acquisition_path);
    return {
      lane_id: receipt.lane_id,
      issue: receipt.issue,
      source_pr: receipt.source_pr,
      source_head: receipt.source_head,
      gate_id: receipt.gate_id,
      observation_id: receipt.observation_id,
      acquisition_path: receipt.acquisition_path,
      milestone_path: receipt.milestone_path,
      source_records: acquisition.sources.length,
      acquisition_open_record_lines: acquisition.open_denominators.length,
      canonical_residual_classes: receipt.canonical_count,
      source_terminal_state: acquisition.current_result.terminal_state,
      wave_terminal_receipt: receipt.wave_terminal_receipt,
      residual_class_id: receipt.residual_class_id,
      graph_effect: acquisition.current_result.graph_effect,
      publication_effect: acquisition.current_result.publication_effect,
      reviewed_disposition_changed: acquisition.current_result.reviewed_disposition_changed
    };
  });
  const manifest = computeReleaseManifest(root);
  const report = {
    schema_version: 'status-sovereignty-residual-denominator-wave-01-report@1',
    hypothesis_id: wave.hypothesis_id,
    wave_id: wave.wave_id,
    issue: wave.issue,
    as_of: wave.as_of,
    title: wave.title,
    authority: wave.authority,
    counts: wave.counts,
    current_result: wave.current_result,
    boundaries: wave.boundaries,
    canonical_residual_atlas: {
      ...wave.canonical_residual_atlas,
      registry: residualRegistry
    },
    lanes,
    release_manifest: {
      path: PROJECT_MANIFEST_PATH,
      combined_sha256: manifest.combined_sha256
    }
  };
  const rows = lanes.map((lane) => `<tr><td><code>${esc(lane.lane_id)}</code><br>#${lane.issue}</td><td><code>${esc(lane.wave_terminal_receipt)}</code><br><small>source: ${esc(lane.source_terminal_state)}</small></td><td>${lane.source_records}</td><td>${lane.acquisition_open_record_lines} → ${lane.canonical_residual_classes}</td><td>${esc(lane.graph_effect)} / ${esc(lane.publication_effect)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC residual-denominator Wave 01 · Clifford Number</title><style>:root{background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1400px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><b>CLIFFORD NUMBER · SSC-H01 · EVIDENCE-ONLY RECONCILIATION</b></p><h1>Residual-denominator Wave 01</h1><p class="state">6/6 TERMINAL RECEIPTS · 42/42 RESIDUAL CLASSES OPEN · 0 REVIEW CHANGES · GRAPH NONE · PUBLICATION NONE</p><div class="grid"><div class="card"><b>${wave.counts.execution_lanes}</b>lanes</div><div class="card"><b>${wave.counts.source_records}</b>source records</div><div class="card"><b>${wave.counts.canonical_residual_classes}</b>canonical residuals</div><div class="card"><b>${wave.counts.closed_residual_classes}</b>closed</div></div><h2>Typed lane receipts</h2><table><thead><tr><th>Lane</th><th>Receipt</th><th>Sources</th><th>Open records → classes</th><th>Effects</th></tr></thead><tbody>${rows}</tbody></table><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(wave.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>\n`;
  return {
    manifest,
    report,
    outputs: new Map([
      [PROJECT_MANIFEST_PATH, stable(manifest)],
      [`${BUILD_ROOT}/manifest.json`, stable(manifest)],
      [`${BUILD_ROOT}/data.json`, stable(report)],
      [`${REPORT_ROOT}/data.json`, stable(report)],
      [`${REPORT_ROOT}/index.html`, html]
    ])
  };
}

export function writeWaveOutputs(root = ROOT) {
  const generated = generateWaveOutputs(root);
  for (const [rel, content] of generated.outputs) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  console.log(`build-status-sovereignty-residual-denominator-wave-01: ${generated.report.lanes.length}/6 receipts, ${generated.report.counts.closed_residual_classes}/42 closed, publication none`);
  return generated;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) writeWaveOutputs();
