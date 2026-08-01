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
  '.github/workflows/counter-selector-wave-19.yml',
  'data/project/counter-selector-wave-19-cross-domain-governance.json',
  'schemas/counter-selector-cross-domain-governance.schema.json',
  'docs/methods/counter-selector-cross-domain-governance.md',
  'docs/milestones/counter-selector-wave-19.md',
  'tools/build-counter-selector-wave-19.mjs',
  'tools/validate-counter-selector-wave-19.mjs',
  'test/counter-selector-wave-19.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-19-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W19-XD-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_cross_domain_transfer: false,
      manifest_proves_direct_handoff: false,
      manifest_proves_external_review: false,
      manifest_proves_complete_operator: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveTransferRegistry(contract) {
  return {
    schema_version: 'counter-selector-cross-domain-transfer-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    supported_trace: structuredClone(contract.supported_trace),
    matched_controls: structuredClone(contract.matched_controls),
    sources: structuredClone(contract.sources),
    acquisition_lanes: structuredClone(contract.acquisition_lanes),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReviewExportRegistry(contract) {
  const { identity_key, ...exportPacket } = structuredClone(contract.external_review_export_update);
  return {
    schema_version: 'counter-selector-wave-19-external-review-export-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'one_updated_identity_label_removed_export_zero_requests_zero_reviews',
    publication_status: contract.publication_status,
    counts: {
      exports_updated: contract.counts.external_review_exports_updated,
      source_identity_labels_in_exports: 0,
      artifact_may_remain_inferable: exportPacket.artifact_may_remain_inferable ? 1 : 0,
      review_requests_sent: contract.counts.external_review_requests_sent,
      external_reviews_executed: contract.counts.external_selector_reviews_executed,
      contacts_authorized: contract.counts.contacts_authorized,
      field_test_eligible_candidates: contract.counts.field_test_eligible_candidates,
      graph_effects: contract.counts.graph_effects
    },
    exports: [exportPacket],
    identity_key_registry: [{
      export_id: contract.external_review_export_update.export_id,
      source_trace_or_candidate_id: contract.external_review_export_update.source_trace_or_candidate_id,
      identity_key,
      released_to_reviewer: false,
      public_identity_profile_authorized: false,
      graph_effect: 'none'
    }],
    boundaries: {
      identity_label_removed_is_identity_blind: false,
      export_update_is_external_review: false,
      export_update_authorizes_contact: false,
      export_update_authorizes_field_test: false,
      export_update_authorizes_person_ranking: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(contract, transfer, review, manifest) {
  return {
    schema_version: 'counter-selector-wave-19-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    supported_trace: {
      candidate_id: transfer.supported_trace.candidate_id,
      source_identity: transfer.supported_trace.source_identity,
      artifact_scope: transfer.supported_trace.artifact_scope,
      previous_supported_dimensions: transfer.supported_trace.previous_supported_dimensions,
      new_support_assignments: transfer.supported_trace.new_support_assignments,
      supported_dimensions_after_update: transfer.supported_trace.supported_dimensions_after_update,
      unresolved_dimensions: transfer.supported_trace.unresolved_dimensions,
      countermodels: transfer.supported_trace.countermodels,
      external_review_ready: transfer.supported_trace.external_review_ready,
      complete_operator_finding: transfer.supported_trace.complete_operator_finding,
      field_test_eligible: transfer.supported_trace.field_test_eligible,
      graph_effect: transfer.supported_trace.graph_effect
    },
    matched_controls: transfer.matched_controls.map((row) => ({
      control_id: row.control_id,
      source_identity: row.source_identity,
      control_class: row.control_class,
      non_advance_reason: row.non_advance_reason,
      cross_domain_transfer_supported: row.cross_domain_transfer_supported,
      new_dimension_supports: row.new_dimension_supports,
      graph_effect: row.graph_effect
    })),
    external_review: {
      exports_updated: review.counts.exports_updated,
      identity_labels_in_exports: review.counts.source_identity_labels_in_exports,
      artifacts_may_remain_inferable: review.counts.artifact_may_remain_inferable,
      review_requests_sent: review.counts.review_requests_sent,
      reviews_executed: review.counts.external_reviews_executed,
      export_ids: review.exports.map((row) => row.export_id)
    },
    open_acquisition_lanes: transfer.acquisition_lanes.map((row) => ({
      lane_id: row.lane_id,
      subject: row.subject,
      required_objects: row.required_objects,
      contact_authorized: row.contact_authorized,
      graph_effect: row.graph_effect
    })),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-19-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const assignments = report.supported_trace.new_support_assignments.map((row) =>
    `<tr><td>${esc(row.dimension)}</td><td>${esc(row.state)}</td><td>${esc(row.ceiling)}</td></tr>`
  ).join('');
  const controls = report.matched_controls.map((row) =>
    `<tr><td>${esc(row.source_identity)}</td><td>${esc(row.control_class)}</td><td>${esc(row.non_advance_reason)}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Counter-Selector Wave 19</title>` +
    `<style>:root{color-scheme:light;background:#f1eee7;color:#171714;font-family:system-ui,sans-serif}` +
    `body{max-width:1280px;margin:auto;padding:42px 24px;line-height:1.55}` +
    `h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}` +
    `.state{font-weight:900;color:#7b2e1d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}` +
    `.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}` +
    `.card{padding:16px}.card b{display:block;font-size:2.2rem}` +
    `table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}` +
    `th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}` +
    `.boundary{border-left:7px solid #7b2e1d;padding:18px;margin-top:28px;white-space:pre-wrap}` +
    `code{overflow-wrap:anywhere}</style></head><body>` +
    `<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>` +
    `<h1>A governing operation transferred. Direct handoff still did not.</h1>` +
    `<p class="state">TWO BOUNDED SUPPORTS · TWO MATCHED CONTROLS · ZERO EXTERNAL REVIEWS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.materially_distinct_domains_in_supported_trace}</b>materially distinct domains</article>` +
    `<article class="card"><b>${report.counts.new_person_supports}</b>new person supports</article>` +
    `<article class="card"><b>${report.counts.matched_controls_retained}</b>matched controls retained</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews executed</article></div>` +
    `<h2>${esc(report.supported_trace.source_identity)}</h2>` +
    `<p><strong>Current vector:</strong> ${report.supported_trace.supported_dimensions_after_update.map(esc).join(', ')}</p>` +
    `<table><thead><tr><th>Dimension</th><th>Bounded state</th><th>Ceiling</th></tr></thead><tbody>${assignments}</tbody></table>` +
    `<h2>Matched controls</h2><table><thead><tr><th>Identity</th><th>Control</th><th>Why no transfer</th></tr></thead><tbody>${controls}</tbody></table>` +
    `<div class="boundary">multiple titles ≠ cross-domain transfer\nadjacent-domain breadth ≠ materially unrelated transfer\n` +
    `same-program stage breadth ≠ cross-domain transfer\nsuccessor continuity ≠ direct person handoff\n` +
    `updated export ≠ external review\nfive supported dimensions ≠ complete operator</div>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave19() {
  const contract = read('data/project/counter-selector-wave-19-cross-domain-governance.json');
  const transfer = deriveTransferRegistry(contract);
  const review = deriveReviewExportRegistry(contract);
  writeJson('data/project/counter-selector-cross-domain-transfer-registry.json', transfer);
  writeJson('data/project/counter-selector-wave-19-external-review-export-registry.json', review);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-19-release-manifest.json', manifest);
  const report = deriveReport(contract, transfer, review, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-19/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-19/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-19: ${contract.counts.new_person_supports} supports, ${contract.counts.matched_controls_retained} controls, ${review.counts.external_reviews_executed} external reviews`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave19();
