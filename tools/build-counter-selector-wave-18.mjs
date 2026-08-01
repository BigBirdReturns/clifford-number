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
  '.github/workflows/counter-selector-wave-18.yml',
  'data/project/counter-selector-wave-18-repair-continuation.json',
  'schemas/counter-selector-repair-continuation.schema.json',
  'docs/methods/counter-selector-repair-continuation.md',
  'docs/milestones/counter-selector-wave-18.md',
  'tools/build-counter-selector-wave-18.mjs',
  'tools/validate-counter-selector-wave-18.mjs',
  'test/counter-selector-wave-18.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-18-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W18-RC-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_person_support: false,
      manifest_proves_identity_absence: false,
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

export function deriveRepairRegistry(contract) {
  return {
    schema_version: 'counter-selector-repair-continuation-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    person_updates: structuredClone(contract.person_updates),
    identity_block_updates: structuredClone(contract.identity_block_updates),
    sources: structuredClone(contract.sources),
    acquisition_lanes: structuredClone(contract.acquisition_lanes),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReviewExports(contract) {
  return {
    schema_version: 'counter-selector-external-review-export-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'six_identity_label_removed_exports_ready_zero_requests_zero_reviews',
    publication_status: contract.publication_status,
    counts: {
      exports_prepared: contract.external_review_exports.length,
      identity_labels_removed: contract.external_review_exports.filter((row) => row.source_identity_omitted_from_export).length,
      artifact_may_remain_inferable: contract.external_review_exports.filter((row) => row.artifact_may_remain_inferable).length,
      review_requests_sent: contract.counts.external_review_requests_sent,
      external_reviews_executed: contract.counts.external_selector_reviews_executed,
      contacts_authorized: contract.counts.contacts_authorized,
      field_test_eligible_candidates: contract.counts.field_test_eligible_candidates,
      graph_effects: contract.counts.graph_effects
    },
    exports: contract.external_review_exports.map(({ identity_key, ...row }) => structuredClone(row)),
    identity_key_registry: contract.external_review_exports.map((row) => ({
      export_id: row.export_id,
      source_trace_or_candidate_id: row.source_trace_or_candidate_id,
      identity_key: row.identity_key,
      released_to_reviewer: false,
      public_identity_profile_authorized: false,
      graph_effect: 'none'
    })),
    boundaries: {
      identity_label_removed_is_identity_blind: false,
      export_preparation_is_external_review: false,
      export_preparation_authorizes_contact: false,
      export_preparation_authorizes_field_test: false,
      export_preparation_authorizes_public_identity_profile: false,
      export_preparation_authorizes_person_ranking: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(contract, repair, review, manifest) {
  return {
    schema_version: 'counter-selector-wave-18-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    person_updates: repair.person_updates.map((row) => ({
      trace_id: row.trace_id,
      source_identity: row.source_identity,
      artifact_scope: row.artifact_scope,
      previous_supported_dimensions: row.previous_supported_dimensions,
      new_support_assignments: row.new_support_assignments,
      supported_dimensions_after_update: row.supported_dimensions_after_update,
      unresolved_dimensions: row.unresolved_dimensions,
      external_review_ready: row.external_review_ready,
      complete_operator_finding: row.complete_operator_finding,
      field_test_eligible: row.field_test_eligible,
      graph_effect: row.graph_effect
    })),
    identity_blocks: repair.identity_block_updates.map((row) => ({
      identity_block_id: row.identity_block_id,
      packet_id: row.packet_id,
      blocked_unit: row.blocked_unit,
      audit_result: row.audit_result,
      acquired_record_state: row.acquired_record_state,
      named_person_inferred: row.named_person_inferred,
      person_support_assigned: row.person_support_assigned,
      graph_effect: row.graph_effect
    })),
    external_review: {
      exports_prepared: review.counts.exports_prepared,
      identity_labels_removed: review.counts.identity_labels_removed,
      artifacts_may_remain_inferable: review.counts.artifact_may_remain_inferable,
      review_requests_sent: review.counts.review_requests_sent,
      reviews_executed: review.counts.external_reviews_executed,
      export_ids: review.exports.map((row) => row.export_id)
    },
    open_acquisition_lanes: repair.acquisition_lanes.map((row) => ({
      lane_id: row.lane_id,
      subject: row.subject,
      required_objects: row.required_objects,
      contact_authorized: row.contact_authorized,
      graph_effect: row.graph_effect
    })),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-18-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const personRows = report.person_updates.map((row) =>
    `<tr><td>${esc(row.source_identity)}</td><td><code>${esc(row.trace_id)}</code></td>` +
    `<td>${row.new_support_assignments.length ? row.new_support_assignments.map((x) => esc(x.dimension)).join(', ') : 'none'}</td>` +
    `<td>${row.supported_dimensions_after_update.map(esc).join(', ')}</td>` +
    `<td>${row.field_test_eligible}</td></tr>`
  ).join('');
  const blockRows = report.identity_blocks.map((row) =>
    `<tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.blocked_unit)}</td><td>${esc(row.audit_result)}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Counter-Selector Wave 18</title>` +
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
    `<h1>Repair continued. Identity blocks held. Reviews still external.</h1>` +
    `<p class="state">THREE PERSON UPDATES · TWO BLOCKS RETAINED · ZERO FIELD TESTS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.person_support_updates}</b>person support updates</article>` +
    `<article class="card"><b>${report.counts.identity_blocks_retained}</b>identity blocks retained</article>` +
    `<article class="card"><b>${report.counts.external_review_exports_prepared}</b>review exports ready</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews executed</article></div>` +
    `<h2>Person updates</h2><table><thead><tr><th>Identity</th><th>Trace</th><th>New support</th><th>Current vector</th><th>Field test</th></tr></thead><tbody>${personRows}</tbody></table>` +
    `<h2>Identity blocks</h2><table><thead><tr><th>Packet</th><th>Blocked unit</th><th>Audit result</th></tr></thead><tbody>${blockRows}</tbody></table>` +
    `<div class="boundary">repair leadership ≠ safe handoff\nsuccessful redesign ≠ cross-domain transfer\n` +
    `learning-object publication ≠ observed adoption\nidentity-label removal ≠ identity blindness\n` +
    `named participant ≠ warning author\nnew person support ≠ complete operator</div>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave18() {
  const contract = read('data/project/counter-selector-wave-18-repair-continuation.json');
  const repair = deriveRepairRegistry(contract);
  const review = deriveReviewExports(contract);
  writeJson('data/project/counter-selector-repair-continuation-registry.json', repair);
  writeJson('data/project/counter-selector-external-review-export-registry.json', review);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-18-release-manifest.json', manifest);
  const report = deriveReport(contract, repair, review, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-18/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-18/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-18: ${contract.counts.person_support_updates} support updates, ${contract.counts.identity_blocks_retained} identity blocks retained, ${review.counts.external_reviews_executed} external reviews`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave18();
