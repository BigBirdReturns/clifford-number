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
  '.github/workflows/counter-selector-wave-15.yml',
  'data/project/counter-selector-wave-15-attribution-census.json',
  'schemas/counter-selector-attribution-census.schema.json',
  'docs/methods/counter-selector-attribution-census.md',
  'docs/milestones/counter-selector-wave-15.md',
  'tools/build-counter-selector-wave-15.mjs',
  'tools/validate-counter-selector-wave-15.mjs',
  'test/counter-selector-wave-15.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-15-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W15-ATTR-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_identity_attribution: false,
      manifest_proves_complete_operator: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_public_identity_release: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveRegistry(contract) {
  return {
    schema_version: 'counter-selector-attribution-census@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.identity_reintroduction.publication_status,
    counts: structuredClone(contract.counts),
    person_near_hits: structuredClone(contract.person_near_hits),
    function_level_support: structuredClone(contract.function_level_support),
    mechanism_control_packet_ids: structuredClone(contract.mechanism_control_packet_ids),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReport(contract, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-15-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: registry.status,
    publication_status: registry.publication_status,
    counts: registry.counts,
    person_near_hits: registry.person_near_hits.map((row) => ({
      candidate_id: row.candidate_id,
      packet_id: row.packet_id,
      source_identity: row.source_identity,
      artifact_scope: row.artifact_scope,
      supported_dimensions: row.supported_dimensions,
      unresolved_dimensions: row.unresolved_dimensions,
      missing_receipts: row.missing_receipts,
      complete_operator_finding: row.complete_operator_finding,
      field_test_eligible: row.field_test_eligible,
      graph_effect: row.graph_effect
    })),
    function_level_support: registry.function_level_support,
    mechanism_control_packet_ids: registry.mechanism_control_packet_ids,
    next_action: registry.next_action,
    boundaries: registry.boundaries,
    release_manifest: {
      path: 'data/project/counter-selector-wave-15-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

export function renderHtml(report) {
  const rows = report.person_near_hits.map((row) => `<tr><td>${esc(row.source_identity)}</td><td><code>${esc(row.packet_id)}</code></td><td>${row.supported_dimensions.map(esc).join(', ')}</td><td>${row.unresolved_dimensions.map(esc).join(', ')}</td><td>${row.field_test_eligible}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 15 attribution census</title><style>:root{color-scheme:light;background:#f1eee7;color:#171714;font-family:system-ui,sans-serif}body{max-width:1280px;margin:auto;padding:42px 24px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}code{overflow-wrap:anywhere}</style></head><body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p><h1>Three near-hits. Zero complete operators.</h1><p class="state">SOURCE IDENTITY REINTRODUCED AFTER ARTIFACT REVIEW · NO RANK ORDER · NO FIELD TEST</p><div class="grid"><article class="card"><b>${report.counts.denominator_objects}</b>denominator objects processed</article><article class="card"><b>${report.counts.blind_reviewed_packets}</b>blind-reviewed packets</article><article class="card"><b>${report.counts.person_attributable_near_hits}</b>person-attributable near-hits</article><article class="card"><b>${report.counts.complete_operator_findings}</b>complete operators</article></div><table><thead><tr><th>Source identity</th><th>Packet</th><th>Bounded support</th><th>Unresolved dimensions</th><th>Field test</th></tr></thead><tbody>${rows}</tbody></table><div class="boundary">dimension count ≠ rank\nsource identity ≠ promotion\nprincipled refusal ≠ safe handoff\npublication ≠ custody\none domain ≠ transfer\nprocedural separation ≠ external independence</div><p><strong>Next:</strong> ${esc(report.next_action)}</p><p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave15() {
  const contract = read('data/project/counter-selector-wave-15-attribution-census.json');
  const registry = deriveRegistry(contract);
  writeJson('data/project/counter-selector-attribution-census.json', registry);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-15-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-15/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-15/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-15: ${registry.person_near_hits.length} person near-hits, ${registry.counts.person_attributable_bounded_supports} bounded supports, ${registry.counts.complete_operator_findings} complete operators`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave15();
