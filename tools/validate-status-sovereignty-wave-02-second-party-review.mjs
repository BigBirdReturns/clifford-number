#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeW02SPRManifest } from './build-status-sovereignty-wave-02-second-party-review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const hex64 = /^[0-9a-f]{64}$/;
const expectedPackets = [
  'SSC-W02-PKT-0001', 'SSC-W02-PKT-0002', 'SSC-W02-PKT-0003', 'SSC-W02-PKT-0004',
  'SSC-W02-PKT-0005', 'SSC-W02-PKT-0006', 'SSC-W02-PKT-0007', 'SSC-W02-PKT-0008'
];
const expectedCandidateIds = [
  'SSC-W02-CAND-0001', 'SSC-W02-CAND-0002', 'SSC-W02-CAND-0003', 'SSC-W02-CAND-0004',
  'SSC-W02-CAND-0005', 'SSC-W02-CAND-0006', 'SSC-W02-CAND-0007', 'SSC-W02-CAND-0008'
];

export function loadW02SPR() {
  return {
    campaign: read('data/project/status-sovereignty-wave-02-second-party-review-campaign.json'),
    packets: read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json'),
    review: read('data/research/status-sovereignty-wave-02-maintainer-review.json'),
    candidates: read('data/research/status-sovereignty-wave-02-second-party-review-candidates.json'),
    responses: read('data/research/status-sovereignty-wave-02-second-party-review-responses.json'),
    manifest: read('data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/wave-02-second-party-review/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/wave-02-second-party-review/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/wave-02-second-party-review/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-02-second-party-review/index.html'), 'utf8')
  };
}

export function validateW02SPR(context = loadW02SPR()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { campaign, packets, review, candidates, responses, manifest, buildManifest, buildReport, publicReport, html } = context;

  eq(campaign.schema_version, 'status-sovereignty-wave-02-second-party-review-campaign@1', 'campaign schema');
  eq(campaign.hypothesis_id, 'SSC-H01', 'campaign hypothesis');
  eq(campaign.wave_id, 'SSC-W02', 'campaign wave');
  eq(campaign.campaign_id, 'SSC-W02-SPR01', 'campaign identity');
  eq(campaign.issue, 571, 'campaign issue');
  eq(campaign.as_of, '2026-08-01', 'campaign as_of');
  eq(campaign.status, 'open_candidate_discovery_wave_01_eight_uncontacted_zero_external_receipts', 'campaign status');
  const expectedCounts = {
    wave_packets: 8,
    maintainer_reviewed_packets: 8,
    unassigned_packets: 8,
    reviewer_candidates: 8,
    invitations: 0,
    nonresponses: 0,
    refusals: 0,
    conflicts: 0,
    ineligible: 2,
    accepted_assignments: 0,
    submitted_unvalidated: 0,
    valid_reviews: 0,
    second_party_reviewed_packets: 0,
    adjudicated_packets: 0,
    canonical_disposition_changes: 0,
    publication_clearances: 0,
    graph_effects: 0
  };
  for (const [key, expected] of Object.entries(expectedCounts)) eq(campaign.counts?.[key], expected, `campaign count ${key}`);
  eq(campaign.candidate_discovery?.wave_id, 'SSC-W02-CD01', 'candidate wave identity');
  eq(campaign.candidate_discovery?.records, 8, 'candidate wave record count');
  eq(campaign.candidate_discovery?.screened_ineligible, 2, 'candidate wave ineligible count');
  eq(campaign.candidate_discovery?.invitations_authorized, 0, 'candidate wave invitation authority');

  eq(review.counts?.maintainer_reviewed, 8, 'parent maintainer review count');
  eq(packets.packets?.length, 8, 'packet denominator');
  eq(JSON.stringify(packets.packets.map((row) => row.packet_id)), JSON.stringify(expectedPackets), 'packet identities');
  eq(packets.packets.filter((row) => row.assignment_state === 'unassigned').length, 8, 'unassigned packet denominator');
  eq(packets.packets.filter((row) => row.valid_review_count === 0).length, 8, 'zero-review packet denominator');
  eq(packets.packets.filter((row) => row.candidate_count === 1).length, 8, 'one-candidate-per-packet denominator');
  eq(new Set(packets.packets.flatMap((row) => row.candidate_ids ?? [])).size, 8, 'packet candidate identity denominator');

  eq(candidates.schema_version, 'status-sovereignty-wave-02-second-party-review-candidates@1', 'candidate registry schema');
  eq(candidates.campaign_id, campaign.campaign_id, 'candidate campaign identity');
  eq(candidates.as_of, '2026-08-01', 'candidate registry as_of');
  eq(candidates.status, 'candidate_discovery_wave_01_eight_uncontacted_two_screened_ineligible', 'candidate registry status');
  eq(candidates.records?.length, 8, 'candidate record denominator');
  eq(candidates.failure_denominator?.length, 2, 'candidate failure denominator');
  eq(JSON.stringify(candidates.records.map((row) => row.candidate_id)), JSON.stringify(expectedCandidateIds), 'candidate identities');
  eq(JSON.stringify(candidates.records.map((row) => row.packet_id)), JSON.stringify(expectedPackets), 'candidate packet coverage');
  eq(new Set(candidates.records.map((row) => row.public_identity?.name)).size, 8, 'candidate person uniqueness');
  for (const row of candidates.records) {
    check(/^SSC-W02-CAND-\d{4}$/.test(row.candidate_id), `candidate id format ${row.candidate_id}`);
    check(expectedPackets.includes(row.packet_id), `candidate packet identity ${row.candidate_id}`);
    check(/^SSC-OBS-\d{4}$/.test(row.observation_id), `candidate observation identity ${row.candidate_id}`);
    check(/^SSC-F\d{2}$/.test(row.lane_id), `candidate lane identity ${row.candidate_id}`);
    eq(row.candidate_state, 'candidate_only_uncontacted', `candidate state ${row.candidate_id}`);
    eq(row.eligibility_state, 'unresolved_pending_candidate_disclosure', `candidate eligibility ${row.candidate_id}`);
    eq(row.invitation_state, 'not_sent', `candidate invitation state ${row.candidate_id}`);
    eq(row.invitation_authorized, false, `candidate invitation authority ${row.candidate_id}`);
    eq(row.conflict_disclosure_received, false, `candidate conflict disclosure ${row.candidate_id}`);
    eq(row.authenticity_receipt_received, false, `candidate authenticity receipt ${row.candidate_id}`);
    eq(row.valid_review_count, 0, `candidate valid review count ${row.candidate_id}`);
    check(typeof row.public_identity?.name === 'string' && row.public_identity.name.length > 2, `candidate public identity ${row.candidate_id}`);
    check(typeof row.public_identity?.affiliation === 'string' && row.public_identity.affiliation.length > 2, `candidate affiliation ${row.candidate_id}`);
    check(typeof row.public_profile_receipt?.url === 'string' && row.public_profile_receipt.url.startsWith('https://'), `candidate profile receipt ${row.candidate_id}`);
    eq(row.public_profile_receipt?.authority, 'official_institutional_profile', `candidate profile authority ${row.candidate_id}`);
    eq(row.public_profile_receipt?.reviewed_at, '2026-08-01', `candidate profile review date ${row.candidate_id}`);
    check(Array.isArray(row.expertise_fit) && row.expertise_fit.length >= 2, `candidate expertise fit ${row.candidate_id}`);
    eq(row.disqualifier_screen?.packet_author_or_material_editor, 'not_observed_initial_public_screen', `candidate author screen ${row.candidate_id}`);
    check(['not_observed_initial_public_screen', 'potential_prior_institutional_tie_requires_disclosure'].includes(row.disqualifier_screen?.named_target_or_represented_institution), `candidate target screen ${row.candidate_id}`);
    eq(row.disqualifier_screen?.direct_material_beneficiary, 'unresolved_pending_candidate_disclosure', `candidate beneficiary screen ${row.candidate_id}`);
    eq(row.disqualifier_screen?.material_interest, 'unresolved_pending_candidate_disclosure', `candidate interest screen ${row.candidate_id}`);
    eq(row.disqualifier_screen?.identity_and_conflict_disclosure_sufficient, false, `candidate disclosure sufficiency ${row.candidate_id}`);
    eq(row.publication_effect, 'none', `candidate publication effect ${row.candidate_id}`);
    eq(row.graph_effect, 'none', `candidate graph effect ${row.candidate_id}`);
    eq(row.adoption_effect, 'none', `candidate adoption effect ${row.candidate_id}`);
  }
  for (const row of candidates.failure_denominator) {
    eq(row.packet_id, 'SSC-W02-PKT-0008', `screened failure packet ${row.screening_id}`);
    eq(row.state, 'ineligible_public_record', `screened failure state ${row.screening_id}`);
    eq(row.reason, 'direct_same_matter_amicus_participation', `screened failure reason ${row.screening_id}`);
    eq(row.invitation_state, 'not_sent', `screened failure invitation ${row.screening_id}`);
    eq(row.counts_as_valid_review, false, `screened failure review count ${row.screening_id}`);
    check(typeof row.public_receipt?.url === 'string' && row.public_receipt.url.startsWith('https://'), `screened failure receipt ${row.screening_id}`);
  }
  eq(candidates.counts?.candidate_records, 8, 'candidate registry count');
  eq(candidates.counts?.screened_ineligible, 2, 'candidate registry ineligible count');
  eq(candidates.counts?.invitations, 0, 'candidate registry invitation count');
  eq(candidates.counts?.valid_reviews, 0, 'candidate registry valid review count');

  eq(responses.records?.length, 0, 'response zero state');
  eq(responses.failure_denominator?.length, 0, 'response failure zero state');
  for (const key of ['candidate_is_review', 'invitation_is_review', 'acceptance_is_review', 'valid_review_rewrites_disposition', 'valid_review_adjudicates_disagreement', 'valid_review_clears_publication', 'valid_review_creates_graph_edge', 'valid_review_advances_adoption']) {
    eq(campaign.boundaries?.[key], false, `campaign boundary ${key}`);
  }
  eq(campaign.boundaries?.publication_effect, 'none', 'campaign publication boundary');
  eq(campaign.boundaries?.graph_effect, 'none', 'campaign graph boundary');
  eq(campaign.boundaries?.adoption_effect, 'none', 'campaign adoption boundary');

  const expectedManifest = computeW02SPRManifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'campaign exact-byte manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'build manifest mirror');
  eq(buildReport.status, campaign.status, 'build report status');
  eq(buildReport.counts?.reviewer_candidates, 8, 'build report candidate count');
  eq(publicReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'public report release digest');
  eq(publicReport.counts?.valid_reviews, 0, 'public report valid review count');
  check(hex64.test(manifest.combined_sha256 || ''), 'campaign release digest format');
  check(html.includes('8 PACKETS · 8 CANDIDATES · 0 INVITATIONS · 0 VALID REVIEWS · 2 SCREENED INELIGIBLE · 0 ADJUDICATIONS · GRAPH EFFECT NONE'), 'candidate-only banner missing');
  check(html.includes(manifest.combined_sha256), 'campaign release digest missing from HTML');
  return errors;
}

function main() {
  const errors = validateW02SPR();
  if (errors.length) {
    console.error(`validate-status-sovereignty-wave-02-second-party-review: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-wave-02-second-party-review: PASS (8 candidate-only, 2 screened ineligible, 0 invitations, 0 reviews)');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
