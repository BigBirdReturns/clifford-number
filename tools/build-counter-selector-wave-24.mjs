#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
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
  '.github/workflows/counter-selector-wave-24.yml',
  'data/project/counter-selector-wave-24-model-update-handoff.json',
  'schemas/counter-selector-model-update-handoff.schema.json',
  'docs/methods/counter-selector-model-update-handoff.md',
  'docs/milestones/counter-selector-wave-24.md',
  'tools/build-counter-selector-wave-24.mjs',
  'tools/validate-counter-selector-wave-24.mjs',
  'test/counter-selector-wave-24.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-24-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W24-MH-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      exact_bytes_prove_universal_model_elasticity: false,
      exact_bytes_prove_direct_handoff: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_external_review: false,
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

export function deriveEvidenceRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-24-evidence-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate_state: structuredClone(contract.candidate_state),
    source_records: structuredClone(contract.source_records),
    model_elasticity_adjudication: structuredClone(contract.model_elasticity_adjudication),
    handoff_adjudication: structuredClone(contract.handoff_adjudication),
    support_adjusted_surplus_adjudication: structuredClone(contract.support_adjusted_surplus_adjudication),
    independent_review: structuredClone(contract.independent_review),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReport(contract, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-24-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate: structuredClone(contract.candidate_state),
    model_elasticity: structuredClone(registry.model_elasticity_adjudication),
    handoff: structuredClone(registry.handoff_adjudication),
    support_adjusted_surplus: structuredClone(registry.support_adjusted_surplus_adjudication),
    independent_review: structuredClone(registry.independent_review),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-24-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const dimensions = report.candidate.supported_dimensions.map((x) => `<li>${esc(x)}</li>`).join('');
  const sequence = report.model_elasticity.sequence.map((row) =>
    `<tr><td>${esc(row.stage)}</td><td>${esc(row.finding)}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 24</title>` +
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
    `<h1>The model moved. The handoff gate did not.</h1>` +
    `<p class="state">ONE BOUNDED MODEL-ELASTICITY SUPPORT · ZERO DIRECT HANDOFF RECEIPTS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.supported_dimensions_after_update}</b>supported dimensions</article>` +
    `<article class="card"><b>${report.counts.model_elasticity_supports_added}</b>new bounded support</article>` +
    `<article class="card"><b>${report.counts.direct_handoff_receipts}</b>direct handoffs</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews</article></div>` +
    `<h2>Supported vector</h2><ul>${dimensions}</ul>` +
    `<table><thead><tr><th>Model-update stage</th><th>Bounded finding</th></tr></thead><tbody>${sequence}</tbody></table>` +
    `<div class="boundary">self-reported change ≠ universal elasticity\npublic concession ≠ implemented repair\ncollective proposal ≠ sole authorship\nsuccessor continuity ≠ direct handoff\nseven dimensions ≠ rank</div>` +
    `<p><strong>Unresolved:</strong> ${report.candidate.unresolved_dimensions.map(esc).join(', ')}</p>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave24() {
  const contract = read('data/project/counter-selector-wave-24-model-update-handoff.json');
  const registry = deriveEvidenceRegistry(contract);
  writeJson('data/project/counter-selector-wave-24-evidence-registry.json', registry);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-24-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-24/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-24/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-24: ${contract.counts.model_elasticity_supports_added} model-elasticity support, ${contract.counts.direct_handoff_receipts} direct handoffs`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave24();
