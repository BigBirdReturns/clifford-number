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
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaObject = (value) => sha256(stable(value));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c]));

export const sourcePaths = {
  campaign: 'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  candidates: 'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
  responses: 'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
  review: 'data/research/status-sovereignty-wave-01-maintainer-review.json',
  reviewSources: 'data/research/status-sovereignty-wave-01-source-receipts.json',
  reviewManifest: 'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  acquisition: 'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  acquisitionSources: 'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  acquisitionManifest: 'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
  campaignSchema: 'schemas/status-sovereignty-second-party-review-campaign.schema.json',
  candidateSchema: 'schemas/status-sovereignty-second-party-review-candidate.schema.json',
  receiptSchema: 'schemas/status-sovereignty-second-party-review-receipt.schema.json',
  intake: 'docs/ssc-wave-01-second-party-review-intake.md',
  milestone: 'docs/milestones/m05-status-sovereignty-wave-01-second-party-review.md'
};

export const releaseScope = [
  '.github/workflows/status-sovereignty-wave-01-second-party-review.yml',
  'package.json',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  sourcePaths.campaign,
  sourcePaths.candidates,
  sourcePaths.responses,
  sourcePaths.review,
  sourcePaths.reviewSources,
  sourcePaths.reviewManifest,
  sourcePaths.acquisition,
  sourcePaths.acquisitionSources,
  sourcePaths.acquisitionManifest,
  sourcePaths.campaignSchema,
  sourcePaths.candidateSchema,
  sourcePaths.receiptSchema,
  sourcePaths.intake,
  sourcePaths.milestone,
  'tools/build-status-sovereignty-wave-01-second-party-review.mjs',
  'tools/validate-status-sovereignty-wave-01-second-party-review.mjs',
  'test/status-sovereignty-wave-01-second-party-review.test.js'
];

export function computeSecondPartyReviewManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-second-party-review-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-W01',
    campaign_id: 'SSC-W01-SPR01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_reviewer_independence: false,
      manifest_proves_valid_review: false,
      manifest_changes_canonical_disposition: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function loadSecondPartyReviewSources() {
  return {
    campaign: read(sourcePaths.campaign),
    candidates: read(sourcePaths.candidates),
    responses: read(sourcePaths.responses),
    review: read(sourcePaths.review),
    reviewSources: read(sourcePaths.reviewSources),
    reviewManifest: read(sourcePaths.reviewManifest),
    acquisition: read(sourcePaths.acquisition),
    acquisitionSources: read(sourcePaths.acquisitionSources),
    acquisitionManifest: read(sourcePaths.acquisitionManifest)
  };
}

export function deriveSecondPartyPacketRegistry(context = loadSecondPartyReviewSources()) {
  const {
    campaign, review, reviewSources, reviewManifest,
    acquisition, acquisitionSources, acquisitionManifest
  } = context;
  const reviewSourceById = new Map(reviewSources.records.map((row) => [row.source_id, row]));
  const acquisitionByObservation = new Map(acquisition.obligations.map((row) => [row.observation_id, row]));
  const acquisitionSourceById = new Map(acquisitionSources.records.map((row) => [row.source_id, row]));

  const packets = review.reviewed_observations.map((observation) => {
    const parentSources = observation.source_ids.map((sourceId) => {
      const row = reviewSourceById.get(sourceId);
      return {
        source_id: sourceId,
        present: Boolean(row),
        record_sha256: row ? shaObject(row) : null
      };
    });
    const obligation = acquisitionByObservation.get(observation.observation_id) ?? null;
    const targetedSources = (obligation?.source_ids ?? []).map((sourceId) => {
      const row = acquisitionSourceById.get(sourceId);
      return {
        source_id: sourceId,
        present: Boolean(row),
        record_sha256: row ? shaObject(row) : null
      };
    });
    const packetMaterial = {
      packet_id: observation.observation_id,
      lane_id: observation.lane_id,
      maintainer_review_release_sha256: reviewManifest.combined_sha256,
      reviewed_observation_sha256: shaObject(observation),
      parent_source_records: parentSources,
      targeted_acquisition_release_sha256: obligation ? acquisitionManifest.combined_sha256 : null,
      targeted_acquisition_obligation_sha256: obligation ? shaObject(obligation) : null,
      targeted_source_records: targetedSources
    };
    return {
      packet_id: observation.observation_id,
      lane_id: observation.lane_id,
      maintainer_review_state: observation.review_state,
      reviewed_disposition: observation.reviewed_disposition,
      second_party_review_state: observation.second_party_review_state,
      adjudication_state: observation.adjudication_state,
      source_ids: [...observation.source_ids],
      targeted_acquisition_status: obligation?.status ?? 'not_applicable',
      packet_material: packetMaterial,
      packet_sha256: shaObject(packetMaterial),
      assignment: {
        state: 'unassigned',
        reviewer_id: null,
        invitation_id: null,
        valid_review_id: null
      },
      review_effect: 'none',
      publication_effect: 'none',
      graph_effect: 'none',
      adoption_effect: 'none'
    };
  });

  return {
    schema_version: 'status-sovereignty-second-party-review-packet-registry@1',
    hypothesis_id: 'SSC-H01',
    wave_id: 'SSC-W01',
    campaign_id: 'SSC-W01-SPR01',
    as_of: campaign.as_of,
    status: 'complete_fourteen_packet_denominator_zero_assignments',
    parent_review: {
      review_id: review.review_id,
      release_sha256: reviewManifest.combined_sha256,
      exact_file_sha256: sha256(readBytes(sourcePaths.review)),
      source_receipts_exact_file_sha256: sha256(readBytes(sourcePaths.reviewSources))
    },
    targeted_acquisition: {
      acquisition_id: acquisition.acquisition_id,
      release_sha256: acquisitionManifest.combined_sha256,
      exact_file_sha256: sha256(readBytes(sourcePaths.acquisition)),
      source_receipts_exact_file_sha256: sha256(readBytes(sourcePaths.acquisitionSources))
    },
    packets,
    counts: {
      packet_denominator: packets.length,
      packets_with_targeted_acquisition: packets.filter((row) => row.targeted_acquisition_status !== 'not_applicable').length,
      assigned_packets: packets.filter((row) => row.assignment.state !== 'unassigned').length,
      unassigned_packets: packets.filter((row) => row.assignment.state === 'unassigned').length,
      valid_second_party_reviews: packets.filter((row) => row.assignment.valid_review_id).length,
      adjudicated_packets: packets.filter((row) => row.adjudication_state === 'adjudicated').length
    },
    boundaries: {
      packet_digest_proves_source_truth: false,
      packet_digest_proves_reviewer_independence: false,
      packet_assignment_counts_as_review: false,
      packet_registry_changes_canonical_disposition: false,
      packet_registry_authorizes_publication: false,
      packet_registry_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

function countCandidateStates(candidates) {
  const states = new Map();
  for (const row of candidates.records) states.set(row.state, (states.get(row.state) ?? 0) + 1);
  return {
    candidate_records: candidates.records.length,
    invitations: states.get('invited') ?? 0,
    nonresponses: states.get('nonresponse') ?? 0,
    refusals: states.get('refused') ?? 0,
    conflicts_disclosed: states.get('conflict_disclosed') ?? 0,
    ineligible_candidates: states.get('ineligible') ?? 0,
    accepted_assignments: states.get('accepted') ?? 0
  };
}

function countReviewStates(responses) {
  const states = new Map();
  for (const row of responses.records) states.set(row.state, (states.get(row.state) ?? 0) + 1);
  return {
    submitted_unvalidated_reviews: states.get('submitted_unvalidated') ?? 0,
    valid_reviews: states.get('valid_review') ?? 0,
    withdrawn_reviews: states.get('withdrawn') ?? 0,
    superseded_reviews: states.get('superseded') ?? 0
  };
}

export function buildSecondPartyReviewCampaign() {
  const context = loadSecondPartyReviewSources();
  const { campaign, candidates, responses } = context;
  const packetRegistry = deriveSecondPartyPacketRegistry(context);
  const manifest = computeSecondPartyReviewManifest();
  const candidateCounts = countCandidateStates(candidates);
  const reviewCounts = countReviewStates(responses);

  write('data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json', stable(packetRegistry));
  write('data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json', stable(manifest));

  const report = {
    schema_version: 'status-sovereignty-second-party-review-report@1',
    ...campaign,
    packet_registry: packetRegistry,
    candidate_plane: {
      path: sourcePaths.candidates,
      status: candidates.status,
      counts: candidateCounts,
      failure_denominator: candidates.failure_denominator,
      boundaries: candidates.boundaries
    },
    response_plane: {
      path: sourcePaths.responses,
      status: responses.status,
      counts: reviewCounts,
      invalid_submission_denominator: responses.invalid_submission_denominator,
      boundaries: responses.boundaries
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('build/core-thesis/status-sovereignty/wave-01-second-party-review/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/wave-01-second-party-review/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/wave-01-second-party-review/data.json', stable(report));

  const packetRows = packetRegistry.packets.map((row) => `
    <tr>
      <td><code>${esc(row.packet_id)}</code><br><code>${esc(row.lane_id)}</code></td>
      <td>${esc(row.reviewed_disposition)}</td>
      <td>${esc(row.targeted_acquisition_status)}</td>
      <td><code>${esc(row.packet_sha256)}</code></td>
      <td>${esc(row.assignment.state)}</td>
    </tr>`).join('');
  const indexHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-W01 second-party review · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1500px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · SEPARATED SECOND-PARTY REVIEW</strong></p><h1>Wave 01 external review campaign</h1><p class="state">0/14 VALID SECOND-PARTY REVIEWS · 14/14 UNASSIGNED · 0 ADJUDICATED · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>${packetRegistry.counts.packet_denominator}</b>exact packets</div><div class="card"><b>${candidateCounts.candidate_records}</b>reviewer candidates</div><div class="card"><b>${candidateCounts.invitations}</b>invitations</div><div class="card"><b>${candidateCounts.accepted_assignments}</b>accepted</div><div class="card"><b>${reviewCounts.valid_reviews}</b>valid reviews</div><div class="card"><b>${packetRegistry.counts.adjudicated_packets}</b>adjudicated</div></div><p><a href="intake.html">Public reviewer intake instructions</a></p><h2>Exact packet denominator</h2><table><thead><tr><th>Packet</th><th>Maintainer disposition</th><th>Targeted acquisition</th><th>Packet SHA-256</th><th>Assignment</th></tr></thead><tbody>${packetRows}</tbody></table><h2>Current result</h2><pre>${esc(JSON.stringify(campaign.current_result, null, 2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(campaign.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-01-second-party-review/index.html', `${indexHtml}\n`);

  const intakeHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>SSC-W01 reviewer intake · Clifford Number</title><style>:root{color-scheme:light;background:#f4f1e8;color:#181714;font-family:system-ui,sans-serif}body{max-width:900px;margin:auto;padding:40px 24px 72px;line-height:1.6}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.boundary{border-left:6px solid #7c2920;background:#fffdf7;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-W01-SPR01</strong></p><h1>Separated second-party reviewer intake</h1><p>This page invites packet-specific reviewer nominations and review receipts. It does not publish held evidence or confer reviewer eligibility.</p><h2>Counting rule</h2><p><strong>No invitation, nonresponse, refusal, acceptance, or unvalidated submission counts as second-party review.</strong></p><h2>Public route</h2><p>Use GitHub issue #507 to nominate a reviewer or declare interest. Identify the campaign and packet IDs, provide a public contact route, and do not post private or held source material.</p><h2>Required review receipt</h2><pre>${esc(campaign.required_review_receipt_fields.join('\n'))}</pre><h2>Automatic ineligibility</h2><pre>${esc(campaign.eligibility_contract.automatic_ineligibility_reasons.join('\n'))}</pre><h2>Authority ceiling</h2><pre class="boundary">canonical disposition change: none
adjudication: none
publication clearance: none
graph effect: none
adoption effect: none</pre><p><code>campaign release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/wave-01-second-party-review/intake.html', `${intakeHtml}\n`);

  console.log(`build-status-sovereignty-wave-01-second-party-review: ${packetRegistry.counts.packet_denominator} packets, ${candidateCounts.candidate_records} candidates, ${reviewCounts.valid_reviews} valid reviews`);
  return { ...context, packetRegistry, manifest, report, indexHtml, intakeHtml };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSecondPartyReviewCampaign();
}
