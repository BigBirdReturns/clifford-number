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
  '.github/workflows/status-sovereignty-natsec100-first-pass.yml',
  'data/intake/status-sovereignty-natsec100-denominator-first-pass.json',
  'schemas/status-sovereignty-natsec100-denominator-first-pass.schema.json',
  'docs/milestones/ssc-natsec100-denominator-first-pass.md',
  'tools/build-status-sovereignty-natsec100-first-pass.mjs',
  'tools/validate-status-sovereignty-natsec100-first-pass.mjs',
  'test/status-sovereignty-natsec100-first-pass.test.js'
];

export function computeNatSec100FirstPassManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-natsec100-denominator-first-pass-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-F09',
    observation_id: 'SSC-OBS-0007',
    first_pass_id: 'SSC-F09-NS100-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_candidate_or_rejected_denominator: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_technical_superiority: false,
      manifest_proves_capital_or_procurement_causation: false,
      manifest_proves_coordination_or_common_purpose: false,
      manifest_proves_complete_compact_or_prevalence: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildNatSec100FirstPass() {
  const record = read('data/intake/status-sovereignty-natsec100-denominator-first-pass.json');
  const manifest = computeNatSec100FirstPassManifest();
  const recovered = record.recovered_denominator;
  const downstream = record.downstream_join_state;
  const report = {
    schema_version: 'status-sovereignty-natsec100-denominator-first-pass-report@1',
    first_pass_id: 'SSC-F09-NS100-01',
    ...record,
    counts: {
      source_records: record.sources.length,
      published_selected_rows: recovered.published_selected_rows,
      explicit_assessed_nonselection_examples: recovered.explicit_assessed_nonselection_examples,
      complete_candidate_denominators: recovered.complete_candidate_rows === null ? 0 : 1,
      complete_rejected_denominators: recovered.complete_rejected_rows === null ? 0 : 1,
      exact_weights_published: recovered.exact_weights_published ? 1 : 0,
      reproducible_scoring_data_published: recovered.reproducible_scoring_data_published ? 1 : 0,
      FOCI_decision_records_published: recovered.FOCI_decision_records_published ? 1 : 0,
      capital_denominators_complete: downstream.capital_denominator_complete ? 1 : 0,
      award_nonaward_denominators_complete: downstream.award_and_nonaward_denominator_complete ? 1 : 0,
      deployment_failure_denominators_complete: downstream.deployment_and_failure_denominator_complete ? 1 : 0,
      exit_denominators_complete: downstream.exit_denominator_complete ? 1 : 0,
      matched_nonselected_controls_complete: downstream.matched_nonselected_controls_complete ? 1 : 0,
      causal_joins_generated: downstream.causal_join_generated ? 1 : 0,
      next_acquisitions: record.next_acquisitions.length,
      reviewed_disposition_changes: record.current_result.reviewed_disposition_changed ? 1 : 0,
      complete_compact_findings: record.current_result.complete_compact_finding ? 1 : 0,
      racial_order_findings: record.current_result.racial_order_finding ? 1 : 0,
      prevalence_findings: record.current_result.prevalence_finding ? 1 : 0,
      coordination_findings: record.current_result.coordination_finding ? 1 : 0,
      common_purpose_findings: record.current_result.common_purpose_finding ? 1 : 0,
      graph_effects: record.current_result.graph_effect === 'none' ? 0 : 1,
      publication_effects: record.current_result.publication_effect === 'none' ? 0 : 1
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-natsec100-denominator-first-pass-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-natsec100-denominator-first-pass-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/natsec100-first-pass/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/natsec100-first-pass/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/natsec100-first-pass/data.json', stable(report));

  const sourceRows = record.sources.map((source) => `<tr><td><code>${esc(source.source_id)}</code></td><td><a href="${esc(source.url)}">${esc(source.title)}</a><br>${esc(source.publisher)}</td><td>${esc(source.source_class)}</td><td>${esc(source.retrieved_facts.join(' '))}</td><td>${esc(source.does_not_support.join(' · '))}</td></tr>`).join('');
  const denominatorRows = Object.entries(recovered).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value === null ? 'unknown' : value)}</td></tr>`).join('');
  const downstreamRows = Object.entries(downstream).map(([key, value]) => `<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');
  const acquisitionRows = record.next_acquisitions.map((item) => `<li>${esc(item)}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NatSec100 selector denominator · first pass</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1460px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · SSC-F09 · ACQUISITION ONLY</strong></p><h1>NatSec100 selector and downstream-outcome denominator</h1><p class="state">SELECTED ROSTER RECOVERED · CANDIDATE UNIVERSE OPEN · EXACT WEIGHTS UNPUBLISHED · CAUSAL JOINS ZERO · TECHNICAL SUPERIORITY NOT ESTABLISHED · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>${report.counts.source_records}</b>first-party source</div><div class="card"><b>${report.counts.published_selected_rows}</b>selected rows</div><div class="card"><b>${report.counts.explicit_assessed_nonselection_examples}</b>assessed nonselections</div><div class="card"><b>${report.counts.complete_candidate_denominators}</b>complete candidate denominator</div><div class="card"><b>${report.counts.causal_joins_generated}</b>causal joins</div><div class="card"><b>${report.counts.next_acquisitions}</b>open acquisition classes</div></div><h2>Current result</h2><pre>${esc(JSON.stringify(record.current_result, null, 2))}</pre><h2>Recovered selector denominator</h2><table><thead><tr><th>Predicate</th><th>Observed state</th></tr></thead><tbody>${denominatorRows}</tbody></table><h2>Downstream join state</h2><table><thead><tr><th>Predicate</th><th>Observed state</th></tr></thead><tbody>${downstreamRows}</tbody></table><h2>Source ledger</h2><table><thead><tr><th>Source</th><th>Record</th><th>Class</th><th>Recovered facts</th><th>Does not support</th></tr></thead><tbody>${sourceRows}</tbody></table><h2>Still required</h2><ul>${acquisitionRows}</ul><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(record.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/natsec100-first-pass/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-natsec100-first-pass: ${recovered.published_selected_rows} selected, ${recovered.explicit_assessed_nonselection_examples} nonselection examples, 0 causal joins`);
  return { record, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNatSec100FirstPass();
}
