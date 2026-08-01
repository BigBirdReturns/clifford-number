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
  '.github/workflows/counter-selector-wave-21.yml',
  'data/project/counter-selector-wave-21-gate-exhaustion.json',
  'schemas/counter-selector-gate-exhaustion.schema.json',
  'docs/methods/counter-selector-gate-exhaustion.md',
  'docs/milestones/counter-selector-wave-21.md',
  'docs/requests/counter-selector-wave-21-loc-request.md',
  'docs/requests/counter-selector-wave-21-un-arms-request.md',
  'docs/requests/counter-selector-wave-21-carter-library-request.md',
  'tools/build-counter-selector-wave-21.mjs',
  'tools/validate-counter-selector-wave-21.mjs',
  'test/counter-selector-wave-21.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-21-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W21-GE-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_person_causality: false,
      manifest_proves_model_elasticity: false,
      manifest_proves_support_adjusted_surplus: false,
      manifest_proves_direct_handoff: false,
      manifest_proves_external_review: false,
      manifest_proves_complete_operator: false,
      manifest_authorizes_custodian_contact: false,
      manifest_authorizes_subject_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveGateRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-21-gate-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate_gate_state: structuredClone(contract.candidate_gate_state),
    contemporaneous_corroboration: structuredClone(contract.contemporaneous_corroboration),
    model_elasticity_tests: structuredClone(contract.model_elasticity_tests),
    support_adjusted_surplus_adjudication: structuredClone(contract.support_adjusted_surplus_adjudication),
    direct_handoff_adjudication: structuredClone(contract.direct_handoff_adjudication),
    sources: structuredClone(contract.sources),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveArchiveRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-21-archive-request-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'three_exact_archive_packets_prepared_zero_sent',
    publication_status: contract.publication_status,
    counts: {
      request_packets_prepared: contract.archive_request_packets.length,
      requests_sent: contract.counts.archive_requests_sent,
      routes_executed: contract.archive_request_packets.filter((row) => row.route_executed).length,
      custodian_contacts_authorized: contract.counts.custodian_contacts_authorized,
      source_subject_contacts_authorized: contract.counts.source_subject_contacts_authorized,
      evidence_objects_acquired: 0,
      graph_effects: contract.counts.graph_effects
    },
    requests: structuredClone(contract.archive_request_packets),
    boundaries: {
      prepared_packet_is_sent_request: false,
      custodian_route_is_acquired_evidence: false,
      known_email_authorizes_contact: false,
      reading_room_closure_is_record_absence: false,
      locator_request_is_subject_contact: false,
      graph_effect: 'none'
    }
  };
}

export function deriveExternalReviewRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-21-external-review-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'one_public_independent_review_request_open_zero_responses_zero_reviews',
    publication_status: contract.publication_status,
    counts: {
      requests_opened: contract.counts.external_review_requests_opened,
      responses_received: contract.counts.external_review_responses_received,
      reviews_executed: contract.counts.external_selector_reviews_executed,
      source_identity_labels_in_request_title: 0,
      artifact_may_remain_inferable: contract.external_review.artifact_may_remain_inferable ? 1 : 0,
      subject_contacts: contract.external_review.subject_contacted ? 1 : 0,
      field_tests_authorized: contract.external_review.field_test_authorized ? 1 : 0,
      graph_effects: contract.counts.graph_effects
    },
    request: structuredClone(contract.external_review),
    required_review_states: [
      'bounded_support',
      'contradicted',
      'insufficient_evidence',
      'not_tested'
    ],
    boundaries: {
      request_opened_is_external_review: false,
      zero_response_is_completed_review: false,
      identity_label_removed_is_identity_blind: false,
      issue_participation_is_reviewer_independence: false,
      review_response_authorizes_subject_contact: false,
      review_response_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(contract, gates, archives, external, manifest) {
  return {
    schema_version: 'counter-selector-wave-21-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate: {
      candidate_id: gates.candidate_gate_state.candidate_id,
      source_identity: gates.candidate_gate_state.source_identity,
      previous_supported_dimensions: gates.candidate_gate_state.previous_supported_dimensions,
      previous_unresolved_dimensions: gates.candidate_gate_state.previous_unresolved_dimensions,
      gate_results: gates.candidate_gate_state.gate_results,
      supported_dimensions_after_exhaustion: gates.candidate_gate_state.supported_dimensions_after_exhaustion,
      unresolved_dimensions_after_exhaustion: gates.candidate_gate_state.unresolved_dimensions_after_exhaustion,
      complete_operator_finding: gates.candidate_gate_state.complete_operator_finding,
      field_test_eligible: gates.candidate_gate_state.field_test_eligible,
      graph_effect: gates.candidate_gate_state.graph_effect
    },
    corroboration: {
      records: gates.contemporaneous_corroboration.length,
      person_causality_upgrades: gates.counts.person_causality_upgrades
    },
    model_elasticity: {
      tests: gates.model_elasticity_tests,
      supported: gates.model_elasticity_tests.some((row) => row.supported)
    },
    support_adjusted_surplus: structuredClone(gates.support_adjusted_surplus_adjudication),
    direct_handoff: structuredClone(gates.direct_handoff_adjudication),
    archive_acquisition: {
      packets_prepared: archives.counts.request_packets_prepared,
      requests_sent: archives.counts.requests_sent,
      routes_executed: archives.counts.routes_executed,
      request_ids: archives.requests.map((row) => row.request_id)
    },
    external_review: {
      issue_number: external.request.issue_number,
      request_opened: external.request.request_opened,
      responses_received: external.counts.responses_received,
      reviews_executed: external.counts.reviews_executed,
      artifact_may_remain_inferable: external.request.artifact_may_remain_inferable,
      subject_contacted: external.request.subject_contacted,
      field_test_authorized: external.request.field_test_authorized
    },
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-21-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const gateRows = report.candidate.gate_results.map((row) =>
    `<tr><td>${esc(row.gate)}</td><td>${esc(row.state)}</td><td>${row.cleared}</td><td>${esc(row.basis)}</td></tr>`
  ).join('');
  const modelRows = report.model_elasticity.tests.map((row) =>
    `<tr><td><code>${esc(row.test_id)}</code></td><td>${esc(row.classification)}</td><td>${row.supported}</td><td>${row.missing_sequence.map(esc).join('; ')}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Counter-Selector Wave 21</title>` +
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
    `<h1>Every remaining gate was attacked. None was forced.</h1>` +
    `<p class="state">SIX GATE FAMILIES · ONE REVIEW REQUEST · ZERO NEW DIMENSIONS</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.gate_families_attacked}</b>gate families attacked</article>` +
    `<article class="card"><b>${report.counts.archive_request_packets_prepared}</b>archive packets prepared</article>` +
    `<article class="card"><b>${report.counts.external_review_requests_opened}</b>review requests opened</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews executed</article></div>` +
    `<h2>Gate outcomes</h2><table><thead><tr><th>Gate</th><th>State</th><th>Cleared</th><th>Basis</th></tr></thead><tbody>${gateRows}</tbody></table>` +
    `<h2>Model-elasticity attacks</h2><table><thead><tr><th>Test</th><th>Classification</th><th>Supported</th><th>Missing sequence</th></tr></thead><tbody>${modelRows}</tbody></table>` +
    `<div class="boundary">issue corroboration ≠ person causality\nchange of mind ≠ complete model elasticity\n` +
    `mission scale ≠ support-adjusted surplus\nsuccessor continuity ≠ direct handoff\n` +
    `request prepared ≠ request sent\nreview request opened ≠ external review</div>` +
    `<p><strong>Current vector:</strong> ${report.candidate.supported_dimensions_after_exhaustion.map(esc).join(', ')}</p>` +
    `<p><strong>Unresolved:</strong> ${report.candidate.unresolved_dimensions_after_exhaustion.map(esc).join(', ')}</p>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave21() {
  const contract = read('data/project/counter-selector-wave-21-gate-exhaustion.json');
  const gates = deriveGateRegistry(contract);
  const archives = deriveArchiveRegistry(contract);
  const external = deriveExternalReviewRegistry(contract);
  writeJson('data/project/counter-selector-wave-21-gate-registry.json', gates);
  writeJson('data/project/counter-selector-wave-21-archive-request-registry.json', archives);
  writeJson('data/project/counter-selector-wave-21-external-review-registry.json', external);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-21-release-manifest.json', manifest);
  const report = deriveReport(contract, gates, archives, external, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-21/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-21/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-21: ${contract.counts.gate_families_attacked} gates attacked, ${contract.counts.external_review_requests_opened} review request opened, ${contract.counts.new_dimension_supports} new dimensions`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave21();
