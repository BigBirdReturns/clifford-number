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
  '.github/workflows/counter-selector-wave-16.yml',
  'data/project/counter-selector-wave-16-targeted-receipts.json',
  'schemas/counter-selector-targeted-receipts.schema.json',
  'docs/methods/counter-selector-targeted-receipts.md',
  'docs/milestones/counter-selector-wave-16.md',
  'tools/build-counter-selector-wave-16.mjs',
  'tools/validate-counter-selector-wave-16.mjs',
  'test/counter-selector-wave-16.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-16-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W16-TR-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_dimension_support: false,
      manifest_authorizes_external_review_result: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveRegistry(contract) {
  return {
    schema_version: 'counter-selector-targeted-receipt-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate_updates: structuredClone(contract.candidate_updates),
    sources: structuredClone(contract.sources),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReport(contract, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-16-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: registry.status,
    publication_status: registry.publication_status,
    counts: registry.counts,
    candidate_updates: registry.candidate_updates.map((row) => ({
      candidate_id: row.candidate_id,
      packet_id: row.packet_id,
      source_identity: row.source_identity,
      artifact_scope: row.artifact_scope,
      previous_supported_dimensions: row.previous_supported_dimensions,
      new_supported_dimensions: row.new_supported_dimensions,
      supported_dimensions_after_update: row.supported_dimensions_after_update,
      unresolved_dimensions: row.unresolved_dimensions,
      receipt_findings: row.receipt_findings,
      support_context: row.support_context,
      external_second_party_review_ready: row.external_second_party_review_ready,
      complete_operator_finding: row.complete_operator_finding,
      field_test_eligible: row.field_test_eligible,
      contact_authorized: row.contact_authorized,
      graph_effect: row.graph_effect
    })),
    source_summary: {
      targeted_source_records: registry.sources.length,
      full_text_or_official_record_sources: registry.sources.filter((row) => !row.record_state.includes('route_only') && !row.record_state.includes('locator')).length,
      route_or_locator_sources: registry.sources.filter((row) => row.record_state.includes('route') || row.record_state.includes('locator')).length
    },
    next_action: registry.next_action,
    boundaries: registry.boundaries,
    release_manifest: {
      path: 'data/project/counter-selector-wave-16-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

export function renderHtml(report) {
  const rows = report.candidate_updates.map((row) => `<tr><td>${esc(row.source_identity)}</td><td><code>${esc(row.packet_id)}</code></td><td>${row.new_supported_dimensions.length ? row.new_supported_dimensions.map(esc).join(', ') : 'none'}</td><td>${row.supported_dimensions_after_update.map(esc).join(', ')}</td><td>${row.field_test_eligible}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 16 targeted receipts</title><style>:root{color-scheme:light;background:#f1eee7;color:#171714;font-family:system-ui,sans-serif}body{max-width:1280px;margin:auto;padding:42px 24px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}code{overflow-wrap:anywhere}</style></head><body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p><h1>Four exact support updates. Zero field tests.</h1><p class="state">TARGETED RECEIPTS · SOURCE CUSTODY · NO RANK ORDER · NO CONTACT</p><div class="grid"><article class="card"><b>${report.counts.person_near_hits_audited}</b>near-hits audited</article><article class="card"><b>${report.counts.targeted_source_records}</b>source records</article><article class="card"><b>${report.counts.new_person_bounded_supports}</b>new supports</article><article class="card"><b>${report.counts.field_test_eligible_candidates}</b>field-test eligible</article></div><table><thead><tr><th>Source identity</th><th>Packet</th><th>New bounded support</th><th>Supported vector</th><th>Field test</th></tr></thead><tbody>${rows}</tbody></table><div class="boundary">source inquiry ≠ external selector review\nsafe patient transition ≠ generic handoff\nsuccessor continuity ≠ direct person handoff\nsupport count ≠ rank\nnew bounded support ≠ field-test authority</div><p><strong>Next:</strong> ${esc(report.next_action)}</p><p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave16() {
  const contract = read('data/project/counter-selector-wave-16-targeted-receipts.json');
  const registry = deriveRegistry(contract);
  writeJson('data/project/counter-selector-targeted-receipt-registry.json', registry);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-16-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-16/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-16/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-16: ${registry.counts.person_near_hits_audited} near-hits, ${registry.counts.new_person_bounded_supports} new supports, ${registry.counts.field_test_eligible_candidates} field-test eligible`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave16();
