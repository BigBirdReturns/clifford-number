#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-25-support-adjusted-surplus.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-25-comparator-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-25-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-25/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-25/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-25.yml',
  SOURCE_PATH,
  'schemas/counter-selector-support-adjusted-surplus.schema.json',
  'docs/methods/counter-selector-support-adjusted-surplus.md',
  'docs/milestones/counter-selector-wave-25.md',
  'tools/build-counter-selector-wave-25.mjs',
  'tools/validate-counter-selector-wave-25.mjs',
  'test/counter-selector-wave-25.test.js'
];

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-25-comparator-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    status: source.status,
    candidate_id: source.candidate.candidate_id,
    candidate_supported_dimensions: source.candidate.supported_dimensions,
    unresolved_dimension: source.candidate.unresolved_dimensions[0],
    comparator_counts: {
      tested: source.comparator_lanes.length,
      partial: source.comparator_lanes.filter(item => item.admissibility === 'partial').length,
      inadmissible: source.comparator_lanes.filter(item => item.admissibility === 'inadmissible').length,
      absent: source.comparator_lanes.filter(item => item.admissibility === 'absent').length,
      valid_resource_normalized: source.comparator_lanes.filter(item => item.admissibility === 'valid').length
    },
    comparators: source.comparator_lanes.map(item => ({
      comparator_id: item.comparator_id,
      label: item.label,
      domain: item.domain,
      admissibility: item.admissibility,
      comparison_people: item.comparison_people,
      support_adjusted_surplus_supported: item.support_adjusted_surplus_supported,
      reason: item.reason
    })),
    adjudication: {
      state: source.support_adjusted_surplus_adjudication.state,
      dimension_support_added: source.support_adjusted_surplus_adjudication.dimension_support_added,
      valid_resource_normalized_comparator_acquired:
        source.support_adjusted_surplus_adjudication.valid_resource_normalized_comparator_acquired,
      contradicted: source.support_adjusted_surplus_adjudication.contradicted
    },
    complete_operator_finding: source.candidate.complete_operator_finding,
    field_test_eligible: source.candidate.field_test_eligible,
    external_reviews_executed: source.independent_review.reviews_executed,
    graph_effect: source.graph_effect
  };
}

export function deriveManifest(source) {
  const entries = STATIC_MANIFEST_PATHS.map(relativePath => {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    return {
      path: relativePath,
      sha256: sha256(bytes),
      bytes: bytes.length
    };
  });
  const combined = sha256(Buffer.from(entries.map(entry =>
    `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-25-release-manifest@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      exact_bytes_prove_valid_comparator: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_external_review: false,
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

export function deriveReport(source, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-25-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    counts: source.counts,
    candidate: source.candidate,
    comparator_summary: registry.comparator_counts,
    comparator_lanes: source.comparator_lanes,
    support_adjusted_surplus: source.support_adjusted_surplus_adjudication,
    independent_review: source.independent_review,
    next_action: source.next_action,
    boundaries: source.boundaries,
    release_manifest: {
      path: MANIFEST_PATH,
      combined_sha256: manifest.combined_sha256
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderHtml(report) {
  const rows = report.comparator_lanes.map(item => `<tr>
<td><code>${escapeHtml(item.comparator_id)}</code></td>
<td>${escapeHtml(item.label)}</td>
<td>${escapeHtml(item.admissibility)}</td>
<td>${escapeHtml(item.finding)}</td>
<td>${item.support_adjusted_surplus_supported ? 'yes' : 'no'}</td>
</tr>`).join('');
  const supported = report.candidate.supported_dimensions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 25</title>
<style>:root{font-family:system-ui,sans-serif;background:#f4f1ea;color:#191816}body{max-width:1180px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.4rem,6vw,5rem);line-height:.95;letter-spacing:-.045em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.1rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W25-SA-01</strong></p>
<h1>The matched controls explain why the eighth dimension still does not clear.</h1>
<p class="state">FOUR COMPARATOR LANES · ZERO VALID NORMALIZED COMPARATORS · ZERO NEW DIMENSIONS</p>
<div class="grid"><article class="card"><b>${report.counts.comparator_lanes_tested}</b>lanes tested</article>
<article class="card"><b>${report.counts.valid_resource_normalized_comparators}</b>valid normalized comparators</article>
<article class="card"><b>${report.counts.supported_dimensions_after_update}</b>supported dimensions retained</article>
<article class="card"><b>${report.counts.complete_operator_findings}</b>complete operators</article></div>
<h2>Supported vector retained</h2><ul>${supported}</ul>
<table><thead><tr><th>ID</th><th>Control</th><th>Admissibility</th><th>Finding</th><th>Surplus?</th></tr></thead><tbody>${rows}</tbody></table>
<div class="boundary"><strong>Authority ceiling</strong><pre>same event ≠ normalized comparator
joint success ≠ person surplus
changed mandate ≠ comparable outcome
missing comparator ≠ surplus
seven dimensions ≠ rank
internal audit ≠ external review</pre></div>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const registry = deriveRegistry(source);
  fs.mkdirSync(path.dirname(path.join(ROOT, REGISTRY_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, registry, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, registry, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { registry } = buildAll();
  console.log(`build-counter-selector-wave-25: ${registry.comparator_counts.tested} comparator lanes, ${registry.comparator_counts.valid_resource_normalized} valid normalized comparators`);
}
