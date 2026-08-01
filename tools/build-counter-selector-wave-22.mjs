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
  '.github/workflows/counter-selector-wave-22.yml',
  'data/project/counter-selector-wave-22-external-execution.json',
  'schemas/counter-selector-external-gate-execution.schema.json',
  'docs/methods/counter-selector-external-gate-execution.md',
  'docs/milestones/counter-selector-wave-22.md',
  'tools/build-counter-selector-wave-22.mjs',
  'tools/validate-counter-selector-wave-22.mjs',
  'test/counter-selector-wave-22.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-22-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W22-EX-01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_recipient_delivery: false,
      exact_bytes_prove_archive_response: false,
      exact_bytes_prove_record_existence: false,
      exact_bytes_prove_model_elasticity: false,
      exact_bytes_prove_support_adjusted_surplus: false,
      exact_bytes_prove_direct_handoff: false,
      exact_bytes_prove_external_review: false,
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

export function deriveRequestRegistry(contract) {
  return {
    schema_version: 'counter-selector-wave-22-request-receipt-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    archive_requests: structuredClone(contract.archive_requests),
    independent_review: structuredClone(contract.independent_review),
    candidate_state: structuredClone(contract.candidate_state),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries)
  };
}

export function deriveReport(contract, registry, manifest) {
  return {
    schema_version: 'counter-selector-wave-22-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    observed_at: contract.observed_at,
    title: contract.title,
    status: contract.status,
    publication_status: contract.publication_status,
    counts: structuredClone(contract.counts),
    candidate: structuredClone(contract.candidate_state),
    archive_execution: registry.archive_requests.map((row) => ({
      request_id: row.request_id,
      custodian: row.custodian,
      recipient: row.recipient,
      sent_at: row.sent_at,
      gmail_message_id: row.gmail_message_id,
      gmail_submission_receipt: row.gmail_submission_receipt,
      recipient_delivery_confirmed: row.recipient_delivery_confirmed,
      response_state: row.response_state,
      response_received: row.response_received,
      substantive_reference_response: row.substantive_reference_response,
      evidence_objects_acquired: row.evidence_objects_acquired,
      next_state: row.next_state
    })),
    independent_review: structuredClone(registry.independent_review),
    next_action: contract.next_action,
    boundaries: structuredClone(contract.boundaries),
    release_manifest: {
      path: 'data/project/counter-selector-wave-22-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export function renderHtml(report) {
  const requests = report.archive_execution.map((row) =>
    `<tr><td>${esc(row.request_id)}</td><td>${esc(row.custodian)}</td><td>${esc(row.sent_at)}</td>` +
    `<td>${esc(row.response_state)}</td><td>${row.evidence_objects_acquired}</td></tr>`
  ).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 22</title>` +
    `<style>:root{color-scheme:light;background:#f3f0e9;color:#171714;font-family:system-ui,sans-serif}` +
    `body{max-width:1200px;margin:auto;padding:40px 24px;line-height:1.55}` +
    `h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.96;letter-spacing:-.05em}` +
    `.state{font-weight:900;color:#7a301d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}` +
    `.card,table,.boundary{background:#fffdf8;border:1px solid #c8c0b1;border-radius:12px}` +
    `.card{padding:16px}.card b{display:block;font-size:2.2rem}` +
    `table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.9rem}` +
    `th,td{padding:11px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}` +
    `.boundary{border-left:7px solid #7a301d;padding:18px;margin-top:28px;white-space:pre-wrap}` +
    `code{overflow-wrap:anywhere}</style></head><body>` +
    `<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · ${esc(report.wave_id)}</strong></p>` +
    `<h1>The requests left the building. The evidence did not arrive with them.</h1>` +
    `<p class="state">THREE REQUESTS SENT · ONE AUTOMATIC SERVICE REFUSAL · ZERO ARCHIVE EVIDENCE</p>` +
    `<div class="grid"><article class="card"><b>${report.counts.archive_requests_sent}</b>archive requests sent</article>` +
    `<article class="card"><b>${report.counts.responses_received}</b>responses received</article>` +
    `<article class="card"><b>${report.counts.archive_evidence_objects_acquired}</b>archive evidence objects</article>` +
    `<article class="card"><b>${report.counts.external_selector_reviews_executed}</b>external reviews</article></div>` +
    `<table><thead><tr><th>Request</th><th>Custodian</th><th>Sent</th><th>Response state</th><th>Evidence objects</th></tr></thead>` +
    `<tbody>${requests}</tbody></table>` +
    `<div class="boundary">Gmail SENT ≠ recipient delivery\nrequest sent ≠ archive response\nautomatic closure notice ≠ record absence\nopen issue ≠ independent review\nexternal execution ≠ complete operator</div>` +
    `<p><strong>Candidate vector unchanged:</strong> ${report.candidate.supported_dimensions.map(esc).join(', ')}</p>` +
    `<p><strong>Unresolved:</strong> ${report.candidate.unresolved_dimensions.map(esc).join(', ')}</p>` +
    `<p><strong>Next:</strong> ${esc(report.next_action)}</p>` +
    `<p><code>${esc(report.release_manifest.combined_sha256)}</code></p></body></html>\n`;
}

export function buildCounterSelectorWave22() {
  const contract = read('data/project/counter-selector-wave-22-external-execution.json');
  const registry = deriveRequestRegistry(contract);
  writeJson('data/project/counter-selector-wave-22-request-receipt-registry.json', registry);
  const manifest = computeReleaseManifest();
  writeJson('data/project/counter-selector-wave-22-release-manifest.json', manifest);
  const report = deriveReport(contract, registry, manifest);
  writeJson('reports/core-thesis/counter-selector-wave-22/data.json', report);
  writeText('reports/core-thesis/counter-selector-wave-22/index.html', renderHtml(report));
  console.log(`build-counter-selector-wave-22: ${contract.counts.archive_requests_sent} sent, ${contract.counts.responses_received} responses, ${contract.counts.archive_evidence_objects_acquired} evidence objects`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildCounterSelectorWave22();
