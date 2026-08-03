#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'data/intake/status-sovereignty-rd02-sbicct-state-transitions.json';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const read = (rel) => JSON.parse(readBytes(rel).toString('utf8'));
const write = (rel, value) => { const target = path.join(root, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-rd02-sbicct-state-transitions.yml',
  sourcePath,
  'schemas/status-sovereignty-rd02-sbicct-state-transitions.schema.json',
  'docs/milestones/ssc-rd02-sbicct-state-transitions.md',
  'tools/build-status-sovereignty-rd02-sbicct-state-transitions.mjs',
  'tools/validate-status-sovereignty-rd02-sbicct-state-transitions.mjs',
  'test/status-sovereignty-rd02-sbicct-state-transitions.test.js'
];

export function computeSbicTransitionsManifest() {
  const entries = releaseScope.map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-rd02-sbicct-state-transitions-release-manifest@1',
    execution_id: 'SSC-RD02-SBICCT-TRANSITIONS-01',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-08-03',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_named_fund_specific_transition_mapping: false,
      manifest_proves_leverage_draw_performance_repayment_or_public_recovery: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_favoritism_extraction_coordination_or_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildSbicTransitions() {
  const record = read(sourcePath);
  const manifest = computeSbicTransitionsManifest();
  const published = record.cohort_slots.filter((row) => row.identity_state === 'published_identity_requires_source_transcription');
  const withheld = record.cohort_slots.filter((row) => row.identity_state === 'withheld_under_sba_policy');
  const report = {
    schema_version: 'status-sovereignty-rd02-sbicct-state-transitions-report@1',
    ...record,
    counts: {
      cohort_slots: record.cohort_slots.length,
      published_identity_slots: published.length,
      withheld_slots: withheld.length,
      fully_licensed_aggregate: record.aggregate_states.fully_licensed_as_of_2025_01_17,
      fund_specific_license_mappings: 0,
      fund_specific_leverage_commitments: 0,
      fund_specific_leverage_draws: 0,
      portfolio_investment_ledgers: 0,
      realized_performance_ledgers: 0,
      repayment_or_loss_ledgers: 0,
      public_recovery_ledgers: 0,
      open_denominators: record.open_denominators.length,
      capital_conversion_findings: 0,
      favoritism_findings: 0,
      extraction_findings: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-rd02-sbicct-state-transitions-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('data/project/status-sovereignty-rd02-sbicct-state-transitions-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/data.json', stable(report));
  const rows = record.cohort_slots.map((row) => `<tr><td>${row.slot}</td><td><code>${esc(row.identity_state)}</code></td><td>unresolved</td><td>unresolved</td><td>unresolved</td><td>unresolved</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC RD-02 · SBIC state transitions</title><style>:root{color-scheme:light;background:#eeeae0;color:#171612;font-family:system-ui,sans-serif}body{max-width:1450px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · RD-02 · ACQUISITION ONLY</strong></p><h1>SBIC Critical Technologies first-cohort state transitions</h1><p class="state">ALL EIGHTEEN SLOTS PRESERVED · ONE WITHHELD ROW RETAINED · SEVEN AGGREGATE LICENSES NOT ASSIGNED TO FUNDS · DRAW, PERFORMANCE, REPAYMENT, AND PUBLIC RECOVERY UNRESOLVED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>18</b>cohort slots</div><div class="card"><b>17</b>published identities requiring transcription</div><div class="card"><b>1</b>withheld row</div><div class="card"><b>7</b>aggregate licensed count</div><div class="card"><b>0</b>fund-specific mappings</div><div class="card"><b>0</b>public recovery ledgers</div></div><h2>Preserved denominator</h2><table><thead><tr><th>Slot</th><th>Identity state</th><th>License</th><th>Draw</th><th>Performance</th><th>Recovery</th></tr></thead><tbody>${rows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/index.html', `${html}\n`);
  console.log('build-status-sovereignty-rd02-sbicct-state-transitions: 18 slots, 7 aggregate licenses, 0 fund-specific recovery ledgers');
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildSbicTransitions();
