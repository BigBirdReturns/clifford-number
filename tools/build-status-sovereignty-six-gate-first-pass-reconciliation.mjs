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
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-six-gate-first-pass-reconciliation.yml',
  'data/intake/status-sovereignty-six-gate-first-pass-reconciliation.json',
  'schemas/status-sovereignty-six-gate-first-pass-reconciliation.schema.json',
  'docs/milestones/ssc-six-gate-first-pass-reconciliation.md',
  'tools/build-status-sovereignty-six-gate-first-pass-reconciliation.mjs',
  'tools/validate-status-sovereignty-six-gate-first-pass-reconciliation.mjs',
  'test/status-sovereignty-six-gate-first-pass-reconciliation.test.js'
];

export function computeSixGateFirstPassManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-six-gate-first-pass-reconciliation-release-manifest@1',
    reconciliation_id: 'SSC-FANOUT-R01',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_residual_denominator_closure: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_complete_compact_or_racial_order: false,
      manifest_proves_prevalence_coordination_or_common_purpose: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildSixGateFirstPassReconciliation() {
  const record = read('data/intake/status-sovereignty-six-gate-first-pass-reconciliation.json');
  const manifest = computeSixGateFirstPassManifest();
  const verifiedGateReceipts = record.gate_receipts.map((receipt) => {
    const source = read(receipt.source_path);
    const laneManifest = read(receipt.release_manifest_path);
    const residual = source[receipt.residual_field];
    return {
      ...receipt,
      observed_release_sha256: laneManifest.combined_sha256,
      observed_source_records: source.sources.length,
      observed_residual_denominator_classes: Array.isArray(residual) ? residual.length : null,
      observed_terminal_state: source.current_result.terminal_state,
      observed_true_result_fields: Object.entries(source.current_result)
        .filter(([, value]) => value === true)
        .map(([key]) => key)
        .sort()
    };
  });
  const report = {
    schema_version: 'status-sovereignty-six-gate-first-pass-reconciliation-report@1',
    reconciliation_id: record.reconciliation_id,
    hypothesis_id: record.hypothesis_id,
    issue: record.issue,
    as_of: record.as_of,
    title: record.title,
    authority: record.authority,
    parent_program: record.parent_program,
    gate_receipts: verifiedGateReceipts,
    residual_denominator_atlas: record.residual_denominator_atlas,
    counts: {
      ...record.counts,
      retained_control_statements: record.gate_receipts.reduce((sum, receipt) => sum + receipt.retained_controls.length, 0),
      exact_lane_release_receipts: verifiedGateReceipts.filter((receipt) => receipt.observed_release_sha256 === receipt.release_sha256).length,
      intake_source_receipts: verifiedGateReceipts.length
    },
    current_result: record.current_result,
    boundaries: record.boundaries,
    release_manifest: {
      path: 'data/project/status-sovereignty-six-gate-first-pass-reconciliation-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-six-gate-first-pass-reconciliation-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/six-gate-first-pass/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/six-gate-first-pass/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/six-gate-first-pass/data.json', stable(report));

  const gateRows = verifiedGateReceipts.map((receipt) => `<tr><td><code>${esc(receipt.gate_id)}</code><br>issue #${receipt.issue} · PR #${receipt.pr}</td><td>${esc(receipt.lane_id)} · ${esc(receipt.observation_id)}</td><td>${receipt.source_records}</td><td>${receipt.residual_denominator_classes}</td><td><code>${esc(receipt.terminal_state)}</code></td><td>${esc(receipt.retained_controls.join('; '))}</td><td><code>${esc(receipt.release_sha256)}</code></td></tr>`).join('');
  const atlasRows = record.residual_denominator_atlas.map((row) => `<tr><td><code>${esc(row.class_id)}</code></td><td><code>${esc(row.gate_id)}</code></td><td>${row.count}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC six-gate first-pass reconciliation</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1520px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · CROSS-LANE RECONCILIATION ONLY</strong></p><h1>Six first-pass gates complete; forty-two denominator classes remain open</h1><p class="state">6/6 FIRST-PASS RECEIPTS · 25 SOURCE RECORDS · 42 RESIDUAL CLASSES · 0 RESIDUAL OBLIGATIONS CLOSED · 0 REVIEW CHANGES · 0 COMPLETE-COMPACT FINDINGS · GRAPH EFFECT NONE · PUBLICATION EFFECT NONE</p><div class="grid"><div class="card"><b>${report.counts.first_pass_lanes_completed}</b>first-pass lanes</div><div class="card"><b>${report.counts.source_records}</b>source records</div><div class="card"><b>${report.counts.residual_denominator_classes}</b>residual classes</div><div class="card"><b>${report.counts.residual_evidence_obligations_closed}</b>residual obligations closed</div><div class="card"><b>${report.counts.exact_lane_release_receipts}</b>exact lane receipts</div><div class="card"><b>${report.counts.complete_compact_findings}</b>complete-compact findings</div></div><h2>Gate receipts</h2><table><thead><tr><th>Gate</th><th>Lane / observation</th><th>Sources</th><th>Residual classes</th><th>Terminal state</th><th>Controls and non-links</th><th>Release SHA-256</th></tr></thead><tbody>${gateRows}</tbody></table><h2>Residual denominator atlas</h2><table><thead><tr><th>Class</th><th>Gate</th><th>Count</th></tr></thead><tbody>${atlasRows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Cross-lane authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>reconciliation release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/six-gate-first-pass/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-six-gate-first-pass-reconciliation: ${report.counts.first_pass_lanes_completed}/6 lanes, ${report.counts.source_records} sources, ${report.counts.residual_denominator_classes} residual classes, 0 promotions`);
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSixGateFirstPassReconciliation();
}
