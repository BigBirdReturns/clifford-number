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
  ".github/workflows/counter-selector-wave-14.yml",
  "data/project/counter-selector-wave-14-blind-review.json",
  "schemas/counter-selector-blind-review-b05.schema.json",
  "docs/methods/counter-selector-blind-review-b05.md",
  "docs/milestones/counter-selector-wave-14.md",
  "tools/build-counter-selector-wave-14.mjs",
  "tools/validate-counter-selector-wave-14.mjs",
  "test/counter-selector-wave-14.test.js"
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-14-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W14-B05',
    batch_id: 'CS-AQ-B05',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_review_quality: false,
      manifest_proves_external_independence: false,
      manifest_proves_operator_capacity: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveRegistry(contract) {
  return {
    schema_version: 'counter-selector-blind-review-b05-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: '4_internal_blind_reviews_complete_no_complete_operator_finding',
    parent_wave_id: contract.parent_wave_id,
    parent_release_sha256: contract.parent_release_sha256,
    counts: structuredClone(contract.expected_counts),
    independence: structuredClone(contract.independence),
    packet_results: structuredClone(contract.records),
    next_action: 'Acquire the exact attribution, support, custody, handoff, transfer, and elasticity receipts named by the retained packets. Do not launch a field test.',
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveDisagreementLedger(contract) {
  return {
    schema_version: 'counter-selector-review-disagreement-b05-ledger@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    status: '4_disagreements_preserved_without_averaging',
    counts: {
      disagreements: contract.disagreements.length,
      resolutions_erasing_countermodels: 0,
      field_test_authorizations: 0,
      graph_effects: 0
    },
    disagreements: structuredClone(contract.disagreements),
    boundaries: {
      disagreement_is_failure: false,
      resolution_erases_countermodel: false,
      disagreement_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export function deriveReport(contract, registry, ledger, manifest) {
  return {
    schema_version: 'counter-selector-wave-14-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    batch_id: contract.batch_id,
    as_of: contract.as_of,
    title: contract.title,
    status: registry.status,
    parent_wave_id: contract.parent_wave_id,
    parent_release_sha256: contract.parent_release_sha256,
    counts: registry.counts,
    independence: registry.independence,
    packet_results: registry.packet_results,
    disagreements: ledger.disagreements,
    next_action: registry.next_action,
    boundaries: registry.boundaries,
    release_manifest: {
      path: 'data/project/counter-selector-wave-14-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

export function renderHtml(report) {
  const rows = report.packet_results.map((row) => `
    <tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.packet_kind)}</td><td>${row.new_bounded_dimension_supports}</td><td>${row.field_test_eligible}</td><td>${row.operator_finding}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 14</title>
<style>:root{background:#f2efe8;color:#171714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1280px;margin:auto;padding:42px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.045em;max-width:1050px}.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>
<h1>Strong work is not yet a complete operator</h1>
<p class="state">${report.counts.bounded_dimension_supports} BOUNDED SUPPORTS · 0 COMPLETE OPERATORS · 0 FIELD TESTS</p>
<div class="grid"><article class="card"><b>${report.counts.identity_minimized_packets_reviewed}</b>packets reviewed</article><article class="card"><b>${report.counts.procedurally_separated_review_passes}</b>review passes</article><article class="card"><b>${report.counts.bounded_dimension_supports}</b>bounded supports</article><article class="card"><b>${report.counts.operator_findings}</b>operator findings</article></div>
<table><thead><tr><th>Packet</th><th>Unit</th><th>Supports</th><th>Field test</th><th>Operator</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary">procedural separation ≠ external independence
bounded support ≠ complete operator
review survival ≠ field-test authority
person, function, and mechanism evidence remain separate</div>
<p><strong>Next:</strong> ${esc(report.next_action)}</p>
<p><code>${esc(report.release_manifest.combined_sha256)}</code></p>
</body></html>
`;
}

export function buildCounterSelectorWave14() {
  const contract = read('data/project/counter-selector-wave-14-blind-review.json');
  const registry = deriveRegistry(contract);
  const ledger = deriveDisagreementLedger(contract);
  writeJson('data/project/counter-selector-blind-review-b05-registry.json', registry);
  writeJson('data/project/counter-selector-review-disagreement-b05-ledger.json', ledger);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-14-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, ledger, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-14/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-14/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-14: ${registry.packet_results.length} packets, ${registry.counts.bounded_dimension_supports} bounded supports, ${registry.counts.operator_findings} operator findings`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave14();
