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
  '.github/workflows/counter-selector-wave-06.yml',
  'data/project/counter-selector-wave-06-custody-finality.json',
  'data/project/counter-selector-wave-06-source-registry.json',
  'schemas/counter-selector-custody-finality.schema.json',
  'docs/methods/counter-selector-custody-finality.md',
  'docs/milestones/counter-selector-wave-06.md',
  'tools/build-counter-selector-wave-06.mjs',
  'tools/validate-counter-selector-wave-06.mjs',
  'test/counter-selector-wave-06.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-06-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W06-CUSTODY-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_direct_handoff: false,
      manifest_proves_original_work: false,
      manifest_proves_final_merits: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveRegistry(contract) {
  return {
    schema_version: 'counter-selector-custody-finality-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'same_matter_successor_custody_refined_public_finality_unresolved_no_field_test',
    parent_release_sha256: contract.parent_release_sha256,
    counts: contract.expected_counts,
    records: structuredClone(contract.records),
    next_action: 'Preserve same-matter successor custody without calling it a handoff. Acquire an original decision object and attributable handoff receipt for CS-BLIND-0016, and a final disposition or durable post-finality custody record for CS-BLIND-0021. Do not launch a field test.',
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveRoutes(contract) {
  return {
    schema_version: 'counter-selector-wave-06-acquisition-routes@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'five_routes_frozen_none_executed',
    counts: {
      routes: contract.acquisition_routes.length,
      routes_executed: 0,
      contact_authorizations: 0,
      evidence_objects_acquired: 0,
      field_test_authorizations: 0,
      graph_effects: 0
    },
    routes: structuredClone(contract.acquisition_routes),
    boundaries: {
      route_is_evidence: false,
      route_authorizes_contact: false,
      route_authorizes_field_test: false,
      route_order_is_merit_order: false,
      graph_effect: 'none'
    }
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export function deriveReport(contract, sourceRegistry, registry, routes, manifest) {
  return {
    schema_version: 'counter-selector-wave-06-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: registry.status,
    parent_release_sha256: contract.parent_release_sha256,
    counts: registry.counts,
    records: registry.records,
    source_summary: {
      official_source_records: sourceRegistry.sources.length,
      bounded_search_receipts: sourceRegistry.search_receipts.length
    },
    acquisition_routes: {
      path: 'data/project/counter-selector-wave-06-acquisition-routes.json',
      count: routes.routes.length,
      executed: routes.counts.routes_executed
    },
    next_action: registry.next_action,
    boundaries: {
      ...contract.boundaries,
      ...sourceRegistry.boundaries,
      ...routes.boundaries
    },
    release_manifest: {
      path: 'data/project/counter-selector-wave-06-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

export function renderHtml(report) {
  const rows = report.records.map((row) => {
    const missing = row.packet_id === 'CS-BLIND-0016'
      ? row.findings.direct_outgoing_to_successor_handoff_receipt_located
      : row.findings.public_final_decision_located;
    return `
    <tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.lane_type)}</td><td>${esc(row.dimension_vector.custody)}</td><td>${missing}</td><td>${row.field_test_eligible}</td></tr>`;
  }).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 06 · Custody frontier</title>
<style>:root{color-scheme:light;background:#f1eee7;color:#171714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1320px;margin:0 auto;padding:42px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5.2rem);line-height:.96;letter-spacing:-.05em;max-width:1050px}.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>
<h1>Same matter is not a handoff</h1>
<p class="state">1 SUCCESSOR-CUSTODY CHAIN · 0 DIRECT HANDOFFS · 0 FINAL-MERITS DECISIONS · 0 FIELD TESTS</p>
<div class="grid"><article class="card"><b>${report.counts.official_source_records}</b>official source records</article><article class="card"><b>${report.counts.same_matter_successor_action_chains}</b>same-matter successor chain</article><article class="card"><b>${report.counts.direct_handoff_receipts}</b>direct handoff receipts</article><article class="card"><b>${report.counts.public_final_merits_decisions_located}</b>public final merits</article></div>
<table><thead><tr><th>Packet</th><th>Lane</th><th>Custody state</th><th>Decisive missing finding</th><th>Field test</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary">same-matter successor action ≠ direct handoff
later case success ≠ prior-operator attribution
retrospective testimony ≠ original work object
FOIA route ≠ acquired evidence
bounded public absence ≠ nonexistence</div>
<p><strong>Next:</strong> ${esc(report.next_action)}</p>
<p><code>${esc(report.release_manifest.combined_sha256)}</code></p>
</body></html>
`;
}

export function buildCounterSelectorWave06() {
  const contract = read('data/project/counter-selector-wave-06-custody-finality.json');
  const sourceRegistry = read('data/project/counter-selector-wave-06-source-registry.json');
  const registry = deriveRegistry(contract);
  const routes = deriveRoutes(contract);
  writeJson('data/project/counter-selector-custody-finality-registry.json', registry);
  writeJson('data/project/counter-selector-wave-06-acquisition-routes.json', routes);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-06-release-manifest.json', manifest);
  const report = deriveReport(contract, sourceRegistry, registry, routes, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-06/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-06/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-06: ${registry.records.length} packets, ${sourceRegistry.sources.length} sources, ${registry.counts.direct_handoff_receipts} direct handoffs, ${registry.counts.public_final_merits_decisions_located} final merits`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave06();
