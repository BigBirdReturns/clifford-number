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
  '.github/workflows/status-sovereignty-wave-02-second-party-review.yml',
  'data/project/status-sovereignty-wave-02-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json',
  'data/research/status-sovereignty-wave-02-second-party-review-candidates.json',
  'data/research/status-sovereignty-wave-02-second-party-review-responses.json',
  'schemas/status-sovereignty-wave-02-second-party-review-campaign.schema.json',
  'schemas/status-sovereignty-wave-02-second-party-review-candidate.schema.json',
  'schemas/status-sovereignty-wave-02-second-party-review-receipt.schema.json',
  'docs/ssc-wave-02-second-party-review-intake.md',
  'docs/milestones/m05-status-sovereignty-wave-02-second-party-review.md',
  'tools/build-status-sovereignty-wave-02-second-party-review.mjs',
  'tools/validate-status-sovereignty-wave-02-second-party-review.mjs',
  'test/status-sovereignty-wave-02-second-party-review.test.js',
  'package.json'
];

export function computeW02SPRManifest() {
  const entries = releaseScope.map((rel) => {
    const value = bytes(rel);
    return { path: rel, sha256: sha256(value), bytes: value.length };
  });
  return {
    schema_version: 'status-sovereignty-wave-02-second-party-review-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-W02',
    campaign_id: 'SSC-W02-SPR01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\u0000${row.sha256}\u0000${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_independence: false,
      manifest_proves_valid_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildW02SPR() {
  const campaign = read('data/project/status-sovereignty-wave-02-second-party-review-campaign.json');
  const packets = read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json');
  const candidates = read('data/research/status-sovereignty-wave-02-second-party-review-candidates.json');
  const responses = read('data/research/status-sovereignty-wave-02-second-party-review-responses.json');
  const manifest = computeW02SPRManifest();
  write('data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json', stable(manifest));
  const report = {
    schema_version: 'status-sovereignty-wave-02-second-party-review-report@1',
    ...campaign,
    packets,
    candidates,
    responses,
    release_manifest: {
      path: 'data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('build/core-thesis/status-sovereignty/wave-02-second-party-review/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-02-second-party-review/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-02-second-party-review/data.json', stable(report));
  const byPacket = new Map(candidates.records.map((row) => [row.packet_id, row]));
  const rows = packets.packets.map((packet) => {
    const candidate = byPacket.get(packet.packet_id);
    return `<tr><td><code>${escapeHtml(packet.packet_id)}</code><br><code>${escapeHtml(packet.observation_id)}</code></td><td>${escapeHtml(packet.lane_id)}</td><td>${escapeHtml(packet.reviewed_disposition)}</td><td>${escapeHtml(packet.assignment_state)}</td><td>${escapeHtml(candidate?.candidate_id ?? 'none')}</td><td>${escapeHtml(candidate?.candidate_state ?? 'none')}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>SSC-W02 candidate-only review campaign</title></head><body><h1>SSC-W02 separated review campaign</h1><p><b>8 PACKETS · 8 CANDIDATES · 0 INVITATIONS · 0 VALID REVIEWS · 2 SCREENED INELIGIBLE · 0 ADJUDICATIONS · GRAPH EFFECT NONE</b></p><p>Every retained person is candidate-only, uncontacted, unassigned, and conflict-unresolved. Candidate discovery is not external review.</p><table><thead><tr><th>Packet</th><th>Lane</th><th>Disposition</th><th>Assignment</th><th>Candidate</th><th>State</th></tr></thead><tbody>${rows}</tbody></table><pre>${JSON.stringify(campaign.boundaries, null, 2)}</pre><p><code>${manifest.combined_sha256}</code></p></body></html>\n`;
  write('reports/core-thesis/status-sovereignty/wave-02-second-party-review/index.html', html);
  write('reports/core-thesis/status-sovereignty/wave-02-second-party-review/intake.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>SSC-W02 reviewer intake</title></head><body><h1>Reviewer intake</h1><p>Use Issue #571. A nomination, public profile, candidate record, or conflict screen is not a review. No invitation is authorized until identity and packet-specific conflict disclosure are received and evaluated.</p></body></html>\n');
  console.log(`build-status-sovereignty-wave-02-second-party-review: ${packets.packets.length} packets, ${candidates.records.length} candidates, ${campaign.counts.valid_reviews} valid reviews`);
  return { campaign, packets, candidates, responses, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildW02SPR();
