#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  'package.json',
  '.github/workflows/project-stable-ground-sg08.yml',
  '.github/workflows/project-stable-ground-sg09.yml',
  '.github/workflows/status-sovereignty-wave-01-second-party-review.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg08.json',
  'data/project/project-stable-ground-sg08-release-manifest.json',
  'reports/core-thesis/stable-ground/sg08/checkpoint.json',
  'reports/core-thesis/stable-ground/sg08/index.html',
  'data/project/project-stable-ground-sg09.json',
  'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
  'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
  'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
  'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
  'schemas/status-sovereignty-second-party-review-campaign.schema.json',
  'schemas/status-sovereignty-second-party-review-candidate.schema.json',
  'schemas/status-sovereignty-second-party-review-receipt.schema.json',
  'docs/ssc-wave-01-second-party-review-intake.md',
  'docs/milestones/m05-status-sovereignty-wave-01-second-party-review.md',
  'docs/milestones/project-stable-ground-sg09.md',
  'tools/build-status-sovereignty-wave-01-second-party-review.mjs',
  'tools/validate-status-sovereignty-wave-01-second-party-review.mjs',
  'test/status-sovereignty-wave-01-second-party-review.test.js',
  'tools/build-project-stable-ground-sg09.mjs',
  'tools/validate-project-stable-ground-sg08.mjs',
  'test/project-stable-ground-sg08.test.js',
  'tools/validate-project-stable-ground-sg09.mjs',
  'test/project-stable-ground-sg09.test.js',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'reports/core-thesis/poof-clifford-ecology/release-manifest.json'
];

export function computeSg09Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg09-release-manifest@1',
    checkpoint_id: 'SG-2026-07-31-09',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_reviewer_independence: false,
      manifest_proves_valid_second_party_review: false,
      manifest_changes_canonical_disposition: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      manifest_rewrites_sg08: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG09() {
  const pointer = read('data/project/project-stable-ground-current.json');
  if (pointer.current_checkpoint_id !== 'SG-2026-07-31-09') {
    console.log(`build-project-stable-ground-sg09: historical checkpoint preserved; current checkpoint ${pointer.current_checkpoint_id}; no write`);
    return { historical: true, pointer };
  }
  const checkpoint = read('data/project/project-stable-ground-sg09.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const campaign = read('data/project/status-sovereignty-wave-01-second-party-review-campaign.json');
  const packets = read('data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json');
  const candidates = read('data/research/status-sovereignty-wave-01-second-party-review-candidates.json');
  const responses = read('data/research/status-sovereignty-wave-01-second-party-review-responses.json');
  const campaignRelease = read('data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const publicPoofRelease = read('reports/core-thesis/poof-clifford-ecology/release-manifest.json');
  const manifest = computeSg09Manifest();
  write('data/project/project-stable-ground-sg09-release-manifest.json', stable(manifest));

  const report = {
    schema_version: 'project-stable-ground-sg09-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: checkpoint.title,
    canonical_main: checkpoint.canonical_main,
    supersedes: checkpoint.supersedes,
    history: pointer.history,
    governor: {
      path: checkpoint.governor,
      schema_version: governor.schema_version,
      correction_mode: governor.checkpoint_contract.correction_mode
    },
    authority_change: checkpoint.authority_change,
    counts: {
      checkpoints_preserved: pointer.history.length,
      wave_packets: campaign.counts.wave_packets,
      packet_registry_rows: packets.counts.packet_denominator,
      unassigned_packets: packets.counts.unassigned_packets,
      maintainer_reviewed_packets: campaign.counts.maintainer_reviewed_packets,
      reviewer_candidates: candidates.records.length,
      review_invitations: candidates.counts.invitations,
      accepted_assignments: candidates.counts.accepted_assignments,
      valid_reviews: responses.counts.valid_reviews,
      adjudicated_packets: packets.counts.adjudicated_packets,
      canonical_disposition_changes: campaign.counts.canonical_disposition_changes,
      publication_clearances: campaign.counts.publication_clearances,
      graph_effects: campaign.counts.graph_effects
    },
    canonical_snapshot: checkpoint.canonical_snapshot,
    fanout_state: checkpoint.fanout_state,
    build_order: checkpoint.build_order,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    exact_custody: {
      transition_campaign_release_sha256: checkpoint.trigger.campaign_release_sha256,
      current_campaign_release_sha256: campaignRelease.combined_sha256,
      status_release_sha256: statusRelease.combined_sha256,
      poof_release_sha256: poofRelease.combined_sha256,
      public_poof_release_sha256: publicPoofRelease.combined_sha256,
      sg08_release_sha256: checkpoint.supersedes.release_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg09-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg09/checkpoint.json', stable(report));

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const packetRows = packets.packets.map((row) => `<tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.lane_id)}</td><td><code>${esc(row.packet_sha256)}</code></td><td>${esc(row.assignment.state)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-09 · SSC-W01 separated review campaign · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1420px;margin:auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,6vw,4.7rem);line-height:.96}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:collapse}th,td{padding:.65rem;border-bottom:1px solid #d5cdbf;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><code>${esc(checkpoint.checkpoint_id)}</code></p><h1>Separated review infrastructure without self-awarded review</h1><p class="state">14/14 PACKETS FROZEN · 14/14 UNASSIGNED · 0 CANDIDATES · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${packets.counts.packet_denominator}</b>exact packets</div><div class="card"><b>${candidates.records.length}</b>candidates</div><div class="card"><b>${candidates.counts.invitations}</b>invitations</div><div class="card"><b>${candidates.counts.accepted_assignments}</b>accepted</div><div class="card"><b>${responses.counts.valid_reviews}</b>valid reviews</div><div class="card"><b>${packets.counts.adjudicated_packets}</b>adjudicated</div></div><div class="boundary"><strong>Authority ceiling.</strong> External participation is required to claim external review. It is not permission for the project to reason. No invitation, nonresponse, refusal, acceptance, or unvalidated submission counts as review.</div><h2>Exact packet denominator</h2><table><thead><tr><th>Packet</th><th>Lane</th><th>SHA-256</th><th>Assignment</th></tr></thead><tbody>${packetRows}</tbody></table><h2>Checkpoint history</h2><table><thead><tr><th>Checkpoint</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table><h2>Exact custody</h2><pre>${esc(JSON.stringify(report.exact_custody, null, 2))}</pre><p><code>SG-09 release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg09/index.html', `${html}\n`);
  console.log(`build-project-stable-ground-sg09: ${pointer.history.length} checkpoints, ${packets.counts.packet_denominator} packets, ${candidates.records.length} candidates, ${responses.counts.valid_reviews} valid reviews, ${manifest.entries.length} release entries`);
  return { checkpoint, pointer, campaign, packets, candidates, responses, campaignRelease, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG09();
