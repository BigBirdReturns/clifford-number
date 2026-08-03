#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const readJson = (rel) => JSON.parse(readBytes(rel).toString('utf8'));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

function walk(rel) {
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(rel, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

export function locateOscLifecycleSource() {
  const candidates = [...walk('data/intake'), ...walk('data/research')]
    .filter((rel) => rel.endsWith('.json'))
    .map((rel) => {
      try { return { rel, value: readJson(rel) }; } catch { return null; }
    })
    .filter(Boolean);
  const byIssue = candidates.find(({ value }) => value?.issue === 619);
  if (byIssue) return byIssue.rel;
  const byName = candidates.find(({ rel }) => /rd03|osc.*instrument.*lifecycle|osc.*lifecycle/i.test(rel));
  if (!byName) throw new Error('RD-03 OSC lifecycle source ledger not found');
  return byName.rel;
}

function locateMilestone() {
  const candidates = walk('docs/milestones').filter((rel) => /rd03|osc.*instrument.*lifecycle|osc.*lifecycle/i.test(rel));
  if (!candidates.length) throw new Error('RD-03 OSC lifecycle milestone not found');
  return candidates.sort()[0];
}

export function sourceScope() {
  return [
    '.github/workflows/status-sovereignty-rd03-osc-lifecycle.yml',
    locateOscLifecycleSource(),
    'schemas/status-sovereignty-rd03-osc-lifecycle.schema.json',
    locateMilestone(),
    'tools/build-status-sovereignty-rd03-osc-lifecycle.mjs',
    'tools/validate-status-sovereignty-rd03-osc-lifecycle.mjs',
    'test/status-sovereignty-rd03-osc-lifecycle.test.js'
  ];
}

export function computeOscLifecycleManifest() {
  const entries = sourceScope().map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-rd03-osc-lifecycle-release-manifest@1',
    execution_id: 'SSC-RD03-OSC-LIFECYCLE-01',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_OSC_cohort: false,
      manifest_proves_underwriting_quality: false,
      manifest_proves_closing_disbursement_performance_or_recovery: false,
      manifest_proves_favoritism_or_extraction: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildOscLifecycle() {
  const sourcePath = locateOscLifecycleSource();
  const source = readJson(sourcePath);
  const sourceText = JSON.stringify(source);
  const requiredTokens = [
    'MP Materials', 'Vulcan Elements', 'ReElement Technologies',
    'Phoenix Tailings', 'Energy Fuels'
  ];
  for (const token of requiredTokens) {
    if (!sourceText.includes(token)) throw new Error(`OSC source ledger missing ${token}`);
  }

  const manifest = computeOscLifecycleManifest();
  const instrumentStates = [
    { name: 'MP Materials', announced_usd: 150000000, legal_state: 'executed_direct_loan', cash_disbursement_observed: true, repayment_observed: false, public_recovery_observed: false },
    { name: 'Vulcan Elements', announced_usd: 620000000, legal_state: 'conditional_preclose_commitment', cash_disbursement_observed: false, repayment_observed: false, public_recovery_observed: false },
    { name: 'ReElement Technologies', announced_usd: 80000000, legal_state: 'conditional_preclose_commitment', cash_disbursement_observed: false, repayment_observed: false, public_recovery_observed: false },
    { name: 'Phoenix Tailings', announced_usd: 500000000, legal_state: 'conditional_preclose_commitment', cash_disbursement_observed: false, repayment_observed: false, public_recovery_observed: false },
    { name: 'Energy Fuels', announced_usd: 725000000, legal_state: 'conditional_preclose_commitment', cash_disbursement_observed: false, repayment_observed: false, public_recovery_observed: false }
  ];
  const report = {
    schema_version: 'status-sovereignty-rd03-osc-lifecycle@1',
    execution_id: 'SSC-RD03-OSC-LIFECYCLE-01',
    hypothesis_id: 'SSC-H01',
    issue: 619,
    parent_issue: 615,
    lane_id: 'SSC-F10',
    authority: 'source_acquisition_only_not_review_or_adjudication',
    source_ledger_path: sourcePath,
    counts: {
      source_records: 9,
      named_instruments: 5,
      executed_loans: 1,
      cash_disbursements_observed: 1,
      conditional_preclose_commitments: 4,
      milestone_records_observed: 0,
      repayments_observed: 0,
      public_recoveries_observed: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    instrument_states: instrumentStates,
    current_result: {
      terminal_state: 'partial_lifecycle_one_disbursed_four_preclose_recovery_open',
      reviewed_disposition_changed: false,
      complete_underwriting_to_recovery_chain: false,
      favoritism_finding: false,
      extraction_finding: false,
      complete_compact_finding: false,
      graph_effect: 'none',
      publication_effect: 'none'
    },
    boundaries: {
      conditional_commitment_is_executed_loan: false,
      executed_loan_is_full_disbursement: false,
      announced_warrant_is_issued_public_right: false,
      repayment_terms_are_observed_repayment: false,
      named_subset_is_complete_cohort: false,
      private_capacity_proves_extraction: false,
      strategic_financing_proves_favoritism: false,
      graph_effect: 'none'
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-rd03-osc-lifecycle-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-rd03-osc-lifecycle-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd03-osc-lifecycle/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd03-osc-lifecycle/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/rd03-osc-lifecycle/data.json', stable(report));

  const rows = instrumentStates.map((row) => `<tr><td>${esc(row.name)}</td><td>$${row.announced_usd.toLocaleString('en-US')}</td><td><code>${esc(row.legal_state)}</code></td><td>${row.cash_disbursement_observed ? 'observed' : 'not observed'}</td><td>not observed</td><td>not observed</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC RD-03 · OSC lifecycle</title><style>:root{color-scheme:light;background:#eeeae0;color:#171612;font-family:system-ui,sans-serif}body{max-width:1400px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · RD-03 · ACQUISITION ONLY</strong></p><h1>Office of Strategic Capital instrument lifecycle</h1><p class="state">ONE EXECUTED AND CASH-DISBURSED LOAN · FOUR CONDITIONAL PRE-CLOSE COMMITMENTS · REPAYMENT AND PUBLIC RECOVERY UNOBSERVED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>9</b>source records</div><div class="card"><b>5</b>named instruments</div><div class="card"><b>1</b>cash disbursement observed</div><div class="card"><b>4</b>pre-close commitments</div><div class="card"><b>0</b>repayments observed</div><div class="card"><b>0</b>public recoveries observed</div></div><h2>Typed lifecycle states</h2><table><thead><tr><th>Instrument</th><th>Announced amount</th><th>Legal state</th><th>Cash movement</th><th>Repayment</th><th>Public recovery</th></tr></thead><tbody>${rows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(report.current_result, null, 2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(report.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/rd03-osc-lifecycle/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-rd03-osc-lifecycle: 5 instruments, 1 cash disbursement, 0 repayments, 0 public recoveries`);
  return { source, sourcePath, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildOscLifecycle();
