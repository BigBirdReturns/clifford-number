#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = (rel) => fs.readFileSync(path.join(root, rel));
const writeJson = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const releaseScope = [
  '.github/workflows/counter-selector-wave-23.yml',
  'data/project/counter-selector-wave-23-full-record-corroboration.json',
  'schemas/counter-selector-full-record-corroboration.schema.json',
  'docs/methods/counter-selector-full-record-corroboration.md',
  'docs/milestones/counter-selector-wave-23.md',
  'tools/build-counter-selector-wave-23.mjs',
  'tools/validate-counter-selector-wave-23.mjs',
  'test/counter-selector-wave-23.test.js'
];

export function deriveRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-23-corroboration-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate_state: structuredClone(contract.candidate_state),
    source_records: structuredClone(contract.source_records),
    corroborations: structuredClone(contract.corroborations),
    support_ledger: structuredClone(contract.support_ledger),
    catalogue_refinements: structuredClone(contract.catalogue_refinements),
    independent_review: structuredClone(contract.independent_review),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const value = bytes(rel);
    return { path: rel, sha256: sha256(value), bytes: value.length };
  });
  return {
    schema_version: 'counter-selector-wave-23-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W23-FR-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) =>
      `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      exact_bytes_prove_independent_review: false,
      exact_bytes_prove_sole_person_causality: false,
      exact_bytes_prove_new_dimension_support: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_model_elasticity: false,
      exact_bytes_prove_direct_handoff: false,
      exact_bytes_prove_complete_operator: false,
      manifest_authorizes_followup: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(contract, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-23-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate: structuredClone(contract.candidate_state),
    corroborations: registry.corroborations.map((row) => ({
      corroboration_id: row.corroboration_id,
      label: row.label,
      source_id: row.source_id,
      page_indices: row.page_indices,
      finding: row.finding,
      attribution_scope: row.attribution_scope,
      existing_dimension_corroborated: row.existing_dimension_corroborated,
      new_dimension_support: row.new_dimension_support,
      direct_handoff_receipt: row.direct_handoff_receipt ?? false,
      sole_person_causality_upgrade: row.sole_person_causality_upgrade
    })),
    support_ledger: structuredClone(registry.support_ledger),
    catalogue_refinements: structuredClone(registry.catalogue_refinements),
    independent_review: structuredClone(registry.independent_review),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-23-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const rows = report.corroborations.map((row) =>
    `<tr><td>${esc(row.label)}</td><td>${esc(row.existing_dimension_corroborated)}</td>` +
    `<td>${esc(row.attribution_scope)}</td><td>${row.new_dimension_support ? 'yes' : 'no'}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 23</title>` +
    `<style>:root{color-scheme:light;background:#f2efe8;color:#181714;font-family:system-ui,sans-serif}` +
    `body{max-width:1200px;margin:auto;padding:40px 24px;line-height:1.55}` +
    `h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}` +
    `.state{font-weight:900;color:#74351f}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}` +
    `.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}` +
    `.card{padding:16px}.card b{display:block;font-size:2.2rem}` +
    `table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}` +
    `th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}` +
    `.boundary{border-left:7px solid #74351f;padding:18px;margin-top:28px;white-space:pre-wrap}` +
    `code{overflow-wrap:anywhere}</style></head><body>` +
    `<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>` +
    `<h1>The full record sharpened the action and strengthened the restraint.</h1>` +
    `<p class="state">ONE 134-PAGE REPORT · THREE CORROBORATIONS · ZERO NEW DIMENSIONS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.pages_in_full_text_record}</b>pages acquired</article>` +
    `<article class="card"><b>${report.counts.person_action_corroborations}</b>person-action corroborations</article>` +
    `<article class="card"><b>${report.counts.new_dimension_supports}</b>new dimensions</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews</article></div>` +
    `<table><thead><tr><th>Corroboration</th><th>Dimension</th><th>Attribution scope</th><th>New support?</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<div class="boundary">full report ≠ independent review\njoint action ≠ sole causality\ntransition guarantor ≠ direct handoff\ncatalogue record ≠ underlying item\ncorroboration ≠ promotion</div>` +
    `<p><strong>Candidate vector unchanged:</strong> ${report.candidate.supported_dimensions.map(esc).join(', ')}</p>` +
    `<p><strong>Unresolved:</strong> ${report.candidate.unresolved_dimensions.map(esc).join(', ')}</p>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave23() {
  const contract = read('data/project/counter-selector-wave-23-full-record-corroboration.json');
  const registry = deriveRegistry(contract);
  writeJson('data/project/counter-selector-wave-23-corroboration-registry.json', registry);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-23-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-23/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-23/index.html', renderHtml(report));
  console.log(
    `build-counter-selector-wave-23: ${contract.counts.pages_in_full_text_record} pages, ` +
    `${contract.counts.person_action_corroborations} corroborations, ` +
    `${contract.counts.new_dimension_supports} new supports`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave23();
