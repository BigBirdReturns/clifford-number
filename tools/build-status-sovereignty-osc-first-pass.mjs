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
  '.github/workflows/status-sovereignty-osc-first-pass.yml',
  'data/intake/status-sovereignty-osc-denominator-first-pass.json',
  'schemas/status-sovereignty-osc-denominator-first-pass.schema.json',
  'docs/milestones/ssc-osc-denominator-first-pass.md',
  'tools/build-status-sovereignty-osc-first-pass.mjs',
  'tools/validate-status-sovereignty-osc-first-pass.mjs',
  'test/status-sovereignty-osc-first-pass.test.js'
];

export function computeOscFirstPassManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-osc-denominator-first-pass-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-F10',
    observation_id: 'SSC-OBS-0009',
    first_pass_id: 'SSC-F10-OSC-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_applicant_or_underwriting_denominator: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_commitment_closing_or_disbursement: false,
      manifest_proves_repayment_or_public_recovery: false,
      manifest_proves_favoritism_or_extraction: false,
      manifest_proves_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildOscFirstPass() {
  const record = read('data/intake/status-sovereignty-osc-denominator-first-pass.json');
  const manifest = computeOscFirstPassManifest();
  const program = record.published_program_denominator;
  const instruments = record.named_instrument_subset;
  const report = {
    schema_version: 'status-sovereignty-osc-denominator-first-pass-report@1',
    first_pass_id: 'SSC-F10-OSC-01',
    ...record,
    counts: {
      source_records: record.sources.length,
      applications_minimum: program.applications_minimum,
      requested_usd: program.requested_usd,
      initial_capacity_usd: program.initial_capacity_usd,
      states_represented: program.states_represented,
      request_minimum_usd: program.request_minimum_usd,
      request_maximum_usd: program.request_maximum_usd,
      complete_applicant_identity_denominators: program.complete_applicant_identities_published ? 1 : 0,
      complete_selected_rejected_denominators: program.complete_selected_and_rejected_rows_published ? 1 : 0,
      named_instruments: instruments.executed_direct_loans + instruments.conditional_commitments,
      executed_direct_loans: instruments.executed_direct_loans,
      conditional_commitments: instruments.conditional_commitments,
      named_amounts_usd: instruments.named_amounts_usd,
      reconciled_inaugural_NOFA_denominators: instruments.reconciled_to_inaugural_NOFA ? 1 : 0,
      complete_current_commitment_denominators: instruments.complete_current_OSC_commitment_denominator ? 1 : 0,
      state_distinctions: record.state_distinctions.length,
      open_denominators: record.open_denominators.length,
      observed_disbursement_denominators: 0,
      observed_repayment_denominators: 0,
      observed_public_recovery_denominators: 0,
      reviewed_disposition_changes: record.current_result.reviewed_disposition_changed ? 1 : 0,
      complete_underwriting_to_recovery_chains: record.current_result.complete_underwriting_to_recovery_chain ? 1 : 0,
      favoritism_findings: record.current_result.favoritism_finding ? 1 : 0,
      extraction_findings: record.current_result.extraction_finding ? 1 : 0,
      complete_compact_findings: record.current_result.complete_compact_finding ? 1 : 0,
      graph_effects: record.current_result.graph_effect === 'none' ? 0 : 1,
      publication_effects: record.current_result.publication_effect === 'none' ? 0 : 1
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-osc-denominator-first-pass-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-osc-denominator-first-pass-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/osc-first-pass/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/osc-first-pass/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/osc-first-pass/data.json', stable(report));

  const sourceRows = record.sources.map((source) => `<tr><td><code>${esc(source.source_id)}</code></td><td><a href="${esc(source.url)}">${esc(source.title)}</a><br>${esc(source.publisher)}</td><td>${esc(source.source_class)}</td><td>${esc(source.retrieved_facts.join(' '))}</td></tr>`).join('');
  const programRows = Object.entries(program).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const instrumentRows = Object.entries(instruments).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const stateRows = record.state_distinctions.map((item) => `<li><code>${esc(item)}</code></li>`).join('');
  const openRows = record.open_denominators.map((item) => `<li>${esc(item)}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Office of Strategic Capital denominator · first pass</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1460px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · SSC-F10 · ACQUISITION ONLY</strong></p><h1>Office of Strategic Capital applicant, underwriting, instrument, and recovery denominator</h1><p class="state">APPLICATION DENOMINATOR OPEN · CONDITIONAL COMMITMENT NOT EXECUTED LOAN · EXECUTED LOAN NOT DISBURSEMENT · PUBLIC RECOVERY UNOBSERVED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>${report.counts.source_records}</b>official sources</div><div class="card"><b>${report.counts.applications_minimum}+</b>applications</div><div class="card"><b>$${(report.counts.requested_usd / 1_000_000_000).toFixed(1)}B</b>requested</div><div class="card"><b>${report.counts.executed_direct_loans}</b>executed direct loan</div><div class="card"><b>${report.counts.conditional_commitments}</b>conditional commitments</div><div class="card"><b>${report.counts.observed_public_recovery_denominators}</b>public recovery denominator</div></div><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Published program denominator</h2><table><thead><tr><th>Predicate</th><th>Observed value</th></tr></thead><tbody>${programRows}</tbody></table><h2>Named instrument subset</h2><table><thead><tr><th>Predicate</th><th>Observed value</th></tr></thead><tbody>${instrumentRows}</tbody></table><h2>Non-collapsible state distinctions</h2><ul>${stateRows}</ul><h2>Official source ledger</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Recovered facts and limits</th></tr></thead><tbody>${sourceRows}</tbody></table><h2>Still required</h2><ul>${openRows}</ul><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/osc-first-pass/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-osc-first-pass: ${program.applications_minimum}+ applications, ${instruments.executed_direct_loans} executed loan, ${instruments.conditional_commitments} conditional commitments, 0 public recovery denominators`);
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildOscFirstPass();
}
