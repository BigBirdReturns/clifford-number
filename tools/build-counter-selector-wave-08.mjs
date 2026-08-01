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
  '.github/workflows/counter-selector-wave-08.yml',
  'data/project/counter-selector-wave-08-blind-review.json',
  'schemas/counter-selector-blind-review-b02.schema.json',
  'docs/methods/counter-selector-blind-review-b02.md',
  'docs/milestones/counter-selector-wave-08.md',
  'tools/build-counter-selector-wave-08.mjs',
  'tools/validate-counter-selector-wave-08.mjs',
  'test/counter-selector-wave-08.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-08-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W08-B02',
    batch_id: 'CS-AQ-B02',
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

export function deriveReviewRegistry(program, parent) {
  return {
    schema_version: 'counter-selector-blind-review-b02-registry@1',
    program_id: program.program_id,
    wave_id: program.wave_id,
    batch_id: program.batch_id,
    as_of: program.as_of,
    status: 'four_internal_blind_reviews_complete_no_person_operator_finding',
    parent_wave_id: program.parent_wave_id,
    parent_release_sha256: program.parent_release_sha256,
    parent_packet_path: program.review_protocol.parent_packet_path,
    parent_packet_ids: parent.packets.map((row) => row.packet_id),
    counts: structuredClone(program.expected_counts),
    independence: {
      procedural_separation_claimed: true,
      fresh_context_claimed: true,
      external_human_independence_claimed: false,
      different_model_or_institution_claimed: false,
      same_system_limitation_preserved: true
    },
    packet_results: structuredClone(program.review_records),
    next_action: 'Acquire support, authorship, attributable handoff, complete decision-response, and durable implementation receipts. Do not launch a field test or promote a person from these reviews.',
    boundaries: structuredClone(program.boundaries)
  };
}

export function deriveDisagreementLedger(program) {
  return {
    schema_version: 'counter-selector-review-disagreement-b02-ledger@1',
    program_id: program.program_id,
    wave_id: program.wave_id,
    batch_id: program.batch_id,
    as_of: program.as_of,
    status: 'four_disagreements_preserved_without_averaging',
    counts: {
      disagreements: program.disagreements.length,
      erased_countermodels: 0,
      averaged_resolutions: 0,
      field_test_authorizations: 0,
      graph_effects: 0
    },
    disagreements: structuredClone(program.disagreements),
    boundaries: {
      disagreement_is_failure: false,
      resolution_erases_countermodel: false,
      disagreement_averaging_authorized: false,
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

export function deriveReport(program, registry, ledger, manifest) {
  return {
    schema_version: 'counter-selector-wave-08-report@1',
    program_id: program.program_id,
    wave_id: program.wave_id,
    batch_id: program.batch_id,
    as_of: program.as_of,
    title: program.title,
    status: registry.status,
    parent_wave_id: program.parent_wave_id,
    parent_release_sha256: program.parent_release_sha256,
    counts: registry.counts,
    independence: registry.independence,
    packet_results: registry.packet_results,
    disagreements: ledger.disagreements,
    next_action: registry.next_action,
    boundaries: {
      ...program.boundaries,
      ...ledger.boundaries
    },
    release_manifest: {
      path: 'data/project/counter-selector-wave-08-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

export function renderHtml(report) {
  const rows = report.packet_results.map((row) => {
    const supported = Object.entries(row.dimension_vector)
      .filter(([, value]) => value.startsWith('bounded_support'))
      .map(([key]) => key)
      .join(', ') || 'none';
    return `\n<tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.packet_kind)}</td><td>${esc(row.analysis_class_recommendation.recommended_analysis_class)}</td><td>${esc(supported)}</td><td>${row.operator_finding}</td><td>${row.field_test_eligible}</td></tr>`;
  }).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 08 · Blind review</title>
<style>:root{color-scheme:light;background:#f3efe7;color:#171613;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1360px;margin:0 auto;padding:42px 24px 72px;line-height:1.55}h1{font-size:clamp(2.6rem,6vw,5.4rem);line-height:.95;letter-spacing:-.055em;max-width:1100px}.state{font-weight:900;color:#7d2f20}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b1;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.88rem}th,td{padding:11px;border-bottom:1px solid #ded5c8;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7d2f20;padding:18px;margin-top:28px;white-space:pre-wrap}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>
<h1>Useful conduct found. No person selected.</h1>
<p class="state">4 PACKETS REVIEWED · 4 BOUNDED SUPPORTS · 0 OPERATOR FINDINGS · 0 FIELD TESTS</p>
<div class="grid"><article class="card"><b>${report.counts.identity_minimized_packets_reviewed}</b>packets reviewed</article><article class="card"><b>${report.counts.bounded_dimension_supports}</b>bounded supports</article><article class="card"><b>${report.counts.disagreements_preserved}</b>disagreements retained</article><article class="card"><b>${report.counts.operator_findings}</b>operator findings</article></div>
<table><thead><tr><th>Packet</th><th>Packet kind</th><th>Analysis class</th><th>Bounded supports</th><th>Operator</th><th>Field test</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary">collective function ≠ individual operator
checking-function output ≠ support-adjusted surplus
catastrophic consequence ≠ counterfactual efficacy
external correction ≠ repair-capable partnership
distributed failure ≠ one brittle partnership
bounded support ≠ operator finding</div>
<p><strong>Next:</strong> ${esc(report.next_action)}</p>
<p><code>${esc(report.release_manifest.combined_sha256)}</code></p>
</body></html>\n`;
}

export function buildCounterSelectorWave08() {
  const program = read('data/project/counter-selector-wave-08-blind-review.json');
  const parent = read(program.review_protocol.parent_packet_path);
  const registry = deriveReviewRegistry(program, parent);
  const ledger = deriveDisagreementLedger(program);
  writeJson('data/project/counter-selector-blind-review-b02-registry.json', registry);
  writeJson('data/project/counter-selector-review-disagreement-b02-ledger.json', ledger);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-08-release-manifest.json', manifest);
  const report = deriveReport(program, registry, ledger, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-08/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-08/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-08: ${registry.counts.identity_minimized_packets_reviewed} packets, ${registry.counts.bounded_dimension_supports} bounded supports, ${registry.counts.operator_findings} operator findings`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave08();
