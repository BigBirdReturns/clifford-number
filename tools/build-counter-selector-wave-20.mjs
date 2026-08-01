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
  '.github/workflows/counter-selector-wave-20.yml',
  'data/project/counter-selector-wave-20-exception-falsification.json',
  'schemas/counter-selector-exception-falsification.schema.json',
  'docs/methods/counter-selector-exception-falsification.md',
  'docs/milestones/counter-selector-wave-20.md',
  'tools/build-counter-selector-wave-20.mjs',
  'tools/validate-counter-selector-wave-20.mjs',
  'test/counter-selector-wave-20.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-20-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W20-EF-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_exception_handling: false,
      manifest_proves_model_elasticity: false,
      manifest_proves_support_adjusted_surplus: false,
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

export function deriveAuditRegistry(contract) {
  return {
    schema_version: 'counter-selector-exception-falsification-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate_audit: structuredClone(contract.candidate_audit),
    negative_controls: structuredClone(contract.negative_controls),
    sources: structuredClone(contract.sources),
    acquisition_lanes: structuredClone(contract.acquisition_lanes),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReviewExportRegistry(contract) {
  const { identity_key, ...exportPacket } = structuredClone(contract.external_review_export_update);
  return {
    schema_version: 'counter-selector-wave-20-external-review-export-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'one_identity_label_removed_export_updated_zero_requests_zero_reviews',
    publication_status: contract.publication_status,
    counts: {
      exports_updated: contract.counts.external_review_exports_updated,
      source_identity_labels_in_exports: 0,
      artifacts_may_remain_inferable: exportPacket.artifact_may_remain_inferable ? 1 : 0,
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

export function deriveReport(contract, audit, review, manifest) {
  const candidate = audit.candidate_audit;
  return {
    schema_version: 'counter-selector-wave-20-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate: {
      candidate_id: candidate.candidate_id,
      source_identity: candidate.source_identity,
      artifact_scope: candidate.artifact_scope,
      previous_supported_dimensions: candidate.previous_supported_dimensions,
      new_support_assignments: candidate.new_support_assignments,
      supported_dimensions_after_update: candidate.supported_dimensions_after_update,
      unresolved_dimensions: candidate.unresolved_dimensions,
      team_mechanisms_not_person_support: candidate.team_mechanisms_not_person_support,
      model_elasticity_adjudication: candidate.model_elasticity_adjudication,
      support_context: candidate.support_context,
      custody_adjudication: candidate.custody_adjudication,
      countermodels: candidate.countermodels,
      external_review_ready: candidate.external_review_ready,
      complete_operator_finding: candidate.complete_operator_finding,
      field_test_eligible: candidate.field_test_eligible,
      graph_effect: candidate.graph_effect
    },
    negative_controls: structuredClone(audit.negative_controls),
    external_review: {
      exports_updated: review.counts.exports_updated,
      identity_labels_in_exports: review.counts.source_identity_labels_in_exports,
      artifacts_may_remain_inferable: review.counts.artifacts_may_remain_inferable,
      review_requests_sent: review.counts.review_requests_sent,
      reviews_executed: review.counts.external_reviews_executed,
      export_ids: review.exports.map((row) => row.export_id)
    },
    open_acquisition_lanes: audit.acquisition_lanes.map((row) => ({
      lane_id: row.lane_id,
      subject: row.subject,
      required_objects: row.required_objects,
      known_routes: row.known_routes,
      route_executed: row.route_executed,
      contact_authorized: row.contact_authorized,
      graph_effect: row.graph_effect
    })),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-20-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const supportRows = report.candidate.new_support_assignments.map((row) =>
    `<tr><td>${esc(row.dimension)}</td><td>${esc(row.state)}</td><td>${esc(row.ceiling)}</td></tr>`
  ).join('');
  const interventionRows = report.candidate.new_support_assignments[0].interventions.map((row) =>
    `<tr><td><code>${esc(row.intervention_id)}</code></td><td>${esc(row.gate)}</td><td>${esc(row.person_action)}</td></tr>`
  ).join('');
  const controlRows = report.negative_controls.map((row) =>
    `<tr><td>${esc(row.control_class)}</td><td>${esc(row.finding)}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Counter-Selector Wave 20</title>` +
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
    `<h1>Exception intervention survived. Surplus and elasticity did not.</h1>` +
    `<p class="state">ONE BOUNDED SUPPORT · TWO UNRESOLVED DIMENSIONS · ZERO EXTERNAL REVIEWS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.person_attributable_exception_interventions}</b>person-attributable interventions</article>` +
    `<article class="card"><b>${report.counts.team_level_mechanisms_preserved}</b>team mechanisms preserved</article>` +
    `<article class="card"><b>${report.counts.custody_counterevidence_items}</b>custody counterevidence items</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews executed</article></div>` +
    `<h2>${esc(report.candidate.source_identity)}</h2>` +
    `<p><strong>Current vector:</strong> ${report.candidate.supported_dimensions_after_update.map(esc).join(', ')}</p>` +
    `<table><thead><tr><th>Dimension</th><th>Bounded state</th><th>Ceiling</th></tr></thead><tbody>${supportRows}</tbody></table>` +
    `<h2>Interventions</h2><table><thead><tr><th>ID</th><th>Gate</th><th>Attributed action</th></tr></thead><tbody>${interventionRows}</tbody></table>` +
    `<h2>Negative controls</h2><table><thead><tr><th>Control</th><th>Finding</th></tr></thead><tbody>${controlRows}</tbody></table>` +
    `<div class="boundary">mission success ≠ person causality\nretrospective self-report ≠ independent corroboration\n` +
    `retrospective assessment change ≠ model elasticity\ncandid self-critique ≠ repair\n` +
    `missing letter copy ≠ complete custody\nsix supported dimensions ≠ rank</div>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave20() {
  const contract = read('data/project/counter-selector-wave-20-exception-falsification.json');
  const audit = deriveAuditRegistry(contract);
  const review = deriveReviewExportRegistry(contract);
  writeJson('data/project/counter-selector-exception-falsification-registry.json', audit);
  writeJson('data/project/counter-selector-wave-20-external-review-export-registry.json', review);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-20-release-manifest.json', manifest);
  const report = deriveReport(contract, audit, review, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-20/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-20/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-20: ${contract.counts.new_person_supports} support, ${contract.counts.person_attributable_exception_interventions} interventions, ${review.counts.external_reviews_executed} external reviews`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave20();
