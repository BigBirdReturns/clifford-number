#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = (rel) => fs.readFileSync(path.join(root, rel));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-wave-02-internal-adversarial-review.yml',
  'data/project/no-magic-human-gate.json',
  'data/research/status-sovereignty-wave-02-internal-adversarial-review.json',
  'schemas/status-sovereignty-wave-02-internal-adversarial-review.schema.json',
  'docs/milestones/m05-status-sovereignty-wave-02-internal-adversarial-review.md',
  'tools/build-status-sovereignty-wave-02-internal-adversarial-review.mjs',
  'tools/validate-status-sovereignty-wave-02-internal-adversarial-review.mjs',
  'test/status-sovereignty-wave-02-internal-adversarial-review.test.js'
];

export function computeInternalAdversarialReviewManifest() {
  const entries = releaseScope.map((rel) => {
    const value = bytes(rel);
    return { path: rel, sha256: sha256(value), bytes: value.length };
  });
  return {
    schema_version: 'status-sovereignty-wave-02-internal-adversarial-review-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-W02',
    review_id: 'SSC-W02-IAR01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\u0000${row.sha256}\u0000${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_external_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_canonical_disposition_change: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildInternalAdversarialReview() {
  const review = read('data/research/status-sovereignty-wave-02-internal-adversarial-review.json');
  const parent = read('data/research/status-sovereignty-wave-02-maintainer-review.json');
  const packets = read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json');
  const policy = read('data/project/no-magic-human-gate.json');
  const manifest = computeInternalAdversarialReviewManifest();

  write('data/project/status-sovereignty-wave-02-internal-adversarial-review-release-manifest.json', stable(manifest));

  const report = {
    schema_version: 'status-sovereignty-wave-02-internal-adversarial-review-report@1',
    review,
    parent_review: {
      review_id: parent.review_id,
      status: parent.status,
      maintainer_reviewed: parent.counts?.maintainer_reviewed,
      second_party_reviewed: parent.counts?.second_party_reviewed,
      adjudicated: parent.counts?.adjudicated
    },
    packet_registry: {
      campaign_id: packets.campaign_id,
      packets: packets.counts?.wave_packets,
      reviewer_candidates: packets.counts?.reviewer_candidates,
      valid_reviews: packets.counts?.valid_reviews
    },
    no_magic_human_gate: {
      status: policy.status,
      external_participation_is_optional_evidence_lane: policy.laws?.external_participation_is_optional_evidence_lane,
      absence_must_not_suspend_project_work: policy.laws?.absence_must_not_suspend_project_work,
      on_absence: policy.operator_contract?.on_absence
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-wave-02-internal-adversarial-review-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/status-sovereignty/wave-02-internal-adversarial-review/data.json', stable(report));

  const rows = review.records.map((row) => `<tr><td><code>${escapeHtml(row.packet_id)}</code><br><code>${escapeHtml(row.observation_id)}</code></td><td>${escapeHtml(row.canonical_disposition)}</td><td>${escapeHtml(row.adversarial_result)}</td><td>${escapeHtml(row.recommended_disposition)}</td><td>${escapeHtml(row.acquisition_priority)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>SSC-W02 internal adversarial counter-review</title></head><body><h1>SSC-W02 internal adversarial counter-review</h1><p><b>8 PACKETS · 8 INTERNAL COUNTER-REVIEWS · 0 EXTERNAL REVIEWS · 0 CANONICAL CHANGES · 3 HIGH-PRIORITY ACQUISITIONS · 1 AUTHORITY NARROWING · 1 TAXONOMY CHALLENGE · GRAPH EFFECT NONE</b></p><p>Missing outside participation is recorded as zero and does not block internal judgment or project progress. This surface is not external review or adjudication.</p><table><thead><tr><th>Packet</th><th>Canonical disposition</th><th>Adversarial result</th><th>Recommendation</th><th>Acquisition</th></tr></thead><tbody>${rows}</tbody></table><pre>${escapeHtml(JSON.stringify(review.boundaries, null, 2))}</pre><p><code>${manifest.combined_sha256}</code></p></body></html>\n`;
  write('reports/core-thesis/status-sovereignty/wave-02-internal-adversarial-review/index.html', html);

  console.log(`build-status-sovereignty-wave-02-internal-adversarial-review: ${review.records.length} internal counter-reviews, ${review.counts.external_reviews} external reviews, ${review.counts.canonical_disposition_changes} canonical changes`);
  return { review, parent, packets, policy, manifest, report, html };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildInternalAdversarialReview();
