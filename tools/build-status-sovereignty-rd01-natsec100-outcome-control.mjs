#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'data/intake/status-sovereignty-rd01-natsec100-outcome-control.json';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const read = (rel) => JSON.parse(readBytes(rel).toString('utf8'));
const write = (rel, value) => { const target = path.join(root, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-rd01-natsec100-outcome-control.yml',
  sourcePath,
  'schemas/status-sovereignty-rd01-natsec100-outcome-control.schema.json',
  'docs/milestones/ssc-rd01-natsec100-outcome-control.md',
  'tools/build-status-sovereignty-rd01-natsec100-outcome-control.mjs',
  'tools/validate-status-sovereignty-rd01-natsec100-outcome-control.mjs',
  'test/status-sovereignty-rd01-natsec100-outcome-control.test.js'
];

export function computeNatSecOutcomeManifest() {
  const entries = releaseScope.map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-rd01-natsec100-outcome-control-release-manifest@1',
    execution_id: 'SSC-RD01-NATSEC100-OUTCOME-01',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-08-03',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_candidate_or_outcome_denominator: false,
      manifest_proves_ranking_causation_or_technical_superiority: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_coordination_common_purpose_or_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildNatSecOutcomeControl() {
  const record = read(sourcePath);
  const manifest = computeNatSecOutcomeManifest();
  const selected = record.sample.filter((row) => row.selection_state === 'selected');
  const nonselected = record.sample.filter((row) => row.selection_state !== 'selected');
  const report = {
    schema_version: 'status-sovereignty-rd01-natsec100-outcome-control-report@1',
    ...record,
    counts: {
      sample_rows: record.sample.length,
      selected_rows: selected.length,
      explicit_nonselection_rows: nonselected.length,
      exact_legal_entities_complete: 0,
      postpublication_capital_joins_complete: 0,
      postpublication_award_nonaward_joins_complete: 0,
      deployment_failure_exit_joins_complete: 0,
      matched_outcome_controls_complete: 0,
      identification_limits: record.identification_limits.length,
      open_denominators: record.open_denominators.length,
      selection_causation_findings: 0,
      technical_superiority_findings: 0,
      procurement_causation_findings: 0,
      coordination_findings: 0,
      common_purpose_findings: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-rd01-natsec100-outcome-control-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('data/project/status-sovereignty-rd01-natsec100-outcome-control-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/data.json', stable(report));
  const rows = record.sample.map((row) => `<tr><td><code>${esc(row.sample_id)}</code></td><td>${esc(row.selection_state)}</td><td>${row.rank ?? '—'}</td><td>${esc(row.published_name)}</td><td>${esc(row.legal_entity_state)}</td><td>not acquired</td><td>not identified</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC RD-01 · NatSec100 outcome controls</title><style>:root{color-scheme:light;background:#eeeae0;color:#171612;font-family:system-ui,sans-serif}body{max-width:1450px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · RD-01 · ACQUISITION ONLY</strong></p><h1>NatSec100 matched outcome and nonselection pilot</h1><p class="state">FIXED TOP–MIDDLE–BOTTOM SAMPLE · ALL EXPLICIT NONSELECTION EXAMPLES INCLUDED · POST-PUBLICATION OUTCOMES OPEN · RANKING CAUSATION NOT IDENTIFIED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>5</b>sample rows</div><div class="card"><b>3</b>selected ranks</div><div class="card"><b>2</b>explicit nonselection examples</div><div class="card"><b>0</b>complete outcome joins</div><div class="card"><b>6</b>open denominator classes</div><div class="card"><b>0</b>causal findings</div></div><h2>Frozen sample</h2><table><thead><tr><th>Row</th><th>State</th><th>Rank</th><th>Name</th><th>Entity state</th><th>Later outcomes</th><th>Rank effect</th></tr></thead><tbody>${rows}</tbody></table><h2>Identification limits</h2><pre class="boundary">${esc(JSON.stringify(record.identification_limits, null, 2))}</pre><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/index.html', `${html}\n`);
  console.log('build-status-sovereignty-rd01-natsec100-outcome-control: 5 rows, 0 complete outcome joins, 0 causal findings');
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildNatSecOutcomeControl();
