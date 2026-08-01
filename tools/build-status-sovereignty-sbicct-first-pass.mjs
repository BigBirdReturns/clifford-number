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
  '.github/workflows/status-sovereignty-sbicct-first-pass.yml',
  'data/intake/status-sovereignty-sbicct-denominator-first-pass.json',
  'schemas/status-sovereignty-sbicct-denominator-first-pass.schema.json',
  'docs/milestones/ssc-sbicct-denominator-first-pass.md',
  'tools/build-status-sovereignty-sbicct-first-pass.mjs',
  'tools/validate-status-sovereignty-sbicct-first-pass.mjs',
  'test/status-sovereignty-sbicct-first-pass.test.js'
];

export function computeSbicctFirstPassManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-sbicct-denominator-first-pass-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-F10',
    observation_id: 'SSC-OBS-0008',
    first_pass_id: 'SSC-F10-SBICCT-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_applicant_or_fund_flow_denominator: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_leverage_draw_or_realized_investment: false,
      manifest_proves_public_recovery_or_extraction: false,
      manifest_proves_favoritism_or_coordination: false,
      manifest_proves_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildSbicctFirstPass() {
  const record = read('data/intake/status-sovereignty-sbicct-denominator-first-pass.json');
  const manifest = computeSbicctFirstPassManifest();
  const checkpoints = record.recovered_checkpoints;
  const report = {
    schema_version: 'status-sovereignty-sbicct-denominator-first-pass-report@1',
    first_pass_id: 'SSC-F10-SBICCT-01',
    ...record,
    counts: {
      source_records: record.sources.length,
      expressions_of_interest_minimum: checkpoints.expressions_of_interest_minimum,
      formal_applications_as_of_2024_10_22: checkpoints.formal_applications_as_of_2024_10_22,
      approved_as_of_2024_10_22: checkpoints.approved_as_of_2024_10_22,
      first_published_cohort: checkpoints.first_published_cohort,
      publicly_named_first_cohort: checkpoints.publicly_named_first_cohort,
      withheld_first_cohort: checkpoints.withheld_first_cohort,
      fully_licensed_as_of_2025_01_17: checkpoints.fully_licensed_as_of_2025_01_17,
      state_distinctions: record.state_distinctions.length,
      open_denominators: record.open_denominators.length,
      complete_applicant_denominators: 0,
      complete_fund_flow_denominators: 0,
      observed_public_recovery_denominators: 0,
      reviewed_disposition_changes: record.current_result.reviewed_disposition_changed ? 1 : 0,
      complete_public_private_risk_and_recovery_chains: record.current_result.complete_public_private_risk_and_recovery_chain ? 1 : 0,
      capital_conversion_findings: record.current_result.capital_conversion_finding ? 1 : 0,
      complete_compact_findings: record.current_result.complete_compact_finding ? 1 : 0,
      graph_effects: record.current_result.graph_effect === 'none' ? 0 : 1,
      publication_effects: record.current_result.publication_effect === 'none' ? 0 : 1
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-sbicct-denominator-first-pass-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-sbicct-denominator-first-pass-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/sbicct-first-pass/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/sbicct-first-pass/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/sbicct-first-pass/data.json', stable(report));

  const sourceRows = record.sources.map((source) => `<tr><td><code>${esc(source.source_id)}</code></td><td><a href="${esc(source.url)}">${esc(source.title)}</a><br>${esc(source.publisher)}</td><td>${esc(source.source_class)}</td><td>${esc(source.retrieved_facts.join(' '))}</td></tr>`).join('');
  const checkpointRows = Object.entries(checkpoints).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const stateRows = record.state_distinctions.map((item) => `<li><code>${esc(item)}</code></li>`).join('');
  const openRows = record.open_denominators.map((item) => `<li>${esc(item)}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SBIC Critical Technologies denominator · first pass</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1460px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · SSC-F10 · ACQUISITION ONLY</strong></p><h1>SBIC Critical Technologies applicant, leverage, performance, and recovery denominator</h1><p class="state">APPLICATION CHECKPOINT RECOVERED · FIRST COHORT RECOVERED · LICENSE NOT DRAW · PROJECTED INVESTMENT NOT REALIZED PERFORMANCE · PUBLIC RECOVERY UNOBSERVED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>${report.counts.source_records}</b>official sources</div><div class="card"><b>${report.counts.formal_applications_as_of_2024_10_22}</b>formal applications</div><div class="card"><b>${report.counts.first_published_cohort}</b>first-cohort funds</div><div class="card"><b>${report.counts.fully_licensed_as_of_2025_01_17}</b>fully licensed</div><div class="card"><b>${report.counts.state_distinctions}</b>state boundaries</div><div class="card"><b>${report.counts.observed_public_recovery_denominators}</b>public recovery denominator</div></div><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Recovered checkpoints</h2><table><thead><tr><th>Checkpoint</th><th>Observed value</th></tr></thead><tbody>${checkpointRows}</tbody></table><h2>Non-collapsible state distinctions</h2><ul>${stateRows}</ul><h2>Official source ledger</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Recovered facts and limits</th></tr></thead><tbody>${sourceRows}</tbody></table><h2>Still required</h2><ul>${openRows}</ul><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/sbicct-first-pass/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-sbicct-first-pass: ${checkpoints.formal_applications_as_of_2024_10_22} applications, ${checkpoints.first_published_cohort} cohort funds, 0 public recovery denominators`);
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSbicctFirstPass();
}
