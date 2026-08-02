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

export const releaseScope = [
  "package.json",
  ".github/workflows/project-stable-ground-sg11.yml",
  ".github/workflows/project-stable-ground-sg12.yml",
  ".github/workflows/status-sovereignty-wave-02-second-party-review.yml",
  "data/project/project-stable-ground-governor.json",
  "data/project/project-stable-ground-current.json",
  "data/project/project-stable-ground-sg11.json",
  "data/project/project-stable-ground-sg11-release-manifest.json",
  "reports/core-thesis/stable-ground/sg11/checkpoint.json",
  "reports/core-thesis/stable-ground/sg11/index.html",
  "data/project/project-stable-ground-sg12.json",
  "docs/milestones/project-stable-ground-sg12.md",
  "tools/build-project-stable-ground-sg11.mjs",
  "tools/validate-project-stable-ground-sg11.mjs",
  "test/project-stable-ground-sg11.test.js",
  "tools/build-project-stable-ground-sg12.mjs",
  "tools/validate-project-stable-ground-sg12.mjs",
  "test/project-stable-ground-sg12.test.js",
  "build/core-thesis/status-sovereignty/wave-02-second-party-review/data.json",
  "build/core-thesis/status-sovereignty/wave-02-second-party-review/manifest.json",
  "data/project/status-sovereignty-wave-02-second-party-review-campaign.json",
  "data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json",
  "data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json",
  "data/research/status-sovereignty-wave-02-second-party-review-candidates.json",
  "data/research/status-sovereignty-wave-02-second-party-review-responses.json",
  "docs/milestones/m05-status-sovereignty-wave-02-second-party-review.md",
  "docs/ssc-wave-02-second-party-review-intake.md",
  "reports/core-thesis/status-sovereignty/wave-02-second-party-review/data.json",
  "reports/core-thesis/status-sovereignty/wave-02-second-party-review/index.html",
  "reports/core-thesis/status-sovereignty/wave-02-second-party-review/intake.html",
  "schemas/status-sovereignty-wave-02-second-party-review-candidate.schema.json",
  "test/status-sovereignty-wave-02-second-party-review.test.js",
  "tools/build-status-sovereignty-wave-02-second-party-review.mjs",
  "tools/validate-status-sovereignty-wave-02-second-party-review.mjs",
  "build/core-thesis/status-sovereignty/data.json",
  "build/core-thesis/status-sovereignty/manifest.json",
  "data/project/poof-clifford-ecology-release-manifest.json",
  "data/project/status-sovereignty-release-manifest.json",
  "reports/core-thesis/poof-clifford-ecology/release-manifest.json",
  "reports/core-thesis/status-sovereignty/data.json",
  "reports/core-thesis/status-sovereignty/index.html"
];

export function computeSg12Manifest() {
  const entries = releaseScope.map((rel) => {
    const value = bytes(rel);
    return { path: rel, sha256: sha256(value), bytes: value.length };
  });
  return {
    schema_version: 'project-stable-ground-sg12-release-manifest@1',
    checkpoint_id: 'SG-2026-08-01-12',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\u0000${row.sha256}\u0000${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_external_review: false,
      candidate_profiles_prove_independence: false,
      candidate_records_prove_eligibility: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_invitation: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG12() {
  const checkpoint = read('data/project/project-stable-ground-sg12.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const campaign = read('data/project/status-sovereignty-wave-02-second-party-review-campaign.json');
  const candidates = read('data/research/status-sovereignty-wave-02-second-party-review-candidates.json');
  const manifest = computeSg12Manifest();
  write('data/project/project-stable-ground-sg12-release-manifest.json', stable(manifest));
  const report = {
    schema_version: 'project-stable-ground-sg12-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: checkpoint.title,
    canonical_main: checkpoint.canonical_main,
    supersedes: checkpoint.supersedes,
    history: pointer.history,
    authority_change: checkpoint.authority_change,
    counts: {
      checkpoints_preserved: pointer.history.length,
      wave_packets: campaign.counts.wave_packets,
      maintainer_reviewed_packets: campaign.counts.maintainer_reviewed_packets,
      unassigned_packets: campaign.counts.unassigned_packets,
      reviewer_candidates: campaign.counts.reviewer_candidates,
      screened_ineligible: campaign.counts.ineligible,
      invitations: campaign.counts.invitations,
      accepted_assignments: campaign.counts.accepted_assignments,
      valid_reviews: campaign.counts.valid_reviews,
      second_party_reviewed_packets: campaign.counts.second_party_reviewed_packets,
      adjudicated_packets: campaign.counts.adjudicated_packets,
      publication_clearances: campaign.counts.publication_clearances,
      graph_effects: campaign.counts.graph_effects
    },
    candidate_ids: candidates.records.map((row) => row.candidate_id),
    exact_custody: {
      transition_campaign_release_sha256: checkpoint.trigger.transition_campaign_release_sha256,
      checkpoint_campaign_release_sha256: checkpoint.trigger.checkpoint_campaign_release_sha256,
      checkpoint_status_release_sha256: checkpoint.trigger.checkpoint_status_release_sha256,
      checkpoint_poof_release_sha256: checkpoint.trigger.checkpoint_poof_release_sha256,
      sg11_release_sha256: checkpoint.supersedes.release_sha256,
      transition_commit: checkpoint.trigger.transition_commit,
      transition_paths_sha256: checkpoint.trigger.transition_paths_sha256,
      candidate_registry_sha256: checkpoint.trigger.candidate_registry_sha256
    },
    boundaries: checkpoint.boundaries,
    completion: checkpoint.completion,
    release_manifest: {
      path: 'data/project/project-stable-ground-sg12-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg12/checkpoint.json', stable(report));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-12 · SSC-W02 candidate discovery</title></head><body><p><code>SG-2026-08-01-12</code></p><h1>Eight candidate-only records; external review remains zero</h1><p><b>8/8 PACKETS FROZEN · 8 CANDIDATE-ONLY · 2 SCREENED INELIGIBLE · 0 INVITATIONS · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · ADOPTION A0</b></p><p>Public profile verification is not identity attestation, conflict disclosure, eligibility, assignment, review, adjudication, publication authority, or adoption.</p><pre>${JSON.stringify(report.exact_custody, null, 2)}</pre><p><code>SG-12 release SHA-256: ${manifest.combined_sha256}</code></p></body></html>\n`;
  write('reports/core-thesis/stable-ground/sg12/index.html', html);
  console.log('build-project-stable-ground-sg12: 12 checkpoints, 8 candidate-only, 0 invitations, 0 external reviews');
  return { checkpoint, campaign, candidates, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG12();
